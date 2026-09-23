-- Migration: Founder / Co-Founder platform titles + automatic Founding Participant eligibility
--
-- 1. profiles.platform_title: controlled, display-only identity title ('founder' | 'co_founder').
--    Display only. Grants NO admin, moderation, reputation, ranking, or epistemic authority.
--    Changes are admin-only via prevent_platform_title_self_update (same pattern as
--    prevent_founding_member_self_update). Users cannot self-assign.
-- 2. prevent_founding_member_self_update: additionally honors the session-local
--    'discora.grant_founding' flag, which is set exclusively by the
--    evaluate_founding_status() RPC below. No other writer can set that flag.
-- 3. evaluate_founding_status(): SECURITY DEFINER RPC. Evaluates the lightweight,
--    PO-approved eligibility (account + >=1 discussion participation + >=1 debate
--    participation) for the caller (auth.uid()) and grants is_founding_member
--    automatically when satisfied. Participation uses only existing canonical
--    signals (messages, claims, evidence, questions, arguments, claim votes,
--    debate_participants). No points, thresholds, or prestige mechanics.
-- 4. No data backfill in this migration. Founder / Co-Founder assignment is
--    done per-environment after apply via set_platform_title() with exact UUIDs.

-- ============================================================================
-- 1. platform_title column
-- ============================================================================
alter table public.profiles
add column if not exists platform_title text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_platform_title_check'
  ) then
    alter table public.profiles
    add constraint profiles_platform_title_check
    check (platform_title is null or platform_title in ('founder', 'co_founder'));
  end if;
end $$;

comment on column public.profiles.platform_title is
  'Controlled platform identity title (founder | co_founder). Display only; grants no privileges. Admin-managed; users cannot self-assign.';

-- ============================================================================
-- 2. Guard trigger: platform_title is admin-only
-- ============================================================================
create or replace function public.prevent_platform_title_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.platform_title is distinct from new.platform_title then
    -- Controlled grant path (set exclusively by set_platform_title()).
    if current_setting('discora.grant_platform_title', true) = 'true' then
      return new;
    end if;
    if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
      new.platform_title := old.platform_title;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_platform_title_self_update on public.profiles;
create trigger prevent_platform_title_self_update
before update on public.profiles
for each row
execute function public.prevent_platform_title_self_update();

-- ============================================================================
-- 3. Founding-member guard: allow the automatic-grant RPC path
-- ============================================================================
create or replace function public.prevent_founding_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_founding_member is distinct from new.is_founding_member then
    -- Automatic eligibility grant (set exclusively by evaluate_founding_status()).
    if current_setting('discora.grant_founding', true) = 'true' then
      return new;
    end if;
    if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
      new.is_founding_member := old.is_founding_member;
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- 4. Eligibility + automatic grant RPC
-- ============================================================================
create or replace function public.evaluate_founding_status()
returns table (has_discussion boolean, has_debate boolean, is_founding_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_discussion boolean := false;
  v_has_debate boolean := false;
  v_is_member boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Discussion participation: any message, claim, evidence, question, argument,
  -- or claim vote authored in a discussion-type room.
  select exists (
    select 1 from public.messages m
    join public.rooms r on r.id = m.room_id
    where m.user_id = v_user_id and r.room_type = 'discussion'
  ) or exists (
    select 1 from public.claims c
    join public.rooms r on r.id = c.room_id
    where c.created_by = v_user_id and r.room_type = 'discussion'
  ) or exists (
    select 1 from public.evidence e
    join public.rooms r on r.id = e.room_id
    where e.created_by = v_user_id and r.room_type = 'discussion'
  ) or exists (
    select 1 from public.questions q
    join public.rooms r on r.id = q.room_id
    where q.created_by = v_user_id and r.room_type = 'discussion'
  ) or exists (
    select 1 from public.arguments a
    join public.rooms r on r.id = a.room_id
    where a.created_by = v_user_id and r.room_type = 'discussion'
  ) or exists (
    select 1 from public.claim_votes v
    join public.claims c on c.id = v.claim_id
    join public.rooms r on r.id = c.room_id
    where v.user_id = v_user_id and r.room_type = 'discussion'
  ) into v_has_discussion;

  -- Debate participation: joined a debate side, or any message, claim, evidence,
  -- question, argument, or claim vote in a debate-type room.
  select exists (
    select 1 from public.debate_participants p
    where p.user_id = v_user_id
  ) or exists (
    select 1 from public.messages m
    join public.rooms r on r.id = m.room_id
    where m.user_id = v_user_id and r.room_type = 'debate'
  ) or exists (
    select 1 from public.claims c
    join public.rooms r on r.id = c.room_id
    where c.created_by = v_user_id and r.room_type = 'debate'
  ) or exists (
    select 1 from public.evidence e
    join public.rooms r on r.id = e.room_id
    where e.created_by = v_user_id and r.room_type = 'debate'
  ) or exists (
    select 1 from public.questions q
    join public.rooms r on r.id = q.room_id
    where q.created_by = v_user_id and r.room_type = 'debate'
  ) or exists (
    select 1 from public.arguments a
    join public.rooms r on r.id = a.room_id
    where a.created_by = v_user_id and r.room_type = 'debate'
  ) or exists (
    select 1 from public.claim_votes v
    join public.claims c on c.id = v.claim_id
    join public.rooms r on r.id = c.room_id
    where v.user_id = v_user_id and r.room_type = 'debate'
  ) into v_has_debate;

  select p.is_founding_member into v_is_member
  from public.profiles p
  where p.id = v_user_id;

  -- Automatic lightweight recognition: account + discussion + debate.
  if v_has_discussion and v_has_debate and not coalesce(v_is_member, false) then
    perform set_config('discora.grant_founding', 'true', true);
    update public.profiles
    set is_founding_member = true
    where id = v_user_id;
    v_is_member := true;
  end if;

  return query select v_has_discussion, v_has_debate, coalesce(v_is_member, false);
end;
$$;

revoke all on function public.evaluate_founding_status() from public, anon;
grant execute on function public.evaluate_founding_status() to authenticated;

comment on function public.evaluate_founding_status() is
  'PO-approved lightweight Founding Participant eligibility (discussion + debate participation). Auto-grants profiles.is_founding_member to the caller only. Display recognition; no privileges.';

-- ============================================================================
-- 5. Admin-only platform title grant (Founder / Co-Founder designation)
-- ============================================================================
create or replace function public.set_platform_title(p_user_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_title is not null and p_title not in ('founder', 'co_founder') then
    raise exception 'Invalid platform title' using errcode = '22023';
  end if;
  perform set_config('discora.grant_platform_title', 'true', true);
  update public.profiles
  set platform_title = p_title
  where id = p_user_id;
end;
$$;

revoke all on function public.set_platform_title(uuid, text) from public, anon;
grant execute on function public.set_platform_title(uuid, text) to authenticated;

comment on function public.set_platform_title(uuid, text) is
  'Admin-only grant/revoke of controlled platform identity titles (founder | co_founder). Display only; no privileges.';

-- NOTE: Founder / Co-Founder title assignment is intentionally NOT performed
-- in this migration. Local and production identities differ, so assignment is
-- done per-environment after apply via set_platform_title() with exact UUIDs.
