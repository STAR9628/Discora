# Discora - Structured Knowledge Model

Version: 1.0

Status: Proposed

Scope: Core Epistemology, Voting Boundaries, and Consensus Architecture

---

## 1. Epistemological Entity Hierarchy

Discora organizes knowledge into concrete, logically-bound nodes to prioritize structured reasoning over raw discussion engagement.

```
       [Discussion Room]
              │
      ┌───────┴───────┐
      ▼               ▼
  [Message]       [Claim] (Falsifiable Statement)
   (Chat)             ▲
                      │ ( junction table )
                  [Evidence] (Specific interpretation of data)
                      ▲
                      │ (1:many or many:many)
                   [Source] (Raw URL, Document, or Book reference)
```

### Entity Definitions

1. **Discussion**: An open-ended exploration space scoped to a single Topic (e.g. Philosophy, Technology). Contains a chronological feed of free-form Messages and a structured sidebar/tab of Claims.
2. **Question**: A first-class query seeking information, clarification, or evidence.
3. **Claim**: A single, falsifiable statement of Fact, Opinion, Prediction, Proposal, or Observation. Unlike messages, Claims are non-nested, top-level objects in the room.
4. **Evidence**: Concrete data or reasoning supporting, contradicting, or contextualizing a Claim.
5. **Source**: A verified reference link (URL) or uploaded file (PDF/Image) backing up an Evidence card.
6. **Vote**: A binary indicator of user agreement (`Agree` / `Disagree`) cast on a Claim or Evidence card.
7. **Consensus**: A dynamically calculated ratio expressing the level of agreement on a Claim based on cast votes.

---

## 2. Sprint 6 Architectural Revisions & Evaluation

### A. Message $\rightarrow$ Claim Conversion
* **The Concern**: Should users be able to convert a standard conversational Message into a first-class Claim?
* **Analysis**:
  * Direct destructive conversion (replacing a message with a claim card) breaks chronological message history and leaves holes in conversational threads.
  * However, valuable assertions are often drafted during discussion. Forcing users to manually copy/paste them onto a separate Claim form is bad UX.
* **Recommendation**: Implement **Claim Extraction (Promotion)**.
  * A message is not destroyed or replaced.
  * Instead, a user can "Extract Claim" from a message. This creates a new record in `public.claims` that copies the content, but maintains an optional `origin_message_id` foreign key reference pointing to the source message.
  * In the UI, the Claim card shows: `"Asserted by @username (Originally posted in [link to comment])"`.
  * This preserves thread integrity while allowing the statement to be independently debated, voted on, and backed by evidence.

### B. Voting Boundaries
* **The Concern**: Where should votes exist? (Messages, Claims, Evidence, or only Claims and Evidence?)
* **Analysis**:
  * Allowing votes on free-form Messages introduces social gamification (Reddit/social clone upvoting). It prioritizes rhetorical charm, humor, and engagement over truth and structural validation, which violates Discora's core mission.
  * Messages are exploratory and conversational.
  * Claims and Evidence are declarative and falsifiable.
* **Recommendation**: **Restrict voting exclusively to Claims and Evidence**.
  * Free-form Messages will have **no voting mechanism**.
  * This reinforces the principle of **"Evidence over popularity"**: users cannot upvote comments to make them seem true; they must cast formal agreement votes on the underlying Claim or the validity of the submitted Evidence.

### C. Source Relationships
* **The Concern**: Compare `Source -> Evidence -> Claim` (strict pipeline) vs `Source linked directly to everything` (flat).
* **Analysis**:
  * In a flat architecture, users dump raw links (Sources) directly on Claims. This creates clutter; a raw URL (e.g. a Wikipedia link) does not explain *how* or *what part* of the source supports the claim.
  * Epistemologically, a Source is just a reference, whereas Evidence is the *interpretation/extract* of that source supporting a thesis.
* **Recommendation**: **Enforce the strict pipeline**:
  $$\text{Source} \longrightarrow \text{Evidence} \longrightarrow \text{Claim}$$
  * A **Source** (URL/PDF) must be linked to an **Evidence** card.
  * The **Evidence** card then links to the **Claim** via the `claim_evidence` junction table (defining its relation as `support`, `contradict`, or `context`).
  * If a user wants to link a source to a claim, they must write a short explanation of *what* the source proves (forming the Evidence card) and attach the Source to it. This keeps the claim feed clean and intellectually rigorous.

### D. Consensus Calculation
* **The Concern**: How should consensus be calculated? Avoid storing aggregate counts unless justified.
* **Analysis**:
  * Storing `agree_count` and `disagree_count` as columns on `claims` or `evidence` tables risks data drift and race conditions during high concurrent voting.
  * Calculating votes dynamically via standard queries is clean, atomic, and easy to maintain.
* **Recommendation**: Enforce **Dynamic View Aggregations**.
  * Use a database view (e.g. `public.discussion_claims` and `public.discussion_evidence`) that performs dynamic joins and filters.
  * **Formula**:
    $$\text{Consensus Ratio} = \frac{A}{A + D} \times 100$$
    *(where $A$ is Agree counts, $D$ is Disagree counts, returning `null` if $A+D = 0$ to indicate a lack of data).*
  * Database View SQL template:
    ```sql
    create or replace view public.discussion_claims as
    select
      c.*,
      coalesce(v.agree_count, 0) as agree_count,
      coalesce(v.disagree_count, 0) as disagree_count,
      case
        when (coalesce(v.agree_count, 0) + coalesce(v.disagree_count, 0)) = 0 then null
        else round(((v.agree_count::numeric / (v.agree_count + v.disagree_count)) * 100), 2)
      end as consensus_ratio
    from public.claims c
    left join (
      select
        claim_id,
        count(*) filter (where vote_type = 'agree') as agree_count,
        count(*) filter (where vote_type = 'disagree') as disagree_count
      from public.claim_votes
      group by claim_id
    ) v on c.id = v.claim_id;
    ```
