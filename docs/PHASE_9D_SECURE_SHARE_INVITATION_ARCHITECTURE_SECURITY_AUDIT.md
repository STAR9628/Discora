# PHASE 9D — SECURE SHARE & INVITATION ARCHITECTURE + SECURITY AUDIT

**Date:** 2026-09-14
**Status:** AUDIT + DESIGN RECOMMENDATION ONLY — NO IMPLEMENTATION
**Verdict:** B. READY WITH OPEN PRODUCT DECISIONS

---

## PRODUCT OWNER REVIEW — 2026-09-14 (SUPERSEDING CORRECTIONS)

Reviewed by Product Owner. Corrections recorded and incorporated below:

1. **Public sharing is NOT "zero security risk".** Correct wording: *"Low-risk, no database/authentication changes, but still requires normal authorization/privacy/metadata verification."* Applies to Sections 30 and 33.
2. **Do NOT use the proposed friend-invitation unique index**: `COALESCE(recipient_user_id, recipient_email)` — invalid because `recipient_user_id` is UUID and `recipient_email` is text. The future friend-invitation schema must use type-safe uniqueness/indexing, likely separate partial unique rules for user-recipient and normalized email-recipient. Correction applied to Section 20.
3. **`room_invitations.invitation_token` plaintext storage is an EXISTING SECURITY REMEDIATION ITEM.** Do not modify `room_invitations` in Phase 9D.1. Do not repurpose it for friend invitations.
4. **Invitation token ≠ authentication credential.** Preserved and reinforced throughout this document (Sections 9, 11, 12).

Product decisions for the FUTURE friend invitation system (NOT implemented in Phase 9D.1):
- **Friend system:** Friend request system (Pending → Accepted), with blocking capability supported by the relationship model.
- **Invitation expiry:** 7 days, not user-configurable for Beta.
- **Rate limiting:** Required; exact threshold NOT a product decision yet — validate abuse model and tune during the friend-invitation security phase.
- **Deleted sender:** Outstanding friend invitations invalidated when the sender account is deleted.
- **Invitation identity:** Show sender public display name + public avatar only. Never expose email/private profile data.

---

## 1. Executive Summary

Discora's Secure Share & Invitation feature is approved as a product direction but requires architecture and security design before implementation. This audit inspects the current codebase (routing, auth, profiles, discussions, debates, RLS, security functions, existing invitation system) and recommends a secure architecture for sharing public content and friend invitations.

**Key findings:**

- **No social sharing exists today.** No share buttons, no `navigator.share()`, no OG metadata beyond root layout, no canonical URLs.
- **A private debate invitation system already exists** with a full lifecycle: token generation, email-based links, URL scrubbing, and access gates. This system has security gaps that must be addressed before reuse.
- **The existing token system stores tokens in plaintext** in `room_invitations.invitation_token` — not hashed. This is the most significant security finding.
- **Profiles, discussions, and debates are already slug-routed** (`/u/[username]`, `/discussions/[slug]`, `/debates/[slug]`) — these URLs are safe to expose as share links without any token mechanism.
- **RLS enforces public/private visibility** at the database level via `has_room_access()`. Public content is already accessible without authentication.
- **No friend/relationship system exists.** This is a net-new feature requiring careful security design.
- **OpenGraph metadata is minimal** — only root layout and about page define it. Shared links will need proper OG metadata.
- **Rate limiting is server-side only** (Supabase RPC errors). No application-level rate limiting exists.

**Verdict: B — READY WITH OPEN PRODUCT DECISIONS.** The architecture is sound but 5 product decisions remain unresolved before implementation can begin.

---

## 2. Current Routing Architecture

### Route Map

| Category | Routes | Auth Required |
|---|---|---|
| Homepage | `/` | No |
| About | `/about` | No |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | No |
| OAuth Callback | `/auth/callback` (route handler) | N/A |
| Discussions | `/discussions`, `/discussions/create`, `/discussions/[slug]`, `/discussions/[slug]/claims`, `/discussions/[slug]/evidence`, `/discussions/[slug]/questions`, `/discussions/[slug]/contributions`, `/discussions/[slug]/understanding`, `/discussions/[slug]/sources` | Create: Yes. Others: No |
| Debates | `/debates`, `/debates/create`, `/debates/[slug]`, `/debates/[slug]/arguments`, `/debates/[slug]/claims`, `/debates/[slug]/evidence`, `/debates/[slug]/questions`, `/debates/[slug]/contributions`, `/debates/[slug]/understanding`, `/debates/[slug]/sources` | Create: Yes. Others: No |
| Inquiries | `/inquiries/[id]` | No |
| Profiles | `/u/[username]` | No |
| Settings | `/settings`, `/settings/profile`, `/settings/moderation` | Yes |
| Admin | `/admin` | Yes (owner only) |
| Search | `/search` | No |
| Legal | `/terms`, `/privacy`, `/guidelines`, `/grievance` | No |
| Saved | `/saved` | Yes |

### Dynamic Route Patterns

- `[slug]` — used for both discussions and debates (shared namespace)
- `[id]` — used for standalone inquiries (UUID)
- `[username]` — used for public profiles
- No catch-all routes exist

### Key Architectural Fact

All public content pages (`/discussions/[slug]`, `/debates/[slug]`, `/u/[username]`) already render without authentication. The slug IS the public reference. No tokens are needed for public share links.

---

## 3. Current Auth Architecture

### Auth Providers
- **Email/password** — `supabase.auth.signUp()` + email verification + `signInWithPassword()`
- **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: "google" })` with `prompt: "select_account"`

### Session Management
- **Server-side**: Middleware calls `supabase.auth.getUser()` on every request, refreshes session cookies
- **Client-side**: `AuthProvider` subscribes to `onAuthStateChange()`, `window.focus` listener for cross-tab sync
- **Cookie-based**: Supabase `sb-*` and `*-auth-token*` cookies, never placed in URLs

### Auth Middleware
- Protected routes: `/settings/*`, `/discussions/create`, `/debates/create`, `/admin/*`
- Profile-onboarding redirect: authenticated users without a profile row → `/settings/profile`
- Deleted-profile fail-closed: `is_deleted = true` → strip all auth cookies, redirect to `/`
- Admin path: requires `DISCORA_OWNER_USER_ID` match, else rewritten to `/404`

### OAuth Callback
- Route handler at `/auth/callback`
- Extracts `code` query param, validates `next` target via `getSafeRedirectUrl()`
- Exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
- Sets cookies on redirect response

### Safe Redirect
- `getSafeRedirectUrl(target, fallback)` validates:
  - Must start with `/` (not `//` or `/\`)
  - No control characters
  - Origin must resolve to localhost
  - Preserves pathname + search + hash
- Used consistently across login, OAuth callback, and auth service

---

## 4. Current Profile/Discussion/Debate Architecture

### Profiles
- **Route**: `/u/[username]` (server component, public)
- **Data**: username, display_name, bio, avatar_url, joined_at, founding_member, participation stats
- **Private**: email (never stored in profiles), default_identity_mode, user preferences
- **Deleted users**: `is_deleted = true`, page returns 404, "Deleted User" pseudonym on retained content
- **Username constraints**: unique, lowercase, 3-30 chars, regex `^[a-z0-9][a-z0-9_-]{2,29}$`

### Discussions
- **Route**: `/discussions/[slug]` + section sub-routes
- **Model**: Room + Discussion (1:1), slug-based routing
- **Visibility**: `public | private` (on rooms table)
- **Status**: `open | inactive | archived`
- **Content**: messages, claims, evidence, questions, sources — all room-scoped
- **Public access**: Any user (including anon) can read public non-archived rooms via RLS

### Debates
- **Route**: `/debates/[slug]` + section sub-routes
- **Model**: Room + Debate (1:1), slug-based routing
- **Visibility**: `public | private`
- **Status**: `open | inactive | archived`
- **Content**: claims (proposition/opposition), evidence, inquiries, arguments
- **Private access**: Invitation tokens, access codes, owner/participant management
- **Participation**: `debate_participants` table with side (proposition/opposition/neutral)

### Slugs
- Generated server-side by `slugify()` + `auto_slugify_trigger` (lowercase, non-alphanumerics→`-`, collisions→`-N`)
- Unique across rooms (shared namespace for discussions and debates)
- Client never passes slug on insert — created via RPC and read back
- Used as the canonical URL identifier

---

## 5. Current Relationship/Friend Architecture

**No friend, relationship, follow, or connection system exists.**

Grep results:
- "friend" — 0 matches in src/
- "relationship" — only claim-to-claim structural relationships
- "follow" — only legal text and robots metadata
- "connection" — only network-offline toast

This is a net-new feature. The existing `room_invitations` system is scoped exclusively to private debate access and should NOT be repurposed for friend connections without significant redesign.

---

## 6. Existing Deep-Link Capabilities

### Query-Param Deep Links
| Pattern | Usage | Scrubbed? |
|---|---|---|
| `?highlight={id}` | Navigate to specific contribution | No (stays in URL) |
| `?question={id}` | Preselect a question | Yes (history.pushState) |
| `?claim={id}&view={mode}` | Select claim in graph view | No |
| `?addEvidence=true` | Auto-open evidence composer | No |
| `?invitation={token}` | Private debate invitation | Yes (history.replaceState) |
| `?redirectedFrom={path}` | Post-login return target | No |
| `?next={path}` | Post-OAuth return target | No |
| `?authError={reason}` | Auth error indicator | No |

### Key Pattern
The existing invitation token flow scrubs the token from the URL bar client-side via `history.replaceState`. However, the token is still present during SSR and initial page load, and is passed through `redirectedFrom` during login redirect (where it's protected by `getSafeRedirectUrl()`).

---

## 7. Public/Private Authorization Model

### RLS Enforcement
- **Public rooms**: `visibility = 'public' AND status <> 'archived'` — readable by anon
- **Private rooms**: Only owner or active debate participants via `has_room_access()`
- **Content views**: SECURITY DEFINER views (`discussion_messages`, `discussion_claims`, etc.) enforce `has_room_access()` in WHERE clause
- **Write access**: `has_room_write_access()` requires `is_active_user()`, non-archived, public/owner/participant

### Access Levels
| Level | Who | Can See |
|---|---|---|
| Public (anon) | Anyone | Public non-archived rooms + all content |
| Authenticated | Logged-in users | Public + own private rooms |
| Participant | Active debate participant | Owner's private room + own participation |
| Owner | Room creator | Full control |

### Implication for Sharing
Public content is already accessible to anyone with the URL. Share links for public discussions/debates/profiles need NO token mechanism — the slug IS the share link.

---

## 8. Share Feature Boundaries

### Discussion Sharing
- **Public discussions**: Slug URL is sufficient (`/discussions/{slug}`). Already accessible to anon.
- **Private discussions**: Not implemented (no `createPrivateDiscussion` exists). Not in scope.
- **Recommendation**: Share button copies slug URL. No token needed for public.

### Debate Sharing
- **Public debates**: Slug URL is sufficient (`/debates/{slug}`). Already accessible to anon.
- **Private debates**: Existing `?invitation={token}` mechanism handles this. Token scrubbing implemented.
- **Recommendation**: Share button copies slug URL for public. Existing invitation flow for private.

### Profile Sharing
- **Public profiles**: Username URL is sufficient (`/u/{username}`). Already accessible to anon.
- **Deleted profiles**: Return 404. No sharing needed.
- **Recommendation**: Share button copies profile URL. No token needed.

### Friend Invitations
- **Net-new feature**: Requires new token system, new UI, new DB table.
- **Separate security class**: Must NOT reuse the private debate invitation system.
- **Recommendation**: New `/invite/{token}` route with hashed tokens.

---

## 9. Friend Invitation Security Model

### Conceptual Flow
```
Sender generates invitation
  → Server creates hashed token, returns opaque public token
  → Sender shares link: /invite/{opaque_token}
  → Recipient opens link
  → Welcome page (no auth required)
  → Recipient registers or logs in
  → Server validates token + auth context
  → Creates friend relationship/request
  → Token consumed (single-use)
```

### Security Principles
1. **Invitation ≠ authentication**: Opening a link never logs you in as the sender
2. **Token is not a credential**: It's a lookup key, not an auth mechanism
3. **Server-side validation**: All checks happen in SECURITY DEFINER functions
4. **Hashed at rest**: Only token hash stored in DB; opaque token in URL
5. **Single-use**: Token consumed on acceptance; replay rejected
6. **Expiry**: Tokens expire after configurable period (recommended: 7 days)
7. **Revocation**: Sender can revoke before consumption
8. **Atomic consumption**: Database-level atomic update prevents race conditions

---

## 10. Token Architecture Recommendation

### Current System (Private Debate Invitations) — Security Gaps

| Property | Current State | Recommended |
|---|---|---|
| Token storage | **Plaintext** in `room_invitations.invitation_token` | Hash with SHA-256 |
| Token generation | `encode(gen_random_bytes(32), 'hex')` — 256-bit | ✅ Adequate |
| Token validation | Plaintext comparison | Hash-then-compare |
| Rate limiting | None on `accept_invitation` | Add rate limiting |
| Expiry | Status check only (`active`/`accepted`/`revoked`) | Add `expires_at` column |
| Brute-force | None | Rate limit + lockout |

### Recommended Token Architecture for Friend Invitations

#### Token Generation
- **Entropy**: 256-bit minimum (32 random bytes)
- **Encoding**: Base62 or hex for URL safety
- **Generation**: `encode(gen_random_bytes(32), 'hex')` — matches existing pattern

#### Token Storage
- **Store only the hash**: `sha256(token)` in `invitation_tokens.token_hash`
- **Public token**: The opaque token in the URL is the only copy outside the DB
- **Security tradeoff**: If DB is compromised, attacker gets hashes but not usable tokens. Token brute-force is infeasible at 256-bit entropy.

#### Token Lifecycle
1. **Creation**: Generate token → hash → store hash + metadata → return plaintext token to sender
2. **Lookup**: Hash incoming token → compare against stored hashes
3. **Consumption**: Atomic `UPDATE ... SET consumed_at = now() WHERE token_hash = $1 AND consumed_at IS NULL`
4. **Revocation**: `UPDATE ... SET revoked_at = now() WHERE id = $1`
5. **Expiry**: `WHERE expires_at > now() AND consumed_at IS NULL AND revoked_at IS NULL`

#### Race Condition Protection
- Use `UPDATE ... WHERE consumed_at IS NULL RETURNING *` — if 0 rows returned, already consumed
- This is atomic at the database level — no application-level locking needed

#### Brute-Force Resistance
- Rate limit: max 10 validation attempts per IP per 5 minutes
- Lockout: after 5 consecutive failures, 15-minute cooldown
- This is advisory — at 256-bit entropy, brute-force is computationally infeasible regardless

---

## 11. Authentication Boundary

### What Happens When...

| Scenario | Behavior | Security |
|---|---|---|
| Logged-out user opens `/discussions/{slug}` | Sees public discussion | ✅ Safe |
| Logged-out user opens `/debates/{slug}` | Sees public debate | ✅ Safe |
| Logged-out user opens `/u/{username}` | Sees public profile | ✅ Safe |
| Logged-out user opens `/invite/{token}` | Sees invitation preview page | ✅ Safe |
| User signs in after opening a link | Normal auth flow; link data preserved via `redirectedFrom` | ✅ Safe |
| User registers after opening a link | Normal registration flow; link data preserved | ✅ Safe |
| User signs in with Google after opening link | OAuth callback → `/auth/callback?next={safeTarget}` | ✅ Safe |
| User signs in with email/password after opening link | Normal login → redirect to `redirectedFrom` | ✅ Safe |
| Authenticated user opens someone else's invitation | Token validation fails (wrong user) | ✅ Safe |
| Authenticated user opens their own invitation | Token validated + consumed | ✅ Safe |
| Invitation is expired | Rejected with "expired" message | ✅ Safe |
| Invitation is revoked | Rejected with "revoked" message | ✅ Safe |
| Invitation is already consumed | Rejected with "already used" message | ✅ Safe |
| Invitation belongs to deleted sender | Token still valid (published discourse survives) | ⚠️ OPEN DECISION |
| Recipient already friends with sender | Rejected with "already connected" | ✅ Safe |
| Recipient has blocked sender | Rejected with "invitation from blocked user" | ✅ Safe (if blocking exists) |
| Sender blocks recipient after creating invitation | Invitation revoked automatically | ⚠️ OPEN DECISION |
| Sender deletes account | Invitation invalidated (sender FK CASCADE) | ✅ Safe |
| Recipient opens same invitation in two tabs | First consumption wins; second rejected atomically | ✅ Safe |

### Critical Security Guarantee
**Opening an invitation link NEVER authenticates the sender.** The token is a lookup key, not a session. The recipient must authenticate independently.

---

## 12. Authorization Boundary

### Authentication vs Authorization
- **Authentication**: "Who are you?" — handled by Supabase Auth (email/password, Google OAuth)
- **Authorization**: "Are you allowed to perform this action?" — handled by RLS + SECURITY DEFINER functions

### Invitation Authorization Model
```
Opening invitation URL
  → Establishes: "there is a valid invitation" (lookup only)
  → Does NOT establish: "you are the sender" or "you have any special permissions"

After authentication:
  → Server validates: invitation exists, is active, not expired, not consumed
  → Server validates: recipient matches invitation (email or user_id)
  → Server creates: friend relationship/request
  → Server consumes: token (single-use)
```

### No Permission Escalation
- Invitation token cannot grant access to private rooms
- Invitation token cannot create admin/moderator roles
- Invitation token cannot bypass RLS
- Invitation token cannot modify other users' data

---

## 13. OAuth Interaction

### Current OAuth Flow
```
User clicks "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: "google", redirectTo: "/auth/callback?next={safeTarget}" })
  → Google consent screen
  → Redirect to /auth/callback?code={code}&next={safeTarget}
  → exchangeCodeForSession(code)
  → Set cookies
  → Redirect to {safeTarget}
```

### Invitation + OAuth Flow
```
Recipient opens /invite/{token}
  → Sees invitation preview (not authenticated)
  → Clicks "Sign in with Google"
  → Normal OAuth flow with redirectTo: "/auth/callback?next=/invite/{token}"
  → After auth, redirected back to /invite/{token}
  → Server validates invitation + auth context
  → Creates relationship
```

### Security
- The invitation token is passed as a URL path segment (`/invite/{token}`), NOT as an OAuth parameter
- OAuth state parameter is managed by Supabase, not by Discora
- The `getSafeRedirectUrl()` validates the `next` target in the callback
- **Do NOT put invitation tokens into OAuth `state` parameter** — this would mix concerns

---

## 14. Session/CSRF Analysis

### Session Fixation
- **Risk**: Attacker sets a session ID before victim authenticates
- **Mitigation**: Supabase Auth issues new session on login; old session IDs are invalidated
- **Invitation impact**: None — invitation tokens are not sessions

### Login CSRF
- **Risk**: Attacker logs victim into attacker's account
- **Mitigation**: Supabase Auth uses PKCE for OAuth; email/password requires victim's credentials
- **Invitation impact**: None — invitation consumption requires the recipient's own auth

### Account Confusion
- **Risk**: Recipient accidentally accepts invitation as wrong user
- **Mitigation**: Invitation validates against `auth.uid()` — must match invited email or user_id
- **Invitation impact**: Safe — server-side validation prevents cross-account acceptance

### Race Conditions
- **Risk**: Recipient opens invitation in two tabs simultaneously
- **Mitigation**: Atomic consumption via `UPDATE ... WHERE consumed_at IS NULL RETURNING *`
- **Invitation impact**: Safe — first consumption wins, second returns "already used"

### Replay Attacks
- **Risk**: Attacker replays a consumed invitation
- **Mitigation**: Token is single-use (`consumed_at IS NOT NULL` prevents reuse)
- **Invitation impact**: Safe — consumed tokens are rejected

---

## 15. IDOR/Enumeration Analysis

### Current IDOR Protections
- `create_inquiry`: P0-3 cross-room claim IDOR guard ✅
- `create_claim_request`: `own_message` guard ✅
- `has_room_access()`: Room-level authorization ✅
- `has_room_write_access()`: Write authorization with `is_active_user()` ✅

### Share Link IDOR Risks

| Route | Risk | Mitigation |
|---|---|---|
| `/discussions/{slug}` | Low — public content, slug is not secret | RLS enforces public-only |
| `/debates/{slug}` | Low — public content | RLS enforces public-only |
| `/u/{username}` | Low — public profiles | 404 for deleted users |
| `/invite/{token}` | Medium — token is a secret | Hash at rest, rate limit, single-use |

### Enumeration Resistance
- `/discussions/{slug}`: 404 for non-existent slugs (no information leak)
- `/debates/{slug}`: Same behavior
- `/u/{username}`: 404 for non-existent or deleted users
- `/invite/{token}`: Generic "invalid invitation" message (no distinction between non-existent vs expired vs consumed)

### 403 vs 404
- **Public content**: 404 for non-existent, 200 for existent (no auth required)
- **Private content**: 404 for non-existent, 403-like behavior via RLS (content not returned)
- **Recommendation**: Maintain this pattern. Never reveal "this exists but you can't see it" for private content.

---

## 16. Open Redirect Analysis

### Current Redirect Handling
- `getSafeRedirectUrl()` validates all redirect targets
- Only internal paths (`/...`) are allowed
- Protocol-relative (`//evil.com`), backslash bypass, control characters all rejected
- Used consistently in auth callback, login form, and OAuth flow

### Share Link Redirect Risks
- **Invitation preview page**: Should NOT redirect automatically
- **Post-auth return**: Use existing `redirectedFrom` pattern with `getSafeRedirectUrl()`
- **Friend acceptance**: Redirect to sender's profile or a "connection established" page (internal only)

### Recommendations
- Never accept arbitrary redirect URLs in share/invite flows
- Use only internal paths for post-action redirects
- The existing `getSafeRedirectUrl()` is sufficient — reuse it

---

## 17. Metadata/OG Security

### Current State
- Root layout: `openGraph: { siteName: "Discora", type: "website" }`
- About page: `openGraph: { title: "About Discora", description: "..." }`
- Only 3 pages generate dynamic metadata (title + description only)
- No `og:image`, no Twitter cards, no canonical URLs

### Share Link Metadata Requirements

| Content Type | Title | Description | Image | Canonical |
|---|---|---|---|---|
| Discussion | Room title | Opening statement (truncated) | None (no image gen) | `/discussions/{slug}` |
| Debate | Room title | Proposition vs Opposition | None | `/debates/{slug}` |
| Profile | Display name (@username) | Bio (truncated) | Avatar | `/u/{username}` |
| Invitation | "You're invited to connect" | Sender display name + message | None | `/invite/{token}` |

### Security Considerations
- **Never expose invitation tokens in OG metadata** — use canonical URL without token
- **Never expose private content in OG metadata** — only public content previews
- **Use `robots: { index: false }` for invitation pages** — prevent indexing
- **Canonical URLs should not include tokens** — `/invite/{token}` should have `robots: noindex`

---

## 18. Privacy Analysis

### Content Visibility Levels

| Level | Before Auth | After Auth | Example |
|---|---|---|---|
| PUBLIC | Full content | Full content | Public discussions, debates, profiles |
| AUTHENTICATED | No content | Full content | Saved items, settings, create forms |
| AUTHORIZED | No content | Full content | Private debate participation |
| PRIVATE | No content | No content | User preferences, email, internal data |

### Share Link Privacy
- **Public share links**: Safe to expose — content is already public
- **Invitation links**: Token is the only secret; sender identity is revealed
- **Profile share links**: Only public profile data is shown
- **No private content leaks through URLs** — RLS prevents this at the DB level

### Recommendation
- Share links should show a "preview" of public content before authentication
- Invitation pages should show minimal sender info (display name only, no email)
- Never include tokens in analytics, logs, or error reports

---

## 19. Abuse/Rate-Limit Model

### Current Rate Limiting
- **Server-side only**: Supabase RPC errors (`rate_limit`, `too_many_attempts`)
- **Access codes**: 5 attempts / 15-minute window (`access_code_failures` table)
- **Inquiry creation**: 5/hour (server-side)
- **Moderation flags**: 5/15 minutes
- **No application-level rate limiting middleware**

### Recommended Rate Limits for Share/Invite

| Action | Limit | Window | Enforcement |
|---|---|---|---|
| Invitation generation | 20/hour/user | Sliding | DB function |
| Invitation validation | 10/IP/5 minutes | Sliding | DB function + middleware |
| Invitation consumption | 1/IP/5 minutes | Sliding | DB function |
| Invalid token attempts | 5/IP/5 minutes | Sliding | DB function |
| Friend request creation | 10/hour/user | Sliding | DB function |
| Share link generation | No limit | — | Client-side only |

### Spam Prevention
- Invitation generation requires authenticated user
- Each invitation is tied to a specific sender
- Rate limits prevent bulk generation
- Revocation is immediate
- No public-facing invitation creation endpoint

---

## 20. Database Design Recommendation

### Existing: `room_invitations` Table

```sql
CREATE TABLE room_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  invitation_token text NOT NULL,  -- PLAINTEXT — security gap
  status text NOT NULL CHECK (status IN ('active', 'accepted', 'revoked')),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraint: exactly one of invited_user_id or email
  CONSTRAINT room_invitations_identity_check CHECK (
    (invited_user_id IS NOT NULL AND email IS NULL) OR
    (invited_user_id IS NULL AND email IS NOT NULL)
  )
);
```

### Recommended: `friend_invitations` Table (New)

```sql
CREATE TABLE friend_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,           -- SHA-256 of the opaque token
  recipient_email text,               -- optional, for email-based invites
  recipient_user_id uuid,             -- optional, for user-id-based invites
  message text,                       -- optional personal message (max 500 chars)
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'consumed', 'revoked', 'expired')),
  consumed_at timestamptz,
  consumed_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL,    -- mandatory expiry
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraint: exactly one of recipient_user_id or recipient_email
  CONSTRAINT friend_invitations_identity_check CHECK (
    (recipient_user_id IS NOT NULL AND recipient_email IS NULL) OR
    (recipient_user_id IS NULL AND recipient_email IS NOT NULL)
  )
);

-- Uniqueness: one active invitation per sender-recipient pair.
-- MUST NOT use COALESCE(recipient_user_id, recipient_email) — UUID and text
-- are different types. Use type-safe, separate partial unique indexes:
--   (1) per (sender_user_id, recipient_user_id) for user-recipients
--   (2) per (sender_user_id, normalized recipient_email) for email-recipients
UNIQUE INDEX PLACEHOLDER (split into type-safe rules during design review)

-- Index for token hash lookup
CREATE INDEX friend_invitations_token_hash
  ON friend_invitations (token_hash)
  WHERE status = 'active';

-- Index for cleanup
CREATE INDEX friend_invitations_expires
  ON friend_invitations (expires_at)
  WHERE status = 'active';
```

> **Correction (Product Owner, 2026-09-14):** The earlier proposed
> `COALESCE(recipient_user_id, recipient_email)` unique index is invalid because
> `recipient_user_id` (UUID) and `recipient_email` (text) are different types.
> The future friend-invitation schema must define **type-safe** uniqueness and
> indexing — likely separate partial unique indexes for user-recipients and
> normalized email-recipients. No friend schema is created in Phase 9D.1.

### Recommended: `friend_relationships` Table (New)

```sql
CREATE TABLE friend_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by uuid NOT NULL REFERENCES auth.users(id),
  accepted_at timestamptz,
  blocked_at timestamptz,
  blocked_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure consistent ordering (smaller UUID is always user_a)
  CONSTRAINT friend_relationships_ordering CHECK (user_a_id < user_b_id),
  CONSTRAINT friend_relationships_unique UNIQUE (user_a_id, user_b_id)
);
```

### RLS for Friend Tables

```sql
-- friend_invitations: sender can see own, recipient can see by email/user_id
ALTER TABLE friend_invitations ENABLE ROW LEVEL POLICY;

CREATE POLICY "Senders can view own invitations"
  ON friend_invitations FOR SELECT
  USING (auth.uid() = sender_user_id);

CREATE POLICY "Recipients can view invitations addressed to them"
  ON friend_invitations FOR SELECT
  USING (
    auth.uid() = recipient_user_id OR
    auth.email() = recipient_email
  );

-- Direct INSERT/UPDATE/DELETE revoked — use SECURITY DEFINER RPCs only
REVOKE ALL ON friend_invitations FROM anon, authenticated;
GRANT SELECT ON friend_invitations TO authenticated;

-- friend_relationships: users can see own relationships
ALTER TABLE friend_relationships ENABLE ROW LEVEL POLICY;

CREATE POLICY "Users can view own friendships"
  ON friend_relationships FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

REVOKE ALL ON friend_relationships FROM anon;
GRANT SELECT ON friend_relationships TO authenticated;
```

---

## 21. RLS/Security Model

### Existing Security Architecture
- 32 tables with RLS enabled
- SECURITY DEFINER views for content access (`discussion_messages`, `discussion_claims`, etc.)
- `has_room_access()` for room-level authorization
- `has_room_write_access()` for write authorization
- `is_active_user()` for deleted-user protection
- `is_privileged_user()` for admin/moderator checks (service-role only)
- All user-facing mutation policies hardened with `is_active_user()`

### Friend System Security Model
- All friend operations via SECURITY DEFINER RPCs
- RLS policies on `friend_invitations` and `friend_relationships` for read access only
- Direct table mutations revoked from anon/authenticated
- Atomic consumption via `UPDATE ... WHERE consumed_at IS NULL`
- Rate limiting via DB functions (matching existing pattern)

---

## 22. UX/Welcome Experience

### Public Content Share
When someone opens a shared discussion/debate link:

```
DISCORA
"Someone shared this [discussion/debate] with you."

[Room title]
[Opening statement or premise]

"Explore claims, evidence, questions, and the State of Understanding."

[Explore Discussion] / [Explore Debate]

[Sign in] / [Create account] — only shown when interaction is needed
```

### Profile Share
When someone opens a shared profile link:

```
DISCORA
"Check out this Discora member."

[Avatar] [Display name] (@username)
[Bio]

[View Profile]

[Sign in] / [Create account] — shown for consistency
```

### Friend Invitation
When someone opens a friend invitation link:

```
DISCORA
"You've been invited to connect on Discora."

[Sender avatar] [Sender display name]
"[Personal message if provided]"

"Create an account or sign in to accept this invitation."

[Accept Invitation]

[Sign in] / [Create account]
```

### Principles
- **Don't force login for public content** — let users explore before authenticating
- **Show what was shared** — give context before asking for action
- **Clear CTA** — "Explore" for content, "Accept" for invitations
- **Welcome tone** — "Someone shared this with you" not "Log in to continue"

---

## 23. Growth Philosophy Alignment

### ✅ Aligned
- Share is a distribution/discovery mechanism, not an epistemic signal
- No share scores, popularity rankings, or viral leaderboards
- No rewards for sharing
- No engagement farming
- Clean link previews
- Useful pages even before signup (for public content)

### ❌ Avoid
- Aggressive share popups
- Repeated prompts
- Dark patterns
- Fake urgency
- Forced sharing
- Share rewards
- Social pressure
- Engagement scores
- "Most shared = most credible"

### Recommended Share UX
- Place share button where the content is meaningful (room header, profile header)
- Use clear action labels: "Copy link", "Share"
- Provide native Web Share API where available
- Provide copy-link fallback
- No share counts, no "trending", no "popular shares"

---

## 24. Native Sharing Recommendation

### Web Share API (`navigator.share()`)
- **Support**: Chrome 61+, Safari 12+, Edge 79+, Firefox (behind flag)
- **Mobile**: Well-supported on iOS Safari and Chrome Android
- **Desktop**: Chrome and Edge support; Safari partial

### Recommendation
- Use `navigator.share()` as primary share mechanism
- Provide copy-link fallback when `navigator.share()` is not available
- No external dependencies needed

### Implementation Pattern
```typescript
async function shareContent(title: string, url: string, text?: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User cancelled or error — fall through to copy
    }
  }
  // Fallback: copy to clipboard
  await navigator.clipboard.writeText(url);
  toast.success("Link copied to clipboard");
}
```

---

## 25. URL Architecture Recommendation

### Current Routes (Safe to Expose)
| Route | Purpose | Safe to Share? |
|---|---|---|
| `/discussions/{slug}` | Public discussion | ✅ Yes |
| `/debates/{slug}` | Public debate | ✅ Yes |
| `/u/{username}` | Public profile | ✅ Yes |

### New Routes Needed
| Route | Purpose | Auth Required |
|---|---|---|
| `/invite/{token}` | Friend invitation landing | No |

### Routes NOT Needed
| Proposed | Why Not |
|---|---|
| `/d/{slug}` | Existing `/discussions/{slug}` is fine |
| `/share/{type}/{id}` | Unnecessary indirection; existing routes work |

### Canonical URL Strategy
- Discussions: `https://discora.com/discussions/{slug}`
- Debates: `https://discora.com/debates/{slug}`
- Profiles: `https://discora.com/u/{username}`
- Invitations: `https://discora.com/invite/{token}`

### Migration Risk
- No breaking changes — existing routes remain unchanged
- New `/invite/{token}` route is additive

---

## 26. Deleted-Account Interaction

### Current Behavior
- `is_deleted = true` on profiles
- Middleware strips auth cookies for deleted users
- Content retained with "Deleted User" attribution
- Handle retired via `retired_handles` table

### Share Link Behavior if Sender Deletes
| Scenario | Behavior |
|---|---|
| Public discussion share | Still works (slug is independent of creator) |
| Public debate share | Still works |
| Profile share | Returns 404 (deleted profile) |
| Friend invitation | Token invalidated (sender FK CASCADE deletes invitation) |
| Historical handle | Retired, not reused |

### Recommendation
- Public content shares survive account deletion (content is room-scoped, not user-scoped)
- Profile shares return 404 (already implemented)
- Friend invitations are invalidated on sender deletion (CASCADE)
- No special handling needed — existing behavior is correct

---

## 27. Security Threat Model

### Threat: Token Theft
- **Risk**: Attacker obtains invitation token from URL/logs/browser history
- **Mitigation**: Hash at rest, single-use, expiry, URL scrubbing
- **Residual risk**: Low — token is useless without recipient auth

### Threat: Database Compromise
- **Risk**: Attacker gains read access to database
- **Mitigation**: Hash tokens with SHA-256; attacker gets hashes but not usable tokens
- **Residual risk**: Low at 256-bit entropy — brute-force infeasible

### Threat: Brute-Force Token
- **Risk**: Attacker guesses token values
- **Mitigation**: 256-bit entropy makes this computationally infeasible (2^256 possibilities)
- **Residual risk**: Negligible

### Threat: Session Fixation via Invitation
- **Risk**: Attacker tricks victim into accepting invitation with attacker's session
- **Mitigation**: Invitation validates against `auth.uid()`, not session; Supabase issues new session on login
- **Residual risk**: None

### Threat: Open Redirect via Share Link
- **Risk**: Share link redirects to attacker-controlled URL
- **Mitigation**: `getSafeRedirectUrl()` validates all redirects; share links use internal paths only
- **Residual risk**: None

### Threat: Information Leakage via Metadata
- **Risk**: OG metadata exposes private content or tokens
- **Mitigation**: Only public content in metadata; tokens excluded from canonical URLs; `robots: noindex` on invitation pages
- **Residual risk**: Low — requires careful implementation

### Threat: Spam Invitations
- **Risk**: Attacker creates bulk friend invitations
- **Mitigation**: Rate limits (20/hour/user), authenticated-only creation, revocation available
- **Residual risk**: Low — rate limits prevent abuse

---

## 28. Future Security Test Matrix

| ID | Test | Expected Result |
|---|---|---|
| SHARE-SEC-01 | Share URL contains no auth credentials | ✅ Only slug/token in URL |
| SHARE-SEC-02 | Opening share URL never authenticates sender | ✅ Recipient authenticates independently |
| SHARE-SEC-03 | Private content cannot be accessed through known URL | ✅ RLS blocks unauthorized access |
| SHARE-SEC-04 | Cross-user IDOR blocked | ✅ Server validates auth.uid() matches invitation |
| SHARE-SEC-05 | Expired invitation rejected | ✅ expires_at check |
| SHARE-SEC-06 | Revoked invitation rejected | ✅ revoked_at check |
| SHARE-SEC-07 | Consumed invitation replay handled safely | ✅ consumed_at check |
| SHARE-SEC-08 | Concurrent invitation consumption handled atomically | ✅ UPDATE WHERE consumed_at IS NULL |
| SHARE-SEC-09 | Invalid token brute-force resistance | ✅ 256-bit entropy + rate limiting |
| SHARE-SEC-10 | Open redirect blocked | ✅ getSafeRedirectUrl() |
| SHARE-SEC-11 | OAuth callback remains safe | ✅ Existing callback unchanged |
| SHARE-SEC-12 | Email/password callback remains safe | ✅ Existing flow unchanged |
| SHARE-SEC-13 | Invitation cannot authenticate another account | ✅ Token is lookup key, not credential |
| SHARE-SEC-14 | Invitation cannot create unauthorized relationship | ✅ Server validates recipient identity |
| SHARE-SEC-15 | Deleted sender invitation handled correctly | ✅ CASCADE invalidates |
| SHARE-SEC-16 | Blocked relationship handled correctly | ✅ Block check in accept function |
| SHARE-SEC-17 | OG metadata does not leak private content | ✅ Only public content in metadata |
| SHARE-SEC-18 | Invitation token does not appear in canonical metadata | ✅ robots: noindex, no token in OG |
| SHARE-SEC-19 | Rate limiting recommendation validated | ✅ DB-level rate limits |
| SHARE-SEC-20 | Mobile deep-link flow works | ✅ Web Share API + fallback |

---

## 29. Future Browser QA Matrix

| Scenario | Desktop | Tablet | Mobile |
|---|---|---|---|
| Public discussion share (logged out) | QA | QA | QA |
| Public debate share (logged out) | QA | QA | QA |
| Public profile share (logged out) | QA | QA | QA |
| Friend invitation (logged out) | QA | QA | QA |
| Friend invitation (logged in) | QA | QA | QA |
| Share button (logged in) | QA | QA | QA |
| Web Share API (mobile) | N/A | QA | QA |
| Copy link fallback | QA | QA | QA |
| Post-auth return to shared content | QA | QA | QA |
| Google login from share page | QA | QA | QA |
| Email/password login from share page | QA | QA | QA |
| Expired invitation page | QA | QA | QA |
| Invalid invitation page | QA | QA | QA |
| OG metadata in link preview | QA | QA | QA |

**Note:** Playwright MCP network-isolated from host dev server. QA must be performed manually or with host-accessible automation.

---

## 30. Implementation Phases

### Phase 1: Public Content Sharing (Low Risk)
- Add share button to discussion/debate/profile headers
- Use Web Share API with copy-link fallback
- Add OG metadata to discussion/debate/profile pages
- Add canonical URLs
- **No DB or authentication changes required**
- **Low-risk, not zero-risk** — still requires normal authorization/privacy/metadata verification (see Phase 9D.1 security QA)

### Phase 2: Friend Invitation System (Medium Risk)
- Create `friend_invitations` table with hashed tokens
- Create `friend_relationships` table
- Create SECURITY DEFINER RPCs for invitation lifecycle
- Create `/invite/{token}` landing page
- Create invitation management UI
- Create friend list UI
- **Requires migration + security review**
- **New RLS policies required**

### Phase 3: Private Content Sharing (High Risk)
- Extend existing private debate invitation system
- Fix plaintext token storage (hash at rest)
- Add rate limiting to `accept_invitation`
- Add expiry to `room_invitations`
- Consider extending to private discussions (if implemented)
- **Requires migration + security audit**
- **Builds on existing system**

---

## 31. Open Product Decisions

### OPEN PRODUCT DECISION 1: Friend System Scope
- **Option A**: Simple friend list (bidirectional, no request flow)
- **Option B**: Friend request system (pending/accepted/blocked)
- **Option C**: Follow system (unidirectional)
- **Recommendation**: Option B (friend request system) — aligns with "meaningful connections" philosophy and provides blocking capability

### OPEN PRODUCT DECISION 2: Invitation Expiry Duration
- **Option A**: 7 days (standard)
- **Option B**: 30 days (generous)
- **Option C**: Configurable by sender
- **Recommendation**: Option A (7 days) — prevents stale invitation accumulation; sender can regenerate if needed

### OPEN PRODUCT DECISION 3: Friend Request Limits
- **Option A**: 10 requests/hour/user
- **Option B**: 20 requests/hour/user
- **Option C**: No limit (rely on blocking)
- **Recommendation**: Option A (10/hour) — prevents spam while allowing normal use

### OPEN PRODUCT DECISION 4: Deleted Sender Invitation Behavior
- **Option A**: Invalidate invitation (CASCADE) — current behavior for room_invitations
- **Option B**: Keep invitation active (sender identity shown as "Deleted User")
- **Recommendation**: Option A (invalidate) — cleanest; sender chose to leave, connections should not persist

### OPEN PRODUCT DECISION 5: Profile Visibility in Invitations
- **Option A**: Show sender display name + avatar only
- **Option B**: Show sender display name only (no avatar)
- **Option C**: Show nothing (anonymous invitation)
- **Recommendation**: Option A (display name + avatar) — provides context for the recipient to make an informed decision

---

## 32. Risks/Dependencies

### Risks
| Risk | Severity | Mitigation |
|---|---|---|
| Existing `room_invitations` stores tokens in plaintext | Medium | Hash at rest in new system; fix existing in Phase 3 |
| No rate limiting on `accept_invitation` | Medium | Add rate limiting before extending |
| OG metadata is minimal | Low | Add in Phase 1 (no security risk) |
| Friend system is net-new — no existing patterns | Medium | Follow existing SECURITY DEFINER + RLS patterns |
| Docker network isolation prevents Playwright QA | Low | Manual QA required |

### Dependencies
| Dependency | Status |
|---|---|
| Phase 9C.4A (infrastructure hardening) | ✅ Complete |
| Supabase Auth (email/password, Google OAuth) | ✅ Existing |
| `getSafeRedirectUrl()` | ✅ Existing |
| Web Share API | ✅ Browser-native, no dependency |
| OG metadata generation | ✅ Next.js `generateMetadata` |

---

## 33. Final Recommendation

### Verdict: B. READY WITH OPEN PRODUCT DECISIONS

The architecture is sound. The existing codebase provides strong foundations:
- **Slug-based routing** for public content (no tokens needed)
- **RLS enforcement** at the database level
- **SECURITY DEFINER functions** for all mutations
- **Safe redirect utility** for OAuth flows
- **Established invitation pattern** for private debates

### Before Implementation
1. Resolve the 5 open product decisions
2. Approve the `friend_invitations` and `friend_relationships` schema
3. Address the plaintext token gap in `room_invitations` (Phase 3)
4. Add rate limiting to `accept_invitation` (Phase 3)

### Critical Security Principle (Preserved)
**Invitation token ≠ authentication credential.** An invitation token is a lookup key, never a session, JWT, or credential. Opening an invitation link must NEVER authenticate the sender or grant any access.

### Existing Security Remediation Items (Do NOT modify in Phase 9D.1)
- `room_invitations.invitation_token` is stored as **plaintext TEXT** (not hashed). Hash-at-rest with SHA-256 required before friend invitation feature ships.
- Do NOT modify `room_invitations` in Phase 9D.1.
- Do NOT repurpose `room_invitations` for friend invitations.

### Recommended Start
Begin with **Phase 1: Public Content Sharing** — low-risk, no DB/auth changes, but still requires normal authorization/privacy/metadata verification. This can be implemented and shipped independently while the friend invitation system (Phase 2) undergoes design review.

---

**NO IMPLEMENTATION PERFORMED.** This is audit + design recommendation only.
