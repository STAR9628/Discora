-- Migration: Fix Deleted User Display in Public Views
-- Ensures author display checks p.is_deleted = true BEFORE checking p.username IS NULL
-- Prevents surrogate username (deleted_user_<hash>) from leaking publicly

begin;

-- ============================================================================
-- 1. discussion_messages
-- ============================================================================
create or replace view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then '[Hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true then 'Deleted User'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then true
    else false
  end as is_moderated,
  m.converted_claim_id
from public.messages m
left join public.profiles p on m.user_id = p.id
where public.has_room_access(m.room_id);

grant select on public.discussion_messages to anon, authenticated;

-- ============================================================================
-- 2. discussion_claims
-- ============================================================================
create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id,
  c.content,
  c.claim_type,
  c.context_type,
  c.identity_mode,
  c.is_retracted,
  c.debate_side,
  c.created_at,
  c.updated_at,
  case
    when c.identity_mode = 'anonymous' then null
    else c.created_by
  end as created_by,
  case
    when c.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true then 'Deleted User'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio,
  (
    select vote_type from public.claim_votes cv
    where cv.claim_id = c.id and cv.user_id = auth.uid()
  ) as user_vote,
  c.deleted_at,
  c.deleted_by
from public.claims c
left join public.profiles p on c.created_by = p.id
left join (
  select
    claim_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_id
) v on c.id = v.claim_id
where public.has_room_access(c.room_id)
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.claim_id = c.id and mf.status = 'resolved_hidden'
  );

grant select on public.discussion_claims to anon, authenticated;

-- ============================================================================
-- 3. discussion_evidence
-- ============================================================================
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
    when p.is_deleted = true then 'Deleted User'
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

-- ============================================================================
-- 4. discussion_questions
-- ============================================================================
drop view if exists public.discussion_questions;

create or replace view public.discussion_questions
with (security_invoker = false)
as
select
  q.id,
  q.room_id,
  q.content,
  q.question_type,
  q.identity_mode,
  q.is_retracted,
  q.created_at,
  q.updated_at,
  case
    when q.identity_mode = 'anonymous' then null
    else q.created_by
  end as created_by,
  case
    when q.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true then 'Deleted User'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when q.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.questions q
left join public.profiles p on q.created_by = p.id
where public.has_room_access(q.room_id)
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.question_id = q.id and mf.status = 'resolved_hidden'
  );

grant select on public.discussion_questions to anon, authenticated;

-- ============================================================================
-- 5. discussion_arguments
-- ============================================================================
create or replace view public.discussion_arguments
with (security_invoker = false)
as
select
  a.id,
  a.room_id,
  a.claim_id,
  a.content,
  a.stance,
  a.identity_mode,
  a.is_retracted,
  a.deleted_at,
  a.deleted_by,
  a.created_at,
  a.updated_at,
  case
    when a.identity_mode = 'anonymous' then null
    else a.created_by
  end as created_by,
  case
    when a.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true then 'Deleted User'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when a.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.arguments a
left join public.profiles p on a.created_by = p.id
where public.has_room_access(a.room_id);

grant select on public.discussion_arguments to anon, authenticated;

commit;