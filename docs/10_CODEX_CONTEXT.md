# 10_CODEX_CONTEXT.md

# Discora - AI Development Context

Version: 1.0

Status: Active

Priority: Critical

Purpose:

This document provides implementation context for AI coding agents working on Discora.

All generated code must follow the principles, architecture, and design decisions defined in this document.

This document should be loaded into AI coding tools before implementation.

---

# Project Overview

Discora is a structured discussion, debate, and knowledge-building platform.

Discora is not:

* A social media platform
* A traditional forum
* A comment section

Discora is:

* A discussion platform
* A debate platform
* A structured discourse platform
* A future knowledge platform

The purpose of Discora is to help people move toward better understanding through discussion, evidence, questioning, and debate.

---

# Core Philosophy

Discora does not seek:

* Popularity
* Virality
* Engagement addiction

Discora seeks:

* Understanding
* Evidence
* Clarity
* Healthy disagreement
* Knowledge building

Whenever implementation decisions are ambiguous, prefer understanding over engagement.

---

# MVP Scope

The AI must not introduce unapproved features.

MVP includes:

* Authentication
* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions
* Voting
* Pins
* Notifications
* Search
* Realtime
* AI Summaries
* Moderation

Do not implement:

* Consensus Engine
* Knowledge Graph
* Argument Maps
* Topic Hubs
* Open Questions Engine
* Knowledge Evolution

These are future features.

---

# Technology Stack

Frontend:

* Next.js 15
* TypeScript
* Tailwind CSS
* shadcn/ui

State:

* Zustand
* TanStack Query

Backend:

* Supabase

Database:

* PostgreSQL

Authentication:

* Supabase Auth

Realtime:

* Supabase Realtime

Storage:

* Supabase Storage

AI:

* Gemini

Hosting:

* Vercel

---

# Design Philosophy

UI should feel:

* Modern
* Professional
* Community-oriented
* Knowledge-focused

Inspiration:

* Linear
* Discord
* Reddit

Avoid:

* Reddit clone appearance
* Old forum appearance
* Academic software appearance

---

# Default Theme

Dark Mode

Primary experience.

Light mode supported.

---

# Core Platform Concepts

Everything in Discora revolves around Rooms.

Room Types:

* Discussion
* Debate
* Private

Every room contains:

* Messages
* Claims
* Evidence
* Sources
* Questions
* Pins

---

# Discussions

Purpose:

Exploration.

Discussions do not require sides.

Users exchange ideas and perspectives.

Discussion creation requires:

* Title
* Description
* Opening Statement

---

# Debates

Purpose:

Structured disagreement.

Debates require:

* Motion
* Position

Positions:

* Pro
* Con
* Neutral

Users may change positions later.

Position history should be preserved.

---

# Claims

Claims are first-class entities.

Claims are not standalone.

Claims must belong to:

* Discussion
  or
* Debate

Claims may originate from:

* New claim creation
* Message conversion

Claim Types:

* Fact
* Opinion
* Prediction
* Proposal
* Observation

Claims support:

* Replies
* Evidence
* Sources
* Voting

---

# Evidence

Evidence is independent.

Evidence may be connected to multiple claims.

Examples:

One research paper may support several claims.

One evidence item may:

* Support claims
* Contradict claims
* Provide context

Evidence categories:

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

# Sources

Supported:

* URLs
* PDFs
* Images
* Video Links

Sources are reusable.

A source may be attached to:

* Discussion
* Debate
* Claim
* Evidence
* Question

Sources should not be permanently deletable once referenced.

Use retraction instead.

---

# Questions

Question Types:

* Information
* Clarification
* Perspective
* Evidence
* Directional
* Reflective

Questions are first-class objects.

Not ordinary messages.

---

# Voting System

Discora uses:

* Agree
* Disagree

Not:

* Like
* Upvote
* Downvote

Purpose:

Measure agreement and disagreement.

Not popularity.

Voting applies to:

* Claims
* Evidence
* Questions
* Messages

---

# Anonymous Participation

Users may participate:

* Publicly
* Anonymously

Anonymous users remain linked internally to accounts.

Anonymous does not mean unaccountable.

Display:

```text
Anonymous
```

instead of username.

---

# Editing Rules

Messages:

Editable for 5 minutes.

After editing:

* Display Edited indicator
* Preserve history

Claims:

Maintain revision history.

Sources:

Do not allow destructive edits.

Use:

* Replace
* Retract

---

# User Profiles

Profiles display:

* Username
* Bio
* Avatar
* Join Date

Statistics:

* Discussions Created
* Debates Created
* Claims Created
* Evidence Added

Topic Activity:

* Most Active Topics

Agreement Metrics:

* Claim Agreement Rate
* Evidence Agreement Rate

Do not create trust scores.

Do not create authority rankings.

---

# Feed Rules

Homepage:

* Trending Discussions
* Trending Debates
* Recent Discussions
* Recent Debates

Inside rooms:

Default sorting:

* Latest

Optional:

* Most Agreed
* Most Discussed

---

# Room Structure

Tabs:

* Discussion
* Claims
* Evidence
* Sources
* Questions
* Pins

Discussion feed is unified.

Claims, evidence, and questions still appear in the main feed.

Other tabs are filtered views.

---

# Notification Rules

Notification types:

* Reply
* Mention
* Debate Request
* Debate Invitation
* Pin Suggestion
* Moderation Update

Group similar notifications when possible.

---

# Realtime Rules

Realtime is required.

Support:

* New messages
* Replies
* Claims
* Evidence
* Notifications

Users should not manually refresh.

---

# AI Rules

Current AI Provider:

Gemini

AI Responsibilities:

* Source summaries
* Similar discussion detection
* Basic moderation

AI must never:

* Declare truth
* Decide consensus
* Permanently remove content

Humans make final decisions.

---

# Moderation Philosophy

AI performs:

* Detection
* Flagging
* Suggestions

Humans perform:

* Review
* Appeals
* Final actions

---

# Coding Standards

Use:

* TypeScript strict mode
* Strong typing
* Reusable components
* Feature-based architecture

Avoid:

* Massive components
* Deep prop drilling
* Business logic in UI

---

# Folder Structure

```text
src/

app/

components/

features/

services/

hooks/

types/

utils/
```

Feature modules:

```text
features/

discussion/
debate/
claim/
evidence/
source/
question/
notification/
```

---

# Database Philosophy

Use:

* Foreign keys
* Proper indexes
* Row Level Security

Preserve relationships.

Never flatten the data model unnecessarily.

---

# Future-Proofing Rules

Future systems include:

* Consensus
* Open Questions
* Living Knowledge
* Knowledge Graphs
* Topic Hubs

Current implementation should not block these features.

However:

Do not implement future systems during MVP development.

---

# Final Rule

When uncertain between:

Option A:
More engagement

Option B:
More understanding

Choose:

Option B

Discora exists to improve discourse, not maximize engagement.
