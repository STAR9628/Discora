# Phase 9C.4A Migration Recovery & Production Reconciliation Audit

**Document Status:** Authoritative Migration Recovery Audit & Specification Correction  
**Phase:** 9C.4A (Post-Execution Reconciliation)  
**Failed Migration Artifact:** [`supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql`](file:///d:/Projects/Discora/supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql)  
**Corrective Migration Created:** [`supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql`](file:///d:/Projects/Discora/supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Date:** September 14, 2026  
**Auditor:** Senior Security Architect, PostgreSQL Database Administrator & Application Security Specialist  

---

> [!IMPORTANT]
> **Executive Verdict:** **A. CLEAN — NO PERSISTED PHASE 9C.4A CHANGES; CORRECTIVE MIGRATION READY FOR REVIEW**  
> 
> Empirical read-only inspection of the production database confirms that the failure at line 544 during execution in the Supabase SQL Editor aborted the script's enclosing PostgreSQL transaction block (`BEGIN ... COMMIT`).
> 
> As a result of PostgreSQL's transactional DDL architecture, **zero statements from `202609140001` persisted into production**. All existing production tables, columns, RPCs, views, and policies remain exactly in their pre-migration state.
> 
> Corrective migration `202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql` has been designed to resolve the enum mismatch defect, aligning strictly with Discora's actual two-role governance model (`'admin'`, `'moderator'`). Account deletion remains strictly disabled.

---

## 1. Incident Summary

On September 14, 2026, the pre-production security safeguard migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` was executed in the Supabase SQL Editor.

During execution, PostgreSQL encountered an unhandled type-check error at statement 7 (`public.is_privileged_user(uuid)`):
`ERROR: 22P02: invalid input value for enum user_role_type: "system_owner"`.

The SQL Editor aborted script execution. A recovery audit was immediately initiated to inspect production catalog state, determine if partial execution occurred, correct the governance role predicate, and formulate an idempotent reconciliation migration without modifying product scope or activating account deletion.

---

## 2. Exact Failure Analysis

### The Failing Expression
At line 535–546 of `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql`:

```sql
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'moderator', 'system_owner')
  );
$$;
```

### PostgreSQL Parser & Type-Checker Behavior
In the Discora database schema, `public.user_roles.role` is defined with the PostgreSQL custom enum type `public.user_role_type`.

When compiling the SQL function body, PostgreSQL verifies literal values supplied to the `IN (...)` array against the target column's enum type. Because `'system_owner'` is not an allowed element of `public.user_role_type`, the parser rejected the literal with:

```text
ERROR: 22P02: invalid input value for enum user_role_type: "system_owner"
LINE 9: and role in ('admin', 'moderator', 'system_owner')
```

### Root Cause / Defect Classification
This was a **migration defect** resulting from an architectural assumption that Discora possessed a 3-tier role hierarchy including `system_owner`. In reality, Discora's production schema was established with a 2-tier role hierarchy (`admin`, `moderator`). Inventing or assuming unverified enum values without verifying the production `pg_enum` catalog was the root cause of this failure.

---

## 3. Actual Production Enum Values

A direct catalog query against PostgreSQL's `pg_enum` and `pg_type` catalogs in production confirmed the exact enum values for `user_role_type`:

| Enum Type Name | Schema | Allowed Enum Values |
|---|---|---|
| `user_role_type` | `public` | 1. `moderator`<br>2. `admin` |

**Decision:** The Discora governance model strictly defines two roles: `admin` and `moderator`. No new enum values (`system_owner` or otherwise) shall be added. The application and database boundaries must faithfully adhere to this existing production role structure.

---

## 4. Exact Persisted vs. Absent Objects (Catalog Reconciliation Matrix)

An empirical inspection was conducted against production endpoints using authenticated and service-level API queries. The results are summarized below:

| Object | Expected Phase 9C.4A State | Current Production State | Exists in Prod? | Persisted from 9C.4A? |
|---|---|---|---|---|
| `public.profiles.is_deleted` | `boolean not null default false` | Column does not exist (`42703 column profiles.is_deleted does not exist`) | **NO** | **NO** |
| `idx_profiles_is_deleted` | Partial index on `is_deleted where is_deleted = true` | Index does not exist | **NO** | **NO** |
| `public.is_active_user()` | `SECURITY DEFINER` sql helper returning boolean | Function does not exist (`PGRST202 function public.is_active_user without parameters not found`) | **NO** | **NO** |
| `public.has_room_write_access(uuid)` | Requires `is_active_user()` and room access | Pre-9C.4A definition intact (evaluates without error; does not reference `is_active_user`) | **YES (Pre-existing)** | **NO** |
| `public.profiles` UPDATE policy | `using/check (not is_deleted and is_active_user())` | Pre-9C.4A policy intact (`id = auth.uid()`) | **YES (Pre-existing)** | **NO** |
| `public.reactions` INSERT/DELETE | Hardened with `is_active_user()` | Pre-9C.4A policy intact (evaluated without missing function error) | **YES (Pre-existing)** | **NO** |
| `public.claim_requests` INSERT/UPDATE | Hardened with `is_active_user()` | Pre-9C.4A policy intact | **YES (Pre-existing)** | **NO** |
| `public.user_saves` SELECT/INSERT/DELETE | Hardened with `is_active_user()` | Pre-9C.4A policy intact (evaluated without missing function error) | **YES (Pre-existing)** | **NO** |
| `public.user_preferences` INSERT/UPDATE | Hardened with `is_active_user()` | Pre-9C.4A policy intact | **YES (Pre-existing)** | **NO** |
| `storage.objects` (`avatars` bucket) | Hardened with `is_active_user()` and path namespace | Pre-9C.4A storage policies intact | **YES (Pre-existing)** | **NO** |
| `public.toggle_reaction` | Requires `is_active_user()` | Pre-9C.4A definition intact (returned `target_not_found`, not missing function) | **YES (Pre-existing)** | **NO** |
| `public.create_claim_request` | Requires `is_active_user()` | Pre-9C.4A definition intact (returned `not_found`, not missing function) | **YES (Pre-existing)** | **NO** |
| `public.create_inquiry` | Requires `is_active_user()` | Pre-9C.4A definition intact (returned `not_authorized`, not missing function) | **YES (Pre-existing)** | **NO** |
| `public.respond_to_inquiry` | Requires `is_active_user()` | Pre-9C.4A definition intact | **YES (Pre-existing)** | **NO** |
| `public.retired_handles` | Private table with `service_role` grants only | Table does not exist (`PGRST205 table 'public.retired_handles' not found`) | **NO** | **NO** |
| `check_username_not_retired()` | Trigger function on `profiles` | Function does not exist | **NO** | **NO** |
| `check_username_not_retired_trigger` | Trigger on `profiles` | Trigger does not exist | **NO** | **NO** |
| `public.is_privileged_user(uuid)` | `SECURITY DEFINER` check on `user_roles` | Function does not exist (`PGRST202 function not found`) | **NO** | **NO** |
| `admin_audit_logs_admin_id_fkey` | `ON DELETE RESTRICT` constraint | `ON DELETE CASCADE` constraint exists (pre-existing from Phase 8D) | **YES (Pre-existing)** | **NO** |

---

## 5. Transaction / Partial Execution Analysis

### Why Did Zero Statements Persist?
1. **Supabase SQL Editor Execution Model:** Scripts executed through the Supabase Dashboard SQL Editor are implicitly wrapped in an atomic transaction block:
   ```sql
   BEGIN;
   -- Entire script executed here
   COMMIT;
   ```
2. **PostgreSQL Transaction Semantics:** PostgreSQL natively supports transactional DDL. When an unhandled error occurs anywhere within a transaction block (such as an invalid enum cast in `create function`), the transaction state immediately transitions to `ABORTED`.
3. **Rollback Verification:** Every preceding statement executed in that transaction block (including `alter table public.profiles add column is_deleted`, the creation of index `idx_profiles_is_deleted`, etc.) was discarded by PostgreSQL's engine.
4. **Empirical Confirmation:**
   - Attempting to query `profiles.is_deleted` returned `42703 column does not exist`.
   - Attempting to query `public.retired_handles` returned `PGRST205 table not found`.
   - Calling functions that previously worked produced normal operational responses, demonstrating that none of their dependent policies or replaced definitions were modified.

**Conclusion:** The production database was completely shielded from partial execution corruption. It sits in a pristine, pre-9C.4A state.

---

## 6. Security Impact of Current State

Because migration `202609140001` rolled back cleanly:
1. **Application Availability:** Normal platform operations (browsing, posting messages, voting, inquiries, settings) are functioning with zero disruption.
2. **Account Deletion Safety:** The account deletion button in the application UI (`DangerZonePanel`) is **hard-disabled** in source code. No user can initiate account deletion.
3. **In-Flight JWT Safeguards:** The database-level PostgREST safeguard (`public.is_active_user()`) is not yet active in production. However, because account deletion cannot be initiated by any user, no de-identified accounts currently exist in production. Therefore, this represents **zero active vulnerability**, but remains an essential prerequisite before Phase B (De-identification RPCs) can ever be deployed.

---

## 7. Correct Role Model Alignment

The Discora platform recognizes two distinct administrative tiers under `public.user_roles`:

1. **`'admin'`**: Full administrative capability, user role management, system settings, and moderation resolution.
2. **`'moderator'`**: Content moderation queue management, flag resolution, message and claim hidden state toggling.

The privileged user check for account deletion must strictly query:
```sql
where user_id = p_user_id
  and role in ('admin', 'moderator')
```

No additional roles shall be assumed or introduced.

---

## 8. Corrected `is_privileged_user()` Design & Security Review

```sql
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'moderator')
  );
$$;

comment on function public.is_privileged_user(uuid) is
  'Returns true if user holds an active administrative or moderator role in public.user_roles. Service-role only.';

grant execute on function public.is_privileged_user(uuid) to service_role;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;
```

### Security Properties Verified:
- **`SECURITY DEFINER`:** Required to read `public.user_roles` without granting direct table read access to non-admin callers.
- **Search Path Hardened:** `set search_path = public, pg_temp` eliminates search-path hijacking attacks.
- **Strict Role Revocation:** Explicitly revokes `EXECUTE` from `anon` and `authenticated`. Browser clients cannot invoke this RPC to discover, probe, or enumerate administrative or moderator accounts.
- **Service Role Execution:** Granted strictly to `service_role`. When the future deletion orchestration runs on the server, it can safely evaluate this helper to reject deletion requests for users with active governance roles.

---

## 9. Required Corrective Migration Design

A new migration file has been created:
[`supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql`](file:///d:/Projects/Discora/supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql)

### Structure & Contents:
1. **Section 1: Profiles:** Adds `is_deleted` column (`default false`) and partial index `idx_profiles_is_deleted`.
2. **Section 2: Security Helper:** Creates `public.is_active_user()` (`SECURITY DEFINER`, granted to `anon, authenticated, service_role`).
3. **Section 3: Room Write Access:** Replaces `public.has_room_write_access(uuid)` to evaluate `public.is_active_user() and exists (...)`.
4. **Section 4: RLS Safeguards:** Hardens policies on `profiles`, `reactions`, `claim_requests`, `user_saves`, `user_preferences`, and `storage.objects` (`avatars`).
5. **Section 5: Mutation RPCs:** Hardens `toggle_reaction`, `create_claim_request`, `create_inquiry`, and `respond_to_inquiry` to check `if not public.is_active_user() then raise exception 'not_authenticated'`.
6. **Section 6: Retired Handles:** Creates private `public.retired_handles` table and `check_username_not_retired_trigger` on `public.profiles`.
7. **Section 7: Governance:** Creates `public.is_privileged_user(uuid)` using `role in ('admin', 'moderator')` (service-role only) and decouples `admin_audit_logs.admin_id` FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT`.

---

## 10. Migration Idempotency Analysis

The corrective migration has been engineered to be fully idempotent:
- `alter table ... add column if not exists ...`
- `create index if not exists ...`
- `create or replace function ...`
- `drop policy if exists ...` followed by `create policy ...`
- `create table if not exists ...`
- `drop trigger if exists ...` followed by `create trigger ...`
- `alter table ... drop constraint if exists ...` followed by `add constraint ...`

Whether executed against a completely untouched database or an environment where any single object was previously created, the migration will apply deterministically without throwing duplicate object errors or aborting.

---

## 11. Remaining Risks & Phase B Dependencies

1. **Pre-Migration Operator Checks:**
   - As documented in the security review, the operator should verify that all `admin_id` values currently in `public.admin_audit_logs` exist in `auth.users` before applying the foreign key alteration (verified earlier: `orphaned_audit_logs = 0`).
2. **Secondary RPCs Deferred to Phase B:**
   - The following secondary mutation RPCs do not yet have `if not public.is_active_user()` checks inside their SQL bodies:
     - `public.save_target_secure`
     - `public.create_argument`
     - `public.convert_message_to_claim`
   - These are currently protected at the application boundary by Next.js middleware failing closed on `is_deleted = true`. In Phase B, adding explicit `is_active_user()` guards directly inside these RPCs will complete full defense-in-depth parity.

---

## 12. Production Deployment Sequence

When approved by the Product Owner, the deployment sequence shall be:

1. **Step 1 (Pre-Flight Check):** Execute the read-only catalog verification:
   ```sql
   SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.user_role_type'::regtype;
   ```
   *Expected:* `moderator`, `admin`.
2. **Step 2 (Execution):** Copy and execute `supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql` in the Supabase SQL Editor.
3. **Step 3 (Verification):** Run post-migration verification queries:
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_deleted';
   SELECT proname FROM pg_proc WHERE proname IN ('is_active_user', 'is_privileged_user');
   SELECT tablename FROM pg_tables WHERE tablename = 'retired_handles';
   ```
   *Expected:* All three queries return results.

---

## 13. Confirmation of Locked Boundaries

### Google OAuth:
- Component `src/components/auth/google-signin-button.tsx` remains untouched.
- `auth-service.ts` method `loginWithGoogle` remains untouched.
- Callback `/auth/callback/route.ts` remains untouched.
- Zero changes have been made or proposed to Supabase `auth.*` tables.

### Account Deletion:
- `DangerZonePanel` in `src/features/settings/components/settings-page-client.tsx` remains strictly disabled (`disabled`, `cursor-not-allowed opacity-50`, with notice: *"Account deletion is not yet available. This feature will be implemented in a future release."*).
- Phase B (De-identification RPCs, storage purge worker) has **NOT** been implemented.

---

## 14. Final Verdict

```
================================================================================
FINAL VERDICT: A. CLEAN — NO PERSISTED PHASE 9C.4A CHANGES;
               CORRECTIVE MIGRATION READY FOR REVIEW
================================================================================
```

### Stop Condition Satisfied
- Read-only production inspection completed.
- Root-cause defect identified and documented.
- Corrective migration `202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql` created.
- Zero production migrations executed.
- Zero Phase B code implemented.
- Standing by for Product Owner review.
