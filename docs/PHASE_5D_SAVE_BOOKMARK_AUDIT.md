# Phase 5D Save / Bookmark — Audit

## 1. Executive Summary

Discora currently has **no save/bookmark functionality** anywhere in the codebase. A comprehensive audit of the existing architecture confirms that:

- No `saved`, `bookmark`, `favorite`, `watchlist`, `pin`, or analogous table/view/RPC exists.
- No UI control for saving content exists in any room, card, header, or action menu.
- The product principle "understanding over engagement" strongly disfavors social or gamified save mechanics.

A V1 Save/Bookmark feature is feasible and aligned with Discora's epistemic model **if** it is designed as a **private, user-specific intent signal** — not a social or popularity mechanism.

**Recommendation:** Proceed with a minimal, private, room-centric V1 Save feature. Do NOT save individual contributions, search results, or room sections in V1.

---

## 2. Current Architecture

### 2.1 Database Schema

**Core tables relevant to Save:**

| Table | Purpose | Notes |
|-------|---------|-------|
| `public.profiles` | User identity | 1:1 with `auth.users` |
| `public.user_preferences` | Privacy toggles | Per-user settings |
| `public.rooms` | All rooms | `visibility` (public/private), `status` (open/inactive/archived), `room_type` (discussion/debate/private) |
| `public.discussions` | Discussion extension | Links to `rooms.id` |
| `public.debates` | Debate extension | Links to `rooms.id` |
| `public.claims` | Claims within rooms | `room_id`, `is_retracted` |
| `public.evidence` | Evidence for claims | `room_id`, `is_retracted` |
| `public.questions` | Discussion questions | `room_id`, `is_retracted` |
| `public.inquiry_items` | Structured inquiries | `room_id`, `status`, `target_claim_id` |
| `public.inquiry_responses` | Inquiry responses | `inquiry_item_id` |
| `public.messages` | Contributions | `room_id`, `message_type` |
| `public.debate_participants` | Debate membership | `room_id`, `user_id`, `side` |

**Views relevant to Save:**
- `public.discussion_evidence` — evidence with `room_id`, vote aggregates
- `public.discussion_claims` — claims with consensus metadata
- `public.discussion_messages` — contributions
- `public.discussion_questions` — questions
- `public.moderation_queue` — moderation

**No save/bookmark table or view exists.**

### 2.2 Auth / RLS Patterns

**Private room authorization:**
- `public.has_room_access(p_room_id uuid)` — SECURITY DEFINER helper
- Returns true for: public non-archived rooms, room owner, active debate participants
- Used in RLS policies and view definitions

**User-specific data pattern:**
- `user_preferences`: `user_id = auth.uid()` for SELECT/INSERT/UPDATE
- `profiles`: publicly readable, self-editable
- `debate_participants`: self-join only for public rooms

**General RLS conventions:**
- All content tables have RLS enabled
- Guest/anonymous access is explicitly granted where needed (`to anon`)
- Authenticated access uses `auth.uid()` checks
- SECURITY DEFINER functions pin `search_path = public`

### 2.3 Frontend Architecture

**Navigation:**
- Desktop sidebar: Home, Discussions, Search, Debates, Profile, Settings, Moderation, Onboarding, Feedback
- Mobile bottom nav: Home, Discussions, Search, Debates, Create, Profile, Settings
- No "Saved" entry exists in either

**Room pages:**
- Discussions: `/discussions/[slug]` with section shell (Claims, Evidence, Questions, Contributions)
- Debates: `/debates/[slug]` with section navigation (Overview, Arguments, Evidence, Questions, Contributions)
- Both use server components for initial data, client components for interactivity

**Action patterns:**
- Inline buttons for: Retract, Report, Expand/Collapse, Vote, Relate, Extract Claim
- `ReportDialog` is the primary action dialog pattern
- No action menu / kebab menu / dropdown exists anywhere
- Actions are either always-visible or auth-gated inline buttons

**State management:**
- TanStack Query for server state
- React hooks for local UI state
- No global state management library

### 2.4 Services / Hooks / RPCs

**Service layer:**
- `src/features/discussions/services/discussion-service.ts` — 2000+ lines, central service
- `src/features/debates/services/debate-service.ts` — debate-specific service
- `src/features/inquiries/services/inquiry-service.ts` — inquiry RPCs

**Hook patterns:**
- `use-discussions.ts` — 900+ lines, central hook file
- `use-debates.ts` — debate hooks
- `use-inquiries.ts` — inquiry hooks
- Pattern: `useQuery` for reads, `useMutation` for writes, `queryClient.invalidateQueries` for cache refresh

**RPC conventions:**
- Complex multi-step operations use RPCs
- Examples: `create_discussion_room`, `create_debate_room`, `switch_debate_side`, `resolve_debate`
- RPCs are defined in migrations and called via `supabase.rpc()`
- SECURITY DEFINER used for privileged operations

### 2.5 Types

**Domain types** (`src/types/domain.ts`):
- `RoomType`, `Visibility`, `RoomStatus`
- `ClaimType`, `ClaimContextType`
- `QuestionType`
- `IdentityMode`
- `NotificationType` (future)
- `ReportStatus` (future)

**Feature types** exist in each feature's `types.ts` or inline.

**No save-related types exist.**

---

## 3. Existing Save/Bookmark-Like Functionality

**None found.** Exhaustive search confirms:

- No `save`, `saved`, `bookmark`, `bookmarked`, `favorite`, `watchlist`, `read later`, or `pin` tables/views
- No `user_saved`, `saved_items`, `bookmarks`, `user_bookmarks`, `saved_content` tables
- No save-related RPCs
- No save-related UI components
- No save-related hooks
- No save-related types

The only historical reference is in `docs/04_DATABASE_DESIGN.md` and `docs/07_API_DESIGN.md` mentioning `pins` and `pin_suggestion`, but these are unimplemented historical concepts.

---

## 4. Candidate Save Targets

| Target | Save Useful? | User Intent | Stable Enough? | Preserves Context? | Authorization Complexity | Discora Fit | V1 Recommendation |
|--------|-------------|-------------|----------------|-------------------|------------------------|-------------|-------------------|
| Discussion room | YES | "Return to this discussion" | HIGH | HIGH | LOW — public or access-controlled | HIGH — core epistemic container | **YES** |
| Debate room | YES | "Return to this debate" | HIGH | HIGH | MEDIUM — private rooms need auth | HIGH — core epistemic container | **YES** |
| Claim | YES | "Revisit this specific claim" | HIGH | MEDIUM — needs room context | LOW — inherits room access | HIGH — epistemic unit | **YES** |
| Evidence | YES | "Revisit this evidence" | HIGH | MEDIUM — needs claim/room context | LOW — inherits room access | HIGH — epistemic unit | **YES** |
| Discussion Question | BORDERLINE | "Revisit this open question" | MEDIUM — questions evolve | MEDIUM | LOW — inherits room access | MEDIUM — exploratory | **LATER** |
| Structured Inquiry | BORDERLINE | "Revisit this inquiry" | MEDIUM — inquiries evolve | MEDIUM — needs claim context | LOW — inherits room access | MEDIUM — claim-targeted | **LATER** |
| Contribution/message | NO | Ephemeral thread entry | LOW | LOW | LOW | LOW — not a stable epistemic object | **NO** |
| Search result | NO | Transient query artifact | LOW | LOW | LOW | LOW — not a stable object | **NO** |
| Room section/deep link | NO | Too granular | MEDIUM | LOW | MEDIUM | LOW — rooms are the stable unit | **NO** |

### Key Insight

"Save this room" and "Save this specific epistemic object" are **different intents**:

- **Room save:** "I want to return to this entire discussion/debate and continue engaging with it."
- **Object save:** "I want to revisit this specific claim/evidence because it represents an important point in my understanding."

Both are valid in Discora's epistemic model. V1 should support **both rooms and atomic epistemic objects** (claims, evidence) because they represent distinct user mental models.

---

## 5. Current Navigation / IA

**Desktop sidebar (src/components/layout/sidebar.tsx):**
- Home
- Discussions
- Search
- Debates
- Profile
- Settings (authenticated)
- Moderation (moderators)
- Onboarding trigger
- Feedback

**Mobile bottom nav (src/components/layout/mobile-nav.tsx):**
- Home
- Discussions
- Search
- Debates
- Create
- Profile
- Settings

**Settings page (src/features/settings/components/settings-page-client.tsx):**
- Profile
- Privacy
- Data & Safety (Report History, Feedback, How Discora Works, Data Export)
- Danger Zone

**Gap:** No "Saved" entry anywhere. Adding it to sidebar/settings would be the most natural placement.

---

## 6. Current Auth / RLS Patterns

**Guest experience:**
- Guests can view public rooms, search, and read content
- Guests are prompted to login for contributions, voting, etc.
- No backend records are created for guests

**Authenticated experience:**
- `auth.uid()` drives all user-specific RLS
- Optimistic mutations via TanStack Query
- Toast notifications for feedback

**Private room access:**
- `has_room_access()` function evaluates: public non-archived OR owner OR active participant
- Used in views and RLS policies
- Private rooms show `PrivateAccessGate` to unauthorized users

**Pattern for V1 Save RLS:**
```sql
-- Users can view their own saves
create policy "Users can view own saves"
  on public.user_saves
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own saves
create policy "Users can insert own saves"
  on public.user_saves
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can delete their own saves
  on public.user_saves
  for delete
  to authenticated
  using (user_id = auth.uid());
```

---

## 7. Private Room Implications

**Critical security requirement:** A saved private debate must NEVER expose private content to unauthorized users.

**Scenarios:**

| Scenario | Behavior |
|----------|----------|
| User saves private debate they can access | Save record created. Item visible in Saved list while access persists. |
| User loses access to private debate | Save record remains in DB but item becomes invisible in Saved list. No metadata leak. |
| Private → Public transition | Saved item becomes visible again (if still saved). |
| Room archived/deleted | Saved item hidden from Saved list. |
| Guest attempts to save private content | Redirected to login. No backend record. |

**Implementation approach:**
- `user_saves` table has no foreign keys to private content
- Saved list queries join through `has_room_access()` or equivalent visibility check
- RLS alone is insufficient because saved items are user-owned, not room-owned
- Application layer must filter saved list by current access

**Why no FK to private rooms:**
- Foreign keys would expose that a save exists even if the user no longer has access
- Polymorphic save table with `target_type` + `target_id` avoids this
- Visibility is checked at query time, not enforced by FK

---

## 8. Lifecycle / Visibility Implications

| Object State | Saved Item Visibility |
|-------------|----------------------|
| Active | Visible |
| Archived (room status = 'archived') | Hidden |
| Deleted (room/content deleted) | Hidden — `ON DELETE CASCADE` on targets, or filtered in query |
| Retracted (claim/evidence/question) | Hidden — `is_retracted = true` filtered in query |
| Moderated/hidden | Hidden — `is_moderated` or similar flag filtered |
| Private + no access | Hidden — `has_room_access()` check |
| Private + access restored | Visible again |

**V1 approach:** Filter at query time rather than cascade delete. This preserves the user's intent signal if content is restored.

---

## 9. Guest Experience

**Recommended V1 behavior:**
1. Guest clicks Save button
2. Save button shows login prompt / redirects to `/login?redirectedFrom=<current_url>`
3. After login, user returns to the same content
4. User can then save

**Why this approach:**
- Consistent with existing Discora auth patterns (e.g., `PrivateAccessGate` redirects guests to login)
- No temporary/local save state to manage
- No backend records for guests
- Preserves user intent

**Alternative considered (and rejected):**
- LocalStorage temporary save: adds complexity, edge cases around device/login transitions
- Silent no-op: poor UX, user doesn't know why nothing happened

---

## 10. Performance / Scale Considerations

**Indexes needed:**
```sql
create index user_saves_user_id_idx on public.user_saves(user_id, created_at desc);
create index user_saves_target_idx on public.user_saves(target_type, target_id);
```

**Pagination:**
- Server-side cursor pagination on `created_at desc`
- Page size: 20-50 items
- Pattern consistent with existing `useInfiniteDiscussions`

**N+1 risks:**
- Saved list needs room metadata (title, slug, type) for each item
- Either: denormalize minimal metadata into `user_saves` at save time
- Or: batch fetch metadata in service layer
- Recommendation: batch fetch to avoid denormalization drift

**Query pattern:**
```sql
select * from public.user_saves
where user_id = auth.uid()
  and target_type = 'discussion'
  and is_visible = true  -- computed via visibility check
order by created_at desc
limit $1 offset $2;
```

---

## 11. Accessibility Considerations

- Save button: semantic `<button>` with `aria-label` (not just an icon)
- State announcement: `aria-pressed` for saved state
- Tooltip: accessible label on hover/focus
- Keyboard: tab-accessible, Enter/Space toggles save
- Screen reader: "Save discussion" / "Saved" / "Remove save"
- Mobile: minimum 44px touch target
- Focus management: maintain focus after save/unsave

---

## 12. Browser Findings

**Pre-audit browser inspection (via Playwright):**

| Route | Save Control Present? | Notes |
|-------|----------------------|-------|
| `/` (homepage) | NO | No save affordance on feed cards |
| `/discussions` | NO | Feed cards have no save button |
| `/discussions/[slug]` | NO | Header, premise, sections have no save |
| `/discussions/[slug]/claims` | NO | Claim cards have Retract, Report, Relations, Evidence, Inquiries — no save |
| `/discussions/[slug]/evidence` | NO | Evidence cards have Report, source link — no save |
| `/discussions/[slug]/questions` | NO | Question cards have no action buttons beyond "View & Assert Answers" |
| `/discussions/[slug]/contributions` | NO | Messages have Report only |
| `/debates` | NO | Feed cards have no save |
| `/debates/[slug]` | NO | Header, premise, arguments have no save |
| `/search` | NO | Search result cards have no save |
| `/settings` | NO | Settings has no save section |

**Conclusion:** Save/Bookmark does not exist anywhere in the current UI. This is a greenfield implementation.

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Save becomes social metric | MEDIUM | HIGH | Explicitly no public counts, no notifications, no ranking |
| Save leaks private content | MEDIUM | CRITICAL | Query-time visibility checks, no FK to private tables, RLS enforcement |
| Save clutter / noise | MEDIUM | MEDIUM | V1 limited to rooms + claims + evidence only |
| Guest confusion | LOW | MEDIUM | Login redirect with destination preservation |
| Performance at scale | LOW | MEDIUM | Pagination, indexes, batch metadata |
| Accidental popularity signal | MEDIUM | HIGH | No public save counts, no "most saved" lists |

---

## 14. Open Questions

1. Should saved items show "last updated" timestamps from the original object, or only "saved at" timestamps?
2. Should users be able to organize saves into collections/folders in V1? **Recommendation: NO — keep V1 flat.**
3. Should unsaving show a confirmation dialog? **Recommendation: NO — immediate unsave, undo toast optional.**
4. Should the Saved page show unavailable items with explanation? **Recommendation: YES — "This room is no longer accessible."**
5. Should save state sync across devices? **Recommendation: YES — backend-native, no local-only state.**

---

## 15. Recommended V1 Scope

**IN SCOPE:**
- Save/unsave discussion rooms
- Save/unsave debate rooms
- Save/unsave claims
- Save/unsave evidence
- Private `/saved` page (authenticated only)
- Sidebar entry for authenticated users
- Login redirect for guests
- Visibility-aware saved list (hides archived/retracted/private-no-access)
- Optimistic UI with rollback

**OUT OF SCOPE (V2+):**
- Save discussion questions
- Save structured inquiries
- Save contributions/messages
- Save search results
- Collections/folders
- Sharing saved lists
- Save-based recommendations
- Notifications about saved content
- Public save counts
- Mobile bottom nav entry (use sidebar/settings instead)

---

## 16. Explicit Non-Goals

- **NOT a social feature:** Saves are private by default. No public counts, no sharing, no social proof.
- **NOT a recommendation engine:** Saves do not influence search ranking, discovery, or homepage content in V1.
- **NOT a popularity signal:** No "most saved" lists, no trending saved content.
- **NOT gamification:** No reputation points, no badges, no achievements for saving.
- **NOT a replacement for search:** Saves complement search; they are not a discovery mechanism.
- **NOT a persistence layer for private content:** Saving a private room does not grant continued access if membership is revoked.

---

## 17. Pre-Implementation Architecture Review

### 17.1 Polymorphic Target Integrity

**Question:** Is a `user_saves` table with no foreign keys to target tables actually safe?

**Findings:**

The proposed schema:
```sql
create table public.user_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('discussion', 'debate', 'claim', 'evidence')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint user_saves_user_target_unique unique (user_id, target_type, target_id)
);
```

**Arbitrary UUID insertion risk:** A user could insert a save record with a `target_id` that does not exist in any target table. This is **harmless** because:
- The save record is user-scoped (RLS: `user_id = auth.uid()`)
- No other user can enumerate or access it
- When rendering the saved list, non-existent targets simply won't resolve and can be hidden or shown as "unavailable"

**Unauthorized target saving:** A user could attempt to save a private room they do not have access to. RLS on `user_saves` alone cannot prevent this because:
- RLS checks `user_id = auth.uid()` for the save record
- RLS does not check whether the user has access to the target

**Mitigation:** Add an application-layer authorization check in the service layer before inserting a save:
```typescript
async function saveTarget(userId, targetType, targetId) {
  // For room-linked targets, verify access
  if (targetType === 'discussion' || targetType === 'debate') {
    const hasAccess = await checkRoomAccess(userId, targetId);
    if (!hasAccess) throw new Error('Cannot save this item');
  }
  // For claim/evidence, resolve parent room and check access
  // ...
}
```

**Private target saving:** Without the application-layer check, a user could save a private room ID they learned about through other channels (e.g., a shared link they no longer have access to). The save record itself would not leak metadata because:
- Only the owner can view their saves
- The saved list query filters by `has_room_access()`
- But the existence of the save record reveals the user knows about the private room

**Verdict:** Direct CRUD + RLS is **sufficient** for the `user_saves` table, **provided** the service layer enforces access checks before insertion. No RPC is required. The application-layer check is the critical safeguard.

---

### 17.2 Private Room Security Deep-Dive

**Existing `has_room_access()` function** (`supabase/migrations/202606210001_private_debate_authorization_foundation.sql`):

```sql
create or replace function public.has_room_access(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
        or exists (
          select 1 from public.debate_participants dp
          where dp.room_id = p_room_id and dp.user_id = auth.uid()
        )
      )
  );
$$;
```

**Access matrix:**

| Scenario | `has_room_access()` | Save Allowed? |
|----------|---------------------|---------------|
| Public discussion | TRUE | YES |
| Public debate | TRUE | YES |
| Private debate owner | TRUE | YES |
| Private debate member | TRUE | YES |
| Private debate invited but not joined | FALSE | NO |
| Removed participant | FALSE | NO |
| Non-member | FALSE | NO |
| Archived room | FALSE | NO |
| Deleted room | FALSE (no row) | NO |

**Private → Public transition:** If a private room becomes public, `has_room_access()` returns TRUE for all users. Previously saved items become visible again. No user action required.

**Save system must NOT become an alternate access path:**
- The save button must be hidden/gated for unauthorized users (same as existing private debate UI)
- The service layer must call `has_room_access()` before inserting
- The saved list query must call `has_room_access()` for each item
- No FK from `user_saves` to private tables (prevents inference through FK errors)

---

### 17.3 Dashboard / Homepage Infrastructure Audit

**Existing personalized dashboard sections** (`src/features/homepage/components/logged-in-homepage.tsx`):

| Section | Data Source | RPC | What It Tracks |
|---------|-------------|-----|----------------|
| My Open Inquiries | `get_my_open_inquiries` | Yes | Inquiries user created |
| Inquiries on My Claims | `get_inquiries_on_my_claims` | Yes | Inquiries on user's claims |
| New Evidence on Voted Claims | `get_new_evidence_on_voted_claims` | Yes | New evidence on claims user voted on |
| My Inquiry Responses | `get_my_inquiry_responses` | Yes | Responses to user's inquiries |
| Debates Needing Attention | `get_my_debates_attention` | Yes | Debates where user has claims |
| New Evidence on My Topics | `get_my_topic_evidence` | Yes | Evidence on topics user follows |
| My Understanding Evolved | `get_my_understanding_evolved` | Yes | Consensus shifts on claims user voted on |

**Non-personalized sections:**
- Recent Discussions (global, not user-specific)
- Recent Debates (global, not user-specific)

**Key finding:** Discora already has extensive personalized activity infrastructure. All meaningful user actions are tracked through dedicated RPCs. There is **no general activity feed** or generic "recent activity" table.

**Meaningful engagement definitions (from existing RPCs):**
- Creating a claim (implied by `get_my_debates_attention`)
- Voting on a claim (implied by `get_new_evidence_on_voted_claims`, `get_my_understanding_evolved`)
- Creating an inquiry (`get_my_open_inquiries`)
- Responding to an inquiry (`get_my_inquiry_responses`)
- Having inquiries on one's claims (`get_inquiries_on_my_claims`)
- Following topics (`get_my_topic_evidence`)

**Not tracked as engagement:**
- Page views
- Search queries
- Passive browsing
- Navigation clicks

---

### 17.4 Saved Page IA Re-evaluation

**Original recommendation:** Card grid (responsive 1/2/3 columns).

**Re-evaluation:** For primarily textual/epistemic content, a card grid is suboptimal because:
- Cards waste vertical space on padding/borders
- Text content is hard to scan in a grid
- Context (room title, type, date) is fragmented across multiple lines
- Mobile requires excessive scrolling

**Revised recommendation:** **Compact list with type badges.**

```
┌──────────────────────────────────────────────────────────────┐
│ 💬 Discussion  Should AI content be labeled online?          │
│ Discussion • Saved 2 days ago                    [Saved]     │
├──────────────────────────────────────────────────────────────┤
│ ⚖️ Debate  AI is superior to humans                         │
│ Debate • Saved 1 week ago                            [Saved] │
├──────────────────────────────────────────────────────────────┤
│ 🔗 Claim  "AI will surpass human reasoning within 20 years"  │
│ Discussion: Should AI content be labeled? • Saved 3 days ago │
│                                                      [Saved] │
└──────────────────────────────────────────────────────────────┘
```

**Advantages:**
- Higher information density
- Easier scanning of titles and context
- Consistent with existing Discora card patterns (see `PersonalizedUpdates` sections)
- Better mobile experience
- Clear type identification via icon + label
- Unsave action is immediately accessible

---

### 17.5 Lifecycle State Definitions

| Object State | Saved Visibility | Rationale |
|-------------|-----------------|-----------|
| Active | Visible | Normal state |
| Archived (`rooms.status = 'archived'`) | Hidden | Room is intentionally closed |
| Deleted (`rooms` cascade delete) | Hidden | Content no longer exists |
| Retracted (claim/evidence/question `is_retracted = true`) | Hidden | Content withdrawn by author |
| Moderated/hidden | Hidden | Content removed by moderation |
| Private + no access | Hidden | User no longer authorized |

**Implementation approach:**
- Filter in the saved-list query using visibility checks
- Do NOT cascade delete save records when targets are deleted/archived/retracted
- Preserves user intent if content is restored
- Application layer checks `has_room_access()` for room-linked targets
- Application layer checks `is_retracted` for claim/evidence targets

**Restoration behavior:**
- If archived room is unarchived: saved item reappears
- If retracted claim is restored: saved item reappears
- If private room becomes public: saved item reappears
- If user regains access to private room: saved item reappears

