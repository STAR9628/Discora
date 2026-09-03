-- ================================================
-- P0 FIX: Deploy pending migrations #23-#31
-- Run this in Supabase Dashboard SQL Editor.
-- Execute IN ORDER.
-- NOTE: Sections 1-3 (migrations #20-#22) omitted -
-- already deployed in production.
-- ================================================


-- === 4. 202606100002_fix_debate_insert_policy.sql ===
-- Migration: Add missing INSERT policy for debates table

-- Migration: Add missing INSERT policy for debates table
--
-- Root cause: create_debate_room RPC (SECURITY INVOKER) inserts into
-- public.debates, but the table only had SELECT and UPDATE policies.
-- The anon_key call path succeeds at function execution but fails at
-- the INSERT into debates due to RLS violation.
--
-- Fix: Add INSERT policy matching the pattern already used by
-- public.discussions (see 202606030003_create_discussions.sql:279-290).
--
-- Verified: GRANT EXECUTE on create_debate_room is NOT needed;
-- the function is already executable with anon key. Only the
-- underlying table INSERT policy was missing.

drop policy if exists "Authenticated users can create debates" on public.debates;

create policy "Authenticated users can create debates"
  on public.debates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = debates.id
        and rooms.created_by = auth.uid()
    )
  );


-- === 5. 202606100003_debate_sort_and_status_sync.sql ===
-- Migration: Debate sort, status sync, and pagination support

-- Migration: Debate sort, status sync, and pagination support
-- Extends discussion_debates view with room fields and sort columns
-- Creates resolve_debate RPC for atomic status sync

-- 1. Recreate discussion_debates view with room fields, sort columns, and evidence count
drop view if exists public.discussion_debates;

create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.resolution,
  d.created_at,
  d.updated_at,
  -- room fields for feed rendering (avoids separate query)
  r.title,
  r.slug,
  r.description,
  r.created_by as room_created_by,
  r.topic_id,
  r.visibility,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at,
  -- claim counts per side
  coalesce(pc.count, 0) as proposition_claim_count,
  coalesce(oc.count, 0) as opposition_claim_count,
  -- total claims (sort column)
  coalesce(pc.count, 0) + coalesce(oc.count, 0) as total_claims,
  -- participant counts per side
  coalesce(pp.count, 0) as proposition_participant_count,
  coalesce(op.count, 0) as opposition_participant_count,
  coalesce(np.count, 0) as neutral_participant_count,
  -- total participants (sort column)
  coalesce(pp.count, 0) + coalesce(op.count, 0) + coalesce(np.count, 0) as total_participants,
  -- evidence count via claim_evidence junction
  coalesce(ev.count, 0) as total_evidence,
  -- last activity timestamp (sort column)
  greatest(
    d.created_at,
    coalesce(last_claim.created_at, d.created_at),
    coalesce(last_evidence.created_at, d.created_at),
    coalesce(last_participant.joined_at, d.created_at)
  ) as last_activity_at
from public.debates d
-- Existing joins for claims and participants
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'proposition' and not is_retracted
  group by room_id
) pc on d.id = pc.room_id
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'opposition' and not is_retracted
  group by room_id
) oc on d.id = oc.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'proposition'
  group by room_id
) pp on d.id = pp.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'opposition'
  group by room_id
) op on d.id = op.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'neutral'
  group by room_id
) np on d.id = np.room_id
-- Evidence count: distinct evidence linked to claims in this room
left join (
  select c.room_id, count(distinct ce.evidence_id) as count
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  where not c.is_retracted
  group by c.room_id
) ev on d.id = ev.room_id
-- Last claim created_at
left join (
  select room_id, max(created_at) as created_at
  from public.claims
  where not is_retracted
  group by room_id
) last_claim on d.id = last_claim.room_id
-- Last evidence created_at
left join (
  select c.room_id, max(e.created_at) as created_at
  from public.claims c
  inner join public.claim_evidence ce on c.id = ce.claim_id
  inner join public.evidence e on ce.evidence_id = e.id
  where not c.is_retracted and not e.is_retracted
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
-- Last participant joined_at
left join (
  select room_id, max(joined_at) as joined_at
  from public.debate_participants
  group by room_id
) last_participant on d.id = last_participant.room_id
-- Room join for title, slug, etc.
inner join public.rooms r on d.id = r.id and r.room_type = 'debate'
where exists (
  select 1 from public.rooms r2
  where r2.id = d.id and r2.room_type = 'debate'
);

grant select on public.discussion_debates to anon, authenticated;

-- 2. Create resolve_debate RPC for atomic status sync
create or replace function public.resolve_debate(
  p_room_id uuid,
  p_winner text,
  p_summary text,
  p_resolved_by uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debate record;
begin
  -- Validate debate exists and check resolution requirements
  select * into v_debate
  from public.discussion_debates
  where id = p_room_id;

  if not found then
    raise exception 'Debate not found.';
  end if;

  if v_debate.proposition_participant_count < 1 then
    raise exception 'Resolution requires at least one proposition participant.';
  end if;
  if v_debate.opposition_participant_count < 1 then
    raise exception 'Resolution requires at least one opposition participant.';
  end if;
  if v_debate.proposition_claim_count < 1 then
    raise exception 'Resolution requires at least one proposition claim.';
  end if;
  if v_debate.opposition_claim_count < 1 then
    raise exception 'Resolution requires at least one opposition claim.';
  end if;

  -- Atomically update both tables
  update public.debates
  set status = 'resolved',
      resolution = jsonb_build_object(
        'winner', p_winner,
        'summary', p_summary,
        'resolvedBy', p_resolved_by
      ),
      updated_at = now()
  where id = p_room_id;

  update public.rooms
  set status = 'inactive',
      updated_at = now()
  where id = p_room_id;
end;
$$;


-- === 6. 202606100004_create_reputation_events.sql ===
-- Migration: Create reputation event system

-- Migration: Create reputation event system
-- Moves reputation from "client-side computed" to "database authoritative"
-- Phase 1: reputation_events table, triggers, and recalculate RPC

-- ==========================================
-- 1A: reputation_events table
-- ==========================================

create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reputation_events_user_id
  on public.reputation_events(user_id, created_at desc);

create index if not exists idx_reputation_events_type
  on public.reputation_events(event_type);

alter table public.reputation_events enable row level security;

-- Users can view their own reputation events
create policy "Users can view their own reputation events"
  on public.reputation_events for select
  using (user_id = auth.uid());

-- Events are created by database triggers (SECURITY DEFINER), not by users directly
create policy "System can insert reputation events"
  on public.reputation_events for insert
  with check (true);

-- Events are immutable: no update, no delete policies

-- ==========================================
-- 1B: create_reputation_event helper RPC
-- ==========================================

create or replace function public.create_reputation_event(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reputation_events (user_id, event_type, points, metadata)
  values (p_user_id, p_event_type, p_points, p_metadata);
end;
$$;

-- ==========================================
-- 1B: recalculate_user_reputation RPC
-- ==========================================

create or replace function public.recalculate_user_reputation(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_points numeric;
  v_expertise jsonb;
  v_consensus_bonus numeric;
  v_score numeric;
  v_user_id uuid := p_user_id;
begin
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

-- ==========================================
-- 1C: Trigger functions
-- ==========================================

-- CLAIMS: created
create or replace function public.handle_claim_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    perform public.create_reputation_event(
      new.created_by,
      'CLAIM_CREATED',
      10,
      jsonb_build_object('claim_id', new.id, 'room_id', new.room_id, 'claim_type', new.claim_type)
    );
  end if;
  return new;
end;
$$;

-- CLAIMS: retracted
create or replace function public.handle_claim_retract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.created_by is not null and not old.is_retracted and new.is_retracted then
    perform public.create_reputation_event(
      old.created_by,
      'CLAIM_RETRACTED',
      -20,
      jsonb_build_object('claim_id', new.id, 'room_id', new.room_id)
    );
  end if;
  return new;
end;
$$;

-- CLAIM VOTES: inserted (agree/disagree)
create or replace function public.handle_claim_vote_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_creator uuid;
begin
  select c.created_by into v_claim_creator
  from public.claims c
  where c.id = new.claim_id;

  -- Don't count self-votes
  if v_claim_creator is not null and v_claim_creator != new.user_id then
    perform public.create_reputation_event(
      v_claim_creator,
      case when new.vote_type = 'agree' then 'CLAIM_AGREED' else 'CLAIM_DISAGREED' end,
      case when new.vote_type = 'agree' then 2 else -1 end,
      jsonb_build_object('claim_id', new.claim_id, 'voter_id', new.user_id, 'vote_type', new.vote_type)
    );
  end if;
  return new;
end;
$$;

-- CLAIM VOTES: deleted (vote removed → compensate)
create or replace function public.handle_claim_vote_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_creator uuid;
begin
  select c.created_by into v_claim_creator
  from public.claims c
  where c.id = old.claim_id;

  if v_claim_creator is not null and v_claim_creator != old.user_id then
    perform public.create_reputation_event(
      v_claim_creator,
      case when old.vote_type = 'agree' then 'CLAIM_DISAGREED' else 'CLAIM_AGREED' end,
      case when old.vote_type = 'agree' then -2 else 1 end,
      jsonb_build_object('claim_id', old.claim_id, 'voter_id', old.user_id, 'reason', 'vote_removed')
    );
  end if;
  return old;
end;
$$;

-- EVIDENCE: submitted
create or replace function public.handle_evidence_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    perform public.create_reputation_event(
      new.created_by,
      'EVIDENCE_SUBMITTED',
      15,
      jsonb_build_object('evidence_id', new.id, 'room_id', new.room_id, 'evidence_type', new.evidence_type)
    );
  end if;
  return new;
end;
$$;

-- EVIDENCE: retracted
create or replace function public.handle_evidence_retract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.created_by is not null and not old.is_retracted and new.is_retracted then
    perform public.create_reputation_event(
      old.created_by,
      'EVIDENCE_RETRACTED',
      -15,
      jsonb_build_object('evidence_id', new.id, 'room_id', new.room_id)
    );
  end if;
  return new;
end;
$$;

-- EVIDENCE VOTES: inserted
create or replace function public.handle_evidence_vote_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence_creator uuid;
begin
  select e.created_by into v_evidence_creator
  from public.evidence e
  where e.id = new.evidence_id;

  if v_evidence_creator is not null and v_evidence_creator != new.user_id then
    perform public.create_reputation_event(
      v_evidence_creator,
      case when new.vote_type = 'agree' then 'EVIDENCE_APPROVED' else 'EVIDENCE_DISPUTED' end,
      case when new.vote_type = 'agree' then 2 else -1 end,
      jsonb_build_object('evidence_id', new.evidence_id, 'voter_id', new.user_id, 'vote_type', new.vote_type)
    );
  end if;
  return new;
end;
$$;

-- EVIDENCE VOTES: deleted
create or replace function public.handle_evidence_vote_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence_creator uuid;
begin
  select e.created_by into v_evidence_creator
  from public.evidence e
  where e.id = old.evidence_id;

  if v_evidence_creator is not null and v_evidence_creator != old.user_id then
    perform public.create_reputation_event(
      v_evidence_creator,
      case when old.vote_type = 'agree' then 'EVIDENCE_DISPUTED' else 'EVIDENCE_APPROVED' end,
      case when old.vote_type = 'agree' then -2 else 1 end,
      jsonb_build_object('evidence_id', old.evidence_id, 'voter_id', old.user_id, 'reason', 'vote_removed')
    );
  end if;
  return old;
end;
$$;

-- QUESTIONS: asked
create or replace function public.handle_question_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    perform public.create_reputation_event(
      new.created_by,
      'QUESTION_ASKED',
      5,
      jsonb_build_object('question_id', new.id, 'room_id', new.room_id, 'question_type', new.question_type)
    );
  end if;
  return new;
end;
$$;

-- DEBATES: created (insert into debates table)
create or replace function public.handle_debate_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
begin
  select r.created_by into v_creator
  from public.rooms r
  where r.id = new.id;

  if v_creator is not null then
    perform public.create_reputation_event(
      v_creator,
      'DEBATE_CREATED',
      15,
      jsonb_build_object('debate_id', new.id)
    );
  end if;
  return new;
end;
$$;

-- DEBATE PARTICIPANTS: joined
create or replace function public.handle_debate_participant_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_reputation_event(
    new.user_id,
    'DEBATE_JOINED',
    5,
    jsonb_build_object('debate_id', new.room_id, 'side', new.side)
  );
  return new;
end;
$$;

-- DEBATES: resolved (winner assignment)
create or replace function public.handle_debate_resolve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner text;
  rec record;
begin
  -- Only fire when status changes to 'resolved'
  if old.status != 'resolved' and new.status = 'resolved' then
    v_winner := new.resolution->>'winner';

    if v_winner is not null and v_winner != 'draw' then
      -- Award winners
      for rec in
        select user_id from public.debate_participants
        where room_id = new.id and side = v_winner
      loop
        perform public.create_reputation_event(
          rec.user_id,
          'DEBATE_WON',
          25,
          jsonb_build_object('debate_id', new.id, 'side', v_winner)
        );
      end loop;

      -- Penalize losers
      for rec in
        select user_id from public.debate_participants
        where room_id = new.id and side != v_winner and side != 'neutral'
      loop
        perform public.create_reputation_event(
          rec.user_id,
          'DEBATE_LOST',
          -5,
          jsonb_build_object('debate_id', new.id, 'winner_side', v_winner)
        );
      end loop;
    end if;
  end if;
  return new;
end;
$$;

-- ==========================================
-- 1C: Triggers
-- ==========================================

-- Claims
drop trigger if exists trg_reputation_claim_insert on public.claims;
create trigger trg_reputation_claim_insert
  after insert on public.claims
  for each row
  when (new.created_by is not null)
  execute function public.handle_claim_insert();

drop trigger if exists trg_reputation_claim_retract on public.claims;
create trigger trg_reputation_claim_retract
  after update of is_retracted on public.claims
  for each row
  when (not old.is_retracted and new.is_retracted)
  execute function public.handle_claim_retract();

-- Claim votes
drop trigger if exists trg_reputation_claim_vote_insert on public.claim_votes;
create trigger trg_reputation_claim_vote_insert
  after insert on public.claim_votes
  for each row
  execute function public.handle_claim_vote_insert();

drop trigger if exists trg_reputation_claim_vote_delete on public.claim_votes;
create trigger trg_reputation_claim_vote_delete
  after delete on public.claim_votes
  for each row
  execute function public.handle_claim_vote_delete();

-- Evidence
drop trigger if exists trg_reputation_evidence_insert on public.evidence;
create trigger trg_reputation_evidence_insert
  after insert on public.evidence
  for each row
  when (new.created_by is not null)
  execute function public.handle_evidence_insert();

drop trigger if exists trg_reputation_evidence_retract on public.evidence;
create trigger trg_reputation_evidence_retract
  after update of is_retracted on public.evidence
  for each row
  when (not old.is_retracted and new.is_retracted)
  execute function public.handle_evidence_retract();

-- Evidence votes
drop trigger if exists trg_reputation_evidence_vote_insert on public.evidence_votes;
create trigger trg_reputation_evidence_vote_insert
  after insert on public.evidence_votes
  for each row
  execute function public.handle_evidence_vote_insert();

drop trigger if exists trg_reputation_evidence_vote_delete on public.evidence_votes;
create trigger trg_reputation_evidence_vote_delete
  after delete on public.evidence_votes
  for each row
  execute function public.handle_evidence_vote_delete();

-- Questions
drop trigger if exists trg_reputation_question_insert on public.questions;
create trigger trg_reputation_question_insert
  after insert on public.questions
  for each row
  when (new.created_by is not null)
  execute function public.handle_question_insert();

-- Debates
drop trigger if exists trg_reputation_debate_insert on public.debates;
create trigger trg_reputation_debate_insert
  after insert on public.debates
  for each row
  execute function public.handle_debate_insert();

-- Debate participants
drop trigger if exists trg_reputation_debate_participant_insert on public.debate_participants;
create trigger trg_reputation_debate_participant_insert
  after insert on public.debate_participants
  for each row
  execute function public.handle_debate_participant_insert();

-- Debate resolution
drop trigger if exists trg_reputation_debate_resolve on public.debates;
create trigger trg_reputation_debate_resolve
  after update of status on public.debates
  for each row
  when (new.status = 'resolved' and old.status != 'resolved')
  execute function public.handle_debate_resolve();

-- Note: After migration, run the following to backfill existing users' reputation:
-- SELECT public.recalculate_user_reputation(id) FROM public.profiles;


-- === 7. 202606100005_reputation_stabilization.sql ===
-- Migration: Reputation Stabilization

-- Migration: Reputation Stabilization
-- Fixes three issues identified in REPUTATION_VALIDATION.md and TRIGGER_AUDIT.md:
--   1. UPSERT vote-switch compensation (claim_votes, evidence_votes)
--   2. UPSERT side-switch compensation (debate_participants)
--   3. Hard immutability for reputation_events (block UPDATE/DELETE)

-- ==========================================
-- Fix 1A: BEFORE INSERT trigger on claim_votes
-- ==========================================

-- Detect UPSERT on existing vote. If vote_type differs:
--   a) create compensating event for old vote type
--   b) create event for new vote type
--   c) UPDATE existing row
--   d) RETURN NULL (skip INSERT, AFTER INSERT trigger won't fire)
-- If vote_type unchanged: UPDATE row, RETURN NULL (no events needed).
-- If new vote: RETURN NEW (INSERT proceeds, AFTER INSERT trigger fires).

create or replace function public.handle_claim_vote_before_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_vote_type text;
  v_claim_creator uuid;
begin
  select cv.vote_type into v_old_vote_type
  from public.claim_votes cv
  where cv.user_id = new.user_id and cv.claim_id = new.claim_id
  for update;

  if found then
    select c.created_by into v_claim_creator
    from public.claims c
    where c.id = new.claim_id;

    if v_old_vote_type != new.vote_type
       and v_claim_creator is not null
       and v_claim_creator != new.user_id
    then
      perform public.create_reputation_event(
        v_claim_creator,
        case when v_old_vote_type = 'agree' then 'CLAIM_DISAGREED' else 'CLAIM_AGREED' end,
        case when v_old_vote_type = 'agree' then -2 else 1 end,
        jsonb_build_object('claim_id', new.claim_id, 'voter_id', new.user_id, 'reason', 'vote_switch_compensation')
      );

      perform public.create_reputation_event(
        v_claim_creator,
        case when new.vote_type = 'agree' then 'CLAIM_AGREED' else 'CLAIM_DISAGREED' end,
        case when new.vote_type = 'agree' then 2 else -1 end,
        jsonb_build_object('claim_id', new.claim_id, 'voter_id', new.user_id, 'vote_type', new.vote_type)
      );
    end if;

    update public.claim_votes
    set vote_type = new.vote_type
    where user_id = new.user_id and claim_id = new.claim_id;

    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_claim_vote_before_upsert on public.claim_votes;
create trigger trg_claim_vote_before_upsert
  before insert on public.claim_votes
  for each row
  execute function public.handle_claim_vote_before_upsert();

-- ==========================================
-- Fix 1B: BEFORE INSERT trigger on evidence_votes
-- ==========================================

create or replace function public.handle_evidence_vote_before_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_vote_type text;
  v_evidence_creator uuid;
begin
  select ev.vote_type into v_old_vote_type
  from public.evidence_votes ev
  where ev.user_id = new.user_id and ev.evidence_id = new.evidence_id
  for update;

  if found then
    select e.created_by into v_evidence_creator
    from public.evidence e
    where e.id = new.evidence_id;

    if v_old_vote_type != new.vote_type
       and v_evidence_creator is not null
       and v_evidence_creator != new.user_id
    then
      perform public.create_reputation_event(
        v_evidence_creator,
        case when v_old_vote_type = 'agree' then 'EVIDENCE_DISPUTED' else 'EVIDENCE_APPROVED' end,
        case when v_old_vote_type = 'agree' then -2 else 1 end,
        jsonb_build_object('evidence_id', new.evidence_id, 'voter_id', new.user_id, 'reason', 'vote_switch_compensation')
      );

      perform public.create_reputation_event(
        v_evidence_creator,
        case when new.vote_type = 'agree' then 'EVIDENCE_APPROVED' else 'EVIDENCE_DISPUTED' end,
        case when new.vote_type = 'agree' then 2 else -1 end,
        jsonb_build_object('evidence_id', new.evidence_id, 'voter_id', new.user_id, 'vote_type', new.vote_type)
      );
    end if;

    update public.evidence_votes
    set vote_type = new.vote_type
    where user_id = new.user_id and evidence_id = new.evidence_id;

    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_evidence_vote_before_upsert on public.evidence_votes;
create trigger trg_evidence_vote_before_upsert
  before insert on public.evidence_votes
  for each row
  execute function public.handle_evidence_vote_before_upsert();

-- ==========================================
-- Fix 2: BEFORE INSERT trigger on debate_participants
-- ==========================================

create or replace function public.handle_debate_participant_before_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.debate_participants
    where room_id = new.room_id and user_id = new.user_id
    for update
  ) then
    update public.debate_participants
    set side = new.side
    where room_id = new.room_id and user_id = new.user_id;

    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_debate_participant_before_upsert on public.debate_participants;
create trigger trg_debate_participant_before_upsert
  before insert on public.debate_participants
  for each row
  execute function public.handle_debate_participant_before_upsert();

-- ==========================================
-- Fix 3: Hard immutability for reputation_events
-- ==========================================

create or replace function public.prevent_reputation_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'reputation_events are immutable: % of row % is not allowed', tg_op, old.id
    using hint = 'Reputation events can only be created by database triggers. Direct UPDATE/DELETE is prohibited.';
end;
$$;

drop trigger if exists trg_reputation_events_immutable_update on public.reputation_events;
create trigger trg_reputation_events_immutable_update
  before update on public.reputation_events
  for each row
  execute function public.prevent_reputation_event_mutation();

drop trigger if exists trg_reputation_events_immutable_delete on public.reputation_events;
create trigger trg_reputation_events_immutable_delete
  before delete on public.reputation_events
  for each row
  execute function public.prevent_reputation_event_mutation();


-- === 8. 202606110001_create_side_switch.sql ===
-- Migration: Create side switching infrastructure

-- Migration: Create side switching infrastructure
-- This migration is append-only. It does not modify existing data.

-- 1. Create debate_side_changes table (immutable, append-only audit trail)
create table if not exists public.debate_side_changes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_side text not null check (previous_side in ('proposition', 'opposition')),
  new_side text not null check (new_side in ('proposition', 'opposition')),
  reason text not null check (char_length(reason) >= 50),
  created_at timestamptz not null default now()
);

-- Prevent updates and deletes on debate_side_changes
create or replace function public.prevent_debate_side_change_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'debate_side_changes are immutable: % of row is not allowed', tg_op
    using hint = 'Side change records can only be created. Updates and deletes are prohibited.';
end;
$$;

drop trigger if exists trg_debate_side_changes_immutable_update on public.debate_side_changes;
create trigger trg_debate_side_changes_immutable_update
  before update on public.debate_side_changes
  for each row
  execute function public.prevent_debate_side_change_mutation();

drop trigger if exists trg_debate_side_changes_immutable_delete on public.debate_side_changes;
create trigger trg_debate_side_changes_immutable_delete
  before delete on public.debate_side_changes
  for each row
  execute function public.prevent_debate_side_change_mutation();

-- RLS: Users can only view their own side changes
alter table public.debate_side_changes enable row level security;

drop policy if exists "Users can view own side changes" on public.debate_side_changes;
create policy "Users can view own side changes"
  on public.debate_side_changes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own side changes" on public.debate_side_changes;
create policy "Users can insert own side changes"
  on public.debate_side_changes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 2. Add 'system' to messages message_type check constraint
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('message', 'question', 'system'));

-- 3. Update handle_message_identity_mode trigger to handle system messages
create or replace function public.handle_message_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.message_type = 'system' then
      new.user_id := null;
      new.identity_mode := 'public';
    else
      new.user_id := auth.uid();
      new.identity_mode := coalesce(new.identity_mode, 'public');
    end if;
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

-- 4. Update discussion_messages view to handle system messages
drop view if exists public.discussion_messages;
create view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  m.content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.message_type = 'system' then 'System'
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url
from public.messages m
left join public.profiles p on m.user_id = p.id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_messages to anon, authenticated;

-- 5. Create post_system_message RPC (bypasses RLS with security definer)
create or replace function public.post_system_message(
  p_room_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  insert into public.messages (room_id, content, message_type, identity_mode, user_id)
  values (p_room_id, p_content, 'system', 'public', null)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

-- 6. Create switch_debate_side RPC (handles all side switch operations atomically)
create or replace function public.switch_debate_side(
  p_room_id uuid,
  p_new_side text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_side text;
  v_change_id uuid;
  v_system_message text;
  v_message_id uuid;
  v_username text;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to switch sides.';
  end if;

  -- Get username for system message
  select p.username into v_username
  from public.profiles p
  where p.id = v_user_id;

  -- Validate reason length
  if length(trim(p_reason)) < 50 then
    raise exception 'reason_too_short' using hint = 'Reason must be at least 50 characters.';
  end if;

  -- Validate new side
  if p_new_side not in ('proposition', 'opposition') then
    raise exception 'invalid_side' using hint = 'Side must be proposition or opposition.';
  end if;

  -- Get current participation
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    raise exception 'not_participating' using hint = 'You must join the debate before switching sides.';
  end if;

  if v_current_side = p_new_side then
    raise exception 'same_side' using hint = 'You are already on this side.';
  end if;

  if v_current_side = 'neutral' then
    raise exception 'neutral_switch' using hint = 'Neutral observers cannot switch sides directly. Leave and rejoin.';
  end if;

  -- UPSERT participant with new side
  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, p_new_side)
  on conflict (room_id, user_id)
  do update set side = p_new_side, joined_at = now();

  -- Insert immutable side change record
  insert into public.debate_side_changes (room_id, user_id, previous_side, new_side, reason)
  values (p_room_id, v_user_id, v_current_side, p_new_side, trim(p_reason))
  returning id into v_change_id;

  -- Create system message
  v_system_message :=
    coalesce(v_username, 'Someone') ||
    ' switched from ' ||
    case when v_current_side = 'proposition' then 'Support' else 'Challenge' end ||
    ' to ' ||
    case when p_new_side = 'proposition' then 'Support' else 'Challenge' end ||
    '. Reason: ' || trim(p_reason);

  perform public.post_system_message(p_room_id, v_system_message);

  -- Create reputation event (0 points — tracking only, no reward)
  perform public.create_reputation_event(
    v_user_id,
    'SIDE_SWITCHED',
    0,
    jsonb_build_object(
      'room_id', p_room_id,
      'previous_side', v_current_side,
      'new_side', p_new_side,
      'reason', trim(p_reason),
      'side_change_id', v_change_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'side_change_id', v_change_id,
    'previous_side', v_current_side,
    'new_side', p_new_side
  );
end;
$$;


-- === 9. 202606110002_fix_view_add_cooldown.sql ===
-- Migration: Fix discussion_messages view (add back is_moderated) + 24h cooldown

-- Migration: Fix discussion_messages view (add back is_moderated) + 24h cooldown
-- This migration is append-only. It does not modify existing data.

-- 1. Fix discussion_messages view: merge moderation join from 202606040001
--    with system message handling from 202606110001, so neither is lost.
drop view if exists public.discussion_messages;
create view public.discussion_messages
with (security_invoker = false)
as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when mf.message_id is not null then '[Message hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when mf.message_id is not null then null
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when mf.message_id is not null then 'Anonymous'
    when m.message_type = 'system' then 'System'
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when mf.message_id is not null then null
    when m.message_type = 'system' then null
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  case
    when mf.message_id is not null then true
    else false
  end as is_moderated
from public.messages m
left join public.profiles p on m.user_id = p.id
left join (
  select distinct message_id
  from public.moderation_flags
  where status = 'resolved_hidden'
) mf on m.id = mf.message_id
where exists (
  select 1 from public.rooms r
  where r.id = m.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

grant select on public.discussion_messages to anon, authenticated;

-- 2. Add 24-hour cooldown to switch_debate_side RPC
create or replace function public.switch_debate_side(
  p_room_id uuid,
  p_new_side text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_side text;
  v_change_id uuid;
  v_system_message text;
  v_message_id uuid;
  v_username text;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to switch sides.';
  end if;

  -- Get username for system message
  select p.username into v_username
  from public.profiles p
  where p.id = v_user_id;

  -- Validate reason length
  if length(trim(p_reason)) < 50 then
    raise exception 'reason_too_short' using hint = 'Reason must be at least 50 characters.';
  end if;

  -- Validate new side
  if p_new_side not in ('proposition', 'opposition') then
    raise exception 'invalid_side' using hint = 'Side must be proposition or opposition.';
  end if;

  -- Get current participation
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    raise exception 'not_participating' using hint = 'You must join the debate before switching sides.';
  end if;

  if v_current_side = p_new_side then
    raise exception 'same_side' using hint = 'You are already on this side.';
  end if;

  if v_current_side = 'neutral' then
    raise exception 'neutral_switch' using hint = 'Neutral observers cannot switch sides directly. Leave and rejoin.';
  end if;

  -- Check 24-hour cooldown against latest side change
  if exists (
    select 1
    from public.debate_side_changes dsc
    where dsc.room_id = p_room_id
      and dsc.user_id = v_user_id
      and dsc.created_at >= now() - interval '24 hours'
  ) then
    raise exception 'cooldown_active' using hint = 'You can only switch sides once every 24 hours. Please wait before changing again.';
  end if;

  -- UPSERT participant with new side
  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, p_new_side)
  on conflict (room_id, user_id)
  do update set side = p_new_side, joined_at = now();

  -- Insert immutable side change record
  insert into public.debate_side_changes (room_id, user_id, previous_side, new_side, reason)
  values (p_room_id, v_user_id, v_current_side, p_new_side, trim(p_reason))
  returning id into v_change_id;

  -- Create system message
  v_system_message :=
    coalesce(v_username, 'Someone') ||
    ' switched from ' ||
    case when v_current_side = 'proposition' then 'Support' else 'Challenge' end ||
    ' to ' ||
    case when p_new_side = 'proposition' then 'Support' else 'Challenge' end ||
    '. Reason: ' || trim(p_reason);

  perform public.post_system_message(p_room_id, v_system_message);

  -- Create reputation event (0 points — tracking only, no reward)
  perform public.create_reputation_event(
    v_user_id,
    'SIDE_SWITCHED',
    0,
    jsonb_build_object(
      'room_id', p_room_id,
      'previous_side', v_current_side,
      'new_side', p_new_side,
      'reason', trim(p_reason),
      'side_change_id', v_change_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'side_change_id', v_change_id,
    'previous_side', v_current_side,
    'new_side', p_new_side
  );
end;
$$;


-- === 10. 202606120001_create_inquiry_tables.sql ===
-- Migration: Create inquiry tables for MVP

-- Migration: Create inquiry tables for MVP
-- This migration is append-only. It does not modify existing data.

-- 1. Create inquiry_items table
create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  inquirer_side text not null default 'inquiry',
  inquiry_type text not null check (inquiry_type in (
    'clarification',
    'evidence_request',
    'assumption_check'
  )),
  content text not null check (char_length(content) >= 10 and char_length(content) <= 2000),
  target_claim_id uuid not null references public.claims(id) on delete cascade,
  status text not null default 'open' check (status in (
    'open',
    'responded',
    'satisfied',
    'unsatisfied',
    'closed'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiry_items_room on public.inquiry_items(room_id, status, created_at desc);
create index if not exists idx_inquiry_items_claim on public.inquiry_items(target_claim_id);
create index if not exists idx_inquiry_items_creator on public.inquiry_items(created_by);
create index if not exists idx_inquiry_items_creator_room on public.inquiry_items(created_by, room_id);

-- 2. Create inquiry_responses table
create table if not exists public.inquiry_responses (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 10 and char_length(content) <= 5000),
  created_at timestamptz not null default now()
);

create index if not exists idx_inquiry_responses_item on public.inquiry_responses(inquiry_item_id, created_at);
create index if not exists idx_inquiry_responses_author on public.inquiry_responses(created_by);

-- 3. RLS policies for inquiry_items
alter table public.inquiry_items enable row level security;

drop policy if exists "Inquiry visibility matches room visibility" on public.inquiry_items;
create policy "Inquiry visibility matches room visibility"
  on public.inquiry_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and (
          (r.visibility = 'public' and r.status <> 'archived')
          or r.created_by = auth.uid()
        )
    )
  );

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
        and (r.visibility = 'public' or r.created_by = auth.uid())
    )
  );

drop policy if exists "Inquiry creator can update status" on public.inquiry_items;
create policy "Inquiry creator can update status"
  on public.inquiry_items
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- 4. RLS policies for inquiry_responses
alter table public.inquiry_responses enable row level security;

drop policy if exists "Response visibility matches inquiry visibility" on public.inquiry_responses;
create policy "Response visibility matches inquiry visibility"
  on public.inquiry_responses
  for select
  to authenticated
  using (
    exists (
      select 1 from public.inquiry_items ii
      join public.rooms r on r.id = ii.room_id
      where ii.id = inquiry_item_id
        and (r.visibility = 'public' or r.created_by = auth.uid())
    )
  );

drop policy if exists "Any user can respond to inquiries" on public.inquiry_responses;
create policy "Any user can respond to inquiries"
  on public.inquiry_responses
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- 5. Create inquiry RPCs
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

create or replace function public.respond_to_inquiry(
  p_inquiry_item_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_response_id uuid;
  v_current_status text;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
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

create or replace function public.satisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Only the inquirer can mark as satisfied
  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer' using hint = 'Only the inquiry creator can mark it as satisfied.';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  update public.inquiry_items
  set status = 'satisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;

  -- Create reputation event for satisfaction (+2)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_SATISFIED',
    2,
    jsonb_build_object(
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );
end;
$$;

create or replace function public.unsatisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  update public.inquiry_items
  set status = 'unsatisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;
end;
$$;

create or replace function public.close_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  update public.inquiry_items
  set status = 'closed', updated_at = now()
  where id = p_inquiry_item_id and status not in ('closed', 'satisfied');

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry is already closed or satisfied.';
  end if;
end;
$$;

-- 6. Grant execute on RPCs
revoke all on function public.create_inquiry(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_inquiry(uuid, uuid, text, text) to authenticated;

revoke all on function public.respond_to_inquiry(uuid, text) from public, anon;
grant execute on function public.respond_to_inquiry(uuid, text) to authenticated;

revoke all on function public.satisfy_inquiry(uuid) from public, anon;
grant execute on function public.satisfy_inquiry(uuid) to authenticated;

revoke all on function public.unsatisfy_inquiry(uuid) from public, anon;
grant execute on function public.unsatisfy_inquiry(uuid) to authenticated;

revoke all on function public.close_inquiry(uuid) from public, anon;
grant execute on function public.close_inquiry(uuid) to authenticated;


-- === 11. 202606130001_add_display_name_and_preferences.sql ===
-- Sprint 3: Settings MVP.

-- Sprint 3: Settings MVP.
-- Adds display_name to profiles, creates user_preferences table for privacy toggles.

-- Add display_name to profiles
alter table public.profiles add column if not exists display_name text;

-- Create user_preferences table
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  show_reputation boolean not null default true,
  show_expertise boolean not null default true,
  show_side_switches boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on user_preferences
create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

-- Create a row on signup so preferences always exist
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_preferences on auth.users;

create trigger on_auth_user_created_preferences
after insert on auth.users
for each row
execute function public.handle_new_user_preferences();

-- Ensure preferences row exists for existing users
insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- RLS on user_preferences
alter table public.user_preferences enable row level security;

drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- RPC to read any user's preferences (security definer — used by profile page server component)
create or replace function public.get_user_preferences(p_user_id uuid)
returns table (
  show_reputation boolean,
  show_expertise boolean,
  show_side_switches boolean
)
language sql
stable
security definer
as $$
  select up.show_reputation, up.show_expertise, up.show_side_switches
  from public.user_preferences up
  where up.user_id = p_user_id;
$$;

-- RPC to get a user's own moderation flags (for safety/report history page)
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
as $$
  select mf.id, mf.reason, mf.status, mf.created_at, mf.resolved_at
  from public.moderation_flags mf
  where mf.reporter_id = auth.uid()
  order by mf.created_at desc;
$$;

comment on table public.user_preferences is
  'User privacy and preference settings. One row per user, created on signup.';


-- === 12. 202606170001_create_homepage_rpcs.sql ===
-- Homepage RPCs for guest and logged-in experiences

-- Homepage RPCs for guest and logged-in experiences
-- All use security definer to bypass RLS for aggregate reads

-- ============================================================
-- 1. Guest: Platform-wide understanding metrics
-- ============================================================
create or replace function public.get_homepage_metrics()
returns json
language sql
security definer
stable
as $$
select json_build_object(
  'open_inquiries', (select count(*) from inquiry_items where status not in ('satisfied', 'closed')),
  'claims_with_evidence', (select count(distinct claim_id) from claim_evidence),
  'debates_both_sides', (
    select count(*) from debates d
    where exists (select 1 from debate_participants dp where dp.room_id = d.id and dp.side = 'proposition')
    and exists (select 1 from debate_participants dp where dp.room_id = d.id and dp.side = 'opposition')
  ),
  'satisfied_today', (
    select count(*) from inquiry_items
    where status = 'satisfied' and updated_at >= current_date
  )
);
$$;

-- ============================================================
-- 2. Guest: Featured inquiries for spotlight
-- ============================================================
create or replace function public.get_featured_inquiries(p_limit int default 3)
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'id', ii.id,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'status', ii.status,
    'target_claim_content', (
      select content from claims c where c.id = ii.target_claim_id
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'created_at', ii.created_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.status in ('open', 'responded')
  order by ii.updated_at desc
  limit p_limit
);
$$;

-- ============================================================
-- 3. Logged-in: My open (unresolved) inquiries
-- ============================================================
create or replace function public.get_my_open_inquiries()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'id', ii.id,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'status', ii.status,
    'target_claim_content', (
      select content from claims c where c.id = ii.target_claim_id
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'created_at', ii.created_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.created_by = auth.uid()
    and ii.status not in ('satisfied', 'closed')
  order by ii.updated_at desc
);
$$;

-- ============================================================
-- 4. Logged-in: My inquiries with pending responses
-- ============================================================
create or replace function public.get_my_inquiry_responses()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'inquiry_id', ii.id,
    'inquiry_content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'latest_response_content', (
      select content from inquiry_responses ir
      where ir.inquiry_item_id = ii.id
      order by ir.created_at desc
      limit 1
    ),
    'latest_response_username', (
      select p.username from inquiry_responses ir
      join profiles p on p.id = ir.created_by
      where ir.inquiry_item_id = ii.id
      order by ir.created_at desc
      limit 1
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'updated_at', ii.updated_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.created_by = auth.uid()
    and ii.status = 'responded'
  order by ii.updated_at desc
);
$$;

-- ============================================================
-- 5. Logged-in: My debates needing attention
-- ============================================================
create or replace function public.get_my_debates_attention()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'room_id', d.id,
    'title', d.title,
    'slug', d.slug,
    'proposition_title', d.proposition_title,
    'opposition_title', d.opposition_title,
    'status', d.status,
    'my_side', dp.side,
    'my_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id and c.created_by = auth.uid() and c.is_retracted = false
    ),
    'opposing_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id
        and c.created_by != auth.uid()
        and c.debate_side != dp.side
        and c.is_retracted = false
    ),
    'last_activity_at', d.last_activity_at
  )
  from discussion_debates d
  join debate_participants dp on dp.room_id = d.id and dp.user_id = auth.uid()
  where d.status = 'active'
    and dp.side in ('proposition', 'opposition')
  order by d.last_activity_at desc nulls last
);
$$;

-- ============================================================
-- 6. Logged-in: New evidence on topics I've participated in
-- ============================================================
create or replace function public.get_my_topic_evidence(p_days int default 7)
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'topic_id', t.id,
    'topic_name', t.name,
    'evidence_count', count(distinct e.id),
    'rooms', (
      select json_agg(json_build_object(
        'room_id', r2.id,
        'room_title', r2.title,
        'room_slug', r2.slug
      ))
      from (
        select distinct r3.id, r3.title, r3.slug
        from evidence e2
        join rooms r3 on r3.id = e2.room_id
        where e2.created_at >= current_date - p_days
          and e2.is_retracted = false
          and r3.topic_id = t.id
          and r3.id not in (
            select room_id from debate_participants where user_id = auth.uid()
            union
            select distinct room_id from messages where user_id = auth.uid()
          )
      ) r2
    )
  )
  from topics t
  where exists (
    select 1 from rooms r
    where r.topic_id = t.id
      and (
        r.id in (select room_id from debate_participants where user_id = auth.uid())
        or r.id in (select distinct room_id from messages where user_id = auth.uid())
      )
  )
  and exists (
    select 1 from evidence e
    join rooms r on r.id = e.room_id
    where r.topic_id = t.id
      and e.created_at >= current_date - p_days
      and e.is_retracted = false
  )
  group by t.id, t.name
);
$$;

-- ============================================================
-- 7. Logged-in: Understanding evolved (consensus shifts + linked evidence)
-- ============================================================
create or replace function public.get_my_understanding_evolved()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'claim_id', c.id,
    'claim_content', c.content,
    'room_id', c.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'my_vote', cv.vote_type,
    'agree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
    ),
    'disagree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
    ),
    'consensus_ratio', (
      case
        when (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
        ) + (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
        ) > 0
        then round(
          (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
          /
          nullif(
            (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
            + (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'),
            0
          )
          * 100
        )
        else null
      end
    ),
    'evidence_count', (
      select count(*) from claim_evidence ce
      join evidence e on e.id = ce.evidence_id
      where ce.claim_id = c.id and e.is_retracted = false
    ),
    'latest_evidence', (
      select content from evidence e
      join claim_evidence ce on ce.evidence_id = e.id
      where ce.claim_id = c.id and e.is_retracted = false
      order by e.created_at desc
      limit 1
    )
  )
  from claims c
  join rooms r on r.id = c.room_id
  join claim_votes cv on cv.claim_id = c.id and cv.user_id = auth.uid()
  where c.is_retracted = false
  order by c.updated_at desc
  limit 10
);
$$;

-- Grant execute to authenticated (and anon for guest-facing RPCs)
grant execute on function public.get_homepage_metrics to anon, authenticated;
grant execute on function public.get_featured_inquiries to anon, authenticated;
grant execute on function public.get_my_open_inquiries to authenticated;
grant execute on function public.get_my_inquiry_responses to authenticated;
grant execute on function public.get_my_debates_attention to authenticated;
grant execute on function public.get_my_topic_evidence to authenticated;
grant execute on function public.get_my_understanding_evolved to authenticated;
