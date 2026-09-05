# Private Debate Rooms Audit

## 1. Existing Architecture

### Current Room Model
- **Table**: `public.rooms`
- **Columns**: `id`, `title`, `description`, `slug`, `room_type`, `created_by`, `topic_id`, `visibility`, `status`, `created_at`, `updated_at`
- **Constraints**:
  - `room_type` check: `('discussion', 'debate', 'private')`
  - `visibility` check: `('public', 'private')`
  - `status` check: `('open', 'inactive', 'archived')`
- **Key finding**: The `visibility` and `room_type` columns already exist and support private rooms at the schema level.

### Current Debate Model
- **Table**: `public.debates` (1:1 with `rooms.id`)
- **Columns**: `id`, `proposition_title`, `opposition_title`, `opening_statement`, `status`, `resolution`, `created_at`, `updated_at`
- **View**: `public.discussion_debates` — joins `debates` with room metadata, but does NOT filter by `rooms.visibility`
- **RLS**: `debates` table has SELECT policy requiring `rooms.visibility = 'public'` for the room
- **Key finding**: The `debates` table RLS correctly blocks private debate reads through the base table, but the `discussion_debates` view bypasses this protection.

### Current Participant/Membership Model
- **Table**: `public.debate_participants`
- **Columns**: `id`, `room_id`, `user_id`, `side`, `joined_at`
- **Constraints**: `unique(room_id, user_id)`
- **RLS**:
  - SELECT: `using (true)` — **anyone can view all participants**
  - INSERT: `with check (auth.uid() = user_id)`
  - UPDATE: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`
  - DELETE: `using (auth.uid() = user_id)`
- **Key finding**: No membership concept exists beyond debate participation. No invitation table. No access code table.

### Current Visibility Model
- **Database**: `rooms.visibility` exists with `'public'` and `'private'` values
- **RLS pattern**: Most content views enforce `(r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()`
- **Frontend**: No visibility filtering in `getDiscussions()` or `getDebates()` — they query views/tables that don't consistently enforce visibility
- **Search**: `search_content` RPC correctly filters: `(r.visibility = 'public' or r.created_by = auth.uid())`
- **Key finding**: Visibility is partially enforced at the database level but has gaps in views and service queries.

### Current Ownership Model
- `rooms.created_by` references `auth.users(id)`
- Owner is the sole user who can see private room content through RLS
- No concept of co-owners, moderators, or delegated management

### Relevant Routes
- `/debates/create` — CreateDebateForm, no visibility option
- `/debates/[slug]` — DebateRoomPage, calls `getDebateBySlug()` which queries `rooms` directly without visibility filter
- `/debates` — debate feed via `useDebates()` → `getDebates()` → `discussion_debates` view
- `/discussions` — discussion feed via `getDiscussions()` → `rooms` table
- `/search` — SearchPageClient → `searchContent()` RPC
- `/u/[username]` — public profile (no private room leakage currently)

### Relevant Services
- `src/features/debates/services/debate-service.ts` — `getDebateBySlug`, `createDebate`, `getDebates`, `joinDebate`, `leaveDebate`, `getDebateParticipants`, `switchDebateSide`
- `src/features/discussions/services/discussion-service.ts` — `getDiscussions`, `getDiscussionBySlug`
- `src/features/homepage/services/homepage-service.ts` — `getHomepageMetrics`, `getFeaturedInquiries`
- `src/features/homepage/services/homepage-personal-service.ts` — `getMyDebatesAttention`, `getMyOpenInquiries`, etc.

### Relevant RPCs
- `create_debate_room` — hardcodes `visibility = 'public'`
- `search_content` — correctly filters private rooms
- `get_homepage_metrics` — aggregates across all rooms (no visibility filter, but only returns counts)
- `get_featured_inquiries` — **does NOT filter by room visibility** — potential private room leak
- `get_my_debates_attention` — correctly scoped to `debate_participants` where `user_id = auth.uid()`

### Relevant Views
- `public.discussion_debates` — joins debates with room metadata, filters only by `room_type = 'debate'`, NOT by visibility
- `public.discussion_claims` — filters by `(r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()`
- `public.discussion_messages` — filters by `(r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()`
- `public.discussion_evidence` — filters by `(r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()`
- `public.discussion_questions` — filters by `(r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()`
- `public.moderation_queue` — SECURITY DEFINER view for moderators

## 2. Existing Reusable Infrastructure

| Component | Reusability |
|-----------|-------------|
| `rooms.visibility` column | ✅ Reusable — already supports `'private'` |
| `rooms.status` column | ✅ Reusable — `'open'`, `'inactive'`, `'archived'` |
| `debate_participants` table | ✅ Partially reusable — needs visibility-aware SELECT policy |
| `discussion_claims` view pattern | ✅ Reusable — correct visibility filter pattern |
| `search_content` RPC | ✅ Reusable — already handles private rooms |
| `get_my_debates_attention` RPC | ✅ Reusable — already scoped to user's participations |
| SECURITY DEFINER pattern | ✅ Reusable — established in Phase 3 |
| `safe-redirect.ts` utility | ✅ Reusable — can be used for invitation link validation |
| `has_role_or_higher` function | ✅ Reusable — for moderation/ownership checks |
| `auto_slugify_trigger` | ✅ Reusable — for room/invitation slug generation |

## 3. Current Privacy Model

**Actual current state** (not aspirational):

| Surface | Private Room Visibility |
|---------|------------------------|
| `rooms` table SELECT | Only `created_by` can read private rooms via RLS |
| `debates` table SELECT | Only visible if parent room is public (RLS enforces this) |
| `discussion_debates` view | **NO visibility filter** — all debates visible to all users |
| `discussion_claims` view | Correctly filters: public OR creator |
| `discussion_messages` view | Correctly filters: public OR creator |
| `discussion_evidence` view | Correctly filters: public OR creator |
| `discussion_questions` view | Correctly filters: public OR creator |
| `debate_participants` table | **Open SELECT** — anyone can see all participants |
| `search_content` RPC | Correctly filters: public OR creator |
| `getDebates()` service | Queries `discussion_debates` view — **exposes private debates** |
| `getDiscussions()` service | Queries `rooms` directly without visibility filter |
| `getFeaturedInquiries()` RPC | **No room visibility filter** — potential leak |
| `getHomepageMetrics()` RPC | Only returns counts, no content leak |
| `getMyDebatesAttention()` RPC | Correctly scoped to user's participations |
| Homepage debate feed | Uses `getDebates()` — **exposes private debates** |
| Debate detail page (`/debates/[slug]`) | `getDebateBySlug()` queries `rooms` directly — RLS blocks unauthorized access |
| Direct URL access to private debate | Blocked by RLS on `rooms` table |

**Critical gaps**:
1. `discussion_debates` view exposes all debates regardless of visibility
2. `getDebates()` service doesn't filter by visibility
3. `getDiscussions()` service doesn't filter by visibility
4. `debate_participants` SELECT is open
5. `get_featured_inquiries` RPC doesn't filter by room visibility
6. No invitation/membership system exists

## 4. Privacy Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| `discussion_debates` view leaks private debate metadata | HIGH | Migration `202606100001_create_debates.sql` |
| `getDebates()` returns private debates in feeds | HIGH | `debate-service.ts:243-349` |
| `getDiscussions()` returns private discussions | HIGH | `discussion-service.ts:248-298` |
| `debate_participants` open SELECT leaks membership | HIGH | Migration `202606100001_create_debates.sql` |
| `get_featured_inquiries` leaks private room titles | MEDIUM | Migration `202606170001_create_homepage_rpcs.sql` |
| No invitation/membership system | HIGH | Missing infrastructure |
| `create_debate_room` hardcodes public visibility | MEDIUM | Migration `202606100001_create_debates.sql` |
| No private room gate on debate pages | MEDIUM | `debates/[slug]/page.tsx` |
| No access code/invitation link mechanism | HIGH | Missing infrastructure |
| No participant removal mechanism | HIGH | Missing infrastructure |
| No participant invitation permission control | MEDIUM | Missing infrastructure |
| Debate page metadata may leak in `generateMetadata` | MEDIUM | `debates/[slug]/page.tsx:16-33` |

## 5. Member Discovery Model

| User State | Global Discovery | Personalized Discovery | Direct URL Access |
|------------|-----------------|------------------------|-------------------|
| **Unauthorized** | ❌ Invisible | ❌ Not shown | ❌ Privacy gate only |
| **Invited, not joined** | ❌ Invisible | ❌ Not shown (invitation-only) | ✅ Can accept invitation |
| **Active participant** | ❌ Invisible globally | ✅ Visible in "Your Debates" | ✅ Normal access |
| **Owner** | ❌ Invisible globally | ✅ Visible in "Your Debates" | ✅ Normal access + management |
| **Removed participant** | ❌ Invisible | ❌ Not shown | ❌ Privacy gate |
| **Public room** | ✅ Visible | ✅ Visible | ✅ Normal access |

**Enforcement requirement**: This must be enforced by database authorization (RLS/RPCs), not client-side filtering.

## 6. Recommended Data Model

### New Tables

#### `room_invitations`
```sql
create table public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete set null,
  email text,
  token text not null,
  access_code text not null,
  status text not null default 'active' check (status in ('active', 'accepted', 'revoked')),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_invitations_identity_check check (
    (invited_user_id is not null and email is null) or
    (invited_user_id is null and email is not null)
  )
);
```

**Purpose**: Track invitations to private rooms. Supports both registered-user invitations (`invited_user_id`) and email-based invitations (`email`).

**Indexes**:
- `room_invitations_room_id_idx` on `(room_id)`
- `room_invitations_token_idx` on `(token)` — for fast lookup by invitation link
- `room_invitations_code_idx` on `(access_code)` — for fast lookup by access code
- `room_invitations_room_user_idx` on `(room_id, invited_user_id)` — for duplicate prevention
- `room_invitations_status_idx` on `(room_id, status)` — for active invitation queries

**RLS**:
- Owner can view/manage invitations for their rooms
- Invited user can view their own invitations
- No one else can read invitations

**Future Discussion reuse**: ✅ Fully reusable — `room_id` is generic.

#### `room_memberships` (optional alternative to extending `debate_participants`)
**Recommendation**: Do NOT create a new `room_memberships` table. Reuse `debate_participants` for debates. For future Discussions, extend `debate_participants` or create a generic `room_participants` table later. V1 should minimize tables.

### Modified Tables

#### `rooms` — no schema changes needed
- Already has `visibility` and `room_type`
- `room_type` check already includes `'private'`

#### `debate_participants` — RLS policy changes needed
- Current SELECT policy: `using (true)` — must be restricted
- New SELECT policy: visible to room owner, participant, or if room is public

### New Columns (if needed)
- `rooms.participant_invites_enabled` — boolean, default `true` for private debates, controls whether participants can invite others

## 7. Authorization Model

| Role | Create Private Debate | View Private Debate | Join Private Debate | Invite Others | Remove Participants | Change Settings | Make Public |
|------|----------------------|---------------------|---------------------|---------------|---------------------|-----------------|-------------|
| **Owner** | ✅ Yes | ✅ Yes | ✅ Auto-joined | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Active Participant** | ❌ No | ✅ Yes | ✅ Already joined | ✅ If owner allows | ❌ No | ❌ No | ❌ No |
| **Invited, not joined** | ❌ No | ❌ No (gate only) | ✅ Yes (via invitation) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Removed Participant** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Unauthorized User** | ❌ No | ❌ No (gate only) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |

**Authorization enforcement points**:
1. Database RLS on all room-related tables
2. SECURITY DEFINER RPCs for any cross-tenant visibility checks
3. Server-side route guards before rendering private room pages
4. Client-side UI hiding (defense-in-depth only, not security boundary)

## 8. Invitation Model

### Recommended Architecture

**Link-based invitation**:
- URL format: `/invite/{roomId}/{token}`
- Token: 32+ character cryptographically random string
- Single use: token can be accepted once
- After acceptance: token marked `accepted`, remains in history

**Access code invitation**:
- Format: 8-character alphanumeric (case-insensitive)
- Enters at `/join?code={access_code}`
- Can be used multiple times until room is made public or invitation is revoked
- Rate limited to prevent brute force

**Token storage**:
- Store `token` hash in database (like password hashing)
- Store raw token only in the invitation URL/link
- Compare using `crypt()` or `pgcrypto` during validation
- This prevents token leakage from database dumps

**Invitation lifecycle**:
```
active → accepted (user joins)
active → revoked (owner revokes)
```

**Historical preservation**: Invitation records remain after acceptance/revocation. Do not delete.

**Revocation behavior**: Revoked tokens/codes immediately stop working. Accepted invitations remain valid even if later revoked.

**Participant invitation permission**:
- Owner-controlled flag: `rooms.participant_invites_enabled`
- When `false`: only owner can generate invitations
- When `true`: any active participant can generate invitations
- Attribution: `room_invitations.invited_by` records who created the invitation

**Rate limiting**:
- Max 10 invitations per user per hour (owner or participant)
- Max 5 join attempts per minute per IP
- Max 3 access code attempts per minute per room

## 9. Private → Public

**Allowed transition**: `private` → `public`
**Forbidden transition**: `public` → `private`

**Enforcement**:
```sql
-- In create_debate_room and any visibility-changing RPC:
if p_visibility = 'public' then
  -- allow
else
  raise exception 'Invalid visibility';
end if;
```

**When room becomes public**:
1. All existing participants retain access
2. Invitations become historically preserved but irrelevant for authorization
3. Removed participants can access as normal public users
4. Room appears in global search/discovery
5. Room appears in public feeds
6. No need to delete invitation history

**Cache invalidation**:
- RSC payloads: Next.js will naturally revalidate on next request
- TanStack Query: queries keyed by room ID will refetch
- Search index: `search_content` is `stable` so it re-evaluates per call
- OpenGraph/metadata: regenerated on next page load

## 10. RLS / SECURITY DEFINER Design

### Tables Requiring RLS Changes

#### `rooms`
Current policy: `(visibility = 'public' and status <> 'archived') or created_by = auth.uid()`
- **No change needed** — already correct

#### `debate_participants`
Current SELECT: `using (true)` — **MUST CHANGE**
```sql
create policy "Participants and owner can view debate participants"
  on public.debate_participants for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and (
          r.visibility = 'public'
          or r.created_by = auth.uid()
          or exists (
            select 1 from public.debate_participants dp
            where dp.room_id = room_id and dp.user_id = auth.uid()
          )
        )
    )
  );
```

#### `room_invitations` (new)
```sql
create policy "Owner can view room invitations"
  on public.room_invitations for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

create policy "Invited user can view their invitations"
  on public.room_invitations for select
  using (invited_user_id = auth.uid());

create policy "Owner can create invitations"
  on public.room_invitations for insert
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
    and invited_by = auth.uid()
  );

create policy "Participants can create invitations if enabled"
  on public.room_invitations for insert
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and r.participant_invites_enabled = true
        and exists (
          select 1 from public.debate_participants dp
          where dp.room_id = room_id and dp.user_id = auth.uid()
        )
    )
    and invited_by = auth.uid()
  );

create policy "Owner can update invitations"
  on public.room_invitations for update
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );

create policy "Owner can delete invitations"
  on public.room_invitations for delete
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.created_by = auth.uid()
    )
  );
```

### Views Requiring Changes

#### `discussion_debates`
Current: filters only by `room_type = 'debate'`
**Must add**: `(r.visibility = 'public' or r.created_by = auth.uid())`

#### `get_featured_inquiries` RPC
Current: no room visibility filter
**Must add**: `join rooms r on r.id = ii.room_id and (r.visibility = 'public' or r.created_by = auth.uid())`

### New SECURITY DEFINER Functions Needed

#### `create_private_debate_room`
```sql
create or replace function public.create_private_debate_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_proposition_title text,
  p_opposition_title text,
  p_opening_statement text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  insert into public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
  values (p_title, p_description, 'debate', p_topic_id, 'private', 'open', auth.uid())
  returning id into v_room_id;

  insert into public.debates (id, proposition_title, opposition_title, opening_statement)
  values (v_room_id, p_proposition_title, p_opposition_title, p_opening_statement);

  insert into public.debate_participants (room_id, user_id, side)
  values (v_room_id, auth.uid(), 'proposition');

  return v_room_id;
end;
$$;
```

#### `accept_invitation`
```sql
create or replace function public.accept_invitation(
  p_token text,
  p_room_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Must be authenticated to accept invitation';
  end if;

  select id into v_invitation_id
  from public.room_invitations
  where room_id = p_room_id
    and status = 'active'
    and crypt(p_token, token) = token
    and (invited_user_id = v_user_id or email = (
      select email from auth.users where id = v_user_id
    ));

  if v_invitation_id is null then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into public.debate_participants (room_id, user_id, side)
  values (p_room_id, v_user_id, 'neutral')
  on conflict (room_id, user_id) do nothing;

  update public.room_invitations
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_invitation_id;

  return p_room_id;
end;
$$;
```

#### `validate_access_code`
```sql
create or replace function public.validate_access_code(
  p_room_id uuid,
  p_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
begin
  select id into v_invitation_id
  from public.room_invitations
  where room_id = p_room_id
    and status = 'active'
    and upper(access_code) = upper(p_code);

  if v_invitation_id is null then
    raise exception 'Invalid access code';
  end if;

  return p_room_id;
end;
$$;
```

## 11. Search / Discovery Impact

### GLOBAL DISCOVERY (unauthorized users)
- `search_content` RPC: Already filters correctly (`visibility = 'public' or created_by = auth.uid()`)
- `getDebates()`: **Must add visibility filter** — currently leaks private debates through `discussion_debates` view
- `getDiscussions()`: **Must add visibility filter** — currently queries `rooms` without visibility constraint
- `getFeaturedInquiries()`: **Must add visibility filter** — currently leaks private room titles
- Homepage feeds: **Must add visibility filter** — currently uses unfiltered `getDebates()` and `getDiscussions()`

### MEMBER-SCOPED DISCOVERY (authorized users)
- New RPC needed: `get_my_private_debates()` — returns private debates where user is owner or participant
- New RPC needed: `get_my_joined_debates()` — returns all debates (public + private) where user is participant
- `getMyDebatesAttention()`: Already correctly scoped to `debate_participants`
- Personalized homepage: Add "Your Private Debates" section using new RPC

### Search for private content
- Current `search_content` only returns public rooms + user's own private rooms
- **Gap**: A participant in User B's private debate cannot search that debate's content
- **Recommendation for V1**: Do NOT extend search to participant-accessible private rooms. This is a V2 enhancement. V1 private debates are invitation-coordinated, not search-discovered by participants.

## 12. Privacy / Metadata Leakage

### Route-Level Leaks

| Route | Current Risk | Required Fix |
|-------|-------------|--------------|
| `/debates/[slug]` | `generateMetadata` calls `getDebateBySlug` before auth check | Move metadata generation after auth gate, or return generic metadata |
| `/debates/[slug]` | `DebateRoomPage` fetches debate data server-side without visibility check | Add server-side visibility check before rendering |
| `/discussions/[slug]` | Same pattern as debates | Add server-side visibility check |
| `/invite/[token]` | New route needed | Return generic "invitation" page without room details until joined |

### RSC Payload Leaks
- Server components fetch data before client rendering
- If `getDebateBySlug()` returns private data to unauthorized user, it appears in RSC payload
- **Fix**: All private room data must be fetched through visibility-aware RPCs or queries

### Client Cache Leaks
- TanStack Query cache persists across navigation
- If user loses access (removed), stale cache may still show private room data
- **Fix**: Invalidate queries on auth state change, and on visibility/participant changes

### OpenGraph / Metadata Leaks
- `generateMetadata` in debate/discussion pages runs server-side
- If it includes private room title/description, crawlers/auth users see it
- **Fix**: Return generic metadata for private rooms: `"Private Debate | Discora"`

### Prefetch / Preload Leaks
- Next.js may prefetch links in viewport
- If private room links appear in member discovery, they may be prefetched
- **Fix**: Acceptable for authorized users. For unauthorized users, private links should not appear in DOM.

## 13. Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| IDOR (room ID manipulation) | HIGH | RLS enforces `created_by = auth.uid()` or participant membership for private rooms |
| IDOR (slug enumeration) | MEDIUM | Slug is not secret; RLS still applies. Add rate limiting on 404s |
| Token guessing (invitation) | MEDIUM | 32+ char cryptographically random token. Stored as hash |
| Access code brute force | MEDIUM | 8-char alphanumeric = ~2.8T combinations. Rate limit: 3 attempts/min/room |
| Invitation replay | LOW | Token marked `accepted` after use. Cannot reuse |
| Revoked invitation reuse | LOW | Status check blocks revoked invitations |
| Removed-user re-entry | HIGH | RLS blocks removed participants. Old tokens/codes do not restore access |
| Private-room enumeration | MEDIUM | Private rooms excluded from all global feeds, search, views |
| Search leakage | MEDIUM | `search_content` already filters. Fix `getDebates()`/`getDiscussions()` |
| Profile leakage | LOW | No private room data in public profiles currently |
| Metadata leakage | MEDIUM | Server-side metadata gate required for private rooms |
| Client authorization bypass | LOW | Server-side enforcement; client hiding is defense-in-depth only |
| RLS bypass | LOW | All new tables/policies follow existing patterns. No SECURITY INVOKER bypass |
| SECURITY DEFINER abuse | LOW | New functions use `set search_path = public`, minimal privileges, auth checks |
| Participant privilege escalation | LOW | INSERT/UPDATE/DELETE on `debate_participants` restricted to self |
| Unauthorized Private → Public | LOW | Only owner can change visibility. RPC enforces this |
| Unauthorized Public → Private | MEDIUM | Blocked server-side in visibility-changing RPC. No UI path exists |
| Invitation spam | LOW | Rate limiting: 10 invitations/user/hour |
| Stale cached content | MEDIUM | TanStack Query invalidation on auth/participant changes |

## 14. UX Flow

### Owner Flow
1. Navigate to `/debates/create`
2. Select "Private Debate" radio button
3. Fill debate details (title, description, opening statement, topic)
4. Submit → creates private debate + auto-joins as proposition
5. Redirected to `/debates/{slug}`
6. Sees "Private Access" button in debate header
7. Clicks "Private Access" → opens management panel
8. Can: generate invitation link, generate access code, copy link, revoke invitations, toggle participant invites, remove participants, make debate public

### Invitee Flow (Link)
1. Opens invitation link: `/invite/{roomId}/{token}`
2. If unauthenticated: redirected to `/login?redirectedFrom=/invite/...`
3. After auth: redirected back to invitation
4. Sees: "You're invited to a private debate. Join to participate."
5. Clicks "Join Debate"
6. Creates `debate_participants` record
7. Marks invitation as `accepted`
8. Redirected to `/debates/{slug}`
9. Debate now appears in personalized feeds

### Invitee Flow (Access Code)
1. Opens `/join` page
2. Enters room ID + access code
3. If unauthenticated: redirected to login
4. After auth: returns to join page
5. Clicks "Join"
6. Same as above

### Unauthorized User Flow
1. Opens `/debates/{slug}` for private debate
2. Server checks authorization
3. Sees: "This is a private debate. You need an invitation or access code to participate."
4. Option to enter access code or request invitation (if enabled)
5. No debate title, premise, claims, or content visible

### Removed Participant Flow
1. Opens old `/debates/{slug}` URL
2. Server checks authorization
3. Sees: "This is a private debate. You no longer have access."
4. Old invitation link returns "Invalid or expired invitation"
5. Cannot rejoin while debate remains private

### Participant Flow
1. Joins private debate via invitation
2. Normal debate experience (arguments, evidence, inquiries, contributions)
3. Debate appears in "Your Debates" personalized section
4. Can invite others if owner enabled participant invitations

## 15. Future Private Discussions

**Reusable components**:
- `room_invitations` table (generic `room_id`)
- `accept_invitation` RPC (generic)
- `validate_access_code` RPC (generic)
- Private room RLS patterns on `rooms`, `messages`, `claims`, `evidence`, `questions`
- `room_memberships` concept (if we want to separate from `debate_participants`)

**Debate-specific components**:
- `debate_participants` table (side attribution)
- `switch_debate_side` RPC
- `debate_scorecard` UI
- Position history

**Recommendation**: Design `room_invitations` as a generic table from the start. Keep `debate_participants` debate-specific. When private Discussions are implemented, add a generic `room_participants` table or extend `messages`/`claims` with participation tracking.

## 16. Product Philosophy Alignment

Private Debate Rooms align with Discora's principles:

- **Understanding over engagement**: Private rooms enable focused, invited discussion rather than mass participation
- **Evidence over popularity**: Private debates are not subject to popularity metrics or public visibility pressure
- **Clarity over activity**: Small groups can explore claims without noise
- **Questions before conclusions**: Invited participants are more likely to engage genuinely
- **Neutrality**: Private setting reduces performative argumentation
- **Changing one's mind**: Safe space for position changes without public audience

**Anti-patterns explicitly avoided**:
- No follower mechanics
- No like/upvote systems
- No public participant counts on private rooms
- No trending/leaderboard inclusion for private rooms
- No gamification of invitations
- No social feed of private room activity

## 17. Open Product Decisions

1. **Access code entropy**: Should we use 6 characters (faster entry) or 8 characters (more secure)?
   - **Recommendation**: 8 characters for V1. Can reduce later if UX feedback demands it.

2. **Invitation link format**: Should we use `/invite/{roomId}/{token}` or `/join/{token}`?
   - **Recommendation**: `/invite/{roomId}/{token}` is more explicit and allows room pre-loading.

3. **Participant invitation permission default**: ON or OFF for new private debates?
   - **Recommendation**: OFF by default. Owner explicitly enables if desired.

4. **Access code scope**: One code per room (shareable) or one code per invitation (individual)?
   - **Recommendation**: One code per room for simplicity. Can generate multiple codes in V2.

5. **Private debate creation in feed**: Should owners see their private debates in `/debates` browse?
   - **Recommendation**: No. Owners should access via "Your Debates" personalized section or direct URL.

6. **Debate page privacy gate**: Should we show room title in the gate?
   - **Recommendation**: No. Show only "This is a private debate."

## 18. Recommended Implementation Sequence

| Phase | Scope | Dependencies |
|-------|-------|--------------|
| **A** | Database schema + RLS + SECURITY DEFINER functions | None |
| **B** | Fix existing privacy gaps (views, RPCs, services) | Phase A |
| **C** | Private debate creation UX + route guards | Phase B |
| **D** | Invitation/join flow (link + access code) | Phase B |
| **E** | Participant management UI (remove, invitations, settings) | Phase D |
| **F** | Private → Public transition | Phase B |
| **G** | Homepage/debate personalized discovery ("Your Debates") | Phase D |
| **H** | Search/privacy regression + production verification | Phase F |
| **I** | Browser QA + production migration verification | Phase H |

**Adjusted from original suggestion**: Phases B (fix existing gaps) must come before C (creation UX) because private debate creation would be unsafe if global feeds leak private rooms.

## 19. Risk Level

**MEDIUM**

**Rationale**:
- The database schema already partially supports private rooms (`visibility` column exists)
- RLS patterns for private rooms already exist and are well-tested
- The main risk is **incomplete enforcement** — several views and services leak private data
- No invitation infrastructure exists yet, so this is greenfield design
- The threat model is manageable with standard patterns
- **Not LOW** because: multiple existing leaks must be fixed, invitation system adds new attack surface, and metadata leakage in Next.js server components requires careful handling
- **Not HIGH** because: no social/reputation mechanics are involved, the scope is limited to debates V1, and the existing security foundation (Phase 3 hardening) is solid

## 20. Changes Made
- source: NONE
- database: NONE
- migrations: NONE
- dependencies: NONE
- production changes: NONE
- commits: NONE
