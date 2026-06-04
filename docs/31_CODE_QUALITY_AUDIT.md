# Discora — Code Quality Audit (Sprint 6.5)

Version: 1.0  
Date: 2026-06-03  
Scope: `src/features`, `src/services`, `src/types`, discussion hooks  
Status: Audit complete — **no refactors applied**

---

## Summary

Discussion feature module is cohesive: services hold data access, hooks wrap React Query, components stay mostly presentational. Main quality issues tie to **security** (raw mutation returns), **type drift** in `domain.ts`, and **large monolithic** `discussion-service.ts`. Lint and build pass on current tree.

---

## Duplication

| Area | Finding |
|------|---------|
| Mapper boilerplate | `mapTopicRow`, `mapRoomRow`, `mapDiscussionRow` follow same pattern — acceptable |
| Vote functions | `castClaimVote` / `castEvidenceVote` nearly identical — **safe refactor:** shared internal helper |
| Anonymous UI strings | Repeated `isAnonymous ? "Anonymous" : username` in components — optional tiny helper |
| Identity toggle UI | Repeated checkbox blocks in claim-list, evidence-section, extract-claim-modal |

**Proposed safe refactor:** Extract `castVote(table, entityId, voteType)` private helper only (no behavior change).

---

## Dead / Unused Code

| Item | Location | Recommendation |
|------|----------|----------------|
| `mapMessageRow` return from mutations | Only used post-insert; result unused in UI | Stop returning full row or use redacted mapper |
| `DbMessageRow` / `Message` in mutation paths | discussion-service | Prefer minimal return type |
| `src/types/domain.ts` future types | `DebatePosition`, `EvidenceType` (supporting/contradicting), `VoteTargetType` includes `message`, etc. | Mark deprecated or move to `domain-future.ts` — **not imported** by features |
| Feature `.gitkeep` folders | claims, debates, evidence, sources, questions, notifications | Intentional placeholders |
| Sprint 4 realtime (`message_events`) | Documented, not implemented | Out of scope |

---

## Weak Typing

| Location | Issue |
|----------|-------|
| `discussion-service.ts:204,238,293` | `as unknown as DbJoinedRoomRow[]` — bypasses Supabase generated types |
| `createDiscussion` RPC | `roomId` untyped from RPC return |
| `postMessage` insert | Cast `as DbMessageRow` |

**Proposed fix (safe):** Generate Supabase types (`supabase gen types`) and use `Database['public']['Tables']['rooms']['Row']` joins — incremental.

---

## `any` Usage

No explicit `any` in `src/features` or `src/services`. ✓

---

## Error Handling

| Function | Pattern | Gap |
|----------|---------|-----|
| Most service functions | `throw new Error(error.message)` | ✓ Consistent |
| `getDiscussionBySlug` page | try/catch logs, returns notFound | ✓ |
| `createEvidence` source lookup | No handling if SELECT on `sources` forbidden | May throw opaque error |
| Mutations in UI | try/catch with user message | ✓ |

**Proposed fix:** After sources SELECT policy clarification, handle dedup failure gracefully.

---

## Architecture Alignment

| Rule | Status |
|------|--------|
| Business logic out of UI | Mostly ✓; edit window timer in `CommentItem` is UI-only (DB enforces truth) |
| Feature-based structure | ✓ discussions + profiles + auth |
| Server redaction | ✓ reads; ✗ writes (ANON-01/02) |

---

## File Size / Maintainability

`discussion-service.ts` (~790 lines) mixes feed, messages, claims, evidence, votes.

**Proposed safe split (optional):**

- `discussion-feed-service.ts`
- `discussion-messages-service.ts`
- `discussion-knowledge-service.ts`

Defer unless team wants split in 6.5.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | **Pass** (exit 0) |
| `npm run build` | **Pass** (exit 0) |

Run again after fixes are applied.

---

## Fixes Applied

None (pending approval).

---

## Safe Refactor Checklist (If Approved)

- [ ] Remove identity fields from mutation `.select()` clauses
- [ ] Shared vote helper
- [ ] Composite cursor for discussions feed
- [ ] Do **not** rename routes or add features
