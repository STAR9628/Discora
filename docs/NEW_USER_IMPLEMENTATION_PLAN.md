# Discora — First-Time UX Implementation Plan (`NEW_USER_IMPLEMENTATION_PLAN.md`)

---

## 1. Plan Overview & Execution Gates

This plan outlines the 5 execution phases required to implement the first-time user experience improvements identified in `NEW_USER_JOURNEY_AUDIT.md`.

### Strict Implementation Rules:
- **No Database Migrations**: 0 schema changes, 0 database RPC modifications.
- **No Backend Architecture Changes**: All service calls (`discussion-service.ts`, `debate-service.ts`, `inquiry-service.ts`) remain unchanged.
- **Strict Verification Gate**: Each phase must pass `npm run lint` and `npm run build` with **0 errors** before progressing.

---

## 2. Phased Implementation Roadmap

### Phase 1 — First-Time Comprehension & Room Header Hierarchy
- **Goal**: Re-structure Discussion and Debate room headers so that room title and premise/motion take primary focus in the first viewport.
- **Files Involved**:
  - [`src/features/discussions/components/discussion-room.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/discussion-room.tsx)
  - `src/features/debates/components/debate-header-v2.tsx`
- **Expected Behavior**:
  - Room Title (h1) and Premise statement rendered prominently at top of content area.
  - Secondary metadata (topic, counts) displayed in a single compact toolbar line.
  - Author trust scores and room ID details collapsed into an optional "Room Info" toggle.
- **Acceptance Criteria**:
  - Core room topic readable within 3 seconds on landing.
  - Room claims visible above the fold on 1440px desktop viewports.
- **Regression Risks**: Navigation tabs or stance pickers becoming detached from room context.
- **Browser QA Requirements**: Test landing on `/discussions/should-ai-generated-content-be-clearly-labeled-online` and `/debates/ai-is-superior-to-humans` across 375px, 768px, and 1440px.

---

### Phase 2 — Write-First Contribution Flow
- **Goal**: Transform the claim creation flow from a 4-step taxonomy modal into a single text input with smart defaults and optional advanced settings.
- **Files Involved**:
  - [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx)
  - `src/features/discussions/components/claim-form.tsx`
- **Expected Behavior**:
  - Clicking "Share a Claim" opens a clean modal with a single primary text input.
  - Default `claimType` set to `"opinion"` and `contextType` set to `"supporting_idea"`.
  - Advanced options (manual type pickers and anonymity toggle) collapsed under "Advanced Options".
- **Acceptance Criteria**:
  - Time-to-first-contribution under 10 seconds.
  - Submitting a claim invokes `createClaim` RPC with valid defaults cleanly.
- **Regression Risks**: Claims submitted without explicit type pre-selection failing backend validation (Mitigated: valid defaults provided).
- **Browser QA Requirements**: Test submitting a claim as authenticated user `@qatester012` and verify claim appears in claim list.

---

### Phase 3 — Terminology & Progressive Disclosure
- **Goal**: Eliminate confusion between Questions and Inquiries by consolidating room tabs into 3 primary tabs and clarifying inquiry sub-sections.
- **Files Involved**:
  - [`src/features/discussions/components/discussion-room.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/discussion-room.tsx)
  - `src/features/inquiries/components/inquiry-list.tsx`
- **Expected Behavior**:
  - Room tabs consolidated to `Overview & Claims`, `Evidence Wall`, and `Questions & Inquiries`.
  - Inside `Questions & Inquiries`, general questions and claim-targeted inquiries rendered under explicit sub-headers with 1-sentence explanations.
- **Acceptance Criteria**:
  - 0 visual confusion between general queries and targeted claim challenges.
  - All existing inquiries (`9488598a...`) render cleanly under the targeted sub-section.
- **Regression Risks**: Inquiry response forms or resolution actions breaking due to tab wrapper changes.
- **Browser QA Requirements**: Test opening satisfied inquiry `9488598a-356f-4923-8baf-5905749ef09f` and verifying response thread visibility.

---

### Phase 4 — Mobile Refinement & Cold-Start Prompts
- **Goal**: Add a segmented stance toggle for mobile debate viewing (375px/390px) and replace generic empty states with active prompts.
- **Files Involved**:
  - `src/features/debates/components/debate-room.tsx`
  - `src/features/discussions/components/claim-list.tsx`
- **Expected Behavior**:
  - Mobile debate view renders `[ Proposition | Opposition | Both ]` segmented toggle bar.
  - Empty rooms render *"Be the first to share a core claim or ask a clarifying question..."* prompt.
- **Acceptance Criteria**:
  - Mobile users can toggle between Proposition and Opposition arguments without excessive vertical scrolling.
  - Empty rooms offer clear CTA to contribute.
- **Regression Risks**: Segmented control state getting out of sync with active claims list filter.
- **Browser QA Requirements**: Test debate view on 375px and 390px viewports.

---

### Phase 5 — Full Regression & Quality Verification
- **Goal**: Validate that all 8 primary application surfaces remain 100% operational with 0 errors.
- **Command Checks**:
  - `npm run lint` — Must report 0 errors.
  - `npm run build` — Must generate 21/21 static pages cleanly.
- **Surfaces Checked**:
  - `/` (Home)
  - `/search` (Search)
  - `/discussions` (Discussions Feed)
  - `/debates` (Debates Feed)
  - `/discussions/[slug]` (Discussion Detail)
  - `/debates/[slug]` (Debate Detail)
  - `/inquiries/[id]` (Inquiry Detail)
  - `/settings` (Settings)
