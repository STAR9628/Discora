-- Sprint 4: Discussions Core Features (Revised 2)
-- Initialize topics, rooms, discussions, and messages database schema, triggers, RLS policies, and views.

-- 1. Helper function to slugify text
create or replace function public.slugify(value text)
returns text
language plpgsql
immutable
as $$
declare
  l_val text;
begin
  l_val := lower(value);
  -- Replace all non-alphanumeric characters with hyphens
  l_val := regexp_replace(l_val, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  l_val := regexp_replace(l_val, '^-+|-+$', '', 'g');
  return l_val;
end;
$$;

-- 2. Topics Table
-- Note: Topic creation is restricted to the platform seeding migration. Standard users cannot create topics.
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text not null,
  created_by uuid references auth.users (id) on delete set null,
  is_platform_topic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_name_unique unique (name),
  constraint topics_slug_unique unique (slug)
);

-- 3. Rooms Table
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null,
  room_type text not null,
  created_by uuid references auth.users (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  visibility text not null default 'public',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_slug_unique unique (slug),
  constraint rooms_room_type_check check (room_type in ('discussion', 'debate', 'private')),
  constraint rooms_visibility_check check (visibility in ('public', 'private')),
  constraint rooms_status_check check (status in ('open', 'inactive', 'archived'))
);

-- 4. Discussions Table
create table if not exists public.discussions (
  id uuid primary key references public.rooms (id) on delete cascade,
  opening_statement text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussions_opening_statement_length_check check (char_length(opening_statement) >= 100)
);

-- 5. Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  parent_message_id uuid references public.messages (id) on delete cascade,
  content text not null,
  identity_mode text not null default 'public',
  message_type text not null default 'message',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_identity_mode_check check (identity_mode in ('public', 'anonymous')),
  constraint messages_message_type_check check (message_type in ('message', 'question')),
  constraint messages_content_length_check check (char_length(content) between 1 and 2000)
);

-- 6. Trigger to auto-slugify topics and rooms
create or replace function public.auto_slugify_trigger()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  test_slug text;
  counter int := 1;
  exists_count int;
begin
  if new.slug is null or new.slug = '' then
    if tg_table_name = 'rooms' then
      base_slug := public.slugify(new.title);
    else
      base_slug := public.slugify(new.name);
    end if;
    
    test_slug := base_slug;
    
    loop
      if tg_table_name = 'rooms' then
        select count(*) into exists_count from public.rooms where slug = test_slug;
      else
        select count(*) into exists_count from public.topics where slug = test_slug;
      end if;
      
      exit when exists_count = 0;
      
      test_slug := base_slug || '-' || counter;
      counter := counter + 1;
    end loop;
    
    new.slug := test_slug;
  end if;
  
  return new;
end;
$$;

drop trigger if exists auto_slugify_rooms on public.rooms;
create trigger auto_slugify_rooms
before insert on public.rooms
for each row
execute function public.auto_slugify_trigger();

drop trigger if exists auto_slugify_topics on public.topics;
create trigger auto_slugify_topics
before insert on public.topics
for each row
execute function public.auto_slugify_trigger();

-- 7. Trigger to enforce user_id constraints on message post
create or replace function public.handle_message_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists handle_message_identity_mode on public.messages;
create trigger handle_message_identity_mode
before insert or update on public.messages
for each row
execute function public.handle_message_identity_mode();

-- 8. Trigger to enforce 5-minute message edit window and immutability
create or replace function public.enforce_message_edit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Enforce 5-minute edit window
  if old.created_at < now() - interval '5 minutes' then
    raise exception 'Messages can only be edited within 5 minutes of creation.';
  end if;

  -- Prevent modifying immutable fields
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be modified.';
  end if;
  if new.room_id is distinct from old.room_id then
    raise exception 'room_id cannot be modified.';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be modified.';
  end if;
  if new.identity_mode is distinct from old.identity_mode then
    raise exception 'identity_mode cannot be modified.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_edit_rules on public.messages;
create trigger enforce_message_edit_rules
before update on public.messages
for each row
execute function public.enforce_message_edit_rules();

-- 9. Updated at trigger helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

drop trigger if exists set_discussions_updated_at on public.discussions;
create trigger set_discussions_updated_at
before update on public.discussions
for each row
execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

-- 10. Database indexes for lookup performance
create index if not exists topics_slug_idx on public.topics (slug);
create index if not exists rooms_slug_idx on public.rooms (slug);
create index if not exists messages_room_id_idx on public.messages (room_id);
create index if not exists messages_parent_message_id_idx on public.messages (parent_message_id);

-- 11. Enable Row Level Security (RLS)
alter table public.topics enable row level security;
alter table public.rooms enable row level security;
alter table public.discussions enable row level security;
alter table public.messages enable row level security;

-- 12. RLS Policies
-- Topics Policies
drop policy if exists "Topics are publicly readable" on public.topics;
create policy "Topics are publicly readable"
on public.topics
for select
using (true);

-- Rooms Policies
-- Note: Room select policy explicitly filters out archived rooms for public reads.
drop policy if exists "Rooms are readable by everyone" on public.rooms;
create policy "Rooms are readable by everyone"
on public.rooms
for select
using (visibility = 'public' and status <> 'archived');

drop policy if exists "Private rooms are readable by creator" on public.rooms;
create policy "Private rooms are readable by creator"
on public.rooms
for select
using (created_by = auth.uid());

drop policy if exists "Authenticated users can create rooms" on public.rooms;
create policy "Authenticated users can create rooms"
on public.rooms
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Room creators can update their rooms" on public.rooms;
create policy "Room creators can update their rooms"
on public.rooms
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Discussions Policies
drop policy if exists "Discussions are readable by everyone" on public.discussions;
create policy "Discussions are readable by everyone"
on public.discussions
for select
using (true);

drop policy if exists "Authenticated users can create discussions" on public.discussions;
create policy "Authenticated users can create discussions"
on public.discussions
for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = discussions.id
      and rooms.created_by = auth.uid()
  )
);

drop policy if exists "Discussion creators can update discussions" on public.discussions;
create policy "Discussion creators can update discussions"
on public.discussions
for update
to authenticated
using (
  exists (
    select 1 from public.rooms
    where rooms.id = discussions.id
      and rooms.created_by = auth.uid()
  )
);

-- Messages Policies
-- Note: Direct SELECT RLS policy on raw messages is completely omitted, keeping raw table SELECT private.
-- INSERT check simplifies validation by relying on the trigger to assign ownership (auth.uid()).
drop policy if exists "Authenticated users can post messages" on public.messages;
create policy "Authenticated users can post messages"
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = room_id
  )
);

drop policy if exists "Authors can edit their messages" on public.messages;
create policy "Authors can edit their messages"
on public.messages
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Exclude raw messages from SELECT privileges entirely for public roles, keeping it private.
revoke select on public.messages from anon, authenticated;

-- 13. Dynamic Anonymization View (Runs as SECURITY DEFINER to bypass table SELECT restrictions safely)
-- Note: Room status <> 'archived' check is replicated here to secure archived message history.
create or replace view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  m.content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.messages m
left join public.profiles p on m.user_id = p.id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

-- Grant select on the view to public roles
grant select on public.discussion_messages to anon, authenticated;

-- 14. Seed Standard Platform Topics
insert into public.topics (name, description, slug, is_platform_topic)
values
  ('General', 'General discussions on any topic.', 'general', true),
  ('Technology', 'Discussions about software, hardware, and tech trends.', 'technology', true),
  ('Science', 'Scientific discoveries, theories, and phenomena.', 'science', true),
  ('Politics', 'Political systems, policy, elections, and government.', 'politics', true),
  ('Philosophy', 'Philosophical questions, ethics, logic, and existentialism.', 'philosophy', true),
  ('History', 'Historical events, eras, figures, and research.', 'history', true),
  ('Economics', 'Economic models, markets, trade, and finance.', 'economics', true),
  ('Culture', 'Art, literature, music, traditions, and societal trends.', 'culture', true),
  ('Education', 'Teaching, learning, school systems, and educational methods.', 'education', true),
  ('Ethics', 'Moral philosophy, ethical dilemmas, and values.', 'ethics', true)
on conflict (name) do update
set
  description = excluded.description,
  slug = excluded.slug,
  is_platform_topic = excluded.is_platform_topic;

-- 15. RPC Function to create a discussion room atomically
create or replace function public.create_discussion_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_opening_statement text,
  p_summary text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  -- Insert room
  insert into public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
  values (p_title, p_description, 'discussion', p_topic_id, 'public', 'open', auth.uid())
  returning id into v_room_id;

  -- Insert discussion metadata
  insert into public.discussions (id, opening_statement, summary)
  values (v_room_id, p_opening_statement, p_summary);

  return v_room_id;
end;
$$;

-- Grant execute privilege on the function to authenticated role only
grant execute on function public.create_discussion_room(text, text, uuid, text, text) to authenticated;
