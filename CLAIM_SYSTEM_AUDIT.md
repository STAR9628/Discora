# Claim System Audit

**Date:** 2026-06-10
**Scope:** Full claim pipeline: creation, storage, display, counting, debate-side linking

---

## PASS / FAIL Matrix

| Step | Status | Evidence |
|------|--------|----------|
| **Claims can be created** | ✅ PASS | `createClaim()` inserts into base `claims` table. RLS allows insert for authenticated users in valid rooms. `handle_claim_identity_mode` trigger sets `created_by`. |
| **Claims are saved** | ✅ PASS (with caveat) | DB constraints enforce 25-500 char content, valid `claim_type`/`context_type`. **One bug fixed below.** |
| **Claims are displayed** | ✅ PASS | `getClaims()` reads from `discussion_claims` SECURITY DEFINER view. Final view includes all columns. |
| **Claims are counted** | ✅ PASS | `discussion_debates` view counts claims per `debate_side`. Vote counts aggregated in view. |
| **Claims linked to debate sides** | ✅ PASS | `debate_side` column stored and exposed in view. Claims tagged with correct side at creation. `getClaimsBySide()` filters by side. Scorecard uses side-filtered queries. |
| **Claims can be voted on** | ✅ PASS | `castClaimVote()` with upsert on `claim_votes`. RLS checks: user ownership, room accessibility, non-retracted status. |
| **Claims can be retracted** | ✅ PASS | `retractClaim()` with immutability trigger ensuring one-way-only retraction. |
| **Claims can be related** | ✅ PASS | `claim_relations` table with support/contradict/refines types, same-room validation. |

---

## Bug Found: Content Length Mismatch (FIXED)

### Root Cause

Frontend validation (`src/features/discussions/validation.ts:38`) required `min(10, ...)` characters, but the database constraint (`supabase/migrations/202606030004_create_claims.sql:55`) enforced `char_length(content) between 25 and 500`.

### Impact

Claims with 10-24 characters would pass frontend validation but be rejected by the database with a 422 error. The mutation would fail silently — the user sees no success but no clear error message either.

### Fix Applied

`src/features/discussions/validation.ts:38`: Changed `.min(10, ...)` → `.min(25, ...)` to match the DB constraint.

---

## Audit Trail

### Files Examined

| File | Lines | Role |
|------|-------|------|
| `src/features/discussions/services/discussion-service.ts` | 1382 | Service: `getClaims`, `createClaim`, `retractClaim`, `castClaimVote` |
| `src/features/discussions/hooks/use-discussions.ts` | 413 | React Query hooks wrapping service functions |
| `src/features/discussions/components/claim-list.tsx` | 1106 | Main claim list with form, voting, evidence, relations |
| `src/features/discussions/components/extract-claim-modal.tsx` | 259 | Modal for creating claims from comments |
| `src/features/discussions/validation.ts` | 111 | Zod schemas |
| `src/features/discussions/types.ts` | 256 | TypeScript types |
| `src/types/domain.ts` | 151 | Domain enums |
| `supabase/migrations/202606030004_create_claims.sql` | 224 | Base claims table + triggers + RLS |
| `supabase/migrations/202606100001_create_debates.sql` | 252 | Final `discussion_claims` view |
| `supabase/migrations/202606090001_fix_claim_vote_rls.sql` | 43 | Claim vote RLS fix |
| `supabase/migrations/202606050003_fix_base_table_select.sql` | 106 | Base table SELECT grants |

### Data Flow

```
UI Form (claim-list.tsx / extract-claim-modal.tsx)
  → claimSchema validation (min 25, max 500)
  → useCreateClaim(roomId)
    → createClaim({ roomId, content, claimType, contextType, identityMode, debateSide, ... })
      → INSERT INTO claims (room_id, content, claim_type, context_type, identity_mode, debate_side, ...)
        → Trigger: handle_claim_identity_mode (sets created_by)
        → Trigger: validate_claim_question_room (validates question_id room match)
        → RLS: "Authenticated users can create claims" (checks room exists)
      → SELECT "id" RETURNING
  → onSuccess: invalidateQueries(["claims", roomId])
```

### View Chain (7 recreations, final at migration 202606100001)

```
claims (base table)
  → discussion_claims view
    → joins profiles for username/avatar
    → aggregates claim_votes for agree/disagree counts
    → computes consensus_ratio
    → exposes user_vote subquery
    → filters moderated content
    → filters room access
    → redacts anonymous identity
```

### Debate-Side Integration

- `debate_side` column added in `202606100001_create_debates.sql`
- Stored at creation time via `debateSide` prop → `createClaim()`
- Rendered as badge in `claim-list.tsx` (lines 461-469)
- Filtered server-side in `getClaimsBySide()` for scorecard
- `getClaims()` returns all claims in room (no side filter) — intentional for non-debate rooms

---

## Remaining Notes

- No `create_claim` RPC — direct table insert via Supabase client (depends on RLS)
- `context_type` default is `'observation'` at DB level; form also defaults to it
- Vote RLS chain is complex (4 iterations) but functional
- Claim relation system supports support/contradict/refines with same-room validation
