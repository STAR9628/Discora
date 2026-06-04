# Discora — Sprint 8 Architecture Options

## Evaluation of Sprint 8 Architectural Directions

Discora's structured epistemology (Question → Claim → Evidence → Source) requires careful planning before expanding functionality. Below is a detailed evaluation of possible directions for Sprint 8.

---

### 1. Anonymity-Preserving Moderation (Recommended Focus)

* **Benefits:** Necessary for launching public instances. Protects rooms from spam, brigading, and toxic behavior while preserving ADR-016 anonymity.
* **Schema Impact:**
  * New `public.moderation_flags` table (tracks flagged entity ID, entity type, reporter user ID, reason, status, action taken, moderator ID).
  * New `moderator_roles` table or profile metadata attribute.
* **RLS Impact:**
  * standard users can only insert flags (cannot select flags cast by others).
  * Only users with `role = 'moderator'` can select, update, or resolve flags.
  * Security-definer views (`discussion_messages`, `discussion_claims`, etc.) updated to filter out flagged/hidden items.
* **Complexity:** Medium (requires coordinate between auth roles, triggers, and view filters).
* **Risks:** Moderator actions might inadvertently leak anonymous poster identities if flag details expose `created_by` to moderators. (Mitigated by ensuring moderation actions target the entity ID, not the author ID).

---

### 2. Room-Scoped Search & Indexing

* **Benefits:** Helps users discover claims, questions, and evidence across rooms, reducing duplication.
* **Schema Impact:**
  * Add Postgres `tsvector` columns and GIN indexes to `messages`, `questions`, and `claims`.
  * Trigger function to auto-update text vectors.
* **RLS Impact:**
  * Search queries must execute through security-definer functions or views that enforce room access policies (i.e. users can only search public rooms or private rooms they have access to).
* **Complexity:** Low-Medium.
* **Risks:** Indexing private room content and exposing snippets in search results could bypass room visibility rules if the RLS filter is missing on the query function.

---

### 3. Knowledge Pins & Highlights

* **Benefits:** Allows room creators or high-consensus outcomes to highlight key questions or claims, raising signal-to-noise ratio.
* **Schema Impact:**
  * New `public.room_pins` table mapping `room_id`, `entity_type` (question, claim), `entity_id`, and `pinned_at`.
* **RLS Impact:**
  * Only the room creator (or moderators) can insert or delete pins.
* **Complexity:** Low (simple join in views).
* **Risks:** Low risk.

---

### 4. Structured Debate System

* **Benefits:** Evolves discussions into pro/con formatted debates, allowing users to align on opposing stances.
* **Schema Impact:**
  * High. Requires `debates`, `debate_participants`, `stances` (pro/con/neutral), and debate-scoped message tables.
* **RLS Impact:**
  * High complexity. Policies must ensure stance-locked access and participant-specific permissions.
* **Complexity:** Very High (represents a major new feature domain).
* **Risks:** Semantic bloat. Introduces gamified polarization (us vs them) which can violate "understanding over engagement" if not strictly regulated.

---

### 5. AI Summaries & Synthesis

* **Benefits:** Provides automated summaries of room claims and consensus.
* **Schema Impact:**
  * New `public.room_summaries` table to cache generated summaries.
* **RLS Impact:**
  * Read access aligned with room visibility.
* **Complexity:** High (requires edge functions, LLM APIs, and cache invalidation logic).
* **Risks:** Hallucinations could introduce false consensus, diluting the human-asserted evidence and consensus-seeking model of Discora.

---

### 6. Notifications & Subscriptions

* **Benefits:** Alerts users to new claims in rooms they watch or replies to their public messages.
* **Schema Impact:**
  * New `public.subscriptions` and `public.notifications` tables.
* **RLS Impact:**
  * Users can only select or update their own notifications.
* **Complexity:** Medium (requires trigger-based insertions on new messages/claims).
* **Risks:** Spams users, leaning towards engagement metrics over pure truth exploration.

---

### 7. Reputation System

* **Benefits:** Aims to surface credible contributors.
* **Schema Impact:**
  * New reputation score tracking on profiles.
* **RLS Impact:**
  * System-only updates (security definer functions).
* **Complexity:** Medium-High.
* **Risks:** **High Risk.** Directly conflicts with the core principle **"Evidence over popularity"**. Upvoting contributors turns Discora into a popularity contest, leading to echo chambers.

---

## Architectural Comparison Matrix

| Option | Schema Complexity | RLS / View Impact | Risk of Identity Leak | Fit with Core Mission |
|--------|-------------------|-------------------|------------------------|-----------------------|
| **Moderation** | Medium | High | Low (Mitigated) | **High** (Ensures structural safety) |
| **Search** | Low | Medium | Medium | **High** (Facilitates truth discovery) |
| **Pins** | Low | Low | Low | **High** (Curates truth/consensus) |
| **Debate** | High | High | Low | Medium (Can increase polarization) |
| **AI Summaries**| Medium | Low | Low | Low (LLM hallucinations risk) |
| **Notifications**| Medium | Low | Low | Medium (Focuses on engagement) |
| **Reputation** | High | Medium | High | **Negligible / Negative** (Popularity game) |

---

## Recommended Focus Order

1. **Moderation (Sprint 8):** Essential blocker for public deployment and system hygiene.
2. **Search (Sprint 9):** Enables discovering structural data as the platform content grows.
3. **Pins & Highlights (Sprint 10):** Adds editorial/consensus curation features.
4. **Structured Debates (Sprint 11+):** Long-term expansion of the debate framework.
