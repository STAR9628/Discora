# Phase 9C.4 Phase A: Schema Hygiene & PostgREST Security Safeguards Implementation Report

**Status:** Complete & Verified  
**Phase:** 9C.4 Phase A (Schema Hygiene & PostgREST Security Safeguards)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Date:** September 14, 2026  

> [!IMPORTANT]
> **Phase A does not activate account deletion.**  
> The Danger Zone deletion button remains intentionally disabled (`disabled`, `cursor-not-allowed`, `opacity-50`). No destructive operations or GoTrue account deletions have been executed.

---

## 1. Executive Summary

Phase 9C.4 Phase A establishes the database schema safeguards, PostgREST fail-closed authorization boundaries, and privacy protections required prior to implementing actual account deletion orchestration in Phase B.

By introducing the centralized `public.is_active_user()` security helper and binding it into both room write authorization (`public.has_room_write_access`) and all independent table write RLS policies, Discora now enforces a dual-layer defense in depth that neutralizes in-flight JWT tokens held by de-identified/deleted accounts. Additionally, username handle retirement privacy has been established via zero-knowledge triggers, and governance audit records have been decoupled from cascade deletion.

---

## 2. Exact Changes & Migrations Created

### Migration Created:
- [`supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql`](file:///d:/Projects/Discora/supabase/migrations/202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql)

### Application Files Modified:
- [`src/types/domain.ts`](file:///d:/Projects/Discora/src/types/domain.ts): Added `isDeleted?: boolean;` field to `UserProfile`.
- [`src/features/profiles/services/profile-service.ts`](file:///d:/Projects/Discora/src/features/profiles/services/profile-service.ts): Added `is_deleted?: boolean;` to `DbProfileRow`, mapped `isDeleted: Boolean(row.is_deleted)`, and updated `getProfileByUsername` to filter out deleted accounts (returning `null` so profile visits resolve to standard 404).
- [`src/services/supabase/middleware.ts`](file:///d:/Projects/Discora/src/services/supabase/middleware.ts): Updated profile query to check `is_deleted`. If true, the middleware immediately halts the session, clears all Supabase authentication cookies, and redirects the request to `/`.

---

## 3. Database Functions Created / Modified

### 1. `public.is_active_user()` (NEW)
```sql
create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null 
    and not exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.is_deleted = true
    );
$$;

grant execute on function public.is_active_user() to anon, authenticated, service_role;
```
*Purpose:* Authoritative database-level guard. Evaluates whether the calling JWT belongs to an active, non-deleted user.

### 2. `public.has_room_write_access(p_room_id uuid)` (UPDATED)
Updated to require `public.is_active_user() and exists (...)`.
*Impact:* Automatically secures all room write paths (`messages`, `claims`, `evidence`, `sources`, `claim_evidence`, `claim_votes`, `arguments`) against in-flight JWT reuse once a user is marked `is_deleted = true`.

### 3. `public.check_username_not_retired()` & Trigger (NEW)
```sql
create or replace function public.check_username_not_retired()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.retired_handles 
    where lower(handle) = lower(trim(new.username))
  ) then
    raise exception 'username_unavailable' 
      using errcode = '23505', hint = 'This username is unavailable.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_username_not_retired_trigger on public.profiles;
create trigger check_username_not_retired_trigger
before insert or update of username on public.profiles
for each row
execute function public.check_username_not_retired();
```

### 4. `public.is_privileged_user(p_user_id uuid)` (NEW)
```sql
create or replace function public.is_privileged_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'moderator', 'system_owner')
  );
$$;

grant execute on function public.is_privileged_user(uuid) to service_role;
revoke execute on function public.is_privileged_user(uuid) from anon, authenticated;
```

### 5. Mutation RPCs Hardened (UPDATED)
- `public.toggle_reaction(text, uuid, text)`: Added `if v_user_id is null or not public.is_active_user() then raise exception 'not_authenticated'`.
- `public.create_claim_request(uuid)`: Added `if v_user_id is null or not public.is_active_user() then raise exception 'not_authenticated'`.
- `public.create_inquiry(uuid, uuid, text, text)`: Added `if v_user_id is null or not public.is_active_user() then raise exception 'not_authenticated'`.
- `public.respond_to_inquiry(uuid, text)`: Added `if v_user_id is null or not public.is_active_user() then raise exception 'not_authenticated'`.

---

## 4. RLS Policies Changed & Affected Tables

| Table | Policy Name | Command | Enforcement Logic |
|---|---|---|---|
| `public.profiles` | "Users can update their own profile" | `UPDATE` | `using (id = auth.uid() and not is_deleted and public.is_active_user()) with check (id = auth.uid() and not is_deleted and public.is_active_user())` |
| `public.reactions` | "Authenticated users can create reactions" | `INSERT` | `with check (user_id = auth.uid() and public.is_active_user() and public.has_room_access(room_id) and room not archived)` |
| `public.reactions` | "Users can delete their own reactions" | `DELETE` | `using (user_id = auth.uid() and public.is_active_user())` |
| `public.claim_requests` | "Authenticated users can create claim requests" | `INSERT` | `with check (requester_id = auth.uid() and public.is_active_user())` |
| `public.claim_requests` | "Requesters can update their own requests" | `UPDATE` | `using (requester_id = auth.uid() and public.is_active_user()) with check (requester_id = auth.uid() and public.is_active_user())` |
| `public.user_saves` | "Users can view own saves" | `SELECT` | `using (user_id = auth.uid() and public.is_active_user())` |
| `public.user_saves` | "Users can insert own saves" | `INSERT` | `with check (user_id = auth.uid() and public.is_active_user())` |
| `public.user_saves` | "Users can delete own saves" | `DELETE` | `using (user_id = auth.uid() and public.is_active_user())` |
| `public.user_preferences` | "Users can insert their own preferences" | `INSERT` | `with check (user_id = auth.uid() and public.is_active_user())` |
| `public.user_preferences` | "Users can update their own preferences" | `UPDATE` | `using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user())` |
| `storage.objects` (`avatars`) | "Users can upload their own avatar" | `INSERT` | `with check (bucket_id = 'avatars' and folder = auth.uid() and public.is_active_user() and valid_ext)` |
| `storage.objects` (`avatars`) | "Users can update their own avatar" | `UPDATE` | `using (bucket = 'avatars' and folder = auth.uid() and public.is_active_user()) with check (...)` |
| `storage.objects` (`avatars`) | "Users can delete their own avatar" | `DELETE` | `using (bucket = 'avatars' and folder = auth.uid() and public.is_active_user())` |

---

## 5. Security Invariants Now Enforced

1. **In-Flight JWT PostgREST Fail-Closed (SEC-01):** Once a user is marked `profiles.is_deleted = true`, any write operation sent via direct PostgREST calls with an existing, non-expired JWT fails closed at the RLS and RPC layer.
2. **Privilege Boundary (SEC-02):** No destructive deletion RPC is exposed to `authenticated` or `anon`.
3. **Retired Handle Privacy (SEC-04):** `public.retired_handles` has RLS enabled with all access revoked from `anon` and `authenticated`. Uniqueness collisions are handled privately by a `SECURITY DEFINER` trigger returning generic errors, preventing scraper enumeration.
4. **Storage Object Ownership (SEC-03):** Avatars bucket storage policies verify `(storage.foldername(name))[1] = auth.uid()::text` and require `public.is_active_user()`.
5. **Governance Audit Decoupling (SEC-07):** `public.admin_audit_logs.admin_id` foreign key is altered from `ON DELETE CASCADE` to `ON DELETE RESTRICT`, preventing governance records from being silently expunged.

---

## 6. Validation Results

- **TypeScript:** `npx tsc --noEmit` exited with code 0 (0 errors).
- **ESLint:** `npm run lint` exited with code 0 (0 errors, 40 existing non-blocking warnings).
- **Next.js Production Build:** `npm run build` completed in 14.5s with all 28 static and dynamic routes compiled successfully.
- **Google OAuth Regression Check:** Verified that Google Sign-In button, OAuth service methods (`loginWithGoogle`), and callback routes (`/auth/callback`) remain completely intact.
- **Supabase Auth SQL Check:** Verified 0 direct `auth.*` table modifications.

---

## 7. Playwright Browser QA Results

All 7 browser QA test scenarios passed on local dev server (`http://localhost:3000`):

1. **Login Page Google Sign-In:** **PASS** (Visible, branded Google logo SVG, styled, interactive).
2. **Login Page Email/Password Form:** **PASS** (Email, password, submit, forgot password, register links intact).
3. **Login Page Responsive Breakpoints:** **PASS** (Verified at 1440x900, 1280x800, 1024x768, 390x844, 375x812 with zero horizontal overflow). Screenshots captured: `login_1440x900`, `login_375x812`.
4. **Register Page Google Sign-In & Form:** **PASS** (Google button, email, password, confirm password, 18+ age checkbox, legal terms links present).
5. **Register Page Responsive Breakpoints:** **PASS** (Verified at 1440x900 and 375x812). Screenshots captured: `register_1440x900`, `register_375x812`.
6. **Settings Page Unauthenticated Redirect:** **PASS** (`/settings` redirects cleanly to `/login?redirectedFrom=%2Fsettings`).
7. **Console Error Inspection:** **PASS** (0 fatal console errors across all interactions).

---

## 8. Remaining Dependencies Before Phase B

1. **Production Migration Deployment:** Apply migration `202609140001_phase_9c4a_schema_hygiene_and_postgrest_safeguards.sql` to the production Supabase database via Supabase Dashboard / CLI.
2. **Phase B Implementation Authorization:** Product Owner explicit sign-off to proceed with Phase B (Database De-Identification RPC & Storage Cleanup Engine).

---
*Phase 9C.4 Phase A is complete and verified.*
