# Roadmap Recommendation

**Date**: 2026-06-11
**Scope**: After completing all audits — what to build next, in what order, with what priority.
**Constraint**: Reputation, triggers, leaderboards, pagination, graph performance, and migrations are stable and NOT in scope.

---

## Prioritization Framework

| Rank | Meaning | Criteria |
|------|---------|----------|
| **HIGH** | Must build before any other debate feature | Unblocks everything else; foundational |
| **MEDIUM** | Should build in the current sprint cycle | High impact for effort; enables core philosophy |
| **LOW** | Build after HIGH and MEDIUM are complete | Nice-to-have; depends on earlier work |

---

## Recommended Build Order

| Rank | Project | Effort | User Impact | Tech Risk | Dependencies |
|------|---------|--------|-------------|-----------|--------------|
| **HIGH** | Dedicated debate route | Medium | Very High | Low | None |
| **HIGH** | Debate-native layout | High | Very High | Medium | New route |
| **MEDIUM** | Side switching | Low | High | Low | New route + layout? No — can be done independently |
| **MEDIUM** | Side switching architecture | Low | Medium | Low | Debate participants table exists |
| **MEDIUM** | Consensus system (v1) | Medium | High | Medium | Debate layout |
| **LOW** | Inquiry layer | High | High | Medium | Side switching + debate layout |
| **LOW** | Product philosophy alignment | Low | Medium | None | Consensus system |
| **LOW** | Reputation rebalancing (truth-seeking) | Medium | Medium | Medium | Side switching + inquiry |

---

## HIGH Priority

### 1. Dedicated Debate Route — `/debates/[slug]`

**Effort**: Medium
**Impact**: Very High
**Risk**: Low

#### What

Create a new route `src/app/debates/[slug]/page.tsx` that renders a debate-native page instead of reusing `/discussions/[slug]`.

#### Why

This is the single highest-impact change. Currently, debate rooms share the discussion URL, component, tabs, and layout. A dedicated route:
- Gives debates their own identity
- Allows different tab structures
- Allows a different layout (split-pane, lanes)
- Breaks the coupling between `discussion-room.tsx` and the debate experience
- Unblocks every other debate feature

#### Architecture

```tsx
// src/app/debates/[slug]/page.tsx — NEW
// Server component — reads debate data, renders DebateRoom
// Does NOT reuse DiscussionRoom
```

```tsx
// src/features/debates/components/debate-room.tsx — NEW
// Debate-native room component
// Own tabs: Thread | Claims | Evidence | Inquiries | Sources | Map
// Own layout: split-pane or conversation lanes
// Own components: debate-specific header, scorecard, conclusion
```

#### Files to create

```
src/app/debates/[slug]/page.tsx       (new route)
src/features/debates/components/debate-room.tsx  (new component)
```

#### Files to modify

```
src/features/debates/components/browse-debates.tsx  (update links: /discussions/{slug} → /debates/{slug})
src/features/debates/services/debate-service.ts     (add getDebateBySlug if needed)
src/features/discussions/components/discussion-feed.tsx  (update debate card links → /debates/{slug})
```

#### Risk

Low. Creating a new route does not affect existing discussion rooms. The shared `discussion-room.tsx` remains for actual discussions. All existing links can be updated incrementally.

#### Validation

- `/debates/{slug}` renders a debate room
- `/discussions/{slug}` still renders discussion rooms (unchanged)
- All existing links from browse pages work
- Tabs render correctly in both room types

---

### 2. Debate-Native Layout

**Effort**: High
**Impact**: Very High
**Risk**: Medium

#### What

Design and implement a debate-specific layout. The current layout (motion → cards → claims) is replaced with a layout that communicates challenge, inquiry, and conclusion-building.

#### Layout Recommendation: Option A — Split-Pane Debate

**Chosen from the three options evaluated in PHASE 2**:

| Option | Concept | Desktop | Mobile |
|--------|---------|---------|--------|
| **A — Split-pane** | Support lane (left) + Challenge lane (right) | Side-by-side columns | Tabs or stacked |
| B — Chat-style | Alternating claims by side | Single column with side badges | Same as desktop |
| C — Timeline | Side indicators on timeline | Single column with side indicators | Same as desktop |

#### Option A — Split-Pane Architecture

```
┌────────────────────────────────────────────────┐
│  Motion: "AI is superior to humans"            │
│  [Support: 4] : [Challenge: 5] : [Inquiries: 3]│
├──────────────────────┬─────────────────────────┤
│  SUPPORT             │  CHALLENGE              │
│  (blue)              │  (rose)                 │
│                      │                         │
│  Claim: "AI has      │  Claim: "AI lacks       │
│  99.7% accuracy in   │  understanding"         │
│  radiology"          │  └─ Evidence: Turing    │
│  └─ Evidence:        │    tests show AI        │
│    PubMed 2025       │    cannot generalize    │
│                      │                         │
│  Inquiry: "What is   │  Claim: "AI requires    │
│  the false positive  │  curated data"          │
│  rate?"              │  └─ Evidence: Dataset   │
│  └─ Response: "0.3%" │    bias study 2024      │
│                      │                         │
├──────────────────────┴─────────────────────────┤
│  Current Conclusion (v3)                       │
│  "AI outperforms in narrow tasks but lacks     │
│   general understanding"                       │
└────────────────────────────────────────────────┘
```

#### Mobile Layout for Option A

```
┌─────────────────────────┐   ┌─────────────────────────┐
│  Motion: "AI..."       │   │  Motion: "AI..."        │
│  [Support] [Challenge] │   │  [Support] [Challenge]  │
├─────────────────────────┤   ├─────────────────────────┤
│  SUPPORT (swipe→)      │   │  CHALLENGE (swipe→)     │
│                         │   │                         │
│  Claim: "AI has 99.7%  │   │  Claim: "AI lacks       │
│  accuracy in..."        │   │  understanding"         │
│  └─ Evidence: PubMed   │   │  └─ Evidence: Turing    │
│                         │   │    tests show AI...    │
│  Inquiry: "What is the │   │                         │
│  false positive rate?"  │   │  Claim: "AI requires   │
├─────────────────────────┤   │  curated data"          │
│  Conclusion v3          │   ├─────────────────────────┤
│  "AI outperforms..."    │   │  Conclusion v3          │
└─────────────────────────┘   │  "AI outperforms..."   │
                              └─────────────────────────┘
```

#### Pros and Cons

| Option | Pros | Cons |
|--------|------|------|
| A — Split-pane | Side-by-side comparison; native debate feel; supports inquiry inline; conclusion always visible | More complex layout; mobile needs horizontal swipe; requires new route |
| B — Chat-style | Simple implementation; works on mobile | Feels like a chat, not a debate; loses spatial comparison |
| C — Timeline | Preserves chronological flow; side indicators help | Same as current discussion thread with badges; not distinct enough |

#### Recommendation: Option A (Split-Pane) for Desktop, Swipeable Tabs for Mobile

The split-pane layout:
- Visually communicates "two sides"
- Allows side-by-side comparison of opposing claims
- Embeds inquiry items inline with the claim they target
- Keeps the conclusion visible at the bottom (always accessible)
- Different enough from discussion layout to establish debate identity

#### Implementation Path

```
Phase 1: Create debate room route + layout shell (empty panes)
Phase 2: Wire claims into panes by side
Phase 3: Add inquiry items inline
Phase 4: Add conclusion bar at bottom
Phase 5: Mobile swipe interaction
```

#### Risk

Medium. The split-pane layout requires a complete departure from the `DiscussionRoom` component. The component tree needs to be:
- DebateRoom (new) → DebateHeader + SplitPane + ConclusionBar
- SplitPane → SupportLane + ChallengeLane
- Each lane → ClaimList (filtered by side) + InquiryItems attached to claims

This is a significant refactor of how claims are rendered. The existing `ClaimList` component would need to be adapted or split into a lane-aware version.

---

## MEDIUM Priority

### 3. Side Switching

**Effort**: Low
**Impact**: High
**Risk**: Low

#### What

Add side switching UI to the `DebateSidePicker` component. Create the `debate_side_changes` table and trigger (already designed in `SIDE_SWITCH_ARCHITECTURE.md`). Add system messages.

#### Why

Low effort, high philosophical impact. Side switching is Discora's strongest differentiator from "team debate" platforms. Implementing it early signals the platform's values.

#### Architecture

- Database: `debate_side_changes` table (new migration)
- Trigger: `trg_debate_side_switch` on `debate_participants` (AFTER UPDATE of side)
- UI: "Switch Side" button + confirmation dialog + system message
- Profile: Side switch timeline entries

#### Dependencies

Does NOT require the new debate route. Can be added to the current `DebateSidePicker` component in `discussion-room.tsx`. However, the system message appearance depends on where the message thread is rendered.

#### Effort Breakdown

| Task | Hours |
|------|-------|
| Migration: `debate_side_changes` table | 1 |
| Trigger function + trigger | 1 |
| "Switch Side" button in `DebateSidePicker` | 2 |
| Confirmation dialog | 2 |
| System message component | 2 |
| Profile timeline query | 1 |
| **Total** | **9** |

#### Risk

Low. The stabilization migration (`202606100005`) already prevents duplicate `DEBATE_JOINED` events on side switch. The trigger for recording switch events is additive (no existing behavior changes).

---

### 4. Consensus System (v1)

**Effort**: Medium
**Impact**: High
**Risk**: Medium

#### What

Replace the "winner" resolution system with "current conclusion." Version 1 includes:
- `conclusion` + `conclusion_history` columns on debates
- Proposal interface (creator + any participant)
- Evidence anchoring (attach claims/evidence to conclusion)
- Quorum-based acceptance (configurable percentage)

#### Why

The "winner" model is the most philosophically misaligned feature in the current product. Changing it transforms how users perceive the purpose of debate on Discora.

#### Dependencies

Ideally built after the dedicated debate route (consensus UI appears in the debate layout). Can be built before but will render inside the discussion-room.tsx conditional block.

#### Effort Breakdown

| Task | Hours |
|------|-------|
| Migration: add `conclusion` + `conclusion_history` | 1 |
| Conclusion proposal UI | 4 |
| Evidence anchor picker | 4 |
| Quorum logic | 3 |
| Conclusion display in header | 2 |
| Conclusion version history | 3 |
| Migration of existing resolutions | 1 |
| **Total** | **18** |

#### Risk

Medium. The quorum logic is the riskiest component — edge cases (single-participant debates, abandoned debates, inquiry-only participants) need careful handling. The evidence anchor picker also requires the claim/evidence selection UI to work correctly within the debate context.

---

## LOW Priority

### 5. Inquiry Layer

**Effort**: High
**Impact**: High
**Risk**: Medium

#### What

Implement the full inquiry system as designed in `INQUIRY_LAYER_DESIGN.md`:
- `inquiry_items` and `inquiry_responses` tables
- UI for creating inquiries on claims/evidence
- Inquiries tab in the debate room
- Status management (open → addressed → acknowledged → closed)
- Reputation events for inquiry contributions

#### Why

Inquiry is the highest-impact LOW item because it fundamentally changes how neutral participants engage. It turns "watching" into "contributing."

#### Dependencies

- Requires side switching (inquiry users may eventually switch to support/challenge)
- Benefits from the dedicated debate route (inquiries tab is debate-specific)
- Inquiry items inline in split-pane layout

#### Effort Breakdown

| Task | Hours |
|------|-------|
| Migration: `inquiry_items` + `inquiry_responses` | 2 |
| Inquiry creation UI (claim/evidence attachment) | 6 |
| Inquiry display inline in claim cards | 4 |
| Inquiries tab (list + filters + status) | 4 |
| Inquiry response UI | 3 |
| Status management (acknowledge, close) | 2 |
| Reputation events (INQUIRY_POSTED, etc.) | 2 |
| Moderation integration | 2 |
| **Total** | **25** |

---

### 6. Product Philosophy Alignment

**Effort**: Low
**Impact**: Medium
**Risk**: None

#### What

A series of small UX changes that align terminology and framing with the product philosophy:
- Replace "winner" → "conclusion" across all UI text
- Replace "score" → "evidence quality" in scorecard
- Update "Resolved" banner → "Conclusion" banner
- Update tooltips and instructional text to match philosophy
- Remove gamification elements (leaderboard of wins, "win rate" on profile)

#### Why

Low effort, visible signal of platform values. The current "Profile debate stats" page shows "Debates Won" and "Win Rate" — these directly contradict the philosophy.

#### Dependencies

None.

#### Effort Breakdown

| Task | Hours |
|------|-------|
| Replace winner terminology in debate-header.tsx | 1 |
| Replace scorecard framing in debate-scorecard.tsx | 1 |
| Update profile stats ("Won" → "Supported", "Win Rate" → "Participation") | 2 |
| Update browse page resolution display | 1 |
| Update instructional text | 1 |
| **Total** | **6** |

---

### 7. Reputation Rebalancing (Truth-Seeking)

**Effort**: Medium
**Impact**: Medium
**Risk**: Medium

#### What

Implement the truth-seeking reputation changes designed in `TRUTH_SEEKING_REPUTATION_REVIEW.md`:
- Add `SIDE_SWITCHED` (+15) reputation event
- Add `INQUIRY_POSTED` (+5), `INQUIRY_ANSWERED` (+3), `INQUIRY_ACKNOWLEDGED` (+2)
- Add `EVIDENCE_PROVIDED_FOR_INQUIRY` (+5)
- Remove negative reputation for unpopular opinions (-1 disagree penalty)
- Remove debater loss penalty (-5 DEBATE_LOST)

#### Dependencies

Requires side switching and inquiry to be implemented first (the events they create must exist).

#### Effort Breakdown

| Task | Hours |
|------|-------|
| Add SIDE_SWITCHED trigger | 1 |
| Add inquiry-related triggers | 3 |
| Modify/remove negative event triggers | 1 |
| Update RPC to remove disagree penalty | 1 |
| Update client-side reputation display | 1 |
| Validation | 1 |
| **Total** | **8** |

---

## Summary Table

| # | Project | Rank | Effort | User Impact | Risk | Dependencies |
|---|---------|------|--------|-------------|------|-------------|
| 1 | Dedicated debate route | HIGH | Medium | Very High | Low | None |
| 2 | Debate-native layout | HIGH | High | Very High | Medium | #1 |
| 3 | Side switching | MEDIUM | Low | High | Low | None |
| 4 | Consensus system (v1) | MEDIUM | Medium | High | Medium | #1 (optional) |
| 5 | Inquiry layer | LOW | High | High | Medium | #1, #3 |
| 6 | Philosophy alignment | LOW | Low | Medium | None | None |
| 7 | Reputation rebalancing | LOW | Medium | Medium | Medium | #3, #5 |

---

## Recommended Sprint Plan

### Sprint N (current) — Foundation

| Item | Type | Hours |
|------|------|-------|
| Dedicated debate route | ENGINEERING | 12 |
| Side switching (migration + trigger + table) | ENGINEERING | 2 |
| Side switching UI (button + dialog + system message) | ENGINEERING | 6 |
| Philosophy alignment (terminology pass) | CONTENT | 6 |
| **Total** | | **26** |

**Outcome**: Debates have their own URL and identity. Users can switch sides with audit trail. Terminology matches philosophy.

### Sprint N+1 — Layout + Consensus

| Item | Type | Hours |
|------|------|-------|
| Debate-native layout (split-pane) | ENGINEERING | 24 |
| Consensus system v1 (model + propose + accept) | ENGINEERING | 18 |
| **Total** | | **42** |

**Outcome**: Debates feel fundamentally different from discussions. The conclusion system replaces "winner."

### Sprint N+2 — Inquiry + Reputation

| Item | Type | Hours |
|------|------|-------|
| Inquiry layer | ENGINEERING | 25 |
| Reputation rebalancing | ENGINEERING | 8 |
| Post-implementation audit | QA | 4 |
| **Total** | | **37** |

**Outcome**: Inquiry replaces neutral. Reputation rewards intellectual honesty. The full Discora philosophy is implemented.

---

## Quick Wins (this week)

These items have NO dependencies and can be done immediately:

1. **Remove "Win Rate" from profile page** — contradicts philosophy; takes 10 minutes
2. **Rename "Debates Won" → "Debates Supported (as winner)"** — more accurate; takes 10 minutes
3. **Add "Switch Side" to `DebateSidePicker`** — button + confirmation dialog only; takes 2 hours
4. **Update resolution banner text** — "Resolved: Proposition wins" → "Conclusion reached"; takes 15 minutes
5. **Update scorecard framing** — "Live Scorecard" → "Claim Activity"; takes 15 minutes
