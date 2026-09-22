-- Migration: Post-Beta Apply Privilege Cleanup
--
-- Removes excessive pre-existing grants to anon/PUBLIC on tables and functions
-- that were not fully cleaned up by earlier GRANT-only migrations.
-- Also fixes the debate_participants DELETE policy roles from {public} to {authenticated}.
--
-- Forward-only, least-privilege remediation. No data mutation.
-- Safe for production apply; rollback documented below.

begin;

-- ============================================================================
-- 1. user_preferences - Revoke anon/PUBLIC excess grants
-- Migration 202609200001 granted SELECT/INSERT/UPDATE to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, insert, references, select, trigger, truncate, update
on public.user_preferences from anon, public;

-- ============================================================================
-- 2. user_reputation_snapshots - Revoke anon/PUBLIC excess grants
-- Migration 202609180001 granted SELECT to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, references, select, trigger, truncate, update
on public.user_reputation_snapshots from anon, public;

-- ============================================================================
-- 3. debate_participants - Revoke anon/PUBLIC excess grants
-- Migrations 202609230002/0003 granted INSERT/DELETE to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, insert, references, select, trigger, truncate, update
on public.debate_participants from anon, public;

-- ============================================================================
-- 4. inquiry_items - Revoke anon/PUBLIC excess grants
-- Migration 202609170001 (P1-01) granted SELECT to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, insert, references, select, trigger, truncate, update
on public.inquiry_items from anon, public;

-- ============================================================================
-- 5. inquiry_responses - Revoke anon/PUBLIC excess grants
-- Migration 202609170001 (P1-01) granted SELECT to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, insert, references, select, trigger, truncate, update
on public.inquiry_responses from anon, public;

-- ============================================================================
-- 6. debate_side_changes - Revoke anon/PUBLIC excess grants
-- Migration 202609170001 (P1-01) granted SELECT to authenticated only.
-- Pre-existing full CRUD grants to anon remain; remove them.
-- ============================================================================
revoke delete, insert, references, select, trigger, truncate, update
on public.debate_side_changes from anon, public;

-- ============================================================================
-- 7. switch_debate_side function - Revoke PUBLIC/anon EXECUTE
-- Migration 202609230004 recreated the function with CREATE OR REPLACE,
-- which preserved pre-existing PUBLIC/anon EXECUTE grants.
-- Function should only be executable by authenticated + service_role.
-- ============================================================================
revoke execute on function public.switch_debate_side(uuid, text, text) from public, anon;

-- ============================================================================
-- 7b. debate_participants DELETE policy - Fix roles from {public} to {authenticated}
-- Migration 202609230003 granted DELETE to authenticated but did not create
-- the policy; pre-existing policy with roles {public} survived.
-- Replace with correct authenticated-only policy.
-- ============================================================================
drop policy if exists "Users can leave debates" on public.debate_participants;

create policy "Users can leave debates"
on public.debate_participants
for delete
to authenticated
using (auth.uid() = user_id);

commit;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for documentation only; not executed)
-- ============================================================================
-- To rollback this migration:
--
-- 1. Re-grant anon/PUBLIC on tables (restores pre-migration state):
--    grant delete, insert, references, select, trigger, truncate, update
--    on public.user_preferences to anon, public;
--    grant delete, references, select, trigger, truncate, update
--    on public.user_reputation_snapshots to anon, public;
--    grant delete, insert, references, select, trigger, truncate, update
--    on public.debate_participants to anon, public;
--    grant delete, insert, references, select, trigger, truncate, update
--    on public.inquiry_items to anon, public;
--    grant delete, insert, references, select, trigger, truncate, update
--    on public.inquiry_responses to anon, public;
--    grant delete, insert, references, select, trigger, truncate, update
--    on public.debate_side_changes to anon, public;
--
-- 2. Re-grant function EXECUTE:
--    grant execute on function public.switch_debate_side(uuid, text, text) to public, anon;
--
-- 3. Restore old DELETE policy:
--    drop policy if exists "Users can leave debates" on public.debate_participants;
--    create policy "Users can leave debates"
--    on public.debate_participants
--    for delete
--    to public
--    using (auth.uid() = user_id);
--
-- Note: This rollback restores the excessive privilege state that this migration fixes.
-- It is provided for completeness; forward-only is preferred.