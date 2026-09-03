-- Migration: Debate sort, status sync, and pagination support
-- Extends discussion_debates view with room fields and sort columns
-- Creates resolve_debate RPC for atomic status sync

-- 1. Recreate discussion_debates view with room fields, sort columns, and evidence count
drop view if exists public.discussion_debates;

create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.resolution,
  d.created_at,
  d.updated_at,
  -- room fields for feed rendering (avoids separate query)
  r.title,
  r.slug,
  r.description,
  r.created_by as room_created_by,
  r.topic_id,
  r.visibility,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at,
  -- claim counts per side
  coalesce(pc.count, 0) as proposition_claim_count,
  coalesce(oc.count, 0) as opposition_claim_count,
  -- total claims (sort column)
  coalesce(pc.count, 0) + coalesce(oc.count, 0) as total_claims,
  -- participant counts per side
  coalesce(pp.count, 0) as proposition_participant_count,
  coalesce(op.count, 0) as opposition_participant_count,
  coalesce(np.count, 0) as neutral_participant_count,
  -- total participants (sort column)
  coalesce(pp.count, 0) + coalesce(op.count, 0) + coalesce(np.count, 0) as total_participants,
  -- evidence count via claim_evidence junction
  coalesce(ev.count, 0) as total_evidence,
  -- last activity timestamp (sort column)
  greatest(
    d.created_at,
    coalesce(last_claim.created_at, d.created_at),
    coalesce(last_evidence.created_at, d.created_at),
    coalesce(last_participant.joined_at, d.created_at)
  ) as last_activity_at
from public.debates d
-- Existing joins for claims and participants
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
-- Evidence count: distinct evidence linked to claims in this room
left join (
  select c.room_id, count(distinct ce.evidence_id) as count
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  where not c.is_retracted
  group by c.room_id
) ev on d.id = ev.room_id
-- Last claim created_at
left join (
  select room_id, max(created_at) as created_at
  from public.claims
  where not is_retracted
  group by room_id
) last_claim on d.id = last_claim.room_id
-- Last evidence created_at
left join (
  select c.room_id, max(e.created_at) as created_at
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  inner join public.evidence e on ce.evidence_id = e.id
  where not c.is_retracted and not e.is_retracted
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
-- Last participant joined_at
left join (
  select room_id, max(joined_at) as joined_at
  from public.debate_participants
  group by room_id
) last_participant on d.id = last_participant.room_id
-- Room join for title, slug, etc.
inner join public.rooms r on d.id = r.id and r.room_type = 'debate'
where exists (
  select 1 from public.rooms r2
  where r2.id = d.id and r2.room_type = 'debate'
);

grant select on public.discussion_debates to anon, authenticated;

-- 2. Create resolve_debate RPC for atomic status sync
create or replace function public.resolve_debate(
  p_room_id uuid,
  p_winner text,
  p_summary text,
  p_resolved_by uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debate record;
begin
  -- Validate debate exists and check resolution requirements
  select * into v_debate
  from public.discussion_debates
  where id = p_room_id;

  if not found then
    raise exception 'Debate not found.';
  end if;

  if v_debate.proposition_participant_count < 1 then
    raise exception 'Resolution requires at least one proposition participant.';
  end if;
  if v_debate.opposition_participant_count < 1 then
    raise exception 'Resolution requires at least one opposition participant.';
  end if;
  if v_debate.proposition_claim_count < 1 then
    raise exception 'Resolution requires at least one proposition claim.';
  end if;
  if v_debate.opposition_claim_count < 1 then
    raise exception 'Resolution requires at least one opposition claim.';
  end if;

  -- Atomically update both tables
  update public.debates
  set status = 'resolved',
      resolution = jsonb_build_object(
        'winner', p_winner,
        'summary', p_summary,
        'resolvedBy', p_resolved_by
      ),
      updated_at = now()
  where id = p_room_id;

  update public.rooms
  set status = 'inactive',
      updated_at = now()
  where id = p_room_id;
end;
$$;
