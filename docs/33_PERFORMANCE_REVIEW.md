# Discora — Performance Review

Version: 1.0  
Date: 2026-06-03  
Scope: SQL views, `discussion-service.ts`, React Query hooks, UI load patterns  
Status: Post–Sprint 6.5 read-only audit

---

## Summary

Current architecture is appropriate for **MVP / early adopters** (hundreds of active users, modest room sizes). Composite indexes and feed keyset pagination from `007` address the highest-impact database gaps for the **discussion feed**. Primary scaling limits are **unbounded in-room fetches** (messages, claims, evidence) and **per-row correlated vote lookups** in views—not connection pooling or Next.js overhead.

---

## Query & View Analysis

### `getDiscussions` — Feed

| Aspect | Assessment |
|--------|------------|
| Pattern | `rooms` + join `topics`, `discussions`, filter `room_type`, keyset on `(created_at, id)` |
| Index | `rooms_discussion_feed_idx` (partial) — **aligned** |
| Limit | Default 10 per page — good |
| Risk | Join cardinality low; RLS on `rooms` evaluated per row |

**MVP limit:** Thousands of discussion rooms with stable pagination.  
**Breaks first at 100k:** Feed query still OK; product noise is operational (many rooms), not single-query melt.

---

### `getMessages` — Room thread

| Aspect | Assessment |
|--------|------------|
| Pattern | `select *` from `discussion_messages` where `room_id`, `order created_at asc` |
| Index | `messages_room_id_created_at_idx` — helps sort |
| Pagination | **None** — loads full thread |

| Scale | Behavior |
|-------|----------|
| 1k users | Fine if avg thread &lt; ~500 messages |
| 10k users | Hot rooms (5k+ messages) → multi-MB payloads, slow client tree build (`buildCommentTree` in `discussion-room.tsx`) |
| 100k users | **First major bottleneck** — DB + API + React render |

**Classification:** Future concern (deferred by product).

---

### `getClaims` — Claims tab

| Aspect | Assessment |
|--------|------------|
| Pattern | Full room list from `discussion_claims`, `created_at desc` |
| Index | `claims_room_id_created_at_idx` |
| View cost | Grouped vote aggregate + **correlated `user_vote` subquery per claim** |

| Scale | Behavior |
|-------|----------|
| 1k users | Hundreds of claims/room OK |
| 10k users | Rooms with 1k+ claims → view latency 100ms–1s+ |
| 100k users | View becomes dominant cost; consider rollups |

---

### `getEvidenceForClaim` / `getEvidenceForRoom`

| Function | Issue |
|----------|-------|
| `getEvidenceForClaim` | Scoped by `claim_id` — OK |
| `getEvidenceForRoom` | Full room via `discussion_evidence`; **duplicate rows** when one evidence links multiple claims (`INNER JOIN claim_evidence`) |

Same correlated `user_vote` cost as claims.

---

### Vote aggregation (database)

```sql
-- discussion_claims (006): per row
(select vote_type from claim_votes where claim_id = c.id and user_id = auth.uid())
```

| Concern | When |
|---------|------|
| Immediate | Low room counts |
| Future | 500+ claims or evidence per room per request |

Grouped `count(*) filter` uses `claim_votes_claim_id_vote_type_idx` — efficient aggregate. Correlated subquery is **O(n)** per row.

---

## React Query Usage

| Hook | Pattern | Assessment |
|------|---------|------------|
| `useInfiniteDiscussions` | Infinite query, composite cursor | ✓ Appropriate |
| `useMessages` | Single query, full room | ⚠ No stale-time tuning documented; refetch on every post |
| `useClaims` | Single query per room | ✓ |
| `useEvidence` | Per `claimId` | ⚠ N+1 if many expanded claims (UI-dependent) |
| `useRoomEvidence` | Full room | ⚠ Duplicates + full scan |
| Vote mutations | Invalidate broad keys | Acceptable MVP; may over-fetch |

**Client default:** `@tanstack/react-query` via `query-provider.tsx` — standard; no abnormal cache abuse observed.

---

## Index Coverage (post–007)

| Query path | Index | Status |
|------------|-------|--------|
| Feed sort | `rooms_discussion_feed_idx` | ✓ |
| Messages by room | `messages_room_id_created_at_idx` | ✓ |
| Claims by room | `claims_room_id_created_at_idx` | ✓ |
| Evidence by room | `evidence_room_id_created_at_idx` | ✓ |
| Votes by claim | `(claim_id, vote_type)` | ✓ |
| Slug lookup | `rooms_slug_idx` | ✓ |
| Parent replies | `messages_parent_message_id_idx` | ✓ |

**Not needed yet:** GIN on content search (search not implemented).

---

## Pagination Readiness

| Surface | Status |
|---------|--------|
| Discussion feed | **Ready** — keyset `(created_at, id)` |
| Messages | **Not ready** — no cursor API |
| Claims | **Not ready** |
| Evidence | **Not ready** |

Indexes support future keyset without migration rewrite.

---

## MVP Limits (practical)

| Resource | Comfortable MVP | Stress point |
|----------|-----------------|--------------|
| Messages / room | &lt; 1,000 | 5,000+ |
| Claims / room | &lt; 200 | 1,000+ |
| Evidence / room | &lt; 500 rows (incl. duplicates) | 2,000+ |
| Feed pages | Unlimited with cursor | — |
| Concurrent voters / claim | Low hundreds | Hot debates |

---

## Scale Scenarios

### ~1k users

| Component | Risk |
|-----------|------|
| Database | Low |
| Supabase API | Low |
| Next.js | Low |
| **First pain** | None expected if room sizes moderate |

### ~10k users

| Component | Risk |
|-----------|------|
| Hot discussion threads | **High** — full message load |
| Popular claim threads | **Medium** — view aggregation |
| Feed | Low |
| **Breaks first** | Large room message fetch + client tree |

### ~100k users

| Component | Risk |
|-----------|------|
| Vote view definition | **High** without redesign |
| Connection / Supabase plan limits | **Medium** |
| Full-table vote aggregates in views | **High** |
| **Breaks first** | Message volume + consensus view CPU |

---

## Immediate vs Future Concerns

### Immediate (fix before heavy evidence / linking traffic)

1. **`createEvidence` source SELECT`** — functional + wasted round-trips (`DB-FUNC-01`).  
2. **`getEvidenceForRoom` duplicates** — inflated payloads (Medium).

### Future (Sprint 7+ or scale sprint)

1. Message pagination + virtualized thread UI.  
2. Claims/evidence pagination.  
3. Replace correlated `user_vote` with join or cached column.  
4. Optional consensus materialization (only if metrics drift or load demands).  
5. Rate limiting for write amplification.

---

## What Not to Optimize Prematurely

- Splitting `discussion-service.ts` for performance (maintainability only).  
- Materialized views at current scale.  
- CDN for Supabase API responses.  
- Debate/realtime until feature exists.

---

## Validation Reference

Sprint 6.5 build/lint pass. No load tests run in this review.
