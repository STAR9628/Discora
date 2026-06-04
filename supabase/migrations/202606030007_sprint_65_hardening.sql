-- Sprint 6.5: RLS hardening, performance indexes (forward-only)

-- ---------------------------------------------------------------------------
-- RLS-04: Scope discussions SELECT to accessible rooms
-- ---------------------------------------------------------------------------
drop policy if exists "Discussions are readable by everyone" on public.discussions;

create policy "Discussions are readable when room is accessible"
on public.discussions
for select
using (
  exists (
    select 1
    from public.rooms r
    where r.id = discussions.id
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
      )
  )
);

-- ---------------------------------------------------------------------------
-- RLS-01: Scope inserts to non-archived, accessible rooms
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can post messages" on public.messages;

create policy "Authenticated users can post messages"
on public.messages
for insert
to authenticated
with check (
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

drop policy if exists "Authenticated users can create claims" on public.claims;

create policy "Authenticated users can create claims"
on public.claims
for insert
to authenticated
with check (
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

drop policy if exists "Authenticated users can create sources" on public.sources;

create policy "Authenticated users can create sources"
on public.sources
for insert
to authenticated
with check (
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

drop policy if exists "Authenticated users can assert evidence" on public.evidence;

create policy "Authenticated users can assert evidence"
on public.evidence
for insert
to authenticated
with check (
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

-- ---------------------------------------------------------------------------
-- RLS-02: Scope votes to claims/evidence in accessible rooms
-- ---------------------------------------------------------------------------
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
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  )
);

-- ---------------------------------------------------------------------------
-- Composite indexes for feed, tabs, and future keyset pagination
-- ---------------------------------------------------------------------------
create index if not exists messages_room_id_created_at_idx
  on public.messages (room_id, created_at desc);

create index if not exists claims_room_id_created_at_idx
  on public.claims (room_id, created_at desc);

create index if not exists evidence_room_id_created_at_idx
  on public.evidence (room_id, created_at desc);

create index if not exists rooms_discussion_feed_idx
  on public.rooms (created_at desc)
  where room_type = 'discussion';
