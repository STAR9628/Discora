-- Migration: Create side switching infrastructure
-- This migration is append-only. It does not modify existing data.

-- 1. Create debate_side_changes table (immutable, append-only audit trail)
create table if not exists public.debate_side_changes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_side text not null check (previous_side in ('proposition', 'opposition')),
  new_side text not null check (new_side in ('proposition', 'opposition')),
  reason text not null check (char_length(reason) >= 50),
  created_at timestamptz not null default now()
);

-- Prevent updates and deletes on debate_side_changes
create or replace function public.prevent_debate_side_change_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'debate_side_changes are immutable: % of row is not allowed', tg_op
    using hint = 'Side change records can only be created. Updates and deletes are prohibited.';
end;
$$;

drop trigger if exists trg_debate_side_changes_immutable_update on public.debate_side_changes;
create trigger trg_debate_side_changes_immutable_update
  before update on public.debate_side_changes
  for each row
  execute function public.prevent_debate_side_change_mutation();

drop trigger if exists trg_debate_side_changes_immutable_delete on public.debate_side_changes;
create trigger trg_debate_side_changes_immutable_delete
  before delete on public.debate_side_changes
  for each row
  execute function public.prevent_debate_side_change_mutation();

-- RLS: Users can only view their own side changes
alter table public.debate_side_changes enable row level security;

drop policy if exists "Users can view own side changes" on public.debate_side_changes;
create policy "Users can view own side changes"
  on public.debate_side_changes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own side changes" on public.debate_side_changes;
create policy "Users can insert own side changes"
  on public.debate_side_changes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 2. Add 'system' to messages message_type check constraint
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('message', 'question', 'system'));

-- 3. Update handle_message_identity_mode trigger to handle system messages
create or replace function public.handle_message_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

-- 4. Update discussion_messages view to handle system messages
drop view if exists public.discussion_messages;
create view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  m.content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.message_type = 'system' then 'System'
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.messages m
left join public.profiles p on m.user_id = p.id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_messages to anon, authenticated;

-- 5. Create post_system_message RPC (bypasses RLS with security definer)
create or replace function public.post_system_message(
  p_room_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  insert into public.messages (room_id, content, message_type, identity_mode, user_id)
  values (p_room_id, p_content, 'system', 'public', null)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

-- 6. Create switch_debate_side RPC (handles all side switch operations atomically)
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
