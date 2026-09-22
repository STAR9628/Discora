# Discora — Public Beta Production Deployment & Operator Readiness Runbook

**Mode:** READ-ONLY AUDIT. No code/migration/config changes. No commits/pushes/deploys. No production contact of any kind.
**Date (UTC):** 2026-09-18
**Baseline:** `dbaf36a` (`feat: establish Discora Public Beta release baseline`) — VERIFIED HEAD, 346 files.
**Status vocabulary used throughout:** READY NOW · OPERATOR DEPENDENCY · HUMAN DECISION REQUIRED · PRE-DEPLOYMENT BLOCKER · POST-DEPLOYMENT VERIFICATION · POST-BETA / NOT REQUIRED FOR BETA.

---

## 1. Executive Summary

The Beta codebase is **READY NOW** (build green, 28/28 unit tests, secrets clean, migration manifest reconciled). **Nothing else in this runbook is code work.** Every remaining item is an operator dependency, a human decision, or a post-deployment verification. Public Beta cannot launch until: production Supabase project + 13 migrations applied + Google OAuth + SMTP + domain/DNS/TLS + Sentry DSN + pg_cron scheduling + legal counsel sign-off + full smoke suite green.

**Overall verdict: B — READY WITH CONDITIONS (all conditions are operational, none are code).**

Philosophy preserved: no votes-as-truth, no popularity authority, no AI judge, deterministic SoU, debate not a game. No product decision is reopened by this runbook except where a genuine deployment contradiction is noted (§25).

---

## 2. Current Release Baseline

- HEAD: `dbaf36a384a5e543277c4bbb19e28592145960ca` (VERIFIED via `git rev-parse HEAD`).
- Commit content: 346 files (+68,224/−6,844): 232 added / 109 modified / 5 deleted (approved cleanup).
- All 13 production-apply migrations present in baseline (VERIFIED via `git ls-tree`).
- Key Beta surfaces present in baseline (VERIFIED): `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/opengraph-image.tsx`, `src/app/auth/attest-age/page.tsx`, `src/features/settings/services/account-deletion-actions.ts`, `public/discora-mark.png`, `src/lib/seo/structured-data.ts`, age/deletion-gated `src/services/supabase/middleware.ts`.
- Worktree post-commit contains only excluded items (QA harnesses, screenshots, archive defects, fixtures, logs).
- Reports relied upon (all VERIFIED present): governance, master context, PRD, feature registry, user flows, DB design, system architecture, design system, API design, roadmap, knowledge model, room UX spec, ledger reconciliation, release candidate/manifest, R2 reconciliation, 9C4A apply, 9D3 remediation, focused closure, reputation remediation, 18+ consensus, UI batch 1, branding, SEO audit, premium polish audit. Requested-but-absent reports (OAuth/deletion/SEO-implementation/final-readiness) do not exist as files — dynamic verification for those batches rests on prior session evidence, noted wherever relevant below.

## 3. Production Architecture Assumptions

- **App:** Next.js 15.5.25, React 19, Node 22 types; scripts `dev`/`build`/`start`/`lint`/`test`. **No `engines` field** in `package.json` — operator must pin Node (22.x recommended to match `@types/node ^22`) in the hosting environment (HUMAN DECISION REQUIRED on exact version).
- **No deployment configuration in repo** (VERIFIED: no `vercel.json`, `netlify.toml`, `Dockerfile`, `fly.toml`, `render.yaml`, `.github/`). Hosting provider choice is HUMAN DECISION REQUIRED. Any of Vercel/Netlify/self-hosted Node satisfies `build` → `start`; no code change needed for any of them.
- **Database:** PostgreSQL 17 (per `supabase/config.toml` `major_version = 17`). Production Supabase project must run PG17.
- **Auth:** Supabase GoTrue; email + Google OAuth; `before_user_created` hook wired locally via config (`pg-functions://postgres/public/enforce_signup_age_attestation`) — hook wiring is a **production Auth configuration step**, not automatic.
- **Storage:** Supabase Storage, `avatars` bucket (public), S3 protocol enabled locally.
- **Realtime:** enabled; used only for ephemeral typing broadcasts.
- **No in-repo scheduler:** zero `pg_cron`/`cron.schedule` references in `src/**` or migrations — all recurring jobs are operator-scheduled (§14).

## 4. External Operator Dependencies

1. Production Supabase project (PG17) + PITR backups enabled.
2. Production domain + DNS + TLS (no domain exists: `discora.com`/`www` resolve to parking — VERIFIED in grant-reconciliation report).
3. Google OAuth production client (ID + secret).
4. SMTP delivery (Resend recommended by `.env.example` comments) + sender domain + SPF/DKIM/DMARC.
5. Sentry project (DSN pair) — code is instrumented and privacy-safe; project does not exist.
6. pg_cron or external scheduler (4 jobs, §14).
7. Legal counsel review (DPDP/IT Rules/CERT-In items per deletion spec).
8. Operator identity, grievance officer details, contact email/address (placeholders in legal routes, §18).

## 5. Environment Variable Matrix

| Variable | Client/Server | Required? | Purpose | Where configured | Secret? | Beta status |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | CLIENT (public) | YES | Supabase API endpoint | Hosting env | No | OPERATOR DEPENDENCY (prod URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CLIENT (public) | YES | Browser anon key | Hosting env | No (public by design) | OPERATOR DEPENDENCY |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVER only | YES | Deletion RPC, reconciler, admin APIs | Hosting secrets only — VERIFIED never `NEXT_PUBLIC_`-prefixed, no hardcoded value in `src/**` | **YES** | OPERATOR DEPENDENCY |
| `DISCORA_OWNER_USER_ID` | SERVER only | YES | Owner guard, deletion self-block | Hosting secrets | No (UUID, but treat as sensitive) | OPERATOR DEPENDENCY |
| Google OAuth client ID/secret | SERVER (Supabase Dashboard) | YES | Google sign-in | Supabase Auth providers | **YES** | OPERATOR DEPENDENCY |
| SMTP/Resend credentials | SERVER (Supabase Dashboard) | YES | Auth emails, OTP, resets | Supabase Auth SMTP | **YES** | OPERATOR DEPENDENCY |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | SERVER / CLIENT | Recommended | Error observability (PII-scrubbed, replays off — VERIFIED) | Hosting env | DSN is not a secret but restrict anyway | OPERATOR DEPENDENCY |
| `GEMINI_API_KEY` | SERVER | NO (Beta) | Future AI features (AI SoU deferred); zero references in `src/**` (VERIFIED) | — | YES if ever set | POST-BETA |
| `OPENAI_API_KEY`, `SENDGRID_API_KEY`, Twilio/Apple secrets | — | NO | Referenced only as `env()` examples in `config.toml` | — | n/a | NOT REQUIRED |
| `DISCORA_ALLOW_REMOTE_DEV` | LOCAL-ONLY | NO (must be unset/false in prod) | Escape hatch for the dev guard | Never in production | No | READY NOW (guard VERIFIED in `next.config.ts`) |
| `NODE_ENV`, `NEXT_RUNTIME` | Runtime | Automatic | Build/runtime mode detection | Platform | No | READY NOW |

`.env.local` is gitignored (VERIFIED) and must never be committed or transferred to production. `.env.example` is local-first safe (placeholders only — VERIFIED, no values printed here).

## 6. Migration Deployment Runbook

**Verified production tip:** `202609140003` (report-evidenced; no live contact in this task).
**Apply set (exact, in order):** the 13 files of §D in the ledger reconciliation. Plain `supabase db push` will refuse (old-timestamp repairs sort before tip); use `supabase db push --include-all` (documented deviation).

### PRE-FLIGHT (read-only)
1. `supabase migration list` against production — expect Remote tip `202609140003`; Local-only exactly the 13 (plus no other pendings).
2. Confirm `supabase/migrations/` contains no `140001`/`140002` (VERIFIED absent locally; re-verify at deploy time).
3. Confirm `supabase/archive_9c4a_incident/` is NOT inside `supabase/migrations/`.
4. Confirm no worktree edits to any migration file since `dbaf36a` (`git status --porcelain -- supabase/migrations/` empty except intended).

### BACKUP / PITR CHECK (PRE-DEPLOYMENT BLOCKER if absent)
5. Full backup snapshot + PITR enabled and restore-tested.
6. Table dump of `public.room_invitations` (150001 destructive step).
7. Record row counts: `room_invitations`, `friend_requests`, `profiles`, `admin_audit_logs`.

### DRY RUN
8. `supabase db push --include-all --dry-run` — expected order: `202606040003 → 202606100006 → 202609140004 → 202609140005 → 202609140006 → 202609150001 → 202609160001 → 202609170001 → 202609180001 → 202609190001 → 202609200001 → 202609210001 → 202609220001`. **Abort on any deviation.**

### APPLY (in the above order; `040003` + `140005` as a pair — do not separate)
9. Apply; watch specifically for 150001 backfill gates (abort = investigate data, never force).
10. 160001 is DDL-only at apply (RPC DELETEs run only on user deletion).

### POST-MIGRATION VERIFICATION (PRE-DEPLOYMENT BLOCKER until green)
11. Ledger shows all 13 under Remote.
12. §H-equivalent checks from the ledger report: `is_deleted`/`age_confirmed` columns, `is_active_user()` + `is_privileged_user()` present with pinned `search_path`, `retired_handles` RLS with zero policies, deletion RPCs service_role-only, friend tables + 12 RPCs + inbox cap, `token_hash` NOT NULL UNIQUE with no `invitation_token` column, 5 views rendering `'Deleted User'` on `p.is_deleted`, `admin_audit_logs` FK = RESTRICT, anon inquiry policies room-gated.

## 7. Destructive Migration 150001 Gate

**BEFORE:** `room_invitations.invitation_token` held SHA-presentable plaintext bearer tokens. Security-sensitive because possession equaled room access. **Required backup:** full table dump (§6.6).
**DURING:** backfill `token_hash = sha256hex(token)` + `expires_at = created_at + 7d` with in-migration abort gates (missing hash / missing expiry / duplicate hash → full abort, nothing half-applied); then `DROP COLUMN invitation_token`; status gains `expired`; UPDATE revoked (owner revoke-RPC only); 9 RPC bodies; bcrypt access codes.
**AFTER (verify):** no `invitation_token` column; every row has unique `token_hash` + `expires_at`; accept/revoke/expiry/throttle matrix green; no token-bearing URLs server-side (fragment transport only).
**Recovery:** rollback is NOT available (hashes are one-way). On execution failure: stop, preserve logs, forward-fix data, re-run; post-rollback world requires invitation re-issue. Never force past the backfill gates.

## 8. Account Deletion Production Readiness

Implementation present in baseline (VERIFIED): `execute_account_deletion` + `reconcile_deletion_operations` (service_role-only), `deletion_operations` (10 states + 5 checkpoints), `storage_cleanup_queue`, `deletion_step_up_proofs`, `retired_handles` (private), `DeleteAccountDialog` + `account-deletion-actions.ts` (password/OTP step-up, rate limits, GoTrue ordering), middleware deletion gate, 5-view Deleted User rendering (210001).
**Production sequence (unchanged architecture):** DB tombstone/state → global sign-out → auth scrub+ban → soft-delete → storage cleanup/reconciliation.
**Verify in production:** privileged self-delete blocked; handle retired and unreusable; sessions revoked globally; avatar removed (modulo ≤3600s CDN TTL); in-flight JWT writes fail closed; reconciler cron running; `admin_audit_logs` intact.
**Residuals (documented, not blockers):** OAuth `auth.identities` rows retained disabled (counsel disclosure dependency); CDN TTL window; PITR replay runbook required.

## 9. Room Invitation Production Readiness

SHA-256 hash at rest, 7-day expiry, single-use atomic consume (`FOR UPDATE` + guarded consume), owner-only revoke RPC (direct UPDATE revoked), caps (20 active/room, 10 creates/user/hour, 10 failures/user+room/15min with generic errors), bcrypt access codes, fragment transport (`#invitation=`), no anonymous preview, forwarding allowed, blocks do NOT gate joins, expired rows retained 90 days then purged. **Cron required:** expiry sweep + 90-day purge (operator-scheduled; cadence = HUMAN DECISION REQUIRED — suggested daily sweep, weekly purge verification).

## 10. Friends / Secure Share

Lifecycle (pending → accepted/declined/revoked/expired), sender quotas (15/hr, 40/day), **recipient inbox cap 50** (pair-lock + recipient-lock ordering, deadlock-free), 7-day decline cooldown, private graph (owner-scoped reads, no counts/feeds), block semantics (removes friendship, revokes pendings both ways, no auto-restore). Share controls for public rooms/profiles; private debates non-shareable. **No external invitation-token system exists** — room invitations (§9) are the only token system; the two must not be conflated (they are not, in code or schema).

## 11. Auth + 18+ + OAuth

**Email:** `age_confirmed=true` metadata → `before_user_created` hook (strict text equality; missing/false/strings/numbers/objects all reject; zero ghost rows by construction). READY NOW, needs production hook wiring (Auth config step).
**OAuth:** GoTrue provides **no pre-creation metadata channel** — stated limitation, not silently equivalent. Enforcement is post-auth: `profiles.age_confirmed` defaults false → middleware gates unconfirmed OAuth users → `/auth/attest-age` (explicit phrase + checkbox) → attested. Baseline contains all pieces (VERIFIED).
**Production browser verification required:** new Google signup lands on attest-age; confirmation grants access; direct-URL bypass to `/`, `/discussions`, `/debates`, `/friends`, `/settings`, create routes, and mutation RPCs all fail closed pre-attestation; existing users/admins unaffected; deleted users stay deleted.

## 12. SEO / SSR

Baseline contains: public discussion/debate/lens SSR initial-data plumbing, `robots.ts`, dynamic `sitemap.ts` (public rooms/profiles/legal only), brand OG image route, per-page metadata/canonicals, auth/search `noindex`, title single-suffix, conservative structured data (`WebSite`, `Organization`, `BreadcrumbList`, `DiscussionForumPosting`/`Article` on public rooms, `ProfilePage`). Verified absent: rating/review/endorsement/winner/consensus-authority schemas. Deleted profiles → 404 + `noindex`; admin → 404-rewrite + `noindex`. **Operator dependency:** Search Console/Bing Webmaster + sitemap submission post-deploy; canonical-host enforcement via `NEXT_PUBLIC_SITE_URL` once the domain exists.

## 13. Security / Exposure

Post-deploy checklist: client bundle free of service-role/API secrets/source-maps-with-secrets/internal endpoints/SQL/stack traces/storage paths/debug flags (VERIFIED clean locally); auth boundaries (anon/authenticated/deleted/inactive/OAuth/18+); RLS + grants + DEFINER `search_path` + owner-scoped reads + invitation/friend privacy (per ledger verification); admin 404-rewrite + RPC denial + audit isolation, all fail-closed. Re-verify against production hosting (headers, cookies, error pages).

## 14. Cron / Scheduled Jobs

| Job | Purpose | Frequency | Failure behavior | Authorization | Monitoring | Dependency |
|---|---|---|---|---|---|---|
| `reconcile_deletion_operations()` | Escalate exhausted ops; requeue storage intents | Suggested every 5–15 min — **HUMAN DECISION REQUIRED** | Safe retry via checkpoints; → `manual_review` after 5 | service_role | Alert on `manual_review` rows | OPERATOR DEPENDENCY (pg_cron/scheduler) |
| Invitation expiry sweep | Transition past-due actives → `expired` | Suggested daily — **HUMAN DECISION REQUIRED** | Idempotent; safe re-run | service_role | Alert on sweep errors | OPERATOR DEPENDENCY |
| 90-day invitation purge | Delete long-expired rows | Suggested weekly verification — **HUMAN DECISION REQUIRED** | Idempotent; no-op when empty | service_role | Alert on failures | OPERATOR DEPENDENCY |
| Storage queue processing | Delete verified avatar objects | Inline in Server Action + retry; dedicated worker optional | Failed → `failed`, reconciler requeues | service_role | Alert on repeated failures | OPERATOR DEPENDENCY if dedicated worker chosen |

No in-repo scheduler exists (VERIFIED zero `pg_cron` references) — by design; scheduling is infrastructure.

## 15. Hosting / HTTPS / Security Headers

No hosting config in repo (VERIFIED: no vercel/netlify/docker/fly/render/CI files) — provider is HUMAN DECISION REQUIRED (`build` → `start`, Node 22.x suggested). `next.config.ts` contains ONLY the dev guard — **the application currently provides zero production security headers**. Operator/hosting must supply: HTTPS + HSTS, `X-Content-Type-Options: nosniff`, frame protection (`DENY`), `Referrer-Policy`, restrictive `Permissions-Policy`, `Secure`/`HttpOnly`/`SameSite` cookies (Supabase SSR defaults + verify), canonical host + www↔apex redirects, custom error pages, static-asset cache policy. All OPERATOR DEPENDENCY.

## 16. Performance / Reliability

No load test performed (out of scope). Known build facts: shared First-Load JS ~102 kB; middleware ~89.6 kB; all room routes dynamic (SSR on demand). Suggested operational targets — **not product requirements**: p95 public-room TTFB < 800 ms; 5xx rate < 0.1%/5 min; auth RPC p95 < 500 ms; zero hydration-mismatch errors in Sentry. Beta baseline: measure for 7 days post-deploy, then set SLOs (HUMAN DECISION REQUIRED).

## 17. Email / Deliverability

Supabase Auth is the sole mail path (VERIFIED zero `resend`/`nodemailer`/`smtp` references in `src/**`). Pre-Beta checklist: production SMTP (Resend) in Supabase Dashboard; verified sender domain + SPF + DKIM + DMARC; password-reset + verification + OTP delivery tests to major providers; grievance/contact mailbox; bounce handling; rate-limit awareness (Auth defaults); no app code needed.

## 18. Legal / Operator Readiness

Routes exist: `/terms`, `/privacy`, `/guidelines`, `/grievance` (+ registration 18+ notice, deletion language, data-handling language in drafts). **Operator inputs pending** (all `<OperatorPlaceholder>` in `/grievance` VERIFIED): operating entity, grievance officer details, official contact email, physical address. **Counsel verification required** (no independent DPDP/GDPR applicability claims made here): CERT-In log retention, IT Rules record-keeping, anonymization-standard confirmation, OAuth residual-identifier disclosure.

## 19. Backup / Recovery / Rollback

- **Database:** PITR-enabled project; tested restore; pre-apply snapshot retained until §6 verification signed. Migration failure → stop, preserve evidence, forward-fix (never blind-retry 150001 past its gates).
- **Reversibility:** view/grant/policy migrations reversible; 140004/160001 new objects droppable pre-data; **150001 irreversible** (re-issue invitations); 220001 keep-column (forward-fix).
- **Application:** previous release baseline = `dbaf36a` (redeploy it); env rollback = restore prior secrets set. **Git rollback never reverses applied database migrations** — DB recovery is forward-only.
- **Auth/DNS:** OAuth/SMTP config snapshots before change; DNS TTL lowered pre-cutover, revert plan documented.

## 20. Observability

Sentry instrumented with privacy-safe defaults (VERIFIED: `sendDefaultPii: false`, replays off, email/IP/username/auth/cookie scrubbed) — project/DSN missing (OPERATOR DEPENDENCY). Actionable alerts: 5xx spike, auth/OAuth/signup failure rate, deletion `manual_review` rows, storage-queue repeated failures, cron failures, DB/RLS/RPC error rate, invitation throttle anomalies. Normal-expected (no alert): 401/403 on private surfaces, expired-invitation NULLs, rate-limit rejections. No invasive analytics (privacy rule).

## 21. First 24-Hour Smoke Plan

PUBLIC: homepage, public discussion + all lenses, public debate + lenses, public profile, SSR substance present, robots/sitemap/OG/structured-data valid. AUTH: email signup + 18+, login, Google OAuth + attestation, logout. DISCUSSION: create, contribute, claim, evidence, inquiry, relation, SoU, private-room isolation. DEBATE: sides, inquiries, SoU, position-history privacy. FRIENDS: add/accept/decline/block/unblock/inbox cap behavior. SHARE: public links work, private denied, invitation create/accept/expiry/single-use/revoke. DELETION (test account): step-up, tombstone, "Deleted User", session invalidation, handle retired + unreusable, storage cleaned. ADMIN: normal-user 404/denied, owner access, audit logs, fail-closed. MOBILE 390px + DESKTOP ~1440px passes.

## 22. Abort Conditions

STOP on: unexpected applied migration; ledger mismatch vs §6; missing/unverified backup; 150001 gate failure; schema drift; RLS/grant regression; service-role or OAuth secret exposure; private content served to guests; plaintext invitation token surviving; deletion state corruption (`manual_review` unexpected); admin bypass; SSR private leak; unresolved legal/operator blocker; domain/TLS failure; critical email failure; unexplained 5xx spike. All conditions evidence-based; vague unease is not an abort reason.

## 23. Final Go/No-Go Matrix

| Area | Status | Evidence | Required before Beta? | Owner | Next action |
|---|---|---|---|---|---|
| Release baseline (`dbaf36a`) | READY | 346 files, build+tests green, secrets clean | YES (done) | Eng | None |
| Migration ledger + manifest | READY | Reconciliation report §9 (13 files) | YES (done) | Eng | None |
| Backup/PITR | OPERATOR DEPENDENCY | No production project exists | YES | Operator | Provision + test restore |
| Supabase (project/Auth/Storage/Realtime) | OPERATOR DEPENDENCY | Config present, project absent | YES | Operator | Provision per §6 |
| Hosting + Node pin | OPERATOR DEPENDENCY / HUMAN DECISION | No deploy config in repo | YES | Operator/Owner | Choose provider + Node 22.x |
| Domain/DNS/HTTPS | OPERATOR DEPENDENCY | Parking only (report-evidenced) | YES | Operator | Register + TLS + redirects |
| Environment variables | READY (matrix) + OPERATOR DEPENDENCY (values) | §5 matrix, hygiene VERIFIED | YES | Operator | Populate secrets |
| Auth (email) | READY WITH CONDITIONS | Hook + flow VERIFIED locally | YES | Operator | Wire hook + SMTP in prod |
| Email deliverability | OPERATOR DEPENDENCY | No app code needed | YES | Operator | Resend + SPF/DKIM/DMARC + tests |
| Google OAuth | OPERATOR DEPENDENCY | Code VERIFIED, creds absent | YES | Operator | Prod client + URIs + browser test |
| 18+ enforcement | READY WITH CONDITIONS | Email strict; OAuth post-auth gate in baseline | YES | Operator | Prod OAuth browser test (§11) |
| Friends / Secure Share | READY WITH CONDITIONS | Code + migrations in baseline | YES | Operator | Deploy + smoke (§21) |
| Room invitations | READY WITH CONDITIONS | Code + 150001 in baseline | YES | Operator | Deploy + sweep/purge cron + smoke |
| Account deletion | READY WITH CONDITIONS | Code + 160001 + views in baseline | YES | Operator | Deploy + reconciler cron + test-account drill |
| Cron/scheduled jobs | OPERATOR DEPENDENCY | No in-repo scheduler by design | YES | Operator | Schedule 4 jobs (§14) |
| SEO/SSR | READY WITH CONDITIONS | Baseline VERIFIED | YES | Operator | Post-deploy verification + Search Console |
| Security exposure | READY WITH CONDITIONS | Local posture VERIFIED | YES | Operator | Post-deploy checklist (§13) + headers (§15) |
| Admin | READY | Boundaries VERIFIED in code | YES | — | Post-deploy denial tests |
| UI/UX | READY | Audits + build green | YES | — | Post-deploy responsive pass |
| Performance | POST-DEPLOYMENT VERIFICATION | No SLA set (suggested targets §16) | Observe | Operator | 7-day baseline |
| Observability | OPERATOR DEPENDENCY | Code instrumented, project absent | YES | Operator | Sentry project + alerts |
| Legal (Terms/Privacy/Guidelines/Grievance) | OPERATOR DEPENDENCY | Routes + drafts present, placeholders pending | YES | Owner/Counsel | Fill + counsel review |
| Grievance officer/contact | OPERATOR DEPENDENCY | Placeholders VERIFIED | YES | Owner | Provide details |
| Operator readiness | OPERATOR DEPENDENCY | Runbook complete | YES | Owner | Staff + runbooks |
| Post-deploy smoke | POST-DEPLOYMENT VERIFICATION | Plan §21 | YES | Eng+Operator | Execute within 24h |

## 24. Exact Execution Order

**PHASE 0 — Release baseline verification:** confirm HEAD `dbaf36a`, worktree exclusions, manifest files present. ✅ (this audit)
**PHASE 1 — Production infrastructure provisioning:** Supabase PG17 + PITR, hosting choice, domain/DNS/TLS, Sentry project.
**PHASE 2 — Backup/PITR + migration preflight:** snapshot, ledger check, `--include-all --dry-run`, order verification.
**PHASE 3 — Production database migration:** apply 13 in §6 order (040003+140005 paired; 150001 gate watched).
**PHASE 4 — Post-migration security verification:** §6 checklist (RLS/grants/RPCs/views/FK).
**PHASE 5 — Hosting/domain deployment:** env population, deploy `dbaf36a`, headers, canonical host.
**PHASE 6 — Auth/OAuth/email configuration:** hook wiring, Google URIs, SMTP + deliverability tests.
**PHASE 7 — Cron/observability:** 4 jobs scheduled, Sentry alerts live.
**PHASE 8 — Live browser/security smoke:** §21 full sequence + §13 checklist.
**PHASE 9 — Final Beta gate:** Go/No-Go per §23; legal sign-off recorded.
**PHASE 10 — Public Beta:** launch, 24h watch, 7-day performance baseline.

## 25. Open Operator Decisions

1. Hosting provider + Node version pin (suggested: any `build`→`start` host, Node 22.x).
2. Canonical host + www↔apex direction.
3. Cron cadences (suggested: reconciler 5–15 min, invitation sweep daily, purge weekly-verified).
4. Performance SLOs after 7-day baseline (suggested targets §16).
5. Sitemap scope confirmation (profiles in/out, lens sub-pages canonical-only).
6. AI-crawler policy (`llms.txt`/terms reiteration) — later, not Beta-blocking.

## 26. Open Production Blockers

1. No production Supabase project (blocks everything downstream).
2. No domain/DNS/TLS.
3. No Google OAuth production credentials (blocks OAuth 18+ live proof).
4. No SMTP/deliverability (blocks signup/reset/OTP emails).
5. No Sentry project (blocks observability).
6. No cron scheduling (blocks reconciler/sweep/purge).
7. No legal counsel sign-off; no operator/grievance details (blocks Beta legitimacy).
8. `FINAL_PRE_BETA_PRODUCTION_READINESS_AUDIT.md` and three batch reports never written as files (evidence gap, not a code gap).

**NO IMPLEMENTATION. NO PRODUCTION CONTACT. NO DEPLOYMENT. NO COMMIT.**
