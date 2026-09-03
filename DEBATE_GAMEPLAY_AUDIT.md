# Debate Gameplay Audit Report

## Phase 1 — End-to-End Gameplay Audit

### Environment
- **Supabase Project**: `papmghohpkjaovvmeskd.supabase.co`
- **Test Debate**: "ai vs human" (slug: `ai-vs-human`)
- **Creator**: `17265c80-a346-42dd-a86c-6795c500fd15`
- **Audit Date**: 2026-06-10

### Step-by-step Results

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Creator creates debate | **PASS** | 1 debate room exists (`room_type=debate`), RLS INSERT policy now in place |
| 2 | Creator auto-joins proposition | **PASS** | `debate_participants` has 1 row: creator on `side=proposition` |
| 3 | Second account joins opposition | **PARTIAL** | No second user exists in test data. Schema supports it (upsert on conflict) |
| 4 | Third account joins neutral | **PARTIAL** | No third user. Schema supports it |
| 5 | Participant counts update | **PASS** | `discussion_debates` view shows `proposition_participant_count=1`, `opposition_participant_count=0`, `neutral_participant_count=0` |
| 6 | Proposition creates claim | **FAIL** | Zero claims with `debate_side='proposition'` exist. Claim creation requires authenticated session (blocked) |
| 7 | Opposition creates claim | **FAIL** | Zero claims with `debate_side='opposition'` exist |
| 8 | Claims store debate_side correctly | **PARTIAL** | DB column exists (`claims.debate_side`), `claim-list.tsx` passes `debateSide` through the full stack. Cannot verify end-to-end without auth |
| 9 | Claims appear in correct side | **PARTIAL** | `discussion_claims` view includes `debate_side` field, filtered by `getClaimsBySide()` service. Logic is sound — untested with real data |
| 10 | Scorecard updates correctly | **PARTIAL** | `DebateScorecard` reads from `useDebateClaimsBySide` which calls `getClaimsBySide`. Works if claims exist |
| 11 | Reputation updates correctly | **FAIL** | **Zero reputation integration.** Profile "Debates" stat is a `comingSoon` placeholder (`"--"`). Reputation system only scores claims, evidence, questions — no debate factors |
| 12 | Debate resolution works | **PASS** | Existing debate has `status='resolved'`, `resolution={winner:'proposition', summary:'sdsdsdsdsdssdsd'}`. Creator panel `DebateResolution` works |
| 13 | Debate appears in feeds | **PASS** | `discussion_debates` view is accessible, `browse-debates.tsx` renders correctly |
| 14 | Debate appears in browse page | **PASS** | `/debates` page loads, shows "ai vs human" with correct stats |
| 15 | Debate appears in profile activity | **FAIL** | Profile "Debates" stat is `comingSoon` placeholder with `"--"`. Zero debate data fetched on profile pages |

### Live Data Snapshot

```
discussion_debates view:    1 row  (ai vs human, resolved, 0 claims)
rooms (room_type=debate):   1 row  (status=open — DESYNCHRONIZED with debate status=resolved)
debate_participants:        1 row  (creator, proposition)
claims with debate_side:    0 rows
```

### Phase 1 Summary
- **PASS**: 5
- **FAIL**: 4 (claim creation blocked, reputation missing, profile missing, room/debate status desync)
- **PARTIAL**: 6

---

## Phase 2 — Side Identity Investigation & Fix

### Root Cause

Two issues:

1. **Form does not capture side positions.** `create-debate-form.tsx` only collects `title`, `description`, `topicId`, `openingStatement`. The `proPosition` and `oppPosition` (what each side actually believes) are never captured.

2. **RPC call hardcodes empty opposition title.** In `debate-service.ts:34`:
   ```typescript
   p_proposition_title: data.title,  // motion title, not a stance
   p_opposition_title: "",            // always empty
   ```
   This stores the motion title as the proposition's "position" and an empty string for opposition — causing both sides to display identically.

### Current Rendering (Before Fix)

```
Proposition: For: AI vs Human
Opposition: Against: AI vs Human
```

The user cannot distinguish what each side believes. The disagreement is invisible.

### Recommendation: Option 1 — Position-based (IMPLEMENTED)

Store **what each side believes** as their respective `proposition_title` and `opposition_title` in the `debates` table. The `room.title` serves as the motion name.

Before/After comparison for a "Universal Basic Income" debate:

| Aspect | Before (broken) | After (fixed) |
|--------|-----------------|---------------|
| Room title | "Universal Basic Income: Solution or Burden?" | "Universal Basic Income: Solution or Burden?" |
| Proposition label | "For: Universal Basic Income: Solution or Burden?" | "UBI provides economic security and stimulates innovation" |
| Opposition label | "Against: Universal Basic Income: Solution or Burden?" | "UBI disincentivizes work and risks inflationary collapse" |
| User comprehension | Unclear — both sides look identical | Clear — disagreement immediately visible |

### Files Modified

| File | Change |
|------|--------|
| `src/features/discussions/validation.ts` | Added `proPosition` (min 10, max 200) and `oppPosition` (min 10, max 200) to `debateSchema` |
| `src/features/debates/create-debate-form.tsx` | Added two position textareas with colored side containers, updated preview to show positions |
| `src/features/debates/services/debate-service.ts` | `createDebate()` now accepts and passes `proPosition`/`oppPosition` to RPC instead of `title`/`""` |
| `src/features/debates/hooks/use-debates.ts` | `useCreateDebate` mutation type updated to include `proPosition`/`oppPosition` |
| `src/features/debates/components/debate-header.tsx` | `getSideLabels()` now renders positions directly with backward-compatible fallback |
| `src/features/debates/components/browse-debates.tsx` | Side cards now show "Proposition" label + position, and "Opposition" label + position |
| `src/features/debates/components/debate-resolution.tsx` | Winner labels now show side name ("Proposition"/"Opposition"/"Draw") instead of concatenated position text |

### Backward Compatibility

Existing debates with empty `opposition_title` fall back to:
- Opposition: `"Against: {propositionTitle}"`
- Proposition: `"{propositionTitle}"` (the motion title)

This is not ideal for old data but is informative enough. All **new** debates will have meaningful, distinct positions.

---

## Phase 3 — Claim Creation UX Audit

### Current Page Hierarchy (debate room)

```
1. Room Header Card (title, topic, date, message count)
2. DebateHeader (two side cards with positions/stats, resolution banner)
3. Opening Statement
4. DebateSidePicker (Join Proposition/Opposition/Neutral)
5. DebateScorecard (Live Scorecard)
6. DebateResolution panel (creator only)
7. Tab Bar: discussion | questions | claims | evidence | sources | map
8. [Claims tab content]
   a. DebateSideSelector (if user on non-neutral side)
   b. "Assert a Structured Claim" form
   c. Claim listing
```

### Issues Identified

1. **CRITICAL: 5 sections before claim CTA** — Users must scroll past DebateHeader, Opening Statement, SidePicker, Scorecard, Resolution before reaching the Claims tab. Then they must switch tabs. The "Assert Claim" form is deeply buried.

2. **HIGH: Side selector is detached from claim form** — `DebateSideSelector` appears ABOVE the claim form but looks like it filters existing claims. Its actual function (controlling which side the NEW claim is asserted for) is unclear.

3. **HIGH: No side indicator in claim form** — The form's submit button says "Assert Claim" with no reference to which side the claim will represent (Proposition/Opposition). No banner/warning if the user is about to claim for a side they didn't join.

4. **MEDIUM: Empty state has no debate-specific guidance** — When no claims exist, the empty state says "Be the first to introduce structured assertions to this discussion" — uses "discussion" terminology even in debate context.

5. **MEDIUM: No mobile FAB** — On mobile, users must scroll through all sections to find the claim creation form.

### Wireframe Recommendations

#### A. Context-aware claim form header

```
┌─────────────────────────────────────────────────────┐
│ 🔵 You are on Proposition                           │
│    "AI surpasses human intelligence and efficiency"  │
│                                                     │
│ Assert a Claim for Proposition                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ State a concise, falsifiable claim...           │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Changes:
- Show current user's side prominently at top
- Show the position text for context
- Change form header to "Assert a Claim for [Side]"
- Auto-select the user's side (currently done via DebateSideSelector)

#### B. Sticky claim button (mobile)

```
┌──────────────────────┐
│ [ + Assert Claim ] ← Fixed bottom CTA when scrolled past
└──────────────────────┘
```

#### C. Side badge in form submit button

```
[ 🔵 Assert Proposition Claim ]
[ 🔴 Assert Opposition Claim  ]
```

#### D. Move debate-specific UI to sidebar or collapse

```
Desktop Layout:
┌──────────────┬─────────────────────────┐
│ Side Panel   │ Main Content            │
│              │                         │
│ - Position   │ Claims Tab Content      │
│ - Scorecard  │ - Claim Form (with      │
│ - SidePicker │   side context)         │
│ - Resolution │ - Claim Listing         │
└──────────────┴─────────────────────────┘
```

This reduces vertical scrolling on desktop and keeps debate context visible alongside claims.

---

## Phase 4 — Readiness Score

### Scoring Matrix

| Area | Current /10 | Target /10 | Gap |
|------|------------|------------|-----|
| **Debate Architecture** | 7 | 8 | RLS fix deployed. Room/debate status desync persists |
| **Debate UX** | 6 | 8 | Side identity **just fixed**. Claim creation flow still buried |
| **Debate Discoverability** | 5 | 7 | Browse page works. No search, no feeds, no recommendations |
| **Debate Participation** | 6 | 8 | Join/leave works. No incentive system, empty sides |
| **Debate Scoring** | 4 | 7 | Basic agree/disagree counts. No ELO, no weighting |
| **Debate Resolution** | 7 | 8 | Functions. No impact on reputation or feeds |
| **Debate Reputation Integration** | 0 | 6 | **Completely missing.** Profile placeholder only |

**Overall Score: 35 / 70 (50%)** → Target: **52 / 70 (74%)**

### Top 10 Remaining Issues

#### CRITICAL

1. **Reputation ignores debates entirely** — The `getUserContributions()` query only fetches claims, evidence, questions. Reputation weight system has no debate factors. Debate participation, debate wins, and debate claim quality have zero impact on user reputation.

   *Files affected*: `src/features/reputation/services/reputation-service.ts`, `src/features/reputation/reputation-utils.ts`, `src/features/reputation/types.ts`
   *Fix*: Add debate claim counts to reputation weighting. Add debate creation/participation/reputation factors. Add debate-side-aware claim quality scoring.

2. **Profile "Debates" stat is a Coming Soon placeholder** — The profile page renders a `StatCard` with `value="--"` and `comingSoon` badge. No debate data is ever fetched for profile display.

   *Files affected*: `src/app/u/[username]/page.tsx`, `src/features/profiles/services/profile-service.ts`
   *Fix*: Query `discussion_debates` and `debate_participants` for the user. Render debate count, debate participation count, and debate records.

3. **Room status and debate status can desynchronize** — The existing debate has `room.status='open'` but `debate.status='resolved'`. The RPC only updates `debates` status, not `rooms` status. Browsing by room status misses resolved debates.

   *Files affected*: `supabase/migrations/202606100001_create_debates.sql`, `src/features/debates/services/debate-service.ts`
   *Fix*: In `resolveDebate()`, also update `rooms.status = 'inactive'`. Or query by `discussion_debates.status` instead of `rooms.status`.

#### HIGH

4. **Claim creation form is buried 5 sections deep** — Users must scroll past header, debate positions, opening statement, side picker, scorecard, resolution panel, then switch to the Claims tab. First-time users won't find it.

   *Fix*: Restructure debate page with a sidebar or collapse debate-side UI. Add a floating "Assert Claim" CTA on the claims tab. Move debate context into a collapsible section.

5. **No debate-specific search** — Search (`/search`) uses the `search_rpc` function which searches messages, claims, evidence, questions — no debate-specific filtering or highlight.

   *Fix*: Add debate filters to search. Index `debates.opening_statement`, `debates.proposition_title`, `debates.opposition_title`.

6. **Empty sides with no recruitment mechanism** — Only the creator auto-joins Proposition. Opposition and Neutral are empty with no way to invite participants or prompt side balancing.

   *Fix*: Add "Invite to Oppose" feature. Show a prompt: "This debate needs an Opposition. Share it!"

#### MEDIUM

7. **Scorecard lacks advanced metrics** — Score is just `agreeCount - disagreeCount` per side. No ELO rating, no weighted scoring by participant reputation, no decay.

   *Fix*: Implement debate ELO. Weight votes by voter reputation. Add time-decay to claim scores.

8. **No anonymous claim option in debates** — The `claimSchema` has `identityMode` field but `DebateSideSelector` doesn't present anonymous option in the debate context. All debate claims are public.

   *Fix*: Audit whether anonymity should be allowed for debate claims. If so, add anonymous toggle to claim form in debate context.

#### LOW

9. **Resolution doesn't affect reputation or scoring** — Declaring a winner has no downstream effects. No reputation bonus for winning side participants. No score adjustment.

   *Fix*: Add reputation weight for resolved debates. Grant reputation bonus to winning side participants.

10. **Neutral participants have no engagement path** — Users who join Neutral see the scorecard but have no way to contribute claims. They can only observe. No Neutral-specific features exist.

    *Fix*: Allow Neutrals to vote on claims. Allow Neutrals to ask clarifying questions. Add a spectator dashboard.

### Verdict

**NOT READY FOR BETA**

The debate feature has foundational architecture (creation, joining, resolution, display) that works correctly. However, three critical gaps block beta readiness:

1. **Zero reputation integration** — Users are not rewarded for debate participation, making debates feel disconnected from the platform's incentive system.

2. **Zero profile visibility** — Debates are invisible on user profiles. No one can see a user's debate history, participation, or record.

3. **Claim creation is undiscoverable** — The primary action in a debate (asserting a claim) is buried behind 5 sections and requires tab switching. First-time users will not find it.

**Estimated effort to reach beta: 2-3 sprints**, primarily driven by reputation integration and UX restructuring.

---

## Quality Gate

| Check | Result |
|-------|--------|
| TypeScript | **0 errors** |
| ESLint | **0 new warnings** |
| Production build | **PASSES** |
| Migration files | All present and idempotent |

## Files Created

- `supabase/migrations/202606100002_fix_debate_insert_policy.sql` — Add missing INSERT RLS policy for `debates` table

## Files Modified

| File | Change |
|------|--------|
| `src/features/discussions/validation.ts` | Added `proPosition` and `oppPosition` fields to `debateSchema` |
| `src/features/debates/services/debate-service.ts` | Updated `createDebate()` type and RPC params to use positions |
| `src/features/debates/hooks/use-debates.ts` | Updated `useCreateDebate` mutation type |
| `src/features/debates/components/create-debate-form.tsx` | Added position fields, updated preview and submit |
| `src/features/debates/components/debate-header.tsx` | Removed "For: / Against:" prefix, shows positions directly |
| `src/features/debates/components/browse-debates.tsx` | Shows side labels + positions, removed ambiguous labels |
| `src/features/debates/components/debate-resolution.tsx` | Winner labels show side name, not concatenated text |

## Root Causes Found

1. **Side identity confusion**: `proposition_title` was set to room title (motion), `opposition_title` was hardcoded empty — both sides displayed identically
2. **Missing INSERT policy**: `debates` table had RLS but no INSERT policy — `create_debate_room` RPC failed at the INSERT step
3. **No reputation integration**: Debate feature was built as a fully isolated module with zero cross-reference to reputation or profile systems
4. **Status desync**: `resolveDebate()` only updates `debates.status`, not `rooms.status` — leaving them out of sync

## Remaining Blockers

1. Cannot obtain authenticated Supabase session (email confirmation required) — blocking full end-to-end claim creation and participation testing
2. No second test user account — cannot test multi-participant scenarios (Opposition joins, Neutral joins, cross-side claims)
3. Zero reputation integration — profile stats and reputation scores completely ignore debates

## Recommendation

**NOT READY FOR BETA.** Prioritize:

- Sprint 4: Reputation integration for debates + profile activity
- Sprint 5: Claim creation UX restructure + empty-state guidance
- Sprint 6: Scoring improvements + status sync fix + search indexing
