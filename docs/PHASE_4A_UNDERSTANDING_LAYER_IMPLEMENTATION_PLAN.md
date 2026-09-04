# Phase 4A: Discussion Understanding Layer — Implementation Plan

> **Status:** IMPLEMENTATION PLAN ONLY — NO CODE CHANGES CURRENTLY  
> **Date:** September 4, 2026  
> **Scope:** Engineering work packages, file targets, and QA verification criteria for the Discussion "State of Understanding" layer.  
> **Rule:** Implement only upon explicit authorization. Zero database schema migrations. Zero AI generation.

---

## 1. Engineering Scope & Overview

This plan defines the minimal, safest implementation to add the deterministic **State of Understanding** synthesis layer to the Discussion Overview route (`/discussions/[slug]`).

* **Total Schema Migrations:** 0 (Zero)
* **Total New Backend RPCs:** 0 (Zero)
* **Architecture:** 100% Client-side deterministic computation derived from data already fetched by `DiscussionDataProvider` (`useClaims`, `useRoomEvidence`, `useQuestions`, `useClaimRelations`, `useInquiryCountsForRoom`).

---

## 2. File & Component Modification Targets

### New Components to Create (under `src/features/discussions/components/`)
1. **`state-of-understanding.tsx`** [NEW]
   * Main container component rendering the executive metric bar and 3-column epistemic cards (`Substantiated`, `Contested`, `Unresolved`).
   * Handles progressive disclosure (collapsed summary vs. expanded deep view).
   * Implements responsive adaptation for 375px, 390px, 768px, 1024px, and 1440px viewports.
2. **`understanding-utils.ts`** [NEW]
   * Pure, deterministic helper functions:
     * `categorizeClaimsByEvidence(claims, evidence, claimRelations, minVotesThreshold)`
     * `calculateEvidenceCoverage(claims, evidence)`
     * `identifyUnresolvedQuestions(questions, claims)`
     * `formatConsensusRatio(agreeCount, disagreeCount)`

### Existing Files to Modify
1. **`src/features/discussions/components/discussion-room.tsx`** [MODIFY]
   * Import `<StateOfUnderstanding />`.
   * Render `<StateOfUnderstanding />` between `<OpeningPremise />` and `<SectionNav />`.
   * Pass data directly from `useContext(DiscussionDataContext)` or existing props (`claims`, `roomEvidence`, `questions`, `claimRelations`).
2. **`src/features/discussions/components/discussion-data-provider.tsx`** [MODIFY] (Optional / Minor)
   * Expose inquiry count metadata or derived understanding categories if centralized caching is desired across tabs.

---

## 3. Existing Services, Hooks, and RPCs to Reuse

No new data fetching infrastructure is needed. The component directly consumes existing queries:

| Data Hook | File | Data Returned |
|---|---|---|
| `useClaims(roomId)` | `src/features/discussions/hooks/use-discussions.ts` | List of room claims with agree/disagree vote tallies and claim types. |
| `useRoomEvidence(roomId)` | `src/features/discussions/hooks/use-discussions.ts` | List of room evidence items with direction (`support`, `contradict`, `context`) and source metadata. |
| `useQuestions(roomId)` | `src/features/discussions/hooks/use-discussions.ts` | List of framing questions with question types and creator metadata. |
| `useClaimRelations(roomId)` | `src/features/discussions/hooks/use-discussions.ts` | List of claim-to-claim links (`supports`, `contradicts`, `refines`). |
| `useInquiryCountsForRoom(roomId)`| `src/features/debates/hooks/use-inquiries.ts` | Map of active inquiries per claim. |

---

## 4. Pure Deterministic Logic Specification

In `understanding-utils.ts`:

```typescript
export interface EpistemicClaimSummary {
  claim: DiscussionClaim;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  contextEvidenceCount: number;
  totalVotes: number;
  agreementPercentage: number | null;
  status: "substantiated" | "contested" | "unevidenced";
}

export function categorizeClaims(
  claims: DiscussionClaim[],
  evidence: DiscussionEvidence[],
  relations: DiscussionClaimRelation[]
): {
  substantiated: EpistemicClaimSummary[];
  contested: EpistemicClaimSummary[];
  unevidenced: EpistemicClaimSummary[];
} {
  // 1. Group active evidence by claimId and direction
  // 2. Classify claim:
  //    - If supportingEvidenceCount > 0 AND contradictingEvidenceCount === 0 => "substantiated"
  //    - If contradictingEvidenceCount > 0 OR (totalVotes >= 5 AND agreementPercentage between 30% and 70%) => "contested"
  //    - If supportingEvidenceCount === 0 AND contradictingEvidenceCount === 0 => "unevidenced"
}
```

---

## 5. Acceptance Criteria

1. **Deterministic Categorization:**
   * A claim with 1+ supporting citations and 0 contradicting citations appears under **Substantiated Claims**.
   * A claim with 1+ contradicting citations appears under **Contested & Disputed**.
   * A claim with 0 citations appears under **Unresolved / Needs Evidence**.
2. **Strict Vote Sample Size Safeguard:**
   * Claims with fewer than 5 votes do NOT show a percentage label like `"High Consensus"`; they show `"Preliminary Stance (N votes)"` or `"Insufficient votes"`.
3. **Open Framing Questions Visibility:**
   * Discussion Questions that have no answering claims in the registry are explicitly listed in the **Unresolved Front** section with a prompt to provide an assertion.
4. **Deep-Link Navigation:**
   * Clicking a claim card in the State of Understanding smoothly scrolls the viewport to that exact claim card in `#claims` and highlights it.
   * Clicking an evidence count smoothly scrolls to the Evidence Bank in `#evidence`.
5. **Responsiveness:**
   * On desktop (1440px / 1024px), displays as a crisp 3-column grid.
   * On mobile (375px / 390px), collapses into clean segmented tabs or cards with zero horizontal document overflow.
6. **Performance & Zero Regressions:**
   * Zero additional network roundtrips (uses memoized data in `DiscussionDataProvider`).
   * No disruption to write-first contribution textarea or claim extraction flow.

---

## 6. Comprehensive QA Plan

### Browser Automation QA Matrix
* **Viewport 1440x900 (Desktop):**
  * Load `/discussions/should-ai-generated-content-be-clearly-labeled-online`.
  * Verify State of Understanding renders below Opening Premise.
  * Verify 3 columns render with proper badges (Emerald, Amber, Sky).
  * Click a claim link; verify smooth scroll to `#claims`.
* **Viewport 375x667 (Mobile iPhone SE):**
  * Load discussion page.
  * Verify State of Understanding adapts to segmented mobile controls.
  * Verify document body width does not exceed 375px (no horizontal wobble).
  * Verify touch targets are >= 44px.
* **Empty / Early Stage Room:**
  * Load a discussion with 0 claims or 0 evidence.
  * Verify helpful guidance states appear (*"0% Evidence Coverage — All claims currently require citations"*).

### Regression QA
* Verify Discussion Questions list (`#questions`) still functions.
* Verify Claim voting still functions.
* Verify Evidence submission form still attaches citations.
* Verify Write-first contribution textarea still posts comments.
* Verify Guest authentication modal still redirects properly.

---

## 7. Security & Privacy Constraints

* **Public Read Access:** The State of Understanding reflects only public database views (`public.discussion_claims`, `public.discussion_evidence`, `public.discussion_questions`).
* **Identity Redaction:** Claims and evidence submitted under `anonymous` mode preserve full metadata redaction (username and avatar remain anonymous in summary cards).
* **Retracted Items:** Claims or evidence marked `is_retracted = true` are filtered out immediately in the memoized selectors and never appear in understanding counts.

---

## 8. Explicit Non-Goals (What This Feature Will NOT Do)

* Will **NOT** integrate OpenAI, Anthropic, Gemini, or any LLM API to write conversational summaries.
* Will **NOT** declare winners, losers, or ultimate truth verdicts.
* Will **NOT** alter the database schema or create Supabase migration scripts.
* Will **NOT** replace or hide the raw discussion sections (`#questions`, `#claims`, `#evidence`, `#contributions`).
* Will **NOT** introduce gamification, karma badges, or user ranking systems.
