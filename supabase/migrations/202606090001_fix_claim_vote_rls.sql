-- Sprint 11.4: Fix claim_votes RLS — allow voting on claims in accessible rooms.
--
-- Root cause:
--   The claim_votes FOR ALL policy contains an EXISTS subquery:
--     SELECT 1 FROM public.claims c WHERE c.id = claim_id
--   PostgreSQL applies the claims SELECT RLS policy inside this subquery.
--   The existing claims SELECT policy restricts to created_by = auth.uid(),
--   making other users' claims invisible to the subquery. The EXISTS returns
--   false, the claim_votes policy blocks the upsert, and Supabase returns 42501.
--
-- Fix:
--   Add a second SELECT policy on public.claims that exposes claims in
--   accessible rooms (public + not archived, or the user's own private room).
--   PostgreSQL OR-combines multiple SELECT policies, so the existing
--   created_by = auth.uid() policy remains in effect.
--
-- Security:
--   The discussion_claims SECURITY DEFINER view already exposes this data.
--   The room-gating logic matches the existing claim_votes FOR ALL policy.
--   No new data is leaked. Retracted claims remain unvotable via the
--   claim_votes policy's is_retracted = false check.

drop policy if exists "Authenticated users can read claims in accessible rooms" on public.claims;

create policy "Authenticated users can read claims in accessible rooms"
on public.claims
for select
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_id
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
);

comment on policy "Authenticated users can read claims in accessible rooms" on public.claims is
  'Enables claim_votes RLS subquery to find claims in rooms the user can access. OR-combined with existing created_by = auth.uid() policy.';
