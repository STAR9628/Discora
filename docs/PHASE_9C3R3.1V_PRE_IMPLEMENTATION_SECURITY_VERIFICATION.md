# Phase 9C.3-R3.1-V: Pre-Implementation Security Verification & Go / No-Go Gate

**Document Status:** Authoritative Security Verification & Decision Gate  
**Phase:** 9C.3-R3.1-V (Verification Only — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Security Verification Team:** Principal Application Security Engineer, Supabase/GoTrue Specialist, PostgreSQL/RLS Security Engineer, Next.js Security Engineer, Realtime Security Engineer, Distributed Systems / Failure-Recovery Engineer, Privacy-by-Design Reviewer  
**Date:** September 14, 2026  

---

## 1. Executive Summary

This phase conducts a comprehensive, multi-disciplinary pre-implementation security verification of Discora's proposed account deletion architecture. Rather than reviewing documentation in isolation, the verification team audited the **actual repository code, database migrations, package definitions, client configurations, and Supabase Auth source files**.

### Key Verification Breakthroughs & Newly Discovered Risks:
1. **P0: In-Flight JWT Bypass on PostgREST Write RLS:**  
   Discora executes discourse mutations (messages, claims, evidence, arguments, reactions) directly from the client via Supabase PostgREST (`createBrowserSupabaseClient()`), bypassing Next.js middleware. Existing RLS insert policies (e.g., `public.messages`, `public.claims`) verify `auth.uid() = user_id and public.has_room_write_access(room_id)`. Neither the table policies nor `public.has_room_write_access` check `public.profiles.is_deleted`. Because an already-issued JWT remains cryptographically valid until expiration (`exp`, up to 3,600s), an attacker holding a valid JWT can continue inserting messages and claims directly via PostgREST for up to 1 hour post-deletion unless RLS policies fail closed against `is_deleted`.
2. **P0: Direct Client Invocation Vulnerability on `execute_account_deletion`:**  
   Phase 9C.3-R3.1 proposed granting `EXECUTE` on `public.execute_account_deletion` to `authenticated`. This allows any user to invoke the database de-identification RPC directly from the browser console, completely bypassing the Next.js Server Action, CSRF checks, rate limiting, confirmation phrase verification, step-up authentication, GoTrue session revocation, GoTrue email scrambling, and storage cleanup.
3. **P1: Cross-User Avatar Deletion via User-Controlled `profiles.avatar_url`:**  
   In `src/features/profiles/services/profile-service.ts`, `updateProfile()` allows users to set `avatar_url` to an arbitrary string. If the deletion engine merely extracts the path from `profiles.avatar_url` without verifying that the path belongs to `target_user_id`, a malicious user can set their `avatar_url` to a victim's avatar URL and trigger its physical deletion from S3 upon deleting their own account.
4. **P1: Public Enumeration of Deleted Accounts via `public.retired_handles`:**  
   Phase 9C.3-R3.1 proposed a public `SELECT` policy on `public.retired_handles`. This allows anonymous scrapers to dump the entire list of retired usernames, creating a permanent, public registry of deleted accounts.
5. **P1: Missing `/auth/callback` Infrastructure for Google OAuth Step-Up:**  
   `src/app/auth/callback/route.ts` currently only exchanges authorization codes and redirects. It has no infrastructure to handle step-up challenge cookies or distinguish a step-up authentication flow from a standard login flow.

---

## 2. Governance Status

- **Product Philosophy:** Unchanged and authoritative:
  - *Understanding over engagement*
  - *Evidence over popularity*
  - *Reasoning over tribalism*
  - *Human judgment over AI authority*
  - *Intellectual growth over winning*
- **Epistemic Invariant:** Option C (Hybrid De-Identification in Place) is strictly maintained. Published epistemic discourse (claims, evidence citations, arguments, questions, inquiries, messages, graph edges) survives permanently under the attribution `"Deleted User"`.
- **Implementation Status:** Account deletion is **NOT IMPLEMENTED**. Danger Zone controls remain disabled.

---

## 3. Scope

This audit evaluates the feasibility, correctness, and security boundaries of Phase 9C.3-R3.1 against the live repository across 25 security checks.

---

## 4. Verification Methodology

The verification team inspected:
- Active database migration files in `supabase/migrations/` (specifically RLS write policies, foreign key cascades, and helper functions).
- Client and server Supabase instantiation patterns (`src/services/supabase/`).
- Middleware path filters and redirect handling (`src/services/supabase/middleware.ts`).
- Profile mutation routines and storage avatar upload pipelines (`src/features/profiles/`).
- Auth callback handlers and redirect sanitizers (`src/app/auth/callback/route.ts`, `src/lib/security/safe-redirect.ts`).
- Installed `@supabase/auth-js` source code in `node_modules`.
- Realtime hooks and broadcast channel subscriptions (`src/features/rooms/hooks/use-typing-indicator.ts`).
- Sentry privacy configurations (`sentry.client.config.ts`, `sentry.server.config.ts`).
- Admin console protections (`src/lib/security/owner-guard.ts`).

---

## 5. Repository Evidence

| Component | File Inspected | Lines | Concrete Evidence Observed |
|---|---|---|---|
| **Middleware** | `src/services/supabase/middleware.ts` | 100–122 | `skipProfileCheck` explicitly skips `/api/`, `/settings`, and `/about`. Does not inspect `profiles.is_deleted`. |
| **Storage Upload** | `src/features/profiles/services/profile-service.ts` | 170–234 | `uploadAvatar` generates path `${userId}/avatar.${extension}`. `updateProfile` accepts arbitrary `data.avatarUrl`. |
| **Auth Callback** | `src/app/auth/callback/route.ts` | 1–42 | Simple `exchangeCodeForSession(code)` redirecting to `next`. Zero step-up challenge handling. |
| **Safe Redirect** | `src/lib/security/safe-redirect.ts` | 1–52 | Strict relative path resolution against `http://localhost`. Rejects protocol-relative URLs (`//`). |
| **Owner Guard** | `src/lib/security/owner-guard.ts` | 1–40 | Constant-time UUID comparison against server-only `DISCORA_OWNER_USER_ID`. Fails closed. |
| **Sentry Config** | `sentry.client.config.ts` | 1–28 | `sendDefaultPii: false`, replays disabled, `beforeSend` strips `email`, `ip_address`, `username`, `authorization`. |
| **Realtime** | `src/features/rooms/hooks/use-typing-indicator.ts` | 40–75 | Uses `room-typing:${roomId}` for ephemeral broadcast only. No database changes listened to. |
| **PostgREST RLS**| `supabase/migrations/202606210002...` | 445–480 | Write policies check `auth.uid() = user_id and has_room_write_access(room_id)`. Zero `is_deleted` checks. |

---

## 6. Supabase / Auth Verification

- **`auth.admin.signOut(jwt, 'global')`:** Verified in `GoTrueAdminApi.ts:142`. Sends `POST /logout?scope=global` with JWT as Bearer token. Requires valid JWT; revokes sessions in `auth.sessions` and refresh tokens across all devices.
- **`auth.admin.deleteUser(id, true)`:** Verified in `GoTrueAdminApi.ts:839`. Sets `deleted_at = now()` and revokes refresh tokens.
- **`auth.admin.updateUserById(id, ...)`:** Verified in `GoTrueAdminApi.ts:778`. Modifies `email`, `phone`, `user_metadata`, `app_metadata`, `ban_duration`. Sets `banned_until = '3000-01-01'`.
- **Identity Unlinking:** Verified in `GoTrueClient.ts:4012`. Only client-side `unlinkIdentity` exists and fails on sole identity. No admin API exists to delete single OAuth identity rows.

---

## 7. OAuth Step-Up Findings (Check #1)

- **Actual Fact:** `src/app/auth/callback/route.ts` contains no step-up challenge verification logic.
- **Security Reality:** Google OAuth with `prompt=select_account` prompts account selection, but if a session exists in the browser, Google logs in without requiring password re-entry. It does not prove recent reauthentication to Google.
- **Vulnerability:** An attacker with physical access to an unlocked browser could initiate deletion and complete the Google OAuth prompt without knowing the user's password.
- **Recommended Action (P1 Condition):** For Google OAuth accounts, step-up must either require an explicit re-auth nonce bound to the session and verified in `/auth/callback`, OR require the user to enter their Discora confirmation phrase plus email confirmation code.

---

## 8. Storage Ownership Findings (Check #3)

- **Actual Fact:** `src/features/profiles/services/profile-service.ts` line 154 allows setting `avatar_url` to any string.
- **Vulnerability:** If deletion deletes the path derived from `profiles.avatar_url`, User A can set `profiles.avatar_url = '.../avatars/<victim_uuid>/avatar.png'` and delete their own account, causing the storage worker to delete User B's avatar.
- **Security Impact:** Cross-user asset deletion / Denial of Service.
- **Recommended Action (P1 Condition):** The deletion RPC must strictly extract and validate:
  ```sql
  if v_avatar_url ~* ('^https?://[^/]+/storage/v1/object/public/avatars/' || target_user_id::text || '/avatar\.[a-z0-9]+$') then
    -- Enqueue only matching path
  end if;
  ```
  Any path not prefixed with `target_user_id` must be ignored.

---

## 9. JWT / `is_deleted` Boundary Findings (Check #4)

- **Actual Fact:** Discora's frontend calls PostgREST directly from the browser for messages, claims, evidence, and arguments.
- **Vulnerability:** PostgREST evaluates RLS directly against Supabase. RLS policies do not check `profiles.is_deleted`. A holder of an in-flight JWT can continue writing to rooms via PostgREST for up to 3,600s after deletion.
- **Security Impact:** Complete bypass of account de-identification during JWT window.
- **Recommended Action (P0 Blocker):** Update `public.has_room_write_access` in the Phase A migration to include:
  ```sql
  and not exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and p.is_deleted = true
  )
  ```
  This immediately blocks all PostgREST writes across all rooms for deleted users across all tables using this helper.

---

## 10. Realtime Findings (Check #5)

- **Actual Fact:** Realtime is used exclusively for typing indicators (`room-typing:${roomId}`) via public broadcast.
- **Finding:** No persistent database events (`postgres_changes`) are subscribed to. An in-flight WebSocket can only broadcast transient typing events; it cannot mutate data or receive private data.
- **Status:** Non-blocking / low risk.

---

## 11. Admin Console Findings (Check #6)

- **Actual Fact:** `src/lib/security/owner-guard.ts` verifies `DISCORA_OWNER_USER_ID` via constant-time comparison on the server. `middleware.ts` rewrites unauthorized admin requests to `/404`.
- **Finding:** Administrators cannot self-delete because `execute_account_deletion` checks `public.user_roles`. Furthermore, `public.user_roles` direct mutations are revoked from `authenticated`.
- **Status:** Verified and robust.

---

## 12. RLS & `SECURITY DEFINER` Findings (Check #10)

- **Actual Fact:** R3.1 proposed `GRANT EXECUTE ON FUNCTION public.execute_account_deletion(uuid) TO authenticated`.
- **Vulnerability:** Direct execution allows users to trigger Step 1 (database de-identification) while bypassing Steps 2, 3, 4 (session revocation, PII scramble, storage cleanup).
- **Security Impact:** Broken deletion state and residual PII exposure.
- **Recommended Action (P0 Blocker):** Revoke `EXECUTE` from `authenticated`. Grant `EXECUTE` exclusively to `service_role`. The RPC must only be callable by the Next.js Server Action.

---

## 13. XSS & Markdown Findings (Check #8)

- **Actual Fact:** Discora installs no markdown library. All text rendering uses React 19 JSX escaping and `Linkify` (`src/lib/linkify.tsx`).
- **Finding:** No `dangerouslySetInnerHTML` is present in the application codebase.
- **Status:** Verified clean.

---

## 14. Redirect Findings (Check #9)

- **Actual Fact:** `getSafeRedirectUrl` rigorously validates redirects against internal paths.
- **Finding:** Protocol-relative (`//evil.com`) and external redirects are rejected.
- **Status:** Verified clean.

---

## 15. Cache & CDN Findings (Check #14)

- **Actual Fact:** Next.js caching will be invalidated via `revalidatePath` and `revalidateTag`.
- **Finding:** Avatar CDN caching by Cloudflare/Supabase Storage has a standard TTL (up to 3,600s). Physical deletion at S3 will return 404 once edge cache expires.
- **Status:** Documented residual exposure window (standard for distributed CDNs).

---

## 16. Observability & Sentry Findings (Check #15)

- **Actual Fact:** Sentry is installed (`@sentry/nextjs: ^10.73.0`).
- **Finding:** `sentry.client.config.ts` and `sentry.server.config.ts` explicitly disable replays, set `sendDefaultPii: false`, and scrub `email`, `ip_address`, `username`, and `authorization` headers in `beforeSend`.
- **Status:** Verified compliant.

---

## 17. Secret & Environment Hygiene (Check #16)

- **Actual Fact:** No secret keys (`SUPABASE_SERVICE_ROLE_KEY`) are exposed via `NEXT_PUBLIC_*`.
- **Finding:** `owner-guard.ts` uses server-only `process.env.DISCORA_OWNER_USER_ID`.
- **Status:** Verified clean.

---

## 18. Backup & PITR Findings (Check #20)

- **Actual Fact:** Restoring a production database from a PITR backup taken prior to account deletion will restore the user's pre-deletion profile.
- **Finding:** Disaster recovery procedures must include replaying `deletion_operations` or an external deletion audit log against restored snapshots.
- **Status:** Operator dependency.

---

## 19. Data-Lifecycle Cross-Check (Check #25)

The independent schema audit discovered two user foreign keys omitted from previous lifecycle tables:
1. `public.claims.deleted_by` (`uuid references auth.users(id) on delete set null` added in `202609090002`).
2. `public.arguments.deleted_by` (`uuid references auth.users(id) on delete set null` added in `202609090004`).

Both columns are `ON DELETE SET NULL` and retain UUID anchors under soft-delete. They must be formally recorded in the specification.

---

## 20. State Machine & Idempotency Findings (Check #21 & #22)

- **Actual Fact:** If a crash occurs between `admin.signOut` and `updateUserById`, the background reconciler will not possess the user's JWT.
- **Finding:** The reconciler does not need the JWT for recovery; it can proceed directly to `updateUserById` (PII scramble + ban) and `deleteUser(shouldSoftDelete: true)`, which require only `userId`.
- **Status:** State machine is crash-consistent.

---

## 21. Adversarial Threat Matrix

| Threat | Attack Description | Enforced Control | Residual Risk |
|---|---|---|---|
| **ATM-01** | In-flight JWT PostgREST write | Update `has_room_write_access` to check `profiles.is_deleted` | None once helper updated |
| **ATM-02** | Direct RPC execution | Revoke EXECUTE from `authenticated`; grant only to `service_role` | None; client cannot invoke |
| **ATM-03** | Cross-user avatar deletion | Verify object path prefix matches `target_user_id` strictly | None; foreign paths skipped |
| **ATM-04** | Retired handle scraping | Revoke SELECT on `retired_handles` from `anon` and `authenticated` | None; table private to server/triggers |
| **ATM-05** | Replay of step-up token | Single-use cookie destroyed upon deletion initiation | None |

---

## 22. Production Readiness Findings

Discora's architecture is sound, but implementation cannot begin safely without addressing the two P0 blockers and three P1 conditions identified in this verification.

---

## 23. Unverified Assumptions

1. **Realtime WebSocket Eviction:** Whether Supabase Realtime immediately severs an established WebSocket connection upon `admin.signOut` without a page refresh is not empirically verified (typing broadcast only).
2. **Google OAuth Re-Auth Capability:** The exact parameters supported by Google Identity for forcing password re-entry without account logout need verification against Google OAuth docs.

---

## 24. P0 / P1 / P2 / P3 Risk Register

| ID | Priority | Finding | Action Required | Phase |
|---|---|---|---|---|
| **SEC-01** | **P0** | In-flight JWT bypass on PostgREST write RLS | Update `has_room_write_access` to check `is_deleted = false` | Phase A Migration |
| **SEC-02** | **P0** | Direct client execution of deletion RPC | Revoke EXECUTE from `authenticated`; grant only to `service_role` | Phase B Migration |
| **SEC-03** | **P1** | Cross-user avatar deletion via `avatar_url` spoofing | Enforce path prefix `target_user_id` in deletion RPC | Phase B Migration |
| **SEC-04** | **P1** | Public enumeration of deleted users via `retired_handles` | Revoke SELECT from `anon` and `authenticated` on `retired_handles` | Phase A Migration |
| **SEC-05** | **P1** | Missing Google OAuth step-up callback handling | Add step-up challenge verification in `/auth/callback` or require email OTP | Phase D Implementation |
| **SEC-06** | **P2** | Disaster recovery PITR re-play | Document PITR deletion replay procedure for operations team | Operator Doc |
| **SEC-07** | **P2** | Cloudflare CDN avatar caching (TTL window) | Document CDN cache propagation window in Privacy Policy | Legal / Docs |

---

## 25. Required Corrections

1. **Specification Update:** Update Phase A and Phase B migration specs in [`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`](file:///d:/Projects/Discora/docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md) to reflect:
   - `has_room_write_access` check on `profiles.is_deleted`.
   - RPC EXECUTE restriction to `service_role` only.
   - Storage path prefix validation.
   - `retired_handles` RLS lockdown (private table).

---

## 26. Conditions for Phase 9C.4 Implementation

Implementation may begin **only if the following conditions are strictly adhered to in Phase 9C.4**:
1. `public.has_room_write_access` is updated in Phase A to check `profiles.is_deleted`.
2. `public.execute_account_deletion` is granted ONLY to `service_role`.
3. Storage cleanup enqueues ONLY paths strictly matching `target_user_id || '/avatar.'`.
4. `public.retired_handles` has `SELECT` revoked from `anon` and `authenticated`.
5. Google OAuth step-up is implemented with a verified server challenge or fallback confirmation.

---

## 27. Final Verdict & Phase 9C.4 Readiness

```
================================================================================
PHASE 9C.4 READINESS DECISION
================================================================================

VERDICT:
GO WITH CONDITIONS

P0 BLOCKERS (Must be resolved in Phase 9C.4 migrations):
1. In-flight JWT write bypass: public.has_room_write_access must check profiles.is_deleted.
2. Direct client RPC bypass: public.execute_account_deletion must be restricted to service_role only.

P1 BLOCKERS (Must be resolved in Phase 9C.4 implementation):
1. Cross-user avatar deletion: Storage enqueue must validate target_user_id prefix strictly.
2. Public enumeration: public.retired_handles SELECT must be revoked from anon and authenticated.
3. OAuth step-up: Implement server challenge verification in /auth/callback or email OTP fallback.

P2 HARDENING:
1. Document PITR disaster recovery replay procedures.
2. Disclose CDN avatar cache TTL propagation in privacy documentation.

OPERATOR DEPENDENCIES:
1. Ensure SUPABASE_SERVICE_ROLE_KEY is configured in server environment.
2. Ensure DISCORA_OWNER_USER_ID is configured in production environment.

LEGAL / COUNSEL DEPENDENCIES:
1. Counsel confirmation of residual OAuth technical ID retention disclosure under GDPR Art. 17(3)(e).

UNVERIFIED ASSUMPTIONS:
1. Realtime WebSocket termination latency upon admin.signOut (low risk, typing only).

WHAT IS ALREADY CORRECT:
1. Epistemic preservation model (Option C).
2. Owner guard constant-time authorization.
3. Safe redirect handling (open redirect protected).
4. Sentry privacy and PII scrubbing.
5. React 19 JSX escaping (no dangerouslySetInnerHTML).
6. Auth operation ordering (signOut before soft-delete/ban).

WHAT MUST CHANGE BEFORE IMPLEMENTATION:
1. Specification update incorporating the 5 P0/P1 corrections into docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md.

MINIMUM SAFE 9C.4 SCOPE:
1. Phase A migration (schema hygiene, RLS, retired_handles private, has_room_write_access update).
2. Phase B migration (execute_account_deletion RPC, service_role only, avatar prefix check).
3. Phase C (Storage cleanup background worker).
4. Phase D (Server Action with step-up verification and GoTrue Admin API calls).
5. Phase E (DangerZonePanel activation with confirmation modal).
6. Phases F-H (Automated invariant, security, and failure testing).
================================================================================
```

---
*Agent Execution Halted. Verification complete. No implementation performed.*
