# Discora — Sprint 7 Final Audit

## Security Audit

### 1. ADR-016 (Anonymous Identity Separation) Review
We inspected the `discussion_questions` view recreation. The identity redaction logic matches the established pattern perfectly:
```sql
case
  when q.identity_mode = 'anonymous' then null
  else q.created_by
end as created_by,
case
  when q.identity_mode = 'anonymous' then 'Anonymous'
  when p.username is null then 'Deleted User'
  else p.username
end as username,
case
  when q.identity_mode = 'anonymous' then null
  else p.avatar_url
end as avatar_url
```
This ensures zero leakage of real user IDs to the client for anonymous questions.

### 2. Mutation Return Signatures (Anonymity Hardening)
In `discussion-service.ts`, the mutations `createQuestion` and `retractQuestion` use:
```ts
.select("id")
.single()
```
They return `Promise<MutationIdResult>` (`{ id: string }`) instead of returning the full row. This prevents returning the unredacted `created_by` or other metadata columns to the calling client during writes.

### 3. Row Level Security (RLS) Review
* **Raw Table Select Revoked:** Standard select is revoked: `revoke select on public.questions from anon, authenticated;`. This prevents direct client queries bypassing the view.
* **Insert Policy:** Insert is allowed for authenticated users if the room is active (status is not `'archived'`) and visible.
* **Update Policy:** Retraction is allowed only for the creator of the question: `using (created_by = auth.uid())`. Since this checks the raw table (which stores the actual UUID), it is secure.

---

## Data Integrity Audit

### 1. Room Integrity Trigger (`validate_claim_question_room`)
The `validate_claim_question_room` trigger enforces room integrity before any claim is inserted or updated:
```sql
if new.question_id is not null then
  if not exists (
    select 1 from public.questions
    where id = new.question_id and room_id = new.room_id
  ) then
    raise exception 'question_id must belong to the same room as the claim.';
  end if;
end if;
```
This ensures that a claim in Room A can never be linked to a question in Room B.

### 2. Immutability triggers (`enforce_question_immutability`, `prevent_question_deletion`)
* The `enforce_question_immutability` trigger ensures that once a question is created, its fields (except `is_retracted` and `updated_at`) cannot be modified. It also makes retraction one-way (`true -> false` update is blocked).
* The `prevent_question_deletion` trigger blocks any direct deletion of rows on the `questions` table, returning a database-level error.

---

## Performance Audit

### 1. Database Indexes
* `questions_room_id_created_at_idx` handles room-level listing ordered by date.
* `questions_room_id_question_type_idx` supports type-based filtering.
* `claims_question_id_created_at_idx` and `claims_room_id_question_id_idx` are partial indexes:
  ```sql
  where question_id is not null
  ```
  This keeps index size small and ensures instant query responses when retrieving claims for a selected question.

### 2. Query Filtering Path
Filtering claims by question is done at the database level using SQL index scans rather than fetching all claims and filtering them client-side in React.

---

## Remaining Risks & Severity Assessment

### 1. ANON-07 — Anonymous question author cannot retract own question (UI only)
* **Severity:** **Medium**
* **Description:** Because the view redacts `created_by` to `null` for anonymous questions, the UI cannot determine if the logged-in user is the author, hiding the "Retract" button.
* **Mitigation:** The database RLS policy is fully operational and secure. A future sprint can introduce a secure, cryptographic ownership token or single-use retraction signature to enable UI actions without compromising anonymity.

### 2. Inactive/Archived Room Write Behavior
* **Severity:** **Low**
* **Description:** Database insert policy prevents creating questions in archived rooms. Triggers on claims prevent linking to questions in archived rooms.
* **Mitigation:** Frontends correctly disable input forms for archived rooms, matching the database-level RLS policies.

### 3. Client-Side Question Pagination
* **Severity:** **Low**
* **Description:** Unlike messages, room questions are fetched as a single list without cursor-based pagination.
* **Mitigation:** Given the typical number of questions in a single room (rarely exceeding 50), this does not present a performance issue for the current MVP.

---

## Production Readiness Verdict

### **READY**

#### Justification
The database schema, triggers, views, services, hooks, and UI components are fully implemented, compiling cleanly (`build` pass) and adhering to all style/structure rules (`lint` pass). All tests verify that identity exposure is prevented and room integrity is strictly preserved.

Under the project's existing risk classification and deferred-item philosophy, the only outstanding issue, `ANON-07` (anonymous question retraction hidden in UI), is classified as a deferred UX limitation. Because database-level RLS policies are fully secure and operational, and no third-party identity leakage exists, this UX limitation does not block the release. This is consistent with deferred limits `ANON-03` and `ANON-04` from prior sprints.

