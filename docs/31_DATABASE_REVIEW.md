# Discora — Database Architecture Review

Version: 1.0  
Date: 2026-06-03  
Reviewer role: Principal Architect / Senior Database Engineer  
Scope: `supabase/migrations/202606030001` through `202606030007`  
Status: Read-only post–Sprint 6.5

---

## Executive Summary

The schema implements a coherent **Source → Evidence → Claim** pipeline with immutability triggers, anonymous `identity_mode` on messages/claims/evidence, and **security definer views** for client reads. Sprint 6.5 migration `007` materially improved discussions SELECT, insert scoping, vote scoping, and indexes. Remaining database issues are **targeted policy gaps** (`claim_evidence`, retracted-entity votes, `inactive` rooms), a likely **broken `sources` dedup SELECT** under revoked privileges, and **brownfield risk** from migration `006` `SET NOT NULL` without backfill.

---

## Migration Inventory

| File | Purpose |
|------|---------|
| `202606030001_create_profiles.sql` | Profiles, username rules, RLS |
| `202606030002_create_avatars_bucket.sql` | Storage policies |
| `202606030003_create_discussions.sql` | Topics, rooms, discussions, messages, `discussion_messages`, RPC |
| `202606030004_create_claims.sql` | Claims, immutability, `discussion_claims` (initial) |
| `202606030005_create_evidence.sql` | Sources, evidence, `claim_evidence`, `discussion_evidence` (initial) |
| `202606030006_sprint_6_corrections_and_voting.sql` | `room_id`, votes, view aggregates, `SET NOT NULL` |
| `202606030007_sprint_65_hardening.sql` | RLS hardening, composite indexes |

---

## Findings

### DB-SEC-01 — `claim_evidence` INSERT not aligned with room-access model

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Evidence** | `202606030005_create_evidence.sql` policy `"Authenticated users can link claim evidence"` — `WITH CHECK` only `exists (select 1 from claims where claims.id = claim_id)`. Not updated in `007`. |
| **Impact** | Any authenticated user who knows `claim_id` and `evidence_id` (e.g. from `discussion_claims` / `discussion_evidence` views) can attach evidence to claims they did not author, within the same room (trigger `validate_claim_evidence_rooms` enforces room match only). |
| **Recommendation** | Extend policy with room visibility predicate (mirror `007` insert policies) and optionally require linker owns evidence or claim. |

---

### DB-FUNC-01 — `sources` SELECT revoked but app performs dedup SELECT

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Evidence** | `revoke select on public.sources` in `005`; `createEvidence()` in `discussion-service.ts` lines 661–666: `.from("sources").select("id")`. |
| **Impact** | URL deduplication likely fails at runtime; repeat URL in same room may hit `sources_room_url_unique` on insert and surface user errors instead of reusing source. |
| **Recommendation** | RPC `get_or_create_source(room_id, url, title)` as `security definer`, or narrow `GRANT SELECT (id, room_id, url)` + RLS, or rely on `INSERT ... ON CONFLICT` via privileged function. |

---

### DB-RLS-01 — Writes permitted on `inactive` public rooms

| Field | Value |
|-------|-------|
| **Severity** | **Medium** |
| **Evidence** | `007` insert policies require `r.status <> 'archived'` only, not `r.status = 'open'`. `rooms.status` allows `'inactive'` (`003`). |
| **Impact** | Participation continues on rooms product may treat as closed; inconsistent with moderation lifecycle. |
| **Recommendation** | If product intent is freeze: require `r.status = 'open'` on inserts (messages, claims, sources, evidence). |

---

### DB-RLS-02 — Votes not blocked on retracted claims/evidence

| Field | Value |
|-------|-------|
| **Severity** | **Medium** |
| **Evidence** | `claim_votes` / `evidence_votes` policies in `007` — no `is_retracted = false` check on parent rows. |
| **Impact** | Consensus metrics can change after retraction; undermines “retraction is terminal state” semantics. |
| **Recommendation** | Add `WITH CHECK` subquery: parent `is_retracted = false`. |

---

### DB-RLS-03 — Message UPDATE policy lacks room lifecycle check

| Field | Value |
|-------|-------|
| **Severity** | **Low** |
| **Evidence** | `003` policy `"Authors can edit their messages"` — `user_id = auth.uid()` only; not tightened in `007`. |
| **Impact** | Author may edit within 5 minutes in archived room if they retain message id (edge case). |
| **Recommendation** | Optional: join `rooms` in `USING`/`WITH CHECK` for non-archived + accessible room. |

---

### DB-MIG-01 — Migration `006` `SET NOT NULL` without backfill

| Field | Value |
|-------|-------|
| **Severity** | **High** (brownfield only) / **Informational** (greenfield) |
| **Evidence** | `202606030006_sprint_6_corrections_and_voting.sql` lines 15, 22. |
| **Impact** | Deploy failure or manual intervention if pre-006 `sources`/`evidence` rows exist without `room_id`. |
| **Recommendation** | Forward backfill migration before production data; document in runbooks. |

---

### DB-TRG-01 — `claim_evidence` UPDATE trigger vs `validate_claim_evidence_rooms` on UPDATE

| Field | Value |
|-------|-------|
| **Severity** | **Informational** |
| **Evidence** | `enforce_claim_evidence_immutability` always raises; `validate_claim_evidence_rooms` fires on `INSERT OR UPDATE` (`006`). |
| **Impact** | None (dead UPDATE path). |
| **Recommendation** | Restrict validator to `INSERT` only when touching triggers. |

---

### DB-IDX-01 — Composite indexes applied (resolved)

| Field | Value |
|-------|-------|
| **Severity** | **Resolved** |
| **Evidence** | `007`: `messages_room_id_created_at_idx`, `claims_room_id_created_at_idx`, `evidence_room_id_created_at_idx`, `rooms_discussion_feed_idx`. |

---

### DB-FK-01 — Foreign keys and cascades (verified)

| Field | Value |
|-------|-------|
| **Severity** | **Informational** (strength) |
| **Evidence** | `evidence.source_id` → `ON DELETE RESTRICT`; `discussions.id` → `rooms` CASCADE; `messages.room_id` CASCADE; votes CASCADE with parent. |
| **Impact** | Referential integrity matches knowledge-model intent. |

---

### DB-IMM-01 — Immutability triggers (verified)

| Field | Value |
|-------|-------|
| **Severity** | **Informational** (strength) |
| **Evidence** | `enforce_claim_immutability`, `enforce_evidence_immutability`, `enforce_source_immutability`, `prevent_*_deletion`, message `identity_mode` immutability, 5-minute edit window (`003`/`004`). |
| **Impact** | ADR-019/020/021 enforced at DB layer. |

---

### DB-ANON-01 — Views and REVOKE SELECT (verified post–6.5)

| Field | Value |
|-------|-------|
| **Severity** | **Informational** (strength) |
| **Evidence** | `discussion_messages`, `discussion_claims`, `discussion_evidence` redact `user_id`/`created_by`; raw table SELECT revoked for `anon`/`authenticated`. |
| **Impact** | ADR-016 satisfied for read paths; mutation leaks fixed in app (`.select("id")`). |

---

### DB-VIEW-01 — SECURITY DEFINER vote aggregation reads full vote tables

| Field | Value |
|-------|-------|
| **Severity** | **Medium** (future) / **Low** (current MVP) |
| **Evidence** | `006` views: grouped subqueries on `claim_votes`/`evidence_votes`; correlated `user_vote` per row. |
| **Impact** | View owner bypasses vote RLS for aggregates (intended); per-row cost grows with vote volume. |
| **Recommendation** | Monitor; consider materialized counts or limited rollups at scale. |

---

### DB-PIPE-01 — Cross-room linking protections (verified)

| Field | Value |
|-------|-------|
| **Severity** | **Informational** (strength) |
| **Evidence** | `validate_claim_evidence_rooms`, `validate_evidence_source_room`, `handle_claim_identity_mode` origin message room check. |
| **Impact** | Pipeline room integrity enforced regardless of RLS gaps on junction insert. |

---

## Privilege Escalation Paths Considered

| Path | Result |
|------|--------|
| anon SELECT raw `messages.user_id` | Blocked (REVOKE + no policy) |
| authenticated SELECT raw claims | Blocked |
| Vote as another user | Blocked (`user_id = auth.uid()` + insert trigger) |
| Vote on private room entity without access | Mitigated in `007` |
| Link cross-room evidence to claim | Blocked by trigger |
| Read private discussion via `discussions` table | Mitigated in `007` |
| service_role / superuser deanonymization | Operational trust boundary (documented ADR) |

---

## Missing Constraints (deferred / product)

| Item | Severity | Notes |
|------|----------|-------|
| Rate limits / quotas | Future | No DB-level spam controls |
| `claim_evidence.created_by` linker ownership | Medium | Column exists; policy does not enforce |
| `file_path` sources without upload flow | Low | Schema ready; app URL-only |

---

## Do Not Change (stable)

- Immutability + retraction trigger model  
- Separate `claim_votes` / `evidence_votes` tables (ADR vote schema)  
- Security definer redaction view pattern  
- `room_id` on sources/evidence post-006  

---

## Validation Reference

Sprint 6.5: `npm run lint` and `npm run build` pass. This review did not re-run them.
