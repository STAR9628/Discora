# Profile Debate Statistics Audit

**Date**: 2026-06-10
**Scope**: Every displayed metric on `/u/[username]` — data source, query, calculation, and accuracy.

---

## Profile Page Layout

The profile page (`src/app/u/[username]/page.tsx`) renders:
1. **Profile header** — avatar, @username, bio, join date
2. **Activity Statistics** — 4 StatCards: Discussions, Debates, Claims, Evidence Added
3. **ProfileReputationSection** — reputation score, badges, expertise, timeline, breakdown

---

## Metrics Audit

### Discussions
- **Displayed value**: `contributions.discussionCount`
- **Data source**: `rooms` table, `room_type = 'discussion'`, `created_by = userId`
- **Query**: `reputation-service.ts:202-206`
- **Accuracy**: Correct — counts all discussions created by user
- **Severity**: PASS

### Debates
- **Displayed value**: `contributions.debateCount`
- **Data source**: `rooms` table, `room_type = 'debate'`, `created_by = userId`
- **Query**: `reputation-service.ts:207-211`
- **Accuracy**: PARTIAL — only counts debates **created** by user, not debates **joined**
- **User expectation**: "Debates" implies total involvement (created + participated)
- **Severity**: HIGH — misleading metric name

### Claims
- **Displayed value**: `activeClaims = contributions.claims.filter(c => !c.isRetracted).length`
- **Data source**: `discussion_claims` view, `created_by = userId`
- **Query**: `reputation-service.ts:186-191`
- **Accuracy**: Correct
- **Severity**: PASS

### Evidence Added
- **Displayed value**: `activeEvidence = contributions.evidence.filter(e => !e.isRetracted).length`
- **Data source**: `discussion_evidence` view, `created_by = userId`
- **Query**: `reputation-service.ts:192-196`
- **Accuracy**: Correct
- **Severity**: PASS

---

## Missing Debate Metrics

The following metrics exist in `UserContributions` but are **NOT displayed** on the profile page:

### debates joined (participations)
- **Field**: `contributions.debateParticipations.length`
- **Exists in**: `reputation-service.ts:260`
- **Displayed**: NO — missing from profile page
- **Severity**: HIGH

### proposition wins
- **Field**: `contributions.debateWins` (requires filtering by side)
- **Exists in**: `reputation-service.ts:235-251` (computed)
- **Displayed**: NO — missing entirely
- **Severity**: HIGH

### opposition wins
- **Same field as above**: Side-specific breakdown not computed
- **Displayed**: NO — missing entirely
- **Severity**: HIGH

### total debate claims
- **Field**: Computable from `contributions.claims.filter(c => c.debateSide)`
- **Displayed**: NO — missing
- **Severity**: MEDIUM

### total debate evidence
- **Field**: Computable from contributions evidence filtered by room type
- **Displayed**: NO — missing
- **Severity**: MEDIUM

### active debates
- **Field**: Needs to cross-reference debate participants with debate status
- **Displayed**: NO — missing
- **Severity**: MEDIUM

### resolved debates
- **Same as above**
- **Displayed**: NO — missing
- **Severity**: MEDIUM

### debate win/loss record
- **Field**: `debateWins` / `debateLosses`
- **Displayed**: NO — missing
- **Severity**: HIGH

---

## UserCredibilityCard (within ProfileReputationSection)

- **Displays**: Reputation score, Claims count, Evidence count, Questions count, Agrees count, top 4 expertise areas
- **Missing**: Debate participation metrics (debates joined, debates won)
- **Severity**: MEDIUM — card title is "Credibility" but omits debate credibility signals

---

## Badge System Audit

### Badge Definitions (`reputation-utils.ts:computeTrustBadges`)

| Badge | Condition | Progress Persistence | earnedAt |
|-------|-----------|---------------------|----------|
| First Steps (first-claim) | ≥1 claim | None — recomputed each visit | Never set |
| Evidence Builder (evidence-builder) | ≥5 evidence | None | Never set |
| Question Explorer (question-explorer) | ≥5 questions | None | Never set |
| Consensus Builder (consensus-builder) | Rep ≥200 | None | Never set |
| Research Contributor (research-contributor) | ≥10 evidence | None | Never set |
| Top Analyst (top-analyst) | ≥20 claims + Rep ≥300 | None | Never set |
| Prolific Contributor (prolific-contributor) | ≥50 total contributions | None | Never set |
| Debater (debate-participant) | ≥1 debate participation | None | Never set |
| Debate Champion (debate-champion) | ≥3 debate wins | None | Never set |
| Debate Creator (debate-creator) | ≥3 debates created | None | Never set |

### Audit Findings

- **Progress persistence**: FAIL — badge progress is recomputed from scratch on every profile visit. No database storage of earned badges or progress. If a user has 4 evidence today and 5 tomorrow, the badge appears as earned only on the second visit.
- **`earnedAt`**: FAIL — `TrustBadge.earnedAt` is typed as `string | undefined` but NEVER populated. All earned badges show no timestamp.
- **Unlock conditions**: PASS — conditions correctly map to verified data fields.
- **Actual queries**: PASS — relies on the same `UserContributions` data that is verified above.
- **Current progress tracking**: FAIL — only computed client-side, not persisted.

### Root Cause
- Badges are computed purely client-side (`computeTrustBadges`) from raw contributions
- No `user_badges` table exists in the database
- No RPC to persist badge state after earning

---

## Expertise Areas Audit

### Scoring Logic (`reputation-utils.ts:computeExpertise`)

| Source | Points | Topic Mapping |
|--------|--------|---------------|
| Claim (fact) | +3 | Science |
| Claim (prediction) | +3 | Economics |
| Claim (proposal) | +3 | Politics |
| Claim (observation) | +3 | Technology |
| Claim (opinion) | +3 | General |
| Evidence (scientific) | +2 | Science |
| Evidence (statistical) | +2 | Economics |
| Evidence (expert) | +2 | Health |
| Evidence (documentary/historical) | +2 | Politics |
| Evidence (technological) | +2 | Technology |
| Evidence (other types) | +2 | General |
| Questions (all types) | +1 | General |

### Audit Findings

- **Source**: PASS — data comes from verified `UserContributions.claims`, `.evidence`, `.questions`
- **Weighting**: PARTIAL — point values are arbitrary (3/2/1) with no empirical basis
- **Updates**: PASS — recomputed on every profile visit
- **Category attribution**: PARTIAL — mapping is hardcoded and lossy:
  - `opinion` claims → "General" (no differentiation)
  - `ethical`, `cultural`, `logical`, `visual`, `experiential` evidence → "General"
  - No expertise areas from debate motion titles
  - Only 6 possible areas: Science, Economics, Politics, Technology, Health, General
- **Accuracy of "Science = 3 pts"**: PASS for fact claims — the computation is correctly executed
- **Severity**: LOW — expertise is an informative display, not a core mechanic

---

## Timeline Audit

### Contribution Timeline

| Item Type | Included? | Data Source |
|-----------|-----------|-------------|
| Claims | YES | `contributions.claims` mapped in `useReputation.ts:41-53` |
| Evidence | YES | `contributions.evidence` mapped in `useReputation.ts:54-65` |
| Questions | YES | `contributions.questions` mapped in `useReputation.ts:66-77` |
| Debate actions (join, create, resolve) | NO | Missing — `"debate"` type defined but never instantiated |

### Audit Findings

- **Claims timeline**: PASS — correctly displays creation date, content, room link, retracted state
- **Evidence timeline**: PASS — same as claims
- **Questions timeline**: PASS — same as claims
- **Debate actions**: FAIL — the `ContributionTimelineItem` type includes `"debate"` type and the timeline component renders it, but `useReputation.ts` never creates debate-type entries. Users who participate in debates see no record on their timeline.
- **Severity**: LOW — timeline is informative, but debate activity is invisible here
- **Root cause**: `useReputation.ts:41-78` only iterates `claims`, `evidence`, `questions`. No code to build items from `debateParticipations`, `debateCount`, `debateWins`, or `debateLosses`.

---

## Summary

| Metric | Status | Severity |
|--------|--------|----------|
| Discussions count | PASS | — |
| Debates count (created) | PARTIAL | HIGH |
| Claims count (active) | PASS | — |
| Evidence count (active) | PASS | — |
| Debates joined | FAIL — not displayed | HIGH |
| Proposition wins | FAIL — not displayed | HIGH |
| Opposition wins | FAIL — not displayed | HIGH |
| Total debate claims | FAIL — not displayed | MEDIUM |
| Total debate evidence | FAIL — not displayed | MEDIUM |
| Active debates | FAIL — not displayed | MEDIUM |
| Resolved debates | FAIL — not displayed | MEDIUM |
| Debate win/loss record | FAIL — not displayed | HIGH |
| Badge progress persistence | FAIL — not persisted | MEDIUM |
| Badge earnedAt timestamps | FAIL — never set | LOW |
| Expertise scoring accuracy | PASS — correct for hardcoded mapping | — |
| Timeline — claims/evidence/questions | PASS | — |
| Timeline — debate actions | FAIL — not included | LOW |

**Findings**: **2 PASS, 1 PARTIAL, 11 FAIL**

---

## Root Causes

1. **Debate metrics not exposed**: `UserContributions` already contains `debateParticipations`, `debateWins`, `debateLosses` but the profile page only uses `debateCount`.
2. **No side-specific win tracking**: `getUserContributions` computes `debateWins`/`debateLosses` but doesn't distinguish proposition vs opposition wins.
3. **Badges have no persistence layer**: No database table stores earned badge state.
4. **Timeline only handles 3 content types**: The `useReputation` hook loops only over claims, evidence, questions.

---

## Recommended Fix Priority

1. **HIGH**: Replace "Debates" stat card with total debates participated (joined or created)
2. **HIGH**: Add debate win/loss record stat cards (Wins / Losses / Win Rate)
3. **MEDIUM**: Add debate breakdown section showing active/resolved, side-specific wins
4. **MEDIUM**: Create `user_badges` table to persist earned badges with earnedAt
5. **LOW**: Add debate participation entries to contribution timeline
6. **LOW**: Expand expertise mapping to cover all evidence types and debate motions
