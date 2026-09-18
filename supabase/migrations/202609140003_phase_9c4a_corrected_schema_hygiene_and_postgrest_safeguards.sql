-- Migration: Phase 9C.4A Corrected — Schema Hygiene & PostgREST Security Safeguards
-- Migration ID: 202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql
--
-- SCOPE: Standalone migration designed for the CLEAN PRE-9C.4A production state.
-- It MUST be applied to a database where NONE of the Phase 9C.4A objects exist yet:
--   profiles.is_deleted absent, is_active_user() absent, is_privileged_user() absent,
--   retired_handles absent, admin_audit_logs FK still ON DELETE CASCADE.
--
-- RELATION TO 202609140001 / 202609140002 (DO NOT EXECUTE EITHER):
--   202609140001 failed in production with ERROR 22P02 (enum 'system_owner') and rolled
--   back fully. 202609140002 was BLOCKED in review (policy renames, toggle_reaction
--   return-type change, create_claim_request validation loss). Neither file is recorded
--   as applied in the Supabase migration history (Remote column empty for both).
--   This file does NOT assume either was applied. The operator MUST retire the two
--   defective pending files from the local pending queue (archive outside
--   supabase/migrations/, preserved in git history) BEFORE any `supabase db push`,
--   otherwise the push will attempt the defective 140001 first and fail. This file
--   itself must be the sole pending Phase 9C.4A migration at push time.
--   202609140001 is preserved untouched as the historical incident record.
--
-- CORRECTIONS vs 202609140002:
--   C1. RLS policies use CANONICAL production names (verified against migration
--       history) with defensive DROP-BOTH (canonical + 140002-attempted name),
--       then CREATE the canonical hardened definition. No parallel permissive policy.
--   C2. toggle_reaction RESTORED to RETURNS boolean (production/client contract).
--   C3. create_claim_request RESTORED to foundation validation (own_message,
--       message_type, converted_claim_id, upsert dedup) + is_active_user (+ archived).
--   C4. create_inquiry RESTORES the P0-3 cross-room claim IDOR guard + retracted-claim
--       guard that 140002 dropped, keeping the archived-room and is_active_user guards.
--   C5. is_privileged_user adds explicit REVOKE FROM PUBLIC (defense in depth).
--   C6. claim_requests UPDATE preserves foundation predicates (no new status filter).
--
-- DOCUMENTED INTENTIONAL DELTAS vs pre-9C.4A production:
--   D1. has_room_write_access() public branch requires auth.uid() IS NOT NULL
--       (anon now evaluates FALSE; all write policies using it are TO authenticated,
--       so no legitimate write path changes; strictly tighter for anon evaluation).
--   D2. create_claim_request / create_inquiry / respond_to_inquiry / toggle_reaction
--       reject archived rooms (consistent with the room write-freeze semantics).
--   D3. search_path for touched SECURITY DEFINER functions is public, pg_temp
--       (was public in older definitions; standard hardening, no behavior change).
--
-- STRICT GUARANTEE: Does NOT activate account deletion. Does NOT modify auth.* tables.
-- No system_owner. No enum change. No OAuth change. No storage deletion. No user-data
-- DELETE/TRUNCATE. Database-only.

-- ============================================================================
-- 1. PROFILES: Add is_deleted column & partial index
-- ============================================================================
alter table public.profiles
add column if not exists is_deleted boolean not null default false;

create index if not exists idx_profiles_is_deleted
on public.profiles(is_deleted)
where is_deleted = true;

-- ============================================================================
-- 2. CENTRAL SECURITY HELPER: public.is_active_user()
-- ============================================================================
create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_deleted = true
    );
$$;

comment on function public.is_active_user() is
  'Returns true if caller is authenticated and their profile has not been marked is_deleted = true. Used to fail closed against in-flight JWTs. Returns true for authenticated users without a profiles row so first-use onboarding is not blocked.';

grant execute on function public.is_active_user() to anon, authenticated, service_role;

-- ============================================================================
-- 3. ROOM WRITE AUTHORIZATION: Update public.has_room_write_access()
-- ============================================================================
create or replace function public.has_room_write_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_user() and exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and (
        (r.visibility = 'public' and auth.uid() is not null)
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id
            and dp.user_id = auth.uid()
            and dp.removed_at is null
        )
      )
  );
$$;

grant execute on function public.has_room_write_access(uuid) to anon, authenticated, service_role;

-- ============================================================================
-- 4. HARDEN RLS POLICIES FOR IN-FLIGHT JWTs (FAIL-CLOSED ON DELETED USERS)
-- ============================================================================
-- Convention: DROP-BOTH the canonical production name and the 140002-attempted
-- name (harmless when absent), then CREATE the canonical hardened definition.

-- A. profiles: UPDATE policy (canonical: "Users can update their own profile")
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    and not is_deleted
    and public.is_active_user()
  )
  with check (
    id = auth.uid()
    and not is_deleted
    and public.is_active_user()
  );

-- B. reactions: INSERT & DELETE policies
-- Canonical INSERT: "Authenticated users can create reactions"
drop policy if exists "Authenticated users can create reactions" on public.reactions;
drop policy if exists "Authenticated users can insert reactions" on public.reactions;
create policy "Authenticated users can create reactions"
  on public.reactions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.has_room_access(room_id)
    and exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status <> 'archived'
    )
  );

-- Canonical DELETE: "Users can delete their own reactions"
drop policy if exists "Users can delete their own reactions" on public.reactions;
drop policy if exists "Users can remove own reactions" on public.reactions;
create policy "Users can delete their own reactions"
  on public.reactions
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
  );

-- C. claim_requests: INSERT & UPDATE policies
-- Canonical INSERT: "Authenticated users can create claim requests"
drop policy if exists "Authenticated users can create claim requests" on public.claim_requests;
create policy "Authenticated users can create claim requests"
  on public.claim_requests
  for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and public.is_active_user()
  );

-- Canonical UPDATE: "Requesters can update their own requests"
-- (foundation predicates preserved; only the active-user guard is added)
drop policy if exists "Requesters can update their own requests" on public.claim_requests;
drop policy if exists "Users can update own pending claim requests" on public.claim_requests;
create policy "Requesters can update their own requests"
  on public.claim_requests
  for update
  to authenticated
  using (
    requester_id = auth.uid()
    and public.is_active_user()
  )
  with check (
    requester_id = auth.uid()
    and public.is_active_user()
  );

-- D. user_saves: SELECT, INSERT, DELETE policies (names match history)
drop policy if exists "Users can view own saves" on public.user_saves;
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
  );

drop policy if exists "Users can insert own saves" on public.user_saves;
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
  );

drop policy if exists "Users can delete own saves" on public.user_saves;
create policy "Users can delete own saves"
  on public.user_saves
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
  );

-- E. user_preferences: INSERT & UPDATE policies
-- Canonical: "Users can insert/update their own preferences"
-- (SELECT policy "Users can view their own preferences" is read-only; untouched)
drop policy if exists "Users can insert their own preferences" on public.user_preferences;
drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
  );

drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
  )
  with check (
    user_id = auth.uid()
    and public.is_active_user()
  );

-- F. storage.objects: avatars bucket policies (names match history)
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_user()
  and storage.filename(name) in (
    'avatar.jpg',
    'avatar.jpeg',
    'avatar.png',
    'avatar.webp'
  )
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_user()
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_user()
  and storage.filename(name) in (
    'avatar.jpg',
    'avatar.jpeg',
    'avatar.png',
    'avatar.webp'
  )
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_user()
);

-- ============================================================================
-- 5. RPC SECURITY HARDENING (FAIL-CLOSED ON DELETED USERS)
-- ============================================================================
-- Each RPC = production foundation body + is_active_user() guard only
-- (plus documented archived-room guards where noted). No API redesign.

-- A. toggle_reaction (RESTORED: RETURNS boolean per production/client contract)
create or replace function public.toggle_reaction(
  p_target_type text,
  p_target_id uuid,
  p_reaction_type text
) returns boolean -- true = added, false = removed
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_target_type not in ('message', 'claim', 'evidence', 'argument') then
    raise exception 'invalid_target_type';
  end if;

  if p_reaction_type not in ('like', 'insightful', 'curious') then
    raise exception 'invalid_reaction_type';
  end if;

  -- Verify target exists and get room_id
  case p_target_type
    when 'message' then
      select room_id into v_room_id from public.messages where id = p_target_id;
    when 'claim' then
      select room_id into v_room_id from public.claims where id = p_target_id;
    when 'evidence' then
      select room_id into v_room_id from public.evidence where id = p_target_id;
    when 'argument' then
      select room_id into v_room_id from public.arguments where id = p_target_id;
  end case;

  if v_room_id is null then
    raise exception 'target_not_found' using hint = 'Target entity not found.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room not accessible.';
  end if;

  -- Check if reaction already exists
  select exists (
    select 1 from public.reactions
    where user_id = v_user_id
      and target_type = p_target_type
      and target_id = p_target_id
      and reaction_type = p_reaction_type
  ) into v_exists;

  if v_exists then
    delete from public.reactions
    where user_id = v_user_id
      and target_type = p_target_type
      and target_id = p_target_id
      and reaction_type = p_reaction_type;
    return false;
  else
    insert into public.reactions (user_id, target_type, target_id, reaction_type, room_id)
    values (v_user_id, p_target_type, p_target_id, p_reaction_type, v_room_id);
    return true;
  end if;
end;
$$;

revoke execute on function public.toggle_reaction(text, uuid, text) from public, anon;
grant execute on function public.toggle_reaction(text, uuid, text) to authenticated;

-- B. create_claim_request (RESTORED: foundation validation + upsert dedup)
create or replace function public.create_claim_request(
  p_message_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_message record;
  v_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
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

  if v_message.status = 'archived' then
    raise exception 'room_archived' using hint = 'Cannot request claims in an archived room.';
  end if;

  -- Room access check
  if v_message.visibility = 'private' and v_message.room_created_by <> v_user_id then
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

  -- Insert or update request (upsert on unique constraint; room_id filled by trigger)
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

-- C. create_inquiry (RESTORED: P0-3 cross-room IDOR + retracted-claim guards)
create or replace function public.create_inquiry(
  p_room_id uuid,
  p_target_claim_id uuid,
  p_inquiry_type text,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_inquiry_id uuid;
  v_inquiry_count int;
  v_current_side text;
  v_target_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create an inquiry.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and public.has_room_access(p_room_id)
  ) then
    raise exception 'not_authorized' using hint = 'Room is archived or not accessible.';
  end if;

  -- Cross-room claim check (P0-3 IDOR protection)
  select room_id into v_target_room_id
  from public.claims
  where id = p_target_claim_id;

  if v_target_room_id is null then
    raise exception 'invalid_claim' using hint = 'Target claim does not exist.';
  end if;

  if v_target_room_id <> p_room_id then
    raise exception 'cross_room_claim' using hint = 'Target claim must belong to the same room.';
  end if;

  if exists (
    select 1 from public.claims where id = p_target_claim_id and is_retracted = true
  ) then
    raise exception 'retracted_claim' using hint = 'Cannot create an inquiry against a retracted claim.';
  end if;

  -- Rate limit check: 5 per hour
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id
    and created_at > now() - interval '1 hour';

  if v_inquiry_count >= 5 then
    raise exception 'rate_limit' using hint = 'Max 5 inquiries per hour.';
  end if;

  -- Debate cap check: 50 per user per debate
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id;

  if v_inquiry_count >= 50 then
    raise exception 'debate_cap' using hint = 'Max 50 inquiries per debate.';
  end if;

  -- Claim cap check: 20 per claim
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where target_claim_id = p_target_claim_id;

  if v_inquiry_count >= 20 then
    raise exception 'claim_cap' using hint = 'Max 20 inquiries per claim.';
  end if;

  -- Get current participation side for metadata
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    v_current_side := 'inquiry';
  end if;

  -- Create inquiry
  insert into public.inquiry_items (
    room_id, created_by, inquirer_side, inquiry_type, content, target_claim_id
  ) values (
    p_room_id, v_user_id, v_current_side, p_inquiry_type, p_content, p_target_claim_id
  ) returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$$;

revoke execute on function public.create_inquiry(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_inquiry(uuid, uuid, text, text) to authenticated;

-- D. respond_to_inquiry (foundation lifecycle + reputation, plus guards)
create or replace function public.respond_to_inquiry(
  p_inquiry_item_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_response_id uuid;
  v_current_status text;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'not_authenticated' using hint = 'You must be logged in to respond.';
  end if;

  -- Get current status and room_id
  select status, room_id into v_current_status, v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if v_current_status is null then
    raise exception 'not_found' using hint = 'Inquiry not found.';
  end if;

  if v_current_status in ('closed', 'satisfied') then
    raise exception 'inquiry_closed' using hint = 'Cannot respond to a closed or satisfied inquiry.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'not_authorized' using hint = 'Room is archived or not accessible.';
  end if;

  -- Insert response
  insert into public.inquiry_responses (inquiry_item_id, created_by, content)
  values (p_inquiry_item_id, v_user_id, p_content)
  returning id into v_response_id;

  -- Update inquiry status if open or unsatisfied
  if v_current_status in ('open', 'unsatisfied') then
    update public.inquiry_items
    set status = 'responded', updated_at = now()
    where id = p_inquiry_item_id;
  end if;

  -- Create reputation event for response (+3)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_RESPONDED',
    3,
    jsonb_build_object(
      'inquiry_response_id', v_response_id,
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );

  return v_response_id;
end;
$$;

revoke execute on function public.respond_to_inquiry(uuid, text) from public, anon;
grant execute on function public.respond_to_inquiry(uuid, text) to authenticated;

-- ============================================================================
-- 6. RETIRED HANDLES TABLE & PROFILE USERNAME RETIREMENT TRIGGER
-- ============================================================================
create table if not exists public.retired_handles (
  handle text primary key,
  retired_at timestamptz not null default now(),
  reason text not null default 'account_deletion'
);

alter table public.retired_handles enable row level security;
revoke all on public.retired_handles from anon, authenticated;
grant select, insert on public.retired_handles to service_role;

create or replace function public.check_username_not_retired()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.retired_handles
    where lower(handle) = lower(trim(new.username))
  ) then
    raise exception 'username_unavailable'
      using errcode = '23505', hint = 'This username is unavailable.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_username_not_retired_trigger on public.profiles;
create trigger check_username_not_retired_trigger
before insert or update of username on public.profiles
for each row
execute function public.check_username_not_retired();

-- ============================================================================
-- 7. GOVERNANCE: is_privileged_user helper & decouple admin_audit_logs CASCADE
-- ============================================================================
-- Production enum user_role_type contains ONLY ('moderator', 'admin').
-- No system_owner. No enum modification.
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'moderator')
  );
$$;

comment on function public.is_privileged_user(uuid) is
  'Returns true if user holds an active administrative or moderator role in public.user_roles. Service-role only.';

revoke all on function public.is_privileged_user(uuid) from public;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;
grant execute on function public.is_privileged_user(uuid) to service_role;

-- Decouple admin_audit_logs.admin_id from CASCADE to RESTRICT
-- Pre-flight requirement: orphaned_audit_logs must be 0 (see report Section 21).
alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_admin_id_fkey;

alter table public.admin_audit_logs
add constraint admin_audit_logs_admin_id_fkey
foreign key (admin_id) references auth.users(id) on delete restrict;
