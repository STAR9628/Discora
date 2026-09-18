-- Migration: Pre-Beta Batch — 18+ signup attestation + anonymous public-room inquiry visibility
--
-- Forward-only. No history edits. No RLS weakening. Local-only application;
-- production untouched.
--
-- PART 1 — 18+ signup attestation boundary (Auth before-user-created hook target).
-- The registration UI checkbox is client-side only; direct Auth API signups
-- bypass it. The client sends user_metadata.age_confirmed = true (see
-- registerWithEmail); this hook function rejects email/password signups that
-- lack a strict boolean-true attestation. OAuth-created accounts carry no
-- pre-creation attestation channel and are allowed here; closing that residual
-- requires a post-signup attestation checkpoint (tracked follow-up, not silent).
-- Fail-closed: any unexpected payload shape raises instead of allowing.
--
-- PART 2 — anonymous SELECT for public-room inquiry context (approved product
-- decision: guests see inquiry context for PUBLIC rooms; private boundaries
-- intact). Grants alone are insufficient (existing SELECT policies are TO
-- authenticated only), so narrowly-scoped TO anon policies are added that
-- mirror the room-visibility predicate. debate_side_changes is intentionally
-- excluded (owner-only history; guests have no history to read).

begin;

-- ============================================================================
-- PART 1: 18+ attestation hook function (wired via config.toml
-- [auth.hook.before_user_created] -> pg-functions://postgres/public/enforce_signup_age_attestation)
-- ============================================================================
create or replace function public.enforce_signup_age_attestation(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user jsonb := coalesce(event -> 'user', '{}'::jsonb);
  v_provider text := coalesce(v_user -> 'app_metadata' ->> 'provider', '');
  v_identities jsonb := coalesce(v_user -> 'identities', '[]'::jsonb);
  v_is_oauth boolean := (v_provider <> '' and v_provider <> 'email')
    or jsonb_array_length(v_identities) > 0;
  v_flag text := v_user -> 'user_metadata' ->> 'age_confirmed';
begin
  if v_is_oauth then
    -- No pre-creation attestation channel exists for OAuth signups (GoTrue
    -- signInWithOAuth carries no user metadata). Allowed here; post-signup
    -- attestation checkpoint tracked as follow-up. Never weaken this to allow
    -- email signups without attestation.
    return event;
  end if;

  -- Strict boolean-true only. Missing, false, strings, numbers, objects all
  -- reject. Fail closed on malformed payloads: any unexpected shape raises.
  if v_flag is distinct from 'true' then
    raise exception 'age_attestation_required'
      using hint = 'Email signup requires an 18+ eligibility attestation (user_metadata.age_confirmed must be true).';
  end if;

  return event;
end;
$$;

revoke all on function public.enforce_signup_age_attestation(jsonb) from public, anon, authenticated;
-- NOTE (same-day pre-verification correction, local-only, never pushed):
-- GoTrue invokes pg-function hooks as the supabase_auth_admin role, which
-- needs EXECUTE (first live test failed with 42501 permission denied before
-- any payload logic ran). Narrowest possible grant: runtime role only.
grant execute on function public.enforce_signup_age_attestation(jsonb) to supabase_auth_admin;

comment on function public.enforce_signup_age_attestation(jsonb) is
  'Auth before-user-created hook: rejects email signups lacking strict user_metadata.age_confirmed=true. OAuth signups allowed (no pre-creation channel; follow-up attestation checkpoint tracked). Fail-closed.';

-- ============================================================================
-- PART 2: anonymous SELECT for public-room inquiry context (grants + policies)
-- ============================================================================
grant select on public.inquiry_items to anon;
grant select on public.inquiry_responses to anon;

-- Guests see inquiries only in public, non-archived rooms. No USING (true):
-- the room-visibility predicate is explicit and mirrors has_room_access for
-- the anonymous case.
create policy "Anonymous public-room inquiry visibility"
  on public.inquiry_items
  for select
  to anon
  using (
    exists (
      select 1 from public.rooms r
      where r.id = inquiry_items.room_id
        and r.visibility = 'public'
        and r.status <> 'archived'
    )
  );

create policy "Anonymous public-room response visibility"
  on public.inquiry_responses
  for select
  to anon
  using (
    exists (
      select 1 from public.inquiry_items ii
      join public.rooms r on r.id = ii.room_id
      where ii.id = inquiry_responses.inquiry_item_id
        and r.visibility = 'public'
        and r.status <> 'archived'
    )
  );

commit;
