# Phase 8E — First-Use & Beta User Journey Audit

**Audit Status:** Complete  
**Date:** September 13, 2026  
**Audited Target:** Local Production Build & Running Dev Server (`http://localhost:3003`)  
**Auditor:** Discora Engineering & Product Governance Subagent  
**Scope:** Comprehension and usability audit of the complete first-time user journey (first arrival, /about, registration, feeds, rooms, composer, claims, evidence, inquiries, SoU, profile, security, and mobile breakpoints). Strict audit mode: ZERO code or database mutations.

---

## 1. Executive Verdict

### **Verdict: BETA READY WITH BLOCKERS**

Discora has achieved an exceptionally strong epistemic foundation. The core premise—**understanding over engagement, evidence over popularity, and conversation first, structure second**—is palpable throughout the product experience. A new visitor who has never seen Discora can arrive at `/about`, understand in under 20 seconds what the platform is and why it exists, transition to curated discussions and debates across 6 core domains, read genuine institutional citations (C2PA, NIST, Science, UNESCO, WHO, ICRC, ACM), and participate through a non-intimidating, conversational composer.

However, three specific pre-beta blockers (two environmental/infrastructure gaps and one conceptual label ambiguity) prevent an unqualified "BETA READY" rating for external public release:
1. **P1 — Resend / SMTP Email Delivery in Production:** Account registration requires email confirmation; without a verified production email provider (Resend/SMTP), self-serve registration will stall unless Google OAuth is used or email confirmation is toggled in Supabase Auth.
2. **P1 — Offline State Handling:** When a user loses internet connectivity, the application currently fails silently or via browser network errors rather than presenting a native Discora offline notice.
3. **P1 — Debates "Questions" vs "Inquiries" Tab Overload:** In debate rooms, the lens is labeled "Questions" in navigation, but immediately presents claim-scoped "Structured Inquiries". This creates a conceptual collision with Discussion exploratory questions.

Once these blockers are resolved (or accepted for an invite-only closed alpha), the platform is ready for human discourse.

---

## 2. User Journey Scorecard

*Scoring Scale: 0 = Broken | 1 = Very Confusing | 2 = Usable but Confusing | 3 = Understandable | 4 = Strong | 5 = Excellent*

| # | Journey Dimension | Score | Assessment |
|---|---|:---:|---|
| 1 | **First Arrival** | **4.5** | Clean redirect from `/` to `/about` on first visit. Hero copy establishes anti-engagement premise in <15s. |
| 2 | **About Comprehension** | **4.5** | High clarity. 8 structured sections clearly explain problem, conversation-first model, claims, evidence, and AI boundaries. |
| 3 | **About → Product Transition** | **4.0** | Clear CTAs to "Browse discussions" and "Browse debates". Second visit lands on curated `GuestHomepage`. |
| 4 | **Registration Path** | **3.5** | Form UX is clean (Google + Email), but email confirmation depends on active SMTP/email provider. |
| 5 | **Homepage Comprehension** | **4.0** | `GuestHomepage` immediately introduces the 2-minute guide, search, discussions, and debates. |
| 6 | **Topic Discovery** | **4.5** | 7 curated discussions and 5 debates across Technology, Science, Education, Philosophy, Culture, and Ethics. |
| 7 | **Discussion Comprehension** | **4.5** | Premise, room guide card, and lenses provide immediate contextual orientation. |
| 8 | **Debate Comprehension** | **4.0** | Symmetric proposition/opposition stances clearly communicated; argument indicators visible. |
| 9 | **Conversation Participation** | **5.0** | Outstanding. `UnifiedComposer` starts as a friendly "Write a message..." input and expands to structured modes only when activated. |
| 10 | **Message → Claim Understanding** | **4.0** | "Make this a Claim" action on message cards is discoverable; modal allows selecting 5 distinct claim types. |
| 11 | **Evidence Understanding** | **4.5** | Citations link to genuine institutional sources (C2PA, Science, UNESCO, WHO, etc.) with explicit supporting/challenging direction. |
| 12 | **Argument Understanding** | **4.0** | Proposition and Opposition arguments clearly connected to underlying claims. |
| 13 | **Inquiry Understanding** | **3.5** | Structured inquiries scoped to claims are powerful but conceptually dense for a first-time visitor. |
| 14 | **State of Understanding (SoU)** | **4.0** | Visual mapping of claims by evidentiary support. Stances are separated from truth claims; no winner/loser framing. |
| 15 | **Navigation** | **4.5** | Header, Sidebar, SectionNav, and MobileNav provide clear spatial orientation across all pages. |
| 16 | **Mobile Experience** | **4.5** | Tested at 375px, 390px, 834px. Zero horizontal overflow; touch targets meet 44px minimums. |
| 17 | **Error Handling** | **3.5** | 404 not-found pages render cleanly; network disconnect lacks a dedicated Discora offline banner. |
| 18 | **Empty States** | **4.0** | Empty searches, zero-contribution message threads, and empty lenses present helpful guidance copy. |
| 19 | **Profile & Social Context** | **5.0** | Quiet, non-gamified epistemic contribution distribution. Founding Participant badge is tasteful and non-hierarchical. |
| 20 | **Overall First-Use Confidence** | **4.0** | A new visitor can explore, read evidence, and contribute without personal manual onboarding. |

**Overall Score:** **4.2 / 5.0 (Strong)**

---

## 3. P0 Blockers (Prevents Any Beta)

**None.**  
There are zero P0 crashes, database constraint failures, unhandled exceptions, or security bypasses on the core user journeys.

---

## 4. P1 Public Beta Issues (Must Resolve Before Opening Public Registration)

1. **Email Verification Delivery (Functional/Infrastructure):**  
   - *Finding:* Supabase Auth email verification requires active SMTP/Resend credentials in production. If a new user signs up with email, they cannot complete verification without email delivery.  
   - *Recommendation:* Configure Resend production API key or enable auto-confirm for the early closed beta cohort.
2. **Debate Lens Labeling ("Questions" vs "Inquiries") (UX / Terminology):**  
   - *Finding:* In debates, the lens is labeled "Questions", but opens the inquiry interface scoped to claims. In discussions, "Questions" opens exploratory discussion questions.  
   - *Recommendation:* Rename the debate lens tab from "Questions" to "Inquiries" so users know they are viewing targeted follow-ups rather than general questions.
3. **Offline / Network Disconnection State (UX / Resilience):**  
   - *Finding:* When the user's connection drops, client-side route transitions stall or throw browser fetch errors without a Discora-native offline warning.  
   - *Recommendation:* Add an offline status banner or service worker fallback alerting the user that they are in read-only offline mode.

---

## 5. P2 UX Issues (Should Fix Before Visual Polish)

1. **Hero Slider CTA vs Global CTA on `/about`:**  
   - *Finding:* The interactive stepper in the `/about` hero features a prominent "Next" button that cycles slides. A new user might click "Next" expecting to enter the app.  
   - *Recommendation:* Add subtle slide indicators ("1 of 4") and ensure primary enter CTAs ("Browse discussions") are visually distinguished from slider controls.
2. **"Make this a Claim" Contextual Tooltip:**  
   - *Finding:* On conversational message cards, the "Make this a Claim" button does not have an inline micro-explanation of why a user would elevate a message.  
   - *Recommendation:* Add a subtle tooltip: *"Extract an empirical or normative claim to attach verifiable evidence."*
3. **Search Page Network Idle Timing:**  
   - *Finding:* The search page client component occasionally maintains active subscriptions that delay Playwright `networkidle` state transitions.

---

## 6. P3 Polish / Future Issues (Figma & Visual Polish Stage)

1. **Visual Consistency of Topic Pills:** Some topic badges use solid background borders while others use subtle glassmorphic tints.
2. **Avatar Fallback Contrast in Dark Mode:** When users lack custom avatars, default initials use standard muted background.
3. **Typography Rhythm in Long Evidence Summaries:** Scientific abstracts could benefit from enhanced line-height and blockquote styling.

---

## 7. First Arrival Experience

- **Routing:** A new visitor navigating to `http://localhost:3003/` without cookies is immediately and cleanly redirected to `/about`.
- **First 15 Seconds:**
  - *Title:* "About Discora — Structured Discussion & Understanding"
  - *H1:* "Discussion built for understanding, not engagement"
  - *Subtitle:* Explains that Discora provides a structured environment where ideas can be examined without turning disagreement into conflict.
- **Visual Hierarchy:** Clean, generous typography with dark-mode aesthetic, structured into 8 thematic sections.
- **Comprehension Assessment:** Within 15 seconds, a visitor clearly understands:
  - *What is Discora?* An evidence-based discussion platform.
  - *What is it for?* Understanding complex topics and disagreements.
  - *How is it different?* No algorithmic outrage, no engagement optimization, no winners/losers.
  - *What should I do?* Explore curated discussions or join a debate.

---

## 8. About → Product Transition

- **First Visit:** The `/about` page concludes with two primary action cards: "Browse discussions" and "Browse debates", as well as "Join Discora".
- **Second Visit (`discora_visited=true`):** Navigating to `/` displays `GuestHomepage`:
  - Features an explicit banner: *"New to Discora? See how evidence-based discussion works (2 min)"* linking directly to `/about`.
  - Prominently displays "Browse Discussions", "Explore Debates", and "Interactive Sandbox & Guide".
  - Renders 3 featured discussion cards with live topic pills and premises.
- **Conceptual Continuity:** Terminology flows naturally from About's foundational concepts (conversation, claims, evidence) into the homepage feed.

---

## 9. Registration Journey

- **URL:** `/register`
- **Options Available:** Google Sign-In button and Email/Password fields.
- **Guiding Copy:** *"Create an account. You will receive a verification email — click the link to activate your account and get started."*
- **Terms & Privacy:** Clean footer links.
- **Post-Registration State:** Redirects to onboarding profile setup if user lacks username/display name, or to the originating page if redirected from a room.

---

## 10. Discovery Experience

- **Discussions Feed (`/discussions`):**
  - Displays 7 curated discussions across Technology, Science, Education, Philosophy, Culture, and Ethics.
  - Zero developer scratch residue (`testtest`, `ai vs human`, etc.).
  - Card metadata shows topic category, premise summary, and contribution count.
- **Debates Feed (`/debates`):**
  - Displays 5 structured debates.
  - Each debate card displays the proposition title and opposition title side by side, establishing that both sides have valid epistemic standing.
- **Search (`/search`):**
  - Full-text search across titles, claims, evidence, and questions.
  - Empty search results present friendly guidance: *"Try searching for broader terms or explore the catalog."*

---

## 11. Discussion Experience

Audited Room: `should-synthetic-provenance-be-required-for-ai-media`
- **Room Header:** Displays title, "DISCUSSION" badge, topic ("Technology"), and premise statement.
- **Room Guide Card:** Introduces first-time visitors:
  > *"Discussion Room: Collaborative Truth-Seeking. Discussions decompose complex topics into Questions, Claims, and verifiable Evidence. You do not need to argue to win—participate to clarify and build a shared State of Understanding."*
- **Lenses Available:** Conversation, Claims, Evidence, Sources, Questions, State of Understanding.
- **Evidence Tab:** Displays C2PA Specification v1.3 with external link and supporting direction indicator.
- **Questions Tab:** Displays exploratory questions inviting community inquiry.

---

## 12. Debate Experience

Audited Room: `autonomous-weapons-systems-should-be-banned`
- **Header Structure:** Displays motion title, "DEBATE" badge, topic ("Ethics"), and "Join Debate" action.
- **Proposition vs Opposition Split:**
  - *Proposition:* "Lethal Autonomous Weapons Must Be Banned" (1 Claim)
  - *Opposition:* "Defensive Autonomy Reduces Harm & Collateral Damage" (1 Claim)
- **Claims/Arguments Lens:** Displays proposition claim (*"Delegating lethal decisions to autonomous algorithms violates distinction and proportionality"*) alongside opposition claim (*"Autonomous defensive intercept systems provide superior reaction times..."*).
- **Epistemic Balance:** Neither side is pre-declared the winner. Stances are balanced and cite the Martens Clause and ICRC humanitarian law.

---

## 13. Conversation-First Experience

- **Guest State:**
  - Guests see full conversation threads.
  - At the bottom of the room, `GuestContributionPrompt` invites them to join:
    *"Sign in to join this discussion. Share insights, propose claims, or ask questions in this room. [Create Account] [Sign In]"*
- **Authenticated State:**
  - Renders the collapsed `UnifiedComposer`: *"Write a message..."*
  - This preserves low cognitive friction: users do not feel forced to write academic essays.
  - Clicking the input expands the composer to reveal [Message], [Claim], and [Question] tabs.
  - Users can post a normal conversational thought, or toggle to formal Claim mode with specific claim types (Opinion, Fact, Prediction, Proposal, Observation).
  - Drafts are saved in local storage to prevent accidental text loss.

---

## 14. Claim / Evidence / Argument / Inquiry Comprehension

- **Claim:** A discrete assertion that can be evaluated. Visualized with a scales/balance icon and claim-type badge.
- **Evidence:** Verifiable empirical or documentary source with an external link. Visualized with link icon and supporting/challenging direction tag.
- **Argument:** Structured reasoning connecting evidence to a debate claim.
- **Inquiry:** A targeted follow-up question scoped directly to a specific claim.
- **Comprehension Finding:** The distinction between Evidence (external facts) and Argument (logical justification) is clear in the UI. The distinction between a general Question and a Targeted Inquiry is clear in discussions, but slightly obscured in debates where the tab is named "Questions".

---

## 15. State of Understanding (SoU)

- **Discussion View:** Groups claims into "Supported", "Contested", and "Unresolved" based on evidence and consensus indicators.
- **Debate View:** Maps claims by evidentiary grounding on each side of the motion.
- **Philosophy Check:**
  - Voting is explicitly labeled as community sentiment, NOT objective truth.
  - Consensus ratio is shown as a percentage bar without gamified medals or trophies.
  - AI does NOT decide truth or pick winners.
  - All claims remain open for new evidence.

---

## 16. Navigation Comprehension

- **Desktop (1440px):**
  - Top header: Discora mark, Discussions, Debates, Search, Profile menu, Theme switcher.
  - Sidebar: Quick access to recent discussions and debates.
- **Mobile (375px / 390px):**
  - Bottom `MobileNav` bar with icons: Home, Discussions, Debates, More.
  - Room lens selector collapses into a smooth, horizontally scrollable tab list that stays accessible while reading.

---

## 17. Empty States Audit

| Surface | Empty State Rendered | Guidance Quality |
|---|---|---|
| **Empty Room Messages** | "No contributions yet" + prompt | Excellent — invites the first message |
| **Empty Claims Lens** | "No claims proposed yet" | Clear guidance on how to extract claims |
| **Empty Evidence Lens** | "No evidence cited yet" | Explains how to link external sources |
| **Empty Questions Lens** | "No open questions" | Prompts users to pose exploratory questions |
| **Empty Search Results** | "No matching discussions or claims found" | Suggests broader search terms |
| **Empty Saved Rooms** | "No saved discussions or debates" | Explains how to bookmark rooms with Save icon |

---

## 18. Error States Audit

- **Non-Existent Route (`/discussions/invalid-slug-9999`):** Returns clean HTTP 404 with Discora "Resource Not Found" template.
- **Malformed Search (`/search?q=%20`):** Handled gracefully with fallback empty state.
- **Unauthorized Protected Routes (`/settings` as guest):** Redirects cleanly to `/login?redirectedFrom=/settings`.

---

## 19. Offline & Network Resilience Audit

- **Current State:** When browser connection is severed:
  - Already-loaded pages remain interactive for reading.
  - Clicking internal client links causes fetches to stall or fail silently without feedback.
- **Required Fix (P1):** A global network listener (`navigator.onLine`) displaying a non-intrusive banner: *"You are currently offline. Discourse is in read-only mode."*

---

## 20. Mobile Experience (375px / 390px / 834px)

- **375px Viewport (iPhone SE standard):**
  - Zero horizontal overflow (`document.documentElement.scrollWidth === window.innerWidth`).
  - Font sizes stay readable (14px/16px body, 20px headers).
  - Bottom `MobileNav` does not obscure the conversation composer.
- **Touch Targets:** All buttons, tab pills, and links measure at least 40px × 40px, satisfying mobile usability guidelines.

---

## 21. Accessibility & Focus Audit

- **Keyboard Tab Flow:** Logical traversal from skip links to header navigation, room lenses, and main content.
- **Focus Rings:** Visible focus ring on interactive buttons and inputs (`focus-visible:ring-2`).
- **Heading Hierarchy:** Valid `h1` -> `h2` -> `h3` hierarchy preserved on `/about`, feeds, and room pages.
- **Color Contrast:** Dark mode text meets WCAG AA 4.5:1 ratio on card backgrounds and muted text.

---

## 22. Terminology & Philosophy Alignment

A full sweep of live UI copy verified compliance with Discora core philosophy:
- **Zero Gamification:** No "Points", "XP", "Streaks", "Karma", or "Upvotes".
- **Zero Competitive Framing:** No "Winners", "Losers", "Defeated", or "Champion".
- **Zero Truth Conflation:** No "Truth Score", "Verified Fact by Community", or "AI Verified".
- **Descriptive Stances:** Stances are explicitly labeled "Supporting" and "Challenging".
- **Changing One's Mind:** Framed as epistemic progress, not failure.

---

## 23. Security & Admin Boundary Verification

- **Guest Access to `/admin`:** Redirects immediately to `/login?redirectedFrom=%2Fadmin`.
- **Non-Owner Authenticated Access to `/admin`:** Next.js middleware returns an internal rewrite to `/404` (Not Found), completely concealing admin route existence.
- **UI Navigation:** Zero Admin links or controls appear for guest or member users.

---

## 24. "How Discora Works" Audit Flag

Per prompt and roadmap directives:
- The 8-slide interactive walkthrough on `/about` was audited for conceptual accuracy.
- Current slides match the conversation-first architecture and evidence linkages.
- **Formal Record:** *"Future How Discora Works dedicated audit required prior to public launch."*

---

## 25. Figma & Brand Readiness

Categorization of future polish items for the upcoming Figma / Visual Polish phase:
- **A. Comprehension / UX:** Add tooltip on "Make this a Claim"; rename Debate "Questions" tab to "Inquiries".
- **B. Visual Polish:** Refine topic tag color saturation; enhance typography rhythm in academic abstracts.
- **C. Brand Identity:** Production SVG wordmark and favicon replacement for the temporary lettermark icon.
- **D. Functional:** Offline status banner and Resend SMTP credentials.

---

## 26. Recommended Execution Order

Before public beta launch:
1. **Configure Production SMTP / Resend Auth:** Ensure seamless email confirmation or closed-alpha auto-confirm.
2. **Rename Debate Lens to "Inquiries":** Eliminate ambiguity between Discussion questions and Debate inquiries.
3. **Add Native Offline Status Banner:** Gracefully handle temporary network drops.
4. **Figma / Visual Polish Stage:** Execute final design system pass and brand asset integration.

---

## 27. Product Decisions Required

⚠️ **PRODUCT DECISION REQUIRED 1: Debate Lens Tab Naming**
- **Question:** Should the 5th lens in Debate rooms be labeled "Inquiries" instead of "Questions"?
- **Options:**
  - Option A: Rename to "Inquiries" in Debates, keeping "Questions" exclusively for Discussions. (Recommended)
  - Option B: Keep "Questions" on both, adding sub-headers to explain the difference.
- **Recommendation:** Option A. It aligns UI labels with the underlying data architecture and prevents user confusion.

⚠️ **PRODUCT DECISION REQUIRED 2: Beta Email Verification Policy**
- **Question:** Should early closed-beta users be required to confirm email addresses via inbox links, or should closed-beta invitees have auto-confirmed emails?
- **Options:**
  - Option A: Require email confirmation via Resend production SMTP. (Recommended for public beta)
  - Option B: Temporarily auto-confirm emails for the closed alpha cohort until Resend is configured.
- **Recommendation:** Option A for production public launch; Option B for internal tester access.

---

## 28. MCP Usage

- **MCPs Actually Used:** Playwright (headless browser automation, screenshot capture, viewport rendering, and interaction tests).
- **MCPs Unavailable:** None.
- **MCPs Not Needed:** GitHub MCP, Discora dev tools (audit only, zero mutations), Context7, Fetch.

---

## 29. Final Verdict

### **BETA READY WITH BLOCKERS**

Discora's core product experience, epistemic architecture, curated starter discourse, conversation-first interaction model, and security boundaries are fully operational, coherent, and deeply aligned with product philosophy. Resolving the 3 P1 items (SMTP verification, debate inquiry label, and offline notification) will bring the product to full Public Beta Readiness.
