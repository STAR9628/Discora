-- Phase 7D Phase F: Fix argument tombstone placeholder length (F2, forward fix).
--
-- ROOT CAUSE: argument_delete_with_lock() rewrites content to
-- '[This argument has been deleted]' (32 chars), but the
-- arguments_content_length CHECK requires 50-5000 chars. Argument soft-delete
-- could therefore never succeed. Proven in isolation; see
-- docs/PHASE_7D_PHASE_F_LIFECYCLE_GAP_CLOSURE_REPORT.md (F2).
--
-- REMEDIATION (minimal, approved direction): use a deterministic 70-char
-- placeholder satisfying the existing minimum, mirrored EXACTLY in the
-- immutability exemption:
--   '[This argument was deleted by its author and is retained for context.]'
-- CHECK semantics are untouched (no relaxation). No voting/scoring/reputation
-- behavior is added. Retraction semantics are untouched. The placeholder
-- carries no winner/loser/authority meaning; it marks removal only.
-- (The claims placeholder needs no change: 29 chars satisfy the 25-500 CHECK.)
--
-- ROLLBACK: re-apply the two functions from
-- 202609090004_discussion_arguments_foundation.sql (restores the broken
-- behavior; only useful as an emergency revert).
--
-- REQUIRES OWNER APPROVAL before any production push (standard gate).

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
    content = '[This argument was deleted by its author and is retained for context.]',
    is_retracted = true
  where id = old.id;

  -- Cancel the actual deletion; the tombstone UPDATE above is preserved.
  return null;
end;
$$;
