# Discora — Pre-Beta Security/Integrity Remediation Report (P1-01 + P2-01 + P2-02 + P3-01 + P3-02)

**Mode:** TARGETED REMEDIATION (Product Owner authorized). Local Supabase only. One forward migration. No app-code changes. No production contact beyond the pre-existing read-only ledger inspection. No commits. No pushes.
**Date (UTC):** 2026-09-16
**Authorizing audit:** `docs/COMPREHENSIVE_PRE_BETA_PRODUCT_SECURITY_EXPOSURE_AUDIT.md` (verdict BLOCKED: P1×1, P2×2, P3×7)

---

# Scope

Remediate exactly five audit findings, nothing else:

- P1-01 — restore `authenticated` SELECT on `inquiry_items` / `inquiry_responses` / `debate_side_changes`
- P2-01 — narrow `claim_relations` INSERT to room-write-authorized, same-room relations
- P2-02 — fix `debates` UPDATE policy tautology (`r.id = r.id` → `r.id = debates.id`)
- P3-01 — enable RLS on `claim_deletion_config` (deny-by-default)
- P3-02 — pin `search_path` on 4 SECURITY DEFINER functions

Explicitly NOT in scope (untouched): SEO/robots/sitemap, discussion metadata, JSON-LD, `admin_inspect_private_room` repair, OAuth re-auth redesign, realtime, PITR, SMTP/Resend, domain/DNS, notifications, AI-SoU, SoU semantics, vote/stance meanings.

---

# Findings Remediated

## P1-01 — Authenticated SELECT grants restored

- **Before:** `information_schema.table_privileges` showed DML only for `postgres` on all three tables; `authenticated`/`anon` held only default TRUNCATE/REFERENCES/TRIGGER. RLS SELECT policies existed (`Inquiry visibility matches room visibility`, `Response visibility matches inquiry visibility`, `Users can view own side changes`) but every browser-client read failed closed (403). App read paths affected: `src/features/inquiries/services/inquiry-service.ts:175-189` (`getInquiryById`), `:216-230` (`getInquiriesForTarget`), `:259-279` (`getInquiryCountsByRoom`), `:281-289` (`getInquiryResponses`), and `src/features/debates/services/debate-service.ts:380-392` (`getSideChangeHistory`) — all default to `createBrowserSupabaseClient()` (`inquiry-service.ts:40-42`).
- **Fix:** `GRANT SELECT ON public.inquiry_items TO authenticated;` + same for `inquiry_responses`, `debate_side_changes`. No anon grant. No INSERT/UPDATE/DELETE. No RLS change.
- **Authorization model:** grant (who can reach the table) + RLS USING (which rows): room-scoped inquiry visibility via `has_room_access(room_id)`; response visibility via parent inquiry's room; side-change history own-user-only (`auth.uid() = user_id`). Fail-closed on both layers.
- **Evidence (live local):** post-migration privilege query returns all three rows `{grantee: authenticated, privilege_type: SELECT}` (VERIFIED).
- **Tests:** P1-01 matrix — grants present PASS; RLS policies unchanged PASS; no anon grant PASS (privilege query shows no anon SELECT); no DML grant added PASS. Live cross-user behavioral probes (User A vs User B private data, no-room-access denial, side-history isolation) NOT executed — no test identities provisioned in this task; RLS policy bodies are unchanged from the previously probed state, and the grant is strictly narrower than the policies. Marked accordingly below.

## P2-01 — claim_relations INSERT narrowed to room-write-authorized same-room relations

- **Before:** live policy `WITH CHECK (is_active_user())` — any active authenticated user could INSERT a relation referencing any room (including private/archived/no-access rooms) and any two claims, polluting SoU connection context (SoU consumes `contradicts` edges from evidenced challengers).
- **Fix:** replaced WITH CHECK with: `is_active_user()` AND `room_id IS NOT NULL` AND `has_room_write_access(room_id)` AND `source_claim_id IS DISTINCT FROM target_claim_id` AND both endpoints exist in `NEW.room_id` (two EXISTS subqueries on `public.claims`). Authoritative room is `NEW.room_id`. `has_room_write_access()` (live body VERIFIED) already enforces active-user + non-archived + (public-with-session OR owner OR active participant).
- **Room authorization:** write access → allowed when otherwise valid; no-write/private-no-access/archived → `has_room_write_access` false → rejected; inactive/deleted → `is_active_user()` false → rejected; cross-room endpoints → EXISTS fails → rejected; self-edge/NULL endpoints → rejected. Existing legitimate flows (owner/participant creating relations among same-room claims) continue: they satisfy all conjuncts.
- **SoU integrity implications:** SoU semantics UNCHANGED (`understanding-utils.ts` untouched). Unauthorized relation injection can no longer reach SoU inputs through PostgREST; only room-write-authorized relations are stored.
- **Evidence (live local):** `pg_policies` WITH CHECK now reads `(is_active_user() AND (room_id IS NOT NULL) AND has_room_write_access(room_id) AND (source_claim_id IS DISTINCT FROM target_claim_id) AND EXISTS(... sc.id = claim_relations.source_claim_id AND sc.room_id = claim_relations.room_id) AND EXISTS(... tc.id = claim_relations.target_claim_id AND tc.room_id = claim_relations.room_id))` (VERIFIED — NEW columns qualified as `claim_relations.*`).
- **Same-day pre-verification correction (disclosed):** the first applied version used unqualified `room_id` inside the EXISTS subqueries, which Postgres resolved to the inner aliases (`sc.room_id = sc.room_id` tautology — caught by re-reading live `pg_policies` before sign-off). Fixed in the local-only, never-pushed migration file with an inline NOTE, corrected policy applied live (DROP + CREATE), and re-verified. Precedent: 9D.3 report's in-file pre-verification fix. File text and live state now match exactly.
- **Tests:** policy-text assertions all PASS (no tautology; all 6 conjuncts present). Live DML probes with two test users NOT executed (no test identities provisioned); matrix items requiring authenticated sessions marked limited below. No app-code change, so legitimate-flow regression risk is confined to the policy conjuncts, each of which mirrors already-enforced helpers.

## P2-02 — debates UPDATE tautology fixed (stays inert)

- **Before:** live qual `(EXISTS (SELECT 1 FROM rooms r WHERE ((r.id = r.id) AND (r.created_by = auth.uid()))))` — drift from correct migration text.
- **Fix:** forward DROP + CREATE with `r.id = debates.id AND r.created_by = auth.uid()`, same policy name, same command/role, no WITH CHECK added (matches original shape).
- **Live policy verification (VERIFIED):** qual now `(EXISTS (SELECT 1 FROM rooms r WHERE ((r.id = debates.id) AND (r.created_by = auth.uid()))))` — tautology gone.
- **Evidence:** `table_privileges` for `debates`: anon/authenticated hold SELECT only; NO INSERT/UPDATE/DELETE grants — policy remains inert; no UPDATE grant added; no cross-debate path introduced.

## P3-01 — claim_deletion_config RLS hardened

- **Before:** RLS disabled (Supabase advisor `rls_disabled` reproduced on every query); no client DML grants (only `postgres`), so not live-exploitable — hygiene gap.
- **Fix:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + explicit `REVOKE ALL ... FROM public, anon, authenticated` (defense-in-depth; removes even default TRUNCATE/REFERENCES/TRIGGER). NO permissive policies created — deny-by-default is the minimum correct posture because: (a) grep over `src/` finds ZERO application reads of this table; (b) the sole consumers are `enforce_claim_deletion_lock` / `claim_delete_with_lock` / `enforce_argument_deletion_lock`, all SECURITY DEFINER owned by `postgres` (VERIFIED `prosecdef=true`, `owner=postgres`), which bypass RLS.
- **Policy:** none (documented intent above).
- **Evidence:** `pg_tables.rowsecurity = true` (VERIFIED); advisor warning gone from subsequent query responses; `SELECT lock_duration_minutes` returns `20` (VERIFIED — deletion lock behavior preserved).

## P3-02 — search_path pinned on 4 DEFINER functions

- **Before:** `proconfig = null` (VERIFIED live) for all four.
- **Fix:** `ALTER FUNCTION public.<fn>() SET search_path = public, pg_temp` — the repo-established pattern (matches `has_room_write_access`, deletion RPCs).
- **Function verification (VERIFIED live):** all four now show `proconfig = {search_path=public, pg_temp}`; `prosecdef` unchanged (still DEFINER); ownership unchanged (`postgres`); grants untouched; bodies untouched (config-only ALTER, no CREATE OR REPLACE).
- Functions: `get_homepage_metrics()`, `get_my_inquiry_responses()`, `get_my_open_inquiries()`, `handle_new_user_preferences()` — all zero-argument (signatures VERIFIED via `pg_get_function_identity_arguments`).

---

# Migration

- **Filename:** `supabase/migrations/202609170001_pre_beta_security_remediation.sql`
- **Timestamp:** 202609170001 (after latest local `202609160001`; no history edits; no existing file modified — VERIFIED via directory listing).
- **Local application status:** APPLIED via `npx supabase migration up` (`Applying migration 202609170001_pre_beta_security_remediation.sql... Local database is up to date.`). Plus one live policy correction for P2-01 (DROP + CREATE with qualified NEW references, identical to final file text) after the tautology-class catch; file and live state re-verified equal.
- **Production status:** NOT TOUCHED. Read-only `supabase migration list` post-change shows remote still through `202609140003`; `202609170001` (like 140004/140005/140006/150001/160001) is local-only column blank on Remote.

---

# Regression Results

- **TypeScript:** `npx tsc --noEmit` → exit 0, 0 errors.
- **Lint:** `npm run lint` → 0 errors, 44 warnings (identical pre-existing baseline count; warnings confined to `scripts/*` QA harnesses + 3 pre-existing `src` unused-var spots; none in migration-adjacent code — migration is SQL-only, no app code changed).
- **Build:** `npm run build` → exit 0; 29 routes; shared First-Load JS ~102 kB (unchanged).
- **Vitest:** `npx vitest run` → 28 passed (`understanding-utils.spec.ts` — SoU determinism preserved); 1 suite fails to import (`tests/phase5c-onboarding-qa.spec.ts` requires `@playwright/test`, not installed — pre-existing environmental, identical to audit baseline).
- **SQL/security tests (this task, local read-only + catalog):**
  - P1-01 grants present (3/3) PASS; anon SELECT absent PASS; RLS policies unchanged PASS.
  - P2-01 policy conjuncts present, no tautology PASS (after disclosed correction).
  - P2-02 tautology gone PASS; no UPDATE grant PASS.
  - P3-01 `rowsecurity=true` PASS; `lock_duration_minutes=20` PASS; advisor warning cleared PASS.
  - P3-02 all four `proconfig` pinned PASS.
  - Live authenticated DML probes (cross-user insert/select denial, private-room rejection, archived rejection) NOT executed — no test identities provisioned; explicitly limited, not claimed.
- **Playwright:** PLAYWRIGHT NOT RUN — ENVIRONMENTAL LIMITATION (`@playwright/test` not installed; no browser session driven). Unverified live: inquiry detail/counts rendering, position-history rendering, SoU inquiry chips, relation-creation UX (valid + rejected paths), private/archived-room authorization UX. These require a follow-up browser pass with the repo's Playwright setup.
- **Security regression:** no new grants beyond the three least-privilege SELECTs; no RLS weakening (one policy narrowed, one predicate corrected, RLS newly enabled on one table); no DEFINER body/owner/grant changes; no app-code changes; secret grep unchanged (service key server-only).

---

# Remaining Known Findings

From the comprehensive audit, NOT in this task's scope (unchanged):

- P3-03 PUBLIC-execute hygiene + cross-user prefs-read nuance; P3-04 `admin_inspect_private_room` broken-but-closed; P3-05 Google `select_account` limitation; P3-06 SEO (robots/sitemap/discussion metadata/JSON-LD); P3-07 dormant `evidence_votes` + relations-view under-share.
- Reliability notes: avatar CDN TTL ≤3600s; realtime eviction unverified; PITR runbook unexercised.
- Operator dependencies: production domain/DNS, deployed frontend, SMTP/Resend, Google OAuth URIs, sweep/purge scheduling, Sentry DSNs, counsel review — all still pending.
- Production grants/behavior: still UNKNOWN until legitimate prod access exists (dashboard-grant pattern per `202609090011`).

---

# Production Status

PRODUCTION NOT TOUCHED

---

# Commit / Push Status

NO COMMITS
NO PUSHES
