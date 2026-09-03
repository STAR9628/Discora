# Discussion Detail Page — Comprehensive Redesign Proposal

> **Platform:** Discora — Structured Discussion, Debate, and Knowledge-Building Platform
> **Scope:** Discussion Room Page Redesign
> **Status:** Proposal & Design Specification

---

## 1. Core Redesign Principles

1. **Questions Frame Discourse:** The page structure begins with open inquiries and questions, aligning with Discora's core axiom *Questions before Conclusions*.
2. **First-Class Evidence Visibility:** Evidence is no longer hidden behind manual toggles or cramped sidebar widgets. Room evidence is surfaced inline and as a dedicated primary section.
3. **Clarity & De-Cluttered Cards:** Claim cards are streamlined into high-density summary modes, displaying core content, evidence status, and consensus metrics without badge noise.
4. **Unified Mobile-First Navigation:** A sticky, responsive sub-navigation bar (`SectionNav`) enables instant jumping between Questions, Claims, Evidence, and Contributions across mobile and desktop viewports.
5. **Centralized Data Flow:** Replaces duplicate hook invocations with a lightweight `DiscussionDataProvider` context.

---

## 2. Wireframe-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER CONTAINER                                                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [Discussion] [Topic: AI Ethics]                                    │ │
│ │ Title: Evaluating Autonomous Alignment Frameworks                  │ │
│ │ Description: A structured exploration into safety verification...  │ │
│ │ Meta: Started 3d ago · 24 Claims · 12 Evidence · 8 Open Questions  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ OPENING PREMISE (Collapsible, Default: Expanded)                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⏷ Opening Premise                               [Collapse / Expand]│ │
│ │ ┌─ Summary Preview ──────────────────────────────────────────────┐ │ │
│ │ │ AI-generated core summary of the discussion topic...           │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │ Full opening statement text provided by discussion creator...       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ STICKY SECTION NAVIGATION (Scroll-Snapping, Viewport-Aware)            │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [1. Questions (8)]  [2. Claims (24)]  [3. Evidence (12)]  [4. Chat]│ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ SECTION 1: QUESTIONS & INQUIRIES (Primary Section)                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⏷ Open Questions (8)                                  [Ask Question]│ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Information] What empirical bounds exist on LLM alignment?   │ │ │
│ │ │ Asked by @researcher · 4 Claims Answering · 2 Evidence Items   │ │ │
│ │ ├────────────────────────────────────────────────────────────────┤ │ │
│ │ │ [Evidence] Are there peer-reviewed benchmarks for RLHF safety? │ │ │
│ │ │ Asked by @ethicist · 7 Claims Answering · 5 Evidence Items     │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                      │ │
│ │ (When a Question is Selected / Filtered):                            │ │
│ │ ┌── Selected Question Context ──────────────────────────────────┐  │ │
│ │ │ ← Back to All Questions                           [Retract Q] │  │ │
│ │ │ Question: What empirical bounds exist on LLM alignment?       │  │ │
│ │ └── Claims Answering This Question ──────────────────────────────┘  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ SECTION 2: CLAIMS & ASSERTIONS                                         │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⏷ Claims (24)                                        [Assert Claim]│ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Compact Claim Card:                                            │ │ │
│ │ │ [Fact] "Reinforcement learning from human feedback causes..."  │ │ │
│ │ │ Credibility: 82% · 3 Evidence Items · 2 Relationships          │ │ │
│ │ │ [Agree 14] [Disagree 2] [Expand Evidence & Relations ⏷]         │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ SECTION 3: ROOM-WIDE EVIDENCE                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⏷ Evidence Bank (12)                                 [Add Evidence]│ │
│ │ Filters: [All] [Supports] [Contradicts] [Context]                    │ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Supports] Empirical Study: OpenAI Alignment Paper (2024)       │ │ │
│ │ │ "RLHF reduces harmful outputs by 45% in benchmark tests."       │ │ │
│ │ │ Supporting Claim: "Reinforcement learning from human..."       │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ SECTION 4: CONTRIBUTIONS & DISCUSSION                                  │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⏷ General Contributions (15)                         [Post Comment]│ │
│ │ ┌─ Comment Tree ─────────────────────────────────────────────────┐ │ │
│ │ │ @user1: "We need to separate technical safety from ethics."    │ │ │
│ │ │   └─ @user2: "Agreed, see the evidence attached above."        │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Hierarchy (Proposed)

```
DiscussionRoomPage (src/app/discussions/[slug]/page.tsx)
└── DiscussionDataProvider (Provides cached messages, claims, evidence, questions)
    └── DiscussionRoomLayout
        ├── DiscussionHeader (Title, description, topic badge, metadata bar)
        ├── OpeningPremise (Collapsible summary and opening statement)
        ├── SectionNav (Sticky navigation bar for fast section jumping)
        │
        ├── QuestionsSection
        │   ├── QuestionFilterHeader
        │   ├── QuestionList (Grid/List of questions)
        │   └── SelectedQuestionView (Renders question detail + filtered Claims)
        │
        ├── ClaimsSection
        │   ├── ClaimFilterToolbar
        │   ├── ClaimAssertForm (Inline toggle form)
        │   └── ClaimList
        │       └── StreamlinedClaimCard (Compact mode, expand inline for Evidence & Relations)
        │
        ├── EvidenceSection
        │   ├── EvidenceFilterBar (All / Support / Contradict / Context)
        │   ├── EvidenceSubmitForm
        │   └── EvidenceList (Room-wide evidence bank)
        │
        ├── ContributionsSection
        │   ├── CommentTree (Recursive discussion tree)
        │   └── ContributionForm (Floating/sticky compose bar on mobile)
        │
        └── ModalsContainer
            ├── ExtractClaimModal
            ├── ClaimRelationDialog
            ├── ReportDialog
            └── ConfirmDialog
```

---

## 4. Interaction Model

### 4.1 Question-Driven Navigation Flow
1. User enters the discussion detail page and is presented with **Open Questions** immediately beneath the opening premise.
2. Clicking any Question card filters the **Claims Section** to show assertions specifically answering that question, updating the URL query parameter (`?question={id}`).
3. A "← Back to All Questions" button clears the filter and restores full room context.

### 4.2 Progressive Disclosure Claim Cards
- **Default State (Compact):** Shows claim text, claim type badge, credibility score, agree/disagree vote counters, and total attached evidence count.
- **Expanded State:** Clicking the card reveals:
  - Inline list of backing evidence items.
  - Interactive relationship map ("Supports", "Contradicts", "Refines").
  - Author trust signals and revision history trigger.

### 4.3 Room-Wide Evidence Bank
- Evidence items are accessible as a dedicated primary tab/section (`#evidence`).
- Users can filter evidence by direction (`Supports`, `Contradicts`, `Context`) or search by keyword.
- Clicking an evidence item highlights the associated Claim card.

---

## 5. Mobile Behavior & Layout Strategy

| Screen Viewport | Layout Strategy | Navigation Mechanism |
|---|---|---|
| **Desktop ($\ge 1024\text{px}$)** | Full-width single column with clean section blocks and sticky top sub-nav (`SectionNav`). | Sticky top bar + section anchor links. |
| **Tablet ($768\text{px} - 1023\text{px}$)** | Compact single column with auto-collapsed opening premise. | Sticky top bar with swipeable section tabs. |
| **Mobile ($<768\text{px}$)** | Single-column accordion stream. Sections default to collapsible blocks. | Sticky bottom navigation bar + floating action button for quick posting. |

---

## 6. Accessibility Considerations (WCAG 2.1 AA)

- **Semantic Landmarks:** The page uses `<header>`, `<nav>`, `<main>`, `<section>`, and `<article>` tags for clean screen reader navigation.
- **ARAI Tablist Pattern:** `SectionNav` implements `role="tablist"`, `role="tab"`, and `aria-selected` attributes.
- **Color Contrast & Indicators:** Evidence directions (`Supports`, `Contradicts`) utilize distinct iconography (ThumbsUp, ThumbsDown) alongside color tokens, ensuring accessibility for color-blind users.
- **Focus Management:** Modals (`ReportDialog`, `ClaimRelationDialog`) enforce focus trapping and return focus to the triggering element upon closure.
