-- Migration: create user_reputation_snapshots table
-- Tracks historical reputation scores for users.
-- Never destroys historical data; only inserts new snapshots.

create table if not exists public.user_reputation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null default 0,
  expertise jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by user
create index if not exists idx_reputation_snapshots_user_id
  on public.user_reputation_snapshots(user_id, created_at desc);

-- Row Level Security
alter table public.user_reputation_snapshots enable row level security;

-- Only the user can see their own reputation history
create policy "Users can view their own reputation snapshots"
  on public.user_reputation_snapshots
  for select
  using (user_id = auth.uid());

-- Only the user can insert their own reputation snapshots
create policy "Users can insert their own reputation snapshots"
  on public.user_reputation_snapshots
  for insert
  with check (user_id = auth.uid());

-- Snapshots are immutable once created (no update/delete policies)
