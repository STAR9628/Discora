# Discora — Sprint 7 Release Readiness

## Release Plan

### Completed Features

1. **First-class Questions:** Added database table, RLS, and security-definer view `discussion_questions` with identity redaction for anonymous posts.
2. **Question-Claim Linkage (Option B):** Nullable FK `claims.question_id` implemented.
3. **Trigger-Enforced Immutability & Room Integrity:**
   * Questions are immutable; retraction is one-way.
   * Direct question deletion is blocked.
   * `validate_claim_question_room` trigger blocks linking claims and questions from different rooms.
4. **UI Integration:**
   * Room "Questions" tab showing list of questions and "Ask Question" form.
   * Question Detail View showing question metadata and filtered Claims.
   * Answer badge (`[Question Answer]`) displayed on linked claims.
   * Claim extraction modal preserves `question_id` from the room detail context.

### Deferred Features

1. **Question Voting:** Out of scope for Sprint 7. Voting continues to happen on Claims/Evidence.
2. **Question Pagination:** Client-side rendering is used for the question list.

---

## Migration Order

The migration must be executed after `202606030009_block_votes_on_retracted_entities.sql`:
1. `supabase/migrations/202606030010_create_questions.sql`

---

## Deployment Steps

1. **Pre-Deployment:** Check DB connection and verify active schemas up to `009`.
2. **Database Migration:** Run the migration `202606030010_create_questions.sql`.
3. **Application Deployment:** Build and deploy the Next.js frontend code bundle.
4. **Post-Deployment Verification:** Check room tabs, verify questions list loads, and ensure error pages are not served.

---

## Rollback Notes

If critical database or frontend issues occur, follow these operational rollback instructions:

### 1. Application Codebase
* Roll back the application codebase to the previous stable release commit (Sprint 6.5).
* Re-build and deploy the frontend bundle to restore the UI.

### 2. Database Schema Rollback Checklist
To cleanly remove Sprint 7 changes and restore the database to the Sprint 6.5 production state, perform the following operations in order:

* [ ] **Drop Dependent Views:**
  * Drop the newly created `public.discussion_questions` view.
* [ ] **Revert Modified Views:**
  * Recreate the `public.discussion_claims` view to remove the `question_id` column reference, while preserving the original Sprint 6.5 voting/consensus logic.
* [ ] **Drop Triggers on Claims Table:**
  * Drop the `validate_claim_question_room` trigger from `public.claims`.
  * Revert the `enforce_claim_immutability` trigger on `public.claims` to its Sprint 6.5 state (removing the check for `question_id` immutability).
* [ ] **Drop Triggers on Questions Table:**
  * Drop the `handle_question_identity_mode` trigger from `public.questions`.
  * Drop the `enforce_question_immutability` trigger from `public.questions`.
  * Drop the `prevent_question_deletion` trigger from `public.questions`.
  * Drop the `set_questions_updated_at` trigger from `public.questions`.
* [ ] **Drop Trigger Functions:**
  * Drop the function `public.validate_claim_question_room()`.
  * Drop the function `public.handle_question_identity_mode()`.
  * Drop the function `public.enforce_question_immutability()`.
  * Drop the function `public.prevent_question_deletion()`.
  * Revert the function `public.enforce_claim_immutability()` to exclude the `question_id` column check.
* [ ] **Revert Claims Table Column & Indexes:**
  * Drop index `claims_question_id_created_at_idx`.
  * Drop index `claims_room_id_question_id_idx`.
  * Drop column `question_id` from the `public.claims` table.
* [ ] **Drop Questions Table & Associated Indexes/Policies:**
  * Drop the table `public.questions` (this will automatically cascade to delete associated indexes `questions_room_id_created_at_idx`, `questions_created_by_idx`, `questions_room_id_question_type_idx`, policies `"Authenticated users can create questions"`, `"Authors can retract their questions"`, and any associated table-level grants/revokes).

---

## QA Checklist

- [ ] **Public Question Creation:** Ask a public question and ensure the author name and avatar render correctly.
- [ ] **Anonymous Question Creation:** Ask an anonymous question and ensure the author name displays as "Anonymous", avatar is generic, and no user ID is exposed in the DOM.
- [ ] **Question Immutability:** Attempt to update a question statement in the database or via API; verify the trigger blocks it with an error.
- [ ] **Delete Prevention:** Attempt to delete a question; verify the database trigger returns a delete prevention error.
- [ ] **Question Retraction:** Click "Retract" on an active question (as the author). Verify the status changes to retracted and cannot be reverted.
- [ ] **Cross-Room Linkage Prevention:** Attempt to insert a claim with a `question_id` belonging to a different room; verify `validate_claim_question_room` aborts the insert.
- [ ] **Claim Filtering:** Navigate to a question detail view and verify that only claims associated with that question are listed.

---

## Production Readiness Verdict

### **READY**

#### Justification
The database schema, triggers, views, services, hooks, and UI components are fully implemented, compiling cleanly (`build` pass) and adhering to all style/structure rules (`lint` pass). All tests verify that identity exposure is prevented and room integrity is strictly preserved.

Under the project's existing risk classification and deferred-item philosophy, the only outstanding issue, `ANON-07` (anonymous question retraction hidden in UI), is classified as a deferred UX limitation. Because database-level RLS policies are fully secure and operational, and no third-party identity leakage exists, this UX limitation does not block the release. This is consistent with deferred limits `ANON-03` and `ANON-04` from prior sprints.
