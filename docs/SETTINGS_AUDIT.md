# Settings Audit & Implementation Plan

**Goal**: Determine what exists, what needs building, and how to build it.
**Not**: Implement anything.

---

## Phase 1 — Existing Infrastructure Audit

### 1.1 Authentication

| Capability | Status | Implementation |
|---|---|---|
| Email/password registration | **Implemented** | `auth-service.ts:32` — `supabase.auth.signUp()` |
| Email/password login | **Implemented** | `auth-service.ts:67` — `supabase.auth.signInWithPassword()` |
| Google OAuth | **Implemented** | `auth-service.ts:50` — `supabase.auth.signInWithOAuth({ provider: "google" })` |
| Password reset (forgot flow) | **Implemented** | `auth-service.ts:86-106` — `resetPasswordForEmail()` + `updateUser({ password })` |
| Password change (authenticated) | **Not implemented** | No "old password → new password" flow; only forgot/reset exists |
| Email change | **Not implemented** | No service function, no UI; Supabase `updateUser({ email })` exists but is not wired |
| Profile creation redirect | **Implemented** | `middleware.ts:75` — redirects authenticated users without profile to `/settings/profile` |
| Auth callback handler | **Implemented** | `auth/callback/route.ts:1-49` — exchanges OAuth code for session |
| Session management | **Implemented** | `auth-provider.tsx` — `getSession()` on mount + `onAuthStateChange` subscription |
| Role checking | **Implemented** | `use-role.ts:1-27` — `useHasRole()` via `has_current_user_role_or_higher` RPC |

### 1.2 Profile System

#### Database (`profiles` table)

| Column | Type | Editable? | Constraints |
|---|---|---|---|
| `id` | uuid PK | No (system) | FK → `auth.users(id) ON DELETE CASCADE` |
| `username` | text | **Yes** | Unique (lower), regex `^[a-z0-9][a-z0-9_-]{2,29}$`, 30-day cooldown |
| `bio` | text? | **Yes** | Max 500 chars |
| `avatar_url` | text? | **Yes** | Set via avatar upload flow |
| `default_identity_mode` | text | **Yes** | CHECK `IN ('public', 'anonymous')`, default `'public'` |
| `last_username_change` | timestamptz | No (trigger) | Managed by `enforce_profile_username_rules` trigger |
| `joined_at` | timestamptz | No (system) | Set at creation |
| `created_at` | timestamptz | No (system) | Set at creation |
| `updated_at` | timestamptz | No (auto) | Auto-updated by trigger |

#### Application

| Component | File | What it does |
|---|---|---|
| `profile-form.tsx` | `src/features/profiles/components/profile-form.tsx` | Edits username, bio, avatar, defaultIdentityMode. Handles cooldown, validation, upload. |
| `/settings/profile` | `src/app/settings/profile/page.tsx` | Settings page rendering `ProfileForm` |
| `/settings/moderation` | `src/app/settings/moderation/page.tsx` | Moderation dashboard (moderator-only) |
| `/settings` | `src/app/settings/page.tsx` | Redirects to `/settings/profile` |
| `/u/[username]` | `src/app/u/[username]/page.tsx` | **Public profile page** — read-only view of profile, reputation, expertise, activity timeline |
| `profile-service.ts` | `src/features/profiles/services/profile-service.ts` | CRUD: `getProfileByUsername`, `getProfileByUserId`, `createProfile`, `updateProfile`, `uploadAvatar` |

#### Avatar Storage

| Aspect | Detail |
|---|---|
| Bucket | `avatars` (public) |
| Path | `avatars/{user_id}/avatar.{extension}` |
| Formats | JPEG, PNG, WebP |
| Max size | 5 MB |
| RLS | User can insert/update/delete only their own folder |
| Upload | `profile-service.ts:164-222` — validates size/type, uploads with upsert, returns public URL |

#### Reputation & Expertise

| Aspect | Detail |
|---|---|
| Reputation page | **Inline on profile page** (`/u/[username]`) — no separate page |
| Expertise page | **Inline within reputation section** — no separate page |
| Reputation events | 17 event types across claims, evidence, questions, debates, side switches |
| Reputation visibility | **Always public** — no privacy controls exist |
| Expertise visibility | **Always public** — no privacy controls exist |
| Side-switch history visibility | **Always public** on profile timeline — no privacy controls exist |
| Leaderboard | **Always public** — no opt-out |

### 1.3 Identity System

| Aspect | Status | Detail |
|---|---|---|
| `IdentityMode` type | **Defined** | `"public" | "anonymous"` in `src/types/domain.ts:3` |
| Per-post identity column | **Exists on all content tables** | `messages`, `claims`, `evidence`, `questions` all have `identity_mode` column |
| Per-post identity on inquiries | **Not present** | `inquiry_items` and `inquiry_responses` have no `identity_mode`; always public |
| Anonymous posting | **Implemented** | View-level redaction: `discussion_claims`, `discussion_evidence`, `discussion_questions`, `discussion_messages` dynamically nullify creator identity |
| Default identity preference | **Implemented** | `profiles.default_identity_mode` — stored and editable |
| "Remember last identity" | **Not implemented** | No per-session identity memory; default is always read from profile |
| Identity toggle in UI | **Implemented** | Anonymous checkbox in claim/evidence/question/message creation forms |
| Scope of identity preference | **Future participation only** | Does not retroactively change existing posts |

### 1.4 Notifications

| Aspect | Status |
|---|---|
| Notification infrastructure | **Not implemented** |
| Notification tables | **None** |
| Notification RPCs | **None** |
| Notification services/hooks | **None** (`src/features/notifications/` contains only `.gitkeep`) |
| Notification UI | **None** (sidebar has disabled "Notifications" link) |
| Email notifications | **None** |
| In-app notifications | **None** |
| Notification triggers (DB) | **None** |
| Notification types defined | **`@future` type in `domain.ts:141-148`** — placeholder only |
| Relevant docs | `docs/07_API_DESIGN.md:661,669,677` — defines future API endpoints `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all` |

**Implication**: Notifications must be built from scratch. No table, no trigger, no service, no UI exists.

### 1.5 Moderation & Safety

| Feature | Status | Detail |
|---|---|---|
| **Content reporting** | **Fully implemented** | `moderation_flags` table, `submit_moderation_flag` RPC, `ReportDialog` component, `ModerationDashboard` at `/settings/moderation` |
| **Moderation actions** | **Fully implemented** | Hide, dismiss, restore content via `resolve_moderation_flag` RPC |
| **Role system** | **Fully implemented** | `user_roles` table, `moderator`/`admin` enum, `has_role_or_higher()` RPCs |
| **View-based content hiding** | **Fully implemented** | `discussion_messages` replaces content with placeholder; `discussion_claims/evidence/questions` exclude via NOT EXISTS |
| **User blocks** | **Not implemented** | No `blocks` table, no services, no UI |
| **Mutes** | **Not implemented** | No `mutes` table, no services, no UI |
| **Account deletion** | **Not implemented** | No UI, no RPC, no API route. DB supports passive deletion via FK cascades/SET NULL. |
| **Data export / GDPR** | **Not implemented** | No export mechanism, no SAR infrastructure, no privacy dashboard |
| **Bans / suspensions** | **Not implemented** | `is_banned` mentioned in outdated design doc only; no tables or mechanisms |
| **Safety automation** | **Not implemented** | No AI filters, no keyword blocking, no spam detection |

---

## Phase 2 — Recommended Settings Structure vs Current State

### Account Settings

| Setting | Current State | Implementation Required |
|---|---|---|
| `username` | **Already exists** — editable in profile form | None |
| `display name` | **Not implemented** — no display_name column on profiles | Add column + UI |
| `bio` | **Already exists** — editable in profile form | None |
| `avatar` | **Already exists** — upload in profile form | None |
| `email` | **Not implemented** — no email change UI or service | Wire `supabase.auth.updateUser({ email })` |
| `password` | **Partial** — forgot/reset flow exists but no authenticated change | Add "change password" flow with old password verification |

### Identity & Privacy Settings

| Setting | Current State | Implementation Required |
|---|---|---|
| `default posting identity` | **Already exists** — `default_identity_mode` on profiles | None |
| `remember last identity` | **Not implemented** | Store last-used identity per user (localStorage or DB column) |
| `public reputation visibility` | **Not implemented** — always public | Add privacy column + view-level gating |
| `public expertise visibility` | **Not implemented** — always public | Add privacy column + view-level gating |
| `public side-switch history` | **Not implemented** — always public on timeline | Add privacy column + UI gating |

### Notification Settings

All notification settings require the **entire notification infrastructure** to be built first. No individual setting can work without the underlying table, trigger, and delivery mechanism.

| Setting | Current State |
|---|---|
| `claim replies` | No notification infrastructure exists |
| `evidence replies` | No notification infrastructure exists |
| `inquiry responses` | No notification infrastructure exists |
| `debate activity` | No notification infrastructure exists |
| `side switches` | No notification infrastructure exists |
| `reputation milestones` | No notification infrastructure exists |

### Data & Safety Settings

| Setting | Current State | Implementation Required |
|---|---|---|
| `blocked users` | **Not implemented** | New `blocks` table + UI |
| `muted users` | **Not implemented** | New `mutes` table + UI |
| `reports` | **Already exists** — report dialog + moderation dashboard | None (user view) |
| `export data` | **Not implemented** | New export service + API route |
| `delete account` | **Not implemented** | New RPC + confirmation flow + Supabase Admin API call |

### Immediate vs Deferred Classification

| Category | Immediate (no backend needed) | Backend Work Needed | Already Exists | Deferred |
|---|---|---|---|---|
| **Account** | — | Email change, password change, display name | username, bio, avatar | — |
| **Identity & Privacy** | — | Privacy columns + view gating | default identity mode | remember last identity |
| **Notifications** | — | Entire infrastructure (table, triggers, RPCs, UI, delivery) | — | Notification settings |
| **Data & Safety** | — | Blocks, mutes, account deletion, data export | Reports | Bans, safety automation |

---

## Phase 3 — Database Design Tradeoffs

### Option A: Reuse `profiles` Table Only

Add new columns directly to `profiles`.

```sql
ALTER TABLE public.profiles ADD COLUMN display_name text;
ALTER TABLE public.profiles ADD COLUMN show_reputation boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN show_expertise boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN show_side_switches boolean NOT NULL DEFAULT true;
```

**Pros**: Simple, no new tables, no joins, existing RLS applies, existing service layer extends easily.
**Cons**: Mixes identity fields with preference fields. `profiles` conceptually represents "who the user is" not "what the user prefers." Can grow wide. Every preference change updates the same row (potential contention on frequently updated fields like "last used identity").

**Good for**: Display name, reputation/expertise/ side-switch visibility toggles (low-churn, tightly coupled to profile).

### Option B: Extend `profiles` + Create `user_preferences`

Keep identity data on `profiles`. Move preference/privacy data to a separate table.

```sql
-- On profiles (identity)
ALTER TABLE public.profiles ADD COLUMN display_name text;

-- New table (preferences)
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  show_reputation boolean NOT NULL DEFAULT true,
  show_expertise boolean NOT NULL DEFAULT true,
  show_side_switches boolean NOT NULL DEFAULT true,
  remember_last_identity boolean NOT NULL DEFAULT false,
  last_used_identity public.identity_mode, -- only meaningful if remember_last_identity is true
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Pros**: Clean separation of concerns. Preferences can be cached or fetched independently. Row-level locking on preferences doesn't affect profile reads. Easier to add preference categories later.
**Cons**: Two tables to manage. Additional join or query. Slightly more complex service layer.

**Good for**: Privacy toggles, notification preferences (in future), any preference that is not "who the user is."

### Option C: Create `user_preferences` as a Single JSONB Column

```sql
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Pros**: Highly flexible. No schema migrations for new preferences. One row per user.
**Cons**: No type safety at DB level. No CHECK constraints. Cannot use in RLS policies easily. Cannot index individual preferences. Harder to audit. Violates the project's existing pattern (all other tables use typed columns).

**Not recommended** — the project consistently uses typed columns (CHECK constraints, explicit types). JSONB would be an architectural outlier.

### Recommendation: Option B

> Use **display_name** on `profiles` (it is identity data). Use a separate **`user_preferences`** table with typed columns for everything else.

Rationale:
- `display_name` belongs with `username`, `bio`, `avatar_url` — it is "who you are."
- Privacy toggles, identity memory, future notification prefs are "what you prefer" — separate concern.
- Typed columns (not JSONB) maintain consistency with the existing schema.
- `UNIQUE` on `user_id` guarantees one row per user (simple upsert semantics).
- The `user_preferences` table can later host notification preferences without schema explosion.

---

## Phase 4 — UX Structure

### Navigation Hierarchy

```
Settings
├── Profile              (existing: username, bio, avatar, default identity)
├── Account              (new: email, password, display name)
├── Privacy              (new: reputation/expertise/side-switch visibility)
├── Notifications        (future: preferences per event type)
└── Data & Safety        (new: blocks, mutes, export, delete account)
    └── Moderation       (existing: moderation dashboard — moderator-only)
```

### Page Count

- **1 existing** (Profile — `/settings/profile`)
- **3 new immediate** (Account, Privacy, Data & Safety)
- **1 future** (Notifications)
- **Total: 5** (plus Moderation for moderators)

### Desktop Layout

```
┌──────────────────────────────────────────────┐
│  Settings                                     │
│  ┌──────────┬───────────────────────────────┐ │
│  │ Profile  │  [content area]               │ │
│  │ Account  │  Form fields, toggles,        │ │
│  │ Privacy  │  save button                  │ │
│  │ Notifs   │                               │ │
│  │ Data &   │                               │ │
│  │ Safety   │                               │ │
│  └──────────┴───────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Sidebar navigation (left), consistent with existing app layout patterns.

### Mobile Layout

Bottom sheet or full-screen page per section with a back button and section title at top. No sidebar on mobile — use a settings index page:

```
Settings
├── Profile
├── Account
├── Privacy
├── Data & Safety
└── (Moderation)
```

Each link navigates to a full-screen settings sub-page.

### Information Hierarchy (per page)

**Profile** (existing, update only)
- Avatar upload
- Username (with cooldown indicator)
- Display name (new — add to existing form)
- Bio

**Account** (new page)
- Email (current + change button)
- Password (change form — old + new + confirm)

**Privacy** (new page)
- Default posting identity (move from Profile form here, or keep in both)
- Show reputation on profile (toggle)
- Show expertise on profile (toggle)
- Show side-switch history on profile (toggle)

**Notifications** (future page)
- Per-event-type toggles (claim replies, evidence replies, inquiry responses, etc.)
- Delivery method (in-app / email / both)
- Frequency (immediately / daily digest / weekly)

**Data & Safety** (new page)
- Blocked users list + manage
- Muted users list + manage
- Export my data (button)
- Delete account (red button + confirmation dialog)

---

## Phase 5 — Phased Implementation Plan

### Phase 1: Minimum Viable Settings (1 day)

**Scope**: Add display name, email/password change. Zero new tables. Zero new pages.

| Task | Files | Effort |
|---|---|---|
| Add `display_name` column to `profiles` | 1 migration | Small |
| Add display name to profile form UI | `profile-form.tsx`, `validation.ts`, `profile-service.ts` | Small |
| Wire email change service function | `auth-service.ts` — `updateEmail()` | Small |
| Add "change email" to Account page | New `AccountForm` component, new `/settings/account` route | Medium |
| Wire authenticated password change service function | `auth-service.ts` — `updatePasswordWithOld()` | Small |
| Add "change password" to Account page | Same `AccountForm` component | Small |
| Add navigation link to Account in settings | `sidebar.tsx`, `mobile-nav.tsx` | Small |
| **Total** | ~5 files modified, ~2 files created | **~1 day** |

**Deliverable**: Users can set display name, change email, change password (authenticated).

### Phase 2: Privacy Settings (2 days)

**Scope**: New `user_preferences` table, privacy toggles, new Privacy settings page.

| Task | Files | Effort |
|---|---|---|
| Create `user_preferences` table migration | 1 migration | Medium |
| Create `getUserPreferences` / `upsertUserPreferences` in a new service | `src/features/preferences/services/preference-service.ts` | Medium |
| Create `usePreferences` hook | `src/features/preferences/hooks/use-preferences.ts` | Medium |
| Create privacy settings form | `src/features/preferences/components/privacy-form.tsx` | Medium |
| Create `/settings/privacy` page | new route | Small |
| Gate reputation/expertise/side-switch visibility in profile page | `src/app/u/[username]/page.tsx` | Medium |
| Gate leaderboard visibility | `leaderboard-view.tsx` | Medium |
| Add navigation link to Privacy in settings | `sidebar.tsx`, `mobile-nav.tsx` | Small |
| **Total** | ~8 files created, ~3 files modified | **~2 days** |

**Deliverable**: Users can control whether their reputation, expertise, side-switch history, and leaderboard rank are publicly visible.

### Phase 3: Data & Safety (1-2 days)

**Scope**: Blocks, mutes, data export, account deletion.

| Task | Files | Effort |
|---|---|---|
| Create `blocks` table + RLS + RPCs | 1 migration | Medium |
| Create `mutes` table + RLS + RPCs | 1 migration | Small |
| Create block/mute services, hooks, UI | New feature folder `src/features/safety/` | Medium |
| Create `/settings/safety` page | new route | Medium |
| Create data export service (JSON + CSV) | `export-service.ts` | Medium |
| Create data export API route | `app/api/export/route.ts` | Medium |
| Create account deletion RPC + confirmation flow | RPC + delete-account page | Medium |
| Add navigation link to Data & Safety in settings | `sidebar.tsx`, `mobile-nav.tsx` | Small |
| **Total** | ~10 files created, ~3 files modified | **~1.5 days** |

**Deliverable**: Users can block/mute other users, export their data, and delete their account.

### Phase 4: Notifications (3-4 days — deferred)

**Scope**: Full notification infrastructure. Not recommended until feature usage patterns are established.

| Task | Effort |
|---|---|
| Create `notifications` table | Medium |
| Create `notification_preferences` table | Medium |
| Create notification triggers on all content types | Large |
| Create notification service + hooks | Medium |
| Create in-app notification UI (bell icon, dropdown, page) | Large |
| Implement email notification delivery | Large |
| Create notification preferences UI | Medium |
| Scoped notification preferences in `user_preferences` | Small |
| **Total** | **~3-4 days** |

**Deliverable**: Users receive in-app and email notifications for activity relevant to them.

### Phase 5: Advanced Preferences (future — not estimated)

- "Remember last identity" per-session
- Comment sorting preference
- Debate room default view preference
- Language/locale preference
- Theme preference (light/dark)
- Accessibility preferences

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Preference table becomes dumping ground | Medium | High | Enforce schema discipline: typed columns, ADR for each new preference |
| Privacy gating leaks data via API | Low | Critical | Add RLS checks or view-level filtering on profile data; test each gate |
| Account deletion is irreversible | Medium | High | Implement soft-delete + grace period; confirm with email |
| Data export creates performance issues | Low | Medium | Async export with queue; limit to one export per 24h |
| Notification delivery increases Supabase usage costs | Medium | Medium | Batch notifications; throttle delivery; use DB triggers not client-side polling |
| Blocks/mutes need to affect view queries | Medium | Medium | Need to filter claims, evidence, messages by blocked user; may require view changes |
| Side-switch visibility gating requires view changes | Low | Medium | `debate_side_changes` table has no views; privacy filter must be added to profile timeline query |

---

## Final Recommendation

**Phase 1 (now)**: Extend `profiles` with `display_name`, add email/password change. 1 day, high value, minimal risk.

**Phase 2 (next)**: Create `user_preferences` table, privacy toggles for reputation/expertise/side-switch visibility. 2 days, enables user agency over personal data.

**Phase 3 (when resources allow)**: Data & Safety — blocks, mutes, export, account deletion. 1.5 days, important for trust and compliance.

**Phase 4 (defer)**: Notifications. 3-4 days. Build only after observing that users need them. The platform has functioned without notifications — defer until feature adoption justifies the investment.

**Phase 5 (future)**: Advanced preferences. Not estimated. Defer until user research identifies demand.
