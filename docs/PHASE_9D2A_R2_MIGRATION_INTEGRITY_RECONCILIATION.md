# Discora — Phase 9D.2A-R2 Migration Integrity Reconciliation

**Phase:** 9D.2A-R2 (Friend Core — Migration Integrity Reconciliation + Race-Safe Inbox Cap)
**Scope of this document:** PART A only — integrity of `202609130001` / `202609130002`.
**Date:** 2026-09-15 (recovery run after 2026-09-14 shutdown; prior Antigravity run artifacts recovered, not assumed).
**Hard stops observed:** no production push, no production writes, no edits to any
already-applied migration (130001, 130002, 140003 untouched), no migration-history
manipulation, no repair commands, no commits, no pushes. `supabase migration list`
used read-only.

---

## 1. State table (evidence, not inference)

Remote ledger (`supabase migration list`, read-only, 2026-09-15):

| Version | Remote applied | Local file | Content status |
|---|---|---|---|
| 202609130001 | YES | present (untracked) | DIVERGED — local file has DO-guard wrapper not present at apply time |
| 202609130002 | YES | present (untracked) | DIVERGED — local file has DO-guard wrapper not present at apply time |
| 202609130003 | YES | present (untracked) | no divergence alleged |
| 202609140003 | YES | present (untracked) | no divergence alleged |
| 202609140004 | NO (local-only) | present (untracked) | new, sequential, unapplied to production |
| 202609140005 | NO (local-only) | present (untracked) | new, sequential, unapplied to production |
| 202609140006 | NO (local-only) | present (untracked) | new R2 cap migration, local-only, applied to local sandbox only |

All migrations in `supabase/migrations/` are untracked (`??`) on branch `main`
(HEAD `0223c70`). No stash entries. Reflog contains only old product commits and
cline checkpoints — no R2 migration-history manipulation.

## 2. Recovery investigation log (2026-09-14 + 2026-09-15)

Searched, read-only, for any byte-authoritative copy of the as-applied 130001/130002:

1. `git log --all`, `git reflog`, `git stash list` — no record of these files (untracked).
2. `git fsck --dangling --no-reflogs` + `cat-file` scan of every dangling blob for
   `17265c80` / `admin_get_overview_stats` — **zero hits** (re-ran 2026-09-15, `scan-complete`).
3. `supabase/archive_9c4a_incident/` — contains only 140001/140002. No 13000x content.
4. `supabase/deploy_pending_migrations.sql` — no `2026091300` / owner-UUID content.
5. `scripts/rebuild-phase8d-migration.mjs` — **contains the full unguarded SQL template
   for 130002** (see §4). No equivalent rebuild script exists for 130001 (only
   `phase8a-security-qa.mjs` / results JSON, which assert behavior, not bytes).
6. `docs/PHASE_8A_ADMIN_CONSOLE_IMPLEMENTATION.md` — no embedded original SQL
   (grep for `user_roles` insert / `do $$` / `auth.users` guard: no match).
7. Prior-run artifact `rendered_130002_original.sql` (Temp, 2026-09-14 20:41) — recovered
   but found to be an **imprecise extraction** (trailing-backtick contamination, 894-byte
   delta vs a clean render). Superseded by the clean render in §4; not relied upon.

## 3. Classification — 130001: **C (original bytes NOT recovered)**

- No rebuild script, no dangling blob, no archive, no doc embeds the as-applied bytes.
- Current local file `202609130001_admin_console_foundation.sql` lines 35–42 wrap the
  owner admin-role insert in:
  `do $$ begin if exists (select 1 from auth.users where id = '17265c80-…') then … end if; end $$;`
- The guarded shape is consistent with a post-apply local edit (same guard idiom as
  130002), but without an independent source the original bytes are **not recoverable**.
  Not fabricated.

## 4. Classification — 130002: **B (reconstructed from evidence; byte identity unprovable)**

- Source: `scripts/rebuild-phase8d-migration.mjs` (in-repo generator that writes exactly
  `supabase/migrations/202609130002_phase_8d_data_hygiene_and_seeding.sql`).
- Clean render (template + 7 constant substitutions, no other edits) diffed against the
  current file with `git diff --no-index`: **exactly 6 insertions / 2 deletions** —
  the entire divergence is the Section-4 seeding guard:
  - header comment `…SEEDING` / `-- Owner UUID: …` → `…SEEDING (guarded: runs only when owner user exists)`
  - `do $$` / `begin` / `if exists (select 1 from auth.users where id = '17265c80-…') then` inserted at line ~253
  - `end if;` / `end $$;` appended at lines ~901–902
  - All ~890 other lines (DDL, triggers, purge deletes, all seeded rows) byte-identical.
- This is a **reconstruction**, not a recovery: Supabase records only version/name in
  `supabase_migrations.schema_migrations`, never SQL bytes, so byte identity with the
  production-applied file **cannot be proven**. Never called "original".

## 5. Semantic-equivalence assessment (bounded claim)

- Both guards are conditional on the owner auth user (`17265c80-…`) existing.
- Production apply ran with the owner present (owner-role row + seeded discourse exist in
  production per the 8A/8D implementation reports), so the guard was a no-op there:
  applied behavior == unguarded behavior on the production state.
- On a fresh database without the owner, the guarded files skip owner-attributed writes
  instead of failing on FK — strictly more portable, no behavior change where data exists.
- This assessment justifies treating the divergence as **contained**, not as license to
  edit history: the files remain immutable going forward.

## 6. Operational impact on the forward chain

- Supabase matches applied migrations by **version name**, not content hash. Remote already
  records 130001/130002/130003/140003 as applied, so a future push applies only
  140004 → 140005 → 140006 in filename order (verified: local-only rows in ledger output).
- 140004/140005/140006 do not depend on the guarded-vs-unguarded shape of 130001/130002
  (140004 consumes only `is_active_user()`-adjacent objects; verified in the R audit).
- No corrective migration for 130001/130002 is required: there is no live defect, only a
  provenance exception. Per governance, smallest coherent change wins — document, don't rewrite.

## 7. Governance disposition

- Recorded as a **historical migration-integrity exception** (applied-then-edited, pre-R2).
- Rule going forward: already-applied migrations are immutable; all corrections ship as
  new sequential migrations. 140006 complies (new file, after 140005, no retroactive timestamp).
- Nothing in this part authorizes production deployment. Production state unchanged by R2.

## 8. What was deliberately NOT done

- No edits to 130001 / 130002 / 140003 (verified: `git status` shows no `M` on any migration).
- No `migration repair`, no ledger writes, no push (only read-only `migration list`).
- No byte-level "original" claimed for either file (C and B respectively, honestly labeled).
