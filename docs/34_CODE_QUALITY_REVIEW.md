# Discora — Code Quality Review

Version: 1.0  
Date: 2026-06-03  
Scope: `src/features/*`, `src/services/*`, `src/types/*`, `src/app/discussions/*`  
Status: Post–Sprint 6.5 read-only audit

---

## Summary

The codebase follows the intended **feature-module** layout: `discussions`, `auth`, and `profiles` are separated; Supabase access is concentrated in service files; UI components are largely presentational. TypeScript strict mode appears respected (build passes). Technical debt is **moderate and localized**: a large `discussion-service.ts`, stale `domain.ts` types, dead mappers, and Supabase join casts. No evidence of business logic dangerously scattered in UI beyond edit-window display logic.

---

## Feature Architecture

| Module | Responsibility | Verdict |
|--------|----------------|---------|
| `features/discussions` | End-to-end discussion/knowledge UI + services + hooks | ✓ Cohesive |
| `features/auth` | Auth forms, provider, session | ✓ |
| `features/profiles` | Profile CRUD, avatar | ✓ |
| `features/{claims,evidence,...}` | `.gitkeep` placeholders only | ✓ Intentional |

**Observation:** Knowledge entities live under `discussions` rather than split `claims/` / `evidence/` modules. Acceptable for Sprint 6; split when modules grow.

---

## Service Layer

### `discussion-service.ts` (~820 lines)

| Strength | Issue |
|----------|-------|
| Single import surface for hooks | File does too much (feed, messages, claims, evidence, votes) |
| Optional `SupabaseClient` override for SSR | Default `getClient()` always falls back to **browser** client |
| Mappers colocated with queries | `mapMessageRow`, `mapClaimRow` **unused** after 6.5 |

**Refactor candidate (safe):** Extract vote helpers; split by subdomain **without behavior change**.

**Leave untouched for now:** View names, mutation `.select("id")` pattern, cursor encoding.

### `profile-service.ts`

| Strength | Issue |
|----------|-------|
| Clear mapper | None significant |
| Server client passed from `/u/[username]` | — |

### `auth-service.ts`

Thin wrapper over Supabase Auth — appropriate.

---

## Hook Design

| Hook | Pattern | Note |
|------|---------|------|
| `useInfiniteDiscussions` | `useInfiniteQuery` + composite cursor | ✓ |
| `useMessages` / `useClaims` | `useQuery`, key per room | ✓ |
| `usePostMessage` | Invalidates `["messages", roomId]` | ✓ |
| `useVoteClaim` | Invalidates claims | ✓ |

**Gap:** No shared error boundary or typed Supabase errors—throws `Error(message)` only.

---

## Type Safety

| Item | Severity | Location |
|------|----------|----------|
| `as unknown as DbJoinedRoomRow` | Medium | `getDiscussions`, `getDiscussionBySlug`, `createDiscussion` |
| Stale `EvidenceType` = supporting/contradicting/contextual | Low | `domain.ts` — unused by features |
| `VoteTargetType` includes `message` | Low | `domain.ts` — contradicts ADR voting boundaries |
| `Message` type still models raw `userId` | Low | Used for dead `mapMessageRow` |
| Zod schemas | Strength | `validation.ts` aligns with DB checks |

**Recommendation:** Generate `Database` types from Supabase CLI; type joined room queries properly.

---

## Validation Consistency

| Entity | Client (Zod) | Database |
|--------|--------------|----------|
| Discussion opening | min 100 | `discussions` check ≥100 |
| Message | 1–2000 | 1–2000 |
| Claim | 25–500 | 25–500 |
| Evidence | 50–1000 | 50–1000 |
| Source title | 5–150 | 5–150 |

**Aligned.** Evidence requires URL in UI; DB allows `file_path` without URL—intentional partial schema.

---

## Repeated Logic

| Pattern | Occurrences | Refactor? |
|---------|-------------|-----------|
| `castClaimVote` / `castEvidenceVote` | 2 | Safe merge |
| Anonymous checkbox blocks | 4 components | Optional shared component |
| `isAnonymous ? "Anonymous" : username` | Multiple | Optional |

**Do not refactor** for aesthetics alone before Sprint 7.

---

## Dead Code

| Symbol | File | Status |
|--------|------|--------|
| `mapMessageRow` | `discussion-service.ts` | Exported, **zero call sites** |
| `mapClaimRow` | `discussion-service.ts` | Exported, **zero call sites** |
| `DbMessageRow` in mutation path | Same | Only type definition used by dead mapper |
| Future types in `domain.ts` | `src/types/domain.ts` | Unused imports across features |

---

## Weak Typing / Unsafe Casts

- Joined Supabase selects cast through `unknown` — primary technical debt for discussions feed.
- No `any` in `src/features` or `src/services` (verified via search).

---

## Error Handling

| Pattern | Assessment |
|---------|------------|
| `throw new Error(error.message)` | Consistent; loses error codes |
| Page-level try/catch + `console.error` | `discussions/[slug]/page.tsx`, profile page |
| Mutation UI errors | Local state in forms |

**Acceptable for MVP.** Improve when adding toast/logging service.

---

## Maintainability — Areas to Leave Untouched

- Security definer view consumption (`discussion_*` only for reads)  
- `MutationIdResult` pattern  
- Immutability/retraction service contracts  
- Profile username canonicalization service  
- Middleware session refresh pattern  

---

## Technical Debt Register

| ID | Priority | Item |
|----|----------|------|
| CQ-01 | Medium | Split `discussion-service.ts` |
| CQ-02 | Medium | Supabase generated types for joins |
| CQ-03 | Low | Remove dead mappers |
| CQ-04 | Low | Prune or namespace stale `domain.ts` types |
| CQ-05 | Low | Shared vote mutation helper |
| CQ-06 | Future | Server Actions for mutations (optional hardening) |

---

## Validation Reference

`npm run lint` — pass (Sprint 6.5). `npm run build` — pass.
