-- Sprint 14: Add context_type to claims
-- Classifies how a claim contributes to the discussion.

alter table public.claims
add column context_type text
not null
default 'observation';

alter table public.claims
add constraint claims_context_type_check
check (context_type in ('supporting_idea', 'counterpoint', 'observation', 'open_question'));

-- Update the discussion_claims view to include context_type
drop view if exists public.discussion_claims;

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
  c.created_at,
  c.updated_at,
  case
    when c.identity_mode = 'anonymous' then null
    else c.created_by
  end as created_by,
  case
    when c.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.claims c
left join public.profiles p on c.created_by = p.id
where exists (
  select 1 from public.rooms r
  where r.id = c.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_claims to anon, authenticated;
