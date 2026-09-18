# Discora — Final Migration Ledger Reconciliation + Production Migration Manifest

**Mode:** READ-ONLY RECONCILIATION. No application code modified. No migration files created, edited, repaired, or reordered. No `supabase db push`. No production contact of any kind. No commits. No pushes. No deploys.
**Date (UTC):** 2026-09-18
**Scope:** `supabase/migrations/` filesystem inventory vs. production ledger evidence from in-repo reports. Local Supabase CLI catalog inspection was read-only (filesystem + git only; no live `supabase migration list` executed in this task — the linked-project reference in `supabase/.temp/` is dated 2026-06-10 and is not treated as ledger evidence).

---

## 1. Executive Summary

- **Local inventory (VERIFIED by filesystem):** 87 `*.sql` files in `supabase/migrations/`. **57 tracked in git, 30 untracked** (verified by `git ls-files` diff, 2026-09-18).
- **Verified production position:** `202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql` — evidence: `docs/PHASE_9C4A_PRODUCTION_APPLY_REPORT.md` (post-apply ledger shows 140003 recorded remotely, no 140001/140002), corroborated by `docs/PHASE_9D2A_R_PRODUCTION_PREFLIGHT_AUDIT.md` §15 (remote applied through 140003) and `docs/PRE_BETA_SECURITY_REMEDIATION_P1_P2_REPORT.md` §Migration ("remote still through 202609140003"). **No live production contact was made in this task; the position is report-evidenced, not live-verified.**
- **Migrations to apply (manifest, §9): 13 files** — 2 old-timestamp repairs (`202606040003`, `202606100006`) + 11 forward migrations (`202609140004` → `202609220001`). Plain `supabase db push` will refuse (insert-before-tip); the only viable path is `supabase db push --include-all`, a documented deviation already established in the 9D.2A preflight audit.
- **Historical integrity exceptions (preserved, not rewritten):** `202609130001` = **C (original bytes NOT recovered)**; `202609130002` = **B (reconstructed from `scripts/rebuild-phase8d-migration.mjs`; byte identity unprovable)** — per `docs/PHASE_9D2A_R2_MIGRATION_INTEGRITY_RECONCILIATION.md`. Both are already applied to production and must never be edited or replayed. `202609140001` (failed `22P02`, rolled back) and `202609140002` (blocked in review) are archived in `supabase/archive_9c4a_incident/` and must never be pushed.
- **Critical new finding of this task:** the four production-applied migrations `202609130001 / 202609130002 / 202609130003 / 202609140003` are **all untracked in git** (present in the 30-file untracked set). The production-applied state therefore has no git-byte authority for 4 of its own ledger entries. Forward-only deployment remains possible (Supabase matches by version name, not content hash), but byte-level drift of those four files can no longer be detected by git.
- **Additionally:** four implementation reports requested by prior tasks were never created as files (`FINAL_PRE_BETA_PRODUCTION_READINESS_AUDIT.md`, `PRE_BETA_OAUTH_18PLUS_ENFORCEMENT_REPORT.md`, `PRE_BETA_ACCOUNT_DELETION_IMPLEMENTATION_REPORT.md`, `PRE_BETA_SEO_AI_IMPLEMENTATION_REPORT.md` — all `Test-Path = False`, 2026-09-18). Prior-task chat summaries referencing them (e.g. "8 later migrations") are inaccurate against the filesystem (actually 11 beyond 140003). Details in §8.
- **Verdict: B — Reconciled with explicit conditions** (§14).

---

## 2. Exact Local Migration Inventory

87 files total. 57 tracked, 30 untracked. The 30 untracked files (VERIFIED by `Compare-Object` of directory listing vs `git ls-files`, 2026-09-18):

```
202606040003_repair_moderation_queue_view_dependency.sql
202606100006_repair_moderation_queue_base_tables.sql
202606260006_retire_legacy_resolved_debate.sql
202606270001_remove_winner_loser_system.sql
202609090001_claim_conversion_foundation.sql
202609090002_claim_deletion_lock_foundation.sql
202609090003_claim_requests_foundation.sql
202609090004_discussion_arguments_foundation.sql
202609090005_reactions_foundation.sql
202609090006_saved_room_alias_foundation.sql
202609090007_epistemic_cleanup.sql
202609090008_homepage_vote_ordering_cleanup.sql
202609090009_fix_claim_request_decision_status.sql
202609090010_fix_argument_tombstone_length.sql
202609090011_capture_effective_grants.sql
202609130001_admin_console_foundation.sql
202609130002_phase_8d_data_hygiene_and_seeding.sql
202609130003_phase_8d_debate_side_alignment.sql
202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql
202609140004_phase_9d2a_friend_core_foundation.sql
202609140005_restore_moderation_queue_full_definition.sql
202609140006_phase_9d2a_friend_inbox_cap.sql
202609150001_phase_9d3_room_invitation_remediation.sql
202609160001_phase_9c4_account_deletion_foundation.sql
202609170001_pre_beta_security_remediation.sql
202609180001_reputation_snapshot_authenticated_select.sql
202609190001_pre_beta_18plus_inquiry_visibility.sql
202609200001_user_preferences_client_grants.sql
202609210001_fix_deleted_user_display_in_public_views.sql
202609220001_oauth_18plus_enforcement.sql
```

Per-migration purpose / surface analysis for the 13 manifest migrations (all others are pre-production history, unchanged):

| # | Timestamp | Filename | Purpose (from file header/body) | Tables | RLS | Grants | RPCs | Views | Destructive? | Data-transform? | Forward-only safe? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 202606040003 | repair_moderation_queue_view_dependency | Drop/recreate `moderation_queue` on base tables (remove view-on-view dep on `discussion_claims`); inquiry_items intentionally omitted (table not yet existent at this chain position) | — | — | — (preserved) | — | ✅ `moderation_queue` | No (view only) | No | Yes, **only together with 140005** |
| 2 | 202606100006 | repair_moderation_queue_base_tables | Drop/recreate `moderation_queue` on base tables (remove all 4 discussion_* view deps); inquiry_items omitted; full definition restored by 140005 | — | — | — (preserved) | — | ✅ `moderation_queue` | No (view only) | No | Yes, **only together with 140005** |
| 3 | 202609140004 | phase_9d2a_friend_core_foundation | Friend core: `friend_requests`, `friend_relationships`, `user_blocks`, `friend_request_rate_counters`; 12 DEFINER RPCs + helpers; owner-scoped SELECT; no client DML | ✅ 4 new | ✅ new (owner SELECT only) | ✅ EXECUTE on 7 mutation RPCs | ✅ 12+5 | — | No | No | Yes |
| 4 | 202609140005 | restore_moderation_queue_full_definition | Restore full `moderation_queue` incl. `inquiry_items`; byte-identical to canonical `202606240003` except header; **must deploy together with 040003** | — | — | — (preserved) | — | ✅ `moderation_queue` | No (view only) | No | Yes, **only together with 040003** |
| 5 | 202609140006 | phase_9d2a_friend_inbox_cap | Recipient pending-inbox cap 50: partial index + `friend_recipient_lock` advisory lock + `create_friend_request` enforcement rewrite; lock ordering pair→recipient (deadlock-free) | Index only | — | EXECUTE re-grant on rewritten RPC | ✅ rewrite | — | No | No | Yes |
| 6 | 202609150001 | phase_9d3_room_invitation_remediation | M3 remediation: `token_hash` + `expires_at` + verified backfill; drop plaintext `invitation_token`; status gains `expired`; UPDATE revoked; 9 RPC bodies; throttle tables; bcrypt access codes | ✅ 2 new tables; ✅ 2 new columns | ✅ new tables (no client grants) | ✅ revokes + EXECUTE | ✅ 9 | — | **YES — drops plaintext column (one-way hash, irreversible)** | **YES — backfill hashes + expiry** | Yes, with backup + gate verification |
| 7 | 202609160001 | phase_9c4_account_deletion_foundation | Option C foundation: `deletion_operations`, `storage_cleanup_queue`, `deletion_step_up_proofs`; `execute_account_deletion` + `reconcile_deletion_operations` (service_role only); authorship nullability relaxations; trigger exemptions; RLS gap closure | ✅ 3 new | ✅ updated (is_active_user) | ✅ service_role only | ✅ 2 + trigger rewrites | — | Column relaxations (DROP NOT NULL) only; RPC DELETEs execute only on user deletion, not at apply | No rows touched at apply | Yes |
| 8 | 202609170001 | pre_beta_security_remediation | P1-01 SELECT grants (3 tables); P2-01 claim_relations INSERT narrowing; P2-02 debates UPDATE tautology fix; P3-01 `claim_deletion_config` RLS enable; P3-02 search_path pins | — | ✅ 2 policies replaced | ✅ 3 SELECT + revokes | — (ALTER … SET search_path) | — | No | No | Yes |
| 9 | 202609180001 | reputation_snapshot_authenticated_select | Least-privilege SELECT on `user_reputation_snapshots` TO authenticated (self-only RLS policy pre-exists) | — | — | ✅ 1 grant | — | — | No | No | Yes |
| 10 | 202609190001 | pre_beta_18plus_inquiry_visibility | `enforce_signup_age_attestation` hook fn (EXECUTE to `supabase_auth_admin` only) + anon SELECT grants/policies on `inquiry_items`/`inquiry_responses` (public-room-gated) | — | ✅ 2 new anon policies | ✅ anon SELECT + hook EXECUTE | ✅ hook fn | — | No | No | Yes |
| 11 | 202609200001 | user_preferences_client_grants | SELECT/INSERT/UPDATE on `user_preferences` TO authenticated (own-row RLS pre-exists) | — | — | ✅ 3 grants | — | — | No | No | Yes |
| 12 | 202609210001 | fix_deleted_user_display_in_public_views | `CREATE OR REPLACE` 5 views: `discussion_messages`, `discussion_claims`, `discussion_evidence`, `discussion_questions`, `discussion_arguments` — `CASE WHEN p.is_deleted = true THEN 'Deleted User'` inserted before the `p.username IS NULL` fallback (all 5 verified by grep, 2026-09-18) | — | — | — (preserved) | — | ✅ 5 | No (view only) | No | Yes |
| 13 | 202609220001 | oauth_18plus_enforcement | `ALTER TABLE profiles ADD COLUMN age_confirmed boolean NOT NULL DEFAULT false` + partial index; application middleware/page enforce attestation | ✅ 1 column + index | — | — | — | — | No | No (default backfill, nullable-equivalent) | Yes |

Non-manifest local-only migrations present in the directory but **already behind the production tip or superseded** (not in manifest): `202606260006`, `202606270001`, `202609090001`–`202609090011`, `202609130001`, `202609130002`, `202609130003` — these sort ≤ 140003 and, per the ledger evidence, the 13000x set is already recorded as applied (see §4 for the integrity exception).

`202609140001` / `202609140002` are **absent from `supabase/migrations/`** (VERIFIED by directory listing) and present only in `supabase/archive_9c4a_incident/` (140001 + 140002 files present, VERIFIED). They must never be pushed.

---

## 3. Verified Production Position

**`202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql`** — the last migration evidenced as applied to production.

Evidence (no live contact in this task):
1. `docs/PHASE_9C4A_PRODUCTION_APPLY_REPORT.md` §Post-Apply Verification: post-apply ledger shows `202609140003 | 202609140003 | 202609140003`; "No 140001. No 140002."; 14 verification items confirmed.
2. `docs/PHASE_9D2A_R_PRODUCTION_PREFLIGHT_AUDIT.md` §15: "Remote applied: … 202609130001, 202609130002, 202609130003, 202609140003. Remote empty (Local-only): 202606040003, 202606100006, 202609140004, 202609140005."
3. `docs/PRE_BETA_SECURITY_REMEDIATION_P1_P2_REPORT.md` §Migration: "remote still through 202609140003"; `docs/PRE_BETA_REMEDIATION_18PLUS_INQUIRY_CONSENSUS_REPORT.md` §4: "remote through 202609140003"; `docs/PRE_BETA_UI_REMEDIATION_BATCH_1_REPORT.md` §17: same.
4. `supabase/.temp/linked-project.json` + `project-ref` exist but are dated 2026-06-10 and are **not** treated as ledger evidence (stale local CLI state).

**Classification of every manifest migration: KNOWN LOCAL ONLY** except the two old-timestamp repairs (`202606040003`, `202606100006`), which are **KNOWN LOCAL ONLY, sort-before-tip** (per the preflight audit §B.5 dry-run evidence). No manifest migration is KNOWN PRODUCTION. No manifest migration has UNKNOWN status — all 13 are evidenced local-only by the reports above. The UNKNOWN category in this reconciliation applies only to **byte identity** of already-applied files (§4), not to ledger position.

---

## 4. Historical Migration Integrity

### 4.1 What is known
- `202609140003` was applied to production cleanly on 2026-09-14 with 14 verification items (9C4A apply report). Its local file requires the CLEAN pre-9C.4A state and explicitly documents the 140001/140002 exclusion. No divergence alleged for 140003 in any report; its local file is untracked in git but content-verified by the apply report.
- `202609130003` applied to production; no divergence alleged (R2 §1).
- `202609140001` failed in production (`22P02` enum `system_owner`), rolled back fully, Remote empty; preserved in `supabase/archive_9c4a_incident/`. `202609140002` blocked in review, Remote empty; same archive. Both absent from `supabase/migrations/`. (140003 header + 9C4A apply report.)
- All 57 git-tracked migration files (all ≤ `202606100005` plus scattered later foundations) match git history by definition of being tracked and unmodified (`git status` shows no `M` on any migration file — VERIFIED 2026-09-18).

### 4.2 What is reconstructed
- `202609130002`: **B — reconstructed from `scripts/rebuild-phase8d-migration.mjs`**; clean render diffed vs current file = exactly 6 insertions / 2 deletions (the Section-4 seeding `DO`-guard). All ~890 other lines byte-identical. (R2 §4.)
- The rebuild script `scripts/rebuild-phase8d-migration.mjs` is present in the repo (VERIFIED in `git status` untracked `scripts/` listing).

### 4.3 What cannot be proven
- `202609130001`: **C — original bytes NOT recovered.** No rebuild script, no dangling blob (`git fsck` scan, zero hits), no archive, no doc embeds. The current local file wraps the owner admin-role insert in a `DO … IF EXISTS` guard; whether the applied bytes had this guard is **unprovable**. (R2 §3.)
- `202609130002`: byte identity with the production-applied file **cannot be proven** — Supabase records only version/name in `supabase_migrations.schema_migrations`, never SQL bytes. Never called "original". (R2 §4.)
- Live production ledger was **not re-queried in this task** (read-only constraint); the position rests on the reports cited in §3.

### 4.4 What production already accepted
- `202609130001`, `202609130002`, `202609130003`, `202609140003` recorded as applied (preflight §15; 9C4A apply report §Post-Apply).
- Semantic-equivalence argument for the 130001/130002 guards (R2 §5): both guards are conditional on the owner auth user existing; production applied with the owner present, so guard = no-op there. Bounded claim only — does not restore byte provability.

### 4.5 What should NOT be edited
- `202609130001`, `202609130002`, `202609140003` — already applied; immutable going forward.
- `202609140001`, `202609140002` — archived defect records; never push, never reintroduce.
- All 57 tracked files — unmodified; keep so.

### 4.6 Forward-only deployment: still possible
Yes. Supabase matches applied migrations by **version name**, not content hash (R2 §6). The 13 manifest files are all absent from production; none replays an applied change. The `--include-all` deviation is required only because of timestamp ordering (§6).

### 4.7 Migration history repair: NOT required and NOT recommended
No `migration repair`, no ledger writes. The R2 governance disposition stands: record the exception, never edit applied files, ship corrections as new migrations. All post-R2 work complied (140006, 150001, 160001, 170001, 180001, 190001, 200001, 210001, 220001 are all new sequential files).

---

## 5. Dependency Analysis (ordered)

Proposed apply order (filename order = dependency order; VERIFIED against file headers and the preflight §13 order):

```
1.  202606040003  (moderation_queue base rebuild; inquiry_items omitted — table not yet existent)
2.  202606100006  (moderation_queue base rebuild, all 4 views detached)
3.  202609140004  (friend tables + RPCs; requires is_active_user() from applied 140003 — satisfied)
4.  202609140005  (full moderation_queue WITH inquiry_items; requires 040003 pattern + inquiry tables from 202606120001 — satisfied)
5.  202609140006  (inbox cap; requires friend_requests from 140004 — satisfied)
6.  202609150001  (invitations; preconditions: pgcrypto digest + is_active_user() — satisfied; abort gates on backfill shape)
7.  202609160001  (deletion; requires is_active_user(), retired_handles trigger from 140003 — satisfied)
8.  202609170001  (grants/policy narrowing; requires inquiry/debate/claim tables — satisfied)
9.  202609180001  (grant only; requires snapshots table from 202606090002 — satisfied)
10. 202609190001  (hook fn + anon policies; requires inquiry tables — satisfied)
11. 202609200001  (grants only; requires user_preferences — satisfied)
12. 202609210001  (5 view replaces; requires profiles.is_deleted from 140003 + view base definitions — satisfied)
13. 202609220001  (profiles.age_confirmed column; requires profiles — satisfied)
```

Dependency rules checked:
- Tables before policies: 140004 creates friend tables before its own policies; 150001 creates throttle tables before use. ✅
- Columns before policies/RPCs: `expires_at`/`token_hash` added before RPC creation in 150001; `age_confirmed` added in 220001 with no dependent policy in the same file. ✅
- Functions before callers: `friend_recipient_lock` created before `create_friend_request` rewrite in 140006; `enforce_signup_age_attestation` created before GRANT in 190001. ✅
- Views after schema changes: 140005 after 040003/100006; 210001 after 140003 (`is_deleted`). ✅
- Grants after object creation: all GRANTs follow their CREATEs within each file. ✅
- Deletion before dependent fixes: 160001 (deletion RPC) before 210001 (Deleted User views). ✅
- Friend foundation before cap: 140004 before 140006. ✅
- Invitation foundation (pre-existing `room_invitations` table) before 150001 remediation. ✅

**No migration in the manifest is unsafe in the proposed sequence. No UNKNOWN dependencies.** The one sequencing constraint that matters operationally: `040003` and `140005` **must be deployed together** (both files' headers state this; 140005 restores what 040003 intentionally omits).

---

## 6. Data-Safety Classification

| Migration | SAFE DDL | DATA TRANSFORM | DATA DELETION | PRIVILEGE CHANGE | RLS CHANGE | FUNCTIONAL BEHAVIOR CHANGE | AUTH BEHAVIOR CHANGE | VIEW/READ CHANGE |
|---|---|---|---|---|---|---|---|---|
| 040003 | ✅ view rebuild | — | — | — | — | — | — | ✅ moderation_queue def |
| 100006 | ✅ view rebuild | — | — | — | — | — | — | ✅ moderation_queue def |
| 140004 | ✅ 4 tables, indexes, RPCs | — | — | ✅ EXECUTE grants | ✅ new owner-SELECT | ✅ new friend surface (gated) | — | — |
| 140005 | ✅ view rebuild | — | — | — | — | — | — | ✅ moderation_queue def |
| 140006 | ✅ index + fn rewrite | — | — | ✅ EXECUTE re-grant | — | ✅ cap enforcement (new reject) | — | — |
| 150001 | ✅ 2 tables, 2 columns | ✅ backfill hashes + expiry (verified gates) | ✅ **DROP COLUMN invitation_token (irreversible)** | ✅ revokes + EXECUTE | ✅ policy replace (UPDATE removed) | ✅ expiry/throttle/revoke semantics | — | — |
| 160001 | ✅ 3 tables, RPCs, relaxations | — (RPC DELETEs run only on user deletion, not at apply) | — at apply | ✅ service_role-only | ✅ 3 policies replaced | ✅ deletion available (feature-gated by UI) | ✅ GoTrue touched only at runtime, not apply | — |
| 170001 | ✅ policy replaces, ALTER … SET | — | — | ✅ 3 SELECT grants + revokes | ✅ 2 policies replaced | ✅ relation creation narrowed; archived-room rejects | — | — |
| 180001 | ✅ grant | — | — | ✅ 1 grant | — | — (unblocks existing reads) | — | — |
| 190001 | ✅ fn + 2 policies | — | — | ✅ anon SELECT + hook EXECUTE | ✅ 2 new anon policies | ✅ hook rejects unattested email signups | ✅ signup gate | — |
| 200001 | ✅ grants | — | — | ✅ 3 grants | — | — (unblocks existing reads/writes) | — | — |
| 210001 | ✅ 5 view replaces | — | — | — | — | — | — | ✅ author display for deleted users |
| 220001 | ✅ 1 column + index | — (DEFAULT false backfill, no semantic change) | — | — | — | — (enforcement lives in app middleware) | — | — |

Destructive/data-transforming detail (only 150001 qualifies):
- **150001 DROP COLUMN `invitation_token`:** one-way SHA-256 hashes cannot be reversed; post-rollback re-issue of invitations required. **Required backup:** full `room_invitations` table dump pre-apply. **Preflight:** row counts; `SELECT count(*) WHERE invitation_token IS NOT NULL`. **Post-apply:** verify no `invitation_token` column; all rows have `token_hash` + `expires_at`; duplicate-hash count = 0 (the migration itself aborts otherwise — gates at lines 86–120).
- **150001 backfill UPDATEs:** `token_hash` + `expires_at` for every legacy row. Covered by the same backup.
- **160001 column relaxations** (`DROP NOT NULL` on 4 authorship columns): permissive direction only; client INSERT paths bind authorship via RLS WITH CHECK (file header). No data rows modified at apply.
- **220001 `ADD COLUMN … NOT NULL DEFAULT false`:** backfills all existing rows to `false`. Email-signed users who attested via the hook will read `false` until profile creation sets `true` — application logic handles this (profile-form sets `ageConfirmed` for email signups). No PII touched.

---

## 7. Feature-to-Migration Cross-Check

| Beta Capability | Required DB Objects | In Manifest? | Evidence |
|---|---|---|---|
| Account deletion: `deletion_operations`, `storage_cleanup_queue`, `deletion_step_up_proofs` | 160001 tables | ✅ | File §2, lines 56–113 |
| Account deletion: `execute_account_deletion` + `reconcile_deletion_operations` (service_role) | 160001 RPCs | ✅ | File §3–4 |
| Account deletion: `profiles.is_deleted`, `is_active_user()`, `retired_handles`, `admin_audit_logs` RESTRICT | 140003 (already production) | ✅ prod | 9C4A apply report §§2–10 |
| Deleted User in 5 public views (`is_deleted` check) | 210001 | ✅ | Grep: 5× `p.is_deleted = true` + `'Deleted User'` |
| Room invitations: hash/expiry/single-use/revoke/throttle/codes | 150001 | ✅ | Header D-9D3-1…D-9D3-8; 9 RPC bodies |
| Invitation purge support (`expire_sweep`, 90-day purge) | 150001 RPCs | ✅ | 9D3 report §6 |
| Friends: requests/relationships/blocks/rate counters | 140004 | ✅ | 4 tables + 12 RPCs |
| Friends: inbox cap 50 | 140006 | ✅ | Cap check in rewritten `create_friend_request` |
| Security: inquiry/side-change SELECT grants | 170001 P1-01 | ✅ | 3 GRANTs |
| Security: claim_relations same-room write auth | 170001 P2-01 | ✅ | Policy with 6 conjuncts |
| Security: debates UPDATE tautology fix | 170001 P2-02 | ✅ | `r.id = debates.id` |
| Security: `claim_deletion_config` RLS | 170001 P3-01 | ✅ | ENABLE RLS + REVOKE ALL |
| Security: pinned DEFINER search_paths | 170001 P3-02 | ✅ | 4 ALTER FUNCTION |
| Reputation: authenticated snapshot SELECT | 180001 | ✅ | 1 GRANT (self-only RLS pre-exists) |
| Age/auth: email hook | 190001 Part 1 (already local) | ✅ | `enforce_signup_age_attestation` |
| Age/auth: OAuth `age_confirmed` column | 220001 | ✅ | ALTER TABLE + index |
| Age/auth: anon inquiry visibility (public rooms) | 190001 Part 2 | ✅ | 2 anon policies + grants |
| Preferences: client grants | 200001 | ✅ | 3 grants |
| Friends: `140005` moderation queue restore | 140005 | ✅ | Full definition with inquiry_items |

**Every currently approved Beta capability traces to a migration in the manifest.** No capability relies on an unlisted migration. (Application code — Server Actions, Danger Zone UI, attest-age page — is verified present in the working tree as untracked files; code deployment rides the frontend deploy, not the DB manifest.)

---

## 8. Inconsistencies in Previous Production Audit

`docs/FINAL_PRE_BETA_PRODUCTION_READINESS_AUDIT.md` **does not exist** (`Test-Path = False`, 2026-09-18). It was requested by a prior task whose agent summarized findings in chat instead of writing the file. The same applies to three other requested reports, all absent:

- `docs/PRE_BETA_OAUTH_18PLUS_ENFORCEMENT_REPORT.md` — absent
- `docs/PRE_BETA_ACCOUNT_DELETION_IMPLEMENTATION_REPORT.md` — absent
- `docs/PRE_BETA_SEO_AI_IMPLEMENTATION_REPORT.md` — absent

Consequences for statements made in prior-task chat summaries (NOT in any file, therefore not correctable in place — listed here instead):

1. **"8 later migrations" count is wrong.** Filesystem evidence: **11** migrations sort after `202609140003` (140004, 140005, 140006, 150001, 160001, 170001, 180001, 190001, 200001, 210001, 220001). The production manifest in §9 contains **13** files (those 11 plus the 2 old-timestamp repairs). Any planning based on "8" must be discarded.
2. **SEO SSR "unresolved architecture" vs implemented.** `docs/PRE_BETA_SEO_AI_DISCOVERABILITY_AUDIT.md` (a real file) records P1-SEO-01 as an open product decision (client-rendered room content). The subsequent SEO implementation batch created `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/opengraph-image.tsx`, discussion/debate SSR initial-data plumbing, and metadata fixes — all present as **untracked working-tree files** (git status, 2026-09-18). The audit's "no robots/sitemap/structured-data" statements describe the committed state, not the working tree. Deployment planning must account for these uncommitted files (§13.J).
3. **"All migration files match git history" would be false.** 30 of 87 migration files are untracked, including 4 production-applied ones (§4). Any such claim in prior summaries is contradicted by §2 evidence.
4. **Production ledger endpoint "202609140003" is consistent** across the 9C4A apply report, the R preflight, and three remediation reports — no inconsistency found on this point.

---

## 9. Exact Production Migration Manifest

### A. VERIFIED CURRENT PRODUCTION STATE
`202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql` (evidence §3; no live contact).

### B. LOCAL TARGET STATE
Working tree `supabase/migrations/` through `202609220001_oauth_18plus_enforcement.sql` (87 files), plus uncommitted application code (SEO SSR, OAuth attest-age page, deletion dialog, middleware age gate).

### C. MIGRATIONS TO APPLY (13, in exact order)
```
→ 202606040003_repair_moderation_queue_view_dependency.sql      (view rebuild; with #4)
→ 202606100006_repair_moderation_queue_base_tables.sql          (view rebuild; with #4)
→ 202609140004_phase_9d2a_friend_core_foundation.sql            (friend core)
→ 202609140005_restore_moderation_queue_full_definition.sql     (view restore; with #1)
→ 202609140006_phase_9d2a_friend_inbox_cap.sql                  (inbox cap 50)
→ 202609150001_phase_9d3_room_invitation_remediation.sql        (M3; destructive column drop + backfill)
→ 202609160001_phase_9c4_account_deletion_foundation.sql        (Option C foundation)
→ 202609170001_pre_beta_security_remediation.sql                (P1/P2/P3 fixes)
→ 202609180001_reputation_snapshot_authenticated_select.sql     (1 grant)
→ 202609190001_pre_beta_18plus_inquiry_visibility.sql          (hook + anon policies)
→ 202609200001_user_preferences_client_grants.sql               (3 grants)
→ 202609210001_fix_deleted_user_display_in_public_views.sql     (5 view replaces)
→ 202609220001_oauth_18plus_enforcement.sql                     (age_confirmed column)
```
Each entry: must-apply YES; preflight YES for #6 (150001) and #7 (160001); backup YES for #6; post-apply verification YES for all (§11).

### D. MIGRATIONS REQUIRING SPECIAL HANDLING
- `202606040003` + `202609140005`: deploy together (file headers + preflight §13). Reason: 040003 intentionally omits `inquiry_items`; 140005 restores it.
- `202609150001`: destructive column drop + data backfill with in-file abort gates. Reason: one-way hash; see §6/§10.
- `202609130001` / `202609130002`: **do NOT apply, do NOT edit, do NOT replay** — already applied; byte identity unprovable; Supabase matches by version name so they will be skipped automatically.
- `202609140001` / `202609140002`: **do NOT apply** — archived defects; absent from the migrations directory by design.

### E. MIGRATIONS ALREADY IN PRODUCTION
`202609130001`, `202609130002`, `202609130003`, `202609140003` (report-evidenced, §3), plus all filename-older tracked migrations (by chain position).

### F. MIGRATIONS WITH UNKNOWN PRODUCTION STATUS
**None for ledger position.** Byte-identity UNKNOWN applies to `202609130001` (C) and `202609130002` (B) per §4 — this affects drift detection, not apply/no-apply decisions.

### G. PRE-MIGRATION BACKUP REQUIREMENTS
- Full database backup (PITR snapshot verified restorable) before any apply.
- Table-level dump of `public.room_invitations` before #6 (150001).
- Record row counts: `room_invitations`, `friend_requests`, `profiles`, `admin_audit_logs` (orphan check for RESTRICT FK — expect 0).
- Record `supabase migration list` output before and after.

### H. POST-MIGRATION VERIFICATION CHECKLIST
- [ ] `supabase migration list` shows all 13 versions under Remote.
- [ ] `profiles.is_deleted`, `profiles.age_confirmed` columns exist.
- [ ] `is_active_user()`, `is_privileged_user()`, `enforce_signup_age_attestation()` present with pinned `search_path`.
- [ ] `retired_handles` exists, RLS enabled, zero policies, no anon/authenticated grants.
- [ ] `execute_account_deletion` + `reconcile_deletion_operations` EXECUTE = service_role only.
- [ ] Friend tables (4) + 12 RPCs present; `create_friend_request` contains inbox-cap check.
- [ ] `room_invitations.token_hash` NOT NULL UNIQUE; no `invitation_token` column; `expires_at` NOT NULL.
- [ ] 5 discussion views render `'Deleted User'` on `p.is_deleted = true` (query each view definition).
- [ ] `moderation_queue` full definition includes `inquiry_id`.
- [ ] `admin_audit_logs_admin_id_fkey` = RESTRICT.
- [ ] Anon SELECT on `inquiry_items`/`inquiry_responses` gated to public non-archived rooms.
- [ ] No `140001`/`140002` in remote ledger.

### I. ROLLBACK / FORWARD-FIX PLAN
- View-only migrations (040003, 100006, 140005, 210001): re-run canonical definitions (forward-fix).
- Grant/policy migrations (170001, 180001, 190001-part2, 200001): REVOKE / DROP POLICY (forward-fix).
- RPC/function migrations (140004, 140006, 160001-partial, 190001-part1): DROP FUNCTION / DROP TABLE for brand-new objects (140004 tables, 160001 tables); no rollback of already-consumed invitation/deletion rows.
- **150001: NO rollback** — plaintext tokens unrecoverable after column drop. Forward-fix only (re-issue invitations). This is accepted and documented in the 9D3 report §20.
- **220001: forward-fix only** (DROP COLUMN would lose attestation state; prefer keeping).
- Push mechanism: `supabase db push --include-all` (documented deviation); verify dry-run order matches §9.C before applying.

### J. BLOCKERS BEFORE FIRST PRODUCTION APPLY
1. **Uncommitted working tree:** 30 untracked migrations + uncommitted application code (SEO SSR, attest-age, deletion dialog, middleware). Owner must decide commit/tag strategy; pushing migrations from an undocumented tree state risks untracked-file loss. (Not a DB blocker — a release-hygiene blocker.)
2. **`supabase/archive_9c4a_incident/` must be confirmed outside the migrations path** (VERIFIED: it is a sibling directory; `db push` scans only `supabase/migrations/`).
3. **Missing implementation reports** (§8): OAuth/account-deletion/SEO/final-readiness reports were never written; dynamic verification evidence for those batches lives only in chat summaries. Owner must accept this evidence gap or re-run verification.
4. **pg_cron / scheduler** for `reconcile_deletion_operations`, invitation sweep/purge, and storage queue processing is a deployment step, not code (9D3 §19, deletion spec §20).
5. **Operator secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `DISCORA_OWNER_USER_ID`, Google OAuth client/secret, SMTP/Resend, Sentry DSN, domain/DNS/TLS.

**NO PRODUCTION DEPLOYMENT AUTHORIZED BY THIS REPORT.**

---

## 10. Backup Requirements
- PITR-enabled project with tested restore before any apply.
- Full backup snapshot immediately pre-apply, retained until post-apply verification (§9.H) is signed.
- Table dump of `room_invitations` (150001 destructive column drop).
- `deletion_operations` archive procedure for the PITR replay gap (deletion spec §17): post-restore replay of post-backup deletions.
- `supabase migration list` captured before and after (ledger diff evidence).

## 11. Post-Apply Verification Plan
Per §9.H checklist, plus: re-run the 9C4A 14-item verification (apply report §§2–10) to confirm no regression; re-run grant inventory (`202609090011`-style effective-grants capture); verify `search_path` pins on all touched DEFINER functions; smoke-test auth (email signup attestation reject/accept), friend RPC ACLs, invitation create/accept NULL-contract, and Deleted User rendering on all 5 views.

## 12. Forward-Fix / Failure Strategy
- Any migration failure: STOP, preserve logs + ledger output, do not retry blindly.
- Verification-gate failures inside 150001 (backfill incomplete / hash collision): investigate source rows, fix data, re-run — the gates exist precisely to prevent partial application.
- 160001 RPC failures at runtime (not apply): reconciler + Server Action retry paths own recovery; never re-run DDL.
- `--include-all` refusal or order deviation from §9.C: STOP, re-run dry-run, compare against preflight §13 before proceeding.

## 13. Production Deployment Blockers
1. Uncommitted tree (30 untracked migrations + app code) — release hygiene.
2. Missing dynamic-verification reports (§8) — evidence gap.
3. Operator inputs absent (secrets, OAuth, SMTP, domain, Sentry, cron, counsel review).
4. No staging environment evidenced — production would be the first deploy target for 13 migrations including a destructive column drop.

## 14. Final Verdict

**B — Reconciled with explicit conditions.**

The ledger is reconciled: production position is evidenced at `202609140003`; the 13-file forward manifest is complete, ordered, dependency-clean, and covers every approved Beta capability (§7). Historical exceptions are preserved without rewriting (§4). Data-safety review finds exactly one destructive migration (150001) with adequate in-file gates and a documented forward-fix posture (§6).

Conditions preventing A: (a) byte identity of two applied files is unprovable (130001=C, 130002=B); (b) 30 migration files including 4 production-applied ones are untracked in git; (c) production ledger was not live-verified in this task (report-evidenced only); (d) four requested implementation reports were never written, leaving dynamic verification to chat summaries; (e) no staging/production infrastructure exists to validate against.

The manifest in §9 is safe to use for production planning subject to the blockers in §9.J.

---

**Files created:** `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md` (this report).
**Commands/tests performed:** filesystem inventory, `git ls-files` diff, `git status`, migration header/body reads, grep content checks, `Test-Path` existence checks, `npx tsc --noEmit` (0 errors), `npm run build` (exit 0), `npm run test` (28 passed; 1 pre-existing Playwright env failure), `npm run lint` (1 pre-existing `.next` generated-file error + 44 pre-existing warnings).
**Production contact:** NONE — no connections, queries, pushes, deploys, DNS, Auth, or data changes.
**Code/migrations/history modified:** NONE — one report file created; zero source, migration, or history edits.
**STOP.**
