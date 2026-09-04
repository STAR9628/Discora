-- Migration: 202606190001_security_hardening_p0_p1.sql
-- Security Remediation: P0/P1 Database Authorization Hardening
--
-- P0-1: Revoke direct execution of post_system_message from PUBLIC/anon/authenticated/postgrest
-- P0-2: Revoke direct INSERT on reputation_events and remove WITH CHECK (true) policy
-- P0-3: Revoke direct execution of create_reputation_event helper from PUBLIC/anon/authenticated/postgrest
-- P0-4: Drop legacy client-side INSERT policy on user_reputation_snapshots and revoke INSERT
-- P1-1: Restrict recalculate_user_reputation to authenticated caller for self-only (or admin)
-- Inquiries: Block inquiry insertion into archived rooms (RLS + RPC)
-- Function Hygiene: Pin search_path = public on auto_slugify_trigger, get_user_preferences, get_my_moderation_flags

-- ============================================================================
-- 1. P0-1: Lock down public.post_system_message
-- ============================================================================
-- post_system_message is an internal helper called exclusively by switch_debate_side.
-- Direct execution must not be reachable by untrusted roles or via PostgREST.
revoke execute on function public.post_system_message(uuid, text) from public;
revoke execute on function public.post_system_message(uuid, text) from anon;
revoke execute on function public.post_system_message(uuid, text) from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgrest') then
    execute 'revoke execute on function public.post_system_message(uuid, text) from postgrest;';
  end if;
end $$;

-- ============================================================================
-- 2. P0-2: Lock down public.reputation_events
-- ============================================================================
-- Events are generated exclusively by database triggers and internal SECURITY DEFINER functions.
-- Remove all direct client INSERT capabilities and drop the WITH CHECK (true) policy.
revoke insert on table public.reputation_events from anon;
revoke insert on table public.reputation_events from authenticated;
revoke insert on table public.reputation_events from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgrest') then
    execute 'revoke insert on table public.reputation_events from postgrest;';
  end if;
end $$;

drop policy if exists "System can insert reputation events" on public.reputation_events;

-- ============================================================================
-- 3. P0-3: Lock down public.create_reputation_event
-- ============================================================================
-- Helper routine for internal triggers and functions. Must not be exposed as a public RPC.
revoke execute on function public.create_reputation_event(uuid, text, integer, jsonb) from public;
revoke execute on function public.create_reputation_event(uuid, text, integer, jsonb) from anon;
revoke execute on function public.create_reputation_event(uuid, text, integer, jsonb) from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgrest') then
    execute 'revoke execute on function public.create_reputation_event(uuid, text, integer, jsonb) from postgrest;';
  end if;
end $$;

-- ============================================================================
-- 4. P0-4: Lock down public.user_reputation_snapshots
-- ============================================================================
-- Snapshots are database-authoritative (written by recalculate_user_reputation).
-- Drop legacy client-side INSERT policy and revoke direct table INSERT.
drop policy if exists "Users can insert their own reputation snapshots" on public.user_reputation_snapshots;

revoke insert on table public.user_reputation_snapshots from anon;
revoke insert on table public.user_reputation_snapshots from authenticated;
revoke insert on table public.user_reputation_snapshots from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgrest') then
    execute 'revoke insert on table public.user_reputation_snapshots from postgrest;';
  end if;
end $$;

-- ============================================================================
-- 5. P1-1: Harden public.recalculate_user_reputation
-- ============================================================================
-- Must require authentication, enforce that caller is calculating their own score
-- (or has admin role), and deny execution to anon and public.
create or replace function public.recalculate_user_reputation(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_total_points numeric;
  v_expertise jsonb;
  v_consensus_bonus numeric;
  v_score numeric;
  v_user_id uuid := p_user_id;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not_authenticated' using hint = 'Authentication required.';
  end if;

  if v_caller_id != v_user_id and not public.has_role_or_higher(v_caller_id, 'admin'::public.user_role_type) then
    raise exception 'unauthorized' using hint = 'You can only recalculate your own reputation.';
  end if;

  -- 1. Sum all reputation events
  select coalesce(sum(points), 0) into v_total_points
  from public.reputation_events
  where user_id = v_user_id;

  -- 2. Calculate consensus bonus from claim votes
  --    (additional bonus when agree/(agree+disagree) > 60%)
  with claim_stats as (
    select
      c.id,
      count(*) filter (where cv.vote_type = 'agree') as agree_count,
      count(*) filter (where cv.vote_type = 'disagree') as disagree_count
    from public.claims c
    left join public.claim_votes cv on c.id = cv.claim_id
    where c.created_by = v_user_id and not c.is_retracted
    group by c.id
  )
  select coalesce(sum(
    case
      when (agree_count + disagree_count) > 0
       and (agree_count::numeric / (agree_count + disagree_count)) > 0.6
      then round(((agree_count::numeric / (agree_count + disagree_count)) - 0.6) * 10 * 5)
      else 0
    end
  ), 0) into v_consensus_bonus
  from claim_stats;

  v_score := v_total_points + v_consensus_bonus;

  -- 3. Calculate expertise from claims, evidence, questions
  with expertise_scores as (
    select topic, sum(points) as total_points from (
      select
        case c.claim_type
          when 'fact' then 'Science'
          when 'prediction' then 'Economics'
          when 'proposal' then 'Politics'
          when 'observation' then 'Technology'
          else 'General'
        end as topic,
        3 as points
      from public.claims c
      where c.created_by = v_user_id and not c.is_retracted
      union all
      select
        case e.evidence_type
          when 'scientific' then 'Science'
          when 'statistical' then 'Economics'
          when 'expert' then 'Health'
          when 'documentary' then 'Politics'
          when 'historical' then 'Politics'
          when 'technological' then 'Technology'
          else 'General'
        end as topic,
        2 as points
      from public.evidence e
      where e.created_by = v_user_id and not e.is_retracted
      union all
      select 'General' as topic, 1 as points
      from public.questions q
      where q.created_by = v_user_id and not q.is_retracted
    ) sub
    group by topic
    order by total_points desc
  )
  select jsonb_agg(jsonb_build_object('name', topic, 'score', total_points) order by total_points desc)
  into v_expertise
  from expertise_scores;

  -- 4. Create snapshot
  insert into public.user_reputation_snapshots (user_id, score, expertise)
  values (v_user_id, greatest(v_score, 0), coalesce(v_expertise, '[]'::jsonb));

  return greatest(v_score, 0);
end;
$$;

revoke execute on function public.recalculate_user_reputation(uuid) from public;
revoke execute on function public.recalculate_user_reputation(uuid) from anon;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgrest') then
    execute 'revoke execute on function public.recalculate_user_reputation(uuid) from postgrest;';
  end if;
end $$;

grant execute on function public.recalculate_user_reputation(uuid) to authenticated;

-- ============================================================================
-- 6. Inquiries: Prevent creation in archived rooms (RLS + RPC)
-- ============================================================================
drop policy if exists "Inquiry creation in accessible rooms" on public.inquiry_items;
create policy "Inquiry creation in accessible rooms"
  on public.inquiry_items
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.status <> 'archived'
        and (r.visibility = 'public' or r.created_by = auth.uid())
    )
  );

create or replace function public.create_inquiry(
  p_room_id uuid,
  p_target_claim_id uuid,
  p_inquiry_type text,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_inquiry_id uuid;
  v_inquiry_count int;
  v_current_side text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create an inquiry.';
  end if;

  -- Ensure room exists, is not archived, and is accessible
  if not exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and (r.visibility = 'public' or r.created_by = v_user_id)
  ) then
    raise exception 'room_not_accessible' using hint = 'Room does not exist, is archived, or is private.';
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

-- ============================================================================
-- 7. Function Hygiene: Explicit search_path pinning
-- ============================================================================
create or replace function public.auto_slugify_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_slug text;
  test_slug text;
  counter int := 1;
  exists_count int;
begin
  if new.slug is null or new.slug = '' then
    if tg_table_name = 'rooms' then
      base_slug := public.slugify(new.title);
    else
      base_slug := public.slugify(new.name);
    end if;
    
    test_slug := base_slug;
    
    loop
      if tg_table_name = 'rooms' then
        select count(*) into exists_count from public.rooms where slug = test_slug;
      else
        select count(*) into exists_count from public.topics where slug = test_slug;
      end if;
      
      exit when exists_count = 0;
      
      test_slug := base_slug || '-' || counter;
      counter := counter + 1;
    end loop;
    
    new.slug := test_slug;
  end if;
  
  return new;
end;
$$;

create or replace function public.get_user_preferences(p_user_id uuid)
returns table (
  show_reputation boolean,
  show_expertise boolean,
  show_side_switches boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select up.show_reputation, up.show_expertise, up.show_side_switches
  from public.user_preferences up
  where up.user_id = p_user_id;
$$;

create or replace function public.get_my_moderation_flags()
returns table (
  id uuid,
  reason text,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select mf.id, mf.reason, mf.status, mf.created_at, mf.resolved_at
  from public.moderation_flags mf
  where mf.reporter_id = auth.uid()
  order by mf.created_at desc;
$$;
