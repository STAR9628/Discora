# PHASE 6E-B — MODEL F PRODUCT CHALLENGE

## Resolution & Conclusion — Independent Product Decision Audit

**DESIGN / PRODUCT REASONING ONLY — ABSOLUTELY NO IMPLEMENTATION**

- **Date:** 2026-09-07
- **Repo:** `d:\Projects\Discora`
- **Branch:** `main`
- **Commit audited:** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd`
- **Prior audit challenged:** `docs/PHASE_6E_RESOLUTION_CONCLUSION_DESIGN.md` (the "Phase 6E audit" — a PROPOSAL/AUDIT, **not** product-owner approval)
- **Purpose:** Independently challenge the previous Phase 6E recommendation (Model F: *Evidence State + Optional Participant Conclusions + Concluded process state*), determine which parts are justified by the Discora product foundation and which are new or unnecessary inventions, and produce **one** recommended product model with every residual product decision explicitly surfaced.

> **Status of this document:** This is a *challenge and analysis* artifact. It contains recommendations. **None of its recommendations are approved product decisions.** Only the product owner can approve.

---

## 0. SCOPE / NO IMPLEMENTATION

This phase is **DESIGN / PRODUCT REASONING ONLY**.

**DO NOT modify:**
- application source code
- React components
- TypeScript
- database schema
- migrations
- RPCs
- triggers
- reputation logic
- Supabase functions
- UI
- routes
- package.json
- configuration
- existing MDs
- existing audit/design documents (including `PHASE_6E_RESOLUTION_CONCLUSION_DESIGN.md`)

**Do not create an ADR. Do not create implementation plans that imply approval.**

The ONLY artifact produced by this phase is:

```text
docs/PHASE_6E_MODEL_CHALLENGE.md
```

If any other file appears necessary, STOP and report it.

**No implementation occurred in this phase.** Verified sections: `#19 – Final Verdict` and the final self-audit.

---

## 1. SOURCES AUDITED

### 1.1 Foundational product documents (original MDs)

| Document | Path | Status |
|---|---|---|
| Master Context | `docs/00_MASTER_CONTEXT.md` | ✅ audited |
| PRD | `docs/01_PRD.md` | ✅ audited |
| Feature Registry | `docs/02_FEATURE_REGISTRY.md` | ✅ audited |
| User Flows | `docs/03_USER_FLOWS.md` | ✅ audited |
| Database Design | `docs/04_DATABASE_DESIGN.md` | ✅ audited |
| System Architecture | `docs/05_SYSTEM_ARCHITECTURE.md` | ✅ audited |
| Design System | `docs/06_DESIGN_SYSTEM.md` | ✅ audited |
| Development Roadmap | `docs/08_DEVELOPMENT_ROADMAP.md` | ✅ audited |
| Knowledge Model | `docs/23_KNOWLEDGE_MODEL.md` | ✅ audited |

### 1.2 Approved / high-value design & audit material (repository-level)

| Document | Status |
|---|---|
| `DISCORA_PRODUCT_PHILOSOPHY.md` | ✅ audited |
| `CONSENSUS_SYSTEM.md` | ✅ audited |
| `TRUTH_SEEKING_REPUTATION_REVIEW.md` | ✅ audited |
| `DEBATE_UX_AUDIT.md` | ✅ audited |
| `ROADMAP_RECOMMENDATION.md` | ✅ audited |
| `REPUTATION_AUDIT.md` / `REPUTATION_VALIDATION.md` | ✅ audited (relevant slices) |
| `docs/PHASE_4A_UNDERSTANDING_LAYER_AUDIT.md` + redesign/plan | ✅ audited |
| `docs/PHASE_4B_STATE_OF_UNDERSTANDING_BEHAVIORAL_AUDIT.md` + redesign/plan | ✅ audited |
| `docs/PHASE_6A_WHOLE_PRODUCT_AUDIT.md` | ✅ consulted (reputation-authority finding reference) |
| `docs/PHASE_6B_UX_VISUAL_AUDIT.md` | ✅ consulted (binary epistemic signaling finding) |
| Phase 6C work (winner presentation neutralization) | ✅ consulted via Phase 6E inventory |

### 1.3 Code / implementation surfaces inspected for this challenge (read-only)

| Surface | Path (verified) | Relevance |
|---|---|---|
| SoU derivation | `src/features/discussions/components/understanding-utils.ts` | Audited exactly which inputs influence SoU taxonomy |
| SoU presentation | `src/features/discussions/components/state-of-understanding.tsx` | Audited how stance/votes are displayed |
| Resolution service/RPC path | `src/features/debates/services/debate-service.ts`, `supabase/migrations/202606100003_*`, `202606100004_*` | Current winner model footprint |
| Debate types | `src/features/discussions/types.ts` | `status: 'active'\|'resolved'\|'closed'` |
| Homepage/discussion copy | `src/features/discussions/components/discussion-feed.tsx` | "…no winner" copy (discussion identity) |

**Note on the Phase 6E proposal itself:** I read the complete `PHASE_6E_RESOLUTION_CONCLUSION_DESIGN.md`. It is a **proposal/audit** and I treat every `RECOMMENDED / PROPOSED / REQUIRES PRODUCT APPROVAL` item in it as **not approved**. Its conclusions — including the Model F recommendation — are the subject of this challenge, not the verdict.

---
## 2. WHAT PHASE 6E ESTABLISHED WITH HIGH CONFIDENCE (vs. WHAT REMAINS UNCERTAIN)

The previous audit is a long, detailed document. Detail ≠ correctness. I re-derived each of its major conclusions directly from the foundation and the code. The results are below, separated rigorously into "high confidence," "strongly implied but not settled," and "not established."

### 2.1 High confidence — established against the foundation

| Conclusion | Why it is high-confidence |
|---|---|
| **Winner/loser model rejection.** The current resolution model (`debates.resolution.winner`, `status='resolved'`, `DEBATE_WON +25 / DEBATE_LOST −5`) is philosophically misaligned with Discora. `00_MASTER_CONTEXT:31` states "Discora is not intended to determine winners and losers"; `01_PRD` defines debate as "structured examination of topics with disagreement," not a contest; `02` forbids "consensus = majority rule" and "artificial authority"; `DISCORA_PRODUCT_PHILOSOPHY` defines debate as "structured argument toward a conclusion," not toward victory; win/loss reputation "incentivizes bad faith; penalizes side switching" (philosophy anti-pattern table). The winner model exists in **zero** foundation MDs. | Verified language in 5+ documents; zero MD backing for the mechanic. |
| **Process resolution ≠ proposition truth.** The phase brief's dual-axis requirement is consistent with the philosophy's persistent distinction between "what the evidence shows" and "what the platform declares." `00` repeatedly separates understanding from truth; `02` says Discora "does not assign truth." The winner model conflates the two under one label. This conflation is the root defect, and the rejection stands independently of any replacement. | Direct reading of philosophy + registry semantics. |
| **Win/loss reputation is misaligned.** `00`/`04` ("These statistics should not determine authority — descriptive metrics only"), `DISCORA_PRODUCT_PHILOSOPHY` ("Reputation is NOT a correctness score"), and `TRUTH_SEEKING_REPUTATION_REVIEW` (win/loss = BAD; loss penalty "actively harmful") converge. Stopping **new** `DEBATE_WON/DEBATE_LOST` emission is strongly implied. | Converging findings in 3+ documents. |
| **Historical winner data must be preserved as legacy, never auto-migrated into evidence.** "A winner declaration is not evidence." `CONSENSUS_SYSTEM.md §9` sketches an automatic `winner → sides_supporting` mapping; that mapping fabricates an evidential posture and is **rejected** by this challenge (same conclusion as Phase 6E, verified independently). | Logical necessity + audit-trace discipline (never rewrite history on a security boundary). |

### 2.2 Uncertain / NOT settled by the foundation (Phase 6E treated these as settled; they are not)

| Item | Why it is not settled |
|---|---|
| **Whether "Participant Conclusion" must be a separate first-class object.** The philosophy says debates "arrive at a conclusion" — but whether that conclusion is a persisted entity with anchors/versions, or is expressible via claims/messages + the SoU, is **not** specified anywhere in the foundation. | Existence of the *behavior* is implied; the *artifact* is not specified. Open question → §4. |
| **Whether an "acknowledged" / "contested" standing exists on conclusions.** `CONSENSUS_SYSTEM.md` (a design sketch) defines DRAFT→PROPOSED→ACCEPTED→SUPERSEDED, and `ROADMAP_RECOMMENDATION.md` lists "consensus system v1 (model + propose + accept)." Both are **future-phase design sketches**, not approved product decisions, and neither specifies the "parity acknowledgment" rule. | Sketch-level only. Open question → §5. |
| **Whether a "Concluded" persistent process state exists.** `05_SYSTEM_ARCHITECTURE` defines the debate lifecycle as `Open → Inactive → Open Discussion → Archived`. There is **no** "Resolved" and **no** "Concluded" state in any foundation document. `01_PRD` defines no resolution flow at all. | Implementation-added status, zero MD backbone. Open question → §6. |
| **Whether reopen workflows are needed.** Reopen only matters if a freeze exists. The MD lifecycle has no freeze; "Inactive" is a descriptive state, not a gate. | Open question → §11. |
| **Whether the SoU extends to debates.** SoU exists and is validated for discussions (`PHASE_4A/4B`). Extension is natural but is a **scope decision**, not an established fact. | Open question → §7/§13. |
| **Whether new reputation events ("truth-seeking" events) should be introduced.** `TRUTH_SEEKING_REPUTATION_REVIEW.md` is explicitly labeled "Do NOT implement yet. This is a design proposal." | Proposal only. Open question → §12. |

### 2.3 What this challenge adds versus Phase 6E

Phase 6E's *direction* (retire winner semantics) matches my independent reading of the foundation. But Phase 6E **did not adequately stress-test** four mechanics it proposed: (a) Participant Conclusion as a distinct object, (b) parity acknowledgment/standing chips, (c) the "Concluded" state and its reopen workflow, and (d) the role of votes inside the SoU taxonomy. Sections 4–7 of this document attack exactly those.

---

## 3. MODEL F ASSUMPTION AUDIT

The prior proposal describes:

> **MODEL F — Evidence State + Optional Participant Conclusions + Concluded process state**

For each major component I audit: user problem, benefit, risk, whether the foundation actually establishes it, and recommendation.

### 3.1 State of Understanding (SoU) as the evidence backbone

| Question | Answer |
|---|---|
| User problem solved | "What does the current evidence show?" — a deterministic, evidential status for each claim and for the room's open questions. |
| Explicitly supported by philosophy/MDs? | **ALREADY ESTABLISHED.** `00` (evidence over popularity; structured knowledge), `23` (claim/evidence/source pipeline; falsifiable claims), `02` (consensus ≠ truth/majority); `PHASE_4A/4B` validated the presentation. |
| Already represented elsewhere? | Yes — it is the implemented discussion surface. |
| Creates unnecessary complexity? | No — it already exists and is validated. |
| New authority mechanism? | No — deterministic computation; no human authority. |
| Disguised winner system? | No — per-claim posture, no per-side totals. |
| Truth system risk? | Only if labels harden into truth-likelihood — currently mitigated (`PHASE_4B`: users read "Supported" as *not proven*). |
| Popularity/consensus risk? | **One real tension: votes influence the taxonomy at exactly one edge (§7).** |
| Improves understanding enough? | Yes — this is Discora's core epistemic surface. |
| Simpler alternative? | No simpler alternative that is still grounded in the philosophy. |
| **Verdict** | **ADOPT as backbone — KEEP.** The only open item is the vote-edge (§7, Decision #4). |

### 3.2 Optional "Participant Conclusion" object

| Question | Answer |
|---|---|
| User problem solved | Gives a debate participant a located place to record "what I take away from this examination, anchored to the claims/evidence that led there." |
| Explicitly supported? | **STRONGLY IMPLIED.** `DISCORA_PRODUCT_PHILOSOPHY`: "Debate = structured argument toward a conclusion" and "Arriving at a conclusion that reflects the evidence"; mission = "help people reach stronger conclusions." **However, the persisted-object form is NOT established** — only the behavioral goal is. |
| Already represented elsewhere? | Partially: claims capture falsifiable statements; messages capture conversation. **No existing object captures a meta-level, evidence-anchored, authored interpretation of the room's examination.** |
| Unnecessary complexity? | Moderate — one entity + anchor references + display. Acceptable *if* the entity does real work: it gives debates the "current understanding" narrative the philosophy promises without burying understanding in chat. |
| Authority mechanism risk? | Yes, unless scoped (§9 addresses this). Inherent risk: reading as "the official takeaway." |
| Truth system risk? | Real if unlabeled or single-curated; mitigable via labeling + SoU-first hierarchy + per-author display. |
| Popularity risk? | **None intrinsic** — unless standing/acknowledgment chips are added (§5). |
| **Verdict** | **ADOPT — only in trimmed form: optional, per-author, evidence-anchored, explicitly labeled "interpretation," equal-weight display. No standing chips, no room-level "the conclusion."** |

### 3.3 Parity acknowledgment / standing chips ("acknowledged / contested / single-participant")

| Question | Answer |
|---|---|
| User problem | Cross-perspective validation; avoiding "a lone voice." |
| Explicitly in MDs? | **NOT ESTABLISHED.** The *goal* "shared understanding" is philosophy, but the *mechanism* (one opposing participant's acknowledgment → "acknowledged") is a Phase 6E invention. `CONSENSUS_SYSTEM.md`'s lifecycle sketch is a design draft, not a rule; `ROADMAP_RECOMMENDATION`'s "accept" refers to the future Consensus System. |
| Already represented elsewhere? | Partially and differently: `consensus_ratio` (votes on claims) and the future Consensus System (registry Phase 2). |
| Unnecessary complexity? | **Yes** — new status enum + write RPCs + display chips + journal. |
| New authority mechanism? | **Yes** — a status that *semantically elevates* one interpretation is authority by construction. |
| Disguised winner system? | **Yes, dangerously close.** "acknowledged" ≈ the winner/finalist label in new clothes; "single-participant" ≈ a public loser mode. |
| Disguised truth system? | Moderately — "acknowledged" reads as "validated." |
| Popularity/consensus system? | **Yes.** It is a vote with a quorum of one, dressed in parity language. |
| **Verdict** | **REMOVE.** Do not replace it with a new system. The separate "contested" flag is also unnecessary: if a conclusion disagrees with the SoU, the deterministic evidence posture already shows it (§5.3). Statuses duplicate the evidence surface and add social signal. |

### 3.4 "Concluded" persistent process state (+ reopen workflow)

| Question | Answer |
|---|---|
| User problem solved | "Is the examination finished?" — a process fact. |
| Explicitly in MDs? | **NOT ESTABLISHED as a state.** `05_SYSTEM_ARCHITECTURE` lifecycle: `Open → Inactive → Open Discussion → Archived`. `01_PRD`: no resolution flow. |
| Freezes conversation? | Only if designed to. Phase 6E proposed freezing by default — but a freeze contradicts `05`'s "Open Discussion" phase and the fallible philosophy. |
| Does a debate stop being useful when the examination phase ends? | The value is in **recording** the phase, not in **blocking** renewed work. New evidence re-derives the SoU; that is the philosophy's intended evolution path. |
| Simpler alternative? | **Yes** — record the moment as a timestamped, non-blocking marker/event instead of a status that gates participation. |
| **Verdict** | **REPLACE the persistent state with a descriptive, non-blocking "concluded phase" marker.** Keep the existing MD lifecycle untouched. Removing the persistent state also deletes the entire reopening workflow (§11). |

### 3.5 Remaining Model F sub-assumptions (brief audit)

| Sub-assumption | Verdict |
|---|---|
| SoU extended to debates | **PROPOSED** — recommend adopt (same derivation, no per-side totals), but it is a scope decision, not an established fact. |
| Versioning/history on conclusions | **STRONGLY IMPLIED** by fallibilism ("Can evolve when new evidence arrives" — philosophy) and `00`'s "preserve how understanding changes over time" future feature. Keep it minimal (an append-only history); no "supersede" status object is needed. |
| AI boundary (assist-only; never truth/consensus authority) | **ALREADY ESTABLISHED** (`00`, `10_CODEX_CONTEXT`, `05` architecture). No change recommended. |
| Moderation of conclusions | **PROPOSED** — moderator conduct/anchor-integrity powers only; never truth-enforcement. Aligns with existing moderation semantics. |
| Auto thresholds (quorum, timers, cooldowns) | **NOT RECOMMENDED** — zero MD justification. |
| Notifications for conclusion events | **NOT RECOMMENDED now** — the notification registry (`03`) is MVP-scoped; additions are product-approved. |

---
## 4. QUESTION #1 — DO WE NEED PARTICIPANT CONCLUSIONS?

### 4.1 The challenge

The proposed model introduces a persisted "Participant Conclusion." The aggressive questions:

1. **Why can't participants express understanding through normal discussion/messages/claims?**
   - A *message* is conversational, time-ordered, buried in a thread — the wrong carrier for a durable synthesis, and the philosophy explicitly says critical knowledge must not live only in comment chains (`00` Data Principles: "Discora should avoid storing critical knowledge solely within comment chains"). 
   - A *claim* is a single falsifiable statement inside the room's claim structure. A conclusion is a *meta-level interpretation of the examination* ("given the evidence for claims X and Y and the open question Z, my current understanding is…"). Modeling that as a claim forces it to compete with ordinary claims and inherit claim-tooling (voting, side badges) that a synthesis should not have.
   - Conclusion a *message/claim* carrier means no structured anchors, no revision history, no stable "current interpretation" surface — Discora's "structured knowledge" principle is violated.
   - **Conclusion: there is a real, philosophy-backed gap** — provided the object is (a) optional, (b) per-author, (c) clearly a *human interpretation*, not a room verdict.

2. **Does it formalize something users already do?** Partly — users already say "I think the evidence supports X" in chat. But chat buries it. The philosophy's mission ("stronger conclusions") implies conclusions should be a *visible, reusable artifact*, not threads.

3. **Does it make the room bureaucratic?** Not if it's one opt-in action ("Add Conclusion") parallel to "Add Claim". It becomes bureaucratic only when it gains statuses, approvals, and reopen workflows — which this document removes (§5, §6).

4. **Does it create "the official takeaway"?** It creates the *risk*, not the necessity. The failure mode is a single curated conclusion presented above the evidence (§9). The trimmed design shows all participant conclusions with equal weight, below the SoU.

5. **Does it create pressure to produce a conclusion?** Only if the UI encourages/requires it. It is optional; the SoU remains whole without it.

6. **Does it conflict with conversation-first philosophy?** For *discussions*, yes — hence Debate-only (§13). For *debates*, the philosophy explicitly promises a conclusion ("structured argument toward a conclusion"), so the conflict is with the *discussion* posture, not with debate.

7. **Is "stronger conclusions" a requirement for a formal entity?** "Stronger conclusions" is the mission. A conclusion *mechanism* is the entity; a formal *entity* is the standard way to make conclusions durable, anchored and reviewable — and it aligns with "structured data over comment chains." It follows. But that only *bears* the entity; it does not require consensus statuses or room-level acceptance.

8. **Could SoU + conversation already accomplish this?** The SoU answers "what does the evidence show," not "what did a particular person take away and why." Both are real questions. Keeping only the SoU (conversation aside) gives Discora an evidence dashboard with no human narrative of "the conclusion of this examination."

### 4.2 Options comparison (from the phase brief)

| Option | Description | Assessment |
|---|---|---|
| A — SoU only | Only the deterministic evidence posture; no author-recorded interpretations | **Viable default for discussions.** For debates it weakens "arrive at a conclusion": the conclusion remains implicit and unrecorded. |
| B — SoU + participant conclusions | Evidence backbone + optional authored interpretations | **RECOMMENDED (trimmed):** serves both "what evidence shows" and "what participants took away," with the SoU as the control surface. |
| C — Participant conclusions without SoU | Human conclusions replace the evidence posture | **REJECT.** No deterministic counterweight; a lone conclusion freely contradicts evidence; authority/truth risk maximal. |
| D — Normal discussion + SoU, no conclusion entity | Conversation carries interpretations | **REJECT for debates:** buries "what we take away" in chat, violating structured-data principle; used marks the "what I conclude" surface. |
| E — Another simpler model | e.g., make "conclusion" a special *claim-like* object | **Effectively B with a lighter carrier.** Zero impeachment — if B is approved, carrier choice is an implementation detail (a dedicated conclusion cardinal is still a first-class object). |

### 4.3 Verdict on Question #1

**Option B — State of Understanding + Optional Participant Conclusions — survives the challenge, with two sharp qualifications:**

1. The conclusion is a **per-author interpretation record** (optional, anchored, versioned, labeled), **not** a room verdict and **not** a consensus artifact.
2. It must carry **no acknowledgment/acceptance standing (§5)** and **no associated process freeze (§6)**. Removing those is precisely what prevents the mechanism from becoming the "winner 2.0" or a bureaucratic layer.

If the product owner later decides the entity is too heavy, the fallback is Option D+ an evidence snapshot — but that fallback accepts the "conclusions are lost in chat" cost, which contradicts the mission goal of "stronger conclusions."

---
## 5. QUESTION #2 — CHALLENGE PARITY ACKNOWLEDGMENT

### 5.1 The proposed mechanic

> A participant conclusion becomes **"acknowledged"** when at least one participant from another stance (opposition, or neutral/inquiry) acknowledges it; otherwise it is "single-participant"; any participant may mark it "contested".

### 5.2 The challenge — question by question

**Where in the existing MDs is this mechanic authorized?**

Nowhere explicitly. The nearest support is:
- `DISCORA_PRODUCT_PHILOSOPHY`: "Consensus = shared understanding of what the evidence supports"; "a conclusion that both sides can support." This describes the *goal of consensus*, not a per-conclusion status gate.
- `CONSENSUS_SYSTEM.md`: DRAFT→PROPOSED→ACCEPTED→SUPERSEDED — a *future-phase design sketch*, explicitly not implemented, belonging to the future Consensus System (registry Phase 2).
- `ROADMAP_RECOMMENDATION.md`: "consensus system v1 (model + propose + accept)" — same future-phase status.

**Classification: `NOT ESTABLISHED BY CURRENT PRODUCT FOUNDATION`** as a rule for debate conclusions. It is a Phase 6E invention.

**Does "one opposing participant acknowledges" represent shared understanding?**

No. It is a **monotone counter** ("at least one") dressed as parity. One person's click proves only that one person clicked. It does not constrain the direction of what it acknowledges; therefore a weak, evidence-free conclusion can be "acknowledged" as easily as a strong one.

**Is this secretly a vote?**

Essentially yes — a **quorum-of-one vote with a side-color filter**. It "isn't majority voting" only because the quorum is 1. That is worse, not better: it creates a status that (a) requires lobbying, (b) can be gamed with a single alt/ally, and (c) is socially harder to contest than a simple count.

**Does it create social pressure?**

Yes — both directions:
- authors who want the "acknowledged" chip will solicit acknowledgment (pressure to *endorse*);
- participants who don't want to be the "opposing participant who legitimized the winner's side" may feel pressure *not* to acknowledge (chilling an honest signal).

**What happens if the strongest evidence is accepted by nobody?**

Nothing at all should happen — but under this mechanic, it would be *reduced* to "single-participant conclusion," a visibly diminished chip. That is exactly backwards: epistemic merit is in the evidence state, not in whether someone clicked. The SoU already shows the evidence quality independently.

**What happens if many people acknowledge a weak conclusion?**

The chip says "acknowledged," implying standing, no matter how weak the evidence is. The mechanic transfers meaning from evidence to participant action — the precise inversion Discora exists to prevent.

**Does participant identity matter more than evidence?**

In this mechanism, yes: the status encodes *who* acknowledged (identity/parity), never *what* the evidence shows. The evidence surface (SoU) is the only place identity-independent assessment lives.

**Why should another person's acknowledgment change the semantic standing of a conclusion?**

It should not. A conclusion's value is its reasoning + its evidence anchors + the reader's own assessment. Adding a "changed standing" chip is a *derived fact about people*, presented as if it were an epistemic fact. That is authority by social count.

**Is this mechanism necessary at all?**

**No.** Testing the alternatives:

| Alternative | Assessment |
|---|---|
| No acknowledgment at all | **RECOMMENDED.** Conclusions are interpretations; the SoU is the truth-control surface; readers assess. |
| Simple "I agree/disagree" descriptive stance (existing votes on claims) | Already exists for claims/evidence; reusing it for conclusions drags conclusions into popularity territory — **reject.** |
| Explicit "contest" | Redundant: a disagreeing participant can say so in a message/claim (contribution flow), and the SoU will display counter-evidence. A formal contest flag re-creates acceptance semantics from the wrong side. **Reject.** |
| Multiple independent interpretations | **Naturally supported by the trimmed model** — every conclusion is a separate equal card. This is the strongest defusing of the authority risk with zero mechanics. |
| Evidence-only validation | Provided by the SoU juxtaposed with each conclusion (via building both surfaces together). **This is the whole design.** |
| Future Consensus System | The *registry-approved* place for acceptance/coordination semantics (`02`: Consensus System, Phase 2). Debate-level standing chips should await — or never parallel — that system. |

### 5.3 The strongest evidence-challenge answers

- **"Strongest evidence accepted by nobody"?** Its SoU posture remains exactly as strong as the evidence dictates. No chip can hide it.
- **"Weak conclusion acknowledged by many"?** Many chips can't fake the evidence posture. The SoU juxtaposition exposes divergence (§9.4).

### 5.4 Verdict on Question #2

**The parity acknowledgment mechanic does not survive the challenge. Remove "acknowledged," "contested," and "single-participant" standings entirely.**

Do **not** replace them with a new mechanism (the phase brief explicitly warns against this). The "secondary layer" Discora needs — *showing the evidence next to each conclusion and letting each participant interpret* — is already covered by the SoU juxtaposition. Any future acceptance/consensus-of-conclusions semantics belongs inside the future Consensus System (registry Phase 2), where "consensus ≠ majority ≠ forced" can be designed per `02`'s rules.

---
## 6. QUESTION #3 — CHALLENGE "CONCLUDED"

### 6.1 The proposal under challenge

> Debates get a formal process state "Concluded — current understanding recorded," distinct from `active`/`closed`/`archived`, with `active ⇄ concluded` transitions, a reopen workflow, and (in Phase 6E's default) a contribution freeze at "concluded."

### 6.2 Question by question

**What user problem does "Concluded" solve?**
"Did this examination reach a stopping point?" — a process fact. It is real, but *narratively* answerable (a "phase concluded" note) and does not require a *gating* state machine.

**Is it merely a cosmetic label?**
As designed (Phase 6E) it is more than cosmetic — it blocks contributions and drives reopen workflows. That is where the harm is. A label without a gate is fine; a **gate** is the problem.

**Does it freeze conversation?**
In the proposal, yes. That freeze is the *source* of almost all downstream complexity (who can reopen, when, with which approval, cooldowns → all new product decisions).

**If it freezes conversation, why?**
The only honest rationale would be "to preserve the record." But Discora already preserves record immutably (`05` — claims/evidence revisions retained; messages are never deleted); freezing participation preserves nothing extra. The philosophy's deterrence is *recorded history*, not *locked rooms*. `05_SYSTEM_ARCHITECTURE` even has an "Open Discussion" phase *after* a debate goes inactive — the lifecycle explicitly allows continued conversation after a debate's active phase.

**Does a debate stop being useful when the examination phase ends?**
No. New evidence can legitimately change the SoU; reframing questions arise. `00`'s future "Knowledge Evolution" feature exists precisely to show understanding changing over time — *with* new contributions.

**Can new evidence be added?** With a freeze: no (unless reopened). Without a state gate: trivially yes, and the SoU re-derives. The second is the fallibilist answer.

**Can users continue discussing?** `05` says yes ("Open Discussion"); a frozen "Concluded" state contradicts the MD lifecycle. Reject the freeze.

**What exactly happens after conclusion?** Under the trimmed model: the marker is recorded; the SoU keeps re-deriving from live inputs; participants may write new conclusions; the room eventually becomes Inactive (lifecycle). Nothing else "happens" — and that is the point.

**Is "Concluded" different from "Inactive"?** "Inactive" is a descriptive *lifecycle* state (no recent activity). "Concluded" as proposed is a *deliberate process* status. The first is factual; the second is a verdict-ish declaration that re-imports "this debate is finished" semantics that the winner model used.

**Is it different from "Archived"?** Archived = preserved read-only by *lifecycle/admin* decision (`05`, `06` design system). Concluded ≠ Archived; but if "concluded" means "we recorded our understanding and stopped," it is primarily a *timeline event*, not a state class of its own.

**Could "Concluded" be a descriptive event rather than a persistent state?** **Yes — and this is the simplest correct answer.** A "Concluded" timestamp on a conclusion record or a room-level "examination phase concluded on <date>" note satisfies the user question without a gate.

**Could the room remain active while showing a "Current Understanding" snapshot?** Yes. This is the trimmed model. The window/room stays open; the SoU + conclusions compose the "Current Understanding" surface. Nothing blocks.

### 6.3 Simpler alternatives evaluated

| Alternative | Assessment |
|---|---|
| Persistent `concluded` state with freeze + reopen | **REJECT.** Creates reopen/quorum/approval/notification machinery; contradicts `05` lifecycle; "finishing a debate" is not a data-integrity need. |
| Persistent `concluded` state without freeze | Mildly better, but a state that gates nothing is an empty state — it is, functionally, the marker described below with extra schema. |
| **Non-blocking "concluded phase" marker/event** | **RECOMMENDED.** A timestamped marker (optionally tied to a conclusion record, or room-level "phase concluded," revisable) recorded by any engaged participant; no freeze; no reopen; no status axis; lifecycle stays `active/inactive/archived` per `05`. |

### 6.4 Verdict on Question #3

**The persistent "Concluded" process state does not survive the challenge — replace it with a non-blocking marker.** Discora does **not** need a formal Debate process state beyond the MD-established `Active / Inactive / Archived` (plus conduct `Closed`). The "meaningful stopping point" is a *recorded event on the understanding surface*, not a *participation gate*. This single decision eliminates the reopen workflow (§11) and most of Model F's machinery.

---
## 7. QUESTION #4 — STATE OF UNDERSTANDING INTEGRITY AUDIT

This section audits **exactly what currently influences the SoU**, against the invariant:

> Popularity, engagement, participant count, or majority support must **never silently become** evidence quality or truth. Understanding comes from evidence and how important/strong/relevant that evidence is.

### 7.1 What the SoU computation receives (code-verified)

`deriveStateOfUnderstanding` in `src/features/discussions/components/understanding-utils.ts` consumes: claims, evidence (per-claim), questions, claim relations (parameter present), and inquiry counts. For each claim it computes directional evidence counts (support / contradict / context), total votes, agreement percentage, source domains.

**Category assignment logic (verbatim behavior):**

1. **contradictingCount > 0** → `contested` (regardless of supporting count: "Mixed evidence (S supporting, C contradicting)").
2. **else supportingCount > 0** → `supported` ("Supported by N citations without active contradiction").
3. **else (zero directional evidence):**
   - **totalVotes ≥ 5 AND agreement 35–65%** → `contested` with reason "Divided community stance (X% agree, 0 directional citations)" — **the only branch where votes alone assign the taxonomy category.**
   - otherwise → `unresolved`.

**Other influences:**
- `unresolvedQuestions` = questions with zero answering claims.
- `totalInquiriesCount` = count of open inquiries (display surface only).
- `evidenceCoveragePercentage` = claims-with-any-evidence / total; described as coverage, not quality.
- Claim relations (`claimRelations`) — are **not used** in the taxonomy (the legacy `DiscussionSummary`/`DiscussionIntelligence` flaws that `PHASE_4A` flagged were removed; relations no longer act as pseudo-evidence).

**Where community stance is displayed:** as muted text on each claim card ("Current stance: X% agree across N votes" / "Preliminary stance (N votes)" for <5 votes) — a *descriptive* signal, not a taxonomy label (except the branch above).

### 7.2 Verdict — does the current SoU fully respect the principle?

**Substantially — but not strictly.**

What the implementation does **right** (verified):
- **Votes can never create "Supported."** "Supported" strictly requires ≥1 supporting citation and zero contradictions. A claim with 5,000 unanimous votes and zero citations is `unresolved`. `PHASE_4B` behavioral audit confirms: "Claims with votes but no evidence are NEVER moved to Supported."
- Evidence direction dominates votes in all cases where directional evidence exists.
- The vote-based "contested" classification (when it fires) is honestly labeled: "…0 directional citations," and the stance text distinguishes it.

What the implementation does **not** fully respect:
- **Votes *do* influence the taxonomy** at exactly one edge: a claim with **zero directional evidence** and ≥5 votes with 35–65% agreement is moved from `unresolved` into `contested`. Strictly, this means *participant stance distribution* changes Discora's stated "understanding" (the claim joins the "Contested" pillar). The product owner's principle — "supporter count must never determine actual understanding" — is **partially violated** here: the *support count* doesn't determine support, but the *division count* determines "contested."
- This influence is **never silent** (label says "0 directional citations"), so it is not the covert "majority→truth" failure mode; but it is still a social-input-driven category assignment.

**Documented conflict, stated precisely:**

> SoU taxonomy (the "understanding" surface) assigns the `contested` status from a *social* observation (≥5 votes, 35–65% agreement) with zero evidential basis. The principle "understanding comes from evidence" is breached at exactly one junction. The breach is small, explicit, and non-transferable to `supported` — but a principle that says "never" is still broken by one acknowledged exception.

### 7.3 Per the phase brief: DO NOT FIX IT — document instead

The correction (removing votes from taxonomy assignment and keeping community stance as a purely descriptive, separately-labeled metric, as `PHASE_4A`'s "Community Stance (Qualified by Sample Size)" conversation intended) is **not** performed here. It is a **separate product decision** (Decision #4, §17):

| Option | Description | Assessment |
|---|---|---|
| **A — Strict (recommended)** | Remove the vote-division branch (`≥5 votes, 35–65% → contested`). Vote distribution stops affecting the taxonomy; "community stance" remains a descriptive line at card level, visually separated from evidence labels. | **Recommended** — fully honors the invariant, and *simplifies* (deletes a branch). |
| B — Relabel | Keep the branch but rename away from "contested" (e.g., "Community divided — no citations"), so it no longer pretends to be an evidential posture. | Not recommended — pollutes the taxonomy with a social category. |
| C — Keep unchanged | Keep as today, arguing the label is honest. | Accepts a standing partial violation of the invariant. |

**Independent of the choice:** "Supported by current evidence" must remain strictly evidential (≥1 supporting citation, zero unrefuted contradictions); majority support must remain permanently excluded from `supported`.

### 7.4 What should be allowed to influence the SoU (feeds §8)

- **YES — may influence the taxonomy:** evidence record presence and direction (`support`/`contradict`/`context`) per claim; claims answering a question (question coverage); open inquiries as a display flag; retraction/moderation-hide state of evidence.
- **NO — taxonomy influence:** vote counts, agreement ratios, supporter counts, side-membership counts, participant counts, engagement metrics, author reputation, creator/verdict inputs, AI synthesis.
- **DISPLAY-ONLY (beside, never inside the taxonomy):** community stance (votes) with sample-size framing ("preliminary"), as today.

---
## 8. EVIDENCE / UNDERSTANDING SEMANTICS

### 8.1 The hard invariant (unchallengeable)

Never design UI, data semantics or algorithm behavior equivalent to:

- `supported = true`
- `contested = partly true`
- `unresolved = probably false`
- `many supporters = stronger evidence`
- `majority = truth`
- `creator conclusion = truth`
- `participant reputation = truth`
- `AI synthesis = truth`

These map to explicit foundation positions: `00` ("not designed to determine what people should believe"; "evidence over popularity"), `23` ("claim = falsifiable statement"), `02` ("does not assign truth"; "consensus ≠ majority ≠ forced"), `10_CODEX_CONTEXT` ("AI must never declare truth"), `06` design system (stats ≠ authority). Display strings must always position taxonomy values as statements **about the current evidence**, never about the world (PHASE_4A: "Supported by current evidence" ≠ proven).

### 8.2 What MAY influence "understanding" (taxonomy)

| Input | Role in understanding | Constraint |
|---|---|---|
| Evidence direction per claim (support/contradict/context) | Primary driver of `supported`/`contested` | Only `support or `contradict` can move a claim toward `supported`/`contested`; `context` is never "support". |
| Evidence existence (citations present) | Coverage and `unresolved` classification | "Awaiting citations" is factual. |
| Questions answered/unanswered | Open-question surface | Never moves a claim's posture. |
| Moderation/retraction of anchors | Evidence integrity | Hidden/retracted evidence must remove influence (no orphan posture). |
| Inquiries (open) | Display flag for epistemic debt | Never taxonomy. |

### 8.3 What MAY NOT influence "understanding" (categorical)

Votes, agreement ratios, supporter counts, participant counts, side-membership, engagement metrics, reputation of authors, creator inputs, room-role inputs, AI outputs, "acknowledgments" — none of these are evidence. They are people-behavior signals and are display-only at most (§7.4).

### 8.4 Community stance — its legitimate home

Community stance ("X% agree across N votes", "preliminary (N votes)") may be *shown* on the object it describes, explicitly qualified as **stance**, visually separated from the evidence labels, and excluded from taxonomy assignment (pending Decision #4, §17). It may **never** be aggregated into "per-side win totals" and never drive any recommendation.

---

## 9. QUESTION #6/#7 — HUMAN INTERPRETATION vs EVIDENCE STATE (+ AUTHORITY & FALLIBILISM TESTS)

### 9.1 Two orthogonal axes (kept from Phase 6E — confirms the dual-axis framing)

| Axis | What it records | Who owns it |
|---|---|---|
| **Evidence state (SoU)** | What the current evidence supports/contests/leaves open | Deterministic system; no human |
| **Human interpretation (conclusion)** | What a specific participant takes away | Author; each independently |

The proposal's "divergence surfacing" principle is correct and cheap: if a conclusion's content contradicts the SoU posture, render a neutral notice ("This interpretation diverges from the current evidence posture") next to the conclusion card. The system never *adjudicates*; it only juxtaposes. **Recommended.**

### 9.2 QUESTION #6 — conclusion-as-authority test

**Scenario:** a prominent, highly-reputed, room-creator user authors a conclusion that reads "Based on the evidence, I believe X."

**Would ordinary users treat it as the room's official answer?** Yes — humans conflate prominence with authority. If the product wants to be safe, it cannot rely on labels alone.

**The simplest safe design (no badges, no scores, no voting):**

1. **No "room conclusion" object exists.** There is no concept of "the conclusion of this debate" in the data model or UI. Only per-participant conclusion cards.
2. **Equal-weight, flat list.** Every conclusion renders at the same level, with the author always visible; none is pinned by anyone; the system never curates "the best."
3. **SoU is always first and primary.** The discussion/overview surfaces the SoU; conclusions live **below** it, under a fixed header "Participant interpretations (not statements of truth)".
4. **Fixed persistent microcopy** on every conclusion: "A participant's interpretation of current evidence — not a statement of truth. New evidence can change the evidence state."
5. **No room-owner privileges over conclusions.** The creator can record a conclusion *only as an ordinary participant*.

These five rules need zero new mechanics and reduce the authority risk to an acceptable level. If any future surface needs a *shared* conclusion (a curated "the room thinks…"), that is explicitly the future Consensus System's job (`02` Phase 2) and must not be previewed now.

### 9.3 QUESTION-#7 — fallibilism test ("new evidence six months later")

Protocol: substantial new contradicting evidence arrives later.

| Required expression | Trimmed-model capability |
|---|---|
| Previous understanding | Preserved: old evidence records, prior conclusion cards and their anchors remain immutable; version history shows prior statements. |
| New evidence | Added as a normal claim/evidence; SoU re-derives immediately (deterministic). |
| Changed evidence state | Yes — automatic; the "supported" claim becomes "contested" the moment contradicting evidence exists. |
| Changed participant interpretations | Any participant (incl. the original author) writes a revised conclusion card; the old one remains visible (append-only). |
| Uncertainty / disagreement | The SoU "contested" + "unresolved questions" surfaces carry it; divergence notices stay neutral. |
| Revision without rewriting history | Yes — nothing is ever rewritten; new records append. This is exactly `00`'s "knowledge evolution" requirement. |

**Fallibilism test: PASSES.** No persistent freeze and no status standings mean revision is frictionless and history-preserving — the pattern the proposal's "Concluded + reopen" flow would have complicated.

---
## 10. QUESTION #5 — WHAT DOES "RESOLUTION" ACTUALLY NEED TO DO? (SEMANTIC MATRIX)

The core design discipline is: **one status/field must not do multiple jobs.** The matrix below separates the eight concepts the "resolution" language routinely merges. All "recommended" columns assume the trimmed model.

| Concept | Meaning | Who controls it | Can it change? | Affects SoU? | Affects truth? | Affects reputation? | Required for MVP? |
|---|---|---|---|---|---|---|---|
| **1. Debate process ending** | The current examination phase reached a deliberate stopping point | Participants (any engaged, via a recorded marker) | Yes — a new marker can record a new phase | No | No | No | **Optional** (marker/event; not a state) |
| **2. Current evidence state (SoU)** | Deterministic statement of what current evidence supports/contests/leaves open | System (deterministic, from evidence) | Yes — re-derives as evidence changes | — (this IS the understanding) | No — posture only | No | **Yes** (backbone; already discussion, extend to debates) |
| **3. Human interpretation (conclusion)** | A participant's explanation of what they take away | The author (+ future consensus system for shared) | Yes — append-only revision | No (displayed beside, never computed in) | No | No | **Yes for debates (optional per-room)** — implied by philosophy |
| **4. Truth of proposition** | Whether the motion is true of the world | No one; outside the model | N/A | Never | — | Never | **No (forever excluded by `00/02`)** |
| **5. Consensus** | Shared understanding of what the evidence supports (a converged conclusion) | Future Consensus System (`02` Phase 2) | Yes | No | No | Neutral until designed | **No (future)** |
| **6. Popularity (votes/stance)** | Distribution of participant agreement | Voter's community | Yes | **MUST NOT** (§7) | No | Descriptive only | Display-only |
| **7. Reputation** | Track record of contributing to understanding | System (descriptive until redesigned) | Yes | No | No | — | **Yes — but winner-defined** |
| **8. Moderation/admin closure** | Conduct/lifecycle closure (`closed`, `archived`) | Moderators/admin via existing rules | Yes (appeal/archive rules) | No (removes hidden content) | No | Moderation penalties only | **Yes (existing)** |

**Design consequence:** the only new epistemic record needed is #3 (optional per-participant conclusions); the only existing surfaces to keep and extend are #2 (SoU) and #8 (closure). Everything else must stay out of the "resolution" namespace. In particular **#1 must not be given a persistent field** that also absorbs #2 (the Phase 6E "Concluded" state would have done exactly this).

---

## 11. QUESTION #8 — REVISION / REOPENING CHALLENGE

### 11.1 Is reopening actually necessary?

**No — reopening is only necessary if a freeze exists (§6).** The trimmed model has no freeze, therefore:

- **Why can't the debate simply accept new evidence?** It can — claims/evidence/contributions remain open per the `05` lifecycle ("Open Discussion" after a debate's active phase). The SoU re-derives; conclusions remain append-only.
- **Does reopening create unnecessary workflow complexity?** Yes — the parity-acknowledgment reopen, the veto, moderator-initiated reopen, cooldowns, and notifications are all an invented subproduct with zero MD backing. Deleting the freeze deletes this entire branch.
- **Who decides that new evidence is meaningful?** Nobody needs to decide — **evidence is added; the deterministic posture updates; humans decide interpretation.** "Meaningfulness" is exactly the thing Discora must not certify.
- **Should new evidence automatically reopen?** There is nothing to reopen. This is the honest fallibilist answer: new evidence simply changes the understanding displayed.
- **Should humans reopen?** No workflow exists to run.
- **Should a concluded debate remain readable but continue accepting contributions?** Yes — this is equivalent to "no freeze," which is the recommended state.
- **Does "reopen" imply the previous understanding was wrong?** Yes, rhetorically — a "reopen" frame punishes revision. Revision should be the *expected* behavior ("changing one's mind based on evidence is a feature"), not a special workflow.

### 11.2 Revision model (kept minimal)

- Conclusions are appended as new cards; authors see their prior cards with version labels. History is the audit trail (`00` knowledge-evolution). "Supersede" is a *conversational* state (new card references old card), not a status machine.
- No thresholds, no cooldowns, no timers, no quorum — there is nothing to gate.

### 11.3 Verdict on Question #8

**Wheels collapse: no reopening mechanism exists in the recommended model. New evidence always has a home; old understanding is never erased. Discora's fallibilism answers "revision" directly, and "reopening" as a feature is unnecessary invention.**

---
## 12. QUESTION #9 — REPUTATION CHALLENGE

### 12.1 What should reputation actually mean in Discora?

The foundation is explicit:
- `DISCORA_PRODUCT_PHILOSOPHY`: **"Reputation = track record of contributing to understanding."** It is NOT a popularity score, NOT a correctness score, NOT a power level, NOT a punishment tool. Its goal: "incentivize behaviors that lead to stronger conclusions."
- `04_DATABASE_DESIGN`: profile stats "should not determine authority … descriptive metrics only."
- `TRUTH_SEEKING_REPUTATION_REVIEW`: reward evidence, questions, corrections, side-switches; never punish unpopular opinions or "losing."

**Separation of concepts:**

| Concept | Discora meaning | Current state |
|---|---|---|
| Descriptive profile information | Counts of contributions (claims/evidence/questions/debates) | Exists; aligned with `04` |
| Reputation | Track record of contributing to understanding (score) | Existing event ledger; winner-defined elements are misaligned |
| Authority | Power to decide epistemic outcomes (creator declares winner) | Must be absent by design; role ≠ epistemic power |
| Epistemic quality | Whether an argument is strong/challenged/evidenced | Lives in the SoU, NOT in user reputation |
| Popularity | Stance distribution | Not reputation (`00`: likes ≠ reputation) |

### 12.2 Verdict per component

| Component | Verdict |
|---|---|
| `DEBATE_WON +25` / `DEBATE_LOST −5` (new emission) | **REMOVE (strongly implied).** Winning ≠ correctness; losing ≠ error. Both invert the philosophy. |
| Existing `DEBATE_WON/LOST` ledger rows | **Preserve as audit history** (they document the old model). Do not count as "wins." |
| Whether past scores keep counting ("recalculation") | **Separate decision (#5, §17).** Recommendation: strip them from recalculated scores at this scale (winner-bonus pollution is philosophically inconsistent); affects existing users → product owner. |
| New "truth-seeking" events (SIDE_SWITCHED, SELF_CONTRADICTED, OPPOSING_ACKNOWLEDGED…) | **NOT RECOMMENDED for this phase.** `TRUTH_SEEKING_REPUTATION_REVIEW` is explicitly a "design proposal — do not implement yet." Do not slip new weights in beside the retirement. |
| Conclusion/acknowledgment-based reputation | **NOT RECOMMENDED.** Never award points for conclusions or "acknowledged" status. (The standing mechanism itself is removed — §5.) |
| Debate contribution/create events (DEBATE_CREATED, DEBATE_JOINED) | **Keep as descriptive** participation signals (already nominal; no authority linkage). |
| "Debates Won/Lost" factor rows on profiles | **REMOVE** ("Debates Participated/Created" descriptive rows replace them, or just leave the counts). |

**Bottom line:** The safest recommendable reputation posture is *descriptive-only for debates*: contributions listed, no winner/loss at all, no new points invented. The philosophy's "reputation incentivizes behaviors that lead to stronger conclusions" is what the future Consensus System and truth-seeking event work, together with product owner approval, can eventually shape — not something to preempt now.

---

## 13. QUESTION #10 — DISCUSSION VS DEBATE

### 13.1 Protect the distinction (foundation-sourced)

```
DISCUSSION  "Let's understand this together."  — exploration without resolution (`00`; philosophy)
DEBATE     "Let's examine competing positions rigorously." — structured argument toward a conclusion (philosophy)
```

The *reason* conclusions are Debate-only is not this document's preference; it is in the foundation:
- `DISCORA_PRODUCT_PHILOSOPHY`: Discussion = "exploration of a topic **without requiring resolution**"; debate = "structured argument **toward a conclusion**." "In a discussion, you can change your mind without consequence."
- `01_PRD`: Discussion purpose "open discussion and exploration, no sides required"; Debate purpose "structured examination with disagreement."
- Homepage copy (verified in `src/features/discussions/components/discussion-feed.tsx`): "Open-exploration conversations with many viewpoints **and no winner**."

**Classification: `ALREADY ESTABLISHED` that Discussion has no conclusion mechanism in MVP.**

### 13.2 The four sub-questions

| Question | Answer |
|---|---|
| Is SoU sufficient for Discussion? | **Yes** — SoU is Discussion's epistemic summary surface (already implemented and validated, PHASE_4A/4B). Discussions show evidence posture + open questions; no verdict object. |
| Are participant interpretations useful in Discussion? | Possibly someday, but **not established** for MVP; the foundation never assigns conclusions to discussions. If desired later, the future Consensus System (`02` Phase 2) is the sanctioned path — inheriting full safeguards, never a "lite" version. |
| Do conclusion mechanics belong only to Debate? | **Yes for MVP** (philosophy distinction above). **PROPOSED-as-future** for discussions. |
| Is the future Consensus System the correct home for broader conclusion/consensus semantics? | **Yes** — `02` registry defines Consensus System (Phase 2): shared understanding, agreements, evidence-supported conclusions, explicitly NOT truth/majority/forced. All room-level "accepted conclusions" must be designed there. |

### 13.3 Guardrail restated

Never let Discussion "conclusion" become "who's right"; never add sides/scoreboards to discussions; never reuse the (removed) winner mechanics under a new name (`PHASE_6B` P1-UX-001/003 warnings hold: no per-side win totals anywhere).

---
## 14. CANDIDATE MODEL COMPARISON A–G

### 14.1 Model definitions

| Model | Definition |
|---|---|
| **A — Winner / Loser** | Current: creator declares `winner` (`proposition`/`opposition`/`draw`); `status='resolved'`; +25/−5 reputation events; freeze. |
| **B — Draw / Neutral Outcome** | Same declaration mechanics as A, but adds/draw emphasis, "nobody wins" outcome vocabulary. Still a verdict axis + freeze. |
| **C — Evidence State only** | SoU (deterministic posture + open questions) is the only conclusion-like surface; no human conclusion records. |
| **D — Human Conclusion only** | A conclusion object (or consensus sketch) replaces/omits the SoU surface; human verdict carries the room outcome. |
| **E — No formal conclusion/resolution** | Nothing recorded as outcome; rooms just move through `active → inactive → archived`; multi-axes stay implicit. |
| **F — Phase 6E's Model F** | Evidence State + Optional Participant Conclusions + **Concluded persistent state + parity acknowledgment/contested standings + reopen workflow**. |
| **G — Trimmed F ("Current Under standing" model)** | Evidence State (SoU, extended to debates) + **optional per-participant conclusions (equal-weight, anchored, versioned, no standings) + non-blocking "concluded phase" marker + winner/loss reputation removed; no freeze, no reopen, no acknowledgment.** Lifecycle stays `active/inactive/archived` per `05`. |

### 14.2 Scoring

Legend: ★ strong / ◐ mixed / ✗ weak / ✖ absent or harmful. "Complexity" rows go high-on-the-left = *bad* (more complexity), and implementation/migration similarly.

| Criterion (brief §16 list) | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| Philosophy alignment | ✖ (00:31 violation) | ✖ (same structure) | ★ (evidence over popularity) | ◐ (interpretation-only, no counterweight) | ◐ (safe but loses "arrive at a conclusion") | ★ (but overbuilt) | ★ |
| Epistemic safety | ✖ | ✖ | ★ | ◐ (high authority/truth risk) | ★ | ◐ (acknowledgment = social risk) | ★ |
| User comprehension | ✖ (false frame) | ✖ | ◐ (dashboard-like) | ◐ ("official conclusion" confusion) | ◐ | ◐ (many chips) | ★ ("where we stand" + my takeaway) |
| Usefulness (understanding) | ✖ | ✖ | ◐ (strong evidence, weak narrative) | ◐ | ◐ | ★ | ★ |
| Simplicity (low = good) | ◐ (one-shot but small) | ◐ | ★ (exists) | ◐ | ★ | ✖ (many new mechanics) | ◐ (one new entity) |
| Complexity added (higher = worse) | ◐ (small but wrong) | same as A | ★ (zero new) | ◐ | ★ (zero new) | ✖ (statuses+acks+reopen+notif) | ◐ (conclusion entity only) |
| Authority risk (higher = worse) | ✖ (creator verdict) | ✖ (creator verdict) | ★ (none) | ✖ (conclusion = verdict) | ★ (none) | ◐ (ack/contest chips) | ★ (equal-weight authored cards) |
| Truth-read risk (higher = worse) | ✖ (resolved = true) | ✖ | ◐ (mitigated; posture labels) | ✖ (conclusion = true) | ★ (none) | ◐ | ◐ (label + SoU hierarchy) |
| Popularity risk (higher = worse) | ✖ | ✖ | ◐ (single vote edge §7) | ◐ | ★ (none) | ✖ (ack chips = quorum-1 vote) | ◐ (same vote edge only) |
| Fallibilism (higher = better) | ✖ (irreversible freeze) | ✖ (irreversible freeze) | ★ (auto re-derive) | ◐ (revision possible, no counterweight) | ★ | ◐ (freeze limits) | ★ (append-only, no freeze) |
| Revision (higher = better) | ✖ ("irreversible") | ✖ | — (SoU auto) | ◐ | — | ★ (versioned) | ★ (versioned, no gate) |
| Historical integrity (higher = better) | ◐ (winner rows frozen but wrong-labeled) | ◐ | ★ | ★ | ★ | ★ (winner→legacy) | ★ (winner→legacy) |
| Debate identity | ◐ (competition frame) | ◐ | ◐ (weak) | ◐ (high-risk) | ◐ | ★ (best) | ★ (SoU + conclusions + marker) |
| Implementation size (higher = worse) | ◐ (small) | ◐ (small) | ★ (smallest) | ◐ | ★ (small) | ✖ (large) | ◐ (medium) |
| Migration size (higher = worse) | — | — | — (existing SoU) | ◐ | ★ (small) | ✖ (statuses+conclusion+ack+reopen) | ◐ (conclusion + legacy freeze) |
| Reputation implications | ✖ (win/loss) | ✖ (win/loss) | ◐ (remove WON/LOST) | ◐ (remove + conclusion risk) | ◐ (remove WON/LOST) | ◐ (remove WON/LOST) | ★ (remove WON/LOST only) |
| Future Consensus compatibility | ✖ | ✖ | ★ (no overlap) | ◐ (overlap risk) | ★ | ◐ (ack chips) | ★ (clean) |
| **Overall** | **REJECT** | **REJECT** | **Viable base, lacks debate conclusion** | **REJECT alone** | **Viable default, loses debate conclusion** | **Partially adopt; overweight** | **RECOMMENDED** |

---

## 15. RECOMMENDED PRODUCT MODEL

### 15.1 Model G — "Current Understanding" (Trimmed Model F)

**Recommended.** This is the simplest model that achieves Discora's purpose without recreating winner/loser, truth scoring, majority rule, or authority.

### 15.2 What Model G actually is

| Component | What it is | What it is NOT |
|---|---|---|
| **Evidence State (SoU)** | Deterministic, evidence-led synthesis of what the current evidence supports, contests, or leaves unresolved | Not a truth claim. Not a popularity meter. Not a conclusion. |
| **Optional Participant Conclusions** | Per-author, evidence-anchored, versioned narrative interpretations of the examination | Not a room verdict. Not a consensus artifact. Not a winner declaration. |
| **Concluded Phase Marker** | A timestamped, non-blocking event recording that the examination reached a stopping point | Not a persistent process state. Not a freeze. Not a gate. |
| **Lifecycle** | `active → inactive → archived` per `05_SYSTEM_ARCHITECTURE` | No new status enums. No "resolved" state. No "concluded" state. |
| **Reputation** | Descriptive participation counts only. No winner/loss events. No new points. | Not a correctness score. Not a power level. |

### 15.3 What Model G explicitly removes from Model F

| Model F component | Status in Model G | Reason |
|---|---|---|
| Evidence State | **KEPT** | Backbone of the model |
| Optional Participant Conclusions | **KEPT (trimmed)** | Removed: standings, room-level conclusion, co-authorship workflow |
| Parity acknowledgment ("acknowledged"/"contested"/"single-participant") | **REMOVED** | Social vote in disguise; creates authority risk |
| Concluded persistent process state | **REPLACED** with non-blocking marker | Freeze contradicts `05` lifecycle; unnecessary complexity |
| Reopen workflow | **REMOVED** | No freeze → nothing to reopen |
| Winner/loss reputation | **REMOVED** | Philosophically misaligned |
| New truth-seeking reputation events | **DEFERRED** | Separate product decision; not part of this model |

### 15.4 What Model G preserves from the current system

| Current feature | Status | Reason |
|---|---|---|
| Proposition/Opposition structure | **PRESERVED** | Legitimate debate structure, not correctness indicator |
| Activity thresholds for resolution | **PRESERVED** | Prevents empty debates from recording conclusions |
| Summary/interpretation field | **PRESERVED** | Creator's synthesis is valuable |
| Draw option | **REMOVED** | No longer needed; conclusions are not verdicts |
| `resolve_debate` RPC | **TO BE REDESIGNED** | Interface changes; new parameter structure |
| `handle_debate_resolve` trigger | **TO BE REMOVED** | Winner-based reputation events retired |

### 15.5 Critical simplifications that make Model G work

1. **No persistent "concluded" state** — Eliminates the entire reopen workflow, quorum logic, and status-gating machinery.
2. **No acknowledgment standings** — Eliminates social voting, popularity risk, and authority chips.
3. **No room-level conclusion** — Eliminates "the official takeaway" problem; every conclusion is equally weighted and clearly labeled as individual interpretation.
4. **No freeze** — New evidence always has a home; the SoU re-derives automatically.
5. **No new reputation events** — Eliminates gamification risk; reputation remains descriptive.

### 15.6 What Model G does NOT solve

| Problem | Status | Note |
|---|---|---|
| Users interpreting conclusions as "the answer" | **PARTIAL MITIGATION** | Labels + SoU-first hierarchy reduce risk but cannot eliminate it |
| Creator authority over conclusion | **ACCEPTED RISK** | Creator's conclusion has no privileged status, but creator identity may influence perception |
| Evidence-state truth-read risk | **PARTIAL MITIGATION** | "Supported" is closer to "true" than it should be; mitigated by labeling |
| Discussion wanting similar machinery | **DEFERRED** | Discussion remains conversation-first; future Consensus System is the sanctioned path |

---

## 16. WHAT IS ACTUALLY APPROVED VS WHAT REQUIRES DECISION

### 16.1 Already established by foundation (does not require new approval)

| Item | Source |
|---|---|
| Winner/loser model is philosophically misaligned | `00_MASTER_CONTEXT.md` lines 31, 65, 165, 195, 568 |
| Debates are structured examinations, not contests | `00_MASTER_CONTEXT.md` line 191-195 |
| Evidence over popularity | `00_MASTER_CONTEXT.md` line 96-100 |
| Consensus ≠ majority vote ≠ forced agreement | `02_FEATURE_REGISTRY.md` lines 51-70 |
| AI may not decide winners | `00_MASTER_CONTEXT.md` line 568 |
| Discussion ≠ Debate | `00_MASTER_CONTEXT.md` lines 179-195 |
| State of Understanding is evidence-led | `PHASE_4A/4B` audits |
| Claims/evidence/sources must be first-class entities | `04_DATABASE_DESIGN.md` line 28 |

### 16.2 Strongly implied by foundation (requires product-owner confirmation)

| Item | Reason it is implied |
|---|---|
| Remove DEBATE_WON/DEBATE_LOST from new reputation calculations | Converging evidence in 3+ documents; no MD backs winner reputation |
| Preserve historical winner data as legacy | Audit-trace discipline; never rewrite history |
| SoU should extend to debates | Natural extension of validated discussion surface |
| Participant conclusions are Debate-only | Discussion/exploration distinction in philosophy |
| Conclusions must be evidence-anchored | Transparency principle; structured-knowledge principle |

### 16.3 Proposed — requires explicit product-owner approval

| Item | Why approval is required |
|---|---|
| Eliminate winner/loser resolution model | Current implementation exists; changing it is a product-model change |
| Replace winner with conclusion + evidence state | New concept not in current MDs |
| Remove "Select Winner" UI | Visible product change |
| Remove winner-specific profile statistics | Visible product change |
| Remove DEBATE_WON/DEBATE_LOST trigger logic | Database-level change |
| Add optional Participant Conclusion entity | New first-class object |
| Make conclusions per-author, equal-weight | New display paradigm |
| Remove acknowledgment/contested standings | Removes proposed social mechanics |
| Replace "Concluded" state with non-blocking marker | Changes process semantics |
| Remove reopen workflow | Eliminates proposed lifecycle branch |
| Extend SoU to debates | Scope decision |
| Remove vote-influence from SoU taxonomy | Changes existing behavior |
| Historical winner data strategy | Multiple options with tradeoffs |
| Future reputation model | Not designed yet |
| AI role in conclusion assistance | Not designed yet |

---

## 17. EXACT PRODUCT DECISIONS REQUIRED

The product owner must explicitly approve or reject each of the following:

### Decision 1: Resolution model
**Should Discora eliminate the winner/loser resolution model?**
- **Recommendation:** YES — it is structurally misaligned with the philosophy and MDs.
- **Reason:** Direct conflict with explicit MD statements; creates competitive incentives; penalizes honest participation.
- **Options:** Eliminate / Keep with cosmetic changes / Keep as-is
- **Approval required:** YES — this is the foundational product-model change.

### Decision 2: What replaces winner selection?
**What should the resolution/conclusion mechanism be?**
- **Recommendation:** Model G — Evidence State (SoU) + Optional Participant Conclusions + non-blocking concluded-phase marker.
- **Reason:** Simplest model that achieves Discora's purpose without recreating winner/loser dynamics.
- **Options:** Model G / Model E (no formal resolution) / Model C (evidence state only) / Keep winner / Other
- **Approval required:** YES — this defines the new product behavior.

### Decision 3: Should Debate have a human-authored conclusion?
**Should participants be able to record evidence-anchored interpretations?**
- **Recommendation:** YES — optional, per-author, equal-weight, clearly labeled as interpretation.
- **Reason:** Philosophy promises "stronger conclusions"; conversation chains are not structured knowledge; creator synthesis is valuable.
- **Options:** Yes (Model G) / No (Model E or C) / Only for creators / Community-authored
- **Approval required:** YES — introduces a new first-class object.

### Decision 4: Should votes influence the SoU taxonomy?
**Currently, ≥5 votes with 35-65% agreement moves a claim from "unresolved" to "contested." Should this continue?**
- **Recommendation:** NO — remove the vote-division branch. Vote distribution remains a descriptive display metric, never a taxonomy label.
- **Reason:** "Understanding comes from evidence, not popularity" — even one exception violates the invariant.
- **Options:** Remove / Keep / Relabel
- **Approval required:** YES — changes existing behavior.

### Decision 5: What happens to historical winner data?
**Existing debates have `resolution.winner` = proposition/opposition/draw. How should this be handled?**
- **Recommendation:** Preserve as legacy audit history. Do not auto-migrate into evidence states. Do not delete. Display as "Historical record — winner model retired."
- **Reason:** Winner declaration is not evidence; migration would fabricate evidential posture.
- **Options:** Preserve as legacy / Migrate to evidence states / Delete / Recalculate reputation
- **Approval required:** YES — affects data integrity and historical accuracy.

### Decision 6: What happens to DEBATE_WON/DEBATE_LOST reputation events?
**Existing events exist in the database. Future events should not be created. What about existing ones?**
- **Recommendation:** Stop emitting new events. Preserve existing events as historical records. Do not retroactively remove or recalculate.
- **Reason:** Historical integrity; winner reputation is philosophically misaligned.
- **Options:** Stop emitting, preserve history / Stop emitting, recalculate / Stop emitting, delete history / Keep emitting
- **Approval required:** YES — affects user reputation scores.

### Decision 7: Should Debate-specific reputation exist at all?
**Beyond descriptive participation counts, should debate activity affect reputation?**
- **Recommendation:** No new debate-specific reputation events until a future reputation redesign is approved.
- **Reason:** Current winner-based reputation is misaligned. Replacement reputation mechanics require separate design.
- **Options:** Descriptive only / New debate reputation events / Remove all debate reputation / Other
- **Approval required:** YES — defines future reputation scope.

### Decision 8: Should SoU extend to debates?
**Should the deterministic evidence-led synthesis be computed for debates as it is for discussions?**
- **Recommendation:** YES — same derivation logic, no per-side totals.
- **Reason:** Evidence posture is independent of room type; debates benefit from the same clarity.
- **Options:** Yes / No / Defer to later phase
- **Approval required:** YES — scope decision.

### Decision 9: Who can author a conclusion?
**Should any participant be able to record a conclusion, or only the creator?**
- **Recommendation:** Any participant may author a conclusion (per-author, equal-weight).
- **Reason:** "Arriving at a conclusion" is a participant activity, not a creator privilege. Multiple perspectives enrich understanding.
- **Options:** Any participant / Creator only / Creator + invited participants / Moderator
- **Approval required:** YES — defines authorship authority.

### Decision 10: Can conclusions be revised?
**Should authors be able to update their conclusions?**
- **Recommendation:** YES — append-only revision history. Previous versions remain visible.
- **Reason:** Fallibilism; "changing one's mind based on evidence is a feature."
- **Options:** Yes (append-only) / Yes (edit-in-place) / No (immutable)
- **Approval required:** YES — defines revision semantics.

### Decision 11: Can conclusions be contested?
**Should there be a formal mechanism to mark a conclusion as contested?**
- **Recommendation:** NO — the SoU juxtaposition and community stance display provide sufficient context.
- **Reason:** A formal contest flag recreates acceptance semantics; the evidence posture is the counterweight.
- **Options:** Yes / No / Defer to Consensus System
- **Approval required:** YES — determines whether acknowledgment mechanics are introduced.

### Decision 12: What happens after a Debate is "concluded"?
**Does the room freeze? Can new evidence be added? Can discussion continue?**
- **Recommendation:** No freeze. New evidence/claims/questions can always be added. SoU re-derives automatically. The "concluded" marker is descriptive only.
- **Reason:** Freezing contradicts the MD lifecycle ("Open Discussion" phase) and fallibilist philosophy.
- **Options:** Freeze + reopen / No freeze / Partial freeze / Defer
- **Approval required:** YES — defines room lifecycle.

### Decision 13: Should Discussion have conclusion machinery?
**Should Discussions also support participant conclusions, or remain conversation-first?**
- **Recommendation:** No — Discussions remain conversation-first. Debate-only for MVP.
- **Reason:** Philosophy distinction; Discussion = exploration without resolution. Future Consensus System is the sanctioned path for shared conclusions.
- **Options:** Debate-only / Both / Discussion-only / Defer
- **Approval required:** YES — defines product scope.

### Decision 14: What role should AI have?
**Should AI assist with conclusions?**
- **Recommendation:** AI may suggest evidence anchors, highlight contradictions, identify missing evidence. AI must not author, validate, or override conclusions.
- **Reason:** "AI assists, humans decide" — already established in `00_MASTER_CONTEXT.md`.
- **Options:** Full assist / Limited assist / No AI involvement / Defer
- **Approval required:** YES — if AI-assisted features are desired.

### Decision 15: Should a future Consensus System replace or complement participant conclusions?
**When the registry-approved Consensus System (Phase 2) arrives, how should it relate to participant conclusions?**
- **Recommendation:** Complement — participant conclusions remain individual interpretations; Consensus System handles shared/room-level agreements.
- **Reason:** `02_FEATURE_REGISTRY.md` defines Consensus System as the home for shared understanding; participant conclusions are not consensus artifacts.
- **Options:** Replace / Complement / Merge / Independent
- **Approval required:** YES — defines future architecture.

---

## 18. IMPLEMENTATION GATE

**IMPLEMENTATION MUST NOT BEGIN UNTIL THE PRODUCT OWNER HAS APPROVED:**

1. **Resolution model change** — Eliminate winner/loser; adopt Model G (or alternative).
2. **Conclusion entity design** — Optional per-author conclusions, evidence-anchored, equal-weight.
3. **SoU taxonomy decision** — Whether to remove vote-influence from taxonomy assignment.
4. **Historical data strategy** — How to preserve existing `resolution.winner` records.
5. **Reputation strategy** — Whether/how to remove DEBATE_WON/DEBATE_LOST from future calculations and whether to recalculate historical scores.
6. **Debate lifecycle decision** — Whether to introduce any new process state or marker.
7. **Discussion boundary** — Whether conclusions remain Debate-only.
8. **Authority model** — Who can author conclusions and whether any standing/acknowledgment mechanics are introduced.
9. **Revision model** — Whether conclusions are immutable, editable, or append-only.
10. **AI boundary** — Whether AI assists with conclusions and what constraints apply.

**No code, database, migration, RPC, trigger, UI, or configuration changes should be made until these decisions are documented as approved.**

---

## 19. FINAL VERDICT

### 19.1 The answer to "What does it mean for a Discora Debate to be resolved if Discora is not trying to determine who won?"

**A Debate is "resolved" when the examination has reached a current understanding — a point where the participants have organized the evidence, recorded their interpretations, and identified what remains open.**

Resolution does NOT mean:
- One side defeated the other
- The proposition is true or false
- The debate is permanently closed
- No new evidence can change the understanding

Resolution DOES mean:
- The examination phase produced a structured record
- Evidence has been organized and interpreted
- Participants have recorded their current takeaways
- Open questions have been identified
- The room continues to accept new evidence
- Understanding can evolve

### 19.2 The answer to "What does it mean for the underlying question to remain unresolved?"

**The underlying question remaining unresolved is not a failure — it is an accurate representation of the current state of knowledge.**

An unresolved question means:
- The available evidence is insufficient, mixed, or contested
- Significant uncertainties remain
- Further investigation is needed
- The debate has served its purpose by clarifying what is known and what is not

Unresolved does NOT mean:
- The debate failed
- The participants failed
- The platform failed
- No progress was made

Clarifying what is NOT yet known is itself a valuable outcome.

### 19.3 The simplest model

**Model G — Evidence State + Optional Participant Conclusions + Non-blocking Marker — is the simplest model that achieves Discora's purpose without recreating winner/loser, truth scoring, majority rule, or authority.**

It works because:
1. It preserves the evidence-led synthesis (SoU) as the primary control surface
2. It allows human interpretation (conclusions) without privileging any single interpretation
3. It records the examination's stopping point without freezing the room
4. It removes all competitive framing, winner/loss reputation, and social standing mechanics
5. It aligns with every explicit principle in the Discora foundation
6. It requires only one new entity (participant conclusions) and no new process states

### 19.4 What must not happen

| Must not happen | Why |
|---|---|
| Recreate winner/loser under new names | Philosophy explicitly rejects this |
| Make conclusions authoritative | "AI/creator must not determine truth" extends to human authors |
| Use popularity as evidence | "Evidence over popularity" is non-negotiable |
| Freeze debates | Contradicts `05` lifecycle and fallibilist philosophy |
| Invent new reputation points | No MD justification; gamification risk |
| Expand to Discussions | Conversation-first distinction must be preserved |
| Preempt the Consensus System | Registry-approved Phase 2 feature; do not duplicate |

---

## 20. FINAL DECISION MATRIX

| Decision | Current System | Recommended Direction | Status |
|---|---|---|---|
| Winner/Loser | Winner selection + +25/-5 reputation | Eliminated | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution meaning | Declare winner | Record current understanding | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution states | `active/resolved/closed` + winner field | `active/inactive/archived` + non-blocking marker | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Conclusion | None (winner substitutes for conclusion) | Optional per-author, evidence-anchored, equal-weight | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Evidence relationship | None (winner is declaration, not evidence) | Conclusions cite evidence anchors; SoU is evidence backbone | PROPOSED — REQUIRES PRODUCT APPROVAL |
| State of Understanding | Discussion-only | Extended to debates (same derivation) | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Vote influence on SoU | Social division can assign "contested" | Remove from taxonomy; display-only | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Resolution authority | Creator only (winner declaration) | Any participant may author conclusions | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Revision/reopening | Irreversible freeze + reopen workflow | Append-only conclusions; no freeze; no reopen | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Reputation | DEBATE_WON +25 / DEBATE_LOST -5 | Descriptive participation only; no winner events | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Historical data | Winner records stored as current | Preserve as legacy; do not migrate to evidence states | PROPOSED — REQUIRES PRODUCT APPROVAL |
| AI role | None in resolution | Assist with anchors/evidence; never author/validate | ALREADY ESTABLISHED (extend to conclusions) |
| Discussion conclusion | None | None (conversation-first) | ALREADY ESTABLISHED |
| Debate conclusion | Winner declaration | Optional per-author conclusions | PROPOSED — REQUIRES PRODUCT APPROVAL |
| Consensus System interaction | None | Future Phase 2; complements, not replaced by, participant conclusions | ALREADY ESTABLISHED (registry) |

---

## 21. NOT IMPLEMENTED

**No implementation has occurred.**

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

This document is a design challenge and recommendation only. All proposed changes require explicit product-owner approval before implementation begins.

---

*End of Phase 6E-B Model Challenge Report*