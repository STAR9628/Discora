-- P0 pre-Sprint 7: Source dedup RPC + claim_evidence authorization hardening

-- ---------------------------------------------------------------------------
-- Phase 1: get_or_create_source (SECURITY DEFINER)
-- Resolves DB-FUNC-01 without granting SELECT on public.sources to clients.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_source(
  p_room_id uuid,
  p_title text,
  p_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_room_id is null then
    raise exception 'room_id is required.';
  end if;

  if p_url is null or char_length(trim(p_url)) = 0 then
    raise exception 'url is required.';
  end if;

  if p_title is null or char_length(p_title) < 5 or char_length(p_title) > 150 then
    raise exception 'title must be between 5 and 150 characters.';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  ) then
    raise exception 'Room is not accessible or does not allow new sources.';
  end if;

  select s.id
  into v_source_id
  from public.sources s
  where s.room_id = p_room_id
    and s.url = p_url
  limit 1;

  if v_source_id is not null then
    return v_source_id;
  end if;

  begin
    insert into public.sources (room_id, title, url)
    values (p_room_id, p_title, p_url)
    returning id into v_source_id;

    return v_source_id;
  exception
    when unique_violation then
      select s.id
      into v_source_id
      from public.sources s
      where s.room_id = p_room_id
        and s.url = p_url
      limit 1;

      if v_source_id is null then
        raise;
      end if;

      return v_source_id;
  end;
end;
$$;

revoke all on function public.get_or_create_source(uuid, text, text) from public;
grant execute on function public.get_or_create_source(uuid, text, text) to authenticated;

comment on function public.get_or_create_source(uuid, text, text) is
  'Room-scoped source lookup or insert. Returns source id only. SECURITY DEFINER; enforces room access for auth.uid().';

-- ---------------------------------------------------------------------------
-- Phase 2: claim_evidence RLS + link authorization trigger (DB-SEC-01)
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can link claim evidence" on public.claim_evidence;

create policy "Authenticated users can link claim evidence"
on public.claim_evidence
for insert
to authenticated
with check (
  exists (
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

create or replace function public.enforce_claim_evidence_link_authorization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_room_id uuid;
  v_evidence_created_by uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select c.room_id
  into v_claim_room_id
  from public.claims c
  where c.id = new.claim_id;

  if v_claim_room_id is null then
    raise exception 'Claim not found.';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = v_claim_room_id
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = auth.uid()
      )
  ) then
    raise exception 'Room is not accessible.';
  end if;

  select e.created_by
  into v_evidence_created_by
  from public.evidence e
  where e.id = new.evidence_id;

  if v_evidence_created_by is null then
    raise exception 'Evidence not found.';
  end if;

  if v_evidence_created_by is distinct from auth.uid() then
    raise exception 'Only the evidence author may link evidence to a claim.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_claim_evidence_link_authorization on public.claim_evidence;

create trigger enforce_claim_evidence_link_authorization
before insert on public.claim_evidence
for each row
execute function public.enforce_claim_evidence_link_authorization();

-- Room integrity: keep trigger on INSERT only (UPDATE already blocked by immutability).
drop trigger if exists validate_claim_evidence_rooms on public.claim_evidence;

create trigger validate_claim_evidence_rooms
before insert on public.claim_evidence
for each row
execute function public.validate_claim_evidence_rooms();
