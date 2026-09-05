-- Phase 4B: Add time-based recovery to access-code rate limiting
--
-- Without time decay, 5 failed attempts permanently lock a user out
-- until an owner manually clears the counter. This migration adds a
-- 15-minute sliding window so rate limits auto-expire.

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
  v_last_failure timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to join.';
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

  if upper(v_room_access_code) <> upper(p_code) then
    insert into public.access_code_failures (room_id, user_id, failures)
    values (p_room_id, v_user_id, 1)
    on conflict (room_id, user_id) do update set
      failures = access_code_failures.failures + 1,
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
