# Phase 9C.4A Corrective Migration Final Security Review

**Document Status:** Final Read-Only Security & Migration Review (No Production Write)
**Migration Under Review:** `supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql`
**Historical Defective Migration (NOT rewritten):** `supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql`
**Target Repository:** Discora (`STAR9628/Discora`)
**Date:** September 14, 2026
**Reviewer:** OpenCode (post-Antigravity handoff)
**Mode:** READ-ONLY. No production execution. No Phase 9C.4B. No account-deletion activation. No Google OAuth change. No product-behavior change. No production-database alteration.

> **Executive verdict: C. BLOCKED — MIGRATION CORRECTION REQUIRED**
>
> The corrective migration correctly fixes the `system_owner` enum defect that killed `202609140001`, and its security architecture (fail-closed `is_active_user()`, private `retired_handles`, `service_role`-only `is_privileged_user()`, `admin_audit_logs` RESTRICT decoupling, avatar namespace hardening) remains sound in design. However, static review against the actual migration history found that `202609140002` renames several RLS policies instead of replacing them in place. Because PostgreSQL RLS combines multiple permissive policies with OR semantics, the pre-existing permissive policies would remain active alongside the new hardened ones, defeating the fail-closed intent for deleted users holding in-flight JWTs. Two further contract breaks were found: `toggle_reaction` changes its return type from `boolean` to `jsonb` (breaking the existing TypeScript client), and `create_claim_request` drops validation guards present in production. These must be corrected in a new revision before production execution. No production write was performed in this review.

---

## 1. Executive Verdict

**C. BLOCKED — MIGRATION CORRECTION REQUIRED**

Rationale:

1. **Design is correct; naming is not.** `202609140002` faithfully carries forward the approved Phase 9C.4A security design and correctly restricts `is_privileged_user()` to `role IN ('admin', 'moderator')`. The blockers are mechanical, not architectural.
2. **Fail-closed intent is defeated by orphaned permissive policies.** At least six `DROP POLICY IF EXISTS` statements reference policy names that do not exist in production history, so the old permissive policies survive and RLS OR-semantics keep the permissive path open (CRITICAL).
3. **Client contract break.** `toggle_reaction` return type changes `boolean → jsonb` while `src/features/discussions/services/discussion-service.ts:1308-1326` (`toggleReaction`) still does `return data as boolean` (HIGH).
4. **Validation loosening.** `create_claim_request` in `202609140002` drops the `own_message`, `message_type`, and `converted_claim_id` guards present in the production foundation migration `202609090003_claim_requests_foundation.sql` (HIGH).
5. **No emergency.** Production remains in the clean pre-9C.4A state per the recovery audit; Danger Zone is hard-disabled in code; Google OAuth is untouched. There is no active vulnerability requiring a rushed apply. The correct action is a corrected revision, not execution of `202609140002` as written.

What this review is deciding (only): "Is `202609140002` technically safe and correctly scoped to execute against the known production schema?" Answer: **No — correction required as specified in Sections 20–22.** It is NOT deciding deletion policy legality, Beta readiness, new roles, OAuth changes, or Phase B scope.

---

## 2. Original Migration Incident

- On September 14, 2026, `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` was executed in the Supabase SQL Editor.
- It failed at `public.is_privileged_user(uuid)` (file lines 535–546) with `ERROR: 22P02 invalid input value for enum user_role_type: "system_owner"` because the predicate was `role in ('admin', 'moderator', 'system_owner')` while production `public.user_role_type` contains only `moderator` and `admin` (VERIFIED against `supabase/migrations/202606040001_create_moderation.sql:8` which creates the enum as `('moderator', 'admin')`, and against the recovery audit's production catalog inspection).
- Supabase SQL Editor wraps the script in an implicit transaction; PostgreSQL transactional DDL rolled back the whole block. The recovery audit empirically verified zero persisted Phase 9C.4A objects (see Section 3).
- Root cause classification: migration defect from an assumed third governance role. The handoff directive is explicit and correct: DO NOT add `system_owner`, DO NOT alter the enum, DO NOT invent a third governance role. `202609140002` obeys this (see Section 5).

Related records read for this review:

- `docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md` (authoritative Phase 9C.4 contract, 14 invariants, 8 phase gates)
- `docs/PHASE_9C4A_PRE_PRODUCTION_SECURITY_REVIEW.md` (verdict B on `202609140001`, pre-failure)
- `docs/PHASE_9C4A_MIGRATION_RECOVERY_AUDIT.md` (verdict A-clean, zero persisted changes, corrective design)
- `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/00_MASTER_CONTEXT.md`, `docs/01_PRD.md`, `docs/02_FEATURE_REGISTRY.md`, `docs/03_USER_FLOWS.md`, `docs/04_DATABASE_DESIGN.md`, `docs/05_SYSTEM_ARCHITECTURE.md`, `docs/07_API_DESIGN.md`, `docs/23_KNOWLEDGE_MODEL.md` (authority hierarchy; no conflicts found affecting this review — see Section 4)

---

## 3. Production State (as Established by Recovery Audit; Re-Verified Statically Here)

The recovery audit's catalog reconciliation matrix was cross-checked against migration history in this review. Findings are consistent; no contrary evidence was found in the repository:

| Object | Expected Phase 9C.4A state | Production state per recovery audit | Static re-verification in this review |
|---|---|---|---|
| `profiles.is_deleted` | `boolean NOT NULL DEFAULT false` | Absent (`42703`) | No earlier migration creates it (grep across `supabase/migrations` finds it only in `202609140001/2`) |
| `idx_profiles_is_deleted` | Partial index | Absent | Only in `202609140001/2` |
| `is_active_user()` | `SECURITY DEFINER` helper | Absent (`PGRST202`) | Only in `202609140001/2` |
| `has_room_write_access(uuid)` | Requires `is_active_user()` | Pre-9C.4A definition intact | Current definition traced to `202606220001_private_debate_phase4b_foundation.sql:69-92` (no `is_active_user()` reference) |
| `retired_handles` + trigger | Private table + trigger | Absent (`PGRST205`) | Only in `202609140001/2` |
| `is_privileged_user(uuid)` | `service_role`-only | Absent (`PGRST202`) | Only in `202609140001/2` |
| `admin_audit_logs_admin_id_fkey` | `ON DELETE RESTRICT` (post-9C.4A) | `ON DELETE CASCADE` (from `202609130001_admin_console_foundation.sql:9`) | VERIFIED: foundation creates `references auth.users(id) on delete cascade` |
| `user_role_type` enum | `moderator`, `admin` | `moderator`, `admin` | VERIFIED: `202606040001_create_moderation.sql:8` |
| Orphaned audit logs | `0` | `0` (earlier pre-flight) | Must be re-checked immediately before any future apply (Section 21) |

Conclusion: production remains in the clean pre-9C.4A state. Because account deletion cannot be initiated (Danger Zone hard-disabled, no deletion RPC exists), the absence of `is_active_user()` in production represents a missing prerequisite, not an active exploit window. This supports a BLOCKED verdict (fix calmly) rather than an emergency override.

---

## 4. Corrective Migration Review (Statement-by-Statement)

File: `supabase/migrations/202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql` (637 lines). Every statement was read. Comparison base: `202609140001` (557 lines) and the migration history cited below.

### Section 1 — `profiles.is_deleted` + partial index (lines 29–34)

```sql
alter table public.profiles add column if not exists is_deleted boolean not null default false;
create index if not exists idx_profiles_is_deleted on public.profiles(is_deleted) where is_deleted = true;
```

- Assessment: safe, idempotent, metadata-only DDL with constant default. Partial index is empty at creation. No table rewrite. **PASS.**

### Section 2 — `is_active_user()` (lines 39–55)

- `LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp`, schema-qualified `public.profiles`, grants to `anon, authenticated, service_role`. Detailed behavior analysis in Section 7. **Design PASS** (grant to `anon` is required and safe — see Section 7.10).

### Section 3 — `has_room_write_access(uuid)` (lines 60–83)

- Prepends `public.is_active_user() AND ...`. Schema-qualified, pinned `search_path`, grants to `anon, authenticated, service_role`.
- **Intentional delta vs `202609140001`:** the public-visibility branch changes from `(r.visibility = 'public')` to `(r.visibility = 'public' and auth.uid() is not null)`. Effect: `anon` callers now get `FALSE` instead of `TRUE` for public non-archived rooms. Since all write RLS policies using this helper are `TO authenticated`, the practical write path is unchanged for legitimate users, and the new behavior is strictly tighter for anonymous evaluation contexts (views, policy expressions). This is acceptable hardening, but it IS a behavior change versus `202609140001` and must be called out in release notes. **PASS WITH NOTE** (not a blocker).
- `search_path` changes from `public` (existing prod definition) to `public, pg_temp`. `pg_temp` inclusion is the standard Supabase pattern to neutralize temp-object shadowing; safe. **PASS.**

### Section 4 — RLS hardening (lines 90–263)

Intent is correct (add `is_active_user()` / `not is_deleted` to write policies; namespace + extension checks on `avatars`). **Execution is blocked by policy-name mismatches** — see Section 20, Blockers B1(a)–B1(f). Matching policies (`user_saves` ×3, `storage.objects` ×3, `claim_requests` INSERT) are correctly named. Non-matching policies create duplicates and leave old permissive policies live.

### Section 5 — RPC hardening (lines 270–567)

- All four RPCs (`toggle_reaction`, `create_claim_request`, `create_inquiry`, `respond_to_inquiry`) are `SECURITY DEFINER`, `SET search_path = public, pg_temp`, check `v_user_id is null or not public.is_active_user()`, and revoke `public, anon` before granting `authenticated`. Grant hygiene **PASS.**
- `toggle_reaction` return-type change and `create_claim_request` validation delta are blockers — see Section 20, B2/B3.
- `create_inquiry` rate limits (5/hr, 50/debate, 20/claim) and side default (`inquiry`) are preserved. `respond_to_inquiry` lifecycle guards (`satisfied`/`closed` rejection, `open`/`unsatisfied → responded`) are preserved. The `perform public.create_reputation_event(...)` call matches the pre-existing foundation behavior; dependency must exist at apply time (it does — `202606100004_create_reputation_events.sql:42`). **PASS WITH NOTE** (verify `create_reputation_event` grants remain internal; no change in this migration).

### Section 6 — `retired_handles` + trigger (lines 572–604)

- Table `IF NOT EXISTS`, RLS enabled, `REVOKE ALL ... FROM anon, authenticated`, `GRANT SELECT, INSERT ... TO service_role`. Trigger function `SECURITY DEFINER`, pinned `search_path`, normalized comparison `lower(handle) = lower(trim(new.username))`, standard `errcode 23505`. `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`. **Design PASS** with one MEDIUM privacy note (Section 20, F4): DB exception text for retired handles vs active-username unique violations may differ, so anti-enumeration ultimately depends on the application surfacing a single generic message. Do not rely on DB message indistinguishability alone.

### Section 7 — Governance (lines 612–637)

- `is_privileged_user(uuid)`: `role in ('admin', 'moderator')` — VERIFIED, no `system_owner` anywhere except historical comments. `GRANT ... TO service_role` + `REVOKE ... FROM anon, authenticated`. **PASS** (see Section 5 for grant-scope verification).
- `admin_audit_logs` FK: drops `admin_audit_logs_admin_id_fkey` if exists, re-adds `REFERENCES auth.users(id) ON DELETE RESTRICT`. Correct constraint, correct direction (CASCADE → RESTRICT), orphan count previously 0. **PASS subject to pre-flight re-check** (Section 21).

### Global statement hygiene

- No `auth.users` / `auth.identities` / OAuth / storage-bucket / provider mutation. No `DELETE`/`TRUNCATE` of user data. No deletion orchestration, no destructive RPC, no de-identification, no Danger Zone change. Google OAuth and deletion boundaries **PASS** (Sections 16–17).
- No privilege escalation, no excessive grants, no missing schema qualification in new code (all `public.`-qualified), no trigger recursion (single `BEFORE INSERT OR UPDATE OF username` trigger, no chained writes), no policy recursion (`is_active_user()` reads `profiles` as `SECURITY DEFINER`, bypassing RLS; zero view/function nesting).

---

## 5. Role-Model Verification

- `grep "system_owner"` across the repository: the ONLY occurrences of the literal in SQL are `202609140001:544` (defective) and historical comments in `202609140002:7,611` describing its removal. **The executable body of `202609140002` contains zero `system_owner` references.** VERIFIED.
- `202609140002` does NOT `CREATE`, `ALTER`, or touch `public.user_role_type`. VERIFIED (no `CREATE TYPE`, no `ALTER TYPE` in the file).
- Canonical enum definition: `supabase/migrations/202606040001_create_moderation.sql:5-11` creates `public.user_role_type AS ENUM ('moderator', 'admin')` guarded by a `pg_type` existence check. No later migration alters the enum (grep confirms). The only existing roles are `admin` and `moderator`. VERIFIED.
- `is_privileged_user()` body (lines 618–622): `role in ('admin', 'moderator')`. VERIFIED.
- EXECUTE grants on `is_privileged_user(uuid)` (lines 628–629): `GRANT ... TO service_role; REVOKE ... FROM anon, authenticated;`. Browser clients (`anon`, `authenticated`) cannot invoke it to probe administrative-role membership. `PUBLIC` residual: the file revokes from `anon, authenticated` but not explicitly from `PUBLIC`. This matches the existing repository pattern (e.g., `202606040001` revokes `user_roles` from `anon, authenticated`), and since `anon`/`authenticated` are the only PostgREST client roles, residual `PUBLIC` grant risk is negligible — but the correction revision should add `REVOKE ALL ON FUNCTION public.is_privileged_user(uuid) FROM PUBLIC;` for defense in depth (LOW, Section 20 F6).
- Pre-existing role helpers (`has_role_or_higher`, `has_current_user_role_or_higher`) are untouched by this migration. No conflict.

---

## 6. SECURITY DEFINER Review

| Function | `search_path` | Schema-qualified refs | User-controlled identifiers | Bypass/privilege notes | Verdict |
|---|---|---|---|---|---|
| `is_active_user()` | `public, pg_temp` (fixed) | Yes (`public.profiles`) | None (no params) | `SECURITY DEFINER` required to avoid RLS recursion when called from `profiles` UPDATE policy; bypasses RLS on `profiles` by design; returns 1-bit existence, no data leak | **PASS** |
| `is_privileged_user(uuid)` | `public, pg_temp` (fixed) | Yes (`public.user_roles`) | `p_user_id` is a typed `uuid` equality value, not an identifier; no dynamic SQL | `SECURITY DEFINER` required because `user_roles` denies direct reads to clients; `service_role`-only grant contains disclosure | **PASS** (add `FROM PUBLIC` revoke, LOW) |
| `check_username_not_retired()` (trigger) | `public, pg_temp` (fixed) | Yes (`public.retired_handles`) | `NEW.username` is a value compared with `lower(trim(...))`; no dynamic SQL | Runs in row trigger on `profiles`; `SECURITY DEFINER` required to read private `retired_handles`; single-row existence check; error message enumeration caveat (MEDIUM, F4) | **PASS WITH NOTE** |
| `has_room_write_access(uuid)` | `public, pg_temp` (fixed) | Yes (`public.is_active_user()`, `public.rooms`, `public.debate_participants`) | `p_room_id` typed `uuid` equality value; no dynamic SQL | Composition of `is_active_user()` + room predicates; grant includes `anon` (needed for policy-expression evaluation) but returns `FALSE` for anon now | **PASS** |
| `toggle_reaction`, `create_claim_request`, `create_inquiry`, `respond_to_inquiry` | `public, pg_temp` (fixed) | Yes (all table refs `public.*`) | Text params validated against allowlists; ids are typed `uuid`; no dynamic SQL / no `EXECUTE` | `SECURITY DEFINER` + explicit `is_active_user()` guard + room-access checks; grants revoked from `public, anon`, granted to `authenticated` | **PASS on privilege mechanics** (contract/validation blockers tracked separately, B2/B3) |

No search-path hijacking surface: every new `SECURITY DEFINER` function pins `search_path`, and every reference is schema-qualified. No function takes table/column identifiers. No `security_invoker` confusion (views are out of scope for this migration).

---

## 7. `is_active_user()` Analysis

```sql
select auth.uid() is not null
  and not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_deleted = true
  );
```

1. **anon:** `auth.uid()` is `NULL` → first conjunct `FALSE` → returns `FALSE`. No data access. VERIFIED by reading.
2. **authenticated active user:** `auth.uid()` = caller UUID; subquery finds 0 rows when `is_deleted = false` → `NOT EXISTS` = `TRUE` → returns `TRUE`. VERIFIED.
3. **authenticated deleted user:** subquery finds 1 row (`is_deleted = true`) → `NOT EXISTS` = `FALSE` → returns `FALSE`. All `AND`-composed RLS policies and RPC guards fail closed. This is the core in-flight-JWT protection and it is correctly formulated. VERIFIED.
4. **user without a `profiles` row (pre-onboarding):** subquery finds 0 rows → returns `TRUE` (provided `auth.uid()` non-null). This permits initial profile creation without deadlock. The `profiles` INSERT policy (`with check (id = auth.uid())`) is unchanged, so onboarding is not broken. Middleware (`src/services/supabase/middleware.ts:110-120`) redirects profile-less users to `/settings/profile`. Consistent. VERIFIED.
5. **`service_role`:** direct calls without impersonation have `auth.uid() = NULL` → `FALSE`; but `service_role` has `BYPASSRLS`, so RLS policies are bypassed regardless. For `service_role`+impersonated-JWT calls, it evaluates the impersonated user's deletion status. No privilege escalation: the function is read-only and leaks one bit. VERIFIED.
6. **malformed/nonexistent identity:** `auth.uid()` `NULL` or UUID with no matching profile row → `FALSE` (anon case) or `TRUE` (authenticated-but-profiless case, same as case 4). No exception, no leak. Fail-closed for the deleted marker; fail-open only for the never-onboarded case, which is required for onboarding. VERIFIED.
7. **RLS recursion:** none. `SECURITY DEFINER` executes as owner, bypassing RLS on `public.profiles`; body references a base table only. VERIFIED.
8. **Information leak:** returns boolean only. `anon` always `FALSE`. No profile content disclosed. VERIFIED.
9. **Denial of legitimate onboarding:** none (case 4). VERIFIED.
10. **Grant to `anon`:** necessary and safe. `has_room_write_access`/`has_room_access` are granted to `anon` and evaluated in read paths; without `EXECUTE` on `is_active_user()` those paths would raise `permission denied for function`. The function discloses nothing to `anon`. This matches the justification in the pre-production review and is accepted. VERIFIED.

---

## 8. RLS Coverage Matrix (Policies Changed by `202609140002`)

Legend: ✅ direct `is_active_user()` guard added by `202609140002` (as written) · ⚠️ intended but defeated by orphaned old policy · ➖ not touched by this migration (inherits via `has_room_write_access` or RPC).

| Table | Operation | Policy created by `202609140002` | `USING` / `WITH CHECK` (new) | Active-user enforced? | Ownership enforced? | Risk / notes |
|---|---|---|---|---|---|---|
| `profiles` | UPDATE | `Users can update own profile` ⚠️ | `id = auth.uid() AND not is_deleted AND is_active_user()` | Intended YES, actually **NO** — old `Users can update their own profile` (`202606030001`) survives (name mismatch) and stays permissive | Yes (`id = auth.uid()`) | **CRITICAL (B1a).** RLS OR-semantics keep old path open. |
| `reactions` | INSERT | `Authenticated users can insert reactions` ⚠️ | `user_id = auth.uid() AND is_active_user() AND has_room_access(room_id) AND room not archived` | Intended YES, actually **NO** — old `Authenticated users can create reactions` survives | Yes | **CRITICAL (B1b).** |
| `reactions` | DELETE | `Users can remove own reactions` ⚠️ | `user_id = auth.uid() AND is_active_user()` | Intended YES, actually **NO** — old `Users can delete their own reactions` survives | Yes | **CRITICAL (B1c).** |
| `claim_requests` | INSERT | `Authenticated users can create claim requests` ✅ | `requester_id = auth.uid() AND is_active_user()` | **YES** (name matches foundation `202609090003`) | Yes | PASS. Old policy correctly dropped. |
| `claim_requests` | UPDATE | `Users can update own pending claim requests` ⚠️ | `requester_id = auth.uid() AND status='pending' AND is_active_user()` (+ check) | Intended YES, actually **NO** — prod policy is `Requesters can update their own requests` (`202609090003:95-101`); old survives | Yes | **CRITICAL (B1d).** |
| `user_saves` | SELECT/INSERT/DELETE | Same 3 names as `202606260001` ✅ | `user_id = auth.uid() AND is_active_user()` | **YES** | Yes | PASS. |
| `user_preferences` | INSERT | `Users can insert own preferences` ⚠️ | `user_id = auth.uid() AND is_active_user()` | Intended YES, actually **NO** — prod is `Users can insert their own preferences` (`202606130001:72-77`) | Yes | **CRITICAL (B1e).** |
| `user_preferences` | UPDATE | `Users can update own preferences` ⚠️ | `user_id = auth.uid() AND is_active_user()` | Intended YES, actually **NO** — prod is `Users can update their own preferences` (`202606130001:79-85`) | Yes | **CRITICAL (B1f).** SELECT policy (`Users can view their own preferences`) is read-only and untouched — acceptable. |
| `storage.objects` (`avatars`) | INSERT/UPDATE/DELETE | Same 3 names as `202606030002` ✅ | `bucket_id='avatars' AND foldername(name)[1]=auth.uid()::text AND is_active_user()` (+ extension allowlist on INSERT/UPDATE check) | **YES** | Yes (UUID namespace) | PASS. |
| `messages` | INSERT/UPDATE/DELETE | ➖ (not in `202609140002`) | Existing `has_room_write_access(room_id)` gates | **YES (transitive)** once Section 3 applies | Yes | Transitive protection VERIFIED by reading helper composition. |
| `claims` | INSERT | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `evidence` | INSERT | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `sources` | INSERT | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `claim_evidence` | INSERT/DELETE | ➖ | `has_room_write_access` | **YES (transitive)** | Via room | Same. |
| `claim_votes` | ALL | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `evidence_votes` | ALL | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `questions` | INSERT | ➖ | `has_room_write_access` | **YES (transitive)** | Yes | Same. |
| `debate_participants` | INSERT | ➖ | `has_room_write_access` | **YES (transitive)** | Via room | Same. |
| `inquiry_items` / `inquiry_responses` | INSERT | ➖ direct table (RPC-only) | RPC `is_active_user()` guard | **YES (RPC)** | `created_by = auth.uid()` inside RPC | PASS. |
| `retired_handles` | ALL | ➖ (new table, locked) | No client access | **YES (isolated)** | N/A | PASS. |
| `admin_audit_logs` | ALL | ➖ (no client access) | Revoked from clients | **YES (isolated)** | N/A | PASS. |
| `user_roles` | ALL | ➖ | Revoked from clients | **YES (isolated)** | N/A | PASS. |
| `reputation_events` | ALL | ➖ | Internal only | **YES (isolated)** | N/A | PASS. |

Transitive protection claim was not assumed: `has_room_write_access` (Section 3) conjoins `is_active_user()` with the room predicates, and each listed table's policy gates writes on `has_room_write_access(room_id)`. That composition was read in both the helper and the pre-existing policies. Deferred defense-in-depth (`save_target_secure`, `create_argument`, `convert_message_to_claim` lacking an inner `is_active_user()` check) is acknowledged and correctly deferred to Phase B per the approved spec — application middleware (`src/services/supabase/middleware.ts:122-134`) already fail-closes deleted users at the route layer. NOT a blocker for 9C.4A.

---

## 9. RPC Security Review

### RPCs modified by `202609140002`

| RPC | `auth.uid()` | Active-user guard | Ownership / authorization | RLS interaction | Grants | Exception behavior | Verdict |
|---|---|---|---|---|---|---|---|
| `toggle_reaction` | `v_user_id := auth.uid()` | `if v_user_id is null or not is_active_user() then raise 'not_authenticated'` | Target resolved per-type; room must be non-archived + `has_room_access`; toggle scoped to `(user_id, target_type, target_id, reaction_type)` | `SECURITY DEFINER`; internal `insert/delete` on `reactions` bypass RLS by design; external callers still gated by RLS on direct table paths | `REVOKE FROM public, anon; GRANT TO authenticated` | Typed exceptions (`invalid_target_type`, `invalid_reaction_type`, `target_not_found`, `room_not_accessible`) | **Mechanics PASS; contract BLOCKED (B2)** — return type `jsonb` vs prod/client `boolean` |
| `create_claim_request` | Same guard | Same guard | Message must exist; room non-archived + `has_room_access`; idempotent pending lookup | Same | Same | `not_found`, `room_not_accessible` | **Mechanics PASS; validation BLOCKED (B3)** — dropped `own_message` / `message_type` / `converted_claim_id` guards |
| `create_inquiry` | Same guard | Same guard | Room non-archived + `has_room_access`; caps 5/hr, 50/debate, 20/claim; side default `inquiry` | Same | Same | `rate_limit`, `debate_cap`, `claim_cap`, `not_authorized` | **PASS** |
| `respond_to_inquiry` | Same guard | Same guard | Inquiry must exist, not `satisfied`/`closed`; room non-archived + `has_room_access`; status transition `open`/`unsatisfied → responded`; reputation event +3 | Same | Same | `not_found`, `cannot_respond`, `not_authorized` | **PASS** (reputation call matches foundation behavior) |

### Existing client-callable mutation RPCs (deferred)

`save_target_secure`, `create_argument`, `convert_message_to_claim` verify `auth.uid()` and ownership but lack an inner `is_active_user()` check. Status: **deferred to Phase B by approved design** (spec Section 9 matrix + pre-prod review Section 5). Middleware fail-closed coverage exists. Do NOT implement in this review; do NOT treat as a 9C.4A blocker. Recorded here so the Phase B scope is not lost.

---

## 10. Retired-Handle Review

- Table `public.retired_handles (handle text PK, retired_at timestamptz, reason text)`: `IF NOT EXISTS`, RLS enabled, `REVOKE ALL FROM anon, authenticated`, `GRANT SELECT, INSERT TO service_role`. Anon/authenticated cannot `SELECT` (enumeration blocked at privilege layer) and cannot `INSERT/UPDATE/DELETE`. **PASS.**
- Trigger `check_username_not_retired_trigger` (`BEFORE INSERT OR UPDATE OF username ON profiles`, `EXECUTE FUNCTION check_username_not_retired()`): correctly scoped to username writes only, so profile bio/avatar updates do not fire it; cannot be bypassed through non-username profile mutations for its purpose (reserving handles), and any username write fires it. **PASS.**
- Normalization `lower(handle) = lower(trim(new.username))` blocks case/whitespace variants. Historical handles remain permanently unavailable (PK + trigger). **PASS.**
- Active-username lookup leakage: the trigger raises `username_unavailable` (`errcode 23505`, hint `This username is unavailable.`). A direct unique-violation on `profiles.username` produces a different server message (`duplicate key value violates unique constraint...`). If Supabase/PostgREST surfaces raw DB messages, an attacker could distinguish retired vs active handles by message text despite identical SQLSTATE. Mitigation belongs in the application layer (single generic "unavailable" message) and future Phase B/E verification. **MEDIUM note (F4), not a migration blocker**, but the correction revision should not claim zero-enumeration on SQLSTATE alone.
- `check_username_not_retired()` is `SECURITY DEFINER` with pinned `search_path`; no user-controlled identifiers; no recursion (reads one private table, writes nothing). **PASS.**

---

## 11. Admin Governance Review

- FK change: `ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_id_fkey` → `ADD CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE RESTRICT`. Correct existing constraint targeted (foundation `202609130001:9` creates exactly this FK with `ON DELETE CASCADE`). Direction CASCADE → RESTRICT preserves governance records against administrative-account removal side effects. Orphan count previously `0`; re-check required at apply time. **PASS subject to pre-flight.**
- `is_privileged_user()` is NOT client-callable (grants verified, Section 5). Admin/moderator self-deletion protection remains available for the future deletion engine (which will call this helper as `service_role`). **PASS.**
- No audit-log data loss: the operation is a constraint replacement, not a row mutation. With 0 orphans, `RESTRICT` attaches cleanly. **PASS.**
- Owner/admin application boundary (`src/services/supabase/middleware.ts:45-60`, `DISCORA_OWNER_USER_ID`) is untouched by this migration. **PASS.**

---

## 12. Storage Review (`avatars`)

Policies (all `TO authenticated`, all carrying `public.is_active_user()`):

- INSERT: `bucket_id = 'avatars' AND foldername(name)[1] = auth.uid()::text AND is_active_user() AND filename(name) IN ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp')`.
- UPDATE: same namespace + `is_active_user()` in both `USING` and `WITH CHECK`, extension allowlist in `WITH CHECK`.
- DELETE: namespace + `is_active_user()` in `USING`.
- Bucket restricted to `avatars`; UUID-namespace ownership enforced; no arbitrary object deletion (policies scope to own folder); no path traversal (equality on first path segment + filename allowlist); extension whitelist blocks executable/SVG/HTML uploads at the policy layer. `service_role` bypasses storage RLS, preserving future cleanup-worker capability. **PASS.**
- Policy names match `202606030002_create_avatars_bucket.sql` exactly, so `DROP ... IF EXISTS` + `CREATE` replaces in place. **PASS** (contrast with Section 20 blockers).

---

## 13. Migration Atomicity

- `202609140002` is a single script intended for Supabase SQL Editor execution (implicit transaction). Dependency order inside the file is correct: `profiles.is_deleted` (Sec 1) → `is_active_user()` (Sec 2) → `has_room_write_access` (Sec 3) → policies referencing the helpers (Sec 4) → RPCs (Sec 5) → `retired_handles` before its trigger (Sec 6) → governance helper + FK replacement last (Sec 7). No forward references. **PASS.**
- Failure halfway: under SQL Editor transactional execution, any error aborts the whole block (as demonstrated by the `202609140001` incident — zero partial persistence). Do NOT assume non-transactional execution: the operator must execute the file as a single batch and must not split it into separately-committed chunks. If executed statement-by-statement with autocommit, a mid-file failure COULD leave partial state (e.g., `is_deleted` added but policies not yet hardened). The execution sequence in Section 22 mandates single-batch execution. **PASS WITH OPERATOR DEPENDENCY.**
- FK replacement after data-compatibility check: the file itself does not assert `orphaned_audit_logs = 0`; that is a pre-flight check (Section 21). With 0 orphans the `ADD CONSTRAINT ... RESTRICT` succeeds; with orphans it fails and (transactionally) rolls back. Safe direction, operator-gated. **PASS.**

---

## 14. Idempotency

| Construct | Retry behavior | Verdict |
|---|---|---|
| `ADD COLUMN IF NOT EXISTS is_deleted` | Safe on pristine, partial, and applied states | **PASS** |
| `CREATE INDEX IF NOT EXISTS` | Safe | **PASS** |
| `CREATE OR REPLACE FUNCTION` (all helpers/RPCs/trigger fn) | Safe; re-runnable | **PASS** |
| `DROP POLICY IF EXISTS` + `CREATE POLICY` (matching names) | Safe | **PASS** |
| `DROP POLICY IF EXISTS` + `CREATE POLICY` (mismatched names) | Retry-safe mechanically (second run drops the first run's new policy and recreates it) BUT the old permissive policy survives every run | **FAIL (security, B1)** — idempotent yet permanently insecure |
| `CREATE TABLE IF NOT EXISTS retired_handles` + `ENABLE RLS` + grants | Safe; `ENABLE RLS` is idempotent; grants are additive | **PASS** |
| `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` | Safe | **PASS** |
| `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` | Safe on pristine/partial/applied | **PASS** |
| Full re-run on already-correct final state | Succeeds (all guards `IF EXISTS`/`OR REPLACE`) | **PASS** (after B1 correction) |

---

## 15. Production Compatibility

Checked against the known production facts from the handoff:

- `user_role_type` = (`moderator`, `admin`): `202609140002` compiles cleanly (no `system_owner` literal). **COMPATIBLE.**
- `admin_audit_logs_admin_id_fkey` exists (CASCADE): `DROP CONSTRAINT IF EXISTS` targets it correctly. **COMPATIBLE** (pending orphan re-check).
- `orphaned_audit_logs = 0`: previously verified; must be re-verified (Section 21). **OPERATOR-GATED.**
- `profiles.is_deleted` absent: `ADD COLUMN IF NOT EXISTS` applies. **COMPATIBLE.**
- `retired_handles` absent: `CREATE TABLE IF NOT EXISTS` applies. **COMPATIBLE.**
- `is_active_user()` / `is_privileged_user()` absent: `CREATE OR REPLACE` applies. **COMPATIBLE.**
- **INCOMPATIBLE as written:** RLS policy-name mismatches (Section 20, B1) mean the migration applies without error but does not converge production to the intended hardened state — it adds policies instead of replacing them. `toggle_reaction` signature change and `create_claim_request` validation delta further break compatibility with the deployed client and foundation semantics.

---

## 16. Google OAuth Boundary

VERIFIED (static, complete-file read + targeted grep):

- Zero statements referencing `auth.users`, `auth.identities`, OAuth providers, provider configuration, or callback behavior exist in `202609140002`.
- Application OAuth surface untouched in this review's scope: `src/components/auth/google-signin-button.tsx` (branded button, `loginWithGoogle`), `src/features/auth/services/auth-service.ts:52` (`loginWithGoogle`), `src/features/auth/components/google-one-tap.tsx`, `src/app/auth/callback/route.ts` (safe-redirect allowlisting per prior reviews). No migration interaction.
- Google Sign-In remains a normal supported authentication method. The future step-up mechanism for destructive deletion is out of scope and NOT introduced here.

**Verdict: HARD BOUNDARY RESPECTED. PASS.**

---

## 17. Account Deletion Boundary

VERIFIED: `202609140002` MUST NOT (and does not):

- delete `auth.users` / create deletion orchestration / create destructive deletion RPCs (no `execute_account_deletion`, no `deletion_operations`, no `storage_cleanup_queue`) ✅
- delete storage ✅ (storage policies only gate; no object mutation)
- activate Danger Zone ✅ (`src/features/settings/components/settings-page-client.tsx:430-467` — button `disabled`, `cursor-not-allowed opacity-50`, notice "Account deletion is not yet available...")
- change deletion UX ✅
- perform de-identification ✅ (only adds the `is_deleted` column defaulting `false`; no row is marked deleted)
- remove authentication providers ✅

Phase 9C.4A is infrastructure hardening only. **Verdict: HARD BOUNDARY RESPECTED. PASS.**

---

## 18. Browser QA

- **Playwright MCP (Docker `browser_*` tools): attempted.** `browser_navigate` to `http://localhost:3000/login` failed with `ERR_CONNECTION_REFUSED` (container localhost ≠ host), and `http://host.docker.internal:3000/login` timed out (container network isolation). A host-side check confirmed a dev server IS listening on `http://localhost:3000` (HTTP 200 on HEAD), so the failure is tool-network topology, not application availability. No destructive actions were attempted. **Playwright MCP browser QA: NOT PERFORMED (environment limitation), explicitly reported — not claimed.**
- **Substitute evidence (code inspection + build):**
  - Danger Zone remains disabled (file/lines cited in Section 17). VERIFIED by reading.
  - Google Sign-In UI present and wired (file cited in Section 16). VERIFIED by reading.
  - `npx tsc --noEmit`: **PASS** (no output, zero errors).
  - `npm run lint`: **PASS with 40 pre-existing warnings, 0 errors** (unused vars in scripts and three source files; none in the migration scope; no new warnings introduced by this review since no source was modified).
  - `npm run build` (Next.js 15.5.25): **PASS** — compiled successfully, all 28 static pages generated, identical route surface.
- **Scope relevance:** `202609140002` is database-only (zero `src/` changes), so UI regression risk from the migration itself is nil. The prior pre-production review already executed a 5-viewport non-destructive pass on `/login`, `/register`, `/settings` against the identical source tree. Repeating full viewport QA is appropriately deferred to the corrected-revision review; the Product Owner should require a fresh pass only if the correction touches `src/` (it should not — see Section 22).
- Responsive/overflow/console-error checks via live browser: **NOT VERIFIED in this turn** (stated plainly per governance; no fabrication).

---

## 19. TypeScript / Lint / Build Results

- `npx tsc --noEmit` → **PASS** (exit clean, no errors). No source modified by this review.
- `npm run lint` (`eslint --cache`) → **0 errors, 40 warnings.** All warnings are pre-existing unused-variable warnings in `scripts/*` QA harnesses and three source components (`message-reactions.tsx:24`, `room-evidence-section.tsx:193`, `use-discussions.ts:918`). None touch migration scope, auth, settings Danger Zone, or Supabase helpers.
- `npm run build` → **PASS.** Next.js 15.5.25 production build compiled in ~16s, lint+type checks passed within build, 28/28 static pages generated, middleware 88.9 kB. Route table unchanged.
- These results support the "no product-behavior change in `src/`" claim. They do NOT validate the SQL migration itself (SQL is not type-checked by `tsc`).

---

## 20. Findings

### CRITICAL

**C1 — RLS policy renames leave pre-existing permissive policies live (fail-closed defeated).**
- Evidence/files: `202609140002` lines 90–104 (profiles), 107–130 (reactions ×2), 143–156 (claim_requests UPDATE), 189–212 (user_preferences ×2) vs canonical history:
  - `202606030001_create_profiles.sql:100-106` (`Users can update their own profile`)
  - `202609090005_reactions_foundation.sql:91-114` (`Authenticated users can create reactions`, `Users can delete their own reactions`)
  - `202609090003_claim_requests_foundation.sql:94-101` (`Requesters can update their own requests`)
  - `202606130001_add_display_name_and_preferences.sql:72-85` (`Users can insert/update their own preferences`)
- What exists: `DROP POLICY IF EXISTS "<new-name>"` matches nothing; `CREATE POLICY "<new-name>"` adds a second permissive policy; the old policy (without `is_active_user()`) remains.
- Expected: `DROP`/`CREATE` using the EXACT production policy names so the hardened definition replaces the permissive one.
- Impact: PostgreSQL evaluates multiple permissive policies with OR. A deleted user with an in-flight JWT still satisfies the old policy and can UPDATE profiles / INSERT-DELETE reactions / UPDATE claim requests / INSERT-UPDATE preferences. INVARIANT 1 (fail-closed PostgREST writes) fails on exactly the tables this migration claims to harden.
- Recommendation: BLOCKED. Correct the six policy names to the canonical ones (or defensively `DROP` BOTH old and new names, then `CREATE` the canonical hardened definition). Re-audit every `DROP POLICY` in the file against a production policy inventory before re-submission. No execution until corrected.

### HIGH

**H1 — `toggle_reaction` return-type change breaks the deployed client.**
- Evidence: `202609140002:270-349` declares `RETURNS jsonb` with `jsonb_build_object(action, reaction_type, target_type, target_id, delta)`; production foundation (`202609090005:134-138`) and `202609140001:216-220` declare `RETURNS boolean`; client `src/features/discussions/services/discussion-service.ts:1308-1326` does `return data as boolean`.
- Expected: preserve the `boolean` contract in a hardening-only migration, or ship an atomic client update in the same release (out of scope for a DB-only 9C.4A hardening step).
- Impact: reaction toggles misbehave at runtime (truthy object always), TypeScript type lie, silent UX break with zero UI change.
- Recommendation: BLOCKED. Revert `toggle_reaction` to `RETURNS boolean` (keep the `is_active_user()` + room guards, which are the actual hardening). If the `jsonb` payload is desired, it belongs in a separate, product-approved API change with client migration.

**H2 — `create_claim_request` validation loosening vs production foundation.**
- Evidence: `202609140002:355-417` vs `202609090003:142-209` (and the equivalent guards in `202609140001:294-355`). The corrective version drops: `own_message` rejection, `message_type = 'message'` requirement, `converted_claim_id IS NULL` requirement; dedup changes from upsert-on-`(message_id, requester_id)` to pending-only lookup; room check changes from message-visibility logic to `has_room_access`.
- Expected: hardening-only migration must preserve all existing validation guards and only ADD the `is_active_user()` check.
- Impact: users could request their own messages, request non-message entities, or re-request already-converted messages — unapproved product-behavior change in a migration that guarantees no behavior change.
- Recommendation: BLOCKED. Restore the foundation validation guards verbatim, adding only the `is_active_user()` gate.

### MEDIUM

**M1 — Retired-handle anti-enumeration relies on DB message indistinguishability.**
- Evidence: `202609140002:589-598` raises `username_unavailable`/`23505`/`This username is unavailable.`; active-username collisions raise native unique-violation text. See Section 10.
- Impact: reduced risk (not zero) of retired-vs-active oracle if raw DB errors reach the client.
- Recommendation: keep the trigger; add application-layer normalization to a single generic message and verify via privacy test before Phase B. Not a blocker for the migration itself.

**M2 — `has_room_write_access` anon-behavior tightening is undocumented.**
- Evidence: Section 4, Section 6. Change from `(visibility='public')` to `(visibility='public' AND auth.uid() IS NOT NULL)`.
- Impact: strictly safer; but it diverges from `202609140001` and existing semantics without a changelog note.
- Recommendation: keep the tighter predicate; document it in the correction revision header.

**M3 — `is_privileged_user` grant scope could be tightened to `PUBLIC`.**
- Evidence: Section 5. `REVOKE ... FROM anon, authenticated` without explicit `FROM PUBLIC`.
- Impact: negligible (PostgREST uses `anon`/`authenticated`), but defense-in-depth favors explicitness.
- Recommendation: add `REVOKE ALL ON FUNCTION public.is_privileged_user(uuid) FROM PUBLIC;` in the correction.

### LOW

**L1 — `GRANT` before `REVOKE` ordering on `is_privileged_user`.** Functionally correct (different grantees), but convention is revoke-first. Cosmetic; fix opportunistically.
**L2 — Header comment accuracy.** After correction, the header must enumerate the policy-name fixes and the `toggle_reaction`/`create_claim_request` restorations so reviewers can diff intent. Documentation hygiene only.
**L3 — `search_path = public, pg_temp` vs legacy `public`.** Safe and preferred; noted for completeness. No action.

### What was NOT found (explicit negative results)

- No `system_owner` in executable SQL. No enum alteration. No `auth.*` mutation. No OAuth/callback change. No deletion RPC, storage wipe, Danger Zone activation, or de-identification. No privilege escalation, unsafe dynamic SQL, trigger recursion, or policy recursion. No missing schema qualification. No `100% secure`-style language used in this review.

---

## 21. Required Pre-Flight Checks (Must Be Re-Run Before ANY Future Apply)

Execute read-only, in order, against production immediately before the corrected migration. Abort on any unexpected result:

1. **Enum values:** `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.user_role_type'::regtype ORDER BY enumsortorder;` — expect exactly `moderator`, `admin`.
2. **FK name:** `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.admin_audit_logs'::regclass AND contype = 'f';` — expect `admin_audit_logs_admin_id_fkey` with `ON DELETE CASCADE`.
3. **Orphaned audit logs:** `SELECT count(*) AS orphaned_audit_logs FROM public.admin_audit_logs WHERE admin_id IS NOT NULL AND admin_id NOT IN (SELECT id FROM auth.users);` — expect `0`.
4. **`is_deleted` absent:** query `information_schema.columns` for `public.profiles.is_deleted` — expect 0 rows.
5. **`retired_handles` absent:** `SELECT to_regclass('public.retired_handles');` — expect `NULL`.
6. **Helpers absent:** `SELECT proname FROM pg_proc WHERE proname IN ('is_active_user','is_privileged_user');` — expect 0 rows (proves clean pre-9C.4A state at apply time).
7. **Policy inventory (new — required by finding C1):** `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','reactions','claim_requests','user_saves','user_preferences') ORDER BY tablename, policyname;` — reconcile EVERY `DROP POLICY` name in the corrected migration against this output. Any mismatch = stop.
8. **Storage policy inventory:** `SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects';` — confirm the three `avatars` policy names.
9. **Client contract check:** confirm `toggleReaction` in `discussion-service.ts` still expects `boolean` (or review the paired client diff if H1 is resolved via client update).

---

## 22. Exact Production Execution Sequence (For the CORRECTED Revision Only — NOT for `202609140002` as Written)

DO NOT execute `202609140002` as written. When a corrected revision (e.g., `202609140003`) incorporating Section 20 fixes is approved:

1. Re-run all Section 21 pre-flight checks; record outputs. Abort on any deviation.
2. In Supabase SQL Editor, execute the corrected file as a SINGLE batch (single implicit transaction). Do NOT split into chunks. Do NOT autocommit statement-by-statement.
3. On success, run post-apply verification (read-only):
   - `profiles.is_deleted` column present (`boolean`, `NOT NULL`, `DEFAULT false`).
   - `idx_profiles_is_deleted` exists.
   - `is_active_user()` + `is_privileged_user()` present in `pg_proc`.
   - `retired_handles` present in `pg_tables` with RLS enabled.
   - `admin_audit_logs_admin_id_fkey` def now contains `ON DELETE RESTRICT`.
   - Policy inventory shows EXACTLY ONE policy per hardened operation (no orphaned permissive duplicates).
   - `toggle_reaction` return type matches the deployed client (`boolean` unless paired client change is deployed simultaneously).
4. Run the four Phase 9C.4 verification tests from the implementation spec (authenticated-client deletion-RPC denial, in-flight-JWT write denial, avatar-ownership, retired-handle privacy) in a non-production environment first; production verification is read-only QA only.
5. STOP. Await Product Owner authorization before Phase B. Do not proceed to deletion RPC, storage worker, Server Action, or Danger Zone activation.

---

## 23. Final Verdict

**C. BLOCKED — MIGRATION CORRECTION REQUIRED**

Exact blockers and required corrections (no automatic fixes applied):

- **B1 (CRITICAL):** Rename six RLS policies to canonical production names so `DROP`+`CREATE` replaces in place: `Users can update their own profile`; `Authenticated users can create reactions`; `Users can delete their own reactions`; `Requesters can update their own requests`; `Users can insert their own preferences`; `Users can update their own preferences`. Defensively drop both old and new names, then create the hardened canonical definition. (Section 20, C1.)
- **B2 (HIGH):** Restore `toggle_reaction` to `RETURNS boolean` (keeping the `is_active_user()` and room guards), or pair the `jsonb` change with an approved client update — not as a silent hardening side effect. (Section 20, H1.)
- **B3 (HIGH):** Restore `create_claim_request` foundation guards (`own_message`, `message_type`, `converted_claim_id`, upsert semantics), adding only the `is_active_user()` gate. (Section 20, H2.)

Recommended correction vehicle: a NEW migration file (e.g., `202609140003_...`) incorporating the above; `202609140001` MUST NOT be rewritten; `202609140002` must not be executed as written. After correction, re-review narrowly against Sections 20–21 and then apply per Section 22.

**Absolute stop condition observed:** no production write executed; no Phase 9C.4B implemented; no account deletion activated; no Google OAuth modified; no role enum modified; no legal UX modified; no users or storage deleted. Standing by for Product Owner approval of a corrected revision.

---

### Appendix — Review Method & Tooling Honesty

- **Filesystem/shell:** used (full reads of both migrations, targeted migration-history and source reads, `tsc`/`lint`/`build`). Supabase MCP: NOT available in this session — NOT used, NOT claimed. GitHub MCP: not needed (history read locally) — NOT used. Fetch/Context7 web research: not needed (PostgreSQL/RLS semantics verified against in-repo evidence and prior approved audits) — intentionally unused. Playwright MCP (`browser_*`): attempted for non-destructive regression; unable to reach host dev server due to container network isolation — reported as NOT PERFORMED, with code-inspection + build substitute and explicit NOT VERIFIED marking for live viewport/console checks.
- Security language: this report uses "enforces," "mitigates," "reduces risk," "verified under tested conditions," "requires production verification," and "operator dependency." No absolute guarantees are claimed. Legal review dependencies from the implementation spec remain open and are NOT decided here.
- Authority hierarchy followed: Philosophy → Original MDs → Approved Product Decisions (9C.3R spec, recovery audit) → Approved Specs → Current Implementation → UX optimization → Agent assumptions. The `system_owner` references in the 9C.3R spec and older Phase B drafts are superseded for THIS migration by the verified production enum (`admin`, `moderator`); the correction correctly aligns with production, and the spec's three-role language should be reconciled by the Product Owner before Phase B — flagged, not silently rewritten.
