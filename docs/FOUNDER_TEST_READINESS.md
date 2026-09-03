# Founder Testing Readiness Audit

**Goal**: Determine whether Discora is ready for the founder to conduct a 2-hour manual testing session across all Sprint 3 systems.

**Scope**: Mobile Navigation, Display Name Rendering, Debate Discovery, Inquiry Discovery, Deployment Readiness.

**Method**: File-level review of source code for each dimension, comparing expected behavior against actual implementation.

**Severity for this audit**:
- **P0** — Blocks testing entirely or makes a core flow impossible. Must fix before founder testing.
- **P1** — Significant friction or confusion that will waste testing time. Fix before testing if possible.
- **P2** — Minor annoyance. Note for backlog.

---

## 1. Mobile Navigation

### Finding: Mobile nav has no Settings, Debates, or Discussions links

**File**: `src/components/layout/mobile-nav.tsx`

**Content** (4 items):
| Item | Label | Route | Status |
|------|-------|-------|--------|
| Home | `FiHome` | `/` | OK |
| Search | `FiSearch` | `/search` | OK |
| Create | `FiPlusCircle` | `/discussions/create` | OK but debates-only path missing |
| Profile | `FiUser` | `/u/[username]` | OK |

**Missing items found in the desktop sidebar but absent on mobile**:

| Missing Item | Desktop sidebar | Mobile nav | Severity |
|---|---|---|---|
| Settings (5 sub-pages) | `FiSettings` → `/settings/profile` | **Not present** | **P0** |
| Debates | `FiMessageSquare` → `/debates` | **Not present** | **P1** |
| Discussions | `FiBookOpen` → `/` | **Not present** | **P1** |

**P0 — Settings unreachable on mobile**: The 5 settings pages (Profile, Account, Privacy, Safety) have no navigation affordance on mobile. The sidebar is `hidden md:block`. A founder testing on a phone-width viewport must type `/settings/profile` manually.

**P1 — No debate or discussion discovery on mobile**: Founders cannot browse the debates list or discussions feed from mobile. "Create" links to `/discussions/create` only — no way to create a debate.

**Root cause**: The Founder QA Remediation Sprint (P0-D) attempted to add a Settings link but the edit was lost during Fix 3 (which reduced the 5-item array to 4 items by removing the disabled Notifications item). Settings was never re-added.

---

## 2. Display Name Rendering

### Finding: `displayName` saved to DB but invisible on the public profile page

**Files**:
- `src/features/profiles/components/profile-form.tsx` — collects and saves `displayName` ✓
- `src/features/profiles/services/profile-service.ts` — `mapProfileRow` maps `display_name` to `displayName` ✓
- `src/app/u/[username]/page.tsx` — renders `@{username}` but NOT `displayName` ✗

**Flow**:
1. User edits display name in Settings → Profile form → saves to `profiles.display_name`
2. Profile page fetches user profile → `mapProfileRow` correctly returns `displayName`
3. Profile page JSX only renders: `@{userProfile.username}` and `userProfile.bio`
4. `userProfile.displayName` exists in data but is never referenced in the template

**Impact for founder testing**: If the founder sets a display name and navigates to their public profile, they will see zero visible change. The feature appears broken despite working correctly at every layer except rendering.

**Severity**: **P1** (feature appears half-baked; does not block testing but will confuse the founder)

**Fix**: Add `displayName` rendering to the profile page header, e.g.:
```
<h1>{userProfile.displayName || `@${userProfile.username}`}</h1>
<p>@{userProfile.username}</p>
```

---

## 3. Debate Discovery

### Finding: Desktop navigation works; mobile navigation missing

**Desktop navigation** (sidebar):
- `FiMessageSquare` → `/debates` ✓
- Browse debates page has "Create" → `/debates/create` ✓
- After creation, redirects to `/debates/{slug}` ✓ (was P0-A, fixed)
- Debate links from /debates use correct `/debates/{slug}` route ✓

**Mobile navigation** (mobile-nav.tsx):
- No debates link at all ✗ (see Section 1)
- "Create" hardcoded to `/discussions/create` — cannot create a debate from mobile

**Impact for founder testing**: If the founder tests debate creation on desktop, the flow works. If on mobile, they cannot find or create debates.

**Severity**: **P1** (functional on desktop, broken on mobile)

---

## 4. Inquiry Discovery

### Finding: Core functionality works; UX needs polish

**What's working**:
- InquiryButton appears on every claim ✓
- Badge count shows real data from `inquiry_counts` ✓ (was P0, fixed in P1 Sprint)
- Inquiry creation dialog opens with "Ask a Question" title
- Inquiry list shows inquiries when they exist
- Satisfy/Unsatisfy/Close actions have confirmation dialogs ✓ (was P0-E, fixed)

**Remaining issues**:

| Issue | File | Severity | Detail |
|---|---|---|---|
| Empty state returns `null` | `inquiry-list.tsx:24` | **P1** | When no inquiries exist, the entire component renders nothing. Compare with P0-B fix in the audit that listed this as fixed — but `src/features/debates/components/inquiry-list.tsx` still returns `null` for null/undefined data on line 24. |
| No first-use tooltip | `inquiry-button.tsx:10-19` | **P2** | No `title` attribute, no tooltip, no `aria-label`. First-time users must guess what "Inquiry" means. |
| Dialog title mismatch | `inquiry-create-dialog.tsx:62` | **P2** | Button says "Inquiry", dialog says "Ask a Question". Users may wonder if these are different features. |

**Impact for founder testing**: Founders will see the Inquiry button and badge counts. They can create inquiries. But claims with zero inquiries show no empty state — founders won't know the inquiry UI area exists until they find a claim that already has inquiries.

**Severity**: **P1** (functional but discoverability gap)

---

## 5. Deployment Readiness

### Finding: `deploy_pending_migrations.sql` is critically incomplete

**File**: `supabase/deploy_pending_migrations.sql`

**Current content**: Includes only **3 migrations** out of **30 total**:
| # | Migration | Included? |
|---|---|---|
| 1 | `202606010001_create_claim_functions.sql` | ✅ |
| 2 | `202606010002_create_discussion_functions.sql` | ✅ |
| 3 | `202606010003_create_debate_functions.sql` | ✅ |
| ... | (26 others) | ❌ |
| 27 | `202606120001_create_inquiry_tables.sql` | **❌ Missing** |
| 28 | `202606120002_add_side_switch_check.sql` | **❌ Missing** |
| 30 | `202606130001_add_display_name_and_preferences.sql` | **❌ Missing** |

**Missing migrations critical for Sprint 3 features**:

| Missing Migration | Purpose | If not deployed |
|---|---|---|
| `202606120001_create_inquiry_tables.sql` | Creates inquiry tables, RPCs, RLS | Inquiry feature completely broken in production |
| `202606130001_add_display_name_and_preferences.sql` | Adds `display_name` column, `user_preferences` table | Profile forms will fail, display names not saved |
| `202606120002_add_side_switch_check.sql` | Side switch validation | Side switching may break |

**Impact for founder testing**: If the codebase is deployed to a production or staging environment using only the 3 migrations in `deploy_pending_migrations.sql`, the Inquiry MVP and Settings MVP will be completely non-functional. Every database operation will fail with missing table/column errors.

**Severity**: **P0** (blocks testing entirely — cannot deploy without this fix)

**Root cause**: The `deploy_pending_migrations.sql` script was written during Sprint 2 and only included migrations available at that time. The 27 migrations added during Sprint 3 and Sprint 4 were never appended. Additionally, the script uses hardcoded migration IDs instead of dynamically reading the `supabase/migrations/` directory.

**Fix options**:
1. **(Recommended)** Regenerate `deploy_pending_migrations.sql` from the full `supabase/migrations/` directory with a script
2. Manually append all 27 missing migrations in chronological order
3. Switch to Supabase CLI `supabase db push` instead of maintaining a manual script

---

## Summary

### By Severity

| Severity | Count | Key Issues |
|---|---|---|
| **P0** | 2 | Mobile Settings navigation missing; deployment migration script incomplete |
| **P1** | 3 | Display name not rendered; mobile debate/discovery missing; inquiry empty state null |
| **P2** | 3 | No inquiry tooltip; dialog title mismatch; mobile create debates-only |

### Is Discora Ready for Founder Testing?

**Not yet.** Two P0 issues must be resolved before a 2-hour founder testing session:

1. **Fix `deploy_pending_migrations.sql`** — Without this, any deployed environment will fail on every Sprint 3 feature. The founder cannot test features that don't work.
2. **Add Settings link to mobile nav** — Settings is a core testing path (profile editing, privacy, safety). Making the founder type URLs to test settings wastes testing time and breaks the "real user" simulation.

The three P1 issues (display name, mobile debate discovery, inquiry empty state) should be fixed before testing for a smooth experience, but testing is possible with verbal guidance.

### Recommended Pre-Testing Fixes

| Order | Fix | File(s) | Effort |
|---|---|---|---|
| 1 | Regenerate deploy_pending_migrations.sql | `supabase/deploy_pending_migrations.sql` | Small (script) |
| 2 | Add Settings link to mobile nav | `src/components/layout/mobile-nav.tsx` | Trivial (2 lines) |
| 3 | Render displayName on profile page | `src/app/u/[username]/page.tsx` | Trivial (1 line) |
| 4 | Fix inquiry-list empty state | `src/features/debates/components/inquiry-list.tsx` | Small |
| 5 | Add Debates link to mobile nav | `src/components/layout/mobile-nav.tsx` | Trivial (2 lines) |
