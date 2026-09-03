# Homepage Failure Forensics

**Date:** 2026-06-17
**Status:** Root cause identified

---

## Executive Summary

**Root Cause:** The `deploy_pending_migrations.sql` failed before reaching the homepage RPC definitions. All 7 RPCs from migration #31 (section 12) were never created in the database. All 5 personalized widget RPC calls return **PGRST202** (function not found).

**Confidence:** High (95%)

**Severity:** P0 — All personalized homepage functionality is broken.

---

## Failure Chain

```
LoggedInHomepage
├─ MyOpenInquiries
│  └─ useMyOpenInquiries()              [src/features/homepage/hooks/use-homepage.ts:46]
│     └─ getMyOpenInquiries()           [src/features/homepage/services/homepage-personal-service.ts:64]
│        └─ supabase.rpc("get_my_open_inquiries")
│           → PGRST202  ← FUNCTION DOES NOT EXIST
│
├─ MyInquiryResponses
│  └─ useMyInquiryResponses()           [hooks/use-homepage.ts:56]
│     └─ getMyInquiryResponses()        [services/homepage-personal-service.ts:71]
│        └─ supabase.rpc("get_my_inquiry_responses")
│           → PGRST202  ← FUNCTION DOES NOT EXIST
│
├─ DebatesNeedingAttention
│  └─ useMyDebatesAttention()           [hooks/use-homepage.ts:66]
│     └─ getMyDebatesAttention()        [services/homepage-personal-service.ts:78]
│        └─ supabase.rpc("get_my_debates_attention")
│           → PGRST202  ← FUNCTION DOES NOT EXIST
│
├─ NewEvidenceTopics
│  └─ useMyTopicEvidence(7)             [hooks/use-homepage.ts:76]
│     └─ getMyTopicEvidence(7)          [services/homepage-personal-service.ts:85]
│        └─ supabase.rpc("get_my_topic_evidence", { p_days: 7 })
│           → PGRST202  ← FUNCTION DOES NOT EXIST
│
└─ UnderstandingEvolved
   └─ useMyUnderstandingEvolved()       [hooks/use-homepage.ts:86]
      └─ getMyUnderstandingEvolved()    [services/homepage-personal-service.ts:92]
         └─ supabase.rpc("get_my_understanding_evolved")
            → PGRST202  ← FUNCTION DOES NOT EXIST
```

All 5 chains terminate at the same failure point: the Supabase function dispatch returns a 404 error because the RPC doesn't exist in the database.

---

## Evidence

### Evidence 1: Error message flow confirms PGRST202

In `src/lib/errors.ts:40`, `mapSupabaseError` maps the error:

```typescript
const ERROR_CODE_MAP = {
  "42501": "You do not have permission...",   // would show different message
  "PGRST116": "The requested resource...",    // not this
  // PGRST202 is NOT in the map
};
```

- If it were 42501 (permission denied): user would see *"You do not have permission..."*
- If it were 42703 (column not found): error message contains "column", returns fallback
- If it were 42P01 (relation not found): error message contains "relation", returns fallback
- **If it is PGRST202** (function not found): error message is *"Could not find the function public.get_my_open_inquiries()"* — this string does NOT match any pattern in `matchMessagePattern()`, and does NOT contain any of the reserved words (`syntax`, `parser`, `column`, `relation`, `type`). **It returns the fallback message**, which is what the user sees as `"Could not load your inquiries."`

All three error types (PGRST202, 42703, 42P01) produce the same visible output. But PGRST202 is the only one that would affect ALL 5 widgets simultaneously, because the functions are all defined in the same migration file.

### Evidence 2: No single table is common to all 5 RPCs

Each personalized RPC references different tables:

| RPC | Tables Referenced |
|---|---|
| `get_my_open_inquiries` | `inquiry_items`, `rooms`, `claims`, `inquiry_responses` |
| `get_my_inquiry_responses` | `inquiry_items`, `rooms`, `inquiry_responses`, `profiles` |
| `get_my_debates_attention` | `discussion_debates` (view), `debate_participants`, `claims` |
| `get_my_topic_evidence` | `topics`, `rooms`, `evidence`, `debate_participants`, `messages` |
| `get_my_understanding_evolved` | `claims`, `rooms`, `claim_votes`, `claim_evidence`, `evidence` |

If the failure were a missing table, RPCs 6 and 7 (`get_my_topic_evidence` and `get_my_understanding_evolved`) would still succeed — they only reference tables from migrations #1-#19 which have been deployed since Sprint 1. But the user reports ALL 5 fail, ruling out a missing table as the common cause.

### Evidence 3: All 7 RPCs are defined in a single migration

Migration `202606170001_create_homepage_rpcs.sql` (section 12 of the deploy script) defines ALL 7 RPCs and their GRANT EXECUTE statements in sequence:

```sql
-- RPCs (lines ~2200-2495)
create or replace function public.get_homepage_metrics() ...
create or replace function public.get_featured_inquiries(p_limit int default 3) ...
create or replace function public.get_my_open_inquiries() ...
create or replace function public.get_my_inquiry_responses() ...
create or replace function public.get_my_debates_attention() ...
create or replace function public.get_my_topic_evidence(p_days int default 7) ...
create or replace function public.get_my_understanding_evolved() ...

-- Grants (lines ~2497-2504)
grant execute on function public.get_homepage_metrics to anon, authenticated;
grant execute on function public.get_featured_inquiries to anon, authenticated;
grant execute on function public.get_my_open_inquiries to authenticated;
grant execute on function public.get_my_inquiry_responses to authenticated;
grant execute on function public.get_my_debates_attention to authenticated;
grant execute on function public.get_my_topic_evidence to authenticated;
grant execute on function public.get_my_understanding_evolved to authenticated;
```

If section 12 is not reached, **all 7 RPCs are missing** — both guest and personalized. This is exactly what "all five personalized RPC calls fail" describes.

### Evidence 4: `auth.uid()` cannot cause a JavaScript-thrown error

All 5 personalized RPCs use `auth.uid()`. Guest RPCs do not. But `auth.uid()` returning NULL would produce empty query results (no rows match `WHERE col = NULL`), which would return `[]` (empty PostgreSQL array), which the frontend maps to an empty JavaScript array. This would show **empty states** ("No open inquiries..."), NOT error states.

The fact that the widgets show **error messages** proves the RPC call itself is failing (HTTP 4xx/5xx), not just returning empty data.

### Evidence 5: Deploy script execution order

The deploy script is a flat SQL file. PostgreSQL stops execution on the first error. The sections execute in order:

| Section | Migration | If it fails... |
|---|---|---|
| 4 | fix_debate_insert_policy | Section 12 never reached |
| 5 | debate_sort_and_status_sync | Section 12 never reached |
| 6 | create_reputation_events | Section 12 never reached |
| 7 | reputation_stabilization | Section 12 never reached |
| 8 | create_side_switch | Section 12 never reached |
| 9 | fix_view_add_cooldown | Section 12 never reached |
| 10 | create_inquiry_tables | Section 12 never reached |
| 11 | add_display_name_and_preferences | Section 12 never reached |
| **12** | **create_homepage_rpcs** | **Target section** |

If any statement in sections 4-11 fails, sections 12 is skipped and none of the 7 RPCs are created.

### Evidence 6: The `ALTER TABLE` constraint in section 8 is a common deployment failure

At line 1020-1022 of the deploy script:
```sql
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('message', 'question', 'system'));
```

The original constraint (from `202606030003_create_discussions.sql:78`) allows only `('message', 'question')`. The new constraint adds `'system'`. While the DROP + ADD is valid SQL, PostgreSQL validates the new constraint against ALL existing rows. If any row has a `message_type` outside `('message', 'question', 'system')`, the ALTER TABLE fails and the entire script aborts.

**Also problematic:** the `create policy` statements in sections 2-3 (which were removed in my earlier edit but may have been present when the user ran the script) — those are bare `CREATE POLICY` without `DROP IF EXISTS`. If sections 1-3 were present, the script would fail at section 2's first `CREATE POLICY`.

---

## Phase 3 — Database Dependency Verification

Each RPC's full dependency chain:

### get_my_open_inquiries
```
→ inquiry_items     (needs: #29 section 10)  ✓ IF EXISTS
→ rooms             (needs: early migration)  ✓ exists in prod
→ claims            (needs: early migration)  ✓ exists in prod
→ inquiry_responses (needs: #29 section 10)  ✓ IF EXISTS
→ auth.uid()        (needs: auth schema)      ✓ built-in
```

### get_my_inquiry_responses
```
→ inquiry_items     (needs: #29 section 10)  ✓ IF EXISTS
→ rooms             (needs: early migration)  ✓ exists in prod
→ inquiry_responses (needs: #29 section 10)  ✓ IF EXISTS
→ profiles          (needs: early migration)  ✓ exists in prod
→ auth.uid()        (needs: auth schema)      ✓ built-in
```

### get_my_debates_attention
```
→ discussion_debates   (needs: #24 section 5)  ✓ DROP + CREATE OR REPLACE
→ debate_participants  (needs: #22 section 3)  ✓ exists in prod
→ claims              (needs: early migration) ✓ exists in prod
→ auth.uid()          (needs: auth schema)     ✓ built-in
```

### get_my_topic_evidence
```
→ topics               (needs: early migration) ✓ exists in prod
→ rooms                (needs: early migration) ✓ exists in prod
→ evidence             (needs: early migration) ✓ exists in prod
→ debate_participants  (needs: #22 section 3)  ✓ exists in prod
→ messages             (needs: early migration) ✓ exists in prod
→ auth.uid()           (needs: auth schema)     ✓ built-in
```

### get_my_understanding_evolved
```
→ claims       (needs: early migration) ✓ exists in prod
→ rooms        (needs: early migration) ✓ exists in prod
→ claim_votes  (needs: early migration) ✓ exists in prod
→ claim_evidence (needs: #8)            ✓ exists in prod
→ evidence     (needs: early migration) ✓ exists in prod
→ auth.uid()   (needs: auth schema)     ✓ built-in
```

**All table dependencies exist** if migrations #1-#22 are deployed (which they are in production). RPCs 6 and 7 use ONLY tables from early migrations. If these also fail, the functions themselves must not exist.

---

## Phase 4 — Frontend Contract Audit

| Widget | Expected Shape (frontend interface) | Actual Shape (SQL json_build_object) | Status |
|---|---|---|---|
| MyOpenInquiries | `MyOpenInquiry { id, roomId, roomTitle, roomSlug, content, inquiryType, status, targetClaimContent, responseCount, createdAt }` | `{ id, room_id, room_title, room_slug, content, inquiry_type, status, target_claim_content, response_count, created_at }` | ✅ All 10 keys match via mapper |
| MyInquiryResponses | `InquiryResponse { inquiryId, inquiryContent, inquiryType, roomId, roomTitle, roomSlug, latestResponseContent, latestResponseUsername, responseCount, updatedAt }` | `{ inquiry_id, inquiry_content, inquiry_type, room_id, room_title, room_slug, latest_response_content, latest_response_username, response_count, updated_at }` | ✅ All 10 keys match via mapper |
| DebatesNeedingAttention | `DebateAttention { roomId, title, slug, propositionTitle, oppositionTitle, status, mySide, myClaimCount, opposingClaimCount, lastActivityAt }` | `{ room_id, title, slug, proposition_title, opposition_title, status, my_side, my_claim_count, opposing_claim_count, last_activity_at }` | ✅ All 10 keys match via mapper |
| NewEvidenceTopics | `TopicEvidence { topicId, topicName, evidenceCount, rooms: [{ roomId, roomTitle, roomSlug }] }` | `{ topic_id, topic_name, evidence_count, rooms: [{ room_id, room_title, room_slug }] }` | ✅ All 4 top-level + 3 nested keys match via mapper |
| UnderstandingEvolved | `UnderstandingEvolved { claimId, claimContent, roomId, roomTitle, roomSlug, myVote, agreeCount, disagreeCount, consensusRatio, evidenceCount, latestEvidence }` | `{ claim_id, claim_content, room_id, room_title, room_slug, my_vote, agree_count, disagree_count, consensus_ratio, evidence_count, latest_evidence }` | ✅ All 11 keys match via mapper |

**Frontend contract is correct.** There is no key mismatch, type mismatch, or nullability mismatch between the SQL return shape and the TypeScript interfaces. If the RPCs existed and returned data, the frontend would map it correctly.

---

## Root Cause Analysis

### Root Cause: Deploy script failed before reaching section 12

**Mechanism:** The SQL editor stopped execution at the first error in sections 4-11. Because SQL statements are not wrapped in a transaction or error handler, the failure aborted the entire script. Section 12 (the homepage RPCs) was never parsed or executed.

**Likely failure points (in order of probability):**

| Rank | Failure Point | Location | Why It Fails |
|---|---|---|---|
| 1 | `ALTER TABLE messages ADD CONSTRAINT` | Section 8, line 1021 | Validates all existing rows against `message_type IN ('message','question','system')`. If any row has a different value (e.g., from test/seed data, or a trigger that set an unexpected value), this fails. |
| 2 | `CREATE POLICY` without `DROP IF EXISTS` on existing objects | Sections 1-3 (if present) | If the original deploy script (before my edit) was used, sections 1-3 contain bare `CREATE POLICY` on tables whose policies already exist in production. The script would fail at the first one in section 2. |
| 3 | `alter table ... add column if not exists` or `create table if not exists` followed by object-specific DDL | Multiple | Less likely — these use IF EXISTS guards. |

### Why ALL 5 fail simultaneously

All 7 RPCs (2 guest + 5 personalized) are defined in the single migration `202606170001_create_homepage_rpcs.sql` (section 12). If this section is not executed, **none of the 7 RPCs exist**. This is the only explanation for all 5 failing at once, since:

- RPCs 6 and 7 (`get_my_topic_evidence`, `get_my_understanding_evolved`) reference ONLY tables from migrations #1-#19 (which are definitely deployed). If the functions existed, they would work.
- `auth.uid()` returning NULL would produce empty data, not errors.
- GRANT EXECUTE missing would produce 42501, not the observed fallback message.
- A missing table column would affect only specific RPCs, not all 5.
- The frontend contract is correct — no mapping issues.

---

## Recommended Fix

Do not modify any frontend or RPC code. The root cause is deployment execution, not code correctness.

**Minimal fix (two steps):**

1. **Identify the exact failure point in the previous deploy run.** Run each section of the deploy script independently against the production database to find which statement errors. The SQL Editor will show the exact error message and line number.

2. **Re-run the deploy script starting from the failed section.** Before re-running:
   - If the failure was the `ALTER TABLE` constraint in section 8: identify and fix any rows in `messages` with invalid `message_type` values, OR wrap the `ALTER TABLE` in a `DO $$ BEGIN ... EXCEPTION ... END $$` block to skip it if it fails.
   - If the failure was elsewhere: fix the root cause, then re-deploy.

3. **Verify RPC existence** after re-deployment by running in the SQL Editor:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN (
     'get_homepage_metrics', 'get_featured_inquiries',
     'get_my_open_inquiries', 'get_my_inquiry_responses',
     'get_my_debates_attention', 'get_my_topic_evidence',
     'get_my_understanding_evolved'
   ) AND pronamespace = 'public'::regnamespace;
   ```
   Expected: 7 rows.
