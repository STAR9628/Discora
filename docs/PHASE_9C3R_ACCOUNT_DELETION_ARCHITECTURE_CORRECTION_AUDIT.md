# Phase 9C.3-R: Account Deletion Architecture Correction Audit

**Document Status:** Architecture Correction & Alignment Audit  
**Phase:** 9C.3-R (Correction & Reconciliation Phase — No Implementation)  
**Target Repository:** Discora (`STAR9628/Discora`)  
**Auditor:** DeepMind Antigravity Pair-Programming Agent  
**Date:** September 14, 2026  

---

## 1. Executive Summary

Following Product Owner review of the initial Phase 9C.3 audit (`docs/PHASE_9C3_ACCOUNT_DELETION_ARCHITECTURE_AUDIT.md`), this correction audit formalizes necessary engineering revisions, eliminates unsupported legal compliance claims, disambiguates legacy database artifacts from active product capabilities, and cements the implementation specification (`docs/PHASE_9C3R_ACCOUNT_DELETION_IMPLEMENTATION_SPEC.md`).

This phase is strictly **AUDIT AND SPECIFICATION ONLY**. No application source code, database migrations, RPCs, or storage objects were altered.

---

## 2. What From Phase 9C.3 Remains Approved

1. **Option C — Hybrid De-Identification in Place:**
   - The Product Owner has formally locked **Option C**. The technical foreign-key anchor (user UUID) is preserved in `auth.users` with all personal data stripped, avoiding fatal cascade drops on published content and deadlocks with PostgreSQL immutability triggers (`enforce_claim_immutability`, `enforce_message_edit_rules`, `enforce_evidence_immutability`).
2. **Epistemic Graph Preservation:**
   - Claims, evidence citations, questions, structured inquiries, inquiry responses, arguments, and discussion messages remain permanent nodes in Discora's public knowledge graph.
3. **Public Attribution as `"Deleted User"`:**
   - Public views continue to dynamically project `"Deleted User"` and `author_avatar_url = null` once a profile is tombstoned (`is_deleted = true`).
4. **Physical S3 Storage Cleanup:**
   - The audit's finding that Supabase Storage is decoupled from PostgreSQL foreign keys is confirmed: personal avatars in `avatars/<user_id>/*` must be explicitly purged via the Storage API.

---

## 3. Critical Corrections Made in Phase 9C.3-R

### 3.1 Correction 1: Reframing Legal Claims
- **Previous Finding:** The 9C.3 report stated that the proposed architecture was *"100% legally compliant under DPDP/GDPR"*.
- **Correction:** Engineering audits establish *technical alignment with product intent, data minimization properties, and system security constraints*; engineering cannot certify statutory compliance or legal exemptions.
- **Revised Position:** The architecture is **architecturally aligned with the approved product model; formal legal counsel verification remains required** regarding statutory retention frameworks (e.g., India IT Rules 2021 Rule 3(1)(h), CERT-In cyber incident directives, and the Digital Personal Data Protection Act, 2023).

### 3.2 Correction 2: Disambiguation of Evidence Voting (Active Feature vs. Legacy DB Artifact)
- **Previous Finding:** 9C.3 discussed *"votes on claims and evidence"* and proposed recalculating evidence vote tallies upon account deletion.
- **Correction:** In Phase 7D (`docs/PHASE_7D_PRE_IMPLEMENTATION_GATE.md`), the Product Owner explicitly ruled: **EVIDENCE VOTING = NO, FOR NOW.** The UI for evidence voting was already removed in Phase 7D. The table `public.evidence_votes` exists purely as a dormant database artifact from Sprint 6 (`202606030006`).
- **Revised Position:** Evidence voting is **NOT** an active product capability. No UI or voting logic will be resurrected or added. The future deletion engine simply deletes legacy `evidence_votes` rows belonging to the deleted account as routine data lifecycle hygiene.

### 3.3 Correction 3: Supabase Auth De-Identification Model
- **Previous Finding:** 9C.3 proposed direct SQL scrambling of `auth.users` without detailing GoTrue interactions.
- **Correction:** Direct SQL manipulation of `auth.users` can desynchronize Supabase GoTrue's internal state machine (OAuth provider mappings, JWT session caching).
- **Revised Position:** The de-identification model is refined into a coordinated procedure:
  1. The database de-identification RPC clears `raw_user_meta_data`, scrambles `email` using RFC 2606's unroutable `.invalid` domain (`deleted_<uuid>@deleted.invalid`), wipes `phone`, and sets `banned_until = '2999-12-31'`.
  2. Crucially, rows in `auth.identities` must be deleted; otherwise, the user's Google sub ID, OAuth access token, and Google profile image URL persist in GoTrue.
  3. All rows in `auth.sessions` and `auth.refresh_tokens` are purged to ensure immediate token revocation.

### 3.4 Correction 4: Administrative Audit Logs & Governance Accountability
- **Previous Finding:** 9C.3 noted that `admin_audit_logs.admin_id` cascades on user delete and suggested replacing it with a username string.
- **Correction:** Administrative accountability cannot rely on mutable strings. An administrator must not be able to wipe statutory compliance logs simply by deleting their personal account.
- **Revised Position:** 
  1. Active administrators and moderators are **hard-blocked from self-deletion** via the Danger Zone. Their privileged roles must be formally revoked by the platform owner first.
  2. In Phase A, `admin_audit_logs.admin_id` will be decoupled from `ON DELETE CASCADE` and set to `ON DELETE RESTRICT`, preserving permanent auditability under CERT-In guidelines.

### 3.5 Correction 5: Permanent Handle Retirement Policy
- **Previous Finding:** 9C.3 recommended retiring handles, but did not specify the database enforcement mechanism.
- **Correction:** Under the Product Owner's locked directive, **historical handles are permanently retired**.
- **Implementation Mechanism:** 
  - A new table `public.retired_handles (handle text primary key, retired_at timestamptz)` is established.
  - An `INSERT/UPDATE` trigger on `public.profiles.username` (`check_username_not_retired()`) rejects any attempt by new registrants to claim a retired handle. This eliminates the risk of future users impersonating historical authors or hijacking legacy `@mentions`.

---

## 4. What Was Rejected

1. **Option A (Hard Foreign Key SET NULL):** Rejected due to immutability trigger deadlocks on `claims`, `evidence`, and `messages`, and because it causes conversational thread incoherence.
2. **Hard Deletion of `auth.users` Rows:** Rejected because `arguments`, `inquiry_items`, and `inquiry_responses` have `ON DELETE CASCADE` foreign keys that would obliterate published epistemic reasoning.
3. **Handle Recycling:** Rejected because recycling handles permits identity impersonation and misattribution of historical markdown quotes.
4. **Client-Side Direct Deletion APIs:** Rejected. The client must never have direct write access to `auth.users` or storage cleanup. All operations must run via authenticated server actions and `SECURITY DEFINER` procedures.

---

## 5. Legal Draft Consistency Check

We verified the deletion architecture against Discora's approved legal drafts:

### 5.1 Major Product / Legal Concerns
> [!WARNING]
> ### Major Concern 1: Self-Service Deletion Timeline vs. Legal Policy Text
> - **Issue:** `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §9.1 and `docs/legal/PRIVACY_POLICY_DRAFT.md` §7 state: *"Discora intends to provide an automated self-service account deletion mechanism directly within user settings (`Settings > Danger Zone`). Until that automated feature is deployed and activated in the live application, users may submit an account deletion request through our designated privacy contact..."*
> - **Current State:** In `src/features/settings/components/settings-page-client.tsx`, the Delete Account button is correctly disabled with an explicit notice that deletion is not yet available.
> - **Action Required:** When Phase 9C.4 (Implementation) is eventually authorized and deployed, the operator must verify that the privacy contact email placeholder (`[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`) in the legal policies is populated with real operator contact details.

### 5.2 Minor Consistency Concerns
> [!NOTE]
> ### Minor Concern 1: Terminology Around "Votes"
> - **Issue:** Terms §9.2 mentions the deletion of *"votes, and reactions"*.
> - **Reconciliation:** This accurately describes the deletion of `public.claim_votes` and `public.reactions`. Legacy `public.evidence_votes` rows are also purged in the database as part of schema hygiene, but evidence voting is not referenced or advertised as an active capability.

---

## 6. Product Decisions Locked

| Decision | Approved Choice | Rationale |
|---|---|---|
| **Deletion Model** | **Option C: Hybrid De-Identification in Place** | Preserves knowledge graph; avoids trigger deadlocks and fatal cascades; purges all PII. |
| **Handle Policy** | **Permanent Handle Retirement** | Prevents impersonation; preserves legacy quote context; blocks handle squatting. |
| **Evidence Voting** | **STRICTLY NO FOR NOW** | Dropped in Phase 7D; legacy table treated strictly as cleanup target. |
| **Claim Voting** | **Purge Individual Vote Rows** | Votes are private interaction signals; removing them removes personal stances while leaving claims intact. |
| **Storage Asset** | **Physical Purge from S3** | Avatar image files must be deleted via Storage API to prevent orphan asset exposure. |
| **Admin Safeguard**| **Block Admin Self-Deletion** | Protects administrative accountability and compliance audit trails. |

---

## 7. Legal Counsel Dependencies

Formal legal counsel review is required before production deployment on the following items:
1. **CERT-In 180-Day System Log Retention:** Verification that server-level network and IP access logs can be maintained for 180 days in an isolated security store while user-level database records are de-identified.
2. **IT Rules 2021 Rule 3(1)(h) Retention:** Verification of statutory record-keeping periods for account registration logs following user-initiated account termination.
3. **Anonymization Standard Verification:** Confirmation under DPDP Act 2023 that irreversible de-identification of published discourse satisfies statutory erasure requirements.

---

## 8. Technical Dependencies

1. **PostgreSQL 15+:** `SECURITY DEFINER` procedural support and row-level locking (`FOR UPDATE`).
2. **Supabase GoTrue Admin API:** Service role client required for `auth.admin.signOut()` and OAuth identity severance.
3. **Supabase Storage API:** S3 management client required for `supabase.storage.from('avatars').remove()`.
4. **TanStack Query / App Router:** Client-side cache invalidation and session cookie clearance.

---

## 9. Implementation Stop Condition & Governance Verification

> **GOVERNANCE CONFIRMATION:**  
> - **NO ACCOUNT DELETION FUNCTIONALITY WAS IMPLEMENTED.**  
> - **NO DATABASE MIGRATIONS WERE CREATED OR APPLIED.**  
> - **NO USER OR PRODUCTION DATA WAS DELETED OR MUTATED.**  
> - **APPLICATION SOURCE CODE REMAINS COMPLETELY UNCHANGED.**  
>  
> Phase 9C.3-R is complete. Implementation is gated behind separate, explicit Product Owner authorization.

---
*End of Phase 9C.3-R Architecture Correction Audit.*
