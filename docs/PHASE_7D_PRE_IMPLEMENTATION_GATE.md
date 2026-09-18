# Phase 7D Pre-Implementation Gate

**Date:** 2026-09-09
**Gate role:** Validate whether `docs/PHASE_7D_IMPLEMENTATION_PLAN.md` is safe to begin implementing, against the current repository.
**Authority order applied:** Philosophy → Original MDs → Approved decisions → `DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` → `PHASE_7C_AUDIT_RECONCILIATION.md` → `PHASE_7D_IMPLEMENTATION_PLAN.md` → Implementation → UX → Assumptions.
**Status:** GATE ONLY — no source, migration, config, test, or product-doc changes.

## 1. Gate Verdict

**READY WITH CONDITIONS**

Phase 7D may begin at Phase A (verification + design + migration planning) under the conditions in §22–§24. UI implementation must not start before the Phase A/DB conditions are met. No blocker requires new product invention; SoU maturity stays OPEN by design.

## 2. Executive Summary

The Phase 7D plan was independently re-verified against the current repository (docs, migrations, routes, components, services, hooks, RLS-relevant objects) and against a **live dev-server browser inspection** (Playwright, guest session). The plan is substantially **accurate**; three of its own uncertainty markers were resolved during this gate (positively for `get_or_create_source`; negatively for the assumed `notifications` table; and a correction to the Phase 7C audit's `debate_arguments` inference — debate "arguments" are side-tagged claims, and no arguments entity exists anywhere).

Key verified facts:
- **Vote contamination is real and fully traceable**: claim/evidence votes → reputation triggers (`CLAIM_AGREED +2`, `CLAIM_DISAGREED −1`, `EVIDENCE_APPROVED/DISPUTED`), consensus bonus inside `recalculate_user_reputation`, vote-derived `ClaimCredibilityBadge`, and a vote-derived homepage ordering (`logged-in-homepage.tsx` sorts by `|consensusRatio − 50|`). SoU *state* remains vote-free; only its explanatory text leaks stance.
- **Deletion-lock prerequisite**: `prevent_claim_deletion` + `enforce_claim_immutability` block all deletion; **all claim-relationship FKs are ON DELETE CASCADE** (`claim_evidence`, `claim_relations`, `inquiry_items.target_claim_id`, `claim_votes`), so a hard DELETE would silently destroy relationships. A soft-delete/tombstone or FK re-engineering decision is required in Phase A.
- **In-place conversion**: impossible without a migration (cross-table move + `claims_content_length_check` 25–500 vs messages 1–2000 + required `claim_type`); a promotion-RPC strategy is viable and preserves replies/authorship when `created_at` is copied explicitly.
- **Browser verification performed**: conversation-first is absent live (`Overview / Claims / Evidence…` nav on room entry), `/discussions/[slug]/sources` returns **404**, no horizontal overflow at 375/390/834/1440 on the checked room page, `/saved` auth-gates to Login.
- **Validation**: `tsc` fails with 1 **pre-existing** error (`showReputation`, `src/app/u/[username]/page.tsx:52` — part of the user's uncommitted working tree); `npm run build` fails on the same error; `lint` 0 errors / 9 pre-existing warnings.
- **Production migration state: NOT VERIFIED** (no DB access; `202606190001` and `202606270001` exist in-repo only).

## 3. Plan Accuracy Check

| Plan claim | Gate result |
|---|---|
| §2 Routes/shell/nav/data-layer description | VERIFIED (routes, `RoomSectionShell`, flat `sidebar.tsx`, per-lens paginated hooks, empty claim maps in contributions lens) |
| §5 Vote→reputation/consensus-bonus/credibility drift | VERIFIED (see §14 for full path list) |
| §5 Retraction penalties −20/−15 | VERIFIED — `CLAIM_RETRACTED −20` (202606100004:187-188), `EVIDENCE_RETRACTED −15` (202606100004:280-281); client contribution weights `reputation-utils.ts:5-11` |
| §5 Winner/Loser removed in tree, migration present, prod unverified | VERIFIED (`debate-resolution.tsx`/`debate-scorecard.tsx` deleted in working tree; `202606270001` drops resolution/trigger/RPC/events) |
| §6 Deep links (`?highlight`, `?addEvidence`, `?question`) | VERIFIED in code and live (routes return 200) |
| §10 Conversion blockers (immutability trigger, 25–500 check, `prevent_claim_deletion`) | VERIFIED (202606030004:55, 94–145) |
| §11 `claim_request` absent | VERIFIED (repo-wide search: 0 hits) |
| §11 "reuse `notifications` table if suitable (INFERENCE)" | **RESOLVED NEGATIVE** — no `notifications` table exists in any migration (04_DATABASE_DESIGN/08_ROADMAP list it as MVP scope; never implemented). Request flow must use in-room state only |
| §12 "verify `get_or_create_source` before use" | **RESOLVED POSITIVE** — RPC exists (`202606030008:7-88`, SECURITY DEFINER, room-scoped, authenticated-only) and is called (`discussion-service.ts:915`) |
| §13 Arguments entity MISSING; don't generalize debate infra | VERIFIED — plus **correction to Phase 7C**: there is no `debate_arguments` table anywhere; debate "Arguments" are side-tagged claims (`claims.debate_side` + `getClaimsBySide`, `debate-service.ts:222`). The 7C report's `debate_arguments` reference was an inference error |
| §14 Questions/Inquiries split | VERIFIED (`questions` + lens; `inquiry_items`/`inquiry_responses` + RPCs; "Questions & Inquiries" merged label confirmed live) |
| §15 Sources: component exists, no route, clickable URLs | VERIFIED live (`/sources` → 404; `RoomSourcesTab` debate-only) |
| §16 SoU evidence-led; vote text in `statusReason`; trivial `hasSufficientData` | VERIFIED (7C, unchanged) |
| §17 homepage `use-homepage.ts:145` votes "verification required" | VERIFIED BENIGN — counts the user's own votes as an onboarding first-time gate, not a quality/ranking signal. A **different** homepage path IS contamination: `logged-in-homepage.tsx:765-766, 780-781` sorts claims by `\|consensusRatio − 50\|` (vote-derived ordering) |
| §18 cleanup list (triggers, bonus, credibility badge) | VERIFIED complete; plus `UserCredibilityCard` ("Credibility"/reputation-score card) still exists in tree as **dead code** (no importers) |
| §25 DB keep/require lists | VERIFIED consistent with migrations (`claim_votes`/`evidence_votes` unique constraints 202606030006:160,171; retracted-vote blocks 202606030009; `origin_message_id` SET NULL 202606030004:48) |
| §28 file map | VERIFIED (all named files exist; none fabricated) |
| §29–§33 migration order/phases/dependencies/risks | VERIFIED internally consistent with repository state |
| 23_KNOWLEDGE_MODEL conflict (copy+link, evidence voting) | VERIFIED — 23 is `Status: Proposed`, recommends "Claim Extraction (Promotion)" copy+link and votes on Claims+Evidence; superseded by the locked decisions. Record only; do not edit the MD |

**Plan accuracy verdict: HIGH.** No fabricated tables/RPCs/routes/components found. Open items match reality.

## 4. Production Migration Verification

| Item | Repository state | Production state |
|---|---|---|
| `202606190001_security_hardening_p0_p1.sql` | Present; revokes direct `post_system_message`/`reputation_events` INSERT/`create_reputation_event`/snapshot INSERT; restricts `recalculate_user_reputation` to self/admin; blocks inquiries in archived rooms; pins `search_path` | **PRODUCTION STATE — NOT VERIFIED** |
| `202606270001_remove_winner_loser_system.sql` | Present (untracked); drops resolution column, resolve RPC, DEBATE_WON/LOST events, recreates `discussion_debates` | **PRODUCTION STATE — NOT VERIFIED** |
| Private-debate hardening chain (202606200001–202606240005) | Present | **PRODUCTION STATE — NOT VERIFIED** |
| `user_saves` (202606260001) + save RPCs | Present | **PRODUCTION STATE — NOT VERIFIED** |
| Sprint-6/7 base objects (claims, votes, evidence, questions, inquiries, views) | Present | **PRODUCTION STATE — NOT VERIFIED** |

No tool in this environment can query the production database and no deploy record exists in-repo. Per anti-fabrication rules, production must NOT be assumed to match the repository. Phase A must obtain a production schema verification (Supabase dashboard export or `pg_tables`/`pg_proc` diff) before trigger/RPC-touching migrations are designed in detail. The plan already sequences this first — correct.

## 5. Open Item Triage

The seven Phase 7D open items (plan §37), classified per gate rules. Nothing here reopens a locked decision.

| # | Item | Class | Current evidence | Recommendation | Risk | Proceed without resolving? |
|---|---|---|---|---|---|---|
| 1 | SoU maturity algorithm | **D — Genuine product decision (stays OPEN by approved direction)** | `hasSufficientData = any claim OR evidence OR question` (`understanding-utils.ts:225-226`); spec §29.1 forbids inventing thresholds | Implement **seam only**: neutral empty-state below an explicitly OPEN maturity gate; type-level extension point; build no formula | Inventing a threshold = spec violation (anti-pattern #21) | Yes — seam-only work is approved; the algorithm itself must never be built without PO approval |
| 2 | Claim minimal fields | **B — Engineering** (sub-item **E**: any constraint change) | `claims.claim_type` NOT NULL + CHECK (202606030004:56); content 25–500 (:55) | Keep DB constraints in V1; server-default `claim_type='opinion'`, `context_type='supporting_idea'` on the lightweight path; UI exposes content only; do NOT relax 25–500 this phase | Constraint relaxation widens migration risk | Yes — with server-side defaults and no constraint change |
| 3 | Requester-list shape | **B — Engineering** + **C — UX within spec** | Spec §6.3 requires aggregated count + one state per message; notification infra verified missing | One row per requester + per-message aggregation; count visible to room, requester list visible to message author only | Over-exposing requester names could deter requests | Yes |
| 4 | Evidence-vote row disposition | **E — Migration/data-safety (non-destructive default resolvable)** | `evidence_votes` + `EvidenceVoting` UI + `castEvidenceVote` (`discussion-service.ts:1105`) + `EVIDENCE_APPROVED/DISPUTED` triggers live | **Preserve rows read-only; remove UI/service/trigger consumers.** No purge without explicit PO approval | Purge destroys user data irrecoverably | Yes — with preserve-rows default |
| 5 | Reputation snapshot/backfill | **E — Migration/data-safety (non-destructive default resolvable)** | Snapshots written only by `recalculate_user_reputation`; vote-derived events exist historically | No backfill; leave `reputation_events` immutable; scores converge on next recalc; surface expected score shift to PO in Phase A | Rewriting history violates transparency principle | Yes — with no-backfill default |
| 6 | Alias scope/UX | **C — UX from existing spec** | Spec §3.4 fully defines behavior | `user_saves.alias` + subtle rename affordance; owner-only rendering | None material | Yes |
| 7 | SoU route vs anchor + intel placement | **C — UX within locked constraint** | SoU on overview only; intel/graph/map are dead code | SoU as a lens; intel stays demoted, not a redesign driver | Resurrecting intel as primary violates locked decision | Yes |

**No open item blocks Phase A.** Items 4–5 need only PO confirmation of the non-destructive defaults. Item 1 remains open permanently until the PO approves an algorithm.

## 6. Database Readiness

Inspected via migrations (static; production NOT VERIFIED — §4).

| Object | State | Gate-relevant verified facts |
|---|---|---|
| `rooms`/`discussions`/`debates` | Present | debates `status` now `active/closed` (202606270001:140-143); `resolution` dropped |
| `messages` | Present | `message_type` ∈ message/question/system (202606110001:58); 1–2000 chars; 5-min edit trigger; no-self-reply; parent immutable; anon-redacting view |
| `claims` | Present | `origin_message_id → messages ON DELETE SET NULL` (202606030004:48); content 25–500 (:55); claim_type/context CHECKs; immutability trigger (only one-way `is_retracted`); `prevent_claim_deletion` (:129-145); `discussion_claims` view w/ vote aggregates + anon redaction |
| `claim_votes` | Present | unique (user_id, claim_id) (202606030006:160); `claim_id → claims ON DELETE CASCADE` (:156); retracted-vote block (202606030009) |
| `evidence_votes` | Present | unique (user_id, evidence_id) (:171); CASCADE FK |
| `evidence`/`claim_evidence`/`sources` | Present | `claim_evidence.claim_id → claims ON DELETE CASCADE` (202606030005:33); direction support/contradict/context; same-room triggers; `sources` room-scoped URL unique; `get_or_create_source` SECURITY DEFINER RPC |
| `questions` | Present | immutability/no-delete triggers mirror claims; `claims.question_id` |
| `inquiry_items`/`inquiry_responses` | Present | `target_claim_id → claims ON DELETE CASCADE` (202606120001:16); lifecycle RPCs; archived-room block |
| `claim_relations` | Present | source/target `→ claims ON DELETE CASCADE` (202606060001:8-9) |
| `user_saves` | Present | private per-user; **no alias column** |
| Reputation | Present, contaminated | vote-derived triggers + retraction penalties + consensus bonus (see §14); direct client access revoked (202606190001) |
| Credibility | Client-side only | `computeCredibility` (votes) → badge; no DB credibility objects |
| Winner/Loser | Removed in tree | `202606270001`; prod unverified |
| `notifications` | **MISSING** | Designed in 04/08 MDs; never implemented |
| Requests/Arguments/Reactions/Alias | **MISSING** | No tables/RPCs/UI anywhere |

**Verdict:** SAFE TO IMPLEMENT the five new systems as additive migrations; **BLOCKER for deletion-lock** until the §9 tombstone-vs-FK decision; **BLOCKER for in-place conversion** until the §8 mechanism is designed (both are Phase A work, not plan defects).

## 7. RLS Readiness

- Existing posture verified: room-access-gated reads via SECURITY DEFINER views + `has_room_access()`; author-only retraction policies; `auth.uid()` captured by triggers; direct table SELECT revoked in favor of redacting views; vote policies block retracted targets; inquiry/private-debate hardening present in-repo.
- New-system RLS is additive and low-risk **except** the deletion lock: it must be enforced inside a SECURITY DEFINER function/trigger, never client-side, and any new join into `discussion_claims`/`discussion_evidence` must preserve the anon-redaction CASE logic.
- Regression rule (plan §33, correct): re-verify anon redaction after every view change.

## 8. Claim Conversion Readiness

**Approved behavior:** NORMAL MESSAGE → ACCEPT AS CLAIM → same conversational object, in-place; no duplicate, no replacement message, no lost origin/replies/reactions/authorship/timestamps; no cross-room reassignment.

**Schema facts verified (202606030003/004, 202606110001):**
- Messages and Claims are separate tables; `claims.origin_message_id` is a nullable reference (current copy+link model).
- `messages.message_type` CHECK = message/question/system — no claim value.
- `claims.content` CHECK = 25–500 chars vs `messages.content` 1–2000 → a converted message may violate the claim constraint in both directions.
- `claims.claim_type` NOT NULL + CHECK → conversion must supply a type (server-default recommended; triage item 2).
- `claims.created_by` is set by trigger from `auth.uid()` on INSERT → conversion must be executed by the message author (consistent with the Accept flow).
- `claims.created_at` can be set explicitly on INSERT (immutability trigger constrains UPDATEs only) → original timestamp preservable.
- Replies thread on `messages.parent_message_id`; if the message row remains and renders as a claim, replies are preserved automatically.
- Claims lens/evidence/votes require a real `claims.id`.

**Strategy assessment (no solution invented; Phase A engineering choice):**
- (a) *Mutate message into claim row* — NOT viable (cross-table move, ID change breaks replies/votes/threads).
- (b) *Promotion RPC (recommended)* — SECURITY DEFINER `convert_message_to_claim`: author-only; same-room invariant (claims trigger already enforces origin-room match); validates 25–500 length with explicit error path; inserts `claims` copying content + `created_at`; marks the message converted (marker mechanism = Phase A design decision: `message_type` CHECK extension or nullable `converted_claim_id`); feed renders the message slot as the compact claim card via existing `claimedMessageIds`/`messageToClaimMap`. Preserves replies, authorship, timestamps, origin; no duplicate content; no cross-room reassignment.
- (c) *UI-only render-as-claim* — rejected (no `claims.id` → no evidence/votes/lens).
- Legacy `ExtractClaimModal` (copy path) must be replaced by the Accept/convert flow (plan §28 REPLACE — correct).

**Exact blockers (resolvable in Phase A):**
1. Conversion marker on `messages` requires a migration — BLOCKER for UI, not design.
2. Length-mismatch handling (<25 or >500) must be defined (reject-with-guidance vs trim-confirm) — engineering UX decision.
3. Post-conversion message edits must be disabled (5-min edit trigger would otherwise diverge content) — encode in RPC.
4. Immutability/no-delete triggers do not conflict with INSERT-based promotion (verified).

**Status: REQUIRES DECISION (Phase A mechanism sign-off) → then SAFE TO IMPLEMENT.** No product decision needed; in-place semantics are locked.

## 9. Claim Deletion Readiness

**Verified current state:**
- `prevent_claim_deletion` raises on every DELETE (202606030004:129-145); `enforce_claim_immutability` allows only one-way `is_retracted` (:94-127); UI offers immediate author Retraction with `CLAIM_RETRACTED −20` (202606100004:176-194); no timer/config anywhere.
- **All relationship FKs to claims are ON DELETE CASCADE**: `claim_evidence.claim_id` (202606030005:33), `claim_votes.claim_id` (202606030006:156), `claim_relations` source/target (202606060001:8-9), `inquiry_items.target_claim_id` (202606120001:16). Only `origin_message_id` is SET NULL.
- A literal hard DELETE would silently destroy evidence↔claim links (evidence rows survive but lose meaning), votes, relations, and inquiries — conflicting with "Related Evidence and Arguments must remain understandable."

**What must happen for a 20-minute configurable LOCK (not expiration):**
1. Replace/augment `prevent_claim_deletion` with a lock-aware guard: deletion only when `now() ≥ created_at + lock` AND actor = author, enforced in a SECURITY DEFINER function/trigger; duration from a single server-side config constant (V1 20 min; future 5 min). Configurability = APPROVED REQUIREMENT.
2. Deletion mechanics — **the Phase A decision**:
   - *Tombstone/soft delete (recommended)*: `is_deleted`/`deleted_at`; stop rendering content; render "Previously attached to a deleted Claim" placeholders on evidence/arguments/relations/inquiries; zero FK changes; reversible-with-backup; redaction unaffected.
   - *Hard delete + FK re-engineering*: four FKs → SET NULL + placeholder joins — wider blast radius, touches redacting views.
   - Soft-delete changes data-layer semantics, so record it as an E-class confirmation in the Phase A report (the product outcome is unchanged — not a new product decision).
3. Retraction remains a separate, unpunished action; remove the −20 trigger in the epistemic-cleanup migration (§15).
4. Future arguments table must use the same non-cascading pattern from day one.

**Status: BLOCKER for deletion UI until Phase A mechanism decision + prod verification + backup plan; design work itself SAFE TO IMPLEMENT.**

## 10. Request-as-Claim Readiness

- **MISSING** end-to-end (verified). Current nearest behavior: any-user "Create Claim" via `ExtractClaimModal` — must be replaced by Request → author Accept/Skip/Decline.
- Design gate §6.1 is additive: `claim_requests` + RLS + aggregation; only dependency is Accept → conversion RPC (§8).
- Aggregation: one visible state per message with requester count; per-requester rows unique(message_id, requester_id); Skip/Decline subtle author-side states; **no reputation events, no public shaming** (locked).
- `notifications` table does not exist — no notification dependency (corrects plan INFERENCE); in-room state only.
- **Status: SAFE TO IMPLEMENT (after §8 mechanism design).**

## 11. Argument Readiness

- **MISSING for discussions.** Correction established: debates also have no `debate_arguments` table — debate "arguments" are `claims.debate_side` rows via `getClaimsBySide` (`debate-service.ts:222`). The only reasoning-relationship entity is claim↔claim `claim_relations`.
- Plan §13 correct: NEW claim-attached arguments entity (supporting/challenging); keep `claim_relations` as relation graph; do not silently generalize the debate side-claims mechanism.
- Reuse verified: claims' trigger/RLS/view patterns (immutability, anon redaction, room access) are the template.
- Debates keep side-claims as their arguments surface; adopting the new entity there later is a separate decision (out of scope).
- **Status: SAFE TO IMPLEMENT (additive; design gate §6.2).**

## 12. Reaction Readiness

- **MISSING** entirely (verified: no reaction UI/service/table). Locked decisions permit reactions; spec §5.2/§25 list React as a standard action.
- Design gate §6.3: per-user per-target rows; visually/semantically distinct from Support/Challenge (no agree/disagree mapping, no quality implication); aggregate display must avoid popularity styling (philosophy constraint).
- Messages first; claims/evidence/arguments extension is a Phase A engineering choice.
- **Status: SAFE TO IMPLEMENT (additive).**

## 13. Room Architecture Readiness

Verified live and in code:
- `/discussions/[slug]` = overview + 4 cards; `/claims`, `/evidence`, `/questions`, `/contributions` all 200; `/sources` 404; room entry nav reads "Overview / Claims / Evidence…" (browser-verified).
- `RoomSectionShell` is the live shell (MODIFY — slim header, add Conversation/Sources/SoU entries); `DiscussionRoom` + `SectionNav` + `DiscussionHeader` + `OpeningPremise` + `DiscussionDataProvider` are dead code (no route imports); intel/graph/map/health/summary dead with them.
- `DiscussionContributionsSection` + `CommentItem` + `buildCommentTree` + paginated hooks are the viable conversation base (MODIFY/REUSE); contributions lens currently passes empty claim maps (plan-correct).
- Sidebar (`sidebar.tsx`) and `mobile-nav.tsx` have no room awareness (MODIFY with new room-local subcomponent).
- Debate side: `DebateRoom` client-section architecture + debate section routes share the shell pattern; debate "arguments" = side claims (§11).

Dispositions (with justification):
| Component | Disposition | Justification |
|---|---|---|
| `room-section-shell.tsx` | MODIFY/REFACTOR | Live, route-consistent, deep-link preserving; smallest safe path to lenses |
| `discussion-contributions-section.tsx` + `comment-item.tsx` | MODIFY/REUSE | Working threaded feed + actions; becomes the conversation surface |
| `discussion-room.tsx`, `section-nav.tsx`, `discussion-header.tsx`, `opening-premise.tsx`, `discussion-data-provider.tsx` | REPLACE (harvest patterns) then DELETE in Phase O | Dead; dashboard layout conflicts with spec; provider/maps pattern seeds the shared store |
| `map-tab/graph-view/graph-utils/discussion-intelligence/health/summary` | DEPRECATE (demoted/optional), delete decision in Phase O | Locked: secondary/optional; no deletion now |
| `extract-claim-modal.tsx` | REPLACE | Copy+link contradicts locked in-place direction |
| `claim-list.tsx` | MODIFY | Live lens; needs compact variant + badge/bar removal |
| `room-sources-tab.tsx` | MODIFY + PROMOTE to `/sources` | Ready component, debate-only today |
| `sidebar.tsx` / `mobile-nav.tsx` | MODIFY | Add pathname-aware room subsection |
| `user-credibility-card.tsx` | DELETE in cleanup | Dead code; reputation-score surface conflicts with cleanup |

Do NOT delete dead components during Phase A merely because they are dead — Phase O, after replacements are live.

## 14. Epistemic Isolation Audit

Every vote-derived path traced UI → hooks → services → DB → triggers → views → derived consumers. Contamination = stance converted into truth/quality/credibility/authority/reputation/SoU/ranking/winner.

| # | Path (full chain) | Classification | Action |
|---|---|---|---|
| 1 | `ClaimVoting` (`claim-list.tsx:716-792`) → `useVoteClaim` → `castClaimVote` (`discussion-service.ts:1053`) → `claim_votes` → `discussion_claims` view counts → Support/Challenge counts + "% of voters" bar | Stance display (counts ALIGNED; bar = visual-truth risk) | Keep counts; replace bar with secondary text |
| 2 | votes → `computeCredibility` supportRatio (`reputation-utils.ts:89-112`) → `ClaimCredibilityBadge`/`CredibilityTooltip` (`claim-list.tsx:523-532`) | **CONTAMINATION — credibility from popularity** | Remove vote terms/badge (Phase K) |
| 3 | `claim_votes` INSERT/DELETE → `handle_claim_vote_insert/delete` (202606100004:196-247) → `CLAIM_AGREED +2`/`CLAIM_DISAGREED −1` | **CONTAMINATION — reputation from popularity** | Drop triggers (Phase K migration) |
| 4 | `evidence_votes` → `handle_evidence_vote_insert/delete` (202606100004:306,332) → `EVIDENCE_APPROVED/DISPUTED` | **CONTAMINATION** | Drop triggers; remove UI/service (triage 4) |
| 5 | Retraction → `CLAIM_RETRACTED −20` (:176-194), `EVIDENCE_RETRACTED −15` (:280-281) | **CONTAMINATION — punishment for changing mind** | Remove penalties (Phase K) |
| 6 | `consensus_ratio` (view) → `claim_stats` → `v_consensus_bonus` in `recalculate_user_reputation` (202606190001:92-135) | **CONTAMINATION — authority score from votes** | Remove bonus (migration, Phase K) |
| 7 | SoU `statusReason` includes `formatCommunityStance(...)` vote text (`understanding-utils.ts:176-183`) | Presentation leak (state clean) | Remove vote text (Phase J) |
| 8 | Homepage RPC joins `claim_votes`, computes consensus (202606170001:258-298) → `logged-in-homepage.tsx:765-766, 780-781` sorts claims by `\|consensusRatio − 50\|` | **CONTAMINATION — vote-derived ordering** | Re-rank by non-vote signal or neutralize order (Phase K scope) |
| 9 | `useOnboardingStatus` counts own `claim_votes` (`use-homepage.ts:145`) | Benign participation gate | KEEP (documented so cleanup doesn't break it) |
| 10 | `recent_engagement` RPC reads `claim_votes` (202606260002/4) | Personal engagement list (descriptive) | Verify semantics at implementation; expected KEEP |
| 11 | `UserCredibilityCard` (reputation-score card) — file present, no importers (dead) | Dead contamination surface | Delete in cleanup |
| 12 | Winner/loser: `resolve_debate` RPC + `DEBATE_WON/LOST` dropped (202606270001); resolution/scorecard components deleted in tree | Removed (prod NOT VERIFIED) | Verify prod; no reintroduction |
| 13 | `EvidenceVoting` UI (`evidence-section.tsx:462`) | Unapproved voting surface (locked: no evidence voting) | Remove UI/service; keep rows |

**SoU state isolation: VERIFIED CLEAN** — `deriveStateOfUnderstanding` uses only `claim_evidence.direction` counts; retracted filtering present; no vote input to state.

Sweep keywords (`claim_votes`, `evidence_votes`, `supportRatio`, `consensus`, `credibility`, `reputation`, `CLAIM_AGREED/DISAGREED`, `retract`, `winner`, `loser`, `draw`, `score`, `trust`, `influence`) searched repo-wide; the table is the complete contamination set found.

## 15. Reputation/Credibility Cleanup Readiness

- Removal list verified complete and migration-gated: vote→reputation triggers (§14 rows 3–4), consensus bonus (6), retraction penalties (5), `computeCredibility` vote terms + badge/tooltip (2), homepage vote-ordering (8).
- Contribution-based reputation (creation weights, `reputation-utils.ts:5-11`) is NOT vote-derived — plan's INFERENCE to keep it stands; confirm profile display scope so cleanup doesn't remove approved profile stats (7A redesigned profile to contribution history; `UserCredibilityCard` already unreferenced).
- Data safety: preserve `reputation_events` history; no backfill (triage 5); snapshots recalc forward.
- **Status: SAFE TO IMPLEMENT after prod-migration verification (§4) + PO confirmation of non-destructive defaults.**

## 16. SoU Readiness

- Evidence-led core VERIFIED clean (§14). Required work: remove vote text (row 7), neutralize `hasSufficientData` into an OPEN seam + neutral empty-state (no threshold invented), relocate SoU behind its lens (currently overview-only), keep deterministic language (never Proven/Winner/Settled — plan §16 correct).
- `hasSufficientData` is a pre-existing trivial gate, not an approved algorithm; replacing it with a neutral empty-state is engineering within the OPEN constraint (triage 1).
- **Status: SAFE TO IMPLEMENT (seam + cleanup); the maturity algorithm itself is OPEN — do not build.**

## 17. Deep-Link Compatibility

- Existing verified params: claims `?highlight` + `?addEvidence=true`; evidence `?highlight`; questions `?question={id}`; all routes return 200 live.
- Target architecture must keep these working (plan §6 correct). Entry-composition change (`/discussions/[slug]` becoming Conversation) must not orphan external links to overview content — redirect/overview-lens decision is engineering (C-class), plan flags it.
- Extend anchor deep-links for origin jump-back (claims/evidence → conversation anchor) per spec §16 (engineering).
- **Status: SAFE TO IMPLEMENT with a redirect-compat checklist in Phase B.**

## 18. Responsive/Mobile Readiness

- Browser-verified (guest, structural): **no horizontal overflow at 375/390/834/1440** on `/discussions/[slug]` (scrollWidth − clientWidth = 0 in all four).
- NOT verified: authenticated interactions, claim/evidence cards at depth, composer, mobile lens switching, touch targets, keyboard/screen-reader. 7C code observations (no `break-words` on shell title; badge-wrap risk) remain visually unverified.
- Plan's responsive phase (M) with 375/390/834/1440 QA + jump-to-message is correctly scoped.
- **Status: NOT VERIFIED beyond structural overflow; QA-phase work, no blocker.**

## 19. Browser / Playwright Verification

**Performed** (not merely inspected). Tooling checked and used:
- `playwright.config.ts` present (testDir `tests`, headless, 1280×900); `@playwright/test` installed in `node_modules` (not in package.json — ad-hoc install); `tests/phase5c-onboarding-qa.spec.ts` exists (auth-dependent, not run).
- `.env.local` present; dev server started (`npm run dev`, Next.js 15.5.25, ready in 7.9s).
- Inline Playwright inspection (script written to OS temp dir — no repo file created), guest session, real seed data:

| Route | Status | h1 | overflowX | Notes |
|---|---|---|---|---|
| `/` | 200 | Structured Discussion & Debate | 0 | Guest nav: Home/Discussions/Search/Debates/Profile |
| `/discussions` | 200 | Explore Discussions | 0 | |
| `/discussions/{slug}` | 200 | room title | 0 | Nav shows **Overview/Claims/Evidence…** → conversation-first ABSENT live |
| `…/claims` | 200 | room title | 0 | |
| `…/evidence` | 200 | room title | 0 | |
| `…/questions` | 200 | room title | 0 | |
| `…/contributions` | 200 | room title | 0 | |
| `…/sources` | **404** | Resource Not Found | 0 | Sources lens MISSING live |
| `/debates` | 200 | Browse Debates | 0 | |
| `/saved` | 200 (Login h1) | Login | 0 | Auth guard works |
| Viewports 375/390/834/1440 on room | — | — | **0 in all four** | Structural only |

Limits: guest-only (no auth flows/posts), one seed room, structural checks; not a substitute for Phase P QA.
Dev server stopped after inspection; no application code was modified to enable QA.

## 20. Validation Results

| Check | Result | Pre-existing? | Phase 7D relevant? | Blocks implementation? |
|---|---|---|---|---|
| `npx tsc --noEmit` | **FAIL** — 1 error: `src/app/u/[username]/page.tsx(52,7) TS2304: Cannot find name 'showReputation'` | Yes (file is in the user's uncommitted working tree; untouched by gate) | Yes — blocks build validation | Blocks `npm run build` only; owner should resolve their in-flight edit before Phase A coding |
| `npm run lint` | PASS with 9 warnings (0 errors) — `no-unused-vars` in `scripts/phase5d-*.mjs`, `debate-room.tsx:40`, `understanding-utils.ts:47`, `inquiry-card.tsx:15` | Yes | Minor | No |
| `npm run build` | **FAIL** — same TS error (Next build type-check; build log in temp) | Yes | Yes | Blocks build gate until the tsc error is fixed |
| Tests (`tests/`) | NOT RUN — existing spec requires authenticated seed env; running it would exercise auth flows beyond gate scope | — | — | No (Phase P covers E2E) |
| Database live inspection | NOT POSSIBLE — no production/local DB connection tooling in this environment; migrations reviewed statically | — | — | Phase A prod-verification required (§4) |

## 21. Implementation Blockers

| # | Blocker | Class | Resolves when |
|---|---|---|---|
| B1 | Production migration state unverified (`202606190001`, `202606270001`, private-debate chain, base objects) | Gate/verification | Phase A prod schema verification is recorded |
| B2 | Pre-existing TS error `showReputation` breaks `tsc`/`build` | Engineering (owner's uncommitted work) | Owner completes/fixes `src/app/u/[username]/page.tsx` |
| B3 | In-place conversion mechanism (message conversion marker + length handling + post-conversion edit rule) undecided | Engineering (Phase A design) | §8 mechanism signed off; migration designed |
| B4 | Deletion mechanics (tombstone vs FK re-engineering) undecided; CASCADE FKs make hard delete destructive | E-class data-safety decision (Phase A) | §9 recommendation confirmed (soft-delete default) |
| B5 | Epistemic-removal migration (vote triggers, consensus bonus, penalties, credibility) not yet designed/approved as a migration plan | Migration-gated cleanup | Phase K migration plan reviewed with backup/rollback |
| B6 | Working tree carries a large uncommitted changeset (Phase 6E/7A/7B work + deleted winner/loser components) | Process risk | Commit or stash before Phase A coding so Phase 7D changes are attributable |

No product-decision blocker exists. SoU maturity remains OPEN by design and blocks nothing (seam-only).

## 22. Conditions for Starting Phase A

1. B1: production schema verification obtained and recorded (or PO explicitly accepts repo-as-truth risk in writing).
2. B2: TS error resolved (owner) so `tsc`/`build` are green before new code lands.
3. B6: working tree committed/stashed; baseline build recorded.
4. Confirm non-destructive defaults for triage items 4 (preserve evidence-vote rows) and 5 (no reputation backfill).
5. §8 conversion mechanism and §9 deletion mechanics recommended approaches reviewed and signed off (engineering sign-off is sufficient; both preserve locked product semantics).
6. Epistemic-removal migration plan (B5) drafted with backup + rollback for review.

## 23. Conditions for Starting Phase B (shell/routing)

1. Phase A outputs: migration matrix + RLS matrix for requests/arguments/reactions/alias/deletion-lock reviewed.
2. Deep-link compat checklist (§17) written (redirects for overview content, param preservation).
3. Shared room store design harvested from `DiscussionDataProvider` pattern (§13 dispositions agreed).

## 24. Conditions for Starting UI Implementation

1. DB + RLS for the relevant entity landed in the repo (plan rule "ship DB before UI" — verified sound).
2. No new UI action depends on the `notifications` table (does not exist).
3. Epistemic guardrails in place for whatever ships: no vote-derived credibility/ranking in any new surface; SoU shows no vote text; stance displayed as counts/text only.
4. Conversion UI waits for B3; deletion UI waits for B4 + prod verification + backup.
5. Do not build: SoU maturity algorithm, evidence voting, per-room sounds, claim version history, M2M evidence, new reputation mechanics (spec §29 — verified still prohibited).

## 25. Recommended Implementation Sequence

Adopt the plan's 16-phase order (A→P) with these gate-informed adjustments:
1. **Phase A** adds: prod-verification, B2/B6 resolution, §8/§9 mechanism sign-offs, homepage re-ranking decision (§14 row 8) added to the epistemic-cleanup scope, `UserCredibilityCard` deletion added to Phase O list.
2. **Phase K** (epistemic/reputation cleanup) explicitly includes: homepage vote-ordering neutralization and homepage-RPC consensus display review — not just triggers/bonus/penalties/credibility.
3. **Phase B** includes the redirect-compat checklist before any entry-composition change.
4. Keep plan rules verified as sound: DB-before-UI per entity; never build request/argument/reaction/delete UI before its DB/RLS; never demote intel before replacement lenses live; never touch deletion triggers before backup + prod-verify.

## 26. Final Recommendation

**Proceed with Phase 7D under READY WITH CONDITIONS.** The plan is accurate, philosophically aligned, and its sequencing is safe. Begin Phase A now with the six §22 conditions; hold all UI work until the §24 conditions are met. The single most important property to preserve through implementation is the one this gate verified is currently violated: **community stance must touch nothing except stance display** — every path in §14 must end at "removed" or "stance-only" before Phase 7D can be declared complete.

### Self-check
[✓] Governance read · [✓] UX Spec read (7C full read; spot re-verified) · [✓] Reconciliation read · [✓] Phase 7D plan read (complete) · [✓] Original MDs read (00–06, 08, 23) · [✓] Implementation independently verified · [✓] Database inspected (migrations, static) · [✓] RLS inspected · [✓] Migration state investigated (prod NOT VERIFIED, marked) · [✓] Vote/reputation/credibility/SoU contamination traced (§14) · [✓] Conversion/deletion/requests/arguments/reactions checked · [✓] Sources checked · [✓] Routes/sidebar/mobile/deep-links checked · [✓] Browser tooling checked and Playwright used (live inspection) · [✓] Validation run where possible · [✓] No code changed · [✓] No migration applied · [✓] No product decision invented (SoU maturity stays OPEN)
