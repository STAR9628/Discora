# Phase 5D Save / Bookmark — Implementation Plan

## 1. Architecture

**Pattern:** Direct Supabase CRUD with RLS + TanStack Query for caching.

**Rationale:**
- Consistent with existing Discora patterns (e.g., votes, preferences)
- No complex multi-step transactions requiring RPCs
- RLS enforces security at database boundary
- TanStack Query provides optimistic updates and cache invalidation

**Data flow:**
```
User clicks Save
  → useSaveTarget hook (TanStack Query mutation)
  → Supabase insert into user_saves
  → RLS validates user_id = auth.uid()
  → On success: invalidate saved list cache
  → On failure: rollback optimistic update, show error toast
```

---

## 2. Database Changes

### 2.1 New Table: `public.user_saves`

```sql
create table if not exists public.user_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('discussion', 'debate', 'claim', 'evidence')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint user_saves_user_target_unique unique (user_id, target_type, target_id)
);

-- Indexes
create index if not exists user_saves_user_created_idx on public.user_saves(user_id, created_at desc);
create index if not exists user_saves_target_idx on public.user_saves(target_type, target_id);

-- RLS
alter table public.user_saves enable row level security;

drop policy if exists "Users can view own saves" on public.user_saves;
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own saves" on public.user_saves;
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own saves" on public.user_saves;
create policy "Users can delete own saves"
  on public.user_saves
  for delete
  to authenticated
  using (user_id = auth.uid());

-- No anon access
-- No public access
```

**Design decisions:**
- No FK to target tables: avoids inference through FK errors, supports polymorphic targets
- `target_type` enum restricts to V1 saveable types
- `on delete cascade` on `user_id`: if user is deleted, their saves are removed
- Unique constraint prevents duplicate saves
- Indexes support both user-centric listing and target-centric lookup

### 2.2 Migration

**File:** `supabase/migrations/202606260001_create_user_saves.sql`

**Content:** Table creation, indexes, RLS policies as defined above.

**No data migration required.** This is a new table.

---

## 3. Migration Plan

| Step | Action | Risk |
|------|--------|------|
| 1 | Create migration file | None |
| 2 | Add to `supabase/deploy_pending_migrations.sql` | None |
| 3 | Run `supabase db push` locally | None — new table only |
| 4 | Deploy `supabase/deploy_pending_migrations.sql` to production | None — additive only |

**Rollback:** `drop table if exists public.user_saves;` — safe, additive migration.

---

## 4. RLS Policies

See Section 2.1 above.

**Security invariants:**
1. Users can only see their own saves
2. Users can only create saves for themselves
3. Users can only delete their own saves
4. Anonymous users have no access
5. No user can enumerate saves belonging to others
6. Private content never leaks through saved list (application-layer filter)

---

## 5. RPC / API Design

**No new RPCs required for V1.**

Direct Supabase CRUD with RLS is sufficient:
- Insert: `supabase.from("user_saves").insert({ user_id, target_type, target_id })`
- Delete: `supabase.from("user_saves").delete().eq("user_id", user_id).eq("target_type", target_type).eq("target_id", target_id)`
- List: `supabase.from("user_saves").select("*").eq("user_id", user_id).order("created_at", { ascending: false })`

**Rationale:** Save operations are simple single-table CRUD. RPCs are reserved for complex multi-table operations (see existing patterns: `create_discussion_room`, `switch_debate_side`).

---

## 6. Service Layer

**New file:** `src/features/saves/services/save-service.ts`

**Functions:**

```typescript
// Check if a target is saved by the current user
export async function isTargetSaved(
  userId: string,
  targetType: SaveTargetType,
  targetId: string
): Promise<boolean>

// Save a target
export async function saveTarget(
  userId: string,
  targetType: SaveTargetType,
  targetId: string
): Promise<void>

// Unsave a target
export async function unsaveTarget(
  userId: string,
  targetType: SaveTargetType,
  targetId: string
): Promise<void>

// List saved targets with optional filter and pagination
export interface SavedItem {
  id: string;
  targetType: SaveTargetType;
  targetId: string;
  createdAt: string;
  // Denormalized metadata (populated by service)
  title?: string;
  slug?: string;
  roomType?: "discussion" | "debate";
  roomTitle?: string;
}

export async function listSavedTargets(
  userId: string,
  options?: {
    targetType?: SaveTargetType;
    limit?: number;
    cursor?: string;
  }
): Promise<{ items: SavedItem[]; nextCursor: string | null }>
```

**Metadata resolution strategy:**
- Service layer batch-fetches target metadata based on `target_type`
- For rooms: query `rooms` + `discussions`/`debates` join
- For claims: query `claims` + `rooms` join
- For evidence: query `evidence` + `rooms` join
- Returns minimal denormalized fields needed for display

---

## 7. Hooks

**New file:** `src/features/saves/hooks/use-saves.ts`

**Hooks:**

```typescript
// Check if a specific target is saved
export function useIsSaved(targetType: SaveTargetType, targetId: string): boolean

// Toggle save (optimistic)
export function useToggleSave(targetType: SaveTargetType, targetId: string): {
  isSaved: boolean;
  isLoading: boolean;
  toggle: () => void;
}

// List saved items
export function useSavedList(options?: {
  targetType?: SaveTargetType;
  limit?: number;
  cursor?: string;
}): {
  items: SavedItem[];
  nextCursor: string | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  refetch: () => void;
}
```

**Pattern:** Consistent with existing hooks in `use-discussions.ts`:
- `useQuery` for reads
- `useMutation` for writes
- `queryClient.invalidateQueries` for cache refresh
- Optimistic updates for toggle

---

## 8. Types

**New file:** `src/features/saves/types.ts`

```typescript
export type SaveTargetType = "discussion" | "debate" | "claim" | "evidence";

export interface UserSave {
  id: string;
  userId: string;
  targetType: SaveTargetType;
  targetId: string;
  createdAt: string;
}

export interface SavedItem {
  id: string;
  targetType: SaveTargetType;
  targetId: string;
  createdAt: string;
  title: string;
  slug?: string;
  roomType?: "discussion" | "debate";
  roomTitle: string;
}
```

**New file:** `src/features/saves/index.ts`

Barrel export for the feature.

---

## 9. Components

### 9.1 SaveButton

**New file:** `src/features/saves/components/save-button.tsx`

**Props:**
```typescript
interface SaveButtonProps {
  targetType: SaveTargetType;
  targetId: string;
  className?: string;
  showLabel?: boolean; // default false on desktop, true on mobile
}
```

**Behavior:**
- If guest: shows tooltip "Sign in to save", click redirects to login
- If authenticated: toggles save state
- Optimistic update with rollback on error
- Accessible: `aria-label`, `aria-pressed`

**Placement locations:**
- `DiscussionHeader` — right side of title area
- `DebateHeader` / `DebatePremise` — right side of premise area
- `ClaimList` claim cards — inline with Retract/Report
- `EvidenceSection` evidence cards — inline with Report
- NOT on contributions, questions, inquiries

### 9.2 SavedPage

**New file:** `src/features/saves/components/saved-page.tsx`

**Route:** `/saved` (new file: `src/app/saved/page.tsx`)

**Structure:**
- Server component guard: redirect guests to `/login?redirectedFrom=/saved`
- Client component for filtering, loading, pagination
- Filter tabs: All, Discussions, Debates, Claims, Evidence
- Card grid: responsive 1/2/3 columns
- Empty state, loading state, error state

### 9.3 SavedCard

**New file:** `src/features/saves/components/saved-card.tsx`

**Props:**
```typescript
interface SavedCardProps {
  item: SavedItem;
  onUnsave: () => void;
}
```

**Display:**
- Type icon + label (Discussion/Debate/Claim/Evidence)
- Title (room title or claim/evidence content preview)
- Room context (for claims/evidence: "Discussion: Should AI...")
- Saved date ("Saved 2 days ago")
- Unsave button

---

## 10. Routes

| Route | File | Access | Description |
|-------|------|--------|-------------|
| `/saved` | `src/app/saved/page.tsx` | Authenticated only | Saved items list with filters |

**Server component guard:**
```typescript
// src/app/saved/page.tsx
import { createServerSupabaseClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";

export default async function SavedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirectedFrom=/saved");
  }
  
  // Fetch initial saved items
  // ...
}
```

---

## 11. Navigation

### 11.1 Desktop Sidebar

**File:** `src/components/layout/sidebar.tsx`

**Change:** Add "Saved" entry between "Debates" and "Profile"

```typescript
{ label: "Saved", icon: Bookmark, href: "/saved" }
```

**Visibility:** Only when `status === "authenticated"`

### 11.2 Settings Page

**File:** `src/features/settings/components/settings-page-client.tsx`

**Change:** Add "Saved" section between "Data & Safety" and "Danger Zone"

```typescript
{ id: "saved", label: "Saved", icon: Bookmark }
```

**Content:** Link to `/saved` with description "Manage your saved discussions, debates, claims, and evidence."

### 11.3 Mobile

**No bottom nav change.** Saved accessible via Settings page.

---

## 12. UX States

| State | Discussion/Debate Header | Claim Card | Evidence Card | Saved Page |
|-------|--------------------------|------------|---------------|------------|
| Unsaved | Bookmark outline + "Save" tooltip | Bookmark outline | Bookmark outline | Card not in list |
| Saving | Loader overlay, disabled | Loader overlay, disabled | Loader overlay, disabled | — |
| Saved | Bookmark filled + "Saved" label | Bookmark filled | Bookmark filled | Card in list |
| Unsaving | Reverts to unsaved | Reverts to unsaved | Reverts to unsaved | Card removed |
| Error | Rollback + toast | Rollback + toast | Rollback + toast | Error state + retry |
| Guest | "Sign in to save" tooltip | "Sign in to save" tooltip | "Sign in to save" tooltip | Redirect to login |

---

## 13. Error Handling

**Save mutation errors:**
- Rollback optimistic update
- Show toast: "Failed to save. Please try again."
- Button remains clickable for retry

**Network errors:**
- Detect offline state
- Disable save buttons
- Show toast: "You appear to be offline."

**Authorization errors:**
- Should not occur (RLS prevents unauthorized saves)
- If occurs: show toast "You don't have permission to save this item."

**Visibility errors:**
- If saved item becomes inaccessible between list fetch and navigation:
  - Show inline message: "This item is no longer accessible."
  - Offer to remove from saved list

---

## 14. Cache Invalidation

**On save:**
```typescript
queryClient.invalidateQueries({ queryKey: ["saved", "list"] });
```

**On unsave:**
```typescript
queryClient.invalidateQueries({ queryKey: ["saved", "list"] });
```

**On visibility change:**
- Not applicable in V1 (user must manually refresh)

**Shared cache keys:**
- `["saved", "list", { filter, cursor }]`
- `["saved", "isSaved", targetType, targetId]`

---

## 15. Testing Strategy

### 15.1 Unit Tests

| Component/Hook | Test Cases |
|---------------|------------|
| `useIsSaved` | Returns correct state, handles loading, handles error |
| `useToggleSave` | Optimistic update, rollback on error, cache invalidation |
| `useSavedList` | Pagination, filtering, empty state, error state |
| `save-service.ts` | `isTargetSaved`, `saveTarget`, `unsaveTarget`, `listSavedTargets` |

### 15.2 Integration Tests

| Flow | Test Cases |
|------|------------|
| Save discussion | Authenticated user saves discussion, appears in `/saved` |
| Save debate | Authenticated user saves debate, appears in `/saved` |
| Save claim | Authenticated user saves claim, appears in `/saved` |
| Save evidence | Authenticated user saves evidence, appears in `/saved` |
| Unsave | Authenticated user unsaves, removed from `/saved` |
| Duplicate save | Second save is idempotent (no duplicate record) |
| Guest save | Guest clicks save, redirected to login, returns to content |
| Private room save | Authorized user saves private room, visible in list |
| Private room access revoked | Saved item hidden from list |
| Archived room | Saved item hidden from list |
| Retracted claim | Saved item hidden from list |
| Pagination | Load more works, cursor advances correctly |
| Filter | Filter tabs show correct subset |

### 15.3 Security Tests

| Test | Expected Result |
|------|----------------|
| User A views User B's saves | Empty / access denied |
| Guest creates save | No record created |
| User saves private room without access | Save button not visible / RLS blocks |
| User accesses `/saved` without auth | Redirect to login |
| Save count not exposed | No count endpoint, no public field |

---

## 16. Browser QA Matrix

| Route | Element | Test |
|-------|---------|------|
| `/discussions/[slug]` | Save button in header | Click saves, shows filled bookmark, persists after reload |
| `/discussions/[slug]/claims` | Save button on claim card | Click saves, appears in `/saved` |
| `/discussions/[slug]/evidence` | Save button on evidence card | Click saves, appears in `/saved` |
| `/debates/[slug]` | Save button in header | Click saves, shows filled bookmark |
| `/saved` | Page load | Shows saved items, filter tabs work |
| `/saved` | Unsave button | Click removes item, list updates |
| `/saved` | Pagination | Load more loads additional items |
| `/saved` | Empty state | Shows when no saves exist |
| `/settings` | Saved link | Navigates to `/saved` |
| Sidebar | Saved link | Navigates to `/saved`, only visible when authenticated |
| Guest view | Save button | Shows login prompt, redirects to login |
| Private debate | Save button | Only visible to authorized users |
| Mobile (375px) | Save button | 44px touch target, visible label |
| Mobile (768px) | Saved page | Single column layout |

---

## 17. Security QA

| Check | Method | Expected |
|-------|--------|----------|
| RLS blocks cross-user save enumeration | Direct DB query as User A for User B's saves | Empty result |
| RLS blocks anonymous save creation | Unauthenticated insert attempt | Error |
| Private metadata not leaked | Save private room, revoke access, inspect saved list | Item hidden, no metadata exposed |
| No save counts exposed | Inspect API responses | No count fields |
| No public save API | Inspect available endpoints | No enumeration endpoint |
| Redirect preservation | Guest save → login → return | Returns to original content |

---

## 18. Performance QA

| Check | Target |
|-------|--------|
| Saved list query (50 items) | < 200ms |
| Save mutation | < 500ms perceived (optimistic) |
| Unsave mutation | < 500ms perceived (optimistic) |
| Filter tab switch | < 100ms (client-side) |
| Load more (20 items) | < 300ms |
| Page initial load | < 1s |

**Load testing:** Simulate 1000 saved items per user, verify pagination and query performance.

---

## 19. Rollback Strategy

**Database rollback:**
```sql
drop table if exists public.user_saves;
```
Safe — no data loss concern (user-generated save preferences).

**Code rollback:**
- Revert feature files: `src/features/saves/`, `src/app/saved/`
- Revert navigation changes: `sidebar.tsx`, `settings-page-client.tsx`
- Revert component changes: remove `SaveButton` from headers/cards
- No migration rollback needed (table can remain unused)

**Feature flag (optional):**
- Wrap save functionality in `NEXT_PUBLIC_ENABLE_SAVES` flag
- Allows instant disable without code deploy
- Not required for V1 but recommended for production safety

---

## 20. Exact Implementation Order

1. **Database migration** — Create `user_saves` table, indexes, RLS
2. **Types** — `SaveTargetType`, `UserSave`, `SavedItem`
3. **Service layer** — `save-service.ts` with CRUD + metadata resolution
4. **Hooks** — `useIsSaved`, `useToggleSave`, `useSavedList`
5. **Components:**
   - `SaveButton` (core component)
   - `SavedCard` (list item)
   - `SavedPage` (full page)
6. **Route:** `src/app/saved/page.tsx`
7. **Navigation:**
   - Add sidebar entry
   - Add settings entry
8. **Integration:**
   - Add `SaveButton` to `DiscussionHeader`
   - Add `SaveButton` to `DebateHeader`/`DebatePremise`
   - Add `SaveButton` to `ClaimList` claim cards
   - Add `SaveButton` to `EvidenceSection` evidence cards
9. **Guest handling:**
   - Login redirect for save attempts
   - Tooltip "Sign in to save"
10. **Testing:**
    - Unit tests for hooks and service
    - Integration tests for save flows
    - Security tests for RLS
11. **QA:**
    - Browser QA matrix
    - Performance QA
    - Accessibility audit
12. **Documentation:**
    - Update `AGENTS.md` with save feature paths
    - Update route map if needed

---

## 21. Files Expected to Change

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/202606260001_create_user_saves.sql` | Database migration |
| `supabase/deploy_pending_migrations.sql` | Add section for new migration |
| `src/features/saves/index.ts` | Feature barrel export |
| `src/features/saves/types.ts` | TypeScript types |
| `src/features/saves/services/save-service.ts` | Service layer |
| `src/features/saves/hooks/use-saves.ts` | React Query hooks |
| `src/features/saves/components/save-button.tsx` | Save/unsave button |
| `src/features/saves/components/saved-card.tsx` | Saved list card |
| `src/features/saves/components/saved-page.tsx` | Saved page client |
| `src/app/saved/page.tsx` | Saved page route |
| `src/features/saves/components/save-button.test.tsx` | Unit tests |
| `src/features/saves/hooks/use-saves.test.ts` | Hook tests |
| `src/features/saves/services/save-service.test.ts` | Service tests |

### Modified Files

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Add "Saved" entry (authenticated only) |
| `src/features/settings/components/settings-page-client.tsx` | Add "Saved" section |
| `src/features/discussions/components/discussion-header.tsx` | Add `SaveButton` |
| `src/features/debates/components/debate-header.tsx` | Add `SaveButton` |
| `src/features/debates/components/debate-premise.tsx` | Add `SaveButton` |
| `src/features/discussions/components/claim-list.tsx` | Add `SaveButton` to claim cards |
| `src/features/discussions/components/evidence-section.tsx` | Add `SaveButton` to evidence cards |
| `src/features/discussions/components/room-evidence-tab.tsx` | Add `SaveButton` to room evidence cards |
| `AGENTS.md` | Update route map and feature ownership |

### Files NOT Changed

- No changes to existing database tables
- No changes to existing RLS policies (except new table)
- No changes to existing RPCs
- No changes to existing services/hooks (new feature module)
- No changes to private debate authorization
- No changes to onboarding

---

## 22. Definition of Done

- [ ] Database migration created and applied to production
- [ ] `user_saves` table exists with correct schema and RLS
- [ ] SaveButton component works on discussions, debates, claims, evidence
- [ ] Optimistic UI with rollback on error
- [ ] Guest redirect to login with `redirectedFrom` preservation
- [ ] `/saved` page loads with filter tabs
- [ ] Saved list hides archived/retracted/deleted/private-no-access items
- [ ] Private debate save does not leak metadata
- [ ] Sidebar entry visible only when authenticated
- [ ] Settings page has Saved section
- [ ] Unit tests pass for hooks, service, components
- [ ] Integration tests pass for all save flows
- [ ] Security QA passes (RLS, no cross-user enumeration, no anonymous access)
- [ ] Performance QA passes (< 200ms list query, < 500ms mutation)
- [ ] Accessibility audit passes (keyboard, screen reader, focus management)
- [ ] Browser QA matrix passes (all routes, mobile, desktop)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No React/hydration errors in console
- [ ] No new network errors
- [ ] Documentation updated

---

## Appendix: SaveButton Integration Points

### DiscussionHeader (`src/features/discussions/components/discussion-header.tsx`)

```tsx
// Add to imports
import { SaveButton } from "@/features/saves/components/save-button";

// Add to header JSX, after the title/description section:
<div className="flex items-center justify-between pt-3">
  <div>{/* existing metadata */}</div>
  <SaveButton targetType="discussion" targetId={room.id} />
</div>
```

### DebateHeader (`src/features/debates/components/debate-header.tsx`)

```tsx
// Add to imports
import { SaveButton } from "@/features/saves/components/save-button";

// Add to header JSX:
<div className="flex items-center justify-between">
  <div>{/* existing content */}</div>
  <SaveButton targetType="debate" targetId={debate.id} />
</div>
```

### ClaimList (`src/features/discussions/components/claim-list.tsx`)

```tsx
// Add to claim card actions, next to Retract and Report buttons:
{isOwnClaim && !isClaimRetracted && (
  <button onClick={() => handleRetract(claim.id)}>Retract</button>
)}
<SaveButton targetType="claim" targetId={claim.id} />
{user && <ReportButton ... />}
```

### EvidenceSection (`src/features/discussions/components/evidence-section.tsx`)

```tsx
// Add to evidence card actions, next to Report button:
<SaveButton targetType="evidence" targetId={evidence.id} />
{user && (
  <Tooltip content="Report evidence">
    <button><Flag /></button>
  </Tooltip>
)}
```

### RoomEvidenceTab (`src/features/discussions/components/room-evidence-tab.tsx`)

Same pattern as `EvidenceSection`.

---

## Appendix: Visibility Query Logic

```typescript
// In save-service.ts — helper to check if a saved target is visible

async function isTargetVisible(userId: string, targetType: SaveTargetType, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "discussion":
    case "debate": {
      const { data } = await supabase
        .from("rooms")
        .select("visibility, status, created_by")
        .eq("id", targetId)
        .single();
      if (!data) return false;
      // Public non-archived OR owner OR participant
      return data.visibility === "public" && data.status !== "archived"
        || data.created_by === userId
        || await hasRoomAccess(targetId);
    }
    case "claim":
    case "evidence": {
      // Get room_id from target, then check room visibility
      const { data } = await supabase
        .from(targetType === "claim" ? "claims" : "evidence")
        .select("room_id, is_retracted")
        .eq("id", targetId)
        .single();
      if (!data) return false;
      if (data.is_retracted) return false;
      return isTargetVisible(userId, "room", data.room_id);
    }
  }
}
```

**Note:** For V1, visibility filtering can be done at the application layer when building the saved list. If performance becomes an issue, this can be moved to a materialized view or RPC in V2.
---

## 23. Pre-Implementation Architecture Review

### 23.1 Polymorphic Target Integrity Decision

**Finding:** Direct CRUD + RLS is sufficient for user_saves table, provided the service layer enforces access checks before insertion.

**Safeguards:**
1. RLS ensures users can only access their own saves
2. Service layer calls has_room_access() for room-linked targets before insert
3. Service layer resolves parent room for claim/evidence targets and checks access
4. No foreign keys to target tables (prevents inference through FK errors)
5. Saved list query filters by visibility at query time

No RPC required for save/unsave operations. The application-layer check is the critical security control.

---

### 23.2 Private Room Security Enforcement

**Database-level:** RLS on user_saves ensures users can only CRUD their own records.

**Application-level:** Service layer must verify has_room_access() before:
- Inserting a save
- Including a saved item in the list response

**UI-level:** Save button must be hidden for users without access to private rooms.

**If access revoked:**
- Save record remains in database
- Item disappears from saved list (query-time filter)
- No metadata leaked (title, premise, claims, evidence all hidden)

---

### 23.3 Saved Page IA Change

**Original:** Card grid (1/2/3 columns).

**Revised:** Compact list with type badges.

**Reason:** Textual/epistemic content is more scannable in a list format. Cards waste vertical space and fragment context.

**File changes:** Update SavedPage and SavedCard components to use list layout instead of grid.

---

### 23.4 Dashboard Architecture

**Recently Saved:**
- Data source: public.user_saves table
- Query: Direct Supabase query with RLS
- Limit: 5 items
- Component: RecentlySavedSection in LoggedInHomepage
- Hook: useRecentlySaved
- Placement: After QuickActions, before PersonalizedUpdates

**Recently Engaged:**
- Data source: New get_my_recent_engagement RPC
- Why new RPC: Existing RPCs return specific engagement types. A unified chronological feed requires merging them. A single-purpose RPC is simpler than client-side merging.
- Limit: 5 items
- Component: RecentlyEngagedSection in LoggedInHomepage
- Hook: useRecentlyEngaged
- Placement: After QuickActions, before PersonalizedUpdates
- View all: None (bounded preview only)

---

### 23.5 Recently Saved Implementation

**New files:**
- src/features/homepage/components/recently-saved-section.tsx
- src/features/homepage/hooks/use-recently-saved.ts

**Modified files:**
- src/features/homepage/components/logged-in-homepage.tsx - add section

---

### 23.6 Recently Engaged Implementation

**New files:**
- src/features/homepage/components/recently-engaged-section.tsx
- src/features/homepage/hooks/use-recently-engaged.ts
- Supabase migration: create get_my_recent_engagement function

**Modified files:**
- src/features/homepage/components/logged-in-homepage.tsx - add section
- supabase/deploy_pending_migrations.sql - add new RPC

---

### 23.7 Key Changes From Original Plan

| Aspect | Original Plan | Revised Plan |
|--------|--------------|--------------|
| Saved page IA | Card grid | Compact list with type badges |
| Dashboard integration | Not specified | Recently Saved + Recently Engaged sections |
| Polymorphic integrity | Assumed RLS sufficient | Application-layer access check required |
| Private room security | Query-time filter only | App check + UI gating + query-time filter |

---

### 23.8 Remaining Risks / Open Questions

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App-layer access check bypassed | LOW | HIGH | Code review, security QA |
| Recently Engaged RPC performance | LOW | MEDIUM | Index on user action tables, limit 5 |
| Dashboard density | LOW | MEDIUM | Bounded to 5 items each, compact design |
| Saved list N+1 | MEDIUM | MEDIUM | Batch metadata resolution |
| Private room metadata leak | LOW | HIGH | Multiple layers: UI gate, app check, query filter |

**Open Questions:**
1. Should Recently Engaged show specific action taken? **Recommendation: YES.**
2. Should Recently Engaged deduplicate by room? **Recommendation: YES, show most recent action.**
3. Should /saved show unavailable items? **Recommendation: YES.**
4. Should there be a /activity page? **Recommendation: NO — defer to V2.**
---

## 24. Updated Definition of Done

- [ ] Database migration created for user_saves table, indexes, RLS
- [ ] get_my_recent_engagement RPC created for dashboard
- [ ] SaveButton component works on discussions, debates, claims, evidence
- [ ] Optimistic UI with rollback on error
- [ ] Guest redirect to login with redirectedFrom preservation
- [ ] /saved page loads with compact list layout and filter tabs
- [ ] Recently Saved section on dashboard (5 items, View all to /saved)
- [ ] Recently Engaged section on dashboard (5 items, no View all)
- [ ] Saved list hides archived/retracted/deleted/private-no-access items
- [ ] Private debate save does not leak metadata
- [ ] Application-layer has_room_access() check before save insert
- [ ] Sidebar entry visible only when authenticated
- [ ] Settings page has Saved section
- [ ] Unit tests pass for hooks, service, components
- [ ] Integration tests pass for all save flows
- [ ] Security QA passes (RLS, no cross-user enumeration, no anonymous access, private room safety)
- [ ] Performance QA passes (< 200ms list query, < 500ms mutation)
- [ ] Accessibility audit passes (keyboard, screen reader, focus management)
- [ ] Browser QA matrix passes (all routes, mobile, desktop)
- [ ] Dashboard QA passes (Recently Saved, Recently Engaged sections)
- [ ] npx tsc --noEmit passes
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] No React/hydration errors in console
- [ ] No new network errors
- [ ] Documentation updated

---

## 25. Updated Files Expected to Change

### New Files

| File | Purpose |
|------|---------|
| supabase/migrations/202606260001_create_user_saves.sql | Database migration |
| supabase/deploy_pending_migrations.sql | Add section for new migration and RPC |
| src/features/saves/index.ts | Feature barrel export |
| src/features/saves/types.ts | TypeScript types |
| src/features/saves/services/save-service.ts | Service layer with access checks |
| src/features/saves/hooks/use-saves.ts | React Query hooks |
| src/features/saves/components/save-button.tsx | Save/unsave button |
| src/features/saves/components/saved-card.tsx | Saved list card (list layout) |
| src/features/saves/components/saved-page.tsx | Saved page client (list layout) |
| src/app/saved/page.tsx | Saved page route |
| src/features/homepage/components/recently-saved-section.tsx | Dashboard Recently Saved |
| src/features/homepage/components/recently-engaged-section.tsx | Dashboard Recently Engaged |
| src/features/homepage/hooks/use-recently-saved.ts | Recently Saved hook |
| src/features/homepage/hooks/use-recently-engaged.ts | Recently Engaged hook |

### Modified Files

| File | Change |
|------|--------|
| src/components/layout/sidebar.tsx | Add Saved entry (authenticated only) |
| src/features/settings/components/settings-page-client.tsx | Add Saved section |
| src/features/discussions/components/discussion-header.tsx | Add SaveButton |
| src/features/debates/components/debate-header.tsx | Add SaveButton |
| src/features/debates/components/debate-premise.tsx | Add SaveButton |
| src/features/discussions/components/claim-list.tsx | Add SaveButton to claim cards |
| src/features/discussions/components/evidence-section.tsx | Add SaveButton to evidence cards |
| src/features/discussions/components/room-evidence-tab.tsx | Add SaveButton to room evidence cards |
| src/features/homepage/components/logged-in-homepage.tsx | Add Recently Saved and Recently Engaged sections |
| AGENTS.md | Update route map and feature ownership |

### Files NOT Changed

- No changes to existing database tables (except new user_saves)
- No changes to existing RLS policies (except new table)
- No changes to existing RPCs (except new get_my_recent_engagement)
- No changes to existing services/hooks (new feature modules only)
- No changes to private debate authorization
- No changes to onboarding

---

## Final V1 Scope

**SAVE/BOOKMARK V1:**

| Object | Decision |
|--------|----------|
| Discussion | YES |
| Debate | YES |
| Claim | YES |
| Evidence | YES |
| Discussion Question | NO (V2) |
| Structured Inquiry | NO (V2) |
| Contribution | NO |
| Search Result | NO |
| Deep Link / Section | NO |

**DASHBOARD V1:**

| Dashboard Feature | V1 |
|---|---|
| Recently Saved | YES |
| Recently Engaged | YES |
| Public save counts | NO |
| Popular saves | NO |
| Save-based recommendations | NO |
| Engagement-based belief inference | NO |
| Ideological personalization | NO |