# Discora — Pre-Beta Migration Baseline Correction Report

**Document Status:** OFFICIAL IMPLEMENTATION & VERIFICATION REPORT
**Phase:** REQUIRED MIGRATION BASELINE FIX
**Mode:** IMPLEMENT + VERIFY + COMMIT
**Execution Date (UTC):** 2026-09-19

---

## 1. Purpose

This correction incorporates the already-audited, technically mandatory PostgreSQL compatibility fix into the Public Beta release baseline. It resolves the column ordering conflict in `public.discussion_questions` so that applying migration `202609210001` succeeds deterministically without failing on view column replacement.

---

## 2. Baseline

- **Original Release Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca` (`feat: establish Discora Public Beta release baseline`)
- **Parent Commit:** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd`

---

## 3. Corrected Migration

`supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`

---

## 4. Exact Correction

The exact change adds `DROP VIEW IF EXISTS public.discussion_questions;` immediately preceding `create or replace view public.discussion_questions`:

```sql
-- ============================================================================
-- 4. discussion_questions
-- ============================================================================
drop view if exists public.discussion_questions;

create or replace view public.discussion_questions
with (security_invoker = false)
as
select
  q.id,
  q.room_id,
  q.content,
  q.question_type,
  q.identity_mode,
...
```

### Why It Is Required
In migration `202606210001_private_debate_authorization_foundation.sql`, `public.discussion_questions` was accidentally replaced with a 10-column definition that omitted `q.question_type`, positioning `identity_mode` as Column 4. Migration `202609210001` restores `q.question_type` at Column 4, shifting all subsequent columns.

PostgreSQL `CREATE OR REPLACE VIEW` strictly forbids altering existing column names, types, or column order in place (it only permits appending new columns at the end of an existing view). Executing `CREATE OR REPLACE VIEW` on a database running `202606210001` without first dropping the view causes PostgreSQL to reject the statement.

---

## 5. PostgreSQL Failure (SQLSTATE 42P16)

When attempting to replace the view without `DROP VIEW IF EXISTS`, PostgreSQL throws:
```
ERROR: cannot change name of view column "identity_mode" to "question_type"
SQL state: 42P16
```
This error aborts the migration transaction and rolls back the migration process. Adding `DROP VIEW IF EXISTS public.discussion_questions;` eliminates the schema conflict by removing the 10-column view structure before instantiating the corrected 11-column view.

---

## 6. Safety

1. **No CASCADE:** The drop statement strictly avoids `CASCADE` (`drop view if exists public.discussion_questions;`). This guarantees that if any unintended dependent database object existed, PostgreSQL would fail closed rather than drop dependencies silently.
2. **No Database Dependencies:** Searching all 87 migrations confirms that `public.discussion_questions` has zero dependent views, functions, triggers, or foreign keys. (The historical view-on-view dependency in `moderation_queue` was refactored in `202606100006` and `202609140005` to join base table `public.questions` directly).
3. **Grants Preserved:** The migration immediately re-applies:
   ```sql
   grant select on public.discussion_questions to anon, authenticated;
   ```
4. **Base Table Untouched:** Views in PostgreSQL are non-materialized query representations. Dropping the view does not alter, truncate, or touch any row in the underlying `public.questions` table.
5. **Deleted-User Anonymization Preserved:** The restored view enforces:
   ```sql
   when p.is_deleted = true then 'Deleted User'
   when p.username is null then 'Deleted User'
   else p.username
   ```
   This strictly prevents tombstone usernames (`deleted_user_<hash>`) from leaking publicly.

---

## 7. Validation

| Verification Check | Command / Harness | Result | Notes |
|---|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit` | ✅ **PASS** (Exit code 0) | Zero type errors across application. |
| **Unit / Feature Tests** | `npm test` (vitest) | ✅ **PASS** (Exit code 0) | 28 / 28 tests passed (18ms). |
| **Production Build** | `npm run build` | ✅ **PASS** (Exit code 0) | All 31 routes compiled and static-optimized. |
| **Code Linting** | `npm run lint` | ✅ **PASS** (Exit code 0) | 0 errors (44 pre-existing non-blocking warnings in QA scripts). |
| **Restore Automation Suite** | `node scripts/backup/test-restore.mjs` | ✅ **PASS** (Exit code 0) | All Phase 6 restore checks passed (42 / 42 integrity checks). |
| **Secret Scan** | Automated pattern scan | ✅ **PASS** | Zero secrets, tokens, connection strings, or private keys staged. |

---

## 8. Git Verification

- **Previous Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca`
- **New Corrective Commit:** Created immediately following this report.
- **Committed Files:**
  1. `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`
  2. `docs/PRE_BETA_MIGRATION_BASELINE_CORRECTION_REPORT.md`
- **Exact Migration Diff:**
  ```diff
  --- a/supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql
  +++ b/supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql
  @@ -185,6 +185,8 @@ grant select on public.discussion_evidence to anon, authenticated;
   -- ============================================================================
   -- 4. discussion_questions
   -- ============================================================================
  +drop view if exists public.discussion_questions;
  +
   create or replace view public.discussion_questions
   with (security_invoker = false)
   as
  ```

---

## 9. Production Safety Attestation

- **Production Contact:** NONE.
- **Production Migrations Executed:** 0.
- **Deployment Executed:** NONE.
- **Git Push Executed:** NONE.
- **DNS / Hosting / OAuth / SMTP Changes:** NONE.

---

## 10. Final Status

**LOCAL RELEASE BASELINE CORRECTED — PRODUCTION NOT DEPLOYED**
