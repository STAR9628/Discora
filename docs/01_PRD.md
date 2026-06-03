# 01_PRD.md

# Discora - Product Requirements Document (PRD)

Version: 1.0

Status: Draft

Related Document:

* 00_MASTER_CONTEXT.md

---

# 1. Product Overview

## Product Name

Discora

## Product Description

Discora is a structured discourse platform designed to improve the quality of online discussions and debates.

Unlike traditional social media platforms that prioritize engagement, reactions, and popularity, Discora focuses on understanding, evidence, reasoning, transparency, and meaningful conversation.

The platform enables users to create discussions and debates, organize ideas through claims, support arguments with evidence and sources, ask questions, and collaboratively develop better-informed conclusions.

---

# 2. MVP Goals

The purpose of the MVP is to validate the core Discora concept while keeping development complexity low.

The MVP should prove that users are willing to:

* Participate in structured discussions
* Participate in structured debates
* Create and discuss claims
* Attach evidence and sources
* Ask meaningful questions
* Use anonymous participation
* Consume discussions in a more organized format than traditional social media

The MVP is not intended to implement the complete Discora vision.

---

# 3. Target Users

## Primary Users

People interested in:

* Discussions
* Debates
* Learning
* Critical thinking
* News and current events
* Social issues
* Philosophy
* Technology
* Education

---

## Secondary Users

People who primarily read and learn from discussions without actively participating.

---

# 4. MVP Features

## Authentication System

### Guest Users

Guests may:

* Browse discussions
* Browse debates
* Read claims
* Read evidence
* Read sources
* Read questions

Guests may not participate.

---

### Registered Users

Registered users may:

* Create discussions
* Create debates
* Create claims
* Add evidence
* Add sources
* Ask questions
* Participate in discussions
* Participate in debates

---

### Identity Modes

Users may participate as:

#### Public Identity

Uses profile name.

#### Anonymous Identity

Public identity hidden.

User remains internally accountable.

---

# 5. Room Types

## Discussion Room

Purpose:

Open discussion and exploration.

No sides required.

---

## Debate Room

Purpose:

Structured examination of topics with disagreement.

Supports:

* Pro
* Con
* Neutral

participation.

---

## Private Room

Invite-only room.

Can function as:

* Private Discussion
* Private Debate

---

# 6. Discussion Feed

The primary interface should be chat-like and familiar.

Users should immediately understand how to interact with the platform.

Supports:

* Messages
* Replies
* Nested Replies
* Threaded Conversations

---

## Message Types

### Comment

Standard message.

---

### Claim

Special highlighted message.

Represents a statement intended for examination.

---

### Question

Special highlighted message.

Represents a question intended for exploration.

---

### Evidence

Special highlighted message.

Represents supporting or challenging information.

---

# 7. Structured Tabs

Every room contains:

## Discussion Tab

Displays:

* Comments
* Claims
* Questions
* Evidence

Combined in a unified feed.

---

## Claims Tab

Displays only claims.

---

## Evidence Tab

Displays only evidence.

---

## Sources Tab

Displays all sources.

---

## Questions Tab

Displays all questions.

---

## Pins Tab

Displays pinned content.

---

# 8. Claims System

Users may:

* Create claims directly
* Convert comments into claims

Claim Types:

* Fact Claim
* Opinion
* Prediction
* Proposal
* Observation

Each claim should support:

* Replies
* Evidence
* Sources
* Questions

---

# 9. Evidence System

Evidence may be attached to claims.

Evidence Types:

* Supporting
* Contradicting
* Contextual

Evidence Categories:

* Scientific
* Statistical
* Documentary
* Visual
* Experiential
* Expert
* Historical
* Logical
* Ethical
* Cultural

---

# 10. Source System

Supported Source Types:

* URL
* PDF
* Image
* Video

Each source should include:

* Title
* Description
* Source Type
* Creator

Future AI analysis is not required for MVP.

---

# 11. Questions System

Users may create questions.

Question Types:

* Information
* Clarification
* Perspective
* Evidence
* Directional
* Reflective

Questions may receive replies and discussion.

---

# 12. Pin System

Users may pin:

* Messages
* Claims
* Questions
* Evidence

Pinned content appears in the Pins tab.

---

# 13. Search & Discovery

Users should be able to:

* Search discussions
* Search debates
* Search topics

Before creating:

* Discussion
* Debate

the platform should suggest similar existing content.

---

# 14. AI Features (MVP)

## Duplicate Discussion Detection

Suggest similar discussions.

---

## Basic Source Summary

AI may generate:

* Summary
* Key Points
* Limitations

for submitted sources.

---

## Soft Moderation

AI may:

* Detect spam
* Detect harassment
* Detect threats

AI may flag content.

AI may temporarily hide content pending review.

---

# 15. Human Moderation

Human moderators perform:

* Content Review
* Appeals
* Final Decisions

AI does not perform permanent moderation actions.

---

# 16. Out of Scope (Not MVP)

The following features are intentionally excluded from MVP:

* Consensus Engine
* Open Questions Engine
* Knowledge Graphs
* Argument Maps
* Research Paper Analysis
* OCR Processing
* Source Reliability Scoring
* Expert Verification
* Position Change Tracking
* Reflection Tracking
* Topic Hubs
* Debate Intelligence
* Advanced AI Systems
* Multi-Source Comparison

These features belong to future versions.

---

# 17. Success Metrics

The MVP is considered successful if users:

* Create discussions
* Create debates
* Participate in discussions
* Create claims
* Attach evidence
* Attach sources
* Return to participate again

Primary validation metric:

Users prefer Discora's structured discussion format over traditional comment-thread discussions.

---

# 18. MVP Release Goal

Discora MVP should demonstrate:

* Structured discussions
* Structured debates
* Claims
* Evidence
* Sources
* Questions
* Anonymous participation
* AI-assisted organization

while remaining simple enough to build, deploy, and maintain with minimal infrastructure costs.
