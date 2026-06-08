-- Sprint 11.3: Restore SELECT privilege on base tables for mutation RETURNING clauses.
--
-- Root cause: `REVOKE SELECT ... FROM authenticated` prevents `INSERT ... RETURNING`
-- and `UPDATE ... RETURNING` from returning row data (e.g. `.select("id")`).
-- All public reads already flow through SECURITY DEFINER views (discussion_messages,
-- discussion_claims, discussion_evidence, discussion_questions). The SELECT policies
-- below scope base-table reads to the user's own rows, giving RETURNING enough
-- access to return the new row while keeping bulk reads on the views.

-- First restore SELECT at the role level (REVOKE overrides RLS policies).
grant select on public.messages to anon, authenticated;
grant select on public.claims to anon, authenticated;
grant select on public.questions to anon, authenticated;
grant select on public.evidence to anon, authenticated;
grant select on public.sources to anon, authenticated;
grant select on public.claim_evidence to anon, authenticated;
grant select on public.claim_votes to anon, authenticated;
grant select on public.evidence_votes to anon, authenticated;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own messages" on public.messages;
create policy "Users can read their own messages"
on public.messages
for select
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- claims
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own claims" on public.claims;
create policy "Users can read their own claims"
on public.claims
for select
to authenticated
using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own questions" on public.questions;
create policy "Users can read their own questions"
on public.questions
for select
to authenticated
using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- evidence
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own evidence" on public.evidence;
create policy "Users can read their own evidence"
on public.evidence
for select
to authenticated
using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- sources (used by get_or_create_source RPC which is SECURITY DEFINER,
-- but evidence insert needs to RETURNING)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own sources" on public.sources;
create policy "Users can read their own sources"
on public.sources
for select
to authenticated
using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- claim_evidence (junction table, no direct user FK — allow limited select)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read claim evidence for accessible claims" on public.claim_evidence;
create policy "Users can read claim evidence for accessible claims"
on public.claim_evidence
for select
to authenticated
using (
  exists (
    select 1 from public.claims c
    join public.rooms r on r.id = c.room_id
    where c.id = claim_id
      and (r.visibility = 'public' or r.created_by = auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- claim_votes
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own claim votes" on public.claim_votes;
create policy "Users can read their own claim votes"
on public.claim_votes
for select
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- evidence_votes
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own evidence votes" on public.evidence_votes;
create policy "Users can read their own evidence votes"
on public.evidence_votes
for select
to authenticated
using (user_id = auth.uid());
