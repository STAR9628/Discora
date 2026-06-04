# P0 Fix Implementation Plan — Source Dedup & claim_evidence RLS

Version: 1.0  
Date: 2026-06-03  
Status: Approved for implementation  
Sprint: Pre–Sprint 7 (post–6.5)

---

## Scope

| ID | Issue | Resolution |
|----|-------|------------|
| DB-FUNC-01 | `createEvidence()` SELECT on `sources` fails under `REVOKE SELECT` | `get_or_create_source` SECURITY DEFINER RPC |
| DB-SEC-01 | `claim_evidence` INSERT policy weaker than migration `007` room model | RLS room gate + definer trigger for evidence ownership |

Out of scope for this change set: votes on retracted entities (Phase 3 — proposed only).

---

## Phase 1 — Source Deduplication (DB-FUNC-01)

### Current behavior

1. `createEvidence()` in `discussion-service.ts` calls `.from("sources").select("id")` for URL dedup.
2. Migration `005` revokes `SELECT` on `public.sources` for `anon` and `authenticated`.
3. Fallback insert uses `.select("id")` after INSERT (allowed via RETURNING).
4. Dedup SELECT fails or is denied → second submission with same URL hits `sources_room_url_unique` → user-visible error.

### Risks

| Risk | Severity |
|------|----------|
| Broken evidence submission on reused URLs | High |
| Pressure to grant broad `SELECT` on `sources` | High (would expose `created_by`) |
| Race: concurrent first inserts on same URL | Medium (unique violation) |

### Proposed architecture

**`public.get_or_create_source(p_room_id uuid, p_title text, p_url text) returns uuid`**

- `SECURITY DEFINER`, `SET search_path = public`
- `GRANT EXECUTE` to `authenticated` only
- Returns **uuid only** (no `created_by`, no row payload)

**Algorithm:**

1. Reject if `auth.uid()` is null.
2. Verify room access (same predicate as migration `007` inserts).
3. Validate `p_title` / `p_url` length and `p_url is not null` (match table checks).
4. Lookup `id` from `sources` where `room_id = p_room_id` and `url = p_url`.
5. If found → return `id`.
6. Else `INSERT` source (`created_by` set by existing `set_source_metadata` trigger).
7. On `unique_violation` → re-select and return `id` (concurrency).

### Why RPC over column GRANT or broad SELECT

| Alternative | Rejected because |
|-----------|------------------|
| `GRANT SELECT` on `sources` | Exposes `created_by` to clients; breaks ADR-016 for sources |
| Column-level SELECT on `id` only | Cannot evaluate ownership in app; still need lookup |
| Client-only insert + catch unique error | Poor UX; relies on frontend |
| **SECURITY DEFINER RPC** | Encapsulates lookup+insert; returns id only; reuses `007` room rules |

### Migration

`supabase/migrations/202606030008_p0_source_dedup_and_claim_evidence.sql`

### Service change

Replace dedup SELECT + conditional insert with single `supabase.rpc('get_or_create_source', { ... })`.

### Security implications

- Definer can read `sources` internally; clients cannot.
- Room isolation enforced inside function (not bypassable by client `p_room_id` alone).
- Anonymity: RPC never returns creator metadata.
- Source immutability unchanged (no UPDATE in RPC).

### Rollback

1. Drop function `get_or_create_source`.
2. Revert `createEvidence()` to prior flow (knowing dedup remains broken without SELECT).
3. No data migration required.

---

## Phase 2 — claim_evidence RLS (DB-SEC-01)

### Current behavior

- Policy (`005`): `WITH CHECK (exists (select 1 from claims where claims.id = claim_id))` only.
- Trigger `validate_claim_evidence_rooms`: same `room_id` on claim and evidence (definer).
- Any authenticated user who knows `claim_id` + `evidence_id` in a public room can link **another user's evidence** to any claim.

### Options evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | Room accessibility only | Stops private-room bypass; **does not** stop cross-user evidence attachment in public rooms |
| **B** | Evidence creator must link (`evidence.created_by = auth.uid()`) | Matches product flow: user attaches **their** evidence card to a claim |

**Recommendation: B (evidence ownership)**, implemented via **SECURITY DEFINER trigger**, not RLS subquery on `evidence`.

**Reasoning:** RLS `WITH CHECK` subqueries run with caller privileges; `SELECT` on `evidence` is revoked, so `evidence.created_by = auth.uid()` in policy would fail or be unreliable. Definer trigger reads `created_by` internally without granting client SELECT.

Collaborative model preserved: Alice's claim + Bob's evidence → **Bob** creates the link when submitting evidence (already how `createEvidence()` works).

### Proposed architecture

1. **RLS** (replace policy): require claim's room is accessible per migration `007`.
2. **Trigger** `enforce_claim_evidence_link_authorization` BEFORE INSERT:
   - `auth.uid()` present
   - Room accessible (claim's `room_id`)
   - `evidence.created_by = auth.uid()`
3. Keep `validate_claim_evidence_rooms` (restrict to `INSERT` only).

### Security implications

- No privilege escalation: cannot link evidence you do not own.
- Cannot link into inaccessible rooms.
- Trigger + RLS + existing room-match trigger = defense in depth.

### Rollback

1. Drop new trigger function/trigger.
2. Restore prior `claim_evidence` INSERT policy from `005`.

---

## Phase 3 — Votes on Retracted Entities

### Original analysis (pre-009)

`claim_votes` / `evidence_votes` policies (`007`) checked room access only, not `is_retracted`.

### Resolution — **IMPLEMENTED**

**Migration:** `202606030009_block_votes_on_retracted_entities.sql`

- `USING` and `WITH CHECK` require `claims.is_retracted = false` / `evidence.is_retracted = false`
- Blocks INSERT, UPDATE, DELETE (including vote changes) after retraction
- Historical vote rows unchanged; `discussion_claims` / `discussion_evidence` consensus aggregates unchanged

---

## Implementation checklist

- [x] `202606030008_p0_source_dedup_and_claim_evidence.sql`
- [x] Update `createEvidence()` to use RPC
- [x] `npm run lint` / `npm run build`
- [x] Final report to user

---

## Remaining Sprint 7 blockers (after P0)

| Item | Status |
|------|--------|
| DB-FUNC-01 | Resolved by this work |
| DB-SEC-01 | Resolved by this work |
| Question schema / ADR | Still required for Sprint 7 |
| Votes on retracted parents | **RESOLVED** (`009`) |
| Message pagination at scale | Deferred |
