# Discora Agent Instructions

## Read First

Before making any code changes, read:

```text
docs/10_CODEX_CONTEXT.md
docs/16_ARCHITECTURE_DECISIONS.md
docs/19_SPRINT_3_USER_IDENTITY_PLAN.md
docs/20_AVATAR_STORAGE_DESIGN.md
```

Follow these documents as the source of truth.

---

## Project Mission

Discora is a structured discussion, debate, and knowledge-building platform.

Primary principles:

* Understanding over engagement
* Evidence over popularity
* Structure over chaos
* Discussion over algorithms

---

## Development Rules

* Do not invent features.
* Follow sprint boundaries.
* Do not implement future features early.
* Ask before deviating from architecture.
* Prefer maintainability over speed.
* Keep business logic out of UI components.
* Use TypeScript strict mode.
* Use feature-based architecture.

---

## Current Project Status

Completed:

```text
Sprint 1 - Foundation
Sprint 2 - Authentication Foundation
```

Current Sprint:

```text
Sprint 3 - User Identity Foundation
```

---

## Sprint 3 Scope

Allowed:

* Profile page
* Profile editing
* Avatar upload
* Username management
* Identity preference storage
* Profile settings page

---

## Explicitly Out Of Scope

Do NOT implement:

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
* Agreement metrics
* Topic metrics
* Anonymous posting

---

## Architecture Rules

Profiles:

* Publicly viewable
* User-owned
* Username unique
* Username changes limited to once every 30 days

Avatar Storage:

```text
avatars/{user_id}/avatar.{extension}
```

Identity Modes:

```text
public
anonymous
```

Identity preference storage only.

No anonymous posting implementation yet.

---

## Required Process

Before implementation:

1. Review documentation.
2. Produce implementation checklist.
3. Identify files to create/modify.
4. Identify architecture concerns.

After implementation:

1. List files created.
2. List files modified.
3. Run lint.
4. Run build.
5. Report results.

Do not mark work complete unless lint and build pass.

```
```
