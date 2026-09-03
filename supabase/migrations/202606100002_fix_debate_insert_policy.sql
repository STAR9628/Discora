-- Migration: Add missing INSERT policy for debates table
--
-- Root cause: create_debate_room RPC (SECURITY INVOKER) inserts into
-- public.debates, but the table only had SELECT and UPDATE policies.
-- The anon_key call path succeeds at function execution but fails at
-- the INSERT into debates due to RLS violation.
--
-- Fix: Add INSERT policy matching the pattern already used by
-- public.discussions (see 202606030003_create_discussions.sql:279-290).
--
-- Verified: GRANT EXECUTE on create_debate_room is NOT needed;
-- the function is already executable with anon key. Only the
-- underlying table INSERT policy was missing.

drop policy if exists "Authenticated users can create debates" on public.debates;

create policy "Authenticated users can create debates"
  on public.debates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = debates.id
        and rooms.created_by = auth.uid()
    )
  );
