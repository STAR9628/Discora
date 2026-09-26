-- Migration (RESTORED): 20260925170626_public_display_flags
--
-- PROVENANCE: recovered byte-for-byte from production supabase_migrations.schema_migrations
-- statements (read-only inspection). These 9 migrations were applied to production
-- out-of-band on 2026-09-25 and never committed. Restored here verbatim so the
-- local migration chain matches legitimate production history.
-- DO NOT EDIT: any change would fork local history from production reality.
-- Production already has these applied; they are no-ops on push.

CREATE OR REPLACE FUNCTION public.get_public_display_flags(p_user_id uuid)
RETURNS TABLE (
  show_expertise boolean,
  show_side_switches boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.show_expertise,
    up.show_side_switches
  FROM public.user_preferences up
  WHERE up.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_display_flags(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_display_flags(uuid) TO anon, authenticated;
