# Discora - Sprint 3 User Identity Plan

Version: 1.0

Status: Ready For Review

Scope: User Identity Foundation

Related Documents:

* 11_SECURITY_AND_ACCESS.md
* 12_FRONTEND_SPEC.md
* 13_FEATURE_TICKETS.md
* 16_ARCHITECTURE_DECISIONS.md

---

# Purpose

This sprint establishes Discora's user identity system.

Users should be able to manage their public profile and prepare for future participation in discussions and debates.

This sprint focuses only on identity and profile management.

No discussion, debate, claim, evidence, source, question, search, AI, moderation, or voting features should be implemented.

---

# Sprint 3 Goals

Primary Goal:

Users can create and manage a Discora profile.

Supporting Goals:

* Profile viewing
* Profile editing
* Avatar upload
* Username management
* Identity preferences foundation
* Public profile routes

---

# Ticket Mapping

Sprint 3 maps to:

```text
USER-001 Profile Page

USER-002 Profile Editing

USER-003 Avatar Upload

USER-004 Username Change

USER-005 User Statistics (Placeholder)
```

Deferred:

```text
USER-006 Topic Activity Metrics

USER-007 Agreement Metrics
```

Reason:

No discussions, debates, claims, or evidence exist yet.

---

# Implementation Checklist

## 1. User Profile Data Model

Checklist:

* Create profile type definitions.
* Extend Supabase user metadata if needed.
* Keep profile schema minimal.

Fields:

```text
id
username
bio
avatar_url
joined_at
```

Non-Goals:

* Reputation
* Agreement scores
* Statistics
* Topic metrics

---

## 2. Public Profile Page

Route:

```text
/@username
```

Displays:

```text
Avatar

Username

Bio

Joined Date
```

Placeholder Sections:

```text
Discussions Created

Debates Created

Claims Created

Evidence Added
```

Display:

```text
Coming Soon
```

until those features exist.

Expected File:

```text
src/app/[username]/page.tsx
```

---

## 3. Profile Settings Page

Route:

```text
/settings/profile
```

Features:

* Edit bio
* Upload avatar
* Save profile

Expected Files:

```text
src/features/profile/components/profile-form.tsx

src/features/profile/services/profile-service.ts
```

---

## 4. Username Management

Rules:

* Username required
* Unique username
* Username changes limited

Initial Rule:

```text
1 username change every 30 days
```

Store:

```text
last_username_change
```

Non-Goal:

No username history UI.

---

## 5. Avatar Upload

Storage:

Supabase Storage

Allowed:

```text
jpg
jpeg
png
webp
```

Maximum Size:

```text
5 MB
```

Requirements:

* Validate type
* Validate size
* Replace existing avatar

Non-Goals:

* Cropping
* Editing
* Multiple avatars

---

## 6. Identity Preferences Foundation

Add profile preference:

```text
default_identity_mode
```

Options:

```text
public
anonymous
```

Purpose:

Future discussion participation.

No anonymous posting implementation in Sprint 3.

Only preference storage.

---

## 7. Session Integration

Requirements:

* Profile linked to authenticated user
* Redirect guests from profile settings
* Allow public profile viewing

Protected Routes:

```text
/settings/profile
```

Public Routes:

```text
/username
```

---

## 8. Validation

Checklist:

* Username validation
* Bio validation
* Avatar validation
* Auth integration validation
* Protected route validation

Commands:

```bash
npm run lint

npm run build
```

---

# Explicit Non-Goals

Do not implement:

* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions
* Notifications
* Search
* AI
* Moderation
* Reputation
* Agreement Metrics
* Topic Metrics
* Anonymous Posting
* Voting
* Pins

---

# Security Requirements

Follow:

11_SECURITY_AND_ACCESS.md

Requirements:

* Profile editing requires authentication
* Avatar uploads validated
* Username uniqueness enforced
* User may only edit own profile

No moderator/admin profile tools.

---

# Completion Criteria

Sprint 3 is complete when:

1. Users can view profiles.
2. Users can edit profiles.
3. Users can upload avatars.
4. Username management exists.
5. Identity preference foundation exists.
6. Protected profile settings route works.
7. npm run lint passes.
8. npm run build passes.
9. No discussion or debate features are implemented.

```
```
