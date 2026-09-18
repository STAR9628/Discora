-- Migration: Pre-Beta UI Batch 1 — user_preferences browser-client grants (UI-P1)
--
-- The settings Privacy panel reads/writes public.user_preferences directly via
-- the browser client (getUserPreferences / upsertUserPreferences), but the
-- authenticated role holds no SELECT/INSERT/UPDATE grant, so every load fails
-- closed (403) and saves surface "You do not have permission".
--
-- Established ownership contract (NOT invented here):
--   - RLS policies "Users can insert/view/update their own preferences" scope
--     every command to user_id = auth.uid() (plus is_active_user() guards).
-- This migration restores ONLY the missing least-privilege grants. No RLS
-- change, no new policy, no anon access, no DELETE (no delete path exists in
-- the app; terminal rows are never removed). Forward-only. Local-only
-- application; production untouched.

begin;

grant select on public.user_preferences to authenticated;
grant insert on public.user_preferences to authenticated;
grant update on public.user_preferences to authenticated;

commit;
