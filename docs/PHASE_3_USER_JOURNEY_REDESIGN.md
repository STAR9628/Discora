# DISCORA PHASE 3 USER JOURNEY REDESIGN

Date: 2026-09-04
Status: REDESIGN PROPOSAL

## Design Principles

1. No dark patterns. No gamification.
2. Understanding over engagement.
3. Teach the model, do not hide it.
4. Do not over-onboard.
5. Guest-first.

## R1 - Homepage Hero Sub-Tagline

Problem: F1, F2 - tagline communicates format not purpose.

Proposed sub-tagline (below existing headline):
> Where arguments are structured as claims, claims require evidence,
> and changing your mind based on evidence is a feature not a weakness.

Or shorter:
> Not a forum. A disagreement map. Claims. Evidence. Positions that can change.

The headline Structured Discussion and Debate does not change.
A sub-tagline insertion below the existing text is sufficient.

## R2 - Homepage: Replace Metrics Section with How it Works Strip (guest-only)

Problem: F3, F5, F21 - Understanding Metrics tiles opaque to new users.

Option A - Rename tiles:
- Open Inquiries to Questions still open
- Satisfied Today to remove or replace
- Debates Both Sides to Debates with both sides represented

Option B - Replace with 4-step strip (guest-only):
Step 1: HelpCircle icon / Ask Questions / Define what needs to be understood
Step 2: GitBranch icon / Make Claims / Assert structured arguments
Step 3: FileText icon / Add Evidence / Back claims with real sources
Step 4: TrendingUp icon / Track Understanding / Watch consensus form over time

Shown only to guests. Authenticated homepage already has FirstUserBanner and QuickActions.

## R3 - Inquiry Spotlight: Rename and Conditionally Hide

Problem: F4 - Inquiry Spotlight is undefined term.

Changes:
- Rename section header from Inquiry Spotlight to Question Worth Answering
- Add subtitle: An open question from an ongoing discussion. Contribute an answer to help map the disagreement.
- Hide section entirely when no inquiries available (replace empty state with nothing)

## R4 - Discussion Room: Orientation Note for New Visitors

Problem: F9, F10 - No where to start signal.

Add a dismissible single-line orientation banner below the Opening Premise block,
shown to guests only, dismissed with X button, state stored in sessionStorage:

> New here? Start with Discussion Questions below to understand what this room is
> exploring, then browse Claims and Evidence.

Not shown to authenticated users who have made contributions.

## R5 - Claim Type Tooltips

Problem: F11 - 5 claim type badges unexplained.

Add title attribute to each badge:
- FACT: A statement presented as objectively verifiable
- CLAIM: An assertion that requires evidence or argument to support
- OPINION: A value judgment or subjective perspective
- SUPPORTING IDEA: An argument that supports or reinforces another claim
- OBSERVATION: An empirical observation without a formal argumentative claim

No layout change. One-line addition to badge rendering.

## R6 - Consensus Percent Label

Problem: F12 - Claim cards show 50 percent with no label.

Change rendered text from {consensus}% to {consensus}% agree.
Optionally add tooltip: Percentage of voters who agree with this claim.

One-line change.

## R7 - Evidence Bank Micro-Copy

Problem: F13 - Two evidence surfaces appear unrelated.

Add subtitle below Evidence Bank section header:
Evidence items attached to specific claims. Browse by stance.

No layout change. Copy-only.

## R8 - Guest Prompt in Questions Section

Problem: F14 - Guests who want to ask a question receive no prompt.

Add GuestContributionPrompt-equivalent below the question list:
> Want to ask a question about this topic? Sign in to post a structured
> question and help define what this discussion is exploring.

Buttons: Create Account | Sign In (same as existing prompt in Contributions).
No new UI primitives required.

## R9 - Debate Room: Guest Join Debate Auth Redirect

Problem: F16 - Guest clicks Join Debate, selects side, confirms, receives error.
Intent formed then rejected without redirect.

When user is not authenticated and submits the side picker modal:
1. Close the modal
2. Navigate to /register?redirectedFrom={encodedCurrentPath}
3. Do not show inline error

Optional: before redirecting show brief message: Create a free account to join this debate.

## R10 - Mobile Tab Nav Overflow Indicator

Problem: F20 - no-scrollbar CSS hides overflow indicator at 375px.

Add right-edge fade gradient on tab nav wrapper to signal overflow:
position relative on wrapper, after pseudo-element with gradient from transparent
to background color on right edge, 24px wide, pointer-events none.

Pure CSS. No logic change.

## PRIORITY TRIAGE

| Redesign | Friction IDs | Effort | Priority |
|----------|-------------|--------|----------|
| R1 - Hero sub-tagline | F1 F2 | Very Low | P0 |
| R8 - Guest prompt in Questions | F14 | Very Low | P0 |
| R9 - Debate guest auth redirect | F16 | Low | P0 |
| R3 - Inquiry Spotlight rename/hide | F4 | Very Low | P1 |
| R2 - How it Works strip guest-only | F3 F5 F21 | Medium | P1 |
| R4 - Room orientation note | F9 F10 | Low | P1 |
| R6 - Consensus percent label | F12 | Very Low | P1 |
| R5 - Claim type tooltips | F11 | Very Low | P2 |
| R7 - Evidence Bank micro-copy | F13 | Very Low | P2 |
| R10 - Mobile tab nav gradient | F20 | Very Low | P2 |

## NOT IN SCOPE

- Changing the conceptual data model
- Adding gamification or trending feeds
- Redesigning discussion room layout
- Changing the authenticated LoggedInHomepage
- Adding tutorials or onboarding emails

---
This is a redesign proposal. No application code was modified during Phase 3.
