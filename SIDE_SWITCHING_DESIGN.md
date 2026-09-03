# Side Switching Architecture Design

**Date**: 2026-06-10
**Status**: Design only — do NOT implement yet.

---

## Motivation

A user should be able to switch from "Support the Motion" to "Challenge the Motion" (or vice versa) when evidence or arguments change their view.

This is a core truth-seeking mechanic: changing your mind based on evidence should be:
1. Visible to the community
2. Auditable (timeline entry)
3. Rewarded (reputation)
4. Trackable (data model)

---

## Current State

### Data Model
```sql
debate_participants (
  id       uuid PRIMARY KEY,
  room_id  uuid REFERENCES rooms(id),
  user_id  uuid REFERENCES auth.users(id),
  side     text CHECK (side IN ('proposition', 'opposition', 'neutral')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);
```

### Current Behavior
- `joinDebate(roomId, side)` → UPSERT on `(room_id, user_id)`
- UPSERT changes `side` if different — silently overwrites
- No history of previous side
- No system message
- No timeline entry
- Reputation: fires another `DEBATE_JOINED` (+5) erroneously

---

## Design

### 1. Data Model Changes

Add to `debate_participants`:

```sql
ALTER TABLE public.debate_participants
  ADD COLUMN previous_side text CHECK (previous_side IN ('proposition', 'opposition', 'neutral')),
  ADD COLUMN side_changed_at timestamptz,
  ADD COLUMN side_change_count integer NOT NULL DEFAULT 0;
```

Or create a separate `debate_side_changes` table:

```sql
CREATE TABLE public.debate_side_changes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_side  text NOT NULL CHECK (from_side IN ('proposition', 'opposition', 'neutral')),
  to_side    text NOT NULL CHECK (to_side IN ('proposition', 'opposition', 'neutral')),
  reason     text,  -- optional user-provided explanation
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_side_changes_room ON public.debate_side_changes(room_id, user_id);
```

**Recommendation**: Separate table. Keeps participation row clean, enables rich queries (count of switches per user, per debate).

### 2. Action Flow

```
User clicks "Switch Side" button
  → UI shows confirmation dialog:
      "You are switching from [Support] to [Challenge].
       Would you like to add a note explaining why?"
  → POST /debates/[id]/switch-side

Server:
  → INSERT INTO debate_side_changes (room_id, user_id, from_side, to_side, reason)
  → UPDATE debate_participants SET side = to_side, previous_side = current side, side_changed_at = now(), side_change_count++
  → INSERT INTO messages (room_id, user_id, content, message_type = 'system_side_change')
    → Content: "John switched from Support to Challenge after reviewing evidence."
  → INSERT INTO reputation_events (user_id, event_type = 'SIDE_SWITCHED', points = +15, metadata = {room_id, from_side, to_side, reason})
  → NOTIFY participants via real-time subscription
```

### 3. System Message

The `messages` table already exists. Add a new `message_type`:

```sql
ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
    CHECK (message_type IN ('user', 'system', 'system_side_change', 'system_join', 'system_resolution'));
```

System message content template:
```
"{username} switched from {from_label} to {to_label} after reviewing evidence."
// e.g., "John switched from Support to Challenge after reviewing evidence."
```

If user provides a reason, append:
```
"{username} switched from {from_label} to {to_label}: {reason}"
// e.g., "John switched from Support to Challenge: The statistical evidence on page 3 convinced me the opposing view has more merit."
```

Labels:
- `proposition` → "Support"
- `opposition` → "Challenge"
- `neutral` → "Neutral"

### 4. Timeline Entry

Add to `useReputation` hook timeline builder:

```typescript
// Query debate_side_changes for this user
const { data: sideChanges } = await supabase
  .from("debate_side_changes")
  .select("*, rooms!inner(slug, title)")
  .eq("user_id", userId);

// Add to timeline
const sideChangeItems: ContributionTimelineItem[] = (sideChanges || []).map((sc) => ({
  id: `side-change-${sc.id}`,
  type: "debate" as const,
  content: `Switched from ${sc.from_side} to ${sc.to_side}`,
  roomTitle: sc.rooms?.title || sc.room_id,
  roomSlug: sc.rooms?.slug || "",
  createdAt: sc.created_at,
  isRetracted: false,
}));
```

### 5. Reputation Event

New event type: `SIDE_SWITCHED`

| Field | Value |
|-------|-------|
| event_type | `SIDE_SWITCHED` |
| points | `+15` (truth-seeking bonus, higher than basic join) |
| metadata | `{ debate_id, from_side, to_side, reason (optional), evidence_id (optional) }` |

### 6. UI Components

#### Debate side picker (existing: `debate-side-picker.tsx`)
When user is currently on proposition:
```
[✓] Support the motion  (your current side)
[  ] Challenge the motion  ← click → "Switch sides?"
```

After clicking:
```
Switching to Challenge the motion?

[Cancel] [Switch — +15 reputation for changing your mind based on evidence]
```

#### System message display (existing: `discussion-room.tsx`)
Add rendering for `system_side_change` message type:
```tsx
case "system_side_change":
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground italic bg-amber-500/5 rounded-lg px-3 py-2">
      <RefreshCw className="h-3 w-3 text-amber-400" />
      <span>{message.content}</span>
    </div>
  );
```

### 7. Notification Model

| Notification | Trigger | Channel |
|-------------|---------|---------|
| "John switched sides" | After INSERT on messages with type 'system_side_change' | Real-time (Supabase Realtime) |
| Reputation change | After INSERT on reputation_events with type 'SIDE_SWITCHED' | Batch (on profile visit) |

No new notification infrastructure needed — existing real-time subscriptions on `messages` table handle the first, existing `useReputation` hook handles the second.

### 8. Auditability

| Question | Query |
|----------|-------|
| How many times has user X switched sides? | `SELECT COUNT(*) FROM debate_side_changes WHERE user_id = X` |
| How many times did X switch in debate Y? | `SELECT COUNT(*) FROM debate_side_changes WHERE user_id = X AND room_id = Y` |
| What was X's side history? | `SELECT * FROM debate_side_changes WHERE user_id = X ORDER BY created_at` |
| Which debate had the most side switches? | `SELECT room_id, COUNT(*) as c FROM debate_side_changes GROUP BY room_id ORDER BY c DESC` |
| Did side switch come from evidence? | `SELECT * FROM debate_side_changes WHERE reason IS NOT NULL AND room_id = Y` |
| User's reputation from side switches? | `SELECT SUM(points) FROM reputation_events WHERE user_id = X AND event_type = 'SIDE_SWITCHED'` |

---

## Migration Plan (future)

```sql
-- 1. Create side changes table
CREATE TABLE public.debate_side_changes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_side  text NOT NULL CHECK (from_side IN ('proposition', 'opposition', 'neutral')),
  to_side    text NOT NULL CHECK (to_side IN ('proposition', 'opposition', 'neutral')),
  reason     text CHECK (char_length(reason) BETWEEN 10 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_side_changes_user ON public.debate_side_changes(user_id);
CREATE INDEX idx_side_changes_room ON public.debate_side_changes(room_id);

ALTER TABLE public.debate_side_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view side changes" ON public.debate_side_changes FOR SELECT USING (true);
CREATE POLICY "Users can record their own side changes" ON public.debate_side_changes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Add message type constraint (if not already using message_types)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('user', 'system', 'system_side_change', 'system_join', 'system_resolution'));

-- 3. Add reputation event type (no schema change needed — event_type is free text)

-- 4. Fix debate_participant trigger to skip duplicate DEBATE_JOINED on side switch
CREATE OR REPLACE FUNCTION public.handle_debate_participant_before_insert()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM debate_participants WHERE room_id = NEW.room_id AND user_id = NEW.user_id) THEN
    RETURN NULL; -- Existing participant, don't create duplicate event
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_skip_duplicate_debate_join
  BEFORE INSERT ON public.debate_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_debate_participant_before_insert();
```

---

## Side Switch Event (reputation)

```
event_type: "SIDE_SWITCHED"
points: +15
metadata: {
  debate_id: "...",
  from_side: "proposition",
  to_side: "opposition",
  reason: "The statistical evidence on climate change convinced me",
  evidence_ids: ["..."]  // optional — links to specific evidence
}
```

---

## Summary

| Component | Current | Proposed |
|-----------|---------|----------|
| Data model | `debate_participants` with side column only | Add `debate_side_changes` table |
| Visibility | Silent side change | System message in room |
| Auditability | None | Full history via side_changes table |
| Timeline | No entry | Side change appears in contribution timeline |
| Reputation | Accidental +5 (duplicate DEBATE_JOINED) | Explicit +15 (SIDE_SWITCHED) |
| UI | Hidden — UPSERT overwrites silently | Confirmation dialog + system message |
| Effort | N/A | ~8-12 hours (migration + service + UI) |
