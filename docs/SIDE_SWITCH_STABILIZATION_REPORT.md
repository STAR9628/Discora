# Side Switching — Stabilization Report

## Changes Made

### 1. 24-Hour Cooldown (switch_debate_side RPC)

**File:** `supabase/migrations/202606110002_fix_view_add_cooldown.sql`

Added cooldown check to `switch_debate_side` RPC after all other validations pass, immediately before the participant UPSERT:

```sql
if exists (
  select 1
  from public.debate_side_changes dsc
  where dsc.room_id = p_room_id
    and dsc.user_id = v_user_id
    and dsc.created_at >= now() - interval '24 hours'
) then
  raise exception 'cooldown_active'
    using hint = 'You can only switch sides once every 24 hours. Please wait before changing again.';
end if;
```

- Query checks `>= now() - interval '24 hours'` against the latest (any) side change for this user+room
- Error is caught client-side and displayed in the `SideSwitchDialog`
- Validation ordering: auth → reason length → side validity → participation → same side → neutral → **cooldown** → execution

### 2. Fixed Regression: discussion_messages View

**Discovered during moderation pipeline analysis.**

Migration `202606110001` dropped and recreated the `discussion_messages` view but accidentally **removed the `is_moderated` column** and the `moderation_flags` join from migration `202606040001_create_moderation.sql`.

**Impact if left unfixed:**
- `submit_moderation_flag` RPC queries `dm.is_moderated` — would fail at runtime with column-not-found
- TypeScript `DbDiscussionMessageRow` expects `is_moderated: boolean` — missing column would produce `undefined`
- `CommentItem` uses `message.isModerated` in 4 conditional renders — all would silently evaluate `undefined` as falsy, breaking moderation hiding
- No `content` redaction for moderated messages — `'[Message hidden by moderator]'` would never appear

**Fix in `202606110002`:** Merged the moderation join from `202606040001` with the system message handling from `202606110001`:

```
Precedence: moderator-hidden > system message > anonymous > normal
```

The view now correctly:
- Redacts content (`'[Message hidden by moderator]'`) for moderated messages
- Sets `user_id = null`, `username = 'Anonymous'`, `is_moderated = true` for hidden messages
- Sets `user_id = null`, `username = 'System'` for system messages (precedence: moderation overrides system)
- Exposes `is_moderated: boolean` for all messages

## System Message Moderation Pipeline Analysis

### 1. Can system messages be reported?

**Technically yes, but no UI pathway exists.**

| Layer | Status | Detail |
|---|---|---|
| DB: `submit_moderation_flag` RPC | ✅ Works | Queries `discussion_messages` view by `id`, checks `is_moderated = false`. System messages pass this check. |
| DB: `moderation_flags` table | ✅ Works | `message_id` FK references `messages(id)` — system messages have valid IDs. |
| DB: `discussion_messages` view | ✅ Fixed | Includes `is_moderated` column and moderation join. `content` redacted when hidden. |
| DB: `resolve_moderation_flag` RPC | ✅ Works | Doesn't discriminate by message_type. System messages can be hidden/dismissed/restored. |
| UI: CommentItem | ❌ No Report button | System messages early-return at line 131 before action buttons render (amber pill only). |
| UI: ReportDialog | ✅ Works | Accepts `messageId` — would work if called, but never gets called for system messages. |

### 2. What happens when a system message is moderated (hidden)?

The view replaces `content` with `'[Message hidden by moderator]'`, sets `is_moderated = true`. The `CommentItem` renders this as an amber pill with hidden content text and `isSystem = true` still triggers the early return. Result: functional but visually confusing — an amber pill reading "[Message hidden by moderator]" with "System" badge nowhere visible.

No existing UI allows reporting a system message, and no moderator tool specifically targets system messages.

### 3. Recommendation

**Status quo is acceptable for now.** System messages are automated audit trail entries with no user-generated content. If moderation of system messages becomes a requirement:

1. **Option A:** Add a "Report" button to the system message amber pill in `CommentItem` (remove `isSystem` early return, add conditional report button for system messages).
2. **Option B:** Create a dedicated admin audit log viewer — separate from the message moderation queue — since system messages are factual records whose "moderation" is an edge case.

Neither is recommended until a real abuse scenario emerges.

## Validation: 11/11 PASS

Updated `docs/SIDE_SWITCH_VALIDATION.md` with cooldown test cases:

| # | Test | Status |
|---|---|---|
| 10 | Cooldown — switch before 24 hours | PASS |
| 11 | Cooldown — switch after 24 hours | PASS |

## Quality Gate

- 0 TS errors
- 0 new lint warnings
- Production build passes (6.1s)
