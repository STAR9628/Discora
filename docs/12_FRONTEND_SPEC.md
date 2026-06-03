# 12_FRONTEND_SPEC.md

# Discora - Frontend Specification

Version: 1.0

Status: Draft

Priority: Critical

Related Documents:

* 01_PRD.md
* 03_USER_FLOWS.md
* 05_SYSTEM_ARCHITECTURE.md
* 06_DESIGN_SYSTEM.md
* 07_API_DESIGN.md

Purpose:

This document defines all user-facing pages, layouts, navigation systems, interactions, loading states, empty states, and frontend behaviors for Discora MVP.

This document serves as the primary UI implementation reference.

---

# 1. Frontend Philosophy

Discora should feel:

* Modern
* Elegant
* Community-focused
* Knowledge-oriented

The UI should make structured discourse feel natural.

Users should not feel like they are filling forms or managing data structures.

The interface should feel conversational first and structured second.

---

# 2. Application Layout

## Desktop Layout

```text
-------------------------------------------------

Sidebar

Main Content

Right Sidebar

-------------------------------------------------
```

---

## Mobile Layout

```text
Header

Content

Bottom Navigation
```

---

# 3. Global Navigation

Desktop Sidebar

Contains:

```text
Home

Discussions

Debates

Notifications

Profile
```

Future:

```text
Knowledge

Open Questions
```

---

# 4. Mobile Navigation

Bottom Navigation

Contains:

```text
Home

Search

Create

Notifications

Profile
```

Persistent on all major pages.

---

# 5. Global Create Menu

Floating Create Button

Displayed:

Desktop and Mobile

---

Actions

```text
Create Discussion

Create Debate

Create Claim

Create Question
```

---

Claims and Questions require room context.

When outside a room:

Relevant options hidden.

---

# 6. Homepage

Route:

```text
/
```

---

Guest View

Sections:

```text
Search

Trending Discussions

Trending Debates

Recent Discussions

Recent Debates
```

---

Authenticated View

Sections:

```text
Recommended For You

Trending Discussions

Trending Debates

Recent Discussions

Recent Debates
```

Recommendations based on:

* Interests
* Activity
* Followed Topics

---

# 7. Homepage Cards

Discussion Card

Displays:

```text
Title

Description

Topic

Participant Count

Recent Activity
```

---

Debate Card

Displays:

```text
Motion

Pro Count

Con Count

Neutral Count

Recent Activity
```

---

# 8. Search Page

Route:

```text
/search
```

---

Search Results Grouped By:

```text
Discussions

Debates

Claims

Questions

Sources

Users
```

---

Supports:

* Infinite Scroll
* Filters
* Sorting

---

# 9. Discussion Creation Page

Route:

```text
/discussions/create
```

---

Fields

Required:

```text
Title

Description

Opening Statement
```

---

Optional:

```text
Topic

Tags

Sources
```

---

System Action

Before submission:

```text
Check Similar Discussions
```

Display suggestions.

User may:

```text
Join Existing

Create Anyway
```

---

# 10. Debate Creation Page

Route:

```text
/debates/create
```

---

Required

```text
Motion

Position
```

---

Position Options

```text
Pro

Con

Neutral
```

---

Optional

```text
Description

Sources
```

---

# 11. Discussion Room

Route

```text
/discussions/{slug}
```

---

Structure

```text
Room Header

Tabs

Feed

Right Sidebar
```

---

# 12. Debate Room

Route

```text
/debates/{slug}
```

---

Structure

```text
Debate Header

Tabs

Feed

Right Sidebar
```

---

Debate Motion always visible.

---

# 13. Room Header

Displays:

```text
Title

Description

Topic

Participants

Created By

Room Status
```

---

Status

Discussion:

```text
Open

Inactive

Archived
```

---

Debate:

```text
Open

Inactive

Converted To Discussion

Archived
```

---

# 14. Room Tabs

Horizontal Tabs

```text
Discussion

Claims

Evidence

Sources

Questions

Pins
```

---

Tabs show counts.

Example:

```text
Claims (42)

Evidence (67)
```

---

# 15. Discussion Feed

Unified Timeline

Contains:

```text
Messages

Claims

Evidence

Questions
```

Mixed chronologically.

---

Users should always understand discussion context.

---

# 16. Message Component

Displays:

```text
Avatar

Username

Timestamp

Content
```

---

Actions

```text
Reply

Agree

Disagree

Make Claim

Report
```

---

Edited messages show:

```text
Edited
```

indicator.

---

# 17. Claim Component

Visual Style

Blue Badge

Blue Border

---

Displays

```text
Claim Text

Claim Type

Agree Count

Disagree Count

Evidence Count

Replies
```

---

Actions

```text
Reply

Agree

Disagree

Add Evidence

View Claim
```

---

# 18. Evidence Component

Visual Style

Green Badge

Green Border

---

Displays

```text
Evidence Category

Relationship Type

Content

Agree Count

Disagree Count

Verification Requests
```

---

Actions

```text
Agree

Disagree

Needs Verification

View Linked Claims
```

---

# 19. Question Component

Visual Style

Yellow Badge

Yellow Border

---

Displays

```text
Question Text

Question Type

Replies

Agree Count

Disagree Count
```

---

Actions

```text
Reply

Agree

Disagree
```

---

# 20. Source Component

Visual Style

Purple Badge

Purple Border

---

Displays

```text
Source Type

Title

Description

Date
```

---

Preview Rules

Image:

Thumbnail Preview

---

PDF:

Document Preview Card

---

URL:

Metadata Preview

---

Video Link:

Preview Card

---

Actions

```text
Open

View Summary

Report
```

---

# 21. Right Sidebar

Desktop Only

Displays

```text
Room Statistics

Active Participants

Top Claims

Recent Evidence

Pinned Items
```

---

Collapsed on smaller screens.

---

# 22. Claim Detail Page

Route

```text
/claims/{id}
```

---

Displays

```text
Claim

Evidence

Sources

Replies

Revision History
```

---

# 23. Profile Page

Route

```text
/@username
```

---

Displays

```text
Profile Picture

Username

Bio

Join Date
```

---

Statistics

```text
Discussions Created

Debates Created

Claims Created

Evidence Added
```

---

Topic Statistics

```text
Most Active Topics
```

---

Agreement Metrics

```text
Claim Agreement Rate

Evidence Agreement Rate
```

---

# 24. Notifications Page

Route

```text
/notifications
```

---

Categories

```text
Replies

Mentions

Debate Requests

Debate Invitations

Pins

Moderation
```

---

Unread notifications highlighted.

---

# 25. Anonymous Participation UX

Anonymous posts display:

```text
Anonymous
```

instead of username.

---

No visual distinction beyond identity masking.

---

# 26. Loading States

All pages require:

```text
Skeleton Loaders
```

not spinners.

---

Examples

```text
Discussion Cards

Debate Cards

Feed Messages
```

---

# 27. Empty States

Every major page requires an empty state.

Examples:

```text
No Claims Yet

No Evidence Yet

No Questions Yet
```

---

Provide clear action buttons.

---

# 28. Error States

Every API action should support:

```text
Validation Errors

Network Errors

Server Errors
```

---

Errors should be human-readable.

---

# 29. Responsive Behavior

Desktop

```text
Sidebar

Main Content

Right Sidebar
```

---

Tablet

```text
Sidebar

Main Content
```

---

Mobile

```text
Bottom Navigation

Single Column Layout
```

---

# 30. Accessibility Requirements

Required:

* Keyboard Navigation
* Focus States
* Screen Reader Support
* Proper Contrast Ratios

---

# 31. Future Reserved Views

Not MVP

```text
Consensus View

Current Understanding View

Open Questions View

Knowledge Hubs

Argument Maps
```

---

These views should integrate into existing layouts rather than replacing them.

---

# Final Frontend Goal

Discora should feel immediately familiar to users of modern social platforms while providing a significantly more structured and meaningful discussion experience.

The interface should encourage thoughtful participation, evidence-based discourse, and long-term knowledge building without sacrificing usability.
