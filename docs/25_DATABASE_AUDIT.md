# Discora — Database Audit (Sprint 6.5)

Version: 1.1  
Date: 2026-06-03  
Scope: All migrations in `supabase/migrations/`  
Status: **Partial fixes applied** — see `202606030007_sprint_65_hardening.sql`

---

## Summary

Seven migrations define profiles through Sprint 6.5 hardening. Core referential integrity remains sound. **DB-01** and **DB-02** are resolved in migration `007`. **Migration 006 `SET NOT NULL` risk** remains documented in `docs/30_MIGRATION_SAFETY_AUDIT.md` (no backfill migration added — greenfield/dev assumption unchanged).

---

## Schema Inventory

| Table | PK | Notable FKs | ON DELETE |
|-------|-----|-------------|-----------|
| `profiles` | `id` → `auth.users` | — | CASCADE |
| `topics` | `id` | `created_by` → `auth.users` | SET NULL |
| `rooms` | `id` | `topic_id`, `created_by` | SET NULL |
| `discussions` | `id` → `rooms` | — | CASCADE |
| `messages` | `id` | `room_id` → CASCADE; `parent_message_id` → CASCADE; `user_id` → SET NULL | mixed |
| `claims` | `id` | `room_id` CASCADE; `origin_message_id` SET NULL; `created_by` SET NULL | mixed |
| `sources` | `id` | `room_id` CASCADE; `created_by` SET NULL | mixed |
| `evidence` | `id` | `source_id` **RESTRICT**; `room_id` CASCADE; `created_by` SET NULL | mixed |
| `claim_evidence` | `(claim_id, evidence_id)` | both CASCADE | CASCADE |
| `claim_votes` | `id` | `user_id` CASCADE; `claim_id` CASCADE | CASCADE |
| `evidence_votes` | `id` | `user_id` CASCADE; `evidence_id` CASCADE | CASCADE |

Views (security definer): `discussion_messages`, `discussion_claims`, `discussion_evidence`.

---

## Verified Strengths

- **Message integrity**: self-reply check, immutable `identity_mode`, 5-minute edit window via triggers.
- **Knowledge immutability**: claims, evidence, sources, `claim_evidence` triggers.
- **Ownership assignment**: triggers set `user_id` / `created_by` from `auth.uid()` on INSERT.
- **Pipeline enforcement**: room match validators on claims/evidence junctions.
- **Uniqueness**: profiles, slugs, votes, `sources(room_id, url)`.
- **Anonymity-oriented access**: `REVOKE SELECT` on raw sensitive tables for `anon`/`authenticated`.

---

## Issues Found

### DB-01 — `discussions` SELECT unrestricted — **RESOLVED**

**Fix:** Migration `202606030007` — policy `Discussions are readable when room is accessible` joins `rooms` with public/non-archived or creator access.

---

### DB-02 — Missing composite indexes — **RESOLVED**

**Fix:** Migration `202606030007` adds:

- `messages_room_id_created_at_idx`
- `claims_room_id_created_at_idx`
- `evidence_room_id_created_at_idx`
- `rooms_discussion_feed_idx` (partial, `room_type = 'discussion'`)

---

### DB-03 — `sources.url` room-scoped only (Low — intentional)

No change. Same URL may exist in different rooms.

---

### DB-04 — `evidence` → `sources` ON DELETE RESTRICT (Low — by design)

No change.

---

### DB-05 — `claim_evidence` UPDATE validation dead path (Low)

**Deferred.** Optional: restrict `validate_claim_evidence_rooms` to `INSERT` only.

---

### DB-06 — No index on `messages.created_at` alone (Low)

**Deferred.** Composite `(room_id, created_at)` added; feed uses `rooms.created_at`.

---

### DB-07 — Content length checks (Info)

**Deferred.** App/Zod enforces title/description; DB enforces opening statement ≥100 chars.

---

## Fixes Applied (Sprint 6.5)

| ID | Fix | Migration / code |
|----|-----|------------------|
| DB-01 | Discussions SELECT scoped to accessible rooms | `202606030007_sprint_65_hardening.sql` |
| DB-02 | Composite indexes for feed and room-scoped lists | `202606030007_sprint_65_hardening.sql` |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Production deploy of migration 006 on DB with orphan `room_id` | High | See `docs/30_MIGRATION_SAFETY_AUDIT.md` — **deferred** |
| Large rooms: full message load, no DB pagination | Medium | **Deferred** (out of approved scope) |
| `discussion_evidence` hides unlinked evidence | Low | By design |
| DB-05 dead trigger path | Low | **Deferred** |

---

## Migration File Review Checklist

| File | FKs | Cascades | Nullability | Indexes | Uniqueness |
|------|-----|----------|-------------|---------|------------|
| `202606030001_create_profiles.sql` | ✓ | ✓ | ✓ | ✓ | ✓ username |
| `202606030002_create_avatars_bucket.sql` | N/A | N/A | N/A | N/A | bucket id |
| `202606030003_create_discussions.sql` | ✓ | ✓ | ✓ | partial | ✓ slugs |
| `202606030004_create_claims.sql` | ✓ | ✓ | ✓ | ✓ | — |
| `202606030005_create_evidence.sql` | ✓ | restrict on source | ✓ | ✓ | url (later changed) |
| `202606030006_sprint_6_corrections_and_voting.sql` | ✓ room_id | ✓ | **risky NOT NULL** | ✓ votes | ✓ vote unique |
| `202606030007_sprint_65_hardening.sql` | — | — | — | ✓ composite | RLS only |

---

## Validation

| Command | Result (post-fix) |
|---------|-------------------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
