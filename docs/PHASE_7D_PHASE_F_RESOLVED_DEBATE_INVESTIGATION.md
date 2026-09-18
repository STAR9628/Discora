# Phase 7D / Phase F — Resolved Debate Blocker Investigation (READ-ONLY)

**Date:** 2026-09-11
**Agent:** OpenCode (production investigation; read-only)
**Scope:** Identify the single `resolved` debate, classify it, and determine whether an approved handling exists. No product decision invented.

**NO PRODUCTION DATA WAS MODIFIED.**
**NO PRODUCTION MIGRATIONS WERE APPLIED.**
**The partial backup remains NOT VERIFIED as a complete recovery point.**

---

## 1. Current count

`debates` by status (production, read-only): **active 26, resolved 1.** Exactly one legacy row blocks `202606270001` §6.

## 2. Identified debate (metadata only — no content retrieved)

- **ID:** `4120c703-a7e7-4613-9bab-9175c4ae7638`
- **Room:** `ai vs human` (`slug: ai-vs-human`; room status `open`, visibility `public`) — the shared QA room used by all Phase F Playwright runs.
- **Row timestamps:** created = updated = `2026-06-10T08:11:06Z` (resolved at creation, untouched for ~3 months).
- No message/claim/evidence content, usernames, or vote data was retrieved. Resolution *values* were never fetched — only key presence/shape (below).

## 3. Legacy resolution data

- `debates.resolution` (jsonb) is **populated** with exactly three keys: `winner`, `summary`, `resolvedBy` — all non-empty strings (type/emptiness only; values not read).
- Mechanism (repo history): `resolve_debate` RPC (`202606100003:157`) set `status='resolved'` + wrote `resolution`; transition trigger (`202606100004:416-417,539`) emitted `DEBATE_WON/LOST` reputation events.
- `reputation_events` visible to the member session: 7× `DEBATE_JOINED`, zero `DEBATE_WON/LOST`. Absence globally is **not established** (RLS-filtered view for this identity); the `resolution` object itself is the primary evidence and is sufficient.

## 4. Classification — **A. Genuine legacy competitive resolution/outcome**

Populated `winner` + `summary` + `resolvedBy` on a never-updated row is not a stub, not stale metadata, and not an inconsistency: it is a real declared-winner record from the retired winner/loser system. (B/C/D rejected on this evidence.)

## 5. Migration behavior (`202606270001`, inspected verbatim, not modified)

1. Drops winner/loser trigger/function/RPC (`IF EXISTS`) — safe.
2. `DELETE FROM reputation_events WHERE event_type IN ('DEBATE_WON','DEBATE_LOST')` — the single intentional history deletion in the queue; member-visible events contain none, global absence unverified.
3. Recreates `discussion_debates` without `resolution` (bare DROP proven safe: only `resolve_debate`, dropped first, and non-blocking function dependents reference it).
4. `ALTER TABLE debates DROP COLUMN resolution` — safe after (3).
5. **Rewrites status CHECK to `('active','closed')` with validation — FAILS on the `resolved` row** (no `NOT VALID`, no row transformation anywhere in the file, no other migration handles legacy rows). The whole migration rolls back; the 8 Phase 7D migrations behind it never run.

## 6. Documentation / approved-decision result

**`NO APPROVED STATUS MAPPING FOUND.`** Searched governance, 6E spec/cleanup/removal reports, master context, roadmap, user flows, ADRs, and all migrations:

- Philosophy + 6E spec: winner/loser/draw/competitive resolution explicitly NOT ESTABLISHED and prohibited; debate lifecycle has no Resolved state.
- A prior unapproved `202606230001_retire_winner_resolution_model.sql` (`concluded_at`, conclusions table) was **deleted** as unapproved — evidence the owner has rejected replacement-resolution machinery before.
- No document maps an existing `resolved` row to anything. `resolved → closed` appears nowhere.

## 7. Product vs technical decision — **PRODUCT decision (with technical consequence)**

`resolved → closed` is not semantics-preserving, so it cannot be adopted as a technical convenience:

- Current frontend (`debate-service.ts:337`): `closed → inactive`, everything else (including `resolved`) → `open`. The debate is **live today** (all QA runs contribute/join).
- `closed` additionally hides the side picker (`debate-side-picker.tsx:24,33`) and renders closed-state header UI.
- Mapping to `closed` would visibly deactivate a live room; mapping to `active` would erase its concluded-ness while its declared-winner payload is dropped by the same migration. A philosophy that denies winners must decide what a declared win *means* going forward — that is product ownership, not engineering. Per governance §22/§34 and the task mandate: **STOP, escalate, do not invent the mapping.**

## 8. Final verdict

### B — PRODUCT DECISION REQUIRED

The migration failure mechanism (C) is real but secondary: `202606270001` is correct-but-incomplete, and the missing piece — the fate of a genuine declared-winner record — has no approved answer. No migration, data change, history repair, or shortcut is recommended or requested here.

## 9. Exact recommended next action (owner, in order)

1. **Decide** (product owner): disposition of debate `4120c703…` (`ai vs human`) — e.g. retire as `closed`, re-open as `active` with outcome preserved read-only elsewhere, archive the room, or another explicitly approved disposition. Record the decision; do not let the agent choose.
2. **Implement** the decision as a small forward data migration (new file, never an edit), e.g. conditional status update + optional outcome archival, after re-verifying the row is unchanged.
3. Re-run: privileged backup → `db push --dry-run` → `db push --linked` → the 30-check post-apply matrix.
4. Do not start Phase G until the matrix is green.
