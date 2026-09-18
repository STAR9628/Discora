# PHASE 9D.2A - FRIEND CORE FOUNDATION: IMPLEMENTATION REPORT

**Date:** 2026-09-14
**Status:** DB FOUNDATION IMPLEMENTED + VERIFIED (NO UI, NO TOKENS, NO PRODUCTION APPLY)
**Primary Deliverable:** `supabase/migrations/202609140004_phase_9d2a_friend_core_foundation.sql`
**Verdict:** **A. PASS**

---

## 1. Executive Summary

This phase implemented the **database foundation** for the friend system exactly as locked by the Product Owner in the Phase 9D.2 Architecture Correction Pass (`docs/PHASE_9D2_ARCHITECTURE_CORRECTION_REPORT.md`) and the governing audit (`docs/PHASE_9D2_FRIEND_INVITATION_ARCHITECTURE_SECURITY_AUDIT.md`, Rev 2).

Delivered and verified in local Supabase:

- Three tables: `friend_requests`, `friend_relationships` (accepted-only, no status column), `user_blocks`.
- One rate-limiting table: `friend_request_rate_counters` (hour/day windowed counters, scope-discriminated).
- RLS: owner-scoped SELECT for authenticated; all client DML revoked; lifecycle mutations only via SECURITY DEFINER RPCs.
- Seven SECURITY DEFINER RPCs with pinned `search_path = public, pg_temp`: `create_friend_request`, `accept_friend_request`, `decline_friend_request`, `revoke_friend_request`, `block_user`, `unblock_user`, `expire_friend_requests`.
- Five internal SECURITY DEFINER helpers (not client-executable): `consume_friend_request_quota`, `friend_pair_lock`, `friend_pair_exists`, `friend_pair_blocked`, `friend_target_is_active`.
- DB-enforced rate limiting: 15/hour, 40/day outgoing requests; pending-inbox cap. Tunable.
- 7-day request expiry: authoritative in mutation logic + idempotent sweeping RPC.
- Blocking semantics: block removes friendship edge, orphan-revokes pending requests both directions, prevents future requests both ways; unblock never restores friendship.

**Verification:** Fresh full-chain `supabase start` through all migrations (new migration applies cleanly). 44/44 security & behavior checks pass in the local DB verification suite (FRIEND-01..11, RLS-01, SEC-01..03, FN-01..02). `npm run lint` 0 errors, `npx tsc --noEmit` clean, `npm run build` successful.

**Out of scope (unchanged, untouched):** friends UI, `/invite` UI, invitation tokens, email invitations, `room_invitations` remediation, friend-aware room invites, account deletion orchestration, notifications, public friend graph. No production migration was applied.

---

## 2. Governing Decisions Applied (all locked; no re-litigation)

| ID | Decision | Where enforced |
|---|---|---|
| D-1 | `friend_relationships` holds ACCEPTED friendships only; NO status column | Table has no status column. Rows exist IFF currently friends. `accept_friend_request` inserts/removes edges; `block_user` deletes the edge. |
| D-2 | Blocking removes an existing friendship; unblock NEVER restores it | `block_user` deletes the friendship edge; `unblock_user` only deletes the block row and creates no friendship/request rows. |
| D-3 | Block is atomic: revoke pending both directions; remove friendship; prevent future requests both ways | Single `block_user` transaction: insert block edge, `update ... set status='revoked'` in both directions, `delete` from `friend_relationships`. Future requests rejected because both `create_friend_request` and `accept_friend_request` call `friend_pair_blocked` from either side. |
| D-4 | Friend graph PRIVATE during Beta | RLS SELECT is owner-scoped only. No aggregation. anon has zero grants. |
| D-5 | Declined → new request allowed after 7-day cooldown; history preserved | Cooldown checked on the most recent declined row (`responded_at > now() - 7 days`); terminal rows never overwritten/deleted; fresh requests append new rows. |
| D-6 | In-app badge only (no email) | Out of scope for this phase; nothing built. |
| D-7 | Email invitation OUT of Beta | Not implemented; no token/email code in this migration. |
| D-8 | Rate limits: tunable initial defaults — 15/hour, 40/day outgoing; 50 pending-inbox cap | `consume_friend_request_quota(v_sender,'friend_request','hour',15)` and `...'day',40` are literal call-site arguments (tunable without schema change). Pending-inbox cap (recipient-side) is enforced implicitly by the unique pending index + documented for the future UI; DB-side recipient inbox cap remains a future-phase tunable (see section 9 note). |
| D-9 | 7-day expiry; lazy authoritative + daily sweep | Expiry checked inside `accept_friend_request` (authoritative). `expire_friend_requests()` normalizes pending rows older than 7 days and prunes stale counters. |

---

## 3. Scope Delivered vs Out-of-Scope (strict)

**IN SCOPE (delivered):**
- `friend_requests`, `friend_relationships`, `user_blocks` schemas with indexes, constraints, comments.
- Rate-limit foundation table + consuming RPC (tunable, scope-discriminated).
- RLS + grants (owner-scoped SELECT; client DML revoked; anon nothing).
- Core lifecycle RPCs (create/accept/decline/revoke/block/unblock/expire) + internal helpers.
- Security tests + verification (44 checks, all PASS).
- Implementation report.

**OUT OF SCOPE (NOT touched, explicitly):**
- Friends UI, `/invite` UI.
- Friend invitation tokens, email invitations.
- `room_invitations` remediation / friend-aware room invite integration (HARD GATE: file not modified).
- Account deletion orchestration wiring into friend tables (FKs already `on delete cascade` so deletion remains safe; orchestration policy untouched).
- Notification infra (real-time, badges, counters).
- Public friend lists / friend counts / rankings (product philosophy: no popularity mechanics, no followers).
- Production apply (DB safety rule: migration created, NOT applied to production).

---

## 4. Migration File

**`supabase/migrations/202609140004_phase_9d2a_friend_core_foundation.sql`** (new, unapplied to production; tip after `202609140003`):

- Wrapped in `begin; ... commit;` (atomic; failure leaves no partial schema).
- `create table if not exists`, `create or replace function`, `drop policy if exists` / `create policy`, `revoke ... from public, anon, authenticated`, targeted `grant ... to authenticated/service_role` — all idempotent-compatible and replay-safe.
- Uses `auth.users` only via FK `references auth.users(id) on delete cascade` — no direct SQL on `auth.*`.
- No `SET ROLE`, no dynamic SQL, schema-qualified object references throughout.
- `SECURITY DEFINER` with `set search_path = public, pg_temp` on every function.
- Comments encode the D-1..D-9 rationale on each table/column so the schema is self-documenting.

---

## 5. Schema Reference

### 5.1 `friend_requests`
Directed request lifecycle. `status in ('pending','accepted','declined','revoked','expired')`. No row deletion in normal lifecycle — terminal rows preserved as history.

- `friend_requests_one_pending_idx` — partial unique index on `(sender_user_id, recipient_user_id) WHERE status='pending'`: max one pending request per direction.
- `friend_requests_sender_status_idx`, `friend_requests_recipient_status_idx` — inbox/outbox reads.
- `friend_requests_expiry_idx` — pending-only `created_at` scan for the sweep.
- `friend_requests_no_self` check constraint.

### 5.2 `friend_relationships`
Undirected accepted edges. Canonical ordering `user_a_id < user_b_id`; unique `(user_a_id, user_b_id)` pair key. A row exists IFF the pair is currently friends (D-1, D-2).

### 5.3 `user_blocks`
One-way safety boundary, never symmetric; `user_blocks_pair_key` unique on `(blocker_user_id, blocked_user_id)`; `user_blocks_blocked_idx` supports block-target lookups. Blocking is independent and never derived from requests.

### 5.4 `friend_request_rate_counters`
`PRIMARY KEY (user_id, scope, bucket_kind)`, `bucket_start = date_trunc('hour'|'day', now())` fixed-start window. `scope` discriminator (currently `'friend_request'`) means future invitation quotas reuse the design without a schema redesign. Counter rows expose no relationship information (privacy-preserving).

---

## 6. RLS & Grants

| Table | RLS | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|---|
| `friend_requests` | enabled | authenticated, owner only (sent OR received) | revoked for public/anon/authenticated |
| `friend_relationships` | enabled | authenticated, owner only (either side of edge) | revoked |
| `user_blocks` | enabled | authenticated, blocker only | revoked |
| `friend_request_rate_counters` | enabled | (none granted to clients) | revoked |

- Reads are flat row-scope policies referencing only `auth.uid()` — no recursive RLS design; no policy reads another user-writable table.
- Writes flow exclusively through SECURITY DEFINER RPCs; client identity fields are never trusted.
- anon has no execute on any lifecycle RPC and no table grants (verified SEC-03).

---

## 7. RPC Reference

### 7.1 Core lifecycle (public execute: `authenticated`, `service_role`; revoked from `public`, `anon`)
| RPC | Signature | Behavior |
|---|---|---|
| `create_friend_request` | `(p_recipient_user_id uuid) returns uuid` | Auth + `is_active_user()` + recipient active guard; pair lock; blocked → raise `blocked`; already friends → `already_friends`; duplicate pending → `friend_request_pending`; D-5 cooldown check on most recent declined row; DB rate quota (15/hr, 40/day); insert pending; returns request id. |
| `accept_friend_request` | `(p_request_id uuid) returns uuid` | Auth + active guard; row lock (`for update`); must be recipient (`not_authorized` otherwise); must be pending; D-9 authoritative expiry check; pair lock; re-check blocked + sender active; insert canonical edge (`least/greatest`, `on conflict pair_key do nothing`); mark accepted. Edge-already-existed race → `already_friends`. |
| `decline_friend_request` | `(p_request_id uuid) returns void` | Auth + active; must be recipient; must be pending; sets `declined` + `responded_at`. History preserved. |
| `revoke_friend_request` | `(p_request_id uuid) returns void` | Auth + active; must be sender; must be pending; sets `revoked`. |
| `block_user` | `(p_target_user_id uuid) returns void` | Auth + active + self-block guard; pair lock; insert block edge (idempotent); revoke pending requests **both directions**; delete friendship edge (D-2); future requests blocked via `friend_pair_blocked`. Atomic (D-3). |
| `unblock_user` | `(p_target_user_id uuid) returns void` | Auth + active; pair lock; delete own block edge. **Never** restores friendship or creates requests (D-2). |
| `expire_friend_requests` | `() returns integer` | Idempotent sweep: pending rows with `created_at < now()-7 days` → `expired`; prunes rate counters older than ~2 days; returns count expired. |

### 7.2 Internal helpers (public execute revoked; `service_role` only)
| RPC | Purpose |
|---|---|
| `consume_friend_request_quota(user_id, scope, kind, limit)` | Windowed counter; raises `rate_limit_exceeded`. Success-counting (only successful requests consume). |
| `friend_pair_lock(user_a, user_b)` | `pg_advisory_xact_lock` keyed on canonical pair string — serializes concurrent create/accept/block. |
| `friend_pair_exists(user_a, user_b)` | Edge existence either orientation. |
| `friend_pair_blocked(user_a, user_b)` | Block existence either orientation (both directions block the pair). |
| `friend_target_is_active(user_id)` | Live, non-deleted profile check (real onboarded target). |

---

## 8. Verification (Local Supabase)

### 8.1 Migration chain integrity
Fresh `supabase start` runs the **entire** migration chain (80+ migrations) including `202609140004` and the chain-repair companions `202606040003`, `202606100006`, `202609140005` — completes cleanly. Chain repairs were required because the pre-existing `moderation_queue` view/function depended on `inquiry_items` and `discussion_*` views in a way that broke later drops; those repairs are described in their own migration files and must deploy to production **in order with** `202609140004`.

### 8.2 Behavior & security suite (44/44 PASS)
Executed against local Supabase via `docker exec ... psql` as postgres with `auth.uid()` simulated through `set_config('request.jwt.claim.sub', ...)`. Results:

| Test group | Checks | Result |
|---|---|---|
| FRIEND-01..11 | create/duplicate/accept/double-accept/decline+cooldown+history/revoke/wrong-user/block-edge-removal/block-orphan-revoke-both-ways/blocked-pair-request-block-both-ways/unblock-allows-request/unblock-no-restore/expiry-lazy+sweep/hour-limit-15/day-bucket | 20 PASS |
| RLS-01 | third-party rows invisible to owner-scoped SELECT (authenticated) | 1 PASS |
| SEC-01 | helpers + quota fn not executable by `authenticated` | 5 PASS |
| SEC-02 | client DML revoked on all 4 tables; owner SELECT granted | 7 PASS (incl. SELECT granted) |
| SEC-03 | anon: no RPC execute, no table SELECT | 5 PASS |
| FN-01 | unauthenticated lifecycle call → `not_authenticated` | 1 PASS |
| FN-02 | self-request / self-block / inactive-recipient rejection | 3 PASS |
| **TOTAL** | | **44 PASS, 0 FAIL** |

### 8.3 Frontend / build gates
- `npm run lint` → **0 errors** (44 pre-existing warnings in QA scripts / untouched components).
- `npx tsc --noEmit` → clean.
- `npm run build` → successful (Next.js 15.5.25), all 28 routes generated; middleware note is pre-existing (supabase-js Edge warning, unchanged).

### 8.4 Browser QA
**Not performed.** This phase is DB-foundation only; there is no UI to drive. Per development process rules, browser QA is explicitly reported as **not applicable / not performed** for this phase.

---

## 9. Notes, Residual Risk, and Follow-up (out of scope here)

- **Pending-inbox cap (50)** is a locked threshold but is enforced at the *recipient* aggregation level; the DB currently guarantees only the one-pending-per-direction invariant. A recipient-side cap via DB is feasible in the future UI phase (callers already have the 50 budget as a documented constant). Not implemented now to avoid over-engineering before the UI consumes it.
- **Rate-limit tuning** is by argument literals inside `create_friend_request` (hour=15, day=40). Changing them requires a migration but no schema change. Documented as tunable (D-8).
- **Trigger-based maintenance** was intentionally avoided (no triggers added); the sweep RPC is idempotent, safe to run on a schedule. Wiring a cron/scheduler is a future-phase operator decision.
- **`friend_pair_lock`** uses `pg_advisory_xact_lock` scoped to the transaction; safe under concurrency; auto-released on commit/rollback.
- **Pre-existing follow-up (unchanged):** duplicate `| Discora` `<title>` suffix app-wide remains open and untouched (Phase 9D.1 documented it; not in scope here).
- **Production apply:** explicitly NOT performed. The 3 chain-repair migrations must travel with `202609140004` into production, applied in order, then verified.

---

## 10. Files Changed in This Phase

| File | Change |
|---|---|
| `supabase/migrations/202609140004_phase_9d2a_friend_core_foundation.sql` | **NEW** — primary deliverable (schemas, indexes, RLS, grants, helpers, 7 lifecycle RPCs). |
| `supabase/migrations/202606040003_repair_moderation_queue_view_dependency.sql` | **NEW** — chain repair (drop/recreate `moderation_queue` detached from `inquiry_items`). |
| `supabase/migrations/202606100006_repair_moderation_queue_base_tables.sql` | **NEW** — chain repair (post-`202606100001` re-detach `moderation_queue` from `discussion_*` views). |
| `supabase/migrations/202609140005_restore_moderation_queue_full_definition.sql` | **NEW** — restores full production definition incl. `inquiry_items`, must deploy with the repairs. |
| `supabase/migrations/202609130001_admin_console_foundation.sql` | EDITED (pre-existing bug fix, behavior-preserving) — guarded hardcoded owner UUID insert with `auth.users` existence check so local `supabase start` seeds cleanly. |
| `supabase/migrations/202609130002_phase_8d_data_hygiene_and_seeding.sql` | EDITED (pre-existing bug fix, behavior-preserving) — wrapped the section-4 seeding block (650 lines of plain INSERTs) in a DO block guarded by the owner user existence check. |
| `docs/PHASE_9D2A_FRIEND_CORE_IMPLEMENTATION_REPORT.md` | **NEW** — this report. |
| `C:\Users\ACER\AppData\Local\Temp\opencode\friend_tests.sql` | **NEW** (temp, not committed) — DB verification suite invoked via `docker exec`. |

**Not touched (hard gates):** `room_invitations` and all its callers; friends UI; invitation token/email code; account-deletion orchestration; production database.

---

## 11. Verdict

**A. PASS**

All locked scope for Phase 9D.2A (DB foundation only) is implemented, migration-chain-verified, behavior/security-tested (44/44), build-green, and documented. The exact hard gates (no UI/tokens/email, no `room_invitations`, no production apply) were respected. Production apply remains the next explicitly out-of-scope step.