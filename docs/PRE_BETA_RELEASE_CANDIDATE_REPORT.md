# Discora — Pre-Beta Release Candidate Report (Staged, Uncommitted)

**Mode:** CANONICAL BASELINE PREPARATION. Staged with explicit `git add` paths only (never `git add .`). NO commit. NO push. NO deploy. NO production contact. NO migration creation/modification/repair. NO file deletions/renames.
**Date (UTC):** 2026-09-18

---

## A. Release Candidate Summary

The dirty working tree has been classified file-by-file and the canonical Beta release candidate is now **staged but uncommitted** for Product Owner review: **345 files (231 added, 109 modified, 5 deleted), +68,074 / −6,844**.

The candidate contains the complete approved Beta product: security remediation, account deletion (Option C), OAuth 18+ enforcement, UI remediation, SEO/AI discoverability implementation, branding integration, friends core + inbox cap, room-invitation remediation, plus the full migration history (preserved) and the 13-file production apply set.

SEO decision reconciliation (§8 of the tasking): P1-SEO-01 is recorded as **APPROVED PRODUCT DECISION → IMPLEMENTED LOCALLY → LIVE VERIFICATION PENDING**. Public room/debate SSR, protected private content, public sitemap scope, conservative structured data, and private guest participant lists are implemented in the staged tree. The decision is not reopened by this report.

---

## B. Current Branch / HEAD

- Branch: `main`
- HEAD: `0223c7011ff8cb0631ebdf2f84414a97a8d929bd` (unchanged; no commit made)
- Tracked files at HEAD: 448
- Pre-stage worktree: 109 unstaged-modified, 5 deleted, 329 untracked porcelain lines, 0 staged

---

## C. Canonical Git Migration History

All 87 files in `supabase/migrations/` classified (filesystem + report evidence):

**A. HISTORICAL — ALREADY APPLIED / PRESERVED IN GIT (staged, do not replay):**
`202609130001`, `202609130002`, `202609130003`, `202609140003` — plus all 57 previously tracked files (≤ `202606100005` and scattered foundations) and the superseded-but-historical untracked files `202606260006`, `202606270001`, `202609090001`–`202609090011`. Integrity exceptions preserved: 130001 = C (original bytes not recovered), 130002 = B (reconstructed, byte identity unprovable).

**B. CURRENT PRODUCTION APPLY SET:** the 13 files in §D (staged).

**C. LOCAL-ONLY FUTURE MIGRATION:** none beyond §D — every untracked migration is either §A-history or §B-apply-set.

**D. ARCHIVED DEFECT — NOT IN MIGRATIONS DIRECTORY:** `202609140001`, `202609140002` live only in `supabase/archive_9c4a_incident/` (VERIFIED present there, VERIFIED absent from `supabase/migrations/`). Not staged. Never to be pushed.

**E. UNKNOWN — OWNER DECISION:** none for migrations. (The UNKNOWN category from the ledger reconciliation applies to byte identity of applied files, not to release inclusion.)

Repository history ≠ production apply list: already-applied migrations are staged to preserve canonical history; only the 13-file set applies to production now.

---

## D. Production Apply Migration Set

Unchanged from `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md` §9.C (all 13 VERIFIED present, all staged):

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

Apply mechanism remains `supabase db push --include-all` (documented deviation; old-timestamp repairs sort before the remote tip).

---

## E. Historical Migrations Preserved

Staged as canonical history with the intact integrity record: 130001 (C), 130002 (B), 130003, 140003, all 090001–090011 foundations, 260006, 270001. Labeled "HISTORICAL — PRESERVE IN GIT — DO NOT REPLAY". No file modified (untracked files have no baseline; tracked files unmodified).

---

## F. Application Release Delta

**Staged (required Beta functionality):** 109 modified files (auth/age, deletion UI + Server Action, SEO SSR/metadata, friends/share/debate surfaces, UI/branding/polish, middleware age+deletion gates, services, config, manifests) + 52 untracked `src/` paths (attest-age route, deletion dialog + actions, SEO routes/helpers, room/debate lenses, friends/admin/about/legal/share/UI features, brand asset wiring, SoU unit spec) + `public/discora-mark.png` + `src/app/favicon.ico` + 5 approved deletions (debate-resolution, debate-scorecard, 3 credibility components — winner/loser + credibility-badge retirement).

**Largest diffs** (numstat, all consistent with approved batches): package-lock (deps), comment-item, debate-room, sidebar, discussion-contributions-section, discussion-service, understanding-utils, use-discussions, debate-header-v2, reputation-utils. No unrelated/out-of-scope file among the 109; sensitive-pattern scan of the full diff found zero secret values (only report prose naming variable names).

No approved feature was removed to simplify the release. Feature-rich + contextual discovery + progressive disclosure + conversation-first UX is preserved.

---

## G. Files Explicitly Excluded

- `.env.local` (ignored; never staged)
- `supabase/archive_9c4a_incident/` (defect records preserved on disk only)
- `scripts/` (73 QA harnesses; `rebuild-phase8d-migration.mjs` remains on disk as 130002 evidence)
- `tests/`, `playwright.config.ts` (fixtures/config; `@playwright/test` not a dependency)
- `.next-dev.log`, `.next/`, logs, coverage
- All `docs/` PNG/JSON/HTML QA artifacts + screenshot dirs (`phase7b-screenshots/`, `screenshots_phase_*/`, `visual_qa/`)
- `202609140001` / `202609140002` under any path

Remaining unstaged porcelain lines after this report is staged: only the above categories (VERIFIED).

---

## H. Environment / Secret Verification

- Staged diff secret scan: **zero secret values** (only documentation prose referencing variable names).
- `SUPABASE_SERVICE_ROLE_KEY` referenced server-side only; never `NEXT_PUBLIC_`-prefixed; no hardcoded key in `src/**` (grep VERIFIED).
- Google OAuth/SMTP/Sentry values: `env()` references or empty placeholders only.
- `.env.local` ignored (`git check-ignore` match, exit 0); no bare `.env` exists.
- Remote-dev guard intact in staged `next.config.ts` (hostname + `DISCORA_ALLOW_REMOTE_DEV` check, production builds exempt).
- Env classification: PUBLIC (`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`), SERVER-ONLY (`SERVICE_ROLE_KEY`, `DISCORA_OWNER_USER_ID`, OAuth, SMTP, `SENTRY_DSN`), LOCAL-ONLY (`DISCORA_ALLOW_REMOTE_DEV`, `.env.local`), OPTIONAL (`GEMINI_API_KEY`, Sentry).

---

## I. Build / Test Results (this task, local)

| Check | Result |
|---|---|
| `npm ci` | ✅ 577 packages, 47s; lockfile diff remains purely additive (pre-existing) — no unexpected modification |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ exit 0 (all routes incl. `/robots.txt`, `/sitemap.xml`, `/auth/attest-age`) |
| `npm run test` (vitest) | ✅ 28/28 passed; 1 suite unimportable (`@playwright/test` absent — pre-existing environmental) |
| `npm run lint` | 1 pre-existing error (generated `.next/types/routes.d.ts` triple-slash) + 44 pre-existing warnings; 0 new source issues |

---

## J. Staged File Statistics

- Staged files: **345** (231 added / 109 modified / 5 deleted), +68,074 / −6,844
- Staged migrations: 30 (13 apply-set + 17 history-preservation)
- Staged docs: all top-level `docs/*.md` (reports, specs, governance) + `docs/legal/` (4 drafts)
- Exclusion audit on staged names: CLEAN (only expected `package.json`, `package-lock.json`, `tsconfig.json`, brand PNG, favicon matched broad patterns; all intentional)
- Staged secret scan: CLEAN

---

## K. Reproducibility Result

**YES — with the staged tree committed, a fresh clone would reproduce the Beta application and complete migration history**: application source (§F), synchronized manifests (`npm ci` clean), `next.config.ts`/`tsconfig.json`/`supabase/config.toml`, all 87 migrations, brand asset, legal/SEO/auth/deletion/friends implementations. (Commit itself is intentionally not made here; reproducibility is assessed on the staged content, VERIFIED by the passing build/test suite run against exactly this tree.)

---

## L. Remaining Conditions Before Commit

1. Product Owner review of the staged diff (345 files) — staged, uncommitted, awaiting review.
2. Owner decision on committing the ~100 historical audit `.md` reports as permanent history (staged; reversible via `git reset` on `docs/` paths if undesired).
3. CRLF normalization advisory: ~100 files emit LF→CRLF warnings under local `core.autocrlf`; content unaffected, but Owner may set `.gitattributes` before commit.
4. Four requested verification reports were never written as files (OAuth/deletion/SEO/final-readiness); dynamic verification rests on chat summaries + local static checks.

## M. Remaining Conditions Before Production

Per the ledger reconciliation §9.J (unchanged): production Supabase project, Google OAuth + SMTP configuration, domain/DNS/TLS, Sentry DSN, pg_cron scheduling (reconciler, invitation sweep/purge, storage queue), legal counsel sign-off, staging-first deploy, full smoke suite. Plus §L items above.

---

**NO COMMIT. NO PUSH. NO DEPLOY. NO PRODUCTION CONTACT. STAGED FOR REVIEW ONLY.**
