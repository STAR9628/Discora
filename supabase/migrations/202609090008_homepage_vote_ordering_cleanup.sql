-- Phase 7D Phase A: Homepage Vote-Derived Ordering Cleanup
-- Removes vote-derived ordering from homepage RPCs and replaces with neutral ordering
-- The get_my_understanding_evolved RPC was ordering by consensus distance from 50%
-- New behavior: order by recency (updated_at) - neutral, non-epistemic signal
--
-- REVISION (R6, Phase F readiness gate): this file was an unapplied working-tree
-- draft (never committed, absent from the reachable database, referenced by no
-- deploy script). The recreated function now carries SET search_path = public
-- per the 202606190001 hardening discipline. Nothing else changed.

-- ============================================================================
-- 1. Update get_my_understanding_evolved to use neutral ordering
-- Remove consensus_ratio computation from the ORDER BY clause
-- Keep consensus_ratio in SELECT for display (community stance is still shown)
-- But do NOT use it for ranking/ordering
-- ============================================================================

-- R6: SET search_path = public preserves the 202606190001 security-hardening
-- discipline on recreated SECURITY DEFINER functions.
create or replace function public.get_my_understanding_evolved()
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select array(
  select json_build_object(
    'claim_id', c.id,
    'claim_content', c.content,
    'room_id', c.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'my_vote', cv.vote_type,
    'agree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
    ),
    'disagree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
    ),
    'consensus_ratio', (
      case
        when (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
        ) + (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
        ) > 0
        then round(
          (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
          /
          nullif(
            (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
            + (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'),
            0
          )
          * 100
        )
        else null
      end
    ),
    'evidence_count', (
      select count(*) from claim_evidence ce
      join evidence e on e.id = ce.evidence_id
      where ce.claim_id = c.id and e.is_retracted = false
    ),
    'latest_evidence', (
      select content from evidence e
      join claim_evidence ce on ce.evidence_id = e.id
      where ce.claim_id = c.id and e.is_retracted = false
      order by e.created_at desc
      limit 1
    )
  )
  from claims c
  join rooms r on r.id = c.room_id
  join claim_votes cv on cv.claim_id = c.id and cv.user_id = auth.uid()
  where c.is_retracted = false
    and c.deleted_at is null
  order by c.updated_at desc  -- NEUTRAL ORDERING: most recently updated claims first
  limit 10
);
$$;

-- Note: The frontend (logged-in-homepage.tsx groupUnderstandingEvolved function)
-- must also be updated to sort by updated_at instead of |consensusRatio - 50|
-- This is an application code change, not a database change.

-- ============================================================================
-- 2. Verify no other homepage RPCs use vote-derived ordering
-- get_homepage_metrics - no ordering
-- get_featured_inquiries - orders by updated_at desc (neutral)
-- get_my_open_inquiries - orders by updated_at desc (neutral)
-- get_my_inquiry_responses - orders by updated_at desc (neutral)
-- get_my_debates_attention - orders by last_activity_at desc (neutral)
-- get_my_topic_evidence - no explicit ORDER BY (group by topic)
-- All others are neutral or use recency
-- ============================================================================