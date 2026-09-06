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
