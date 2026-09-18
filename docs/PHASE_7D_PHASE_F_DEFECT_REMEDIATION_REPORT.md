# Phase 7D / Phase F — Defect Remediation Report (F1, F2, Grant Drift)

**Date:** 2026-09-12
**Agent:** OpenCode (migration-safety/backend remediation; repo-only, no apply)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → implementation.
**Scope:** three forward migrations (created, validated, NOT applied) + isolated proof + static validation. Phase G NOT started. No product behavior invented.

---

## 1. F1 root cause — `decide_claim_request` status vocabulary mismatch (CRITICAL, live)

Shipped `202609090003` writes `status = p_decision` (`accept`/`skip`/`decline`), but the table CHECK, the aggregated view, and the UI contract all require (`accepted`/`skipped`/`declined`). Proven live-equivalent in isolation: all three decisions fail with `claim_requests_status_check` violation (23514). **Accept/Skip/Decline error in production today.** Product-facing action names are correct and unchanged; only the row-state mapping is wrong.

## 2. F1 remediation — `202609090009_fix_claim_request_decision_status.sql` (new)

Single-site `CASE` mapping (`accept→accepted`, `skip→skipped`, `decline→declined`) inside a verbatim copy of the shipped function; validation, RLS, grants, `search_path`, aggregation, and identity privacy byte-identical. No statuses added/renamed. No historical rows can exist in bad states (the CHECK made them impossible), so no data rewrite is needed. Idempotent (`OR REPLACE`). Rollback: re-apply the 090003 text (documents a return to broken behavior; emergency-only).

## 3. F2 root cause — argument tombstone violates its own CHECK (HIGH, dormant path)

Shipped `argument_delete_with_lock()` writes a 32-char placeholder, but `arguments_content_length` requires 50–5000 chars. Argument soft-delete can never succeed as shipped (proven: `arguments_content_length` violation at tombstone time). The claims placeholder (29 chars vs 25-minimum CHECK) is fine and untouched.

## 4. F2 remediation — `202609090010_fix_argument_tombstone_length.sql` (new)

Deterministic 70-char placeholder (`[This argument was deleted by its author and is retained for context.]`), mirrored exactly in the immutability exemption; CHECK semantics untouched; no voting/scoring/reputation added; retraction untouched; no authority meaning in the text. Rollback: re-apply the 090004 functions.

## 5. Grant drift findings (TASK 3)

Determined, not guessed — repo grep (only SELECT-on-base + moderation DML grants exist in history) vs live member probes:

| Grant (to `authenticated`) | Repo | Live | Verdict |
|---|---|---|---|
| SELECT `claim_requests`, `arguments`, `reactions` | absent | 200 (probed) | drift — capture |
| UPDATE `messages` | absent | trigger reached on edit | drift — capture |
| INSERT `messages` | absent | posting works | drift — capture |
| UPDATE `claims`, `arguments`, `evidence` | absent | PATCH-200 probes + retract paths | drift — capture |
| INSERT/DELETE `claim_votes` | absent | working toggle | drift — capture |
| DELETE `claims` | absent | RLS-deny (not 42501) | drift — capture |

The difference is historical (dashboard-era grants, mechanism unrecorded), not intentional design and not unsafe (RLS policies, verified correct, do all narrowing — including the author-only/requester-only shapes). A full effective-grant audit beyond this evidence-bounded set remains follow-up work.

`202609090011_capture_effective_grants.sql` (new) captures exactly the table above, additive-only, RLS untouched, clearly header-marked as requiring owner approval.

## 6. Files changed / migrations created

Created (repo only, unapplied): `202609090009`, `202609090010`, `202609090011`. Modified: none (no src, no existing migrations, no MDs).

## 7. Tests performed

- SQL grammar parse: all 11 Phase 7D files OK (`pgsql-parser`).
- Isolated full-chain suite (embedded PG 18, base + 13 + 3 fixes, 4 identities, RLS under roles): **42/42 PASS** — F1 accept/skip/decline succeed via the real fixed function (+ invalid/non-author rejections intact), F2 tombstone succeeds with the new literal, grant-gated reads narrow correctly, plus the carried-over lifecycle/RLS/reaction/vote coverage.
- `npx tsc --noEmit`: PASS (0). `npm run lint`: 0 errors (18 pre-existing warnings). `npm run build`: PASS.
- UI positive lifecycle still needs seeded staging (unchanged constraint); no staging exists.

## 8. MCPs actually used

Sequential Thinking (fix-shape reasoning — CASE-over-CHECK-widening, placeholder-over-CHECK-relaxation, evidence-bounded grant scope); all five verified WORKING at session start (Playwright/GitHub/Context7/Fetch probes). Playwright/GitHub/Context7/Fetch verified but not materially needed (no UI/manifest/doc/network questions in this DB-logic task) — reported, not pretended.

## 9. Production impact

**Zero.** No push, no writes, no fixtures, no history change. Production still runs the F1/F2 defects (Accept/Skip/Decline erroring; argument deletion impossible) until the owner approves the push.

## 10. Rollback strategy

Each migration documents its own revert (re-apply predecessor text). All three are additive/OR-REPLACE with no data rewrite, so rollback is a forward re-apply, never a restore — though the verified privileged backup remains available per standing policy. Recommended push order is filename order (090009→090011 slot after 090008), followed by the 30-check matrix rerun.

## 11. Remaining gaps

Seeded staging for UI positive lifecycle + live invalidation refresh; full effective-grant audit beyond the evidence-bounded set; future `delete_claim`/`delete_argument` RPCs (triggers ready/dormant).

## FINAL VERDICT

### A. READY FOR OWNER-APPROVED PRODUCTION APPLY
