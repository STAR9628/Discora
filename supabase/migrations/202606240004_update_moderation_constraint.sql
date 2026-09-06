-- Migration: Update moderation_flags exactly-one-entity constraint to include inquiry_id
-- This is a forward-only append migration.

-- ============================================================================
-- Drop old constraint and create updated one including inquiry_id
-- ============================================================================

alter table public.moderation_flags
  drop constraint if exists exactly_one_entity;

alter table public.moderation_flags
  add constraint exactly_one_entity check (
    (case when message_id is not null then 1 else 0 end +
     case when question_id is not null then 1 else 0 end +
     case when claim_id is not null then 1 else 0 end +
     case when evidence_id is not null then 1 else 0 end +
     case when inquiry_id is not null then 1 else 0 end) = 1
  );
