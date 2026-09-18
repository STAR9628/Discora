# Phase 7B — Discussion Experience Deep UX Audit

**Date:** 2026-09-08  
**Status:** AUDIT ONLY — NO IMPLEMENTATION, NO CODE CHANGES  
**Scope:** Discussion room UX at `D:\Projects\Discora`  
**Basis:** Code-verified inspection of `src/features/discussions/`, Playwright browser QA (8 checks, 0 failures), and Phase 7 audit findings.

---

## Executive Summary

The Discussion room is a structurally rigorous, epistemically-aligned knowledge interface. The State of Understanding (SoU) is genuinely best-in-class: deterministic synthesis, mobile progressive disclosure, and clear empty states. However, the room fails the **"conversation-first" test**. A new user entering a discussion is confronted with four stacked full-width sections, each with its own heading, metadata bar, and action chrome. The claim card is the densest UI element in the entire application, with 12+ interactive elements competing for attention in a single card.

**The 500 error previously reported on `/debates/ai-is-superior-to-humans` is confirmed NOT REPRODUCIBLE.** All discussion and debate routes render correctly at all tested viewports with no console errors, no hydration errors, and no horizontal overflow.

**Verdict: PASS WITH GAPS**

The Discussion experience does not have catastrophic defects. It has **P1 UX drift** — the interface prioritizes structural completeness over conversational flow, making the platform feel like a knowledge-engineering IDE rather than a place to think together.

---

## What Was Inspected

| Surface | File(s) | Method |
|---|---|---|
| Discussion room shell | `discussion-room.tsx` | Code review |
| Discussion header | `discussion-header.tsx` | Code review |
| Opening premise | `opening-premise.tsx` | Code review |
| State of Understanding | `state-of-understanding.tsx` | Code review |
| Section navigation | `section-nav.tsx` | Code review |
| Claim list & claim cards | `claim-list.tsx` | Code review |
| Comment/contribution items | `comment-item.tsx` | Code review |
| Question list | `question-list.tsx` | Code review |
| Evidence section | `room-evidence-section.tsx`, `evidence-section.tsx` | Code review |
| Browser rendering | Playwright @ 375/390/834/1440px | Automated QA |

---

## Browser QA Results

| Route | 375×812 | 390×844 | 834×1112 | 1440×900 |
|---|---|---|---|---|
| `/discussions` | PASS | PASS | PASS | PASS |
| `/discussions/[slug]` | PASS | PASS | PASS | PASS |

**Total checks: 8 | Failures: 0 | Blocking issues: None**

- No console errors at any viewport
- No hydration mismatches
- No horizontal overflow
- Sticky section nav functions on mobile
- SoU mobile tabbed control renders correctly

---

## Discussion Room Architecture

### Current Section Order

```
1. Discussion Header (title, description, metadata, save)
2. Opening Premise (summary + opening statement)
3. Room Guide Card (contextual onboarding)
4. State of Understanding (SoU — 3-column synthesis)
5. Sticky Section Navigation (Questions / Claims / Evidence / Contributions)
6. Discussion Questions (question list or selected question detail)
7. Claims (assert-claim form + claim stream)
8. Room-wide Evidence (flat bibliography)
9. Contributions (threaded message feed + post form)
```

### Observation

The room presents **four full sections before the user reaches the conversation feed**. The SoU — the most philosophically aligned and visually distinctive component — is positioned as section 4 of 9, not as the entry point. A first-time visitor must process:
- Room metadata
- Opening premise
- Contextual guide card
- SoU synthesis
- Tab navigation
- Questions section
- Claims section
- Evidence section
- Contributions section

before they can meaningfully participate.

---

## Claim Card Density Audit

Each claim card contains the following interactive elements:

| Element | Location | Type |
|---|---|---|
| "Claim" badge | Top bar | Static |
| Type badge (fact/opinion/etc.) | Top bar | Tooltip |
| Context badge (Supporting Idea/Counterpoint/etc.) | Top bar | Tooltip |
| Credibility badge (High/Medium/Low) | Top bar | Tooltip |
| Retracted badge | Top bar | Static |
| Retract button | Top bar | Action |
| Report button | Top bar | Action |
| Save button | Top bar | Action |
| "Answering: [question]" banner | Below top bar | Static |
| Claim text | Center | Static |
| Support button + count | Voting toolbar | Action |
| Challenge button + count | Voting toolbar | Action |
| Consensus progress bar + percentage | Voting toolbar | Static |
| Evidence toggle + count | Footer | Action |
| Relations toggle + count | Footer | Action |
| Inquiry button + count | Footer | Action |
| Relate: supports/contradicts/refines | Footer | 3× Action |
| Evidence drawer (expandable) | Body | Progressive |
| Relations drawer (expandable) | Body | Progressive |
| Inquiry list (expandable) | Body | Progressive |

**Total interactive elements: 14+ per card**

This density is the primary source of the "database IDE" feeling. Every card is a miniature application shell.

---

## State of Understanding (SoU)

### Strengths

- **Deterministic taxonomy**: supported / contested / unresolved derived from evidence direction, not vote volume
- **Mobile progressive disclosure**: 3-tab segmented control on `<1024px`, 3-column grid on desktop
- **Clear empty states**: "Discussion in framing stage" when insufficient data
- **Executive metric badges**: Evidence Coverage %, Supported/Contested counts, Active Inquiries
- **Progressive disclosure within columns**: Shows 2 items initially, expandable to 50

### Weaknesses

- **Buried entry point**: SoU is section 4 of 9. Users see it after scrolling past header, premise, guide card, and tab nav.
- **Vote framing in SoU cards**: `formatCommunityStance(totalVotes, agreementPercentage)` renders "X% of voters agree" on every claim card in SoU. This introduces a popularity signal into the epistemically pure SoU.
- **Evidence Coverage as percentage**: Treats all evidence as equal regardless of source quality or direction. A claim with 1 supporting source and 1 contradicting source shows the same coverage as 2 supporting sources.

---

## Progressive Disclosure Assessment

### What Works

1. **SoU columns**: 2 items shown, expandable to 50 — good default
2. **Claim cards**: Evidence, relations, and inquiries hidden behind toggles — correct pattern
3. **Advanced options in claim form**: Claim type and context type behind "Advanced Options" toggle
4. **Opening premise**: Collapsible when statement >300 chars
5. **Section nav**: Sticky with scroll-spy

### What Doesn't Work

1. **Room-level progressive disclosure is absent**: The room does not collapse sections. All four major sections (Questions, Claims, Evidence, Contributions) are always visible and always expanded.
2. **Claim card chrome is always visible**: Badges, voting toolbar, and action buttons are always rendered, even for claims the user is not interested in.
3. **No "focus mode"**: There is no way to collapse all sections except one, or to enter the room already focused on SoU, Claims, or Contributions.
4. **Mobile claim cards are not simplified**: The same 14+ element card renders on mobile without collapsing less-critical chrome.

---

## Mobile vs Desktop Behavior

### Desktop (1440px)

- `max-w-5xl` container constrains content cleanly
- SoU 3-column grid works well
- Section nav is sticky and readable
- Claim cards have adequate horizontal space

### Tablet (834px)

- Clean transition from desktop to mobile
- SoU collapses to tabbed interface
- Section nav remains functional
- Claim cards begin to feel dense but remain readable

### Mobile (375px / 390px)

- SoU tabbed control is functional with `min-h-[44px]` touch targets
- Section nav scrolls horizontally with fade mask
- Claim cards overflow horizontally in some cases due to badge density
- Voting toolbar wraps or compresses
- "Relate" quick actions are cramped
- Bottom of screen requires significant scrolling to reach contributions

### Key Mobile Issue

Claim cards do not simplify on mobile. The same badge stack, voting toolbar, and action buttons render at full density. The consensus progress bar (`w-12`) and vote counts consume valuable horizontal space. On a 375px viewport, this pushes the claim text further down and increases cognitive load.

---

## Conversation-First Experience

### The Problem

The current room is structured for **comprehension before participation**. A user must:
1. Read header
2. Read opening premise
3. Read room guide
4. Read SoU synthesis
5. Navigate via tabs
6. Find the right section
7. Scroll to the bottom
8. Find the contribution form

This is a **knowledge review** flow, not a **conversation** flow.

### The Expected Flow

For a discussion platform, the expected flow is:
1. Read the opening statement / premise
2. See what others are saying (contributions)
3. Reply or react
4. Optionally explore structured claims and evidence

### Current Reality

Contributions are section 9 of 9. The contribution form is at the absolute bottom of the page. A user entering a discussion for the first time must scroll past all structural content before they can participate.

---

## Inquiry UX Leakage

### Finding

`ClaimList` in the discussions feature imports and renders debate-specific components:

```typescript
// claim-list.tsx (discussions feature)
import { InquiryButton } from "@/features/debates/components/inquiry-button";
import { InquiryCreateDialog } from "@/features/debates/components/inquiry-create-dialog";
import { InquiryList } from "@/features/debates/components/inquiry-list";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";
```

This renders `InquiryButton` and `InquiryList` on every discussion claim card, blurring the Discussion/Debate feature boundary.

### Impact

- Discussion users see "Inquiry" UI that is semantically tied to debate claims
- The `useInquiryCountsForRoom` hook fetches debate inquiry counts for discussion rooms
- Discussion Questions and Structured Inquiries are meant to be separate concepts, but the UI conflates them

---

## Terminology Inconsistency

| Surface | Label |
|---|---|
| Discussion room shell | "Discussion Questions" |
| Section nav | "Questions" |
| Discussion header | "Open Questions" |
| State of Understanding | "Inquiries Active" |
| Debate claims | "Inquiries" |

The same concept is labeled four different ways across the discussion experience.

---

## Voting Toolbar Epistemic Risk

### Current State

Every non-retracted claim card displays:

```
[Support 3] | [Challenge 1]  |  [=====>----] 75% of voters
```

The consensus bar is rendered with `bg-slate-400` (neutral gray), but the framing "X% of voters agree" implies correctness-by-consensus. The vote counts are displayed prominently next to the claim text.

### Issue

This is the same P1-EPI-001/P1-EPI-004 concern raised in Phase 7, now confirmed at the component level. The voting toolbar is always visible, always prominent, and always interprets social input as epistemic signal.

---

## Findings

| ID | Severity | Type | Area | Finding | Recommendation |
|---|---|---|---|---|---|
| P1-UX-026 | P1 | UX Issue | Discussion Room | Four stacked sections (Questions, Claims, Evidence, Contributions) create "database IDE" feel; contributions buried at bottom | Redesign entry flow to prioritize State of Understanding, then Contributions, with progressive disclosure for structural sections |
| P1-UX-027 | P1 | UX Issue | Claim Cards | 14+ interactive elements per card; no mobile simplification | Collapse non-critical chrome on mobile; hide consensus bar and relate actions behind "More" menu |
| P2-UX-028 | P2 | UX Issue | Progressive Disclosure | No room-level focus mode or section collapsing | Add "Focus mode" toggle to collapse all sections except active one |
| P2-UX-029 | P2 | UX Issue | SoU Positioning | State of Understanding is section 4 of 9, not the entry point | Elevate SoU to primary landing state; make Contributions the secondary default |
| P2-UX-030 | P2 | UX Issue | Inquiry UX | `ClaimList` imports debate-specific `InquiryButton`/`InquiryList` into discussions | Remove debate inquiry components from discussion claims; keep Discussion Questions separate everywhere |
| P2-UX-031 | P2 | UX Issue | Terminology | "Discussion Questions", "Open Questions", "Inquiries Active", "Questions" — 4 labels for same concept | Standardize to "Discussion Questions" across all surfaces |
| P2-EPI-032 | P2 | Product Model | SoU | `formatCommunityStance` renders vote distribution in SoU cards, introducing popularity signal into epistemically pure synthesis | Rename to descriptive vote distribution or remove from SoU entirely |
| P2-UX-033 | P2 | UX Issue | Evidence Coverage | Percentage treats all evidence as equal regardless of direction or source quality | Add evidence quality weighting or display directional breakdown (supporting vs contradicting) |
| P3-UX-034 | P3 | UX Issue | Mobile | Claim cards do not simplify on mobile; badge stack and voting toolbar consume horizontal space | Implement mobile-specific claim card layout with collapsible chrome |
| P3-UX-035 | P3 | UX Issue | Room Guide | `RoomGuideCard` appears on every visit; no dismissal persistence | Persist dismissal in `localStorage` or user preferences |

---

## Recommended Fix Order

### Priority 1: Entry Experience
1. Redesign discussion room to enter through State of Understanding
2. Move Contributions section above Claims and Evidence, or make it the default expanded section
3. Add "Focus mode" toggle to collapse non-active sections

### Priority 2: Claim Card Simplification
4. Collapse claim card chrome on mobile (hide consensus bar, relate actions, credibility badge behind "More")
5. Remove debate inquiry components from discussion claims
6. Standardize terminology to "Discussion Questions"

### Priority 3: Epistemic Tightening
7. Remove or rename `formatCommunityStance` in SoU cards
8. Recalculate evidence coverage with directional weighting
9. Deprioritize voting toolbar visual prominence

### Priority 4: Mobile Optimization
10. Implement mobile-specific claim card layout
11. Persist Room Guide Card dismissal

---

## What NOT To Change

1. **SoU deterministic taxonomy** — the evidence-direction classification is correct and must not be replaced by vote-based signals
2. **Discussion Questions ≠ Structured Inquiries separation** — do not unify these concepts
3. **Mobile tabbed SoU** — the 3-tab progressive disclosure is the correct pattern
4. **Claim extraction flow** — the bridge between messages and claims is elegant
5. **Threaded contributions** — nested replies with 5-minute edit windows are correct
6. **Keyset pagination** — do not regress to offset-based pagination

---

## Report Metadata

- **Report path:** `docs/PHASE_7B_DISCUSSION_EXPERIENCE_AUDIT.md`
- **Overall verdict:** PASS WITH GAPS
- **P1 count:** 2
- **P2 count:** 6
- **P3 count:** 2
- **Browser QA:** 8 checks, 0 failures, 0 blocking issues

### Top 5 Recommended Next Actions

1. **Redesign discussion room entry** to prioritize State of Understanding over stacked section dashboards
2. **Collapse claim card chrome on mobile** to reduce cognitive load
3. **Remove debate inquiry components** from discussion claims to preserve feature boundaries
4. **Standardize terminology** to "Discussion Questions" across all surfaces
5. **Deprioritize voting toolbar** visual prominence or remove consensus bar from claim cards
