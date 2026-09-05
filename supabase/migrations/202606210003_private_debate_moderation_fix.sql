-- Phase 4A Remediation Round 3
--
-- Fixes P1-3: moderation_queue cannot inspect private flagged content
-- because it joins through discussion_* views that enforce has_room_access().
--
-- This migration introduces a dedicated moderation-safe access path that
-- bypasses member-oriented discussion views while preserving normal
-- private-room privacy for ordinary users.

-- ============================================================================
-- P1-3: Moderation queue — dedicated moderator access path
-- ============================================================================
-- Problem: moderation_queue joins discussion_* views, which filter by
-- has_room_access(). Moderators who are not room members cannot see
-- private flagged content.
--
-- Fix: Recreate moderation_queue to join base tables directly with
-- SECURITY DEFINER bypass, while preserving the same redaction logic
-- that discussion_* views apply. Ordinary users still cannot query
-- private content because moderation_queue is restricted to moderators.

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
  coalesce(
    case when dm.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pm.username, 'Deleted User') end,
    case when dq.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pq.username, 'Deleted User') end,
    case when dc.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pc.username, 'Deleted User') end,
    case when de.identity_mode = 'anonymous' then 'Anonymous' else coalesce(pe.username, 'Deleted User') end
  ) as author_username,
  coalesce(
    case when dm.identity_mode = 'anonymous' then null else pm.avatar_url end,
    case when dq.identity_mode = 'anonymous' then null else pq.avatar_url end,
    case when dc.identity_mode = 'anonymous' then null else pc.avatar_url end,
    case when de.identity_mode = 'anonymous' then null else pe.avatar_url end
  ) as author_avatar_url
from public.moderation_flags f
left join public.messages dm on dm.id = f.message_id
left join public.questions dq on dq.id = f.question_id
left join public.claims dc on dc.id = f.claim_id
left join public.evidence de on de.id = f.evidence_id
left join public.profiles pm on pm.id = dm.user_id
left join public.profiles pq on pq.id = dq.created_by
left join public.profiles pc on pc.id = dc.created_by
left join public.profiles pe on pe.id = de.created_by
where public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type);

revoke all on public.moderation_queue from public, anon;

-- ============================================================================
-- Verification notes
-- ============================================================================
-- This migration intentionally does NOT:
-- - modify has_room_access()
-- - modify has_room_write_access()
-- - change discussion_* views
-- - alter normal private-room read/write authorization
--
-- It ONLY fixes the moderation inspection path for authorized moderators.
