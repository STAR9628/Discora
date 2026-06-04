# Discora — Moderation vs. Search Decision Review

This document evaluates the architectural priorities for Sprint 8, comparing **Anonymity-Preserving Moderation** and **Room-Scoped Search & Indexing** to establish a robust execution path.

---

## 1. Trade-off Analysis

### Option 1: Moderation-First (Recommended)

* **Benefits:**
  * **Launch Readiness:** Essential blocker for launching public or community instances. An anonymous platform without moderation will be flooded with spam and abuse.
  * **Anonymity Protection:** Establishes a secure administrative workflow that respects ADR-016 before opening writes to the public.
  * **Auditability:** Builds an immutable history of moderation actions, preventing administrative abuse.
* **Risks:**
  * Potential for identity leakage if moderator queries are not strictly isolated (mitigated by using redacted views for all moderator tools).
* **Schema Complexity:** Low-Medium. Requires a single `moderation_flags` table and associated indexes.
* **RLS Complexity:** Medium. Requires role mapping for moderators and restrict select/update policies.
* **Anonymity Impact:** Zero exposure. Moderation actions target random entity UUIDs, keeping the underlying author completely hidden.
* **Long-Term Maintenance:** Low. Centralized logic using database helper functions avoids view code duplication.
* **Launch Readiness Impact:** **Critical Path Blocker.** No public deploy is possible without moderation.

### Option 2: Search-First

* **Benefits:**
  * **Discoverability:** Allows users to find claims, questions, and evidence across rooms, reducing duplicate entries.
* **Risks:**
  * **Leakage of Private Rooms:** If RLS search filters are weak, search queries could return matches from private rooms.
  * **Spam Proliferation:** Without moderation, indexing spam content makes it more visible to users.
* **Schema Complexity:** Low. Requires `tsvector` columns and GIN indexes on base tables.
* **RLS Complexity:** High. Writing secure text search queries that respect complex room visibility RLS is error-prone.
* **Anonymity Impact:** None, provided search results display redacted usernames (via views).
* **Long-Term Maintenance:** Medium. Text indexes require rebuilds and tuning.
* **Launch Readiness Impact:** **Enhancement Only.** Not a launch blocker.

---

## 2. ADR-023 Deep-Dive Architecture Review

### Question 1: Can moderators ever infer anonymous author identity through:
* **Raw Table Access:** **Yes.** If moderators can query raw tables (e.g. `public.claims`), they will see the unredacted `created_by` UUID. **Mitigation:** Ensure standard moderator accounts only have client role privileges (`authenticated` role) and are blocked from base tables via `REVOKE SELECT`, same as standard users.
* **Joins:** **Yes**, if they join custom tables with raw tables. **Mitigation:** Database access must be limited to views; direct database query access must be disabled.
* **Audit Logs:** **No**, provided `public.moderation_flags` does **not** store the target entity's `created_by` user ID. The flag record must only reference the entity UUID.
* **Reporter Metadata:** **No.** While the table logs who reported the post (`reporter_id`), it does not contain the identity of the author being reported.
* **Moderation Dashboard Queries:** **Yes**, if the dashboard fetches reported entities by joining flags against raw tables. **Mitigation:** The dashboard API must select content exclusively from the security-definer redacted views (`discussion_questions`, `discussion_claims`, etc.) using the reported entity UUID.

### Question 2: Does view-level filtering preserve ADR-019 and ADR-022 immutability?
**Yes.** View-level filtering does not update or delete database rows. The raw records remain intact, preserving the historical consensus audit trail and evidence links. The views simply omit hidden rows from client queries.

### Question 3: Is there a cleaner moderation architecture than rebuilding every `discussion_*` view?
**Yes.** Instead of adding duplicate `LEFT JOIN public.moderation_flags` and `WHERE` clauses to every view query, we can create a centralized, stable helper function:
```sql
create or replace function public.is_entity_hidden(p_entity_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.moderation_flags
    where entity_id = p_entity_id and status = 'resolved_hidden'
  );
$$;
```
Then, we only append `where not public.is_entity_hidden(id)` to the view definitions. This avoids schema duplication, improves query performance, and centralizes moderation logic.

### Question 4: What additional ADRs are required before Sprint 8 implementation?
1. **ADR-023: Anonymity-Preserving Moderation Framework:** Defining the flags table, RLS policies, and view filtering helper function.
2. **ADR-024: Moderator Authorization Model:** Specifying how moderator roles are assigned (JWT metadata vs database profile flags) and verified.

---

## 3. Verdict & Readiness

### Required Architecture Changes Before Implementation:
1. Define the centralized `public.is_entity_hidden` function to decouple views from the `moderation_flags` table schema.
2. Update the Moderator Dashboard specification to enforce joins with **redacted views** rather than raw tables.

### Verdict: **GO (Ready to plan Phase 1)**
The moderation-first path is approved. The architecture is safe, compliant with ADR-016/019/022, and represents the only viable path to public deployment.
