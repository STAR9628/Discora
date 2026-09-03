# Inquiry Phased Roadmap

**Date**: 2026-06-12
**Status**: Roadmap — no implementation.

---

## Phase Overview

```
MVP (now)       → v1.1 (next sprint) → Beta (Sprint 5) → Post-beta (Sprint 6+)
                   │                      │                   │
Core interaction   Anti-abuse + analytics  Ecosystem           Maturity
```

---

## Phase 0 — MVP

**Goal**: Ship the core interaction loop. Users can ask, answer, and resolve.

### Migration

| # | Change | Risk |
|---|--------|------|
| 1 | Create `inquiry_items` table | None (new table) |
| 2 | Create `inquiry_responses` table | None (new table) |
| 3 | Add `'inquiry'` to `debate_participants` side check | Low (existing `'neutral'` rows compatible) |
| 4 | Create RLS policies | None (no data yet) |

### RPCs

| # | Function | Guardrails |
|---|----------|------------|
| 5 | `create_inquiry` | 5/hr, 50/debate, 20/claim rate limits |
| 6 | `respond_to_inquiry` | Blocks if closed |
| 7 | `satisfy_inquiry` | Inquirer-only |
| 8 | `unsatisfy_inquiry` | Inquirer-only |
| 9 | `close_inquiry` | Inquirer-only |

### Reputation

| # | Event | Points |
|---|-------|--------|
| 10 | INQUIRY_POSTED on create | +2 |
| 11 | INQUIRY_RESPONDED on response | +5 |

### Frontend

| # | Component | Action |
|---|-----------|--------|
| 12 | `InquiryButton` | Add to ClaimCard |
| 13 | `InquiryButton` | Add to EvidenceCard |
| 14 | `InquiryCreateDialog` | Modal with type selector, content, submit |
| 15 | `InquiryList` | Attach below claim/evidence, queries by target |
| 16 | `InquiryItem` | Status badge, inquirer, content, type |
| 17 | `InquiryResponse` | Responder, content, timestamp |
| 18 | Satisfy/Unsatisfy/Close buttons | Inquirer-only on InquiryItem |
| 19 | Respond button + inline textarea | All others on InquiryItem |
| 20 | Inquiry count badge | "🔍 N" on target card header |

### Files

| # | File | Type |
|---|------|------|
| 21 | Migration SQL | New |
| 22 | inquiry-service.ts | New |
| 23 | use-inquiries.ts | New |
| 24 | inquiry-types.ts | New |
| 25 | inquiry-button.tsx | New |
| 26 | inquiry-create-dialog.tsx | New |
| 27 | inquiry-list.tsx | New |
| 28 | inquiry-item.tsx | New |
| 29 | inquiry-response.tsx | New |
| 30 | inquiry-status-badge.tsx | New |
| 31 | claim-card.tsx modification | Modified |
| 32 | evidence-card.tsx modification | Modified |
| 33 | reputation types update | Modified |

**Total**: ~11 new files, ~3 modified files

### Effort Estimate

| Layer | Effort |
|-------|--------|
| Migration + RPCs | 1-2 days |
| Service + hooks | 1 day |
| Frontend components | 2-3 days |
| Integration + testing | 1 day |
| **Total** | **5-7 days** |

### Success Criteria

- User creates inquiry → appears on claim
- User responds → status changes to responded
- Inquirer satisfies → status changes to satisfied
- Inquirer unsatisfies → status re-opens
- Inquirer closes → status changes to closed, no more responses accepted
- Rate limits block at 5/hr, 50/debate, 20/claim
- Reputation events created for POSTED and RESPONDED
- 0 TS errors, 0 lint warnings, production build passes

---

## Phase 1 — v1.1 (Next Sprint)

**Goal**: Anti-abuse hardening + basic analytics + UX polish.

### 1.1 Anti-Abuse

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | Auto-expiry (30d inactivity → `expired`) | Prevents ghost inquiry accumulation |
| 2 | `flag_inquiry_unanswerable` RPC + UI | Gives responders an out for bad-faith questions |
| 3 | Bulk create detection (10+ in 5 min → flag) | Catches dump attacks before they spread |

### 1.2 Analytics

| # | Feature | Rationale |
|---|---------|-----------|
| 4 | `satisfied_at`, `closed_at` timestamps on inquiry_items | Enables time-to-resolution metrics |
| 5 | `evidence_reference_id` on inquiry_responses | Structured evidence linking in answers |

### 1.3 UX Polish

| # | Feature | Rationale |
|---|---------|-----------|
| 6 | INQUIRY_SATISFIED reputation event (+2) | Incentivizes inquirer completion |
| 7 | "Unanswered for 7+ days" visual indicator on open inquiries | Surface stale questions |
| 8 | Inquiry count in debate header | "12 inquiries across 6 claims" — ambient signal |
| 9 | Commit nudges: "You've asked 10 inquiries. Consider taking a position." | Gentle orientation toward commitment |
| 10 | New user onboarding: "Ask a question about any claim" tooltip | Reduce confusion about what inquiry is |

### Effort

~3-4 days (anti-abuse 2d, analytics 1d, UX polish 1-2d)

---

## Phase 2 — Beta (Sprint 5)

**Goal**: Ecosystem integration. Inquiry becomes part of the broader platform narrative.

### 2.1 Reputation Display

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | Profile inquiry breakdown | "312 inquiry points, 48 inquiries, 82% resolution rate" |
| 2 | Inquiry contribution in reputation total | Inquiry points are visible alongside argument points |

### 2.2 Health Metrics

| # | Feature | Rationale |
|---|---------|-----------|
| 3 | `debate_inquiry_health` view | Aggregate inquiry stats per debate |
| 4 | `user_inquiry_pattern` view | Inquirer behavior analysis |
| 5 | "Inquiry resolved ratio" on debate page | Signal of debate quality |

### 2.3 Consensus Integration

| # | Feature | Rationale |
|---|---------|-----------|
| 6 | Open inquiry count displayed during consensus drafting | Informs consensus authors of unresolved questions |
| 7 | "Accepted with X unresolved inquiries" consensus label | Transparent confidence signal |
| 8 | Inquiry → consensus traceability (which inquiries drove which conclusion changes) | Creates narrative of understanding evolution |

### 2.4 Cross-Side Awareness

| # | Feature | Rationale |
|---|---------|-----------|
| 9 | "Cross-side inquiry" visual treatment | Calls out intellectual honesty |
| 10 | "Support participant asked about Support claim" → de-emphasized | Reduces noise from same-side questions |

### Effort

~5-7 days (reputation 1d, health views 1d, consensus 2-3d, cross-side 1-2d)

---

## Phase 3 — Post-Beta (Sprint 6+)

**Goal**: Inquiry as a first-class citizen across the platform.

### 3.1 Argument Map Integration

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | 🔍 annotation nodes on map claims/evidence | Show presence without clutter |
| 2 | 🔍 on relationship edges | "Does this support relationship hold?" |
| 3 | Filter: "Show nodes with unresolved inquiries only" | Focused investigation mode |
| 4 | Heat map: color by inquiry density | Visual weak-point identification |

### 3.2 Dedicated Inquiry Tab

| # | Feature | Rationale |
|---|---------|-----------|
| 5 | Separate "Inquiries" tab in debate room | Makes inquiry a primary navigation item |
| 6 | Sort: unanswered first, by type, by target side | Power user feature for heavy inquirers |
| 7 | "My inquiries" filter | Personal dashboard within the debate |

### 3.3 Relationship Inquiries

| # | Feature | Rationale |
|---|---------|-----------|
| 8 | `target_relationship_id` on inquiry_items | "Does claim A actually support claim B?" |
| 9 | UI: click on map edge → "Ask about this relationship" | Natural entry point from map |

### 3.4 Community Health

| # | Feature | Rationale |
|---|---------|-----------|
| 10 | "Top inquirers" leaderboard (by resolution rate, not volume) | Recognizes quality over quantity |
| 11 | Inquiry-impact score: "X inquiries led to evidence being added" | Measures tangible contribution |
| 12 | Side switch attribution: "This inquiry led to a position change" | Ultimate truth-seeking signal |

### 3.5 Moderation

| # | Feature | Rationale |
|---|---------|-----------|
| 13 | Inquiry reporting through moderation_flags | Standard moderation pipeline for bad-faith questions |
| 14 | Moderator dashboard: inquiry patterns | Surface sea-lioning at aggregate level |

### Effort

~8-12 days across multiple sprints

---

## Timeline Visualization

```
Sprint 4 (now)     Sprint 5            Sprint 6            Sprint 7+
╔═══════════════╗  ╔════════════════╗  ╔════════════════╗  ╔══════════════╗
║    MVP        ║  ║   v1.1        ║  ║   Beta         ║  ║   Post-beta  ║
║               ║  ║               ║  ║                ║  ║              ║
║ Tables        ║  ║ Auto-expiry   ║  ║ Rep display    ║  ║ Map nodes    ║
║ RPCs          ║  ║ Unanswerable  ║  ║ Health views   ║  ║ Inquiry tab  ║
║ Button + list ║  ║ Analytics     ║  ║ Consensus int  ║  ║ Rel inquiry  ║
║ Status badges ║  ║ UX polish     ║  ║ Cross-side     ║  ║ Leaderboard  ║
║ Rep +2/+5     ║  ║ +2 satisfy    ║  ║                ║  ║ Moderation   ║
╚═══════════════╝  ╚════════════════╝  ╚════════════════╝  ╚══════════════╝
```

---

## What Can Wait Until After Beta

Features excluded from MVP and v1.1, pushed to Beta or later:

### Sprint 6+ (Beta)

| Feature | Why It's Not v1 |
|---------|-----------------|
| Reputation display breakdown | Users need to create inquiries first before we display metrics about them |
| Health views (debate_inquiry_health, user_inquiry_pattern) | Need inquiry data to populate views — premature optimization |
| Consensus integration | Consensus system itself is not built yet. Inquiry and consensus should be designed together. |
| Cross-side visual treatment | We need to observe inquiry patterns before deciding what to celebrate |

### Sprint 7+ (Post-Beta)

| Feature | Why It's Not v1 |
|---------|-----------------|
| Argument map integration | Requires map refactor. Separate workstream. |
| Dedicated inquiry tab | Preminent — users haven't asked for it yet. Prove inline works first. |
| Relationship inquiries | Most complex attachment type. Requires argument map relationships to be stable. |
| Leaderboards | Cultural infrastructure. Premature before inquiry culture is established. |
| Moderation pipeline integration | Standard moderation (report dialog) can handle inquiry content for now. Pattern-based moderation is post-beta. |

---

## Risk-Based Prioritization

| Risk | Mitigation Phase | Why This Phase |
|------|-----------------|----------------|
| Sealioning | v1.1 (auto-expiry + unanswerable flag) | Won't know if sea-lioning is a problem until MVP is live. Observe first, mitigate second. |
| Ghost inquiries | v1.1 (auto-expiry) | MVP will surface whether ghosting is common. If rare, push auto-expiry further. |
| Spam/dumping | MVP (rate limits + caps) | Rate limits are cheap insurance. Caps prevent worst case. |
| Consensus paralysis | Beta (consensus integration) | Consensus system isn't built yet. Design both together. |
| Echo chambers | Beta (cross-side awareness) | Need to see actual inquiry distribution before designing interventions. |
| Reputation gaming | MVP (low points) + v1.1 (satisfaction bonus) | Low MVP points limit damage. Satisfaction bonus in v1.1 shifts incentive to quality. |
| Inquirer free-riding | v1.1 (commit nudges) + Post-beta (leaderboards) | Gentle nudges first. Cultural incentives second. Structural enforcement never. |

---

## Decision Record

| Decision | Rationale |
|----------|-----------|
| No `expired` in MVP | Acceptable for inquiries to remain at last state. Auto-expiry is a data quality feature, not a correctness requirement. |
| No `unanswerable` in MVP | Rare edge case. MVP responders can just not respond or say "I can't answer this." |
| No inquiry tab in MVP | Proving the interaction model is more important than information architecture. Inline is simpler, faster, and easier to iterate on. |
| No consensus integration in MVP | Consensus system is not built yet. Inquiry goes first; consensus integrates with it later. |
| No argument map integration in MVP | Separate workstream. Inquiry map annotations are a post-beta differentiator. |
| INQUIRY_POSTED at +2 (not +3) | Lower points reduce spam incentive. Can increase later if inquiry creation is undervalued. |
| INQUIRY_SATISFIED deferred | Let's see if inquirers naturally satisfy before adding reputation incentive. Add only if ghosting is a problem. |
| Side snapshot at creation | Captures historical context. Doesn't change if user switches sides later — that's intentional. |
| Anyone can respond (not just claim author) | Prevents single-point bottleneck. Maximizes chance of inquiry getting answered. |
