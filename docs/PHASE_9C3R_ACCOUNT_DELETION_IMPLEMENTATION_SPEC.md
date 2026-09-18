# Phase 9C.3-R: Account Deletion Implementation Specification

**Document Status:** Final Authoritative Implementation Specification (Locked for Phase 9C.4)  
**Phase:** 9C.3-R3.1-C (Pre-Implementation Security Contract Correction)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Database Engine:** PostgreSQL 15+ / Supabase Auth (GoTrue) & Supabase Storage  
**Application Framework:** Next.js 15 App Router / React 19 / TypeScript / Tailwind CSS  
**Auditor:** Senior Security Architecture & Verification Team  
**Date:** September 14, 2026  

---

## 1. Purpose

This document provides the definitive, implementation-ready architectural and security specification for Discora's future account deletion subsystem. It incorporates all empirical findings and corrections from Phase 9C.3-R3.1-V, establishing strict privilege boundaries, a fail-closed database authorization model, provable storage ownership invariants, and durable crash-recovery checkpoints.

---

## 2. Product & Epistemic Invariants

Discora is a structured deliberation platform built on core epistemological principles:
- **Understanding Over Engagement**
- **Evidence Over Popularity**
- **Reasoning Over Tribalism**
- **Human Judgment Over AI Authority**
- **Intellectual Growth Over Winning**

Under no circumstances may account deletion function as an epistemic punishment, a retrospective revision of public consensus, or an instrument of conversational vandalism.
- **Permanent Node Survival:** Published discourse (claims, evidence citations, arguments, questions, inquiries, inquiry responses, messages, debate reflections, and graph relationships) survives account deletion permanently.
- **Public Attribution:** All surviving public nodes authored by a deleted account render with the author display name `"Deleted User"` and a null avatar.
- **Personal Privacy:** All private identity records (email, display name, biography, password hash, OAuth identity data, private preferences, saved bookmarks, and private stance signals) are permanently removed or scrambled.

---

## 3. Approved Deletion Model: Option C (Hybrid De-Identification in Place)

By Product Owner directive, Discora implements **Option C: Hybrid De-Identification in Place**:
1. **Preserve Database Row Anchors:** The user's row in `public.profiles` is **not deleted**. It is de-identified in place (`is_deleted = true`, `username = 'deleted_user_' || substr(md5(id::text), 1, 8)`, `display_name = null`, `bio = null`, `avatar_url = null`).
2. **Preserve Relational Integrity:** Because the primary key UUID remains in `public.profiles`, foreign keys across claims, evidence, and messages remain valid. This avoids deadlocks with PostgreSQL immutability triggers (`enforce_claim_immutability`, `enforce_message_edit_rules`, `enforce_evidence_immutability`) and prevents cascade destruction of downstream deliberation.
3. **Distinct Contributor Continuity:** In deliberations where multiple participants delete their accounts, their distinct UUIDs ensure the transcript distinguishes multiple deleted contributors rather than collapsing them into a single speaker arguing with themselves.

---

## 4. Threat Model

| Threat Actor | Attack Vector | Potential Vulnerability | Enforced Mitigation |
|---|---|---|---|
| **Malicious User with In-Flight JWT** | Submits PostgREST writes after account deletion | PostgREST bypasses Next.js middleware; RLS write policies lack `is_deleted` check | Shared `is_active_user()` helper enforced across all write RLS policies and room helpers. |
| **Direct RPC Invoker** | Calls `execute_account_deletion` directly from browser console | User skips step-up auth, CSRF, rate limits, session revocation, and storage cleanup | Revoke `EXECUTE` from `authenticated`. Grant strictly to `service_role`. |
| **Asset Spoofing Attacker** | Sets `avatar_url` to victim's avatar before self-deleting | Deletion worker deletes victim's avatar from S3 | RPC regex-validates that storage path is prefixed with caller's own UUID (`target_user_id`). |
| **Account Harvester / Scraper** | Scrapes `public.retired_handles` to identify deleted users | Public `SELECT` policy exposes registry of deleted accounts | Revoke `SELECT` from `anon` and `authenticated`. Registry is private to server/triggers. |
| **Attacker Replaying Step-Up Proof** | Replays captured step-up challenge cookie to delete account | Challenge token has long TTL or is reusable | Challenge is single-use, server-signed, session-bound, and strictly time-limited (< 300s). |
| **Compromised Admin** | Tries to self-delete to destroy accountability records | Cascade foreign keys on audit logs wipe moderation history | RPC blocks self-delete for users in `public.user_roles`; audit logs decoupled to `RESTRICT`. |

---

## 5. Account Deletion State Machine

Account deletion is managed as a formal 10-state distributed state machine tracked in `public.deletion_operations`:

```
[requested]
     │
     ▼
[db_processing] ──────► [failed_terminal] (Validation/Authorization failure)
     │
     ▼
[db_completed]
     │
     ▼
[auth_processing] ────► [retryable_failure] ────► [manual_review] (After 5 retries)
     │
     ▼
[auth_completed]
     │
     ▼
[storage_pending]
     │
     ▼
[completed]
```

### State Definitions:
1. `requested`: Server Action received, pre-flight validation in progress.
2. `db_processing`: PostgreSQL transaction active; `FOR UPDATE` lock held on `profiles`.
3. `db_completed`: Database profile de-identified, private signals purged, handle retired, storage cleanup enqueued.
4. `auth_processing`: GoTrue Admin APIs active (`admin.signOut`, `updateUserById`, `deleteUser`).
5. `auth_completed`: GoTrue user soft-deleted, email scrambled, banned, and sessions revoked.
6. `storage_pending`: S3 storage cleanup job enqueued for background worker.
7. `completed`: Full deletion workflow completed successfully.
8. `retryable_failure`: Transient failure during Auth or Storage phase; backoff active.
9. `manual_review`: Operation exceeded 5 retry attempts; requires administrator inspection.
10. `failed_terminal`: Operation aborted prior to database mutation (e.g., privileged account blocked).

---

## 6. Durable Checkpoints

To ensure crash consistency across distributed boundaries (PostgreSQL, GoTrue, S3), `public.deletion_operations` maintains durable checkpoint timestamps:

| Checkpoint Field | Meaning When Populated | What Has Definitely Succeeded? | Safe to Retry? | What Must Never Be Repeated? |
|---|---|---|---|---|
| `db_completed_at` | Database transaction committed | Profile tombstoned (`is_deleted=true`), private signals purged, handle retired | No (Idempotent RPC returns existing operation ID) | Re-inserting handle or re-running de-identification |
| `auth_signout_completed_at` | `admin.signOut(jwt, 'global')` succeeded | All active GoTrue sessions and refresh tokens revoked | Yes (Safe to retry if JWT still valid, skip if expired) | Never re-issue sessions |
| `auth_scrub_completed_at` | `updateUserById` succeeded | Email scrambled to surrogate, user banned for 100 years | Yes (Idempotent update) | Reverting email to original |
| `auth_soft_delete_completed_at` | `deleteUser(soft)` succeeded | GoTrue record marked `deleted_at = now()` | Yes (Idempotent soft-delete) | Hard-deleting the user |
| `storage_cleanup_completed_at` | Storage worker removed file | S3 object deleted from `avatars` bucket | Yes (Storage delete returns 200 even if already deleted) | Deleting foreign objects |

---

## 7. Step-Up Authentication Contract

Account deletion is an irreversible destructive operation requiring explicit, server-verifiable step-up authentication.

### 7.1 Password Accounts: Synchronous Verification
- **Mechanism:** User re-enters their current Discora password in the deletion modal.
- **Server Execution:** The Server Action instantiates an isolated, cookie-free Supabase GoTrue client and calls `verifyClient.auth.signInWithPassword({ email: user.email, password })`.
- **Validation:** If credentials are valid, the Server Action proceeds immediately within the same execution context. No long-lived proof token is generated.
- **Isolation:** The verification client does not touch the session cookie store, preventing session corruption if verification fails.

### 7.2 Google OAuth Accounts: Product Decision Required
Because standard Google OAuth with `prompt=select_account` only verifies active browser account selection without guaranteeing recent password entry:
- **PRODUCT DECISION REQUIRED:** The Product Owner must choose between:
  - **Option A (OAuth Challenge):** Server-bound OAuth challenge cookie requiring re-authentication via `/auth/callback` before proceeding.
  - **Option B (Email Confirmation Code):** 6-digit cryptographic confirmation code sent to the user's registered email address (proves out-of-band mailbox access).
  - **Option C (Dual-Factor):** Both OAuth re-selection and Email confirmation code.
- **Recommended Option:** **Option B (Email Confirmation Code)** provides the highest security assurance against physical browser session hijacking.

### 7.3 Step-Up Invariants
1. **Time-Limited:** Proofs expire within 300 seconds (5 minutes).
2. **Single-Use:** Challenge is invalidated immediately upon first execution.
3. **Session-Bound:** Proof is cryptographically bound to the specific caller `user_id` and session ID.
4. **Operation-Specific:** Valid exclusively for `action: "account_deletion"`.

---

## 8. Auth Operation Ordering

To prevent GoTrue from rejecting `/logout` due to a pre-existing soft-deleted or banned user state, operations must execute in this exact sequence:

1. **Pre-flight Validation:** Enforce CSRF Origin check, rate limit, step-up proof, and confirmation phrase (`"DELETE MY ACCOUNT"`).
2. **Database De-Identification (RPC):** Call `public.execute_account_deletion(target_user_id)` via `service_role`. Commits `is_deleted = true`, purges private signals, and enqueues storage cleanup.
3. **Global Session Revocation:** Call `supabaseAdmin.auth.admin.signOut(userJwt, 'global')` while the GoTrue account is in an active state. GoTrue purges `auth.sessions` and refresh tokens across all devices.
4. **Identity Scrubbing & Ban:** Call `supabaseAdmin.auth.admin.updateUserById(target_user_id, { email: 'deleted_' || id || '@deleted.invalid', email_confirm: true, phone: '', user_metadata: {}, app_metadata: { provider: 'email', providers: ['email'] }, ban_duration: '876000h' })`.
5. **Soft Deletion:** Call `supabaseAdmin.auth.admin.deleteUser(target_user_id, { shouldSoftDelete: true })`.
6. **Storage Cleanup:** Trigger background storage worker to process queue.
7. **Client Session Destruction:** Clear HTTP-only session cookies in Next.js response headers and redirect to `/`.

---

## 9. Database & RLS Authorization Contract (In-Flight JWT Protection)

Because Discora uses direct client-to-Supabase PostgREST mutations, Next.js middleware is not the sole security boundary. The database must fail closed against in-flight JWTs.

### 9.1 Shared Active-User Helper
Create a centralized, security-definer helper:
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
grant execute on function public.is_active_user() to authenticated, service_role;
```

### 9.2 PostgREST Mutation Authorization Matrix

| Table / Mutation | Client Path | Existing Policy / Helper | Required Update for Phase 9C.4 | Safe After `is_deleted = true`? |
|---|---|---|---|---|
| `messages` (INSERT) | PostgREST direct | `auth.uid() = user_id and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `messages` (UPDATE) | PostgREST direct | `user_id = auth.uid() and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `claims` (INSERT/UPDATE) | PostgREST direct | `auth.uid() = created_by and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `evidence` (INSERT/UPDATE) | PostgREST direct | `auth.uid() = created_by and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `sources` (INSERT/UPDATE) | PostgREST direct | `auth.uid() = created_by and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `arguments` (INSERT/UPDATE) | PostgREST direct | `auth.uid() = created_by and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `claim_votes` (INSERT/UPDATE) | PostgREST direct | `auth.uid() = user_id and has_room_write_access(room_id)` | Update `has_room_write_access` to check `is_active_user()` | Yes (Fails closed) |
| `reactions` (INSERT/DELETE) | PostgREST direct | `auth.uid() = user_id and has_room_access(room_id)` | Add `and public.is_active_user()` to policy check | Yes (Fails closed) |
| `claim_requests` (INSERT) | PostgREST direct | `auth.uid() = requester_id` | Add `and public.is_active_user()` to policy check | Yes (Fails closed) |
| `user_saves` (INSERT/DELETE) | PostgREST direct | `auth.uid() = user_id` | Add `and public.is_active_user()` to policy check | Yes (Fails closed) |
| `user_preferences` (ALL) | PostgREST direct | `auth.uid() = user_id` | Add `and public.is_active_user()` to policy check | Yes (Fails closed) |
| `profiles` (UPDATE) | PostgREST direct | `auth.uid() = id` | Add `and not is_deleted and public.is_active_user()` | Yes (Fails closed) |
| `inquiry_items` (INSERT) | RPC `create_inquiry` | RPC internal check | Add `if not public.is_active_user() then raise exception...` | Yes (Fails closed) |
| `inquiry_responses` (INSERT)| RPC `respond_to_inquiry` | RPC internal check | Add `if not public.is_active_user() then raise exception...` | Yes (Fails closed) |
| `avatars` (STORAGE INSERT) | Storage API | `auth.uid()::text = (storage.foldername(name))[1]` | Add `and public.is_active_user()` to storage policy | Yes (Fails closed) |

---

## 10. RPC Privilege Contract

The core database mutation routine is `public.execute_account_deletion(target_user_id uuid) RETURNS uuid`.

### 10.1 Privilege Boundaries
- **Ownership:** Owned by `postgres` (or `supabase_admin`).
- **Search Path:** Strictly pinned: `SET search_path = public, pg_temp;`.
- **EXECUTE Revocation:** `REVOKE ALL ON FUNCTION public.execute_account_deletion(uuid) FROM PUBLIC, anon, authenticated;`.
- **EXECUTE Grant:** `GRANT EXECUTE ON FUNCTION public.execute_account_deletion(uuid) TO service_role;`.
- **Invocation Boundary:** Browser clients cannot invoke this function directly. It is callable exclusively by the Next.js Server Action using the server-side `SUPABASE_SERVICE_ROLE_KEY`.

### 10.2 In-Function Governance Guards
Even when invoked by `service_role`, the RPC executes internal safeguards:
```sql
-- Enforce target account is not an administrator, moderator, or owner
if exists (
  select 1 from public.user_roles 
  where user_id = target_user_id and role in ('admin', 'moderator', 'system_owner')
) then
  raise exception 'privileged_account_self_deletion_prohibited' 
    using errcode = '42501', hint = 'Administrative accounts cannot be deleted.';
end if;
```

---

## 11. Storage Ownership Contract

To prevent cross-user avatar deletion (where User A sets their `avatar_url` to User B's avatar before self-deleting), the deletion engine must provably verify object ownership:

### 11.1 Verification Logic in RPC
```sql
-- Extract and verify avatar URL belongs to target user
select avatar_url into v_avatar_url from public.profiles where id = target_user_id;

if v_avatar_url is not null and v_avatar_url ~* ('^https?://[^/]+/storage/v1/object/public/avatars/' || target_user_id::text || '/avatar\.[a-z0-9]+$') then
  v_object_path := target_user_id::text || '/' || substring(v_avatar_url from 'avatar\.[a-z0-9]+$');
  insert into public.storage_cleanup_queue (user_id, bucket, object_path)
  values (target_user_id, 'avatars', v_object_path);
end if;
```

### 11.2 Storage Invariants
1. **Expected Bucket:** Must be strictly `'avatars'`.
2. **User Namespace:** Path must begin with `target_user_id::text || '/'`.
3. **Fail-Safe Behavior:** If `avatar_url` is external (e.g., Google OAuth profile picture), malformed, null, or points to another user's UUID, **no storage object is enqueued**. Unverified objects are never deleted.

---

## 12. Retired Handle Contract (Privacy-Preserving Retirement)

Historical usernames are retired permanently to prevent impersonation, spoofing, and broken historical mentions.

### 12.1 Schema & Privacy Lockdown
```sql
create table public.retired_handles (
  handle text primary key,
  retired_at timestamptz not null default now(),
  reason text not null default 'account_deletion'
);
alter table public.retired_handles enable row level security;
-- Strictly revoke SELECT from anon and authenticated to prevent enumeration
revoke all on public.retired_handles from anon, authenticated;
```

### 12.2 Availability Check via Trigger
The handle availability check executes inside the `BEFORE INSERT OR UPDATE` trigger on `public.profiles` (`check_username_not_retired()`), which runs as `SECURITY DEFINER`.
- **Public Response:** New registrants entering a retired handle receive a generic error: `"This username is unavailable."` (identical to the message for an active account).
- **Zero Enumeration:** No user or scraper can execute `SELECT * FROM public.retired_handles`.

---

## 13. Data Lifecycle Inventory (Complete Foreign Key Mapping)

| Object / Table | User Column | Constraint Action | Lifecycle Classification | Handling Under Option C |
|---|---|---|---|---|
| `auth.users` | `id` | PK | **De-identify** | Email scrambled to surrogate; metadata wiped; banned 100 yrs; soft-deleted. |
| `auth.identities` | `user_id` | CASCADE | **Retain Disabled** | Retained under banned parent user. Technical ID disabled from future logins. |
| `auth.sessions` | `user_id` | CASCADE | **Purge** | Revoked globally via `admin.signOut(jwt, 'global')`. |
| `auth.refresh_tokens` | `user_id` | CASCADE | **Purge** | Revoked globally via GoTrue signOut and soft-delete. |
| `public.profiles` | `id` | PK FK CASCADE | **De-identify** | Set `is_deleted = true`, surrogate username, nullify PII & avatar. |
| `public.retired_handles` | `handle` | PK | **Governance** | Insert retired handle; access revoked from `anon` & `authenticated`. |
| `public.deletion_operations` | `id`, `user_id` | FK CASCADE | **Governance** | 10-state orchestration tracking with durable checkpoints. |
| `public.user_preferences` | `user_id` | FK CASCADE | **Purge** | Row deleted. |
| `public.user_roles` | `user_id` | FK CASCADE | **Governance** | Privileged accounts blocked from deletion; clean rows purged upon de-privileging. |
| `public.user_saves` | `user_id` | FK CASCADE | **Purge** | All saved room rows deleted. |
| `public.claim_votes` | `user_id` | FK CASCADE | **Purge** | All stance signal rows deleted. |
| `public.evidence_votes` (Legacy) | `user_id` | FK CASCADE | **Purge** | Legacy table rows purged. |
| `public.reactions` | `user_id` | FK CASCADE | **Purge** | All reaction rows deleted. |
| `public.reputation_events` | `user_id` | FK CASCADE | **Purge** | Ledger rows deleted. |
| `public.user_reputation_snapshots`| `user_id` | FK CASCADE | **Purge** | Score cache row deleted. |
| `public.room_invitations` | `invited_by` | FK CASCADE | **Purge** | Invitations created by user deleted; `invited_user_id` set null. |
| `public.access_code_failures` | `user_id` | PK CASCADE | **Purge** | Failure telemetry rows deleted. |
| `public.user_feedback` | `user_id` | SET NULL | **De-identify** | Set `user_id = null`; feedback text preserved anonymously. |
| `public.moderation_flags` | `reporter_id` | SET NULL | **De-identify** | Set `reporter_id = null`; protects whistleblower identity. |
| `public.moderation_flags` | `action_taken_by` | SET NULL | **Governance** | Technical UUID preserved for moderator accountability. |
| `public.admin_audit_logs` | `admin_id` | CASCADE -> RESTRICT | **Governance** | Cascade decoupled in Phase A. UUID points to de-identified record. |
| `public.messages` | `user_id` | SET NULL | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.claims` | `created_by` | SET NULL | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.claims` | `deleted_by` | SET NULL | **Preserve** | Discovered in R3.1-V. UUID anchor preserved under soft-delete. |
| `public.evidence` | `created_by` | SET NULL | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.sources` | `created_by` | SET NULL | **Preserve** | Row preserved. URL and bibliographic data intact. |
| `public.claim_evidence` | `created_by` | SET NULL | **Preserve** | Graph relationship edge preserved. |
| `public.claim_relations` | `created_by` | SET NULL | **Preserve** | Support/dispute graph edge preserved. |
| `public.questions` | `created_by` | SET NULL | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.arguments` | `created_by` | CASCADE | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.arguments` | `deleted_by` | SET NULL | **Preserve** | Discovered in R3.1-V. UUID anchor preserved under soft-delete. |
| `public.inquiry_items` | `created_by` | CASCADE | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.inquiry_responses` | `created_by` | CASCADE | **Preserve** | Row preserved. Displayed as `"Deleted User"`. |
| `public.claim_requests` | `requester_id` | CASCADE | **Preserve** | Row preserved. Attributed to `"Deleted User"`. |
| `public.debate_participants` | `user_id` | CASCADE | **Preserve** | Slot preserved. Historical balance intact. |
| `public.debate_side_changes` | `user_id` | CASCADE | **Preserve** | Reflection preserved. Attributed to `"Deleted User"`. |
| `public.rooms` | `created_by` | SET NULL | **Preserve** | Deliberative space preserved. |
| `public.topics` | `created_by` | SET NULL | **Preserve** | Category preserved. |
| `storage.objects` (`avatars`) | Owner UUID | S3 Object | **Purge** | Physical file deleted from S3 via Storage API. |

---

## 14. Admin & Governance Safeguards

1. **Privileged Account Self-Deletion Blocked:** Users assigned `admin`, `moderator`, or `system_owner` in `public.user_roles` cannot delete their accounts. Administrative roles must be formally revoked by the system owner prior to account deletion.
2. **Audit Log Decoupling:** In Phase A, the foreign key constraint on `public.admin_audit_logs.admin_id` is altered from `ON DELETE CASCADE` to `ON DELETE RESTRICT`. This guarantees that historical operational accountability records cannot be silently wiped.
3. **Log Separation:** Application governance logs (`admin_audit_logs`), deletion orchestration telemetry (`deletion_operations`), and infrastructure security logs remain logically and physically distinct.

---

## 15. Realtime Considerations

- **Current Architecture:** Realtime in Discora is used exclusively for ephemeral typing indicator broadcasts (`room-typing:${roomId}`). No persistent database subscriptions (`postgres_changes`) or private streaming channels exist.
- **Residual Risk:** An open WebSocket can continue broadcasting transient typing status until the client closes the tab or the connection disconnects. No persistent database state or private data can be read or modified via Realtime.
- **Future Policy:** Any future private Realtime channel must validate `public.is_active_user()` during channel connection authorization.

---

## 16. Cache & CDN Considerations

1. **Application Cache Invalidation:** Upon successful deletion, the Server Action invokes Next.js `revalidatePath('/u/[username]')` and `revalidateTag('user-[userId]')` to immediately purge server-rendered profile caches.
2. **Browser Client Cache:** TanStack Query cache is purged on the client, and HTTP-only session cookies are cleared in response headers.
3. **Storage CDN Residual Exposure:** Public avatar URLs cached at Cloudflare/Supabase Storage CDN edge locations remain accessible until the CDN cache TTL expires (typically up to 3,600s / 1 hour). Once the origin S3 object is deleted, CDN caches will serve 404 upon TTL expiration. This residual window is acknowledged as standard distributed CDN behavior.

---

## 17. Backup & PITR Recovery Model

- **Disaster Recovery Gap:** Restoring a database from a Point-In-Time Recovery (PITR) backup taken prior to account deletion will restore the pre-deletion user record.
- **Technical Recovery Procedure:** The operations team must maintain an append-only, off-site archive of `deletion_operations` (or a dedicated deletion event log). When a backup is restored, the recovery runbook must replay post-backup deletion events against the restored database to re-apply `is_deleted = true`, re-archive handles, and purge personal data.

---

## 18. Observability & Sentry Requirements

1. **Default PII Scrubbing:** Sentry configuration (`sentry.client.config.ts`, `sentry.server.config.ts`) enforces `sendDefaultPii: false` and explicitly removes `ip_address`, `email`, `username`, `authorization`, and `cookie` headers in `beforeSend`.
2. **Session Replays Disabled:** DOM session replays remain disabled (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`) to protect user privacy.
3. **Deletion Error Handling:** Server Action exception handlers must never include raw user passwords, OAuth tokens, or unredacted email addresses in error messages sent to Sentry.

---

## 19. Rate Limiting Requirements

- **Security Mandate:** Destructive account deletion must be protected against brute-force and denial-of-service abuse.
- **Implementation Strategy:**
  - *Application Level:* Next.js Server Action enforces an in-database rate limit checking `public.deletion_operations`: maximum 3 deletion requests per user per 24-hour rolling window.
  - *Infrastructure Level:* Cloudflare / Edge WAF rules should enforce IP-level rate limiting on the deletion endpoint (e.g., maximum 5 requests per IP per hour).

---

## 20. Failure Recovery & Reconciler Contract

If an operation encounters a transient failure or system crash, a scheduled background reconciler queries `public.deletion_operations WHERE status in ('db_completed', 'auth_processing', 'retryable_failure')`:
1. **If `auth_signout_completed_at` is null:** Reconciler cannot invoke `admin.signOut` without the user's JWT. It skips signOut and proceeds directly to `updateUserById` and `deleteUser`.
2. **If `auth_scrub_completed_at` is null:** Reconciler invokes `admin.updateUserById` to scramble email and ban the user.
3. **If `auth_soft_delete_completed_at` is null:** Reconciler invokes `admin.deleteUser(id, true)`.
4. **If `storage_cleanup_completed_at` is null:** Reconciler ensures a storage job is enqueued in `public.storage_cleanup_queue`.
5. **Backoff & Escalation:** Failed attempts increment `retry_count`. After 5 consecutive failures, the operation transitions to `manual_review`.

---

## 21. Idempotency & Concurrency

- **Operation Correlation ID:** Every deletion request generates or retrieves a unique `deletion_operation_id` (`UUID`).
- **Concurrent Request Handling:** A unique partial index on `public.deletion_operations(user_id) WHERE status NOT IN ('completed', 'failed_terminal')` prevents concurrent deletion attempts for the same account.
- **Replay Protection:** If an already-deleted user invokes the deletion RPC, the RPC detects `profiles.is_deleted = true`, immediately commits without duplicate processing, and returns the existing operation ID.

---

## 22. Security Invariants (Mandatory Verification Criteria)

Any implementation of account deletion in Phase 9C.4 must satisfy these 14 security invariants:

1. **INVARIANT 1 (Fail-Closed PostgREST Writes):** After `profiles.is_deleted = true` is committed, no normal user-authenticated write (messages, claims, evidence, arguments, reactions, saves, preferences) may succeed, even while an access JWT remains unexpired.
2. **INVARIANT 2 (RPC Privilege Boundary):** The database deletion RPC cannot be directly invoked by ordinary browser clients (`EXECUTE` revoked from `authenticated`).
3. **INVARIANT 3 (Strict Self-Targeting):** A deletion operation can only target the authenticated caller's own account derived from the server session.
4. **INVARIANT 4 (Governance Immortality):** Admin, moderator, and system owner accounts cannot self-delete.
5. **INVARIANT 5 (Verified Storage Ownership):** A storage object is enqueued for deletion only when ownership by `target_user_id` is verified against the canonical namespace.
6. **INVARIANT 6 (Handle Immortality):** Retired usernames are archived permanently and can never be claimed by any new registrant.
7. **INVARIANT 7 (Private Retirement Registry):** The retired-handle registry is private to the database and cannot be publicly enumerated.
8. **INVARIANT 8 (Step-Up Replay Prevention):** Step-up authentication proofs are single-use and destroyed upon deletion initiation.
9. **INVARIANT 9 (Step-Up Binding):** Step-up proofs are cryptographically bound to the intended user, session, and deletion operation.
10. **INVARIANT 10 (Epistemic Continuity):** Published discourse (claims, evidence, messages, arguments, inquiries) permanently survives account deletion.
11. **INVARIANT 11 (Non-Destructive De-Identification):** Personal identity is eradicated without deleting relational foreign-key anchors.
12. **INVARIANT 12 (Stateless JWT Realism):** In-flight JWT validity is never treated as proof of active authorization for a deleted account.
13. **INVARIANT 13 (Checkpoint Resilience):** Deletion background reconcilers are retry-safe and recover cleanly via durable checkpoint timestamps.
14. **INVARIANT 14 (Accountability Preservation):** Historical administrative audit records and moderator actions are never destroyed by user deletion.

---

## 23. Legal & Operator Dependencies

1. **Legal Counsel Dependency:** Legal counsel must approve the Privacy Policy disclosure regarding the retention of disabled external OAuth technical identifiers (`auth.identities`) under GDPR Article 17(3)(e) (legal and security defense) and statutory record retention.
2. **Operator Dependency:** Production deployment requires configuring `SUPABASE_SERVICE_ROLE_KEY` and `DISCORA_OWNER_USER_ID` in server-only environment variables.
3. **PITR Runbook:** Operations team must adopt the post-restore deletion reconciliation runbook.

---

## 24. Implementation Phase Boundaries (Phases A through H)

Implementation of Phase 9C.4 must proceed through these 8 discrete, sequential gates:

- **Phase A (Schema Hygiene & Safeguards):** Create `retired_handles` (private), add `is_deleted` column to `profiles`, create `is_active_user()` helper, update `has_room_write_access` and RLS write policies, decouple `admin_audit_logs.admin_id` cascade.
- **Phase B (Deletion RPC & Privilege Boundaries):** Implement `execute_account_deletion` with `service_role` only EXECUTE grant, `FOR UPDATE` lock, handle retirement, signal purge, and avatar prefix validation.
- **Phase C (Storage Worker):** Implement lease-based asynchronous storage cleanup queue worker.
- **Phase D (Server Action & GoTrue Admin APIs):** Implement `deleteCurrentUserAccount` Server Action with step-up verification, global signOut, updateUserById scramble, and soft-delete.
- **Phase E (Danger Zone UX Activation):** Activate `DangerZonePanel` button, build step-up modal and confirmation phrase input (`"DELETE MY ACCOUNT"`).
- **Phase F (Invariant & Regression Testing):** Automated tests asserting all 14 security invariants.
- **Phase G (Failure & Crash-Recovery Testing):** Simulated fault-injection tests verifying reconciler recovery across failure checkpoints A through E.
- **Phase H (Production Verification & Sign-Off):** Read-only QA on staging/preview deployment prior to production release.

---

## 25. Verification Requirements

Prior to merging Phase 9C.4:
1. Automated Playwright test verifying that a user with an active in-flight JWT receives 403/401 when attempting direct PostgREST writes after deletion.
2. Database test verifying that `supabase.rpc('execute_account_deletion')` called by an `authenticated` client fails with `42501 (permission denied)`.
3. Storage test verifying that setting `profiles.avatar_url` to a victim's URL does not delete the victim's storage object.
4. Privacy test verifying that `anon` querying `public.retired_handles` receives `permission denied`.

---

## 26. Explicit Non-Goals

The following items are explicitly out of scope for Phase 9C.4:
- Cascading hard-deletion of user discourse nodes (prohibited by Option C).
- Re-opening debates or claim revisions upon author deletion.
- Instantaneous invalidation of global Cloudflare edge CDN caches.
- Direct database mutation of `auth.*` tables (prohibited by Supabase architecture).
- Deletion of administrative accounts while holding active roles.

---
*End of Authoritative Implementation Specification.*
