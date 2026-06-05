-- Sprint 9: Create search_content() RPC for full-text search (ADR-025)

-- 1. Result type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'search_result_type') then
    create type public.search_result_type as enum (
      'room', 'message', 'claim', 'evidence', 'question'
    );
  end if;
end;
$$;

-- 2. Search function — two-phase execution: GIN match first, then join redacted views
create or replace function public.search_content(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_id uuid,
  result_type public.search_result_type,
  room_id uuid,
  room_slug text,
  room_title text,
  content text,
  excerpt text,
  author_username text,
  author_avatar_url text,
  created_at timestamptz,
  rank real,
  total_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with search_query as (
    select websearch_to_tsquery('english', p_query) as query
  ),
  ranked_rooms as (
    select
      r.id,
      'room'::public.search_result_type as result_type,
      ts_rank(r.search_vector, sq.query, 32) as rank,
      r.created_at
    from public.rooms r, search_query sq
    where sq.query is not null
      and r.search_vector @@ sq.query
      and r.status <> 'archived'
      and (r.visibility = 'public' or r.created_by = auth.uid())
  ),
  ranked_messages as (
    select
      m.id,
      'message'::public.search_result_type as result_type,
      ts_rank(m.search_vector, sq.query, 32) as rank,
      m.created_at
    from public.messages m, search_query sq
    where sq.query is not null
      and m.search_vector @@ sq.query
  ),
  ranked_claims as (
    select
      c.id,
      'claim'::public.search_result_type as result_type,
      ts_rank(c.search_vector, sq.query, 32) as rank,
      c.created_at
    from public.claims c, search_query sq
    where sq.query is not null
      and c.search_vector @@ sq.query
      and not c.is_retracted
  ),
  ranked_evidence as (
    select
      e.id,
      'evidence'::public.search_result_type as result_type,
      ts_rank(e.search_vector, sq.query, 32) as rank,
      e.created_at
    from public.evidence e, search_query sq
    where sq.query is not null
      and e.search_vector @@ sq.query
      and not e.is_retracted
  ),
  ranked_questions as (
    select
      q.id,
      'question'::public.search_result_type as result_type,
      ts_rank(q.search_vector, sq.query, 32) as rank,
      q.created_at
    from public.questions q, search_query sq
    where sq.query is not null
      and q.search_vector @@ sq.query
      and not q.is_retracted
  ),
  unified as (
    select id, result_type, rank, created_at from ranked_rooms
    union all
    select id, result_type, rank, created_at from ranked_messages
    union all
    select id, result_type, rank, created_at from ranked_claims
    union all
    select id, result_type, rank, created_at from ranked_evidence
    union all
    select id, result_type, rank, created_at from ranked_questions
  ),
  weighted as (
    select
      id,
      result_type,
      rank * case result_type
        when 'room' then 2.0
        when 'claim' then 1.5
        when 'question' then 1.3
        when 'evidence' then 1.0
        when 'message' then 0.8
      end as weighted_rank,
      created_at
    from unified
  ),
  visible_results as materialized (
    select w.id, w.result_type, w.weighted_rank, w.created_at
    from weighted w
    where
      (w.result_type = 'room' and exists (
        select 1 from public.rooms r
        where r.id = w.id
          and ((r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid())
      ))
      or (w.result_type = 'message' and exists (
        select 1 from public.discussion_messages dm where dm.id = w.id
      ))
      or (w.result_type = 'claim' and exists (
        select 1 from public.discussion_claims dc where dc.id = w.id
      ))
      or (w.result_type = 'evidence' and exists (
        select 1 from public.discussion_evidence de where de.id = w.id
      ))
      or (w.result_type = 'question' and exists (
        select 1 from public.discussion_questions dq where dq.id = w.id
      ))
  ),
  total_counts as (
    select count(*) as total_count from visible_results
  ),
  paginated_visible as (
    select id, result_type, weighted_rank, created_at
    from visible_results
    order by weighted_rank desc, created_at desc
    limit p_limit
    offset p_offset
  )
  select
    p.id,
    p.result_type,
    r.id,
    r.slug,
    r.title,
    r.description,
    ts_headline('english', coalesce(r.description, r.title), sq.query,
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt,
    null::text,
    null::text,
    r.created_at,
    p.weighted_rank,
    tc.total_count
  from paginated_visible p
  cross join search_query sq
  cross join total_counts tc
  join public.rooms r on r.id = p.id and p.result_type = 'room'
  where (r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()
  union all
  select
    p.id,
    p.result_type,
    dm.room_id,
    r.slug,
    r.title,
    dm.content,
    ts_headline('english', dm.content, sq.query,
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt,
    dm.username,
    dm.avatar_url,
    dm.created_at,
    p.weighted_rank,
    tc.total_count
  from paginated_visible p
  cross join search_query sq
  cross join total_counts tc
  join public.discussion_messages dm on dm.id = p.id and p.result_type = 'message'
  join public.rooms r on r.id = dm.room_id
  where (r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()
  union all
  select
    p.id,
    p.result_type,
    dc.room_id,
    r.slug,
    r.title,
    dc.content,
    ts_headline('english', dc.content, sq.query,
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt,
    dc.username,
    dc.avatar_url,
    dc.created_at,
    p.weighted_rank,
    tc.total_count
  from paginated_visible p
  cross join search_query sq
  cross join total_counts tc
  join public.discussion_claims dc on dc.id = p.id and p.result_type = 'claim'
  join public.rooms r on r.id = dc.room_id
  where (r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()
  union all
  select
    p.id,
    p.result_type,
    de.room_id,
    r.slug,
    r.title,
    de.content,
    ts_headline('english', de.content, sq.query,
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt,
    de.username,
    de.avatar_url,
    de.created_at,
    p.weighted_rank,
    tc.total_count
  from paginated_visible p
  cross join search_query sq
  cross join total_counts tc
  join public.discussion_evidence de on de.id = p.id and p.result_type = 'evidence'
  join public.rooms r on r.id = de.room_id
  where (r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()
  union all
  select
    p.id,
    p.result_type,
    dq.room_id,
    r.slug,
    r.title,
    dq.content,
    ts_headline('english', dq.content, sq.query,
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') as excerpt,
    dq.username,
    dq.avatar_url,
    dq.created_at,
    p.weighted_rank,
    tc.total_count
  from paginated_visible p
  cross join search_query sq
  cross join total_counts tc
  join public.discussion_questions dq on dq.id = p.id and p.result_type = 'question'
  join public.rooms r on r.id = dq.room_id
  where (r.visibility = 'public' and r.status <> 'archived') or r.created_by = auth.uid()
  order by weighted_rank desc, created_at desc;
$$;

revoke all on function public.search_content(text, integer, integer) from public, anon;
grant execute on function public.search_content(text, integer, integer) to authenticated;

comment on function public.search_content(text, integer, integer) is
  'Full-text search across rooms, messages, claims, evidence, questions (ADR-025). Uses english FTS config, length-normalized ts_rank with entity-type weights, and redacted discussion views for anonymity/moderation compliance.';
