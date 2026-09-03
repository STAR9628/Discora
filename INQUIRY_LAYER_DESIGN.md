# Inquiry Layer Design

**Date**: 2026-06-11
**Status**: Design only — no implementation.

---

## 1. Problem

Currently, debate participation offers three roles:

| Role | Label | Behavior |
|------|-------|----------|
| Support | Proposition | Creates supporting claims, votes on opposition claims |
| Challenge | Opposition | Creates challenging claims, votes on supporting claims |
| Neutral | Observer | Watches only — no participation mechanism |

**Neutral is wasted space.** A user who does not support or challenge the motion has no structured way to contribute. They cannot:
- Ask clarifying questions
- Request evidence for a claim they find questionable
- Challenge assumptions without taking a position
- Distinguish "I disagree" from "I need more information"

---

## 2. Proposed Model: Inquiry

Replace **Neutral** with **Inquiry**. The three roles become:

| Role | Label | Meaning |
|------|-------|---------|
| **Support** | Support | "I believe this motion is correct" |
| **Challenge** | Challenge | "I believe this motion is incorrect" |
| **Inquiry** | Inquiry | "I am investigating — I have not reached a conclusion" |

### Inquiry Core Principle

**Inquiry items must attach to a claim or evidence.** They never float independently. This ensures:
- Every question has context
- Every evidence request is traceable
- Every assumption challenge has a target

---

## 3. Data Model

### New Table: `inquiry_items`

```sql
create table public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  inquiry_type text not null check (inquiry_type in (
    'question',            -- "What is the basis for this claim?"
    'evidence_request',    -- "Can you provide a source for this?"
    'assumption_challenge',-- "You're assuming X, but is that valid?"
    'clarification'        -- "What do you mean by 'better'?"
  )),
  content text not null check (char_length(content) >= 10),

  -- Attachment: exactly one of these must be set
  claim_id uuid references public.claims(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete cascade,

  -- Status
  status text not null default 'open' check (status in (
    'open',        -- Not yet addressed
    'addressed',   -- The target claim/evidence was updated or responded to
    'acknowledged',-- The claim author acknowledged the inquiry
    'closed'       -- Marked as resolved by the inquirer
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraint: exactly one target
  constraint inquiry_item_one_target check (
    (case when claim_id is not null then 1 else 0 end +
     case when evidence_id is not null then 1 else 0 end) = 1
  )
);

create index idx_inquiry_items_room on public.inquiry_items(room_id, created_at desc);
create index idx_inquiry_items_claim on public.inquiry_items(claim_id);
create index idx_inquiry_items_evidence on public.inquiry_items(evidence_id);
create index idx_inquiry_items_creator on public.inquiry_items(created_by);
```

### Supplementary Table: `inquiry_responses`

```sql
create table public.inquiry_responses (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 10),
  created_at timestamptz not null default now()
);

create index idx_inquiry_responses_item on public.inquiry_responses(inquiry_item_id);
```

---

## 4. UX Model

### Debate Side Picker (Revised)

```
┌─────────────────────────────────────┐
│  How do you want to participate?    │
│                                     │
│  ┌─────────────────┐ ┌───────────┐  │
│  │ Support the     │ │ Challenge  │  │
│  │ Motion          │ │ the Motion│  │
│  │ (I believe yes) │ │ (I believe│  │
│  │                 │ │ no)       │  │
│  └─────────────────┘ └───────────┘  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔍 INQUIRY                     ││
│  │ I'm investigating — ask        ││
│  │ questions, request evidence,   ││
│  │ challenge assumptions          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Inquiry Mode — Side Picker Expanded

When user selects Inquiry:

```
┌─────────────────────────────────────┐
│  🔍 You are in Inquiry mode        │
│                                     │
│  As an inquirer, you can:           │
│  • Ask questions about claims       │
│  • Request evidence sources         │
│  • Challenge underlying assumptions │
│  • Request clarification            │
│                                     │
│  You will remain neutrally visible  │
│  until you choose a side.           │
│                                     │
│  [Switch to Support]                │
│  [Switch to Challenge]              │
└─────────────────────────────────────┘
```

### Inquiry Item on a Claim

When on the "Claims" tab, each claim card gains an "Inquiry" action:

```
┌─────────────────────────────────────────────┐
│ [CLAIM] [Proposition] [Scientific Consensus]│
│                                             │
│ "Climate change is primarily caused by      │
│  human activity"                            │
│                                             │
│  [👍 12]  [👎 3]  ████████████░░░░ 80%     │
│                                             │
│  🔍 Ask  📄 Request Evidence  💡 Challenge │
│  [3 inquiries]                              │
└─────────────────────────────────────────────┘
```

### Inquiry Panel

When inquiries exist, they display as a collapsible panel below the claim:

```
┌─────────────────────────────────────────────┐
│ 🔍 Inquiries (3) — [Expand]                │
│                                             │
│  "What is the specific percentage of        │
│   human contribution?"                      │
│   — John (Inquiry)                          │
│  ┌─ Response: ">95% per IPCC AR6"          │
│  │  — Alice (Support)  ✓ Acknowledged      │
│  └─                                         │
│                                             │
│  "Can you provide a source for the 97%      │
│   consensus figure?"                        │
│   — Maria (Inquiry)                         │
│  ┌─ Response: [Source: Cook et al. 2013]   │
│  └─  — Alice (Support)  ✓ Acknowledged     │
│                                             │
│  [Post Inquiry]                             │
└─────────────────────────────────────────────┘
```

### Inquiry Button States

| Context | Button | Behavior |
|---------|--------|----------|
| Claim — not in inquiry mode | 🔍 Ask | If user is Support/Challenge, prompt: "Ask as Inquiry or switch to Inquiry mode?" |
| Claim — inquiry mode | 🔍 Ask | Opens inquiry creation form |
| Claim — `evidence_request` | 📄 Request Evidence | Auto-sets `inquiry_type = 'evidence_request'` |
| Claim — `assumption_challenge` | 💡 Challenge | Auto-sets `inquiry_type = 'assumption_challenge'` on selected text |
| Evidence — any mode | 🔍 Ask Question | Attaches inquiry to the evidence item |

---

## 5. Reputation Implications

### New Inquiry-Related Reputation Events

Designed but not implemented (truth-seeking phase):

| Event | Points | Trigger |
|-------|--------|---------|
| `INQUIRY_POSTED` | +5 | Inquiry item created |
| `INQUIRY_ANSWERED` | +3 | Inquiry item status → `addressed` |
| `INQUIRY_ACKNOWLEDGED` | +2 | Inquiry item status → `acknowledged` |
| `EVIDENCE_PROVIDED_FOR_INQUIRY` | +5 | Evidence created in response to an inquiry |

### Rationale

- Inquirers should be rewarded for asking good questions (higher quality contributions = higher points)
- Answerers should be rewarded for responsiveness (intellectual honesty bonus)
- Acknowledgment rewards openness to scrutiny

### No Negative Reputation for Inquiries

Inquiries are never penalized. Even a poorly framed question should not reduce reputation — it indicates engagement, not bad behavior.

---

## 6. Moderation Implications

### Inquiry-Specific Moderation Risks

| Risk | Mitigation |
|------|-----------|
| Bad-faith inquiries (sealioning) | Inquiries from users who have never supported/challenged any claim may be flagged as sealioning. Moderators can close inquiries without response. |
| Inquiry as bypass | If Support/Challenge user uses "Ask" instead of "Claim" to avoid position-taking, treat as regular inquiry (no penalty, but mark as "Support-mode inquiry" in metadata). |
| Harassment via inquiry | Same report flow as claims/evidence. Inquiries are subject to `moderation_flags`. |

### Inquiry Visibility

- Inquiries and their responses are **public** in the debate room (same visibility as claims)
- Inquiry status changes are **auditable** (who closed it, when, why)
- Inquiries on moderated content are hidden when the parent claim/evidence is hidden

### Inquiry Limits

| Setting | Default | Rationale |
|---------|---------|-----------|
| Max inquiries per user per debate | 50 | Prevents spam while allowing thorough investigation |
| Max inquiries per claim | 20 | Prevents pile-on; excess inquiries merge into "crowd asks" indicator |
| Min characters for inquiry | 10 | Same as claims — prevents empty/inane posts |

---

## 7. Phase: Inquiry in the Tab Structure

### Current Tabs (identical for debate and discussion)

```
Discussion | Questions | Claims | Evidence | Sources | Map
```

### Proposed Debate Tabs (with inquiry)

```
Thread  |  Claims  |  Evidence  |  Inquiries  |  Sources  |  Map
```

Changes:
- **Thread** replaces "Discussion" — framing changes from "chat" to "structured debate thread"
- **Claims** stays — but is the primary mechanic; claims are side-anchored by default
- **Evidence** stays — feeding claims side-by-side
- **Inquiries** is a new tab — consolidates all open/addressed/closed inquiries across the debate
  - Sortable by: status (open first), claim side, recency, unanswered
  - Shows inquiry status with response count
- **Sources** stays
- **Map** stays
- "Questions" tab is **removed** — questions are now inquiry items attached to claims/evidence

---

## 8. Debate Participation with Inquiry

### Flow: New User Joins

```
1. User enters debate room
2. Sees motion + proposition vs opposition overview
3. Option: "Join as Support / Challenge / Inquiry"
   └─ Or: "I'll just observe" (neutral stays as hidden option)
4. If Inquiry:
   └─ User can browse all claims/evidence
   └─ Every claim/evidence has inquiry action buttons
   └─ Inquiries are displayed inline, below the claim/evidence
5. At any point, user can:
   └─ Switch to Support or Challenge
   └─ Their inquiries remain visible, attributed to them
   └─ Their new claims/evidence show their current side
```

### Flow: Existing Participant Inquires

A Support-side user who wants to better understand a claim on their own side:

```
1. Support user sees a claim from another Support user
2. Clicks "🔍 Clarify" → "What specific evidence supports this?"
3. Inquiry appears below the claim, tagged as "Support-side inquiry"
4. The claim author can respond directly
5. Both sides see the inquiry (transparency)
```

---

## 9. Interaction Map

```
joinDebate(roomId, 'inquiry')
  └─ UPSERT debate_participants (side = 'inquiry')

createInquiryItem({ claim_id, inquiry_type: 'question', content })
  └─ INSERT INTO inquiry_items
       └─ AFTER INSERT trigger: +5 INQUIRY_POSTED

respondToInquiry(inquiry_item_id, content)
  └─ INSERT INTO inquiry_responses
       └─ Marks inquiry status → 'addressed'

acknowledgeInquiry(inquiry_item_id)
  └─ UPDATE inquiry_items SET status = 'acknowledged'
       └─ AFTER UPDATE trigger: +2 INQUIRY_ACKNOWLEDGED

closeInquiry(inquiry_item_id)
  └─ UPDATE inquiry_items SET status = 'closed'
       └─ Only the original inquirer can close
```

---

## 10. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Orphaned inquiries? | Not allowed — must attach to claim or evidence | Prevents floating noise; every question has context |
| Inquiry vs Question tab? | Remove Questions tab; inquiries are richer | Questions tab is generic; inquiries have types, status, responses, and attachments |
| Inquiry side in participants? | `debate_participants.side` accepts `'inquiry'` | Simplest model; updates existing constraint `check (side in (...))` |
| Neutral still exists? | Yes, as hidden option "Observe without participating" | Accessibility for truly passive users |
| Can Support users ask inquiry? | Yes — flagged as "Support-side inquiry" | Supports intellectual honesty within a position |
| Inquiries on resolved claims? | Read-only (can view, cannot create new) | Prevents drive-by questions on settled conclusions |
| Inquiry reputation vs main reputation? | Same reputation pool | Inquiries are contributions, not a separate system |
