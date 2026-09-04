# PHASE 3C-B: EPISTEMIC CHANGE SIGNALS REDESIGN

> **Phase**: 3C-B  
> **Type**: Design Specification (No Implementation)  
> **Status**: Ready for Review  
> **Core Objective**: Define the user experience, epistemic triggers, copy, destination hierarchy, identity safeguards, and bundling mechanics for Discora's epistemic change signals.

---

## 1. Executive Summary & Design Vision

Discora is designed to map disagreements through rigorous epistemic grounding—not to drive habit-forming notification engagement. Standard consumer platforms use notifications as dopamine hooks (likes, upvotes, generic mentions, badge counters, time-based re-engagement). 

In contrast, **Phase 3C-B epistemic change signals** exist exclusively to answer:
> *"Has the epistemic landscape surrounding a stance I committed to, a premise I stated, or an inquiry I contributed to substantively shifted in a way that requires my re-evaluation or provides intellectual closure?"*

### Core Epistemic Loop
```
USER TAKES STANCE / AUTHORS CLAIM / ANSWERS INQUIRY
                       ↓
         EPISTEMIC GROUNDING ENTERS OR RESOLVES
                       ↓
DISCORA PROVES THE CHANGE RELATIVE TO USER COMMITMENT
                       ↓
  USER CONFRONTS CHALLENGE, NEW GROUNDING, OR RESOLUTION
                       ↓
          DEEP CONTEXTUAL RE-ENGAGEMENT
```

---

## 2. Global Design Principles & Anti-Patterns

### 2.1 What Makes a Signal "Epistemic"
1. **Proven Delta Relative to Action**: The signal must be anchored against an immutable record of user commitment (e.g., $T_{\text{evidence}} > T_{\text{vote}}$).
2. **Directional Clarity**: Users must instantly know whether new evidence supports, contradicts, or contextualizes their stance.
3. **Intellectual Responsibility**: If a user authors a claim, they have a civic/epistemic obligation to see structured challenges lodged against it.
4. **Zero Vanity**: No follower alerts, no agreement tally alerts ("+5 people agreed with you"), no badge rewards.
5. **Calm Presentation**: No unread red dots, no intrusive popups, no audio pings. Signals live in a dedicated, elevated section on the personalized homepage: `Epistemic Changes on Your Contributions`.

### 2.2 Explicit Negative Rules (What Must NEVER Trigger a Signal)
- ❌ **Agreement/Vote Counts**: "Your claim reached 10 votes" (Vanity metric).
- ❌ **Same-Topic Noise**: "New activity in a discussion you browsed" (Exploration is not commitment).
- ❌ **Self-Generated Events**: My own inquiries on my claims, or my own evidence attached to my votes.
- ❌ **Passive Views**: Mere scroll or page visits must never register a user as "caring" about a claim.
- ❌ **Editorial / Admin Actions**: Automated curation or room moderation changes.

---

## 3. Detailed Signal Specifications

### 3.1 Signal A: Structured Inquiry Opened on My Claim

#### Trigger
Another user creates an `inquiry_item` targeting a claim authored by the current user (`inquiry_items.target_claim_id = claims.id` where `claims.created_by = auth.uid()` and `inquiry_items.created_by != auth.uid()`).

#### Recipient
The author of the targeted claim.

#### Epistemic Value
**Highest**. A structured inquiry is an explicit, formal challenge requesting definition, counter-evidence, or falsification criteria. When another thinker challenges a user's premise, the author is epistemically challenged to substantiate, defend, refine, or retract their claim.

#### UI Copy Patterns
- **Standard Inquiry**:
  > **Structured Inquiry Raised on Your Claim**  
  > *"What is the peer-reviewed empirical evidence regarding long-term storage degradation?"*  
  > On your claim: *"Solid-state batteries exceed lithium-ion lifecycle limits in all EV environments."*
- **Anonymous Inquiry**:
  > **Structured Inquiry Raised on Your Claim** (by Anonymous Contributor)  
  > *"How does this definition account for high-heat thermal throttling?"*  
  > On your claim: *"Neural network pruning reduces parameter memory without accuracy loss."*

#### Destination Hierarchy
1. Primary: `/inquiries/[id]` (Deep-link directly to the inquiry dialogue where the author can read the formal challenge, inspect attached citations, and submit a clarifying response).
2. Secondary context: Room title with link to `/discussions/[slug]/claims#claim-[id]`.

#### Identity & Privacy Rules
- If the claim was published under `identity_mode = 'pseudonymous'`, the signal is visible only in the author's private dashboard. Third-party observers inspecting the inquiry see only the pseudonym.
- If the inquiry author is `pseudonymous`, their handle is displayed as `Contributor [short_id]`.
- If either participant is deleted or retracted, the signal persists for the claim author but marks the inquiry author as `[Retracted/Inactive]`.
- If the room is private/unlisted, the signal is only surfaced if the author currently holds valid room membership.

#### Noise Controls & Bundling
- **Single Inquiry**: Standalone card in `Epistemic Changes`.
- **Multiple Inquiries on Same Claim**: Bundled card:
  > **3 Structured Inquiries Raised on Your Claim**  
  > *"Solid-state batteries exceed lithium-ion lifecycle limits..."*  
  > Latest: *"What is the peer-reviewed empirical evidence regarding long-term storage degradation?"*  
  > `[Review Inquiries →]` (Opens claim inquiry list).

---

### 3.2 Signal B: New Evidence Attached to a Claim I Voted On or Authored

#### Trigger
A new evidence link is attached to a claim (`claim_evidence.created_at > claim_votes.created_at` or `claim_evidence.created_at > claims.created_at` for authored claims) by another user.

#### Recipient
Users who voted on the claim (supported/contested) or authored the claim.

#### Epistemic Value
**Crucial Epistemic Humility Loop**. A user voted to "Support" a claim based on information available at timestamp $T_1$. At timestamp $T_2$, another researcher links a contradicting peer-reviewed study with high source reliability. Surfacing this contradiction tests the user's prior belief and provides the exact mechanism for belief revision.

#### UI Copy Patterns
- **Counter-Grounding (Highest Priority)**:
  > **Counter-Evidence Added to a Claim You Supported**  
  > *"Meta-analysis of 42 trials shows no statistically significant variance across control groups."* (Oxford Academic)  
  > Direction: **Contradicts** your stance on: *"Intermittent fasting reliably extends human healthspan."*
- **Supporting Grounding**:
  > **Supporting Evidence Added to a Claim You Contested**  
  > *"Replication study confirms ambient room-temperature conductivity."* (Nature Materials)  
  > Direction: **Supports** claim you contested: *"Superconducting transitions observed at ambient pressure."*
- **Contextual Grounding**:
  > **Contextual Grounding Added to a Claim You Voted On**  
  > *"Regulatory approval timeline was delayed by FDA Phase III restructuring."* (Reuters)  
  > Attached to: *"Clinical rollout scheduled for Q3 2026."*

#### Destination Hierarchy
1. Primary: `/discussions/[slug]/evidence#evidence-[id]` (Direct anchor to the newly linked evidence card with full quote, source URL, and methodology notes).
2. Secondary: Claim detail anchor `/discussions/[slug]/claims#claim-[id]`.

#### Identity & Privacy Rules
- Voting in Discora is private/anonymous at the row level; nobody else sees what claims a user voted on.
- The signal is generated via a private `SECURITY DEFINER` join between `claim_votes` and `claim_evidence`. Only `auth.uid()` receives the signal.
- The evidence submitter's identity is presented according to their evidence publication mode (`real`, `pseudonymous`, or `null`).

#### Noise Controls & Bundling
- If multiple evidence items are attached to the same claim within a 48-hour window, bundle them:
  > **2 Contradicting & 1 Supporting Sources Added**  
  > To claim you voted on: *"Intermittent fasting reliably extends human healthspan."*  
  > `[Review New Evidence (3) →]`

---

### 3.3 Signal C: Satisfaction of an Inquiry I Responded To

#### Trigger
An inquiry item where the current user submitted an `inquiry_response` has its status transitioned to `'satisfied'` (`inquiry_items.status = 'satisfied'` where `inquiry_responses.created_by = auth.uid()` and `inquiry_items.updated_at > inquiry_responses.created_at`).

#### Recipient
The responder(s) to the inquiry.

#### Epistemic Value
**Resolution & Intellectual Closure**. Unlike typical social platforms where comments disappear into an endless feed, Discora inquiries are targeted problem-solving dialogues. When an inquirer marks an inquiry satisfied, it signifies that ambiguity has been resolved, missing evidence has been supplied, or definitions have been reconciled.

#### UI Copy Patterns
- **Inquiry Satisfied**:
  > **Structured Inquiry Resolved**  
  > The inquiry you responded to has been marked **Satisfied**:  
  > *"Can someone provide the exact error margin in the baseline regression model?"*  
  > *Your contribution helped resolve this inquiry.*
- **Anonymous Inquirer Resolution**:
  > **Structured Inquiry Resolved**  
  > An anonymous inquirer accepted the clarification on:  
  > *"Clarification on Article IV jurisdiction over maritime boundaries."*

#### Destination Hierarchy
1. Primary: `/inquiries/[id]` (Deep-link directly to the satisfied inquiry dialogue highlighting the resolution banner and the chain of responses).

#### Identity & Privacy Rules
- Only users who submitted a response receive this update.
- No public leaderboard or reputation points are displayed on the card.
- Respects pseudonymity of both the inquirer and responder.

#### Noise Controls & Bundling
- Each satisfaction event is unique per inquiry item and triggers at most once.
- Filtered to events occurring within the last 14 days to prevent stale re-surfacing.

---

## 4. Homepage Integration & Layout

### 4.1 Placement in Logged-In Feed
The signal cards will occupy a prominent, designated container directly beneath the Welcome header, before the generic Exploration / Global tabs:

```
+-----------------------------------------------------------------------+
|  Welcome back, ResearchFellow                                         |
|                                                                       |
|  [!] EPISTEMIC CHANGES ON YOUR CONTRIBUTIONS (2 New)                  |
|  +-----------------------------------------------------------------+  |
|  | [CRITICAL CHALLENGE]                                            |  |
|  | Structured Inquiry Raised on Your Claim                         |  |
|  | "What is the peer-reviewed empirical evidence regarding..."    |  |
|  | On: "Solid-state batteries exceed lithium-ion lifecycle limits" |  |
|  | In: Next-Gen Battery Chemistry [Review Challenge ->]            |  |
|  +-----------------------------------------------------------------+  |
|  | [GROUNDING DELTA]                                               |  |
|  | Counter-Evidence Added to a Claim You Supported                 |  |
|  | Contradicting study from Oxford Academic linked 3 hours ago     |  |
|  | On: "Intermittent fasting reliably extends human healthspan"    |  |
|  | In: Longevity & Metabolic Interventions [Examine Evidence ->]   |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  [Discussions Feed]   [Debates Feed]   [Recent Activity]              |
|  ...                                                                  |
+-----------------------------------------------------------------------+
```

### 4.2 Visual Differentiation & Urgency Scale
Signals are styled with calm, high-contrast semantic borders:
- **Amber/Orange (`border-amber-500/40`, `bg-amber-950/10`)**: Direct inquiry on user's authored claim (Civic obligation to respond).
- **Rose/Red (`border-rose-500/40`, `bg-rose-950/10`)**: Counter-evidence added to a claim user supported (Challenge to belief).
- **Emerald/Green (`border-emerald-500/40`, `bg-emerald-950/10`)**: Inquiry satisfied / resolved (Epistemic closure).
- **Slate/Blue (`border-sky-500/40`, `bg-sky-950/10`)**: Supporting evidence added or contextual citation.

### 4.3 Empty State & Low-Activity Grace
When there are no active epistemic change signals:
- The section collapses cleanly into a subtle, non-intrusive status:
  > *"No pending epistemic challenges or new evidence on your contributions. Your explored premises remain in current standing."*
- Includes a direct link to explore open inquiries that need answers: `[Browse Open Inquiries Seeking Evidence →]`.

---

## 5. Responsive Behavior & Accessibility

### 5.1 Mobile (375px - 768px)
- Cards stack vertically with full width.
- Metadata (Direction pill, timestamp, room tag) collapses into a tidy top row.
- Touch target for the action button (`[Review Challenge →]`, `[Examine Evidence →]`) is minimum 44px height.

### 5.2 Accessibility (WCAG 2.1 AA)
- Section announced with `role="region" aria-label="Epistemic changes on your contributions"`.
- Color is never the sole indicator of direction; badges include clear text: `[Counter-Evidence]`, `[Inquiry Raised]`, `[Resolved]`.
- Semantic heading levels preserved (`h2` for section, `h3` for individual change cards).
