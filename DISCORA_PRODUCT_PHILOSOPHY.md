# Discora Product Philosophy

**Date**: 2026-06-11
**Status**: Foundational — should guide all future product decisions.

---

## Mission Statement

> **Help people reach stronger conclusions.**

Not "win arguments." Not "collect likes." Not "be right."

Stronger conclusions:

- Are grounded in **evidence**, not opinion
- Have been **tested by challenge**, not protected from it
- Acknowledge **what they cannot explain**, not just what they can
- Can **evolve** when new evidence arrives
- Are **shared understanding**, not individual victory

---

## Core Definitions

### Discussion

> **Discussion = exploration of a topic without requiring resolution.**

A discussion is a space for:

- Sharing perspectives
- Asking open questions
- Exploring ideas without the pressure of taking a position
- Building shared context before structured argument

In a discussion, you can change your mind without consequence. You can float half-formed ideas. You can ask basic questions.

**The goal of discussion is shared understanding.**

### Debate

> **Debate = structured argument toward a conclusion.**

A debate is a space for:

- Taking a position and defending it
- Challenging opposing positions
- Producing claims and evidence
- Arriving at a conclusion that reflects the evidence

In a debate, you are expected to take a side — Support, Challenge, or Inquiry. You can switch sides when the evidence compels you.

**The goal of debate is a stronger conclusion.**

### Inquiry

> **Inquiry = investigation without taking a position.**

Inquiry is a mode of participation where:

- You ask questions to clarify claims
- You request evidence for unsupported assertions
- You challenge assumptions underlying arguments
- You signal "I have not reached a conclusion yet"

Inquiry is not:

- An attack on the person making the claim
- A rhetorical device ("just asking questions")
- A way to avoid taking a position forever

**The goal of inquiry is better questions.**

### Reputation

> **Reputation = track record of contributing to understanding.**

Reputation measures:

- **Quantity of contribution**: claims, evidence, questions created
- **Quality of contribution**: evidence-supported claims, well-reasoned arguments
- **Intellectual honesty**: side switching when evidence compels, acknowledging good opposing arguments
- **Community value**: helping others understand, not just advancing your own position

Reputation is NOT:

- A popularity score (likes ≠ reputation)
- A correctness score (being right about a prediction ≠ good reasoning)
- A power level (high reputation does not mean your argument wins)
- A punishment tool (voting on claims is about the claim, not the person)

**The goal of reputation is to incentivize behaviors that lead to stronger conclusions.**

### Consensus

> **Consensus = shared understanding of what the evidence supports.**

Consensus is not:

- Unanimity (everyone agrees)
- Majority rule (more votes = winner)
- A popularity contest (most liked = correct)

Consensus is:

- A **conclusion** that both sides can support based on the evidence presented
- A **living document** that evolves as new evidence arrives
- An **acknowledgment of remaining disagreement** — what the conclusion does not explain
- A **measure of confidence** — how sure are we?

**The goal of consensus is a conclusion that reflects evidence, not opinion.**

---

## Design Principles

### 1. Evidence is the unit of persuasion, not opinion.

Every claim should be backed by evidence. Claims without evidence can exist (not everyone has a source at their fingertips), but they should be clearly marked as "unsupported." When a user makes an unsupported claim, the platform should gently surface: "Would you like to add evidence?"

**Why**: Opinions are cheap. Evidence is work. The platform should reward the work.

### 2. Challenge is a feature, not a bug.

When someone challenges your claim, the platform should not frame this as an attack. It should frame it as: "Someone is helping you strengthen your conclusion."

**Why**: Being challenged is how weak arguments are identified and strong arguments are refined.

### 3. Switching sides is a sign of intellectual honesty, not weakness.

The platform should make side switching visible, auditable, and reputation-positive. A user who switches sides after reviewing evidence should be celebrated, not penalized.

**Why**: The goal is stronger conclusions, not defending your original position.

### 4. Inquiries are contributions, not distractions.

Asking "what evidence supports that?" is as valuable as providing the evidence. The platform should give inquiry equal footing with claims and evidence.

**Why**: Good questions drive better understanding.

### 5. The conclusion is the destination, not the winner.

A debate is not resolved when someone "wins." It is resolved when a conclusion is reached that reflects the evidence. If both sides refine their understanding, both sides "win."

**Why**: Framing debate as "winning vs losing" incentivizes bad faith argumentation.

### 6. Reputation should reward intellectual honesty, not argumentative skill.

Arguing well is not the same as being right. Reputation should reward behaviors like:
- Providing evidence for claims
- Switching sides when warranted
- Acknowledging limitations in your own position
- Responding to inquiries about your claims

**Why**: A platform that rewards clever arguing produces clever arguments, not understanding.

### 7. The system should surface uncertainty, not hide it.

A claim with low evidence, a conclusion with low confidence, a debate where both sides agree there are open questions — these should be visible. The platform should not pretend certainty where there is none.

**Why**: Acknowledging what we don't know is the first step to knowing more.

### 8. Moderation protects the process, not the people in it.

Moderation exists to:
- Remove content that prevents good-faith debate (harassment, spam, sealioning)
- Protect the integrity of claims and evidence (false anchors, fabricated sources)
- Keep the conversation productive (off-topic, repetitive, bad-faith)

Moderation does NOT exist to:
- Protect users from being challenged
- Remove unpopular opinions
- Declare which arguments are correct

---

## Feature-Philosophy Alignment Matrix

| Feature | Aligned? | Notes |
|---------|----------|-------|
| Claim voting (agree/disagree) | PARTIAL | Currently rewards popularity; should also reward evidence quality |
| Current "winner" resolution | ✗ | Replaced by consensus system |
| Side labeling (support/challenge) | ✓ | Structures debate |
| Scorecard (agree - disagree) | ✗ | Frames debate as competition |
| Reputation from claims + votes | PARTIAL | Rewards activity, not quality |
| Evidence submission | ✓ | Evidence is the unit of persuasion |
| Claim relations (supports/contradicts/refines) | ✓ | Structures argument mapping |
| Anonymous posting | ✓ | Protects unpopular opinions |
| Author trust signals | ✓ | Surfaces credibility context |
| Cursor-based pagination | ✓ | Neutral to philosophy |
| Discussion feed | ✓ | Exploration without pressure |

---

## Anti-Patterns (What Discora Should NOT Be)

| Anti-pattern | Why |
|-------------|-----|
| **Reddit-style upvote/downvote** | Popularity vote, not evidence evaluation |
| **Twitter-style debate** (quote + dunk) | Performance, not understanding |
| **Dunking** ("Ratio'd", "owned") | Entertainment, not conclusion-building |
| **Algorithmic feed** (engagement-optimized) | Serves what gets reactions, not what builds understanding |
| **Gamification of winning** (badges for debate victories) | Incentivizes bad faith; penalizes side switching |
| **Real-time chat** (live debate) | Encourages speed over thought; rewards quick retorts |
| **Deleted comments** (rewriting history) | Undermines audit trail; prevents accountability |
| **Score hiding** (hiding disagree count) | Suppresses uncertainty; prevents informed evaluation |
| **AI-generated claims** (without disclosure) | Undermines evidence integrity |

---

## The Discora Identity

### What we are

```
A structured argument platform that helps people reach stronger conclusions
through evidence, challenge, inquiry, and consensus.
```

### What we are not

```
A social network, a messaging app, a debate game, a popularity contest,
an algorithm-driven feed, or a platform for dunking on opponents.
```

### Who this is for

- **Students** writing research papers who need to test their thesis against counterarguments
- **Professionals** making decisions who need to evaluate evidence from multiple perspectives
- **Communities** having difficult conversations who need structure to prevent chaos
- **Curious people** who want to understand complex topics by engaging with opposing views

### Who this is NOT for

- **Trolls** who want to provoke reactions without contributing evidence
- **Performers** who want an audience for their arguments
- **True believers** who will not consider evidence that contradicts their position
- **Content farmers** who want to extract engagement for profit

---

## Strategic Implications

### What to build first

1. **Dedicated debate layout** — debates need their own identity, not a discussion shell
2. **Side switching** — intellectual honesty needs to be visible and easy
3. **Inquiry layer** — neutral observers need a structured way to contribute
4. **Consensus system** — replace "winner" with "conclusion"
5. **Reputation rebalancing** — reward evidence quality, not just activity

### What to deprecate

1. **"Winner" terminology** — replace with "current conclusion" across the UI
2. **Scorecard (agree - disagree)** — replace with evidence quality indicators
3. **Neutral role** — replace with Inquiry

### What to never build

1. **Leaderboard** for debate wins
2. **Streaks** for daily participation
3. **Algorithmic recommendations** based on engagement
4. **Real-time chat** for debates
5. **Like/upvote-only voting** (without disagree option)
