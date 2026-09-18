# Discora — Phase 9D.2B Friend + Secure Share Implementation Report

**Date:** 2026-09-15. **Basis:** 9D.2A-R2 signed off (verdict A); foundation reused, not redone.
**Hard stops observed:** no production deploy/push, no migration edits (130001/130002/140003/
140004/140005 untouched — no new migration created at all), no room_invitations changes, no
external token subsystem, no email/realtime notifications, no account deletion, no OAuth/
sound changes, no commits/pushes. Local Supabase sandbox only.

---

## 1. Scope

User-facing **known-user friend system** (request lifecycle UI, private inbox/lists,
blocking UI, profile controls, nav entry) + **secure-share verification** of the existing
public-URL share surfaces. External invitation tokens (`/invite/[token]`) do NOT exist in
the repo (no `/invite` route) — per hard stops, NOT implemented.

## 2. What existed before (Step 1 audit)

- DB/RPCs: 12 friend functions (create/accept/decline/revoke, block/unblock, quota,
  expiry, pair+recipient locks); owner-scoped RLS SELECT; zero client DML policies.
  No list-RPCs needed — reads go through RLS-scoped SELECT.
- UI: **zero** friend UI in `src`. ShareButton (`components/share/share-button.tsx`,
  native Web Share + clipboard fallback, no counters) already used on discussions,
  debates, profiles — and already gated to `visibility === "public"` at all 3 call
  sites (verified by inspection).
- Patterns reused: TanStack Query + `useAuth` + browser client + `mapSupabaseError` +
  toast + Tooltip + ConfirmDialog + `/login?redirectedFrom=` guard (Saved page pattern).

## 3. Files changed (new feature module + wiring; no refactors)

- NEW `src/features/friends/services/friend-service.ts` — RLS-scoped reads
  (incoming/outgoing/pending-between/friendships/blocks + counterpart hydration limited
  to id/username/display_name/avatar_url), RPC-only mutations, neutral error mapping
  (`inbox_cap_reached` → "This member has reached their pending friend request limit.",
  never raw codes).
- NEW `src/features/friends/hooks/use-friends.ts` — queries + single `useFriendAction`
  mutation with invalidation + toasts.
- NEW `src/features/friends/components/friends-page-client.tsx` — private /friends
  surface (Incoming / Sent / Friends / Blocked + neutral empty states + block
  ConfirmDialog with consequences + incoming badge D-6).
- NEW `src/features/friends/components/friend-list-item.tsx` — private row
  (name/avatar only, no counts/history/graph).
- NEW `src/features/friends/components/profile-friend-control.tsx` — state-aware
  profile controls (Add Friend / Request sent+Withdraw / Accept+Decline /
  Friends / Blocked+Unblock). **Mid-QA addition:** standalone Block available in every
  non-blocked state (harassment can come from strangers — blocking must not require a
  connection). Never rendered for guests/self; never in composers.
- NEW `src/app/friends/page.tsx` — auth-guarded (`redirect /login?redirectedFrom=/friends`),
  `robots: noindex`.
- EDIT `components/layout/sidebar.tsx`, `mobile-nav.tsx` — authenticated-only Friends
  item + incoming badge (D-6 in-app badge only; plain count, no urgency styling).
- EDIT `app/u/[username]/page.tsx` — mounts ProfileFriendControl.
- Intentionally untouched: `room_invitations`, all migrations, auth/OAuth, share-button
  implementation (verified correct as-is), composers.

## 4. Friend system behavior

Request → accept (friendship row) / decline (history preserved, 7-day resend cooldown) /
withdraw (revoke). Block: atomic remove-friendship+pending, future sends rejected;
unblock never restores (Add Friend shown). Blocked-by-other is invisible (block rows are
blocker-scoped): viewer sees "Add Friend", send fails neutrally. Deleted profiles 404
(`getProfileByUsername` returns null) — no request surface. All enforcement in RPCs.

## 5. Secure share

Supported targets: public discussions, public debates, public profiles — canonical
public URLs only (origin + sharePath), no tokens/IDs beyond the slug, no counters.
Visibility enforcement: ShareButton renders only under `room.visibility === "public"`
(all 3 sites, code-verified) + browser-verified. Private debate renders access gate
with NO share button. URL safety: no user-controlled redirects introduced; login
`redirectedFrom` uses existing `getSafeRedirectUrl`. Private-content protection:
verified via private-room page + RLS (unchanged).

## 6. Security

Authorization: every mutation via lifecycle RPCs; reads owner-scoped (network log:
all friend queries carry `=auth.uid()`-equivalent self filters). No client DML
policies exist. No service-role/GEMINI/secret references in `src` (grep-verified).
Counterpart hydration = 4 approved columns. Raw RPC error bodies in devtools contain
only short codes + neutral hints (standard PostgREST behavior, same as existing RPCs).
No stack traces/SQL in UI; toasts mapped. No `/invite` route created.

## 7. Browser QA (Playwright, local-env server :3001 — `.env.local` points at
production, so a second instance with local overrides was used; `.env.local` untouched)

Passed: (1) Alice→Bob request + "Request sent"/Withdraw; (2) Bob inbox shows Alice +
nav badge "1"; (3) accept → Friends list, badge clears; (4) profile shows
Friends+Block; (5) block w/ confirm copy → Blocked+Unblock, DB 0 friendships/1 block/
history `accepted`; (6) /friends Blocked section; (7) unblock → "Add Friend" (no
auto-restore); (8) public discussion share button renders+clicks, no crash;
(9) public debate share renders; (10) private debate = access gate, no share;
(11) blocked-user request → neutral "Friend requests are not possible…", no block
disclosure; (12) decline → inbox clears, history `declined`;
(13) resend → "Please wait before sending another request…";
(14) rate-limit UI → "Too many requests…" (counter seeded; limit backend-proven in R2);
(15) cap UI → "This member has reached their pending friend request limit."
(50 seeded; invariant backend-proven in R2);
(16) deleted profile → "User not found", no controls; (17) guest /friends →
`/login?redirectedFrom=/friends`; (18) mobile 390px /friends + profile: 0 horizontal
overflow, all controls render; (19) profile share button present;
(20) network log: owner-scoped friend queries only.
Only pre-existing console errors: `debate_participants`/`debate_side_changes` 403s
(local grant gap, unrelated) + expected 400s on intentional error-path RPCs.
Session drops observed twice (local GoTrue); re-login recovered — environmental note.

Environment notes (local-only, documented, NOT migrations): (a) local DB lacked table
grants the app needs (profiles/rooms/discussions/debates/topics/user_saves had no
anon/authenticated SELECT — production demonstrably has them; cf. 202609090011 header).
Applied minimal grants locally via `Temp/opencode/local_qa_grants.sql` to run QA.
(b) QA users created via GoTrue Admin API (SQL-set bcrypt rejected by local GoTrue).

## 8. Database regression (Step 13, post-QA)

`friend_tests.sql`: **41/41 PASS, 0 FAIL** (includes one repeat of the R2 fixture saga:
`c1`'s auth email had been clobbered to `deleted@test.example` by an earlier run,
breaking FN-02's email-unique insert — restored to `c1@test.example`, suite green;
test-only hygiene, no product change). Cap 49+10 re-run: **1 success / 9
`inbox_cap_reached` / final 50**. S1–S8 semantics unchanged (verified in R2; flows
re-covered via UI above). R2 guarantees (cap 50, 15/h, 40/d, block/friendship/expiry/
cooldown/authZ/RLS/DEFINER/search_path) intact.

## 9. Quality gates

`npx tsc --noEmit`: **0 errors**. `npm run lint`: **0 errors**, 44 warnings (all
pre-existing; none in friends code). `npm run build`: **exit 0**, `/friends` compiled.

## 10. Philosophy audit (explicit)

No friend counts/scores/rankings/leaderboards/streaks anywhere; badge is a plain
inbox count (D-6). Copy is anti-pressure ("Take your time — there is no rush").
No "people you may know", no mutuals, no public graph. No share counts/analytics.
No popularity/truth/AI mechanics. Friends = private connection utility for
discourse participation. No composer (C-4). **Aligned.**

## 11. Known limitations

1. External invitation tokens + `/invite/[token]`: not implemented (no approved
   implementation in repo; hard stop). Same-button-produces-link UX (C-4) awaits M2.
2. Local DB grant layer drifts from production (profiles/rooms/etc. grants live outside
   migrations) — pre-existing gap; local-only alignment applied for QA, production
   untouched. A full effective-grant capture remains follow-up work (per 202609090011).
3. Share copy-to-clipboard cannot succeed in non-HTTPS headless QA (clipboard API
   unavailable) — designed error toast path; production is HTTPS.
4. QA identities (`qa_*`) remain in local sandbox (auth.users cascade blocked by
   immutable reputation_events trigger); suites wipe friend tables.
5. 7-day expiry/cooldown time-passage verified at DB level (R2 S5/S7); UI shows the
   resulting states/messages, not the passage itself.

## 12. Explicit non-scope

- room_invitations modified: **NO**. external invitation tokens: **NO**.
- email notifications: **NO**. realtime notification subsystem: **NO**.
- account deletion: **NO**. production deployment: **NO**.

## 13. Final verdict: **A**

Complete Beta friend UI + verified secure share, RPC/RLS-only enforcement, 20/20
browser flows evidenced, DB regression green (41/41, 1/9/50), tsc/lint/build clean,
philosophy aligned, zero scope violations. No migration created or modified for 9D.2B
(none needed). STOP.
