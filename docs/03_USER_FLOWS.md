# 03_USER_FLOWS.md

# Discora - User Flows

Version: 1.0

Status: Draft

Related Documents:

* 00_MASTER_CONTEXT.md
* 01_PRD.md
* 02_FEATURE_REGISTRY.md

Purpose:

This document defines how users interact with Discora's MVP features.

Each flow describes:

* Actor
* Goal
* Preconditions
* Main Flow
* Alternative Flows
* Expected Result

---

# FLOW 01 - Guest User Exploration

## Actor

Guest User

## Goal

Explore Discora without creating an account.

## Preconditions

None.

## Main Flow

1. User opens Discora.
2. User views homepage.
3. User browses discussions.
4. User browses debates.
5. User opens rooms.
6. User reads:

   * Messages
   * Claims
   * Evidence
   * Sources
   * Questions
7. User attempts participation.

## System Response

Display:

```text
Create an account to participate.
```

## Result

User can explore but cannot participate.

---

# FLOW 02 - User Registration

## Actor

Guest User

## Goal

Create an account.

## Main Flow

1. Click Sign Up.
2. Enter:

   * Username
   * Email
   * Password
3. Accept Terms.
4. Submit.
5. Account created.

## Result

User becomes Registered User.

---

# FLOW 03 - Create Discussion

## Actor

Registered User

## Goal

Create a new discussion.

## Required Fields

* Title
* Description
* Opening Statement

## Optional Fields

* Topic
* Tags
* Initial Sources

## Main Flow

1. Click Create Discussion.
2. Enter Title.
3. Enter Description.
4. Enter Opening Statement.
5. Select Topic (optional).
6. Add Tags (optional).
7. Add Sources (optional).
8. Submit.

## System Action

Search for similar discussions.

Display:

```text
Similar Discussions Found

View Existing
Create Anyway
```

## Result

Discussion Room created.

---

# FLOW 04 - Create Debate

## Actor

Registered User

## Goal

Create a debate room.

## Required Fields

* Debate Motion
* Creator Position

## Creator Positions

* Pro
* Con
* Neutral

## Main Flow

1. Click Create Debate.
2. Enter Motion.
3. Select Position.
4. Add Description (optional).
5. Add Sources (optional).
6. Submit.

## Result

Debate Room created.

---

# FLOW 05 - Join Debate

## Actor

Registered User

## Goal

Participate in a debate.

## Main Flow

1. Open Debate.
2. Click Join Debate.
3. Select:

   * Pro
   * Con
   * Neutral
4. Join room.

## Result

User participates under selected role.

---

# FLOW 06 - Anonymous Participation

## Actor

Registered User

## Goal

Post anonymously.

## Main Flow

1. Click Reply.
2. Select Identity Mode.

Options:

* Public Identity
* Anonymous Identity

3. Submit content.

## Result

Content appears anonymously to others.

Account remains internally linked for moderation.

---

# FLOW 07 - Create Comment

## Actor

Registered User

## Goal

Participate in discussion.

## Main Flow

1. Open room.
2. Enter message.
3. Select identity mode.
4. Submit.

## Result

Message appears in discussion feed.

---

# FLOW 08 - Reply To Message

## Actor

Registered User

## Goal

Respond to a specific message.

## Main Flow

1. Click Reply.
2. Write response.
3. Submit.

## Result

Reply appears with context:

```text
Replying To:
Original Message
```

---

# FLOW 09 - Create Thread / Sub Discussion

## Actor

Registered User

## Goal

Start focused conversation around a message.

## Main Flow

1. Open message.
2. Click View Thread.
3. Enter thread discussion.

## Result

Nested conversation created.

Main discussion remains organized.

---

# FLOW 10 - Create Claim

## Actor

Registered User

## Goal

Create claim.

## Required Fields

* Claim Statement
* Claim Type

## Claim Types

* Fact
* Opinion
* Prediction
* Proposal
* Observation

## Main Flow

1. Click Create Claim.
2. Enter claim.
3. Select type.
4. Submit.

## Result

Claim created.

Appears:

* In discussion feed
* In Claims tab

---

# FLOW 11 - Convert Comment To Claim

## Actor

Registered User

## Goal

Promote important statement into claim.

## Main Flow

1. Open message.
2. Click Make Claim.
3. Select claim type.
4. Confirm.

## Result

Claim object created from message.

---

# FLOW 12 - Create Question

## Actor

Registered User

## Goal

Create question.

## Required Fields

* Question
* Question Type

## Question Types

* Information
* Clarification
* Perspective
* Evidence
* Directional
* Reflective

## Result

Question appears:

* In feed
* In Questions tab

---

# FLOW 13 - Add Evidence

## Actor

Registered User

## Goal

Attach evidence to claim.

## Required Fields

* Related Claim
* Evidence Type
* Evidence Content

## Evidence Types

* Supporting
* Contradicting
* Contextual

## Result

Evidence linked to claim.

Appears:

* In feed
* In Evidence tab

---

# FLOW 14 - Add Source

## Actor

Registered User

## Goal

Attach source.

## Supported Types

* URL
* PDF
* Image
* Video

## Main Flow

1. Select Add Source.
2. Upload or paste source.
3. Add description.
4. Submit.

## Result

Source appears in Sources tab.

---

# FLOW 15 - Personal Pin

## Actor

Registered User

## Goal

Save content privately.

## Main Flow

1. Open content.
2. Click Personal Pin.

## Result

Visible only to user.

Appears in:

```text
My Pins
```

---

# FLOW 16 - Suggest Public Pin

## Actor

Registered User

## Goal

Recommend content for room-wide visibility.

## Main Flow

1. Open content.
2. Click Suggest Pin.
3. Submit.

## Result

Pin suggestion created.

Appears in:

```text
Pin Suggestions
```

section.

---

# FLOW 17 - Vote On Pin Suggestion

## Actor

Registered User

## Goal

Support or reject suggested pin.

## Main Flow

1. Open Pin Suggestions.
2. Vote:

   * Support
   * Reject

## Result

If threshold reached:

Content moves to:

```text
Public Pins
```

---

# FLOW 18 - Debate Request From Discussion

## Actor

Registered User

## Goal

Suggest formal debate.

## Main Flow

1. Open discussion.
2. Click Request Debate.
3. Enter motion.
4. Submit.

## Result

Debate request created.

Others may support.

---

# FLOW 19 - Claim-Based Debate

## Actor

Registered User

## Goal

Create debate around claim.

## Main Flow

1. Open claim.
2. Click Debate This Claim.
3. Create motion.
4. Submit.

## Result

New debate room linked to claim.

---

# FLOW 20 - User-To-User Debate Request

## Actor

Registered User

## Goal

Invite another participant to debate.

## Main Flow

1. Open user message or claim.
2. Click Request Debate.
3. Create motion.
4. Send request.

## System Action

Target user receives:

```text
Debate Invitation
Accept
Decline
```

## Result

If accepted:

Private or public debate created.

---

# FLOW 21 - AI Debate Suggestion

## Actor

System

## Goal

Suggest structured debate when appropriate.

## Conditions

* Significant disagreement
* Multiple competing claims
* Extended discussion activity

## System Message

```text
Potential Debate Opportunity

This discussion contains multiple competing viewpoints.

Would participants like to create a dedicated debate?
```

## Result

Users may ignore or proceed.

AI never creates debates automatically.

---

# FLOW 22 - Report Content

## Actor

Registered User

## Goal

Report problematic content.

## Main Flow

1. Open content.
2. Click Report.
3. Select reason.
4. Submit.

## Result

AI moderation review initiated.

If required:

Escalated to human moderators.

---

# Room Navigation Structure

Every Room Contains:

Discussion Feed
Claims
Evidence
Sources
Questions
Pins

Feed displays:

* Comments
* Claims
* Questions
* Evidence

in a unified conversation timeline.

Other tabs provide structured filtered views.

---

# MVP Flow Coverage

This document covers all MVP user interactions defined in:

01_PRD.md

Future systems such as Consensus, Open Questions Tracking, Argument Maps, Knowledge Graphs, and Topic Hubs are intentionally excluded and will be documented in future versions.
