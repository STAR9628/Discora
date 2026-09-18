# PHASE 9D.2 — FRIEND REQUESTS + SECURE INVITATIONS: ARCHITECTURE + SECURITY AUDIT

**Date:** 2026-09-14
**Status:** AUDIT + DESIGN RECOMMENDATION ONLY — NO IMPLEMENTATION
**Revision:** 2 (Architecture Correction Pass — see `docs/PHASE_9D2_ARCHITECTURE_CORRECTION_REPORT.md`)
**Verdict:** B. READY WITH PRODUCT DECISIONS

---

## 0. Scope, Method, and Evidence

This is a **read-only** architecture + security audit. No code, migration, RLS policy, auth change, or production change was made. No commit/push was performed. The audit was conducted against the local repository state and, where noted, verified against production Supabase only through read-only anon SELECT (no mutations).

Evidence sources:
- `supabase/migrations/` (canonical DB history, never edited),
- `src/**` (routes, components, services, hooks),
- Product/master context docs in `docs/` — treated as historical unless they match current repo state,
- Phase 9D audit (`docs/PHASE_9D_SECURE_SHARE_INVITATION_ARCHITECTURE_SECURITY_AUDIT.md`) — the governing design reference for this phase,
- Phase 9D.1 implementation + runtime verification docs,
- Product Owner Architecture Correction Pass (this revision).

Verification performed during this audit:
- Deletion orchestration: **confirmed NOT implemented** (no `delete_account`/`initiate_deletion`/`enqueue` function in `supabase/`; no `supabase/functions/` directory; legal pages describe intent only; Settings button is disabled with copy "Account deletion is not yet available").
- No friend/follow/relationship/blocking surface exists in `src/` (only legal text matches).
- No notification system exists (only Supabase Realtime typing broadcast in `use-typing-indicator.ts`).
- `/invite/{token}` route does not exist.
- Public share (9D.1) is implemented and runtime-verified.

---

## 1. Executive Summary

Discora has a completed, verified **public share** capability (Phase 9D.1: `navigator.share()` with copy fallback in `src/components/share/share-button.tsx`, OG/canonical metadata, `robots` handling). The **friend request + secure invitation** feature is net-new.

Key findings:

- No relationship, blocking, notification, or account-deletion orchestration exists today. The friend system is greenfield but the platform already supplies the security primitives it needs: `SECURITY DEFINER` RPCs with pinned `search_path`, `is_active_user()`/`has_room_access()`/`has_room_write_access()` helpers, `getSafeRedirectUrl()` safe-redirect, and slug-based public routing.
- The existing private-room invitation system (`room_invitations`, `accept_invitation`) stores and compares **plaintext tokens** and has **no expiry** and **no rate limiting on acceptance**. Per the Product Owner hard rule it is a **blocking remediation prerequisite**: no friend-aware room-invitation integration may be built on top of the insecure mechanism. Remediation (hash-at-rest, expiry, rate limiting, atomic consumption, preserved authorization) must land **before** any friend-aware room invite feature.
- The friend system is modeled as three independent concepts: `friend_requests` (lifecycle Pending → Accepted), `friend_relationships` (**accepted friendships only** — blocking is NEVER a state in this table), and `user_blocks` (independent one-way safety boundary).
- The friend graph is **private during Beta**: users see their own friends and management surfaces; no public social graph, no public friend counts as popularity signals.
- Add Friend is a **secure-link creation/copy action**, not a social composer: click → create pending request/invitation → copy secure invitation link → "Request sent" / "Friend request link copied".
- **Known-user friend requests** (A→B direct) and **external-secure invitations** (A→ link, B opens `/invite/[token]`, B authenticates, server validates, request bound, B accepts) are distinct flows with explicit semantics. The token is NEVER authentication and NEVER itself friendship.
- Email-based friend invitations are **out of Beta**; `recipient_email` is designed-for-future only, not an implementation dependency.
- Server/DB-enforced rate limiting is mandatory, with conservative initial values, documented abuse rationale, tunable configuration, and adjustment based on actual evidence — NOT presented as permanent product truth.
- Several product decisions remain open after Phase 9D. They are enumerated in Section 31 with options and recommendations.
- No implementation risk is currently blocking design; the verdict is therefore **B. READY WITH PRODUCT DECISIONS**, not A.

---

## 2. Current-State Repository Audit Summary

Relevant implemented surface (verified):

- **Auth:** Email/password + Google OAuth; middleware session refresh; profile-onboarding redirect; deleted-user fail-closed; `getSafeRedirectUrl()` used in login, OAuth callback, auth service. `src/services/supabase/middleware.ts`, `src/lib/security/safe-redirect.ts`, `src/app/auth/callback/route.ts`.
- **Public share:** `ShareButton` in `src/components/share/share-button.tsx`; placed in `discussion-room-layout.tsx`, `debate-room.tsx`, `debate-header-v2.tsx`, and `/u/[username]` page. `RoomHeaderActions` at `src/components/share/room-header-actions.tsx`. Metadata (title/description/canonical/OG/robots) generated per public page.
- **Authorization helpers:** `is_active_user()` and final `has_room_write_access()` in `202609140003`; final `has_room_access()` in `202606220001` (lines 45–67). Room access = public-non-archived OR owner OR active participant. No `room_access`/`room_members` table exists.
- **Profiles:** `public.profiles` (username unique, display_name, avatar, bio, `is_deleted`), `retired_handles`. Profile RLS: public read, owner write. Settings UI at `src/features/settings/components/settings-page-client.tsx`; account-deletion card present but disabled.
- **Debate participation:** `debate_participants` with `removed_at` soft-removal + partial unique index; side proposition/opposition/neutral.
- **Premium helper patterns available for reuse:** `create_private_debate_room` (atomic multi-insert SECURITY DEFINER), `accept_invitation` (state-guarded), `access_code_failures` (per-user-per-room failure counter), `enforce_room_visibility_transition` trigger using `current_setting('discora.allow_visibility_change', true)` (client-authorized GUID pattern for visibility flips).

Not present (verified): friend/follow/relationship tables, blocking tables, in-app notifications, `/invite` route, account-deletion orchestration, `supabase/functions/`, application-level rate limiting.

---

## 3. Existing Secure-Invitation System Audit (`room_invitations`)

Canonical source: `supabase/migrations/202606220001_private_debate_phase4b_foundation.sql`.

Schema (lines 146–162): `id`, `room_id FK CASCADE`, `invited_by FK auth.users CASCADE`, `invited_user_id FK SET NULL`, `email`, `invitation_token text NOT NULL`, `status ('active'|'accepted'|'revoked')`, `accepted_at`, `revoked_at`, `created_at`, `updated_at`, identity CHECK (exactly one of `invited_user_id`/`email`).

Tokens: generated by caller pattern `encode(gen_random_bytes(32), 'hex')` (256-bit, 64 hex chars). Stored **in plaintext** and compared **in plaintext** inside `accept_invitation` (line 370: `invitation_token = p_invitation_token`). Unique index `room_invitations_token_idx` on raw token. **No `expires_at` column** — expiry is not modeled; only status transitions.

RLS / grants (lines 169–246):
- Owner SELECT / owner UPDATE / owner DELETE; invited-user SELECT; owners INSERT; participants INSERT when `participant_invites_enabled = true`.
- `revoke all from public, anon; grant select, insert, update, delete to authenticated` — authorized users perform DML directly against the table via RLS (no secret-definer RPC for create/revoke; `accept_invitation` is the SECURITY DEFINER enforcement point for acceptance).

`accept_invitation(p_invitation_token, p_room_id)` (lines 320–387): SECURITY DEFINER, `search_path=public`. Guards: authenticated; room exists; not archived; removed-participant denial for private rooms; invitation active + token match + recipient binding (`invited_user_id = auth.uid() OR email = auth email`); inserts participant (ON CONFLICT DO NOTHING); marks accepted.

Findings:

| ID | Finding | Severity |
|---|---|---|
| INV-SYS-01 | Token stored plaintext; compared plaintext in RPC | High (standing remediation item) |
| INV-SYS-02 | No `expires_at`; invitation never expires while `active` | Medium |
| INV-SYS-03 | No rate limiting on `accept_invitation` (only `access_code_failures` for access codes) | Medium |
| INV-SYS-04 | Direct DML allowed to authenticated on the table (mitigated by RLS but broad) | Low |
| INV-SYS-05 | Token appears in URL `?invitation=...` then scrubbed client-side (present during SSR) | Low |
| INV-SYS-06 | Single-use is enforced by status→`accepted` transition, not an atomic consumed_at guard | Low |

**Ordering implication (Product Owner hard rule):** Because of INV-SYS-01/02/03, this mechanism is **not a safe base for friend-aware room invitation features**. Remediation (Section 12) is sequenced as a prerequisite (Section 32, 9D.2C) before any friend-aware room-invite integration (9D.2D).

Decision governing this phase (carried from Phase 9D, Product Owner): **Do not modify `room_invitations` in 9D.2 design iterations; do not repurpose it for friend invitations.** Friend invitations get a new schema.

---

## 4. Product Interpretation

Phase 9D approved product decisions that are **binding** for this design and are not re-litigated:

1. Friend system = **friend request system** (Pending → Accepted), not a follow system. Blocking capability is supported by the model.
2. Invitation/request **expiry = 7 days**, not user-configurable for Beta.
3. **Rate limiting is REQUIRED**, server/DB-enforced. Initial values are conservative and subject to adjustment from abuse/usage evidence — they are NOT permanent product truth.
4. **Deleted sender** → outstanding invitations invalidated.
5. **Invitation identity** = sender public display name + public avatar only; never email or other private identifiers.
6. **Public share (9D.1) stays separate** from secure invitations (Section 10).

Correction-pass additions (binding):

7. **Blocking is a separate one-way boundary** (`user_blocks`), NOT a state inside `friend_relationships`. Blocking ends friendships; unblocking never auto-restores.
8. **The friend graph is private during Beta.** No public friend lists, no public friend counts as popularity signals, no public social graph.
9. **Email-based friend invitations are OUT of Beta.** `recipient_email` compatibility may be documented but is not an implementation dependency.
10. **Add Friend is a secure-link creation/copy action**, not a social-media composer (no free-form 500-char request message in Beta unless separately product-approved).
11. **Request vs invitation semantics are explicit**: known-user requests are direct; external/not-yet-registered persons arrive via a secure `/invite/[token]` link. A token is never authentication and never itself friendship.

This audit additionally interprets:

- A "friend request" is a directed, explicit relationship edge. It is **not** a discovery surface, not a "mutual connection" suggestion system, and must not drift Discora toward follower/social mechanics, gamification, or engagement optimization (Section 25).
- The relationship model is: directed request edges (`friend_requests`) → symmetric accepted edges (`friend_relationships`) + independent block edges (`user_blocks`).

---

## 5. Friend Request Model (mandated)

Statuses on `friend_requests`: `PENDING` → `ACCEPTED`; plus `DECLINED`, `REVOKED`, `EXPIRED` as terminal non-relationship states. **No `REQUESTED_BACK` state in Beta** (a new request is simply created in the reverse direction).

Three independent tables (mandated by correction pass):

`friend_requests` (request lifecycle only)
- `id uuid PK`
- `sender_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- `recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- `status text` in (`pending`, `accepted`, `declined`, `revoked`, `expired`)
- `created_at`, `responded_at`, `upserted_at`
- CHECK `sender_user_id <> recipient_user_id`
- Partial unique index: one outstanding (`pending`) request per (sender, recipient).

`friend_relationships` (**accepted friendships only**)
- `id uuid PK`
- `user_a_id`, `user_b_id` (CHECK `user_a_id < user_b_id`, unique pair) — canonical symmetric edge
- `established_at`
- Created ONLY when a friend request transitions to `accepted` (inside the accept RPC). **No status column; a row exists iff the two users are currently friends.**

`user_blocks` (independent one-way safety boundary)
- `id uuid PK`
- `blocker_user_id`, `blocked_user_id` (unique pair, CHECK not equal)
- `created_at`
- One-way; never symmetric; never a result of declining a request.

Why three tables (mandated): request lifecycle needs per-sender-per-recipient uniqueness with a status column and a response timestamp; the "friends" edge is symmetric and long-lived with no state; blocking is a separate safety boundary with its own lifecycle and audit. The earlier single-table-or-two-table ambiguity is resolved: **blocking is never represented inside `friend_relationships`.**

Request vs Invitation semantics (explicit, mandated):

- **KNOWN USER (A → B):** A creates a direct friend request. It lives in `friend_requests` as `pending`. B accepts → `accepted` + `friend_relationships` edge. No token involved.
- **EXTERNAL / NOT-YET-REGISTERED PERSON (A → secure invitation link):** A creates a `friend_invitation`; an opaque token is returned; the link `/invite/[token]` is copied/shared. B opens the link (preview only — no auth, no grant), then authenticates or registers. The server validates the token (active, unexpired, unconsumed, correct family) and **binds it to B's `auth.uid()`**, creating a `friend_requests` row in `pending`. B accepts → `accepted` + `friend_relationships` edge; the token is consumed.

**The token NEVER authenticates anyone and NEVER by itself constitutes friendship.** It is a lookup key that, after independent authentication and a normal pending→accepted transition, enables a request.

---

## 6. Blocking Model (mandated)

- Block is **one-way and explicit**: A blocks B → for A, B is invisible (content/streams filtered); B retains normal access but their UI never reveals they are blocked.
- **When A blocks B (all enforced atomically in `block_user`):**
  1. **Revoke pending requests between them** (both directions, `friend_requests` → `revoked`).
  2. **Remove/end the accepted friendship** (`friend_relationships` edge deleted; the pair is no longer friends).
  3. **Reject future friend requests/invitations between them** (create/accept RPCs check `user_blocks` both directions).
  4. **Apply the approved blocking visibility/security rules** (profile visibility, content filtering, room participation unaffected beyond visibility rules — see Section 19).
- **When A unblocks B:**
  - The friendship is **NOT automatically restored** (no edge re-created).
  - A **new friend request is required** to re-establish the relationship.
  - No notification to the blocked user of a block or unblock (enumeration safety).
- Blocking never deletes the blocked user's public contributions; it only enforces the blocker's visibility boundary. Content deletion remains a moderation function.

---

## 7. Friends Profile UX (mandated private)

The friend graph is **private during Beta**:

- The user sees their own friends under a **Friends** surface (own accounts only): Friends / Pending received / Pending sent / Blocked (each managed by the user; the Blocked list is self-visible only).
- **No public friend list and no public friend counts on `/u/[username]`.** The public profile does not display friend chips, friend totals, or any friendship-derived social signal.
- Requests inbox surface: in-app only for Beta (no email), rendered via a badge/section in the Friends surface. (Product decision D-6.)
- Empty and edge states: "No friends yet", "Request pending", "Declined", "Expired". Deleted users appear as "Deleted User" (never ghost profile links).

Anyone who believes a public graph is needed later must raise it as a **PRODUCT DECISION REQUIRED** — it is not silently implemented in Beta.

---

## 8. Add Friend UX (mandated — secure-link action, no composer)

Target Beta flow (user-visible):

```
[ Add Friend ]
      ↓
create secure pending friend request/invitation
      ↓
copy secure invitation link
      ↓
show "Request sent" / "Friend request link copied"
```

Concretely:

1. Logged-in user opens `/u/[username]` (or a friend-management surface) and clicks **Add Friend**.
2. The client calls `create_friend_request` (known user) or `create_friend_invitation` (external link). **No free-form text message composer in Beta.** No 500-character message field.
3. For a known user: request is created as `pending`; the UI shows **"Request sent"** and, when a secure link is applicable, copies it.
4. For an external person: an opaque token is created server-side; the client copies `/invite/{token}` (to clipboard → **"Friend request link copied"**) or hands it to the native share sheet.
5. Error cases render clearly (already friends, pending exists, blocked either way, deleted user, rate limit, self-request) — never a blank failure.

Logged-out visitor on a profile sees the normal public profile; **Add Friend** is shown but routes to `/login?redirectedFrom=/u/{username}` (existing pattern) — the action never fires unauthenticated.

A composer variant (i.e., free-form invitation/request messages) is **not** introduced unless a separate Product Decision explicitly justifies it.

---

## 9. Room Invite Flow (mandated ordering)

**HARD RULE:** Do NOT build new friend-aware room invitation functionality on top of the known-insecure `room_invitations` mechanism. The correct sequence is:

- **Step 1 — Friend core architecture** (friendship model, RPCs, RLS).
- **Step 2 — Friend UI.**
- **Step 3 — REMEDIATE existing `room_invitations`:** hash-at-rest, expiry, rate limiting, atomic consumption, preserved authorization.
- **Step 4 — ONLY AFTER remediation**, add friend-aware Room Invite integration (e.g., a picker that seeds `room_invitations` with a pre-bound `invited_user_id`).

Until Step 3 lands, the public share surface (9D.1) is the only sharing path that references private rooms indirectly; no friend-aware room invite ships.

Flow definitions (for after Step 4):

- **Public rooms:** no invite needed — share slug (Section 10).
- **Private debate rooms:** existing `room_invitations` flow (owner/participant creation → token/access-code → `accept_invitation`), plus the later friend-aware picker (owner/enabled participant picks a friend, seeding `room_invitations` with `invited_user_id` pre-bound, same SECURITY DEFINER create path).
- The room-invite token stays inside `room_invitations` (hashed post-remediation) and is never interchangeable with friend-invitation tokens.

Access-code path (`join_with_access_code`) is unchanged. No new room-invitation token generation is introduced in this design.

---

## 10. Public Share vs Secure Invite (separation + routing)

| Dimension | Public Share (9D.1, shipped) | Secure Invite (9D.2, design) |
|---|---|---|
| Content | Public discussion/debate/profile URLs | Friend connection (+ later, private-room entry) |
| Secret | None — slug is the address | Token |
| Auth | None required (public pages) | Required to accept/consume |
| Storage | No DB change | New hashed-token tables |
| Surface | `ShareButton` | Friends UI + `/invite/{token}` |
| Example URL | `/discussions/{slug}`, `/debates/{slug}`, `/u/{username}` | `/invite/{token}` |

Routing contract (mandated):

- **PUBLIC category:** `/discussions/[slug]`, `/debates/[slug]`, `/u/[username]` — no tokens, anon-readable via RLS, shareable by slug alone.
- **SECURE INVITATION category:** `/invite/[token]` — token-carrying, preview-only pre-auth, consumed on validated acceptance, `robots: noindex`, token never in OG/canonical/logs (*Section 14*).
- If a single `/invite/[token]` route must handle **multiple invitation types** (e.g., friend invitations now, room invitations later), the server must **securely resolve the invitation type** from the token (**never from URL-shape or client input**) and enforce the type's authorization path. **Token families must remain semantically distinct and non-interchangeable — a friend token can never act as a room token or vice versa.**
- **Token prefixes alone must NOT establish authorization.** A prefix is an optimization/dispatch hint only; authorization always comes from resolving the token hash against the correct family's table inside `SECURITY DEFINER` functions, plus recipient binding.

Separation rules:
- Share buttons never carry tokens.
- `/invite/{token}` is `robots: noindex`, emits **no** token in OG/canonical metadata, and does not auto-redirect.
- A friend-invitation page shows only sender display name + avatar (no email/private identifiers).

---

## 11. Friend Invitation Architecture (mandated)

`friend_invitations` table:

- `id`, `sender_user_id FK CASCADE`, `token_hash` (SHA-256 of opaque token), `recipient_user_id uuid NULL`, `recipient_email text NULL` (future-compat only — **OUT of Beta**, not an implementation dependency), `message text NULL` (only if a future Product Decision adds messages), `status ('active'|'consumed'|'revoked'|'expired')`, `consumed_at`, `consumed_by FK`, `revoked_at`, `expires_at NOT NULL`, timestamps.
- Type-safe uniqueness: **separate partial unique indexes** — one on `(sender_user_id, recipient_user_id) WHERE status='active'`, one on `(sender_user_id, lower(recipient_email)) WHERE status='active'`. **No COALESCE-based index.**
- Identity CHECK: exactly one of `recipient_user_id`/`recipient_email`.
- Partial index `(token_hash) WHERE status='active'`; partial index `(expires_at) WHERE status='active'` for sweeps.
- `sender_user_id` FK `ON DELETE CASCADE` (enforces the approved "deleted sender invalidates" decision).

Beta scope (mandated):
- **Known-user path only** (recipient_user_id bound) via direct `create_friend_request`; **or** external path where `recipient_user_id` is not yet known and is bound at `/invite/[token]` resolution time after registration.
- **Email delivery is NOT part of Beta.** `recipient_email` may remain in the design for compatibility but must not appear in the active Beta implementation path.

Lifecycle RPCs (SECURITY DEFINER, pinned `search_path`): `create_friend_invitation` (returns opaque token once), `revoke_friend_invitation`, `resolve_friend_invitation` (validates + binds to authenticated user + creates pending request + consumes), `expire_friend_invitations` (sweep). See Section 13 for token details and Section 17 for API shape.

---

## 12. Room Invitation Architecture (remediation — prerequisite) (mandated ordering)

The existing `room_invitations` mechanism is remediated **in place, before** any friend-aware integration:

- Add `expires_at` (default `created_at + '7 days'` for new rows); legacy `active` rows treated as expiring 7 days post-migration (lazy check in `accept_invitation`).
- Add `token_hash` (SHA-256) populated at creation; **atomic consumption**: `UPDATE ... SET status='accepted', accepted_at=now() WHERE id=$1 AND status='active' AND expires_at>now() RETURNING id` in `accept_invitation` — zero rows → generic rejection.
- Add rate limiting on acceptance via an `access_code_failures`-style counter table (discriminator column for `invite` vs `access_code`).
- **Preserve authorization**: owner/participant creation policies, owner revoke, recipient binding, removed-participant denial for private rooms, archived-room denial — all unchanged in semantics.
- Grant hygiene: prefer SECURITY DEFINER RPCs for create/revoke to match friend-system posture (optional but recommended); never broaden grants.

Nothing in this remediation ships until it is a distinct, sequence-gated migration (Section 32, 9D.2C). Friend-aware room invite integration is gated to **after** remediation (9D.2D).

---

## 13. Token Architecture (mandated)

Opaque tokens are lookups, **never credentials** (Phase 9D §9 principle preserved), and **never** authorization by presence alone.

- Generation: `encode(gen_random_bytes(32), 'hex')` (256-bit). Prefix for friend invitations (e.g., `frinv_...`) is a **dispatch hint only**.
- Storage: only `sha256(token)` in DB. Per-row salt recommended as defense-in-depth.
- Transport: opaque token in URL path `/invite/{token}` only; never in query strings, logs, analytics, or OG metadata; scrubbed/handled via documented deep-link behavior (Section 14).
- Resolution: the server resolves the token **by family** — hash the incoming token and look up the correct table (friend family now; room family later). **Prefixes alone grant nothing.** A failed family lookup yields the same generic rejection as any invalid token (no enumeration).
- Consumption (friend): atomic `UPDATE ... SET status='consumed', consumed_at=now(), consumed_by=auth.uid() WHERE token_hash=digest($token,'sha256') AND status='active' AND expires_at>now() RETURNING id`. Zero rows → already consumed/revoked/expired → generic `invalid_invitation`.
- Replay: rejected by the atomic status guard. Two tabs: first wins.
- Brute force: infeasible at 256-bit; rate-limit token-validation attempts per IP anyway (Section 18) and return generic errors.
- Families are **non-interchangeable**: a friend token can never be used as a room token, and no cross-family lookup is ever performed.

---

## 14. Auth / Deep-Link Architecture (mandated routing)

- New route `/invite/[token]` (e.g., `src/app/invite/[token]/page.tsx`), server component that:
  - resolves the **invitation family** server-side from the token (Section 10, Section 13) and renders the correct preview (friend preview now),
  - renders preview from a safe lookup (sender display name + avatar) with **no token and no private data** in RLS terms,
  - emits `robots: { index: false }` and canonical to `/invite/[token]` **without** the token in OG (Phase 9D §17),
  - never auto-redirects.
- Post-auth return: reuse `redirectedFrom`; `getSafeRedirectUrl()` guards all targets. OAuth path: `redirectTo: /auth/callback?next=/invite/{token}` — the token travels in the `next` path segment and is validated exactly like any internal path.
- Deep-link query params on existing pages (`?invitation=`, `?accessCode=`, etc.) keep current scrubbing behavior; friend invite uses the path segment instead to avoid query-log leakage.
- Wrong-user handling is explicit: `resolve_friend_invitation` binds `consumed_by` to `auth.uid()` and validates the recipient (bound `recipient_user_id` or the newly-registered user) — never accepts "whoever opens the link" (Section 15).

---

## 15. Wrong-User Handling

| Scenario | Behavior |
|---|---|
| Logged-out user opens `/invite/[token]` | Preview only; CTA → login/register with `redirectedFrom=/invite/[token]` |
| Logged-in user (not the bound recipient) opens token | `invalid_invitation` generic rejection; no existence leak |
| Recipient logged into a **different** account | Rejection (recipient binding mismatch) with clear "sign in as the invited address" message (a UX message, not an enumeration leak) |
| Recipient already friends | Rejection `already_friends` |
| Recipient blocked sender | Rejection `blocked_sender` (Section 6) |
| Sender blocked recipient | Rejection `blocked_recipient` |
| Sender deleted | Rejection `sender_deleted` (FK CASCADE removes row; generic path) |
| Expired / consumed / revoked | Single generic `invalid_invitation` |
| Wrong token family for the route | Generic `invalid_invitation` (family resolution failure) |
| Two tabs | Atomic consumption; second gets generic rejection |

Principle: an invitation **never authenticates** anyone and never grants permissions on its own. A token is a lookup key only.

---

## 16. RLS Architecture (mandated)

Discora discipline (31A baseline): every user-facing mutation hardened, no raw identity columns exposed, SECURITY DEFINER views for content, `is_active_user()` gates.

`friend_requests`:
- SELECT: `sender_user_id = auth.uid() OR recipient_user_id = auth.uid()`.
- INSERT/UPDATE/DELETE: **revoked**; lifecycle only via SECURITY DEFINER RPCs.
- FK `auth.users` both sides `ON DELETE CASCADE`.
- No policy may bypass `is_active_user()`; RPCs check it explicitly.

`friend_relationships` (**accepted only, no status**):
- SELECT: `user_a_id = auth.uid() OR user_b_id = auth.uid()` (**private graph** — no anon/other-user visibility).
- INSERT/UPDATE/DELETE: **revoked** from clients; created by `accept_friend_request` (SECURITY DEFINER), deleted by `block_user`/deletion (SECURITY DEFINER).

`user_blocks`:
- SELECT: `blocker_user_id = auth.uid()` (blocked users never see that they are blocked).
- Mutations: revoked; RPC-only.

`friend_invitations`:
- SELECT: sender sees own; recipient sees via bound `recipient_user_id = auth.uid()` (Beta has no email identity path — `recipient_email` is future-compat only).
- Mutations: revoked; RPC-only.
- `friend_invitation_preview` SECURITY DEFINER view returns sender `display_name` + `avatar_url` only; anon never reads token/email/id columns.

All SECURITY DEFINER functions `SET search_path = public`, explicit grants (`revoke from public, anon; grant ... to authenticated`), `is_active_user()` gate on every write RPC (sender and recipient). **No policy may call client-writable tables recursively** (the established pitfall documented in `202606220001` §4 policy history).

---

## 17. RPC/API Architecture (mandated stream)

| RPC | Purpose | Guards |
|---|---|---|
| `create_friend_request(recipient_id uuid)` | Known-user directed request | auth, `is_active_user()`, target active+exists, no self, no block either way, no pending dup (upsert window per D-5), rate limit |
| `accept_friend_request(request_id uuid)` | Establish friendship **edge** | auth, request `pending` + not expired, matching recipient, no block, atomic status flip + relationship insert in one transaction |
| `decline_friend_request(request_id uuid)` | Terminal decline | matching recipient |
| `revoke_friend_request(request_id uuid)` | Sender withdraw | matching sender |
| `create_friend_invitation(...)` | External secure link (opaque hashed token) | auth, `is_active_user()`, rate limit; returns token once |
| `resolve_friend_invitation(token text)` | Validate + bind to `auth.uid()` + create pending request + consume | family resolution, recipient binding, atomic consumption |
| `revoke_friend_invitation(...)` | Sender withdraw | matching sender |
| `block_user(target_id uuid)` | Enforce one-way boundary + revoke pending both ways + **remove accepted friendship** | auth, `is_active_user()`, no self-block |
| `unblock_user(target_id uuid)` | Remove block; **no friendship restoration** | auth |
| `list_friends()` / `list_friend_requests()` | Read helpers (own data only) | RLS-backed, thin |
| `expire_friend_invitations()` / `expire_friend_requests()` | Sweep (pg_cron or scheduled job / lazy) | SECURITY DEFINER, idempotent |

All RPCs: `SECURITY DEFINER`, `SET search_path = public`, explicit grants, no `SET ROLE`, no dynamic SQL with user input, token values returned **only** at the single create moment. `block_user` performs its three effects (revoke pending, delete friendship edge, insert block) in **one transaction** so no race window exists.

---

## 18. Rate Limiting / Abuse Model (mandated posture)

Requirement: rate limiting is REQUIRED and **server/DB-enforced**. Values are **conservative initial settings**, not permanent product truth; each limit carries a documented abuse rationale; all limits are **tunable configuration** adjusted from actual abuse/usage evidence — no claims of mathematically optimal thresholds.

| Action | Conservative initial limit (tunable) | Abuse rationale serving as basis |
|---|---|---|
| Outgoing known-user friend requests | 15/hour, 40/day per user | Above realistic human action rate; caps batch handle-harvesting |
| New external invitations (`create_friend_invitation`) | 10/hour per user | Link-carrying invitations are higher-value; caps bulk link generation |
| Pending requests received per recipient | 50 | Bounded inbox; prevents nuisance flooding |
| Token validation attempts | 10/IP/5 minutes | Mirrors `access_code_failures` philosophy; defense-in-depth at 256-bit entropy |
| `resolve_friend_invitation` (success or generic failure) | 5/IP/5 minutes | Caps guessing loops |
| Room `accept_invitation` (added in remediation) | 5/user/15 minutes (tunable) | Matches access-code posture |

Enforcement: DB-level counters (a counter/failures table mirroring `access_code_failures` with a discriminator column) checked inside RPCs; **no reliance on client-side throttling**. No application-level middleware rate limiter exists today; adding one is out of scope for friend Beta if DB enforcement is present. Thresholds are a **config/constant with documented rationale**, revisitable after launch (product decision D-8).

---

## 19. Blocking Semantics (mandated)

- A block is permanent until the blocker unblocks; no expiry. No auto-block from declining.
- Effective immediately (atomic in `block_user`): pending requests both directions → `revoked`; accepted friendship edge → **removed**; future requests/invitations in both directions → rejected.
- Unblock: removes the block edge; **does not** restore friendship; a new request is required to reconnect.
- Visibility: the blocked user cannot view the blocker's profile, rooms, or send messages/requests (RLS/application filter). The blocker's UI excludes the blocked user's content/streams.
- All block writes are audit-logged (Section 30) and reversible only by the blocker.
- Anti-manipulation: blocking never deletes the blocked user's public contributions; it only enforces the blocker's visibility boundary. Content deletion remains a moderation function, not a personal block function.

---

## 20. Deletion Integration

Facts verified this audit:
- **No account-deletion orchestration exists** (no RPC/function; Settings button disabled). `is_deleted`, `retired_handles`, "Deleted User" attribution, and middleware fail-closed handling exist.
- Design intent (legal pages + 9C3R spec) is self-service deletion; **not implemented**.

Recommended integration:
- All friend tables use FKs `REFERENCES auth.users(id) ON DELETE CASCADE`, so friend edges, requests, and invitations dissolve automatically **at the DB level** when the eventual deletion orchestration removes a user row.
- `retired_handles` prevents handle reuse; deleted users render as "Deleted User" everywhere friend surfaces would show them.
- While deletion orchestration is unimplemented, `is_deleted = true` is the practical trigger: RPCs treat `is_deleted` senders as invalid (request/invitation rejection) and `is_deleted` recipients as un-friendable. This is a **hard requirement of the 9D decision** ("deleted sender invalidates") and is implementable without the orchestration.
- Block records against a deleted user remain for audit but are inert (no live edges).

---

## 21. Moderation / Admin

Existing surface: `moderation_flags`, `resolve_moderation_flag`, `moderation_queue` view, moderator settings dashboard, owner-only `/admin`.

Recommended for friend system:
- Abuse reports on friend requests/invitations reuse `submit_moderation_flag` with new target types (request id / invitation token id) — no new moderation admin surface required for Beta.
- Invitation spam patterns (bursts of `create_friend_request` across many recipients) are visible through audit columns + counters (Section 30); a moderator/owner tool to bulk-revoke an abuser's pending requests is a later phase (9D.2F).
- No moderator action auto-reveals whether a user is blocked (block visibility is private to the blocker).

---

## 22. Notifications

Facts: **no notification system exists.** Realtime is used only for room typing broadcast (`use-typing-indicator.ts`); `AuthProvider` uses polling-friendly `onAuthStateChange`/focus listeners.

Recommendation: Beta ships with an **in-app request inbox** (badge on the Friends surface) rather than a notification subsystem. TanStack Query invalidation after mutations, on-window-focus refetch, and a lightweight badge derived from `list_friend_requests()` provide the UX without new infrastructure.

**Email is OUT of Beta** (mandated). No transactional email provider exists in this repo; email-based friend invitations are not an implementation dependency. (Product decision D-6/D-7.)

---

## 23. Realtime / Cache

- Recommended: **no realtime** for friend/relationships in Beta. Friend state churn is low-frequency; refetch-on-focus + post-mutation invalidation via TanStack Query is sufficient and matches existing patterns.
- No "friend now" presence indicator (would risk social-pressure mechanics) — explicitly out of scope.
- Cache security: friend data is per-user; TanStack query keys include the authenticated user id; list-shaped cached data is never rendered for a different session.

---

## 24. Accessibility

- Add Friend / Accept / Decline / Block / Unblock controls are real buttons with visible labels, `aria-label` where icon-only, focus-visible rings, keyboard operable. **No composer to build** (mandated UX is link creation/copy).
- Copy-link flow: toast announcements ("Request sent", "Friend request link copied") are rendered as live-region text so screen readers announce results.
- Friends list and chips: screen-reader announcement of states ("Request pending", "Now friends", "Blocked").
- `/invite/[token]` page: static accessible preview; CTA focus on load; no autoplay/auto-advance; reduced-motion safe.
- Colors/contrast and focus management follow existing Discora UI conventions (Tailwind tokens, existing dialog patterns if reused).

---

## 25. UX Architecture (incl. product-philosophy check)

- Add Friend in the profile header actions (next to Share) — but only visible/functional as the secure-link action described in Section 8. **No composer, no free-text message.**
- Friends surface is **private** (own data only): Friends / Pending received / Pending sent / Blocked.
- Deep-link: `/invite/[token]` preview + login interception via `redirectedFrom` (Sections 8, 14).
- Guidance: "Add a friend to invite them to your private rooms in a later phase" — the friend edge is enabled first; room-invite integration follows remediation (Section 9).

**Product-philosophy check (mandated):** the revised architecture is verified to avoid: followers/following (never introduced), popularity metrics (no public counts), public friend counts as social status (friend graph is private), friend leaderboards (no ranking surfaces), social ranking (none), gamified invitations (invite is a bare link + copy toast), engagement rewards (none), viral mechanics (no sharing thresholds, no streaks, no nudges). **Friend functionality exists only to facilitate meaningful participation in Discora conversations** — it enables inviting real people into rooms and maintaining direct, request-gated relationships. Nothing in the design ties friendships to visibility, ranking, or engagement scoring.

---

## 26. Threat Model (consistent with mandated model)

| Threat | Vector | Mitigation | Residual |
|---|---|---|---|
| Token theft from URL/logs/history | shared link, referrers | token never in query/OG/logs; hashed at rest; family resolution | Low |
| Token replay | re-share consumed/revoked link | atomic status guard | None |
| Token brute-force | guess 256-bit | entropy + per-IP validation caps + generic errors | Negligible |
| Cross-family token misuse | friend token used as room token or vice versa | family resolution in SECURITY DEFINER; prefixes never authorize | None |
| DB compromise | read of tables | SHA-256 hash-at-rest (salt optional) | Low |
| Invitation spam / bulk harvesting | automated create | DB counters, pending inbox cap, expired senders rejected | Low |
| Harassment via repeated requests | same recipient many senders | pending inbox cap, block semantics, moderation flags | Low |
| Account confusion (accept as wrong user) | recipient + shared device | recipient binding + explicit "sign in as invited account" UX | Low |
| IDOR on request ids | guessed UUID request_id | id surfaces only via owned lists; RPC validates recipient/sender binding | None |
| Open redirect from invite page | crafted `next` | `getSafeRedirectUrl()` only internal | None |
| Cross-account data leak (email) | policy error on `friend_invitations` | Beta has no email identity path; anon never reads invitation rows | Low |
| Blocked-user harassment persistence | blocked user re-requesting | block checked in both directions on create/accept; edges removed atomically | None |
| Moderation evasion via deletion | abuser deletes + recreates | retired_handles + audit columns + moderation history retained | Medium (content-linked, not friend-bound) |

---

## 27. Security Test Matrix (future, consistent)

| ID | Test | Expected |
|---|---|---|
| FRIEND-01 | Create friend request to self | Rejected |
| FRIEND-02 | Create friend request to deleted user | Rejected |
| FRIEND-03 | Duplicate pending request same direction | Upsert/no-op, one row |
| FRIEND-04 | Accept as non-recipient | Rejected |
| FRIEND-05 | Accept after revocation | Rejected |
| FRIEND-06 | Accept after expiry (>7d) | Rejected |
| FRIEND-07 | Concurrent accept two tabs | One edge; second generic rejected |
| FRIEND-08 | Blocking revokes pending both directions | Both `revoked` |
| FRIEND-09 | Blocking **removes accepted friendship** | `friend_relationships` row deleted |
| FRIEND-10 | Unblock does **not** restore friendship | No edge re-created; re-request required |
| FRIEND-11 | Blocked user cannot send request in either direction | Rejected |
| FRIEND-12 | Block does not delete blocked user's public content | Content remains |
| FRIEND-13 | Deleted sender's pending requests invalidated | RPC rejects; FK cascade when orchestration ships |
| FRIEND-14 | Request rate cap (15/hr) | Enforced at DB |
| FRIEND-15 | Public profile shows **no** friend list/count | Graph private during Beta |
| INVITE-01 | `/invite/[token]` renders preview without auth | 200 preview; no token in HTML |
| INVITE-02 | `/invite/[token]` robots noindex, no OG token | Verified metadata |
| INVITE-03 | Consume valid token → pending request created + token consumed | Single-use |
| INVITE-04 | Replay consumed token | Generic `invalid_invitation` |
| INVITE-05 | Expired token | Generic rejection |
| INVITE-06 | Token bound to a user accepted by another user | Rejected |
| INVITE-07 | Friend token used against room route/family | Generic rejection (family mismatch) |
| INVITE-08 | Prefix present but hash invalid | Generic rejection (prefix grants nothing) |
| INVITE-09 | OAuth sign-in after opening invite returns to invite page | Redirect via `getSafeRedirectUrl` |
| INVITE-10 | Token never in query-string/log/referrer | Static + integration check |
| RLS-01 | anon SELECT on friend tables | Empty/no rows |
| RLS-02 | authenticated SELECT others' relationships | Empty |
| RLS-03 | Direct INSERT on friend tables | Denied (revoked) |
| RLS-04 | Recipient cannot see blocked-user rows; blocker sees own only | Policy-verified |
| AUTH-01 | Logged-out Add Friend click → `/login?redirectedFrom=` | Redirect only |
| AUTH-02 | Invitation never authenticates sender | Token is lookup only |
| ABUSE-01 | >15 known-user requests/hr | Blocked by DB counter |
| ABUSE-02 | >10 external invitation creations/hr | Blocked |
| ABUSE-03 | >10 token validations/IP/5min | Blocked/cooldown |
| DELETION-01 | `is_deleted` sender request acceptance | Rejected |
| DELETION-02 | Friend surfaces render "Deleted User", no profile link | Verified |

---

## 28. Migration Strategy (mandated ordering)

- All new objects land in **new, sequential migrations** under `supabase/migrations/`; no already-applied migration is edited (binding rule). Production apply is a separate explicit step, **not claimed here**.
- Recommended split (ordered; friend-aware room integration strictly after remediation):
  - M1: `friend_requests`, `friend_relationships` (accepted-only, no status), `user_blocks` + policies + helper functions (single transaction, dependency-ordered).
  - M2: `friend_invitations` + token RPCs + sweep RPCs + `/invite` preview view (no `recipient_email` in active Beta path).
  - M3: **`room_invitations` remediation** — `token_hash`, `expires_at`, atomic consumption in `accept_invitation`, acceptance rate limiting, preserved authorization. **(gates 9D.2D)**
  - M4 (only after M3): friend-aware room-invite integration (picker seeding `room_invitations`).
- Each migration restates RLS explicitly, pins `search_path`, and is reviewed (owner + grants) before apply.
- Indexes partial and status-scoped; no hot-table rewrite.

---

## 29. Rollback Strategy

- All 9D.2 additions are **additive** until M3: existing tables, RPCs, RLS, and routes are untouched.
- Rollback = remove new objects in reverse order (M4 → M3 → M2 → M1), then re-run revocations; existing `room_invitations` semantics are preserved throughout because M3 keeps legacy rows readable (hash column added, plaintext rows lazily converted).
- Client feature flag (`FEATURE_FRIENDS`) gates the Friends UI; disabling hides surfaces while DB objects remain dormant.
- `/invite` route removal is safe (no existing route conflict — verified).
- No destructive DDL ever ships in the rollback plan.

---

## 30. Observability / Audit

- Every friend mutation records `created_by`/`auth.uid()` and timestamps; `friend_requests` and `user_blocks` keep immutable audit columns.
- Abuse counters (`request_attempts`, `validation_failures`) follow the `access_code_failures` pattern and are queryable by owner/moderator.
- Tokens never logged: RPCs accept the opaque token and store only the hash; application logs forbid token echo.
- Moderation flags on friend targets reuse `submit_moderation_flag` with target-type classification.
- Block/unblock events are auditable (who, when, reversible-by-blocker-only).

---

## 31. Product Decisions Required

The following are NOT my choices to make. Each is presented with options and a recommendation. Mandated corrections (§4) resolve D-1, D-2, D-3, D-4, and D-7 below; they are listed as **RESOLVED BY CORRECTION** for traceability.

### D-1 Friend edge storage — **RESOLVED BY CORRECTION**
- **Mandated:** three independent tables (`friend_requests`, `friend_relationships` accepted-only, `user_blocks`). Blocking is NEVER a state inside `friend_relationships`. No option remains.

### D-2 Block vs existing friendship — **RESOLVED BY CORRECTION**
- **Mandated:** blocking **removes/ends** the accepted friendship; unblock does NOT restore it; a new request is required to reconnect.

### D-3 Blocking sender with outstanding items to blocker — **RESOLVED BY CORRECTION**
- **Mandated:** when A blocks B, pending requests between them are revoked (both directions) and future requests/invitations rejected.

### D-4 Friends list visibility — **RESOLVED BY CORRECTION**
- **Mandated:** friend graph is **private during Beta**. No public friend list, no public friend counts as popularity signals. Any future public-graph model requires a separate PRODUCT DECISION.

### D-5 Re-request after decline — OPEN
- A) Allow re-request after a 7-day cooldown (upsert replaces old declined row) — recommended
- B) Decline is permanent until block/unblock
- **REASON** A: decline is a soft signal; a permanent lock against re-approaching invites griefing (e.g., block-by-else). Cooldown enforced by the RPC (upsert window).
- **RECOMMENDATION:** A.

### D-6 Notification surface for friend requests — OPEN
- A) In-app only (Friends-tab badge + widget), no email — recommended (email is out of Beta regardless)
- B) None (user must visit Friends surface)
- **REASON** A: no notification infrastructure exists; in-app badge preserves the invite UX with zero infra. Email delivery is out of scope per correction.
- **RECOMMENDATION:** A.

### D-7 Email-based invitation path — **RESOLVED BY CORRECTION**
- **Mandated:** email-based friend invitations are OUT of Beta. `recipient_email` stays out of the active Beta implementation; compatibility may be documented only. No implementation dependency.

### D-8 Rate-limit thresholds — OPEN (configuration, not truth)
- A) Ship conservative initial values (Section 18 candidate) behind documented rationale and tunable configuration; validate and adjust with abuse/usage evidence after launch — recommended
- B) Ship no numeric limits (violates the "rate limiting REQUIRED" mandate) | C) Ship locked-in values declared permanent
- **REASON** A: satisfies the mandate while honoring "do not present candidate values as permanent product truth" and "do not invent mathematically optimal thresholds."
- **RECOMMENDATION:** A.

### D-9 Expiry sweep mechanics — OPEN
- A) Lazy rollover in RPCs + daily sweep RPC (pg_cron or scheduled job) — recommended
- B) Lazy only
- **REASON** A: lazy-only misclassifies `expired` if no one touches the row; a daily sweep keeps the mailbox honest without load.
- **RECOMMENDATION:** A.

**Post-correction OPEN decisions:** D-5, D-6, D-8 (configuration approach), D-9. All four are non-blocking configuration/polish decisions; none gates the architecture.

---

## 32. Implementation Phasing (mandated ordering)

Recommended evaluation — **friend-aware room invite integration is gated behind remediation**:

- **9D.2A — Friend core architecture:** M1. `friend_requests`, `friend_relationships`, `user_blocks`, policies, RPCs (create/accept/decline/revoke/block/unblock + counters). Ships the request lifecycle and private friend graph.
- **9D.2B — Friend UI:** M2 partial (known-user). Add Friend (secure-link action, no composer), Friends surface (private), request inbox badge, block/unblock controls, `/invite/[token]` preview + family resolution.
- **9D.2C — REMEDIATE `room_invitations` (gating):** M3. hash-at-rest, `expires_at`, atomic consumption, acceptance rate limiting, preserved authorization. **Nothing friend-aware ships before this lands.**
- **9D.2D — Friend-aware Room Invite integration:** M4, ONLY AFTER M3. Friend picker seeding `room_invitations` with pre-bound recipient; no new token design.
- **9D.2E — Abuse hardening:** pilot threshold tuning (D-8), sweep jobs (D-9), generic-error verification, abuse counters dashboards for owner.
- **9D.2F — Deletion + moderation/observability:** wire `is_deleted` sender/recipient rejection paths; FK-cascade verification; bulk-revoke tooling; moderation flag target types; audit dashboards; token-log linting.

Ordering rationale: 9D.2A → B delivers the user-visible friend system (the mandated Beta target). 9D.2C is a **hard prerequisite** for 9D.2D by explicit rule — the insecure `room_invitations` is never used as a base for new friend-aware functionality. D/E/F harden after core ships. All blocks are additive and individually revertible (Section 29).

---

## 33. Final Verdict

**B. READY WITH PRODUCT DECISIONS.**

- The architecture is implementable with existing platform primitives; no fundamental blocker was found.
- Verdict stays B (not A) because the required product approvals are still open in Section 31 (D-5, D-6, D-8 configuration, D-9) and because `room_invitations` remediation (9D.2C) is scheduled work, not yet done.
- Verdict is not C because none of the open items blocks the architecture; the mandated corrections are incorporated.
- **Highest-priority security posture for implementation:** never store friend tokens in plaintext (hash at rest — avoid repeating the `room_invitations` mistake), never make an invitation an authentication credential or a grant by itself, enforce recipient binding, enforce DB-level rate limits, keep blocking fully separate from friendship state, keep the friend graph private, and gate all friend-aware room-invite work behind remediation.
- **Mandated sequencing reminder:** friend core → friend UI → **remediate `room_invitations`** → only then friend-aware room invites.

**Boundary confirmation:** This document makes no production changes, claims no production migration was applied, and performs no mutations. It is design + audit only. This document does not implement, and no source code, database, migration, RLS, auth, or production change was made in this correction pass.