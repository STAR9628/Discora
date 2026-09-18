# Phase 7D / Phase F — Production Migration Apply Report

**Date:** 2026-09-12 ~08:42 UTC
**Authorization:** explicit owner approval (prior prompt), following READY FOR OWNER APPROVAL preflight.
**Command (only write command run):** `supabase db push --linked`
**Scope:** the 13 pending migrations in existing order. No edits, no extra SQL, no data seeding, no deletions, no history repair.

---

## 1. Push result — SUCCEEDED

`Finished supabase db push.` All 13 applied; log showed only benign first-creation `NOTICE ... does not exist, skipping` lines (IF EXISTS guards). No errors, no rollback.

## 2. Migrations applied (history afterward — all Local == Remote)

`202606260003`, `202606260004`, `202606260005`, `202606260006` (disposition), `202606270001`, `202609090001`–`202609090008`. Zero pending remain.

## 3. Immediate verification (read-only REST, member session)

- `resolved` debates visible: **0** (was 1).
- `closed` debates visible: **1**.
- Target `4120c703-…`: **closed**, `updated_at` = push time (disposition executed exactly as approved; `resolution` column itself dropped by 270001 right after).
- `claim_requests` table: **200 empty** (was 404) — exists, zero rows.
- `claim_requests_aggregated`, `reaction_aggregates` views: **200** — exist.
- `discussion_messages` 16 / `discussion_claims` 22 — unchanged (no out-of-scope data touched).

## 4. Errors — NONE

No push errors; no manual intervention; no repair needed.

## 5. Out-of-scope data — UNTOUCHED

Only the approved effects occurred: disposition row update, winner/loser removal (`resolution` column, resolve RPC/trigger, WON/LOST events), CHECK tightening, and the 8 Phase 7D additions. QA/demo discussions, debates, rooms, messages, claims, and participants were not modified, deleted, or seeded.

## 6. Readiness for the 30-check post-apply matrix — READY

The database is ready for the full post-apply verification matrix (lifecycle, RLS negative tests, multi-requester aggregation, reactions, conversion regression, tombstone behavior, moderation intactness). Phase G remains NOT STARTED pending that matrix going green.
