-- Homepage RPCs for guest and logged-in experiences
-- All use security definer to bypass RLS for aggregate reads

-- ============================================================
-- 1. Guest: Platform-wide understanding metrics
-- ============================================================
create or replace function public.get_homepage_metrics()
returns json
language sql
security definer
stable
as $$
select json_build_object(
  'open_inquiries', (select count(*) from inquiry_items where status not in ('satisfied', 'closed')),
  'claims_with_evidence', (select count(distinct claim_id) from claim_evidence),
  'debates_both_sides', (
    select count(*) from debates d
    where exists (select 1 from debate_participants dp where dp.room_id = d.id and dp.side = 'proposition')
    and exists (select 1 from debate_participants dp where dp.room_id = d.id and dp.side = 'opposition')
  ),
  'satisfied_today', (
    select count(*) from inquiry_items
    where status = 'satisfied' and updated_at >= current_date
  )
);
$$;

-- ============================================================
-- 2. Guest: Featured inquiries for spotlight
-- ============================================================
create or replace function public.get_featured_inquiries(p_limit int default 3)
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'id', ii.id,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'status', ii.status,
    'target_claim_content', (
      select content from claims c where c.id = ii.target_claim_id
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'created_at', ii.created_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.status in ('open', 'responded')
  order by ii.updated_at desc
  limit p_limit
);
$$;

-- ============================================================
-- 3. Logged-in: My open (unresolved) inquiries
-- ============================================================
create or replace function public.get_my_open_inquiries()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'id', ii.id,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'status', ii.status,
    'target_claim_content', (
      select content from claims c where c.id = ii.target_claim_id
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'created_at', ii.created_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.created_by = auth.uid()
    and ii.status not in ('satisfied', 'closed')
  order by ii.updated_at desc
);
$$;

-- ============================================================
-- 4. Logged-in: My inquiries with pending responses
-- ============================================================
create or replace function public.get_my_inquiry_responses()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'inquiry_id', ii.id,
    'inquiry_content', ii.content,
    'inquiry_type', ii.inquiry_type,
    'room_id', ii.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'latest_response_content', (
      select content from inquiry_responses ir
      where ir.inquiry_item_id = ii.id
      order by ir.created_at desc
      limit 1
    ),
    'latest_response_username', (
      select p.username from inquiry_responses ir
      join profiles p on p.id = ir.created_by
      where ir.inquiry_item_id = ii.id
      order by ir.created_at desc
      limit 1
    ),
    'response_count', (
      select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
    ),
    'updated_at', ii.updated_at
  )
  from inquiry_items ii
  join rooms r on r.id = ii.room_id
  where ii.created_by = auth.uid()
    and ii.status = 'responded'
  order by ii.updated_at desc
);
$$;

-- ============================================================
-- 5. Logged-in: My debates needing attention
-- ============================================================
create or replace function public.get_my_debates_attention()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'room_id', d.id,
    'title', d.title,
    'slug', d.slug,
    'proposition_title', d.proposition_title,
    'opposition_title', d.opposition_title,
    'status', d.status,
    'my_side', dp.side,
    'my_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id and c.created_by = auth.uid() and c.is_retracted = false
    ),
    'opposing_claim_count', (
      select count(*) from claims c
      where c.room_id = d.id
        and c.created_by != auth.uid()
        and c.debate_side != dp.side
        and c.is_retracted = false
    ),
    'last_activity_at', d.last_activity_at
  )
  from discussion_debates d
  join debate_participants dp on dp.room_id = d.id and dp.user_id = auth.uid()
  where d.status = 'active'
    and dp.side in ('proposition', 'opposition')
  order by d.last_activity_at desc nulls last
);
$$;

-- ============================================================
-- 6. Logged-in: New evidence on topics I've participated in
-- ============================================================
create or replace function public.get_my_topic_evidence(p_days int default 7)
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'topic_id', t.id,
    'topic_name', t.name,
    'evidence_count', (
      select count(distinct e3.id)
      from evidence e3
      join rooms r3 on r3.id = e3.room_id
      where r3.topic_id = t.id
        and e3.created_at >= current_date - p_days
        and e3.is_retracted = false
    ),
    'rooms', (
      select json_agg(json_build_object(
        'room_id', r2.id,
        'room_title', r2.title,
        'room_slug', r2.slug
      ))
      from (
        select distinct r3.id, r3.title, r3.slug
        from evidence e2
        join rooms r3 on r3.id = e2.room_id
        where e2.created_at >= current_date - p_days
          and e2.is_retracted = false
          and r3.topic_id = t.id
          and r3.id not in (
            select room_id from debate_participants where user_id = auth.uid()
            union
            select distinct room_id from messages where user_id = auth.uid()
          )
      ) r2
    )
  )
  from topics t
  where exists (
    select 1 from rooms r
    where r.topic_id = t.id
      and (
        r.id in (select room_id from debate_participants where user_id = auth.uid())
        or r.id in (select distinct room_id from messages where user_id = auth.uid())
      )
  )
  and exists (
    select 1 from evidence e
    join rooms r on r.id = e.room_id
    where r.topic_id = t.id
      and e.created_at >= current_date - p_days
      and e.is_retracted = false
  )
  group by t.id, t.name
);
$$;

-- ============================================================
-- 7. Logged-in: Understanding evolved (consensus shifts + linked evidence)
-- ============================================================
create or replace function public.get_my_understanding_evolved()
returns json[]
language sql
security definer
stable
as $$
select array(
  select json_build_object(
    'claim_id', c.id,
    'claim_content', c.content,
    'room_id', c.room_id,
    'room_title', r.title,
    'room_slug', r.slug,
    'my_vote', cv.vote_type,
    'agree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
    ),
    'disagree_count', (
      select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
    ),
    'consensus_ratio', (
      case
        when (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree'
        ) + (
          select count(*) from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'
        ) > 0
        then round(
          (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
          /
          nullif(
            (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'agree')
            + (select count(*)::numeric from claim_votes cv2 where cv2.claim_id = c.id and cv2.vote_type = 'disagree'),
            0
          )
          * 100
        )
        else null
      end
    ),
    'evidence_count', (
      select count(*) from claim_evidence ce
      join evidence e on e.id = ce.evidence_id
      where ce.claim_id = c.id and e.is_retracted = false
    ),
    'latest_evidence', (
      select content from evidence e
      join claim_evidence ce on ce.evidence_id = e.id
      where ce.claim_id = c.id and e.is_retracted = false
      order by e.created_at desc
      limit 1
    )
  )
  from claims c
  join rooms r on r.id = c.room_id
  join claim_votes cv on cv.claim_id = c.id and cv.user_id = auth.uid()
  where c.is_retracted = false
  order by c.updated_at desc
  limit 10
);
$$;

-- Grant execute to authenticated (and anon for guest-facing RPCs)
grant execute on function public.get_homepage_metrics to anon, authenticated;
grant execute on function public.get_featured_inquiries to anon, authenticated;
grant execute on function public.get_my_open_inquiries to authenticated;
grant execute on function public.get_my_inquiry_responses to authenticated;
grant execute on function public.get_my_debates_attention to authenticated;
grant execute on function public.get_my_topic_evidence to authenticated;
grant execute on function public.get_my_understanding_evolved to authenticated;
