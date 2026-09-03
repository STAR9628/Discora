# Feedback Collection Framework — Inquiry Behavioral Validation

**Goal**: Determine whether Inquiry changes user behavior.
**Not**: Whether Inquiry works technically (already validated).

---

## Collection Methods

Use all four methods. Each captures a different signal.

### Method 1: Automated Behavioral Telemetry

Collected server-side. No client instrumentation needed.

| Signal | Source | What It Measures |
|--------|--------|------------------|
| Inquiry created | `inquiry_items` INSERT | Volume and timing |
| Inquiry type selected | `inquiry_items.inquiry_type` | User intent distribution |
| Response posted | `inquiry_responses` INSERT | Engagement depth |
| Status transition | `inquiry_items.status` change | Loop progress |
| Side switch | `debate_side_changes` INSERT | Behavioral change (correlate with inquiry IDs) |
| Claim revision | `claims.content` change (compare before/after) | Structural impact |
| Vote change | `claim_votes` INSERT/DELETE | Opinion shift |
| Inquiry close | `close_inquiry` RPC call | Explicit abandonment |

**Collection rule**: Log timestamps for all events. Bucket by user_id, room_id, claim_id.

**Privacy rule**: Do not export user_ids. Use anonymous participant IDs (A, B, C...) in reports.

### Method 2: Structured Surveys

Deploy at end of each phase. Same questions across all three phases for comparability.

#### Pre-Phase Survey (before Phase 1)

Administer to all beta participants before they see Inquiry.

```
1. On a scale of 1-5, how often do you find yourself unsure what a claim means?
   (1 = Never, 5 = Every debate)

2. When you don't understand a claim, what do you typically do?
   a) Ignore it and move on
   b) Ask in the comments
   c) Create a counter-claim
   d) Research it myself
   e) Leave the debate

3. On a scale of 1-5, how confident are you that you understand the claims you vote on?
   (1 = Not confident, 5 = Very confident)

4. Have you ever changed your mind about a claim after someone explained it?
   a) Yes, multiple times
   b) Yes, once or twice
   c) No, never
```

#### Post-Phase Survey (after each phase)

```
1. Did you notice the "Inquiry" button on claims?
   a) Yes, used it
   b) Yes, saw it but didn't use it
   c) No, didn't notice it

2. [If used] What made you click "Inquiry" instead of commenting?
   (Open text)

3. [If used] Did you get a response to your inquiry?
   a) Yes, and it was helpful
   b) Yes, but it wasn't helpful
   c) No, no one responded
   d) I didn't check

4. [If used] Did you mark any inquiry as Satisfied?
   a) Yes
   b) No, I didn't know I could
   c) No, the response wasn't helpful
   d) No, I forgot to check back

5. [If used] Did responding to someone else's inquiry feel:
   a) Helpful — I enjoy clarifying
   b) Neutral — it was fine
   c) Burdensome — I felt pressured
   d) I didn't respond to any

6. What confused you about Inquiry?
   (Open text)

7. What did you find most useful about Inquiry?
   (Open text)

8. Would you use Inquiry again?
   a) Yes, definitely
   b) Probably yes
   c) Probably no
   d) Definitely not

9. Does Inquiry change how you engage with claims?
   a) Yes — I ask more questions before voting
   b) Yes — I think more carefully about my claims
   c) No — I engage the same way as before
   d) Not sure

10. What would make Inquiry better?
    (Open text)
```

### Method 3: Exit Interviews

Conduct with 5 users per phase. Select for diversity:
- 1 power user (most inquiries created)
- 1 responder (most responses given)
- 1 ghosted user (inquiry created, never answered)
- 1 non-user (saw Inquiry button, never clicked)
- 1 skeptic (vocal about disliking the feature in surveys)

#### Interview Protocol

**Opening** (5 min)
- "Walk me through your experience with Inquiry. Start from the first time you noticed it."

**Discovery** (5 min)
- "When did you first notice the Inquiry button?"
- "What did you think it was for?"
- "Did you hesitate before clicking it? Why?"

**Usage** (10 min)
- "Describe a time you asked a question using Inquiry. What happened?"
- "Describe a time you answered someone else's inquiry. What happened?"
- "How is asking a question via Inquiry different from asking in a comment?"

**Behavioral impact** (10 min)
- "Did Inquiry ever change your understanding of a claim?"
- "Did Inquiry ever change your position on a topic?"
- "Did you ever hold back from making a claim because you wanted to ask a question first?"

**Friction** (10 min)
- "What was frustrating about Inquiry?"
- "Was there a time you wanted to ask but didn't? Why?"
- "What would make you use it more?"

**Closing** (5 min)
- "If Inquiry disappeared tomorrow, would you notice?"
- "Is there anything else you want to share?"

#### Interview Scoring Rubric

| Theme | Positive Signal | Negative Signal |
|-------|----------------|-----------------|
| **Discoverability** | "I noticed it right away" | "I didn't see it until week 3" |
| **Intent** | "I asked because I genuinely wanted to know" | "I asked because I wanted to challenge the claim" |
| **Outcome** | "The response helped me understand" | "No one responded / the response was unhelpful" |
| **Behavior change** | "I think more before creating claims now" | "Nothing changed about how I debate" |
| **Emotion** | Curiosity, appreciation | Frustration, indifference |
| **Comparison** | "Better than comments for this" | "I'd rather just comment" |

### Method 4: Behavioral Observation Log

Maintained by the research team. One entry per notable event.

#### Template

```
Date: YYYY-MM-DD
Phase: 1 / 2 / 3

Event Type: inquiry_created / inquiry_responded / status_change / side_switch / claim_revision

Scenario Match: A / B / C / D / E / none

Description:
[Free text — describe what happened]

Behavioral Signal:
[What does this tell us about user behavior?]

Score (1-5):
Engagement Depth: _
Behavioral Change: _
Debate Quality: _
Replicability: _

Observer Notes:
[Anything else noteworthy]
```

---

## Feedback Analysis Framework

### Coding Categories

All collected feedback (survey responses, interview transcripts, observation logs) should be coded into these categories:

| Category | Includes | Example |
|----------|----------|---------|
| **Discoverability** | Noticing the button, understanding its purpose, first-click hesitation | "I didn't see the Inquiry button until I was looking for it" |
| **Intent alignment** | Why users chose Inquiry vs. other actions | "I used Inquiry because I didn't want to take a side" |
| **Response quality** | Whether responses were helpful, timely, substantive | "The response answered my question but took 3 days" |
| **Loop completion** | Satisfaction, closure, abandonment | "I forgot to check back" |
| **Behavioral impact** | Claim revision, side switching, voting changes | "I revised my claim after someone asked about my data" |
| **Friction** | Confusion, frustration, UI issues | "I didn't know I could respond" |
| **Social dynamics** | How inquiry affects relationships between users | "I felt like I was being tested" |
| **Comparison** | Inquiry vs. comments, claims, evidence | "I'd rather ask a question than make a counter-claim" |
| **Feature understanding** | Whether users grasp the lifecycle (types, statuses, satisfied) | "What does Satisfied mean?" |

### Sentiment Scoring

Code each feedback item as:

| Sentiment | Score | Definition |
|-----------|-------|------------|
| Enthusiastic | +2 | Explicit positive mention, would recommend |
| Positive | +1 | Generally favorable, some caveats |
| Neutral | 0 | Factual, no emotional valence |
| Negative | -1 | Generally unfavorable, some positives |
| Hostile | -2 | Explicit negative, would not use again |

### Priority Matrix

For each issue raised in feedback, classify:

| | High Impact | Low Impact |
|----------------|-------------|------------|
| **High Frequency** | FIX IMMEDIATELY — affects core experience | MONITOR — may grow |
| **Low Frequency** | INVESTIGATE — affects key users | LOG — track over time |

---

## Decision Framework

After each phase, aggregate all feedback into a single assessment.

### Phase Assessment Template

```
Phase: 1 / 2 / 3
Date Range: [start] — [end]

BEHAVIORAL METRICS
- Total inquiries: _  (target: _)
- Unique inquirers: _  (target: _)
- Response rate: _%  (target: _%)
- Satisfaction rate: _%  (target: _%)
- Ghost rate: _%  (target: <_%)
- Side switches with inquiry trace: _  (target: _)
- Claim revisions with inquiry trace: _  (target: _)

SURVEY RESULTS (n=_)
- Discovered Inquiry: _%
- Would use again: _%
- Found it confusing: _%
- Mean helpfulness rating: _/5

TOP 3 POSITIVE SIGNALS
1. [signal]
2. [signal]
3. [signal]

TOP 3 CONCERNS
1. [concern]
2. [concern]
3. [concern]

VERDICT
[Pass / Fail / Conditional]

IF CONDITIONAL:
- What must change before next phase?
- What is the minimum improvement threshold?
```

---

## Closing Questions

These are the questions from the user's specification, mapped to collection methods:

| Question | Collection Method | Phase |
|----------|------------------|-------|
| "Did you notice Inquiry?" | Post-phase survey Q1, Interview | All phases |
| "When did you choose Inquiry instead of commenting?" | Post-phase survey Q2, Interview | Phase 2+ |
| "What confused you?" | Post-phase survey Q6, Interview friction segment | Phase 1 |
| "What felt useful?" | Post-phase survey Q7, Interview | All phases |
| "Would you use Inquiry again?" | Post-phase survey Q8 | All phases |

---

## Output Template

At the end of each phase, produce a one-page summary.

```
PHASE [X] SUMMARY

HEADLINE: [One sentence — did Inquiry change behavior?]

BY THE NUMBERS:
- Inquiries: _
- Responses: _
- Satisfied: _
- Side switches: _
- Claim revisions: _

USER VOICE (3 quotes):
> "[quote]"

> "[quote]"

> "[quote]"

BEHAVIORAL CHANGE OBSERVED:
[Yes/No/Inconclusive] — [evidence]

BIGGEST UNANSWERED QUESTION:
[What we still don't know]

NEXT STEP:
[Proceed to next phase / Iterate / Pause]
```
