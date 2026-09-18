# Phase 7D / Phase F — Post-Apply 30-Check Production Validation

**Date:** 2026-09-12
**Agent:** OpenCode (post-apply validation; no further production changes)
**Basis:** 13/13 migrations applied; history Local == Remote, zero pending.
**Method:** read-only REST/CLI + fail-safe negative RPCs + net-zero toggle tests (every write reverted and re-verified) + direct Playwright. No src/migration edits. Phase G NOT started.

---

## A. Migration / schema integrity

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | History zero pending | PASS | `migration list`: no Local-only rows (76-line output) |
| 2 | All 13 present remotely | PASS | 260003–260006, 270001, 090001–090008 all Local == Remote |
| 3 | Tables `claim_requests`, `arguments`, `reactions` exist | PASS | REST 200, empty (correct: no rows yet) |
| 4 | Views `claim_requests_aggregated`, `reaction_aggregates`, `discussion_arguments` + room/lens views exist | PASS | REST 200; `is_moderated` present; `moderation_queue` structurally valid |
| 5 | Phase 7D RPCs exist | PASS | `get_claim_request_state` → 200 live; `create/decide_claim_request`, `create_argument`, `toggle_reaction` proven live via executed validation guards (below); `convert_message_to_claim` / `retract_argument` via history + prior verbatim-harness execution (live positive NOT VERIFIED — fixture) |
| 6 | Winner/Loser infra absent | PASS | `debates.resolution` → 42703 gone; `resolve_debate` → PGRST202 gone; trigger/function drops per applied history; member-visible WON/LOST events zero (global pre-existing absence unverified under RLS, noted) |

## B. Legacy data / disposition

| # | Check | Status | Evidence |
|---|---|---|---|
| 7 | resolved=0, closed=1 | PASS | member probes |
| 8 | `ai vs human` debate closed | PASS | target row `closed`, `updated_at` = push time |
| 9 | No legacy resolution payload | PASS | column gone globally (42703) |
| 10 | No other debate changed | PASS | member-visible debate id-set/counts (9) identical pre/post; migration PK-scoped by file inspection |

## C. Data preservation

| # | Check | Status | Evidence |
|---|---|---|---|
| 11–16 | Rooms 11, discussions 2, debates 9, participants 12, relations 9, inquiries 1+1, profiles 5, topics 10, events 7, prefs 1, messages(view) 16, claims(view) 22, evidence(view) 5, questions(view) 2 | PASS | Every member-visible count identical to the pre-apply manifest; no content retrieved beyond counts |

## D. Claim request lifecycle

| # | Check | Status | Evidence |
|---|---|---|---|
| 17 | Creation available | PASS | RPC live; `own_message` / `not_found` guards execute (fail-safe); positive create needs a fixture |
| 18 | Multi-requester aggregation | BLOCKED — REQUIRES SAFE TEST FIXTURE | Would persist request rows in production; needs isolated env with two identities |
| 19–21 | Accept / Skip / Decline | BLOCKED — REQUIRES SAFE TEST FIXTURE | No pending requests can exist without writes; author-decision path proven only at code/harness level |
| 22 | Invalidation behavior | NOT VERIFIED (live) | Code-level fix verified pre-apply; live refresh cycle needs the fixture above |

Failure handling: no failures occurred; every probe that errored did so on designed guard paths with zero persistence.

## E. Claim conversion

| # | Check | Status |
|---|---|---|
| 23 | In-place path, one-way, origin/author preserved | BLOCKED — REQUIRES SAFE TEST FIXTURE for the positive conversion (would create a live claim); guards + embedded-harness proof stand |
| — | 5-minute rule intact live | PASS — owner edit of own old message rejected server-side (`within 5 minutes`), failed UPDATE = zero persistence |
| — | Converted-freeze | NOT VERIFIED live (no converted messages exist); harness-proven |

## F. Deletion lock / tombstone

| # | Check | Status |
|---|---|---|
| 24 | 20-min server lock, tombstone coherence, FK preservation | NOT VERIFIED live (positive delete would tombstone a real claim) / design PASS (harness-executed; no FK changes shipped; invocation dormant by design) |

## G. Arguments

| # | Check | Status |
|---|---|---|
| 25 | Structure (table/view/RLS/RPC-validates), one-claim + supporting/challenging, no voting/scoring columns | PASS (`invalid_stance` guard executes pre-insert, zero persistence); chronological/lens UI is Phase G scope — N/A |

## H. Reactions

| # | Check | Status |
|---|---|---|
| 26 | Infra + toggle + aggregation live; separate from Support/Not Agree; no reputation/SoU/truth effects | PASS — toggle ON (`true`) then OFF (`false`), aggregates byte-restored; design (trigger-free, reaction-only table) + file-level basis for no-effect paths |

## I. Epistemic isolation

| # | Check | Status |
|---|---|---|
| 27 | No vote-derived contamination | PASS — code sweep zero hits (credibility/voting/competition/winner terms); sole `influential` hit in the unmounted dead cluster; **live proof**: agree-vote insert → reputation_events 7→7, vote removed (remaining=0) — the removed triggers stay removed |

## J. RLS / security

| # | Check | Status |
|---|---|---|
| 28 | Boundaries intact | PASS — anon 9 rooms/7 debates/0 private; member 11/9 (2 private extras); non-author decide → `not_author`; own-message request → `own_message`; aggregates empty-but-gated. Deep private-matrix remains fixture work (noted, not failed) |

## K. Moderation / legacy safety

| # | Check | Status |
|---|---|---|
| 29 | Moderation survives | PASS — `is_moderated` present; `moderation_queue` valid; 0 hidden rows; all message/claim views + counts intact |

## L. Browser / real product QA

| # | Check | Status |
|---|---|---|
| 30 | 8 room×viewport targets | PASS — member session; request/convert actions + composer render against the LIVE backend; 0 overflow, **0 console errors** (missing-table 404s gone post-apply), 0 5xx, 0 Winner/Loser mentions; screenshots re-captured |

---

## Production modification record

Beyond the authorized migration effects: one `claim_votes` row inserted **and deleted** (remaining=0 verified) + one reaction toggled on/off (aggregates byte-restored) + failed-guards (zero persistence by definition). No other writes. No residue.

## Remaining gaps (all require an isolated fixture env, none block integrity)

Positive request/aggregate/decide/convert/delete lifecycles; live invalidation-refresh cycle; converted-freeze observation; deep private-RLS matrix. Recommended: seeded staging project + the repo's `phase-f-conversion-regression.sql` + two-identity Playwright lifecycle.

## FINAL VERDICT

### PASS WITH GAPS
