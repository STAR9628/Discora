# Phase 4B: State of Understanding — Behavioral Implementation Plan

> **Status:** AUDIT & PLANNING ONLY — NO SOURCE CODE MODIFICATIONS  
> **Date:** September 4, 2026  
> **Context:** Action plan to implement approved Phase 4B behavioral refinements  
> **Precondition:** Explicit user sign-off on Phase 4B audit and redesign documents.

---

## 1. Overview & Scope Boundaries

### Strict Boundaries
- **No Database Schema Changes:** No tables, columns, or triggers will be added or modified.
- **No RPC / API Changes:** All data transformations are client-side deterministic aggregations of existing room queries.
- **No Source Code Modifications during this audit:** This document serves as the implementation specification for when the user approves Phase 4B implementation.

---

## 2. Work Item Specifications

### Work Item 1: Actionable Evidence Deep-Link Intent (`P1-1`)
- **Priority:** P1
- **Affected Components:**
  - [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
  - [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx) (or relevant Claim Card component in Claims section)
- **Current Behavior:**
  Clicking *"Add evidence →"* on an unresolved claim navigates to `/discussions/${slug}/claims?highlight=${claim.id}`. The claim card is highlighted with a focus ring, but the evidence attachment drawer remains closed.
- **Desired Behavior:**
  - Link in State of Understanding is updated to `/discussions/${slug}/claims?highlight=${claim.id}&action=attach-evidence` with text *"Attach evidence →"*.
  - When the Claims page mounts and parses search parameters:
    - If `action === 'attach-evidence'` and `highlight === claim.id`:
      - For authenticated users: Automatically open the claim's evidence attachment dialog or inline form.
      - For guests: Open an auth modal or show an inline indicator *"Sign in to attach evidence"*.
- **Acceptance Criteria:**
  1. Clicking *"Attach evidence →"* on an unresolved claim lands directly in the evidence contribution workflow.
  2. The target claim is smoothly scrolled into the viewport and its attachment form is visible without additional clicks.
  3. No hydration errors or unhandled query parameter crashes.
- **DB / RPC Changes:** None.

---

### Work Item 2: Mobile Segmented Control Label Density (`P1-2`)
- **Priority:** P1
- **Affected Components:**
  - [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
- **Current Behavior:**
  On mobile devices ($375\text{px}$ and $390\text{px}$), the segmented control renders three buttons: `Supported (${count})`, `Contested (${count})`, and `Unresolved (${count})`. On narrow screens, `Unresolved (12)` truncates to `Unresolv...`.
- **Desired Behavior:**
  - Segmented control buttons use compact styling on `< sm` viewports:
    - Label and count rendered with flexible inline flex styling (`gap-1.5 px-2 py-1.5 text-xs`).
    - Count badge styled as a discreet pill: e.g., `<span className="px-1.5 py-0.5 rounded-full bg-muted text-[11px] font-mono">12</span>`.
    - No button text suffers CSS truncation on $375\text{px}$ viewport.
- **Acceptance Criteria:**
  1. At $375\text{px}$ (iPhone SE) and $390\text{px}$ (iPhone 13/14), all three tab labels (`Supported`, `Contested`, `Unresolved`) and their respective numerical badges render completely without ellipsis or clipping.
  2. Touch target height remains $\ge 44\text{px}$ for accessibility.
  3. Active tab state remains visually distinct with clear background contrast.
- **DB / RPC Changes:** None.

---

### Work Item 3: Desktop $1024\text{px}$ Column Header Spacing (`P2-1`)
- **Priority:** P2
- **Affected Components:**
  - [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
- **Current Behavior:**
  At $1024\text{px}$ desktop viewports, the column header in the first column wraps `Supported by Current Evidence` onto three lines, and the inline badge `0 contradictions` collides awkwardly with the text margin.
- **Desired Behavior:**
  - Category column headers use a structured 2-tier flex layout:
    - Tier 1: Category Name (`Supported`) + indicator dot + claim count pill.
    - Tier 2: Muted descriptor (`by verified citations · 0 contradictions`).
  - Layout adapts gracefully between $1024\text{px}$ and $1440\text{px}$ without horizontal wrapping collisions.
- **Acceptance Criteria:**
  1. At $1024\text{px}$ viewport, all three column headers display with clean vertical rhythm and zero text overlap.
  2. Contrast and typography maintain Discora's calm, legible aesthetic.
- **DB / RPC Changes:** None.

---

### Work Item 4: Mobile Touch Disclosure for Evidence Coverage (`P2-2`)
- **Priority:** P2
- **Affected Components:**
  - [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
- **Current Behavior:**
  `14% Evidence Coverage` uses a desktop hover tooltip (`title` or Radix tooltip). Touch users on mobile cannot trigger hover, so the meaning of the percentage cannot be inspected.
- **Desired Behavior:**
  - The Evidence Coverage badge can be tapped on touch devices to display a brief popover or toggle an inline sub-label:
    `2 of 14 claims have attached sources`
  - Accessible via keyboard focus and screen readers with proper ARIA attributes.
- **Acceptance Criteria:**
  1. Tapping the badge on mobile reveals the explanatory text without page navigation.
  2. Desktop hover behavior continues to function identically.
- **DB / RPC Changes:** None.

---

### Work Item 5: Subtitle Copy Polish (`P3-1`)
- **Priority:** P3
- **Affected Components:**
  - [`src/features/discussions/components/state-of-understanding.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/state-of-understanding.tsx)
- **Current Behavior:**
  Subtitle: *"Deterministic synthesis of cited evidence, active disputes, and open inquiry lines across this discussion."*
- **Desired Behavior:**
  Subtitle: *"Live synthesis of cited evidence, active disputes, and open questions across this discussion."*
- **Acceptance Criteria:**
  1. More natural, approachable prose for new users while retaining technical accuracy.
- **DB / RPC Changes:** None.

---

## 3. Verification & Testing Checklist

When implementation is performed in the next phase, the following verification suite must be executed:

### Automated Checks
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm run lint`: 0 ESLint warnings/errors.
- `npm run build`: Production Next.js build succeeds with all routes compiled.
- `git diff --check`: No whitespace or formatting anomalies.

### Manual / Browser Checks
- **Viewport matrix:**
  - $375\text{px}$ (iPhone SE): Verify tab buttons don't truncate text.
  - $390\text{px}$ (iPhone 13/14): Verify tab navigation and touch targets.
  - $768\text{px}$ (iPad): Verify tablet transition.
  - $1024\text{px}$ (Small Desktop): Verify 3-column header wrapping.
  - $1440\text{px}$ (Standard Desktop): Verify 3-column grid stability.
- **Behavioral journey:**
  - Click *"Attach evidence →"* on an unresolved claim $\rightarrow$ verify Claims tab opens, card is highlighted, and attachment form opens.
