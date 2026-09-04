# Phase 4A: Discussion Understanding & Synthesis Layer — Audit

> **Status:** AUDIT ONLY — NO CODE CHANGES  
> **Date:** September 4, 2026  
> **Subject:** Epistemic Audit of Discora Discussion Summary, Intelligence, and Synthesis Architecture.  
> **Goal:** Determine how Discora can truthfully, deterministically, and without AI hallucination surface a "State of Understanding" layer on the Discussion Overview.

---

## 1. Executive Summary

The Phase 4 Behavioral Validation confirmed a critical narrative gap in Discora:  
While the platform clearly articulates its operational ontology (*"Questions → Claims → Evidence"*), a new visitor landing on a discussion room does not see:  
**"What did all this structured research actually establish?"**

An investigation of the codebase revealed that three rich analytical components already exist:
1. `DiscussionSummary` (`src/features/discussions/components/discussion-summary.tsx`)
2. `DiscussionIntelligence` (`src/features/discussions/components/discussion-intelligence.tsx`)
3. `DiscussionHealth` (`src/features/discussions/components/discussion-health.tsx`)

However, all three components are currently stranded inside `map-tab.tsx`, a legacy visual surface unlinked from the primary navigation. The primary Discussion Overview (`discussion-room.tsx`) presents raw sections in a vertical stack without any consolidated synthesis.

Furthermore, a forensic audit of these components revealed significant epistemic defects in how they calculate "support" and "consensus":
* `DiscussionSummary` and `DiscussionIntelligence` calculate "Most Supported" and "Most Contradicted" using **claim-to-claim graph relations** (edges), completely ignoring empirical citations (`DiscussionEvidence`). Two unevidenced claims connected by a user are labeled "Supported".
* `DiscussionIntelligence` calculates consensus as a simple agreement ratio (`agree / (agree + disagree)`) without sample size thresholds, labeling a claim with 1 vote as "High Consensus" or "Emerging Consensus".
* Popularity (vote counts) is conflated with truth.

To bridge the narrative gap without compromising Discora's core mission (*"evidence over popularity"*), Discora must introduce an epistemically honest, deterministic **State of Understanding** layer directly on the Discussion Overview. This document audits existing capabilities, exposes statistical and epistemic risks, and establishes the data trust foundation.

---

## 2. Existing Intelligence Audit

### Component 1: `DiscussionSummary` (`discussion-summary.tsx`)
* **Location:** `src/features/discussions/components/discussion-summary.tsx`
* **Inputs:** `claims`, `questions`, `evidence`, `claimRelations`
* **Calculations:**
  * Importance score per claim using PageRank-style graph degree centrality (`computeImportance`).
  * `supportedClaims`: Top 3 claims sorted by `incomingSupports` (from `claimRelations`).
  * `contestedClaims`: Top 3 claims sorted by `incomingContradicts` (from `claimRelations`).
  * `openQuestions`: Questions that do not have answering claims (`!answeredQuestionIds.has(q.id)`).
  * Room maturity status: `"Opening"`, `"Developing"`, `"Mature"` based on claim and relation count thresholds.
* **Flaws Identified:**
  * **Zero Evidence Direction Usage:** Although `evidence` is passed as a prop, only `evidence.length` is read. The empirical direction (`support`, `contradict`, `context`) is ignored.
  * **Claim Relations Misrepresented as Empirical Evidence:** A claim is labeled "Most Supported" purely because other users linked other claims to it with a "supports" tag.

### Component 2: `DiscussionIntelligence` (`discussion-intelligence.tsx`)
* **Location:** `src/features/discussions/components/discussion-intelligence.tsx`
* **Inputs:** `claims`, `claimRelations`
* **Calculations:**
  * `computeAgreementRatio`: `agree / (agree + disagree)`.
  * `avgConsensus`: Average agreement across all voted claims.
  * `consensusLevel`: `"High"` (>= 70%), `"Medium"` (>= 40%), `"Low"` (< 40%).
  * `keyTension`: Highest contested claim pair.
  * `emergingConsensus`: Claims where ratio >= 0.7 AND total relations >= 2.
  * `majorDisputes`: Claims where `incomingContradicts >= 2`.
* **Flaws Identified:**
  * **Small Sample Vulnerability:** A claim with 1 Agree vote has a ratio of `1.0` (100%). If it has 2 claim relations, it is falsely crowned as "Emerging Consensus".
  * **No Empirical Grounding:** Consensus measures only voting behavior, not empirical truth.

### Component 3: `DiscussionHealth` (`discussion-health.tsx`)
* **Location:** `src/features/discussions/components/discussion-health.tsx`
* **Inputs:** `claims`, `questions`, `evidence`, `claimRelations`
* **Calculations:**
  * `evidenceCoverage`: `(claimsWithEvidence / totalClaims) * 100`.
  * `orphanClaims`: Claims not attached to any framing question.
  * Graph connectivity metrics (components, degrees).
* **Strengths:**
  * Accurately recognizes that claims without evidence are an epistemic vulnerability (`evidenceCoverage`).

---

## 3. Existing Data Sources Audit

All necessary data for a comprehensive understanding layer is already retrieved by `DiscussionDataProvider` (`src/features/discussions/components/discussion-data-provider.tsx`):

| Entity | Service / Hook | Key Fields Available | Epistemic Utility |
|---|---|---|---|
| **Claims** | `useClaims(roomId)` | `id`, `content`, `claimType`, `agreeCount`, `disagreeCount`, `questionId`, `isRetracted` | Core assertions to classify as supported, contested, or unevidenced. |
| **Evidence** | `useRoomEvidence(roomId)` | `id`, `claimId`, `direction` (`support`, `contradict`, `context`), `sourceTitle`, `sourceUrl`, `isRetracted` | Ground truth citations verifying or falsifying specific claims. |
| **Questions** | `useQuestions(roomId)` | `id`, `content`, `questionType`, `isRetracted` | Room-level inquiries defining open vs answered topic facets. |
| **Claim Relations** | `useClaimRelations(roomId)` | `sourceClaimId`, `targetClaimId`, `relationType` (`supports`, `contradicts`, `refines`) | Conceptual linkage between claims. |
| **Inquiries** | `useInquiryCountsForRoom(roomId)` | `Record<claimId, count>` | Claim-level challenges requesting evidence or clarification. |

**Crucial Finding:**  
No new database schema, migrations, or backend RPCs are required. The frontend already possesses all relational data needed to compute a trustworthy State of Understanding.

---

## 4. Trustworthiness & Epistemic Audit: What Can and Cannot Be Claimed

### What Discora CAN Truthfully Say
1. **Empirical Grounding:**
   * *"This claim has verified empirical evidence attached."*
   * *"This claim has 0 citations attached (unevidenced assertion)."*
2. **Evidence Direction & Alignment:**
   * *"Evidence citations for this claim point in supporting directions."*
   * *"Evidence citations are divided between supporting and contradicting sources."*
   * *"Evidence citations directly challenge or contradict this claim."*
3. **Community Stance (Qualified by Sample Size):**
   * If total votes >= 5: *"Community vote aligns at X% agreement (N votes)."*
   * If total votes < 5: *"Preliminary community votes (insufficient sample size)."*
4. **Dispute Identification:**
   * *"This claim is actively contested by opposing evidence and claim-level contradictions."*
5. **Topic Coverage:**
   * *"Questions Q1 and Q2 have answering claims; Questions Q3 remains unaddressed."*
   * *"X claims currently have open inquiries requesting clarification or evidence."*

### What Discora MUST AVOID Saying (Strict Negative Constraints)
1. **Never declare "Truth", "Proof", or "Fact":**
   * Even high consensus + 5 supporting citations does not equal philosophical truth. Discora must use terms like *"Well-Supported by Current Evidence"* or *"Substantiated Claim"*.
2. **Never equate Consensus with Empirical Reality:**
   * A claim with 95% Agree votes and zero evidence citations must be labeled *"Unsubstantiated Community Stance"*, never *"Established Consensus"*.
3. **Never declare a claim "Settled" if Contradictory Evidence exists:**
   * If any unrefuted contradicting evidence citation exists, the claim is permanently classified as *"Contested / Mixed Evidence"*.
4. **Never declare Consensus on Small Samples:**
   * If total votes < 5, consensus cannot be classified as High/Low; it must be labeled *"Insufficient Votes"*.
5. **Never use Game-Theoretic or Social Jargon:**
   * No "Winning Side", "Losing Side", "Top Argument", "Popular", "Defeated".

---

## 5. Evidence Semantics & Direction Audit

In Discora, evidence is explicitly categorized into three directions:
1. `support`: Cites data, trials, documentation, or historical records that substantiate the claim's premise.
2. `contradict`: Cites data or counter-examples that falsify, restrict, or challenge the claim's premise.
3. `context`: Provides background definitions, methodologies, or legal frameworks without asserting truth direction.

### The Epistemic Synthesis Matrix for Individual Claims:

| Supporting Citations | Contradicting Citations | Community Stance (Votes) | Epistemic Classification | UI State |
|:---:|:---:|:---:|---|---|
| >= 1 | 0 | Net Agree | **Substantiated (Evidenced)** | Green badge / Evidence citation preview |
| >= 1 | 0 | Net Disagree | **Evidenced Counter-Intuition** | Amber badge / Highlighted tension |
| 0 | >= 1 | Any | **Contradicted by Evidence** | Rose badge / Caution notice |
| >= 1 | >= 1 | Any | **Empirically Divided / Contested** | Violet badge / Shows both sides |
| 0 | 0 | High Agree (>=5) | **Unevidenced Consensus** | Slate badge / Needs evidence prompt |
| 0 | 0 | Any (<5) | **Unsubstantiated Assertion** | Neutral / Awaiting verification |

---

## 6. Questions vs. Inquiries Semantics

Discora maintains a strict, verified two-tier questioning model:
* **Discussion Questions (Room Level):**
  * Define what the room is exploring (e.g. *"What are the economic costs of labeling AI content?"*).
  * A question is **Answered/Framed** if at least one active claim is linked to it (`claim.questionId === question.id`).
  * A question is **Unresolved / Open** if zero claims address it.
* **Structured Inquiries (Claim Level):**
  * Targeted challenges to specific claims (Clarification, Evidence Request, Assumption Check).
  * An inquiry is **Unresolved** if its status is `"open"` or `"unsatisfied"`.

Surfacing both in the Understanding Layer provides a complete map of unresolved intellectual debt:
* Room-level debt: Unanswered framing questions.
* Claim-level debt: Open challenges awaiting sources or clarification.

---

## 7. Current Overview Experience (First-Time User Test)

Testing the live route `/discussions/should-ai-generated-content-be-clearly-labeled-online`:
1. **Can the user tell what the discussion has established?**  
   **No.** The user sees the Opening Premise, then a list of 2 Questions, then 4 Claims with voting bars, then an Evidence list. There is no executive takeaway.
2. **Can they tell what remains disputed?**  
   Only by reading each claim's consensus percentage and clicking on its evidence drawer.
3. **Can they tell what remains unanswered?**  
   Only by cross-referencing the Questions list against claim subtitles.
4. **Can they tell which claims have evidence without clicking?**  
   The claim cards have small badges `Evidence (N)`, but do not indicate whether the evidence is supporting or contradicting until expanded.
5. **Can they understand this without visiting Map?**  
   No. And Map is not even linked in the main room header.

**Conclusion:** The narrative gap is real, acute, and solvable by surfacing a deterministic synthesis on the Overview.

---

## 8. Edge Case Analysis Matrix (20 Scenarios)

| # | Edge Case | Expected System Behavior in Understanding Layer |
|---|---|---|
| 1 | **No claims in room** | Show empty state: *"Discussion in Framing Stage — Explore opening questions or contribute the first observation."* |
| 2 | **One claim only** | Render claim in neutral state with evidence prompt; do not compute room-wide consensus. |
| 3 | **No evidence in room** | Prominently display: *"0% Evidence Coverage — All claims are currently unsubstantiated assertions."* |
| 4 | **One evidence item** | Attribute evidence directly to target claim; classify room as *"Early Evidence Phase"*. |
| 5 | **Only supporting evidence** | List evidenced claims under *"Substantiated Claims"*; note absence of counter-evidence. |
| 6 | **Only contradicting evidence**| List claims under *"Challenged by Evidence"*; highlight need for supporting data. |
| 7 | **Mixed evidence on a single claim** | Classify claim as *"Empirically Contested"*; render side-by-side count of supporting vs contradicting citations. |
| 8 | **No votes on claims** | Display *"No community votes recorded"*; do not display agreement percentages. |
| 9 | **One vote on claim** | Display `1 vote (preliminary)`; never display `"High Consensus"`. |
| 10 | **Split votes (50/50, >=6 votes)** | Classify under *"Divided Community Opinion"*. |
| 11 | **High consensus + Contradicting evidence** | Critical epistemic alert: *"High Community Agreement despite Contradicting Evidence"* (flags potential bias). |
| 12 | **Low consensus + Supporting evidence** | Epistemic alert: *"Empirically Supported despite Community Skepticism"*. |
| 13 | **Many questions (10+), few claims** | Highlight: *"Broad Framing Phase — Multiple open lines of inquiry require focused claims."* |
| 14 | **No questions in room** | Display prompt: *"No framing questions defined — Add questions to structure exploration."* |
| 15 | **Open inquiries present** | Display counter and link: *"N Active Inquiries challenging specific claims."* |
| 16 | **No inquiries in room** | State: *"All current claims have zero open challenges."* |
| 17 | **Archived room** | Render static synthesis banner: *"Discussion Concluded — Final State of Understanding recorded on [Date]."* |
| 18 | **Private / Restricted room** | Adhere strictly to room visibility RLS; compute synthesis only on authorized items. |
| 19 | **Moderated / Retracted claim** | Exclude completely from synthesis calculations; decrement all evidence/relation tallies. |
| 20 | **Retracted evidence item** | Exclude completely from empirical coverage and claim substantiation tallies. |

---

## 9. Final Recommendation

1. **Do not create an AI summary.** An LLM synthesis introduces hallucinations, loss of provenance, and violates Discora's deterministic auditability.
2. **Do not modify the database.** All required fields already exist in `useClaims`, `useRoomEvidence`, `useQuestions`, and `useInquiryCountsForRoom`.
3. **Build a deterministic `StateOfUnderstanding` component** directly on the Discussion Overview, placed immediately below `OpeningPremise` and above `#questions`.
4. **Implement rigorous epistemic thresholds:** Require minimum 5 votes for consensus labeling, and require empirical evidence citations before designating any claim as substantiated.
