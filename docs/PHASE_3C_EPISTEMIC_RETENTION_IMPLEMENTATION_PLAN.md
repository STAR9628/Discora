# PHASE 3C: EPISTEMIC RETENTION / UNDERSTANDING MOMENTUM IMPLEMENTATION PLAN

**Status**: IMPLEMENTATION PLAN ONLY — NO SOURCE CODE MODIFIED  
**Date**: September 2026  
**Context**: Companion to `docs/PHASE_3C_EPISTEMIC_RETENTION_AUDIT.md` and `docs/PHASE_3C_EPISTEMIC_RETENTION_REDESIGN.md`.  
**Strategy**: Progressive disclosure and incremental delivery. Prefer existing-data improvements first before introducing new queries or schema additions.

---

## Phased Roadmap Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3C-A: Zero-Migration Epistemic Fixes                             │
│ - Fix deep-linking to /inquiries/[id] on homepage cards                │
│ - Elevate personal epistemic updates above general feeds on homepage   │
│ - Fix "Consensus shifted" copy bug (replace with neutral real ratio)   │
│ - Provide constructive empty states instead of blank null-renders      │
│ Database Changes: ZERO | Migrations: ZERO | RPC Changes: ZERO          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3C-B: Direct Epistemic Obligations                               │
│ - Add RPC get_inquiries_on_my_claims() (target claim author loop)      │
│ - Add RPC get_my_satisfied_responses() (responder feedback loop)      │
│ - Fix get_my_topic_evidence to surface evidence in participated rooms  │
│ Database Changes: ZERO (App-only / append RPCs) | Migrations: 1 (RPCs) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3C-C: Deep Understanding Evolution & Follow Mechanisim           │
│ - Temporal consensus shift calculation (7-day delta or vote snapshot)  │
│ - Room/Topic bookmark/follow primitive for non-contributing readers    │
│ Database Changes: Optional table | Migrations: 1                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 3C-A: Smallest Existing-Data-Only Return Loop (Recommended First Step)

### 1. Objective
Fix existing broken return loops, eliminate context loss, fix misleading copy, and surface personal momentum immediately using **only the data and RPCs that already exist today**.

### 2. Exact Files Affected
- `src/features/homepage/components/logged-in-homepage.tsx`
  - Reorder sections: Move `<PersonalizedUpdates />` directly beneath `<WelcomeBar />` / `<FirstUserBanner />` when items exist.
  - Update `MyInquiryResponses` link from `/discussions/${r.roomSlug}` to `/inquiries/${r.inquiryId}`.
  - Update `MyOpenInquiries` link from `/discussions/${inquiry.roomSlug}` to `/inquiries/${inquiry.id}`.
  - In `getConsensusInsight`, replace phantom `"Consensus shifted..."` text with accurate, neutral descriptive copy:
    - If `>= 60%`: `"Current consensus aligns with your position ({ratio}% agree)"`
    - If `<= 40%`: `"Current consensus challenges your position ({ratio}% agree)"`
    - If `41% - 59%`: `"Discussion remains evenly divided ({ratio}% agree)"`
  - Add meaningful empty states in place of returning `null` when a user has no inquiries or understanding items.

### 3. Existing Data Reused
- Existing `get_my_open_inquiries` RPC.
- Existing `get_my_inquiry_responses` RPC.
- Existing `get_my_debates_attention` RPC.
- Existing `get_my_understanding_evolved` RPC.
- Existing `/inquiries/[id]` standalone page.

### 4. New Data Required
- **None**.

### 5. Backend Changes / Migrations
- **None**. (0 migrations, 0 RPC modifications).

### 6. Acceptance Criteria
- [ ] Clicking any card in "Responses to My Inquiries" takes the user directly to `/inquiries/[id]`.
- [ ] Debate-based inquiries no longer attempt to open under `/discussions/...`.
- [ ] When returning to the logged-in homepage, users with active inquiries or voted claims see their personal updates near the top.
- [ ] "My Understanding Evolved" cards never claim a "shift" occurred without evidence; displays honest current consensus percentage.
- [ ] When personal items are empty, users see an educational prompt explaining how to follow understanding by voting or asking inquiries, rather than an empty blank space.

### 7. QA Requirements
- TypeScript: `npx tsc --noEmit` clean.
- Lint: `npm run lint` clean.
- Production build: `npm run build` passes.
- Responsive QA: Verify 1440px desktop and 375px mobile layouts.

### 8. Rollback Risk
- **Minimal / Zero risk**: 100% frontend layout and link destination update.

---

## PHASE 3C-B: Direct Epistemic Obligations (Backend Extensions)

### 1. Objective
Close the critical missing loop where claim authors are notified that someone has challenged their claim with an inquiry, and responders are notified when their answers satisfy an inquiry.

### 2. Exact Files Affected
- `supabase/migrations/<timestamp>_add_epistemic_inquiry_rpcs.sql`:
  - Create `get_inquiries_on_my_claims()` RPC:
    ```sql
    select array(
      select json_build_object(
        'inquiry_id', ii.id,
        'inquiry_content', ii.content,
        'inquiry_type', ii.inquiry_type,
        'room_id', ii.room_id,
        'room_slug', r.slug,
        'room_title', r.title,
        'claim_id', c.id,
        'claim_content', c.content,
        'inquirer_username', p.username,
        'created_at', ii.created_at
      )
      from inquiry_items ii
      join claims c on c.id = ii.target_claim_id
      join rooms r on r.id = ii.room_id
      left join profiles p on p.id = ii.created_by
      where c.created_by = auth.uid()
        and ii.created_by != auth.uid()
        and ii.status in ('open', 'unsatisfied')
      order by ii.created_at desc
      limit 10
    );
    ```
  - Create `get_my_satisfied_responses()` RPC:
    ```sql
    select array(
      select json_build_object(
        'inquiry_id', ii.id,
        'inquiry_content', ii.content,
        'room_slug', r.slug,
        'satisfied_at', ii.updated_at
      )
      from inquiry_responses ir
      join inquiry_items ii on ii.id = ir.inquiry_item_id
      join rooms r on r.id = ii.room_id
      where ir.created_by = auth.uid()
        and ii.status = 'satisfied'
      order by ii.updated_at desc
      limit 5
    );
    ```
- `src/features/homepage/services/homepage-personal-service.ts`:
  - Add `getInquiriesOnMyClaims()` and `getMySatisfiedResponses()` client callers.
- `src/features/homepage/hooks/use-homepage.ts`:
  - Add query hooks `useInquiriesOnMyClaims()` and `useMySatisfiedResponses()`.
- `src/features/homepage/components/logged-in-homepage.tsx`:
  - Add `<InquiriesOnMyClaims />` card list under personal updates.

### 3. Existing Data Reused
- `inquiry_items`, `inquiry_responses`, `claims`, `rooms`, `profiles`.

### 4. New Data Required
- **None**: Reuses existing relationships and foreign keys already in Postgres.

### 5. Backend Changes / Migrations
- 1 migration creating 2 read-only `SECURITY DEFINER` RPCs. No table alters.

### 6. Acceptance Criteria
- [ ] Claim authors see a card on their homepage when a structured inquiry is opened on their claim.
- [ ] Clicking the card opens `/inquiries/[id]` so the author can provide clarification or evidence.
- [ ] Users who answered an inquiry see when their response was marked "Satisfied".

### 7. Rollback Risk
- **Low**: Append-only RPCs. Does not impact room reads or existing queries.

---

## PHASE 3C-C: Deep Understanding Evolution & Epistemic Bookmarking

### 1. Objective
Provide real temporal consensus tracking (e.g. 7-day movement) and allow readers who have not yet written contributions to follow discussions.

### 2. Candidate Architectures
1. **Option A (No Schema Change - Temporal Query)**:
   - Compute consensus shift dynamically by querying `claim_votes` cast in the last 7 days vs previous total.
   - Pros: Zero schema changes.
   - Cons: Slightly heavier query for high-vote claims.
2. **Option B (Epistemic Bookmark / Follow Room)**:
   - Add a lightweight `room_follows` table (`user_id`, `room_id`, `created_at`).
   - Adds a "Follow for Updates" button on `RoomSectionShell`.
   - Populates homepage with new evidence and inquiry updates from followed rooms.

### 3. When to Proceed
- Only pursue Phase 3C-C after Phase 3C-A and 3C-B are deployed and validated in production.

---

## Recommended Sequence & Next Steps

1. **Review & Sign Off on Audit**: Review `PHASE_3C_EPISTEMIC_RETENTION_AUDIT.md`.
2. **Review & Sign Off on Redesign**: Review `PHASE_3C_EPISTEMIC_RETENTION_REDESIGN.md`.
3. **Approve Phase 3C-A Scope**: Execute the surgical zero-migration frontend improvements in Phase 3C-A.
