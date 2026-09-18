# Phase 7C — Discussion Room Architecture Audit

**Audit Date:** 2026-09-09
**Auditor:** Cline (autonomous audit agent)
**Specification:** `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (Approved Direction, V1, 2026-09-08)
**Status:** AUDIT ONLY — NO IMPLEMENTATION

---

# Executive Summary

**Overall Verdict: FAIL WITH CRITICAL GAPS** (implementation-readiness against `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md`; audit-only, nothing implemented).

**Aligned areas (verified, not assumed):**
- **State of Understanding is evidence-led** — `deriveStateOfUnderstanding` classifies claims solely by evidence direction counts; Support/Challenge votes never influence SoU (only descriptive text). SoU is the strongest spec-compliant surface.
- **Structured data model is solid** — claims (immutability triggers, origin_message_id, question links), evidence (`claim_evidence.direction` support/contradict/context, same-room DB validation), sources (`get_or_create_source` RPC, room-scoped dedup), questions, claim-scoped inquiries with lifecycle RPCs, all behind RLS + anonymity-redacting views.
- **Winner/Loser fully removed** (migration `202606270001`; resolution/scorecard components deleted).
- **Support/Challenge UI is stance-shaped** (Support/Challenge counts, calm colors, no green/red truth encoding on messages).
- **Saves are private** (`user_saves` RLS; `/saved` page; saved rooms correctly absent from sidebar).
- Sections are deep-linkable with per-section pagination and highlight params.

**Critical gaps:**
1. **Conversation-first IA absent (P0)** — `/discussions/[slug]` is an overview/dashboard of cards; no conversation route, no composer at room entry; legacy chat implementation is dead code.
2. **Claim Requests missing entirely (P0)** — no table/RPC/UI; "Create Claim" currently lets any user claim anyone's message without consent, no aggregation, no Accept/Skip/Decline.
3. **Votes are epistemically load-bearing (P0)** — Support/Challenge votes feed a per-claim "credibility" badge (`computeCredibility` → `supportRatio`) and author reputation (`CLAIM_AGREED +2 / CLAIM_DISAGREED −1` triggers, consensus bonus in `recalculate_user_reputation`) — direct violations of spec §23.4/§26.7.
4. **Claim deletion model conflicts (P1)** — DB forbids all deletion; UI offers immediate one-way retraction with a −20 reputation penalty; no 20-minute deletion lock, no server-side timer, no configurability.
5. **Missing lenses/objects (P1)** — no Arguments for discussions, no Sources lens route (component exists, debate-only), no SoU lens/tab, no room-local sidebar subsection, no Message/Claim/Question composer modes, no in-place claim conversion, no linkification, no reactions, no evidence-in-conversation presence, no conversation-origin backlinks in structured lenses, no personal room aliases.

**Highest-risk architecture problems:** the room is structured-content-first instead of conversation-first (Finding 1), and the vote pipeline touches credibility + reputation (Finding 3) — both require product-level correction before new room UX is layered on top.

**Epistemic risks:** vote→credibility badge; vote→author reputation triggers + consensus bonus; −20 retraction penalty (punishes mind-changing); unspecified evidence voting. SoU itself needs no epistemic remediation — only relocation behind a lens. `hasSufficientData` is a trivial pre-existing gate (OPEN decision, not a violation).

**Build/QA status:** `npx tsc --noEmit` — 1 pre-existing error (`showReputation` in `src/app/u/[username]/page.tsx`, part of the pre-existing uncommitted working tree; audit touched no source). `npm run lint` — 0 errors, 9 pre-existing warnings. Production build — NOT RUN. Browser/responsive QA — NOT PERFORMED (no server/Playwright started). Database inspected statically via migration files; production migration state unknown.

**Open product decisions (§8):** exact SoU maturity algorithm (explicitly OPEN in spec — none invented here); fate of evidence voting; claim retraction penalty removal; reactions visual treatment. All other gaps are technical implementation choices under the approved spec.

# 1. Product/Architecture Baseline

**Authority hierarchy (verified):**
1. Discora Philosophy (`docs/00_MASTER_CONTEXT.md` and philosophy docs) — understanding over engagement, evidence over popularity, no winner/loser, no gamification, no popularity-as-truth.
2. `docs/00_MASTER_CONTEXT.md` — claims/evidence/sources/questions as first-class entities; avoid storing critical knowledge only in comment chains; transparency; independent modules.
3. Approved product decisions — including the 2026-06-27 migration `202606270001_remove_winner_loser_system.sql` (retired Winner/Loser system) and the approved Discussion Room UX spec.
4. `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (V1, 2026-09-08, APPROVED DIRECTION) — the audit target spec.
5. Current implementation — audited below, NOT automatically authoritative.

**Core approved product model (spec §2, §30):**
Conversation → Claim → Support/Challenge → Evidence + Arguments → Questions / Targeted Inquiries → SoU.
- A normal message is NOT automatically an epistemic object.
- Conversation is default; Claims/Evidence/Sources/Questions/SoU are lenses over the same room.
- Support/Challenge = community stance only; votes MUST NOT feed SoU.
- Claim deletion = 20-minute deletion lock (server-enforced, configurable).
- No winner/loser/draw, no vote-driven truth, no reputation-on-claims, no forced Claim creation.

**Key spec sections audited against:** §3 IA, §4 header, §5 conversation, §6 claims + claim requests, §7 support/challenge, §8 evidence, §10 arguments, §12–13 questions vs inquiries, §14 composer, §15–16 lenses, §17 deletion, §19 SoU, §20 sounds, §24 data, §26 anti-patterns, §29 open items.

# 2. Current Discussion Architecture

## 2.1 Routing — verified

| Route | File | Actual behavior |
|---|---|---|
| `/discussions` | `src/app/discussions/page.tsx` + `discussion-feed.tsx` | Feed listing (keyset pagination). |
| `/discussions/create` | `create/page.tsx` + `create-discussion-form.tsx` | Create form; middleware-guarded. |
| `/discussions/[slug]` | `src/app/discussions/[slug]/page.tsx` | Server component. Redirects debate room types to `/debates/{slug}`. Renders `RoomSectionShell section="overview"`: room-type badge, 2xl/3xl title, premise/description paragraph, `SaveButton`, `RoomGuideCard`, `DiscussionOverviewUnderstanding` (SoU), then 4 section cards (Claims / Evidence / Questions & Inquiries / Contributions). **No conversation view and no composer on this page.** |
| `/discussions/[slug]/claims` | `claims/page.tsx` | Separate route; `RoomSectionShell section="claims"` + `DiscussionClaimsSection` (paginated `ClaimList`; deep-link `?highlight`, `?addEvidence=true`). |
| `/discussions/[slug]/evidence` | `evidence/page.tsx` | Separate route + `DiscussionEvidenceSection` (paginated, highlight param). |
| `/discussions/[slug]/questions` | `questions/page.tsx` | Separate route + `DiscussionQuestionsSection` (`?question={id}` detail state, scroll-into-view, claims answering list). |
| `/discussions/[slug]/contributions` | `contributions/page.tsx` | Separate route + `DiscussionContributionsSection` (threaded message feed). |

**Architecture type: A — disconnected section pages**, not lenses over one shared client room. Each route re-fetches via `getDiscussionBySlug` + paginated hooks. There is **no `/discussions/[slug]/conversation` route** and no conversation-first default. The overview page is card/dashboard-shaped (spec §26 anti-patterns #1/#2 territory), though sections are deep-linkable via `RoomSectionShell` sticky nav.

**Legacy dead code:** `src/features/discussions/components/discussion-room.tsx` (`DiscussionRoom`, `DiscussionDataProvider`, `SectionNav`, `DiscussionHeader`, `OpeningPremise`) is **not imported by any route** (search for `components/discussion-room"` imports: zero results; `COMPONENT_OWNERSHIP_MAP.md` / `DEBATE_UX_AUDIT.md` are historical docs). It contains a questions→claims→evidence→contributions one-document layout with an in-page composer and is the closest thing to a conversation-first implementation but is orphaned.

## 2.2 Room shell & navigation — verified

- `src/features/rooms/components/room-section-shell.tsx` (`RoomSectionShell`): large header card (title `text-2xl md:text-3xl`, roomType badge, premise/description paragraph), `RoomGuideCard`, optional `beforeNav`, sticky horizontal tab nav: Overview / Claims (discussions) / Arguments (debates) / Evidence / Questions ("Discussion Questions" / "Structured Inquiries") / Contributions. **No Sources tab, no SoU tab, no Conversation tab** (Contributions is chat-like but a separate route, not default).
- `section-nav.tsx` (`SectionNav`) is used only inside the legacy dead `discussion-room.tsx` (scroll-spy tabs).
- `src/components/layout/sidebar.tsx`: global sidebar has Home / Discussions / Search / Debates / Saved / Profile / Settings / Moderation. **No room-local "CURRENT DISCUSSION" subsection** (spec §3.2) and no personal-alias support. Room section navigation exists only via in-page `RoomSectionShell` tabs.

## 2.3 Data provider (legacy path)

`discussion-data-provider.tsx` (used only by dead `DiscussionRoom`): loads messages, claims, room evidence, questions, claim relations; computes `messageToClaimMap`, `claimQuestionMap`, `messageEvidenceMap`, `claimedMessageIds`. Confirms claim↔message linkage (`claims.origin_message_id`) exists in data.

## 2.4 Pagination / deep-linking — verified

- Claims/Evidence/Questions sections: `usePaginated*` hooks, page size 15, "Load more" (`discussion-section.tsx`, `DEFAULT_PAGE_SIZE = 15`).
- Deep links: claims (`?highlight=`, `?addEvidence=true`), questions (`?question=`), evidence (`?highlight=`). Contributions route has no highlight param.
- Browser history: real URL navigation between sections (server round-trips), consistent but not a single-room lens; no desktop detail-panel / mobile jump-to-conversation behavior (spec §16).

## 2.5 Shared Debate architecture

- Debates (`src/features/debates/components/debate-room.tsx`) share `CommentItem`, `RoomEvidenceTab`, `RoomSourcesTab`, `buildCommentTree`, inquiry hooks (`useInquiryCountsForRoom`). Debate section routes reuse `RoomSectionShell` + `DebateRoom initialSection=...`.
- Debate arguments (`debate_arguments`) are debate-specific; discussions have **no Argument support** (only claim↔claim relations supports/contradicts/refines via `claim_relations`).

# 3. Specification Compliance Matrix

Legend — Status: ALIGNED / PARTIAL / MISALIGNED / MISSING / OPEN / NOT VERIFIED. Severity: P0 (blocks approved direction) … P3 (polish).

| # | Area | Required (spec) | Current implementation | Status | Severity |
|---|------|-----------------|------------------------|--------|----------|
| 1 | Conversation default (§3.1) | Entering room opens Conversation | `/discussions/[slug]` renders overview card page; no conversation route/view; no composer | MISALIGNED | P0 |
| 2 | Lenses over one room (§3.1, §15) | Lenses over same room content | Disconnected section routes; each re-fetches independently | PARTIAL | P1 |
| 3 | Room-local sidebar subsection (§3.2) | Expandable CURRENT DISCUSSION block in sidebar while inside room | Absent (`sidebar.tsx` has flat items only) | MISSING | P1 |
| 4 | Saved rooms on Saved page (§3.3) | Saved rooms not in global sidebar | `/saved` route + Saved nav item; no per-room sidebar entries | ALIGNED | — |
| 5 | Personal room alias (§3.4) | Private alias per user | No alias support (`user_saves` has no alias column; no rename UI) | MISSING | P2 |
| 6 | Compact header (§4) | Title + "Discussion" + compact actions | Large header card: badge, 2xl/3xl title, premise/description, guide card, SoU before nav | MISALIGNED | P2 |
| 7 | Chronological chat (§5.1) | Primary chronological chat | Contributions route is threaded ascending feed — but not default and not chat-like on room entry | PARTIAL | P1 |
| 8 | Normal messages stay normal (§5.2) | No auto epistemic labeling | `CommentItem` renders plain messages; no scores/badges on messages | ALIGNED | — |
| 9 | Message actions (§5.3) | Reply, React, Request as Claim, More | Reply, Create Claim (any user), Report, Edit (5-min); no React; no Request as Claim | PARTIAL | P1 |
| 10 | Clickable links (§5.4) | Links clickable in messages/claims/evidence/sources | No linkification in message/claim/evidence body text; only explicit source URLs are anchors | MISALIGNED | P1 |
| 11 | Composer modes (§14) | Message / Claim / Question, Message default | Message-only composer at bottom of Contributions; Claim form lives in Claims lens; Question form in Questions lens | MISALIGNED | P1 |
| 12 | Direct Claim creation (§6.2) | Easy claim creation | `ClaimList` inline form (25–500 chars, advanced optional) + `ExtractClaimModal` | PARTIAL | P2 |
| 13 | In-place message→Claim conversion (§6.2) | Author converts own message in place, no duplicates | Any user's "Create Claim" → creates NEW claim linked by `origin_message_id`; message stays; toast says "Switch to the Claims tab" | MISALIGNED | P1 |
| 14 | Claim Requests (§6.3) | Request as Claim; aggregated state; Accept/Skip/Decline | Entirely absent — no table, RPC, service, hook, or UI | MISSING | P0 |
| 15 | Claim card compact + chronological (§6.4) | Compact card, in-conversation, not full-width | Full-width `article` cards, separate lens only; never in conversation | MISALIGNED | P1 |
| 16 | Support/Challenge = stance only (§7, §23) | Community stance, no truth/authority | UI Support/Challenge counts + "% of voters" bar — but votes also feed credibility badge and author reputation (see §6) | MISALIGNED | P0 |
| 17 | Votes not in SoU (§19.2) | Mandatory | `deriveStateOfUnderstanding` uses evidence direction only; votes descriptive in status strings | ALIGNED | — |
| 18 | Evidence claim relationship explicit (§8) | Mandatory claim link + direction | `claim_evidence.claim_id` + `direction` (support/contradict/context); DB-enforced same-room | ALIGNED | — |


| 19 | Evidence in Conversation, replyable (§8.6) | Chronological presence, Reply/React | Evidence only inside per-claim drawer in Claims lens; no replies; has its own voting | MISALIGNED | P1 |
| 20 | Arguments for Discussions (§10) | Claim-attached supporting/challenging arguments | No discussion arguments; only claim↔claim `claim_relations` (supports/contradicts/refines); `debate_arguments` is debate-only | MISSING | P1 |
| 21 | Questions direct mode + lens (§13) | Composer mode + Questions lens | Questions lens exists with its own form; not a composer mode | PARTIAL | P2 |
| 22 | Targeted Inquiries on Claims (§12) | Contextual to claim; distinct from Questions | `InquiryButton`/`InquiryCreateDialog`/`InquiryList` on discussion claims (shared debates feature); claim-scoped `inquiry_items` | ALIGNED | — |
| 23 | Sources lens (§15.3) | Room Sources lens with clickable links | `RoomSourcesTab` component exists (clickable URLs) but used only by debates; no `/discussions/[slug]/sources` route or tab | MISSING | P1 |
| 24 | SoU lens (§15.5) | SoU lens when mature | SoU rendered on overview page only (`DiscussionOverviewUnderstanding`); no tab/route | PARTIAL | P2 |
| 25 | Claim deletion lock (§17.2–17.4) | 20-min deletion lock, server-enforced, configurable | DB trigger `prevent_claim_deletion` blocks ALL deletion; UI offers one-way Retraction; −20 reputation event; no timer, no config | MISALIGNED | P1 |
| 26 | Deleted-Claim fallback (§17.5) | "Previously attached to a deleted Claim" | Not reachable today (deletion impossible; retracted claims remain visible dimmed, evidence stays attached) | OPEN | P3 |
| 27 | SoU evidence-led (§19) | Evidence/reasoning-led, not popularity | Evidence-count-based classification; community stance only in descriptive text | ALIGNED | — |
| 28 | SoU maturity algorithm (§19.4) | OPEN — no invented thresholds | Existing `hasSufficientData = any claim OR evidence OR question` (trivially permissive; pre-existing implementation) | OPEN | P3 |
| 29 | No Winner/Loser/Draw (§18, §23.5) | Prohibited | Removed: `202606270001_remove_winner_loser_system.sql`; `debate-resolution.tsx`/`debate-scorecard.tsx` deleted | ALIGNED | — |
| 30 | No vote-driven credibility / reputation-on-claims (§26.7, §23.4) | Prohibited | `ClaimCredibilityBadge` + `computeCredibility` (supportRatio from votes); DB triggers `CLAIM_AGREED +2 / CLAIM_DISAGREED −1`; `recalculate_user_reputation` consensus bonus | MISALIGNED | P0 |
| 31 | Sounds & animation (§20) | Subtle entrance animations/sounds + Chat Sounds On/Off | CSS `animate-in` transitions only; zero audio infrastructure; no toggle | MISSING | P3 |
| 32 | Conversation-origin preservation (§16) | Structured views never lose conversation origin | Claims lens shows no link back to origin message; message→claim link exists only in Contributions route maps | MISALIGNED | P1 |
| 33 | Responsive QA (§21) | 375/390/834/1440 checks | NOT VERIFIED this audit (no browser QA run) | NOT VERIFIED | — |

**Counts:** ALIGNED 7 · PARTIAL 7 · MISALIGNED 11 · MISSING 6 · OPEN 2 · NOT VERIFIED 1.
**Severity:** P0 ×4 · P1 ×10 · P2 ×6 · P3 ×3 (+1 NOT VERIFIED).


# 4. Detailed Findings

## Finding 1 — Conversation is not the default room experience

**Area:** Room IA (spec §3.1, §5.1)
**Severity:** P0
**Current implementation:** `src/app/discussions/[slug]/page.tsx` (lines 35–99) renders `RoomSectionShell section="overview"` containing a header card, `RoomGuideCard`, `DiscussionOverviewUnderstanding` (SoU), and 4 link cards to `/claims`, `/evidence`, `/questions`, `/contributions`. There is no conversation view, no message list, and no composer at the canonical room URL. The chat-style feed exists only at `/discussions/[slug]/contributions` (`discussion-contributions-section.tsx`).
**Required behavior:** Entering a Discussion opens the Conversation (chronological chat with composer) as the primary view; Claims/Evidence/Sources/Questions/SoU are lenses over the same room.
**Evidence:** Files cited above; `RoomSectionShell` (`src/features/rooms/components/room-section-shell.tsx` lines 25–31) defines sections overview/claims|arguments/evidence/questions/contributions — no Conversation entry.
**Impact:** The approved "familiar group chat" interaction layer does not exist; the room reads as a dashboard (spec §26 anti-patterns #1/#2).
**Recommended direction:** Make Conversation the room default (route or shell default), reuse the existing chat feed + composer as the primary surface; demote overview content.


## Finding 2 — Claim Requests do not exist

**Area:** Claims / message actions (spec §6.3, §24)
**Severity:** P0
**Current implementation:** Zero occurrences of any claim-request concept in `src/` or `supabase/migrations/` (search `claim_request|claimRequest|claim-requests` — no results). Closest behavior: `CommentItem` "Create Claim" (any logged-in user, any message) opens `ExtractClaimModal`, which immediately creates a Claim.
**Required behavior:** Any user may request a message be claimed; requests aggregate into ONE state per message with requester count; author chooses Accept (becomes Claim) / Skip (subtle status + subtle Add as Claim) / Decline (subtle status, no penalty, no reputation effect).
**Evidence:** `comment-item.tsx` lines ~266–276; `extract-claim-modal.tsx` lines 60–81 (immediate creation, no ownership check, no request flow).
**Impact:** Approved interaction unimplementable without a new data model; current flow lets any user claim anyone's message without consent.
**Recommended direction:** New `claim_requests` table (target message, requester, state, timestamps) + aggregation + author decision surface; replace "Create Claim" on others' messages with "Request as Claim".

## Finding 3 — Support/Challenge votes feed claim credibility and author reputation

**Area:** Epistemic guardrails (spec §7, §23.4, §26.7)
**Severity:** P0
**Current implementation:** Three vote-consumption paths verified:
1. **UI claim credibility:** `claim-list.tsx` lines 523–532 render `ClaimCredibilityBadge` via `computeCredibility(claim, evidenceForClaim)`; `src/features/reputation/reputation-utils.ts` lines 89–112 compute `supportRatio = agree/total` and `supportScore = supportRatio * 3` into a high/medium/low credibility label (`claim-credibility-badge.tsx`).
2. **Author reputation from votes:** `supabase/migrations/202606100004_create_reputation_events.sql` lines 196–247 — `handle_claim_vote_insert` / `handle_claim_vote_delete` create `CLAIM_AGREED (+2)` / `CLAIM_DISAGREED (−1)` events for the claim author; `202606100005_reputation_stabilization.sql` extends to vote switching.
3. **Consensus bonus:** `recalculate_user_reputation` (re-defined in `202606190001_security_hardening_p0_p1.sql` lines 92–135) adds `v_consensus_bonus` from per-claim `consensus_ratio` into the user score.
**Required behavior:** Support/Challenge records community stance only; popularity must not determine truth/correctness/evidence quality/authority/credibility; no reputation-based claim credibility.
**Impact:** Votes are epistemically load-bearing (credibility label on claims; author score). SoU itself is clean, but the credibility badge reads as truth-signaling beside stance counts.
**Recommended direction:** Remove vote terms from `computeCredibility` or retire the badge; remove vote→reputation triggers and consensus bonus. No SoU change needed.

## Finding 4 — Claim deletion model conflicts with the 20-minute deletion lock

**Area:** Claim lifecycle (spec §17)
**Severity:** P1
**Current implementation:** `supabase/migrations/202606030004_create_claims.sql` lines 129–145: trigger `prevent_claim_deletion` — "Claims cannot be deleted. Retraction is the only permitted action." Claims are immutable except one-way retraction (lines 94–127). UI: `claim-list.tsx` lines 542–550 offer "Retract" to the author immediately (no time gate). `202606100004` lines 176–194: retraction fires `CLAIM_RETRACTED (−20)` reputation event. No timer, no server-side eligibility check, no configurable duration.
**Required behavior:** V1 20-minute deletion LOCK (cannot delete before 20 min; can delete after; configurable; server-enforced; not an expiration).
**Impact:** Deletion impossible as-is; one-way retraction with −20 reputation punishes removing one's own claim — contradicts "changing one's mind is a feature".
**Recommended direction:** New migration replacing `prevent_claim_deletion` with `created_at + configurable lock` enforcement; revisit the −20 retraction penalty.

## Finding 5 — No Arguments entity for Discussions

**Area:** Arguments (spec §10)
**Severity:** P1
**Current implementation:** Discussions have no Argument concept. Debate-only: `debate_arguments` (migration `202606110001` era) + `debate-argument-list.tsx`. Discussions instead offer claim↔claim relations (`claim_relations`: supports/contradicts/refines, `claim-relation-dialog.tsx`, `ClaimList` "Relate:" quick actions lines 627–640).
**Required behavior:** Claim-attached Arguments with supporting/challenging relationship, chronological, replyable, subtle Claim identification, NOT a composer mode.
**Impact:** The approved Conversation→Claim→Evidence+Arguments chain is half-built for discussions; reasoning that isn't source-citable has no home.
**Recommended direction:** Evaluate generalizing `debate_arguments` (drop `side`, add `relationship: supporting|challenging`) or reusing `claim_relations`-style table with free-text reasoning; technical implementation choice, no new product decision needed since the spec already approves discussion arguments.

## Finding 6 — No room-local sidebar navigation

**Area:** Navigation (spec §3.2–3.3)
**Severity:** P1
**Current implementation:** `src/components/layout/sidebar.tsx` is a flat list (Home/Discussions/Search/Debates/Saved/Profile/Settings/Moderation). No "CURRENT DISCUSSION" subsection exists; `mobile-nav.tsx` likewise. Room-local navigation exists only via `RoomSectionShell`'s in-page sticky tabs.
**Required behavior:** Expandable/collapsible room subsection under Discussions visible only while inside the room.
**Impact:** Users lose room-local wayfinding when scrolling/outside shell; spec's navigation model absent.
**Recommended direction:** Add pathname-aware room subsection to sidebar (and consider mobile), collapsible, hidden on leave.

## Finding 7 — Sources lens missing for Discussions

**Area:** Sources (spec §15.3)
**Severity:** P1
**Current implementation:** `src/features/discussions/components/room-sources-tab.tsx` (`RoomSourcesTab`) builds a room bibliography from evidence sources with clickable `target="_blank" rel="noopener noreferrer"` URLs and citation counts — but it is imported only by debates (historical docs) and no discussion route mounts it. `RoomSectionShell` has no Sources entry; no `/discussions/[slug]/sources` route. In discussions, sources surface only inside per-claim evidence cards (`evidence-section.tsx` lines 440–458, clickable source link) via `get_or_create_source` RPC (`discussion-service.ts` lines 913–921; migration `202606030008`).
**Required behavior:** Room Sources lens; sources associated with room material; clickable URLs; relationship to Evidence visible.
**Impact:** Approved lens unreachable in discussions despite existing backend (`sources` table, room-scoped dedup) and a ready component.
**Recommended direction:** Mount `RoomSourcesTab` as a Sources lens (route/tab) for discussions; show evidence linkage per source.

## Finding 8 — Composer lacks Message/Claim/Question modes

**Area:** Composer (spec §14)
**Severity:** P1
**Current implementation:** `discussion-contributions-section.tsx` lines 144–165: message-only composer (textarea + anonymous checkbox + "Post contribution") at the bottom of the Contributions route. Claim creation lives in the Claims lens form; question creation lives in the Questions lens form (`question-list.tsx` line ~124 "Ask a Question Form"). No unified composer with mode switch; no `＋` attachments row.
**Required behavior:** Single simple composer with Message (default) / Claim / Question modes; Evidence/Argument/Targeted Inquiry initiated from Claims, not the composer.
**Impact:** Structured creation is discoverable only by visiting separate lenses; conversation-first flow broken.
**Recommended direction:** Consolidate a mode-switching composer on the conversation surface; keep Claim/Question payloads pointing at existing services (`createClaim`, `createQuestion`).

## Finding 9 — Message→Claim conversion is not in-place

**Area:** Claims (spec §6.2)
**Severity:** P1
**Current implementation:** `extract-claim-modal.tsx` creates a NEW `claims` row with `origin_message_id = message.id`; the original message remains unchanged in the conversation; success toast says "Switch to the Claims tab to view it." No in-place transformation, no message-type change (`messages.message_type` supports 'message'|'question'|'system' only — no 'claim'), no claim rendering inside the conversation. Conversely, `ClaimList` claim cards do not render their origin message or link back to it (`originMessageId` exists in `DiscussionClaim` type but is unused in `claim-list.tsx` UI).
**Required behavior:** Author converts own message into a Claim in place; no duplicate conversational content; Claim appears chronologically as a compact card slightly larger than a message bubble.
**Evidence:** `extract-claim-modal.tsx` lines 63–77; `discussion-service.ts` `DbClaimRow.origin_message_id`; `messages` constraint `messages_message_type_check` (migration `202606030003` line 78, extended `202606110001` line 58).
**Impact:** Conversation and Claims layer are visually disconnected; duplication risk (message text + claim text); conversion not visible in chat flow.
**Recommended direction:** Render claims in the conversation via `origin_message_id` linkage (or message_type evolution — technical choice); add origin-message backlinks in the Claims lens.

## Finding 10 — No clickable links in message/claim/evidence body text

**Area:** Links (spec §5.4, §20-era QA)
**Severity:** P1
**Current implementation:** No linkification utility exists in the repo (search `linkify|autoLink|renderContentWithLinks` — no results). Message content rendered as plain text (`comment-item.tsx`), claim content as plain `<p>` (`claim-list.tsx` line 582), evidence content as plain `<p>` (`evidence-section.tsx` line 436). Only explicit structured source URLs are anchors (`evidence-section.tsx` lines 445–453; `room-sources-tab.tsx` lines 96–101, both safe `rel="noopener noreferrer"`).
**Required behavior:** URLs typed into messages, Claims, Evidence, Arguments, Sources must be clickable, including through structured lenses.
**Impact:** Group-chat familiarity broken; users cannot share references inline.
**Recommended direction:** Shared safe linkifier (URL regex → anchors, `rel="noopener noreferrer nofollow"`, length caps, `break-words`); apply to message/claim/evidence/argument rendering.

## Finding 11 — Evidence is not present in the Conversation and is not replyable; Evidence has voting

**Area:** Evidence (spec §8, §25)
**Severity:** P1 (presence/replies) + P2 (evidence voting)
**Current implementation:** Evidence lives only inside the per-claim `EvidenceSection` drawer within the Claims lens (and `RoomEvidenceSection`/`RoomEvidenceTab` lenses). There is no chronological evidence item in the conversation and no reply mechanism on evidence. Evidence cards additionally render `EvidenceVoting` (`evidence-section.tsx` line 462; `evidence_votes` table, migration `202606030006`) — voting on evidence is not defined by the spec's Evidence interaction model (Reply/React/clickable link only).
**Required behavior:** Evidence appears chronologically in Conversation with Reply/React, Claim relationship always visible, clickable source links.
**Impact:** Evidence is walled off from conversation; evidence voting is an unapproved popularity surface (though direction remains stance-only, it is adjacent to credibility risks).
**Recommended direction:** Surface evidence in the conversation with claim-relationship chip; add replies or route them via normal message replies referencing evidence; product-check whether evidence voting should remain (recommend removal or explicit approval).

## Finding 12 — Structured lenses do not preserve conversation origin; no desktop/mobile jump behavior

**Area:** Structured view navigation (spec §16)
**Severity:** P1
**Current implementation:** Claims lens (`DiscussionClaimsSection`) renders claim cards without any link to the originating conversation message. Questions lens links to `?question=` detail (in-lens). SoU navigates to claims sections. There is no "jump to this contribution in Conversation" affordance anywhere, and no desktop focused-detail panel pattern. Deep links exist per section but conversation-origin context is only partially preserved (e.g., `?highlight=` opens the claim card, not its conversation origin).
**Required behavior:** Hard rule — a contribution must never lose its conversational origin when viewed through a structured lens; mobile should jump to the contribution in Conversation.
**Impact:** Lens items read like database records (spec §16 explicitly warns against this).
**Recommended direction:** Add origin links (claim→message anchor, evidence→claim→message) and jump-to-conversation behavior on mobile.

## Finding 13 — Room header is oversized vs compact requirement

**Area:** Header (spec §4)
**Severity:** P2
**Current implementation:** `room-section-shell.tsx` lines 35–47: bordered header card with roomType pill badge, `text-2xl md:text-3xl` title, and a full premise/description paragraph (`mt-2 max-w-4xl`); followed by `RoomGuideCard`, then (on overview) the full SoU panel — all before the sticky nav.
**Required behavior:** Compact header: canonical title + `Discussion` label + optional compact actions (Save/Share/More) on one row.
**Impact:** Large vertical spend before any room content; description/statistics-like blocks violate the compact-header rule.
**Recommended direction:** Collapse to single-row header; move premise/description into an expandable "About" affordance or Overview lens.

## Finding 14 — Legacy dead-code room implementation still present

**Area:** Codebase hygiene / confusion risk
**Severity:** P2
**Current implementation:** `discussion-room.tsx` (`DiscussionRoom`, `DiscussionDataProvider`), `section-nav.tsx`, `discussion-header.tsx`, `opening-premise.tsx`, `map-tab.tsx` (+ `graph-view.tsx`, `graph-utils.ts`, `discussion-health.tsx`, `discussion-summary.tsx`, `discussion-intelligence.tsx`) are not mounted by any current route (verified by import search; only `debate-room.tsx` imports `CommentItem`/`RoomEvidenceTab`/`buildCommentTree` which are live). Root `IMPLEMENTATION_PLAN.md` already lists them for deletion. They contain the only conversation-first layout, graph/map/intelligence surfaces, and an alternate SoU flow.
**Required behavior:** N/A (audit hygiene) — but these components conflict with spec §19/§26 (graph visualization, intelligence panels) if ever remounted.
**Impact:** Maintenance ambiguity; risk of agents "restoring" retired surfaces; double the audit surface.
**Recommended direction:** Delete or clearly archive after the new room architecture lands (do not delete during an audit-only phase).

## Finding 15 — Reactions are not implemented

**Area:** Conversation (spec §5.2–5.3, §25)
**Severity:** P2
**Current implementation:** No reaction infrastructure exists anywhere (`onReact|ReactionBar|emoji-reaction` — only unrelated matches; `CommentItem` actions are Reply/Edit/Create Claim/Report only). Message actions = Reply, Create Claim, Report, Edit (5-minute window mirroring DB trigger `enforce_message_edit_rules`).
**Required behavior:** React as a standard message action (QA gate: "Reactions work if already supported/approved" — reactions are listed in spec §5.2/§25).
**Impact:** Familiar-interaction layer incomplete; note philosophy caution against reaction counters as popularity — UI must keep reactions subtle/non-numeric-heavy if added.
**Recommended direction:** Implement lightweight reactions per spec; avoid count-leaderboard styling. (Spec-approved, so not a new product decision; visual treatment is a UX choice.)

## Finding 16 — Personal room aliases and SoU/SoU-lens navigation gaps

**Area:** Saved rooms / SoU lens (spec §3.4, §15.5)
**Severity:** P2
**Current implementation:** `user_saves` (`202606260001_create_user_saves.sql`) has `target_type ('discussion'|'debate'|'claim'|'evidence')`, `target_id`, no alias column, no rename UI. SoU exists only as an overview block (`discussion-overview-understanding.tsx` → `state-of-understanding.tsx`); there is no SoU tab/route and `hasSufficientData` (any claim OR evidence OR question, `understanding-utils.ts` lines 225–226) trivially shows SoU even for a single claim.
**Required behavior:** Private per-user room alias (rename subtly; canonical title unchanged); SoU lens when room has matured (maturity algorithm explicitly OPEN).
**Impact:** Alias absent; SoU placement conflicts with lens model; trivial maturity gate is a pre-existing implementation default, not an approved threshold.
**Recommended direction:** Add `alias` (private) to `user_saves` + rename UI; add SoU lens; keep `hasSufficientData` as-is pending product-owner maturity decision (do not invent thresholds — see §8 Product Decisions).

## Finding 17 — No sound infrastructure or Chat Sounds control

**Area:** Sounds/animation (spec §20)
**Severity:** P3
**Current implementation:** Only Tailwind `animate-in fade-in …` transitions on modals/banners/forms. No audio assets, no sound manager, no preferences entry, no Chat Sounds On/Off control.
**Required behavior:** Subtle message/claim/evidence entrance feedback with synchronized sounds; Chat Sounds On/Off; no gamified sounds.
**Impact:** Polish gap only; no epistemic risk.
**Recommended direction:** Global sound-preferences toggle (host in existing preferences feature) + subtle entrance animations.

# 5. Data / Architecture Gaps

**Supported today (verified in migrations/schema):**
- **Messages** — `messages` (room_id, parent_message_id, content 1–2000, identity_mode, message_type message/question/system, 5-min edit trigger, no-self-reply constraint); `discussion_messages` view with anonymity redaction.
- **Claims** — `claims` (room_id, created_by, origin_message_id → messages ON DELETE SET NULL, content 25–500, claim_type, context_type, identity_mode, is_retracted, debate_side, immutability + no-delete triggers); `discussion_claims` view with agree/disagree counts, consensus_ratio, user_vote.
- **Votes** — `claim_votes` (unique per user/claim, agree/disagree; blocked on retracted claims via `202606030009`); `evidence_votes` analogous.
- **Evidence** — `evidence` (room_id, source_id, evidence_type, identity_mode, is_retracted, immutability), `claim_evidence` (claim_id, evidence_id, direction support/contradict/context, same-room trigger), `sources` (room-scoped URL unique), `get_or_create_source` SECURITY DEFINER RPC.
- **Questions** — `questions` (content 10–500, question_type information/clarification/perspective/evidence/directional/reflective, immutability/no-delete triggers), `claims.question_id`; `discussion_questions` view.
- **Inquiries** — `inquiry_items` + responses/satisfaction lifecycle (`202606120001`), claim-scoped; `create_inquiry`/`respond_to_inquiry`/`satisfy_inquiry`/`unsatisfy_inquiry`/`close_inquiry` RPCs; blocked in archived rooms (P0 hardening).
- **Saves** — `user_saves` (private per-user; discussion/debate/claim/evidence targets).
- **Moderation/Search** — flags + queue views; `search_content`; homepage RPCs.

**Missing capabilities (exact architectural requirements; NO migrations created per audit-only rule):**
1. **Claim requests** (Finding 2) — new table (id, message_id, requester_id, state pending/accepted/skipped/declined, created_at, decided_at, unique(message_id, requester_id)); per-message aggregation; RLS (requester create/read own; author read-all + decide).
2. **Claim deletion lock** (Finding 4) — neutralize `prevent_claim_deletion`; server-side eligibility (`now() >= created_at + lock`) via RPC/trigger; configurable duration source.
3. **Discussion arguments** (Finding 5) — generalize `debate_arguments` or new claim-attached `relationship` entity with supporting/challenging semantics + claims-mirroring RLS.
4. **Reactions** (Finding 15) — reaction storage (e.g., `message_reactions`) or approved lightweight treatment.
5. **Personal alias** (Finding 16) — `user_saves.alias text null` (RLS already user-scoped).
6. **Vote→reputation removal** (Finding 3) — drop/neutralize `handle_claim_vote_insert/delete` triggers and `consensus_bonus` term.
7. **Linkification** (Finding 10) — client-side rendering utility only; no schema change.
8. **SoU lens placement** — routing/shell change only.
9. **Evidence replies** — `parent_evidence_id`-style linkage or conversation-message referencing; technical decision at implementation planning.

# 6. Epistemic Integrity Audit

Verified data flows (not assumed):

| Signal | Flow | Verdict |
|---|---|---|
| SoU classification | `deriveStateOfUnderstanding` (`understanding-utils.ts`): claims classified supported/contested/unresolved **purely by evidence direction counts** (`claim_evidence.direction`); votes appear only inside human-readable `statusReason` strings via `formatCommunityStance` | **ALIGNED** — votes do NOT influence SoU state |
| `hasSufficientData` | `totalClaims > 0 OR evidence > 0 OR questions > 0` (lines 225–226) | **OPEN** — trivially permissive gate; pre-existing, not an approved maturity algorithm; no vote input (safe) |
| Claim credibility | votes → `supportRatio` → `computeCredibility` → `ClaimCredibilityBadge` on every active claim card (`claim-list.tsx` 523–532) | **VIOLATION** of §23.4/§26.7 (Finding 3) |
| Author reputation | claim votes → `CLAIM_AGREED/CLAIM_DISAGREED` reputation events; consensus_ratio → `recalculate_user_reputation` bonus; retraction → −20 | **VIOLATION** of §23.4 spirit (popularity→authority); retraction penalty conflicts with mind-change principle |
| Support/Challenge UI | `ClaimVoting`: Support/Challenge buttons + counts + "% of voters" bar (slate/amber, not green/red) | **ALIGNED as stance display**; problem is only downstream vote consumption |
| Evidence voting | `EvidenceVoting` + `evidence_votes` | **UNSPECIFIED** in spec — product confirmation needed (recommend remove or approve explicitly) |
| Winner/Loser | Removed (`202606270001`; `debate-resolution.tsx`/`debate-scorecard.tsx` deleted) | **ALIGNED** |
| Truth meters | SoU labels are evidence-coverage/status based; no green/red truth encoding on messages; credibility badge uses sky/amber/rose severity colors | Mostly **ALIGNED**; credibility badge remains the truth-signaling surface (Finding 3) |
| Terminology | "Discussion Questions" vs "Structured Inquiries" kept distinct in `RoomSectionShell`; `InquiryCreateDialog` header says "Ask a Question" (drift); Claims form says "Assert a Structured Claim"; composer says "Post contribution" | Minor drift — P3 |

**Conclusion:** SoU itself is clean and evidence-led. Epistemic risk concentrates in (a) vote→credibility badge, (b) vote→author reputation triggers + consensus bonus, (c) −20 retraction penalty, (d) unspecified evidence voting. All four are separable from the SoU pipeline.

# 7. Responsive Audit

**NOT VERIFIED in browser** — no dev server, Playwright run, or screenshot capture was performed in this audit-only session. No responsive failures are claimed and none are ruled out.

Code-level observations only (runtime unverified):
- `RoomSectionShell` nav is a horizontally scrollable `min-w-max` tab row — usable at 375px, but 5–6 tabs with long labels ("Discussion Questions") risk heavy horizontal scroll; no fade/gradient cue.
- Claim cards are full-width `article` blocks with multi-badge top rows (`claim-list.tsx` 506–539) — badge wrapping likely at 375px (unverified).
- Prior audit docs observed header text overflow on long unbroken strings; current `RoomSectionShell` title (line 42) and premise paragraph have no `break-words`.
- `CommentItem` bounds thread indent to 3 levels (`paddingLeft: level * 1.25rem`) — mobile-safe by construction (unverified).
- Touch targets in nav tabs ≈ 28–32px height (`py-2`, `text-xs`) — borderline for 44px guidance (unverified).

Checked viewport targets 375 / 390 / 834 / 1440: NOT VERIFIED (no browser QA).

# 8. Product Decisions Required

Genuinely open items requiring product-owner approval (not invented here):

1. **SoU maturity/unlocking algorithm** (spec §19.4, §29.1 — explicitly OPEN). Current `hasSufficientData` is a pre-existing trivial gate. Decision needed: keep trivial gate or approve a formal maturity algorithm. This audit does NOT propose one.
2. **Evidence voting** — `evidence_votes` + `EvidenceVoting` UI exist, but the approved Evidence interaction model (Reply/React/clickable link) does not include voting. Decision: remove, or approve as community stance on evidence.
3. **Claim retraction penalty** — `CLAIM_RETRACTED (−20)` reputation event contradicts the philosophy that changing one's mind is a feature; the spec's deletion model replaces retraction-penalty with a deletion lock. Decision: remove penalty when implementing the deletion lock (recommended), or retain retraction with explicit approval.
4. **Reactions visual treatment** — reactions are spec-approved in principle; any count-forward/popularity-styled treatment would need philosophy review.

All other items are TECHNICAL IMPLEMENTATION CHOICE (Conversation route placement, claim-request aggregation mechanics, debate-argument generalization, linkifier choice) and do not require product sign-off beyond the spec.

# 9. Recommended Implementation Sequence

Recommended order only — nothing implemented in this audit:

1. **Architecture/data prerequisites** — claim_requests table + RLS; deletion-lock migration (replace `prevent_claim_deletion`); vote→reputation trigger removal; `user_saves.alias`; decide evidence-voting fate.
2. **Room shell/navigation** — compact header; sidebar CURRENT DISCUSSION subsection; Conversation/Sources/SoU entries in `RoomSectionShell`; personal alias rendering.
3. **Conversation-first room** — Conversation as default surface; reuse paginated messages + `CommentItem`.
4. **Composer** — Message/Claim/Question modes; default Message; wire to `postMessage`/`createClaim`/`createQuestion`.
5. **Claims** — in-conversation claim rendering via `origin_message_id`; compact cards; origin backlinks in Claims lens; author-only conversion.
6. **Claim Requests** — aggregated per-message state; Accept/Skip/Decline per spec §6.3.
7. **Evidence** — claim-relationship chip preserved; evidence surfaced in conversation; clickable source links; replies path.
8. **Arguments** — discussion arguments (generalized debate infrastructure); supporting/challenging labels; chronological.
9. **Questions/Inquiries** — keep Questions lens + composer mode; keep Targeted Inquiries contextual to claims; fix "Ask a Question" label drift in `InquiryCreateDialog`.
10. **Structured lenses** — lens nav model; conversation-origin preservation; desktop detail panel / mobile jump behavior.
11. **SoU integration** — SoU behind its lens; keep evidence-led derivation; await maturity-algorithm decision.
12. **Links** — safe shared linkifier across message/claim/evidence/argument bodies.
13. **Sound/animation** — subtle entrances + Chat Sounds On/Off in preferences.
14. **Responsive polish** — 375/390/834/1440 passes; badge wrapping; header/title `break-words`.
15. **Validation/QA** — lint → tsc → build → Playwright browser QA → epistemic guardrail verification (votes touch nothing but stance counts).

# 10. Files Inspected

**Spec & foundation:** `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (full), `docs/00_MASTER_CONTEXT.md`, `AGENTS.md`, `docs/PHASE_7A_SOU_PROFILE_IMPLEMENTATION.md` (context only).

**Routes:** `src/app/discussions/[slug]/page.tsx`, `[slug]/claims/page.tsx`, `[slug]/evidence/page.tsx`, `[slug]/questions/page.tsx`, `[slug]/contributions/page.tsx`; `discussions/create/page.tsx` (guard grep); `src/app/saved/page.tsx` (existence); `src/services/supabase/middleware.ts` (guard scope grep).

**Components:** `room-section-shell.tsx`, `sidebar.tsx`, `section-nav.tsx`, `discussion-room.tsx`, `discussion-data-provider.tsx`, `discussion-section.tsx`, `discussion-contributions-section.tsx`, `claim-list.tsx`, `comment-item.tsx`, `extract-claim-modal.tsx`, `evidence-section.tsx`, `room-sources-tab.tsx`, `room-evidence-tab.tsx` (interface + usage), `state-of-understanding.tsx`, `understanding-utils.ts`, `question-list.tsx` (grep), `map-tab.tsx` / `graph-view.tsx` / `discussion-intelligence.tsx` / `discussion-health.tsx` / `discussion-summary.tsx` (usage search), `discussion-header.tsx`, `opening-premise.tsx`, `mobile-nav.tsx` (grep), `debate-room.tsx` (shared imports).

**Services/hooks/types:** `discussion-service.ts` (row types, mappers, createQuestion/createClaim, castClaimVote, pagination ordering), `use-discussions.ts` (exports), inquiries feature usage, `reputation-utils.ts`, `claim-credibility-badge.tsx`, `credibility-tooltip.tsx`, `reputation-service.ts` (grep), `types/domain.ts` (grep).

**Database:** `202606030003_create_discussions.sql` (grep), `202606030004_create_claims.sql`, `202606030006_sprint_6_corrections_and_voting.sql`, `202606030008_p0_source_dedup_and_claim_evidence.sql` (grep), `202606030009_block_votes_on_retracted_entities.sql` (context), `202606030010_create_questions.sql`, `202606100004_create_reputation_events.sql`, `202606100005_reputation_stabilization.sql` (grep), `202606190001_security_hardening_p0_p1.sql` (grep), `202606110001_create_side_switch.sql` (grep), `202606260001_create_user_saves.sql`, `202606270001_remove_winner_loser_system.sql`, full migration inventory listing.

**Searches run (with results noted):** `DiscussionRoom`; `RoomSectionShell`; `claim_request|claimRequest|claim-requests` (0 hits); `deleteClaim|delete_claim|deletion lock` (spec/docs only, 0 code hits); `ClaimCredibilityBadge|CredibilityTooltip|computeCredibility`; `consensusRatio|supportRatio|agreementPercentage`; `retractClaim`; `CLAIM_AGREED|CLAIM_DISAGREED|consensus_bonus`; `alias|personal_name|nickname` (0 product hits); `linkify|autoLink` (0 hits); `reactions|emoji|onReact` (0 feature hits); `sound|audio|playSound|useSound` (0 hits); `message_type`; `DiscussionIntelligence|DiscussionHealth|MapTab|GraphView|DiscussionSummary|OpeningPremise|DiscussionHeader` (usage); `RoomSourcesTab|RoomEvidenceTab` (usage); `saved/page`; `get_or_create_source|sources`.

# 11. Validation

| Check | Result |
|---|---|
| `git status --porcelain` | Run — repo already carries extensive uncommitted Phase 6E/7A/7B work (modified room/reputation files, deleted `debate-resolution.tsx`/`debate-scorecard.tsx`, untracked spec + audit docs, `tests/`, scripts). This audit added only `docs/PHASE_7C_DISCUSSION_ROOM_ARCHITECTURE_AUDIT.md`. No source files touched by this audit. |
| Repository searches | Run (list in §10) — findings are search-backed with file/line evidence. |
| TypeScript check (`npx tsc --noEmit`) | **Run — 1 error (pre-existing, not caused by this audit):** `src/app/u/[username]/page.tsx(52,7): error TS2304: Cannot find name 'showReputation'` — that file is part of the pre-existing uncommitted working tree (see `git status`); this audit modified no source files. Recorded as FAILING (pre-existing). |
| Lint (`npm run lint`) | **Run — 0 errors, 9 warnings** (pre-existing `no-unused-vars` in `scripts/phase5d-*.mjs`, `debate-room.tsx` line 40, `understanding-utils.ts` line 47, `inquiry-card.tsx` line 15). No lint regressions from this audit. |
| Production build (`npm run build`) | NOT RUN — audit-only session; large pre-existing uncommitted working tree makes build attribution ambiguous. Recorded as NOT RUN (never claimed as passed). |
| Browser QA | **NOT PERFORMED** — no dev server or Playwright session started. No responsive/interactive claims made. |
| Database inspection | Static migration-file review only; no live DB connection. Production migration application state remains unknown (repo migrations ≠ applied migrations, per AGENTS.md). |

# 12. Final Verdict

**FAIL WITH CRITICAL GAPS** — as an implementation-readiness verdict against the approved spec (not a judgment of overall code quality).

The current Discussion implementation is a well-hardened structured-content system (claims/evidence/questions/inquiries with sound RLS, moderation, anonymity redaction) and its SoU is correctly evidence-led. But the approved direction — **Conversation-first rooms with lenses, claim requests, in-place claim conversion, discussion arguments, sources/SoU lenses, 20-minute deletion lock, and stance-only voting** — is substantially absent, and three active mechanics (vote-driven claim credibility badge, vote→author-reputation triggers + consensus bonus, −20 retraction penalty) directly violate the approved epistemic model.

Gate findings before any Phase 7C implementation: Findings 1–4 (conversation IA, claim requests, vote consumption, deletion model), then follow the sequence in §9. SoU does not need epistemic remediation — only relocation behind a lens.
