# Discora - Sprint 6 Planning (Revised)

Version: 1.1

Status: Proposed

Scope: Structured Knowledge, Voting, and Consensus

Related Documents:

* 01_PRD.md
* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md
* 10_CODEX_CONTEXT.md
* 21_SPRINT_4_DISCUSSIONS_PLAN.md
* 23_KNOWLEDGE_MODEL.md

---

## Purpose

This document outlines the revised planning, architectural integration, and database designs for Sprint 6 (Structured Knowledge, Voting, and Consensus) based on the approved knowledge model constraints in [docs/23_KNOWLEDGE_MODEL.md](file:///d:/Projects/Discora/docs/23_KNOWLEDGE_MODEL.md).

In Sprint 6, Discora transitions from a simple hierarchical comment thread into a structured discourse platform. Users can extract **Claims** from messages, back them up with **Evidence** linked to reusable **Sources**, cast binary **Agree / Disagree** votes on Claims and Evidence, and view dynamic **Consensus Metrics**.

---

## Architectural Decisions & Integration

### 1. Claim Extraction (Promotion)
* **Design**:
  * Unstructured messages can be promoted to Claims without destroying the original comment.
  * A new Claim record is created in `public.claims` containing the statement, the author, and an optional reference link `origin_message_id` pointing to the source message.
  * In the UI, the Claim card links back to the original conversation context: `"Originally asserted in [comment link]"`.

### 2. Restricted Voting Boundaries
* **Design**:
  * Voting is prohibited on free-form Messages.
  * Binary **Agree / Disagree** voting is restricted exclusively to **Claims** and **Evidence** cards.
  * This prevents the conversation feed from becoming a popularity contest, focusing evaluations on logical assertions (Claims) and validity of proof (Evidence).

### 3. Strict Source Pipeline
* **Design**:
  * Sources (URLs/Files) cannot be linked directly to Claims.
  * Instead, we enforce a strict pipeline:
    $$\text{Source} \longrightarrow \text{Evidence} \longrightarrow \text{Claim}$$
  * A Source is attached to an Evidence card, which is then linked to one or more Claims via the `claim_evidence` junction table.
  * This requires users to formulate a specific explanation of the proof (Evidence) instead of just dumping links.

### 4. Dynamic Consensus Calculations
* **Design**:
  * Aggregated vote counts (`agree_count`, `disagree_count`, `consensus_ratio`) are not stored as static columns.
  * Instead, views (`public.discussion_claims` and `public.discussion_evidence`) perform dynamic aggregations on-the-fly.

---

## Database Schema Design

### 1. `public.claims`
Stores structured claims linked to discussions and optionally extracted from comments.
* `id` uuid primary key default gen_random_uuid()
* `room_id` uuid not null references public.rooms(id) on delete cascade
* `created_by` uuid references auth.users(id) on delete set null
* `origin_message_id` uuid references public.messages(id) on delete set null -- Optional link back to discussion source comment
* `content` text not null check (char_length(content) between 25 and 500)
* `claim_type` text not null check (claim_type in ('fact', 'opinion', 'prediction', 'proposal', 'observation'))
* `created_at` timestamptz not null default now()
* `updated_at` timestamptz not null default now()

### 2. `public.sources`
Stores reusable source references (URLs, PDFs).
* `id` uuid primary key default gen_random_uuid()
* `title` text not null
* `url` text unique check (url is not null or file_path is not null)
* `file_path` text -- For PDF/Image uploads
* `is_retracted` boolean not null default false
* `created_by` uuid references auth.users(id) on delete set null
* `created_at` timestamptz not null default now()

### 3. `public.evidence`
Stores specific evidence items linked to sources.
* `id` uuid primary key default gen_random_uuid()
* `source_id` uuid not null references public.sources(id) on delete restrict -- Strict link to Source
* `created_by` uuid references auth.users(id) on delete set null
* `content` text not null check (char_length(content) between 50 and 1000)
* `evidence_type` text not null check (evidence_type in ('scientific', 'statistical', 'documentary', 'visual', 'experiential', 'expert', 'historical', 'logical', 'ethical', 'cultural'))
* `created_at` timestamptz not null default now()
* `updated_at` timestamptz not null default now()

### 4. `public.claim_evidence` (Junction Table)
Links evidence to claims.
* `claim_id` uuid not null references public.claims(id) on delete cascade
* `evidence_id` uuid not null references public.evidence(id) on delete cascade
* `direction` text not null check (direction in ('support', 'contradict', 'context'))
* `created_by` uuid references auth.users(id) on delete set null
* `created_at` timestamptz not null default now()
* Primary Key: `(claim_id, evidence_id)`

### 5. `public.claim_votes`
Stores user agreement votes for Claims.
* `id` uuid primary key default gen_random_uuid()
* `user_id` uuid not null references auth.users(id) on delete cascade
* `claim_id` uuid not null references public.claims(id) on delete cascade
* `vote_type` text not null check (vote_type in ('agree', 'disagree'))
* `created_at` timestamptz not null default now()
* `updated_at` timestamptz not null default now()
* Unique Constraint: `claim_votes_user_claim_unique` on `(user_id, claim_id)`

### 6. `public.evidence_votes`
Stores user agreement votes for Evidence cards.
* `id` uuid primary key default gen_random_uuid()
* `user_id` uuid not null references auth.users(id) on delete cascade
* `evidence_id` uuid not null references public.evidence(id) on delete cascade
* `vote_type` text not null check (vote_type in ('agree', 'disagree'))
* `created_at` timestamptz not null default now()
* `updated_at` timestamptz not null default now()
* Unique Constraint: `evidence_votes_user_evidence_unique` on `(user_id, evidence_id)`

---

## Dynamic Aggregation Views

```sql
-- View for claims containing dynamic consensus calculations
create or replace view public.discussion_claims as
select
  c.*,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio
from public.claims c
left join (
  select
    claim_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_id
) v on c.id = v.claim_id;

-- View for evidence containing dynamic consensus calculations
create or replace view public.discussion_evidence as
select
  e.*,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio
from public.evidence e
left join (
  select
    evidence_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.evidence_votes
  group by evidence_id
) v on e.id = v.evidence_id;
```

---

## Ticket Mapping & Features

* **CLM-001**: Database migrations for `claims`, `sources`, `evidence`, `claim_evidence`, `claim_votes`, and `evidence_votes` with dynamic views.
* **CLM-002**: Room Page Claims tab displaying claims sorted by newest/consensus.
* **CLM-003**: Message Card UI option to "Extract Claim", opening a modal form to create a claim linked to the message.
* **EVD-001**: Room Page Evidence tab displaying all evidence. Expanding a Claim card dynamically fetches and displays linked Evidence cards.
* **VOT-001**: Dual-button agreement vote components (`Agree` / `Disagree`) on Claim and Evidence cards, triggering client mutations and secure invalidation/refetch.
