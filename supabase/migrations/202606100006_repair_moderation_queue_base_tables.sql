-- Chain repair: detach moderation_queue from all discussion_* views.
--
-- After 202606100001_create_debates recreated moderation_queue with LEFT JOINs
-- on all four discussion_* views (discussion_messages, discussion_questions,
-- discussion_claims, discussion_evidence), any subsequent migration that drops
-- one of those views without first dropping moderation_queue fails with 2BP01.
--
-- Affected break points downstream of this repair:
--   202606110001 line 84: drops discussion_messages
--   202606110002 line 6:  drops discussion_messages
--   202606250001 line 6:  drops discussion_evidence
--
-- This migration drops moderation_queue and recreates it using direct
-- base-table joins (messages, questions, claims, evidence + profiles),
-- eliminating all view-on-view dependencies. inquiry_items support is
-- omitted because that table does not exist yet at this chain position;
-- the full production definition is restored by 202609140005.
-- BOTH THIS MIGRATION AND 202609140005 MUST BE DEPLOYED TOGETHER.

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
  r.id as room_id,
  r.title as room_title,
  r.slug as room_slug,
  coalesce(
    dm.content,
    dq.content,
    dc.content,
    de.content
  ) as content,
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
left join public.rooms r on r.id = (
  coalesce(dm.room_id, dq.room_id, dc.room_id, de.room_id)
)
where public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type);

revoke all on public.moderation_queue from public, anon;
grant select on public.moderation_queue to authenticated;

comment on view public.moderation_queue is
  'Redacted moderator queue. Uses hardened base-table joins so moderators can inspect flagged private-room content without room membership. Omits reporter_id and action_taken_by. Temporarily without inquiry_items; restored by 202609140005.';
