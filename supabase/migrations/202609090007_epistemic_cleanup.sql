-- Phase 7D Phase A: Epistemic Cleanup Migration
-- Removes vote→reputation paths, evidence vote→reputation, consensus bonus, retraction penalties
-- Preserves historical reputation_events (no backfill, no rewrite)
-- Evidence_votes table retained but consumers removed
-- SoU maturity remains OPEN (no changes to SoU computation)

-- ============================================================================
-- 1. Drop vote→reputation triggers (claim_votes)
-- ============================================================================

drop trigger if exists trg_reputation_claim_vote_insert on public.claim_votes;
drop trigger if exists trg_reputation_claim_vote_delete on public.claim_votes;

drop function if exists public.handle_claim_vote_insert();
drop function if exists public.handle_claim_vote_delete();

-- ============================================================================
-- 2. Drop vote→reputation triggers (evidence_votes)
-- ============================================================================

drop trigger if exists trg_reputation_evidence_vote_insert on public.evidence_votes;
drop trigger if exists trg_reputation_evidence_vote_delete on public.evidence_votes;

drop function if exists public.handle_evidence_vote_insert();
drop function if exists public.handle_evidence_vote_delete();

-- ============================================================================
-- 3. Drop retraction penalty triggers
-- ============================================================================

-- CLAIM_RETRACTED -20
drop trigger if exists trg_reputation_claim_retract on public.claims;
drop function if exists public.handle_claim_retract();

-- EVIDENCE_RETRACTED -15
drop trigger if exists trg_reputation_evidence_retract on public.evidence;
drop function if exists public.handle_evidence_retract();

-- ============================================================================
-- 4. Update recalculate_user_reputation to remove consensus bonus
-- Keep: contribution-based reputation (claims/evidence/questions created)
-- Remove: consensus bonus from claim votes (>60% agree ratio)
-- ============================================================================

create or replace function public.recalculate_user_reputation(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_total_points numeric;
  v_expertise jsonb;
  v_score numeric;
  v_user_id uuid := p_user_id;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if v_caller_id != v_user_id and not public.has_role_or_higher(v_caller_id, 'admin'::public.user_role_type) then
    raise exception 'unauthorized' using hint = 'You can only recalculate your own reputation.';
  end if;

  -- 1. Sum all reputation events (historical events preserved)
  select coalesce(sum(points), 0) into v_total_points
  from public.reputation_events
  where user_id = v_user_id;

  -- 2. CONSENSUS BONUS REMOVED - no longer calculated from claim votes
  -- v_consensus_bonus := 0;

  v_score := v_total_points; -- No consensus bonus added

  -- 3. Calculate expertise from claims, evidence, questions (contribution-based, NOT vote-based)
  with expertise_scores as (
    select topic, sum(points) as total_points from (
      select
        case c.claim_type
          when 'fact' then 'Science'
          when 'prediction' then 'Economics'
          when 'proposal' then 'Politics'
          when 'observation' then 'Technology'
          else 'General'
        end as topic,
        3 as points
      from public.claims c
      where c.created_by = v_user_id and not c.is_retracted
      union all
      select
        case e.evidence_type
          when 'scientific' then 'Science'
          when 'statistical' then 'Economics'
          when 'expert' then 'Health'
          when 'documentary' then 'Politics'
          when 'historical' then 'Politics'
          when 'technological' then 'Technology'
          else 'General'
        end as topic,
        2 as points
      from public.evidence e
      where e.created_by = v_user_id and not e.is_retracted
      union all
      select 'General' as topic, 1 as points
      from public.questions q
      where q.created_by = v_user_id and not q.is_retracted
    ) sub
    group by topic
    order by total_points desc
  )
  select jsonb_agg(jsonb_build_object('name', topic, 'score', total_points) order by total_points desc)
  into v_expertise
  from expertise_scores;

  -- 4. Create snapshot
  insert into public.user_reputation_snapshots (user_id, score, expertise)
  values (v_user_id, greatest(v_score, 0), coalesce(v_expertise, '[]'::jsonb));

  return greatest(v_score, 0);
end;
$$;

-- Re-grant execute (was revoked in security hardening)
grant execute on function public.recalculate_user_reputation(uuid) to authenticated;

-- ============================================================================
-- 5. Note: evidence_votes table and UI consumers are removed in application code
-- The table and its data are PRESERVED per data preservation policy
-- castEvidenceVote service function will be removed in application layer
-- EvidenceVoting UI component will be removed in application layer

-- ============================================================================
-- 6. Note: Vote-derived credibility (computeCredibility, ClaimCredibilityBadge, CredibilityTooltip)
-- These are client-side TypeScript utilities and components - removed in application code
-- No database changes needed for these

-- ============================================================================
-- 7. Verify remaining reputation triggers are contribution-based only:
-- - CLAIM_CREATED (+10) - KEPT (contribution)
-- - EVIDENCE_SUBMITTED (+15) - KEPT (contribution)
-- - QUESTION_ASKED (+5) - KEPT (contribution)
-- - DEBATE_CREATED (+15) - KEPT (contribution)
-- - DEBATE_JOINED (+5) - KEPT (contribution)
-- - INQUIRY_RESPONDED (+3) - KEPT (contribution)
-- - INQUIRY_SATISFIED (+2) - KEPT (contribution)
-- All vote-derived and penalty triggers REMOVED above

-- ============================================================================
-- 8. Data Preservation: Historical reputation_events NOT deleted
-- No backfill, no rewrite of history
-- Scores will converge on next recalculation via the updated RPC