# Discora — Sprint 7 Readiness Review

Version: 1.1  
Date: 2026-06-03  
Scope: Readiness for first-class **Questions**, Question→Claim relationships, question-centric views, additional voting, knowledge navigation  
**Does not** design Sprint 7 — evaluates fit of current system only.

### Preflight status (Sprint 7)

| Item | Status | Resolution |
|------|--------|------------|
| DB-FUNC-01 (`sources` dedup SELECT) | **RESOLVED** | `202606030008_p0_source_dedup_and_claim_evidence.sql` — `get_or_create_source` RPC |
| DB-SEC-01 (`claim_evidence` RLS) | **RESOLVED** | `202606030008` — room RLS + `enforce_claim_evidence_link_authorization` trigger |
| Votes on retracted claims/evidence | **RESOLVED** | `202606030009_block_votes_on_retracted_entities.sql` |

---

## Sprint 7 Intent (from existing docs)

| Source | Stated direction |
|--------|------------------|
| `docs/23_KNOWLEDGE_MODEL.md` | Questions as first-class queries; hierarchy Question → Claim → Evidence → Source |
| `docs/24_SPRINT_6_EXECUTION_PLAN.md` | Defer structured Questions to Sprint 7; keep `message_type = 'question'` as UI flag only |
| `docs/22_SPRINT_6_PLANNING.md` | Voting only on Claims and Evidence (ADR) |

---

## Current Schema Capabilities

| Capability | Present? | Evidence |
|------------|----------|----------|
| Room-scoped content | ✓ | `room_id` on messages, claims, evidence, sources |
| Anonymous questions (as messages) | Partial | `messages.message_type` in (`message`, `question`) — **not relational** |
| Claim extraction from message | ✓ | `claims.origin_message_id` |
| Claim↔Evidence link | ✓ | `claim_evidence` with `direction` |
| Voting on claims/evidence | ✓ | Typed vote tables + views |
| Immutability + retraction | ✓ | Triggers on knowledge objects |
| Identity redaction pattern | ✓ | Reusable for new `discussion_questions` view |
| Question entity table | ✗ | Not migrated |
| Question→Claim FK/junction | ✗ | Not migrated |
| Question votes | ✗ | By design (ADR); Sprint 7 may add — needs ADR update |
| Question-centric navigation | ✗ | App routes are discussion-slug only |

---

## Extension Points (favorable)

1. **`rooms` as container** — Questions can be `room_id` scoped like claims without debate machinery.  
2. **`origin_message_id` pattern** — Mirror as `origin_question_id` or junction `question_claims`.  
3. **View + REVOKE SELECT pattern** — Established for ADR-016; apply to `questions` if anonymous.  
4. **Vote table pattern** — Separate `question_votes` table preserves ADR Option B integrity.  
5. **`message_type = 'question'`** — Migration path: backfill Questions from flagged messages optional.  
6. **Indexes** — Room-scoped composite index pattern from `007` repeatable for `questions(room_id, created_at desc)`.

---

## Blockers

| Blocker | Severity | Notes |
|---------|----------|-------|
| No `questions` table / RLS / view | **Hard** | Required before first-class feature |
| No Question→Claim relationship | **Hard** | Core Sprint 7 epistemic link |
| ~~`claim_evidence` RLS gap~~ | — | **RESOLVED** (`008`) |
| ~~`sources` dedup SELECT~~ | — | **RESOLVED** (`008`) |
| Monolithic service file | **Soft** | Manageable but slows parallel work |

**None are architectural dead-ends** — schema is extensible.

---

## Risks for Sprint 7

| Risk | Likelihood | Impact |
|------|------------|--------|
| Duplicating message vs question semantics | Medium | User confusion if `message_type` and Questions coexist |
| Voting scope creep (questions votable?) | Medium | ADR conflict unless explicitly revised |
| Navigation complexity (room vs question vs claim URLs) | Medium | Routing/schema design needed early in sprint |
| View performance with more entity types | Low–Medium | More correlated subqueries if pattern copied blindly |
| Anonymous question redaction parity | Medium | Must replicate definer view discipline |

---

## Recommended Preparation (before or day-1 Sprint 7)

| Priority | Work | Status |
|----------|------|--------|
| P0 | Fix `sources` dedup (`DB-FUNC-01`) | **RESOLVED** — `008` |
| P0 | Harden `claim_evidence` RLS (`DB-SEC-01`) | **RESOLVED** — `008` |
| P2 | Block votes on retracted entities | **RESOLVED** — `009` |
| P1 | ADR: Question schema + voting boundaries | **Draft** — `docs/37` |
| P1 | Sprint 7 execution plan | **Draft** — `docs/38` |
| P2 | Split or namespace `discussion-service.ts` | Open |
| P3 | Author `can_manage` without identity leak (optional) | Open |

**Not required for GO:** Message pagination, debates, search, AI.

---

## Schema Shape Options (evaluation only)

| Approach | Pros | Cons |
|----------|------|------|
| **A. `questions` table + `question_claims` junction** | Many-to-many; flexible | More queries |
| **B. `claims.question_id` nullable FK** | Simple “answer to question” | One question per claim |
| **C. Promote `message_type=question` to Questions** | UX continuity | Migration complexity |

**Current schema does not preclude any** — room_id consistency rules already exist.

---

## Knowledge Navigation Readiness

| Feature | Ready? |
|---------|--------|
| Room tabs (discussion / claims / evidence) | ✓ Pattern exists in `discussion-room.tsx` |
| Filter claims by question | ✗ Needs schema + API |
| Question feed within room | ✗ |
| Cross-room question index | ✗ |

UI shell can add a **Questions** tab without routing overhaul; data layer must lead.

---

## Verdict Inputs

| Criterion | Met? |
|-----------|------|
| Core knowledge pipeline production-usable | Yes (post-`008`) |
| Security baseline for anonymous | Yes (reads + mutations) |
| Extensible room model | Yes |
| Clean migration discipline | Yes (forward-only culture) |
| Team velocity blockers | Minor fixes, not rewrites |

---

## Sprint 7 Readiness (see `implementation_review.md`)

**READY**

Historical conditions (Sprint 6.5 / preflight) — status:

1. ~~`sources` SELECT / dedup (`DB-FUNC-01`)~~ — **RESOLVED** (`008`).  
2. ~~`claim_evidence` INSERT policy (`DB-SEC-01`)~~ — **RESOLVED** (`008`).  
3. ~~Votes on retracted entities~~ — **RESOLVED** (`009`).  
4. Approve Question schema ADR (`docs/37`) before Phase 1 migrations — **pending approval**.  
5. Accept deferred pagination (MVP room size limits) — unchanged.
