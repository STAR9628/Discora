# Discora — Pre-Production Release Manifest (Release Freeze Audit)

**Mode:** READ-ONLY RELEASE PREPARATION AUDIT. No commits. No pushes. No deploys. No production contact. No migration edits/creation. No file deletions/renames. No Auth/OAuth/SMTP/DNS changes.
**Date (UTC):** 2026-09-18
**Branch / HEAD:** `main` @ `0223c7011ff8cb0631ebdf2f84414a97a8d929bd`
**Authoritative manifest source:** `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md` (§9, 13-file set)

---

## A. Release Readiness Summary

The working tree contains the complete approved Beta product (security remediation, account deletion, OAuth 18+ enforcement, UI remediation, SEO/AI discoverability, branding integration, friends, invitations), but it is **not release-reproducible from git**: 109 tracked files are modified, 5 tracked files are deleted, and 329 untracked paths exist — including all 13 production-manifest migrations, the deletion Server Action, the OAuth attest-age route, the SEO routes (`robots.ts`, `sitemap.ts`, `opengraph-image.tsx`), the branding asset, and even the agent governance document itself. HEAD (`0223c70`) predates all Phase 9C/9D/SEO work.

**A clean checkout of tracked files at HEAD would NOT build the Beta product.** It would build a pre-9C.4A application against a schema missing `is_deleted`, `retired_handles`, friend tables, invitation remediation, and 9 other migrations.

**Verdict: B — release contents mostly clear but explicit conditions remain** (§J).

---

## B. Git State

| Metric | Value (VERIFIED 2026-09-18) | How verified |
|---|---|---|
| Branch | `main` | `git branch --show-current` |
| HEAD | `0223c7011ff8cb0631ebdf2f84414a97a8d929bd` | `git rev-parse HEAD` |
| Tracked files | 448 | `git ls-files \| Measure` |
| Unstaged modified | 109 | `git status --porcelain` (`^ M`) |
| Deleted | 5 | `git status --porcelain` (` D`) |
| Untracked porcelain lines | 329 | `git status --porcelain` (`??`), saved to evidence file |
| Staged (`git diff --cached`) | 0 (empty) | `git diff --cached --stat` |
| Worktree diff magnitude | 114 files, +11,624 / −6,844 | `git diff --stat` |
| Working tree | **DIRTY** | — |

Deleted tracked files (all 5 VERIFIED via porcelain):
1. `src/features/debates/components/debate-resolution.tsx`
2. `src/features/debates/components/debate-scorecard.tsx`
3. `src/features/reputation/components/claim-credibility-badge.tsx`
4. `src/features/reputation/components/credibility-tooltip.tsx`
5. `src/features/reputation/components/user-credibility-card.tsx`

These deletions are consistent with approved cleanup (winner/loser removal per `202606270001`; credibility-badge retirement). They are part of the release delta, not accidents.

Line-ending note: ~100 tracked files emit `warning: in the working copy … LF will be replaced by CRLF` on diff. This is a local `core.autocrlf` presentation warning, not a content change; the diff hunks themselves are real product changes (verified by hunk inspection on `package.json`, `next.config.ts`, `.gitignore`).

### Untracked breakdown (329 porcelain lines)
| Top-level | Lines | Category mapping |
|---|---|---|
| `docs/` | 169 | C (required docs, subset) + D (historical audit evidence) + G (screenshots/QA artifacts) |
| `scripts/` | 73 | F (QA harnesses, SQL checks) + D (`rebuild-phase8d-migration.mjs` = 130002 reconstruction evidence) |
| `src/` | 52 | **A (required application files)** — enumerated in §C |
| `supabase/` | 31 | B (30 migrations) + D (`archive_9c4a_incident/`) |
| `public/` | 1 (dir) | A (`discora-mark.png` only file inside) |
| `tests/` | 1 (dir) | F (`friend_regression.sql`, `phase5c-onboarding-qa.spec.ts`) |
| `playwright.config.ts` | 1 | F (test config) |
| `.next-dev.log` | 1 | G (generated log) |

Note: several `??` lines are directory rollups (`docs/legal/`, `docs/phase7b-screenshots/`, `docs/screenshots_phase_*/`, `docs/visual_qa/`, `public/`, `tests/`, `supabase/archive_9c4a_incident/` is tracked? — actually `supabase/` count 31 = 30 migration files + 1 archive dir line; the archive dir itself contains the 2 tracked-or-untracked defect files. Verified: `supabase/archive_9c4a_incident/` holds `202609140001` + `202609140002`.)

### Categorization of every untracked path
- **A. REQUIRED FOR FIRST BETA RELEASE:** all 52 `src/` lines + `public/discora-mark.png` (§C).
- **B. REQUIRED DATABASE MIGRATION:** the 30 untracked migration files; of these exactly the 13-file manifest (§D) enters the release; the other 17 (090001–090011, 130001/130002/130003, 140003, 260006, 270001, 040003/100006 context) are already-applied or superseded history that ships implicitly via the release baseline decision (§E).
- **C. REQUIRED DOCUMENTATION:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md`, `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md`, this report, `docs/legal/` drafts, `docs/00_MASTER_CONTEXT.md` (already tracked-clean — no action).
- **D. HISTORICAL / ARCHIVE:** ~100 audit/report `.md` files, `scripts/rebuild-phase8d-migration.mjs`, `supabase/archive_9c4a_incident/`, QA result JSONs. Keep in repo history but exclude from any minimal deploy bundle; valuable as evidence.
- **E. LOCAL DEVELOPMENT ONLY:** `.next-dev.log`. Never release.
- **F. TEST / FIXTURE ONLY:** `scripts/*.mjs` harnesses (73 lines), `tests/` dir, `playwright.config.ts`, `docs/phase_*_qa_results.json`, `docs/*_debug.*`. Exclude from production bundle.
- **G. GENERATED ARTIFACT:** `.next/` (ignored), screenshots under `docs/*.png`, `docs/*/screenshots`, coverage. Exclude.
- **H. UNKNOWN — REQUIRES OWNER DECISION:** none identified beyond the standing product decisions (P1-SEO-01 SSR strategy, sitemap scope, OAuth production credentials, legal counsel sign-off) already tracked in prior reports.

---

## C. Required Application Files

All files below are VERIFIED present in the working tree with the stated git status (2026-09-18). `??` = untracked-new (required addition); ` M` = tracked-modified (required delta).

### AUTH / AGE (OAuth 18+ enforcement + email attestation)
| File | Status | Role |
|---|---|---|
| `src/app/auth/attest-age/page.tsx` | ?? | Suspense boundary (server) |
| `src/app/auth/attest-age/attest-age-content.tsx` | ?? | Attestation form (client): phrase + checkbox → `profiles.age_confirmed = true` |
| `src/services/supabase/middleware.ts` | M | OAuth age gate: unconfirmed OAuth users → `/auth/attest-age`; `is_deleted` fail-closed |
| `src/features/profiles/components/profile-form.tsx` | M | Sets `ageConfirmed` for email signups |
| `src/features/profiles/services/profile-service.ts` | M | `createProfile` accepts `ageConfirmed`; `mapProfileRow` maps it |
| `src/types/domain.ts` | M | `UserProfile.ageConfirmed?` |
| `src/features/auth/components/register-form.tsx` | M | 18+ checkbox |
| `src/features/auth/services/auth-service.ts` | M | `data: { age_confirmed: true }` on email signup |
| `src/app/auth/callback/route.ts` | M | Safe-redirect allowlist (unchanged contract) |
| `src/app/(auth)/layout.tsx` | ?? | `noindex` for auth routes |

### ACCOUNT DELETION (Option C)
| File | Status | Role |
|---|---|---|
| `src/features/settings/services/account-deletion-actions.ts` | ?? | `deleteMyAccount`, step-up (password/OTP), GoTrue admin ordering, storage queue, rate limits |
| `src/features/settings/components/delete-account-dialog.tsx` | ?? | Danger Zone dialog: phrase + step-up + progress/error states |
| `src/features/settings/components/settings-page-client.tsx` | M | `DangerZonePanel` integration |

### SEO / SSR / DISCOVERABILITY
| File | Status | Role |
|---|---|---|
| `src/app/robots.ts` | ?? | Crawler policy |
| `src/app/sitemap.ts` | ?? | Dynamic sitemap (public rooms/profiles/legal) |
| `src/app/opengraph-image.tsx` | ?? | Static brand OG card |
| `src/app/discussions/[slug]/layout.tsx` | ?? | Room layout + `generateMetadata` + BreadcrumbList/DiscussionForumPosting |
| `src/app/discussions/[slug]/understanding/page.tsx` | ?? | SoU initial-data route |
| `src/app/discussions/[slug]/sources/` | ?? | Sources lens |
| `src/app/debates/[slug]/claims/`, `sources/`, `understanding/` | ?? | Debate lens routes |
| `src/app/discussions/[slug]/page.tsx`, `claims/`, `contributions/`, `evidence/`, `questions/` | M | SSR initial-data prefetch |
| `src/app/debates/[slug]/page.tsx`, `contributions/`, `questions/` | M | `initialCollections` SSR |
| `src/app/layout.tsx` | M | Title template (single suffix), WebSite/Organization JSON-LD, mark icons |
| `src/app/search/page.tsx` | M | `noindex` |
| `src/app/u/[username]/page.tsx`, `src/app/inquiries/[id]/page.tsx` | M | Title-suffix fix, metadata |
| `src/lib/seo/` (`structured-data.ts`, `public-room.ts`, +) | ?? | Schema builders + `isPubliclyVisibleRoom` gate |
| `src/lib/site-url.ts`, `src/lib/text.ts` | ?? | Canonical/OG helpers |
| `src/features/discussions/hooks/use-discussions.ts`, `src/features/discussions/services/discussion-service.ts`, components (`discussion-section.tsx`, `discussion-contributions-section.tsx`, `claims-lens-section.tsx`, etc.) | M | `initialData`/`initialPage` SSR seeding |

### UI / BRANDING
| File | Status | Role |
|---|---|---|
| `public/discora-mark.png` (209,007 bytes) | ?? (dir) | Canonical brand asset |
| `src/app/favicon.ico` | ?? | Derived multi-size ICO |
| `src/components/layout/sidebar.tsx`, `header.tsx`, `mobile-nav.tsx`, `app-shell.tsx` | M | Mark integration, collapsed-rail axis fix |
| `src/app/globals.css` | M | Global `prefers-reduced-motion` rule |
| `src/app/discussions/[slug]/claims/page.tsx` | M | Duplicate-shell removal (layout owns boundary) |
| `src/features/rooms/components/room-section-shell.tsx`, `src/components/share/*`, `src/features/saves/components/save-button.tsx` | M/untracked mix | Touch hit-areas |
| `src/features/preferences/services/preference-service.ts` | M | `onConflict: 'user_id'` upsert fix |
| `src/app/(legal)/`, `src/components/legal/`, `src/features/about/` | ?? | Legal routes/components, about brand hero |
| `src/components/ui/{badge,button,dialog,dropdown-menu}.tsx`, `src/components/providers/network-status-provider.tsx` | ?? | UI primitives/providers |

### FRIENDS / SHARE
| File | Status | Role |
|---|---|---|
| `src/features/friends/` | ?? | Friend RPC clients, controls, inbox |
| `src/app/friends/` | ?? | Friends routes |
| `src/components/share/` | ?? | Share controls |
| `src/features/debates/components/*` (side-picker, inquiry, position-history, private-access-gate, etc.) | M mix | Debate/friend-adjacent surfaces |

All files above are genuinely required: the database manifest (§D) is inert without them (attestation page, deletion dialog/Server Action, SEO routes, SSR plumbing, brand asset), and several tracked-modified files carry security fixes (middleware age/deletion gates, RLS-adjacent service logic).

---

## D. Required Migration Files

The exact 13-file set from `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md` §9.C. Each VERIFIED present in `supabase/migrations/` and **all UNTRACKED** (2026-09-18):

1. `202606040003_repair_moderation_queue_view_dependency.sql`
2. `202606100006_repair_moderation_queue_base_tables.sql`
3. `202609140004_phase_9d2a_friend_core_foundation.sql`
4. `202609140005_restore_moderation_queue_full_definition.sql`
5. `202609140006_phase_9d2a_friend_inbox_cap.sql`
6. `202609150001_phase_9d3_room_invitation_remediation.sql`
7. `202609160001_phase_9c4_account_deletion_foundation.sql`
8. `202609170001_pre_beta_security_remediation.sql`
9. `202609180001_reputation_snapshot_authenticated_select.sql`
10. `202609190001_pre_beta_18plus_inquiry_visibility.sql`
11. `202609200001_user_preferences_client_grants.sql`
12. `202609210001_fix_deleted_user_display_in_public_views.sql`
13. `202609220001_oauth_18plus_enforcement.sql`

Verification per file: filename exact-match ✅; exists ✅; git status UNTRACKED ✅; not archived ✅; in approved manifest ✅; not 140001/140002 ✅; not already-applied (all sort after verified production tip `202609140003`, except the two old-timestamp repairs which are evidenced local-only per the R preflight dry-run) ✅. No local modification relative to current content is assertable (untracked files have no baseline); content was read and verified against report descriptions during the ledger reconciliation.

---

## E. Historical / Archived Files

**Production-applied, must remain untouched (all UNTRACKED — integrity exception preserved):**
- `202609130001_admin_console_foundation.sql` (bytes NOT recovered — class C)
- `202609130002_phase_8d_data_hygiene_and_seeding.sql` (reconstructed — class B, byte identity unprovable)
- `202609130003_phase_8d_debate_side_alignment.sql` (no divergence alleged)
- `202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql` (verified production tip)

**Archived defects (must never enter any manifest):**
- `supabase/archive_9c4a_incident/202609140001_*.sql` (failed `22P02`, rolled back)
- `supabase/archive_9c4a_incident/202609140002_*.sql` (blocked in review)
- VERIFIED absent from `supabase/migrations/` ✅; archive directory preserved ✅.

---

## F. Files That Must NOT Be Released

1. `.env.local` (ignored; local credentials — VERIFIED `git check-ignore` match, exit 0).
2. `.next/`, `out/`, `coverage/`, `*.tsbuildinfo`, `.eslintcache` (ignored build artifacts).
3. `.next-dev.log`, `dev-server.*.log`, `npm-debug.log*` (local logs).
4. `supabase/archive_9c4a_incident/` (defect records — keep in history, never deploy).
5. `scripts/*.mjs` QA harnesses, `tests/` fixtures, `playwright.config.ts`, QA screenshots/JSONs under `docs/` (test evidence, not product).
6. `202609140001` / `202609140002` under any path.
7. Any file containing real secret values (none found tracked; `.env.local` values were never printed).

---

## G. Environment / Secret Hygiene

| Variable / File | Classification | Finding |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Local default in `.env.example`; never a secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | Browser-exposed by design; local demo key in example |
| `DISCORA_ALLOW_REMOTE_DEV` | LOCAL-ONLY | Default `false`; escape hatch documented |
| `GEMINI_API_KEY` | SERVER-ONLY / OPTIONAL | Empty placeholder in example |
| `DISCORA_OWNER_USER_ID` | SERVER-ONLY / PRODUCTION-REQUIRED | Empty placeholder in example |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | PUBLIC / SERVER-ONLY / OPTIONAL | Empty placeholders |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVER-ONLY / PRODUCTION-REQUIRED | Referenced only in server code (`account-deletion-actions.ts` via `process.env`); **zero matches in `src/**` for a hardcoded key**; never `NEXT_PUBLIC_`-prefixed (grep VERIFIED) |
| Google OAuth client/secret | SERVER-ONLY / PRODUCTION-REQUIRED | Referenced as `env(...)` in `supabase/config.toml` only; no values in repo |
| SMTP/Resend | SERVER-ONLY / PRODUCTION-REQUIRED | Supabase Dashboard configuration, not in repo |
| `.env` | — | Absent (only `.env.example` + `.env.local` exist) ✅ |
| `.env.local` | LOCAL-ONLY, ignored | Exists, gitignored ✅; values never printed |
| `.env.example` | Tracked, modified | Local-first rewrite (safe) ✅ |
| `.gitignore` | Tracked, modified | Adds `/backups/` only (safe) ✅ |
| `next.config.ts` | Tracked, modified | Dev-only remote-targeting guard intact (VERIFIED: `ALLOW_REMOTE_DEV` check + `.supabase.co` hostname gate, production builds exempt) ✅ |
| `supabase/config.toml` | Tracked, modified | Hook wiring (`before_user_created`), Google OAuth block present; secrets via `env()` ✅ |

**Confirmations:** no secrets tracked ✅; no service-role key public ✅; no production credentials committed ✅; `.env.local` ignored ✅; remote-dev safety guard intact ✅.

---

## H. Build Reproducibility

**A clean checkout of tracked files at HEAD would NOT reproduce the Beta build.** Missing from git: all 52 `src/` additions/modifications deltas above (§C), all 13 manifest migrations (§D), `public/discora-mark.png`, `package.json`/`package-lock.json` dependency additions (`@radix-ui/*` ×4, `motion`, `vitest`, `test` script), `next.config.ts` guard, `supabase/config.toml` hook/OAuth wiring, and `tsconfig.json` adjustments. The tracked tree builds the pre-9C.4A product.

Exact missing-file classes: application source (§C table), 30 untracked migrations (13 release + 17 history), package manifests (dirty, §I), config (`next.config.ts`, `supabase/config.toml`, `.env.example` deltas), public assets (`discora-mark.png`, `favicon.ico`), SEO routes, auth/deletion/age-gate code.

---

## I. Test Results

Executed locally 2026-09-18 (this task, read-only except `npm ci` install into ignored `node_modules/`):

| Check | Result |
|---|---|
| `npm ci` | ✅ 577 packages installed, 47s; lockfile diff remains purely additive (pre-existing radix/motion/vitest entries) — **no unexpected manifest modification** |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ exit 0 (all routes incl. `/robots.txt`, `/sitemap.xml`, `/auth/attest-age`) |
| `npm run test` (vitest) | ✅ 28/28 passed; 1 suite unimportable (`@playwright/test` absent — pre-existing environmental) |
| `npm run lint` | 1 error (pre-existing: triple-slash reference in generated `.next/types/routes.d.ts`) + 44 pre-existing warnings; **0 new source errors** |

---

## J. Unresolved Release Conditions

1. **Uncommitted tree:** 109 modified + 5 deleted + 329 untracked paths. Owner must decide the release baseline (commit/tag strategy). No commit is made by this report.
2. **Missing dynamic-verification reports:** `FINAL_PRE_BETA_PRODUCTION_READINESS_AUDIT.md`, `PRE_BETA_OAUTH_18PLUS_ENFORCEMENT_REPORT.md`, `PRE_BETA_ACCOUNT_DELETION_IMPLEMENTATION_REPORT.md`, `PRE_BETA_SEO_AI_IMPLEMENTATION_REPORT.md` were never written (all `Test-Path = False`); OAuth/deletion/SEO live verification rests on chat summaries + local static checks.
3. **Production infrastructure absent:** no production Supabase project, domain/DNS/TLS, SMTP, Google OAuth credentials, Sentry DSN, pg_cron scheduling, legal counsel sign-off.
4. **P1-SEO-01 architectural decision** (SSR room content vs JS-dependent indexing) recorded open in the SEO audit; local SSR plumbing exists untracked but the product decision confirmation is pending.
5. **130001/130002 byte-identity exceptions** stand (C/B) — accepted historical fact, not a release action.

---

## K. Exact Proposed Release Contents

1. **Application source:** HEAD tracked tree (448 files) **plus** all §C required files (52 untracked `src/` paths + 109 modified + 5 deletions as listed). Without these, the release is not Beta.
2. **Public assets:** `public/discora-mark.png` (+ derived `src/app/favicon.ico`); existing `public/` otherwise.
3. **Config files:** `next.config.ts` (with guard), `supabase/config.toml` (hook + OAuth blocks), `tsconfig.json`, `.env.example` (local-first), `sentry.*.config.ts` as modified.
4. **Package manifests:** `package.json` + `package-lock.json` as modified (radix-ui ×4, motion, vitest, test script) — synchronized, `npm ci` clean.
5. **Required migration files:** the exact 13-file set in §D, applied in order with `--include-all` (documented deviation).
6. **Required documentation:** governance (`DISCORA_AGENT_GOVERNANCE.md`), room spec (`DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md`), legal drafts (`docs/legal/`), master context/PRD/registry as tracked, `FINAL_MIGRATION_LEDGER_RECONCILIATION.md`, this report.
7. **Explicit exclusions:** §F list (env secrets, build artifacts, archive defects, QA harnesses/fixtures/screenshots, `140001`/`140002` anywhere, historical audit `.md` corpus except §6-required docs).

---

**PRODUCTION NOT CONTACTED. NOTHING COMMITTED. NOTHING PUSHED. NOTHING DEPLOYED. NO MIGRATION CREATED/MODIFIED/REPAIRED. REPORT ONLY.**
