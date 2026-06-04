# ADR Draft — Anonymity-Preserving Moderation Framework (ADR-023)

* **Status:** Finalized (Hardened)
* **Date:** 2026-06-04
* **Author:** Antigravity Architecture Team
* **Related:** `docs/16_ARCHITECTURE_DECISIONS.md`, `docs/43_SPRINT_8_ARCHITECTURE_OPTIONS.md`, `docs/48_ADR_024_MODERATOR_AUTHORIZATION_MODEL.md`, `docs/49_SPRINT_8_GATE_REVIEW.md`

---

## 1. Problem Statement

To launch Discora publicly, we need a moderation framework to handle spam, abuse, and bad-faith actors. However, Discora's anonymity architecture (ADR-016) prevents raw user identity (`created_by` / `user_id`) from being exposed to standard users, and by extension, standard room moderators. 

If a room moderator is given tools to hide flagged content, they must do so **without** accessing the real creator's UUID. If a moderator could view the creator's real identity during review, the anonymity guarantee of the platform would be broken, violating the core privacy requirements of the system.

---

## 2. Constraints

* **Anonymity (ADR-016 Compliance):** No moderator dashboard, API query, or database log may reveal the relationship between an anonymous post/claim/evidence and the author's user ID.
* **RLS Integrity:** RLS policies on the raw tables (`messages`, `questions`, `claims`, `evidence`) must remain strictly enforced. Standard users must not gain administrative access.
* **Immutability (ADR-019/022 Compliance):** Flagged items cannot be edited or modified by moderators. They can only be hidden (soft-deleted) or flagged for review.
* **Audit Trail:** All moderator actions (hiding, dismissals) must be tracked in a queryable, immutable log table to prevent moderator abuse.

---

## 3. Alternatives Considered

### Option A: Direct Moderator Edits / Deletes
Allow moderators to delete rows directly from base tables or overwrite content (e.g. replacing text with `[Deleted by Moderator]`).
* **Why Rejected:** Violates ADR-019 and ADR-022 immutability. Deleting database records breaks the historical integrity of consensus votes and linked evidence graphs. Overwriting text requires bypass triggers which increases complexity and security risk.

### Option B: Polymorphic Flagging Table (`entity_type` + `entity_id` UUID)
Create a generic flags table pointing to any entity ID using polymorphic column pairs.
* **Why Rejected:** Polymorphic relations lack database-level foreign key constraints. If a room or message is deleted, orphan flag rows are left behind, leading to data integrity decay.

### Option C: Normalized Flagging Table with View Filtering (Recommended)
Introduce a `public.moderation_flags` table with separate nullable foreign keys for `message_id`, `question_id`, `claim_id`, and `evidence_id`. Views are updated to filter out hidden content using direct `NOT EXISTS` subqueries.
* **Why Chosen:** Preserves database-level referential integrity via native `FOREIGN KEY ... ON DELETE CASCADE` constraints. Direct view filtering preserves base table immutability while preventing nested scalar function execution overhead.

---

## 4. Finalized Approach

### A. Database Schema & Integrity
1. **`public.moderation_flags` Table:**
   ```sql
   create table public.moderation_flags (
     id uuid primary key default gen_random_uuid(),
     message_id uuid references public.messages(id) on delete cascade,
     question_id uuid references public.questions(id) on delete cascade,
     claim_id uuid references public.claims(id) on delete cascade,
     evidence_id uuid references public.evidence(id) on delete cascade,
     reporter_id uuid references auth.users(id) on delete set null,
     reason text not null,
     status text not null default 'pending' check (status in ('pending', 'resolved_hidden', 'resolved_dismissed', 'resolved_restored')),
     action_taken_by uuid references auth.users(id) on delete set null,
     created_at timestamptz not null default now(),
     resolved_at timestamptz,
     
     -- Enforce that exactly one entity reference is non-null
     constraint exactly_one_entity check (
       (case when message_id is not null then 1 else 0 end +
        case when question_id is not null then 1 else 0 end +
        case when claim_id is not null then 1 else 0 end +
        case when evidence_id is not null then 1 else 0 end) = 1
     )
   );
   ```

2. **Duplicate Report Protection:**
   To block reporting spam, we enforce composite unique constraints restricting a user to a single pending report per entity:
   ```sql
   create unique index unique_pending_message_report on public.moderation_flags (reporter_id, message_id) where status = 'pending';
   create unique index unique_pending_question_report on public.moderation_flags (reporter_id, question_id) where status = 'pending';
   create unique index unique_pending_claim_report on public.moderation_flags (reporter_id, claim_id) where status = 'pending';
   create unique index unique_pending_evidence_report on public.moderation_flags (reporter_id, evidence_id) where status = 'pending';
   ```
   *Rationale:* Unique constraints block database-level flooding. Additionally, application-layer rate limiting will throttled API endpoints to prevent excessive flag submission requests.

### B. Hidden Content Behavior
* **Structured Epistemology (Questions, Claims, Evidence):** Flagged items with status `resolved_hidden` are **removed entirely** from the client-facing views. This preserves knowledge graph integrity (preventing invalid vote aggregation and keeping clean linkages).
* **Chronological Chat (Messages):** To preserve chronological thread alignment and avoid visual pacing confusion, messages are **not** removed; they remain in the view, but their content is redacted to `[Message hidden by moderator]` and their author metadata is cleared to `null`.
  ```sql
  -- Example view projection in discussion_messages:
  case
    when exists (
      select 1 from public.moderation_flags mf
      where mf.message_id = m.id and mf.status = 'resolved_hidden'
    ) then '[Message hidden by moderator]'
    else m.content
  end as content
  ```

### C. View Filtering & Indexing
To avoid the $O(N)$ function scan overhead of nested subqueries, views will directly filter hidden content using `NOT EXISTS` clauses, enabling the Postgres query planner to execute optimized **Hash Anti-Joins**:
```sql
-- Example for discussion_questions view filter:
where not exists (
  select 1 from public.moderation_flags mf
  where mf.question_id = q.id and mf.status = 'resolved_hidden'
)
```
*Required Indexes:*
```sql
create index moderation_flags_message_hidden_idx on public.moderation_flags (message_id) where status = 'resolved_hidden';
create index moderation_flags_question_hidden_idx on public.moderation_flags (question_id) where status = 'resolved_hidden';
create index moderation_flags_claim_hidden_idx on public.moderation_flags (claim_id) where status = 'resolved_hidden';
create index moderation_flags_evidence_hidden_idx on public.moderation_flags (evidence_id) where status = 'resolved_hidden';
```

---

## 5. Knowledge Graph Moderation Semantics

### Propagation Rules
1. **Question Hidden:** Linked Claims **remain visible** in general listings. However, in question-filtered lists, the claims are not served because the parent question is omitted.
2. **Claim Hidden:** Any Evidence supporting or contradicting a hidden claim is **automatically omitted** from the `discussion_evidence` view to prevent orphaned assertions.
3. **Consensus Impact:** Votes cast on hidden Claims/Evidence are excluded from the calculated ratios in public views, preserving the integrity of consensus calculations.

---

## 6. Moderator Queue Query Architecture

The Moderator Dashboard must query from the `public.moderation_flags` table (restricted by RLS) and join against the **redacted views** (`discussion_*`) instead of raw tables:
```sql
select
  f.id as flag_id,
  f.reason,
  f.status,
  f.created_at,
  coalesce(m.content, q.content, c.content, e.content) as content,
  coalesce(m.username, q.username, c.username, e.username) as author_username,
  f.message_id,
  f.question_id,
  f.claim_id,
  f.evidence_id
from public.moderation_flags f
left join public.discussion_messages m on f.message_id = m.id
left join public.discussion_questions q on f.question_id = q.id
left join public.discussion_claims c on f.claim_id = c.id
left join public.discussion_evidence e on f.evidence_id = e.id
where f.status = 'pending';
```
This query ensures that if the author of the reported content is anonymous, their identity displays as `'Anonymous'` with a `null` avatar to moderators, preventing deanonymization leaks.
