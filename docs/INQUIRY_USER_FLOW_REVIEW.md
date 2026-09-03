# Inquiry User Flow Review

**Date**: 2026-06-12
**Status**: Behavioral analysis only — no implementation.

---

## Executive Summary

Inquiry is the feature that determines whether Discora is a debate platform or a truth-seeking platform.

Every debate platform has Support and Challenge. None have structured Inquiry. The differentiation is not technical — it's cultural. Inquiry makes the meta-question "are we even asking the right questions?" as important as the debate itself.

**The risk is not that Inquiry fails. The risk is that it succeeds as a side-feature — a Q&A panel attached to claims — rather than as the mechanism that transforms how people argue online.**

This review identifies six critical insights:

1. **The new user flow is the most important design decision.** What a new user sees determines whether they treat the platform as a debate to win or an investigation to participate in.

2. **Support/Challenge users asking questions about their own side is the highest-value behavior on the platform.** It is also the rarest and hardest to encourage.

3. **Permanent inquiry is unhealthy.** Users who never commit become free-riders — they consume the debate without contributing arguments. The platform must design toward commitment without punishing deliberation.

4. **Side switching via inquiry is the ideal truth-seeking journey.** The platform must celebrate this path, not tolerate it.

5. **Consensus without resolved inquiries is fragile.** The strength of a conclusion is proportional to the number of inquiries it has survived.

6. **Reputation for inquiry must reward intellectual honesty, not volume.** The wrong incentive structure will produce inquiry spam, not inquiry quality.

---

## Flow 1 — New User

### Scenario

A user enters a debate for the first time. They have heard both sides of the motion in real life. They are curious but undecided.

### What Should They See First?

**Not a side picker.**

The current design presents three buttons: Support, Challenge, Inquiry. A new user does not know which they are. Asking them to choose before they've seen any arguments creates anxiety and premature commitment.

**They should see the motion + a summary of the best arguments from each side + an invitation to explore.**

```
┌─────────────────────────────────────────────┐
│  Motion: "AI will replace most knowledge    │
│  workers within 10 years"                   │
│                                             │
│  The case for: [summary of top Support      │
│  claims + evidence count]                   │
│                                             │
│  The case against: [summary of top          │
│  Challenge claims + evidence count]         │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  🔍 Investigate — explore arguments     ││
│  │  before choosing a position             ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Skip to Support]    [Skip to Challenge]   │
└─────────────────────────────────────────────┘
```

The "investigate" button should be primary (visually prominent). The side buttons should be secondary (text links). This signals: "We expect you to explore before you decide."

### Should They Be Encouraged to Choose a Side?

Yes — but not immediately.

The encouragement should come after they have interacted with the debate:
- After viewing N claims (e.g., 5) → "You've reviewed several arguments. Would you like to take a position?"
- After creating an inquiry → "Great question! If you'd like to formally take a position, you can do so here."
- After N sessions (e.g., 3rd visit) → "You've visited this debate several times. Choosing a side helps others understand your perspective."

The encouragement should be gentle, not pushy. The default state is investigation. The premium action is commitment.

### Should Inquiry Happen Before Side Selection?

**Yes, implicitly.**

A new user is in an inquiry mindset by default — they are investigating. They should not need to click "I am an inquirer" to ask questions. The question-asking UI should be available to everyone regardless of role. The `'inquiry'` role is for users who want the label. The *action* of inquiry is universal.

### What Mistakes Would Cause Confusion?

| Mistake | Impact |
|---------|--------|
| Forcing side selection before exploration | User leaves. High bounce rate for new users. |
| Inquiry as a third button equal to Support/Challenge | Decision paralysis. "Am I Support, Challenge, or Inquiry?" is the wrong question. |
| Inquiry role feeling like a "lesser" choice | "I'm just an inquirer" implies the real participants are Support/Challenge. |
| Not distinguishing inquiry questions from chat messages | Users ask questions in the discussion tab; inquiry tab feels redundant. |
| Inquiry UI hidden behind a tab | Users don't know they can ask structured questions. |

### What Would Make Them Feel Welcome?

1. **Permission to not know.** "It's okay to be undecided. That's why you're here."
2. **Discovery before commitment.** Show arguments, not labels.
3. **Low-friction inquiry.** A text box on any claim: "Ask a question about this claim." Not a separate form, not a role switch.
4. **Visual signal that questions are valued.** Inquiry count displayed prominently: "3 people are asking questions about this claim."
5. **No pressure to perform.** New users should not see their inquiry count, unresolved ratio, or any metric until they've established a pattern.

---

## Flow 2 — Support Participant

### Why Would They Create an Inquiry?

1. **Intellectual honesty.** They believe the motion but encounter a claim from their own side that feels weak. They ask for evidence. This is the highest-value inquiry on the platform.
2. **Strategic clarification.** A claim on their own side is ambiguous. They want it clarified so opponents cannot exploit the ambiguity. Mixed motive — partly truth-seeking, partly defensive.
3. **Cross-side understanding.** A Challenge claim is surprising. They want to understand it before rebutting it. This is the second-highest value.
4. **Social bonding.** They agree with a claim and want to help the author strengthen it. "Great point — can you add the source?" Supportive, not challenging.

### What Kinds of Inquiries Are Valuable?

| Type | Value | Why |
|------|-------|-----|
| "What evidence supports this?" on own side's claim | **Highest** | Signals intellectual honesty; strengthens position |
| "Can you clarify this term?" on either side | High | Reduces ambiguity; improves argument quality |
| "Am I understanding correctly that..." on Challenge claim | High | Cross-side bridge-building |
| "How does this evidence relate to the claim?" | High | Strengthens argument map |
| "What would change your conclusion?" | High | Tests intellectual honesty of opponent |

### What Kinds Are Harmful?

| Type | Harm | Why |
|------|------|-----|
| "Prove this obvious claim" (sealioning) | Wastes time | Demands evidence for well-established facts |
| Serial "but what about..." on every response | Harassment | Never satisfied; infinite regress |
| "Define every term precisely" | Filibustering | Impossible to satisfy; stalls debate |
| Inquiry on opponent's claim with no intent to engage | Low-effort noise | Asks question, ignores response, moves to next claim |

### What Should Happen After Their Inquiry Is Answered?

**The platform should surface the outcome to the debate.**

- Inquiry satisfied → "This claim's assumptions have been validated by cross-side inquiry." Positive signal on the claim.
- Inquiry unsatisfied → "This claim has an unresolved inquiry from a Support participant." The claim's strength is called into question.
- Inquiry resulted in evidence addition → "An inquiry led to new evidence being added to this claim." Visible narrative of improvement.

### What Behavior Should the Platform Encourage?

1. **Own-side inquiry** — questioning your own side. This should be visually celebrated: "Support participant questioned this claim. Evidence was strengthened." This reframes doubt as strength.
2. **Cross-side understanding** — "Support participant asked a clarifying question about a Challenge claim." Frame as bridge-building, not weakness.
3. **Evidence linking** — when inquiry leads to evidence being added. Track and display inquiry → evidence → claim chains.
4. **Inquiry → position change** — the ultimate truth-seeking signal. A Support participant who inquires, investigates, and switches. This should be the most celebrated event on the platform.

---

## Flow 3 — Challenge Participant

### Why Would They Create an Inquiry?

Same motivations as Support, with different valence:
- **Strategic:** "I want to find the weak point in their argument" — understand before attacking.
- **Honest:** "This Support claim actually makes a good point — I want to understand it better." Admiring the opponent's argument.
- **Meta:** "Are we even arguing about the right thing?" Questioning the framing of the debate itself.

### The Key Difference

A Challenge participant inquiring on a Support claim has different psychology than a Support participant inquiring on their own side:

| Axes | Support → own side | Challenge → Support side | Support → Challenge side |
|------|-------------------|------------------------|------------------------|
| Underlying motive | "Is my side right?" | "Is their side wrong?" | "What do they actually think?" |
| Default expectation | Defensive | Hostile | Curious |
| Value if answered | Strengthens position | Could reveal weakness | Builds understanding |
| Risk of bad faith | Low (questions own side) | Medium (sealioning) | Low-medium |

**The most psychologically difficult inquiry is Support → own side.** This requires the user to set aside identity and ego. The most common inquiry is Challenge → Support side — it feels natural to question the opponent.

### What Behavior Should the Platform Encourage?

1. **Challenge participants who inquire on their own assumptions.** "Do I actually disagree with this, or have I just been told to?" — rarest but most valuable.
2. **Challenge participants who acknowledge a good Support argument.** "This is compelling — can you provide more evidence?" — signals intellectual honesty.
3. **Challenge participants who switch.** "Challenge participant switched to Support after investigation." — the truth-seeking success story.

### The Asymmetry Problem

Support and Challenge are symmetric in the data model but asymmetric in human psychology. People are loss-averse — switching from Challenge to Support is psychologically "losing" even if it's truth-seeking. The platform must over-index on celebrating position changes from both sides to normalize it.

---

## Flow 4 — Inquiry Participant (Undecided)

### How Long Should This State Be Sustainable?

**Indefinitely, with gentle nudges.**

A user who never takes a side is still contributing — their inquiries improve argument quality. Forcing commitment would drive away the very users who provide the most objective scrutiny.

### Is Permanent Inquiry Healthy?

**For the individual user, yes.** Some people are temperamentally suited to perpetual investigation. Socrates never chose a side. The platform should not punish this disposition.

**For the debate ecosystem, problematic at scale.** If every participant is "just asking questions," no one builds arguments. The system needs committed participants to generate the content that inquirers investigate.

### Should the Platform Encourage Commitment?

**Yes, but not through enforcement. Through social design.**

| Mechanism | How It Works | Force |
|-----------|-------------|-------|
| Commitment milestone | "You've asked 10 inquiries. Would you like to take a position?" | Gentle nudge |
| Contribution asymmetry | Inquirers cannot create claims or evidence — they can only ask questions. Commitment is required to build arguments. | Structural |
| Social proof | "3 inquirers in this debate. 12 Support. 8 Challenge." Shows that commitment is the norm. | Social |
| Reputation visibility | Inquirer reputation is earned differently — questions, not arguments. Users may want "argument builder" reputation instead. | Motivational |
| Debate health metric | "This debate has X unresolved inquiries." Inquirers see their impact. | Informational |

### If Yes, How?

**The best commitment mechanism is gradual, not binary.**

Allow users to participate as inquirers, then:
1. After they've asked questions on both sides, prompt: "You've explored both perspectives. Has your understanding changed?"
2. Let them mark a "leaning" without full commitment: "I lean Support but I'm still investigating."
3. Full commitment comes naturally as they build confidence.

### If No, Why Not?

Some arguments:
- Inquiry-only users provide the most objective scrutiny.
- Forcing commitment reduces participation.
- The platform values understanding over engagement — commitment is engagement, not understanding.
- Some debates are better served by inquirers than partisans.

**Counterargument**: A debate with only inquirers has no debaters. The platform must maintain balance. Commitment should be the default expectation, with inquiry as a legitimate but temporary state.

### Recommendation

Design for inquiry as a **pathway**, not a **destination**.

The ideal user journey for an undecided participant:

```
Enter debate → Explore arguments → Ask questions →
Form leanings → Test both sides → Take position →
Continue questioning from new position
```

The system should make this path feel natural, not tracked or measured. No "you've been undecided for 30 days" notifications. Gentle, ambient orientation toward commitment.

---

## Flow 5 — Side Switching Journey

### The Ideal Arc

```
Support ──→ Inquiry ──→ Evidence Evaluation ──→ Challenge
```

This is the most important user journey on the platform. It is the entire point of Discora.

### What Should the User Experience Feel Like?

**A relief, not a defeat.**

Current debate platforms make side switching feel like losing. Discora must invert this:

| Emotion | Current platforms | Discora target |
|---------|------------------|----------------|
| Switching | "I was wrong" | "I learned something" |
| Previous position | Embarrassment | Evidence of intellectual journey |
| System message | "X changed their mind" | "X investigated and found compelling evidence" |
| Reputation effect | Negative or neutral | Positive signal of truth-seeking |
| Profile display | Hidden or buried | Featured as "Intellectual Honesty" badge |

### UX Elements

1. **The switch is framed as achievement.** "You investigated the evidence and changed your position. This is the core of truth-seeking."
2. **The previous position is preserved and celebrated.** "X previously supported this motion (see their earlier claims). After investigation, they now challenge it."
3. **The reason is public and permanent.** The system message shows the evidence that triggered the change.
4. **Side switchers get a visible marker.** A small badge or icon on their avatar: "Truth Seeker" — indicates they have changed positions through evidence.
5. **The debate health metric improves.** "This debate has produced 3 position changes" — displayed as a positive signal of debate quality.

### What Should Other Participants See?

1. **System message with reason.** "X switched from Support to Challenge after reviewing Y's evidence about [topic]."
2. **Previous claims remain visible**, marked as "Previous position." This preserves the continuity of the debate.
3. **Inquiries from the pre-switch period remain**, marked with "Asked while supporting this motion." Context preserved.
4. **The side switcher's new inquiries** are marked with their new side.

### How Can the Platform Normalize Intellectual Honesty?

1. **Celebrate position changes publicly.** A "Position Changes" section in the debate header. Not shaming — highlighting productive doubt.
2. **Remove the concept of "winning" a debate.** Consensus replaces winners. You don't "lose" when you switch — you "update your understanding."
3. **Display aggregate truth-seeking stats.** "X participants have changed their position in this debate." Normalizes the behavior.
4. **Profile badges for switching.** Not gaming-able (requires cooldown + reason) but visible as a signal of intellectual integrity.
5. **Side switching as a positive reputation category.** SIDE_SWITCHED at 0 points for now, but could become a positive signal in a "Truth-Seeking Score" separate from argument reputation.

### The Switch as Product

The side switch journey — complete with inquiries, evidence evaluation, and position change — is the most valuable product outcome. It proves the platform works. Every design decision should ask: "Does this make the side switch journey more likely or more meaningful?"

---

## Flow 6 — Consensus Journey

### How Should Unresolved Inquiries Affect Consensus?

**Unresolved inquiries prevent strong consensus but do not block consensus entirely.**

| Consensus Strength | Condition |
|-------------------|-----------|
| Strong | All inquiries resolved (satisfied or closed) |
| Moderate | Inquiries exist but conclusions address them |
| Provisional | Open inquiries remain — "consensus subject to inquiry resolution" |
| None | Inquiries have identified fundamental disagreements |

The consensus display should include:

> "This conclusion has 3 unresolved inquiries. It represents the current best understanding pending further investigation."

This is honest. It doesn't claim certainty it hasn't earned.

### How Should Resolved Inquiries Affect Consensus?

**Resolved inquiries strengthen consensus.**

Each satisfied inquiry adds a "survived scrutiny" signal. The conclusion display:

> "This conclusion has survived 12 inquiries across both sides. Confidence: High."

The relationship is not linear — 1 inquiry resolved is valuable, 50 inquiries resolved on the same point is diminishing returns. The display should show:

- **Total inquiries resolved:** Count
- **Unique perspectives:** How many different users asked about this
- **Side distribution:** Were inquiries from both sides?
- **Evidence anchors:** How many inquiries led to evidence being added

### How Can Users Understand Why Consensus Changed?

**Through inquiry → consensus traceability.**

Every consensus version should link to the inquiries that drove the change:

```
Consensus v1 → "AI will replace most knowledge workers."
  └─ Inquiry: "What counts as 'most'?" (resolved → clarified: >50%)
  └─ Inquiry: "What timeline?" (resolved → added: "within 10 years")

Consensus v2 → "AI will replace >50% of repetitive knowledge work within 10 years."
  └─ Inquiry: "What about creative work?" (unresolved — flagged)
  └─ Inquiry: "Is this limited to knowledge work?" (resolved — yes)
```

This creates a narrative of how understanding evolved. Users can see what questions were asked and how the conclusion changed.

### The Consensus + Inquiry Feedback Loop

```
Better claims → More inquiries → More responses →
Stronger evidence → Better consensus → More trust → More participation
```

Inquiry is the forcing function for quality. Without inquiry, consensus is just popularity. With inquiry, consensus is tested understanding.

---

## Flow 7 — Argument Map Integration

### How Should Inquiry Appear in Argument Maps?

**As annotation indicators, not inline content.**

A complex debate map already has claims, evidence, and relationships. Adding inquiry text inline would create visual overload. The design principle: **show presence, reveal on demand.**

```
[Claim A] ─── supports ───→ [Claim B]
    🔍(3)                        🔍(1)
    │                            │
    └─── [Evidence] ────────────┘
         🔍(0)
```

- 🔍(N) = N open inquiries on this node
- Color: amber for open, green for all resolved, red for unsatisfied
- Clicking 🔍 expands an inquiry panel overlay

### What Should Happen for Each Target Type?

| Target | Inquiry display | Relevance |
|--------|----------------|-----------|
| **Claim** | 🔍 badge on claim node. Panel shows inquiries about the claim's validity, assumptions, evidence support. | High — most common inquiry target |
| **Evidence** | 🔍 badge on evidence node. Panel shows methodology questions, relevance challenges. | Medium — evidence quality is already vetted through voting |
| **Relationship** | 🔍 on the edge/arrow between nodes. "Is this relationship correct?" | High — relationships are often assumed, not proven |

### Relationship Inquiries (Edge Inquiries)

This is the most valuable but most complex inquiry type in the map:

- "Does claim A actually support claim B?"
- "Is this evidence relevant to this claim?"
- "Is the relationship supporting or contradicting?"

Relationship inquiries should be displayed on the connecting line/arrow between nodes. When the relationship is questioned, the edge becomes dashed or amber until resolved.

### What Visual Structures Create Understanding Instead of Clutter?

1. **Collapse inquiries by default.** Show 🔍 count. Expand on hover or click.
2. **Filter by inquiry status.** "Show nodes with unresolved inquiries only" — reduces clutter for focused investigation.
3. **Group by inquirer type.** Toggle: "Show Support-side inquiries" / "Show Challenge-side inquiries" / "Show all."
4. **Heat map view.** Color nodes by inquiry density. Red = many open inquiries. Green = few/none. Quickly identify weakest arguments.
5. **Resolution timeline.** Show how inquiry density changed over time. Did inquiries get resolved? Did new ones appear?

---

## Flow 8 — Reputation Integration

### Should Asking Inquiries Create Reputation?

**Yes, but with tight quality controls.**

| Approach | Pro | Con |
|----------|-----|-----|
| +3 per inquiry (current design) | Encourages engagement | Encourages spam |
| +1 per inquiry, +5 if resolved | Quality filter | Delayed gratification |
| No points for asking, +10 for getting resolved | Maximum quality signal | Discourages initial inquiry |
| Variable points based on response ratio | Algorithmic quality | Opaque, hard to understand |

**Recommended**: +2 per inquiry, +3 if the inquirer acknowledges satisfaction. This rewards both creation and completion without over-incentivizing volume.

### Should Resolving Inquiries Create Reputation?

**Yes — for the responder, not the inquirer.**

| Action | Recommended points | Rationale |
|--------|-------------------|-----------|
| Respond to inquiry | +5 | Higher than inquiry creation — response is harder |
| Satisfaction acknowledged | +3 (bonus) | Completes the loop |
| Evidence added in response | +5 (stacked) | Tangible improvement to debate quality |

The asymmetry is intentional: **responding to an inquiry is more valuable than asking one.** This prevents inquiry spam — there is incentive to answer, not just to ask.

### Should Unanswered Inquiries Affect Reputation?

**Negatively for the responder, not the asker.**

- Claim author has unanswered inquiries on their claim → claim's "responsiveness" score decreases.
- User has pattern of ignoring inquiries → "low responsiveness" flag on profile.
- Inquirer is never penalized for asking questions that go unanswered.

This prevents inquirer penalization (which would discourage inquiry) while encouraging responsiveness.

### How Do We Prevent Gaming?

| Gaming vector | Mitigation |
|---------------|------------|
| Create trivial inquiries for points | Low per-inquiry points (+2). Max 50 per debate. |
| Create inquiries, answer yourself (alt account) | Architected out — inquiries and responses are attributed. Pattern detection for self-response. |
| Create inquiries, never satisfy, prevent others from earning | Inquirer not penalized, but UNSATISFIED has no cap. Saturation of open inquiries reduces debate quality — visible to all. |
| Respond to everything for points | Response quality not measured yet. Future: "response helpfulness" voting. |
| Collusion (friends ask/answer each other) | Hard to prevent algorithmically. Rely on caps and moderation. |

### Reputation Display for Inquiry

Not a separate score. Inquiry contributions feed into the same reputation pool but are tagged:

```
User's Reputation:
  Argument contributions:  1,245 points (claims + evidence)
  Inquiry contributions:     312 points (questions + responses)
  Truth-Seeking signals:       3 side switches, 48 inquiries satisfied
```

This makes inquiry visible without creating a parallel reputation system.

---

## Flow 9 — Failure Modes

### Critical

| Failure | Description | Mitigation |
|---------|-------------|------------|
| **Inquiry as side bypass** | Users who want to argue against a motion use inquiry to avoid declaring Challenge. They never commit, never create counter-claims, but their "questions" are arguments. | Require side declaration after N inquiries. Flag users whose inquiries target 80%+ one side. Make "inquiry side leaning" visible. |
| **Inquiry overload** | Popular debates attract hundreds of inquiries. Claim authors cannot respond to all of them. Inquiries pile up, unresolved. | Cap per claim (20). Priority sorting (voted questions first). Auto-expiry (30d). "Too many inquiries" collapse. |
| **Consensus paralysis** | Participants refuse to accept consensus because "inquiries are still open." Inquiry becomes a veto. | Design rule: inquiries flag but do not block consensus. "Accepted with X unresolved inquiries" is a valid state. |

### High

| Failure | Description | Mitigation |
|---------|-------------|------------|
| **Inquiry as harassment** | "Just asking questions" used to target specific users. Each question appears reasonable; aggregate is persecution. | Unresolved ratio visibility. Moderation path for inquiry patterns. Cross-debate pattern detection. |
| **Inquiry echo chambers** | Support users only inquire on Challenge claims. Challenge users only inquire on Support claims. No one questions their own side. | Cross-side inquiry ratio displayed. "Own-side inquiry" celebrated when it happens. No enforcement — cultural shift. |
| **Reputation gaming** | Users create low-effort inquiries for points. | Low per-inquiry points (+2). Rate limits (5/hr). Cap (50/debate). |
| **New user confusion** | Users don't understand what inquiry is or why they should use it. They treat it as a chat feature. | Onboarding that distinguishes "chat message" from "structured inquiry." Template prompts ("Ask a question about this claim"). |

### Medium

| Failure | Description | Mitigation |
|---------|-------------|------------|
| **Permanent inquirers** | Users with 200+ inquiries across debates, zero claims or evidence. They consume without contributing arguments. | Profile shows contribution asymmetry. Gentle nudges toward commitment. Acceptance — some users are natural inquirers. |
| **Inquiry abandonment** | User asks, gets answer, never follows up. Leaves inquiry in "open" state. | Auto-expiry (30d). Inquirer not penalized (responsibility is on responder to answer, not inquirer to acknowledge). |
| **Duplicate inquiries** | 5 people ask "What evidence supports this?" on the same claim. | Duplicate detection and merge into "crowd asks" aggregation. |
| **Inquiry quality collapse** | As volume grows, average inquiry quality drops. Well-reasoned questions get lost in noise. | Voting on inquiries. "Most asked" sorting. Separate inquiry tab as archive. |

### Low

| Failure | Description | Mitigation |
|---------|-------------|------------|
| **AI-generated inquiries** | Automated inquiry posting. | Rate limits + captcha. Content pattern detection (future). |
| **Siloed inquiry** | Inquiries never connect to consensus. Users ask but consensus authors don't see them. | Consensus drafting UI shows "unresolved inquiries" for review. |
| **Cross-platform reputation arbitrage** | Users create inquiries on Discora to build reputation for another platform. | Unlikely at small scale. Low priority. |

---

## Cultural Risks

### Risk 1: Inquiry Culture vs. Argument Culture

Discora's current culture rewards argument building (claims, evidence). Inquiry culture rewards question asking. These can conflict:

- Argument culture: "Build the strongest case for your side."
- Inquiry culture: "Find the holes in every case."

A participant who spends time asking questions is not building arguments. The platform must value both contributions equally in reputation and visibility, or inquiry becomes a second-class activity.

### Risk 2: The Socrates Problem

A culture that over-rotates on inquiry produces endless questions and no conclusions. The Socratic method is valuable but can be weaponized as infinite regress. Discora needs a cultural norm: **"Inquiry is the beginning of understanding, not the end of argument."**

### Risk 3: The Certainty Bias

Users join Discora to debate, which requires taking a position. Inquiry softens positions. Users who want clear winners and losers may feel frustrated by a platform that says "let's investigate" instead of "let's fight."

This is a feature, not a bug — but it requires user education. The cultural message: **"If you want to win, go to Twitter. If you want to understand, stay here."**

### Risk 4: Inquiry as Virtue Signaling

"Asking the hard questions" becomes a performative identity. Users compete to appear skeptical rather than to learn. The cultural antidote: track resolution, not just creation. "This user has 50 inquiries but only 5 resolved" is a visible pattern.

### Risk 5: The Moderation Burden

"Just asking questions" is the most common bad-faith rhetorical tactic online. Discora's moderation team will face a constant stream of "I was just asking!" defenses. The platform needs clear guidelines distinguishing good-faith inquiry from sealioning, and moderators need tools to evaluate patterns, not individual posts.

---

## Recommended User Experience Principles

### Principle 1: Inquiry Is Universal

Every user can ask a question about any claim or evidence, regardless of their role. No switching, no permission, no friction. The "Inquiry" button is always visible.

### Principle 2: Commitment Is Optional But Visible

Users who never commit are visible as inquirers. Their contributions are valued. But the platform surfaces commitment as a natural progression, not a requirement.

### Principle 3: Questions Are Structured

Inquiry is not chat. Every question has a type (clarification, evidence request, assumption check), a target (claim, evidence, relationship), and a lifecycle (open → responded → satisfied → closed). This structure is what makes inquiry a knowledge-building tool rather than a discussion thread.

### Principle 4: Quality Over Volume

The incentive structure favors resolved inquiries over created inquiries. Responding is rewarded more than asking. Acknowledging completion is rewarded more than initiating.

### Principle 5: Side Switching Is Celebrated

The most important metric on the platform is not "claims created" or "debates won" — it's "positions changed through evidence." Side switching is the proof that truth-seeking works. It should be the most visible, most celebrated, most rewarded action on the platform.

### Principle 6: Consensus Without Inquiry Is Incomplete

No conclusion should be accepted without an inquiry review. The consensus workflow: draft → inquiry review → revision → acceptance. Inquiries are not optional quality assurance — they are the mechanism by which consensus earns confidence.

### Principle 7: The Argument Map Is the Truth Surface

Inquiries appear as annotations on the truth surface (the argument map). Open inquiries are weak points. Resolved inquiries are validated links. The map visualizes not just what is argued, but what is questioned.

---

## Final Verdict

### In 5 Years, What Role Does Inquiry Play?

**Central. Not as a feature, but as the identity of the platform.**

Here is the argument:

Every debate platform has: Support, Challenge, Claims, Evidence, Voting, Winner declaration.

Discora's differentiation is not **that** it has these features. It's **how** they are connected. Inquiry is the connective tissue.

**Without inquiry, Discora is a debate platform — a slightly better Reddit debate sub.**

**With inquiry, Discora is a truth-seeking platform — a structured investigation tool that exists nowhere else.**

The question "what role does inquiry play" is the same question as "what is Discora?"

| If inquiry is... | Then Discora is... |
|-----------------|-------------------|
| A supporting feature | A debate platform with a Q&A panel |
| A core feature | A structured investigation platform |
| The central feature | A knowledge-building system that uses debate as its engine |

**The correct answer: Core, evolving toward Central.**

Inquiry should not be the central feature on day one. Users need to understand Support/Challenge first. They need to see debate as a binary before they can appreciate inquiry as a third dimension.

But the product roadmap should be designed so that inquiry becomes central over time:

- **Phase 1 (launch):** Inquiry as contribution type. Available to all. Visible as inquiry panel on claims.
- **Phase 2 (6 months):** Inquiry → consensus integration. "No consensus without inquiry review."
- **Phase 3 (12 months):** Inquiry → argument map integration. Map shows weak points.
- **Phase 4 (18 months):** Truth-Seeking Score. Reputation combines argument quality + inquiry quality + position changes.

By Phase 4, inquiry is no longer a feature — it's the lens through which everything is viewed.

### Why This Matters

The internet has no shortage of platforms for shouting. It has almost no platforms for structured investigation.

Discora's mission is "understanding over engagement." Inquiry is the feature that makes this real. Without it, understanding is just an aspiration. With it, understanding is a protocol.

**Inquiry is not optional. It is the product.**

---

## Appendix: Key Design Heuristics

| Heuristic | Application |
|-----------|-------------|
| **Show presence, reveal on demand** | 🔍 count on claims/maps. Expand for details. |
| **Celebrate resolution, not creation** | Higher rep for responding than asking. |
| **Normalize doubt** | Side switching is achievement, not failure. |
| **Surface asymmetry** | Show cross-side vs own-side inquiry ratios. |
| **Design for the journey, not the state** | Inquiry → evidence → position change is the ideal path. |
| **Prevent bypass, not participation** | Cap + rate limit, not role restriction. |
| **Moderate patterns, not posts** | Inquiry abuse is aggregate, not individual. |
| **Make inquiry visible but not noisy** | Separate tab. Collapsible panels. Map annotations. |
| **Every question has a target** | No orphaned inquiries. Always attached to claim/evidence. |
| **Every answer has impact** | Answered inquiry → stronger claim. Unanswered → flagged. |
