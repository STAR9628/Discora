-- Migration: Phase 9D.3 Room Invitation Security Remediation (M3)
--
-- Remediates audit findings F-01..F-09 (plaintext tokens, no expiry, no throttles,
-- over-broad UPDATE, accept/revoke race, query-string transport support server-side,
-- no active-user gate, plaintext access codes) plus P3 hardening where safe.
-- Forward-only, additive objects + hardened CREATE OR REPLACE bodies. No history rewrite.
--
-- Product decisions applied: D-9D3-1 single-use; D-9D3-2 7-day expiry; D-9D3-3
-- 20 active/room + 10 creates/user/hour; D-9D3-4 10 failures/15min generic failure;
-- D-9D3-5 login required (unchanged); D-9D3-6 possession != authorization (binding kept);
-- D-9D3-7 90-day expired retention; D-9D3-8 blocks don't gate joins (unchanged).

begin;

-- ============================================================================
-- 0. Preconditions
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'extensions' and p.proname = 'digest'
  ) then
    raise exception 'precondition_missing_pgcrypto' using hint = 'pgcrypto (extensions.digest) is required.';
  end if;
  if to_regproc('public.is_active_user') is null then
    raise exception 'precondition_missing_is_active_user' using hint = 'public.is_active_user() is required.';
  end if;
end;
$$;

-- ============================================================================
-- 1. Server-side throttle state (DEFINER-only; no client grants)
-- ============================================================================
create table if not exists public.invitation_attempts (
  room_id uuid not null,
  user_id uuid not null,
  failures integer not null default 0,
  last_failure timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.invitation_creation_counters (
  user_id uuid not null,
  bucket_start timestamptz not null,
  creations integer not null default 1,
  primary key (user_id, bucket_start)
);

alter table public.invitation_attempts enable row level security;
alter table public.invitation_creation_counters enable row level security;
revoke all on public.invitation_attempts from public, anon, authenticated;
revoke all on public.invitation_creation_counters from public, anon, authenticated;

-- ============================================================================
-- 2. Token hash column + expiry column + legacy backfill (verified)
-- ============================================================================
alter table public.room_invitations
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz;

-- Backfill hashes for every legacy plaintext token (skipped on re-run after
-- the legacy column is gone; the verification gate below still enforces shape).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'room_invitations'
      and column_name = 'invitation_token'
  ) then
    update public.room_invitations
    set token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    where token_hash is null and invitation_token is not null;
  end if;
end;
$$;

-- Backfill expiry for rows lacking it (active rows get created_at + 7 days;
-- terminal rows keep a consistent value; only active rows are expiry-gated).
update public.room_invitations
set expires_at = created_at + interval '7 days'
where expires_at is null;

-- Verification gate: abort if backfill is incomplete or hashes collide.
do $$
declare
  v_missing_hash integer;
  v_missing_expiry integer;
  v_dup_hash integer;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'room_invitations'
      and column_name = 'invitation_token'
  ) then
    execute 'select count(*) from public.room_invitations where invitation_token is not null and token_hash is null'
      into v_missing_hash;

    if v_missing_hash > 0 then
      raise exception 'backfill_incomplete_token_hash' using hint = 'Every legacy token must receive a hash before plaintext is dropped.';
    end if;
  end if;

  select count(*) into v_missing_expiry
  from public.room_invitations
  where expires_at is null;

  if v_missing_expiry > 0 then
    raise exception 'backfill_incomplete_expiry' using hint = 'Every invitation row must receive expires_at.';
  end if;

  select count(*) into v_dup_hash
  from (select token_hash from public.room_invitations group by token_hash having count(*) > 1) s;

  if v_dup_hash > 0 then
    raise exception 'backfill_hash_collision' using hint = 'Token hashes must be unique.';
  end if;
end;
$$;

alter table public.room_invitations
  alter column token_hash set not null,
  alter column expires_at set not null;

create unique index if not exists room_invitations_token_hash_idx
  on public.room_invitations (token_hash);

-- Remove plaintext storage (index on the dropped column goes with it).
drop index if exists public.room_invitations_token_idx;
alter table public.room_invitations
  drop column if exists invitation_token;

-- Status lifecycle gains 'expired' (active -> expired only; never re-armed).
alter table public.room_invitations
  drop constraint if exists room_invitations_status_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.room_invitations'::regclass
      and conname = 'room_invitations_status_check'
  ) then
    alter table public.room_invitations
      add constraint room_invitations_status_check
      check (status in ('active', 'accepted', 'revoked', 'expired'));
  end if;
end;
$$;

comment on column public.room_invitations.token_hash is
  'SHA-256 hex of the single-use invitation token. Plaintext is never stored. Lookup by hash only.';
comment on column public.room_invitations.expires_at is
  'Single-use invitation expiry (7 days from creation). Enforced atomically in accept_invitation; swept by expire_room_invitations; purged after 90 days expired.';

-- ============================================================================
-- 3. Close the direct client UPDATE path (revoke moves to RPC, §7)
-- ============================================================================
revoke update on public.room_invitations from authenticated;
drop policy if exists "Room owners can update invitations" on public.room_invitations;
-- SELECT grants/policies (owners + bound invitees) are intentionally preserved.

-- ============================================================================
-- 4. Hardened create_room_invitation (throttles, room cap, expiry, active gate)
-- ============================================================================
create or replace function public.create_room_invitation(
  p_room_id uuid,
  p_invited_user_id uuid default null,
  p_invited_email text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room record;
  v_is_owner boolean := false;
  v_is_participant boolean := false;
  v_invitation_token text;
  v_active_count integer;
  v_creations integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create invitations.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room.visibility <> 'private' then
    raise exception 'room_not_private' using hint = 'Invitations are only valid for private rooms.';
  end if;

  if v_room.status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot invite users to an archived room.';
  end if;

  v_is_owner := (v_room.created_by = v_user_id);

  if not v_is_owner then
    select exists (
      select 1 from public.debate_participants dp
      where dp.room_id = p_room_id
        and dp.user_id = v_user_id
        and dp.removed_at is null
    ) into v_is_participant;

    if not v_is_participant then
      raise exception 'not_authorized' using hint = 'You do not have permission to create invitations for this room.';
    end if;

    if not exists (
      select 1 from public.rooms r
      where r.id = p_room_id and r.participant_invites_enabled = true
    ) then
      raise exception 'not_authorized' using hint = 'Participant invitations are not enabled for this room.';
    end if;
  end if;

  if (p_invited_user_id is not null and p_invited_email is not null) or
     (p_invited_user_id is null and p_invited_email is null) then
    raise exception 'invalid_identity' using hint = 'Exactly one of invited_user_id or invited_email must be provided.';
  end if;

  if p_invited_email is not null and trim(p_invited_email) = '' then
    raise exception 'invalid_email' using hint = 'Email cannot be empty.';
  end if;

  if p_invited_email is not null and position('@' in trim(p_invited_email)) < 2 then
    raise exception 'invalid_email' using hint = 'Enter a valid email address.';
  end if;

  if p_invited_user_id = v_user_id then
    raise exception 'cannot_invite_self' using hint = 'You cannot invite yourself.';
  end if;

  -- Room-scoped serialization: distinct namespace from friend pair/recipient
  -- locks. Only creation takes this lock, so no lock-order inversion exists.
  perform pg_advisory_xact_lock(hashtext('discora_room_invites'), hashtext('r:' || p_room_id::text));

  -- D-9D3-3: at most 20 active invitations per room (global per-room cap).
  select count(*) into v_active_count
  from public.room_invitations
  where room_id = p_room_id and status = 'active';

  if v_active_count >= 20 then
    raise exception 'room_invite_cap' using hint = 'This room has reached its active invitation limit.';
  end if;

  -- D-9D3-3: at most 10 creations per user per hour (atomic counter).
  insert into public.invitation_creation_counters (user_id, bucket_start, creations)
  values (v_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, bucket_start)
  do update set creations = public.invitation_creation_counters.creations + 1
  returning public.invitation_creation_counters.creations into v_creations;

  if v_creations > 10 then
    raise exception 'invitation_rate_limited' using hint = 'Too many invitations created. Please try again later.';
  end if;

  -- 256-bit server-side token; plaintext lives only in this return value.
  v_invitation_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.room_invitations (
    room_id, invited_by, invited_user_id, email, token_hash, status, expires_at
  ) values (
    p_room_id, v_user_id, p_invited_user_id,
    case when p_invited_email is null then null else trim(p_invited_email) end,
    encode(extensions.digest(v_invitation_token, 'sha256'), 'hex'),
    'active',
    now() + interval '7 days'
  );

  return v_invitation_token;
end;
$$;

revoke all on function public.create_room_invitation(uuid, uuid, text) from public, anon;
grant execute on function public.create_room_invitation(uuid, uuid, text) to authenticated;

-- ============================================================================
-- 5. Atomic accept_invitation (hash lookup, throttle, row lock, generic NULL)
-- ============================================================================
-- Contract change (approved hardening): returns the room id on success and NULL
-- on ANY failure (invalid/expired/revoked/wrong-room/wrong-identity/throttled/
-- archived/removed/inactive/unauthenticated). Callers surface one generic message,
-- so no failure class is distinguishable. Failure counters persist because the
-- function returns normally instead of raising.
create or replace function public.accept_invitation(
  p_invitation_token text,
  p_room_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_failures integer;
  v_last_failure timestamptz;
  v_token_hash text;
  v_inv public.room_invitations%rowtype;
  v_room_visibility text;
  v_room_status text;
  v_is_removed boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return null;
  end if;
  if not public.is_active_user() then
    return null;
  end if;

  -- D-9D3-4: 10 failures per 15 minutes, per user per room.
  select failures, last_failure into v_failures, v_last_failure
  from public.invitation_attempts
  where room_id = p_room_id and user_id = v_user_id;

  if v_failures >= 10 and now() - v_last_failure < interval '15 minutes' then
    return null;
  end if;

  if p_invitation_token is null or trim(p_invitation_token) = '' then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  v_token_hash := encode(extensions.digest(trim(p_invitation_token), 'sha256'), 'hex');

  -- Row lock closes the accept/revoke TOCTOU window (F-06).
  select * into v_inv
  from public.room_invitations
  where token_hash = v_token_hash and room_id = p_room_id
  for update;

  if not found then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  select visibility, status into v_room_visibility, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null or v_room_visibility <> 'private' or v_room_status = 'archived' then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  if v_room_visibility = 'private' then
    select exists (
      select 1 from public.debate_participants
      where room_id = p_room_id and user_id = v_user_id and removed_at is not null
    ) into v_is_removed;

    if v_is_removed then
      perform public.record_invitation_failure(p_room_id, v_user_id);
      return null;
    end if;
  end if;

  if v_inv.status <> 'active' then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  if v_inv.expires_at <= now() then
    -- Lazy expiry keeps the sweep honest; still a generic failure.
    update public.room_invitations
    set status = 'expired', updated_at = now()
    where id = v_inv.id;
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  if not (v_inv.invited_user_id = v_user_id
          or v_inv.email = (select email from auth.users where id = v_user_id)) then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, 'neutral')
  on conflict (room_id, user_id) where removed_at is null do nothing;

  -- Guarded consume: a concurrent revoke/publish that committed first makes
  -- this update match zero rows, so acceptance can never follow a revoke.
  update public.room_invitations
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_inv.id and status = 'active';

  if not found then
    perform public.record_invitation_failure(p_room_id, v_user_id);
    return null;
  end if;

  return p_room_id;
end;
$$;

-- Failure recorder (called inside accept; persists because accept returns NULL).
create or replace function public.record_invitation_failure(
  p_room_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_id is null or p_user_id is null then
    return;
  end if;
  insert into public.invitation_attempts (room_id, user_id, failures, last_failure)
  values (p_room_id, p_user_id, 1, now())
  on conflict (room_id, user_id)
  do update set failures = public.invitation_attempts.failures + 1,
                  last_failure = now();
end;
$$;

revoke all on function public.accept_invitation(text, uuid) from public, anon;
grant execute on function public.accept_invitation(text, uuid) to authenticated;
revoke all on function public.record_invitation_failure(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_invitation_failure(uuid, uuid) to service_role;

-- ============================================================================
-- 6. Owner-only revoke RPC (replaces direct client UPDATE)
-- ============================================================================
create or replace function public.revoke_room_invitation(
  p_invitation_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;

  select room_id into v_room_id
  from public.room_invitations
  where id = p_invitation_id;

  if v_room_id is null then
    raise exception 'invitation_not_found' using hint = 'Invitation does not exist.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id and r.created_by = v_user_id
  ) then
    raise exception 'not_authorized' using hint = 'Only the room owner can revoke invitations.';
  end if;

  -- Only lifecycle columns change; only active rows transition. No retargeting
  -- of room, token hash, or invitee is possible through this path.
  update public.room_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_invitation_id and status = 'active';

  if not found then
    raise exception 'invalid_invitation_state' using hint = 'Only active invitations can be revoked.';
  end if;
end;
$$;

revoke all on function public.revoke_room_invitation(uuid) from public, anon;
grant execute on function public.revoke_room_invitation(uuid) to authenticated;

-- ============================================================================
-- 7. Expiry sweep + 90-day purge (idempotent, monotonic)
-- ============================================================================
create or replace function public.expire_room_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.room_invitations
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.purge_expired_room_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.room_invitations
  where status = 'expired' and updated_at < now() - interval '90 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_room_invitations() from public, anon;
grant execute on function public.expire_room_invitations() to authenticated;
revoke all on function public.purge_expired_room_invitations() from public, anon;
grant execute on function public.purge_expired_room_invitations() to authenticated;

comment on function public.expire_room_invitations() is
  'Sweeps past-due active invitations to expired. Monotonic; safe for scheduled execution.';
comment on function public.purge_expired_room_invitations() is
  'Purges expired invitations older than 90 days (D-9D3-7). Schedule via service-role cron in production.';

-- ============================================================================
-- 8. Access-code hashing (bcrypt) + active-user gates
-- ============================================================================
-- Backfill: hash existing plaintext codes (case-insensitive semantics preserved
-- by hashing the upper-cased value, matching the previous comparison rule).
update public.rooms
set access_code = extensions.crypt(upper(access_code), extensions.gen_salt('bf'))
where access_code is not null and access_code !~ '^\$2[aby]\$';

do $$
begin
  if exists (
    select 1 from public.rooms
    where access_code is not null and access_code !~ '^\$2[aby]\$'
  ) then
    raise exception 'backfill_incomplete_access_code_hash' using hint = 'Every stored access code must be bcrypt-hashed.';
  end if;
end;
$$;

comment on column public.rooms.access_code is
  'bcrypt hash of the room access code (case-insensitive). Plaintext is never stored or returned.';

create or replace function public.set_room_access_code(
  p_room_id uuid,
  p_code text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_visibility text;
  v_room_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.created_by = auth.uid()
  ) then
    raise exception 'not_authorized' using hint = 'Only the room owner can set the access code.';
  end if;

  select visibility, status into v_room_visibility, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_visibility <> 'private' then
    raise exception 'invalid_room_state' using hint = 'Access code can only be set on private rooms.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot modify access code on an archived room.';
  end if;

  if p_code is null or trim(p_code) = '' then
    update public.rooms
    set access_code = null, updated_at = now()
    where id = p_room_id;
  else
    update public.rooms
    set access_code = extensions.crypt(upper(trim(p_code)), extensions.gen_salt('bf')),
        updated_at = now()
    where id = p_room_id;
  end if;
end;
$$;

revoke all on function public.set_room_access_code(uuid, text) from public, anon;
grant execute on function public.set_room_access_code(uuid, text) to authenticated;

create or replace function public.join_with_access_code(
  p_room_id uuid,
  p_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_visibility text;
  v_room_status text;
  v_is_removed boolean;
  v_failures integer;
  v_last_failure timestamptz;
  v_room_access_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to join.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;

  select visibility, status, access_code into v_room_visibility, v_room_status, v_room_access_code
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot join an archived room.';
  end if;

  if v_room_visibility = 'private' then
    select exists (
      select 1 from public.debate_participants
      where room_id = p_room_id and user_id = v_user_id and removed_at is not null
    ) into v_is_removed;

    if v_is_removed then
      raise exception 'not_authorized' using hint = 'You have been removed from this room.';
    end if;
  end if;

  if v_room_access_code is null then
    raise exception 'invalid_access_code' using hint = 'Invalid access code.';
  end if;

  select failures, last_failure into v_failures, v_last_failure
  from public.access_code_failures
  where room_id = p_room_id and user_id = v_user_id;

  if v_failures >= 5 and now() - v_last_failure < interval '15 minutes' then
    raise exception 'too_many_attempts' using hint = 'Too many failed attempts. Try again later.';
  end if;

  -- bcrypt comparison against the stored hash (case-insensitive by construction).
  if v_room_access_code <> extensions.crypt(upper(p_code), v_room_access_code) then
    insert into public.access_code_failures (room_id, user_id, failures)
    values (p_room_id, v_user_id, 1)
    on conflict (room_id, user_id) do update set
      failures = public.access_code_failures.failures + 1,
      last_failure = now();

    return null;
  end if;

  delete from public.access_code_failures
  where room_id = p_room_id and user_id = v_user_id;

  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, 'neutral')
  on conflict (room_id, user_id) where removed_at is null do nothing;

  return p_room_id;
end;
$$;

revoke all on function public.join_with_access_code(uuid, text) from public, anon;
grant execute on function public.join_with_access_code(uuid, text) to authenticated;

-- Owner/participant code-presence check without ever returning the secret.
create or replace function public.room_has_access_code(
  p_room_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and (r.created_by = auth.uid()
           or exists (select 1 from public.debate_participants dp
                      where dp.room_id = p_room_id and dp.user_id = auth.uid()
                        and dp.removed_at is null))
  ) then
    return false;
  end if;
  return exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.access_code is not null
  );
end;
$$;

revoke all on function public.room_has_access_code(uuid) from public, anon;
grant execute on function public.room_has_access_code(uuid) to authenticated;

commit;
