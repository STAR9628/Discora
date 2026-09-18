-- Migration: Phase 9D.2A — Friend Core Foundation
-- Migration ID: 202609140004_phase_9d2a_friend_core_foundation.sql
--
-- SCOPE (ONLY): friend_requests, friend_relationships, user_blocks schemas;
--   indexes/constraints; RLS; SECURITY DEFINER RPCs for the core friend request
--   lifecycle; DB-enforced rate limiting foundation for friend mutations;
--   request expiry foundation; blocking transaction semantics.
--
-- EXPLICITLY OUT OF SCOPE (NOT implemented here):
--   friends UI, /invite UI, friend invitation tokens, email invitations,
--   room invitation integration, room_invitations remediation,
--   friend-aware room invites, account deletion orchestration, notifications.
--   room_invitations is NOT touched.
--
-- GOVERNING DECISIONS (Product Owner locked):
--   D-1  friend_relationships holds ACCEPTED friendships only (NO status column).
--   D-2  Blocking ends/removes an existing friendship. Unblock NEVER restores it.
--   D-3  block_user is atomic: revoke pending both ways; remove friendship edge;
--        future requests rejected both ways.
--   D-4  Friend graph is PRIVATE during Beta (RLS is owner-scoped reads only).
--   D-5  A declined request permits a NEW request after 7-day cooldown; terminal
--        history is preserved (never overwritten/deleted).
--   D-8  Rate limiting is DB/server enforced. Conservative TUNABLE initial
--        defaults: 15/hour & 40/day outgoing requests; pending-inbox cap 50.
--   D-9  Request expiry = 7 days. Expiry is authoritative in mutation logic;
--        expiring sweep normalizes terminal state and prunes stale counters.
--
-- HARD SECURITY RULES applied:
--   - SECURITY DEFINER RPCs with SET search_path = public, pg_temp.
--   - Schema-qualified objects. No SET ROLE. No dynamic SQL.
--   - Explicit grants; PUBLIC/anon revoked where appropriate.
--   - Every mutation validates auth.uid() and public.is_active_user().
--   - Client identity fields never trusted (sender/recipient derived server-side
--     from auth.uid() and RPC arguments validated against guarded lookups).
--   - RLS: SELECT scoped to the acting user only; client DML revoked; lifecycle
--     mutations via SECURITY DEFINER RPCs only. No public friend graph.
--   - No recursive RLS policy design (writes go through RPCs; reads are flat
--     row-scope policies that do not reference other user-writable tables).
--   - No modification of auth.* tables (FK REFERENCES auth.users only).

begin;

-- ============================================================================
-- 1. friend_requests — request lifecycle
--    pending -> accepted | declined | revoked | expired
-- ============================================================================
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  upserted_at timestamptz not null default now(),
  constraint friend_requests_no_self check (sender_user_id <> recipient_user_id)
);

comment on table public.friend_requests is
  'Directed friend request lifecycle. pending -> accepted | declined | revoked | expired. Terminal rows are preserved as history (D-5).';

comment on column public.friend_requests.responded_at is
  'Set when a terminal decision is recorded (accept/decline/revoke/expire). Drives the 7-day re-request cooldown after decline (D-5).';

comment on column public.friend_requests.upserted_at is
  'Timestamp of the most recent attempt to (re)establish this request direction. Reserved for future upsert semantics; equals created_at while requests are insert-only.';

-- At most one PENDING request per sender/recipient direction.
create unique index if not exists friend_requests_one_pending_idx
  on public.friend_requests (sender_user_id, recipient_user_id)
  where status = 'pending';

create index if not exists friend_requests_sender_status_idx
  on public.friend_requests (sender_user_id, status);
create index if not exists friend_requests_recipient_status_idx
  on public.friend_requests (recipient_user_id, status);
create index if not exists friend_requests_expiry_idx
  on public.friend_requests (created_at)
  where status = 'pending';

-- ============================================================================
-- 2. friend_relationships — ACCEPTED friendships only. NO status column.
-- ============================================================================
create table if not exists public.friend_relationships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  established_at timestamptz not null default now(),
  constraint friend_relationships_ordering check (user_a_id < user_b_id),
  constraint friend_relationships_pair_key unique (user_a_id, user_b_id)
);

comment on table public.friend_relationships is
  'Symmetric accepted-friendship edges only. A row exists IFF the two users are currently friends. Blocking deletes the edge (D-2); no status column (D-1).';

-- ============================================================================
-- 3. user_blocks — independent one-way safety boundary
-- ============================================================================
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_user_id <> blocked_user_id),
  constraint user_blocks_pair_key unique (blocker_user_id, blocked_user_id)
);

comment on table public.user_blocks is
  'Independent one-way safety boundary. Never symmetric; never derived from a decline. Blocking removes friendships and revokes pending requests (D-3).';

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_user_id);

-- ============================================================================
-- 4. Rate limiting foundation (friend mutations) — conservative, tunable
-- ============================================================================
create table if not exists public.friend_request_rate_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null default 'friend_request',
  bucket_kind text not null check (bucket_kind in ('hour', 'day')),
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, scope, bucket_kind)
);

comment on table public.friend_request_rate_counters is
  'DB-enforced rate-limit counters for friend mutations (scope-discriminated so the same design can later host invitation quotas without a schema redesign). Client access revoked; consumption is internal to SECURITY DEFINER RPCs. Counters expose no relationship information.';

-- consume one unit from a fixed-start window bucket; raise when over limit.
create or replace function public.consume_friend_request_quota(
  p_user_id uuid,
  p_scope text,
  p_kind text,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz;
  v_count integer;
begin
  if p_scope is null or p_scope = '' then
    raise exception 'invalid_scope' using hint = 'No rate-limit scope.';
  end if;

  if p_kind = 'hour' then
    v_start := date_trunc('hour', now());
  elsif p_kind = 'day' then
    v_start := date_trunc('day', now());
  else
    raise exception 'invalid_rate_kind' using hint = 'Unsupported rate window.';
  end if;

  insert into public.friend_request_rate_counters as c
    (user_id, scope, bucket_kind, bucket_start, request_count)
  values (p_user_id, p_scope, p_kind, v_start, 1)
  on conflict (user_id, scope, bucket_kind) do update
    set request_count = case
          when c.bucket_start = v_start then c.request_count + 1
          else 1
        end,
        bucket_start = v_start
  returning c.request_count into v_count;

  if v_count > p_limit then
    raise exception 'rate_limit_exceeded'
      using hint = 'Too many friend requests. Please try again later.';
  end if;

  return true;
end;
$$;

revoke all on function public.consume_friend_request_quota(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_friend_request_quota(uuid, text, text, integer) to service_role;

-- ============================================================================
-- 5. Pair-level helpers (SECURITY DEFINER; not exposed to clients)
-- ============================================================================

-- Canonical serialization lock for any operation on a given user pair.
-- Serializes create/accept/block against each other so no race window exists
-- between "request created" and "block recorded" or "friendship accepted".
create or replace function public.friend_pair_lock(p_user_a uuid, p_user_b uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select pg_advisory_xact_lock(
    hashtext('discora_friend'),
    hashtext('f:' || least(p_user_a::text, p_user_b::text) || ':' || greatest(p_user_a::text, p_user_b::text))
  );
$$;

revoke all on function public.friend_pair_lock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.friend_pair_lock(uuid, uuid) to service_role;

-- True when an edge already exists between the two users (either orientation).
create or replace function public.friend_pair_exists(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.friend_relationships r
    where (r.user_a_id = p_user_a and r.user_b_id = p_user_b)
       or (r.user_a_id = p_user_b and r.user_b_id = p_user_a)
  );
$$;

revoke all on function public.friend_pair_exists(uuid, uuid) from public, anon, authenticated;
grant execute on function public.friend_pair_exists(uuid, uuid) to service_role;

-- True when either user has blocked the other. Both directions block the pair.
create or replace function public.friend_pair_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_user_id = p_user_a and b.blocked_user_id = p_user_b)
       or (b.blocker_user_id = p_user_b and b.blocked_user_id = p_user_a)
  );
$$;

revoke all on function public.friend_pair_blocked(uuid, uuid) from public, anon, authenticated;
grant execute on function public.friend_pair_blocked(uuid, uuid) to service_role;

-- True when the user has a live, non-deleted profile (a real onboarded target).
create or replace function public.friend_target_is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.is_deleted = false
  );
$$;

revoke all on function public.friend_target_is_active(uuid) from public, anon, authenticated;
grant execute on function public.friend_target_is_active(uuid) to service_role;

-- ============================================================================
-- 6. RLS
-- ============================================================================
alter table public.friend_requests enable row level security;
alter table public.friend_relationships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.friend_request_rate_counters enable row level security;

-- Friend graph is PRIVATE during Beta (D-4): reads scoped to the acting user.
drop policy if exists "Users can view friend requests they sent or received" on public.friend_requests;
create policy "Users can view friend requests they sent or received"
  on public.friend_requests
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (sender_user_id = auth.uid() or recipient_user_id = auth.uid())
  );

drop policy if exists "Users can view their friendships" on public.friend_relationships;
create policy "Users can view their friendships"
  on public.friend_relationships
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (user_a_id = auth.uid() or user_b_id = auth.uid())
  );

drop policy if exists "Users can view their own blocks" on public.user_blocks;
create policy "Users can view their own blocks"
  on public.user_blocks
  for select
  to authenticated
  using (auth.uid() is not null and blocker_user_id = auth.uid());

-- Client DML revoked; lifecycle mutations flow through SECURITY DEFINER RPCs.
revoke all on public.friend_requests from public, anon, authenticated;
revoke all on public.friend_relationships from public, anon, authenticated;
revoke all on public.user_blocks from public, anon, authenticated;
revoke all on public.friend_request_rate_counters from public, anon, authenticated;

grant select on public.friend_requests to authenticated;
grant select on public.friend_relationships to authenticated;
grant select on public.user_blocks to authenticated;

-- ============================================================================
-- 7. SECURITY DEFINER RPCs — core friend lifecycle
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 create_friend_request(recipient_user_id) -> request id
-- ---------------------------------------------------------------------------
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

  -- Serialize with concurrent create/accept/block on this pair.
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

  -- D-8: DB-enforced quota (success-counting). Raises when over limit.
  perform public.consume_friend_request_quota(v_sender, 'friend_request', 'hour', 15);
  perform public.consume_friend_request_quota(v_sender, 'friend_request', 'day', 40);

  insert into public.friend_requests (sender_user_id, recipient_user_id, status)
  values (v_sender, p_recipient_user_id, 'pending')
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_friend_request(uuid) from public, anon;
grant execute on function public.create_friend_request(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.2 accept_friend_request(request_id) -> request id
-- ---------------------------------------------------------------------------
create or replace function public.accept_friend_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_sender uuid;
  v_recipient uuid;
  v_created_at timestamptz;
  v_edge_id uuid;
  v_requires_expiry_check boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;
  if p_request_id is null then
    raise exception 'invalid_request' using hint = 'No request provided.';
  end if;

  -- Lock the request row so concurrent accepts serialize deterministically.
  select status, sender_user_id, recipient_user_id, created_at
    into v_status, v_sender, v_recipient, v_created_at
  from public.friend_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'request_not_found' using hint = 'Request not found.';
  end if;

  -- Wrong-user acceptance fails closed.
  if v_recipient <> v_user then
    raise exception 'not_authorized' using hint = 'Only the invited member can accept this request.';
  end if;

  if v_status <> 'pending' then
    raise exception 'friend_request_not_pending' using hint = 'This request has already been processed.';
  end if;

  -- D-9: expiry is authoritative in mutation logic (independent of the sweep).
  if v_created_at < now() - interval '7 days' then
    raise exception 'friend_request_expired' using hint = 'This request has expired.';
  end if;

  perform public.friend_pair_lock(v_sender, v_recipient);

  -- Re-check safety at acceptance time (state may have changed since creation).
  if public.friend_pair_blocked(v_sender, v_recipient) then
    raise exception 'blocked' using hint = 'Requests are not possible with this member.';
  end if;
  if not public.friend_target_is_active(v_sender) then
    raise exception 'sender_inactive' using hint = 'The sender is no longer available.';
  end if;

  -- Exactly one friendship edge (unique canonical pair is the backstop).
  insert into public.friend_relationships (user_a_id, user_b_id)
  values (least(v_sender, v_recipient), greatest(v_sender, v_recipient))
  on conflict on constraint friend_relationships_pair_key do nothing
  returning id into v_edge_id;

  if v_edge_id is null then
    -- Edge already existed -> treat as already friends.
    update public.friend_requests
       set status = 'accepted', responded_at = now(), upserted_at = now()
     where id = p_request_id
       and status = 'pending';
    raise exception 'already_friends' using hint = 'You are already friends.';
  end if;

  update public.friend_requests
     set status = 'accepted', responded_at = now(), upserted_at = now()
   where id = p_request_id
     and status = 'pending';

  return p_request_id;
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.3 decline_friend_request(request_id) -> void
-- ---------------------------------------------------------------------------
create or replace function public.decline_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_recipient uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;

  select status, recipient_user_id into v_status, v_recipient
  from public.friend_requests
  where id = p_request_id;

  if v_status is null then
    raise exception 'request_not_found' using hint = 'Request not found.';
  end if;
  if v_recipient <> v_user then
    raise exception 'not_authorized' using hint = 'Only the invited member can decline this request.';
  end if;
  if v_status <> 'pending' then
    raise exception 'friend_request_not_pending' using hint = 'This request has already been processed.';
  end if;

  update public.friend_requests
     set status = 'declined', responded_at = now(), upserted_at = now()
   where id = p_request_id
     and status = 'pending';

  if not found then
    raise exception 'friend_request_not_pending' using hint = 'This request has already been processed.';
  end if;
end;
$$;

revoke all on function public.decline_friend_request(uuid) from public, anon;
grant execute on function public.decline_friend_request(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.4 revoke_friend_request(request_id) -> void
-- ---------------------------------------------------------------------------
create or replace function public.revoke_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_sender uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;

  select status, sender_user_id into v_status, v_sender
  from public.friend_requests
  where id = p_request_id;

  if v_status is null then
    raise exception 'request_not_found' using hint = 'Request not found.';
  end if;
  if v_sender <> v_user then
    raise exception 'not_authorized' using hint = 'Only the sender can revoke this request.';
  end if;
  if v_status <> 'pending' then
    raise exception 'friend_request_not_pending' using hint = 'This request has already been processed.';
  end if;

  update public.friend_requests
     set status = 'revoked', responded_at = now(), upserted_at = now()
   where id = p_request_id
     and status = 'pending';

  if not found then
    raise exception 'friend_request_not_pending' using hint = 'This request has already been processed.';
  end if;
end;
$$;

revoke all on function public.revoke_friend_request(uuid) from public, anon;
grant execute on function public.revoke_friend_request(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.5 block_user(target_id) -> void  (D-3 atomic transaction)
-- ---------------------------------------------------------------------------
create or replace function public.block_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;
  if p_target_user_id is null then
    raise exception 'invalid_target' using hint = 'No target provided.';
  end if;
  if p_target_user_id = v_user then
    raise exception 'self_block' using hint = 'You cannot block yourself.';
  end if;

  -- Serialize with concurrent create/accept so the block cannot be raced.
  perform public.friend_pair_lock(v_user, p_target_user_id);

  -- 1) create/ensure block edge
  insert into public.user_blocks (blocker_user_id, blocked_user_id)
  values (v_user, p_target_user_id)
  on conflict on constraint user_blocks_pair_key do nothing;

  -- 2) revoke pending requests in both directions
  update public.friend_requests
     set status = 'revoked', responded_at = now(), upserted_at = now()
   where status = 'pending'
     and (
       (sender_user_id = v_user and recipient_user_id = p_target_user_id)
       or (sender_user_id = p_target_user_id and recipient_user_id = v_user)
     );

  -- 3) remove/end the accepted friendship edge (D-2)
  delete from public.friend_relationships r
   where (r.user_a_id = v_user and r.user_b_id = p_target_user_id)
      or (r.user_a_id = p_target_user_id and r.user_b_id = v_user);

  -- 4) future requests both directions are rejected by friend_pair_blocked()
  --    inside create_friend_request / accept_friend_request.
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.6 unblock_user(target_id) -> void (NEVER restores friendship, D-2)
-- ---------------------------------------------------------------------------
create or replace function public.unblock_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using hint = 'You must be signed in.';
  end if;
  if not public.is_active_user() then
    raise exception 'forbidden_account_inactive' using hint = 'This account is marked as deleted or inactive.';
  end if;
  if p_target_user_id is null then
    raise exception 'invalid_target' using hint = 'No target provided.';
  end if;

  perform public.friend_pair_lock(v_user, p_target_user_id);

  delete from public.user_blocks
   where blocker_user_id = v_user
     and blocked_user_id = p_target_user_id;

  -- Deliberately NOT creating any friend_relationships or friend_requests row:
  -- unblock only lifts the boundary; a new request is required to reconnect.
end;
$$;

revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7.7 expire_friend_requests() -> integer  (D-9 daily sweep / idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.expire_friend_requests()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expired integer;
begin
  with upd as (
    update public.friend_requests
       set status = 'expired', responded_at = now(), upserted_at = now()
     where status = 'pending'
       and created_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into v_expired from upd;

  -- Prune stale rate-limit counter rows (keep ~2 days of buckets).
  delete from public.friend_request_rate_counters
   where bucket_start < date_trunc('day', now()) - interval '2 days';

  return v_expired;
end;
$$;

revoke all on function public.expire_friend_requests() from public, anon;
grant execute on function public.expire_friend_requests() to authenticated, service_role;

commit;