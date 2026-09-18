# Phase 7D — Phase F (Request-as-Claim) Takeover Implementation Report

**Date:** 2026-09-11
**Agents:** Kilo (prior interrupted work, inherited) + OpenCode (takeover, this session)
**Status:** PASS WITH GAPS (see §18)

---

## 1. Executive summary

Phase F (Request-as-Claim: aggregated request state + author Accept / Skip / Decline + in-place conversion) was inherited substantially implemented but unfinished: the Phase F report was an empty placeholder, the advertised React Query stop-point fix was already present in the working tree, and two genuine gaps remained — (a) `useDecideClaimRequest` / `useConvertMessageToClaim` never invalidated the `["claimRequests","my",roomId]` cache shape, and (b) nested replies rendered their **parent's** request banner instead of their own. This session applied those minimal fixes, added error/pending states, corrected stale "Extract Claim" copy, and ran full validation (tsc / lint / build PASS; Playwright discussion + debate × 4 viewports, 0 overflow, 0 5xx).

The binding constraint on a full PASS: the target Supabase database reachable via `.env.local` does **not** have the Phase 7D migrations applied (`create_claim_request` RPC missing from schema cache; `claim_requests`, `claim_requests_aggregated`, `reaction_aggregates`, `user_saves.alias` all absent). The frontend degrades gracefully, but the live Accept / Skip / Decline lifecycle is **NOT VERIFIED** end-to-end. No migration was applied by this session (out of scope, no backup/approval); production schema status remains **NOT VERIFIED**.

Phase G was NOT started. No MD was modified. No product decision was invented.

---

## 2. Takeover state

Inspected before any edit (`git status --short`, `git diff --stat`, `git log --oneline -15`):

- Working tree carries a large **uncommitted** changeset: 65 modified files (Phase 6E/7A/7B + Phase 7D A–E work, preserved, not reverted) plus untracked Phase 7D artifacts: 8 foundation migrations (`202609090001`–`202609090008`), new components (`claim-request-banner.tsx`, `unified-composer.tsx`, `claim-lens-card.tsx`, `claims-lens-section.tsx`, `debate-claims-lens-section.tsx`, `claim-in-conversation.tsx`, `message-reactions.tsx`, `typing-indicator.tsx`), new routes (`discussions/[slug]/sources`, `understanding`, `debates/[slug]/claims|sources|understanding`), and Phase F QA scripts (`phase7d-phase-f-qa.mjs`, `phase7d-phase-f-auth-qa.mjs`, `phase7d-phase-f-lifecycle.mjs`, `phase7d-phase-f-dbcheck.mjs`, `phase7d-phase-f-debug.mjs`, `phase7d-phase-f-debug2.mjs`).
- `docs/PHASE_7D_PHASE_F_IMPLEMENTATION_REPORT.md` contained only `@` (empty placeholder). Phase E report records PASS; Phase F had no report.
- Prior QA artifacts present: `docs/phase_f_qa_results.json` (guest: 0 action buttons, overflow PASS, 10× 404 console errors), `docs/phase_f_lifecycle_results.json` (`requestCreated:true` but `memberRequestStateVisible:false`, author controls 0).
- HEAD (`main`, `0223c70`) contains **zero** claim-request code — all of it is uncommitted inherited work.

Mandatory docs read this session: `DISCORA_AGENT_GOVERNANCE.md` (full), `DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (§0–§3 + request-relevant sections), `PHASE_7C_AUDIT_RECONCILIATION.md` (via gate references), `PHASE_7D_IMPLEMENTATION_PLAN.md` (full), `PHASE_7D_PRE_IMPLEMENTATION_GATE.md` (full), `PHASE_7D_PHASE_D_CONVERSATION_UX_CORRECTION_REPORT.md`, `PHASE_7D_PHASE_D_FINAL_CONVERSATION_POLISH_REPORT.md`, `PHASE_7D_FINAL_CONVERSATION_UX_CORRECTION_2_REPORT.md` (bubble-geometry authority), `PHASE_7D_PHASE_E_IMPLEMENTATION_REPORT.md` (full).

---

## 3. What was already implemented (inherited, verified by inspection)

- **DB foundation** `supabase/migrations/202609090003_claim_requests_foundation.sql` (+ conversion `...090001`, deletion-lock `...090002`, arguments `...090004`, reactions `...090005`, saved-alias `...090006`, epistemic cleanup `...090007`, homepage ordering `...090008`): table + unique `(message_id, requester_id)` + indexes + SECURITY DEFINER trigger/RPCs + RLS + aggregated view (see §7).
- **Service layer** (`discussion-service.ts`): `createClaimRequest`, `decideClaimRequest`, `convertMessageToClaim`, `getClaimRequestState`, `getClaimRequestsForMessages` (PGRST205-tolerant), `getMyClaimRequests` — all RPC-backed, no direct table writes.
- **Query layer** (`use-discussions.ts`): `useClaimRequests` (dual `aggregated` + `my` keys with sorted-id segments), `useCreateClaimRequest`, `useDecideClaimRequest`, `useConvertMessageToClaim`.
- **UI**: `claim-request-banner.tsx` (author Accept/Skip/Decline; skipped/declined subtle states with `+ Add as Claim`; non-author requested/count states; single aggregated card — no duplicate popups), `comment-item.tsx` action bar (Reply / React / Request-as-Claim-or-Make-this-a-Claim / More), wiring in `discussion-contributions-section.tsx` and `debate-room.tsx` (toasts on success).
- **Stop-point check**: the advertised `exact:false` invalidation for the dynamic-ids keys was **already applied** in all three mutation hooks — verified in the working tree, not blindly re-applied (see §6 for what was actually still missing).

---

## 4. What was missing / broken (found this session)

1. **`my`-cache invalidation gap (VERIFIED).** `useDecideClaimRequest` and `useConvertMessageToClaim` invalidated `["claimRequests","aggregated",roomId]` (exact:false) but never `["claimRequests","my",roomId]`. After an author decision or conversion, a requester's "You requested…" state would stay stale until natural refetch. Same class of bug as the stop-point note, on the adjacent key.
2. **Nested-reply banner reuse (VERIFIED).** `comment-item.tsx` recursion passed the parent's `claimRequestState` / `hasUserRequestedClaim` straight into every child (`line ~627`), so a reply rendered its parent's Accept/Skip/Decline banner and request affordance. Affects discussion and debate (shared component).
3. **No error states.** Request / decide / convert mutations had `onSuccess` toasts only; failures (e.g. RPC missing, `already_claim`, `own_message`) surfaced nowhere. `ClaimRequestBanner`'s `isPendingAction` prop was never wired, so Accept/Skip/Decline stayed clickable mid-flight.
4. **Stale terminology.** Post-contribution guidance banners still referenced legacy `Extract Claim` copy instead of the approved in-place `Make this a Claim` (`discussion-contributions-section.tsx`, `debate-room.tsx`).
5. **Report missing.** Phase F report was an empty placeholder.
6. **Environment (NOT a code bug).** Target DB lacks the Phase 7D migrations, so no live request row can exist there; full lifecycle unverifiable until migrations are applied out-of-band (see §16).

---

## 5. Exact changes made (this session only)

| File | Change |
|---|---|
| `src/features/discussions/hooks/use-discussions.ts` | `useDecideClaimRequest.onSuccess` += `invalidateQueries({queryKey:["claimRequests","my",roomId], exact:false})`; same addition in `useConvertMessageToClaim.onSuccess`. |
| `src/features/discussions/components/comment-item.tsx` | New optional props `claimRequestsMap`, `myClaimRequests`, `isRequestActionPending`; per-message resolution (`resolvedRequestState`, `resolvedHasRequested`; single props kept as fallback for legacy `discussion-room.tsx` caller); banner + action-bar consume resolved values; recursion threads the maps + pending flag; `isPendingAction` forwarded to banner (buttons disable mid-decision). |
| `src/features/discussions/components/discussion-contributions-section.tsx` | Passes `claimRequestsMap={requestsMap} myClaimRequests={myRequests} isRequestActionPending={decide…isPending}`; `onError` toasts on request/decide/convert; `Extract Claim` → `Make this a Claim` guidance copy. |
| `src/features/debates/components/debate-room.tsx` | Same wiring + error toasts + copy fix as discussion contributions. |
| `scripts/phase7d-phase-f-debate-qa.mjs` | NEW focused supplementary QA: member login, debate + discussion action/stance/winner-loser/composer snapshot, 8 room×viewport overflow checks + screenshots, results to `docs/phase_f_debate_qa_results.json`. |
| `docs/PHASE_7D_PHASE_F_IMPLEMENTATION_REPORT.md` | This report (was placeholder). |
| `docs/phase_f_debate_qa_results.json` | New QA artifact. |

Deliberately NOT changed: migrations (no new/duplicated/edited), RLS, conversion RPC semantics, SoU, reputation, sidebar/nav, composer, claims lens, evidence/arguments, notifications (none exist — in-room state only, per gate).

---

## 6. React Query / cache behavior

- **Keys (unchanged, verified):** `["claimRequests","aggregated",roomId,ids]` and `["claimRequests","my",roomId,ids]`, `ids` memo-sorted/deduped in `useClaimRequests`; `enabled` gated on `ids.length > 0` (debate additionally on contributions lens).
- **Invalidation (after fix):** `useCreateClaimRequest` → aggregated + my (exact:false) ✓ (inherited). `useDecideClaimRequest` → aggregated + **my** (exact:false, fixed) + `invalidateRoomQueries(messages|claims)` ✓. `useConvertMessageToClaim` → messages + claims + `discussionOverview` + aggregated + **my** (exact:false, fixed) ✓. `exact:false` prefix-matching is the correct React Query v5 treatment for the dynamic `ids` segment.
- **Aggregation integrity:** one banner per message by construction (`requestsMap.get(message.id)`); after this session's fix, nested replies resolve their own entries instead of inheriting the parent's — no duplicate popups/cards possible from the client. Re-request after Skip/Decline revives `pending` via upsert, and the banner prioritises the pending author controls (matches approved "updated state may become visible again").
- **Residual:** no optimistic updates (mutations rely on invalidation + 15s stale time + manual `refetch` handle). Acceptable for V1; not a correctness defect.

---

## 7. Database / RLS findings (static inspection + read-only live probe)

Migration `202609090003_claim_requests_foundation.sql` reviewed in full. Sound design, no changes made:

- Table `claim_requests` (message FK CASCADE, requester FK CASCADE, room FK CASCADE, status CHECK pending/accepted/skipped/declined, unique `(message_id, requester_id)`), 4 indexes.
- `handle_claim_request_insert` trigger (SECURITY DEFINER, `search_path=public` pinned): forces `requester_id=auth.uid()`, derives `room_id` from message.
- RLS: requesters select own; authors select requests on own messages; authenticated insert with `requester_id=auth.uid()` check; requesters update own (withdraw path). No anon write. Aggregated view `claim_requests_aggregated` granted to anon+authenticated but room-gated (public non-archived OR created_by) and exposes `requester_details` **only** to the message author via `m.user_id = auth.uid()` CASE — no requester-identity leak to third parties.
- `create_claim_request` RPC: auth required; room access incl. private-debate participant check; blocks self-request (`own_message`), non-`message` types, already-converted (`converted_claim_id`); upsert-per-requester (duplicate-safe, aggregation-preserving).
- `decide_claim_request` RPC: author-only (`not_author` otherwise); requires pending row; bulk-updates all pending rows to the decision; `accept` delegates to `convert_message_to_claim` (in-place, author + length + type validated server-side).
- Deleted/retracted messages: message DELETE cascades request rows (banner disappears — acceptable); converted messages are blocked from re-request at the RPC layer.
- Live probe (`phase7d-phase-f-dbcheck.mjs`, member session, read-only + one RPC call attempt): room resolved, 12 messages listed, `claim_requests` 0 rows, `create_claim_request` → **`Could not find the function public.create_claim_request(p_message_id) in the schema cache`**. Conclusion: the migration exists in-repo only and is **not applied** to the reachable database. No data was mutated by this session (the single RPC attempt failed at function lookup).

---

## 8. Security findings

- No RLS weakened; no migration edited/created; no SECURITY DEFINER object touched; authorization (author-only decide/convert, room-gated create) is enforced server-side in RPCs — UI checks are defense-in-depth only. PASS for Phase F scope.
- Authenticated QA used the existing `.discora-qa-credentials` file; credentials never printed, committed, or embedded (scripts read them at runtime; this report contains none).
- No secrets in diffs; `.env.local` only read for the (public) anon key during the read-only DB probe.
- Pre-existing, unrelated: `user_saves.alias` 400 (`column user_saves.alias does not exist`) — Phase 5D alias migration `202609090006` also unapplied; Save flow degrades but is out of Phase F scope. No action taken.

---

## 9. Epistemic safety audit

Searched `src`: `claim_request*`, `requestClaim`, `createClaimRequest`, `decideClaimRequest`, `convertMessageToClaim`, `claim_votes`, `support`, `not agree`, `reputation`, `credibility`, `consensus`, `state of understanding`, `winner`, `loser`, `castEvidenceVote`, `toggle_argument_vote`, `computeCredibility`, `supportRatio`.

- Request-as-Claim introduces **zero** paths to reputation / credibility / SoU / ranking / truth / popularity scores (table, RPCs, service, hooks, banner all count-and-status only). Requesting is not votable, countable only as descriptive state. PASS.
- Support / Not Agree remain descriptive text (`0 Support · 2 Not Agree · 2 votes`), no progress bar, blue/amber active only, no green/red (verified in code and screenshots). `castEvidenceVote`, `toggle_argument_vote`, `computeCredibility`, `supportRatio`: **zero hits in `src`** (evidence voting stays removed; `useVoteEvidence` already deleted in working tree).
- No Winner/Loser/Draw/scorecard in live room UI: 0 mentions in debate + discussion DOM snapshots; `debate-resolution.tsx` / `debate-scorecard.tsx` remain deleted in working tree.
- Known legacy (out of Phase F scope, flagged not fixed): `discussion-intelligence.tsx` consensus display and `map-tab.tsx` `consensusRatio` (unmounted dead code per Phase E, removal = Phase O); `understanding-utils.ts` carries descriptive `totalVotes/agreementPercentage` fields and a comment referencing a stance-division rule, but the implemented branch derives state from contradicting-evidence counts only and zero-evidence claims stay unresolved regardless of votes (SoU state clean; full cleanup = Phase J); `evidence-section.tsx` "votes will be permanently retracted" legacy copy (Phase G area).

---

## 10. Responsive QA

Matrix: discussion + debate rooms × 375 / 390 / 834 / 1440 (authenticated member session, production server, `phase7d-phase-f-auth-qa.mjs` + new `phase7d-phase-f-debate-qa.mjs`):

| Room | 375 | 390 | 834 | 1440 |
|---|---|---|---|---|
| Discussion | PASS, no overflow | PASS, no overflow | PASS, no overflow | PASS, no overflow |
| Debate | PASS, no overflow | PASS, no overflow | PASS, no overflow | PASS, no overflow |

Fixed composer visible above mobile nav at 375/390 in both rooms; request/convert controls reachable; no horizontal scroll in any of the 8 captures.

---

## 11. Playwright results (direct Playwright use, production server :3000)

- **Guest** (`phase7d-phase-f-qa.mjs`): Reply/React/Request/More = 0 (expected — action bar requires login), Accept/Skip/Decline = 0 (no rows can exist), 0 overflows, 0 5xx. Console errors = only the known backend-404s (see below).
- **Authenticated member** (`phase7d-phase-f-auth-qa.mjs`, login OK): Reply=12, React=12, Request=3, More=12; own-message `Make this a Claim`=0 explained — member's normal messages are already converted to claims (7 claim bubbles on the room; owner-session probe: 12 messages = 7 claims + 2 own-normal + 1 other-normal + 2 questions, matching Make=2 / Request=1 exactly). Unobtrusive action row; no duplicate request UI.
- **Owner**: Make-this-a-Claim=2, Request-as-Claim=1 (others'/anon message), Accept/Skip/Decline=0 (no pending rows — backend gap, not UI gap).
- **Debate supplementary** (member): Reply=1, React=1, Request actions present, Make=0 (sole message is another user's), Accept/Skip/Decline=0, **winnerLoserMentions=0**, composer present.
- **Lifecycle** (`phase7d-phase-f-lifecycle.mjs`): request button clicked (`requestCreated:true`) but no state persists (`memberRequestStateVisible:false`, author controls 0, aggregation invisible) — consistent with missing RPC; failure surfaces via the new error toast path instead of silent state. NOTE: the script's step-4 assertion (`authorNoRequestButton:false`) is a script artifact — it counts the Request button on *other users'* messages, which the author correctly still sees. Not a product defect.
- **Network**: 0 5xx everywhere. 4xx fully characterised: 404 `claim_requests_aggregated` + 404 `claim_requests` + 404 `reaction_aggregates` (unapplied Phase 7D migrations; code handles PGRST205 gracefully) and 400 `user_saves` (`alias` column missing — unapplied Phase 5D migration, unrelated). No new failures introduced by this session's edits.

---

## 12. Screenshot / visual QA (all 8 inspected)

`docs/screenshots_phase_f/`: `discussion|debate × desktop_1440|tablet_834|mobile_390|mobile_375`.

- Conversation feels like people talking: other-user left, current-user right, constrained bubble widths, short messages stay short.
- Claims: subtle blue highlight + CLAIM/type badges + origin-preserving in-place position; examination actions (+Evidence/+Argument/Inquiry) compact; stance descriptive and subordinate.
- Question: amber highlight + QUESTION badge (visible tablet discussion).
- Request UI: single subtle banner slot per message; mobile "Request" label compact; no full-width record appearance; no duplicated cards.
- Header identity correct in all captures (title + DISCUSSION/DEBATE badge; debate motion + proposition/opposition).
- Composer fixed and visible in all 8; no overlap with mobile nav; no cramped/unreadable controls; no excessive empty space beyond the debate room's legitimately single contribution.
- No green/red truth semantics; no Winner/Loser/scorecard anywhere.

---

## 13. TypeScript result

`npx tsc --noEmit` → **PASS (exit 0, zero errors)**, run after all `src` edits. (Note: per Phase E report, raw `tsc` immediately after `build` can emit stale `.next/types` noise; this run was performed pre-build and is clean.)

---

## 14. ESLint result

`npm run lint` → **PASS, 0 errors, 18 warnings** — all pre-existing (`scripts/phase5d-*`, `debate-room.tsx`, `understanding-utils.ts`, `use-discussions.ts _roomId`, etc.). The one warning briefly introduced by the new QA script was removed; final count matches the pre-existing baseline.

---

## 15. Build result

`npm run build` → **PASS** — all routes generated, including `debates/[slug]/claims|sources|understanding` and `discussions/[slug]/sources|understanding`. No type or prerender failures.

---

## 16. Production schema status

**NOT VERIFIED** — and affirmatively: the database reachable from this environment does **not** have the Phase 7D foundation migrations applied (see §7 probe). `202609090001`–`202609090008` exist in `supabase/migrations/` only. No migration was created, edited, or applied in this session; no destructive operations performed. Applying the pending migrations (with backup + RLS re-verification) is the prerequisite for a live lifecycle PASS and must be done out-of-band with owner approval.

---

## 17. Known limitations

1. Full Accept / Skip / Decline lifecycle NOT VERIFIED live (backend gap, §7/§16). UI states for skip/decline copy exist in code (`ClaimRequestBanner`) but were not exercisable.
2. Authenticated QA exercised pre-seeded rooms only; no new request row could be created, so aggregation-count rendering with N>1 requesters is code-verified, not browser-verified.
3. Reply-thread coverage of the nested-banner fix is structural (maps threaded per message id); no nested reply existed in seed data to screenshot a child banner.
4. Legacy vote-derived displays noted in §9 remain for Phase J/O — intentionally untouched.
5. No Phase F-specific automated test suite exists (only pre-existing onboarding spec + ad-hoc Playwright scripts).

---

## 18. Exact Phase F status

**PASS WITH GAPS**

- PASS: aggregated request state model, single-card UI, author Accept/Skip/Decline affordances, in-place conversion path, requester-count presentation, correct React Query invalidation (aggregated + my, exact:false), per-message nested state, error/pending states, responsive/mobile behavior, accessibility of controls (native buttons, titles, focus-reveal preserved), conversation-first UX preserved, epistemic safety, tsc/lint/build green, 0 overflow / 0 5xx across 8 room×viewport targets.
- GAPS: live request lifecycle (request → accept/skip/decline → converted-in-place) browser-verified FAIL-to-verify due to unapplied migrations; multi-requester aggregation count rendering not observed live.

---

## 19. Phase G confirmation

**Phase G (evidence + arguments chronological nodes) was NOT started.** No evidence/argument UI, service, hook, migration, or documentation change was made in this session. No sidebar redesign, no About Discora, no offline/network fallback, no beta/founding-member badges, no MD edits, no new product decisions. Sidebar/nav diffs in the working tree are inherited Phase A–E work, untouched by this session.

---

## Appendix — takeover/completion summary

- **Files changed (this session):** `src/features/discussions/hooks/use-discussions.ts`, `src/features/discussions/components/comment-item.tsx`, `src/features/discussions/components/discussion-contributions-section.tsx`, `src/features/debates/components/debate-room.tsx`, `scripts/phase7d-phase-f-debate-qa.mjs` (new), `docs/PHASE_7D_PHASE_F_IMPLEMENTATION_REPORT.md`, `docs/phase_f_debate_qa_results.json` (new). All other working-tree modifications are inherited and preserved.
- **Migrations changed/created:** none.
- **Tests run:** `npx tsc --noEmit` (PASS), `npm run lint` (0 errors), `npm run build` (PASS), `phase7d-phase-f-qa.mjs` (guest), `phase7d-phase-f-auth-qa.mjs` (member+owner), `phase7d-phase-f-lifecycle.mjs`, `phase7d-phase-f-dbcheck.mjs` (read-only probe), `phase7d-phase-f-debate-qa.mjs` (new; 8/8 overflow PASS, 0 5xx, 0 winner/loser mentions).
- **Production schema status:** NOT VERIFIED (reachable DB demonstrably lacks `202609090001`–`202609090008`).
- **Remaining gaps:** live lifecycle + multi-requester aggregation rendering (blocked on migration apply).
- **Phase F verdict:** PASS WITH GAPS. **Phase G:** not started.
