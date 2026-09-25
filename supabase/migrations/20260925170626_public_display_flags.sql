-- Public profile privacy projection for guest/public profile rendering.
-- This migration matches the production-applied migration version.

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
