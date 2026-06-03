# 13_FEATURE_TICKETS.md

# Discora - Master Feature Ticket Registry

Version: 1.0

Status: Active

Priority: Critical

Related Documents:

* 01_PRD.md
* 08_DEVELOPMENT_ROADMAP.md
* 09_IMPLEMENTATION_PLAN.md

Purpose:

This document serves as the master feature registry and ticket hierarchy for Discora.

All implementation work should map to one of the Epics defined in this document.

Detailed tickets may later be expanded into separate ticket documents.

---

# Ticket Naming Convention

Format:

```text
[EPIC]-[NUMBER]
```

Examples:

```text
AUTH-001

DISC-004

CLAIM-007

AI-002
```

---

# Priority Levels

P0

Critical MVP

Must exist before launch.

---

P1

Important MVP

Should exist before launch.

---

P2

Post-MVP

Can be delayed.

---

P3

Future Vision

Not part of MVP.

---

# Epic Overview

| Epic   | Name           | Priority |
| ------ | -------------- | -------- |
| FOUND  | Foundation     | P0       |
| AUTH   | Authentication | P0       |
| USER   | User Profiles  | P0       |
| TOPIC  | Topics         | P1       |
| DISC   | Discussions    | P0       |
| DEBATE | Debates        | P0       |
| CLAIM  | Claims         | P0       |
| EVID   | Evidence       | P0       |
| SOURCE | Sources        | P0       |
| QUEST  | Questions      | P1       |
| VOTE   | Voting         | P0       |
| PIN    | Pins           | P1       |
| NOTIF  | Notifications  | P1       |
| SEARCH | Search         | P1       |
| REAL   | Realtime       | P0       |
| AI     | AI Systems     | P1       |
| MOD    | Moderation     | P1       |
| ADMIN  | Admin Systems  | P1       |

---

# EPIC FOUND - Foundation

Goal:

Project infrastructure.

---

FOUND-001

Project Setup

Priority:

P0

---

FOUND-002

Supabase Setup

Priority:

P0

---

FOUND-003

Environment Configuration

Priority:

P0

---

FOUND-004

Folder Structure

Priority:

P0

---

FOUND-005

Theme System

Priority:

P0

---

FOUND-006

Shared Types

Priority:

P0

---

FOUND-007

Error Handling Framework

Priority:

P0

---

FOUND-008

API Client Setup

Priority:

P0

---

# EPIC AUTH - Authentication

Goal:

Account creation and access control.

---

AUTH-001

Register User

---

AUTH-002

Login User

---

AUTH-003

Logout User

---

AUTH-004

Email Verification

---

AUTH-005

Google Sign In

---

AUTH-006

Protected Routes

---

AUTH-007

Password Reset

---

AUTH-008

Session Management

---

# EPIC USER - User Profiles

Goal:

Identity and profile management.

---

USER-001

Profile Page

---

USER-002

Profile Editing

---

USER-003

Avatar Upload

---

USER-004

Username Change System

---

USER-005

User Statistics

---

USER-006

Topic Activity Metrics

---

USER-007

Agreement Metrics

---

# EPIC TOPIC - Topics

Goal:

Topic organization.

---

TOPIC-001

Topic Creation

---

TOPIC-002

Topic Listing

---

TOPIC-003

Topic Detail Page

---

TOPIC-004

Topic Discovery

---

TOPIC-005

Personal Topic Interests

---

# EPIC DISC - Discussions

Goal:

Core platform feature.

---

DISC-001

Create Discussion

---

DISC-002

Discussion Feed

---

DISC-003

Discussion Detail Page

---

DISC-004

Discussion Listing

---

DISC-005

Anonymous Posting

---

DISC-006

Nested Replies

---

DISC-007

Discussion Editing

---

DISC-008

Discussion Lifecycle

---

# EPIC DEBATE - Debates

Goal:

Structured disagreement.

---

DEBATE-001

Create Debate

---

DEBATE-002

Debate Detail Page

---

DEBATE-003

Join Debate

---

DEBATE-004

Debate Position Management

---

DEBATE-005

Neutral Participation

---

DEBATE-006

Debate Requests

---

DEBATE-007

Debate Invitations

---

DEBATE-008

Convert Debate To Discussion

---

# EPIC CLAIM - Claims

Goal:

Structured arguments.

---

CLAIM-001

Create Claim

---

CLAIM-002

Convert Message To Claim

---

CLAIM-003

Claim Detail Page

---

CLAIM-004

Claim Types

---

CLAIM-005

Claim Revision History

---

CLAIM-006

Claim Search

---

CLAIM-007

Claim Analytics

---

# EPIC EVID - Evidence

Goal:

Evidence-based discussion.

---

EVID-001

Create Evidence

---

EVID-002

Evidence Detail Page

---

EVID-003

Evidence Categories

---

EVID-004

Evidence Verification Requests

---

EVID-005

Evidence Search

---

EVID-006

Multi-Claim Evidence Linking

---

# EPIC SOURCE - Sources

Goal:

Reference management.

---

SOURCE-001

Source Upload

---

SOURCE-002

Source Detail Page

---

SOURCE-003

Source Attachments

---

SOURCE-004

Source Retraction

---

SOURCE-005

Image Sources

---

SOURCE-006

PDF Sources

---

SOURCE-007

URL Sources

---

SOURCE-008

Video Link Sources

---

# EPIC QUEST - Questions

Goal:

Structured inquiry.

---

QUEST-001

Create Question

---

QUEST-002

Question Types

---

QUEST-003

Question Detail Page

---

QUEST-004

Question Replies

---

QUEST-005

Question Search

---

# EPIC VOTE - Voting

Goal:

Agreement tracking.

---

VOTE-001

Agree Voting

---

VOTE-002

Disagree Voting

---

VOTE-003

Vote Removal

---

VOTE-004

Vote Analytics

---

# EPIC PIN - Pins

Goal:

Community knowledge surfacing.

---

PIN-001

Personal Pins

---

PIN-002

Public Pin Suggestions

---

PIN-003

Pin Voting

---

PIN-004

Pinned Content View

---

# EPIC NOTIF - Notifications

Goal:

User awareness.

---

NOTIF-001

Notification Center

---

NOTIF-002

Reply Notifications

---

NOTIF-003

Mention Notifications

---

NOTIF-004

Debate Notifications

---

NOTIF-005

Pin Notifications

---

NOTIF-006

Notification Preferences

---

# EPIC SEARCH - Search

Goal:

Content discovery.

---

SEARCH-001

Global Search

---

SEARCH-002

Discussion Search

---

SEARCH-003

Debate Search

---

SEARCH-004

Claim Search

---

SEARCH-005

Source Search

---

SEARCH-006

User Search

---

# EPIC REAL - Realtime

Goal:

Live interactions.

---

REAL-001

Realtime Messages

---

REAL-002

Realtime Replies

---

REAL-003

Realtime Claims

---

REAL-004

Realtime Evidence

---

REAL-005

Realtime Notifications

---

# EPIC AI - AI Systems

Goal:

AI assistance.

---

AI-001

Source Summaries

---

AI-002

Similar Discussion Detection

---

AI-003

Basic Moderation Assistance

---

AI-004

Source Metadata Extraction

---

# EPIC MOD - Moderation

Goal:

Platform protection.

---

MOD-001

Content Reporting

---

MOD-002

Report Queue

---

MOD-003

AI Flagging

---

MOD-004

Human Review Workflow

---

MOD-005

Temporary Content Hiding

---

MOD-006

Ban System

---

MOD-007

Audit Logs

---

# EPIC ADMIN - Admin Systems

Goal:

Platform management.

---

ADMIN-001

Admin Dashboard

---

ADMIN-002

Moderator Management

---

ADMIN-003

Platform Analytics

---

ADMIN-004

Rate Limit Controls

---

ADMIN-005

Content Oversight

---

ADMIN-006

Anonymous Identity Investigation

---

# MVP Ticket Scope

Must Be Completed Before Launch

```text
FOUND
AUTH
USER
DISC
DEBATE
CLAIM
EVID
SOURCE
VOTE
REAL
SEARCH
NOTIF
AI
MOD
```

---

# Post-MVP Ticket Scope

Can Be Delayed

```text
TOPIC

PIN

ADMIN
```

---

# Future Ticket Scope

Not MVP

```text
Consensus System

Open Questions Engine

Knowledge Evolution

Argument Maps

Knowledge Graph

Topic Hubs

Source Intelligence
```

These features will receive dedicated epics in future versions.

---

# Final Ticket Philosophy

Every implementation task in Discora should map to a ticket.

Every ticket should map to an Epic.

Every Epic should support the mission of helping users engage in structured, evidence-based discussion while building better understanding over time.
