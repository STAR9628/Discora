# Reputation Integration Audit

**Date**: 2026-06-10
**Scope**: Complete reputation pipeline — user action → reputation update → display
**Architecture**: All reputation is computed **client-side** from raw contribution data. No server-side triggers exist.

---

## Architecture Overview

```
User Action (create claim, vote, retract, etc.)
  → Database row written (claims, evidence, questions, debate_participants, etc.)
  → NO server-side trigger or RPC fires
  → NO reputation table updated
  → Only when profile page is visited:
      getUserContributions() → computeReputation() → saveReputationSnapshot() (client-side, rate-limited)
```

The database stores:
- Raw contribution data (claims, evidence, questions, debate_participants)
- `user_reputation_snapshots` — immutable history, inserted from client only

---

## Claims Pipeline

### Create claim
- **Action path**: `discussion-service.ts:createClaim()` → `INSERT INTO claims`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +10 per active claim (`reputation-utils.ts:35-37`)
- **Severity**: CRITICAL
- **Root cause**: Reputation is computed client-side, not updated at action time
- **Affected files**:
  - `src/features/reputation/reputation-utils.ts:35-37`
  - `src/features/reputation/hooks/use-reputation.ts:28`
  - `src/features/reputation/services/reputation-service.ts:180-264`

### Receive agree votes
- **Action path**: `discussion-service.ts:castClaimVote()` → UPSERT into `claim_votes`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +2 per net agree (`reputation-utils.ts:89-104`)
- **Severity**: CRITICAL
- **Root cause**: See above; no vote → reputation trigger
- **Affected files**: `src/features/reputation/reputation-utils.ts:89-104`

### Receive disagree votes
- **Action path**: Same as agree votes
- **Reputation impact**: NONE at action time
- **On profile recompute**: -1 per net disagree (`reputation-utils.ts:95-98`)
- **Severity**: CRITICAL

### Retract claim
- **Action path**: `discussion-service.ts:retractClaim()` → `UPDATE claims SET is_retracted = true`
- **Reputation impact**: NONE at action time
- **On profile recompute**: -20 per retracted claim (`reputation-utils.ts:106-109`)
- **Severity**: CRITICAL

### Edit claim
- **Action**: Claims are immutable. Only `is_retracted` changes allowed (trigger prevents other edits)
- **Reputation impact**: NONE (no editing possible)
- **Severity**: N/A — correct behavior

---

## Evidence Pipeline

### Submit evidence
- **Action path**: `discussion-service.ts:createEvidence()` → `INSERT INTO evidence` + `INSERT INTO claim_evidence`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +15 per active evidence (`reputation-utils.ts:39-41`)
- **Severity**: CRITICAL

### Receive votes on evidence
- **Action path**: `discussion-service.ts:castEvidenceVote()` → UPSERT into `evidence_votes`
- **Reputation impact**: NONE at action time or on recompute
- **On profile recompute**: Evidence vote quality is NOT factored into reputation
- **Severity**: MEDIUM
- **Root cause**: `computeReputation` handles claim votes but omits evidence votes entirely
- **Affected files**: `src/features/reputation/reputation-utils.ts` — evidence vote factors absent

### Link evidence to claims
- **Action path**: Done during `createEvidence` — not a separate action
- **Reputation impact**: NONE
- **Severity**: N/A (part of evidence creation)

---

## Questions Pipeline

### Ask question
- **Action path**: `discussion-service.ts:createQuestion()` → `INSERT INTO questions`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +5 per active question (`reputation-utils.ts:43-45`)
- **Severity**: CRITICAL

### Receive answers
- **Action path**: No formal "answer" entity exists in the system
- **Reputation impact**: NONE
- **Severity**: N/A — feature not implemented (planned for future sprint)

### Participate in inquiry
- **Reputation impact**: NONE
- **Severity**: N/A — inquiry/QA system is not an implemented feature

---

## Debate Participation Pipeline

### Join proposition
- **Action path**: `debate-service.ts:joinDebate()` → UPSERT into `debate_participants` with `side = 'proposition'`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +5 per debate participation (`reputation-utils.ts:53-57`)
- **Severity**: CRITICAL

### Join opposition
- **Action path**: Same as join proposition with `side = 'opposition'`
- **Reputation impact**: NONE at action time
- **On profile recompute**: +5 per debate participation (no side distinction)
- **Severity**: CRITICAL

### Create debate claims
- **Action path**: Same as claim creation with `debate_side` set
- **Reputation impact**: NONE at action time
- **On profile recompute**: +10 per debate claim (same as normal claim)
- **Severity**: CRITICAL

### Win debate
- **Action path**: `resolve_debate` RPC updates `debates.status` + `rooms.status`
- **Reputation impact**: NONE at resolution time
- **On profile recompute**: +25 per win (`reputation-utils.ts:59-63`)
- **Severity**: CRITICAL
- **Note**: Win/loss determined by matching participant side to resolution winner. Works correctly on recompute.

### Lose debate
- **Action path**: Same as win
- **Reputation impact**: NONE at resolution time
- **On profile recompute**: -5 per loss (`reputation-utils.ts:65-69`)
- **Severity**: CRITICAL

### Participate in resolved debate (draw)
- **Action path**: Resolution with `winner: 'draw'`
- **Reputation impact**: NONE at action time or on recompute
- **On profile recompute**: No specific draw reputation factor exists
- **Severity**: LOW — intentional design choice, no penalty/credit for draws

---

## Resolution Path

### Creator resolves debate
- **Action path**: `debate-service.ts:resolveDebate()` → calls `resolve_debate` RPC
- **Winner gains**: NONE at resolution time; +25 on next profile recompute
- **Loser loses**: NONE at resolution time; -5 on next profile recompute
- **Resolution updates snapshots**: NO — snapshots only updated when profile is next visited (rate-limited to 5 min)
- **Severity**: CRITICAL

---

## Snapshot System

### `user_reputation_snapshots` table
- **Rows created**: Via `saveReputationSnapshot()` called from `useReputation` hook (client-side, rate-limited to 5 minutes)
- **Rows updated**: NEVER — no UPDATE policy exists, snapshots are immutable
- **Charts populated**: `ReputationHistoryChart` reads from `getReputationHistory()` — works correctly when snapshots exist
- **Profile pages consume data**: Yes — `ProfileReputationSection` → `useReputation` → `getReputationHistory`
- **Batch reputation**: `use-batch-reputation` → `getLatestReputationSnapshots` — reads stale snapshot scores for inline AuthorTrustSignal

### Dead code analysis
- **`refinementReceivedBonus`**: Defined in `DEFAULT_OPTIONS` (5 pts) but NEVER referenced in `computeReputation`. This is dead configuration.
- **`ContributionTimelineItem.type = "debate"`**: Type definition includes `"debate"` value, timeline component renders it, but `useReputation` hook NEVER creates debate-type timeline items. Only claim, evidence, question items are created.

### Snapshot staleness
| Query | Source | Freshness |
|-------|--------|-----------|
| Profile reputation | Live recompute from raw data | Fresh (but expensive) |
| Reputation history | `user_reputation_snapshots` | Stale (last profile visit) |
| Batch reputation (AuthorTrustSignal) | `user_reputation_snapshots` | Stale (last profile visit) |
| Leaderboard | Live aggregation | Fresh for claims/evidence/questions, missing debate data |

---

## PASS / FAIL / PARTIAL Summary

| Pathway | Status | Severity | Notes |
|---------|--------|----------|-------|
| Create claim → reputation | FAIL | CRITICAL | No action-time update |
| Receive agrees → reputation | FAIL | CRITICAL | No action-time update |
| Receive disagrees → reputation | FAIL | CRITICAL | No action-time update |
| Retract claim → reputation | FAIL | CRITICAL | No action-time update |
| Edit claim | PASS | — | Immutable by design |
| Submit evidence → reputation | FAIL | CRITICAL | No action-time update |
| Evidence votes → reputation | FAIL | MEDIUM | Missing from computeReputation entirely |
| Link evidence to claims | PASS | — | Done during creation |
| Ask question → reputation | FAIL | CRITICAL | No action-time update |
| Receive answers | N/A | — | Feature not implemented |
| Join debate → reputation | FAIL | CRITICAL | No action-time update |
| Create debate claims → reputation | FAIL | CRITICAL | No action-time update |
| Win debate → reputation | FAIL | CRITICAL | No action-time update |
| Lose debate → reputation | FAIL | CRITICAL | No action-time update |
| Draw debate → reputation | PASS | — | Intentional zero-impact |
| Creator resolves → winner gains | FAIL | CRITICAL | Not applied at resolution time |
| Creator resolves → loser loses | FAIL | CRITICAL | Not applied at resolution time |
| Snapshots created | PARTIAL | HIGH | Only on profile visit, rate-limited |
| Snapshots updated | PASS | — | Immutable by design |
| Charts populated | PASS | — | When snapshots exist |
| Profile consumes snapshots | PASS | — | Via useReputation hook |
| Batch reputation (inline badges) | PARTIAL | HIGH | Reads stale snapshots |
| Leaderboard reputation | FAIL | CRITICAL | Missing debate/participation data |
| `discussionCount` vs `debateCount` bug | FAIL | MEDIUM | Line 47: wrong condition field |
| `refinementReceivedBonus` dead code | FAIL | MEDIUM | Defined but never used |
| Timeline missing debate actions | FAIL | LOW | `"debate"` type defined but never used |

**Findings**: **15 FAIL, 1 PARTIAL, 5 PASS, 2 N/A**

---

## Root Causes (All Paths)

Every reputation pathway shares the same root cause:

1. **No server-side triggers**: The database has no `AFTER INSERT/UPDATE/DELETE` triggers on claims, evidence, questions, votes, debate_participants, or debates tables that would call a reputation recalculation function.
2. **No dedicated reputation RPC**: There is no `recalculate_reputation(user_id)` database function.
3. **Client-only computation**: `computeReputation()` in `reputation-utils.ts` is a pure client-side function. `saveReputationSnapshot()` runs from the browser.
4. **Passive snapshot creation**: Snapshots are only created when a user visits a profile page — not when actions happen.

---

## Recommended Fix Priority

1. **CRITICAL**: Create `recalculate_reputation(user_id)` RPC in PostgreSQL that performs the same logic as `computeReputation()` server-side
2. **CRITICAL**: Create database triggers on claims, evidence, questions, claim_votes, evidence_votes, debate_participants, debates to call the RPC
3. **HIGH**: Fix leaderboard to include debate participation data
4. **MEDIUM**: Fix `discussionCount` → `debateCount` bug at `reputation-utils.ts:47`
5. **MEDIUM**: Add evidence vote reputation factors to `computeReputation`
6. **MEDIUM**: Add debate actions to contribution timeline
7. **LOW**: Remove dead `refinementReceivedBonus` config or implement it
8. **LOW**: Persist badge `earnedAt` timestamps
