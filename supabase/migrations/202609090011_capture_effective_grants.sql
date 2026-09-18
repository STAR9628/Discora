-- Phase 7D: Capture effective production grants missing from repo history.
--
-- FINDING: live REST probes prove the production database grants direct table
-- access that no repository migration grants (verified: member SELECT 200 on
-- claim_requests/arguments/reactions/messages; message UPDATE reaching the
-- edit-window trigger; claim_votes INSERT+DELETE via the working vote toggle;
-- claims DELETE reaching RLS-deny instead of 42501). Fresh environments built
-- from repo migrations alone would deny these paths (e.g. getMyClaimRequests
-- would silently empty; message edits would 42501). RLS policies themselves
-- are correct and Narrowing in all probed paths — only the GRANT layer drifts.
-- See docs/PHASE_7D_PHASE_F_LIFECYCLE_GAP_CLOSURE_REPORT.md (G1-G3 reframed).
--
-- SCOPE (minimal, evidence-bounded): ONLY grants with direct live evidence
-- above (member posting proves messages INSERT; edit-window trigger hit proves
-- messages UPDATE; PATCH-on-missing-row 200s prove claims/arguments/evidence
-- UPDATE; working vote toggle proves claim_votes INSERT/DELETE; RLS-deny
-- instead of 42501 proves claims DELETE). Anything unobserved (direct INSERT
-- paths on claims/evidence/arguments/questions, debates/rooms/topics/profiles
-- grants, user_saves paths) is deliberately EXCLUDED — a full
-- effective-grant audit remains follow-up work.
-- Additive only: GRANTs cannot revoke anything; RLS policies are untouched,
-- so no access widens beyond what production already enforces today.
--
-- ROLLBACK: REVOKE the six statements below (documented; RLS stays intact).
--
-- REQUIRES OWNER APPROVAL before any production push (standard gate).
-- Do NOT apply without the standard backup + approval + post-apply matrix.

-- Each statement below has direct live evidence (member REST probes:
-- SELECT 200s; UPDATE reaching row triggers; working vote toggle; RLS-deny
-- instead of 42501 on DELETE). RLS policies (unchanged here) still narrow and
-- deny; these GRANTs only restore the privilege layer production already has.
grant select on public.claim_requests to authenticated;
grant select on public.arguments to authenticated;
grant select on public.reactions to authenticated;
grant insert, update on public.messages to authenticated;
grant update on public.claims to authenticated;      -- retract path (.update is_retracted)
grant update on public.arguments to authenticated;  -- reaches immutability trigger
grant update on public.evidence to authenticated;   -- retract path (.update is_retracted)
grant insert, delete on public.claim_votes to authenticated;
grant delete on public.claims to authenticated;     -- RLS-deny (no DELETE policy), trigger stays dormant
