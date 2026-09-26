-- ============================================================================
-- Migration: 202609260001_content_lifecycle_foundation.sql
-- Description: Discora Content Lifecycle Implementation
--   - Author 5-minute edit window across all discourse content types
--   - Author 5-minute soft-deletion window across all discourse content types
--   - Discussion owner 1-hour archival/deletion window
--   - BEFORE DELETE guard on rooms to prevent catastrophic ON DELETE CASCADE
--   - Centralized content_revisions table with admin-only inspection
--   - Updated public views filtering soft-deleted content and exposing is_edited
--   - Retraction remains distinct and available after 5 minutes
--   - Admin inspection functions for deleted content and revision history
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function: is_current_user_admin()
-- ----------------------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'::public.user_role_type
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. Schema Additions: lifecycle columns
-- ----------------------------------------------------------------------------
-- messages
alter table public.messages add column if not exists deleted_at timestamptz default null;
alter table public.messages add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.messages add column if not exists is_edited boolean not null default false;
alter table public.messages add column if not exists edited_at timestamptz default null;

-- claims
alter table public.claims add column if not exists is_edited boolean not null default false;
alter table public.claims add column if not exists edited_at timestamptz default null;

-- arguments
alter table public.arguments add column if not exists is_edited boolean not null default false;
alter table public.arguments add column if not exists edited_at timestamptz default null;

-- evidence
alter table public.evidence add column if not exists deleted_at timestamptz default null;
alter table public.evidence add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.evidence add column if not exists is_edited boolean not null default false;
alter table public.evidence add column if not exists edited_at timestamptz default null;

-- questions
alter table public.questions add column if not exists deleted_at timestamptz default null;
alter table public.questions add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.questions add column if not exists is_edited boolean not null default false;
alter table public.questions add column if not exists edited_at timestamptz default null;

-- inquiry_items
alter table public.inquiry_items add column if not exists deleted_at timestamptz default null;
alter table public.inquiry_items add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.inquiry_items add column if not exists is_edited boolean not null default false;
alter table public.inquiry_items add column if not exists edited_at timestamptz default null;

-- inquiry_responses
alter table public.inquiry_responses add column if not exists deleted_at timestamptz default null;
alter table public.inquiry_responses add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.inquiry_responses add column if not exists is_edited boolean not null default false;
alter table public.inquiry_responses add column if not exists edited_at timestamptz default null;

-- rooms
alter table public.rooms add column if not exists deleted_at timestamptz default null;
alter table public.rooms add column if not exists deleted_by uuid references public.profiles(id) on delete set null default null;
alter table public.rooms add column if not exists is_edited boolean not null default false;
alter table public.rooms add column if not exists edited_at timestamptz default null;

-- discussions
alter table public.discussions add column if not exists is_edited boolean not null default false;
alter table public.discussions add column if not exists edited_at timestamptz default null;

-- Partial indexes for active queries
create index if not exists idx_messages_deleted_at on public.messages(deleted_at) where deleted_at is null;
create index if not exists idx_claims_deleted_at on public.claims(deleted_at) where deleted_at is null;
create index if not exists idx_arguments_deleted_at on public.arguments(deleted_at) where deleted_at is null;
create index if not exists idx_evidence_deleted_at on public.evidence(deleted_at) where deleted_at is null;
create index if not exists idx_questions_deleted_at on public.questions(deleted_at) where deleted_at is null;
create index if not exists idx_inquiry_items_deleted_at on public.inquiry_items(deleted_at) where deleted_at is null;
create index if not exists idx_inquiry_responses_deleted_at on public.inquiry_responses(deleted_at) where deleted_at is null;
create index if not exists idx_rooms_deleted_at on public.rooms(deleted_at) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 3. Content Revisions Architecture
-- ----------------------------------------------------------------------------
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('message', 'claim', 'argument', 'evidence', 'question', 'inquiry', 'inquiry_response', 'room', 'discussion')),
  content_id uuid not null,
  room_id uuid references public.rooms(id) on delete set null,
  previous_content text not null,
  new_content text not null,
  edited_by uuid references public.profiles(id) on delete set null,
  edited_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_content_revisions_content on public.content_revisions(content_type, content_id);
create index if not exists idx_content_revisions_room on public.content_revisions(room_id);
create index if not exists idx_content_revisions_edited_by on public.content_revisions(edited_by);

alter table public.content_revisions enable row level security;

drop policy if exists "Admins can view content revisions" on public.content_revisions;
create policy "Admins can view content revisions"
on public.content_revisions for select
to authenticated
using (public.is_current_user_admin());

revoke all on public.content_revisions from public, anon;
revoke insert, update, delete on public.content_revisions from authenticated;
grant select on public.content_revisions to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Triggers & Functions: Messages
-- ----------------------------------------------------------------------------
create or replace function public.enforce_message_edit_rules()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  -- Phase 9C.4 account-deletion attribution scrub escape
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.user_id::text
     and new.user_id is null then
    return new;
  end if;

  v_is_admin := public.is_current_user_admin();

  -- Frozen once converted: marker, type, and content must no longer change
  if old.converted_claim_id is not null then
    if new.converted_claim_id is distinct from old.converted_claim_id
       or new.message_type is distinct from old.message_type
       or new.content is distinct from old.content
    then
      raise exception 'converted_frozen' using hint = 'Converted messages are frozen once they become Claims.';
    end if;
    return new;
  end if;

  -- One-time Claim-conversion marker transition: bypass the window
  if old.converted_claim_id is null
     and new.converted_claim_id is not null
     and old.message_type = 'message'
     and new.message_type = 'claim'
     and new.content is not distinct from old.content
     and new.room_id is not distinct from old.room_id
     and new.user_id is not distinct from old.user_id
     and new.identity_mode is not distinct from old.identity_mode
     and new.parent_message_id is not distinct from old.parent_message_id
     and new.created_at is not distinct from old.created_at
     and exists (
       select 1 from public.claims c
       where c.id = new.converted_claim_id
         and c.origin_message_id = old.id
     )
  then
    return new;
  end if;

  -- Soft-deletion transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.user_id is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the message author can delete this message.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Messages can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.user_id);
    return new;
  end if;

  -- Undelete forbidden
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'cannot_undelete' using hint = 'Deleted messages cannot be restored.';
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.user_id is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the message author can edit this message.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Messages can only be edited within 5 minutes of creation.';
      end if;
    end if;

    -- Record revision
    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'message', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.user_id), now()
    );

    new.is_edited := true;
    new.edited_at := now();
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

  return new;
end;
$$;

create or replace function public.handle_message_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.user_id is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the message author can delete this message.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Messages can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.messages
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), old.user_id)
  where id = old.id;

  return null;
end;
$$;

drop trigger if exists trg_message_delete on public.messages;
create trigger trg_message_delete
  before delete on public.messages
  for each row
  execute function public.handle_message_delete();

-- ----------------------------------------------------------------------------
-- 5. Triggers & Functions: Claims
-- ----------------------------------------------------------------------------
create or replace function public.enforce_claim_immutability()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  -- Phase 9C.4 account-deletion attribution scrub escape
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;

  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the claim author can delete this claim.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Claims can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Undelete forbidden
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'cannot_undelete' using hint = 'Deleted claims cannot be restored.';
  end if;

  -- Retraction is one-way and allowed anytime by author or admin
  if new.is_retracted = true and old.is_retracted = false then
    if not v_is_admin and old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the claim author can retract this claim.';
    end if;
    -- Retraction cannot change content or other fields
    if new.content is distinct from old.content then
      raise exception 'retraction_cannot_modify_content' using hint = 'Retraction cannot be used to modify claim content.';
    end if;
    return new;
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'cannot_unretract' using hint = 'Claims cannot be un-retracted.';
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the claim author can edit this claim.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Claims can only be edited within 5 minutes of creation.';
      end if;
    end if;

    -- Record revision
    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'claim', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.origin_message_id is distinct from old.origin_message_id or
     new.claim_type is distinct from old.claim_type or
     new.context_type is distinct from old.context_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Claims have immutable metadata. Only content edits (within 5 minutes) and retraction are permitted.';
  end if;

  return new;
end;
$$;

create or replace function public.claim_delete_with_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the claim author can delete this claim.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Claims can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  -- Set tombstone fields WITHOUT wiping original content so admin retains audit visibility
  update public.claims
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Triggers & Functions: Arguments
-- ----------------------------------------------------------------------------
create or replace function public.enforce_argument_immutability()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;

  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the argument author can delete this argument.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Arguments can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Retraction
  if new.is_retracted = true and old.is_retracted = false then
    if not v_is_admin and old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the argument author can retract this argument.';
    end if;
    if new.content is distinct from old.content then
      raise exception 'retraction_cannot_modify_content' using hint = 'Retraction cannot modify argument content.';
    end if;
    return new;
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'cannot_unretract' using hint = 'Arguments cannot be un-retracted.';
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the argument author can edit this argument.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Arguments can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'argument', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.claim_id is distinct from old.claim_id or
     new.created_by is distinct from old.created_by or
     new.stance is distinct from old.stance or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Arguments have immutable metadata. Only content edits (within 5 minutes) and retraction are permitted.';
  end if;

  return new;
end;
$$;

create or replace function public.argument_delete_with_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the argument author can delete this argument.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Arguments can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.arguments
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Triggers & Functions: Evidence
-- ----------------------------------------------------------------------------
create or replace function public.enforce_evidence_immutability_v2()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;

  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the evidence author can delete this evidence.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Evidence can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Retraction
  if new.is_retracted = true and old.is_retracted = false then
    if not v_is_admin and old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the evidence creator can retract this evidence.';
    end if;
    if new.content is distinct from old.content then
      raise exception 'retraction_cannot_modify_content' using hint = 'Retraction cannot modify evidence content.';
    end if;
    return new;
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'cannot_unretract' using hint = 'Evidence cannot be un-retracted.';
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the evidence creator can edit this evidence.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Evidence can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'evidence', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.source_id is distinct from old.source_id or
     new.created_by is distinct from old.created_by or
     new.evidence_type is distinct from old.evidence_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Evidence has immutable metadata. Only content edits (within 5 minutes) and retraction are permitted.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_evidence_deletion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the evidence author can delete this evidence.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Evidence can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.evidence
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Triggers & Functions: Questions
-- ----------------------------------------------------------------------------
create or replace function public.enforce_question_immutability()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  if tg_op = 'UPDATE'
     and current_setting('discora.deletion_scrub_user', true) = old.created_by::text
     and new.created_by is null then
    return new;
  end if;

  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the question author can delete this question.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Questions can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Retraction
  if new.is_retracted = true and old.is_retracted = false then
    if not v_is_admin and old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the question author can retract this question.';
    end if;
    if new.content is distinct from old.content then
      raise exception 'retraction_cannot_modify_content' using hint = 'Retraction cannot modify question content.';
    end if;
    return new;
  end if;

  if old.is_retracted = true and new.is_retracted = false then
    raise exception 'cannot_unretract' using hint = 'Questions cannot be un-retracted.';
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the question author can edit this question.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Questions can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'question', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.question_type is distinct from old.question_type or
     new.identity_mode is distinct from old.identity_mode or
     new.created_at is distinct from old.created_at then
    raise exception 'Questions have immutable metadata. Only content edits (within 5 minutes) and retraction are permitted.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_question_deletion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the question author can delete this question.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Questions can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.questions
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Triggers & Functions: Inquiries & Responses
-- ----------------------------------------------------------------------------
create or replace function public.enforce_inquiry_item_lifecycle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the inquiry creator can delete this inquiry.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Inquiries can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the inquiry creator can edit this inquiry.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Inquiries can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'inquiry', old.id, old.room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.room_id is distinct from old.room_id or
     new.created_by is distinct from old.created_by or
     new.target_claim_id is distinct from old.target_claim_id or
     new.created_at is distinct from old.created_at then
    raise exception 'Inquiry structural metadata cannot be modified.';
  end if;

  return new;
end;
$$;

create or replace function public.handle_inquiry_item_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the inquiry creator can delete this inquiry.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Inquiries can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.inquiry_items
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

drop trigger if exists trg_inquiry_item_lifecycle on public.inquiry_items;
create trigger trg_inquiry_item_lifecycle
  before update on public.inquiry_items
  for each row
  execute function public.enforce_inquiry_item_lifecycle();

drop trigger if exists trg_inquiry_item_delete on public.inquiry_items;
create trigger trg_inquiry_item_delete
  before delete on public.inquiry_items
  for each row
  execute function public.handle_inquiry_item_delete();

-- Inquiry responses
create or replace function public.enforce_inquiry_response_lifecycle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_room_id uuid;
begin
  v_is_admin := public.is_current_user_admin();

  -- Soft delete transition via UPDATE
  if old.deleted_at is null and new.deleted_at is not null then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the response author can delete this response.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'deletion_window_expired' using hint = 'Responses can only be deleted within 5 minutes of creation.';
      end if;
    end if;
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Content edit
  if new.content is distinct from old.content then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_author' using hint = 'Only the response author can edit this response.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Responses can only be edited within 5 minutes of creation.';
      end if;
    end if;

    select room_id into v_room_id from public.inquiry_items where id = old.inquiry_item_id;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at
    ) values (
      'inquiry_response', old.id, v_room_id, old.content, new.content, coalesce(auth.uid(), old.created_by), now()
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.inquiry_item_id is distinct from old.inquiry_item_id or
     new.created_by is distinct from old.created_by or
     new.created_at is distinct from old.created_at then
    raise exception 'Response metadata cannot be modified.';
  end if;

  return new;
end;
$$;

create or replace function public.handle_inquiry_response_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  if not v_is_admin then
    if old.created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the response author can delete this response.';
    end if;
    if old.created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Responses can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.inquiry_responses
  set
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), old.created_by)
  where id = old.id;

  return null;
end;
$$;

drop trigger if exists trg_inquiry_response_lifecycle on public.inquiry_responses;
create trigger trg_inquiry_response_lifecycle
  before update on public.inquiry_responses
  for each row
  execute function public.enforce_inquiry_response_lifecycle();

drop trigger if exists trg_inquiry_response_delete on public.inquiry_responses;
create trigger trg_inquiry_response_delete
  before delete on public.inquiry_responses
  for each row
  execute function public.handle_inquiry_response_delete();

-- ----------------------------------------------------------------------------
-- 10. Triggers & Functions: Rooms & Discussions Lifecycle
-- ----------------------------------------------------------------------------
create or replace function public.enforce_room_lifecycle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.is_current_user_admin();

  -- Discussion/Room owner archive/delete lifecycle action: within 1 hour
  if (old.status <> 'archived' and new.status = 'archived') or (old.deleted_at is null and new.deleted_at is not null) then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_owner' using hint = 'Only the room creator can archive or delete this room.';
      end if;
      if old.created_at < now() - interval '1 hour' then
        raise exception 'lifecycle_window_expired' using hint = 'Discussion owner can only archive or remove a discussion within 1 hour of creation.';
      end if;
    end if;
    new.status := 'archived';
    new.deleted_at := coalesce(new.deleted_at, now());
    new.deleted_by := coalesce(auth.uid(), old.created_by);
    return new;
  end if;

  -- Title or description edit: within 5 minutes
  if new.title is distinct from old.title or new.description is distinct from old.description then
    if not v_is_admin then
      if old.created_by is distinct from auth.uid() then
        raise exception 'not_creator' using hint = 'Only the room creator can edit the room title or description.';
      end if;
      if old.created_at < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Room title and description can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at, metadata
    ) values (
      'room', old.id, old.id,
      old.title || E'\n---\n' || coalesce(old.description, ''),
      new.title || E'\n---\n' || coalesce(new.description, ''),
      coalesce(auth.uid(), old.created_by),
      now(),
      json_build_object('title', new.title, 'description', new.description)
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  -- Immutable fields
  if new.id is distinct from old.id or
     new.created_by is distinct from old.created_by or
     new.room_type is distinct from old.room_type or
     new.created_at is distinct from old.created_at then
    raise exception 'Room structural metadata cannot be modified.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_room_lifecycle on public.rooms;
create trigger trg_room_lifecycle
  before update on public.rooms
  for each row
  execute function public.enforce_room_lifecycle();

-- Physical deletion protection trigger on rooms (CRITICAL P0)
create or replace function public.prevent_physical_room_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  raise exception 'physical_delete_forbidden' using hint = 'Physical deletion of rooms is forbidden to protect discourse data. Archive the room instead.';
end;
$$;

drop trigger if exists trg_prevent_physical_room_delete on public.rooms;
create trigger trg_prevent_physical_room_delete
  before delete on public.rooms
  for each row
  execute function public.prevent_physical_room_delete();

-- Discussions lifecycle (opening_statement / summary)
create or replace function public.enforce_discussion_lifecycle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_room_creator uuid;
  v_room_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();

  select created_by, created_at into v_room_creator, v_room_created_at
  from public.rooms where id = old.id;

  if new.opening_statement is distinct from old.opening_statement or new.summary is distinct from old.summary then
    if not v_is_admin then
      if v_room_creator is distinct from auth.uid() then
        raise exception 'not_creator' using hint = 'Only the discussion creator can edit the opening statement or summary.';
      end if;
      if coalesce(v_room_created_at, old.created_at) < now() - interval '5 minutes' then
        raise exception 'edit_window_expired' using hint = 'Discussion statement can only be edited within 5 minutes of creation.';
      end if;
    end if;

    insert into public.content_revisions (
      content_type, content_id, room_id, previous_content, new_content, edited_by, edited_at, metadata
    ) values (
      'discussion', old.id, old.id,
      coalesce(old.opening_statement, ''),
      coalesce(new.opening_statement, ''),
      coalesce(auth.uid(), v_room_creator),
      now(),
      json_build_object('opening_statement', new.opening_statement, 'summary', new.summary)
    );

    new.is_edited := true;
    new.edited_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_discussion_lifecycle on public.discussions;
create trigger trg_discussion_lifecycle
  before update on public.discussions
  for each row
  execute function public.enforce_discussion_lifecycle();

-- ----------------------------------------------------------------------------
-- 11. RLS Policies: Support Soft-Delete and Deletion Interception
-- ----------------------------------------------------------------------------
-- Messages
drop policy if exists "Authors and admins can delete messages" on public.messages;
create policy "Authors and admins can delete messages"
on public.messages for delete
to authenticated
using (user_id = auth.uid() or public.is_current_user_admin());

-- Claims
drop policy if exists "Authors and admins can delete claims" on public.claims;
create policy "Authors and admins can delete claims"
on public.claims for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Arguments
drop policy if exists "Authors and admins can delete arguments" on public.arguments;
create policy "Authors and admins can delete arguments"
on public.arguments for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Evidence
drop policy if exists "Creators and admins can delete evidence" on public.evidence;
create policy "Creators and admins can delete evidence"
on public.evidence for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Questions
drop policy if exists "Authors and admins can delete questions" on public.questions;
create policy "Authors and admins can delete questions"
on public.questions for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Inquiry items
drop policy if exists "Inquiry creators and admins can delete inquiries" on public.inquiry_items;
create policy "Inquiry creators and admins can delete inquiries"
on public.inquiry_items for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Inquiry responses
drop policy if exists "Responders and admins can update responses" on public.inquiry_responses;
create policy "Responders and admins can update responses"
on public.inquiry_responses for update
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin())
with check (created_by = auth.uid() or public.is_current_user_admin());

drop policy if exists "Responders and admins can delete responses" on public.inquiry_responses;
create policy "Responders and admins can delete responses"
on public.inquiry_responses for delete
to authenticated
using (created_by = auth.uid() or public.is_current_user_admin());

-- Update inquiry_items / inquiry_responses SELECT to filter soft-deleted for non-admins
drop policy if exists "Inquiry visibility matches room visibility" on public.inquiry_items;
create policy "Inquiry visibility matches room visibility"
on public.inquiry_items for select
to authenticated
using (
  (deleted_at is null or public.is_current_user_admin())
  and exists (
    select 1 from public.rooms r
    where r.id = inquiry_items.room_id and public.has_room_access(r.id)
  )
);

drop policy if exists "Anonymous public-room inquiry visibility" on public.inquiry_items;
create policy "Anonymous public-room inquiry visibility"
on public.inquiry_items for select
to anon
using (
  deleted_at is null
  and exists (
    select 1 from public.rooms r
    where r.id = inquiry_items.room_id and r.visibility = 'public' and r.status <> 'archived'
  )
);

drop policy if exists "Response visibility matches inquiry visibility" on public.inquiry_responses;
create policy "Response visibility matches inquiry visibility"
on public.inquiry_responses for select
to authenticated
using (
  (deleted_at is null or public.is_current_user_admin())
  and exists (
    select 1 from public.inquiry_items ii
    join public.rooms r on r.id = ii.room_id
    where ii.id = inquiry_responses.inquiry_item_id and public.has_room_access(r.id)
  )
);

drop policy if exists "Anonymous public-room response visibility" on public.inquiry_responses;
create policy "Anonymous public-room response visibility"
on public.inquiry_responses for select
to anon
using (
  deleted_at is null
  and exists (
    select 1 from public.inquiry_items ii
    join public.rooms r on r.id = ii.room_id
    where ii.id = inquiry_responses.inquiry_item_id and r.visibility = 'public' and r.status <> 'archived'
  )
);

-- Grant table privileges to authenticated role so RLS policies and triggers can govern actions
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.claims to authenticated;
grant select, insert, update, delete on public.arguments to authenticated;
grant select, insert, update, delete on public.evidence to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.inquiry_items to authenticated;
grant select, insert, update, delete on public.inquiry_responses to authenticated;

-- ----------------------------------------------------------------------------
-- 12. Dedicated Soft-Deletion RPCs (Typed & Explicit)
-- ----------------------------------------------------------------------------
create or replace function public.soft_delete_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_user_id uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select user_id, created_at into v_user_id, v_created_at
  from public.messages where id = p_message_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Message not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_user_id is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the message author can delete this message.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Messages can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.messages
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_user_id)
  where id = p_message_id;
end;
$$;

create or replace function public.soft_delete_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.claims where id = p_claim_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Claim not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the claim author can delete this claim.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Claims can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.claims
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_claim_id;
end;
$$;

create or replace function public.soft_delete_argument(p_argument_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.arguments where id = p_argument_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Argument not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the argument author can delete this argument.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Arguments can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.arguments
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_argument_id;
end;
$$;

create or replace function public.soft_delete_evidence(p_evidence_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.evidence where id = p_evidence_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Evidence not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the evidence author can delete this evidence.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Evidence can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.evidence
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_evidence_id;
end;
$$;

create or replace function public.soft_delete_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.questions where id = p_question_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Question not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the question author can delete this question.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Questions can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.questions
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_question_id;
end;
$$;

create or replace function public.soft_delete_inquiry(p_inquiry_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.inquiry_items where id = p_inquiry_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Inquiry not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the inquiry creator can delete this inquiry.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Inquiries can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.inquiry_items
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_inquiry_id;
end;
$$;

create or replace function public.soft_delete_inquiry_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.inquiry_responses where id = p_response_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using hint = 'Response not found or already deleted.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_author' using hint = 'Only the response author can delete this response.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'deletion_window_expired' using hint = 'Responses can only be deleted within 5 minutes of creation.';
    end if;
  end if;

  update public.inquiry_responses
  set deleted_at = now(), deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_response_id;
end;
$$;

create or replace function public.archive_room_by_owner(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.rooms where id = p_room_id and status <> 'archived';

  if not found then
    raise exception 'not_found' using hint = 'Room not found or already archived.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_owner' using hint = 'Only the room creator can archive this room.';
    end if;
    if v_created_at < now() - interval '1 hour' then
      raise exception 'lifecycle_window_expired' using hint = 'Discussion owner can only archive or remove a discussion within 1 hour of creation.';
    end if;
  end if;

  update public.rooms
  set
    status = 'archived',
    deleted_at = now(),
    deleted_by = coalesce(auth.uid(), v_created_by)
  where id = p_room_id;
end;
$$;

create or replace function public.edit_discussion_room(
  p_room_id uuid,
  p_title text,
  p_description text default null,
  p_opening_statement text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_created_by uuid;
  v_created_at timestamptz;
begin
  v_is_admin := public.is_current_user_admin();
  select created_by, created_at into v_created_by, v_created_at
  from public.rooms where id = p_room_id;

  if not found then
    raise exception 'not_found' using hint = 'Room not found.';
  end if;

  if not v_is_admin then
    if v_created_by is distinct from auth.uid() then
      raise exception 'not_creator' using hint = 'Only the room creator can edit this room.';
    end if;
    if v_created_at < now() - interval '5 minutes' then
      raise exception 'edit_window_expired' using hint = 'Room can only be edited within 5 minutes of creation.';
    end if;
  end if;

  update public.rooms
  set
    title = p_title,
    description = coalesce(p_description, description)
  where id = p_room_id;

  if p_opening_statement is not null then
    update public.discussions
    set opening_statement = p_opening_statement
    where id = p_room_id;
  end if;
end;
$$;

grant execute on function public.soft_delete_message(uuid) to authenticated;
grant execute on function public.soft_delete_claim(uuid) to authenticated;
grant execute on function public.soft_delete_argument(uuid) to authenticated;
grant execute on function public.soft_delete_evidence(uuid) to authenticated;
grant execute on function public.soft_delete_question(uuid) to authenticated;
grant execute on function public.soft_delete_inquiry(uuid) to authenticated;
grant execute on function public.soft_delete_inquiry_response(uuid) to authenticated;
grant execute on function public.archive_room_by_owner(uuid) to authenticated;
grant execute on function public.edit_discussion_room(uuid, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 13. Admin Inspection Functions
-- ----------------------------------------------------------------------------
create or replace function public.admin_get_deleted_content(
  p_content_type text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  content_type text,
  room_id uuid,
  content text,
  created_by uuid,
  author_username text,
  author_avatar_url text,
  created_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  deleter_username text,
  is_owner_discussion_delete boolean
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'access_denied' using hint = 'Administrator privileges required.';
  end if;

  return query
  with deleted_union as (
    -- messages
    select
      m.id,
      'message'::text as content_type,
      m.room_id,
      m.content,
      m.user_id as created_by,
      m.created_at,
      m.deleted_at,
      m.deleted_by,
      false as is_owner_discussion_delete
    from public.messages m
    where m.deleted_at is not null
      and (p_content_type is null or p_content_type = 'message')

    union all

    -- claims
    select
      c.id,
      'claim'::text as content_type,
      c.room_id,
      c.content,
      c.created_by,
      c.created_at,
      c.deleted_at,
      c.deleted_by,
      false as is_owner_discussion_delete
    from public.claims c
    where c.deleted_at is not null
      and (p_content_type is null or p_content_type = 'claim')

    union all

    -- arguments
    select
      a.id,
      'argument'::text as content_type,
      a.room_id,
      a.content,
      a.created_by,
      a.created_at,
      a.deleted_at,
      a.deleted_by,
      false as is_owner_discussion_delete
    from public.arguments a
    where a.deleted_at is not null
      and (p_content_type is null or p_content_type = 'argument')

    union all

    -- evidence
    select
      e.id,
      'evidence'::text as content_type,
      e.room_id,
      e.content,
      e.created_by,
      e.created_at,
      e.deleted_at,
      e.deleted_by,
      false as is_owner_discussion_delete
    from public.evidence e
    where e.deleted_at is not null
      and (p_content_type is null or p_content_type = 'evidence')

    union all

    -- questions
    select
      q.id,
      'question'::text as content_type,
      q.room_id,
      q.content,
      q.created_by,
      q.created_at,
      q.deleted_at,
      q.deleted_by,
      false as is_owner_discussion_delete
    from public.questions q
    where q.deleted_at is not null
      and (p_content_type is null or p_content_type = 'question')

    union all

    -- inquiry_items
    select
      ii.id,
      'inquiry'::text as content_type,
      ii.room_id,
      ii.content,
      ii.created_by,
      ii.created_at,
      ii.deleted_at,
      ii.deleted_by,
      false as is_owner_discussion_delete
    from public.inquiry_items ii
    where ii.deleted_at is not null
      and (p_content_type is null or p_content_type = 'inquiry')

    union all

    -- inquiry_responses
    select
      ir.id,
      'inquiry_response'::text as content_type,
      ii.room_id,
      ir.content,
      ir.created_by,
      ir.created_at,
      ir.deleted_at,
      ir.deleted_by,
      false as is_owner_discussion_delete
    from public.inquiry_responses ir
    join public.inquiry_items ii on ii.id = ir.inquiry_item_id
    where ir.deleted_at is not null
      and (p_content_type is null or p_content_type = 'inquiry_response')

    union all

    -- rooms
    select
      r.id,
      'room'::text as content_type,
      r.id as room_id,
      r.title || E'\n---\n' || coalesce(r.description, '') as content,
      r.created_by,
      r.created_at,
      r.deleted_at,
      r.deleted_by,
      true as is_owner_discussion_delete
    from public.rooms r
    where (r.deleted_at is not null or r.status = 'archived')
      and (p_content_type is null or p_content_type = 'room')
  )
  select
    u.id,
    u.content_type,
    u.room_id,
    u.content,
    u.created_by,
    ap.username as author_username,
    ap.avatar_url as author_avatar_url,
    u.created_at,
    u.deleted_at,
    u.deleted_by,
    dp.username as deleter_username,
    u.is_owner_discussion_delete
  from deleted_union u
  left join public.profiles ap on ap.id = u.created_by
  left join public.profiles dp on dp.id = u.deleted_by
  order by u.deleted_at desc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_get_content_revisions(
  p_content_type text default null,
  p_content_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  content_type text,
  content_id uuid,
  room_id uuid,
  previous_content text,
  new_content text,
  edited_by uuid,
  editor_username text,
  editor_avatar_url text,
  edited_at timestamptz,
  metadata jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'access_denied' using hint = 'Administrator privileges required.';
  end if;

  return query
  select
    cr.id,
    cr.content_type,
    cr.content_id,
    cr.room_id,
    cr.previous_content,
    cr.new_content,
    cr.edited_by,
    p.username as editor_username,
    p.avatar_url as editor_avatar_url,
    cr.edited_at,
    cr.metadata
  from public.content_revisions cr
  left join public.profiles p on p.id = cr.edited_by
  where (p_content_type is null or cr.content_type = p_content_type)
    and (p_content_id is null or cr.content_id = p_content_id)
  order by cr.edited_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_get_deleted_content(text, integer, integer) to authenticated;
grant execute on function public.admin_get_content_revisions(text, uuid, integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 14. Views Update: Filter soft-deleted rows and expose is_edited
-- ----------------------------------------------------------------------------
drop view if exists public.discussion_messages cascade;
drop view if exists public.discussion_claims cascade;
drop view if exists public.discussion_arguments cascade;
drop view if exists public.discussion_evidence cascade;
drop view if exists public.discussion_questions cascade;
drop view if exists public.discussion_claim_relations cascade;
drop view if exists public.discussion_debates cascade;

-- discussion_messages
create or replace view public.discussion_messages as
select
  m.id,
  m.room_id,
  m.parent_message_id,
  case
    when exists (
      select 1 from public.moderation_flags mf
      where mf.message_id = m.id and mf.status = 'resolved_hidden'
    ) then '[Hidden by moderator]'
    else m.content
  end as content,
  m.identity_mode,
  m.message_type,
  m.created_at,
  m.updated_at,
  case
    when m.identity_mode = 'anonymous' then null
    else m.user_id
  end as user_id,
  case
    when m.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true or p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when m.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  case
    when exists (
      select 1 from public.moderation_flags mf
      where mf.message_id = m.id and mf.status = 'resolved_hidden'
    ) then true
    else false
  end as is_moderated,
  m.converted_claim_id,
  m.is_edited,
  m.edited_at
from public.messages m
left join public.profiles p on m.user_id = p.id
where public.has_room_access(m.room_id)
  and m.deleted_at is null;

-- discussion_claims
create or replace view public.discussion_claims as
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
    when p.is_deleted = true or p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when c.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  coalesce(v.agree_count, 0::bigint) as agree_count,
  coalesce(v.disagree_count, 0::bigint) as disagree_count,
  case
    when (coalesce(v.agree_count, 0::bigint) + coalesce(v.disagree_count, 0::bigint)) = 0 then null
    else round(v.agree_count::numeric / (v.agree_count + v.disagree_count)::numeric * 100::numeric, 2)
  end as consensus_ratio,
  (
    select cv.vote_type
    from public.claim_votes cv
    where cv.claim_id = c.id and cv.user_id = auth.uid()
  ) as user_vote,
  c.is_edited,
  c.edited_at
from public.claims c
left join public.profiles p on c.created_by = p.id
left join (
  select
    claim_votes.claim_id,
    count(*) filter (where claim_votes.vote_type = 'agree') as agree_count,
    count(*) filter (where claim_votes.vote_type = 'disagree') as disagree_count
  from public.claim_votes
  group by claim_votes.claim_id
) v on c.id = v.claim_id
where public.has_room_access(c.room_id)
  and c.deleted_at is null
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.claim_id = c.id and mf.status = 'resolved_hidden'
  );

-- discussion_arguments
create or replace view public.discussion_arguments as
select
  a.id,
  a.room_id,
  a.claim_id,
  a.content,
  a.stance,
  a.identity_mode,
  a.is_retracted,
  a.created_at,
  a.updated_at,
  case
    when a.identity_mode = 'anonymous' then null
    else a.created_by
  end as created_by,
  case
    when a.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true or p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when a.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  a.is_edited,
  a.edited_at
from public.arguments a
left join public.profiles p on a.created_by = p.id
where public.has_room_access(a.room_id)
  and a.deleted_at is null;

-- discussion_evidence
create or replace view public.discussion_evidence as
select
  e.id,
  e.room_id,
  ce.claim_id,
  ce.direction,
  e.source_id,
  e.content,
  e.evidence_type,
  e.identity_mode,
  e.is_retracted,
  e.created_at,
  e.updated_at,
  case
    when e.identity_mode = 'anonymous' then null
    else e.created_by
  end as created_by,
  case
    when e.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true or p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when e.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  s.title as source_title,
  s.url as source_url,
  s.file_path as source_file_path,
  s.is_retracted as source_is_retracted,
  coalesce(v.agree_count, 0::bigint) as agree_count,
  coalesce(v.disagree_count, 0::bigint) as disagree_count,
  case
    when (coalesce(v.agree_count, 0::bigint) + coalesce(v.disagree_count, 0::bigint)) = 0 then null
    else round(v.agree_count::numeric / (v.agree_count + v.disagree_count)::numeric * 100::numeric, 2)
  end as consensus_ratio,
  (
    select ev_vote.vote_type
    from public.evidence_votes ev_vote
    where ev_vote.evidence_id = e.id and ev_vote.user_id = auth.uid()
  ) as user_vote,
  e.is_edited,
  e.edited_at
from public.evidence e
join public.claim_evidence ce on e.id = ce.evidence_id
left join public.sources s on e.source_id = s.id
left join public.profiles p on e.created_by = p.id
left join (
  select
    evidence_votes.evidence_id,
    count(*) filter (where evidence_votes.vote_type = 'agree') as agree_count,
    count(*) filter (where evidence_votes.vote_type = 'disagree') as disagree_count
  from public.evidence_votes
  group by evidence_votes.evidence_id
) v on e.id = v.evidence_id
where public.has_room_access(e.room_id)
  and e.deleted_at is null;

-- discussion_questions
create or replace view public.discussion_questions as
select
  q.id,
  q.room_id,
  q.content,
  q.question_type,
  q.identity_mode,
  q.is_retracted,
  q.created_at,
  q.updated_at,
  case
    when q.identity_mode = 'anonymous' then null
    else q.created_by
  end as created_by,
  case
    when q.identity_mode = 'anonymous' then 'Anonymous'
    when p.is_deleted = true or p.username is null then 'Deleted User'
    else p.username
  end as username,
  case
    when q.identity_mode = 'anonymous' then null
    else p.avatar_url
  end as avatar_url,
  q.is_edited,
  q.edited_at
from public.questions q
left join public.profiles p on q.created_by = p.id
where public.has_room_access(q.room_id)
  and q.deleted_at is null
  and not exists (
    select 1 from public.moderation_flags mf
    where mf.question_id = q.id and mf.status = 'resolved_hidden'
  );

-- discussion_claim_relations
create or replace view public.discussion_claim_relations as
select
  cr.id,
  cr.room_id,
  cr.source_claim_id,
  cr.target_claim_id,
  cr.relation_type,
  cr.created_by,
  cr.created_at,
  sc.content as source_claim_content,
  sc.claim_type as source_claim_type,
  tc.content as target_claim_content,
  tc.claim_type as target_claim_type
from public.claim_relations cr
join public.claims sc on sc.id = cr.source_claim_id
join public.claims tc on tc.id = cr.target_claim_id
where sc.deleted_at is null
  and tc.deleted_at is null
  and exists (
    select 1 from public.rooms r
    where r.id = cr.room_id
      and (r.visibility = 'public' and r.status <> 'archived' or r.created_by = auth.uid())
  );

-- discussion_debates
create or replace view public.discussion_debates as
select
  d.id,
  d.proposition_title,
  d.opposition_title,
  d.opening_statement,
  d.status,
  d.created_at,
  d.updated_at,
  d.closes_at,
  r.title,
  r.slug,
  r.description,
  r.created_by as room_created_by,
  r.topic_id,
  r.visibility,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at,
  coalesce(pc.count, 0::bigint) as proposition_claim_count,
  coalesce(oc.count, 0::bigint) as opposition_claim_count,
  coalesce(pc.count, 0::bigint) + coalesce(oc.count, 0::bigint) as total_claims,
  coalesce(pp.count, 0::bigint) as proposition_participant_count,
  coalesce(op.count, 0::bigint) as opposition_participant_count,
  coalesce(np.count, 0::bigint) as neutral_participant_count,
  coalesce(pp.count, 0::bigint) + coalesce(op.count, 0::bigint) + coalesce(np.count, 0::bigint) as total_participants,
  coalesce(ev.count, 0::bigint) as total_evidence,
  greatest(d.created_at, coalesce(last_claim.created_at, d.created_at), coalesce(last_evidence.created_at, d.created_at), coalesce(last_participant.joined_at, d.created_at)) as last_activity_at
from public.debates d
left join (
  select claims.room_id, count(*) as count
  from public.claims
  where claims.debate_side = 'proposition' and not claims.is_retracted and claims.deleted_at is null
  group by claims.room_id
) pc on d.id = pc.room_id
left join (
  select claims.room_id, count(*) as count
  from public.claims
  where claims.debate_side = 'opposition' and not claims.is_retracted and claims.deleted_at is null
  group by claims.room_id
) oc on d.id = oc.room_id
left join (
  select debate_participants.room_id, count(*) as count
  from public.debate_participants
  where debate_participants.side = 'proposition'
  group by debate_participants.room_id
) pp on d.id = pp.room_id
left join (
  select debate_participants.room_id, count(*) as count
  from public.debate_participants
  where debate_participants.side = 'opposition'
  group by debate_participants.room_id
) op on d.id = op.room_id
left join (
  select debate_participants.room_id, count(*) as count
  from public.debate_participants
  where debate_participants.side = 'neutral'
  group by debate_participants.room_id
) np on d.id = np.room_id
left join (
  select c.room_id, count(distinct ce.evidence_id) as count
  from public.claims c
  join public.claim_evidence ce on c.id = ce.claim_id
  join public.evidence e on e.id = ce.evidence_id
  where not c.is_retracted and c.deleted_at is null and e.deleted_at is null
  group by c.room_id
) ev on d.id = ev.room_id
left join (
  select claims.room_id, max(claims.created_at) as created_at
  from public.claims
  where not claims.is_retracted and claims.deleted_at is null
  group by claims.room_id
) last_claim on d.id = last_claim.room_id
left join (
  select c.room_id, max(e.created_at) as created_at
  from public.claims c
  join public.claim_evidence ce on ce.claim_id = c.id
  join public.evidence e on e.id = ce.evidence_id
  where not c.is_retracted and not e.is_retracted and c.deleted_at is null and e.deleted_at is null
  group by c.room_id
) last_evidence on d.id = last_evidence.room_id
left join (
  select debate_participants.room_id, max(debate_participants.joined_at) as joined_at
  from public.debate_participants
  group by debate_participants.room_id
) last_participant on d.id = last_participant.room_id
join public.rooms r on d.id = r.id and r.room_type = 'debate'
where public.has_room_access(r.id)
  and r.status <> 'archived'
  and r.deleted_at is null;

-- Grant permissions on views to authenticated and anon
grant select on public.discussion_messages to authenticated, anon;
grant select on public.discussion_claims to authenticated, anon;
grant select on public.discussion_arguments to authenticated, anon;
grant select on public.discussion_evidence to authenticated, anon;
grant select on public.discussion_questions to authenticated, anon;
grant select on public.discussion_claim_relations to authenticated, anon;
grant select on public.discussion_debates to authenticated, anon;

-- Grant required table privileges for relation tables protected by RLS
grant select, insert, update on public.sources to authenticated;
grant select, insert, update, delete on public.claim_evidence to authenticated;
grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.discussions to authenticated;
