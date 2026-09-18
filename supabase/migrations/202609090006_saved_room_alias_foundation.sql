-- Phase 7D Phase A: Saved-Room Alias Foundation
-- Extends user_saves with private personalized alias per user per saved room
-- Alias belongs to one user, applies only to that user's saved room, is private,
-- does not change canonical room title, does not affect other users, RLS protected.

-- 1. Add alias column to user_saves
alter table public.user_saves
add column if not exists alias text;

-- Optional: length constraint for alias
-- Not enforcing NOT NULL since alias is optional

-- 2. Index for alias lookups (if needed)
create index if not exists user_saves_alias_idx on public.user_saves (alias) where alias is not null;

-- 3. Update RLS policies to include alias in user's own saves view
-- The existing policies already restrict to user_id = auth.uid(), so alias is automatically protected

-- 4. RPC: Update saved room alias (owner only)
create or replace function public.update_saved_room_alias(
  p_target_type text,
  p_target_id uuid,
  p_alias text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_max_length integer := 50;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_target_type not in ('discussion', 'debate', 'claim', 'evidence') then
    raise exception 'invalid_target_type';
  end if;

  if p_alias is not null and char_length(p_alias) > v_max_length then
    raise exception 'alias_too_long' using hint = 'Alias must be 50 characters or less.';
  end if;

  update public.user_saves
  set alias = p_alias
  where user_id = v_user_id
    and target_type = p_target_type
    and target_id = p_target_id;

  if not found then
    raise exception 'save_not_found' using hint = 'Saved item not found.';
  end if;
end;
$$;

revoke execute on function public.update_saved_room_alias(text, uuid, text) from public, anon;
grant execute on function public.update_saved_room_alias(text, uuid, text) to authenticated;

-- 5. RPC: Get user's saves with aliases (for Saved page)
create or replace function public.get_user_saves_with_aliases()
returns table (
  id uuid,
  target_type text,
  target_id uuid,
  alias text,
  created_at timestamptz,
  room_title text,
  room_slug text,
  room_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  return query
  select
    us.id,
    us.target_type,
    us.target_id,
    us.alias,
    us.created_at,
    r.title as room_title,
    r.slug as room_slug,
    r.room_type
  from public.user_saves us
  join public.rooms r on (
    (us.target_type = 'discussion' and r.id = (select id from public.discussions where id = us.target_id))
    or (us.target_type = 'debate' and r.id = (select id from public.debates where id = us.target_id))
    or (us.target_type = 'claim' and r.id = (select room_id from public.claims where id = us.target_id))
    or (us.target_type = 'evidence' and r.id = (select room_id from public.evidence where id = us.target_id))
  )
  where us.user_id = v_user_id
    and public.has_room_access(r.id)
  order by us.created_at desc;
end;
$$;

revoke execute on function public.get_user_saves_with_aliases() from public, anon;
grant execute on function public.get_user_saves_with_aliases() to authenticated;