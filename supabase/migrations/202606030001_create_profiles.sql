-- Sprint 3: User identity foundation.
-- Creates the application-owned public profile table and profile-only RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  bio text,
  avatar_url text,
  default_identity_mode text not null default 'public',
  last_username_change timestamptz,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format_check
    check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 500),
  constraint profiles_default_identity_mode_check
    check (default_identity_mode in ('public', 'anonymous'))
);

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username));

create index if not exists profiles_id_idx
  on public.profiles (id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.enforce_profile_username_rules()
returns trigger
language plpgsql
as $$
begin
  new.username = lower(new.username);

  if tg_op = 'INSERT' then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'Profile id cannot be changed.';
  end if;

  new.joined_at = old.joined_at;
  new.created_at = old.created_at;

  if new.username <> old.username then
    if old.last_username_change is not null and old.last_username_change > now() - interval '30 days' then
      raise exception 'Username can only be changed once every 30 days.';
    end if;

    new.last_username_change = now();
  else
    new.last_username_change = old.last_username_change;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_username_rules on public.profiles;

create trigger enforce_profile_username_rules
before insert or update on public.profiles
for each row
execute function public.enforce_profile_username_rules();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

comment on table public.profiles is
  'Application-owned public identity records linked one-to-one to auth.users.';

comment on column public.profiles.default_identity_mode is
  'Future participation preference only. Does not implement anonymous posting.';
