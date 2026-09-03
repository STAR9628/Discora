# Deployment Stabilization Report

**Date:** 2026-06-17
**Scope:** Migrations #23–#31 versus live Supabase database
**Method:** Static code audit + live schema probes

---

## 1. Deployment Parity Summary

Live database is at **migration #22** (`202606100001_create_debates.sql`).
Migrations **#23–#31** (9 files) are not deployed.

### Verified missing (live probe results)

| Object | Expected From | Probe Result |
|---|---|---|
| `reputation_events` table | #25 | `PGRST205` — not found |
| `debate_side_changes` table | #27 | `PGRST205` — not found |
| `inquiry_items` table | #29 | `PGRST205` — not found |
| `inquiry_responses` table | #29 | `PGRST205` — not found |
| `user_preferences` table | #30 | `PGRST205` — not found |
| `profiles.display_name` column | #30 | `42703` — column does not exist |
| `discussion_debates` extended columns | #24 | `42703` — `total_claims` does not exist |
| `create_reputation_event` RPC | #25 | `PGRST202` — function not found |
| `switch_debate_side` RPC | #27–#28 | `PGRST202` — function not found |
| `create_inquiry` RPC | #29 | `PGRST202` — function not found |
| All 7 homepage RPCs | #31 | `PGRST202` — function not found |

---

## 2. Dependency Map

```
         ┌─────┐
         │ #22 │  (deployed in production)
         └──┬──┘
            │
      ┌─────┼─────┬──────────────────┐
      ▼     │     │                  │
    ┌───┐   │   ┌───┐               │
    │#23│   │   │#24│               │
    └───┘   │   └───┘               │
  (policy)  │     │                  │
            │     └──────┐           │
            ▼            ▼           │
          ┌───┐        ┌───┐        │
          │#25│        │#29│        │
          └─┬─┘        └─┬─┘        │
         (reputation)   (inquiry)   │
            │            │          │
            ▼            │          │
          ┌───┐          │          │
          │#26│──────────┤          │
          └─┬─┘(stabilize)│         │
            │            │          │
            ▼            ▼          ▼
          ┌───┐        ┌───┐     ┌────┐
          │#27│        │#30│     │ #31│
          └─┬─┘        └────┘     └─┬──┘
        (side switch) (preferences)  │
            │                       │
            ▼                       │
          ┌───┐                     │
          │#28│─────────────────────┘
          └───┘
     (cooldown fix)
```

### Dependency edges explained

| Edge | From | To | Reason |
|---|---|---|---|
| #23 → #22 | #23 | #22 | Adds INSERT policy on `debates` table (exists) |
| #24 → #22 | #24 | #22 | Replaces `discussion_debates` view (exists) |
| #25 → #22 | #25 | #22 | Reads `claims`, `claim_votes`, `evidence`, `evidence_votes`, `debates`, `debate_participants` (exist) |
| #26 → #25 | #26 | #25 | Calls `create_reputation_event()` (created in #25) |
| #27 → #25 | #27 | #25 | Calls `create_reputation_event()` (created in #25) |
| #28 → #27 | #28 | #27 | Replaces `switch_debate_side()` (created in #27) and `discussion_messages` (replaced in #27) |
| #29 → #25 | #29 | #25 | Calls `create_reputation_event()` (created in #25) |
| #31 → #29 | #31 | #29 | Reads `inquiry_items`, `inquiry_responses` tables (created in #29) |
| #31 → #24 | #31 | #24 | References `d.last_activity_at` from `discussion_debates` view (extended in #24) |

---

## 3. Cross-Migration Object Audit

### Objects created more than once (safe — `CREATE OR REPLACE`)

| Object | First Created In | Replaced In | Mechanism |
|---|---|---|---|
| `discussion_debates` view | #22 (deployed) | #24 | `drop view if exists` + `create or replace view` |
| `discussion_messages` view | earlier deployed | #27, #28 | `drop view if exists` + `create view` |
| `handle_message_identity_mode` function | earlier deployed | #27 | `create or replace function` |
| `switch_debate_side` function | #27 | #28 | `create or replace function` |

All safe. No duplicate objects exist.

### Unique objects (created once across #23–#31)

| Object | Created In |
|---|---|
| `"Authenticated users can create debates"` policy | #23 |
| `resolve_debate` RPC | #24 |
| `reputation_events` table | #25 |
| `idx_reputation_events_user_id` index | #25 |
| `idx_reputation_events_type` index | #25 |
| 14 reputation RPCs/triggers | #25 |
| `handle_claim_vote_before_upsert` function + trigger | #26 |
| `handle_evidence_vote_before_upsert` function + trigger | #26 |
| `handle_debate_participant_before_upsert` function + trigger | #26 |
| `prevent_reputation_event_mutation` function + 2 triggers | #26 |
| `debate_side_changes` table + 2 triggers + 2 policies | #27 |
| `post_system_message` RPC | #27 |
| `inquiry_items` table + 4 indexes + 3 policies | #29 |
| `inquiry_responses` table + 2 indexes + 2 policies | #29 |
| 5 inquiry RPCs | #29 |
| `profiles.display_name` column | #30 |
| `user_preferences` table + 3 policies + 2 triggers | #30 |
| `get_user_preferences` RPC | #30 |
| `get_my_moderation_flags` RPC | #30 |
| 7 homepage RPCs | #31 |

---

## 4. Trigger Hardening Audit

### Migration #25 — 12 triggers

| Trigger Name | Table | Timing | Event | Re-run Safety |
|---|---|---|---|---|
| `trg_reputation_claim_insert` | `claims` | AFTER INSERT | execute `handle_claim_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_claim_retract` | `claims` | AFTER UPDATE of `is_retracted` | execute `handle_claim_retract()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_claim_vote_insert` | `claim_votes` | AFTER INSERT | execute `handle_claim_vote_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_claim_vote_delete` | `claim_votes` | AFTER DELETE | execute `handle_claim_vote_delete()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_evidence_insert` | `evidence` | AFTER INSERT | execute `handle_evidence_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_evidence_retract` | `evidence` | AFTER UPDATE of `is_retracted` | execute `handle_evidence_retract()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_evidence_vote_insert` | `evidence_votes` | AFTER INSERT | execute `handle_evidence_vote_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_evidence_vote_delete` | `evidence_votes` | AFTER DELETE | execute `handle_evidence_vote_delete()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_question_insert` | `questions` | AFTER INSERT | execute `handle_question_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_debate_insert` | `debates` | AFTER INSERT | execute `handle_debate_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_debate_participant_insert` | `debate_participants` | AFTER INSERT | execute `handle_debate_participant_insert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_debate_resolve` | `debates` | AFTER UPDATE of `status` | execute `handle_debate_resolve()` | **UNSAFE** — bare `CREATE TRIGGER` |

### Migration #26 — 5 triggers

| Trigger Name | Table | Timing | Event | Re-run Safety |
|---|---|---|---|---|
| `trg_claim_vote_before_upsert` | `claim_votes` | BEFORE INSERT | execute `handle_claim_vote_before_upsert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_evidence_vote_before_upsert` | `evidence_votes` | BEFORE INSERT | execute `handle_evidence_vote_before_upsert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_debate_participant_before_upsert` | `debate_participants` | BEFORE INSERT | execute `handle_debate_participant_before_upsert()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_events_immutable_update` | `reputation_events` | BEFORE UPDATE | execute `prevent_reputation_event_mutation()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_reputation_events_immutable_delete` | `reputation_events` | BEFORE DELETE | execute `prevent_reputation_event_mutation()` | **UNSAFE** — bare `CREATE TRIGGER` |

### Migration #27 — 2 triggers

| Trigger Name | Table | Timing | Event | Re-run Safety |
|---|---|---|---|---|
| `trg_debate_side_changes_immutable_update` | `debate_side_changes` | BEFORE UPDATE | execute `prevent_debate_side_change_mutation()` | **UNSAFE** — bare `CREATE TRIGGER` |
| `trg_debate_side_changes_immutable_delete` | `debate_side_changes` | BEFORE DELETE | execute `prevent_debate_side_change_mutation()` | **UNSAFE** — bare `CREATE TRIGGER` |

### Trigger re-run risk score

- **19 bare `CREATE TRIGGER` statements** across #25, #26, #27.
- **0 have `DROP TRIGGER IF EXISTS`** before creation.
- Result: **Re-running any of these three migrations will fail** with `ERROR: trigger "..." already exists`.
- On first-run deployment: **zero risk** (no existing triggers to conflict with).
- Name uniqueness across migrations is verified — no trigger name is used by more than one migration.

### Safe triggers (in migration #28, #29, #30)

Migrations #28, #29, and #30 do not create triggers.
Migration #30 uses `drop trigger if exists` before its triggers (safe).

---

## 5. Pre-Deployment Bug Found

### Migration #31: `get_my_debates_attention` references nonexistent column

In `202606170001_create_homepage_rpcs.sql` lines 168 and 175:

```sql
from debates d
...
order by d.last_activity_at desc nulls last
```

The `debates` base table does **not** have a `last_activity_at` column.
The `discussion_debates` view (created in #24) computes `last_activity_at` as an expression (`greatest(...)`), but the underlying table lacks it.

**Effect**: Deploying all 9 migrations will still leave `get_my_debates_attention` broken with `column d.last_activity_at does not exist` (PG error 42703).

**Fix needed before or after deployment**: Replace `debates d` with the `discussion_debates` view in this RPC, or remove the `order by d.last_activity_at` clause.

---

## 6. Deployment Readiness Analysis

### Risk Scoring

| Factor | Rating | Detail |
|---|---|---|
| Data loss | **None** | All DDL is additive. No DROP TABLE/COLUMN. |
| Schema conflict with existing | **None** | No object name collisions across #23–#31 or with deployed objects. |
| Trigger re-run (first time) | **None** | First deployment has no existing triggers to conflict with. |
| Trigger re-run (subsequent) | **High** | 19 bare CREATE TRIGGER — any re-run fails. |
| Function signature conflict | **None** | All replaced functions use CREATE OR REPLACE. |
| View replacement safety | **None** | All replaced views use DROP + CREATE or CREATE OR REPLACE. |
| Backfill necessity | **Low** | Migration #30 does `INSERT ... ON CONFLICT DO NOTHING` for existing `auth.users`. |
| Application backward compat | **High** | No columns or views are removed. Old queries continue working. |
| Rollback ease | **Low** | 5 new tables + 19 triggers + 30+ RPCs would need manual rollback. |

### Ordering constraints

The migrations are already numbered in dependency order. **Migrations must be deployed in numeric sequence** (#23 → #24 → ... → #31) because:

1. #26 calls `create_reputation_event()` from #25
2. #27 calls `create_reputation_event()` from #25
3. #28 replaces `switch_debate_side()` from #27
4. #29 calls `create_reputation_event()` from #25
5. #31 reads `inquiry_items` from #29

---

## 7. Deployment Plan

### Phase A — Debate Fixes (migrations #23–#24)

| Step | Migration | Creates | Risk | Time |
|---|---|---|---|---|
| 1 | #23 | 1 policy on `debates` | None | <1s |
| 2 | #24 | Extended `discussion_debates` view, `resolve_debate` RPC | Low — view is DROP+CREATE | <1s |

**Total**: 2 migrations, ~1 second.

### Phase B — Reputation + Side Switch + Inquiry (migrations #25–#29)

| Step | Migration | Creates | Risk | Time |
|---|---|---|---|---|
| 3 | #25 | `reputation_events` table, 14 RPCs, **12 triggers** | Medium — triggers are bare CREATE (first-run OK) | <1s |
| 4 | #26 | 4 functions, **5 triggers** | Medium — triggers are bare CREATE (first-run OK) | <1s |
| 5 | #27 | `debate_side_changes` table, 2 policies, 2 RPCs, **2 triggers** | Medium — triggers are bare CREATE (first-run OK) | <1s |
| 6 | #28 | Replaces `discussion_messages` view, `switch_debate_side` with cooldown | Low — CREATE OR REPLACE | <1s |
| 7 | #29 | `inquiry_items`, `inquiry_responses` tables, 5 RPCs | Low — IF NOT EXISTS + CREATE OR REPLACE | <1s |

**Total**: 5 migrations, ~2 seconds.

### Phase C — Preferences + Homepage (migrations #30–#31)

| Step | Migration | Creates | Risk | Time |
|---|---|---|---|---|
| 8 | #30 | `profiles.display_name`, `user_preferences` table, 2 triggers (safe), 2 RPCs | None — all IF NOT EXISTS + drop trigger if exists | <1s |
| 9 | #31 | 7 homepage RPCs | **High** — `get_my_debates_attention` references nonexistent column (see bug above) | <1s |

**Total**: 2 migrations, ~1 second.

---

## 8. Pre-Deployment Fixes Required

### Required

1. **Migration #31 — fix `get_my_debates_attention` column reference**
   - Replace `from debates d` with `from discussion_debates d` — OR —
   - Replace `order by d.last_activity_at` with `order by coalesce(d.updated_at, d.created_at)`
   - Either approach resolves `column does not exist` error.

### Recommended (not blocking)

2. **Add `DROP TRIGGER IF EXISTS` to migrations #25, #26, #27** (19 triggers total)
   - Each `CREATE TRIGGER` should be preceded by:
     ```sql
     drop trigger if exists <trigger_name> on <table>;
     ```
   - This makes all 9 migrations safely re-runnable.
   - Without this fix, any deployment rollback + retry requires manual cleanup of orphan triggers.

---

## 9. Verification Checklist

### After deployment, run these validations:

### Debates

- [ ] `SELECT * FROM discussion_debates LIMIT 1` — returns `total_claims`, `total_participants`, `total_evidence`, `last_activity_at`, `title`, `slug`
- [ ] `SELECT resolve_debate(...)` — resolves an active debate
- [ ] Create a debate via `create_debate_room` RPC — succeeds without RLS violation (tests #23 fix)

### Side Switching

- [ ] `SELECT switch_debate_side(...)` — switches side with reason >= 50 chars
- [ ] `SELECT switch_debate_side(...)` twice in 24h — returns cooldown error
- [ ] `SELECT * FROM debate_side_changes` — contains audit trail
- [ ] System message visible in `discussion_messages` after side switch

### Inquiry

- [ ] `SELECT create_inquiry(...)` — creates inquiry item
- [ ] `SELECT respond_to_inquiry(...)` — creates response, updates status to 'responded'
- [ ] `SELECT satisfy_inquiry(...)` — marks satisfied
- [ ] `SELECT close_inquiry(...)` — closes inquiry
- [ ] `SELECT * FROM inquiry_items` — data visible
- [ ] `SELECT * FROM inquiry_responses` — data visible

### Reputation

- [ ] `SELECT * FROM reputation_events` — contains event rows (should auto-populate on claim create)
- [ ] `SELECT recalculate_user_reputation(...)` — returns numeric score
- [ ] `SELECT * FROM user_reputation_snapshots` — contains snapshots
- [ ] Insert duplicate `claim_votes` row — second vote compensates (tests #26 BEFORE trigger)

### Preferences / Settings

- [ ] `SELECT display_name FROM profiles LIMIT 1` — column exists (may be null)
- [ ] `SELECT * FROM user_preferences` — row exists for each auth user
- [ ] `SELECT get_user_preferences(...)` — returns preferences JSON
- [ ] `SELECT get_my_moderation_flags()` — returns flags (may be empty)

### Homepage

- [ ] `SELECT get_homepage_metrics()` — returns JSON with 4 metrics
- [ ] `SELECT get_featured_inquiries(3)` — returns array (may be empty)
- [ ] `SELECT get_my_open_inquiries()` — returns array (may be empty)
- [ ] `SELECT get_my_inquiry_responses()` — returns array (may be empty)
- [ ] `SELECT get_my_debates_attention()` — returns array (may be empty)
- [ ] `SELECT get_my_topic_evidence(7)` — returns array (may be empty)
- [ ] `SELECT get_my_understanding_evolved()` — returns array (may be empty)
- [ ] Guest homepage loads without errors
- [ ] Logged-in homepage loads without errors

### Meta

- [ ] No PGRST202 or PGRST205 errors in browser console
- [ ] Zero lint errors (`npm run lint`)
- [ ] Zero TS errors (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npx next build`)

---

## 10. Go / No-Go Recommendation

### Deployment Verdict: **CONDITIONAL GO**

| Condition | Status | Blocking |
|---|---|---|
| Fix `get_my_debates_attention` in #31 | Not yet done | **YES — required before deployment** |
| Add `DROP TRIGGER IF EXISTS` to #25, #26, #27 | Not yet done | **Recommended** — not blocking |
| Existing data is compatible | ✅ Verified | No |
| Schema conflict with production | ✅ Verified | No |
| Application builds clean | ✅ Verified | No |
| Dependency order correct | ✅ Verified | No |

### Execution

1. **Pre-fix** migration #31 (`get_my_debates_attention` column error)
2. **(Recommended)** Add `DROP TRIGGER IF EXISTS` before each `CREATE TRIGGER` in #25, #26, #27
3. **Run** all 9 migrations in numeric order (#23 → #24 → ... → #31) via Supabase Dashboard SQL Editor
4. **Validate** using the verification checklist above
5. **Rollback plan**: If any step fails, do NOT retry the entire script — fix the error and continue from the failed point. The partial deployment state is safe (all DDL is additive).
