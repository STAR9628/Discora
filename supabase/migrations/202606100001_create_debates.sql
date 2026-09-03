-- Migration: Create debate system
-- Adds debate rooms, participant tracking, and claim side attribution.

-- 1. Add debate_side to claims
alter table public.claims add column if not exists debate_side text
  check (debate_side in ('proposition', 'opposition'));

-- 2. Create debates table (metadata for debate rooms, analogous to discussions)
create table if not exists public.debates (
  id uuid primary key references public.rooms(id) on delete cascade,
  proposition_title text not null,
  opposition_title text not null,
  opening_statement text,
  status text not null default 'active'
    check (status in ('active', 'resolved', 'closed')),
  resolution jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create debate_participants table
create table if not exists public.debate_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('proposition', 'opposition', 'neutral')),
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

-- 4. Indexes
create index if not exists idx_debate_participants_room
  on public.debate_participants(room_id, side);

-- 5. Update discussion_claims view to include debate_side
drop view if exists public.moderation_queue;
drop view if exists public.discussion_claims;

create or replace view public.discussion_claims
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.question_id,
  c.content,
  c.claim_type,
  c.context_type,
  c.identity_mode,
  c.is_retracted,
  c.debate_side,
  c.created_at,
  c.updated_at,
  case
    when c.identity_mode = 'anonymous' then null
    else c.created_by
  end as created_by,
  case
    when c.identity_mode = 'anonymous' then 'Anonymous'
    when p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  coalesce(v.agree_count, 0) as agree_count,
  coalesce(v.disagree_count, 0) as disagree_count,
  case
    when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
    else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
  end as consensus_ratio,
  (
    select vote_type from public.claim_votes cv
    where cv.claim_id = c.id and cv.user_id = auth.uid()
  ) as user_vote
from public.claims c
left join public.profiles p on c.created_by = p.id
left join (
  select
    claim_id,
    count(*) filter (where vote_type = 'agree') as agree_count,
    count(*) filter (where vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_id
) v on c.id = v.claim_id
where exists (
  select 1 from public.rooms r
  where r.id = c.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
)
and not exists (
  select 1 from public.moderation_flags mf
  where mf.claim_id = c.id and mf.status = 'resolved_hidden'
);

grant select on public.discussion_claims to anon, authenticated;

-- 6. Create discussion_debates view
create or replace view public.discussion_debates
as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.resolution,
  d.created_at,
  d.updated_at,
  coalesce(pc.count, 0) as proposition_claim_count,
  coalesce(oc.count, 0) as opposition_claim_count,
  coalesce(pp.count, 0) as proposition_participant_count,
  coalesce(op.count, 0) as opposition_participant_count,
  coalesce(np.count, 0) as neutral_participant_count
from public.debates d
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'proposition' and not is_retracted
  group by room_id
) pc on d.id = pc.room_id
left join (
  select room_id, count(*) as count
  from public.claims
  where debate_side = 'opposition' and not is_retracted
  group by room_id
) oc on d.id = oc.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'proposition'
  group by room_id
) pp on d.id = pp.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'opposition'
  group by room_id
) op on d.id = op.room_id
left join (
  select room_id, count(*) as count
  from public.debate_participants
  where side = 'neutral'
  group by room_id
) np on d.id = np.room_id
where exists (
  select 1 from public.rooms r
  where r.id = d.id and r.room_type = 'debate'
);

grant select on public.discussion_debates to anon, authenticated;

-- 7. Create debate room RPC
create or replace function public.create_debate_room(
  p_title text,
  p_description text,
  p_topic_id uuid,
  p_proposition_title text,
  p_opposition_title text,
  p_opening_statement text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  insert into public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
  values (p_title, p_description, 'debate', p_topic_id, 'public', 'open', auth.uid())
  returning id into v_room_id;

  insert into public.debates (id, proposition_title, opposition_title, opening_statement)
  values (v_room_id, p_proposition_title, p_opposition_title, p_opening_statement);

  return v_room_id;
end;
$$;

-- 8. RLS for debate_participants
alter table public.debate_participants enable row level security;

create policy "Anyone can view debate participants"
  on public.debate_participants for select
  using (true);

create policy "Users can join debates"
  on public.debate_participants for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own participation"
  on public.debate_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can leave debates"
  on public.debate_participants for delete
  using (auth.uid() = user_id);

-- 9. RLS for debates
alter table public.debates enable row level security;

create policy "Anyone can view debates"
  on public.debates for select
  using (exists (
    select 1 from public.rooms r
    where r.id = id and r.visibility = 'public'
  ));

create policy "Debate creators can update debates"
  on public.debates for update
  using (exists (
    select 1 from public.rooms r
    where r.id = id and r.created_by = auth.uid()
  ));

-- 10. Recreate moderation_queue view (depends on discussion_claims)
create or replace view public.moderation_queue
with (security_invoker = false)
as
select
  f.id,
  f.message_id,
  f.question_id,
  f.claim_id,
  f.evidence_id,
  case
    when f.message_id is not null then 'message'
    when f.question_id is not null then 'question'
    when f.claim_id is not null then 'claim'
    when f.evidence_id is not null then 'evidence'
    else 'unknown'
  end as entity_type,
  f.reason,
  f.status,
  f.created_at,
  f.resolved_at,
  coalesce(dm.content, dq.content, dc.content, de.content) as content,
  coalesce(dm.username, dq.username, dc.username, de.username) as author_username,
  coalesce(dm.avatar_url, dq.avatar_url, dc.avatar_url, de.avatar_url) as author_avatar_url
from public.moderation_flags f
left join public.discussion_messages dm on dm.id = f.message_id
left join public.discussion_questions dq on dq.id = f.question_id
left join public.discussion_claims dc on dc.id = f.claim_id
left join public.discussion_evidence de on de.id = f.evidence_id
where public.has_role_or_higher(auth.uid(), 'moderator'::public.user_role_type);

revoke all on public.moderation_queue from public, anon;
