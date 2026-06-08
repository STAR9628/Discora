-- Sprint 13: Claim Relationships
-- Creates claim_relations table for building a connected reasoning network.

-- 1. Create public.claim_relations table
create table if not exists public.claim_relations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  source_claim_id uuid not null references public.claims (id) on delete cascade,
  target_claim_id uuid not null references public.claims (id) on delete cascade,
  relation_type text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint claim_relations_type_check check (relation_type in ('supports', 'contradicts', 'refines')),
  constraint claim_relations_no_self_check check (source_claim_id <> target_claim_id),
  constraint claim_relations_unique_pair unique (source_claim_id, target_claim_id, relation_type)
);

-- 2. Indexes for efficient querying
create index if not exists claim_relations_room_id_idx on public.claim_relations (room_id);
create index if not exists claim_relations_source_idx on public.claim_relations (source_claim_id);
create index if not exists claim_relations_target_idx on public.claim_relations (target_claim_id);
create index if not exists claim_relations_created_by_idx on public.claim_relations (created_by);

-- 3. Trigger to set created_by on INSERT
create or replace function public.handle_claim_relation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();

  -- Validate both claims belong to the same room as the relation
  if not exists (
    select 1 from public.claims
    where id = new.source_claim_id and room_id = new.room_id
  ) then
    raise exception 'source_claim_id must belong to the same room.';
  end if;

  if not exists (
    select 1 from public.claims
    where id = new.target_claim_id and room_id = new.room_id
  ) then
    raise exception 'target_claim_id must belong to the same room.';
  end if;

  return new;
end;
$$;

drop trigger if exists handle_claim_relation_insert on public.claim_relations;
create trigger handle_claim_relation_insert
before insert on public.claim_relations
for each row
execute function public.handle_claim_relation_insert();

-- 4. Immutability trigger: block all updates
create or replace function public.enforce_claim_relation_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Claim relations are immutable. Delete and recreate instead.';
end;
$$;

drop trigger if exists enforce_claim_relation_immutability on public.claim_relations;
create trigger enforce_claim_relation_immutability
before update on public.claim_relations
for each row
execute function public.enforce_claim_relation_immutability();

-- 5. Soft-delete safety: prevent direct deletion by non-owners (RLS handles this, but trigger as extra layer)
-- We allow deletion only for the creator via RLS, so no trigger block needed.

-- 6. Enable RLS
alter table public.claim_relations enable row level security;

-- 7. RLS policies
drop policy if exists "Users can view claim relations" on public.claim_relations;
create policy "Users can view claim relations"
on public.claim_relations
for select
to authenticated
using (
  exists (
    select 1 from public.rooms
    where rooms.id = room_id
      and (
        (rooms.visibility = 'public' and rooms.status <> 'archived')
        or rooms.created_by = auth.uid()
      )
  )
);

drop policy if exists "Authenticated users can create claim relations" on public.claim_relations;
create policy "Authenticated users can create claim relations"
on public.claim_relations
for insert
to authenticated
with check (true);

drop policy if exists "Creators can delete their own claim relations" on public.claim_relations;
create policy "Creators can delete their own claim relations"
on public.claim_relations
for delete
to authenticated
using (created_by = auth.uid());

-- 8. Create a view with joined claim content for the client
create or replace view public.discussion_claim_relations
with (security_invoker = false)
as
select
  cr.id,
  cr.room_id,
  cr.source_claim_id,
  cr.target_claim_id,
  cr.relation_type,
  cr.created_by,
  cr.created_at,
  sc.content as source_claim_content,
  sc.claim_type as source_claim_type,
  tc.content as target_claim_content,
  tc.claim_type as target_claim_type
from public.claim_relations cr
join public.claims sc on sc.id = cr.source_claim_id
join public.claims tc on tc.id = cr.target_claim_id
where exists (
  select 1 from public.rooms r
  where r.id = cr.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_claim_relations to anon, authenticated;

-- 9. Grant access on base table
grant select, insert, delete on public.claim_relations to authenticated;
