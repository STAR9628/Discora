# Phase 7D / Phase F — Migration Revision Report (R1–R7)

**Date:** 2026-09-11
**Agent:** OpenCode (migration-safety / backend-correction; revision only)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → Implementation → UX → Assumptions
**Scope:** R1–R7 revision of the unapplied `202609090001`–`202609090008` drafts + verification. No migration applied. No production data touched. Phase G NOT started.

---

## 1. Executive verdict

**R1–R7: COMPLETE (all seven resolved in the working tree) — with two explicit residuals that require a live database, not more drafting.**

All gate findings were corrected in the migration drafts: both view rewrites now preserve the hardening-era definitions exactly (plus only the new columns); the conversion path works on historical messages without weakening the 5-minute rule (executed proof: 18/18 assertions on real PostgreSQL 18 running the verbatim amended functions); tombstone/immutability contradictions fixed (executed proof); dangerous FK churn removed; `search_path` pin restored; private-debate authorization aligned to `has_room_access()` with archived-room semantics preserved.

Residuals (cannot be closed without a database): (a) the amended set has never been applied anywhere — production/history remains NOT VERIFIED, no apply performed per mandate; (b) full-deploy ordering/integration (all 8 in sequence on a real project) still needs the owner's preview-branch dry run. Phase F therefore remains **PASS WITH GAPS (code) / unapplied (backend)** — closer to shippable, but NOT promoted to PASS by this session.

---

## 2. Initial R1–R7 findings (from the readiness gate, all confirmed by re-inspection)

| ID | Finding | Severity |
|---|---|---|
| R1 | `090001` rewrote `discussion_messages` stale: inline predicate, no moderation redaction, no `is_moderated` | CRITICAL |
| R2 | `090002` rewrote `discussion_claims` stale: no `question_id`/`debate_side`, no hidden-filtering, inline predicate | CRITICAL |
| R3 | `convert_message_to_claim` UPDATE blocked by 5-min `enforce_message_edit_rules` on old messages | HIGH |
| R4 | Tombstone UPDATEs self-defeat vs immutability triggers; no DELETE policy/RPC → uninvokable | HIGH |
| R5 | FK `SET NULL` retargets on `NOT NULL` (`claim_votes`, `inquiry_items`) | MEDIUM |
| R6 | `090008` recreated RPC without `SET search_path` pin | LOW (improvement; predecessor also lacked it) |
| R7 | New views/policies/RPC checks used inline public-or-creator, excluding private-debate participants | LOW–MEDIUM (fail-closed) |

Two further defects were found during this revision (beyond the gate): (a) `CREATE OR REPLACE VIEW` cannot insert new columns mid-list — the drafts placed `converted_claim_id`/`deleted_at` mid-SELECT and would have failed at apply; new columns are now appended last. (b) The `create_argument` / `toggle_reaction` RPC room checks (not just views/policies) excluded participants — aligned as part of R7 with archived-guards preserved.

Note on a prior claim: `PHASE_7D_PHASE_A_RECONCILIATION.md` §7B "VERIFIED" the `SET NULL` FK changes as safe. That verification is factually superseded: both columns are `NOT NULL` (`202606030006:156`, `202606120001:16`), so the change could never have worked. The reconciliation doc itself is left untouched (historical record); this report records the correction.

---

## 3. Exact changes made

**`202609090001_claim_conversion_foundation.sql`** (R1, R3): `discussion_messages` rewritten as the `202606240001` body verbatim + `converted_claim_id` appended last; `enforce_message_edit_rules()` upgraded with (i) converted-message freeze (marker/type/content immutable once set) and (ii) narrow one-time conversion exemption (NULL→uuid marker, `message`→`claim`, all other columns identical, matching `claims` row with `origin_message_id` required).

**`202609090002_claim_deletion_lock_foundation.sql`** (R2, R4, R5): `discussion_claims` rewritten as the `202606210001` body verbatim + `deleted_at/deleted_by` appended last; `enforce_claim_immutability()` gains the exact-shape one-way tombstone exemption; §10 FK churn deleted entirely (tombstone needs no FK changes); DORMANT invocation note added (no DELETE policy/RPC in this set).

**`202609090003_claim_requests_foundation.sql`** (R7): aggregated view gates on `has_room_access(cr.room_id)`; author/requester policies untouched (identity exposure already correct).

**`202609090004_discussion_arguments_foundation.sql`** (R4, R7): argument immutability gains the exact-shape tombstone exemption; DORMANT note; view + select/insert policies gate on `has_room_access()` with an explicit archived-write guard; `create_argument` room check admits participants while keeping archived frozen.

**`202609090005_reactions_foundation.sql`** (R7): select/insert policies + `reaction_aggregates` gate on `has_room_access()` with archived-write guard; `toggle_reaction` room check admits participants while keeping archived frozen.

**`202609090006_saved_room_alias_foundation.sql`**: unchanged (verified safe; already uses `has_room_access()`).

**`202609090007_epistemic_cleanup.sql`**: unchanged (drop-names byte-verified against `202606100004`; role-helper reference resolves).

**`202609090008_homepage_vote_ordering_cleanup.sql`** (R6): added `SET search_path = public`.

**`scripts/phase-f-conversion-regression.sql`** (new): 7-assertion psql regression script for a real preview/dev project (NOT EXECUTED here — no DB access; identical assertions executed via the harness below).

---

## 4. Migration files modified/created

Modified (in place): `202609090001`, `202609090002`, `202609090003`, `202609090004`, `202609090005`, `202609090008`. Untouched: `202609090006`, `202609090007`. Created: `scripts/phase-f-conversion-regression.sql`, this report.

**Why in-place amendment (file-strategy justification):** the eight files are untracked working-tree drafts — never committed, absent from the reachable database (all objects HTTP 404), referenced by no deploy script (`deploy_pending_migrations.sql`, `phase5b/phase5d_production_deploy.sql` contain zero `20260909` references). Amending yields one clean ordered deploy story with no unsafe intermediate. Each amended file carries an R-note header recording the revision. Contingency: owner must run `supabase migration list` before first apply — if any `20260909*` version shows as applied in any relevant environment, these amendments must instead be re-issued as superseding files. Production migration history remains NOT VERIFIED.

---

## 5. Why each change is safe

- **View merges:** byte-level column/predicate parity with the authoritative predecessors was verified field-by-field (only additions); dependents (`moderation_queue`) keep every referenced column; `CREATE OR REPLACE` keeps them valid; no `DROP ... CASCADE` anywhere in the 7D set.
- **R3 exemption:** cannot edit content (requires byte-identical content/room/author/identity/parent/created), cannot repeat (requires NULL marker), cannot forge (requires live matching claim row created atomically by the author-checked RPC); ordinary edits and young-message behavior byte-identical to before (control assertion passes).
- **R4 exemptions:** single exact mutation shape, one-way (NULL→set), placeholder literal enforced; undeletion/other edits still raise; retraction path untouched; invocation dormant by construction (no DELETE policy/RPC added).
- **R5 removal:** zero FK/DDL churn remains in 090002; CASCADE relationships byte-identical to base; tombstone preserves rows by design.
- **R6 pin:** additive hardening clause; function body otherwise identical.
- **R7 alignment:** `has_room_access()` verified to exclude archived for reads exactly like the old predicates for public/anon, and to add ONLY active debate participants; write paths carry an extra explicit archived guard, so archived rooms stay frozen for everyone including owners (status quo preserved).
- **No product drift:** no voting/credibility/reputation/consensus/winner/SoU-threshold/gamification/badge surface added or altered; SoU maturity untouched.

---

## 6. View-definition comparison

`discussion_messages` (090001 §5 vs `202606240001`): identical columns/order/predicates/redaction/`is_moderated`, plus appended `converted_claim_id`. Consumers verified: `discussion-service` maps `convertedClaimId` + `isModerated` — both present.

`discussion_claims` (090002 §8 vs `202606210001:322`): identical columns/order/`has_room_access`/resolved-hidden exclusion/vote aggregates/`user_vote`, plus appended `deleted_at/deleted_by`. Consumers verified: `questionId`, `debateSide` mappings present.

`claim_requests_aggregated` / `reaction_aggregates` / `discussion_arguments`: predicates widened from inline to `has_room_access()` only; column sets untouched; grants untouched.

---

## 7. Conversion-trigger fix explanation

`enforce_message_edit_rules` (BEFORE UPDATE, fires under SECURITY DEFINER too) rejected every update to messages older than 5 minutes — including the conversion RPC's own marker write. The revised function orders checks as: (1) converted-message freeze, (2) narrow conversion exemption (field-exact + live-claim proof), (3) original 5-minute + immutability rules unchanged. Authorization remains in `convert_message_to_claim` (author-only, type/length/converted guards). Residual direct-SQL path (author hand-marking own message) requires a real matching claim row and affects only the author's own message — accepted and documented.

---

## 8. Deletion-lock status

Semantics implemented and executed: 20-minute configurable lock (`claim_deletion_config`, default 20), author-only, server-side, tombstone (`deleted_at/deleted_by`, placeholder content, `is_retracted`), related rows preserved (no FK changes). **Invocation: DORMANT** — no DELETE RLS policy and no `delete_claim`/`delete_argument` RPC exist in this set, so the triggers cannot fire via PostgREST. Next phase must add the two SECURITY DEFINER RPCs (author + lock + room checks) before any delete UI. No punishment/penalty path exists anywhere in the design.

---

## 9. RLS / private-debate authorization analysis

All new TABLE policies and all three aggregation views now use `has_room_access()` (public non-archived / owner / active participant; outsiders and anon-in-private excluded). Write paths (policies + `create_argument`/`toggle_reaction` RPCs) add an explicit archived guard preserving the original frozen-archive semantics. `create_claim_request` already encoded participant access and is unchanged; `decide_claim_request` (author-only) and the requester/author SELECT policies were already correct and are unchanged. `requester_details` remains author-visible-only. Live role-matrix testing is impossible until apply — marked NOT VERIFIED, queued for the post-apply step.

---

## 10. Production migration history status

**NOT VERIFIED** (unchanged). No linked remote, no service key, no owner-provided history; `supabase_migrations` not exposed over REST. Actual-object probes (re-run this session) still show all Phase 7D objects absent. History must be obtained via `supabase migration list` before first apply (see contingency in §4).

---

## 11. Whether any production migration was applied

**NO.** This session ran zero migration commands, zero data writes against any project database. The only live database ever started was an isolated embedded-PostgreSQL instance in OS temp storage (created and destroyed by the harness; zero production contact).

---

## 12. TypeScript result

`npx tsc --noEmit` → **PASS, exit 0** (no `src` changes this session; re-run to confirm no regression).

## 13. Lint result

`npm run lint` → **PASS, 0 errors, 18 pre-existing warnings** (unchanged baseline).

## 14. Build result

`npm run build` → **PASS** (all routes generated; fresh `next start` used for QA to avoid stale-chunk errors).

## 15. Test results

- **SQL static parse** (`pgsql-parser`, real grammar): all 8 amended migrations **parse OK**.
- **R3/R4 executable harness** (embedded PostgreSQL 18, verbatim function text extracted from the amended files with drift-guard): **18/18 assertions PASS** — old-edit rejected; 2-hour-old conversion succeeds; exactly one claim; marker in place; repeat/non-author rejected; converted frozen; young-edit control passes; claim immutability/retraction/lock/tombstone/undeletion/non-author all correct; argument immutability + tombstone correct. Harness stubs only auth/rooms/base tables (documented); views/RLS/policies are parser+review verified, not executed.
- **Repo regression script** `scripts/phase-f-conversion-regression.sql`: created, **NOT EXECUTED** (no project DB access) — same 7 assertions for the owner's preview run.

## 16. Playwright results

Direct Playwright, fresh production server: member login OK; debate + discussion actions/composer intact; winnerLoserMentions=0 both rooms; **8/8 room×viewport targets no-overflow; 0 5xx**; console errors = only the known missing-backend 404/400 set (unchanged — migrations still unapplied, as mandated). Screenshots re-captured. Live request lifecycle remains backend-blocked by design of this task (no apply).

## 17. Remaining gaps

1. Preview-branch dry run of all 8 amended migrations in order (owner infra).
2. `supabase migration list` history reconciliation (owner credentials).
3. Backup + approved apply window (owner approval).
4. Post-apply: §6 object re-probe, `phase7d-phase-f-dbcheck`, full live lifecycle + two-identity multi-requester test + RLS negative tests.
5. `decide_claim_request`/`create_claim_request` archived-room behavior is unchanged from the drafts (noted, not altered — owner to confirm acceptable).
6. Future `delete_claim`/`delete_argument` RPCs + UI (later phase; triggers ready and dormant).

## 18. Explicit Phase F status

**PASS WITH GAPS (unchanged promotion state).** Code was already PASS WITH GAPS; the migration set is now *revision-complete* but *unapplied and un-executed-against-a-real-project*. Promotion to PASS requires gaps 1–4 above. This session does not promote Phase F.

## 19. Explicit confirmation that Phase G was NOT started

**Phase G NOT STARTED.** No evidence/argument lens UI, no chronological-node implementation, no room/sidebar/composer redesign, no new product behavior, no MD edits. Changed files: 6 migration drafts (plus 0 `src` files), 1 new repo SQL regression script, this report. Temporary validation tooling lives outside the repo (OS temp) except the committed SQL script.
