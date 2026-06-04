-- Sprint 6 Phase 1: Claims Foundation
-- Apply message reply integrity updates and create claims schema, triggers, RLS, and view.

-- 1. Apply Reply Integrity constraints to public.messages
alter table public.messages 
add constraint messages_no_self_reply 
check (parent_message_id is null or parent_message_id <> id);

-- 2. Update enforce_message_edit_rules to make parent_message_id immutable on update
create or replace function public.enforce_message_edit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Enforce 5-minute edit window
  if old.created_at < now() - interval '5 minutes' then
    raise exception 'Messages can only be edited within 5 minutes of creation.';
  end if;

  -- Prevent modifying immutable fields
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be modified.';
  end if;
  if new.room_id is distinct from old.room_id then
    raise exception 'room_id cannot be modified.';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be modified.';
  end if;
  if new.identity_mode is distinct from old.identity_mode then
    raise exception 'identity_mode cannot be modified.';
  end if;
  if new.parent_message_id is distinct from old.parent_message_id then
    raise exception 'parent_message_id cannot be modified.';
  end if;

  return new;
end;
$$;

-- 3. Create public.claims table
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  origin_message_id uuid references public.messages (id) on delete set null,
  content text not null,
  claim_type text not null,
  identity_mode text not null default 'public',
  is_retracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_content_length_check check (char_length(content) between 25 and 500),
  constraint claims_claim_type_check check (claim_type in ('fact', 'opinion', 'prediction', 'proposal', 'observation')),
  constraint claims_identity_mode_check check (identity_mode in ('public', 'anonymous'))
);

-- 4. Trigger to handle created_by metadata on Claims INSERT/UPDATE and validate origin_message_id room match
create or replace function public.handle_claim_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;

  -- Validate origin_message_id belongs to the same room as the claim
  if new.origin_message_id is not null then
    if not exists (
      select 1 from public.messages
      where id = new.origin_message_id and room_id = new.room_id
    ) then
      raise exception 'origin_message_id must belong to the same room as the claim.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists handle_claim_identity_mode on public.claims;
create trigger handle_claim_identity_mode
before insert or update on public.claims
for each row
execute function public.handle_claim_identity_mode();

-- 5. Trigger to enforce Claim immutability on UPDATE (only one-way retraction is allowed)
create or replace function public.enforce_claim_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent modifying any field other than is_retracted and updated_at
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.origin_message_id is distinct from old.origin_message_id or
     new.content is distinct from old.content or
     new.claim_type is distinct from old.claim_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Claims are immutable. Only retraction is permitted.';
  end if;

  -- Make retraction one-way
  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'Claims cannot be un-retracted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_claim_immutability on public.claims;
create trigger enforce_claim_immutability
before update on public.claims
for each row
execute function public.enforce_claim_immutability();

-- 5b. Trigger to prevent Claim deletion
create or replace function public.prevent_claim_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Claims cannot be deleted. Retraction is the only permitted action.';
end;
$$;

drop trigger if exists prevent_claim_deletion on public.claims;
create trigger prevent_claim_deletion
before delete on public.claims
for each row
execute function public.prevent_claim_deletion();

-- 6. Trigger to auto-update updated_at timestamp on Claims
drop trigger if exists set_claims_updated_at on public.claims;
create trigger set_claims_updated_at
before update on public.claims
for each row
execute function public.set_updated_at();

-- 7. Add database indexes for claims
create index if not exists claims_room_id_idx on public.claims (room_id);
create index if not exists claims_origin_message_id_idx on public.claims (origin_message_id);

-- 8. Enable Row Level Security (RLS) on claims
alter table public.claims enable row level security;

-- 9. Exclude raw claims from public SELECT access
revoke select on public.claims from anon, authenticated;

-- 10. RLS Insert and Update policies on raw claims
drop policy if exists "Authenticated users can create claims" on public.claims;
create policy "Authenticated users can create claims"
on public.claims
for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = room_id
  )
);

drop policy if exists "Authors can retract their claims" on public.claims;
create policy "Authors can retract their claims"
on public.claims
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 11. Security Definer View for public.claims to dynamically redact anonymous creators
create or replace view public.discussion_claims
with (security_invoker = false)
as
select
  c.id,
  c.room_id,
  c.origin_message_id,
  c.content,
  c.claim_type,
  c.identity_mode,
  c.is_retracted,
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
  end as avatar_url
from public.claims c
left join public.profiles p on c.created_by = p.id
where exists (
  select 1 from public.rooms r
  where r.id = c.room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
);

-- Grant SELECT access on the dynamic claims view to public roles
grant select on public.discussion_claims to anon, authenticated;
