# Phase 9C.3-R3.1: Auth Ordering, Destructive-Operation Security & Specification Correction Audit

**Document Status:** Authoritative Security & Architecture Audit  
**Phase:** 9C.3-R3.1 (Security Review & Specification Correction — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Disciplines:** Senior Security Architect, Application Security Engineer, Supabase/PostgreSQL Specialist, Distributed Systems Auditor  
**Date:** September 14, 2026  

---

## 1. Executive Summary

This audit performs a strict security and specification correction pass over the Phase 9C.3-R3 account deletion architecture. While Phase 9C.3-R3 successfully shifted Discora away from unsupported direct `auth.*` SQL mutations toward supported GoTrue Admin APIs, critical operational flaws and security ambiguities remained:
1. **Unsafe Auth Operation Ordering:** R3 sequenced `updateUserById` and `deleteUser(soft)` *before* `admin.signOut(userJwt, 'global')`. Because GoTrue's `/logout` endpoint validates the caller's JWT against the user record, calling `signOut` on an already soft-deleted or banned user risks failure, leaving active sessions unrevoked across other devices.
2. **Unsupported Instant JWT Revocation Claims:** Access tokens in Supabase are stateless JWTs. No GoTrue API can revoke an already-issued JWT before its expiration (`exp`, up to 3,600s). In-flight protection requires a multi-layer application authorization boundary.
3. **Insecure Step-Up Authentication Proofs:** R3 accepted client-supplied timestamps for step-up authentication. This audit establishes a server-generated, cryptographically bound, single-use proof with a 300-second TTL.
4. **Hardcoded Storage Path Assumptions:** R3 assumed a fixed avatar path (`avatars/<user_id>/avatar.png`). Discora actually supports variable extensions (`.png`, `.jpg`, `.jpeg`, `.webp`), and OAuth users often possess external URLs (e.g., `lh3.googleusercontent.com`) that do not exist in Supabase Storage.
5. **State Machine Inconsistency:** R3 referred to a "9-state" machine while defining 10 states. This audit formally establishes the 10-state machine with explicit transition guards.
6. **Conflation of Legal and Technical Claims:** R3 made assertions regarding statutory compliance (e.g., asserting GDPR Article 17(3)(e) applicability). This audit strictly separates technical facts, engineering controls, and legal classifications requiring operator/counsel confirmation.
7. **Absolute Security Language:** R3 contained claims of absolute security ("guarantees zero race conditions", "mathematically defensible"). These have been replaced with defensible security engineering terminology.

**Governance Mandate:** This phase is strictly an audit and specification correction. **No account deletion code, migrations, RPCs, or UI controls are implemented.**

---

## 2. Governance Status

- **Product Philosophy:** Discora remains invariant:
  - *Understanding over engagement*
  - *Evidence over popularity*
  - *Reasoning over tribalism*
  - *Human judgment over AI authority*
  - *Intellectual growth over winning*
- **Epistemic Invariant:** Published epistemic discourse (claims, evidence citations, sources, arguments, questions, inquiries, responses, messages, graph relationships) is permanently preserved under Option C (Hybrid De-Identification in Place).
- **Public Attribution:** Permanently attributed as `"Deleted User"`.
- **Implementation Status:** Phase 9C.4 implementation is **NOT AUTHORIZED**.

---

## 3. Scope

### 3.1 In Scope
- Correct sequencing of GoTrue Admin APIs and session revocation.
- Verification of `@supabase/auth-js` source code in `node_modules` and official Supabase documentation.
- Defense-in-depth application boundary across Next.js Middleware, Server Actions, Route Handlers, Database RPCs, and Realtime channels.
- Server-side step-up authentication proof architecture.
- Extraction of trusted pre-deletion storage paths from stored profile data.
- Formal 10-state deletion state machine.
- Separation of application audit logs from statutory/infrastructure telemetry.
- Replacement of absolute security claims with defensible engineering language.
- Update to [`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md).

### 3.2 Out of Scope
- Code implementation in `src/`.
- Database migration creation in `supabase/migrations/`.
- Danger Zone UI activation in `src/features/settings/components/settings-page-client.tsx`.
- Direct mutations to Supabase Auth or PostgreSQL data.

---

## 4. Documents Audited

- [`docs/DISCORA_AGENT_GOVERNANCE.md`](file:///d:/Projects/Discora/docs/DISCORA_AGENT_GOVERNANCE.md)
- [`docs/00_MASTER_CONTEXT.md`](file:///d:/Projects/Discora/docs/00_MASTER_CONTEXT.md)
- [`docs/04_DATABASE_DESIGN.md`](file:///d:/Projects/Discora/docs/04_DATABASE_DESIGN.md)
- [`docs/05_SYSTEM_ARCHITECTURE.md`](file:///d:/Projects/Discora/docs/05_SYSTEM_ARCHITECTURE.md)
- [`docs/07_API_DESIGN.md`](file:///d:/Projects/Discora/docs/07_API_DESIGN.md)
- [`docs/PHASE_9C3_ACCOUNT_DELETION_ARCHITECTURE_AUDIT.md`](file:///d:/Projects/Discora/docs/PHASE_9C3_ACCOUNT_DELETION_ARCHITECTURE_AUDIT.md)
- [`docs/PHASE_9C3R_ACCOUNT_DELETION_ARCHITECTURE_CORRECTION_AUDIT.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_ARCHITECTURE_CORRECTION_AUDIT.md)
- [`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md)
- [`docs/PHASE_9C3R3_DELETION_ORCHESTRATION_SECURITY_AUDIT.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R3_DELETION_ORCHESTRATION_SECURITY_AUDIT.md)

---

## 5. Repository Components Audited

- `src/services/supabase/middleware.ts`: Verified existing path filtering (`skipProfileCheck`). Discovered that `/api/` and `/settings` currently bypass profile checks, confirming that middleware alone cannot guarantee JWT lockout without updates and defense-in-depth.
- `src/services/supabase/server.ts` & `client.ts`: Verified client creation patterns.
- `src/features/profiles/services/profile-service.ts`: Inspected `uploadAvatar()` (lines 172–230). Verified path format `${userId}/avatar.${extension}` and storage public URL generation.
- `src/features/auth/services/auth-service.ts`: Inspected authentication routines (`loginWithEmail`, `loginWithGoogle`, `logout`).
- `src/features/settings/components/settings-page-client.tsx`: Verified `DangerZonePanel` (lines 430–467). Confirmed the button is `disabled` and deletion is not active.
- `node_modules/@supabase/auth-js/src/GoTrueAdminApi.ts`: Verified implementation of `signOut`, `deleteUser`, and `updateUserById`.
- `node_modules/@supabase/auth-js/src/GoTrueClient.ts`: Verified `_signOut()` and `unlinkIdentity()`.

---

## 6. Supabase Version & API Verification

Verification conducted directly against installed `@supabase/auth-js` v2.67.3 and official Supabase documentation:

| API Method | Exact Signature in Codebase | Source File & Line | Verified Behavior & Constraints | Official Citation |
|---|---|---|---|---|
| `auth.admin.signOut` | `signOut(jwt: string, scope?: SignOutScope): Promise<{ data: null; error: AuthError \| null }>` | `GoTrueAdminApi.ts:142` | Issues `POST /logout?scope=${scope}` with `jwt` as Bearer token. Revokes sessions in `auth.sessions` and refresh tokens across devices. **Requires valid JWT; does not accept bare `userId`.** | `https://supabase.com/docs/reference/javascript/auth-admin-signout` |
| `auth.admin.deleteUser` | `deleteUser(id: string, shouldSoftDelete?: boolean): Promise<UserResponse>` | `GoTrueAdminApi.ts:839` | Issues `DELETE /admin/users/${id}` with `{ should_soft_delete: true }`. Sets `deleted_at = now()`. Does **not** modify `auth.identities` or wipe PII. | `https://supabase.com/docs/reference/javascript/auth-admin-deleteuser` |
| `auth.admin.updateUserById` | `updateUserById(uid: string, attributes: AdminUserAttributes): Promise<UserResponse>` | `GoTrueAdminApi.ts:778` | Modifies `email`, `phone`, `user_metadata`, `app_metadata`, `ban_duration`, `password`. Sets `banned_until = '3000-01-01'`. | `https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid` |
| `auth.signOut` | `signOut(options?: SignOut): Promise<{ error: AuthError \| null }>` | `GoTrueClient.ts:3876` | Issues `POST /logout` using client session. If executed on a service-role client, it operates on an empty session and is ineffective. | `https://supabase.com/docs/reference/javascript/auth-signout` |
| `auth.unlinkIdentity` | `unlinkIdentity(identity: UserIdentity): Promise<{ error: AuthError \| null }>` | `GoTrueClient.ts:4012` | Client-side only. Throws error on sole identity (`Cannot unlink sole identity`). **No Admin API equivalent exists.** | `https://supabase.com/docs/reference/javascript/auth-unlinkidentity` |

---

## 7. Auth Operation Ordering Analysis

### 7.1 Flaw in Phase 9C.3-R3 Ordering
R3 specified:
`DB commit -> updateUserById -> deleteUser(soft) -> admin.signOut(userJwt, 'global')`

**Critical Vulnerability:**  
`admin.signOut(jwt, 'global')` issues `POST /logout?scope=global` sending the user's JWT in the Authorization header. GoTrue authenticates the JWT against `auth.users`. If the user has already been soft-deleted (`deleted_at IS NOT NULL`) or banned (`banned_until > now()`), GoTrue's auth middleware may reject the `/logout` request with `401 Unauthorized` or `403 Forbidden` (`User is banned` / `User not found`). This leaves the user's active sessions in `auth.sessions` and refresh tokens unrevoked across other devices.

### 7.2 Corrected Authoritative Sequence
The session revocation must be executed while the GoTrue user account is still active, immediately following the atomic database de-identification:

```
1. PRE-FLIGHT VALIDATION
   - Validate CSRF Origin / Host headers
   - Verify server-side step-up authentication proof (< 300s)
   - Verify confirmation phrase ("DELETE MY ACCOUNT")
   - Extract caller user_id and access_token JWT from session cookie

2. ATOMIC DATABASE TRANSACTION (RPC execute_account_deletion)
   - Acquire FOR UPDATE lock on public.profiles
   - Verify is_deleted = false
   - Create public.deletion_operations row (status: 'db_processing')
   - Archive handle to public.retired_handles
   - Purge private interactions (claim_votes, reactions, saves, prefs, reputation)
   - Anonymize reporter_id in moderation_flags
   - Extract trusted avatar object path from profiles.avatar_url
   - Enqueue avatar path in public.storage_cleanup_queue
   - Tombstone public.profiles (is_deleted = true, surrogate username, PII = NULL)
   - Update deletion_operations (status: 'db_completed')
   - COMMIT TRANSACTION

3. AUTH SESSION REVOCATION (GoTrue Admin API)
   - Call adminClient.auth.admin.signOut(userJwt, 'global')
   - GoTrue authenticates JWT, purges auth.sessions globally, deletes refresh tokens
   - Update deletion_operations (status: 'auth_processing')

4. AUTH IDENTITY SCRUBBING & BAN (GoTrue Admin API)
   - Call adminClient.auth.admin.updateUserById(user_id, {
       email: 'deleted_' || user_id || '@deleted.invalid',
       email_confirm: true,
       phone: '',
       user_metadata: {},
       app_metadata: { provider: 'email', providers: ['email'] },
       ban_duration: '876000h'
     })
   - Call adminClient.auth.admin.deleteUser(user_id, { shouldSoftDelete: true })
   - Update deletion_operations (status: 'auth_completed')

5. STORAGE ASSET PURGE TRIGGER
   - Dispatch processStorageCleanupQueue() background job
   - Update deletion_operations (status: 'storage_pending')

6. CLIENT TERMINATION & RESPONSE
   - Clear HTTP-only session cookies in Next.js response headers
   - Return sanitized success payload to client
```

---

## 8. Session Revocation Semantics

- **Refresh Tokens:** Revoked globally by `admin.signOut(userJwt, 'global')` and reinforced by `deleteUser(shouldSoftDelete: true)`. Subsequent attempts to refresh an access token fail at GoTrue.
- **`auth.sessions` Table:** All active session rows for the target user are purged by `admin.signOut(userJwt, 'global')`.
- **Caller Session:** Cleared in the client response via `Set-Cookie` expiration headers.
- **Service-Role Isolation:** The service-role client never invokes `auth.signOut()` without a JWT; it uses `auth.admin.signOut(userJwt, 'global')`.

---

## 9. JWT In-Flight Security Boundary

### 9.1 Stateless Access Token Reality
Supabase access tokens are cryptographically signed JWTs with a fixed expiration (`exp`, default 3,600s). Once issued, **no API call to Supabase can magically invalidate an already-issued JWT locally verified by public key**. If an attacker possesses a copied JWT, it remains cryptographically valid until `exp` expires.

### 9.2 Discora Defense-in-Depth Boundary
Discora neutralizes in-flight JWTs by enforcing application-level fail-closed gates across five layers:

```
[HTTP REQUEST WITH VALID JWT]
               |
               v
[LAYER 1: Next.js Middleware (middleware.ts)]
  - Extracts auth.uid() from session.
  - Queries public.profiles: SELECT is_deleted FROM public.profiles WHERE id = auth.uid()
  - CRITICAL FIX: Must NOT skip /api/ or /settings when an authenticated session is present.
  - If is_deleted = true:
      * Immediately clears cookies in response.
      * Returns 401 Unauthorized (for API) or redirects to /login?error=account_deleted.
               |
               v
[LAYER 2: Server Actions & Route Handlers]
  - Invokes shared assertActiveUser(userId):
      const profile = await getProfile(userId);
      if (!profile || profile.is_deleted) throw new ForbiddenError("Account deleted");
               |
               v
[LAYER 3: Server Components & Data Loaders]
  - Database queries automatically join on profiles and apply is_deleted filtering.
               |
               v
[LAYER 4: Database Functions & RPCs (PostgreSQL)]
  - Every mutating SECURITY DEFINER RPC verifies:
      IF (SELECT is_deleted FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'account_deleted' USING ERRCODE = '42501';
      END IF;
               |
               v
[LAYER 5: Supabase Realtime Channels]
  - Realtime RLS policies and channel authorization queries reject connections from profiles where is_deleted = true.
```

---

## 10. Step-Up Authentication Security

### 10.1 Inadequacy of R3 Proposal
Phase 9C.3-R3 suggested a timestamp check (`Date.now() - reauth_time < 300000`). If client-supplied, this is trivial to forge via browser developer tools or modified request payloads.

### 10.2 Server-Verifiable Step-Up Proof Contract
Step-up authentication must produce a server-verifiable, cryptographically signed, single-use proof:

1. **Email / Password Accounts:**
   - The user enters their current password directly in the deletion confirmation modal.
   - The Server Action executes:
     ```typescript
     const { error } = await verifyClient.auth.signInWithPassword({
       email: session.user.email!,
       password: input.password,
     });
     if (error) throw new UnauthorizedError("Incorrect password.");
     ```
   - Password verification occurs on the server at the exact instant of deletion. No transient timestamp or token is needed; verification is synchronous.

2. **Google OAuth Accounts:**
   - Google users have no password in GoTrue.
   - Reauthentication requires redirecting to Google OAuth with `prompt=select_account`.
   - **Required Architecture:**
     - The server generates a high-entropy random challenge: `stepup_challenge = crypto.randomUUID()`.
     - The challenge is stored in a server-side HttpOnly cookie (`discora_stepup`) signed with `HMAC-SHA256(challenge, SECRET)` and bound to `user_id`, with a strict 300-second TTL.
     - Upon successful OAuth callback, the server marks the challenge as verified.
     - The deletion Server Action reads and verifies the signed cookie, checks that `user_id` matches, and **immediately deletes the cookie** upon initiation (single-use semantics).
   - **Implementation Dependency:** Because this requires modifying `/auth/callback` to handle step-up callback states, it is documented as a formal prerequisite for Phase 9C.4.

---

## 11. OAuth Identity Residual Data

### 11.1 Technical Fact vs. Legal Classification

- **Technical Fact:**  
  When an account is de-identified via `updateUserById` and `deleteUser(shouldSoftDelete: true)`, GoTrue does not remove the corresponding row in `auth.identities`. The row retains the external OAuth provider identifier (`google`) and subject ID (`sub`). There is no supported Supabase Admin API to delete single-identity rows in `auth.identities`. Direct SQL `DELETE FROM auth.identities` is strictly prohibited because it violates GoTrue's internal state management.
- **Engineering Control:**  
  The parent user in `auth.users` is soft-deleted (`deleted_at = now()`) and banned for 100 years (`banned_until = '3000-01-01'`). Any subsequent OAuth login attempt using that Google account is rejected at the GoTrue handshake (`User is banned`).
- **Legal Classification (Requires Counsel Confirmation):**  
  Engineering cannot declare that this configuration "satisfies GDPR Article 17(3)(e)". Whether retaining disabled technical identifiers under a banned parent user is legally acceptable as a fraud-prevention/security measure is a legal policy decision. Legal counsel and platform operators must formally review and approve this disclosure in the Privacy Policy before Phase 9C.4.

---

## 12. Deletion State Machine Correction

### 12.1 State Count Resolution
Phase 9C.3-R3 referred to a "9-state" machine in section headers but listed 10 states in its table. This audit resolves the inconsistency: **The architecture is formally a 10-state machine**.

### 12.2 The 10-State Formal Model

```
                    [requested]
                         |
                         v (Server Action validates pre-flight)
                   [db_processing]
                         |
                         +---> [retryable_failure] ---> [db_processing]
                         |           |
                         |           v (exceeded 5 retries)
                         |     [manual_review]
                         v (DB RPC commits)
                   [db_completed]
                         |
                         v (Server Action initiates Auth)
                  [auth_processing]
                         |
                         +---> [retryable_failure] ---> [auth_processing]
                         v (signOut + updateUserById + deleteUser complete)
                  [auth_completed]
                         |
                         v (Storage job enqueued)
                  [storage_pending]
                         |
                         +---> [retryable_failure] ---> [storage_pending]
                         v (Storage worker deletes S3 objects)
                    [completed] (Terminal Success)

* [failed_terminal]: Reached if pre-flight checks fail before DB transaction begins.
```

### 12.3 Complete Transition Matrix

| Current State | Allowed Next States | Trigger / Actor | Invariants & Actions |
|---|---|---|---|
| `requested` | `db_processing`, `failed_terminal` | Server Action | Pre-flight validation, rate limit check, step-up proof verification. |
| `db_processing` | `db_completed`, `retryable_failure` | Database RPC `execute_account_deletion` | Acquires `FOR UPDATE` lock on `profiles`; executes atomic de-identification. |
| `db_completed` | `auth_processing`, `retryable_failure` | Server Action / Reconciler | DB committed; profile tombstoned. Ready for GoTrue operations. |
| `auth_processing`| `auth_completed`, `retryable_failure` | Server Action / Reconciler | Invokes `signOut(jwt, 'global')`, then `updateUserById`, then `deleteUser(soft)`. |
| `auth_completed`| `storage_pending`, `retryable_failure` | Server Action / Reconciler | Auth de-identification and session revocation complete. |
| `storage_pending`| `completed`, `retryable_failure`, `manual_review` | Storage Cleanup Worker | Worker claims job with lease; deletes S3 objects. |
| `completed` | *Terminal State* | Storage Cleanup Worker | All personal data cleared; discourse de-identified; assets purged. |
| `retryable_failure`| `db_processing`, `auth_processing`, `storage_pending`, `manual_review` | Background Reconciler | Exponential backoff. Transitions to `manual_review` if retries > 5. |
| `manual_review` | `completed`, `failed_terminal` | Operator / Admin Console | High-priority governance alert. Requires operator investigation. |
| `failed_terminal`| *Terminal State* | Server Action | Aborted before database mutation. Account remains active and unmodified. |

---

## 13. Storage Path Security

### 13.1 Flaw in Fixed Path Assumption
Phase 9C.3-R3 assumed a fixed avatar path: `avatars/<user_id>/avatar.png`.
Audit of `src/features/profiles/services/profile-service.ts` revealed:
1. Uploaded avatars use dynamic extensions: `${userId}/avatar.${extension}` where extension is determined by MIME type (`png`, `jpg`, `jpeg`, `webp`).
2. Users authenticating via Google OAuth may have `profiles.avatar_url` pointing to an external Google CDN (e.g., `https://lh3.googleusercontent.com/...`), which is **not stored in Supabase Storage**.

### 13.2 Hardened Storage Extraction Contract
- **No Fixed Filename Assumption:** The database RPC extracts the exact `avatar_url` from `public.profiles` *before* nullifying the field.
- **External URL Detection:** If `avatar_url` does not contain the Discora Supabase Storage endpoint (e.g., `lh3.googleusercontent.com`), no storage cleanup job is enqueued. The URL is simply nullified in the database.
- **Trusted Path Derivation:** If `avatar_url` is a Supabase Storage asset, the exact object path (e.g., `${userId}/avatar.webp`) is parsed from the URL and validated against:
  ```sql
  CHECK (object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(png|jpg|jpeg|webp)$')
  ```
- **Zero Client Input:** No client-supplied path is accepted. All cleanup paths are derived exclusively from verified database rows.

---

## 14. RLS & `SECURITY DEFINER` Review

- **Search Path Pinning:** The RPC must explicitly pin search path: `SET search_path = public, pg_temp;` to eliminate search path hijacking attacks.
- **Row Locking:** `SELECT username INTO v_username FROM public.profiles WHERE id = target_user_id FOR UPDATE;` prevents concurrent modifications while the transaction executes.
- **Permission Revocation:**
  ```sql
  REVOKE ALL ON FUNCTION public.execute_account_deletion(uuid) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.execute_account_deletion(uuid) TO authenticated, service_role;
  ```
- **Table RLS:**
  - `public.deletion_operations`: Clients may `SELECT` only where `auth.uid() = user_id`. `INSERT`, `UPDATE`, and `DELETE` are denied to clients.
  - `public.retired_handles`: Public `SELECT` allowed; mutations denied to clients (managed exclusively by `SECURITY DEFINER` RPC).
  - `public.storage_cleanup_queue`: Completely denied to clients; restricted exclusively to `service_role`.

---

## 15. CSRF & Origin Security

- **Server Action Protection:** Next.js Server Actions automatically inspect `Origin` and `Host` / `X-Forwarded-Host` headers to prevent cross-site form submissions.
- **Cookie Flags:** Supabase session cookies use `SameSite=Lax`, `Secure`, and `HttpOnly`.
- **Confirmation Phrasing:** The user must explicitly submit the exact confirmation string `"DELETE MY ACCOUNT"`.

---

## 16. Rate Limiting & Abuse Resistance

- **Endpoint Rate Limiting:** Maximum 3 deletion requests per user per 24 hours; maximum 5 attempts per IP per hour.
- **Active Operation Lock:** The unique partial index on `public.deletion_operations(user_id) WHERE status NOT IN ('completed', 'failed_terminal')` rejects duplicate concurrent requests at the database engine level.

---

## 17. Cache & Realtime Security

- **Next.js Data Cache:** The Server Action calls `revalidateTag('user-' + userId)` and `revalidatePath('/u/' + oldUsername)` to purge cached profile pages across all Next.js edge nodes.
- **TanStack Query Cache:** The client clears all cached queries (`queryClient.clear()`) upon receiving the deletion response.
- **Realtime Broadcast:** The update to `public.profiles` (`is_deleted = true`) broadcasts an update event, immediately updating author labels to `"Deleted User"` for all connected participants in active rooms.

---

## 18. Logging & Audit Separation

Previous documentation conflated application audit logs with statutory compliance records. This audit establishes strict boundary separation:

| Category | Table / Target | Purpose & Retention | Content & Constraints |
|---|---|---|---|
| **1. Application Governance Logs** | `public.admin_audit_logs` | Platform operational history (moderation, role changes). | Retained permanently. Admin FK decoupled to `ON DELETE RESTRICT` to prevent accidental loss. |
| **2. Deletion Operation Telemetry** | `public.deletion_operations` | Orchestration state machine tracking and reconciler progress. | Retained for 90 days post-completion, then pruned. |
| **3. Security Infrastructure Logs** | Cloudflare / Vercel edge logs | Incident detection, WAF, and network security analysis. | Edge retention managed by infrastructure policy. |
| **4. Statutory Records** | Designated legal archive | Legal compliance (e.g., CERT-In / IT Rules where applicable). | **Not satisfied by application tables alone.** Managed by platform infrastructure and legal counsel policy. |

**Prohibited in All Application Logs:** Passwords, plain access tokens, refresh tokens, service-role keys, OAuth client secrets, raw JWT strings, and personal emails.

---

## 19. Crash Recovery Review

Recovery across the 10 failure boundaries:
1. **Crash before DB transaction:** Zero state change; user can retry normally.
2. **Crash during DB transaction:** PostgreSQL engine rolls back cleanly.
3. **Crash after DB commit, before Auth calls:** Profile is tombstoned (`is_deleted = true`); middleware blocks user. Background reconciler queries `deletion_operations WHERE status = 'db_completed'` and executes Auth de-identification.
4. **Crash during Auth calls:** Reconciler resumes at `auth_processing`. `updateUserById` and `deleteUser` are idempotent.
5. **Crash after Auth, before storage worker:** Prevented by design; storage job is enqueued in the atomic DB transaction.
6. **Crash during storage cleanup:** Worker uses lease locks (`lease_expires_at`). Expired leases are reset to `'pending'` and retried.
7. **Crash before client response:** Backend work completes; client discovers session terminated on next request.

---

## 20. Idempotency Review

- **Database RPC:** Inspects `profiles.is_deleted`. If `true`, immediately returns the existing `deletion_operation_id` without executing mutations.
- **Handle Registry:** `INSERT INTO public.retired_handles ... ON CONFLICT (handle) DO NOTHING;` prevents duplicate key violations.
- **Storage Cleanup:** Storage worker treats HTTP 404 from S3 as success (object already purged).
- **GoTrue Admin APIs:** Calling `updateUserById` with scrambled data and `deleteUser(shouldSoftDelete: true)` multiple times is fully idempotent.

---

## 21. Adversarial Threat Matrix

| Threat Code | Threat Description | Attack Vector | Enforced Security Control | Outcome |
|---|---|---|---|---|
| **ATM-01** | In-flight JWT Reuse | Attacker captures JWT prior to deletion; calls API post-deletion | Middleware + Server Action + RPC checks `profiles.is_deleted = true` | 401 Unauthorized / Blocked |
| **ATM-02** | Stolen Refresh Token | Attacker attempts token refresh post-deletion | `admin.signOut(jwt, 'global')` + `deleteUser(soft)` revoked refresh tokens in GoTrue | GoTrue rejects refresh |
| **ATM-03** | Stolen Device Session | Attacker uses active browser session on another device | Global signOut revoked all sessions in `auth.sessions` | Session invalidated |
| **ATM-04** | Forged Step-Up Proof | Attacker injects falsified client timestamp | Step-up proof is server-verified (password or signed HMAC cookie) | 401 Unauthorized / Rejected |
| **ATM-05** | CSRF Deletion | Malicious website submits cross-origin deletion request | Next.js Server Action Origin/Host check + SameSite cookies | Rejected by framework |
| **ATM-06** | Admin Self-Deletion | Compromised administrator attempts self-delete to destroy logs | RPC checks `public.user_roles` inside locked transaction | 403 Forbidden / Prohibited |
| **ATM-07** | Handle Hijacking | Attacker attempts to register recently deleted handle | `check_username_not_retired()` trigger checks `public.retired_handles` | Registration rejected |
| **ATM-08** | Arbitrary File Deletion | Attacker enqueues `../../` or another user's avatar path | Storage queue check constraint regex; paths derived strictly from server row | Rejected at schema level |
| **ATM-09** | Concurrent Deletions | Two deletion requests submitted simultaneously | `SELECT ... FOR UPDATE` row lock on `profiles` | Serialized; second is idempotent |
| **ATM-10** | Search Path Hijacking | Attacker creates malicious object in temporary schema | `SET search_path = public, pg_temp;` pinned on RPC | Hijack neutralized |

---

## 22. Security Risk Register

| ID | Category | Severity | Finding | Attack Vector | Current Control | Recommendation | Status |
|---|---|---|---|---|---|---|---|
| **SEC-01** | Auth Ordering | **P0** | R3 called `signOut` after user soft-delete and ban | GoTrue `/logout` rejects JWT of banned user, leaving sessions active across other devices | None in R3 | Execute `admin.signOut(userJwt, 'global')` before soft-delete/ban | **RESOLVED IN SPEC** |
| **SEC-02** | JWT Lifespan | **P0** | In-flight JWT valid up to 1 hour | Stolen/cached JWT accesses API post-deletion | None in R2/R3 | Multi-layer fail-closed check on `profiles.is_deleted` across all request classes | **RESOLVED IN SPEC** |
| **SEC-03** | Step-Up Security | **P1** | R3 accepted client timestamps for step-up auth | Attacker forges client-supplied reauth timestamp | Client state only | Server-verified password / signed HMAC challenge token | **RESOLVED IN SPEC** |
| **SEC-04** | Storage Paths | **P1** | Fixed path assumption (`avatar.png`) fails on dynamic/external URLs | Cleanup crashes on OAuth URLs or non-PNG files | Fixed string in R3 | Extract trusted path from database row; skip external URLs | **RESOLVED IN SPEC** |
| **SEC-05** | State Consistency | **P2** | State machine documentation mismatch (9 vs 10 states) | Reconciler unhandled state | Ambiguous in R3 | Formally adopt 10-state machine | **RESOLVED IN SPEC** |
| **SEC-06** | Legal Claims | **P2** | Unsupported claims of statutory compliance in engineering docs | Legal exposure regarding GDPR Art. 17 | Unverified claims in R3 | Separate technical facts from legal policy decisions | **RESOLVED IN SPEC** |
| **SEC-07** | Absolute Language | **P2** | Claims of "guarantees zero race conditions" | Undermines defensible audit integrity | Absolute terms in R3 | Replace with defensible security engineering language | **RESOLVED IN SPEC** |

---

## 23. Required Specification Changes

The following corrections must be incorporated into [`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md):
1. **Section 1.4:** Re-sequence Auth operations: `execute_account_deletion` RPC -> `admin.signOut(userJwt, 'global')` -> `updateUserById` -> `deleteUser(shouldSoftDelete: true)`.
2. **Section 4.1:** Specify server-side step-up authentication proof contract (synchronous password verification for email users; signed HMAC challenge cookie for OAuth users).
3. **Section 5:** Adopt the formal 10-state machine model (`requested`, `db_processing`, `db_completed`, `auth_processing`, `auth_completed`, `storage_pending`, `completed`, `retryable_failure`, `manual_review`, `failed_terminal`).
4. **Section 6 (Phase A):** Update `storage_cleanup_queue` to accept dynamic avatar filenames and skip non-Supabase URLs; update `deletion_operations` check constraint to 10 states.
5. **Section 6 (Phase B):** Update `execute_account_deletion` RPC to extract the trusted pre-deletion avatar path from `profiles.avatar_url` before setting it to `NULL`.
6. **Section 6 (Phase D):** Detail middleware update to eliminate `/api/` and `/settings` bypass for deleted profiles.
7. **Throughout:** Replace all absolute security assertions with defensible security engineering terminology.

---

## 24. Implementation Preconditions (Blockers Before Phase 9C.4)

Before Phase 9C.4 implementation can begin, the following preconditions must be formally met:
1. **Product Owner Authorization:** Explicit written authorization to proceed from audit to implementation.
2. **Legal Counsel Sign-Off:** Confirmation of the Privacy Policy disclosure regarding retained disabled external OAuth technical identifiers.
3. **OAuth Step-Up Callback Support:** Verification that `/auth/callback` can support transient step-up challenge verification for Google OAuth accounts.
4. **Pre-Implementation Schema Migration Review:** Verification of the Phase A migration script decoupling `admin_audit_logs.admin_id` from `ON DELETE CASCADE`.

---

## 25. Final Verdict

### Explicit Answers to Required Governance Inquiries:
- **A. Is the R3 Auth ordering safe as written?**  
  **NO.** Calling `signOut` after `deleteUser(soft)` and `updateUserById(ban)` risks GoTrue rejecting the JWT verification during logout, leaving active sessions unrevoked.
- **B. What exact ordering should Phase 9C.4 implement?**  
  **Database RPC de-identification -> `admin.signOut(userJwt, 'global')` -> `updateUserById` (PII scramble + ban) -> `deleteUser(shouldSoftDelete: true)` -> storage cleanup -> client cookie termination.**
- **C. Can an already-issued JWT be instantly revoked?**  
  **NO.** Access tokens are stateless JWTs. Application-level fail-closed checks (`profiles.is_deleted = true`) must enforce authorization lockout.
- **D. What application boundary blocks deleted users?**  
  **Multi-layer defense-in-depth: Next.js Middleware (on all authenticated paths), Server Actions (`assertActiveUser`), Database RPCs (`SECURITY DEFINER` checks), and Realtime authorization.**
- **E. Is the step-up authentication proof secure enough?**  
  **R3's proposal was INSUFFICIENT.** R3.1 specifies synchronous server-side password verification for email users and a signed, single-use HMAC challenge cookie (300s TTL) for OAuth users.
- **F. Is OAuth identity deletion supported?**  
  **NO.** Supabase exposes no admin API to delete or unlink single-identity rows in `auth.identities`.
- **G. What residual Auth data can remain?**  
  **External OAuth subject ID and provider metadata in `auth.identities` under a parent `auth.users` row permanently banned for 100 years and soft-deleted.**
- **H. Is the state machine internally consistent?**  
  **R3 was inconsistent (9 vs 10 states). R3.1 formally establishes the 10-state machine.**
- **I. Is storage deletion path-safe?**  
  **R3 was unsafe due to fixed `avatar.png` assumptions. R3.1 derives trusted paths directly from `profiles.avatar_url` before de-identification and skips external URLs.**
- **J. Are application audit logs being incorrectly treated as statutory logs?**  
  **YES in R3. R3.1 strictly separates application governance logs from statutory retention and security telemetry.**
- **K. What MUST be corrected before implementation?**  
  **All seven items listed in Section 23 must be reflected in the authoritative implementation specification.**
- **L. Is Phase 9C.4 authorized?**  
  **NO — specification correction only.**

---

**FINAL VERDICT: PASS WITH REQUIRED REWORK**

*Justification:* The architectural, cryptographic, and operational deficiencies of R3 are now fully diagnosed and corrected in this audit specification. Implementation remains strictly prohibited until the Product Owner authorizes Phase 9C.4.

---
*End of Phase 9C.3-R3.1 Security & Specification Correction Audit.*
