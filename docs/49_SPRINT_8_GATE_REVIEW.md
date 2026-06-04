# Discora — Sprint 8 Final Architecture Gate Review

## 1. Red-Team Architecture Review

---

### A. ADR-024 Role System

#### 1. Privilege Escalation Paths
* **Risk:** Standard users might find a way to insert themselves into `public.user_roles` or update their profile role.
* **Mitigation:** The raw table `public.user_roles` has RLS enabled with **zero** policies for standard users. All permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) are revoked from the `anon` and `authenticated` roles. This completely blocks client-side writes. Promotion/demotion is restricted to superuser SQL scripts or system-level triggers.

#### 2. Circular RLS Dependencies
* **Risk:** If a policy on `public.user_roles` calls a function that queries `public.user_roles`, it causes a circular dependency and stack overflow.
* **Mitigation:** Since `public.user_roles` has RLS enabled but **zero policies** (all standard access is blocked, and superusers bypass RLS), we avoid any circular lookup. The helper function `has_role_or_higher()` runs as `SECURITY DEFINER` (superuser context), bypassing RLS check recursion.

#### 3. SECURITY DEFINER Risks
* **Risk:** A function marked as `SECURITY DEFINER` can be abused if the input parameters are hijacked (e.g. SQL injection or privilege bypass).
* **Mitigation:** `has_role_or_higher(p_user_id, p_required_role)` is marked `STABLE` and strictly hardcoded to check for the existence of the mapping without exposing raw row data.

#### 4. Audit & Demotion Propagation
* **Demotion:** Demotion is instantaneous for all RLS checks. The moment a row is deleted from `user_roles`, subsequent queries instantly evaluate `has_role_or_higher() = false`.
* **Deterministic Role Evaluation:** The previous `limit 1` non-deterministic bug (Issue 1) is resolved. The function `has_role_or_higher` ranks roles deterministically inside SQL by checking if the user holds the required role or any role above it (e.g. `admin` satisfies a `moderator` check).

---

### B. ADR-023 Moderation System

#### 1. Duplicate Reports & Spam Attacks
* Composite unique index constraints are enforced on `public.moderation_flags` to restrict a user to a single pending report per entity (e.g., `unique (reporter_id, claim_id) where status = 'pending'`). Throttling is handled at the application API/middleware layer.

#### 2. Normalized Entity References (Referential Integrity)
* The polymorphic design (`entity_type` + `entity_id`) is replaced with **four separate nullable foreign keys** (`message_id`, `question_id`, `claim_id`, `evidence_id`) with `ON DELETE CASCADE` constraints. This ensures Postgres enforces database-level referential integrity.

#### 3. Hidden Content Strategy
* **Structured Knowledge (Questions, Claims, Evidence):** Are **omitted entirely** from views via anti-joins, preventing users from viewing or casting votes on hidden claims.
* **Chronological Messages (Chat):** Are kept in the view to maintain thread alignment, but their content is redacted to `[Message hidden by moderator]` and author metadata is set to `null`.

#### 4. Moderation Dashboard Queue Query
* To prevent moderator deanonymization leaks (ADR-016), the queue dashboard query must join the `moderation_flags` table against the **redacted views** (`discussion_*`) using the entity UUIDs, ensuring anonymous creator details render as `'Anonymous'` with `null` avatars.

---

### C. View Filtering & Performance

#### 1. Per-Row Function Performance
* View definitions directly filter hidden content using `NOT EXISTS` clauses, enabling the Postgres query planner to execute optimized **Hash Anti-Joins** instead of scalar function scans.

#### 2. Required Indexes
* Partial indexes on `moderation_flags` for each entity ID column `where status = 'resolved_hidden'` are created to optimize Hash Anti-Joins.

---

## 2. Issues & Improvements Summary

All critical issues identified in the initial gate review are resolved in the finalized design:
1. **Polymorphic FK Violation:** Normalized into four separate nullable foreign keys.
2. **Duplicate Reports:** Fixed via composite unique indexing.
3. **Per-Row Function Scan:** Replaced by `NOT EXISTS` anti-join subqueries.
4. **Nondeterministic Role Evaluation:** Replaced by `has_role_or_higher()` checking ranks.

---

## 3. Verdict

### **READY FOR IMPLEMENTATION**

#### Justification
The database schema, triggers, views, services, hooks, and UI components are fully aligned. The planning documents resolve all role-hierarchy, placeholder, queue query, and propagation ambiguities. The codebase compiles cleanly (`build` pass) and lints successfully (`lint` pass). Discora is ready to begin Sprint 8 implementation.
