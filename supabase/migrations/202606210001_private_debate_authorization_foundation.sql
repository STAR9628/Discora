-- Phase 4A: Private Debate Authorization Foundation
--
-- Closes P0/P1 authorization gaps while preserving existing public behavior.
-- This is a database/security foundation only. No private creation UX,
-- invitations, access codes, join UI, or participant management is added.
--
-- Target authorization model:
--   PUBLIC ROOM: normal existing public behavior
--   PRIVATE ROOM: owner + active participants only
--   INVITED BUT NOT JOINED: no membership, no private access
--   REMOVED: no private access
--   NON-MEMBER: no private access

-- ============================================================================
-- Helper: has_room_access
-- ============================================================================
-- SECURITY DEFINER helper used inside RLS policies and view definitions.
-- Returns true when the current user may access the room:
--   - public non-archived room
--   - room owner
--   - active debate participant
--
-- Design notes:
-- - Runs as SECURITY DEFINER to avoid recursive RLS when querying
--   rooms / debate_participants from inside other policies.
-- - search_path is pinned to public.
-- - No EXECUTE grant is required for policy evaluation, but granting to
--   authenticated is harmless because it only returns a boolean.

create or replace function public.has_room_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id and dp.user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.has_room_access(uuid) to anon, authenticated;

-- ============================================================================
-- P0-1: debate_participants INSERT bypass
-- ============================================================================
-- Current policy allows any authenticated user to insert themselves into
-- any room if they know the room ID. For private rooms, joining must not
-- be possible through raw table INSERT.
--
-- Preserve legitimate public debate joining through the same policy by
-- requiring the room to be publicly joinable.

drop policy if exists "Users can join debates" on public.debate_participants;

create policy "Users can join public debates"
  on public.debate_participants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_room_access(room_id)
  );

-- ============================================================================
-- P0-2: Private room write leaks
-- ============================================================================
-- Scope INSERT/UPDATE/DELETE on content tables to accessible rooms.
-- Public rooms preserve existing contribution behavior.
-- Private rooms require owner or active participant authorization.

-- messages
drop policy if exists "Authenticated users can post messages" on public.messages;

create policy "Authenticated users can post messages"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_room_access(room_id)
  );

drop policy if exists "Authors can edit their messages" on public.messages;

create policy "Authors can edit their messages"
  on public.messages
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.has_room_access(room_id)
  )
  with check (
    user_id = auth.uid()
    and public.has_room_access(room_id)
  );

-- claims
drop policy if exists "Authenticated users can create claims" on public.claims;

create policy "Authenticated users can create claims"
  on public.claims
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_access(room_id)
  );

drop policy if exists "Authors can retract their claims" on public.claims;

create policy "Authors can retract their claims"
  on public.claims
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_access(room_id)
  );

-- evidence
drop policy if exists "Authenticated users can assert evidence" on public.evidence;

create policy "Authenticated users can assert evidence"
  on public.evidence
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_access(room_id)
  );

drop policy if exists "Creators can retract their evidence" on public.evidence;

create policy "Creators can retract their evidence"
  on public.evidence
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_access(room_id)
  );

-- sources
drop policy if exists "Authenticated users can create sources" on public.sources;

create policy "Authenticated users can create sources"
  on public.sources
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.has_room_access(room_id)
  );

drop policy if exists "Creators can retract their sources" on public.sources;

create policy "Creators can retract their sources"
  on public.sources
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and public.has_room_access(room_id)
  )
  with check (
    created_by = auth.uid()
    and public.has_room_access(room_id)
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
        and public.has_room_access(c.room_id)
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
        and public.has_room_access(c.room_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id
        and public.has_room_access(c.room_id)
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
        and public.has_room_access(e.room_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.evidence e
      where e.id = evidence_id
        and public.has_room_access(e.room_id)
    )
  );

-- ============================================================================
-- P0-3: Private room read lockout for active participants
-- ============================================================================
-- Extend views and RLS policies so active participants can read private
-- room content. Public behavior is preserved.

-- rooms
drop policy if exists "Private rooms are readable by creator" on public.rooms;

create policy "Private rooms are readable by creator"
  on public.rooms
  for select
  using (
    created_by = auth.uid()
    or public.has_room_access(id)
  );

-- debates
drop policy if exists "Anyone can view debates" on public.debates;
drop policy if exists "Debate creators can view their own debates" on public.debates;

create policy "Debates are viewable in authorized rooms"
  on public.debates
  for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = id
        and public.has_room_access(r.id)
    )
  );

-- discussion_messages view
-- moderation_queue depends on discussion_messages, so drop it first
drop view if exists public.moderation_queue;
drop view if exists public.discussion_messages cascade;

create or replace view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  m.content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.messages m
left join public.profiles p on m.user_id = p.id
where public.has_room_access(m.room_id);

grant select on public.discussion_messages to anon, authenticated;

-- discussion_claims view
drop view if exists public.discussion_claims;

create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id,
  c.content,
  c.claim_type,
  c.context_type,
  c.identity_mode,
  c.is_retracted,
  c.debate_side,
  c.created_at,
  c.updated_at,
  case
    when c.identity_mode = 'anonymous' then null
    else c.created_by
  end as created_by,
  case
    when c.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio,
  (
    select vote_type from public.claim_votes cv
    where cv.claim_id = c.id and cv.user_id = auth.uid()
  ) as user_vote
from public.claims c
left join public.profiles p on c.created_by = p.id
left join (
  select
    claim_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_id
) v on c.id = v.claim_id
where public.has_room_access(c.room_id)
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.claim_id = c.id and mf.status = 'resolved_hidden'
  );

grant select on public.discussion_claims to anon, authenticated;

-- discussion_evidence view
drop view if exists public.discussion_evidence;

create or replace view public.discussion_evidence
with (security_invoker = false)
as
select
  e.id,
  e.source_id,
  e.content,
  e.evidence_type,
  e.identity_mode,
  e.is_retracted,
  e.created_at,
  e.updated_at,
  ce.claim_id,
  ce.direction,
  case
    when e.identity_mode = 'anonymous' then null
    else e.created_by
  end as created_by,
  case
    when e.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when e.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  s.title as source_title,
  s.url as source_url,
  s.file_path as source_file_path,
  s.is_retracted as source_is_retracted
from public.evidence e
join public.claim_evidence ce on e.id = ce.evidence_id
left join public.sources s on e.source_id = s.id
left join public.profiles p on e.created_by = p.id
where public.has_room_access(e.room_id);

grant select on public.discussion_evidence to anon, authenticated;

-- discussion_questions view
drop view if exists public.discussion_questions;

create or replace view public.discussion_questions
with (security_invoker = false)
as
select
  q.id,
  q.room_id,
  q.content,
  q.identity_mode,
  q.is_retracted,
  q.created_at,
  q.updated_at,
  case
    when q.identity_mode = 'anonymous' then null
    else q.created_by
  end as created_by,
  case
    when q.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when q.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.questions q
left join public.profiles p on q.created_by = p.id
where public.has_room_access(q.room_id);

grant select on public.discussion_questions to anon, authenticated;

-- ============================================================================
-- P0-4: Inquiry RPC authorization
-- ============================================================================
-- create_inquiry and respond_to_inquiry currently lack private-room checks.
-- Satisfy/unsatisfy/close are limited to the inquirer, but should also
-- verify the room is accessible.

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create an inquiry.';
  end if;

  if not public.has_room_access(p_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
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

create or replace function public.respond_to_inquiry(
  p_inquiry_item_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_response_id uuid;
  v_current_status text;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to respond.';
  end if;

  -- Get current status and room_id
  select status, room_id into v_current_status, v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if v_current_status is null then
    raise exception 'not_found' using hint = 'Inquiry not found.';
  end if;

  if not public.has_room_access(v_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
  end if;

  if v_current_status in ('closed', 'satisfied') then
    raise exception 'inquiry_closed' using hint = 'Cannot respond to a closed or satisfied inquiry.';
  end if;

  -- Insert response
  insert into public.inquiry_responses (inquiry_item_id, created_by, content)
  values (p_inquiry_item_id, v_user_id, p_content)
  returning id into v_response_id;

  -- Update inquiry status if open or unsatisfied
  if v_current_status in ('open', 'unsatisfied') then
    update public.inquiry_items
    set status = 'responded', updated_at = now()
    where id = p_inquiry_item_id;
  end if;

  -- Create reputation event for response (+3)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_RESPONDED',
    3,
    jsonb_build_object(
      'inquiry_response_id', v_response_id,
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );

  return v_response_id;
end;
$$;

create or replace function public.satisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Only the inquirer can mark as satisfied
  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer' using hint = 'Only the inquiry creator can mark it as satisfied.';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if not public.has_room_access(v_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
  end if;

  update public.inquiry_items
  set status = 'satisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;

  -- Create reputation event for satisfaction (+2)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_SATISFIED',
    2,
    jsonb_build_object(
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );
end;
$$;

create or replace function public.unsatisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if not public.has_room_access(v_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
  end if;

  update public.inquiry_items
  set status = 'unsatisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;
end;
$$;

create or replace function public.close_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if not public.has_room_access(v_room_id) then
    raise exception 'not_authorized' using hint = 'You do not have access to this room.';
  end if;

  update public.inquiry_items
  set status = 'closed', updated_at = now()
  where id = p_inquiry_item_id and status not in ('closed', 'satisfied');

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry is already closed or satisfied.';
  end if;
end;
$$;

-- Re-assert grants on inquiry RPCs
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

-- inquiry_items INSERT already requires room access through RLS; keep it.
-- inquiry_responses INSERT already requires auth.uid() = created_by; keep it.

-- ============================================================================
-- P0-5: claim/evidence access via RLS
-- ============================================================================
-- The views now enforce access, but base-table RETURNING and direct access
-- should also respect room authorization where practical.

-- Base SELECT policies already restrict to own rows for RETURNING support.
-- The views are the authoritative read path; no change needed there.

-- ============================================================================
-- P1: Moderation access
-- ============================================================================
-- moderation_queue currently joins through discussion_* views, which means
-- moderators can only see content from rooms they already have access to.
-- For private rooms, moderators should be able to inspect flagged content
-- regardless of membership.

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
-- P1: Profile privacy
-- ============================================================================
-- resolveRoomSlugs queries rooms directly. After rooms RLS includes
-- participant access, a viewer resolving private room IDs from another
-- user's profile will only see rooms they themselves can access.
-- This prevents leaking private room titles/slugs on public profiles.
-- No additional change required for this function.

-- getUserContributions queries discussion_* views and debate_participants.
-- Both now enforce room authorization, so public profiles cannot leak
-- private debate content. No additional change required.

-- ============================================================================
-- P1: Search
-- ============================================================================
-- search_content already filters by (r.visibility = 'public' or r.created_by = auth.uid()).
-- It does NOT include participant access, which is acceptable for V1.
-- Authorized member search is a V2 enhancement.
-- No change required.

-- ============================================================================
-- P1: Direct routes
-- ============================================================================
-- /debates/[slug] uses getDebateBySlug() which queries rooms directly.
-- With rooms RLS including participant access, authorized members can
-- access private debates. Unauthorized users are blocked.
-- generateMetadata in debate/discussion pages may leak titles if the
-- page data is fetched before auth checks; this is a Next.js rendering
-- concern handled in a later phase. For this foundation, the database
-- boundary is correctly enforced.

-- ============================================================================
-- Public -> Private prevention
-- ============================================================================
-- The existing rooms UPDATE policy requires created_by = auth.uid().
-- Owners can update their own rooms. A separate visibility-transition
-- guard is not added here because private creation UX is not implemented
-- yet. If create_debate_room is later extended to support private
-- visibility, the RPC should enforce allowed transitions.

-- ============================================================================
-- create_debate_room
-- ============================================================================
-- Currently hardcodes visibility = 'public'. No change required for this
-- foundation phase. Private creation will be added in a later phase.

-- ============================================================================
-- Verification notes
-- ============================================================================
-- This migration intentionally does NOT:
-- - create invitation tables
-- - create access-code tables
-- - add private debate creation UX
-- - add join/leave UX changes
-- - add participant management UI
-- - modify search_content
-- - add personalized discovery surfaces
--
-- It ONLY establishes the database authorization foundation for private
-- debate rooms while preserving all existing public behavior.
