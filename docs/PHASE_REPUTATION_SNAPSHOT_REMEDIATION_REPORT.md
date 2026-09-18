# Discora — Reputation Snapshot Remediation Report
## Least-privilege SELECT restoration (self-only)

**Mode:** TARGETED REMEDIATION (PATH A authorized by unambiguous contract — see `docs/PHASE_REPUTATION_SNAPSHOT_AUTHORIZATION_AUDIT.md`). Local only. No commits. No pushes. Production untouched.
**Date (UTC):** 2026-09-16

---

# What Changed and Why

Authenticated browser reads of `public.user_reputation_snapshots` failed with 403 despite an intact self-only RLS policy (`USING user_id = auth.uid()`, established at table creation and deliberately preserved through P0 hardening that removed only client INSERT). The `authenticated` role simply lacked the SELECT grant. Application callers (`getLatestReputationSnapshots`, `getReputationHistory`) soft-fail, so profile pages rendered via client-computed reputation with only console noise — P2 functional, fail-closed, no leak.

Contract sources (all agreeing on self-only): original migration comment + policy, deployment-readiness matrix (`Self-only`), hardening P0-4 (DB-authoritative writes, SELECT preserved), self-scoped callers with no cross-user consumer.

---

# Change Detail (sole change)

**Migration:** `supabase/migrations/202609180001_reputation_snapshot_authenticated_select.sql`
```sql
grant select on public.user_reputation_snapshots to authenticated;
```
- No RLS change. No new policy. No anon grant. No INSERT/UPDATE/DELETE. No app-code change.
- Applied: local only (`supabase migration up`). Ledger: remote through `202609140003`; `202609180001` local-only.

---

# Verification Summary

| Check | Result |
|---|---|
| Baseline 403 (pre-fix, User A) | Reproduced: 403 permission denied |
| P-R1 self read (post-fix, snapshot via approved self-RPC) | 200 + own rows |
| P-N1/N6 cross-user reads | 200 `[]`, zero rows leaked |
| P-N2 anon | 401 denied |
| P-N3/N4/N5 client DML | 403 denied |
| Browser profile (`/u/qaverifya` as B) | renders, no foreign data, 0 console errors (prior per-view 403 gone) |
| Network | snapshot request 200; all traffic local; no secrets/tokens in URLs |
| tsc / lint / build / vitest | 0 errors / 0 errors+44 pre-existing warnings / exit 0 / 28 passed |
| SoU boundary | untouched code + inputs unchanged; 28/28 unit tests |
| Deletion compatibility | purge paths unaffected (DEFINER owner bypass) |
| Philosophy | private derived cache only; no leaderboard/truth/SoU signal |

---

# Files Changed

1. `supabase/migrations/202609180001_reputation_snapshot_authenticated_select.sql` (new, local-only)
2. `docs/PHASE_REPUTATION_SNAPSHOT_AUTHORIZATION_AUDIT.md` (new)
3. `docs/PHASE_REPUTATION_SNAPSHOT_REMEDIATION_REPORT.md` (this file)

No application source files changed. No historical migrations edited.

---

# Remaining Follow-ups (not this task)

- Include this grant in the production reconciliation pass (prod grants UNKNOWN; dashboard drift possible).
- If `useAuthorsReputation` is ever wired to UI, re-audit visibility first (self-only RLS returns partial data for multi-user queries by design).
- QA residue from verification phases (structurally undeletable rows; all `qa-verify-*` labeled; snapshots created for User A are legitimate self-RPC rows).

---

**PRODUCTION:** NOT TOUCHED — **COMMITS:** NONE — **PUSHES:** NONE
