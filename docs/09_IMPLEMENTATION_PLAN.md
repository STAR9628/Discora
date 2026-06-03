# 09_IMPLEMENTATION_PLAN.md

# Discora - Implementation Plan

Version: 1.0

Status: Draft

Related Documents:

* 00_MASTER_CONTEXT.md
* 01_PRD.md
* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md
* 06_DESIGN_SYSTEM.md
* 07_API_DESIGN.md
* 08_DEVELOPMENT_ROADMAP.md

Purpose:

This document converts Discora's roadmap into a concrete implementation sequence.

The objective is to produce a launchable MVP as quickly as possible while maintaining architecture quality.

---

# Development Strategy

Principle:

Build vertical slices.

Avoid building isolated backend systems without usable UI.

Every phase should produce visible progress.

---

# MVP Build Order

Phase 1

Project Foundation

↓

Phase 2

Authentication

↓

Phase 3

Database

↓

Phase 4

Design System

↓

Phase 5

Discussions

↓

Phase 6

Realtime

↓

Phase 7

Debates

↓

Phase 8

Claims

↓

Phase 9

Evidence & Sources

↓

Phase 10

Questions

↓

Phase 11

Voting & Pins

↓

Phase 12

Notifications

↓

Phase 13

Search

↓

Phase 14

AI

↓

Phase 15

Moderation

↓

Launch

---

# Sprint 1 - Foundation

Goal:

Create the project foundation.

Estimated:

2-3 Days

---

Tasks

## Create Repository

```bash
discora-web
```

---

## Initialize Project

```bash
npx create-next-app@latest
```

Options:

* TypeScript
* App Router
* Tailwind
* ESLint

---

## Install Core Packages

```bash
npm install

@supabase/supabase-js

zustand

@tanstack/react-query

zod

react-hook-form

lucide-react
```

---

## Configure Project Structure

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

---

Deliverable

Running application.

---

# Sprint 2 - Supabase Setup

Goal:

Backend infrastructure.

Estimated:

1-2 Days

---

Tasks

## Create Supabase Project

Configure:

* Database
* Authentication
* Storage
* Realtime

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

GEMINI_API_KEY=
```

---

## Create Supabase Client

Shared client utilities.

---

Deliverable

Connected application.

---

# Sprint 3 - Authentication

Goal:

User accounts.

Estimated:

3-5 Days

---

Features

## Register

## Login

## Logout

## Email Verification

## Google Sign-In

## Protected Routes

## Profile Creation

---

Pages

```text
/login

/register

/profile
```

---

Deliverable

Fully functional authentication.

---

# Sprint 4 - Database Implementation

Goal:

Create database schema.

Estimated:

3-5 Days

---

Implement Tables

* users
* topics
* rooms
* discussions
* debates
* messages
* claims
* evidence
* sources
* questions
* notifications
* reports
* votes

---

Implement

* Indexes
* Foreign Keys
* RLS Policies

---

Deliverable

Production-ready schema.

---

# Sprint 5 - Design System

Goal:

Build reusable UI.

Estimated:

4-6 Days

---

Components

## Layout

* Sidebar
* Header
* Mobile Navigation

---

## Cards

* Discussion Card
* Debate Card
* Claim Card
* Evidence Card
* Question Card
* Source Card

---

## Shared Components

* Buttons
* Inputs
* Dialogs
* Tabs

---

Deliverable

Design system library.

---

# Sprint 6 - Homepage

Goal:

Public landing experience.

Estimated:

2-3 Days

---

Sections

## Search

## Trending Discussions

## Trending Debates

## Recent Discussions

## Recent Debates

---

Deliverable

Working homepage.

---

# Sprint 7 - Discussion System

Goal:

Core platform feature.

Estimated:

1 Week

---

Features

## Create Discussion

## Discussion Page

## Discussion Feed

## Reply System

## Thread System

## Anonymous Posting

---

Deliverable

Complete discussion platform.

---

# Sprint 8 - Realtime System

Goal:

Live interaction.

Estimated:

2-4 Days

---

Realtime Events

* New Messages
* Replies
* Updates

---

Deliverable

Live discussion feed.

---

# Sprint 9 - Debate System

Goal:

Structured disagreement.

Estimated:

1 Week

---

Features

## Create Debate

## Join Debate

## Pro Side

## Con Side

## Neutral Side

## Debate Requests

## Debate Invitations

---

Deliverable

Debate rooms operational.

---

# Sprint 10 - Claims System

Goal:

Structured arguments.

Estimated:

4-6 Days

---

Features

## Create Claim

## Convert Message To Claim

## Claim Details

## Claim History

## Claim Voting

---

Deliverable

Claims integrated into rooms.

---

# Sprint 11 - Evidence System

Goal:

Evidence-based discussion.

Estimated:

4-6 Days

---

Features

## Create Evidence

## Attach Evidence

## Link Multiple Claims

## Evidence Voting

## Verification Requests

---

Deliverable

Evidence workflow complete.

---

# Sprint 12 - Sources System

Goal:

Reference management.

Estimated:

4-6 Days

---

Features

## Upload PDF

## Upload Image

## Add Link

## Add Video Link

## Source Retraction

---

Deliverable

Source management complete.

---

# Sprint 13 - Questions System

Goal:

Structured inquiry.

Estimated:

3-4 Days

---

Features

## Create Questions

## Question Categories

## Question Replies

---

Deliverable

Question system complete.

---

# Sprint 14 - Voting & Pins

Goal:

Community signals.

Estimated:

4-5 Days

---

Features

## Agree

## Disagree

## Personal Pins

## Public Pins

## Pin Suggestions

---

Deliverable

Voting and pins complete.

---

# Sprint 15 - Notification System

Goal:

User awareness.

Estimated:

3-4 Days

---

Features

## Notification Center

## Reply Notifications

## Mention Notifications

## Debate Notifications

## Pin Notifications

---

Deliverable

Notification system complete.

---

# Sprint 16 - Search

Goal:

Discovery.

Estimated:

3-5 Days

---

Features

Global Search:

* Users
* Discussions
* Debates
* Claims
* Sources
* Questions

---

Deliverable

Platform-wide search.

---

# Sprint 17 - AI Features

Goal:

AI-assisted organization.

Estimated:

4-6 Days

---

Gemini Features

## Similar Discussion Detection

## Source Summary

## Basic Moderation

---

Deliverable

AI integration complete.

---

# Sprint 18 - Moderation

Goal:

Platform protection.

Estimated:

3-5 Days

---

Features

## Reporting

## AI Review

## Human Review Queue

## Content Flags

---

Deliverable

Moderation system complete.

---

# Sprint 19 - Launch Hardening

Goal:

Production readiness.

Estimated:

1 Week

---

Tasks

## Mobile Testing

## Accessibility Testing

## Security Review

## Performance Review

## Bug Fixes

## Load Testing

---

Deliverable

Launch-ready MVP.

---

# First Public Release

Discora MVP Includes:

✅ Authentication

✅ Discussions

✅ Debates

✅ Claims

✅ Evidence

✅ Sources

✅ Questions

✅ Voting

✅ Pins

✅ Notifications

✅ Search

✅ Realtime

✅ AI Summaries

✅ Moderation

---

# Success Criteria

Discora MVP is complete when a user can:

1. Create an account.
2. Join a discussion.
3. Create a claim.
4. Attach evidence.
5. Add sources.
6. Participate in debates.
7. Receive notifications.
8. Discover discussions.
9. Learn from structured discourse.

without requiring any future knowledge systems.

---

# Post-MVP Priority

Immediate Next Features

1. Consensus System
2. Open Questions
3. Living Knowledge Views
4. Topic Hubs
5. Knowledge Evolution
6. Source Intelligence

These features should only begin after real user feedback is collected from MVP usage.
