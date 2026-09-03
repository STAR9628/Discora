# Deployment Readiness Audit

**Goal**: Determine whether a fresh production environment can be created using the repository alone.

**Method**: Audit every migration file, inventory all database objects (tables, functions, triggers, views, RLS policies, indexes, grants), and cross-reference against the deployment script.

---

## Question: Can a fresh production environment be created using the repository alone?

**Answer: No, not with the current `deploy_pending_migrations.sql` script.**

The script only includes 3 of 30 migrations and is designed as a patch script, not a fresh-environment deployment tool. A complete deployment requires running all 30 migrations in chronological order, which the script does not do.

---

## 1. Migration File Inventory

### Files Present (30 total)

| # | Migration File | Tables Created | Functions | Triggers | Views | Policies |
|---|---|---|---|---|---|---|
| 1 | `202606030001_create_profiles.sql` | `profiles` | 2 | 2 | 0 | 3 |
| 2 | `202606030002_create_avatars_bucket.sql` | `storage.objects` (bucket) | 0 | 0 | 0 | 4 |
| 3 | `202606030003_create_discussions.sql` | `topics`, `rooms`, `discussions`, `messages` | 6 | 7 | 1 | 10 |
| 4 | `202606030004_create_claims.sql` | `claims` | 4 | 4 | 1 | 2 |
| 5 | `202606030005_create_evidence.sql` | `sources`, `evidence`, `claim_evidence` | 5 | 10 | 1 | 5 |
| 6 | `202606030006_sprint_6_corrections_and_voting.sql` | `claim_votes`, `evidence_votes` | 5 | 8 | 2 | 4 |
| 7 | `202606030007_sprint_65_hardening.sql` | — | 0 | 0 | 0 | 7 |
| 8 | `202606030008_p0_source_dedup_and_claim_evidence.sql` | — | 2 | 2 | 0 | 1 |
| 9 | `202606030009_block_votes_on_retracted_entities.sql` | — | 0 | 0 | 0 | 2 |
| 10 | `202606030010_create_questions.sql` | `questions` | 5 | 6 | 2 | 2 |
| 11 | `202606040001_create_moderation.sql` | `user_roles`, `moderation_flags` | 1 | 0 | 4 | 3 |
| 12 | `202606040002_harden_moderation_queue.sql` | — | 4 | 0 | 1 | 0 |
| 13 | `202606050001_add_search_vectors.sql` | — | 0 | 0 | 0 | 0 |
| 14 | `202606050002_create_search_rpc.sql` | — | 1 | 0 | 0 | 0 |
| 15 | `202606050003_fix_base_table_select.sql` | — | 0 | 0 | 0 | 8 |
| 16 | `202606050004_fix_content_length_constraints.sql` | — | 0 | 0 | 0 | 0 |
| 17 | `202606060001_create_claim_relations.sql` | `claim_relations` | 2 | 2 | 1 | 3 |
| 18 | `202606060002_add_claim_context_type.sql` | — | 0 | 0 | 1 | 0 |
| 19 | `202606080001_restore_discussion_views.sql` | — | 0 | 0 | 2 | 0 |
| 20 | `202606090001_fix_claim_vote_rls.sql` | — | 0 | 0 | 0 | 1 |
| 21 | `202606090002_create_user_reputation_snapshots.sql` | `user_reputation_snapshots` | 0 | 0 | 0 | 2 |
| 22 | `202606100001_create_debates.sql` | `debates`, `debate_participants` | 1 | 0 | 3 | 6 |
| 23 | `202606100002_fix_debate_insert_policy.sql` | — | 0 | 0 | 0 | 1 |
| 24 | `202606100003_debate_sort_and_status_sync.sql` | — | 1 | 0 | 1 | 0 |
| 25 | `202606100004_create_reputation_events.sql` | `reputation_events` | 14 | 12 | 0 | 2 |
| 26 | `202606100005_reputation_stabilization.sql` | — | 4 | 5 | 0 | 0 |
| 27 | `202606110001_create_side_switch.sql` | `debate_side_changes` | 4 | 2 | 1 | 2 |
| 28 | `202606110002_fix_view_add_cooldown.sql` | — | 1 | 0 | 1 | 0 |
| 29 | `202606120001_create_inquiry_tables.sql` | `inquiry_items`, `inquiry_responses` | 5 | 0 | 0 | 5 |
| 30 | `202606130001_add_display_name_and_preferences.sql` | `user_preferences` | 4 | 2 | 0 | 3 |

### Files in `deploy_pending_migrations.sql` (3 of 30)

| # | Migration File | Included? |
|---|---|---|
| 20 | `202606090001_fix_claim_vote_rls.sql` | ✅ |
| 21 | `202606090002_create_user_reputation_snapshots.sql` | ✅ |
| 22 | `202606100001_create_debates.sql` | ✅ |
| All others | — | ❌ |

**27 migrations are missing from the deploy script.**

---

## 2. Database Object Inventory

### 2.1 Tables (23 total)

All 23 tables are created across the migration sequence. The earliest table (profiles) is created in migration 1; the latest (user_preferences) in migration 30. A fresh environment must run all migrations in order — any missing migration will leave dependent tables uncreated.

| Table | Created In | Dependencies |
|---|---|---|
| `profiles` | 1 | `auth.users` (Supabase built-in) |
| `topics` | 3 | — |
| `rooms` | 3 | `profiles` (created_by FK) |
| `discussions` | 3 | `rooms` (id FK) |
| `messages` | 3 | `rooms`, `profiles` |
| `claims` | 4 | `rooms`, `profiles`, `messages` |
| `sources` | 5 | `rooms`, `profiles` |
| `evidence` | 5 | `sources`, `profiles` |
| `claim_evidence` | 5 | `claims`, `evidence` |
| `claim_votes` | 6 | `claims`, `profiles` |
| `evidence_votes` | 6 | `evidence`, `profiles` |
| `questions` | 10 | `rooms`, `profiles` |
| `user_roles` | 11 | `profiles` |
| `moderation_flags` | 11 | `messages`, `questions`, `claims`, `evidence`, `profiles` |
| `claim_relations` | 17 | `claims` (source/target FK), `rooms`, `profiles` |
| `user_reputation_snapshots` | 21 | `profiles` |
| `debates` | 22 | `rooms` (id FK) |
| `debate_participants` | 22 | `rooms`, `profiles` |
| `reputation_events` | 25 | `profiles` |
| `debate_side_changes` | 27 | `rooms`, `profiles` |
| `inquiry_items` | 29 | `rooms`, `claims`, `profiles` |
| `inquiry_responses` | 29 | `inquiry_items`, `profiles` |
| `user_preferences` | 30 | `profiles` |

### 2.2 Functions / RPCs (71 total, 20 migration files)

**Called by application code (must be present for features to work):**

| Function | Created In | Used By |
|---|---|---|
| `create_discussion_room` | 3 | Discussion creation form |
| `slugify` / `auto_slugify_trigger` | 3 | URL generation |
| `create_debate_room` | 22 | Debate creation form |
| `resolve_debate` | 24 | Debate resolution |
| `switch_debate_side` | 27, 28 (redefined) | Side switching |
| `create_inquiry` | 29 | Inquiry creation |
| `respond_to_inquiry` | 29 | Inquiry responses |
| `satisfy_inquiry` / `unsatisfy_inquiry` / `close_inquiry` | 29 | Inquiry status changes |
| `search_content` | 14 | Search feature |
| `get_or_create_source` | 8 | Evidence creation |
| `has_role_or_higher` / `has_current_user_role_or_higher` | 11, 12 | Moderation access control |
| `submit_moderation_flag` / `resolve_moderation_flag` | 12 | Reporting |
| `get_user_preferences` / `get_my_moderation_flags` | 30 | Settings pages |
| `recalculate_user_reputation` | 25 | Reputation computation |
| `create_reputation_event` | 25 | Reputation tracking |

**Trigger functions (48 total) — must all be present for data integrity:**

Applications include: identity mode handling, immutability enforcement, room-level validations, reputation event tracking, cooldown enforcement, content length validation, edit window enforcement.

### 2.3 Triggers (62 total, 12 migration files)

| Category | Count | Key Examples |
|---|---|---|
| Immutability enforcement | 15 | `enforce_claim_immutability`, `enforce_evidence_immutability`, `prevent_claim_deletion`, etc. |
| Identity mode handling | 4 | `handle_claim_identity_mode`, `handle_message_identity_mode`, `handle_question_identity_mode` |
| Room/relation validation | 5 | `validate_claim_evidence_rooms`, `validate_evidence_source_room`, `validate_claim_question_room` |
| Reputation events | 12 | `trg_reputation_claim_insert`, `trg_reputation_evidence_insert`, etc. |
| Vote deduplication | 2 | `trg_claim_vote_before_upsert`, `trg_evidence_vote_before_upsert` |
| Cooldown enforcement | 1 | `trg_debate_participant_before_upsert` |
| User preference auto-creation | 1 | `on_auth_user_created_preferences` |
| Slug generation | 2 | `auto_slugify_rooms`, `auto_slugify_topics` |
| Timestamp updates | 10 | `set_*_updated_at` |
| Side change immutability | 2 | `trg_debate_side_changes_immutable_*` |
| Immutable reputation events | 2 | `trg_reputation_events_immutable_*` |

### 2.4 Views (7 distinct, 22 total CREATE OR REPLACE statements)

| View | First Created | Last Rebuilt | Depends On |
|---|---|---|---|
| `discussion_messages` | Migration 3 | Migration 28 | `messages`, `profiles`, `moderation_flags` |
| `discussion_claims` | Migration 4 | Migration 22 | `claims`, `profiles`, `claim_votes`, `moderation_flags` |
| `discussion_evidence` | Migration 5 | Migration 11 | `evidence`, `claim_evidence`, `sources`, `profiles`, `evidence_votes`, `moderation_flags` |
| `discussion_questions` | Migration 10 | Migration 11 | `questions`, `profiles`, `moderation_flags` |
| `discussion_claim_relations` | Migration 17 | (never rebuilt) | `claim_relations`, `claims`, `rooms` |
| `discussion_debates` | Migration 22 | Migration 24 | `debates`, `claims`, `debate_participants`, `rooms` |
| `moderation_queue` | Migration 12 | Migration 22 | `moderation_flags`, all discussion views |

All 7 views are public-facing (SELECT granted to `anon, authenticated`).

### 2.5 RLS Policies (76 total, 22 migration files)

| Table | Policies | Notes |
|---|---|---|
| `profiles` | 3 | Public read, owner write |
| `storage.objects` (avatars) | 4 | Bucket-specific path enforcement |
| `topics` | 1 | Public read |
| `rooms` | 4 | Public/private visibility enforcement |
| `discussions` | 3 | Room-access gated |
| `messages` | 3 | Room-access gated, owner edit |
| `claims` | 4 | Room-access gated, owner retract, read policy |
| `sources` | 4 | Room-access gated, owner retract |
| `evidence` | 4 | Room-access gated, owner retract |
| `claim_evidence` | 3 | Claim-access gated |
| `claim_votes` | 4 | Self-only, retraction-aware, room-access gated |
| `evidence_votes` | 3 | Self-only, retraction-aware, room-access gated |
| `questions` | 2 | Room-access gated, owner retract |
| `moderation_flags` | 3 | Reporter-owned insert, moderator select/update |
| `claim_relations` | 3 | Room-access gated, owner delete |
| `user_reputation_snapshots` | 2 | Self-only |
| `debate_participants` | 4 | Self-join/leave, public read |
| `debates` | 3 | Public read, creator update + insert |
| `reputation_events` | 2 | Self-view, system insert |
| `debate_side_changes` | 2 | Self-view, self-insert |
| `inquiry_items` | 3 | Room-access gated, owner update |
| `inquiry_responses` | 2 | Room-access gated, self-insert |
| `user_preferences` | 3 | Self-only |

### 2.6 Indexes (59 total)

| Category | Count |
|---|---|
| Performance (foreign key lookups) | 20 |
| Sort/filter (composite) | 6 |
| Search vectors (GIN) | 5 |
| Unique constraints | 6 |
| Moderation lookups | 8 |
| Claim relation lookups | 4 |
| Reputation/inquiry lookups | 6 |
| Debate lookups | 2 |
| Slug lookups | 2 |

### 2.7 Grants (43 total, 15 migration files)

| Type | Count |
|---|---|
| View SELECT to `anon, authenticated` | 19 |
| Base table SELECT to `anon, authenticated` | 8 |
| Moderation view SELECT to `authenticated` | 2 |
| Table DML to `authenticated` | 2 |
| Function EXECUTE to `authenticated` | 12 |

---

## 3. What the Current Deploy Script Does and Doesn't Do

### The script (`deploy_pending_migrations.sql`) includes:

| Object | Source Migration |
|---|---|
| 1 RLS policy on `claims` (SELECT for authenticated in accessible rooms) | `202606090001` |
| 1 table `user_reputation_snapshots` + 2 RLS policies + 1 index | `202606090002` |
| 1 table `debates` + 1 table `debate_participants` + 6 RLS policies + 2 views (`discussion_claims`, `discussion_debates`) + 1 RPC (`create_debate_room`) + 1 view (`moderation_queue`) | `202606100001` |

### What would happen if you ran this on a fresh environment:

```sql
-- Migration 20: 202606090001_fix_claim_vote_rls.sql
drop policy if exists ... on public.claims;       -- OK (no-op if missing)
create policy "Authenticated users can read claims..." on public.claims  -- FAILS: table public.claims doesn't exist
```

**All 3 migrations in the deploy script would fail on a fresh database** because they depend on tables created in migrations 1-19 that are not present.

### What the script is actually designed for:

It is a **patch script** meant to be run on an existing database that already has migrations 1-19 applied but is missing migrations 20-22. This is a common pattern when developing against a shared Supabase project where the base schema is already deployed.

---

## 4. Recommendations

### Option A (Recommended): Use Supabase CLI for deployment

The Supabase CLI handles migration ordering and state tracking automatically:

```bash
supabase db push
```

This reads all files in `supabase/migrations/`, applies them in alphabetical (chronological) order, and tracks which have been applied in a `_supabase_migrations` table.

**Prerequisites**: `supabase` CLI installed, `supabase/config.toml` configured with production project reference.

### Option B: Generate a complete bootstrap script

Create a new script that concatenates all 30 migration files in order with proper error handling:

```sql
-- deploy_all.sql
\set ON_ERROR_STOP on
\ir migrations/202606030001_create_profiles.sql
\ir migrations/202606030002_create_avatars_bucket.sql
...
\ir migrations/202606130001_add_display_name_and_preferences.sql
```

This can be run in the Supabase SQL Editor or via `psql -f deploy_all.sql`.

**Limitation**: Supabase SQL Editor does not support `\ir` commands. Each migration would need to be run individually via the SQL Editor, or a flat concatenated file must be created.

### Option C: Supabase `db pull` / `db push` round-trip

```bash
supabase db pull --schema public   # from working dev DB
supabase db push                   # to fresh production project
```

This snapshots the exact current schema from the development database (including all migration results) and applies it to production.

**Prerequisites**: A working development Supabase project with all migrations applied.

---

## 5. Verdict

| Criterion | Status |
|---|---|
| Every migration exists in `supabase/migrations/` | ✅ (30 of 30 present) |
| `deploy_pending_migrations.sql` includes all migrations | ❌ (3 of 30) |
| All RPCs accounted for across migrations | ✅ (71 documented) |
| All triggers accounted for across migrations | ✅ (62 documented) |
| All views accounted for across migrations | ✅ (7 distinct, 22 revisions) |
| All RLS policies accounted for across migrations | ✅ (76 documented) |
| Local schema is reproducible from migrations | ✅ (in order) |
| Fresh environment can be created from repo alone | ❌ **No** — deploy script is incomplete |

**A fresh production environment cannot be created using the repository alone** because `deploy_pending_migrations.sql` is a patch script, not a bootstrap script. However, the full set of 30 migration files contains the complete schema. A deployment is possible by either:

1. Running all 30 migrations in order via Supabase CLI (`supabase db push`) — **recommended**
2. Generating a flat bootstrap SQL script from all 30 files
3. Using `supabase db pull` from a working development database

The most practical path is Option A: install the Supabase CLI, configure the production project reference, and run `supabase db push`.
