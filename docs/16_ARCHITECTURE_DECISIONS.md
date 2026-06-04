# Discora - Architecture Decisions

Version: 1.0

Status: Active

Purpose:

This document records major implementation decisions made during Discora development.

---

# ADR-001: Existing Repository Root

Date: 2026-06-03

Decision:

Use the existing `D:\Projects\Discora` repository root for the Next.js application instead of creating a nested `discora-web` folder.

Reasoning:

The repository already contains the project documentation, `src`, `public`, and `supabase` directories. Keeping the app at the root avoids unnecessary nesting and keeps documentation, source, and deployment configuration together.

Scope:

Sprint 1 foundation.

---

# ADR-002: Supabase Client In Sprint 1

Date: 2026-06-03

Decision:

Add Supabase environment documentation and a browser-safe Supabase client utility during Sprint 1.

Reasoning:

`docs/09_IMPLEMENTATION_PLAN.md` places Supabase setup in Sprint 2, but the approved Sprint 1 checklist explicitly includes Supabase client configuration and environment variable setup. The implementation is limited to client wiring only.

Non-Goals:

No database schema, Row Level Security policies, authentication flows, storage buckets, realtime channels, or feature-specific Supabase behavior are implemented in Sprint 1.

---

# ADR-003: Plural Feature Module Folders

Date: 2026-06-03

Decision:

Use plural feature module folder names:

```text
discussions/
debates/
claims/
sources/
questions/
notifications/
```

Keep:

```text
evidence/
```

Reasoning:

`docs/05_SYSTEM_ARCHITECTURE.md` is the primary architecture reference and uses plural feature module names. This also aligns with route and resource naming. `evidence` remains unchanged because it is both singular and plural in English.

---

# ADR-004: Public And Server-Only Environment Variables

Date: 2026-06-03

Decision:

Use the following environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```

Reasoning:

The Supabase URL and anon key are used by browser-side Supabase clients and therefore require the `NEXT_PUBLIC_` prefix in Next.js. `GEMINI_API_KEY` remains server-only and must not be exposed to client bundles.

---

# ADR-005: Basic Layout Shell Only

Date: 2026-06-03

Decision:

Implement a structural desktop sidebar, top header, and mobile bottom navigation in Sprint 1.

Reasoning:

The approved Sprint 1 checklist includes a basic layout shell. The implementation establishes responsive layout foundations from `docs/12_FRONTEND_SPEC.md` without implementing product features.

Non-Goals:

No discussions, debates, claims, evidence, sources, questions, notifications, search behavior, create menu behavior, room pages, feeds, or feature cards are implemented.

---

# ADR-006: Centralized Provider Composition

Date: 2026-06-03

Decision:

Use a single `AppProviders` component to compose theme and query providers.

Reasoning:

Centralizing providers keeps `src/app/layout.tsx` small and creates a maintainable place to add future auth, realtime, and state providers without mixing business logic into route layouts.

---

# ADR-007: Shared Domain Types Before Feature Modules

Date: 2026-06-03

Decision:

Create shared domain and API response types in `src/types/` during Sprint 1.

Reasoning:

The platform revolves around structured entities. Shared types create a stable vocabulary for later feature work and reduce drift from the product, database, and API documents.

---

# ADR-008: Dark Mode Default Experience

Date: 2026-06-03

Decision:

Configure Discora's theme system to default to dark mode.

Reasoning:

`docs/06_DESIGN_SYSTEM.md`, `docs/10_CODEX_CONTEXT.md`, and `docs/14_CODEX_KICKOFF_PROMPT.md` define dark mode as the primary experience. Sprint 1 implements this through CSS theme tokens and `next-themes` with `defaultTheme="dark"` and `enableSystem={false}`.

Scope:

Sprint 1 establishes the default dark experience and preserves a path for future light mode support.

Non-Goals:

No full theme switcher, user theme preference persistence UI, or feature-specific theme behavior is implemented in Sprint 1.

---

# ADR-009: Authentication As A Dedicated Feature Boundary

Date: 2026-06-03

Decision:

Implement authentication as a dedicated feature module backed by Supabase Auth, with SDK access isolated in the Supabase service layer and auth-specific UI, validation, services, providers, and hooks grouped under `src/features/auth/`.

Reasoning:

Authentication is foundational but separate from Discora's structured discourse product domains. Keeping auth in its own feature boundary prevents account access logic from leaking into discussions, debates, claims, evidence, sources, questions, notifications, search, AI, or moderation.

Scope:

Sprint 2 planning and future Sprint 2 auth implementation.

Implementation Direction:

* Use Supabase Auth for email/password, email verification, session handling, logout, and password reset.
* Use `react-hook-form` and `zod` for auth form validation.
* Keep Supabase SDK setup inside `src/services/supabase/`.
* Keep auth business logic outside route components.
* Add protected-route mechanics only for authentication checks.

Non-Goals:

No product authorization, database schema, Row Level Security policies, Google Sign In, user profile pages, anonymous posting, moderation access, or structured discourse features are included by this decision.

---

# ADR-010: Profiles As Application-Owned Identity Records

Date: 2026-06-03

Decision:

Store Discora public identity in `public.profiles`, linked one-to-one with `auth.users`.

Reasoning:

Supabase Auth owns authentication state, credentials, and sessions. Discora needs a separate application-owned identity record for username, bio, avatar URL, joined date, and future identity preferences. Keeping profile data in `public.profiles` avoids coupling public identity to auth metadata and allows Row Level Security policies to protect profile editing.

Scope:

Sprint 3 user identity foundation.

Non-Goals:

No discussions, debates, claims, evidence, sources, questions, notifications, search, AI, moderation, reputation, agreement metrics, or topic metrics are included by this decision.

---

# ADR-011: Username-Based Public Profile Routing

Date: 2026-06-03

Decision:

Use public profile routes in the form:

```text
/u/{username}
```

Implementation route:

```text
src/app/u/[username]/page.tsx
```

Reasoning:

Keeping profile routes under the `/u/` namespace avoids polluting the root URL namespace and prevents any collisions with top-level product routes like `/discussions`, `/debates`, and `/claims` while maintaining clean and consistent paths.

Scope:

Sprint 3 public profile route planning and implementation.

Non-Goals:

No search, mentions, notifications, or username history UI are included by this decision.

---

# ADR-012: Username Canonicalization And Change Limits

Date: 2026-06-03

Decision:

Store usernames as lowercase canonical values and enforce one username change every 30 days.

Reasoning:

Canonical lowercase usernames prevent confusing duplicates and simplify public routing. The 30-day change limit matches the architecture documents and should be enforced at the database layer, not only in UI, so users cannot bypass it through direct API calls.

Scope:

Sprint 3 profile table constraints and trigger logic.

Non-Goals:

No username history UI, trust score, authority ranking, or profile reputation system is included by this decision.

---

# ADR-013: Avatar Storage In Supabase Storage

Date: 2026-06-03

Decision:

Store profile avatars in a Supabase Storage bucket named `avatars`, with object paths scoped by authenticated user id:

```text
{user_id}/avatar.{extension}
```

Reasoning:

User-scoped object paths allow simple ownership policies and make replacement behavior predictable. Supabase Storage remains aligned with the required backend stack and avoids adding a separate asset service during MVP development.

Scope:

Sprint 3 avatar upload foundation.

Non-Goals:

No cropping, image editing, multiple avatars, source uploads, PDF uploads, or product media workflows are included by this decision.

---

# ADR-014: Identity Preference Foundation Without Anonymous Posting

Date: 2026-06-03

Decision:

Store a `default_identity_mode` profile preference with supported values:

```text
public
anonymous
```

Reasoning:

Anonymous participation is core to Discora, but anonymous posting belongs to later room and content workflows. Storing the preference now prepares the identity model without implementing anonymous participation behavior.

Scope:

Sprint 3 profile data model.

Non-Goals:

No anonymous posting, anonymous identity mapping UI, discussion participation, debate participation, voting, or moderation investigation tooling is included by this decision.

---

# ADR-015: Room Slug Routing

Date: 2026-06-03

Decision:

Add a `slug` column to `public.rooms`. Write database triggers or service logic to automatically slugify titles upon creation, ensuring clean, SEO-friendly URLs.

Reasoning:

In `04_DATABASE_DESIGN.md`, the `rooms` table only defines `id` (UUID) as the lookup field. However, `12_FRONTEND_SPEC.md` defines discussion routes as `/discussions/{slug}`. This maintains routing consistency.

---

# ADR-016: Anonymous Identity Separation

Date: 2026-06-03

Decision:

Enforce database view-level redaction. To prevent exposing raw identity mapping columns (`user_id`) to standard clients, revoke `SELECT` privileges on the `user_id` column of the raw `public.messages` table. Expose data exclusively through a `security definer` database view `public.discussion_messages`. If `identity_mode = 'anonymous'`, the view returns `user_id = null`, `username = 'Anonymous'`, and `avatar_url = null` before data ever leaves the database engine.

Reasoning:

Anonymous participation is key to Discora, but moderators must not have access to real identities, and client APIs must never expose identity mappings.

---

# ADR-017: Discussion First, Debate Later

Date: 2026-06-03

Decision:

Discussions do not require sides or debate positions. Users participate freely without choosing "pro/con/neutral" positions. Debates are separate entities introduced in future sprints.

Reasoning:

Discussions in Discora are intended to be exploratory and support multiple, open viewpoints.

---

# ADR-018: Message Identity Mode Is Immutable

Date: 2026-06-03

Decision:

Make `identity_mode` on `public.messages` strictly immutable after creation. Enforce this restriction at the database layer via the `BEFORE UPDATE` trigger on `public.messages`.

Rules:
* `identity_mode` cannot be changed after creation.
* public -> anonymous is forbidden.
* anonymous -> public is forbidden.

Reasoning:

Allowing users to retroactively change identity modes poses security and moderation risks (e.g. escaping responsibility by going anonymous, or revealing previous anonymous posts).

---

# ADR-019: Claims Are Immutable Knowledge Objects

Date: 2026-06-03

Decision:

Make Claims in Discora strictly immutable once inserted. They cannot be updated or modified in any way. 

Rules:
* Claims must have a minimum content length of 25 characters.
* Claims may be retracted (by setting `is_retracted = true`). Retraction is strictly one-way (false -> true is allowed, true -> false is forbidden).
* Claims may not be deleted. Deletion is blocked at the database layer via trigger function.
* Historical integrity takes precedence over content removal.

To make a correction, the user must publish a new Claim.

Reasoning:

Claims are semantic anchors of consensus. Allowing editing introduces significant risks of semantic drift, vote invalidation, and evidence misalignment. Retraction protects data integrity. Enforcing validation and immutability directly in the database ensures these rules cannot be bypassed.

---

# ADR-020: 5-Minute Database-Level Edit Window Lock

Date: 2026-06-03

Decision:

Enforce a 5-minute editing lock and column immutability (`created_at`, `room_id`, `user_id`) using a Postgres `BEFORE UPDATE` trigger function on the `messages` table instead of RLS policies. RLS handles basic ownership verification (`user_id = auth.uid()`).

Reasoning:

If enforced only in RLS policies, users could bypass it if the check is not strict, or bypass checks by updating the `created_at` timestamp in the payload.

---

# ADR-021: Evidence Is Immutable

Date: 2026-06-03

Decision:

Make Evidence cards in Discora strictly immutable once inserted. 

Rules:
* Evidence cannot be edited.
* Evidence can be retracted (by setting `is_retracted = true`).
* Evidence cannot be deleted.
* Future revisions or updates require publishing new evidence objects.

Reasoning:

Evidence directly supports or contradicts Claims. Allowing modifications would silently change the logical value of the claim relationship and invalidate existing votes. Retraction ensures the audit trail remains transparent and correct.

---

# ADR-022: Questions Are Immutable

Date: 2026-06-04

Decision:

Make Questions in Discora strictly immutable once inserted.

Rules:
* Questions cannot be edited or updated.
* Questions can be retracted (by setting `is_retracted = true`). Retraction is strictly one-way (false -> true is allowed, true -> false is forbidden).
* Questions cannot be deleted (enforced via database trigger).
* Questions have check constraints enforcing 10 to 500 characters and valid enum values for `question_type` and `identity_mode`.

Reasoning:

Questions serve as semantic anchors for Claims. If a question could be edited or updated, the answers (Claims) linked to it could lose their original semantic context, leading to incoherent discussions and integrity violations. Retraction maintains discussion history and integrity. Blocking deletes at the database layer ensures the audit trail remains intact.

