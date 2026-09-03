# Inquiry Data Model Proposal

**Date**: 2026-06-12
**Status**: Design only — no implementation.

---

## 1. Core Tables

### 1A. `inquiry_items`

```sql
create table public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  inquirer_side text not null default 'inquiry'  -- snapshot of user's side at creation time
    check (inquirer_side in ('proposition', 'opposition', 'inquiry', 'neutral')),
  inquiry_type text not null check (inquiry_type in (
    'clarification',       -- "What do you mean by X?"
    'evidence_request',    -- "Can you provide a source?"
    'assumption_check',    -- "You're assuming Y, but is that valid?"
    'relationship_question'-- "How does claim A relate to claim B?" (future)
  )),
  content text not null check (char_length(content) >= 10 and char_length(content) <= 2000),

  -- Polymorphic target: exactly one must be set (v1)
  target_claim_id uuid references public.claims(id) on delete cascade,
  target_evidence_id uuid references public.evidence(id) on delete cascade,

  -- Status lifecycle
  status text not null default 'open' check (status in (
    'open',          -- Awaiting first response
    'responded',     -- At least one response exists
    'satisfied',     -- Inquirer confirms the response addressed their question
    'unsatisfied',   -- Inquirer wants more detail (re-opens from responded)
    'closed',        -- Inquirer is done (with or without satisfaction)
    'expired'        -- Auto-closed after inactivity timeout
  )),

  -- Escalation
  flagged_as_unanswerable boolean not null default false,
  flagger_id uuid references auth.users(id) on delete set null,
  flag_reason text check (flag_reason is null or char_length(flag_reason) >= 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  satisfied_at timestamptz,       -- when status → satisfied
  closed_at timestamptz,          -- when status → closed or expired

  -- Constraint: exactly one target
  constraint inquiry_one_target check (
    (case when target_claim_id is not null then 1 else 0 end +
     case when target_evidence_id is not null then 1 else 0 end) = 1
  )
);

-- Indexes
create index idx_inquiry_room_status on public.inquiry_items(room_id, status, created_at desc);
create index idx_inquiry_claim on public.inquiry_items(target_claim_id);
create index idx_inquiry_evidence on public.inquiry_items(target_evidence_id);
create index idx_inquiry_creator on public.inquiry_items(created_by);
create index idx_inquiry_creator_room on public.inquiry_items(created_by, room_id);
create index idx_inquiry_expiry on public.inquiry_items(status, created_at)
  where status = 'open';
```

**Changes from current design (`INQUIRY_LAYER_DESIGN.md`):**

| Field | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| `inquiry_type` | question, evidence_request, assumption_challenge, clarification | clarification, evidence_request, assumption_check, (relationship_question) | Renamed for precision; removed generic 'question' in favor of specific types. Relationship question reserved for v2. |
| `inquirer_side` | (not present) | New — snapshot of user's side at creation | Enables cross-side analysis; query "how many inquiries from Support target Challenge claims?" |
| `status` | open, addressed, acknowledged, closed | open, responded, satisfied, unsatisfied, closed, expired | Addressed → responded (action-based). Acknowledged split into satisfied/unsatisfied. Added expired for auto-cleanup. |
| `flagged_as_unanswerable` | (not present) | New | Explicit escalation path for impossible-to-answer questions. |
| `satisfied_at`, `closed_at` | (not present) | New | Timestamps for lifecycle analytics. |

### 1B. `inquiry_responses`

```sql
create table public.inquiry_responses (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 10 and char_length(content) <= 5000),
  evidence_reference_id uuid references public.evidence(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inquiry_response_item on public.inquiry_responses(inquiry_item_id, created_at);
create index idx_inquiry_response_author on public.inquiry_responses(created_by);
```

**Changes from current design:**
- Added `evidence_reference_id` — responder can directly link evidence in their response
- Added `updated_at` — allows editing responses (within time window)

### 1C. `debate_participants` — Side Constraint Update

```sql
-- Replace current check constraint
alter table public.debate_participants
  drop constraint if exists debate_participants_side_check;

alter table public.debate_participants
  add constraint debate_participants_side_check
  check (side in ('proposition', 'opposition', 'inquiry'));

-- 'neutral' is deprecated but existing rows are compatible.
-- 'inquiry' is the undecided signal — not a third side.
-- Migration: 'neutral' → 'inquiry' for existing participants who choose to stay.
```

---

## 2. Derived Views

### 2A. `debate_inquiry_health`

```sql
create view public.debate_inquiry_health as
select
  room_id,
  count(*) as total_inquiries,
  count(*) filter (where status = 'open') as open_inquiries,
  count(*) filter (where status = 'responded') as pending_acknowledgment,
  count(*) filter (where status = 'satisfied') as satisfied,
  count(*) filter (where status = 'closed') as closed,
  count(*) filter (where status = 'expired') as expired,
  count(*) filter (where flagged_as_unanswerable) as unanswerable,
  count(distinct created_by) as unique_inquirers,
  count(*) filter (
    where inquirer_side = 'proposition' and target_claim_id is not null
  ) as proposition_side_inquiries,
  count(*) filter (
    where inquirer_side = 'opposition' and target_claim_id is not null
  ) as opposition_side_inquiries,
  -- Cross-side inquiry ratio
  case
    when count(*) > 0 then
      round(
        100.0 * count(*) filter (
          where (inquirer_side = 'proposition' and target_claim_id is not null) or
                (inquirer_side = 'opposition' and target_claim_id is not null)
        ) / nullif(count(*), 0)
      )
    else 0
  end as cross_side_pct
from public.inquiry_items
group by room_id;
```

### 2B. `user_inquiry_pattern`

```sql
create view public.user_inquiry_pattern as
select
  created_by as user_id,
  count(*) as total_inquiries,
  count(*) filter (where status in ('open', 'responded')) as unresolved_inquiries,
  count(*) filter (where status in ('satisfied', 'closed')) as resolved_inquiries,
  count(*) filter (where status = 'expired') as expired_inquiries,
  round(
    100.0 * count(*) filter (where status in ('satisfied', 'closed')) /
    nullif(count(*), 0)
  ) as resolution_pct,
  -- Side targeting analysis
  count(*) filter (where inquirer_side = 'proposition') as from_proposition,
  count(*) filter (where inquirer_side = 'opposition') as from_opposition,
  count(*) filter (where inquirer_side = 'inquiry') as from_inquiry,
  -- Distinct debates
  count(distinct room_id) as debates_engaged
from public.inquiry_items
group by created_by;
```

---

## 3. RLS Policies

### 3A. `inquiry_items`

```sql
-- All authenticated users can see inquiries in rooms they can access
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

-- Authenticated users in the room can create inquiries
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

-- Only the creator can update status of their inquiry
create policy "Inquiry creator can update status"
  on public.inquiry_items
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- No deletes (immutable audit trail)
-- Exception: cascade delete when room is deleted (handled by FK)
```

### 3B. `inquiry_responses`

```sql
-- Same visibility as inquiries
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

-- Any authenticated user can respond
create policy "Any user can respond to inquiries"
  on public.inquiry_responses
  for insert
  to authenticated
  with check (auth.uid() = created_by);
```

---

## 4. Status Transition Rules

```
                    ┌─────────────────────────────┐
                    │           open              │
                    │  (awaiting first response)  │
                    └─────────────┬───────────────┘
                                  │ someone responds
                                  ▼
                    ┌─────────────────────────────┐
              ┌─────│         responded           │◄────────────────────┐
              │     │  (has ≥1 response)          │                     │
              │     └─────────────┬───────────────┘                     │
              │                   │                                     │
              │      ┌────────────┼────────────┐                       │
              │      │            │            │                       │
              │      ▼            ▼            ▼                       │
              │  ┌────────┐ ┌────────────┐ ┌──────────┐               │
              │  │satisfied│ │unsatisfied │ │  closed  │ (inquirer     │
              │  │        │ │(re-opened) │ │ by choice│  closes        │
              │  └────────┘ └──────┬─────┘ └──────────┘  without       │
              │                    │                      ac-knowl-    │
              │                    └─── someone responds ──┘  edging)   │
              │                             │                          │
              └─────────────────────────────┘                          │
                                                                       │
  ┌────────────────────────────────────────────────────────────────────┘
  │  [30 days no activity]
  ▼
┌──────────┐
│ expired  │
│ (auto)   │
└──────────┘
```

### Transition Rules

| From | To | Trigger | Who |
|------|----|---------|-----|
| `open` | `responded` | First response inserted | System (trigger) |
| `responded` | `satisfied` | Inquirer marks as satisfied | Inquirer |
| `responded` | `unsatisfied` | Inquirer requests more detail | Inquirer |
| `responded` | `closed` | Inquirer closes without acknowledging | Inquirer |
| `unsatisfied` | `responded` | Additional response inserted | System (trigger) |
| `satisfied` | `closed` | (auto) After 7 days in satisfied with no further responses | System (cron) |
| Any non-terminal | `expired` | 30 days since last activity | System (cron) |
| Any non-terminal | `closed` | Moderator action | Moderator |

### Constraint: No Reopening After Close

Once an inquiry reaches `closed` or `expired`, it cannot be re-opened. Create a new inquiry if the question remains relevant.

---

## 5. Rate Limits and Caps

### Per-User Limits (enforced in RPC or application layer)

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max inquiries per user per debate | 50 | Prevents spam while allowing thorough investigation |
| Max inquiries per claim | 20 | Prevents pile-on; excess merge into "crowd asks" |
| Max inquiries per hour | 5 | Rate limiting for bulk/dump attacks |
| Min characters | 10 | Same floor as claims |
| Max characters | 2000 | Same ceiling as claims |

### Acceptable Use Signals

- Inquiries where `inquirer_side` matches the target claim's side → "same-side inquiry" (clarifying own position)
- Inquiries where `inquirer_side` differs from the target claim's side → "cross-side inquiry" (challenging other position)
- Inquiries from `'inquiry'` role without a declared side → "undecided inquiry" (neutral investigation)

These signals are not punitive — they inform the UI treatment and health metrics.

---

## 6. Lifecycle RPCs

### 6A. `create_inquiry`

```sql
create or replace function public.create_inquiry(
  p_room_id uuid,
  p_target_claim_id uuid default null,
  p_target_evidence_id uuid default null,
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
  v_current_side text;
  v_inquiry_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
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

  -- Debate cap check
  select count(*) into v_inquiry_count
  from public.inquiry_items
  where created_by = v_user_id
    and room_id = p_room_id;

  if v_inquiry_count >= 50 then
    raise exception 'debate_cap' using hint = 'Max 50 inquiries per debate.';
  end if;

  -- Claim cap check
  if p_target_claim_id is not null then
    select count(*) into v_inquiry_count
    from public.inquiry_items
    where target_claim_id = p_target_claim_id;

    if v_inquiry_count >= 20 then
      raise exception 'claim_cap' using hint = 'Max 20 inquiries per claim.';
    end if;
  end if;

  -- Get current participation side
  select side into v_current_side
  from public.debate_participants
  where room_id = p_room_id and user_id = v_user_id;

  if v_current_side is null then
    v_current_side := 'neutral';
  end if;

  -- Validate: exactly one target
  if (p_target_claim_id is not null and p_target_evidence_id is not null) or
     (p_target_claim_id is null and p_target_evidence_id is null) then
    raise exception 'exactly_one_target' using hint = 'Specify exactly one target (claim or evidence).';
  end if;

  -- Create inquiry
  insert into public.inquiry_items (
    room_id, created_by, inquirer_side, inquiry_type, content,
    target_claim_id, target_evidence_id
  ) values (
    p_room_id, v_user_id, v_current_side, p_inquiry_type, p_content,
    p_target_claim_id, p_target_evidence_id
  ) returning id into v_inquiry_id;

  -- Reputation event (if reputation system active)
  -- perform public.create_reputation_event(v_user_id, 'INQUIRY_POSTED', 3,
  --   jsonb_build_object('inquiry_id', v_inquiry_id, 'room_id', p_room_id));

  return v_inquiry_id;
end;
$$;
```

### 6B. `respond_to_inquiry`

```sql
create or replace function public.respond_to_inquiry(
  p_inquiry_item_id uuid,
  p_content text,
  p_evidence_reference_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_response_id uuid;
  v_current_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Get current status (fail if closed/expired)
  select status into v_current_status
  from public.inquiry_items
  where id = p_inquiry_item_id;

  if v_current_status is null then
    raise exception 'not_found';
  end if;

  if v_current_status in ('closed', 'expired') then
    raise exception 'inquiry_closed' using hint = 'Cannot respond to a closed or expired inquiry.';
  end if;

  -- Insert response
  insert into public.inquiry_responses (
    inquiry_item_id, created_by, content, evidence_reference_id
  ) values (
    p_inquiry_item_id, v_user_id, p_content, p_evidence_reference_id
  ) returning id into v_response_id;

  -- Update inquiry status if it was open or unsatisfied
  if v_current_status in ('open', 'unsatisfied') then
    update public.inquiry_items
    set status = 'responded', updated_at = now()
    where id = p_inquiry_item_id;
  end if;

  return v_response_id;
end;
$$;
```

### 6C. `satisfy_inquiry` / `unsatisfy_inquiry`

```sql
create or replace function public.satisfy_inquiry(p_inquiry_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  -- Only the inquirer can mark as satisfied
  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer' using hint = 'Only the inquiry creator can mark it as satisfied.';
  end if;

  update public.inquiry_items
  set status = 'satisfied', satisfied_at = now(), updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;
end;
$$;

create or replace function public.unsatisfy_inquiry(p_inquiry_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

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
    raise exception 'invalid_state';
  end if;
end;
$$;
```

### 6D. `flag_inquiry_unanswerable`

```sql
create or replace function public.flag_inquiry_unanswerable(
  p_inquiry_item_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(p_reason)) < 10 then
    raise exception 'reason_too_short';
  end if;

  update public.inquiry_items
  set flagged_as_unanswerable = true,
      flagger_id = auth.uid(),
      flag_reason = trim(p_reason),
      updated_at = now()
  where id = p_inquiry_item_id
    and not flagged_as_unanswerable;

  if not found then
    raise exception 'already_flagged' using hint = 'Inquiry is already flagged as unanswerable.';
  end if;
end;
$$;
```

---

## 7. Migration Path

| Step | Action | Impact |
|------|--------|--------|
| 1 | Create `inquiry_items` and `inquiry_responses` tables | No existing data affected |
| 2 | Add `'inquiry'` to `debate_participants` side check constraint | Existing 'neutral' rows remain compatible |
| 3 | Create RLS policies | Tables start empty |
| 4 | Create RPCs (create, respond, satisfy, unsatisfy, flag) | Application layer only |
| 5 | Create views (inquiry health, user pattern) | Read-only, no migration |
| 6 | Create cron job for auto-expiry | Requires pg_cron or application-level timer |
| 7 | UI: inquiry buttons on claims/evidence | New feature — no regression |
| 8 | UI: inquiry tab in debate room | New feature — no regression |
| 9 | UI: inquiry panel (collapsible below claim) | New feature — no regression |
| 10 | (Optional) Migrate 'neutral' → 'inquiry' in debate_participants | Simple UPDATE, backward compatible |

### Rollback Path

- Drop `inquiry_items` and `inquiry_responses` tables
- Revert `debate_participants` side check constraint
- All other changes are additive/views — no data loss

---

## 8. Open Questions

| Question | Options | Needed By |
|----------|---------|-----------|
| Should inquiries have voting (upvote important questions)? | Yes — surfaces quality. No — simplifies model, prevents "popularity" of questions. | v2 |
| Should inquiry responses be editable (time window)? | Yes — 15 min window for correction. No — immutable audit trail. | v1 |
| Should inquiries support rich text (mentions, evidence links)? | Yes — improves response quality. No — plain text only, links in metadata. | v1 |
| Auto-expiry: system cron or application timer? | System cron — reliable, no user-trigger dependency. Application timer — simpler but less reliable. | v1 |
| Should satisfied inquiries auto-close after 7 days? | Yes — reduces open count. No — let inquirer explicitly close. | v1 |
| Evidence reference in response: required, optional, or not present? | Optional — adds value without forcing overhead. | v1 |
