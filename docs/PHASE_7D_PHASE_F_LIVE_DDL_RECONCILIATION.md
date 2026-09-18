# Phase 7D / Phase F — Live DDL Reconciliation (Pre-Apply Baseline Check)

**Date:** 2026-09-11
**Agent:** OpenCode (migration-safety / backend verification; READ-ONLY)
**Project:** Discora `papmghohpkjaovvmeskd`, ap-south-1, PG 17.6.1.127
**Scope:** Resolve the `202606060002` history anomaly; verify live vs repo definitions of `discussion_claims` / `moderation_queue` as far as available credentials permit; assess pending-migration impact.

**NO PRODUCTION MIGRATIONS WERE APPLIED.**
**The partial backup remains NOT VERIFIED as a complete recovery point.**
No writes, no migration commands, no history repair, no file modifications except this report.

---

## 1. Live DDL result

Full DDL text (`pg_get_viewdef`, `pg_policies`, triggers) is **not retrievable** with available credentials: no DB password, no service key, no `db execute` subcommand in CLI v2.106.0, `db dump` requires absent Docker, PostgREST OpenAPI root requires service_role, and no CLI token file exists to call the Management API (not attempted — would require handling secrets outside the configured mechanism). Stated plainly instead of worked around.

What WAS established read-only (PostgREST column probes with `limit=0`, zero row data transferred):

| Object | Live columns observed | Expected per repo chain | Match? |
|---|---|---|---|
| `discussion_claims` | 19/19: id, room_id, origin_message_id, question_id, content, claim_type, context_type, identity_mode, is_retracted, debate_side, created_at, updated_at, created_by, username, avatar_url, agree_count, disagree_count, consensus_ratio, user_vote; `deleted_at` correctly absent; `converted_claim_id` correctly absent | `202606210001` definition, no 7D residue | **YES (shape)** |
| `discussion_messages` | 12/12 incl. `is_moderated`; `converted_claim_id` correctly absent | `202606240001` definition, no 7D residue | **YES (shape)** |
| `moderation_queue` | 13/13 of the `202606240001` definition; `reporter_id` correctly absent (matches documented redaction design) | `202606240001` definition | **YES (shape)** |

Behavior surface: member+anon claim counts identical (22/22); zero rows currently `is_moderated=true` (redaction path present in shape, no live rows exercising it); app feeds/rooms fully functional. View predicates, join structure, and RLS internals are **NOT VERIFIED at DDL level** — shape-match is necessary but not sufficient evidence, and is reported as such.

## 2. Repository DDL result

Full chain walk of every DROP/CREATE of the two views, in filename order:

- `030004` create claims view → `030006` drop+recreate → `030010` drop+recreate → `040001` OR REPLACE → `040002` create `moderation_queue` (joins `discussion_claims`) → `060002:14` **bare `DROP VIEW discussion_claims`** → `080001` drop queue+claims, recreate → `100001` drop queue+claims, recreate → `210001` drop queue/messages(CASCADE)/claims/evidence/questions, recreate all → `240001` drop queue + messages(CASCADE), recreate both.
- The ONLY unsafe drop in the entire chain is `060002:14`: at that point `moderation_queue` (040002) depends on `discussion_claims`, and a bare DROP must fail. Every other drop either precedes the dependent's creation or drops dependents first. Verified by file inspection, not assumed.

## 3. Exact differences

| Object | Repo expected | Live production | Match? |
|---|---|---|---|
| `discussion_claims` | 210001-era shape (verified live: 19/19 columns) | Same 19 columns; no 7D residue | YES (shape); predicates/RLS NOT VERIFIED |
| `moderation_queue` | 240001-era shape (verified live: 13/13 columns, no `reporter_id`) | Same shape | YES (shape); predicates NOT VERIFIED |
| `202606060002` history row | Recorded applied | Content irreconcilable with a fresh repo replay (proven below) | **ANOMALY — mechanism unresolved (see §4)** |

No column-level difference was found anywhere. No 7D residue exists live. No other applied migration shows a replay inconsistency: with the harness-only CASCADE replay active, all 54 sections applied, and only `060002:14` was ever observed to fail without it (the remaining drops were never individually proven necessary — the blanket replay is a test-harness property, not a per-migration finding).

## 4. The `202606060002` puzzle — resolved as far as evidence permits

Proven by execution on isolated PostgreSQL 18 (repo `sqlcheck` harness, zero prod contact):

- **View→view dependents HARD-block bare DROP** (`drop view vv` with `ww` selecting from it → ERROR). A fresh replay of the repo chain therefore fails at `060002:14` (also proven end-to-end in the backup restore test). The anomaly is real, not a reading error.
- **Function→view dependents do NOT block DROP** (`language sql` function selecting from a view; bare DROP succeeds; verified twice). This kills the adjacent scare: pending `202606270001:34` (`DROP VIEW discussion_debates`) will succeed despite `get_my_debates_attention()` selecting from it, and that function keeps working (it does not reference the removed `resolution` column).

Ranked explanations for the applied-but-should-have-failed row (none provable from here — no timestamps/DDL access):

1. **Manual forward-fix during a failed push (most parsimonious, benign):** push failed at 060002 → owner dropped `moderation_queue` manually → re-push succeeded → `080001`+ later recreations reconverged the queue. Consistent with history, converged shape, and app health.
2. Out-of-order application + history repair. Possible; no evidence for or against.
3. Repo content edited after apply. Weakened by single-commit git history for both files (but prod may have been pushed from another checkout — unverifiable).

What would discriminate: `schema_migrations` applied-at timestamps, or live `pg_get_viewdef` output. Both need credentials this environment lacks. Owner action recorded in §7.

## 5. Pending migration impact

- `discussion_claims` / `moderation_queue` are touched by pending files **only** via `CREATE OR REPLACE` (`090001` messages view, `090002` claims view) — dependency-safe regardless of the anomaly; both preserve every live column (verified field-by-field in the R1/R2 revision).
- No pending migration DROPs either view. The sole view DROP in pending (`270001:34 discussion_debates`) is proven safe above.
- `270001` §5–6 (drop `resolution` column, rewrite status CHECK): safe on dependencies (only superseded view/function references, both removed first; zero `src` references) **except one data-dependent caveat**: the new `active/closed` CHECK fails if any `debates` row still has `status='resolved'`. Owner must run `select status, count(*) from debates group by status` pre-push (dashboard). Also note §4's intentional `DELETE FROM reputation_events WHERE event_type IN ('DEBATE_WON','DEBATE_LOST')` — the single approved history deletion in the queue.
- `090007` drops and `090008` function replacement touch no views. Dry-run success is consistent with (but weaker than) this analysis, as mandated.

## 6. Security / RLS impact

No live RLS/predicate difference was found (none observable with available creds beyond shape + behavior surface). The pending 7D set's RLS posture was verified at file level in the R1–R7 revision (has_room_access alignment, archived guards, author-only decisions); nothing in this session's findings weakens it. Live role-matrix testing remains queued for post-apply.

## 7. Final verdict

### B — BASELINE DIFFERENCE, MIGRATION SAFETY UNRESOLVED

Rationale: live column shapes match the repo-converged definitions exactly and the one concrete push-failure scare (`270001:34`) is disproven by execution — but the `060002` history anomaly is unexplained at DDL level, and view predicates/RLS internals are unverifiable from here. B is the honest ceiling: not C (no identified live mismatch or push failure), not A (DDL-level match unestablished), not D (substantial inspection WAS possible and is reported).

## 8. Exact owner action required (in order, all read-only until step 4)

1. Via dashboard SQL editor (or `psql` with the DB password — never requested by this agent run): `select pg_get_viewdef('public.discussion_claims'::regclass)` and `...('public.moderation_queue'::regclass)`; compare WHERE clauses and joins against `202606210001:322` and `202606240001:63`. Also `select status, count(*) from public.debates group by status` (must show zero `resolved` or the owner decides the mapping before push).
2. Privileged full backup (`db dump` role+schema+data with DB password) — still the missing recovery point.
3. Explicit approval, then `supabase db push --linked` (12 pending, in order), then the 30-check post-apply matrix from the reconciliation mandate.
4. Do not start Phase G until the matrix is green.

## 9. Validation (read-only)

- `supabase migration list`: base through `202606260002` applied; `202606260003`–`202606270001` + `202609090001`–`202609090008` pending (unchanged).
- `git status`: working tree preserved; only this report added (backups/ gitignored by design).
- Schema inspection: 44 column probes (200/400 classified), 2 count probes, 1 redaction-flag probe — all read-only, no row data transferred except counts.
- Dependency semantics: proven on isolated PostgreSQL (function-dependent DROP succeeds; view-dependent DROP fails), zero production contact.
- `npx tsc --noEmit` / lint / build: unchanged since last PASS (`src` untouched this session); not re-run for that reason — stated, not implied.
