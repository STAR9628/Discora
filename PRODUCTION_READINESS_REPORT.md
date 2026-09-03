# Production Readiness Report

## Sprint 4 — Complete

Generated: June 10, 2026

---

## Quality Gates

| Gate | Status |
|------|--------|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| ESLint (`npx next lint`) | ✅ 0 warnings, 0 errors |
| Production Build (`npm run build`) | ✅ Passes |

---

## Changes Applied

### P0 — Critical Fixes

| Issue | File | Fix |
|-------|------|-----|
| TDZ Crash | `discussion-room.tsx:65` | Moved `useAuth()` before `userParticipation` — `user` referenced before declaration |
| Comment tree re-render storm | `discussion-room.tsx` | `React.memo` on `CommentItem`, `useMemo` on `buildCommentTree`, `claimedMessageIds`, `msgAuthorIds`, `useCallback` on all comment handlers |
| Debate feed broken | `supabase/` | Created `deploy_pending_migrations.sql` — migration `202606100001` was never applied, `debates` table missing broke `debates!left (*)` joins |
| Discussion feed broken | (same root cause) | Same migration gap — discussion fetcher uses same `debates!left (*)` pattern |

### P1 — Performance

| Issue | File | Fix |
|-------|------|-----|
| Double `computeGraphDepths` | `graph-view.tsx` | Moved `claimDepths` before `graphStats`; `graphStats` now reuses pre-computed depths, eliminating ~250ms+ duplicate traversal |
| Render-body loops on every render | `map-tab.tsx:508-524` | `relationCountsByClaim` and `evidenceCountByClaim` wrapped in `useMemo` |
| Missing `staleTime` on all discussion hooks | `use-discussions.ts` | Added `staleTime: 30_000` to `useMessages`, `useQuestions`, `useClaims`, `useEvidence`, `useRoomEvidence`, `useInfiniteDiscussions`, `useTopics` |
| Missing `staleTime` on all debate hooks | `use-debates.ts` | Added `staleTime: 30_000` to `useDebates`, `useDebate`, `useDebateParticipants`, `useDebateClaimsBySide` |
| Search: no `keepPreviousData` | `use-search.ts` | Added `placeholderData: keepPreviousData` — prevents flash during query transitions |

### P2 — Debate Engine

| Issue | File | Fix |
|-------|------|-----|
| Auto-join silently fails | `debate-service.ts:createDebate` | Changed `.insert()` → `.upsert({...}, { onConflict: "room_id,user_id" })` — mirrors existing `joinDebate` pattern |

### P3 — Mobile UX

| Issue | File | Fix |
|-------|------|-----|
| 6-tab bar overflows on mobile | `discussion-room.tsx` | Added `overflow-x-auto` to tab container, `min-w-max` to inner flex |

### P4 — Empty & Error States

| Issue | File | Fix |
|-------|------|-----|
| Reputation section returns `null` on error | `profile-reputation-section.tsx` | Added error banner with `AlertCircle` icon and message |

---

## Files Created

| File | Description |
|------|-------------|
| `supabase/deploy_pending_migrations.sql` | Combined deploy script for 3 pending migrations |
| `PRODUCTION_READINESS_REPORT.md` | This report |
| `P0_INVESTIGATION_REPORT.md` | Root cause analysis for feed failures (from earlier) |
| `SPRINT_4_AUDIT_REPORT.md` | Full Sprint 4 audit (from earlier) |

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `src/features/discussions/components/discussion-room.tsx` | ~50 | TDZ fix + memoization + mobile overflow |
| `src/features/discussions/components/graph-view.tsx` | ~30 | Graph traversal dedup + removed dead `visibleOpacity` |
| `src/features/discussions/components/map-tab.tsx` | ~35 | Render-body → `useMemo` |
| `src/features/discussions/hooks/use-discussions.ts` | ~14 | `staleTime` on all read queries |
| `src/features/discussions/hooks/use-search.ts` | ~3 | `keepPreviousData` |
| `src/features/debates/hooks/use-debates.ts` | ~6 | `staleTime` on all read queries |
| `src/features/debates/services/debate-service.ts` | ~6 | `insert` → `upsert` for auto-join |
| `src/features/reputation/components/profile-reputation-section.tsx` | ~18 | Error state for failed reputation load |

---

## Remaining Low-Priority Items (Not In Sprint Scope)

| Item | Priority | Notes |
|------|----------|-------|
| Search results `offset` pagination renders client-side count | Low | For >1000 results, counts are truncated; server-side count RPC needed |
| Expand/collapse edge legend on mobile | Low | Graph legend wraps on small screens |
| Comment action row wraps on mobile | Low | Flex-wrap handles it but could be cleaner |
| Discussion health cards stack on narrow screens | Low | Natural column layout provides usable mobile experience |

---

## Verification

- [x] TypeScript: 0 errors
- [x] ESLint: 0 warnings, 0 errors
- [x] Production build: clean
- [x] All 3 pending migrations: deploy script created (apply via Supabase Dashboard)
