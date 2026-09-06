-- Fix discussion_evidence view missing room_id and vote aggregates
-- Regression: 202606210001 dropped room_id, agree_count, disagree_count,
-- consensus_ratio, and user_vote from the view, breaking frontend queries
-- that filter by room_id and read vote metadata.

drop view if exists public.discussion_evidence;

create or replace view public.discussion_evidence
with (security_invoker = false)
as
select
  e.id,
  e.room_id,
  e.source_id,
  e.content,
  e.evidence_type,
  e.identity_mode,
  e.is_retracted,
  e.created_at,
  e.updated_at,
  ce.claim_id,
  ce.direction,
  case
    when e.identity_mode = 'anonymous' then null
    else e.created_by
  end as created_by,
  case
    when e.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when e.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  s.title as source_title,
  s.url as source_url,
  s.file_path as source_file_path,
  s.is_retracted as source_is_retracted,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio,
  (
    select vote_type from public.evidence_votes ev_vote
    where ev_vote.evidence_id = e.id and ev_vote.user_id = auth.uid()
  ) as user_vote
from public.evidence e
join public.claim_evidence ce on e.id = ce.evidence_id
left join public.sources s on e.source_id = s.id
left join public.profiles p on e.created_by = p.id
left join (
  select
    evidence_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.evidence_votes
  group by evidence_id
) v on e.id = v.evidence_id
where public.has_room_access(e.room_id);

grant select on public.discussion_evidence to anon, authenticated;
