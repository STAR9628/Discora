# Phase 7C — Discussion Room Architecture Audit
## Muse Independent Audit

Audit Date: 2026-09-09
Auditor: Muse Spark 1.3 (Independent Second Auditor)
Specification: docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md V1 (2026-09-08)
Status: IN PROGRESS — incremental save

> INDEPENDENT AUDIT — evidence grounded in authoritative docs + repository code. No implementation performed.

# Executive Summary

**Verdict: FAIL WITH CRITICAL GAPS.** Conversation-first room is not implemented (overview dashboard on entry; disconnected section pages); Request-as-Claim, Discussion Arguments, Reactions, Sources lens, unified composer, room-local nav, linkification, and deletion-lock are missing; live votes→reputation/consensus-bonus/credibility/SoU-text pipeline violates stance-only semantics with retraction penalties. SoU status logic is evidence-led (strength) but display leaks votes and invents `hasSufficientData`. 11 product decisions required; implementation NOT READY until epistemic cleanup + PO approvals + DB prerequisites. Full matrices/findings in S3–S10; validation limits in S13.


# Table of Contents
- 1. Product / Philosophy Baseline
- 2. Current Discussion Architecture
- 3. Specification Compliance Matrix
- 4. Detailed Findings
- 5. Data / Architecture Gaps
- 6. Epistemic Integrity Audit
- 7. Security / RLS Audit
- 8. Responsive / Accessibility Audit
- 9. Legacy / Dead-Code Audit
- 10. Product Decisions Required
- 11. Recommended Implementation Sequence
- 12. Files Inspected
- 13. Validation
- 14. Final Verdict

# 1. Product / Philosophy Baseline

Source hierarchy followed: Governance -> 00_MASTER_CONTEXT -> 01_PRD -> 02_FEATURE_REGISTRY -> 03_USER_FLOWS -> 04_DATABASE_DESIGN -> 05_SYSTEM_ARCHITECTURE -> 06_DESIGN_SYSTEM -> 23_KNOWLEDGE_MODEL -> DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC V1 (approved direction).

## 1.1 Core purpose (authoritative)
- Discora exists to help people have structured, meaningful discussions/debates based on evidence, reasoning, and conversation, improving understanding (Governance S2; 00 S1-S3).
- Understanding over engagement; evidence over popularity; clarity over activity; questions before conclusions; neutrality; changing mind is a feature (AGENTS.md portability/philosophy; Governance S2).
- NOT a social popularity, competition, truth-voting, or gamified debate platform (Governance S2).

## 1.2 Conversation vs structure (authoritative)
- Familiar interaction layer (WhatsApp/Telegram-like: read/send/reply/react/share links/chronological) + understanding layer (Claim -> Support/Challenge -> Evidence+Arguments -> Questions/Targeted Inquiries -> State of Understanding). Progressively revealed, not forced (Spec S2).
- 03_USER_FLOWS Room Navigation Structure: every Room contains Discussion Feed, Claims, Evidence, Sources, Questions, Pins. Feed displays Comments+Claims+Questions+Evidence in unified conversation timeline; other tabs are structured filtered views.
- 04_DATABASE_DESIGN: important information must not be trapped in comment chains; Claims/evidence/sources/questions/future consensus are first-class entities, always room-scoped.
- 23_KNOWLEDGE_MODEL: Message (chat) distinct from Claim (falsifiable, non-nested top-level); Evidence is interpretation linking Source->Evidence->Claim via claim_evidence (support/contradict/context); votes restricted to Claims+Evidence only, never Messages; consensus ratio dynamic views, null when no votes.

## 1.3 Epistemic boundaries (authoritative)
- Votes = community stance, NOT truth/correctness/evidence quality/credibility/authority/SoU/recommendation/validity (Governance short contract; Spec S8, S16).
- Consensus in 02_FEATURE_REGISTRY: shared understanding/evidence-supported conclusions; explicitly NOT truth, majority vote, forced agreement. 01_PRD MVP excludes Consensus Engine, Open Questions Engine, Knowledge Graphs, Argument Maps, Source Reliability Scoring, Expert Verification.
- Agreement metrics are informational only, do not represent authority/ranking (06 S20).
- Debate is not winner/loser competition (Governance; 00 S31: not intended to determine winners/losers). Retraction/change-of-mind must not be punished/shamed (Spec S10, S13).
- SoU is evidence/reasoning-led, room-level, emergent, separate from stance; NOT popularity/majority/vote/reputation/winner (Spec S16). Exact SoU maturity/unlocking algorithm is OPEN/NOT APPROVED and must not be invented (Spec S29).
- AI is assistive/organizational, never final determination; no permanent moderation actions (01 S14-S15).

## 1.4 Approved Discussion Room direction (Spec V1, condensed)
- ONE ROOM, Conversation default/primary; Claims/Evidence/Sources/Questions/SoU are alternate lenses over same content, not disconnected destinations (Spec S3.1).
- Room-local subsection under Discussions, current room only; collapsible; Saved on Saved, not growing global list (Spec S3.2).
- Compact header: title + Discussion label + compact actions (Spec S4).
- One familiar composer with Message (default) / Claim / Question; Evidence/Argument/Targeted Inquiry NOT top-level modes (Spec S6).
- Direct Claim creation easy, no long form; claim becomes part of conversation chronologically, compact card, Support/Challenge available (Spec S7).
- Message->Claim: author converts own message in place, no duplication (Spec S7.3 per audit brief).
- Request-as-Claim: normal message -> Request as Claim; multiple requests aggregate to ONE state; author gets Accept/Skip/Decline; Accept makes original a Claim; Skip subtle + later Add; Decline subtle, no punishment/shame/reputation loss (Spec S7.4 per audit brief).
- Claim cards compact, in-chat, chronological, examination actions (+Evidence/+Argument/Targeted Inquiry), Support/Challenge visually secondary, no consensus/progress bar as truth (Spec S8).
- Evidence attached to primary Claim (support/contradict/contextualize), chronological presence, Reply/React/clickable links/source relation, structured lens (Spec S9). evidence_votes meaning OPEN unless authoritative source resolves it.
- Arguments distinct from Evidence (reasoning connecting premises to position), required for Discussions, Claim-attached, chronological, subtle relation, not composer mode (Spec S10).
- Questions broad/topic-level; Targeted Inquiries Claim-specific; never merge; distinct entry/lifecycle/terminology (Spec S11-S12).
- Discussion Sources lens required: route/nav/list/evidence relation/clickable URLs/room scoping/dedup/security (Spec S13).
- Conversational origin must be preserved with jump-back (Spec S15).
- Claim deletion V1: 20-min deletion LOCK (cannot delete before; may after per approved behavior), configurable (future 5-min), server-side enforced (Spec S27 per audit brief). Deleted-claim relationships must remain understandable (Spec S27).
- No Winner/Loser/Draw/scorecard/competitive score/reputation authority/green-red correctness/popularity-as-truth (Spec S28).
- Responsive 375/390/834/1440, no overflow/clipping/oversized cards/headers (Spec S28).


# 2. Current Discussion Architecture

## 2.1 Route hierarchy (verified)
- `src/app/discussions/[slug]/page.tsx`: CURRENTLY renders overview/dashboard, NOT conversation. Uses `RoomSectionShell section=overview` + `DiscussionOverviewUnderstanding` + 4 section cards (Claims/Evidence/Questions & Inquiries/Contributions). Conversation/composer NOT on entry.
- `src/app/discussions/[slug]/claims/page.tsx` -> `DiscussionClaimsSection` (paginated ClaimList).
- `src/app/discussions/[slug]/evidence/page.tsx` -> `DiscussionEvidenceSection`.
- `src/app/discussions/[slug]/questions/page.tsx` -> `DiscussionQuestionsSection` (?question deep link supported).
- `src/app/discussions/[slug]/contributions/page.tsx` -> `DiscussionContributionsSection` (paginated messages + composer + extract-claim modal + report dialog; passes EMPTY claim maps, no-ops for claim navigation).
- Legacy full-room `DiscussionRoom` (`discussion-room.tsx`) still exists with Questions/Claims/Evidence/Contributions scroll sections + `SectionNav` + `DiscussionHeader` + SoU + composer, but NO route currently renders it (verified by grep of imports; only section pages + shell are routed). Classification: DEAD/DANGEROUSLY AMBIGUOUS (see S9).
- No `/sources` route. No `/state-of-understanding` route. Sources only as in-legacy-tab component `RoomSourcesTab` + bibliography derivation; not in `RoomSectionShell` nav.

## 2.2 Shell/nav/data
- `RoomSectionShell`: header card (title + premise/description + SaveButton) + `RoomGuideCard` + `beforeNav` + sticky section nav (Overview/Claims/Evidence/Discussion Questions/Contributions). No room-local sidebar subsection; no expand/collapse; no Saved-room distinction; global `Sidebar`/`MobileNav` have NO room awareness (verified).
- Data: section components use paginated hooks (`usePaginatedClaims/Evidence/Questions/Messages`) with Load More; cross-section shared state only via per-section queries, no single room store. Deep links: claims `?highlight&addEvidence`, evidence `?highlight`, questions `?question`. Browser history works via router.push, but lenses do not preserve scroll/origin context or jump back to conversation origin (see findings).
- Debate reuse: discussions import `InquiryButton/CreateDialog/List/counts` from debates feature; inquiries are claim-scoped and shared. No discussion-native argument物件; debate argument infra is debate-side-scoped, not safely generalizable without product decision.


# 3. Specification Compliance Matrix (Part A — Entry/Architecture/Nav/Header/Conversation/Composer)

| # | Area | Requirement | Current | Status | Sev | Evidence |
|---|---|---|---|---|---|---|
| 1 | Room entry | Conversation default | Overview dashboard, no composer | MISALIGNED | P0 | `app/discussions/[slug]/page.tsx:62-98` |
| 2 | Architecture | ONE ROOM lenses | Disconnected pages, no shared store | PARTIAL | P0 | `discussion-section.tsx`, `room-section-shell.tsx` |
| 3 | Room-local nav | Current-room subsection, collapsible; Saved on Saved | No room subsection; pills only | MISSING | P1 | `sidebar.tsx`, `mobile-nav.tsx` |
| 4 | Header | Compact title+label+actions | Large card + stats + guide + SoU stack | MISALIGNED | P2 | `room-section-shell.tsx:35-47`, `discussion-header.tsx` |
| 5 | Conversation | Chronological, replies, edit, mod, anon; messages stay normal | Threading/edit/report/anon OK; no msg votes (good); but not default; contributions lens strips claim ctx | PARTIAL | P1 | `comment-item.tsx`, `discussion-contributions-section.tsx:107-110` |
| 6 | Composer | Message(default)/Claim/Question; no Ev/Arg/TI modes | Message-only composer; Claim/Question separate forms; no unified composer | MISSING | P1 | `discussion-contributions-section.tsx:144-165`, `claim-list.tsx`, `question-list.tsx` |


# 3B. Compliance Matrix (Part B — Claims/Requests/Votes/Evidence/Arguments/Questions/Inquiries/Sources)

| # | Area | Requirement | Current | Status | Sev | Evidence |
|---|---|---|---|---|---|---|
| 7 | Direct Claim | Easy, chronological, compact, S/C | Long form; separate lens only | PARTIAL | P1 | `claim-list.tsx`, `createClaim` service |
| 8 | Message→Claim | In-place, no dup | Copy via `origin_message_id`, not conversion | MISALIGNED | P0 | `extract-claim-modal.tsx:63-72` |
| 9 | Request-as-Claim | Aggregated Accept/Skip/Decline | NO table/RPC/UI | MISSING | P0 | `git grep claim_request` empty |
| 10 | Claim cards | Compact, S/C secondary, no truth bar | Large cards, truth bar + badge | MISALIGNED | P1 | `claim-list.tsx:523-530,770-794` |
| 11 | S/C meaning | Stance only | Feeds reputation/bonus/credibility/SoU text | MISALIGNED | P0 | `202606100004`, `reputation-utils.ts`, `understanding-utils.ts` |
| 12 | Evidence | Claim-attached, chronological + lens | Drawer/section only, no stream presence | PARTIAL | P1 | `evidence-section.tsx` |
| 13 | Evidence votes | OPEN unless specified | Exists + reputation effects; semantics undoc | OPEN | P2 | `202606030006`, vote triggers |
| 14 | Arguments | Distinct reasoning for Discussions | NO entity/UI; only relations | MISSING | P0 | grep `argument` in discussions |
| 15 | Questions | Broad exploration + lens | List+lens OK; no composer mode/stream | PARTIAL | P2 | `question-list.tsx` |
| 16 | Inquiries | Claim-specific, split from Questions | Claim entry OK; page merges labels | PARTIAL | P1 | `claim-list.tsx:48-51`, questions page |
| 17 | Sources | Dedicated lens | NO route/nav; derived bibliography | MISSING | P1 | `room-sources-tab.tsx` unused in shell |


# 4. Detailed Findings

## Finding 1 — Room entry is overview dashboard, not Conversation

**Area:** Room entry / IA
**Severity:** P0
**Status:** MISALIGNED
**Current implementation:** `/discussions/[slug]` renders SoU + 4 section cards; no messages/composer.
**Required behavior:** Conversation default/primary.
**Repository evidence:** `src/app/discussions/[slug]/page.tsx:62-98`.
**Impact:** Breaks familiar-chat-first model; extra click to Contributions.
**Classification:** Technical implementation choice (route composition).
**Recommended direction:** Make Conversation the `[slug]` default; move overview cards/SoU to secondary placement. No doc change needed.
**Confidence:** High

## Finding 2 — Sections are disconnected pages, not lenses

**Area:** Architecture
**Severity:** P0
**Status:** PARTIAL
**Current implementation:** Separate paginated queries per section; no shared room store; no scroll/origin preservation.
**Required behavior:** ONE ROOM with alternate lenses.
**Repository evidence:** `discussion-section.tsx`, `discussion-contributions-section.tsx`, `room-section-shell.tsx`.
**Impact:** Duplicated fetching, lost context, no jump-back.
**Classification:** Technical implementation choice.
**Recommended direction:** Introduce room shell store + preserve lens state/history/scroll; keep routes as lens addresses if desired.
**Confidence:** High

## Finding 3 — No room-local nav; Saved model unverified in-room

**Area:** Navigation
**Severity:** P1
**Status:** MISSING
**Current implementation:** Global Sidebar/MobileNav lack room awareness; section pills only.
**Required behavior:** Current-room subsection, collapsible; Saved on Saved.
**Repository evidence:** `sidebar.tsx`, `mobile-nav.tsx`, `room-section-shell.tsx:54-61`.
**Impact:** Spec S3.2 unmet; room orientation weak.
**Classification:** Technical implementation choice.
**Recommended direction:** Add pathname-aware current-room subsection; do not list all saved rooms globally.
**Confidence:** High

## Finding 4 — Claim extraction is copy, not in-place conversion

**Area:** Message→Claim
**Severity:** P0
**Status:** MISALIGNED
**Current implementation:** New `claims` row copies text, links `origin_message_id`; original remains normal message with “Claimed” affordance.
**Required behavior:** Author in-place conversion without duplication.
**Repository evidence:** `extract-claim-modal.tsx:63-72`, `comment-item.tsx:218-234`, `202606030004`.
**Impact:** Dual content, confusion about canonical text; violates Spec S7.3 direction.
**Classification:** Product decision required (whether copy-with-link is acceptable vs true conversion) + technical work.
**Recommended direction:** PO must confirm conversion semantics; 23_KNOWLEDGE_MODEL currently recommends Extraction/Promotion (copy+link), which CONFLICTS with newer Spec in-place language — resolve hierarchy explicitly.
**Confidence:** High (conflict between 23 and Spec is real; see S10).

## Finding 5 — Request-as-Claim entirely absent

**Area:** Claim Requests
**Severity:** P0
**Status:** MISSING
**Current implementation:** No table/RPC/service/hook/UI.
**Required behavior:** Aggregated request + Accept/Skip/Decline, subtle, no penalty.
**Repository evidence:** `git --no-pager grep -n claim_request` empty; no request API in `discussion-service.ts`.
**Impact:** Core Spec collaboration loop missing.
**Classification:** Product decision required (schema/lifecycle/RLS) + implementation.
**Recommended direction:** Design request entity/constraints/RLS/RPCs before UI.
**Confidence:** High

## Finding 6 — Votes feed reputation/credibility/SoU text (epistemic violation)

**Area:** Epistemic integrity
**Severity:** P0
**Status:** MISALIGNED
**Current implementation:** CLAIM_AGREED+2/DISAGREED-1, EVIDENCE+3/-1, consensus bonus >60%, credibility from agree/disagree+evidence, SoU reasons include vote stance, consensus bar labeled voter agreement.
**Required behavior:** Stance only; no truth/credibility/authority/SoU/reputation.
**Repository evidence:** `202606100004:80-100,196-260+`, `reputation-utils.ts:68-120`, `understanding-utils.ts:174-183`, `claim-list.tsx:526-530,770-794`.
**Impact:** Popularity→authority/truth drift; retraction penalties compound.
**Classification:** Product decision required (reputation/credibility semantics) + technical cleanup.
**Recommended direction:** Remove vote→reputation/bonus/credibility/SoU-status paths; keep stance display visually secondary with explicit stance wording.
**Confidence:** High

## Finding 7 — Discussion Arguments missing; relations are not arguments

**Area:** Arguments
**Severity:** P0
**Status:** MISSING
**Current implementation:** Only `claim_relations` supports/contradicts/refines + graph/intelligence.
**Required behavior:** Distinct reasoning object attached to Claim, chronological, subtle relation, not composer mode.
**Repository evidence:** No `arguments` table; grep only relations/graph.
**Impact:** Spec S10 unmet; Evidence/Argument conflation risk.
**Classification:** Product decision required (entity/lifecycle/RLS) + implementation.
**Recommended direction:** Define discussion argument model separately from debate infra; do not silently generalize debate-side claims.
**Confidence:** High

## Finding 8 — Claim deletion lock missing; retraction-only is not the approved LOCK

**Area:** Deletion
**Severity:** P1
**Status:** MISALIGNED
**Current implementation:** DELETE always raises; UPDATE only retraction one-way; no time window/config.
**Required behavior:** 20-min LOCK then deletable per approved behavior, configurable, server-enforced.
**Repository evidence:** `202606030004:94-145`.
**Impact:** Cannot meet Spec S27 lifecycle; retention/placeholder design blocked.
**Classification:** Product decision required (deletion vs retraction semantics) + technical.
**Recommended direction:** PO must reconcile Spec deletion-lock with legacy immutability/retraction rule before any migration.
**Confidence:** High



# 5. Data / Architecture Gaps

| Capability | Exists? | UI | Service | DB | RLS | Missing Work | Status |
|---|---|---|---|---|---|---|---|
| Messages | Yes | CommentItem/tree/composer | post/update/get | `messages` + `discussion_messages` view | Yes (room access; 5-min edit via trigger) | Unify composer; server edit-window verify | PARTIAL |
| Claims | Yes | ClaimList/form/extract modal | create/retract/vote/list | `claims` + `discussion_claims` view | Yes | In-place vs copy decision; deletion lock | PARTIAL |
| Claim Requests | No | No | No | No | No | Entity+agg+RPC+RLS+UI | MISSING |
| Evidence | Yes | Drawer/section/form/votes | create/retract/vote | `evidence`+`claim_evidence`+`discussion_evidence` | Yes | Stream presence; reply/react; semantics | PARTIAL |
| Arguments | No | No (relations only) | No | No | No | Entity+relations+RLS+UI | MISSING |
| Questions | Yes | QuestionList/lens | create/retract/list | `questions` + view | Yes | Composer mode; stream presence | PARTIAL |
| Targeted Inquiries | Yes (shared) | Claim entry+list/dialog | Debate inquiry hooks/RPCs | `inquiry_items` et al (not fully traced) | NOT VERIFIED here | Terminology split; RLS verify | PARTIAL |
| Sources | Partial | Bibliography derivation; anchors | via evidence | `sources` via evidence | Via evidence | Route/lens/nav/dedup | MISSING |
| Votes | Yes | S/C + evidence votes | castClaim/EvidenceVote | `claim_votes`,`evidence_votes` | Yes | Remove epistemic consumers | MISALIGNED |
| Reactions | No | No | No | No | No | Table+agg+UI | MISSING |
| SoU | Yes (client) | StateOfUnderstanding | derived client-side | No table (derived) | N/A | Remove vote leakage; no invented threshold | PARTIAL |
| Deletion | Retraction only | Retract buttons | retractClaim/Ev/Q | `is_retracted`; DELETE blocked | Yes (author-only retract) | Lock/config/placeholder decision | MISALIGNED |
| Aliases | NOT VERIFIED | No | No | Unknown | Unknown | Trace alias req | NOT VERIFIED |
| Saves | Yes | SaveButton | save RPCs | `user_saves` | Yes (per Phase 5D) | In-room Saved behavior | ALIGNED |
| Replies | Yes | Nested tree | parent_message_id | `messages.parent_message_id`, no-self-reply | Yes | — | ALIGNED |

# 6. Epistemic Integrity Audit

| Signal | Origin | Consumer | Meaning | Epistemic Risk | Verdict |
|---|---|---|---|---|---|
| Support/Challenge | `claim_votes` agree/disagree | Reputation triggers, consensus bonus, credibility, SoU text, UI bar | Stance required; used as quality/authority | HIGH — popularity→truth/authority | MISALIGNED |
| Evidence votes | `evidence_votes` | Reputation, counts | Semantics undoc | MEDIUM — unspecified authority | OPEN |
| Claims | `claims` | SoU evidence grouping | Falsifiable statement for examination | LOW if votes removed | PARTIAL |
| Reputation | events + recal RPC | Profile/cards (not fully traced here) | Contribution authority | HIGH — vote/consensus/retraction-penalty inside | MISALIGNED |
| Consensus ratio | Dynamic view `agree/(agree+disagree)` | Claim bar, credibility, SoU reasons | Stance ratio required; shown as progress | MEDIUM — visual truth implicature | PARTIAL |
| SoU | client `deriveStateOfUnderstanding` | Overview/room | Evidence-led required; vote text leaks in | MEDIUM — status GOOD, display leaks | PARTIAL |
| AI analysis | — | None found in room | Assistive only | LOW | ALIGNED |
| Recommendations | homepage/ranking surfaces use votes (not traced fully) | Discovery | Must not use stance as quality | MEDIUM | NOT VERIFIED |

Adversarial red-flag sweep: votes→credibility YES (`computeCredibility`); votes→reputation YES (triggers); votes→SoU text YES (reasons); consensus→reputation YES (>60% bonus); retraction→penalty YES (-20/-15); author-reputation→claim display YES (badge on card); AI→determination NO; debate winner/loser code deleted in tree but prod-applied NOT VERIFIED.



# 7. Security / RLS Audit
PENDING

# 7. Security / RLS Audit

- Claims: RLS insert (room exists) + author-only retract; `origin_message_id` same-room validated; anon redaction via view; DELETE blocked. GOOD.
- Messages: room access + 5-min edit trigger + immutable fields. GOOD; UI countdown is cosmetic, server trigger authoritative.
- Evidence/claim_evidence/sources: RLS + same-room checks (per 202606030005/0006/0008 migrations, not fully re-read here). PARTIAL (assumed from service + view; full trigger text NOT VERIFIED in this pass).
- Votes: auth-only, retracted-blocked (service pre-check + `202606030009`), unique per user/target. GOOD; but service pre-check is defense-in-depth, RLS is primary — RLS text verified in listed migrations.
- Moderation: flag/resolve RPCs + queue view; human final. GOOD (Phase 5B work, not re-traced deeply).
- Missing entities (requests/arguments/reactions/aliases): no RLS because no tables — must be designed, not assumed.
- Pending prod migration `202606190001_security_hardening_p0_p1.sql` (revokes, self-only recal, search_path, archived-room inquiry block): file exists in repo; PROD-APPLIED NOT VERIFIED. Do not claim prod security from repo file alone.
- Key Q: “Can UI do what DB does not enforce?” — No evidence of bypass for core mutations (services use RLS views/tables + triggers). Message edit window, vote-on-retracted, claim immutability all have server rules. Request/deletion-lock flows N/A (missing).

# 8. Responsive / Accessibility Audit

NOT VERIFIED (no browser QA yet)

# 8. Responsive / Accessibility Audit

- Runtime NOT VERIFIED (no browser QA performed; no Playwright run; audit-only, read-only).
- Code signals: responsive grids (`sm:grid-cols-2`), sticky scrollable navs (`overflow-x-auto no-scrollbar`), truncation (`truncate`, `line-clamp-2`, `max-w`), large cards that may dominate 375px. Cannot assert overflow/clipping/touch/density without runtime.
- A11y signals: `aria-label` on navs, `aria-selected/controls` on SectionNav tabs, `aria-valuenow/min/max/label` on consensus bar, focus rings on tabs, semantic header/nav/main. Dialogs (`ExtractClaimModal`, `ReportDialog`, `ConfirmDialog`) lack verified focus-trap/ESC/return-focus; claim-relation context for SR NOT VERIFIED.
- Verdict: both NOT VERIFIED. Do not infer runtime success from CSS.

# 9. Legacy / Dead-Code Audit


# 9. Legacy / Dead-Code Audit

- `DiscussionRoom` + `DiscussionHeader` + `SectionNav` (legacy full-room): DEAD (no route imports) but DANGEROUSLY AMBIGUOUS — agents may restore dashboard-first room or duplicate composers. DO NOT DELETE per task; flag for PO retirement decision.
- `DiscussionIntelligence`/`DiscussionHealth`/`DiscussionSummary`/`GraphView`/`MapTab`: LIVE (imported in legacy room; SoU-adjacent). Dashboard-heavy, vote/importance-driven. Recommend secondary/optional/retire decision; DO NOT DELETE now.
- `debate-resolution.tsx` + `debate-scorecard.tsx`: DELETED in working tree (uncommitted deletions) + `202606270001` removes DB system. HISTORICAL→RETIRED if migration applied; working-tree deletions UNCOMMITTED — must be committed separately, not by this audit.
- `handle_debate_resolve` + `trg_reputation_debate_resolve`: HISTORICAL in old migration; dropped in `202606270001`. LIVE status depends on prod-apply — NOT VERIFIED.
- `RoomSourcesTab`: LIVE code, DEAD in nav (not in shell). Keep for Sources lens implementation.
- Old terminology (`Claims/Evidence Bank/Contributions` vs Spec lenses incl. Sources/SoU): DANGEROUSLY AMBIGUOUS — nav labels diverge from Spec.
- No deletion; classification only.

# 10. Product Decisions Required


# 10. Product Decisions Required

| Decision | Why Product-Level | Current State | Recommendation | Approval? |
|---|---|---|---|---|
| SoU maturity/unlocking algorithm | Changes SoU meaning (known OPEN) | `hasSufficientData=any content` invented | Remove invented rule; keep binary empty vs content until PO approves | YES — PO must approve |
| Message→Claim: copy+link vs in-place | Changes capability/duplication/origin | Copy+link live; Spec says in-place; 23 says copy | PO resolves hierarchy; do not implement until decided | YES |
| Request-as-Claim schema/lifecycle | New capability + epistemic meaning | Absent | Design agg/Accept-Skip-Decline/RLS first | YES |
| Discussion Argument entity | New capability; Ev/Arg boundary | Absent (relations only) | Define separately; no silent debate reuse | YES |
| Votes→reputation/credibility/consensus-bonus | Changes truth/authority meaning | Live violation | Remove paths; redefine reputation without votes | YES |
| Evidence-vote semantics | Undefined voting meaning | Live with reputation effects | PO defines or removes effects; default OPEN | YES |
| Retraction penalties (-20/-15) | Punishes change-of-mind | Live triggers + client weights | Remove unless PO explicitly approves penalty | YES |
| Claim deletion vs retraction-only | Changes lifecycle/retention | Retraction-only vs Spec 20-min lock | PO reconciles; new migration only after | YES |
| Intelligence/Health/Graph role | Primary vs secondary vs retired | Heavy, vote-driven | PO sets primary/secondary/optional/retired | YES |
| Sources lens scope | New lens + dedup/security | Derived only | Approve route/nav/dedup rules | YES |
| Reactions scope | New signal; leaderboard risk | Absent | Approve storage/agg/display guards | YES |

# 11. Recommended Implementation Sequence


# 11. Recommended Implementation Sequence

1. Epistemic cleanup decisions (PO): vote→reputation/bonus/credibility, retraction penalties, SoU vote text, consensus-bar wording.
2. Database prerequisites (NEW migrations only): requests, arguments, deletion-lock/placeholder, reactions, sources-lens needs, alias trace.
3. Room shell: Conversation default route, shared store, room-local nav, compact header.
4. Conversation: unify thread rendering (fix contributions-lens empty maps), keep anon/mod/edit.
5. Composer: unified Message(default)/Claim/Question; Ev/Arg/TI excluded.
6. Claims: direct creation + conversion semantics per PO; compact cards; S/C secondary.
7. Claim Requests: agg + Accept/Skip/Decline + RLS.
8. Evidence: stream presence + reply/react/links + lens; resolve vote semantics.
9. Arguments: entity + Claim attach + lens.
10. Questions/Inquiries: split terminology; separate lenses/lifecycle.
11. Lenses: state/history/scroll/origin/panel/jump-to-message.
12. SoU: evidence-led display; remove invented threshold until approved.
13. Links: linkifier + sanitization + wrapping.
14. Reactions: infra + non-popularity guards.
15. Sound/animation: keep subtle; no victory sounds.
16. Responsive/a11y: runtime QA at 375/390/834/1440 + keyboard/SR.
17. Validation: tsc/lint/build/tests; record pre-existing vs new.

# 12. Files Inspected


# 12. Files Inspected

Docs: GOVERNANCE, 00_MASTER_CONTEXT, 01_PRD, 02_FEATURE_REGISTRY, 03_USER_FLOWS, 04_DATABASE_DESIGN, 05_SYSTEM_ARCHITECTURE, 06_DESIGN_SYSTEM, 08_ROADMAP, 23_KNOWLEDGE_MODEL, DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC V1.
Routes: `app/discussions/[slug]/page.tsx`, `claims/evidence/questions/contributions/page.tsx`.
Components: `discussion-room.tsx`, `comment-item.tsx`, `claim-list.tsx`, `extract-claim-modal.tsx`, `evidence-section.tsx`, `question-list.tsx`, `discussion-section.tsx`, `discussion-contributions-section.tsx`, `discussion-data-provider.tsx`, `room-section-shell.tsx`, `section-nav.tsx`, `discussion-header.tsx`, `discussion-overview-understanding.tsx`, `state-of-understanding.tsx`, `understanding-utils.ts`, `discussion-intelligence.tsx`, `room-sources-tab.tsx`, `claim-credibility-badge.tsx`.
Services/hooks: `discussion-service.ts` (create/vote/retract/list), `use-discussions.ts`, `reputation-service.ts`, `reputation-utils.ts`.
Migrations: `202606030004_create_claims.sql`, `202606100004_create_reputation_events.sql`, `202606270001_remove_winner_loser_system.sql`, plus grep catalog of votes/evidence/RLS/security-hardening.
Layout: `sidebar.tsx`, `mobile-nav.tsx`.

# 13. Validation


# 13. Validation

- `git --no-pager diff --name-only` + `diff --stat`: large uncommitted working tree (46 files; winner/loser deletions uncommitted). Audit did NOT modify source; only created/updated this report.
- `git --no-pager grep`: claim_request empty; reaction only onboarding copy; origin_message_id validated; votes/reputation/credibility paths confirmed.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, tests: NOT RUN (audit-only; no state-changing commands per task).
- Browser QA: NOT PERFORMED (no runtime inspection). Responsive/a11y remain NOT VERIFIED.
- No implementation, migration, RLS, config, or doc-authority changes made.

# 14. Final Verdict

**FAIL WITH CRITICAL GAPS**

- P0: 7 (entry, architecture, extraction, requests, S/C→reputation, arguments, SoU/reputation core)
- P1: 11 (nav, conversation, composer, direct-claim, cards, evidence, inquiries, sources, lenses, origin, deletion, RLS/anon parts)
- P2: 7 (header, evidence-votes OPEN, questions, links, reactions, responsive/build NOT VERIFIED)
- P3: 3 (deleted-relations OPEN, sound ALIGNED, a11y NOT VERIFIED)
- NOT VERIFIED: responsive, a11y, build/lint/types, prod-migration-applied, alias, recommendation consumers, inquiry RLS depth.
- Strongest aligned: no message votes; anon redaction on core views; evidence Claim-attach; inquiry claim entry; no sound/victory; winner/loser code deletions in tree.
- Strongest gaps: conversation-not-default; disconnected lenses; request/argument/reaction/sources-lens absent; vote→authority pipeline live.
- Strongest epistemic risks: votes→reputation/consensus-bonus/credibility/SoU-text; retraction penalties; consensus-bar truth implicature.
- Product decisions required: 11 (see S10). Do not implement until PO resolves.
- Implementation readiness: NOT READY. Epistemic cleanup + PO decisions + DB prerequisites must precede room rebuild.


