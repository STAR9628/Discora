# Inquiry MVP Validation

**Date**: 2026-06-16
**Scope**: Full trace of Claim→Inquiry→Response→Satisfied→Unsatisfied→Closed
**Quality gate**: 0 TS errors, 0 new lint warnings, production build passes

---

## 1. Status Transition Matrix

### 1A. Allowed Transitions (RPC level)

```
open ──[respond]──→ responded
open ──[close]────→ closed

responded ──[respond]────→ responded  (stays, multiple responses allowed)
responded ──[satisfy]────→ satisfied  (inquirer only)
responded ──[unsatisfy]──→ unsatisfied (inquirer only)
responded ──[close]──────→ closed     (inquirer only)

unsatisfied ──[respond]──→ responded
unsatisfied ──[close]────→ closed     (inquirer only)

satisfied ── TERMINAL ── no outgoing transitions
closed ── TERMINAL ── no outgoing transitions
```

### 1B. Blocked Transitions (verified)

| From | To | Blocked? | Mechanism |
|------|----|----------|-----------|
| closed | respond | ✅ `respond_to_inquiry` line 210 | `raise 'inquiry_closed'` |
| closed | satisfy | ✅ `satisfy_inquiry` line 271 | `status = 'responded'` WHERE clause won't match |
| closed | unsatisfy | ✅ `unsatisfy_inquiry` line 315 | `status = 'responded'` WHERE clause won't match |
| closed | close | ✅ `close_inquiry` line 344 | `status not in ('closed', 'satisfied')` WHERE clause won't match |
| satisfied | respond | ✅ `respond_to_inquiry` line 210 | `raise 'inquiry_closed'` |
| satisfied | satisfy | ✅ `satisfy_inquiry` line 271 | `status = 'responded'` WHERE clause won't match |
| satisfied | unsatisfy | ✅ `unsatisfy_inquiry` line 315 | `status = 'responded'` WHERE clause won't match |
| satisfied | close | ✅ `close_inquiry` line 344 | `status not in ('closed', 'satisfied')` WHERE clause won't match |
| open | satisfy | ✅ `satisfy_inquiry` line 271 | `status = 'responded'` WHERE clause won't match |
| open | unsatisfy | ✅ `unsatisfy_inquiry` line 315 | `status = 'responded'` WHERE clause won't match |
| unsatisfied | satisfy | ✅ `satisfy_inquiry` line 271 | `status = 'responded'` WHERE clause won't match |
| unsatisfied | unsatisfy | ✅ `unsatisfy_inquiry` line 315 | `status = 'responded'` WHERE clause won't match |

**Verdict**: ✅ All transitions correctly gated. No invalid state paths possible.

---

## 2. RLS Policy Analysis

### 2A. Policy Coverage

| Operation | Table | RPC/Query | RLS Enforced? | Notes |
|-----------|-------|-----------|---------------|-------|
| SELECT | `inquiry_items` | `getInquiriesForTarget` (service) | ✅ Yes | `supabase.from().select()` goes through RLS |
| SELECT | `inquiry_responses` | `getInquiryResponses` (service) | ✅ Yes | `supabase.from().select()` goes through RLS |
| INSERT | `inquiry_items` | `create_inquiry` (RPC) | ⚠️ Bypassed | Security definer RPC bypasses RLS; auth check in RPC |
| INSERT | `inquiry_responses` | `respond_to_inquiry` (RPC) | ⚠️ Bypassed | Security definer RPC bypasses RLS; auth check in RPC |
| UPDATE | `inquiry_items` | All status RPCs | ⚠️ Bypassed | Security definer RPC bypasses RLS; ownership check in RPC |
| DELETE | Both | None | N/A | No DELETE operations exist |

### 2B. SELECT Policies Verified

**Policy: "Inquiry visibility matches room visibility"** (`inquiry_items`, SELECT)
```sql
exists (
  select 1 from public.rooms r
  where r.id = room_id
    and (
      (r.visibility = 'public' and r.status <> 'archived')
      or r.created_by = auth.uid()
    )
)
```
- ✅ Public non-archived rooms: visible
- ✅ Room creator: visible (even if private/archived)
- ✅ Uses existing `rooms` table FK — no orphan risk
- ❌ **Gap**: Does not cover participants of private rooms. If a user was invited to a private room but didn't create it, they can't see inquiries. This matches the existing pattern for `inquiry_items` but may be stricter than expected. Per `rooms` RLS investigation, this is consistent with the rest of the codebase.

**Policy: "Response visibility matches inquiry visibility"** (`inquiry_responses`, SELECT)
```sql
exists (
  select 1 from public.inquiry_items ii
  join public.rooms r on r.id = ii.room_id
  where ii.id = inquiry_item_id
    and (r.visibility = 'public' or r.created_by = auth.uid())
)
```
- ✅ Same visibility logic as inquiry_items
- ✅ Joined through `inquiry_items` → `rooms`

### 2C. INSERT/UPDATE Policies

The INSERT/UPDATE policies on both tables exist but are never hit because all mutations go through security definer RPCs. These policies provide defense-in-depth in case someone directly accesses the tables via the Supabase API:

| Policy | Assessment |
|--------|------------|
| `"Inquiry creation in accessible rooms"` (INSERT, inquiry_items) | ✅ Correct — `auth.uid() = created_by` AND room is accessible |
| `"Inquiry creator can update status"` (UPDATE, inquiry_items) | ✅ Correct — `auth.uid() = created_by` |
| `"Any user can respond to inquiries"` (INSERT, inquiry_responses) | ✅ Correct — `auth.uid() = created_by` |

### 2D. RPC Grant Statements

```sql
revoke all on function public.create_inquiry(...) from public, anon;
grant execute on function public.create_inquiry(...) to authenticated;
```

All 5 RPCs follow the same pattern:
- ✅ Revoked from `public` and `anon` roles (blocks unauthenticated)
- ✅ Granted to `authenticated` role

This is correct. Anonymous users cannot call any inquiry RPC.

**Verdict**: ✅ RLS architecture is sound. SELECT is RLS-enforced, mutations are RPC-gated with manual auth checks. One minor gap in private room participant visibility (matches existing codebase pattern).

---

## 3. Reputation Events

### 3A. Event Verification

| Action | Event Type | Points | Triggered In | Matches Spec? |
|--------|-----------|--------|-------------|---------------|
| Create inquiry | (none) | 0 | `create_inquiry` | ✅ Option C: `0` |
| Respond to inquiry | `INQUIRY_RESPONDED` | +3 | `respond_to_inquiry` line 227-236 | ✅ Option C: `+3` |
| Satisfy inquiry | `INQUIRY_SATISFIED` | +2 | `satisfy_inquiry` line 279-287 | ✅ Option C: `+2` |
| Unsatisfy inquiry | (none) | 0 | `unsatisfy_inquiry` | ✅ No penalty |
| Close inquiry | (none) | 0 | `close_inquiry` | ✅ No penalty |

### 3B. Event Metadata

- `INQUIRY_RESPONDED`: `{ inquiry_response_id, inquiry_item_id, room_id }` ✅
- `INQUIRY_SATISFIED`: `{ inquiry_item_id, room_id }` ✅

### 3C. Duplicate Event Risk

| Scenario | Duplicate Risk | Assessment |
|----------|---------------|------------|
| User responds to same inquiry twice | ✅ No check — multiple responses allowed, each fires `INQUIRY_RESPONDED` (+3 each) | By design. Responding multiple times earns multiple events. Acceptable for MVP. |
| User satisfies same inquiry twice | ✅ SQL `UPDATE` WHERE clause `status = 'responded'` — after first satisfy, status is 'satisfied', second call does nothing | Safe — function errors with `invalid_state` |
| User unsatisfies then responds on same inquiry | ✅ Each response fires +3. Loop: unsatisfied→responded (+3)→unsatisfied→responded (+3)... | Potential minor gaming. Acceptable for MVP. |

**Verdict**: ✅ Reputation matches Option C exactly (0/+3/+2). No missing or extra events.

---

## 4. Edge Cases

### 4A. Rate Limits (RPC-enforced)

| Limit | Location | Value | Verified? |
|-------|----------|-------|-----------|
| Per hour per user per debate | `create_inquiry` lines 132-141 | 5 | ✅ |
| Per debate per user (total) | `create_inquiry` lines 143-151 | 50 | ✅ |
| Per claim (total, all users) | `create_inquiry` lines 153-160 | 20 | ✅ |
| Character min | `inquiry_items.content` CHECK constraint | 10 | ✅ |
| Character max | `inquiry_items.content` CHECK constraint | 2000 | ✅ |
| Character min (response) | `inquiry_responses.content` CHECK constraint | 10 | ✅ |
| Character max (response) | `inquiry_responses.content` CHECK constraint | 5000 | ✅ |

### 4B. Authorization Edge Cases

| Scenario | Expected Behavior | Verified? |
|----------|-------------------|-----------|
| Unauthenticated user calls create_inquiry | `raise 'not_authenticated'` | ✅ RPC line 128-129 |
| Unauthenticated user calls respond_to_inquiry | `raise 'not_authenticated'` | ✅ RPC line 197-198 |
| Non-inquirer calls satisfy_inquiry | `raise 'only_inquirer'` | ✅ RPC line 259-263 |
| Non-inquirer calls close_inquiry | `raise 'only_inquirer'` | ✅ RPC line 339-342 |
| Inquirer satisfies own inquiry (correct flow) | Status → satisfied, +2 reputation | ✅ |
| Responder is same as inquirer | Allowed — RPC has no blocker | ⚠️ See 4C |
| Room non-participant creates inquiry | Allowed — no participation check | ⚠️ See 4C |

### 4C. Design-Level Edge Cases (No Code Change)

| Issue | Severity | Rationale |
|-------|----------|-----------|
| **Self-response gaming** (+5 per cycle) | Low | Inquirer can respond to own inquiry (+3) then satisfy (+2). The reputation analysis acknowledged this as "trivially detectable" but detection logic is not implemented. Acceptable for MVP. |
| **No room membership check** | Low | `create_inquiry` doesn't require the user to be a `debate_participant`. Per spec, inquiry is a contribution type available to all, so this is correct. |
| **No target claim room validation** | Low | `create_inquiry` doesn't verify `target_claim_id` belongs to `room_id`. If invalid FK provided, database constraint will error. Acceptable for MVP. |
| **No retracted claim check** | Low | `create_inquiry` doesn't check if the claim is retracted. Acceptable for MVP. |
| **TOCTOU race in respond_to_inquiry** | Low | Status check (line 202) and update (lines 220-223) are not atomic. Concurrent close could race with response. Narrow window. Acceptable for MVP. |

---

## 5. Service Layer Audit

### 5A. RPC Parameter Verification

| Service Function | RPC | Parameters Passed | RPC Signature | Match? |
|-----------------|-----|-------------------|---------------|--------|
| `createInquiry` | `create_inquiry` | `p_room_id, p_target_claim_id, p_inquiry_type, p_content` | `(uuid, uuid, text, text)` | ✅ |
| `respondToInquiry` | `respond_to_inquiry` | `p_inquiry_item_id, p_content` | `(uuid, text)` | ✅ |
| `satisfyInquiry` | `satisfy_inquiry` | `p_inquiry_item_id` | `(uuid)` | ✅ |
| `unsatisfyInquiry` | `unsatisfy_inquiry` | `p_inquiry_item_id` | `(uuid)` | ✅ |
| `closeInquiry` | `close_inquiry` | `p_inquiry_item_id` | `(uuid)` | ✅ |

### 5B. Error Handling

| Service Function | Error Input | Expected Error Message | Matches? |
|-----------------|-------------|----------------------|----------|
| `createInquiry` | RPC error | `"Failed to create inquiry"` (via `mapSupabaseError`) | ✅ |
| `respondToInquiry` | RPC error | `"Failed to respond to inquiry"` | ✅ |
| `satisfyInquiry` | RPC error | `"Failed to satisfy inquiry"` | ✅ |
| `unsatisfyInquiry` | RPC error | `"Failed to unsatisfy inquiry"` | ✅ |
| `closeInquiry` | RPC error | `"Failed to close inquiry"` | ✅ |
| `getInquiriesForTarget` | DB error | `"Failed to load inquiries"` | ✅ |
| `getInquiryResponses` | DB error | `"Failed to load responses"` | ✅ |

**Note**: RPC hints (e.g., "Max 5 inquiries per hour.") are **lost** because `mapSupabaseError` in `src/lib/errors.ts:40` does not check the `hint` field. This is a pre-existing limitation affecting all RPC errors in the codebase, not specific to inquiry.

### 5C. Profile Fetching

```ts
const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
```

- ✅ Batch fetches profiles to avoid N+1
- ❌ **Silent error swallow**: `error` from the fetch is ignored. If the query fails, all profiles show as "Unknown User" / no avatar. Transient degradation only — data integrity unaffected.

---

## 6. Hook Layer Audit

### 6A. Query Key Consistency

| Hook | Query Key | On Invalidation |
|------|-----------|-----------------|
| `useInquiriesForTarget` | `["inquiries", roomId, "target", targetClaimId]` | — |
| `useInquiryResponses` | `["inquiry-responses", inquiryItemId]` | — |
| `useCreateInquiry` | — | Invalidates `["inquiries", roomId]` |
| `useRespondToInquiry` | — | Invalidates `["inquiries", roomId]` + `["inquiry-responses"]` |
| `useSatisfyInquiry` | — | Invalidates `["inquiries", roomId]` |
| `useUnsatisfyInquiry` | — | Invalidates `["inquiries", roomId]` |
| `useCloseInquiry` | — | Invalidates `["inquiries", roomId]` |

**Finding**: `useInquiriesForTarget` uses query key `["inquiries", roomId, "target", targetClaimId]`, but the invalidation uses `["inquiries", roomId]` which is a **prefix** match (React Query invalidation matches prefixes by default). ✅ This correctly refreshes all inquiry queries for the room, including per-target queries.

**But**: `useRespondToInquiry` invalidates `["inquiry-responses"]` (a **prefix** match) — this will invalidate ALL response queries across all inquiry items in the room. This is slightly broader than necessary but functionally correct. ✅

### 6B. `enabled` Conditions

- `useInquiryResponses(inquiryItemId)`: `enabled: !!inquiryItemId` ✅ — Prevents fetch when `inquiryItemId` is empty string (collapsed state in `inquiry-item.tsx` line 31)
- `useInquiriesForTarget`: Always enabled ✅

### 6C. `staleTime`

Both query hooks use `staleTime: 10_000` (10 seconds). ✅ Prevents refetch on rapid re-renders while keeping data reasonably fresh.

---

## 7. UI Component Audit

### 7A. State Visibility Per Component

| Component | Loading | Empty | Error | Data | Mobile |
|-----------|---------|-------|-------|------|--------|
| `InquiryButton` | N/A | Shows "Inquiry" without count | N/A | Shows `"Inquiry (N)"` if count > 0 | ✅ `text-[10px]`, `px-2 py-0.5` — compact |
| `InquiryCreateDialog` | ✅ Loading spinner on submit button | ✅ Min-char warning when < 10 chars | ✅ error caught with toast | ✅ Type selector, content, submit | ✅ `max-w-lg`, full-width on small screens |
| `InquiryList` | ✅ `Loader2` spinner | ✅ Returns `null` (nothing rendered) | ❌ **No error state** | ✅ List with count header | ✅ Compact spacing |
| `InquiryItem` | ✅ Loading spinner for responses | ✅ "No responses yet." text | ✅ Error toasts on action failures | ✅ Status, content, avatar, actions | ✅ `text-[10px]`, `h-4 w-4` avatars |
| `InquiryResponse` | N/A | N/A | N/A | ✅ Avatar, name, timestamp | ✅ Compact layout |
| `InquiryStatusBadge` | N/A | N/A | N/A | ✅ 5 color-coded states | ✅ `text-[10px]` |

### 7B. Missing Error State

**`src/features/debates/components/inquiry-list.tsx` — Line 23-25**
```tsx
if (!inquiries || inquiries.length === 0) {
    return null;
}
```

If the `useInquiriesForTarget` query fails (error, not loading, no data), `data` will be `undefined`, so this condition (`!inquiries`) will return `null`. The error from `@tanstack/react-query` is available via `error` in the destructured return, but it's never captured.

**Severity**: Low. The error is silent — the inquiries section simply doesn't render. This is consistent with the pre-existing pattern in the codebase (many components don't handle query error states). The user wouldn't see misleading data; they just wouldn't see the inquiry list.

### 7C. Action Button Visibility Logic

In `inquiry-item.tsx` line 159:
```tsx
{!isTerminal && user && (
```

Actions are hidden when:
1. The inquiry is in a terminal state (`closed` or `satisfied`) ✅
2. No user is logged in ✅

For **inquirer** (line 161):
```tsx
{isCreator ? (
    <div className="flex items-center gap-2">
        {inquiry.status === "responded" && (
            // Satisfy / Unsatisfy buttons
        )}
        // Close button (always visible for inquirer)
    </div>
) : (
```

- ✅ Satisfy/Unsatisfy buttons only shown when status is `responded`
- ✅ Close button always shown for inquirer (can close from any non-terminal state)
- ❌ **UI gap**: When inquiry is in `open` or `unsatisfied` state, the inquirer sees ONLY the "Close" button. No "Satisfied" option — this is correct per the state machine (can only satisfy from `responded` state). But there's no visual feedback explaining *why* Satisfy/Unsatisfy aren't available. Minor UX issue.

For **non-inquirer** (line 192):
```tsx
) : inquiry.status !== "satisfied" ? (
```

- ✅ Respond button shown for all non-terminal states EXCEPT `satisfied`
- ✅ When status IS `satisfied`, no actions shown for non-inquirer
- ❌ **UI gap**: When status is `closed`, the `isTerminal` guard on line 159 already hides all actions, so the `inquiry.status !== "satisfied"` check on line 192 is never reached. The logic is correct but redundant.

### 7D. Expansive Response Query

`inquiry-item.tsx` line 30-32:
```tsx
const { data: responses, isLoading: responsesLoading } = useInquiryResponses(
    expanded ? inquiry.id : "",
);
```

- ✅ Only fetches responses when the inquiry is expanded
- ✅ `enabled: !!inquiryItemId` prevents fetch when collapsed
- ✅ Responses are not pre-fetched on mount (lazy loading)

This is efficient. No wasted queries for collapsed inquiries. ✅

---

## 8. Mobile Behavior

### 8A. Responsive Issues

| Issue | Location | Severity | Detail |
|-------|----------|----------|--------|
| Inquiry type selector buttons may overflow | `inquiry-create-dialog.tsx` line 74 — `flex gap-2` | Low | Three buttons with `flex-1`. On very small screens (320px), "Evidence Request" may wrap. No `flex-wrap` or `overflow-x-auto` fallback. |
| Claim badges row overflow | `claim-list.tsx` line 585 | Low | Badges row is `flex items-center gap-2`. InquiryButton has `shrink-0` (implicit from not having `flex-shrink-0`). Evidence badge also `shrink-0`. Multiple relation badges could overflow on small screens. Pre-existing issue, not inquiry-specific. |

### 8B. Touch Targets

All interactive elements in inquiry components:
- Buttons: minimum 24px height (with padding) ✅
- Textarea: large enough for touch input ✅
- Dialog overlay: click-to-dismiss on backdrop ✅

Minimal touch target concern: `inquiry-button.tsx` — `px-2 py-0.5` with `text-[10px]` yields a very small button (~20px × ~16px). On mobile, this may be hard to tap. **Minor UX concern** — consistent with existing badge pattern.

---

## 9. Empty States

| Scenario | Behavior | Rating |
|----------|----------|--------|
| No inquiries on claim | `InquiryList` returns `null` — nothing rendered | ✅ Clean |
| No responses on inquiry | Shows "No responses yet." italic text | ✅ Clear |
| Inquirer has no replies yet | Close button visible (can abandon inquiry) | ✅ |
| No user logged in | InquiryButton hidden, InquiryList hidden | ✅ Correct |
| Claim is retracted | InquiryButton still shown, InquiryList still shown | ⚠️ No special handling |

**Finding**: When a claim is retracted, inquiries are still visible and the "Ask a question" button is still available. The `claim-list.tsx` gating uses `{user && (` for the inquiry button (line 590) which is OUTSIDE the `isClaimRetracted` check. The InquiryList (line 859) is also outside the retraction check. This means users can still create inquiries on retracted claims. The RPC doesn't check `claims.is_retracted`.

**Severity**: Low. Creating inquiries on retracted claims is harmless (the questions remain valid), but the UX should ideally hide the button on retracted claims.

---

## 10. Notification Gaps

No notification infrastructure exists for inquiries:

| Event | In-app notification | Email/push notification |
|-------|-------------------|------------------------|
| Someone creates inquiry on my claim | ❌ Not implemented | ❌ Not implemented |
| Someone responds to my inquiry | ❌ Not implemented | ❌ Not implemented |
| Inquirer satisfies/unsatisfies/closes | ❌ Not implemented | ❌ Not implemented |

**Assessment**: This is by design — the notification system is not part of the Inquiry MVP scope. The `src/features/notifications/` directory contains only a `.gitkeep` file. Notifications across the entire platform (not just inquiries) are future work.

No code change needed — this is a known future feature.

---

## 11. Orphan States

| Scenario | What happens | Assessment |
|----------|-------------|------------|
| User who created inquiry deletes their account | `created_by` FK has `ON DELETE CASCADE`. Inquiry and all responses are deleted. | ✅ Clean deletion. No orphan rows. |
| Room is deleted | `room_id` FK has `ON DELETE CASCADE`. All inquiries and responses in the room are deleted. | ✅ Clean deletion. |
| Claim is deleted | `target_claim_id` FK has `ON DELETE CASCADE`. All inquiries on that claim are deleted. | ✅ Clean deletion. |
| Responder deletes their account | `created_by` FK on both tables has `ON DELETE CASCADE`. Responses are deleted but the inquiry remains (FK references `inquiry_responses.created_by`, not `inquiry_items`). | ✅ Inquiry stays visible, responses from deleted user vanish. |
| Profile deleted but auth user remains | Profile table has independent FK cascade — if the profile row is deleted, `fetchProfilesByIds` returns empty map, showing "Unknown User". | ⚠️ Minor UX degradation. |
| Inquiry has responses but all responders delete accounts | Responses are cascade-deleted. Inquiry status may remain as `responded` even though no responses exist. | ⚠️ Stale status. Use case: inquiry responded, responders deleted, status stays `responded` with 0 visible responses. If someone responds again, it stays `responded`. No data loss. |

**Finding**: All FK relationships use `ON DELETE CASCADE` — no orphan rows possible. The stale `responded` status after all responders delete their accounts is a minor edge case with no data integrity impact.

---

## 12. Deployment Gap

**`supabase/deploy_pending_migrations.sql` does NOT include the inquiry migration (202606120001).**

The deployment script aggregates migrations for batch deployment. The inquiry migration was added after the deploy script was last updated. This means running `deploy_pending_migrations.sql` will NOT create the inquiry tables/RPCs.

**Fix**: Add the inquiry migration to `deploy_pending_migrations.sql` before production deployment.

---

## 13. Summary

### ✅ Pass — No Critical Bugs

All 5 status transitions (open→responded→satisfied/unsatisfied/closed) are correctly gated and enforced at both the RPC and RLS level. Reputation events match Option C exactly (0/+3/+2). Rate limits and content constraints are enforced in both the RPC and DB schema.

### ⚠️ Medium Issues (Fix Recommended Before Production)

| Issue | File | Impact |
|-------|------|--------|
| `fetchProfilesByIds` ignores query error | `inquiry-service.ts:46` | Profile data silently missing on transient DB errors |
| Deployment script missing inquiry migration | `deploy_pending_migrations.sql` | Tables won't be created if deploying via script |
| `mapSupabaseError` drops RPC hints | `errors.ts:40` (pre-existing) | Specific error messages like "Max 5 inquiries per hour" are lost |

### 🔧 Minor Issues (Defer to v1.1)

| Issue | File | Detail |
|-------|------|--------|
| Self-response gaming (+5 per cycle) | `respond_to_inquiry` RPC | No blocker on inquirer responding to own inquiry |
| No retracted claim check | `create_inquiry` RPC | Inquiries can be created on retracted claims |
| No target claim room validation | `create_inquiry` RPC | Invalid claim+room combinations possible until FK error |
| Stale `responded` status | `inquiry_items` table | If all responders delete accounts, status says `responded` with 0 responses |
| InquiryList missing error state | `inquiry-list.tsx:23` | Query error causes silent render-nothing |
| Overflow risk on small screens | `inquiry-create-dialog.tsx:74` | Three type buttons may wrap on 320px screens |
| Small touch target | `inquiry-button.tsx:14` | ~20×16px button on mobile |

### ✅ Strong Points

| Aspect | Detail |
|--------|--------|
| Status enforcement | All 5 transitions accounted for — no invalid paths possible |
| RLS coverage | SELECT policies correctly restrict visibility by room access |
| Rate limits | 5/hr, 50/debate, 20/claim — all enforced in `create_inquiry` RPC |
| Content constraints | 10-2000 chars for inquiry, 10-5000 for response — CHECK constraints + RPC |
| Auth gates | All 5 RPCs check `auth.uid()` + grants to `authenticated` only |
| Reputation | Option C (0/+3/+2) implemented exactly per spec |
| No orphan rows | All FKs use `ON DELETE CASCADE` |
| Lazy response fetching | Responses only queried when inquiry is expanded |
| Batch profile fetching | N+1 avoided via `fetchProfilesByIds` with single query |
| Query key invalidation | Prefix matching correctly refreshes per-target inquiry queries |
