# Discora — Focused Pre-Beta Closure Report
## Position History UI + Local Environment Safety

**Mode:** TARGETED CLOSURE (Product Owner authorized). Closes two gaps from `docs/PRE_BETA_BROWSER_BEHAVIORAL_VERIFICATION_REPORT.md`. No redesign. No production contact beyond pre-existing read-only ledger state. No commits. No pushes. No new migrations. No unrelated feature changes.
**Date (UTC):** 2026-09-16

---

# Executive Summary

Both gaps are closed:

1. **Position History UI verified live.** There is no standalone Position History screen by approved design (the `PositionHistory` component was deliberately removed from the debate SoU lens in Phase 7E and kept as unused debt — creating a new screen would itself violate scope). The LIVE surface consuming the remediated `debate_side_changes` grant is the profile Contribution Timeline (`side_switch` entries, privacy-gated by `show_side_switches`). Verified in the real browser as the owning user (entry renders: Challenge → Support, date, room link) and as a second user (entry absent — RLS own-only policy holds end-to-end, confirmed at both UI and network layers). Terminology, chronology, identity presentation, and error behavior all correct.
2. **Local environment safety implemented.** `npm run dev` now fails closed when pointed at a hosted Supabase project (new `next.config.ts` guard, production builds exempt, explicit `DISCORA_ALLOW_REMOTE_DEV=true` escape hatch for intentional remote work). `.env.example` rewritten local-first; README environment section updated; `.env.local` (gitignored) repointed to local Supabase with the owner ID preserved. Guard proven: production-shaped URL → immediate startup failure before any network request; escape hatch → starts; normal `npm run dev` → local. No secrets printed anywhere.

**Verdict: PASS** (one new unrelated P2 documented, not fixed per scope rules).

---

# Scope

- Part A: locate the actual Position History UI, verify authorized + unauthorized flows (desktop 1440 + mobile 390, console, network), verify the SoU boundary.
- Part B: audit `.env.local`/`.env.example`/README/scripts/config, implement minimal local-dev protection, verify normal startup + guard rejection.
- Explicitly out of scope (untouched): SoU semantics, relations, friends, invitations, deletion, legal, moderation, Discovery Deck, SEO, notifications, audio, infrastructure, production.

---

# Position History UI Verification

## Implementation finding (no new feature exists — by design)

- `src/features/debates/components/position-history.tsx` exists but has **zero active callers** (repo-wide grep). Phase 7E (`docs/PHASE_7E_UNDERSTANDING_RECONCILIATION.md`) removed it from the debate SoU lens as a HIGH finding and preserved the file as cataloged cleanup debt. Mounting it anywhere new would be a product change — correctly NOT done.
- LIVE consumers of the remediated `debate_side_changes` grant:
  - `useSideChangeHistory` → `DebateSidePicker` (cooldown UI) — also currently unmounted (only `DebateSidePickerModal` renders in `debate-room.tsx:641`).
  - `use-reputation` → `getUserSideChanges` → `ContributionTimeline` (`side_switch` items) on `/u/[username]` — **the live verification surface used here**, privacy-gated by the `show_side_switches` preference (default true; `u/[username]/page.tsx:90-103`, `profile-reputation-section.tsx:79-81`).

## Desktop 1440

As User A (`qaverifya`) on `/u/qaverifya`: Contribution Timeline renders the Side Switch entry — `Side Switch · 9/16/2026`, Challenge → Support icons, link `in QA Verify Room A` → `/discussions/qa-verify-room-a`. Terminology correct (Support/Challenge, not winner/loser); chronology sensible (newest ordering with sibling claims); identity presentation follows rules (own history visible to self); no DB internals, no SQL/RLS text, 0 console errors. **PASS.**

## Mobile 390

Same page at 390×844: stacked layout, mobile bottom nav, timeline entries fully labeled with working links; no overflow/clipping markers in snapshot. **PASS** (snapshot-level; no programmatic scroll measurement in this harness — stated).

## Authorized Flow

Login (A) → profile → Side Switch entry with correct previous/new sides, date, and room link. The entry derives from the fixture side-change row via the previously-403 grant path — end-to-end proof the P1-01 grant restoration works through product UI, not just PostgREST. **PASS.**

## Unauthorized Flow

As User B on `/u/qaverifya`: timeline shows A's 2 public-room claims and **no Side Switch entry**. Network layer confirms the mechanism: `GET debate_side_changes?user_id=eq.<A> => 200` with an empty body (RLS `auth.uid()=user_id` filtered, not an error). Public claims remain visible per their own policies; Add Friend/Block affordances correct for other-user view. **PASS** — no unauthorized data returned, RLS enforced, no SQL details exposed.

## Console

0 errors on: login landing, inquiry detail (re-checked this phase? No — covered last phase; this phase: profile ×2 sessions, friends-adjacent flows, settings-adjacent flows, discussion room). One recurring 403 resource error for `user_reputation_snapshots` (see New Issues — unrelated table, pre-existing grant gap, page renders normally). One transient dev-navigation artifact in the prior phase (cleared on reload). No new product errors from this task's changes.

## Network

All Supabase traffic → local (`192.168.1.5:54321` during dual-reachability testing). Zero requests to `*.supabase.co`. No service-role/server secret/DB password in traffic (anon key header only, by design). Resource UUIDs in query strings are ordinary identifiers, not credentials. Error bodies generic.

---

# SoU Boundary Verification

**PASS** by code inspection + locked unit tests (no SoU code touched):

- `deriveStateOfUnderstanding` inputs are exactly claims/evidence/questions/relations/inquiryCounts/arguments (`understanding-utils.ts:108-115`). No `debate_side_changes` input exists anywhere in the classifier.
- Claim-level `debateSide` is used only to subset claims for side-scoped views; unit tests 11–14b explicitly lock that position/side/vote/headcount data has no epistemic effect (`understanding-utils.spec.ts:297-345`, 28/28 passing this phase).
- The Side Switch timeline entry is presentational/historical (reason + sides + date + room link); it feeds no classifier input. Changing position remains non-punitive and non-epistemic, per the locked decision.

---

# Environment Safety Audit

## Before

- `.env.local` (gitignored, local-only file) pointed at the **production** Supabase project (`https://papmghohpkjaovvmeskd.supabase.co` + prod anon key + owner UUID). Any plain `npm run dev` sent local development activity (logins, reads, writes) to production with zero warning.
- `.env.example` had blank Supabase values and no local-first guidance; README's Environment section did not warn against production targeting; no startup guard existed anywhere.

## Change Made

1. **`next.config.ts` — dev-only fail-closed guard** (only change with runtime effect):
   - When `NODE_ENV !== "production"` (i.e. `next dev`) and `NEXT_PUBLIC_SUPABASE_URL` hostname ends with `.supabase.co` and `DISCORA_ALLOW_REMOTE_DEV !== "true"` → throw an actionable error naming only the hostname (never keys/tokens) and pointing at `.env.example`.
   - Production builds (`next build`) and `next start` run with `NODE_ENV=production` → guard skipped → legitimate production deployments unaffected.
   - Explicit escape hatch `DISCORA_ALLOW_REMOTE_DEV=true` preserves intentional remote (staging) development.
2. **`.env.example` — local-first rewrite**: local URL default, public local demo anon key with non-secret explanation, `DISCORA_ALLOW_REMOTE_DEV=false` documented; production/server sections preserved.
3. **`README.md` — Environment section**: local-first instruction + guard behavior documented (smallest doc delta).
4. **`.env.local` — repointed to local** (`http://127.0.0.1:54321` + local demo anon key), `DISCORA_OWNER_USER_ID` preserved unchanged. Previous content (prod URL + prod anon key, both non-secret by design) recorded in working notes; nothing secret was present or lost. File is gitignored — never committed, never pushed.

## After

- Plain `npm run dev` targets local Supabase by default.
- Production-shaped local configuration is rejected at startup with a clear error.
- No secrets introduced, printed, or committed (anon keys are browser-public by design; owner UUID preserved as-is).

---

# Local Startup Verification

- `npm run dev` equivalent with `.env.local` (local URL): server reaches Ready; `/about` 200 (dev log evidence). **PASS.**
- Browser login + homepage + inquiry-adjacent surfaces + profile + discussion room all served locally with zero production-destination requests (network log: 100% local hosts). **PASS.**

# Production-Targeting Guard Verification

- **Reject test:** `NEXT_PUBLIC_SUPABASE_URL=https://discora-verify-guard.supabase.co` (non-existent host — no connection possible or attempted) + `npm run dev` → immediate `Failed to load next.config.ts` with `Error: [discora] Local development is configured to use a hosted Supabase project (discora-verify-guard.supabase.co). Refusing to start...` thrown during config compilation, **before any route, render, or network request**. No secrets in output (hostname only). **PASS.**
- **Escape-hatch test:** same URL + `DISCORA_ALLOW_REMOTE_DEV=true` → config loads, server reaches `Ready in 9.2s` (no pages browsed, so zero requests to the fake host). Server stopped after. **PASS.**
- **Production-build safety:** `npm run build` (NODE_ENV=production) with local `.env.local` → exit 0, 29 routes (regression evidence below). Guard provably inert for real deployments. **PASS.**

---

# Regression Results

- **TypeScript:** `npx tsc --noEmit` → exit 0, 0 errors (covers edited `next.config.ts`).
- **Lint:** `npm run lint` → 0 errors, 44 warnings (identical pre-existing baseline; no new warnings from edited files).
- **Build:** `npm run build` → exit 0, 29 routes (also proves the guard does not break production builds).
- **Vitest:** 28 passed (`understanding-utils.spec.ts` — SoU boundary locked); 1 suite unimportable (`@playwright/test` absent — pre-existing environmental).
- **Live browser smoke (this phase):** login (A + B), own-profile timeline with Side Switch entry, cross-user profile without it, discussion room, 390 + 1440 snapshots — all rendering with 0 product console errors.

---

# Files Changed

1. `next.config.ts` — added dev-only production-targeting guard (only runtime-behavior change; production builds exempt).
2. `.env.example` — local-first defaults + remote-dev escape-hatch documentation (tracked).
3. `README.md` — Environment section: local-first instruction + guard note (tracked).
4. `.env.local` — repointed to local Supabase, owner ID preserved (gitignored; never committed).
5. `docs/PRE_BETA_FOCUSED_CLOSURE_REPORT.md` — this report (new).

No migrations. No app-feature code. No RLS/grant/policy changes. No SoU code.

---

# Security Assessment

- The guard **reduces** production-exposure risk (fail-closed default) and introduces no new attack surface (config-load-time string check; no network, no secrets, no new env consumption elsewhere).
- Escape hatch is explicit-opt-in and documented; it cannot leak secrets (none handled).
- Position History verification introduces no behavior change; the own-only RLS boundary on side-change reads is proven end-to-end.
- **No new security issue introduced by this task.**

# New Issues (discovered, NOT fixed per scope rules)

1. **`user_reputation_snapshots` unreadable by design clients (P2, functional, fail-closed).** Authenticated browser reads (`reputation-service.ts:288-332`, `getLatestReputationSnapshots` + `getReputationHistory`) return **403** — the table grants SELECT only to `postgres` (verified live). Same defect class as remediated F-03 but a different table, therefore out of the authorized scope. Impact: snapshot-based reputation displays degrade (soft-fail to empty in `getLatestReputationSnapshots`; throw in `getReputationHistory`); profile pages still render via client-side computed reputation. No escalation, no leak. **Recommended follow-up:** forward migration granting least-privilege SELECT (likely own-row RLS policy needed — none exists for that table) or migrating callers to an RPC; needs its own authorized task.

# Remaining Limitations

- P2-N8-style inactive-user probe for side-change reads not executed (destructive; RLS text verified instead).
- No scripted Playwright suite (`@playwright/test` absent); MCP-driven real-Chromium flows used.
- QA residue unchanged from prior phase (structurally undeletable without touching product triggers; all `qa-verify-*` labeled; this phase added zero new rows — inquiries/relation from last phase already removed).
- Production grants/behavior + operator stack items from prior reports remain with the Product Owner.

---

# Final Verdict

**PASS**

Position History UI verified through its live surface (own-history renders; foreign history denied at UI + network layers), SoU boundary intact, local development now fail-closed against accidental production targeting with the guard proven in both directions, regressions green, and the single new finding documented without scope expansion.

---

**REPORT:** `docs/PRE_BETA_FOCUSED_CLOSURE_REPORT.md`
**PRODUCTION:** NOT TOUCHED
**COMMITS:** NONE
**PUSHES:** NONE
**PRODUCTION MIGRATIONS:** NONE
**UNRELATED FEATURES:** NOT MODIFIED
