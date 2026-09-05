-- Migration: 202606230016_phase4b_p0_security_remediation.sql
-- Description: Remediates Phase 4B production blockers:
-- 1. P0-1: Scopes public.debates SELECT policy using public.has_room_access(id) to prevent private metadata leak.
-- 2. P0-2: Replaces unsupported 'base64url' encoding in create_room_invitation with robust URL-safe 64-char hex encoding.

-- ============================================================================
-- P0-1: Scope public.debates RLS
-- ============================================================================
alter table public.debates enable row level security;

drop policy if exists "Anyone can view debates" on public.debates;
drop policy if exists "Debate creators can view their own debates" on public.debates;
drop policy if exists "Debates are viewable in authorized rooms" on public.debates;

create policy "Debates are viewable in authorized rooms"
  on public.debates
  for select
  using (public.has_room_access(id));

-- ============================================================================
-- P0-2: Fix create_room_invitation encoding crash
-- ============================================================================
create or replace function public.create_room_invitation(
  p_room_id uuid,
  p_invited_user_id uuid default null,
  p_invited_email text default null
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_room record;
  v_is_owner boolean := false;
  v_is_participant boolean := false;
  v_invitation_token text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create invitations.';
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

  if p_invited_user_id = v_user_id then
    raise exception 'cannot_invite_self' using hint = 'You cannot invite yourself.';
  end if;

  -- URL-safe cryptographic token (256-bit entropy via hex encoding)
  v_invitation_token := encode(gen_random_bytes(32), 'hex');

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
