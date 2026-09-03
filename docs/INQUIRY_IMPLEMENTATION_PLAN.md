# Inquiry Implementation Plan

**Date**: 2026-06-12
**Status**: Planning only — no implementation.

---

## 1. North Star

The smallest Inquiry v1 that delivers value:

> **A user can ask a question about any claim or evidence. Someone can answer. The asker can confirm the answer was satisfactory.**

That's it. Everything else is iteration.

The v1 is intentionally minimal — it proves the interaction model exists. Once users are asking and answering, we observe, measure, and expand. We do not build features for scenarios that haven't occurred yet.

---

## 2. What v1 IS

| Capability | Detail |
|------------|--------|
| Create inquiry | Attached to a claim or evidence. Types: clarification, evidence_request, assumption_check. |
| Respond to inquiry | Anyone can respond. First response moves status to `responded`. |
| Satisfy/unsatisfy | Only the inquirer can mark their inquiry as satisfied or unsatisfied. |
| Close inquiry | Inquirer can close without satisfying (ends the loop). |
| Visibility | Inquiries and responses visible to all room participants. |
| Status indicators | open, responded, satisfied, unsatisfied, closed visible on the inquiry. |
| Rate limits | 5/hr per user, 50/debate per user, 20/claim total. |
| Side metadata | Inquirer's current side recorded at creation time. |

## 3. What v1 is NOT

| Feature | Why excluded |
|---------|-------------|
| Auto-expiry | Can ship without it. Inquiries stay at their last status until manually closed. Acceptable for v1. |
| "Unanswerable" flag | Rare edge case. Responders can just say "I can't answer this." |
| Dedicated inquiry tab | Inquiries shown inline below claims/evidence. A separate tab adds UI surface area without proving value. |
| Inquiry voting | Complex. Adds social dynamics we don't understand yet. |
| Argument map integration | The map doesn't show inquiries yet. That's a separate workstream. |
| Consensus integration | Consensus system isn't built yet. Inquiry and consensus will be designed together. |
| Duplicate detection | Algorithmic investment. In v1, duplicates are visible — users can see existing inquiries before posting. |
| Ghost inquiry metrics | v1 doesn't expose these. Inquirer patterns are collected but not displayed. |
| Side declaration nudges | v1 doesn't prompt users to take a side. Pure investigation is permitted. |
| Cross-side analysis views | The data is collected (`inquirer_side`). The views come in a later phase. |
| Response editing | Fixed at creation. Edit window adds complexity. Add in v1.1 if users ask for it. |
| Evidence reference in responses | Nice-to-have. Responders can paste links in the text. Structured evidence linking comes later. |
| Reputation beyond basic events | Just INQUIRY_POSTED and INQUIRY_RESPONDED. Full reputation display + inquiry breakdown comes later. |

---

## 4. Architecture Overview

### 4.1 Data Layer

Two new tables:
- `inquiry_items` — one row per inquiry question
- `inquiry_responses` — one row per response to an inquiry

No new tables for status transitions — lifecycle is self-contained in `inquiry_items.status`.

One existing table change:
- `debate_participants` side check constraint: add `'inquiry'`

### 4.2 RPCs (Backend API)

| RPC | Purpose | Rate limited |
|-----|---------|--------------|
| `create_inquiry` | Create new inquiry | Yes (5/hr, 50/debate, 20/claim) |
| `respond_to_inquiry` | Respond to an existing inquiry | No (but moderated) |
| `satisfy_inquiry` | Mark inquiry as satisfied | No (only inquirer can call) |
| `unsatisfy_inquiry` | Mark inquiry as unsatisfied | No (only inquirer can call) |
| `close_inquiry` | Close inquiry without satisfying | No (only inquirer can call) |

**Note on `close_inquiry`**: The data model proposal had `closed` as a status reachable from `responded` directly. This needs its own RPC rather than folding into `satisfy_inquiry`/`unsatisfy_inquiry`, because the UX is different: "I'm done" vs "I'm satisfied" vs "I want more."

### 4.3 Reputation Events

| Event | Points | Trigger | In v1? |
|-------|--------|---------|--------|
| `INQUIRY_POSTED` | +2 | Inquiry created | Yes |
| `INQUIRY_RESPONDED` | +5 | Response created | Yes |
| `INQUIRY_SATISFIED` | +2 | Inquirer marks satisfied | Yes (future) |
| `INQUIRY_CLOSED` | 0 | Inquirer closes | No (not useful) |
| `INQUIRY_EXPIRED` | 0 | System auto-closes | No (not in v1) |
| `INQUIRY_UNSATISFIED` | 0 | Inquirer marks unsatisfied | No (no penalty) |

**Delaying INQUIRY_SATISFIED**: This event creates an incentive for the inquirer to acknowledge completion. But in v1, we want to observe natural behavior before adding incentives. Ship INQUIRY_POSTED + INQUIRY_RESPONDED first, add SATISFIED in v1.1.

### 4.4 Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `InquiryButton` | Claim card, Evidence card | "Ask a question" button |
| `InquiryCreateDialog` | Modal/panel | Form: target, type, content |
| `InquiryList` | Below claim/evidence | List of inquiries + responses |
| `InquiryItem` | Within InquiryList | Single inquiry with status indicator |
| `InquiryResponse` | Within InquiryItem | Single response |
| `InquiryStatusBadge` | Within InquiryItem | Status chip (open/responded/satisfied/etc.) |
| `InquiryActions` | Within InquiryItem | Satisfy/Unsatisfy/Close buttons (inquirer only) |

### 4.5 No New Routes

Inquiries live inline on the existing Claims tab in debate rooms. No `/inquiries` route. No new page.

---

## 5. Migration Plan

### Step 1: Create `inquiry_items` table

- All columns as specified in data model proposal
- Claim and evidence target columns (FKs)
- Status column (open/responded/satisfied/unsatisfied/closed)
- `inquirer_side` column (snapshot)
- Rate limit columns not needed (enforced in RPC)
- No `expired`, `flagged_as_unanswerable`, `flagger_id`, `flag_reason` columns (v1.1)
- No `satisfied_at`, `closed_at` columns (v1.1 — analytics phase)
- No `relationship_question` in inquiry_type check (v2)

### Step 2: Create `inquiry_responses` table

- All columns as specified
- No `evidence_reference_id` (v1.1)
- No `updated_at` (v1.1)

### Step 3: Add `'inquiry'` to `debate_participants` side check

- `'inquiry'` replaces `'neutral'` semantically but both values coexist
- No migration of existing `'neutral'` rows — they remain valid

### Step 4: Create RLS policies

- Select: same as room visibility
- Insert: authenticated + room access
- Update: only inquiry creator (for status changes)
- No delete (immutable)

### Step 5: Create RPCs

- `create_inquiry` — all rate limits, metadata capture
- `respond_to_inquiry` — status transition
- `satisfy_inquiry` — creator-only
- `unsatisfy_inquiry` — creator-only
- `close_inquiry` — creator-only

### Step 6: Create reputation events

- Add INQUIRY_POSTED and INQUIRY_RESPONDED to `create_reputation_event` calls
- Both events already fit the existing `event_type text` pattern (no schema change needed)

### Step 7: Frontend — Inquiry button on claims

- "Ask a question" button on ClaimCard and EvidenceCard
- Opens InquiryCreateDialog

### Step 8: Frontend — InquiryCreateDialog

- Target pre-filled (the claim/evidence)
- Type selector (clarification, evidence_request, assumption_check)
- Content textarea (10-2000 chars)
- Submit → calls create_inquiry RPC

### Step 9: Frontend — InquiryList below claims

- Fetches inquiries for this target
- Shows open first, then responded, then satisfied/closed
- Each InquiryItem shows: status badge, inquirer, type, content, responses

### Step 10: Frontend — Inquiry actions

- If current user is the inquirer: Satisfy / Unsatisfy / Close buttons
- If current user is anyone else: Respond button

### Step 11: Frontend — Response creation

- Inline textarea on the InquiryItem
- Submit → calls respond_to_inquiry RPC

---

## 6. File Manifest (Notional)

### New files

```
supabase/migrations/202606120001_create_inquiry_tables.sql
  -- inquiry_items table
  -- inquiry_responses table
  -- debate_participants side constraint update
  -- RLS policies
  -- RPCs (create, respond, satisfy, unsatisfy, close)

src/features/debates/hooks/use-inquiries.ts
  -- useCreateInquiry()
  -- useRespondToInquiry()
  -- useSatisfyInquiry()
  -- useUnsatisfyInquiry()
  -- useCloseInquiry()
  -- useInquiriesForTarget()

src/features/debates/services/inquiry-service.ts
  -- createInquiry()
  -- respondToInquiry()
  -- satisfyInquiry()
  -- unsatisfyInquiry()
  -- closeInquiry()
  -- getInquiriesForTarget()
  -- DbInquiryItemRow / DbInquiryResponseRow types
  -- map functions

src/features/debates/components/inquiry-button.tsx
  -- "Ask a question" button for claims/evidence

src/features/debates/components/inquiry-create-dialog.tsx
  -- Modal: target, type, content, submit

src/features/debates/components/inquiry-list.tsx
  -- List of inquiries for a target

src/features/debates/components/inquiry-item.tsx
  -- Single inquiry with status, responses, actions

src/features/debates/components/inquiry-response.tsx
  -- Single response

src/features/debates/components/inquiry-status-badge.tsx
  -- Status chip

src/features/debates/types.ts
  -- InquiryItem, InquiryResponse, InquiryType, InquiryStatus types
```

### Modified files

```
src/features/discussions/components/claim-card.tsx
  -- Add InquiryButton

src/features/evidence/components/evidence-card.tsx
  -- Add InquiryButton (or equivalent location)

src/features/debates/services/debate-service.ts
  -- No changes (inquiry is a separate service)

src/features/reputation/types.ts
  -- Add INQUIRY_POSTED, INQUIRY_RESPONDED to ContributionTimelineItem.type

src/features/reputation/services/reputation-service.ts
  -- Add reputation event creation for inquiry actions
```

---

## 7. Dependencies

### Prerequisites

- None. Inquiry is a new feature with no dependency on consensus, argument maps, or side switching v2.

### Compatible With

- Existing side switching (inquirer_side snapshot captures current side at creation)
- Existing consensus (no integration yet — inquiries are independent)
- Existing argument maps (no integration yet — inquiries are independent)
- Existing moderation pipeline (inquiries are not moderatable in v1 — no moderation_flags integration)
- Existing reputation system (`create_reputation_event` accepts any event_type)

---

## 8. Rollback Plan

| Component | Rollback |
|-----------|----------|
| Migration | `DROP TABLE inquiry_items, inquiry_responses CASCADE` + revert debate_participants check |
| RPCs | `DROP FUNCTION create_inquiry, respond_to_inquiry, satisfy_inquiry, unsatisfy_inquiry, close_inquiry` |
| Frontend | Remove all inquiry components + revert claim-card/evidence-card imports |
| Reputation | Remove INQUIRY_POSTED/INQUIRY_RESPONDED calls (no data loss — events exist but are ignored) |

No production data loss on rollback. Inquiry items and responses are additive — no existing data is modified.

---

## 9. Coverage: Behavioral Flows

| Flow | v1 Coverage | Gap | When |
|------|-------------|-----|------|
| New user enters debate | Can ask questions without picking a side | No "investigate first" onboarding redesign | v1.1 |
| Support user inquires | Can ask on any claim/evidence | No celebration of own-side inquiry | v2 |
| Challenge user inquires | Can ask on any claim/evidence | Same as above | v2 |
| Inquiry participant persists | Can stay indefinitely | No commitment nudges | v1.1 |
| Side switch via inquiry | Side metadata captured | No "this inquiry led to switch" tracking | v2 |
| Consensus integration | Not in v1 | No inquiry → consensus traceability | Post-beta |
| Argument map integration | Not in v1 | No inquiry annotations on map | Post-beta |
| Reputation | +2 create, +5 respond | No display breakdown in profile | v1.1 |
| Abuse | Rate limits + caps | No unanswerable flag, no auto-expiry | v1.1 |
