-- Migration: Pre-Beta Security/Integrity Remediation (P1-01, P2-01, P2-02, P3-01, P3-02)
--
-- Forward-only remediation for the Comprehensive Pre-Beta Audit findings.
-- No history edits. No RLS weakening. Least privilege throughout.
-- Local-only application; production untouched.
--
-- P1-01: restore least-privilege SELECT on inquiry_items / inquiry_responses /
--   debate_side_changes to authenticated (RLS row policies already scope rows;
--   the app reads these tables directly via the browser client).
-- P2-01: narrow claim_relations INSERT so an active user may create a relation
--   only with legitimate write access to the relation's room, with both
--   referenced claims verified in that same room (SoU pollution closure).
-- P2-02: fix debates UPDATE policy tautology (r.id = r.id -> r.id = debates.id).
--   Inert: no UPDATE grant exists for authenticated and none is added.
-- P3-01: enable RLS on claim_deletion_config (deny-by-default; no client DML
--   grants exist; SECURITY DEFINER triggers owned by postgres bypass RLS, so
--   the deletion-lock reads keep working; no app direct reads exist).
-- P3-02: pin search_path on 4 SECURITY DEFINER functions (behavior unchanged).

begin;

-- ============================================================================
-- P1-01: authenticated SELECT for browser read paths (RLS unchanged)
-- ============================================================================
grant select on public.inquiry_items to authenticated;
grant select on public.inquiry_responses to authenticated;
grant select on public.debate_side_changes to authenticated;

-- ============================================================================
-- P2-01: claim_relations INSERT requires room write access + same-room endpoints
-- Authoritative room is NEW.room_id; both claims must live in that room.
-- has_room_write_access() already enforces is_active_user(), non-archived,
-- and public/owner/active-participant membership.
-- ============================================================================
-- NOTE (same-day pre-verification correction, local-only, never pushed):
-- unqualified NEW-column references inside the EXISTS subqueries resolved to
-- the inner claims aliases (sc.room_id = sc.room_id tautology). NEW columns
-- are therefore qualified as claim_relations.<col> throughout.
drop policy if exists "Authenticated users can create claim relations" on public.claim_relations;
create policy "Authenticated users can create claim relations"
  on public.claim_relations
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and claim_relations.room_id is not null
    and public.has_room_write_access(claim_relations.room_id)
    and claim_relations.source_claim_id is distinct from claim_relations.target_claim_id
    and exists (
      select 1 from public.claims sc
      where sc.id = claim_relations.source_claim_id and sc.room_id = claim_relations.room_id
    )
    and exists (
      select 1 from public.claims tc
      where tc.id = claim_relations.target_claim_id and tc.room_id = claim_relations.room_id
    )
  );

-- ============================================================================
-- P2-02: debates UPDATE predicate drift fix (no grant change; stays inert)
-- ============================================================================
drop policy if exists "Debate creators can update debates" on public.debates;
create policy "Debate creators can update debates"
  on public.debates
  for update
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = debates.id and r.created_by = auth.uid()
    )
  );

-- ============================================================================
-- P3-01: claim_deletion_config RLS hardening (deny-by-default)
-- No permissive policies: no client role holds DML grants, no app direct
-- reads exist (consumed only by SECURITY DEFINER triggers owned by postgres,
-- which bypass RLS). Revokes below are explicit defense-in-depth.
-- ============================================================================
alter table public.claim_deletion_config enable row level security;
revoke all on public.claim_deletion_config from public, anon, authenticated;

-- ============================================================================
-- P3-02: pin search_path on unpinned SECURITY DEFINER functions
-- All four are zero-argument; ownership and grants unchanged.
-- ============================================================================
alter function public.get_homepage_metrics() set search_path = public, pg_temp;
alter function public.get_my_inquiry_responses() set search_path = public, pg_temp;
alter function public.get_my_open_inquiries() set search_path = public, pg_temp;
alter function public.handle_new_user_preferences() set search_path = public, pg_temp;

commit;
