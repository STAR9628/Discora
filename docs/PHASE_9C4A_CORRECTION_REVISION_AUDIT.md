# Phase 9C.4A Correction Revision + Migration Chain Safety Audit

**Document Status:** Read-Only Analysis + Local Correction Preparation (No Production Write)
**Previous Review:** `docs/PHASE_9C4A_CORRECTIVE_MIGRATION_FINAL_REVIEW.md` — verdict C. BLOCKED
**Correction Created:** `supabase/migrations/202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql` (local only, never executed anywhere)
**Date:** September 14, 2026
**Reviewer:** OpenCode (post-Antigravity handoff)

> **Final verdict: B. CORRECTION READY WITH OPERATOR DEPENDENCIES**
>
> The three blockers (B1 policy renames, B2 `toggle_reaction` return type, B3 `create_claim_request` validation loss) are corrected in a new standalone migration designed for the verified clean pre-9C.4A production state, plus one further dropped guard found during this revision (`create_inquiry` P0-3 cross-room IDOR check). Migration-history evidence (`supabase migration list`: Remote empty for both `202609140001` and `202609140002`; dry-run push order confirms) proves MODEL A: neither defective file was ever applied, so the correction must NOT assume `140002` applied — and the defective pending files must be retired from the local pending queue by the operator before any `db push`, otherwise the push will attempt defective `140001` first and fail. No production write was performed. Standing by for Product Owner approval.

---

## 1. Current Migration Tracking Model

VERIFIED by direct evidence (not assumed):

- **CLI-tracked history is authoritative.** `npx supabase migration list` (read-only, this session) shows Local vs Remote columns. All migrations through `202609130003` have BOTH Local and Remote entries. `202609140001` and `202609140002` have Local entries with EMPTY Remote columns — i.e., never applied to the linked remote, never recorded in `supabase_migrations`.
- **Dual workflow in this repo.** History shows both `supabase db push --linked` (Phase 7D 13-migration apply, Phase 8D) and Supabase Dashboard SQL Editor single-batch execution (deploy bundles, the `140001` incident). `supabase/config.toml` has `[db.migrations] enabled = true`.
- **Dry-run proof of push order.** `npx supabase db push --dry-run` (read-only) lists: `202609140001` first, then `202609140002`. A push today would execute the defective `140001` and fail with 22P02 before reaching anything else.
- **No CI migration automation found.** `.github/` contains no workflow that pushes migrations (`ls .github` surfaced no workflow files in this inspection); `package.json` has no supabase scripts. Deployment is operator-driven.
- **Nothing was modified.** No history repair, no `repair` command, no marks, no deletions performed in this review.

## 2. Production Starting-State Assumptions

Prior verified facts (recovery audit), re-confirmed statically against migration history in the previous review and unchanged by anything in this turn:

- `user_role_type` = (`moderator`, `admin`); NO `system_owner` (canonical: `202606040001:8`).
- `profiles.is_deleted` absent; `is_active_user()` absent; `is_privileged_user()` absent; `retired_handles` absent.
- `admin_audit_logs_admin_id_fkey` exists as `ON DELETE CASCADE` (canonical: `202609130001:9`); orphans previously `0` (must be re-checked at apply time).
- Remote history tip is `202609130003` (this session's `migration list`). Marked as prior verification where not re-queried live; the history tip itself WAS re-queried live this session.

## 3. 140001 Status

- Historical defective migration. Executed once in SQL Editor; failed at `is_privileged_user()` (22P02); transactionally rolled back; zero persisted changes.
- **Not in remote history** (Remote empty). Local file preserved UNTOUCHED as the incident record per the hard boundary. It remains in the local pending queue and WILL block `db push` until retired by the operator (Section 5).

## 4. 140002 Status

- Corrective attempt. **Never executed anywhere; not in remote history** (Remote empty). BLOCKED in review (B1/B2/B3).
- Local file preserved UNTOUCHED (no silent rewrite) per the hard boundary. It remains second in the pending queue behind `140001` and must likewise be retired by the operator before any push (Section 5).

## 5. Safe Migration-Chain Strategy — MODEL A (Evidence-Based)

**Chosen: MODEL A** — a corrected STANDALONE migration for the clean pre-9C.4A state — because remote history proves neither `140001` nor `140002` was applied. MODEL B (delta assuming `140002` applied) is factually wrong and would fail (missing base objects) or double-apply.

Chain-safety consequence (the most important question): the operator MUST retire the two defective pending files from `supabase/migrations/` (archive outside the directory; preserved in git history + incident docs) BEFORE any `db push`, so the corrected file is the sole pending 9C.4A migration. This retirement is NOT performed in this review (no history manipulation). Alternatives and why they are worse:

- Executing via SQL Editor instead of CLI: possible (single-batch transaction) but bypasses `supabase_migrations` tracking, leaving history desynced and requiring later reconciliation. CLI path with retired defectives is cleaner and is the documented Phase 7D/8D precedent.
- Editing `140001` in place: forbidden (incident record) and would still leave a confusing chain.
- `supabase migration repair`: operator-only, unnecessary when the files were never applied; physical retirement of unapplied local files is the history-safe mechanism.

New file `202609140003` was created on the assumption of a clean starting state AND documents this retirement prerequisite in its own header.

## 6. RLS Correction Analysis (B1 Fixed)

Before/after per table (USING / WITH CHECK / role / ownership / active-user):

| Table / Op | Before (prod, permissive to in-flight JWT) | After (`140003`, canonical name, hardened) |
|---|---|---|
| `profiles` UPDATE (`Users can update their own profile`) | `id=auth.uid()` | `id=auth.uid() AND NOT is_deleted AND is_active_user()` — drop-both applied |
| `reactions` INSERT (`Authenticated users can create reactions`) | `user_id=auth.uid() AND has_room_access AND NOT archived` | + `is_active_user()` — drop-both applied |
| `reactions` DELETE (`Users can delete their own reactions`) | `user_id=auth.uid()` | + `is_active_user()` — drop-both applied |
| `claim_requests` INSERT (`Authenticated users can create claim requests`) | `requester_id=auth.uid()` | + `is_active_user()` (name already canonical) |
| `claim_requests` UPDATE (`Requesters can update their own requests`) | `requester_id=auth.uid()` both clauses | + `is_active_user()` both clauses; foundation predicates preserved, NO new status filter — drop-both applied |
| `user_saves` ×3 (names match history) | `user_id=auth.uid()` | + `is_active_user()` |
| `user_preferences` INSERT/UPDATE (`...their own preferences`) | `user_id=auth.uid()` | + `is_active_user()` — drop-both applied; SELECT policy untouched (read-only) |
| `storage.objects` ×3 `avatars` (names match) | namespace + extension allowlist | + `is_active_user()` |

All policies are permissive (project convention) with `TO authenticated`; ownership predicates preserved. Deleted user + in-flight JWT now fails every hardened write path: direct-table paths via the new guards, room-scoped tables transitively via `has_room_write_access()` (which conjoins `is_active_user()`), inquiry paths via RPC guards. Convergence verified by name: every `DROP POLICY` targets either a history-verified canonical name or a defensive 140002-attempted name, and every `CREATE POLICY` uses the canonical name — no parallel-policy outcome possible on the clean starting state.

## 7. toggle_reaction Correction (B2 Fixed)

- Production contract: `RETURNS boolean` (`202609090005:134-138`; client `discussion-service.ts:1308-1326` returns `data as boolean`).
- `140003` restores `RETURNS boolean` with verbatim foundation toggle logic (`true`=added, `false`=removed), adding ONLY `or not public.is_active_user()` to the auth check. `search_path` hardened to `public, pg_temp`. Grants: `REVOKE FROM public, anon; GRANT TO authenticated` (matches foundation). Static check confirms `returns boolean` present.

## 8. create_claim_request Correction (B3 Fixed)

- Restored from `202609090003:142-209`: `own_message` rejection, `message_type='message'` requirement, `converted_claim_id IS NULL` requirement, upsert-on-`(message_id,requester_id)` dedup (room_id via the existing `handle_claim_request_insert` trigger), private-visibility/participant authorization, `not_found` handling.
- Added ONLY: `is_active_user()` gate + archived-room guard (D2, consistent with room write-freeze; documented).
- Additional find fixed in this revision: `140002`'s `create_inquiry` had ALSO dropped the P0-3 cross-room claim IDOR guard (`202606210002:106-123`: target claim must exist, belong to `p_room_id`, not be retracted). `140003` restores that block verbatim alongside the archived + active-user guards. `respond_to_inquiry` keeps the `140002` superset (lifecycle + reputation + archived + active-user), which preserves foundation behavior.

## 9. is_active_user Review

Unchanged from the approved design (Section 7 of the final review, re-asserted): `SECURITY DEFINER`, `search_path public, pg_temp`, `auth.uid() IS NOT NULL AND NOT EXISTS (deleted profile)`. Matrix: anon→false; active→true; deleted→false; pre-onboarding profiless→true (onboarding safe); service_role→BYPASSRLS semantics with correct impersonated evaluation. No RLS recursion (base-table read as owner). One-bit leak only. `anon` grant required for policy-expression evaluation. Preserved verbatim in `140003`.

## 10. is_privileged_user Review

`role IN ('admin', 'moderator')` — zero `system_owner` in executable SQL (static grep: 3 hits, all comments). No enum touch (zero `CREATE/ALTER TYPE`). Grants tightened vs `140002`: `REVOKE ALL ... FROM PUBLIC` added, then revoke anon/authenticated, then `GRANT ... TO service_role`. No browser-client role probing possible.

## 11. Retired Handles Review

Preserved: permanent PK retirement, `lower(trim())` normalization, RLS-enabled private table, `REVOKE anon, authenticated`, `GRANT SELECT, INSERT TO service_role`, `BEFORE INSERT OR UPDATE OF username` trigger. No public enumeration path. Residual MEDIUM note stands: DB exception text vs native unique-violation text may differ, so the app layer must normalize to one generic message (Phase B/E privacy test).

## 12. Admin Governance Review

FK `admin_audit_logs_admin_id_fkey` CASCADE→RESTRICT replacement preserved; correct constraint; orphan pre-flight mandatory (Section 21 of the final review, re-listed below). No audit rows mutated. Owner/admin middleware untouched.

## 13. Storage Review

`avatars` INSERT/UPDATE/DELETE policies preserved from `140002` (names match history): UUID-namespace equality, `is_active_user()`, extension allowlist on write checks. No bucket/object deletion, no worker, no cleanup. `service_role` bypass intact for future worker.

## 14. Idempotency Analysis (for the Actual Starting State)

- Clean pre-9C.4A: all `IF NOT EXISTS` / `OR REPLACE` / `DROP IF EXISTS` converge; FK attaches after orphan check. PASS.
- Partially provisioned (e.g., column added, nothing else): guards converge each object independently. PASS.
- Failed-transaction rollback: single-batch execution rolls back fully (proven pattern from the `140001` incident). PASS.
- Already-correct state (re-run): drops remove the canonical hardened policies and recreate them identically; functions `OR REPLACE`; trigger/constraint drop+recreate; FK drop+re-add RESTRICT. Converges with no error. PASS.
- Accidental retry: same as above. PASS.
- Idempotency is NOT merely claimed from `IF EXISTS`: the critical property — exactly ONE policy per hardened operation afterward — follows from canonical naming (C1 fix).

## 15. Transaction / Rollback Analysis

`140003` is ordered column→helpers→policies→RPCs→table-before-trigger→governance/FK with no forward references, intended as ONE SQL Editor batch / ONE `db push` migration (single implicit transaction). Mid-file failure aborts the block; no partial persistence under transactional execution. Do NOT split into chunks or autocommit piecewise (operator dependency).

## 16. Google OAuth Boundary

Static grep on `140003`: zero `auth.users` mutations (1 hit = FK reference), zero `CREATE/ALTER TYPE`, zero OAuth/identities/callback statements (1 hit = "No OAuth change" comment), zero destructive user-data statements (1 hit = foundation toggle-off `delete from reactions`, user-scoped). `config.toml` confirms Google provider `enabled = true`; app button/service/callback untouched. Google Sign-In remains fully supported. PASS.

## 17. Account Deletion Boundary

`140003` contains: no `execute_account_deletion`, no orchestration tables/workers, no de-identification (column defaults `false`; no row marked), no storage wipe, no Danger Zone change (still hard-disabled per code read), no legal UX change. Database-only hardening. PASS.

## 18. Local Validation

- Static SQL checks: `system_owner` 3/3 in comments; `toggle_reaction RETURNS boolean` confirmed; privileged predicate `role in ('admin','moderator')` confirmed; 9 `SECURITY DEFINER` functions all with pinned `search_path`; all refs schema-qualified; no dynamic SQL.
- `npx tsc --noEmit`: PASS (zero errors; no src changes).
- `npm run lint`: 0 errors, 40 warnings (identical pre-existing set; no new warnings).
- `npm run build`: PASS (Next.js 15.5.25, 28/28 pages, middleware 88.9 kB).
- SQL execution (even locally) was NOT performed: no local Supabase DB running per this review's read-only mandate for migration execution; convergence argued statically + dry-run ordering evidence.

## 19. Playwright Status

- Attempted (`browser_navigate` to host `/login`): `ERR_CONNECTION_REFUSED` — Docker MCP container cannot reach host dev server (same isolation as previous review). **NOT VERIFIED** (explicitly reported, not fabricated).
- Substitute: Danger Zone disabled + Google button verified by code reads in the previous review; source tree unchanged since (only new files: one migration + this report); `tsc`/`lint`/`build` green. Live viewport/console/overflow checks deferred to post-approval QA; migration is database-only so UI regression risk is nil.

## 20. Exact Corrected Migration Path

1. Product Owner approves this revision (file `202609140003_...`, sole pending 9C.4A migration after step 2).
2. Operator retires `202609140001` + `202609140002` from `supabase/migrations/` (archive outside dir; git history + incident docs preserve them). `202609140001` is NEVER edited.
3. Re-run Section 21 pre-flights of the final review (enum, FK name, orphans=0, objects absent, NEW policy inventory vs canonical names, storage inventory, client `boolean` contract).
4. `supabase db push --dry-run` must then list ONLY the corrected file as pending 9C.4A work; else stop.
5. Single-batch apply (`db push` or SQL Editor whole-file), then post-apply verification (column, index, helpers, table+RLS, FK `RESTRICT`, exactly-one-policy-per-operation, `toggle_reaction` type), then the four 9C.4 spec verification tests in non-production first.
6. STOP. No Phase B without separate authorization.

## 21. Remaining Risks / Dependencies

- Operator must not skip the retirement step (else push executes defective `140001`).
- Orphan re-check mandatory (FK `RESTRICT` fails closed on orphans — safe direction, but apply would abort).
- `create_reputation_event` dependency must exist at apply time (present in history: `202606100004`).
- Retired-handle message normalization belongs to the app layer (Phase B/E test).
- Deferred defense-in-depth (`save_target_secure`, `create_argument`, `convert_message_to_claim`) stays Phase B scope.
- Legal/PITR/runbook dependencies from the 9C.3R spec remain open and undecided here.

## 22. Final Verdict

**B. CORRECTION READY WITH OPERATOR DEPENDENCIES**

The correction file is complete, statically validated, and history-safe BY DESIGN for the proven clean starting state — but production execution depends on: (a) Product Owner approval of this revision, (b) operator retirement of the two defective pending files before any push, (c) fresh pre-flight checks, (d) single-batch apply + post-apply verification. No blockers remain in the correction itself; all remaining items are operator-gated prerequisites, not further corrections.

**Absolute stop condition observed:** no production SQL executed; no migration pushed or marked; no history repaired; no Phase 9C.4B; no deletion; no Danger Zone change; no OAuth change. Standing by for Product Owner review.
