# Inquiry MVP Scope

**Date**: 2026-06-12
**Status**: Scope definition — no implementation.

---

## 1. Minimum Viable Inquiry

The smallest set of capabilities that delivers the core value proposition:

> **"I can ask a question about a claim or evidence, and get an answer."**

Everything else — analytics, cross-side celebration, auto-expiry, reputation breakdowns — is additive. The MVP proves the interaction model works before investing in the ecosystem around it.

---

## 2. Core Capabilities (MVP)

### 2.1 Create Inquiry

| Aspect | Decision |
|--------|----------|
| Target | Claim or evidence (one required, exclusive) |
| Types | clarification, evidence_request, assumption_check |
| Content | 10-2000 characters |
| Side snapshot | Automatically captured from debate_participants at creation |
| Rate limits | 5/hr per user, 50/debate per user, 20/claim total |
| Status | Starts at `open` |

### 2.2 Respond to Inquiry

| Aspect | Decision |
|--------|----------|
| Who | Any authenticated room participant |
| Content | 10-5000 characters |
| Effect | Status → `responded` (if was `open` or `unsatisfied`) |
| History | All responses preserved, ordered by creation time |

### 2.3 Satisfy Inquiry

| Aspect | Decision |
|--------|----------|
| Who | Only the inquirer |
| Effect | Status → `satisfied` |
| Condition | Must be in `responded` state |

### 2.4 Unsatisfy Inquiry

| Aspect | Decision |
|--------|----------|
| Who | Only the inquirer |
| Effect | Status → `unsatisfied` (re-opened for responses) |
| Condition | Must be in `responded` state |

### 2.5 Close Inquiry

| Aspect | Decision |
|--------|----------|
| Who | Only the inquirer |
| Effect | Status → `closed`. Final state — no further responses. |
| Condition | Any non-terminal state |

### 2.6 Visibility

| Aspect | Decision |
|--------|----------|
| Who can see | All room participants (same RLS as room) |
| Where shown | Inline below the target claim or evidence |
| Order | Open first, then responded, then satisfied/closed |
| Status indicator | Badge on each inquiry: `OPEN`, `RESPONDED`, `SATISFIED`, `UNSATISFIED`, `CLOSED` |
| Inquiry count | "N inquiries" badge on the claim/evidence card |

---

## 3. Reputation Scope (MVP)

| Event | Points | In MVP? | Why |
|-------|--------|---------|-----|
| INQUIRY_POSTED | +2 | Yes | Token reward for asking. Low enough to not incentivize spam. |
| INQUIRY_RESPONDED | +5 | Yes | Responding is harder and more valuable than asking. |
| INQUIRY_SATISFIED | +2 | No | Observe behavior first. Add incentive in v1.1 if ghosting is a problem. |
| INQUIRY_CLOSED | 0 | No | No reward needed — this is "I'm done." |
| INQUIRY_UNSATISFIED | 0 | No | No penalty. |

**Total reputation range per completed inquiry loop**: +7 (asker gets +2, responder gets +5). Asker bonus for satisfaction (+2) deferred to v1.1.

---

## 4. Frontend Scope (MVP)

### Required

| Component | Purpose |
|-----------|---------|
| Inquiry button on ClaimCard | "Ask a question" — visible to all authenticated users |
| Inquiry button on EvidenceCard | Same |
| InquiryCreateDialog | Modal: target pre-filled, type selector, content textarea |
| Collapsible inquiry list below claim/evidence | Shows inquiries for this target |
| InquiryItem | Single inquiry row: status badge, inquirer name, type label, content |
| InquiryResponse | Single response: responder name, content, timestamp |
| Satisfy/Unsatisfy/Close buttons | For inquirer only |
| Respond button + inline textarea | For all other participants |
| Inquiry count badge | "🔍 3" on the target card |

### Not Required (MVP)

| Component | Status | When |
|-----------|--------|------|
| Dedicated "Inquiries" tab | Not in MVP | Post-beta |
| Inquiry filter/sort controls | Not in MVP | v1.1 (if users ask) |
| Inquiry status timeline | Not in MVP | Post-beta |
| Cross-side analysis display | Not in MVP | Post-beta |
| Inquiry health dashboard | Not in MVP | Post-beta |

---

## 5. Data Model Scope (MVP)

### Tables

| Table | In MVP? | Columns |
|-------|---------|---------|
| `inquiry_items` | Yes | id, room_id, created_by, inquirer_side, inquiry_type, content, target_claim_id, target_evidence_id, status, created_at, updated_at |
| `inquiry_responses` | Yes | id, inquiry_item_id, created_by, content, created_at |

### Columns Explicitly NOT in MVP

| Table | Column | When |
|-------|--------|------|
| `inquiry_items` | flagged_as_unanswerable | v1.1 |
| `inquiry_items` | flagger_id | v1.1 |
| `inquiry_items` | flag_reason | v1.1 |
| `inquiry_items` | satisfied_at | v1.1 (analytics) |
| `inquiry_items` | closed_at | v1.1 (analytics) |
| `inquiry_responses` | evidence_reference_id | v1.1 |
| `inquiry_responses` | updated_at | v1.1 |

### Status Values in MVP

```
open → responded → satisfied
                  → unsatisfied → responded → ...
                  → closed
```

`expired` is NOT in MVP. It will be added when auto-expiry is implemented.

### Views NOT in MVP

| View | When |
|------|------|
| `debate_inquiry_health` | Post-beta |
| `user_inquiry_pattern` | Post-beta |

In MVP, the application layer queries `inquiry_items` and `inquiry_responses` directly.

---

## 6. Backend Scope (MVP)

### RPCs

| RPC | In MVP? | Notes |
|-----|---------|-------|
| `create_inquiry` | Yes | With rate limits |
| `respond_to_inquiry` | Yes | Status transitions |
| `satisfy_inquiry` | Yes | Creator-only |
| `unsatisfy_inquiry` | Yes | Creator-only |
| `close_inquiry` | Yes | Creator-only |

### RPCs NOT in MVP

| RPC | When |
|-----|------|
| `flag_inquiry_unanswerable` | v1.1 |
| `expire_inquiries` (cron) | v1.1 |
| `batch_expire_inquiries` (cron) | v1.1 |

---

## 7. Service Layer Scope (MVP)

### Functions in inquiry-service.ts

| Function | In MVP? |
|----------|---------|
| `createInquiry()` | Yes |
| `respondToInquiry()` | Yes |
| `satisfyInquiry()` | Yes |
| `unsatisfyInquiry()` | Yes |
| `closeInquiry()` | Yes |
| `getInquiriesForTarget()` | Yes |

### Functions NOT in MVP

| Function | When |
|----------|------|
| `getDebateInquiryHealth()` | Post-beta |
| `getUserInquiryPattern()` | Post-beta |
| `flagInquiryUnanswerable()` | v1.1 |

---

## 8. Hook Scope (MVP)

### Hooks in use-inquiries.ts

| Hook | In MVP? |
|------|---------|
| `useCreateInquiry()` | Yes |
| `useRespondToInquiry()` | Yes |
| `useSatisfyInquiry()` | Yes |
| `useUnsatisfyInquiry()` | Yes |
| `useCloseInquiry()` | Yes |
| `useInquiriesForTarget()` | Yes |

### Hooks NOT in MVP

| Hook | When |
|------|------|
| `useDebateInquiryHealth()` | Post-beta |
| `useUserInquiryPattern()` | Post-beta |

---

## 9. Type Scope (MVP)

### Types in inquiry-types.ts

| Type | In MVP? |
|------|---------|
| `InquiryItem` | Yes |
| `InquiryResponse` | Yes |
| `InquiryType` | Yes ('clarification', 'evidence_request', 'assumption_check') |
| `InquiryStatus` | Yes ('open', 'responded', 'satisfied', 'unsatisfied', 'closed') |

### Types NOT in MVP

| Type | When |
|------|------|
| `DebateInquiryHealth` | Post-beta |
| `UserInquiryPattern` | Post-beta |

---

## 10. Scope Summary

| Layer | MVP | v1.1 | Post-beta |
|-------|-----|------|-----------|
| Tables | inquiry_items, inquiry_responses | — | Health views |
| Columns | Core fields | Flags, timestamps, evidence_ref | — |
| RPCs | CRUD (create, respond, satisfy, unsatisfy, close) | flag_unanswerable, cron expiration | — |
| Hooks | CRUD hooks + get for target | — | Health/pattern hooks |
| UI | Button, dialog, inline list, status badges | Unanswerable flag UI | Tab, filter, cross-side views |
| Reputation | +2 create, +5 respond | +2 satisfy | Display breakdown |
| Consensus | None | Inquiry count on consensus | Inquiry → consensus traceability |
| Argument maps | None | None | Annotation nodes on map |
| Abuse mitigations | Rate limits + caps | Unanswerable flag, auto-expiry | Pattern metrics |
