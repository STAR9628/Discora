# Discora — Sprint 8 Execution Plan

## High-Level Phased Plan

Sprint 8 focuses on delivering the **Anonymity-Preserving Moderation Framework** (ADR-023). This plan outlines the database, service, and UI phases required for implementation.

### Prerequisites (Mandatory Gates)

Before starting Phase 1 implementation, the following architecture decisions must be formally approved:
* **ADR-023 (Moderation Framework):** Design approval of the normalized `moderation_flags` table, duplicate index protections, and view-level Hash Anti-Join filters.
* **ADR-024 (Moderator Authorization Model):** Design approval of the `user_roles` database table and deterministic `has_role_or_higher()` helper function.

---

### Phase 1 — Database Foundation

#### Objectives
Implement the role authorization model, the normalized moderation flags table, enable RLS, register anti-join indexes, and recreate security-definer views.

#### Tasks
* Create migration `202606040001_create_moderation.sql`.
* **Create Roles System:**
  * Create `public.user_role_type` enum (`'moderator'`, `'admin'`).
  * Create `public.user_roles` table and enable RLS (revoke all standard client privileges).
  * Register the deterministic `public.has_role_or_higher()` helper function.
* **Create Moderation Flags Table:**
  * Create `public.moderation_flags` table with columns: `id`, `message_id`, `question_id`, `claim_id`, `evidence_id`, `reporter_id`, `reason`, `status`, `action_taken_by`, `created_at`, `resolved_at` (along with the `exactly_one_entity` check constraint).
  * Add composite unique indexes on `(reporter_id, message_id / question_id / claim_id / evidence_id) where status = 'pending'` for report spam protection.
  * Enable RLS on `moderation_flags`: inserts allowed for authenticated, selects/updates restricted to `has_role_or_higher() = true`. Revoke raw selects.
* **Create View-Filtering Anti-Join Indexes:**
  * Create partial indexes on `moderation_flags` for each entity ID column `where status = 'resolved_hidden'`.
* **Recreate Views with Hash Anti-Joins:**
  * Recreate `discussion_questions`, `discussion_claims`, and `discussion_evidence` views to filter out hidden content using direct `NOT EXISTS` subqueries.
  * Recreate `discussion_messages` view to redact flagged message content to `[Message hidden by moderator]` and set user metadata to `null`, keeping placeholder rows to preserve thread hierarchy.

---

### Phase 2 — Service & Hook Integration

#### Objectives
Extend the discussion service layer and react query hooks to support reporting content and loading the moderation queue.

#### Tasks
* Add `flagEntity` mutation in `discussion-service.ts` (returns `{ id }` only to protect the reporter's identity).
* Add `getPendingFlags` query in `discussion-service.ts`. This query must join `moderation_flags` against the redacted views (`discussion_*`) instead of raw tables to preserve ADR-016 anonymity.
* Add `resolveFlag` mutation in `discussion-service.ts`.
* Implement frontend hooks `useFlagEntity`, `usePendingFlags`, and `useResolveFlag` in `use-discussions.ts`.

---

### Phase 3 — Moderator UI Dashboard

#### Objectives
Integrate report triggers into discussion elements and construct a simple, secure dashboard for moderators to review reports.

#### Tasks
* Add a "Report" action button to messages, questions, claims, and evidence.
* Create a dedicated `/settings/moderation` subpage (restricted to users with moderator roles).
* Render the list of pending flags. Verify that user profiles of anonymous posters are rendered as "Anonymous" in the moderation dashboard.
* Update message components to render the placeholder `[Message hidden by moderator]` when content matches.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Active JWT Demotion Delay** | While database RLS demotion is immediate, the React client will retain cached credentials for up to 1 hour. Trigger a profile reload when the client encounters API 403 Forbidden errors on flag updates. |
| **Spam reporting (Flag bombing)** | Enforced composite uniqueness constraints block duplicate report insertion. Implement API-level rate limiting in middleware to throttle request frequency. |

---

## Validation Strategy

### Automated Verification
* Unit tests checking RLS: Assert that a standard user attempting to read the `moderation_flags` table receives a permission denied error.
* View testing: Insert flagged item, resolve flag to `resolved_hidden`, and verify it disappears from view select query (or placeholder renders for messages).

### Manual Verification
* Log in as User A. Flag a question posted anonymously by User B.
* Log in as Moderator. Go to the moderation queue, verify the poster of the reported question displays as "Anonymous", and click "Hide Content".
* Verify that the question disappears from the room feed for all users.
