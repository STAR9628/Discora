# Phase 5D Save / Bookmark — Redesign

## 1. Product Goal

Enable users to preserve specific rooms and epistemic objects they genuinely want to return to, without transforming Discora into a social bookmarking platform.

**Core principle:** Save is a **private intent signal**, not a social action.

---

## 2. User Mental Model

> "I want to come back to this later."

The user is not "favoriting" or "liking" content. They are creating a personal breadcrumb to something they found epistemically valuable — a room worth continuing, a claim worth revisiting, evidence worth re-examining.

Save communicates **personal utility**, not social approval.

---

## 3. Saveable Objects (V1)

| Target Type | Label in UI | Reason |
|-------------|-------------|--------|
| Discussion room | "Discussion" | Core epistemic container. Stable, persistent, meaningful to return to. |
| Debate room | "Debate" | Core epistemic container. Stable, persistent, meaningful to return to. |
| Claim | "Claim" | Atomic epistemic unit. Directly relevant to understanding evolution. |
| Evidence | "Evidence" | Atomic epistemic unit. Supports or challenges claims; worth revisiting. |

**Not saveable in V1:**
- Discussion questions (evolve too quickly, less stable)
- Structured inquiries (evolve too quickly, claim-specific)
- Contributions/messages (ephemeral thread entries)
- Search results (transient query artifacts)
- Room sections/deep links (too granular; rooms are the stable unit)

---

## 4. Explicitly Non-Saveable Objects

- **Contributions / messages:** Ephemeral by nature. Part of a thread, not a standalone epistemic object.
- **Search results:** Reflect a query, not a stable content unit. Saving search results is saving the query, not the content.
- **Room sections:** Saving `/discussions/x/claims` is fragile; if section IA changes, the deep link breaks. Saving the room is more durable.
- **User profiles:** Not epistemic content.
- **Settings/preferences:** Not content to return to.

---

## 5. Guest Behavior

**Flow:**
1. Guest clicks Save button (bookmark icon)
2. Button immediately shows login prompt tooltip: "Sign in to save"
3. Clicking the tooltip or button redirects to `/login?redirectedFrom=<encoded_current_url>`
4. After successful login, user returns to the same content
5. User can now save

**No local temporary saves.** No backend records for guests.

**Rationale:** Consistent with existing Discora auth patterns (e.g., `PrivateAccessGate` redirects guests to login). Avoids edge cases around device transitions, session expiration, and local-only state.

---

## 6. Authenticated Behavior

**Save action:**
1. User clicks Save button
2. Optimistic UI update: button immediately shows saved state
3. Background mutation creates `user_saves` record
4. On success: toast confirmation (optional, non-blocking)
5. On failure: rollback to unsaved state, show error toast

**Unsave action:**
1. User clicks Saved button (now showing "Saved" state)
2. Optimistic UI update: button immediately reverts to unsaved state
3. Background mutation deletes `user_saves` record
4. No confirmation dialog (immediate, reversible via re-save)

**Saved page:**
- Route: `/saved`
- Accessible from sidebar (authenticated users only)
- Mobile: accessible from settings page
- Shows all saved items, newest first
- Items grouped by type (Discussions, Debates, Claims, Evidence)
- Each card shows: title, type badge, room context, saved date
- Click navigates to the saved item (or room, for room saves)

---

## 7. Save Interaction

**Default state (unsaved):**
- Icon: `Bookmark` (lucide-react) — outline style
- Label: "Save" (tooltip on desktop, visible on mobile)
- Color: `text-muted-foreground`
- Hover: `text-foreground`
- Background: transparent

**Saved state:**
- Icon: `Bookmark` — filled style
- Label: "Saved"
- Color: `text-primary`
- Background: `bg-primary/10` (subtle highlight)
- Hover: unchanged (click to unsave)

**Loading state:**
- Icon: `Loader2` spinning overlay on bookmark icon
- Button disabled during mutation
- Prevents double-clicks

**Error state:**
- Rollback to unsaved state
- Toast: "Failed to save. Please try again."
- Button remains clickable for retry

**Auth required state (guest):**
- Icon: `Bookmark` — outline
- Label: "Sign in to save"
- Click: redirect to login with `redirectedFrom` preservation

---

## 8. Unsave Interaction

**From Saved page:**
- Click "Saved" button on card
- Immediate removal from list (optimistic)
- No confirmation dialog
- Optional: toast "Removed from saved"

**From content page:**
- Click "Saved" button inline
- Immediate state change
- No page navigation

**Undo (optional V1):**
- Toast with "Undo" button appears for 5 seconds
- Clicking undo re-creates the save
- Not required for V1; can add later

---

## 9. Saved Page / IA

**Route:** `/saved`

**Page structure:**
```
┌─────────────────────────────────────────┐
│ Saved                           [Clear all] │
│ Your saved discussions, debates,          │
│ claims, and evidence.                     │
├─────────────────────────────────────────┤
│ [All] [Discussions] [Debates]             │
│ [Claims] [Evidence]                       │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 💬 Discussion                       │ │
│ │ Should AI content be labeled?       │ │
│ │ Discussion • Saved 2 days ago       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ⚖️ Debate                           │ │
│ │ AI is superior to humans            │ │
│ │ Debate • Saved 1 week ago           │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🔗 Claim                           │ │
│ │ "AI will surpass human reasoning..." │ │
│ │ Discussion • Saved 3 days ago       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Filter tabs:**
- All (default)
- Discussions
- Debates
- Claims
- Evidence

**Empty state:**
- Icon: `Bookmark` (large, muted)
- Title: "No saved items yet"
- Description: "Save discussions, debates, claims, and evidence to find them here quickly."
- CTA: "Browse Discussions" / "Browse Debates"

**Error state:**
- "Failed to load saved items. Please try again."
- Retry button

**Loading state:**
- 6 skeleton cards (2 rows × 3 columns on desktop)

---

## 10. Desktop UX

**Save button placement:**
- Discussion/Debate header: right side, next to room title
- Claim cards: right side, inline with other actions (Retract, Report)
- Evidence cards: right side, inline with other actions (Report)
- NOT on contributions/messages/questions/inquiries

**Sidebar entry:**
- Label: "Saved"
- Icon: `Bookmark`
- Placement: between "Debates" and "Profile"
- Only visible when authenticated
- No badge/count (avoids gamification)

**Saved page:**
- Full-width card list
- Filter tabs at top
- Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

---

## 11. Mobile UX

**Save button:**
- Same inline placement as desktop
- Minimum 44px touch target
- Tooltip hidden on mobile (use visible label "Save"/"Saved")

**Navigation:**
- No bottom nav entry (bottom nav is already crowded)
- Accessible from Settings → Saved section
- Or: long-press on save button shows "View saved items" option

**Saved page:**
- Single column card list
- Filter tabs as horizontal scroll
- Full-width cards

---

## 12. Empty States

**No saves yet:**
- Icon: `Bookmark` (large, muted)
- Title: "No saved items yet"
- Description: "Save discussions, debates, claims, and evidence to find them here quickly."
- CTAs: "Browse Discussions", "Browse Debates"

**All saves filtered out:**
- "No saved [discussions/debates/claims/evidence] yet."
- "Browse Discussions" / "Browse Debates" CTAs

**Guest viewing /saved:**
- Redirect to `/login?redirectedFrom=/saved`

---

## 13. Error States

**Save mutation failure:**
- Button rolls back to unsaved state
- Toast: "Failed to save. Please try again."
- Button remains clickable

**Saved list load failure:**
- Error card with retry button
- Toast: "Failed to load saved items."

**Network offline:**
- Save button disabled
- Toast: "You appear to be offline."

---

## 14. Loading States

**Save button:**
- `Loader2` icon overlay during mutation
- Button disabled, opacity reduced
- Prevents double-save

**Saved page:**
- 6 skeleton cards
- Filter tabs visible but non-interactive
- Stale data shown while refetching

---

## 15. Private Debate Behavior

**Save allowed only if user has access:**
- RLS + application check using `has_room_access()`
- Private debate save button visible only to authorized users
- If user loses access after saving:
  - Save record remains in `user_saves`
  - Item disappears from Saved list (query-time filter)
  - No metadata exposed: title, premise, claims, evidence all hidden
  - If room becomes public again: item reappears

**Private → Public transition:**
- Saved item reappears in list
- No user action required

**Private debate deleted:**
- Saved item hidden
- Record may be cleaned up later via background job (not V1)

---

## 16. Deleted/Archived/Hidden Behavior

| State | Saved Visibility | Rationale |
|-------|-----------------|-----------|
| Active | Visible | Normal state |
| Archived (`rooms.status = 'archived'`) | Hidden | Room is intentionally closed |
| Deleted (`rooms` cascade delete) | Hidden | Content no longer exists |
| Retracted (claim/evidence/question) | Hidden | Content withdrawn by author |
| Moderated/hidden | Hidden | Content removed by moderation |
| Private + no access | Hidden | User no longer authorized |

**Implementation:** Filter in the saved-list query using visibility checks, not cascade delete. Preserves user intent if content is restored.

---

## 17. Accessibility

- **Semantic buttons:** All save controls use `<button>`, not `<div>` or `<a>`
- **ARIA labels:** `aria-label="Save discussion"`, `aria-label="Remove from saved"`, `aria-label="Saved"`
- **State announcement:** `aria-pressed={isSaved}` on toggle buttons
- **Tooltip:** Accessible on hover AND focus
- **Keyboard:** Tab navigable, Enter/Space activates
- **Focus management:** Focus stays on save button after toggle
- **Screen reader:** Announces state change: "Saved" / "Removed from saved"
- **Mobile:** 44px minimum touch target
- **Reduced motion:** Respects `prefers-reduced-motion` for any animations

---

## 18. Performance

**Indexes:**
```sql
create index user_saves_user_created_idx on public.user_saves(user_id, created_at desc);
create index user_saves_target_idx on public.user_saves(target_type, target_id);
```

**Pagination:**
- Cursor-based on `created_at desc`
- Page size: 20 items
- Pattern: identical to existing discussion/debate feeds

**Metadata batching:**
- Saved list service fetches save records first
- Then batch-fetches target metadata (room title, slug, type) in a single query per type
- Avoids N+1

**Cache strategy:**
- TanStack Query with 30-second stale time
- Invalidate on save/unsave
- Shared cache key: `["saved", "list", { filter, cursor }]`

---

## 19. Security

**RLS enforcement:**
```sql
-- Users can view their own saves only
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own saves only
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can delete their own saves only
create policy "Users can delete own saves"
  on public.user_saves
  for delete
  to authenticated
  using (user_id = auth.uid());
```

**No anonymous access:**
- `user_saves` is not visible to `anon`
- Guests cannot create or view saves

**No public enumeration:**
- No API to list another user's saves
- No save counts on content
- No "who saved this" feature

**Private content protection:**
- Saved list query filters by `has_room_access()` for room-linked targets
- No metadata from inaccessible private rooms appears in saved list
- No FK from `user_saves` to private tables (prevents inference through FK errors)

---

## 20. Personalization Boundaries

**V1: No personalization from saves.**

Saves are a **user tool**, not a **training signal**.

| Use Case | V1 | V2+ |
|----------|----|-----|
| User retrieves own saves | YES | YES |
| Save influences search ranking | NO | Maybe |
| Save influences discovery | NO | No |
| Save influences homepage | NO | No |
| Save-based recommendations | NO | No |
| Save notifications to others | NO | Never |
| Public save counts | NO | Never |
| "Because you saved X" suggestions | NO | No |

**Future consideration (V2+):**
- Saves *might* inform personal exploration preferences
- Only if explicitly opt-in by user
- Never used for social proof or popularity
- Never exposed to other users

---

## 21. V1 vs V2

### V1 (This Phase)

| Feature | Status |
|---------|--------|
| Save/unsave discussion rooms | IN |
| Save/unsave debate rooms | IN |
| Save/unsave claims | IN |
| Save/unsave evidence | IN |
| `/saved` page | IN |
| Sidebar entry | IN |
| Guest login redirect | IN |
| Visibility-aware list | IN |
| Optimistic UI | IN |
| Private room safety | IN |
| Filter tabs (All/Discussions/Debates/Claims/Evidence) | IN |

### V2 (Future)

| Feature | Status |
|---------|--------|
| Save discussion questions | LATER |
| Save structured inquiries | LATER |
| Save contributions/messages | LATER |
| Collections/folders | LATER |
| Save notes/annotations | LATER |
| Export saved items | LATER |
| Save-based personalization (opt-in) | LATER |
| Share saved list (opt-in) | LATER |

---

## Decision Summary

**SAVE/BOOKMARK V1:**

| Target | Decision |
|--------|----------|
| Save discussion | YES |
| Save debate | YES |
| Save claim | YES |
| Save evidence | YES |
| Save discussion question | NO (V2) |
| Save structured inquiry | NO (V2) |
| Save contribution | NO |
| Save search result | NO |
| Save deep-link/section | NO |

**Recommended Saved location:** `/saved` route, accessible from sidebar (authenticated) and Settings page.

**Recommended data model:** Single `public.user_saves` table with `target_type` (enum: `discussion`, `debate`, `claim`, `evidence`) + `target_id` (uuid), `user_id` (uuid, auth.uid()), `created_at` (timestamptz). Unique constraint on `(user_id, target_type, target_id)`.

**RLS model:** Users can only CRUD their own saves. No anonymous access. No public enumeration. Private content filtered at query time via `has_room_access()`.

**Guest behavior:** Redirect to login with `redirectedFrom` preservation. No temporary/local saves.

**Private-room behavior:** Save allowed only if user has access. If access revoked, item hidden from saved list. No metadata leak.

**Lifecycle behavior:** Active items visible. Archived/retracted/deleted/moderated/private-no-access items hidden via query-time filter.

**Ordering:** `created_at desc` (most recently saved first). No other sorting in V1.

**Pagination:** Cursor-based, 20 items per page.

**V1 exclusions:** Questions, inquiries, contributions, search results, deep links, public counts, notifications, recommendations.

**V2 opportunities:** Collections, notes, export, opt-in personalization, sharing.

---

## 22. Dashboard Integration

The Dashboard should contain two distinct personalized sections for authenticated users:

1. Recently Saved - What did I intentionally save because I want to return to it?
2. Recently Engaged - What have I meaningfully interacted with recently?

These are not the same concept.

---

### 22.1 Recently Saved

Purpose: Quick access to the user's most recently saved items.

Data source: public.user_saves table.

Query: Direct query with RLS (no new RPC required).

Limit: 5 items maximum.
Ordering: Most recently saved first.

Presentation: Compact list with type badges.

"View all" behavior: Links to /saved.

---

### 22.2 Recently Engaged

Purpose: Surface rooms where the user has taken meaningful epistemic actions.

Meaningful engagement: created claims, voted, created inquiries, responded, joined debates.

Not engagement: page views, search queries, passive browsing.

Data source: Existing personalized RPCs + new lightweight get_my_recent_engagement RPC.

---

### 22.3 Dashboard Placement

After QuickActions, before PersonalizedUpdates.

---

### 22.4 UX Details

Recently Saved: Bookmark icon, compact list, View all to /saved.
Recently Engaged: Compass icon, compact list, no View all.

Guest behavior: Both sections hidden for unauthenticated users.

---

## 21. V1 vs V2

---

## Final Product Decision

**SAVE/BOOKMARK V1:**

| Object | Save V1 |
|---|---|
| Discussion | YES |
| Debate | YES |
| Claim | YES |
| Evidence | YES |
| Discussion Question | NO (V2) |
| Structured Inquiry | NO (V2) |
| Contribution | NO |
| Search Result | NO |
| Deep Link / Section | NO |

**Dashboard V1:**

| Dashboard Feature | V1 |
|---|---|
| Recently Saved | YES |
| Recently Engaged | YES |
| Public save counts | NO |
| Popular saves | NO |
| Save-based recommendations | NO |
| Engagement-based belief inference | NO |
| Ideological personalization | NO |

**Recommended Saved location:** /saved route, accessible from desktop sidebar (authenticated) and Settings page.

**Recommended data model:** Single public.user_saves table with target_type enum, target_id, user_id, created_at. Unique constraint on (user_id, target_type, target_id). No foreign keys to target tables.

**RLS model:** Users can only CRUD their own saves. No anonymous access. No public enumeration. Private content filtered at query time via has_room_access(). Application-layer access check required before insert.

**Guest behavior:** Redirect to /login with redirectedFrom preservation. No temporary/local saves.

**Private-room behavior:** Save allowed only if user has has_room_access(). If access revoked, item hidden from saved list. No metadata leak.

**Lifecycle behavior:** Active items visible. Archived/retracted/deleted/moderated/private-no-access items hidden via query-time filter. No cascade delete.

**Ordering:** created_at desc (most recently saved first). No popularity sorting, no recommendation algorithms.

**Pagination:** Cursor-based, 20 items per page.

**Saved page IA:** Compact list with type badges, not card grid.

**Recently Saved:** Query user_saves directly, limit 5, most recent first, View all to /saved.

**Recently Engaged:** New get_my_recent_engagement RPC, limit 5, most recent first, no View all. Bounded preview only.

**V1 exclusions:** Questions, inquiries, contributions, search results, deep links, public counts, notifications, recommendations, social features.

**V2 opportunities:** Collections, notes, export, opt-in personalization, sharing, questions/inquiries/contributions.