# Consensus System

**Date**: 2026-06-11
**Status**: Design only — no implementation.
**Philosophy alignment**: Discora values "understanding over engagement" and "evidence over popularity." The current "winner" model contradicts this.

---

## 1. Current Model Audit

### Current Resolution

```
debates.resolution = {
  winner: "proposition" | "opposition" | "draw",
  summary: "..."
}
```

### Problems

| Problem | Example | Impact |
|---------|---------|--------|
| Framed as contest | "Proposition Wins" | Sets adversarial expectation from the start |
| Winner is primary | `winner` field first, `summary` optional | Conclusion is an afterthought |
| No iteration | Once resolved, conclusion is final | No refinement, no update |
| Binary outcome | Only one side "wins" | Real debates rarely have a clear victor |
| Popularity bias | Winner determined by creator vote, not evidence | Reflects opinion, not understanding |
| No evidence anchor | Resolution does not reference specific claims/evidence | Conclusion floats without support |
| No consensus measure | No way to know if participants actually agree | "Resolved" may not reflect agreement |

### Philosophy Mismatch

| Discora Principle | Current "Winner" Model | Alignment |
|-------------------|----------------------|-----------|
| Understanding over engagement | Winner declaration ends exploration | ✗ |
| Evidence over popularity | Creator picks winner regardless of evidence | ✗ |
| Structure over chaos | Resolution provides structure | ✓ (partial) |
| Discussion over algorithms | Human-decided winner | ✓ (but flawed) |

---

## 2. Proposed Model: Current Conclusion

Replace:

> **"Proposition Wins"**

With:

> **"Current Conclusion"**

### Data Model

```sql
alter table public.debates add column if not exists conclusion jsonb not null default 'null'::jsonb;
alter table public.debates add column if not exists conclusion_history jsonb not null default '[]'::jsonb;
drop column resolution;  -- migration: replace with conclusion
```

### `conclusion` Structure

```json
{
  "version": 3,
  "statement": "AI outperforms humans in repetitive knowledge work but not creative work.",
  "author_id": "uuid",
  "created_at": "2026-06-11T12:00:00Z",
  "evidence_anchors": [
    {
      "claim_id": "uuid",
      "evidence_id": "uuid",
      "relevance": "supporting" | "qualifying"
    }
  ],
  "sides_supporting": ["proposition"],
  "sides_questioning": ["opposition"],
  "confidence": "high" | "medium" | "low" | "unresolved",
  "summary": "Both sides agree that AI excels at pattern recognition and rote tasks. The disagreement centers on whether 'understanding' is required for creativity."
}
```

### `conclusion_history` Structure

```json
[
  {
    "version": 1,
    "statement": "AI is superior to humans in all knowledge work.",
    "author_id": "uuid",
    "created_at": "2026-06-01T10:00:00Z",
    "summary": "Initial conclusion before evidence review."
  },
  {
    "version": 2,
    "statement": "AI outperforms humans in narrow knowledge tasks but lacks general understanding.",
    "author_id": "uuid",
    "created_at": "2026-06-05T14:00:00Z",
    "summary": "Revised after opposition evidence about AI limitations."
  }
]
```

---

## 3. Conclusion Lifecycle

```
DRAFT  →  PROPOSED  →  ACCEPTED  →  SUPERSEDED
                         │
                         └──→ ARCHIVED (debate archived)
```

### States

| State | Meaning | Who Can Set |
|-------|---------|-------------|
| `null` | No conclusion yet | — |
| `draft` | Someone is working on a conclusion | Any participant |
| `proposed` | Conclusion is ready for review | Draft author |
| `accepted` | Conclusion is the current consensus | Author + quorum of participants |
| `superseded` | A newer version exists | Any participant (creates v2) |
| `archived` | Debate is archived | Debate creator / moderator |

### Transitions

```
null → draft:  User clicks "Propose Conclusion"
draft → proposed:  Author publishes for review
proposed → accepted:  Quorum reached + no blocking objections
proposed → draft:  Objection raised, sent back for revision
accepted → proposed:  New evidence triggers re-evaluation
accepted → superseded:  Newer accepted version exists
```

---

## 4. Conclusion Mechanics

### Proposing a Conclusion

Any participant can draft a conclusion. The proposal interface:

```
┌─────────────────────────────────────┐
│  Propose Conclusion                 │
│                                     │
│  Write:                             │
│  "AI outperforms humans in          │
│   repetitive knowledge work but not │
│   creative work."                   │
│                                     │
│  Anchor to evidence:                │
│  ┌─────────────────────────────────┐│
│  │ Select claims/evidence that     ││
│  │ support this conclusion...      ││
│  │                                 ││
│  │ ✓ Claim: "AI has 99.7%         ││
│  │   accuracy in radiology"        ││
│  │   └─ Evidence: PubMed 2025     ││
│  │ ✓ Claim: "AI cannot compose    ││
│  │   original literature"          ││
│  │   └─ Evidence: Turing test 2026││
│  └─────────────────────────────────┘│
│                                     │
│  Summary: (optional)                │
│  "Both sides agree on AI's          │
│   strengths; disagreement on        │
│   whether understanding matters"    │
│                                     │
│  [Cancel]    [Propose Draft]        │
└─────────────────────────────────────┘
```

### Evidence Anchoring

Every conclusion must reference at least one claim or evidence item. This ensures:
- Conclusions are grounded in the debate's substance
- Readers can trace the reasoning
- "Orphaned" conclusions (no anchors) are not allowed
- When evidence is retracted, the conclusion may need revision

### Acceptance Quorum

```sql
-- Conclusion accepted when:
-- 1. At least N% of participants from each side have approved
-- 2. No blocking objections from any side
-- 3. Minimum 2 participants per side (if both sides exist)

-- N = 60% or at least 3 participants per side, whichever is lower
```

| Scenario | Quorum | Rationale |
|----------|--------|-----------|
| 2 Support, 2 Challenge | 2 on each side (100%) | Small groups need consensus |
| 10 Support, 8 Challenge | 6 Support, 5 Challenge (60%) | Larger groups need majority |
| 1 Support, 0 Challenge | At least 1 Support (100%) | Uncontested debates need proposer majority |
| Inquiry participants | Not required for quorum | Inquirers don't take positions; their objections are advisory |

### Objection Handling

When a participant objects to a proposed conclusion:

```
1. Objection is recorded: "I disagree because..."
2. Status reverts to draft
3. Author revises or addresses the objection
4. Re-proposed for acceptance
5. If author cannot resolve: conclusion stays in draft
```

### Multiple Concurrent Drafts

Multiple participants can draft conclusions simultaneously. Only one can be accepted at a time (the most recent `accepted` version). Drafts are visible in a "Proposed Conclusions" section.

---

## 5. Consensus Voting

### Instead of "Agree/Disagree" on Conclusions

| Vote | Meaning | Effect |
|------|---------|--------|
| **I support this conclusion** | "This accurately represents the current state of understanding" | Counts toward acceptance quorum |
| **I think this needs revision** | "This is close but misses a key point" | Objection recorded; status → draft |
| **I disagree** | "This does not represent my understanding" | Blocking objection if from opposing side |

### Voting Display

```
┌─────────────────────────────────────┐
│  Current Conclusion (v3)            │
│                                     │
│  "AI outperforms humans in          │
│   repetitive knowledge work but not │
│   creative work."                   │
│                                     │
│  Proposed by Alice (Support)        │
│  Status: ACCEPTED                   │
│                                     │
│  Support: ✓✓✓✓ (4/4)               │
│  Challenge: ✓✓✓ (3/5) — 2 object   │
│  Inquiry: ✓✓✓✓✓ (5/5)              │
│                                     │
│  [✓ Support]  [⟳ Needs Revision]  │
│  [✗ Disagree]                       │
│                                     │
│  View previous versions: v1 → v2 → │
└─────────────────────────────────────┘
```

---

## 6. Conclusion Updates

### When New Evidence Arrives

1. New evidence is submitted that contradicts or significantly strengthens an aspect of the accepted conclusion
2. The system flags: "New evidence may affect this conclusion"
3. Participants can vote: "Trigger re-evaluation"
4. If quorum agrees: accepted → proposed; debate reopens for discussion
5. A new conclusion can be drafted incorporating the evidence

### Evidence Influence on Conclusion

```sql
-- Evidence influence score per conclusion version
-- Computed from anchored evidence:
--   score = weighted_agree_count - weighted_disagree_count
--   Only counts evidence attached to anchored claims
```

This provides a quantitative measure: "This conclusion is supported by evidence with a net approval of +24."

### Conclusion Stability

| Signal | Meaning |
|--------|---------|
| Version count | How many revisions (1 = initial, 3+ = thoroughly debated) |
| Time since last revision | Stability: 30+ days without change suggests settled |
| Objection count per version | Controversy: high objections = low consensus |
| Evidence anchor count | Substantiation: 5+ anchors = well-supported |
| Side agreement ratio | Consensus breadth: both sides ≥ 80% = strong consensus |

---

## 7. UI Integration

### In the Debate Room

The conclusion displays in a persistent position — always visible regardless of which tab is active:

```
┌─────────────────────────────────────────┐
│  Motion: "AI is superior to humans"     │
│                                         │
│  Current Conclusion: v3 (Accepted)      │
│  "AI outperforms humans in repetitive   │
│   knowledge work but not creative work."│
│                                         │
│  [View Details]  [Propose Revision]     │
│                                         │
│  Support: ✓✓✓✓    Challenge: ∼✓✓✗✗✓   │
└─────────────────────────────────────────┘
```

### In the Debate Header

Replace the winner banner:

```
Current:
  [Trophy] Resolved: Proposition wins
  Summary: ...

Proposed:
  [Lightbulb] Conclusion: v3 (Accepted)
  "AI outperforms humans..."
```

### In the Browse Feed

```
Current:
  Resolution info (if resolved)

Proposed:
  Conclusion preview (truncated to 100 chars)
  Confidence: High | Medium | Low
  Version: v3
```

---

## 8. Moderation Integration

| Action | Moderation Behavior |
|--------|-------------------|
| Conclusion proposed with false evidence anchor | Moderator removes anchor; conclusion updated to reflect |
| Bad-faith conclusion (trolling) | Moderator can archive the conclusion version; user reported |
| Conclusion on moderated content | If anchored evidence is hidden, conclusion must remove anchor or be archived |
| Targeted harassment via conclusion | Standard report flow; conclusion frozen pending review |

---

## 9. Migration Path

| Step | Action | Impact |
|------|--------|--------|
| 1 | Add `conclusion` and `conclusion_history` columns to `debates` | Backward compatible — existing `resolution` remains |
| 2 | Create UI for proposing, voting, accepting | New feature — no existing data affected |
| 3 | Migrate existing `resolution` → `conclusion` | Optional: convert old resolutions to initial conclusions |
| 4 | Deprecate `resolution` column | After all existing debates have been migrated |
| 5 | Remove `resolution` column | Breaking change — only after migration complete |

### Migration of Existing Resolutions

```sql
-- One-time migration for existing resolved debates
update public.debates
set
  conclusion = jsonb_build_object(
    'version', 1,
    'statement', resolution->>'summary',
    'author_id', created_by,  -- original room creator
    'created_at', updated_at,
    'evidence_anchors', '[]'::jsonb,
    'sides_supporting', case
      when resolution->>'winner' = 'proposition' then '["proposition"]'::jsonb
      when resolution->>'winner' = 'opposition' then '["opposition"]'::jsonb
      else '[]'::jsonb
    end,
    'sides_questioning', case
      when resolution->>'winner' = 'proposition' then '["opposition"]'::jsonb
      when resolution->>'winner' = 'opposition' then '["proposition"]'::jsonb
      else '[]'::jsonb
    end,
    'confidence', 'medium',
    'summary', resolution->>'summary'
  ),
  conclusion_history = '[]'::jsonb
where status = 'resolved'
  and resolution is not null
  and conclusion is null;
```

---

## 10. Philosophy Alignment

| Principle | Winner Model | Conclusion Model |
|-----------|-------------|------------------|
| Understanding over engagement | Ends exploration | Ongoing refinement |
| Evidence over popularity | Creator's choice | Evidence-anchored |
| Structure over chaos | Simple binary | Structured lifecycle |
| Discussion over algorithms | Human decision | Evidence-grounded consensus |

**The conclusion model directly serves the mission: "to help people reach stronger conclusions."** It replaces "who argued better" with "what we now understand."
