# Discora — Migration Safety Audit (Sprint 6.5)

Version: 1.0  
Date: 2026-06-03  
Scope: All files in `supabase/migrations/`  
Status: Audit complete — **no corrective migrations applied**

---

## Principles

- Do **not** rewrite applied migrations
- Add forward-only corrective migrations when needed
- Flag destructive or non-backfilled DDL

---

## Per-Migration Risk Review

### `202606030001_create_profiles.sql`

| Operation | Risk |
|-----------|------|
| `CREATE TABLE IF NOT EXISTS` | Low |
| Triggers / RLS | Low |
| No `SET NOT NULL` without default on existing data | — |

**Verdict: Safe**

---

### `202606030002_create_avatars_bucket.sql`

| Operation | Risk |
|-----------|------|
| `INSERT ... ON CONFLICT DO UPDATE` on `storage.buckets` | Low — idempotent |
| Storage policies | Low |

**Verdict: Safe**

---

### `202606030003_create_discussions.sql`

| Operation | Risk |
|-----------|------|
| `CREATE TABLE IF NOT EXISTS` | Low |
| `REVOKE SELECT ON messages` | Medium — breaks clients expecting raw messages (intentional) |
| `CREATE VIEW discussion_messages SECURITY DEFINER` | Medium — must review on every change |
| Seed `ON CONFLICT DO UPDATE` | Low — idempotent |

**Verdict: Safe for greenfield; careful on brownfield if messages existed**

---

### `202606030004_create_claims.sql`

| Operation | Risk |
|-----------|------|
| `ALTER TABLE messages ADD CONSTRAINT` | Low if no self-reply rows exist |
| `CREATE TABLE claims` | Low |
| `REVOKE SELECT ON claims` | Intentional |

**Verdict: Safe**

---

### `202606030005_create_evidence.sql`

| Operation | Risk |
|-----------|------|
| `DROP VIEW` not needed | — |
| `sources.url UNIQUE` global | Changed in 006 |
| `evidence.source_id ON DELETE RESTRICT` | Low — blocks source delete |

**Verdict: Safe**

---

### `202606030006_sprint_6_corrections_and_voting.sql` — **Highest risk**

| Operation | Risk | Severity |
|-----------|------|----------|
| `DROP VIEW discussion_evidence, discussion_claims` | Brief unavailability during deploy | Low |
| `ALTER sources ADD room_id` then **`ALTER COLUMN room_id SET NOT NULL`** | **Fails or corrupts** if any row has `NULL` room_id | **High** |
| Same for `evidence.room_id` | **High** |
| Comment: "local dev/testing, safely alter" | Not safe for production with data | **High** |
| `DROP CONSTRAINT sources_url_key` | Changes uniqueness semantics | Medium — plan data migration |
| `ADD CONSTRAINT sources_room_url_unique` | May fail on duplicate (room_id, url) pairs | Medium |
| Vote tables `CREATE IF NOT EXISTS` | Low |
| View recreate with correlated subqueries | Low |

**MIG-01 — Dangerous `SET NOT NULL` without backfill**

```sql
alter table public.sources add column if not exists room_id ...;
alter table public.sources alter column room_id set not null;  -- no UPDATE backfill
```

If migration 005 ran and rows exist without `room_id`, step fails.

**Proposed corrective migration (if production data exists):**

```sql
-- Example pattern (adjust per data reality)
update public.sources s
set room_id = (
  select c.room_id from public.evidence e
  join public.claim_evidence ce on ce.evidence_id = e.id
  join public.claims c on c.id = ce.claim_id
  where e.source_id = s.id
  limit 1
)
where s.room_id is null;

-- Or delete orphan rows in dev only
alter table public.sources alter column room_id set not null;
```

Repeat pattern for `evidence.room_id` before NOT NULL.

---

## Dangerous Patterns Not Present (Good)

- No `DROP TABLE` on user data tables
- No column type narrowing without conversion
- No mass `DELETE` in migrations
- No disabling RLS globally

---

## Ordering Dependencies

```text
001 profiles → 002 avatars → 003 discussions → 004 claims → 005 evidence → 006 voting/corrections
```

006 **must** run after 005 (alters tables/views from 005).

---

## Fixes Applied

None (pending approval).

---

## Recommended Forward Migrations (After Approval)

| ID | File | Purpose |
|----|------|---------|
| MIG-FIX-1 | `202606030007_sprint_65_backfill_room_ids.sql` | Backfill + NOT NULL only if needed on brownfield |
| MIG-FIX-2 | `202606030008_sprint_65_indexes.sql` | Performance indexes |
| MIG-FIX-3 | `202606030009_sprint_65_rls_hardening.sql` | discussions policy + insert scopes |

---

## Remaining Risks

- Applying 006 to staging with orphan sources/evidence
- View drops cause brief API errors during deploy
- No automated migration test in CI
