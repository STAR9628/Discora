-- Chain repair: remove moderation_queue's dependency on discussion_claims
-- so that 202606060002 (which drops discussion_claims) can succeed on fresh resets.
--
-- Root cause: 202606040002 created moderation_queue with a LEFT JOIN on
-- discussion_claims. Then 202606060002 dropped discussion_claims without
-- dropping moderation_queue first, failing with SQLSTATE 2BP01 on any
-- fresh supabase db reset.
--
-- This migration drops and recreates moderation_queue using direct
-- base-table joins (messages, questions, claims, evidence + profiles),
-- eliminating the view-on-view dependency. The output columns and
-- access control are equivalent to the original hardened definition.
--
-- inquiry_items support is intentionally omitted here because that table
-- does not exist yet at this position in the migration chain. The full
-- production definition (including inquiry_items) is restored by the
-- companion migration 202609140005_restore_moderation_queue_full_definition.sql.
-- BOTH MIGRATIONS MUST BE DEPLOYED TO PRODUCTION TOGETHER.

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
  'Redacted moderator queue. Uses direct base-table joins so moderators can inspect flagged private-room content without room membership. Omits reporter_id and action_taken_by. Temporarily without inquiry_items; restored by 202609140005.';
