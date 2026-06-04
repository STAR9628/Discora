-- Sprint 8 hardening: redacted moderation queue and RPC-only mutations.
-- Prevents moderators from retrieving reporter_id/action_taken_by via PostgREST.

-- ---------------------------------------------------------------------------
-- 1. Redacted moderation queue view
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. RPC for user report submission
-- ---------------------------------------------------------------------------
create or replace function public.submit_moderation_flag(
  p_message_id uuid default null,
  p_question_id uuid default null,
  p_claim_id uuid default null,
  p_evidence_id uuid default null,
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  v_reference_count :=
    (case when p_message_id is not null then 1 else 0 end) +
    (case when p_question_id is not null then 1 else 0 end) +
    (case when p_claim_id is not null then 1 else 0 end) +
    (case when p_evidence_id is not null then 1 else 0 end);

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
  end if;

  if not v_is_reportable then
    raise exception 'Content is not available for reporting.';
  end if;

  insert into public.moderation_flags (
    message_id,
    question_id,
    claim_id,
    evidence_id,
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

revoke all on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, text) to authenticated;

comment on function public.submit_moderation_flag(uuid, uuid, uuid, uuid, text) is
  'Creates a pending moderation flag for the current user. Returns id only; caller cannot set status or moderation metadata.';

-- ---------------------------------------------------------------------------
-- 3. RPC for moderator resolution
-- ---------------------------------------------------------------------------
create or replace function public.resolve_moderation_flag(
  p_flag_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type) then
    raise exception 'Moderator privileges required.';
  end if;

  if p_status not in ('resolved_hidden', 'resolved_dismissed', 'resolved_restored') then
    raise exception 'Invalid moderation resolution status.';
  end if;

  update public.moderation_flags
  set
    status = p_status,
    action_taken_by = auth.uid(),
    resolved_at = now()
  where id = p_flag_id
    and (
      (status = 'pending' and p_status in ('resolved_hidden', 'resolved_dismissed'))
      or (status = 'resolved_hidden' and p_status = 'resolved_restored')
    )
  returning id into v_flag_id;

  if v_flag_id is null then
    raise exception 'Moderation flag not found or transition is not allowed.';
  end if;

  return v_flag_id;
end;
$$;

revoke all on function public.resolve_moderation_flag(uuid, text) from public, anon;
grant execute on function public.resolve_moderation_flag(uuid, text) to authenticated;

comment on function public.resolve_moderation_flag(uuid, text) is
  'Resolves a moderation flag for moderators/admins. Allows pending hide/dismiss and hidden restore transitions only.';

-- ---------------------------------------------------------------------------
-- 4. Narrow public role checks to the current user only
-- ---------------------------------------------------------------------------
create or replace function public.has_role_or_higher(p_user_id uuid, p_required_role public.user_role_type)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where p_user_id = auth.uid()
      and ur.user_id = auth.uid()
      and (
        ur.role = p_required_role
        or (p_required_role = 'moderator'::public.user_role_type and ur.role = 'admin'::public.user_role_type)
      )
  );
$$;

create or replace function public.has_current_user_role_or_higher(p_required_role public.user_role_type)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role_or_higher(auth.uid(), p_required_role);
$$;

revoke execute on function public.has_current_user_role_or_higher(public.user_role_type) from public, anon;
grant execute on function public.has_current_user_role_or_higher(public.user_role_type) to authenticated;

comment on function public.has_current_user_role_or_higher(public.user_role_type) is
  'Client-safe role check scoped to auth.uid(); prevents arbitrary-user role enumeration.';

-- ---------------------------------------------------------------------------
-- 5. Remove raw read/update/write access from client roles
-- ---------------------------------------------------------------------------
revoke select, insert, update on public.moderation_flags from authenticated;

-- Existing RLS remains as defense in depth, but normal client reads now use
-- public.moderation_queue, reporting uses public.submit_moderation_flag(), and
-- resolution uses public.resolve_moderation_flag().
