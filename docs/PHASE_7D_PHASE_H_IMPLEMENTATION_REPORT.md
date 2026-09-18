# Phase 7D — Phase H Implementation Report (Targeted Inquiries as Conversation Citizens)

**Date:** 2026-09-12
**Agent:** OpenCode (implementation, narrow MUST-DO scope only)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs (§12) → Implementation → UX.
**Scope:** H-01…H-05 only. No migrations, no schema/RLS changes, no Phase O deletions, no beta polish. Questions vs Inquiries split preserved throughout.

---

## 1. Executive summary

Targeted Inquiries are now chronological conversation citizens in both rooms, mirroring the proven Phase G node architecture: compact amber inquiry bubbles with type + status, `Targeted inquiry for "Claim…"` relationship lines, expandable responses, and author satisfaction — all reusing the existing lifecycle (no new backend semantics). The in-conversation Inquiry entry now opens the claim-targeted dialog instead of losing context, and sources link back to citing evidence. Full create→respond→satisfy cycle verified live with zero errors.

## 2. MCPs verified

Sequential Thinking, Playwright, GitHub Official, Context7, Fetch — all WORKING at session start.

## 3. MCPs actually used

Sequential Thinking (H design lock); Playwright MCP (dialog open/fill/submit, node render/jump/respond/satisfy cycle, lens spot-checks, overflow/console checks); GitHub (remote HEAD/history verification). Context7/Fetch verified available but unnecessary — reported, not pretended.

## 4. Files changed (7; everything else inherited)

- NEW `src/features/inquiries/components/inquiry-conversation-node.tsx` — H-01/H-04 node (badge, taxonomy, status, relation line, expandable responses via existing list/form, satisfaction bar, Details, Report).
- `src/features/discussions/utils/build-conversation-feed.ts` — inquiry kind in the chronological merge (default-empty, stable ordering).
- `discussion-contributions-section.tsx` / `debate-room.tsx` — H-01 fetch/render, H-02 dialog entry, H-03 jump reuse.
- `debates/components/inquiry-create-dialog.tsx` — H-02 terminology fix ("Ask a Question"/"Question" → "Targeted Inquiry"/"Inquiry"; behavior identical).
- `room-sources-tab.tsx` + discussions sources page — H-05 `evidenceLensBasePath` reverse links (capped, cheap).

## 5. Inquiry conversation-node implementation (H-01)

`useInquiries(roomId)` feeds both rooms; nodes interleave by `createdAt` among threads. Distinct amber treatment with explicit INQUIRY badge + type + status — never confusable with room Questions. No Reply affordance (responses are the reply mechanism — no faked second architecture); no reactions (not a reaction target per model); no votes/scores.

## 6. Claim → Inquiry fix (H-02)

Both rooms' in-conversation Inquiry buttons now open the targeted create dialog with the claim preselected (fallback to questions lens only when the claim object is unavailable). Dialog copy corrected to the locked vocabulary.

## 7. Inquiry → Claim navigation (H-03)

Relation button scrolls + ring-highlights the claim's conversation position, falling back to `claims?highlight=` off-page (debate uses section switch). Verified live: ring landed on the correct CLAIM bubble.

## 8. Response/satisfaction flows (H-04)

Existing `InquiryResponseList/Form` (expandable, 10–5000 rules) and `InquirySatisfactionBar` (author-only satisfy/unsatisfy/close) composed into the node unchanged. Verified live: Open → response posted → Responded → Mark Satisfied → SATISFIED, zero errors. No new states, no vocabulary change.

## 9. Optional Sources work (H-05)

Implemented (genuinely cheap): per-source "Cited by" evidence deep-links (`evidence?highlight=`, capped at 2 + count) via new optional `evidenceLensBasePath`, wired in both rooms. No schema change, no source intelligence.

## 10. Questions vs Inquiry separation

Untouched and re-verified: room Questions lens/composer intact, no merged labels, no fourth composer mode, amber family shared but badges/wording distinct.

## 11. Responsive QA

8-target script post-change: 0 overflow, 0 console errors, 0 5xx. MCP authenticated cycle: dialog, node render, jump, respond, satisfy at 1440; mobile 375 inquiry state clean. Screenshots: `docs/screenshots_phase_h/` (node, dialog, claim presence, mobile) + `docs/phase_h_qa_results.json`.

## 12. Accessibility observations

Native controls, dialog focus/Escape preserved from the existing pattern, touch-reachable actions, expand/collapse keyboard-operable buttons, existing aria labeling reused. No traps introduced.

## 13. tsc/lint/build

`npx tsc --noEmit`: PASS (0). `npm run lint`: 0 errors (18 pre-existing warnings). `npm run build`: PASS (all routes).

## 14. Tests

No repo unit-test framework for components (standing convention — none introduced). New executable coverage: `scripts/phase7d-phase-h-qa.mjs` (node render, dialog open, claim presence, mobile overflow, error budgets; all green).

## 15. Epistemic sweep

Fresh grep over new/changed code: zero vote/score/truth/reputation/credibility/consensus/winner language (one doc comment stating no-votes). Inquiry lifecycle adds no scoring/ranking/authority; satisfaction stays author-gated as approved.

## 16. Database/RLS safety

No migrations created/applied; no schema/RLS changes; existing RPCs/services/views reused verbatim. No RLS weakening.

## 17. Production safety

Deliberate QA writes: 1 inquiry + 1 response (member identity, QA-labeled content), left in honest terminal SATISFIED state with visible status — disclosed residue, matching prior sessions' disclosed-cleanup practice (retracted arguments were fully invisible; a satisfied inquiry remains visible by approved design). No other rows touched (counts stable); no seeds, no deletions, no fixtures.

## 18. Remaining gaps

Reply-anchor fallback to top-level post when a claim's origin message is outside the loaded window (documented Phase G precedent, acceptable). Paginated-window interleaving as designed. `DiscussionEvidence` legacy vote fields still present-but-unused (Phase O).

## 19. Deferred work

Phase O deletions; beta track (About, badges, offline, seed, reset); delete RPCs/UI; SoU maturity (OPEN); full grant audit; sidebar redesign; AI features (none approved).

## 20. Screenshots/artifacts

`docs/screenshots_phase_h/` (4 shots), refreshed `docs/screenshots_phase_f/` set, `docs/phase_h_qa_results.json`.

## 21. Final verdict

### PASS

WhatsApp test: a focused question about a specific Claim now reads as a natural chat contribution that plainly examines that Claim. All MUST-DO items implemented and tested as far as the environment safely permits.
