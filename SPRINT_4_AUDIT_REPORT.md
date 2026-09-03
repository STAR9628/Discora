# Sprint 4 — Production Readiness Audit Report

**Date:** 2026-06-10
**Project:** Discora
**Audit Type:** Full production readiness

---

## BUILD STATUS

| Gate | Result | Details |
|------|--------|---------|
| **TypeScript** | ✅ PASS | `strict: true`, 0 errors |
| **Lint** | ✅ PASS | 0 errors, 3 warnings (pre-existing, frozen files) |
| **Build** | ✅ PASS | Production build compiles clean |

### 3 Pre-existing Warnings (Frozen)

| File | Warning |
|------|---------|
| `graph-view.tsx:500` | `visibleOpacity` assigned but never used |
| `map-tab.tsx:508` | `relationCountsByClaim` missing useMemo |
| `map-tab.tsx:509` | `evidenceCountByClaim` missing useMemo |

---

## DATABASE AUDIT

### Table Inventory (18 tables)

| Table | Schema | Created In | Status |
|-------|--------|------------|--------|
| `profiles` | public | `202606030001` | ✅ Verified |
| `topics` | public | `202606030003` | ✅ Verified |
| `rooms` (with `room_type` CHECK) | public | `202606030003` | ✅ Verified |
| `discussions` | public | `202606030003` | ✅ Verified |
| `messages` | public | `202606030003` | ✅ Verified |
| `claims` (with `debate_side`) | public | `202606030004` + `202606100001` | ✅ Verified |
| `sources` | public | `202606030005` | ✅ Verified |
| `evidence` | public | `202606030005` | ✅ Verified |
| `claim_evidence` | public | `202606030005` | ✅ Verified |
| `claim_votes` | public | `202606030006` | ✅ Verified |
| `evidence_votes` | public | `202606030006` | ✅ Verified |
| `questions` | public | `202606030010` | ✅ Verified |
| `user_roles` | public | `202606040001` | ✅ Verified |
| `moderation_flags` | public | `202606040001` | ✅ Verified |
| `claim_relations` | public | `202606060001` | ✅ Verified |
| `user_reputation_snapshots` | public | `202606090002` | ✅ Verified |
| `debates` | public | `202606100001` | ✅ Verified |
| `debate_participants` | public | `202606100001` | ✅ Verified |
| `avatars` (storage bucket) | storage | `202606030002` | ✅ Verified |

### View Inventory (7 views)

| View | Purpose | Status |
|------|---------|--------|
| `discussion_messages` | Redacts anonymous identity, hides moderated content | ✅ Verified |
| `discussion_claims` | Vote aggregation + moderation + debate_side + context_type | ✅ Verified |
| `discussion_evidence` | Source join + vote aggregation + moderation | ✅ Verified |
| `discussion_questions` | Redacts anonymous, excludes hidden | ✅ Verified |
| `discussion_claim_relations` | Room-gated relation view | ✅ Verified |
| `discussion_debates` | Aggregates proposition/opposition counts, participant counts | ✅ Verified |
| `moderation_queue` | Redacted queue, role-gated | ✅ Verified |

### RLS Policy Count: ~55 policies across 18 tables + storage bucket
### Index Count: 51 indexes (including 9 partial indexes, 4 unique partial indexes)
### RPC/Function Count: 36 functions (including 11 SECURITY DEFINER triggers, 5 SECURITY DEFINER RPCs, 2 SECURITY INVOKER RPCs)
### Trigger Count: ~25 triggers

### Migration Chain: 22 migrations, all sequential. No gaps.

### Audit Verdict: ✅ PASS

All 22 migrations are accounted for. Every table referenced in TypeScript code has a corresponding migration. No orphaned references, no missing columns, no broken foreign keys.

---

## DEAD CODE REPORT

### 57 Dead Exports Identified

| Category | Count | Details |
|----------|-------|---------|
| **Auth** | 2 | `requireAuth`, `useHasRole` — never imported |
| **Lib utilities** | 2 | `serviceError`, `cn` — never imported |
| **Barrel files** | 2 | `types/index.ts`, `services/supabase/index.ts` — never imported |
| **API types** | 3 | `ApiSuccessResponse`, `ApiErrorResponse`, `ApiResponse` |
| **Profile service** | 2 | `DbProfileRow`, `mapProfileRow` — internal-only exports |
| **Discussion service (Db rows)** | 14 | All `Db*Row` interfaces — internal-only exports |
| **Discussion service (mappers)** | 9 | All `map*Row` functions — internal-only |
| **Discussion service (other)** | 2 | `MutationIdResult`, `parseDiscussionFeedCursor` |
| **Discussion types** | 4 | `Source`, `Evidence`, `ClaimRelation`, `SearchResponse` |
| **Graph utils** | 13 | Validation/analysis functions never called from production code |
| **Debate service** | 1 | `CreatedDebateResult` |
| **Validation schemas** | 2 | `messageSchema`, `MessageFormValues` |
| **Toast method** | 1 | `toast.info` |

### Never-Imported Files

| File | Notes |
|------|-------|
| `src/types/index.ts` | Dead barrel |
| `src/services/supabase/index.ts` | Dead barrel |
| `src/utils/.gitkeep` | Placeholder |
| `src/hooks/.gitkeep` | Placeholder |

### Duplicate Patterns

| Pattern | Files | Impact |
|---------|-------|--------|
| DB row mappers duplicated across services | `profile-service.ts`, `discussion-service.ts`, `reputation-service.ts` | MEDIUM — each feature redefines similar DB-to-domain mapping logic |
| `cn` utility exists but unused | `lib/utils.ts` | LOW — all components use raw className strings |

---

## PERFORMANCE RISKS

| Severity | File | Line | Issue | Recommendation |
|----------|------|------|-------|----------------|
| **CRITICAL** | `map-tab.tsx` | 508–524 | `relationCountsByClaim` and `evidenceCountByClaim` computed in render body, no useMemo. Cascades into downstream memoized hooks. | Wrap in useMemo with `[claimRelations, evidence]` deps |
| **CRITICAL** | `use-debates.ts` | 4–80 | All useQuery hooks lack staleTime (defaults to 0). Every mount triggers refetch. | Set `staleTime: 5 * 60 * 1000` + `refetchOnWindowFocus: false` |
| **CRITICAL** | `graph-view.tsx` | 378–463 | `computeGraphDepths` runs twice per render — inside graphStats memo AND standalone claimDepths memo. Double O(V+E) traversal. | Hoist to a single shared useMemo |
| **HIGH** | `discussion-room.tsx` | 1070–1486 | `CommentItem` (recursive tree) is NOT wrapped in React.memo. Every parent state change re-renders entire comment tree. | Wrap in React.memo with comparator |
| **HIGH** | `discussion-room.tsx` | 127–261 | 5 message handlers (`handleNavigateToClaim`, `handlePostMain`, etc.) are plain functions, not useCallback. Breaks child memoization. | Wrap each in useCallback |
| **HIGH** | `graph-view.tsx` | 589–657 | `renderClaimCard` and `renderGraphSection` defined inside component body — recreated every render. | Extract to standalone memoized components |
| **HIGH** | `graph-view.tsx` | 820–946 | SVG edge layer re-renders all edges on every position change. For 50+ edges this causes visible lag. | Split into `EdgesLayer` with React.memo |
| **MEDIUM** | `discussion-room.tsx` | 263 | `buildCommentTree(messages)` called on every render without useMemo | Wrap in useMemo([messages]) |
| **MEDIUM** | `discussion-room.tsx` | 118–119 | `msgAuthorIds` recreates array every render, triggering downstream query key changes | Wrap in useMemo |
| **MEDIUM** | `use-search.ts` | 14–16 | No `refetchOnWindowFocus: false` — search refetches on tab switch | Add `refetchOnWindowFocus: false` |
| **MEDIUM** | `use-search.ts` | 10–17 | No `placeholderData: keepPreviousData` — search results flash loading on query change | Add `placeholderData: keepPreviousData` |
| **MEDIUM** | `use-batch-reputation.ts` | 6–23 | No `refetchOnWindowFocus: false` | Add configuration |
| **LOW** | `debate-scorecard.tsx` | 11–13 | Two separate queries for proposition/opposition claims instead of one batch query | Consolidate to single query |
| **LOW** | `debate-service.ts` | 199–209 | All 3 sort branches produce identical SQL ordering | Implement actual different ordering or remove unused options |

---

## MOBILE RISKS

| Severity | File | Lines | Breakpoint | Issue |
|----------|------|-------|------------|-------|
| **HIGH** | `discussion-room.tsx` | 339–361 | 320/375px | 6-tab nav overflows — no `overflow-x-auto` or `flex-wrap` |
| **MEDIUM** | `graph-view.tsx` | 800–817 | 320/375px | Edge legend overflows — no `flex-wrap` |
| **MEDIUM** | `discussion-room.tsx` | 1298–1384 | 320/375px | Comment action row (5+ buttons) overflows — no `flex-wrap` |
| **MEDIUM** | `app-shell.tsx` | 15–20 | 320–768px | `pb-16` + sticky children interaction with mobile nav needs testing |
| **LOW** | `discussion-room.tsx` | 906–935 | 375px | Vote buttons ~28px tall — below 44px minimum touch target |
| **LOW** | `claim-list.tsx` | 907–935 | 375px | Same vote button touch target issue |
| **LOW** | `evidence-section.tsx` | 521–557 | 375px | Evidence vote buttons ~24px — below touch target minimum |
| **LOW** | `graph-view.tsx` | 180 | 320px | Hardcoded 240px card width — single column on small screens |
| **LOW** | `discussion-room.tsx` | 1173 | 320px | Deep comment indent compresses content to ~228px |
| **LOW** | `map-tab.tsx` | 779 | 320px | Floating navigator `sticky bottom-4` + z-index interaction with mobile nav |

---

## TOP 10 PRODUCTION ISSUES

| Rank | Severity | Area | Issue | Effort to Fix |
|------|----------|------|-------|---------------|
| **1** | CRITICAL | Performance | `CommentItem` recursive tree has NO memoization — entire tree re-renders on every state change | 2h |
| **2** | CRITICAL | Performance | Debate hooks have `staleTime: 0` — redundant network requests on every mount | 30min |
| **3** | CRITICAL | Performance | `relationCountsByClaim` / `evidenceCountByClaim` computed in render body (map-tab) | 15min |
| **4** | CRITICAL | Performance | `computeGraphDepths` runs twice per render — double graph traversal | 15min |
| **5** | HIGH | Performance | 5 message handlers in discussion-room are not useCallback'd — breaks memo chains | 1h |
| **6** | HIGH | Mobile | Discussion tab bar overflows on 320px — tabs hidden from user | 30min |
| **7** | HIGH | Visual | Search result cards visually disconnected from design system (different radius, no blur, no shadow) | 1h |
| **8** | HIGH | Consistency | No shared card design component — 5 different card patterns exist | 3h |
| **9** | MEDIUM | Dead Code | 57 dead exports — bundle bloat, maintenance burden | 2h |
| **10** | MEDIUM | Performance | `buildCommentTree` runs every render without useMemo | 15min |

---

## PRODUCT SCORE

| Subsystem | Score (0–10) | Justification |
|-----------|:------------:|---------------|
| **Discussion System** | **7.5** | Core CRUD works reliably. Comment tree is functional but has no memoization (critical perf issue). Tab navigation works on desktop but overflows on mobile. Views are well-constructed with moderation filtering. |
| **Argument Mapping** | **7.0** | Graph visualization is functional with cluster labels, edge legend, and navigator. Performance degrades with 50+ edges (SVG re-render). Double graph depth traversal is wasteful. Missing React.memo on graph sub-components. |
| **Reputation** | **6.5** | Scoring, snapshots, badges, and growth card are implemented. Hooks lack staleTime/window-focus configuration. Reputation cards visually disconnected (no backdrop/shadow, distinct spacing pattern). Timeline and breakdown work but feel unpolished. |
| **Debates** | **6.0** | All CRUD operations exist. Browse page with filter/sort is functional. Two downsides: (1) all 3 sort options produce identical SQL, (2) no staleTime on any hook — refetches aggressively. Scorecard fires 2 separate queries. QA-tested at code level only (no Supabase testing). |
| **Navigation** | **8.0** | Sidebar/fixed layout works correctly. Mobile nav has excellent 64px touch targets. Search is accessible. Only issue: tab sub-navigation in discussion room overflows on mobile. Route structure is clean and RESTful. |
| **Search** | **5.5** | Full-text search via GIN indexes and search_content() RPC works. But: search result cards are completely visually disconnected from the app's design system (different radius, no glassmorphism, no badge containers). No `keepPreviousData` — loading flash on query change. Refetches on window focus unnecessarily. |
| **Profile** | **7.5** | Profile page, editing, avatar upload, username management with 30-day cooldown all work. Reputation section included. Profile form and header use different visual patterns (one glassmorphism, one solid). Cards flat compared to feed design system. |
| **Mobile** | **6.0** | Good foundation: mobile nav, sidebar hide/show, responsive grids. But 3 HIGH/MEDIUM overflow issues (tab bar, legend, action buttons) block full mobile usability. Touch targets below 44px on vote buttons. Floating navigator z-index needs testing on real devices. |

### Overall Score: **6.8 / 10**

---

## RECOMMENDED NEXT PHASE

### **A. Production Polish** ← RECOMMENDED

**Evidence:**

1. **Build is green** — 0 TypeScript errors, 0 lint errors, production compiles clean. No foundational work needed.

2. **Product score average is 6.8/10** — good bones but significant polish gaps across every subsystem:
   - Performance: 4 CRITICAL + 5 HIGH issues found (all fixable, not architectural)
   - Mobile: 1 HIGH + 3 MEDIUM overflow issues (all CSS-only fixes)
   - Visual: Search cards disconnected from design system, card hierarchy undocumented, evidence badges visually distinct
   - Dead code: 57 exports to clean up

3. **The codebase is stable** — all migrations verified, all tables accounted for, RLS verified. The foundation is solid. Now is the time to polish before any feature expansion.

4. **No external dependencies needed** — every issue can be fixed by existing team members with TypeScript, React, and Tailwind CSS skills. No AI/ML expertise required.

5. **User-facing impact is immediate** — fixing memoization will reduce UI lag, fixing mobile overflow will enable phone usage, fixing search cards will improve perceived quality.

**Why not the others:**

- **B. AI Moderation** — Premature. The platform has no user base yet. Moderation flags and queue exist but adding AI before polish would compound technical debt.
- **C. Knowledge Discovery** — Premature. Argument mapping graph already provides cluster labels. Real discovery features require user-generated content volume that doesn't exist yet.
- **D. Public Beta** — Not yet ready. Product score of 6.8/10 with CRITICAL performance issues and HIGH mobile breakages means real users would churn. Fix top 10 issues first (estimated 2–3 sprints).

### Recommended Sprint 5 Scope

```
P1 — Comment memoization (React.memo + useCallback)
P2 — staleTime/refetchOnWindowFocus on all query hooks
P3 — map-tab render-body computation → useMemo
P4 — Tab bar overflow fix + graph legend wrap
P5 — Search card visual redesign
P6 — Remove dead code (57 exports)
P7 — Build shared Card component
P8 — Evidence section visual alignment
```

---

## APPENDIX: Journey Audit Highlights

### Journey 1: New User (Account → Discussion → Question → Claim → Evidence → Reputation)
- ✅ Registration/login flow works
- ✅ Can create/join discussions
- ✅ Can create questions, claims, evidence
- ✅ Reputation accumulates
- ⚠️ No onboarding flow — user lands in empty state with no guidance
- ⚠️ Friction: user must discover how to create claims (no "your first claim" prompt)

### Journey 2: Debate User (Create → Join → Claim → Vote → Scorecard → Resolve)
- ✅ Full debate lifecycle implemented
- ⚠️ Create debate form has multiple required fields — high friction for first-time debate creators
- ⚠️ No debate tutorial/onboarding
- ⚠️ Resolution only available to room creator — non-creator participants have no visibility into resolution timeline

### Journey 3: Research Contributor (Evidence → Reputation → Badges → Expertise)
- ✅ Evidence submission with source dedup works
- ✅ Reputation snapshots and badges implemented
- ⚠️ Badge progress card exists but no badge detail page
- ⚠️ No "my contributions" aggregated view

### Journey 4: Power User (Large discussion → Graph → Search → Cluster exploration)
- ✅ Graph visualization with cluster labels works
- ✅ Full-text search across 5 entity types
- ⚠️ Graph performance degrades with 50+ edges (see CRITICAL perf issues)
- ⚠️ Search results visually disconnected from app design
- ⚠️ No pagination on discussion feeds for rooms with 100s of claims
