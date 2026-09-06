-- Phase 5D remediation: add secure DB-layer save insertion
--
-- Why SECURITY DEFINER RPC instead of a trigger:
-- - Reuses existing public.has_room_access() without duplicating logic.
-- - Keeps target resolution and authorization in one auditable place.
-- - Avoids trigger edge cases with security_invoker views and RLS recursion.
-- - Prevents arbitrary target_type/target_id inserts from bypassing checks.

create or replace function public.save_target_secure(
  p_target_type text,
  p_target_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_save_id uuid;
begin
  if p_target_type not in ('discussion', 'debate', 'claim', 'evidence') then
    raise exception 'Invalid target type';
  end if;

  if p_target_type in ('discussion', 'debate') then
    if public.has_room_access(p_target_id) then
      select r.id into v_room_id
      from public.rooms r
      where r.id = p_target_id
        and r.status <> 'archived';
    else
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'claim' then
    select c.room_id into v_room_id
    from public.claims c
    where c.id = p_target_id
      and not c.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  elsif p_target_type = 'evidence' then
    select e.room_id into v_room_id
    from public.evidence e
    where e.id = p_target_id
      and not e.is_retracted;

    if v_room_id is null then
      raise exception 'Target not found or not accessible';
    end if;

    if not public.has_room_access(v_room_id) then
      raise exception 'Target not found or not accessible';
    end if;
  end if;

  insert into public.user_saves (user_id, target_type, target_id)
  values (auth.uid(), p_target_type, p_target_id)
  on conflict (user_id, target_type, target_id) do nothing
  returning id into v_save_id;

  return v_save_id;
end;
$$;

revoke all on function public.save_target_secure(text, uuid) from public, anon;
grant execute on function public.save_target_secure(text, uuid) to authenticated;
