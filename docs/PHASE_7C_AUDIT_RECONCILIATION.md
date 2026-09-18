# Phase 7C — Discussion Room Audit Reconciliation

**Status:** Reconciled from two independent repository audits  
**Audits compared:** Cline/GLM audit and Muse Spark 1.3 independent audit  
**Scope:** Discussion Room architecture, epistemic integrity, data/security prerequisites, and implementation readiness

---

## 1. Executive Verdict

**FINAL VERDICT: FAIL WITH CRITICAL GAPS**

The two independent audits materially corroborate the same central problems:

1. The Discussion Room does not currently open as a conversation-first experience.
2. The current section architecture behaves more like disconnected pages than lenses over one conversation.
3. Claim Requests are absent.
4. Discussion Arguments are absent.
5. The unified Message / Claim / Question composer is absent.
6. Message → Claim currently behaves as copy + origin link rather than the newer approved in-place direction.
7. Support/Challenge votes currently leak into reputation/credibility/consensus-related systems and SoU presentation.
8. Claim deletion is currently retraction/immutability-oriented rather than the approved V1 deletion-lock model.
9. Sources lens and reactions infrastructure are missing.
10. Runtime responsive/accessibility validation remains unverified.
11. There is a real documentation conflict around Message → Claim semantics that must be explicitly resolved before implementation.
12. The exact SoU maturity/unlocking algorithm remains open and must not be invented.

**Implementation readiness: NOT READY.**

The correct next stage is **product-decision reconciliation + architecture planning**, not immediate coding.

---

# 2. What Both Audits Independently Corroborate

These findings have high confidence because both audits reached substantially the same conclusion from repository inspection.

| Area | Cline/GLM | Muse | Reconciliation |
|---|---|---|---|
| Conversation-first room entry absent | Yes | Yes | **CONFIRMED** |
| Current architecture is section/page-oriented | Yes | Yes | **CONFIRMED** |
| Room-local current-room navigation absent | Yes | Yes | **CONFIRMED** |
| Unified Message/Claim/Question composer absent | Yes | Yes | **CONFIRMED** |
| Message→Claim is copy/link rather than approved in-place behavior | Yes | Yes | **CONFIRMED** |
| Claim Requests absent | Yes | Yes | **CONFIRMED** |
| Discussion Arguments absent | Yes | Yes | **CONFIRMED** |
| Claim cards have legacy truth/credibility presentation | Yes | Yes | **CONFIRMED** |
| Votes contaminate epistemic/reputation paths | Yes | Yes | **CRITICAL — CONFIRMED** |
| Deletion-lock absent / retraction-only behavior | Yes | Yes | **CONFIRMED** |
| Sources lens absent | Yes | Yes | **CONFIRMED** |
| Reactions infrastructure absent | Yes | Yes | **CONFIRMED** |
| SoU core is evidence-oriented but has vote/display/maturity concerns | Yes | Yes | **CONFIRMED WITH VERIFICATION REQUIRED FOR SEVERITY** |
| Browser/responsive QA not performed | Yes | Yes | **CONFIRMED NOT VERIFIED** |
| Winner/Loser system appears removed in working tree but production application status is unverified | Yes | Yes | **CONFIRMED NOT VERIFIED IN PROD** |

---

# 3. Highest-Confidence Critical Findings

## 3.1 Conversation-First IA

### Finding

The approved model requires:

> Conversation as the default and primary room experience.

Current `/discussions/[slug]` renders an overview/dashboard-oriented experience instead.

### Reconciliation

**Confirmed P0.**

This is not merely visual polish. It changes the fundamental interaction model of the Discussion Room.

### Action

Implementation is required after planning.

No additional product decision appears necessary because the approved specification already establishes the direction.

---

## 3.2 Disconnected Lenses

### Finding

Current claims/evidence/questions/contributions are implemented as separate routes/components with independent fetching and without the approved shared conversational-origin experience.

### Reconciliation

**Confirmed major architecture gap.**

The important distinction is:

> Routes may still exist for deep links.

The problem is not that multiple URLs exist.

The problem is whether they behave as **lenses over one room** rather than disconnected destinations.

### Action

Architecture planning required.

Likely engineering work rather than a new product decision, provided the approved specification is followed.

---

## 3.3 Claim Requests

### Finding

No complete Request-as-Claim entity, aggregation model, lifecycle, UI, or server enforcement was found.

### Reconciliation

**Confirmed P0 missing capability.**

The product behavior itself is already established:

- Request as Claim
- aggregated requests
- Accept
- Skip
- Decline
- in-place conversion on Accept
- subtle states
- no penalty/shame

### Important distinction

The **product behavior is approved**.

The following are engineering architecture:

- exact table structure
- indexes
- RPC names
- RLS implementation
- aggregation query
- notification mechanism

Those should not be incorrectly elevated into new product decisions.

---

# 4. Message → Claim: Genuine Documentation Conflict

This is the clearest issue requiring product-owner resolution.

## Current implementation

Muse and Cline both found a copy/link model using `origin_message_id`.

## Newer Discussion Room specification

The approved room direction states:

> Original message becomes the Claim in place.

No duplicate conversational content.

## Older Knowledge Model

`23_KNOWLEDGE_MODEL.md` describes extraction/promotion using copy + link semantics.

## Reconciliation

This is a **real source-of-truth conflict**.

It must not be silently resolved by an implementation agent.

### Decision Required

Choose between:

**A. In-place conversion**

or

**B. Copy + link / promotion**

### Recommendation

**A — In-place conversion.**

Reason:

It is the explicitly approved newer Discussion Room UX direction and better matches the familiar-chat + understanding-layer model by avoiding duplicated conversational content.

However, this should be recorded as an explicit approved product decision and the conflict with `23_KNOWLEDGE_MODEL.md` should then be handled deliberately rather than silently ignored.

---

# 5. Epistemic Integrity — Most Important Technical/Product Issue

Both audits independently verified that current vote data is not fully isolated as community stance.

Observed paths include:

- Claim votes → reputation
- Evidence votes → reputation
- consensus bonus → reputation
- votes → claim credibility
- vote-related information → SoU presentation/reason text
- reputation → claim presentation
- retraction → negative reputation/penalty behavior

## Reconciliation

**Confirmed critical epistemic violation.**

The approved model is:

> Support/Challenge = community stance.

It must not become:

- truth
- correctness
- credibility
- authority
- evidence quality
- SoU
- recommendation
- ranking

### Important distinction

The **direction to remove these epistemically misleading dependencies is already strongly established** by Discora governance/specification.

What may require product clarification is what, if anything, should replace the old reputation mechanics.

We should NOT invent a replacement reputation formula.

### Recommendation

Do an explicit epistemic cleanup:

1. Remove vote → reputation authority effects.
2. Remove vote → credibility effects.
3. Remove consensus bonus used as authority/reputation.
4. Remove vote-derived SoU presentation.
5. Keep Support/Challenge as descriptive stance only.
6. Do not introduce a replacement score unless explicitly approved.

---

# 6. Retraction Penalties

Both audits found negative effects associated with retraction.

The governance/specification explicitly treats changing one's mind as compatible with Discora's philosophy and rejects punishment/shaming.

## Reconciliation

The **existing penalty behavior is misaligned**.

The exact historical rationale for the old reputation system does not justify preserving it.

### Recommendation

Remove retraction penalties as part of the epistemic cleanup unless the product owner explicitly approves a different, non-punitive semantic.

Do not invent a replacement penalty.

---

# 7. Claim Deletion vs Retraction

Both audits confirmed the current implementation is effectively retraction/immutability-oriented rather than the approved V1 deletion-lock direction.

Approved V1:

- 20-minute deletion lock
- configurable
- server-side enforcement
- not expiration
- future scale may use 5 minutes

## Reconciliation

The specification already establishes the intended direction.

The **engineering implementation does not require a new product decision** merely to implement the 20-minute lock.

However, because the current system has a legacy retraction/immutability model, the migration must explicitly define how:

- deletion
- retraction
- existing retracted Claims
- Evidence
- Arguments
- deleted-Claim references

interact.

That is an architecture/lifecycle planning task.

---

# 8. Discussion Arguments

Both audits confirmed:

> No Discussion Argument entity/UI exists.

Existing claim relations are not automatically equivalent to Arguments.

## Reconciliation

**Confirmed missing capability.**

The product semantics are already established:

> Argument = reasoning connecting information/premises to a position regarding a Claim.

Engineering still needs to define:

- entity
- relationship
- lifecycle
- RLS
- replies
- reactions
- structured lens representation

These are implementation architecture, not necessarily new product decisions.

### Recommendation

Design a Discussion Argument model separately from Debate-specific infrastructure unless inspection during planning proves safe reuse without semantic distortion.

---

# 9. Evidence Votes

Both audits found evidence voting infrastructure and vote→reputation effects.

The approved documentation establishes Claim voting semantics more clearly than Evidence voting semantics.

## Reconciliation

**Evidence-vote semantics remain OPEN unless an authoritative document resolves them.**

Do not automatically preserve the existing reputation effect.

Do not automatically invent a new meaning.

### Recommendation

For implementation planning:

1. Trace all existing evidence-vote consumers.
2. Determine whether the product actually needs evidence voting.
3. If retained, define its meaning explicitly.
4. If not retained, remove it deliberately.
5. Never allow it to silently become authority/quality/truth.

This is a genuine product decision only if the intended meaning cannot be resolved from the authoritative documents.

---

# 10. State of Understanding

Both audits agree on two separate facts:

### Strength

The core SoU computation is substantially evidence-oriented.

### Problems

- vote-related information appears in SoU presentation/reason text
- `hasSufficientData` appears to establish a maturity/data condition not explicitly approved

## Reconciliation

We should distinguish:

### Confirmed

SoU must remain evidence/reasoning-led and separate from community stance.

### Confirmed

Vote-derived wording/presentation must not imply that community stance is SoU.

### Needs verification before severity assignment

Whether `hasSufficientData` is truly a user-facing **maturity/unlocking rule** versus a simple internal empty/non-empty guard.

Therefore:

**Do NOT automatically classify the implementation as a P0 solely because the helper exists.**

Before implementation, inspect the exact call chain and UI behavior.

### Known Open Decision

The exact SoU maturity/unlocking algorithm remains:

> **OPEN / NOT APPROVED**

No agent should invent thresholds.

---

# 11. Room Navigation

Both audits found:

- no room-aware global sidebar subsection
- section pills instead of the approved room-local model

## Reconciliation

**Confirmed missing capability.**

This is already specified.

No additional product decision is needed for the basic approved behavior.

Implementation planning should cover:

- current room detection
- expand/collapse
- Conversation
- Claims
- Evidence
- Sources
- Questions
- State of Understanding
- Saved page separation
- private alias only for saved rooms

---

# 12. Sources Lens

Both audits confirm:

- source data exists indirectly
- dedicated Sources lens is missing

## Reconciliation

The Sources lens itself is already approved by the Discussion Room specification.

Therefore:

**Do not treat existence of the lens as a new product decision.**

Engineering must determine:

- route
- navigation
- room scoping
- deduplication
- evidence relationships
- security

---

# 13. Reactions

Both audits confirm reactions infrastructure is absent.

The product direction already approves lightweight reactions.

Therefore:

**The existence of reactions is not a new product decision.**

Engineering needs to define:

- schema
- aggregation
- UI
- RLS
- relation to messages/evidence/arguments

while preserving:

> reactions ≠ epistemic authority.

---

# 14. Header / Visual Architecture

Both audits found oversized/dashboard-oriented room presentation.

## Reconciliation

Confirmed mismatch with the approved compact header direction.

This is primarily implementation/UX work.

No product decision required unless implementation uncovers a genuine conflict.

---

# 15. Legacy Architecture

Both audits identified legacy components such as:

- `DiscussionRoom`
- `DiscussionHeader`
- `SectionNav`
- Intelligence/Health/Graph/Map surfaces

Some appear dead or dangerously ambiguous.

## Reconciliation

Do not immediately delete them.

Before implementation:

1. determine live imports
2. determine whether any unique behavior is still needed
3. determine whether the components contain reusable logic
4. classify as:
   - live
   - dead
   - historical
   - dangerous ambiguity

Then retire deliberately.

---

# 16. Winner / Loser System

Both audits observed that Winner/Loser code appears deleted in the working tree and that a removal migration exists.

However:

> Production application of the migration is NOT VERIFIED.

## Reconciliation

Do not restore any Winner/Loser system.

Before final production sign-off, verify the actual database state.

The uncommitted deletion state is also a repository hygiene issue and should be handled deliberately outside the audit.

---

# 17. Runtime QA

Both audits did not perform browser QA.

Therefore:

- responsive behavior = NOT VERIFIED
- accessibility behavior = NOT VERIFIED
- runtime build behavior = NOT VERIFIED in the audits
- production migration application = NOT VERIFIED

Do not convert these into confirmed bugs.

They are validation requirements.

---

# 18. Product Decisions Actually Requiring Owner Attention

The two audits list more than ten "product decisions," but reconciliation shows that several are actually engineering choices under already-approved product behavior.

## Genuine / likely product-level decisions

### Decision 1 — Message → Claim semantics

**Recommendation: In-place conversion.**

Reason: newer approved Discussion Room specification explicitly establishes it and better preserves conversational continuity.

### Decision 2 — Evidence-vote semantics

**Recommendation: keep OPEN until authoritative meaning is confirmed; do not let evidence votes affect authority/reputation.**

### Decision 3 — Exact SoU maturity/unlocking algorithm

**Recommendation: remain OPEN.**

Do not implement invented thresholds.

### Decision 4 — Long-term role of Intelligence / Health / Graph / Map

The approved direction establishes Conversation-first UX but does not necessarily settle whether every intelligence surface should be:

- secondary
- optional
- retired

This can be decided during architecture planning.

### Decision 5 — Retraction semantics

The old penalty system conflicts with the current philosophy.

Recommendation:

> No punishment for changing one's mind.

The technical treatment of legacy retraction data should be planned, not improvised.

---

# 19. Things That Should NOT Be Mistaken for New Product Decisions

These are already sufficiently established by the approved direction:

- Conversation as default
- room-local navigation
- compact header
- unified Message/Claim/Question composer
- Claim Request behavior
- compact Claim cards
- Support/Challenge as stance
- Evidence Claim relationship
- Discussion Arguments
- Questions vs Targeted Inquiries
- Sources lens
- lightweight reactions
- 20-minute deletion lock
- no Winner/Loser
- no competitive scoring
- no vote-driven SoU

Their implementation details may require architecture work, but the basic product direction is already approved.

---

# 20. Recommended Next-Stage Architecture Planning

Do NOT jump directly into coding.

## Stage A — Product lock

Record explicit approvals for the few genuine unresolved matters:

1. Message → Claim = in-place conversion.
2. Evidence-vote meaning / retention.
3. Exact SoU maturity algorithm remains open.
4. Retraction semantic treatment.
5. Intelligence/Health/Graph/Map role.

## Stage B — Epistemic cleanup design

Before room rebuild:

- isolate Support/Challenge as stance
- remove vote→reputation authority path
- remove vote→credibility
- remove consensus bonus authority
- remove vote-derived SoU language
- remove retraction punishment
- remove misleading consensus truth bars
- remove author reputation from Claim credibility

Do not replace these with an invented scoring system.

## Stage C — Database architecture

Design prerequisites:

- Claim Requests
- Discussion Arguments
- Reactions
- deletion-lock lifecycle
- deleted-Claim relationship handling
- Sources lens support
- aliases if required
- any required shared room/lens data architecture

## Stage D — Room architecture

Then implement:

1. Conversation-first room
2. room-local navigation
3. compact header
4. shared room/lens architecture
5. conversational origin preservation

## Stage E — Interaction layer

Implement:

1. unified composer
2. Claims
3. Claim Requests
4. Evidence
5. Arguments
6. Questions
7. Targeted Inquiries
8. reactions
9. links

## Stage F — Understanding layer

Then:

1. SoU cleanup
2. structured lenses
3. intelligence surfaces in their approved role

## Stage G — Validation

Finally:

- tsc
- lint
- build
- tests
- browser QA
- responsive QA
- accessibility
- database/RLS verification
- epistemic regression audit

---

# 21. Implementation Readiness

## Current

**NOT READY**

Reason:

- critical epistemic cleanup remains
- one real documentation conflict exists
- several lifecycle/data capabilities are absent
- room architecture requires substantial restructuring
- production migration state is partly unverified
- runtime validation remains outstanding

## After product lock + architecture plan

Target:

**READY FOR CONTROLLED IMPLEMENTATION**

---

# 22. Final Reconciliation

The two independent audits are **substantially consistent**.

This is significant because the second audit was intentionally performed independently rather than being anchored to the first.

The strongest conclusion is not the exact P0 count.

It is this:

> **The current Discussion Room implementation is materially behind the approved V1 architecture, and the most serious problem is epistemic: community stance currently leaks into authority/credibility/reputation/SoU-related behavior.**

The correct response is not to let an agent immediately rebuild the room.

The correct response is:

> **Resolve the few genuine product questions → define architecture → perform epistemic cleanup → rebuild the room → validate adversarially.**

No original philosophy document should be changed merely to accommodate the current implementation.

No agent should invent missing product semantics.

No open SoU algorithm should be invented.

No vote-based authority mechanism should be reintroduced under a different name.

---

# 23. Decision Gate

Before implementation begins, the following must be true:

- [ ] Message → Claim semantics explicitly approved.
- [ ] Evidence-vote semantics resolved or intentionally left disabled/open.
- [ ] SoU maturity algorithm explicitly marked OPEN until separately approved.
- [ ] Retraction behavior clarified.
- [ ] Intelligence/Health/Graph/Map role clarified.
- [ ] Epistemic cleanup plan approved.
- [ ] Database architecture plan reviewed.
- [ ] Room architecture implementation plan reviewed.
- [ ] No unauthorized product behavior added.

**Until this gate is satisfied: NO IMPLEMENTATION.**
