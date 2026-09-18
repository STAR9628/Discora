# Discora — Phase 9D.3 Security Remediation Implementation Report (M3)

**Mode:** IMPLEMENTATION + ADVERSARIAL VERIFICATION (Product Owner authorized; all 8
D-9D3 decisions approved). Local sandbox only. No production contact beyond the
pre-existing read-only ledger inspection. No commits/pushes. No real tokens recorded
(tokens referenced as `<64-hex>`). 9D.2D remains CLOSED pending review of this report.

---

## 1. Executive summary

All 9 audit findings remediated in one forward migration + minimal app-layer changes:
SHA-256 hash-at-rest with verified backfill, 7-day expiry with sweep + 90-day purge,
atomic accept (row lock + guarded consume + uniform NULL failure), owner-only revoke
RPC replacing direct UPDATE, creation/acceptance throttles, active-user gates,
bcrypt access codes with hash-only reads, fragment transport with sessionStorage
pending intent. Full matrix (T/U/C + R1–R37), 5 concurrency tests, 22 browser flows,
tsc/lint/build green. One implementation bug (inverted removed-check, caught by the
matrix) fixed before verification completed. **Verdict: A (local).**

## 2. Original findings addressed

F-01 plaintext tokens → token_hash + column dropped, backfill proven. F-02 no expiry →
expires_at + atomic enforcement + sweep/purge. F-03/F-04 throttles → 10 fails/15 min
(per user+room) + 20 active/room + 10 creates/user/hour, all enforced. F-05 over-broad
UPDATE → grant revoked, policy dropped, revoke RPC (field-restricted). F-06 TOCTOU →
FOR UPDATE + guarded consume. F-07 transport → `#invitation=` + pending intent, SSR
props cleaned. F-08 no active gate → `is_active_user()` in create/accept/revoke/
code paths. F-09 plaintext codes → bcrypt + hash-only reads + set-state UI. P3s:
oracle closed (uniform NULL incl. room_not_found), email format validated,
owner list drops token column, `invitationId` mislabel removed.

## 3. Product decisions applied

D-9D3-1 single-use (status consume, reuse NULL). D-9D3-2 7-day expiry (DEFAULT
`now()+7d`, verified exact). D-9D3-3 20 active/room (advisory-lock serialized) +
10 creates/user/hour (atomic counter). D-9D3-4 10 fails/15 min, one generic message
("This invitation is not available.") for every accept failure class. D-9D3-5 login
still required; gate exposes generic shell only. D-9D3-6 binding kept (possession ≠
authorization). D-9D3-7 expired rows kept, purge after 90 days via RPC (prod
scheduling prerequisite §20). D-9D3-8 blocks don't gate joins (unchanged).

## 4. Migration(s) created

NEW `supabase/migrations/202609150001_phase_9d3_room_invitation_remediation.sql`
(sole migration change; no history edits). Applied locally (ledger recorded);
fully re-runnable (idempotent — re-applied exit 0). Contents: throttle tables
(RLS, no client grants), token_hash/expires_at + verified backfill gates (abort on
missing/dup), plaintext column + raw-token index dropped, status CHECK gains
`expired`, UPDATE grant/policy removed, 9 function bodies
(create/accept/record_failure/revoke/expire_sweep/purge/set_code/join_code/
has_code), bcrypt backfill with verification, comments. Pre-migration bug found by
matrix (inverted `removed_at` check in accept + join) fixed in-file before final
verification; re-apply proves the shipped file.

## 5. Token-storage architecture

`token_hash = sha256hex(token)`, UNIQUE, NOT NULL; lookup hashes the submission.
Plaintext lives only in the create-RPC return (authorized creator, copy-link UX).
Backfill replayed byte-for-byte in a rolled-back proof txn: 0 missing, 0 dups,
hashes independently recomputed correct, statuses preserved (R1). Column absence
(R2) and owner-list column exclusion (R3) verified live + in browser page source.

## 6. Expiry architecture

`expires_at NOT NULL`; new rows +7d (R4 exact-equality PASS). Accept rejects past-due
with lazy `expired` transition (R5). Revoke RPC refuses non-active (R6, no re-arm).
Sweep RPC transitions past-due actives (R37 PASS); purge RPC deletes 90-day-old
expired (R37 PASS). Retention scheduling is a deployment prerequisite (service-role
cron), not code.

## 7. Acceptance atomicity

`SELECT … FOR UPDATE` on the invite row + guarded consume
(`UPDATE … WHERE id AND status='active'`, rowcount-checked). C1: winner uuid, loser
NULL, exactly 1 membership. D: 8 accept-vs-revoke rounds, zero memberships without
`accepted` status (revoke-wins direction covered by T8-style single tests). E:
accept-vs-publish legitimate win + accept-after-publish NULL. Membership partial-unique
index retained as second barrier.

## 8. Revoke architecture

`revoke_room_invitation(uuid)` DEFINER: auth + active-user + row-exists + owner-of-room
+ active-only transition; updates status/revoked_at/updated_at ONLY (no retarget
surface). Direct UPDATE grant revoked + policy dropped (R19 grant-denied as
authenticated AND anon). R17 owner PASS, R18 non-owner `not_authorized` PASS.

## 9. Rate limiting

Accept: `invitation_attempts(room, user)` — 10 fails/15 min → silent NULL (R12
counter frozen at 10; R13 window reset resumes counting). Failures persist because
accept returns NULL instead of raising (same durable pattern as access-code join).
Create: atomic hourly counter (11th raises, R14) + room-global 20-active cap under a
dedicated advisory namespace `discora_room_invites` (R15 hits at exactly 20; single
lock holder, no ordering hazard). Access-code 5/15-min throttle byte-preserved and
re-verified (R34).

## 10. Active-user enforcement

`is_active_user()` gates create/accept/revoke/code-set/code-join. R11: deleted-flagged
account accept → NULL. Stale sessions fail closed.

## 11. Access-code hardening

bcrypt (`crypt(upper(code), gen_salt('bf'))`; case-insensitivity preserved by
construction), legacy codes hashed in backfill with shape verification, comparison
server-side only. New `room_has_access_code` presence RPC; UI shows set-state, never
the value (browser-verified: value absent from DOM). End-to-end hash join verified in
browser (lowercase input accepted). R33/R34 PASS. SHA-256 deliberately NOT used
(per task); pgcrypto verified available before use.

## 12. Transport/redirect architecture

Links are `#invitation=` fragments (never sent to server/logs/referrer/SSR).
Gate reads fragment → legacy `?invitation=` fallback (old links keep working) →
stores same-tab sessionStorage pending intent → scrubs URL (both forms). Guests
redirect with a CLEAN room URL; post-login the gate resumes from intent. Intent is
not a credential (RPC binding decides). SSR props carry no token (page source
verified absent). No open-redirect change (existing safe-redirect kept). Legacy query
links observed only in pre-remediation audit traffic, none generated after.

## 13. RLS/grant changes

Revoked: UPDATE on room_invitations (authenticated); owner UPDATE policy dropped.
Preserved: SELECT grants + owner/invitee SELECT policies. New tables RLS-enabled
with zero client grants (DEFINER-only). All 9 functions DEFINER + pinned
`search_path=public` (crypto via `extensions.` qualification). `record_invitation_failure`
service_role-only (called inside DEFINER accept, mirroring the friend-lock pattern).

## 14. Regression tests

T0–T7 (NULL-contract: valid→uuid; reuse/tamper/wrong-room/noauth/bad-room/unrelated→NULL;
10 rapids all NULL, counter=10), U1–U3/U5 (+new no-@ check; raises preserved on create),
C1 (above), R1–R8, R11–R15, R17–R19, R33–R35, R37: **ALL PASS**. R9/R10 via §15 D/E.
R16 = concurrency B. R20–R23 subsumed by NULL uniformity. R24 browser-verified.
R25–R28 browser/network-verified. R29–R32 = uniform NULL. R30/R31 UI-verified generic.
R36 carried (FKs untouched; audit proof stands).

## 15. Concurrency results

A (20 + 5 distinct creators): 5/5 capped, stays 20. B (19 + 10 distinct): exactly
1 success + 9 caps → 20. C: uuid + NULL, 1 membership. D: 8 rounds, invariant
(membership ⇒ accepted) holds; T8 covers revoke-first. E: legitimate win +
accept-after-publish NULL. Room advisory lock serializes creators; invite row lock +
guarded consume serializes accepters.

## 16. Browser QA results (22/22)

Fragment create/scrub/accept; logged-out clean redirect + intent continuation;
reuse/revoked/expired/invalid/wrong-user generic failures; revoke-via-RPC;
publish mass-revoke; code set-state + hash join; owner list without tokens; SSR
without tokens; refresh persistence; mobile 390px zero-overflow; guest /friends
guard intact; friend 41/41 regression intact. Session flakes traced to local GoTrue,
recovered via re-login (environmental note).

## 17. Network exposure results

Post-remediation traffic: zero token-bearing URLs (fragments unsent); token appears
ONLY in `accept_invitation` POST bodies (intended controlled submission) and
`create_room_invitation` responses (creator-only). Owner list selects lifecycle
columns exclusively. Error bodies: `{"message":"invalid_invitation",…}`-class codes
without SQL/stack. No service-role material client-side.

## 18. TypeScript/lint/build results

tsc 0 errors; ESLint 0 errors (44 warnings = pre-existing baseline; one self-introduced
unused-disable removed); production build exit 0 with `/friends` + debate routes
compiled.

## 19. Remaining limitations

Throttle/sweep/purge RPCs need production scheduling (cron/service-role) — code ships,
wiring is a deployment step. Legacy `?invitation=` links still honored (read-only
fallback; scrubbed on load) — full deprecation is a future call. Email-registration
race and owner-browser bulk exposure accepted as P3 residuals (documented). Test
identities/rooms residue in sandbox (documented; friend tables wiped). `.env.local`
still targets production (isolated overrides used throughout).

## 20. Production deployment prerequisites

Backup; apply 202609150001 (forward, idempotent); verify backfill gates pass in logs;
confirm no `invitation_token` column/values remain; schedule sweep + 90-day purge;
monitor throttle counters; re-run §14 matrix read-paths (no destructive prod tests);
communicate rollback caveat (hashes one-way — post-rollback re-issue needed). 9D.2D
stays CLOSED until Product Owner approves this report.

## 21. Final verdict

**A (local implementation + verification).** Every finding fixed, every matrix item
PASS with evidence, gates green, philosophy intact (no counts/referrals/pressure —
management UI unchanged in shape, copy unchanged). Production NOT touched; 9D.2D NOT
unblocked by this report alone.
