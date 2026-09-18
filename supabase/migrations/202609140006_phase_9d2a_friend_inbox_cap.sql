-- Migration: Phase 9D.2A Friend Inbox Cap (50 Pending Limit & Deadlock-Free Serialization)
-- Enforces hard database invariant:
--   For every recipient R: COUNT(friend_requests WHERE recipient_user_id = R AND status = 'pending') <= 50
--
-- Architecture:
-- 1. Partial Index on public.friend_requests (recipient_user_id) WHERE status = 'pending'
--    Ensures sub-millisecond count scans even with large historical tables.
-- 2. Recipient Transaction Advisory Lock (public.friend_recipient_lock)
--    Uses distinct advisory lock namespace: hashtext('discora_recipient_inbox')
--    Guaranteed zero collision with hashtext('discora_friend') pair-locks.
-- 3. Globally Monotonic Lock Ordering:
--    pair_lock -> recipient_lock
--    Mathematically eliminates deadlock cycles between concurrent pair and recipient operations.
-- 4. Atomic Enforcement in create_friend_request:
--    - Evaluates inbox cap under recipient advisory lock.
--    - Raises 'inbox_cap_reached' with hint 'This member has reached their pending friend request limit.'
--    - Evaluated before quota consumption; aborted transactions consume zero sender quota.

begin;

-- ============================================================================
-- 1. Indexing: Fast pending-count partial index
-- ============================================================================
create index if not exists friend_requests_recipient_pending_idx
  on public.friend_requests (recipient_user_id)
  where status = 'pending';

-- ============================================================================
-- 2. Recipient-level advisory lock helper (SECURITY DEFINER; internal)
-- ============================================================================
create or replace function public.friend_recipient_lock(p_recipient uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select pg_advisory_xact_lock(
    hashtext('discora_recipient_inbox'),
    hashtext('r:' || p_recipient::text)
  );
$$;

revoke all on function public.friend_recipient_lock(uuid) from public, anon, authenticated;
grant execute on function public.friend_recipient_lock(uuid) to service_role;

comment on function public.friend_recipient_lock(uuid) is
  'Transaction-scoped advisory lock serializing friend request creation targeting a specific recipient. Namespace distinct from friend_pair_lock.';

-- ============================================================================
-- 3. Atomic create_friend_request with recipient inbox cap enforcement
-- ============================================================================
create or replace function public.create_friend_request(p_recipient_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender uuid := auth.uid();
  v_last_status text;
  v_last_responded timestamptz;
  v_request_id uuid;
  v_pending_count integer;
begin
  if v_sender is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;
  if p_recipient_user_id is null then
    raise exception 'invalid_recipient' using hint = 'No recipient provided.';
  end if;
  if p_recipient_user_id = v_sender then
    raise exception 'self_request' using hint = 'You cannot send a friend request to yourself.';
  end if;
  if not public.friend_target_is_active(p_recipient_user_id) then
    raise exception 'recipient_inactive' using hint = 'This member is not available.';
  end if;

  -- 1. Pair-level lock: serializes concurrent operations on this specific pair
  perform public.friend_pair_lock(v_sender, p_recipient_user_id);

  if public.friend_pair_blocked(v_sender, p_recipient_user_id) then
    raise exception 'blocked' using hint = 'Requests are not possible with this member.';
  end if;
  if public.friend_pair_exists(v_sender, p_recipient_user_id) then
    raise exception 'already_friends' using hint = 'You are already friends.';
  end if;

  if exists (
    select 1 from public.friend_requests r
    where r.sender_user_id = v_sender
      and r.recipient_user_id = p_recipient_user_id
      and r.status = 'pending'
  ) then
    raise exception 'friend_request_pending' using hint = 'A request is already pending.';
  end if;

  -- D-5: cooldown after a decline (most recent row). History preserved.
  select r.status, r.responded_at
    into v_last_status, v_last_responded
  from public.friend_requests r
  where r.sender_user_id = v_sender
    and r.recipient_user_id = p_recipient_user_id
  order by r.created_at desc
  limit 1;

  if v_last_status = 'declined'
     and v_last_responded is not null
     and v_last_responded > now() - interval '7 days' then
    raise exception 'friend_request_cooldown'
      using hint = 'Please wait before sending another request.';
  end if;

  -- 2. Recipient inbox lock: serializes all concurrent request creations targeting this recipient
  -- Lock order: pair_lock -> recipient_lock (strictly monotonic order prevents deadlocks)
  perform public.friend_recipient_lock(p_recipient_user_id);

  -- 3. Hard recipient pending inbox cap (maximum 50 pending requests)
  select count(*) into v_pending_count
  from public.friend_requests
  where recipient_user_id = p_recipient_user_id
    and status = 'pending';

  if v_pending_count >= 50 then
    raise exception 'inbox_cap_reached'
      using hint = 'This member has reached their pending friend request limit.';
  end if;

  -- 4. D-8: DB-enforced quota (success-counting). Evaluated after inbox cap check.
  perform public.consume_friend_request_quota(v_sender, 'friend_request', 'hour', 15);
  perform public.consume_friend_request_quota(v_sender, 'friend_request', 'day', 40);

  -- 5. Insert pending friend request
  insert into public.friend_requests (sender_user_id, recipient_user_id, status)
  values (v_sender, p_recipient_user_id, 'pending')
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_friend_request(uuid) from public, anon;
grant execute on function public.create_friend_request(uuid) to authenticated, service_role;

commit;
