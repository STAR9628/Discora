# Discora — Pre-Beta Live Browser + Behavioral Verification Report
## P1-01 / P2-01 Remediation Sign-Off (`202609170001`)

**Mode:** VERIFICATION ONLY. No code, migration, config, or product-behavior changes. No production contact beyond the pre-existing read-only ledger state (remote still through `202609140003`). No commits. No pushes. No fixes applied during testing.
**Date (UTC):** 2026-09-16
**Remediation under test:** `supabase/migrations/202609170001_pre_beta_security_remediation.sql` (local-only, applied)

---

# Executive Summary

The P1-01/P2-01 remediation is **proven through the live local application and authenticated API boundary**, not just catalog inspection:

- **P1-01 positive:** authenticated reads of `inquiry_items`, `inquiry_responses`, `debate_side_changes` return 200 + correct rows via direct PostgREST **and** render end-to-end in the real app (login → homepage inquiry cards → inquiry detail with content, author, targeted claim, responses, composer). Previously these were 403.
- **P1-01 negative:** cross-user private-room reads return zero rows (200 `[]`, RLS-filtered); foreign side-history returns `[]`; anon reads denied (401 permission denied). No unauthorized row returned anywhere.
- **P2-01 positive:** legitimate same-room relation creation returns 201 with authorship bound to the caller.
- **P2-01 negative:** all 7 safe boundaries reject (private-room 403, archived-room 403, cross-room 400 via pre-existing same-room trigger, reverse cross-room 400, self-relation 403, NULL room 400). Inactive-user probe NOT TESTED (destructive, non-rollbackable — policy conjunct verified in live policy text instead).
- **SoU integrity:** exactly one (legitimate) relation reached the database during testing (count-verified), then removed. No unauthorized relation persisted.
- **P2-02 / P3-01 / P3-02:** re-verified live (tautology absent with no UPDATE grant; RLS enabled with lock row 20 intact; all four functions pinned).
- **Browser:** login, inquiry detail, friends, settings, discussion room render with **0 console errors** (one transient dev-navigation artifact cleared on reload); network shows no tokens/secrets in URLs and no SQL/stack exposure; desktop 1440 and mobile 390 layouts verified via snapshots.

**Verdict: PASS WITH LIMITATIONS** (limitations: dedicated side-history UI surface not visited; P2-N8 inactive-user probe not executed; repo Playwright suite absent so no scripted-suite run).

---

# Environment

- **Repo:** `D:\Projects\Discora`, branch `main`. No files modified in this phase (verification-only).
- **Local Supabase:** running (`supabase status` — API `127.0.0.1:54321`, DB `54322`, Inbucket `54324`). Google OAuth env unset (expected local).
- **CRITICAL ENV FINDING:** `.env.local` targets **production** (`NEXT_PUBLIC_SUPABASE_URL=https://papmghohpkjaovvmeskd.supabase.co`). The dev server was therefore started with inline local overrides on port 3002 (`NEXT_PUBLIC_SUPABASE_URL` → local, anon key → local), which take precedence over `.env.local` without touching any file (precedent: 9D.3 audit's isolated `:3001` instance). **If the environment had pointed at production, the phase would have stopped.**
- **Final working URL:** `http://192.168.1.5:54321` (host LAN IP — the only URL reachable from BOTH the host Node SSR process and the containerized browser; see Failures section for the two URLs that each served only one side).
- **Migration ledger:** `202609170001` present locally, absent remotely (remote still through `202609140003`; historical local-only `140004/5/6/150001` unchanged). No history edits. No new migration created in this phase.

---

# Playwright Setup

- `package.json` contains **no** `@playwright/test` dependency (neither dependencies nor devDependencies); `playwright.config.ts` and `tests/phase5c-onboarding-qa.spec.ts` reference it (hence vitest reports 1 unimportable suite — pre-existing environmental).
- Decision: **did not `npm install`** (would modify `package.json`/`package-lock.json` + download browser binaries, exceeding verification scope). Instead drove **real Chromium flows via the available Playwright-backed MCP browser tools**: navigate, snapshot, fill, click, console messages, network requests, resize — against the live local app. No scripted-suite run exists to report; nothing fabricated.

---

# Test Identities

Local-only synthetic accounts (created via local GoTrue Admin API, `email_confirm=true`; passwords synthetic, undisclosed, **not recorded in this report**):

- **USER A** — `qa-verify-a@example.invalid` — id `b5072a7d-41ee-44c9-88e3-9835d4b8889c` — profile `qaverifya` / `QA Verify A`
- **USER B** — `qa-verify-b@example.invalid` — id `17b06c09-2135-46e4-8478-c69054f55cfe` — profile `qaverifyb` / `QA Verify B`
- Fixtures (all `qa-verify-*` labeled): public discussion Room A (owner A), private debate Room B (owner B), archived discussion Room C (owner A); claims A1/A2 (room A), B1/B2 (room B), C1/C2 (room C); inquiry + response + side-change rows as needed per test (exact IDs in test rows below).

---

# P1-01 Positive Tests

| ID | Setup | Action | Expected | Actual | Result |
|---|---|---|---|---|---|
| P1-A | Login as A (browser) | Open `/inquiries/d1111111-…` (room-A inquiry) | Page loads, content renders, no 403 | 200; title `Inquiry: QA verification inquiry asking for clarification d…`; body shows content, Clarification type, Open status, author qaverifyb, targeted claim + type, `Responses (1)` with response text, composer; 0 console errors | PASS |
| P1-A2 | JWT A (API) | `GET inquiry_items?id=eq.<I1>` | 200 + row | 200 + full row (content, status open) | PASS |
| P1-B | JWT A (API) | `GET inquiry_items?room_id=eq.<roomA>&select=target_claim_id` (SoU counts path) | 200 + rows | 200 + `[{target_claim_id: A1}]` | PASS |
| P1-C | JWT A (API) + browser network | `GET inquiry_responses?inquiry_item_id=eq.<I1>` | 200 + response | 200 + response row; app network log also shows `inquiry_responses?... => 200` | PASS |
| P1-D | JWT A (API) | `GET debate_side_changes?room_id=eq.<roomA>&user_id=eq.<A>` | 200 + row | 200 + `{new_side: proposition}` | PASS |
| P1-E | Login as A (browser) | Open `/` homepage | Inquiry context/count cards render | `Your Inquiries & Understanding → Inquiries on Your Claims`: Structured Challenge card with inquiry text, parent claim, `Raised by qaverifyb`, `1 response`, `open`, link to inquiry detail | PASS |

(Pre-remediation baseline for all of the above: 403 / missing-data. The homepage cards and detail page previously could not render.)

---

# P1-01 Negative Authorization Tests

| ID | Setup | Action | Expected | Actual | Result |
|---|---|---|---|---|---|
| P1-N1 | A (JWT) | `GET inquiry_items?room_id=eq.<roomB-private>` | DENIED / zero rows | 200 `[]` — RLS-filtered, B's private inquiry (d222…) absent | PASS |
| P1-N2 | A (JWT) | Same as N1 (room with no access) | DENIED / zero rows | 200 `[]` (same probe; no room-B rows of any kind) | PASS |
| P1-N3 | A (JWT) | `GET debate_side_changes?user_id=eq.<B>` | DENIED | 200 `[]` (own-history policy `auth.uid()=user_id` holds) | PASS |
| P1-N4 | anon (API) | `GET inquiry_items?select=id&limit=1` | DENIED | 401 `permission denied for table inquiry_items` (no anon grant; hint text names only the already-known table) | PASS |

No unauthorized row was returned in any probe. No destructive operations performed.

---

# P2-01 Positive Tests

| ID | Setup | Action | Expected | Actual | Result |
|---|---|---|---|---|---|
| P2-A | A has write access to public Room A | `POST claim_relations {roomA, A1→A2, supports}` as A | 201, authorship = caller | 201 + row with `created_by = <A>` | PASS |

---

# P2-01 Negative Authorization Tests

All as User A via PostgREST (status + server message recorded; nothing created):

| ID | Boundary | Actual | Result |
|---|---|---|---|
| P2-N1 | No write access (private Room B, B1→B2) | 403 `new row violates row-level security policy for table "claim_relations"` | PASS (REJECTED) |
| P2-N2 | Private room without access (same as N1 — Room B owned by B) | 403 (same probe; only private room available) | PASS (REJECTED) |
| P2-N3 | Archived room (Room C, C1→C2, owner A) | 403 RLS (`has_room_write_access` excludes `archived`) | PASS (REJECTED) |
| P2-N4 | Cross-room (source A1/RoomA, target B1/RoomB, room A) | 400 `target_claim_id must belong to the same room.` (pre-existing `validate_claim_relation_room` trigger — defense in depth with the policy) | PASS (REJECTED) |
| P2-N5 | Reverse cross-room (room B, B1→A1) | 400 same trigger | PASS (REJECTED) |
| P2-N6 | Self relation (A1→A1) | 403 RLS (policy distinctness conjunct; CHECK constraint backstop) | PASS (REJECTED) |
| P2-N7 | NULL room_id | 400 (endpoint-membership trigger fires; policy `room_id IS NOT NULL` also guards) | PASS (REJECTED) |
| P2-N8 | Inactive/deleted user | NOT TESTED — reproducing requires deleting/deactivating a test identity (destructive, non-rollbackable: immutability triggers block the cleanup path). Compensating evidence: live policy text contains `is_active_user()` as first conjunct (VERIFIED). | NOT TESTED (documented) |

Error bodies contain only `new row violates row-level security policy for table "claim_relations"` or the pre-existing same-room trigger message — no SQL, no stack, no internal columns beyond the caller-known table.

---

# P2-01 SoU Integrity Verification

- During the full matrix, exactly **one** relation row reached the database (the legitimate P2-A insert — count-verified: `qa_relations = 1`), then removed (`DELETE 1`, post-verification count `0`). No unauthorized relation persisted.
- SoU implementation untouched (`understanding-utils.ts` unmodified; vitest 28/28 below). An unauthorized user cannot inject an evidenced contradiction into a no-write room: both the policy (`has_room_write_access` + same-room endpoint EXISTS) and the pre-existing same-room trigger reject it (N1/N4/N5 evidence).
- Result: PASS.

---

# P2-02 Verification

- Live `pg_policies` qual (re-queried in remediation; unchanged since — no migration touched it after): `(EXISTS (SELECT 1 FROM rooms r WHERE ((r.id = debates.id) AND (r.created_by = auth.uid()))))` — tautology absent. PASS.
- `table_privileges` for `debates`: anon/authenticated hold SELECT only; no INSERT/UPDATE/DELETE — policy remains inert; no UPDATE granted to make it meaningful. PASS.
- No cross-debate update path introduced (predicate strictly narrows to the debate's own room + owner). PASS.

---

# P3-01 Verification

- `pg_tables.rowsecurity = true` for `claim_deletion_config` (live). PASS.
- No client DML grants added (explicit `REVOKE ALL ... FROM public, anon, authenticated` in migration; no permissive policies). PASS.
- `SELECT lock_duration_minutes` → `20` (live). 20-minute deletion behavior unaltered (no app reads this table directly; sole consumers are postgres-owned SECURITY DEFINER triggers which bypass RLS). PASS.

---

# P3-02 Verification

- Live `proconfig` for all four (`get_homepage_metrics`, `get_my_inquiry_responses`, `get_my_open_inquiries`, `handle_new_user_preferences`): `search_path=public, pg_temp`. PASS.
- `prosecdef` still true (DEFINER), owner still `postgres`, grants untouched, bodies untouched (config-only ALTER). Homepage `Your Inquiries & Understanding` cards rendered live (exercises `get_my_*` path successfully). PASS.

---

# Network Security Verification

Browser network log (authenticated session, inquiry detail + friends + settings + room pages):

- Inquiry/response/friend/profile reads: all `200 OK`; tokens appear ONLY in `Authorization` headers (never URLs); resource UUIDs in query strings are ordinary identifiers, not credentials. PASS.
- No `service_role` key, server secret, DB password, SMTP key, or Gemini key observed in any request/response/URL. Only the public anon key (by design). PASS.
- No SQL/stack-trace payloads: failures observed were generic (`permission denied`/`RLS violation` short texts at API level; neutral UI toasts). The anon-probe hint (`GRANT SELECT ... TO anon`) names only the already-known table — standard PostgREST text, accepted residual. PASS.
- Invitation-token transport not exercised in this phase (no invite flows run); M3 fragment architecture unchanged since prior verification. NOT RE-TESTED (stated, not claimed).

---

# Browser Console Findings

| Surface | Errors | Notes |
|---|---|---|
| Login → `/` landing | 0 | Authenticated nav (`@qaverifya`, Logout, Friends/Saved) |
| Inquiry detail | 0 | Full render incl. responses + composer |
| `/friends` | 0 on clean reload | One transient `Invalid or unexpected token` during rapid cross-page navigation (aborted RSC prefetch `ERR_ABORTED` in network log); cleared on reload; dev-mode navigation artifact, not product defect |
| `/settings` | 0 | Profile data + Danger Zone render |
| Discussion room (1440) | 0 | Full lens nav + composer |
| Earlier `/inquiries/...` 404 | 3 errors, all `network error` from SSR fetch | ENVIRONMENTAL (host could not resolve `host.docker.internal`; see Failures). Resolved via LAN-IP URL; page then rendered 200 with 0 errors |

No new product errors introduced by the remediation (SQL-only change; no app code touched).

---

# Desktop Verification

- **1440×900:** discussion room renders sidebar nav, room lenses (Conversation/Claims/Evidence/Sources/Questions/State of Understanding), room header with Save/Share, guide card, composer; inquiry detail full width with responses. Snapshot-verified, no overflow/clipping markers. PASS.

# Mobile Verification

- **390×844:** mobile bottom nav appears, sidebar collapses, inquiry detail stacks (back link, type/status chips, claim context, responses, composer all present with labels); friends/settings adapt similarly. Snapshot-verified. PASS (snapshot-level; no programmatic horizontal-scroll measurement available in this harness — stated).

---

# Regression Test Results

- **TypeScript:** `npx tsc --noEmit` → exit 0, 0 errors.
- **Lint:** `npm run lint` → 0 errors, 44 warnings (pre-existing baseline count, unchanged).
- **Build:** `npm run build` → exit 0, 29 routes.
- **Vitest:** `npx vitest run` → 28 passed (`understanding-utils.spec.ts`); 1 suite unimportable (`tests/phase5c-onboarding-qa.spec.ts` needs absent `@playwright/test` — pre-existing environmental).
- **`tests/friend_regression.sql`:** NOT EXECUTED as regression proof — the file uses psql meta-commands, references non-existent fixture UUIDs, and would create helper functions in the DB; it documents scenarios, it is not an executable suite. Historical PASS=41/FAIL=0 stands as history only. (Friends page smoke-tested live instead: all regions render, 0 errors.)
- **Invitation/deletion/SoU suites:** not re-run (out of scope for this verification; SoU covered by vitest 28/28).

---

# Historical vs Newly Executed Evidence

- **Newly executed (this phase):** env/locality proofs; 2 local test users + fixtures; P1-01 positive ×4 API + homepage/inquiry-detail UI; P1-01 negative ×4 API; P2-01 positive ×1 + negatives ×7; SoU DB count checks; P2-02/P3-01/P3-02 live catalog re-verification; browser login/session; inquiry detail/friends/settings/room renders + console/network/resize checks; tsc/lint/build/vitest; cleanup with residue inventory.
- **Historical (cited, not re-run):** 35-scenario deletion browser QA; 22-flow invitation QA + T/U/C/R matrices; 41-friend regression; concurrency suites; production behavior observations.

---

# Failures / Limitations

1. **Initial inquiry-detail 404 (environmental, resolved):** dev server first started with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (correct for host SSR) — but the containerized browser resolves its own loopback, so client calls failed; then restarted with `http://host.docker.internal:54321` (correct for container) — but the host Node process cannot resolve that name (stale Docker Desktop hosts entry → `172.21.209.139`, dead), so SSR fetches failed with network errors. Resolved by serving via host LAN IP `http://192.168.1.5:54321` (Kong listens on all interfaces — verified), reachable from both sides. No product behavior implicated; no files changed (inline env only).
2. **`.env.local` targets production.** Any developer running `npm run dev` plainly will point the app at the production Supabase project. Flagged as an operational hazard (passwords/sessions could hit prod). Recommend local-first `.env.local` documentation or a startup guard — NOT implemented here (out of scope).
3. **P2-N8 (inactive user) NOT TESTED** — destructive, non-rollbackable; policy conjunct verified in text.
4. **Dedicated side-history UI surface NOT VISITED** — data layer (the remediated grant + RLS policy) verified live; no dedicated position-history screen was navigated. Homepage inquiry surfaces + inquiry detail cover the inquiry half of P1-01 in UI.
5. **No scripted Playwright suite run** (`@playwright/test` absent by repo state); MCP-driven real-Chromium flows used instead.
6. **Cleanup residue (local sandbox only, all `qa-verify-*` labeled):** 3 rooms, 7 claims, 2 side-change rows, 2 profiles, 2 auth users (`qa-verify-a/b@example.invalid`). Full removal is structurally impossible without touching product triggers: room DELETE is guarded (`not_author`), claim deletes are time-locked/immutable, side-change DELETE is immutable, and user-delete cascades abort transactionally (attempted for User B → `P0001` rollback, state unchanged — itself a nice immutability proof). Test relation + both test inquiries + response were fully removed (verified counts 0). Precedent: 9D.3 report likewise documents sandbox residue.

---

# Remaining Beta Blockers

1. P2-N8 + side-history-UI + scripted-suite gaps above (verification debt, not product defects).
2. Production behavior check for the restored grants with legitimate prod access (dashboard-grant deltas still unknown).
3. Operator stack unchanged: production domain/DNS, deployed frontend, SMTP/Resend, Google OAuth URIs, migration apply with backup, sweep/purge scheduling, counsel review.

---

# Final Verification Verdict

**PASS WITH LIMITATIONS**

The remediated security behavior is proven through the live local application AND the authenticated API boundary: authorized inquiry/side-change reads work (P1-01), unauthorized reads return zero rows (RLS intact), legitimate relation creation works (P2-01), and all safe unauthorized-relation shapes are rejected at the database with no persistence. P2-02/P3-01/P3-02 hold live. Limitations are environmental/scope items listed above — none is a product failure.

---

**REPORT:** `docs/PRE_BETA_BROWSER_BEHAVIORAL_VERIFICATION_REPORT.md`
**MIGRATION (existing, local-only):** `202609170001_pre_beta_security_remediation.sql`
**PRODUCTION:** NOT TOUCHED
**COMMITS:** NONE
**PUSHES:** NONE
**MIGRATIONS CREATED IN THIS PHASE:** NONE
