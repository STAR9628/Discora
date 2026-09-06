-- ============================================================================
-- Phase 5D Production Deployment Bundle
-- ============================================================================
-- Contains ONLY the five Phase 5D migrations in sequential order.
-- Execute this bundle against the production database to bring Phase 5D
-- Save/Bookmark and Dashboard Recently Engaged features to production.
-- ============================================================================

-- === 1. 202606260001_create_user_saves.sql ===
-- Migration: Create user_saves table for private Save/Bookmark feature
-- Security model: users can only CRUD their own saves, no anon/public access,
-- private content filtered at query time via has_room_access().

create table if not exists public.user_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('discussion', 'debate', 'claim', 'evidence')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint user_saves_user_target_unique unique (user_id, target_type, target_id)
);

-- Indexes
create index if not exists user_saves_user_created_idx on public.user_saves(user_id, created_at desc);
create index if not exists user_saves_target_idx on public.user_saves(target_type, target_id);

-- RLS
alter table public.user_saves enable row level security;

drop policy if exists "Users can view own saves" on public.user_saves;
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own saves" on public.user_saves;
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own saves" on public.user_saves;
create policy "Users can delete own saves"
  on public.user_saves
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No anon access
-- No public access

-- === 2. 202606260002_create_recent_engagement_rpc.sql ===
-- Migration: get_my_recent_engagement RPC for Dashboard Recently Engaged section
-- Returns bounded recent meaningful user engagement across rooms

create or replace function public.get_my_recent_engagement(p_limit integer default 5)
returns table (
  room_id uuid,
  room_title text,
  room_slug text,
  room_type text,
  engagement_type text,
  engagement_detail text,
  last_engaged_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with recent_votes as (
    select
      c.room_id,
      'voted' as engagement_type,
      case cv.vote_type
        when 'agree' then 'You agreed with a claim'
        when 'disagree' then 'You contested a claim'
      end as engagement_detail,
      cv.created_at as last_engaged_at
    from public.claim_votes cv
    join public.claims c on c.id = cv.claim_id
    where cv.user_id = auth.uid()
  ),
  recent_evidence as (
    select
      e.room_id,
      'added_evidence' as engagement_type,
      'You added evidence' as engagement_detail,
      e.created_at as last_engaged_at
    from public.evidence e
    where e.created_by = auth.uid()
  ),
  recent_claims as (
    select
      c.room_id,
      'asserted_claim' as engagement_type,
      'You asserted a claim' as engagement_detail,
      c.created_at as last_engaged_at
    from public.claims c
    where c.created_by = auth.uid()
  ),
  recent_inquiries as (
    select
      i.room_id,
      'opened_inquiry' as engagement_type,
      'You opened an inquiry' as engagement_detail,
      i.created_at as last_engaged_at
    from public.inquiry_items i
    where i.created_by = auth.uid()
  ),
  recent_responses as (
    select
      i.room_id,
      'responded_to_inquiry' as engagement_type,
      'You responded to an inquiry' as engagement_detail,
      ir.created_at as last_engaged_at
    from public.inquiry_responses ir
    join public.inquiry_items i on i.id = ir.inquiry_item_id
    where ir.created_by = auth.uid()
  ),
  recent_participants as (
    select
      dp.room_id,
      'joined_debate' as engagement_type,
      'You joined this debate' as engagement_detail,
      dp.joined_at as last_engaged_at
    from public.debate_participants dp
    where dp.user_id = auth.uid()
  ),
  all_engagement as (
    select * from recent_votes
    union all
    select * from recent_evidence
    union all
    select * from recent_claims
    union all
    select * from recent_inquiries
    union all
    select * from recent_responses
    union all
    select * from recent_participants
  )
  select
    r.id as room_id,
    r.title as room_title,
    r.slug as room_slug,
    r.room_type,
    max(e.engagement_type) as engagement_type,
    max(e.engagement_detail) as engagement_detail,
    max(e.last_engaged_at) as last_engaged_at
  from all_engagement e
  join public.rooms r on r.id = e.room_id
  where r.visibility = 'public' and r.status <> 'archived'
  group by r.id, r.title, r.slug, r.room_type
  order by last_engaged_at desc
  limit p_limit;
$$;

revoke all on function public.get_my_recent_engagement(integer) from public, anon;
grant execute on function public.get_my_recent_engagement(integer) to authenticated;

-- === 3. 202606260003_create_save_target_secure_rpc.sql ===
-- Migration: Add SECURITY DEFINER RPC for atomic save validation and insertion

create or replace function public.save_target_secure(
  p_target_type text,
  p_target_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_save_id uuid;
begin
  if p_target_type not in ('discussion', 'debate', 'claim', 'evidence') then
    raise exception 'Invalid target type';
  end if;

  if p_target_type in ('discussion', 'debate') then
    if public.has_room_access(p_target_id) then
      select r.id into v_room_id
      from public.rooms r
      where r.id = p_target_id
        and r.status <> 'archived';
    else
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'claim' then
    select c.room_id into v_room_id
    from public.claims c
    where c.id = p_target_id
      and not c.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'evidence' then
    select e.room_id into v_room_id
    from public.evidence e
    where e.id = p_target_id
      and not e.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  end if;

  insert into public.user_saves (user_id, target_type, target_id)
  values (auth.uid(), p_target_type, p_target_id)
  on conflict (user_id, target_type, target_id) do nothing
  returning id into v_save_id;

  return v_save_id;
end;
$$;

revoke all on function public.save_target_secure(text, uuid) from public, anon;
grant execute on function public.save_target_secure(text, uuid) to authenticated;

-- === 4. 202606260004_fix_recent_engagement_rpc.sql ===
-- Migration: Fix get_my_recent_engagement to return action/detail
-- from the same row as the latest engagement per room.

create or replace function public.get_my_recent_engagement(p_limit integer default 5)
returns table (
  room_id uuid,
  room_title text,
  room_slug text,
  room_type text,
  engagement_type text,
  engagement_detail text,
  last_engaged_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with recent_votes as (
    select
      c.room_id,
      'voted' as engagement_type,
      case cv.vote_type
        when 'agree' then 'You agreed with a claim'
        when 'disagree' then 'You contested a claim'
      end as engagement_detail,
      cv.created_at as last_engaged_at
    from public.claim_votes cv
    join public.claims c on c.id = cv.claim_id
    where cv.user_id = auth.uid()
  ),
  recent_evidence as (
    select
      e.room_id,
      'added_evidence' as engagement_type,
      'You added evidence' as engagement_detail,
      e.created_at as last_engaged_at
    from public.evidence e
    where e.created_by = auth.uid()
  ),
  recent_claims as (
    select
      c.room_id,
      'asserted_claim' as engagement_type,
      'You asserted a claim' as engagement_detail,
      c.created_at as last_engaged_at
    from public.claims c
    where c.created_by = auth.uid()
  ),
  recent_inquiries as (
    select
      i.room_id,
      'opened_inquiry' as engagement_type,
      'You opened an inquiry' as engagement_detail,
      i.created_at as last_engaged_at
    from public.inquiry_items i
    where i.created_by = auth.uid()
  ),
  recent_responses as (
    select
      i.room_id,
      'responded_to_inquiry' as engagement_type,
      'You responded to an inquiry' as engagement_detail,
      ir.created_at as last_engaged_at
    from public.inquiry_responses ir
    join public.inquiry_items i on i.id = ir.inquiry_item_id
    where ir.created_by = auth.uid()
  ),
  recent_participants as (
    select
      dp.room_id,
      'joined_debate' as engagement_type,
      'You joined this debate' as engagement_detail,
      dp.joined_at as last_engaged_at
    from public.debate_participants dp
    where dp.user_id = auth.uid()
  ),
  all_engagement as (
    select * from recent_votes
    union all
    select * from recent_evidence
    union all
    select * from recent_claims
    union all
    select * from recent_inquiries
    union all
    select * from recent_responses
    union all
    select * from recent_participants
  ),
  latest_per_room as (
    select distinct on (e.room_id)
      e.room_id,
      e.engagement_type,
      e.engagement_detail,
      e.last_engaged_at
    from all_engagement e
    order by e.room_id, e.last_engaged_at desc
  )
  select
    r.id as room_id,
    r.title as room_title,
    r.slug as room_slug,
    r.room_type,
    l.engagement_type,
    l.engagement_detail,
    l.last_engaged_at
  from latest_per_room l
  join public.rooms r on r.id = l.room_id
  where r.visibility = 'public' and r.status <> 'archived'
  order by l.last_engaged_at desc
  limit p_limit;
$$;

revoke all on function public.get_my_recent_engagement(integer) from public, anon;
grant execute on function public.get_my_recent_engagement(integer) to authenticated;

-- === 5. 202606260005_save_target_room_type_integrity.sql ===
-- Migration: Enforce room_type integrity in save_target_secure RPC

create or replace function public.save_target_secure(
  p_target_type text,
  p_target_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_save_id uuid;
begin
  if p_target_type not in ('discussion', 'debate', 'claim', 'evidence') then
    raise exception 'Invalid target type';
  end if;

  if p_target_type in ('discussion', 'debate') then
    if public.has_room_access(p_target_id) then
      select r.id into v_room_id
      from public.rooms r
      where r.id = p_target_id
        and r.status <> 'archived'
        and r.room_type = p_target_type;
    else
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'claim' then
    select c.room_id into v_room_id
    from public.claims c
    where c.id = p_target_id
      and not c.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'evidence' then
    select e.room_id into v_room_id
    from public.evidence e
    where e.id = p_target_id
      and not e.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  end if;

  insert into public.user_saves (user_id, target_type, target_id)
  values (auth.uid(), p_target_type, p_target_id)
  on conflict (user_id, target_type, target_id) do nothing
  returning id into v_save_id;

  return v_save_id;
end;
$$;

revoke all on function public.save_target_secure(text, uuid) from public, anon;
grant execute on function public.save_target_secure(text, uuid) to authenticated;
