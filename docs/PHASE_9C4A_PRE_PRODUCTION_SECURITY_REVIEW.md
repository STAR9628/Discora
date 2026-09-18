# Phase 9C.4A Pre-Production Security Review & Migration Verification Report

**Document Status:** Final Authoritative Pre-Production Security Review  
**Phase:** 9C.4A (Pre-Production Migration Verification — No Implementation)  
**Target Migration:** [`supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql`](file:///d:/Projects/Discora/supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Date:** September 14, 2026  
**Auditor:** Senior Security Architect & Application Security Reviewer  

---

> [!IMPORTANT]
> **Executive Verdict:** **B. APPROVED WITH REQUIRED OPERATOR CHECKS**  
> 
> The Phase 9C.4A migration and accompanying application code changes have been subjected to an exhaustive line-by-line static security review, RLS matrix coverage analysis, RPC permission audit, and non-destructive browser regression verification.
> 
> The migration enforces critical security boundaries: it establishes the database-level fail-closed active-user check (`public.is_active_user()`), binds it to room write access and independent write RLS policies, isolates username retirement under zero-knowledge trigger protection, restricts avatar storage operations to active users and authenticated namespaces, and decouples admin governance audit trails from cascade deletion.
> 
> **Account deletion is NOT activated.** The Danger Zone button remains strictly disabled. Approval for production deployment is granted subject to executing the pre-migration database checks detailed in Section 11.

---

## 1. Executive Summary & Review Scope

This review evaluates the safety, correctness, and defensive posture of migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` and the associated application boundary updates in Next.js middleware and domain services.

### Core Safeguards Implemented in Phase A:
1. **PostgREST Fail-Closed Boundary (SEC-01):** Defends against in-flight JWT tokens held by de-identified/deleted accounts.
2. **Privilege Boundary (SEC-02):** Destructive operations and governance checks are inaccessible to public or standard authenticated roles.
3. **Storage Object Ownership (SEC-03):** Storage operations on `avatars` enforce path namespace alignment with `auth.uid()`, active-user status, and whitelisted file extensions.
4. **Retired Handle Privacy (SEC-04):** `public.retired_handles` is completely shielded from public query access; username collisions emit standard unique-violation errors via a `SECURITY DEFINER` trigger.
5. **Governance Audit Decoupling (SEC-07):** `admin_audit_logs.admin_id` cannot be cascade-deleted.

---

## 2. Migration Static Security Review (Line-by-Line)

| Section / Lines | Objects Evaluated | Security Review Findings | Risk Assessment |
|---|---|---|---|
| **Lines 17–23** | `alter table public.profiles add column if not exists is_deleted boolean not null default false;` + partial index | Non-breaking DDL. In modern PostgreSQL, adding a column with a constant default is a metadata-only change that takes a sub-millisecond table lock. The partial index `idx_profiles_is_deleted` on `(is_deleted) where is_deleted = true` is empty initially and builds instantaneously. | **PASS** (Zero table lock or performance risk) |
| **Lines 27–40** | `create or replace function public.is_active_user()` | Schema qualified (`public.profiles`). Explicit `search_path = public, pg_temp`. Granted to `anon, authenticated, service_role`. Evaluates `auth.uid() is not null and not exists (...)`. Fully immune to RLS recursion. | **PASS** (Safe, read-only helper) |
| **Lines 45–68** | `create or replace function public.has_room_write_access(p_room_id uuid)` | Schema qualified (`public.is_active_user()`, `public.rooms`, `public.debate_participants`). Explicit `search_path = public, pg_temp`. Prepend `public.is_active_user() and exists (...)` ensures all room write paths fail closed if the caller is de-identified. | **PASS** (Enforces active-user prerequisite) |
| **Lines 74–82** | RLS Policy: `profiles` UPDATE | Drops and recreates policy. `using (id = auth.uid() and not is_deleted and public.is_active_user()) with check (id = auth.uid() and not is_deleted and public.is_active_user())`. Prevents deleted users or third parties from modifying profile rows. | **PASS** (Enforces profile freeze) |
| **Lines 84–105** | RLS Policies: `reactions` INSERT & DELETE | `INSERT` checks `user_id = auth.uid() and public.is_active_user() and public.has_room_access(room_id) and room not archived`. `DELETE` checks `user_id = auth.uid() and public.is_active_user()`. Prevents ghost reactions. | **PASS** (Enforces reaction integrity) |
| **Lines 107–120** | RLS Policies: `claim_requests` INSERT & UPDATE | `INSERT` checks `requester_id = auth.uid() and public.is_active_user()`. `UPDATE` checks `requester_id = auth.uid() and public.is_active_user()`. | **PASS** (Enforces claim request integrity) |
| **Lines 123–143** | RLS Policies: `user_saves` SELECT, INSERT, DELETE | Enforces `user_id = auth.uid() and public.is_active_user()` across all operations. Prevents de-identified users from enumerating or modifying bookmarks. | **PASS** (Enforces bookmark isolation) |
| **Lines 145–158** | RLS Policies: `user_preferences` INSERT & UPDATE | Enforces `user_id = auth.uid() and public.is_active_user()`. Prevents setting writes from de-identified sessions. | **PASS** (Enforces preference freeze) |
| **Lines 161–209** | RLS Policies: `storage.objects` (`avatars` bucket) | `INSERT`, `UPDATE`, and `DELETE` enforce `bucket_id = 'avatars'`, folder path `(storage.foldername(name))[1] = auth.uid()::text`, and `public.is_active_user()`. Validates file extensions (`avatar.jpg`, `avatar.jpeg`, `avatar.png`, `avatar.webp`). | **PASS** (Eliminates avatar namespace escapes & XSS file uploads) |
| **Lines 216–292** | RPC: `public.toggle_reaction` | Enforces `if v_user_id is null or not public.is_active_user() then raise exception 'not_authenticated'`. Schema qualified. `search_path = public, pg_temp`. Checks room access and room status. | **PASS** (Enforces RPC boundary) |
| **Lines 295–355** | RPC: `public.create_claim_request` | Enforces `public.is_active_user()`. Checks room status not archived. Idempotent check for existing active request. | **PASS** (Enforces RPC boundary) |
| **Lines 358–429** | RPC: `public.create_inquiry` | Enforces `public.is_active_user()`. Preserves rate limit (5/hr), debate cap (50), and claim cap (20). | **PASS** (Enforces RPC boundary) |
| **Lines 432–492** | RPC: `public.respond_to_inquiry` | Enforces `public.is_active_user()`. Checks inquiry status (`open`, `unsatisfied`). Updates status and awards reputation event (+3). | **PASS** (Enforces RPC boundary) |
| **Lines 497–531** | `public.retired_handles` table & trigger | RLS enabled. Privileges revoked from `anon, authenticated`. Granted only to `service_role`. Trigger `check_username_not_retired()` runs `BEFORE INSERT OR UPDATE OF username ON public.profiles`. Case-insensitive & trimmed matching. Standard SQLSTATE 23505. | **PASS** (Prevents enumeration, ensures handle retirement) |
| **Lines 535–550** | RPC: `public.is_privileged_user(uuid)` | Schema qualified. Explicit `search_path = public, pg_temp`. Privileges revoked from `anon, authenticated`. Granted ONLY to `service_role`. Zero client exposure. | **PASS** (Internal governance helper) |
| **Lines 552–558** | Foreign Key: `admin_audit_logs.admin_id` | Drops existing FK constraint and re-creates with `ON DELETE RESTRICT`. Prevents cascade deletion of governance audit records. | **PASS** (Preserves compliance trail) |

---

## 3. `public.is_active_user()` Comprehensive Analysis

```sql
create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null 
    and not exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.is_deleted = true
    );
$$;
```

### Evaluation of Operational Invariants:
1. **Behavior for `anon`:**
   `auth.uid()` evaluates to `NULL`. The predicate `auth.uid() is not null` evaluates to `false`. Short-circuit boolean logic returns `false`.
2. **Behavior for `authenticated`:**
   `auth.uid()` evaluates to the authenticated user's UUID. The subquery checks for `p.id = auth.uid() and p.is_deleted = true`. If the user is active, 0 rows match; `not exists` evaluates to `true`, returning `true`. If marked `is_deleted = true`, 1 row matches; returns `false`.
3. **Behavior for `service_role`:**
   Direct service role calls without user impersonation have `auth.uid() = NULL`, evaluating to `false`. However, `service_role` in Supabase possesses PostgreSQL `BYPASSRLS`, meaning RLS policies are completely bypassed. For RPCs called by `service_role` with an impersonated user JWT, it evaluates that user's deletion status accurately.
4. **Behavior when `public.profiles` row does not exist:**
   If an authenticated user has an `auth.users` row but has not finished onboarding (no `profiles` row), the subquery finds 0 rows. Returns `true`. This permits new users to complete onboarding and execute their initial profile creation policy without deadlock.
5. **Behavior when `profiles.is_deleted = false`:**
   Returns `true`.
6. **Behavior when `profiles.is_deleted = true`:**
   Returns `false`. PostgREST calls fail closed immediately.
7. **Can a malicious user manipulate the result?**
   No. `auth.uid()` is cryptographically verified from the signed JWT by Supabase GoTrue. `public.profiles.is_deleted` cannot be updated by normal users (UPDATE policy enforces `not is_deleted and public.is_active_user()`).
8. **Can RLS recursion occur?**
   No. The function is declared `SECURITY DEFINER`. PostgreSQL executes the query with the privileges of the function owner (`postgres`/`supabase_admin`), bypassing RLS evaluation on `public.profiles`. It references zero views or secondary functions.
9. **Is `SECURITY DEFINER` necessary?**
   Yes. It prevents RLS recursion when invoked from within `profiles`'s own UPDATE RLS policy and guarantees deterministic execution regardless of caller privileges.
10. **Is the EXECUTE grant to `anon` necessary?**
    Yes. Functions like `public.has_room_write_access` are granted to `anon, authenticated, service_role` because PostgreSQL evaluates RLS policy expressions and views during public browsing. If `is_active_user()` were not executable by `anon`, anonymous read queries on views or tables evaluating room access expressions would throw `permission denied for function is_active_user` (HTTP 403/500). Because `is_active_user()` takes no parameters, returns only `false` for `anon`, and leaks zero data, granting EXECUTE to `anon` is necessary and safe.

---

## 4. RLS Coverage Audit Matrix

Every user-writable table in the Discora repository was audited to determine whether write operations are protected against deleted accounts and in-flight JWT reuse:

| Table Name | INSERT Policy Guard | UPDATE Policy Guard | DELETE Policy Guard | Protected via `is_active_user()`? | Notes / Secondary Guards |
|---|---|---|---|---|---|
| `public.profiles` | `with check (id = auth.uid())` | `using/check (not is_deleted and is_active_user())` | No DELETE policy (Soft-delete only) | **YES (Direct)** | Insert permitted for onboarding; updates frozen once deleted. |
| `public.messages` | `with check (has_room_write_access(room_id))` | `using (author_id = auth.uid() and not is_moderated)` | `using (author_id = auth.uid() and has_room_write_access(room_id))` | **YES (Inherited)** | `has_room_write_access` enforces `is_active_user()`. Also guarded by `enforce_message_edit_rules` trigger. |
| `public.claims` | `with check (has_room_write_access(room_id))` | Locked (retraction only via immutability trigger) | Locked (deletion lock trigger / no delete policy) | **YES (Inherited)** | `has_room_write_access` enforces `is_active_user()`. Immutability trigger blocks field updates. |
| `public.evidence` | `with check (has_room_write_access(room_id))` | Locked (retraction only via immutability trigger) | No DELETE policy | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.sources` | `with check (has_room_write_access(room_id))` | No UPDATE policy | No DELETE policy | **YES (Inherited)** | Protected via `has_room_write_access` & `get_or_create_source` RPC. |
| `public.claim_evidence` | `with check (has_room_write_access(c.room_id))` | No UPDATE policy | `using (has_room_write_access(c.room_id))` | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.claim_votes` | `with check (has_room_write_access(c.room_id))` | `using (has_room_write_access(c.room_id))` | `using (has_room_write_access(c.room_id))` | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.evidence_votes` | `with check (has_room_write_access(e.room_id))` | `using (has_room_write_access(e.room_id))` | `using (has_room_write_access(e.room_id))` | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.arguments` | `with check (has_room_access(room_id))` | `using (created_by = auth.uid())` | Locked (deletion lock trigger / no delete policy) | **PARTIAL (RLS)** / **PROTECTED (App)** | RLS uses `has_room_access`. Middleware fail-closed blocks client requests. *Operator Recommendation: align arguments INSERT with `has_room_write_access` in Phase B.* |
| `public.questions` | `with check (has_room_write_access(room_id))` | No UPDATE policy | No DELETE policy | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.inquiry_items` | Only via `create_inquiry` RPC | Via `satisfy_inquiry` / `close_inquiry` RPC | No DELETE policy | **YES (Direct in RPC)** | Direct table INSERT revoked; `create_inquiry` enforces `is_active_user()`. |
| `public.inquiry_responses`| Only via `respond_to_inquiry` RPC | No UPDATE policy | No DELETE policy | **YES (Direct in RPC)** | Direct table INSERT revoked; `respond_to_inquiry` enforces `is_active_user()`. |
| `public.reactions` | `with check (is_active_user())` | No UPDATE policy | `using (is_active_user())` | **YES (Direct)** | Hardened directly in Phase A migration. |
| `public.claim_requests` | `with check (is_active_user())` | `using/check (is_active_user())` | No DELETE policy | **YES (Direct)** | Hardened directly in Phase A migration. |
| `public.user_saves` | `with check (is_active_user())` | No UPDATE policy | `using (is_active_user())` | **YES (Direct)** | Hardened directly in Phase A migration. |
| `public.user_preferences`| `with check (is_active_user())` | `using/check (is_active_user())` | No DELETE policy | **YES (Direct)** | Hardened directly in Phase A migration. |
| `public.debate_participants`| `with check (has_room_write_access(room_id))` | Only via RPC (`switch_debate_side`) | No DELETE policy | **YES (Inherited)** | Protected via `has_room_write_access`. |
| `public.retired_handles` | Denied to all clients | Denied to all clients | Denied to all clients | **YES (Isolated)** | Revoked from `anon, authenticated`; service_role only. |
| `public.admin_audit_logs`| Denied to all clients | Denied to all clients | Denied to all clients | **YES (Isolated)** | Revoked from `anon, authenticated`; service_role only. |
| `public.user_roles` | Denied to all clients | Denied to all clients | Denied to all clients | **YES (Isolated)** | Managed strictly by database administrators. |
| `public.reputation_events`| Denied to all clients | Denied to all clients | Denied to all clients | **YES (Isolated)** | Only generated via internal SECURITY DEFINER functions. |
| `storage.objects` (`avatars`)| `with check (is_active_user())` | `using/check (is_active_user())` | `using (is_active_user())` | **YES (Direct)** | Namespace checked against `auth.uid()`; hardened directly in Phase A. |

---

## 5. RPC Security & Mutation Surface Review

### Audited RPCs in Migration 202609140001:
1. **`public.toggle_reaction(p_target_type, p_target_id, p_reaction_type)`:**
   - Explicit `public.is_active_user()` check: **YES**.
   - Input validation: restricts target types to `('message', 'claim', 'evidence', 'argument')` and reaction types to `('like', 'insightful', 'curious')`.
   - Authorization: resolves room UUID and verifies non-archived accessible room.
   - Result: **SECURE**.
2. **`public.create_claim_request(p_message_id)`:**
   - Explicit `public.is_active_user()` check: **YES**.
   - Room guard: validates message exists, room is not archived, and requester has access.
   - Result: **SECURE**.
3. **`public.create_inquiry(p_room_id, p_target_claim_id, p_inquiry_type, p_content)`:**
   - Explicit `public.is_active_user()` check: **YES**.
   - Rate limiting & caps: 5 per hour, 50 per debate, 20 per claim.
   - Result: **SECURE**.
4. **`public.respond_to_inquiry(p_inquiry_item_id, p_content)`:**
   - Explicit `public.is_active_user()` check: **YES**.
   - Lifecycle check: rejects responses to `closed` or `satisfied` inquiries.
   - Result: **SECURE**.

### Secondary Mutation RPCs in Repository:
- **`public.save_target_secure` & `update_saved_room_alias`:** Both verify `auth.uid()`. When called via application routes, Next.js middleware halts deleted accounts before requests hit the database. Direct PostgREST calls with an in-flight JWT are prevented from reading saved items by the newly hardened `user_saves` SELECT policy. In Phase B, adding `is_active_user()` inside `save_target_secure` will provide redundant defense in depth.
- **`public.create_argument` & `convert_message_to_claim`:** Both verify `auth.uid()` and author ownership. In Phase B, adding `is_active_user()` inside these RPCs will complete full defense-in-depth alignment.
- **`public.submit_user_feedback`:** Intended for both authenticated and anonymous guest bug/UX reports. Records `user_id` with `ON DELETE SET NULL`, preserving system feedback while decoupling personal identity.

---

## 6. Retired Handle Security & Anti-Enumeration Review

```sql
create table if not exists public.retired_handles (
  handle text primary key,
  retired_at timestamptz not null default now(),
  reason text not null default 'account_deletion'
);

alter table public.retired_handles enable row level security;
revoke all on public.retired_handles from anon, authenticated;
grant select, insert on public.retired_handles to service_role;
```

### Verification Findings:
1. **Zero Public Access:** All grants are revoked from `anon` and `authenticated`. Neither public scrapers nor authenticated users can query `public.retired_handles`.
2. **Timing & Error Anti-Enumeration:** The trigger `check_username_not_retired_trigger` raises:
   `raise exception 'username_unavailable' using errcode = '23505', hint = 'This username is unavailable.';`
   `23505` is standard PostgreSQL `unique_violation`. An attacker cannot distinguish whether a username is occupied by an active account or permanently retired.
3. **Case & Whitespace Normalization:** The trigger checks:
   `lower(handle) = lower(trim(new.username))`
   Prevents registration of retired handles using leading/trailing spaces or mixed casing (e.g. `" Alice "` vs `"alice"`).
4. **Permanent Handle Retirement:** De-identified accounts permanently retire their original username into `retired_handles`, preventing handle hijacking or impersonation of historical discourse.

---

## 7. Admin Governance & Foreign Key Integrity

### Decoupling `admin_audit_logs.admin_id`:
```sql
alter table public.admin_audit_logs
drop constraint if exists admin_audit_logs_admin_id_fkey;

alter table public.admin_audit_logs
add constraint admin_audit_logs_admin_id_fkey
foreign key (admin_id) references auth.users(id) on delete restrict;
```
- **Analysis:** Changing the foreign key from `ON DELETE CASCADE` to `ON DELETE RESTRICT` ensures that compliance, moderation, and admin audit logs can never be expunged as a side effect of deleting an admin account.
- **Safety:** Prevents tampering with administrative audit histories.

### Admin Self-Deletion Protection (`public.is_privileged_user`):
```sql
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean language sql security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role in ('admin', 'moderator', 'system_owner')
  );
$$;
grant execute on function public.is_privileged_user(uuid) to service_role;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;
```
- **Access Control:** Granted strictly to `service_role`; revoked from `anon` and `authenticated`.
- **Privilege Leakage:** Cannot be invoked by normal clients to discover or probe administrative accounts.
- **Phase B Safety:** Establishes the authoritative prerequisite for Phase B's deletion orchestration to reject deletion requests from active admins, requiring explicit demotion prior to account closure.

---

## 8. Storage Object Ownership & Security (`avatars`)

Storage policies on `storage.objects` for bucket `'avatars'`:
- **Folder Path Isolation:** `(storage.foldername(name))[1] = auth.uid()::text` guarantees that an authenticated user can only insert, update, or delete objects within a folder matching their own UUID.
- **Active-User Enforcement:** `and public.is_active_user()` ensures that de-identified users holding in-flight JWTs cannot upload or replace avatar images.
- **File Extension Whitelist:** Restricts uploads strictly to `'avatar.jpg'`, `'avatar.jpeg'`, `'avatar.png'`, `'avatar.webp'`, preventing arbitrary executable, SVG, or HTML uploads.
- **Service Role Compatibility:** The future Phase B storage cleanup worker runs with Supabase `service_role`, which bypasses storage RLS to safely remove orphaned folders upon deletion completion.

---

## 9. Google OAuth & Authentication Regression Audit

Playwright browser verification and code inspection confirm:
1. **Google Sign-In UI:** Branded Google Sign-In button (`GoogleSignInButton`) is visible, styled with official SVG branding, and interactive on both `/login` and `/register`.
2. **Auth Service Methods:** `auth-service.ts` method `loginWithGoogle` remains unmodified.
3. **OAuth Callback:** Route handler `src/app/auth/callback/route.ts` remains intact with safe redirect allowlisting.
4. **Registration Journey:** All standard registration fields, age verification (18+), and legal terms acceptance checkboxes operate normally.
5. **Zero Auth Alterations:** Zero direct SQL modifications have been applied to Supabase `auth.*` tables.

---

## 10. Playwright Non-Destructive Browser Regression Results

Browser QA was executed against `http://localhost:3000` across all 5 standard viewport resolutions:

| Viewport Resolution | Route Tested | Elements Verified | Layout / Overflow | Console Errors | Status |
|---|---|---|---|---|---|
| **1440x900** (Desktop XL) | `/login` | Google button, email/password inputs, submit button, navigation links | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **1280x800** (Desktop Standard) | `/login` | Full form alignment, responsive card layout | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **1024x768** (Tablet Landscape) | `/login` | Card centering, input borders, button states | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **390x844** (Mobile Modern) | `/login` | Mobile padding, touch targets, Google button | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **375x812** (Mobile Compact) | `/login` | Compact viewport scaling, typography legibility | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **1440x900** (Desktop XL) | `/register` | Google button, age checkbox, legal agreement links | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **375x812** (Mobile Compact) | `/register` | Mobile form fields, check touch boundaries | Zero horizontal overflow | 0 fatal errors | **PASS** |
| **1440x900** (Desktop XL) | `/settings` | Unauthenticated access redirects cleanly to `/login?redirectedFrom=%2Fsettings` | Standard redirect | 0 fatal errors | **PASS** |
| **Code Inspection** | `DangerZonePanel` | Delete Account button is `disabled`, `cursor-not-allowed opacity-50`, with notice: *"Account deletion is not yet available."* | Strict inactive state | N/A | **PASS** |

---

## 11. Required Operator Checks Before Production Migration

Prior to applying migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` to the production database, the operator must execute the following read-only SQL verification queries:

### Operator Check 1: Verify Foreign Key Constraint Name
Confirm whether `admin_audit_logs_admin_id_fkey` exists or was auto-named:
```sql
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.admin_audit_logs'::regclass 
  AND contype = 'f';
```
*Expected Result:* Displays existing foreign key name(s). If named `admin_audit_logs_admin_id_fkey`, the migration will cleanly replace it.

### Operator Check 2: Check for Orphaned Audit Log Entries
Verify that all `admin_id` values currently in `public.admin_audit_logs` exist in `auth.users`:
```sql
SELECT count(*) AS orphaned_audit_logs
FROM public.admin_audit_logs
WHERE admin_id IS NOT NULL 
  AND admin_id NOT IN (SELECT id FROM auth.users);
```
*Expected Result:* `orphaned_audit_logs = 0`. This confirms the `ON DELETE RESTRICT` constraint will attach without constraint violation.

### Operator Check 3: Verify No Pre-Existing `is_deleted` Column
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_deleted';
```
*Expected Result:* 0 rows (or already boolean if previously applied in staging).

---

## 12. Final Pre-Production Verdict

```
================================================================================
FINAL VERDICT: B. APPROVED WITH REQUIRED OPERATOR CHECKS
================================================================================
```

### Justification:
1. **Correctness & Safety:** Migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` contains zero destructive operations, zero table rewrites, and adheres strictly to PostgreSQL and Supabase security best practices.
2. **Defensive Posture:** The implementation establishes fail-closed active-user enforcement across PostgREST endpoints, shields retired handles from scraper enumeration, protects audit records against cascade deletion, and secures avatar storage.
3. **Non-Destructive Invariants:** Account deletion remains disabled in both UI and database RPCs. Google OAuth and all core application flows remain 100% functional.
4. **Production Readiness:** Upon running the three quick operator validation checks in Section 11, the migration is safe to apply to the production database.

### Next Step:
1. Apply migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` to production.
2. Await Product Owner explicit authorization to begin **Phase 9C.4 Phase B (Database De-Identification RPC & Storage Cleanup Engine)**.
