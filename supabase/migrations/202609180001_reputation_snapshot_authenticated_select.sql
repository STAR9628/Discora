-- Migration: Reputation Snapshot Authenticated SELECT (P2 follow-up to F-03 class)
--
-- The browser client reads public.user_reputation_snapshots directly
-- (getLatestReputationSnapshots, getReputationHistory) but the authenticated
-- role holds no SELECT grant, so every read fails closed (42501) while the
-- row policy already scopes rows correctly.
--
-- Established visibility contract (NOT invented here):
--   - 202606090002_create_user_reputation_snapshots.sql: SELECT policy
--     "Users can view their own reputation snapshots" USING (user_id = auth.uid())
--     with comment "Only the user can see their own reputation history".
--   - 202606190001_security_hardening_p0_p1.sql (P0-4): snapshots are
--     database-authoritative (written by recalculate_user_reputation, self/admin
--     only); legacy client INSERT policy dropped and INSERT revoked. The SELECT
--     policy was deliberately preserved.
--   - DEPLOYMENT_READINESS matrix: user_reputation_snapshots = "Self-only".
--
-- This migration restores ONLY the missing least-privilege grant. No RLS change
-- (self-only policy already correct), no anon access, no INSERT/UPDATE/DELETE,
-- no new policy, no new API. Forward-only. Production untouched (local apply).
--
-- Data classification of exposed columns under the self-only scope:
--   id/user_id/created_at (identifiers), score (derived numeric),
--   expertise (derived topic breakdown). No moderation flags, no trust
--   internals, no audit metadata exist on this table.

begin;

grant select on public.user_reputation_snapshots to authenticated;

commit;
