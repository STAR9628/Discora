-- Phase 4B: Create room_invitation RPC
--
-- Adds a SECURITY DEFINER RPC for creating room invitations.
-- Authorization is enforced server-side:
--   - Room owner can always create invitations
--   - Active participants can create invitations only when participant_invites_enabled = true
--   - Removed participants cannot create invitations
--   - Non-members cannot create invitations

create or replace function public.create_room_invitation(
  p_room_id uuid,
  p_invited_user_id uuid,
  p_invited_email text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_room_visibility text;
  v_room_status text;
  v_is_participant boolean;
  v_is_owner boolean;
  v_invitation_token text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create invitations.';
  end if;

  select visibility, status into v_room_visibility, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_visibility <> 'private' then
    raise exception 'invalid_room_state' using hint = 'Invitations can only be created for private rooms.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot create invitations for an archived room.';
  end if;

  v_is_owner := exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.created_by = v_user_id
  );

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

  if p_invited_user_id = v_user_id then
    raise exception 'cannot_invite_self' using hint = 'You cannot invite yourself.';
  end if;

  v_invitation_token := encode(gen_random_bytes(32), 'base64url');

  insert into public.room_invitations (
    room_id, invited_by, invited_user_id, email, invitation_token, status
  ) values (
    p_room_id, v_user_id, p_invited_user_id, p_invited_email, v_invitation_token, 'active'
  );

  return v_invitation_token;
end;
$$;

revoke all on function public.create_room_invitation(uuid, uuid, text) from public, anon;
grant execute on function public.create_room_invitation(uuid, uuid, text) to authenticated;

-- ============================================================================
-- Minimal gate info for private debate routing
-- ============================================================================
-- Allows the debate page to render a private access gate for non-members
-- without exposing private room content or metadata (no title, topic, premise,
-- participants, claims, evidence, or contributions).

create or replace function public.get_private_room_gate(p_slug text)
returns table(
  id uuid,
  slug text,
  visibility text,
  room_type text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.slug, r.visibility, r.room_type
  from public.rooms r
  where r.slug = p_slug
    and r.room_type = 'debate'
    and r.visibility = 'private'
    and r.status <> 'archived';
$$;

revoke all on function public.get_private_room_gate(text) from public, anon;
grant execute on function public.get_private_room_gate(text) to anon, authenticated;

-- ============================================================================
-- Participant invitation toggle
-- ============================================================================
-- Owner-only control for allowing active participants to invite others.
-- Strictly limited to active private rooms.

create or replace function public.set_participant_invites_enabled(
  p_room_id uuid,
  p_enabled boolean
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
    raise exception 'not_authorized' using hint = 'Only the room owner can change this setting.';
  end if;

  select visibility, status into v_room_visibility, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_visibility is null then
    raise exception 'room_not_found' using hint = 'Room does not exist.';
  end if;

  if v_room_visibility <> 'private' then
    raise exception 'invalid_room_state' using hint = 'Participant invitations can only be configured for private rooms.';
  end if;

  if v_room_status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot modify settings on an archived room.';
  end if;

  update public.rooms
  set participant_invites_enabled = p_enabled, updated_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.set_participant_invites_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_participant_invites_enabled(uuid, boolean) to authenticated;

-- ============================================================================
-- room_invitations security hardening
-- ============================================================================
-- Remove direct authenticated INSERT; invitation creation must go through
-- create_room_invitation() RPC. Retain SELECT and UPDATE for owner management.

drop policy if exists "Room owners can create invitations" on public.room_invitations;
drop policy if exists "Participants can create invitations if enabled" on public.room_invitations;
drop policy if exists "Room owners can delete invitations" on public.room_invitations;

revoke insert, delete on public.room_invitations from public, anon, authenticated;
grant select, update on public.room_invitations to authenticated;

