# Phase 7D / Phase F — Production Migration Verification (Owner-Gated Reconciliation)

**Date:** 2026-09-11
**Agent:** OpenCode (migration-safety / backend verification; read-only + validation only)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → Implementation → UX → Assumptions
**Scope:** Steps 1–10 of the reconciliation mandate. No migration applied. No data written. Phase G NOT started.

---

## 1. Project identity verification result — PASS (identified, anon-only repo access)

- Supabase project (via authenticated CLI `supabase projects list`): name **Discora**, ref `papmghohpkjaovvmeskd`, region **ap-south-1**, status **ACTIVE_HEALTHY**, Postgres **17.6.1.127**. CLI reports the project as linked.
- Repository credentials (`.env.local`, presence-only check): exactly two variables — public URL + anon key. **No service-role key, no DB password, no access token, no secret in the repo.** Migration/admin capability from repo-held credentials: none.
- CLI authentication itself works (persisted login from the environment), which enabled read-only history/dry-run commands. No secret was printed, copied, or committed by this session.
- `supabase/config.toml` is local-only (`project_id = "Discora"`); no `.supabase` link dir. Unlinked-repo + authenticated-CLI is the working combination used below.

## 2. Migration history result — VERIFIED (first time)

`supabase migration list` (read-only) reconciled Local vs Remote:

- **Applied remotely (base, through `202606260002`):** every migration from `202606030001` to `202606260002` inclusive shows Local == Remote. This includes the hardening chain (`202606190001`), private-debate authorization (`202606210001`, `202606220001`), the messages-view redaction fix (`202606240001`), and `user_saves` (`202606260001`).
- **Pending (Remote empty):** `202606260003`, `202606260004`, `202606260005`, `202606270001` (pre-existing gap, pre-7D scope — flagged, untouched) **and all eight `202609090001`–`202609090008`**.
- **Conflict check:** zero `20260909*` versions applied remotely. The in-place amendment of the untracked drafts is therefore vindicated — no applied migration was overwritten. No `MAJOR MIGRATION SAFETY CONCERN` of the stop-type exists.

## 3. Migration versions applied / pending

- Applied: 54 versions (`202606030001` → `202606260002`). Pending: 12 versions (4 pre-7D + 8 Phase 7D), in filename order — the exact queue a push would execute.

## 4. Live object probe results (read-only REST, anon key)

| Object | Result | Meaning |
|---|---|---|
| `claim_requests` | 404 | NOT APPLIED (090003) |
| `claim_requests_aggregated` | 404 | NOT APPLIED |
| `reaction_aggregates` | 404 | NOT APPLIED (090005) |
| `arguments` | 404 | NOT APPLIED (090004) |
| `claim_deletion_config` | 404 | NOT APPLIED (090002) |
| `discussion_messages.is_moderated` | **200** | Live view HAS moderation redaction — R1 merge base confirmed against LIVE |
| `discussion_claims.debate_side,question_id` | **200** | Live view HAS both columns — R2 merge base confirmed against LIVE |
| `discussion_claims.deleted_at` | 400 | NOT APPLIED (090002) |
| `user_saves.alias` | 400 | NOT APPLIED (090006) |

Limits (documented, not bypassed): `db dump` requires Docker (absent) — a 0-byte artifact was removed; PostgREST OpenAPI root requires service_role (absent); no `db execute` subcommand exists in CLI v2.106.0. Live verification therefore rests on history + column probes, not byte-level DDL dumps.

## 5. Dry-run result — PASS (read-only)

`supabase db push --dry-run --linked` completed without errors and listed exactly the 12 pending migrations in filename order (4 pre-7D first, then `202609090001`→`202609090008`). No checksum conflicts, no ordering complaints. Note: dry-run prints the queue only — it does **not** execute SQL. Execution proof for the riskiest functions comes from the prior session's 18/18 embedded-PostgreSQL harness (verbatim text) plus grammar parsing (this session re-confirmed 8/8 parse OK after all edits).

## 6. Backup verification result — NOT VERIFIED

No backup/snapshot could be observed or confirmed from this environment. Per mandate Step 6: **STOP BEFORE APPLY**. Owner must provide a verified backup before any push.

## 7. Whether any migration was actually applied — NOT APPLIED

Zero migration commands with write effects were run. Zero data writes to any project database. Commands used (all read-only): `projects list`, `migration list`, `db push --dry-run`, REST GET probes, `tsc`, `lint`, `build`, Playwright GETs/logins. Temporary validation artifacts live outside the repo (OS temp), except previously committed QA scripts.

## 8. Post-apply verification results — NOT TESTED

Steps 8's 30 checks require an applied backend; nothing was applied, so all 30 are NOT TESTED. The queue for post-apply day: §6 re-probe table, `phase7d-phase-f-dbcheck`, full two-identity lifecycle (request → aggregate → Accept/Skip/Decline → in-place conversion, multi-requester count, no-duplicate UI), RLS negative matrix (non-author decide, self-request, private outsider/participant, anon, archived-frozen), reactions + no-epistemic-effect checks, 5-minute-rule + freeze + repeat/non-author conversion checks, tombstone placeholder + relation preservation, moderation-redaction + `debate_side`/`question_id` intactness.

## 9. RLS results — design VERIFIED, live NOT TESTED

Independent file-level re-verification this session: R1/R2 view predicates + redaction + columns present; R3 exemption + freeze present; R4 exemptions + DORMANT markers present; R5 zero FK churn; R6 functional `SET search_path` pin present (line 25, not just comments); R7 `has_room_access()` present in all three views, all three table policies, and both RPC checks, each write path carrying an explicit archived guard. Live role-matrix testing is impossible pre-apply — NOT TESTED.

## 10. Two-identity lifecycle results — NOT TESTED (backend absent)

The lifecycle script was NOT re-run this session: its outcome cannot differ without a backend (last execution blocked at RPC lookup with graceful degradation), and re-running it would add no signal. The supplementary debate QA below was re-run fresh. Lifecycle remains blocked on apply. Stated, not fabricated.

## 11. Playwright results — PASS (baseline re-confirmed)

Direct Playwright, fresh `next start` (post-build to avoid stale-chunk errors): member login OK; debate (Reply=1, React=1, Request=2, composer=1, winnerLoserMentions=0); discussion (Reply=12, React=12, Request=6, composer=1, winnerLoserMentions=0); **8/8 room×viewport (375/390/834/1440) no-overflow; 0 5xx**; console errors = only the known missing-backend 404/400 set. Identical to baseline — expected, as `src` is untouched.

## 12. Epistemic regression results — PASS (one documented dead-code hit)

Repo-wide sweep for credibility/voting/competition signals: zero hits except `Most Influential` label inside `discussion-intelligence.tsx`, which is reachable only via `map-tab.tsx` → imported by **zero** routes (verified: no importers under `src/app`; sole importer chain is the dead cluster itself). Classification holds: genuinely unreachable dead code, Phase O cleanup scope. No live path votes/reactions→credibility/reputation/SoU/ranking; no evidence/argument voting; no Winner/Loser; SoU maturity untouched.

## 13. tsc / lint / build — PASS / PASS / PASS

`npx tsc --noEmit` exit 0. `npm run lint` 0 errors (18 pre-existing warnings). `npm run build` all routes generated. (`src` unchanged; re-runs confirm no regression.)

## 14. Remaining gaps

1. Owner-provided backup (unverified → blocks apply).
2. Explicit owner approval for the push (absent in this context → no apply).
3. The 4 pre-7D pending migrations (`202606260003`–`202606270001`) will ride along in any push — owner to confirm they are wanted (out of this task's scope; flagged, not altered).
4. Byte-level live DDL dump (needs Docker or service_role; column-level probes used instead).
5. Full Step-8 matrix post-apply.

## 15. Whether Phase F is promoted to PASS — NO

Phase F stays **PASS WITH GAPS (code) / backend unapplied**. Promotion requires apply + Step-8 matrix green.

## 16. Whether Phase G is allowed to start — NO

Phase G builds on the unapplied foundation; starting it now would stack UI on a nonexistent backend. **Phase G NOT STARTED** (zero Phase G files, UI, or decisions this session).

## 17. Safety classification (Step 4) — READY FOR OWNER-APPROVED APPLY

Not "safe to dry run" (dry run already done and passed) and not blocked on history/conflict/drift/script-safety (all cleared). The only remaining gates are extrinsic: verified backup + explicit owner approval.

## 18. Exact safe command sequence for the owner (run in order, stop on any failure)

```bash
# 0. Safety: confirm this exact queue and nothing else
supabase migration list
# 1. Verify backup/snapshot exists (dashboard → Database → Backups) — REQUIRED, do not skip
# 2. Read-only dry run (already passed once; re-run on apply day)
supabase db push --dry-run --linked
# 3. Apply (includes 4 pre-7D pending + 8 Phase 7D, in order)
supabase db push --linked
# 4. Confirm history recorded
supabase migration list
# 5. Post-apply probes + lifecycle (Steps 8-10 of the mandate)
node scripts/phase7d-phase-f-dbcheck.mjs
node scripts/phase7d-phase-f-lifecycle.mjs
node scripts/phase7d-phase-f-debate-qa.mjs
```

Rollback note: all 8 Phase 7D migrations are forward-only additive except view/function `OR REPLACE`s; keep the pre-apply backup until the Step-8 matrix is green. If any check fails, restore from backup — do not hand-edit production objects (that would desync migration history).

---

## FINAL DECISION RULE — verdict

### D. "READY FOR OWNER-APPROVED APPLY — DO NOT START PHASE G"
