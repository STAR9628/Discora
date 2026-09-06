-- Phase 5D: Create user_saves table for private Save/Bookmark feature
--
-- Security model:
-- - Users can only CRUD their own saves
-- - No anonymous access
-- - No public enumeration
-- - Private content filtered at query time via has_room_access()
-- - Application layer enforces access checks before insert

create table if not exists public.user_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('discussion', 'debate', 'claim', 'evidence')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint user_saves_user_target_unique unique (user_id, target_type, target_id)
);

-- Indexes
create index if not exists user_saves_user_created_idx on public.user_saves(user_id, created_at desc);
create index if not exists user_saves_target_idx on public.user_saves(target_type, target_id);

-- RLS
alter table public.user_saves enable row level security;

drop policy if exists "Users can view own saves" on public.user_saves;
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own saves" on public.user_saves;
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own saves" on public.user_saves;
create policy "Users can delete own saves"
  on public.user_saves
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No anon access
-- No public access
