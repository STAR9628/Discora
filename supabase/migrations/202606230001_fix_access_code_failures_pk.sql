-- Phase 4B: Fix access_code_failures rate limiting
--
-- The access_code_failures table was created in a prior Phase 4B migration
-- attempt without a primary key. The current CREATE TABLE IF NOT EXISTS
-- does not repair an existing table, so ON CONFLICT never matches and
-- rate limiting silently does not increment.

drop table if exists public.access_code_failures;

create table public.access_code_failures (
  room_id uuid not null,
  user_id uuid not null,
  failures integer not null default 0,
  last_failure timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.access_code_failures enable row level security;

revoke all on public.access_code_failures from public, anon, authenticated;
