# Discora - Sprint 6 Execution Plan

Version: 1.0

Status: Proposed

Scope: Phases of Implementation, Immutability Decisions, Questions Review, and Schema Evaluation

---

## 1. Implementation Phases

To minimize architectural risk and manage complexity, Sprint 6 is structured into four distinct, progressive phases.

```
┌─────────────────────────────────┐
│     Phase 1: Claims Foundation  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 2: Sources & Evidence   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 3: Voting & Consensus   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Phase 4: Security & Perf Review │
└─────────────────────────────────┘
```

### Phase 1: Claims Foundation
* **Database Layer**:
  * Create `public.claims` table with check constraints and columns for `room_id`, `created_by`, `origin_message_id`, `content`, `claim_type`, and `identity_mode`.
  * Enable RLS, revoke direct SELECT access from public roles, and create a `security definer` view `public.discussion_claims` to handle dynamic redaction and profile joins.
* **Service Layer**:
  * Implement `getClaims(roomId)` to fetch claims associated with a discussion.
  * Implement `createClaim(data)` supporting direct creation.
  * Implement `extractClaim(messageId, data)` to handle claim promotion from a comment, linking it via `origin_message_id`.
* **UI Components**:
  * Add a **Claims** tab to the `/discussions/[slug]` Room Page layout.
  * Build the **Claim Card** displaying claim type, content, author username, avatar, and extraction link (if applicable).
  * Build the **Extract Claim modal** triggered from comment action menus.

### Phase 2: Sources & Evidence
* **Database Layer**:
  * Create `public.sources` table with columns for `title`, `url`, `file_path`, and `is_retracted`.
  * Create `public.evidence` table with `source_id`, `content`, `evidence_type`, and `identity_mode`.
  * Create `public.claim_evidence` junction table with `direction` constraint.
  * Enable RLS, revoke direct SELECT, and create `security definer` view `public.discussion_evidence` to handle redaction and joins.
* **Service Layer**:
  * Implement `getEvidenceForClaim(claimId)` and `getSourcesForRoom(roomId)`.
  * Implement `createEvidence(claimId, data)` to automate the creation of a source, creation of evidence, and junction table linking.
* **UI Components**:
  * Add an **Evidence** tab and a **Sources** tab to the Room Page.
  * Build the **Evidence Card** (displaying evidence type, content, author, and associated Source link) and nest them inside expanded Claim cards.
  * Build the **Evidence Submission flow** (fields for content, source URL/title, and direction relationship).

### Phase 3: Voting & Consensus
* **Database Layer**:
  * Create `public.claim_votes` and `public.evidence_votes` tables.
  * Apply unique constraints `(user_id, claim_id)` and `(user_id, evidence_id)` to enforce one-vote-per-user-per-entity.
  * Create/update database views to calculate `agree_count`, `disagree_count`, and `consensus_ratio` dynamically.
* **Service Layer**:
  * Implement `castClaimVote(claimId, voteType)` and `castEvidenceVote(evidenceId, voteType)` to handle insert/upsert of votes.
* **UI Components**:
  * Add the **Agree / Disagree dual-button components** to Claim cards and Evidence cards.
  * Wire mutation hooks to handle vote casting, local toggle animations, and invalidation of the claims/evidence query caches.

### Phase 4: Security & Performance Review
* **RLS Policies**:
  * Audit RLS for all new tables (`claims`, `sources`, `evidence`, `claim_votes`, `evidence_votes`). Ensure select policies verify room visibility and insert policies verify authenticated user sessions.
* **Indexing & Performance**:
  * Apply index on `claim_votes(claim_id, vote_type)` and `evidence_votes(evidence_id, vote_type)` to optimize dynamic view groupings.
  * Apply index on `claim_evidence(claim_id, evidence_id)` and `evidence(source_id)`.
* **Anonymity Audit**:
  * Confirm that client payloads never expose raw user IDs for anonymous posts via view logic.

---

## 2. ADR-019 Draft: Claims Are Immutable Knowledge Objects

### Context
Claims in Discora are semantic anchors of debate and consensus. Allowing authors to edit claims after creation introduces significant integrity risks:
* **Semantic Drift**: A user could change a claim from "Treatment X is safe" to "Treatment X is unsafe".
* **Vote Invalidation**: Agree/Disagree votes cast on the original statement become misleading or fraudulent when applied to the edited statement.
* **Evidence Drift**: Evidence attached to support the original thesis may no longer align with the updated claim text.

### Decision
We make Claims strictly **immutable** once inserted. They cannot be updated or modified in any way.
* The database will enforce this via a `BEFORE UPDATE` trigger on `public.claims` that raises an exception for any attempted updates.
* **Retraction**: Claims may be retracted (by setting `is_retracted = true`).
* **No Deletion**: Claims may not be deleted.
* **Historical Integrity**: Historical integrity takes precedence over content removal. To correct a mistake, the user must publish a **new Claim**.

### Future Migration Strategy
If revision history is required in future phases:
* We will establish a separate `public.claim_revisions` archive table.
* Any edit will write the old state to `claim_revisions` and reset the active claim's votes to zero, separating historical vote pools by revision ID.

---

## 3. ADR-021 Draft: Evidence Is Immutable

### Context
Evidence directly validates or contradicts claims. Allowing authors to modify evidence text after publication compromises the logical relationship between the evidence and the claim, making cast votes on the claim invalid or misleading.

### Decision
We make Evidence strictly **immutable** once inserted.
* The database will enforce this via a `BEFORE UPDATE` trigger on `public.evidence` that raises an exception for any updates.
* **Retraction**: Evidence can be retracted (by setting `is_retracted = true`).
* **No Deletion**: Evidence cannot be deleted.
* **Revisions**: Future revisions or updates to evidence require publishing new evidence objects.

---

## 4. Question Architecture Review

In Discora, structured discourse flows from questions to claims:

$$\text{Question} \longrightarrow \text{Claim} \longrightarrow \text{Evidence} \longrightarrow \text{Source}$$

### Current Status
* Sprint 4 includes a basic future-proofing string field `message_type` (`'message' | 'question'`) in `public.messages`.
* Posing a chat message as a question highlights it visually in the thread, but does not create a relational entity.

### Evaluation of Structured Questions
1. **Sprint 6 Implementation (Risks)**:
   * Sprint 6 scope is already extremely large, covering claims, evidence, sources, voting, and dynamic consensus.
   * Implementing Questions as a first-class relational entity (with its own answers mapping, claims linking, and query pipelines) will dramatically increase architectural risk.
2. **Sprint 7 Implementation (Recommendation)**:
   * **Recommendation**: Defer structured Questions to **Sprint 7**.
   * In Sprint 6, users can continue to use `message_type = 'question'` to flag questions in the conversation feed.
   * In Sprint 7, we will introduce first-class Question nodes that allow users to:
     * Post a top-level Question to a Room.
     * Link Claims directly as proposed answers to that Question.
     * Filter the room feed by specific Questions to isolate competing Claims.

---

## 5. Vote Schema Review

We evaluated two database schema configurations for storing user agreement votes:

* **Option A**: A single polymorphic table `agreement_votes(entity_type, entity_id)`
* **Option B**: Separate typed tables `claim_votes` and `evidence_votes`

### Evaluation

1. **Normalization & Referential Integrity**:
   * **Option A** violates standard relational constraints. In PostgreSQL, a foreign key cannot reference different target tables (`claims` or `evidence`) depending on a string field (`entity_type`). This requires omitting foreign keys and relying on custom database triggers to ensure integrity.
   * **Option B** is fully normalized. It utilizes native, database-enforced foreign keys: `claim_id uuid references public.claims` and `evidence_id uuid references public.evidence`. Integrity is guaranteed directly by the PostgreSQL engine.
2. **Indexing**:
   * **Option A** requires a composite index on `(entity_type, entity_id)`.
   * **Option B** utilizes standard B-tree indexes on foreign keys, which are natively optimized and require no conditional lookups.
3. **Query Complexity**:
   * **Option A** simplifies querying all votes cast by a user, but increases the complexity of joins (requiring conditional checks like `entity_id = c.id and entity_type = 'claim'`).
   * **Option B** keeps joins extremely simple and readable. Dynamic consensus views (`discussion_claims` and `discussion_evidence`) can directly join their respective vote tables.
4. **Future Extensibility**:
   * **Option A** makes it easy to add new voteable entities by simply adding an enum value.
   * **Option B** requires creating a new table (e.g. `question_votes`), but this is standard practice and keeps data isolated and type-safe.

### Recommendation
* **Implement Option B (Separate typed tables `claim_votes` and `evidence_votes`)**.
* **Reasoning**: It ensures strict, engine-level referential integrity and database cascade behaviors without trigger complexity. It keeps queries and dynamic views simple, performant, and type-safe.

---

## 6. Sprint 6 Schema & Anonymity Review

We audited the proposed Sprint 6 database schema and identified a critical vulnerability:

### The Anonymity Gap
* **The Issue**: In the initial design, the `claims` and `evidence` tables only contained `created_by` (the author's UUID) and lacked an `identity_mode` column.
* **The Risk**: Without `identity_mode`, there is no database-level indicator to specify if a claim or evidence card was posted publicly or anonymously. Standard SELECT access on `claims.created_by` would leak the author's real identity, violating our core anonymous participation guarantees.
* **The Solution**: 
  * Add `identity_mode` (`'public' | 'anonymous'`) to both `public.claims` and `public.evidence` tables.
  * Revoke direct SELECT privileges on `public.claims` and `public.evidence` for public roles (`anon`, `authenticated`).
  * Query these tables exclusively through `security definer` views (`public.discussion_claims` and `public.discussion_evidence`) that redact `created_by` and join with `profiles` to output `'Anonymous'` for username and `null` for avatar when `identity_mode = 'anonymous'`.

### Normalization and Moderation
* **Normalization**: The structure is highly normalized. Separating `evidence` and `sources` avoids duplication, allowing multiple evidence cards to cite the same PDF or URL.
* **Moderation**: Since sources are immutable and use `is_retracted = true`, moderators can flag and retract spam sources without breaking foreign key relations or deleting historical reference contexts.
