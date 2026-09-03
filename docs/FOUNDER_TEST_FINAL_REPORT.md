# Founder Testing Final Report

**Goal**: Apply 6 targeted fixes to prepare Discora for founder manual testing, then verify build integrity.

---

## Fix 1: Side-Switch Feedback

### Root Cause
Three distinct problems: (a) no success toast — dialog closed silently after switch, (b) `cooldown_active` exception was not mapped in `switchDebateSide()`, falling through to generic `mapSupabaseError`, (c) no cooldown indicator on the Change Position button — users typed 50+ characters before discovering the 24-hour cooldown.

### Files Changed

| File | Change |
|---|---|
| `src/features/debates/components/side-switch-dialog.tsx` | Added `toast.success()` call after successful switch (lines 35-37). Imported `toast` from `@/components/ui/toast`. |
| `src/features/debates/services/debate-service.ts` | Added `cooldown_active` error mapping returning the 24-hour message (line 376). |
| `src/features/debates/components/debate-side-picker.tsx` | Added `useSideChangeHistory` hook to fetch latest side change. Computes `cooldownRemaining` in hours. Shows amber cooldown banner with remaining time instead of the "Change Position" button when cooldown is active. Imported `Clock`, `useSideChangeHistory`. |

### Before / After

| Scenario | Before | After |
|---|---|---|
| Successful switch | Dialog closes silently | Toast: "Position changed — You are now supporting/challenging the motion." |
| Cooldown hit | Generic error: "Failed to switch sides" | Specific error: "You can only switch sides once every 24 hours. Please wait before changing again." |
| Cooldown visible | Button looks clickable at all times | Amber cooldown banner: "Cooldown — 23h remaining" replaces the Change Position button |

---

## Fix 2: Mobile Navigation

### Root Cause
The mobile bottom nav (`mobile-nav.tsx`) only had 4 items (Home, Search, Create, Profile). Discussions, Debates, and Settings were completely unreachable on mobile via normal navigation.

### Files Changed

| File | Change |
|---|---|
| `src/components/layout/mobile-nav.tsx` | Added `Discussions` (→ `/discussions`), `Debates` (→ `/debates`), and `Settings` (→ `/settings/profile`) to the `mobileItems` array. Changed grid from `grid-cols-4` to `grid-cols-7`. Added Settings active-state detection via `pathname.startsWith("/settings")`. Imported `MessageSquare`, `Scale`, `Settings` icons. |

### Before / After

| Before (4 items) | After (7 items) |
|---|---|
| Home, Search, Create, Profile | Home, Discussions, Search, Debates, Create, Profile, Settings |

All items are direct navigation links. Settings highlights on any `/settings/*` path.

---

## Fix 3: Evidence Validation Mismatch

### Root Cause (Retrospective)
The original DB constraint in `202606030005_create_evidence.sql` required `char_length(content) between 50 and 1000`, while the frontend Zod schema required min 20. Users submitting 20-49 characters passed client validation but received a server error.

### Fix Path
The fix migration `202606050004_fix_content_length_constraints.sql` already lowered the DB minimum to 20, matching the frontend. **No code change was needed** — the frontend (Zod min 20, submit button disabled at < 20, placeholder "min 20 characters") and DB (after fix migration, min 20) are already consistent.

### Verification
```
DB:   char_length(content) between 20 and 1000  (after 202606050004)
Zod:  .min(20, ...).max(1000, ...)               (already correct)
```

### Deploy Note
`deploy_pending_migrations.sql` must include `202606050004_fix_content_length_constraints.sql`. Without it, the DB retains the original min 50 constraint and the mismatch reappears.

---

## Fix 4: Signup Flow

### Root Cause
(a) No password confirmation field — users could mistype their password with no way to detect it until login. (b) After registration, the success message was plain text with no call to action — users stayed on the form with no guidance to check email.

### Files Changed

| File | Change |
|---|---|
| `src/features/auth/validation.ts` | Added `confirmPassword` field to `registerSchema` with `.refine()` matching existing `resetPasswordSchema` pattern (lines 15-24). |
| `src/features/auth/components/register-form.tsx` | Added "Confirm Password" input field with error display (lines 92-108). Changed success message from plain `<p>` to styled card with explicit guidance text (lines 109-114). |
| `src/app/(auth)/register/page.tsx` | Updated subtitle from technical "Email verification is handled by Supabase Auth" to user-facing "You will receive a verification email — click the link to activate your account and get started." (line 10). |

### Before / After

| Aspect | Before | After |
|---|---|---|
| Form fields | Email, Password | Email, Password, Confirm Password |
| Password mismatch | Undetected until login | Inline error: "Passwords must match." |
| Success message | Plain muted text: "Registration started. Check your email..." | Styled card with icon area: message + "Please check your inbox and click the verification link to activate your account." |
| Page subtitle | "Email verification is handled by Supabase Auth." | "You will receive a verification email — click the link to activate your account and get started." |

---

## Fix 5: Inquiry Terminology

### Root Cause
The Questions tab heading read "Ask a First-Class Question" — the term "First-Class" is unexplained internal jargon. A new user wouldn't know what distinguishes a "first-class" question from a regular one.

### Files Changed

| File | Change |
|---|---|
| `src/features/discussions/components/question-list.tsx` | Heading changed from "Ask a **First-Class** Question" to "Ask a Question" (line 112). Empty state description changed from "Be the first to frame the room discussion with **first-class questions**." to "Be the first to frame the room discussion with **a question**." (line 250). |

### Before / After

| Location | Before | After |
|---|---|---|
| Form heading | "Ask a First-Class Question" | "Ask a Question" |
| Empty state | "...with first-class questions." | "...with a question." |

---

## Fix 6: Consistent Casing

### Root Cause
The contribution type radio buttons in the claim form used mixed casing: "Supporting Idea" (title case), "counterpoint" (lowercase), "observation" (lowercase), "Open Question" (title case). The fallthrough to raw `type` string for `counterpoint` and `observation` caused the inconsistency.

### Files Changed

| File | Change |
|---|---|
| `src/features/discussions/components/claim-list.tsx` | Updated the ternary to include explicit labels for all 4 types: "Supporting Idea", "Counterpoint", "Observation", "Open Question" (lines 316-319). Removed the `capitalize` utility class. |

### Before / After

| Type | Before | After |
|---|---|---|
| `supporting_idea` | "Supporting Idea" | "Supporting Idea" |
| `counterpoint` | "counterpoint" | "Counterpoint" |
| `observation` | "observation" | "Observation" |
| `open_question` | "Open Question" | "Open Question" |

---

## Build Report

```
Command: npm run build
Result:  ✓ Compiled successfully in 10.9s
Errors:  0
Warnings: 8 (all pre-existing — unused imports, <img> elements)
```

### Pre-existing Warnings (Not Introduced by This Sprint)

| File | Warning |
|---|---|
| `src/features/debates/components/debate-room.tsx` | Unused import `Award` |
| `src/features/discussions/components/discussion-room.tsx` | Unused imports `Award`, `FileText`, `CommentNode` |
| `src/features/discussions/components/comment-item.tsx` | `<img>` instead of `<Image />` |
| `src/features/discussions/components/room-evidence-tab.tsx` | `<img>` instead of `<Image />` |
| `src/features/debates/components/inquiry-item.tsx` | `<img>` instead of `<Image />` |
| `src/features/debates/components/inquiry-response.tsx` | `<img>` instead of `<Image />` |

---

## Summary

| Fix | Files Changed | Status | Type Errors | New Warnings |
|---|---|---|---|---|
| 1. Side-switch feedback | 3 | Done | 0 | 0 |
| 2. Mobile navigation | 1 | Done | 0 | 0 |
| 3. Evidence validation | 0 (already matched) | Done | 0 | 0 |
| 4. Signup flow | 3 | Done | 0 | 0 |
| 5. Inquiry terminology | 1 | Done | 0 | 0 |
| 6. Consistent casing | 1 | Done | 0 | 0 |
| **Total** | **9 files modified**, 0 created | **Build: PASS** | **0** | **0 new** |
