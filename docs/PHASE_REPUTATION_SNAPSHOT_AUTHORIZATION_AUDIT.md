# Discora — Reputation Snapshot Authorization Audit
## `public.user_reputation_snapshots` (P2 functional, fail-closed)

**Mode:** FOCUSED AUTHORIZATION AUDIT (Product Owner authorized). Local Supabase only. Read-only inspection first; one forward migration after the decision gate passed. No production contact beyond the pre-existing read-only ledger state. No commits. No pushes.
**Date (UTC):** 2026-09-16

---

# Executive Summary

Authenticated browser reads of `public.user_reputation_snapshots` returned 403 while application code (`getLatestReputationSnapshots`, `getReputationHistory`) queries the table directly. Root cause is a **missing grant, not a missing policy**: the self-only SELECT policy has existed since table creation and was deliberately preserved through security hardening, but the `authenticated` role was never granted SELECT.

The decision gate resolved to **PATH A — contract unambiguous**. Four independent sources establish self-only visibility (original migration comment + policy, deployment-readiness matrix, hardening migration that killed client INSERT while keeping SELECT, and self-scoped callers with soft-fail behavior). The least-privilege fix (`GRANT SELECT ... TO authenticated`, no RLS change, no anon, no DML) was implemented locally and verified live end-to-end, including through the real profile UI.

**Verdict: PASS.**

---

# Existing Implementation

- **Table** (`202606090002_create_user_reputation_snapshots.sql`): `id uuid PK`, `user_id uuid NOT NULL → auth.users(id) ON DELETE CASCADE`, `score numeric NOT NULL DEFAULT 0`, `expertise jsonb NOT NULL DEFAULT '[]'`, `created_at timestamptz DEFAULT now()`; index `(user_id, created_at DESC)`; RLS enabled; exactly one policy (SELECT, self-only); snapshots immutable by design (no UPDATE/DELETE policies; "Never destroys historical data; only inserts").
- **Writers:** `recalculate_user_reputation(p_user_id)` (SECURITY DEFINER, `SET search_path = public`, self-or-admin guard, writes one snapshot row per call); legacy triggers in `202606100004_create_reputation_events.sql:145` and `202609090007_epistemic_cleanup.sql:119` insert snapshots server-side. No client INSERT (policy dropped + revoked in hardening P0-4).
- **Readers (app):** `getLatestReputationSnapshots(userIds[])` (batch; soft-fails to empty Map on error) and `getReputationHistory(userId)` (throws mapped error on failure), both via browser client by default (`getClient` falls back to `createBrowserSupabaseClient`).
- **UI consumers:** `useReputation(userId)` (profile pages, any userId) wraps history fetch in try/catch → `{snapshots: [], trend: null}`; notably `profile-reputation-section.tsx` destructures only `{contributions, expertise, timelineItems}` — the fetched `history` is currently **not rendered**, so the 403 had zero visible breakage beyond console noise. `useAuthorsReputation` (batch hook) has **zero UI callers** in `src` (dead path; self-only RLS would return own-rows-only if ever resurrected — no leak vector).

---

# Table/Data Classification

| Column | Classification | Notes |
|---|---|---|
| `id` | internal identifier | UUID, needed for row identity only |
| `user_id` | user-private (owner-scoped) | FK to auth.users, CASCADE on delete |
| `score` | user-private (owner-scoped) | derived numeric cache, NOT truth/authority |
| `expertise` | user-private (owner-scoped) | derived topic breakdown jsonb |
| `created_at` | historical | snapshot ordering |

No moderation flags, trust internals, audit metadata, or security fields exist on this table. All columns are safe under an owner-only scope; none may cross users.

---

# Caller Analysis

| Caller | Purpose | Context | User ID | Expected visibility | Fields | Failure today |
|---|---|---|---|---|---|---|
| `getLatestReputationSnapshots` | batch latest scores | browser client (or override) | 1..n ids | own rows only (RLS) | id/user/score/expertise/created | console.error + empty Map |
| `getReputationHistory` | full history + trend | browser client (or override) | 1 id | own rows only (RLS) | all columns | throws mapped error → caught → empty history |
| `recalculate_user_reputation` | compute + persist snapshot | DEFINER RPC, self/admin | target id | self/admin only | writes score/expertise | unaffected (owner bypass) |
| deletion RPC | purge on account delete | service_role DEFINER | target id | privileged path | DELETE | unaffected |
| `useAuthorsReputation` | multi-author scores | dead (no UI callers) | n ids | own rows only | score | N/A |

---

# Product Contract Evidence

| Question | Existing evidence | Source | Confidence |
|---|---|---|---|
| Who may view snapshots? | "Only the user can see their own reputation history" (policy comment + USING user_id=auth.uid()) | `202606090002` lines 20-24 | HIGH (original intent) |
| Self-only confirmed anywhere else? | Matrix row: `user_reputation_snapshots \| 2 \| Self-only` (same style as `user_preferences Self-only`, `reputation_events Self-view`) | `docs/DEPLOYMENT_READINESS.md:174` | HIGH |
| Are snapshots DB-authoritative? | "Snapshots are database-authoritative (written by recalculate_user_reputation)"; legacy client INSERT dropped + revoked; SELECT policy deliberately preserved | `202606190001` lines 62-77 | HIGH |
| Who may recalculate? | Self or admin (`v_caller_id != v_user_id and not admin → unauthorized`) | `202606190001` lines 100-106 + AGENTS.md | HIGH |
| Is cross-user display intended? | No UI renders another user's snapshot score/history; batch hook has no callers; profile history result unused in render | `src` grep + render inspection | HIGH |
| On account deletion? | Purge row (`user_reputation_snapshots` FK CASCADE + explicit delete in deletion RPC) | deletion spec/report | HIGH |

No conflicting evidence found. No document suggests public, moderator-browse, or admin-browse SELECT on this table.

---

# Authorization Model

**Self-only direct SELECT** (grant + existing RLS USING `user_id = auth.uid()`):

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| USER A on A's rows | ALLOW | DENY (no grant/policy) | DENY | DENY |
| USER A on B's rows | DENY (0 rows) | DENY | DENY | DENY |
| ANONYMOUS | DENY (no grant) | DENY | DENY | DENY |
| ADMIN/MODERATOR (via client) | own rows only (no elevated read path; none established) | DENY | DENY | DENY |
| `recalculate_user_reputation` (DEFINER, self/admin) | n/a (owner bypass) | ALLOW (own/admin target) | n/a | n/a |
| Deletion RPC (service_role DEFINER) | n/a | n/a | n/a | ALLOW (purge) |

No new policy was needed; no anon access; no DML. Writes remain DB-authoritative.

---

# Security Analysis

- **Escalation:** none — grant is SELECT-only; RLS confines to own rows; no policy bypass (no DEFINER in read path; browser client).
- **IDOR:** `user_id=eq.<other>` returns 200 `[]` (verified live) — fail-closed filtering, no oracle beyond row-count-zero (inherent to filtered reads; no existence signal since own-empty and foreign-empty are indistinguishable).
- **Anon:** 401 (no grant). **DML:** 403 across INSERT/UPDATE/DELETE (no grants, no policies).
- **Internal fields:** none exist; all returned columns are owner-scoped derived data.
- **SoU:** snapshots are never an input to `deriveStateOfUnderstanding` (params: claims/evidence/questions/relations/inquiryCounts/arguments only) — verified by inspection + 28/28 unit tests.

---

# Decision Gate

**PATH A — CONTRACT UNAMBIGUOUS.** Proceeded to least-privilege remediation (grant only). Rationale: four independent contract sources agree on self-only; the hardening migration proves deliberate preservation of the SELECT policy; no cross-user consumer exists to contradict it.

---

# Implementation

- **Migration (ONE, forward-only):** `supabase/migrations/202609180001_reputation_snapshot_authenticated_select.sql` — single statement `GRANT SELECT ON public.user_reputation_snapshots TO authenticated;` with contract documentation in the file header. No RLS/policy change, no anon, no DML, no app-code change.
- **Applied:** local only via `supabase migration up`. Ledger post-change: remote still through `202609140003`; `202609180001` local-only. Production untouched.

---

# Positive Tests

| ID | Action | Expected | Actual | Result |
|---|---|---|---|---|
| P-R1 | A: `GET user_reputation_snapshots?user_id=eq.<A>` (snapshot created first via approved self-RPC `recalculate_user_reputation` → 200, score 40) | 200 + own rows | 200 + 2 own rows (id/user/score/created_at) | PASS |

# Negative Tests

| ID | Action | Expected | Actual | Result |
|---|---|---|---|---|
| P-N1 | B: same query filtered to A | DENIED/zero rows | 200 `[]` | PASS |
| P-N2 | anon: `GET ...?limit=1` | DENIED | 401 permission denied | PASS |
| P-N3 | A: INSERT {user, score 999} | DENIED | 403 | PASS |
| P-N4 | A: UPDATE own rows score=999 | DENIED | 403 | PASS |
| P-N5 | A: DELETE own rows | DENIED | 403 | PASS |
| P-N6 | B: unfiltered SELECT | DENIED/zero rows | 200 `[]` | PASS |
| P-N7 | Direct-table bypass | enforced | grants+RLS enforce per above | PASS |
| P-N8 | Internal-only fields | none exist | schema has only id/user/score/expertise/created_at | PASS (not applicable beyond) |

# Baseline 403

Reproduced pre-fix as User A: `403 permission denied for table user_reputation_snapshots` (recorded verbatim minus key material). Post-fix the identical request returns 200.

---

# Network Verification

Browser network log (authenticated profile view): `user_reputation_snapshots?user_id=eq.<A>&order=created_at.desc => 200 OK` (previously 403). All Supabase traffic to local host only; anon-key header only; no tokens in URLs; no SQL/stack in bodies.

---

# Browser Verification

- `/u/qaverifya` (as B): renders fully, timeline correct (no foreign side-switch), **0 console errors** — the recurring snapshot 403 that appeared on every profile view in the prior phase is gone.
- Desktop 1440 + mobile 390 snapshots from the closure phase remain representative (no UI code changed in this task).

---

# Regression Results

- TypeScript: exit 0, 0 errors. Lint: 0 errors, 44 warnings (pre-existing baseline). Build: exit 0, 29 routes. Vitest: 28 passed (`understanding-utils.spec.ts`); 1 suite unimportable (`@playwright/test` absent — pre-existing environmental).
- No app code changed, so no functional regression surface beyond the newly permitted own-row reads (verified).

---

# Account Deletion Compatibility

PASS — unchanged: snapshots purge on deletion (FK CASCADE + explicit RPC delete); service_role DEFINER path unaffected by the client grant; no new retention; no identity leakage (rows die with the user).

---

# Privacy Compatibility

PASS — self-only reads cannot expose friends, private profiles, blocks, or other users' history (verified P-N1/P-N6 return zero rows). Cross-user profile views show only each table's own-policy data.

---

# Discora Philosophy Check

PASS — snapshots remain a private derived cache: no leaderboard, no public score display, no truth/credibility signal, no SoU input, no debate/evidence signal, no social status mechanic. The fix restores the owner's own visibility only, exactly as originally designed.

---

# Remaining Risks

- Production grants for this table are UNKNOWN (same dashboard-drift caveat as F-03); include this grant in the production reconciliation pass.
- The dead `useAuthorsReputation` batch path would silently return partial (own-only) data if ever wired to multi-user UI — no current caller; noted so a future resurrection re-audits visibility first.
- `getReputationHistory` still throws for foreign userIds by RLS design (caught → empty history in UI) — intended, not a defect.

---

# Final Verdict

**PASS** — unambiguous self-only contract, least-privilege grant-only fix, full live matrix green, no new exposure, philosophy intact.

---

**REPORT:** `docs/PHASE_REPUTATION_SNAPSHOT_AUTHORIZATION_AUDIT.md`
**PRODUCTION:** NOT TOUCHED — **PRODUCTION DATA:** NOT TOUCHED — **PRODUCTION MIGRATIONS:** NONE
**COMMITS:** NONE — **PUSHES:** NONE
**LOCAL MIGRATION (not applied to production):** `supabase/migrations/202609180001_reputation_snapshot_authenticated_select.sql`
