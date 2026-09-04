-- Phase 4A Remediation Round 2
--
-- Fixes verified security findings from independent adversarial review.
-- This migration is production-safe and narrowly scoped.
--
-- It does NOT implement:
-- - private debate creation UX
-- - invitations / access codes
-- - join/leave UI changes
-- - participant management UI
-- - Private -> Public UX

-- ============================================================================
-- P2: Separate read/write authorization helpers
-- ============================================================================
-- has_room_access() is used for reads and currently allows archived rooms.
-- Writes to archived rooms must be blocked. Introduce a write-scoped helper.

create or replace function public.has_room_write_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and (
        (r.visibility = 'public')
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id and dp.user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.has_room_write_access(uuid) to anon, authenticated;

-- ============================================================================
-- P0-1: debate_participants UPDATE self-join / room reassignment
-- ============================================================================
-- Remove direct client UPDATE authority. Legitimate side changes must flow
-- through switch_debate_side().

drop policy if exists "Users can update their own participation" on public.debate_participants;

-- No replacement INSERT/UPDATE policy: join and side changes are handled
-- by switch_debate_side() and the existing INSERT policy for public rooms.

-- ============================================================================
-- P0-2: inquiry_responses direct INSERT bypass
-- ============================================================================
-- Current policy only checks auth.uid() = created_by.
-- Add room access check through the parent inquiry.

drop policy if exists "Any user can respond to inquiries" on public.inquiry_responses;

create policy "Any user can respond to inquiries"
  on public.inquiry_responses
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.inquiry_items ii
      join public.rooms r on r.id = ii.room_id
      where ii.id = inquiry_item_id
        and public.has_room_access(r.id)
    )
  );

-- ============================================================================
-- P0-3: create_inquiry cross-room target claim IDOR
-- ============================================================================
-- Verify target claim belongs to the room and is not retracted.

create or replace function public.create_inquiry(
  p_room_id uuid,
  p_target_claim_id uuid,
  p_inquiry_type text,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_inquiry_id uuid;
  v_inquiry_count int;
  v_current_side text;
  v_target_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create an inquiry.';
  end if;

  if not public.has_room_access(p_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
  end if;

  -- Cross-room claim check
  select room_id into v_target_room_id
  from public.claims
  where id = p_target_claim_id;

  if v_target_room_id is null then
    raise exception 'invalid_claim' using hint = 'Target claim does not exist.';
  end if;

  if v_target_room_id <> p_room_id then
    raise exception 'cross_room_claim' using hint = 'Target claim must belong to the same room.';
  end if;

  if exists (
    select 1 from public.claims where id = p_target_claim_id and is_retracted = true
  ) then
    raise exception 'retracted_claim' using hint = 'Cannot create an inquiry against a retracted claim.';
  end if;

  -- Rate limit check: 5 per hour
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id
    and created_at > now() - interval '1 hour';

  if v_inquiry_count >= 5 then
    raise exception 'rate_limit' using hint = 'Max 5 inquiries per hour.';
  end if;

  -- Debate cap check: 50 per user per debate
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id;

  if v_inquiry_count >= 50 then
    raise exception 'debate_cap' using hint = 'Max 50 inquiries per debate.';
  end if;

  -- Claim cap check: 20 per claim
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where target_claim_id = p_target_claim_id;

  if v_inquiry_count >= 20 then
    raise exception 'claim_cap' using hint = 'Max 20 inquiries per claim.';
  end if;

  -- Get current participation side for metadata
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    v_current_side := 'inquiry';
  end if;

  -- Create inquiry
  insert into public.inquiry_items (
    room_id, created_by, inquirer_side, inquiry_type, content, target_claim_id
  ) values (
    p_room_id, v_user_id, v_current_side, p_inquiry_type, p_content, p_target_claim_id
  ) returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$$;

-- ============================================================================
-- P1-1: discussion_debates participant access
-- ============================================================================
-- Allow owner + active participants to see private debate metadata.

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

-- ============================================================================
-- P1-2: inquiry_items / inquiry_responses SELECT for participants
-- ============================================================================

drop policy if exists "Inquiry visibility matches room visibility" on public.inquiry_items;

create policy "Inquiry visibility matches room visibility"
  on public.inquiry_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and public.has_room_access(r.id)
    )
  );

drop policy if exists "Response visibility matches inquiry visibility" on public.inquiry_responses;

create policy "Response visibility matches inquiry visibility"
  on public.inquiry_responses
  for select
  to authenticated
  using (
    exists (
      select 1 from public.inquiry_items ii
      join public.rooms r on r.id = ii.room_id
      where ii.id = inquiry_item_id
        and public.has_room_access(r.id)
    )
  );

-- ============================================================================
-- P1-3: moderation_queue
-- ============================================================================
-- Recreate to join discussion_* views with moderator role check.
-- Because discussion_* views now enforce has_room_access(), moderators
-- would lose visibility into private flagged content. Join base tables
-- directly instead.

drop view if exists public.moderation_queue;

create or replace view public.moderation_queue
with (security_invoker = false)
as
select
  f.id,
  f.message_id,
  f.question_id,
  f.claim_id,
  f.evidence_id,
  case
    when f.message_id is not null then 'message'
    when f.question_id is not null then 'question'
    when f.claim_id is not null then 'claim'
    when f.evidence_id is not null then 'evidence'
    else 'unknown'
  end as entity_type,
  f.reason,
  f.status,
  f.created_at,
  f.resolved_at,
  coalesce(dm.content, dq.content, dc.content, de.content) as content,
  coalesce(dm.username, dq.username, dc.username, de.username) as author_username,
  coalesce(dm.avatar_url, dq.avatar_url, dc.avatar_url, de.avatar_url) as author_avatar_url
from public.moderation_flags f
left join public.discussion_messages dm on dm.id = f.message_id
left join public.discussion_questions dq on dq.id = f.question_id
left join public.discussion_claims dc on dc.id = f.claim_id
left join public.discussion_evidence de on de.id = f.evidence_id
where public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type);

revoke all on public.moderation_queue from public, anon;

-- ============================================================================
-- P1-4: get_my_topic_evidence private metadata leak
-- ============================================================================
-- Exclude private rooms the caller cannot access from the room list.

create or replace function public.get_my_topic_evidence(p_days int default 7)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select array(
  select json_build_object(
    'topic_id', t.id,
    'topic_name', t.name,
    'evidence_count', (
      select count(distinct e3.id)
      from evidence e3
      join rooms r3 on r3.id = e3.room_id
      where r3.topic_id = t.id
        and e3.created_at >= current_date - p_days
        and e3.is_retracted = false
    ),
    'rooms', (
      select json_agg(json_build_object(
        'room_id', r2.id,
        'room_title', r2.title,
        'room_slug', r2.slug
      ))
      from (
        select distinct r3.id, r3.title, r3.slug
        from evidence e2
        join rooms r3 on r3.id = e2.room_id
        where e2.created_at >= current_date - p_days
          and e2.is_retracted = false
          and r3.topic_id = t.id
          and r3.id not in (
            select room_id from debate_participants where user_id = auth.uid()
            union
            select distinct room_id from messages where user_id = auth.uid()
          )
          and public.has_room_access(r3.id)
      ) r2
    )
  )
  from topics t
  where exists (
    select 1 from rooms r
    where r.topic_id = t.id
      and (
        r.id in (select room_id from debate_participants where user_id = auth.uid())
        or r.id in (select distinct room_id from messages where user_id = auth.uid())
      )
  )
  and exists (
    select 1 from evidence e
    join rooms r on r.id = e.room_id
    where r.topic_id = t.id
      and e.created_at >= current_date - p_days
      and e.is_retracted = false
  )
  group by t.id, t.name
);
$$;

-- ============================================================================
-- P1-5: claim_evidence SELECT / RETURNING for participants
-- ============================================================================
-- Ensure authorized private-room members can read claim_evidence.
-- Preserve non-member / removed / anonymous denial.

drop policy if exists "Users can read claim evidence for accessible claims" on public.claim_evidence;

create policy "Users can read claim evidence for accessible claims"
  on public.claim_evidence
  for select
  to authenticated
  using (
    exists (
      select 1 from public.claims c
      join public.rooms r on r.id = c.room_id
      where c.id = claim_id
        and public.has_room_access(r.id)
    )
  );

-- ============================================================================
-- Apply write-scoped access to write policies
-- ============================================================================
-- Block writes to archived rooms while preserving public behavior.

-- messages
drop policy if exists "Authenticated users can post messages" on public.messages;

create policy "Authenticated users can post messages"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_room_write_access(room_id)
  );

drop policy if exists "Authors can edit their messages" on public.messages;

create policy "Authors can edit their messages"
  on public.messages
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.has_room_write_access(room_id)
  )
  with check (
    user_id = auth.uid()
    and public.has_room_write_access(room_id)
  );

-- claims
drop policy if exists "Authenticated users can create claims" on public.claims;

create policy "Authenticated users can create claims"
  on public.claims
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_write_access(room_id)
  );

drop policy if exists "Authors can retract their claims" on public.claims;

create policy "Authors can retract their claims"
  on public.claims
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  );

-- evidence
drop policy if exists "Authenticated users can assert evidence" on public.evidence;

create policy "Authenticated users can assert evidence"
  on public.evidence
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_write_access(room_id)
  );

drop policy if exists "Creators can retract their evidence" on public.evidence;

create policy "Creators can retract their evidence"
  on public.evidence
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  );

-- sources
drop policy if exists "Authenticated users can create sources" on public.sources;

create policy "Authenticated users can create sources"
  on public.sources
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_write_access(room_id)
  );

drop policy if exists "Creators can retract their sources" on public.sources;

create policy "Creators can retract their sources"
  on public.sources
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_write_access(room_id)
  );

-- claim_evidence
drop policy if exists "Authenticated users can link claim evidence" on public.claim_evidence;

create policy "Authenticated users can link claim evidence"
  on public.claim_evidence
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.claims c
      where c.id = claim_id
        and public.has_room_write_access(c.room_id)
    )
  );

-- claim_votes
drop policy if exists "Authenticated users can vote on claims" on public.claim_votes;

create policy "Authenticated users can vote on claims"
  on public.claim_votes
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and public.has_room_write_access(c.room_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and public.has_room_write_access(c.room_id)
    )
  );

-- evidence_votes
drop policy if exists "Authenticated users can vote on evidence" on public.evidence_votes;

create policy "Authenticated users can vote on evidence"
  on public.evidence_votes
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.evidence e
      where e.id = evidence_id
        and public.has_room_write_access(e.room_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.evidence e
      where e.id = evidence_id
        and public.has_room_write_access(e.room_id)
    )
  );

-- debate_participants INSERT
drop policy if exists "Users can join public debates" on public.debate_participants;

create policy "Users can join public debates"
  on public.debate_participants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_room_write_access(room_id)
  );

-- ============================================================================
-- Inquiry RPC grants re-assertion
-- ============================================================================
revoke all on function public.create_inquiry(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_inquiry(uuid, uuid, text, text) to authenticated;

revoke all on function public.respond_to_inquiry(uuid, text) from public, anon;
grant execute on function public.respond_to_inquiry(uuid, text) to authenticated;

revoke all on function public.satisfy_inquiry(uuid) from public, anon;
grant execute on function public.satisfy_inquiry(uuid) to authenticated;

revoke all on function public.unsatisfy_inquiry(uuid) from public, anon;
grant execute on function public.unsatisfy_inquiry(uuid) to authenticated;

revoke all on function public.close_inquiry(uuid) from public, anon;
grant execute on function public.close_inquiry(uuid) to authenticated;
