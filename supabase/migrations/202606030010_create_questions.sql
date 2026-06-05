-- Sprint 7 Phase 1: Questions Foundation (ADR-022)
-- Create questions table, triggers, RLS policies, views, and update claims to reference questions.

-- 1. Create public.questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  content text not null,
  question_type text not null,
  identity_mode text not null default 'public',
  is_retracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_content_length_check check (char_length(content) between 10 and 500),
  constraint questions_question_type_check check (question_type in ('information', 'clarification', 'perspective', 'evidence', 'directional', 'reflective')),
  constraint questions_identity_mode_check check (identity_mode in ('public', 'anonymous'))
);

-- 2. Trigger to handle created_by metadata on Questions INSERT/UPDATE
create or replace function public.handle_question_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists handle_question_identity_mode on public.questions;
create trigger handle_question_identity_mode
before insert or update on public.questions
for each row
execute function public.handle_question_identity_mode();

-- 3. Trigger to enforce Question immutability on UPDATE (ADR-022: retraction is only permitted action)
create or replace function public.enforce_question_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent modifying any field other than is_retracted and updated_at
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.content is distinct from old.content or
     new.question_type is distinct from old.question_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Questions are immutable. Only retraction is permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Questions cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_question_immutability on public.questions;
create trigger enforce_question_immutability
before update on public.questions
for each row
execute function public.enforce_question_immutability();

-- 4. Trigger to prevent Question deletion
create or replace function public.prevent_question_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Questions cannot be deleted. Retraction is the only permitted action.';
end;
$$;

drop trigger if exists prevent_question_deletion on public.questions;
create trigger prevent_question_deletion
before delete on public.questions
for each row
execute function public.prevent_question_deletion();

-- 5. Trigger to auto-update updated_at timestamp on Questions
drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

-- 6. Add database indexes for questions
create index if not exists questions_room_id_created_at_idx on public.questions (room_id, created_at desc);
create index if not exists questions_created_by_idx on public.questions (created_by);
create index if not exists questions_room_id_question_type_idx on public.questions (room_id, question_type);

-- 7. Enable Row Level Security (RLS) on questions
alter table public.questions enable row level security;

-- 8. Exclude raw questions from public SELECT access
revoke select on public.questions from anon, authenticated;

-- 9. RLS Insert and Update policies on raw questions
create policy "Authenticated users can create questions"
on public.questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.rooms r
    where r.id = room_id
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
);

create policy "Authors can retract their questions"
on public.questions
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 10. Security Definer View for public.questions to dynamically redact anonymous creators (ADR-016 parity)
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
);

grant select on public.discussion_questions to anon, authenticated;

-- 11. Alter public.claims to add question_id nullable relation
alter table public.claims
add column if not exists question_id uuid references public.questions (id) on delete set null;

-- 12. Create indexes for claims.question_id
create index if not exists claims_question_id_created_at_idx on public.claims (question_id, created_at desc) where question_id is not null;
create index if not exists claims_room_id_question_id_idx on public.claims (room_id, question_id) where question_id is not null;

-- 13. Trigger to validate that a claim's question_id room_id matches the claim's room_id
create or replace function public.validate_claim_question_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.question_id is not null then
    if not exists (
      select 1 from public.questions
      where id = new.question_id and room_id = new.room_id
    ) then
      raise exception 'question_id must belong to the same room as the claim.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_claim_question_room on public.claims;
create trigger validate_claim_question_room
before insert or update on public.claims
for each row
execute function public.validate_claim_question_room();

-- 14. Recreate enforce_claim_immutability to restrict modifications to question_id after insertion
create or replace function public.enforce_claim_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent modifying any field other than is_retracted and updated_at
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.origin_message_id is distinct from old.origin_message_id or
     new.question_id is distinct from old.question_id or -- added question_id to immutability check
     new.content is distinct from old.content or
     new.claim_type is distinct from old.claim_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Claims are immutable. Only retraction is permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Claims cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_claim_immutability on public.claims;
create trigger enforce_claim_immutability
before update on public.claims
for each row
execute function public.enforce_claim_immutability();

-- 15. Recreate public.discussion_claims view to include c.question_id and preserve Sprint 6.5 voting/consensus logic
drop view if exists public.discussion_claims;
create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id, -- added question_id
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
);

grant select on public.discussion_claims to anon, authenticated;
