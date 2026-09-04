# PHASE 3C: EPISTEMIC RETENTION / UNDERSTANDING MOMENTUM REDESIGN

**Status**: REDESIGN SPECIFICATION ONLY — NO CODE MODIFIED  
**Date**: September 2026  
**Context**: Companion to `docs/PHASE_3C_EPISTEMIC_RETENTION_AUDIT.md`.  
**Goal**: Design the smallest, most coherent future epistemic return loop for Discora, adhering strictly to the philosophy: *"Map a disagreement instead of maximizing engagement."*

---

## 1. Core Return-Loop Principle

Traditional social products ask: *"How do we get the user to open the app 5 times a day?"*  
Discora asks: **"When a user returns, what genuine epistemic progress can we show them?"**

The core retention model is defined as:
> **"Because something I cared about changed, became clearer, received evidence, was challenged, or reached resolution."**

Retention on Discora is not a dopamine hook; it is **intellectual closure and ongoing curiosity**. If nothing has changed in the inquiries, claims, evidence, or debates a user explored, Discora should respect the user's attention rather than inventing artificial reasons to pull them in.

---

## 2. Trigger Types (Epistemic Events)

Epistemic return triggers are strictly tied to changes in the knowledge graph:

```
┌──────────────────────────┬─────────────────────────────────────────────────────────────┐
│ Trigger Type             │ Underlying Real-World Event                                 │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Inquiry Responded     │ Someone provided an answer or source to an inquiry I asked  │
│ 2. Inquiry Received      │ Someone attached a structured inquiry to a claim I created  │
│ 3. Inquiry Acknowledged  │ The inquirer marked my response as "Satisfied"              │
│ 4. Grounding Added       │ New evidence was attached to a claim I created or voted on  │
│ 5. Mind Changed          │ A debate participant switched sides with an explicit reason │
│ 6. Position Scrutiny     │ A claim I voted on crossed a consensus or division threshold│
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 3. Signal Ranking & Priority

Not all knowledge graph updates have equal cognitive importance. Signals are categorized into three distinct priority tiers:

### Tier 1: Direct Epistemic Obligations (Immediate Priority)
- **Response to My Inquiry**: A user's question has been answered. They must evaluate whether it satisfies their question.
- **Inquiry Challenging My Claim**: A user's proposition is under structured challenge (clarification, evidence request, or assumption check). The user has an epistemic responsibility to defend or refine it.
- **My Response Was Satisfied**: Confirmation that a response resolved an inquiry.

### Tier 2: Position & Deliberation Evolution (Contextual Priority)
- **New Evidence on Voted Claims**: Empirical backing or counter-evidence added to a claim where the user expressed agreement or disagreement.
- **Participant Switched Sides in Joined Debate**: A direct demonstration of persuasion taking place in a debate the user is active in.

### Tier 3: Passive Exploration (Low Priority / Feed-Only)
- **General Room Activity**: New general messages or inquiries on topics the user has only browsed. These remain in browse feeds and never trigger alert cards.

---

## 4. User-Facing Language

Discora avoids social and transactional terminology. All user-facing copy must be precise, calm, and epistemically descriptive:

| Avoid (Social / Engagement) | Discora Standard (Epistemic / Deliberative) |
| :--- | :--- |
| "New notification!" | "Update on your inquiry" |
| "Someone replied to you!" | "Response added to your inquiry" |
| "Your claim was challenged!" | "Structured inquiry opened on your claim" |
| "Consensus shifted!" (when static) | "Current consensus: 65% agree ({n} votes)" |
| "Trending debates" | "Active debates needing grounding" |
| "You earned 3 points!" | *(Keep reputation silent in return feeds; reputation is for governance, not gamification)* |

---

## 5. Homepage Placement & Reordering

### Current Flawed Order (Audit Finding)
1. WelcomeBar
2. FirstUserBanner
3. QuickActions
4. RecentDiscussions (Global feed)
5. RecentDebates (Global feed)
6. PersonalizedUpdates (`Your Activity`) — **Buried at bottom**

### Proposed Epistemic Order for Returning Users
When a logged-in user has active personal items (inquiries, responses, voted claims):
1. **WelcomeBar**: Minimalist greeting with epistemic context ("Welcome back, {username}").
2. **Epistemic Momentum Section ("Your Inquiries & Understanding")**:
   - Elevated directly beneath WelcomeBar.
   - Shows:
     - `Responses to My Inquiries` (Cards deep-linking directly to `/inquiries/${id}`).
     - `Inquiries on My Claims` (New card showing questions attached to propositions authored by the user).
     - `My Understanding Evolved` (Honest representation of claims voted on with latest evidence links).
     - `Debates Needing Attention` (Shows debate status and side counts).
3. **QuickActions**: Compact row for starting/browsing discussions.
4. **Recent Deliberations (Global Feeds)**:
   - `Recent Discussions`
   - `Recent Debates`

*Note for First-Time Users*: When personal items are empty, the homepage gracefully highlights `FirstUserBanner` and `QuickActions`, while rendering an educational empty state in place of an empty void.

---

## 6. Room-Level Follow-Up & Deep Linking

### 1. Standalone Inquiry Route (`/inquiries/[id]`)
- Currently, homepage cards route to `/discussions/${roomSlug}`.
- **Redesign**:
  - Homepage inquiry response cards link directly to `/inquiries/${inquiry.id}`.
  - The standalone inquiry page already features full context: the parent claim, the inquiry type badge, the creator, the response thread, and the Satisfy/Unsatisfy controls.
  - Debate-specific inquiries are handled seamlessly because `/inquiries/[id]` is room-agnostic.

### 2. Claim-Level Anchors
- When linking from claim or understanding updates to a discussion, link with an anchor hash: `/discussions/${slug}#claim-${claimId}`.
- Discussion and debate rooms should automatically scroll to and briefly highlight the target claim card.

---

## 7. Notification Behavior

### Explicit Constraints
- **NO email blasts** for room chatter.
- **NO push notification spam**.
- **NO red unread badge badges** simulating chat alerts.

### Proposed Lightweight Epistemic Indicator
If an out-of-band indicator is ever implemented in the app header (e.g. adjacent to the user avatar):
- Only lights up for **Tier 1 Direct Epistemic Obligations** (Inquiry responded, inquiry opened on my claim, or inquiry marked satisfied).
- Displays as a quiet, neutral indicator (e.g. a subtle dot or icon change), never a flashing red counter.
- Clicking navigates directly to the personal updates section on the homepage or opens a focused epistemic drawer.

---

## 8. First-Time vs Returning User Experience

```
┌─────────────────────────────────────────────────────────────┐
│ FIRST-TIME USER (Day 1)                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. WelcomeBar & Orientation Banner                          │
│ 2. Explore Feeds (Discussions & Debates)                    │
│ 3. Epistemic Call-to-Action:                                │
│    "Explore a claim and vote 'agree' or 'disagree' to start │
│     tracking how consensus and evidence evolve over time."  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RETURNING CONTRIBUTOR (Day 3+)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. WelcomeBar (Minimal)                                     │
│ 2. Personal Epistemic Updates (Top Priority):               │
│    - "1 response received on your inquiry"                  │
│    - "1 new inquiry opened on your claim"                   │
│    - "2 claims you voted on received new evidence"          │
│ 3. Discovery Feeds (Secondary)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Noise Controls & Deliberation Safeguards

To prevent epistemic fatigue:
1. **Deduplication**: Multiple responses to the same inquiry are grouped into a single card ("3 responses on inquiry: '...'").
2. **Threshold Sensitivity**: Consensus insight is only shown if a claim has a minimum sample size (e.g. >= 5 total votes). Single-vote shifts are ignored.
3. **No Phantom Delta**: If no new votes or evidence have been added since the user's vote, display: `"Consensus: 75% agree (Stable)"`. Never claim a shift occurred without verifying a change.
4. **Dismissible Cards**: A user can dismiss an update card once reviewed without deleting the underlying inquiry or vote.

---

## 10. Epistemic Empty States

When personal cards have no data, replace `return null;` with constructive prompts:

- **Empty Inquiries State**:
  > *"No active inquiries. When you encounter a claim that needs clarification, evidence, or an unexamined premise, open a structured inquiry on that claim. Responses will appear here."*
- **Empty Understanding State**:
  > *"Track understanding as it evolves. Cast a vote or add evidence to claims across active discussions to follow how consensus shifts over time."*

---

## 11. Privacy & Anonymity Considerations

Discora supports anonymous participation (`identity_mode in ('public', 'anonymous')`):
- When displaying inquiry responses or updates, if the responder posted anonymously, display `"Anonymous Participant"`.
- Personalization queries run via `auth.uid()` through `SECURITY DEFINER` RPCs to ensure users only see updates related to their own actions, while public room observers cannot reverse-engineer anonymous authors.

---

## 12. Responsive Behavior (Mobile 375px & Desktop 1440px)

- **Desktop (1440px)**: Epistemic updates present as an elegant 2-column or 3-column card grid above the feeds, allowing rapid scanning.
- **Mobile (375px)**: Epistemic updates stack vertically with clear typography and touch targets (minimum 44px height). Snippets are truncated cleanly (maximum 2 lines) to prevent overwhelming the mobile viewport.

---

## 13. Accessibility (WCAG 2.2 AA)

- Semantic `<section>` wrappers with unique `aria-labelledby` headings.
- Status badges use accessible contrast ratios (e.g. minimum 4.5:1 against card backgrounds).
- Screen-reader text on icon buttons (e.g., `aria-label="View inquiry detail and responses"`).

---

## 14. What Must NOT Be Built

The following mechanics are **strictly forbidden**:
- ❌ **Streaks**: "You've debated 3 days in a row!"
- ❌ **Points / Levels on Return**: "Come back to earn 50 XP!"
- ❌ **Likes / Claps / Upvotes**: Reaction counters on comments.
- ❌ **Unread Badges for General Room Messages**: Simulating chat app FOMO.
- ❌ **Follower Counts**: Social popularity metrics.
- ❌ **Engagement Traps**: "People are talking about topic X right now!"
