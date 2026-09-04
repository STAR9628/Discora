-- Migration: 202606180002_create_new_evidence_on_voted_claims_rpc.sql
-- Phase 3C-B.2: Epistemic Change Signals (Signal B)
-- Surfaces new supporting, contradicting, or contextual evidence attached to claims
-- after the authenticated user's latest stance commitment (ce.created_at > cv.updated_at).
-- SECURITY DEFINER with strictly pinned search_path; internally uses auth.uid().

create or replace function public.get_new_evidence_on_voted_claims(p_limit int default 5)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select coalesce(
  array(
    select json_build_object(
      'evidence_id', e.id,
      'evidence_content', e.content,
      'evidence_type', e.evidence_type,
      'evidence_created_at', ce.created_at,
      'direction', ce.direction,
      'source_title', s.title,
      'source_url', s.url,
      'claim_id', c.id,
      'claim_content', c.content,
      'user_vote', cv.vote_type,
      'room_id', r.id,
      'room_title', r.title,
      'room_slug', r.slug,
      'room_type', r.room_type,
      'author_username', case
        when e.identity_mode = 'anonymous' then 'Anonymous'
        when p.username is null then 'Deleted User'
        else p.username
      end,
      'author_avatar_url', case
        when e.identity_mode = 'anonymous' then null
        else p.avatar_url
      end
    )
    from claim_votes cv
    join claims c on c.id = cv.claim_id
    join claim_evidence ce on ce.claim_id = c.id
    join evidence e on e.id = ce.evidence_id
    left join sources s on s.id = e.source_id
    join rooms r on r.id = c.room_id
    left join profiles p on p.id = e.created_by
    where cv.user_id = auth.uid()
      and ce.created_at > cv.updated_at
      and ce.created_at >= now() - interval '14 days'
      and c.is_retracted = false
      and e.is_retracted = false
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
      )
      and not exists (
        select 1 from moderation_flags mf
        where mf.claim_id = c.id and mf.status = 'resolved_hidden'
      )
      and not exists (
        select 1 from moderation_flags mf
        where mf.evidence_id = e.id and mf.status = 'resolved_hidden'
      )
    order by ce.created_at desc, e.id desc
    limit least(greatest(coalesce(p_limit, 5), 1), 20)
  ),
  '{}'::json[]
);
$$;

revoke all on function public.get_new_evidence_on_voted_claims(int) from public, anon;
grant execute on function public.get_new_evidence_on_voted_claims(int) to authenticated;

comment on function public.get_new_evidence_on_voted_claims(int) is
  'Phase 3C-B.2: Returns new evidence attached to voted claims strictly after the caller''s latest stance update.';
