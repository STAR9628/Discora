# Discora — Final Pre-Production UI/UX + Auth Audit Report

**Report type:** Pre-Production Release Audit
**Audit scope:** UI/UX correctness, auth wiring, shell architecture
**Phase designation:** Final Pre-Beta UX/Auth Correction Pass
**Audit conducted:** 2026-09-19
**Auditor:** Antigravity AI

---

## Release Baseline Lineage

| Commit | Description |
|--------|-------------|
| `dbaf36a` | `feat: establish Discora Public Beta release baseline` |
| `d7a3e4f` | `fix: harden deleted-user view migration for postgres compatibility` |
| `ad5f2d7` | `chore: finalize Discora Public Beta release baseline` |
| **`d9037f9`** | **`fix: finalize pre-beta ui and auth release corrections`** <- **Current HEAD / Authoritative Release Candidate** |

The corrective commit `d9037f9` was applied on top of the frozen release baseline `ad5f2d7` and constitutes the authoritative public beta release candidate.

---

## 1. Audit Findings and Root-Cause Classification

### 1.1 Shell Architecture — Double-Wrapping (FIXED)

**Finding:** Discussion room child routes (`/discussions/[slug]/*`) were wrapped by both `DiscussionRoomLayout` (the authoritative room shell) and an inner `<main>` element or a second `RoomSectionShell` instantiation inside each child page component. This produced visually broken layout nesting on all discussion section routes.

**Root cause:** Child page components each rendered their own `RoomSectionShell` and/or `<main>` wrapper, duplicating the shell already provided by `DiscussionRoomLayout`.

**Fix applied:**
- Removed `RoomSectionShell` instantiation and `<main>` wrappers from all child pages.
- `DiscussionRoomLayout` is now the single authoritative shell provider for all discussion sub-routes.
- `room-section-shell.tsx` was updated to handle `null` active-section state gracefully.
- `discussion-room-layout.tsx` was updated to derive the active lens from `usePathname()` and the outer element changed from `<main>` to `<div>`.

**Files modified:**
- `src/app/discussions/[slug]/page.tsx`
- `src/app/discussions/[slug]/claims/page.tsx`
- `src/app/discussions/[slug]/evidence/page.tsx`
- `src/app/discussions/[slug]/questions/page.tsx`
- `src/app/discussions/[slug]/contributions/page.tsx`
- `src/app/discussions/[slug]/understanding/page.tsx`
- `src/features/discussions/components/discussion-room-layout.tsx`
- `src/features/rooms/components/room-section-shell.tsx`

**Status:** FIXED — Verified in browser QA.

---

### 1.2 Sidebar Default State — Expanded Instead of Collapsed (FIXED)

**Finding:** The desktop sidebar defaulted to expanded on first load. Per design intent, the sidebar must default to collapsed on desktop. The user preference must be persisted to `localStorage` under `discora_sidebar_collapsed`.

**Root cause:** `AppShell` initialized `isSidebarCollapsed` to `false`. The `Sidebar` did not read from `localStorage` on mount.

**Fix applied:**
- `AppShell` now initializes `isSidebarCollapsed` to `true`.
- On mount, reads `discora_sidebar_collapsed` from `localStorage` and respects it if present.
- Write-back maintained on each toggle.

**Files modified:**
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`

**Status:** FIXED — Verified in browser QA.

---

### 1.3 Lens Navigation Active-State — Contributions Route (FIXED)

**Finding:** The contributions lens was not correctly detected as active when navigating to `/discussions/[slug]/contributions`.

**Root cause:** Active-section derivation did not account for the `contributions` segment consistently.

**Fix applied:** Resolved as part of the shell architecture correction (1.1). Active state is now derived uniformly from `usePathname()` inside `DiscussionRoomLayout`.

**Status:** FIXED — Verified in browser QA.

---

### 1.4 Google OAuth — 401: invalid_client (OPERATOR DEPENDENCY — NOT A CODE REGRESSION)

**Finding:** Google OAuth returns `401: invalid_client` in the local development environment.

**Investigation:**
- `src/app/auth/callback/route.ts` — Correct. Uses `exchangeCodeForSession()` with allowlisted safe-redirect.
- `src/features/auth/components/login-form.tsx` — Correct. Uses `getSafeRedirectUrl` before OAuth redirect.
- `src/lib/security/safe-redirect.ts` — Correct and unchanged.
- `src/features/auth/services/auth-service.ts` — OAuth flow initiation is correct.

**Root cause classification:** OPERATOR CONFIGURATION DEPENDENCY.

The `401: invalid_client` error is produced by Google's OAuth endpoint when the `client_id` does not match a registered credential or the `redirect_uri` is not registered in Google Cloud Console. The application code is correct and has not regressed.

**Application code verdict:** NO CODE REGRESSION FOUND.

**Operator action required before production:**
1. Register production Supabase callback URI with Google Cloud Console.
2. Configure Google provider in Supabase Auth settings with production Client ID and Secret.

---

## 2. Build and Type-Check Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS — 0 errors, 0 warnings |
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint (`npm run lint`) | PASS |
| Pages generated | 31 static/dynamic pages |
| Shared JS bundle | 102 kB |

---

## 3. Browser QA Results

| Area | Result |
|------|--------|
| Discussion room shell — all section routes | PASS — Single shell, no double-nesting |
| Sidebar — initial state (desktop) | PASS — Collapsed on first load |
| Sidebar — localStorage persistence | PASS — Preference restored on reload |
| Lens navigation — active state, all lenses | PASS — Correct active highlight |
| Mobile responsiveness — discussion rooms | PASS |
| Auth — email/password flow | PASS |
| Auth — Google OAuth flow | OPERATOR DEPENDENCY (see 1.4) |
| Guest contribution prompt | PASS |
| Discussion overview (State of Understanding) | PASS |

---

## 4. Scope Boundaries — What Was NOT Changed

This corrective pass explicitly did not:
- Add new product features.
- Modify debate room architecture.
- Modify any Supabase migrations.
- Contact production Supabase.
- Modify any RLS policies, RPCs, or database functions.
- Modify DNS, deployment configuration, or Netlify settings.
- Change Discora product philosophy or semantics.

---

## 5. Outstanding Operator Dependencies Before Production

1. **Google OAuth credentials** — Register production Supabase callback URI with Google Cloud Console. Configure Client ID and Secret in Supabase Auth settings.
2. **Production environment variables** — Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-side secrets in Netlify production.
3. **Supabase production migrations** — Apply all migrations in `supabase/migrations/` to production via `supabase db push`.
4. **Cloudflare DNS / Netlify domain binding** — Route production domain through Cloudflare to Netlify per operator runbook.

See `docs/PRE_BETA_PRODUCTION_OPERATOR_DEPENDENCY_MATRIX.md` and `docs/PRE_BETA_PRODUCTION_DEPLOYMENT_OPERATOR_READINESS_RUNBOOK.md`.

---

## 6. Final Release State

| Item | Value |
|------|-------|
| Authoritative release commit | `d9037f9bc00c2108bc05c03228f44b588f1d9d6e` |
| Commit message | `fix: finalize pre-beta ui and auth release corrections` |
| Branch | `main` |
| Working tree modified tracked files | 0 |
| Untracked files | Operator/QA artifacts — legitimate, not required in release |
| Build status | PASS |
| Code regression found | NONE |
| Release freeze status | FROZEN |

The repository is in a clean, frozen state. No further application code changes are authorized before production provisioning. All remaining actions are operator provisioning tasks.

---

*Report generated by Antigravity AI — Discora Final Pre-Beta UX/Auth Correction Pass, 2026-09-19.*
