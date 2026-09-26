-- Migration (RESTORED): 20260925174642_legacy_user_preferences_self_only
--
-- PROVENANCE: recovered byte-for-byte from production supabase_migrations.schema_migrations
-- statements (read-only inspection). These 9 migrations were applied to production
-- out-of-band on 2026-09-25 and never committed. Restored here verbatim so the
-- local migration chain matches legitimate production history.
-- DO NOT EDIT: any change would fork local history from production reality.
-- Production already has these applied; they are no-ops on push.

CREATE OR REPLACE FUNCTION public.get_user_preferences(p_user_id uuid) RETURNS TABLE (show_reputation boolean, show_expertise boolean, show_side_switches boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT up.show_reputation, up.show_expertise, up.show_side_switches FROM public.user_preferences up WHERE up.user_id = p_user_id AND p_user_id = auth.uid(); $$;
