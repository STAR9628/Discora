-- Migration: Phase 9C.4 Account Deletion Foundation (Option C, Hybrid De-Identification)
--
-- Implements the approved deletion architecture (Phases 9C.3-R* specs):
--  - deletion_operations correlation table (10-state machine, checkpoints)
--  - storage_cleanup_queue (verified-ownership avatar cleanup intents)
--  - deletion_step_up_proofs (short-lived, single-use OTP proofs)
--  - execute_account_deletion(uuid, uuid) — service_role ONLY
--  - reconcile_deletion_operations() — service_role ONLY (operator/scheduler use)
--  - RLS fail-closed gap closure: user_preferences INSERT/VIEW, claim_relations INSERT
--  - Authorship nullability for uniformity of the approved "Deleted User" rendering
--    path (existing views render 'Deleted User' when the author reference is NULL).
--    Client INSERT paths already bind authorship to auth.uid() via RLS WITH CHECK,
--    so relaxation cannot produce authorless rows through normal clients.
--
-- Production safety: forward-only, additive except explicit column relaxations;
-- no applied migration edited; no history rewrite.

begin;

-- ============================================================================
-- 0. Authorship nullability (uniform Deleted-User rendering; RLS still binds
--    authorship on client INSERT through auth.uid() = created_by checks)
-- ============================================================================
alter table public.arguments alter column created_by drop not null;
alter table public.claim_requests alter column requester_id drop not null;
alter table public.inquiry_items alter column created_by drop not null;
alter table public.inquiry_responses alter column created_by drop not null;

-- ============================================================================
-- 1. RLS fail-closed gap closure (INVARIANT 1 / 12)
-- ============================================================================
drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check ((user_id = auth.uid()) AND public.is_active_user());

drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences"
  on public.user_preferences
  for select
  to authenticated
  using ((user_id = auth.uid()) AND public.is_active_user());

drop policy if exists "Authenticated users can create claim relations" on public.claim_relations;
create policy "Authenticated users can create claim relations"
  on public.claim_relations
  for insert
  to authenticated
  with check (public.is_active_user());

-- ============================================================================
-- 2. Deletion orchestration tables (service_role only; RLS enabled, no client grants)
-- ============================================================================
create table if not exists public.deletion_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'requested'
    check (status in (
      'requested', 'db_processing', 'db_completed', 'auth_processing', 'auth_completed',
      'storage_pending', 'completed', 'retryable_failure', 'manual_review', 'failed_terminal'
    )),
  retry_count integer not null default 0,
  db_completed_at timestamptz,
  auth_signout_completed_at timestamptz,
  auth_scrub_completed_at timestamptz,
  auth_soft_delete_completed_at timestamptz,
  storage_cleanup_completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live operation per user: concurrent deletion attempts serialize here.
create unique index if not exists deletion_operations_user_live_idx
  on public.deletion_operations (user_id)
  where status not in ('completed', 'failed_terminal', 'manual_review');

alter table public.deletion_operations enable row level security;
revoke all on public.deletion_operations from public, anon, authenticated;
-- service_role needs explicit table grants (RLS bypass does not imply grants).
-- This is the ONLY client role with access; the Server Action is its sole user.
grant all on public.deletion_operations to service_role;

create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  bucket text not null,
  object_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storage_cleanup_queue enable row level security;
revoke all on public.storage_cleanup_queue from public, anon, authenticated;
grant all on public.storage_cleanup_queue to service_role;

create table if not exists public.deletion_step_up_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  method text not null check (method in ('password', 'otp')),
  requested_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.deletion_step_up_proofs enable row level security;
revoke all on public.deletion_step_up_proofs from public, anon, authenticated;
grant all on public.deletion_step_up_proofs to service_role;

-- ============================================================================
-- 2b. Reputation immutability trigger: audited purge escape hatch.
-- Forward REPLACE (not a history edit): preserves the default-deny behavior
-- for every path except the account-deletion purge, which sets a
-- transaction-local GUC consumed here. Client roles cannot exploit it: they
-- hold no DELETE privilege and no policies on reputation_events.
-- ============================================================================
create or replace function public.prevent_reputation_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('discora.allow_reputation_purge', true) = 'on'
     and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'reputation_events are immutable: % of row % is not allowed', tg_op, old.id
    using hint = 'Reputation events can only be created by database triggers. Direct UPDATE/DELETE is prohibited.';
end;
$$;

-- ============================================================================
-- ============================================================================
-- 2c. Attribution-scrub trigger exemptions (generated verbatim from live bodies).
-- Each function below is byte-identical to its live definition except the
-- marked Phase 9C.4 clause. Cross-user safety is preserved by RLS: the clause
-- only relaxes immutability for rows the caller could already UPDATE, and only
-- when nulling the exact tombstoned account named in the GUC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_message_edit_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.user_id::text
     and new.user_id is null then
    return new;
  end if;
  -- Frozen once converted: marker, type, and content must no longer change.
  -- (updated_at-only churn from set_messages_updated_at still passes through.)
  if old.converted_claim_id is not null then
    if new.converted_claim_id is distinct from old.converted_claim_id
       or new.message_type is distinct from old.message_type
       or new.content is distinct from old.content
    then
      raise exception 'converted_frozen' using hint = 'Converted messages are frozen once they become Claims.';
    end if;
    return new;
  end if;

  -- Legitimate one-time Claim-conversion marker transition: bypass the window.
  if old.converted_claim_id is null
     and new.converted_claim_id is not null
     and old.message_type = 'message'
     and new.message_type = 'claim'
     and new.content is not distinct from old.content
     and new.room_id is not distinct from old.room_id
     and new.user_id is not distinct from old.user_id
     and new.identity_mode is not distinct from old.identity_mode
     and new.parent_message_id is not distinct from old.parent_message_id
     and new.created_at is not distinct from old.created_at
     and exists (
       select 1 from public.claims c
       where c.id = new.converted_claim_id
         and c.origin_message_id = old.id
     )
  then
    return new;
  end if;

  -- Enforce 5-minute edit window (unchanged)
  if old.created_at < now() - interval '5 minutes' then
    raise exception 'Messages can only be edited within 5 minutes of creation.';
  end if;

  -- Prevent modifying immutable fields (unchanged)
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_message_identity_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.user_id::text
     and new.user_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.message_type = 'system' then
      new.user_id := null;
      new.identity_mode := 'public';
    else
      new.user_id := auth.uid();
      new.identity_mode := coalesce(new.identity_mode, 'public');
    end if;
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_claim_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  -- Legitimate one-time tombstone transition: permit exactly this shape.
  if old.deleted_at is null
     and new.deleted_at is not null
     and new.content = '[This claim has been deleted]'
     and new.is_retracted = true
     and new.id is not distinct from old.id
     and new.room_id is not distinct from old.room_id
     and new.created_by is not distinct from old.created_by
     and new.origin_message_id is not distinct from old.origin_message_id
     and new.claim_type is not distinct from old.claim_type
     and new.context_type is not distinct from old.context_type
     and new.identity_mode is not distinct from old.identity_mode
     and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  -- Prevent modifying any field other than is_retracted, updated_at, deleted_at, deleted_by
  if new.id is distinct from old.id or
      new.room_id is distinct from old.room_id or
      new.created_by is distinct from old.created_by or
      new.origin_message_id is distinct from old.origin_message_id or
      new.content is distinct from old.content or
      new.claim_type is distinct from old.claim_type or
      new.context_type is distinct from old.context_type or
      new.identity_mode is distinct from old.identity_mode or
      new.created_at is distinct from old.created_at then
    raise exception 'Claims are immutable. Only retraction and deletion (after lock) are permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Claims cannot be un-retracted.';
  end if;

  -- Deleted claims cannot be undeleted
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Deleted claims cannot be restored.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_claim_identity_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;

  if new.origin_message_id is not null then
    if not exists (
      select 1 from public.messages m
      where m.id = new.origin_message_id and m.room_id = new.room_id
    ) then
      raise exception 'origin_message_id must belong to the same room as the claim.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_evidence_immutability_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.source_id is distinct from old.source_id or
     new.created_by is distinct from old.created_by or
     new.content is distinct from old.content or
     new.evidence_type is distinct from old.evidence_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Evidence is immutable. Only retraction is permitted.';
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Evidence cannot be un-retracted.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_source_immutability_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.title is distinct from old.title or
     new.url is distinct from old.url or
     new.file_path is distinct from old.file_path or
     new.created_by is distinct from old.created_by or
     new.created_at is distinct from old.created_at then
    raise exception 'Sources are immutable. Only retraction is permitted.';
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Sources cannot be un-retracted.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_question_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  -- Prevent modifying any field other than is_retracted and updated_at
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.content is distinct from old.content or
     new.question_type is distinct from old.question_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Questions are immutable. Only retraction is permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Questions cannot be un-retracted.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_question_identity_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_argument_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  -- Legitimate one-time tombstone transition: permit exactly this shape.
  if old.deleted_at is null
     and new.deleted_at is not null
     and new.content = '[This argument was deleted by its author and is retained for context.]'
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_argument_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim_room_id uuid;
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  new.created_by := coalesce(auth.uid(), new.created_by);

  if new.created_by is null then
    raise exception 'created_by_required' using hint = 'Argument author required.';
  end if;

  select room_id into v_claim_room_id from public.claims where id = new.claim_id;
  if v_claim_room_id is null then
    raise exception 'claim_not_found' using hint = 'Claim not found.';
  end if;
  if v_claim_room_id <> new.room_id then
    raise exception 'room_mismatch' using hint = 'Argument must be in the same room as its claim.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_claim_evidence_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  raise exception 'Claim Evidence links are immutable.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_claim_relation_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Phase 9C.4: approved account-deletion attribution scrub escape. When
  -- execute_account_deletion nulls authorship for the tombstoned account, this
  -- trigger must neither revert nor reject the change. Bound to the exact target
  -- UUID through a transaction-local GUC; inert in all normal operation (GUC
  -- unset evaluates to NULL and the condition fails closed).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;
  raise exception 'Claim relations are immutable. Delete and recreate instead.';
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_username_rules()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Phase 9C.4: tombstone rename escape (30-day rule + joined guards do not
  -- apply to the approved de-identification rename; bound to the exact target).
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.id::text then
    new.last_username_change = now();
    return new;
  end if;
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
$function$;

-- 3. Core deletion RPC (service_role ONLY; Server Action is the sole caller)
-- ============================================================================
create or replace function public.execute_account_deletion(p_user_id uuid, p_operation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text;
  v_avatar_url text;
  v_new_username text;
  v_existing_op uuid;
  v_object_path text;
begin
  -- Serialize concurrent deletions on the profile row.
  select username, avatar_url
    into v_username, v_avatar_url
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using hint = 'No profile exists for this account.';
  end if;

  -- INVARIANT 4: privileged accounts cannot self-delete (owner env-guard lives
  -- in the Server Action; roles are enforced here).
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role::text in ('admin', 'moderator')
  ) then
    raise exception 'privileged_account_self_deletion_prohibited'
      using errcode = '42501', hint = 'Administrative accounts cannot be deleted.';
  end if;

  -- Idempotency: already-deleted accounts return the existing operation.
  if exists (select 1 from public.profiles where id = p_user_id and is_deleted) then
    select id into v_existing_op
    from public.deletion_operations
    where user_id = p_user_id
    order by created_at desc
    limit 1;
    return coalesce(v_existing_op, p_operation_id);
  end if;

  -- Scope the attribution-scrub trigger escape to this account and transaction.
  perform set_config('discora.deletion_scrub_user', p_user_id::text, true);

  -- Tombstone in place (Option C): row anchor preserved, PII eradicated.
  v_new_username := 'deleted_user_' || substr(md5(p_user_id::text), 1, 8);
  update public.profiles
  set is_deleted = true,
      username = v_new_username,
      display_name = null,
      bio = null,
      avatar_url = null,
      updated_at = now()
  where id = p_user_id;

  -- INVARIANT 6/7: retire the historical handle (private registry).
  insert into public.retired_handles (handle)
  values (v_username)
  on conflict (handle) do nothing;

  -- Purge private signals (no dependents; explicit deletes, no cascades relied upon).
  delete from public.user_preferences where user_id = p_user_id;
  delete from public.user_saves where user_id = p_user_id;
  delete from public.claim_votes where user_id = p_user_id;
  delete from public.evidence_votes where user_id = p_user_id;
  delete from public.reactions where user_id = p_user_id;
  delete from public.user_reputation_snapshots where user_id = p_user_id;
  delete from public.friend_request_rate_counters where user_id = p_user_id;
  delete from public.invitation_attempts where user_id = p_user_id;
  delete from public.invitation_creation_counters where user_id = p_user_id;
  delete from public.access_code_failures where user_id = p_user_id;

  -- Reputation ledger purge. The immutability trigger fires for every role, so
  -- this function sets a transaction-local GUC that the (forward-migrated)
  -- trigger honors for this audited purge path only. No client role can reach
  -- the trigger meaningfully: reputation_events carries no DELETE grant and no
  -- policies for anon/authenticated, so only privileged DEFINER paths arrive here.
  perform set_config('discora.allow_reputation_purge', 'on', true);
  delete from public.reputation_events where user_id = p_user_id;
  perform set_config('discora.allow_reputation_purge', 'off', true);

  -- Friend graph: friendships and all request rows die with the account.
  -- Own blocks are removed; blocks placed BY others are their safety boundary
  -- and are preserved.
  delete from public.friend_relationships where user_a_id = p_user_id or user_b_id = p_user_id;
  delete from public.friend_requests where sender_user_id = p_user_id or recipient_user_id = p_user_id;
  delete from public.user_blocks where blocker_user_id = p_user_id;

  -- Room invitations: rows I created are bearer credentials that must die with
  -- me (deleted-sender invalidation). Where I am the invitee, detach me.
  delete from public.room_invitations where invited_by = p_user_id;
  update public.room_invitations set invited_user_id = null where invited_user_id = p_user_id;

  -- Roles (privileged rows blocked above; remaining rows are inert).
  delete from public.user_roles where user_id = p_user_id;

  -- De-identify attributions: surviving discourse renders "Deleted User"
  -- through the existing NULL-author convention in all read views.
  update public.user_feedback set user_id = null where user_id = p_user_id;
  update public.moderation_flags set reporter_id = null where reporter_id = p_user_id;
  update public.messages set user_id = null where user_id = p_user_id;
  update public.claims set created_by = null where created_by = p_user_id;
  update public.claims set deleted_by = null where deleted_by = p_user_id;
  update public.evidence set created_by = null where created_by = p_user_id;
  update public.sources set created_by = null where created_by = p_user_id;
  update public.claim_evidence set created_by = null where created_by = p_user_id;
  update public.claim_relations set created_by = null where created_by = p_user_id;
  update public.questions set created_by = null where created_by = p_user_id;
  update public.arguments set created_by = null where created_by = p_user_id;
  update public.arguments set deleted_by = null where deleted_by = p_user_id;
  update public.inquiry_items set created_by = null where created_by = p_user_id;
  update public.inquiry_responses set created_by = null where created_by = p_user_id;
  update public.claim_requests set requester_id = null where requester_id = p_user_id;
  update public.rooms set created_by = null where created_by = p_user_id;
  update public.topics set created_by = null where created_by = p_user_id;
  -- Structural participation anchors (debate_participants, debate_side_changes)
  -- are intentionally preserved: slots, balance, and reflections stay intact.

  -- INVARIANT 5: enqueue avatar cleanup ONLY for verified own-namespace paths.
  -- External OAuth URLs, malformed values, and cross-user paths are ignored.
  if v_avatar_url ~* ('^https?://[^/]+/storage/v1/object/public/avatars/' || p_user_id::text || '/avatar\.[a-z0-9]+$') then
    v_object_path := p_user_id::text || '/' || substring(v_avatar_url from 'avatar\.[a-z0-9]+$');
    insert into public.storage_cleanup_queue (user_id, bucket, object_path, status)
    values (p_user_id, 'avatars', v_object_path, 'pending');
  end if;

  perform set_config('discora.deletion_scrub_user', '', true);

  update public.deletion_operations
  set status = 'db_completed', db_completed_at = now(), updated_at = now()
  where id = p_operation_id;

  return p_operation_id;
end;
$$;

revoke all on function public.execute_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.execute_account_deletion(uuid, uuid) to service_role;

comment on function public.execute_account_deletion(uuid, uuid) is
  'Option C account deletion (tombstone + purge + de-identify). service_role only; Server Action is the sole caller.';

-- ============================================================================
-- 4. Reconciler (service_role ONLY; operator/scheduler use; no HTTP inside)
-- ============================================================================
create or replace function public.reconcile_deletion_operations()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_escalated integer := 0;
  v_requeued integer := 0;
begin
  -- Escalate operations exhausted beyond 5 retries.
  update public.deletion_operations
  set status = 'manual_review', updated_at = now()
  where status = 'retryable_failure' and retry_count >= 5
    and status <> 'manual_review';
  get diagnostics v_escalated = row_count;

  -- Re-queue storage intents that never reached done.
  update public.storage_cleanup_queue
  set status = 'pending', updated_at = now()
  where status in ('failed')
    and attempts < 5;
  get diagnostics v_requeued = row_count;

  return jsonb_build_object('escalated_to_manual_review', v_escalated, 'storage_requeued', v_requeued);
end;
$$;

revoke all on function public.reconcile_deletion_operations() from public, anon, authenticated;
grant execute on function public.reconcile_deletion_operations() to service_role;

comment on function public.reconcile_deletion_operations() is
  'Deletion recovery helper: escalates exhausted ops, re-queues failed storage intents. Requires an external scheduler/operator; GoTrue steps need user context and are handled by the Server Action retry path.';

commit;