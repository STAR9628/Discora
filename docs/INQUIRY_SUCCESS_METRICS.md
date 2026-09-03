# Inquiry Success Metrics

**Date**: 2026-06-12
**Status**: Product validation — no implementation.

---

## Executive Summary

Inquiry is the feature that determines whether Discora measures what matters.

Every platform measures engagement: posts, comments, time-on-site, retention. These metrics reward volume, performance, and outrage. They are the reason the internet is the way it is.

Inquiry must be measured differently. Not by how many questions are asked, but by what changes as a result of asking them.

**The core question this document answers**: How do we know if Inquiry is making users more informed rather than simply more active?

**Answer**: We measure transitions. Not counts. Not states. Not aggregates. We measure whether asking a question leads to a detectable change in what someone knows, believes, or contributes. If no transitions occur, Inquiry is a chat feature, not a knowledge-building tool.

**Confidence level**: Medium.

This confidence level reflects a structural limitation: understanding is internal. We can only measure its observable proxies — position changes, claim revisions, evidence additions, consensus updates. These proxies are good but not perfect. A user can become more informed without taking any observable action. We accept this gap.

---

## Section 1 — Success Definition

### What Inquiry Success Means

A successful Inquiry system produces **detectable knowledge-state transitions** in participants. A transition means: someone changed what they thought, what they believed, or what they contributed, as a direct or indirect result of an inquiry.

### Inquiry Success = Understanding Improved

| Dimension | Evidence of Success |
|-----------|-------------------|
| **Individual understanding** | A participant changes their position on the motion after investigation |
| **Collective understanding** | A claim is revised to address a question raised by an inquiry |
| **Evidence quality** | Evidence is added in direct response to an inquiry |
| **Argument clarity** | A claim is clarified or disambiguated following an inquiry |
| **Conclusion confidence** | A consensus conclusion is revised or strengthened after inquiry review |

### What Success Is NOT

| NOT success | Why |
|-------------|-----|
| Many inquiries created | Volume without transitions is noise |
| Many inquiries responded | Responses without resolution is incomplete |
| Many users trying Inquiry once | Adoption without impact is vanity |
| High inquiry retention | Users returning to ask more questions — if no transitions occur, they are just using Inquiry as chat |

### The Core Principle

> **Inquiry is measured by its outcomes, not its activity.**

An inquiry that leads to a side switch is infinitely more valuable than 100 inquiries that lead to nothing, even if those 100 inquiries generated engagement metrics.

---

## Section 2 — North Star Metrics

### Metric 1: Inquiry Resolution Rate

| Aspect | Detail |
|--------|--------|
| **Definition** | % of inquiries that reach a terminal state (satisfied or closed) within 30 days of creation |
| **Why it matters** | Measures whether the inquiry loop completes. Unresolved inquiries are noise — they indicate questions that were asked but never meaningfully addressed. A high resolution rate means the system is producing closure. |
| **Healthy range** | > 60% resolved within 30 days |
| **Danger threshold** | < 30% resolved — the system is producing ghost inquiries faster than completions |
| **Gaming resistance** | Low gaming risk. Resolution requires action from both asker (close/satisfy) and responder (answer). Neither can single-handedly inflate this metric. |
| **Notes** | This is the most important single metric. It measures whether the loop closes. An inquiry system with high creation but low resolution is a complaint box, not an investigation tool. |

### Metric 2: Inquiry-Mediated Side Switch Rate

| Aspect | Detail |
|--------|--------|
| **Definition** | % of side switches where the user created or responded to at least one inquiry in the 7 days preceding the switch |
| **Why it matters** | This is the strongest observable proxy for "inquiry changed someone's mind." A side switch preceded by inquiry activity strongly suggests the inquiry contributed to the position change. |
| **Healthy range** | > 15% of all side switches preceded by inquiry activity |
| **Danger threshold** | < 5% — inquiries are not contributing to position changes, suggesting they are not influencing understanding |
| **Gaming resistance** | Very high. Side switching has a 24-hour cooldown and requires a 50-character reason. Gaming this metric requires meaningful effort. |
| **Notes** | Correlation, not causation. Not every side switch preceded by inquiry was caused by inquiry. But the correlation is meaningful — if inquiry participants never switch, the feature is not changing minds. |

### Metric 3: Inquiry → Claim Revision Rate

| Aspect | Detail |
|--------|--------|
| **Definition** | % of claims that receive an edit within 7 days of receiving an inquiry on that claim |
| **Why it matters** | Measures whether claims improve in response to questions. A claim that is edited after an inquiry has been strengthened by the inquiry process. This is the most direct evidence that inquiry improves argument quality. |
| **Healthy range** | > 10% of inquired claims revised within 7 days |
| **Danger threshold** | < 3% — claims are not being improved by inquiry, suggesting questions are being ignored or dismissed |
| **Gaming resistance** | High. Claim edits are substantive actions. Users cannot trivially fake claim improvement. |
| **Notes** | A claim revision doesn't guarantee the revision addressed the inquiry. Manual review sampling (e.g., 10% of revisions) should verify that revisions are responsive. |

### Metric 4: Inquiry → Evidence Addition Rate

| Aspect | Detail |
|--------|--------|
| **Definition** | % of inquiries where evidence is added to the debate within 7 days, where the evidence was created by someone who participated in the inquiry |
| **Why it matters** | Measures whether inquiries lead to new evidence discovery. This is the second-strongest proxy for "inquiry improved understanding" — evidence is the substrate of truth-seeking. |
| **Healthy range** | > 5% of inquiries linked to new evidence within 7 days |
| **Danger threshold** | < 1% — inquiries are not driving evidence discovery |
| **Gaming resistance** | High. Evidence creation requires sourcing and is subject to voting/moderation. |
| **Notes** | This metric will be lower than others — not every inquiry requires new evidence. Some are clarifications. The threshold reflects this. |

### Metric 5: First Response Time (Median)

| Aspect | Detail |
|--------|--------|
| **Definition** | Median time between inquiry creation and first response |
| **Why it matters** | Measures whether the system is responsive. Long response times discourage inquiry — users stop asking if no one answers. Short response times signal a healthy, engaged community. |
| **Healthy range** | < 24 hours median |
| **Danger threshold** | > 72 hours median — inquiry is effectively asynchronous to the point of uselessness |
| **Gaming resistance** | Low. Users can respond instantly to game this metric. But gaming would also produce responses, which is the desired behavior. |
| **Notes** | This is the only North Star metric that measures process rather than outcome. It's included because without responsiveness, no outcomes occur. |

---

## Section 3 — Leading Indicators

These metrics tell us early whether Inquiry is gaining adoption. They are not measures of success — they are measures of **engagement with the mechanism**. High leading indicators + low North Star metrics = users are trying Inquiry but it's not producing understanding. Low leading indicators + high North Star metrics = Inquiry is working but needs distribution.

### Indicator 1: % of Active Debates Containing Inquiries

| Aspect | Detail |
|--------|--------|
| **Definition** | % of debates with at least one inquiry created in the trailing 7 days |
| **Why it matters** | Measures whether Inquiry is spreading across debates rather than concentrating in a few. A feature used in 5% of debates is niche. A feature used in 50%+ is infrastructure. |
| **Target** | > 30% by end of beta |
| **Interpretation** | Low + low North Star = feature is not gaining traction. Low + high North Star = feature is working but needs promotion. |

### Indicator 2: Average Inquiries Per Active Debate

| Aspect | Detail |
|--------|--------|
| **Definition** | Mean inquiries created per debate in the trailing 7 days, filtered to debates with at least one inquiry |
| **Why it matters** | Measures depth of adoption. 1 inquiry per debate suggests surface-level trial. 5+ inquiries per debate suggests genuine investigation. |
| **Target** | > 3 inquiries per debate with inquiry activity |
| **Interpretation** | High count + low resolution rate = inquiry dumping. High count + high resolution rate = healthy investigation culture. |

### Indicator 3: Response Participation Rate

| Aspect | Detail |
|--------|--------|
| **Definition** | % of inquiries that receive at least one response |
| **Why it matters** | Measures whether the community is engaged in answering questions. If 90%+ of inquiries go unanswered, the feature is dead regardless of creation volume. |
| **Target** | > 70% of inquiries receive at least one response |
| **Interpretation** | Low response rate + low inquiry creation = no one cares. High inquiry creation + low response rate = demand exceeds supply — responders are overwhelmed. |

### Indicator 4: Unique Inquirer Ratio

| Aspect | Detail |
|--------|--------|
| **Definition** | Ratio of unique inquiry creators to total debate participants in the trailing 30 days |
| **Why it matters** | Measures whether Inquiry is used broadly or concentrated in a few power users. A ratio of 0.1 means 10% of participants are asking questions — healthy. A ratio of 0.01 means the feature is used by 1% — elite tool, not platform feature. |
| **Target** | > 0.15 (15%+ of participants create at least one inquiry) |
| **Interpretation** | Low ratio suggests the feature is not accessible or discoverable. Investigate UX friction. |

### Leading Indicator Dashboard

```
Early adoption signal:

  % of debates with inquiries  ████████░░  (30% target)
  Avg inquiries per debate     ████░░░░░░  (3 target)
  Response rate                ████████░░  (70% target)
  Unique inquirer ratio        ████░░░░░░  (15% target)

If all four are green, Inquiry has adoption.
If North Star metrics are still red, adoption is not producing understanding.
```

---

## Section 4 — Truth-Seeking Indicators

This is the most important section. These metrics detect whether Inquiry is improving understanding.

### Strongest Indicators (High Confidence)

These are hard to fake and strongly correlated with understanding improvement.

| Indicator | What It Measures | Confidence |
|-----------|-----------------|------------|
| **Side switch within 7 days of inquiry activity** | A participant changed their position after investigation | High |
| **Claim revision within 7 days of inquiry on that claim** | A specific argument was improved in response to a question | High |
| **Evidence added within 7 days of inquiry, by someone who responded** | A knowledge gap was filled by sourcing new evidence | High |
| **Consensus revision within 14 days of inquiry** | The debate's conclusion changed in response to questioning | High |

**Why high confidence**: Each of these is a detectable, costly action. Side switching requires cooldown bypass. Claim revision requires cognitive effort. Evidence creation requires research. Consensus revision requires social coordination. These are not actions users take lightly.

### Weaker Indicators (Medium Confidence)

These correlate with understanding but have alternative explanations.

| Indicator | What It Measures | Why Weaker |
|-----------|-----------------|------------|
| **Inquiry marked as satisfied** | Inquirer confirms their question was answered | Inquirer may satisfy to give reputation, not because they learned anything |
| **Inquiry marked as satisfied by a user who is not the inquirer** | Someone else confirms the question was valuable | Only possible through the unanswerable flag path — edge case |
| **Inquiry creator later votes on claims/evidence differently than their inquiry suggested** | User's engagement with the topic evolved | Voting is low-commitment; patterns are noisy |
| **Inquiry creates a new participant who then stays in the debate** | Inquiry brought someone into the conversation who became a contributor | They might have contributed anyway |

### Misleading Indicators (Low Confidence — Use With Caution)

These look like understanding but are often not.

| Indicator | Why Misleading |
|-----------|----------------|
| **Total inquiry count** | Volume without transitions is noise. 1,000 inquiries with 0% resolution rate is a complaint box. |
| **Response count** | High response volume could mean the claim was unclear, not that understanding improved. |
| **Satisfaction rate** | If satisfaction gives reputation, users may satisfy insincerely. Cross-reference with side switches and claim revisions. |
| **Time spent on debate page** | More time could mean confusion, not understanding. Correlation with inquiry activity is suggestive but not conclusive. |
| **Inquiry word count** | Longer questions are not better questions. Brevity often indicates clarity. |

### Truth-Seeking Score (Composite)

A composite metric combining the four strongest indicators:

```
Truth-Seeking Score =
  (Side switches after inquiry × 3) +
  (Claim revisions after inquiry × 2) +
  (Evidence additions after inquiry × 2) +
  (Consensus revisions after inquiry × 3)
```

Weights reflect confidence in each proxy. Side switches and consensus revisions are weighted highest because they represent the most significant knowledge-state transitions.

**Not a dashboard metric**. This is an analytical tool for the product team. Do not display it publicly — it will be gamed.

---

## Section 5 — Failure Indicators

### Failure 1: Silent Death

| Aspect | Detail |
|--------|--------|
| **Pattern** | Inquiry creation drops to near zero within 4 weeks of launch. Users try it once and never return. |
| **Detection metric** | Weekly inquiry creation rate. < 10 inquiries created per week after week 4. |
| **Severity** | Critical — the feature is rejected by the user base |
| **Recommended response** | Investigate UX friction. Is the inquiry button discoverable? Is the creation flow too complex? Are users confused about what inquiry is? Qualitative interviews. A/B test simpler entry points. If no improvement after 2 iterations, consider deprecating. |

### Failure 2: Inquiry Graveyards

| Aspect | Detail |
|--------|--------|
| **Pattern** | Inquiries are created but rarely answered. High creation volume, low response rate. |
| **Detection metric** | Response rate < 30% for 4 consecutive weeks |
| **Severity** | High — the community is not participating in answering |
| **Recommended response** | Increase visibility of unanswered inquiries. Send notifications to claim authors when their claims receive inquiries. Consider reputation incentive for responding if organic response rate doesn't improve. If responder reputation (+5) is already in place and response rate is still low, the issue is cultural or UI — responders don't know about inquiries. |

### Failure 3: Bureaucracy (Inquiry Overload)

| Aspect | Detail |
|--------|--------|
| **Pattern** | Inquiries per claim exceed 10. Claim authors spend more time answering questions than building arguments. Debates become QA sessions. |
| **Detection metric** | > 50% of claims have 5+ open inquiries |
| **Severity** | Medium — feature is being used but is overwhelming |
| **Recommended response** | Enforce cap (20 per claim). Display "most asked" aggregation. Separate inquiry tab to reduce visual clutter in claims view. Consider inquiry voting to surface important questions. If organic usage exceeds capacity, the feature needs scaling infrastructure (tab, sort, aggregation) before it becomes a liability. |

### Failure 4: Inquiry Spam

| Aspect | Detail |
|--------|--------|
| **Pattern** | Low-quality inquiries from a minority of users. High creation volume, near-zero satisfaction rate, all targeting one side's claims. |
| **Detection metric** | Users with > 10 inquiries and < 20% satisfaction rate. Cross-reference with side bias (80%+ target one side). |
| **Severity** | High — erodes trust in the feature |
| **Recommended response** | Apply rate limits (already designed). Flag users for moderation review. Add "unanswerable" flag (v1.1) so legitimate responders can opt out. If patterns persist, temporary inquiry ban for specific users. Do not disable Inquiry platform-wide — bad actors should not break the feature for everyone. |

### Failure 5: Expert Burnout

| Aspect | Detail |
|--------|--------|
| **Pattern** | High-quality responders (users with established claim/evidence reputation) stop responding to inquiries. Their last-response-date drifts. |
| **Detection metric** | % of top 20% responders (by claim/evidence reputation) who have not responded to an inquiry in 30 days. Rising trend. |
| **Severity** | High — the most valuable participants are disengaging |
| **Recommended response** | Qualitative outreach to burned-out responders. Is the inquiry volume too high? Are questions low-quality? Are they tired of sealioning? Reduce inquiry cap per claim if volume is overwhelming. Add "unanswerable" flag to reduce pressure. If top responders are leaving the platform entirely (not just inquiry), the issue is broader than Inquiry. |

### Failure Dashboard

```
System health:

  Silent death?     ⚪  Weekly creation > 10
  Graveyards?       🟢  Response rate > 70%
  Overload?         🟢  Claims with 5+ open < 50%
  Spam?             🟢  No flagged inquirers
  Burnout?          ⚪  Top responders active in last 30d
```

---

## Section 6 — Beta Evaluation Framework

### 50 Users

At 50 users, quantitative metrics are statistically unreliable. Evaluation is primarily qualitative.

| Outcome | Criteria |
|---------|----------|
| **Success** | At least 5 users create inquiries. At least 3 distinct inquiry-response loops complete (question answered). Qualitative feedback indicates users found the feature useful. No critical abuse patterns. |
| **Partial success** | Users create inquiries but few receive responses. Qualitative feedback indicates confusion about the feature or lack of awareness. |
| **Failure** | Fewer than 3 users create any inquiries. Users report confusion about what inquiry is or how to use it. Bugs prevent basic functionality. |

**Key question at 50 users**: Is the interaction model (ask → answer → resolve) understandable and functional?

### 100 Users

At 100 users, aggregate metrics begin to have signal, but individual behavior still dominates.

| Outcome | Criteria |
|---------|----------|
| **Success** | Response rate > 50%. At least 1 inquiry-mediated side switch. At least 1 claim revision following inquiry. Resolution rate > 40% within 30 days. |
| **Partial success** | Response rate > 30% but < 50%. No side switches or claim revisions yet. Users are using the feature but it hasn't produced observable transitions. |
| **Failure** | Response rate < 30%. Resolution rate < 20%. No observable transitions. Users report the feature feels like a dead end. |

**Key question at 100 users**: Is Inquiry producing any detectable transitions, even if rare?

### 500 Users

At 500 users, North Star metrics become meaningful. Statistical patterns emerge.

| Outcome | Criteria |
|---------|----------|
| **Success** | Resolution rate > 60%. Response rate > 70%. Inquiry-mediated side switch rate > 10% of all side switches. Claim revision rate > 8%. Evidence addition rate > 4%. First response time < 36 hours median. No critical abuse patterns. |
| **Partial success** | Resolution rate > 40% but < 60%. Side switch rate > 5%. Claim revision rate > 4%. Feature is producing transitions but at lower rates than desired. Abuse patterns are manageable. |
| **Failure** | Resolution rate < 30%. Response rate < 40%. Side switch rate < 3%. Claim revision rate < 2%. Abuse patterns requiring manual intervention weekly. Qualitative feedback indicates the feature is creating more noise than signal. |

**Key question at 500 users**: Is Inquiry producing transitions at rates that justify ongoing investment?

---

## Section 7 — Metrics We Should NOT Use

### Metric 1: Total Inquiries

| Aspect | Detail |
|--------|--------|
| **Why proposed** | Obvious metric. Easy to count. Looks good on a dashboard. |
| **Why to avoid** | Volume is the enemy of understanding. 10,000 inquiries with a 10% resolution rate is 9,000 pieces of unfinished business. Total inquiries conflates signal and noise. |
| **Use instead** | Resolution rate and inquiry-mediated transitions. These distinguish signal from noise. |
| **Exception** | Useful as a leading indicator (adoption proxy) when paired with resolution rate. Never report in isolation. |

### Metric 2: Total Inquiry Responses

| Aspect | Detail |
|--------|--------|
| **Why proposed** | Indicates engagement. More responses = more activity. |
| **Why to avoid** | A claim that requires 15 responses to answer one question is a claim that should have been clearer. High response count can indicate confusion, not quality. |
| **Use instead** | First response time (speed) and response participation rate (breadth). These measure responsiveness without rewarding verbosity. |

### Metric 3: Time on Debate Page

| Aspect | Detail |
|--------|--------|
| **Why proposed** | Standard engagement metric. More time = more interest. |
| **Why to avoid** | More time could mean: the debate is confusing, the UI is hard to navigate, or the user is multitasking. Time-on-page is a terrible proxy for understanding. |
| **Use instead** | Nothing. Remove time-based metrics from the product dashboard entirely. They do not measure understanding. |

### Metric 4: Daily Active Users (DAU) of Inquiry

| Aspect | Detail |
|--------|--------|
| **Why proposed** | Standard engagement metric. More users = more success. |
| **Why to avoid** | DAU measures how many people open the app, not how many people learn something. A user who opens the app 10 times to check inquiry responses is not necessarily learning — they may be anxiously awaiting a reply. |
| **Use instead** | Unique weekly inquirers paired with resolution rate per inquirer. Measures breadth + depth + completion. |

### Metric 5: Inquiry Word Count / Quality Score

| Aspect | Detail |
|--------|--------|
| **Why proposed** | Longer inquiries seem more thoughtful. |
| **Why to avoid** | The best questions are often short and precise. "What evidence supports this?" is 4 words and perfect. "Unpacking the epistemological assumptions underlying your claim about..." is 10 words and noise. Length is not quality. |
| **Use instead** | Resolution rate per inquiry type. If "clarification" inquiries have a 70% resolution rate and "evidence_request" inquiries have a 40% rate, we know which type needs improvement — regardless of word count. |

---

## Section 8 — Final Recommendation

### Minimum Evidence Required

To conclude **"Inquiry is working and should become a permanent pillar of Discora"** :

#### Primary Condition (Must Pass)

> **At least 15% of side switches are preceded by inquiry activity within 7 days.**

This is the hardest metric to game and the strongest proxy for understanding improvement. If inquirers are switching sides at or above the background rate, Inquiry is not changing minds. If they are switching at a higher rate, Inquiry is demonstrably contributing to position changes.

#### Secondary Conditions (3 of 4 Must Pass)

1. **Resolution rate > 60%** — Inquiry loops are completing, not accumulating as ghosts.
2. **Claim revision rate > 8%** — Claims are being improved in response to questions.
3. **Evidence addition rate > 4%** — New evidence is being sourced through inquiry.
4. **Response rate > 70% and first response time < 36 hours** — The community is responsive enough to sustain the loop.

#### Qualitative Conditions

1. **No critical abuse patterns** requiring weekly manual intervention.
2. **Top contributors (by reputation) are not disengaging** from inquiry responses.
3. **User interviews produce at least one "Inquiry changed how I think about this topic" story** — not required for launch, but required for permanence.

#### Scale Requirement

Conditions must be met at **500+ active users** (not total signups, not total debates — users who have participated in at least one debate in the trailing 30 days). Below 500 users, the quantitative conditions may not be statistically meaningful.

### Decision Framework

```
At 500+ active users:

Side switch inquiry rate > 15%?    ─┐
Resolution rate > 60%?              ├── All YES → INQUIRY IS A PILLAR
Claim revision rate > 8%?           │
Evidence addition rate > 4%?        │
Response rate > 70%, FRT < 36h?    ─┘

Side switch inquiry rate > 10%?    ─┐
3 of 4 secondary conditions pass?   ├── YES → INQUIRY IS VIABLE, INVEST MORE
No critical abuse?                  │
Positive user stories?             ─┘

Side switch inquiry rate < 10%?    ─┐
Resolution rate < 40%?             ├── ANY → INQUIRY IS FAILING, REASSESS
Response rate < 50%?               │
Critical abuse patterns?           ─┘
```

### If Inquiry Fails

If after 4 months at 500+ users the metrics are not met, the question becomes: **is Inquiry wrong for Discora, or is this implementation wrong?**

Possible answers:
- **Wrong implementation**: Too much friction, wrong UI, wrong incentive structure. Iterate.
- **Wrong for the stage**: Users need more debate experience before inquiry becomes useful. Defer to post-beta.
- **Wrong for the platform**: The user base does not want structured investigation. They want debate. Accept Inquiry as a niche feature or deprecate.

### If Inquiry Succeeds

If metrics are met, Inquiry graduates from feature to pillar. This means:

- Inquiry becomes a permanent part of the debate room layout
- Inquiry contributions are fully integrated into reputation display
- Inquiry data feeds into consensus and argument maps
- Inquiry receives ongoing investment in the phased roadmap
- Discora's identity evolves from "debate platform" to "truth-seeking platform"

---

## Appendix: Metric Ownership

| Metric | Owned By | Reporting Cadence |
|--------|----------|-------------------|
| Resolution rate | Product | Weekly |
| Side switch inquiry rate | Product | Bi-weekly |
| Claim revision rate | Product | Bi-weekly |
| Evidence addition rate | Product | Bi-weekly |
| First response time | Engineering | Weekly |
| Response participation rate | Product | Weekly |
| Truth-Seeking Score (composite) | Data/Analytics | Monthly |
| Abuse pattern detection | Moderation | Daily |
| Top-responder engagement | Product | Monthly |
| Qualitative user stories | Product | Per-interview |

---

**End of document. No implementation decisions should be made without reviewing these metrics at the appropriate user scale.**
