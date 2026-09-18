# Discora Phase 5C — Onboarding Implementation Plan

## 1. Technical Architecture & File Layout

All onboarding components, hooks, and types will be encapsulated within a modular feature directory:

```
src/features/onboarding/
  ├── components/
  │   ├── discovery-deck-modal.tsx          # The main interactive multi-tab onboarding modal
  │   ├── epistemic-sandbox.tsx             # "What Moves the Needle?" interactive evidence simulation
  │   ├── exploration-interest-selector.tsx # Topic & format exploration preference picker
  │   ├── room-guide-card.tsx               # Contextual dismissible guidance banner for room headers
  │   ├── onboarding-checklist-card.tsx     # First-run guide card for LoggedInHomepage
  │   └── onboarding-trigger-button.tsx     # "How Discora Works" button for sidebar and nav
  ├── hooks/
  │   └── use-onboarding.ts                 # Unified client-side hook and centralized state manager
  ├── types/
  │   └── index.ts                          # Domain types and interface definitions
  └── index.ts                              # Public feature exports
```

---

## 2. Integration Touchpoints & Exposure Hierarchy

1. **`src/components/layout/sidebar.tsx`**:
   - Add "How Discora Works" button under navigation (below "Feedback").
   - Calls `openDeck()` on click.
2. **`src/components/layout/mobile-nav.tsx`**:
   - Add "How Discora Works" entry in mobile menu.
3. **`src/features/homepage/components/guest-homepage.tsx`**:
   - Add a subtle Discovery Deck invitation trigger in the Hero / How It Works section.
4. **`src/features/homepage/components/logged-in-homepage.tsx`**:
   - Replace static `FirstUserBanner` with `OnboardingChecklistCard` for new authenticated users (`isFirstTime`).
5. **`src/features/discussions/components/discussion-room.tsx`**:
   - Include `RoomGuideCard roomType="discussion"` above the State of Understanding overview.
6. **`src/features/debates/components/debate-room.tsx`**:
   - Include `RoomGuideCard roomType="debate"` above the debate header / side selector.

---

## 3. Epistemic Sandbox Design ("What Moves the Needle?")

- **Clear Educational Disclaimer**:
  - Displays: `“Interactive example — not live Discora data”`.
  - Zero simulated users, votes, reputation, room activity, or consensus statistics.
- **Epistemic States**:
  - `limited_support` ("Limited Support")
  - `more_supported` ("More Supported")
  - `mixed_contested` ("Mixed / Contested")
  - `unresolved` ("Unresolved")
  *(No truth meter, popularity score, voting meter, or winner meter).*
- **Interaction Sequence**:
  1. Base claim: *"Grid-scale battery storage can stabilize regional power grids during extended seasonal renewable deficits."*
  2. Toggle Supporting Evidence -> shifts state to *More Supported*.
  3. Toggle Counter-Evidence -> shifts state to *Mixed / Contested*.
  4. Illustrate Structured Inquiry: Shows how evidential tension reveals something to clarify, test, or challenge (*"What alternative battery chemistries avoid critical mineral bottlenecks?"*).

---

## 4. Implementation Steps

1. **Step 1**: Implement `types/index.ts` with centralized `OnboardingState` and epistemic states.
2. **Step 2**: Implement `hooks/use-onboarding.ts` with SSR-safe `localStorage` persistence and fallback.
3. **Step 3**: Implement `components/epistemic-sandbox.tsx` with educational disclaimer and epistemic state indicators.
4. **Step 4**: Implement `components/exploration-interest-selector.tsx` ("Personalize exploration, not belief").
5. **Step 5**: Implement `components/discovery-deck-modal.tsx` with all 4 tabs and keyboard/accessibility support.
6. **Step 6**: Implement `components/room-guide-card.tsx` and `components/onboarding-checklist-card.tsx`.
7. **Step 7**: Implement `components/onboarding-trigger-button.tsx` and export from `index.ts`.
8. **Step 8**: Wire up Sidebar, Mobile Nav, Guest Homepage, Logged-In Homepage, Discussion Room, and Debate Room.
9. **Step 9**: Static validation (`tsc`, `lint`, `build`, `git diff`).
10. **Step 10**: Comprehensive responsive and interactive browser QA via Playwright CLI.
