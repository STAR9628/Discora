# Debate Detail Page Audit Report (`/debates/[slug]`)

**Date**: September 2, 2026
**Status**: Completed Audit — No Code Changes Made
**Target Route**: `/debates/[slug]`

---

## 1. Executive Summary & Context

This document presents a comprehensive, ground-truth audit of the Discora **Debate Detail Page** implementation (`/debates/[slug]`). Discora is a structured discourse platform built on the principle of **Understanding over Engagement**, **Evidence over Popularity**, and **Structure over Chaos**.

Before performing this audit, the following context and decision records were inspected:
- `docs/10_CODEX_CONTEXT.md`
- `docs/16_ARCHITECTURE_DECISIONS.md`
- `docs/19_SPRINT_3_USER_IDENTITY_PLAN.md`
- `docs/20_AVATAR_STORAGE_DESIGN.md`
- `DEBATE_GAMEPLAY_AUDIT.md`
- `SIDE_SWITCHING_DESIGN.md`

---

## 2. Codebase Architecture & Data Flow Audit

### 2.1 Route Entry Point
- **File**: [`src/app/debates/[slug]/page.tsx`](file:///d:/Projects/Discora/src/app/debates/%5Bslug%5D/page.tsx)
- **Execution**: Server Component.
- **Data Fetching**: Calls `getDebateBySlug(slug, supabase)` from [`src/features/debates/services/debate-service.ts`](file:///d:/Projects/Discora/src/features/debates/services/debate-service.ts).
- **Fallback**: If `getDebateBySlug` returns `null`, invokes Next.js `notFound()`.
- **Render Output**: Renders `<DebateRoom initialData={debateData} highlightId={highlightId} />`.

### 2.2 Client Container Component
- **File**: [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx)
- **Role**: Main interactive container managing tab state (`discussion`, `questions`, `claims`, `evidence`, `sources`, `map`), side filtering, message posting, and sub-modal state.
- **Children Sub-Components**:
  - [`DebateHeader`](file:///d:/Projects/Discora/src/features/debates/components/debate-header.tsx): Renders Motion title, Proposition vs Opposition position cards, participant counts, resolution banner.
  - [`DebateSidePicker`](file:///d:/Projects/Discora/src/features/debates/components/debate-side-picker.tsx): Buttons to join Proposition, Opposition, or Neutral.
  - [`DebateSideSelector`](file:///d:/Projects/Discora/src/features/debates/components/debate-side-selector.tsx): Side selector above claim list.
  - [`DebateScorecard`](file:///d:/Projects/Discora/src/features/debates/components/debate-scorecard.tsx): Live agreement breakdown.
  - [`DebateResolution`](file:///d:/Projects/Discora/src/features/debates/components/debate-resolution.tsx): Creator resolution control panel & resolution summary.
  - [`PositionHistory`](file:///d:/Projects/Discora/src/features/debates/components/position-history.tsx): Displays historical side changes.
  - Reused Discussion Components: `CommentItem`, `ClaimList`, `QuestionList`, `RoomEvidenceTab`, `RoomSourcesTab`, `MapTab`, `ExtractClaimModal`, `ReportDialog`.

### 2.3 Service Layer & Hooks
- [`debate-service.ts`](file:///d:/Projects/Discora/src/features/debates/services/debate-service.ts):
  - `getDebateBySlug(slug)`: Queries `rooms` join `topics` and `debates`.
  - `joinDebate(roomId, side)`: Upserts `debate_participants`.
  - `leaveDebate(roomId)`: Deletes `debate_participants` row.
  - `switchDebateSide(roomId, newSide, reason)`: Invokes `switch_debate_side` RPC (validates 50-char reason, logs immutable `debate_side_changes`, posts system message).
  - `getClaimsBySide(roomId, side)`: Fetches `discussion_claims` filtered by `debate_side`.
  - `resolveDebate(roomId, resolution)`: Invokes `resolve_debate` RPC.
- [`inquiry-service.ts`](file:///d:/Projects/Discora/src/features/debates/services/inquiry-service.ts):
  - Manages structured inquiries (`clarification`, `evidence_request`, `assumption_check`) targeting claims.

---

## 3. Database & Data Model Audit

### 3.1 Primary Database Schema
- **`public.rooms`**: Base entity (`room_type = 'debate'`). Stores `title` (motion), `description`, `slug`, `created_by`, `status` (`open`, `inactive`, `archived`).
- **`public.debates`**: Metadata table referenced 1-to-1 by `rooms.id`.
  - Columns: `id`, `proposition_title`, `opposition_title`, `opening_statement`, `status` (`active`, `resolved`, `closed`), `resolution` (JSONB).
- **`public.debate_participants`**:
  - Columns: `id`, `room_id`, `user_id`, `side` (`proposition`, `opposition`, `neutral`), `joined_at`.
  - Constraint: `UNIQUE(room_id, user_id)`.
- **`public.claims`**:
  - Added Column: `debate_side` (`proposition` | `opposition`).
- **`public.debate_side_changes`**:
  - Immutable audit log for side changes. Triggers prevent `UPDATE` and `DELETE`. Stores `previous_side`, `new_side`, `reason` (min 50 chars), `created_at`.
- **`public.inquiry_items` & `public.inquiry_responses`**:
  - Structured questions targeting claims with statuses: `open`, `responded`, `satisfied`, `unsatisfied`, `closed`.

### 3.2 Database Views & RPCs
- **`public.discussion_debates`**: View aggregating claim counts (`proposition_claim_count`, `opposition_claim_count`) and participant counts (`proposition_participant_count`, `opposition_participant_count`, `neutral_participant_count`).
- **`public.create_debate_room`**: RPC creating `rooms` and `debates` rows atomically.
- **`public.switch_debate_side`**: Security Definer RPC validating side switch rules, 24h cooldown, and writing system messages.

---

## 4. Real UX Audit & Information Hierarchy Evaluation

### 4.1 First 10 Seconds Experience
When loading a debate page, the user is greeted with a heavy vertical stack of 6 distinct header cards:
1. Room Header Card (Title, Topic, Date, Stats)
2. `DebateHeader` (Motion title + Proposition Card vs Opposition Card)
3. Opening Statement Card
4. `DebateSidePicker` ("Join Proposition / Opposition / Neutral")
5. `DebateScorecard`
6. `DebateResolution` (if creator or resolved)

### 4.2 Critical UX Vulnerabilities
1. **Vertical Wall of Stacked Containers**: The page requires scrolling past ~1200px of header cards before reaching the main content tabs.
2. **Generic Discussion Tab Default**: The page defaults to the `discussion` tab, which renders a linear comment feed rather than highlighting the structured two-sided arguments.
3. **Detached Side Selector**: Inside the `claims` tab, the `DebateSideSelector` is disconnected from both the side picker in the header and the claim creation form.
4. **Mobile Layout Fragmentation**: On desktop, claims are shown in a 2-column grid (`Support` vs `Challenge`). On mobile, the two sides are hidden behind a toggle button, making side-by-side comparison impossible.

---

## 5. Philosophy Alignment Audit

| Principle | Score | Rationale |
|---|---|---|
| 1. Understanding over engagement | **PARTIAL** | Core side positions are visible, but defaulting to a linear comment feed (`discussion` tab) encourages social chatter over structured argument analysis. |
| 2. Evidence over opinions | **PARTIAL** | Evidence is segregated into a separate `evidence` tab rather than presented directly inline with supporting/contradicting claims. |
| 3. Clarity over activity | **PARTIAL** | Activity counts (contributions, participants) are placed prominently at the top, while the core disagreement requires scrolling. |
| 4. Questions before conclusions | **FAIL** | Questions & Inquiries are buried under a secondary tab instead of framing the debate uncertainties upfront. |
| 5. Neutrality | **PASS** | Neutral stance is fully supported; side switching requires a mandatory 50-character reasoning. |
| 6. Both sides understandable | **PARTIAL** | Proposition and Opposition position stances are displayed, but mobile hides one side behind a toggle. |
| 7. Claim → Evidence traceability | **PASS** | Claims correctly display linked evidence badges and consensus ratios. |
| 8. Visible uncertainty | **PARTIAL** | Unresolved debates lack explicit visual indicators for open inquiries or unverified claims. |
| 9. No popularity mechanics | **PASS** | No upvotes, likes, or trending algorithms used inside the debate room. |
| 10. No unnecessary gamification | **PASS** | Side switching is logged immutably without gamified badges or points. |

---

## 6. Responsive, Accessibility, & Error State Audit

- **375px / 390px (Mobile)**: Severe vertical scrolling (~1500px to reach claims). 2-column claim view collapses into single view with toggle buttons.
- **768px (Tablet)**: 2-column layout fits tightly; header cards consume 60% of viewport height.
- **1024px / 1440px (Desktop)**: Content constrained to `max-w-4xl`, which makes 2-column claim grids feel cramped.
- **Accessibility**: Missing ARIA region labels on side picker controls; focus management on modal dialogs needs improvement.
- **Error / Empty States**: Clean fallbacks exist, but empty claim states use generic discussion phrasing.

---

## 7. Security & Data Integrity Audit

- **RLS & Security Definer**: RPCs `switch_debate_side` and `create_inquiry` properly enforce `auth.uid()` checks and rate limits (max 5 inquiries/hr).
- **Immutability**: `debate_side_changes` triggers strictly enforce append-only rules.

---

## 8. Real Production Data Findings

Querying the active database via Supabase client confirmed 2 real debate rooms:
1. **`ai-vs-human`**:
   - Status: `resolved` (Winner: `proposition`)
   - Participants: 1
   - Claims / Messages: 0
2. **`ai-is-superior-to-humans`**:
   - Status: `active`
   - Participants: 1
   - Claims / Messages: 0

Both test debates currently have 0 claims and 0 messages, confirming that real-data validation must test clean empty states as well as active/resolved states.
