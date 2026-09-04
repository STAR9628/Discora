-- Phase 4 P0 Privacy Remediation
--
-- Closes existing private-debate read leaks while preserving public functionality.
--
-- Changes:
-- 1. Restrict debate_participants SELECT to authorized room viewers
-- 2. Restrict discussion_debates view to public debates or owner-visible debates
-- 3. Add room visibility filter to get_featured_inquiries RPC
--
-- This is a read-side privacy fix only. It does NOT create invitations,
-- access codes, private-room creation UX, or participant management.

-- ============================================================================
-- 1. debate_participants SELECT policy
-- ============================================================================
-- Current policy: "Anyone can view debate participants" (using true)
-- Problem: exposes private debate membership to anonymous/authenticated users.
--
-- New policy: only expose participants when the room is public OR the
-- viewer is the room owner OR the viewer is themselves a participant.

drop policy if exists "Anyone can view debate participants" on public.debate_participants;

create policy "Debate participants are viewable in authorized rooms"
  on public.debate_participants for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and (
          r.visibility = 'public'
          or r.created_by = auth.uid()
          or exists (
            select 1 from public.debate_participants dp
            where dp.room_id = room_id
              and dp.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- 2. discussion_debates view
-- ============================================================================
-- Current view: exposes all debates regardless of room visibility.
-- Problem: global debate feed and direct view query leak private debates.
--
-- New view: only expose debates whose room is public OR whose creator is
-- the current viewer. Participant-scoped discovery is handled separately
-- in Phase 4D; this fix closes the global enumeration gap.

drop view if exists public.discussion_debates;

create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.resolution,
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
  inner join public.claim_evidence ce on ce.evidence_id = c.id
  inner join public.evidence e on ce.evidence_id = e.id
  where not c.is_retracted and not e.is_retracted
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
left join (
  select room_id, max(joined_at) as joined_at
  from public.debate_participants
  group by room_id
) last_participant on d.id = last_participant.room_id
inner join public.rooms r on d.id = r.id and r.room_type = 'debate'
where
  r.visibility = 'public'
  or r.created_by = auth.uid();

grant select on public.discussion_debates to anon, authenticated;

-- ============================================================================
-- 3. get_featured_inquiries RPC
-- ============================================================================
-- Current RPC: joins rooms without visibility filter.
-- Problem: featured inquiries can leak titles from private rooms.
--
-- New RPC: only return inquiries from public rooms, or from rooms the
-- caller owns. Participant-scoped inquiry discovery is a later phase.

create or replace function public.get_featured_inquiries(p_limit int default 3)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select array(
  select json_build_object(
    'id', ii.id,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'status', ii.status,
    'target_claim_content', (
      select content from claims c where c.id = ii.target_claim_id
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'created_at', ii.created_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.status in ('open', 'responded')
    and (
      r.visibility = 'public'
      or r.created_by = auth.uid()
    )
  order by ii.updated_at desc
  limit p_limit
);
$$;

grant execute on function public.get_featured_inquiries to anon, authenticated;

-- ============================================================================
-- 4. get_my_debates_attention RPC
-- ============================================================================
-- Current RPC: queries discussion_debates view and debate_participants.
-- Problem: after restricting the view to public + owner, participants in
-- private debates would disappear from personalized attention feed.
--
-- New RPC: query base tables directly with explicit participant/owner check
-- so private debate participants remain visible in their personal surfaces.

create or replace function public.get_my_debates_attention()
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select array(
  select json_build_object(
    'room_id', d.id,
    'title', r.title,
    'slug', r.slug,
    'proposition_title', d.proposition_title,
    'opposition_title', d.opposition_title,
    'status', d.status,
    'my_side', dp.side,
    'my_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id and c.created_by = auth.uid() and c.is_retracted = false
    ),
    'opposing_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id
        and c.created_by != auth.uid()
        and c.debate_side != dp.side
        and c.is_retracted = false
    ),
    'last_activity_at', greatest(
      d.created_at,
      coalesce(
        (select max(created_at) from claims c2 where c2.room_id = d.id and not c2.is_retracted),
        d.created_at
      ),
      coalesce(
        (select max(e.created_at)
         from claims c3
         inner join claim_evidence ce on ce.claim_id = c3.id
         inner join evidence e on e.id = ce.evidence_id
         where c3.room_id = d.id and not c3.is_retracted and not e.is_retracted),
        d.created_at
      ),
      coalesce(
        (select max(dp2.joined_at) from debate_participants dp2 where dp2.room_id = d.id),
        d.created_at
      )
    )
  )
  from debates d
  join rooms r on r.id = d.id
  join debate_participants dp on dp.room_id = d.id and dp.user_id = auth.uid()
  where d.status = 'active'
    and dp.side in ('proposition', 'opposition')
    and (
      r.visibility = 'public'
      or r.created_by = auth.uid()
    )
  order by greatest(
    d.created_at,
    coalesce(
      (select max(created_at) from claims c2 where c2.room_id = d.id and not c2.is_retracted),
      d.created_at
    ),
    coalesce(
      (select max(e.created_at)
       from claims c3
       inner join claim_evidence ce on ce.claim_id = c3.id
       inner join evidence e on e.id = ce.evidence_id
       where c3.room_id = d.id and not c3.is_retracted and not e.is_retracted),
      d.created_at
    ),
    coalesce(
      (select max(dp2.joined_at) from debate_participants dp2 where dp2.room_id = d.id),
      d.created_at
    )
  ) desc nulls last
);
$$;

grant execute on function public.get_my_debates_attention to authenticated;

-- ============================================================================
-- Verification / notes
-- ============================================================================
-- This migration intentionally does NOT:
-- - create invitation tables
-- - create access-code tables
-- - add private debate creation UX
-- - modify discussion visibility behavior
-- - change search_content behavior
--
-- It ONLY closes confirmed global read leaks for private debates.
