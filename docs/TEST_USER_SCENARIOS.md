# Test User Scenarios — Inquiry Behavioral Validation

**Goal**: Determine whether Inquiry changes user behavior.
**Not**: Whether Inquiry works technically (already validated).

These scenarios are scripts for observation, not test automation. Each scenario describes a behavioral chain that may or may not happen organically. The purpose is to recognize it when it does.

---

## Scenario A: Claim Author Responds to Inquiry

### Narrative

User A (Support side) creates a claim:
> "Standard treatment protocols are 22% more effective than alternative approaches."

User B (Challenge side) reads the claim and instead of posting a counter-claim or a dismissive comment, clicks "Inquiry" and selects type "Evidence Request" with content:
> "Can you provide the specific study this 22% figure comes from? What was the sample size?"

User A sees the notification (if notifications exist) or discovers it when returning to the room. User A clicks Respond and writes:
> "The 22% comes from the Smith et al. 2023 meta-analysis of 14 RCTs with 3,200 patients published in the Journal of Medical Outcomes."

### What We Are Testing

| Question | Behavioral Signal |
|----------|-------------------|
| Does User A engage with the inquiry or ignore it? | Response written or not. Response time. |
| Does User B's choice of Inquiry over comment change the tone of engagement? | Compare language of inquiry response vs. hypothetical comment. Lower hostility? More specific? |
| Does User A reference the inquiry in later arguments? | Subsequent messages that say "As asked earlier..." or link back. |
| Does the exchange stay factual or escalate? | Inquiry→Response is factual. Comment→Counter-claim tends to escalate. |

### Expected Behavioral Outcomes

| Positive | Negative |
|----------|----------|
| User A responds within 24 hours | User A ignores the inquiry (ghost) |
| User B reads the response and engages further | User B responds with "That's not what I asked" (hostile) |
| The evidence is linked or referenced by other users | The response is never seen again (sink) |

### Observation Checklist

- [ ] Was the inquiry type chosen appropriate for the question? (Evidence Request for source question)
- [ ] Did User B also vote on the claim after receiving the response?
- [ ] Did User A's subsequent claims reference the Smith et al. study?
- [ ] Did other users interact with the inquiry (upvote, reference)?

### Variation A1 — Claim Author Is Not the Responder

User C (a third participant) responds instead of User A. User A never engages.
**Question**: Is the inquiry satisfied by any response, or does the claim author's response matter more?

### Variation A2 — Claim Author Responds Defensively

User A responds: "I don't need to provide sources. The research is well known."
**Indicator**: Defensive response signals that inquiry is perceived as an attack, not a genuine question.

---

## Scenario B: Inquiry → Satisfied (Loop Completion)

### Narrative

User A (undecided, `inquirer_side: 'inquiry'`) is observing a debate between Support and Challenge sides.

User A sees this claim from the Support side:
> "Renewable energy is cheaper than fossil fuels when you account for long-term externalities."

User A is genuinely unsure. They click Inquiry, select "Clarification":
> "What specific externalities are you including in 'long-term'? Carbon pricing? Health impacts? Land use?"

User B (Support side, claim author) responds:
> "We're primarily looking at health externalities — the WHO estimates $X in healthcare costs from fossil fuel pollution annually. Carbon pricing is separate."

User A reads the response. It makes sense. User A clicks "Satisfied."

### What We Are Testing

| Question | Behavioral Signal |
|----------|-------------------|
| Does User A return to the inquiry after User B responds? | Time between response and satisfaction. If >72 hours, User A may have forgotten. |
| Does User A engage with the response before satisfying? | Did they read it? (proxy: time on page, scroll depth) |
| Does User A's side change after satisfaction? | From `inquiry` to Support or Challenge. |
| Does User A create more inquiries on other claims? | Satisfaction reinforces the behavior. |

### Expected Behavioral Outcomes

| Positive | Negative |
|----------|----------|
| User A returns within 24 hours to read the response | User A never returns (ghost inquiry) |
| User A clicks Satisfied (completes loop) | User A reads but doesn't Satisfy (loop incomplete) |
| User A's subsequent behavior shows increased understanding | User A continues asking identical questions on other claims (not learning) |

### Observation Checklist

- [ ] Did User A click Satisfied? If not, was the response unsatisfactory or was the button invisible?
- [ ] Did User A change their debate side within 7 days of satisfaction?
- [ ] Did User A cite the response content in later messages?
- [ ] Did User A's voting pattern change (more agreement with Support side)?

### Variation B1 — Unsatisfied Loop

User A reads the response and clicks "Unsatisfied":
> "You didn't address land use externalities. Can you clarify?"

**Signal**: Unsatisfied with specific follow-up → productive clarification loop.
**Anti-signal**: Unsatisfied without explanation → drive-by rejection.

### Variation B2 — Closed Without Satisfaction

User A reads the response, shrugs, and clicks "Close."
**Signal**: User A got the answer they needed but doesn't want to confirm. Acceptable — not every loop needs satisfaction.
**Question**: Does the user understand that Satisfied gives reputation points? If not, satisfaction rate may be artificially low.

---

## Scenario C: Inquiry Leads to Claim Revision

### Narrative

User A (Challenge side) creates a claim:
> "The new policy reduces emissions by only 5%, which is negligible."

User B (Support side) reads the claim and creates an inquiry (Assumption Check):
> "Your claim assumes that 5% is negligible. But 5% of current emissions is 200 megatons — larger than most countries' total emissions. Do you have a specific threshold for 'negligible'?"

User A reads the inquiry. Thinks about it. Decides the claim was poorly framed.

User A revises the claim to:
> "The new policy reduces emissions by only 5%, which is insufficient to meet the 2030 targets."

### What We Are Testing

| Question | Behavioral Signal |
|----------|-------------------|
| Does User A engage with the inquiry non-defensively? | Claim revision is the strongest signal of non-defensive engagement. |
| Does User A credit the inquiry in the revision? | "Per [Inquiry ID]: updated threshold framing." |
| Does the inquiry author respond to the revised claim? | "Thanks, that clarifies your position." |

### Expected Behavioral Outcomes

| Positive | Negative |
|----------|----------|
| Claim is revised with improved precision | Claim is deleted instead of revised |
| User A acknowledges the inquiry was helpful | User A deletes the inquiry or ignores it |
| The revised claim receives more engagement | The revised claim receives fewer votes (may indicate it was weakened) |

### Observation Checklist

- [ ] Was the claim revision timestamp within 72 hours of the inquiry?
- [ ] Did the claim revision text reference or address the inquiry content?
- [ ] Did the inquiry author vote on the revised claim?
- [ ] Did the inquiry author change their mind about the claim?
- [ ] Did User A create fewer imprecise claims afterward? (learning effect)

### Variation C1 — Inquiry Does Not Lead to Revision

User A reads the inquiry but does not revise. They may respond or ignore.
**Signal**: Inquiry was not persuasive enough, or User A is entrenched.
**Question**: Does the inquiry still serve value for other readers even without revision?

### Variation C2 — Inquiry Leads to Evidence Addition

User A doesn't revise the claim but adds evidence supporting the 5% figure in context.
**Signal**: Inquiry led to stronger substantiation even without claim revision.

---

## Scenario D: Inquiry Leads to Side Switch

### Narrative

User A (Support side) has been arguing in favor of the motion. They create an inquiry on a Challenge-side claim:
> "Your evidence actually supports my position because the study shows efficacy in subgroup B."

User A selects "Clarification" and writes:
> "Wait — the Johnson study shows that the treatment WORKS for subgroup B but not subgroup A. I thought you were citing it to argue it doesn't work. Am I reading this wrong?"

User B (Challenge side, claim author) responds:
> "You're reading it right. The treatment works for subgroup B. I was citing it to show it doesn't work for subgroup A, which is 70% of patients. The overall efficacy is low because the benefit is concentrated in a minority."

User A reads the response and realizes they had misinterpreted the evidence. User A switches from Support to Challenge side.

### What We Are Testing

| Question | Behavioral Signal |
|----------|-------------------|
| Does User A engage with an opposing side's claim? | Cross-side inquiry is the starting point. |
| Does User A's understanding change? | The response changes their interpretation of the evidence. |
| Does User A act on the new understanding? | Side switch is the strongest signal of genuine perspective change. |

### Expected Behavioral Outcomes

| Positive | Negative |
|----------|----------|
| User A switches sides within 7 days of the inquiry exchange | User A doubles down on their original position |
| User A references the inquiry in their side switch reason | User A switches sides but does not credit the inquiry |
| User A's subsequent claims reflect the corrected understanding | User A leaves the debate (disengagement) |

### Observation Checklist

- [ ] Was there an inquiry on a claim from the OPPOSITE side within 7 days before the switch?
- [ ] Did the inquiry involve a factual/epistemic clarification (not just opinion)?
- [ ] Did User A click Satisfied on the inquiry before switching? (implies resolution)
- [ ] Did User B (responder) engage further after User A switched sides?
- [ ] Is this the user's first side switch or a repeated pattern?
- [ ] Compare: do users who switch sides WITHOUT inquiries have different behavioral profiles?

### Variation D1 — Partial Switch

User A does not switch sides but changes their voting pattern (more agreement with Challenge claims, less agreement with Support claims).
**Signal**: Inquiry influenced their perspective but not enough to switch. This is still a positive outcome — understanding changed even if allegiance didn't.

### Variation D2 — Inquiry Prevents Premature Switch

User A (undecided) was about to join Support side. Creates an inquiry on a Support claim. The response is unsatisfactory. User A delays joining.
**Signal**: Inquiry prevented a decision based on incomplete understanding. This is a positive outcome for debate quality.

---

## Scenario E: Inquiry Ignored (Ghost Pattern)

### Narrative

User A creates an inquiry on a claim:
> "How does this claim account for the 2024 regulatory changes that invalidated the study's assumptions?"

Nobody responds. The inquiry sits in `open` status.

User A returns after 48 hours. No response. User A closes the inquiry without satisfaction.

User A never creates another inquiry on the platform.

### What We Are Testing

| Question | Behavioral Signal |
|----------|-------------------|
| Why was the inquiry ignored? | Too hard? Too niche? Nobody saw it? Nobody cares? |
| Does the ghost pattern repeat? | If >2 ghosted, User A stops using Inquiry entirely. |
| What does User A do instead? | They may post a comment, create a counter-claim, or leave the debate. |
| Is there a claim author who habitually ignores inquiries? | Systemic ghosting by specific users degrades the entire feature. |

### Expected Behavioral Outcomes

| Acceptable | Problematic |
|------------|-------------|
| Inquiry is too niche/advanced for anyone to answer | Inquiry is ignored because the feature is invisible |
| Inquiry is answered after 72+ hours (slow but resolved) | Inquiry is never answered (permanent ghost) |
| User A closes the inquiry (explicit closure) | User A abandons the inquiry (stays `open` forever) |

### Observation Checklist

- [ ] Was the inquiry specific enough to be answerable? (or was it unanswerable?)
- [ ] Was the claim still active when the inquiry was created? (or was the debate over?)
- [ ] Did the claim author see the inquiry? (proxy: was the claim author active during the inquiry window?)
- [ ] How many other inquiries exist on the same claim? (if too many, responders may be overwhelmed)
- [ ] Did the inquirer attempt to get attention elsewhere (comments, DMs, etc.)?

### Variation E1 — Selective Ghosting

User A's inquiry is ignored, but another user's inquiry on the same claim is answered.
**Signal**: Not a claim-level issue. Something about User A's inquiry specifically made it unanswerable.
**Question**: Was the inquiry hostile? Unclear? Too long?

### Variation E2 — System-Level Ghosting

No inquiries on the platform receive responses (or very few).
**Signal**: Systemic problem. Responders don't know they can respond, don't see the value, or the UI hides the respond action.

---

## Cross-Scenario Patterns

These patterns only become visible when observing multiple scenarios together.

### Pattern 1: Inquiry → Claim Quality Correlation

| Observation | Implication |
|-------------|-------------|
| Claims with inquiries have higher credibility scores | Inquiry surfaces weaknesses; authors refine claims |
| Claims with inquiries have more evidence attached | Inquiry motivates evidence addition (Scenario C2) |
| Claims with inquiries have more even vote distributions | Inquiry reduces polarization — cross-side understanding |

### Pattern 2: Inquirer → Participant Trajectory

| Observation | Implication |
|-------------|-------------|
| Users who create inquiries stay in debates longer | Inquiry creates engagement stickiness |
| Users who receive satisfactory responses are more likely to create inquiries | Positive reinforcement loop |
| Users who are ghosted are more likely to leave the debate | Negative reinforcement — ghosting is costly |

### Pattern 3: Responder → Authority Signal

| Observation | Implication |
|-------------|-------------|
| Users who respond to inquiries gain higher trust scores | Responding is a prosocial signal |
| Users who respond to inquiries receive more inquiries | High-responders become de facto authorities |
| Users who never respond to inquiries have lower credibility | Non-responsiveness is a negative signal (fair or not) |

### Pattern 4: Cross-Side Dynamics

| Observation | Implication |
|-------------|-------------|
| Cross-side inquiries have higher satisfaction rates | Users appreciate the other side engaging genuinely |
| Cross-side inquiries have longer response times | Responders are more cautious when answering the other side |
| Cross-side inquiries correlate with side switches (Scenario D) | Cross-side engagement is the most truth-seeking behavior |

---

## Scoring Guide for Each Scenario

For each observed instance of a scenario, score:

| Dimension | Score 1 | Score 3 | Score 5 |
|-----------|---------|---------|---------|
| **Engagement depth** | Inquiry created, no engagement | Inquiry responded, loop incomplete | Loop completed (satisfied/closed) |
| **Behavioral change** | No change observed | User modifies voting | User revises claim or switches side |
| **Debate quality impact** | Adds noise | Clarifies a point | Resolves a misunderstanding |
| **Replicability** | One-off | User repeats pattern | Pattern spreads to other users |

Score each observed scenario instance as 1-5 in each dimension. Aggregate at end of each phase.
