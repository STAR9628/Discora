# Debate Detail Page Implementation Plan (`/debates/[slug]`)

**Date**: September 2, 2026
**Status**: Execution Plan — Phased Implementation
**Target Route**: `/debates/[slug]`

---

## Phased Implementation Schedule

### Phase 1 — Data Provider & Architecture Setup
- **Goal**: Establish clean data context and avoid prop drilling in `<DebateRoom>`.
- **Files to create/modify**:
  - `[NEW]` [`src/features/debates/components/debate-data-provider.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-data-provider.tsx)
  - `[MODIFY]` [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx)
- **Validation**: Dev server loads without context errors.

### Phase 2 — Header & Premise Streamlining
- **Goal**: Replace 6-card vertical stack with a unified header and expandable premise card.
- **Files to create/modify**:
  - `[NEW]` [`src/features/debates/components/debate-header-v2.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-header-v2.tsx)
  - `[NEW]` [`src/features/debates/components/debate-premise.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-premise.tsx)
  - `[MODIFY]` [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx)
- **Validation**: Header height reduced by 50%; positions immediately visible.

### Phase 3 — Dedicated Two-Column Argument Map
- **Goal**: Implement custom side-by-side claim listing with side-aware claim creation CTAs.
- **Files to create/modify**:
  - `[NEW]` [`src/features/debates/components/debate-argument-list.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-argument-list.tsx)
  - `[MODIFY]` [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx)
- **Validation**: Proposition and Opposition claims display cleanly in 2 columns on desktop and segmented tabs on mobile.

### Phase 4 — Side Switching & Mandatory Rationale Modal
- **Goal**: Polish side-switching UX with 50-character mandatory rationale and immutable history display.
- **Files to create/modify**:
  - `[NEW]` [`src/features/debates/components/debate-side-picker-modal.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-side-picker-modal.tsx)
  - `[MODIFY]` [`src/features/debates/components/position-history.tsx`](file:///d:/Projects/Discora/src/features/debates/components/position-history.tsx)
- **Validation**: RPC `switch_debate_side` succeeds with valid reason and logs system message.

### Phase 5 — Structured Inquiries Tab
- **Goal**: Render inquiry items (`clarification`, `evidence_request`, `assumption_check`) and response workflows.
- **Files to create/modify**:
  - `[NEW]` [`src/features/debates/components/debate-inquiries-tab.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-inquiries-tab.tsx)
- **Validation**: Creating and marking inquiries satisfied works cleanly.

### Phase 6 — Resolution Presentation & Outcome State
- **Goal**: Polish resolved debate state display.
- **Files to create/modify**:
  - `[MODIFY]` [`src/features/debates/components/debate-resolution.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-resolution.tsx)
- **Validation**: Resolved debate `ai-vs-human` displays clear winner banner.

### Phase 7 — Responsive & Accessibility Optimization
- **Goal**: Ensure 375px, 390px, 768px, 1024px, 1440px viewport compliance and ARIA accessibility.
- **Validation**: No horizontal overflow, clean touch targets, keyboard navigation passes.

### Phase 8 — Real Data QA & Verification
- **Goal**: Verify against existing production records (`ai-vs-human` and `ai-is-superior-to-humans`).
- **Validation**: Page renders without missing chunks, console runtime errors, or network errors.

### Phase 9 — Build & Lint Sign-off
- **Goal**: Ensure clean production build.
- **Commands**:
  - `npm run lint`
  - `npm run build`
- **Validation**: 0 ESLint errors, 0 build errors.
