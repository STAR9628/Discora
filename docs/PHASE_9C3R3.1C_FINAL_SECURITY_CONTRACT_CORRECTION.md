# Phase 9C.3-R3.1-C: Final Security Contract Correction Report

**Document Status:** Authoritative Security Contract Correction & Pre-Implementation Lock  
**Phase:** 9C.3-R3.1-C (Documentation & Specification Lock Only — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Security Team:** Principal Application Security Engineer, Supabase/GoTrue Specialist, PostgreSQL/RLS Security Engineer, Next.js Security Engineer, Distributed Systems / Failure-Recovery Engineer, Privacy-by-Design Reviewer  
**Date:** September 14, 2026  

---

## 1. What R3.1-V Discovered

Empirical investigation of the active repository code, Supabase client setups, and database migrations in Phase 9C.3-R3.1-V identified five material architectural risks and two missing lifecycle references:

1. **P0 (SEC-01) — In-Flight JWT Bypass on PostgREST Writes:**  
   Discora executes browser mutations directly against Supabase PostgREST (`createBrowserSupabaseClient()`), completely bypassing Next.js middleware. Active RLS insert policies on tables like `messages` and `claims` check only `auth.uid() = user_id and public.has_room_write_access(room_id)`. Neither table RLS nor `has_room_write_access` inspected `profiles.is_deleted`. Because an issued JWT remains cryptographically valid until expiration (up to 3,600s), an attacker holding a valid JWT could continue writing to rooms directly via PostgREST for up to 1 hour post-deletion.
2. **P0 (SEC-02) — Direct Client Execution Vulnerability on `execute_account_deletion`:**  
   Phase 9C.3-R3.1 proposed granting `EXECUTE` on the database RPC to `authenticated`. This would allow any browser user to invoke `supabase.rpc('execute_account_deletion')` directly, executing database de-identification while completely bypassing the Next.js Server Action, CSRF validation, rate limits, confirmation phrasing, step-up authentication, GoTrue session revocation, GoTrue email scrambling, and storage cleanup.
3. **P1 (SEC-03) — Avatar Object Ownership Spoofing:**  
   In `src/features/profiles/services/profile-service.ts`, `updateProfile()` accepts an arbitrary `avatarUrl` string from the caller. If the deletion engine derived the storage deletion target from `profiles.avatar_url` without verifying caller ownership, a malicious user could point their avatar URL to a victim's avatar (`<victim_uuid>/avatar.png`) and self-delete, causing the storage worker to delete the victim's image.
4. **P1 (SEC-04) — Public Enumeration of Deleted Accounts via `retired_handles`:**  
   R3.1 proposed granting public `SELECT` on `public.retired_handles`. This would expose a public registry of every user who has ever deleted their account from Discora to scrapers.
5. **P1 (SEC-05) — Missing Google OAuth Step-Up Infrastructure:**  
   `src/app/auth/callback/route.ts` only handled code exchange and standard redirects. It lacked support for step-up challenge verification or distinguishing step-up from regular login.
6. **Omitted Lifecycle References:**  
   Discovered `public.claims.deleted_by` (`202609090002`) and `public.arguments.deleted_by` (`202609090004`) referencing `auth.users(id) on delete set null`.

---

## 2. What Was Verified

1. **Direct PostgREST Mutation Coverage:**  
   Audited all active write policies across `supabase/migrations/`. Verified that while `has_room_write_access` governs `messages`, `claims`, `evidence`, `sources`, `claim_evidence`, `claim_votes`, and `arguments`, it **does not** govern `reactions`, `claim_requests`, `user_saves`, `user_preferences`, `profiles` updates, or RPCs `create_inquiry` / `respond_to_inquiry`. A universal `is_active_user()` helper is required across all tables.
2. **Supabase GoTrue Admin API Signatures:**  
   Verified installed `@supabase/auth-js` source in `node_modules`:
   - `auth.admin.signOut(jwt, 'global')` requires a valid JWT string.
   - `auth.admin.deleteUser(uid, { shouldSoftDelete: true })` sets `deleted_at = now()`.
   - `auth.admin.updateUserById(uid, attributes)` modifies email, user_metadata, and sets `banned_until`.
   - Single-identity OAuth unlinking is unsupported; technical identity rows remain disabled under the banned user.
3. **Admin Console & Owner Guard Robustness:**  
   `src/lib/security/owner-guard.ts` verifies `DISCORA_OWNER_USER_ID` via constant-time comparison on the server. `middleware.ts` rewrites unauthorized access to `/404`.
4. **Sentry Privacy & PII Scrubbing:**  
   Verified that `sentry.client.config.ts` and `sentry.server.config.ts` enforce `sendDefaultPii: false` and explicitly scrub emails, IPs, usernames, authorization headers, and cookies in `beforeSend`.

---

## 3. What Was Corrected

1. **PostgREST Write Fail-Closed Boundary (SEC-01):**  
   Added a centralized `public.is_active_user()` helper function. Updated the implementation matrix so that `has_room_write_access` checks `is_active_user()`, and non-room write policies (`reactions`, `claim_requests`, `user_saves`, `user_preferences`, `profiles`, `inquiries`) explicitly evaluate `is_active_user()` in both `USING` and `WITH CHECK` clauses.
2. **Least-Privilege RPC Execution (SEC-02):**  
   Revoked `EXECUTE` on `execute_account_deletion` from `PUBLIC`, `anon`, and `authenticated`. Granted `EXECUTE` strictly to `service_role`. Ordinary clients can no longer invoke the database RPC directly.
3. **Provable Storage Namespace Validation (SEC-03):**  
   The RPC regex-validates that the storage object path starts with `target_user_id::text || '/'`. External OAuth URLs (e.g., `googleusercontent.com`), malformed URLs, and cross-user paths are safely ignored.
4. **Zero-Knowledge Retired Handle Registry (SEC-04):**  
   Revoked `SELECT` on `public.retired_handles` from `anon` and `authenticated`. Handle collisions are checked strictly server-side via `SECURITY DEFINER` table triggers without exposing table contents.
5. **Data Lifecycle Inventory Completeness:**  
   Added `claims.deleted_by` and `arguments.deleted_by` to the authoritative lifecycle inventory.
6. **Defensible Terminology:**  
   Removed all absolute language ("bulletproof", "guaranteed zero race conditions") in favor of precise security engineering terminology ("fail-closed", "defense in depth", "residual risk").

---

## 4. Final Deletion Security Contract

The complete, authoritative 26-section implementation specification has been locked in:
[`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md)

### Key Architectural Pillars:
- **Model:** Option C (Hybrid De-Identification in Place). Public discourse survives permanently under `"Deleted User"`.
- **Ordering:** Database RPC de-identification $\rightarrow$ `admin.signOut(jwt, 'global')` $\rightarrow$ `updateUserById` (PII scramble + ban) $\rightarrow$ `deleteUser(shouldSoftDelete: true)` $\rightarrow$ storage cleanup $\rightarrow$ client cookie termination.
- **State Machine:** 10 discrete states with durable checkpoint timestamps (`db_completed_at`, `auth_signout_completed_at`, `auth_scrub_completed_at`, `auth_soft_delete_completed_at`, `storage_cleanup_completed_at`).
- **PostgREST Security:** `public.is_active_user()` helper enforced on all write paths to neutralize in-flight JWTs.
- **Storage Safety:** Canonical namespace enforcement (`target_user_id || '/avatar.'`).

---

## 5. Remaining Unresolved Decisions (Product Decision Required)

```
================================================================================
PRODUCT DECISION REQUIRED: GOOGLE OAUTH STEP-UP AUTHENTICATION MECHANISM
================================================================================

ISSUE:
Standard Google OAuth with `prompt=select_account` prompts account selection from 
currently logged-in accounts, but does NOT guarantee fresh password re-entry on Google's 
side if an active Google session already exists in the browser.

DECISION OPTIONS FOR PRODUCT OWNER:
Option 1: Google OAuth Re-Selection via /auth/callback
          - Pros: Native Google flow; no additional email infrastructure needed.
          - Cons: Does not prove recent credential entry; vulnerable to physical 
                  session hijacking on unlocked laptops.
Option 2: Out-of-Band Email Confirmation Code (RECOMMENDED)
          - Pros: Proves access to the registered email account; robust against 
                  unlocked browser hijacking; simple, server-verifiable 6-digit OTP.
          - Cons: Requires transactional email delivery (Resend / SMTP).
Option 3: Dual-Factor Confirmation (OAuth Re-Selection + Email Code)
          - Pros: Maximum security assurance.
          - Cons: Higher user friction for account deletion.

RECOMMENDATION:
Option 2 (Email Confirmation Code) is the most defensible security mechanism for OAuth accounts.
================================================================================
```

---

## 6. Operator Dependencies

1. **Service Role Secret:** `SUPABASE_SERVICE_ROLE_KEY` must be configured in server-only environment variables (`.env.local` / production hosting). Never prefixed with `NEXT_PUBLIC_`.
2. **Platform Owner Guard:** `DISCORA_OWNER_USER_ID` must be configured in server environment.
3. **Disaster Recovery Runbook:** The operations team must maintain an append-only archive of `deletion_operations` to replay post-backup deletion events against restored PITR database snapshots.

---

## 7. Legal & Counsel Dependencies

1. **Privacy Policy Disclosure:** Legal counsel must review and approve the disclosure regarding the retention of disabled external OAuth technical identifiers (`auth.identities`) under GDPR Article 17(3)(e) (legal and security defense) and statutory record retention requirements.
2. **CDN Propagation Disclosure:** The Privacy Policy must acknowledge standard distributed CDN cache propagation windows (up to 3,600s) for public avatar images.

---

## 8. Security Invariants (14 Enforced Invariants)

1. **INVARIANT 1:** After `profiles.is_deleted = true` is committed, no normal user-authenticated write may succeed, even while an access JWT remains unexpired.
2. **INVARIANT 2:** The database deletion RPC cannot be directly invoked by ordinary browser clients (`EXECUTE` revoked from `authenticated`).
3. **INVARIANT 3:** A deletion operation can only target the authenticated caller's own account derived from the server session.
4. **INVARIANT 4:** Admin, moderator, and system owner accounts cannot self-delete.
5. **INVARIANT 5:** A storage object is enqueued for deletion only when ownership by `target_user_id` is verified against the canonical namespace.
6. **INVARIANT 6:** Retired usernames are archived permanently and can never be claimed by any new registrant.
7. **INVARIANT 7:** The retired-handle registry is private to the database and cannot be publicly enumerated.
8. **INVARIANT 8:** Step-up authentication proofs are single-use and destroyed upon deletion initiation.
9. **INVARIANT 9:** Step-up proofs are cryptographically bound to the intended user, session, and deletion operation.
10. **INVARIANT 10:** Published discourse (claims, evidence, messages, arguments, inquiries) permanently survives account deletion.
11. **INVARIANT 11:** Personal identity is eradicated without deleting relational foreign-key anchors.
12. **INVARIANT 12:** In-flight JWT validity is never treated as proof of active authorization for a deleted account.
13. **INVARIANT 13:** Deletion background reconcilers are retry-safe and recover cleanly via durable checkpoint timestamps.
14. **INVARIANT 14:** Historical administrative audit records and moderator actions are never destroyed by user deletion.

---

## 9. Implementation Prerequisites (For Phase 9C.4)

Before Phase 9C.4 implementation can begin:
1. **Product Owner Decision:** Formal resolution of the Google OAuth Step-Up mechanism (Option 1, 2, or 3).
2. **Product Owner Authorization:** Explicit written directive authorizing Phase 9C.4 execution.
3. **Sequential Gating:** Implementation must follow Phases A through H strictly in sequence.

---

## 10. Implementation Readiness & Final Authorization Status

```
================================================================================
PHASE 9C.4 READINESS & AUTHORIZATION STATUS
================================================================================

SPECIFICATION STATUS:
READY FOR OWNER AUTHORIZATION

PHASE 9C.4 STATUS:
NOT AUTHORIZED (Awaiting Product Owner Review & Written Sign-Off)

RISK REGISTER STATUS:
- P0 Risks: 0 Unresolved (Mitigated in Phase A & B specification)
- P1 Risks: 0 Unresolved (Mitigated in Phase A & B specification; 1 Product Decision Pending)
- P2 Hardening: 2 Documented (PITR runbook, CDN cache window)
- P3 Non-blocking: 0 Unresolved

================================================================================
```

---
*End of Final Security Contract Correction Report.*
