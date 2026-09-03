# Side Switch Validation

## Test Scenarios

### 1. Support → Challenge

| Step | Action | Expected | Result |
|---|---|---|---|
| 1.1 | User joins debate as Support | `debate_participants.side = 'proposition'` | PASS |
| 1.2 | User clicks "Change Position" | Dialog opens with Support → Challenge | PASS |
| 1.3 | User enters reason (50+ chars) | Reason field accepts text, counter shows ≥50 | PASS |
| 1.4 | User clicks "Switch to Challenge" | Mutation fires, RPC called | PASS |
| 1.5 | Verify participant updated | `debate_participants.side = 'opposition'` | PASS |
| 1.6 | Verify side change recorded | `debate_side_changes` row: previous_side='proposition', new_side='opposition' | PASS |
| 1.7 | Verify system message created | `messages` row: message_type='system', content shows "Support → Challenge. Reason: ..." | PASS |
| 1.8 | Verify reputation event created | `reputation_events` row: event_type='SIDE_SWITCHED', points=0 | PASS |
| 1.9 | Verify UI updates | Side picker now shows "Challenging this motion" | PASS |

### 2. Challenge → Support

| Step | Action | Expected | Result |
|---|---|---|---|
| 2.1 | User joins debate as Challenge | `debate_participants.side = 'opposition'` | PASS |
| 2.2 | User clicks "Change Position" | Dialog opens with Challenge → Support | PASS |
| 2.3 | User enters reason (50+ chars) | Reason validated | PASS |
| 2.4 | User clicks "Switch to Support" | Mutation fires, RPC called | PASS |
| 2.5 | Verify participant updated | `debate_participants.side = 'proposition'` | PASS |
| 2.6 | Verify side change recorded | previous_side='opposition', new_side='proposition' | PASS |
| 2.7 | Verify system message | Content shows "Challenge → Support. Reason: ..." | PASS |
| 2.8 | Verify reputation event | SIDE_SWITCHED, points=0 | PASS |

### 3. Duplicate Switch Blocked

| Step | Action | Expected | Result |
|---|---|---|---|
| 3.1 | User is on Support | currently on proposition | PASS |
| 3.2 | User tries to switch to Support | RPC returns `same_side` error | PASS |
| 3.3 | UI shows "You are already on this side." | Error displayed | PASS |

### 4. Empty Reason Blocked

| Step | Action | Expected | Result |
|---|---|---|---|
| 4.1 | User opens switch dialog | Reason field empty | PASS |
| 4.2 | User clicks "Switch" without reason | Button disabled (min 50 chars) | PASS |
| 4.3 | User enters < 50 chars | Counter shows <50, button stays disabled | PASS |
| 4.4 | User enters 50+ chars | Button enables | PASS |

### 5. Audit Row Created

| Step | Action | Expected | Result |
|---|---|---|---|
| 5.1 | After successful switch | `debate_side_changes` row exists | PASS |
| 5.2 | Verify immutability | UPDATE/DELETE blocked by trigger | PASS |
| 5.3 | Verify fields | room_id, user_id, previous_side, new_side, reason, created_at all populated | PASS |
| 5.4 | Verify RLS | Other users cannot SELECT this row | PASS |

### 6. Timeline Entry Created

| Step | Action | Expected | Result |
|---|---|---|---|
| 6.1 | System message in discussion tab | Message appears with amber badge "System" styling | PASS |
| 6.2 | No reply/claim/report buttons | System messages have no action buttons | PASS |
| 6.3 | Avatar hidden | System messages show no avatar | PASS |
| 6.4 | Username shows "System" | Correct | PASS |

### 7. System Message Created

| Step | Action | Expected | Result |
|---|---|---|---|
| 7.1 | Message inserted to `messages` | message_type = 'system' | PASS |
| 7.2 | user_id = null | Trigger skips auth.uid() for system messages | PASS |
| 7.3 | Content format | "Support → Challenge. Reason: <trimmed reason>" | PASS |
| 7.4 | Visible in discussion_messages view | Username shows "System" | PASS |

### 8. Profile History Updated

| Step | Action | Expected | Result |
|---|---|---|---|
| 8.1 | Navigate to profile page | Side switch appears in timeline | PASS |
| 8.2 | Timeline icon | Arrow icon with amber badge "Side Switch" | PASS |
| 8.3 | Content shows | Previous side → New side with reason | PASS |
| 8.4 | Room link | Links to debate page | PASS |

### 9. Reputation Unchanged

| Step | Action | Expected | Result |
|---|---|---|---|
| 9.1 | Check reputation score | Same before and after switch | PASS |
| 9.2 | Verify reputation_events | Event exists with points=0 | PASS |
| 9.3 | Recalculate reputation | Points=0 does not affect total | PASS |

### 10. Cooldown — Before 24 Hours

| Step | Action | Expected | Result |
|---|---|---|---|
| 10.1 | User switches Support → Challenge | Side changes successfully | PASS |
| 10.2 | User immediately tries to switch back Challenge → Support | Cooldown blocked by server | PASS |
| 10.3 | UI displays error message | "You can only switch sides once every 24 hours." | PASS |
| 10.4 | Verify RPC returns `cooldown_active` exception | No side change recorded, no system message | PASS |

### 11. Cooldown — After 24 Hours

| Step | Action | Expected | Result |
|---|---|---|---|
| 11.1 | Wait 24+ hours after last switch | Cooldown period has expired | PASS |
| 11.2 | User tries to switch again | Side change succeeds | PASS |
| 11.3 | Verify participant updated | `debate_participants.side` changes correctly | PASS |
| 11.4 | Verify side change recorded | New `debate_side_changes` row created | PASS |

## Summary

| # | Test | Status |
|---|---|---|
| 1 | Support → Challenge | PASS |
| 2 | Challenge → Support | PASS |
| 3 | Duplicate switch blocked | PASS |
| 4 | Empty reason blocked | PASS |
| 5 | Audit row created | PASS |
| 6 | Timeline entry created | PASS |
| 7 | System message created | PASS |
| 8 | Profile history updated | PASS |
| 9 | Reputation unchanged | PASS |
| 10 | Cooldown — before 24 hours | PASS |
| 11 | Cooldown — after 24 hours | PASS |

**Overall: 11/11 PASS**
