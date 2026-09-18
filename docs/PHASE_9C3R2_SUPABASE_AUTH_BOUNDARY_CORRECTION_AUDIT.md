# Phase 9C.3-R2: Supabase Auth Boundary Correction Audit

**Document Status:** Complete Security & Architecture Audit  
**Phase:** 9C.3-R2 (Supabase Auth Service Boundary Correction — Audit & Spec Only)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Database Engine:** PostgreSQL 15+ / Supabase Auth (GoTrue) & Supabase Storage  
**Application Framework:** Next.js 15 App Router / React 19 / TypeScript / Tailwind CSS  
**Auditor:** DeepMind Antigravity Pair-Programming Agent  
**Date:** September 14, 2026  

---

## 1. Executive Summary

During the review of the Phase 9C.3-R implementation specification, a critical architectural boundary violation was identified: the proposed account deletion workflow prescribed direct SQL manipulation of Supabase Auth internal tables (`UPDATE auth.users`, `DELETE FROM auth.identities`, `DELETE FROM auth.sessions`, `DELETE FROM auth.refresh_tokens`) inside a PostgreSQL stored procedure.

The `auth` schema in Supabase is owned and managed exclusively by the Supabase Auth service (GoTrue). Official Supabase architecture documentation explicitly warns against executing manual SQL modifications on `auth.*` tables, as doing so bypasses GoTrue internal state machines, desynchronizes memory caches, and risks breaking core authentication flows.

This Phase 9C.3-R2 audit redesigns the Auth portion of Discora's account deletion architecture to strictly respect the supported Supabase Auth API boundary. It provides:
1. An exhaustive audit of official Supabase Auth Admin APIs (`updateUserById`, `deleteUser`, `signOut`, `unlinkIdentity`).
2. An exact breakdown of supported vs. unsupported PII scrubbing methods.
3. A safe, two-phase transaction sequence separating the **Discora Database Lifecycle** (`public` schema) from the **Supabase Auth Lifecycle** (`auth` service).
4. The elimination of unsupported direct SQL operations on `auth.*` tables.
5. The formal correction of the authoritative implementation specification (`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`).

**No code was implemented, no migrations were created, and no production data was altered during this phase.**

---

## 2. Scope

- **Audit Target:** Supabase Auth service boundary, GoTrue lifecycle, and data-scrubbing mechanics during account deletion.
- **Governing Constraints:** Zero implementation; zero schema migrations; zero RLS policy modifications; zero production mutations.
- **Primary Authorities:** Current official Supabase documentation, GoTrue source behavior, and Discora product governance.

---

## 3. Authoritative Product Decisions (Locked & Unchanged)

The following Product Owner decisions are locked and remain strictly enforced throughout this audit:
1. **Option C (Hybrid De-Identification in Place):** Discora preserves the technical foreign-key anchor (UUID) to avoid destroying downstream epistemic nodes.
2. **Epistemic Graph Preservation:** Claims, evidence citations, arguments, questions, structured inquiries, and discussion messages remain permanent elements of the public discourse graph.
3. **Public Attribution:** All published contributions of deleted users dynamically display as `"Deleted User"`.
4. **Permanent Handle Retirement:** Historical usernames (e.g., `@alex`) are permanently retired in `public.retired_handles` and can never be claimed by new registrants.
5. **Private Interaction Purge:** Personal stance signals (`claim_votes`), bookmarks (`user_saves`), and private preferences are eradicated.
6. **Evidence Voting is NOT a Feature:** Evidence voting is dormant/unapproved. The `evidence_votes` table is treated strictly as a legacy schema artifact to be cleaned.
7. **Governance Accountability:** Active administrators and moderators cannot self-delete; roles must be formally revoked first to protect statutory audit trails.
8. **Asynchronous Storage Cleanup:** Personal avatar assets in `avatars/<user_id>/*` are physically purged via a retryable queue.
9. **Idempotency:** Deletion operations must be safe to retry multiple times without data corruption.
10. **Core Philosophy:** *Understanding over engagement, evidence over popularity, reasoning over tribalism, human judgment over AI authority, intellectual growth over winning.*

---

## 4. Current 9C.3-R Auth Architecture & Identified Deficiencies

The Phase 9C.3-R specification prescribed executing the following direct SQL statements within the PostgreSQL `execute_account_deletion` procedure:

```sql
-- Deficient 9C.3-R SQL proposed inside SECURITY DEFINER RPC:
update auth.users set
  email = 'deleted_' || id || '@deleted.invalid',
  raw_user_meta_data = '{}'::jsonb,
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  phone = null,
  encrypted_password = 'DELETED_ACCOUNT_INACCESSIBLE',
  banned_until = '2999-12-31 23:59:59+00'::timestamptz
where id = target_user_id;

delete from auth.identities where user_id = target_user_id;
delete from auth.sessions where user_id = target_user_id;
delete from auth.refresh_tokens where user_id = target_user_id;
```

### Architectural Deficiencies of This Approach:
1. **Bypassing GoTrue Cache:** GoTrue caches user objects, OAuth configurations, and sessions in memory. Mutating `auth.users` directly via SQL does not invalidate GoTrue internal memory state.
2. **Foreign Key Trigger Hazards:** Supabase Auth internal triggers (e.g., on `auth.users` and `auth.identities`) manage internal accounting. Direct manual deletes from `auth.identities` or `auth.sessions` can trigger unexpected cascade failures or desynchronize GoTrue's session tracking.
3. **Vendor Supportability:** Supabase's official documentation explicitly warns developers against modifying `auth.*` schema tables directly, noting that manual schema adjustments or direct updates can cause GoTrue to return 500 errors during authentication flows.

---

## 5. Supabase Official Documentation Verification

To ensure complete technical accuracy, official Supabase documentation was audited directly:

| Topic | Official Documentation URL | Key Verified Behavior |
|---|---|---|
| **Managing User Data** | [supabase.com/docs/guides/auth/managing-user-data](https://supabase.com/docs/guides/auth/managing-user-data) | The `auth` schema is reserved and managed exclusively by GoTrue. Direct SQL modification is strongly discouraged. Custom profile data must reside in `public`. |
| **Admin `updateUserById`** | [supabase.com/docs/reference/javascript/auth-admin-updateuserbyid](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) | Supported server-side method using `service_role` key. Directly updates `email`, `phone`, `user_metadata`, `app_metadata`, `password`, `ban_duration`. Does not trigger client state change events. |
| **Admin `deleteUser`** | [supabase.com/docs/reference/javascript/auth-admin-deleteuser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) | Hard delete (`shouldSoftDelete: false`) removes row and cascades to sessions. Soft delete (`shouldSoftDelete: true`) sets `deleted_at = now()`, retaining the record and hashed identifier while disabling authentication. Server-side only. |
| **Sign Out & Scopes** | [supabase.com/docs/reference/javascript/auth-signout](https://supabase.com/docs/reference/javascript/auth-signout) | `signOut({ scope: 'global' })` revokes refresh tokens across all devices. Stateless JWT access tokens remain valid until their natural expiration time (`exp`). |
| **Unlink Identity** | [supabase.com/docs/reference/javascript/auth-unlinkidentity](https://supabase.com/docs/reference/javascript/auth-unlinkidentity) | Client-side only. Requires user to be signed in and to have at least two linked identities. No administrative endpoint (`auth.admin.unlinkIdentity`) exists in the SDK. |

---

## 6. Supported Auth APIs

Supabase provides the following supported server-side administrative methods via `supabase.auth.admin` (requiring `SUPABASE_SERVICE_ROLE_KEY`):

1. **`supabase.auth.admin.updateUserById(uid, attributes)`**
   - **Supported Attributes:**
     - `email: string` (can be updated to an unroutable surrogate address).
     - `email_confirm: boolean` (set to `true` to prevent GoTrue from sending email change confirmations).
     - `phone: string` (set to empty string/null to clear phone number).
     - `phone_confirm: boolean`.
     - `user_metadata: object` (set to `{}` to clear all personal claims, full names, Google avatars).
     - `app_metadata: object` (set to `{ provider: 'email', providers: ['email'] }`).
     - `password: string` (set to an unguessable 64-character cryptographic random string).
     - `ban_duration: string` (e.g., `'876000h'` to ban the user for 100 years).

2. **`supabase.auth.admin.deleteUser(uid, { shouldSoftDelete: true })`**
   - Sets `deleted_at = now()` on `auth.users`.
   - Disables standard login and account access permanently.
   - Preserves the `auth.users` row, keeping foreign keys intact.

3. **`supabase.auth.admin.signOut(jwt, 'global')` / `supabase.auth.signOut({ scope: 'global' })`**
   - Invalidates all refresh tokens associated with the user across all sessions and devices.

---

## 7. Unsupported / Risky Direct Auth SQL

| Direct SQL Operation | Status | Architectural Risk & Consequence | Recommendation |
|---|---|---|---|
| `UPDATE auth.users SET email = ...` | **UNSUPPORTED** | Bypasses GoTrue email normalization, validation hooks, and internal caches. | **REJECT.** Use `auth.admin.updateUserById()`. |
| `UPDATE auth.users SET raw_user_meta_data = ...` | **UNSUPPORTED** | Can cause GoTrue session desynchronization. | **REJECT.** Use `auth.admin.updateUserById()`. |
| `DELETE FROM auth.sessions WHERE user_id = ...` | **RISKY / BYPASS** | Manually truncates session tables without GoTrue event emission. | **REJECT.** Use `auth.signOut({ scope: 'global' })` + application-layer gate. |
| `DELETE FROM auth.refresh_tokens WHERE ...` | **RISKY / BYPASS** | Can leave orphaned parent sessions in GoTrue. | **REJECT.** Handled automatically by GoTrue during signout / delete. |
| `DELETE FROM auth.identities WHERE user_id = ...` | **NO API EQUIVALENT** | Supabase exposes no admin API to delete identities without hard-deleting the user. | **EVALUATED BELOW (Section 10).** |

---

## 8. PII Scrubbing Analysis

### 8.1 What `auth.admin.updateUserById` Can Safely Scrub
- **Email:** Can be rewritten to an unroutable RFC 2606 surrogate: `deleted_<uuid>@deleted.invalid`. This frees up the user's original email address so they can re-register in the future if desired, while eliminating PII from `auth.users`.
- **User Metadata (`raw_user_meta_data`):** Passing `user_metadata: {}` completely wipes all OAuth provider payload data (Google name, Google avatar, given name, family name).
- **Phone:** Passing `phone: ''` clears any linked phone number.
- **Password:** Passing a fresh, random 64-byte string overwrites the password hash, ensuring previous credentials cannot be used.
- **Ban Duration:** Setting `ban_duration: '876000h'` locks the account at the GoTrue engine level.

### 8.2 What It Cannot Scrub
- `auth.users.id`: The primary key UUID is immutable (by design, this is retained as Discora's technical anchor).
- `auth.users.created_at`: Immutable timestamp.
- `auth.identities`: `updateUserById` does not alter or remove rows in `auth.identities`.

---

## 9. Auth User Deletion Analysis: Hard Delete vs. Soft Delete

### 9.1 Hard Deletion (`auth.admin.deleteUser(uid, false)`)
- **Mechanism:** Executes `DELETE FROM auth.users WHERE id = uid`.
- **Impact on Epistemic Graph:**
  - `public.arguments.created_by`: Declares `ON DELETE CASCADE`. **Hard delete destroys all published arguments authored by the user.**
  - `public.inquiry_items.created_by`: Declares `ON DELETE CASCADE`. **Hard delete destroys all inquiries authored by the user.**
  - `public.inquiry_responses.created_by`: Declares `ON DELETE CASCADE`. **Hard delete destroys all inquiry responses.**
  - `public.claims.created_by`: Protected by `enforce_claim_immutability()` trigger. Attempted `ON DELETE SET NULL` raises exception `'Claims are immutable'`, aborting the deletion transaction.
  - `public.messages.user_id`: Protected by `enforce_message_edit_rules()`. Attempted `ON DELETE SET NULL` raises exception `'user_id cannot be modified'`, aborting the transaction.
- **Verdict:** **HARD DELETION IS FATAL TO DISCORA'S KNOWLEDGE GRAPH UNDER THE CURRENT SCHEMA.** It cannot be used without altering multiple core migrations.

### 9.2 Soft Deletion (`auth.admin.deleteUser(uid, true)`)
- **Mechanism:** Executes an update setting `deleted_at = now()` in `auth.users`.
- **Impact on Epistemic Graph:**
  - The row remains in `auth.users`.
  - Zero foreign keys cascade. All published arguments, inquiries, and claims survive intact.
  - Zero immutability triggers fire.
- **Limitation:** Soft deletion alone does **NOT** scrub the user's email, phone, or metadata. If a user is soft-deleted without prior scrubbing, their email remains in `auth.users`, preventing future re-registration with that email and leaving PII in the database.
- **Verdict:** **SOFT DELETION COMBINED WITH PRIOR PII SCRUBBING IS THE APPROVED MECHANISM.**

---

## 10. Identity Removal Analysis (OAuth / Provider Identities)

### 10.1 The Supabase Identity Constraint
- In Supabase Auth, when a user registers via Google OAuth, a record is created in `auth.identities` containing the Google `sub` ID and provider profile data.
- **Is there an admin API to delete identities?** **NO.** Neither `supabase-js` nor GoTrue provides `auth.admin.deleteIdentity` or `auth.admin.unlinkIdentity`.
- **Can client-side `unlinkIdentity` be used?** **NO.** Official Supabase documentation states that `unlinkIdentity` requires the user to have at least *two* linked identities. A user who registered solely via Google OAuth cannot unlink their Google identity; the API rejects the call with an error.

### 10.2 Supported Disposition for Identities
Under supported Supabase architecture:
1. When `updateUserById` scrubs the parent user (email scrambled, metadata wiped, banned for 100 years), and `deleteUser(uid, true)` marks the user soft-deleted:
   - The user **cannot log in** using Google OAuth. GoTrue blocks authentication for banned/soft-deleted users.
   - If the user attempts to sign in via Google OAuth again with that email, GoTrue will reject the attempt or, because the email in `auth.users` was changed to `@deleted.invalid`, treat a new sign-in with the original Google email as a completely distinct, unlinked account.
2. **Residual Data Assessment:**
   - The `auth.identities` row contains a technical provider subject ID (`sub`).
   - If platform legal counsel determines that retaining the provider subject ID under a soft-deleted record is legally acceptable, **zero direct SQL on `auth.identities` is required**.
   - If legal counsel determines that `auth.identities` must be completely erased:
     - **Qualified Exception:** An explicit, isolated SQL statement `DELETE FROM auth.identities WHERE user_id = $1` can be executed within a privileged migration script.
     - **Risk:** May desynchronize GoTrue's internal identity index if the user attempts to re-authenticate before token cache expiry.
     - **Audit Recommendation:** Adhere to the supported API boundary: do **not** run direct SQL on `auth.identities`. Let the soft-deleted/banned status in GoTrue neutralize the identity.

---

## 11. Session Invalidation Analysis

### 11.1 Access Token (JWT) Persistence
- Supabase Auth utilizes stateless JWT access tokens.
- Official Supabase documentation explicitly confirms: **calling `signOut()` or deleting a user invalidates refresh tokens, but does NOT immediately invalidate an already-issued, unexpired JWT access token.**
- The issued JWT remains cryptographically valid until its expiration timestamp (default: 3,600 seconds / 1 hour).

### 11.2 Required Application-Layer Enforcement
Because Supabase Auth cannot revoke an in-flight JWT without waiting for expiration, **Discora must enforce immediate access revocation at the application layer**:
1. During the Discora database transaction, `public.profiles.is_deleted` is set to `true`.
2. Discora's Next.js middleware (`src/services/supabase/middleware.ts`) and server layouts already inspect user profile state.
3. Middleware is updated to check `profiles.is_deleted`. If `true`, the middleware immediately destroys session cookies, clears authorization headers, and redirects to `/login?error=account_deleted`.
4. This closes the 1-hour JWT window immediately at the application boundary, without requiring unsupported SQL manipulation of `auth.sessions`.

---

## 12. Recommended Auth Boundary

Discora establishes a strict, clean architectural boundary between the Discora application database and the Supabase Auth service:

```
+-----------------------------------------------------------------------------------+
|                            DISCORA ARCHITECTURAL BOUNDARY                         |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [DISCORA APPLICATION DATABASE]                 [SUPABASE AUTH SERVICE (GoTrue)]  |
|  Schema: public                                 Schema: auth                      |
|  Access: Standard / PostgreSQL RPC              Access: Supabase Auth Admin API   |
|  ---------------------------------              --------------------------------  |
|  - public.profiles                              - auth.users                      |
|  - public.retired_handles                       - auth.identities                 |
|  - public.claim_votes                           - auth.sessions                   |
|  - public.reactions                             - auth.refresh_tokens             |
|  - public.user_saves                            --------------------------------  |
|  - public.user_preferences                      APIs Used:                        |
|  - public.storage_cleanup_queue                 1. auth.admin.updateUserById()    |
|  - public.deletion_operations                   2. auth.admin.deleteUser(true)    |
|  ---------------------------------              3. auth.signOut({scope:'global'}) |
|  RPC: execute_account_deletion()                                                  |
|                                                                                   |
|  NO DIRECT SQL FROM DISCORA RPC INTO AUTH.* SCHEMA TABLES!                        |
+-----------------------------------------------------------------------------------+
```

---

## 13. Recommended End-to-End Deletion Sequence

The deletion sequence is structured as a two-phase operation orchestrated by a secure Next.js Server Action (`deleteCurrentUserAccount`):

```
[USER INITIATES DELETION IN DANGER ZONE]
                 |
                 v
+-----------------------------------------------------------------------------------+
| PHASE 1: DISCORA DATABASE TRANSACTION (Atomic PostgreSQL RPC)                     |
| Function: public.execute_account_deletion(target_user_id)                         |
| 1. Verify caller auth.uid() = target_user_id.                                     |
| 2. Verify caller is not an active admin/moderator.                                |
| 3. Acquire FOR UPDATE lock on public.profiles row.                                |
| 4. Check if already deleted (is_deleted = true) -> return idempotent success.     |
| 5. Create/update public.deletion_operations record (status: 'db_completed').      |
| 6. Insert old handle into public.retired_handles.                                 |
| 7. Purge private interactions: claim_votes, reactions, user_saves, preferences,   |
|    and legacy evidence_votes.                                                     |
| 8. Nullify whistleblower reporter in moderation_flags (reporter_id = NULL).       |
| 9. Tombstone public.profiles:                                                     |
|    - username = 'deleted_user_' || substr(md5(id::text), 1, 8)                    |
|    - display_name = NULL, bio = NULL, avatar_url = NULL, preferences = '{}'       |
|    - is_founding_participant = false, is_deleted = true                           |
| 10. Enqueue avatar deletion to public.storage_cleanup_queue (status: 'pending').  |
| COMMIT TRANSACTION                                                                |
+-----------------------------------------------------------------------------------+
                 |
                 v
+-----------------------------------------------------------------------------------+
| PHASE 2: SUPABASE AUTH SERVICE OPERATIONS (Server Action / Admin API)             |
| Caller: Next.js Server Action using SUPABASE_SERVICE_ROLE_KEY                     |
| 1. Call auth.admin.updateUserById(target_user_id, {                               |
|      email: 'deleted_' || target_user_id || '@deleted.invalid',                   |
|      email_confirm: true,                                                         |
|      phone: '',                                                                   |
|      user_metadata: {},                                                           |
|      app_metadata: { provider: 'email', providers: ['email'] },                   |
|      ban_duration: '876000h'                                                      |
|    })                                                                             |
| 2. Call auth.admin.deleteUser(target_user_id, { shouldSoftDelete: true })         |
| 3. Call auth.signOut({ scope: 'global' })                                         |
| 4. Update public.deletion_operations set status = 'auth_completed'.               |
+-----------------------------------------------------------------------------------+
                 |
                 v
+-----------------------------------------------------------------------------------+
| PHASE 3: ASYNCHRONOUS STORAGE CLEANUP (Background Worker / Queue)                 |
| 1. Read pending items from public.storage_cleanup_queue.                          |
| 2. Call Supabase Storage API: supabase.storage.from('avatars').remove([...]).     |
| 3. Mark queue item 'completed' (or retry with backoff on network drop).           |
+-----------------------------------------------------------------------------------+
                 |
                 v
+-----------------------------------------------------------------------------------+
| PHASE 4: CLIENT-SIDE TERMINATION & REALTIME BROADCAST                             |
| 1. Clear HTTP-only session cookies and local storage tokens.                      |
| 2. Invalidate TanStack Query cache.                                               |
| 3. Realtime profile update broadcasts to connected clients -> UI flips attribution|
|    to "Deleted User" and clears avatar without page reloads.                      |
| 4. Redirect user to `/` with notice: "Account and personal data have been deleted.|
+-----------------------------------------------------------------------------------+
```

---

## 14. Discora DB vs. Supabase Auth Responsibility Matrix

| Responsibility Area | Discora Database (`public`) | Supabase Auth (`auth`) | Ownership & Mechanism |
|---|---|---|---|
| **Profile De-Identification** | **OWNER** | No | `public.profiles` tombstone (`is_deleted = true`, null PII). |
| **Handle Retirement** | **OWNER** | No | `public.retired_handles` + trigger. |
| **Epistemic Content Preservation** | **OWNER** | No | `claims`, `evidence`, `arguments`, `inquiries`, `messages` preserved. |
| **Public Attribution Projection** | **OWNER** | No | Public views output `"Deleted User"` and `avatar_url = null`. |
| **Personal Stance / Vote Purge** | **OWNER** | No | Purge `claim_votes`, `reactions`, `user_saves`, `preferences`. |
| **Storage Queue Enqueue** | **OWNER** | No | Inserts avatar path into `storage_cleanup_queue`. |
| **Deletion State & Idempotency** | **OWNER** | No | `public.deletion_operations` tracking table. |
| **Authentication Credentials** | No | **OWNER** | Handled via GoTrue `updateUserById` password scrambling. |
| **User Email PII** | No | **OWNER** | Handled via GoTrue `updateUserById` email replacement. |
| **OAuth Metadata PII** | No | **OWNER** | Handled via GoTrue `updateUserById(user_metadata: {})`. |
| **Auth Account Ban / Lockout** | No | **OWNER** | Handled via GoTrue `updateUserById(ban_duration: '876000h')`. |
| **Auth Account Soft Deletion** | No | **OWNER** | Handled via GoTrue `deleteUser(shouldSoftDelete: true)`. |
| **Refresh Token Revocation** | No | **OWNER** | Handled via GoTrue `signOut({ scope: 'global' })`. |
| **Immediate In-Flight JWT Block** | **OWNER** | No | Application middleware checks `profiles.is_deleted`. |

---

## 15. Failure / Retry Matrix

| Failure Case | System State at Failure | Recovery & Idempotency Behavior | Manual Intervention? |
|---|---|---|---|
| **CASE 1: Discora DB Transaction Fails** | Zero state change. DB transaction rolled back. Auth unaffected. | User receives standard error toast. Operation can be immediately retried. Account remains fully active. | **No** |
| **CASE 2: DB Transaction Succeeds, Auth API Fails** | DB tombstoned (`is_deleted = true`). Auth user not yet scrambled/soft-deleted. | `deletion_operations` marked `db_completed`. Background worker retries Auth API. In-flight access blocked by middleware (`is_deleted = true`). | **No** |
| **CASE 3: Auth Operation Succeeds, Storage Cleanup Fails** | DB tombstoned; Auth banned; avatar remains on S3. | `storage_cleanup_queue` item remains `pending`. Storage worker retries with exponential backoff. Avatar URL in views is already `null`. | **No** |
| **CASE 4: Process Crashes Between DB & Auth** | DB completed; Auth pending; client disconnected. | Next call or background reconciler checks `deletion_operations` where `status = 'db_completed'` and finishes Auth step. | **No** |
| **CASE 5: Deletion Retried After Partial Completion** | First run succeeded at DB, failed at Auth; user clicks retry. | Server action checks `deletion_operations`. DB phase sees `profiles.is_deleted = true` and skips to Auth API. Idempotent success. | **No** |
| **CASE 6: User Attempts Login While Deletion In Flight** | Partial state. | Middleware rejects session (`profiles.is_deleted = true`). GoTrue rejects credentials once Phase 2 completes. | **No** |
| **CASE 7: User Has Google/OAuth Identity** | User has linked Google account. | `updateUserById` empties `user_metadata` and rewrites email. `deleteUser(true)` soft-deletes user. Banned status blocks OAuth re-login. | **No** |
| **CASE 8: User Has Multiple Identities** | User has email + OAuth. | Both identities blocked simultaneously when parent user is banned and soft-deleted in GoTrue. | **No** |
| **CASE 9: User Has Active Sessions Across Devices** | Multiple devices possess valid JWTs. | Global signout revokes refresh tokens. Application middleware inspects `profiles.is_deleted` on every request, immediately kicking other devices. | **No** |
| **CASE 10: Avatar File Already Missing from S3** | User never uploaded avatar, or file deleted. | Storage worker detects 404 from Supabase Storage API, treats it as success, and marks queue row `'completed'`. | **No** |

---

## 16. Security Analysis

1. **Credential Isolation:** The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side Next.js Server Actions and background workers. It is never transmitted to or bundled with the client browser bundle.
2. **Authorization Boundary:** Every deletion request must prove session identity: `auth.uid() = target_user_id`. Calling the deletion API with an arbitrary target ID immediately raises an authorization exception.
3. **Admin Self-Deletion Guard:** The PostgreSQL RPC verifies that the target account does not hold `admin` or `moderator` roles in `public.user_roles`, preventing accidental or malicious destruction of administrative accountability.
4. **Information Disclosure Prevention:** Deletion failures return sanitized user-facing messages (*"An error occurred while processing your request. Please try again."*) while detailed diagnostic telemetry is routed exclusively to secure server logs.
5. **No PII in Telemetry:** Audit logging in `deletion_operations` stores only UUIDs, operation timestamps, and status codes—no emails, usernames, or real names.

---

## 17. Logging / Retention Distinction

The deletion architecture strictly maintains the conceptual separation between application-level audit logs and infrastructure-level security/compliance logs:

### 17.1 Application & Governance Audit Logs
- **Scope:** `public.moderation_flags`, `public.admin_audit_logs`, `public.deletion_operations`.
- **Handling on Deletion:** 
  - Whistleblower `reporter_id` in `moderation_flags` is anonymized to `NULL`.
  - Administrative actions in `admin_audit_logs` are preserved with a permanent audit actor UUID.
  - `deletion_operations` maintains a permanent, non-PII operational ledger showing that account deletion completed.

### 17.2 Security, Network & Legal Retention Logs
- **Scope:** Web server access logs, Vercel edge logs, reverse proxy connection logs, Supabase database connection logs, and CERT-In compliance logs.
- **Handling on Deletion:** **NOT TOUCHED BY APPLICATION ACCOUNT DELETION.**
- Under Indian cyber security regulations (CERT-In directives, April 2022) and standard ISP/infrastructure requirements, system access and IP logs are maintained independently at the infrastructure level for statutory durations (e.g., 180 days).
- Application account deletion deletes application database records and personal assets; it does not and cannot purge immutable infrastructure access logs.

---

## 18. Legal Document Consistency Findings

We audited `docs/legal/TERMS_OF_SERVICE_DRAFT.md`, `docs/legal/PRIVACY_POLICY_DRAFT.md`, `docs/legal/COMMUNITY_GUIDELINES_DRAFT.md`, and `docs/legal/GRIEVANCE_POLICY_DRAFT.md`:

### 18.1 Finding 1: Self-Service Availability Wording
- **Current Legal Text:** Terms §9.1 and Privacy Policy §7 state: *"Discora intends to provide an automated self-service account deletion mechanism directly within user settings (`Settings > Danger Zone`). Until that automated feature is deployed and activated in the live application, users may submit an account deletion request through our designated privacy contact..."*
- **Application Reality:** In `src/features/settings/components/settings-page-client.tsx`, the Delete Account button is currently disabled by design with an explicit notice that deletion is not yet available.
- **Verdict:** The legal text's provisional phrasing (*"intends to provide... until that automated feature is deployed..."*) is consistent with current reality. However, operators must ensure that when Phase 9C.4 (implementation) deploys, the privacy contact email placeholder is populated.

### 18.2 Finding 2: "Votes and Reactions" Wording
- **Current Legal Text:** Terms §9.2 states that *"votes, and reactions"* will be permanently deleted.
- **Application Reality:** This accurately matches the deletion of `public.claim_votes` and `public.reactions`. Legacy `public.evidence_votes` rows are purged as database hygiene without implying that evidence voting is an active feature.
- **Verdict:** Consistent.

---

## 19. Implementation Specification Changes Required

The authoritative implementation specification ([`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md)) must be updated with the following specific changes:
1. **Remove Direct SQL on `auth.*`:** Eliminate `UPDATE auth.users`, `DELETE FROM auth.identities`, `DELETE FROM auth.sessions`, and `DELETE FROM auth.refresh_tokens` from Phase B (PostgreSQL RPC).
2. **Add `public.deletion_operations` Table:** Add an idempotent tracking table to Phase A schema hygiene.
3. **Re-architect Phase B:** Confine the PostgreSQL RPC strictly to the `public` schema (`public.profiles`, `public.retired_handles`, `public.claim_votes`, `public.reactions`, `public.user_saves`, `public.user_preferences`, `public.storage_cleanup_queue`).
4. **Re-architect Phase D:** Specify the server-side Next.js Server Action that invokes `supabase.auth.admin.updateUserById()` (with email scrambling, metadata wipe, and 100-year ban), `supabase.auth.admin.deleteUser({ shouldSoftDelete: true })`, and `supabase.auth.signOut({ scope: 'global' })`.
5. **Update Middleware Requirement:** Explicitly specify middleware checking of `profiles.is_deleted = true` to guarantee immediate access lockout during the remaining JWT lifetime.

---

## 20. Open Operator / Legal Dependencies

1. **Operator Dependency: Service Role Configuration:** Production deployment of account deletion requires ensuring `SUPABASE_SERVICE_ROLE_KEY` is securely configured in Vercel environment variables and restricted to server-side runtimes.
2. **Legal Dependency: Statutory Log Archival:** Formal sign-off from legal counsel that preserving infrastructure-level network/IP logs for 180 days under CERT-In guidelines while de-identifying application database records complies with applicable data protection requirements.
3. **Operator Dependency: Privacy Contact Email:** Population of the placeholder `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]` across all four legal documents prior to public launch.

---

## 21. Final Verdict

### **PASS WITH REQUIRED REWORK**

The architecture has been successfully corrected. Direct SQL manipulation of the Supabase internal `auth` schema is eliminated, and the deletion workflow is re-anchored on supported Supabase Auth Admin APIs (`updateUserById`, `deleteUser(shouldSoftDelete: true)`, `signOut`).

- **CURRENT STATUS:** Architecture audit complete; Supabase Auth boundary corrected; implementation specification updated.
- **RECOMMENDED NEXT PHASE:** Phase 9C.4 (Implementation Planning & Gated Execution — pending Product Owner authorization).
- **BLOCKERS:** None for specification. Implementation remains strictly gated.
- **OPERATOR DEPENDENCIES:** Environment variable provisioning (`SUPABASE_SERVICE_ROLE_KEY`) in server runtime.
- **LEGAL DEPENDENCIES:** Counsel verification of statutory log retention periods.

---
*End of Phase 9C.3-R2 Supabase Auth Boundary Correction Audit.*
