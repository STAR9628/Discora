-- Migration: Remove Winner/Loser system from debates
-- This migration removes all Winner/Loser functionality:
-- - debates.resolution column
-- - resolve_debate RPC
-- - handle_debate_resolve function and trigger
-- - DEBATE_WON/DEBATE_LOST reputation events
-- - 'resolved' status from debates

-- ==========================================
-- 1. Drop Winner/Loser trigger and function
-- ==========================================

drop trigger if exists trg_reputation_debate_resolve on public.debates;

drop function if exists public.handle_debate_resolve();

-- ==========================================
-- 2. Drop resolve_debate RPC
-- ==========================================

drop function if exists public.resolve_debate(uuid, text, text, uuid);

-- ==========================================
-- 3. Delete Winner/Loser reputation events
-- ==========================================

delete from public.reputation_events
where event_type in ('DEBATE_WON', 'DEBATE_LOST');

-- ==========================================
-- 4. Recreate discussion_debates view without resolution
-- ==========================================

drop view if exists public.discussion_debates;

create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.created_at,
  d.updated_at,
  r.title,
  r.slug,
  r.description,
  r.created_by as room_created_by,
  r.topic_id,
  r.visibility,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at,
  coalesce(pc.count, 0) as proposition_claim_count,
  coalesce(oc.count, 0) as opposition_claim_count,
  coalesce(pc.count, 0) + coalesce(oc.count, 0) as total_claims,
  coalesce(pp.count, 0) as proposition_participant_count,
  coalesce(op.count, 0) as opposition_participant_count,
  coalesce(np.count, 0) as neutral_participant_count,
  coalesce(pp.count, 0) + coalesce(op.count, 0) + coalesce(np.count, 0) as total_participants,
  coalesce(ev.count, 0) as total_evidence,
  greatest(
    d.created_at,
    coalesce(last_claim.created_at, d.created_at),
    coalesce(last_evidence.created_at, d.created_at),
    coalesce(last_participant.joined_at, d.created_at)
  ) as last_activity_at
from public.debates d
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'proposition' and not is_retracted
  group by room_id
) pc on d.id = pc.room_id
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'opposition' and not is_retracted
  group by room_id
) oc on d.id = oc.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'proposition'
  group by room_id
) pp on d.id = pp.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'opposition'
  group by room_id
) op on d.id = op.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'neutral'
  group by room_id
) np on d.id = np.room_id
left join (
  select c.room_id, count(distinct ce.evidence_id) as count
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  where not c.is_retracted
  group by c.room_id
) ev on d.id = ev.room_id
left join (
  select room_id, max(created_at) as created_at
  from public.claims
  where not is_retracted
  group by room_id
) last_claim on d.id = last_claim.room_id
left join (
  select c.room_id, max(e.created_at) as created_at
  from public.claims c
  inner join public.claim_evidence ce on ce.claim_id = c.id
  inner join public.evidence e on e.id = ce.evidence_id
  where not c.is_retracted and not e.is_retracted
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
left join (
  select room_id, max(joined_at) as joined_at
  from public.debate_participants
  group by room_id
) last_participant on d.id = last_participant.room_id
inner join public.rooms r on d.id = r.id and r.room_type = 'debate'
where public.has_room_access(r.id);

grant select on public.discussion_debates to anon, authenticated;

-- ==========================================
-- 5. Remove resolution column from debates
-- ==========================================

alter table public.debates drop column if exists resolution;

-- ==========================================
-- 6. Update status constraint to remove 'resolved'
-- ==========================================

alter table public.debates 
  drop constraint if exists debates_status_check,
  add constraint debates_status_check 
  check (status in ('active', 'closed'));
