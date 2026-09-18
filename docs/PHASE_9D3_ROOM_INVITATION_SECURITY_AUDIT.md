# Discora — Phase 9D.3 Room Invitation Security Audit + Remediation Design

**Mode:** AUDIT + DESIGN ONLY. No code, migration, UI, auth, RLS, or data changes made.
Production untouched (only read-only `supabase migration list`). No commits/pushes.
**No secret tokens are recorded in this report** (tokens referenced as `<64-hex>`).

---

## 1. Executive Summary

The existing private-debate invitation system (`room_invitations` + `accept_invitation` /
`create_room_invitation` + owner/gate UI) was verified end-to-end against the live local
database and the real browser. The prior concern is **confirmed and extended**: tokens are
stored and compared in **plaintext** (P1), there is **no expiry** of any kind (P1), and the
audit found five additional P2 weaknesses (no acceptance/creation throttling, over-broad
direct UPDATE, accept/revoke TOCTOU race, URL-based token transport, no deleted-user gate
in accept) plus the plaintext room access code. Authorization fundamentals are sound
(CSPRNG tokens, room-scoped user-or-email binding, auth-required accept, owner-only
management, publish/inviter-delete cascades all verified working). **Verdict: C — Blocked
pending remediation.** The 9D.2D gate (no friend-aware room invites before remediation) must
hold. A single recommended remediation architecture (§25) and 7 product decisions (§26)
are provided; implementation is explicitly out of scope.

## 2. Audit Scope

In scope: `room_invitations` table lifecycle, all invitation RPCs
(`create_room_invitation`, `accept_invitation`, `join_with_access_code`,
`set_room_access_code`, `remove_participant`, `make_room_public`,
`set_participant_invites_enabled`, `get_private_room_gate`), RLS/policies/grants,
owner UI (`private-debate-management.tsx`), join UI (`private-access-gate.tsx`),
services/hooks, `/debates/[slug]?invitation=` route, access-code subsystem (shared
join surface), redirects, logging/errors, concurrency, deletion interactions.
Out of scope: friend system internals (9D.2B signed off; not reopened — no material
dependency found), room_invitation remediation implementation, production changes.

## 3. Repository/Architecture Findings

- Invitation surface is confined to private debates: 3 migrations own it —
  `202606220001` (table/RLS/accept/join/remove/publish/code), `202606230013/230014`
  (access-code 5-failure/15-min throttle), `202606230015` (create RPC + INSERT/DELETE
  grant revocation), `202606230016` (hex tokens + debates RLS scoping). All applied
  locally and remotely (ledger §21).
- Client call chain: `private-debate-management.tsx` (owner) → `use-debates.ts` hooks →
  `debate-service.ts` (`create_room_invitation` RPC, `room_invitations` SELECT *,
  direct UPDATE revoke, `accept_invitation`/`join_with_access_code` RPCs) →
  `private-access-gate.tsx` (join UI, URL scrub). No server actions, no API routes, no
  analytics, no email sending (invite links are copy-paste; "email" is only a binding label).
- Prior audit claims re-verified, not assumed: plaintext (CONFIRMED live), no expiry
  (CONFIRMED — no column exists), no acceptance rate limiting (CONFIRMED — T7).
  Correction: the "revoke is dead" hypothesis is FALSE — revoke uses direct UPDATE
  (granted), not DELETE (revoked), and works end-to-end (browser + DB verified).

## 4. Current Invitation Flow

Owner (or enabled active participant) enters an email → `create_room_invitation` RPC
mints 64-hex token, stores plaintext row (`active`), returns token → UI renders
`/debates/<slug>?invitation=<64-hex>` + copy button → recipient opens link (URL scrub
on mount, token prefilled) or pastes token → login required (guests redirected with
full URL preserved) → Accept → `accept_invitation(token, room_id)` checks room state,
removed-status, active row + token + user-or-email binding → inserts `neutral`
membership (partial-unique dedup) → marks `accepted`. Owner lists invites (tokens +
emails in browser), revokes via UPDATE to `revoked`. Publishing revokes actives +
clears code. Inviter deletion cascade-deletes their invites (verified).

## 5. Token Lifecycle

Generate (CSPRNG, server) → store plaintext → transport via URL/DOM → scrub (partial) →
redeem once (status flip; reuse → `invalid_invitation`, verified T1) → terminal
(`accepted`/`revoked`, history preserved) → **never expires** → purged only by room or
inviter deletion. No rotation, no re-issue flow (owner creates a new row instead).

## 6. Database/RLS/Grant Analysis

- Table (live-verified columns): id, room_id (CASCADE), invited_by (CASCADE),
  invited_user_id (SET NULL), email, invitation_token (plaintext, UNIQUE index on raw
  value), status ∈ {active, accepted, revoked}, accepted_at, revoked_at, timestamps.
  **No `expires_at`.**
- Grants (live): authenticated = SELECT + UPDATE only; anon = none; INSERT/DELETE
  revoked from all client roles. Mutations split: create/accept via DEFINER RPCs,
  revoke via direct client UPDATE.
- Policies (live): SELECT = room owners + bound invited users; UPDATE = room owners
  with USING(owner) and **no WITH CHECK** → owners may UPDATE any column (room_id
  repoint, token rewrite, re-target, status re-arm). No INSERT/DELETE policies remain.
- All 7 RPCs: SECURITY DEFINER, pinned `search_path` (verified live). PostgREST
  exposes only granted paths. No anon access anywhere.

## 7. RPC/API Analysis

`create_room_invitation`: auth + private/archived + owner-or-enabled-participant +
exactly-one-identity + non-blank-email + no-self checks (all verified U1/U2/U3/U5);
mints token, inserts, returns plaintext. **No creation throttle.**
`accept_invitation` (live body == 220001 text): auth + room exists/archived +
removed-member + active-row/token/binding match → membership + consume. **No expiry
check, no attempt throttle, no row lock, no deleted-user check.**
`join_with_access_code`: same guards + 5-failure/15-min throttle (browser-verified:
5× invalid then lockout message) + clears on success. `remove_participant`,
`make_room_public` (revokes actives, clears code — browser + DB verified),
`set_room_access_code` (owner-only, no strength rules), `get_private_room_gate`
(minimal metadata, anon-safe).

## 8. Browser QA

18 scenarios, local stack, 4 test users + owner room (Playwright MCP): valid create →
link card + 64-hex token; valid accept → membership + gate clears (DB: accepted/1 row);
URL scrub verified (`invitation=` gone post-load); invalid token → generic toast, gate
stays; revoked create→revoke→accept → rejected, status revoked (DB); logged-out link
visit → `/login?redirectedFrom=...%3Finvitation%3D...` (token preserved in login URL);
post-login gate prefills; publish → room public + code cleared + active auto-revoked
(DB); access-code lockout on 6th bad attempt; owner list shows emails+statuses; deleted
profile → not-found (no invite surface). Refresh/back-forward: state-driven, no
token replay surface beyond the persisted link itself (NOT TESTED as distinct cases —
link reusability is fully covered by T1/SQL instead).

## 9. Network Inspection

`create_room_invitation` POST → 200 + raw token (by design — owner just minted it).
`accept_invitation` POST → 200 + room uuid on success; 400
`{"message":"invalid_invitation","hint":"Invitation not found or expired."}` on
failure. Owner `room_invitations?select=*` → 200 with full rows incl. plaintext
tokens + emails (RLS-filtered to owned rooms; shape code-verified — GET bodies not
captured by the inspection tool, recorded as source-verified). UI toasts are generic
("Failed to accept invitation") — no oracle at UI level. No service-role keys, no
tokens in OG/metadata (private pages forced generic + noindex).

## 10. Threat Model

| Attacker | Asset | Surface → Attack | Current defense | Residual risk |
|---|---|---|---|---|
| A. Normal user misuse | membership | gate UI → reuse/forward link | single-use + binding | forwarding within binding (P3) |
| B. Malicious authenticated user | others' rooms | RPC params → tamper room/token/user | room-scoped binding, all U-tests reject | room-existence oracle (P3) |
| C. Unauthenticated attacker | private rooms | URLs/RPC → accept w/o login | auth-required (T4) | none on this path |
| D. Stolen-token attacker | victim's invite | link theft → accept as self | user/email binding (T6) | email pre-registration race (P3) |
| E. Database-read attacker | ALL active tokens | backups/replicas/SQL-editor → copy URLs | **none (plaintext)** | **P1 — total invite compromise** |
| F. Enumeration attacker | valid tokens | rapid guessing | 256-bit space only, **no throttle** | infeasible brute force; missing control (P2) |
| G. Session/XSS attacker | owner's tokens | owner browser → SELECT * cache | RLS scoping only | bulk token theft (P3) |

## 11. Authorization Analysis — PASS (with P2/P3 notes)

Auth-required accept (T4), room-scoped token binding incl. cross-room rejection (U4),
user-or-email binding incl. unrelated-user rejection (T6), removed-member (T9),
archived (U6), public-room create (U1), non-member create (U2), self-invite (U3),
blank identity (U5), owner-only management + publish/remove/code paths — all PASS by
live test. Notes: no `is_active_user()` gate in accept (P2); friend-scope blocks don't
apply to room joins (product note, P3); owner UPDATE over-broad (P2, §6).

## 12. Token Security Analysis — FAIL (P1)

Generation sound (256-bit CSPRNG, server-side, hex). Everything after is not:
plaintext storage + unique index on raw token (DB-reader compromise = usable URLs),
plaintext comparison, bulk plaintext delivery to owner browsers, URL/query/DOM/SSR-prop
transport with partial scrub. Entropy does not compensate for storage/transport.

## 13. Expiry/Revocation Analysis — FAIL (P1) / PASS with notes

Expiry: no column, no check, no sweep; "expired" hint text is aspirational. Active
invites live forever (P1). Revocation: owner UPDATE path works (browser + DB);
accept enforces revoked (T8); publish mass-revokes (verified); inviter deletion
cascades (verified 1→0). Revoked/accepted rows are terminal and history-preserving.

## 14. Replay Analysis — PASS (sequential), PARTIAL (concurrent)

Sequential reuse rejected (T1). Concurrent double-accept (C1): one winner, exactly 1
membership, loser `invalid_invitation` — benign. Accept-vs-revoke interleave: code
check-then-act without row lock admits a lost-revoke (revoke commits between SELECT
and UPDATE → membership granted); window narrow, requires owner/invitee concurrency —
PARTIAL (code-proven, not empirically forced).

## 15. Enumeration/Rate-Limit Analysis — FAIL (controls missing)

Token space 2^256 (infeasible to brute force — the saving grace). But: zero acceptance
throttling (T7: 10/10 processed), zero creation throttling (T10: 10/10 minted),
error oracle room_not_found vs invalid_invitation at network level (P3, UUID space),
access-code path properly throttled (5/15 min, verified) — the invitation path should
match that posture.

## 16. IDOR Analysis — PASS

Room/user/token/slug tampering all rejected (T2/T3/U4 + code: token lookup always
conjoins `room_id = p_room_id`; membership always `auth.uid()`). Slug is display-only.
Owner UPDATE repoint (room_id rewrite) is the one IDOR-shaped exception (P2, own rooms
only, §6).

## 17. Redirect Analysis — PASS (with P2 note)

Guest flow preserves the full invitation URL through `redirectedFrom` (existing safe-
redirect validates internal-only — no open redirect). No external/phishing chain
possible from invite parameters. Note: preservation keeps the token in the login page
URL/history (transport P2, §12).

## 18. Concurrency Analysis — PASS with P2 race

C1 benign (single membership). No row lock / advisory lock in accept (PARTIAL for
accept-vs-revoke/publish lost-update). Membership insert protected by partial unique
index (no dup rows possible). Creation has no dedup (duplicate email invites allowed —
usability/spam note, P3).

## 19. Deleted/Blocked/Inactive User Analysis

Inviter deletion → invites cascade-deleted (verified — safe default, matches deletion
spec "purge"). Invited-user deletion → `invited_user_id` SET NULL; email-bound rows
keep working for same-email accounts (edge noted). **Accept lacks `is_active_user()`
(P2)** — friend RPCs fail closed on in-flight deleted sessions; invitations do not.
Removed participants rejected (T9). Friend-scope blocks don't gate room joins (P3
product note). Archived rooms reject (U6).

## 20. Information Exposure Analysis

Owner browser receives all active tokens + invitee emails (by design for copy-link;
P3 hardening note). Gate page exposes only generic "Private Debate" shell (verified).
No room content/title/topic/participants leak pre-join (verified snapshot). Error
bodies expose short codes only. No tokens in metadata/analytics (none exist). Token in
SSR props + address bar pre-scrub (P2 transport).

## 21. Migration History Findings

Files `202606220001/230001/230013/230014/230015/230016` present (untracked working
tree, as with all migrations), applied locally AND remotely (ledger shows
Local=Remote for all six). Live objects spot-match file content (accept body ==
220001; create == 230016 hex; grants/policies == 220001+230015). Historical
byte-identity is unprovable (no byte store) — documented, not claimed. **No migration
touched, no repair run, no new migration created** (hard stop respected).

## 22. Environment/Test Limitations

`.env.local` targets production — all QA ran on an isolated `:3001` instance with
local overrides; `.env.local` untouched; production untouched. Supabase MCP
unavailable — docker/CLI + SQL used instead (equivalent for schema/RPC inspection;
no production SQL access exists or was used). Local grant gaps (profiles/rooms/
debate_participants SELECT) required documented local-only GRANT alignment for page
rendering (NOT migrations; RLS untouched). Stale deleted-user cookies 404 pages (app
behavior note). A stale `.next` cache (from 9D.2B's build) broke dev chunk serving;
cleared cache + restarted (environmental). GET response bodies not captured by the
network tool (shapes source-verified). Figma unused (not relevant). Refresh/back-forward
covered via state analysis rather than dedicated runs.

## 23. Philosophy Alignment

Current system: no directories/counts/scores/virality — utility-only, ALIGNED.
Remediation must keep it so: no public invite surfaces, no referral metrics, no
growth prompts; keep single-purpose owner UI. Friend→room→invite chain (§9 of task)
remains a safe future iff this remediation lands first (9D.2D gate holds).

## 24. Findings by Severity

**P1 (2):** F-01 plaintext token storage (DB-reader → usable URLs); F-02 no expiry
(immortal bearer credentials).
**P2 (7):** F-03 no acceptance throttling; F-04 no creation throttling; F-05 over-broad
owner UPDATE (no WITH CHECK); F-06 accept/revoke TOCTOU (no row lock); F-07 URL/login-
redirect/SSR token transport; F-08 no deleted-user gate in accept; F-09 plaintext room
access_code at rest.
**P3 (5):** F-10 room-existence oracle; F-11 email pre-registration race; F-12 bulk
token delivery to owner browsers; F-13 no invite-email format validation; F-14
`invitationId` actually carries the token (mislabeled API).
**INFO (5):** sound CSPRNG; sound binding/room scoping; publish cascade; inviter-delete
cascade; access-code throttle exists.

## 25. Recommended Remediation Architecture (single option)

In-place M3 hardening of `room_invitations` (no new token family, no URL migration):
(1) `token_hash sha256` UNIQUE + backfill `sha256(invitation_token)` for all rows,
then NULL/drop plaintext; lookup by hash; (2) `expires_at` (default +7d, NOT NULL for
new rows) enforced atomically in accept; (3) atomic consume
(`UPDATE … WHERE id=X AND status='active' AND (expires_at IS NULL OR …) RETURNING`);
(4) `SELECT … FOR UPDATE` on the invite row inside accept (kills F-06);
(5) owner-only `revoke_room_invitation` RPC replacing direct UPDATE; revoke UPDATE
grant + owner UPDATE policy (re-add narrow policy or none); (6) attempt throttle table
(10 failures/15 min, generic error); (7) creation throttle (≤20 active/room,
≤10 creates/user/hour via counters); (8) `is_active_user()` gate in accept + create;
(9) hash room access codes (bcrypt deserver-side) keeping 5/15-min throttle;
(10) transport: move token to URL fragment (`#invitation=`) read client-side — never
hits server logs/referrer/SSR props — plus stop persisting it in `redirectedFrom`
(store a one-time server-side pending-intent instead); (11) keep single-use +
user-or-email binding + all current cascades; (12) expired-row sweeper (status →
`expired`, retention per §26) + uniqueness on hash preserved. Why this fits Discora:
smallest coherent change, preserves every verified-good behavior (§11/INFO), closes
P1s structurally, needs no URL migration, keeps the 9D.2D picker plan intact.

## 26. Product Decisions Required

D-9D3-1 single-use vs reusable links — RECOMMEND single-use (status quo); RATIONALE:
matches "single-use link" UX copy + eliminates replay class.
D-9D3-2 expiry duration — RECOMMEND 7 days (matches locked friend-invitation D-8
spirit); RATIONALE: consistent cross-system expectations.
D-9D3-3 max active invites/room + create throttle numbers — RECOMMEND 20 active,
10/hour; RATIONALE: abuse-bounded, far above legitimate owner use.
D-9D3-4 accept-attempt throttle — RECOMMEND 10 failures/15 min generic error;
RATIONALE: mirrors access-code posture.
D-9D3-5 anonymous (pre-login) invite preview — RECOMMEND no (login stays required);
RATIONALE: private rooms must not leak metadata to logged-out viewers.
D-9D3-6 link forwarding semantics — RECOMMEND allowed-with-binding (document that
possession ≠ identity; binding decides); RATIONALE: matches current email-invite UX.
D-9D3-7 expired-row retention — RECOMMEND keep `expired` history 90 days then purge;
RATIONALE: auditability without unbounded growth.
D-9D3-8 friend-scope blocks gating room joins — RECOMMEND out of scope (room removal
covers safety); RATIONALE: avoids coupling safety systems silently.

## 27. Implementation Plan — HIGH LEVEL ONLY

M3 migration (additive: hash/expiry columns, backfill, constraints, hardened function
bodies, new revoke/throttle RPCs, grant/policy tightening) → local adversarial matrix
re-run (§28) → preview → backup + production apply + post-apply matrix → 9D.2D unblocked.
No implementation performed in this phase.

## 28. Regression Test Plan

Re-run: T1–T7 + U1–U6 + C1 matrices (all must hold) PLUS new: expired-accept rejects;
hash-only storage (no plaintext column/values); throttled 11th attempt generic-errors;
revoke-via-RPC + direct UPDATE now 403s; accept-vs-revoke interleave (forced via
lock inspection + parallel burst) never yields membership-after-revoke; deleted-user
accept rejects; fragment transport (no token in server logs/referrer); sweep marks
expired. Browser: full §8 suite repeated.

## 29. Rollout Strategy

Local → preview → production with backup; backfill is total (all legacy tokens are
plaintext-hashable) so a single-transaction flag-day works — no dual-read period
needed; post-apply: verify no `invitation_token` values remain, run §28 matrix against
production read paths only (no destructive prod tests); monitor throttle counters;
keep 9D.2D gated until apply verified. Rollback: restore backup (hash is one-way —
regenerating links post-rollback requires re-issue; communicate accordingly).

## 30. Final Verdict

**C — Blocked pending remediation.** Two P1s (plaintext storage, no expiry) plus seven
P2s are evidenced by live test, not assumption. Authorization core is genuinely good,
which bounds the work to the M3 hardening above — but friend-aware room invites
(9D.2D) must not build on this mechanism until it lands.
