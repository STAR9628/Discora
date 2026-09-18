# Discora — Phase 9C.1-R: Legal Draft Consistency & Reconciliation Report
## Verification, Policy Alignment & Architecture Harmonization

**Date:** September 14, 2026  
**Auditor:** Antigravity AI Agent  
**Status:** RECONCILIATION AUDIT & CORRECTION COMPLETE  
**Authority Reference:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/00_MASTER_CONTEXT.md`, `docs/PHASE_9B_LEGAL_PRIVACY_READINESS_AUDIT.md`, `docs/PHASE_9B1_LEGAL_REQUIREMENT_VERIFICATION.md`, `docs/PHASE_9C1_LEGAL_DRAFTING_REPORT.md`

---

## 1. Executive Summary

Phase 9C.1-R conducted a rigorous audit and reconciliation pass across the four legal draft instruments created during Phase 9C.1:
1. `docs/legal/TERMS_OF_SERVICE_DRAFT.md`
2. `docs/legal/PRIVACY_POLICY_DRAFT.md`
3. `docs/legal/COMMUNITY_GUIDELINES_DRAFT.md`
4. `docs/legal/GRIEVANCE_POLICY_DRAFT.md`

The objective of this reconciliation pass was to ensure complete fidelity to Discora's locked product decisions and real codebase architecture. Crucially:
- **No premature functional promises:** Any statements implying that automated self-service account deletion is currently active in the UI were replaced with carefully qualified formulations distinguishing approved future product policy from current manual privacy request workflows.
- **Evidence voting references removed:** Discora's approved policy is "EVIDENCE VOTING = NO, FOR NOW." All references to evidence quality voting or evidence scorecards were excised.
- **AI non-authority reinforced:** Confirmed that AI is strictly assistive, non-authoritative, and has zero judicial or truth-adjudicating role.
- **Legal claims calibrated:** Overconfident statements regarding ePrivacy and GDPR extraterritoriality were qualified to reflect assessed operational postures rather than speculative legal certainty.
- **No application implementation was performed:** Zero application source code, zero database schemas, zero migrations, and zero third-party packages were altered.

---

## 2. Corrections Made Overview

| Document | Target Area | Nature of Correction |
|---|---|---|
| `TERMS_OF_SERVICE_DRAFT.md` | Section 1 (Description) | Clarified State of Understanding as an epistemic mapping (Supported, Contested, Unresolved) without truth scoring or scorecards. |
| `TERMS_OF_SERVICE_DRAFT.md` | Section 6.2 (Private Debates) | Specified entry via room access code (removed speculative "room invitations"). |
| `TERMS_OF_SERVICE_DRAFT.md` | Section 7.2 (Votes Are Not Truth) | Removed "evidence quality" voting; reaffirmed that community voting reflects stance, not truth. |
| `TERMS_OF_SERVICE_DRAFT.md` | Section 7.3 (AI Assistance) | Replaced assertions of active fallacy detection with accurate framing of intended assistive capabilities. |
| `TERMS_OF_SERVICE_DRAFT.md` | Section 9.1 & 9.2 (Account Deletion) | Replaced claim of live self-service deletion with statement that self-service is planned for `Settings > Danger Zone`, and deletion is currently available via email request. |
| `TERMS_OF_SERVICE_DRAFT.md` | Section 8.3 & 14 (Route Links) | Updated references to prepare for Phase 9C.2 App Router routes (`/grievance`). |
| `PRIVACY_POLICY_DRAFT.md` | Section 1.C (Interaction Data) | Removed "votes on evidence quality"; confirmed stances are aggregated into local consensus ratios. |
| `PRIVACY_POLICY_DRAFT.md` | Section 3.C (Cookie Banner) | Qualified ePrivacy Art. 5(3) assessment; softened absolute assertions regarding legal exemptions. |
| `PRIVACY_POLICY_DRAFT.md` | Section 5 (Private Debates) | Corrected access mechanism to room access codes. |
| `PRIVACY_POLICY_DRAFT.md` | Section 6 (Retention) | Clarified that discourse persists indefinitely in the database, while 180-day retention applies to operational security logs under CERT-In. |
| `PRIVACY_POLICY_DRAFT.md` | Section 7 & 11 (Account Deletion) | Accurately distinguished the approved future self-service engine from the interim manual privacy request mechanism. |
| `PRIVACY_POLICY_DRAFT.md` | Section 9 (GDPR Posture) | Replaced blanket "does not apply" claim with qualified assessed operational posture and voluntary standards adoption. |
| `COMMUNITY_GUIDELINES_DRAFT.md` | Section 4 (Moderation) | Formulated enforcement actions as discretionary administrative measures rather than guaranteed automated workflows. |
| `COMMUNITY_GUIDELINES_DRAFT.md` | Section 5 (Appeals) | Updated internal route references to `/grievance`. |
| `GRIEVANCE_POLICY_DRAFT.md` | Section 1 (Scope) | Clarified that the mechanism is a draft awaiting operator formal adoption and appointment of the officer. |
| `GRIEVANCE_POLICY_DRAFT.md` | Section 1 (Links) | Updated internal document links to point to `/terms` and `/guidelines`. |

---

## 3. Terms of Service Corrections

1. **State of Understanding Formulation (Section 1):**  
   Now explicitly states: *"Algorithmic syntheses categorizing discussion nodes into areas of support, contestation, and unresolved inquiry without imposing definitive conclusions, scorecards, or truth scores."* This protects Discora against allegations of acting as an automated truth judge.
2. **Private Debate Access (Section 6.2):**  
   Aligned with the live implementation (`private_access_code` verification in `src/features/debates/services/debate-service.ts`). Removed references to non-existent "room invitations".
3. **Removal of Evidence Quality Voting (Section 7.2):**  
   Changed from *"Community voting (agreement, disagreement, evidence quality)"* to *"Community stance indicators (such as agreement or disagreement on claims) reflect collective participant perspectives within a room; they do not establish factual veracity or empirical proof. Discora does not employ evidence-voting scorecards, winner/loser determinations, or truth-scoring algorithms."*
4. **AI Assistance Scope (Section 7.3):**  
   Rephrased to emphasize that AI features are strictly assistive when deployed, and that Discora currently operates without automated arbiters or truth authorities.
5. **Account Deletion Reality Alignment (Section 9.1 & 9.2):**  
   Replaced premature assertion *"You may request or execute the deletion of your Discora account through your Settings > Danger Zone panel"* with:  
   *"Discora intends to provide an automated self-service account deletion mechanism directly within user settings (`Settings > Danger Zone`). Until that automated feature is deployed and activated in the live application, users may submit an account deletion request through our designated privacy contact at `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`."*

---

## 4. Privacy Policy Corrections

1. **Interaction Data Inventory (Section 1.C):**  
   Removed *"votes on evidence quality"*. Accurately lists claim agreement/disagreement stances and lightweight message reactions.
2. **Cookie Banner Legal Basis (Section 3.C):**  
   Replaced categorical claim *"a blocking consent banner is legally unnecessary"* with a qualified assessment: *"Based on our current legal and technical assessment under the European ePrivacy Directive (Directive 2002/58/EC as amended, Article 5(3)) and Indian digital data protection standards, cookies that are strictly necessary to deliver an information society service explicitly requested by the user... do not require prior opt-in consent... We remain committed to ongoing review by legal counsel as regulatory standards evolve."*
3. **Data Retention Distinctions (Section 6):**  
   Distinguished database persistence of published discourse (retained to maintain graph intelligibility, subject to `"Deleted User"` anonymization upon deletion) from operational log retention (at least 180 days under CERT-In directions).
4. **Account Deletion Workflow (Section 7 & Section 11):**  
   Reflected that self-service deletion is the approved future product implementation, while manual privacy requests are currently available. Preserved the approved epistemic retention model: personal identity data permanently purged (`CASCADE`), published contributions retained in anonymized form (`ON DELETE SET NULL`) where legally permitted or required.
5. **GDPR / Territorial Posture (Section 9):**  
   Avoided risky absolute statements (*"GDPR does not apply"*). Formulated as: *"Based on our current operational posture, Discora does not actively market services, conduct commercial transactions, or deliberately target data subjects located in the European Union... However, because public discourse is globally viewable on the open web, statutory applicability remains subject to future factual developments, potential regional targeting, or legal counsel determination."*

---

## 5. Community Guidelines Corrections

1. **Discretionary Enforcement vs Automated Systems (Section 4):**  
   Formulated moderator interventions as discretionary administrative actions (*"platform administrators and moderators may take corrective actions, which may include:"*) rather than promising non-existent automated warning or time-based mute robots.
2. **Epistemic Non-Adjudication Reaffirmed:**  
   Retained the prominent callout: *"Discora does not adjudicate scientific, historical, philosophical, or political truth... We moderate conduct, grounding, citation integrity, and safety, not orthodox consensus."*

---

## 6. Grievance Policy Corrections

1. **Policy Status Qualified (Section 1):**  
   Added qualification that this is a draft policy awaiting formal operator adoption, domain provisioning, and officer appointment.
2. **Statutory Alignment Maintained:**  
   Preserved all required timelines under Indian IT Rules 2021:
   - 24-hour receipt acknowledgment (Rule 3(2)(a))
   - 15-day complaint resolution (Rule 3(2)(a))
   - 24-hour expedited takedown for non-consensual sexual/intimate content (Rule 3(2)(b))
   - 30-day appeal escalation to the Grievance Appellate Committee (GAC) under Rule 3A
   - 180-day log preservation under CERT-In Direction 20(6)
3. **Operator Placeholders Preserved:**  
   All bracketed placeholders for officer name, entity, address, and email remain clearly demarcated.

---

## 7. Evidence Voting Consistency Check

- **Approved Policy:** EVIDENCE VOTING = NO, FOR NOW.
- **Verification:** All four draft files were scanned using ripgrep for `evidence quality`, `evidence vote`, `evidence voting`, and `evidence score`.
- **Result:**
  - `TERMS_OF_SERVICE_DRAFT.md` line 97: Removed `evidence quality`.
  - `PRIVACY_POLICY_DRAFT.md` line 47: Removed `votes on evidence quality`.
  - Zero remaining references to evidence voting exist across the drafts.
  - The documents now strictly reflect claim stances (agree/disagree) and message reactions.

---

## 8. Founding Participant Consistency Check

- **Approved Policy:** Descriptive, noncompetitive, non-authoritative, profile-level recognition only. Zero epistemic weight, zero moderation authority.
- **Verification:**
  - `PRIVACY_POLICY_DRAFT.md` Section 1.A: *"Founding Participant Status: A descriptive profile-level boolean flag granted by the platform to acknowledge early contributors. It carries no authoritative or commercial value."*
  - `COMMUNITY_GUIDELINES_DRAFT.md` Section 3.3: *"Founding Participant Recognition: The 'Founding Participant' badge is a descriptive marker of early platform participation. It confers zero moderation authority, zero epistemic weight, and no special privileges."*
- **Result:** Fully consistent. No founder scorecards, rankings, or privileges exist in the drafts.

---

## 9. AI Authority Consistency Check

- **Approved Policy:** Assistive only. Never a judge, arbiter, oracle, or authority on truth.
- **Verification:**
  - `TERMS_OF_SERVICE_DRAFT.md` Section 7.3: Explicitly establishes that AI on Discora is strictly assistive, not an arbitrator, and that ultimate epistemic evaluation rests with human participants.
  - `GRIEVANCE_POLICY_DRAFT.md` Section 5.1: Explicitly states that formal grievances and appeals are evaluated by human administrators, with zero automated AI decision-making.
- **Result:** Fully consistent with Discora's epistemic philosophy.

---

## 10. Account Deletion Promise vs. Current Implementation

| Dimension | Current Codebase Implementation | Draft Legal Representation Post-Reconciliation |
|---|---|---|
| **Self-Service UI** | Disabled button in `src/features/settings/components/settings-page-client.tsx` with alert: *"Account deletion is not yet available. This feature will be implemented in a future release."* | Accurately states that self-service deletion is planned for `Settings > Danger Zone` in an upcoming release. |
| **Active Deletion Path** | Manual request via privacy contact email. | Accurately directs users to submit deletion requests to `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`. |
| **Database Cascades** | `ON DELETE CASCADE` configured on `profiles`, `user_preferences`, `user_saves`, `votes`, `reactions`. | Accurately describes permanent eradication of personal credentials and profile identity. |
| **Epistemic Retention** | `ON DELETE SET NULL` on `messages`, `claims`, `evidence`, `questions`. Views coalesce author to `"Deleted User"`. | Accurately states that published contributions may be retained in anonymized form as `"Deleted User"` where permitted or required by applicable law to preserve discourse structure. |
| **Storage Cleanup** | Avatars in `avatars` bucket require deletion script/RPC trigger. | Accurately states avatar images in object storage will be permanently deleted. |

---

## 11. Legal Claims Requiring Formal Counsel Review

Prior to public commercial or public beta deployment, the platform operator must have qualified Indian legal counsel review the following specific clauses:

1. **Intermediary Due Diligence Alignment:** Verification of Rule 3(1)(b) terms against the latest gazetted amendments to the IT Rules.
2. **DPDP Rules 2025 Commencement Notice:** Verification of the exact commencement dates for Data Fiduciary notice requirements under Section 5 of the DPDP Act.
3. **Jurisdiction Clause (Terms Section 13):** Confirmation of exclusive jurisdiction venue in `[CITY / STATE, INDIA]` once the operator's corporate entity is incorporated.
4. **ePrivacy & First-Party Cookie Analysis:** Review of the 1-year lifetime of `discora_visited` under applicable European and international privacy guidelines.
5. **Contractual Anonymized Retention Clause (Terms Section 9.3):** Legal confirmation that retaining anonymized user-generated discourse as `"Deleted User"` satisfies Indian DPDP Act right to erasure (Section 12(3)) and GDPR right to erasure (Article 17) where personal identifiers are irreversibly erased.

---

## 12. Remaining Operator Placeholders

The following placeholders remain explicitly bracketed across the four documents and must be populated by the human operator:
- `[OPERATING ENTITY NAME / PROPRIETOR — OPERATOR TO PROVIDE]`
- `[PHYSICAL OPERATING ADDRESS IN INDIA — OPERATOR TO PROVIDE]`
- `[CITY / STATE, INDIA — OPERATOR TO PROVIDE]`
- `[OFFICIAL CONTACT EMAIL — OPERATOR TO PROVIDE]`
- `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`
- `[GRIEVANCE OFFICER NAME — OPERATOR TO PROVIDE]`
- `[OFFICIAL GRIEVANCE CONTACT EMAIL (e.g. grievance@discora.com) — OPERATOR TO PROVIDE]`
- `[EFFECTIVE DATE UPON PUBLIC BETA LAUNCH]`

---

## 13. Phase 9C.2 Preconditions

Before commencing Phase 9C.2 (Legal Routes & UI Integration):
- [x] Phase 9C.1 legal drafts created.
- [x] Phase 9C.1-R consistency audit and reconciliation complete.
- [ ] Product Owner approves the reconciled legal drafts.
- [ ] Operator supplies or acknowledges operator placeholders for initial placeholder rendering.
- [ ] Scope for Phase 9C.2 strictly confined to:
  - Creating App Router pages: `src/app/(legal)/terms/page.tsx`, `privacy/page.tsx`, `guidelines/page.tsx`, `grievance/page.tsx`.
  - Adding clean legal links in `src/features/auth/components/register-form.tsx` (Terms, Privacy, 18+ confirmation).
  - Adding footer links in `/about` and layout navigation.

---

## 14. Governance Confirmation

**No application implementation was performed.**  
- No source code in `src/` was modified.  
- No database tables, columns, or views in `supabase/` were altered.  
- No package dependencies were installed or modified.  
- No live routes were created.  
- No account deletion engine was enabled.
