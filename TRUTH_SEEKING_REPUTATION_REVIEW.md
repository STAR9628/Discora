# Truth-Seeking Reputation Design Review

**Date**: 2026-06-10
**Purpose**: Evaluate whether the current reputation model rewards truth-seeking behaviors or merely popularity/activity.

---

## Current Model — What It Rewards

### Positive Factors
| Factor | Points | Rewards | Truth-Seeking? |
|--------|--------|---------|----------------|
| Claim created | +10 each | Activity | PARTIAL — claims are the unit of discussion |
| Evidence submitted | +15 each | Research + sourcing | **YES** — highest point value |
| Question asked | +5 each | Inquiry | **YES** — questioning improves discourse |
| High consensus bonus | Up to +20 per claim | Agreement | **NO** — rewards popularity, not correctness |
| Net agree votes | +2 per net agree | Popularity | **NO** — majority may be wrong |
| Debate participation | +5 each | Engagement | PARTIAL |
| Debate won | +25 each | Winning | **NO** — winning ≠ being correct |
| Debate created | +15 each | Leadership | PARTIAL |

### Negative Factors
| Factor | Points | Penalizes | Truth-Seeking? |
|--------|--------|-----------|----------------|
| Net disagree votes | -1 per net disagree | Unpopularity | **NO** — penalizes minority viewpoints |
| Debate lost | -5 each | Losing | **NO** — losing argument may still be valid |
| Retracted claim | -20 each | Error correction | **HARMFUL** — penalizes intellectual honesty |
| Retracted evidence | -15 each | Error correction | **HARMFUL** — penalizes correction |

---

## Truth-Seeking Evaluation

### 1. User changes side after strong evidence
- **Current**: Side switch creates another `DEBATE_JOINED` (+5) event. No specific reward for changing sides.
- **Truth-seeking value**: HIGH — changing position based on evidence is the ESSENCE of truth-seeking
- **Current impact**: Technically +5 (the duplicate event), but no positive signal
- **Recommendation**: Create new event `SIDE_SWITCHED` with +10 to +20 points. Add a `"side_switched": true` flag to timeline. Higher award if the user provides evidence that caused the switch.

### 2. User retracts incorrect claim
- **Current**: `CLAIM_RETRACTED` (-20). User is PUNISHED for correcting themselves.
- **Truth-seeking value**: CRITICAL — retracting incorrect claims is the most honest action possible
- **Current impact**: Actively discourages corrections
- **Recommendation**: Remove retraction penalty OR replace with `CLAIM_CORRECTED` with +10 (net change: +10 - 10 = 0 or positive). Require a correction statement in metadata explaining why.

### 3. User adds evidence that weakens their own side
- **Current**: `EVIDENCE_SUBMITTED` (+15). Same as any evidence. No bonus for intellectual honesty.
- **Truth-seeking value**: HIGH — presenting contradictory evidence to one's own position is the gold standard of intellectual honesty
- **Current impact**: Same reward as any evidence submission
- **Recommendation**: Create `EVIDENCE_SELF_CONTRADICTED` event with +20 if evidence direction='contradict' AND the user is on the debate side being contradicted. Requires detecting: evidence author = debate participant on contradicted side.

### 4. User asks question that resolves a dispute
- **Current**: `QUESTION_ASKED` (+5). Same as any question.
- **Truth-seeking value**: HIGH — a well-placed question can reframe the entire discussion
- **Current impact**: No differentiation from low-effort questions
- **Recommendation**: Create `QUESTION_RESOLVED_DISPUTE` event with +15 bonus when a question leads to a resolution. Detection requires: question precedes a related claim resolution or consensus shift (complex — requires claim-relation analysis).

### 5. User acknowledges stronger opposing argument
- **Current**: No mechanism. No reward.
- **Truth-seeking value**: VERY HIGH — acknowledging the strength of an opposing argument is the rarest and most valuable intellectual behavior
- **Recommendation**: Create `OPPOSING_ACKNOWLEDGED` event with +25 (highest single-event reward). Actions that could trigger:
  - User applies `refines` relation to an opposing claim (existing claim_relations system)
  - User adds evidence supporting the opposing side's claim
  - User explicitly marks "this changed my view" on a claim

---

## Proposed New Events

| Event | Points | Trigger | Truth-Seeking Value |
|-------|--------|---------|-------------------|
| `CLAIM_CORRECTED` | +10 | User retracts claim AND provides correction metadata | Critical — currently penalized |
| `SIDE_SWITCHED` | +15 | Debate participant changes side | High |
| `EVIDENCE_SELF_CONTRADICTED` | +20 | User submits evidence contradicting own side | Very High |
| `QUESTION_CLARIFIED` | +8 | Question is marked as "resolved" by another participant | Medium |
| `OPPOSING_ACKNOWLEDGED` | +25 | User marks opposing claim as "changed my view" or applies `refines` relation | Highest |
| `CONSENSUS_BUILT` | +15 | User's claim reaches >80% consensus with >10 votes | Medium — replaces current consensus bonus |

---

## Negative Factor Changes

| Current | Issue | Proposed |
|---------|-------|----------|
| `RETRACT_CLAIM: -20` | Penalizes honesty | Remove or replace with `CLAIM_CORRECTED: +10` |
| `DISAGREE_VOTE: -1` | Penalizes minority views | Remove penalty. Keep +2 for agrees (reward consensus builders, don't punish contrarians). |
| `DEBATE_LOST: -5` | Penalizes losing side | Remove. Winning debate is not about objective truth. Debate participants should earn for participation, not be penalized for losing. |

---

## Revised Scoring Model

```
POSITIVE (activity-neutral):
  Claim created:           +10
  Evidence submitted:      +15
  Question asked:          +5
  Debate participated:     +5
  Debate created:          +15

POSITIVE (truth-seeking):
  Claim corrected:         +10     (replaces retraction penalty)
  Side switched:           +15
  Self-contradicted:       +20
  Opposing acknowledged:   +25
  Consensus built:         +15     (remains, with higher threshold)
  Agree votes:             +2      (remains)

NEUTRAL (removed):
  Disagree votes:           0      (was -1)
  Debate lost:              0      (was -5)
  Retraction:               0      (was -20)

NEGATIVE (remains only for abuse):
  Retracted by moderator:  -50     (new — for moderated content removal)
  Flagged resolved_hidden: -30     (new — for content hidden by moderation)
```

This model:
1. Removes all penalties for unpopular opinions
2. Rewards intellectual honesty (corrections, side switches, acknowledging opponents)
3. Keeps rewards for quality contributions (evidence, questions)
4. Only penalizes for moderation actions (abuse, not opinion)

---

## Implementation Notes

**Do NOT implement yet.** This is a design proposal.

If implemented, the following changes would be needed:

1. **Migration**: Add new event types to `reputation_events` (no CHECK constraint needed — event_type is free text)
2. **Triggers**: No new DB triggers needed for most events (they're action-based, not table-based)
3. **Claim correction detection**: Modify `retractClaim` service to accept optional `correctionStatement`. Create `CLAIM_CORRECTED` event if correction provided, else keep `CLAIM_RETRACTED` with reduced or zero penalty.
4. **Side switch detection**: Modify `joinDebate` to detect side change and create `SIDE_SWITCHED` event instead of (not in addition to) duplicate `DEBATE_JOINED`.
5. **Evidence self-contradict detection**: In evidence submission trigger, check if evidence direction='contradict' and the user has a debate_participant row for the same room on the contradicted side.
6. **Opposing acknowledge detection**: Repurpose `refines` relation type or add new relation type `acknowledges` to `claim_relations`.
7. **Moderation penalties**: Add AFTER UPDATE trigger on `moderation_flags` when status changes to `resolved_hidden`.

---

## Summary

| Behavior | Currently Rewarded? | Truth-Seeking Alignment |
|----------|--------------------|------------------------|
| Activity (create anything) | YES (+10 to +15) | PARTIAL — necessary but insufficient |
| Research (evidence) | YES (+15) | **GOOD** |
| Inquiry (questions) | YES (+5) | **GOOD** |
| Popularity (votes) | YES (+2 per agree) | MIXED — agree reward is OK, disagree penalty is bad |
| Winning arguments | YES (+25) | **BAD** — doesn't correlate with truth |
| Changing sides | Accidental (+5) | **MISSED OPPORTUNITY** — should be explicitly rewarded |
| Correcting errors | PENALIZED (-20) | **ACTIVELY HARMFUL** — should be rewarded |
| Acknowledging opponents | NOTHING | **MISSED OPPORTUNITY** — highest-value action, no reward |
| Contradicting own side | Same as normal evidence | **MISSED OPPORTUNITY** — should be bonus |

**Overall**: The current model is activity-and-popularity-focused. It accidentally rewards some truth-seeking behaviors (evidence, questions) but penalizes or ignores the most important ones (corrections, side switches, acknowledging opponents).
