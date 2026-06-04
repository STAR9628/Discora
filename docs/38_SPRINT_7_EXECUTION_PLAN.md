# Discora — Sprint 7 Execution Plan (Questions Foundation)

Version: 0.1 (Planning)  
Date: 2026-06-03  
Status: **Planning only — no implementation in this document**  
Prerequisite: Preflight complete (`008`, `009`, ADR draft `037`)

Related:

- [docs/37_QUESTION_ARCHITECTURE_ADR_DRAFT.md](37_QUESTION_ARCHITECTURE_ADR_DRAFT.md) — recommended `claims.question_id`
- [docs/23_KNOWLEDGE_MODEL.md](23_KNOWLEDGE_MODEL.md)
- [docs/35_SPRINT_7_READINESS_REVIEW.md](35_SPRINT_7_READINESS_REVIEW.md)

---

## Sprint 7 Goal

Introduce **first-class Questions** in discussion rooms, link **Claims** as optional answers, and enable **room-level question navigation**—without debates, search, AI, moderation, or message voting.

---

## Out of Scope

- Debates, notifications, search, AI, moderation tools
- Message pagination (unless critical bug)
- Question voting (requires ADR amendment — Phase 4 is decision-only)
- Profile or auth changes
- New top-level routes beyond room-scoped UI tabs (no `/questions/[id]` unless explicitly approved later)

---

## Phase 1 — Question Foundation

### Database

- Create `public.questions`:
  - `id`, `room_id`, `created_by`, `content`, `question_type`, `identity_mode`, `is_retracted`, `created_at`, `updated_at`
  - Check constraints aligned with product (content length, `question_type` enum)
  - Immutability / one-way retraction (mirror claims pattern)
- RLS: INSERT/UPDATE (retract) scoped to accessible non-archived rooms (`007` model)
- `REVOKE SELECT` on `questions` for `anon`/`authenticated`
- `discussion_questions` **security definer** view (ADR-016 redaction)
- Indexes: `questions(room_id, created_at desc)`

### Services

- `questions` module or `discussions` subdomain:
  - `getQuestions(roomId)`
  - `createQuestion(data)`
  - `retractQuestion(id)` if applicable
- Mutations return `{ id }` only when identity-sensitive

### UI (minimal)

- Create question form in room (authenticated)
- List questions in room (read via view)

### Exit criteria

- Anonymous questions redacted in view
- Lint/build pass
- Migrations forward-only

---

## Phase 2 — Question → Claim Integration

### Database

- `alter table claims add column question_id uuid references questions(id) on delete set null`
- Trigger: `question_id` room must match `claims.room_id`; immutable after insert
- Index: `claims(question_id, created_at desc)` where `question_id is not null`

### Services

- Extend `createClaim` / extract-claim flow with optional `questionId`
- `getClaims(roomId, questionId?)` filter

### UI

- Question detail panel: claims answering this question
- Extract claim from message with `question_id` context when opened from question
- Claims tab: indicate linked question when present

### Exit criteria

- Claims can exist with or without `question_id`
- Extraction preserves `origin_message_id` and sets `question_id` when applicable

---

## Phase 3 — Navigation

### UI

- **Questions** tab on `/discussions/[slug]` (alongside discussion / claims / evidence)
- Filter claims list by selected question
- Room-level question browsing (chronological or by type)

### Services / hooks

- `useQuestions(roomId)`
- `useClaims(roomId, questionId?)`

### Exit criteria

- User can browse questions and see related claims without new public routes
- `messages.message_type = 'question'` documented as legacy/visual until migrated (optional)

---

## Phase 4 — Consensus Integration (Decision Gate)

### Decision required before any code

- Are Questions votable? **Default: No** (docs/22, docs/23 — votes on Claims/Evidence only)
- If yes: new `question_votes` table + view aggregates + ADR amendment

### Tasks (planning / ADR only in Sprint 7 unless product overrides)

- Review whether consensus on **answers** (claims) is sufficient per question
- Document UX for “question resolved” vs claim retraction
- Confirm retracted-claim vote block (`009`) meets expectations for answered questions

### Exit criteria

- Written decision in approved ADR (promote `037` or new ADR)
- No accidental `question_votes` implementation without approval

---

## Dependencies & Order

```text
Phase 1 (questions table + view)
    └── Phase 2 (claims.question_id)
            └── Phase 3 (navigation UI)
                    └── Phase 4 (ADR vote decision — parallel track)
```

---

## Preflight Completed (before Phase 1)

| Item | Migration / doc |
|------|-----------------|
| DB-FUNC-01 sources dedup | `202606030008` — **RESOLVED** |
| DB-SEC-01 claim_evidence | `202606030008` — **RESOLVED** |
| Votes on retracted entities | `202606030009` — **RESOLVED** |
| Question ADR draft | `docs/37` |
| Domain type clarity | `src/types/domain.ts` `@future` |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `message_type` vs Questions confusion | In-app copy; optional migration later |
| Service file growth | Split question service in Phase 1 |
| View performance | Reuse indexes; avoid extra correlated subqueries until needed |
| Anonymous author UX (edit/retract) | Defer; not Sprint 7 blocker |

---

## Validation (each phase)

- `npm run lint`
- `npm run build`
- Manual: anonymous question, claim link, vote on claim, retract claim → vote blocked (`009`)

---

## Sprint 7 Completion (target)

1. Questions CRUD (create, list, retract) in rooms with anonymity.  
2. Claims optionally tied to one question.  
3. Questions tab + claim filtering.  
4. ADR signed on question voting = no (unless changed).  
