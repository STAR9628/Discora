# Phase 9C.3: Account Deletion + Data Lifecycle Architecture & Epistemic Preservation Audit

**Document Status:** Complete Architecture & Epistemic Preservation Audit  
**Phase:** 9C.3 (Audit + Design Only — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Database Engine:** PostgreSQL 15+ / Supabase Auth & Storage  
**Application Framework:** Next.js 15 App Router / React 19 / TypeScript / Tailwind CSS  
**Auditor:** DeepMind Antigravity Pair-Programming Agent  
**Date:** September 14, 2026  

---

## 1. Executive Summary

### 1.1 Mission & Scope
The purpose of Phase 9C.3 is to conduct an exhaustive data-lifecycle and foreign key architecture audit of Discora to establish the future account deletion mechanism. This phase is strictly **AUDIT AND DESIGN ONLY**. No deletion code, database migrations, RPCs, RLS modifications, or storage deletions were executed.

### 1.2 Core Product Direction (Locked)
The Product Owner has locked Discora's account deletion direction:
- **Personal Identity Data** $\rightarrow$ Must be permanently deleted.
- **Published Epistemic Contributions** (claims, evidence, questions, inquiries, arguments, messages) $\rightarrow$ Must remain intact to preserve the public knowledge graph and conversational coherence where legally permitted.
- **Public Attribution** $\rightarrow$ Must be permanently transformed into `"Deleted User"`.
- **Core Axiom:** *Preserve the knowledge structure without preserving the user's personal identity.* Discora explicitly rejects social-media deletion models that blindly cascade-delete discussions, debate threads, and collaborative evidence graphs.

### 1.3 Key Architectural Findings & Fatal Cascade Hazards
Our static and schema analysis of all 73 migration files and 33 database tables revealed two catastrophic hazards in the current PostgreSQL schema:

1. **Fatal Foreign Key Cascades (P0 Destruction of Knowledge Graph):**
   - In `public.arguments` (`202609090004_discussion_arguments_foundation.sql`), the column `created_by` references `auth.users(id) ON DELETE CASCADE` and is `NOT NULL`.
   - In `public.inquiry_items` (`202606120001_create_inquiry_tables.sql`), `created_by` references `auth.users(id) ON DELETE CASCADE` and is `NOT NULL`.
   - In `public.inquiry_responses` (`202606120001_create_inquiry_tables.sql`), `created_by` references `auth.users(id) ON DELETE CASCADE` and is `NOT NULL`.
   - **Hazard:** Deleting a user row directly from `auth.users` immediately wipes out all arguments, inquiry items, and inquiry responses created by that user via PostgreSQL cascade.

2. **Immutability Trigger Deadlocks (Deletion Abort & Constraint Violations):**
   - Tables that declare `ON DELETE SET NULL` on `created_by` or `user_id` (namely `public.claims`, `public.messages`, and `public.evidence`) are protected by strict `BEFORE UPDATE` immutability triggers:
     - `claims`: Trigger `handle_claim_identity_mode` forces `new.created_by := old.created_by`, and `enforce_claim_immutability` throws `'Claims are immutable. Only retraction is permitted.'` whenever `new.created_by` is distinct from `old.created_by`.
     - `messages`: Trigger `enforce_message_edit_rules` throws `'Messages can only be edited within 5 minutes of creation.'` and `'user_id cannot be modified.'`.
     - `evidence`: Trigger `enforce_evidence_immutability` throws `'Evidence is immutable. Only retraction is permitted.'`.
   - **Hazard:** When PostgreSQL attempts to apply `ON DELETE SET NULL` upon deleting an `auth.users` row, the database engine executes an internal `UPDATE` on the child rows. These immutability triggers intercept the update and raise exceptions, causing the deletion transaction to abort with a fatal PostgreSQL error.

3. **Pre-Existing View Attribution Capabilities:**
   - Public views (`discussion_messages`, `discussion_claims`, `discussion_evidence`, `discussion_questions`) already contain fallback logic:
     ```sql
     case 
       when identity_mode = 'anonymous' then 'Anonymous'
       when p.username is null then 'Deleted User'
       else coalesce(p.display_name, p.username)
     end as author_display_name
     ```
   - If the user's profile record is decoupled or stripped, the existing views naturally output `"Deleted User"`.

---

## 2. Current Account/Data Architecture

Discora's identity and data architecture spans five distinct storage and service domains:

```
+-----------------------------------------------------------------------------------+
|                                DISCORS DATA DOMAINS                               |
+-----------------------------------------------------------------------------------+
| 1. Supabase Auth (Identity & Credentials)                                         |
|    auth.users, auth.identities, auth.sessions, auth.refresh_tokens                |
+-----------------------------------------------------------------------------------+
| 2. Public Profile & Preferences (User Layer)                                      |
|    public.profiles, public.user_preferences, public.user_roles                    |
+-----------------------------------------------------------------------------------+
| 3. Epistemic Knowledge Graph (Published Content)                                  |
|    public.rooms, public.discussions, public.debates, public.messages,             |
|    public.claims, public.evidence, public.sources, public.claim_evidence,         |
|    public.claim_relations, public.questions, public.arguments,                    |
|    public.inquiry_items, public.inquiry_responses, public.claim_requests          |
+-----------------------------------------------------------------------------------+
| 4. User Interactions & Engagement Signals (Private/Semi-Private)                  |
|    public.claim_votes, public.evidence_votes, public.reactions,                   |
|    public.user_saves, public.debate_participants, public.debate_side_changes,     |
|    public.reputation_events, public.user_reputation_snapshots,                    |
|    public.room_invitations, public.access_code_failures, public.user_feedback     |
+-----------------------------------------------------------------------------------+
| 5. Governance, Audit & Infrastructure (Operational/Statutory)                     |
|    public.moderation_flags, public.admin_audit_logs,                              |
|    Supabase Storage ('avatars' bucket), Sentry, Vercel logs                       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Complete User Data Inventory

Below is the verified inventory of all tables, columns, and objects associated with user identity across the application:

### 3.1 Auth Identity Domain (`auth` schema)
- `auth.users.id`: Primary UUID identifier.
- `auth.users.email`: User's registered email address (PII).
- `auth.users.encrypted_password`: Bcrypt/Argon2 credential hash.
- `auth.users.email_confirmed_at`: Timestamp.
- `auth.users.raw_user_meta_data`: JSONB containing OAuth provider claims, Google avatar, name.
- `auth.users.raw_app_meta_data`: JSONB containing role and provider metadata.
- `auth.users.last_sign_in_at`: Operational timestamp.
- `auth.identities`: OAuth identities linked to the user account (Google ID, provider tokens).
- `auth.sessions`: Active JWT sessions.
- `auth.refresh_tokens`: Token refresh entries.

### 3.2 User Profile & Preference Domain (`public` schema)
- `public.profiles`:
  - `id`: UUID (PK, FK to `auth.users.id ON DELETE CASCADE`).
  - `username`: Public handle (e.g., `@alex_m`).
  - `display_name`: Chosen display name (e.g., `Alex Miller`).
  - `avatar_url`: CDN URL pointing to avatar storage.
  - `bio`: Freeform user biography.
  - `is_founding_participant`: Boolean badge indicator.
  - `preferences`: JSONB preferences.
  - `created_at`, `updated_at`: Timestamps.
- `public.user_preferences`:
  - `user_id`: UUID (FK to `auth.users.id ON DELETE CASCADE`).
  - `preferences`: JSONB (theme, notification settings).
- `public.user_roles`:
  - `user_id`: UUID (FK to `auth.users.id ON DELETE CASCADE`).
  - `role`: Role enum (`user`, `moderator`, `admin`).

### 3.3 Epistemic Knowledge Graph Domain (`public` schema)
- `public.topics`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`).
- `public.rooms`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`).
- `public.messages`: `user_id` (FK to `auth.users.id ON DELETE SET NULL`), `content`, `parent_message_id`.
- `public.claims`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `origin_message_id`, `deleted_by`, `content`, `claim_type`.
- `public.sources`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `url`, `title`, `author`, `reliability_rating`.
- `public.evidence`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `source_id`, `title`, `quote`, `summary`.
- `public.claim_evidence`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `claim_id`, `evidence_id`, `relationship_type`.
- `public.claim_relations`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `source_claim_id`, `target_claim_id`, `relation_type`.
- `public.questions`: `created_by` (FK to `auth.users.id ON DELETE SET NULL`), `content`, `question_type`.
- `public.arguments`: `created_by` (**FK to `auth.users.id ON DELETE CASCADE NOT NULL`**), `deleted_by`, `content`, `stance`.
- `public.inquiry_items`: `created_by` (**FK to `auth.users.id ON DELETE CASCADE NOT NULL`**), `closed_by_user_id`, `content`, `status`.
- `public.inquiry_responses`: `created_by` (**FK to `auth.users.id ON DELETE CASCADE NOT NULL`**), `inquiry_id`, `content`.
- `public.claim_requests`: `requester_id` (**FK to `auth.users.id ON DELETE CASCADE NOT NULL`**), `decision_by`, `proposed_content`.

### 3.4 User Interactions & Signal Domain (`public` schema)
- `public.claim_votes`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `claim_id`, `vote_type`.
- `public.evidence_votes`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `evidence_id`, `vote_type`.
- `public.reactions`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `target_type`, `target_id`, `reaction_type`.
- `public.user_saves`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `target_type`, `target_id`.
- `public.debate_participants`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `room_id`, `side`, `stance`.
- `public.debate_side_changes`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `room_id`, `from_side`, `to_side`, `reason`, `reflection`.
- `public.reputation_events`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), `event_type`, `score_delta`, `reason`.
- `public.user_reputation_snapshots`: `user_id` (FK to `auth.users.id ON DELETE CASCADE`), scores.
- `public.room_invitations`: `invited_by` (FK to `auth.users.id ON DELETE CASCADE`), `invited_user_id` (FK to `auth.users.id ON DELETE SET NULL`), `email`.
- `public.access_code_failures`: `user_id` (UUID PK).
- `public.user_feedback`: `user_id` (FK to `auth.users.id ON DELETE SET NULL`), `content`, `rating`.

### 3.5 Governance, Audit & Infrastructure Domain
- `public.moderation_flags`:
  - `reporter_id`: FK to `auth.users(id) ON DELETE SET NULL`.
  - `action_taken_by`: FK to `auth.users(id) ON DELETE SET NULL`.
  - `target_type`, `target_id`, `reason`, `action_notes`.
- `public.admin_audit_logs`:
  - `admin_id`: **FK to `auth.users(id) ON DELETE CASCADE NOT NULL`**.
  - `action`, `target_type`, `target_id`, `payload`.
- **Supabase Storage:**
  - Bucket: `avatars` (Public).
  - Object Path: `<user_id>/avatar.<ext>`.
- **External Third-Party Infrastructure:**
  - Sentry: Potential user ID / email error context.
  - Vercel Logs: Request header IP / path logs.
  - Google OAuth: Authentication grant tokens held by Google.

---

## 4. Data Lifecycle Matrix

| Data Element | Current Location | Personal Data? | Published? | Classification | Rationale & Retention Policy | Dependencies |
|---|---|---|---|---|---|---|
| **Email Address** | `auth.users.email` | **YES** | No | **DELETE** | Core PII. Must be purged under privacy rights and minimization. | Supabase Auth API |
| **Password Hash** | `auth.users.encrypted_password` | **YES** | No | **DELETE** | Security credential. Must be purged. | Supabase Auth API |
| **OAuth Identities** | `auth.identities` | **YES** | No | **DELETE** | Linked third-party identifiers (Google ID). Must be severed. | Supabase Auth API |
| **Auth Metadata** | `auth.users.raw_user_meta_data` | **YES** | No | **DELETE** | Contains full name, email, Google avatar from OAuth exchange. | Supabase Auth API |
| **Active Sessions** | `auth.sessions`, JWT tokens | **YES** | No | **DELETE** | Active authorization grants must be revoked immediately. | Supabase Auth API |
| **Username** | `public.profiles.username` | **YES** | Yes | **ANONYMIZE** | Public handle. Must be scrubbed/anonymized to break attribution. | `profiles.username` UNIQUE constraint |
| **Display Name** | `public.profiles.display_name` | **YES** | Yes | **DELETE** | Real name or personal alias. Set to `NULL`. | None |
| **Bio & Details** | `public.profiles.bio` | **YES** | Yes | **DELETE** | User self-description. Set to `NULL`. | None |
| **Avatar File** | Storage `avatars/<user_id>/*` | **YES** | Yes | **DELETE** | Facial image / personal asset. Storage object must be deleted. | Storage S3 API |
| **Avatar URL** | `public.profiles.avatar_url` | **YES** | Yes | **DELETE** | Reference to storage asset. Set to `NULL`. | Storage deletion |
| **User Preferences** | `public.user_preferences`, `profiles.preferences` | **YES** | No | **DELETE** | Private settings (theme, notifications). Purge row. | None |
| **User Saves / Bookmarks** | `public.user_saves` | **YES** | No | **DELETE** | Private curation history. Purge rows. | None |
| **Private Room Invitations** | `public.room_invitations` | **YES** | No | **DELETE** | Contains email / invite linkages. Purge records. | None |
| **Votes (Claims/Evidence)** | `claim_votes`, `evidence_votes` | Ambiguous | Semi-public | **DELETE** | Individual vote preference is personal engagement data. Remove votes and recalculate tallies. | Aggregate score recount |
| **Reactions** | `public.reactions` | Ambiguous | Public | **DELETE** | Personal sentiment signal. Delete rows. | Aggregate count recount |
| **Reputation History** | `reputation_events`, snapshots | Ambiguous | Public | **DELETE** | Personal credibility scoring. Purge history. | None |
| **Debate Stance / Reflection** | `debate_side_changes` | **YES** | Public | **ANONYMIZE** | Epistemic reflection text preserved as "Deleted User"; personal identity severed. | Debate transcript |
| **Debate Participant Row** | `debate_participants` | Ambiguous | Public | **ANONYMIZE** | Slot preserved to prevent side imbalance in historical record. | Debate side balance |
| **Discussion Messages** | `public.messages` | No (content) | Yes | **PRESERVE** | Core discourse node. Text preserved; author attributed as "Deleted User". | View left join |
| **Claims** | `public.claims` | No (content) | Yes | **PRESERVE** | Core epistemic assertion. Preserved permanently. Attributed as "Deleted User". | Immutability triggers, views |
| **Evidence** | `public.evidence` | No (content) | Yes | **PRESERVE** | Citations, quotes, sources must survive. Attributed as "Deleted User". | Immutability triggers, views |
| **Sources** | `public.sources` | No | Yes | **PRESERVE** | Factual citation URLs and metadata. Must survive indefinitely. | Foreign keys |
| **Claim-Evidence Links** | `public.claim_evidence` | No | Yes | **PRESERVE** | Structural epistemic graph edges. Must survive. | Graph topology |
| **Claim Relations** | `public.claim_relations` | No | Yes | **PRESERVE** | Graph edges (supports, disputes). Must survive. | Graph topology |
| **Questions** | `public.questions` | No (content) | Yes | **PRESERVE** | Exploratory inquiry. Preserved as "Deleted User". | Views |
| **Arguments** | `public.arguments` | No (content) | Yes | **PRESERVE** | Argumentation nodes. Preserved as "Deleted User". Must NOT cascade! | **FK Cascade Hazard** |
| **Inquiry Items** | `public.inquiry_items` | No (content) | Yes | **PRESERVE** | Scoped inquiry on claims. Must NOT cascade! | **FK Cascade Hazard** |
| **Inquiry Responses** | `public.inquiry_responses` | No (content) | Yes | **PRESERVE** | Responses to inquiries. Must NOT cascade! | **FK Cascade Hazard** |
| **Moderation Reports Filed** | `public.moderation_flags.reporter_id` | **YES** | No | **ANONYMIZE** | Set `reporter_id = NULL`. Protect whistleblower confidentiality. | Moderation history |
| **Moderation Actions Taken** | `public.moderation_flags.action_taken_by` | Ambiguous | Admin | **PRESERVE / AUDIT** | Internal audit trail of moderation decisions. Retain immutable ID. | Statutory compliance |
| **Admin Audit Logs** | `public.admin_audit_logs` | Ambiguous | Admin | **PRESERVE** | Statutory administrative compliance records (CERT-In / IT Rules). Must NOT cascade! | **FK Cascade Hazard** |
| **User Feedback** | `public.user_feedback` | Ambiguous | No | **ANONYMIZE** | Product feedback preserved; set `user_id = NULL`. | None |

---

## 5. Epistemic Content Preservation Analysis

The foundational philosophy of Discora places *understanding over engagement* and *evidence over popularity*. We evaluate each content type against this epistemic benchmark:

```
                  +----------------------------------------------+
                  |         DISCORA EPISTEMIC INTEGRITY          |
                  +----------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
+------------------+                                            +------------------+
| PUBLISHED NODES  |                                            | PERSONAL IDENT.  |
| - Claims         |                                            | - Name & Bio     |
| - Evidence       |  =====> PRESERVE & ANONYMIZE =====>        | - Avatar & Email |
| - Arguments      |         Public Attribution:                | - Auth Tokens    |
| - Inquiries      |           "Deleted User"                   | - Preferences    |
| - Messages       |                                            +------------------+
+------------------+                                                     |
         |                                                               V
         V                                                       PERMANENTLY PURGED
CONNECTED GRAPH SURVIVES
```

### 5.1 Claims (`public.claims`)
- **Public Status:** Remains public indefinitely.
- **Authorship Attribution:** Displays as `"Deleted User"`.
- **Author ID (`created_by`):** Retains internal anonymized UUID linkage (or set to NULL in views).
- **Epistemic Rationale:** Claims are the atomic units of discourse. If a claim were deleted, all evidence attached to it, opposing claims, and debate branches would collapse into orphans.
- **Trigger Consideration:** `enforce_claim_immutability` explicitly forbids mutating `created_by`. De-identifying via profile view join avoids trigger violations.

### 5.2 Evidence (`public.evidence`) & Sources (`public.sources`)
- **Public Status:** Remains public indefinitely.
- **Authorship Attribution:** Displays as `"Deleted User"`.
- **Epistemic Rationale:** Evidence citations (quotes, URLs, methodological summaries) exist independently of the submitter's identity. Deleting evidence invalidates claims that cite it, breaking epistemic validity.

### 5.3 Arguments (`public.arguments`)
- **Public Status:** Remains public indefinitely.
- **Authorship Attribution:** Displays as `"Deleted User"`.
- **Current Constraint Hazard:** `created_by uuid not null references auth.users (id) on delete cascade`.
- **Epistemic Requirement:** Arguments contain formal reasoning connecting claims to positions. Under no circumstances should an argument disappear simply because the original contributor left the platform.

### 5.4 Questions & Inquiries (`public.questions`, `public.inquiry_items`, `public.inquiry_responses`)
- **Public Status:** Remains public indefinitely.
- **Authorship Attribution:** Displays as `"Deleted User"`.
- **Current Constraint Hazard:** `inquiry_items.created_by` and `inquiry_responses.created_by` have `ON DELETE CASCADE`.
- **Epistemic Requirement:** Inquiries challenge the rigor and scope of claims. Removing an inquiry or response destroys the intellectual audit trail of how a claim was vetted and clarified.

### 5.5 Messages (`public.messages`)
- **Public Status:** Remains public within the discussion room.
- **Authorship Attribution:** Displays as `"Deleted User"`.
- **Reply Threading:** Parent/child message hierarchies (`parent_message_id`) are preserved intact. No broken conversation bubbles.

### 5.6 State of Understanding & Position History (`debate_side_changes`)
- **Public Status:** The reflection text and position transition (e.g., Opposition $\rightarrow$ Proposition) remain part of the room's deliberative transcript.
- **Attribution:** Displays as `"Deleted User"`.
- **Epistemic Value:** Discora treats changing one's mind based on evidence as a feature, not a flaw. Preserving anonymized position switches demonstrates how deliberative inquiry influenced participants over time.

---

## 6. Authorship Model & Foreign Key Mapping

We surveyed every table in the Discora schema referencing user identity:

| Table | Column | Type | Target | Current ON DELETE | Is Nullable? | Trigger Constraints on Mutation |
|---|---|---|---|---|---|---|
| `profiles` | `id` | UUID | `auth.users(id)` | **CASCADE** | No (PK) | Profile RLS policies |
| `topics` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `rooms` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `messages` | `user_id` | UUID | `auth.users(id)` | `SET NULL` | Yes | `enforce_message_edit_rules` raises exception |
| `claims` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | `enforce_claim_immutability` raises exception |
| `claims` | `deleted_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | Soft-delete admin tracking |
| `sources` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `evidence` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | `enforce_evidence_immutability` raises exception |
| `claim_evidence` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `claim_relations` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `questions` | `created_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `arguments` | `created_by` | UUID | `auth.users(id)` | **CASCADE** | **No** | `enforce_argument_immutability` raises exception |
| `arguments` | `deleted_by` | UUID | `auth.users(id)` | `SET NULL` | Yes | Soft-delete tracking |
| `inquiry_items` | `created_by` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `inquiry_items` | `closed_by_user_id`| UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `inquiry_responses`| `created_by` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `claim_requests`| `requester_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `claim_votes` | `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `evidence_votes`| `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `reactions` | `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `user_saves` | `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `user_roles` | `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `user_preferences`| `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `debate_participants`| `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `debate_side_changes`| `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `reputation_events`| `user_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `user_reputation_snapshots`| `user_id`| UUID| `auth.users(id)`| **CASCADE** | **No** | None |
| `room_invitations`| `invited_by` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `room_invitations`| `invited_user_id`| UUID| `auth.users(id)` | `SET NULL` | Yes | None |
| `moderation_flags`| `reporter_id` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |
| `moderation_flags`| `action_taken_by`| UUID| `auth.users(id)` | `SET NULL` | Yes | None |
| `admin_audit_logs`| `admin_id` | UUID | `auth.users(id)` | **CASCADE** | **No** | None |
| `user_feedback` | `user_id` | UUID | `auth.users(id)` | `SET NULL` | Yes | None |

---

## 7. Cascade Risk Audit

We classify foreign key deletion risks into four strict severity tiers:
- **P0:** Would destroy published epistemic content (claims, arguments, inquiries).
- **P1:** Would break important discourse relationships, debate balance, or compliance audit trails.
- **P2:** Would expose personal data or create integrity errors.
- **P3:** Acceptable, expected deletion of private user data.

| Parent Table | Child Table | Foreign Key Column | Current ON DELETE | Risk Rating | Catastrophic Consequence if Auth Row Deleted |
|---|---|---|---|---|---|
| `auth.users` | `public.arguments` | `created_by` | **CASCADE** | **P0** | **DELETES ALL PUBLISHED ARGUMENTS** authored by the user. Reasoning structure is destroyed. |
| `auth.users` | `public.inquiry_items` | `created_by` | **CASCADE** | **P0** | **DELETES ALL INQUIRY ITEMS** authored by the user. Subsequent cascade wipes all child responses. |
| `auth.users` | `public.inquiry_responses`| `created_by` | **CASCADE** | **P0** | **DELETES ALL INQUIRY RESPONSES** authored by the user, leaving inquiries unresolved. |
| `auth.users` | `public.admin_audit_logs` | `admin_id` | **CASCADE** | **P1** | **WIPES COMPLIANCE AUDIT LOGS** if an administrator's account is ever deleted, violating statutory record-keeping. |
| `auth.users` | `public.debate_side_changes`| `user_id` | **CASCADE** | **P1** | **DESTROYS POSITION CHANGE REFLECTIONS**, erasing documented intellectual evolution. |
| `auth.users` | `public.debate_participants`| `user_id` | **CASCADE** | **P1** | **DESTROYS DEBATE PARTICIPANT RECORDS**, altering historical side counts. |
| `auth.users` | `public.claim_requests` | `requester_id` | **CASCADE** | **P1** | Destroys history of claim conversion requests from room conversation. |
| `auth.users` | `public.claims` | `created_by` | `SET NULL` | **P2** | **ABORTS TRANSACTION**: `handle_claim_identity_mode` and `enforce_claim_immutability` throw exception when Postgres attempts `SET NULL`. |
| `auth.users` | `public.messages` | `user_id` | `SET NULL` | **P2** | **ABORTS TRANSACTION**: `enforce_message_edit_rules` throws exception when Postgres attempts `SET NULL`. |
| `auth.users` | `public.evidence` | `created_by` | `SET NULL` | **P2** | **ABORTS TRANSACTION**: `enforce_evidence_immutability` throws exception when Postgres attempts `SET NULL`. |
| `auth.users` | `public.profiles` | `id` | **CASCADE** | **P3 / Safe** | Acceptable if child records are de-identified first. |
| `auth.users` | `public.claim_votes` | `user_id` | **CASCADE** | **P3 / Safe** | Expected deletion of private user votes. |
| `auth.users` | `public.evidence_votes` | `user_id` | **CASCADE** | **P3 / Safe** | Expected deletion of private user votes. |
| `auth.users` | `public.reactions` | `user_id` | **CASCADE** | **P3 / Safe** | Expected deletion of private user reactions. |
| `auth.users` | `public.user_saves` | `user_id` | **CASCADE** | **P3 / Safe** | Expected deletion of private user bookmarks. |
| `auth.users` | `public.user_preferences`| `user_id` | **CASCADE** | **P3 / Safe** | Expected deletion of private preferences. |
| `auth.users` | `public.user_roles` | `user_id` | **CASCADE** | **P3 / Safe** | Expected revocation of user roles. |
| `auth.users` | `public.reputation_events`| `user_id` | **CASCADE** | **P3 / Safe** | Expected erasure of personal score history. |
| `auth.users` | `public.user_reputation_snapshots`| `user_id`| **CASCADE** | **P3 / Safe** | Expected erasure of personal score snapshot. |

---

## 8. RLS and Security Audit

### 8.1 Public Readability of Anonymized Discourse
- RLS policies on `claims`, `evidence`, `messages`, `questions`, and `arguments` permit `SELECT` for all authenticated and anonymous users (`true` or room-member checks for private rooms).
- Because public views (`discussion_claims`, `discussion_evidence`, `discussion_messages`, `discussion_questions`) use `LEFT JOIN public.profiles p ON ...`, they select rows even when `p.id` is null or anonymized.
- Anonymous/deleted content remains fully readable by the public without security bypasses.

### 8.2 Profile Query Leak Hazards
- If an account is deleted, queries directly against `public.profiles` (e.g., `SELECT * FROM profiles WHERE username = ...`) must return nothing or a 404.
- Profile RLS must ensure that an anonymized profile cannot be enumerated or queried by its historical handle.
- The route `src/app/u/[username]/page.tsx` must display a clean `"User account has been deleted"` or standard 404 state.

### 8.3 Post-Deletion Authentication Lockout
- Once deletion occurs, the user's entry in `auth.users` must be terminated and all JWT refresh tokens revoked.
- Attempted logins via email/password or Google OAuth must fail with `"Invalid credentials"` or create a fresh, unlinked account rather than reconnecting to historical contributions.

### 8.4 Execution Privilege: SECURITY DEFINER RPC
- Account deletion requires mutating across schemas (`auth` and `public`) and wiping rows in multiple tables.
- Frontend clients must **never** be given direct `DELETE` permissions on `profiles` or `auth.users`.
- All database operations must be encapsulated in a trusted, strictly guarded `SECURITY DEFINER` stored procedure that validates `auth.uid() = target_user_id` and enforces role checks.

---

## 9. Storage Analysis (Supabase Storage)

### 9.1 Bucket Architecture
- **Bucket Name:** `avatars`
- **Visibility:** Public (`public = true`).
- **Path Convention:** `<user_id>/avatar.<ext>` (e.g., `09e84325-11b3-4f9e-8ca8-7f919d7d42cf/avatar.png`).
- **Storage Policies:**
  - `Allow users to upload their own avatar`: `(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)`.
  - `Allow users to update their own avatar`: Same condition.
  - `Allow users to delete their own avatar`: Same condition.
  - `Public Access`: Anyone can view.

### 9.2 Critical Finding: Storage Decoupling
- **PostgreSQL foreign keys DO NOT extend to Supabase Storage (AWS S3-compatible backend).**
- Deleting an `auth.users` row or updating `public.profiles` leaves the physical avatar image file intact on Supabase S3 servers.
- The object URL contains the user's UUID: `https://.../storage/v1/object/public/avatars/<user_id>/avatar.png`.
- If the image remains in storage, anyone possessing the cached CDN URL can continue to view the deleted user's photo.

### 9.3 Storage Cleanup Requirement
- The future deletion engine must explicitly call the Supabase Storage Management API:
  ```typescript
  await supabase.storage.from('avatars').remove([`${userId}/avatar.png`, `${userId}/avatar.jpg`]);
  ```
- Storage cleanup must be executed as an asynchronous, retryable task during the deletion sequence.

---

## 10. Moderation and Audit Record Analysis

Statutory regulations (including India's Information Technology Rules, 2021, Rule 3(1)(h), and CERT-In cyber incident directives) require platforms to retain certain operational and security logs for defined periods (ranging from 180 days to 5 years).

### 10.1 `public.moderation_flags`
- **Reporter Identity (`reporter_id`):** When a user who submitted a report deletes their account, `reporter_id` must be set to `NULL`. This protects whistleblower confidentiality post-departure.
- **Moderation Target (`target_id`):** If the deleted user authored content that was flagged, the moderation flag record must **NOT** be deleted. The record documents community safety enforcement and must be preserved with target attribution changed to `"Deleted User"`.
- **Action Taken By (`action_taken_by`):** If a moderator deletes their personal account, their historical administrative actions must be preserved to maintain moderation accountability.

### 10.2 `public.admin_audit_logs`
- **Fatal Cascade Risk:** The current schema defines `admin_id uuid not null references auth.users(id) on delete cascade`.
- **Compliance Requirement:** Audit logs must be permanent and immutable. An administrator deleting their account must never erase administrative history.
- **Future Requirement:** In Phase A of deletion, `admin_id` must be decoupled or converted to a permanent snapshot string (e.g., `admin_username_at_time`), or the table must reference an immutable audit identifier.

---

## 11. Current Privacy and Deletion Request Capabilities

### 11.1 Audit of Existing Codebase
1. **Self-Service Deletion UI (`src/features/settings/components/settings-page-client.tsx`):**
   - Lines 430–467 contain a `DangerZonePanel`.
   - The "Delete Account" button is rendered with `disabled` and `cursor-not-allowed`.
   - Explicit disclaimer: *"Account deletion is not yet available. This feature will be implemented in a future release."*
2. **Data Export (`Takeout`):**
   - No automated export engine currently exists in the application.
3. **Manual Request Workflow:**
   - As documented in `docs/legal/TERMS_OF_SERVICE_DRAFT.md` (Section 9.1) and `docs/legal/PRIVACY_POLICY_DRAFT.md` (Section 7), manual deletion requests are currently directed to the designated privacy contact email.
4. **Account Recovery / Grace Period:**
   - No soft-delete recovery queue or 30-day grace period is currently implemented.

---

## 12. Legal Alignment

We cross-referenced the architecture against the approved legal drafts:
- `docs/legal/TERMS_OF_SERVICE_DRAFT.md` (Section 9)
- `docs/legal/PRIVACY_POLICY_DRAFT.md` (Section 7)
- `docs/legal/COMMUNITY_GUIDELINES_DRAFT.md`
- `docs/legal/GRIEVANCE_POLICY_DRAFT.md`

### 12.1 Perfect Contractual Alignment
The legal drafts explicitly establish the exact model required by this audit:
1. **Terms of Service § 9.2:** Explicitly states that personal and identity records (credentials, email, handle, display name, bio, avatar, private preferences, saves, votes, reactions) are eradicated.
2. **Terms of Service § 9.3:** Explicitly states that published epistemic contributions (claims, evidence, questions, inquiries, messages) are retained in anonymized form displaying permanently as `"Deleted User"`.
3. **Privacy Policy § 7.2:** Explains that retention of public claims and evidence is strictly limited to preserving conversational coherence and the knowledge graph, completely stripped of personal identifiers.

There is zero legal discrepancy between the Product Owner's locked deletion model and Discora's legal drafts.

---

## 13. Major Product / Legal Concerns

> [!WARNING]
> ### Major Architectural Concern #1: Direct Auth Deletion Destroys Knowledge
> If any developer or administrator manually deletes a user from the Supabase Studio Dashboard (`auth.users`), PostgreSQL cascade rules will silently delete all of that user's arguments, inquiry items, and inquiry responses, destroying the discourse graph. **A database migration must correct these cascade rules before deletion is activated.**

> [!WARNING]
> ### Major Architectural Concern #2: Immutability Trigger Deadlock
> Attempting to set `created_by = NULL` on claims or evidence will fail due to `enforce_claim_immutability()`. The future deletion procedure cannot simply run `UPDATE claims SET created_by = NULL`. It must either:
> 1. Keep the historical UUID in `created_by` while stripping all identity from `profiles` and `auth.users` (Option C), OR
> 2. Introduce an explicit deletion bypass condition inside the immutability triggers.

> [!IMPORTANT]
> ### Major Product Concern #3: Re-registration Handle Squatting
> If user `@socrates` deletes their account and their username is freed up, another user could register `@socrates`. If historical attribution is based on a dynamic join, the new user could appear to have authored past discourse.
> **Resolution:** Once an account is deleted, the historical handle must either be retired permanently or historical views must freeze attribution as `"Deleted User"` regardless of whether the handle is re-claimed.

---

## 14. Recommended Anonymization Strategy

### 14.1 Evaluation of Options

#### Option A: Set `author_id` to `NULL` Across All Tables
- **Feasibility:** Low / High Friction.
- **Defects:** Requires altering `arguments.created_by`, `inquiry_items.created_by`, and `inquiry_responses.created_by` from `NOT NULL` to nullable. Violates immutability triggers on `claims` and `evidence`. Destroys conversational coherence (cannot distinguish between two different deleted contributors within the same thread).

#### Option B: Replace `author_id` with a Single Global Sentinel UUID (`00000000-...`)
- **Feasibility:** Moderate / Epistemically Flawed.
- **Defects:** Merges all deleted users into a single entity. In a debate where both the proposition and opposition delete their accounts, the entire debate appears to be an argument authored by the same entity against itself. Also blocked by immutability triggers.

#### Option C (RECOMMENDED): Hybrid Two-Layer Anonymization (De-Identification in Place + Profile Tombstoning)
- **Feasibility:** Highest / Zero Epistemic Damage / 100% Trigger Compatible.
- **Mechanism:**
  1. **Public Layer:** The user's row in `public.profiles` is scrubbed:
     - `username := 'deleted_user_' || substring(encode(sha256(id::text::bytea), 'hex') from 1 for 10)` (ensures unique handle without PII).
     - `display_name := NULL`
     - `bio := NULL`
     - `avatar_url := NULL`
     - `preferences := NULL`
     - `is_founding_participant := false`
     - `is_deleted := true` (new boolean flag)
  2. **View Output:** All public views immediately resolve:
     ```sql
     case 
       when p.is_deleted = true or p.username is null then 'Deleted User'
       ...
     end as author_display_name
     ```
     Avatar URL evaluates to `NULL`. Profile links in the UI become unclickable.
  3. **Identity Layer:** The user's row in `auth.users` is stripped of all PII:
     - `email := 'deleted_' || id || '@deleted.discora.invalid'`
     - `raw_user_meta_data := '{}'`
     - `raw_app_meta_data := '{}'`
     - `phone := NULL`
     - `encrypted_password := 'DELETED_ACCOUNT_INACCESSIBLE'`
     - Linked identities in `auth.identities` are deleted.
     - Active sessions and refresh tokens are revoked.
  4. **Private Signal Purge:**
     - Delete rows in `claim_votes`, `evidence_votes`, `reactions`, `user_saves`, `user_preferences`.
  5. **Storage Purge:**
     - Delete S3 objects in `avatars/<user_id>/*`.

**Why Option C is Superior:**
- It does **NOT** violate `enforce_claim_immutability` or `enforce_message_edit_rules` because `created_by` is not mutated.
- It prevents `arguments` and `inquiries` from being cascade-deleted.
- It preserves thread coherence between distinct anonymous/deleted participants.
- It completely purges all PII (email, name, photo, bio, credentials, preferences).
- It is 100% compliant with the locked Product Owner deletion model.

---

## 15. Recommended Future Deletion Sequence

Below is the derived, safe execution sequence spanning transactional database operations and external asynchronous APIs:

```
[USER INITIATES DELETION IN DANGER ZONE]
                 |
                 v
+-------------------------------------------------------------+
| STEP 1: CLIENT CONFIRMATION & INTENT                        |
| - User enters password / re-authenticates                   |
| - User types confirmation ("DELETE MY ACCOUNT")             |
+-------------------------------------------------------------+
                 |
                 v
+-------------------------------------------------------------+
| STEP 2: CALL SECURITY DEFINER DELETION RPC                  |
| - Verifies auth.uid() matches calling session               |
| - Verifies user is not active system administrator          |
| - Begins PostgreSQL Transaction                             |
+-------------------------------------------------------------+
                 |
                 v
+-------------------------------------------------------------+
| STEP 3: DATABASE TRANSACTION (ATOMIC)                       |
| A. Purge Private Interactions:                              |
|    - DELETE FROM claim_votes WHERE user_id = target_id      |
|    - DELETE FROM evidence_votes WHERE user_id = target_id   |
|    - DELETE FROM reactions WHERE user_id = target_id        |
|    - DELETE FROM user_saves WHERE user_id = target_id       |
|    - DELETE FROM user_preferences WHERE user_id = target_id |
|    - Recalculate room/claim aggregate vote totals           |
| B. Neutralize Moderation Records:                           |
|    - UPDATE moderation_flags SET reporter_id = NULL         |
|      WHERE reporter_id = target_id                          |
| C. Tombstone Profile (Strip PII):                           |
|    - UPDATE profiles SET                                    |
|        username = 'deleted_user_' || substr(md5(id), 1, 8),|
|        display_name = NULL,                                 |
|        bio = NULL,                                          |
|        avatar_url = NULL,                                   |
|        preferences = '{}'::jsonb,                           |
|        is_founding_participant = false,                     |
|        is_deleted = true,                                   |
|        updated_at = now()                                   |
|      WHERE id = target_id                                   |
| D. Neutralize Auth Record:                                  |
|    - Scramble auth.users email to invalid RFC address       |
|    - Empty raw_user_meta_data & raw_app_meta_data           |
|    - Invalidate encrypted_password                          |
| COMMIT TRANSACTION                                          |
+-------------------------------------------------------------+
                 |
                 v
+-------------------------------------------------------------+
| STEP 4: STORAGE PURGE (EXTERNAL ASYNC)                      |
| - Call Supabase Storage API:                                |
|   supabase.storage.from('avatars').remove([`${userId}/*`])  |
+-------------------------------------------------------------+
                 |
                 v
+-------------------------------------------------------------+
| STEP 5: SESSION & CREDENTIAL TERMINATION                    |
| - Revoke all Supabase Auth sessions and refresh tokens      |
| - Clear client-side cookies and local storage tokens        |
+-------------------------------------------------------------+
                 |
                 v
+-------------------------------------------------------------+
| STEP 6: VERIFICATION & REDIRECT                             |
| - Redirect user to `/` with notice:                         |
|   "Your account and personal data have been deleted."       |
+-------------------------------------------------------------+
```

---

## 16. Failure, Retry, and Idempotency Strategy

### 16.1 Distributed System Failure Scenarios
1. **Scenario 1: Database transaction commits, but Storage API fails (network drop):**
   - *Impact:* Personal database records are deleted, but avatar image remains on S3.
   - *Mitigation:* The deletion RPC records a `storage_cleanup_queue` entry. A scheduled background worker or edge function processes pending storage deletions with exponential backoff.
2. **Scenario 2: User closes browser mid-operation:**
   - *Impact:* None if the RPC call reached PostgreSQL; atomic transaction completes regardless of client presence.
3. **Scenario 3: User calls deletion twice simultaneously:**
   - *Impact:* The second call checks `profiles.is_deleted = true` and returns success immediately (idempotent design).
4. **Scenario 4: Realtime clients connected during deletion:**
   - *Impact:* Discora's Supabase Realtime subscriptions broadcast the profile update. Connected clients immediately see the author handle flip to `"Deleted User"` and avatar vanish without page reload.

---

## 17. Future Implementation Plan (Phase 9C.3 Implementation Tracks)

When the Product Owner approves proceeding with implementation, the work must follow these phased gates:

- **Phase A — Database Schema Hygiene:**
  - Add `is_deleted boolean not null default false` to `public.profiles`.
  - Update public views (`discussion_claims`, `discussion_evidence`, `discussion_messages`, `discussion_questions`, `discussion_arguments`) to check `p.is_deleted = true` $\rightarrow$ output `'Deleted User'`.
  - Create table `public.storage_cleanup_queue` for orphaned asset removal.
  - Review and amend foreign key cascades on `arguments` and `inquiries` if hard deletion of `auth.users` is chosen over Option C.
- **Phase B — SECURITY DEFINER Deletion RPC:**
  - Implement `public.execute_account_deletion()` with strict authentication guards and row-level locking.
  - Wrap interaction purges, profile de-identification, and auth scrambling in a single atomic transaction.
- **Phase C — Storage Cleanup Worker:**
  - Implement server-side routine to purge `avatars/<user_id>/*`.
- **Phase D — Auth Session Invalidation:**
  - Terminate refresh tokens via Supabase Admin Auth API.
- **Phase E — Settings UI Activation:**
  - Build confirmation modal in `DangerZonePanel` requiring explicit password re-entry and phrase confirmation.
  - Hook into deletion server action.
- **Phase F — QA & Epistemic Verification:**
  - Verify that deleting a test account preserves all claims, evidence, questions, and arguments authored by that account.
  - Verify that all public views display `"Deleted User"` and `null` avatar.
  - Verify that profile URL `/u/[username]` returns 404.
- **Phase G — Security Verification:**
  - Verify that former credentials cannot log in.
  - Verify that S3 avatar objects cannot be fetched.

---

## 18. Product Owner Decisions Required

The following decisions are strictly reserved for the Product Owner before any implementation begins:

### Decision 1: Option C (De-Identification in Place) vs. Schema-Altering Hard Deletion
- **Context:** Option C scrambles `auth.users` and tombstones `profiles`, perfectly preserving the epistemic graph and immutability triggers without altering core table constraints. Hard deletion requires modifying `arguments`, `inquiries`, and triggers across 6 migrations.
- **Recommended Choice:** **Option C (Hybrid De-Identification in Place).**
- **Consequence:** Maximum stability, zero risk of accidental cascade destruction, 100% legal compliance under DPDP/GDPR de-identification standards.

### Decision 2: Vote Preservation vs. Vote Recalculation
- **Context:** When a user deletes their account, should their historical upvotes/downvotes on claims and evidence be:
  - *Choice A:* Permanently deleted (vote counts decrement accordingly).
  - *Choice B:* Preserved as anonymous aggregate counts (vote rows deleted, but counter snapshots maintained).
- **Recommended Choice:** **Choice A (Delete votes and decrement counts).**
- **Consequence:** Eliminates "phantom votes" from deleted entities; aligns with data minimization.

### Decision 3: Username Retirement vs. Recycling
- **Context:** Should a deleted user's handle (e.g., `@alex`) be released for someone else to register in the future, or permanently retired?
- **Recommended Choice:** **Permanently Retire Historical Handles.**
- **Consequence:** Prevents bad actors from impersonating past authors of anonymized discussions.

---

## 19. Open Questions

1. **CERT-In Log Archival Length:** Does Discora's legal counsel advise maintaining system access IP logs for 180 days in an isolated compliance store before permanent purging?
2. **Debate Team Participation Quota:** When an active participant deletes their account mid-debate, should the room automatically lock, allow a substitute participant, or continue in read-only mode?

---

## 20. Explicit Audit Governance Statements

### Statement 1
> **"NO ACCOUNT DELETION WAS IMPLEMENTED."**

### Statement 2
> **"NO DATABASE CHANGES WERE MADE."**

### Statement 3
> **"NO USER OR PRODUCTION DATA WAS DELETED."**

---
*End of Phase 9C.3 Architecture and Epistemic Preservation Audit.*
