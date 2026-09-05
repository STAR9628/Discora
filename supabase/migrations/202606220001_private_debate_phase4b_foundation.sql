-- Phase 4B: Private Debate Rooms — Foundation (Consolidated Remediation)
--
-- This single migration replaces the broken 202606220001/230001 pair.
-- It is safe to run even if room_invitations or partial Phase 4B objects
-- already exist, because it uses idempotent and defensive patterns.

-- ============================================================================
-- 1. debate_participants soft-removal model
-- ============================================================================
-- Soft removal preserves history and prevents rejoin through alternate paths.

alter table public.debate_participants add column if not exists removed_at timestamptz;

create index if not exists idx_debate_participants_active
  on public.debate_participants(room_id, user_id)
  where removed_at is null;

-- Replace the unconditional unique constraint with a partial unique index
-- so that at most one ACTIVE membership exists per (room_id, user_id).
-- Removed rows (removed_at IS NOT NULL) do not block rejoin in public rooms.
alter table public.debate_participants drop constraint if exists debate_participants_room_id_user_id_key;

create unique index if not exists idx_debate_participants_active_unique
  on public.debate_participants(room_id, user_id)
  where removed_at is null;

-- ============================================================================
-- 2. rooms participant-invite toggle
-- ============================================================================
-- Participants may create invitations only when enabled.

alter table public.rooms add column if not exists participant_invites_enabled boolean not null default false;

alter table public.rooms add column if not exists access_code text;

-- ============================================================================
-- 3. Extend authorization helpers for removed participants
-- ============================================================================
-- Preserve existing Phase 4A guarantees:
--   - public non-archived rooms
--   - room owner
--   - active debate participant
-- Add removed-participant denial for private rooms.

create or replace function public.has_room_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id
            and dp.user_id = auth.uid()
            and dp.removed_at is null
        )
      )
  );
$$;

grant execute on function public.has_room_access(uuid) to anon, authenticated;

create or replace function public.has_room_write_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and (
        (r.visibility = 'public')
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id
            and dp.user_id = auth.uid()
            and dp.removed_at is null
        )
      )
  );
$$;

grant execute on function public.has_room_write_access(uuid) to anon, authenticated;

-- ============================================================================
-- 4. Non-recursive debate_participants SELECT policy
-- ============================================================================
-- Drop the legacy recursive policy by its exact production name.
-- Use has_room_access() to avoid RLS recursion.

drop policy if exists "Debate participants are viewable in authorized rooms" on public.debate_participants;

create policy "Debate participants are viewable by owner or participants"
  on public.debate_participants
  for select
  to authenticated
  using (public.has_room_access(room_id));

-- ============================================================================
-- 5. Visibility transition enforcement
-- ============================================================================
-- Prevent public -> private transitions.
-- Allow private -> public only through make_room_public().
-- Existing room updates (title, description, etc.) remain functional.

create or replace function public.enforce_room_visibility_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.visibility is distinct from old.visibility then
    if old.visibility = 'private' and new.visibility = 'public' then
      if current_setting('discora.allow_visibility_change', true) = 'true' then
        return new;
      end if;
    end if;
    raise exception 'invalid_visibility_transition' using hint = 'Visibility transitions must use make_room_public().';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_room_visibility_transition on public.rooms;
create trigger enforce_room_visibility_transition
  before update on public.rooms
  for each row
  execute function public.enforce_room_visibility_transition();

-- ============================================================================
-- 6. room_invitations table and RLS
-- ============================================================================
-- Per-correction: access_code is room-level here for invite-link gating.
-- Credential possession must never equal membership.

create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete set null,
  email text,
  invitation_token text not null,
  status text not null default 'active' check (status in ('active', 'accepted', 'revoked')),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_invitations_identity_check check (
    (invited_user_id is not null and email is null)
    or (invited_user_id is null and email is not null)
  )
);

create index if not exists room_invitations_room_id_idx on public.room_invitations (room_id);
create unique index if not exists room_invitations_token_idx on public.room_invitations (invitation_token);
create index if not exists room_invitations_room_user_idx on public.room_invitations (room_id, invited_user_id);
create index if not exists room_invitations_status_idx on public.room_invitations (room_id, status);

alter table public.room_invitations enable row level security;

drop policy if exists "Room owners can view invitations" on public.room_invitations;
create policy "Room owners can view invitations"
  on public.room_invitations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

drop policy if exists "Invited users can view their invitations" on public.room_invitations;
create policy "Invited users can view their invitations"
  on public.room_invitations
  for select
  to authenticated
  using (invited_user_id = auth.uid());

drop policy if exists "Room owners can create invitations" on public.room_invitations;
create policy "Room owners can create invitations"
  on public.room_invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
    and invited_by = auth.uid()
  );

drop policy if exists "Participants can create invitations if enabled" on public.room_invitations;
create policy "Participants can create invitations if enabled"
  on public.room_invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.participant_invites_enabled = true
        and exists (
          select 1 from public.debate_participants dp
          where dp.room_id = room_id and dp.user_id = auth.uid() and dp.removed_at is null
        )
    )
    and invited_by = auth.uid()
  );

drop policy if exists "Room owners can update invitations" on public.room_invitations;
create policy "Room owners can update invitations"
  on public.room_invitations
  for update
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

drop policy if exists "Room owners can delete invitations" on public.room_invitations;
create policy "Room owners can delete invitations"
  on public.room_invitations
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

revoke all on public.room_invitations from public, anon;
grant select, insert, update, delete on public.room_invitations to authenticated;

-- ============================================================================
-- 7. Access-code brute-force protection
-- ============================================================================
-- Simple per-user per-room failure counter to limit guessing.

create table if not exists public.access_code_failures (
  room_id uuid not null,
  user_id uuid not null,
  failures integer not null default 0,
  last_failure timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.access_code_failures enable row level security;

revoke all on public.access_code_failures from public, anon, authenticated;

-- ============================================================================
-- 8. Atomic private debate creation
-- ============================================================================
-- Slug uniqueness is enforced by the existing rooms trigger/constraint.
-- Do not inline slug generation.

create or replace function public.create_private_debate_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_proposition_title text,
  p_opposition_title text,
  p_opening_statement text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  v_room_id := gen_random_uuid();

  insert into public.rooms (id, title, description, room_type, topic_id, visibility, status, created_by)
  values (
    v_room_id,
    p_title,
    p_description,
    'debate',
    p_topic_id,
    'private',
    'open',
    auth.uid()
  )
  returning id into v_room_id;

  insert into public.debates (id, proposition_title, opposition_title, opening_statement)
  values (v_room_id, p_proposition_title, p_opposition_title, p_opening_statement);

  insert into public.debate_participants (room_id, user_id, side)
  values (v_room_id, auth.uid(), 'proposition');

  return v_room_id;
end;
$$;

revoke all on function public.create_private_debate_room(text, text, uuid, text, text, text) from public, anon;
grant execute on function public.create_private_debate_room(text, text, uuid, text, text, text) to authenticated;

-- ============================================================================
-- 9. Invitation acceptance with state guards
-- ============================================================================
-- Validates room existence, archived state, visibility, removed status,
-- and invitation validity before creating membership.

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
  v_invitation_id uuid;
  v_room_visibility text;
  v_room_status text;
  v_is_removed boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to accept an invitation.';
  end if;

  -- Room existence and state checks
  select visibility, status into v_room_visibility, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot join an archived room.';
  end if;

  -- Removed-participant check for private rooms
  if v_room_visibility = 'private' then
    select exists (
      select 1 from public.debate_participants
      where room_id = p_room_id and user_id = v_user_id and removed_at is not null
    ) into v_is_removed;

    if v_is_removed then
      raise exception 'not_authorized' using hint = 'You have been removed from this room.';
    end if;
  end if;

  -- Invitation validation
  select id into v_invitation_id
  from public.room_invitations
  where room_id = p_room_id
    and status = 'active'
    and invitation_token = p_invitation_token
    and (invited_user_id = v_user_id or email = (select email from auth.users where id = v_user_id));

  if v_invitation_id is null then
    raise exception 'invalid_invitation' using hint = 'Invitation not found or expired.';
  end if;

  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, 'neutral')
  on conflict (room_id, user_id) where removed_at is null do nothing;

  update public.room_invitations
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_invitation_id;

  return p_room_id;
end;
$$;

revoke all on function public.accept_invitation(text, uuid) from public, anon;
grant execute on function public.accept_invitation(text, uuid) to authenticated;

-- ============================================================================
-- 10. Access-code join with state guards and brute-force protection
-- ============================================================================
-- Validates room existence, archived state, visibility, removed status,
-- rate-limit failures, and room-level access-code validity before joining.
-- The access code is room-level and reusable; possession never equals membership.

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
  v_room_access_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to join.';
  end if;

  -- Room existence and state checks
  select visibility, status, access_code into v_room_visibility, v_room_status, v_room_access_code
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot join an archived room.';
  end if;

  -- Removed-participant check for private rooms
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

  -- Rate-limit check
  select failures into v_failures
  from public.access_code_failures
  where room_id = p_room_id and user_id = v_user_id;

  if v_failures >= 5 then
    raise exception 'too_many_attempts' using hint = 'Too many failed attempts. Try again later.';
  end if;

  if upper(v_room_access_code) <> upper(p_code) then
    call public.record_access_code_failure(p_room_id, v_user_id);

    raise exception 'invalid_access_code' using hint = 'Invalid access code.';
  end if;

  -- Clear failures on success
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

-- ============================================================================
-- 11. Participant removal with owner self-removal guard
-- ============================================================================
-- Soft removal preserves history and prevents rejoin through alternate paths.

create or replace function public.remove_participant(
  p_room_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.created_by = auth.uid()
  ) then
    raise exception 'not_authorized' using hint = 'Only the room owner can remove participants.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot_remove_self' using hint = 'You cannot remove yourself from your own room.';
  end if;

  update public.debate_participants
  set removed_at = now()
  where room_id = p_room_id and user_id = p_user_id and removed_at is null;

  if not found then
    raise exception 'participant_not_found' using hint = 'Participant is not in this room.';
  end if;
end;
$$;

revoke all on function public.remove_participant(uuid, uuid) from public, anon;
grant execute on function public.remove_participant(uuid, uuid) to authenticated;

-- ============================================================================
-- 12. Private -> public transition with invitation revocation
-- ============================================================================
-- One-way transition only. Uses GUC to authorize visibility change.

create or replace function public.make_room_public(
  p_room_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.created_by = auth.uid()
  ) then
    raise exception 'not_authorized' using hint = 'Only the room owner can change visibility.';
  end if;

  perform set_config('discora.allow_visibility_change', 'true', true);

  update public.rooms
  set visibility = 'public', access_code = null, updated_at = now()
  where id = p_room_id and visibility = 'private';

  perform set_config('discora.allow_visibility_change', '', true);

  if not found then
    raise exception 'invalid_transition' using hint = 'Room is already public or cannot be made public.';
  end if;

  update public.room_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where room_id = p_room_id and status = 'active';
end;
$$;

revoke all on function public.make_room_public(uuid) from public, anon;
grant execute on function public.make_room_public(uuid) to authenticated;

-- ============================================================================
-- 13. Room access code management
-- ============================================================================
-- Owner can set, regenerate, or revoke the room-level access code.
-- Null/empty clears the code. Setting a code makes it active.

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
    set access_code = trim(p_code), updated_at = now()
    where id = p_room_id;
  end if;
end;
$$;

revoke all on function public.set_room_access_code(uuid, text) from public, anon;
grant execute on function public.set_room_access_code(uuid, text) to authenticated;

-- ============================================================================
-- 14. Private member discovery
-- ============================================================================
-- get_my_debates_attention must use has_room_access() so active participants
-- in private debates remain visible in their personal feed.

create or replace function public.get_my_debates_attention()
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select array(
  select json_build_object(
    'room_id', d.id,
    'title', r.title,
    'slug', r.slug,
    'proposition_title', d.proposition_title,
    'opposition_title', d.opposition_title,
    'status', d.status,
    'my_side', dp.side,
    'my_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id and c.created_by = auth.uid() and c.is_retracted = false
    ),
    'opposing_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id
        and c.created_by != auth.uid()
        and c.debate_side != dp.side
        and c.is_retracted = false
    ),
    'last_activity_at', greatest(
      d.created_at,
      coalesce(
        (select max(created_at) from claims c2 where c2.room_id = d.id and not c2.is_retracted),
        d.created_at
      ),
      coalesce(
        (select max(e.created_at)
         from claims c3
         inner join claim_evidence ce on ce.claim_id = c3.id
         inner join evidence e on e.id = ce.evidence_id
         where c3.room_id = d.id and not c3.is_retracted and not e.is_retracted),
        d.created_at
      ),
      coalesce(
        (select max(dp2.joined_at) from debate_participants dp2 where dp2.room_id = d.id),
        d.created_at
      )
    )
  )
  from debates d
  join rooms r on r.id = d.id
  join debate_participants dp on dp.room_id = d.id and dp.user_id = auth.uid()
  where d.status = 'active'
    and dp.side in ('proposition', 'opposition')
    and public.has_room_access(r.id)
  order by greatest(
    d.created_at,
    coalesce(
      (select max(created_at) from claims c2 where c2.room_id = d.id and not c2.is_retracted),
      d.created_at
    ),
    coalesce(
      (select max(e.created_at)
       from claims c3
       inner join claim_evidence ce on ce.claim_id = c3.id
       inner join evidence e on e.id = ce.evidence_id
       where c3.room_id = d.id and not c3.is_retracted and not e.is_retracted),
      d.created_at
    ),
    coalesce(
      (select max(dp2.joined_at) from debate_participants dp2 where dp2.room_id = d.id),
      d.created_at
    )
  ) desc nulls last
);
$$;

grant execute on function public.get_my_debates_attention to authenticated;

-- ============================================================================
-- 14. Verification notes
-- ============================================================================
-- This migration does not implement UI. It only hardens the database
-- foundation for private debate creation, invitations, access codes,
-- membership, and publish flow.
--
-- Access-code semantics: the room-level access code is stored on public.rooms
-- and is reusable across multiple joins. Invitation tokens remain invitation-level.
-- make_room_public() clears the room access code and revokes active invitations.
--
-- access_code exposure: rooms.access_code is protected by existing room RLS.
-- Private rooms are only readable by owner/active participants, who already have
-- room access. Public rooms have access_code cleared on transition. No client
-- code explicitly reads access_code; DbRoomRow does not map it. Left unchanged
-- because the column is not a standalone secret—the room RLS boundary is.
