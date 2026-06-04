# ADR-024: Moderator Authorization Model

* **Status:** Finalized (Hardened)
* **Date:** 2026-06-04
* **Author:** Antigravity Architecture Team
* **Related:** `docs/16_ARCHITECTURE_DECISIONS.md`, `docs/44_SPRINT_8_ADR_DRAFT.md`, `docs/47_MODERATION_VS_SEARCH_DECISION.md`, `docs/49_SPRINT_8_GATE_REVIEW.md`

---

## 1. Context & Problem Statement

To support **Anonymity-Preserving Moderation** (ADR-023), Discora must identify and authorize moderators. RLS policies, database views, and API endpoints must restrict administrative write actions (resolving flags, locking threads) to verified moderators. 

We need a secure, high-performance, and auditable role mapping architecture that prevents privilege escalation, propagates changes to active sessions promptly, and handles users who possess multiple roles (e.g. `'moderator'` and `'admin'`) without introducing nondeterministic query behaviors.

---

## 2. Alternatives Considered

We evaluated three potential designs for role storage and authorization:

### Option A: Profile Column (`public.profiles.role`)
Add a `role` enum column (`'user'`, `'moderator'`, `'admin'`) to the existing profiles table.
* **Why Rejected:** High privilege escalation surface. Standard users can update their profiles. Blocking edits to the `role` column requires complex triggers which are error-prone.

### Option B: Separate Roles Table (`public.user_roles`)
Create a dedicated `public.user_roles` table mapping user UUIDs to role enums.
* **Why Chosen:** High security isolation. standard users have no read/write access to this table. Promotion/demotion updates are immediate in all RLS evaluations. Supports assigning multiple roles to a user.

### Option C: JWT Custom Claims / App Metadata (`auth.users.app_metadata`)
Store roles in Supabase Auth's `app_metadata` inside the `auth.users` schema.
* **Why Rejected:** Token caching delay. Revoking moderation status could take up to 1 hour to propagate.

---

## 3. Recommended Decision

We recommend **Option B: Separate Roles Table (`public.user_roles`) combined with a Deterministic Role Rank Helper Function**.

This separates standard profile attributes from authorization. RLS policies query a stable helper function `public.has_role_or_higher(auth.uid(), 'moderator')` which Postgres executes as `SECURITY DEFINER`.

### Role Hierarchy Rules:
* The roles enum contains: `'moderator'`, `'admin'`.
* Admin is a superset of Moderator. If a policy requires `'moderator'`, users with the `'admin'` role are automatically authorized.
* Standard users have **no select, insert, update, or delete** rights on `public.user_roles`.

---

## 4. Deterministic Helper Function Design

To prevent nondeterministic results when a user holds multiple role mappings, the `has_role_or_higher` function checks for the existence of the required role or any higher rank directly in the query:

```sql
create or replace function public.has_role_or_higher(p_user_id uuid, p_required_role public.user_role_type)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id
      and (
        ur.role = p_required_role
        or (p_required_role = 'moderator'::public.user_role_type and ur.role = 'admin'::public.user_role_type)
      )
  );
$$;
```

---

## 5. Answers to Specific Questions

### 1. How should moderator permissions be checked inside RLS policies?
RLS policies check permissions using: `public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type)`.

### 2. How should moderator permissions be checked inside React UI?
Upon login, the auth service returns the user profile metadata including active roles, which is stored in the React Auth Context (`useAuth()`). The UI checks `user.role === 'moderator'` or `user.role === 'admin'` to show/hide moderation controls.

### 3. How should moderator status changes propagate to active sessions?
* **Database level:** Propagation is instant. The moment a row is deleted from `public.user_roles`, any subsequent RLS query immediately evaluates to `false`.
* **UI level:** The React client can catch API 403 Forbidden errors to trigger a profile refetch.

### 4. How should future admin roles fit into the same model?
Future admin roles (e.g. `'super_admin'`) can be added to the enum, and the conditional block in `has_role_or_higher` will be updated to include them in the hierarchy checks, requiring zero rewrites of RLS policies.

### 5. How can we avoid creating multiple competing role systems?
By enforcing `public.user_roles` as the single database source of truth. JWT metadata is merely cached and must never be trusted as the final authority on write operations.

---

## 6. Migration Implications & SQL Examples

### Schema Migration Sketch
```sql
create type public.user_role_type as enum ('moderator', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role_type not null,
  created_at timestamptz not null default now(),
  constraint unique_user_role unique (user_id, role)
);

-- Enable RLS but define zero public policies (blocks all standard client read/writes)
alter table public.user_roles enable row level security;
revoke select, insert, update, delete on public.user_roles from anon, authenticated;
```

### RLS Usage Example
```sql
create policy "Moderators can update flags"
on public.moderation_flags
for update
to authenticated
using (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type))
with check (public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type));
```
