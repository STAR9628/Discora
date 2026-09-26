-- Migration: Phase 9C.4 Phase A — Schema Hygiene & PostgREST Security Safeguards
-- Description:
-- 1. Adds is_deleted column to public.profiles.
-- 2. Creates public.is_active_user() security-definer helper to fail closed against in-flight JWTs.
-- 3. Updates public.has_room_write_access() to require public.is_active_user().
-- 4. Hardens write RLS policies on reactions, claim_requests, user_saves, user_preferences, profiles, and avatars storage.
-- 5. Updates mutation RPCs (toggle_reaction, create_claim_request, create_inquiry, respond_to_inquiry) to enforce public.is_active_user().
-- 6. Creates private public.retired_handles table and username retirement check trigger on public.profiles.
-- 7. Creates public.is_privileged_user(uuid) helper for governance protection.
-- 8. Decouples admin_audit_logs.admin_id FK from CASCADE to RESTRICT.
--
-- STRICT GUARANTEE: Does NOT activate account deletion. Does NOT modify auth.* tables directly.

-- ============================================================================
-- 1. PROFILES: Add is_deleted column
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
        (r.visibility = 'public')
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
-- 4. HARDEN NON-ROOM WRITE RLS POLICIES
-- ============================================================================

-- 4.1 Profiles UPDATE
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() and not is_deleted and public.is_active_user())
with check (id = auth.uid() and not is_deleted and public.is_active_user());

-- 4.2 Reactions INSERT & DELETE
drop policy if exists "Authenticated users can create reactions" on public.reactions;
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

drop policy if exists "Users can delete their own reactions" on public.reactions;
create policy "Users can delete their own reactions"
on public.reactions
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_user());

-- 4.3 Claim Requests INSERT & UPDATE
drop policy if exists "Authenticated users can create claim requests" on public.claim_requests;
create policy "Authenticated users can create claim requests"
on public.claim_requests
for insert
to authenticated
with check (requester_id = auth.uid() and public.is_active_user());

drop policy if exists "Requesters can update their own requests" on public.claim_requests;
create policy "Requesters can update their own requests"
on public.claim_requests
for update
to authenticated
using (requester_id = auth.uid() and public.is_active_user())
with check (requester_id = auth.uid() and public.is_active_user());

-- 4.4 User Saves SELECT, INSERT, DELETE
drop policy if exists "Users can view own saves" on public.user_saves;
create policy "Users can view own saves"
on public.user_saves
for select
to authenticated
using (user_id = auth.uid() and public.is_active_user());

drop policy if exists "Users can insert own saves" on public.user_saves;
create policy "Users can insert own saves"
on public.user_saves
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "Users can delete own saves" on public.user_saves;
create policy "Users can delete own saves"
on public.user_saves
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_user());

-- 4.5 User Preferences INSERT & UPDATE
drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid() and public.is_active_user())
with check (user_id = auth.uid() and public.is_active_user());

-- 4.6 Storage Objects on 'avatars' bucket (INSERT, UPDATE, DELETE)
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
-- 5. HARDEN MUTATION RPCs TO FAIL CLOSED
-- ============================================================================

-- 5.1 toggle_reaction RPC
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
    raise exception 'not_authenticated' using hint = 'Active authentication required.';
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
    insert into public.reactions (room_id, user_id, target_type, target_id, reaction_type)
    values (v_room_id, v_user_id, p_target_type, p_target_id, p_reaction_type);
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_reaction(text, uuid, text) to authenticated;

-- 5.2 create_claim_request RPC
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
    raise exception 'not_authenticated' using hint = 'Active authentication required.';
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

  -- Check for existing active request
  select id into v_request_id
  from public.claim_requests
  where message_id = p_message_id and requester_id = v_user_id;

  if v_request_id is not null then
    return v_request_id;
  end if;

  -- Insert new claim request
  insert into public.claim_requests (message_id, room_id, requester_id)
  values (p_message_id, v_message.room_id, v_user_id)
  returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.create_claim_request(uuid) to authenticated;

-- 5.3 create_inquiry RPC
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
    raise exception 'not_authenticated' using hint = 'Active authentication required.';
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

grant execute on function public.create_inquiry(uuid, uuid, text, text) to authenticated;

-- 5.4 respond_to_inquiry RPC
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
    raise exception 'not_authenticated' using hint = 'Active authentication required.';
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

grant execute on function public.respond_to_inquiry(uuid, text) to authenticated;

-- ============================================================================
-- 6. RETIRED HANDLES PRIVACY & ENFORCEMENT
-- ============================================================================
create table if not exists public.retired_handles (
  handle text primary key,
  retired_at timestamptz not null default now(),
  reason text not null default 'account_deletion'
);

alter table public.retired_handles enable row level security;
revoke all on public.retired_handles from anon, authenticated;
grant select, insert on public.retired_handles to service_role;

-- Enforce check on public.profiles via SECURITY DEFINER trigger
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
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'moderator', 'system_owner')
  );
$$;

grant execute on function public.is_privileged_user(uuid) to service_role;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;

-- Decouple admin_audit_logs.admin_id from CASCADE to RESTRICT
alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_admin_id_fkey;

alter table public.admin_audit_logs
add constraint admin_audit_logs_admin_id_fkey
foreign key (admin_id) references auth.users(id) on delete restrict;
