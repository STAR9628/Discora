# Routing Plan — Debate Room Extraction

**Date**: 2026-06-11
**Status**: Implementation reference

---

## Current State

```
/discussions/[slug]  →  DiscussionRoomPage
                          └─ getDiscussionBySlug(slug)  →  { room, topic, discussion, debate }
                          └─ DiscussionRoom(initialData)
                               └─ if debate → debate UI
                               └─ if discussion → discussion UI
```

One route handles both room types. The server component does not know the room type until after the query.

## Target State

```
/discussions/[slug]  →  DiscussionRoomPage
                          └─ getDiscussionBySlug(slug)  →  { room, topic, discussion }
                          └─ DiscussionRoom(initialData)
                               └─ discussion UI only

/debates/[slug]      →  DebateRoomPage (NEW)
                          └─ getDebateBySlug(slug)      →  { room, topic, debate }
                          └─ DebateRoom(initialData)
                               └─ debate UI only (split-pane layout)

/discussions/[slug]  (if room is debate) → REDIRECT to /debates/[slug]
```

## Route Resolution Flow

```
User visits /discussions/{slug}
  └─ getDiscussionBySlug(slug)
       └─ queries rooms table by slug
       └─ if room.room_type === 'debate' → redirect /debates/{slug}
       └─ if room.room_type === 'discussion' → render DiscussionRoom

User visits /debates/{slug}
  └─ getDebateBySlug(slug)
       └─ queries rooms table by slug + room_type = 'debate'
       └─ if not found → 404
       └─ if found → render DebateRoom
```

## Redirect Handling

Implemented in DiscussionRoomPage (server component). After fetching the room data, if `room.roomType === "debate"`, issue a 307 redirect to `/debates/{slug}`. This:
- Preserves query parameters (?highlight=...)
- Requires no middleware changes
- Works for all existing links (browse pages, bookmarks, shares)
- Is a one-time redirect (browser picks up the new URL)

## Existing Link Updates

| File | Change |
|------|--------|
| `browse-debates.tsx` | `href={/discussions/${room.slug}}` → `href={/debates/${room.slug}}` (2 occurrences) |
| `discussion-feed.tsx` | Debate card links → `/debates/{slug}` |

## getDebateBySlug Implementation

New server-safe function in `debate-service.ts`:
- Same pattern as `getDiscussionBySlug`
- Queries `rooms` with `topics!left` and `debates!left`
- Filters by `room_type = 'debate'`
- Returns `{ room, topic, debate }` without `discussion`
- Works for both server (Supabase client) and client contexts

## Migration Safety

- No existing data migration
- No schema changes
- Brief window: after deployment, cached links to `/discussions/{slug}` for debate rooms will 307 redirect. Bookmarked links redirect automatically.
