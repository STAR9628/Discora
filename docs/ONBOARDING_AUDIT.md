# Discora Phase 5C — Onboarding & First-Session Experience Audit

## 1. Current First-Time User Journey

### Guest User
1. **Landing on `/` (`GuestHomepage`)**:
   - The user sees the Hero section with the tagline: *"Structured Discussion & Debate — A platform for evidence-based dialogue."*
   - Four CTA buttons: *Browse Discussions*, *Explore Debates*, *Search*, *Sign In*.
   - A static 4-card `HowItWorks` component:
     1. Questions (*"What are we trying to understand?"*)
     2. Claims (*"What positions are being taken?"*)
     3. Evidence (*"What supports or challenges them?"*)
     4. Understanding (*"What becomes clearer over time?"*)
   - Below are Featured Inquiries, Recent Discussions, Recent Debates, and Platform Metrics.
2. **Navigating to a Discussion Room (`/discussions/[slug]`)**:
   - The guest lands on the discussion overview page featuring `DiscussionOverviewUnderstanding` (Consensus, Disputed, Unaddressed, Questions, Recent Contributions).
   - Section tabs: Overview, Claims, Evidence, Questions, Contributions.
   - In each actionable section, a static `GuestContributionPrompt` appears at the bottom: *"Want to contribute to this discussion? Sign in to share your perspective..."*
   - There are no guided coachmarks, no interactive demonstration of how evidence alters understanding, and no interactive orientation.
3. **Registering (`/register`)**:
   - Standard Supabase Auth form.
   - If the user has no existing profile row, `src/services/supabase/middleware.ts` forces a redirect to `/settings/profile`.
4. **Landing on `/` as an Authenticated User (`LoggedInHomepage`)**:
   - The user is shown `FirstUserBanner` if `useOnboardingStatus` reports `isFirstTime === true` (determined by `roomCount === 0 && claimCount === 0 && voteCount === 0`).
   - The banner is a static text card:
     > *"Welcome to Discora — Structured discussion starts with a question. Build understanding one claim at a time: ask a question, support it with a claim, back it with evidence, and track how your understanding evolves."*
   - Two buttons: *Browse Discussions* and *Start a Discussion*.
   - There are no actionable prompts, no guided starting points, and no interactive assistance for the user's first contribution.

---

## 2. Existing Onboarding-Related Components & State

The following components and hooks currently touch first-run or onboarding concepts:

1. **`useOnboardingStatus`** (`src/features/homepage/hooks/use-homepage.ts`):
   - Computes `isFirstTime` boolean based on whether `rooms`, `discussion_claims`, and `claim_votes` count for `auth.uid()` are all `0`.
   - Stale time: 10 minutes.
2. **`FirstUserBanner`** (`src/features/homepage/components/logged-in-homepage.tsx`):
   - Only renders on the homepage when `onboarding?.isFirstTime` is true.
   - Purely informational text banner with links to `/discussions` and `/discussions/create`.
3. **`HowItWorks`** (`src/features/homepage/components/guest-homepage.tsx`):
   - Static 4-column cards describing Questions, Claims, Evidence, Understanding.
4. **`GuestContributionPrompt`** (`src/features/rooms/components/guest-contribution-prompt.tsx`):
   - Reusable prompt for unauthenticated visitors rendering on claim lists, question lists, contribution feeds, and debate rooms.
5. **`StateOfUnderstandingEmpty`** (`src/features/discussions/components/state-of-understanding.tsx`):
   - Rendered when a discussion has 0 claims and 0 evidence.
6. **`WriteFirstInput`** (`src/features/discussions/components/write-first-input.tsx`):
   - Allows users to type freeform thoughts, optionally extracting claims.

---

## 3. Conceptual Friction Points

Discora deviates significantly from conventional web platforms (Reddit, Twitter, Discord, Hacker News):

1. **Assertion vs. Discussion**:
   - On Reddit/Twitter, everything is a flat message thread scored by net upvotes.
   - On Discora, discourse is dissected into discrete epistemic primitives: **Questions**, **Claims**, **Evidence**, and **Inquiries**.
   - First-time users often default to writing subjective, unstructured comments rather than formulating testable claims.
2. **Evidence Strengthens, Weakens, or Complicates (Not "Establishes Truth")**:
   - Evidence does not automatically manufacture absolute certainty or "prove truth".
   - It informs understanding by demonstrating whether a claim has *Limited Support*, is *More Supported*, is *Mixed / Contested*, or remains *Unresolved*.
   - Consensus is a reflection of current participant alignment on evidence, never an infallible verdict.
3. **Changing One's Mind**:
   - In standard online debates, conceding ground or changing side is framed as defeat.
   - In Discora, the "Side Switch" and updating positions based on evidence is a core reputation signal and celebrated epistemic behavior.
4. **Discussion Questions vs. Structured Inquiries**:
   - Discussion Questions frame the room's high-level topic.
   - Structured Inquiries challenge, clarify, or test assumptions of a specific claim. Users routinely conflate these.

---

## 4. Guest Journey Issues

- **Passive Experience**: Guests can read, but there is zero interactive learning. They cannot see the dynamic relationship between evidence and claims without creating an account.
- **Abstract Terminology**: Terms like "Structured Inquiries" and "State of Understanding" appear without concrete, illustrative examples.
- **Premature Registration Barriers**: Sign-up prompts feel like gates rather than value-adding milestones.

---

## 5. Authenticated Journey Issues

- **Blank Canvas Syndrome**: After completing the profile setup on `/settings/profile`, users arrive at the homepage with only a small text banner and a list of active community rooms.
- **No Orientation Guidance**: Users are not guided toward a low-stakes first action (such as exploring a room, reviewing an evidence attachment, or formulating a structured question).
- **Missing Onboarding Persistence**: If a user clicks away from the homepage, there is no way to reopen onboarding guidance or review how Discora works.

---

## 6. Discussion Comprehension Gaps

- Users do not intuitively understand the distinction between the **Contributions** tab (exploratory, conversational commentary) and the **Claims** tab (structured assertions subject to evidence and consensus).
- The "Extract Claim" action on messages is often overlooked.

---

## 7. Debate Comprehension Gaps

- Users often assume debates are competitive zero-sum matches ("Who won?").
- Discora debates are deliberative investigations around a central Motion with Proposition and Opposition arguments supported by verifiable evidence.
- The Side Switch mechanism is obscure to new users unless explicitly demonstrated.

---

## 8. Questions vs. Inquiries Confusion Points

| Attribute | Discussion Question | Structured Inquiry |
|---|---|---|
| **Scope** | Room / Topic level | Specific Claim level |
| **Database Table** | `questions` | `inquiry_items` |
| **Purpose** | Frames exploratory angles for the room | Demands clarification, evidence request, or assumption check on an assertion |
| **Resolution** | Answered via Claims | Marked satisfied / unsatisfied by inquirer |

Without interactive demonstration, new users treat both as generic questions.

---

## 9. Contribution Friction

- First-time contributors often feel intimidated by the structured taxonomy (Claims, Evidence Types, Inquiry Types).
- The Phase 2 "Write-First" input is effective, but users need reassurance that they can draft thoughts freely without needing to be an academic researcher.

---

## 10. Mobile Issues

- Full-screen onboarding overlays easily cause layout distortion and broken scrolling on 375px–390px screens.
- Modals with dense explanatory diagrams truncate or cause horizontal overflow.
- Mobile bottom navigation can conflict with fixed sticky onboarding banners.

---

## 11. Accessibility Issues

- Onboarding dialogues must trap focus and return focus to the trigger element upon dismissal.
- Tooltips alone cannot carry essential conceptual instructions.
- Screen readers must receive clear role and aria-live announcements during interactive state transitions.
- All animated demonstrations must strictly respect `prefers-reduced-motion`.

---

## 12. Existing Motion Opportunities

- A dynamic visual simulation of how evidentiary findings shift a claim's support state between *Limited Support*, *More Supported*, and *Mixed / Contested*.
- Smooth accordion and card transitions when revealing the epistemic steps:
  `Question -> Claim -> Evidence -> Inquiry -> Understanding`.

---

## 13. Recommended Onboarding Concept: "The Discovery Deck & Epistemic Sandbox"

Rather than a static modal or a forced walkthrough tour:
1. **Interactive Discovery Deck**:
   - A friendly, lightweight, dismissible interactive experience.
   - Can be opened as an interactive modal on first arrival or triggered anytime from the Sidebar / Mobile Menu via **"How Discora Works"**.
2. **Interactive Epistemic Sandbox ("What Moves the Needle?")**:
   - A memorable 15-second micro-interaction where the user evaluates an illustrative educational claim, toggles supporting and counter-evidence, and observes how support shifts between *Limited Support*, *More Supported*, and *Mixed / Contested*.
   - Clearly labeled: *"Interactive example — not live Discora data"*.
   - Never simulates truth meters, popularity scores, or competitive winning.
   - Demonstrates the foundational principle: *Evidence can strengthen, weaken, or complicate support for a claim.*
3. **Exploration Interest Selector**:
   - Lightweight choice of discussion areas (Technology, Philosophy, Science, Society) and format (Collaborative Discussions vs. Structured Debates).
   - Follows: *"Personalize exploration, not belief."* Never profiles ideology or worldviews.
4. **Contextual Room Guides**:
   - Compact, dismissible inline helper cards at the top of Discussion and Debate overview sections explaining the specific surface.

---

## 14. Unified State & Exposure Hierarchy

To prevent competing onboarding surfaces, the experience follows a strict exposure hierarchy driven by a single centralized state model:
- **Guest / New Visitor**: Subtle Discovery Deck invitation on Homepage.
- **New Authenticated User**: Small onboarding checklist on Homepage.
- **Inside Rooms**: Contextual guide only when genuinely useful (dismissible per room type).
- **Anytime**: "How Discora Works" button in Sidebar and Mobile Nav.
- Completing or dismissing reduces future automatic exposure.

---

## 15. What Should Explicitly NOT Be Built

- ❌ NO full-screen takeover modal that blocks site navigation.
- ❌ NO multi-step mandatory tour forcing users to click through 10 pages.
- ❌ NO gamification: no points, levels, XP, streaks, badges, or progress percentages tied to rewards.
- ❌ NO social engagement hooks: no follower prompts, no trending banners, no social sharing nag screens.
- ❌ NO political, ideological, or belief profiling.
- ❌ NO fake community data, fake discussion rooms, or fake votes.
- ❌ NO database migrations or breaking table alterations.
- ❌ NO truth meter, popularity meter, voting meter, or winner meter.
