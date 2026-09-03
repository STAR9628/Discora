# Side Switching Architecture

**Date**: 2026-06-11
**Status**: Design only — no implementation.
**Prerequisite**: Requires the dedicated debate layout (`/debates/[slug]`) before implementation.

---

## 1. Concept

A user starts on one side (Support/Proposition). After reviewing evidence and arguments, they change their position and switch to the other side (Challenge/Opposition).

The switch is:
- **Preserved** — both positions remain in the record (no deletion of previous position)
- **Auditable** — full history of position changes available
- **Visible** — system message in debate room, timeline entry on profile
- **Reputation-aware** — creates a reputation event (designed but not implemented yet)

---

## 2. Database Model

### New Table: `debate_side_changes`

```sql
create table public.debate_side_changes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_side text not null check (previous_side in ('proposition', 'opposition')),
  new_side text not null check (new_side in ('proposition', 'opposition')),
  reason text,  -- Optional: user-provided explanation
  created_at timestamptz not null default now()
);

create index idx_debate_side_changes_room on public.debate_side_changes(room_id, created_at desc);
create index idx_debate_side_changes_user on public.debate_side_changes(user_id, created_at desc);
```

### Existing Table (no changes): `debate_participants`

```sql
-- Already exists. On side switch, UPDATE side (handled by BEFORE INSERT trigger).
-- unique(room_id, user_id) prevents duplicate entries.
-- joined_at retains the original join time (not updated on switch).
```

### Design Decision: Separate Audit Table vs. Embedded History

| Approach | Pros | Cons |
|----------|------|------|
| **Separate `debate_side_changes` table** (chosen) | Clean query for profile timeline; independent lifecycle; no schema change to participants | One extra join for full history |
| JSON array on `debate_participants` | Single row; no extra table | Bloated row; hard to query individual events |
| Array type on `debate_participants` | PostgreSQL native | Migration complexity for arrays; less readable queries |

**Chosen**: Separate table. Enables:
- "N users switched sides in this debate" aggregate queries
- "User switched sides 3 times" detection for reputation logic
- Paginated timeline queries without affecting participant data

---

## 3. Event Model

### Trigger: `handle_debate_side_switch`

Fires on `UPDATE of side ON debate_participants`. Records the change in `debate_side_changes`.

```sql
create or replace function public.handle_debate_side_switch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.side != new.side and old.side != 'neutral' and new.side != 'neutral' then
    insert into public.debate_side_changes (room_id, user_id, previous_side, new_side)
    values (new.room_id, new.user_id, old.side, new.side);
  end if;
  return new;
end;
$$;

create trigger trg_debate_side_switch
  after update of side on public.debate_participants
  for each row
  when (old.side != new.side and old.side != 'neutral' and new.side != 'neutral')
  execute function public.handle_debate_side_switch();
```

### Reputation Event (designed, not implemented)

```sql
event_type: 'SIDE_SWITCHED'
points: +15
metadata: {
  debate_id: uuid,
  previous_side: 'proposition' | 'opposition',
  new_side: 'proposition' | 'opposition'
}
```

**Why +15**: Equal to evidence submission. Side switching is a high-effort intellectual honesty signal. Not implemented in current Sprint — reserved for truth-seeking reputation phase.

### Existing Compensation Interaction

The stabilization migration (`202606100005`) already prevents duplicate `DEBATE_JOINED` events on side switch via the `handle_debate_participant_before_upsert` trigger. Side switch:
1. User clicks "Switch Side" → calls `joinDebate(roomId, 'opposition')`
2. BEFORE INSERT trigger detects existing participant → UPDATEs side → RETURN NULL
3. AFTER INSERT trigger does NOT fire → no duplicate +5 event
4. New AFTER UPDATE trigger creates `debate_side_changes` record

---

## 4. UI Model

### Entry Point: Side Switch Button

When the user is already participating on a side, show a "Switch Side" action in addition to "Leave":

```
Current:   [Supporting this motion]  [Leave]
Proposed:  [Supporting this motion]  [Switch Side]  [Leave]
```

### Confirmation Dialog

```
┌──────────────────────────────────┐
│  Switch Side?                    │
│                                  │
│  You are currently supporting    │
│  the motion.                     │
│                                  │
│  Switching to Challenge will:    │
│  • Keep your previous claims     │
│    visible (marked as "previous  │
│    position")                    │
│  • Add a system message to the   │
│    debate                        │
│  • Allow you to create claims    │
│    on the Challenge side         │
│                                  │
│  Reason for switching (optional):│
│  ┌────────────────────────────┐  │
│  │ I found compelling         │  │
│  │ evidence from the          │  │
│  │ opposition...              │  │
│  └────────────────────────────┘  │
│                                  │
│  [Cancel]    [Switch to Challenge]│
└──────────────────────────────────┘
```

### After Switch

```
User's side display changes:
  Prior: [Swords icon] Supporting this motion
  After: [Shield icon] Challenging this motion

System message appears in thread:
  ┌──────────────────────────────────┐
  │  🔄 John switched from Support  │
  │  to Challenge after reviewing    │
  │  the statistical evidence.       │
  │                                  │
  │  [View Previous Position]        │
  └──────────────────────────────────┘
```

### Previous Position Handling

Claims created on the previous side:
- Remain visible with their original side badge (Proposition/Opposition)
- Get a "previous position" indicator: `[Previous Position]` badge
- The user cannot create new claims on the previous side
- The user's vote history on the previous side is preserved

### Side Filter Update

```
After switch, the DebateSideSelector shows:
  [My Current Side]  [My Previous Side]  [All Claims]

With visual indicator that "My Previous Side" includes the user's past work.
```

---

## 5. Notification Model

### In-Room Notification (System Message)

A system message inserted into the debate's message thread:
- Type: `side_change`
- Content: `"{username} switched from {previous_side_label} to {new_side_label}{reason_suffix}."`
- Display: Rendered as a styled system message (non-interactive, non-replyable)
- Placement: At the point in the timeline where the switch occurred

### Optional: Push Notification

For participants who have been actively arguing against this user's previous position:
- "John has switched from Support to Challenge in the debate '{debate_title}'"
- This signals that their arguments may have been convincing

### Optional: Profile Timeline Entry

On the user's profile page, the `debate_side_changes` table feeds a timeline entry:
- "Switched from Support to Challenge in '{debate_title}'"
- Links to the debate
- Shows the optional reason

---

## 6. UI States and Variants

| State | UI Treatment |
|-------|-------------|
| No participation | "Choose Your Side" — Support / Challenge / Observe |
| Participating, same side | Side display + "Switch Side" + "Leave" |
| Switching sides | Confirmation dialog + reason input |
| After switch | New side displayed + system message + old claims preserved |
| Multiple switches | All switches recorded; profile timeline shows all; last switch is current position |
| Debate resolved | No side switching allowed (hide controls) |
| Leave + rejoin as new side | Same as switch (treated as switch, not leave+join) |

---

## 7. Profile Timeline

Query for profile timeline:

```sql
select
  dsc.created_at as timestamp,
  'side_switch' as event_type,
  dsc.previous_side,
  dsc.new_side,
  dsc.reason,
  r.title as debate_title,
  r.slug as debate_slug
from public.debate_side_changes dsc
join public.rooms r on r.id = dsc.room_id
where dsc.user_id = p_user_id
order by dsc.created_at desc;
```

---

## 8. Audit Queries

### How many times has a user switched sides across all debates?

```sql
select count(*) as total_switches
from public.debate_side_changes
where user_id = '...';
```

### How many participants switched sides in this debate?

```sql
select
  count(distinct user_id) as users_who_switched,
  count(*) as total_switches
from public.debate_side_changes
where room_id = '...';
```

### What was the user's position at a given point in time?

```sql
-- Last side change before timestamp
select new_side
from public.debate_side_changes
where user_id = '...' and room_id = '...' and created_at <= p_timestamp
order by created_at desc
limit 1;

-- If no result, fall back to original debate_participants.joined_at side
select side
from public.debate_participants
where user_id = '...' and room_id = '...';
```

---

## 9. Interaction Map

```
joinDebate()
  └─ UPSERT debate_participants (room_id, user_id, side)
       ├─ [New participant]
       │    └─ AFTER INSERT trigger: +5 DEBATE_JOINED
       │
       └─ [Existing participant, side changed]
            ├─ BEFORE INSERT trigger: UPDATE side, RETURN NULL
            │    (no duplicate DEBATE_JOINED)
            └─ AFTER UPDATE trigger: INSERT INTO debate_side_changes
                 └─ System message in room
                 └─ (future) +15 SIDE_SWITCHED reputation event
```

---

## 10. Implementation Order

1. **Debate-native layout** (PHASE 2) — prerequisite for any debate-specific UX
2. **Side switch UI** — button + confirmation dialog + system message
3. **Database** — `debate_side_changes` migration + trigger
4. **Profile timeline** — query + display
5. **Reputation event** — `SIDE_SWITCHED` trigger (truth-seeking phase)
6. **Notifications** — push notification for affected participants

---

## 11. Open Questions

| Question | Decision Needed |
|----------|----------------|
| Should side switching be limited to once per debate? | If yes, one switch per debate per user. If no, allow multiple switches but flag intellectually dishonest patterns. |
| Should there be a cooldown? | 24-hour cooldown before switching back prevents "I'll try both sides" gaming. |
| Should the reason be required or optional? | Optional for low friction; recommended for audit quality. |
| Should previous side claims be visually distinguished? | Yes — "Previous Position" badge preserves intellectual history. |
| Should other participants be notified? | Yes — system message in room. Push notification optional. |
