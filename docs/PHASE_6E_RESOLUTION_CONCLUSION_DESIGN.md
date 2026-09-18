# PHASE 6E — RESOLUTION & CONCLUSION DESIGN

**Deep Product / Architecture Audit — DESIGN ONLY — NO IMPLEMENTATION**

- **Date:** 2026-09-07
- **Repo:** `d:\Projects\Discora`
- **Branch:** `main`
- **Commit audited:** `0223c7011ff8cb0631ebdf2f84414a97a8d929bd` (working tree at audit time)
- **Scope:** Audit of the current winner/loser debate-resolution architecture and a proposed concluding/current-understanding model at the product-model level.

---

## 0. ABSOLUTE NO-IMPLEMENTATION RULE

This is a PRODUCT DESIGN / ARCHITECTURE AUDIT.

**DO NOT modify:**
- application source code
- React components
- TypeScript types
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

The ONLY file created/modified by this phase is:

```text
docs/PHASE_6E_RESOLUTION_CONCLUSION_DESIGN.md
```

If any other file appears necessary, STOP and report it. Do not modify it.

---

## 1. WHY THIS PHASE EXISTS

Discora currently contains a **winner/loser resolution architecture**:

- `debates.resolution` stores `{ winner: 'proposition' | 'opposition' | 'draw', summary, resolvedBy }`
- `debates.status` transitions to `'resolved'` (or `'closed'`)
- `resolve_debate` RPC (creator-authorized) writes the resolution and flips the room to `inactive`
- `handle_debate_resolve` trigger awards `DEBATE_WON` (+25)and `DEBATE_LOST` (−5) reputation events to participants
- reputation computation exposes `debateWins` / `debateLosses`, and the profile reputation breakdown panel renders factor rows named **"Debates Won"** and **"Debates Lost"**
- earlier product iterations described historical Win/Loss/Win-Rate profile presentation

PHASE 6C deliberately neutralized the *presentation* layer.It did **not** redesign the underlying resolution architecture. Phase 6E exists to answer, at the **product model** level:

> "What does it mean for a Discora Debate to be *resolved* if Discora is NOT trying to determine *who won*?"

This must be answered **before** any future implementation touches statuses, resolution/conclusion storage, triggers, reputation, or UX.

 This document is the first required deliverable of that answer — produced as a design audit, not as code.



---

## 2. DISCORA POLICY GATE

Per the audit gate, the following original product documents were inspected (**all verified to exist** in the repository):

| Document | Path | Status |
|---|---|---|
| Master Context | `docs/00_MASTER_CONTEXT.md` | ✅ EXISTS — audited |
| PRD | `docs/01_PRD.md` | ✅ EXISTS — audited |
| Feature Registry | `docs/02_FEATURE_REGISTRY.md` | ✅ EXISTS — audited |
| User Flows | `docs/03_USER_FLOWS.md` | ✅ EXISTS — audited |
| Database Design | `docs/04_DATABASE_DESIGN.md` | ✅ EXISTS — audited |
| System Architecture | `docs/05_SYSTEM_ARCHITECTURE.md` | ✅ EXISTS — audited |
| Design System | `docs/06_DESIGN_SYSTEM.md` | ✅ EXISTS — audited |
| Development Roadmap | `docs/08_DEVELOPMENT_ROADMAP.md` | ✅ EXISTS — audited |
| Knowledge Model | `docs/23_KNOWLEDGE_MODEL.md` | ✅ EXISTS — audited |
| AI Development Context | `docs/10_CODEX_CONTEXT.md` | ✅ EXISTS — audited |

Relevant existing product/audit/design documents (**verified paths**; several live at repo root, not `docs/`):

| Document | Path | Status |
|---|---|---|
| Phase 6A Whole-Product Audit | `docs/PHASE_6A_WHOLE_PRODUCT_AUDIT.md` | ✅ EXISTS — consulted (reputation-authority finding P2-EPI-006) |
| Phase 6B UX/Visual Audit | `docs/PHASE_6B_UX_VISUAL_AUDIT.md` | ✅ EXISTS — consulted (scorecard gamification, epistemic visual language) |
| Debate UX Audit | `DEBATE_UX_AUDIT.md` (repo root) | ✅ EXISTS — consulted (Problem 6: resolution is "who won") |
| Truth-Seeking Reputation Review | `TRUTH_SEEKING_REPUTATION_REVIEW.md` (repo root) | ✅ EXISTS — consulted (remove DEBATE_LOST; win model marked BAD) |
| Product Philosophy | `DISCORA_PRODUCT_PHILOSOPHY.md` (repo root) | ✅ EXISTS — consulted (replace winner with conclusion; anti-gamification) |
| Consensus System (design-only) | `CONSENSUS_SYSTEM.md` (repo root) | ✅ EXISTS — consulted ("Current Conclusion" model) |
| Roadmap Recommendation | `ROADMAP_RECOMMENDATION.md` (repo root) | ✅ EXISTS — consulted (winner→conclusion; remove win-rate) |
| Phase 4A Understanding-Layer Audit | `docs/PHASE_4A_UNDERSTANDING_LAYER_AUDIT.md` | ✅ EXISTS — consulted (SoU epistemic constraints) |
| Phase 4B SoU Behavioral Audit | `docs/PHASE_4B_STATE_OF_UNDERSTANDING_BEHAVIORAL_AUDIT.md` | ✅ EXISTS — consulted (SoU comprehension validation) |
| Phase 4A/4B Redesign & Plans | `docs/PHASE_4A_UNDERSTANDING_LAYER_*.md`, `docs/PHASE_4B_STATE_OF_UNDERSTANDING_*.md` | ✅ EXISTS — consulted (SoU product model) |

**No document referenced above was missing.** If a future phase references a document under a wrong path, treat it as `UNVERIFIED — DOCUMENT NOT FOUND` until the real path is located (e.g., `DEBATE_UX_AUDIT.md`, `CONSENSUS_SYSTEM.md`, `DISCORA_PRODUCT_PHILOSOPHY.md`, `TRUTH_SEEKING_REPUTATION_REVIEW.md`, `ROADMAP_RECOMMENDATION.md` are at repo root, not under `docs/`).

### 2.1 Policy gate summary (what the MDs actually authorize)

- **00_MASTER_CONTEXT.md** (line 31): *"Discora is not intended to determine winners and losers.* Instead, it aims to help individuals explore complex topics, understand opposing viewpoints, identify common ground, and build more informed perspectives."
- **00_MASTER_CONTEXT.md** (line 814: *"The platform is not designed to determine what people should believe."*
- **01_PRD.md**: Debate Room purpose = *"Structured examination of topics with disagreement"* (Pro/Con/Neutral participation). No winner mechanic exists anywhere in the PRD.
- **02_FEATURE_REGISTRY.md**: Consensus System (Phase 2) — *"Consensus should represent: shared understanding, common agreements, evidence-supported conclusions"* and *"Consensus should NOT represent: truth, majority vote, forced agreement."*
- **03_USER_FLOWS.md**: MVP flow list contains **no resolution flow at all** — no "declare winner" step was ever designedinto the flows..
- **04_DATABASE_DESIGN.md**: The designed `debates` table has `id, room_id, motion, creator_position, ...` — **no `status`, no `resolution`, no `winner` column** (those were added by implementation in sprint migrations `202606100001`+`202606100003`). Future tables are reserved for `consensus, open_questions, consensus_history, position_changes, reflection_logs`.User statistics: *"These should not determine authority. They are descriptive metrics only."*
- **05_SYSTEM_ARCHITECTURE.md**: Debate lifecycle designed as `Open → Inactive → Open Discussion → Archived`. **No "Resolved" state exists in any MD lifecycle.** `rooms.status` constraint remains `('open','inactive','archived')`.
- **06_DESIGN_SYSTEM.md**: Profile metrics *"are informational only. They do not represent authority or ranking."*
- **08_DEVELOPMENT_ROADMAP.md**: Post-MVP Phase 2 = Consensus System, Open Questions; consensus is a future feature, not an MVP winner mechanic..
- **23_KNOWLEDGE_MODEL.md**: Claim = falsifiable statement; Evidence supports/contradicts/contextualizes; "consensus" as a word is defined as a *dynamically calculated ratio* of agreement (a numeric stance signal,, not a truth declaration;.
- **10_CODEX_CONTEXT.md**: *"Do not create trust scores. Do not create authority rankings"*; AI must never *"declare truth, decide consensus, permanently remove content"*.

**Conclusion of the gate:** The winner/loser resolution architecture exists **only in the implementation**, never in any original MD. Every original product document that touches the subject points away from winners and toward understanding, conclusion, and consensus-as-shared-understanding. The burden of proof is therefore on the winner model — and the implementation, not the MDs, must change.

---

## 3. PRODUCT PHILOSOPHY (ABSOLUTE HIERARCHY)

Treat this hierarchy as absolute:

| Priority | Source |
|---|---|
| 1. Discora Philosophy | 00_MASTER_CONTEXT (north star:: understanding over engagement; evidence over popularity; clarity over activity; questions before conclusions; neutrality; changing one's mind is progress) |
| 2. Original MDs |01–08, 23 (product requirements, knowledge model, registered feature statuses) |
| 3. Explicitly approved product decisions | ADRs and approved design docs (e.g., `16_ARCHITECTURE_DECISIONS.md`, approved phase plans) |
| 4. Current implementation | Existing code/schema (subject to 1–3) |
| 5. UX optimization | Presentation and usability refinement (never overrides 1–4) |

**What Discora is NOT designed to do:**

- determine winnersand losers
- declare absolute truth
- make popularity equal correctness (popularity ≠ correctness)
- make majority vote equal truth (consensus ≠ majority rule)
- force consensus (consensus must never be forced)
- tell users what to believe
- let AI determine correctness

**What Discora IS designed to do:**

- improve understanding
- structure meaningful discussion
- examine disagreement
- examine claims
- examine evidence
- clarify uncertainty
- expose competing perspectives
- support better-informed conclusions
- preserve intellectual humility (fallibilism;every conclusion is provisional)

**Key philosophy statement (from 00_MASTER_CONTEXT, 23_KNOWLEDGE_MODEL, DISCORA_PRODUCT_PHILOSOPHY):**

> Changing one's mind because of stronger evidence is progress, not losing.

> Reputation measures track record of contributing to understanding — **not** correctness, popularity, or power.



---

## 4. FULL CURRENT-SYSTEM AUDIT

This section traces the actual repository (not only prior audits). Searches covered: `winner`, `resolution`, `resolved`, `resolve_debate`, `handle_debate_resolve`, `DEBATE_WON`, `DEBATE_LOST`, `debateWins`, `debateLosses`, `winRate`, `draw`, `proposition`, `opposition`, `reputation`, `State of Understanding`, `consensus`.

###4.1 DATABASE LAYER

| Object | Location | Behavior (verified in SQL) |
|---|---|---|
| `debates` table | `supabase/migrations/202606100001_create_debates.sql` | `id` (PK=rooms.id), `proposition_title`, `opposition_title`, `opening_statement`, `status text NOT NULL DEFAULT 'active' CHECK (status in ('active','resolved','closed'))`, `resolution jsonb`, timestamps. **No conclusion column. No resolution in original design** |
| `rooms` table | `202606030003_create_discussions.sql` | `status CHECK (status in ('open','inactive','archived'))`. **No 'resolved' room state exists by schema** — resolution sets room to `inactive` |
| `debate_participants` | `202606100001_create_debates.sql` | `side CHECK (side in ('proposition','opposition','neutral'))`; unique(room_id,user_id); RLS select anyone, insert/update/delete self |
| `debates` RLS | `202606100001_create_debates.sql` | select: exists public room; update: room creator only (`rooms.created_by = auth.uid()`) |
| `discussion_debates` view | `202606100001` + `202606100003` | exposes debate + room fields, participant/claim/evidence counts, sort columns, `status`; `where exists (room_type='debate')`; granted select to anon, authenticated |
| `resolve_debate` RPC | `202606100003_debate_sort_and_status_sync.sql:120-171` | `security invoker`, `search_path=public`. Validates: debate exists, ≥1 proposition participant, ≥1 opposition participant, ≥1 proposition claim, ≥1 opposition claim. Then `UPDATE debates SET status='resolved', resolution=jsonb_build_object('winner',p_winner,'summary',p_summary,'resolvedBy',p_resolved_by)` and `UPDATE rooms SET status='inactive'`. **Requires both sides active before resolution** |
| `handle_debate_resolve()` trigger fn | `202606100004_create_reputation_events.sql:405-450` | `SECURITY DEFINER`, fires `AFTER UPDATE OF status WHEN (new.status='resolved' and old.status!='resolved')`. If `resolution->>'winner'` not null and != 'draw': winners → `DEBATE_WON` +25; losers (side != winner and != 'neutral') → `DEBATE_LOST` −5. **Draw → no events** |
| `trg_reputation_debate_resolve` | same file:534-540 | `AFTER UPDATE OF status ON debates` — bare trigger (flagged UNSAFE in `DEPLOYMENT_STABILIZATION_REPORT.md`) |
| `handle_debate_insert` / `handle_debate_participant_insert` | same file | `DEBATE_CREATED` +15 (creator), `DEBATE_JOINED` +5 (participant) |
| `reputation_events` | same file:9-36 | immutable ledger: `user_id, event_type, points, metadata`; select own; system-insert policy (hardened in `202606190001`) |
| `recalculate_user_reputation` | `202606100004:62+`, hardened `202606190001:84+` | sums `reputation_events.points` + consensus bonus (agree>60%); hardened to authenticated self-or-admin only; direct table/helper access revoked |
| Win/loss computation (app) | `src/features/reputation/services/reputation-service.ts:235-251` | for each of the user's resolved participations: `resolution.winner === user.side → debateWins++` else `debateLosses++`; draw and missing winner skipped |
| Consumer chain | `discussion_debates.resolution` → `getUserContributions` → `computeReputation` (client) → `ReputationBreakdown` | win/loss data feeds the profile reputation factor panel |

###4.2 APPLICATION LAYER

| Surface | File | Behavior (verified) |
|---|---|---|
| `Debate` type | `src/features/discussions/types.ts:67-85` | `status: DebateStatus ('active'|'resolved'|'closed'), resolution: Record<string,unknown>|null, plus per-side counts` |
| `DbDebateRow` / `mapDebateRow` | `src/features/discussions/services/discussion-service.ts:68-74,169-180` | passes `status` and raw `resolution` (untyped `Record`) |
| `resolveDebate` service | `src/features/debates/services/debate-service.ts:419-436` | `supabase.rpc('resolve_debate', {p_room_id,p_winner,p_summary,p_resolved_by})` |
| `useResolveDebate` | `src/features/debates/hooks/use-debates.ts:121-134` | mutation `{winner; summary; resolvedBy}`; invalidates debate/room queries |
| `DebateResolution` panel | `src/features/debates/components/debate-resolution.tsx` | creator-only; hidden when resolved; gating: both sides need ≥1 participant and ≥1 claim; "Select Winner" (proposition/opposition/draw), "Resolution Summary" (min 10 chars); "Resolve Debate", "Declare Resolution", "This action is irreversible", "Please select a winner"; submit → `resolveDebate` → toast "Debate resolved" |
| `DebateHeader` | `src/features/debates/components/debate-header.tsx:20-31` | resolved banner "Resolved" + `resolution.summary`; closed banner "Debate Closed" |
| `DebateRoom` overview | `src/features/debates/components/debate-room.tsx:251-266` | overview renders `RoomGuideCard(debate)`, `ArgumentEvidenceOverview`, `DebateResolution`, `PositionHistory`. **No State of Understanding in debates** |
| `DebateScorecard` | `src/features/debates/components/debate-scorecard.tsx` | "Live Scorecard" — per-side agree−disagree net (flagged P1-UX-001 in PHASE_6B) |
| `computeReputation` | `src/features/reputation/reputation-utils.ts:21-70` | factors `{name:'Debates Won', value:debateWins, weight:25}` (+25)and `{name:'Debates Lost', value:debateLosses, weight:5}` (−5); plus Debates Created +15, Debates Joined +5 |
| `ReputationBreakdown` | `src/features/reputation/components/reputation-breakdown.tsx` | renders factor rows incl. **"Debates Won"/"Debates Lost"** (verified presentational surface of win/loss) |
| `useReputation` timeline | `src/features/reputation/hooks/use-reputation.ts` | builds claims/evidence/questions/side-change timeline — no debate-type timeline entries |
| Profile page | `src/app/u/[username]/page.tsx` + `ProfileReputationSection` | displays contribution counts; **current `src/` does NOT render win-rate/wins/losses as stat cards** (§16; `PROFILE_AUDIT.md` confirms not displayed) |
| State of Understanding | `src/features/discussions/components/state-of-understanding.tsx` + `understanding-utils.ts` | **discussion rooms only** (`discussion-room.tsx:261-262`); deterministic, evidence-led; per-claim taxonomy `supported|contested|unresolved` from evidence direction + vote sample thresholds (≥5 votes; 35–65% = contested; zero directional evidence = unresolved; unanswered open questions listed; labels "Supported by Current Evidence", "Contested / Mixed Evidence", "Unresolved Front"; footnotes reinforce "Supported ≠ proven" |
| Browse debates | `src/features/debates/components/browse-debates.tsx` + `useDebates` | status filter tabs "Active / Closing Soon / Resolved" consuming `discussion_debates.status` |

###4.3 DEPENDENCY MAP (resolution system)

```text
debates.resolution {winner,summary,resolvedBy}
 ▲
 │ UPDATE (creator via RLS)
resolve_debate (RPC, security invoker)   create_reputation_event (SECURITY DEFINER,
 │              only by triggers)
 │ UPDATE debates.status='resolved'      ▲
 │ UPDATE rooms.status='inactive'       │ trigger
 └──────────────────────────────► handle_debate_resolve (AFTER UPDATE status)
                │
 ▼               ▼
discussion_debates (view)      reputation_events (DEBATE_WON +25 / DEBATE_LOST −5)
 │               │
 ▼               ▼
DebateResolution (UI, creator)   recalculate_user_reputation (sum + consensus bonus)
 │               │
 ▼               ▼
DebateHeader ("Resolved" banner),    getUserContributions (debateWins/debateLosses)
browse-debates ("Resolved" tab)       │
                ▼
              computeReputation (client) → ReputationBreakdown
              ("Debates Won" / "Debates Lost" factor rows(
```

**Other relevant state & adjacent surfaces:**

- `rooms.status` (`('open','inactive','archived')`) is shared by discussions/debates; `resolve_debate` flips rooms to `inactive` — per `05_SYSTEM_ARCHITECTURE` the debate lifecycle (`Open → Inactive → Open Discussion → Archived`) has **no** room-level "resolved" state.
- `State of Understanding` consumes claims/evidence/questions/claim-relations/inquiry-counts — discussion-side surfacesonly; it is **absent from the debate room**.
- The debate room's only "conclusion-like" surfaces are `ArgumentEvidenceOverview` and `PositionHistory` (side-switch history; neither is an epistemic summary of the debate.
- Moderation and the `consensus_ratio` (vote ratio on claims/evidence) are separate axes, unaffected by resolution today (besides the reputation consensus bonus).

**Audit completeness note:** No other consumers of `resolution.winner` were found besides: `resolve_debate` write path, `handle_debate_resolve` reputation events, `DebateResolution` UI, `DebateHeader` banner, `getUserContributions` win/loss computation, browse filter status. `winRate` exists only in historical docs — **not** in current `src/`.** The winner model's systemic footprint is small (two persistence artifacts + few consumers), which makes redesign tractable. That does NOT reduce philosophical severity — it means it is correctable with proportionally small blast radius.



---

## 5. ALIGNMENT ANALYSIS

###Classifier:

> **CURRENT WINNER MODEL: `MISALIGNED`**

Rated against explicit MD language (00_MASTER_CONTEXT,101_PRD,104_DATABASE_DESIGN,105_SYSTEM_ARCHITECTURE,106_DESIGN_SYSTEM,108_DEVELOPMENT_ROADMAP,123_KNOWLEDGE_MODEL) and approved design docs (DISCORA_PRODUCT_PHILOSOPHY, CONSENSUS_SYSTEM, TRUTH_SEEKING_REPUTATION_REVIEW, ROADMAP_RECOMMENDATION):

| Discora Commitment (MD source) | Current Implementation | Alignment |
|---|---|---|---|
| "Discora is not intended to determine winnersand losers" (00:31) | `resolve_debate` picks a winner (proposition/opposition/draw); UI "Select Winner", "Proposition Wins" | **MISALIGNED** (direct contradiction) |
| Platform is not designed to determine what people should believe (00:814) | A creator-declared winner is a de-facto "this side is right" statement | **MISALIGNED** (authority shortcut) |
| Debates = "structured examination of topics with disagreement" (01:135-147) | Resolution frames debate as a contest verdict ("who won") | **MISALIGNED** (frames the process as competition) |
| Consensus must not represent truth / majority vote / forced agreement (02) | Winner picks one side as correct — an enforced binary verdict | **MISALIGNED** (violates consensus semantics) |
| "These statistics should not determine authority… descriptive metrics only" (04,06) | `DEBATE_WON` +25 / `DEBATE_LOST` −5 turn debate outcome into reputation authority | **MISALIGNED** (outcome becomes authority signal) |
| No "resolved" lifecycle state in any MD (04,05) | `debates.status='resolved'` added by implementation; drives banners/filters | **POTENTIALLY MISALIGNED** (implementation-added lifecycle state unbacked by MD) |
| Every conclusion fallible; evidence over popularity (00,23) | Winner is chosen by creator, not by evidence; irreversible with no revision | **MISALIGNED** (closed, one-shot, evidence-free verdict) |
| "Changing one's mind … is progress, not losing" (00,23) | `DEBATE_LOST` −5 penalizes being on the "losing" side; win-rate framing (historical docs) turns mind-changing into stat damage | **MISALIGNED** (inverts the core value) |
| "AI must never declare truth / consensus" (10) | Winner is human-declared, but the same epistemic overreach applies to singular creator authority | **ALIGNED-to-concern** (the winner mechanic is a human analogue of the banned AI behavior) |

**MD-language audit conclusion:** No original MD endorses a winner mechanic; several explicitly forbid its semanticsthe effect (winners/losers, popular-majority-as-truth, artificial authority, non-fallible conclusions). The current model contradicts the product's foundational statements at multiple independent points — hence **MISALIGNED**, not *partially* aligned.



###5.1 WHY IT IS STRUCTURALLY INCOMPATIBLE (not merely "winner is bad")

The incompatibility is **structural**, not cosmetic:

**1. It collapses process and truth.** "Resolved" is ambiguous between *"the examination concluded"* and *"the proposition was shown true."* Winner framing forces the second reading. Discora's entire architecture exists to keep *what evidence shows* distinct from *what someone concluded* — the SoU taxonomy exists precisely to avoid "supported = true". A winner verdict re-merges these two axes under one label. The instruction of this phase states RESOLUTION OF THE DEBATE PROCESS and TRUTH OF THE UNDERLYING PROPOSITION **must not be treated equivalently** — the winner model does exactly that;.

**2. Popularity/authority fallacy enters through a back door.** Even though the winner is creator-chosen (not voted), the mechanic mirrors majority-rule semantics: one side prevails, the other loses — exactly the "consensus = majority rule" that the Feature Registry forbids. Community pressure (or a frustrated creator) can crown a side independent of evidence quality; and because the winner is a single role-bearer, it constitutes artificial authority (02: "does not create artificial authority";06: stats ≠ authority).;

**3. It arrogates an epistemic classification without evidence anchors.** Declaring a winner asserts an implicit epistemic classification of all claims on the losing side — with no requirement of evidence references, no revision, no participant acknowledgment. Authority comes from the role (creator),not from the evidence (the philosophy's only legitimate epistemic currency).;

**4. It converts fallibilism into a fixed record.** Resolution is irreversible ("This action is irreversible") and one-shot. Discora's knowledge-evolution future (consensus history, understanding timelines, position-change tracking;02,00 future features) requires every conclusion to be revisable. A winner verdict is a terminal statement — the anti-thesis of knowledge evolution.

**5. It manufactures losers who did nothing epistemically wrong.** A participant on the non-winning side may have contributed the strongest evidence of the room. The loser penalty then punishes evidence quality in service of rhetorical outcome. The philosophy defines "stronger conclusions" as tested-by-challenge — a rhetorical verdict says nothing about one's contribution to understanding. This is not a cosmetic re-label; it is a category error in what the platform rewards and measures.;

**Structural conclusion:** the winner model must be **replaced at the product-model level** — not merely hidden from the presentation (Phase 6C's neutralization)— because it continues to shape status semantics, reputation events, authority chains, and future knowledge evolution from underneath. Phase 6E's job is to define what replaces it clearly enough that implementation can follow without resurrecting winner semantics by accident.**



---

## 6. DEFINE THE CONCEPTS

Before proposing a solution, the domain must be precise. These definitions are grounded in MDs (00, 01, 02, 23), the SoU implementation, and the inquiry layer. Items marked **(PROPOSED)** are new product-model meanings this phase recommends approving.

| Concept | Definition (Discora sense) |
|---|---|---|
| **Debate** | A room where participants examine a motion through competing positions (Proposition / Opposition) under structured rules — "structured examination of topics with disagreement" (01). Its product goal: a **stronger, evidence-tested conclusion**, not a verdict. |
| **Position (side)** | A participant's stance on the motion (`proposition`, `opposition`, or inquiry/neutral). Positions are rhetorical commitments, not truth-claims about the world by themselves. They can be switched when evidence compels (00: mind-changing is progress). |
| **Argument** | A structured line of reasoning for or against a position, carried primarily by **claims** (+relations and evidence). Arguments are contestable, never terminal. |
| **Claim** | A falsifiable statement (fact, opinion, prediction, proposal, observation;23). The atomic epistemic unit of the room. A claim's epistemic standing is *always provisional* and evidence-dependent. |
| **Evidence** | A specific interpretation/citation that supports, contradicts, or contextualizes a claim ("the unit of persuasion";23). Evidence direction (`support/contradict/context`) is the raw material of the evidence state. |
| **Source** | A verifiable reference (URL/file/PDF/image) backing an evidence card (23: strict pipeline Source→Evidence→Claim). |
| **Question (discussion-level)** | An open framing query exploring the topic without committing to a position (01; SoU "Unresolved Front"). |
| **Structured Inquiry** | A targeted follow-up scoped to a specific claim (clarification, evidence request, assumption check; implemented via `inquiry_items`). Epistemic debt demanding response. |
| **Resolution (CURRENT, deprecated)** | A creator-declared winner (`{winner, summary, resolvedBy}`) — a contest verdict. **To be retired from the product model.** |
| **Conclusion (PROPOSED)** | A **human-authored, participant-recorded interpretation** of what the current evidence and the exchange suggest — phrased as *current best understanding of the examined question*, explicitly fallible and revisionable. NOT a statement of truth, NOT a verdict on the motion-as-truth, and NOT automatic. |
| **Current Understanding (PROPOSED)** | The live, evidence-led synthesis of the room: **State of Understanding** (deterministic per-claim evidence posture + open questions) optionally complemented by one or more participant Conclusions. "Current" signals temporality: new evidence can change it. |
| **State of Understanding (SoU)** | The implemented deterministic synthesis (discussion rooms): per-claim taxonomy `supported | contested | unresolved` computed from evidence direction, vote sample thresholds, and open unanswered questions — *epistemic posture*, never truth degree (PHASE_4A constraints ). |
| **Open Question** | A question not yet addressed by an answering claim/evidence/inquiry — remains part of the room's ongoing epistemic debt. A debate/process can be concluded while open questions remain. |
| **Closed** | A room/entity state with an administrative or conduct meaning — participation frozen by a moderator/admin (or archived by lifecycle); closure does **not** imply epistemic settlement. |
| **Resolved (PROPOSED redefinition)** | **Debate process concluded**: participants deliberately ended the *current phase* of structured examination and recorded the current state (SoU + optional conclusions). The word should be avoided in UI if it reads as "truth found" — **"Concluded"** is the recommended label (§19). |

###6.1 THE CRITICAL DISTINCTION: PROCESS RESOLUTION vs PROPOSITION TRUTH

> **RESOLUTION OF THE DEBATE PROCESS** = the examination reached a meaningful stopping point; the current understanding was summarized, disagreements were mapped, and remaining open questions were recorded. It answers:*"Did we conclude this phase of inquiry?"* — a **process** fact.

> **TRUTH OF THE UNDERLYING PROPOSITION** = whether the motion is true of the world. Discora **cannot and must not** declare this (00: "not intended to determine winners/losers" "not designed to determine what people should believe"; 10: AI must not declare truth; even a consensus does not equal truth — 02,23).

**These two axes are independent and orthogonal.** The final modelmust allow:

- debate process **Concluded** and underlying question **still open** (e.g., evidence ,    ).
- debate process **Concluded** with a *participant-recorded conclusion* that the evidence-leaning is toward X — while explicitly preserving that "the underlying question could be overturned by new evidence".
- debate process **still Active** while an underlying question is, in fact, well-settled by the evidence state — because no one has closed the phase (or indefinitely resettled; SoU can show "supported by current evidence" without any process claim).

The winner model conflates these axes exactly such that "resolved" reads as "proposition settled (sometimes in favor, sometimes draw)". This conflation is the root incompatibility (§5.1.1).



---

## 7. EVALUATE CANDIDATE MODELS

Five candidate models from the phase brief are evaluated, plus one added model (F) justified by repository/MD evidence (SoU already implements an evidence-state model for discussions;the phase brief's taxonomy question must have a concrete carrier). Each model is scored on all requested dimensions (philosophical alignment, epistemic safety, user comprehension, usefulness, uncertainty preservation, evidence relationship, authority risk, moderation implications, Discussion compatibility, Debate compatibility, migration difficulty, DB complexity, UI complexity, reputation impact, risk of being interpreted as truth, risk of recreating winner/loser dynamics). Ratings: `STRONG / GOOD / MIXED / WEAK / POOR / N/A`.

###Model A — Winner / Loser (current)

> "One side wins; opponents lose; outcomes enter reputation.”

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | POOR — directly contradicts 00:31 ("not intended to determine winners/losers") |
| Epistemic safety | POOR — declares a winner absent evidence anchors; irreversible |
| User comprehension | GOOD — familiar "debate = contest" mental model — familiarity, not alignment |
| Usefulness | WEAK — provides closure signal but falsifies the platform's findings |
| Uncertainty preservation | POOR — verdict suppresses residual uncertainty |
| Evidence relationship | POOR — winner is creator-chosen; zero evidence anchors |
| Authority risk | HIGH — creator becomes epistemic authority |
| Moderation implications | NONE/LOW — no moderation hook for verdict; no revision path |
| Discussion compatibility | POOR — discussions intentionally have no winner |
| Debate compatibility | POOR — frames structured examination as contest |
| Migration difficulty | N/A (baseline) |
| DB complexity | LOW (jsonb column) |
| UI complexity | LOW (panel) |
| Reputation impact | HARMFUL — DEBATE_WON/LOST reward/penalize rhetorical outcome |
| Risk read as truth | HIGH — "Proposition Wins" reads as "motion true" |
| Risk recreating winner dynamics | HIGH (is the winner dynamics) |
| **Verdict** | **REJECT** |

###Model B — Neutral Outcome ( "No clear winner" / draw-forced)

> "Frankly: no winner declared; the debate closes with 'draw' or 'no winner'."

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | WEAK — removes a winner but keeps "contest verdict" frame ("draw" is still a verdict on the contest) |
| Epistemic safety | MIXED — safer than A but still implies the question was adjudicated ("no winner" = "the bout ended even") |
| User comprehension | GOOD — familiar draw concept |
| Usefulness | WEAK — "draw" communicates nothing about what was understood |
| Uncertainty preservation | MIXED — preserves ambiguity intentionally but without structure |
| Evidence relationship | POOR — no evidence anchors; verdict still role-decided |
| Authority risk | MIXED — no side crowned, but creator still owns the outcome |
| Moderation implications | NONE/LOW |
| Discussion compatibility | POOR — discussions don't do verdicts |
| Debate compatibility | WEAK — mejor than A, but still sport-framed |
| Migration difficulty | LOW — reuses resolution jsonb (winner='draw' only) |
| DB complexity | LOW |
| UI complexity | LOW |
| Reputation impact | MINIMAL — no won/lost events (draw skips events today), but "draw" lingering semantics pollutes |
| Risk read as truth | MEDIUM — "no winner" can read as "stalemate = neither true"; a false dichotomy |
| Risk recreating winner dynamics | MEDIUM — three-button winner picker becomes two-button draw picker; the frame survives |
| **Verdict** | **REJECT as primary; may survive as an exported label in the conclusion view ("currently unsettled") where evidence genuinely splits** |

###Model C — Evidence State

> "The room's conclusion-like output is a deterministic evidence-state view: claims classified by evidence posture (supported / contested / unresolved), open questions surfaced, no human verdict."

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | STRONG — pure "evidence over popularity", fallibilist, no winner, no truth claim |
| Epistemic safety | STRONG — never asserts truth; classifies *evidence posture*, not propositions |
| User comprehension | STRONG — validated in PHASE_4B (users grasp "Supported by Current Evidence" ≠ proven) |
| Usefulness | STRONG — shows what is known/contested/missing and what to do next |
| Uncertainty preservation | STRONG — residual uncertainty is first-class (contested/unresolved/open questions) |
| Evidence relationship | STRONG — computed from evidence direction + sample thresholds |
| Authority risk | LOW — deterministic; no human authority; no AI authority |
| Moderation implications | LOW — hidden/unhidden evidence automatically re-derives the state; no separate resolution moderation |
| Discussion compatibility | STRONG — designed for and validated on discussion rooms |
| Debate compatibility | GOOD — same evidence posture can be computed per debate claim; currently absent from debate UX |
| Migration difficulty | LOW-MEDIUM — no new schema required (computed client-side; could be view/RPC later) |
| DB complexity | NONE (computed; no new columns needed) |
| UI complexity | MEDIUM (SoU exists for discussions; debates would need it) |
| Reputation impact | POSITIVE-SIDE — reputation events need debate-specific disputation signals (see §15); no won/lost |
| Risk read as truth | LOW-MEDIUM — taxonomy could harden into truth-likelihood if labels are careless ("supported = true") — mitigatable via PHASE_4A constraints (explicit fallibilist wording) |
| Risk recreating winner dynamics | LOW — but "supported vs contested" could be gamed as scoreboard if presented as per-side win counts (must be presented per-claim, not per-side totals) |
| **Verdict** | **ADOPT as the evidence backbone (base layer of the recommended model F)** |

###Model D — Conclusion + Evidence

> "A human-authored conclusion (statement + summary) referenced to evidence anchors, recorded on the debate.Conclusion lifecycle (proposed → accepted → superseded) per CONSENSUS_SYSTEM.md design sketch."

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | GOOD — serves "help people reach stronger conclusions" (DISCORA_PRODUCT_PHILOSOPHY)and the Consensus-system registry direction (evidence-supported conclusions; non-forced) — **with heavy caveats (see §8)** |
| Epistemic safety | MIXED — safe only if the conclusion is framed as *interpretation*, not verdict; risk: creator authority, hidden winner, unofficial truth (§8) |
| User comprehension | GOOD — "conclusion" is intuitive and matches the platform's stated mission |
| Usefulness | GOOD — provides the *narrative* the evidence state lacks ("so what did we take away?") |
| Uncertainty preservation | MIXED — must explicitly carry "what remains contested / open"; otherwise reads terminal |
| Evidence relationship | GOOD-BY-DESIGN — conclusion **must** cite claims/evidence (mandatory anchors reduce floating authority) |
| Authority risk | MEDIUM-HIGH — risk that author becomes authority; needs co-authorship/non-authoritative framing (§8, §11) |
| Moderation implications | MEDIUM — conclusions referencing hidden/invalid evidence must be re-anchored or quarantined necessarily |
| Discussion compatibility | MEDIUM — discussions could later adopt "interpretation" (see §17), but must not become competitive |
| Debate compatibility | GOOD — debates (structured argument toward conclusion) are the natural host |
| Migration difficulty | MEDIUM — new column(s)/RPC/replace resolution consumers |
| DB complexity | MEDIUM — conclusion + anchors (+ optional version history) |
| UI complexity | MEDIUM — proposal/ack/view panels replacing winner panel |
| Reputation impact | NEUTRAL-POSITIVE — conclusion authorship could be recognized descriptively, never as "win" (§15) |
| Risk read as truth | MEDIUM-HIGH — "conclusion" can harden into "official truth" unless labeled "current/in-progress/interpretation" |
| Risk recreating winner dynamics | MEDIUM-HIGH — a single-author conclusion with winners/losers semantics would be winner model 2.0 |
| **Verdict** | **ADOPT-with-safeguards as the *human interpretation layer* on top of Model C (recommended Model F)** |

###Model E — No Formal Resolution

> "Debates simply remain open, or are archived by lifecycle; nothing is recorded as a resolution/conclusion; SoU (if any) is the only standing surface."

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | GOOD — no winner, no truth claim, no artificial authority; "understanding over closure" |
| Epistemic safety | STRONG — nothing authoritative recorded |
| User comprehension | MIXED — users ask "is this debate finished?" with no honest answer |
| Usefulness | WEAK-MIXED — loses the "meaningful stopping point" and the "what we learned" narrative; undermines debate's product identity (structured argument *toward a conclusion*) |
| Uncertainty preservation | STRONG — everything stays open |
| Evidence relationship | N/A — no conclusion to anchor |
| Authority risk | NONE |
| Moderation implications | LOW — archiving/lifecycle only |
| Discussion compatibility | STRONG — matches discussions' conversation-first posture |
| Debate compatibility | WEAK — debates get no conclusion mechanism; degrades debate to discussion-with-sides |
| Migration difficulty | LOW — reuse archiving lifecycle; drop resolution UI |
| DB complexity | NONE |
| UI complexity | LOW — remove winner panel |
| Reputation impact | NEUTRAL — but debate identity in reputation becomes thin |
| Risk read as truth | NONE |
| Risk recreating winner dynamics | NONE |
| **Verdict** | **ADOPT as the *default non-action*: no forced closure; conclusion is optional, never mandatory** |

###Model F — Evidence State + Optional Participant Conclusion( "Current Understanding" — RECOMMENDED

> "A debate is **Concluded** when participants deliberately end the current examination phase, leaving behind: (1) the deterministic **State of Understanding** (evidence posture per claim + open questions), and (2) optionally, one or more **participant-recorded Conclusions** (interpretations of what current evidence suggests, evidence-anchored, revisionable, explicitly non-authoritative).The underlying question remains open ifthe evidence state says so."

| Dimension | Rating / Note |
|---|---|---|
| Philosophical alignment | STRONG — evidence-led (C), narrative conclusion (D), no forced closure (E), no winner (A), no truth claim — satisfies all held values simultaneously |
| Epistemic safety | STRONG — deterministic posture + optional, labeled, revisable interpretations; dual-axis (§6.1) preserved |
| User comprehension | GOOD-MIXED — SoU validated; conclusion frame natural; requires clear visual separation ("Evidence State" vs "Participant Conclusion") to avoid authority confusion (§9) |
| Usefulness | STRONG — answers both "what does evidence show?" and "what did participants take away?" |
| Uncertainty preservation | STRONG — contested/unresolved/open questions remain first-class; conclusion can explicitly hold open questions |
| Evidence relationship | STRONG — posture computed from evidence; conclusions required to anchor to claims/evidence |
| Authority risk | LOW-MEDIUM — no role-based authority; conclusions are contributions with acknowledgment semantics (§11); if implemented carelessly could re-create authority — mitigate by labeling/co-authorship |
| Moderation implications | MEDIUM — same as D (re-anchor/quarantine on hidden anchors) plus conduct-moderation of interpretation text (never truth-moderation) |
| Discussion compatibility | GOOD — discussions keep SoU (already there); optional interpretations can later extend (PROPOSED/FUTURE, §17) |
| Debate compatibility | STRONG — debates gain both evidence posture and conclusion narrative; matches "structured argument toward a conclusion" |
| Migration difficulty | MEDIUM-HIGH — replace winner resolution with concluded-state + conclusion records; migrate legacy (§16) |
| DB complexity | MEDIUM — proposal: `concluded_at`/conclusion artifacts + anchors (design in §20; optional versioning) |
| UI complexity | MEDIUM — replace `DebateResolution` with "Current Understanding" panel; add SoU to debate overview |
| Reputation impact | POSITIVE — remove won/lost; optionally descriptive participation/inquiry/evidence events (§15) |
| Risk read as truth | LOW-MEDIUM — labels "Current", "State of", "Participant Conclusion" + fallibilist footnotes keep truth-read low; audit gate: "Conclusion ≠ Truth" must appear in UI text |
| Risk recreating winner dynamics | LOW — no per-side win totals, no verdict language, no winner state; per-claim posture presentation (§19) |
| **Verdict** | **RECOMMEND — adopt F: evidence-state backbone (C) + optional participant conclusions (D with safeguards), non-forced closure (E), process-only "Concluded" status; winner model retired** |

**Model comparison summary:** A and B fail philosophically; E alone loses debate identity; C alone lacks narrative and debate framing; D alone risks authority/truth-read; **F composes C+D+E into a model that satisfies every audited MD constraint and the phase's dual-axis requirement (§6.1).** Selection rationale is philosophical, not technical — F is *not* the easiest (migration/UI moderate), but it is the only model that preserves debate identity without recreating winner dynamics; ease was explicitly ruled out as a tiebreaker by this phase's brief.



---

## 8. CRITICALLY CHALLENGE "CONCLUSION + EVIDENCE"

Model D/F introduces a human-authored conclusion. This section stress-tests whether it accidentally becomes an authority mechanism.

###8.1 RISK: conclusion becomes "unofficial truth"

**Risk is real.** A conclusion rendered prominently, authored by one user (especially the room creator), reads as *the* takeaway. Mitigations that must bebaked into the design (product decisions §22):

- **Framing:** Every conclusion is displayed under an explicit header: **"Participant Conclusion (Current Interpretation)"** with a persistent footnote: *"A human interpretation of current evidence — not a statement of truth. New evidence can change it."*
- **Separation:** The **State of Understanding** (deterministic, evidence-led) is always visually primary; conclusions are secondary, clearly authored, never merged into the SoU.
- **Acknowledgment semantics:** A conclusion does not become "accepted" by creator fiat. It is either (a) **acknowledged** by participants of opposing/neutral stances (parity, not majority — §11), or (b) marked **"contested"** when a participant records disagreement with it. A lone author's conclusion is displayed as *"single-participant conclusion"* — diminished, not elevated. Done right, this inverts the current creator-authority problem (today creator alone declares;tomorrow creator alone can only *propose*, and the room's state marks whether others engaged).

###8.2 RISK: creator authority is reimported through the back door

If creation privileges (who can record a formal conclusion) mirror room-ownership, then the winner model's authority chain returns unchanged (creator declares; everyone lives with it). **Recommendation (§11):** any engaged participant may *propose* conclusions; no one may unilaterally *finalize*; "closing the phase" additionally requires either (a) acknowledgment by at least one participant not currently on the author's side/ (b) explicit presence of at least two sides' contributions and a "conclude phase" action that any still-active participant can veto/contest for reopening. Creator keeps **no** special epistemic authority — only conduct/lifecycle powers (archive, moderation-facing actions.





###8.3 RISK: evidence-state taxonomy hardens into a truth scale

**Risk is real.** If users/UX treat `supported` as `true`, `contested` as `half-true`, `mixed` as `partly true`, `insufficient` as `probably false`, `unresolved` as `unknown-but-suspect`, then the evidence-state taxonomy becomes a covert truth-likelihood meter — exactly the binary truth signaling that PHASE_6B flagged (P1-UX-003) and PHASE_4A forbade.



**Current implementation already mitigates correctly:** SoU categories are **per-claim** evidence*posture* labels (*"Supported by Current Evidence"*, *"Contested / Mixed Evidence"*, *"Unresolved Front"*) with footnotes that localize fallibility (*"without active contradiction"*, *"awaiting empirical citations"*); PHASE_4B validated users correctly read "Supported" as *not proven*. **The mitigation must be preserved, not weakened:** taxonomy values are statements about *the evidence*, never about *the world*. Any future serialization (e.g., DB keys `supported|contested|unresolved`) must remain internal keys with display strings that always qualify ("…by current evidence"). If a debate-side export ever renders "Supported Side", that would re-import scoreboard semantics (§19: never per-side wintotals).

###8.4 VERDICT on Model D

Model D alone must **not** be adopted naively. Adopted **with safeguards** as the optional human layer inside Model F, its risks are real but containable by: explicit fallibilist labeling, SoU-first visual hierarchy, participant-proposal+acknowledgment semantics (never creator-finalize),and taxonomy display discipline(§8.3). **These safeguards are hard requirements, not UX niceties** — they are what keep the "conclusion" from becoming the "winner" in new clothes.



---

## 9. STATE OF UNDERSTANDING VS CONCLUSION

This is a major unresolved design question: does Discora need **both** a State of Understanding (deterministic, evidence-led)and a human-authored Conclusion? Evaluate honestly:

| Criterion | SoU + Conclusion (both) | SoU only | Conclusion only |
|---|---|---|---|
| Duplication | MIXED — they cover different questions ("what does evidence show?" vs "what did participants take away?"), but must be visually separated to avoid redundancy | NONE | LOW |
| Contradiction | MEDIUM — conclusion can diverge from evidence posture; divergence must be *surfaced* ("conclusion says X; evidence state shows Y"), not hidden | NONE | HIGH — a lone conclusion with no evidence posture can freely contradict evidence |
| Authority confusion | MEDIUM — mitigated by labels/visual hierarchy (§8.1) | LOW | HIGH — conclusion alone reads as official |
| User confusion | MEDIUM — needs clear naming; PHASE_4B shows SoU labels already understood | LOW | MEDIUM |
| Maintenance cost | MEDIUM — two surfaces to keep coherent | LOW | MEDIUM |
| Epistemic clarity | GOOD — dual axes match §6.1 (process/interpretation vs evidence posture) | GOOD — single epistemic axis | POOR — single human axis masquerading as evidence |
| Satisfies "help people reach stronger conclusions" | YES | PARTIAL (implicit conclusion drawn by reader) | YES (but unsafe alone) |

###9.1 OPTIONS

| Option | Description | Assessment |
|---|---|---|
| **OPTION 1 — State of Understanding only** | SoU is the only "conclusion-like" surface; no human conclusion records | Clean, evidence-pure, lowest authority risk. **Weakness:** debate loses the "we concluded" narrative and the *deliberate* stopping point; "stronger conclusions" are never articulated by participants — the platform becomes a dashboard, not a conclusion-build. **Rating: viable, not recommended for debates as primary alone** |
| **OPTION 2 — Human conclusion only** | Conclusion replaces SoU entirely | Reintroduces authority/truth risks without a deterministic counterweight; tokens the evidence posture off stage. **Rating: NOT RECOMMENDED** |
| **OPTION 3 — State of Understanding + optional human interpretation** | SoU stays the deterministic evidence backbone; conclusions are optional participant-recorded *interpretations*, clearly authored, secondary visual weight, revisionable, never merged (recommended in §8) | Satisfies all axes with minimal machinery; debate identity preserved; SoU validated. **Rating: RECOMMENDED** |
| **OPTION 4 — State of Understanding + formal conclusion** | Both + a formal lifecycle (draft/proposed/accepted/superseded) with acceptance semantics — the CONSENSUS_SYSTEM.md sketch, Phase 2 consensus-engine goal | Heavier; adds acceptance/quorum machinery; closest to the roadmap's future Consensus System; likely premature for current phase. **Rating: PROPOSED-FUTURE — adopt later as consensus evolution; do not build now** |

###9.2 RECOMMENDATION

> **Adopt OPTION 3 now:** State of Understanding remains the independent, deterministic, evidence-led backbone (as today for discussions; extend to debates soon), et optional **Participant Conclusions**(interpretations) are stored/displayed as separate, clearly-authored, revisionable contributions — never as the room's verdict. **OPTION 4 (formal acceptance lifecycle) is the natural Phase-2 descendant (Consensus System — feature registry Phase 2; CONSENSUS_SYSTEM.md design-only sketch) and must be gated behind product approval when its time comes. Neither component is mandatory alone; but in Discora's current state, SoU provides the epistemically safe spine and optional interpretations provide the human narrative — each correcting the other's known failure mode.

**Do NOT allow:** human conclusion > evidence (divergence must be exposed, not enforced), or AI synthesis > human judgment, without explicit product justification (§14).



---

## 10. RESOLUTION SEMANTICS

###10.1 WHAT DOES "RESOLVED / CONCLUDED" MEAN?

Direct answer, recommended semantics for product approval:

> **"A Debate is Concluded when its participants deliberately end the *current phase* of structured examination.** Concluding the phase records what the room currently understands — not what is true.

More concretely, a conclusion/closing may mean any combination of:**

- the examination reached a **meaningful stopping point** (arguments examined, evidence gathered, sides heard)
- the **current understanding was summarized** (via SoU + optional participant conclusions)
- **major disagreements were clarified and mapped** (contested claims identified; open inquiries recorded)
- **important evidence was examined** (evidence posture per claim is part of the SoU)
- **open questions were identified** (state explicitly preserves what remains unknown)
- participants **intentionally concluded the current phase** (a human, deliberate process fact — not an automatic one)

**None of these meanings claim the motion is settled true-or-false.** They are all statements *about the examination*, which is exactly the axis separation §6.1 demands.

###10.2 WHAT DOES "THE UNDERLYING QUESTION REMAINS UNRESOLVED" MEAN?

> An underlying question is **unresolved** when the evidence state provides no decisive posture (contested, mixed, or unresolved claims dominate), unanswered open questions remain, or participants have not reached an interpretation they can jointly acknowledge.



###10.3 BOTH MUST BE ALLOWED TOGETHER

The final model **must** allow:

```text
Debate process: Concluded (phase ended deliberately)
Underlying question: Unresolved (evidence split / open questions remain)
```

and equally:

```text
Debate process: Concluded
Underlying question: Leaning-strongly-one-way per current evidence (but still fallible; e.g., SoU posture "supported by current evidence" + participant conclusion recording that leaning)
```

and:

```text
Debate process: Active (no one concluded the phase)
Underlying question: Well-supported per current evidence (SoU shows it; process simply ongoing)
```

**The winner model cannot express any of these honestly** — it forces exactly one bit (side-A-won / side-B-won / draw), which is a statement about the contest outcome, neither about the evidence posture nor about the process state. This is why "resolved" as a word must be retired from the product vocabulary in favor of presentation that separates *process state* ("Concluded/Active/Archived") from *evidence posture* (SoU) from *interpretations* (conclusions) — three axes, three surfaces, never one bit. 

**Label recommendation (§19):** product/UI uses **"Concluded (current understanding)"** (debate process), not "Resolved". The DB/API may retain an internal `status` value such as `concluded` (NEW/PROPOSED) alongside `active|closed|archived` semantics — exact migration mapping is an implementation-phase detail (future phase; §20 scope). The *word* "resolved", if kept internally, must never appear invisible UI copy as a truth claim.



---

## 11. AUTHORITY

Question: who should be able to record a conclusion/resolution?

###11.1 AUDIT OF CANDIDATES

| Candidate | Assessment |
|---|---|
| **Creator** | ❌ **REJECT as epistemic authority.** Creating a room does not grant epistemic authority(06: metrics ≠ authority;02: no artificial authority). Today's creator-declared winner is precisely the flawed mechanic (§5). Creator keeps **lifecycle/conduct** powers only (archiving, moderation-facing actions, inviting/closing administration) — never "what is true"-type powers. |
| **Participant (single)** | ✅ **PROPOSE** — any engaged participant may *propose* a participant conclusion;it is recorded *as an interpretation*, with author attribution, never as final. |
| **Multiple participants / co-authorship** | ✅ **RECOMMEND for "room conclusion" standing** — for a conclusion to be marked as more than single-participant, parity-based acknowledgment is required (§11.2). |
| **Moderator** | ✅ **Conduct-only authority** — moderators may remove/quarantine conclusions for conduct violations (harassment, bad-faith anchors)and re-anchor conclusions on hidden evidence; they must **never** adjudicate proposition truth (mirrors moderation philosophy: humans review behavior, not correctness .). |
| **Community / majority vote** | ❌ **REJECT as default.** Consensus ≠ majority rule(02). Voting could *record* acknowledgments/objections (descriptive stance signals) but must never *decide* truth or *elect* the conclusion. |
| **AI** | ❌ **REJECT as authority.** AI may organize/summarize/surface (per 10 and §18), never become final truth authority. |
| **Automatic system** | ❌ **REJECT as authority.** The system computes the evidence posture(SoU) deterministically — that's data, not verdict; no automatic conclusion generation. |

###11.2 RECOMMENDED AUTHORITY MODEL (PROPOSED — REQUIRES PRODUCT OWNER APPROVAL)

1. **Propose:** any participant (incl. inquiry/neutral stance) may record **Participant Conclusion** — an authored, evidence-anchored interpretation (§8.1 framing). Stored with `author_id`, `created_at`, `version`.
2. **Acknowledge (parity, not majority):** a conclusion becomes **"acknowledged"** when at least **one participant whose current stance is not the author's stance** (opposition, or neutral/inquiry) explicitly acknowledges it — the minimum multi-perspective check that "both sides can support" (consensus semantics, 02)(. No quorum, no vote-count thresholds. If no opposing/neutral acknowledgment exists, the conclusion is labeled **"single-participant conclusion"** — visible, diminished, still recorded.
3. **Contest:** any participant may mark a conclusion **"contested"** (with optional reason); a contested conclusion remains visible but flagged; neither side "wins". A contested "room conclusion" cannot claim consensus-like standing.
4. **Creator/Moderator:** lifecycle/conduct only (§11.1).
5. **Non-goal:** conclusions never determine whether the motion is true; they document interpretations of current evidence**(explicitly fallible)..



**Why co-authorship (and not creator-only):** the philosophy's "stronger conclusions" are *tested by challenge* and *shared understanding* — single-author fiat defeats both; creator-only would merely re-import the winner model. Parity acknowledgment specifically avoids majority-rule (2 participants ≠ popularity contest; it only proves the conclusion survived cross-perspective scrutiny(.


**Why not majority voting:** voting rewards popularity — the exact anti-pattern Discora rejects (00: "popularity ≠ correctness";02: consensus ≠ majority (.

**Creator-room-conclusion equivalence is explicitly rejected.** Creating a room is an organizational act; epistemically it conveys zero privilege over truth.



---

## 12. REVISION / REOPENING

###12.1 EXISTING (current implementation)

| Item | Current state (verified) |
|---|---|
| Revision | ❌ None — resolution is one-shot; UI copy says "This action is irreversible." |
| Version history | ❌ None — single jsonb blob; no history |
| New evidence after resolution | ❌ No path — debates in `resolved`+rooms `inactive`; no reopen flow |
| Reopening | ❌ None — no "reopen" RPC/trigger/UI |
| Closure | ⚠️ Partial — `debates.status='closed'` exists (display "Debate Closed")and room archiving exists via lifecycle; no product-defined closure semantics |
| Superseding | ❌ None |
| Participant challenge | ❌ None — participants cannot contest a resolution |
| Moderator intervention | ⚠️ Partial — moderation exists for content (claims/evidence/messages/questions); **not** for resolutions/conclusions |

###12.2 PROPOSED (design direction for Model F)

| Item | Proposed direction | Status |
|---|---|---|
| Revision | Conclusions are **versioned** (`version` int; superseded conclusions remain visible in a history view; latest is "current"). A conclusion is **always replaceable by a newer interpretation** (never "irreversible"). | PROPOSED |
| Version history | `conclusion_history`-style record (cf. CONSENSUS_SYSTEM.md sketch): audited trail of statement, author, anchors, timestamps | PROPOSED |
| New evidence | New evidence/claims **re-derive the SoU instantly** (deterministic — automatic). A **Concluded** debate may be **Reopened** when meaningful new evidence or an open question reframing arrives. | PROPOSED |
| Reopening | `active` ↔ `concluded` transitions allowed; any engaged participant may request reopening; acknowledgment-style rule (parity: at least one participant on an opposing stance or a moderator) reopens — or moderator initiates for conduct/evidence integrity. Logo copy: "Reopened — new evidence/interpretation to examine." | PROPOSED — **NEW PRODUCT DECISION REQUIRED** (who may reopen, cooldowns, notifications) |
| Closure | `concluded` (deliberate process close,, optional conclusion record) vs `closed` (moderator/admin conduct close) vs archived (lifecycle; read-only) — three distinct, explicitly labeled states. | PROPOSED — **NEW PRODUCT DECISION REQUIRED** |
| Superseding | A newer conclusion **supersedes** a prior version (both remain in history); supersession is never "correction-as-punishment" — it is the *expected* evolution (fallibilism). | PROPOSED |
| Participant challenge | **Contest** flag on a conclusion (§11.2.3) — visible, non-destructive; contested conclusions cannot receive "acknowledged" standing until flags are resolved by further acknowledgment/new version. | PROPOSED |
| Moderator intervention | Moderators may **quarantine/re-anchor** conclusions whose anchors are hidden (moderation cascade), and **remove** conclusions engaging in conduct violations — never enforce truth. Topic-level moderation of evidence posture is impossible by design (deterministic computation. | PROPOSED |

###12.3 AUTOMATIC THRESHOLDS

**Do NOT invent automatic thresholds** (reopen-after-X-days, auto-archive-after-Y, quorum counts, auto-supersede) unless justified by existing product documentation. None of the audited MDs justify any automatic threshold for conclusions/resolutions/reopenings. Therefore defaults are: **no automatic thresholds**. All transitions are *human-deliberate* (with deterministic consequences where computation applies, e.g., SoU re-derivation (cf. 03 flows — all user-initiated; 08 roadmap — no automation). If future phases want auto-archive/lifecycle automation, that is a NEW PRODUCT DECISION REQUIRED with its own justification.



---

## 13. EVIDENCE RELATIONSHIP

###13.1 WHAT SHOULD CONCLUSIONS/RESOLUTIONS REFERENCE?

| Anchor type | Mandatory / Optional | Rationale |
|---|---|---|---|
| **Claims** | MANDATORY (at least one) | A conclusion that references nothing is a floating opinion; claims ground it in the room's actual assertions. If truly no claims were examined (degenerate debate), the conclusion must explicitly state "no claims were examined; this records only the process outcome". |
| **Evidence** | MANDATORY-when-available / OPTIONAL-when-none-exists | Conclusions should anchor to the evidence behind each referenced claim (evidence direction included. If a claim has zero evidence, the conclusion must mark it as "unfounded per current evidence" — never quietly treat it as supported. |
| **Sources** | OPTIONAL (via evidence) | Source pipeline (23: Source→Evidence→Claim) already carries sources; conclusions inherit them through evidence anchors, no separate anchor type needed |
| **Questions** | OPTIONAL | A conclusion may list the open questions it deliberately leaves unanswered(fallibilist postscript) |
| **Structured inquiries** | OPTIONAL | Satisfied/unsatisfied inquiries attached to anchored claims provide evidence-state provenance; surfacing unresolved inquiries near conclusions strengthens honesty |

###13.2 EVIDENCE-QUALITY RULES

- **Never** use vote count, popularity, participant count, or engagement metrics as evidence quality. These are stance/diagnostic signals at most and are already excluded from the SoU taxonomy's truth semantics (§8.3).
- **No automated truth score.** The SoU posture is computed (deterministic evidence direction + sample thresholds) — that is a *posture*, not a truth score; it must never be fed by AI sentiment, popularity, or engagement signals.

- **Anchors must be live.** If anchored evidence/claims become moderated-hidden or retracted, the conclusion must (a) re-anchor, (b) explicitly degrade ("anchored to evidence since hidden"), or (c) be quarantined — per moderation cascade principles (04: moderation; 12.2 moderator intervention). No orphan conclusions that silently outlive their evidence.

- **AI may assist organization/synthesis** (summarize evidence clusters, draft anchor lists)but **must not** become final authority (§18). AI-drafted conclusions, if ever shipped, must be disclosed and require human adoption — **FUTURE; NEW PRODUCT DECISION REQUIRED**.



---

## 14. STATE OF UNDERSTANDING (FUTURE ROLE)

###14.1 RELATIONSHIP OPTIONS (what SoU should do, given Model F)

| Option | Description | Recommendation |
|---|---|---|
| Remain independent | SoU stays computed purely from claims/evidence/questions/relations/inquiries — today's contract. | ✅ **RECOMMENDED — Stay.** Independence is what makes it a deterministic *control surface* against which human interpretations can be checked. |
| Consume resolution data | SoU includes/reads old winner resolution. | ❌ NOT RECOMMENDED — would inhale winner semantics into the evidence state. |
| Consume human conclusion data | SoU displays/interprets participant conclusions. | ⚠️ NO — keep the *computation* pure;the *presentation layer* may display conclusions beside, never above, the SoU (§8.1 separation). |
| Remain purely evidence-led | Yes — core invariant | ✅ REQUIRED (see also PHASE_4A constraints: never "supported = true"; never popularity-as-truth; no "winning/losing side" language) |
| Expose divergence from a human conclusion | SoU panel may render a **divergence notice**: "Room conclusion says X, but current evidence posture shows Y" — surfacing, not adjudicating. | ✅ **RECOMMENDED** — this is the epistemically honest way to hold human conclusions accountable to evidence — without ever letting AI/system *judge* them;the divergence is a computed fact, the resolution is human. |
| Replace formal resolution | SoU alone replaces conclusion mechanism. | ⚠️ PARTIAL — SoU is the backbone (§9.2 OPTION 3), but the human narrative stays optional/separate; SoU does not *replace* conclusions one-to-one. |

###14.2 HIERARCHY HARD RULE

> **Do NOT allow:** `human conclusion > evidence` or `AI synthesis > human judgment` without explicit product justification.



In practice: a participant conclusion may *interpret* evidence any way its author wishes (freedom of thought), but the UI must always juxtapose the computed evidence posture so readers can independently weigh both. Divergence visibility, not suppression, is the Discora way(00: expose competing perspectives; transparency principle: users should understand why and how consensus was formed).



---

## 15. REPUTATION

###15.1 SEPARATE THE THREE LEVELS

| Level | What it is | Status |
|---|---|---|
| **a. Current implementation** | `DEBATE_WON +25` / `DEBATE_LOST −5` events (trigger-written, authoritative DB ledger); `debateWins`/`debateLosses` computed in `getUserContributions`; factors "Debates Won"(+25)and "Debates Lost"(−5) rendered by profile `ReputationBreakdown`; plus `DEBATE_CREATED +15`,`DEBATE_JOINED +5`; client `computeReputation` mirrors weights only for display. | Code-verified (§4) |
| **b. Philosophically misaligned behavior** | Rewards winning persuasion rather than contribution-to-understanding; penalizes being on a losing side; converts debate outcome into an authority signal; encourages gaming (side choice optimized for winnability, not evidence). TRUTH_SEEKING_REPUTATION_REVIEW marks both BAD/HARMFUL. | Audit verdict |
| **c. Future options** | Options below (15.2). | PROPOSED — each requires product owner approval |

###15.2 FUTURE OPTIONS (debate reputation)

| Option | Description | Recommendation |
|---|---|---|
| Remove winner/loss reputation | Stop creating `DEBATE_WON`/`DEBATE_LOST` events for any new conclusion/concluded debates; retire the trigger branch; remove factor presentation. | ✅ **RECOMMENDED (in combination with preserving participation events)** |
| Preserve historical events | Existing ledger rows stay untouched (they document what happened under the old model). | ✅ **RECOMMENDED — audite-trace, not public truth claims** |
| Recalculate reputation | After removal, recompute scores so past wins/losses stop counting (scores drop for affected users). | ⚠️ OPTIONAL — **NEW PRODUCT DECISION REQUIRED**; affects existing users; at beta scale, leaning *recommended* to avoid permanent "winner bonus" pollution; deferred until production migration planning |
| Leave historical totals | Keep past events counting (old scores persist as-is; decay as new events dilute them). | ⚠️ FALLBACK — simpler, but leaves a permanent winner advantage embedded in reputation — philosophically inconsistent long-term |
| Make debate reputation descriptive | Replace event-based win/loss with descriptive, non-awarded debate metrics (e.g., debates participated, evidence contributed per debate, side-switch count) that never alter score. | ✅ **RECOMMENDED** — aligns 06 ("descriptive metrics only"): participate → visible record; no score delta |
| Remove debate-specific reputation entirely | Drop `DEBATE_CREATED/DEBATE_JOINED` too; debates contribute nothing to reputation. | ❌ NOT RECOMMENDED — participation/creation are legitimate descriptive contributions; removing them makes debate invisible in reputation and reduces incentive to structure disagreement. |

###15.3 RECOMMENDED REPUTATION DIRECTION (PROPOSED)

1. **Stop emitting `DEBATE_WON` / `DEBATE_LOST`** for any conclude-path (win/loss semantics retired with the winner model). Existing rows: preserved as history (§16).
2. **Keep participation/create events** (`DEBATE_JOINED +5`, `DEBATE_CREATED +15`) as descriptive contribution signals — unchanged values acceptable.
3. **Replace factor rows** "Debates Won"/"Debates Lost" with honest descriptive rows (e.g., "Debates Participated", "Debates Created"; factors already cover created/joined; drop won/lost rows from `computeReputation`).
4. **Surface truth-seeking signals** (from TRUTH_SEEKING_REPUTATION_REVIEW) — `SIDE_SWITCHED +15`, `EVIDENCE_SELF_CONTRADICTED +20`, `OPPOSING_ACKNOWLEDGED +25`, claim-correction events — as the reputation system's *epistemic* core. 
5. **Do NOT invent replacement gamification** (no win badges, no streak bonuses, no leaderboards of debate outcomes;02 anti-gamification;DISCORA_PRODUCT_PHILOSOPHY "never build leaderboard for debate wins").
6. Any change to event emission, weights, or recalculation semantics = **NEW PRODUCT DECISION REQUIRED** (not silently bundled).

###15.4 CONCRETE AUDIT FINDINGS TO REMEDIATE (implementation-level, future phase)

- `reputation-utils.ts` DEFAULT_OPTIONS still hardcodes `debateWonWeight: 25` and `debateLostPenalty: 5`; `computeReputation` emits "Debates Won"/"Debates Lost" factor rows → profile breakdown surface.
- `202606100004` trigger `handle_debate_resolve` writes WON/LOST events on transition-to-resolved;the hardening migration `202606190001` locked down direct access — events are trigger-only; removing the trigger branch is the clean lever(.
- `getUserContributions` win/loss computation can be deleted alongside resolution retirement (its only purpose is win/loss factors..
- Historical docs (`ROADMAP_RECOMMENDATION.md`, `REPUTATION_AUDIT.md`, `TRUTH_SEEKING_REPUTATION_REVIEW.md`, `TRIGGER_AUDIT.md`) all converge on: remove loss penalty, remove win reward, reward participation/truth-seeking instead.



---

## 16. HISTORICAL DATA

###16.1 CURRENT RECORDS

Existing resolved debates contain (verified schema and RPC:

```json
{
 "winner": "proposition" | "opposition" | "draw",
 "summary": "…",
 "resolvedBy": "<uuid>"
}
```

`debates.status='resolved'`, `rooms.status='inactive'`, and (if participants existed at resolution time) `reputation_events` rows with `DEBATE_WON (+25) / DEBATE_LOST (−5)`.

 `getUserContributions` also derives per-user win/loss counts from these rows.



###16.2 OPTIONS

| Option | Description | Recommendation |
|---|---|---|
| Preserve | Keep columns/rows as-is, read-only, forever. | ✅ **RECOMMENDED — preserve as legacy** |
| Legacy | Mark old resolutions as legacy model artifacts (e.g., internal flag/label "legacy winner-based resolution"), excluded from all conclusion/SoU logic. | ✅ **RECOMMENDED** |
| Migrate | Convert old resolutions into new "conclusions" (per CONSENSUS_SYSTEM.md sketch: winner→sides_supporting, summary→statement, etc.). | ❌ **NOT RECOMMENDED as automatic** — mapping winner to "supported side" claims an evidential status the winner data does not contain (§16.4). |
| Archive | Move old data toa history-only table/view (removed from active surfaces). | ⚠️ OPTIONAL — implementation preference; visual/query isolation without destructive migration. |
| Reinterpret | Reanimate old resolutions under new semantics (conclusions). | ❌ NOT RECOMMENDED — changes history retroactively; violates audit-trace discipline. |
| Leave untouched | No schema/migration action; old rows simply never feed new logic (new logic reads `conclusion*` columns only; `resolution` treated as deprecated/null-equivalent in new read paths)—the *display* layer decides what old debates show. | ✅ **RECOMMENDED as the practical default** (paired with "Legacy" labeling) |

###16.3 RECOMMENDED (PROPOSED

- `resolution` (and its `winner` key) is **preserved as immutable legacy data** — read-only, labeled "Legacy resolution (winner-based model)" where surfaced.
- New conclusion artifacts start **empty** for legacy debates; a legacy debate may optionally receive a *new participant conclusion* via the normal flow (new evidence/retrospective interpretation), never an auto-conversion.

- `debates.status`: legacy `resolved` may map presentationally to "Concluded (legacy)" in new UI, without rewriting data. Exact migration (rename, split of `concluded vs closed vs archived`) belongs to an implementation-phase plan (future phase; §20 scope), gated by product approval. 
- Reputation: existing `DEBATE_WON/LOST` rows remain in the ledger (documentation of the old model; §15.2("preserve historical events")). Whether they *continue to count* toward scores is the §15.2 recalculation decision (separate NEW PRODUCT DECISION REQUIRED).

###16.4 DO NOT CONVERT WINNER → SUPPORTED

Explicit prohibition in line with the phase brief:

> **A winner declaration is not evidence.**

Mapping `proposition winner → "supported"` or `opposition winner → "supported"` (as CONSENSUS_SYSTEM.md §9 sketch does) would fabricate an evidential posture from a rhetorical verdict. The old data says "the creator declared side X the winner" — not "the evidence supports X". If historical data cannot be semantically mapped, **say so**: it cannot be mapped to evidence posture; it can only be mapped to a **historical event record** ("creator declared winner-side X on date D"). Representations of legacy debates must use the historical-event framing (e.g., "Closed under winner-based model; winner recorded: Proposition"), never the evidence-state framing. If product owners ever *want* retrospective reinterpretation by humans, that is a manual, curatorial, per-debate FUTURE activity — not a migration transform.



---

## 17. DISCUSSION VS DEBATE

Preserve the two product identities:

```text
DISCUSSION "Let's understand this together."
 → conversation-first; no sides; no verdicts; SoU = its epistemic summary surface;
 → formal conclusion: NOT built now (optional interpretations = PROPOSED-FUTURE, gated by product approval; must never become competitive framing).

DEBATE  "Let's examine competing positions rigorously."
 → sides + structured claims/evidence/inquiries; SoU (to be extended to debates) = evidence posture;
 → optional participant conclusions + process "Concluded" = its conclusion mechanism (Model F).
```

| Decision | Recommendation | Status |
|---|---|---|---|
| Formal resolution/conclusion: Debate-only? | **DEBATE-ONLY for now.** Discussions remain conversation-first; their "conclusion-like" surface is the SoU (already implemented), with no winner/no verdict/no process-close required. | PROPOSED |
| Shared (both room types)? | Future possibility via the Consensus-System roadmap (Phase 2 — 02 registry, 08 roadmap); discussions could someday host optional "interpretations" — but **without** sides, scorecards, or competitive dynamics. | PROPOSED-FUTURE (**NEW PRODUCT DECISION REQUIRED** when launched) |
| Optional? | Conclusion recording is **optional** — a debate may be Concluded with SoU only; never forced to produce a human conclusion (Model E default). | PROPOSED |
| Future Discussion capability? | The Consent/Consensus engine (registry Phase 2) is the sanctioned vehicle; do not bolt a "discussion resolution" onto discussions prematurely. | FUTURE |

**Guardrail:** **Do NOT accidentally make Discussion competitive** — no sides, no winner, no scorecard, no conclusion-authority was ever designed for discussions in any MD (01 discussion definition, 03 flows, 06 design system all show conversation-first discussion rooms; "no winner" language even appears in homepage copy("Open-exploration conversations with many viewpoints and no winner"). **A discussion "conclusion" must never become "who's right".** If discussions later gain interpretations, they inherit the full Model F safeguards (labels, anchors, acknowledgment semantics, divergence exposure) — never a lite version missing them.





---

## 18. AI BOUNDARY

###18.1 ALLOWED (assist — never decide

| AI may | Examples |
|---|---|---|
| Organize | Cluster evidence, group related claims, structure anchor suggestions |
| Summarize | Summarize the evidence posture per claim (draft wording for SoU labels/data — deterministic user-visible language remains human-approved templates) |
| Surface evidence | Point to contradicting/supporting evidence, source diversity, missing citations (per PHASE_4A "what Discora CAN truthfully say" list) |
| Identify contradictions | Flag claims whose attached evidence directions conflict (contested state derivation is deterministic; AI may *draft explanations* to display) |
| Extract questions | Suggest open questions from claims/evidence/inquiries (human must confirm before persisting) |
| Assist synthesis | Draft a *proposed participant conclusion* text for a human to adopt/edit — with explicit disclosure (e.g., "AI-drafted — review before posting"), respecting 05/10 architecture (AI service layer; AI never interacts directly with UI authority) |

###18.2 FORBIDDEN (never

| AI must NOT | Why |
|---|---|
| Declare truth | 10 ("AI must never declare truth"); central mission |
| Determine winner | Winner model retired; even rhetorically, AI must not even *suggest* a winning side |
| Determine correctness | Reputation ≠ correctness; 23 |
| Force consensus | 02: consensus must never be forced |
| Become final authority | 10 humans make final decisions; 02 evaluation rule: "does not create artificial authority" |
| Auto-record conclusions without human | Results in AI-as-authority by default; violates transparency and human decision-making (05: humans decide;10: AI flags/suggests only) |

###18.3 FUTURE-GATED

- **AI-assisted conclusions** (draft+human-adopt, disclosed): **PROPOSED-FUTURE — NEW PRODUCT DECISION REQUIRED**. If approved, disclosure labeling (10: "AI-assisted organization only";0 transparency rules) and human adoption are mandatory; AI never auto-publishes conclusions, never auto-finalizes status.

- **SoU narrative drafts**: allowed (draft only).** SoU *computation* must remain deterministic and explainable (PHASE_4A); no ML inside the taxonomy thresholds; any machine-learned posture would break auditability and trust.



---

## 19. UX DIRECTION — DESIGN ONLY

**No UI implemented here.** This section evaluates conceptual labels and mental models so future UX communicates the approved semantics (§10), never "choose which side won".

###19.1 LABEL EVALUATION

| Candidate label | Mental model created | Assessment |
|---|---|---|
| "Resolve Debate" | Judge signs a verdict; ends the matter. | ❌ REJECT — inherits adjudication/truth-read; "irreversible" framing |
| "Record Conclusion" | The room now has *the* conclusion (capital-C). | ⚠️ PARTIAL — okay for a *participant* action if labeled authored; risky as *room status* language |
| "Record Current Understanding" | Temporal, fallibilist: "this is where we stand now". | ✅ GOOD — matches SoU + conclusion semantics; good primary framing |
| "Add Conclusion" | A contribution among others (like "Add Claim"), not a verdict. | ✅ GOOD — excellent *verb* for participant proposal (per §11 proposal semantics) |
| "Summarize Examination" | Process narrative: "here is what this examination found/leaves open". | ✅ GOOD — best *status/process* framing ("examination concluded; current understanding summarized") |
| "Concluded (current understanding)" | A deliberate stopping point, explicitly provisional. | ✅ **RECOMMENDED as the status label** (replaces "Resolved") |
| "Current Conclusion" | A live, revisable takeaway. | ✅ GOOD — matches DISCORA_PRODUCT_PHILOSOPHY "current conclusion"; use with "Participant"/"Current" prefixes |
| "Winner / Won / Lost / Draw" | Contest verdicts. | ❌ REJECT ALL — retired vocabulary (incl. factor names "Debates Won/Lost"; §15.3) |

**Recommended label set (PROPOSED):**

- Room/process state: **"Concluded — current understanding recorded"** (with optional sub-status "Legacy" for winner-era debates; "Closed by moderator"/"Archived" for conduct/lifecycle).
- Evidence surface: **"State of Understanding"** (existing; extend to debates unchanged).
- Human surface: **"Participant Conclusion"** / **"Current Conclusion"** (authored card; version badge e.g., "v2"; standing chips: "Acknowledged", "Contested", "Single-participant").
- Primary action (participant): **"Add Conclusion"** (wording: "Record your current interpretation of the evidence — this is not a truth statement.")
- Process action: **"Conclude current phase"** (confirm dialog wording: "Records the room's current understanding and marks this examination phase complete. The underlying question may remain open; the debate can reopen with new evidence.").
- Reopen action: **"Reopen for new evidence"**.

###19.2 UX PRINCIPLES (new mental model

1. **State before verdict:** SoU is always the first/highest epistemic surface; conclusions render below/beside it, never above.
2. **Every standing claim labeled provisional:** persistent microcopy — "…by current evidence"; "New evidence can change this".
3. **No per-side win totals anywhere**: scorecard replaced by argument/evidence mapping (per PHASE_6B P1-UX-001: claim counts + cited sources per side, never net scores); no "supported side" export (§8.3).
4. **Divergence surfacing:** ifa conclusion contradicts the computed posture, render a neutral notice (§14.1.

5. **Author always visible** on conclusions; version history reachable; standing chips transparent (acknowledged/contested/single-participant).
6. **Auto-threshold-free:** no timers, no quorum bars, no auto-closure UI (per §12.3) — all transitions human-initiated.



---

## 20. SECURITY / ARCHITECTURE

**Design only.** Future impacts if Model F is approved (each item maps to a future implementation phase; no code here).

| Area | Future impact (design direction) |
|---|---|---|
| **Authorization** | Conclusion proposal: any engaged participant (incl. inquiry stance). Acknowledgment/contest: participants with a recorded stance in the room. Reopen: participant request + parity acknowledgment or moderator. Creator: lifecycle/conduct only (§11). No role grants epistemic authority. |
| **RLS** | New conclusion artifacts need RLS mirroring room visibility (public vs private-room member access — reuse `rooms`-scoped visibility patterns from `discussion_claims`/`discussion_evidence` views; private debate rooms: conclusions must obey the same access gating, never leak via public views). Legacy `resolution` column stays read-only (existing policies unchanged until retirement migration). |
| **RPC** | Proposal: replace/extend `resolve_debate` with conclusion-flow RPCs (e.g., `propose_conclusion`, `acknowledge_conclusion`, `contest_conclusion`, `conclude_debate_phase`, `reopen_debate`) — exact names are implementation-phase details; all `security invoker` with RLS-enforced checks (keep the pattern from `resolve_debate`/`switch_debate_side`: validation + atomic state update). |
| **Triggers** | `handle_debate_resolve` (DEBATE_WON/LOST writero) is retired or rewritten: no win/loss events on conclude; optional new descriptive/truth-seeking events per §15 subject to product approval. SoU re-derivation stays client/view-side (deterministic; no trigger needed unless a materialized view/RPC is chosen later). |
| **Audit history** | Conclusion versions + standing changes journaled (author, version, anchors, ack/contest events, timestamps, superseded links); reopen events recorded; cf. knowledge-evolution future: "preserve how understanding changes over time" — 00 future features. |
| **Revision history** | `conclusion_history`-style collection (§12.2); superseded statements retained; UI "version history" reachable. |
| **Status transitions** | `debates.status` gains deliberate transitions:`active ⇄ concluded`(reopen),`closed` (conduct),`archived` (lifecycle; inherited from rooms); legacy `resolved` presentationally maps to Concluded-Legacy (§16.3). Rooms status remains `('open','inactive','archived')` — concluded debates stay readable; contribution-freeze semantics at `concluded` = **NEW PRODUCT DECISION REQUIRED** (default recommendation: new claims/evidence/questions/contributions stop at `concluded`; reopening lifts the freeze; meta-discussion treated as contributions— same freeze unless separately approved). |

| **Private room access** | All new surfaces (conclusion cards, standing chips, version history) must respect private-room member gating identically to claims/evidence (views pattern; DO NOT create a public leak plane). |
| **Evidence anchors** | Conclusion↔claims/evidence/relations FK/reference integrity;anchors that die (retraction/moderation-hide) cascade to quarantine/degrade (§12.2,13.2). |
| **Caching/search** | `discussion_debates` view may expose a *concluded* flag/current-conclusion preview for browse cards (browse tab \"Concluded\"); search indexing of conclusion text requires same visibility gating; avoid n+1 on conclusion anchors (bounded projections). |
| **Notifications** | Reopen requests, conclusion acknowledgements/contests, superseded-version pings, new-evidence-on-concluded-debate pings — all require notification-types decision (**NEW PRODUCT DECISION REQUIRED**; 03 notification types list is MVP-scoped; additions are product-approved). |
| **Concurrency** | Versioning must be atomic (`version = version + 1 WHERE id=…`) to prevent lost updates;ack/contest state transitions serialized per conclusion; reopen race (two simultaneous reopens) guarded by status check-and-set in RPC. |
| **Historical records** | Legacy `resolution` + `DEBATE_WON/LOST` rows preserved immutable; new read paths ignore them (§16); removal/drop only via explicit future migration approved by product owner (never edit applied migrations; create new ones). |

**Architecture posture:** Model F adds *moderate* new persistence (conclusions + anchors + versions + standing journal)and new state transitions, while reusing existing patterns (views, RLS-on-RPC, security invoker validations, deterministic client-side derivation for SoU). The winner model's current blast radius is small (§4.3), so retrofit is tractable with no legacy data destruction.



---

## 21. ORIGINAL MD IMPACT

**No MD modified (no implementation).** The table below identifies which MDs would need updates **after product approval**. `CURRENT MD POSITION` cites verified MD language; `PROPOSED FUTURE POSITION` states what this phase recommends approving.

| MD | Current MD position (verified) | Proposed future position | Why | Impact | Approval |
|---|---|---|---|---|---|
| 00_MASTER_CONTEXT | \"not intended to determine winners/losers\"; north star = understanding, evidence, informed conclusions; future: consensus engine, knowledge evolution | Add explicit section: \"Debate conclusion = examination state, never proposition truth; conclusions are provisional participant interpretations; process resolution ≠ proposition truth\" | Removes theta gap between philosophy and contested implementation semantics | MAJOR | ✅ REQUIRED |
| 01_PRD | Debate room = \"structured examination with disagreement\" (Pro/Con/Neutral); no winner mechanic; no resolution flow defined | Add \"Conclude phase + current understanding\" as a debate flow (optional conclusions; reopen on new evidence) | PRD currently silent; winner flow was implementation-invented; PRD should name the sanctioned conclusion flow | MAJOR | ✅ REQUIRED |
| 02_FEATURE_REGISTRY | Consensus System (Phase 2)= shared understanding, agreements, evidence-supported conclusions; NOT truth/majority/forced | Reaffirm consensus semantics; explicitly rule out winner-based resolution and majority-vote conclusions; mark optional \"participant conclusions\" as Phase 2-adjacent (currently MVP-optional per §9.2 OPTION 3) | Removes room for a consensus feature being rebuilt as voting-on-conclusions | MINOR-MAJOR (terminology clarification) | ✅ REQUIRED |
| 03_USER_FLOWS | No resolution flow whatsoever | Add flows: Conclude Phase, Add Conclusion, Acknowledge/Contest Conclusion, Reopen fro new evidence | MVP flows lackthe entire area; flows must encode the semantics to prevent UX drift | MAJOR | ✅ REQUIRED |
| 04_DATABASE_DESIGN | debates table has no status/resolution; future tables reserved: consensus, open_questions, consensus_history, position_changes, reflection_logs | Document `concluded` status + conclusion/conclusion-history artifacts as Phase-2-adjacent;mark `resolution/winner` legacy columns as deprecated | Schema doc must match sanctioned architecture | MAJOR | ✅ REQUIRED |
| 05_SYSTEM_ARCHITECTURE | Debate lifecycle `Open → Inactive → Open Discussion → Archived`; no \"Resolved\" | Add `Concluded (current understanding)` phase between Open and Inactive/lifecycle, with Reopen edge; AI boundary reaffirmed (assist-only) | Lifecycle must encode process-close ≠ truth-close | MAJOR | ✅ REQUIRED |
| 06_DESIGN_SYSTEM | Profile metrics informational only, no authority/ranking | Add design tokens for Conclusion card, standing chips, SoU-debate variant; forbid trophy/winner iconography; \"Concluded\" banner style (neutral, not emerald/red victory)) | Visual language must not re-import winner semantics | MINOR | ✅ REQUIRED |
| 08_DEVELOPMENT_ROADMAP | Post-MVP Phase 2 = Consensus System;Open Questions | Insert \"Winner-model retirement + conclusion flow + debate SoU\" as a pre-MVP or early-Post-MVP item (implementation-phase planning;this audit gates it) | Roadmap needs the sanctioned sequence (audit → approve → migrate → UI) | MINOR-MAJOR | ✅ REQUIRED |
| 23_KNOWLEDGE_MODEL | Claim = falsifiable; Evidence directions; \"consensus\" as ratio of agreement; deliberately avoids \"conclusion\" entity | Clarify: consensus-ratio (stance signal) ≠ conclusion (interpretation) ≠ truth; add \"Participant Conclusion (interpretation, fallible)\" as a documented entity alongside claims/evidence/consensus | Prevents conflation of three distinct epistemic objects in future schema work | MINOR | ✅ REQUIRED |

**⚠️ MAJOR PRODUCT/MD CONCERN:** the winner model contradicts 00:31 directly and exists in **zero** MDs. Reverting implementation to align with MDs (the sanctioned direction) is therefore a correction, not a feature deviation. Any future phase that reintroduces winner/loser semantics (even renamed) must be treated as a **major MD conflict** and require explicit product-owner override. Root-level design docs (`DISCORA_PRODUCT_PHILOSOPHY.md`, `CONSENSUS_SYSTEM.md`, `TRUTH_SEEKING_REPUTATION_REVIEW.md`, `DEBATE_UX_AUDIT.md`, `ROADMAP_RECOMMENDATION.md`) already align with Model F's direction — **no changes proposed to design docs**; they serve as informational background for the future implementation phase.



---

## 22. PRODUCT DECISIONS REQUIRED

**Rules:** DO NOT silently finalize. Every item below needs explicit product-owner approval before implementation can proceed. Format: Recommendation / Why / Alternatives / Decision required.



###22.1 WINNER/LOSER ELIMINATION

- **Recommendation:** Retire the winner/loser model entirely (schema semantics, UI, reputation events) — replace with Model F (concluded state + SoU + optional conclusions).
- **Why:** 00:31 direct contradiction; structural incompatibility (§5.1); zero MD backing (§2.1).
- **Alternatives:** Keep as hidden legacy subsystem (rejected: continues to shape status/reputation/authority); Phase-2 only (needless delay; model wrong today).
- **Decision required:** ✅ Approve retirement of winner/loser semantics from the product model?

###22.2 MEANING OF RESOLUTION (SEMANTICS)

- **Recommendation:** "A debate is Concluded when participants deliberately end the current examination phase and record current understanding" (§10); process-resolution ≠ proposition-truth (dual axis.

- **Why:** Preserves debate closure needswhile honoring fallibilism; differentiates process from truth explicitly.
- **Alternatives:** "Resolved = truth found"(rejected);"No such state"(rejected — loses debat identity).
- **Decision required:** ✅ Approve the §10 semantics definition?

###22.3 WHETHER FORMAL CONCLUSION EXISTS

- **Recommendation:** Yes — **optional**, versioned **Participant Conclusions** (interpretations, never final).**Room-level "accepted conclusion"** exists only via parity acknowledgment (§11.2;; i.e.: acknowledged/contested/single-participant standing .
- **Why:** "Stronger conclusions" need articulation (philosophy); authority must be structurally guarded (§8,§11).
- **Alternatives:** SoU-only (loses narrative); formal accepted-conclusion lifecycle (Phase-2, §9.2 OPTION 4).
- **Decision required:** ✅ Approve optional participant conclusions + parity acknowledgment model?

###22.4 WHETHER STATE OF UNDERSTANDING REMAINS INDEPENDENT

- **Recommendation:** Yes — SoU stays deterministic, evidence-led, independent of conclusions; surfaces divergence merging(such §14).
- **Why:** Control surface for human interpretations;PHASE_4A constraints;; validated comprehension (PHASE_4B).
- **Alternatives:** SoU consumes conclusion data (rejected: poisons the deterministic spine);SoU replaced by conclusions (rejected: authority risk).
- **Decision required:** ✅ Approve SoU independence invariant?

###22.5 EVIDENCE ANCHORS

- **Recommendation:** Mandatory claim anchor (+evidence where available, explicitly marked when absent; optional question/inquiry references; no popularity/engagement as evidence quality §13.
- **Why:** Prevents floating opinions; anchors make conclusions inspectable and moderation-cascadable.

- **Alternatives:** Optional/free-form conclusions(too floaty);anchor-less resolutions(current state).
- **Decision required:** ✅ Approve mandatory-anchor rule (with explicit "no claims examined" escape hatch)?

###22.6 EVIDENCE-STATE TAXONOMY

- **Recommendation:** Keep the three-state posture taxonomy (`supported | contested | unresolved`) as internal keys with display strings always qualified — "Supported/Contested/Unresolved by current evidence" (§8.3); extend to debate rooms; never serialize as truth-likelihood degrees.

- **Why:** PHASE_4A/4B validated fallibilist wording; prevents covert truth-scale (contested = half-true etc.); SoU already implements exactly this.
- **Alternatives:** Finer grades (e.g., mixed/insufficient — adds apparent precision without new evidence semantics; rejected for now);binary supported/unresolved(too coarse; hides dispute).
- **Decision required:** ✅ Approve taxonomy polish + debate extension (display discipline mandatory)?

###22.7 AUTHORITY

- **Recommendation:** Any engaged participant may propose conclusions; parity acknowledgment required for "acknowledged" standing; contest flag supported; creator/moderator hold conduct/lifecycle powers only (§11).No majority voting;no AI authority.

- **Why:** Tests conclusions by cross-perspective scrutiny instead of popularity; mirrors consensus-as-shared-understanding(02);directly undoes creator-winner authority chain.

- **Alternatives:** Creator-only(restores winner authority);majority-vote acceptance(violates 02).
- **Decision required:** ✅ Approve parity-acknowledgment authority model (**PROPOSED — REQUIRES PRODUCT OWNER APPROVAL**)?

###22.8 REVISION

- **Recommendation:** Conclusions are versioned, supersedable, always replaceable; "irreversible" language and one-shot resolution retired (§12.2..
- **Why:** Fallibilism + knowledge-evolution future (00 future features);revision is the expected lifecycle, not punishment.
- **Alternatives:** Append-only single conclusion overrides(no history;loses audit);immutable conclusions(rejected: violates fallibilism).
- **Decision required:** ✅ Approve versioned-revision model?

###22.9 REOPENING

- **Recommendation:** `Concluded` debates may reopen on meaningful new evidence/inquiries/interpretationsvia human-deliberate action (parity acknowledgment or moderator;§12.. No automatic thresholds (§12.3)।
- **Why:** New evidence is the raison d'être of fallibilist knowledge platform(00);human-initiated transitions keep process meaningful.
- **Alternatives:** Permanent closure(at odds with knowledge evolution);auto-reopen(timers/quorum — rejected: ungrounded automation).
- **Decision required:** ✅ Approve human-deliberate reopening + no-auto-thresholds rule?

###22.10 HISTORICAL WINNERS

- **Recommendation:** Preserve as immutable legacy data; label appropriately ("Legacy resolution — winner-based model"); never auto-convert winner→supported (§16.. New conclusion artifacts start empty for legacy debates.

- **Why:** A winner declaration is not evidence (§16.4); historical audit-trace must not be rewritten; mapping would fabricate evidence postures.

- **Alternatives:** Auto-migrate winner→conclusion(rejected: fabricates semantics);delete old data(rejected: destroys audit)..
- **Decision required:** ✅ Approve legacy-preserve + no-mapping rule?

###22.11 DEBATE_WON / DEBATE_LOST (REPUTATION EVENTS

- **Recommendation:** Stop emitting for any conclude-path; existing rows preserved as documentary history; recalculation whether old events still count = separate decision (§15..
- **Why:** Event model rewards winning-and-penalizes-losing — philosophically inverted core value (§15.1b).
- **Alternatives:** Keep with re-labeled factor names(rejected: semantics persist);remove all debate reputation(too far).
- **Decision required:** ✅ Approve retirement of DEBATE_WON/DEBATE_LOST emission; reserve recalculation decision separately?

###22.12 DEBATE REPUTATION (GENERAL

- **Recommendation:** Descriptive-only participation/create signals remain (+5/+15 unchanged;or re-verified);truth-seeking signals (side-switch, self-contradiction, opposing-acknowledgment, claim-correction) adopted from TRUTH_SEEKING_REPUTATION_REVIEW;no new gamification (§15.3)..
- **Why:** Aligns "descriptive metrics only"(06)and "reputation = track record of contributing to understanding"(philosophy).
- **Alternatives:** Zero debate reputation(rejected: debate invisible);winner-based(rejected).
- **Decision required:** ✅ Approve descriptive + truth-seeking reputation direction (**NEW PRODUCT DECISION REQUIRED** for each concrete event/weight change)?

###22.13 AI INVOLVEMENT

- **Recommendation:** AI assists (organize, summarize-with-human-templates, surface, contradiction-flag, question-extraction; AI-drafted conclusion proposals disclosed + human-adopt only — FUTURE (§18). AI never: truth, winner, correctness, consensus-forcing, final authority.
- **Why:** 10 explicitly bans AI truth/consensus authority;assist-only preserves determinism and human decision-making (05: humans final decisions).
- **Alternatives:** AI auto-conclusions(disclosed yet auto-published — still AI-as-authority;rejected);AI-only SoU(breaks auditability;rejected).
- **Decision required:** ✅ Approve assist-only AI boundary and gate AI-drafted conclusions behind future product approval?

###22.14 DISCUSSION RELATIONSHIP

- **Recommendation:** Formal conclusion/Concluded-state stays **Debate-only** for now; discussions keep SoU (no verdict, no process-close required, no competitive surfaces).Optional interpretations for discussions = PROPOSED-FUTURE gated by the Consensus-System roadmap (02, 08;§17).
- **Why:** 01/03/06 define discussions as conversation-first exploration;never competitive;consensus engine (Phase 2) is the sanctioned future vehicle.

- **Alternatives:** Shared conclusion system now(risks making discussions competitive;proposed-date too early);discussion winner-mechanic(expressly forbidden by 00:31 and homepage copy).
- **Decision required:** ✅ Approve debate-only conclusion scope now + discussions-remain-conversation-first?

---

## 23. FINAL DECISION MATRIX

Allowed statuses: `EXISTING` / `ALIGNED` / `MISALIGNED` / `PROPOSED` / `REQUIRES PRODUCT APPROVAL` / `FUTURE` / `NOT RECOMMENDED` / `UNVERIFIED`.

| Decision | Current | Recommended | Status |
|---|---|---|---|
| Winner/loser resolution model | `debates.resolution.winner` + WON/LOST events + win/loss factors | Retire entirely; replace with Concluded state + SoU + optional conclusions (Model F) | MISALIGNED → PROPOSED (**approval required**) |
| Meaning of "Resolved" | Creator verdict ("who won"); irreversible | Process state:"Concluded — current understanding recorded"; process-resolution ≠ proposition-truth;reopenable | MISALIGNED → PROPOSED |
| Formal conclusion exists? | Yes — as winner+summary (creator-declared) | Yes — as optional, versioned, participant-recorded interpretations; acknowledged via parity; never final | MISALIGNED → PROPOSED |
| State of Understanding independence | SoU exists (discussions only; deterministic, evidence-led) | SoU stays independent backbone; extended to debates; exposes divergence from conclusions | ALIGNED → PROPOSED (debate extension) |
| Evidence anchors | None (resolution floats) | Mandatory claim anchor; evidence where available; questions/inquiries optional | MISALIGNED → PROPOSED |
| Evidence-state taxonomy | Implemented per-claim (supported/contested/unresolved) as posture, fallibilist wording | Keep; polish display discipline; never truth-likelihood degrees | ALIGNED |
| Authority | Creator-only resolution | Any participant proposes; parity acknowledgment for acknowledged-standing; contest flag; moderator = conduct only; no majority; no AI | MISALIGNED → PROPOSED |
| Revision | None; irreversible | Versioned conclusions; supersedsable; always replaceable | MISALIGNED → PROPOSED |
| Reopening | None (resolved rooms stay inactive) | Human-deliberate reopen on meaningful new evidence; no automatic thresholds | MISALIGNED → PROPOSED |
| Historical winners | `{winner,summary,resolvedBy}` rows exist | Preserve as immutable labeled legacy; no auto-conversion winner→supported | EXISTING → PROPOSED (labeling/mapping prohibition) |
| DEBATE_WON / DEBATE_LOST | +25 / −5 trigger events; count into scores; factor rows on profile | Stop emitting on conclude; preserve historical rows; recalculation treatment = separate approval | MISALIGNED → PROPOSED |
| Debate reputation (general) | Created/Joined + events + win/loss | Descriptive participation/create signals; truth-seeking events (side-switch, self-contradiction, opposing-ack) from TRUTH_SEEKING_REVIEW; no gamification | MISALIGNED → PROPOSED |
| AI involvement | None in resolution (winner is human) | Assist-only; never truth/winner/consensus authority; AI-drafted conclusions = FUTURE + disclosure + human adoption | ALIGNED (assist-only already the rule) → PROPOSED (conclusion drafting gated) |
| Discussion relationship | Discussions: SoU only; no resolution (winner model never reached discussions)) | Debate-only conclusion scope now; discussions remain conversation-first; optional interpretations = FUTURE via consensus roadmap | ALIGNED |
| "Resolved" browse tab / banner copy | "Resolved" tab + "Resolved" banner + "Resolved: summary" | "Concluded" tab/status; legacy debates labeled "Concluded (legacy)" | MISALIGNED → PROPOSED |
| Profile win-rate stats | Not rendered in current `src/`; historical docs claimed Win/Win-Rate existed(UNVERIFIED state) | Never render; factor names "Debates Won/Lost" replaced with descriptive names | ALIGNED-as-implemented → PROPOSED (factor rename) |
| Reputation recalculation | Sums all events (incl. legacy WON/LOST) | Whether old events continue counting = separate NEW PRODUCT DECISION (§15.2) | EXISTING → REQUIRES PRODUCT APPROVAL |
| Conclusion version history | Nonexistent | `conclusion_history`-style versions + journal | PROPOSED |
| Concluded-room contribution freeze | `inactive` today (all content stops) | Freeze contributions at `concluded` by default; reopening lifts; exact semantics = NEW PRODUCT DECISION | EXISTING (rooms.inactive) → PROPOSED |
| Notifications (reopen/ack/contest/supersede) | None | New notification types = NEW PRODUCT DECISION | NOT RECOMMENDED-now → PROPOSED |

**Matrix reading:** Rows marked `MISALIGNED → PROPOSED` are the sanctioned change set, all gated by the §22 approval list.** Implementation must not start until product owner approves each affected row.



---

## 24. NOT IMPLEMENTED

This phase performed **design/audit only**. Explicitly:

- ✅ **No source code changed**
- ✅ **No DB changed**
- ✅ **No migration created**
- ✅ **No RPC changed**
- ✅ **No trigger changed**
- ✅ **No reputation logic changed**
- ✅ **No UI changed**
- ✅ **No original MD changed**
- ✅ **No product decision silently finalized** — every recommended decision is marked `PROPOSED` / `REQUIRES PRODUCT APPROVAL` / `NEW PRODUCT DECISION REQUIRED` in §22 and §23; none may be treated as approved by this document alone.

The only artifact produced by this phase is this document: `docs/PHASE_6E_RESOLUTION_CONCLUSION_DESIGN.md`.

**How to proceed (future, non-scope here):** Product owner approves the §22 decision list → design doc/ADR update → implementation-phase plan (migration(s) + service/UI work) → typecheck/lint/build → browser QA → retest → final diff review → sign-off, per the AGENTS.md workflow. Any implementation phase must re-read the final approved decisions (this audit gates, does not decide).

---

## 25. REPORT COMPLETENESS CHECK

Self-check performed **after writing this file** (read whole document):

| Check | Result |
|---|---|
| Section 0 — Absolute no-implementation rule | ✅ Present |
| Section 1 — Why this phase exists | ✅ Present |
| Section 2 — Discora policy gate (incl. UNVERIFIED handling) | ✅ Present |
| Section 3 — Product philosophy hierarchy | ✅ Present |
| Section 4 — Full current-system audit (DB + app + dependency map) | ✅ Present |
| Section 5 — Alignment analysis (ALIGNED/POTENTIALLY MISALIGNED/MISALIGNED classes) | ✅ Present |
| Section 6 — Concept definitions + process-vs-truth distinction | ✅ Present |
| Section 7 — Candidate-model evaluation (A–F; 16 criteria per model) | ✅ Present |
| Section 8 — Critical challenge of Conclusion+Evidence (incl. truth-scale risk) | ✅ Present |
| Section 9 — State of Understanding vs Conclusion (Options 1–4 + recommendation) | ✅ Present |
| Section 10 — Resolution semantics (both questions answered; both-states-allowed) | ✅ Present |
| Section 11 — Authority audit + proposed model | ✅ Present |
| Section 12 — Revision/reopening (EXISTING/PROPOSED/NEW-PRODUCT-DECISION split) | ✅ Present |
| Section 13 — Evidence relationship (mandatory/optional anchors; quality rules) | ✅ Present |
| Section 14 — State of Understanding future role | ✅ Present |
| Section 15 — Reputation (current / misaligned / future options separated) | ✅ Present |
| Section 16 — Historical data (preserve/legacy/migrate; no winner→supported mapping) | ✅ Present |
| Section 17 — Discussion vs Debate | ✅ Present |
| Section 18 — AI boundary | ✅ Present |
| Section 19 — UX direction (label mental models; no UI built) | ✅ Present |
| Section 20 — Security/architecture impacts (design only) | ✅ Present |
| Section 21 — Original MD impact (CURRENT→PROPOSED; ⚠️ MD concern raised) | ✅ Present |
| Section 22 — 14 product decisions + recommendation table | ✅ Present |
| Section 23 — Final decision matrix (allowed statuses) | ✅ Present |
| Section 24 — NOT IMPLEMENTED | ✅ Present |
| Section 25 — This completeness check | ✅ Present |
| Report does not end mid-sentence | ✅ Verified on full read |
| Proposed decisions clearly marked (PROPOSED / REQUIRES PRODUCT APPROVAL / NEW PRODUCT DECISION REQUIRED) | ✅ Verified |
| No implementation occurred | ✅ Verified (§24) |
| No unsupported claims invented (all DB/app claims traced to verified files/lines in §4) | ✅ Verified (audit-traced) |

**Completeness verdict:** All sections 1–25 presentand complete;the document ends with this checklist, not mid-sentence.



---

*End of PHASE 6E Resolution & Conclusion Design — design/audit only. Nothing was implemented.***