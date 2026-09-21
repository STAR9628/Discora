-- Migration: Optional informational debate deadline (closes_at)
--
-- Product semantics (PO-approved):
--   - debates.closes_at is NULLABLE. NULL = open-ended debate: valid
--     indefinitely until explicitly closed; never qualifies for Closing Soon.
--   - A populated closes_at is an intended participation window
--     (informational lifecycle metadata). It NEVER automatically changes
--     status: passing closes_at does NOT set status='closed', and 'closed'
--     retains its approved meaning of "no longer active" (never winner,
--     resolution, truth, or conclusion).
--   - Closing Soon (7-day window) is derived at query time from closes_at.
--
-- What this migration does (and only this):
--   1. Adds debates.closes_at timestamptz NULL (no backfill: all existing
--      debates intentionally remain open-ended).
--   2. Adds a minimal partial index matching the Closing Soon browse
--      predicate (active + non-null closes_at).
--   3. Extends create_debate_room / create_private_debate_room with an
--      optional p_closes_at (default NULL = open-ended). Past deadlines are
--      rejected server-side. Existing 6-argument callers keep working via
--      the default. Grants preserved.
--   4. Recreates discussion_debates view verbatim + d.closes_at passthrough.
--      View predicate, joins, aggregates, and grants are unchanged.
--
-- What this migration deliberately does NOT do:
--   - No status triggers, no cron/pg_cron, no workers, no expiry jobs.
--   - No RLS POLICY changes (existing policies are correct and narrowing;
--     only the privilege layer below is completed).
--   - No resolution/winner/loser fields or semantics.
--
-- Grants (§7 creation + §8 editing-through-existing-pathways):
--   Prior audit 202609090011 proved the repo migration history drifts from
--   production at the GRANT layer and deliberately left debates/rooms grants
--   unrestored (unobserved). Local verification confirms: without the grants
--   below, debate creation (rooms/debates INSERT via the SECURITY INVOKER
--   RPCs) and creator deadline edits fail with 42501 even though narrowing
--   RLS policies exist for both. These three GRANTs activate ONLY existing
--   policies; no access widens beyond what the policies already authorize:
--     - update (closes_at) on debates: creator-only rows via existing policy.
--     - insert on rooms/debates: created_by = auth.uid() policies.
--   Join grants (debate_participants INSERT) are intentionally NOT added here:
--   unrelated to Closing Soon; reported as follow-up.
--
-- Safety: additive and re-runnable (IF NOT EXISTS guards; DROP FUNCTION only
-- for the exact signatures being replaced, immediately recreated below).

-- 1. Optional deadline column (NULL = open-ended, never Closing Soon).
alter table public.debates
  add column if not exists closes_at timestamptz null;

comment on column public.debates.closes_at is
  'Optional intended participation deadline (informational lifecycle metadata). NULL means open-ended. Passing this timestamp never automatically changes status.';

-- 2. Minimal partial index for the Closing Soon browse predicate.
create index if not exists idx_debates_closing_soon
  on public.debates (status, closes_at)
  where status = 'active' and closes_at is not null;

-- 2b. Privilege layer for the §7 creation and §8 editing pathways.
--     Column-scoped where possible; existing RLS policies still narrow rows.
grant update (closes_at) on public.debates to authenticated;
grant insert on public.rooms to authenticated;
grant insert on public.debates to authenticated;

-- 3a. Public debate creation with optional deadline.
drop function if exists public.create_debate_room(text, text, uuid, text, text, text);

create or replace function public.create_debate_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_proposition_title text,
  p_opposition_title text,
  p_opening_statement text,
  p_closes_at timestamptz default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if p_closes_at is not null and p_closes_at <= now() then
    raise exception 'debate_deadline_must_be_future'
      using hint = 'An optional debate deadline must be in the future. Omit it for an open-ended debate.';
  end if;

  insert into public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
  values (p_title, p_description, 'debate', p_topic_id, 'public', 'open', auth.uid())
  returning id into v_room_id;

  insert into public.debates (id, proposition_title, opposition_title, opening_statement, closes_at)
  values (v_room_id, p_proposition_title, p_opposition_title, p_opening_statement, p_closes_at);

  return v_room_id;
end;
$$;

-- 3b. Private debate creation with optional deadline (grants preserved).
drop function if exists public.create_private_debate_room(text, text, uuid, text, text, text);

create or replace function public.create_private_debate_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_proposition_title text,
  p_opposition_title text,
  p_opening_statement text,
  p_closes_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if p_closes_at is not null and p_closes_at <= now() then
    raise exception 'debate_deadline_must_be_future'
      using hint = 'An optional debate deadline must be in the future. Omit it for an open-ended debate.';
  end if;

  v_room_id := gen_random_uuid();

  insert into public.rooms (id, title, description, room_type, topic_id, visibility, status, created_by)
  values (
    v_room_id,
    p_title,
    p_description,
    'debate',
    p_topic_id,
    'private',
    'open',
    auth.uid()
  )
  returning id into v_room_id;

  insert into public.debates (id, proposition_title, opposition_title, opening_statement, closes_at)
  values (v_room_id, p_proposition_title, p_opposition_title, p_opening_statement, p_closes_at);

  insert into public.debate_participants (room_id, user_id, side)
  values (v_room_id, auth.uid(), 'proposition');

  return v_room_id;
end;
$$;

revoke all on function public.create_private_debate_room(text, text, uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.create_private_debate_room(text, text, uuid, text, text, text, timestamptz) to authenticated;

-- 4. Recreate discussion_debates view verbatim + closes_at passthrough.
--    (Definition copied from 202606270001; only d.closes_at is added.
--    Predicate, joins, aggregates, and grants are unchanged.)
drop view if exists public.discussion_debates;

create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.created_at,
  d.updated_at,
  d.closes_at,
  r.title,
  r.slug,
  r.description,
  r.created_by as room_created_by,
  r.topic_id,
  r.visibility,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at,
  coalesce(pc.count, 0) as proposition_claim_count,
  coalesce(oc.count, 0) as opposition_claim_count,
  coalesce(pc.count, 0) + coalesce(oc.count, 0) as total_claims,
  coalesce(pp.count, 0) as proposition_participant_count,
  coalesce(op.count, 0) as opposition_participant_count,
  coalesce(np.count, 0) as neutral_participant_count,
  coalesce(pp.count, 0) + coalesce(op.count, 0) + coalesce(np.count, 0) as total_participants,
  coalesce(ev.count, 0) as total_evidence,
  greatest(
    d.created_at,
    coalesce(last_claim.created_at, d.created_at),
    coalesce(last_evidence.created_at, d.created_at),
    coalesce(last_participant.joined_at, d.created_at)
  ) as last_activity_at
from public.debates d
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'proposition' and not is_retracted
  group by room_id
) pc on d.id = pc.room_id
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'opposition' and not is_retracted
  group by room_id
) oc on d.id = oc.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'proposition'
  group by room_id
) pp on d.id = pp.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'opposition'
  group by room_id
) op on d.id = op.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'neutral'
  group by room_id
) np on d.id = np.room_id
left join (
  select c.room_id, count(distinct ce.evidence_id) as count
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  where not c.is_retracted
  group by c.room_id
) ev on d.id = ev.room_id
left join (
  select room_id, max(created_at) as created_at
  from public.claims
  where not is_retracted
  group by room_id
) last_claim on d.id = last_claim.room_id
left join (
  select c.room_id, max(e.created_at) as created_at
  from public.claims c
  inner join public.claim_evidence ce on ce.claim_id = c.id
  inner join public.evidence e on e.id = ce.evidence_id
  where not c.is_retracted and not e.is_retracted
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
left join (
  select room_id, max(joined_at) as joined_at
  from public.debate_participants
  group by room_id
) last_participant on d.id = last_participant.room_id
inner join public.rooms r on d.id = r.id and r.room_type = 'debate'
where public.has_room_access(r.id);

grant select on public.discussion_debates to anon, authenticated;
