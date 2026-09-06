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
