# Discora — Sprint 8 Product Vision

## Vision Statement
With the foundational elements of rooms, messages, first-class questions, claims, evidence, sources, and consensus voting fully implemented, Discora must evolve from a functional prototype to a production-viable community platform. The primary goal of Sprint 8 is to introduce **Anonymity-Preserving Moderation**, establishing the security, safety, and administrative mechanisms required to launch public discussion spaces without compromising user privacy.

By enabling clean, structured curation and protection against spam, hate speech, and bad-faith manipulation, Sprint 8 ensures that Discora remains true to its core mission: **understanding over engagement** and **evidence over popularity**.

---

## Sprint 8 Goals
* **Administrative Moderation:** Implement a secure, role-based moderation system allowing authorized moderators to flag, hide, or redact abusive content (messages, questions, claims, and evidence).
* **Anonymity Preservation (ADR-016 Compliance):** Ensure moderators can perform their duties (hiding spam, locking threads) without ever exposing the raw user identity (`created_by`) of anonymous posters.
* **Database-Driven Content Lifecycles:** Allow moderators to lock rooms, archive discussions, and hide flagged posts directly via table updates and trigger validation.
* **Zero Popularity Gamification:** Maintain the product boundary of no upvoting/downvoting on messages or users.

---

## Non-Goals
* **Polymorphic Voting:** We will not make questions or users votable. Votes remain strictly on Claims and Evidence.
* **AI summaries:** Automatic summaries of rooms or claims are out of scope to avoid hallucination and maintain purely human-asserted knowledge.
* **Debate Spaces:** Formal debating layouts (pro/con user match, live debate rooms) remain deferred to future sprints.
* **Global Notifications:** Real-time push notifications or email alerts are deferred.

---

## Success Metrics
1. **Zero Identity Leaks:** 100% of moderator actions (flagging, hiding) are executed without exposing the underlying user IDs of anonymous authors.
2. **Moderation Latency:** Flagged content can be hidden globally in less than 500ms via database view filtering.
3. **Audit Trail Integrity:** Every moderation action is logged with an immutable audit record, preventing moderator abuse.

---

## User Stories

### For Users
* **As a User**, I want to report bad-faith arguments, spam, or abusive behavior in a room so that the discussion remains constructive and intellectually honest.
* **As an Anonymous Poster**, I want to know that reporting my content or flagging it for review will not expose my real username or user ID to the moderators.

### For Moderators
* **As a Moderator**, I want to review flagged items and hide content that violates platform guidelines so that discussion spaces are safe and clean.
* **As a Moderator**, I want to lock a discussion thread or room to prevent new posts when a discussion has run its course or is being brigaded.

---

## Feature Priorities

| Priority | Feature | Description | Target |
|----------|---------|-------------|--------|
| **P0** | **Moderation Logs & Flags** | DB table and schema to track reported content (claims, evidence, questions, messages). | Database |
| **P0** | **Spam/Abuse View Filtering** | Update `discussion_*` views to filter out content flagged as "hidden" or "deleted by mod". | Views / RLS |
| **P1** | **Moderator Roles** | Introduce authorization mapping (moderator claim in JWT or profile flag). | Auth / Policies |
| **P1** | **Moderator UI Panel** | Basic UI to view reported entities and perform toggle actions (hide/dismiss). | Frontend |
| **P2** | **Room Locking** | Ability to set `status = 'inactive'` or lock discussions, disabling new inserts. | Triggers |
