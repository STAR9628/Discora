# Discora — RLS Security Audit (Sprint 6.5)

Version: 1.1  
Date: 2026-06-03  
Scope: All RLS policies and table/view grants in `supabase/migrations/`  
Status: **Approved fixes applied** in `202606030007_sprint_65_hardening.sql`

---

## Summary

Profiles, messages, claims, evidence, sources, and votes enforce **author-owned writes** where expected. Raw identity columns remain revoked from client SELECT on sensitive tables. **RLS-01, RLS-02, and RLS-04** are resolved. **RLS-03** and operational definer-view risks remain deferred.

---

## Profiles (`public.profiles`)

| Operation | Policy | Verdict |
|-----------|--------|---------|
| SELECT | Public read | ✓ |
| INSERT / UPDATE | Own row only | ✓ |
| DELETE | None | ✓ |

**Status: PASS**

---

## Messages (`public.messages`)

| Operation | Policy | Verdict |
|-----------|--------|---------|
| SELECT | Revoked → `discussion_messages` | ✓ |
| INSERT | Accessible, non-archived room | ✓ **RLS-01 fixed** |
| UPDATE | `user_id = auth.uid()` | ✓ |
| DELETE | None | ✓ |

**Triggers:** 5-minute edit window, immutable columns, `user_id` on INSERT.

**Status: PASS**

---

## Claims (`public.claims`)

| Operation | Policy | Verdict |
|-----------|--------|---------|
| SELECT | Revoked → `discussion_claims` | ✓ |
| INSERT | Accessible, non-archived room | ✓ **RLS-01 fixed** |
| UPDATE | Author retract only | ✓ |
| DELETE | Trigger blocked | ✓ |

**Status: PASS**

---

## Evidence & Sources

| Table | INSERT | UPDATE | SELECT |
|-------|--------|--------|--------|
| `sources` | Room access + non-archived | Creator only | Revoked |
| `evidence` | Room access + non-archived | Creator only | Revoked |
| `claim_evidence` | Claim exists only | Blocked | Revoked |

**Status: PASS** on insert scope for sources/evidence; **WARN** on RLS-03 (`claim_evidence` linker ownership — **deferred**).

---

## Votes (`claim_votes`, `evidence_votes`)

| Operation | Policy | Verdict |
|-----------|--------|---------|
| ALL | `user_id = auth.uid()` + target in accessible room | ✓ **RLS-02 fixed** |
| SELECT | Revoked | ✓ |

**Status: PASS**

---

## Rooms, Topics, Discussions

| Table | Verdict |
|-------|---------|
| `topics` | ✓ |
| `rooms` | ✓ |
| `discussions` | ✓ **RLS-04 fixed** — room-gated SELECT |

---

## Views (SECURITY DEFINER)

| View | Room filter | Redaction |
|------|-------------|-----------|
| `discussion_messages` | ✓ | ✓ |
| `discussion_claims` | ✓ | ✓ |
| `discussion_evidence` | ✓ | ✓ |

**Ongoing risk:** Future view changes must preserve redaction (operational).

---

## Issues — Resolution Status

| ID | Severity | Status | Notes |
|----|----------|--------|-------|
| RLS-01 | Medium | **Resolved** | Insert policies on `messages`, `claims`, `sources`, `evidence` |
| RLS-02 | Medium | **Resolved** | Vote policies join `rooms` with visibility rules |
| RLS-03 | Low | **Deferred** | `claim_evidence` insert still only checks claim exists |
| RLS-04 | High | **Resolved** | `discussions` SELECT gated via `rooms` |
| RLS-05 | Info | — | Immutability by design |

---

## Requirement Checklist

| Requirement | Result |
|-------------|--------|
| Profiles: users edit only themselves | ✓ |
| Messages: users edit only own messages | ✓ |
| Messages: 5-minute edit rule | ✓ (trigger) |
| Claims / evidence / sources: ownership on retract | ✓ |
| Votes: cannot vote for other users | ✓ |
| Votes: scoped to accessible rooms | ✓ (RLS-02) |

---

## Fixes Applied

Migration: `supabase/migrations/202606030007_sprint_65_hardening.sql`

- Replaced `discussions` public SELECT with room-accessible policy
- Hardened INSERT policies on `messages`, `claims`, `sources`, `evidence`
- Hardened `claim_votes` and `evidence_votes` `FOR ALL` policies with room EXISTS checks

---

## Remaining Risks

- **RLS-03:** Arbitrary `claim_evidence` linking if IDs known (same-room enforced by trigger)
- SECURITY DEFINER view regressions in future migrations
- `service_role` bypass (operational/admin only)

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
