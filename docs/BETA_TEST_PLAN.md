# Beta Test Plan — Inquiry Behavioral Validation

**Goal**: Determine whether Inquiry changes user behavior.
**Not**: Whether Inquiry works technically (already validated).

---

## Phase 1: 10 Users

### Duration
7 days.

### Cohort
Invite-only. 10 users selected for:
- Mix of debate styles (aggressive, passive, curious)
- At least 4 users who have never created a claim
- At least 2 users who have only commented, never structured-argued

### Goal
Discoverability. Can users find and use Inquiry without being told?

### Success Criteria (must pass 3 of 4)

| Criterion | Threshold | Why |
|-----------|-----------|-----|
| Inquiry button clicked by ≥8 users | 80% discovery rate | If users don't find the button, positioning or labeling is wrong |
| ≥1 inquiry created by ≥5 different users | Feature is not ignored | Creation validates the entry point works |
| ≥1 inquiry has a response within 24 hours | Someone answers | If no one answers, the interaction model is broken |
| ≥1 user says "I didn't know that button existed" in feedback | Design failure detectable early | Early signal that the button needs to be more visible |

### Failure Criteria (if any 1 triggers)

| Criterion | What It Means |
|-----------|---------------|
| 0 inquiries created in 7 days | Feature is invisible. Redesign entry point. |
| 3+ users report not noticing the button | Visual hierarchy wrong. Relocate or restyle. |
| Any inquiry used as a personal attack | Moderation escalation path missing. Pause beta. |

### Observation Points

- Time from account creation to first inquiry click
- Which inquiry type is chosen first (clarification vs evidence_request vs assumption_check)
- Whether users expand the inquiry to see responses
- Ratio of InquiryButton clicks to actual inquiry submissions (abandonment rate)
- Whether users close the InquiryCreateDialog without submitting
- Do users scroll past the InquiryButton without pausing? (session replay if available)

### No Changes Allowed During Phase 1

Do not modify the feature. Do not add tooltips. Do not send announcements.
The goal is to observe natural discovery. Any change resets the clock.

---

## Phase 2: 25 Users

### Duration
14 days.

### Cohort
Phase 1 users (retained) + 15 new users.
New users include:
- At least 5 users who primarily challenge claims
- At least 5 users who primarily support claims
- At least 5 users who have never participated in a structured debate

### Goal
Adoption patterns. Do users integrate Inquiry into their debate workflow?

### Success Criteria (must pass 4 of 6)

| Criterion | Threshold | Why |
|-----------|-----------|-----|
| ≥15 unique inquirers | 60% adoption rate | Feature is seen as useful by majority |
| ≥50% of inquiries receive a response | Not ghosting | Responders find inquiries worth answering |
| ≥1 inquiry reaches `satisfied` state | Loop completion | The full flow is exercised naturally |
| Mean response time < 48 hours | Engagement is timely | If responses take weeks, the feature feels abandoned |
| ≥20% of inquiries are cross-side | Truth-seeking behavior | Support inquiries on Challenge claims (or vice versa) |
| ≥1 user creates a follow-up inquiry on the same claim | Deep engagement | Users are drilling into a claim, not surface-skimming |

### Failure Criteria (if any 2 trigger)

| Criterion | What It Means |
|-----------|---------------|
| <30% of inquiries receive any response | Responder motivation problem. Inquiries feel like a black hole. |
| 0 inquiries reach `satisfied` | No one is completing the loop. Satisfaction UX may be invisible or useless. |
| ≥3 reports that the inquiry dialog feels like "too much friction" | Form overhead is killing intent. Consider simplifying. |
| All inquiries are `clarification` type | Users don't understand the type selector or don't see value in distinguishing types. |
| Inquiry used to bypass claim creation rules | Users are asking evidence_request instead of creating evidence. Rule confusion. |

### Observation Points

- Distribution of inquiry types (clarification vs evidence_request vs assumption_check)
- Time-of-day patterns (are inquiries created during or after debate sessions?)
- Do users respond to inquiries on the same day or batch them later?
- How many responses before an inquiry reaches satisfied/closed?
- How many inquiries per claim (is there a pile-on effect?)
- Do claim authors respond to inquiries on their own claims?
- What percentage of inquiries are on claims the inquirer voted on?
- Do side switching events correlate with inquiry activity (time-delayed)?
- Do specific users emerge as "answerers" (disproportionate response share)?
- Session depth: do users who create inquiries stay in the room longer than those who don't?

### Mid-Phase Adjustment Permitted

After day 7, if:
- <20% of inquiries have responses → send a single announcement: "Try answering a question on a claim you voted on"
- 0 inquiries created in days 4-7 → add a tooltip to the InquiryButton: "Ask a question about this claim"

Document all adjustments and why.

---

## Phase 3: 50 Users

### Duration
21 days.

### Cohort
Phases 1+2 users (retained) + 25 new users, at least 10 of whom have never used the platform before.

### Goal
Behavioral change. Does Inquiry change how users engage with claims?

### Success Criteria (must pass 5 of 8)

| Criterion | Threshold | Why |
|-----------|-----------|-----|
| ≥60% of inquiries reach `responded` or beyond | Completion culture forming | Not ghosting at scale |
| ≥15% of inquiries reach `satisfied` | Users finding answers | The loop is closing for a meaningful subset |
| ≥1 claim revised (content change + citation: "per inquiry") | Structural impact | Inquiry led to argument improvement |
| ≥1 user switches side after an inquiry exchange | Truth-seeking behavioral change | Inquiry directly caused a perspective shift |
| ≤15% of inquiries end at `open` with no response | Acceptable ghost rate | Some loss is natural; >15% means responder fatigue |
| Inquiry count correlates with claim credibility (higher inquiries → higher credibility) | Quality signal | Lots of inquiries on a claim means people are testing it |
| ≥3 instances of "I didn't understand the claim until someone asked about it" | Comprehension impact | Inquiry is serving its primary purpose |
| New users create inquiries within first 3 sessions | Habit formation | Inquiry is adopted as a native behavior, not a learned one |

### Failure Criteria (if any 2 trigger)

| Criterion | What It Means |
|-----------|---------------|
| >40% ghost rate (open inquiries never responded) | Cost outweighs benefit. Inquiries degrade debate quality. |
| <5% satisfaction rate | The loop is broken. Either satisfaction is invisible or responses aren't useful. |
| No correlation between inquiries and any behavior change (revisions, side switches) | Feature is decoration. It doesn't change debate dynamics. |
| Users report inquiry fatigue: "Too many questions on my claims" | Rate limits too permissive or UI shows too much. |
| Bad actors create inquiries solely to delay consensus (if consensus exists) | Gaming vector confirmed. Need prevention. |

### Observation Points

- All Phase 1 and Phase 2 observation points, plus:
- Do inquiries cluster on specific claim types (fact vs opinion vs prediction)?
- Do evidence-backed claims receive fewer inquiries than unsupported claims?
- Does inquiry activity decline over the 21 days (novelty wearing off)?
- Is there a "celebrity effect" — certain users receiving disproportionate inquiries?
- What is the average inquiry depth (responses per inquiry) at scale?
- Do users who received responses to their inquiries stay in the debate longer?
- Is there a correlation between inquiries created and claims revised?
- Case study: for each side switch event, was there an inquiry within the preceding 7 days?
- Case study: for each claim revision, was there an inquiry on that claim?
- Ratio of inquiries on proposition claims vs opposition claims (balance check)

### End-of-Phase Decision Gate

After Phase 3, answer these questions:

1. Is Inquiry being used as intended (clarification, evidence_request, assumption_check) or repurposed?
2. Is Inquiry improving debate quality (fewer unsubstantiated claims, more cross-side understanding)?
3. Is Inquiry creating negative externalities (harassment, noise, fatigue)?
4. Is the completion loop (→satisfied) happening naturally or needs incentive?
5. Does Inquiry change user retention (do inquirers stay longer)?

| Outcome | Action |
|---------|--------|
| 4-5 "yes" | Ship to all users. Begin v1.1 planning. |
| 2-3 "yes" | Iterate on problem areas. Run Phase 3 extended (another 21 days). |
| 0-1 "yes" | Reconsider feature. Pause or redesign from first principles. |

---

## Cross-Phase Metrics Dashboard

Track these in a single view across all phases:

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| Unique inquirers | — | — | — |
| Total inquiries | — | — | — |
| Response rate | — | — | — |
| Satisfaction rate | — | — | — |
| Mean response time | — | — | — |
| Cross-side inquiry % | — | — | — |
| Claim revision rate w/ inquiry link | — | — | — |
| Side switch rate w/ prior inquiry | — | — | — |
| Active answerers | — | — | — |
| Ghost rate (open, no response) | — | — | — |
| Abandonment rate (dialog opened, not submitted) | — | — | — |
| Reports/flags on inquiries | — | — | — |

---

## Ethics and Guardrails

### Privacy
- Do not identify specific users in observation notes
- Store phase data separately from production data
- Users can opt out of observation at any time

### Moderation
- Beta users are subject to standard moderation rules
- Inquiries are not exempt from flagging/reporting
- Any flagged inquiry during beta is immediately reviewed by the team

### Communication
- Do not announce "beta" or "new feature" at Phase 1
- At Phase 2 start, send a single message: "You can now ask questions on any claim"
- At Phase 3 start, no announcement — feature is considered "existing"

### Exit Criteria (Beta Stopped Immediately)
- Any inquiry used for harassment, doxxing, or threats
- Any user reports feeling pressured to respond to inquiries
- Any system performance degradation attributable to inquiry queries
