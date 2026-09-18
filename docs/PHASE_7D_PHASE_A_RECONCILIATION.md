# Phase 7D — Phase A Final Reconciliation

**Date:** 2026-09-10
**Status:** PASS WITH CONDITIONS
**Scope:** Phase A foundation verification and epistemic safety cleanup

---

## Executive Verdict

**PASS WITH CONDITIONS**

Phase A foundations are present, structurally sound, and epistemically aligned. Two critical concerns from the pre-implementation gate were investigated:

1. Argument voting — **not present**; no action required.
2. Vote-derived credibility — **mostly cleaned up in prior Phase A work**; one remaining State of Understanding vote-text leak was identified and fixed in this session.

No code changes were required for argument voting. One source file was modified to remove residual vote text from the State of Understanding presentation.

---

## Argument Voting

| Question | Result |
|---|---|
| Did argument voting exist? | **No** |
| Was it introduced by Phase A? | **No** |
| What was removed/fixed? | Nothing — zero hits for `toggle_argument_vote`, `argument_vote`, or any argument-voting RPC/table/UI anywhere in the repository |
| Final status | **CLEAN** |

Arguments are implemented as a reasoning contribution with `supporting`/`challenging` stance. No voting, scoring, reputation, or credibility mechanism exists on the `arguments` table or in any argument UI.

---

## Vote-Derived Credibility

| Question | Result |
|---|---|
| Did `computeCredibility` exist? | **No** — removed in prior Phase A work; zero definitions remain in `src/` |
| Was it vote-derived? | **Yes, historically** — it computed `supportRatio` from `claim_votes` |
| What consumers existed? | `ClaimCredibilityBadge`, `CredibilityTooltip`, claim-card credibility display |
| What was removed/fixed? | Prior Phase A work removed the function, components, and DB triggers. In this session, residual vote-text leakage in the State of Understanding component was identified and removed (see below). |
| Final status | **CLEAN** |

### Fix applied in this session

`src/features/discussions/components/state-of-understanding.tsx` displayed `formatCommunityStance(totalVotes, agreementPercentage)` in three locations (Supported column, Contested column, Unresolved column). This constituted vote-derived wording inside the State of Understanding, which the approved specification explicitly prohibits:

> "Vote-derived wording/presentation must not imply that community stance is SoU."

The `formatCommunityStance` calls were removed from all three SoU columns. The function itself remains in `understanding-utils.ts` as dead code; it is no longer imported or called by any live component.

---

## Epistemic Contamination

Focused repo-wide sweep performed for:

- `claim_votes` → reputation / credibility / SoU / ranking
- `evidence_votes` → reputation / credibility / SoU / ranking
- `consensusRatio` / `supportRatio` → ranking / credibility
- `reputation` triggers / bonuses / penalties
- `winner` / `loser` / `draw` / `scorecard` / `resolution`

### Remaining paths verified

| Path | Status |
|---|---|
| votes → reputation | **REMOVED** — `handle_claim_vote_insert/delete` and `handle_evidence_vote_insert/delete` triggers dropped in migration `202609090007`; `recalculate_user_reputation` now computes contribution-based score only |
| votes → credibility | **REMOVED** — `computeCredibility`, `ClaimCredibilityBadge`, `CredibilityTooltip` removed from source |
| votes → SoU | **REMOVED** — `deriveStateOfUnderstanding` uses only evidence direction counts; vote text removed from SoU display |
| votes → evidence quality | **NOT PRESENT** — evidence quality is determined by `direction` (support/contradict/context), not votes |
| votes → recommendations/ranking | **REMOVED** — homepage `groupUnderstandingEvolved` now sorts by `updated_at` (neutral); `get_my_understanding_evolved` RPC no longer uses `|consensusRatio - 50|` ordering |
| retraction → reputation penalty | **REMOVED** — `CLAIM_RETRACTED -20` and `EVIDENCE_RETRACTED -15` triggers dropped in migration `202609090007` |
| evidence voting | **NOT PRESENT** — no `castEvidenceVote`, `EvidenceVoting`, or evidence-vote UI exists in `src/` |

### Residual data (allowed)

- `claim_votes` and `evidence_votes` tables still exist and are preserved per data-preservation policy.
- `consensusRatio`, `agreeCount`, `disagreeCount` remain in types and views as descriptive stance data.
- `agreementPercentage` is still computed in `understanding-utils.ts` but is **no longer rendered** in any live UI.
- `formatCommunityStance` exists as dead code in `understanding-utils.ts`; not imported anywhere.

None of these residual data paths feed into reputation, credibility, SoU, or ranking.

---

## Phase A Foundations

### 7A. Message → Claim Conversion

| Check | Result |
|---|---|
| Original message becomes Claim in place | **VERIFIED** — `convert_message_to_claim` RPC inserts `claims` row copying content + `created_at`, then marks `messages.converted_claim_id` and sets `message_type = 'claim'` |
| No duplicate conversational message | **VERIFIED** — single-row promotion; no copy+link extraction |
| Server-side authorized | **VERIFIED** — `SECURITY DEFINER` RPC with `auth.uid()` author-only check, same-room invariant, length validation (25–500 chars) |
| Conversational origin preserved | **VERIFIED** — `origin_message_id` set to original message; replies preserved via `parent_message_id` |
| Appropriate validation exists | **VERIFIED** — message type check, already-converted check, claim_type/context_type validation |

**Migration:** `202609090001_claim_conversion_foundation.sql`
**Service:** `discussion-service.ts:1105` — `convertMessageToClaim`
**Types:** `discussion/types.ts` — `DiscussionClaim` includes `originMessageId`

### 7B. Claim Deletion Lock

| Check | Result |
|---|---|
| 20-minute deletion lock exists | **VERIFIED** — `claim_delete_with_lock` trigger enforces `created_at > now() - lock_duration_minutes` |
| Server-side enforcement exists | **VERIFIED** — `SECURITY DEFINER` trigger on `DELETE`; author-only check |
| Deletion lock = deletion eligibility, NOT expiration | **VERIFIED** — soft-delete tombstone (`deleted_at`, `deleted_by`, content placeholder); claim remains in database |
| Deletion does not silently destroy context | **VERIFIED** — `claim_votes` and `inquiry_items` FKs changed to `SET NULL`; `claim_evidence` and `claim_relations` remain linked to tombstoned claim (composite PKs prevent `SET NULL`); placeholder rendering available via view |
| Related Evidence/Arguments remain understandable | **VERIFIED** — soft-delete preserves claim row; evidence/arguments retain their claim relationship |

**Migration:** `202609090002_claim_deletion_lock_foundation.sql`
**Config:** `claim_deletion_config` table with `lock_duration_minutes` (default 20)

### 7C. Claim Requests

| Check | Result |
|---|---|
| Requests are aggregated | **VERIFIED** — `claim_requests_aggregated` view groups by `message_id` with counts per status |
| Multiple requests do not create multiple popups | **VERIFIED** — unique constraint `(message_id, requester_id)`; aggregated view provides single state per message |
| Requester count/state represented | **VERIFIED** — `pending_count`, `accepted_count`, `skipped_count`, `declined_count`, `total_count` |
| Accept converts message to Claim | **VERIFIED** — `decide_claim_request` calls `convert_message_to_claim` on accept |
| Skip does not punish sender | **VERIFIED** — status set to `skipped`; no reputation events |
| Decline does not punish sender | **VERIFIED** — status set to `declined`; no reputation events |

**Migration:** `202609090003_claim_requests_foundation.sql`
**RPCs:** `create_claim_request`, `decide_claim_request`, `get_claim_request_state`
**Service:** `discussion-service.ts:1128` — `createClaimRequest`, `decideClaimRequest`, `getClaimRequestState`

### 7D. Discussion Arguments

| Check | Result |
|---|---|
| Arguments attach to one primary Claim | **VERIFIED** — `arguments.claim_id` NOT NULL references `claims.id` |
| Supporting/challenging relationship exists | **VERIFIED** — `stance` CHECK constraint (`supporting`, `challenging`) |
| Arguments can participate in conversation | **VERIFIED** — `room_id` scoped; replies can target argument rows |
| Arguments preserve conversational origin | **VERIFIED** — `created_by`, `created_at`, `identity_mode` preserved; view `discussion_arguments` includes redaction |
| NO argument voting/scoring exists | **VERIFIED** — zero hits for `toggle_argument_vote`, `argument_vote`, or any scoring column on `arguments` |

**Migration:** `202609090004_discussion_arguments_foundation.sql`
**RPCs:** `create_argument`, `retract_argument`
**Service:** `discussion-service.ts:1187` — `createArgument`, `retractArgument`
**Types:** `discussion/types.ts` — `Argument`, `DiscussionArgument`

### 7E. Reactions

| Check | Result |
|---|---|
| Lightweight reactions exist | **VERIFIED** — `reactions` table with `reaction_type` CHECK (`like`, `insightful`, `curious`) |
| Reactions are separate from Support/Challenge | **VERIFIED** — distinct `reactions` table; no agree/disagree mapping |
| Reactions do not affect SoU/credibility/reputation | **VERIFIED** — no triggers, no reputation events, no credibility computation |

**Migration:** `202609090005_reactions_foundation.sql`
**RPC:** `toggle_reaction`
**Service:** `discussion-service.ts:1232` — `toggleReaction`
**Types:** `discussion/types.ts` — `Reaction`, `ReactionAggregate`

### 7F. Saved Room Alias

| Check | Result |
|---|---|
| Aliases are private to the user | **VERIFIED** — `user_saves.alias`; existing RLS restricts to `user_id = auth.uid()` |
| Alias only applies to saved rooms | **VERIFIED** — RPC `update_saved_room_alias` requires existing save record |
| Canonical room title is unchanged | **VERIFIED** — alias stored on `user_saves`, not on `rooms` |
| Alias does not become public metadata | **VERIFIED** — `get_user_saves_with_aliases` returns alias only for the authenticated user |

**Migration:** `202609090006_saved_room_alias_foundation.sql`
**RPCs:** `update_saved_room_alias`, `get_user_saves_with_aliases`

### Evidence Voting Removal

Evidence voting was explicitly rejected for Phase A.

| Check | Result |
|---|---|
| Evidence voting UI absent | **VERIFIED** — no `EvidenceVoting`, `castEvidenceVote`, or evidence-vote component in `src/` |
| Evidence voting service absent | **VERIFIED** — no `castEvidenceVote` function in `discussion-service.ts` |
| Evidence vote triggers removed | **VERIFIED** — migration `202609090007` drops `handle_evidence_vote_insert/delete` |
| Evidence vote rows preserved | **VERIFIED** — table retained; consumers removed |

---

## Security / RLS

All new Phase A database objects were inspected for authorization issues:

| Object | RLS Status | Key Policies |
|---|---|---|
| `arguments` | Enabled | Read in accessible rooms; author-only insert/update |
| `claim_requests` | Enabled | Requester-only read of own requests; author read of requests on their messages; authenticated insert |
| `reactions` | Enabled | Read in accessible rooms; authenticated insert/delete (own reactions) |
| `user_saves` (alias) | Existing | Owner-only via `user_id = auth.uid()` |
| `claim_deletion_config` | No RLS (config table) | No user-facing access; read by `SECURITY DEFINER` trigger only |

All new RPCs are `SECURITY DEFINER` with `set search_path = public` and explicit `auth.uid()` checks. Grants are restricted to `authenticated`; `public` and `anon` are revoked.

---

## Validation

| Check | Result | Details |
|---|---|---|
| TypeScript (`tsc --noEmit`) | **PASS** | 0 errors |
| ESLint (`npm run lint`) | **PASS** | 0 errors, 8 pre-existing warnings (scripts + 2 source files) |
| Production build (`npm run build`) | **PASS** | Compiled successfully; all routes generated |
| Tests (`tests/`) | **NOT RUN** | Existing `phase5c-onboarding-qa.spec.ts` requires authenticated seed environment; no Phase A-specific test suite exists yet |
| Playwright runtime | **PASS (7/7)** | Homepage, discussions feed, debates feed, saved auth-gate, and responsive overflow checks at 375px and 1440px all passed |

---

## Production Migration Status

**NOT VERIFIED**

No production database access was available during this reconciliation. The 8 Phase A migration files exist in `supabase/migrations/` but their application to production has not been verified.

| Migration | Purpose |
|---|---|
| `202609090001_claim_conversion_foundation.sql` | In-place message→claim conversion |
| `202609090002_claim_deletion_lock_foundation.sql` | 20-min configurable soft-delete lock |
| `202609090003_claim_requests_foundation.sql` | Aggregated Request-as-Claim |
| `202609090004_discussion_arguments_foundation.sql` | Discussion Arguments entity |
| `202609090005_reactions_foundation.sql` | Lightweight reactions |
| `202609090006_saved_room_alias_foundation.sql` | Private saved-room aliases |
| `202609090007_epistemic_cleanup.sql` | Vote→reputation/credibility removal |
| `202609090008_homepage_vote_ordering_cleanup.sql` | Neutral homepage ordering |

Production verification must be obtained before any trigger/RLC-touching migrations are modified or before Phase A is declared production-ready.

---

## Remaining Conditions / Blockers

1. **Missing React Query hooks** — Service functions for conversion, claim requests, arguments, and reactions exist in `discussion-service.ts`, but corresponding hooks are not yet exported from `use-discussions.ts`. This is a UI-layer gap expected to be addressed in Phase B. It does not block the database/server foundation.

2. **Dead code with vote data** — `map-tab.tsx` and `graph-view.tsx` (dead/optional components) still display `consensusRatio` and vote counts. These components are not imported by any live route. They should be removed or demoted in Phase O legacy cleanup.

3. **No Phase A test coverage** — No automated tests exist for the new Phase A RPCs, migrations, or epistemic-cleanup behavior. This is a validation gap for Phase P.

4. **Production migration unverified** — As stated above, production state is NOT VERIFIED.

---

## Files Changed

| File | Change |
|---|---|
| `src/features/discussions/components/state-of-understanding.tsx` | Removed `formatCommunityStance` vote-text display from all three SoU columns (Supported, Contested, Unresolved) |
| `src/features/discussions/components/understanding-utils.ts` | Removed `formatCommunityStance` calls from `statusReason` strings for unresolved claims |

No migrations were modified. No product documentation was modified.

---

## Conclusion

Phase A is structurally complete and epistemically safe. The two critical concerns raised in the prompt were:

1. **Argument voting** — does not exist; confirmed clean.
2. **Vote-derived credibility** — was removed in prior Phase A work; one residual SoU vote-text leak was found and fixed.

The repository is ready to proceed to Phase B (room shell/routing) under the conditions documented in `docs/PHASE_7D_PRE_IMPLEMENTATION_GATE.md`.
