# PHASE 6B — INDEPENDENT UX, VISUAL DESIGN & PRODUCT-FEEL AUDIT

Independent UX, visual design, ergonomics, and product-feel audit for Discora.  
**Date:** 2026-09-07  
**Scope:** Working tree at `d:/Projects/Discora`.  
**Reviewer:** Independent UX / Product-Feel Audit Agent.  
**Verification Basis:** Code-verified inspection (`src/`), real browser rendering evaluation across multiple viewports (375px, 390px, 768px, 1024px, 1440px), cross-referenced with `docs/PHASE_6A_WHOLE_PRODUCT_AUDIT.md`.

---

## 1. Executive Summary

Discora possesses an exceptionally clear epistemic core. Unlike conventional social media or debate forums (e.g., Reddit, Twitter/X, Kialo, Quora), the platform successfully prioritizes **understanding over engagement**, **evidence over popularity**, and **questions before conclusions**. Its structural separation of Discussion Questions vs. Structured Inquiries, the multi-layered State of Understanding, and the respectful guest/authenticated partition provide a solid philosophical foundation.

However, from an independent visual design, ergonomic, and product-feel evaluation, the application suffers from **three systemic tensions**:

1. **Gamification Infiltration in Debate Surfaces:** The presence of a prominent **"Live Scorecard"** (`debate-scorecard.tsx`) that computes a net score (`propScore = propAgree - propDisagree`), coupled with swords/shields iconography and thumbs-up/thumbs-down counters, creates a sports-match/winner-takes-all feeling that directly contradicts Discora’s anti-gamification manifesto.
2. **Epistemic Color-Coding Drift (Traffic-Light Truth Signaling):** In both the State of Understanding (`state-of-understanding.tsx`) and Claim Voting (`claim-list.tsx`), emerald-green (`#22c55e`) and rose-red (`#ef4444`) are used to represent "Supported" vs. "Contested" and "Agree" vs. "Disagree." This implicitly signals that "Green = Correct/True" and "Red = False/Bad," sliding into popular consensus acting as a proxy for truth.
3. **Mobile & Viewport Ergonomic Bottlenecks:** On mobile viewports (375px–390px), the bottom navigation bar squeezes 7 to 8 interactive items into a single row (`mobile-nav.tsx`), compressing touch targets below 46px and violating WCAG touch target recommendations. On desktop viewports (1024px), sidebar items and tab navigation suffer from vertical clipping and horizontal overflow without scroll indicators.

### Audit Summary Statistics
- **P0 (Critical Blockers):** 0
- **P1 (High Priority UX/Epistemic Risks):** 4
- **P2 (Medium Priority Ergonomic & Layout Gaps):** 5
- **P3 (Low Priority Visual Polish & Contrast Tweaks):** 3
- **Final UX / Visual Verdict:** **CONDITIONAL PASS (UX & EPISTEMIC REFINEMENT REQUIRED)**
- **Interactive Browser Inspection Performed:** **YES** (Evaluated across 375px, 390px, 768px, 1024px, 1440px).
- **Authenticated QA:** Authenticated QA was performed successfully.


---

## 2. UX & Visual Architecture

### 2.1 Design Tokens & CSS Architecture
- **Location:** [`src/app/globals.css`](file:///d:/Projects/Discora/src/app/globals.css)
- **Palette & Contrast:** The palette leverages tailored dark mode surfaces (`--background: #09090b`, `--card: #111113`, `--border: #27272a`). Overall text legibility is strong on primary surfaces (`--foreground: #f4f4f5`).
- **Domain Accent Tokens:** Dedicated CSS variables are established for entity types:
  - `--discora-claim: #3b82f6` (Blue)
  - `--discora-evidence: #22c55e` (Emerald Green)
  - `--discora-question: #eab308` (Yellow/Amber)
  - `--discora-source: #a855f7` (Purple)
  - `--discora-debate: #ef4444` (Rose/Red)
  - `--discora-moderation: #f97316` (Orange)
- **Critique:** While assigning distinct hues to domain primitives is sound, mapping `--discora-evidence` to bright green and `--discora-debate` to bright red primes users for binary confirmation bias. Evidence should represent citation grounding (e.g., slate/cyan/teal), not moral or factual correctness.

### 2.2 Typography & Reading Hierarchy
- Typography is clean, utilizing modern sans-serif fonts with distinct weight hierarchy (`font-extrabold` for section headers, `font-medium` for body assertions).
- In long-form premise statements and discussion threads, body text is set to `text-xs` (12px) or `text-sm` (14px). While compact, extensive reading of dense empirical citations at 12px creates eye fatigue on higher-density screens. Body text for core claims and evidence should be standardized to a minimum of 14px (`text-sm`) with `leading-relaxed`.

### 2.3 Visual Density & Spacing
- Discora adopts a dense, data-rich aesthetic reminiscent of Bloomberg terminals or scientific notebooks. This suits analytical users well.
- However, container padding frequently collapses from `p-6` down to `p-3` without proportional adjustments in internal child margins, resulting in visual "card-within-card" clutter in nested comment threads and evidence drawers.

---

## 3. Homepage & Discovery UX

### 3.1 Guest Experience
- **File:** [`src/features/homepage/components/guest-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/guest-homepage.tsx)
- **Strengths:**
  - Clear, unpretentious hero banner explaining Discora’s mission ("Understanding over engagement").
  - The "How Discora Works" discovery trigger is clearly accessible.
  - Guest cards provide full read access to public discussions and debates without aggressive authentication walls.
- **Weaknesses:**
  - On narrow viewports (375px–390px), the hero headline "Structured Discussion & Debate" wraps tightly and clips button groups.
  - The hero search bar and CTA buttons ("Explore Discussions", "View Debates") lack sufficient vertical breathing room when wrapped.

### 3.2 Logged-In Dashboard Experience
- **File:** [`src/features/homepage/components/logged-in-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/logged-in-homepage.tsx)
- **Cognitive Load & Information Satiation:** The logged-in homepage stacks more than 10 disparate functional panels vertically:
  1. First User / Onboarding Checklist Banner
  2. Discovery Deck Trigger
  3. Platform Metrics Bar
  4. Recently Engaged Rooms
  5. Saved Discussions / Bookmarks
  6. Featured Structured Inquiries
  7. Active Discussions Feed
  8. Recent Debates Feed
  9. Leaderboard Teaser
  10. System Feedback Prompt
- **Critique:** Stacking all features in a single vertical stream creates excessive cognitive load and triggers a heavy initial query fan-out (~10 parallel TanStack queries). A structured split ("Your Workspace / Active Inquiries" vs. "Commons Feed") would significantly improve user focus.

---

## 4. Discussion UX

### 4.1 Room Shell & Navigation
- **File:** [`src/features/rooms/components/room-section-shell.tsx`](file:///d:/Projects/Discora/src/features/rooms/components/room-section-shell.tsx)
- **Navigation Tabs:** Overview, Claims, Evidence, Questions, Contributions.
- **UX Strength:** Breadcrumb context, room topic framing, and participant badges provide immediate situational awareness.
- **Save Integration:** Single clean `SaveButton` in the room header allows private bookmarking without social vanity metrics.

### 4.2 State of Understanding
- **File:** [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
- **Pillars:** Three-column grid across "Supported by Current Evidence", "Contested / Mixed Evidence", and "Unresolved Inquiries".
- **Visual Concerns:**
  - Column 1 uses a prominent green border (`border-emerald-500/30`) and announces `N verified claims`. As identified in the Epistemic Audit, evidence *supports* or *grounds* a claim; it does not "verify" an absolute truth.
  - Column 2 uses a stark red/rose border (`border-rose-500/30`) labeled `active dispute`. This visual treatment resembles error states or warnings, discouraging users from exploring contested claims where constructive nuance is most needed.
  - On mobile (<1024px), the 3-column layout collapses into a segmented control, which functions cleanly and preserves screen estate.

### 4.3 Claims Stream & Voting
- **File:** [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx)
- **Stance & Voting Widget:** Lines 740–780 render a `ThumbsUp` / `ThumbsDown` voting pill with active green/red states and a mini progress bar displaying `claim.consensusRatio`.
- **Epistemic Hazard:**
  - `ThumbsUp` and `ThumbsDown` are universally recognized social-media engagement icons (YouTube, Reddit, Facebook). They encourage emotional agreement/disagreement rather than epistemic appraisal.
  - The progress bar visually rewards high consensus (green fill) and penalizes low consensus (red fill), directly conflating majority popularity with evidentiary validity.

---

## 5. Debate UX

### 5.1 Architecture & Sides
- **File:** [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx)
- **Distinct Experience:** Debates successfully require participants to choose a stance (Proposition vs. Opposition) and mandate an epistemic justification when switching sides (`switch_debate_side` RPC). This is one of Discora’s strongest UX achievements.

### 5.2 The "Live Scorecard" Defect
- **File:** [`src/features/debates/components/debate-scorecard.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-scorecard.tsx)
- **Observation:**
  - Header: `Live Scorecard` with `BarChart3` and `Swords` / `Shield` icons.
  - Code:
    ```tsx
    const propScore = propAgree - propDisagree;
    const oppScore = oppAgree - oppDisagree;
    ```
  - Visual output: Displays a large bold number (`propScore` vs `oppScore`) styled like a sports scoreboard (Blue Proposition vs Rose Opposition).
- **Severe Epistemic Drift:** This component turns debate into a zero-sum game where sides "win" by netting more upvotes than downvotes. It encourages brigade voting and directly violates Principle 16 ("Debate must NOT feel like: a game, a sports scoreboard, winner-takes-all entertainment").

### 5.3 Duplicate Save Buttons
- Both `DebateHeaderV2` and `DebatePremise` render independent `SaveButton` components within ~150px of each other. This creates visual clutter and causes user uncertainty regarding whether saving the premise differs from saving the debate room.

---

## 6. Structured Inquiries UX

### 6.1 Epistemic Separation
- **Files:** [`src/features/inquiries/components/inquiry-detail.tsx`](file:///d:/Projects/Discora/src/features/inquiries/components/inquiry-detail.tsx), [`src/features/debates/components/debate-inquiries-tab.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-inquiries-tab.tsx)
- **Distinction:** Structured Inquiries are tightly coupled to a target claim, prompting targeted empirical follow-ups (`clarification`, `evidence_request`, `counterexample`, `scope_limitation`).
- **UX Execution:** The target claim card is rendered prominently at the top with an amber border, clearly establishing the inquiry's parent context.
- **Recommendation:** In debate rooms, the navigation tab should be consistently titled **"Targeted Inquiries"** rather than "Inquiries" or "Questions", preventing confusion with the open-ended room questions used in discussions.

---

## 7. Mobile & Responsive Layout Audit

### 7.1 375px & 390px (Mobile Handsets)
- **Mobile Bottom Nav Cramming:**
  - `src/components/layout/mobile-nav.tsx`: Authenticated users see 8 items in `grid-cols-8` (Home, Discussions, Search, Debates, Create, Saved, Profile, Settings).
  - Each item receives only ~46px horizontal width. The 10px labels frequently wrap or collide, and touch targets fall below recommended 48px ergonomic thresholds.
- **Hero & Action Bar Clipping:**
  - Buttons in room headers and search filters do not wrap smoothly, causing horizontal overflow or clipping at 375px.

### 7.2 768px (Tablets / Foldables)
- Clean layout transition. The sidebar remains hidden, the mobile nav operates with generous spacing, and the 2-column grids on homepage and rooms render with balanced proportions.

### 7.3 1024px (Small Desktop / iPad Pro Landscape)
- **Sidebar Bottom Overlap:**
  - At 1024px height/width thresholds, the fixed left sidebar (`src/components/layout/sidebar.tsx`) extends to the bottom edge. When the Next.js development badge or browser toolbars are present, navigation items at the bottom ("How Discora Works", "Feedback") suffer from tight vertical spacing.
- **Section Nav Tab Scrolling:**
  - The sticky horizontal sub-navigation bar in discussions and debates clips the rightmost tabs ("Contributions") without a visible scroll indicator or edge-gradient fade.

### 7.4 1440px (Standard Desktop / Large Displays)
- Layout is constrained cleanly using `max-w-6xl` or `max-w-7xl` with centering. Generous margins prevent wide-screen visual fatigue.

---

## 8. Accessibility & Ergonomics

1. **Touch Target Sizing:** As noted, mobile navigation buttons measure ~46px × 64px, with active icon touch regions measuring only ~20px × 20px. Primary interactive elements should provide at least 48px × 48px hit areas.
2. **Color Contrast in Tertiary Metadata:**
   - In [`src/app/globals.css`](file:///d:/Projects/Discora/src/app/globals.css), `--muted-foreground` is set to `#a1a1aa`. In multiple components, this is combined with opacity modifiers like `text-muted-foreground/60` or `text-[9px]`. Under dark mode, this yields a contrast ratio of ~3.2:1, failing WCAG AA (requires 4.5:1 for small text).
3. **Screen Reader Semantic Hierarchy:**
   - The State of Understanding and Debate Scorecard properly leverage `aria-labelledby` and `role="region"`.
   - However, claim voting buttons (`ClaimVoting`) lack explicit `aria-pressed` states to indicate whether the current user has already cast a vote.

---

## 9. Epistemic Visual Language

| Current Element | Visual Treatment | Epistemic Risk | Recommended Redesign |
|---|---|---|---|
| **Claim Voting** | Thumbs-Up / Thumbs-Down icons with emerald/rose active states | Resembles social media popularity/like buttons; frames claims as likeable vs. unlikable | Replace with stance chips: "Plausible / Evidenced" vs "Doubted / Unsubstantiated" without thumbs icons |
| **Consensus Ratio Bar** | Green-filled progress bar showing percentage of agreement | Conflates popular majority agreement with objective truth | Display total assessments neutrally (e.g., "12 community evaluations") without a green victory fill |
| **Debate Scorecard** | "Live Scorecard" with Swords/Shield and net point score (`Agree - Disagree`) | Directly introduces sports gamification and zero-sum contest framing | Replace with "Argument & Evidence Mapping" displaying claim counts and cited sources per side |
| **State of Understanding** | Green "Verified claims" card vs. Red "Dispute" card | Binary truth labeling ("verified" vs "disputed") induces confirmation bias | Soften to neutral informational borders (slate/indigo for cited support, warm amber for active inquiry) |
| **Evidence Quality** | Raw citation counts | Implies more links = more true | Visual distinction for source domain diversity and peer-reviewed vs. informal citations |

---

## 10. Prioritized Actionable Recommendations

### High Priority (P1)

#### P1-UX-001: Eliminate Debate "Live Scorecard" Gamification & Net Score
- **File:** [`src/features/debates/components/debate-scorecard.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-scorecard.tsx)
- **Observation:** Header is titled "Live Scorecard", computes `propScore = propAgree - propDisagree`, and presents points like an athletic competition.
- **Recommendation:** Replace this component with an **"Argument & Evidence Overview"**. Remove net score math completely. Display side distribution in terms of asserted arguments, cited empirical sources, and open structured inquiries.

#### P1-UX-002: Refactor Mobile Bottom Navigation Bar (WCAG Touch Target Compliance)
- **File:** [`src/components/layout/mobile-nav.tsx`](file:///d:/Projects/Discora/src/components/layout/mobile-nav.tsx)
- **Observation:** 8 items crowded into a single bottom row on mobile viewports (<390px), shrinking touch targets to ~46px.
- **Recommendation:** Restructure mobile nav to 4 primary anchors: **Home**, **Explore (Discussions + Debates)**, **Search**, and **Menu/More** (housing Saved, Profile, Settings, Onboarding Guide).

#### P1-UX-003: Neutralize Binary Green/Red Epistemic Signaling
- **Files:** [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx), [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx)
- **Observation:** Use of emerald green and rose red for "Verified" and "Contested" claims primes users for binary right/wrong judgments.
- **Recommendation:** Replace green/red with epistemically calibrated palettes: slate/indigo/cyan for cited evidentiary support, and warm amber for contested lines of inquiry. Eliminate the term "verified claim" in favor of "empirically cited claim".

#### P1-UX-004: Fix Mobile Headline & CTA Overflow on 375px/390px Viewports
- **Files:** [`src/features/homepage/components/guest-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/guest-homepage.tsx), [`src/features/rooms/components/room-section-shell.tsx`](file:///d:/Projects/Discora/src/features/rooms/components/room-section-shell.tsx)
- **Observation:** Headlines clip and CTA buttons lack `flex-wrap`, causing buttons to push past screen boundaries.
- **Recommendation:** Implement responsive typography (`text-xl sm:text-2xl md:text-3xl`), add `break-words`, and enable flex wrapping on action button clusters.

---

### Medium Priority (P2)

#### P2-UX-001: Resolve 1024px Sidebar Vertical Cramping & Section Nav Overflow
- **Files:** [`src/components/layout/sidebar.tsx`](file:///d:/Projects/Discora/src/components/layout/sidebar.tsx), [`src/features/debates/components/debate-section-nav.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-section-nav.tsx)
- **Observation:** Sidebar bottom actions sit tightly against viewport edges on 1024px screens; horizontal sub-navigation tabs overflow without edge scroll fades.
- **Recommendation:** Add scroll affordances (CSS mask gradient) to horizontal tabs; refine sidebar vertical flex distribution.

#### P2-UX-002: Add Systematic Text-Wrapping Protection for Long Unspaced Strings
- **Files:** [`src/features/debates/components/debate-premise.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-premise.tsx), [`src/features/discussions/components/comment-item.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/comment-item.tsx)
- **Observation:** Unbroken strings (e.g. URLs or long compound technical terms) overflow card boundaries.
- **Recommendation:** Add `break-words` and `overflow-hidden` across all user content wrappers.

#### P2-UX-003: Streamline Logged-In Homepage Information Architecture
- **File:** [`src/features/homepage/components/logged-in-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/logged-in-homepage.tsx)
- **Observation:** Stacking 10+ sequential modules creates cognitive fatigue and heavy initial query loading.
- **Recommendation:** Organize into two digestible tabs or sections: "My Deliberations" (Checklist, Saved, Inquiries, Recent) and "Public Commons" (Discussions & Debates feed).

#### P2-UX-004: Deduplicate Save Buttons in Debate Rooms
- **Files:** [`src/features/debates/components/debate-header-v2.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-header-v2.tsx), [`src/features/debates/components/debate-premise.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-premise.tsx)
- **Observation:** Redundant SaveButtons rendered within 150px of each other in the header and opening premise.
- **Recommendation:** Retain `SaveButton` strictly in the top-level room header; remove from the premise card.

#### P2-UX-005: Enforce Clear Visual Branding for Structured Inquiries in Debates
- **File:** [`src/features/debates/components/debate-section-nav.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-section-nav.tsx)
- **Observation:** Inquiries tab in debates can be mistaken for discussion-level open questions.
- **Recommendation:** Label as "Targeted Inquiries" and attach amber inquiry badge icon.

---

### Low Priority (P3)

#### P3-UX-001: Standardize Micro-Interaction Timing & Focus Rings
- **Component:** Core UI components
- **Recommendation:** Standardize all hover/focus transitions to `duration-150 ease-out` and use consistent `focus-visible:ring-2 focus-visible:ring-primary/50`.

#### P3-UX-002: Mitigate Layout Shift (CLS) on Skeleton Loaders
- **Files:** [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx), [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx)
- **Recommendation:** Align skeleton card placeholder heights with the average hydrated card dimensions (~120px).

#### P3-UX-003: Calibrate Dark Mode Tertiary Text Contrast
- **File:** [`src/app/globals.css`](file:///d:/Projects/Discora/src/app/globals.css)
- **Recommendation:** Restrict minimum opacity on `--muted-foreground` text elements to ensure a minimum 4.5:1 contrast ratio against card backgrounds.

---

## 11. Final UX / Visual Verdict

### **Verdict: CONDITIONAL PASS (UX & EPISTEMIC REFINEMENT REQUIRED)**

Discora's visual design is disciplined, modern, and serious. It avoids the neon distractions, engagement loops, and superficial badge clutter that plague contemporary web applications.

However, to truly fulfill its epistemic mission, Discora must **expel all traces of sports-style gamification from debates (P1-UX-001)** and **move beyond binary green/red truth signaling (P1-UX-003)**. Addressing these alongside the **mobile navigation ergonomics (P1-UX-002)** will elevate Discora from an impressive functional prototype into a world-class epistemic institution for human understanding.
