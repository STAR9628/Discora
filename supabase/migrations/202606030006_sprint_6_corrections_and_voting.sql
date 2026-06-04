-- Sprint 6 Phase 3: Corrections & Voting (claim_votes, evidence_votes)

-- 1. Apply Schema Corrections: Add room_id to sources and evidence

-- Drop views first to avoid dependency errors when changing tables
drop view if exists public.discussion_evidence;
drop view if exists public.discussion_claims;

-- Sources corrections
alter table public.sources drop constraint if exists sources_url_key;
alter table public.sources add column if not exists room_id uuid references public.rooms (id) on delete cascade;

-- If there are any existing sources, assign them to a default room or handle it.
-- Since this is local dev/testing, we can safely alter it to not null.
alter table public.sources alter column room_id set not null;

-- Add room-scoped unique constraint for URL
alter table public.sources add constraint sources_room_url_unique unique (room_id, url);

-- Evidence corrections
alter table public.evidence add column if not exists room_id uuid references public.rooms (id) on delete cascade;
alter table public.evidence alter column room_id set not null;

-- 2. Validate claim.room_id = evidence.room_id inside database triggers (on public.claim_evidence)
create or replace function public.validate_claim_evidence_rooms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c_room_id uuid;
  e_room_id uuid;
begin
  select room_id into c_room_id from public.claims where id = new.claim_id;
  select room_id into e_room_id from public.evidence where id = new.evidence_id;

  if c_room_id is null then
    raise exception 'Claim not found.';
  end if;
  if e_room_id is null then
    raise exception 'Evidence not found.';
  end if;

  if c_room_id <> e_room_id then
    raise exception 'Claim and Evidence must belong to the same room.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_claim_evidence_rooms on public.claim_evidence;
create trigger validate_claim_evidence_rooms
before insert or update on public.claim_evidence
for each row
execute function public.validate_claim_evidence_rooms();

-- Also validate source.room_id = evidence.room_id
create or replace function public.validate_evidence_source_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s_room_id uuid;
begin
  select room_id into s_room_id from public.sources where id = new.source_id;
  if s_room_id is null then
    raise exception 'Source not found.';
  end if;
  if new.room_id <> s_room_id then
    raise exception 'Evidence and Source must belong to the same room.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_evidence_source_room on public.evidence;
create trigger validate_evidence_source_room
before insert or update on public.evidence
for each row
execute function public.validate_evidence_source_room();

-- Make room_id immutable on evidence
create or replace function public.enforce_evidence_immutability_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
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
execute function public.enforce_evidence_immutability_v2();

-- Make room_id immutable on sources
create or replace function public.enforce_source_immutability_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
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
execute function public.enforce_source_immutability_v2();


-- 3. Create public.claim_votes table
create table if not exists public.claim_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  vote_type text not null check (vote_type in ('agree', 'disagree')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_votes_user_claim_unique unique (user_id, claim_id)
);

-- 4. Create public.evidence_votes table
create table if not exists public.evidence_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  vote_type text not null check (vote_type in ('agree', 'disagree')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_votes_user_evidence_unique unique (user_id, evidence_id)
);

-- 5. Indexing for votes and room scoping
create index if not exists claim_votes_claim_id_vote_type_idx on public.claim_votes (claim_id, vote_type);
create index if not exists evidence_votes_evidence_id_vote_type_idx on public.evidence_votes (evidence_id, vote_type);
create index if not exists sources_room_id_idx on public.sources (room_id);
create index if not exists evidence_room_id_idx on public.evidence (room_id);

-- 6. Trigger to set user_id on INSERT and set updated_at on UPDATE
create or replace function public.handle_vote_insert_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_claim_vote_metadata on public.claim_votes;
create trigger set_claim_vote_metadata
before insert on public.claim_votes
for each row
execute function public.handle_vote_insert_metadata();

drop trigger if exists set_evidence_vote_metadata on public.evidence_votes;
create trigger set_evidence_vote_metadata
before insert on public.evidence_votes
for each row
execute function public.handle_vote_insert_metadata();

drop trigger if exists set_claim_votes_updated_at on public.claim_votes;
create trigger set_claim_votes_updated_at
before update on public.claim_votes
for each row
execute function public.set_updated_at();

drop trigger if exists set_evidence_votes_updated_at on public.evidence_votes;
create trigger set_evidence_votes_updated_at
before update on public.evidence_votes
for each row
execute function public.set_updated_at();

-- 7. Enable RLS on votes
alter table public.claim_votes enable row level security;
alter table public.evidence_votes enable row level security;

-- Revoke raw SELECT access on votes from public roles
revoke select on public.claim_votes from anon, authenticated;
revoke select on public.evidence_votes from anon, authenticated;

-- Insert/Update/Delete policies for authenticated users
drop policy if exists "Authenticated users can vote on claims" on public.claim_votes;
create policy "Authenticated users can vote on claims"
on public.claim_votes
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Authenticated users can vote on evidence" on public.evidence_votes;
create policy "Authenticated users can vote on evidence"
on public.evidence_votes
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- RLS policies updates for sources and evidence (restrict insert to verified rooms)
drop policy if exists "Authenticated users can create sources" on public.sources;
create policy "Authenticated users can create sources"
on public.sources
for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = room_id
  )
);

drop policy if exists "Authenticated users can assert evidence" on public.evidence;
create policy "Authenticated users can assert evidence"
on public.evidence
for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = room_id
  )
);


-- 8. Dynamic Views for Claims and Evidence (with Vote Aggregation)

-- View: public.discussion_claims
create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
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

-- View: public.discussion_evidence
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
where exists (
  select 1 from public.rooms r
  where r.id = e.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

-- Grant select on views to public roles
grant select on public.discussion_claims to anon, authenticated;
grant select on public.discussion_evidence to anon, authenticated;
