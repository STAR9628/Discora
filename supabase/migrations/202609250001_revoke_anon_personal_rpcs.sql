-- Migration: Phase 2D production security remediation.
--
-- Removes anonymous EXECUTE from exactly 10 personal/helper RPCs audited in
-- Phase 2B/2C. Authenticated EXECUTE is preserved on all ten. No function
-- bodies, grants to other roles, RLS policies, views, triggers, or
-- search_path settings are modified by this migration.
--
-- Deliberately EXCLUDED (require product decisions, see Phase 2C):
--   public.get_user_preferences(uuid)      (guest profile rendering needs it)
--   public.get_private_room_gate(text)     (invite-flow existence decision)
--   public.search_content(...)             (intentional guest search)
--   public.submit_user_feedback(...)       (intentional guest feedback)
--   all trigger-only SECURITY DEFINER helpers and all SECURITY DEFINER views.

revoke execute on function public.get_my_open_inquiries() from anon;

revoke execute on function public.get_my_inquiry_responses() from anon;

revoke execute on function public.get_my_debates_attention() from anon;

revoke execute on function public.get_my_topic_evidence(integer) from anon;

revoke execute on function public.get_my_understanding_evolved() from anon;

revoke execute on function public.get_my_moderation_flags() from anon;

revoke execute on function public.get_or_create_source(uuid, text, text) from anon;

revoke execute on function public.has_room_write_access(uuid) from anon;

revoke execute on function public.is_active_user() from anon;

revoke execute on function public.has_room_access(uuid) from anon;
