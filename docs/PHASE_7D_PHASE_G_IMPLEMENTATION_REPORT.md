# Phase 7D — Phase G Implementation Report (Evidence + Arguments as Conversation Citizens)

**Date:** 2026-09-12
**Agent:** OpenCode (implementation, narrow MUST-DO scope only)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs (UX §9/§10) → Implementation → UX.
**Scope:** G-01…G-07 only. No migrations, no production schema changes, no Phase O deletions, no beta polish. Phase G UI beyond scope was not built.

---

## 1. MCPs verified

Sequential Thinking, Playwright, GitHub Official, Context7, Fetch — all WORKING at session start.

## 2. MCPs actually used

Sequential Thinking (feed-merge + fix-shape design lock); Playwright MCP (all interaction QA: evidence nodes, +Argument dialog, create→node→jump→retract cycle, lens spot-checks, overflow/console/network); GitHub (remote HEAD/history verification). Context7/Fetch verified available but not materially needed — reported, not pretended.

## 3. Files changed (13; all else in the tree is inherited work)

- NEW `src/features/discussions/components/structured-contribution-node.tsx` — G-01/G-02 chat-bubble node (evidence|argument variants, spec §9.2/§10.4 relationship wording, source links, reply/react/More, claim jump, author retract affordance).
- NEW `src/features/discussions/components/create-argument-dialog.tsx` — G-03 claim-contextual creation (Supporting/Challenging, 50–5000 validation mirroring the DB CHECK, anonymous toggle, focus trap, Escape).
- NEW `src/features/discussions/utils/build-conversation-feed.ts` — thread-preserving chronological interleave + claim-label truncation.
- `services/discussion-service.ts` — `DbDiscussionArgumentRow` + mapper + `getRoomArguments()` (view read; retracted/deleted excluded). No schema change.
- `hooks/use-discussions.ts` — `useRoomArguments`, `useCreateArgument`, `useRetractArgument`, `useRetractRoomEvidence`.
- `message-reactions.tsx` — `targetType` widened to evidence|argument (DB already supported all four).
- `comment-item.tsx` / `claim-in-conversation.tsx` — `onCreateArgument` threading; +Argument opens the dialog instead of dead-end navigation (fallback preserved).
- `discussion-contributions-section.tsx` / `debate-room.tsx` — feed merge, node wiring (reactions, anchored replies, report, retract, jump), both dialogs.
- `claims-lens-section.tsx` / `debate-claims-lens-section.tsx` — G-05: argument counts now from the arguments table (previously mislabeled claim-relation counts).
- `understanding-utils.ts` — G-06 misleading "approved stance division" comment removed (behavior untouched).

## 4. Evidence implementation (G-01)

Room evidence renders chronologically among threads (4 nodes live in the QA room), each showing author/timestamp, neutral EVIDENCE badge, linkified content, clickable source link, and `Evidence for / Evidence challenging / Context for "Claim…"` jump button. Reply anchors to the claim's origin message when loaded (else top-level post); React via existing aggregates; More offers Report (existing dialog) and author-only Retract with confirm. No voting, no truth colors, no full-width cards.

## 5. Argument implementation (G-02)

Same node pattern with `Argument supporting / Argument challenging` wording (spec §10.4 verbatim, never confused with stance votes). No Report affordance (no flaggable column exists — documented, not worked around). No voting/scoring/reputation/credibility anywhere.

## 6. Creation flow (G-03)

+Argument on any in-conversation claim opens the dialog (claim context shown); stance radio, 50-min counter, anonymous toggle, validated submit → `create_argument` RPC → cache invalidation → success toast → node appears chronologically. Verified end-to-end live, then retracted (1 invisible retracted row remains; documented residue).

## 7. Claim-card changes (G-05)

Lens cards now show real Arguments·N counts; evidence counts unchanged. Compact descriptive pills only — no bars, no colors-as-truth.

## 8. Origin/deep-link behavior (G-04)

Node → claim: smooth scroll + ring highlight on the claim's conversation position, falling back to `claims?highlight=` when off-page. Claim → evidence: existing `evidence?claim=` links preserved. Existing `?highlight`/`?question` compat untouched.

## 9. Responsive QA

Existing 8-target script post-change: 0 overflow, 0 console errors, 0 5xx (member session). MCP interaction QA (authenticated): evidence nodes (4), dialog open/fill/validate/submit, argument node render + jump + retract, claim presence count, mobile 375 (no overflow, composer clear). Screenshots: `docs/screenshots_phase_g/` (desktop, argument, claim presence, mobile) + refreshed `docs/screenshots_phase_f/` set.

## 10. Accessibility observations

Native buttons, dialog `role`/`aria-modal`/labelledby, focus trap + autofocus + Escape (mirrors ReportDialog), touch-reachable actions (`opacity-100` on touch), aria-labeled coverage meter pre-existing. No keyboard traps introduced; hover-reveal pairs with focus-within reveal.

## 11. tsc/lint/build

`npx tsc --noEmit`: PASS (0). `npm run lint`: 0 errors (18 pre-existing warnings). `npm run build`: PASS (all routes).

## 12. Tests

No repo unit-test framework for components (only onboarding spec + ad-hoc Playwright scripts, per standing convention — none introduced). New executable coverage: `scripts/phase7d-phase-g-qa.mjs` (evidence count, argument create→node→claim-count→retract→gone, mobile overflow, error budgets; all green).

## 13. Epistemic safety sweep

Fresh grep: zero hits for winner/loser/credibility/victory/popularity/leaderboard/scorecard/resolve/DEBATE_WON/evidence-vote/credibility-computation terms; new code adds no vote/score/truth/reputation language (only substring noise). Stance stays descriptive; reactions stay lightweight; SoU untouched.

## 14. Production safety confirmation

No migrations created/applied; no schema changes; no RLS changes; no seed/cleanup of QA data. Deliberate writes during QA: 2 arguments created + retracted by the test identity (1 via UI, 1 via RPC; both retracted, invisible in every surface). No other production rows touched (verified counts stable).

## 15. Remaining issues

- Reply-to-node anchoring falls back to top-level post when the claim's origin message is outside the loaded window (documented; acceptable).
- Paginated windows interleave nodes per loaded page (documented; correct at any scale).
- `DiscussionEvidence` type still carries legacy vote fields (`agreeCount` etc.) — unused by any UI; Phase O cleanup candidate.
- `ExtractClaimModal` legacy path still exists alongside in-place conversion (pre-existing; untouched).

## 16. Deferred issues

Phase O deletions (dead intel/map/graph/health/reputation views, stale copy); beta polish (About, badges, offline, sounds); seed data; QA reset; delete RPCs/UI; SoU maturity (OPEN); full grant audit.

## 17. Final verdict

### PASS

WhatsApp test: evidence and arguments now read as ordinary chat contributions with a quiet understanding layer — people talking, plus examination. All MUST-DO items implemented and verified; scope held.
