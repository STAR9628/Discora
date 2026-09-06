-- Migration: Drop obsolete 5-argument submit_moderation_flag overload
-- Forward-only Phase 5B remediation.
-- The 6-argument overload remains unchanged.

drop function if exists public.submit_moderation_flag(
  uuid,
  uuid,
  uuid,
  uuid,
  text
);
