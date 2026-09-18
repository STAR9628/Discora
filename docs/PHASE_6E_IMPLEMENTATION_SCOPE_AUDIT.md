# PHASE 6E IMPLEMENTATION SCOPE AUDIT

**Date:** 2026-09-07  
**Status:** AUDIT ONLY — NO CORRECTIONS APPLIED  
**Scope:** Verify actual working-tree changes against approved Phase 6E product model

---

## 1. EXECUTIVE SUMMARY

The working tree contains **38 modified files, 9 new untracked source files, 1 new migration, and multiple documentation files**. A substantial portion of these changes implement product behavior that directly contradicts the approved Phase 6E model. The most serious finding is the introduction of a persistent room-level "Concluded" marker (`concluded_at`) via a new database migration and RPC, which the approved specification explicitly prohibited.

**Bottom line:** Phase 6E was specified as "PRODUCT REASONING AND SPECIFICATION ONLY — NO IMPLEMENTATION." Implementation occurred anyway, and it includes unapproved product scope.

---

## 2. EXPECTED PHASE 6E SCOPE

Per `docs/PHASE_6E_APPROVED_PRODUCT_SPEC.md`:

- Winner/Loser model: RETIRED
- Draw: RETIRED
- Winner-based reputation: RETIRED
- Historical winner data: PRESERVED AS LEGACY
- Votes: DESCRIPTIVE ONLY, must NOT influence State of Understanding
- State of Understanding: EVIDENCE-LED
- Participant Interpretation: OPTIONAL, NOT official truth
- NO acknowledgment mechanism
- NO consensus voting
- NO reopen workflow
- NO automatic reopening
- **NO persistent "Concluded" Debate lifecycle state**
- **NO freeze-on-conclusion**
- Discussion remains conversation-first
- Debate remains structured examination

---

## 3. ACTUAL CHANGES DETECTED

### 3.1 Modified Files (38)
- `src/app/debates/[slug]/page.tsx`
- `src/app/u/[username]/page.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/features/debates/components/browse-debates.tsx`
- `src/features/debates/components/debate-header-v2.tsx`
- `src/features/debates/components/debate-header.tsx`
- `src/features/debates/components/debate-premise.tsx`
- `src/features/debates/components/debate-resolution.tsx`
- `src/features/debates/components/debate-room.tsx`
- `src/features/debates/components/debate-scorecard.tsx` (DELETED)
- `src/features/debates/components/debate-section-nav.tsx`
- `src/features/debates/components/debate-side-picker.tsx`
- `src/features/debates/hooks/use-debates.ts`
- `src/features/debates/services/debate-service.ts`
- `src/features/discussions/components/claim-list.tsx`
- `src/features/discussions/components/claim-relation-dialog.tsx`
- `src/features/discussions/components/comment-item.tsx`
- `src/features/discussions/components/discussion-health.tsx`
- `src/features/discussions/components/discussion-intelligence.tsx`
- `src/features/discussions/components/discussion-summary.tsx`
- `src/features/discussions/components/evidence-section.tsx`
- `src/features/discussions/components/graph-view.tsx`
- `src/features/discussions/components/map-tab.tsx`
- `src/features/discussions/components/question-list.tsx`
- `src/features/discussions/components/room-evidence-section.tsx`
- `src/features/discussions/components/room-evidence-tab.tsx`
- `src/features/discussions/components/section-nav.tsx`
- `src/features/discussions/components/state-of-understanding.tsx`
- `src/features/discussions/components/understanding-utils.ts`
- `src/features/discussions/services/discussion-service.ts`
- `src/features/discussions/types.ts`
- `src/features/homepage/components/logged-in-homepage.tsx`
- `src/features/reputation/components/credibility-tooltip.tsx`
- `src/features/reputation/components/user-credibility-card.tsx`
- `src/features/reputation/reputation-utils.ts`
- `src/features/reputation/services/reputation-service.ts`
- `src/features/reputation/types.ts`
- `src/types/domain.ts`

### 3.2 New Untracked Files (9 source/files)
- `src/features/debates/components/argument-evidence-overview.tsx`
- `supabase/migrations/202606230001_retire_winner_resolution_model.sql`
- `playwright.config.ts`
- `tests/` (directory)
- `scripts/` (multiple QA/debug scripts)
- `docs/` (multiple Phase 6E, 6B, 6A, 5D, 4B audit/plan docs)

---

## 4. "CONCLUDED" STATE INVESTIGATION

### 4.1 Did a persistent "Concluded" state get introduced?

**YES — partially and inconsistently.**

### 4.2 Database changes
- **Migration:** `supabase/migrations/202606230001_retire_winner_resolution_model.sql`
- **Columns added:** `debates.concluded_at` (timestamptz), `debates.concluded_by` (uuid)
- **Table created:** `debate_conclusions` with columns: `id, room_id, user_id, content, evidence_anchors, version, parent_conclusion_id, created_at, updated_at`
- **Indexes created:** `idx_debate_conclusions_room`, `idx_debate_conclusions_user`
- **Trigger dropped:** `trg_reputation_debate_resolve`
- **Function dropped:** `handle_debate_resolve()`
- **RPC dropped:** `resolve_debate(uuid, text, text, uuid)`
- **RPC created:** `record_debate_conclusion(uuid, text, uuid)`

### 4.3 RPC behavior: `record_debate_conclusion`
```sql
-- Lines 125-129 of migration
update public.debates
set concluded_at = now(),
    updated_at = now()
where id = p_room_id;
```
**This sets a persistent room-level timestamp marker.** It does NOT update `debates.status`.

### 4.4 UI expectations vs DB reality
- **UI checks:** `debate.status === "concluded"` (in `debate-header.tsx`, `debate-header-v2.tsx`, `debate-resolution.tsx`, `browse-debates.tsx`, `debate-side-picker.tsx`)
- **RPC sets:** `concluded_at` only, NOT `status`
- **Result:** The "Concluded" badge and hide logic will **never trigger** because `status` is never updated to `"concluded"`.

### 4.5 Type changes
- `DebateStatus` changed from `"active" | "resolved" | "closed"` to `"active" | "concluded" | "closed"` (`src/types/domain.ts`)
- `Debate` interface gains `concludedAt` and `concludedBy` (`src/features/discussions/types.ts`)
- `DbDebateRow` gains `concluded_at` and `concluded_by` (`src/features/discussions/services/discussion-service.ts`)

### 4.6 Bug introduced
`src/features/debates/services/debate-service.ts:339`:
```typescript
status: row.status === "resolved" ? "inactive" : "open",
```
This checks for `"resolved"` but the database no longer uses that value. Concluded debates will incorrectly map to `"open"` in feed items.

### 4.7 Classification
**UNAPPROVED IMPLEMENTATION / PRODUCT SCOPE VIOLATION**

The approved model explicitly states:
- "NO persistent 'Concluded' Debate lifecycle state"
- "NO freeze-on-conclusion"

A persistent `concluded_at` column and `debate_conclusions` table were created. While the RPC does not freeze contributions, the room-level marker creates a lifecycle state that does not exist in the approved model.

---

## 5. `recordDebateConclusion` INVESTIGATION

| Question | Answer |
|---|---|
| Does it write to the database? | YES — inserts into `debate_conclusions` |
| Does it create a conclusion? | YES — participant-specific conclusion row |
| Does it change debate status? | Indirectly — sets `concluded_at = now()` on `debates`, but does NOT update `debates.status` |
| Who can call it? | Debate participants only (enforced via `debate_participants` check) |
| Does it freeze contributions? | NO — no trigger, check, or policy prevents new messages/claims |
| Does it affect SoU? | NO — SoU logic uses evidence only |
| Does it affect reputation? | NO — winner/loser reputation retired |
| Does it create notifications? | NO |
| Is it participant-specific? | YES — each user gets their own conclusion with versioning |
| Is it room-level? | YES — `concluded_at` is set on the room |
| Does it create official-looking conclusions? | UI says "personal takeaway, not a verdict" but DB has `concluded_at` marker |

### 5.1 Classification
**UNAPPROVED PRODUCT BEHAVIOR**

The `record_debate_conclusion` RPC and `debate_conclusions` table implement Participant Interpretation, which was not approved for implementation in Phase 6E. The approved spec states: "This phase is PRODUCT REASONING AND SPECIFICATION ONLY — NO IMPLEMENTATION."

---

## 6. SoU VOTE-INFLUENCE INVESTIGATION

### 6.1 What changed
`src/features/discussions/components/understanding-utils.ts` — the vote-based "contested" classification branch was **removed**.

**Removed code:**
```typescript
// Check if community votes indicate significant division with >= 5 votes
if (
  totalVotes >= 5 &&
  agreementPercentage !== null &&
  agreementPercentage >= 35 &&
  agreementPercentage <= 65
) {
  contestedClaims.push({
    // ...
    status: "contested",
    statusReason: `Divided community stance (${Math.round(agreementPercentage)}% agree, 0 directional citations)`,
    // ...
  });
}
```

**Added comment:**
```typescript
// Votes and community stance are descriptive social signals only.
// They must NOT determine epistemic state.
// All zero-evidence claims remain unresolved regardless of vote counts.
```

### 6.2 Current SoU inputs
| Input | Influences taxonomy? |
|---|---|
| Evidence direction (`support`/`contradict`/`context`) | YES |
| Evidence existence | YES |
| Vote counts / agreement % | NO — explicitly removed |
| Participant counts | NO |
| Engagement metrics | NO |

### 6.3 Classification
**APPROVED CHANGE**

This aligns with the Phase 6E requirement: "Votes MUST NOT influence State of Understanding."

---

## 7. WINNER/LOSER RETIREMENT INVESTIGATION

### 7.1 Removed from active code
- `resolveDebate` service function → renamed to `recordDebateConclusion`
- `useResolveDebate` hook → renamed to `useRecordConclusion`
- `debateWonWeight` and `debateLostPenalty` from `ReputationOptions`
- `debateWins` and `debateLosses` from `UserContributions`
- Winner/loser calculation from `computeReputation`
- "Debater" and "Debate Champion" badges
- Winner-based reputation trigger `trg_reputation_debate_resolve`
- Function `handle_debate_resolve()`
- RPC `resolve_debate(uuid, text, text, uuid)`

### 7.2 Remaining references
| Location | Reference | Classification |
|---|---|---|
| `src/features/debates/services/debate-service.ts:339` | `row.status === "resolved"` | **BUG** — stale check, never matches current DB state |
| `src/features/onboarding/components/epistemic-sandbox.tsx:74` | "Evidence does not manufacture absolute certainty or declare a winner." | Harmless educational text |
| `src/features/discussions/components/discussion-feed.tsx:32` | "no winner" | Harmless descriptive text |

### 7.3 Classification
**APPROVED CHANGES** (with one bug introduced)

The winner/loser model was retired correctly. The stale `"resolved"` check in `debate-service.ts:339` is an introduced bug.

---

## 8. REPUTATION INVESTIGATION

### 8.1 Changes
- `debateWonWeight: 25` → REMOVED
- `debateLostPenalty: 5` → REMOVED
- Winner/loss factors removed from `computeReputation`
- `debateWins`/`debateLosses` removed from `getUserContributions`
- `debateParticipations` now populated from `concluded_at` checks instead of `resolution` winner checks
- "Debater" and "Debate Champion" badges removed

### 8.2 No replacement competitive system
No new points, levels, or competitive reputation was invented.

### 8.3 Classification
**APPROVED CHANGE**

---

## 9. PARTICIPANT INTERPRETATION INVESTIGATION

### 9.1 What was introduced
- **Table:** `debate_conclusions` with full versioning (`version`, `parent_conclusion_id`)
- **Columns:** `id, room_id, user_id, content, evidence_anchors, version, parent_conclusion_id, created_at, updated_at`
- **RLS:** Public debates readable by all; private debates readable by participants; users can insert/update own conclusions
- **Type:** `DebateConclusion` interface added to `src/features/discussions/types.ts`
- **UI:** `DebateResolution` component renamed to "Record Interpretation" with personal-takeaway framing

### 9.2 Can it be mistaken for official truth?
- The UI explicitly says: "This is your personal takeaway, not a verdict. Other participants may record their own interpretations as well."
- However, the room-level `concluded_at` marker could create perception of a "finalized" debate state.

### 9.3 Classification
**UNAPPROVED PRODUCT BEHAVIOR**

Participant Interpretation was not approved for implementation in Phase 6E.

---

## 10. PHASE 6B/6C SCOPE CONTAMINATION

The following changes belong to earlier phases and are NOT Phase 6E work:

| Change | File(s) | Phase |
|---|---|---|
| Mobile nav restructure (8 items → 4 primary + "More") | `mobile-nav.tsx` | 6B |
| Homepage tab restructuring ("My Deliberations" / "Public Commons") | `logged-in-homepage.tsx` | 6B |
| CSS mask gradients on horizontal navs | `debate-section-nav.tsx`, `section-nav.tsx` | 6B |
| `break-words` additions to content wrappers | `comment-item.tsx`, `debate-premise.tsx`, `claim-list.tsx` | 6B |
| `ArgumentEvidenceOverview` replacing `DebateScorecard` | `debate-room.tsx`, new `argument-evidence-overview.tsx` | 6B (anti-gamification) |
| ThumbsUp/ThumbsDown → Check/X icon replacement | Multiple discussion components | 6B |
| Color palette neutralization (green→slate, rose→amber) | Multiple components | 6B |
| Vote button labels "Agree/Disagree" → "Support/Challenge" | `claim-list.tsx`, `evidence-section.tsx`, `room-evidence-section.tsx` | 6B |
| Discussion summary/intelligence/graph visual updates | Multiple components | 6B |

---

## 11. APPROVED vs UNAPPROVED CHANGES

### 11.1 Approved Changes
| Change | Reason |
|---|---|
| Remove vote-based contested classification from SoU | Directly required by Phase 6E |
| Retire `debateWonWeight` / `debateLostPenalty` | Directly required by Phase 6E |
| Retire `debateWins` / `debateLosses` from contributions | Directly required by Phase 6E |
| Retire winner-based reputation trigger and RPC | Directly required by Phase 6E |
| Remove "Debater" / "Debate Champion" badges | Directly required by Phase 6E |
| Replace ThumbsUp/ThumbsDown with Check/X | Aligns with epistemic neutrality |
| Neutralize green/rose binary signaling | Aligns with anti-gamification |

### 11.2 Unapproved Changes
| Change | Why Unapproved |
|---|---|
| New migration `202606230001` adding `concluded_at`/`concluded_by` columns | Creates persistent room-level state; prohibited by Phase 6E |
| New `debate_conclusions` table | Participant Interpretation not approved for implementation |
| New `record_debate_conclusion` RPC | Implements unapproved product behavior |
| `DebateStatus` type includes `"concluded"` | Introduces unapproved lifecycle state |
| UI checks for `debate.status === "concluded"` | Relies on unapproved state |
| `recordDebateConclusion` service function | Implements unapproved RPC |
| `useRecordConclusion` hook | Implements unapproved service |

---

## 12. REQUIRED CORRECTIONS

### 12.1 Must Revert (Unapproved Implementation)
1. **Migration:** `supabase/migrations/202606230001_retire_winner_resolution_model.sql` — contains unapproved DB schema, table, RPC, and trigger changes
2. **Service:** `recordDebateConclusion` function in `src/features/debates/services/debate-service.ts`
3. **Hook:** `useRecordConclusion` in `src/features/debates/hooks/use-debates.ts`
4. **Types:** `concludedAt`, `concludedBy` in `Debate` interface; `DebateConclusion` interface
5. **DB row type:** `concluded_at`, `concluded_by` in `DbDebateRow`
6. **Service mapping:** `concludedAt`, `concludedBy` in `mapDebateRow`
7. **UI components:** All `debate.status === "concluded"` checks and "Concluded" badges
8. **DebateResolution component:** Renamed to "Record Interpretation" functionality
9. **Reputation service:** `concluded_at` query logic in `getUserContributions`
10. **Debate page fallback:** `concludedAt: null`, `concludedBy: null` in mock debate object

### 12.2 Must Fix (Introduced Bug)
1. `src/features/debates/services/debate-service.ts:339` — stale `row.status === "resolved"` check

### 12.3 May Keep (Approved or Pre-existing)
1. All winner/loser retirement changes
2. SoU vote-influence removal
3. Icon/color neutralization changes
4. `ArgumentEvidenceOverview` component (anti-gamification)
5. Mobile nav, homepage tabs, CSS masks (Phase 6B work, pre-existing scope)

---

## 13. FILES THAT MUST BE PRESERVED

Approved Phase 6E changes (or pre-existing Phase 6B/6C work that should not be reverted):

| File | Reason |
|---|---|
| `src/features/reputation/reputation-utils.ts` | Winner/loser retirement approved |
| `src/features/reputation/types.ts` | Winner/loser retirement approved |
| `src/features/reputation/services/reputation-service.ts` | Winner/loser retirement approved (except `concluded_at` query) |
| `src/features/discussions/components/understanding-utils.ts` | SoU vote removal approved |
| `src/features/discussions/components/claim-list.tsx` | Icon/label neutralization approved |
| `src/features/discussions/components/evidence-section.tsx` | Icon/label neutralization approved |
| `src/features/discussions/components/room-evidence-section.tsx` | Icon/label neutralization approved |
| `src/features/discussions/components/map-tab.tsx` | Icon neutralization approved |
| `src/features/discussions/components/discussion-intelligence.tsx` | Color neutralization approved |
| `src/features/discussions/components/discussion-summary.tsx` | Icon/color neutralization approved |
| `src/features/discussions/components/discussion-health.tsx` | Icon/color neutralization approved |
| `src/features/discussions/components/state-of-understanding.tsx` | Color neutralization approved |
| `src/features/discussions/components/claim-relation-dialog.tsx` | Icon neutralization approved |
| `src/features/discussions/components/comment-item.tsx` | `break-words` approved |
| `src/features/discussions/components/graph-view.tsx` | Color neutralization approved |
| `src/features/debates/components/argument-evidence-overview.tsx` | Anti-gamification approved |
| `src/features/debates/components/debate-premise.tsx` | `break-words` approved |
| `src/types/domain.ts` | `DebateStatus` type change to remove `"resolved"` is approved, but `"concluded"` addition is not |
| `src/features/debates/components/debate-section-nav.tsx` | "Targeted Inquiries" label approved |
| `src/components/layout/mobile-nav.tsx` | Pre-existing Phase 6B work |
| `src/features/homepage/components/logged-in-homepage.tsx` | Pre-existing Phase 6B work |
| `src/app/u/[username]/page.tsx` | Winner/loss removal approved |
| `src/features/debates/components/browse-debates.tsx` | Icon/color neutralization approved; `"concluded"` filter must be reverted |
| `src/features/debates/components/debate-header.tsx` | Winner highlighting removal approved; `"concluded"` checks must be reverted |
| `src/features/debates/components/debate-header-v2.tsx` | Winner highlighting removal approved; `"concluded"` checks must be reverted |
| `src/features/debates/components/debate-side-picker.tsx` | `isResolved` logic approved; variable name misleading but functional |
| `src/features/debates/components/debate-room.tsx` | `ArgumentEvidenceOverview` swap approved; `contributionsRoomEvidence` rename is a fix |

---

## 14. FILES THAT MAY NEED REVERSION

| File | What to Revert |
|---|---|
| `supabase/migrations/202606230001_retire_winner_resolution_model.sql` | Entire file — unapproved DB changes |
| `src/features/debates/services/debate-service.ts` | `recordDebateConclusion` function; `"concluded"` status filter; `"resolved"` bug on line 339 |
| `src/features/debates/hooks/use-debates.ts` | `useRecordConclusion` hook; `"concluded"` status type |
| `src/features/discussions/types.ts` | `concludedAt`, `concludedBy`, `DebateConclusion` interface |
| `src/features/discussions/services/discussion-service.ts` | `concluded_at`, `concluded_by` in `DbDebateRow` and `mapDebateRow` |
| `src/features/reputation/services/reputation-service.ts` | `concluded_at` query logic; revert to `resolution`-based participations or simplified participation list |
| `src/features/debates/components/debate-resolution.tsx` | Revert to `useResolveDebate` / winner-based resolution, OR remove entirely if not approved |
| `src/features/debates/components/debate-header.tsx` | `concludedAt` checks and "Concluded" display |
| `src/features/debates/components/debate-header-v2.tsx` | `isConcluded` checks and "Concluded" badge |
| `src/features/debates/components/browse-debates.tsx` | `"concluded"` status filter and badge |
| `src/features/debates/components/debate-side-picker.tsx` | `isResolved` → rename to `isClosed` or similar, remove `"concluded"` check |
| `src/app/debates/[slug]/page.tsx` | `concludedAt: null`, `concludedBy: null` from mock object |
| `src/app/u/[username]/page.tsx` | Revert if it removes debate wins/losses display (already done, but verify) |
| `src/types/domain.ts` | Remove `"concluded"` from `DebateStatus`, restore `"resolved"` if needed, or keep only `"active" | "closed"` |

---

## 15. IMPLEMENTATION SAFETY RECOMMENDATION

### 15.1 Immediate Actions
1. **DO NOT apply the migration** `202606230001_retire_winner_resolution_model.sql` to any database (local or production).
2. **DO NOT merge or commit** the current working tree.
3. **Revert all unapproved implementation** identified in §12.1 and §14.
4. **Fix the introduced bug** in `debate-service.ts:339`.
5. **Preserve approved changes** identified in §12.3 and §13.

### 15.2 Recommended Process
1. Revert the working tree to pre-implementation state for all unapproved changes.
2. Re-apply only the approved changes (winner/loser retirement, SoU vote removal, icon/color neutralization).
3. Keep Phase 6E as specification-only until explicit implementation approval is granted.
4. If Participant Interpretation is desired, it requires a separate product approval and implementation phase.

### 15.3 Risk Assessment
| Risk | Severity | Likelihood |
|---|---|---|
| Migration applied to production DB | HIGH | Low (not yet applied) |
| `concluded_at` creates user confusion about "final" debates | MEDIUM | Medium if UI inconsistency is fixed |
| `debate_conclusions` data model shipped without product approval | HIGH | Already in working tree |
| Broken "Concluded" UI (never triggers) | LOW | Certain if shipped as-is |
| Stale `"resolved"` check causes feed display bugs | MEDIUM | Certain if shipped |

---

## 16. AUDIT SUMMARY

| Category | Finding |
|---|---|
| Files changed by this task | 38 modified + 9 new source files + 1 migration |
| Persistent "Concluded" introduced? | **YES** — `concluded_at` column and `debate_conclusions` table created in migration |
| `recordDebateConclusion` exists? | **YES** — new RPC, service function, and hook |
| SoU still uses votes? | **NO** — vote influence explicitly removed |
| Winner/reputation logic retired? | **YES** — winner/loser removed from reputation, badges, and RPC |
| Scope contamination occurred? | **YES** — Phase 6B/6C visual/layout changes mixed into Phase 6E task |
| Recommended next action | Revert unapproved implementation; re-apply only approved changes; keep Phase 6E as spec-only |

---

*Audit completed. No corrections applied. No files modified.*
