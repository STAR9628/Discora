# Discora — Phase 9D.2A-R2 Implementation Report
# Migration Integrity Reconciliation + Race-Safe Friend Inbox Cap

**Date:** 2026-09-15. **Mode:** recovery/continuation after 2026-09-14 laptop shutdown.
**Scope:** R2 only. No 9D.2B, no 9C.4, no account deletion, no friend UI/invites/email/
notifications, no OAuth/sound changes, no commits/pushes. Production untouched (read-only
`migration list` only).

---

## 1. Objective and product decision

Enforce the locked decision **D-15: maximum 50 pending received friend requests per
recipient** as a hard database invariant, race-safe under concurrency. This is a
**security/abuse control**, not an engagement mechanic: no counters shown, no public
lists, no scoring. Cap rejection error: `inbox_cap_reached` with hint
`This member has reached their pending friend request limit.`

## 2. Previous-run recovery (verified, not assumed)

Recovered from workspace inspection (no blind recreation):

| Claimed by prior run | Verified state 2026-09-15 |
|---|---|
| Inspected R preflight, git/dangling/temp search | Plausible; no report was written — **R2 reports did not exist** |
| `rendered_130002_original.sql` | Exists in Temp but imprecise extraction; superseded (§4 of reconciliation doc) |
| Inspected 140004 + lock namespaces | Consistent with `friend_pair_lock` body in local DB |
| Created `202609140006_phase_9d2a_friend_inbox_cap.sql` | **Exists, untracked, 147 lines** — adopted after line-by-line verification |
| Applied 140006 to local only | **Confirmed**: local ledger has 140006; remote ledger does not |
| Concurrency test + tsc + lint | No logs survived; **all re-ran fresh for this report** |

## 3. Implementation (only repo change: one new migration + two docs)

`supabase/migrations/202609140006_phase_9d2a_friend_inbox_cap.sql`:

1. Partial index `friend_requests_recipient_pending_idx` on `(recipient_user_id)`
   `WHERE status = 'pending'` — O(pending-for-R) count scans.
2. `friend_recipient_lock(uuid)` — `pg_advisory_xact_lock(hashtext('discora_recipient_inbox'),
   hashtext('r:' || recipient))`. SECURITY DEFINER, pinned `search_path = public, pg_temp`,
   EXECUTE to `service_role` only (same pattern as 140004's pair lock).
3. `create_friend_request` (CREATE OR REPLACE, all prior checks preserved verbatim):
   pair lock → block/friend/pending/cooldown checks → **recipient lock** → `count(*)
   ... status='pending'` → raise `inbox_cap_reached` if ≥ 50 → quota consume (15/hour,
   40/day) → insert. Cap evaluated **before** quota consumption, so aborted attempts
   consume zero sender quota (proven in TEST C retarget check).
4. Grants unchanged: `authenticated, service_role` on `create_friend_request`; anon/public revoked.

No existing migration edited. No application code touched (`tsc`/`lint` deltas: none).

## 4. Lock proof (Step 5 — mathematical, against live DB definitions)

- **Exact keys:** pair `(hashtext('discora_friend'), hashtext('f:'||least||':'||greatest))`;
  recipient `(hashtext('discora_recipient_inbox'), hashtext('r:'||recipient))`. First keys
  differ → **zero cross-namespace collision**, regardless of second-key hashes.
- **Recipient-global:** key depends only on recipient; Alice→Bob and Carol→Bob take the
  SAME lock — the exact hole the pair-lock-only design left (two pair locks, two
  concurrent `count=49` observations → 51 rows). Closed by construction.
- **Single acquirer path:** full `pg_proc` scan — the ONLY function referencing
  `friend_recipient_lock` is `create_friend_request`, the ONLY path that inserts
  `status='pending'` rows. No other creator exists to bypass the lock.
- **Ordering / deadlock:** lock graph is `pair → recipient`, acquired in that order on the
  single multi-lock path; `accept/block/unblock` take at most the pair lock
  (`friend_pair_lock` acquirers: accept, block_user, create, unblock_user). No path holds
  R while acquiring P; quota-counter row locks are leaf-level (only create takes them,
  after R). **No wait-cycle possible.** Consistent with observed zero-deadlock runs
  (10-way bursts, dual-recipient bursts).
- **Isolation:** per-recipient keys — TEST E proves independent progress (50/50).

## 5. Adversarial concurrency results (local sandbox, real concurrent backends)

Recipient R = `c12`; senders = dedicated `d01…d62` users; seeds via direct INSERT.

| Test | Setup | Result |
|---|---|---|
| A 49+2 | 49 seeded, 2 concurrent distinct senders | **1 success + 1 `inbox_cap_reached`, final 50** |
| B 50+1 | 50 present, 1 concurrent | **0 accepted, `inbox_cap_reached`, final 50** |
| C 49+10 (critical) | 49 seeded, 10 concurrent distinct senders | **exactly 1 success + 9 `inbox_cap_reached`, final 50** (reproduced 2×) |
| C quota-intact | loser retargets to empty inbox | **SUCCESS — aborted attempts consume zero quota** |
| D slot release | 50 → recipient declines oldest (49+1 declined) → fresh sender | **SUCCESS, final 50** |
| E isolation | R1+R2 at 49 each, 10 concurrent split 5/5 | **1 success each, 50/50, 8 rejections** |
| F rate limits | sender → 16 distinct recipients | **15 SUCCESS + 16th `rate_limit_exceeded`, 15 rows** (cap never misfires) |

Invariant held in every run: `COUNT(pending WHERE recipient=R) ≤ 50`; only
`status='pending'` counted; history rows never deleted.

## 6. Regression (140006 applied)

- **Behavior/security suite** (`friend_tests.sql`): **41/41 PASS notices, 0 FAIL.**
  (Prior "44/44" counted sub-checks; notice-counted assertions total 41 — reported exactly.)
  One fixture defect found and fixed transparently: FN-02's deleted-user UUID collided with
  concurrency user `c1` (kept active by the cap setup), so `recipient_inactive` could not
  fire. Fixed the **fixture only** (fresh `e…0001` UUID + idempotent deleted-profile
  upsert); the `recipient_inactive` assertion is unchanged and now passes. No product
  behavior altered, no test weakened.
- **S1–S8 race suite**: all pass with R-baseline semantics — S1 one-pending;
  S2 block wins, friendship 0, accepted-history preserved; S3 block wins (1/0/0);
  S4 single friendship, loser `invalid_request`; S5 accept raises `friend_request_expired`,
  sweep marks expired; S6 10/10 (cap correctly absent below 50 with 10 requests);
  S7 15th-hour OK / 16th quota raise, 40th-day OK / 41st raise; S8 unblock wins, create follows.
- RLS/grants/DEFINER/pinned-search_path/owner-scoped SELECT/client-DML bans/lifecycle
  authorization/block+expiry+cooldown semantics: all covered by the 41 passing checks.

## 7. Security review (140006)

Additive-only: one index, one internal lock function, one `CREATE OR REPLACE` preserving
every prior check. Verified live ACLs: all three functions DEFINER + pinned search_path;
locks executable by `service_role` only; `create_friend_request` unchanged
(authenticated + service_role, anon barred). No dynamic SQL, no SET ROLE, no new FKs, no
RLS/policy change. Block atomically removes friendship/pending (S2/S3); unblock restores
nothing (S8); friend graph stays private (SEC checks pass); 7-day expiry + 7-day
decline-cooldown intact (S5, suite).

## 8. Philosophy check

Inbox cap is a pure abuse control: no counts surfaced, no public lists, no gamification,
no reputation/truth scoring, no AI authority, no engagement optimization. ALIGNED.

## 9. Type / lint / migration validation

- `npx tsc --noEmit`: **exit 0, zero errors.**
- `npm run lint`: **0 errors**, 44 warnings — all pre-existing in unrelated files
  (no repo source file was modified by R2).
- 140006 **re-applied cleanly** to local DB (idempotent: `IF NOT EXISTS` /
  `CREATE OR REPLACE`; NOTICE only).
- Filename order 140004 → 140005 → 140006; remote ledger (read-only) shows 140004/140005/
  140006 as local-only — correct pending chain, nothing pushed.
- Existing migrations edited: **NO**. History manipulated: **NO**. Production push: **NO**.

## 10. Deliverables and files

- NEW: `supabase/migrations/202609140006_phase_9d2a_friend_inbox_cap.sql` (adopted from
  prior run after full verification; applied to local sandbox only).
- NEW: `docs/PHASE_9D2A_R2_MIGRATION_INTEGRITY_RECONCILIATION.md` (130001 = C, 130002 = B,
  divergence byte-characterized as 6+/2-).
- NEW: this report.
- Test harness lives OUTSIDE the repo (`Temp/opencode/scenario/cap_*`, `cap_run.ps1`,
  `friend_tests.sql` + fixture fix) — reproducible on demand, nothing committed.

## 11. Verdict: **A**

All R2 acceptance criteria met and proven locally: integrity reconciled without touching
history (C/B honestly labeled, divergence byte-precise), recipient-global cap implemented
in a new sequential migration, critical 49+10 race proven twice with exact numbers,
slot-release/isolation/rate-limit interaction proven, full regression green, tsc/lint
clean, zero production contact beyond read-only ledger inspection.

**Reason (one line):** the two R blockers are closed by evidence — precise reconciliation
plus a proven race-safe cap — with no migration edits, no history manipulation, and no
production changes.

**Blockers:** none. **Next step is a human decision:** production deployment of
140004 → 140005 → 140006 is explicitly out of scope (hard stop) and NOT authorized by
this report. STOP.
