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
