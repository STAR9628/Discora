-- Migration: Fix discussion_messages view (add back is_moderated) + 24h cooldown
-- This migration is append-only. It does not modify existing data.

-- 1. Fix discussion_messages view: merge moderation join from 202606040001
--    with system message handling from 202606110001, so neither is lost.
drop view if exists public.discussion_messages;
create view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when mf.message_id is not null then '[Message hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when mf.message_id is not null then null
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when mf.message_id is not null then 'Anonymous'
    when m.message_type = 'system' then 'System'
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when mf.message_id is not null then null
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  case
    when mf.message_id is not null then true
    else false
  end as is_moderated
from public.messages m
left join public.profiles p on m.user_id = p.id
left join (
  select distinct message_id
  from public.moderation_flags
  where status = 'resolved_hidden'
) mf on m.id = mf.message_id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_messages to anon, authenticated;

-- 2. Add 24-hour cooldown to switch_debate_side RPC
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

  -- UPSERT participant with new side
  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, p_new_side)
  on conflict (room_id, user_id)
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
