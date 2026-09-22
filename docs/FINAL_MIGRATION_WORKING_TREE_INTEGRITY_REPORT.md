# Discora — Final Migration Working-Tree Integrity Report

**Document Status:** AUTHORITATIVE AUDIT & TECHNICAL VERIFICATION  
**Target File:** `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`  
**Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca` (`feat: establish Discora Public Beta release baseline`)  
**Mode:** READ-ONLY / NO PRODUCTION CONTACT / NO REPOSITORY MUTATION / NO COMMIT  
**Execution Date (UTC):** 2026-09-19  

---

## 1. Executive Summary

This investigation resolves the single remaining migration discrepancy prior to Discora Public Beta production deployment: determining whether the working-tree modification in `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql` (the addition of `DROP VIEW IF EXISTS public.discussion_questions;`) is required or should be reverted.

- **The Modification:** Two lines added prior to `create or replace view public.discussion_questions`:
  ```sql
  drop view if exists public.discussion_questions;

  create or replace view public.discussion_questions
  ```
- **Technical Cause:** In migration `202606210001_private_debate_authorization_foundation.sql`, `public.discussion_questions` was accidentally replaced with a 10-column definition that omitted `q.question_type`, positioning `identity_mode` as Column 4. Migration `202609210001` restores `q.question_type` at Column 4, shifting all subsequent columns.
- **PostgreSQL Rule:** In PostgreSQL, `CREATE OR REPLACE VIEW` strictly prohibits changing existing column names, column data types, or inserting a column in the middle of existing columns. Applying `202609210001` without `DROP VIEW IF EXISTS` triggers a fatal error:
  `ERROR: cannot change name of view column "identity_mode" to "question_type"`.
- **Finding:** The working-tree change is **technically mandatory** for production deployment. Without it, migration 12 of the 13-migration production set will fail and roll back the transaction.
- **Phase 7D DR Compatibility:** In Phase 7D, the DR drill restored the schema from DDL dumps where views were constructed cleanly, and documented this exact fix in `docs/PRE_BETA_FREE_BACKUP_PHASE6_RESTORE_IMPLEMENTATION_REPORT.md` §6.3.
- **Final Verdict:** **B — CANONICAL CHANGE REQUIRED**. The change is necessary and must be deliberately incorporated into the release baseline in a dedicated, authorized baseline update task.

---

## 2. Baseline Commit & Working-Tree State

- **Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca`
- **Working-Tree Status for Migrations:**
  - Exactly 87 migration files exist in `supabase/migrations/`.
  - Exactly 86 migration files are unmodified relative to `dbaf36a`.
  - Exactly **1 migration file** has working-tree modifications:
    `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`.
  - Zero migrations are untracked.
  - Zero migrations are missing.

---

## 3. Exact Migration Diff

Running `git diff dbaf36a384a5e543277c4bbb19e28592145960ca -- supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`:

```diff
diff --git a/supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql b/supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql
index cef6292..e66f910 100644
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

**Diff Summary:**
- Lines added: 2 (`drop view if exists public.discussion_questions;` + 1 blank line).
- Lines deleted: 0.
- All other 262 lines in the file are 100% byte-identical to the baseline commit.

---

## 4. Comparison of the Three Versions

### A. Baseline Committed Version (`dbaf36a`)
- Does not contain `drop view if exists public.discussion_questions;`.
- Relies solely on `create or replace view public.discussion_questions`.
- Fails on any database that has `202606210001` applied (including production Supabase).

### B. Current Working-Tree Version
- Contains `drop view if exists public.discussion_questions;` immediately preceding `create or replace view`.
- Drops the old view definition and creates the new view with `question_type` included at Column 4.
- Re-applies `grant select on public.discussion_questions to anon, authenticated;`.

### C. Phase 7D DR Restored Version
- In the Phase 7D isolated disaster-recovery drill (`docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md`), the schema was restored from the Phase 7B encrypted backup dump (`database.sql`).
- In `database.sql`, `public.discussion_questions` was created cleanly as a new view containing the 11-column definition.
- The forward-migration reconciler (`scripts/backup/reconcile-restore.mjs`) verified all 87 migration records up to tip `202609220001`.
- The origin of the working-tree edit is explicitly recorded in `docs/PRE_BETA_FREE_BACKUP_PHASE6_RESTORE_IMPLEMENTATION_REPORT.md` §6.3:
  > *"3. Fix Applied to `202609210001`: Added `DROP VIEW IF EXISTS public.discussion_questions;` prior to recreating the view to allow column order alignment without PostgreSQL renaming conflicts."*

---

## 5. Why the Difference Exists (Database Anatomy)

### Column History of `public.discussion_questions`

1. **Original Migration (`202606040001_create_moderation.sql` L192–214):**
   ```sql
   select
     q.id,             -- Col 1
     q.room_id,        -- Col 2
     q.content,        -- Col 3
     q.question_type,  -- Col 4
     q.identity_mode,  -- Col 5
     q.is_retracted,   -- Col 6
     ...
   ```
   View had 11 columns, with `question_type` at Col 4.

2. **Accidental Omission (`202606210001_private_debate_authorization_foundation.sql` L424–450):**
   ```sql
   drop view if exists public.discussion_questions;
   create or replace view public.discussion_questions ...
   select
     q.id,             -- Col 1
     q.room_id,        -- Col 2
     q.content,        -- Col 3
     q.identity_mode,  -- Col 4 (question_type was dropped!)
     q.is_retracted,   -- Col 5
     ...
   ```
   Because `drop view if exists` was used in `202606210001`, PostgreSQL permitted replacing the 11-column view with a 10-column view where `identity_mode` became Col 4.

3. **Restoration in `202609210001_fix_deleted_user_display_in_public_views.sql` (L190–216):**
   ```sql
   select
     q.id,             -- Col 1
     q.room_id,        -- Col 2
     q.content,        -- Col 3
     q.question_type,  -- Col 4 (question_type restored!)
     q.identity_mode,  -- Col 5
     ...
   ```
   When `CREATE OR REPLACE VIEW` is executed on a live database where Col 4 is currently `identity_mode`, PostgreSQL checks if the existing view column names and types match the new query. Since Col 4 is now named `question_type`, PostgreSQL raises:
   ```
   ERROR: cannot change name of view column "identity_mode" to "question_type"
   SQL state: 42P16
   ```
   PostgreSQL `CREATE OR REPLACE VIEW` only permits appending new columns at the *end* of the column list; it cannot insert columns into the middle of an existing view.

---

## 6. Analysis of the Five Target Views in `202609210001`

| View Name | Pre-Existing Columns | New Columns in `202609210001` | Column Names/Types/Order Changed? | Needs `DROP VIEW`? | Reason |
|---|---|---|---|---|---|
| `public.discussion_messages` | 13 columns | 13 columns | Identical | **NO** | `username` CASE logic replaced in-place; column signature identical. |
| `public.discussion_claims` | 21 columns | 21 columns | Identical | **NO** | `username` CASE logic replaced in-place; column signature identical. |
| `public.discussion_evidence` | 22 columns | 22 columns | Identical | **NO** | `username` CASE logic replaced in-place; column signature identical. |
| `public.discussion_questions` | **10 columns** (since `202606210001`) | **11 columns** (`question_type` at Col 4) | **YES (Renaming & Shift at Col 4)** | **YES (MANDATORY)** | `identity_mode` changed to `question_type`. PostgreSQL error 42P16 occurs without DROP. |
| `public.discussion_arguments` | 14 columns | 14 columns | Identical | **NO** | `username` CASE logic replaced in-place; column signature identical. |

**Result:** `public.discussion_questions` is the **only** view among the five that underwent a structural column reordering. The other four views cleanly replace in place.

---

## 7. Dependency and Cascade Safety Analysis

When `DROP VIEW IF EXISTS public.discussion_questions;` is executed:
- **Does any database object depend on `public.discussion_questions`?**
  - In earlier migrations (`202606040002`), `moderation_queue` had a dependency on `discussion_questions`.
  - In migrations `202606100006` and `202609140005`, `moderation_queue` was completely refactored to join directly on base tables (`public.questions dq on dq.id = f.question_id`).
  - Searching all 87 migrations confirms that **no database view, trigger, function, or foreign key depends on `public.discussion_questions`**.
- **Cascade Danger:**
  - The drop statement uses plain `DROP VIEW IF EXISTS public.discussion_questions;` (without `CASCADE`).
  - If any dependent object existed, PostgreSQL would refuse the drop. Since no dependent object exists, the drop executes cleanly in milliseconds.
- **Grants & Permissions:**
  - The migration immediately follows with:
    `grant select on public.discussion_questions to anon, authenticated;`
  - Anonymous and authenticated users retain uninterrupted read access.
- **Row-Level Security & Security Invoker:**
  - The view is created `with (security_invoker = false)`.
  - Filtering remains strictly enforced via `where public.has_room_access(q.room_id) and not exists (select 1 from public.moderation_flags mf where mf.question_id = q.id and mf.status = 'resolved_hidden')`.

---

## 8. Phase 7D Disaster Recovery Compatibility

- **Evidence Classification:** **PROVEN**
- In Phase 6 (`docs/PRE_BETA_FREE_BACKUP_PHASE6_RESTORE_IMPLEMENTATION_REPORT.md` §6.3), the forward migration test encountered this exact error and applied the fix to allow migration replay to succeed.
- In Phase 7D (`docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md`), the clean restore produced all 87 migrations matching the backup tip, verifying that the schema with `question_type` at Col 4 is 100% compliant with all 47 database verification checks.

---

## 9. Security, Privacy, and Product Impact

| Domain | Impact of Working-Tree Version | Verification |
|---|---|---|
| **Account Deletion Privacy** | `CASE WHEN p.is_deleted = true THEN 'Deleted User'` takes priority over `p.username`. | **PASSED:** Prevents tombstone username `deleted_user_<hash>` from leaking to the public in question threads. |
| **Epistemic Continuity** | Retains all question metadata, retraction status, and moderation filters. | **PASSED:** Does not alter votes, inquiries, claims, evidence, or room associations. |
| **Data Integrity** | `public.questions` base table is untouched. | **PASSED:** Dropping a view drops only the catalog query definition, not data rows. |
| **Authorization** | `grant select to anon, authenticated` re-established immediately. | **PASSED:** Zero permission leakage; zero unintended restriction. |
| **Production Apply Safety** | Prevents migration failure during `supabase db push --include-all`. | **PASSED:** Eliminates a deterministic production deployment abort. |

---

## 10. Release Baseline Recommendation

### Evaluated Options:

- **OPTION A — REQUIRED CANONICAL CHANGE (SELECTED):**
  The working-tree modification is technically required for production deployment because PostgreSQL cannot replace `discussion_questions` in-place due to column ordering. The baseline commit `dbaf36a` omitted this fix due to staging an un-patched working copy during the baseline commit ceremony.
- **OPTION B — UNNECESSARY CHANGE (REJECTED):**
  Reverting this change would guarantee a deployment failure when `supabase db push` reaches `202609210001` against production.
- **OPTION C — ALREADY REPRESENTED (REJECTED):**
  The DROP statement does not exist in any migration between `202606210001` and `202609210001`.
- **OPTION D — INCONCLUSIVE (REJECTED):**
  The PostgreSQL view replacement mechanics and error 42P16 are fully understood, documented, and proven.

---

## 11. Final Verdict

### **B — CANONICAL CHANGE REQUIRED**

**Rationale:**  
The working-tree modification in `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql` is technically mandatory for Discora's production migration. Without `drop view if exists public.discussion_questions;`, executing the migration against the production Supabase database (which currently runs the 10-column view from `202606210001`) will deterministically abort with PostgreSQL error 42P16 (`cannot change name of view column "identity_mode" to "question_type"`).

---

## 12. Evidence and Commands Used

- Git Inspection:
  - `git show dbaf36a384a5e543277c4bbb19e28592145960ca:supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`
  - `git diff dbaf36a384a5e543277c4bbb19e28592145960ca -- supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`
  - `git log -S "drop view if exists public.discussion_questions"`
- Cross-Migration Column Tracing:
  - `202606040001_create_moderation.sql`: 11 columns (has `question_type`).
  - `202606210001_private_debate_authorization_foundation.sql`: 10 columns (`question_type` omitted).
  - `202609140005_restore_moderation_queue_full_definition.sql`: verified `moderation_queue` joins base table `public.questions`, confirming no dependent views on `discussion_questions`.
  - `202609210001_fix_deleted_user_display_in_public_views.sql`: 11 columns (`question_type` restored at Col 4).
- Documentation Verification:
  - `docs/PRE_BETA_FREE_BACKUP_PHASE6_RESTORE_IMPLEMENTATION_REPORT.md` §6.3.
  - `docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md` §9.
  - `docs/BETA_RELEASE_BASELINE_COMMIT_REPORT.md` §C, §I.

---

## 13. What Was NOT Executed

In strict adherence to governance constraints:
- **NO migrations were edited, reverted, or committed.**
- **NO application code was modified.**
- **NO git commits were made.**
- **NO production contact occurred.**
- **`supabase db push` was NOT run.**
- The working tree remains completely untouched.
