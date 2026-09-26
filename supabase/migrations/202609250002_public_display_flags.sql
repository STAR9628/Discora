-- Migration: Phase 3B public display flags (additive, non-breaking).
--
-- Creates a narrowly scoped SECURITY DEFINER function returning ONLY the two
-- preference flags consumed by public profile rendering (show_expertise,
-- show_side_switches). show_reputation has no public-profile consumer and is
-- therefore excluded from cross-user reach.
--
-- Intentionally granted to anon + authenticated: public profile pages are
-- guest-reachable and server-rendered, and table RLS is self-only, so this
-- function is the designed public-read path for display metadata.
--
-- This migration does NOT modify or restrict the legacy
-- public.get_user_preferences(uuid): that restriction happens in a later
-- coordinated step AFTER all callers are switched and deployed.

create or replace function public.get_public_display_flags(p_user_id uuid)
returns table (
  show_expertise boolean,
  show_side_switches boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select up.show_expertise, up.show_side_switches
  from public.user_preferences up
  where up.user_id = p_user_id;
$$;

revoke all on function public.get_public_display_flags(uuid) from public, anon;
grant execute on function public.get_public_display_flags(uuid) to anon, authenticated;

comment on function public.get_public_display_flags(uuid) is
  'Public display-visibility flags for profile rendering (show_expertise, show_side_switches). Intentionally readable including anonymously; contains no identity or private data.';
