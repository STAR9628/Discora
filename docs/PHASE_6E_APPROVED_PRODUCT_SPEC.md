# PHASE 6E-C — APPROVED PRODUCT SPECIFICATION

**Resolution & Conclusion — Final Product Decision Record**

**Status:** DESIGN / PRODUCT SPECIFICATION ONLY — NO IMPLEMENTATION
**Date:** 2026-09-07
**Scope:** Final product-model decision for Debate resolution/conclusion, State of Understanding eligibility, and Participant Interpretation
**Constraint:** This document specifies product decisions only. No code, database, migration, RPC, trigger, UI, or configuration changes have been made.

---

## 0. NO IMPLEMENTATION

This phase is PRODUCT REASONING AND SPECIFICATION ONLY.

**DO NOT modify:**
- application source code
- React components
- TypeScript
- database schema
- migrations
- RPCs
- triggers
- reputation logic
- UI
- routes
- package.json
- configuration
- original MDs
- existing audit documents

**No implementation occurred.** See §24.

---

## 1. FINAL QUESTIONS

This phase resolves two final questions before any implementation can begin:

**QUESTION A:** What exactly is allowed to influence Discora's State of Understanding?

**QUESTION B:** Does Discora actually need a formal Participant Interpretation / Conclusion feature?

---

## 2. FOUNDATION AUDIT SUMMARY

### 2.1 What the MDs establish (verified)

| Source | Established |
|---|---|
| `00_MASTER_CONTEXT.md:31` | "Discora is not intended to determine winners and losers." |
| `00_MASTER_CONTEXT.md:65` | "The goal of Discora is not to determine winners, enforce ideologies, declare absolute truths, or tell people what they should believe." |
| `00_MASTER_CONTEXT.md:165` | "A winner-takes-all debate website" is what Discora IS NOT. |
| `00_MASTER_CONTEXT.md:195` | "Debates in Discora are not designed to create winners and losers, but to improve understanding, clarify disagreements, identify areas of consensus, and encourage critical thinking." |
| `00_MASTER_CONTEXT.md:568` | "Decide debate winners" is explicitly listed under AI May Not. |
| `02_FEATURE_REGISTRY.md:51-70` | Consensus must NOT represent truth, majority vote, or forced agreement. |
| `04_DATABASE_DESIGN.md:28` | Claims, evidence, sources, questions, and future consensus points must exist as independent entities. |
| `05_SYSTEM_ARCHITECTURE.md` | Debate lifecycle: `Open → Inactive → Open Discussion → Archived`. No "Resolved" state. |
| `DISCORA_PRODUCT_PHILOSOPHY.md` | Reputation = track record of contributing to understanding, NOT correctness/popularity/power. |

### 2.2 What the MDs do NOT establish

| Item | Status |
|---|---|
| "Resolved" as a debate status | NOT ESTABLISHED — added by implementation |
| Winner selection as resolution | NOT ESTABLISHED — contradicts explicit MD statements |
| Participant Conclusion as a first-class object | NOT ESTABLISHED — only the behavioral goal ("arrive at a conclusion") is implied |
| "Concluded" as a persistent process state | NOT ESTABLISHED — no MD lifecycle state exists |
| Acknowledgment/contested standings on conclusions | NOT ESTABLISHED — no MD describes this |
| Reopen workflow | NOT ESTABLISHED — only relevant if a freeze exists |
| Debate-specific reputation events | NOT ESTABLISHED — winner-based events contradict philosophy |

---

## 3. CURRENT STATE OF UNDERSTANDING AUDIT

### 3.1 Exact current behavior (code-verified)

File: `src/features/discussions/components/understanding-utils.ts`

The `deriveStateOfUnderstanding` function classifies claims into three epistemic states:

**1. CONTESTED** — assigned when:
- `contradictingCount > 0` (regardless of supporting count), OR
- `totalVotes >= 5 AND agreementPercentage >= 35 AND agreementPercentage <= 65` (with zero directional evidence)

**2. SUPPORTED** — assigned when:
- `supportingCount > 0 AND contradictingCount === 0`

**3. UNRESOLVED** — assigned when:
- No directional evidence AND vote-based contested branch does not fire

### 3.2 What influences the taxonomy

| Input | Influences taxonomy? | How |
|---|---|---|
| Evidence direction (`support`/`contradict`/`context`) | YES | Primary driver of `supported`/`contested` |
| Evidence existence (citations present) | YES | Determines `unresolved` vs evidence-based states |
| **Vote counts + vote division (≥5 votes, 35–65% agreement)** | **YES** | **Moves claims from `unresolved` to `contested` at the zero-evidence edge** |
| Participant counts | NO | Display only |
| Engagement metrics | NO | Not used |
| Author reputation | NO | Not used |
| Creator inputs | NO | Not used |
| AI synthesis | NO | Not used |
| Claim relationships | NO | Not used in taxonomy (legacy flaw removed) |

### 3.3 The vote-influence conflict

**⚠️ PRODUCT/ARCHITECTURE CONFLICT — DOCUMENTED**

The current SoU algorithm contains one branch where social input (vote division) determines epistemic state:

> A claim with zero directional evidence and ≥5 votes with 35–65% agreement is classified as `contested`.

This means:
- A claim with 500 unanimous votes and zero evidence remains `unresolved` (correct)
- A claim with 5 votes split 3-2 and zero evidence becomes `contested` (social input drives taxonomy)
- A claim with 1 supporting citation and 500 opposing votes becomes `contested` (evidence-driven, correct)

**The conflict:** The product-owner requirement states "supporter count must never determine actual understanding." The current implementation respects this for the `supported` state (votes never create "supported") but violates it at the `contested` edge, where vote division alone can create a contested classification.

**This is NOT fixed in this phase.** It is documented as a separate product decision (Decision #4).

### 3.4 Future SoU semantics (proposed)

**EPISTEMIC INPUTS (may influence taxonomy):**
- Evidence direction per claim (`support`/`contradict`/`context`)
- Evidence existence (citations present/absent)
- Evidence retraction/moderation state
- Claims answering questions (question coverage)
- Open inquiries (display flag only)

**DESCRIPTIVE SOCIAL SIGNALS (display only, never taxonomy):**
- Vote counts and agreement percentages
- Participant counts
- Engagement metrics
- Author reputation
- Popularity indicators

**HARD RULE:** Community stance may be *shown* on the object it describes, explicitly qualified as "stance," visually separated from evidence labels, and excluded from taxonomy assignment.

---

## 4. FINAL ANSWER TO QUESTION A

**What exactly is allowed to influence Discora's State of Understanding?**

**EPISTEMIC ELIGIBILITY RULE:**

Only evidence-relationship information may influence the SoU taxonomy.

Specifically:
- Evidence direction (`support`/`contradict`/`context`) per claim
- Evidence existence (presence/absence of citations)
- Evidence integrity (retraction/moderation state)
- Question coverage (claims answering questions)
- Open inquiry count (display flag)

**EXPLICITLY EXCLUDED:**
- Vote counts
- Agreement ratios
- Participant counts
- Engagement metrics
- Author reputation
- Creator inputs
- AI synthesis
- Social acknowledgment

**Current exception requiring decision:** The vote-division branch (≥5 votes, 35–65% agreement → `contested`) is a standing partial violation of this rule. It must be either removed or explicitly approved as an exception.

---

## 5. FINAL ANSWER TO QUESTION B

**Does Discora actually need a formal Participant Interpretation / Conclusion feature?**

**CHALLENGE:**

The proposed Participant Interpretation feature solves a real but narrow problem: capturing human synthesis of an examination. However, it introduces a new first-class object with authority risk, truth-read risk, and lifecycle complexity.

**Analysis:**

| Mechanism | What it adds | What it risks | Can existing surfaces cover it? |
|---|---|---|---|
| Participant Interpretation | Human-authored synthesis; evidence anchors; version history | Authority/truth-read risk; "official takeaway" confusion; social pressure | Partially: claims + messages already capture interpretations, but they lack structured anchors and stable "current understanding" surface |
| No Participant Interpretation | Eliminates authority risk; simplifies model | Loses creator/participant synthesis; conclusions remain implicit in chat | SoU + conversation provide evidence posture but not human narrative of "what we take away" |
| Optional trimmed interpretation | Captures synthesis without privileging | Same risks as full interpretation, but mitigated by equal-weight display, no standings, no freeze | Best balance |

**CRITICAL SAFETY TEST:**

If a prominent, highly-reputed creator writes "Based on the evidence, I believe X," would ordinary users treat it as the room's official answer?

**YES.** This is a human cognition fact, not a UI problem. No label, disclaimer, or badge fully prevents prominence-as-authority conflation.

**However:** This risk is mitigated — not eliminated — by:
1. No "room conclusion" object exists (only per-participant cards)
2. Equal-weight, flat display (no pinning, no curation)
3. SoU always first and primary
4. Fixed microcopy: "A participant's interpretation of current evidence — not a statement of truth"
5. No room-owner privileges over conclusions

**VERDICT:**

**Participant Interpretation is recommended ONLY in the following trimmed form:**

- **Optional** — participants may choose to record one
- **Per-author** — each participant's interpretation is independent
- **Equal-weight** — no curation, no pinning, no "best conclusion"
- **Evidence-anchored** — must cite at least one claim/evidence/source/inquiry
- **Versioned** — append-only history, previous versions remain visible
- **No standings** — no "acknowledged," "contested," "approved," "single-participant"
- **No freeze** — room continues accepting contributions
- **Debate-only** — does not extend to Discussions in MVP
- **SoU-first hierarchy** — State of Understanding is always displayed above interpretations

If the product owner judges that ANY formal interpretation mechanism is too risky, the alternative is **Model E: No Formal Resolution** — SoU only, no participant conclusions. This is philosophically safer but loses the creator's intentional synthesis.

---

## 6. MODEL G CHALLENGE

### 6.1 What Model G gets right

1. Removes winner/loser framing completely
2. Preserves evidence-led synthesis (SoU) as primary surface
3. Allows human interpretation without privileging it
4. No freeze, no reopen, no status gating
5. Removes winner-based reputation
6. Aligns with all explicit MD principles
7. Simplest model that achieves Discora's purpose

### 6.2 What Model G gets wrong or risks

| Risk | Severity | Mitigation |
|---|---|---|
| Users interpret conclusions as "the answer" | Medium | Labels + SoU-first hierarchy + equal-weight display |
| Creator authority over conclusion | Medium | No room-owner privileges; equal-weight display |
| Evidence-state truth-read risk | Medium | "Supported by current evidence" ≠ proven; persistent disclaimers |
| Adds new entity (conclusion object) | Low | Medium implementation complexity; justified by mission |
| Discussion may demand similar machinery | Low | Philosophy boundary; future Consensus System is sanctioned path |

### 6.3 Model G vs Model E (critical comparison)

| Dimension | Model G | Model E |
|---|---|---|
| Human synthesis | Preserved | Lost |
| Competitive framing | Removed | Removed |
| Truth authority risk | Medium | Very Low |
| Complexity | Medium | Low |
| Evidence connection | High | High |
| Creator authority | Medium (mitigated) | None |
| Revision needed | Medium | Low |
| Historical migration | High | Very High |
| User closure signal | Present | Weak |
| Philosophical purity | High | Very High |

**Verdict:** Model G is recommended as the default. Model E is the legitimate alternative if the product owner decides no human-authored conclusion is safe.

---

## 7. CONCLUDED / RESOLVED STATE

### 7.1 Final determination

**Discora does NOT need a persistent "Resolved" or "Concluded" process state.**

Reasons:
1. No MD lifecycle includes such a state (`05_SYSTEM_ARCHITECTURE`: `Open → Inactive → Open Discussion → Archived`)
2. A persistent state implies a freeze or gate, which contradicts the "Open Discussion" phase
3. Freezing contradicts fallibilist philosophy ("changing one's mind is a feature")
4. The user question "is this examination finished?" is answered by a **non-blocking marker**, not a state

### 7.2 What replaces "Resolved"

A **non-blocking concluded-phase marker**:
- Timestamped event recording that participants reached a stopping point
- Does NOT freeze the room
- Does NOT gate contributions
- Does NOT trigger reopen workflow
- Is descriptive, not prescriptive

---

## 8. REOPENING

### 8.1 Final determination

**Discora does NOT need a formal reopening workflow.**

Reasons:
1. No freeze exists → nothing to reopen
2. New evidence can always be added to an active room
3. The SoU re-derives automatically
4. Conclusions are append-only
5. "Reopen" implies the previous understanding was wrong — revision should be expected, not special

### 8.2 What happens when new evidence appears

- Evidence is added as normal claim/evidence
- SoU re-derives automatically
- Participants may write revised conclusions
- Previous conclusions remain visible (append-only)
- No status change, no workflow, no approval needed

---

## 9. REPUTATION

### 9.1 Final determination

**Debate-specific reputation must be descriptive only.**

| Component | Decision |
|---|---|
| `DEBATE_WON +25` | **Stop emitting.** Remove from trigger. |
| `DEBATE_LOST -5` | **Stop emitting.** Remove from trigger. |
| Historical `DEBATE_WON`/`DEBATE_LOST` events | **Preserve as legacy audit history.** Do not delete. Do not recalculate. |
| "Debates Won/Lost/Win Rate" profile stats | **Remove from UI.** Preserve underlying data in `getUserContributions()` for potential future use. |
| New debate reputation events | **DEFERRED.** No new events until a future reputation redesign is approved. |
| Descriptive debate participation | **Keep.** "Debates Created," "Debates Joined" counts remain. |

### 9.2 What reputation means in Discora

Reputation = track record of contributing to understanding.
- NOT a correctness score
- NOT a popularity score
- NOT a power level
- NOT a punishment tool

Future reputation design (if any) must be a separate product decision with explicit MD backing.

---

## 10. HISTORICAL WINNERS

### 10.1 Final determination

**Historical winner records must be preserved as legacy audit history.**

| Action | Decision |
|---|---|
| Keep `resolution.winner` in database | **YES** — preserve as historical record |
| Auto-migrate `proposition` → `supported` | **NO** — winner declaration is not evidence |
| Auto-migrate `opposition` → `contested` | **NO** — winner declaration is not evidence |
| Auto-migrate `draw` → `inconclusive` | **NO** — draw is not an evidence state |
| Display historical winners | **Neutral display only** — "Historical record — winner model retired" |
| Recalculate historical reputation | **NO** — preserve event ledger as-is |

### 10.2 Why migration is semantically invalid

A winner declaration is a contest verdict, not an evidence assessment. Converting it to an evidence state would fabricate an evidential posture that never existed. This violates the audit-trace discipline principle: never rewrite history on a knowledge boundary.

---

## 11. DISCUSSION VS DEBATE

### 11.1 Final boundary

| Feature | Discussion | Debate |
|---|---|---|
| Conversation-first | **YES** | NO (examination-first) |
| Sides required | NO | YES (Proposition/Opposition) |
| Claims/evidence/questions | YES | YES |
| Structured inquiries | NO | YES |
| State of Understanding | **YES** (already implemented) | **YES** (extend to debates) |
| Participant Conclusions | **NO** | **YES** (optional, trimmed) |
| Consensus System | Future Phase 2 | Future Phase 2 |
| Conclusion mechanism | **NO** | **YES** (optional, trimmed) |

### 11.2 Why Discussion does not get conclusions

The philosophy explicitly distinguishes:
- Discussion: "exploration of a topic without requiring resolution"
- Debate: "structured argument toward a conclusion"

Expanding conclusion mechanics into Discussion would blur this distinction and contradict the conversation-first design.

---

## 12. AI BOUNDARY

### 12.1 Final rule

AI may:
- Suggest evidence anchors for conclusions
- Highlight contradicting evidence
- Identify missing evidence categories
- Summarize evidence distribution
- Organize existing material

AI must NOT:
- Determine truth
- Determine winner
- Determine correctness
- Force consensus
- Become final authority
- Author or validate conclusions

AI-assisted conclusion features are a separate product decision requiring explicit approval.

---

## 13. FINAL PRODUCT MODEL

### 13.1 Recommended: Model G — "Current Understanding" (Trimmed)

This is the simplest model that achieves Discora's purpose without recreating winner/loser, truth scoring, majority rule, or authority.

### 13.2 Model G components

| Component | What it is | What it is NOT |
|---|---|---|
| **Evidence State (SoU)** | Deterministic, evidence-led synthesis | Not truth. Not popularity. Not conclusion. |
| **Optional Participant Conclusions** | Per-author, evidence-anchored, versioned interpretations | Not a room verdict. Not consensus. Not winner. |
| **Concluded Phase Marker** | Timestamped, non-blocking event | Not a persistent state. Not a freeze. Not a gate. |
| **Lifecycle** | `active → inactive → archived` per `05` | No new status enums. No "resolved." No "concluded." |
| **Reputation** | Descriptive participation counts only | Not correctness. Not power. Not gamification. |

### 13.3 What Model G removes

| Removed | Reason |
|---|---|
| Winner/loser resolution | Philosophically misaligned |
| Winner-based reputation (+25/-5) | Inverts "changing mind = progress" |
| Persistent "Resolved" state | Not in MD lifecycle; creates freeze |
| Reopen workflow | No freeze → nothing to reopen |
| Acknowledgment/contested standings | Social vote in disguise |
| Room-level conclusion | Creates "official answer" problem |
| Draw option | No longer needed (no verdicts) |

### 13.4 What Model G preserves

| Preserved | Reason |
|---|---|
| Proposition/Opposition structure | Legitimate debate structure |
| Activity thresholds | Prevents empty conclusions |
| Evidence-anchor requirement | Transparency principle |
| SoU as primary surface | Evidence-led understanding |
| Discussion/ Debate distinction | Philosophy boundary |
| Future Consensus System compatibility | Clean separation |

---

## 14. APPROVED VS FUTURE

| Capability | Foundation Status | Final Recommendation | Approval |
|---|---|---|---|
| Winner/Loser resolution | NOT ESTABLISHED — contradicts MDs | Eliminated | **NEW PRODUCT DECISION** |
| Evidence State (SoU) | ESTABLISHED | Extended to debates | **STRONGLY IMPLIED** |
| Optional Participant Conclusions | STRONGLY IMPLIED | Adopt in trimmed form | **NEW PRODUCT DECISION** |
| Concluded phase marker | NOT ESTABLISHED | Adopt as non-blocking event | **NEW PRODUCT DECISION** |
| Vote influence on SoU taxonomy | EXISTING — partial conflict | Remove vote-division branch | **NEW PRODUCT DECISION** |
| Winner-based reputation | EXISTING — misaligned | Stop emitting; preserve history | **NEW PRODUCT DECISION** |
| Historical winner preservation | NOT ESTABLISHED | Preserve as legacy audit | **NEW PRODUCT DECISION** |
| Discussion conclusions | NOT ESTABLISHED | Do not introduce | **ALREADY ESTABLISHED** (boundary) |
| AI conclusion assistance | NOT ESTABLISHED | Defer to future | **FUTURE** |
| Consensus System | Phase 2 (registry) | Future complement | **ALREADY ESTABLISHED** |

---

## 15. EXACT PRODUCT DECISIONS REQUIRED

The product owner must explicitly approve or reject each of the following:

### Decision 1: Eliminate winner/loser resolution
**Should Discora retire the winner/loser resolution model?**
- **Recommendation:** YES
- **Reason:** Directly contradicts explicit MD statements; creates competitive incentives; penalizes honest participation
- **Alternatives:** Eliminate / Keep with cosmetic changes / Keep as-is
- **Risk if approved:** Migration complexity; user expectations
- **Risk if rejected:** Continued philosophical misalignment

### Decision 2: Adopt Model G
**What replaces winner selection?**
- **Recommendation:** Model G — SoU + Optional Participant Conclusions + non-blocking concluded-phase marker
- **Reason:** Simplest model achieving Discora's purpose without recreating winner/loser dynamics
- **Alternatives:** Model G / Model E (no formal resolution) / Model C (evidence state only) / Keep winner
- **Risk if approved:** Medium implementation complexity; authority risk from conclusions
- **Risk if rejected:** Model E is philosophically safer but loses human synthesis

### Decision 3: Participant Conclusions
**Should debates support optional per-author conclusions?**
- **Recommendation:** YES — optional, per-author, equal-weight, evidence-anchored, versioned
- **Reason:** Philosophy promises "stronger conclusions"; conversation chains are not structured knowledge
- **Alternatives:** Yes (Model G) / No (Model E or C) / Creator only
- **Risk if approved:** Authority/truth-read risk; mitigated by design
- **Risk if rejected:** Conclusions remain implicit in chat; creator synthesis is lost

### Decision 4: Vote influence on SoU
**Should the vote-division branch (≥5 votes, 35–65% → contested) be removed?**
- **Recommendation:** YES — remove from taxonomy; keep as descriptive display only
- **Reason:** "Understanding comes from evidence, not popularity" — even one exception violates the invariant
- **Alternatives:** Remove / Keep / Relabel
- **Risk if approved:** Users may notice "contested" disappearing from vote-divided claims
- **Risk if rejected:** Standing partial violation of core principle

### Decision 5: Historical winner data
**How should existing `resolution.winner` records be handled?**
- **Recommendation:** Preserve as legacy audit history; do not auto-migrate; do not delete
- **Reason:** Winner declaration is not evidence; migration would fabricate evidential posture
- **Alternatives:** Preserve as legacy / Migrate to evidence states / Delete / Recalculate reputation
- **Risk if approved:** Historical data remains visible as winner records (neutralized in Phase 6C)
- **Risk if rejected:** Data integrity issues; forced semantic migration

### Decision 6: DEBATE_WON/DEBATE_LOST events
**What happens to existing and future reputation events?**
- **Recommendation:** Stop emitting new events; preserve existing events as historical records; do not recalculate
- **Reason:** Historical integrity; winner reputation is philosophically misaligned
- **Alternatives:** Stop emitting, preserve / Stop emitting, recalculate / Stop emitting, delete / Keep emitting
- **Risk if approved:** Existing users retain historical winner reputation points (unchanged)
- **Risk if rejected:** Continued philosophical misalignment; reputational harm to "losing" participants

### Decision 7: Debate reputation scope
**Should debate activity affect reputation beyond descriptive counts?**
- **Recommendation:** No new debate-specific reputation events until future redesign
- **Reason:** Current winner-based reputation is misaligned; replacement requires separate design
- **Alternatives:** Descriptive only / New debate reputation events / Remove all debate reputation
- **Risk if approved:** Debate reputation remains minimal
- **Risk if rejected:** Gamification risk; philosophical contradiction

### Decision 8: SoU extension to debates
**Should the evidence-led synthesis be computed for debates?**
- **Recommendation:** YES — same derivation logic, no per-side totals
- **Reason:** Evidence posture is independent of room type; debates benefit from same clarity
- **Alternatives:** Yes / No / Defer
- **Risk if approved:** Medium implementation; consistent with discussion surface
- **Risk if rejected:** Debates lack deterministic evidence summary

### Decision 9: Conclusion authority
**Who can author a conclusion?**
- **Recommendation:** Any participant (per-author, equal-weight)
- **Reason:** "Arriving at a conclusion" is a participant activity, not a creator privilege
- **Alternatives:** Any participant / Creator only / Creator + invited / Moderator
- **Risk if approved:** Multiple perspectives enrich understanding; equal-weight display prevents authority concentration
- **Risk if rejected:** Creator-only reinforces authority risk

### Decision 10: Conclusion revision
**Can conclusions be revised?**
- **Recommendation:** YES — append-only revision history
- **Reason:** Fallibilism; "changing one's mind based on evidence is a feature"
- **Alternatives:** Append-only / Edit-in-place / Immutable
- **Risk if approved:** History preserved; no rewrite
- **Risk if rejected:** Conclusions become fixed verdicts, contradicting knowledge evolution

### Decision 11: Discussion boundary
**Should Discussions support participant conclusions?**
- **Recommendation:** NO — Discussion remains conversation-first
- **Reason:** Philosophy distinction; future Consensus System is sanctioned path
- **Alternatives:** Debate-only / Both / Discussion-only / Defer
- **Risk if approved:** Discussion stays conversation-first; boundary preserved
- **Risk if rejected:** Blurs Discussion/Debate distinction; expands scope unnecessarily

---

## 16. IMPLEMENTATION BOUNDARY

If Model G is approved, implementation would require:

### Database
- Remove `winner` from `resolution` JSONB structure (or deprecate the field)
- Add `conclusions` table or extend `resolution` JSONB with conclusion structure
- Add evidence-anchor relationship table
- Remove `handle_debate_resolve` trigger
- Remove `trg_reputation_debate_resolve` trigger
- Update `discussion_debates` view

### RPC
- Redesign `resolve_debate` RPC or create new `record_conclusion` RPC
- Remove winner parameter
- Add conclusion narrative + evidence anchors
- Preserve activity thresholds (optional)

### Reputation
- Remove `DEBATE_WON` and `DEBATE_LOST` from trigger
- Remove `debateWonScore` and `debateLostPenalty` from `reputation-utils.ts`
- Remove "Debates Won/Lost/Win Rate" from profile UI
- Preserve historical events

### UI
- Replace `DebateResolution` component with conclusion-recording interface
- Remove "Select Winner" buttons
- Add per-participant conclusion display (equal-weight, below SoU)
- Extend SoU to debate rooms
- Add non-blocking concluded-phase marker

### Types
- Update `Debate` type to reflect new resolution structure
- Add `Conclusion` type
- Update `DebateStatus` if needed

### Profile
- Remove winner/loss stat cards
- Keep descriptive participation counts

### Historical data
- Preserve existing `resolution.winner` as legacy
- Display neutralized in existing surfaces

**THIS IS NOT AN IMPLEMENTATION PLAN.** It is a boundary description only. No implementation has occurred.

---

## 17. ORIGINAL MD IMPACT

The following MDs would require updates if Model G is approved:

| MD | Current Statement | Proposed Change | Impact |
|---|---|---|---|
| `00_MASTER_CONTEXT.md` | Lines 31, 65, 165, 195, 568 establish winner/loser rejection | Add resolution/conclusion model definition | **MAJOR** — new product-model section |
| `01_PRD.md` | No resolution flow defined | Add Debate resolution/conclusion flow | **MAJOR** — new user flow |
| `02_FEATURE_REGISTRY.md` | Consensus System (Phase 2) defined | Add Participant Conclusions as Debate-only MVP feature | **MEDIUM** — new feature entry |
| `04_DATABASE_DESIGN.md` | `debates` table has `status` and `resolution` columns | Document new conclusion storage structure | **MAJOR** — schema change |
| `05_SYSTEM_ARCHITECTURE.md` | Debate lifecycle: `Open → Inactive → Open Discussion → Archived` | Clarify that "Resolved" is not a lifecycle state; add concluded-phase marker semantics | **MEDIUM** — lifecycle clarification |
| `08_DEVELOPMENT_ROADMAP.md` | No resolution/conclusion item | Add Phase 6E/6F resolution redesign | **MEDIUM** — roadmap update |

⚠️ **MAJOR PRODUCT/MD CONCERN:** The current implementation contradicts `00_MASTER_CONTEXT.md` at multiple points. The MDs explicitly reject winner/loser mechanics; the implementation implements them. Approval of Model G requires acknowledging this conflict and authorizing the MD-aligned direction.

---

## 18. FINAL DECISION MATRIX

| Decision | Current System | Recommended Direction | Status |
|---|---|---|---|
| Winner/Loser | Winner selection + +25/-5 reputation | Eliminated | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution meaning | Declare winner | Record current understanding | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution states | `active/resolved/closed` + winner field | `active/inactive/archived` + non-blocking marker | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Conclusion | None (winner substitutes) | Optional per-author, evidence-anchored, equal-weight | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Evidence relationship | None (winner is declaration) | Conclusions cite evidence anchors; SoU is evidence backbone | PROPOSED — REQUIRES PRODUCT APPROVAL |
| State of Understanding | Discussion-only | Extended to debates (same derivation) | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Vote influence on SoU | Social division can assign "contested" | Remove from taxonomy; display-only | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution authority | Creator only (winner) | Any participant may author conclusions | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Revision/reopening | Irreversible freeze + reopen | Append-only conclusions; no freeze; no reopen | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Reputation | DEBATE_WON +25 / DEBATE_LOST -5 | Descriptive participation only; no winner events | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Historical data | Winner records stored as current | Preserve as legacy; do not migrate to evidence states | PROPOSED — REQUIRES PRODUCT APPROVAL |
| AI role | None in resolution | Assist with anchors/evidence; never author/validate | ALREADY ESTABLISHED (extend) |
| Discussion conclusion | None | None (conversation-first) | ALREADY ESTABLISHED |
| Debate conclusion | Winner declaration | Optional per-author conclusions | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Consensus System interaction | None | Future Phase 2; complements participant conclusions | ALREADY ESTABLISHED |

---

## 19. APPROVED PRODUCT DIRECTION — PENDING OWNER SIGN-OFF

### What we are retiring
- Winner/loser resolution model (`resolution.winner`, `status='resolved'`)
- `DEBATE_WON` (+25) and `DEBATE_LOST` (-5) reputation events
- "Select Winner" UI
- Winner-specific profile statistics
- Persistent "Resolved" / "Concluded" process states
- Reopen workflow
- Acknowledgment/contested standings

### What we are keeping
- Proposition/Opposition structure (legitimate debate positions)
- Activity thresholds (prevent empty conclusions)
- State of Understanding (evidence-led synthesis)
- Discussion/ Debate distinction
- Future Consensus System (Phase 2)
- Descriptive participation metrics

### What we are introducing
- Evidence State (SoU) extended to debates
- Optional per-author Participant Conclusions (evidence-anchored, equal-weight, versioned)
- Non-blocking concluded-phase marker
- Vote-free SoU taxonomy (social stance display only)

### What we are explicitly NOT introducing
- No winner/loser mechanics under new names
- No truth scores or confidence percentages
- No majority-rule consensus
- No AI adjudication
- No freeze/reopen workflow
- No new reputation points or gamification
- No Discussion conclusion machinery
- No acknowledgment/approval systems

### What still requires product-owner approval
1. Eliminate winner/loser resolution model
2. Adopt Model G (or alternative)
3. Optional Participant Conclusions
4. Remove vote influence from SoU taxonomy
5. Historical winner data strategy
6. DEBATE_WON/DEBATE_LOST retirement
7. Debate reputation scope
8. SoU extension to debates
9. Conclusion authority model
10. Discussion boundary confirmation
11. AI boundary confirmation

---

## 20. IMPLEMENTATION STATUS

**NO IMPLEMENTATION OCCURRED.**

Specifically:
- No source code was modified
- No database schema was changed
- No migrations were created
- No RPCs were modified
- No triggers were modified
- No reputation logic was changed
- No UI was changed
- No TypeScript types were changed
- No original MDs were modified
- No product decisions were silently finalized

This document is a product specification and decision record only. All proposed changes require explicit product-owner approval before implementation begins.

---

*End of Phase 6E-C Approved Product Specification*
