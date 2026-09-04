# PHASE 3C-B: EPISTEMIC CHANGE SIGNALS IMPLEMENTATION PLAN

> **Phase**: 3C-B  
> **Type**: Technical Implementation Plan (Zero Implementation in Current Turn)  
> **Status**: Ready for Review  
> **Core Objective**: Map out a precise, risk-tiered, phased engineering roadmap to activate epistemic change signals using existing data, minimal RPC extensions, and zero destructive migrations.

---

## 1. Overview & Phasing Architecture

To adhere to Discora's engineering discipline (incremental verification, zero breaking migrations, rock-solid RLS isolation), the implementation of epistemic change signals is partitioned into three discrete sub-phases:

```
+-------------------------------------------------------------------------------+
| PHASE 3C-B.1: INQUIRIES ON MY CLAIMS (Existing Data + 1 RPC)                 |
| - Objective: Surface structured inquiries opened on user-authored claims.    |
| - Migrations: 0                                                               |
| - Confidence: HIGH (Claim author is an immutable point-to-point relationship) |
+-------------------------------------------------------------------------------+
                                      ↓
+-------------------------------------------------------------------------------+
| PHASE 3C-B.2: NEW EVIDENCE ON VOTED CLAIMS (Existing Data + 1 RPC)           |
| - Objective: Surface supporting/contradicting evidence added after vote time. |
| - Migrations: 0                                                               |
| - Confidence: HIGH (Vote timestamp provides mathematical baseline)           |
+-------------------------------------------------------------------------------+
                                      ↓
+-------------------------------------------------------------------------------+
| PHASE 3C-B.3: INQUIRY RESPONSE SATISFACTION (Existing Data + 1 RPC)          |
| - Objective: Surface closure/satisfaction of inquiries user responded to.     |
| - Migrations: 0                                                               |
| - Confidence: MEDIUM-HIGH (Time-bounded window avoids stale resurfacing)      |
+-------------------------------------------------------------------------------+
```

---

## 2. Detailed Implementation Phases

### Phase 3C-B.1: Inquiries on My Claims (Signal A)

#### Objective
Enable authenticated users to see when another participant opens a Structured Inquiry targeting a claim they authored.

#### Scope of Changes
- **Backend / Database**:
  - Add 1 read-only `SECURITY DEFINER` function `get_inquiries_on_my_claims(p_limit int default 5)` in a schema update script.
  - Query: Joins `public.claims c` with `public.inquiry_items ii` and `public.rooms r` where `c.created_by = auth.uid()` and `ii.created_by != auth.uid()` and `ii.target_claim_id = c.id` and `c.retracted_at IS NULL` and `ii.retracted_at IS NULL`.
- **Frontend / Client**:
  - `src/features/inquiries/api/get-inquiries-on-my-claims.ts`: Fetcher wrapping the RPC.
  - `src/features/homepage/components/epistemic-signals-section.tsx`: Section container displaying `InquiryRaisedCard`.
  - `src/features/homepage/components/logged-in-homepage.tsx`: Integrate section above feed tabs.

#### Security & RLS Implications
- Room privacy is enforced by checking room membership or public status (`r.visibility = 'public' OR EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid())`).
- Anonymity of the claim author is preserved because the function filters by `auth.uid()` privately on the server side and never returns personal user IDs of other pseudonymous contributors.

#### Acceptance Criteria
- [ ] Claim author sees an alert card when another user opens an inquiry on their claim.
- [ ] Author does NOT see an alert card for their own inquiries on their own claims.
- [ ] Clicking card navigates directly to `/inquiries/[id]`.
- [ ] Works cleanly on mobile (375px) without horizontal clipping.

---

### Phase 3C-B.2: New Grounding on Voted Claims (Signal B)

#### Objective
Alert users when new supporting, contradicting, or contextual evidence is attached to a claim they have voted on, using their vote timestamp as the baseline.

#### Scope of Changes
- **Backend / Database**:
  - Add 1 read-only `SECURITY DEFINER` function `get_new_evidence_on_voted_claims(p_limit int default 5)`:
    ```sql
    SELECT 
      ce.id AS claim_evidence_id,
      ce.direction,
      ce.created_at AS evidence_attached_at,
      e.title AS evidence_title,
      e.url AS evidence_url,
      c.id AS claim_id,
      c.content AS claim_content,
      cv.vote_type AS user_vote_type,
      r.title AS room_title,
      r.slug AS room_slug
    FROM public.claim_votes cv
    JOIN public.claim_evidence ce ON ce.claim_id = cv.claim_id
    JOIN public.evidence e ON e.id = ce.evidence_id
    JOIN public.claims c ON c.id = cv.claim_id
    JOIN public.rooms r ON r.id = c.room_id
    WHERE cv.user_id = auth.uid()
      AND ce.created_by != auth.uid()
      AND ce.created_at > cv.created_at
      AND ce.created_at >= now() - interval '14 days'
      AND c.retracted_at IS NULL
      AND (r.visibility = 'public' OR EXISTS (
        SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = auth.uid()
      ))
    ORDER BY ce.created_at DESC
    LIMIT p_limit;
    ```
- **Frontend / Client**:
  - `src/features/evidence/api/get-new-evidence-on-voted-claims.ts`: Hook/fetcher.
  - `src/features/homepage/components/new-evidence-signal-card.tsx`: Card component highlighting the directional delta (`Contradicting Evidence Added to Claim You Supported`).

#### Security & RLS Implications
- Leverages the caller's `auth.uid()`. Votes remain confidential to the voter; no other user can query another user's votes.

#### Acceptance Criteria
- [ ] If user votes on Claim X at 10:00 AM, and Evidence Y is added at 10:15 AM, the card appears.
- [ ] If Evidence Y was added at 9:45 AM (before vote), no card appears.
- [ ] Directional banner correctly displays `Contradicts your stance` or `Supports your stance`.
- [ ] Deep-link anchors directly to `/discussions/[slug]/evidence#evidence-[id]`.

---

### Phase 3C-B.3: Inquiry Response Satisfaction (Signal C)

#### Objective
Notify responders when an inquiry they contributed to is marked as `satisfied` by the inquiry author.

#### Scope of Changes
- **Backend / Database**:
  - Add 1 read-only `SECURITY DEFINER` function `get_satisfied_inquiries_for_responder(p_limit int default 5)`:
    ```sql
    SELECT DISTINCT ON (ii.id)
      ii.id AS inquiry_id,
      ii.title AS inquiry_title,
      ii.updated_at AS satisfied_at,
      r.title AS room_title,
      r.slug AS room_slug
    FROM public.inquiry_responses ir
    JOIN public.inquiry_items ii ON ii.id = ir.inquiry_item_id
    JOIN public.rooms r ON r.id = ii.room_id
    WHERE ir.created_by = auth.uid()
      AND ii.status = 'satisfied'
      AND ii.created_by != auth.uid()
      AND ii.updated_at >= now() - interval '14 days'
      AND ii.updated_at > ir.created_at
    ORDER BY ii.id, ii.updated_at DESC
    LIMIT p_limit;
    ```
- **Frontend / Client**:
  - `src/features/inquiries/api/get-satisfied-inquiries.ts`.
  - `src/features/homepage/components/inquiry-satisfied-signal-card.tsx`.

#### Security & RLS Implications
- Verifies room visibility. Respects pseudonymity. Does not expose third-party personal details.

#### Acceptance Criteria
- [ ] When an inquiry author triggers `satisfy_inquiry()`, all participants who submitted responses see the resolution card.
- [ ] Card deep-links to `/inquiries/[id]`.
- [ ] Card does NOT display gamified points or vanity metrics.

---

## 3. Recommended Phasing & First Step

### Recommendation: Execute Phase 3C-B.1 First
1. **Highest Epistemic Urgency**: A direct inquiry on an authored claim is an immediate, explicit intellectual challenge that warrants a response.
2. **Minimal Complexity**: 1 join between `claims` and `inquiry_items`.
3. **Zero Ambiguity Around Baseline**: The event of inquiry creation is unconditionally new relative to claim creation.

---

## 4. Verification & Testing Protocol (For Future Implementation)

When approved for implementation in subsequent phases:
1. **Database Unit Tests**: Verify that `get_inquiries_on_my_claims` returns empty when called by non-authors, returns correct records when inquiries are created by peers, and omits self-inquiries.
2. **Type Safety**: Generate TypeScript database types from the new RPC signatures.
3. **Component Tests**: Verify empty state rendering, loading skeletons, and multi-inquiry bundling.
4. **Browser E2E Verification**:
   - Log in as Contributor A, create Claim.
   - Log in as Contributor B, open Structured Inquiry on Claim.
   - Return as Contributor A, verify Epistemic Signal Card on homepage and deep-link navigation to `/inquiries/[id]`.
