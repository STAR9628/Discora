# 08_DEVELOPMENT_ROADMAP.md

# Discora - Development Roadmap

Version: 1.0

Status: Draft

Related Documents:

* 00_MASTER_CONTEXT.md
* 01_PRD.md
* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md
* 06_DESIGN_SYSTEM.md
* 07_API_DESIGN.md

Purpose:

This document defines the implementation sequence for Discora MVP.

The roadmap prioritizes:

* Fast MVP delivery
* Technical stability
* User validation
* Future scalability

---

# Development Philosophy

Rule 1:

Build foundations first.

---

Rule 2:

Never build future features before validating core discussion behavior.

---

Rule 3:

Every phase should result in a usable application.

---

Rule 4:

Launch early.

Improve continuously.

---

# Phase 0 - Project Setup

Goal:

Create the development foundation.

Status:

Required

---

Tasks

## Repository Setup

Create:

```text
discora-web
```

Repository

---

## Development Environment

Setup:

* Next.js 15
* TypeScript
* Tailwind CSS
* shadcn/ui

---

## Code Standards

Setup:

* ESLint
* Prettier
* Husky

---

## Folder Structure

Create:

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

## Environment Variables

Configure:

```text
SUPABASE_URL

SUPABASE_ANON_KEY

GEMINI_API_KEY
```

---

Deliverable

Running application.

---

# Phase 1 - Authentication

Goal:

Users can create accounts and login.

---

Features

## Email Registration

## Login

## Logout

## Email Verification

## Google Sign In

## Protected Routes

## User Profiles

---

Deliverable

Authenticated users.

---

# Phase 2 - Database Foundation

Goal:

Create core data structure.

---

Implement Tables

* Users
* Topics
* Rooms
* Discussions
* Debates
* Messages
* Claims
* Questions
* Evidence
* Sources
* Votes
* Notifications
* Reports

---

Setup

* Relationships
* Indexes
* Row Level Security

---

Deliverable

Production-ready database.

---

# Phase 3 - UI Foundation

Goal:

Build reusable design system.

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

## Forms

* Discussion Form
* Debate Form
* Claim Form
* Evidence Form

---

Deliverable

Consistent UI system.

---

# Phase 4 - Discussions

Goal:

Core discussion experience.

---

Features

## Create Discussion

## Browse Discussions

## Discussion Page

## Discussion Feed

## Message Creation

## Replies

## Threads

---

Deliverable

Working discussion platform.

---

# Phase 5 - Debates

Goal:

Introduce structured disagreement.

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

Working debate system.

---

# Phase 6 - Claims

Goal:

Introduce structured knowledge objects.

---

Features

## Create Claim

## Convert Message To Claim

## Claim View

## Claim History

## Claim Voting

---

Deliverable

Claims fully integrated.

---

# Phase 7 - Evidence & Sources

Goal:

Connect reasoning to claims.

---

Features

## Create Evidence

## Attach Evidence

## Create Sources

## Attach Sources

## Source Retraction

## Source Viewer

---

Deliverable

Evidence-based discussions.

---

# Phase 8 - Questions

Goal:

Encourage inquiry and exploration.

---

Features

## Create Questions

## Question Types

## Question Threads

## Question Voting

---

Deliverable

Structured questioning system.

---

# Phase 9 - Voting & Pins

Goal:

Enable community signal collection.

---

Features

## Agree

## Disagree

## Personal Pins

## Public Pin Suggestions

## Pin Voting

---

Deliverable

Community interaction system.

---

# Phase 10 - Notifications

Goal:

Keep users engaged.

---

Features

## In-App Notifications

## Mentions

## Reply Notifications

## Debate Notifications

## Pin Notifications

---

Deliverable

Complete notification center.

---

# Phase 11 - Search

Goal:

Improve discoverability.

---

Features

## Global Search

Search:

* Discussions
* Debates
* Claims
* Questions
* Sources
* Users

---

Deliverable

Platform-wide search.

---

# Phase 12 - Realtime

Goal:

Make discussions feel alive.

---

Features

## Live Messages

## Live Replies

## Live Claims

## Live Notifications

---

Deliverable

Realtime platform.

---

# Phase 13 - AI Layer

Goal:

Introduce intelligent assistance.

---

Provider

Gemini

---

Features

## Similar Discussion Detection

## Source Summaries

## Basic Moderation

---

Deliverable

AI-assisted platform.

---

# Phase 14 - Moderation

Goal:

Protect platform quality.

---

Features

## Reports

## AI Review

## Human Review Queue

## Content Flags

---

Deliverable

Moderation system.

---

# Phase 15 - Launch Preparation

Goal:

Production deployment.

---

Tasks

## Performance Review

## Security Review

## Mobile Testing

## Accessibility Testing

## Bug Fixes

## Analytics Setup

---

Deliverable

Launch-ready MVP.

---

# MVP Launch Checklist

Required

✅ Authentication

✅ Discussions

✅ Debates

✅ Claims

✅ Evidence

✅ Sources

✅ Questions

✅ Voting

✅ Pins

✅ Search

✅ Notifications

✅ Realtime

✅ AI Summaries

✅ Moderation

---

# Post-MVP Roadmap

Phase 2

* Consensus System
* Open Questions
* Better AI

---

Phase 3

* Argument Maps
* Knowledge Graphs
* Topic Hubs

---

Phase 4

* Knowledge Evolution
* Living Knowledge Views
* Source Intelligence

---

# Success Condition

Discora MVP is successful when users can:

* Create discussions
* Participate in debates
* Create claims
* Provide evidence
* Add sources
* Ask questions
* Discover discussions
* Learn from structured discourse

without requiring advanced future systems.

The goal of MVP is validation, not perfection.
