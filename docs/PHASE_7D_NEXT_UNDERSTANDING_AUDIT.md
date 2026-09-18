# Phase 7D — State of Understanding / Understanding-Layer Audit

> **Status:** AUDIT ONLY — NO SOURCE CODE MODIFICATIONS  
> **Date:** September 12, 2026  
> **Target:** Discora Understanding Layer (Discussions & Debates)  
> **Repository Local HEAD:** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd`  
> **Remote HEAD (`origin/main`):** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd`  
> **Authority Precedence:** Philosophy → Original MDs → Approved Product Decisions → Approved Specs → Current Implementation → UX Optimization → Agent Assumptions  

---

## 1. Executive Verdict

### **NEEDS PRODUCT DECISION**

**Verdict Summary:**  
The Discussion room State of Understanding (SoU) successfully establishes an evidence-led epistemic baseline: it classifies claims into three distinct columns (*Supported by Current Evidence*, *Contested / Mixed Evidence*, and *Unresolved Front*), computes an *Evidence Coverage* percentage, and completely isolates community stance (votes) from epistemic standing. 

However, the complete understanding-layer pipeline cannot be given a full PASS because of **three critical architectural and product-level blockers**:
1. **Debate Room Position-History Leak:** Debate rooms embed `<PositionHistory />` directly within the State of Understanding lens (`currentLens === "understanding"` in `src/features/debates/components/debate-room.tsx:324`), directly violating the locked product decision that SoU is strictly a *current-state summary* and must not contain position-evolution history.
2. **Epistemic Disconnection of Arguments and Inquiries:** Although Phase 7D introduced first-class `arguments` and scoped `inquiry_items` to the database and conversation feeds, neither is factored into claim epistemic classification in `understanding-utils.ts`. An assertion with multiple open, challenging inquiries and rebutting arguments is still classified as "Supported by Current Evidence" if it has even a single supporting link and zero attached contradicting evidence cards.
3. **Unapproved Maturity & Synthesis Algorithms:** As established in `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` §19.4, the automatic maturity and unlocking algorithm for SoU remains **OPEN / NOT APPROVED**. Furthermore, Debate rooms currently have no claim-level synthesis model, presenting only raw side-by-side metric tallies (`ArgumentEvidenceOverview`).

---

## 2. Scope and Sources

### Authoritative Documentation Examined
- **Agent Governance:** `docs/DISCORA_AGENT_GOVERNANCE.md` (Authority hierarchy, epistemic guardrails, no-invention rule, audit discipline)
- **Approved UX Spec:** `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (§0–3, 11–15, 19 State of Understanding, 25 Approved Discussion Direction, 26 Deletion Lock, 27 SoU Direction)
- **Master Context & PRD:** `docs/00_MASTER_CONTEXT.md`, `docs/01_PRD.md`, `docs/02_FEATURE_REGISTRY.md`, `docs/03_USER_FLOWS.md`, `docs/04_DATABASE_DESIGN.md`, `docs/05_SYSTEM_ARCHITECTURE.md`, `docs/06_DESIGN_SYSTEM.md`, `docs/08_DEVELOPMENT_ROADMAP.md`, `docs/23_KNOWLEDGE_MODEL.md`
- **Reconciliation & Prior Audits:** `docs/PHASE_7C_AUDIT_RECONCILIATION.md`, `docs/PHASE_4A_UNDERSTANDING_LAYER_AUDIT.md`, `docs/PHASE_4B_STATE_OF_UNDERSTANDING_BEHAVIORAL_AUDIT.md`, `docs/PHASE_6E_APPROVED_PRODUCT_SPEC.md`, `docs/PHASE_7D_PHASE_G_AUDIT_RECONCILIATION.md`, `docs/PHASE_7D_PHASE_H_AUDIT_RECONCILIATION.md`

### Implementation Files Inspected
- **Synthesis Logic:** `src/features/discussions/components/understanding-utils.ts`
- **Discussion SoU UI:** `src/features/discussions/components/state-of-understanding.tsx`, `src/features/discussions/components/discussion-overview-understanding.tsx`, `src/app/discussions/[slug]/understanding/page.tsx`
- **Debate SoU UI:** `src/features/debates/components/argument-evidence-overview.tsx`, `src/features/debates/components/position-history.tsx`, `src/features/debates/components/debate-room.tsx`, `src/app/debates/[slug]/understanding/page.tsx`
- **Room Shell & Navigation:** `src/features/rooms/components/room-section-shell.tsx`, `src/features/discussions/components/discussion-room-layout.tsx`, `src/components/layout/sidebar.tsx`
- **Data Access & Hooks:** `src/features/discussions/services/discussion-service.ts`, `src/features/discussions/hooks/use-discussions.ts`, `src/features/debates/services/debate-service.ts`, `src/features/debates/hooks/use-inquiries.ts`, `src/features/debates/hooks/use-debates.ts`
- **Database Migrations & Views:** `supabase/migrations/202609090002_claim_deletion_lock_foundation.sql`, `supabase/migrations/202606250001_fix_discussion_evidence_room_id.sql`, `supabase/migrations/202609090004_discussion_arguments_foundation.sql`, `supabase/migrations/202606120001_create_inquiry_tables.sql`

---

## 3. Current SoU Architecture

The platform provides two diverging architectures for State of Understanding depending on the room type:

```
                  ┌─────────────────────────────────────────────────────┐
                  │                 Room Route Request                  │
                  └──────────────────────────┬──────────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          /discussions/[slug]/understanding             /debates/[slug]/understanding
                      │                                             │
                      ▼                                             ▼
       DiscussionOverviewUnderstanding                          DebateRoom
                      │                                 (initialSection="understanding")
                      ▼                                             │
             StateOfUnderstanding                     ┌─────────────┴─────────────┐
        (Epistemic 3-Column Synthesis)                ▼                           ▼
                      │                   ArgumentEvidenceOverview         PositionHistory
                      ▼                   (Proposition vs Opposition)   (User Side-Change Logs)
          deriveStateOfUnderstanding
           (Client-side pure function)
```

### 3.1 Discussion Room Architecture
- **Route:** `src/app/discussions/[slug]/understanding/page.tsx` renders `DiscussionOverviewUnderstanding`.
- **Layout Shell:** Wrapped inside `DiscussionRoomLayout` (`src/features/discussions/components/discussion-room-layout.tsx`), which mounts `RoomSectionShell` with `section="understanding"`.
- **Data Fetching:** Parallel TanStack query hooks fetch `claims`, `roomEvidence`, `questions`, `claimRelations`, and `inquiryCounts`.
- **Synthesis Engine:** All synthesis is performed synchronously on the client via `deriveStateOfUnderstanding()` (`src/features/discussions/components/understanding-utils.ts`). There is no backend RPC or database view for Discussion SoU.

### 3.2 Debate Room Architecture
- **Route:** `src/app/debates/[slug]/understanding/page.tsx` renders `DebateRoom` with `initialSection="understanding"`.
- **Rendering:** When `currentLens === "understanding"`, it renders `RoomGuideCard`, followed by `ArgumentEvidenceOverview`, and `<PositionHistory roomId={room.id} />`.
- **Synthesis Engine:** Debate rooms do **not** run `deriveStateOfUnderstanding()`. Instead, `ArgumentEvidenceOverview` calculates aggregate counts of claims, evidence directions, and open inquiries grouped by proposition vs opposition.

---

## 4. SoU Data Inputs

### What Discussion SoU (`deriveStateOfUnderstanding`) Takes as Input:
1. `claims: DiscussionClaim[]` (filtered by `!c.isRetracted`)
2. `evidence: DiscussionEvidence[]` (filtered by `!e.isRetracted`)
3. `questions: DiscussionQuestion[]` (filtered by `!q.isRetracted`)
4. `claimRelations?: DiscussionClaimRelation[]` (**passed in params, but completely unused**)
5. `inquiryCounts?: Record<string, number>` (**only summed as total global count**)

### What Discussion SoU Considers:
- Whether a claim has $\ge 1$ supporting evidence item and 0 contradicting evidence items $\rightarrow$ `status: "supported"`
- Whether a claim has $\ge 1$ contradicting evidence item $\rightarrow$ `status: "contested"`
- Whether a claim has 0 supporting and 0 contradicting evidence items $\rightarrow$ `status: "unresolved"`
- Whether a question has 0 answering claims linked via `claim.questionId` $\rightarrow$ `unresolvedQuestions`
- Total claims with any attached evidence (to compute `evidenceCoveragePercentage`)
- Total active inquiries across the entire room (rendered only as an executive badge)

### What Discussion SoU Completely Ignores:
1. **`arguments` Table:** The `arguments` table (`supabase/migrations/202609090004_discussion_arguments_foundation.sql`), which stores structured reasoning nodes connecting claims, is **not queried or passed into SoU**.
2. **`claimRelations`:** Claim-to-claim relations (`supports`, `contradicts`, `subsumes`, `revises`, `context`) are fetched by the hook but never evaluated in `deriveStateOfUnderstanding`.
3. **Inquiry Breakdown per Claim:** Inquiries attached to specific claims are not evaluated when classifying a claim.
4. **Soft-Deleted Claims (`deleted_at`):** While `isRetracted` is filtered, `deleted_at` is ignored. Soft-deleted claim records (tombstones) are still processed as active claims.
5. **Source Quality / Citation Depth:** A single link to any domain is treated with the same epistemic weight as multiple peer-reviewed sources.

---

## 5. Evidence / Argument / Inquiry Treatment

| Epistemic Dimension | Current Treatment in Discussion SoU | Current Treatment in Debate SoU | Epistemic Assessment |
|---|---|---|---|
| **Supporting Evidence** | If count > 0 and contradicting = 0, claim is marked "Supported by Current Evidence" | Counted as `supporting` evidence per side | **Superficial threshold.** A single citation with no contradictions permanently "supports" a claim. |
| **Contradicting Evidence** | If count > 0, claim is marked "Contested / Mixed Evidence" | Counted as `challenging` evidence per side | **Functional.** Surfaces tension immediately when contradictory evidence is filed. |
| **Contextual Evidence** | Counted toward coverage and tagged; does not change unresolved status | Counted as `contextual` evidence per side | **Aligned.** Correctly treated as neutral framing rather than directional proof. |
| **Missing / Unevidenced** | Placed in "Unresolved Front" with status "Awaiting empirical citations" | Displayed as 0 evidence or "No arguments or evidence presented yet" | **Aligned.** Claims without evidence are clearly marked as unverified assertions. |
| **Arguments / Reasoning** | **IGNORED.** Arguments are not fetched or passed to SoU | **IGNORED.** Component title is "Argument & Evidence Overview", but arguments table is not queried | **CRITICAL GAP.** Reasoning structure is completely absent from the understanding layer. |
| **Open / Unanswered Inquiries** | Counted globally in metric header badge; zero impact on claim status | Counted per side as "Open Inquiries"; zero impact on claim status | **CRITICAL GAP.** Open targeted inquiries questioning a claim do not hold back its "Supported" status. |
| **Retracted Contributions** | Filtered via `isRetracted === false` | Filtered in underlying hooks | **Aligned.** Retracted contributions do not contaminate synthesis. |
| **Deleted Contributions** | **NOT FILTERED.** `deleted_at` is ignored in `DiscussionClaim` | **NOT FILTERED.** `deleted_at` is not checked in debate claim lists | **DEFECT.** Soft-deleted tombstones remain in the synthesis pool. |

---

## 6. Community Stance vs Understanding

### Philosophical Principle
`Support / Challenge` votes describe community stance only. They must not determine truth, evidence quality, credibility, or the State of Understanding.

### Forensic Findings
1. **Separation in Classification:**  
   In `src/features/discussions/components/understanding-utils.ts` (lines 124–170), `agree` and `disagree` vote counts are explicitly decoupled from the epistemic state:
   ```typescript
   // Votes and community stance are descriptive social signals only.
   // They must NOT determine epistemic state.
   // All zero-evidence claims remain unresolved regardless of vote counts.
   ```
   A claim with 500 "Support" votes and 0 citations remains in **Unresolved Front**. It is never moved to "Supported". This directly complies with Discora governance.
2. **Stance Formatting Function is Dead Code:**  
   `formatCommunityStance()` in `understanding-utils.ts:52` formats `${support}% support · ${challenge}% challenge · ${totalVotes} votes`. However, it is **never imported or rendered** on SoU cards.
3. **Database View Calculation:**  
   The database views `public.discussion_claims` and `public.discussion_evidence` calculate `consensus_ratio = (agree_count / (agree_count + disagree_count)) * 100`. While the frontend SoU ignores this column, the database view retains legacy consensus nomenclature.
4. **Terminology Discrepancy:**  
   In `src/features/discussions/components/claim-in-conversation.tsx:117` and `claim-lens-card.tsx:139`, the vote breakdown renders as:
   `{agreeCount} Support · {disagreeCount} Not Agree · {totalVotes} votes`
   The approved governance terminology (`docs/DISCORA_AGENT_GOVERNANCE.md` §14, §29) is **"Support / Challenge"**, not "Not Agree".

---

## 7. Epistemic Guardrail Audit

A comprehensive grep scan across `src/` for core epistemic terms was conducted.

| Term | Occurrences | Locations | Classification | Notes |
|---|---|---|---|---|
| `winner` | 2 | `epistemic-sandbox.tsx:74`, `discussion-feed.tsx:32` | **ALIGNED** | Used exclusively to instruct users that Discora has *no winners*. |
| `loser` | 0 | None | **ALIGNED** | Completely absent from the codebase. |
| `truth` | 2 | `room-guide-card.tsx:33`, `debate-side-picker-modal.tsx:110` | **ALIGNED** | Frames participation as "Collaborative Truth-Seeking" and "truth-seeking virtue". |
| `proven` | 0 | None | **ALIGNED** | Completely absent. Code uses "supported by citations", never "proven". |
| `correct` | 3 | `feedback-modal.tsx:11`, `auth-service.ts:151`, `argument-evidence-overview.tsx:146` | **ALIGNED** | In Debate overview, it explicitly warns: *"It does not indicate which side is 'winning' or 'more correct.'"* |
| `fact` | 20 | Domain types, validators, claim type pickers | **ALIGNED** | Restricted strictly to the `fact` enum value of `claimType` (falsifiable assertion). |
| `ranking` | 0 | None | **ALIGNED** | No leaderboard ranking or user ranking mechanics. |
| `majority` | 0 | None | **ALIGNED** | Majority voting rules do not exist in SoU synthesis. |
| `credibility` | 1 | `discussion-service.ts:1543` | **ALIGNED** | Appears only in an internal comment. No credibility score exists. |
| `reputation` | ~80 | `src/features/reputation/` | **ALIGNED** | Isolated entirely to user profile gamification toggle (`showReputation`); zero impact on rooms or SoU. |
| `score` | ~85 | `reputation-utils.ts`, search | **ALIGNED** | Used for user activity points and search relevance; no epistemic scores in rooms. |
| `consensus` | 30 | `discussion_claims` view, `reputation-growth-card`, `map-tab.tsx`, `discussion-intelligence.tsx` | **POTENTIALLY MISALIGNED / LEGACY** | `DiscussionIntelligence` (in dead `map-tab.tsx`) calculates "High/Medium/Low Consensus" from votes. In active SoU, consensus is not used. |
| `votes` | 25 | Feed nodes, claim cards | **ALIGNED WITH MINOR LABEL DRIFT** | Used as descriptive stance; minor label drift ("Not Agree" vs "Challenge"). |

---

## 8. Discussion vs Debate

There is a major architectural and functional divergence between how State of Understanding is implemented across room types:

```
                      DISCUSSION ROOM SoU                   DEBATE ROOM SoU
                 ┌─────────────────────────────┐       ┌─────────────────────────────┐
Component:       │    StateOfUnderstanding     │       │  ArgumentEvidenceOverview   │
Synthesis Type:  │  Epistemic Classification   │       │     Raw Metric Tallies      │
Columns:         │ 3 Pillars (Supp/Cont/Unres) │       │ 2 Sides (Prop vs Opp)       │
Granularity:     │ Claim-by-claim card inspect │       │ Aggregate numeric counters  │
Evidence Depth:  │ Citations, domains, reasons │       │ Counts (supp/chall/context) │
Position History:│ Completely separate (absent)│       │ INCLUDED (PositionHistory)  │
```

### Critical Findings:
1. **Asymmetric Epistemic Value:** A user visiting a Discussion room's SoU gets actionable epistemic guidance: which claims have citations, which have counter-evidence, and what remains unresolved. A user visiting a Debate room's SoU gets only aggregate counts of claims and evidence per side, with zero claim-level synthesis.
2. **Missing Parity:** The UX architecture specification states that the understanding layer should be shared across room types. Currently, Debate rooms do not utilize `StateOfUnderstanding` or `deriveStateOfUnderstanding`.

---

## 9. Current-State vs Position-Evolution Separation

### Locked Product Decision
> "State of Understanding is a CURRENT-STATE SUMMARY. It should answer: 'What can reasonably be understood from the claims, evidence, arguments and inquiries currently present?' Do NOT turn SoU into a timeline, activity dashboard, or position-evolution history. Position/evolution history is a separate future layer."

### Forensic Finding: VIOLATION IN DEBATE ROOMS
In `src/features/debates/components/debate-room.tsx` (lines 313–327):
```tsx
{currentLens === "understanding" && (
  <div className="space-y-6 animate-in fade-in duration-200">
    <RoomGuideCard roomType="debate" />
    <ArgumentEvidenceOverview
      roomId={room.id}
      claims={claims}
      propositionClaims={propositionClaims}
      oppositionClaims={oppositionClaims}
      roomEvidence={roomEvidence}
      inquiries={inquiries}
    />
    <PositionHistory roomId={room.id} />
    <div className="rounded-xl border border-border/60 bg-card/25 p-4 text-sm text-muted-foreground">
      Inspect the Claims section to compare the current proposition and opposition claims.
    </div>
  </div>
)}
```
**Impact:**  
When an authenticated user switches sides in a debate, their chronological side-switch reason and timestamp are rendered directly inside the State of Understanding view via `<PositionHistory roomId={room.id} />`. This directly violates the locked decision that SoU must remain strictly a current-state epistemic summary.

---

## 10. UI / Information Architecture

Inspected via Playwright browser automation on desktop ($1440\times900$) and mobile ($375\times812$):

### 10.1 SoU Discoverability & Presentation
- **In Conversation (Default View):** The room header keeps lenses collapsed to near-zero height, keeping chat dominant. In desktop view, hovering or focusing the header smoothly reveals the lens strip. On mobile, tapping "Lenses" reveals the full list.
- **In Understanding Lens:** Visiting `/discussions/[slug]/understanding` renders the SoU section cleanly below the persistent header. The 3 epistemic pillars (*Supported*, *Contested*, *Unresolved Front*) are displayed side-by-side on desktop.
- **Traceability:** Each claim card in SoU has a direct action: *"Inspect claim →"* or *"Inspect dispute →"*, navigating to `/claims?highlight={id}`. Unresolved claims feature *"Add evidence →"*, which triggers `/claims?highlight={id}&addEvidence=true`. Context is preserved seamlessly.

### 10.2 Mobile Responsiveness
- **Segmented Control:** On mobile ($375\text{px}$), the 3 pillars collapse into a responsive 3-tab segmented control: `Supported (1)`, `Contested (1)`, `Unresolved (16)`.
- **Layout Validation:** Evaluated via Playwright JavaScript execution:
  ```json
  { "scrollWidth": 375, "clientWidth": 375, "hasOverflow": false }
  ```
  Zero horizontal scroll overflow occurs on mobile viewports.
- **Console Errors:** Zero browser console errors logged during navigation and interaction.

### 10.3 Understanding Aid vs Dashboard Assessment
- **Discussion SoU:** Does **not** feel like an analytics dashboard. It feels like a structured executive briefing answering: *"What is substantiated so far, what is contested, and what is unbacked?"*
- **Debate SoU:** Resembles a raw scoreboard or metric card (*"1 claims · 1 evidence · 0 inquiries"*), lacking the narrative and epistemic clarity of the Discussion SoU.

---

## 11. Database / Backend

### 11.1 Lack of Backend SoU Synthesis
- There are no database tables, materialized views, or RPCs dedicated to computing room-level SoU.
- All synthesis is computed on-the-fly in browser memory from raw arrays returned by `discussion_claims`, `discussion_evidence`, and `discussion_questions`.

### 11.2 Epistemic Safety of Underlying Views
- **`discussion_claims`:** Filtered by `public.has_room_access(c.room_id)` and hides claims with `resolved_hidden` moderation flags.
- **`discussion_evidence`:** Filtered by `public.has_room_access(e.room_id)`.
- **Soft Deletion Gap:** Neither `discussion_claims` nor `discussion_evidence` filters out `deleted_at IS NOT NULL`. Deleted claims are exposed to the client with tombstone text, but because `understanding-utils.ts` does not check `deleted_at`, soft-deleted claims are still tallied in total claim counts and evidence coverage calculations.

### 11.3 Archived Room Behavior
- If a room's status is set to `archived`, `has_room_access()` still permits read access to public archived rooms, allowing SoU to remain readable as a historical record. Mutations are blocked by table-level RLS policies.

---

## 12. Runtime / Playwright QA

Live runtime verification conducted via Playwright MCP on the active development server (`http://host.docker.internal:3000`):

| Target URL | Viewport | Observed Elements | Errors / Warnings | Status |
|---|---|---|---|---|
| `/discussions` | Desktop (1440) | Feed articles rendered, active topics filter, room join links | 0 errors | **PASS** |
| `/discussions/should-ai-generated-content-be-clearly-labeled-online/understanding` | Desktop (1440) | Header title + badge, 3 epistemic columns (1 Supported, 1 Contested, 16 Unresolved), Evidence coverage badge (11%), Expand toggle | 0 errors | **PASS** |
| `/discussions/should-ai-generated-content-be-clearly-labeled-online/understanding` | Mobile (375) | Segmented control tabs (`Supported 1`, `Contested 1`, `Unresolved 16`), single active column rendered, 0 overflow | 0 errors | **PASS** |
| `/debates` | Desktop (1440) | Active debate list, motion statements, proposition/opposition cards | 0 errors | **PASS** |
| `/debates/ai-is-superior-to-humans/understanding` | Desktop (1440) | `DebateRoom` guide card, `ArgumentEvidenceOverview` (Prop 1 claim/1 evidence, Opp 0/0), disclaimer copy | 0 errors | **PASS** |

---

## 13. Findings

### Finding 1: Position History Rendered Inside Debate State of Understanding
- **Severity:** High (P1 — Architectural & Policy Violation)
- **File:** `src/features/debates/components/debate-room.tsx:324`
- **What Exists:** `<PositionHistory roomId={room.id} />` is mounted directly inside the `currentLens === "understanding"` branch.
- **Expected Behavior:** State of Understanding must remain strictly a current-state epistemic summary. Position history belongs to a separate user or audit view.
- **Impact:** Blurs the boundary between current epistemic reality and user position evolution.
- **Recommendation:** Remove `<PositionHistory />` from the understanding lens in `DebateRoom`.

### Finding 2: Arguments Table Completely Disconnected from SoU
- **Severity:** High (P1 — Epistemic Synthesis Gap)
- **File:** `src/features/discussions/components/understanding-utils.ts:67`
- **What Exists:** `deriveStateOfUnderstanding()` only accepts `claims`, `evidence`, `questions`, and `claimRelations`. It does not ingest the `arguments` table.
- **Expected Behavior:** Structured reasoning connecting premises to claims should inform the room's State of Understanding.
- **Impact:** An argument providing logical justification or identifying fallacies has zero representation in the understanding overview.
- **Recommendation:** Design an argument integration model for SoU once approved by product governance.

### Finding 3: Targeted Inquiries Ignored During Claim Epistemic Classification
- **Severity:** High (P1 — Epistemic Integrity Gap)
- **File:** `src/features/discussions/components/understanding-utils.ts:130–170`
- **What Exists:** Claim classification is binary: $\ge 1$ contradicting evidence = *contested*; $\ge 1$ supporting evidence = *supported*. Open inquiries attached to a claim are ignored.
- **Expected Behavior:** A claim facing multiple unanswered inquiries should not be classified as unreservedly "Supported by Current Evidence".
- **Impact:** Creates a false impression of epistemic certainty while critical clarifying inquiries remain unresolved.
- **Recommendation:** Factor open/unanswered inquiry counts into claim classification (e.g., mark as "Under Active Inquiry" or "Contested").

### Finding 4: Soft-Deleted Claims Included in SoU Metrics
- **Severity:** Medium (P2 — Data Hygiene / Defect)
- **File:** `src/features/discussions/components/understanding-utils.ts:74`, `src/features/discussions/services/discussion-service.ts:600`
- **What Exists:** `activeClaims` only filters `!c.isRetracted`. The `DiscussionClaim` type and mapping omit `deleted_at`, causing soft-deleted claims to remain in SoU.
- **Expected Behavior:** Soft-deleted claims should either be filtered from active synthesis or represented solely as tombstones.
- **Impact:** Stale or deleted claims inflate the total claims count and distort evidence coverage metrics.
- **Recommendation:** Add `deletedAt` to `DiscussionClaim` and filter out deleted claims from active SoU calculation.

### Finding 5: Debate Room SoU Lacks Epistemic Synthesis
- **Severity:** Medium (P2 — Room Parity Gap)
- **File:** `src/features/debates/components/argument-evidence-overview.tsx`
- **What Exists:** Debates render aggregate numeric counts rather than epistemic classification of claims.
- **Expected Behavior:** Debates should help users understand which proposition and opposition claims are evidenced vs unevidenced.
- **Impact:** Debates feel like numeric scorecards rather than instruments of understanding.
- **Recommendation:** Extend the 3-pillar epistemic model to group claims under proposition and opposition in debate rooms.

### Finding 6: Dead Legacy Code in Discussion Components
- **Severity:** Low (P3 — Technical Debt)
- **Files:** `src/features/discussions/components/discussion-room.tsx`, `src/features/discussions/components/map-tab.tsx`, `src/features/discussions/components/discussion-intelligence.tsx`
- **What Exists:** `DiscussionRoom` is completely unreferenced by App Router routes (which use `DiscussionContributionsSection` and `DiscussionRoomLayout`). `MapTab` and `DiscussionIntelligence` are also unreferenced.
- **Expected Behavior:** Deprecated components should be safely archived or removed to prevent confusion.
- **Impact:** Misleads developers and agents into inspecting dead code when auditing discussion architecture.
- **Recommendation:** Schedule dead component cleanup in an authorized refactoring phase.

---

## 14. Product Decisions Required

### Decision 1: Separation of Position History from Debate Understanding Lens
- **Question:** Where should the user's position history (side-change log) live in Debate rooms?
- **Option A:** Remove `PositionHistory` from `currentLens === "understanding"`. Position history will be visible only in the user's profile and via a dedicated future "Evolution" lens/modal.
- **Option B:** Keep `PositionHistory` collapsed at the bottom of the Understanding lens in Debate rooms, clearly separated from the Argument & Evidence overview.
- **Tradeoffs:** Option A preserves absolute fidelity to the locked decision and keeps SoU strictly focused on current evidence. Option B provides immediate local feedback to a user who just changed sides in that specific debate.
- **Recommendation:** **Option A**. Strictly enforce current-state separation.
- **Decision Required:** Product Owner approval to remove `PositionHistory` from `DebateRoom` understanding lens.

### Decision 2: Impact of Open Inquiries on Claim Epistemic Classification
- **Question:** How should open, unresolved targeted inquiries affect a claim's status in the State of Understanding?
- **Option A:** Claims with $\ge 1$ supporting citations remain "Supported", but display an "Open Inquiries Active" warning badge.
- **Option B:** Claims with open inquiries cannot be classified as "Supported by Current Evidence"; they move to a distinct "Under Examination" state or remain in "Unresolved Front".
- **Tradeoffs:** Option A prevents a single bad-faith inquiry from holding a well-evidenced claim hostage. Option B enforces rigorous epistemic humility (a claim is not supported if serious questions about its premises remain unanswered).
- **Recommendation:** **Option A** for V1 (visual indicator on card), deferring formal state demotion until inquiry satisfaction criteria are codified.
- **Decision Required:** Product Owner decision on inquiry epistemic weighting.

### Decision 3: Debate Room State of Understanding Parity
- **Question:** Should Debate rooms adopt the Discussion 3-pillar epistemic model (*Supported*, *Contested*, *Unresolved*), or retain the Proposition vs Opposition comparison?
- **Option A:** Hybrid model: Two top-level columns (*Proposition* vs *Opposition*), with each side broken down into Supported, Contested, and Unresolved claims.
- **Option B:** Keep `ArgumentEvidenceOverview` as an aggregate summary and direct users to the Claims lens for detailed examination.
- **Tradeoffs:** Option A provides rich epistemic parity across both room types. Option B keeps debate rooms lightweight and avoids complex nested grids on mobile.
- **Recommendation:** **Option A**.
- **Decision Required:** Product Owner approval for Debate SoU redesign.

---

## 15. Implementation Gaps

1. **Missing `deleted_at` handling in `DiscussionClaim`:** The TypeScript domain type and mapping function do not expose `deleted_at`, causing soft-deleted claims to persist in SoU synthesis.
2. **Unused `claimRelations`:** `useClaimRelations` is fetched in `DiscussionOverviewUnderstanding` and passed to `StateOfUnderstanding`, but never consumed by `deriveStateOfUnderstanding`.
3. **Dead `formatCommunityStance` function:** Exported in `understanding-utils.ts` but never rendered.
4. **Community Stance terminology:** Disagree votes are labeled "Not Agree" instead of "Challenge" in `claim-in-conversation.tsx` and `claim-lens-card.tsx`.
5. **No backend RPC or caching for SoU:** While acceptable for current scale, computing SoU entirely on the client from unpaginated arrays will degrade as room claim counts exceed several hundred items.

---

## 16. What Must NOT Be Changed Yet

Under the governance rules of `docs/DISCORA_AGENT_GOVERNANCE.md`:
1. **DO NOT invent SoU maturity thresholds:** Do not hardcode rules like "5 claims + 3 evidence items = unlocked". The maturity algorithm remains explicitly **OPEN / NOT APPROVED**.
2. **DO NOT introduce AI synthesis:** Do not hook up an LLM to generate natural-language room conclusions. AI must not act as the final epistemic authority.
3. **DO NOT introduce consensus thresholds or truth scores:** Do not use `consensus_ratio` from `claim_votes` to color-code or validate claims.
4. **DO NOT delete legacy components unilaterally:** Deprecated files (`discussion-room.tsx`, `map-tab.tsx`, `discussion-intelligence.tsx`) must not be deleted without an explicit cleanup task.
5. **DO NOT alter live database migrations:** All 13 Phase 7D migrations applied to production must remain untouched.

---

## 17. Recommended Next Phase

### **Phase 7E — Understanding-Layer Reconciliation & Alignment**
Following product owner decisions on the three open questions above, Phase 7E should execute the following targeted scope:
1. **Debate Room Separation:** Remove `<PositionHistory />` from `debate-room.tsx` under the understanding lens.
2. **Data Model Cleanup:** Expose `deleted_at` on `DiscussionClaim` and filter out soft-deleted claims from `deriveStateOfUnderstanding`.
3. **Terminology Alignment:** Update "Not Agree" vote badges to "Challenge" across claim conversation bubbles and claim lens cards.
4. **Targeted Inquiry Indicators:** Add an inquiry alert badge to claim cards inside `StateOfUnderstanding` when a claim has active open inquiries.
5. **Debate SoU Enhancement:** Implement the approved proposition/opposition claim breakdown in `ArgumentEvidenceOverview`.

---

## 18. MCP Verification

| MCP Capability | Verified | Actually Used | Intentionally Unused & Rationale |
|---|---|---|---|
| **Playwright** | YES | **YES** | Used to navigate live Discussion and Debate rooms, inspect rendered DOM, verify mobile 375px responsiveness, measure horizontal overflow, and check console error logs. |
| **GitHub Official** | YES | **YES** | Used (`list_commits`) to verify that local HEAD `0223c70` matches remote `origin/main` HEAD and inspect recent commit history. |
| **Sequential Thinking**| YES | **YES** | Used to structure the audit sequence, evaluate epistemic inputs, and cross-reference authoritative governance rules. |
| **Fetch** | YES | NO | Unused during audit: all inspected documents, code, and live server endpoints were local to the workspace or Docker bridge. |
| **Context7** | YES | NO | Unused during audit: no external library or framework-level API uncertainties arose during inspection. |

*No tool outages were encountered. All 5 MCPs were verified functional on the `discora-development` gateway.*
