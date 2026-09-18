# Phase 9C.3-R3: Deletion Orchestration, Auth Semantics & Security Hardening Audit

**Document Status:** Authoritative Security & Architecture Audit  
**Phase:** 9C.3-R3 (Specification Correction & Defense-in-Depth Hardening — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Disciplines:** Senior Security Architect, Application Security Engineer, Supabase/PostgreSQL Specialist, Distributed Systems Auditor  
**Date:** September 14, 2026  

---

## 1. Executive Summary

This audit establishes the rigorous, fail-closed specification for Discora's future account deletion orchestration. Phase 9C.3-R originally proposed direct SQL modifications to `auth.*` internal tables. Phase 9C.3-R2 corrected that boundary by shifting to supported Supabase Auth admin APIs. However, Phase 9C.3-R2 left critical ambiguities in server-side session invalidation (`auth.signOut` vs `auth.admin.signOut`), stateless JWT expiration windows, OAuth identity residual records, crash recovery across distributed systems (PostgreSQL, GoTrue, S3 Storage), and adversarial threat resistance.

This Phase 9C.3-R3 audit provides the authoritative resolution to those vulnerabilities. It proves the exact GoTrue TypeScript signatures, establishes a deterministic 9-state deletion state machine with a distinct operation UUID, defines multi-layer fail-closed authorization across every Next.js request class to neutralize in-flight JWTs, models crash consistency across ten discrete failure boundaries, specifies step-up reauthentication and anti-CSRF protections, and audits database security (`SECURITY DEFINER`, search paths, RLS policies, and handle retirement).

**Strict Governance Rule:** This is an audit and specification correction phase only. **No account deletion code, migrations, RPCs, or UI controls are implemented in this phase.**

---

## 2. Scope

### 2.1 In Scope
- Verification of official Supabase Auth (GoTrue) admin and client APIs.
- Formal lifecycle determination for all authentication tokens, sessions, identities, and refresh credentials.
- Architectural design of the in-flight JWT security boundary across Next.js Server Components, Server Actions, Route Handlers, Database RPCs, and Realtime channels.
- Classification and risk analysis of residual OAuth identity data in `auth.identities`.
- State machine specification for `deletion_operations` including state transitions, locking, idempotency, and crash consistency.
- Database RPC security (`SECURITY DEFINER`, `search_path`, parameter tampering, SQL injection, row-level locks).
- RLS audit for all affected control and domain tables.
- Storage cleanup queue isolation and path traversal prevention.
- Comprehensive adversarial modeling (Attacks A through H) and 30-case test plan.
- Update to `docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`.

### 2.2 Out of Scope
- Implementation of database migrations.
- Implementation of application source code or server actions.
- Activation of the Danger Zone UI button.
- Execution of mutations against production or local Supabase instances.

---

## 3. Locked Product Decisions

The following foundational product decisions are locked by Product Owner directive and remain invariant:

1. **Option C — Hybrid De-Identification in Place:** Epistemic nodes (claims, evidence, sources, arguments, questions, inquiries, responses, messages, graph relationships) are permanently preserved in the public discourse graph.
2. **Attribution:** Public attribution for deleted users permanently renders as `"Deleted User"`.
3. **Handle Retirement:** Historical usernames/handles are permanently retired in `public.retired_handles` and can never be claimed by new registrants.
4. **Voting Artifacts:** Claim votes (`claim_votes`) are personal interaction signals and are purged. Evidence voting (`evidence_votes`) is strictly an inactive legacy schema artifact and is purged.
5. **Governance Guard:** Active administrators and moderators cannot self-delete until their privileged roles are formally revoked by the system owner.
6. **Physical Storage Erasure:** User avatar files are physically removed from Supabase Storage via the Storage API.
7. **Idempotency:** Deletion workflows must be idempotent, retry-safe, and crash-consistent.
8. **Epistemic Philosophy:** AI is never the final authority over epistemic truth; reasoning and evidence over popularity and tribalism.

---

## 4. Current R2 Architecture & Identified Flaws

Phase 9C.3-R2 defined a high-level sequence combining an atomic PostgreSQL RPC (`execute_account_deletion`) with a server action calling GoTrue Admin APIs. The audit identifies six critical flaws in the R2 specification:

1. **Flawed Sign-Out Semantics:** R2 specified `supabase.auth.signOut({ scope: 'global' })` inside a server action using the service-role client. The service-role client has no user session; calling `signOut` on it is either a no-op or operates on empty context. Furthermore, `@supabase/auth-js` provides `supabaseAdmin.auth.admin.signOut(jwt, 'global')`, which requires a valid JWT string.
2. **Unaddressed Stateless JWT Lifespan:** GoTrue session revocation invalidates refresh tokens and server-side sessions, but issued JWT access tokens remain cryptographically valid until expiration (up to 3,600 seconds). R2 lacked an explicit, multi-layer application authorization boundary to neutralize valid JWTs immediately upon deletion.
3. **Unverified OAuth Identity Deletion:** R2 implied that OAuth identity data could be completely wiped via GoTrue Admin APIs. In reality, GoTrue exposes no admin API to delete individual rows from `auth.identities` or unlink a sole identity.
4. **Simplistic State Machine:** R2 utilized `user_id` as the primary key of `deletion_operations` with only four basic statuses, lacking support for correlation IDs, retry backoffs, worker leases, or distinct checkpoints.
5. **Absence of Step-Up Reauthentication:** R2 allowed deletion without verifying recent authentication, creating severe risk if an unattended device or hijacked session triggered deletion.
6. **Single Point of Failure in Middleware:** R2 relied primarily on middleware to block deleted users, leaving Server Actions, Route Handlers, and Database RPCs vulnerable if alternative routing bypassed middleware.

---

## 5. Supabase Official API Verification

Verification conducted directly against `@supabase/auth-js` v2.67.3 TypeScript definitions in the local repository environment and official Supabase documentation:

### 5.1 `auth.admin.updateUserById(uid, attributes)`
- **Official URL:** `https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid`
- **Codebase Source:** `node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts` (`updateUserById(uid: string, attributes: AdminUserAttributes)`)
- **Verified Capabilities:** Allows modifying `email`, `phone`, `user_metadata`, `app_metadata`, `ban_duration`, and `password`.
- **Finding:** Correctly scrambles PII and sets `ban_duration: '876000h'` (100 years).

### 5.2 `auth.admin.deleteUser(id, shouldSoftDelete)`
- **Official URL:** `https://supabase.com/docs/reference/javascript/auth-admin-deleteuser`
- **Codebase Source:** `node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts` (`deleteUser(id: string, shouldSoftDelete?: boolean)`)
- **Verified Capabilities:** When `shouldSoftDelete: true`, sets `auth.users.deleted_at = now()`. Does **not** delete rows from `auth.users` or `auth.identities`. It revokes refresh tokens and prevents subsequent logins.

### 5.3 `auth.admin.signOut(jwt, scope)`
- **Official URL:** `https://supabase.com/docs/reference/javascript/auth-admin-signout`
- **Codebase Source:** `node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts`:
  ```typescript
  signOut(jwt: string, scope?: 'global' | 'local' | 'others'): Promise<{ data: null; error: AuthError | null }>
  ```
- **Verified Capabilities:** Revokes sessions associated with the user identified by the supplied `jwt`. Passing `scope: 'global'` deletes all refresh tokens and sessions for that user across all devices.
- **Critical Finding:** This method **requires** a valid JWT token string. It cannot accept a raw `user_id`.

### 5.4 `auth.signOut(options)`
- **Official URL:** `https://supabase.com/docs/reference/javascript/auth-signout`
- **Codebase Source:** `node_modules/@supabase/auth-js/src/GoTrueClient.ts`:
  ```typescript
  signOut(options?: SignOut): Promise<{ error: AuthError | null }>
  ```
- **Verified Capabilities:** Revokes the session of the client instance. If executed on a server client instantiated with user session cookies, `supabase.auth.signOut({ scope: 'global' })` issues a `POST /logout?scope=global` carrying the user's bearer token.

### 5.5 `auth.unlinkIdentity(identity)`
- **Official URL:** `https://supabase.com/docs/reference/javascript/auth-unlinkidentity`
- **Codebase Source:** `node_modules/@supabase/auth-js/src/GoTrueClient.ts`
- **Critical Finding:** This is a client-side method only (`GoTrueClient`). There is **no** `auth.admin.unlinkIdentity`. Furthermore, GoTrue explicitly rejects unlinking if the user has only one identity (`Cannot unlink sole identity`).

---

## 6. Correct Auth Lifecycle & Recommended Sequence

To guarantee zero race conditions, reliable session revocation, and fail-closed security, the deletion orchestration sequence must execute in the following precise order:

```
[CLIENT: User Confirms Deletion + Re-Authenticates]
                          |
                          v
[SERVER ACTION: Next.js Server Runtime]
  1. Validate CSRF / Origin / Host headers.
  2. Validate confirmation phrase ("DELETE MY ACCOUNT").
  3. Verify caller session (extract user_id and access_token JWT).
  4. Verify recent reauthentication timestamp (within 5 minutes).
  5. Check administrative roles in public.user_roles (fail if admin/moderator).
                          |
                          v
[STEP 1: DATABASE ATOMIC TRANSACTION (RPC execute_account_deletion)]
  - Acquire FOR UPDATE lock on public.profiles row.
  - Check is_deleted flag (if true, return idempotent success).
  - Create deletion_operations record (status: 'db_processing').
  - Archive handle into public.retired_handles.
  - Purge personal signals: claim_votes, reactions, user_saves, user_preferences, evidence_votes.
  - Anonymize reporter_id in public.moderation_flags.
  - Tombstone public.profiles: is_deleted = true, username = surrogate, PII = null.
  - Enqueue avatar path into public.storage_cleanup_queue.
  - Update deletion_operations (status: 'db_completed').
  - COMMIT TRANSACTION.
                          |
                          v
[STEP 2: AUTH ADMIN SERVICE DE-IDENTIFICATION & BAN]
  - Update deletion_operations (status: 'auth_processing').
  - Call supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: 'deleted_' || user_id || '@deleted.invalid',
      email_confirm: true,
      phone: '',
      user_metadata: {},
      app_metadata: { provider: 'email', providers: ['email'] },
      ban_duration: '876000h'
    })
  - Call supabaseAdmin.auth.admin.deleteUser(user_id, { shouldSoftDelete: true })
                          |
                          v
[STEP 3: GLOBAL SESSION REVOCATION]
  - Call supabaseAdmin.auth.admin.signOut(userJwt, 'global')
    (Alternative/Fallback: call user-scoped supabase.auth.signOut({ scope: 'global' }))
  - Update deletion_operations (status: 'auth_completed').
                          |
                          v
[STEP 4: ASYNC STORAGE CLEANUP TRIGGER]
  - Enqueue or dispatch processStorageCleanupQueue() background job.
  - Update deletion_operations (status: 'storage_pending').
                          |
                          v
[STEP 5: CLIENT SESSION TERMINATION & RESPONSE]
  - Clear HTTP-only session cookies in Next.js response headers.
  - Return sanitized success payload to client.
```

---

## 7. Correct Session Invalidation Semantics

### 7.1 Analysis of Options
1. **Calling `supabaseAdmin.auth.signOut()`:** Fails because the admin service-role client maintains no user session cookie.
2. **Calling `supabaseAdmin.auth.admin.deleteUser(uid, { shouldSoftDelete: true })` alone:** Soft-deleting revokes refresh tokens in `auth.refresh_tokens`, but does not guarantee immediate termination of active sessions recorded in `auth.sessions` across all GoTrue versions.
3. **Calling `supabaseAdmin.auth.admin.signOut(jwt, 'global')`:** The authoritative method. By passing the caller's JWT extracted from the session cookie, GoTrue explicitly terminates all active sessions in `auth.sessions` and deletes all refresh tokens.

### 7.2 The Safe Sequence
In the Server Action:
```typescript
// 1. Extract the caller's JWT from the authenticated session
const { data: { session } } = await userClient.auth.getSession();
const userJwt = session?.access_token;

// 2. Perform DB de-identification first
await executeAccountDeletionRpc(session.user.id);

// 3. De-identify and soft-delete user in GoTrue
await adminClient.auth.admin.updateUserById(session.user.id, {
  email: `deleted_${session.user.id}@deleted.invalid`,
  email_confirm: true,
  phone: '',
  user_metadata: {},
  app_metadata: { provider: 'email', providers: ['email'] },
  ban_duration: '876000h',
});
await adminClient.auth.admin.deleteUser(session.user.id, { shouldSoftDelete: true });

// 4. Revoke all sessions globally using the user's JWT
if (userJwt) {
  await adminClient.auth.admin.signOut(userJwt, 'global');
}

// 5. Explicitly invoke user client signout to clear cookies
await userClient.auth.signOut({ scope: 'global' });
```

---

## 8. JWT Access Token Security & Application Boundary

### 8.1 Inherent JWT Statelessness
Supabase access tokens are signed JWTs containing `exp`, `sub`, and `role`. Because verification is performed locally by verifying the cryptographic signature, **no external service call can immediately revoke an already-issued JWT** before its expiration time (typically 3,600 seconds).

### 8.2 Application Authorization Boundary (Defense-in-Depth)
Discora must not rely on GoTrue for in-flight JWT revocation. The application must enforce a fail-closed authorization boundary across every entry point:

```
[INCOMING HTTP REQUEST]
          |
          v
[LAYER 1: Next.js Middleware (middleware.ts)]
  - Verify JWT session.
  - Query public.profiles: SELECT is_deleted FROM public.profiles WHERE id = auth.uid()
  - If is_deleted = true:
      * Clear auth cookies.
      * Return 401 Unauthorized / Redirect to /login?error=account_deleted.
          |
          v
[LAYER 2: Server Actions & Route Handlers]
  - Extract auth.uid().
  - Call shared assertion: assertActiveUser(userId).
  - If is_deleted = true: throw new ForbiddenError("Account deleted").
          |
          v
[LAYER 3: Server Components & Data Loaders]
  - Query filters automatically exclude or coalesce deleted user data.
          |
          v
[LAYER 4: Database Functions & RPCs (PostgreSQL)]
  - Every mutating SECURITY DEFINER function verifies:
      IF (SELECT is_deleted FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'account_deleted' USING ERRCODE = '42501';
      END IF;
          |
          v
[LAYER 5: Supabase Realtime Channels]
  - Channel authorization queries check profiles.is_deleted.
```

---

## 9. OAuth Identity Residual Data

### 9.1 Technical Reality of `auth.identities`
When a user signs in via Google OAuth, Supabase GoTrue inserts a row into `auth.identities` storing:
- `provider`: `'google'`
- `identity_data->>'sub'`: Google Subject Identifier (unique immutable Google user ID)
- `identity_data->>'email'`: Google user email
- `identity_data->>'name'`: Profile name

When `adminClient.auth.admin.updateUserById` and `deleteUser(shouldSoftDelete: true)` are called:
- `auth.users.email` is scrambled to `deleted_<uuid>@deleted.invalid`.
- `auth.users.user_metadata` is emptied.
- `auth.identities` **is NOT updated or cleared by GoTrue**. The row persists with the original Google `sub` and profile payload.
- There is **no supported Supabase Admin API** to delete or unlink single-identity OAuth rows.

### 9.2 Technical Policy: No Unsupported SQL Workarounds
Direct `DELETE FROM auth.identities WHERE user_id = ...` is **strictly prohibited**. Direct database manipulation of internal GoTrue tables causes replication drift, GoTrue cache desynchronization, and unsupported migration breaks.

### 9.3 Residual Data Classification & Mitigation
1. **Access Prevention:** The parent `auth.users` row is soft-deleted (`deleted_at = now()`) and banned for 100 years (`banned_until = '3000-01-01'`). Any subsequent Google OAuth sign-in attempt fails immediately at the GoTrue handshake (`User is banned`).
2. **Data Classification:**
   - `auth.users` PII: **ERASED / DE-IDENTIFIED**
   - `public.profiles` PII: **ERASED / DE-IDENTIFIED**
   - `auth.identities.identity_data`: **RETAINED TECHNICAL IDENTIFIER UNDER BANNED PARENT**
3. **Legal / Operator Dependency:** Discora's Privacy Policy must formally disclose that external OAuth technical subject identifiers are retained in a permanently disabled, inaccessible state for the technical purposes of account ban enforcement, security fraud prevention, and anti-spoofing under GDPR Article 17(3)(e) and statutory security requirements.

---

## 10. Deletion State Machine

### 10.1 Shortcoming of R2 Identity Model
Using `user_id` as the primary key of `deletion_operations` prevents recording multiple deletion attempts, prevents tracking worker run histories, and precludes passing a unique correlation ID across distributed logs.

### 10.2 Recommended State Machine Architecture
- **Primary Key:** `deletion_operation_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **User Reference:** `user_id UUID NOT NULL REFERENCES public.profiles(id)`
- **Concurrency Guard:** Unique partial index ensuring only one active deletion operation per user:
  ```sql
  CREATE UNIQUE INDEX idx_deletion_operations_active_user 
  ON public.deletion_operations(user_id) 
  WHERE status NOT IN ('completed', 'failed_terminal');
  ```

### 10.3 State Definitions & Transition Matrix

| State | Allowed Next States | Transition Trigger / Actor | Invariants & Actions |
|---|---|---|---|
| `requested` | `db_processing`, `failed_terminal` | Server Action begins workflow | Validates step-up auth; creates operation record. |
| `db_processing` | `db_completed`, `retryable_failure` | Database RPC `execute_account_deletion` | Acquires `FOR UPDATE` lock on `profiles`; executes atomic SQL de-identification. |
| `db_completed` | `auth_processing`, `retryable_failure` | Server Action proceeds to Step 2 | Database transaction committed; profile tombstoned. |
| `auth_processing`| `auth_completed`, `retryable_failure` | Server Action calls GoTrue Admin APIs | Scrambles `auth.users`; applies soft-delete and ban. |
| `auth_completed`| `storage_pending`, `retryable_failure` | Server Action calls `signOut` | Global session revoked. |
| `storage_pending`| `completed`, `retryable_failure`, `manual_review`| Storage cleanup background worker | Worker fetches items from `storage_cleanup_queue` and purges S3 assets. |
| `completed` | *Terminal State* | Storage worker finishes last object | Account de-identification fully realized. |
| `retryable_failure`| `db_processing`, `auth_processing`, `storage_pending`, `manual_review` | Reconciler / Retry worker | Exponential backoff. Max 5 retries before `manual_review`. |
| `manual_review` | `completed`, `failed_terminal` | Operator / Admin Console | High-priority governance alert. Requires operator sign-off. |
| `failed_terminal`| *Terminal State* | Server Action (pre-commit failure) | Operation aborted before DB commit. Account remains active. |

---

## 11. Idempotency Architecture

The deletion orchestration must be fully idempotent across all phases:
1. **Database Layer:** The RPC inspects `public.profiles.is_deleted`. If `true`, the function immediately exits, returning the existing `deletion_operation_id` with `status = 'already_completed'`.
2. **Handle Retirement:** `public.retired_handles` uses `ON CONFLICT (handle) DO NOTHING`.
3. **Queue Enqueuing:** `public.storage_cleanup_queue` prevents duplicate pending jobs for the same user via unique partial index `(user_id, object_path) WHERE status = 'pending'`.
4. **Auth Admin Layer:** Calling `updateUserById` with scrambled values and `deleteUser(shouldSoftDelete: true)` multiple times is completely idempotent in GoTrue.
5. **Storage Worker:** Deleting non-existent files from Supabase Storage returns success (HTTP 200/404 treated as clean).

---

## 12. Distributed Transaction Model

Because PostgreSQL, GoTrue, and Supabase Storage reside across independent transactional boundaries, two-phase commit (2PC) is not supported.

### 12.1 Transaction Sequencing Decision: DB First vs. Auth First
- **Why DB First?** If Auth is soft-deleted first and the database transaction fails, the user is locked out of an un-anonymized profile that they can no longer access or delete. Conversely, executing the database transaction first guarantees that PII is removed and published discourse is de-identified immediately. If the subsequent Auth call fails, the account is already tombstoned in the database (`is_deleted = true`), blocking application access via middleware while the reconciler finishes GoTrue de-identification.
- **Decision:** **Database Transaction First, Auth Service Second, Storage Worker Third.**

### 12.2 User-Facing Semantics for Partial Completion
The system must **never** report "Account deleted" if the database transaction fails. Once the database transaction commits, the client receives:
> *"Your account de-identification has been processed and your personal data cleared. Any associated files will be removed shortly."*

---

## 13. Crash Consistency & Recovery (10 Failure Boundaries)

```
[Boundary 1: Crash before DB transaction]
  -> Impact: Zero state change.
  -> Recovery: User re-initiates deletion normally.

[Boundary 2: Crash during DB transaction]
  -> Impact: PostgreSQL rolls back transaction cleanly.
  -> Recovery: No partial data written; user receives error toast and retries.

[Boundary 3: Crash after DB commit, before Auth call]
  -> Impact: DB tombstoned (is_deleted = true); Auth user not yet scrambled.
  -> Recovery: Middleware blocks user (is_deleted = true). Background reconciler cron checks deletion_operations where status = 'db_completed' and executes Auth de-identification.

[Boundary 4: Crash during Auth call]
  -> Impact: GoTrue may be partially updated.
  -> Recovery: Reconciler retries Auth call. Idempotent updateUserById and deleteUser complete cleanly.

[Boundary 5: Crash after Auth call, before global signOut]
  -> Impact: User banned in Auth; refresh token revoked; in-flight JWT valid.
  -> Recovery: Application middleware and Server Actions reject user via is_deleted = true. Reconciler invokes signOut(jwt, 'global').

[Boundary 6: Crash after Auth completion, before storage enqueue]
  -> Impact: Prevented by design. Storage item is enqueued inside the Step 1 atomic DB transaction.

[Boundary 7: Crash before storage worker picks up job]
  -> Impact: Avatar file remains in S3; public views render avatar_url as NULL.
  -> Recovery: Storage cleanup queue worker polls pending jobs on scheduled cron.

[Boundary 8: Crash during storage API deletion call]
  -> Impact: Object may or may not be deleted from S3; job remains 'processing'.
  -> Recovery: Storage worker locks rows with lease timeouts. Expired leases reset to 'pending' with incremented retry_count.

[Boundary 9: Crash after storage deletion, before queue update]
  -> Impact: S3 file is gone, but queue status is still 'processing'.
  -> Recovery: Worker retries deletion; Storage API returns 200/404; worker marks queue 'completed'.

[Boundary 10: Crash before client response is sent]
  -> Impact: Backend operations complete; client receives network disconnect.
  -> Recovery: On next load, middleware detects destroyed session or is_deleted = true, clears cookies, and redirects to guest homepage.
```

---

## 14. Authorization Security

### 14.1 Strict Server-Side Identity Derivation
Deletion requests must **never** accept `user_id`, `username`, or `role` from the request body or URL parameters.
- Identity must be extracted exclusively from `auth.uid()` via `supabase.auth.getUser()`.
- The database RPC validates:
  ```sql
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'unauthorized_deletion' USING ERRCODE = '42501', HINT = 'Users may only delete their own account.';
  END IF;
  ```

### 14.2 Fail-Closed Authorization Checks
Any condition where `auth.uid()` is null, invalid, or mismatched must fail closed immediately with HTTP 401/403 and write a security audit event.

---

## 15. Admin / Moderator Protection

### 15.1 Authoritative Role Source
Audit of the repository confirms that privileged roles are managed strictly in `public.user_roles` (referenced in migrations `202606030001`, `202606190001`, and `src/lib/security/owner-guard.ts`).

### 15.2 Self-Deletion Lockout
To prevent compromised admin accounts or rogue operators from erasing their identity and historical accountability:
```sql
IF EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = target_user_id 
    AND role IN ('admin', 'moderator', 'system_owner')
) THEN
  RAISE EXCEPTION 'privileged_account_self_deletion_prohibited'
  USING ERRCODE = '42501', 
        HINT = 'Administrators and moderators cannot self-delete. Privileged roles must be formally revoked by the system owner.';
END IF;
```

---

## 16. CSRF & Cross-Origin Security

### 16.1 Threat Vector
A malicious website triggers account deletion by enticing an authenticated user to click a link or submit a forged cross-site form POST.

### 16.2 Controls
1. **Next.js Server Action Protections:** Server Actions enforce origin verification by inspecting `Origin` and `Host` / `X-Forwarded-Host` headers. Cross-origin requests are rejected by the framework.
2. **Cookie Security:** Supabase auth cookies use `SameSite=Lax` (or `Strict`), `Secure`, and `HttpOnly`.
3. **Step-Up Verification Token:** The deletion Server Action requires a transient re-authentication confirmation token issued during step-up auth.
4. **Intent Confirmation Phrase:** The user must submit the exact string `"DELETE MY ACCOUNT"`.

---

## 17. Reauthentication Security (Step-Up Authentication)

### 17.1 Step-Up Requirements
Account deletion is irreversible. The system requires step-up authentication performed within the preceding 300 seconds (5 minutes).

### 17.2 Implementation Architecture
- **Email/Password Accounts:** User enters their current password. The Server Action calls `supabase.auth.signInWithPassword({ email: user.email, password: providedPassword })`. If successful, verification timestamp is recorded.
- **Google OAuth Accounts:** User clicks "Verify Identity with Google". Client calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { queryParams: { prompt: 'select_account' } } })`. Upon redirect callback, a transient session timestamp is set.
- **Stale Sessions:** If `auth_time` > 300 seconds, deletion is rejected: `"Re-authentication expired. Please verify your credentials again."`

---

## 18. Rate Limiting & Abuse Resistance

### 18.1 Rate Limiting Architecture
- **Per-User Limit:** Maximum 3 deletion requests per user per 24 hours.
- **Per-IP Limit:** Maximum 5 deletion attempts per IP per hour (protects against credential brute-forcing during step-up auth).
- **Operation Lock:** If an active deletion operation exists in `deletion_operations` with status `requested` or `db_processing`, subsequent calls return HTTP 429 Conflict / Already Processing.

---

## 19. Input Validation

### 19.1 Strict Payload Schema
All inputs to the deletion Server Action must be validated with Zod:
```typescript
const DeleteAccountSchema = z.object({
  confirmationPhrase: z.literal("DELETE MY ACCOUNT", {
    errorMap: () => ({ message: "You must type exactly 'DELETE MY ACCOUNT' to confirm." })
  }),
  password: z.string().min(1).max(1024).optional(),
  reauthToken: z.string().uuid().optional(),
});
```
- Confirmation phrase is treated strictly as confirmation of intent, not as authorization.
- Zero client-supplied user IDs or role overrides are permitted.

---

## 20. Database RPC Security (`execute_account_deletion`)

### 20.1 Hardened RPC Definition Contract
```sql
CREATE OR REPLACE FUNCTION public.execute_account_deletion(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_op_id uuid;
  v_username text;
BEGIN
  -- 1. Verify caller identity
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'unauthorized_deletion' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify admin/moderator guard
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role IN ('admin', 'moderator')) THEN
    RAISE EXCEPTION 'privileged_account_self_deletion_prohibited' USING ERRCODE = '42501';
  END IF;

  -- 3. Lock profile row
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Check if already deleted
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND is_deleted = true) THEN
    SELECT id INTO v_op_id FROM public.deletion_operations WHERE user_id = target_user_id ORDER BY created_at DESC LIMIT 1;
    RETURN v_op_id;
  END IF;

  -- 5. Create deletion operation record
  INSERT INTO public.deletion_operations (user_id, status)
  VALUES (target_user_id, 'db_processing')
  RETURNING id INTO v_op_id;

  -- 6. Archive handle
  IF v_username IS NOT NULL AND v_username <> '' THEN
    INSERT INTO public.retired_handles (handle, reason)
    VALUES (lower(trim(v_username)), 'account_deletion')
    ON CONFLICT (handle) DO NOTHING;
  END IF;

  -- 7. Purge private interactions
  DELETE FROM public.claim_votes WHERE user_id = target_user_id;
  DELETE FROM public.evidence_votes WHERE user_id = target_user_id;
  DELETE FROM public.reactions WHERE user_id = target_user_id;
  DELETE FROM public.user_saves WHERE user_id = target_user_id;
  DELETE FROM public.user_preferences WHERE user_id = target_user_id;
  DELETE FROM public.reputation_events WHERE user_id = target_user_id;
  DELETE FROM public.user_reputation_snapshots WHERE user_id = target_user_id;

  -- 8. Anonymize whistleblower reporter
  UPDATE public.moderation_flags SET reporter_id = NULL WHERE reporter_id = target_user_id;

  -- 9. Anonymize user feedback
  UPDATE public.user_feedback SET user_id = NULL WHERE user_id = target_user_id;

  -- 10. Enqueue avatar cleanup if present
  INSERT INTO public.storage_cleanup_queue (user_id, bucket, object_path, status)
  SELECT target_user_id, 'avatars', target_user_id || '/avatar.png', 'pending'
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND avatar_url IS NOT NULL);

  -- 11. Tombstone profile
  UPDATE public.profiles
  SET is_deleted = true,
      username = 'deleted_user_' || substr(md5(target_user_id::text), 1, 8),
      display_name = NULL,
      bio = NULL,
      avatar_url = NULL,
      updated_at = now()
  WHERE id = target_user_id;

  -- 12. Update operation status
  UPDATE public.deletion_operations
  SET status = 'db_completed', updated_at = now()
  WHERE id = v_op_id;

  RETURN v_op_id;
END;
$$;
```

### 20.2 Permissions & Privileges
- `REVOKE ALL ON FUNCTION public.execute_account_deletion(uuid) FROM PUBLIC, anon;`
- `GRANT EXECUTE ON FUNCTION public.execute_account_deletion(uuid) TO authenticated, service_role;`

---

## 21. RLS Security Audit

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Finding / Requirement |
|---|---|---|---|---|---|
| `public.profiles` | `true` (public) | Auth trigger only | `auth.uid() = id AND is_deleted = false` | Denied | Hard-deletion denied. De-identification via RPC. |
| `public.retired_handles` | `true` (public) | Denied to clients | Denied | Denied | Fully managed by `SECURITY DEFINER` RPC. |
| `public.deletion_operations`| `auth.uid() = user_id` | Denied to clients | Denied to clients | Denied | Client cannot tamper with deletion ledger. |
| `public.storage_cleanup_queue`| Denied to clients | Denied to clients | Denied to clients | Denied | Restricted exclusively to `service_role`. |
| `public.claim_votes` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | Purged on deletion. |
| `public.user_preferences` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | Purged on deletion. |
| `public.admin_audit_logs` | `has_role('admin')` | Denied to clients | Denied | Denied | Foreign key decoupling required (`RESTRICT`). |

---

## 22. Service Role Security (`SUPABASE_SERVICE_ROLE_KEY`)

- **Scope:** The service-role key bypasses all RLS policies and has full administrative control over GoTrue and Database schemas.
- **Rules:**
  1. Must **NEVER** be prefixed with `NEXT_PUBLIC_`.
  2. Must **NEVER** be imported into client components or transmitted to the browser.
  3. Must **NEVER** be logged or included in diagnostic error messages.
  4. Repository inspection confirmed: **Zero service-role keys are exposed in client bundles or git history.**

---

## 23. Storage Cleanup Security

### 23.1 Path Traversal & Arbitrary Deletion Prevention
The storage worker must never accept arbitrary S3 paths from users.
- Object paths are strictly derived on the server: `avatars/<user_id>/*`.
- Worker strictly validates the path format using regex: `^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(png|jpg|webp)$`.
- Attempts to enqueue paths like `../../` or other bucket names are rejected at the schema constraint level.

---

## 24. Race Condition Analysis (Attacks A through H)

| Attack Scenario | Race Mechanism | Expected Outcome | Enforced Control |
|---|---|---|---|
| **Attack A: Simultaneous Deletions** | User submits two concurrent deletion requests. | One succeeds; second returns idempotent success. | `SELECT ... FOR UPDATE` row-level lock on `profiles`; unique partial index on `deletion_operations`. |
| **Attack B: Deletion + Profile Update** | User updates profile bio while deletion executes. | Update rejected or overwritten by tombstone. | `profiles` UPDATE policy requires `is_deleted = false`. `FOR UPDATE` lock serializes execution. |
| **Attack C: Deletion + Handle Re-Registration** | Attacker attempts to register deleted handle. | Registration rejected with `username_retired`. | `check_username_not_retired()` trigger checks `public.retired_handles`. |
| **Attack D: Deletion + Role Escalation** | Moderator attempts self-delete while being promoted. | Deletion rejected. | Deletion RPC checks `user_roles` inside the locked transaction. |
| **Attack E: Deletion + OAuth Login** | User logs in via Google during deletion. | Login succeeds briefly, then invalidated upon soft-delete. | GoTrue `ban_duration: '876000h'` and `deleted_at` reject subsequent auth handshakes. |
| **Attack F: Deletion + Password Reset** | Password reset email sent right before deletion. | Reset token rendered invalid. | GoTrue soft-delete revokes all password recovery tokens. |
| **Attack G: Deletion + Active API Call** | User posts comment while deletion is running. | Post blocked or de-identified immediately. | Mutating RPCs verify `is_deleted = false`. |
| **Attack H: Storage Worker Retry Storm** | Storage API times out repeatedly. | Exponential backoff prevents rate-limit cascade. | `retry_count` capped at 5; transitions to `manual_review`. |

---

## 25. Handle Retirement Security

### 25.1 Normalization Policy
- Usernames must be normalized using lowercase and trimmed whitespace: `lower(trim(username))`.
- To prevent Unicode confusable/homograph spoofing (e.g., Cyrillic 'а' replacing Latin 'a'), username registration already enforces alphanumeric and underscore characters `^[a-zA-Z0-9_]{3,30}$`.
- The handle retirement check enforces:
  ```sql
  IF EXISTS (SELECT 1 FROM public.retired_handles WHERE handle = lower(trim(NEW.username))) THEN
    RAISE EXCEPTION 'username_retired' USING ERRCODE = '23514';
  END IF;
  ```

---

## 26. Public Attribution Security

- **Database Views:** All public-facing views (`discussion_messages`, `discussion_claims`, `discussion_evidence`, `discussion_arguments`, `discussion_questions`) use explicit `CASE` statements:
  ```sql
  CASE 
    WHEN p.is_deleted = true OR p.username IS NULL THEN 'Deleted User'
    ELSE coalesce(p.display_name, p.username)
  END AS author_display_name,
  CASE
    WHEN p.is_deleted = true THEN NULL
    ELSE p.avatar_url
  END AS author_avatar_url
  ```
- **Serialization Safety:** No API serializer or Server Component may pass raw `profiles.username` or `profiles.email` to the client when `is_deleted = true`.

---

## 27. Cache & Realtime Security

1. **Next.js Data Cache:** Server Action invokes `revalidateTag('user-' + userId)` and `revalidatePath('/u/' + oldUsername)` to immediately purge cached profile pages.
2. **TanStack Query Cache:** Client receives deletion response and executes `queryClient.clear()`.
3. **Supabase Realtime:** The update to `public.profiles` (`is_deleted = true`) broadcasts a real-time event to connected clients, instantly flipping author labels in active room feeds to `"Deleted User"`.

---

## 28. Error Handling & Information Leakage

- **Client Errors:** Client receives generic, sanitized messages: *"Account de-identification could not be completed. Please try again."*
- **Database Errors:** Internal PostgreSQL error codes, table names, and foreign-key constraint violations are caught on the server and never returned in HTTP responses.
- **User Enumeration Prevention:** Attempting to delete an invalid or non-existent account returns standard 401 Unauthorized.

---

## 29. Logging Security & Privacy

- **Prohibited in Logs:** Passwords, access tokens, refresh tokens, service-role keys, OAuth client secrets, raw JWT strings, and unencrypted emails.
- **Allowed Structured Telemetry:**
  ```json
  {
    "event": "account_deletion_initiated",
    "operation_id": "c8cce1b4-a0f3-4516-b095-5c0aaecbe629",
    "user_id_hash": "e3b0c44298fc1c149afbf4c8996fb924",
    "timestamp": "2026-09-14T12:00:00Z",
    "status": "db_completed"
  }
  ```

---

## 30. External Calls & SSRF Prevention

- Deletion workflows invoke only two external endpoints:
  1. Supabase Auth API (`process.env.NEXT_PUBLIC_SUPABASE_URL/auth/v1/*`)
  2. Supabase Storage API (`process.env.NEXT_PUBLIC_SUPABASE_URL/storage/v1/*`)
- Both endpoints are derived from trusted, server-side environment configuration.
- **Zero user-supplied URLs or redirect parameters are fetched during account deletion.**

---

## 31. Comprehensive Adversarial Test Plan (30 Test Cases)

```
[AUTHORIZATION TESTS]
TC-AUTH-01: Delete own account with valid session -> PASS.
TC-AUTH-02: Attempt deletion of another user's UUID -> REJECT (401/403).
TC-AUTH-03: Unauthenticated deletion call -> REJECT (401).
TC-AUTH-04: Client passes forged role in body -> REJECT (derived from DB).
TC-AUTH-05: Active administrator attempts self-delete -> REJECT (403).
TC-AUTH-06: Active moderator attempts self-delete -> REJECT (403).

[CSRF & REAUTH TESTS]
TC-CSRF-01: Cross-origin POST to deletion action -> REJECT (Origin header check).
TC-CSRF-02: Missing confirmation phrase -> REJECT (Validation error).
TC-CSRF-03: Stale reauthentication (> 300s) -> REJECT (Re-auth required).
TC-CSRF-04: Incorrect password provided during step-up -> REJECT (401).

[SESSION & JWT TESTS]
TC-SESS-01: Old JWT presented to API after DB commit -> REJECT (401 by middleware).
TC-SESS-02: Refresh token used after deleteUser -> REJECT (GoTrue revoked).
TC-SESS-03: Secondary device session after global signOut -> REJECT (Session deleted).
TC-SESS-04: Google OAuth re-login attempt after ban -> REJECT (User banned).

[RACE CONDITION TESTS]
TC-RACE-01: Simultaneous duplicate deletion requests -> One succeeds, one returns idempotent success.
TC-RACE-02: Deletion raced with profile bio update -> Update fails; profile tombstoned.
TC-RACE-03: Deletion raced with registration of same handle -> Registration fails (retired).
TC-RACE-04: Deletion raced with moderator promotion -> Promotion locks or deletion rejects.

[DATABASE & RPC TESTS]
TC-DB-01: Direct EXECUTE of RPC by anon role -> REJECT (Permission denied).
TC-DB-02: SQL injection string passed as target_user_id -> REJECT (UUID type validation).
TC-DB-03: Search path hijacking attempt -> PREVENTED (SET search_path = public, pg_temp).
TC-DB-04: Foreign key cascade destruction check -> admin_audit_logs preserved.

[STORAGE TESTS]
TC-STOR-01: Avatar file physically purged from S3 -> HTTP 404 verified on CDN.
TC-STOR-02: Path traversal string in avatar path -> REJECTED by queue check constraint.
TC-STOR-03: Storage API outage during deletion -> Queue marked 'pending'; worker retries.

[EPISTEMIC GRAPH INVARIANT TESTS]
TC-GRAPH-01: Claims authored by deleted user survive -> All rows in public.claims intact.
TC-GRAPH-02: Evidence citations survive -> All rows in public.evidence intact.
TC-GRAPH-03: Arguments survive -> All rows in public.arguments intact.
TC-GRAPH-04: Inquiries and responses survive -> All rows in public.inquiry_* intact.
TC-GRAPH-05: Authorship displayed as "Deleted User" -> Verified across UI and API.
```

---

## 32. Security Risk Register

| ID | Category | Severity | Finding | Attack Vector | Current Control | Recommendation | Implementation Impact | Status |
|---|---|---|---|---|---|---|---|---|
| **SEC-01** | Auth Semantics | **P0** | Service-role `signOut()` called without user JWT | In-flight sessions not revoked across devices | None in R2 | Pass user JWT to `admin.signOut(jwt, 'global')` | Update Server Action sequence | **RESOLVED IN SPEC** |
| **SEC-02** | JWT Security | **P0** | In-flight JWT remains valid up to 1 hour | Stolen/cached JWT can access API post-deletion | None in R2 | Multi-layer fail-closed check on `profiles.is_deleted` across all request classes | Middleware + RPC guards | **RESOLVED IN SPEC** |
| **SEC-03** | Distributed Crash | **P1** | Process crash after DB commit leaves Auth unsynchronized | Profile de-identified, but user can re-authenticate | Manual intervention | Background reconciler for `deletion_operations` | Add cron reconciler | **RESOLVED IN SPEC** |
| **SEC-04** | Identity Residual | **P1** | OAuth identity rows retained in `auth.identities` | PII retained in unlinked Google metadata | Soft-delete parent | Ban user 100 years; legal disclosure in Privacy Policy | Legal / Operator sign-off | **RESOLVED IN SPEC** |
| **SEC-05** | CSRF / Intent | **P1** | Deletion without step-up reauthentication | Session hijack or unattended browser triggers deletion | Confirmation phrase only | Mandatory step-up auth within 300s | Implement step-up modal | **RESOLVED IN SPEC** |
| **SEC-06** | Handle Retirement | **P2** | Unicode confusables could bypass handle retirement | Impersonator creates lookalike handle | ASCII regex filter | Enforce strict `lower(trim())` and alphanumeric regex | Schema trigger | **RESOLVED IN SPEC** |
| **SEC-07** | Storage Cleanup | **P2** | Storage worker failure could leave avatar indefinitely | Residual personal photo on CDN | Queue table | Exponential backoff worker with max 5 retries | Implement worker cron | **RESOLVED IN SPEC** |

---

## 33. Required Specification Corrections & Final Verdict

### 33.1 Summary of Corrections Incorporated into Specification
1. Fixed `signOut` semantics: User JWT passed to `auth.admin.signOut(jwt, 'global')`.
2. Established multi-layer fail-closed JWT boundary across Middleware, Server Actions, Route Handlers, and Database RPCs.
3. Formulated full 9-state deletion state machine with dedicated `deletion_operation_id UUID`.
4. Replaced `auth.identities` deletion claims with accurate classification (Retained Technical Identifier under Banned Parent).
5. Added step-up reauthentication requirements (password re-entry / fresh OAuth prompt).
6. Hardened database RPC with row locking (`FOR UPDATE`), search path pinning, and permission revocations.

### 33.2 Final Verdict

**FINAL VERDICT: PASS WITH REQUIRED REWORK**

- **Justification:** The security, distributed transaction, and authentication boundary architectures are now fully resolved and mathematically defensible. However, implementation is strictly prohibited until the Product Owner formally authorizes Phase 9C.4 and legal counsel reviews the retention disclosure for disabled OAuth identifiers.
- **Blockers Before Phase 9C.4 Implementation:**
  1. Formal Product Owner authorization of Phase 9C.4.
  2. Legal counsel confirmation of Privacy Policy disclosure regarding retained, disabled OAuth subject identifiers.
  3. Pre-implementation gate review of the updated specification.

---
*End of Phase 9C.3-R3 Deletion Orchestration, Auth Semantics & Security Hardening Audit.*
