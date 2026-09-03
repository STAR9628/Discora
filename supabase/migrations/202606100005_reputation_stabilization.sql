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
