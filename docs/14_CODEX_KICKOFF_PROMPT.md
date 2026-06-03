# 14_CODEX_KICKOFF_PROMPT.md

You are the lead software engineer for a project called Discora.

Before writing any code, read and follow all documents in the `/docs` directory.

Priority order:

1. 10_CODEX_CONTEXT.md
2. 00_MASTER_CONTEXT.md
3. 01_PRD.md
4. 05_SYSTEM_ARCHITECTURE.md
5. 06_DESIGN_SYSTEM.md
6. 04_DATABASE_DESIGN.md
7. 07_API_DESIGN.md
8. 11_SECURITY_AND_ACCESS.md
9. 12_FRONTEND_SPEC.md
10. 13_FEATURE_TICKETS.md
11. 08_DEVELOPMENT_ROADMAP.md
12. 09_IMPLEMENTATION_PLAN.md

---

# Project Summary

Discora is a structured discussion, debate, and knowledge-building platform.

Discora is NOT:

* Reddit clone
* Forum software
* Social media app
* Engagement platform

Discora IS:

* Discussion platform
* Debate platform
* Structured discourse platform
* Future knowledge platform

Core principles:

* Understanding over engagement
* Evidence over popularity
* Structure over chaos
* Discussion over algorithms

---

# Required Tech Stack

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

Auth:

* Supabase Auth

Realtime:

* Supabase Realtime

Storage:

* Supabase Storage

AI:

* Gemini

Hosting:

* Vercel

Do not replace any technology without explicit instruction.

---

# Architecture Rules

Everything revolves around Rooms.

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

Claims are not standalone.

Evidence can link to multiple claims.

Sources are reusable.

Questions are first-class entities.

---

# Design Rules

Default theme:

Dark Mode.

Design style:

Linear + Discord + Reddit.

Requirements:

* Modern
* Elegant
* Readable
* Mobile-friendly

Avoid:

* Forum appearance
* Academic appearance
* Reddit clone appearance

---

# Development Rules

1. Never invent features.

Only implement documented features.

2. Never skip TypeScript types.

3. Prefer reusable components.

4. Keep business logic outside UI components.

5. Use feature-based architecture.

6. Follow existing naming conventions.

7. Use strict typing.

8. Keep code production-ready.

---

# Folder Structure

Create and maintain:

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

# Security Rules

Follow:

11_SECURITY_AND_ACCESS.md

Requirements:

* Row Level Security
* JWT Authentication
* Input Validation
* Rate Limiting
* Audit Logging

Anonymous users:

Visible as:

Anonymous

Identity hidden from users and moderators.

Only administrators may access identity mappings when necessary.

---

# Current Development Phase

Follow:

09_IMPLEMENTATION_PLAN.md

Current target:

Sprint 1

Project Foundation

Tasks:

* Initialize Next.js
* Configure TypeScript
* Configure Tailwind
* Configure shadcn/ui
* Configure Supabase
* Create folder structure
* Create shared types
* Configure theme system

Do NOT start discussions, debates, claims, or AI features until foundation tasks are complete.

---

# Output Requirements

When completing work:

1. Explain what was implemented.
2. Explain what files were created.
3. Explain what files were modified.
4. Explain any architectural decisions.
5. List remaining tasks.

If requirements are unclear:

Ask before implementing.

Do not invent assumptions.

---

# Definition of Success

Discora should evolve into a platform where users:

* Discuss ideas
* Debate respectfully
* Create claims
* Attach evidence
* Provide sources
* Ask questions
* Build understanding

The system should prioritize understanding over engagement at every layer of implementation.
