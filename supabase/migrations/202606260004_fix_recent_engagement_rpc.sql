-- Phase 5D remediation: fix get_my_recent_engagement to return action/detail
-- from the same row as the latest engagement per room.
--
-- Previous version used max(engagement_type) and max(engagement_detail),
-- which are lexicographic and can report mismatched action/text.

create or replace function public.get_my_recent_engagement(p_limit integer default 5)
returns table (
  room_id uuid,
  room_title text,
  room_slug text,
  room_type text,
  engagement_type text,
  engagement_detail text,
  last_engaged_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with recent_votes as (
    select
      c.room_id,
      'voted' as engagement_type,
      case cv.vote_type
        when 'agree' then 'You agreed with a claim'
        when 'disagree' then 'You contested a claim'
      end as engagement_detail,
      cv.created_at as last_engaged_at
    from public.claim_votes cv
    join public.claims c on c.id = cv.claim_id
    where cv.user_id = auth.uid()
  ),
  recent_evidence as (
    select
      e.room_id,
      'added_evidence' as engagement_type,
      'You added evidence' as engagement_detail,
      e.created_at as last_engaged_at
    from public.evidence e
    where e.created_by = auth.uid()
  ),
  recent_claims as (
    select
      c.room_id,
      'asserted_claim' as engagement_type,
      'You asserted a claim' as engagement_detail,
      c.created_at as last_engaged_at
    from public.claims c
    where c.created_by = auth.uid()
  ),
  recent_inquiries as (
    select
      i.room_id,
      'opened_inquiry' as engagement_type,
      'You opened an inquiry' as engagement_detail,
      i.created_at as last_engaged_at
    from public.inquiry_items i
    where i.created_by = auth.uid()
  ),
  recent_responses as (
    select
      i.room_id,
      'responded_to_inquiry' as engagement_type,
      'You responded to an inquiry' as engagement_detail,
      ir.created_at as last_engaged_at
    from public.inquiry_responses ir
    join public.inquiry_items i on i.id = ir.inquiry_item_id
    where ir.created_by = auth.uid()
  ),
  recent_participants as (
    select
      dp.room_id,
      'joined_debate' as engagement_type,
      'You joined this debate' as engagement_detail,
      dp.joined_at as last_engaged_at
    from public.debate_participants dp
    where dp.user_id = auth.uid()
  ),
  all_engagement as (
    select * from recent_votes
    union all
    select * from recent_evidence
    union all
    select * from recent_claims
    union all
    select * from recent_inquiries
    union all
    select * from recent_responses
    union all
    select * from recent_participants
  ),
  latest_per_room as (
    select distinct on (e.room_id)
      e.room_id,
      e.engagement_type,
      e.engagement_detail,
      e.last_engaged_at
    from all_engagement e
    order by e.room_id, e.last_engaged_at desc
  )
  select
    r.id as room_id,
    r.title as room_title,
    r.slug as room_slug,
    r.room_type,
    l.engagement_type,
    l.engagement_detail,
    l.last_engaged_at
  from latest_per_room l
  join public.rooms r on r.id = l.room_id
  where r.visibility = 'public' and r.status <> 'archived'
  order by l.last_engaged_at desc
  limit p_limit;
$$;

revoke all on function public.get_my_recent_engagement(integer) from public, anon;
grant execute on function public.get_my_recent_engagement(integer) to authenticated;
