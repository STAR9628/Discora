# PHASE 4: FIRST-TIME USER BEHAVIORAL IMPLEMENTATION PLAN

**Status**: IMPLEMENTATION PLAN ONLY — PENDING ARCHITECTURAL SIGN-OFF  
**Date**: September 2026  
**Focus**: Staged execution plan targeting only validated P1 and P2 behavioral friction points.  
**Constraint**: Implementation plan only. Zero application source code changes, zero migrations, zero RPC modifications.

---

## 1. Overview & Phased Roadmap

This plan translates the findings of the **Phase 4 Behavioral Audit** into concrete, scoped tasks for future execution. It strictly adheres to Discora's core architectural tenets:
- **No Schema Changes Required**: All proposed refinements are UI/copy/staging improvements.
- **Zero Gamification**: No notifications, points, badges, or algorithmic vanity feeds.
- **Strict Preservation**: Questions and Inquiries remain distinct; Claims and Evidence remain first-class.

---

## 2. Work Packages

### Work Package 1: Plain-Language Staging for Structured Inquiries (P1)

#### Files Involved:
- `src/features/discussions/components/claim-card.tsx` (or `claim-list.tsx`)
- `src/features/inquiries/components/create-inquiry-dialog.tsx`

#### Expected Behavior:
1. The button on the Claim card is updated from `Raise Structured Inquiry` to `Scrutinize Claim` (with icon `HelpCircle` or `SearchCode`).
2. Hovering displays a tooltip: *"Ask the author to clarify their premise, provide evidence, or test assumptions."*
3. Inside `CreateInquiryDialog`, the inquiry types are labeled conversationally:
   - `evidence_request`: *"Request Evidence — Ask for sources or data backing this assertion."*
   - `clarification`: *"Request Clarification — Ask what a specific term or statement means."*
   - `assumption_check`: *"Check Assumptions — Highlight an unstated premise this relies on."*

#### Acceptance Criteria:
- Button is immediately understandable to a novice without prior epistemology training.
- Submissions create identical rows in `public.inquiry_items`.
- Zero database or RPC changes.

---

### Work Package 2: Contextual Contribution Action Bar (P1)

#### Files Involved:
- `src/features/discussions/components/discussion-room.tsx`
- `src/features/discussions/components/discussion-section.tsx`
- `src/features/rooms/components/room-section-shell.tsx`

#### Expected Behavior:
1. Introduce an inline contribution helper at the top of discussion sub-tabs:
   > *"Have an assertion, question, or evidence to add to this discussion?"*
2. Clicking expands three intuitive paths:
   - `[Assert a Claim]`: Opens claim creation dialog with type selector.
   - `[Attach Evidence]`: Opens evidence submission with claim dropdown and URL field.
   - `[Ask Guiding Question]`: Opens question creation dialog.
3. For unauthenticated guests, clicking any option prompts the existing clean modal:
   > *"Sign in to contribute — Your draft will be preserved."* (redirects to `/login?redirectedFrom=...`).

#### Acceptance Criteria:
- Unauthenticated users retain full read access without modal harassment.
- Authenticated users can draft directly from the discussion overview or sub-tabs without hunting for separate `Add` buttons.
- Fully responsive across 375px, 390px, 768px, 1024px, 1440px.

---

### Work Package 3: Room Navigation Tab Clarification & Subtitles (P2)

#### Files Involved:
- `src/features/rooms/components/room-section-shell.tsx`
- `src/features/discussions/components/room-section-shell.tsx`

#### Expected Behavior:
1. Update tab labels:
   - `Overview` $\rightarrow$ `Premise & Start`
   - `Discussion Questions` $\rightarrow$ `Guiding Questions`
   - `Contributions` $\rightarrow$ `All Contributions`
2. Add a quiet subtitle below the section header:
   - Claims: *"Atomic assertions evaluated by the community."*
   - Evidence: *"Empirical sources supporting, contradicting, or contextualizing claims."*
   - Guiding Questions: *"Open questions defining what this discussion explores."*

#### Acceptance Criteria:
- Eliminates novice confusion between `Claims` and `Contributions`.
- Preserves exact existing URL paths (`/claims`, `/evidence`, `/questions`, `/contributions`).

---

## 3. QA & Verification Requirements (When Implemented)

### Static Validation:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Responsive Browser QA Breakpoints:
- **1440px (Desktop Large)**: Verify multi-column grid, sidebar alignment, and drawer expansion.
- **1024px (Tablet Landscape)**: Verify 2-column grid adaptation and evidence filter wrap.
- **768px (Tablet Portrait)**: Verify bottom mobile nav bar and touch targets >= 44px.
- **390px / 375px (Mobile)**: Verify single-column wrapping, horizontal tab touch scroll, and zero horizontal overflow (`scrollWidth <= innerWidth`).

### Regression Routes:
1. `/` (Guest and logged-in homepages)
2. `/discussions` (Discussion feed)
3. `/discussions/[slug]` (All tabs: Overview, Claims, Evidence, Questions, Contributions)
4. `/debates` (Debate feed)
5. `/debates/[slug]` (Debate room, proposition vs opposition, scorecard, join debate modal)
6. `/inquiries/[id]` (Inquiry detail, satisfaction bar, response form)
7. `/search` (Search query and filters)
8. `/settings/profile` (Profile settings and auth guards)

---

## 4. Explicit Non-Goals

The implementation MUST NOT include:
- Merging Questions and Structured Inquiries into a single concept.
- Removing claim types or evidence directions.
- Adding badges, upvotes, follower feeds, or social gamification.
- Adding unread notification counters.
- Changing database schema, RLS policies, or RPC contracts.
