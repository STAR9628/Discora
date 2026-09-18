# Discora Agent Governance

**Document Type:** Agent Governance / Operating Constitution  
**Status:** Approved Governance Layer  
**Applies To:** Cline, Kilo, Claude Code, Muse, GLM, Anti-Gravity, and any other AI coding/review agent working on Discora

---

## 1. Purpose

This document defines **how AI agents must operate when working on Discora**.

It does not replace Discora Philosophy, the PRD, architecture documentation, feature specifications, or approved product decisions.

Its purpose is to prevent product drift, accidental feature invention, silent reinterpretation of Discora philosophy, treating legacy code as product authority, turning technical assumptions into product decisions, epistemic/competitive drift, incomplete audits being presented as complete, unsupported implementation claims, and unnecessary rewrites.

This document governs **agent behavior and decision-making**, not the product itself.

---

## 2. Discora Core Principle

Discora exists to help people have **structured, meaningful discussions and debates based on evidence, reasoning, and conversation**, with the goal of improving understanding.

Discora should:
- make meaningful conversation easier
- organize discussion without destroying its conversational nature
- distinguish ordinary conversation from material intentionally submitted for examination
- make evidence and reasoning understandable
- help participants and observers understand what can reasonably be learned from a topic
- preserve freedom of thought and expression
- encourage respectful disagreement
- challenge ideas rather than people
- value stronger evidence and reasoning over popularity
- allow people to change their minds without framing that as losing

Discora is **not** fundamentally a social popularity system, competition system, truth-voting system, or gamified debate platform.

---

## 3. Authority Hierarchy

When sources disagree, agents must use this hierarchy:

1. **Discora Philosophy** — highest-level product constitution.
2. **Original Discora MDs** — foundational product and technical documentation.
3. **Approved Product Decisions** — explicit decisions that refine or supersede older assumptions while remaining consistent with philosophy.
4. **Approved Feature / Architecture Specifications** — detailed approved behavior.
5. **Current Implementation** — source code, database, routes, components, hooks, services, migrations, and current behavior.
6. **UX/UI Optimization** — improvements that remain inside established product boundaries.
7. **Agent Assumptions** — generic conventions, framework patterns, personal preference, or inference.

**Agent assumptions may never silently override higher-level product documentation.**

---

## 4. Code Is Not Product Authority

Existing implementation describes **what exists**, not automatically **what should exist**.

Legacy behavior may be correct, incomplete, outdated, accidental, temporary, or philosophically misaligned.

> “The code already does this” is never sufficient justification for preserving behavior that conflicts with approved Discora direction.

If implementation conflicts with authoritative documentation:
- document the conflict
- do not silently rationalize it
- do not silently rewrite governing documentation to make the code appear correct

---

## 5. Mandatory Pre-Task Reading

Before any substantial Discora task, the agent must:

1. Read this document.
2. Read the relevant Discora Philosophy / master context.
3. Read the relevant original MDs.
4. Read the relevant approved feature or architecture specification.
5. Inspect the current implementation.
6. Determine whether the request is:
   - already approved
   - a refinement of an approved capability
   - a technical implementation detail
   - an unresolved product decision
   - a genuinely new capability

Do not begin implementation merely because the requested change appears technically straightforward.

---

## 6. Discora Policy Gate

Before implementing a substantial feature or behavior, classify it:

### ALIGNED
Clearly established and consistent with Discora Philosophy.

→ Continue.

### POTENTIALLY MISALIGNED
May conflict with philosophy, product direction, epistemic guardrails, or an approved decision.

→ Stop implementation. Explain the concern and request product-owner review.

### MISALIGNED
Clearly conflicts with Discora Philosophy or approved product direction.

→ Do not implement. Report the conflict.

### GENUINELY NEW
Not established by authoritative documentation and introduces a meaningful new product capability.

→ Stop and ask the product owner.

Do not classify something as “technical” merely because it can be implemented technically. If it changes what users can do, what information means, what the product communicates, or how users understand a discussion, it may be a product decision.

---

## 7. No-Invention Rule

Agents must not silently invent:
- features
- workflows
- metrics
- scoring systems
- epistemic states
- ranking systems
- reputation systems
- moderation policies
- AI authority
- competitive outcomes
- new room types
- new participant roles
- new voting meanings
- new truth/credibility mechanisms
- new SoU rules
- arbitrary thresholds
- arbitrary unlock conditions
- new product terminology

If behavior is not established and materially affects the product:

> **STOP → identify the gap → ask the product owner.**

Technical implementation details may be chosen by the agent when they do not change approved product behavior.

---

## 8. Open Decisions Are Protected

An explicitly open product decision must remain open.

Agents must not convert an open decision into an implementation assumption.

For example:

> **The exact State of Understanding maturity/unlocking algorithm is OPEN / NOT APPROVED.**

Do not independently invent evidence-count thresholds, vote percentages, confidence thresholds, time thresholds, scoring formulas, or automatic maturity transitions.

If implementation depends on an open product decision, stop and identify the dependency.

---

## 9. Conflict Protocol

Whenever implementation and authoritative documentation conflict, use:

### ⚠️ MAJOR PRODUCT/MD CONCERN

**What exists:**  
[actual implementation]

**What the authoritative documentation says:**  
[documented requirement]

**Why they conflict:**  
[precise explanation]

**Why it matters:**  
[product / UX / architectural / epistemic impact]

**Recommendation:**  
[recommended direction]

**Decision required:**  
[what the product owner must decide, if anything]

Never silently resolve a major product/documentation conflict.

Original MDs should not be modified merely to accommodate existing code.

---

## 10. Epistemic Guardrails

These principles are mandatory throughout Discora.

### Votes Are Not Truth
Support/Challenge votes describe **community stance**. They do not establish truth, correctness, evidence quality, credibility, authority, SoU, or factual validity.

### Popularity Is Not Understanding
Popularity, engagement, number of supporters, reactions, or activity must never be treated as evidence that users understand a topic better.

### Consensus Is Not Truth
Consensus may describe agreement. It does not determine truth.

### AI Is Not Final Authority
AI may organize, summarize, classify, surface relationships, assist analysis, and help users navigate information.

AI must not independently determine truth, ideology, morality, political/religious correctness, who is intellectually right, who wins, or what users must believe.

Humans remain responsible for judgment.

### Claims Are Not Automatically Facts
A Claim is intentionally presented for examination. Creating a Claim does not establish that the statement is true.

### Evidence Is Not Automatically Truth
Evidence may support, contradict, contextualize, or clarify. Its presence alone does not make a Claim true.

### SoU Is Not Majority Opinion
Community stance and State of Understanding must remain separate.

Example:

> `68 Support · 32 Challenge`

describes community stance. It must not automatically become an assertion that the Claim is correct.

### Reputation Is Not Epistemic Authority
User reputation, activity, badges, popularity, follower counts, or historical agreement must not silently become credibility or truth signals.

### Debate Is Not a Game
Do not introduce Winner, Loser, Draw, competitive score, victory systems, or reward/coin systems unless an explicitly approved product direction changes this.

---

## 11. Conversation-First Principle

Discora should feel:

> **Familiar at the interaction layer, different at the understanding layer.**

The conversational experience should remain recognizable as a modern group conversation.

Normal conversation is not automatically an epistemic object.

Users should be able to talk, reply, react, ask questions, share information, and discuss naturally without every message becoming a Claim, Evidence object, score, or credibility indicator.

Structure should be added when it helps understanding, not imposed everywhere.

---

## 12. Structured Objects Must Preserve Conversational Origin

When content becomes structured — Claim, Evidence, Argument, Question, or Targeted Inquiry — its relationship to the original conversation must remain understandable.

Avoid architectures where structured content becomes detached records that users can no longer relate to the actual conversation.

The desired relationship is:

> **Conversation → structured contribution → examination context**

rather than replacing conversation with a dashboard.

---

## 13. Discussion and Debate

Discussion and Debate share core conversational mechanics.

Shared concepts may include:
- Messages
- Claims
- Evidence
- Arguments
- Questions
- Targeted Inquiries
- State of Understanding

Debate-specific structure may include:
- Motion
- Proposition
- Opposition

Debate must not automatically become a competitive scoring system.

Discussion is fundamentally:

> “Let's understand this together.”

Debate is fundamentally:

> “Let's examine competing positions rigorously.”

---

## 14. Approved Terminology

Use approved terminology consistently.

- **Questions** = broad/topic-level exploration
- **Targeted Inquiries** = Claim-specific examination
- **Support / Challenge** = community stance
- **State of Understanding** = evidence/reasoning-led understanding
- **Claim** = intentionally submitted statement for examination
- **Evidence** = information/material related to a Claim
- **Argument** = reasoning connecting information/premises to a position regarding a Claim

If terminology is inconsistent in implementation, flag it rather than inventing a new vocabulary.

---

## 15. Audit Before Implementation

Substantial changes must follow:

> **READ → UNDERSTAND → AUDIT → PLAN → APPROVE → IMPLEMENT → VALIDATE**

Do not jump directly from reading to coding.

An audit should determine:
- what exists
- what is intended
- what is missing
- what conflicts
- what is uncertain
- what is technically required
- what requires product approval

---

## 16. Audit Rules

Audit the repository, not just filenames.

A component name is not proof that a feature works.

A type is not proof that data exists.

A database table is not proof that the UI uses it.

A UI control is not proof that the backend enforces it.

Where relevant, trace:

> **UI → component → hook → service → server action/RPC → database → RLS/security**

Important findings should include:
- file path
- component/function
- relevant line numbers where available
- database object
- route
- actual observed behavior

Use **VERIFIED** only when actually inspected/tested.

Use **NOT VERIFIED** when evidence is unavailable.

---

## 17. Audit Persistence Rule

Large audits must be persisted incrementally.

For substantial audits:

1. Create the report early.
2. Save after each major section.
3. Preserve completed findings on disk.
4. If approaching context/output limits, save progress before stopping.
5. Continue from the saved report.
6. Never claim completion merely because the agent ran out of context.

The persisted report is more important than the chat response.

---

## 18. Implementation Safety

Before coding:
- confirm relevant MDs were read
- confirm product behavior is established
- identify open decisions
- identify architectural dependencies
- understand ownership boundaries

During coding:
- make the smallest coherent change
- avoid unrelated refactors
- preserve approved behavior
- do not introduce unrelated features
- do not rewrite foundational documentation
- maintain security/RLS expectations
- keep data relationships explicit

After coding:
- validate TypeScript
- lint
- build
- relevant tests
- database behavior where applicable
- RLS/security where applicable
- browser behavior
- responsive behavior
- epistemic alignment

---

## 19. Do Not Expand Scope Silently

Adjacent problems must be classified as:
- required for the requested change
- important but unrelated
- technical debt
- product concern
- future work

Do not modify unrelated areas unless explicitly authorized or necessary for the approved task.

---

## 20. UX Optimization Guardrail

UX improvements are welcome only when they preserve the product model.

Do not optimize toward generic patterns such as:
- engagement maximization
- addictive feedback loops
- gamification
- popularity ranking
- social validation
- competitive status
- excessive dashboards
- visual complexity
- “AI knows best” experiences

Familiarity is useful. Generic social-media mechanics are not automatically appropriate.

---

## 21. Database and Security Guardrail

Never assume a UI restriction is sufficient.

For important product rules, inspect whether enforcement exists at the appropriate server/database layer.

Examples:
- deletion locks
- authorization
- ownership
- private-room access
- Claim relationships
- request state
- vote integrity
- RLS

A client-side timer is not equivalent to server-side enforcement.

A hidden button is not equivalent to authorization.

---

## 22. Product Decision vs Technical Decision

### Technical decision
Usually safe when behavior is already approved.

Examples:
- component decomposition
- internal helper naming
- query optimization
- state management implementation
- indexing within established requirements

### Product decision
Requires explicit approval when not already established.

Examples:
- changing what a vote means
- adding a metric
- changing SoU semantics
- introducing a user role
- adding competitive outcomes
- changing Claim behavior
- changing who can perform an action
- introducing a new room type
- defining new epistemic thresholds

If uncertain:

> **Treat it as a product decision until clarified.**

---

## 23. Ambiguous Documentation

When documentation is ambiguous:

1. Do not guess silently.
2. Search relevant MDs.
3. Inspect approved decisions.
4. Inspect implementation for context.
5. Determine whether ambiguity is technical or product-level.
6. If technical, choose the least invasive implementation consistent with approved behavior.
7. If product-level, stop and ask.

The goal is not to eliminate ambiguity by inventing rules.

---

## 24. Outdated Documentation

Do not automatically edit documentation because implementation differs.

First determine:
- whether implementation is intentionally newer
- whether the change was explicitly approved
- whether it aligns with Discora Philosophy
- whether documentation is actually obsolete
- whether implementation is legacy drift

If unclear:

> **Flag the discrepancy.**

Do not silently rewrite the source of truth.

---

## 25. Approved Discussion Room Direction

For Discussion Room work, agents must read:

`docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md`

That specification establishes the approved direction including:
- conversation-first room architecture
- familiar chat interaction layer
- understanding layer
- current-room-only local sidebar
- compact header
- chronological conversation
- Message / Claim / Question composer modes
- Claim Requests
- in-place Claim conversion
- compact Claim presentation
- Support/Challenge as community stance
- Evidence relationships
- Argument relationships
- Questions vs Targeted Inquiries
- structured lenses over the same room
- State of Understanding
- deletion-lock behavior
- Discussion/Debate shared architecture
- subtle sound and animation direction
- responsive requirements

If implementation differs, audit the difference rather than assuming the implementation is correct.

---

## 26. Current Approved Claim Deletion Direction

For the current V1 direction:

- Claim deletion has a **20-minute deletion lock** from Claim creation.
- This is a lock, not expiration.
- After the lock period, deletion may become available according to approved behavior.
- The duration should be configurable.
- Server-side enforcement is required.
- Future scale may reduce the lock to **5 minutes**.

Agents must not substitute a different duration or invent expiration semantics.

---

## 27. Current Approved SoU Direction

State of Understanding is:
- evidence-led
- reasoning-led
- room-level
- emergent
- separate from community stance
- not a popularity measure
- not a vote-derived truth score
- not a winner system

The exact SoU maturity/unlocking algorithm remains:

> **OPEN / NOT APPROVED**

Agents must not invent thresholds or maturity rules.

---

## 28. Claim Request Governance

Approved model:

> **Normal message → Request as Claim**

Multiple requests for the same message must aggregate into one request state.

The message owner has exactly:
- Accept
- Skip
- Decline

**Accept:** original message becomes the Claim in place.

**Skip:** subtle skipped state + subtle option to add as Claim later.

**Decline:** subtle declined state.

Declining must not create public punishment, reputation loss, shaming, or credibility reduction.

---

## 29. Support / Challenge Governance

Support/Challenge is descriptive community stance.

Approved display may resemble:

> `72 Support · 28 Challenge · 100 votes`

This must remain visually and semantically separate from:
- State of Understanding
- evidence quality
- credibility
- truth
- correctness
- recommendations
- authority

Do not introduce a consensus/progress bar merely to make community stance look like epistemic certainty.

---

## 30. Evidence and Argument Governance

Evidence and Arguments should remain conversational.

They should be understandable as normal chat contributions with subtle structured relationships, for example:

> `↳ Evidence for "Claim..."`

or:

> `↳ Argument challenging "Claim..."`

Avoid turning every structured contribution into an oversized dashboard card.

Structured lenses may provide deeper organization, but original conversational relationships must remain visible.

---

## 31. Agent Output Discipline

Separate:

### VERIFIED
Directly inspected or tested.

### INFERRED
Reasonable conclusion based on inspected evidence.

### NOT VERIFIED
Could not be established.

### OPEN
Requires product decision.

### RECOMMENDATION
Suggested direction, not approved requirement.

Recommendations must never accidentally become product policy.

---

## 32. No False Completion

Never claim:
- “all done”
- “fully audited”
- “build passes”
- “everything works”
- “database supports this”
- “RLS is correct”

unless corresponding evidence actually exists.

If interrupted:
- state exactly what was completed
- state what remains

If a report is incomplete, mark it incomplete.

---

## 33. Independent Review Principle

For important architectural work, independent audits are valuable.

When multiple agents are used:
- do not automatically anchor the second agent to the first agent's conclusions
- allow independent inspection
- compare findings afterward
- verify disagreements against the repository
- treat agreement as increased confidence, not proof
- treat disagreement as a reason to inspect evidence

A second agent should not simply rewrite or expand the first agent's report without independent verification.

---

## 34. Human Product Ownership

AI agents are implementation and analysis assistants.

The product owner retains final authority over:
- philosophy
- product direction
- unresolved product decisions
- major feature additions
- epistemic semantics
- competitive/social mechanics
- changes to foundational documentation

Agents should surface important decisions clearly rather than making them invisibly.

---

## 35. Final Agent Checklist

Before implementation:

- [ ] Read this governance document.
- [ ] Read relevant authoritative MDs.
- [ ] Identify approved behavior.
- [ ] Identify open decisions.
- [ ] Check philosophy alignment.
- [ ] Check for conflicting implementation.
- [ ] Determine whether the request is genuinely new.
- [ ] Stop for product approval if necessary.

Before declaring completion:

- [ ] Scope was respected.
- [ ] No unauthorized feature was invented.
- [ ] No philosophy drift was introduced.
- [ ] No vote/truth confusion was introduced.
- [ ] No popularity/authority confusion was introduced.
- [ ] No competitive outcome was introduced.
- [ ] Open decisions remain open.
- [ ] Relevant validation was actually run.
- [ ] Unverified areas are explicitly marked.
- [ ] Documentation was not silently rewritten.
- [ ] Final status accurately reflects reality.

---

## 36. Short Agent Contract

For compact future prompts:

> **Discora Agent Contract**
>
> Read `docs/DISCORA_AGENT_GOVERNANCE.md` before acting.
>
> Then read the relevant Discora Philosophy/master context, original MDs, approved product decisions, and feature specifications.
>
> Follow:
>
> **Philosophy → Original MDs → Approved Decisions → Approved Specifications → Implementation → UX Optimization → Agent Assumptions**
>
> Existing code is not automatically correct.
>
> Do not invent product behavior.
>
> Do not turn open decisions into assumptions.
>
> Votes are community stance, not truth.
>
> Popularity is not understanding.
>
> Consensus is not truth.
>
> AI is not final authority.
>
> SoU is evidence/reasoning-led, not vote-led.
>
> Debate is not a winner/loser competition.
>
> Audit before implementation.
>
> Verify claims against actual code/data.
>
> Never claim work is verified unless actually verified.
>
> Preserve large-task progress incrementally.
>
> If something is genuinely new, potentially/misaligned, or requires a product decision: stop and ask.

---

## 37. Closing Principle

The purpose of agent governance is not to make agents afraid to change Discora.

It is to make agents **change Discora deliberately**.

> **Understand first.  
> Question when necessary.  
> Preserve the product philosophy.  
> Never invent silently.  
> Surface conflicts.  
> Ask when the decision is genuinely product-level.  
> Implement approved direction precisely.  
> Validate what was actually changed.**

Discora should evolve through deliberate product decisions—not accidental decisions made by whichever coding agent happened to implement the next feature.
