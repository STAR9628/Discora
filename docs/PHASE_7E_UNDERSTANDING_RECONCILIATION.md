# Phase 7E — Understanding-Layer Reconciliation & Alignment

## 1. Executive Verdict

**PASS**

Phase 7E has successfully reconciled the Understanding Layer across Discussion and Debate rooms according to approved Discora epistemics and governance constraints. All three locked product decisions are fully implemented. The data hygiene defect excluding soft-deleted claims from active State of Understanding (SoU) synthesis is resolved. Community stance terminology has been standardized from "Not Agree" to "Challenge". Arguments and targeted inquiries are now contextually visible without inventing unauthorized epistemic scoring, demotion, or artificial weighting. TypeScript typecheck, ESLint, production Next.js build, and live Playwright QA on both Desktop (1440px) and Mobile (375px) passed with zero errors and zero horizontal overflow.

---

## 2. Phase 7D Findings Addressed

### Finding 1: PositionHistory incorrectly rendered inside Debate State of Understanding (HIGH)
- **Status:** Resolved
- **Implementation:** Removed `<PositionHistory roomId={room.id} />` from the understanding lens in [`src/features/debates/components/debate-room.tsx`](file:///D:/Projects/Discora/src/features/debates/components/debate-room.tsx). Preserved `src/features/debates/components/position-history.tsx` in the codebase without deletion (cataloged as cleanup debt).
- **Evidence:** Playwright browser evaluation and screenshots of `/debates/ai-is-superior-to-humans/understanding` confirm `positionHistoryPresent: false`.

### Finding 2: Arguments not incorporated into the understanding layer (HIGH)
- **Status:** Resolved
- **Implementation:** Added argument aggregation to [`deriveStateOfUnderstanding`](file:///D:/Projects/Discora/src/features/discussions/components/understanding-utils.ts). Integrated `useRoomArguments` into both Discussion SoU (`DiscussionOverviewUnderstanding`) and Debate SoU (`ArgumentEvidenceOverview`). Surfaced argument count and breakdown contextually (`X arg(s)`) on claim cards with full traceability without fabricating argument quality scoring.
- **Evidence:** Typecheck, build, and DOM snapshot verify argument tracking across active claims.

### Finding 3: Targeted Inquiries not represented at claim-level understanding (HIGH)
- **Status:** Resolved
- **Implementation:** Integrated claim-level inquiry counts into `EpistemicClaimSummary` and rendered subtle, non-demoting badges (`X inquir(y/ies)`) on claim cards across Supported, Contested, and Unresolved columns. Open inquiries do not demote claims from "Supported by Current Evidence" to "Contested" or "Unresolved".
- **Evidence:** Badges render with inquiry icon and descriptive tooltip; claim categorization remains strictly evidence-led.

### Finding 4: Soft-deleted claims can remain in SoU metrics (MEDIUM)
- **Status:** Resolved
- **Implementation:** Updated `DbClaimRow` and `DbDiscussionClaimRow` in [`discussion-service.ts`](file:///D:/Projects/Discora/src/features/discussions/services/discussion-service.ts) to map `deleted_at` / `deleted_by`. In `deriveStateOfUnderstanding` ([`understanding-utils.ts`](file:///D:/Projects/Discora/src/features/discussions/components/understanding-utils.ts)), filtered claims by `!c.isRetracted && !c.deletedAt`.
- **Evidence:** Claims marked with a deletion timestamp are completely excluded from active claim counts, evidence coverage calculations, and epistemic pillars.

### Finding 5: Debate SoU lacks epistemic parity with Discussion SoU (MEDIUM)
- **Status:** Resolved
- **Implementation:** Re-architected [`ArgumentEvidenceOverview`](file:///D:/Projects/Discora/src/features/debates/components/argument-evidence-overview.tsx) to evaluate Proposition and Opposition claims using the identical epistemic classification engine (`deriveStateOfUnderstanding`). Both sides categorize claims into:
  1. *Supported by Current Evidence*
  2. *Contested / Mixed Evidence*
  3. *Unresolved Front*
- **Evidence:** Desktop (side-by-side grid) and mobile (tab switch) verified via Playwright QA.

### Finding 6: Legacy/dead Discussion intelligence components exist (LOW)
- **Status:** Preserved as Technical Debt
- **Implementation:** Per Section 13 (No Unrelated Cleanup) of instructions, legacy components remain untouched to maintain phase discipline.

### Finding 7: "Not Agree" terminology remains in active UI (LOW)
- **Status:** Resolved
- **Implementation:** Replaced "Not Agree" with "Challenge" across active UI surfaces:
  - [`claim-in-conversation.tsx`](file:///D:/Projects/Discora/src/features/discussions/components/claim-in-conversation.tsx): Stance summary and button text
  - [`claim-lens-card.tsx`](file:///D:/Projects/Discora/src/features/discussions/components/claim-lens-card.tsx): Descriptive stance text
  - [`claim-list.tsx`](file:///D:/Projects/Discora/src/features/discussions/components/claim-list.tsx): Challenge button title and badge
- **Evidence:** Browser evaluation confirmed `notAgreeCount: 0`, `challengeCount: 7` on active discussion room conversation feed.

---

## 3. Product Decisions Implemented

### DECISION 1 — Position History Removal
- Removed `PositionHistory` from the Debate State of Understanding lens view.
- State of Understanding is strictly a current-state understanding summary.
- Did not create an "Evolution" lens or move `PositionHistory` into another surface.
- Preserved existing `position-history.tsx` file for future review without deleting it.

### DECISION 2 — Open Targeted Inquiries Epistemic Neutrality
- Targeted inquiries requiring examination do not automatically demote claims from "Supported by Current Evidence" to "Contested" or "Unresolved".
- Open targeted inquiries are displayed as transparent contextual badges (`X inquiry/inquiries`) on the claim card.
- No artificial epistemic states (such as "Under Examination") were created.
- No inquiry penalty scoring or thresholds were invented.

### DECISION 3 — Debate State of Understanding Parity
- Adopted the exact same core epistemic vocabulary for Debates as Discussions:
  - **Supported by Current Evidence**
  - **Contested / Mixed Evidence**
  - **Unresolved Front**
- Applied within the structural context of Proposition and Opposition:
  ```
  STATE OF UNDERSTANDING
  Proposition
      Supported by Current Evidence
      Contested / Mixed Evidence
      Unresolved Front
  Opposition
      Supported by Current Evidence
      Contested / Mixed Evidence
      Unresolved Front
  ```
- Strictly structural and descriptive: no score bars, no winner/loser labels, no side scores, no consensus meters, and no competition metrics.

---

## 4. SoU Architecture After Phase 7E

### Discussion State of Understanding
1. **Header:** Room-wide evidence coverage percentage (`X% with sources`), active claim counts, and epistemic distribution.
2. **Epistemic Pillars:**
   - **Supported by Current Evidence:** Claims with at least 1 supporting citation and 0 contradicting citations.
   - **Contested / Mixed Evidence:** Claims challenged by contradicting citations or mixed directional sources.
   - **Unresolved Front:** Open framing questions awaiting claims, and assertions awaiting empirical citations.
3. **Claim Cards:** Display claim content, directional citations count, source domains, contextual open inquiry indicators (`X inquir(y/ies)`), attached argument counts (`X arg(s)`), status reasoning, and deep-link navigation ("Inspect claim", "Inspect dispute", "Add evidence").

### Debate State of Understanding
1. **Header:** Active motion claims, total citations, and open inquiries count.
2. **Proposition & Opposition Structural Grouping:**
   - On **Desktop (>= lg)**: Side-by-side comparative 2-column view (Proposition on left, Opposition on right).
   - On **Mobile (< lg)**: Clean tab-toggle (`Proposition (N)` / `Opposition (M)`) preventing horizontal squishing.
3. **Pillar Sub-sections:** Under each side, claims are categorized using the exact same deterministic rules into Supported, Contested, and Unresolved.
4. **Traceability:** Users can click any claim to jump directly to its origin in the conversation or inspect its evidence in the Claims lens.
5. **Epistemic Framing Footnote:** Explicitly disclaims winner/loser determination and reminds participants that understanding requires examining evidence and reasoning across both positions.

---

## 5. Arguments / Inquiries / Evidence Treatment

| Concept | Role in Understanding Layer | Epistemic Impact | Visual Presentation |
|---|---|---|---|
| **Evidence** | Primary epistemic driver | Directly determines whether a claim is *Supported*, *Contested*, or *Unresolved* based on cited sources and directional verification (`support`, `contradict`, `context`). | Directional badge (`X citation(s)` or `X counter-citation(s)`), domain pills. |
| **Arguments** | Reasoning structures | Contextual indicators connecting premises to a claim position (`supporting` vs `challenging`). Traced back to claims. No artificial strength scoring. | Subtle badge (`X arg(s)`) with breakdown tooltip. |
| **Inquiries** | Targeted follow-up questions | Contextual visibility indicating open lines of investigation attached to a claim. **Never** demotes an evidence-supported claim. | Subtle badge (`X inquir(y/ies)`) with open inquiry count. |
| **Community Stance** | Descriptive social signal | Shows Support vs Challenge participant votes. **Never** influences epistemic classification. A 100-vote claim with 0 citations remains *Unresolved*. | Subordinate text (`X Support · Y Challenge · Z votes`). |

---

## 6. Open Decisions Preserved

In accordance with governance rules and user instructions, the following items remain strictly **OPEN** and were **NOT** invented:
1. **SoU Maturity Thresholds:** No arbitrary claim or room maturity rules were created (e.g., "requires 3 sources to be mature").
2. **Evidence-Quality Weighting:** No tiering of sources (e.g., peer-reviewed vs journalism vs preprint).
3. **Source Reliability Scoring:** No numerical domain reputation or authority algorithms.
4. **Confidence Percentages:** No epistemic confidence percentages (e.g., "78% confident").
5. **Numerical Epistemic Scoring:** No point systems or algorithmic truth calculations.
6. **Automatic Unlocking / Lifecycle Transitions:** No automatic phase transitions based on vote or evidence counts.
7. **AI-Generated Epistemic Summaries:** No natural-language LLM verdict generation or automated synthesis.

---

## 7. Epistemic Guardrail Verification

A comprehensive repository and UI sweep verified that no banned epistemic patterns were introduced:
- **Winner / Loser:** Banned from active calculation. The only occurrence in active UI is the explanatory footnote stating: *"It does not score sides or declare winners."*
- **Truth / Proven / Correct:** No claims are labeled "proven", "true", or "correct". The approved terminology *"Supported by Current Evidence"* is maintained.
- **Consensus / Majority:** No majority voting determines epistemic state.
- **Popularity / Votes:** Voting remains strictly descriptive community stance.
- **Reputation:** User reputation does not weight evidence or claims.

---

## 8. Database / Migration Changes

**None.**

All changes were implemented cleanly in the application layer and client components without altering existing database tables, RLS policies, or production migration history.

---

## 9. Validation Results

### 1. TypeScript Check
- **Command:** `npx tsc --noEmit`
- **Result:** Exit code 0. Zero type errors.

### 2. ESLint
- **Command:** `npm run lint`
- **Result:** Exit code 0. Zero errors across all project files (18 non-blocking warnings in historical/script files).

### 3. Production Build
- **Command:** `npm run build`
- **Result:** Exit code 0. All 21 static and dynamic pages compiled successfully, including `/discussions/[slug]/understanding` and `/debates/[slug]/understanding`.

### 4. Playwright Browser QA (Desktop: 1440px wide)
- **Discussion Room (`/discussions/should-ai-generated-content-be-clearly-labeled-online`):**
  - Conversation feed: `notAgreeCount: 0`, `challengeCount: 7`, `supportCount: 7`.
  - Understanding lens: 3 epistemic pillars rendered, claim cards display citations, domains, and inspect actions. Zero horizontal scroll.
- **Debate Room (`/debates/ai-is-superior-to-humans`):**
  - Understanding lens: Proposition (1 claim · 100% coverage) and Opposition (0 claims · 0% coverage) side-by-side grid rendered cleanly.
  - PositionHistory: Confirmed absent.
  - Winner/loser/scorecard: Confirmed absent.
  - Zero horizontal scroll (`hasHorizontalScroll: false`).

### 5. Playwright Browser QA (Mobile: 375px wide)
- **Discussion SoU (`375x812`):**
  - `scrollWidth: 375`, `clientWidth: 375`, `hasHorizontalScroll: false`.
  - Epistemic tabs and claim cards fit mobile screen with zero clipping.
- **Debate SoU (`375x812`):**
  - `scrollWidth: 375`, `clientWidth: 375`, `hasHorizontalScroll: false`.
  - Proposition/Opposition mobile toggle allows smooth switching between sides without column squishing.
  - Opposition empty state tested and verified.

### 6. Browser Console Errors
- Clean 0 runtime errors, 0 warnings during all navigation and lens interaction flows.

---

## 10. Remaining Gaps

1. **Unused Component Debt:** `src/features/debates/components/position-history.tsx` has no active callers following its removal from Debate SoU. Kept in repo as technical debt pending a formal cleanup phase.
2. **Claim Relations in SoU:** Database table `claim_relations` (`supports`, `contradicts`, `subsumes`, `revises`, `context`) is queried but currently consumed primarily by Discussion Map and Conversation nodes rather than deeply synthesized in the SoU pillars. Epistemic integration of relations remains open.
3. **Empty Proposition/Opposition Mobile Balance:** In debates where one side has substantially more claims than the other, mobile toggle requires switching to inspect the other side. This is an intentional design choice to prevent horizontal overflow.

---

## 11. Recommended Next Phase

### Phase 7F — Pre-Production Verification & Performance Profiling
1. Verify production migration status in Supabase dashboard (reconcile pending security migrations).
2. Profile TanStack Query caching and data re-fetching behaviors across rapid room lens switches.
3. Conduct end-to-end user contribution testing (authenticated participant submitting claims, evidence, and inquiries) under the unified epistemic model.
4. Schedule cleanup of decommissioned components (`position-history.tsx`, legacy intelligence views).

---

## 12. MCP Verification

| MCP Server | Verified | Used | Notes |
|---|---|---|---|
| **Playwright** | YES | YES | Used for full browser automation QA on Desktop (1440px) and Mobile (375px), screenshots, DOM evaluation, overflow checks, and console monitoring. |
| **Fetch** | YES | NO | Intentionally unused: All testing was conducted against local Next.js dev server (`host.docker.internal:3000`) and local repository files; no external HTTP resource fetching was required. |
| **GitHub Official** | YES | YES | Used `list_commits` to verify repository commit history and compare local HEAD against remote `main`. |
| **Context7** | YES | NO | Intentionally unused: Codebase context and governance rules were fully contained within repository markdown documentation (`docs/`, `AGENTS.md`). |
| **Sequential Thinking** | YES | YES | Used to reason through epistemic reconciliation, non-demoting open inquiries, Proposition/Opposition data modeling, and responsive layout constraints. |
