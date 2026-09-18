# Phase 7D / Phase F — Remediation Apply Report (090009–090011)

**Date:** 2026-09-12
**Authorization:** explicit owner approval for exactly these three migrations.
**Command (only write command run):** `supabase db push --linked`
**Scope:** apply + targeted verification. No other changes. Phase G NOT started.

---

## 1. Push result — SUCCEEDED

Pre-push history confirmed exactly 3 pending (`090009`, `090010`, `090011`; nothing else). Push applied all three with no errors and no rollback. Post-push history: zero pending (Local == Remote throughout).

## 2. Targeted verification (member + owner sessions; zero persistent writes)

| Check | Result |
|---|---|
| Non-author decide → `not_author` (new function live) | PASS (400) |
| Invalid decision → `invalid_decision` | PASS (400) |
| Self-request → `own_message` | PASS (400) |
| Accept with no pending → `no_pending_request` (execution reaches past validation on the new body) | PASS (400) |
| 5-minute edit rule intact (failed UPDATE, zero persistence) | PASS (400) |
| Direct SELECT `claim_requests` / `arguments` / `reactions` (090011 grants live) | PASS (200) |
| Counts unchanged (messages 16, claims 22, rooms 11, debates 9) | PASS |

CASE-mapping correctness itself rests on the isolated 42/42 execution of the identical function text (live positive decide would persist rows and remains fixture-gated, as previously established).

## 3. Production impact

Only the three approved effects: decide-status mapping fixed, argument tombstone placeholder lengthened, effective grants captured. No data rows created/modified/deleted by this session (all probes fail-safe or read-only). QA/demo data untouched.

## 4. Remaining gaps (unchanged in kind, narrowed)

- Live positive Accept/Skip/Decline + conversion rendering: needs a disposable fixture (owner decision on test writes).
- UI positive lifecycle + live invalidation refresh: needs seeded staging.
- Full effective-grant audit beyond the evidence-bounded set: follow-up work.
- Future `delete_claim`/`delete_argument` RPCs + UI: later phase.

## 5. Status

Phase F defect remediation applied and targeted-verified. Phase F remains PASS WITH GAPS pending fixture/staging proofs above. Phase G NOT STARTED.
