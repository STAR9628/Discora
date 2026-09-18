# Discora Discussion Room — UX & Architecture Specification

**Document Type:** Approved Product / UX / Architecture Specification  
**Status:** APPROVED DIRECTION  
**Scope:** Discussion Rooms, with shared architecture intended to be reused by Debate Rooms  
**Version:** V1  
**Last Updated:** 2026-09-08

---

## 0. Purpose

This document defines the approved UX and architecture direction for the next evolution of Discora Discussion Rooms.

It is intended to be readable and actionable by any implementation, design, QA, or architecture agent.

This is an approved product specification. Agents MUST NOT reinterpret Discora philosophy or invent competing product behavior.

> **Discora should feel familiar at the interaction layer and different at the understanding layer.**

Discora should feel like a familiar group chat while providing an additional understanding layer through Claims, Evidence, Arguments, Questions, Targeted Inquiries, and State of Understanding.

---

# 1. Product Hierarchy and Authority

Agents MUST respect this hierarchy:

1. **Discora Philosophy** — highest authority / constitution
2. **Original Discora MDs** — product foundation / bedrock
3. **Approved product decisions**
4. **This specification**
5. **Current implementation**
6. **UX/UI optimization**

If current code conflicts with this specification, the code is not automatically correct simply because it already exists.

If an implementation requirement would materially change the Discora philosophy or foundational product model, STOP and request product-owner review.

Do not silently modify the original foundational MDs.

---

# 2. Core Product Principle

## 2.1 Familiar interaction layer

Discussion should feel familiar to users of WhatsApp, Telegram, Instagram, and other familiar group-chat systems.

Users should be able to naturally:
- read messages
- send messages
- reply
- react
- share links
- participate chronologically
- discover other people's contributions

The room must NOT feel like a database, analytics dashboard, knowledge-management IDE, or competitive debate scoreboard.

## 2.2 Discora understanding layer

Discora adds structure when users want to examine something more deeply:

```text
Conversation
    ↓
Claim
    ↓
Support / Challenge
    ↓
Evidence + Arguments
    ↓
Questions / Targeted Inquiries
    ↓
State of Understanding
```

Structure should be progressively revealed rather than forced onto every message.

---

# 3. Discussion Room IA

## 3.1 Conversation is the primary room experience

When a user enters a Discussion Room, they enter the **Conversation**.

Conversation is the default and primary view.

Claims, Evidence, Sources, Questions, and State of Understanding are alternate lenses over the same room content. They are NOT separate disconnected destinations.

## 3.2 Room-local navigation

While inside a Discussion, the global sidebar contains a room-specific subsection under Discussions.

```text
DISCUSSIONS

...

CURRENT DISCUSSION
──────────────────
Conversation
Claims
Evidence
Sources
Questions
State of Understanding
```

The room subsection MUST be:
- expandable
- collapsible
- compact when collapsed
- usable for navigating room-local views

## 3.3 Current-room visibility rule

The room-specific subsection appears ONLY while the user is inside that Discussion or Debate.

When the user leaves the room:
- the room subsection disappears
- it must not remain persistently expanded in the global sidebar

Saved rooms do NOT appear as individual room subsections in the global sidebar.

All saved rooms are accessed through the **Saved** page.

## 3.4 Personal room alias

If a user saves a room, they may optionally give that room a private personalized name.

Rules:
- The alias belongs only to that user.
- Other users never see it.
- It does not modify the canonical room title.
- The canonical title does not need to be displayed in full in the sidebar if the user has assigned a shorter personal alias.
- Rename should be available subtly, e.g. on hover or through a room action menu.

---

# 4. Discussion Header

The room header MUST remain compact.

It should primarily communicate:
- canonical room title
- `Discussion`

Example:

```text
Should AI-generated content be clearly labeled online?
Discussion
```

Do NOT create a large dashboard-style header containing:
- large statistics blocks
- participant scorecards
- reputation
- winner/loser information
- oversized metadata

Compact room actions such as Save, Share, and More may exist on the same header row without creating a large secondary header.

---

# 5. Main Conversation

## 5.1 Chronological chat

The Conversation should primarily be chronological.

Normal messages should look and behave like familiar group-chat messages.

The room must not visually classify every normal message as an epistemic object.

## 5.2 Normal message

A normal message is simply a contribution to conversation.

```text
Aisha

I think AI-generated content should be labeled.

Reply   React   ⋯
```

Normal messages do NOT automatically receive:
- evidence status
- credibility scores
- Support/Challenge voting
- reputation indicators
- truth labels
- SoU labels

## 5.3 Message actions

Recommended standard actions:
- Reply
- React
- Request as Claim
- More

## 5.4 Clickable links

Links must be clickable wherever they appear in the room, including:
- normal chat messages
- Claim content
- Evidence contributions
- Source references
- relevant Argument content

A link should remain clickable when the same contribution is viewed through a structured room lens.

---

# 6. Claims

## 6.1 Definition

A Claim is a statement intentionally put forward for examination.

A normal message is NOT automatically a Claim.

Example:

```text
Girls should be allowed to work.
```

As an ordinary message, it remains conversation.

If explicitly made into a Claim, it enters the structured understanding layer.

## 6.2 Claim creation

Claim creation must be easy.

The composer should provide:

```text
Message   Claim   Question
```

Default mode:

```text
Message
```

A user can switch to Claim and send it directly.

Basic Claim creation should NOT require a long form.

Advanced details such as Claim type may be optional and can be collected after creation.

## 6.3 Author-created Claim

An author may later convert their own normal message into a Claim.

Example:

```text
⋯
Make this a Claim
```

The original message becomes the Claim in-place.

Do NOT create duplicate message content for the same Claim.

## 6.4 Claim request

Other users may request that a normal message be formalized as a Claim.

The request is voluntary and non-punitive.

A requester should be able to use:

```text
Request as Claim
```

## 6.5 Aggregated Claim Requests

Multiple users requesting the same message must NOT produce multiple simultaneous popups.

Use one aggregated request state.

Example:

```text
4 people requested this as a Claim
```

The UI may identify requesters:

```text
Rahul, Priya, Arjun and 1 other
```

If another request arrives, update the existing request state:

```text
5 people requested this as a Claim
```

If the popup has been dismissed and a new request arrives, it may reappear with updated information.

## 6.6 Claim Request actions

The sender MUST have exactly three request-state choices:

```text
Accept
Skip
Decline
```

### Accept

The original message becomes a Claim.

Subtle status text may say:

> You accepted the request to make this a Claim.

### Skip

The sender does not act on the request.

Subtle status text:

> You skipped the request to make this a Claim.

After Skip, the sender should see a subtle option below the relevant text/message:

```text
+ Add as Claim
```

This allows reconsideration later.

### Decline

The sender explicitly rejects the request.

Subtle status text:

> You declined the request to make this a Claim.

Declining MUST NOT:
- reduce reputation
- create a public penalty
- shame the sender
- mark the sender as uncooperative
- affect authority

The decline state should remain visually subtle.

## 6.7 Claim Request state model

```text
Pending
   ├── Accept
   ├── Skip
   └── Decline

Skip
   └── + Add as Claim
```

Do not treat Skip and Decline as equivalent.

---

# 7. Claim Card

A Claim should receive subtle visual emphasis.

It should be:
- clearly distinguishable from a normal message
- slightly larger than a normal message bubble
- compact
- readable
- non-flashy
- integrated into chronological conversation

It MUST NOT occupy the entire horizontal conversation width unless required by responsive constraints.

Recommended conceptual structure:

```text
Rahul

┌─────────────────────────────┐
│ CLAIM                       │
│                             │
│ AI-generated content should │
│ be clearly labeled online.  │
│                             │
│ + Evidence   + Argument     │
│                             │
│ 72 Support · 28 Challenge   │
│ [Support]      [Challenge]  │
└─────────────────────────────┘
```

The card should feel like a structured chat message, not a dashboard panel.

---

# 8. Community Stance: Support / Challenge

## 8.1 Purpose

Once something is a Claim, people may express whether they support or challenge it.

This records **community stance/belief**.

It does NOT establish truth.

## 8.2 Terminology

Use:
- Support
- Challenge

Do not represent voting as:
- correctness
- truth
- evidence quality
- authority
- consensus about truth

## 8.3 Placement

Support/Challenge data should be at the **bottom-most portion of the Claim card**.

The Claim and its examination tools should receive greater visual priority.

```text
CLAIM

AI-generated content should be clearly labeled online.

+ Evidence
+ Argument

────────────────────

72 Support · 28 Challenge · 100 votes
[Support] [Challenge]
```

Do NOT use a large consensus/progress bar that could visually imply that 72% means 72% correct.

## 8.4 Hard epistemic rule

Community votes MUST NEVER influence:
- State of Understanding
- evidence quality
- evidence strength
- truth
- correctness
- authority
- credibility of a Claim
- recommendations based on epistemic quality

A highly supported Claim may have weak evidence.

A poorly supported Claim may have strong evidence.

These layers must remain separate.

---

# 9. Evidence

## 9.1 Definition

Evidence is information, material, source, data, observation, record, or other relevant material used to:
- support a Claim
- contradict a Claim
- contextualize a Claim

## 9.2 Claim relationship is mandatory

Every structured Evidence contribution MUST identify the Claim it belongs to.

Evidence must never become an ambiguous standalone object.

Examples:

```text
Priya

I found a study that complicates this assumption.

↳ Evidence for:
  "AI-generated content should be clearly labeled."
```

```text
↳ Evidence challenging:
  "AI-generated content should be clearly labeled."
```

```text
↳ Context for:
  "AI-generated content should be clearly labeled."
```

## 9.3 One primary Claim per Evidence contribution

For V1, each Evidence contribution has one primary Claim relationship.

Do not introduce many-to-many Claim relationships without explicit product approval.

## 9.4 Evidence in Conversation

Evidence remains chronological in the main Conversation.

It should look like a normal chat contribution with subtle structured metadata.

Do NOT turn every Evidence contribution into a giant colored Evidence card.

## 9.5 Evidence in Evidence lens

When viewed through the Evidence lens, the contribution must still show which Claim it belongs to.

The user must never wonder:

> Which Claim is this Evidence about?

## 9.6 Evidence replies

Users can reply to Evidence.

Evidence should retain normal conversational behavior:
- Reply
- React
- More

The Claim relationship remains visible.

---

# 10. Arguments

## 10.1 Definition

An Argument is reasoning that connects information or premises to a position regarding a Claim.

Evidence and Argument are distinct.

**Evidence:** What relevant material/information do we have?

**Argument:** How does that material/reasoning support or challenge the Claim?

## 10.2 Arguments are Claim-attached in V1

Arguments are structured responses attached to a Claim.

They are NOT a top-level composer mode in V1.

Users normally reach them from:

```text
Claim
+ Argument
```

## 10.3 Argument relationship

Every Argument must identify its primary Claim.

Supporting example:

```text
Arjun

If users cannot distinguish AI-generated material,
they may evaluate it using assumptions that do not
apply to human-created material.

↳ Argument supporting
  "AI-generated content should be clearly labeled."
```

Challenging example:

```text
Priya

This policy could create unnecessary friction for
minor AI-assisted edits.

↳ Argument challenging
  "AI-generated content should be clearly labeled."
```

## 10.4 Argument relationship language

Use:
- Argument supporting
- Argument challenging

Do NOT confuse this with Support/Challenge voting.

Voting describes community stance.

Arguments describe reasoning directed toward the Claim.

## 10.5 Argument in Conversation

Arguments appear chronologically in the Conversation.

They should look like normal chat contributions with subtle structured relationship information.

Do not move them into a separate disconnected discussion.

## 10.6 Argument replies

Users can reply to Arguments.

The Claim relationship remains visible.

---

# 11. Evidence and Argument Relationship Visualization

Evidence and Arguments should have subtle visual relationships to their Claim.

Recommended conceptual relationship:

```text
CLAIM
   │
   ├── Evidence
   │
   └── Argument
```

The relationship can use:
- a subtle connector
- indentation
- a small relationship label
- muted visual hierarchy

Do NOT turn normal conversation into a graph.

The chronological chat remains primary.

The relationship layer should answer:

> What Claim is this contribution about?

without overwhelming the conversation.

---

# 12. Targeted Inquiries

Targeted Inquiries remain distinct from Questions.

**Questions** = broad/topic-level exploration.

**Targeted Inquiries** = Claim-specific examination.

Targeted Inquiries should be contextually accessible from a Claim.

They should NOT become another mandatory top-level composer mode.

Example:

```text
Claim
+ Evidence
+ Argument
+ Targeted Inquiry
```

Do not merge Questions and Targeted Inquiries.

---

# 13. Questions

Questions remain a first-class contribution type.

The composer may provide:

```text
Message   Claim   Question
```

Questions should remain conversational and can also be surfaced through the Questions lens.

Questions are not required to target a Claim.

---

# 14. Composer

The primary composer should remain simple.

```text
┌──────────────────────────────────────────┐
│ Write a message...                       │
│                                          │
│ ＋   Message   Claim   Question    Send │
└──────────────────────────────────────────┘
```

Default: **Message**

Available direct creation modes:
- Message
- Claim
- Question

Evidence and Argument are normally initiated from a Claim.

Targeted Inquiry is normally initiated from a Claim.

Do not overload the composer with every structured contribution type.

---

# 15. Structured Room Lenses

Room-local navigation provides:

```text
Conversation
Claims
Evidence
Sources
Questions
State of Understanding
```

These are lenses over the same room data.

They must not become disconnected parallel systems.

## 15.1 Claims lens

Shows Claims from the room.

Each Claim remains connected to its conversation origin.

## 15.2 Evidence lens

Shows Evidence and always identifies the Claim relationship.

## 15.3 Sources lens

Shows Sources associated with room material.

Links remain clickable.

## 15.4 Questions lens

Shows room Questions.

## 15.5 State of Understanding lens

Shows the current evidence-led understanding when the room has matured enough for meaningful synthesis.

---

# 16. Structured View Navigation

Structured views must preserve conversational origin.

Hard rule:

> **A contribution must never lose its conversational origin when viewed through a structured lens.**

Therefore:
- Claims view → Claim came from this Conversation
- Evidence view → Evidence came from this Conversation and identifies its Claim
- Arguments → Argument came from this Conversation and identifies its Claim
- Questions view → Question came from this Conversation
- SoU → synthesis of material produced in this Conversation

Recommended interaction:

### Desktop

Selecting a structured item can open a focused detail panel or contextual view while preserving room context.

### Mobile

Selecting a structured item should preferably jump to the corresponding contribution in Conversation or open a focused contextual view that clearly preserves the room connection.

Do not create navigation that makes users feel they have left the room and entered an unrelated database record.

---

# 17. Claim Editing and Deletion

## 17.1 Editing

Authors may edit Claims according to normal message-editing rules.

Minor edits should remain straightforward.

If meaningful examination has already accumulated, the system should clearly indicate that the Claim was edited where appropriate.

Do NOT invent a complex version-history system for V1 without approval.

Existing Evidence/Arguments remain associated with the Claim object.

## 17.2 Claim deletion lock

A newly created Claim cannot be immediately deleted.

For V1:

> **20-minute deletion lock**

The Claim becomes deletable only after 20 minutes from Claim creation.

The timer is a **deletion lock**, not a Claim expiration.

The Claim remains active indefinitely unless the author chooses to delete it after the lock expires.

## 17.3 Future scale setting

When Discora grows, the deletion lock may be reduced to:

> **5 minutes**

The duration MUST therefore be implemented as a configurable product setting rather than scattered hard-coded UI behavior.

V1 value:

```text
20 minutes
```

Future scale value:

```text
5 minutes
```

## 17.4 Enforcement

Deletion eligibility MUST be enforced server-side.

Do not rely only on hiding/showing the Delete button in the client.

## 17.5 Deleted Claim references

Deleting a Claim must not silently destroy the meaning of related conversational contributions.

Associated Evidence/Arguments should remain understandable.

If their original Claim is deleted, show an appropriate subtle state such as:

```text
↳ Previously attached to a deleted Claim
```

Do not invent additional deletion behavior without product approval.

---

# 18. Discussion vs Debate

Discussion and Debate should share the same core conversation architecture.

Both use:

```text
Message
Claim
Evidence
Argument
Question
Targeted Inquiry
State of Understanding
```

Debate adds structural context:
- Motion
- Proposition
- Opposition

Proposition and Opposition are structural roles.

They are NOT:
- Winner
- Loser
- Draw
- competitive score

Winner/Loser/Draw systems are prohibited by the approved product direction.

Debate should feel like the same familiar chat architecture with additional structured positional context.

---

# 19. State of Understanding

## 19.1 Purpose

State of Understanding (SoU) represents the room's current understanding based on the material available in the room.

It is not:
- a truth meter
- a majority vote
- a popularity score
- a winner indicator
- a reputation score

## 19.2 Evidence-led

SoU must be based on epistemic material in the room, including relevant:
- Claims
- Evidence
- Arguments
- relationships among them

Community Support/Challenge votes MUST NOT be used as SoU evidence.

## 19.3 Emergent maturity

A new Discussion does not need to immediately display a prominent SoU result.

Early conversations may contain:
- opinions
- initial reactions
- questions
- incomplete claims

SoU becomes meaningful as the room develops enough structured material.

## 19.4 Maturity algorithm is OPEN

The exact automatic maturity algorithm is NOT APPROVED in this specification.

Do not invent an arbitrary threshold such as:

```text
5 claims + 3 evidence items = mature
```

Any formal SoU maturity/unlocking algorithm requires explicit product approval.

---

# 20. Sounds and Animation

The room should have subtle feedback similar to polished messaging applications.

## 20.1 Normal message

Use a subtle message entrance/pop animation.

## 20.2 Claim

Use a subtle, distinct confirmation/entrance treatment.

## 20.3 Evidence

Use a subtle distinct confirmation/entrance treatment.

## 20.4 Synchronization

Sound and animation should feel synchronized.

## 20.5 Sound character

Sounds must be:
- subtle
- ambient
- non-intrusive
- messaging-app-like

Do NOT use:
- coins
- achievement sounds
- points sounds
- competitive victory sounds
- game-like reward effects

## 20.6 Sound control

Provide a clear Chat Sounds On/Off control.

Do not invent per-room sound settings unless explicitly approved.

---

# 21. Responsive Design

## 21.1 Desktop

Desktop should provide:
- collapsible global sidebar
- expandable current-room subsection
- large central Conversation
- room-local lenses
- contextual detail where useful

Do not let navigation overwhelm the Conversation.

## 21.2 Mobile

Mobile should prioritize:
- compact room header
- Conversation
- composer
- easy Reply/React/More actions
- accessible room-local navigation

Avoid persistent UI that consumes unnecessary vertical space.

Claim cards should remain compact.

Evidence and Argument relationship indicators should remain visible but subtle.

---

# 22. Visual Design Principles

The Discussion room should be:
- familiar
- clean
- welcoming
- readable
- discussion-oriented
- knowledge-focused
- structurally clear
- visually calm

Avoid:
- excessive badges
- dense metadata walls
- dashboard panels
- oversized cards
- gamification
- competitive visual language
- green/red truth encoding
- credibility theater

Structured information should be discoverable without dominating normal conversation.

---

# 23. Epistemic Guardrails

These rules are mandatory.

## 23.1 Community stance is not truth

Support/Challenge counts represent what people in the room support or challenge.

They do not represent truth.

## 23.2 Evidence is not automatically truth

Evidence must be examined in context and can:
- support
- contradict
- contextualize

a Claim.

## 23.3 Arguments are reasoning

Arguments connect evidence/information/reasoning to a position.

They do not become truth simply because they are persuasive or popular.

## 23.4 Popularity is not epistemic authority

Number of supporters, reactions, participants, or views must not determine:
- truth
- correctness
- evidence quality
- SoU
- authority

## 23.5 No competitive outcomes

No:
- Winner
- Loser
- Draw
- competitive score
- competitive reputation
- authority ranking

## 23.6 Human judgment remains primary

Discora may organize and present information, but it must not force users toward a predetermined conclusion.

---

# 24. Data / Architecture Requirements

Conceptually:

```text
Message
  │
  ├── optional Claim
  │      │
  │      ├── Support / Challenge votes
  │      ├── Evidence[]
  │      ├── Arguments[]
  │      └── Targeted Inquiries[]
  │
  ├── Replies
  └── Reactions
```

Evidence and Arguments must retain their Claim relationship.

A structured contribution should not depend on visual proximity alone to determine what Claim it belongs to.

Claim Request data should support:
- target message
- requester identity
- aggregated requester count
- sender decision
- request state
- timestamps

Claim deletion eligibility must be enforceable from trusted server-side timestamps.

---

# 25. Interaction Rules Summary

## Normal Message

```text
Message
 ├── Reply
 ├── React
 ├── Request as Claim
 └── More
```

## Claim

```text
Claim
 ├── Support
 ├── Challenge
 ├── Evidence
 ├── Argument
 ├── Targeted Inquiry
 ├── Reply
 └── React
```

## Evidence

```text
Evidence
 ├── identifies Claim
 ├── Reply
 ├── React
 └── clickable source/link
```

## Argument

```text
Argument
 ├── identifies Claim
 ├── supporting/challenging relationship
 ├── Reply
 └── React
```

---

# 26. Anti-Patterns

Agents MUST NOT introduce:

1. Dashboard-first Discussion Rooms.
2. Separate disconnected pages for every room object.
3. Full-width oversized Claim cards.
4. Automatic epistemic classification of every normal message.
5. Vote-driven SoU.
6. Vote-driven truth/correctness.
7. Reputation-based Claim credibility.
8. Winner/Loser/Draw.
9. Competitive scorecards.
10. Gamified sound effects.
11. Public punishment for declining Claim requests.
12. Multiple popups for multiple Claim requests on the same message.
13. Duplicate messages when converting a message to a Claim.
14. Evidence without an identifiable Claim relationship.
15. Arguments without an identifiable Claim relationship.
16. Excessive graph visualization in normal Conversation.
17. Giant room headers.
18. Permanent current-room sidebar subsections outside the room.
19. Saved rooms cluttering the global sidebar.
20. Forced Claim creation.
21. Arbitrary SoU maturity thresholds without approval.
22. Silent modification of foundational Discora MDs.

---

# 27. Implementation Workflow

Any agent implementing this specification MUST follow:

```text
1. Read Discora Philosophy and relevant original MDs
        ↓
2. Read this specification completely
        ↓
3. Audit existing implementation
        ↓
4. Map existing components/data/routes to required architecture
        ↓
5. Identify gaps and architectural conflicts
        ↓
6. Stop for product-owner approval if a genuinely new capability
   or unresolved product decision is required
        ↓
7. Implement approved changes
        ↓
8. Run lint
        ↓
9. Run TypeScript validation
        ↓
10. Run production build
        ↓
11. Browser QA
        ↓
12. Responsive QA
        ↓
13. Verify epistemic guardrails
        ↓
14. Report exact changes, tests, failures, and remaining gaps
```

Do not skip the audit phase.

Do not assume existing implementation is the intended behavior.

---

# 28. QA Acceptance Criteria

## Navigation
- [ ] Current-room subsection appears only inside a room.
- [ ] Current-room subsection is expandable/collapsible.
- [ ] Saved rooms remain on Saved page.
- [ ] Personal room alias is private.

## Conversation
- [ ] Conversation is default.
- [ ] Normal messages remain normal.
- [ ] Replies work.
- [ ] Reactions work if already supported/approved.
- [ ] Links are clickable.

## Claims
- [ ] Composer supports direct Claim creation.
- [ ] Author can convert their own message to Claim.
- [ ] Original message becomes Claim in-place.
- [ ] Claim card is compact.
- [ ] Claim does not span the full conversation unnecessarily.
- [ ] Support/Challenge appears at bottom.
- [ ] Votes are not fed into SoU.

## Claim Requests
- [ ] Requests aggregate into one popup/state.
- [ ] Requester count updates.
- [ ] Accept works.
- [ ] Skip works.
- [ ] Decline works.
- [ ] Skip exposes subtle Add as Claim.
- [ ] Decline has no penalty.
- [ ] Status text reflects sender's chosen state.

## Evidence
- [ ] Evidence identifies its Claim.
- [ ] Supporting/contradicting/contextual relationship is clear.
- [ ] Evidence remains chronological.
- [ ] Evidence can be replied to.
- [ ] Source links are clickable.

## Arguments
- [ ] Arguments identify their Claim.
- [ ] Supporting/challenging relationship is clear.
- [ ] Arguments remain chronological.
- [ ] Arguments can be replied to.

## Deletion
- [ ] Claim cannot be deleted during first 20 minutes.
- [ ] Server-side enforcement exists.
- [ ] Claim becomes deletable after 20 minutes.
- [ ] Deletion lock duration is configurable.
- [ ] Future configuration can support 5 minutes.
- [ ] Related contributions do not silently lose context.

## SoU
- [ ] SoU does not use Support/Challenge votes.
- [ ] SoU is evidence/reasoning-led.
- [ ] New rooms are not forced to display premature authoritative SoU.
- [ ] No arbitrary maturity threshold is introduced without approval.

## Epistemic integrity
- [ ] No Winner/Loser/Draw.
- [ ] No competitive scorecard.
- [ ] No reputation authority on Claims.
- [ ] No popularity-as-truth.
- [ ] No green/red correctness encoding.

## Responsive
- [ ] 375px
- [ ] 390px
- [ ] 834px
- [ ] 1440px

Verify:
- no horizontal overflow
- no overlapping text
- no clipped controls
- no excessive blank space
- no oversized cards
- no oversized header
- usable touch targets
- readable chat flow

---

# 29. Explicitly Open / Not Yet Approved

The following MUST NOT be invented by an implementation agent:

1. Exact SoU maturity/unlocking algorithm.
2. New many-to-many Evidence/Claim relationships.
3. New per-room sound settings.
4. Complex Claim version-history system.
5. New reputation/authority mechanics.
6. Any replacement for the retired Winner/Loser system.
7. Any new epistemic scoring system.

If implementation requires one of these, STOP and ask the product owner.

---

# 30. Final Product Model

```text
                  DISCUSSION ROOM
                        │
                        ▼
                  CONVERSATION
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Message       Claim         Question
          │             │
          │       ┌─────┼──────────────┐
          │       │     │              │
          │   Support Challenge    Examination
          │                         │
          │              ┌──────────┼──────────┐
          │              │                     │
          │          Evidence              Argument
          │              │                     │
          │              └──────────┬──────────┘
          │                         │
          │                  Targeted Inquiry
          │                         │
          └─────────────────────────┤
                                    ▼
                         STATE OF UNDERSTANDING
```

The fundamental distinction is:

> **Conversation is where people talk. Claims are where people voluntarily put something forward for examination. Evidence and Arguments are how that Claim is examined. Support/Challenge records community stance separately. State of Understanding represents what can currently be understood from the room's material.**

Discora should therefore feel familiar enough that users can simply talk, while making deeper reasoning possible when they choose to structure what they are saying.

---

# 31. Status

**APPROVED PRODUCT DIRECTION — READY FOR IMPLEMENTATION AUDIT**

This document describes the approved direction, not permission to bypass the Discora Philosophy or foundational MDs.

Implementation agents must audit first, report conflicts/gaps, and obtain product-owner approval for genuinely new or unresolved capabilities.
