-- Phase 7D Phase A: Reactions Foundation
-- Minimal reaction infrastructure for messages, claims, evidence, arguments
-- Per-user per-target uniqueness, room authorization, safe aggregation
-- No epistemic side effects (not agreement/disagreement, not voting, not credibility)
--
-- REVISION (R7, Phase F readiness gate): this file was an unapplied working-tree
-- draft (never committed, absent from the reachable database, referenced by no
-- deploy script). Read/insert policies and reaction_aggregates now gate on
-- has_room_access() instead of inline public-or-creator checks
-- (private-debate participants included, outsiders excluded). Nothing else changed.

-- 1. Create reactions table (polymorphic target)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null constraint reactions_target_type_check check (
    target_type in ('message', 'claim', 'evidence', 'argument')
  ),
  target_id uuid not null,
  reaction_type text not null constraint reactions_reaction_type_check check (
    reaction_type in ('like', 'insightful', 'curious')
  ),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reactions_unique_user_target unique (user_id, target_type, target_id, reaction_type)
);

-- 2. Indexes
create index if not exists reactions_user_id_idx on public.reactions (user_id);
create index if not exists reactions_target_idx on public.reactions (target_type, target_id);
create index if not exists reactions_room_id_idx on public.reactions (room_id);
create index if not exists reactions_created_at_idx on public.reactions (created_at);

-- 3. Trigger to set user_id and room_id on INSERT
create or replace function public.handle_reaction_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  new.user_id := auth.uid();

  -- Resolve room_id from target
  case new.target_type
    when 'message' then
      select room_id into v_room_id from public.messages where id = new.target_id;
    when 'claim' then
      select room_id into v_room_id from public.claims where id = new.target_id;
    when 'evidence' then
      select room_id into v_room_id from public.evidence where id = new.target_id;
    when 'argument' then
      select room_id into v_room_id from public.arguments where id = new.target_id;
    else
      raise exception 'invalid_target_type';
  end case;

  if v_room_id is null then
    raise exception 'target_not_found' using hint = 'Target entity not found.';
  end if;

  new.room_id := v_room_id;
  return new;
end;
$$;

drop trigger if exists handle_reaction_insert on public.reactions;
create trigger handle_reaction_insert
before insert on public.reactions
for each row
execute function public.handle_reaction_insert();

-- 4. Enable RLS
alter table public.reactions enable row level security;

-- 5. RLS Policies
-- Users can read reactions in accessible rooms
drop policy if exists "Reactions are readable in accessible rooms" on public.reactions;
-- R7: authoritative room authorization (public non-archived, owner, ACTIVE
-- debate participants) so private-debate participants can react where they
-- are authorized. Outsiders stay excluded (fail-closed).
create policy "Reactions are readable in accessible rooms"
on public.reactions
for select
to authenticated
using (public.has_room_access(room_id));

-- Authenticated users can create reactions in accessible rooms
drop policy if exists "Authenticated users can create reactions" on public.reactions;
create policy "Authenticated users can create reactions"
on public.reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_room_access(room_id)
  -- Archived rooms stay frozen for writes, owners included (preserves the
  -- original status semantics; has_room_access alone admits owners/participants
  -- regardless of status).
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.status <> 'archived'
  )
);

-- Users can delete their own reactions
drop policy if exists "Users can delete their own reactions" on public.reactions;
create policy "Users can delete their own reactions"
on public.reactions
for delete
to authenticated
using (user_id = auth.uid());

-- 6. Aggregation view for reaction counts per target
create or replace view public.reaction_aggregates
with (security_invoker = false)
as
select
  target_type,
  target_id,
  reaction_type,
  count(*) as count,
  bool_or(user_id = auth.uid()) as user_has_reacted
from public.reactions
-- R7: authoritative room authorization (see policy note above).
where public.has_room_access(room_id)
group by target_type, target_id, reaction_type;

grant select on public.reaction_aggregates to anon, authenticated;

-- 7. RPC: Toggle reaction (upsert/delete)
create or replace function public.toggle_reaction(
  p_target_type text,
  p_target_id uuid,
  p_reaction_type text
) returns boolean -- true = added, false = removed
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_target_type not in ('message', 'claim', 'evidence', 'argument') then
    raise exception 'invalid_target_type';
  end if;

  if p_reaction_type not in ('like', 'insightful', 'curious') then
    raise exception 'invalid_reaction_type';
  end if;

  -- Verify target exists and get room_id
  case p_target_type
    when 'message' then
      select room_id into v_room_id from public.messages where id = p_target_id;
    when 'claim' then
      select room_id into v_room_id from public.claims where id = p_target_id;
    when 'evidence' then
      select room_id into v_room_id from public.evidence where id = p_target_id;
    when 'argument' then
      select room_id into v_room_id from public.arguments where id = p_target_id;
  end case;

  if v_room_id is null then
    raise exception 'target_not_found' using hint = 'Target entity not found.';
  end if;

  -- Verify room access: authoritative has_room_access() (public non-archived,
  -- owner, ACTIVE debate participants) plus an explicit archived guard so
  -- archived rooms stay frozen for everyone, owners included (preserves the
  -- original status semantics while admitting private-debate participants).
  -- R7: a bare public-or-creator check here would reject participants that the
  -- aligned view/policy now serve.
  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room not accessible.';
  end if;

  -- Check if reaction exists
  select exists(
    select 1 from public.reactions
    where user_id = v_user_id
      and target_type = p_target_type
      and target_id = p_target_id
      and reaction_type = p_reaction_type
  ) into v_exists;

  if v_exists then
    -- Remove reaction
    delete from public.reactions
    where user_id = v_user_id
      and target_type = p_target_type
      and target_id = p_target_id
      and reaction_type = p_reaction_type;
    return false;
  else
    -- Add reaction
    insert into public.reactions (user_id, target_type, target_id, reaction_type, room_id)
    values (v_user_id, p_target_type, p_target_id, p_reaction_type, v_room_id);
    return true;
  end if;
end;
$$;

revoke execute on function public.toggle_reaction(text, uuid, text) from public, anon;
grant execute on function public.toggle_reaction(text, uuid, text) to authenticated;

-- 8. RPC: Get reaction aggregates for multiple targets (batch query for feed rendering)
create or replace function public.get_reaction_aggregates(
  p_targets jsonb -- array of {target_type, target_id} objects
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- This function can be expanded for batch queries
  -- For now, return empty object; UI can use the view for individual targets
  return '{}'::jsonb;
end;
$$;

revoke execute on function public.get_reaction_aggregates(jsonb) from public, anon;
grant execute on function public.get_reaction_aggregates(jsonb) to authenticated;