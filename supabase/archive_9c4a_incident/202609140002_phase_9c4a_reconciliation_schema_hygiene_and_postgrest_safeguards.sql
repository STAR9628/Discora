-- Migration: Phase 9C.4A Reconciliation — Schema Hygiene & PostgREST Security Safeguards
-- Migration ID: 202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql
-- Reconciles and supersedes: 202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql
--
-- RECONCILIATION SUMMARY:
-- The original migration 202609140001 failed in Supabase SQL Editor with error 22P02:
--   "invalid input value for enum user_role_type: 'system_owner'"
-- because the production user_role_type enum supports ('admin', 'moderator').
-- Due to transactional DDL execution in PostgreSQL, the failure rolled back the entire
-- transaction block, leaving the production database in a clean pre-migration state.
--
-- This reconciliation migration:
-- 1. Corrects public.is_privileged_user() to check: role in ('admin', 'moderator').
-- 2. Applies all Phase 9C.4A safeguards cleanly and idempotently:
--    a. Adds is_deleted column and partial index to public.profiles.
--    b. Creates public.is_active_user() security-definer helper.
--    c. Updates public.has_room_write_access() to require public.is_active_user().
--    d. Hardens write RLS policies on reactions, claim_requests, user_saves, user_preferences, profiles, and avatars storage.
--    e. Updates mutation RPCs (toggle_reaction, create_claim_request, create_inquiry, respond_to_inquiry) to require public.is_active_user().
--    f. Creates private public.retired_handles table and username retirement check trigger on public.profiles.
--    g. Creates public.is_privileged_user(uuid) helper for governance protection (service_role only).
--    h. Decouples admin_audit_logs.admin_id FK from CASCADE to RESTRICT.
--
-- STRICT GUARANTEE: Does NOT activate account deletion. Does NOT modify auth.* tables directly.

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
  'Returns true if caller is authenticated and their profile has not been marked is_deleted = true. Used to fail closed against in-flight JWTs.';

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

-- A. profiles: UPDATE policy
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
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
drop policy if exists "Authenticated users can insert reactions" on public.reactions;
create policy "Authenticated users can insert reactions"
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

drop policy if exists "Users can remove own reactions" on public.reactions;
create policy "Users can remove own reactions"
  on public.reactions
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_active_user()
  );

-- C. claim_requests: INSERT & UPDATE policies
drop policy if exists "Authenticated users can create claim requests" on public.claim_requests;
create policy "Authenticated users can create claim requests"
  on public.claim_requests
  for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and public.is_active_user()
  );

drop policy if exists "Users can update own pending claim requests" on public.claim_requests;
create policy "Users can update own pending claim requests"
  on public.claim_requests
  for update
  to authenticated
  using (
    requester_id = auth.uid()
    and status = 'pending'
    and public.is_active_user()
  )
  with check (
    requester_id = auth.uid()
    and public.is_active_user()
  );

-- D. user_saves: SELECT, INSERT, DELETE policies
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
drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
  );

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
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

-- F. storage.objects: avatars bucket policies
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

-- A. toggle_reaction
create or replace function public.toggle_reaction(
  p_target_type text,
  p_target_id uuid,
  p_reaction_type text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
  v_target_user_id uuid;
  v_existing_id uuid;
  v_added boolean;
  v_net_delta integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if p_target_type not in ('message', 'claim', 'evidence', 'argument') then
    raise exception 'invalid_target_type' using hint = 'Target type must be message, claim, evidence, or argument.';
  end if;

  if p_reaction_type not in ('like', 'insightful', 'curious') then
    raise exception 'invalid_reaction_type' using hint = 'Reaction type must be like, insightful, or curious.';
  end if;

  if p_target_type = 'message' then
    select room_id, user_id into v_room_id, v_target_user_id from public.messages where id = p_target_id;
  elsif p_target_type = 'claim' then
    select room_id, created_by into v_room_id, v_target_user_id from public.claims where id = p_target_id;
  elsif p_target_type = 'evidence' then
    select room_id, created_by into v_room_id, v_target_user_id from public.evidence where id = p_target_id;
  elsif p_target_type = 'argument' then
    select room_id, created_by into v_room_id, v_target_user_id from public.arguments where id = p_target_id;
  end if;

  if v_room_id is null then
    raise exception 'target_not_found' using hint = 'Target entity does not exist.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room is archived or not accessible.';
  end if;

  select id into v_existing_id
  from public.reactions
  where user_id = v_user_id
    and target_type = p_target_type
    and target_id = p_target_id
    and reaction_type = p_reaction_type;

  if v_existing_id is not null then
    delete from public.reactions where id = v_existing_id;
    v_added := false;
    v_net_delta := -1;
  else
    insert into public.reactions (user_id, target_type, target_id, reaction_type, room_id)
    values (v_user_id, p_target_type, p_target_id, p_reaction_type, v_room_id);
    v_added := true;
    v_net_delta := 1;
  end if;

  return jsonb_build_object(
    'action', case when v_added then 'added' else 'removed' end,
    'reaction_type', p_reaction_type,
    'target_type', p_target_type,
    'target_id', p_target_id,
    'delta', v_net_delta
  );
end;
$$;

revoke execute on function public.toggle_reaction(text, uuid, text) from public, anon;
grant execute on function public.toggle_reaction(text, uuid, text) to authenticated;

-- B. create_claim_request
create or replace function public.create_claim_request(
  p_message_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
  v_existing_id uuid;
  v_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  select room_id into v_room_id
  from public.messages
  where id = p_message_id;

  if not found then
    raise exception 'not_found' using hint = 'Message not found.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room is archived or not accessible.';
  end if;

  select id into v_existing_id
  from public.claim_requests
  where requester_id = v_user_id
    and message_id = p_message_id
    and status = 'pending';

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.claim_requests (
    message_id,
    room_id,
    requester_id,
    status
  ) values (
    p_message_id,
    v_room_id,
    v_user_id,
    'pending'
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.create_claim_request(uuid) from public, anon;
grant execute on function public.create_claim_request(uuid) to authenticated;

-- C. create_inquiry
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

  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id
    and created_at > now() - interval '1 hour';

  if v_inquiry_count >= 5 then
    raise exception 'rate_limit' using hint = 'Max 5 inquiries per hour.';
  end if;

  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id;

  if v_inquiry_count >= 50 then
    raise exception 'debate_cap' using hint = 'Max 50 inquiries per debate.';
  end if;

  select count(*) into v_inquiry_count
  from public.inquiry_items
  where target_claim_id = p_target_claim_id;

  if v_inquiry_count >= 20 then
    raise exception 'claim_cap' using hint = 'Max 20 inquiries per claim.';
  end if;

  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    v_current_side := 'inquiry';
  end if;

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

-- D. respond_to_inquiry
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

  select status, room_id into v_current_status, v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if v_current_status is null then
    raise exception 'not_found' using hint = 'Inquiry item not found.';
  end if;

  if v_current_status in ('satisfied', 'closed') then
    raise exception 'cannot_respond' using hint = 'Cannot respond to a satisfied or closed inquiry.';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = v_room_id
      and r.status <> 'archived'
      and public.has_room_access(v_room_id)
  ) then
    raise exception 'not_authorized' using hint = 'Room is archived or not accessible.';
  end if;

  insert into public.inquiry_responses (
    inquiry_item_id, created_by, content
  ) values (
    p_inquiry_item_id, v_user_id, p_content
  ) returning id into v_response_id;

  if v_current_status in ('open', 'unsatisfied') then
    update public.inquiry_items
    set status = 'responded', updated_at = now()
    where id = p_inquiry_item_id;
  end if;

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
-- CORRECTION FROM 202609140001:
-- Production enum user_role_type contains ('admin', 'moderator').
-- Reference to 'system_owner' was removed to align strictly with production role model.
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

grant execute on function public.is_privileged_user(uuid) to service_role;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;

-- Decouple admin_audit_logs.admin_id from CASCADE to RESTRICT
alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_admin_id_fkey;

alter table public.admin_audit_logs
add constraint admin_audit_logs_admin_id_fkey
foreign key (admin_id) references auth.users(id) on delete restrict;
