-- Phase 7D Phase A: Discussion Arguments Foundation
-- New entity for reasoning connecting information/premises to a position regarding a Claim
-- Distinct from Debate side-claims and from claim_relations (which is a relation graph)
-- V1: one primary Claim, supporting/challenging relationship, author ownership, room scope
--
-- REVISION (R4, Phase F readiness gate): this file was an unapplied working-tree
-- draft (never committed, absent from the reachable database, referenced by no
-- deploy script). enforce_argument_immutability() now permits the single
-- legitimate tombstone transition; otherwise the soft-delete path could never
-- succeed. Argument deletion invocation remains DORMANT (no DELETE RLS policy,
-- no delete RPC in this set); see the note above argument_delete_with_lock.

-- 1. Create arguments table
create table if not exists public.arguments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  claim_id uuid not null references public.claims (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  content text not null constraint arguments_content_length check (char_length(content) between 50 and 5000),
  stance text not null constraint arguments_stance_check check (stance in ('supporting', 'challenging')),
  identity_mode text not null default 'public' constraint arguments_identity_mode_check check (identity_mode in ('public', 'anonymous')),
  is_retracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists arguments_room_id_idx on public.arguments (room_id);
create index if not exists arguments_claim_id_idx on public.arguments (claim_id);
create index if not exists arguments_created_by_idx on public.arguments (created_by);
create index if not exists arguments_stance_idx on public.arguments (stance);

-- 3. Trigger to set created_by on INSERT and validate claim room match
create or replace function public.handle_argument_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_room_id uuid;
begin
  new.created_by := auth.uid();

  -- Validate claim belongs to the same room
  select room_id into v_claim_room_id from public.claims where id = new.claim_id;
  if v_claim_room_id is null then
    raise exception 'claim_not_found' using hint = 'Claim not found.';
  end if;
  if v_claim_room_id <> new.room_id then
    raise exception 'room_mismatch' using hint = 'Argument must be in the same room as its claim.';
  end if;

  return new;
end;
$$;

drop trigger if exists handle_argument_insert on public.arguments;
create trigger handle_argument_insert
before insert on public.arguments
for each row
execute function public.handle_argument_insert();

-- 4. Immutability trigger (similar to claims/evidence - only retraction allowed,
-- plus the single legitimate tombstone transition for argument_delete_with_lock).
-- R4: without this exemption the soft-delete UPDATE (content/is_retracted change)
-- would always raise 'Arguments are immutable'. Exactly one mutation shape is
-- permitted, one-way; no broad bypass exists.
create or replace function public.enforce_argument_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Legitimate one-time tombstone transition: permit exactly this shape.
  if old.deleted_at is null
     and new.deleted_at is not null
     and new.content = '[This argument has been deleted]'
     and new.is_retracted = true
     and new.id is not distinct from old.id
     and new.room_id is not distinct from old.room_id
     and new.claim_id is not distinct from old.claim_id
     and new.created_by is not distinct from old.created_by
     and new.stance is not distinct from old.stance
     and new.identity_mode is not distinct from old.identity_mode
     and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  -- Prevent modifying any field other than is_retracted and updated_at
  if new.id is distinct from old.id or
      new.room_id is distinct from old.room_id or
      new.claim_id is distinct from old.claim_id or
      new.created_by is distinct from old.created_by or
      new.content is distinct from old.content or
      new.stance is distinct from old.stance or
      new.identity_mode is distinct from old.identity_mode or
      new.created_at is distinct from old.created_at then
    raise exception 'Arguments are immutable. Only retraction is permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Arguments cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_argument_immutability on public.arguments;
create trigger enforce_argument_immutability
before update on public.arguments
for each row
execute function public.enforce_argument_immutability();

-- 5. Soft-delete for arguments (consistent with claims deletion-lock pattern)
-- Tombstone is applied via argument_delete_with_lock below (single ordered trigger).
--
-- DORMANT INVOCATION (R4): there is intentionally NO DELETE RLS policy on
-- public.arguments and NO delete_argument RPC in this migration set, so the
-- trigger below is unreachable via PostgREST. Do NOT present argument deletion
-- as shippable. A later phase must add a delete_argument(uuid) SECURITY
-- DEFINER RPC (author + lock + room checks) before any delete UI is built.
alter table public.arguments
add column if not exists deleted_at timestamptz;
alter table public.arguments
add column if not exists deleted_by uuid references auth.users (id) on delete set null;

-- Legacy lock helper retained for reference; the ordered
-- argument_delete_with_lock trigger below is the active deletion path.

create or replace function public.enforce_argument_deletion_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_minutes integer;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  -- Author-only check
  if old.created_by is distinct from v_user_id then
    raise exception 'not_author' using hint = 'Only the argument author can delete this argument.';
  end if;

  -- Fetch lock duration from config (reuse claim config for consistency)
  select lock_duration_minutes into v_lock_minutes
  from public.claim_deletion_config
  where id = true;

  -- Enforce time lock
  if old.created_at > now() - (v_lock_minutes || ' minutes')::interval then
    raise exception 'deletion_locked' using hint = 'Arguments cannot be deleted within the first ' || v_lock_minutes || ' minutes.';
  end if;

  return old;
end;
$$;

create or replace function public.argument_delete_with_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_minutes integer;
begin
  -- Author-only check
  if old.created_by is distinct from auth.uid() then
    raise exception 'not_author' using hint = 'Only the argument author can delete this argument.';
  end if;

  -- Fetch lock duration from config (reuse claim config for consistency)
  select lock_duration_minutes into v_lock_minutes
  from public.claim_deletion_config
  where id = true;

  -- Enforce time lock
  if old.created_at > now() - (v_lock_minutes || ' minutes')::interval then
    raise exception 'deletion_locked' using hint = 'Arguments cannot be deleted within the first ' || v_lock_minutes || ' minutes.';
  end if;

  update public.arguments
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    content = '[This argument has been deleted]',
    is_retracted = true
  where id = old.id;

  -- Cancel the actual deletion; the tombstone UPDATE above is preserved.
  return null;
end;
$$;

drop trigger if exists enforce_argument_deletion_lock on public.arguments;
drop trigger if exists argument_soft_delete on public.arguments;
create trigger argument_delete_with_lock
before delete on public.arguments
for each row
execute function public.argument_delete_with_lock();

-- 6. Auto-update updated_at
drop trigger if exists set_arguments_updated_at on public.arguments;
create trigger set_arguments_updated_at
before update on public.arguments
for each row
execute function public.set_updated_at();

-- 7. Enable RLS
alter table public.arguments enable row level security;

-- 8. RLS Policies
-- R7: authoritative room authorization (public non-archived, owner, ACTIVE
-- debate participants) so private-debate participants can use arguments where
-- authorized. Outsiders stay excluded (fail-closed).
drop policy if exists "Arguments are readable in accessible rooms" on public.arguments;
create policy "Arguments are readable in accessible rooms"
on public.arguments
for select
to authenticated
using (public.has_room_access(room_id));

-- Authenticated users can create arguments in accessible rooms
drop policy if exists "Authenticated users can create arguments" on public.arguments;
create policy "Authenticated users can create arguments"
on public.arguments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_room_access(room_id)
  -- Archived rooms stay frozen for writes, owners included (preserves the
  -- original status semantics; has_room_access alone admits owners/participants
  -- regardless of status).
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.status <> 'archived'
  )
);

-- Authors can retract/update their own arguments
drop policy if exists "Authors can update their arguments" on public.arguments;
create policy "Authors can update their arguments"
on public.arguments
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 9. Security Definer View for arguments (with anonymous redaction)
create or replace view public.discussion_arguments
with (security_invoker = false)
as
select
  a.id,
  a.room_id,
  a.claim_id,
  a.content,
  a.stance,
  a.identity_mode,
  a.is_retracted,
  a.deleted_at,
  a.deleted_by,
  a.created_at,
  a.updated_at,
  case
    when a.identity_mode = 'anonymous' then null
    else a.created_by
  end as created_by,
  case
    when a.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when a.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.arguments a
left join public.profiles p on a.created_by = p.id
-- R7: authoritative room authorization (see policy note above).
where public.has_room_access(a.room_id);

grant select on public.discussion_arguments to anon, authenticated;

-- 10. RPC: Create argument
create or replace function public.create_argument(
  p_room_id uuid,
  p_claim_id uuid,
  p_content text,
  p_stance text,
  p_identity_mode text default 'public'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_argument_id uuid;
  v_claim record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_stance not in ('supporting', 'challenging') then
    raise exception 'invalid_stance' using hint = 'Stance must be supporting or challenging.';
  end if;

  if p_identity_mode not in ('public', 'anonymous') then
    raise exception 'invalid_identity_mode' using hint = 'Identity mode must be public or anonymous.';
  end if;

  if char_length(p_content) < 50 or char_length(p_content) > 5000 then
    raise exception 'invalid_length' using hint = 'Argument content must be between 50 and 5000 characters.';
  end if;

  -- Verify claim exists and is in the same room
  select c.id, c.room_id, c.is_retracted, c.deleted_at
  into v_claim
  from public.claims c
  where c.id = p_claim_id;

  if not found then
    raise exception 'claim_not_found' using hint = 'Claim not found.';
  end if;

  if v_claim.room_id <> p_room_id then
    raise exception 'room_mismatch' using hint = 'Claim is not in the specified room.';
  end if;

  if v_claim.is_retracted or v_claim.deleted_at is not null then
    raise exception 'claim_unavailable' using hint = 'Cannot attach argument to a retracted or deleted claim.';
  end if;

  -- Verify room access: authoritative has_room_access() (public non-archived,
  -- owner, ACTIVE debate participants) plus an explicit archived guard so
  -- archived rooms stay frozen for everyone, owners included (preserves the
  -- original status semantics while admitting private-debate participants).
  -- R7: a bare public-or-creator check here would reject participants that the
  -- aligned views/policies now serve.
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and public.has_room_access(p_room_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room not accessible.';
  end if;

  insert into public.arguments (
    room_id, claim_id, created_by, content, stance, identity_mode
  ) values (
    p_room_id, p_claim_id, v_user_id, p_content, p_stance, p_identity_mode
  ) returning id into v_argument_id;

  return v_argument_id;
end;
$$;

revoke execute on function public.create_argument(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.create_argument(uuid, uuid, text, text, text) to authenticated;

-- 11. RPC: Retract argument
create or replace function public.retract_argument(
  p_argument_id uuid
) returns void
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

  update public.arguments
  set is_retracted = true, updated_at = now()
  where id = p_argument_id and created_by = v_user_id;

  if not found then
    raise exception 'not_found_or_not_author' using hint = 'Argument not found or not authorized.';
  end if;
end;
$$;

revoke execute on function public.retract_argument(uuid) from public, anon;
grant execute on function public.retract_argument(uuid) to authenticated;