-- Sprint 7 preflight: Block new and changed votes on retracted claims and evidence.
-- Historical vote rows are preserved; consensus views continue to include them.

drop policy if exists "Authenticated users can vote on claims" on public.claim_votes;

create policy "Authenticated users can vote on claims"
on public.claim_votes
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.claims c
    join public.rooms r on r.id = c.room_id
    where c.id = claim_id
      and c.is_retracted = false
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.claims c
    join public.rooms r on r.id = c.room_id
    where c.id = claim_id
      and c.is_retracted = false
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
);

drop policy if exists "Authenticated users can vote on evidence" on public.evidence_votes;

create policy "Authenticated users can vote on evidence"
on public.evidence_votes
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.evidence e
    join public.rooms r on r.id = e.room_id
    where e.id = evidence_id
      and e.is_retracted = false
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.evidence e
    join public.rooms r on r.id = e.room_id
    where e.id = evidence_id
      and e.is_retracted = false
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
);

comment on policy "Authenticated users can vote on claims" on public.claim_votes is
  'Votes require accessible room and non-retracted claim. INSERT/UPDATE/DELETE blocked after retraction; existing rows remain.';

comment on policy "Authenticated users can vote on evidence" on public.evidence_votes is
  'Votes require accessible room and non-retracted evidence. INSERT/UPDATE/DELETE blocked after retraction; existing rows remain.';
