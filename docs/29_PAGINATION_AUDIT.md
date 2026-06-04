# Discora — Pagination Audit (Sprint 6.5)

Version: 1.1  
Date: 2026-06-03  
Scope: `getDiscussions`, `getMessages`, `getClaims`, evidence loaders  
Status: **Feed cursor fixed** — other lists deferred

---

## API Surface Note

Evidence loaders:

- `getEvidenceForClaim(claimId)`
- `getEvidenceForRoom(roomId)`

No unified `getEvidence()`.

---

## `getDiscussions(limit, cursor?, topicId?)` — **RESOLVED (PAG-01)**

| Criterion | Status | Notes |
|-----------|--------|-------|
| Stable ordering | ✓ | `order("created_at", desc).order("id", desc)` |
| Cursor safety | ✓ | Encoded `{createdAt}\|{roomId}` via `encodeDiscussionFeedCursor` |
| Duplicate prevention | ✓ | Keyset: `created_at < ts OR (created_at = ts AND id < id)` |
| Missing records | ✓ | Tie-breaker on `id` |
| Legacy cursors | ⚠ | Old `created_at`-only cursors ignored (re-fetch from start of page 2 safe) |

**Files:**

- `src/features/discussions/services/discussion-service.ts` — `parseDiscussionFeedCursor`, `encodeDiscussionFeedCursor`, `.or(...)` filter
- `src/features/discussions/hooks/use-discussions.ts` — `getNextPageParam` uses composite cursor

---

## `getMessages(roomId)` — **DEFERRED**

| Criterion | Status |
|-----------|--------|
| Pagination | ✗ Not implemented (out of scope) |
| Ordering | ✓ `created_at asc` |
| Index support | ✓ `messages_room_id_created_at_idx` for future keyset |

---

## `getClaims(roomId)` — **DEFERRED**

| Criterion | Status |
|-----------|--------|
| Pagination | ✗ Not implemented |
| Ordering | ✓ `created_at desc` |
| Index support | ✓ `claims_room_id_created_at_idx` for future keyset |

---

## `getEvidenceForClaim` / `getEvidenceForRoom` — **DEFERRED**

| Function | Pagination |
|----------|------------|
| `getEvidenceForClaim` | ✗ |
| `getEvidenceForRoom` | ✗ (duplicates possible across claims) |

Index `evidence_room_id_created_at_idx` added for future use.

---

## Fixes Applied

| ID | Fix |
|----|-----|
| PAG-01 | Composite keyset cursor for discussion feed |

---

## Deferred (explicit)

1. Message pagination
2. Claims pagination
3. Evidence pagination
4. `getEvidenceForRoom` deduplication
5. `limit+1` has-next-page probe (current `length < limit` heuristic retained)

---

## Remaining Risks

- Very large threads / claim lists without pagination
- Feed: concurrent inserts with identical `created_at` still unique by `id` — handled

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
