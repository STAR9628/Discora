# Side Switching Behavioral Audit

## Implementation Snapshot (for reference)

| Property | Current Value |
|---|---|
| Cooldown | None |
| Reason min length | 50 chars |
| Reason max length | ~1945 chars (bounded by messages table 2000 char limit minus ~55 char prefix) |
| Side change history visibility | Private (RLS: `auth.uid() = user_id`) |
| System message visibility | Public (all participants in the room discussion tab) |
| Editing/deletion | Immutable — no updates or deletes on `debate_side_changes` (trigger-blocked) |
| Reputation reward | 0 points (tracking only) |
| Side constraint | `('proposition', 'opposition')` — neutral blocked |
| Rate limiting | None (beyond Supabase connection limits) |

---

## 1. Can Users Game Side Switching?

**Current state:** No reputation reward (0 points), so no score-based gaming incentive exists.

**Future risk:** If `SIDE_SWITCHED` ever awards positive reputation, users could:
- Join both sides of multiple debates and switch in each to farm points
- Create puppet accounts to switch sides and boost a narrative (e.g. "look how many people are switching to my side")
- Switch back and forth repeatedly to accumulate event count (if per-event rewards exist)

**Recommendation:**
- Never assign positive reputation to switching. Zero points is correct.
- Only use `SIDE_SWITCHED` events for analytics and timeline display.
- If confidence scoring is ever implemented (e.g. "user who switched vs user who stayed"), base it on the fact of switching, not the count.

---

## 2. Can Users Rapidly Oscillate?

**Current state:** Yes. No cooldown. A user can call `switch_debate_side` in a tight loop:

```
Support → Challenge → Support → Challenge → Support → Challenge
```

This creates:
- 1 system message in the discussion tab per switch (visible to all)
- 1 `debate_side_changes` row per switch
- 1 `reputation_events` row per switch

**Risk level: MEDIUM.** Each switch is append-only and the audit trail is clean, but the noise in the discussion tab is disruptive.

**Scenario:**
In a single second, a user could generate 5-10 system messages. The discussion tab becomes unreadable. Other users see a spam of "John switched from Support to Challenge. Reason: ..." messages.

**Recommendation:**
Add a cooldown. Minimum viable:
- **24-hour cooldown between switches in the same debate.**
- Store the last switch timestamp per `(room_id, user_id)` — already available via `debate_side_changes`.
- Enforce in the `switch_debate_side` RPC before the UPSERT.

```sql
if exists (
  select 1 from public.debate_side_changes
  where room_id = p_room_id
    and user_id = v_user_id
    and created_at > now() - interval '24 hours'
) then
  raise exception 'cooldown_active' using hint = 'You can only switch sides once every 24 hours.';
end if;
```

---

## 3. Should Cooldowns Exist?

**Yes.** See #2. The case for cooldowns:

| Argument | Weight |
|---|---|
| Prevents spam in discussion timeline | HIGH |
| Preserves meaning of a side switch (it should reflect genuine conviction change, not impulse) | HIGH |
| Prevents reputation event farming (future-proofing) | MEDIUM |
| Encourages reflection before switching | MEDIUM |

**Counter-argument:** A cooldown could be frustrating for users who genuinely change their mind quickly after seeing new evidence. However, the harm of no cooldown (spam, noise, gaming) outweighs this edge case.

**Recommendation:** 24 hours minimum.

**Alternative softer approach:** Show a warning on rapid switches (< 1 hour) instead of blocking, but still block when < 5 minutes. However, this adds complexity. Simple 24-hour block is safer.

---

## 4. Should Side-Switch History Be Public?

**Current state:** Private — only the participant can view their own history via `debate_side_changes` RLS.

**Arguments for public:**
- Transparency builds trust — other participants can see who switched, when, and why
- Demonstrates intellectual honesty — showing someone changed their opinion based on evidence is a positive signal
- Enriches debate narrative — knowing "3 people switched from Support to Challenge after the new study was posted" is useful context

**Arguments for private:**
- Users may refuse to switch if their reason is public (fear of judgment, social pressure)
- Reasons could be used to target or harass switchers
- Encourages more honest, vulnerable reasoning if reasons are private
- Privacy-first principle: position changes are personal

**Risk analysis:**
- The system message is **already public** in the discussion tab (message timeline). So the fact of switching and the reason are already visible to all participants. The only thing private vs public changes is whether `debate_side_changes` rows are queryable by others.
- Since the system message already leaks the same info, making history public adds no new exposure. It only adds discoverability (structured query vs timeline scroll).

**Recommendation:** Make history public (change RLS policy to allow all participants in the room to SELECT). Rationale:
- The information is already visible via system messages
- Structured access enables UI features like "Position Change Timeline" on the debate page
- The `reason` is user-written and presumably thoughtful (50 char minimum) — it should be shared
- Aligns with Discora's principle of "evidence over popularity" — showing why people change their minds is evidence of argument quality

---

## 5. Should Side-Switch Reasons Be Editable?

**No.** Current implementation blocks UPDATE and DELETE via trigger. This is correct.

**Rationale:**
- Reasons are part of the immutable audit trail
- Allowing edits would let users whitewash their history (e.g. switch with a weak reason, then edit to look prescient)
- Editing after-the-fact undermines trust in the timeline
- If a user wants to add a follow-up, they can post a regular message

**Recommendation:** Keep immutable. No changes needed.

---

## 6. Should Side-Switch Reasons Be Searchable?

**Current state:** Reasons are stored in:
1. `debate_side_changes.reason` — structured column, searchable via SQL
2. System message content in `messages.content` — already indexed and searchable via Supabase full-text search if implemented

**Arguments for searchable:**
- Enables analytics: "What reasons do people give for switching?"
- Enables moderation: search for abusive language in reasons
- Enables evidence correlation: "Users cited this source when switching"

**Arguments against:**
- Privacy concern: reasons are personal and may reference sensitive beliefs
- Public search could deter honest reasoning

**Recommendation:** System messages are already in the discussion tab and searchable via normal message search. No separate index needed. The `debate_side_changes.reason` column should remain queryable by RLS but not exposed as a standalone search index without user consent.

---

## 7. What Moderation Risks Exist?

| Risk | Severity | Description |
|---|---|---|
| Abusive reason content | MEDIUM | A reason could contain hate speech, harassment, or profanity. It appears in the discussion timeline as a system message (visible to all). Existing message moderation tools apply (report, moderate, delete). |
| False reasons | LOW | A user could write an insincere reason. No moderation action warranted — reasons are self-reported. |
| Coordinated switches | LOW | Multiple users switching in the same debate to create a false impression of momentum. Hard to prevent, low impact. |
| Reason contains PII | MEDIUM | A user could accidentally or intentionally include their own or others' personal information in the reason. System messages are subject to existing moderation. |
| Reason-too-short bypass | LOW | The 50 char minimum prevents one-word spam but doesn't prevent valid-but-useless reasons ("I changed my mind because I read some stuff and thought about it and decided the other side is better now"). This is an acceptable floor. |

**Current mitigation:** System messages are stored in the `messages` table and can be moderated (hidden, deleted) through existing message moderation flows. The `ReportDialog` component already supports message reporting via `messageId`.

**Missing mitigation:** The `post_system_message` RPC inserts directly into `messages` bypassing client-side moderation. If moderation requires deletion, an admin would need to delete the system message row directly (bypassing the AFTER INSERT moderation hooks if any).

**Recommendation:** Ensure system messages can be reported and moderated through the same flows as user messages. The current architecture supports this — system messages appear in `discussion_messages` view and can be reported via `ReportDialog` if the `messageId` is exposed in the UI.

---

## 8. Can Users Use Switching to Harass or Spam?

**Yes.** Primary vectors:

| Vector | Mechanism | Impact |
|---|---|---|
| Rapid oscillation spam | Multiple quick switches flood the discussion tab with system messages | NOISE — distracts from debate content |
| Reason-as-spam | Long, repetitive, or advertisement content in the reason field | NOISE + POTENTIAL TOS VIOLATION |
| Tag-team switching | Two users coordinate: A switches Support→Challenge, B switches Challenge→Support, creating an endless loop | NOISE + CONFUSION |
| Empty meaningful switches | Switch just to trigger a system message without genuine intent | NOISE (harder to detect) |

**Mitigation strength:**

| Threat | Current mitigation | Gap |
|---|---|---|
| Rapid oscillation | None | **CRITICAL** — cooldown needed |
| Reason spam | 50 char minimum, 2000 char maximum (via messages table constraint) | PARTIAL — doesn't prevent valid-length spam |
| Tag-team | None | LOW — hard to coordinate at scale |
| Empty switches | 50 char reason minimum | PARTIAL — doesn't prevent disingenuous reasons |

**Recommendation:**
1. Add cooldown (highest priority) — blocks oscillation and tag-team loops
2. Monitor for users with unusually high switch counts across debates
3. Allow moderators to hide system messages from the discussion tab (same as regular message moderation)

---

## 9. What Abuse Scenarios Exist?

### Scenario A: The Flip-Flopper
User switches sides 10+ times in one day. No meaningful rationale. Floods timeline.
- **Severity:** MEDIUM
- **Mitigation:** Cooldown + max switch limit per debate (e.g., 3 total)

### Scenario B: The False Convert
User switches from Support to Challenge with a glowing endorsement of the opposing side, attempting to make it appear that the evidence is overwhelmingly one-sided.
- **Severity:** LOW
- **Mitigation:** System message is one person's opinion. The scorecard shows actual participant counts. No action needed.

### Scenario C: The Alts Brigade
User operates multiple accounts, switches them all to the same side to inflate participant counts, then switches them back.
- **Severity:** HIGH (if reputation rewards exist), LOW (currently, with 0 points)
- **Mitigation:** Currently low risk due to 0-point reputation. Future-proof by capping switch benefit to 0 points permanently.

### Scenario D: Reason Dump
User pastes a 1900-char essay as their switch reason, containing links, advertisements, or unrelated content.
- **Severity:** MEDIUM
- **Mitigation:** System messages appear in the discussion tab and can be reported. Moderate-as-spam flow applies.

### Scenario E: The Strategic Flop
User joins a debate on one side, reads all opposition claims (now visible since they've joined), then switches to the other side to use that knowledge.
- **Severity:** LOW
- **Mitigation:** This is a feature, not a bug. Aim to create structured arguments, not win at all costs.

---

## 10. What Social Dynamics Will This Create?

### Positive Dynamics

| Dynamic | Description |
|---|---|
| Intellectual honesty signal | Users who switch with well-reasoned explanations earn respect. The culture rewards changing your mind based on evidence. |
| Evidence-driven conversation | A side switch with a reason like "The study cited by User X shows a 15% efficacy difference I hadn't considered" anchors the debate in evidence, not positions. |
| Reduced polarization | Knowing you can switch without penalty reduces defensive arguing. Users may engage with opposing evidence more openly. |
| Debate quality signal | A debate with multiple side switches (from different users) signals high-quality, balanced argument. A debate with zero switches could indicate echo-chamber dynamics. |

### Negative Dynamics

| Dynamic | Description | Severity | Mitigation |
|---|---|---|---|
| Switching as performance | Users switch for social credit, not genuine conviction | LOW | Inherently unenforceable. Acceptable if reason is well-written. |
| Peer pressure to switch | A user might feel pressured to switch if "everyone else is" | MEDIUM | Social norm, not a technical problem. Debate culture should value reasoned disagreement over conformity. |
| Armchair psychology | Users may analyze switchers' reasons and attack them personally | MEDIUM | Moderation tools for system messages. Reason-based discussion should be encouraged. |
| "Gotcha" culture | Users screenshot old positions vs new positions to mock inconsistency | LOW | Same risk exists for any forum with edit history. Immutable records actually protect against false claims. |

### Prediction

Side switching will be rare initially (most users join one side and stay). When it happens, it will be a notable event in the debate — likely prompting discussion. The first few switches in the platform will set cultural norms. If the community rewards honest reasoning, switching becomes a positive signal. If switching is met with hostility, users will stop using it.

**Recommendation:** The product should frame side switching positively in the UI:
- The dialog already says "Evidence changed your mind?" — this is good
- After a switch, consider a brief congratulatory message: "Thank you for updating your position based on new understanding"
- The Position History component should use encouraging language

---

## Summary of Recommendations

| # | Issue | Severity | Recommendation | Priority |
|---|---|---|---|---|
| 1 | No cooldown — rapid oscillation | HIGH | Add 24-hour cooldown in RPC | P0 |
| 2 | Reason spam in system messages | MEDIUM | Existing 2000-char cap + moderation flow sufficient | P2 |
| 3 | History is private when system messages are public | LOW | Make `debate_side_changes` readable by all room participants for consistency | P2 |
| 4 | No max switch limit per debate | MEDIUM | Limit to ~3 switches per debate per user (prevents oscillation even with cooldown gaps) | P1 |
| 5 | System messages not reportable from timeline | MEDIUM | Ensure message moderation works for message_type='system' | P1 |
| 6 | Reputation reward (future) | HIGH | Never assign positive points to SIDE_SWITCHED | P0 (policy) |

### P0 Actions (blocking)
1. Add 24-hour cooldown to `switch_debate_side` RPC
2. Document policy: SIDE_SWITCHED permanently stays at 0 points

### P1 Actions (next)
3. Add max 3 switches per debate
4. Verify system message moderation works

### P2 Actions (nice to have)
5. Open history RLS to room participants
6. Frame switching positively in UI copy
