# Discora — Grant Reconciliation + Production Permission Drift Audit (Pre-Beta Gate)

**Mode:** READ-ONLY AUDIT. No migrations created/modified, no objects/grants/RLS/RPCs/
code/env changed, no production writes, no history manipulation, no commits/pushes.
Production SQL access does not exist in this environment — every production cell below
is explicitly marked NOT VERIFIED except ledger versions (read-only CLI list).

---

## 1. Executive summary

Local least-privilege posture is fundamentally sound: all 10 live-probed attack paths
as an ordinary authenticated user were denied with zero state change; friend graph
fully private; invitation M3 boundaries hold (UPDATE grant-denied, revoke owner-only,
hash storage, no plaintext column); admin boundary self-guards (RPC 42501→403,
`/admin` 404s); DEFINER views all embed room-access predicates; no PUBLIC table or
function grants in the audited surface. Four follow-ups required: (1) `claim_relations`
INSERT `WITH CHECK (true)` — any authenticated user can write relations into any
room incl. private/archived (P2, original design, now SoU-relevant); (2) `debates`
UPDATE policy tautology (`r.id = r.id`) diverged from its migration file — currently
inert (no UPDATE grant) but must be fixed forward (P2 + drift evidence); (3) missing
SELECT grants (migration-intent) for `inquiry_items`/`inquiry_responses`/
`debate_side_changes` — direct reads 403 locally, degrading SoU inquiry counts and
position history; production state unverifiable, same breakage likely there (P2
functional); (4) hygiene tail: 4 unpinned DEFINERs, PUBLIC-execute on self-guarding
RPCs, cross-user prefs read. **Verdict: B.**

## 2. Scope

§1 surfaces (28 tables), §2 RPCs (129 public functions enumerated), RLS on 30+
tables, PostgREST exposure, friend privacy, invitation M3, admin boundary, migration
reconciliation (130001/130002/140004/140005/140006 + 150001 + permission migrations),
browser/API probing (10 probes, local, non-destructive), threat review, philosophy
check. SoU logic untouched (§13 approved model intact).

## 3. Local grant matrix

Full matrix captured (28 tables × anon/authenticated/service_role; 129 functions).
Conformance summary: friend trio SELECT-only + counters DEFINER-only; invitation
tables SELECT-only + counters DEFINER-only; admin_audit_logs/reputation_events no
client grants; retired_handles service_role-only (no app writer — dormant); votes
claim-toggle writable / evidence-votes read-only (dormant per app grep);
claims/evidence/messages UPDATE+DELETE own-scoped (retract paths); profiles
own-write + public-read; user_saves own-CRUD; saves/moderation/feedback as designed.
Anomalies: §5 items 1–3 below; otherwise expected-vs-actual CONFORMS.

## 4. Production verification status

PRODUCTION INTENT VERIFIED ONLY. Read-only `migration list`: remote applied through
202609140003; local-only 140004/140005/140006/150001 correctly ordered. No production
SQL/API probing exists or was attempted. Every production-actual cell in §13 is
NOT VERIFIED / UNKNOWN by explicit policy, not by omission.

## 5. Table privilege audit

PASS: least-privilege SELECT-only where required; no PUBLIC grants; no unexpected
INSERT/UPDATE/DELETE except by design (own-row retract/vote/save/message/post paths,
all RLS-narrowed). EXCEPTIONS: (a) `claim_relations` INSERT `WITH CHECK (true)`
(P2 — §16 F-01); (b) `debate_side_changes` / `inquiry_items` / `inquiry_responses`
lack any authenticated SELECT grant although RLS policies + app reads expect them —
local 403s observed, migration-intent confirms absence (P2 — §16 F-03);
(c) `evidence_votes` lacks INSERT/DELETE (dormant capability, P3/INFO).

## 6. RPC/function privilege audit

129 functions: all mutating RPCs DEFINER + pinned + authenticated-gated with in-body
authorization (friend/invite/claim/inquiry/reaction/admin/deletion paths reviewed);
internal helpers service_role-only; postgres-only for reputation/system writers;
invoker pair (`create_*_room`) runs as caller under RLS (consistent, INFO).
EXCEPTIONS: 4 unpinned DEFINERs (`get_homepage_metrics`, `get_my_inquiry_responses`,
`get_my_open_inquiries`, `handle_new_user_preferences`) — not exploitable (callers
lack schema-CREATE) but must be pinned (P3); PUBLIC-execute on self-guarding RPCs
(`switch_debate_side`, `get_my_moderation_flags`, `get_my_*`, `get_user_preferences`)
— bodies verified safe, anon yields empty/raises (P3 hygiene; cross-user prefs read
documented as by-design-for-rendering with enumeration nuance).

## 7. RLS audit

Owner/member-scoped SELECT/INSERT/UPDATE/DELETE throughout; moderator gates on flags/
feedback; no cross-user friend exposure; no private-room leakage paths found; deleted-
user gating via `is_active_user()` on mutation policies. EXCEPTIONS: claim_relations
INSERT-true (§5a); debates UPDATE tautology (§8, inert via grants); relations-view
narrower than `has_room_access` (participants under-share — functional INFO, fail-
closed). No policy weakens privacy; none needs weakening for the app.

## 8. PostgREST exposure audit

Reachable = granted + (policy or DEFINER-body-gated). No accidental public tables/
functions; no service_role-only function exposed to clients; no admin function
callable by ordinary users (all raise); no debug/test/internal-helper exposure
(trigger fns carry default PUBLIC ACL but are trigger-bound, INFO). DEFINER views
(`discussion_*`, moderation_queue, aggregates) are wide-granted BUT every definition
embeds room-access or moderator predicates (verified per view) — sound by embedded
predicate, noted as the single-point-of-failure pattern to preserve.

## 9. Friend privacy audit

VERIFIED via live probes + policy review: relationships own-side-only,
requests sent-or-received-only, blocks blocker-only; crafted cross-user block filter
→ 200 []; no count/ranking/graph endpoints exist in code or PostgREST surface;
direct INSERT denied (403); lifecycle RPC-only. Blocked parties see neutral states
(9D.2B behavior, unchanged).

## 10. Room invitation permission audit

M3 holds live: UPDATE grant absent (probe 403), SELECT owner/bound-only, create/
accept/revoke RPCs owner/binding/active-gated with pinned search_path, throttles
DEFINER-internal, `record_invitation_failure` service_role-only, token_hash UNIQUE +
no plaintext column (schema-verified), owner list token-free (code + traffic).
No DML bypass exists. Revoke RPC refuses non-active/non-owner (R2-verified).

## 11. Admin permission audit

All 8 admin RPCs authenticated-gated with in-body `has_role_or_higher(admin)` checks
(pinned DEFINER); ordinary-user call → 42501→403 (probed); `/admin` → 404 for
non-admin (probed, no role disclosure); audit logs client-inaccessible.
`admin_inspect_private_room` (known-broken: selects nonexistent columns) FAILS CLOSED
— verified exposure: none (errors before data); left untouched per instructions,
forward-migration repair still pending (pre-existing).

## 12. Migration/history reconciliation

Permission migrations traced: 220001 (invite table/RLS), 230015 (invite grant
revocation), 230016, 060001 (relations open INSERT — intent, not drift), 100001
(debates policy — file CORRECT, live TAUTOLOGICAL → DRIFT evidence: dashboard edit
or lost change; forward fix required, never history edit), 050003 (base SELECT
restoration), 090011 (grant capture, deliberately partial), 140003 (hygiene),
140004–140006 + 150001 (local-only, ordered). No applied migration edited; no repair
run. 130001/130002 divergence unchanged from R2 (out of scope, unmodified).
Reconstruction rule honored: no recovered bytes labeled original.

## 13. Local-vs-production drift matrix

| Surface | Local actual | Production actual | Migration intent |
|---|---|---|---|
| Friend/invite/admin grants+RLS | VERIFIED conforming | NOT VERIFIED | CONFORMS (140004–150001 + base) |
| debates UPDATE policy | DRIFT (tautology, inert) | NOT VERIFIED | CORRECT file text |
| claim_relations open INSERT | VERIFIED (intent) | NOT VERIFIED | OPEN by design (060001) |
| inquiry/side-change SELECT grants | VERIFIED absent (403s) | NOT VERIFIED | ABSENT (no grant migration) |
| Unpinned DEFINERs / PUBLIC RPCs | VERIFIED (hygiene) | NOT VERIFIED | AS-IS in files |
| Ledger versions ≤140003 | VERIFIED equal | VERIFIED (CLI list) | — |
| 140004/5/6 + 150001 | local-only, ordered | NOT VERIFIED (not pushed) | forward, unapplied |

## 14. Browser/network findings

10 REST probes as ordinary user: 4 denials (403 friend-INSERT, rooms-UPDATE,
admin-RPC, invite-UPDATE), 400 on unauthorized invite-create, empty-200s on
cross-user blocks/relationships/mod-queue (RLS-filtered, no leak), working
own-reads, cross-user prefs flags (by design). Zero probe residue (titles/rows/
invites unchanged). `/admin` 404s. No secrets in traffic; anon key public by design.

## 15. Security threat model

Escalation: none viable (all paths denied live). IDOR: room/user/token tampering
rejected (prior matrices stand). Unauthorized UPDATE/DELETE: grant+RLS double
denied (probed). DEFINER abuse: bodies self-guard; unpinned trio noted (P3).
PUBLIC EXECUTE: self-guarding only. Friend graph: private (probed). Cross-room:
view predicates + RLS hold. Admin bypass: none found. Private-room leakage: none
found. Service-role exposure: none. Migration drift: debates policy (inert) + no
history manipulation. PostgREST: as §8.

## 16. P0/P1/P2/P3/INFO findings

P0: none. P1: none (no live-exploitable path). P2: F-01 claim_relations open INSERT
(integrity/SoU-pollution, any-room writes); F-02 debates UPDATE tautology (inert,
drift); F-03 missing inquiry/side-change SELECT grants (functional breakage,
prod-unknown). P3: unpinned DEFINERs; PUBLIC-execute hygiene; cross-user prefs read;
evidence_votes dormant; relations-view under-sharing. INFO: retired_handles dormant-
locked; invoker room-creation consistent; trigger-fn default ACLs; admin RPC fails
closed.

## 17. Exact remediation requirements, if any

Forward migration (NOT history edit), when authorized: (1) fix debates UPDATE policy
to `r.id = debates.id` (or drop it — no UPDATE grant exists); (2) least-privilege
SELECT grants for inquiry_items/inquiry_responses/debate_side_changes IF production
behavior check confirms the absence is unintended; (3) pin search_path on the 4
unpinned DEFINERs; (4) narrow claim_relations INSERT with room-write-access check;
(5) restrict get_my_* to authenticated. No app-code change strictly required.

## 18. Whether remediation requires a forward migration

YES — items 1–4 are catalog/privilege changes only expressible as a new sequential
migration. No RLS weakening involved.

## 19. Whether production backup/apply/verification is required

YES (standard gate) for the migration in §17 — plus, FIRST, a non-invasive production
behavior check (do inquiry/position-history sections render in prod?) to resolve the
§5c UNKNOWN without guessing. No production action taken or authorized here.

## 20. Final verdict

**B — MINOR DRIFT / FOLLOW-UP REQUIRED.** No live-exploitable escalation exists
(probed end-to-end with zero residue); the P2s are bounded, inert-or-functional
follow-ups plus one production behavior question. D is not warranted: production
inaccessibility does not prevent the local/migration security conclusion, and the
conclusion is documented as intent-level, not production-verified.
