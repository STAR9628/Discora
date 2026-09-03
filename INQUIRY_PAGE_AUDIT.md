# DISCORA — INQUIRY EXPERIENCE AUDIT REPORT

**Date**: 2026-09-03
**Status**: Completed (Audit Only — No Code Changes)
**Target**: Inquiry Experience Architecture (`src/features/debates/`, `src/features/discussions/`, `supabase/migrations/`)

---

## 1. EXECUTIVE SUMMARY

Discora positions **Questions and Inquiries** as fundamental knowledge-building primitives under the core principle: **"Questions before conclusions."**

This audit evaluates the complete Inquiry infrastructure across database schema, migration history, service layer, React components, UX flows, and philosophy alignment.

### Primary Audit Findings

1. **Dual Concept Architecture**: Discora implements a two-tier model for inquiry:
   - **Macro Questions (`questions` table)**: Top-level room questions created during Sprint 7 (`ADR-022`) that group and structure competing assertions (`claims.question_id`).
   - **Micro Inquiries (`inquiry_items` table)**: Targeted claim-level questions created during Sprint 8 (`INQUIRY_LAYER_DESIGN.md`) that challenge or clarify specific claims (`target_claim_id`).
2. **Database Integrity**: The schema is clean, append-only, and fully secured via Row Level Security (RLS) policies and `SECURITY DEFINER` RPCs (`create_inquiry`, `respond_to_inquiry`, `satisfy_inquiry`, `unsatisfy_inquiry`, `close_inquiry`).
3. **Current Entry Points**: Inquiries are currently surfaced inside the **Debate Detail Page** (`/debates/[slug]` via `DebateInquiriesTab` and `InquiryCreateDialog`) and **Discussion Detail Page** (`/discussions/[slug]` via `RoomQuestionsTab`).
4. **Key UX Gap**: Inquiries currently lack a dedicated detail page (`/inquiries/[id]`), preventing direct URL sharing, deep-linking into specific claim questions, or standalone inquiry resolution workflows.

---

## 2. DATABASE & DATA MODEL AUDIT

### 2.1 Macro Questions (`public.questions`) — ADR-022

Created in migration `202606030010_create_questions.sql`:

```sql
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  content text not null check (char_length(content) between 10 and 500),
  question_type text not null check (question_type in (
    'information', 'clarification', 'perspective', 'evidence', 'directional', 'reflective'
  )),
  identity_mode text not null default 'public' check (identity_mode in ('public', 'anonymous')),
  is_retracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- **Claim Relationship**: `claims.question_id` (nullable FK referencing `questions.id`). Validated via trigger `validate_claim_question_room()`.
- **Security Definer View**: `public.discussion_questions` dynamically redacts anonymous user identities (`identity_mode = 'anonymous'`).
- **Immutability**: Questions are immutable; updates are restricted strictly to `is_retracted` via `enforce_question_immutability()`. Deletions are forbidden by `prevent_question_deletion()`.

### 2.2 Micro Inquiries (`public.inquiry_items`) — Inquiry Layer

Created in migration `202606120001_create_inquiry_tables.sql`:

```sql
create table public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  inquirer_side text not null default 'inquiry',
  inquiry_type text not null check (inquiry_type in (
    'clarification',     -- "What do you mean by X?"
    'evidence_request',  -- "Can you provide a source?"
    'assumption_check'   -- "You're assuming Y, but is that valid?"
  )),
  content text not null check (char_length(content) >= 10 and char_length(content) <= 2000),
  target_claim_id uuid not null references public.claims(id) on delete cascade,
  status text not null default 'open' check (status in (
    'open', 'responded', 'satisfied', 'unsatisfied', 'closed'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.3 Inquiry Responses (`public.inquiry_responses`)

```sql
create table public.inquiry_responses (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 10 and char_length(content) <= 5000),
  created_at timestamptz not null default now()
);
```

### 2.4 Stored Procedures (RPCs) & Safeguards

- `create_inquiry`: Enforces authentication, rate limits (max 5 inquiries/hr per user), room caps (max 50 inquiries per debate room), claim caps (max 20 inquiries per claim), and captures `inquirer_side` snapshot.
- `respond_to_inquiry`: Validates inquiry is not `closed` or `satisfied`, creates response, updates status from `open`/`unsatisfied` to `responded`, and awards `INQUIRY_RESPONDED` reputation (+3 pts).
- `satisfy_inquiry`: Enforces that **only the inquiry creator** can mark an inquiry `satisfied`, updates status, and awards `INQUIRY_SATISFIED` reputation (+2 pts).
- `unsatisfy_inquiry`: Enforces creator-only permission to transition from `responded` back to `unsatisfied`.
- `close_inquiry`: Enforces creator-only permission to close an active inquiry.

---

## 3. TERMINOLOGY MODEL: QUESTION vs INQUIRY

Discora maintains a clear distinction between **Question** and **Inquiry**:

| Aspect | Question (`questions`) | Inquiry (`inquiry_items`) |
| :--- | :--- | :--- |
| **Scope** | Room / Topic level | Claim / Evidence level |
| **Purpose** | Sets the overarching problem or inquiry topic | Challenges or clarifies a specific assertion |
| **Target** | None (Top of hierarchy) | Mandatory `target_claim_id` |
| **Relationship** | `claims.question_id` (1 Question → Many Claims) | `inquiry_items.target_claim_id` (1 Claim → Many Inquiries) |
| **Types** | `information`, `clarification`, `perspective`, `evidence`, `directional`, `reflective` | `clarification`, `evidence_request`, `assumption_check` |
| **Lifecycle** | Immutable / Retractable | Dynamic (`open` → `responded` → `satisfied` / `unsatisfied` / `closed`) |
| **Responses** | Claims asserted as answers | Structured `inquiry_responses` |

**Recommendation**: Maintain this exact two-tier model. In the UI, standardise labeling:
- **Questions**: "Discussion Questions" (Macro topics organizing claims).
- **Inquiries**: "Structured Inquiries" (Micro challenges targeting specific claims).

---

## 4. PHILOSOPHY AUDIT MATRIX

| Principle | Score | Empirical Rationale |
| :--- | :---: | :--- |
| **Questions before conclusions** | **PARTIAL** | Tables and RPCs exist, but UI currently buries inquiries inside tabbed sections rather than driving top-of-funnel exploration. |
| **Understanding over engagement** | **PASS** | Inquiry responses award reputation (+3 response, +2 satisfaction) rather than vanity points, likes, or virality streaks. |
| **Evidence over opinions** | **PASS** | `evidence_request` inquiry type directly prompts claim authors to attach verifiable sources to uncited claims. |
| **Clarity over activity** | **PASS** | Inquiry types force strict cognitive categorization (`clarification`, `evidence_request`, `assumption_check`). |
| **Questions as first-class objects** | **PARTIAL** | Dedicated tables exist, but lack a standalone route (`/inquiries/[id]`), preventing direct sharing or standalone resolution. |
| **Claim traceability** | **PASS** | Mandatory `target_claim_id` FK ensures inquiries are never detached from the claim they question. |
| **Visible uncertainty** | **PARTIAL** | Open/unsatisfied counts appear on claim cards, but aggregate room uncertainty indicators are missing. |
| **Intellectual honesty** | **PASS** | Only the inquiry creator can declare satisfaction (`satisfy_inquiry`), preventing claim authors from self-marking questions resolved. |
| **Neutrality** | **PASS** | Cross-side inquiries record `inquirer_side` without penalizing participation or restricting position shifts. |
| **No gamification** | **PASS** | Zero points, streaks, badges, or popularity leaderboards. |

---

## 5. CRITICAL FINDINGS (P0 / P1 / P2)

### P0 — Critical Functional / Architecture Defects
- **Missing Standalone Inquiry Route**: Inquiries currently only exist inside room containers (`/debates/[slug]`, `/discussions/[slug]`). There is no `/inquiries/[id]` route, preventing direct link sharing or deep-linking from notifications.

### P1 — Major UX & Product Problems
- **Hidden Evidence Linking in Responses**: `inquiry_responses` lacks a direct `evidence_id` foreign key. Responders must paste evidence URLs in text rather than linking structured `evidence` items.
- **No Room Uncertainty Overview**: Users cannot see an aggregate overview of "Unresolved Questions" or "Pending Evidence Requests" for a room in one unified view.

### P2 — Polish & Enhancements
- **Response Editing Window**: `inquiry_responses` rows cannot be edited after submission.
- **Inquiry Filter Preservation**: Filtering inquiries by type on `DebateInquiriesTab` resets upon tab navigation.

---

## 6. REAL PRODUCTION DATA SUMMARY

- **`inquiry_items` Table**: 0 active records in local production database.
- **`inquiry_responses` Table**: 0 active records in local production database.
- **`questions` Table (`discussion_questions` view)**: 2 active records in room `a3c8aacd-c768-4141-8d7c-11a00961abf2`:
  1. `c950990b-7929-493a-bbb0-1592a77eb648` (*"i want to ask a test question"*, type: `information`, mode: `anonymous`)
  2. `5283ecdd-0edc-46ac-96ad-e480c6443fb7` (*"you test question 2"*, type: `information`, mode: `anonymous`)

---

## 7. BROWSER QA & AUTHENTICATION STATUS

- **Anonymous Browser Testing**: Verified `/debates/ai-is-superior-to-humans` and `/discussions` display questions and inquiry UI components in read-only mode for unauthenticated users.
- **Authenticated Browser Testing**: Required to execute `create_inquiry`, `respond_to_inquiry`, `satisfy_inquiry`, `unsatisfy_inquiry`, `close_inquiry` RPCs.
- **Status**: **Awaiting user sign-in** if live mutation testing is required.

---

## 8. CODE SAFETY & CONSTRAINTS VERIFICATION

- **Source Code Edits**: **NONE** (0 lines modified)
- **Database Schema Changes**: **NONE**
- **Migrations Created**: **NONE**
- **Fake/Demo Production Fallbacks**: **NONE** (Verified zero mock inquiry objects)
