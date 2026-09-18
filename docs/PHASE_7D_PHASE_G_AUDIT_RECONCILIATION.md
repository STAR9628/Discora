# Phase 7D — Phase G Audit & Reconciliation (Understanding Layer / Room Experience)

**Date:** 2026-09-12
**Agent:** OpenCode (senior product-architecture auditor; AUDIT ONLY)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → Implementation → UX → Assumptions.
**Scope:** audit + reconciliation + Phase G plan. Phase G NOT implemented. No src/migration/production changes. The only repo change is this report.

---

## 1. Executive verdict

**PASS WITH GAPS — Phase G may proceed on a narrow evidence+argument experience scope.**

Conversation-first architecture is live and verified end-to-end (both rooms, 4 viewports, 0 errors). Epistemic guardrails hold in all LIVE code paths; the only vote/credibility/consensus surfaces left are unreachable dead code or stale copy inside it. The entire Phase G gap reduces to one coherent theme: **Evidence and Arguments exist as database objects and lens destinations, but not as chronological conversation citizens** — no inline `↳ Evidence for…` / `↳ Argument supporting…` nodes, no argument creation UI, no conversation↔lens origin jump for evidence. Everything Phase G needs (tables, RPCs, views, RLS, services, lens routes, design language) already exists; Phase G is UI composition over proven backend, not new architecture.

## 2. MCP verification + actual MCP usage

| MCP | Gate probe | Used in audit |
|---|---|---|
| Sequential Thinking | WORKING | Reconciliation reasoning (gap clustering, scope derivation) |
| GitHub Official | WORKING (`STAR9628`, repo located, commits read) | Remote HEAD/history verification (§18) |
| Playwright | WORKING (tabs + navigate/snapshot/evaluate/console/network) | All browser QA (§19): 6 lens loads, overflow/console/network checks |
| Context7 | WORKING (resolve probe) | Verified available; not materially needed (no framework-behavior question arose) |
| Fetch | WORKING (example.com probe) | Verified available; not materially needed (no external docs needed) |

No outage claimed; unused MCPs reported as such.

## 3. Authority documents inspected

Governance, UX spec (§§0–3, 9–13, 15, 19–20, 23 read), 00 (cited via 6E), 01/02 (spot-checked), 7C reconciliation, 7D plan + pre-implementation gate, Phase A reconciliation, Phase B + C + D-correction + D-polish + E + F + F-gate + F-revision + verification + backup + disposition + apply + 30-check + gap-closure + remediation reports (all read in this or immediately prior sessions). No Phase G documents exist. Original MDs were not modified. One stale-comment flag is recorded in §13 (comment hygiene, not a conflict).

## 4. Current implementation map

Conversation (`comment-item`, `claim-in-conversation`, `message-reactions`, `claim-request-banner`, `discussion-contributions-section`, `debate-room`), composer (`unified-composer`: message/claim/question), claims lens (`claim-lens-card`, `claims-lens-section`, `debate-claims-lens-section`), requests (service + hooks + banner + RPCs, post-remediation applied), evidence lens (`room-evidence-section/tab`, `evidence-section`), sources (`RoomSourcesTab` + routes), questions (`question-list`) + inquiries (button/dialog/list/RPCs), SoU (`state-of-understanding`, `understanding-utils`), room shell (`room-section-shell`, room-local sidebar), debate parity (motion/sides, side-grouped claims). Backend: 13/13 Phase 7D migrations applied; `arguments`/`reactions`/`claim_requests` tables + views + RPCs live.

## 5. Conversation audit — PASS

Default entry, left/right speaker alignment, compact bubbles, normal messages carry no epistemic weight, threading capped with guide lines, lightweight reactions, safe linkification (no `dangerouslySetInnerHTML`), subtle action bar, fixed composer. No dashboard leakage observed in live conversation.

## 6. Composer audit — PASS

Exactly three modes, message default, minimal idle, content + claim-type-only for claims, content-only for questions (per code + prior draft-preservation verification), in-place creation path via conversion RPC. No extra modes.

## 7. Claim audit — PASS

Whole-bubble subtle highlight, compact (not full-width), contextual +Evidence/+Argument/Inquiry actions, descriptive stance text only, no consensus bar, no green/red (blue/amber active only, verified visually). Stance touches nothing else (code + live vote-toggle proof from prior validation).

## 8. Request-as-Claim audit — PASS WITH NOTED LIVE DEFECT HISTORY

Action exists, single aggregated state, requester counts, Accept/Skip/Decline + subtle follow-ups, in-place conversion, identity privacy (author-only details), exact:false invalidation on both cache shapes. Note: the shipped `decide()` status-mapping defect (F1) is already remediated by applied `202609090009`; positive UI lifecycle still awaits seeded staging per prior reports (unchanged).

## 9. Evidence audit — PASS (lens) / GAP (conversation)

Lens: Evidence Bank with support/contradict/context filters, per-card Claim-origin link button, clickable source URLs, no voting — matches spec §9.5. **Gap:** evidence does not render as chronological conversation nodes; no `↳ Evidence for…` pattern exists anywhere in src; reply/react-to-evidence inside conversation untestable (no nodes). → Core Phase G work.

## 10. Argument audit — GAP (expected, this IS Phase G)

`arguments` table + `create/retract_argument` RPCs + service functions exist and are proven in isolation, but **zero UI creation path and zero conversation rendering** (`createArgument` has no callers; `+ Argument` navigates to the claims lens; debate "arguments" are side-grouped claims by approved design). No voting/scoring/reputation anywhere near arguments. → Core Phase G work.

## 11. Questions / Targeted Inquiry audit — PASS

Room-level Questions lens + composer mode present with no merged "Questions & Inquiries" labeling; claim-scoped inquiry entry (button/dialog/list/counts) intact; debate questions route serves the inquiry interface per approved design. Terminology split holds.

## 12. Sources audit — PASS (exists) / POLISH (Phase G-adjacent)

Sources lens route + `RoomSourcesTab` bibliography exist; evidence cards link sources externally. Verify-during-G: dedup quality, citation counts, deep-link-back-to-claim behavior. No source intelligence to be invented.

## 13. SoU audit — PASS (with one comment-hygiene flag)

State derivation uses evidence direction counts only; zero-evidence claims stay unresolved regardless of votes; `hasSufficientData` is a trivial any-content empty-state gate (OPEN maturity preserved); agreement percentages are computed but not rendered as truth; live lens shows Supported/Contested/Unresolved with zero forbidden terms (winner/loser/proven/settled/confidence/truth-score/credibility all absent). Flag (P3): `understanding-utils.ts` comment references an "approved stance division (>=5 votes, 35%-65%)" rule that is NOT implemented in the branch condition and has no approval record — misleading comment, behavior is correct.

## 14. Room IA/navigation audit — PASS

One room page, Conversation default, six route-backed lenses over shared data, origin links (claims↔conversation, evidence→claim), desktop hover-reveal + mobile lens switcher observed, room-local current-room-only collapsible sidebar, Saved separate, private alias plumbing present. Deep-link compat (`?highlight`, `?question`) preserved per Phase B.

## 15. Discussion/Debate parity audit — PASS

Shared conversation/composer/claims/evidence/questions/sources/SoU/reactions/requests components; debate-only motion + proposition/opposition structure with side-grouped claims lens; zero winner/loser/draw/score/scorecard/authority terms in code or live DOM (verified by grep + in-page text scan).

## 16. Epistemic contamination sweep — PASS (live) with dead-code residuals

Zero hits in `src` for: winner, loser, credibility, victory, popularity, leaderboard, scorecard, resolve_debate, DEBATE_WON, EvidenceVoting, castEvidenceVote, computeCredibility, supportRatio, consensusRatio, consensus, reputation (as mechanism), trust/authority signals, score/rank/draw. `computeReputation` is contribution-only (no vote/penalty terms). Mount audit: `ProfileReputationSection` (live, contribution history only); `ReputationBreakdown`/`ReputationGrowthCard`/`AuthorTrustSignal`/`TrustBadgeView`/`MapTab`/`GraphView`/`DiscussionIntelligence`/`DiscussionHealth`/`DiscussionSummary`/`use-batch-reputation` have **zero importers** — dead, containing stale copy (e.g. "consensus bonus", "voting activity") that is unreachable. `consensusRatio` survives only as a descriptive data field. No live UI or algorithmic contamination found. DB triggers verified removed via applied history + live vote-toggle proof (prior session).

## 17. Secondary intelligence surfaces audit — DEMOTED, VERIFIED DORMANT

All intel/health/graph/map/summary surfaces resolve to the dead `MapTab` cluster or are otherwise unimported. Nothing competes with Conversation in any live route. Disposition: leave dormant; Phase O removal (already scoped), not Phase G.

## 18. Database/RLS audit (read-only) — PASS

All 7D objects live (`claim_requests`, `arguments`, `reactions`, aggregated views, `user_saves.alias`); winner/loser infra absent (`resolution` 42703, `resolve_debate` PGRST202); no evidence/argument voting paths; RLS boundaries re-verified via counts (anon 9/7/0-private, member 11/9); F1/F2/grant remediations applied per history. Predicates re-verified unchanged since apply.

## 19. Browser/Playwright results — PASS

Existing 8-target QA re-run: member session, 0 overflow, 0 console errors (missing-backend 404s gone post-apply), 0 5xx, 0 winner/loser, composer + request actions render. Lens spot-checks (MCP): evidence (4 cards, filters, claim links, source links), sources, questions (no merged label), SoU (3 columns, no forbidden terms), debate claims (prop/opp grouping, no competitive terms) — all load with zero console errors and zero overflow.

## 20. P0/P1/P2/P3 issue table

| ID | Severity | Issue | Status |
|---|---|---|---|
| G-01 | P1 | Evidence has no chronological conversation nodes (`↳ Evidence for…` absent) | MUST DO (Phase G core) |
| G-02 | P1 | Arguments have no creation UI and no conversation rendering | MUST DO (Phase G core) |
| G-03 | P1 | Positive request/convert UI lifecycle unverified live (seeded staging needed) | Pre-existing gap, staging-track (not Phase G build) |
| G-04 | P2 | Dead intel/reputation/credibility components with stale copy (`MapTab` cluster, breakdown/growth/trust views) | DEFER to Phase O (verified unreachable) |
| G-05 | P3 | Misleading "approved stance division" comment in `understanding-utils.ts` | Fix inside Phase G (comment-only) |
| G-06 | P3 | Sources lens polish unverified (dedup, citation counts, claim deep-links) | SHOULD DO (verify, small) |
| G-07 | P3 | `formatCommunityStance`/`agreementPercentage` dead-but-present vote-display helpers | DEFER to Phase O |

No P0 (no live philosophy violation found).

## 21. Already-approved vs open vs technical decisions

Already approved: in-place conversion; descriptive stance; no evidence/argument voting; no winner/loser; SoU evidence-led with OPEN maturity; requests aggregated + non-punitive; arguments claim-attached, not a lens/composer mode; six lenses; room-local nav. Open: SoU maturity algorithm; staging-gated UI proofs. Technical (Phase G discretion): node component decomposition, inline vs lens detail patterns, linkifier reuse, query-key shapes following existing conventions.

## 22. Conflicts requiring escalation — NONE

No genuine product/MD conflict discovered. The historical copy+link vs in-place conflict stays resolved (in-place). No `MAJOR PRODUCT/MD CONCERN` raised.

## 23. Recommended Phase G scope

**MUST DO:** (1) chronological evidence nodes in conversation (`↳ Evidence for/challenging/context for "Claim…"`, subtle, reply/react/More preserved, claim link intact); (2) chronological argument nodes with supporting/challenging language (never confused with stance votes); (3) `+ Argument` creation flow from claim (supporting/challenging + content, 50–5000 rules, author ownership) wired to `create_argument`; (4) claim↔evidence↔argument origin jump-back (deep links both directions); (5) evidence/argument presence inside claims-lens cards (counts exist — surface them).
**SHOULD DO:** sources polish verification (G-06); stance-division comment cleanup (G-05); responsive/a11y pass at 4 viewports; Playwright interaction specs for the new nodes.
**DEFER:** Phase O removals (G-04, G-07); beta polish items (About, badges, offline, sounds) per standing scope.
**OPEN:** SoU maturity (untouched); any new entity naming collisions (verify against `debate_side` claims first).

## 24. Explicitly deferred work

Phase O legacy deletion; beta-shipping polish (About Discora, founding-member badges, offline/network pages, sounds/motion); seed/curation data; QA-data reset; future delete-RPC/UI (triggers dormant by design); full grant audit beyond the evidence-bounded set.

## 25. Risks

Regression of conversation-first feel (oversized cards — mitigate with strict bubble-geometry review + screenshots); vote/stance confusion in argument language (use spec §10.4 wording verbatim); anon-identity leaks via new joins (preserve redaction CASEs); RLS weakening temptation (never weaken to make UI work — pre-checks are UI-only); scope creep into lenses redesign (lenses already PASS — touch only to surface new nodes).

## 26. Validation plan

tsc/lint/build green; new Playwright interaction specs (create evidence/argument → appears chronologically → lens reflects → jump-back works) at 375/390/834/1440; RLS negative tests (non-author, cross-room, anon); epistemic re-sweep (no new vote/credibility/score terms); SoU snapshot unchanged (no vote text); zero console errors/5xx/overflow; production data untouched (feature-flag or seeded-room testing, never mutate QA rooms).

## 27. Final readiness verdict

### PASS WITH GAPS

Phase G can proceed on the MUST-DO scope because: the approved model is fully specified, the backend it needs is applied and proven, the UI gaps are precisely bounded, and no product conflict blocks design. Gaps carried forward: seeded-staging UI proofs (G-03), Phase O cleanup, beta polish — none of which gate Phase G design/implementation.
