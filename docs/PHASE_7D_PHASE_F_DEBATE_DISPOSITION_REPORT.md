# Phase 7D / Phase F — Legacy Resolved Debate Disposition (Owner-Approved)

**Date:** 2026-09-11
**Agent:** OpenCode (production-safety migration engineer)
**Product decision (owner, quoted verbatim):** "Retire the legacy `ai vs human` debate as `closed` and remove its legacy `resolution` data. Do not preserve, replace, reinterpret, or archive Winner/Loser semantics. Do not create any replacement resolution/conclusion model."
**Scope:** create + validate the forward migration ONLY. No apply. No production writes.

**NO PRODUCTION DATA WAS MODIFIED. NO PRODUCTION MIGRATIONS WERE APPLIED.**

---

## 1. Pre-creation verification (read-only)

- Live row re-verified: exactly one `resolved` debate, `4120c703-…`, unchanged since 2026-06-10 (matches the investigation report).
- Trigger audit on `debates`: only `trg_reputation_debate_insert` (INSERT-only) and `trg_reputation_debate_resolve` (fires solely on transition TO `resolved`). The disposition transition (`→closed`) emits **no reputation event**. No room-sync triggers exist (the rooms update lives inside the soon-dropped `resolve_debate` RPC, untouched).
- Current CHECK `('active','resolved','closed')` admits the target state, so the migration itself cannot fail on constraints.

## 2. Migration created (new file, no existing file touched)

`supabase/migrations/202606260006_retire_legacy_resolved_debate.sql` — slots between `202606260005` and `202606270001` (confirmed pending in `migration list` order).

- `UPDATE debates SET status='closed', resolution=NULL, updated_at=now() WHERE id='<exact>' AND status='resolved'` — exactly one row, only while still resolved.
- Guard `DO` block raises `legacy_resolved_debate_remaining` if ANY `resolved` row remains, converting 270001's cryptic CHECK failure into an explicit, actionable error.
- Idempotent (re-run = no-op, guard passes). No other debate/discussion/message/room/participant touched. No replacement model (no tables, columns, RPCs, events).
- Semantic note recorded in-file: `closed` = "no longer active" only (frontend maps closed→inactive); never "the winner was correct". Expected visible consequence: the `ai vs human` QA room becomes inactive (side picker hidden) once applied — accepted consequence of the approved retire, flagged here so QA baselines can be updated.

## 3. Validation (isolated embedded-PostgreSQL 18, verbatim file text, zero prod contact)

| Check | Result |
|---|---|
| SQL grammar parse (`pgsql-parser`) | PASS |
| (a) 270001-style CHECK rewrite pre-disposition FAILS (blocker reproduced: `violated by some row`) | PASS |
| (b) Disposition converts exactly the target row; active row untouched | PASS |
| (c) CHECK rewrite post-disposition SUCCEEDS | PASS |
| (d) Rerun idempotent, guard passes | PASS |
| (e) Foreign `resolved` row trips guard, nothing else converted | PASS |

6/6. (Node-on-Windows libuv teardown notice after harness exit is environmental noise; exit 0.)

## 4. Remaining path to push (unchanged gates)

Privileged full backup → explicit owner approval → `supabase db push --linked` (now 13 pending: 4 pre-7D + this disposition + 270001 + 8 Phase 7D) → 30-check post-apply matrix. Phase G stays blocked until green.
