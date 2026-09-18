-- Phase 7D Phase F: Fix decide_claim_request status mapping (F1, forward fix).
--
-- ROOT CAUSE: the shipped decide_claim_request() writes status = p_decision
-- ('accept' / 'skip' / 'decline'), but the claim_requests CHECK constraint
-- requires ('pending', 'accepted', 'skipped', 'declined') and every aggregation
-- counts the past-tense forms. All three author decisions therefore failed in
-- production with a CHECK violation. Proven in isolation; see
-- docs/PHASE_7D_PHASE_F_LIFECYCLE_GAP_CLOSURE_REPORT.md (F1).
--
-- REMEDIATION (minimal, approved direction): map each product-facing action to
-- its past-tense row state at the single UPDATE site:
--   accept  -> accepted
--   skip    -> skipped
--   decline  -> declined
-- Product-facing action names, validation, RLS, grants, search_path,
-- aggregation, and requester-identity privacy are all unchanged (this function
-- is otherwise byte-identical to 202609090003).
--
-- No historical rows need rewriting: the CHECK made non-conforming rows
-- impossible, so zero rows can exist in a bad state.
--
-- ROLLBACK: re-apply the decide_claim_request() definition from
-- 202609090003_claim_requests_foundation.sql (restores the broken behavior;
-- only useful as an emergency revert, never as a target state).
--
-- REQUIRES OWNER APPROVAL before any production push (standard gate).

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

  -- Update all pending requests for this message to the decided status.
  -- F1 FIX: map each action to the past-tense row state the CHECK,
  -- aggregated view, and UI contract require.
  update public.claim_requests
  set status = (case p_decision
    when 'accept' then 'accepted'
    when 'skip' then 'skipped'
    when 'decline' then 'declined'
    else p_decision
  end),
  updated_at = now()
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
