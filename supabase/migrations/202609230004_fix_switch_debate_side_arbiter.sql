-- Migration: Repair switch_debate_side upsert arbiter
--
-- FINDING: switch_debate_side fails at runtime with "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification". Root cause:
-- migration 202606220001 intentionally replaced UNIQUE(room_id, user_id) with
-- the partial unique index idx_debate_participants_active_unique
-- (... WHERE removed_at IS NULL) for soft-removal + rejoin, but the
-- switch_debate_side body (from 202606110002) still arbitrates with the
-- retired plain form ON CONFLICT (room_id, user_id).
--
-- FIX: this migration recreates switch_debate_side byte-identically EXCEPT
-- the arbiter clause, which now uses the canonical predicate form already
-- established in this codebase (accept_invitation, join_with_access_code):
--   ON CONFLICT (room_id, user_id) WHERE removed_at IS NULL DO UPDATE ...
-- Verified against the live partial index in a rolled-back scratch
-- transaction (conflict matched, side flipped, still exactly one active row).
--
-- Scope: one clause. Cooldown (24h), rationale (50 chars), neutral-switch
-- rule, side-change history, system message, and reputation event are
-- untouched. CREATE OR REPLACE preserves owner, SECURITY DEFINER, and
-- existing grants. No RLS changes.
--
-- Safety: re-runnable (CREATE OR REPLACE). No data touched.

create or replace function public.switch_debate_side(
  p_room_id uuid,
  p_new_side text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_side text;
  v_change_id uuid;
  v_system_message text;
  v_message_id uuid;
  v_username text;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to switch sides.';
  end if;

  -- Get username for system message
  select p.username into v_username
  from public.profiles p
  where p.id = v_user_id;

  -- Validate reason length
  if length(trim(p_reason)) < 50 then
    raise exception 'reason_too_short' using hint = 'Reason must be at least 50 characters.';
  end if;

  -- Validate new side
  if p_new_side not in ('proposition', 'opposition') then
    raise exception 'invalid_side' using hint = 'Side must be proposition or opposition.';
  end if;

  -- Get current participation
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    raise exception 'not_participating' using hint = 'You must join the debate before switching sides.';
  end if;

  if v_current_side = p_new_side then
    raise exception 'same_side' using hint = 'You are already on this side.';
  end if;

  if v_current_side = 'neutral' then
    raise exception 'neutral_switch' using hint = 'Neutral observers cannot switch sides directly. Leave and rejoin.';
  end if;

  -- Check 24-hour cooldown against latest side change
  if exists (
    select 1
    from public.debate_side_changes dsc
    where dsc.room_id = p_room_id
      and dsc.user_id = v_user_id
      and dsc.created_at >= now() - interval '24 hours'
  ) then
    raise exception 'cooldown_active' using hint = 'You can only switch sides once every 24 hours. Please wait before changing again.';
  end if;

  -- UPSERT participant with new side. Arbiter matches the canonical partial
  -- unique index (see header); the retired plain column form 400s.
  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, p_new_side)
  on conflict (room_id, user_id) where removed_at is null
  do update set side = p_new_side, joined_at = now();

  -- Insert immutable side change record
  insert into public.debate_side_changes (room_id, user_id, previous_side, new_side, reason)
  values (p_room_id, v_user_id, v_current_side, p_new_side, trim(p_reason))
  returning id into v_change_id;

  -- Create system message
  v_system_message :=
    coalesce(v_username, 'Someone') ||
    ' switched from ' ||
    case when v_current_side = 'proposition' then 'Support' else 'Challenge' end ||
    ' to ' ||
    case when p_new_side = 'proposition' then 'Support' else 'Challenge' end ||
    '. Reason: ' || trim(p_reason);

  perform public.post_system_message(p_room_id, v_system_message);

  -- Create reputation event (0 points — tracking only, no reward)
  perform public.create_reputation_event(
    v_user_id,
    'SIDE_SWITCHED',
    0,
    jsonb_build_object(
      'room_id', p_room_id,
      'previous_side', v_current_side,
      'new_side', p_new_side,
      'reason', trim(p_reason),
      'side_change_id', v_change_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'side_change_id', v_change_id,
    'previous_side', v_current_side,
    'new_side', p_new_side
  );
end;
$$;
