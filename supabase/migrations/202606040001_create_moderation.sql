-- Sprint 8 Phase 1: Anonymity-Preserving Moderation Framework (ADR-023 / ADR-024)
-- Create user_roles, moderation_flags, helper functions, and recreate discussion views.

-- 1. Create public.user_role_type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_type') then
    create type public.user_role_type as enum ('moderator', 'admin');
  end if;
end;
$$;

-- 2. Create public.user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role_type not null,
  created_at timestamptz not null default now(),
  constraint unique_user_role unique (user_id, role)
);

-- Enable RLS and restrict direct public actions on user_roles
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;

-- 3. Register deterministic has_role_or_higher helper function (SECURITY DEFINER)
create or replace function public.has_role_or_higher(p_user_id uuid, p_required_role public.user_role_type)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id
      and (
        ur.role = p_required_role
        or (p_required_role = 'moderator'::public.user_role_type and ur.role = 'admin'::public.user_role_type)
      )
      and (
        -- Allow checking own role
        p_user_id = auth.uid()
        -- Or allow checking if caller is a moderator or admin
        or exists (
          select 1 from public.user_roles caller_ur
          where caller_ur.user_id = auth.uid()
            and caller_ur.role in ('moderator'::public.user_role_type, 'admin'::public.user_role_type)
        )
      )
  );
$$;

-- Harden has_role_or_higher execute permissions
revoke execute on function public.has_role_or_higher(uuid, public.user_role_type) from public, anon;
grant execute on function public.has_role_or_higher(uuid, public.user_role_type) to authenticated;

-- 4. Create public.moderation_flags table
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  claim_id uuid references public.claims(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'resolved_hidden', 'resolved_dismissed', 'resolved_restored')),
  action_taken_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  
  -- Enforce that exactly one entity reference is non-null
  constraint exactly_one_entity check (
    (case when message_id is not null then 1 else 0 end +
     case when question_id is not null then 1 else 0 end +
     case when claim_id is not null then 1 else 0 end +
     case when evidence_id is not null then 1 else 0 end) = 1
  )
);

-- 5. Composite unique indexes for duplicate pending report protection
create unique index if not exists unique_pending_message_report on public.moderation_flags (reporter_id, message_id) where status = 'pending';
create unique index if not exists unique_pending_question_report on public.moderation_flags (reporter_id, question_id) where status = 'pending';
create unique index if not exists unique_pending_claim_report on public.moderation_flags (reporter_id, claim_id) where status = 'pending';
create unique index if not exists unique_pending_evidence_report on public.moderation_flags (reporter_id, evidence_id) where status = 'pending';

-- 6. Performance indexes for view filtering (Hash Anti-Joins)
create index if not exists moderation_flags_message_hidden_idx on public.moderation_flags (message_id) where status = 'resolved_hidden';
create index if not exists moderation_flags_question_hidden_idx on public.moderation_flags (question_id) where status = 'resolved_hidden';
create index if not exists moderation_flags_claim_hidden_idx on public.moderation_flags (claim_id) where status = 'resolved_hidden';
create index if not exists moderation_flags_evidence_hidden_idx on public.moderation_flags (evidence_id) where status = 'resolved_hidden';

-- 6.1 Full indexes to support FK cascade validations (prevent full table scans on delete)
create index if not exists moderation_flags_message_id_idx on public.moderation_flags (message_id);
create index if not exists moderation_flags_question_id_idx on public.moderation_flags (question_id);
create index if not exists moderation_flags_claim_id_idx on public.moderation_flags (claim_id);
create index if not exists moderation_flags_evidence_id_idx on public.moderation_flags (evidence_id);
create index if not exists moderation_flags_reporter_id_idx on public.moderation_flags (reporter_id);
create index if not exists moderation_flags_action_taken_by_idx on public.moderation_flags (action_taken_by);

-- 7. Enable RLS on moderation_flags
alter table public.moderation_flags enable row level security;
revoke all on public.moderation_flags from anon, authenticated;

-- Grant required table-level privileges (access is filtered by RLS policies)
grant insert, select, update on public.moderation_flags to authenticated;

-- RLS policy: Authenticated users can insert reports (hardened against status/metadata injection)
create policy "Authenticated users can submit reports"
on public.moderation_flags
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'pending'
  and action_taken_by is null
  and resolved_at is null
);

-- RLS policy: Moderators and admins can select/update flags
create policy "Moderators and admins can select reports"
on public.moderation_flags
for select
to authenticated
using (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type));

create policy "Moderators and admins can update reports"
on public.moderation_flags
for update
to authenticated
using (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type))
with check (
  public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type)
  and (action_taken_by is null or action_taken_by = auth.uid())
);

-- 8. Recreate views with Hash Anti-Joins

-- A. Recreate public.discussion_messages (Placeholder-based hidden content)
create or replace view public.discussion_messages
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when mf.message_id is not null then '[Message hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' or mf.message_id is not null then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' or mf.message_id is not null then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' or mf.message_id is not null then null
    else p.avatar_url
  end as avatar_url,
  case
    when mf.message_id is not null then true
    else false
  end as is_moderated
from public.messages m
left join public.profiles p on m.user_id = p.id
left join (
  select distinct message_id
  from public.moderation_flags
  where status = 'resolved_hidden'
) mf on m.id = mf.message_id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_messages to anon, authenticated;

-- B. Recreate public.discussion_questions (Complete removal)
create or replace view public.discussion_questions
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
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when q.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.questions q
left join public.profiles p on q.created_by = p.id
where exists (
  select 1 from public.rooms r
  where r.id = q.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
)
and not exists (
  select 1 from public.moderation_flags mf
  where mf.question_id = q.id and mf.status = 'resolved_hidden'
);

grant select on public.discussion_questions to anon, authenticated;

-- C. Recreate public.discussion_claims (Complete removal)
create or replace view public.discussion_claims
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id,
  c.content,
  c.claim_type,
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
  ) as user_vote
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
where exists (
  select 1 from public.rooms r
  where r.id = c.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
)
and not exists (
  select 1 from public.moderation_flags mf
  where mf.claim_id = c.id and mf.status = 'resolved_hidden'
);

grant select on public.discussion_claims to anon, authenticated;

-- D. Recreate public.discussion_evidence (Complete removal + Claim cascading filtering)
create or replace view public.discussion_evidence
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
where exists (
  select 1 from public.rooms r
  where r.id = e.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
)
-- 1. Exclude if evidence itself is hidden
and not exists (
  select 1 from public.moderation_flags mf
  where mf.evidence_id = e.id and mf.status = 'resolved_hidden'
)
-- 2. Exclude if parent claim is hidden (Moderation Cascade propagation rule)
and not exists (
  select 1 from public.moderation_flags mf
  where mf.claim_id = ce.claim_id and mf.status = 'resolved_hidden'
);

grant select on public.discussion_evidence to anon, authenticated;
