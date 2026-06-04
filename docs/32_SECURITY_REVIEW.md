# Discora — Security Review

Version: 1.0  
Date: 2026-06-03  
Scope: Database policies, views, triggers, `src/features/discussions`, `src/services/supabase`  
Status: Post–Sprint 6.5 read-only audit

---

## Security Posture Summary

Anonymous **read** protection is architecturally sound: security definer views redact identity before data reaches PostgREST clients, and raw identity columns are not SELECTable by `anon`/`authenticated`. Sprint 6.5 fixed **mutation RETURNING leaks** and tightened **room-scoped RLS** for discussions, inserts, and votes. Remaining issues are **authorization consistency** (junction linking, inactive rooms, retracted votes), **application-layer source lookup** against revoked SELECT, and **author-only UX** gaps that do not expose identity to third parties.

---

## Anonymous Author Protection

### Read path — PASS

| Control | Location | Status |
|---------|----------|--------|
| View redaction | `discussion_messages`, `discussion_claims`, `discussion_evidence` (`003`, `006`) | ✓ `CASE` on `identity_mode = 'anonymous'` |
| Raw table exposure | `revoke select` on messages, claims, evidence, sources, votes (`003`–`006`) | ✓ |
| Profile join inside views | Uses real `created_by`/`user_id` internally; output redacted | ✓ |

### Mutation path — PASS (post–6.5)

| Control | Location | Status |
|---------|----------|--------|
| Message insert/update return | `postMessage`, `updateMessage` — `.select("id")` only | ✓ |
| Claim insert/retract return | `createClaim`, `retractClaim` — `.select("id")` only | ✓ |
| Evidence/source insert return | `createEvidence` — `.select("id")` on inserts | ✓ |

### Attack paths that do **not** reveal anonymous authors to other users

- Querying `discussion_*` views as another participant  
- Listing claims/messages in UI (uses view-backed services)  
- Public profile correlation from anonymous posts in feed (username is `"Anonymous"`, `userId` null)

### Attack paths that **could** reveal identity (operational / edge)

| ID | Severity | Path | Evidence |
|----|----------|------|----------|
| SEC-OP-01 | **Critical** (operational) | `service_role` or DB superuser reads `messages.user_id` / `claims.created_by` | Bypasses RLS and REVOKE for service role in Supabase |
| SEC-UX-01 | **Medium** | Author cannot retract/edit anonymous content in UI | `claim-list.tsx` `createdBy === user?.id`; `discussion-room.tsx` `message.userId !== currentUserId` — **does not leak to others** |
| SEC-LEAK-01 | **Resolved** | Network inspection of mutation JSON with `user_id` | Fixed in 6.5 |

---

## Identity Redaction Guarantees

| Layer | Guarantee | Gap |
|-------|-----------|-----|
| Database views | Strong for SELECT via API | Definer view must stay audited on schema changes |
| RLS on raw tables | No client SELECT | INSERT RETURNING limited to `id` in app |
| Application mappers | `mapDiscussion*Row` pass-through only | `mapMessageRow` / `mapClaimRow` unused (dead code) — no active leak |
| Components | Display `"Anonymous"` when `identityMode === 'anonymous'` | None for third-party readers |

---

## Raw Table Exposure

| Table | anon/authenticated SELECT | Client usage |
|-------|---------------------------|--------------|
| `messages` | Revoked | Insert/update only |
| `claims` | Revoked | Insert/update retract |
| `sources` | Revoked | Insert + **SELECT dedup (problem)** |
| `evidence` | Revoked | Insert |
| `claim_evidence` | Revoked | Insert |
| `claim_votes` / `evidence_votes` | Revoked | INSERT/UPSERT/DELETE |
| `profiles` | Allowed | Public by design |
| `rooms`, `topics`, `discussions` | RLS filtered | Feed/room pages |

---

## Supabase Policy Correctness (post–007)

| Area | Status | Notes |
|------|--------|-------|
| Profiles own-row update | ✓ | `001` |
| Discussions SELECT | ✓ | Room-gated (`007`) |
| Message/claim/source/evidence INSERT | ✓ | Accessible + non-archived (`007`) |
| Vote ALL | ✓ | Own user + accessible room (`007`) |
| `claim_evidence` INSERT | ⚠ | **SEC-DB-01 High** — claim existence only |
| Message UPDATE | ⚠ | Owner only; no archived-room check — **Low** |
| Private rooms | ✓ | Creator read via `rooms` + views OR branch |

---

## SECURITY DEFINER Safety

| View | Risk | Mitigation in place |
|------|------|---------------------|
| `discussion_messages` | Over-broad column grant if view altered | Explicit column list; room `EXISTS` filter |
| `discussion_claims` | Vote subquery scans all votes | Aggregates only; no per-voter exposure |
| `discussion_evidence` | Join multiplicity | No extra identity columns |

**Rule:** Any new column on base tables must not be added to views without redaction review.

**Privilege escalation via definer:** Views cannot be written to by clients; writes go to base tables under RLS. Acceptable.

---

## Access Control Consistency

| Operation | Room visibility | Status filter | Retracted parent |
|-----------|-----------------|---------------|------------------|
| Read messages (view) | ✓ | Archived hidden from public | N/A |
| Insert message | ✓ | Not archived | N/A |
| Insert claim | ✓ | Not archived | N/A |
| Vote claim | ✓ | Not archived | **Not checked** — SEC-DB-02 Medium |
| Link claim_evidence | Partial (room trigger) | **Policy weak** — SEC-DB-01 High |
| Edit message | Owner only | **Not checked** — Low |

---

## Vote Manipulation

| Vector | Severity | Assessment |
|--------|----------|------------|
| Cast vote as another user | — | Blocked (RLS + trigger on insert) |
| Vote without room access | — | Mitigated (`007`) |
| Vote on retracted claim/evidence | Medium | Allowed today |
| Upsert changing `user_id` | Low | RLS `with check (user_id = auth.uid())` |
| Inflate counts via deleted users | Low | `ON DELETE CASCADE` on votes |

---

## Replay / Spam

| Vector | Severity | Assessment |
|--------|----------|------------|
| Unlimited messages/votes/claims | Medium (future) | No rate limits DB or API |
| Automated feed pagination scraping | Low | Public read by design |
| Guest posting | — | UI gated `{user && ...}`; RLS requires `authenticated` |

---

## Client-Side Trust Assumptions

| Assumption | Safe? |
|------------|-------|
| UI hides composer for guests | Yes; server enforces auth on writes |
| `currentUserId` for edit UI | Weak for anonymous author; server still enforces ownership on UPDATE |
| Consensus displayed from view | Yes; not client-computed |
| Cursor string in feed | Parsed server-side in Supabase filter; malformed cursor ignored |

**Do not** add client-only anonymity; keep redaction on views/RPC.

---

## Middleware / Auth Surface

| Path | Protection |
|------|------------|
| `/discussions/create` | `middleware.ts` + `updateSupabaseSession` redirect |
| `/discussions/[slug]` | Public read; write via Supabase session |
| `/settings/*` | Protected |

Room participation is **not** middleware-protected; relies on Supabase RLS — correct pattern.

---

## Recommended Security Fixes (ordered)

1. **High:** Fix `sources` dedup without broad SELECT (`DB-FUNC-01`).  
2. **High:** Harden `claim_evidence` INSERT policy (`DB-SEC-01`).  
3. **Medium:** Block votes on retracted parents.  
4. **Medium:** Align `inactive` room policy with product.  
5. **Medium:** Author capability flags in views (Sprint 7+ / separate UX sprint) without exposing `user_id`.

---

## Deferred (explicitly out of scope)

- Admin deanonymization tooling  
- Moderation roles  
- Rate limiting / CAPTCHA  
- Realtime sanitized `message_events` (Sprint 4 doc; not implemented)
