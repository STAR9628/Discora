# Discora — Sprint 7 Implementation Report

## Architecture Summary

In Sprint 7, Discora introduces **first-class Questions** as semantic anchors that organize room discussion. Instead of a complex many-to-many junction table, Sprint 7 implements **Option B (One-to-Many via Nullable FK)** where a Claim optionally references exactly one Question. This design is clean, enforces room-level containment, simplifies RLS and queries, and aligns with the existing claim provenance design (`origin_message_id`).

### Key Principles

* **Immutable & Retractable:** Questions are strictly immutable at the database level. Once posted, they cannot be updated or deleted. They can only be retracted (`is_retracted = true`) via a one-way update.
* **Anonymity (ADR-016 Parity):** Questions support anonymous posting. Raw `questions` table `SELECT` is revoked. Clients read questions via the `discussion_questions` SECURITY DEFINER view, which redacts identity info (`created_by` = `null`, `username` = `'Anonymous'`, `avatar_url` = `null`) when `identity_mode = 'anonymous'`.
* **Zero Question Voting:** Voting remains strictly limited to Claims and Evidence. Questions have no votes or consensus scores.

---

## Schema Changes

### 1. New Tables and Columns

* **`public.questions` table:**
  * `id` (UUID, PK)
  * `room_id` (UUID, FK referencing `public.rooms` on delete cascade)
  * `created_by` (UUID, FK referencing `auth.users` on delete set null)
  * `content` (TEXT, restricted to 10-500 characters)
  * `question_type` (TEXT, must be one of: `information`, `clarification`, `perspective`, `evidence`, `directional`, `reflective`)
  * `identity_mode` (TEXT, default `'public'`, check constraint of `'public'` or `'anonymous'`)
  * `is_retracted` (BOOLEAN, default `false`)
  * `created_at` (TIMESTAMPTZ, default `now()`)
  * `updated_at` (TIMESTAMPTZ, default `now()`)
* **`public.claims` table updates:**
  * Added `question_id` (UUID, nullable, FK referencing `public.questions(id)` on delete set null).

### 2. Indexes

* **Questions Table:**
  * `questions_room_id_created_at_idx` on `(room_id, created_at desc)`
  * `questions_created_by_idx` on `(created_by)`
  * `questions_room_id_question_type_idx` on `(room_id, question_type)`
* **Claims Table:**
  * `claims_question_id_created_at_idx` on `(question_id, created_at desc) where question_id is not null`
  * `claims_room_id_question_id_idx` on `(room_id, question_id) where question_id is not null`

---

## Migrations Applied

* **[202606030010_create_questions.sql](file:///d:/Projects/Discora/supabase/migrations/202606030010_create_questions.sql)**
  * Creates `questions` table and its check constraints.
  * Registers `handle_question_identity_mode` trigger.
  * Registers `enforce_question_immutability` and `prevent_question_deletion` triggers.
  * Revokes `SELECT` on raw `questions` from anon and authenticated roles.
  * Creates `discussion_questions` SECURITY DEFINER view.
  * Adds `question_id` column and indexes to `claims` table.
  * Registers `validate_claim_question_room` trigger to ensure claim's room matches question's room.
  * Recreates `enforce_claim_immutability` trigger to include `question_id` validation.
  * Recreates `discussion_claims` view preserving Sprint 6.5 voting/consensus logic while exposing `question_id`.

---

## Service Changes (`src/features/discussions/services/discussion-service.ts`)

* **`getQuestions(roomId)`**: Fetches questions for a discussion room using the `discussion_questions` view.
* **`createQuestion(data)`**: Inserts a question into the `questions` table. Returns `MutationIdResult` (id-only) to protect identity.
* **`retractQuestion(id)`**: Updates `is_retracted = true` for a question. Returns `MutationIdResult` (id-only).
* **`getClaims(roomId, questionId?)`**: Updated to accept an optional `questionId` filter parameter and applies it directly via Supabase query `.eq("question_id", questionId)` at the database level.
* **`createClaim(data)`**: Updated to accept an optional `questionId` and inserts it into `claims`.

---

## Hook Changes (`src/features/discussions/hooks/use-discussions.ts`)

* **`useQuestions(roomId)`**: Fetch questions with caching under the query key `["questions", roomId]`.
* **`useCreateQuestion(roomId)`**: Mutation hook that invalidates `["questions", roomId]` upon success.
* **`useRetractQuestion(roomId)`**: Mutation hook that invalidates `["questions", roomId]` upon success.
* **`useClaims(roomId, questionId)`**: Extended to include `questionId` in the query key: `["claims", roomId, { questionId }]` to ensure correct client-side query separation when filtering claims by question.
* **`useCreateClaim(roomId)`**: Mutation payload extended to accept optional `questionId`.

---

## UI Changes

* **"Questions" Room Tab:** A new primary tab in `discussion-room.tsx` displays the active question count, lists existing room questions, and lets authenticated users ask new questions.
* **Ask a Question Form:** Accessible in the Questions tab. Allows users to type content (10-500 chars), select one of the 6 question types, toggle "Ask Anonymously" (redacting user details), and submit.
* **Question Detail View:** Clicking on a question navigates to a detail view displaying the question context, its author/metadata, and a dedicated, filtered `ClaimList` showing only the claims answering that specific question.
* **Claim-Question Badging:** Claims answering a question are styled with a special `[Question Answer]` badge in the claims list.
* **Comment Promotion Linkage:** The claim extraction modal (`extract-claim-modal.tsx`) is updated to pass the currently selected `questionId` from the context when creating a claim from a message/comment.

---

## Security Considerations

1. **Client Identity Exposure Prevention:** Revoking `SELECT` on raw tables prevents malicious clients from bypassing the views to see who created anonymous questions.
2. **View-Level Redaction:** The `discussion_questions` view performs redaction using SQL `CASE WHEN` logic. Anonymous rows have `created_by = null`, `username = 'Anonymous'`, and `avatar_url = null`.
3. **Data Integrity Triggers:** Triggers enforce that no user can modify key question columns or delete questions, ensuring the database is the source of truth for immutability.

---

## Deferred Items & Known Limitations

* **`ANON-07 — Anonymous question author cannot retract own question (UI only)`**: Because anonymous questions redact `created_by` to `null` in the view, the frontend cannot match `question.createdBy === user.id`. Thus, the "Retract" button is hidden in the UI. Retraction still works if invoked directly via SQL or api command for authorized users.
* **Question Editing:** Editing questions is completely disabled by design (ADR-022) to prevent semantic drift of linked claims.
* **Question Sorting/Search:** Search, sorting, and pagination are deferred to future sprints.

---

## Production Readiness Verdict

### **READY**

#### Justification
The database schema, triggers, views, services, hooks, and UI components are fully implemented, compiling cleanly (`build` pass) and adhering to all style/structure rules (`lint` pass). All tests verify that identity exposure is prevented and room integrity is strictly preserved.

Under the project's existing risk classification and deferred-item philosophy, the only outstanding issue, `ANON-07` (anonymous question retraction hidden in UI), is classified as a deferred UX limitation. Because database-level RLS policies are fully secure and operational, and no third-party identity leakage exists, this UX limitation does not block the release. This is consistent with deferred limits `ANON-03` and `ANON-04` from prior sprints.

