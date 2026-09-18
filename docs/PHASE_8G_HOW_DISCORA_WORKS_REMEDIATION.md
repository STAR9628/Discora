# Phase 8G: "How Discora Works" Remediation Report

**Date:** September 13, 2026  
**Status:** COMPLETE & FULLY VERIFIED  
**Context:** Pre-Public Beta Epistemic & First-Use Alignment Remediation  
**Governance:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/HOW_DISCORA_WORKS_AUDIT.md`, `docs/00_MASTER_CONTEXT.md`

---

## 1. Executive Summary

In accordance with the approved scope from [`docs/HOW_DISCORA_WORKS_AUDIT.md`](file:///d:/Projects/Discora/docs/HOW_DISCORA_WORKS_AUDIT.md), Phase 8G addressed all approved remediation items (HDW-01 through HDW-06) across the codebase.

All changes were strictly limited to approved items, strictly observed Discora's philosophical guardrails (no consensus-as-truth, no popularity bias, no winner/loser scoring, no debate scorecards, no claims of absolute truth), passed strict static verification (`tsc`, `lint`, `build`), and passed 100% of the 12 browser QA checks via automated Playwright testing across 4 viewports (`375x667`, `390x844`, `834x1194`, `1440x900`).

---

## 2. Approved Scope & Changes Implemented

### HDW-01 — Fix Consensus Language
- **Target File:** [`src/features/homepage/components/guest-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/guest-homepage.tsx)
- **Problem:** Step 4 description previously stated: *"Transparent disagreement maps track consensus and show positions evolving based on evidence."* Consensus is not a Discora goal and misleads users into believing the platform forces agreement or majority rule.
- **Remediation:** Replaced with approved copy:
  ```typescript
  description: "Transparent disagreement maps track the balance of evidence and show positions evolving based on verifiable claims."
  ```
- **Guardrail Adherence:** Zero consensus, majority, vote, or winner implications introduced.

### HDW-02 — Introduce Debates on `/about`
- **Target File:** [`src/features/about/components/about-page-client.tsx`](file:///d:/Projects/Discora/src/features/about/components/about-page-client.tsx)
- **Problem:** The `/about` page only presented the abstract 6-layer structure (Message → Claim → Evidence → Arguments → Inquiries → State of Understanding) without introducing Discora's two concrete room formats (Discussions and Debates), leaving prospective users unclear on how deliberation operates.
- **Remediation:** Added a restrained, beautifully integrated subsection into Section 4 ("From conversation to understanding") titled *"Two formats for different kinds of inquiry"*:
  - **Discussions (Collaborative Inquiry):** Open-ended, exploratory inquiry into multifaceted topics; questions remain open; collaborative development of claims, evidence, and arguments to deepen understanding without forced conclusions.
  - **Debates (Structured Deliberation):** Structured examination of a defined motion with Proposition and Opposition sides; claims and evidence evaluated within the structure; participants free to switch sides based on evidence (intellectual integrity, not loss); strictly **no winners, losers, scorecards, or rhetorical point-scoring**.
- **Guardrail Adherence:** Preserved the non-competitive debate model established in the Discovery Deck without inventing new terminology or scorecards.

### HDW-03 — Fix "Truth-Seeking" Language in Room Guide
- **Target File:** [`src/features/onboarding/components/room-guide-card.tsx`](file:///d:/Projects/Discora/src/features/onboarding/components/room-guide-card.tsx)
- **Problem:** Header banner previously displayed: *"Discussion Room: Collaborative Truth-Seeking"*. In epistemic philosophy, claiming "truth-seeking" suggests the platform or room reaches absolute Truth, contrary to Discora's commitment to provisional understanding, epistemic humility, and open disagreement.
- **Remediation:** Changed to:
  ```tsx
  {isDebate
    ? "Debate Room: Deliberate Around a Motion"
    : "Discussion Room: Collaborative Inquiry"}
  ```

### HDW-04 — Fix Discussion Question Terminology
- **Target File:** [`src/features/homepage/components/guest-homepage.tsx`](file:///d:/Projects/Discora/src/features/homepage/components/guest-homepage.tsx)
- **Problem:** Step 1 in the guest homepage previously said: *"Open inquiries frame key facets and define what the discussion is exploring."* In Discora architecture, **Discussions have Questions** (open exploratory queries), while **Debates have Inquiries** (`inquiry_items` targeting claims).
- **Remediation:** Changed to:
  ```typescript
  description: "Open questions frame key facets and define what the discussion is exploring."
  ```

### HDW-05 — Mobile Discovery Deck Access
- **Target File:** [`src/components/layout/mobile-nav.tsx`](file:///d:/Projects/Discora/src/components/layout/mobile-nav.tsx)
- **Problem:** Mobile users lacked a direct, persistent entry point to the interactive Discovery Deck ("How Discora Works") from the bottom navigation bar.
- **Remediation:**
  - Added a "More" trigger to the mobile bottom navigation bar (`<MoreHorizontal className="h-5 w-5" />`).
  - Added an accessible menu popup exposing secondary destinations plus a dedicated item:
    ```tsx
    <button
      type="button"
      onClick={() => {
        setMoreOpen(false);
        openDeck();
      }}
      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors cursor-pointer"
      role="menuitem"
    >
      <Compass aria-hidden="true" className="h-4 w-4 text-primary" />
      <span>How Discora Works</span>
    </button>
    ```
  - Directly reuses the existing `useOnboarding().openDeck()` hook. No duplicate modal or state was created. Desktop navigation remains completely untouched.

### HDW-06 — `/about` → Homepage Navigation
- **Target File:** [`src/features/about/components/about-page-client.tsx`](file:///d:/Projects/Discora/src/features/about/components/about-page-client.tsx)
- **Problem:** In the `/about` page vision/footer area, users had primary CTAs to enter discussions or debates, but lacked a tertiary navigation option to return to the platform overview (`/`).
- **Remediation:** Added a restrained tertiary link below the primary CTAs:
  ```tsx
  <div className="mt-4 flex justify-center">
    <Link
      href="/"
      className="text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-colors underline-offset-4 hover:underline"
    >
      Explore Platform Overview
    </Link>
  </div>
  ```

---

## 3. Files Modified

| File | Type | Lines Changed | Description |
|---|---|---|---|
| `src/features/homepage/components/guest-homepage.tsx` | Component | ~4 lines | Replaced "track consensus" with "track the balance of evidence"; replaced "Open inquiries" with "Open questions". |
| `src/features/about/components/about-page-client.tsx` | Component | ~55 lines | Added Discussions vs Debates comparison cards in Section 4; added tertiary "Explore Platform Overview" return link. |
| `src/features/onboarding/components/room-guide-card.tsx` | Component | 1 line | Replaced "Truth-Seeking" with "Collaborative Inquiry". |
| `src/components/layout/mobile-nav.tsx` | Component | ~80 lines | Added mobile "More" menu with "How Discora Works" guide trigger invoking `openDeck()`. |
| `docs/HOW_DISCORA_WORKS_AUDIT.md` | Doc | 15 lines | Appended Section 16 closing out the audit with Phase 8G resolution reference. |

---

## 4. Static Verification Results

### 1. TypeScript Strict Type Check
```bash
npx tsc --noEmit
```
- **Exit Code:** `0`
- **Errors:** `0`
- **Result:** **PASSED**

### 2. ESLint
```bash
npm run lint
```
- **Exit Code:** `0`
- **Errors:** `0` (39 preexisting unused var warnings in unrelated script files)
- **Result:** **PASSED**

### 3. Production Build
```bash
npm run build
```
- **Exit Code:** `0`
- **Output:** All 24 routes successfully compiled and statically/dynamically generated.
- **Result:** **PASSED**

---

## 5. Playwright Browser QA & Verification Matrix

Automated verification script: [`scripts/phase8g-verification-qa.mjs`](file:///d:/Projects/Discora/scripts/phase8g-verification-qa.mjs).  
All tests executed against real Next.js application server at `http://localhost:3003`.

### Verification Criteria Results

| # | Check Description | Result | Details |
|---|---|---|---|
| **1** | Guest homepage no longer says "track consensus" | **PASS** | `track consensus` = false; `track the balance of evidence` = true |
| **2** | Guest homepage says "open questions" | **PASS** | `Open questions frame key facets...` = true; `Open inquiries...` = false |
| **3** | `/about` explains both Discussions and Debates | **PASS** | Both cards present with distinct badges, icons, and bullets |
| **4** | Debate explanation has no winner/loser language | **PASS** | Emphasizes intellectual integrity and side-switching; no scoring |
| **5** | Discussion guide says "Collaborative Inquiry" | **PASS** | `Discussion Room: Collaborative Inquiry` rendered; `Truth-Seeking` = false |
| **6** | Mobile More menu exposes "How Discora Works" | **PASS** | More button opens menu containing "How Discora Works" with Compass icon |
| **7** | Existing Discovery Deck opens from mobile | **PASS** | Clicking mobile menu item mounts `#discovery-deck-title` modal dialog |
| **8** | `/about` footer can return to `/` | **PASS** | "Explore Platform Overview" links directly to `/` |
| **9** | No horizontal overflow across all 4 viewports | **PASS** | `scrollWidth <= innerWidth` across 375px, 390px, 834px, 1440px |
| **10** | No console errors or uncaught client exceptions | **PASS** | `consoleErrors` = `[]`, `clientErrors` = `[]` |
| **11** | Existing Discovery Deck functionality remains intact | **PASS** | Modal opened, rendered steps, and dismissed cleanly |
| **12** | Terminology consistency preserved | **PASS** | Questions (Discussions) vs Inquiries (Debates) distinction respected |

### Multi-Viewport Responsiveness Matrix

| Viewport | Device Profile | `/about` Overflow | `/` (Home) Overflow | Overall Status |
|---|---|---|---|---|
| **375 x 667** | iPhone SE (Compact Mobile) | `false` | `false` | **PASS** |
| **390 x 844** | iPhone 14/15 (Standard Mobile) | `false` | `false` | **PASS** |
| **834 x 1194** | iPad Air / Mini (Tablet) | `false` | `false` | **PASS** |
| **1440 x 900** | Desktop Standard (High-res) | `false` | `false` | **PASS** |

### QA Visual Artifacts Generated
- `docs/visual_qa/phase8g_remediation/guest_homepage_step_copy.png`
- `docs/visual_qa/phase8g_remediation/room_guide_discussion_card.png`
- `docs/visual_qa/phase8g_remediation/mobile_more_menu_guide.png`
- `docs/visual_qa/phase8g_remediation/mobile_deck_opened.png`
- `docs/visual_qa/phase8g_remediation/about_footer_link.png`
- `docs/visual_qa/phase8g_remediation/remediation_375x667.png`
- `docs/visual_qa/phase8g_remediation/remediation_390x844.png`
- `docs/visual_qa/phase8g_remediation/remediation_834x1194.png`
- `docs/visual_qa/phase8g_remediation/remediation_1440x900.png`
- `docs/visual_qa/phase8g_remediation/phase8g_qa_results.json`

---

## 6. Remaining P2 / P3 Status

Per the instructions:
> *"DO NOT implement HDW-07 or HDW-08 unless they can be completed as truly trivial, isolated changes without expanding scope. They are NOT beta blockers. Prefer leaving them untouched."*

- **HDW-07 (Discovery Deck step 6 naming nuance):** Untouched. Remains a post-beta polish item.
- **HDW-08 (Static `/about` step count vs Discovery Deck tab count):** Untouched. Both views represent complementary conceptual depths and do not block user understanding.

---

## 7. Final Beta-Readiness Verdict

### Verdict: **UNCONDITIONAL PASS — 100% READY FOR PUBLIC BETA**

All cognitive, terminology, and philosophical inconsistencies identified in the "How Discora Works" audit have been cleanly remedied:
1. **Consensus framing removed:** Discora now unambiguously explains that it tracks the *balance of evidence*, not consensus or majority opinion.
2. **Room format parity achieved:** The `/about` page clearly presents both Collaborative Discussions and Structured Debates with non-competitive, side-switching framing.
3. **Epistemic humility restored:** The Room Guide Card no longer claims "truth-seeking", framing room activity as "Collaborative Inquiry".
4. **Architectural terminology reconciled:** Step 1 on the guest homepage correctly states "Open questions", preserving the critical boundary between discussion questions and claim inquiries.
5. **Universal access on mobile:** Mobile users now have direct, 1-tap access to the interactive Discovery Deck via the persistent bottom navigation bar.
6. **Navigation loop closed:** Prospective users exploring `/about` can seamlessly return to the platform overview.

No new features, routes, or schema changes were introduced. All 12 QA requirements are satisfied with zero regressions.
