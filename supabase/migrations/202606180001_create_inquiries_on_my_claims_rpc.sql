-- Migration: 202606180001_create_inquiries_on_my_claims_rpc.sql
-- Phase 3C-B.1: Epistemic Change Signals (Signal A)
-- Surfaces active Structured Inquiries opened by other participants against claims authored by the calling user.
-- SECURITY DEFINER with strictly pinned search_path; internally uses auth.uid().

create or replace function public.get_inquiries_on_my_claims(p_limit int default 5)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select coalesce(
  array(
    select json_build_object(
      'id', ii.id,
      'room_id', ii.room_id,
      'room_title', r.title,
      'room_slug', r.slug,
      'content', ii.content,
      'inquiry_type', ii.inquiry_type,
      'status', ii.status,
      'target_claim_id', c.id,
      'target_claim_content', c.content,
      'inquiry_username', case 
        when p.username is null then 'Deleted User'
        else p.username 
      end,
      'inquiry_avatar_url', p.avatar_url,
      'response_count', (
        select count(*) from inquiry_responses ir where ir.inquiry_item_id = ii.id
      ),
      'created_at', ii.created_at
    )
    from inquiry_items ii
    join claims c on c.id = ii.target_claim_id
    join rooms r on r.id = ii.room_id
    left join profiles p on p.id = ii.created_by
    where c.created_by = auth.uid()
      and ii.created_by != auth.uid()
      and c.is_retracted = false
      and ii.status in ('open', 'unsatisfied', 'responded')
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
      )
      and not exists (
        select 1 from moderation_flags mf
        where mf.claim_id = c.id and mf.status = 'resolved_hidden'
      )
    order by ii.created_at desc
    limit least(greatest(coalesce(p_limit, 5), 1), 20)
  ),
  '{}'::json[]
);
$$;

revoke all on function public.get_inquiries_on_my_claims(int) from public, anon;
grant execute on function public.get_inquiries_on_my_claims(int) to authenticated;

comment on function public.get_inquiries_on_my_claims(int) is
  'Phase 3C-B.1: Returns active structured inquiries targeting claims authored by the authenticated user.';
