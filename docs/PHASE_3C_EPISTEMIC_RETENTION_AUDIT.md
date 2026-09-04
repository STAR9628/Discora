# PHASE 3C: EPISTEMIC RETENTION / UNDERSTANDING MOMENTUM AUDIT

**Status**: AUDIT COMPLETE — SOURCE CODE UNTOUCHED  
**Date**: September 2026  
**Context**: Post-Phase 3B (commit `ee0d5a6`). Investigation of Discora's retention mechanics and return loops.  
**Objective**: Evaluate why a user who has explored a discussion would return, without relying on engagement bait, streaks, gamification, or social vanity metrics.

---

## 1. Executive Summary

Discora was founded on the core philosophical promise: **"Map a disagreement instead of maximizing engagement."** Standard social platforms retain users through variable dopamine schedules, likes, unread badges, follower counts, and outrage cycles. For Discora, retention must be **epistemic**: a user should return because *something they cared about became clearer, received new evidence, shifted consensus, was challenged, or reached resolution*.

This audit conducted a comprehensive, ground-truth code and database inspection across Discora's schema, RPCs, services, hooks, and UI components.

### Core Audit Verdict
**Discora already possesses the architectural primitives for an epistemic return loop, but the loop is broken by shallow heuristics, missing links, and backwards UI hierarchy:**
1. **The Inquiries Loop is 80% built but drops context**: Users can ask inquiries and receive responses (`inquiry_items`, `inquiry_responses`), and the homepage has a `Responses to My Inquiries` card. However, clicking that card links to `/discussions/${roomSlug}` rather than the standalone `/inquiries/[id]` route or the specific claim. Furthermore, when an inquiry is created in a debate room, the link erroneously routes to `/discussions/...`, and the responder is never notified when their response satisfies the inquirer.
2. **"Understanding Evolved" is currently an epistemic illusion**: The `get_my_understanding_evolved()` RPC does not track historical consensus deltas over time. Instead, it performs a static snapshot check comparing the current consensus ratio against the user's vote. If a claim had 75% agreement when the user voted 5 minutes ago and has had zero activity since, Discora still reports: *"Consensus now favors your position"*.
3. **The Target Claim Author is completely excluded**: When someone attaches a Structured Inquiry (challenging an assumption or requesting evidence) to a user's claim, the claim author is **never informed**. Only the inquirer can see the open inquiry.
4. **Evidence Discovery excludes participated rooms**: The `get_my_topic_evidence` RPC explicitly *excludes* the specific rooms a user participated in (`r3.id not in (...)`), attempting to recommend other rooms in the topic rather than informing the user that new evidence was added to the room/claim they examined.
5. **The Homepage hides personal momentum at the bottom**: Returning users are greeted by static `Recent Discussions` and `Recent Debates` feeds; their own `Your Activity` section sits at the very bottom. If the user has not yet cast votes or opened inquiries, the entire personal section collapses to `null`, leaving an empty void with zero calls to epistemic action.

---

## 2. Existing Personalization Audit (Audit A)

We inspected the five RPCs introduced in migration `202606170001_create_homepage_rpcs.sql`, their consumption in `src/features/homepage/services/homepage-personal-service.ts`, `src/features/homepage/hooks/use-homepage.ts`, and presentation in `src/features/homepage/components/logged-in-homepage.tsx`.

| RPC / Feature | Data Sources | User Action Required | Epistemic vs Activity | Tells User What Changed? | Actionable? | New User Usability | Return Loop Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `get_my_open_inquiries` | `inquiry_items ii`, `rooms r`, `claims c` | Opened a structured inquiry on a claim | Genuinely epistemic (tracks unresolved challenges) | **No** (static list of open/responded items created by user) | Partial (links to room, but not claim or inquiry) | **Zero** (empty array until user opens inquiry) | Weak (unresolved list, but doesn't highlight updates) |
| `get_my_inquiry_responses` | `inquiry_items ii`, `inquiry_responses ir`, `rooms r`, `profiles p` | User created an inquiry and someone posted a response | Genuinely epistemic (dialogue on claim premise/evidence) | **Yes** (surfaces latest response text and author) | Partial (links to `/discussions/${roomSlug}` instead of `/inquiries/[id]`) | **Zero** (empty until response occurs) | **Strongest candidate**, but severed by wrong link destination |
| `get_my_debates_attention` | `discussion_debates d`, `debate_participants dp`, `claims c` | User joined a debate side (proposition/opposition) | Mixed (counts claims per side) | **No** (does not show what changed; simply orders by room `last_activity_at`) | Weak (links to debate room root) | **Zero** (empty until debate joined) | Activity-based; doesn't explain *why* attention is needed |
| `get_my_topic_evidence` | `topics t`, `rooms r`, `evidence e`, `debate_participants dp`, `messages m` | User posted a message or joined a debate in a topic | Epistemic intent, broken logic | **Misleading** (reports new evidence in *other* rooms in the topic, excluding the user's room) | Weak (links to other discussion rooms) | **Zero** (empty until user participates) | Defective; misses the direct room/claim evidence loop |
| `get_my_understanding_evolved` | `claims c`, `rooms r`, `claim_votes cv`, `evidence e`, `claim_evidence ce` | User voted agree/disagree on a claim | Pure epistemic premise, flawed calculation | **False Positive** (reports "consensus shifted" based on static ratio, not a time delta) | Moderate (shows claim, room, and latest evidence snippet) | **Zero** (empty until user votes) | High potential, currently inaccurate |

### Findings on Existing Personalization:
- **FACT**: All 5 personalization RPCs return empty arrays for a new or browsing user who has not yet written a record to `inquiry_items`, `debate_participants`, `messages`, or `claim_votes`.
- **FACT**: In `logged-in-homepage.tsx`, each personalized component (`MyOpenInquiries`, `MyInquiryResponses`, `DebatesNeedingAttention`, `NewEvidenceTopics`, `UnderstandingEvolved`) has a guard `if (!isLoading && !error && items.length === 0) return null;`.
- **FACT**: When all return `null`, the section `<PersonalizedUpdates />` renders an empty `<div className="border-b border-border pb-2"><h2 className="...">Your Activity</h2></div>` followed by completely blank space.
- **INFERENCE**: Returning users who read extensively but contributed minimally see zero personalized momentum. Discora treats "reading/exploring" as non-existent because read state is not tracked.

---

## 3. Inquiry Return Loop (Audit B)

### Full Lifecycle Trace
```
User A creates inquiry on Claim C (create_inquiry RPC)
   │
   ▼
Status: 'open', inquiry_items row created
   │
   ▼
User B submits response (respond_to_inquiry RPC)
   │
   ├──> inquiry_items.status becomes 'responded'
   ├──> inquiry_items.updated_at set to now()
   └──> inquiry_responses row created (+3 rep for User B)
   │
   ▼
Can User A discover the response?
   ├──> YES: Appears in `get_my_inquiry_responses()` on User A's homepage.
   │    Shows: latest response snippet, responder username, response count.
   │    CRITICAL DEFECT: Clicking the item routes to `/discussions/${r.roomSlug}`!
   │    - If room is a Debate: Bad route (debates live at `/debates/${slug}`).
   │    - If room is a Discussion: Drops user at the top of the room without anchor or highlight.
   │    - Standalone route `/inquiries/[id]` EXISTS in `src/app/inquiries/[id]/page.tsx` but is NOT used here!
   │
   ▼
User A reviews response and satisfies inquiry (satisfy_inquiry RPC)
   │
   ├──> inquiry_items.status becomes 'satisfied'
   ├──> User A gets +2 reputation
   │
   ▼
What happens after satisfaction?
   ├──> Disappears from `get_my_inquiry_responses()` (filtered by `status = 'responded'`).
   ├──> Disappears from `get_my_open_inquiries()` (filtered by `status not in ('satisfied', 'closed')`).
   ├──> User A can NO LONGER see the satisfied inquiry anywhere on their homepage.
   └──> User B (the responder) is NEVER notified that their response satisfied the inquiry.
```

### Can the target claim author discover the inquiry?
- **FACT**: `inquiry_items` stores `target_claim_id`.
- **FACT**: `claims` stores `created_by`.
- **FACT**: There is NO query or RPC in Discora that selects inquiries where `target_claim_id IN (select id from claims where created_by = auth.uid())`.
- **FACT**: If User C posts a claim, and User A asks an inquiry questioning its premise, User C is never alerted or shown the inquiry on their homepage. User C only sees it if they manually navigate into the room and inspect the claim card.
- **CONCLUSION**: The inquiry loop is purely bilateral between the inquirer and anonymous passersby. The most epistemically invested participant—the author of the claim under question—is excluded from the loop.

---

## 4. Evidence Change Loop (Audit C)

When new evidence is added to a topic, claim, or debate:
1. An insert occurs in `public.evidence` and `public.claim_evidence` (linking evidence to a claim with `direction` in `'support'`, `'contradict'`, `'context'`).
2. `get_my_topic_evidence(p_days int default 7)` attempts to surface new evidence on the homepage.

### Inspection of `get_my_topic_evidence` Query Logic
```sql
-- Lines 205-218 of supabase/migrations/202606170001_create_homepage_rpcs.sql
from (
  select distinct r3.id, r3.title, r3.slug
  from evidence e2
  join rooms r3 on r3.id = e2.room_id
  where e2.created_at >= current_date - p_days
    and e2.is_retracted = false
    and r3.topic_id = t.id
    and r3.id not in (
      select room_id from debate_participants where user_id = auth.uid()
      union
      select distinct room_id from messages where user_id = auth.uid()
    )
) r2
```

### Critical Epistemic Defect:
- **FACT**: The query explicitly filters out rooms where the user has participated: `and r3.id not in (select room_id from debate_participants ... union select distinct room_id from messages ...)`.
- **INFERENCE**: The author intended this RPC to serve as "Discovery of other rooms in topics you like", NOT "Changes in rooms you participated in".
- **RESULT**: If a user participates in Discussion "AI Safety" and someone adds critical counter-evidence to a claim in that discussion tomorrow, `get_my_topic_evidence` **explicitly hides it** from the user.
- **NOISE VS VALUE**: Surfacing random evidence from unfamiliar rooms under the same broad topic creates noise. Surfacing new evidence attached to a claim the user created, voted on, or challenged is high-value epistemic momentum. That high-value loop does not currently exist.

---

## 5. Claim / Position Change Loop (Audit D)

### Can Discora answer: "What changed since the last time this user looked?"
- **FACT**: In `claim_votes`, Discora stores:
  `user_id`, `claim_id`, `vote_type` ('agree' | 'disagree'), `created_at`.
- **FACT**: There is no baseline snapshot stored in `claim_votes` (e.g., `consensus_ratio_at_vote_time` does not exist).
- **FACT**: `claims` has `created_at` and `updated_at`.
- **FACT**: Discora does NOT store a `user_room_views` or `last_viewed_at` timestamp per user.
- **CONCLUSION**: The system currently CANNOT answer what changed *since the user last looked*, because it does not record when the user looked.
- **AVAILABLE DATA**:
  1. Immutable side changes: `debate_side_changes` records every side switch with `previous_side`, `new_side`, `reason` (>= 50 chars), and `created_at`.
  2. Claim vote counts: Aggregated real-time counts from `claim_votes`.
  3. Evidence attachments: `claim_evidence` timestamped with direction.
- **MISSING DATA**:
  1. A user's last interaction timestamp on an entity.
  2. A snapshot of claim consensus at the time of vote.

---

## 6. Understanding Evolution Audit (Audit E)

The RPC `get_my_understanding_evolved()` represents Discora's most ambitious attempt at an epistemic return loop.

### Ground-Truth Code Breakdown
```sql
-- supabase/migrations/202606170001_create_homepage_rpcs.sql, lines 243-303
create or replace function public.get_my_understanding_evolved()
...
from claims c
join rooms r on r.id = c.room_id
join claim_votes cv on cv.claim_id = c.id and cv.user_id = auth.uid()
where c.is_retracted = false
order by c.updated_at desc
limit 10;
```

### UI Interpretation (`src/features/homepage/components/logged-in-homepage.tsx`, lines 537-568)
```tsx
function getConsensusInsight(item: UnderstandingEvolved): string {
  if (item.consensusRatio === null) return "No consensus data yet";
  if (item.consensusRatio >= 60) {
    return item.myVote === "agree"
      ? "Consensus now favors your position"
      : "Consensus shifted away from your position";
  }
  if (item.consensusRatio <= 40) {
    return item.myVote === "agree"
      ? "Consensus shifted away from your position"
      : "Consensus now favors your position";
  }
  return "Discussion remains divided";
}
```

### Critical Findings:
1. **No Evolution Detection**: The code simply compares the *current* `consensus_ratio` against the user's vote. If `ratio >= 60` and `myVote === 'agree'`, it outputs `"Consensus now favors your position"`.
2. **Extreme False-Positive Rate**:
   - Scenario A: A claim has 90% agreement. User votes "agree". Immediately, the homepage displays: *"Consensus now favors your position"*. The consensus did not evolve; it was already there.
   - Scenario B: A claim has 10% agreement. User votes "agree". The homepage displays: *"Consensus shifted away from your position"*. It did not shift away; it was already against.
3. **Extreme False-Negative Rate**:
   - Scenario C: A claim had 50% agreement when the user voted. Over the next week, 20 new pieces of evidence are added and 100 new votes are cast, leaving it at 52% agreement. The UI reports: *"Discussion remains divided"*. The user is given zero signal that massive epistemic activity and evidence took place on a claim they cared about.
4. **Viability as an Epistemic Return Loop**:
   - **YES, this CAN become the premier return-loop surface**, but it must be refactored to represent *genuine epistemic momentum*.
   - Instead of pretending static ratios are "shifts", it should highlight:
     - New evidence added to claims the user voted on (`claim_evidence.created_at > user_vote.created_at`).
     - New inquiries opened on claims the user voted on.
     - Actual consensus movements (e.g. claims that crossed from divided to consensus, or vice versa, over a recent time window).

---

## 7. User Memory / Return Context (Audit F)

| User Action | Stored in DB? | Table & Column | Persistently Queryable for Return Loop? |
| :--- | :--- | :--- | :--- |
| Viewed / read a discussion | **NO** | None | **NOT AVAILABLE** |
| Followed / bookmarked a room | **NO** | None | **NOT AVAILABLE** |
| Cast vote on a claim | **YES** | `claim_votes (user_id, claim_id, vote_type, created_at)` | **AVAILABLE NOW** |
| Authored a claim | **YES** | `claims (created_by, room_id, created_at)` | **AVAILABLE NOW** |
| Authored a question | **YES** | `questions (created_by, room_id, created_at)` | **AVAILABLE NOW** |
| Added evidence | **YES** | `evidence (created_by, room_id, created_at)` | **AVAILABLE NOW** |
| Linked evidence to claim | **YES** | `claim_evidence (created_by, claim_id, evidence_id, created_at)` | **AVAILABLE NOW** |
| Opened an inquiry | **YES** | `inquiry_items (created_by, target_claim_id, status, created_at, updated_at)` | **AVAILABLE NOW** |
| Responded to an inquiry | **YES** | `inquiry_responses (created_by, inquiry_item_id, created_at)` | **AVAILABLE NOW** |
| Joined debate side | **YES** | `debate_participants (user_id, room_id, side, joined_at)` | **AVAILABLE NOW** |
| Switched debate side | **YES** | `debate_side_changes (user_id, room_id, previous_side, new_side, reason, created_at)` | **AVAILABLE NOW** |
| Posted comment/message | **YES** | `messages (user_id, room_id, created_at)` | **AVAILABLE NOW** |
| Consensus at time of vote | **NO** | None | **NOT AVAILABLE** |
| Read/acknowledged inquiry response | **NO** | None | **NOT AVAILABLE** |

---

## 8. Notification / Activity Audit (Audit G)

- **Notification Center**: `src/types/domain.ts` lines 148-155 defines `NotificationType`, but explicitly annotates: `/** @future Notifications center — not implemented. */`.
- **Database Table**: There is NO `public.notifications` table in Supabase.
- **In-Room System Messages**: `switch_debate_side` posts a system message (`message_type = 'system'`) into `public.messages` in the debate room. This only reaches users currently viewing the debate room.
- **Reputation Events**: `public.reputation_events` tracks point-bearing actions (`INQUIRY_RESPONDED`, `INQUIRY_SATISFIED`, `SIDE_SWITCHED`), but this is an accounting ledger, not a user-facing inbox.
- **CONCLUSION**: Discora currently relies 100% on the **Logged-In Homepage** as its update and return-loop surface. There is no notification tray, toast system, or out-of-band alert.

---

## 9. Homepage Return Experience (Audit H)

We audited the five critical questions a returning user asks:

1. **"What changed since I was last here?"**
   - *Current Answer*: **Nothing directly answers this.** The homepage shows recent global discussions and debates created by anyone, ordered by creation date.
2. **"What needs my attention?"**
   - *Current Answer*: `My Open Inquiries` lists inquiries the user created that haven't been satisfied, and `Debates Needing Attention` lists debates where the user picked a side. Neither highlights *what* specifically requires attention or what is new.
3. **"What became clearer?"**
   - *Current Answer*: `Understanding Evolved` purports to show this, but uses static thresholds (`>= 60%`) that display the same text regardless of whether anything became clearer.
4. **"What remains unresolved?"**
   - *Current Answer*: `My Open Inquiries` shows open inquiries, but unresolved questions, split consensus debates, and claims lacking evidence are not surfaced.
5. **"What should I revisit?"**
   - *Current Answer*: If someone responded to the user's inquiry, `Responses to My Inquiries` shows the snippet. However, clicking it takes the user to the top of `/discussions/${roomSlug}` rather than the inquiry itself.

### Layout Hierarchy Flaw
In `LoggedInHomepage` (`src/features/homepage/components/logged-in-homepage.tsx`):
1. `WelcomeBar`
2. `FirstUserBanner`
3. `QuickActions` (Start Discussion, Start Debate, Browse...)
4. `RecentDiscussions` (Global feed)
5. `RecentDebates` (Global feed)
6. `PersonalizedUpdates` (`Your Activity`) — **Placed at the very bottom!**

A returning user who came back to see what happened with their discussions must scroll past two full feeds of general rooms to find their own updates.

---

## 10. First Visit vs Return Visit (Audit I)

| Aspect | First-Time User (Logged In) | Returning Active User (Logged In) |
| :--- | :--- | :--- |
| **Welcome State** | Sees `WelcomeBar` + `FirstUserBanner` ("Welcome to Discora... ask a question, support with a claim...") | Sees `WelcomeBar` ("Welcome back, {username}"). `FirstUserBanner` hides once `onboardingStatus.isFirstTime === false`. |
| **Personalized Sections** | Every personal card returns `null`. User sees an empty `Your Activity` heading with nothing beneath it. | Cards populate if user created inquiries, joined debates, or voted on claims. Still buried under general feeds. |
| **Call to Action** | Prompts user to Browse or Create Discussions. Does NOT suggest exploring an existing claim or casting a vote to start tracking understanding. | No clear call to action on unresolved items. |

---

## 11. Noise / Notification Fatigue Analysis (Audit J)

To avoid social engagement traps, candidate return signals are evaluated for epistemic density:

### HIGH VALUE (Essential Epistemic Signals)
- **Direct response to an inquiry I opened**: Someone took the time to address my request for evidence or clarification.
- **Inquiry opened on a claim I created**: Someone is challenging my claim; I have an epistemic obligation to clarify or defend it.
- **Inquiry response satisfied**: My response resolved someone's question and was acknowledged.
- **New evidence attached to a claim I created or voted on**: Empirical grounding has altered the foundation of a position I took.

### MEDIUM VALUE (Contextual Updates)
- **Debate participant switched sides**: Someone changed their mind based on arguments in a debate I joined.
- **Discussion reached consensus or flipped division**: Meaningful movement across the community on a topic I engaged with.

### LOW VALUE (Epistemic Noise — Do NOT Surface as Alerts)
- *Someone posted another general comment in a room.*
- *Total room participant count increased.*
- *A claim gained 1 additional vote without moving consensus.*
- *Arbitrary activity timestamps.*

---

## 12. Current Return Loop Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT RETURN LOOP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Action: Casts vote, creates claim, or posts inquiry   │
│         │                                                   │
│         ▼                                                   │
│  What Discora Records:                                      │
│  - `claim_votes` row (user_id, claim_id, vote_type)         │
│  - `inquiry_items` row (created_by, target_claim_id)        │
│  - `debate_participants` row (user_id, room_id, side)       │
│         │                                                   │
│         ▼                                                   │
│  What Can Change in the Room:                               │
│  - Someone responds to inquiry                              │
│  - Someone adds evidence to claim                           │
│  - Someone challenges claim with inquiry                    │
│  - Someone switches debate side                             │
│         │                                                   │
│         ▼                                                   │
│  What Discora Detects:                                      │
│  - Detects inquiry response (status = 'responded')          │
│  - Detects debate room last_activity_at                     │
│  - DOES NOT detect evidence on user's claim                 │
│  - DOES NOT detect inquiries on user's claim                │
│  - DOES NOT detect consensus shift over time                │
│         │                                                   │
│         ▼                                                   │
│  What the User Sees on Homepage:                            │
│  - Global feeds at top                                      │
│  - "Responses to My Inquiries" at bottom                    │
│    (Links to wrong URL: `/discussions/...` without anchor)  │
│  - Static "Consensus favors/against your position"          │
│    (Even if consensus never changed)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Missing Capabilities Summary

1. **No Deep-Linking for Inquiries**: Homepage inquiry cards link to generic `/discussions/${slug}` instead of `/inquiries/${id}` or claim anchors.
2. **No Inquiries-on-My-Claims Query**: Claim authors have no visibility into structured inquiries targeting their propositions.
3. **No Responder Satisfaction Feedback**: Users whose inquiry responses satisfied an inquiry are never notified.
4. **No Delta/Baseline for Consensus**: `get_my_understanding_evolved` checks static ratios, not temporal shifts.
5. **Topic Evidence Excludes Participated Rooms**: `get_my_topic_evidence` excludes rooms where the user participated.
6. **No Room/Topic Bookmark or Follow**: Users who explore without creating database records have no mechanism to save or follow epistemic progress.
7. **Flawed Homepage Order**: Personal updates are placed underneath generic recent room feeds.

---

## 14. Risk Assessment

| Risk | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Social Media Drift** | High | Introducing likes, unread red badges, or notification counts degrades Discora into an engagement treadmill. | Restrict return signals strictly to epistemic events (evidence added, inquiry responded, position challenged). No generic activity counts. |
| **False Epistemic Claims** | High | Claiming "Consensus shifted" when no shift occurred damages user trust in Discora's integrity. | Only label consensus as shifted if there is a verified movement across thresholds over a time window. Otherwise use neutral labels ("Current consensus: 65% agree"). |
| **Notification Overwhelm** | Medium | Alerting users to every comment or upvote causes notification fatigue. | Bundle updates into the logged-in homepage; do not introduce noisy popups or push spam. |
| **Broken Anonymity** | Critical | Surfacing claim or inquiry updates must respect `identity_mode = 'anonymous'`. | Personalization queries must query `auth.uid()` securely without leaking author identities in public views. |

---

## 15. Prioritized Findings

### P0 — Blocks Meaningful Epistemic Return Loop
- **P0.1: Fix Inquiry Card Link Targets**: In `logged-in-homepage.tsx`, point `MyInquiryResponses` and `MyOpenInquiries` to `/inquiries/${inquiry.id}` (or appropriate discussion/debate anchor) rather than hardcoded `/discussions/${roomSlug}`.
- **P0.2: Reorder Logged-In Homepage**: Elevate `PersonalizedUpdates` above `RecentDiscussions` and `RecentDebates` for returning users who have active items.
- **P0.3: Meaningful Empty State for Personal Updates**: Replace blank null-renders with an actionable epistemic prompt explaining how to track understanding (e.g. *"Vote on a claim or ask an inquiry to follow how understanding develops"*).

### P1 — Major Epistemic Opportunities
- **P1.1: Surface Inquiries on My Claims**: Create an RPC/query allowing claim authors to see when their claims have open structured inquiries needing clarification or evidence.
- **P1.2: Fix `Understanding Evolved` Accuracy**: Update copy and logic in `getConsensusInsight` to stop claiming "Consensus shifted" when viewing static ratios. Surface actual evidence additions on voted claims.
- **P1.3: Surface Satisfied Responses to Responders**: Allow users who answered inquiries to see when their answers were marked "Satisfied".

### P2 — Useful Epistemic Refinements
- **P2.1: Target Claim Evidence Alerts**: Surface when new evidence is attached directly to claims the user created or voted on.
- **P2.2: Debate Side-Switch Recognition**: Surface when a debate participant in a room the user joined switched sides with an epistemic reason.
- **P2.3: Epistemic Bookmark / Follow Room**: Allow users to follow a discussion room without having to post a claim.

---

## 16. Evidence & Source References

- `supabase/migrations/202606170001_create_homepage_rpcs.sql`: Lines 65-303 (RPCs `get_my_open_inquiries`, `get_my_inquiry_responses`, `get_my_debates_attention`, `get_my_topic_evidence`, `get_my_understanding_evolved`).
- `src/features/homepage/services/homepage-personal-service.ts`: Lines 4-98 (Mapping functions and client RPC calls).
- `src/features/homepage/components/logged-in-homepage.tsx`:
  - Lines 324-371: `MyOpenInquiries` links to `/discussions/${inquiry.roomSlug}`.
  - Lines 373-430: `MyInquiryResponses` links to `/discussions/${r.roomSlug}`.
  - Lines 485-535: `NewEvidenceTopics` excludes user's participated rooms.
  - Lines 537-568: `getConsensusInsight` heuristic claiming "shifted".
  - Lines 696-707: `LoggedInHomepage` component structure placing `PersonalizedUpdates` at line 704.
- `supabase/migrations/202606120001_create_inquiry_tables.sql`: Lines 1-288 (Table structures, `create_inquiry`, `respond_to_inquiry`, `satisfy_inquiry`).
- `src/app/inquiries/[id]/page.tsx`: Lines 1-123 (Standalone inquiry route).
- `supabase/migrations/202606110001_create_side_switch.sql`: Lines 1-246 (`debate_side_changes` immutable audit table and `switch_debate_side` RPC).
- `src/types/domain.ts`: Lines 148-155 (`NotificationType` defined as unimplemented future feature).
