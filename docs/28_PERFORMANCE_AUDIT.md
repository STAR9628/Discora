# Discora — Performance Audit (Sprint 6.5)

Version: 1.1  
Date: 2026-06-03  
Scope: `discussion_messages`, `discussion_claims`, `discussion_evidence`, related services  
Status: **Indexes applied** — pagination and view subqueries deferred

---

## Summary

Composite indexes from migration `007` support room-scoped lists and the discussion feed. **Correlated `user_vote` subqueries** in views and **full-room fetches** remain acceptable for MVP but are documented as future scale risks. Feed queries now align with `rooms_discussion_feed_idx`.

---

## View Analysis (unchanged)

- `discussion_claims` / `discussion_evidence`: per-row `user_vote` correlated subquery — **deferred** optimization
- `discussion_evidence`: duplicate rows when evidence links to multiple claims — **deferred**

---

## Indexes

| Index | Status |
|-------|--------|
| `messages(room_id, created_at DESC)` | **Applied** — `messages_room_id_created_at_idx` |
| `claims(room_id, created_at DESC)` | **Applied** — `claims_room_id_created_at_idx` |
| `evidence(room_id, created_at DESC)` | **Applied** — `evidence_room_id_created_at_idx` |
| `rooms(created_at DESC) WHERE room_type = 'discussion'` | **Applied** — `rooms_discussion_feed_idx` |
| `claim_votes(user_id, claim_id)` unique | ✓ Already present |

**Migration:** `202606030007_sprint_65_hardening.sql`

---

## Application Layer

| Function | Status |
|----------|--------|
| `getMessages` | **Deferred** — no pagination |
| `getClaims` | **Deferred** — no pagination |
| `getEvidenceForRoom` | **Deferred** — no pagination; possible duplicates |
| `getDiscussions` | Benefits from `rooms_discussion_feed_idx` + composite cursor (see pagination audit) |
| `createEvidence` source dedup SELECT | **Deferred** — may fail if SELECT on `sources` blocked |

---

## Fixes Applied

| Item | Migration / code |
|------|------------------|
| Composite indexes (4) | `202606030007_sprint_65_hardening.sql` |
| Feed sort uses `created_at`, `id` | `discussion-service.ts` |

---

## Remaining Risks (deferred)

- 10k+ messages per room: full fetch + client tree build
- Correlated `user_vote` at high claim/evidence counts
- Dynamic consensus aggregation on every view read
- Message / claims / evidence pagination not implemented

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
