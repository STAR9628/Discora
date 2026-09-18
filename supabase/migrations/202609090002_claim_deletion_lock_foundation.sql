-- Phase 7D Phase A: Claim Deletion-Lock Foundation
-- Implements 20-minute configurable deletion lock with tombstone/soft-delete
-- Tombstone design: the Claim row remains, so related evidence, arguments,
-- inquiries, and votes keep their relationships (existing CASCADE FKs preserved;
-- see section 10). Replaces prevent_claim_deletion with time-aware guard.
--
-- REVISION (R2+R4+R5, Phase F readiness gate): this file was an unapplied
-- working-tree draft (never committed, absent from the reachable database,
-- referenced by no deploy script). The discussion_claims rewrite below now
-- preserves the authoritative hardening-era definition (202606210001:
-- has_room_access gating, resolved-hidden filtering, question_id, debate_side)
-- and adds ONLY deleted_at/deleted_by. The immutability rewrite gains a narrow
-- tombstone-transition exemption. Dangerous FK churn was removed. Deletion
-- invocation remains DORMANT (no DELETE RLS policy, no delete RPC in this set).

-- 1. Add tombstone columns to claims
alter table public.claims
add column if not exists deleted_at timestamptz;

alter table public.claims
add column if not exists deleted_by uuid references auth.users (id) on delete set null;

-- 2. Add configurable deletion lock duration (server-side constant)
-- V1: 20 minutes, Future: 5 minutes
-- Using a simple config table for flexibility
create table if not exists public.claim_deletion_config (
  id boolean primary key default true,
  lock_duration_minutes integer not null default 20,
  constraint claim_deletion_config_singleton check (id = true)
);

insert into public.claim_deletion_config (id, lock_duration_minutes)
values (true, 20)
on conflict (id) do nothing;

-- 3. Drop the old prevent_claim_deletion trigger
drop trigger if exists prevent_claim_deletion on public.claims;
drop function if exists public.prevent_claim_deletion();

-- 4. Ordered deletion guard + tombstone (active path is claim_delete_with_lock below).
-- Legacy lock helper retained for reference only.
create or replace function public.enforce_claim_deletion_lock()
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
    raise exception 'not_author' using hint = 'Only the claim author can delete this claim.';
  end if;

  -- Fetch lock duration from config
  select lock_duration_minutes into v_lock_minutes
  from public.claim_deletion_config
  where id = true;

  -- Enforce time lock: claim must be older than lock_duration_minutes
  if old.created_at > now() - (v_lock_minutes || ' minutes')::interval then
    raise exception 'deletion_locked' using hint = 'Claims cannot be deleted within the first ' || v_lock_minutes || ' minutes.';
  end if;

  -- Allow deletion to proceed (tombstone will be set by the BEFORE DELETE trigger below)
  return old;
end;
$$;

-- 5. BEFORE DELETE trigger to implement soft-delete (tombstone) instead of hard delete
-- Tombstone is applied via a single ordered function (lock check first, then soft-delete).
--
-- DORMANT INVOCATION (R4): there is intentionally NO DELETE RLS policy on
-- public.claims and NO delete_claim RPC in this migration set, so this trigger
-- is unreachable via PostgREST (RLS denies DELETE before row triggers fire).
-- Do NOT present deletion as shippable. A later phase must add a
-- delete_claim(uuid) SECURITY DEFINER RPC enforcing author ownership, the
-- claim_deletion_config lock window, and room authorization before any delete
-- UI is built. The lock semantics, tombstone shape, and immutability exemption
-- in this file are the approved foundation for that RPC.
create or replace function public.claim_delete_with_lock()
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
    raise exception 'not_author' using hint = 'Only the claim author can delete this claim.';
  end if;

  -- Fetch lock duration from config
  select lock_duration_minutes into v_lock_minutes
  from public.claim_deletion_config
  where id = true;

  -- Enforce time lock: claim must be older than lock_duration_minutes
  if old.created_at > now() - (v_lock_minutes || ' minutes')::interval then
    raise exception 'deletion_locked' using hint = 'Claims cannot be deleted within the first ' || v_lock_minutes || ' minutes.';
  end if;

  -- Set tombstone fields instead of actually deleting
  update public.claims
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    content = '[This claim has been deleted]',
    is_retracted = true
  where id = old.id;

  -- Cancel the actual deletion; the tombstone UPDATE above is preserved.
  return null;
end;
$$;

drop trigger if exists claim_soft_delete on public.claims;
drop trigger if exists enforce_claim_deletion_lock on public.claims;
create trigger claim_delete_with_lock
before delete on public.claims
for each row
execute function public.claim_delete_with_lock();

-- 7. Update enforce_claim_immutability to permit the single legitimate tombstone
-- transition performed by claim_delete_with_lock (section 5).
-- R4: the previous draft of this rewrite rejected the tombstone's own content
-- update, so every soft-delete would have raised 'Claims are immutable'.
-- The exemption below permits EXACTLY ONE mutation shape, one-way:
--   deleted_at NULL -> NOT NULL, content -> '[This claim has been deleted]',
--   is_retracted -> true, all other columns byte-identical.
-- No broad "if deleted then allow anything" bypass exists: any other content,
-- type, ownership, or room mutation still raises, and undeletion still raises.
-- Authorization for the transition belongs to the future delete_claim
-- SECURITY DEFINER RPC (author + lock + room checks); see DORMANT note in
-- section 5. Direct UPDATEs remain additionally gated by RLS (author-only).
create or replace function public.enforce_claim_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

-- 8. Update discussion_claims view to expose deletion metadata.
-- R2: preserves the authoritative hardening-era definition (202606210001)
-- verbatim — has_room_access() gating (public non-archived, owner, active
-- debate participants), resolved-hidden filtering, question_id, debate_side,
-- vote aggregates, user_vote — and adds ONLY deleted_at/deleted_by (appended
-- last: CREATE OR REPLACE VIEW requires new columns at the end; order is
-- invisible to name-based API consumers). Deleted claims stay visible with
-- tombstone content so related evidence/arguments remain understandable.
create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id,
  c.content,
  c.claim_type,
  c.context_type,
  c.identity_mode,
  c.is_retracted,
  c.debate_side,
  c.created_at,
  c.updated_at,
  case
    when c.identity_mode = 'anonymous' then null
    else c.created_by
  end as created_by,
  case
    when c.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio,
  (
    select vote_type from public.claim_votes cv
    where cv.claim_id = c.id and cv.user_id = auth.uid()
  ) as user_vote,
  -- Phase 7D additions (appended last, see note above).
  c.deleted_at,
  c.deleted_by
from public.claims c
left join public.profiles p on c.created_by = p.id
left join (
  select
    claim_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_id
) v on c.id = v.claim_id
where public.has_room_access(c.room_id)
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.claim_id = c.id and mf.status = 'resolved_hidden'
  );

grant select on public.discussion_claims to anon, authenticated;

-- 9. Add indexes for deleted_at queries
create index if not exists claims_deleted_at_idx on public.claims (deleted_at) where deleted_at is not null;

-- 10. Foreign keys on claim deletion: NO CHANGES (R5).
-- R5: the tombstone design cancels real DELETEs (claim_delete_with_lock returns
-- NULL after writing deleted_at/deleted_by), so the Claim row — and every FK
-- reference to it — is preserved by construction. No FK churn is required.
-- The earlier draft of this section retargeted claim_votes.claim_id and
-- inquiry_items.target_claim_id to ON DELETE SET NULL; both columns are
-- NOT NULL (202606030006, 202606120001), so a real delete would have raised a
-- NOT NULL violation instead of preserving data. Those alterations are removed.
-- claim_evidence / claim_relations keep ON DELETE CASCADE (composite PK members
-- cannot be nulled); under tombstoning they keep pointing at the tombstoned
-- claim, which is exactly the "remain understandable" behavior.