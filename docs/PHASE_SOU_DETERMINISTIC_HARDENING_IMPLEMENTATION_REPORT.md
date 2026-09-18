# Discora — Deterministic SoU Hardening, Phase 1 Implementation Report

**Mode:** AUDIT → DESIGN → IMPLEMENT → TEST → BROWSER QA → REPORT. No AI added
(no SDK, routes, workers, tables, prompts, embeddings, dependencies). No migrations
created or edited. No production contact. No commits/pushes.

---

## 1. Current-state summary

SoU existed as a deterministic client-side classifier (`deriveStateOfUnderstanding` +
`StateOfUnderstanding` UI + debate per-side reuse): per-claim Supported/Contested/
Unresolved from evidence directions, room counts, careful anti-truth copy — but with
`claimRelations` fetched yet never consumed, no room-level state, and phantom
`epistemic_status` reads against a column that does not exist anywhere in the schema.

## 2. Exact files changed

- `src/features/discussions/components/understanding-utils.ts` — relation index +
  evidenced-challenge elevation + connection context + `roomState` (presence lattice).
- `src/features/discussions/components/sou-shared.tsx` — NEW (`RoomStateBanner`,
  `ClaimRelationChips`, shared by discussion + debate lenses).
- `src/features/discussions/components/state-of-understanding.tsx` — banner + chips
  in all three pillar cards.
- `src/features/debates/components/argument-evidence-overview.tsx` — relations
  wiring (side-filtered + whole-room), whole-room banner, card chips.
- `src/features/admin/components/admin-private-room-modal.tsx` — removed dead
  `Status: {c.epistemic_status}` line. `src/features/admin/types.ts` — removed phantom
  field.
- `src/features/discussions/components/understanding-utils.spec.ts` — NEW (28 tests).
- `package.json` (+ lockfile) — vitest devDependency + `test` script.

## 3. Exact deterministic logic changed

Base classification untouched (contradict>0 → contested; else support>0 →
supported; else unresolved; votes never decisive; retracted/deleted excluded).
Added, after base tallies, single-pass relation processing over active endpoints
only (deduped edges; cycles cannot recurse — no transitive closure):
- `supports` / `refines`: connection context only, zero state effect.
- `contradicts` from a challenger carrying ≥1 supporting citation against a target
  with support>0 and contradict==0: target elevates to contested with reason naming
  the challenger. Unevidenced challengers never elevate (no assertion wars).
Rationale (documented in code): an evidenced structured challenge is precisely the
"divided stance" the Contested pillar describes; bare assertions are not evidence.
Room state (presence lattice, no numbers, no largest-bucket): any contested →
contested; else any unresolved claim/question → unresolved; else any supported →
supported; else unresolved (+framing when no data; guard against empty-supported).

## 4. Claim relation treatment

supports/contradicts/refines (the only approved types; none invented) as above.
Every elevation names the challenger in `statusReason` and `challengedByClaimIds`;
cards show directional connection chips with hover detail. Explainability preserved:
any developer can trace bucket → citations/edges.

## 5. Position/side treatment

AUDITED, NOT FED INTO THE CLASSIFIER — existing docs authorize no epistemic effect
for positions/side changes, so none was invented (per scope B). Verified: side data
only scopes debate pillars (display partitioning, unchanged); position changes carry
no negative signal anywhere (classifier never reads them; change of mind remains
safe). Side distributions are not displayed (no headcount surfaces). Data stays
available for future product review.

## 6. Room-level SoU treatment

Implemented as the presence lattice (§3) with contributing entity IDs in
`roomState`. Displayed ONLY for whole-room scopes (discussion overview + debate
whole-room banner); per-side derives compute it but never render it as room state.
Banner copy names the open pillar ("2 claims face open disputes"), never truth.
Ratification note: the lattice is the minimal rule derivable from approved bucket
semantics (no thresholds, no redefinition); Product Owner may replace it, but nothing
in approved docs contradicts it.

## 7. Phantom epistemic_status cleanup

Removed both TS reads (modal line, type field) — zero behavior change (they rendered
`undefined`). FINDING (pre-existing, out of scope): `admin_inspect_private_room`
(130001, applied, uneditable) selects `epistemic_status` from `claims` AND
`claim_id/title/url` from `evidence` — none of these columns exist, so the RPC raises
at runtime and admin private-room inspection is broken. Requires a follow-up forward
migration + UI repair; explicitly NOT done here (would exceed scope; needs its own
review since it touches admin security surface).

## 8. Security/RLS impact

None. No schema/RLS/RPC/grant changes. No new data fetching (relations were already
queried; debate lens adds the same existing endpoint). No secrets/keys. No service-
role use. No new unrestricted endpoints. Votes/headcount/reputation remain
non-epistemic (test-enforced).

## 9. Tests performed

`npm test` (vitest, NEW): **28/28 PASS** covering all 18 required areas — existing
Supported/Contested/Unresolved, retracted/deleted exclusion, support/contradict
evidence, supports/contradicts/refines edges, evidenced-elevation (+unevidenced
non-elevation + retracted-endpoint ignore), chains, cycles (both-evidenced mutual
challenge → both contested, terminating), debate-side independence, position
neutrality, vote immunity (500:1 stays unresolved), headcount immunity (25
unevidenced + presence-lattice room state), empty/framing, low-data, room lattice
(4 branches + largest-bucket rejection test), output-shape stability (aliases).

## 10. Browser QA performed

Seeded local fixture room (5 claims / 4 evidence / 5 links / 3 relations / 1 question;
local only; retained — evidence immutability trigger forbids hard-delete cleanup by
design). Desktop 1440 + mobile 390: banner "Room understanding: Contested — 2 claims
face open disputes" with status role; pillars 2/2/2; relation chips with directional
tooltips; "Structurally challenged" + challenger-naming reason on elevated claim;
tab switching; claim→claims-lens deep link with highlight; no horizontal overflow;
wording scan clean (sole "truth" hit is the banner's own "Not a truth verdict"
disclaimer). Debate lens renders with new relations hook, no crash. Console: only
pre-existing local `inquiry_items` 403 grant-gap errors (graceful degradation, counts
absent). Network: no new endpoints; relations via existing query.

## 11. TypeScript / lint / build

tsc 0 errors. ESLint 0 errors on touched files (one self-introduced unused-var warning
fixed during work; repo total back at 44 pre-existing warnings). Production build
exit 0.

## 12. Remaining limitations

- Room lattice choice (presence over alternatives) is documented rationale, not prior
  approval — ratify or replace (§6).
- `supports`-edge semantics beyond display (e.g., transitive corroboration) deliberately
  unexplored — needs product architecture first.
- Admin inspection RPC broken (pre-existing, §7) — separate fix required.
- Seeded fixture room remains in local sandbox (cannot hard-delete evidence by design).

## 13. Product decisions still required

1. Ratify/replace the presence-lattice room rule. 2. Whether `supports` edges should
   ever affect state (recommendation: no, without new architecture). 3. Admin RPC
   repair scope. Nothing else: no thresholds, no AI, no redefinition needed.

## 14. Explicit confirmation

NO AI was introduced: no SDK, routes, workers, tables, prompts, embeddings, vector
DB, dependencies, or AI-generated text. No votes/popularity/reputation/headcount
mechanics. No migrations. Production untouched.

## Verdict: A — COMPLETE / READY
