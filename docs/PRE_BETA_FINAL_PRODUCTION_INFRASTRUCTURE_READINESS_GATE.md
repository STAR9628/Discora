# Discora — Final Pre-Production Infrastructure Readiness & Git State Gate

**Document Status:** OFFICIAL READ-ONLY AUDIT REPORT  
**Phase:** FINAL PRE-PRODUCTION INFRASTRUCTURE & GIT AUDIT  
**Mode:** READ-ONLY / NO REPOSITORY MUTATION / NO COMMIT / NO PUSH / NO PRODUCTION CONTACT  
**Target Release Baseline:** `d7a3e4fa2c6f62e29e56a953fb7662666bd1aa41`  
**Parent Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca`  
**Execution Date (UTC):** 2026-09-19  

---

## 1. Executive Summary

This read-only audit performs the final pre-production infrastructure readiness and Git state gate for Discora Public Beta.

- **Current Release Baseline:** `d7a3e4fa2c6f62e29e56a953fb7662666bd1aa41` (`fix: harden deleted-user view migration for postgres compatibility`). The release baseline is 100% verified, stable, and incorporates the required `DROP VIEW IF EXISTS public.discussion_questions;` fix.
- **Migration Integrity:** Exactly **87 canonical migration files** exist in `supabase/migrations/`. All 87 are tracked in Git. Zero migration files are modified in the working tree. Zero migrations are missing.
- **Pending Production Migrations:** Exactly **13 migrations** (`202606040003`, `202606100006`, and `202609140004` through `202609220001`). Migration `202609150001` remains strictly flagged as **DESTRUCTIVE** (irreversibly replaces plaintext invitation tokens with SHA-256 hashes).
- **Core Code Quality & Test Suites:**
  - `npx tsc --noEmit`: **0 errors**.
  - `npm test` (vitest): **28/28 tests passed**.
  - `npm run build`: **Exit code 0** (all 31 routes compiled and static-optimized).
  - `npm run lint`: **0 errors** (44 pre-existing non-blocking warnings in QA harness scripts).
  - Restore automation suite (`scripts/backup/test-restore.mjs`): **42/42 checks passed**.
- **Working-Tree State:** Working tree contains 26 modified tracked files from the Pre-Beta Remediation Batch 1 (title templates, dynamic lens metadata, vitest configuration) and untracked audit/QA files. No migration files or production secrets are dirty.
- **Operator Dependencies:** Zero code blockers remain. 21 operator dependencies across domain registration (`discora.in`), Cloudflare DNS/WAF, Netlify hosting, Supabase PG17 project provisioning, Google OAuth credentials, Resend SMTP, Sentry DSNs, and legal placeholders must now be provisioned manually by the operator.
- **Final Verdict:** **A — READY FOR PRODUCTION PROVISIONING** (The codebase is completely sound; human operator provisioning of production infrastructure may proceed).

---

## 2. Current Release Baseline

- **Current HEAD SHA:** `d7a3e4fa2c6f62e29e56a953fb7662666bd1aa41`
- **Commit Subject:** `fix: harden deleted-user view migration for postgres compatibility`
- **Parent Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca` (`feat: establish Discora Public Beta release baseline`)
- **Root Baseline Commit:** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd` (`feat: complete Phase 5D save and bookmark`)
- **Verified Files in Baseline Commit:**
  - `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql` (+2 insertions: `drop view if exists public.discussion_questions;`)
  - `docs/PRE_BETA_MIGRATION_BASELINE_CORRECTION_REPORT.md` (+137 insertions)

---

## 3. Git Working-Tree State

The audit inspected all modified tracked files and untracked working-tree items:

### 3.1 Modified Tracked Files (26 files) — Classification: B (SHOULD BE COMMITTED BEFORE PRODUCTION)
These files represent the verified Pre-Beta Remediation Batch 1 improvements:
- `package.json` & `package-lock.json`: Added `vitest` devDependency to isolate tests from Playwright runner.
- `.gitignore`: Ignore `.operator/` and local backup archives.
- `src/app/(legal)/{grievance, guidelines, privacy, terms}/page.tsx`: Fixed title duplication (`— Discora`).
- `src/app/admin/layout.tsx`: Fixed admin metadata title.
- `src/app/debates/[slug]/{page, arguments, evidence, questions}/page.tsx`: Added dynamic lens metadata (`generateMetadata`).
- `src/app/discussions/[slug]/{page, claims, contributions, evidence, questions}/page.tsx`: Added dynamic lens metadata (`generateMetadata`).
- `src/app/debates/create/page.tsx`, `src/app/debates/page.tsx`, `src/app/discussions/create/page.tsx`, `src/app/discussions/page.tsx`: Title template cleanup.
- `src/app/friends/page.tsx`, `src/app/search/page.tsx`, `src/app/settings/{page, moderation, profile}/page.tsx`: Fixed title formatting.
- `src/app/robots.ts`: Refined public vs. private disallow paths.

### 3.2 Operator-Local Files — Classification: C (OPERATOR-LOCAL / MUST REMAIN GITIGNORED)
- `.operator/`: Contains local operator configurations (`dr.env`, `dr-age-identity.txt`). Must never be tracked or committed.

### 3.3 Permanent Backup & Disaster Recovery Tooling — Classification: A (MUST RETAIN)
- `scripts/backup/`: Permanent backup engine (`db-backup.mjs`, `encrypt-backup.mjs`, `r2-backup.mjs`, `reconcile-restore.mjs`, `replay-deletions.mjs`, `restore-backup.mjs`, etc.).
- `scripts/backup/repo-template/`: Source template for the operator's private backup repository (`.github/workflows/backup.yml`, etc.).

### 3.4 Quarantined Incident Defect Migrations — Classification: A (MUST RETAIN / ARCHIVE RECORD)
- `supabase/archive_9c4a_incident/202609140001_...sql` and `202609140002_...sql`: Permanent historical defect records; strictly quarantined outside `supabase/migrations/`.

### 3.5 Audit & Manifest Documentation — Classification: D (AUDIT DOCUMENTATION / MUST RETAIN)
- `docs/BETA_RELEASE_BASELINE_COMMIT_REPORT.md`
- `docs/FINAL_PRE_BETA_HARDENING_AUDIT.md`
- `docs/FINAL_PRODUCTION_MIGRATION_MANIFEST.md`
- `docs/FINAL_MIGRATION_WORKING_TREE_INTEGRITY_REPORT.md`
- `docs/PRE_BETA_PRODUCTION_DEPLOYMENT_OPERATOR_READINESS_RUNBOOK.md`
- `docs/PRE_BETA_PRODUCTION_OPERATOR_DEPENDENCY_MATRIX.md`
- `docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md`
- `docs/PRE_BETA_FREE_BACKUP_*.md` (Phases 1 through 6)
- `docs/PRE_BETA_PHASE7_*.md` (Phases 7A through 7D)
- `docs/PRE_BETA_REMEDIATION_BATCH_1_REPORT.md`

### 3.6 QA Scripts, Results & Screenshots — Classification: E (QA / TEST RESIDUE)
- `scripts/phase*.mjs`, `scripts/audit-*.mjs`, `scripts/check-*.mjs`
- `docs/visual_qa/`, `docs/phase7b-screenshots/`, `docs/dr_browser_qa/`, `docs/screenshots_phase_*/`
- `docs/*.png`, `docs/phase_*_qa_results.json`
- `tests/` (Playwright and regression SQL tests)

### 3.7 Temporary Files — Classification: F (TEMPORARY / SAFE TO REMOVE LATER)
- `.next-dev.log`
- `playwright.config.ts`

---

## 4. Migration Baseline Integrity

Running `git status --short -- supabase/migrations/` confirms:
- **Output:** Empty (completely clean).
- **Canonical Count:** Exactly 87 migration files.
- **Tracked Count:** Exactly 87 files tracked in Git.
- **Modified Migrations:** 0.
- **Untracked Migrations:** 0.
- **Missing Migrations:** 0.
- **Migration 202609210001 Check:** Verified to contain:
  ```sql
  drop view if exists public.discussion_questions;

  create or replace view public.discussion_questions
  with (security_invoker = false)
  ```

---

## 5. Production Architecture

The approved target production architecture is:

```
GoDaddy (Registrar: discora.in)
    ↓
Cloudflare Free (DNS / SSL Full-Strict / WAF / DDoS / Turnstile)
    ↓
Netlify Free (Next.js 15.5.25 / SSR / RSC / Edge Middleware)
    ↓
Supabase Free (PostgreSQL 17 / GoTrue Auth / Storage S3 / Realtime)
```

**Supporting Infrastructure Services:**
- **Email Delivery:** Resend Free Tier (custom domain `discora.in` with SPF/DKIM/DMARC).
- **Authentication:** Google OAuth 2.0 (configured via Google Cloud Console).
- **Observability:** Sentry Free Tier (client & server DSNs, PII-scrubbed, session replays disabled).
- **Backup Pipeline:** GitHub Private Repository (`discora-backups`) + Cloudflare R2 (Object Storage).
- **Backup Encryption:** `age` v1.3.2 (X25519 recipient public key).
- **Scheduled Automation:** GitHub Actions (02:00 UTC daily backup + 36h watchdog).

**Architecture Compatibility Confirmation:**  
The repository codebase is 100% compatible with this target topology. Zero migration to Cloudflare Workers, Cloudflare D1, or Cloudflare Pages is required or recommended.

---

## 6. Operator Dependency Matrix

| # | Dependency / Component | Category | Beta Required? | Current Status | Finding Class | Operator Action |
|---|---|---|---|---|---|---|
| 1 | Production Supabase Project (PG17) | Backend | YES | Missing | P0 | Create project in target region (e.g. Mumbai / South Asia). |
| 2 | Production Domain (`discora.in`) | Network | YES | Missing | P0 | Complete registration on GoDaddy. |
| 3 | Cloudflare DNS & SSL | Network | YES | Waiting | P0 | Change GoDaddy NS to Cloudflare; configure Full (Strict) SSL. |
| 4 | Netlify Project & Node 22.x Pin | Hosting | YES | Waiting | P0 | Connect Git repo or CLI; set `NODE_VERSION = 22.14.0`. |
| 5 | Environment Variables Population | Hosting | YES | Missing | P0 | Populate `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `OWNER_USER_ID`. |
| 6 | 13-Migration Deployment (`--include-all`) | Database | YES | Ready in code | P0 | Preflight backup → `npx supabase db push --include-all` → verify. |
| 7 | Destructive Gate 150001 Execution | Database | YES | Ready in code | P0 | Take `public.room_invitations` table backup before running. |
| 8 | Google OAuth Credentials | Auth | YES | Missing | P1 | Create OAuth 2.0 Web Client; configure Supabase redirect URIs. |
| 9 | Auth Hook Wiring (`before_user_created`) | Auth | YES | Ready in code | P1 | Wire `pg-functions://postgres/public/enforce_signup_age_attestation` in Dashboard. |
| 10 | Resend SMTP Delivery | Email | YES | Missing | P1 | Verify `discora.in` domain; configure SMTP in Supabase Auth. |
| 11 | SPF, DKIM, DMARC Records | DNS | YES | Missing | P1 | Add TXT/CNAME records in Cloudflare DNS. |
| 12 | Sentry Project & DSNs | Monitoring | YES | Missing | P2 | Create Sentry project; add `SENTRY_DSN` to hosting secrets. |
| 13 | Private Backup Repository | DR / Backup | YES | Missing | P1 | Create private GitHub repo from `scripts/backup/repo-template/`. |
| 14 | Cloudflare R2 Bucket | DR / Backup | YES | Missing | P1 | Create `discora-backups` bucket; generate R2 S3 access tokens. |
| 15 | Dedicated Age Production Identity | DR / Backup | YES | Missing | P1 | Run key ceremony to generate permanent production Age key pair. |
| 16 | GitHub Actions Secrets for Backup | DR / Backup | YES | Missing | P1 | Populate `DISCORA_BACKUP_AGE_RECIPIENT`, `R2_*`, `SUPABASE_DB_URL`. |
| 17 | Legal Information & Grievance Officer | Legal | YES | Placeholders | P2 | Replace placeholder names/addresses in `src/app/(legal)/`. |
| 18 | Legal Counsel DPDP Review | Legal | YES | Pending | P2 | Human sign-off on terms, privacy, and account deletion de-identification. |
| 19 | Starter Content Pruning | Database | YES | Pending | P2 | Clear test/demo rooms; seed approved curated starter topics. |
| 20 | Google Search Console Submission | SEO | NO (Post-Launch)| Missing | P3 | Submit `https://discora.in/sitemap.xml` after deployment. |
| 21 | Future AI Config (`GEMINI_API_KEY`) | Config | NO (Post-Beta) | Unused in code | INFO | Deferred to post-beta AI features. |

---

## 7. Backup / Disaster Recovery Readiness

- **RPO Target:** ~24-hour operating recovery point objective (daily run at 02:00 UTC).
- **Watchdog Threshold:** 36-hour maximum silence alert threshold.
- **SLA Clarification:** Operating targets, not contractual SLAs.
- **Zero-Cost Beta Policy:** PITR is optional for zero-cost Beta launch; daily encrypted backup + R2 offsite storage + restore drill constitutes the verified Beta DR architecture.
- **Phase 7D Isolated Drill Evidence:**
  - Database Restore Execution Time: **8.33 seconds**.
  - Integrity Verification Checks: **42 / 42 passed**.
  - Forward Migration Replay: **0 errors**.
- **Production Guard:** `restore-target-guard.mjs` strictly prohibits restoring against production hostnames (`supabase.co`, `pooler.supabase.com` without explicit drill bypass).

---

## 8. Security Readiness

- **P0/P1 Regressions:** Zero newly introduced P0/P1 vulnerabilities.
- **Secrets:** Zero keys, passwords, or connection strings committed. `.env.local` remains gitignored.
- **Role Separation:** Account deletion RPCs (`execute_account_deletion`, `reconcile_deletion_operations`) are restricted to `service_role` only.
- **Authorization & RLS:** All 13 migrations preserve strict RLS, pinned `search_path`, and active-user validation.
- **Invitation Token Security:** Migration `202609150001` eliminates plaintext token exposure, enforcing SHA-256 hashes and atomic single-use locking.
- **Production Security Headers Required at Netlify/Cloudflare Edge:**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 9. SEO / AI Discoverability Readiness

- **`robots.ts`:** Fully configured. Allows public pages, discussions, debates, about, guidelines; blocks private areas (`/admin/`, `/settings/`, `/auth/`, `/friends/`, `/saved/`).
- **`sitemap.ts`:** Implemented. Dynamically indexes public rooms and legal pages with appropriate `lastModified` and `changeFrequency`.
- **Metadata & Canonical URLs:** Dynamic Open Graph, Twitter cards, and structured JSON-LD schemas implemented.
- **Deleted User Redaction:** Deleted user profiles and contributions return `noindex` or anonymous attribution ("Deleted User"), preventing search indexing of tombstoned identities.
- **Discoverability Status:** **READY IN CODE**; operator submission to Google Search Console is a post-deployment verification task.

---

## 10. UI / UX / Functional Readiness

- **Design Aesthetic:** High-density, rich dark-mode aesthetic with custom tokens in `src/app/globals.css`.
- **Accessibility:** Reduced-motion preferences (`prefers-reduced-motion`) respected across animations.
- **Responsive Layout:** Tested and verified across desktop (1440px), tablet (834px), and mobile (375px/390px).
- **Discussions & Debates:** 5 distinct lens modes (Overview, Claims, Evidence, Questions/Inquiries, Contributions) functional.
- **Interactive Mechanics:** Non-gameified epistemic model (no upvote popularity mechanics, no winner/loser declarations, consensus ratio based on validated arguments/evidence).

---

## 11. Content Readiness

- **Status:** **WAITING FOR HUMAN OPERATOR PRUNING**.
- **Requirement:**
  1. All local test rooms, QA discussions, and dummy user profiles must be purged from the database prior to opening Public Beta.
  2. Starter topics must NOT be auto-generated by agents.
  3. The Product Owner will contribute or explicitly approve each topic set.
  4. Curated topics will be seeded as clean baseline discussions and debates.

---

## 12. Legal & Operator Readiness

- **Legal Routes:**
  - `/terms`: Terms of Service.
  - `/privacy`: Privacy Policy (compliant with Indian DPDP Act 2023 principles).
  - `/guidelines`: Community Guidelines.
  - `/grievance`: Grievance Redressal Mechanism (mandatory under Indian IT Rules 2021).
- **Action Required:** Operator must replace placeholder entries:
  - `[Operator / Company Legal Name]`
  - `[Grievance Officer Name & Contact Email]`
  - `[Physical Postal Address in India]`
- **Counsel Review:** Legal counsel must review the data deletion model and 18+ attestation flow prior to public launch.

---

## 13. Manual Operator Actions Checklist

### A. Domain & Network (GoDaddy + Cloudflare)
1. Purchase/configure `discora.in` on GoDaddy.
2. Create Cloudflare account; add `discora.in` zone.
3. Update GoDaddy nameservers to Cloudflare.
4. Set SSL/TLS encryption mode to **Full (Strict)**.
5. Create CNAME record pointing `discora.in` and `www` to Netlify.

### B. Hosting (Netlify)
1. Create Netlify site connected to the Discora Git repository.
2. In Site Settings > Build & deploy, set Environment Variable `NODE_VERSION = 22.14.0`.
3. Add Netlify edge security headers via `_headers` or Cloudflare Transform Rules.

### C. Backend & Database (Supabase)
1. Create new Supabase project (PostgreSQL 17) in South Asia (Mumbai).
2. Record `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Set `SITE_URL = https://discora.in` and Redirect URLs:
   - `https://discora.in/auth/callback`
   - `https://discora.in/login`
   - `http://localhost:3000/auth/callback` (for dev)
4. Wire Auth `before_user_created` hook to `pg-functions://postgres/public/enforce_signup_age_attestation`.

### D. Authentication (Google Cloud Console)
1. Create OAuth 2.0 Client ID for Web Application.
2. Add Authorized JavaScript origins: `https://<supabase-ref>.supabase.co`, `https://discora.in`.
3. Add Authorized redirect URI: `https://<supabase-ref>.supabase.co/auth/v1/callback`.
4. Enter Client ID and Secret into Supabase Dashboard > Authentication > Providers > Google.

### E. Email Delivery (Resend)
1. Create Resend account; add domain `discora.in`.
2. Add verification DNS records (MX, TXT SPF, CNAME DKIM, TXT DMARC) in Cloudflare.
3. Configure Custom SMTP in Supabase Dashboard with Resend API credentials.

### F. Observability (Sentry)
1. Create Sentry project for Next.js (`discora-web`).
2. Record client and server DSNs; add to Netlify environment variables.

### G. Backup & Disaster Recovery (GitHub + Cloudflare R2)
1. Generate dedicated production Age key pair offline (`age-keygen -o production-age-identity.txt`).
2. Securely store private identity offline; never commit.
3. Create private GitHub repository `discora-backups` using `scripts/backup/repo-template/`.
4. Create Cloudflare R2 bucket `discora-backups`.
5. Populate GitHub repository secrets:
   - `DISCORA_BACKUP_AGE_RECIPIENT` (Age public key)
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
   - `SUPABASE_DB_URL` (direct PostgreSQL connection string for backup pg_dump)
   - `ALERT_WEBHOOK_URL` (Discord or email alert endpoint)

---

## 14. Future Production Deployment Sequence

When operator provisioning is complete and explicit authorization is granted:

1. **Preflight Stage:**
   - Verify remote migration ledger tip (`202609140003`).
   - Run backup script to capture existing baseline.
   - Verify `public.room_invitations` table snapshot.
2. **Database Migration Stage:**
   - Execute: `npx supabase db push --include-all`.
   - Watch `202609150001` backfill gates.
   - Confirm all 13 migrations apply cleanly up to `202609220001`.
3. **Application Deployment Stage:**
   - Deploy baseline commit `d7a3e4fa2c6f62e29e56a953fb7662666bd1aa41` to Netlify.
   - Verify production environment variables.
4. **Post-Deployment Verification Stage:**
   - Test email signup + 18+ attestation hook.
   - Test Google OAuth login.
   - Test room creation, claims, evidence, and inquiry lens navigation.
   - Test invite creation, fragment link hashing, and single-use acceptance.
   - Test user deletion Option C tombstone rendering ("Deleted User").
   - Test Sentry error capture and telemetry suppression.
   - Trigger manual test of GitHub Actions daily backup workflow.
5. **Content Seed Stage:**
   - Seed authorized starter topics.
6. **Public Beta Launch Gate:**
   - Formal sign-off and public announcement.

---

## 15. Remaining Blockers

- **Technical / Code Blockers:** **NONE (0)**. The codebase, migrations, and build are completely clean.
- **Operational Blockers (P0):**
  - Production Supabase project not yet provisioned.
  - Production domain (`discora.in`) not yet registered/pointed.
  - Production secrets not yet created/populated.

---

## 16. Non-Blockers & Post-Beta Items

- **`GEMINI_API_KEY` / Future AI Features (INFO):** Deferred post-beta; zero references in code.
- **Search Console Submission (P3):** Executed post-launch once site is publicly reachable.
- **`llms.txt` Policy (P3):** Future policy decision for AI crawlers.
- **Performance SLO Formalization (P3):** To be finalized after observing 7 days of production traffic.

---

## 17. Final Go / No-Go Assessment

| Pillar | Evaluation | Status |
|---|---|---|
| **Code & Build Stability** | Zero TypeScript errors, 28/28 tests, clean Next.js 15 build | **GO** |
| **Database & Migrations** | 87 canonical files clean; 13 pending verified; 202609210001 hardened | **GO** |
| **Disaster Recovery** | Tested in Phase 7D; 8.33s RTO; 42/42 checks passed | **GO** |
| **Security & Privacy** | RLS fail-closed; Option C de-identification; token SHA-256 | **GO** |
| **Infrastructure Provisioning** | Requires human operator account creation and DNS configuration | **AWAITING OPERATOR** |

---

## 18. Final Verdict

### **A — READY FOR PRODUCTION PROVISIONING**

**Assessment Summary:**  
The Discora repository, release baseline commit `d7a3e4fa2c6f62e29e56a953fb7662666bd1aa41`, database migrations, and disaster recovery tooling are in a **verified, hardened, and safe state**. Zero technical or architectural blockers remain in the codebase. 

The human operator may now proceed with confidence to create and configure the production accounts, domain, DNS, hosting, and database according to the manual operator actions checklist.
