# Phase 7D — Discora Discussion/Debate Room Implementation Plan

**Type:** Architecture + implementation planning ONLY — no code, migration, config, or product-doc changes.
**Authority:** Philosophy → Original MDs → Approved decisions → DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC V1 → Reconciliation → Implementation → UX → Assumptions.
**Locked inputs:** Message→Claim in-place; no Evidence voting in V1; SoU maturity OPEN; no retraction punishment; Intelligence/Health/Graph/Map secondary; conversation-first; stance-only votes; no Winner/Loser.
**Status:** DRAFT — incremental save in progress.

## 1. Executive Summary
Current room is overview-dashboard + disconnected section pages, not conversation-first lenses. Copy+link extraction, vote→reputation/credibility/SoU leakage, retraction penalties, missing Requests/Arguments/reactions/Sources lens/unified composer/room-local nav/deletion-lock are the critical deltas. Plan: epistemic isolation first, DB prerequisites second, unified room shell + conversation feed third, then lifecycle layers, then polish/validation. SoU algorithm stays OPEN with a plug-in seam. No implementation performed.

## 2. Current Architecture
- Routes: `app/discussions/[slug]/page.tsx` overview (SoU + 4 cards); `claims/evidence/questions/contributions` disconnected pages via `RoomSectionShell`. No `/sources`, no SoU route. Legacy `DiscussionRoom` full-room exists but no route renders it (dead/ambiguous).
- Shell: `RoomSectionShell` header card + guide + sticky pills (Overview/Claims/Evidence/Questions/Contributions). `Sidebar`/`MobileNav` have no room awareness.
- Data: per-section paginated hooks, no shared room store; deep links `?highlight/?question` but no scroll/origin preservation or jump-back. Contributions lens passes empty claim maps.
- Domain: messages threading/edit/report/anon OK; claims via copy+`origin_message_id`; `claim_votes`/`evidence_votes` live with reputation triggers + consensus bonus; credibility from votes; SoU client-derived evidence-led status with vote text leakage; inquiries shared from debates; no arguments/reactions/requests tables.
- Validation surface: Playwright `playwright.config.ts` + `tests/phase5c-onboarding-qa.spec.ts` (localhost:3000); no room-epistemic specs.

## 3. Approved Target Architecture
Single room, Conversation default; Claims/Evidence/Sources/Questions/SoU are lenses over same content with origin preservation; compact header; room-local current-room nav (collapsible); unified Message(default)/Claim/Question composer; in-place Message→Claim; aggregated Request-as-Claim (Accept/Skip/Decline, no penalty); compact claim cards with S/C secondary text stance (no bar); Evidence/Arguments chronological with subtle ↳ relation, reply/react/links, no evidence voting; Questions vs Targeted Inquiries split; evidence-led SoU with OPEN maturity seam; 20-min configurable server deletion lock with deleted-claim placeholders; shared Discussion/Debate mechanics; subtle sound/motion later.

## 4. Architecture Delta
| Area | Current | Target | Delta class |
|---|---|---|---|
| Entry/IA | Overview dashboard | Conversation default | Restructure route composition |
| Lenses | Disconnected pages | Route-backed lenses + shared store | New shell/state, keep deep links + redirects |
| Nav | No room subsection | Current-room collapsible subsection | New nav component |
| Header | Large card + stats | Compact title/label/actions | Modify |
| Conversation | Secondary, stripped ctx | Primary unified feed | Refactor + fix maps |
| Composer | Message-only + split forms | Unified 3-mode | New composer |
| Claims | Copy+link, large cards, truth bar | In-place, compact, stance text | Migration + refactor |
| Requests | Missing | Aggregated lifecycle | New table/RPC/UI |
| Evidence/Args | Drawer-only / missing | Chronological + lens | New argument entity; evidence refactor |
| SoU | Vote-text leakage, invented threshold | Evidence-led + OPEN seam | Cleanup |
| Epistemic | Votes→reputation/credibility/bonus | Stance isolation | Remove paths (migration-gated) |
| Deletion | Retraction-only | 20-min lock + placeholder | New migration |
| Sources/Reactions | Derived/none | Lens + infra | New |
| Intel/Graph | Primary-adjacent | Secondary/optional | Demote, no redesign driver |

## 5. Critical Legacy Drift
- Vote→reputation/consensus-bonus/credibility/SoU-text → APPROVED stance-only → REQUIRED remove consumers, keep counts. Deps: reputation triggers/RPC/utils/claim cards/SoU. Risk: profile scores change; snapshot/backfill is OPEN impl detail.
- Evidence voting live → APPROVED excluded → REQUIRED disable/remove vote paths (UI + service + triggers), preserve rows read-only or migrate per data decision. Do not repurpose as quality.
- Retraction penalties (-20/-15 + client weights) → APPROVED penalty-free → REQUIRED remove.
- Copy+link extraction → APPROVED in-place → REQUIRED conversion path (see S10). Conflict: 23_KNOWLEDGE_MODEL recommends copy+link; reconciliation + brief resolve to in-place. Class: Potential MD conflict, resolved by newer approved decision (record, do not edit MDs).
- Immutable/retraction-only claims → APPROVED deletion lock → REQUIRED new lifecycle (see S19).
- Dashboard-first/intel-primary/disconnected pages/truth-bar/green-red → APPROVED conversation-first/secondary/text-stance → REQUIRED demote/restyle.
- Winner/Loser: code deletions uncommitted + removal migration present; prod-applied NOT VERIFIED → verify before claiming retired in prod; no replacement.

## 6. Route Architecture
- Keep existing deep links working: `claims?highlight&addEvidence`, `evidence?highlight`, `questions?question`. Add redirects/compat if entry composition changes.
- Target: `/discussions/[slug]` = Conversation (default). Lenses as route-backed views (`/claims`, `/evidence`, `/sources` NEW, `/questions`, SoU anchor/route TBD OPEN) sharing room store; query/state-driven detail (desktop panel) + jump-to-message (mobile). Do not break saved/external links without redirects.
- Debate routes mirror shared shell with Motion/Proposition/Opposition extras; no Winner/Loser routes.
- SoU maturity route/threshold: OPEN — architecture only exposes seam, no invented route gating.

## 7. Room Shell Architecture
- New/Refactored: shared room provider (room + lens + selection + scroll/origin) reusing `DiscussionDataProvider` pattern; compact header (title + Discussion label + Save + compact actions); room-local nav component (desktop subsection + mobile lens switcher); `RoomSectionShell` MODIFY (slim header, lens nav incl. Sources/SoU, preserve `beforeNav` seam for SoU secondary placement).
- Reuse: `RoomGuideCard`, `SaveButton`, existing paginated hooks as lens data sources behind store.
- Risks: state duplication across lenses; deep-link vs panel state conflicts. Mitigate: single source of truth per roomId; URL as lens address, store as UI state.

## 8. Conversation Architecture
- Unify feed: chronological messages + inline Claim/Evidence/Argument nodes with origin links; reuse `buildCommentTree`, `CommentItem` (extend actions: Reply/React/Request-as-Claim/More + Report), `ClaimList` card (compact variant), evidence/argument inline variants.
- Fix: contributions lens MUST receive real `claimedMessageIds/messageToClaimMap/messageEvidenceMap` (currently empty) — engineering fix, no product change.
- Preserve: 5-min message edit trigger, threading, anon redaction, moderation report flow. No votes on messages (already correct).
- Realtime: existing Supabase realtime for messages; extend invalidation to new entities via `invalidateRoomQueries` pattern (no new infra).

## 9. Composer Architecture
- New unified composer: Message (default) / Claim (lightweight) / Question (lightweight). Keep zod validation but reduce Claim friction: content + minimal required metadata only; do not force long form unless DB constraint requires (25–500 chars, type/context currently required — see S37 OPEN about minimizing).
- Evidence/Argument/Targeted Inquiry NOT top-level modes; initiated from Claim (+Evidence/+Argument/Inquiry action).
- Guest: keep `GuestContributionPrompt` + login redirect with `redirectedFrom`.

## 10. Claim Lifecycle
- APPROVED: in-place Message→Claim (original becomes Claim, no duplicate, identity/origin intact). Current `origin_message_id` copy+link + immutability triggers + `claims_content_length_check` + `enforce_claim_immutability` + `prevent_claim_deletion` conflict with target.
- Plan: DB prerequisite (S25) must land first: conversion mechanism (e.g., message-kind transition or claim-row promotion with message retired/hidden as claim-rendered — exact mechanism is engineering choice gated by data-preservation review; do NOT invent product semantics beyond in-place requirement), same-room invariant preserved, author-only, server-enforced. UI: Accept path renders original slot as compact claim card; lenses link to conversation anchor.
- Minimal claim cards: integrate in feed, slightly larger than message, examination actions (+Evidence/+Argument/Inquiry), S/C text at bottom, no progress bar, no credibility badge, no green/red truth encoding.
- Types: keep `fact/opinion/prediction/proposal/observation` + context types unless PO simplifies (OPEN — do not silently drop).

## 11. Request as Claim
- MISSING: `git grep claim_request` empty. Required: aggregation entity (one request state per message), requester list (INFERENCE — needs PO data-shape confirm; mark OPEN), author Accept/Skip/Decline, subtle copy (“skipped/declined…”, “+ Add as Claim” after skip), no reputation/shame.
- Plan: new table + RPCs + RLS + service/hooks + message action + author inbox affordance (placement TBD, subtle). Accept triggers S10 conversion. Notifications: reuse `notifications` table if suitable (INFERENCE — verify before use).

## 12. Evidence Architecture
- Keep: one primary Claim (V1), `support/contradict/context` via `claim_evidence`; strict Source→Evidence→Claim pipeline (23C); anon redaction; retraction flags.
- Change: render evidence chronologically in conversation as chat-like nodes with subtle ↳ relation + Claim link; keep Evidence lens; enable Reply/React (React infra is MISSING — see S20); clickable links via linkifier (MISSING); remove `evidence_votes` UI/service/trigger consumers (APPROVED exclusion); preserve existing vote rows per data decision, never as quality.
- Files: MODIFY `evidence-section.tsx`, room evidence lens components; REUSE source validation + `get_or_create_source` RPC pattern (verify name before use — INFERENCE from prior docs, NOT VERIFIED in this pass).

## 13. Argument Architecture
- MISSING entity (only `claim_relations` supports/contradicts/refines exist). APPROVED: distinct reasoning object, one primary Claim, supporting/challenging, chronological + lens, reply/react, initiated via +Argument (not composer).
- Plan: new `arguments` (name TBD — do NOT collide with debate-side claims) + relation + RLS + service/hooks + inline + lens UI. Reuse claim-evidence patterns; do NOT generalize debate argument infra silently. `claim_relations` KEEP as relation graph (secondary), not as arguments.

## 14. Questions vs Targeted Inquiries
- Questions: KEEP `questions` + `QuestionList` + lens + `?question` links; add lightweight composer mode; keep broad taxonomy; chronological presence via feed affordance (exact feed rendering is engineering choice).
- Inquiries: KEEP `inquiry_items`/`inquiry_responses` + RPCs + claim-scoped entry (`InquiryButton/Dialog/List/counts`); enforce terminology split (fix “Questions & Inquiries” merge on questions page); verify private-debate RLS already hardened (migrations present; runtime NOT VERIFIED).
- Do not merge concepts in UI/copy/routes.

## 15. Sources Lens
- Current: `RoomSourcesTab` derived bibliography exists but NOT in shell nav; no `/sources` route; source anchors clickable.
- Plan: NEW `/sources` lens reusing derivation + dedup by `source_id` + citation counts; room-scoped; clickable URLs with `target=_blank rel=noopener`; upload/PDF scope is future (01/PRD lists URL/PDF/Image/Video-link — do not expand uploads without PO). RLS via evidence/source visibility (verify before build).

## 16. State of Understanding
- Keep safe: evidence-led status (`supported/contested/unresolved`), retracted filtering, source domains, open-question surfacing, evidence-oriented copy.
- Remove: vote text from `statusReason` (`formatCommunityStance` in reasons), `agreementPercentage`/vote display inside SoU cards, `hasSufficientData = any content` invented threshold (replace with neutral empty-state + OPEN seam for future maturity plug-in; no scoring formula).
- Seam: `deriveStateOfUnderstanding` KEEP as pure function; add explicit `maturity: OPEN` extension point (types only, no algorithm). Language: Supported by Current Evidence / Contested-Mixed / Unresolved Front; never Proven/Winner/Settled.

## 17. Community Stance / Voting Isolation
- Keep `claim_votes` (agree/disagree, unique per user/claim, retracted-blocked). Display ONLY as secondary text: “72 Support · 28 Challenge · 100 votes” at claim bottom; never bar-as-truth, never color-as-correctness.
- Remove ALL other consumers: reputation triggers, consensus bonus, credibility, SoU text, homepage/ranking quality signals (verify homepage use before change — `use-homepage.ts:145` counts votes; mark verification required).
- Evidence votes: APPROVED excluded — remove paths, do not reintroduce under new names.

## 18. Reputation / Credibility Cleanup
- Remove: `handle_claim_vote_insert/delete`, `handle_evidence_vote_insert/delete` reputation effects; consensus bonus in `recalculate_user_reputation`; `CLAIM_AGREED/DISAGREED`, `EVIDENCE_*` vote events; retraction penalties `CLAIM_RETRACTED -20` (verify points; removal APPROVED as penalty-free); `computeCredibility` vote-based scoring + `ClaimCredibilityBadge`/`CredibilityTooltip` on claims.
- Keep (INFERENCE — verify scope before change): contribution-based reputation (claims/evidence/questions created) is not itself vote-based; profile display scope must be confirmed so cleanup does not accidentally delete approved profile stats. No new scoring invented.
- Migration-gated: triggers/RPC changes require new migration + backfill/snapshot decision (OPEN impl detail).

## 19. Claim Deletion Lock
- Current: `prevent_claim_deletion` + `enforce_claim_immutability` (retraction-only, one-way). APPROVED: 20-min LOCK (not expiry), future 5-min, configurable, server-enforced; related Evidence/Arguments keep “Previously attached to a deleted Claim” placeholder.
- Plan: new migration replacing delete-block with time-lock function + config (table or constant — OPEN impl detail, no invented schema here); update `retractClaim` vs delete UX (retract stays for revision; delete appears after lock); preserve FKs via SET NULL + placeholder rendering (do not cascade-delete evidence/arguments).
- Risk: highest data-preservation risk; requires prod-migration-state verify + backup/rollback plan before touching triggers.

## 21. Room-Local Sidebar
- New component: current-room-only subsection under Discussions/Debates (Conversation/Claims/Evidence/Sources/Questions/SoU), expandable/collapsible, pathname-aware, hidden outside rooms. Saved stays on `/saved`; private alias (if built) is per-user label only, canonical title unchanged.
- Alias storage: MISSING (`room_alias` grep empty; only `user_saves` exists) — DB design required (S25), not assumed.
- Files: MODIFY `sidebar.tsx`, `mobile-nav.tsx` (add room-aware slot); NEW room-local nav component reusing lens routes.

## 22. Discussion vs Debate Shared Architecture
- Share: conversation feed, composer, claims, evidence, arguments, questions/inquiries, sources, SoU backbone, stance, reactions, links, moderation, anon.
- Debate-only: Motion/Proposition/Opposition structure, side-aware claims/participants. No Winner/Loser/Draw/score.
- Plan: shared room shell + feed components with `roomType` prop (extend `RoomSectionShell` pattern); debate-specific slots only for motion/sides. Verify debate RLS (private-debate migrations present) before sharing mutations.

## 23. Responsive / Mobile Architecture
- Reuse Tailwind responsive patterns (grids, sticky scrollable lens nav, truncation). Room QA must cover 375/390/834/1440: no overflow/overlap/clipping, compact header/cards, usable touch targets, readable chat flow.
- Mobile: jump-to-message/return-to-conversation (not separate panels); desktop: contextual detail panel where appropriate (engineering choice, no new lib).

## 24. Sound / Motion Layer
- Later layer only. Subtle entrance/pop for messages, differentiated for Claim/Evidence; sounds subtle, synchronized, globally disableable. No coins/victory/game sounds. No architecture redesign for this; add prefs seam only (per-room sound settings are OPEN per Spec S29 — do not invent).

## 25. Database Changes
- EXISTING (keep): `rooms/discussions/debates`, `messages` (+5-min edit trigger), `claims` (+`origin_message_id` same-room check, anon views), `claim_votes` (stance), `evidence`+`claim_evidence`+`sources`, `questions`, `claim_relations`, `inquiry_items`/`inquiry_responses` (+RPCs), `user_saves`, moderation/flags, `discussion_*` redacting views, vote unique indexes, retracted-vote blocks.
- REQUIRED (new migrations only, no SQL here): (a) in-place conversion support (mechanism TBD in S10 + data-preservation review); (b) claim-requests entity + agg constraint + status + indexes; (c) arguments entity + claim relation + indexes; (d) reactions tables + agg; (e) deletion-lock (replace delete-block; configurable duration; server time check) + deleted-claim placeholder support (FKs SET NULL already for origin; extend for claim→evidence/args without cascade loss); (f) saved-room private alias entity (if PO confirms scope); (g) remove vote→reputation triggers + consensus bonus + retraction penalties (migration-gated + snapshot decision OPEN); (h) disable/remove evidence-vote consumers (data disposition OPEN).
- OPTIONAL: SoU maturity columns — DO NOT ADD (OPEN algorithm; keep derived only).
- OPEN: requester-list shape, alias scope, vote-row disposition, reputation backfill, config storage.
- Indexes/constraints/RLS per entity to be specified at implementation design time (not invented here beyond listing needs).

## 26. RLS / Authorization Changes
- Keep: room-access-gated reads, author-only retract/update, anon redaction via views, vote auth + retracted blocks, inquiry/debate private hardening (verify prod-apply).
- Add (new migrations): request create/read (room access), author-only Accept/Skip/Decline; argument create/read/update per room + author rules; reaction per-user upsert; deletion-lock enforced in DB function/trigger (never UI-only); alias per-user CRUD; sources-lens read via evidence visibility.
- Never weaken RLS to make UI work; UI pre-checks are defense-in-depth only.

## 27. Server Actions / API Changes
- Keep: `postMessage/updateMessage`, `createClaim/retractClaim`, `createEvidence/retractEvidence`, `createQuestion/retractQuestion`, `castClaimVote`, inquiry RPCs, moderation flag/resolve, save RPCs, paginated getters, `invalidateRoomQueries`.
- Change: REMOVE `castEvidenceVote` consumers + vote→reputation paths (migration-gated); ADD request RPCs, argument CRUD, reaction upsert, deletion-lock-guarded delete, linkifier-safe rendering (no new endpoint needed), SoU seam types.
- Validation: keep zod (`messageSchema/claimSchema/evidenceSchema/questionSchema`); add request/argument/reaction schemas at build time. Auth via Supabase `auth.uid()` server-side; no client-trusted authorship.

## 28. Component/File-Level Change Map
- `app/discussions/[slug]/page.tsx` — MODIFY: render Conversation default (not overview cards). Deps: shell/store/feed. Risk: deep-link/SEO/metadata churn.
- `features/rooms/components/room-section-shell.tsx` — MODIFY/REFACTOR: slim header, lens nav + Sources/SoU, store provider host. KEEP deep-link compat.
- `features/discussions/components/discussion-room.tsx` — REFACTOR/REPLACE (decide at build; currently dead): base for unified room or retire in favor of shell+feed. Risk: duplicate room logic.
- `comment-item.tsx` — MODIFY: add React/Request-as-Claim/More, origin/claim rendering, linkifier. KEEP threading/edit/anon/report.
- `claim-list.tsx` — MODIFY: compact card variant, remove credibility badge/tooltip/bar, stance text bottom, +Evidence/+Argument/Inquiry actions. DEPRECATE truth-bar styles.
- `extract-claim-modal.tsx` — REPLACE with in-place Accept flow (remove copy-modal as final interaction).
- `evidence-section.tsx` + room evidence lens — MODIFY: inline chronological variant, reply/react/links, remove votes.
- `question-list.tsx` — MODIFY: composer-mode reuse + terminology split.
- `state-of-understanding.tsx` + `understanding-utils.ts` — MODIFY: remove vote text/threshold, add OPEN maturity seam, evidence-led copy.
- `discussion-intelligence.tsx/health/summary/graph-view/map-tab` — DEPRECATE/DEMOTE to secondary (no deletion now).
- `room-sources-tab.tsx` — MODIFY + promote to `/sources` lens.
- `sidebar.tsx`/`mobile-nav.tsx` — MODIFY: room-local slot (new subcomponent).
- `discussion-data-provider.tsx` + `use-discussions.ts` + `discussion-service.ts` — MODIFY/EXTEND: shared store, requests/arguments/reactions/deletion APIs.
- `reputation-utils.ts`/`reputation-service.ts`/`claim-credibility-badge.tsx`/`credibility-tooltip.tsx` — MODIFY: remove vote/penalty paths (migration-gated).
- Debate `debate-room/section-nav/header` + inquiry `button/dialog/list` — REUSE with shared shell; verify side/motion slots only.
- Missing files to CREATE (names indicative, not final): unified composer, request dialog/state, argument inline/lens, sources lens route, room-local nav, linkifier util, reaction UI/hooks, deletion-lock service. No filenames fabricated as existing.

## 29. Migration Strategy
- New migrations only; never edit applied files. Order: (1) prod-state verify (esp. `202606190001`, `202606270001`, private-debate + reputation stabilization), (2) epistemic-removal migrations (vote triggers/bonus/penalties, evidence-vote disable) with snapshot/backfill decision, (3) new entities (requests/arguments/reactions/alias), (4) deletion-lock replacing delete-block, (5) view updates (redaction preserved).
- Preserve: existing vote rows (read-only unless PO approves purge), evidence/claims content, inquiry data, saves. No cascade loss; placeholders for deleted claims.
- Rollback: each migration reversible or forward-fixable; backup before trigger rewrites; feature-flag UI until DB lands (INFERENCE — flag infra NOT VERIFIED).

## 30. Implementation Phases (16 phases)
- Phase A foundation/DB: prod-verify; design requests/arguments/reactions/alias/deletion-lock; migration + RLS matrix.
- Phase B shell/routing: shared store, Conversation-default entry, compact header, room-local nav, deep-link compat.
- Phase C conversation feed: unified chronological feed, fix empty claim maps, origin links, anon/mod preserved.
- Phase D composer: unified Message/Claim/Question, lightweight claim/question.
- Phase E claims: in-place conversion, compact cards, stance text, no bar/badge.
- Phase F requests: agg state + Accept/Skip/Decline, subtle, no penalty.
- Phase G evidence+arguments: chronological nodes, relation context, reply/react/links; no evidence voting.
- Phase H questions/inquiries: split terminology, composer mode + claim actions.
- Phase I sources: `/sources` lens, dedup, clickable URLs, room-scoped.
- Phase J SoU cleanup: remove vote text/threshold, OPEN seam, evidence copy.
- Phase K epistemic/reputation cleanup: remove vote-bonus/credibility/penalties (migration-gated).
- Phase L reactions/polish: infra + subtle UI, no leaderboards; linkifier rollout.
- Phase M responsive/mobile: 375/390/834/1440 + jump-to-message/panel.
- Phase N sound/motion: subtle, disableable; no game sounds (last layer).
- Phase O legacy cleanup: demote intel/graph/map, remove dead duplication, commit winner/loser removals.
- Phase P validation/QA: tsc/lint/build/tests/browser/RLS/epistemic regression.

## 31. Dependency Graph
A → B → C → D → E → F (needs E) → G (evidence needs E; arguments needs E+DB) → H (needs D+E) → I (needs G) → J (needs E+G+H) → K (migration-gated; parallel-safe after A, UI after E–J) → L (needs C+G) → M (needs B–L) → N (last) → O (after replacement live) → P (continuous + final). Deletion-lock DB blocks E-delete UX; reactions DB blocks L; alias DB blocks S21.

## 32. Risks
Epistemic regression (vote reuse under new names); reputation score shifts; data loss on conversion/deletion rewrites; prod-migration drift; deep-link breakage; lens state duplication; anon leakage via new joins; evidence-vote row disposition; scope creep (new libs, scoring, per-room sound, version history — OPEN, do not build).

## 33. Rollback / Safety Considerations
Ship DB before UI per entity; keep old lens routes with redirects; hide new actions until RPCs land; backup before trigger changes; forward-fix preference; no destructive backfills without PO + backup; verify anon redaction after every view change.

## 34. Testing Strategy
Unit: SoU derivation (evidence-only), stance formatting, linkifier/sanitizer, request aggregation, deletion-lock window, reaction agg (no popularity). Integration: conversion, request lifecycle, evidence/argument attach + placeholder after delete, RLS negative tests (non-author, cross-room, anon). E2E (new specs): conversation-first entry, composer modes, claim lifecycle, requests, lenses + origin jump-back, SoU evidence-led, stance isolation. Do not invent tests as passing.

## 35. Browser QA Strategy
Playwright direct (`playwright.config.ts`, base `http://localhost:3000`). Extend `tests/` with room-epistemic + responsive (375/390/834/1440) + keyboard/SR specs; reuse onboarding spec patterns. If app/env unavailable, record blocker; inspection-only, no code changes for QA. Current status: NOT RUN in this planning task.

## 36. Acceptance Criteria
Conversation default; lenses share store + preserve origin/deep links; unified composer; in-place claims with compact cards + secondary stance text (no bar); aggregated requests with penalty-free subtle states; chronological evidence/arguments with relation context + reply/react/links + no evidence voting; questions/inquiries split; Sources lens; evidence-led SoU with OPEN seam + no vote text; stance isolated; no retraction penalties; 20-min server lock + placeholders; room-local current-room nav + private alias scope; shared Discussion/Debate shell; responsive/a11y QA clean; tsc/lint/build/tests green; no Winner/Loser; no new scoring.

## 37. Open Product Decisions
1. SoU maturity algorithm — OPEN (do not invent). 2. Claim minimal fields (claim_type/contextType required?) — OPEN, needs PO. 3. Requester-list shape — OPEN. 4. Evidence-vote row disposition — OPEN. 5. Reputation snapshot/backfill — OPEN impl detail. 6. Alias scope/UX — OPEN. 7. SoU route vs anchor + intel placement — OPEN UX within secondary constraint.

## 38. Explicit Non-Goals
No Evidence voting; no vote-derived truth/quality/credibility/authority/SoU; no retraction punishment; no Winner/Loser replacement; no invented SoU thresholds; no new state libs/microservices/graph DBs/AI truth; no per-room sound, version history, M2M evidence expansion, or new reputation mechanics (Spec S29 — do not build); no prod claims without verification; no source changes in this plan.

## 39. Recommended Implementation Order
A → B → C → D → E → F → G → H → I → J → K (migration-gated, start early in parallel) → L → M → N → O → P (P checks continuous). Never build request/argument/reaction/delete UI before its DB/RLS lands; never demote intel until replacement lenses live; never touch deletion triggers before backup + prod-verify.

## 40. Final Readiness Assessment
NOT READY FOR IMPLEMENTATION until: prod-migration state verified; S37 OPEN items triaged; DB designs for requests/arguments/reactions/alias/deletion-lock approved; epistemic-removal migration plan approved. After that: READY FOR CONTROLLED PHASED IMPLEMENTATION with epistemic regression gates. No code changed; plan only.

## Self-audit
Governance/spec/reconciliation + 00/01/02/03/04/05/06/08/23 read. Routes/components/DB/RLS/services/validation/layout/tests/Playwright inspected via reads + git grep (claim_request empty; reaction only onboarding copy; votes/credibility/deletion/inquiry/saves verified). Winner/Loser + deletion/immutability inspected. Only this plan file created. No decisions invented; SoU OPEN; no evidence voting; penalty-free; intel secondary; in-place; conversation-first; stance-only votes. File map + phases + DB/RLS/migration + browser QA included.








