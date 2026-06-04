# Discora — Implementation Review (Pre–Sprint 7)

Version: 1.1  
Date: 2026-06-03  
Audience: Engineering, product, architecture  
Status: Post–Sprint 6.5 audit + Sprint 7 preflight updates (readiness status only)

Related deliverables:

- [docs/31_DATABASE_REVIEW.md](docs/31_DATABASE_REVIEW.md)
- [docs/32_SECURITY_REVIEW.md](docs/32_SECURITY_REVIEW.md)
- [docs/33_PERFORMANCE_REVIEW.md](docs/33_PERFORMANCE_REVIEW.md)
- [docs/34_CODE_QUALITY_REVIEW.md](docs/34_CODE_QUALITY_REVIEW.md)
- [docs/35_SPRINT_7_READINESS_REVIEW.md](docs/35_SPRINT_7_READINESS_REVIEW.md)

Prior Sprint 6.5 audit artifacts (`docs/25`–`docs/31_CODE_QUALITY_AUDIT.md`) remain historical; this review supersedes them for **go-forward decisions** only where noted.

---

## Executive Summary

Discora has a **production-credible MVP foundation** for structured discussions, anonymous participation (read path + mutation responses), claims, evidence, sources, and consensus voting. Database design reflects clear product principles: immutability, retraction, room-scoped knowledge, and security definer redaction (ADR-016).

Sprint 6.5 successfully closed high-severity gaps: discussions over-read, room-scoped inserts/votes, feed keyset pagination, composite indexes, and mutation identity leaks.

**Preflight (post-audit):** P0 items **DB-FUNC-01** and **DB-SEC-01** were resolved in `202606030008_p0_source_dedup_and_claim_evidence.sql`. Retracted-entity vote blocking was resolved in `202606030009_block_votes_on_retracted_entities.sql`. Remaining work before Question migrations is **ADR approval** (`docs/37`) and execution per `docs/38`.

**Recommendation:** Proceed to Sprint 7 — **READY** (see verdict below).

---

## Risk Matrix

| ID | Area | Severity | Likelihood | Impact | Status |
|----|------|----------|------------|--------|--------|
| R1 | `sources` dedup SELECT vs REVOKE | **High** | High | Evidence flow errors, duplicate URL failures | **RESOLVED** (`008`) |
| R2 | `claim_evidence` INSERT policy | **High** | Medium | Unauthorized cross-linking in room | **RESOLVED** (`008`) |
| R3 | Unbounded message fetch | Medium | Medium (at 10k users) | Latency, client freeze | **Deferred** |
| R4 | View vote correlation O(n) | Medium | Low now | DB CPU at scale | **Deferred** |
| R5 | Votes on retracted entities | Medium | Medium | Consensus integrity | **RESOLVED** (`009`) |
| R6 | `inactive` room writes | Medium | Low | Lifecycle confusion | **Open** |
| R7 | Migration 006 brownfield NOT NULL | High | Low (greenfield) | Deploy failure | **Deferred** |
| R8 | service_role deanon | Critical | Low | Total anonymity breach | **Operational** |
| R9 | Anonymous author edit/retract UI | Medium | High (UX) | Author frustration only | **Deferred** |
| R10 | SECURITY DEFINER regression | Medium | Low | Identity leak | **Process** |

---

## Approved Architecture Observations

1. **ADR-016 implementation is correct for reads** — `discussion_messages`, `discussion_claims`, `discussion_evidence` with `REVOKE SELECT` on base tables.  
2. **Immutability enforcement is database-authoritative** — claims, evidence, sources, messages (identity + edit window).  
3. **Knowledge pipeline integrity** — `validate_claim_evidence_rooms`, `validate_evidence_source_room`, room-scoped sources.  
4. **Vote model** — Separate typed tables with unique `(user_id, entity_id)`; RLS prevents impersonation.  
5. **Sprint 6.5 hardening** — Migration `007` aligns inserts/votes/discussions SELECT with room visibility model.  
6. **Mutation hygiene** — `.select("id")` preserves anonymity on write responses.  
7. **Feed pagination** — Composite `(created_at, id)` keyset is correct pattern.  
8. **Feature boundaries** — Auth, profiles, discussions modules are separable; Supabase isolated under `src/services/supabase`.

---

## Recommended Fixes

### Before or at start of Sprint 7 (non–scope-creep)

| # | Fix | Effort | Doc ref |
|---|-----|--------|---------|
| 1 | `get_or_create_source` RPC | Small | DB-FUNC-01 — **Done** (`008`) |
| 2 | `claim_evidence` INSERT policy + room visibility | Small | DB-SEC-01 — **Done** (`008`) |
| 3 | Vote policies: deny when claim/evidence `is_retracted` | Small | — **Done** (`009`) |
| 4 | Decide `inactive` room write behavior; align RLS | Small | DB-RLS-01 — Open |

### Sprint 7 planning (required design, not implementation here)

| # | Item |
|---|------|
| 5 | ADR: Question entity + voting boundaries |
| 6 | Migration: `questions` + Question→Claim link |
| 7 | `discussion_questions` security definer view if anonymous |

### Scale sprint (later)

| # | Item |
|---|------|
| 8 | Message pagination + virtualized thread |
| 9 | Claims/evidence pagination |
| 10 | Optimize `user_vote` in views |

---

## Deferred Items (explicit)

| Item | Reason |
|------|--------|
| ANON-03 / ANON-04 author UI | Product/UX sprint; no third-party leak |
| Message / claims / evidence pagination | Approved out of 6.5 |
| Migration 006 backfill | Only if brownfield data exists |
| Realtime `message_events` | Not implemented; Sprint 4 doc only |
| Search, AI, moderation, debates | Out of roadmap scope |
| Refactor `discussion-service.ts` | Maintainability; not blocking |
| Rate limiting | Platform sprint |

---

## Go / No-Go for Sprint 7

### Verdict: **READY**

| Condition | Owner | Status |
|-----------|-------|--------|
| Resolve `sources` dedup / evidence creation reliability | Backend | **RESOLVED** (`008`) |
| Harden `claim_evidence` RLS | Backend | **RESOLVED** (`008`) |
| Block votes on retracted entities | Backend | **RESOLVED** (`009`) |
| Question schema + voting ADR signed before migrations | Architecture | **Draft** (`docs/37`) — approve before Phase 1 |
| Document MVP room size limits for ops/QA | Product/Eng | Open (non-blocking) |

**Not ready (would change verdict to NOT READY):**

- Reintroduction of raw identity in mutation `.select()`  
- Bypassing views for anonymous content reads  
- Starting Sprint 7 without Question schema ADR while adding question votes ad hoc  

---

## Top 5 Risks

1. **Unbounded `getMessages` / client tree** — first production scalability cliff (~10k users, hot threads).  
2. **SECURITY DEFINER + service_role operational access** — only remaining path to deanonymize at scale.  
3. **Sprint 7 schema drift** — Questions without approved ADR (`docs/37`) risks inconsistent model.  
4. ~~`createEvidence` + sources dedup~~ — **RESOLVED** (`008`).  
5. ~~`claim_evidence` weak policy~~ — **RESOLVED** (`008`).  

---

## Top 5 Strengths

1. **Security definer redaction architecture** for anonymous reads (ADR-016).  
2. **Database-enforced immutability and retraction** on knowledge objects.  
3. **Room integrity triggers** on evidence/claim/source pipeline.  
4. **Sprint 6.5 RLS and pagination hardening** (migration `007` + service changes).  
5. **Clear feature module structure** with validation aligned to DB constraints.

---

## Sprint 7 Readiness Verdict

```
READY
```

(Post-preflight; approve `docs/37` before Question schema migrations.)

---

## Validation Snapshot

| Check | Result (Sprint 6.5 baseline) |
|-------|------------------------------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
| Load / penetration testing | Not run in this review |
| Migrations applied in prod | Assumed `001`–`007` per user context |

---

*End of implementation review.*
