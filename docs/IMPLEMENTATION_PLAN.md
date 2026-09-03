# Discussion Detail Page Redesign — Implementation Plan

> **Target Sprint:** Discussion Room Architecture Overhaul
> **Scope:** Refactoring Discussion Detail Page (`/discussions/[slug]`)
> **Status:** Implementation Specification

---

## 1. Executive Summary & Strategy

This plan outlines the systematic execution for refactoring the Discora Discussion Detail Page from an 843-line monolithic page into a modular, question-framed, evidence-first discourse experience.

Execution is structured into **5 phased waves** to guarantee zero downtime or visual regression:
- **Phase 1: Code Base Cleanup & Legacy Removal**
- **Phase 2: Context Provider Infrastructure**
- **Phase 3: Component Decomposition & SectionNav**
- **Phase 4: Streamlined Claim & Evidence Redesign**
- **Phase 5: Mobile Floating Controls & Verification**

---

## 2. Comprehensive Files Affected

### 2.1 Files To Delete (Legacy / Dead Code Removal)
Remove ~2,050+ lines of unrendered dead legacy code:
- [DELETE] `src/features/discussions/components/discussion-health.tsx`
- [DELETE] `src/features/discussions/components/discussion-intelligence.tsx`
- [DELETE] `src/features/discussions/components/discussion-summary.tsx`
- [DELETE] `src/features/discussions/components/map-tab.tsx`
- [DELETE] `src/features/discussions/components/graph-view.tsx`
- [DELETE] `src/features/discussions/components/graph-utils.ts`
- [DELETE] `src/features/discussions/components/room-evidence-tab.tsx`
- [DELETE] `src/features/discussions/components/room-sources-tab.tsx`

### 2.2 New Components To Create
- [NEW] `src/features/discussions/components/discussion-data-provider.tsx` — Lightweight React context providing cached room data.
- [NEW] `src/features/discussions/components/section-nav.tsx` — Sticky, accessible navigation tab bar.
- [NEW] `src/features/discussions/components/discussion-header.tsx` — Clean discussion header & topic metadata.
- [NEW] `src/features/discussions/components/opening-premise.tsx` — Collapsible opening premise card.
- [NEW] `src/features/discussions/components/room-evidence-section.tsx` — Room-wide evidence bank section.

### 2.3 Existing Files To Refactor
- [MODIFY] `src/features/discussions/components/discussion-room.tsx` — Refactored from 843 lines down to ~120 lines as a pure orchestrator.
- [MODIFY] `src/features/discussions/components/claim-list.tsx` — Refactored to streamlined compact card design with inline expand drawers.
- [MODIFY] `src/features/discussions/components/question-list.tsx` — Refactored to support primary section integration and URL filtering.
- [MODIFY] `src/features/discussions/components/comment-item.tsx` — Fix noop callback `handleNavigateToEvidence` and smooth fragment navigation.

---

## 3. Detailed Refactoring Plan & Phased Waves

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: LEGACY CLEANUP                                                │
│ Delete 8 dead components (~2,050 lines). Verify lint & build pass.     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CONTEXT PROVIDER INFRASTRUCTURE                               │
│ Implement DiscussionDataProvider to cache messages, claims, evidence,  │
│ questions, and relations. Eliminate duplicate hook calls.              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: COMPONENT DECOMPOSITION & NAVIGATION                          │
│ Extract DiscussionHeader, OpeningPremise, and SectionNav.              │
│ Re-order page flow: Premise → Questions → Claims → Evidence → Chat.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: CLAIM & EVIDENCE STREAMLINING                                 │
│ Refactor ClaimCard into compact mode. Connect room-wide Evidence bank. │
│ Fix noop callbacks in comment items.                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: MOBILE OPTIMIZATION & VERIFICATION                            │
│ Implement sticky bottom bar for mobile. Run full build & lint suite.   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Estimated Effort Breakdown

| Phase | Description | Files Affected | Estimated Effort |
|---|---|---|---|
| **Phase 1** | Dead Code Removal & Cleaning | 8 files deleted | **1.5 Hours** |
| **Phase 2** | Context Provider Infrastructure | `discussion-data-provider.tsx`, `use-discussions.ts` | **3.0 Hours** |
| **Phase 3** | Layout Decomposition & `SectionNav` | `discussion-room.tsx`, `section-nav.tsx`, `opening-premise.tsx` | **5.0 Hours** |
| **Phase 4** | Claim & Evidence Card Streamlining | `claim-list.tsx`, `room-evidence-section.tsx`, `comment-item.tsx` | **6.0 Hours** |
| **Phase 5** | Mobile Floating Controls & Verification | `discussion-room.tsx`, responsive CSS, lint/build testing | **3.5 Hours** |
| **TOTAL** | **Full Audit & Redesign Implementation** | **17 Total Files** | **19.0 Hours** |

---

## 5. Risk Assessment & Mitigation Strategies

| Potential Risk | Severity | Mitigation Strategy |
|---|---|---|
| **State Synchronization Lag** | Medium | Context provider uses TanStack Query cache invalidation triggers on mutation success. |
| **URL Query Param Collisions** | Low | Namespace query parameters cleanly (`?question={id}`, `?claim={id}`). |
| **Mobile Viewport Overflow** | Medium | Enforce strict `overflow-x-hidden` on main container and max-width bounds on text areas. |
| **Breaking Deep Link Anchors** | Low | Retain element ID conventions (`#claim-{id}`, `#msg-{id}`) and implement smooth `scrollIntoView` handlers. |
