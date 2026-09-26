-- Migration (RESTORED): 20260925174657_legacy_user_preferences_grants
--
-- PROVENANCE: recovered byte-for-byte from production supabase_migrations.schema_migrations
-- statements (read-only inspection). These 9 migrations were applied to production
-- out-of-band on 2026-09-25 and never committed. Restored here verbatim so the
-- local migration chain matches legitimate production history.
-- DO NOT EDIT: any change would fork local history from production reality.
-- Production already has these applied; they are no-ops on push.

REVOKE ALL ON FUNCTION public.get_user_preferences(uuid) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.get_user_preferences(uuid) TO authenticated;
