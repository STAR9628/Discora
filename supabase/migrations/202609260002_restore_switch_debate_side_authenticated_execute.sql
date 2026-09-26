-- Migration: Restore authenticated/service_role EXECUTE on switch_debate_side
--
-- ROOT CAUSE:
--   Migration 202609240001_privilege_cleanup_post_beta_apply.sql revoked
--   EXECUTE ON FUNCTION public.switch_debate_side(uuid, text, text)
--   FROM public, anon. Its own header comment states the function "should only
--   be executable by authenticated + service_role", but the migration never
--   issued the compensating GRANT. Because REVOKE FROM PUBLIC strips every
--   non-owner role, authenticated users lost all access and the Debate
--   side-switch flow returns 403/permission denied for legitimate users.
--
-- SCOPE (deliberately narrow):
--   - Grants EXECUTE on the single exact function signature below.
--   - Does NOT grant PUBLIC or anon.
--   - Does NOT alter the function body, owner, SECURITY DEFINER mode,
--     search_path, RLS policies, cooldown, arbiter, or reputation behavior.
--   - The function authorizes internally on auth.uid(): participant-only,
--     side whitelist, same-side/neutral rules, 24h cooldown, and all writes
--     are scoped to the caller's own user id. EXECUTE therefore only lets a
--     legitimate user REACH the existing protected checks; it grants no data
--     access by itself.
--
-- PRODUCTION: review dry-run before applying. DO NOT apply blindly.

grant execute on function public.switch_debate_side(uuid, text, text)
  to authenticated, service_role;
