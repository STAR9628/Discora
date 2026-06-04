-- Sprint 6 Phase 2: Sources & Evidence Schema
-- Creates sources, evidence, claim_evidence junction tables, security definer view, triggers, and RLS policies.

-- 1. Create public.sources table
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null constraint sources_title_length check (char_length(title) between 5 and 150),
  url text unique,
  file_path text,
  is_retracted boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sources_url_or_file_path check (url is not null or file_path is not null)
);

-- 2. Create public.evidence table
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  content text not null constraint evidence_content_length check (char_length(content) between 50 and 1000),
  evidence_type text not null constraint evidence_type_check check (
    evidence_type in ('scientific', 'statistical', 'documentary', 'visual', 'experiential', 'expert', 'historical', 'logical', 'ethical', 'cultural')
  ),
  identity_mode text not null default 'public' constraint evidence_identity_mode_check check (identity_mode in ('public', 'anonymous')),
  is_retracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create public.claim_evidence junction table
create table if not exists public.claim_evidence (
  claim_id uuid not null references public.claims (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  direction text not null constraint claim_evidence_direction_check check (direction in ('support', 'contradict', 'context')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (claim_id, evidence_id)
);

-- 4. Triggers to handle created_by metadata on INSERT
create or replace function public.handle_evidence_insert_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_source_metadata on public.sources;
create trigger set_source_metadata
before insert on public.sources
for each row
execute function public.handle_evidence_insert_metadata();

drop trigger if exists set_evidence_metadata on public.evidence;
create trigger set_evidence_metadata
before insert on public.evidence
for each row
execute function public.handle_evidence_insert_metadata();

drop trigger if exists set_claim_evidence_metadata on public.claim_evidence;
create trigger set_claim_evidence_metadata
before insert on public.claim_evidence
for each row
execute function public.handle_evidence_insert_metadata();

-- 5. Trigger to enforce Source immutability
create or replace function public.enforce_source_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id or
     new.title is distinct from old.title or
     new.url is distinct from old.url or
     new.file_path is distinct from old.file_path or
     new.created_by is distinct from old.created_by or
     new.created_at is distinct from old.created_at then
    raise exception 'Sources are immutable. Only retraction is permitted.';
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Sources cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_source_immutability on public.sources;
create trigger enforce_source_immutability
before update on public.sources
for each row
execute function public.enforce_source_immutability();

-- 6. Trigger to enforce Evidence immutability
create or replace function public.enforce_evidence_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id or
     new.source_id is distinct from old.source_id or
     new.created_by is distinct from old.created_by or
     new.content is distinct from old.content or
     new.evidence_type is distinct from old.evidence_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Evidence is immutable. Only retraction is permitted.';
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Evidence cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_evidence_immutability on public.evidence;
create trigger enforce_evidence_immutability
before update on public.evidence
for each row
execute function public.enforce_evidence_immutability();

-- 7. Trigger to enforce Claim Evidence immutability (No updates allowed at all)
create or replace function public.enforce_claim_evidence_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Claim Evidence links are immutable.';
end;
$$;

drop trigger if exists enforce_claim_evidence_immutability on public.claim_evidence;
create trigger enforce_claim_evidence_immutability
before update on public.claim_evidence
for each row
execute function public.enforce_claim_evidence_immutability();

-- 8. Triggers to prevent deletion
create or replace function public.prevent_evidence_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Deletions are forbidden. Retraction is the only permitted action.';
end;
$$;

drop trigger if exists prevent_source_deletion on public.sources;
create trigger prevent_source_deletion
before delete on public.sources
for each row
execute function public.prevent_evidence_deletion();

drop trigger if exists prevent_evidence_deletion on public.evidence;
create trigger prevent_evidence_deletion
before delete on public.evidence
for each row
execute function public.prevent_evidence_deletion();

drop trigger if exists prevent_claim_evidence_deletion on public.claim_evidence;
create trigger prevent_claim_evidence_deletion
before delete on public.claim_evidence
for each row
execute function public.prevent_evidence_deletion();

-- 9. Auto-update updated_at timestamp on Evidence
drop trigger if exists set_evidence_updated_at on public.evidence;
create trigger set_evidence_updated_at
before update on public.evidence
for each row
execute function public.set_updated_at();

-- 10. Indexes
create index if not exists sources_created_by_idx on public.sources (created_by);
create index if not exists evidence_source_id_idx on public.evidence (source_id);
create index if not exists evidence_created_by_idx on public.evidence (created_by);
create index if not exists claim_evidence_claim_id_idx on public.claim_evidence (claim_id);
create index if not exists claim_evidence_evidence_id_idx on public.claim_evidence (evidence_id);

-- 11. Row Level Security (RLS)
alter table public.sources enable row level security;
alter table public.evidence enable row level security;
alter table public.claim_evidence enable row level security;

-- Revoke raw SELECT access on all three tables from public roles
revoke select on public.sources from anon, authenticated;
revoke select on public.evidence from anon, authenticated;
revoke select on public.claim_evidence from anon, authenticated;

-- Insert policies for authenticated users
drop policy if exists "Authenticated users can create sources" on public.sources;
create policy "Authenticated users can create sources"
on public.sources
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can assert evidence" on public.evidence;
create policy "Authenticated users can assert evidence"
on public.evidence
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can link claim evidence" on public.claim_evidence;
create policy "Authenticated users can link claim evidence"
on public.claim_evidence
for insert
to authenticated
with check (
  exists (
    select 1 from public.claims
    where claims.id = claim_id
  )
);

-- Update (retraction) policies for creators
drop policy if exists "Creators can retract their sources" on public.sources;
create policy "Creators can retract their sources"
on public.sources
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Creators can retract their evidence" on public.evidence;
create policy "Creators can retract their evidence"
on public.evidence
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 12. Security Definer View for evidence to handle anonymous redaction and joins
create or replace view public.discussion_evidence
with (security_invoker = false)
as
select
  e.id,
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
  s.is_retracted as source_is_retracted
from public.evidence e
join public.claim_evidence ce on e.id = ce.evidence_id
left join public.sources s on e.source_id = s.id
left join public.profiles p on e.created_by = p.id
where exists (
  select 1 from public.claims c
  where c.id = ce.claim_id
    and exists (
      select 1 from public.rooms r
      where r.id = c.room_id
        and (
          (r.visibility = 'public' and r.status <> 'archived')
          or r.created_by = auth.uid()
        )
    )
);

-- Grant select on view to public roles
grant select on public.discussion_evidence to anon, authenticated;
