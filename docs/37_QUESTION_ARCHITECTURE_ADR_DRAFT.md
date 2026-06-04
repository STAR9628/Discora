# ADR Draft — Question Architecture (Sprint 7)

Version: 0.1 (Draft)  
Date: 2026-06-03  
Status: **Draft — not approved**  
Related: `docs/23_KNOWLEDGE_MODEL.md`, `docs/16_ARCHITECTURE_DECISIONS.md`, `docs/38_SPRINT_7_EXECUTION_PLAN.md`

---

## Context

Discora’s knowledge model positions **Questions** as first-class queries that organize **Claims** (answers/assertions), which are supported by **Evidence** and **Sources**. Sprint 6 deferred relational Questions; `messages.message_type = 'question'` remains a visual flag only.

Sprint 7 must introduce Questions without breaking:

- Room-scoped knowledge (`room_id` on entities)
- ADR-016 anonymous redaction (security definer views)
- ADR-019 immutability / retraction on claims
- Voting only on Claims and Evidence (unless explicitly revised)

---

## Decision Required

How should Claims relate to Questions?

### Option A — Many-to-many: `questions` + `question_claims` + `claims`

```text
questions ──< question_claims >── claims
```

Each row in `question_claims` links one question to one claim (optional metadata: `created_at`, `created_by`, `relation_type`).

#### Pros

- A single claim can answer multiple questions (rare but expressible).
- A question can have many competing claims without duplicating claim text.
- Normalized; no nullable FK on `claims`.

#### Cons

- Extra junction table, RLS, and indexes.
- UI and queries always join through `question_claims`.
- Claim extraction must decide which question(s) to link.
- Higher migration and test surface for Sprint 7 MVP.

#### Migration complexity

**Medium–High:** New `questions` table + `question_claims` + backfill strategy from `message_type` optional.

#### RLS complexity

**Medium–High:** Policies on `questions`, `question_claims`, plus existing `claims` / views. Junction inserts need room-access + ownership rules (pattern from `claim_evidence` hardening).

#### Query complexity

**Medium:** “Claims for question Q” → join. “Question for claim C” → join (or array). Feed of questions → separate query.

#### Fit with knowledge model

Strong when claims are **shared answers** across questions. Weaker fit if product treats each claim as **one answer to one question** (common in Discora’s “structured answer” UX).

---

### Option B — One-to-many: `questions` + `claims.question_id` (nullable FK)

```text
questions ──< claims (question_id nullable)
```

A claim optionally references exactly one question. Unlinked claims remain valid (general room assertions).

#### Pros

- Simple mental model: “this claim answers this question.”
- Straightforward queries: `where question_id = $1`.
- Aligns with `origin_message_id` precedent (optional provenance FK on claims).
- Lower Sprint 7 scope: one column + FK + index on `claims`.
- Extraction flow: set `question_id` when promoting from question context.

#### Cons

- One claim cannot answer two questions without duplicating the claim row (acceptable per immutability — new claim for new question).
- Nullable FK requires discipline in UI (claims tab vs question detail).

#### Migration complexity

**Low–Medium:** `questions` table + `alter table claims add column question_id references questions(id) on delete set null` + index `(room_id, question_id)` or `(question_id, created_at desc)`.

#### RLS complexity

**Medium:** `questions` table + `discussion_questions` view (ADR-016). Claim INSERT/UPDATE policies must ensure `question_id` belongs to same `room_id` (trigger, mirroring `origin_message_id` check).

#### Query complexity

**Low:** Filter claims by `question_id`; list questions by `room_id`.

#### Fit with knowledge model

**Strong** for Discora’s intended flow (docs/23): Question → Claim → Evidence → Source. Matches “competing claims as answers to one question.”

---

## Comparison Summary

| Criterion | Option A (junction) | Option B (`claims.question_id`) |
|-----------|---------------------|-----------------------------------|
| Migration effort | Higher | Lower |
| RLS / views | More surfaces | Fewer surfaces |
| Query ergonomics | Join always | Direct FK filter |
| Multi-question per claim | Native | Duplicate claim rows |
| Sprint 7 MVP fit | Over-engineered | Aligned |
| Consistency with `origin_message_id` | Parallel junction pattern | Parallel optional FK |

---

## Recommendation

**Adopt Option B: `questions` table + nullable `claims.question_id`.**

Unless product explicitly requires **one claim answering multiple questions in Sprint 7**, Option B delivers the knowledge hierarchy with minimal schema drift and matches existing claim provenance patterns.

**Guardrails:**

1. DB trigger: `question_id` null or `questions.room_id = claims.room_id`.
2. `question_id` immutable after claim insert (same class of rule as `origin_message_id`).
3. `discussion_questions` security definer view for anonymous questions.
4. Do **not** add `question_votes` without a separate ADR (keep votes on claims/evidence only).

Option A remains a documented upgrade path if many-to-many is required later (`question_claims` can be added without removing `question_id` if migration path is planned early).

---

## Non-Goals (this ADR draft)

- Implementing schema or UI
- Question voting
- Replacing `messages.message_type = 'question'` in Sprint 7 day one (may coexist during transition)

---

## Open Questions for Approval

1. Can a room have claims with **no** question (general assertions)? → **Yes** (`question_id` nullable).
2. Should questions be immutable / retractable like claims? → **Recommend yes** (separate ADR section at approval).
3. Question slugs or UUID-only routing in room? → Defer to Sprint 7 execution plan / frontend spec.

---

## Approval Checklist

- [ ] Product accepts one-question-per-claim via FK
- [ ] Engineering accepts trigger-enforced room match
- [ ] Anonymous question parity confirmed (view design)
- [ ] Vote boundaries unchanged for questions
