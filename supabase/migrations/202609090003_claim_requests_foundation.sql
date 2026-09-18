-- Phase 7D Phase A: Claim Requests Foundation
-- Implements aggregated Request-as-Claim: one request state per message, duplicate requester prevented,
-- requester count aggregation, author-only Accept/Skip/Decline, no reputation effects.
--
-- REVISION (R7, Phase F readiness gate): this file was an unapplied working-tree
-- draft (never committed, absent from the reachable database, referenced by no
-- deploy script). claim_requests_aggregated now gates on has_room_access()
-- instead of an inline public-or-creator check (private-debate participants
-- included, outsiders excluded). Nothing else changed.

-- 1. Create claim_requests table
create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'skipped', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_requests_unique_requester unique (message_id, requester_id)
);

-- 2. Indexes
create index if not exists claim_requests_message_id_idx on public.claim_requests (message_id);
create index if not exists claim_requests_requester_id_idx on public.claim_requests (requester_id);
create index if not exists claim_requests_room_id_idx on public.claim_requests (room_id);
create index if not exists claim_requests_status_idx on public.claim_requests (status);

-- 3. Trigger to set requester_id on INSERT
create or replace function public.handle_claim_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.requester_id := auth.uid();
  -- Set room_id from message
  select room_id into new.room_id from public.messages where id = new.message_id;
  return new;
end;
$$;

drop trigger if exists handle_claim_request_insert on public.claim_requests;
create trigger handle_claim_request_insert
before insert on public.claim_requests
for each row
execute function public.handle_claim_request_insert();

-- 4. Auto-update updated_at
drop trigger if exists set_claim_requests_updated_at on public.claim_requests;
create trigger set_claim_requests_updated_at
before update on public.claim_requests
for each row
execute function public.set_updated_at();

-- 5. Enable RLS
alter table public.claim_requests enable row level security;

-- 6. RLS Policies
-- Requesters can view their own requests
drop policy if exists "Requesters can view their own requests" on public.claim_requests;
create policy "Requesters can view their own requests"
on public.claim_requests
for select
to authenticated
using (requester_id = auth.uid());

-- Message authors can view requests on their messages
drop policy if exists "Authors can view requests on their messages" on public.claim_requests;
create policy "Authors can view requests on their messages"
on public.claim_requests
for select
to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = claim_requests.message_id
      and m.user_id = auth.uid()
  )
);

-- Room participants can view request counts (aggregated, not individual requesters)
-- This requires a view for safe aggregation

-- Authenticated users can create requests (room access checked in RPC)
drop policy if exists "Authenticated users can create claim requests" on public.claim_requests;
create policy "Authenticated users can create claim requests"
on public.claim_requests
for insert
to authenticated
with check (requester_id = auth.uid());

-- Requesters can update their own request status (e.g., if they want to withdraw)
drop policy if exists "Requesters can update their own requests" on public.claim_requests;
create policy "Requesters can update their own requests"
on public.claim_requests
for update
to authenticated
using (requester_id = auth.uid())
with check (requester_id = auth.uid());

-- 7. Aggregated view for message authors and room participants
-- Shows request count and status without exposing individual requester identities to non-authors
create or replace view public.claim_requests_aggregated
with (security_invoker = false)
as
select
  cr.message_id,
  cr.room_id,
  count(*) filter (where cr.status = 'pending') as pending_count,
  count(*) filter (where cr.status = 'accepted') as accepted_count,
  count(*) filter (where cr.status = 'skipped') as skipped_count,
  count(*) filter (where cr.status = 'declined') as declined_count,
  count(*) as total_count,
  max(cr.created_at) as latest_request_at,
  -- For message author: include requester identities
  case
    when m.user_id = auth.uid() then
      jsonb_agg(
        jsonb_build_object(
          'requester_id', cr.requester_id,
          'status', cr.status,
          'created_at', cr.created_at
        ) order by cr.created_at desc
      ) filter (where cr.requester_id is not null)
    else null
  end as requester_details
from public.claim_requests cr
join public.messages m on m.id = cr.message_id
-- R7: authoritative room authorization (public non-archived, owner, ACTIVE
-- debate participants) instead of an inline public-or-creator check, so
-- participants in someone else's private debate can see the aggregated request
-- state they are authorized to use. Outsiders stay excluded (fail-closed);
-- requester identities remain author-only via the requester_details CASE above.
where public.has_room_access(cr.room_id)
group by cr.message_id, cr.room_id, m.user_id;

grant select on public.claim_requests_aggregated to anon, authenticated;

-- 8. RPC: Create claim request (with duplicate prevention and room access check)
create or replace function public.create_claim_request(
  p_message_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_message record;
  v_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  -- Fetch message with room and author info
  select m.*, r.id as room_id, r.visibility, r.status, r.created_by as room_created_by
  into v_message
  from public.messages m
  join public.rooms r on r.id = m.room_id
  where m.id = p_message_id;

  if not found then
    raise exception 'not_found' using hint = 'Message not found.';
  end if;

  -- Room access check
  if v_message.visibility = 'private' and v_message.room_created_by <> v_user_id then
    -- Check if user is a participant (for debates) or has access
    if not exists (
      select 1 from public.debate_participants dp
      where dp.room_id = v_message.room_id and dp.user_id = v_user_id
    ) then
      raise exception 'room_not_accessible' using hint = 'You do not have access to this room.';
    end if;
  end if;

  -- Cannot request own message
  if v_message.user_id = v_user_id then
    raise exception 'own_message' using hint = 'You cannot request your own message as a claim.';
  end if;

  -- Message must be a regular message (not question, system, or already claim)
  if v_message.message_type <> 'message' then
    raise exception 'invalid_message_type' using hint = 'Only regular messages can be requested as claims.';
  end if;

  -- Message must not already be converted
  if v_message.converted_claim_id is not null then
    raise exception 'already_claim' using hint = 'This message is already a claim.';
  end if;

  -- Insert or update request (upsert on unique constraint)
  insert into public.claim_requests (message_id, requester_id, status)
  values (p_message_id, v_user_id, 'pending')
  on conflict (message_id, requester_id) do update set
    status = 'pending',
    updated_at = now()
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.create_claim_request(uuid) from public, anon;
grant execute on function public.create_claim_request(uuid) to authenticated;

-- 9. RPC: Author decision on claim request (Accept/Skip/Decline)
create or replace function public.decide_claim_request(
  p_message_id uuid,
  p_decision text -- 'accept', 'skip', 'decline'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_message record;
  v_request_id uuid;
  v_claim_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_decision not in ('accept', 'skip', 'decline') then
    raise exception 'invalid_decision' using hint = 'Decision must be accept, skip, or decline.';
  end if;

  -- Fetch message and verify authorship
  select m.*, r.id as room_id
  into v_message
  from public.messages m
  join public.rooms r on r.id = m.room_id
  where m.id = p_message_id;

  if not found then
    raise exception 'not_found' using hint = 'Message not found.';
  end if;

  if v_message.user_id is distinct from v_user_id then
    raise exception 'not_author' using hint = 'Only the message author can decide on requests.';
  end if;

  -- Get the pending request(s) for this message
  select id into v_request_id
  from public.claim_requests
  where message_id = p_message_id and status = 'pending'
  limit 1;

  if v_request_id is null then
    raise exception 'no_pending_request' using hint = 'No pending request for this message.';
  end if;

  -- Update all pending requests for this message to the decided status
  update public.claim_requests
  set status = p_decision, updated_at = now()
  where message_id = p_message_id and status = 'pending';

  -- If accepted, convert message to claim
  if p_decision = 'accept' then
    -- Use the conversion RPC with default claim_type and context_type
    -- The actual claim_type/context_type could be passed as parameters in the future
    v_claim_id := public.convert_message_to_claim(p_message_id, 'opinion', 'supporting_idea');
  end if;

  return v_request_id;
end;
$$;

revoke execute on function public.decide_claim_request(uuid, text) from public, anon;
grant execute on function public.decide_claim_request(uuid, text) to authenticated;

-- 10. RPC: Get aggregated request state for a message (for UI display)
create or replace function public.get_claim_request_state(
  p_message_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_result jsonb;
  v_is_author boolean;
begin
  v_user_id := auth.uid();

  -- Check if user is the message author
  select exists(
    select 1 from public.messages
    where id = p_message_id and user_id = v_user_id
  ) into v_is_author;

  if v_is_author then
    -- Author sees full details including requester identities
    select jsonb_build_object(
      'pending_count', coalesce(pending_count, 0),
      'accepted_count', coalesce(accepted_count, 0),
      'skipped_count', coalesce(skipped_count, 0),
      'declined_count', coalesce(declined_count, 0),
      'total_count', coalesce(total_count, 0),
      'requester_details', requester_details
    ) into v_result
    from public.claim_requests_aggregated
    where message_id = p_message_id;
  else
    -- Non-authors see only counts
    select jsonb_build_object(
      'pending_count', coalesce(pending_count, 0),
      'accepted_count', coalesce(accepted_count, 0),
      'skipped_count', coalesce(skipped_count, 0),
      'declined_count', coalesce(declined_count, 0),
      'total_count', coalesce(total_count, 0),
      'requester_details', null
    ) into v_result
    from public.claim_requests_aggregated
    where message_id = p_message_id;
  end if;

  return coalesce(v_result, jsonb_build_object(
    'pending_count', 0,
    'accepted_count', 0,
    'skipped_count', 0,
    'declined_count', 0,
    'total_count', 0,
    'requester_details', null
  ));
end;
$$;

revoke execute on function public.get_claim_request_state(uuid) from public, anon;
grant execute on function public.get_claim_request_state(uuid) to authenticated;