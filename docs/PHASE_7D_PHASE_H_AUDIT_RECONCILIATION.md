# Phase 7D — Phase H Audit & Reconciliation (Next Understanding / Interaction Layer)

**Date:** 2026-09-12
**Agent:** OpenCode (senior product-architecture auditor; AUDIT ONLY)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → Implementation → UX → Assumptions.
**Scope:** audit → reconcile → define Phase H. Phase H NOT implemented. No src/migration/production/config changes. The only repo change is this report.

---

## 1. Executive verdict

**PASS WITH GAPS — Phase H is defined and unblocked: targeted inquiries as conversation citizens.**

Phase G closed the evidence/argument conversation gap. The audit finds the room model, epistemic guardrails, debate parity, and responsive behavior all intact, with exactly one coherent theme remaining: **Targeted Inquiries are the last understanding-layer object without chronological conversation presence.** Questions (room-level) are complete; the inquiry backend (create/respond/satisfy/close RPCs, RLS, counts) is complete; but inquiries render only in claim lists, the debate inquiries tab, and standalone pages — never as conversation nodes — and the in-conversation Inquiry button drops claim context by navigating to the plain questions lens. Everything else candidate-scoped (sources polish, SoU seam, discovery, profile, saved, sidebar) is either complete, correctly secondary, or explicitly deferred beta work.

## 2. MCP verification

Sequential Thinking, Playwright, GitHub Official, Context7, Fetch — all five WORKING (probed at session start).

## 3. MCPs actually used

Sequential Thinking (reconciliation/scope reasoning); Playwright MCP (all browser inspection: conversation, 5 lens loads, inquiry tab, claim Inquiry-button flow, overflow/console/network checks); GitHub (remote HEAD `0223c70` verified equal to local HEAD; recent history reviewed). Context7/Fetch verified available but unnecessary (no framework or external-doc questions arose) — reported, not pretended.

## 4. Authority documents inspected

Governance; UX spec (§§0–3, 9–13, 15, 19–20, 23); 7C reconciliation; 7D plan (§30: original Phase H = "questions/inquiries: split terminology, composer mode + claim actions"); pre-implementation gate; Phase A/B/C/D-correction/D-polish/E/F/post-apply-30-check/gap-closure/remediation/G-audit/G-implementation reports; 00/01/02 excerpts via the 6E spec record; 23 knowledge-model conflict record (copy+link stays superseded by in-place — not resurrected). No Phase G docs exist beyond the two reports. Original MDs untouched. No new product conflicts found (no `MAJOR PRODUCT/MD CONCERN`).

## 5. Original Phase H intent

Plan §30 + Phase C deferral list agree: **questions/inquiries terminology split, composer mode, and claim actions**. Reconciliation: terminology split COMPLETE (no merged labels anywhere; distinct tables/RPCs/routes/copy), composer mode COMPLETE (Question is a first-class mode), claim actions PARTIAL (claim-list/debate flows use the targeted create-dialog; in-conversation Inquiry drops context — §12). What was never in the original intent but is now the actual gap: **inquiry chronological conversation presence** (the Phase G pattern was never applied to inquiries).

## 6. Current implementation map

Conversation (threads + evidence/argument nodes post-G), 3-mode composer, claims (in-place, stance-descriptive, presence counts), requests (aggregated, Accept/Skip/Decline), evidence lens + nodes, arguments (entity + nodes + creation dialog), room questions + ask/retract/report flows, dual inquiry stacks unified (debates hooks re-export the inquiries feature; one backend), sources bibliography, SoU (evidence-led, OPEN seam), room shell + room-local nav + private aliases, debate motion/sides with side-grouped claims, profile contribution history, saved page. Backend: 16/16 migrations applied (13 Phase 7D + 3 remediation); no evidence/argument voting anywhere.

## 7. Conversation audit — PASS

Chat geometry, speaker sides, threading, lightweight reactions, linkification without `dangerouslySetInnerHTML`, subtle actions, fixed minimal-idle composer, Phase G nodes integrated without dashboard leakage (verified visually + 8/8 no-overflow).

## 8. Claim audit — PASS

Creation, in-place conversion, types, blue highlight, descriptive stance, Evidence/Arguments presence counts (arguments now from the arguments table), origin navigation, requests, no deletion UI (dormant by design). No change needed for H.

## 9. Evidence audit — PASS

Chronological nodes with approved `↳` wording, claim linkage both directions, direction filters in lens, source links, reply/react/report/retract, no voting. No change needed for H.

## 10. Argument audit — PASS

Creation dialog (stance + 50–5000 rules + author ownership), chronological nodes, retract flow, no voting/scoring/reputation. No change needed for H.

## 11. Questions audit — PASS

First-class composer mode, room-level lens with ask/retract/report, amber treatment, no inquiry confusion. No change needed for H.

## 12. Targeted Inquiry audit — GAP (Phase H core)

Exists and works: create/respond/satisfy/unsatisfy/close RPCs, claim-scoped lists with counts, debate inquiries tab with type taxonomy, standalone detail pages. Missing: (a) **no chronological conversation presence** — inquiries never appear as chat citizens; (b) **in-conversation Inquiry button loses claim context** (`discussion-contributions-section.tsx:319` navigates to the plain questions lens instead of the targeted dialog); (c) no inquiry→conversation origin jump (no `inquiry-<id>` anchors or equivalent); (d) response/satisfaction flows live only in lens/detail surfaces. Terminology is consistent everywhere (no merges found).

## 13. Sources audit — COMPLETE with micro-polish

Derived bibliography with dedup, citation counts, external links, retracted state — all present. Missing only the reverse direction (Source → citing Evidence/Claim navigation). Micro-scope; include in H if cheap, else defer.

## 14. SoU audit — PASS (OPEN preserved)

Evidence-direction-only classification; zero-evidence claims unresolved regardless of votes; trivial any-content empty gate (no maturity algorithm); agreement fields computed but not rendered as truth; live lens free of winner/proven/settled/confidence/truth-score/credibility language. The misleading stance-division comment was already removed in Phase G.

## 15. Discovery/search audit — PASS

No trending/hot/popularity ordering in search UI; homepage ordering neutral (recency, with the vote-derived formula explicitly removed in code comments). Discovery copy is attention-descriptive, never truth-implying.

## 16. Profile audit — PASS (no H work)

Live profile = contribution history only; no credibility/trust/score/rank/badges in code or on the page. Dead reputation-display components exist but are unmounted (Phase O).

## 17. Saved-room audit — PASS (no H work)

Saved page, current-room-only collapsible sidebar subsection, per-user private aliases via approved RPCs, canonical titles unmutated. Verified in code; no gaps found.

## 18. Debate parity audit — PASS

Shared conversation/composer/claims/evidence/arguments/questions/sources/SoU/reactions/requests; motion + proposition/opposition structure with side-grouped claims; inquiries tab functional; zero competitive terms in code or live DOM (page-text scan clean).

## 19. AI-role audit — NOTHING TO AUDIT

Zero AI integration code in `src` (no summarization, classification, or surfacing features exist). No AI functionality is approved for Phase H. Nothing proposed, nothing invented.

## 20. Epistemic sweep — PASS (live) with classified residuals

Zero hits for winner/loser/credibility/victory/popularity/leaderboard/scorecard/resolve/DEBATE_WON/evidence-vote/credibility-computation terms. `computeReputation` is contribution-only. `consensusRatio` survives solely as a descriptive data field. Residuals, all verified unreachable (zero route importers): `MapTab`/`GraphView`/`DiscussionIntelligence`/`DiscussionHealth`/`DiscussionSummary` cluster (consensus levels, "Most Influential", argument map) and `ReputationBreakdown`/`ReputationGrowthCard`/`AuthorTrustSignal`/`TrustBadgeView` (stale "consensus bonus"/"voting activity" copy). Classification: dead code + stale copy (items 2–3), never live contamination. No deletions performed (Phase O).

## 21. Secondary intelligence audit — DORMANT, CORRECTLY SECONDARY

All intel/health/graph/map/summary surfaces resolve to the dead cluster above; nothing mounted in any live route; nothing competes with Conversation. Disposition: leave dormant; Phase O removal already scoped. Do not revive or redesign.

## 22. Database/RLS audit (read-only) — PASS

All inquiry/evidence/argument/source/relation/reaction/request objects reachable with correct RLS posture; no voting-coupling paths; private isolation intact (counts verified); no migration needed for the foreseen H scope (reads use existing views/RPCs).

## 23. Browser/Playwright results — PASS

8-target script post-Phase-G code: member session, 0 overflow, 0 console errors, 0 5xx, 0 winner/loser, composer + request actions live. MCP lens checks: evidence (4 cards, filters, claim links, source links), sources, questions (no merged label), SoU (3 columns, no forbidden terms), debate claims (prop/opp, no competitive terms), debate inquiries tab (types render) — all zero-error, zero-overflow. Interaction gap noted: claim Inquiry entry in conversation loses context (§12b).

## 24. Git/worktree status

Local HEAD `0223c70` == remote `main` HEAD (verified via GitHub MCP; recent history reviewed, no suspicious commits). Worktree carries the inherited uncommitted Phase A–G changeset plus session reports; my session added only this file (to be verified post-write). No commit/push/reset performed.

## 25. Original Phase H reconciliation table

| Original Phase H intent | Current state | Still needed? | Correct phase | Reason |
|---|---|---|---|---|
| Questions/inquiries terminology split | Complete, verified everywhere | No | — | Done |
| Question composer mode | Complete | No | — | Done |
| Claim inquiry actions | Partial (lens/debate dialog yes; conversation loses context) | Yes, small | **H** | §12b |
| Inquiry deep refinement (implied) | Not started: no conversation presence, no origin jumps | Yes | **H** | Core H scope |
| Sources expansion (old plan item) | Bibliography complete; only reverse nav missing | Micro | **H if cheap** | §13 |

## 26. P0/P1/P2/P3 issues

No P0. P1: (H-01) inquiry conversation nodes absent; (H-02) in-conversation Inquiry loses claim context; (H-03) inquiry→conversation origin jump absent. P2: (H-04) response/satisfaction confined to lens/detail; (H-05) source→evidence reverse nav. P3: dead-code removals (Phase O); beta polish (separate track).

## 27. Approved vs technical vs open vs genuinely-new decisions

Already approved: inquiry split/terminology, claim-scoped examination, response/satisfaction/close lifecycle, conversation-first presentation (by analogy with evidence/arguments). Technical: node component shape reusing Phase G primitives, anchor/jump mechanics, query-key conventions. Open: SoU maturity (untouched). Genuinely new: NONE identified — Phase H mirrors the approved Phase G pattern onto inquiries.

## 28. Conflicts requiring escalation

NONE. No `MAJOR PRODUCT/MD CONCERN`.

## 29. Recommended Phase H scope (smallest correct)

**MUST DO:** (1) targeted-inquiry chronological nodes in conversation (claim-attached, subtle, approved wording distinct from questions); (2) in-conversation Inquiry entry opens the claim-targeted dialog (fix §12b); (3) inquiry→claim origin jump with highlight; (4) response/satisfaction reachable from the node where the existing RPCs permit without new semantics. **SHOULD DO:** source→citing-evidence reverse links if cheap. **DEFER:** everything in §30. **OPEN:** nothing new (SoU maturity stays OPEN).

## 30. Explicitly deferred work

Phase O deletions; About; founding-member badges; offline/404; sounds/motion; seed/curation data; QA reset; delete RPCs/UI; full grant audit; sidebar redesign (deferred concerns noted: Settings placement, search collapse — unrelated to H); AI features (none approved).

## 31. Risks

Inquiry/question confusion (mitigate: distinct badge + wording + keep separate entry points); conversation clutter (one compact node pattern, reuse Phase G geometry); anon-identity leaks (preserve redaction CASEs); RLS weakening temptation (never); scope creep into lens redesigns (lenses PASS — touch only for node surfacing); reply-anchor semantics for nodes without message-backed targets (anchor to claim origin or top-level, documented Phase G precedent).

## 32. Validation plan

tsc/lint/build green; Playwright interaction specs (create inquiry → node appears chronologically → jump works → respond/satisfy flows) at 375/390/834/1440; RLS negative tests; epistemic re-sweep; SoU snapshot unchanged; 0 errors/5xx/overflow; production data untouched (seeded-room or retracted-cleanup testing with disclosure).

## 33. Final readiness verdict

### PASS WITH GAPS

Phase H implementation may proceed on the §29 MUST-DO scope: the pattern to mirror is proven in production (Phase G nodes), the backend is applied and exercised, terminology and backend are settled, and no product decision blocks design. Gaps carried (staging-gated UI proofs, Phase O, beta track) do not gate Phase H.
