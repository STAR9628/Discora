# Debate Detail Page Redesign Specification (`/debates/[slug]`)

**Date**: September 2, 2026
**Status**: Proposal / Product Specification
**Target Route**: `/debates/[slug]`

---

## 1. Redesign Vision & Principles

The goal of the Debate Detail Page redesign is to transform `/debates/[slug]` from a "Discussion Page with a Debate Header" into a **Dedicated Two-Sided Truth-Seeking Interface**.

### Core Philosophy Alignment
1. **Understanding Over Engagement**: The page must make both positions immediately clear before inviting user participation.
2. **Side-by-Side Balance**: Neither side should visually dominate based on volume alone.
3. **Structured Disagreement**: Claims, evidence, and inquiries must take precedence over unstructured linear chat.
4. **Transparent Evolution**: Side switching and resolution must be auditable and visually prominent.

---

## 2. Recommended Information Hierarchy

```text
1. Debate Header Banner
   ├── Motion Title & Topic Badge
   ├── Debate Status Badge (Active / Resolved) & Resolution Banner (if resolved)
   └── Two Position Stance Cards (Proposition vs Opposition) Side-by-Side

2. Motion Premise & Context
   └── Opening Statement (Collapsible / Expandable for long text)

3. User Participation Bar
   ├── User Current Stance Indicator (Support / Challenge / Neutral / Observer)
   └── "Switch Side" CTA (Opens rationale modal with 50-char minimum check)

4. Sticky Debate Section Navigation
   └── [ Overview | Arguments | Evidence | Inquiries | Contributions ]

5. Content Sections (Driven by Sticky Nav / Tab State)
   ├── Section A: Overview & Position Summary (Scorecard + Side Stats)
   ├── Section B: Two-Column Argument Map (Proposition Claims vs Opposition Claims)
   ├── Section C: Evidence Matrix (Supporting & Contradicting Evidence by Side)
   ├── Section D: Open Inquiries & Questions (Clarification & Evidence Requests)
   └── Section E: Unstructured Contributions & Timeline
```

---

## 3. Dedicated Component Architecture Plan

To achieve clean separation of concerns and maintain TypeScript strict mode without bloated components, the following modular component architecture is proposed:

### 3.1 New Components To Create
1. **`debate-data-provider.tsx`**:
   - **Role**: React Context provider for debate data, active user stance, claim side maps, and inquiry state.
   - **Owns**: Hydration of `DebateRoomData`, active tab state, and realtime cache updates.
   - **Does NOT own**: Presentation styling or form handling.

2. **`debate-header-v2.tsx`**:
   - **Role**: Compact, high-impact header replacing the current multi-card stack.
   - **Owns**: Motion title, topic tag, status badge, and side-by-side stance boxes.

3. **`debate-premise.tsx`**:
   - **Role**: Opening statement presentation.
   - **Owns**: Truncation/expansion of long opening statements and author identity mode display.

4. **`debate-argument-list.tsx`**:
   - **Role**: Replaces generic `ClaimList` for debate rooms.
   - **Owns**: Rendering 2-column proposition vs opposition claim cards side-by-side on desktop, and clean responsive toggle on mobile. Adds side-aware "Assert Claim for Proposition/Opposition" buttons.

5. **`debate-inquiries-tab.tsx`**:
   - **Role**: Dedicated UI for structured inquiries (`clarification`, `evidence_request`, `assumption_check`).
   - **Owns**: Listing open inquiries targeting claims, response thread creation, and satisfaction marking.

6. **`debate-side-picker-modal.tsx`**:
   - **Role**: Modal for switching sides or joining a debate.
   - **Owns**: 50-character mandatory rationale text field, 24-hour cooldown warnings, and submission handling via `switchDebateSide`.

7. **`debate-section-nav.tsx`**:
   - **Role**: Sticky section navigation bar.
   - **Owns**: Smooth scrolling / tab switching between Overview, Arguments, Evidence, Inquiries, and Contributions.

### 3.2 Components To Reuse / Simplify
- **`debate-scorecard.tsx`**: Keep logic for consensus ratio and net agreement display.
- **`debate-resolution.tsx`**: Keep resolution panel for debate creators and resolution outcome banner.
- **`position-history.tsx`**: Reuse for side-switch audit timeline.
- **`room-evidence-tab.tsx`**: Reuse for evidence matrix filtering.

---

## 4. Progressive Disclosure & UX Controls

1. **Immediate Visibility (0-5 seconds)**:
   - Motion Title
   - Proposition Stance vs Opposition Stance
   - Active User Stance & Join/Switch CTA
   - Two-Column Argument Map (Top claims for each side)
2. **Progressive Disclosure (On Interaction)**:
   - Full Opening Statement (Click "Read full premise")
   - Side Switch History (Click "View side history")
   - Claim Evidence Drawers (Click on claim to expand evidence)
   - Inquiries & Clarifications (Click "View open inquiries")

---

## 5. Mobile & Desktop Responsive Design

- **Desktop (1024px +)**:
  - Increase container max-width from `max-w-4xl` (896px) to `max-w-6xl` (1152px) for debate rooms.
  - Render Proposition Claims and Opposition Claims in true side-by-side parallel columns.
- **Mobile (375px - 768px)**:
  - Stack Proposition and Opposition stance cards vertically in the header.
  - Provide a sticky segment control at the top of the Arguments section to switch between `[ Proposition (N) ]` and `[ Opposition (N) ]`.
  - Floating Action Button (FAB) for "Assert Claim for [My Side]".
