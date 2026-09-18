# Discora — “How Discora Works” Dedicated Audit Report

**Date:** September 13, 2026  
**Auditor:** Discora Engineering & Product Audit Agent  
**Mode:** AUDIT ONLY — NO IMPLEMENTATION  
**Target Surface:** “How Discora Works” First-Use Explanatory Ecosystem (`/about`, `DiscoveryDeckModal`, `GuestHomepage`, `RoomGuideCard`)  
**Verdict:** **PASS WITH NOTED REMEDIATIONS (NO P0 BLOCKERS; 2 P1s, 4 P2s, 2 P3s)**  

---

## 1. Executive Summary

As Discora prepares for public beta, this audit evaluates the entire onboarding and explanatory architecture that introduces new visitors to the platform. 

Every first-time visitor arriving at `https://discora.com/` without a session cookie is automatically 307-redirected by `src/services/supabase/middleware.ts` to `/about`. Therefore, the `/about` presentation, together with the `DiscoveryDeckModal` ("How Discora Works"), the `GuestHomepage` 4-step workflow, and contextual `RoomGuideCard` banners, forms the primary mental-model engine of Discora.

### Core Verdict
The core philosophical integrity and explanatory quality of Discora are **extraordinarily strong**. Discora avoids the standard traps of engagement-driven platforms: it does not equate popularity with truth, it treats changing one's mind as an achievement rather than a loss, it firmly rejects AI-as-an-oracle, and it provides an exceptionally clear decomposition of unstructured commentary into claims, evidence, and deterministic states of understanding.

However, the audit identified **2 critical P1 issues** and **4 P2 improvements** that require attention before public beta launch:
1. **P1: "Tracks Consensus" Copy Bug on Guest Homepage:** Step 4 of the guest homepage describes understanding as *"Transparent disagreement maps track consensus..."*. This directly violates Discora’s foundational philosophy (`docs/00_MASTER_CONTEXT.md` explicitly states: *"Discora doesn't try to prevent conflict or enforce consensus"*). Discora maps evidence and divergence, never consensus.
2. **P1: Total Omission of the Debate Model on `/about`:** While `/about` gives a masterclass on the 6 layers of a Discussion room, it **completely fails to introduce the Debate model** (Proposition vs. Opposition, motion deliberation, side-switching). A new user landing on `/about` learns only half of Discora's product model and will not understand why Debates exist in the main navigation.
3. **P2: "Truth-Seeking" Framing in Room Guides:** The discussion guide card refers to *"Collaborative Truth-Seeking"*, subtly violating the core epistemic principle that Discora enables rigorous examination rather than claiming to manufacture absolute Truth.
4. **P2: "Open Inquiries" Conflation in Homepage Copy:** Step 1 describes Discussion Questions as *"Open inquiries"*, blurring the boundary with claim-targeted Structured Inquiries.
5. **P2: Mobile Nav Access to Discovery Deck:** On mobile viewports, the Discovery Deck modal cannot be triggered from navigation (the sidebar button is hidden on mobile and absent from the mobile "More" menu).

**There are ZERO P0 blockers.** The platform is functionally intact, responsive, and intellectually honest.

---

## 2. Audit Scope

The audit examined all user-facing surfaces and code responsible for explaining Discora to a first-time visitor:
1. **First-Visit Routing Mechanics:** `src/services/supabase/middleware.ts` (first-arrival redirection to `/about`).
2. **The `/about` Presentation Page:** `src/app/about/page.tsx` and `src/features/about/components/about-page-client.tsx` (9 sequential interactive sections).
3. **The Discovery Deck Modal:** `src/features/onboarding/components/discovery-deck-modal.tsx`, `use-onboarding.ts`, and `epistemic-sandbox.tsx` (4-tab interactive guide).
4. **Guest Homepage Explanatory Section:** `src/features/homepage/components/guest-homepage.tsx` (4-step progression card cluster).
5. **In-Room Contextual Guides:** `src/features/onboarding/components/room-guide-card.tsx` (Discussion and Debate banners).
6. **Navigation Triggers:** `src/components/layout/sidebar.tsx` and `src/components/layout/mobile-nav.tsx`.

---

## 3. Documents Reviewed

- [docs/DISCORA_AGENT_GOVERNANCE.md](file:///D:/Projects/Discora/docs/DISCORA_AGENT_GOVERNANCE.md)
- [docs/00_MASTER_CONTEXT.md](file:///D:/Projects/Discora/docs/00_MASTER_CONTEXT.md)
- [docs/01_PRD.md](file:///D:/Projects/Discora/docs/01_PRD.md)
- [docs/02_FEATURE_REGISTRY.md](file:///D:/Projects/Discora/docs/02_FEATURE_REGISTRY.md)
- [docs/03_USER_FLOWS.md](file:///D:/Projects/Discora/docs/03_USER_FLOWS.md)
- [docs/23_KNOWLEDGE_MODEL.md](file:///D:/Projects/Discora/docs/23_KNOWLEDGE_MODEL.md)
- [docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md](file:///D:/Projects/Discora/docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md)
- [docs/PHASE_6E_WINNER_LOSER_REMOVAL_REPORT.md](file:///D:/Projects/Discora/docs/PHASE_6E_WINNER_LOSER_REMOVAL_REPORT.md)
- [docs/PHASE_8E_FIRST_USE_BETA_JOURNEY_AUDIT.md](file:///D:/Projects/Discora/docs/PHASE_8E_FIRST_USE_BETA_JOURNEY_AUDIT.md)
- [docs/PHASE_8F_PUBLIC_BETA_BLOCKER_RESOLUTION.md](file:///D:/Projects/Discora/docs/PHASE_8F_PUBLIC_BETA_BLOCKER_RESOLUTION.md)

---

## 4. Current Experience Assessment

### Surface Inventory & Entry Points

```
                                  [Brand New Visitor lands at /]
                                                │
                                    (discora_visited cookie?)
                                       ┌────────┴────────┐
                                    NO │                 │ YES
                                       ▼                 ▼
                                    /about        Guest Homepage (/)
                                       │                 │
                             ┌─────────┴─────────┐       │
                             ▼                   ▼       ▼
                       Read 9-Section     Click CTAs   Click "Interactive
                        Presentation      Discussions/ Sandbox & Guide"
                             │             Debates       │
                             │                 │         ▼
                             └─────────────────┼───► DiscoveryDeckModal
                                               │      (The Model, Sandbox,
                                               ▼      Modes, Exploration)
                                         Discussion/Debate
                                               Rooms
                                               │
                                               ▼
                                         RoomGuideCard
                                       (Contextual Banner)
```

1. **First Arrival (`/about`)**: The visitor experiences an immersive 9-section slide/scroll narrative explaining why internet discussions fail, how Discora layers structure onto conversational messages, how Claims, Evidence, and State of Understanding operate, the core philosophy of disagreement, and strict AI boundaries.
2. **The Modal (`DiscoveryDeckModal`)**: Triggered from the sidebar ("How Discora Works"), the guest homepage ("Interactive Sandbox & Guide"), or the settings menu. Contains a 4-tab interactive walkthrough featuring a live simulated claim with toggleable evidence.
3. **Guest Homepage ("How Discora Works")**: Four compact cards mapping Step 1 (Questions) → Step 2 (Claims) → Step 3 (Evidence) → Step 4 (Understanding).
4. **Room Guide Cards (`RoomGuideCard`)**: First-run dismissible banners at the top of rooms summarizing the purpose of the space.

---

## 5. First-Time User Comprehension Findings

| Comprehension Dimension | Assessment | Verdict | Notes |
|---|---|---|---|
| **What Discora is** | High clarity. Contrasted immediately with reaction-driven social media. | **PASS** | Hero and Problem sections establish the value proposition within 10 seconds. |
| **What to do in a Discussion** | High clarity. Post messages → formalize claims → attach evidence. | **PASS** | Visual diagram on `/about` and Tab 1 of Discovery Deck make the workflow tangible. |
| **What to do in a Debate** | **Deficient on `/about`**. Well-explained in Discovery Deck. | **FAIL (P1)** | `/about` completely neglects Debates. A user who only reads `/about` has no idea how Debates work. |
| **Discussion vs Debate Distinction** | Clear in Discovery Deck Tab 3; completely missing on `/about`. | **PARTIAL (P1)** | Discovery Deck explains it brilliantly; `/about` needs a corresponding section. |
| **Claims & Evidence** | High clarity. Separated into Supporting, Contradicting, Contextual. | **PASS** | Exemplary decomposition; distinguishes raw opinion from empirical backing. |
| **Sources** | High clarity. Sources validate evidence cards. | **PASS** | Verifiable references explicitly shown. |
| **Discussion Questions vs Debate Inquiries** | Good distinction in Deck; terminology slightly blurred on homepage. | **PASS w/ MINOR** | Homepage Step 1 calls Questions "Open inquiries", risking confusion. |
| **Arguments** | Clear. Reasoned positions formed on claims. | **PASS** | Treated as structured reasoning, not rhetorical point-scoring. |
| **State of Understanding** | High clarity. Deterministic summary of evidence balance. | **PASS** | Explicitly stated: not a vote, not an AI verdict, not a consensus score. |
| **Understanding over Winning** | High clarity. Core thesis repeated throughout all surfaces. | **PASS** | "Not a place to win arguments. A place to understand them." |
| **Changing your mind is not losing** | High clarity. Explicitly highlighted as an epistemic achievement. | **PASS** | Side-switching in debates is celebrated as integrity. |

---

## 6. Product Accuracy Findings

### 6.1 Features Described vs Implemented
- **AI Boundaries:** `/about` accurately describes AI as **planned future functionality** and explicitly notes: *"Planned functionality: AI assistance is planned for future updates. These capabilities are not yet available in the current beta."* This prevents user over-expectation and maintains complete honesty.
- **Epistemic Engine:** The 6 layers described on `/about` (Message → Claim → Evidence → Arguments → Targeted Inquiries → State of Understanding) map 1:1 with Discora's implemented database schema and room section tabs (`/claims`, `/evidence`, `/questions`, `/contributions`, `/understanding`).
- **Debate Stance & Side Switching:** Correctly documented in Discovery Deck Tab 3 and implemented in `src/features/debates/components/debate-side-selector.tsx`.

### 6.2 Discrepancies and Inaccuracies
- **Lack of Debate Explanation on `/about`:** The `/about` page only introduces Discussion concepts. In section 9, the page offers a button to `"Browse debates"`, but the user has not been told what a Debate room is.
- **Offline / Network Handling:** While Phase 8F implemented native offline banners across rooms, the static guides do not mention offline draft resilience (minor, non-blocking).

---

## 7. Philosophical Alignment Findings

Every explanatory statement was checked against Discora's anti-drift principles.

### 7.1 Popularity / Consensus vs Truth
- ⚠️ **VIOLATION (Finding F-01, Severity P1)**:
  - **Location:** `src/features/homepage/components/guest-homepage.tsx`, line 156
  - **Current Text:** `"Transparent disagreement maps track consensus and show positions evolving based on evidence."`
  - **Governing Source:** `docs/00_MASTER_CONTEXT.md` (*"Discora doesn't try to prevent conflict or enforce consensus"*), `src/features/about/components/about-page-client.tsx`, line 608 (*"not a popularity vote, not an AI verdict, not a consensus score"*).
  - **Problem:** Using the words *"track consensus"* implies that Discora measures majority alignment or aims for uniform agreement. Discora tracks the *balance of evidence* and *divergence of reasoned positions*, never consensus.

### 7.2 Epistemic Humility & "Truth" Claims
- ⚠️ **CONCERN (Finding F-02, Severity P2)**:
  - **Location:** `src/features/onboarding/components/room-guide-card.tsx`, line 33
  - **Current Text:** `title: "Discussion Room: Collaborative Truth-Seeking"`
  - **Governing Source:** `docs/00_MASTER_CONTEXT.md` (*"Discora is built on understanding over engagement, evidence over popularity... changing one's mind based on evidence is a feature"*).
  - **Problem:** Declaring the room to be for "Truth-Seeking" carries dogmatic undertones that conflict with Discora's commitment to epistemic humility and mapping the current state of understanding without declaring absolute Truth.
  - **Recommendation:** Change title to `"Discussion Room: Collaborative Inquiry"` or `"Discussion Room: Collaborative Understanding"`.

### 7.3 Game Mechanics, Scoring, and Winners/Losers
- **Audit Result:** **100% CLEAN**. Zero occurrences of leaderboards as status symbols, zero references to debate "winners" or "scorecards", zero resolution scores. Phase 6E's winner/loser removal is fully respected.

### 7.4 AI Authority
- **Audit Result:** **100% CLEAN**. AI is explicitly framed as an unopinionated comprehension tool with strict prohibitions against determining truth, declaring winners, or enforcing ideological outcomes.

---

## 8. Terminology Findings

| Surface | Term Used | Governing Standard | Assessment |
|---|---|---|---|
| `GuestHomepage` Step 1 | "Open inquiries" | Discussion: "Questions" / Debate: "Inquiries" | **CONCERN (P2)**: Conflates Discussion Questions with Debate Inquiries. Should say "Open questions". |
| `GuestHomepage` Step 2 | "Claims" | Claims | **ALIGNED** |
| `GuestHomepage` Step 3 | "Evidence" | Evidence & Sources | **ALIGNED** |
| `GuestHomepage` Step 4 | "track consensus" | State of Understanding | **VIOLATION (P1)**: Must be replaced with "tracks evidence" or "maps understanding". |
| `about-page-client` Layer 5 | "Targeted Inquiries" | Inquiries (`inquiry_items`) | **ALIGNED** |
| `about-page-client` Layer 6 | "State of Understanding" | State of Understanding | **ALIGNED** |
| Discovery Deck Tab 1 | "Discussion Questions" & "Structured Inquiries" | Strict distinction | **ALIGNED** |
| Discovery Deck Tab 2 | "Supported", "Contested", "Unresolved" | Epistemic status vocabulary | **ALIGNED** |
| Room Guide Card (Debate) | "Proposition and Opposition" | Debate side terminology | **ALIGNED** |

---

## 9. Information Architecture Findings

### 9.1 Narrative Flow Evaluation
The `/about` page narrative flows logically:
1. **The Problem** (Reaction economy, loud voices drowning careful ones, tribalism)
2. **Why Discora Exists** (Structuring disagreement without removing freedom to disagree)
3. **Conversational Base** (Starts with natural chat messages; non-academic feel)
4. **Progressive Structuring** (Message → Claim → Evidence → Arguments → Inquiries → State of Understanding)
5. **Evidence Taxonomy** (Supporting, Contradicting, Contextual)
6. **Epistemic Ethics** (Changing your mind is not losing; attack claims, not people)
7. **AI Boundaries** (Planned assistance vs strict epistemic limits)
8. **Vision & Call to Action** (Understand arguments, don't win them)

### 9.2 Structural Gaps
- **Omission of Debate Architecture:** The flow on `/about` abruptly ends with links to both "Enter a discussion" and "Browse debates", but the page never explained what a Debate room actually is.
- **Homepage Loop:** Once a user reads `/about`, there is no direct link to return to the root dashboard (`/`) if they wish to see the guest homepage feed.

---

## 10. Trust & Honesty Findings

| Integrity Criterion | Finding | Assessment |
|---|---|---|
| **Fabricated Metrics or Counts** | None. No fake "over 10,000 users agree" claims or synthetic statistics. | **PASS** |
| **Illustrative Examples Disclaimed** | `/about` conversation excerpt is clearly badged: *"Discussion excerpt · Illustrative example"*. Discovery Deck sandbox is clearly badged: *"Interactive example — not live Discora data"*. | **PASS** |
| **AI Capabilities Disclaimed** | Prominent warning banner: *"Planned functionality: AI assistance is planned for future updates. These capabilities are not yet available in the current beta."* | **PASS** |
| **Epistemic Modesty** | Consistently describes Discora as a tool to map claims and evidence, never as an infallible arbiter of truth. | **PASS** |

---

## 11. Browser QA Results

Automated Playwright QA executed via `scripts/how-discora-works-audit-qa.mjs` against the running Next.js application at `http://localhost:3003`.

### 11.1 Viewport Verification Matrix

| Viewport | Device Target | `/about` Overflow | Modal Overflow | Visual Artifact Captured |
|---|---|---|---|---|
| **375 × 667 px** | iPhone SE (Mobile) | **No** (false) | **No** (false) | `docs/visual_qa/how_discora_works/about_mobile_375.png`<br>`deck_modal_mobile_375.png` |
| **390 × 844 px** | iPhone 14/15 (Mobile) | **No** (false) | **No** (false) | `docs/visual_qa/how_discora_works/about_mobile_390.png`<br>`deck_modal_mobile_390.png` |
| **834 × 1194 px** | iPad Air (Tablet) | **No** (false) | **No** (false) | `docs/visual_qa/how_discora_works/about_tablet_834.png`<br>`deck_modal_tablet_834.png` |
| **1440 × 900 px** | Standard Desktop | **No** (false) | **No** (false) | `docs/visual_qa/how_discora_works/about_desktop_1440.png`<br>`deck_tab_*_1440.png` |

### 11.2 Interactive Component Verification
- **First-Visit Middleware Redirect:** Visiting `http://localhost:3003/` without cookies successfully 307-redirects to `http://localhost:3003/about`.
- **Discovery Deck Tab Switching:** All 4 tabs (`model`, `sandbox`, `modes`, `interests`) switch smoothly and retain focus without layout shift.
- **Epistemic Sandbox Interactivity:**
  - Clicking `+ Supporting Evidence` transitions claim state from "Limited Support" to "State: More Supported" (captured in `sandbox_supported.png`).
  - Clicking `+ Counter-Evidence` transitions state to "State: Mixed / Contested" (captured in `sandbox_contested.png`).
  - Clicking `Show Inquiry Example` expands the structured inquiry drawer with claim-targeted criteria (captured in `sandbox_inquiry_open.png`).
- **Room Guide Banners:** Both Discussion and Debate rooms render contextual guide banners cleanly below room headers on first entry.
- **Mobile Navigation Observation:** On mobile viewports (< 768px), the desktop sidebar is hidden. In the mobile bottom navigation bar (`MobileNav`), "About" is present under the "More" drawer, but the "How Discora Works" button (Discovery Deck trigger) is omitted.

---

## 12. Detailed Findings & Severity Classification

### Severity Definitions
- **P0**: Blocks public beta / materially misleading / violates hard security boundary.
- **P1**: Significant comprehension or trust problem / contradicts core philosophy.
- **P2**: Meaningful usability, architectural, or terminology improvement.
- **P3**: Polish / cosmetic / optional refinement.

---

### Finding HDW-01: Guest Homepage Step 4 Contradicts Philosophy by Claiming Discora "Tracks Consensus"
- **Location:** `src/features/homepage/components/guest-homepage.tsx:156`
- **Current Behavior/Text:** `description: "Transparent disagreement maps track consensus and show positions evolving based on evidence."`
- **Governing Source:** `docs/00_MASTER_CONTEXT.md` (*"Discora doesn't try to prevent conflict or enforce consensus"*), `src/features/about/components/about-page-client.tsx:608` (*"not a popularity vote, not an AI verdict, not a consensus score"*).
- **Problem:** Directly implies Discora aims for or measures consensus. Discora tracks evidence balance and structured disagreement, never consensus.
- **Severity:** **P1**
- **Recommendation:** Replace with: `"Transparent disagreement maps track the balance of evidence and show positions evolving based on verifiable claims."`
- **Product-Owner Approval Required:** Yes.

---

### Finding HDW-02: `/about` Page Completely Omits the Debate Room Model
- **Location:** `src/features/about/components/about-page-client.tsx` (all sections)
- **Current Behavior/Text:** Explains all 6 layers of Discussion rooms; never mentions Debates, motions, Proposition vs Opposition, or side-switching until a bare footer CTA link to "Browse debates".
- **Governing Source:** `docs/00_MASTER_CONTEXT.md`, `docs/01_PRD.md`, `docs/02_FEATURE_REGISTRY.md`.
- **Problem:** First-time visitors arriving via the first-visit redirect get an incomplete mental model of the product and will not understand why Debates exist as a distinct primary navigation mode.
- **Severity:** **P1**
- **Recommendation:** In Section 5 ("The Understanding Layer") or as a companion subsection, add a concise comparison card: `"Two Formats: Collaborative Discussions vs. Structured Debates"`, summarizing what is already presented in Discovery Deck Tab 3.
- **Product-Owner Approval Required:** Yes.

---

### Finding HDW-03: "Collaborative Truth-Seeking" Header in Discussion Room Guide Banner
- **Location:** `src/features/onboarding/components/room-guide-card.tsx:33`
- **Current Behavior/Text:** `title: "Discussion Room: Collaborative Truth-Seeking"`
- **Governing Source:** `docs/00_MASTER_CONTEXT.md`, `docs/DISCORA_AGENT_GOVERNANCE.md`.
- **Problem:** Discora avoids claiming to deliver absolute capital-T "Truth". Discora facilitates collaborative inquiry and rigorous understanding based on available evidence.
- **Severity:** **P2**
- **Recommendation:** Change title to: `"Discussion Room: Collaborative Inquiry"` or `"Discussion Room: Collaborative Understanding"`.
- **Product-Owner Approval Required:** Yes.

---

### Finding HDW-04: Conflation of "Open Inquiries" with Discussion Questions in Homepage Copy
- **Location:** `src/features/homepage/components/guest-homepage.tsx:135`
- **Current Behavior/Text:** `description: "Open inquiries frame key facets and define what the discussion is exploring."`
- **Governing Source:** Discora Terminology Standard (Discussion: Questions; Debate: Inquiries).
- **Problem:** Uses "inquiries" to describe Discussion Questions. In Discora, "Inquiries" refers to claim-targeted Structured Inquiries (`inquiry_items`), while Discussion Questions are exploratory prompts.
- **Severity:** **P2**
- **Recommendation:** Replace with: `"Open questions frame key facets and define what the discussion is exploring."`
- **Product-Owner Approval Required:** No (aligns with approved terminology).

---

### Finding HDW-05: Missing Discovery Deck Trigger in Mobile Navigation
- **Location:** `src/components/layout/mobile-nav.tsx:35`
- **Current Behavior/Text:** Desktop sidebar exposes `OnboardingTriggerButton` ("How Discora Works") on all pages. Mobile users only have a link to `/about` in the "More" drawer; they cannot launch the Discovery Deck modal or interactive sandbox directly while navigating rooms.
- **Governing Source:** Phase 8E / Phase 8F Mobile Parity.
- **Problem:** Mobile users lose access to the interactive sandbox and guide once they enter rooms.
- **Severity:** **P2**
- **Recommendation:** Add a `"How Discora Works (Guide)"` item inside the `MobileNav` "More" drawer that triggers `openDeck()`.
- **Product-Owner Approval Required:** No (UX parity).

---

### Finding HDW-06: Disconnect between `/about` and Guest Homepage Navigation
- **Location:** `src/features/about/components/about-page-client.tsx:755`
- **Current Behavior/Text:** CTAs link to `/discussions` and `/debates`. There is no link back to the homepage feed (`/`).
- **Governing Source:** `docs/03_USER_FLOWS.md`.
- **Problem:** A user who finishes reading `/about` cannot immediately preview the main discovery feed on `/` without manually editing the URL bar.
- **Severity:** **P2**
- **Recommendation:** Add a tertiary link in the `/about` footer: `"Explore Platform Overview" -> /`.
- **Product-Owner Approval Required:** No.

---

### Finding HDW-07: Fast Scrolling on `/about` May Lag Fixed Section Pill
- **Location:** `src/features/about/components/about-page-client.tsx:29`
- **Current Behavior/Text:** IntersectionObserver uses `threshold: 0.12` to update `01 / 09 Next`.
- **Problem:** Rapid scrolling past multiple sections can cause the top pill counter to briefly skip or display a preceding section number before catching up.
- **Severity:** **P3**
- **Recommendation:** Polish scroll listener with a small debounce or rootMargin tuning.
- **Product-Owner Approval Required:** No.

---

### Finding HDW-08: Discovery Deck Sandbox Lacks an Explicit "Reset" Action
- **Location:** `src/features/onboarding/components/epistemic-sandbox.tsx`
- **Current Behavior/Text:** User can click Supporting Evidence and Counter-Evidence to toggle them, but there is no explicit "Reset to Baseline" button.
- **Problem:** If a user clicks both, they may not realize toggling them off returns the claim to "Limited Support".
- **Severity:** **P3**
- **Recommendation:** Add a small text button: `"Reset example"` next to the claim badge.
- **Product-Owner Approval Required:** No.

---

## 13. Summary of Findings by Severity

| Severity | Count | Issue Identifiers |
|---|---|---|
| **P0 (Blocker)** | **0** | None |
| **P1 (Significant)** | **2** | HDW-01 (Track Consensus copy), HDW-02 (Debates omitted on `/about`) |
| **P2 (Meaningful)** | **4** | HDW-03 (Truth-Seeking header), HDW-04 (Open inquiries conflation), HDW-05 (Mobile Deck trigger), HDW-06 (/about to / link) |
| **P3 (Polish)** | **2** | HDW-07 (Scroll observer polish), HDW-08 (Sandbox reset button) |
| **Total** | **8** | |

---

## 14. Product Decisions Required

Before implementing changes in the next phase, the following decisions require Product Owner approval:

1. **Approval of Copy Correction for HDW-01 (Guest Homepage Step 4):**
   - *Option A (Recommended):* Change to `"Transparent disagreement maps track the balance of evidence and show positions evolving based on verifiable claims."`
   - *Option B:* Change to `"Transparent disagreement maps clarify points of difference and show positions evolving based on evidence."`
2. **Approval of Scope for Adding Debate Explanation to `/about` (HDW-02):**
   - *Option A (Recommended):* Add a dedicated subsection to Section 5 ("From conversation to understanding") comparing Collaborative Discussions (nuanced inquiry) and Structured Debates (motion deliberation with Proposition/Opposition and side-switching), reusing the approved copy from Discovery Deck Tab 3.
   - *Option B:* Keep `/about` focused strictly on the generic 6-layer model, but add a callout box explicitly introducing the two room formats before the footer CTAs.
3. **Approval of Heading Change for HDW-03 (Room Guide Card):**
   - *Option A (Recommended):* `"Discussion Room: Collaborative Inquiry"`
   - *Option B:* `"Discussion Room: Collaborative Understanding"`

---

## 15. Final Verdict

### Is the "How Discora Works" experience safe for Public Beta?
**YES, CONDITIONAL ON RESOLVING THE TWO P1 ISSUES.**

The core foundation is extraordinarily solid:
- The decomposition of dialogue into claims, evidence, and deterministic states of understanding is intuitive and mathematically sound.
- The interactive Epistemic Sandbox in the Discovery Deck is an outstanding educational device that immediately conveys how Discora differs from social media.
- The AI boundaries are transparent, honest, and philosophically rigorous.
- Zero elements of popularity bias, scorecards, gamification, or winner/loser mechanics exist.

Resolving HDW-01 ("track consensus") and HDW-02 (introducing Debates on `/about`) will ensure that every public beta user receives a 100% philosophically aligned and complete introduction to Discora from their very first visit.

---

## 16. Remediation Status (Phase 8G Closure)

All approved remediation items (HDW-01 through HDW-06) have been resolved, validated, and verified through end-to-end Playwright testing in Phase 8G.

See the complete execution report in [`docs/PHASE_8G_HOW_DISCORA_WORKS_REMEDIATION.md`](file:///d:/Projects/Discora/docs/PHASE_8G_HOW_DISCORA_WORKS_REMEDIATION.md).

- **HDW-01 (Consensus Language):** Resolved in `guest-homepage.tsx`.
- **HDW-02 (Debates on `/about`):** Resolved in `about-page-client.tsx`.
- **HDW-03 ("Truth-Seeking" Header):** Resolved in `room-guide-card.tsx`.
- **HDW-04 (Discussion Question Terminology):** Resolved in `guest-homepage.tsx`.
- **HDW-05 (Mobile Discovery Deck Access):** Resolved in `mobile-nav.tsx`.
- **HDW-06 (`/about` -> Homepage Return Link):** Resolved in `about-page-client.tsx`.
- **Final Verdict:** **UNCONDITIONAL PASS — SAFE AND READY FOR PUBLIC BETA.**

---
*End of Audit Report.*

