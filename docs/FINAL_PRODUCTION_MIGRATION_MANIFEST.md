# Discora — Final Production Migration Manifest Reconciliation

**Document Status:** AUTHORITATIVE CANONICAL AUDIT  
**Mode:** READ-ONLY / NO IMPLEMENTATION / NO PRODUCTION MUTATION / NO COMMIT  
**Execution Date (UTC):** 2026-09-19  
**Target Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca` (`feat: establish Discora Public Beta release baseline`)  
**Production Ledger Status:** `PRODUCTION LEDGER: NOT LIVE-VERIFIED` (relying strictly on verified audit reports and Phase 7D DR evidence; no live production database connection opened)

---

## 1. Executive Summary

This audit reconciles the discrepancy between recent pre-beta reports regarding the migration ledger, filenames, and canonical production sequence.

- **Total Repository Migrations:** Exactly **87 canonical `*.sql` files** in `supabase/migrations/`.
- **Git Tracking Status:** All **87 migration files** are tracked in Git baseline commit `dbaf36a384a5e543277c4bbb19e28592145960ca`. (The earlier historical note of "30 untracked files" existed prior to baseline commit creation and was fully resolved when baseline was established).
- **Verified Production Migration Tip:** `202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql`.
- **Quarantined Defect Migrations:** Exactly **2 files** (`202609140001` and `202609140002`) remain quarantined in `supabase/archive_9c4a_incident/` and excluded from the migration path.
- **Authoritative Production Pending Set:** Exactly **13 migrations** (2 historical sort-before-tip dependency repairs + 11 sequential forward migrations).
- **Core Discrepancy Resolution:** `PRE_BETA_REMEDIATION_BATCH_1_REPORT.md` §3 suffered from a severe **REPORTING ERROR**, listing hallucinated/pre-implementation filenames for migrations 1–11 (e.g., `202609160001_create_friendships.sql` instead of `202609160001_phase_9c4_account_deletion_foundation.sql`). The filesystem and Git history show that `FINAL_MIGRATION_LEDGER_RECONCILIATION.md` and the actual `supabase/migrations/` directory reflect the true canonical files.
- **Critical Destructive Migration Gate:** Migration `202609150001_phase_9d3_room_invitation_remediation.sql` is **DESTRUCTIVE** (drops plaintext `invitation_token`, enforces SHA-256 `token_hash`, and revokes direct client UPDATEs). A mandatory preflight backup and gate check are required before application.
- **Phase 7D Disaster Recovery Consistency:** Phase 7D isolated DR drill restored all 87 migrations up to `202609220001_oauth_18plus_enforcement` with zero errors and zero forward migrations needed, proving 100% schema continuity.
- **Final Verdict:** **B — RECONCILED WITH DOCUMENTATION ISSUE** (Database schema and migrations are completely sound; documentation in Batch 1 report requires formal correction).

---

## 2. Baseline Commit & Repository Context

- **Release Baseline Commit:** `dbaf36a384a5e543277c4bbb19e28592145960ca`
- **Commit Message:** `feat: establish Discora Public Beta release baseline`
- **Working Tree State:** 87 migrations tracked. One migration file has an uncommitted local view refresh fix:
  - `supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql`: Contains `drop view if exists public.discussion_questions;` prior to `create or replace view` to avoid PostgreSQL column type change errors during view replacement.
- **Governing Documents Checked:**
  - `docs/DISCORA_AGENT_GOVERNANCE.md` (Present)
  - `docs/00_MASTER_CONTEXT.md` (Present)
  - `docs/01_PRD.md` (Present)
  - `docs/02_FEATURE_REGISTRY.md` (Present)
  - `docs/04_DATABASE_DESIGN.md` (Present)
  - `docs/05_SYSTEM_ARCHITECTURE.md` (Present)
  - `docs/08_DEVELOPMENT_ROADMAP.md` (Present)
  - `docs/FINAL_PRE_BETA_HARDENING_AUDIT.md` (Present)
  - `docs/PRE_BETA_REMEDIATION_BATCH_1_REPORT.md` (Present)
  - `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md` (Present)
  - `docs/PRE_BETA_PRODUCTION_DEPLOYMENT_OPERATOR_DEPENDENCY_MATRIX.md` (Referenced as this name in prompt, but stored on disk as `docs/PRE_BETA_PRODUCTION_OPERATOR_DEPENDENCY_MATRIX.md` — verified present)
  - `docs/PRE_BETA_PRODUCTION_DEPLOYMENT_OPERATOR_READINESS_RUNBOOK.md` (Present)
  - `docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md` (Present)

---

## 3. Repository Migration Inventory

The repository contains exactly **87 migration files** under `supabase/migrations/`. Chronological analysis confirms:
- **Total Files:** 87
- **Duplicate Timestamps:** 0 (all 87 timestamps are unique)
- **Git-Tracked Files:** 87 (in commit `dbaf36a`)
- **Missing Versions:** None within the canonical chain.

### Chronological Catalog (All 87 Migrations)

| # | Timestamp | Exact Filename | Canonical Status | Production Status |
|---|---|---|---|---|
| 1 | 202606030001 | `202606030001_create_profiles.sql` | Canonical | Applied |
| 2 | 202606030002 | `202606030002_create_avatars_bucket.sql` | Canonical | Applied |
| 3 | 202606030003 | `202606030003_create_discussions.sql` | Canonical | Applied |
| 4 | 202606030004 | `202606030004_create_claims.sql` | Canonical | Applied |
| 5 | 202606030005 | `202606030005_create_evidence.sql` | Canonical | Applied |
| 6 | 202606030006 | `202606030006_sprint_6_corrections_and_voting.sql` | Canonical | Applied |
| 7 | 202606030007 | `202606030007_sprint_65_hardening.sql` | Canonical | Applied |
| 8 | 202606030008 | `202606030008_p0_source_dedup_and_claim_evidence.sql` | Canonical | Applied |
| 9 | 202606030009 | `202606030009_block_votes_on_retracted_entities.sql` | Canonical | Applied |
| 10 | 202606030010 | `202606030010_create_questions.sql` | Canonical | Applied |
| 11 | 202606040001 | `202606040001_create_moderation.sql` | Canonical | Applied |
| 12 | 202606040002 | `202606040002_harden_moderation_queue.sql` | Canonical | Applied |
| 13 | 202606040003 | `202606040003_repair_moderation_queue_view_dependency.sql` | Canonical (Repair) | **Pending (Sort-Before-Tip)** |
| 14 | 202606050001 | `202606050001_add_search_vectors.sql` | Canonical | Applied |
| 15 | 202606050002 | `202606050002_create_search_rpc.sql` | Canonical | Applied |
| 16 | 202606050003 | `202606050003_fix_base_table_select.sql` | Canonical | Applied |
| 17 | 202606050004 | `202606050004_fix_content_length_constraints.sql` | Canonical | Applied |
| 18 | 202606060001 | `202606060001_create_claim_relations.sql` | Canonical | Applied |
| 19 | 202606060002 | `202606060002_add_claim_context_type.sql` | Canonical | Applied |
| 20 | 202606080001 | `202606080001_restore_discussion_views.sql` | Canonical | Applied |
| 21 | 202606090001 | `202606090001_fix_claim_vote_rls.sql` | Canonical | Applied |
| 22 | 202606090002 | `202606090002_create_user_reputation_snapshots.sql` | Canonical | Applied |
| 23 | 202606100001 | `202606100001_create_debates.sql` | Canonical | Applied |
| 24 | 202606100002 | `202606100002_fix_debate_insert_policy.sql` | Canonical | Applied |
| 25 | 202606100003 | `202606100003_debate_sort_and_status_sync.sql` | Canonical | Applied |
| 26 | 202606100004 | `202606100004_create_reputation_events.sql` | Canonical | Applied |
| 27 | 202606100005 | `202606100005_reputation_stabilization.sql` | Canonical | Applied |
| 28 | 202606100006 | `202606100006_repair_moderation_queue_base_tables.sql` | Canonical (Repair) | **Pending (Sort-Before-Tip)** |
| 29 | 202606110001 | `202606110001_create_side_switch.sql` | Canonical | Applied |
| 30 | 202606110002 | `202606110002_fix_view_add_cooldown.sql` | Canonical | Applied |
| 31 | 202606120001 | `202606120001_create_inquiry_tables.sql` | Canonical | Applied |
| 32 | 202606130001 | `202606130001_add_display_name_and_preferences.sql` | Canonical | Applied |
| 33 | 202606130002 | `202606130002_grant_search_content_to_anon.sql` | Canonical | Applied |
| 34 | 202606170001 | `202606170001_create_homepage_rpcs.sql` | Canonical | Applied |
| 35 | 202606180001 | `202606180001_create_inquiries_on_my_claims_rpc.sql` | Canonical | Applied |
| 36 | 202606180002 | `202606180002_create_new_evidence_on_voted_claims_rpc.sql` | Canonical | Applied |
| 37 | 202606190001 | `202606190001_security_hardening_p0_p1.sql` | Canonical | Applied |
| 38 | 202606200001 | `202606200001_private_debate_p0_privacy_remediation.sql` | Canonical | Applied |
| 39 | 202606210001 | `202606210001_private_debate_authorization_foundation.sql` | Canonical | Applied |
| 40 | 202606210002 | `202606210002_private_debate_authorization_remediation_round2.sql` | Canonical | Applied |
| 41 | 202606210003 | `202606210003_private_debate_moderation_fix.sql` | Canonical | Applied |
| 42 | 202606210004 | `202606210004_private_debate_moderation_base_table_fix.sql` | Canonical | Applied |
| 43 | 202606220001 | `202606220001_private_debate_phase4b_foundation.sql` | Canonical | Applied |
| 44 | 202606230001 | `202606230001_fix_access_code_failures_pk.sql` | Canonical | Applied |
| 45 | 202606230013 | `202606230013_fix_join_with_access_code_rate_limit.sql` | Canonical | Applied |
| 46 | 202606230014 | `202606230014_add_rate_limit_recovery.sql` | Canonical | Applied |
| 47 | 202606230015 | `202606230015_create_room_invitation_rpc.sql` | Canonical | Applied |
| 48 | 202606230016 | `202606230016_phase4b_p0_security_remediation.sql` | Canonical | Applied |
| 49 | 202606240001 | `202606240001_fix_discussion_messages_view.sql` | Canonical | Applied |
| 50 | 202606240002 | `202606240002_moderation_inquiry_feedback.sql` | Canonical | Applied |
| 51 | 202606240003 | `202606240003_fix_moderation_queue_regression.sql` | Canonical | Applied |
| 52 | 202606240004 | `202606240004_update_moderation_constraint.sql` | Canonical | Applied |
| 53 | 202606240005 | `202606240005_drop_legacy_submit_moderation_flag.sql` | Canonical | Applied |
| 54 | 202606250001 | `202606250001_fix_discussion_evidence_room_id.sql` | Canonical | Applied |
| 55 | 202606260001 | `202606260001_create_user_saves.sql` | Canonical | Applied |
| 56 | 202606260002 | `202606260002_create_recent_engagement_rpc.sql` | Canonical | Applied |
| 57 | 202606260003 | `202606260003_create_save_target_secure_rpc.sql` | Canonical | Applied |
| 58 | 202606260004 | `202606260004_fix_recent_engagement_rpc.sql` | Canonical | Applied |
| 59 | 202606260005 | `202606260005_save_target_room_type_integrity.sql` | Canonical | Applied |
| 60 | 202606260006 | `202606260006_retire_legacy_resolved_debate.sql` | Canonical | Applied |
| 61 | 202606270001 | `202606270001_remove_winner_loser_system.sql` | Canonical | Applied |
| 62 | 202609090001 | `202609090001_claim_conversion_foundation.sql` | Canonical | Applied |
| 63 | 202609090002 | `202609090002_claim_deletion_lock_foundation.sql` | Canonical | Applied |
| 64 | 202609090003 | `202609090003_claim_requests_foundation.sql` | Canonical | Applied |
| 65 | 202609090004 | `202609090004_discussion_arguments_foundation.sql` | Canonical | Applied |
| 66 | 202609090005 | `202609090005_reactions_foundation.sql` | Canonical | Applied |
| 67 | 202609090006 | `202609090006_saved_room_alias_foundation.sql` | Canonical | Applied |
| 68 | 202609090007 | `202609090007_epistemic_cleanup.sql` | Canonical | Applied |
| 69 | 202609090008 | `202609090008_homepage_vote_ordering_cleanup.sql` | Canonical | Applied |
| 70 | 202609090009 | `202609090009_fix_claim_request_decision_status.sql` | Canonical | Applied |
| 71 | 202609090010 | `202609090010_fix_argument_tombstone_length.sql` | Canonical | Applied |
| 72 | 202609090011 | `202609090011_capture_effective_grants.sql` | Canonical | Applied |
| 73 | 202609130001 | `202609130001_admin_console_foundation.sql` | Canonical | Applied |
| 74 | 202609130002 | `202609130002_phase_8d_data_hygiene_and_seeding.sql` | Canonical | Applied |
| 75 | 202609130003 | `202609130003_phase_8d_debate_side_alignment.sql` | Canonical | Applied |
| 76 | 202609140003 | `202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql` | Canonical | **Applied (Production Tip)** |
| 77 | 202609140004 | `202609140004_phase_9d2a_friend_core_foundation.sql` | Canonical | **Pending** |
| 78 | 202609140005 | `202609140005_restore_moderation_queue_full_definition.sql` | Canonical | **Pending** |
| 79 | 202609140006 | `202609140006_phase_9d2a_friend_inbox_cap.sql` | Canonical | **Pending** |
| 80 | 202609150001 | `202609150001_phase_9d3_room_invitation_remediation.sql` | Canonical | **Pending (DESTRUCTIVE GATE)** |
| 81 | 202609160001 | `202609160001_phase_9c4_account_deletion_foundation.sql` | Canonical | **Pending** |
| 82 | 202609170001 | `202609170001_pre_beta_security_remediation.sql` | Canonical | **Pending** |
| 83 | 202609180001 | `202609180001_reputation_snapshot_authenticated_select.sql` | Canonical | **Pending** |
| 84 | 202609190001 | `202609190001_pre_beta_18plus_inquiry_visibility.sql` | Canonical | **Pending** |
| 85 | 202609200001 | `202609200001_user_preferences_client_grants.sql` | Canonical | **Pending** |
| 86 | 202609210001 | `202609210001_fix_deleted_user_display_in_public_views.sql` | Canonical | **Pending** |
| 87 | 202609220001 | `202609220001_oauth_18plus_enforcement.sql` | Canonical | **Pending** |

---

## 4. Production-Applied Migrations

Production ledger evidence from `docs/PHASE_9C4A_PRODUCTION_APPLY_REPORT.md` (which logged the exact post-apply ledger verification from production Supabase) demonstrates that **74 migrations** are recorded as applied in production up to:
`202609140003_phase_9c4a_corrected_schema_hygiene_and_postgrest_safeguards.sql`.

Historical Note:
- `202609130001` and `202609130002` were applied in production during Phase 8D. While `202609130001` has unprovable original bytes and `202609130002` was reconstructed from `scripts/rebuild-phase8d-migration.mjs` (per `docs/PHASE_9D2A_R2_MIGRATION_INTEGRITY_RECONCILIATION.md`), both are already in the remote ledger and must never be re-run or modified.
- `202609140003` is the confirmed production tip.

---

## 5. Pending Migrations

There are exactly **13 pending migrations** that must be applied to production:
- **2 Sort-Before-Tip Repairs:**
  - `202606040003_repair_moderation_queue_view_dependency.sql`
  - `202606100006_repair_moderation_queue_base_tables.sql`
- **11 Forward Migrations:**
  - `202609140004_phase_9d2a_friend_core_foundation.sql`
  - `202609140005_restore_moderation_queue_full_definition.sql`
  - `202609140006_phase_9d2a_friend_inbox_cap.sql`
  - `202609150001_phase_9d3_room_invitation_remediation.sql`
  - `202609160001_phase_9c4_account_deletion_foundation.sql`
  - `202609170001_pre_beta_security_remediation.sql`
  - `202609180001_reputation_snapshot_authenticated_select.sql`
  - `202609190001_pre_beta_18plus_inquiry_visibility.sql`
  - `202609200001_user_preferences_client_grants.sql`
  - `202609210001_fix_deleted_user_display_in_public_views.sql`
  - `202609220001_oauth_18plus_enforcement.sql`

Because `202606040003` and `202606100006` have timestamps earlier than the production tip `202609140003`, standard `supabase db push` will reject them as an out-of-order insertion. As established in `PHASE_9D2A_R_PRODUCTION_PREFLIGHT_AUDIT.md`, deployment requires:
`supabase db push --include-all`.

---

## 6. Historical and Quarantined Migrations

Inspected directory: `supabase/archive_9c4a_incident/`
- **Quarantined Files:**
  1. `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` (Failed with Postgres error `22P02`, rolled back on production)
  2. `202609140002_phase_9c4a_reconciliation_schema_hygiene_and_postgrest_safeguards.sql` (Blocked during pre-apply review)
- **Status:** Both files remain outside `supabase/migrations/`. They are permanently quarantined, excluded from Git tracking in the migration directory, and will never be applied to production.

---

## 7. Exact 13-Migration Production Sequence

| Order | Timestamp | Exact Filename | Type |
|---|---|---|---|
| 1 | 202606040003 | `202606040003_repair_moderation_queue_view_dependency.sql` | Dependency repair (base tables) |
| 2 | 202606100006 | `202606100006_repair_moderation_queue_base_tables.sql` | Dependency repair (removes view deps) |
| 3 | 202609140004 | `202609140004_phase_9d2a_friend_core_foundation.sql` | Feature: Friend graph core |
| 4 | 202609140005 | `202609140005_restore_moderation_queue_full_definition.sql` | View restoration: includes inquiry_items |
| 5 | 202609140006 | `202609140006_phase_9d2a_friend_inbox_cap.sql` | Concurrency & Inbox cap: advisory locks |
| 6 | 202609150001 | `202609150001_phase_9d3_room_invitation_remediation.sql` | **DESTRUCTIVE SECURITY GATE**: Token hashing |
| 7 | 202609160001 | `202609160001_phase_9c4_account_deletion_foundation.sql` | Compliance: Option C Account Deletion |
| 8 | 202609170001 | `202609170001_pre_beta_security_remediation.sql` | Security: P1/P2 least privilege & RLS fixes |
| 9 | 202609180001 | `202609180001_reputation_snapshot_authenticated_select.sql` | Security: Self-only snapshot SELECT grant |
| 10 | 202609190001 | `202609190001_pre_beta_18plus_inquiry_visibility.sql` | Policy: 18+ auth hook + anon inquiry reads |
| 11 | 202609200001 | `202609200001_user_preferences_client_grants.sql` | Least privilege: user_preferences grants |
| 12 | 202609210001 | `202609210001_fix_deleted_user_display_in_public_views.sql` | Privacy: Redacts deleted user surrogate handles |
| 13 | 202609220001 | `202609220001_oauth_18plus_enforcement.sql` | Compliance: OAuth age_confirmed tracking |

---

## 8. Content-Level Purpose Verification

Each of the 13 pending migrations was verified by reading its actual SQL content:

### 1. `202606040003_repair_moderation_queue_view_dependency.sql`
- **Purpose:** Rebuilds `moderation_queue` view directly on base tables (`messages`, `claims`, `evidence`, `questions`) instead of relying on `discussion_claims`.
- **Schema Effects:** Drops and recreates `moderation_queue`.
- **Dependencies:** Paired with `202609140005` (which later restores the `inquiry_items` union arm).
- **Destructive:** No.
- **Safety:** Safe when applied with `--include-all`.

### 2. `202606100006_repair_moderation_queue_base_tables.sql`
- **Purpose:** Eliminates remaining `discussion_*` view-on-view dependencies from `moderation_queue`.
- **Schema Effects:** Replaces view definition.
- **Dependencies:** Precursor to `202609140005`.
- **Destructive:** No.
- **Safety:** Safe.

### 3. `202609140004_phase_9d2a_friend_core_foundation.sql`
- **Purpose:** Implements the complete Phase 9D.2A friend system.
- **Schema Effects:** Creates 4 tables (`friend_requests`, `friend_relationships`, `user_blocks`, `friend_request_rate_counters`), 12 `SECURITY DEFINER` RPCs (e.g. `send_friend_request`, `accept_friend_request`), RLS policies restricting read access to participants, and revokes direct client DML.
- **Dependencies:** Depends on `profiles` and `is_active_user()`.
- **Destructive:** No (purely additive).
- **Safety:** Safe.

### 4. `202609140005_restore_moderation_queue_full_definition.sql`
- **Purpose:** Restores full definition of `moderation_queue` incorporating `inquiry_items` alongside messages, claims, evidence, and questions. Byte-identical to canonical `202606240003`.
- **Schema Effects:** Recreates `moderation_queue`.
- **Dependencies:** Depends on `inquiry_items` table. Must deploy after `202606040003` and `202606100006`.
- **Destructive:** No.
- **Safety:** Safe.

### 5. `202609140006_phase_9d2a_friend_inbox_cap.sql`
- **Purpose:** Enforces a hard cap of 50 incoming pending friend requests per recipient.
- **Schema Effects:** Creates partial unique index `idx_friend_requests_recipient_pending`, creates recipient-based advisory lock helper `friend_recipient_lock(uuid)`, rewrites `send_friend_request` to serialize on pair + recipient locks in strict order, preventing deadlocks and race conditions.
- **Dependencies:** Depends on `202609140004`.
- **Destructive:** No.
- **Safety:** Safe.

### 6. `202609150001_phase_9d3_room_invitation_remediation.sql`
- **Purpose:** Remediates room invitation tokens to high-security hashed tokens (SHA-256).
- **Schema Effects:**
  - Adds `token_hash` and `expires_at` columns.
  - Backfills SHA-256 hashes for existing tokens (`encode(digest(invitation_token, 'sha256'), 'hex')`).
  - **DROPS plaintext column `invitation_token`** (Irreversible).
  - Revokes direct client UPDATE privilege on `room_invitations`.
  - Rewrites 9 RPCs (`create_room_invitation`, `accept_invitation`, `revoke_room_invitation`, etc.) to use `token_hash`, atomic `FOR UPDATE` locking on accept, owner-only revoke, and rate-limiting via `invitation_attempts` and `access_code_failures`.
- **Dependencies:** Depends on `room_invitations` table and `pgcrypto`.
- **Destructive:** **YES (Drops plaintext column)**.
- **Safety:** Requires mandatory preflight backup. Forward-reissue only if rollback needed.

### 7. `202609160001_phase_9c4_account_deletion_foundation.sql`
- **Purpose:** Establishes Phase 9C.4 Option C Hybrid Account Deletion architecture.
- **Schema Effects:**
  - Relaxes authorship nullability (`DROP NOT NULL` on `arguments.created_by`, `claim_requests.requester_id`, `inquiry_items.created_by`, `inquiry_responses.created_by`) to support uniform "Deleted User" de-identification.
  - Creates orchestration tables: `deletion_operations` (10-state machine), `storage_cleanup_queue`, `deletion_step_up_proofs` (all service_role only).
  - Adds transaction-scoped GUC escapes (`discora.deletion_scrub_user`, `discora.allow_reputation_purge`) to allow legitimate tombstoning without weakening triggers for normal operations.
  - Creates `execute_account_deletion` and `reconcile_deletion_operations` RPCs (granted exclusively to `service_role`).
- **Dependencies:** Depends on core discussion and debate entities.
- **Destructive:** No data deleted at migration time (deletions occur only during account deletion RPC execution). Column constraints relaxed.
- **Safety:** Safe.

### 8. `202609170001_pre_beta_security_remediation.sql`
- **Purpose:** Resolves findings P1-01, P2-01, P2-02, P3-01, P3-02 from the Comprehensive Hardening Audit.
- **Schema Effects:**
  - Grants SELECT on `inquiry_items`, `inquiry_responses`, `debate_side_changes` to `authenticated` (scoping preserved by RLS).
  - Hardens `claim_relations` INSERT policy to require room write access and same-room endpoint verification (closing SoU pollution).
  - Corrects `debates` UPDATE policy tautology (`r.id = debates.id`).
  - Enables RLS on `claim_deletion_config` and revokes public access (deny-by-default).
  - Pins `search_path = public, pg_temp` on 4 `SECURITY DEFINER` functions.
- **Dependencies:** Preceding schema entities.
- **Destructive:** No.
- **Safety:** Safe.

### 9. `202609180001_reputation_snapshot_authenticated_select.sql`
- **Purpose:** Restores missing SELECT grant on `user_reputation_snapshots` to `authenticated`.
- **Schema Effects:** `grant select on public.user_reputation_snapshots to authenticated;`.
- **Dependencies:** Row policy `user_id = auth.uid()` pre-exists.
- **Destructive:** No.
- **Safety:** Safe.

### 10. `202609190001_pre_beta_18plus_inquiry_visibility.sql`
- **Purpose:** Introduces 18+ email signup attestation hook function and allows guest read access to public room inquiries.
- **Schema Effects:**
  - Creates `enforce_signup_age_attestation(event jsonb)` security definer hook function (granted to `supabase_auth_admin`).
  - Grants SELECT on `inquiry_items` and `inquiry_responses` to `anon`.
  - Creates RLS policies allowing `anon` SELECT only for public, non-archived rooms.
- **Dependencies:** Supabase auth hook configuration.
- **Destructive:** No.
- **Safety:** Safe.

### 11. `202609200001_user_preferences_client_grants.sql`
- **Purpose:** Restores SELECT, INSERT, and UPDATE grants on `user_preferences` to `authenticated`.
- **Schema Effects:** Grants privileges; existing RLS policy `user_id = auth.uid() AND is_active_user()` restricts row operations.
- **Dependencies:** `user_preferences` table.
- **Destructive:** No.
- **Safety:** Safe.

### 12. `202609210001_fix_deleted_user_display_in_public_views.sql`
- **Purpose:** Prevents surrogate username (`deleted_user_<hash>`) leakage in public discourse.
- **Schema Effects:** Replaces 5 views (`discussion_messages`, `discussion_claims`, `discussion_evidence`, `discussion_questions`, `discussion_arguments`) ensuring `CASE WHEN p.is_deleted = true THEN 'Deleted User'` takes precedence over `p.username`.
- **Dependencies:** Base tables and `profiles.is_deleted`.
- **Destructive:** No.
- **Safety:** Safe.

### 13. `202609220001_oauth_18plus_enforcement.sql`
- **Purpose:** Adds age attestation tracking for OAuth accounts.
- **Schema Effects:** Adds `age_confirmed boolean NOT NULL DEFAULT false` to `public.profiles` and creates partial index `idx_profiles_age_confirmed`.
- **Dependencies:** `profiles` table.
- **Destructive:** No.
- **Safety:** Safe.

---

## 9. Critical 202609150001 Destructive Migration Gate

Migration `202609150001_phase_9d3_room_invitation_remediation.sql` requires special operational handling:

1. **Destructive Operation:**
   - Drops `public.room_invitations.invitation_token` (the plaintext token column).
   - Once applied, plaintext tokens cannot be retrieved from the database.
2. **Backfill Integrity:**
   - Hashes existing plaintext tokens with SHA-256 (`token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')`).
   - Aborts if any row fails to hash or collides.
   - Sets `expires_at = created_at + interval '7 days'` for legacy tokens missing expiration.
3. **Security Invariants Implemented:**
   - **Single-Use Semantics:** `accept_invitation` locks the row `FOR UPDATE`, changes status to `accepted`, and records `accepted_by` atomically.
   - **Information Leakage Prevention:** `accept_invitation` returns `NULL` on any failure (expired, revoked, invalid code, max uses reached) to prevent timing or enumeration oracles.
   - **Rate Limiting:** Checks and updates `invitation_attempts` (10 failed attempts / 15-minute window).
   - **Revocation Protection:** `revoke_room_invitation` requires room ownership or admin role.
   - **Direct UPDATE Revoked:** `revoke update on public.room_invitations from authenticated;` blocks client tampering.
4. **Rollback & Disaster Recovery Protocol:**
   - **Traditional Rollback Impossible:** Plaintext tokens cannot be un-hashed.
   - **Rollback Option A (Restoration):** Restore from preflight backup if catastrophic failure occurs during apply.
   - **Forward Remediation (Preferred):** If an invitation issue arises post-apply, users generate new invitations via the updated RPCs.

---

## 10. Production Ledger Verification

- **Live Database Inspection:** `PRODUCTION LEDGER: NOT LIVE-VERIFIED`.
- **Reason:** In accordance with strict governance instructions, zero live connection strings to production were utilized, and no mutating or exploratory commands were executed against production Supabase.
- **Historical Evidence Base:**
  1. `docs/PHASE_9C4A_PRODUCTION_APPLY_REPORT.md`: Verified production tip is `202609140003`.
  2. `docs/PHASE_9D2A_R_PRODUCTION_PREFLIGHT_AUDIT.md` §15: Verified 130001–130003 and 140003 applied; 040003, 100006, 140004, 140005 unapplied.
  3. `docs/FINAL_MIGRATION_LEDGER_RECONCILIATION.md`: Verified 74 applied, 13 pending.

---

## 11. Discrepancy Reconciliation

Comparing `FINAL_MIGRATION_LEDGER_RECONCILIATION.md`, `PRE_BETA_REMEDIATION_BATCH_1_REPORT.md`, and the actual filesystem:

| Timestamp | `PRE_BETA_REMEDIATION_BATCH_1_REPORT.md` (Erroneous Report) | Actual Canonical File on Disk | Classification |
|---|---|---|---|
| `202606040003` | `202606040003_fix_evidence_claim_id_nullable.sql` | `202606040003_repair_moderation_queue_view_dependency.sql` | **REPORTING ERROR** |
| `202606100006` | `202606100006_allow_public_inquiry_reads.sql` | `202606100006_repair_moderation_queue_base_tables.sql` | **REPORTING ERROR** |
| `202609140004` | `202609140004_fix_profile_search_path.sql` | `202609140004_phase_9d2a_friend_core_foundation.sql` | **REPORTING ERROR** |
| `202609140005` | `202609140005_fix_remaining_search_paths.sql` | `202609140005_restore_moderation_queue_full_definition.sql` | **REPORTING ERROR** |
| `202609140006` | `202609140006_grant_missing_rpcs.sql` | `202609140006_phase_9d2a_friend_inbox_cap.sql` | **REPORTING ERROR** |
| `202609150001` | `202609150001_harden_search_content_rpc.sql` | `202609150001_phase_9d3_room_invitation_remediation.sql` | **REPORTING ERROR** |
| `202609160001` | `202609160001_create_friendships.sql` | `202609160001_phase_9c4_account_deletion_foundation.sql` | **REPORTING ERROR** |
| `202609170001` | `202609170001_create_saved_items.sql` | `202609170001_pre_beta_security_remediation.sql` | **REPORTING ERROR** |
| `202609180001` | `202609180001_create_room_invitations.sql` | `202609180001_reputation_snapshot_authenticated_select.sql` | **REPORTING ERROR** |
| `202609190001` | `202609190001_account_deletion_phase8a.sql` | `202609190001_pre_beta_18plus_inquiry_visibility.sql` | **REPORTING ERROR** |
| `202609200001` | `202609200001_fix_search_discussion_messages_active_filter.sql` | `202609200001_user_preferences_client_grants.sql` | **REPORTING ERROR** |
| `202609210001` | `202609210001_fix_deleted_user_display_in_public_views.sql` | `202609210001_fix_deleted_user_display_in_public_views.sql` | **NO DISCREPANCY** |
| `202609220001` | `202609220001_oauth_18plus_enforcement.sql` | `202609220001_oauth_18plus_enforcement.sql` | **NO DISCREPANCY** |
| `202609140001` / `02` | Referred to as `202606140001` and `202606140002` in Batch 1 report | `202609140001` and `202609140002` in `supabase/archive_9c4a_incident/` | **REPORTING ERROR** |

**Conclusion:** The database files in `supabase/migrations/` never drifted. The previous agent who authored `docs/PRE_BETA_REMEDIATION_BATCH_1_REPORT.md` hallucinated the suffixes for migrations 1–11 instead of inspecting the filesystem. `FINAL_MIGRATION_LEDGER_RECONCILIATION.md` contains the correct filenames.

---

## 12. Phase 7D Disaster Recovery Consistency Check

In Phase 7D (`docs/PRE_BETA_PHASE7D_ACTUAL_ISOLATED_DRILL_REPORT.md`), a full disaster recovery drill was executed against the isolated project `discora-dr-drill`:
- **Ledger Records Reconciled:** Exactly 87 migrations.
- **Repository Tip Migration:** `202609220001_oauth_18plus_enforcement`.
- **Forward Migrations Required During Restore:** 0.
- **Verification Checks:** 47 automated database integrity checks passed.
- **Consistency Finding:** The 87 canonical files in `supabase/migrations/` match the exact target state verified in Phase 7D. There is zero drift between the repository migrations and the verified restore ledger.

---

## 13. Security Implications

Applying the authoritative 13-migration sequence preserves all Discora security boundaries:
1. **Row Level Security (RLS):** All new tables (`friend_requests`, `friend_relationships`, `user_blocks`, `deletion_operations`, `storage_cleanup_queue`, `deletion_step_up_proofs`) have RLS enabled with default-deny.
2. **Role Separation:** Account deletion RPCs (`execute_account_deletion`, `reconcile_deletion_operations`) are granted strictly to `service_role` and explicitly revoked from `public`, `anon`, and `authenticated`.
3. **Immutability & Integrity:** The `reputation_events` immutability trigger remains impenetrable; only audited account deletion via internal transaction GUC can purge user events upon verified account deletion.
4. **Least Privilege Grants:** Granted SELECT privileges on `inquiry_items`, `inquiry_responses`, `user_reputation_snapshots`, and `user_preferences` restore required application reads while keeping row-level filtering intact via existing policies.
5. **Private Content Protection:** Guest inquiry SELECT policies strictly require `room.visibility = 'public'` and `room.status <> 'archived'`. Private debate and discussion boundaries are completely preserved.

---

## 14. Exact Production Deployment Procedure

*(FOR OPERATOR EXECUTION ONLY — NOT EXECUTED DURING THIS AUDIT)*

### Stage 1: Preflight & Safety Backup
1. Announce brief maintenance window.
2. Create full database backup using dedicated Age encryption:
   ```bash
   node scripts/backup/backup-database.mjs
   ```
3. Verify backup archive integrity and test decryption with Age identity.
4. Verify remote migration ledger:
   ```bash
   npx supabase migration list
   ```
   Confirm that remote migration tip is `202609140003`.

### Stage 2: Destructive Migration Gate Confirmation
1. Verify `202609150001_phase_9d3_room_invitation_remediation.sql` pre-conditions.
2. Confirm preflight backup is secured off-site.

### Stage 3: Migration Application
Execute push with `--include-all` (mandatory due to out-of-order timestamps `202606040003` and `202606100006`):
```bash
npx supabase db push --include-all
```

### Stage 4: Post-Apply Ledger Verification
Run:
```bash
npx supabase migration list
```
Verify that:
- Total applied migrations = 87.
- Local and remote ledgers are in 100% sync.
- Tip is `202609220001`.

---

## 15. Post-Deployment Verification Checklist

Once the operator applies the migrations, verify:
- [ ] `moderation_queue` view returns valid rows without recursion or view errors.
- [ ] Friend requests can be sent, accepted, declined, and blocked.
- [ ] Room invitations use SHA-256 `token_hash`; plaintext `invitation_token` column does not exist.
- [ ] `room_invitations` direct UPDATE is rejected for authenticated users.
- [ ] Account deletion service_role RPC works and leaves discourse attributed to "Deleted User".
- [ ] Reputation snapshots load for authenticated users on profile page (`/u/[username]`).
- [ ] Public room inquiries are visible to anonymous guests.
- [ ] User preferences save without permission error in Settings > Privacy.
- [ ] OAuth accounts have `age_confirmed` flag tracked in `profiles`.

---

## 16. Final Verdict

### **B — RECONCILED WITH DOCUMENTATION ISSUE**

**Rationale:**
- **Zero Schema or Migration Drift:** The 87 migration files on disk in `supabase/migrations/` are canonical, sequentially coherent, git-tracked, and match the successful Phase 7D disaster recovery drill.
- **Reporting Error in Batch 1:** The discrepancy was caused solely by erroneous reporting in `docs/PRE_BETA_REMEDIATION_BATCH_1_REPORT.md` §3 (which listed placeholder/hallucinated filenames).
- **Safety Intact:** Production was not contacted or mutated. The manifest is 100% reconciled and ready for operator review.

---

## 17. Evidence and Commands Used

- Git inspection:
  - `git rev-parse HEAD` -> `dbaf36a384a5e543277c4bbb19e28592145960ca`
  - `git log -1 --oneline` -> `dbaf36a feat: establish Discora Public Beta release baseline`
  - `git ls-files supabase/migrations/*.sql` -> Count: 87
  - `git status --short` -> Verified only working-tree modifications, zero untracked migrations
  - `git diff supabase/migrations/202609210001_fix_deleted_user_display_in_public_views.sql` -> Inspected `drop view if exists` addition
- Filesystem inspection:
  - `Get-ChildItem supabase/migrations/*.sql` -> 87 files, 0 duplicate timestamps
  - `Get-ChildItem supabase/archive_9c4a_incident/` -> 2 quarantined defect files verified
  - `Test-Path` on all 13 governing documents
- File content verification:
  - Detailed reading of SQL files for all 13 pending migrations (`202606040003`, `202606100006`, `202609140004` through `202609220001`).

---

## 18. Explicit Statement of What Was NOT Executed

In strict adherence to the read-only mandate:
- **NO migrations were edited, renamed, deleted, or created.**
- **NO application code was modified.**
- **NO production SQL or DDL/DML was run.**
- **`supabase db push` was NOT run.**
- **Production Supabase was NOT contacted.**
- **NO git commits were created.**
- **NO git pushes were executed.**
- **NO deployments were made.**
