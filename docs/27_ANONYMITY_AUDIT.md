# Discora — Anonymous Identity Audit (Sprint 6.5)

Version: 1.1  
Date: 2026-06-03  
Scope: `discussion_messages`, `discussion_claims`, `discussion_evidence` + application layer  
Status: **Critical mutation leaks fixed** — author UX gaps deferred

---

## Expected Client Contract

For `identity_mode = 'anonymous'`, consumers must only see:

| Field | Expected |
|-------|----------|
| `userId` / `createdBy` | `null` |
| `username` | `"Anonymous"` |
| `avatarUrl` | `null` |

---

## Database Views — PASS (unchanged)

Security definer views redact anonymous authors on all **SELECT** paths. `REVOKE SELECT` on raw tables for `anon`/`authenticated` remains in place.

---

## Leaks — Resolution Status

### ANON-01 — INSERT/UPDATE RETURNING exposed `user_id` — **RESOLVED**

**Fix:** `postMessage` and `updateMessage` now use `.select("id")` only and return `MutationIdResult`. UI continues to refetch `discussion_messages` after mutations.

**File:** `src/features/discussions/services/discussion-service.ts`

---

### ANON-02 — Claim mutations exposed `created_by` — **RESOLVED**

**Fix:** `createClaim` and `retractClaim` use `.select("id")` only and return `MutationIdResult`.

---

### ANON-03 — Anonymous authors cannot retract (UI) — **DEFERRED**

`claim-list.tsx` still uses `claim.createdBy === user?.id`. Redacted view returns `createdBy = null` for anonymous claims → retract button hidden. DB retract policy still works if invoked directly.

**Not implemented** per Sprint 6.5 scope (ownership UI redesign).

---

### ANON-04 — Anonymous authors cannot edit (UI) — **DEFERRED**

`discussion-room.tsx` still compares `message.userId` to `currentUserId`. Anonymous messages have `userId = null` in the view.

**Not implemented** per Sprint 6.5 scope.

---

### ANON-05 — `identity_mode` visible (Low)

**Deferred** — acceptable; not an identity leak.

---

### ANON-06 — Return types — **RESOLVED**

Mutations return `MutationIdResult` (`{ id: string }`), not `Message` / `Claim` with identity fields.

---

## Services / Mappers (post-fix)

| Function | Source | Redaction |
|----------|--------|-----------|
| `getMessages` | `discussion_messages` | ✓ |
| `getClaims` | `discussion_claims` | ✓ |
| `getEvidenceForClaim` / `getEvidenceForRoom` | `discussion_evidence` | ✓ |
| `postMessage` / `updateMessage` | `id` only from `messages` | ✓ No identity in response |
| `createClaim` / `retractClaim` | `id` only from `claims` | ✓ No identity in response |
| `mapMessageRow` / `mapClaimRow` | — | No longer used by mutations |

---

## React Components

Display paths unchanged and correct for other users. **ANON-03/04** author-only UX gaps remain.

---

## Fixes Applied

| ID | Fix |
|----|-----|
| ANON-01 | `.select("id")` on message insert/update |
| ANON-02 | `.select("id")` on claim insert/retract |
| ANON-06 | `MutationIdResult` return type |

---

## Remaining Risks

| ID | Severity | Notes |
|----|----------|-------|
| ANON-03 | Medium | Author UX — **deferred** |
| ANON-04 | Medium | Author UX — **deferred** |
| service_role / superuser | High | Operational |
| New tables without views | High | Regression risk — review on future sprints |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
