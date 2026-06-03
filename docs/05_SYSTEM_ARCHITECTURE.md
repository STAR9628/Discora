# 05_SYSTEM_ARCHITECTURE.md

# Discora - System Architecture

Version: 1.0

Status: Draft

Related Documents:

* 00_MASTER_CONTEXT.md
* 01_PRD.md
* 02_FEATURE_REGISTRY.md
* 03_USER_FLOWS.md
* 04_DATABASE_DESIGN.md

Purpose:

This document defines the technical architecture, infrastructure, services, deployment strategy, and scalability plan for Discora MVP.

---

# 1. Architecture Philosophy

Discora should be:

* Simple to develop
* Cheap to operate
* Easy to deploy
* Easy to maintain
* Modular
* Scalable
* AI-ready

The MVP architecture should prioritize development speed and reliability while maintaining a clear upgrade path for future growth.

---

# 2. Architectural Principles

## Knowledge First

Discora is not merely a discussion platform.

Discora is a structured knowledge-building platform.

Architecture decisions should support:

* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions
* Future Consensus
* Future Knowledge Evolution

---

## Structured Data Over Comment Chains

Important information should exist as structured entities.

Avoid storing critical knowledge only within message threads.

---

## AI As A Service Layer

AI should be an independent service.

The platform should be able to switch between:

* Gemini
* OpenAI
* Claude
* Local Models

without redesigning the application.

---

## Realtime By Default

Discussions should feel alive.

Realtime communication is a core requirement.

---

# 3. Technology Stack

## Frontend

Framework:

```text
Next.js 15
```

Language:

```text
TypeScript
```

Styling:

```text
Tailwind CSS
```

UI Components:

```text
shadcn/ui
```

State Management:

```text
Zustand
```

Data Fetching:

```text
TanStack Query
```

---

## Backend

Platform:

```text
Supabase
```

Services:

```text
Database
Authentication
Realtime
Storage
```

---

## Database

```text
PostgreSQL
```

Managed by:

```text
Supabase
```

---

## Authentication

```text
Supabase Auth
```

Methods:

* Email + Password
* Email Verification
* OTP Verification
* Google Sign-In

---

## Storage

```text
Supabase Storage
```

Supported Files:

* Images
* PDFs

Video uploads are excluded from MVP.

Video links are supported.

---

## Realtime

```text
Supabase Realtime
```

Used for:

* New Messages
* Replies
* Debate Activity
* Notifications
* Live Updates

---

## AI

Provider:

```text
Google Gemini
```

MVP Responsibilities:

* Source Summaries
* Duplicate Discussion Detection
* Basic Moderation
* Basic Content Analysis

Future Providers:

* OpenAI
* Claude
* Local Models

---

## Hosting

Frontend:

```text
Vercel
```

Backend:

```text
Supabase
```

---

# 4. High-Level System Architecture

```text
User
│
▼
Next.js Frontend
│
├── Authentication
├── Discussions
├── Debates
├── Claims
├── Evidence
├── Sources
├── Questions
├── Notifications
└── Search
│
▼
Supabase
│
├── PostgreSQL
├── Auth
├── Realtime
├── Storage
└── Edge Functions
│
▼
Gemini Service Layer
```

---

# 5. Frontend Architecture

## Application Layers

### Presentation Layer

Handles:

* UI Components
* Pages
* Layouts

---

### Feature Layer

Handles:

* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions

---

### Data Layer

Handles:

* API Calls
* Queries
* Realtime Updates

---

# 6. Frontend Module Structure

```text
src/

app/

components/

features/

  discussions/
  debates/
  claims/
  evidence/
  sources/
  questions/
  notifications/

services/

hooks/

types/

utils/
```

---

# 7. Room Architecture

Every room contains:

```text
Discussion Feed

Claims

Evidence

Sources

Questions

Pins
```

---

## Discussion Feed

Contains:

* Messages
* Claims
* Evidence
* Questions

Unified timeline.

---

## Structured Tabs

Each tab represents a filtered view of the same room data.

---

# 8. Realtime Architecture

Realtime events:

```text
message_created

reply_created

claim_created

evidence_created

question_created

notification_created
```

---

Flow:

```text
User A Posts Message

↓

Database Updated

↓

Realtime Event Triggered

↓

Connected Users Updated
```

---

# 9. Authentication Architecture

Guest Users:

Read-only.

---

Registered Users:

Can participate.

---

Identity Modes:

```text
Public
Anonymous
```

Anonymous users remain internally linked to accounts.

---

# 10. Notification Architecture

Notification Center:

```text
Bell Icon
```

Stores:

* Replies
* Debate Requests
* Debate Invitations
* Pin Suggestions
* Mentions
* Moderation Updates

---

Optional:

Email Notifications

User Controlled.

---

# 11. Search Architecture

MVP Search:

```text
PostgreSQL Full Text Search
```

Searches:

* Users
* Topics
* Rooms
* Claims
* Questions
* Sources

---

Future Upgrade:

```text
Typesense
```

or

```text
Meilisearch
```

---

# 12. Source Architecture

Supported:

* URLs
* PDFs
* Images
* Video Links

---

Upload Flow:

```text
Upload

↓

2 Minute Grace Period

↓

Locked

↓

Retractable
```

---

After use in discussions:

Sources cannot be deleted.

Only:

```text
Retracted
```

---

# 13. Editing Architecture

## Messages

Editable for:

```text
5 Minutes
```

After editing:

```text
Edited Indicator
```

shown.

History retained.

---

## Claims

Claims maintain:

```text
Version History
```

All revisions stored.

---

## Sources

No destructive edits.

Only:

* Replace
* Retract

---

# 14. Username Architecture

Username Changes:

```text
Once Every 30 Days
```

History retained internally.

---

# 15. Feed Architecture

Homepage:

```text
Trending Discussions

Trending Debates

Recent Discussions

Recent Debates
```

---

Personalization:

Based on:

* Followed Topics
* Interests
* Activity

---

Room Feed:

Default:

```text
Latest
```

Alternative:

```text
Most Agreed

Most Discussed
```

---

# 16. Moderation Architecture

Layer 1:

AI Moderation

Responsibilities:

* Spam Detection
* Harassment Detection
* Threat Detection

---

Layer 2:

Human Moderation

Responsibilities:

* Appeals
* Final Decisions
* Rule Enforcement

---

AI cannot permanently remove content.

---

# 17. AI Service Layer

AI should never directly interact with UI.

Architecture:

```text
Frontend

↓

AI Service

↓

Gemini

↓

Response

↓

Frontend
```

Benefits:

* Provider Independence
* Easier Upgrades
* Lower Vendor Lock-In

---

# 18. Room Lifecycle

Discussion:

```text
Open

↓

Inactive

↓

Archived
```

---

Debate:

```text
Open

↓

Inactive

↓

Open Discussion

↓

Archived
```

---

Future:

Consensus and Living Knowledge systems may use these states.

---

# 19. Security Principles

Requirements:

* Password Hashing
* Row Level Security
* Input Validation
* Rate Limiting
* Audit Logging

All user-generated content must be treated as untrusted input.

---

# 20. Scalability Strategy

Phase 1:

Supabase + Vercel

---

Phase 2:

Dedicated Search

---

Phase 3:

Dedicated AI Services

---

Phase 4:

Knowledge Systems

---

Architecture should support growth without requiring complete rewrites.

---

# 21. Future Expansion Architecture

Reserved Modules:

```text
Consensus Engine

Open Questions

Argument Mapping

Knowledge Graph

Source Intelligence

Research Paper Analysis

Knowledge Evolution
```

These systems should integrate through new services rather than replacing existing architecture.

---

# 22. Final Architecture Vision

Discora is architected as:

Discussion Platform
+
Debate Platform
+
Structured Knowledge Platform

The system is designed to evolve from simple conversations into organized, evidence-supported knowledge while preserving transparency, freedom of thought, and human decision-making.
