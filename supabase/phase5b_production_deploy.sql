-- ============================================================================
-- DISCORA — PHASE 5B PRODUCTION DEPLOYMENT SCRIPT
-- Target: Supabase Production SQL Editor
-- Contains ONLY migrations 202606240001 -> 202606240004 in chronological order.
-- ============================================================================

-- ============================================================================
-- PHASE 5B MIGRATION 001: 202606240001_fix_discussion_messages_view.sql
-- ============================================================================
-- Migration: Fix discussion_messages view regression (restore is_moderated + redaction)
-- This is a forward-only append migration. It does not modify old migrations.

-- ============================================================================
-- 1. Recreate discussion_messages with is_moderated and hidden-content redaction
-- ============================================================================

drop view if exists public.moderation_queue;
drop view if exists public.discussion_messages cascade;

create or replace view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then '[Hidden by moderator]'
    else m.content
  end as content,
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
  end as avatar_url,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then true
    else false
  end as is_moderated
from public.messages m
left join public.profiles p on m.user_id = p.id
where public.has_room_access(m.room_id);

grant select on public.discussion_messages to anon, authenticated;

-- ============================================================================
-- 2. Recreate moderation_queue to reference the restored view
-- ============================================================================

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
grant select on public.moderation_queue to authenticated;

comment on view public.moderation_queue is
  'Redacted moderator queue. Omits reporter_id and action_taken_by; joins only through redacted discussion views.';

-- ============================================================================
-- PHASE 5B MIGRATION 002: 202606240002_moderation_inquiry_feedback.sql
-- ============================================================================
-- Migration: Moderation inquiry support + rate limiting + user feedback
-- This is a forward-only append migration.

-- ============================================================================
-- 1. Add inquiry_id to moderation_flags
-- ============================================================================

alter table public.moderation_flags
  add column if not exists inquiry_id uuid references public.inquiry_items(id) on delete cascade;

-- Unique index for duplicate pending report protection on inquiries
create unique index if not exists unique_pending_inquiry_report
  on public.moderation_flags (reporter_id, inquiry_id)
  where status = 'pending';

-- Performance index for inquiry_id
create index if not exists moderation_flags_inquiry_id_idx
  on public.moderation_flags (inquiry_id);

-- ============================================================================
-- 2. Update submit_moderation_flag: add inquiry support + rate limiting
-- ============================================================================

create or replace function public.submit_moderation_flag(
  p_message_id uuid default null,
  p_question_id uuid default null,
  p_claim_id uuid default null,
  p_evidence_id uuid default null,
  p_inquiry_id uuid default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag_id uuid;
  v_reference_count integer;
  v_reason text;
  v_is_reportable boolean;
  v_recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  v_reference_count :=
    (case when p_message_id is not null then 1 else 0 end) +
    (case when p_question_id is not null then 1 else 0 end) +
    (case when p_claim_id is not null then 1 else 0 end) +
    (case when p_evidence_id is not null then 1 else 0 end) +
    (case when p_inquiry_id is not null then 1 else 0 end);

  if v_reference_count <> 1 then
    raise exception 'Exactly one entity must be reported.';
  end if;

  v_reason := trim(coalesce(p_reason, ''));

  if char_length(v_reason) < 5 then
    raise exception 'Please provide a reason with at least 5 characters.';
  end if;

  if char_length(v_reason) > 2000 then
    raise exception 'Reason must be 2000 characters or less.';
  end if;

  -- Rate limit: max 5 reports per rolling 15 minutes
  select count(*) into v_recent_count
  from public.moderation_flags
  where reporter_id = auth.uid()
    and created_at > now() - interval '15 minutes';

  if v_recent_count >= 5 then
    raise exception 'You have submitted too many reports. Please wait a few minutes and try again.';
  end if;

  v_is_reportable := false;

  if p_message_id is not null then
    select exists (
      select 1
      from public.discussion_messages dm
      where dm.id = p_message_id
        and dm.is_moderated = false
    )
    into v_is_reportable;
  elsif p_question_id is not null then
    select exists (
      select 1
      from public.discussion_questions dq
      where dq.id = p_question_id
    )
    into v_is_reportable;
  elsif p_claim_id is not null then
    select exists (
      select 1
      from public.discussion_claims dc
      where dc.id = p_claim_id
    )
    into v_is_reportable;
  elsif p_evidence_id is not null then
    select exists (
      select 1
      from public.discussion_evidence de
      where de.id = p_evidence_id
    )
    into v_is_reportable;
  elsif p_inquiry_id is not null then
    select exists (
      select 1
      from public.inquiry_items ii
      where ii.id = p_inquiry_id
    )
    into v_is_reportable;
  end if;

  if not v_is_reportable then
    raise exception 'Content is not available for reporting.';
  end if;

  insert into public.moderation_flags (
    message_id,
    question_id,
    claim_id,
    evidence_id,
    inquiry_id,
    reporter_id,
    reason,
    status,
    action_taken_by,
    resolved_at
  )
  values (
    p_message_id,
    p_question_id,
    p_claim_id,
    p_evidence_id,
    p_inquiry_id,
    auth.uid(),
    v_reason,
    'pending',
    null,
    null
  )
  returning id into v_flag_id;

  return v_flag_id;
exception
  when foreign_key_violation then
    raise exception 'Content is not available for reporting.';
end;
$$;

revoke all on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, uuid, text) to authenticated;

comment on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, uuid, text) is
  'Creates a pending moderation flag for the current user. Returns id only; caller cannot set status or moderation metadata.';

-- ============================================================================
-- 3. Create user_feedback table
-- ============================================================================

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  description text not null,
  page_url text not null,
  created_at timestamptz default now(),
  status text not null default 'new',
  constraint user_feedback_category_check check (category in ('bug', 'confusing_ux', 'suggestion', 'general')),
  constraint user_feedback_status_check check (status in ('new', 'reviewed', 'archived')),
  constraint user_feedback_description_length check (char_length(description) >= 10 and char_length(description) <= 3000),
  constraint user_feedback_page_url_length check (char_length(page_url) <= 1000)
);

alter table public.user_feedback enable row level security;

revoke all on public.user_feedback from anon, authenticated;

-- Policy: users can insert their own feedback (user_id must match auth.uid() or be null for guests)
create policy "Users can insert own feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );

-- Policy: users can view their own feedback
create policy "Users can view own feedback"
  on public.user_feedback
  for select
  to authenticated
  using (user_id = auth.uid());

-- Policy: admins/moderators can view all feedback
create policy "Moderators and admins can view all feedback"
  on public.user_feedback
  for select
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type));

-- ============================================================================
-- 4. Create submit_user_feedback RPC
-- ============================================================================

create or replace function public.submit_user_feedback(
  p_category text default null,
  p_description text default null,
  p_page_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback_id uuid;
  v_category text;
  v_description text;
  v_page_url text;
begin
  v_category := trim(coalesce(p_category, ''));
  v_description := trim(coalesce(p_description, ''));
  v_page_url := trim(coalesce(p_page_url, ''));

  if v_category not in ('bug', 'confusing_ux', 'suggestion', 'general') then
    raise exception 'Invalid feedback category.';
  end if;

  if char_length(v_description) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;

  if char_length(v_description) > 3000 then
    raise exception 'Description must be 3000 characters or less.';
  end if;

  if char_length(v_page_url) > 1000 then
    raise exception 'Page URL must be 1000 characters or less.';
  end if;

  insert into public.user_feedback (
    user_id,
    category,
    description,
    page_url,
    status
  )
  values (
    auth.uid(),
    v_category,
    v_description,
    v_page_url,
    'new'
  )
  returning id into v_feedback_id;

  return v_feedback_id;
end;
$$;

revoke all on function public.submit_user_feedback(text, text, text) from public, anon;
grant execute on function public.submit_user_feedback(text, text, text) to authenticated, anon;

comment on function public.submit_user_feedback(text, text, text) is
  'Submits user feedback. Authenticated users are associated with their account; guests submit anonymously.';

-- ============================================================================
-- PHASE 5B MIGRATION 003: 202606240003_fix_moderation_queue_regression.sql
-- ============================================================================
-- Migration: Fix moderation_queue regression to hardened base-table architecture
-- This is a forward-only append migration. It does not modify old migrations.

-- ============================================================================
-- Restore moderation_queue using hardened base-table joins
-- ============================================================================
-- The previous migration recreated moderation_queue using access-filtered
-- discussion_* views, which broke private-room moderation visibility for
-- moderators. This migration restores the direct base-table join architecture
-- and adds inquiry_id support.

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
  f.inquiry_id,
  case
    when f.message_id is not null then 'message'
    when f.question_id is not null then 'question'
    when f.claim_id is not null then 'claim'
    when f.evidence_id is not null then 'evidence'
    when f.inquiry_id is not null then 'inquiry'
    else 'unknown'
  end as entity_type,
  f.reason,
  f.status,
  f.created_at,
  f.resolved_at,
  r.id as room_id,
  r.title as room_title,
  r.slug as room_slug,
  coalesce(
    dm.content,
    dq.content,
    dc.content,
    de.content,
    di.content
  ) as content,
  coalesce(
    case when dm.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pm.username, 'Deleted User') end,
    case when dq.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pq.username, 'Deleted User') end,
    case when dc.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pc.username, 'Deleted User') end,
    case when de.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pe.username, 'Deleted User') end,
    coalesce(pi.username, 'Deleted User')
  ) as author_username,
  coalesce(
    case when dm.identity_mode = 'anonymous' then null else pm.avatar_url end,
    case when dq.identity_mode = 'anonymous' then null else pq.avatar_url end,
    case when dc.identity_mode = 'anonymous' then null else pc.avatar_url end,
    case when de.identity_mode = 'anonymous' then null else pe.avatar_url end,
    pi.avatar_url
  ) as author_avatar_url
from public.moderation_flags f
left join public.messages dm on dm.id = f.message_id
left join public.questions dq on dq.id = f.question_id
left join public.claims dc on dc.id = f.claim_id
left join public.evidence de on de.id = f.evidence_id
left join public.inquiry_items di on di.id = f.inquiry_id
left join public.profiles pm on pm.id = dm.user_id
left join public.profiles pq on pq.id = dq.created_by
left join public.profiles pc on pc.id = dc.created_by
left join public.profiles pe on pe.id = de.created_by
left join public.profiles pi on pi.id = di.created_by
left join public.rooms r on r.id = (
  coalesce(dm.room_id, dq.room_id, dc.room_id, de.room_id, di.room_id)
)
where public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type);

revoke all on public.moderation_queue from public, anon;
grant select on public.moderation_queue to authenticated;

comment on view public.moderation_queue is
  'Redacted moderator queue. Uses hardened base-table joins so moderators can inspect flagged private-room content without room membership. Omits reporter_id and action_taken_by.';

-- ============================================================================
-- PHASE 5B MIGRATION 004: 202606240004_update_moderation_constraint.sql
-- ============================================================================
-- Migration: Update moderation_flags exactly-one-entity constraint to include inquiry_id
-- This is a forward-only append migration.

-- ============================================================================
-- Drop old constraint and create updated one including inquiry_id
-- ============================================================================

alter table public.moderation_flags
  drop constraint if exists exactly_one_entity;

alter table public.moderation_flags
  add constraint exactly_one_entity check (
    (case when message_id is not null then 1 else 0 end +
     case when question_id is not null then 1 else 0 end +
     case when claim_id is not null then 1 else 0 end +
     case when evidence_id is not null then 1 else 0 end +
     case when inquiry_id is not null then 1 else 0 end) = 1
  );

-- ============================================================================
-- PHASE 5B MIGRATION 005: 202606240005_drop_legacy_submit_moderation_flag.sql
-- ============================================================================
-- Migration: Drop obsolete 5-argument submit_moderation_flag overload
-- Forward-only Phase 5B remediation.
-- The 6-argument overload remains unchanged.

drop function if exists public.submit_moderation_flag(
  uuid,
  uuid,
  uuid,
  uuid,
  text
);
