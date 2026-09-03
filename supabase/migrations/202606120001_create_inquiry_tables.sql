-- Migration: Create inquiry tables for MVP
-- This migration is append-only. It does not modify existing data.

-- 1. Create inquiry_items table
create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  inquirer_side text not null default 'inquiry',
  inquiry_type text not null check (inquiry_type in (
    'clarification',
    'evidence_request',
    'assumption_check'
  )),
  content text not null check (char_length(content) >= 10 and char_length(content) <= 2000),
  target_claim_id uuid not null references public.claims(id) on delete cascade,
  status text not null default 'open' check (status in (
    'open',
    'responded',
    'satisfied',
    'unsatisfied',
    'closed'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiry_items_room on public.inquiry_items(room_id, status, created_at desc);
create index if not exists idx_inquiry_items_claim on public.inquiry_items(target_claim_id);
create index if not exists idx_inquiry_items_creator on public.inquiry_items(created_by);
create index if not exists idx_inquiry_items_creator_room on public.inquiry_items(created_by, room_id);

-- 2. Create inquiry_responses table
create table if not exists public.inquiry_responses (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 10 and char_length(content) <= 5000),
  created_at timestamptz not null default now()
);

create index if not exists idx_inquiry_responses_item on public.inquiry_responses(inquiry_item_id, created_at);
create index if not exists idx_inquiry_responses_author on public.inquiry_responses(created_by);

-- 3. RLS policies for inquiry_items
alter table public.inquiry_items enable row level security;

drop policy if exists "Inquiry visibility matches room visibility" on public.inquiry_items;
create policy "Inquiry visibility matches room visibility"
  on public.inquiry_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id
        and (
          (r.visibility = 'public' and r.status <> 'archived')
          or r.created_by = auth.uid()
        )
    )
  );

drop policy if exists "Inquiry creation in accessible rooms" on public.inquiry_items;
create policy "Inquiry creation in accessible rooms"
  on public.inquiry_items
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
        and (r.visibility = 'public' or r.created_by = auth.uid())
    )
  );

drop policy if exists "Inquiry creator can update status" on public.inquiry_items;
create policy "Inquiry creator can update status"
  on public.inquiry_items
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- 4. RLS policies for inquiry_responses
alter table public.inquiry_responses enable row level security;

drop policy if exists "Response visibility matches inquiry visibility" on public.inquiry_responses;
create policy "Response visibility matches inquiry visibility"
  on public.inquiry_responses
  for select
  to authenticated
  using (
    exists (
      select 1 from public.inquiry_items ii
      join public.rooms r on r.id = ii.room_id
      where ii.id = inquiry_item_id
        and (r.visibility = 'public' or r.created_by = auth.uid())
    )
  );

drop policy if exists "Any user can respond to inquiries" on public.inquiry_responses;
create policy "Any user can respond to inquiries"
  on public.inquiry_responses
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- 5. Create inquiry RPCs
create or replace function public.create_inquiry(
  p_room_id uuid,
  p_target_claim_id uuid,
  p_inquiry_type text,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_inquiry_id uuid;
  v_inquiry_count int;
  v_current_side text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to create an inquiry.';
  end if;

  -- Rate limit check: 5 per hour
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id
    and created_at > now() - interval '1 hour';

  if v_inquiry_count >= 5 then
    raise exception 'rate_limit' using hint = 'Max 5 inquiries per hour.';
  end if;

  -- Debate cap check: 50 per user per debate
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id;

  if v_inquiry_count >= 50 then
    raise exception 'debate_cap' using hint = 'Max 50 inquiries per debate.';
  end if;

  -- Claim cap check: 20 per claim
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where target_claim_id = p_target_claim_id;

  if v_inquiry_count >= 20 then
    raise exception 'claim_cap' using hint = 'Max 20 inquiries per claim.';
  end if;

  -- Get current participation side for metadata
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    v_current_side := 'inquiry';
  end if;

  -- Create inquiry
  insert into public.inquiry_items (
    room_id, created_by, inquirer_side, inquiry_type, content, target_claim_id
  ) values (
    p_room_id, v_user_id, v_current_side, p_inquiry_type, p_content, p_target_claim_id
  ) returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$$;

create or replace function public.respond_to_inquiry(
  p_inquiry_item_id uuid,
  p_content text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_response_id uuid;
  v_current_status text;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using hint = 'You must be logged in to respond.';
  end if;

  -- Get current status and room_id
  select status, room_id into v_current_status, v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if v_current_status is null then
    raise exception 'not_found' using hint = 'Inquiry not found.';
  end if;

  if v_current_status in ('closed', 'satisfied') then
    raise exception 'inquiry_closed' using hint = 'Cannot respond to a closed or satisfied inquiry.';
  end if;

  -- Insert response
  insert into public.inquiry_responses (inquiry_item_id, created_by, content)
  values (p_inquiry_item_id, v_user_id, p_content)
  returning id into v_response_id;

  -- Update inquiry status if open or unsatisfied
  if v_current_status in ('open', 'unsatisfied') then
    update public.inquiry_items
    set status = 'responded', updated_at = now()
    where id = p_inquiry_item_id;
  end if;

  -- Create reputation event for response (+3)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_RESPONDED',
    3,
    jsonb_build_object(
      'inquiry_response_id', v_response_id,
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );

  return v_response_id;
end;
$$;

create or replace function public.satisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Only the inquirer can mark as satisfied
  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer' using hint = 'Only the inquiry creator can mark it as satisfied.';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  update public.inquiry_items
  set status = 'satisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;

  -- Create reputation event for satisfaction (+2)
  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_SATISFIED',
    2,
    jsonb_build_object(
      'inquiry_item_id', p_inquiry_item_id,
      'room_id', v_room_id
    )
  );
end;
$$;

create or replace function public.unsatisfy_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  update public.inquiry_items
  set status = 'unsatisfied', updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;
end;
$$;

create or replace function public.close_inquiry(
  p_inquiry_item_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer';
  end if;

  update public.inquiry_items
  set status = 'closed', updated_at = now()
  where id = p_inquiry_item_id and status not in ('closed', 'satisfied');

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry is already closed or satisfied.';
  end if;
end;
$$;

-- 6. Grant execute on RPCs
revoke all on function public.create_inquiry(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_inquiry(uuid, uuid, text, text) to authenticated;

revoke all on function public.respond_to_inquiry(uuid, text) from public, anon;
grant execute on function public.respond_to_inquiry(uuid, text) to authenticated;

revoke all on function public.satisfy_inquiry(uuid) from public, anon;
grant execute on function public.satisfy_inquiry(uuid) to authenticated;

revoke all on function public.unsatisfy_inquiry(uuid) from public, anon;
grant execute on function public.unsatisfy_inquiry(uuid) to authenticated;

revoke all on function public.close_inquiry(uuid) from public, anon;
grant execute on function public.close_inquiry(uuid) to authenticated;
