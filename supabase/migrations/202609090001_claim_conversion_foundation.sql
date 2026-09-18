-- Phase 7D Phase A: Claim Conversion Foundation
-- Adds in-place message-to-claim conversion via promotion RPC
-- Strategy: message row remains, gains converted_claim_id + message_type='claim';
-- claim row is inserted copying content + original created_at; replies/threads preserved.
--
-- REVISION (R1+R3, Phase F readiness gate): this file was an unapplied working-tree
-- draft (never committed, absent from the reachable database, referenced by no
-- deploy script). The discussion_messages rewrite below now preserves the
-- authoritative hardening-era definition (202606240001: has_room_access gating,
-- moderation redaction, is_moderated) and adds ONLY converted_claim_id.
-- Section 6 adds a narrowly-scoped conversion exemption to enforce_message_edit_rules
-- so Accept works on historical messages without weakening the 5-minute edit rule.

-- 1. Extend messages.message_type CHECK to include 'claim'
-- First drop the existing constraint
alter table public.messages
drop constraint if exists messages_message_type_check;

-- Add new constraint with 'claim' as valid type
alter table public.messages
add constraint messages_message_type_check
check (message_type in ('message', 'question', 'system', 'claim'));

-- 2. Add converted_claim_id column to messages (nullable, references claims)
alter table public.messages
add column if not exists converted_claim_id uuid references public.claims (id) on delete set null;

-- 3. Index for efficient lookup
create index if not exists messages_converted_claim_id_idx on public.messages (converted_claim_id);

-- 4. SECURITY DEFINER RPC: convert_message_to_claim
-- Author-only, same-room, validates length, atomic promotion
create or replace function public.convert_message_to_claim(
  p_message_id uuid,
  p_claim_type text,
  p_context_type text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message record;
  v_claim_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  -- Fetch the message with room and author info
  select m.*, r.id as room_id
  into v_message
  from public.messages m
  join public.rooms r on r.id = m.room_id
  where m.id = p_message_id;

  if not found then
    raise exception 'not_found' using hint = 'Message not found.';
  end if;

  -- Author-only check
  if v_message.user_id is distinct from v_user_id then
    raise exception 'not_author' using hint = 'Only the message author can convert to a claim.';
  end if;

  -- Already converted check
  if v_message.converted_claim_id is not null then
    raise exception 'already_converted' using hint = 'This message has already been converted to a claim.';
  end if;

  -- Message type must be 'message' (not question, system, or already claim)
  if v_message.message_type <> 'message' then
    raise exception 'invalid_message_type' using hint = 'Only regular messages can be converted to claims.';
  end if;

  -- Validate content length for claim (25-500 chars)
  if char_length(v_message.content) < 25 or char_length(v_message.content) > 500 then
    raise exception 'invalid_length' using hint = 'Claim content must be between 25 and 500 characters.';
  end if;

  -- Validate claim_type
  if p_claim_type not in ('fact', 'opinion', 'prediction', 'proposal', 'observation') then
    raise exception 'invalid_claim_type' using hint = 'Invalid claim type.';
  end if;

  -- Validate context_type
  if p_context_type not in ('main_argument', 'supporting_idea', 'key_evidence', 'counterpoint', 'clarification') then
    raise exception 'invalid_context_type' using hint = 'Invalid context type.';
  end if;

  -- Insert the claim row, preserving original created_at and authorship
  insert into public.claims (
    room_id,
    created_by,
    origin_message_id,
    content,
    claim_type,
    context_type,
    identity_mode,
    created_at
  ) values (
    v_message.room_id,
    v_message.user_id,
    v_message.id,
    v_message.content,
    p_claim_type,
    p_context_type,
    v_message.identity_mode,
    v_message.created_at
  ) returning id into v_claim_id;

  -- Update the message to mark it as converted
  update public.messages
  set
    converted_claim_id = v_claim_id,
    message_type = 'claim',
    updated_at = now()
  where id = p_message_id;

  return v_claim_id;
end;
$$;

-- Grant execute to authenticated users only
revoke execute on function public.convert_message_to_claim(uuid, text, text) from public, anon;
grant execute on function public.convert_message_to_claim(uuid, text, text) to authenticated;

-- 5. Update discussion_messages view to include converted_claim_id for in-place conversion.
-- R1: preserves the authoritative hardening-era definition (202606240001) verbatim —
-- has_room_access() gating (public non-archived, owner, active debate participants),
-- moderation redaction ([Hidden by moderator] + is_moderated) — and adds ONLY
-- m.converted_claim_id. No predicate, column, or semantic is removed or weakened.
-- (CREATE OR REPLACE keeps the dependent moderation_queue view valid.)
create or replace view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then '[Hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  case
    when exists (
      select 1
      from public.moderation_flags mf
      where mf.message_id = m.id
        and mf.status = 'resolved_hidden'
    ) then true
    else false
  end as is_moderated,
  -- Phase 7D addition (appended last: CREATE OR REPLACE VIEW requires new
  -- columns at the end; order is invisible to name-based API consumers).
  m.converted_claim_id
from public.messages m
left join public.profiles p on m.user_id = p.id
where public.has_room_access(m.room_id);

grant select on public.discussion_messages to anon, authenticated;

-- 6. R3: allow the legitimate Claim-conversion marker transition through the
-- 5-minute message edit window (enforce_message_edit_rules, 202606030003).
-- Without this, convert_message_to_claim fails on every message older than 5
-- minutes (BEFORE UPDATE triggers fire under SECURITY DEFINER as well).
-- The exemption is narrowly scoped and CANNOT be used for ordinary editing:
--   - fires only on the exact one-time transition
--     (converted_claim_id NULL -> NOT NULL, message_type 'message' -> 'claim')
--   - requires every other column (content, room, author, identity, parent,
--     created_at) to be byte-identical, so no content modification is possible
--   - requires a matching claims row (id = new marker, origin = this message),
--     which only the atomic conversion RPC creates in the same transaction
--   - authorization stays in convert_message_to_claim (author-only check)
-- Converted messages are additionally frozen below: once converted_claim_id is
-- set, marker/type/content can no longer change (prevents post-conversion drift
-- between the message and its Claim).
create or replace function public.enforce_message_edit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Frozen once converted: marker, type, and content must no longer change.
  -- (updated_at-only churn from set_messages_updated_at still passes through.)
  if old.converted_claim_id is not null then
    if new.converted_claim_id is distinct from old.converted_claim_id
       or new.message_type is distinct from old.message_type
       or new.content is distinct from old.content
    then
      raise exception 'converted_frozen' using hint = 'Converted messages are frozen once they become Claims.';
    end if;
    return new;
  end if;

  -- Legitimate one-time Claim-conversion marker transition: bypass the window.
  if old.converted_claim_id is null
     and new.converted_claim_id is not null
     and old.message_type = 'message'
     and new.message_type = 'claim'
     and new.content is not distinct from old.content
     and new.room_id is not distinct from old.room_id
     and new.user_id is not distinct from old.user_id
     and new.identity_mode is not distinct from old.identity_mode
     and new.parent_message_id is not distinct from old.parent_message_id
     and new.created_at is not distinct from old.created_at
     and exists (
       select 1 from public.claims c
       where c.id = new.converted_claim_id
         and c.origin_message_id = old.id
     )
  then
    return new;
  end if;

  -- Enforce 5-minute edit window (unchanged)
  if old.created_at < now() - interval '5 minutes' then
    raise exception 'Messages can only be edited within 5 minutes of creation.';
  end if;

  -- Prevent modifying immutable fields (unchanged)
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be modified.';
  end if;
  if new.room_id is distinct from old.room_id then
    raise exception 'room_id cannot be modified.';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be modified.';
  end if;
  if new.identity_mode is distinct from old.identity_mode then
    raise exception 'identity_mode cannot be modified.';
  end if;

  return new;
end;
$$;