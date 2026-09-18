# Phase 7D / Phase F — Lifecycle Gap Closure Report (Isolated Verification)

**Date:** 2026-09-12
**Agent:** OpenCode (migration-safety + QA; isolated verification only)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → implementation.
**Environment:** isolated embedded-PostgreSQL 18 (temp storage, destroyed afterward). **Zero production contact for all lifecycle writes.** Production reads only for untouched-proof counts.
**Phase G NOT started.** No src/migration edits. No product behavior invented.

---

## 1. MCPs verified and actually used

| MCP | Status | Use in this task |
|---|---|---|
| Sequential Thinking | WORKING | Test-matrix design (identity ordering, RLS session strategy) |
| Playwright | WORKING (tabs probe) | **Blocked for positive UI lifecycle** — no staging backend exists (app requires Supabase Auth); read-only post-apply QA already on record |
| GitHub Official | WORKING (identity probe) | Verified available; not materially needed (git CLI sufficed) |
| Context7 | WORKING (resolve probe) | Verified available; not materially needed (no framework questions arose) |
| Fetch | WORKING (example.com probe) | Verified available; not materially needed |

No MCP outage is claimed; un-used MCPs are reported as such, not pretended.

## 2. Test infrastructure audit (A)

Existing: `scripts/phase-f-conversion-regression.sql` (7 assertions, needs a real project + two sessions — still the right vehicle for staging day); QA credential document (member+owner, production-scoped — correctly NOT used for writes here); lifecycle/QA Playwright scripts (production-targeted); `tests/` (one onboarding spec). Missing: staging/local Supabase config, seed utilities, isolated fixtures — built ad hoc in OS temp for this session (not committed).

## 3. Isolated fixture (B)

Embedded PG + platform stubs (roles, `auth.users`/`uid()` GUC-switchable, minimal `storage`, realtime publication) + full chain (54 base + all 13 pending incl. amended 7D, filename order) + 4 identities (author, 2 requesters, outsider) + public room, private debate (participant), 6 messages, claims/evidence/source. Documented harness-only deviations: CASCADE replay of bare view drops (pre-existing chain quirk), prod-mirroring effective grants (see §5), test-only `decide()` status mapping (see §4), seeded `updated_at` handling. RLS exercised under `SET ROLE` (superuser bypass would have masked it); RPC authorization via GUC identity, mirroring JWT semantics.

## 4. Lifecycle results (C) — 40/40 assertions PASS

- **Request/aggregate:** two requesters → distinct rows, one aggregated state (`pending_count=2`); duplicate re-request upserts; author sees 2 requester identities; outsider/anon see counts only, identities hidden.
- **Decide guards:** non-author → `not_author`, zero persistence.
- **Accept (with deviation):** exactly one claim, author/content/`created_at` preserved, message marked in place with content intact, no duplicate message, both requests → `accepted`.
- **Skip/Decline:** bulk transition, nothing converted, no reputation events (only approved `CLAIM_CREATED` from conversion; zero vote/penalty/competitive types anywhere).
- **Freeze + 5-minute rule:** converted edit → `converted_frozen`; old-message edit → window error; RLS dormant-delete proven (0 rows, intact).
- **Deletion lock:** in-lock timing proven in prior verbatim harness; post-lock tombstone preserves row + `claim_evidence` link; argument create/retract/immutability/tombstone-attempt verified.
- **Private RLS:** participant sees state; outsider and anon see nothing.
- **Reactions:** toggle on/off with aggregate tracking; vote insert → zero reputation events, stance descriptive, vote fully removed.
- **Invalidation:** code re-verified (`aggregated`+`my`, `exact:false`, all three mutations); live refresh needs the app layer (below).

## 5. New defects found (recorded, NOT fixed — out of scope for validation)

- **F1 (CRITICAL, production-live): `decide_claim_request` writes `status = p_decision` (`accept`/`skip`/`decline`) but the CHECK requires (`accepted`/`skipped`/`declined`) — only `skip`/`decline`... correction: NONE match except by accident (`skip`≠`skipped`, `decline`≠`declined`, `accept`≠`accepted`). Proven: shipped function fails 23514 on all three decisions. **Accept/Skip/Decline buttons error in production today.** Remediation: one-line mapping (`accept→accepted`, etc.) in a forward migration (owner approval required).
- **F2 (HIGH, dormant path): argument tombstone writes a 32-char placeholder violating the 50-char `arguments_content_length` CHECK — argument soft-delete can never succeed as shipped.** Remediation: longer placeholder or CHECK relief, forward migration.
- **G1–G3 reframed as grant drift (MEDIUM, fresh-env risk):** repo files grant no direct table SELECTs, yet production evidently does (probed live: member SELECT 200 on `claim_requests`/`arguments`/`reactions`/`messages` + UPDATE/DELETE behaviors). Fresh repo-built environments would deny paths production allows (e.g. `getMyClaimRequests`). Remediation: capture effective grants in a forward migration (owner decision). RLS policies themselves verified correct (requester narrowed to own rows, outsider zero rows).

## 6. RLS results

Author/requester/outsider/anon matrices proven for requests (table + view), messages (edit window + freeze), claims/arguments delete-dormancy, private-room aggregated visibility, votes, reactions. No leakage observed in any path.

## 7. Playwright results (D)

Positive UI lifecycle (request→Accept UI states, conversion rendering, banner transitions, mobile) remains **BLOCKED — no staging backend** (app hard-requires Supabase Auth; pointing it at embedded PG is infeasible; production writes forbidden). Post-apply read-only browser QA (8/8 targets, 0 errors) stands from the 30-check report. Screenshots of isolated SQL flows are N/A (no UI in this environment by construction).

## 8. Cleanup verification (E)

Embedded instance + data dir destroyed (verified absent); temp harness scripts remain outside the repo. Production untouched: history zero-pending (unchanged) + member-visible counts identical (messages 16, claims 22, rooms 11, debates 9). Net-zero live probes from the prior session re-verified clean (vote remaining=0, reactions restored).

## 9. Failures / gaps remaining

1. **F1 decide-status mapping** (critical, prod-live) — forward migration required.
2. **F2 argument tombstone length** (dormant path) — forward migration required.
3. **Grant-capture migration** (fresh-env parity) — owner decision.
4. **UI positive lifecycle + live invalidation refresh** — seeded staging Supabase required (recommend: staging project + `phase-f-conversion-regression.sql` + two-identity Playwright lifecycle).

## 10. Verdict — Phase F stays PASS WITH GAPS (upgrade to PASS: NO)

Backend lifecycle design is now **fully proven in isolation** (40/40), but full PASS is correctly withheld: F1 breaks the core Accept/Skip/Decline actions in production today, and UI-layer positive proof needs staging. Narrowed, actionable gaps above replace the previous open-ended ones. Phase G NOT STARTED.
