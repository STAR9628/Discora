# DISCORA PHASE 3 IMPLEMENTATION PLAN
**New User First-Session Experience Improvements**

Date: 2026-09-04
Audit basis: docs/PHASE_3_USER_JOURNEY_AUDIT.md
Redesign basis: docs/PHASE_3_USER_JOURNEY_REDESIGN.md
Status: PLAN ONLY - NOT YET IMPLEMENTED

---

## Executive Summary

Phase 3 identified 22 friction points across the new user journey.
This implementation plan addresses the highest-impact items with minimal code changes.
No architectural changes. No new database tables or migrations.
No gamification. No dark patterns.

---

## PHASE 3A - CRITICAL FIXES (P0)

All three items are small, low-risk, and address broken or misleading experiences.
Each should be a separate commit or grouped into one atomic commit.

### 3A.1 - Homepage Hero Sub-Tagline (F1, F2)

File: src/features/homepage/components/guest-homepage.tsx
Component: HeroSection

Change: Add one <p> element below the existing muted-foreground subtext.

Proposed copy (confirm with product before implementing):
> Where arguments are structured claims, claims require evidence,
> and changing your mind based on evidence is a feature not a weakness.

Shorter variant:
> Not a forum. A disagreement map. Claims. Evidence. Positions that can change.

The headline 'Structured Discussion & Debate' does not change.
Scope: ~3 lines added to HeroSection JSX.
Risk: None.
Test: Visual inspection at 1440px and 375px.

### 3A.2 - Guest Prompt in Discussion Questions Section (F14)

File: src/features/discussions/components/question-list.tsx

Change: After the questions list render, before the authenticated form,
add a conditional block for guest users using the existing GuestContributionPrompt.

Pattern (already used in contributions section):
  if (!user) { return <GuestContributionPrompt roomType='discussion' /> }

The existing GuestContributionPrompt copy is acceptable as-is.
Scope: ~5 lines added to QuestionList JSX.
Risk: None. Uses existing component, no new dependencies.
Test: Visit discussion room as guest. Confirm prompt appears in Questions section.

### 3A.3 - Debate Room Guest Auth Redirect (F16)

File: src/features/debates/components/debate-side-picker-modal.tsx

Change: In handleSubmit, before the try block, detect unauthenticated state.
If user is null, close modal and navigate to /register?redirectedFrom=...
Do not call joinMutation or switchMutation.
Do not show the inline error.

Requires: import { useRouter } from 'next/navigation'
Requires: import { usePathname } from 'next/navigation'
The user object is available via useAuth within the component.

Scope: ~8 lines change in handleSubmit.
Risk: Low. No mutation called. Pure navigation redirect.
Test: Visit debate room as guest. Click Join Debate. Select a side.
Click Join Debate Stance. Confirm redirect to /register with redirectedFrom param.

---

## PHASE 3B - HIGH VALUE IMPROVEMENTS (P1)

Implement after 3A is committed and validated.

### 3B.1 - Room Orientation Note for New Guests (F9, F10)

File: src/features/discussions/components/discussion-room.tsx
Location: After <OpeningPremise /> block, before <SectionNav />

Change: Add an orientation banner component.
Show only when: user is null AND sessionStorage key 'discora_room_oriented' is not set.
Dismiss: sessionStorage.setItem('discora_room_oriented', '1') on X button click.

Copy:
> New here? Start with Discussion Questions to understand what this room is exploring.
> Then browse Claims and Evidence before contributing.

Styling: bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs
with an X dismiss button on the right (same pattern as showPostFeedback banners).

Scope: ~25 lines new JSX + useEffect for sessionStorage read.
Risk: Low. Client-side only. No server calls. No new data fetching.
Test: Visit discussion room as guest. Banner appears.
Click dismiss. Refresh page. Banner does not reappear (same session).
Visit as authenticated user. Banner must not appear.

### 3B.2 - Inquiry Spotlight Rename and Conditional Hide (F4)

File: src/features/homepage/components/guest-homepage.tsx
Component: InquirySpotlight

Changes:
  a) Rename h2 text from 'Inquiry Spotlight' to 'Question Worth Answering'
  b) Add subtitle p element: 'An open question from an ongoing discussion.
     Contribute an answer to help map the disagreement.'
  c) When !inquiry and !isLoading and !error: return null (hide section)

Scope: ~5 lines changed.
Risk: None.
Test: Check guest homepage with and without spotlight data.

### 3B.3 - Consensus Percent Label (F12)

File: src/features/discussions/components/claim-list.tsx
Or wherever claim consensus ratio is rendered.

Change: Locate consensus rendering. Add ' agree' suffix or a title tooltip.
e.g. Change '{consensus}%' to '{consensus}% agree'
Or add: title='Percentage of voters who agree with this claim'

Scope: 1-2 lines.
Risk: None.
Test: Visual inspection in discussion room Claims section.

### 3B.4 - Guest Homepage How it Works Strip (F3, F5, F21)

File: src/features/homepage/components/guest-homepage.tsx

Change: Add a new HowItWorksStrip component.
Position: Between HeroSection and ActiveDiscussions in GuestHomepage.

Component renders a 4-column grid (2x2 on mobile) with:
  Step 1: HelpCircle / Ask Questions / Define what needs to be understood
  Step 2: GitBranch / Make Claims / Assert structured arguments
  Step 3: FileText / Add Evidence / Back claims with real sources
  Step 4: TrendingUp / Track Understanding / Watch consensus form over time

Each step: small rounded card, icon (h-8 w-8 text-primary), label (text-sm font-semibold),
sublabel (text-xs text-muted-foreground leading-relaxed).

Optional section header: 'How Discora Works' (h2, text-lg font-semibold)

Scope: ~40-50 lines new component.
Risk: None.
Test: Visual inspection on guest homepage at 1440px and 375px.
Confirm NOT shown on logged-in homepage (GuestHomepage vs LoggedInHomepage are separate components).

---

## PHASE 3C - POLISH IMPROVEMENTS (P2)

Implement after 3B is committed.

### 3C.1 - Claim Type Tooltips (F11)

File: src/features/discussions/components/claim-list.tsx

Change: Add title attribute to each claim type badge span.

Definitions map:
  FACT: A statement presented as objectively verifiable
  CLAIM: An assertion that requires evidence or argument to support
  OPINION: A value judgment or subjective perspective
  SUPPORTING IDEA: An argument that supports or reinforces another claim
  OBSERVATION: An empirical observation without a formal argumentative claim

Scope: ~10 lines (a lookup object + title attribute on badge span).
Risk: None.

### 3C.2 - Evidence Bank Subtitle (F13)

File: src/features/discussions/components/room-evidence-section.tsx
OR src/features/discussions/components/room-evidence-tab.tsx

Change: Below Evidence Bank h2 heading, add subtitle p:
'Evidence items attached to specific claims. Browse by stance.'

Scope: 2 lines.
Risk: None.

### 3C.3 - Mobile Tab Nav Overflow Gradient (F20)

Files:
  src/features/discussions/components/section-nav.tsx
  src/features/debates/components/debate-section-nav.tsx

Change: Wrap the scrollable row div in a relative-positioned container.
Add a right-edge fade gradient overlay div:
  <div className='absolute right-0 top-0 bottom-0 w-6 pointer-events-none
    bg-gradient-to-r from-transparent to-background' />

Scope: ~5 lines per component.
Risk: Low (visual only, no logic).

---

## IMPLEMENTATION CONSTRAINTS

- Do not modify database schema or migrations
- Do not add new TanStack Query endpoints or RPCs
- Do not change routing structure
- Do not change the authenticated LoggedInHomepage
- Do not add gamification, trending, or popularity signals
- sessionStorage usage is client-only (never in server components)
- All copy must be reviewed against core product principle:
  understanding over engagement, evidence over opinions

---

## VERIFICATION PLAN

For each phase after implementation:
  1. npx tsc --noEmit
  2. npm run lint
  3. npm run build
  4. git diff --check
  5. Browser QA at routes below

Phase 3A routes:
  - / (guest) - confirm hero sub-tagline present
  - /discussions/{slug} (guest) - confirm Questions section has guest prompt
  - /debates/{slug} (guest) - confirm Join Debate redirects to /register

Phase 3B routes:
  - /discussions/{slug} (guest) - orientation banner present, dismiss works
  - / (guest) - Inquiry Spotlight relabeled, hidden when empty
  - /discussions/{slug} - claims show % agree label
  - / (guest) - How it Works strip visible between hero and discussions

Phase 3C routes:
  - /discussions/{slug} - claim type badges have tooltips on hover
  - /discussions/{slug} - Evidence Bank has subtitle
  - /discussions/{slug} (375px) - tab nav shows right-edge gradient

---

## COMMIT STRUCTURE

Phase 3A: fix: Phase 3A critical guest experience corrections
Phase 3B: feat: Phase 3B new user orientation improvements
Phase 3C: polish: Phase 3C UX micro-improvements

---
This is an implementation plan document. No application code was modified during Phase 3.