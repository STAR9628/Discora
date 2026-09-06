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
