# PHASE 3C-B.3: INQUIRY RESPONSE SATISFACTION REDESIGN

**Status**: DESIGN COMPLETE — HELD FOR FUTURE MIGRATION  
**Date**: September 2026  
**Parent Strategy**: Epistemic Change Signals (Phase 3C-B)  
**Constraint**: Design and architecture contract only. Zero application source code modifications.

---

## 1. Product Goal

In Discora, Structured Inquiries are intellectual checkpoints: clarification requests, evidence demands, or assumption examinations opened against claims.

When a contributor invests the intellectual effort to construct a rigorous response, they close an open question. When the inquirer confirms that the challenge has been resolved by marking it **Satisfied**, the dialogue reaches epistemic closure.

The goal of this redesign is:
> *Close the feedback loop for contributors who answer inquiries, notifying them when their contribution successfully resolves an open intellectual challenge, without gamification, vanity metrics, or notification spam.*

---

## 2. Signal Definition

### The Grounded Concept:
**"Your response resolved an open inquiry."**

- **Target Audience**: Contributors who authored an `inquiry_response` on an `inquiry_item`.
- **Trigger Event**: The inquiry author executes `satisfy_inquiry`, transitioning `inquiry_items.status` from `'responded'` to `'satisfied'`.
- **Attribution**: The signal must cleanly attribute satisfaction to the **specific response** that resolved the issue, rather than falsely broadcasting resolution to every incidental responder.

---

## 3. What Counts as a Meaningful Update vs What Does Not Count

### What Counts:
1. **Targeted Resolution**: An inquiry you answered is marked **Satisfied**, with your response specifically identified as the satisfying argument.
2. **First-Time Observation**: The satisfaction occurred recently and represents fresh closure.

### What Does NOT Count:
1. **Self-Action**: An inquirer marking their own inquiry satisfied (circular redundancy).
2. **Coarse Thread Broadcasts**: Notifying a user that an inquiry was satisfied when *another* contributor's response provided the actual answer.
3. **Repeated State Flapping**: Repeatedly notifying users when an inquiry cycles through unsatisfied/responded/closed.
4. **General Closure / Abandonment**: Inquiries closed without satisfaction (`status = 'closed'`).
5. **Retracted or Moderated Content**: Any inquiry attached to a retracted claim or hidden by moderation flags.

---

## 4. User-Facing Wording & Tone

Discora strictly prohibits gamification framing (*"You earned +2 reputation!"*, *"Your answer was accepted!"*, *"Winner!"*). Language must remain calm, objective, and epistemic:

- **Badge Label**: `Resolved Inquiry` (or `Inquiry Satisfied`)
- **Card Headline**: *"A response you provided resolved an open inquiry"*
- **Supporting Context**:
  - *"On claim: '[Target Claim Content]' in [Room Title]"*
  - Quote snippet of the user's satisfying response
  - Author attribution: *"Marked satisfied by [Inquirer Username]"*
  - Timestamp: Relative time of satisfaction (e.g., *"2d ago"*)
- **Action CTA**: `Review Resolution →`

Forbidden terms: `alert`, `notification`, `accepted answer`, `points`, `winner`, `trophy`, `upvote`, `correct`.

---

## 5. Homepage Placement & Visual Hierarchy

Within the authenticated homepage section **"Your Inquiries & Understanding"**, signals must be ordered strictly by epistemic urgency:

1. **Inquiries on Your Claims** (Phase 3C-B.1) — *Highest urgency*: Active challenge against the user's premise.
2. **New Evidence on Claims You Evaluated** (Phase 3C-B.2) — *High urgency*: Empirical data challenging or supporting an established stance.
3. **Responses to My Inquiries** (Phase 3C-A) — *Actionable obligation*: Inquirer has unreviewed community responses waiting.
4. **Resolved Inquiries** (Phase 3C-B.3 — Proposed) — *Epistemic closure*: Feedback confirming a contribution resolved a challenge.
5. **My Open Inquiries** (Phase 3C-A) — *Passive monitoring*: Inquiries awaiting community responses.
6. **My Understanding Evolved** (Phase 3C-A) — *Reflective monitoring*: Group consensus development.
7. **Debates Needing Attention** (Phase 3C-A) — *Participation monitoring*: Balanced side contributions.

---

## 6. CTA & Deep-Link Destination

- **Destination**: `/inquiries/[id]`
- **Anchor**: `/inquiries/[id]#response-[response_id]`
- **Experience**:
  - Directs user to the standalone inquiry detail page.
  - Highlights the parent claim, the original inquiry prompt, and the user's satisfying response with a quiet green border or badge indicating it resolved the inquiry.
  - Maintains navigation breadcrumbs back to the parent room (`/discussions/[slug]` or `/debates/[slug]`).

---

## 7. Edge Case & Failure Behaviors

1. **Multiple Responders**:
   - Only the responder whose answer is recorded as `satisfied_response_id` receives the resolved inquiry signal.
   - If an inquirer wishes to acknowledge multiple answers, future iterations may support multi-response attribution; in v1, only direct attribution is valid.
2. **Empty State**:
   - If a user has zero resolved inquiries, the section is completely hidden. It never renders empty boxes or clutter.
3. **Retracted Parent Claim**:
   - If the claim is retracted (`c.is_retracted = true`), the signal is excluded from the query.
4. **Private or Archived Rooms**:
   - Strict adherence to room RLS: `(r.visibility = 'public' AND r.status <> 'archived') OR r.created_by = auth.uid()`.
5. **Anonymous Authorship**:
   - If the inquirer or responder operated under anonymous mode, usernames fall back to `"Anonymous"` or `"Contributor"`.

---

## 8. Technical Architecture & RPC Contract

### Why a Schema Migration is Required:
As proven in the Phase 3C-B.3 Audit, the current schema stores:
- No `satisfied_response_id` on `inquiry_items`.
- No `satisfied_at` timestamp on `inquiry_items`.
- No response-level satisfaction flag on `inquiry_responses`.

Attempting to implement this signal without a migration forces an approximation based on `inquiry_items.status = 'satisfied' AND inquiry_responses.created_by = auth.uid()`. This approximation:
- Falsely credits every responder in a thread.
- Has no baseline to retire viewed cards, causing zombie alerts.

### Proposed Target RPC Contract (Post-Migration):

```sql
create or replace function public.get_my_resolved_inquiries(p_limit int default 5)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select coalesce(
  array(
    select json_build_object(
      'inquiry_id', ii.id,
      'inquiry_content', ii.content,
      'inquiry_type', ii.inquiry_type,
      'satisfied_at', ii.satisfied_at,
      'response_id', ir.id,
      'response_content', ir.content,
      'target_claim_id', c.id,
      'target_claim_content', c.content,
      'room_id', r.id,
      'room_title', r.title,
      'room_slug', r.slug,
      'room_type', r.room_type,
      'inquirer_username', coalesce(p.username, 'Contributor'),
      'inquirer_avatar_url', p.avatar_url
    )
    from inquiry_items ii
    join inquiry_responses ir on ir.id = ii.satisfied_response_id
    join claims c on c.id = ii.target_claim_id
    join rooms r on r.id = ii.room_id
    left join profiles p on p.id = ii.created_by
    where ir.created_by = auth.uid()
      and ii.status = 'satisfied'
      and ii.satisfied_at >= now() - interval '14 days'
      and c.is_retracted = false
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
      )
      and not exists (
        select 1 from moderation_flags mf
        where mf.claim_id = c.id and mf.status = 'resolved_hidden'
      )
    order by ii.satisfied_at desc
    limit least(greatest(coalesce(p_limit, 5), 1), 20)
  ),
  '{}'::json[]
);
$$;
```

---

## 9. Minimal Future Data Requirements

To support the above contract, the future additive migration must:
1. Add columns to `public.inquiry_items`:
   - `satisfied_response_id uuid references public.inquiry_responses(id) on delete set null`
   - `satisfied_at timestamptz`
2. Update `public.satisfy_inquiry` signature or implementation:
   - Accept optional `p_response_id uuid default null`.
   - Set `satisfied_response_id = p_response_id`, `satisfied_at = now()`.

---

## 10. Summary

Phase 3C-B.3 represents a high-value epistemic loop closure, but its integrity depends strictly on **response-level attribution**. Implementing it now without data-model grounding would degrade Discora's signal quality. It is formally redesigned and ready for implementation the moment the prerequisite schema update is scheduled.
