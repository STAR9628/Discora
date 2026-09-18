-- Migration: Phase 8A Admin / Owner Console Foundation
-- Creates admin_audit_logs table, owner role grant, and privileged operational RPCs.
-- All privileged operations require authenticated caller to hold 'admin' role in public.user_roles.
-- Epistemic neutrality strictly preserved: zero epistemic alteration capabilities.

-- 1. Create public.admin_audit_logs table
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'ADMIN_ACCESS',
    'PRIVATE_ROOM_INSPECTED',
    'ROOM_ARCHIVED',
    'ROOM_RESTORED',
    'ROOM_LOCKED',
    'ROOM_UNLOCKED',
    'FEEDBACK_REVIEWED',
    'FEEDBACK_ARCHIVED',
    'MODERATION_ACTION'
  )),
  target_type text not null check (target_type in ('room', 'feedback', 'moderation', 'system')),
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_id_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs(action);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;

-- 2. Insert owner role into public.user_roles
do $$
begin
  if exists (select 1 from auth.users where id = '17265c80-a346-42dd-a86c-6795c500fd15'::uuid) then
    insert into public.user_roles (user_id, role)
    values ('17265c80-a346-42dd-a86c-6795c500fd15'::uuid, 'admin'::public.user_role_type)
    on conflict (user_id, role) do nothing;
  end if;
end $$;

-- 3. Ensure user_feedback privileges for authenticated admins
grant select, update on public.user_feedback to authenticated;

drop policy if exists "Moderators and admins can update feedback" on public.user_feedback;
create policy "Moderators and admins can update feedback"
  on public.user_feedback
  for update
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type))
  with check (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type));

-- 4. RPC: admin_get_overview_stats
create or replace function public.admin_get_overview_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_discussions int;
  v_active_debates int;
  v_private_rooms int;
  v_archived_rooms int;
  v_pending_flags int;
  v_pending_feedback int;
  v_audit_event_count int;
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select count(*) into v_active_discussions
  from public.rooms
  where room_type = 'discussion' and visibility = 'public' and status = 'open';

  select count(*) into v_active_debates
  from public.rooms
  where room_type = 'debate' and visibility = 'public' and status = 'open';

  select count(*) into v_private_rooms
  from public.rooms
  where visibility = 'private';

  select count(*) into v_archived_rooms
  from public.rooms
  where status = 'archived';

  select count(*) into v_pending_flags
  from public.moderation_flags
  where status = 'pending';

  select count(*) into v_pending_feedback
  from public.user_feedback
  where status = 'new';

  select count(*) into v_audit_event_count
  from public.admin_audit_logs;

  return jsonb_build_object(
    'active_discussions', v_active_discussions,
    'active_debates', v_active_debates,
    'private_rooms', v_private_rooms,
    'archived_rooms', v_archived_rooms,
    'pending_flags', v_pending_flags,
    'pending_feedback', v_pending_feedback,
    'total_audit_events', v_audit_event_count
  );
end;
$$;

revoke all on function public.admin_get_overview_stats() from public, anon;
grant execute on function public.admin_get_overview_stats() to authenticated;

-- 5. RPC: admin_get_rooms
create or replace function public.admin_get_rooms(p_filter text default 'all')
returns table (
  id uuid,
  title text,
  slug text,
  room_type text,
  visibility text,
  status text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  participant_count bigint,
  message_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.title,
    r.slug,
    r.room_type,
    r.visibility,
    r.status,
    r.created_by,
    r.created_at,
    r.updated_at,
    coalesce(dp.cnt, 0)::bigint as participant_count,
    coalesce(m.cnt, 0)::bigint as message_count
  from public.rooms r
  left join (
    select room_id, count(*)::bigint as cnt
    from public.debate_participants
    where removed_at is null
    group by room_id
  ) dp on dp.room_id = r.id
  left join (
    select room_id, count(*)::bigint as cnt
    from public.messages
    group by room_id
  ) m on m.room_id = r.id
  where (
    p_filter = 'all'
    or (p_filter = 'public' and r.visibility = 'public')
    or (p_filter = 'private' and r.visibility = 'private')
    or (p_filter = 'archived' and r.status = 'archived')
    or (p_filter = 'discussion' and r.room_type = 'discussion')
    or (p_filter = 'debate' and r.room_type = 'debate')
  )
  order by r.updated_at desc;
end;
$$;

revoke all on function public.admin_get_rooms(text) from public, anon;
grant execute on function public.admin_get_rooms(text) to authenticated;

-- 6. RPC: admin_set_room_status
create or replace function public.admin_set_room_status(p_room_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if p_status not in ('open', 'archived') then
    raise exception 'Invalid room status. Must be open or archived.';
  end if;

  update public.rooms
  set status = p_status, updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  v_action := case when p_status = 'archived' then 'ROOM_ARCHIVED' else 'ROOM_RESTORED' end;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), v_action, 'room', p_room_id::text, jsonb_build_object('new_status', p_status));

  return true;
end;
$$;

revoke all on function public.admin_set_room_status(uuid, text) from public, anon;
grant execute on function public.admin_set_room_status(uuid, text) to authenticated;

-- 7. RPC: admin_inspect_private_room (Silent, Read-Only, Audit-Logged)
create or replace function public.admin_inspect_private_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
  v_messages jsonb;
  v_claims jsonb;
  v_evidence jsonb;
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select id, title, description, slug, room_type, visibility, status, created_by, created_at, updated_at
  into v_room
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found.';
  end if;

  -- Silent, read-only audit log entry
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'PRIVATE_ROOM_INSPECTED', 'room', p_room_id::text, jsonb_build_object('room_title', v_room.title, 'visibility', v_room.visibility));

  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into v_messages
  from (
    select id, content, message_type, identity_mode, created_at
    from public.messages
    where room_id = p_room_id
    order by created_at asc
    limit 100
  ) m;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_claims
  from (
    select id, text, epistemic_status, created_at
    from public.claims
    where room_id = p_room_id
    order by created_at asc
    limit 100
  ) c;

  select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) into v_evidence
  from (
    select id, claim_id, title, url, direction, created_at
    from public.evidence
    where room_id = p_room_id
    order by created_at asc
    limit 100
  ) e;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'messages', v_messages,
    'claims', v_claims,
    'evidence', v_evidence
  );
end;
$$;

revoke all on function public.admin_inspect_private_room(uuid) from public, anon;
grant execute on function public.admin_inspect_private_room(uuid) to authenticated;

-- 8. RPC: admin_get_feedback
create or replace function public.admin_get_feedback(
  p_category text default null,
  p_status text default null
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  category text,
  description text,
  page_url text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.user_id,
    p.username,
    f.category,
    f.description,
    f.page_url,
    f.status,
    f.created_at
  from public.user_feedback f
  left join public.profiles p on p.id = f.user_id
  where (p_category is null or f.category = p_category)
    and (p_status is null or f.status = p_status)
  order by f.created_at desc;
end;
$$;

revoke all on function public.admin_get_feedback(text, text) from public, anon;
grant execute on function public.admin_get_feedback(text, text) to authenticated;

-- 9. RPC: admin_update_feedback_status
create or replace function public.admin_update_feedback_status(p_feedback_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if p_status not in ('new', 'reviewed', 'archived') then
    raise exception 'Invalid feedback status. Must be new, reviewed, or archived.';
  end if;

  update public.user_feedback
  set status = p_status
  where id = p_feedback_id;

  if not found then
    raise exception 'Feedback not found.';
  end if;

  v_action := case when p_status = 'archived' then 'FEEDBACK_ARCHIVED' else 'FEEDBACK_REVIEWED' end;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), v_action, 'feedback', p_feedback_id::text, jsonb_build_object('new_status', p_status));

  return true;
end;
$$;

revoke all on function public.admin_update_feedback_status(uuid, text) from public, anon;
grant execute on function public.admin_update_feedback_status(uuid, text) to authenticated;

-- 10. RPC: admin_get_audit_logs
create or replace function public.admin_get_audit_logs(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  admin_id uuid,
  admin_username text,
  action text,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.admin_id,
    p.username as admin_username,
    l.action,
    l.target_type,
    l.target_id,
    l.metadata,
    l.created_at
  from public.admin_audit_logs l
  left join public.profiles p on p.id = l.admin_id
  order by l.created_at desc
  limit coalesce(p_limit, 50)
  offset coalesce(p_offset, 0);
end;
$$;

revoke all on function public.admin_get_audit_logs(int, int) from public, anon;
grant execute on function public.admin_get_audit_logs(int, int) to authenticated;

-- 11. RPC: admin_log_access
create or replace function public.admin_log_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id)
  values (auth.uid(), 'ADMIN_ACCESS', 'system', null);

  return true;
end;
$$;

revoke all on function public.admin_log_access() from public, anon;
grant execute on function public.admin_log_access() to authenticated;
