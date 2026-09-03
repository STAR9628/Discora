# Founder QA Checklist

**Goal**: Identify usability and product issues across all recently implemented systems before public launch.
**Scope**: Settings MVP, Inquiry MVP, Debate Engine, Side Switching, Reputation, Profile Dashboard, Argument Maps.
**Method**: Manual review of every user-facing workflow, empty state, error path, and mobile layout.

**Severity Rankings**:
- **P0** — Blocks core workflow, causes data loss, makes app feel broken. Must fix before next user sees it.
- **P1** — Significant friction or confusion on frequent paths. Fix in current sprint.
- **P2** — Polish, edge cases, nice-to-haves. Track for backlog.

---

## 1. High-Friction Workflows

### P0 — Debate browse links point to `/discussions/{slug}` instead of `/debates/{slug}`

**Systems**: Debate Engine, Navigation
**File**: `src/features/debates/components/browse-debates.tsx:136,185`, `create-debate-form.tsx:69`
**Problem**: Every debate link in the browse list and the post-creation redirect sends users to a discussion page. The dedicated `/debates/[slug]` route exists with debate-specific rendering but is unreachable through normal UI. Users click "Debates" → browse → "Join Debate" → land on a discussion page. The entire debate experience is broken for anyone following normal navigation.
**Founder test**: Create a debate. Click its title from the browse list. Where do you land?

### P0 — Profile auto-redirect after save interrupts user, hides success

**Systems**: Profile Dashboard, Settings
**File**: `src/features/profiles/components/profile-form.tsx:163-165`
**Problem**: After saving the profile, the user is unconditionally redirected to `/u/{username}` after 1.5 seconds. The success message is visible for only 1.5 seconds before being yanked away. No "Stay on this page" option. If the user was reading the message or wanted to make additional changes, they lose context.
**Founder test**: Edit your bio. Save. Try to read the success message before being redirected.

### P0 — No "Edit Profile" button on own public profile

**Systems**: Profile Dashboard
**File**: `src/app/u/[username]/page.tsx`
**Problem**: The public profile page has no edit affordance when viewing your own profile. To edit, users must know to navigate Sidebar → Settings → Profile (or type `/settings/profile` manually). There is no "This is you" indicator, no edit pencil, no "Edit Profile" button. A first-time user cannot intuitively find the edit form.
**Founder test**: Navigate to your own profile. How do you edit your display name?

### P0 — Side switch cooldown error swallowed by generic fallback

**Systems**: Side Switching
**File**: `src/features/debates/services/debate-service.ts:370-378`, `src/lib/errors.ts:40-70`
**Problem**: When the RPC raises `cooldown_active` with hint "You can only switch sides once every 24 hours," the client error handler does not map this exception. `mapSupabaseError` cannot match it, so the user sees: **"Failed to switch sides"** — a generic message with no explanation of the 24-hour cooldown. Users think the system is broken, not that they need to wait.
**Founder test**: Switch sides. Try again immediately. What error message do you see?

### P0 — Inquiry rate-limit & authorization errors all swallowed by generic fallback

**Systems**: Inquiry MVP
**File**: `src/lib/errors.ts:40-69`, `202606120001_create_inquiry_tables.sql:140,150,159,263,275,310,318,342,350`
**Problem**: The database RPCs raise 9 distinct exceptions (`rate_limit`, `debate_cap`, `claim_cap`, `only_inquirer`, `invalid_state`, `inquiry_closed`, `not_found`, etc.) each with user-facing hint text. All of them fall through `mapSupabaseError`'s pattern matching and return the generic fallback string. A user hitting the 5/hour rate limit sees "Failed to create inquiry" with zero explanation.
**Founder test**: Create 5 inquiries in one hour. Try a 6th. What message do you see?

### P0 — `display_name` is saved but never rendered on the public profile

**Systems**: Profile Dashboard, Settings
**File**: `src/app/u/[username]/page.tsx:87-97`
**Problem**: The new `display_name` field is correctly stored in the DB, mapped in the service, editable in the form, and loaded into the profile object. But the public profile page header only shows `@{username}`. The display name is invisible everywhere. Users invest effort in customizing their display name for zero visible result.
**Founder test**: Set a display name in settings. View your public profile. Where is it?

### P0 — Leaderboard has no navigation link anywhere

**Systems**: Reputation
**File**: `src/components/layout/sidebar.tsx:25-37`, `src/components/layout/mobile-nav.tsx:23-34`
**Problem**: The leaderboard is only reachable by manually typing `/leaderboard`. There is no sidebar link, no mobile nav link, no link from the profile page, and no link from the reputation section. The entire leaderboard feature is invisible to users navigating normally.
**Founder test**: Open the app. Find the leaderboard without typing the URL.

### P0 — Graph view `expandHops=1` does the same thing as `expandHops=0`

**Systems**: Argument Maps
**File**: `src/features/discussions/components/graph-view.tsx:639-641`
**Problem**: The focus mode hop-expansion buttons for "0 hops" and "1 hop" execute identical code:
```
if (expandHops === 0) return directNeighborIds.has(claimId);
if (expandHops === 1) return directNeighborIds.has(claimId);  // BUG: same as hop 0
if (expandHops === 2) return twoHopIds.has(claimId);
```
The "1 hop" button is a no-op. Users clicking "1 hop" see no change and may think the graph is broken.
**Founder test**: Focus a node in graph view. Click "0 hops" then "1 hop." Do you see any difference?

---

## 2. Confusing Terminology

### P0 — "Inquiry" dialog is titled "Ask a Question" — users see different names for the same thing

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-create-dialog.tsx:62`
**Problem**: The feature is called "Inquiry" everywhere (button, list, status badge, database, types, documentation). But the creation dialog heading says "Ask a Question." Users learn one term from the button, then see a different term inside the dialog. They may wonder whether an Inquiry and a Question are different features (there is also a separate Questions feature in discussions).
**Founder test**: Click the Inquiry button. What does the dialog heading say? Does it match the button label?

### P1 — "Credibility" card shows "Reputation Score" — terms used interchangeably

**Systems**: Reputation
**File**: `src/features/reputation/components/user-credibility-card.tsx:22,27`
**Problem**: The card is titled "Credibility" but the big number is labeled "reputation score." Meanwhile, `types.ts` defines a separate `ClaimCredibility` type for per-claim credibility. Users cannot tell whether these are the same thing or different concepts. The terminology is inconsistent across the profile page.
**Founder test**: Open a profile. Is the score "Credibility" or "Reputation?" Can you tell the difference?

### P1 — "Unsatisfied" button label contradicts toast message "Inquiry re-opened"

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-item.tsx:45-53,173-180`
**Problem**: The button says "Unsatisfied" (implying the user is expressing dissatisfaction), but the success toast says "Inquiry re-opened" (describing the state change). These describe the same action in completely different terms. A user clicking "Unsatisfied" and seeing "re-opened" may not connect the two.
**Founder test**: Mark an inquiry as unsatisfied. Does the toast message match what you expected to happen?

### P2 — Developer-facing "future sprints" language in user-facing info box

**Systems**: Settings
**File**: `src/features/profiles/components/profile-form.tsx:374`
**Problem**: The identity mode info box says: "Storing this preference is preparation for future sprints." The term "sprints" is internal project jargon. Users will not know what a sprint is or why they should care.
**Founder test**: Read the info box next to Default Identity Preference. Do you understand what it's saying?

### P2 — "Argument Map" sets expectations of saved/persisted maps

**Systems**: Argument Maps
**File**: `src/features/discussions/components/map-tab.tsx`
**Problem**: The UI tab is labeled "Argument Map" but there is no `argument_maps` table or entity. What exists is a real-time view of claim relations. Users expecting saved, named, or shareable maps will be confused. The documentation lists `argument_maps` as a future feature, creating a gap between UI label and what's actually implemented.

---

## 3. Empty State Problems

### P0 — Inquiry list returns `null` when there are no inquiries — users never see the feature

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-list.tsx:24`
**Problem**: When a claim has zero inquiries, the entire `InquiryList` component renders nothing. There is no empty-state message, no affordance to create the first inquiry, no prompt. A user who has never used the feature will not know that inquiries exist or are possible. This is the single biggest threat to feature adoption.
**Founder test**: Go to a claim with no inquiries. Is there any indication that the Inquiry feature exists?

### P0 — Contribution timeline entirely hidden for new users

**Systems**: Reputation, Profile Dashboard
**File**: `src/features/reputation/components/profile-reputation-section.tsx:105`
**Problem**: The timeline container is gated on `timelineFiltered.length > 0`. A new user with zero contributions sees nothing — no heading, no placeholder, no "Your contributions will appear here." The `ContributionTimeline` component has an "No contributions yet" empty state, but it is unreachable because the parent already gates on length.
**Founder test**: Create a new account. View your profile. Can you see where your contributions will appear?

### P0 — Debate side picker returns `null` for closed debates and unauthenticated users — no context

**Systems**: Debate Engine
**File**: `src/features/debates/components/debate-side-picker.tsx:25-26`
**Problem**: When a debate is resolved or the user is not logged in, the entire side picker disappears. Users see no "This debate has ended" message, no participant counts, no "Sign in to join" call-to-action. The absence is silent — users don't know why the options vanished.
**Founder test**: Log out. Visit a debate. What do you see in the side picker area?

### P0 — Graph view returns `null` when there are no claims

**Systems**: Argument Maps
**File**: `src/features/discussions/components/graph-view.tsx:722`
**Problem**: When switching to graph view in a discussion with no claims, the entire graph component renders nothing. No "No claims to display" message. Compare with the list view which has a dedicated empty state. Users who switch to graph view see a blank page.
**Founder test**: Open a discussion with zero claims. Switch to graph view. What do you see?

### P1 — Position history returns `null` during loading — causes layout shift

**Systems**: Debate Engine, Side Switching
**File**: `src/features/debates/components/position-history.tsx:16-17`
**Problem**: During data loading, the component returns `null`. When data arrives, it suddenly appears, pushing everything below it downward. No skeleton placeholder exists.
**Founder test**: On a slow connection, watch the debate room load. Does the position history section jump into place?

### P1 — Reputation section returns `null` when data is `null` — no "No reputation yet" for new users

**Systems**: Reputation
**File**: `src/features/reputation/components/profile-reputation-section.tsx:56-58`
**Problem**: When `useReputation` returns `data = null` (new user with zero contributions), the entire reputation section disappears. The heading "Reputation & Contributions" and all its cards are removed from the DOM. A new user sees nothing below "Activity Statistics" — they don't know what they're missing or how to earn reputation.

### P2 — Empty report history has no guidance on how to submit reports

**Systems**: Settings
**File**: `src/features/safety/components/report-history.tsx:72-82`
**Problem**: The "No Reports" empty state shows a flag icon and text, but does not explain how reports are made or where to find the report button. Users who haven't reported anything may not know the feature exists or how to use it.

---

## 4. Mobile UX Issues

### P0 — Settings pages have no mobile navigation — completely unreachable

**Systems**: Settings, Navigation
**File**: `src/components/layout/sidebar.tsx:40`, `src/components/layout/mobile-nav.tsx:28-34`
**Problem**: The sidebar is `hidden md:block` — invisible on mobile. The mobile nav has Home, Search, Create, Notifications (disabled), and Profile. There is no Settings link anywhere on mobile. Settings pages (Profile, Account, Privacy, Safety) are completely unreachable on mobile devices unless the user knows the direct URL.
**Founder test**: Open the app on a phone screen. Navigate to Settings. Can you find the link?

### P0 — Mobile nav has no Debates link

**Systems**: Debate Engine, Navigation
**File**: `src/components/layout/mobile-nav.tsx:28-34`
**Problem**: The mobile nav has no link to browse debates. The "Create" button links to `/discussions/create`, not `/debates/create`. Debates are unreachable on mobile via normal navigation.
**Founder test**: On a phone, find the Debates list without typing `/debates`.

### P1 — Inquiry action buttons too small for mobile touch targets

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-item.tsx:165-190`
**Problem**: Action buttons use `text-[10px]` with `px-2.5 py-1` padding and `gap-2` spacing. Apple HIG recommends minimum 44x44pt touch targets. These buttons are well below that threshold. On a 375px viewport, the row with Satisfy/Unsatisfy/Close buttons is extremely cramped with high mis-tap risk.
**Founder test**: On a phone, try to tap "Satisfy" without accidentally tapping "Close."

### P1 — Graph view is not responsive — 240px fixed card width overflows on mobile

**Systems**: Argument Maps
**File**: `src/features/discussions/components/graph-view.tsx:180`
**Problem**: All graph cards are exactly 240px wide with no viewport-relative scaling. No touch/gesture support (no drag-to-pan, no pinch-to-zoom, no horizontal scroll). On screens narrower than 240px, cards overflow and are clipped. The navigator panel auto-collapses on <1024px but the core graph has no mobile layout at all.
**Founder test**: Open graph view on a phone. Can you see more than one card?

### P2 — Side switch dialog lacks focus trap and Escape key handler

**Systems**: Side Switching
**File**: `src/features/debates/components/side-switch-dialog.tsx:40-133`
**Problem**: The dialog has no focus trap (tab focus can escape behind the backdrop), no Escape key handler, no `role="dialog"` or `aria-modal="true"`. Compare with the inquiry create dialog which has `onClick={onClose}` on the backdrop. Accessibility and keyboard navigation are incomplete.
**Founder test**: Open the side switch dialog. Can you tab outside it? Press Escape. Does it close?

---

## 5. Missing Onboarding

### P0 — Inquiry button has no tooltip or explanation for first-time users

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-button.tsx:10-19`
**Problem**: The button shows "Inquiry" (or "Inquiry (N)") with no `title` attribute, no `aria-label`, no tooltip component. A first-time user has no way to learn that clicking it opens a dialog to ask a question about the claim. The feature depends entirely on users being curious enough to click without knowing what it does.
**Founder test**: See the Inquiry button for the first time. What do you expect happens when you click it?

### P1 — No guidance on what makes a good debate topic

**Systems**: Debate Engine
**File**: `src/features/debates/components/create-debate-form.tsx:114`
**Problem**: The only guidance is a placeholder: "e.g. Universal Basic Income: Solution or Burden?" There is no hint text explaining debate motion best practices (testable statement, single-issue, clear proposition wording). Users may create poorly-formed debate topics that don't work.
**Founder test**: Create a debate. How do you know what makes a good motion?

### P1 — No explanation that email change requires verification

**Systems**: Settings
**File**: `src/features/auth/components/account-form.tsx:73-88`
**Problem**: The email form has an input and submit button with no upfront explanation that a verification email will be sent and the change won't take effect until confirmed. The success message explains this, but only after submission. Proactive guidance would set expectations.
**Founder test**: Change your email. Did you know you'd need to click a verification link?

### P1 — Password requirements not shown before user attempts submission

**Systems**: Settings
**File**: `src/features/auth/components/account-form.tsx:146-174`
**Problem**: The password change form has three fields but does not display the password policy (8+ chars, uppercase, lowercase, number). Users discover these rules only after submitting and seeing a validation error.
**Founder test**: Try a weak password. Did you know the requirements before submitting?

### P2 — "Change Position" button does not communicate what the user is committing to

**Systems**: Side Switching
**File**: `src/features/debates/components/debate-side-picker.tsx:86`
**Problem**: The button just says "Change Position" with an arrow icon. It does not communicate the target side, the 50-character reason requirement, the 24-hour cooldown, or the public system message. All of these are discovered only after opening the dialog.
**Founder test**: Click "Change Position." Did you know what you were signing up for?

---

## 6. Missing Confirmations

### P0 — Side switch has no confirmation at any step

**Systems**: Side Switching
**File**: `src/features/debates/components/side-switch-dialog.tsx:22-37`
**Problem**: After the user types a 50-character reason and clicks "Switch to Support/Challenge," the mutation fires immediately. No "Are you sure?" dialog. Side switching is recorded permanently in `debate_side_changes`, visible in position history, and subject to a 24-hour cooldown. A mis-click or moment of doubt is unrecoverable.
**Founder test**: Switch sides. Did any dialog ask "Are you sure?" before committing?

### P0 — Inquiry Satisfy/Close has no confirmation — irreversible actions with no guard

**Systems**: Inquiry MVP
**File**: `src/features/debates/components/inquiry-item.tsx:34-65`
**Problem**: Satisfy and Close are terminal states (cannot be undone from the database perspective). Both execute on single click with zero confirmation. There is no `confirm()` dialog, no `ConfirmDialog` component, no undo. A mis-click permanently changes the inquiry's state.
**Founder test**: Satisfy an inquiry. Is there any way to undo it?

### P1 — Joining or leaving a debate has no confirmation

**Systems**: Debate Engine
**File**: `src/features/debates/components/debate-side-picker.tsx:108-125`
**Problem**: "Support the Motion" and "Challenge the Motion" buttons call `handleJoin()` directly with no confirmation dialog. The "Leave" button also has no confirmation. Accidental joins or leaves are immediate.
**Founder test**: Click "Support the Motion." Did any dialog confirm your choice?

### P1 — Debate resolution has no confirmation despite "This action is irreversible" warning

**Systems**: Debate Engine
**File**: `src/features/debates/components/debate-resolution.tsx:71,124-128`
**Problem**: The page displays "This action is irreversible" text but then submits immediately on button click with no confirmation dialog. The warning text is visible but not paired with an actual yes/no guard.
**Founder test**: Declare a debate resolution. Did a confirmation dialog appear?

### P1 — Relation deletion has no confirmation

**Systems**: Argument Maps
**File**: `src/features/discussions/components/claim-relation-dialog.tsx:152-153`
**Problem**: Clicking the trash icon deletes a relation immediately with no confirmation. For a collaborative reasoning platform, accidental deletion of a connection between claims is disruptive.
**Founder test**: Delete a relation. Did anything ask if you were sure?

### P2 — Email/password change has no confirmation dialog

**Systems**: Settings
**File**: `src/features/auth/components/account-form.tsx:37-57`
**Problem**: Changing email or password is a security-sensitive action, yet neither form presents a confirmation dialog. A "Are you sure?" step would reduce accidental changes.
**Founder test**: Change your email. Did any dialog confirm this was intentional?

---

## 7. Missing Success Feedback

### P0 — No success feedback after switching sides — user uncertain if it worked

**Systems**: Side Switching
**File**: `src/features/debates/components/side-switch-dialog.tsx:30-34`
**Problem**: After a successful switch, the dialog simply closes. No toast, no animation, no confirmation. The only indication is the side picker re-rendering with new button text — which the user can't see if the picker is off-screen. User uncertainty leads to re-submission, which hits the cooldown and produces a generic error.
**Founder test**: Switch sides. Was there any obvious success feedback?

### P1 — No success feedback after joining or leaving a debate

**Systems**: Debate Engine
**File**: `src/features/debates/components/debate-side-picker.tsx:28-42`, `use-debates.ts:62-66`
**Problem**: The join and leave mutation callbacks only invalidate query caches. No toast, no inline message, no visual cue. Compare with inquiry and debate resolution which DO show toast feedback. This inconsistency erodes trust.
**Founder test**: Join a debate. Leave it. Did you see any confirmation that the action completed?

### P1 — No success feedback after creating a debate

**Systems**: Debate Engine
**File**: `src/features/debates/components/create-debate-form.tsx:58-79`
**Problem**: On success, the user is redirected to the debate page but no success toast is shown. The only indication is the redirect itself. If the page takes time to load, the user may wonder if the creation worked.
**Founder test**: Create a debate. Was there any "Debate created" confirmation?

### P1 — No success feedback in profile reputation section for recalculate failures

**Systems**: Reputation
**File**: `src/features/reputation/services/reputation-service.ts:315-318`, `use-reputation.ts:29`
**Problem**: When the `recalculate_user_reputation` RPC fails, the error is `console.error`'d and `0` is returned. The return value is ignored. The user is not notified that their reputation couldn't be updated. The client-side fallback computation still runs, but if it diverges from the authoritative DB score, the user sees stale data with no indication.
**Founder test**: (Requires RPC failure.) Does the UI tell you reputation failed to update?

### P2 — Settings forms lack unsaved-changes guards

**Systems**: Settings
**File**: `src/features/profiles/components/profile-form.tsx`, `account-form.tsx`, `privacy-form.tsx`
**Problem**: None of the settings forms warn users before navigating away with unsaved changes. If a user fills in fields and clicks a sidebar link, all input is lost without warning. This is especially impactful on the profile form where an avatar file may have been selected.
**Founder test**: Edit your profile without saving. Click another sidebar link. Does anything warn you?

---

## 8. Places Where Users May Not Understand What to Do Next

### P0 — Inquiry count on button is always `0` — never shows real data

**Systems**: Inquiry MVP
**File**: `src/features/discussions/components/claim-list.tsx:592`
**Problem**: The `InquiryButton` receives `count={0}` hardcoded. A claim with 12 inquiries still shows just "Inquiry" with no badge. Users must click every claim to discover whether it has inquiries. The badge component was designed to show `Inquiry (N)` but the data is never passed.
**Founder test**: Go to a claim with many inquiries. What does the Inquiry button show?

### P0 — No cooldown feedback before user starts writing a side switch reason

**Systems**: Side Switching
**File**: `src/features/debates/components/debate-side-picker.tsx:78-89`, `side-switch-dialog.tsx:22-36`
**Problem**: The "Change Position" button has no visual indication that a cooldown is active. A user who switched 23 hours ago will: click the normally-enabled button → type a 50+ character reason → click Submit → get a generic error. They waste time writing a reason only to be rejected.
**Founder test**: Switch sides. Try again immediately. Did anything warn you before you started typing?

### P0 — Contribution errors silently default to all-zero state — no indication of failure

**Systems**: Profile Dashboard, Reputation
**File**: `src/app/u/[username]/page.tsx:37-42`
**Problem**: If `getUserContributions` throws, the error is caught and the page falls back to all zeros. The user sees "Discussions: 0, Claims: 0, Evidence Added: 0" even when data exists but failed to load. No error banner, no "retry" button. The user has no way to know the data is wrong.
**Founder test**: (Requires DB failure.) Does the page tell you data failed to load, or does it show zeros?

### P0 — Privacy preference errors silently default to "show everything"

**Systems**: Profile Dashboard, Settings
**File**: `src/app/u/[username]/page.tsx:48-59`
**Problem**: If the `get_user_preferences` RPC fails, the catch block is empty — all privacy booleans stay `true`. A user who set their reputation to hidden will have it publicly visible if the DB is briefly unavailable. The user has no way to know their privacy settings were bypassed.
**Founder test**: Hide your reputation, then pull the network plug. Is your reputation still visible?

### P1 — Neutral observers see no explanation why "Change Position" is hidden

**Systems**: Side Switching
**File**: `src/features/debates/components/debate-side-picker.tsx:78-89`
**Problem**: When a user is observing neutrally, the "Change Position" button is absent. No tooltip, no disabled button, no explanation. The user must guess that neutral observers need to leave and rejoin on a side.
**Founder test**: Observe a debate as neutral. How do you switch to a side?

### P1 — No link from profile page to leaderboard or vice versa

**Systems**: Reputation, Profile Dashboard
**File**: `src/app/u/[username]/page.tsx`
**Problem**: The profile page shows stat cards and reputation data but has no "View Leaderboard" or "Compare Rankings" link. The leaderboard page has user links but no link back to profiles from the user card. These are disconnected flows.
**Founder test**: View your profile. How do you see how you rank against others?

### P1 — No "your profile" vs "someone else's profile" differentiation

**Systems**: Profile Dashboard
**File**: `src/app/u/[username]/page.tsx`
**Problem**: The page renders identically whether the viewer owns the profile or is a visitor. No "You" badge, no "This is you" indicator, no ownership context. Users have no way to know they are on their own profile unless they recognize the URL.
**Founder test**: Navigate to your own profile. Does the page indicate this is YOUR profile?

### P1 — Leaderboard "Top Expertise Areas" always shows "General" for every user

**Systems**: Reputation
**File**: `src/app/leaderboard/leaderboard-page-client.tsx:32`
**Problem**: `const topExpertise = "General"` is hardcoded. The expertise is never computed from user data. Every leaderboard entry displays "General" as their top expertise, making the entire expertise section misleading.
**Founder test**: Open the leaderboard. What expertise does each user have?

### P2 — Profile has no `not-found.tsx` — users see generic Next.js 404

**Systems**: Profile Dashboard
**File**: missing `src/app/u/[username]/not-found.tsx`
**Problem**: When a username doesn't exist, `notFound()` is called, which renders Next.js's default white 404 page with no branding, no search, and no navigation hints. Users get a dead end with no guidance.
**Founder test**: Visit `/u/nonexistentuser123`. What do you see?

### P2 — Side switch dialog has no character max for the reason field

**Systems**: Side Switching
**File**: `src/features/debates/components/side-switch-dialog.tsx:80-93`
**Problem**: The counter shows `{reason.length} / 50 min` with no max. The effective limit is ~1945 characters (message column limit minus system message prefix), but this is not enforced or communicated client-side. Users may type past the limit and have their submission silently truncated.
**Founder test**: Try to submit a very long side switch reason. Does the UI warn you about length?

---

## Summary

### By Severity

| Severity | Count | Key Systems Affected |
|----------|-------|---------------------|
| **P0** | 17 | Navigation (3), Inquiry (4), Side Switch (3), Profile (3), Reputation (2), Argument Maps (2), Settings (1) |
| **P1** | 16 | Settings (5), Debate Engine (4), Reputation (3), Profile (2), Side Switch (2), Argument Maps (1), Inquiry (1) |
| **P2** | 8 | Settings (3), Side Switch (2), Inquiry (1), Profile (1), Argument Maps (1) |
| **Total** | **41** | |

### By System

| System | P0 | P1 | P2 | Total |
|--------|----|----|----|-------|
| Inquiry MVP | 4 | 1 | 1 | 6 |
| Side Switching | 3 | 2 | 2 | 7 |
| Debate Engine | 1 | 4 | 0 | 5 |
| Profile Dashboard | 3 | 2 | 1 | 6 |
| Settings MVP | 1 | 5 | 3 | 9 |
| Reputation | 2 | 3 | 0 | 5 |
| Argument Maps | 2 | 1 | 1 | 4 |
| Navigation (cross-cutting) | 3 | 0 | 0 | 3 |

### Top 5 Issues to Fix First

1. **Debate navigation broken** — all debate links point to `/discussions/` instead of `/debates/` (P0)
2. **Inquiry empty state returns `null`** — users never discover the feature exists (P0)
3. **Error messages swallowed for inquiries and side switches** — rate limits and cooldowns invisible (P0)
4. **Settings unreachable on mobile** — no mobile nav link to settings (P0)
5. **Success/save feedback lost** — profile redirect hides message, side switch silent, no debate/join confirmation (P0 across 3 systems)
