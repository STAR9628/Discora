# Phase 7D / Phase F — Privileged Backup Verification (Pre-Migration Recovery Point)

**Timestamp:** 2026-09-12 ~13:47–14:30 IST
**Project ref:** `papmghohpkjaovvmeskd` (Discora, ap-south-1, Postgres 17.6.1.127)
**Scope:** BACKUP ONLY. Read-only against production plus a disposable local restore.

**NO PRODUCTION MIGRATIONS WERE APPLIED.**
**NO PRODUCTION DATA WAS MODIFIED.**

---

## 1. Backup method

Official Supabase CLI dumps against the linked project (platform-routed auth; the `--db-url` form failed on an unencoded-credential parse, so `--linked` was used — no secret ever printed, saved, or committed):
`db dump --linked -f roles.sql --role-only`, then schema, then `data.sql --data-only --use-copy`.
Location: `backups/phase-7d-pre-migration/20260912-134723/` (gitignored; the earlier partial backup is untouched).

## 2. Dump files, sizes, checksums

| File | Bytes | SHA-256 |
|---|---|---|
| `roles.sql` | 358 | `4350a72b…0bf615` |
| `schema.sql` | 236,240 | `a6dbbdc7…d3f406d236` |
| `data.sql` | 167,169 | `ce09b7f1…2cab13d1` |

(Full hashes in `SHA256SUMS.txt`; prefixes above for readability. Dump completion lines confirmed per file; `data.sql` ends with `PostgreSQL database dump complete`.)

## 3. Coverage / exclusions

- **Included:** `auth` data (users, identities, sessions, MFA, SSO, refresh tokens); `storage` data (buckets, objects, multipart, vectors); all 27 `public` tables with rows (incl. `messages`, `moderation_flags`, `user_roles`, `user_feedback` — previously API-invisible); full `public` DDL (tables, views, functions, triggers, 60+ policies, FKs); extensions (`pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`); role settings.
- **Excluded by dump design:** `auth`/`storage` table *definitions* (Supabase-managed schemas; data present, DDL must come from the platform on recovery); Storage *files* (metadata rows only); server config beyond role settings.
- **Expected absences (correct pre-7D):** `claim_requests`, `convert_message_to_claim`, and all Phase 7D objects — 0 references in schema dump.

## 4. Restore result — VERIFIED (disposable Docker postgres:17, destroyed afterward)

Test-only scaffolding (documented, never in backup files): platform roles, `extensions` schema, minimal `auth` (`users` table + `uid()` stub), `supabase_realtime` publication; `supabase_vault` extension line skipped (single line, zero references); 8 observed user IDs pre-seeded for FKs; data loaded with `session_replication_role='replica'` because Discora's own validating triggers (e.g. claim↔evidence link authorization) reject superuser COPY — **real recovery must do the same, then re-validate** (as done here).

- `schema.sql`: **zero errors**, strict `ON_ERROR_STOP=1`.
- `data.sql` (public sections): **zero errors**, strict mode.
- Counts: debates **27 (active 26 / resolved 1)**, messages 16, claims 22, profiles 5, rooms 29.
- Objects: 5/5 key views, `has_room_access`, 67 policies, no `claim_requests`.
- **56/56 foreign keys VALIDATEd with zero violations.**

## 5. Production-write result — NO WRITES

`supabase migration list` after the backup: same 13 pending (`202606260003`–`202606270001` incl. disposition `202606260006`, plus `202609090001`–`202609090008`); Remote history unchanged. Only reads otherwise (REST counts, CLI list/dump).

## 6. Migration-history result

Unchanged from prior verification: base applied through `202606260002`; 13 pending; zero `20260909*` applied.

## 7. Pre-apply state recorded

`debates`: **active = 26, resolved = 1** (privileged dump counts; member-visible subset 8/1 via RLS). The single `resolved` row (`4120c703-…`, `ai vs human`) is the approved-disposition target and was NOT modified.

## 8. Remaining gaps / notes

- Auth/storage *definitions* must come from the Supabase platform on a real recovery (documented above); Storage files need object-store-level backup (out of scope here).
- `supabase_vault` line and validating-trigger behavior are recovery-runbook items (recorded in backup README).
- Test container and image layers aside, no stray artifacts remain in the repo (only this report + the gitignored backup dir + the pre-existing `/backups/` ignore rule).

## 9. Final verdict

### BACKUP VERIFIED
