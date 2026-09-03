-- Sprint 3: Settings MVP.
-- Adds display_name to profiles, creates user_preferences table for privacy toggles.

-- Add display_name to profiles
alter table public.profiles add column if not exists display_name text;

-- Create user_preferences table
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  show_reputation boolean not null default true,
  show_expertise boolean not null default true,
  show_side_switches boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on user_preferences
create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

-- Create a row on signup so preferences always exist
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_preferences on auth.users;

create trigger on_auth_user_created_preferences
after insert on auth.users
for each row
execute function public.handle_new_user_preferences();

-- Ensure preferences row exists for existing users
insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- RLS on user_preferences
alter table public.user_preferences enable row level security;

drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- RPC to read any user's preferences (security definer — used by profile page server component)
create or replace function public.get_user_preferences(p_user_id uuid)
returns table (
  show_reputation boolean,
  show_expertise boolean,
  show_side_switches boolean
)
language sql
stable
security definer
as $$
  select up.show_reputation, up.show_expertise, up.show_side_switches
  from public.user_preferences up
  where up.user_id = p_user_id;
$$;

-- RPC to get a user's own moderation flags (for safety/report history page)
create or replace function public.get_my_moderation_flags()
returns table (
  id uuid,
  reason text,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
as $$
  select mf.id, mf.reason, mf.status, mf.created_at, mf.resolved_at
  from public.moderation_flags mf
  where mf.reporter_id = auth.uid()
  order by mf.created_at desc;
$$;

comment on table public.user_preferences is
  'User privacy and preference settings. One row per user, created on signup.';
