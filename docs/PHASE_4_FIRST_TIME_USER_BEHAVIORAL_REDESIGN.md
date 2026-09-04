# PHASE 4: FIRST-TIME USER BEHAVIORAL REDESIGN SPECIFICATION

**Status**: DESIGN SPECIFICATION ONLY — NO CODE CHANGES  
**Date**: September 2026  
**Focus**: Solutions strictly targeting validated P1 behavioral friction points identified in the Phase 4 Audit.  
**Constraint**: Design specification only. Zero source code changes, zero migrations, zero RPC modifications.

---

## 1. Architectural Guardrails (What Must NOT Change)

Before detailing any UX enhancements, the following platform pillars are strictly protected and immutable:
1. **Questions and Structured Inquiries remain separate**: Discussion Questions define topic scope; Structured Inquiries scrutinize claims. They must not be merged.
2. **Evidence remains first-class**: Evidence items are never degraded into plain comments with links. The Evidence Bank architecture is preserved.
3. **Claims remain atomic assertions**: Claims are discrete evaluable units, never paragraphs of rambling text.
4. **Debate structure remains binary and stance-committed**: Proposition vs Opposition commitments remain central.
5. **No gamification, vanity metrics, or engagement spam**: No badges, karma scores, streaks, upvote counters, or push notifications.
6. **Neutrality and truth over popularity**: No algorithmic ranking by controversy or virality.

---

## 2. Redesign Focus Area 1: Demystifying the First Contribution (P1)

### Problem Statement:
First-time users who have an intellectual insight encounter a blank-form taxonomy barrier. They are forced to classify their thought as a `Claim`, `Evidence item`, `Discussion Question`, or `Structured Inquiry` before typing their core thought. This creates hesitation and contribution abandonment.

### Empirical Evidence:
In the Phase 4 Audit, an unauthenticated or newly registered user visiting the discussion tabs saw disparate buttons (`Add Claim`, `Add Evidence`, `Ask Question`, `Post Contribution`) across different sub-pages without a unified mental bridge explaining how their thought fits into the discussion.

### User Behavior Affected:
A novice who wants to share a factual point or counterargument feels intimidated by the terminology and retreats to passive reading.

### Design Principle:
> *Capture the thought first; refine the structure second. Never demand ontological expertise as a prerequisite for participation.*

### Proposed Redesigned Experience:
1. **Unified Contextual Action Bar**:
   - Instead of fragmented buttons scattered across tabs, introduce an inline contribution prompt at the top of the discussion content area:
     > *"Have an argument, question, or evidence to add?"*
   - Clicking this prompt expands an inline draft drawer with three plain-English paths:
     - **"Make an assertion"** $\rightarrow$ Routes to Claim draft (with claim type helper: Support, Counterpoint, Observation).
     - **"Attach supporting or contradicting evidence"** $\rightarrow$ Routes to Evidence submission (with URL and claim selector).
     - **"Raise an open question"** $\rightarrow$ Routes to Discussion Question submission.
2. **Inline Drafting Guidance (Write-First Helper)**:
   - Allow the user to enter their text first. As they write, a subtle helper pill suggests:
     *"Looks like an assertion — this will be posted as a Claim so participants can evaluate and back it with evidence."*

### Progressive Disclosure Strategy:
- **Novice Layer**: User sees simple prompts (*"Assert a claim"*, *"Add evidence"*, *"Ask a question"*).
- **Intermediate Layer**: Once drafting begins, the user is introduced to claim categories (`supporting_idea`, `counterpoint`, `observation`).
- **Advanced Layer**: Complex metadata (epistemic weight, peer evidence linking) remains accessible via dropdown disclosure.

### What Must NOT Change:
- The database schema for `claims`, `evidence`, and `questions` remains 100% identical.
- All submissions are still validated as discrete, typed entities.

---

## 3. Redesign Focus Area 2: Plain-Language Staging for Structured Inquiries (P1)

### Problem Statement:
The button label `Raise Structured Inquiry` on claim cards creates psychological distance. While academically accurate, the phrase "Structured Inquiry" is perceived by first-time visitors as a legalistic or bureaucratic function (e.g., filing a complaint or report) rather than an intellectual challenge to a premise.

### Empirical Evidence:
First-time visitors routinely bypassed the inquiry button, believing it was an administrative reporting tool or customer service feature, despite understanding the concept of questioning a premise.

### User Behavior Affected:
Low utilization of claim-targeted challenges by new users, leaving claims unexamined unless audited by experienced contributors.

### Design Principle:
> *Calm, accessible language invites deeper scrutiny. Preserve rigorous mechanics while removing jargon barriers.*

### Proposed Redesigned Experience:
1. **Button Copy Modernization**:
   - Update the claim card action button from:
     `[Raise Structured Inquiry]`
     to:
     `[Scrutinize Claim]` (or `[Challenge / Question Claim]`).
2. **Contextual Tooltip & Staging**:
   - Hovering or focusing the button displays a calm tooltip:
     > *"Ask the author to clarify their premise, provide evidence, or test their assumptions."*
3. **Modal Staging**:
   - Inside the inquiry creation dialog, present the three existing inquiry types with conversational clarity:
     - **Evidence Request**: *"Ask for empirical data or documentation supporting this assertion."*
     - **Clarification**: *"Ask what a specific term or statement means in this context."*
     - **Assumption Check**: *"Identify an unstated premise that this claim relies upon."*

### Progressive Disclosure Strategy:
- The user sees a natural button: `Scrutinize Claim`.
- On click, they choose the specific scrutiny category (Evidence, Clarification, Assumption).
- The resulting entity is saved in the database as the exact existing `inquiry_items` row.

### What Must NOT Change:
- The underlying `inquiry_items` table and its types (`clarification`, `evidence_request`, `assumption_check`) remain completely unchanged.
- The standalone route `/inquiries/[id]` remains the canonical destination for deep inquiry threads.

---

## 4. Redesign Focus Area 3: Clarifying the Room Navigation Vocabulary (P2)

### Problem Statement:
The room navigation tabs (`Overview`, `Claims`, `Evidence`, `Discussion Questions`, `Contributions`) cause slight cognitive confusion between `Claims` and `Contributions`. Novices ask: *"If I post a claim, is it in Claims or Contributions?"*

### Proposed Refinement:
- Update tab labels to make their epistemic role distinct:
  - `Overview` $\rightarrow$ `Premise & Start`
  - `Claims` $\rightarrow$ `Claims Bank` (or `Claims`)
  - `Evidence` $\rightarrow$ `Evidence Bank`
  - `Discussion Questions` $\rightarrow$ `Guiding Questions`
  - `Contributions` $\rightarrow$ `Full Submissions` (or `All Contributions`)
- Add a subtle 1-line subtitle under the active tab header:
  - Under Claims: *"Atomic assertions evaluated by the community."*
  - Under Evidence: *"Empirical sources supporting, contradicting, or contextualizing claims."*
  - Under Guiding Questions: *"Open inquiries that define the scope of this discussion."*

---

## 5. Summary of Redesign Impacts

| Area | User Pain Point | Redesigned Solution | Behavioral Outcome |
| :--- | :--- | :--- | :--- |
| **First Contribution** | Taxonomy paralysis before drafting. | Write-first guidance with 3 plain-language paths. | Increased contribution confidence without sacrificing claim atomicity. |
| **Structured Inquiries** | Jargon creates fear of "doing it wrong". | Re-label to *"Scrutinize Claim"* with contextual helper. | Higher engagement with claim challenges and evidence demands. |
| **Room Navigation** | Ambiguity between claims and contributions. | Explicit tab naming with 1-line descriptive subtitles. | Zero hesitation when browsing different layers of the argument. |
