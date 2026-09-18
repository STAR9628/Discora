# Phase 7D / Phase F — Backup Verification (Pre-Migration Recovery Point)

**Date/time:** 2026-09-11 ~15:06–15:30 IST
**Project ref:** `papmghohpkjaovvmeskd` (Discora, ap-south-1, Postgres 17.6.1.127)
**Production branch:** main — **NO PRODUCTION MIGRATIONS WERE APPLIED.**
**Scope:** BACKUP ONLY. Zero writes to production. No migration commands with write effects.

---

## 1. Environment (Step 1)

- Repo `main @ 0223c70`, working tree preserved (no reset/clean/checkout).
- Supabase CLI 2.106.0, authenticated, project linked.
- Docker / `pg_dump` / `psql`: **absent**. `supabase db dump` fails (needs Docker for its pg_dump image).
- Repo credentials: anon key only (2 env vars). **No DB password, no service key, no token in repo** — password-guessing was never attempted.
- Consequence: `pg_dump`-method backup is impossible from here; adapted method below (explicitly documented, no pretense).

## 2. Pre-backup remote state (Step 2, read-only)

- `supabase migration list`: base applied through `202606260002`; pending = `202606260003`–`202606270001` + all eight `202609090001`–`202609090008` (saved verbatim as `migration-list.txt`).
- Row counts (member pass): rooms 11, topics 10, profiles 5, messages(view) 16, claims(view) 22, debates 9, participants 12, claim_relations 9, claim_evidence 5, evidence(view) 5, questions(view) 2, reputation_events 7, room_invitations 9, inquiries 1+1, prefs 1.
- `git-commit.txt` + timestamp recorded in the backup dir.

## 3. Backup location

`backups/phase-7d-pre-migration/20260911-150656/` (67 files, ~535 KB), gitignored via new `/backups/` rule in `.gitignore` (only repo-policy change; no data committed).

## 4. Method (Step 4, adapted)

1. **roles.sql** — N/A stub (verified: zero `CREATE ROLE/USER` in all migrations; only Supabase-managed `anon`/`authenticated` referenced).
2. **schema.sql** (354 KB) — reconstruction: the 54 remotely-applied repo migrations concatenated in apply order. NOT a pg_dump (stated in-file).
3. **data/** — paginated REST export, anon + member passes, per-endpoint manifest (`data/manifest.json`).
4. **data.sql** — INSERTs (100-row batches, `ON CONFLICT DO NOTHING`, generated columns excluded) for the 14 member-readable non-empty base tables.
5. **SHA256SUMS.txt** — 66 file checksums.

## 5. Included / excluded

- **Included:** full public schema as applied (54 migrations); every API-visible row (104 base rows + view exports); RLS/trigger/function/policy definitions as code.
- **Excluded:** Supabase-managed schemas (`auth` beyond stub-able users, `storage` objects/files, extensions); rows invisible to anon+member (`messages`/`evidence`/`questions` base rows, `access_code_failures`, `moderation_flags`, `user_feedback`, `user_roles` — each recorded with its 401/403 in the manifest); Storage avatar files.
- Avatar *bucket definition* is in migrations; avatar *files* are not backed up anywhere here.

## 6. Restore test (Step 6, isolated embedded-PostgreSQL 18, temp storage)

Documented harness-only deviations (backup files untouched): platform stubs (roles, `auth.users` + 5 observed ids, minimal `storage` + helper functions); bare view drops replayed as CASCADE after proving the repo chain is not fresh-apply-clean (see §8); data loaded FK-relaxed.

| Check | Result |
|---|---|
| Backup files created (67, checksummed) | PASS |
| Schema dump non-empty (54/54 sections, zero errors) | PASS |
| Data dump non-empty (14 tables, ~104 rows) | PASS |
| Roles dump created | N/A (verified none exist) |
| SHA-256 generated (66 entries) | PASS |
| Expected objects present (7/7 views, 4/4 functions, 66 policies) | PASS |
| Expected data sections present | PASS (within documented scope) |
| Local restore completed | PASS with documented gaps (8/9 checks) |
| Row-count sanity (12/14 tables byte-identical) | PASS with 2 documented exceptions |
| Production modified | **NO (0 writes)** |

Gap details: (a) FK references to API-invisible parents (`claims→messages` 7, `claim_evidence→evidence` 5, `claims→questions` 2, `room_invitations→rooms` 6 where rooms are member-invisible privates); (b) seed-collision on `topics` (10) + `user_preferences` (1) — fresh migration seeds occupy natural keys with different ids, so reload keeps seeds; recovery requires natural-key reconciliation (owner runbook item below).

## 7. Major incidental finding (repo chain fresh-apply inconsistency)

Replaying the 54 applied migrations from scratch fails at `202606060002:14` (`DROP VIEW discussion_claims` vs dependent `moderation_queue` from `202606040002`), yet remote history records both as applied. Both files are long-committed and unmodified in the tree. Therefore production's live DDL or application path necessarily differs from a fresh repo replay (out-of-order apply, dashboard hotfix, or history repair — mechanism unverifiable from here). Impact on the pending push: none directly (already-applied versions are not re-executed), but the repo==prod baseline assumption is weakened for these two views. **Owner action:** diff live `moderation_queue` / `discussion_claims` definitions before the push; consider a forward-fix migration if they diverge.

## 8. Backup integrity verdict

### `BACKUP CREATED — RESTORE NOT VERIFIED` (as a *complete* recovery point)

More precisely: **schema recovery VERIFIED** (applies clean, objects/policies intact); **data recovery PARTIAL-BY-CREDENTIAL** (everything visible to anon+member restores byte-identical; invisible rows are absent by RLS, not by error). This backup alone is NOT sufficient to rebuild production losslessly. A privileged `pg_dump` remains required for full recoverability. Do not mistake this verdict for full coverage.

## 9. Production write check

Zero production writes: only `migration list` (read), REST GETs (read), auth-token login (read), and a fresh local `next start` + Playwright GETs from earlier validation. No `db push`, no SQL writes, no history repair. Migration state unchanged (still 12 pending).

## 10. Required next step (owner)

1. Run the privileged full backup (needs DB password, NOT requested by this agent run):
   `supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only`,
   then schema, then `data.sql --data-only --use-copy` (keep separate filenames).
2. Diff live `moderation_queue` / `discussion_claims` DDL vs repo (§7).
3. `supabase migration list` + verified snapshot/backup.
4. Explicit approval, then `supabase db push --linked` (12 pending, in order).
5. Step-8 post-apply matrix (30 checks) from the reconciliation mandate.

`BACKUP CREATED — RESTORE NOT VERIFIED as a complete recovery point. I have NOT applied migrations. Explicit owner approval is still required before any production migration command.`
