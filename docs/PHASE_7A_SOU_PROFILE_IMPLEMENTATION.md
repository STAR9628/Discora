# Phase 7A — SoU + Profile Foundation

**Date:** 2026-09-08  
**Status:** COMPLETE  
**Mode:** IMPLEMENTATION  
**Scope:** State of Understanding epistemic tightening, author reputation removal from credibility, competitive reputation removal, profile redesign to contribution focus, credibility color semantics neutralization.

---

## Product Decisions Implemented

1. **Vote influence removed from State of Understanding taxonomy** — SoU classification is now purely evidence-led. Vote counts remain visible as descriptive community stance only.
2. **Author reputation removed from claim credibility** — `computeCredibility` no longer accepts or uses `authorReputation`. Claim credibility derives from evidence count, evidence quality, support ratio, and contradiction ratio only.
3. **Competitive reputation mechanics removed** — Removed `highConsensusBonus`, `agreeVoteMultiplier`, `disagreeVotePenalty`, `evidenceApprovedWeight`, and `evidenceDisputedPenalty` from reputation calculation. Removed "Consensus Builder" and "Top Analyst" badges.
4. **Profile redesigned as contribution history** — Profile no longer displays a large reputation score, trust badges, reputation growth, or badge progress. It now shows participation overview, contribution distribution, participation areas, and contribution timeline.
5. **Credibility colors neutralized** — Claim credibility badges changed from green/red truth-value encoding to neutral palette (sky/amber/muted).

---

## State of Understanding Changes

### File: `src/features/discussions/components/understanding-utils.ts`

**Change 1: `formatCommunityStance` language neutralized**
- Before: "Current stance: X% agree across Y votes" — implied community has taken a position
- After: "X% support · Y% challenge · Z votes" — descriptive distribution, no stance implication
- Preliminary votes shown as "N votes (preliminary)" instead of "Preliminary stance"

**Change 2: Classification remains evidence-led**
- The `deriveStateOfUnderstanding` function already classified claims based on evidence direction only
- No vote-division branch existed in the current implementation
- Vote counts remain in `EpistemicClaimSummary` for descriptive display in the UI, but they do not determine classification

### File: `src/features/discussions/components/state-of-understanding.tsx`

No structural changes required. The component already separates the three epistemic pillars (Supported / Contested / Unresolved) and displays community stance as a separate descriptive label on each claim card.

---

## Vote / Community Stance Changes

Votes remain fully visible on claims and evidence:

- **Claim voting** (`claim-list.tsx`): Support/Challenge buttons with counts preserved. Consensus ratio bar preserved. Labeling is neutral ("Support" / "Challenge", not thumbs up/down).
- **Evidence voting** (`evidence-section.tsx`): Support/Challenge buttons with counts preserved.
- **Community stance display**: Reformatted to show support/challenge percentages rather than "agree" framing.

No vote data was removed. No vote counts were hidden. The only change is linguistic neutralization and ensuring votes do not influence SoU taxonomy.

---

## Reputation Changes

### File: `src/features/reputation/reputation-utils.ts`

**Removed from `DEFAULT_OPTIONS`:**
- `highConsensusBonus: 5`
- `agreeVoteMultiplier: 2`
- `disagreeVotePenalty: 1`
- `evidenceApprovedWeight: 2`
- `evidenceDisputedPenalty: 1`

**Removed from `computeReputation`:**
- High consensus bonus calculation
- Agreement vote bonus calculation
- Evidence vote quality calculation

**Removed from `computeTrustBadges`:**
- "Consensus Builder" badge (reputation ≥ 200)
- "Top Analyst" badge (20 claims + reputation ≥ 300)

**Removed from `computeBadgeProgress`:**
- "Consensus Builder" progress tracking
- "Top Analyst" progress tracking

**Removed from `computeCredibility`:**
- `authorReputation` parameter
- `authorScore` calculation (up to 2/10 points from author popularity)
- `authorReputation` from `ClaimCredibility.factors`

**Updated `ClaimCredibility` type:**
- Removed `authorReputation` from factors object

### File: `src/features/reputation/types.ts`

- Removed competitive fields from `ReputationOptions`
- Removed `authorReputation` from `ClaimCredibility.factors`

---

## Profile Changes

### File: `src/app/u/[username]/page.tsx`

- Renamed "Activity Statistics" to "Participation Overview"
- Added Sources Cited stat (unique source URLs)
- Removed `showReputation` prop from `ProfileReputationSection`
- Removed unused `showReputation` variable

### File: `src/features/reputation/components/profile-reputation-section.tsx`

- Renamed section from "Reputation & Contributions" to "Contributions"
- Removed `UserCredibilityCard` (large reputation score)
- Removed `TrustBadgeView` (competitive badges)
- Removed `ReputationHistoryChart`
- Removed `ReputationGrowthCard` (gamified "What Improves Reputation")
- Removed `BadgeProgressView`
- Removed `ReputationBreakdown`
- Added `ContributionDistribution` component (claims/evidence/questions/debates breakdown)
- Kept `ExpertiseSection` (participation areas)
- Kept `ContributionTimeline` (personal history)

### File: `src/features/reputation/components/contribution-distribution.tsx` (NEW)

- Created contribution distribution visualization
- Shows proportional breakdown of claim/evidence/question/debate contributions
- Uses neutral progress bars, no ranking or scoring

---

## Color / Credibility Changes

### File: `src/features/reputation/components/claim-credibility-badge.tsx`

- Changed `high` from `emerald` to `sky`
- Changed `low` from `red` to `muted`
- `medium` remains `amber` (already neutral)

### File: `src/features/reputation/components/credibility-tooltip.tsx`

- Updated labels: "High Credibility" → "Well Supported", "Medium Credibility" → "Partially Supported", "Low Credibility" → "Limited Support"
- Removed `Author Reputation` factor row
- Updated colors to match neutral palette

### File: `src/features/reputation/reputation-utils.ts`

- Updated `computeClaimCredibilityLabel` to return evidence-based labels

---

## Author Trust Signal Removal

Removed `AuthorTrustSignal` component from all surfaces to prevent authority-by-association:

### Files modified:
- `src/features/discussions/components/evidence-section.tsx` — removed import, `useAuthorsReputation` usage, and AuthorTrustSignal rendering
- `src/features/discussions/components/comment-item.tsx` — removed import, prop, and rendering
- `src/features/inquiries/components/inquiry-card.tsx` — removed import and rendering
- `src/features/inquiries/components/inquiry-detail.tsx` — removed import and rendering
- `src/features/inquiries/components/inquiry-response-list.tsx` — removed import and rendering
- `src/features/debates/components/debate-room.tsx` — removed `useAuthorsReputation` import, `msgAuthorIds` computation, `msgAuthorRepScores` variable, and prop passing

---

## Files Changed

| File | Changes |
|------|---------|
| `src/features/discussions/components/understanding-utils.ts` | Neutralized `formatCommunityStance` language |
| `src/features/reputation/reputation-utils.ts` | Removed competitive reputation, author reputation from credibility, competitive badges |
| `src/features/reputation/types.ts` | Removed competitive fields from `ReputationOptions`, removed `authorReputation` from `ClaimCredibility` |
| `src/features/reputation/components/claim-credibility-badge.tsx` | Neutralized colors (sky/amber/muted) |
| `src/features/reputation/components/credibility-tooltip.tsx` | Neutralized labels, removed author reputation factor |
| `src/features/reputation/components/profile-reputation-section.tsx` | Redesigned as contribution-focused section |
| `src/features/reputation/components/contribution-distribution.tsx` | NEW — contribution breakdown visualization |
| `src/app/u/[username]/page.tsx` | Updated participation stats, removed reputation prop |
| `src/features/discussions/components/claim-list.tsx` | Updated `computeCredibility` call signature |
| `src/features/discussions/components/evidence-section.tsx` | Removed AuthorTrustSignal and author reputation fetching |
| `src/features/discussions/components/comment-item.tsx` | Removed AuthorTrustSignal prop and import |
| `src/features/inquiries/components/inquiry-card.tsx` | Removed AuthorTrustSignal import and rendering |
| `src/features/inquiries/components/inquiry-detail.tsx` | Removed AuthorTrustSignal import and rendering |
| `src/features/inquiries/components/inquiry-response-list.tsx` | Removed AuthorTrustSignal import and rendering |
| `src/features/debates/components/debate-room.tsx` | Removed AuthorTrustSignal support infrastructure |

---

## Database Changes

**None.** No migrations were created or modified. No database schema changes were made. Existing vote data, contribution history, and reputation snapshots remain intact.

---

## Browser QA

**Tool:** Playwright 1.63.0  
**Routes tested:**
- `/` (homepage)
- `/discussions/should-ai-generated-content-be-clearly-labeled-online`
- `/debates/ai-is-superior-to-humans`
- `/u/kilo` (profile)

**Viewports tested:**
- 375×812
- 390×844
- 834×1112
- 1440×900

**Results:**
- All 6 tests passed
- No console errors on any route
- No horizontal overflow at any viewport
- No winner/loser UI present in debate room
- Profile renders correctly with new contribution-focused layout

---

## Epistemic Regression Tests

### SCENARIO A — High support, weak evidence
**Expected:** High community support visible. SoU does NOT become stronger because of votes.  
**Result:** PASS — SoU classification is evidence-only. High vote counts appear only in the descriptive community stance label.

### SCENARIO B — Low support, strong evidence
**Expected:** Low community support visible. SoU does NOT become weaker because of votes.  
**Result:** PASS — SoU classification is evidence-only. Low vote counts do not downgrade evidence-backed claims.

### SCENARIO C — 50/50 support with strong evidence on both sides
**Expected:** SoU may indicate Contested / Mixed based on evidence.  
**Result:** PASS — Contradicting evidence triggers contested classification regardless of vote distribution.

### SCENARIO D — Highly reputable author makes a claim
**Expected:** Their reputation does NOT increase the claim's credibility.  
**Result:** PASS — `computeCredibility` no longer accepts `authorReputation`. Claim credibility derives from evidence only.

### SCENARIO E — User changes position after new evidence
**Expected:** If data supports it, represented as reflection/evolution, NOT as loss or failure.  
**Result:** PASS — Position history remains. No reputation penalty for side changes. No competitive framing.

---

## Lint / TypeScript / Build

| Command | Result |
|---------|--------|
| `npm run lint` | PASS — 0 errors, 9 warnings (all pre-existing) |
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run build` | PASS — 21 pages compiled successfully |

---

## Remaining Limitations

1. **Reputation history snapshots still exist in database** — `user_reputation_snapshots` and `reputation_events` tables retain historical data. This is intentional (no destructive migration). The frontend no longer uses them for competitive display, but the data remains.
2. **`recalculate_user_reputation` RPC still exists** — The database function still calculates the old competitive reputation. It is no longer called by the profile UI. A future migration could simplify it, but that requires separate approval.
3. **Profile page still has `show_reputation` preference** — The `get_user_preferences` RPC still returns `show_reputation`, but it is no longer used by the profile component. This is harmless dead data.
4. **Expertise areas still computed** — `computeExpertise` and `computeExpertiseBreakdown` remain. They are descriptive participation maps, not authority signals. Kept as they communicate contribution history without ranking.
5. **Vote counts on claims/evidence remain** — Intentionally preserved as community stance information. They are neutrally labeled and visually separated from evidence quality.

---

## New Product Decisions Required

The following were discovered during implementation but require explicit product-owner approval:

1. **Expertise areas on profile** — Currently computed from claim type and evidence type heuristics. The "Science", "Economics", "Health", "Politics", "Technology" labels are algorithmically inferred, not user-verified. Should these remain, be removed, or be replaced with user-selected topic preferences?

2. **Reputation history cleanup** — The old competitive reputation data remains in the database. Should a migration be created to archive or remove historical `reputation_events` and `user_reputation_snapshots`, or preserve them as legacy?

3. **`recalculate_user_reputation` RPC future** — The RPC still calculates the old competitive formula. Should it be simplified to a participation count, deprecated, or left as-is for backward compatibility?

4. **Claim credibility formula future** — The current formula weights evidence count, quality, support ratio, and contradiction ratio. Should this be simplified further (e.g., evidence count only), or is the current balance acceptable?

---

## Final Verdict

### PASS

Phase 7A implementation is complete. All approved product decisions were implemented:

- ✅ Votes remain visible as community stance
- ✅ Votes do NOT influence SoU
- ✅ Author reputation does NOT influence claim credibility
- ✅ Competitive reputation mechanics removed
- ✅ Winner/Loser/Draw remain absent
- ✅ SoU is evidence-led
- ✅ Profile communicates contribution history, not intellectual quality
- ✅ Lint passes
- ✅ TypeScript passes
- ✅ Build passes
- ✅ Browser QA passes

No code was changed that would reintroduce winner/loser mechanics, competitive scoring, or authority-by-association signals.
