# PHASE 3C-B: EPISTEMIC CHANGE SIGNALS AUDIT

**Status**: AUDIT COMPLETE — SOURCE CODE UNTOUCHED  
**Date**: September 2026  
**Context**: Post-Phase 3C-A (commit `d376b5b`). Investigation of high-value epistemic change signals.  
**Constraint**: Audit and design only. Zero application code changes, zero migrations, zero RPC changes.

---

## 1. Executive Summary

Phase 3C-A resolved foundational return-loop layout, link routing, and honest labeling. Phase 3C-B investigates the next frontier of epistemic retention: **can Discora reliably detect and surface when something meaningful changes on an inquiry, claim, or debate that a user cares about?**

The guiding philosophical model is:
```
USER CARES ABOUT AN ENTITY (Claim, Inquiry, Debate)
                  ↓
A MEANINGFUL EPISTEMIC EVENT OCCURS (Challenge, Evidence, Resolution)
                  ↓
DISCORA PROVES THE CHANGE FROM VERIFIABLE DATA
                  ↓
USER UNDERSTANDS WHY IT MATTERS (Epistemic Context)
                  ↓
USER RETURNS TO THE EXACT CONTEXT
```

### Key Audit Conclusions:
1. **Signal A (Inquiries on My Claims) is the Strongest Missing Signal**:
   - The data model (`claims.created_by`, `inquiry_items.target_claim_id`, `inquiry_items.created_by`) fully connects the relationship.
   - It represents the highest-value epistemic obligation in the platform: *someone has challenged a premise or requested evidence on a claim I authored*.
   - It is currently completely invisible to the claim author.
2. **Signal B (New Evidence on Voted Claims) Has a Verifiable Baseline**:
   - For voted claims, `claim_votes.created_at` provides a mathematically sound baseline ($T_{\text{vote}}$). Any `claim_evidence.created_at > T_{\text{vote}}$ represents empirical grounding attached *after* the user took a stance.
   - Furthermore, `claim_evidence.direction` ('support', 'contradict', 'context') allows Discora to indicate whether new evidence supports or challenges the user's vote.
3. **Signal C (Inquiry Response Satisfaction) is Coarse-Grained**:
   - `inquiry_items.status = 'satisfied'` proves an inquiry was resolved.
   - However, `satisfy_inquiry` acts on the *inquiry item*, not individual responses. If multiple users answered, satisfaction belongs to the inquiry as a whole.
   - It is queryable for responders, but lacks a "dismissed/seen" baseline, meaning a time-window filter (e.g. past 7 days) is necessary to avoid permanent stale updates.

---

## 2. Current Architecture & Context

As of commit `d376b5b`, Discora has:
- **Client Homepage**: Consumes 5 personal RPCs (`get_my_open_inquiries`, `get_my_inquiry_responses`, `get_my_debates_attention`, `get_my_topic_evidence`, `get_my_understanding_evolved`).
- **Inquiry Infrastructure**: Fully functional `inquiry_items` and `inquiry_responses` tables with typed inquiries (`clarification`, `evidence_request`, `assumption_check`) and standalone route `/inquiries/[id]`.
- **Voting Infrastructure**: `claim_votes` table with `vote_type in ('agree', 'disagree')` and `created_at`.
- **Evidence Linking**: `claim_evidence` junction table with `direction in ('support', 'contradict', 'context')` and `created_at`.

---

## 3. Signal A — Inquiries on My Claims

### Investigation: "When another user opens a Structured Inquiry against a claim that I authored, can Discora currently tell me?"

#### Trace of Data Model:
- `claims`: `id (uuid)`, `room_id (uuid)`, `created_by (uuid)`, `content (text)`, `identity_mode (text)`, `is_retracted (boolean)`.
- `inquiry_items`: `id (uuid)`, `room_id (uuid)`, `created_by (uuid)`, `target_claim_id (uuid)`, `inquiry_type (text)`, `content (text)`, `status (text)`, `created_at (timestamptz)`.
- `rooms`: `id (uuid)`, `title (text)`, `slug (text)`, `visibility (text)`, `status (text)`.

#### Evaluation Criteria:
- **A. Can the relationship be queried safely?**
  - **FACT**: Yes. A query joining `inquiry_items ii` with `claims c ON c.id = ii.target_claim_id` where `c.created_by = auth.uid()` safely identifies inquiries targeting the user's claims.
- **B. Can the claim author be identified securely?**
  - **FACT**: Yes. `c.created_by` in `public.claims` holds the authenticated user's UUID.
- **C. Can the system distinguish self-inquiries vs others?**
  - **FACT**: Yes. Filtering `WHERE ii.created_by != auth.uid()` excludes inquiries the user opened on their own claims.
- **D. Can it distinguish status transitions?**
  - **FACT**: Yes. `inquiry_items.status` tracks `'open'`, `'responded'`, `'satisfied'`, `'unsatisfied'`, `'closed'`. Active challenges requiring author attention are `'open'` or `'unsatisfied'`.
- **E. Can the UI provide enough context?**
  - **FACT**: Yes. `ii.content`, `ii.inquiry_type`, `c.content` (the target claim text), and `r.title` provide complete epistemic context.
- **F. What happens if the claim is anonymous?**
  - **FACT**: In `public.claims`, `created_by` is always the user's UUID regardless of `identity_mode`.
  - **FACT**: In the public view `discussion_claims`, `created_by` is redacted to `null`.
  - **CONCLUSION**: The personalized query (running for `auth.uid()`) can safely find the claim author without exposing their identity to any other user. The author sees: *"Structured inquiry opened on your claim"* without unmasking their identity to the room.
- **G. What happens if the room is private or unlisted?**
  - **FACT**: The query must enforce room visibility: `(r.visibility = 'public' AND r.status <> 'archived') OR r.created_by = auth.uid()`.
- **H. What happens if the claim is retracted?**
  - **FACT**: Must filter `c.is_retracted = false`. Retracted claims should not surface new inquiry alerts.
- **I. What happens if the inquiry author is anonymous?**
  - **FACT**: `inquiry_items` does not currently feature an `identity_mode` column. However, displaying the inquirer's username should fall back to `"Participant"` if null.
- **J. Would exposing the inquiry reveal private information?**
  - **FACT**: No. Inquiries on public claims are already public within the room. Surfacing them to the claim author merely closes an awareness gap.

---

## 4. Signal B — New Evidence on Claims I Care About

### Investigation: "When new evidence is attached to a claim that I authored or voted on, can Discora currently tell me?"

#### Trace of Data Model:
- `evidence`: `id`, `source_id`, `created_by`, `content`, `evidence_type`, `is_retracted`, `created_at`.
- `claim_evidence`: `claim_id`, `evidence_id`, `direction ('support', 'contradict', 'context')`, `created_by`, `created_at`.
- `claim_votes`: `user_id`, `claim_id`, `vote_type ('agree', 'disagree')`, `created_at`, `updated_at`.
- `claims`: `id`, `room_id`, `created_by`, `content`, `created_at`, `is_retracted`.

#### User Relationships Established:
1. **User authored the claim**: `claims.created_by = auth.uid()`.
   - **Baseline Available?**: `claims.created_at` records when the claim was posted. Any `claim_evidence.created_at > claims.created_at` is evidence added after creation.
   - **Limitation**: If the author visited the room multiple times, we do not know if they already saw the evidence. A sliding window (e.g. last 7 days) is required.
2. **User voted on the claim**: `claim_votes.user_id = auth.uid()`.
   - **Baseline Available?**: `claim_votes.created_at` records the exact moment the user voted ($T_{\text{vote}}$).
   - **FACT**: Any `claim_evidence.created_at > claim_votes.created_at` is verifiably **new evidence added after the user cast their vote**.
   - **EPISTEMIC POWER**: We can determine whether the new evidence aligns with or challenges their vote:
     - User voted `'agree'` + evidence direction `'contradict'` → **Counter-grounding challenge**.
     - User voted `'agree'` + evidence direction `'support'` → **Corroborating grounding**.
     - User voted `'disagree'` + evidence direction `'support'` → **Challenging grounding**.
3. **User only viewed the room**:
   - **FACT**: **ZERO DATA**. Discora does not log pageviews or reading history.

#### Ranking by Epistemic Value & Noise:
1. **Highest Value / Lowest Noise**: New evidence contradicting a claim the user authored or agreed with (`direction = 'contradict'`).
2. **High Value / Low Noise**: New evidence supporting a claim the user challenged (`vote = 'disagree'`, `direction = 'support'`).
3. **Medium Value**: Corroborating evidence on voted claims.
4. **Low Value / High Noise**: Generic evidence in other rooms in the same topic (the flawed `get_my_topic_evidence` logic).

---

## 5. Signal C — Inquiry Response Satisfaction

### Investigation: "I responded to someone's Structured Inquiry. They later marked it satisfied. Can I currently know?"

#### Trace of Data Model:
- `inquiry_responses`: `id`, `inquiry_item_id`, `created_by`, `content`, `created_at`.
- `inquiry_items`: `id`, `content`, `status ('open', 'responded', 'satisfied', 'unsatisfied', 'closed')`, `updated_at`.
- `satisfy_inquiry`: Updates `inquiry_items.status = 'satisfied'` and `updated_at = now()`.

#### Evaluation Criteria:
- **A. Can the responder be identified?**
  - **FACT**: Yes. `inquiry_responses.created_by = auth.uid()`.
- **B. Can the system identify the exact response that contributed to satisfaction?**
  - **FACT**: No. `satisfy_inquiry(p_inquiry_item_id)` operates at the inquiry item level. Satisfaction applies to the entire inquiry dialogue. If multiple users responded, all responses are associated with the satisfied inquiry.
- **C. Can it distinguish statuses?**
  - **FACT**: Yes. `ii.status = 'satisfied'`.
- **D. Can the responder safely see the satisfaction event?**
  - **FACT**: Yes. Querying inquiries where `ir.created_by = auth.uid()` and `ii.status = 'satisfied'`.
- **E. What information should be shown?**
  - Room title, inquiry content, and notification that the inquiry was resolved and satisfied.
- **F. Epistemic Framing**:
  - Must avoid social "likes" framing.
  - Correct copy: *"An inquiry you answered has been marked satisfied."*

---

## 6. Change vs Current-State Analysis

| Candidate Signal | Proves Change or Current State? | Underlying Mechanism | Requires Stored Baseline? | Confidence Tier |
| :--- | :--- | :--- | :--- | :--- |
| **A. Inquiries on My Claims** | **Current State** (Active Open Challenges) | `ii.status in ('open', 'unsatisfied')` on user's claims | **No** (any open challenge on my claim is an unresolved obligation) | **HIGH CONFIDENCE** |
| **B1. New Evidence on Voted Claims** | **True Change Event** | `ce.created_at > cv.created_at` | **Already has baseline** (`claim_votes.created_at`) | **HIGH CONFIDENCE** |
| **B2. New Evidence on Authored Claims** | **Relative Change Event** | `ce.created_at > c.created_at` (scoped to last 7 days) | Requires time window to avoid perpetual alert | **MEDIUM CONFIDENCE** |
| **C. Inquiry Response Satisfaction** | **State Transition** | `ii.status = 'satisfied'` where `ir.created_by = auth.uid()` | Requires time window (e.g. `ii.updated_at >= now() - 7d`) | **MEDIUM CONFIDENCE** |

---

## 7. Privacy & Identity Audit

- **Anonymity Policy**:
  - If Claim C was created with `identity_mode = 'anonymous'`, the author's identity must NEVER be displayed publicly.
  - When returning Signal A to the author, the query runs securely for `auth.uid()`. The author sees their own anonymous claim, but public room participants still see `"Anonymous"`.
  - If an inquiry response was posted anonymously, responder username is rendered as `"Anonymous"`.
- **Room Visibility**:
  - If a discussion room is private or archived, all personalized queries MUST exclude it unless the user is the room creator or participant.

---

## 8. Noise & Bundling Analysis

Emitting an individual alert for every single vote or evidence addition creates notification fatigue. Discora must use **epistemic bundling**:

1. **Inquiries Bundling**:
   - Multiple open inquiries on the same claim should be bundled:  
     *"2 open inquiries on claim: 'Should AI content be watermarked?'"*
2. **Evidence Bundling**:
   - Multiple evidence items on a voted claim should be bundled by direction:  
     *"2 counter-evidence items added to claim you supported"*
3. **Thresholding**:
   - Do not notify on evidence that was subsequently retracted (`is_retracted = false`).

---

## 9. Return Destination Analysis

| Signal | Ideal Destination | Preserves Context? |
| :--- | :--- | :--- |
| **Inquiry on My Claim** | `/inquiries/[id]` | **YES** (standalone inquiry page shows target claim, prompt, and response input) |
| **New Evidence on Voted Claim** | `/discussions/[slug]/claims#claim-[id]` or `/debates/[slug]/arguments#claim-[id]` | **YES** (anchors directly to the claim with evidence tray) |
| **Inquiry Response Satisfied** | `/inquiries/[id]` | **YES** (shows green satisfied banner and resolution note) |

---

## 10. Existing-Data Capability Matrix

| Signal | Can Be Implemented with Zero Schema Changes? | Requires New RPC? | Requires New Table? | Implementation Classification |
| :--- | :--- | :--- | :--- | :--- |
| **A. Inquiries on My Claims** | **YES** | YES (`get_inquiries_on_my_claims`) | **NO** | **B: Existing Data + Append-only RPC** |
| **B. New Evidence on Voted Claims** | **YES** | YES (`get_my_voted_claims_evidence`) | **NO** | **B: Existing Data + Append-only RPC** |
| **C. Response Satisfaction** | **YES** | YES (`get_my_satisfied_inquiries`) | **NO** | **B: Existing Data + Append-only RPC** |

---

## 11. Missing Data / Baselines Summary

1. **"Last Seen" Timestamp**: There is no per-user entity read timestamp. Therefore, signals that do not have an immutable prior timestamp (like `claim_votes.created_at`) must rely on bounded time windows (e.g. `created_at >= now() - interval '7 days'`).
2. **Individual Response Satisfaction Tracking**: Satisfaction is recorded on `inquiry_items`, not `inquiry_responses`. All responders share the satisfaction state of the inquiry.

---

## 12. Risk Assessment

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| **Leaking Anonymous Claim Authors** | Critical | Query using `SECURITY DEFINER` with strict `c.created_by = auth.uid()` filter; never expose the user ID outside the authenticated session. |
| **Overwhelming Users with Evidence Alerts** | Medium | Limit to claims where user actually cast a vote; bundle multiple evidence items into a single card per claim. |
| **Stale Satisfaction Cards** | Low | Filter satisfaction updates to items satisfied in the past 7 days (`ii.updated_at >= now() - interval '7 days'`). |

---

## 13. Prioritized Findings

1. **P0: Implement Signal A (Inquiries on My Claims)**: Closes the critical gap where claim authors are deaf to structured challenges on their propositions.
2. **P1: Implement Signal B (New Evidence on Voted Claims)**: Provides mathematically provable evidence changes using `claim_votes.created_at` as the baseline.
3. **P2: Implement Signal C (Inquiry Response Satisfaction)**: Closes the inquiry loop for responders with a 7-day freshness window.

---

## 14. Exact Source References

- `claims`: `supabase/migrations/202606030004_create_claims.sql` lines 1-50.
- `claim_votes`: `supabase/migrations/202606030006_sprint_6_corrections_and_voting.sql` lines 153-161.
- `claim_evidence`: `supabase/migrations/202606030005_create_evidence.sql` lines 32-39.
- `inquiry_items` & `inquiry_responses`: `supabase/migrations/202606120001_create_inquiry_tables.sql` lines 5-44.
- `satisfy_inquiry`: `supabase/migrations/202606120001_create_inquiry_tables.sql` lines 242-289.
- `discussion_claims` view: `supabase/migrations/202606080001_restore_discussion_views.sql` lines 7-38.
