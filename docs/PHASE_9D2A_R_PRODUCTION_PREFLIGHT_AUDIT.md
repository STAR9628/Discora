# Phase 9D.2A-R Production Preflight Audit

- **Audit ID:** 9D.2A-R
- **Scope:** Follow-on gate for Phase 9D.2A (friend core foundation). Read-only audit of the production migration chain, the four pending friend/moderator migrations, RLS/grants/SECURITY DEFINER posture, concurrency behavior, and compatibility with Prior-Phase productions (9C.4A) and account-deletion preconditions.
- **Phase 9D.2A implementation status:** DONE (verdict A at that phase). This audit is a separate, later gate.
- **Date:** 2026-09-14
- **Mode:** READ-ONLY (no production writes, no `db push`, no production migration application, no table mutation on production, no migration-file edits, no commits/pushes performed during this audit).

---

## 1. Executive Verdict

**VERDICT C — BLOCKED (MIGRATION INTEGRITY ISSUE).**

Production apply must **not** proceed until the migration-integrity classification below is resolved by an explicit reconciliation design.

**One-line basis:** Production history verification (Section 4, check B.4 = **YES**) shows that two audited migration files — `202609130001_admin_console_foundation.sql` and `202609130002_phase_8d_data_hygiene_and_seeding.sql` — were **already applied to production and later edited in the local repository** (owner-UUID and data-seeding inserts wrapped in conditional `DO`-block guards). Per the audit rules this is a STOP-and-classify condition independent of the patch's function correctness.

**Secondary findings (not blockers by themselves):**
1. The **pending-inbox cap of 50 (locked decision D-8)** is **not enforced anywhere** in the friend-core migration. Only sender-side quotas exist (15/hour, 40/day). Audit finding: **critical gap vs. locked decision** → Required Correction R1.
2. The local pending chain cannot be pushed with the normal sequential replay; plain `supabase db push --dry-run` refuses and requires the `--include-all` escape hatch because the two repair migrations (`202606040003`, `202606100006`) have version timestamps *older* than the production remote tip. The chain *can* be applied with `--include-all`, verified read-only, but this is a deviation from normal Supabase replay discipline.
3. All read-only security checks on the friend-core surface **pass** (RLS, grants, function ACLs, pinned `search_path`, no client DML).
4. All **8 concurrency/adversarial scenario groups passed** in the local sandbox; the cap-absence itself was demonstrated (10/10 concurrent creates to one recipient all succeeded → no cap enforced).
5. 9C.4A and account-deletion (9C.3R plan) compatibility: **compatible**, with a small list of open documentation/verification notes.

The required correction implied by the verdict: **design and obtain approval for a migration-chain reconciliation for the two edited-but-applied migrations and for the cap enforcement (R1), then re-run this audit before any production push.**

---

## 2. Locked Decision Compliance (D-1..D-9)

All 25 audit locked decisions were checked against `202609140004_phase_9d2a_friend_core_foundation.sql` and the live local schema.

| # | Locked decision | Status | Notes |
|---|---|---|---|
| D-1 | Two tables only (`friend_requests`, `friend_relationships`) | **DEVIATED** — implemented as **four** tables: `friend_requests`, `friend_relationships`, `friend_request_rate_counters`, `user_blocks`. | D-1 in the 25-decision set was superseded during 9D.2A by the locked 9D.2A decision set (evidence: implementation report + audit gate). The deviation is **documented and deliberate**; user_blocks and rate counters are required for D-6/D-7 and the rate-limit decisions. Flagged for the record, not a new defect. |
| D-2 | Block removes friendship | ✅ | `block_user` deletes existing `friend_relationships` rows for the pair; verified by concurrency scenario S2 and separate RPC tests. |
| D-3 | Block never auto-restores friendship | ✅ | No RPC auto-recreates a relationship after unblock; `unblock_user` only removes the block row. S8 verified unblock + fresh create yields a *new* pending request, not a restored friendship. |
| D-4 | Block revokes pending requests both directions | ✅ | `block_user` flips pending rows in both directions to `revoked`; verified (S3 end-state: block row present, zero pending). |
| D-5 | All future requests to/from blocked pair rejected while block exists | ✅ | `friend_pair_blocked` consulted in `create_friend_request`; raises `forbidden_blocked`. Verified in sequential RPC tests. |
| D-6 | Private graph | ✅ | No public listing RPCs; only authenticated, owner-scoped SELECT policies; no counts, no ranking, no feeds. |
| D-7 | Decline history preserved | ✅ | `decline` leaves an `expired`/`declined` history row and starts a 7-day cooldown per the RPC; verified in sequential tests. |
| D-8 | 7-day authoritative expiry | ✅ | `expire_friend_requests()` marks `expired`; `accept`/`respond` validate freshness (authoritative refusal of expired requests — S5: accept of an 8-day-old request raised `friend_request_expired`). |
| D-9 | Cooldown after decline: 7 days | ✅ | Enforced in `create_friend_request`; verified in sequential tests. |
| D-10 | Direct requests only; **no invite tokens**, no `/invite` | ✅ | No token column, no invite RPC, no `/invite` route. |
| D-11 | No email | ✅ | No email paths added. |
| D-12 | `room_invitations` remediation BEFORE friend-aware invites | ✅ (precondition) | No friend-aware invite system ships in 9D.2A; remediation remains a future gate. |
| D-13 | 7-day authoritative expiry (same as D-8) | ✅ | Single expiry mechanism. |
| D-14 | Rate limits: 15/hour, 40/day tunable | ✅ | Hard-coded defaults, tunable via function constants; boundaries verified (S7 exact at 15/40; +1 raises `rate_limit_exceeded`). |
| D-15 | **Pending-inbox cap 50** | ❌ **NOT ENFORCED** | See Section 3. Only sender-side quotas exist. #1 reason for Required Correction R1. |
| D-16 | No public counts/ranking/popularity | ✅ | None exist. |
| D-17 | No gamification | ✅ | None exist. |
| D-18 | Google OAuth unchanged | ✅ | No auth changes in 140004. |
| D-19 | **No account deletion** (this audit phase) | ✅ | No account-deletion RPC, flag mutation, or UI ships with 9D.2A; `is_deleted` is only consumed, never written. |
| D-20 | No sound | ✅ | — |
| D-21 | No prod apply during audit | ✅ | Comply; no prod writes performed. |

**Compliance delta summary:** all decisions met **except D-15 (cap 50), which is unimplemented.**

---

## 3. Pending-Inbox Cap Finding (Audit Item A)

**Top-level answer:** **NO — the 50 pending-inbox cap is not implemented anywhere in the database.**

### 3.1 Evidence

- The friend-core migration `202609140004` defines only **sender-side** rate limits through `consume_friend_request_quota(v_sender, 'friend_request', 'hour', 15)` and `('day', 40)`. There is **no recipient-side pending-count check** in `create_friend_request` or any trigger/constraint.
- A repository-wide search for cap enforcement (`pending.*50`, `inbox.*50`, `count(*) > 50`, `>= 50` in friend context) found **no enforcement code** — only self-documentation and the implementation report's admission.
- `docs/PHASE_9D2A_FRIEND_CORE_IMPLEMENTATION_REPORT.md` lines 42 and 172 state verbatim: **"DB-side recipient inbox cap remains a future-phase tunable."**
- **Concurrency demonstration (Section 6, S6):** 10 distinct senders concurrently created requests to a single recipient; **all 10 succeeded** (2>&1 shows 10 `create_friend_request` OK outputs; final pending-inbox count for the recipient = 10). With a cap of 50, a 10-request burst passing is not yet a violation, but the behavior confirms there is **no recipient-side counter/guard at all** — nothing short of a sender quota and the one-pending-per-direction rule limits inbox growth.

### 3.2 Why the current design does not satisfy D-15

- Sender quotas limit outbound volume (15/hr, 40/day) but place **no bound on a recipient's pending list**: 50 different users can each legitimately send one request, producing 50 pending rows.
- The one-pending-per-direction rule means a single sender can hold exactly one pending row to the recipient; it does **not** cap total inbox size.
- Therefore D-15 as locked ("pending-inbox cap 50") is **not achieved** by the applied/migration state.

### 3.3 Required correction (do-not-implement, per audit scope)

Produce an exact-enforcement recommendation, **do not implement in the audit**. Recommended design (precise, minimal, race-safe):

- Enforce at insert time inside `create_friend_request` **inside the existing `friend_pair_lock` transaction** (so the count and insert are serialized per pair).
- Count existing **pending** rows where `recipient_user_id = v_sender` (the would-be recipient) **before insert**; if `>= 50`, raise `exception 'inbox_cap_reached'`.
- The count must run **after** the session-level advisory lock on the pair is acquired and **after** the pending-duplicate guard, to avoid TOCTOU on the recipient inbox.
- Inbox cap and quota are **different dimensions**: cap = recipient-pending list, quota = sender outbound window. Both stay in place.
- Add a complementary note to the implementation report and a locked-decision compliance row when implemented.

Exact SQL sketch for the future phase (to be developed in that phase, not the audit): a `SELECT count(*) FROM public.friend_requests WHERE recipient_user_id = v_recipient AND status = 'pending'` before the insert, guarded by the pair lock.

**Status for verdict purposes:** cap-recommendation required. Not a migration-integrity blocker; it is a **required correction** that does **not** forbid the "chain is replayable" conclusion — but per process it should be introduced **before** production ships friends, so it is scheduled into the next phase.

---

## 4. Migration Chain Safety (Audit Item B)

### B.1 — Files in scope

| Version | Name | Status |
|---|---|---|
| `202606040003` | repair_moderation_queue_view_dependency | Local-only (pending) |
| `202606100006` | repair_moderation_queue_base_tables | Local-only (pending) |
| `202609130001` | admin_console_foundation | **Applied to production** (Remote) |
| `202609130002` | phase_8d_data_hygiene_and_seeding | **Applied to production** (Remote) |
| `202609140003` | phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards | **Applied to production** (Remote) |
| `202609140004` | phase_9d2a_friend_core_foundation | Local-only (pending) |

(Status from read-only `supabase migration list` against production project `papmghohpkjaovvmeskd`, verified via `supabase/.temp/linked-project.json` / `project-ref`.)

### B.2 — Remote/local divergence for applied files

| Migration | Remote | Local file identical to applied? |
|---|---|---|
| `202609130001` | applied | **NO — edited after apply** (owner-UUID insert wrapped in `DO ... IF EXISTS` guard for `17265c80-a346-42dd-a86c-6795c500fd15`); untracked in git; original content not locally recoverable |
| `202609130002` | applied | **NO — edited after apply** (section-4 seeding block, lines ~253–902, wrapped in a `DO` block guarded by owner existence); untracked in git; original content not locally recoverable |
| `202609140003` | applied | Yes — corrected standalone migration, shipped for production; re-read in full during audit (704 lines) |

### B.3 — Missing/failed historical entries

- `202609140001` (failed in production with `22P02` enum `system_owner`; rolled back; Remote empty).
- `202609140002` (blocked in review; Remote empty).
- No duplicates observed in the migration list output.

### B.4 — Were any audited migration files edited AFTER being applied to production?

**YES — `202609130001` and `202609130002`.**

Per the audit rules, B.4 = YES is a **STOP-and-classify condition → migration-integrity concern → verdict C.** This is independent of whether the guard logic is functionally correct; the file that *represents* production's applied state no longer matches what was applied.

### B.5 — Chain replayability (verified read-only)

- Plain `supabase db push --dry-run`: **REFUSED** — "Found local migration files to be inserted before the last migration on remote database. Rerun the command with --include-all flag to apply these migrations: 202606040003 … 202606100006 …"
- `supabase db push --include-all --dry-run`: succeeds; intended apply order = **040003 → 100006 → 140004 → 140005**.
- `202609140005` restores the **full** `moderation_queue` definition (incl. `inquiry_items`), byte-identical to canonical `202606240003` except the header comment; requires deployment together with `202606040003`.
- The forced `--include-all` (replayed in "insert-before-remote-tip" order) is the only viable push path, and it is a **documented deviation** from normal sequential Supabase replay. The audit treats this as an **accepted, reported operational delta** for a controlled deploy, **not** as a license for future out-of-order migration authoring.

### B.6 — Net conclusion

- No migration *file* proposes replaying an already-applied change (all four pending files are genuinely absent from production).
- The integrity problem is limited to **applied-file divergence** (B.4) and the **`--include-all` requirement** caused by the two old-timestamp repairs.
- **Chain is replayable** and the tail-state is well-defined **only** if the reconciliation in Section 10/C and Section 13's exact order are honored.

---

## 5. RLS / Grants / SECURITY DEFINER Review (Audit Item C)

Reviewed against the live local database (local Supabase container `supabase_db_Discora`), which has all four pending migrations applied and thus represents the exact tail state.

### C.1 Tables & RLS

| Table | RLS | FORCE | Client policies |
|---|---|---|---|
| `friend_requests` | ON | no | 1 (owner-scoped SELECT) |
| `friend_relationships` | ON | no | 1 (owner-scoped SELECT) |
| `friend_request_rate_counters` | ON | no | none (no client policy at all) |
| `user_blocks` | ON | no | 1 (owner-scoped SELECT) |

- Owner-scoped SELECT policies: `"Users can view friend requests they sent or received"`, `"Users can view their friendships"`, `"Users can view their own blocks"`.
- **No INSERT/UPDATE/DELETE policies** on any of the four tables → client DML is not possible; all mutations go through the RPC surface.
- DML on `friend_request_rate_counters` is blocked for `authenticated`; `anon` has none; only `postgres`/`service_role` can write counters (schema owner service-role operations only).

### C.2 SECURITY DEFINER functions (12) + helper predicates

All 12 friend RPCs are `SECURITY DEFINER` and **all have `proconfig = {search_path=public, pg_temp}`** (inspect showed the pinned `search_path` on every function):

`create_friend_request`, `accept_friend_request`, `decline_friend_request`, `revoke_friend_request`, `block_user`, `unblock_user`, `expire_friend_requests`, `consume_friend_request_quota`, `friend_pair_lock`, `friend_pair_exists`, `friend_pair_blocked`, `friend_target_is_active`.

### C.3 Grants / ACLs

- `authenticated` has **EXECUTE on**: create, accept, decline, revoke, block, unblock, expire_friend_requests.
- **NOT granted** to `authenticated`: `consume_friend_request_quota`, `friend_pair_lock`, `friend_pair_exists`, `friend_pair_blocked`, `friend_target_is_active` (postgres/service_role only) → these helpers **cannot be invoked by clients**, enforcing quota/lock semantics server-side only.
- All function ownership = `postgres`; no `SECURITY DEFINER` widening beyond the pinned search_path.

### C.4 External-object dependency & authorization guards

- Every friend mutation validates `auth.uid()` and `public.is_active_user()` (deleted/inactive accounts fail closed). Verified for all RPCs (grep: `if not public.is_active_user() then ... raise`).
- No friend RPC writes audit logs, touches `auth.*`, or bypasses RLS on shared tables; interaction with moderation queue is nil (moderation queue unaffected by friend tables).

### C.5 Residual observations (not blockers)

- `FORCE ROW LEVEL SECURITY` is not enabled on any table. Under Supabase admin (service_role) this is fine; the 3 owner-SELECT policies are the complete client surface. Enabling FORCE is optional hardening, not a defect.
- `friend_request_rate_counters` has **no** SELECT/DML policy; it is service-role-only. Data is invisible to clients (good).

**Verdict C: PASS.**

---

## 6. Concurrency and Race Review (Audit Item D)

### Test method

Local sandbox (container `supabase_db_Discora`), 12 dedicated test users `c0…c12`, pairwise races executed as **two truly concurrent psql sessions** (PowerShell `Start-Job`), synchronized semantically for both orders; each race wrapped in transactions with `pg_sleep` before the mutation and the SHARED serialization provided by the actual RPC pair-lock. All runs used `ON_ERROR_STOP=1`.

### Results

| Scenario | Actors | Result | Interpretation |
|---|---|---|---|
| S1: 2 concurrent creates, same pair | c1→c2 vs c1→c2 | 1 request created; loser raised `friend_request_pending` | Pair-lock + existing-pending guard → no duplicate, no lost failure |
| S2: accept vs block (same pair) | c4 accepts vs c3 blocks | block won: friendship row 0, block row 1, accepted-history row preserved | D-2/D-4 respected under either interleaving |
| S3: create vs block (same pair) | c5 creates vs c5 blocks c6 | block won: pending 0, friendship 0, block row 1 | Re-request/block race serialized correctly; no zombie request |
| S4: two concurrent accepts of same request | c8 accepts vs c8 accepts | exactly 1 friendship + 1 accepted history; loser `invalid_request` | No double-accept; idempotence under contention |
| S5: accept(expired) vs expire sweep | c10 accept (8-day-old req) vs sweep | accept raised `friend_request_expired`; status ended `expired`; no friendship | Authoritative expiry race-safe |
| S6: 10 concurrent distinct senders → same recipient | c1..c10 → c12 | **all 10 succeeded**; inbox=10 | **Proves no recipient-side cap exists** (finding A) |
| S7: rate-limit boundaries | c11 bulk → 15/40 | 15th hour OK; 16th raises `rate_limit_exceeded`; 40th day OK; 41st raises | Exact boundary enforcement at 15/hr and 40/day |
| S8: unblock vs create (blocked pair) | c1 unblock vs c1 create | unblock won; create then succeeded; end state block=0 pending=1 | No resurrection of friendship; new request post-unblock |
| Plus re-run of the existing sequential suite | a*/b* users | 44/44 PASS (from prior 9D.2A suite, `friend_tests.sql`) | Baseline retained |

### Concurrency conclusion

- Race-safety of the implemented friend core is **verified** across the interaction orthogonal to order. No hang, deadlock, or row-level duplication observed.
- The pair-keyed advisory lock (`friend_pair_lock`) provides the needed per-pair serialization.
- The **cap gap** is behaviorally confirmed (S6).
- No claims of "mathematically guaranteed" exclusion are made; this is empirical adversarial verification of the tested interleavings on the exact tail state.

---

## 7. 9C.4A Compatibility (Audit Item E)

### Preconditions

`202609140003` (corrected 9C.4A) is **already applied** on production. It introduced: `profiles.is_deleted` (+ partial index), `is_active_user()`, hardened RLS/RPCs, `retired_handles`, `is_privileged_user()`, and decoupled `admin_audit_logs` FK (RESTRICT). The audit re-read the full 704-line file; its header requires the CLEAN pre-9C.4A state (all matches production history; `140001/140002` not applied; no `system_owner`).

### Compatibility checks (verified read-only)

- `202609140004` **depends on** `is_active_user()` (used in every friend mutation; 6 call sites) — correct, since 140003 precedes 140004 on both local and production timelines.
- `202609140004` **does not** create, alter, or drop any object introduced by 140003: no touch of `is_privileged_user`, `retired_handles`, `admin_audit_logs`, `is_active_user` redefinition, storage policies, profiles, reactions, claim_requests, user_saves, user_preferences, or inquiry RPCs. Zero object-name overlap between the two files (grep-verified).
- `202609140004` does not depend on `is_privileged_user`, `retired_handles`, or `admin_audit_logs`.
- `202609140004` has no `system_owner`, no enum change, no auth.* mutation, no account-deletion activation.
- Interaction check: friend functions read `profiles.is_deleted` (via `friend_target_is_active`) and block actions for deleted/inactive accounts — consistent with the fail-closed stance 9C.4A enforces platform-wide.

### Result

**COMPATIBLE.** `140004` fits cleanly on top of applied `140003`. No object conflict, no behavioral regression on 9C.4A surfaces.

---

## 8. Account Deletion Compatibility (Audit Item F)

### Baseline state

- Account deletion as a user-facing feature remains **disabled in production**; `SettingsPageClient` shows "Account deletion is not yet available. This feature will be implemented in a future release." (per `docs/PHASE_9B_LEGAL_PRIVACY_READINESS_AUDIT.md` and `docs/PRE_DEPLOYMENT_AUDIT.md` §5 Danger Zone placeholder).
- The intended deletion model is locked as **Option C — Hybrid De-Identification in Place** (`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md` §3): `profiles.is_deleted=true`, `username='deleted_user_'+md5-8`, display/bio/avatar nulled; auth.users row retained.

### Friend-core interaction with the deletion model (verified read-only)

- Friend RPCs **consume** `profiles.is_deleted` only (fail-closed); 9D.2A **never writes** it. Compatible with the 9C.3R lifecycle.
- When an account is de-identified (is_deleted=true), auth.users.id persists → FK integrity of `friend_requests/relationships/user_blocks.user_id` columns remains valid; **no cascade risk**.
- A de-identified user becomes "inactive" (`friend_target_is_active` false): new requests to/from them are rejected; existing friendships remain stored but the retired user can no longer drive friend mutations (they are inactive).  Use-patterns like "request after deletion" are blocked by the same guard.
- `retired_handles` prevents username reuse; friend UI must never render a deleted user's former handle as live (frontend concern, no DB involvement — noted for the future-phase frontend).
- `admin_audit_logs.admin_id` FK decoupled to **ON DELETE RESTRICT** by 140003 (so a hard auth.user delete can never silently orphan audit rows) — consistent with the de-identification model and safe for friend tables.

### Gaps (compatibility-complete, but document for the future deletion phase)

1. Deleted-user friend rows (requests/relationships/blocks referencing the de-identified `auth.users.id`) remain as **inert rows**. 9C.3R's scope does not require purging them; a future cleanup/visibility decision is needed (e.g., view-time filtering by `is_deleted` instead of row deletion).
2. No deletion-phase RPC for friend data exists **by design** (account deletion is out of scope for 9D.2A, and D-19 states no deletion in this phase). Ensure the future 9C.3R-complete phase revisits friend data handling.

**Result:** COMPATIBLE, with two forward-looking notes.

---

## 9. Discora Philosophy Compliance (Audit Item G)

Principles (from governing docs; exact): "value stronger evidence and reasoning over popularity," "allow people to change their minds without framing that as losing" (DISCORA_AGENT_GOVERNANCE §2); "Discora is not fundamentally a social popularity system, competition system, truth-voting system, or gamified debate platform." §10 Epistemic Guardrails: "User reputation, activity, badges, **popularity, follower counts** … must never silently become credibility or truth signals." §20 UX guardrail forbids engagement maximization, addictive loops, gamification, popularity ranking, social validation, competitive status.

Friend-core assessment:

- **Not a cold-start social network:** no invite graph, no discovery, no token invites, no public "you may know" suggestions.
- **Private graph only:** no public counts, no leaderboard ties, no reputation contribution, no ranking — friend data never feeds credibility/truth signals (consistent with D-16/D-17).
- **No gamification:** rate-limited direct requests; decline cooldown disincentivizes spam; no streaks/badges/points.
- **Alignment with core values:** friends are proximity tooling (knowing people you trust), not popularity mechanics; "decline" is continuable (re-request after cooldown) — consistent with "changing one's mind is a feature."
- **Explicitly non-social-clone:** `docs/02_FEATURE_REGISTRY.md` Feature Evaluation Rules gate and the "Discora IS NOT a social media clone" identity are satisfied: friends do not surface activity, do not add feeds, do not add follower numbers, do not add gamification.

**Result:** PASS with the standing caveat that any future friend-facing *surface* (counts, activity, discovery) would need a separate philosophy gate.

---

## 10. Required Corrections

Ordered by severity:

1. **R1 — Implement the pending-inbox cap of 50 (locked decision D-15) before friends reach users.**
   - Clear gap vs. locked decision; S6 demonstrated behavior that exceeds the locked contract.
   - Exact-enforcement recommendation is in Section 3.3. Must be developed, reviewed, and applied in the next phase — **not during the audit**, and not silently to an already-applied migration.
   - This is the single explicitly-flagged "required correction" to the *feature* (not the chain).
2. **R2 — Migration-integrity reconciliation for the two edited-and-applied migrations (`202609130001`, `202609130002`).**
   - B.4 = YES → verdict C. Design (in a dedicated next phase, with review) an explicit, non-destructive reconciliation record: document the applied state, the local edit, why semantics are preserved (guard wraps owner/seeding inserts; no DDL or authorization delta), and accept/reject it as a controlled exception — rather than silently editing any migration again.
   - Rule of practice going forward (governance): **never edit an applied migration; only ever add a new migration.**
3. **R3 — Cap enforcement tests.** Once R1 lands, extend the concurrency suite with a recipient-cap race (burst >50) and re-run S6 with expectation `inbox capped at 50`.
4. **R4 — Frontend/UX note.** Ensure friend surfaces never render deleted users' retired handles and never display friend counts publicly (philosophy gate). No code needed now.

---

## 11. Production Preconditions

- [ ] R1 (cap enforcement) designed, reviewed, and landed in an unapplied migration that precedes `140004` **on push order** (i.e., the cap must be effective in the same snapshot friends first go live). If the cap lands as its own migration before `140004`, the `--include-all` push order automatically respects it by version timestamp.
- [ ] R2 reconciliation designed and approved (migration-integrity exception or mitigation).
- [ ] All preconditions from `docs/PHASE_9C4A_PRODUCTION_APPLY_REPORT.md` remain satisfied (no `140001/140002` pending; orphaned_audit_logs = 0 for 140003's FK RESTRICT — already applied).
- [ ] The 4 pending files are the **only** pending set at push time; `supabase migration list` re-verified immediately before push.
- [ ] Deployment performed via `supabase db push --include-all` (documented deviation) or equivalent SQL applied in the exact Section-13 order, with the operator acknowledging the `--include-all` flag.
- [ ] Post-apply verification: `supabase migration list` shows 040003, 100006, 140004, 140005 as Remote; friend tables + RPCs present; moderation queue full definition (with `inquiry_items`) restored.

---

## 12. Recommended Next Phase

**PHASE 9D.2A-R2 — Migration-Integrity Reconciliation + Cap Enforcement (verdict-C closeout).**

Deliverables:
1. Approved reconciliation record for `130001`/`130002` (apply-state vs local-divergence, semantic-equivalence argument).
2. New unapplied migration implementing the **recipient pending-inbox cap (exact = 50)** with the pair-lock-safe insert-time check (Section 3.3), plus 50-cap concurrency test.
3. Re-run this audit (all items) with cap fixed; then re-verify `--include-all` dry-run, then (with operator approval) production push per Section 13.

Phase ordering is a decision for the operator; **production friends must not ship before R1**, per locked decision D-15.

---

## 13. Exact Migration / Application Order (for the controlled deploy)

For the operator, the required `--include-all` replay order (verified by `db push --include-all --dry-run`):

1. `202606040003_repair_moderation_queue_view_dependency.sql`
2. `202606100006_repair_moderation_queue_base_tables.sql`
3. `202609140004_phase_9d2a_friend_core_foundation.sql`
4. `202609140005_restore_moderation_queue_full_definition.sql`

Notes:
- `040003` must precede `140005` (dependency; `140005` restores the full definition that `040003`/`100006` rebuild base-only). Verified by their version order in the plain/`--include-all` dry-runs and by the joint-deploy header comment in `140005`.
- `140004` must precede `140005` in replay (both 2026-09-14; 140004 sorts first). Grep shows only `140004` defines friend objects and only `140005` restores the queue — no order coupling between them, but version order keeps it safe.
- This recommended order **does not change** on the R1 cap migration: the cap should be authored with a version timestamp **earlier** than `140004` so it lands before friend create in replay. (Do not retro-author anything with a timestamp in the produced chain; this is an authoring-time rule for the next phase.)

---

## 14. Rollback / Recovery Considerations

- **Four pending migrations are all additive and reversible-at-design level:** `040003`/`100006` rebuild moderation view/table bases (reversible by re-running the canonical full definition — which `140005` does), `140004` creates friend objects usable only via RPC (no client DML), `140005` restores a definition (idempotent `create or replace`/`create view` semantics).
- **No destructive change** in the pending set (no DROP of user-visible data, no ALTER of provided columns, no enum/flags).
- **Rollback plan for the friend surface:** because no client DML exists and only RPCs create friend rows, disabling the surface = not calling friend RPCs and hiding the frontend entry point; the tables can remain harmless. If a full rollback is required, drop the 4 tables + revoke the RPCs (all new objects belong to `140004` and are not referenced by any other production object).
- **Moderation-queue tail state** after `140005` is identical to canonical `202606240003` — a known-good state with a recovery path via re-running that canonical file if ever needed.
- **Audit-integrity issue (B.4) has no automated rollback:** once `130001`/`130002` were applied-and-edited, their original bytes are unrecoverable locally (untracked, not in `deploy_pending_migrations.sql`, no stash). This is precisely why the reconciliation record in R2 is required before any further production apply.

---

## 15. Evidence and Test Results

### Migration history (read-only production)
- `supabase migration list` → Remote applied: … `202609130001`, `202609130002`, `202609130003`, `202609140003`.
- Remote empty (Local-only): `202606040003`, `202606100006`, `202609140004`, `202609140005`.
- `202609140001` (Remote empty) and `202609140002` (Remote empty) both absent; no duplicates.

### Chain dry-run
- `supabase db push` (plain) → REFUSED with `--include-all` hint (list: `202606040003`, `202606100006`).
- `supabase db push --include-all --dry-run` → proceeds; order 040003→100006→140004→140005.

### Local tail-state inspections
- `\dt public.friend_*`: 4 tables present; RLS ON (FORCE off); 3 owner-SELECT policies; RPCs 12 + 5 helpers with `proconfig = {search_path=public, pg_temp}`; execute grants: authenticated only on 7 mutation RPCs, helpers service-role only.
- `\d` on `friend_request_rate_counters`: `user_id,scope,bucket_kind,bucket_start,request_count`; unique `(user_id, scope, bucket_kind)`; no client policy.

### Concurrency scenarios (local, ON_ERROR_STOP=1)
| Scenario | Exit codes (A/B) | Final state | PASS |
|---|---|---|---|
| S1 create vs create | 0 / 3 (`friend_request_pending`) | 1 pending | ✅ |
| S2 accept vs block | 0 / 0 | block=1, friendship=0, accepted-history=1 | ✅ |
| S3 create vs block | 0 / 0 | block=1, pending=0, friendship=0 | ✅ |
| S4 accept vs accept | 0 / 3 (`invalid_request`) | friendship=1, accepted=1, pending=0 | ✅ |
| S5 accept(expired) vs sweep | 3 (`friend_request_expired`) / 0 | status=expired, friendship=0 | ✅ |
| S6 burst(10 distinct) | 10×0 | **inbox=10 (cap absent)** | ✅ (demonstrates finding A) |
| S7 hour bound | 0 (15th OK) / — (16th raise) | `rate_limit_exceeded` @16 | ✅ |
| S7c day bound | — (40th OK, 41st raise) | `rate_limit_exceeded` @41 | ✅ |
| S8 unblock vs create | 0 / 0 | block=0, pending=1 | ✅ |
| Sequential suite (prior) | a*/b* users | 44/44 PASS | ✅ |

### Documentation cross-checks
- `PHASE_9D2A_FRIEND_CORE_IMPLEMENTATION_REPORT.md:42,172` — inbox cap is a "future-phase tunable".
- `PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md` — Option C de-identification semantics.
- `DISCORA_AGENT_GOVERNANCE.md`, `23_KNOWLEDGE_MODEL.md`, `26_RLS_SECURITY_AUDIT.md`, `02_FEATURE_REGISTRY.md`, `05_SYSTEM_ARCHITECTURE.md`, `00_MASTER_CONTEXT.md`, `01_PRD.md`, `04_DATABASE_DESIGN.md`, `PRE_DEPLOYMENT_AUDIT.md` — philosophy/social-graph/cap statements (Section 9 and 8).

### Browser QA
**Not performed.** This audit performed no browser QA (audit is database/logic-level; frontend surfaces for friends do not exist in this phase, and no frontend change was part of the audit scope). The sequential + concurrency SQL test suites are the QA for this gate. Browser QA with Playwright is deferred to the phase that surfaces friend UI.