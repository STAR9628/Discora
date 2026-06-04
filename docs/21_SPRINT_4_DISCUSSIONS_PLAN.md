# Discora - Sprint 4 Discussions Plan

Version: 1.2

Status: Ready for Review

Scope: Discussions Core Features

Related Documents:

* 01_PRD.md
* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md
* 11_SECURITY_AND_ACCESS.md
* 12_FRONTEND_SPEC.md
* 16_ARCHITECTURE_DECISIONS.md

---

# Purpose

This document defines the implementation checklist for Sprint 4 (Discussions). 

This sprint establishes the core conversational engine of Discora: the ability to create rooms of type `discussion` under specific topics, post public or anonymous messages, reply to existing messages in a nested tree structure, and view these discussions on a unified chronological feed.

All future features (debates, claims, evidence, sources, questions, notifications, search, AI, moderation, reputation, or agreement metrics) remain out of scope.

---

# Sprint 4 Goals

Primary Goal:
Users can create, view, and participate in structured, open-exploration discussions.

Supporting Goals:
* Create database tables for `topics`, `rooms`, `discussions`, and `messages` with appropriate indexes and constraints.
* Enforce Row Level Security (RLS) on discussions and messages, including a 5-minute update lock on editing.
* Implement a profile-redacting query utility or database view for anonymous messages.
* Build `/discussions/create` form with real-time Zod validations, including a minimum 100-character opening statement constraint.
* Build dynamic route `/discussions/[slug]` containing a chronological, unified thread of messages and nested replies.
* Create `/discussions` global feed page listing active discussions under seeded standard platform topics.
* Add realtime listeners for live message updates in discussion rooms.

---

# Ticket Mapping

Sprint 4 maps to:

```text
DISC-001 Discussion Table Schema & Migration
DISC-002 Create Discussion UI Page
DISC-003 Discussion Room Page Layout
DISC-004 Discussion Feed Page & Sidebar Wiring
DISC-005 Thread Message Component (Public / Anonymous)
DISC-006 Nested Comment Reply System
DISC-007 Database RLS & Security for Messages
DISC-008 Realtime Message Subscription Wiring
DISC-009 Topic Selection & Association
```

Deferred:

```text
DEB-001 Debate System (Sprint 7+)
CLM-001 Claims Integration (Sprint 8+)
EVD-001 Evidence & Sources Workflow (Sprint 9+)
QST-001 Structured Questions System (Sprint 10+)
VOT-001 Agree/Disagree Voting (Sprint 11+)
NOT-001 Notifications Center (Sprint 12+)
```

---

# Database Schema Requirements

We will need to initialize four database tables.

### 1. `public.topics`
Stores category tags for rooms (e.g., "AI", "Politics", "Science").
* `id` (uuid, primary key, default gen_random_uuid())
* `name` (text, not null, unique)
* `description` (text)
* `slug` (text, not null, unique)
* `created_by` (uuid, references auth.users(id) on delete set null)
* `is_platform_topic` (boolean, not null, default false)
* `created_at` (timestamptz, not null, default now())
* `updated_at` (timestamptz, not null, default now())

### 2. `public.rooms`
Base entity representing spaces where discussions or debates occur.
* `id` (uuid, primary key, default gen_random_uuid())
* `title` (text, not null)
* `description` (text)
* `slug` (text, not null, unique)
* `room_type` (text, not null, check (room_type in ('discussion', 'debate', 'private')))
* `created_by` (uuid, references auth.users(id) on delete set null)
* `topic_id` (uuid, references public.topics(id) on delete set null)
* `visibility` (text, not null, check (visibility in ('public', 'private')), default 'public')
* `status` (text, not null, check (status in ('open', 'inactive', 'archived')), default 'open')
* `created_at` (timestamptz, not null, default now())
* `updated_at` (timestamptz, not null, default now())

### 3. `public.discussions`
Discussion-specific metadata (linked 1:1 to public.rooms).
* `id` (uuid, primary key, references public.rooms(id) on delete cascade)
* `opening_statement` (text, not null)
* `summary` (text) -- Optional. Used in cards and feeds without loading the full opening statement.
* `created_at` (timestamptz, not null, default now())
* `updated_at` (timestamptz, not null, default now())

### 4. `public.messages`
Core conversation database representing messages and replies.
* `id` (uuid, primary key, default gen_random_uuid())
* `room_id` (uuid, not null, references public.rooms(id) on delete cascade)
* `user_id` (uuid, references auth.users(id) on delete set null)
* `parent_message_id` (uuid, references public.messages(id) on delete cascade)
* `content` (text, not null, check (char_length(content) between 1 and 2000))
* `identity_mode` (text, not null, check (identity_mode in ('public', 'anonymous')), default 'public')
* `message_type` (text, not null, check (message_type in ('message', 'question')), default 'message') -- Future-proof schema type
* `created_at` (timestamptz, not null, default now())
* `updated_at` (timestamptz, not null, default now())

---

# Architecture Decisions

### **ADR-015: Room Slug Routing**
* **Context**: In `04_DATABASE_DESIGN.md`, the `rooms` table only defines `id` (UUID) as the lookup field. However, `12_FRONTEND_SPEC.md` defines discussion routes as `/discussions/{slug}`.
* **Decision**: Add a `slug` column to `public.rooms`. Write database triggers or service logic to automatically slugify titles upon creation, ensuring clean, SEO-friendly URLs.

### **ADR-016: Anonymous Identity Separation**
* **Context**: Anonymous participation is key to Discora, but moderators must not have access to real identities, and client APIs must never expose identity mappings.
* **Decision**: Enforce database view-level redaction. To prevent exposing raw identity mapping columns (`user_id`) to standard clients, revoke `SELECT` privileges on the `user_id` column of the raw `public.messages` table. Expose data exclusively through a `security definer` database view `public.discussion_messages`. If `identity_mode = 'anonymous'`, the view returns `user_id = null`, `username = 'Anonymous'`, and `avatar_url = null` before data ever leaves the database engine.

### **ADR-017: Discussion First, Debate Later**
* **Context**: Discussions in Discora are intended to be exploratory and support multiple, open viewpoints.
* **Decision**: Discussions do not require sides or debate positions. Users participate freely without choosing "pro/con/neutral" positions. Debates are separate entities introduced in future sprints.

### **ADR-018: 5-Minute Database-Level Edit Window Lock**
* **Context**: Users can edit messages for up to 5 minutes. If enforced only in RLS policies, users could bypass it if the check is not strict, or bypass checks by updating the `created_at` timestamp.
* **Decision**: Enforce this restriction at the database layer using a `BEFORE UPDATE` trigger function on `public.messages`. The trigger blocks updates if `now() - created_at > 5 minutes` and validates that immutable columns (`created_at`, `room_id`, `user_id`) cannot be modified. RLS policies will only verify basic ownership (`user_id = auth.uid()`).

---

# Implementation Checklist

## 1. Database Migrations
* Create `supabase/migrations/202606030003_create_discussions.sql` to initialize tables, primary/foreign keys, and indexes.
* Seed the `topics` table with initial standard platform topics:
  - `General`, `Technology`, `Science`, `Politics`, `Philosophy`, `History`, `Economics`, `Culture`, `Education`, `Ethics`.
* Generate a database trigger to auto-slugify titles on `rooms` and `topics` if they are not provided, ensuring URL safety.
* Apply indexes:
  - `rooms (slug)` (unique)
  - `topics (slug)` (unique)
  - `messages (room_id)`
  - `messages (parent_message_id)`

## 2. Row Level Security (RLS) Configuration
* **Topics Table**:
  - `SELECT`: Allow anyone (public).
  - `INSERT/UPDATE/DELETE`: Disallowed for standard users in Sprint 4. Topic creation is restricted to the platform seeding migration.
* **Rooms Table**:
  - `SELECT`: Allow anyone (for public rooms).
  - `INSERT`: Allow authenticated users.
  - `UPDATE/DELETE`: Allow only room creator.
* **Discussions Table**:
  - `SELECT`: Allow anyone.
  - `INSERT`: Allow authenticated owner of the matching room.
  - `UPDATE/DELETE`: Allow only the room creator.
* **Messages Table**:
  - `SELECT`: Allow anyone. (To prevent anonymous identity leaks, SELECT privileges on the raw `user_id` column are revoked for anon and authenticated roles. Clients retrieve data exclusively through the `discussion_messages` view).
  - `INSERT`: Allow authenticated users to post in existing rooms.
  - `UPDATE`: Allow only message author (`user_id = auth.uid()`). The 5-minute cooldown and validation of immutable columns are enforced by a database trigger.
  - `DELETE`: Prohibited for standard users (reserved for future moderation).

## 3. Discussions Feature Module (`src/features/discussions`)
* **Types**: Define `Topic`, `Room`, `Discussion`, and `Message` type mappings matching DB entities.
* **Validation**:
  - `discussionSchema`: 
    - Title: (min 5, max 100)
    - Description: (max 300)
    - Opening Statement: Required (min 100, max 5000)
    - Summary: Optional (max 200)
    - Topic ID: Required
  - `messageSchema`: Content (min 1, max 2000), Identity Mode (`public` or `anonymous`).
* **Service Layer**:
  - `getTopics()`: Fetch available seeded platform topics.
  - `getDiscussions(limit, cursor)`: Fetch discussion rooms for feed with cursor pagination.
  - `getDiscussionBySlug(slug)`: Query room + discussion details.
  - `createDiscussion(data)`: Insert `rooms` and `discussions` records within a transaction.
  - `getMessages(roomId)`: Query message records from the redacted `discussion_messages` view.
  - `postMessage(data)`: Insert a message or nested reply record.
  - `updateMessage(id, content)`: Edit message within the 5-minute cooldown.
* **Server-Side Anonymization (Database View)**:
  - Expose message queries exclusively through the `discussion_messages` view. This view is configured as `security definer` to query underlying tables securely, automatically nullifying `user_id` and returning `'Anonymous'` as username and `null` as avatar for posts with `identity_mode = 'anonymous'`.

## 4. UI Components & Thread Rendering
* **Discussion Card**: Renders discussion details in feeds (Title, Description, Topic Badge, Participant Count, Creation Date). Displays `summary` if available; otherwise falls back to a truncated version of the opening statement.
* **Message / Comment Item**: Displays comment content, public profile (avatar, username) or anonymous avatar ("Anonymous"), timestamp, and action buttons ("Reply", "Edit").
* **Nested Reply Tree**: A recursive component or flat-tree parser that maps parent-child message associations into clean, indented nested conversation threads.
* **Create Discussion Form**: Includes form fields for title, description, topic selector, opening statement, and optional summary.

## 5. Page Routes & Navigation
* **Discussions Feed (`/discussions`)**: Lists active discussions sorted by latest activity.
* **Discussion Creation (`/discussions/create`)**: Renders the discussion form. Protected route (redirects to `/login` if guest).
* **Discussion Room (`/discussions/[slug]`)**: The core discussion screen rendering header details and the recursive comment threads feed.
* **Sidebar Profile Links**: Wire the sidebar "Discussions" item to navigate to `/discussions`.

## 6. Realtime Wireframe
* **Logical Replication Exclusion**: Raw logical replication on the `messages` table is disabled to prevent leaking identity columns in realtime streams.
* **Sanitized Notification + Dynamic Fetch Pattern**: Clients listen for change events from a public `message_events` metadata table, and then issue a secure SELECT query to the redacted `discussion_messages` view to pull the updated, sanitized message payload.

---

# Security & Access Control

Follow security guidelines in `docs/11_SECURITY_AND_ACCESS.md` and approved updates:
* **ADR-016: Anonymous Identity Separation**:
  - Anonymous participants are displayed as "Anonymous" in all feeds, headers, and UI threads.
  - Moderators cannot resolve anonymous identities.
  - Only platform administrators may access identity mappings during severe abuse or threat investigations.
  - The raw `user_id` column has `SELECT` privileges revoked for public roles. The redacted `discussion_messages` view sets `user_id = null` for anonymous posts, preventing any data leaks to clients.
* **Account Deletion Policy**: 
  - User content (discussions, comments) must be preserved to keep conversation history intact.
  - When a user deletes their account, the foreign key relation changes (`user_id = null`) and the user's name is dynamically rendered as `"Deleted User"`.
* **Edit Time Limit & Immutability**: Enforce the 5-minute editing lock and column immutability using a Postgres `BEFORE UPDATE` trigger function on the `messages` table instead of RLS policies. RLS handles basic ownership verification (`user_id = auth.uid()`).

---

# Completion Criteria

Sprint 4 is complete when:
1. Database tables for `topics`, `rooms`, `discussions`, and `messages` are initialized, and seeded with the 10 initial standard platform topics.
2. Users can create public discussions under categorized platform topics, enforcing the 100-character minimum opening statement restriction.
3. Users cannot create new topics in Sprint 4.
4. Discussion rooms display dynamic headers and a nested reply comment system.
5. Users can toggle anonymous mode on creation or comments, with client-side profile details completely redacted at database query level as per ADR-016.
6. Message edits are permitted only for authors, validated as immutable, and blocked after 5 minutes by a database trigger.
7. Realtime listener notifies clients of message events, prompting a secure refetch of sanitized updates.
8. Account deletions safely nullify `user_id` associations while preserving the message tree structure.
9. `npm run lint` and `npm run build` pass with zero errors.
10. No debates, claims, evidence, search, or moderation tools are implemented.
