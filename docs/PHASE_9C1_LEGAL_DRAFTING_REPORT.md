# Discora — Phase 9C.1: Legal Document Drafting Report
## Documentation & Statutory Drafting Audit for Public Beta Readiness

**Date:** September 14, 2026  
**Auditor:** Antigravity AI Agent  
**Status:** DRAFTING COMPLETE — ZERO APPLICATION CODE MODIFICATIONS  
**Authority Reference:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/00_MASTER_CONTEXT.md`, `docs/PHASE_9B_LEGAL_PRIVACY_READINESS_AUDIT.md`, `docs/PHASE_9B1_LEGAL_REQUIREMENT_VERIFICATION.md`

---

## 1. Executive Summary

This report documents the completion of Phase 9C.1 (Legal Document Drafting) for the Discora platform. In accordance with strict governance instructions, four comprehensive draft legal instruments have been created under `docs/legal/`:
1. `docs/legal/TERMS_OF_SERVICE_DRAFT.md`
2. `docs/legal/PRIVACY_POLICY_DRAFT.md`
3. `docs/legal/COMMUNITY_GUIDELINES_DRAFT.md`
4. `docs/legal/GRIEVANCE_POLICY_DRAFT.md`

All four documents incorporate the product decisions approved by the Product Owner (18+ Public Beta eligibility, and anonymized knowledge graph retention on account deletion), strictly reflect the real technical architecture of Discora, and use standardized placeholders for operator-dependent fields (such as Grievance Officer name, corporate entity, address, and production email).

**Zero application code changes, zero database migrations, and zero package installations were made during this phase.**

---

## 2. Documents Drafted

| Document File | Purpose & Regulatory Alignment | Core Topics Covered | Current Status |
|---|---|---|---|
| **`TERMS_OF_SERVICE_DRAFT.md`** | User Agreement & Contract under Indian Contract Act, 1872 & IT Act, 2000 | 18+ eligibility, account registration, intermediary prohibited conduct (IT Rules 3(1)(b)), UGC license, epistemic limitations (votes are not truth, non-authoritative AI), account deletion, governing law. | **DRAFT — Needs operator details & legal review** |
| **`PRIVACY_POLICY_DRAFT.md`** | Data Processing & Device Storage Notice under IT Rules 2021 & DPDP Act 2023 | Itemized data inventory (identity, discourse, interaction, moderation, technical), subprocessor listing, dedicated Cookies & Device Storage section (justifying absence of banner), retention schedules, account deletion mechanics. | **DRAFT — Needs operator details & legal review** |
| **`COMMUNITY_GUIDELINES_DRAFT.md`** | Epistemic Integrity & Discourse Safety Standards | Epistemic standards for claims, evidence citations, and inquiries; prohibited harassment, hate speech, doxxing, and CSAM; explanation of epistemic metrics; moderation workflow and appeals. | **DRAFT — Ready for review** |
| **`GRIEVANCE_POLICY_DRAFT.md`** | Statutory Grievance Mechanism under Rule 3(2) of IT Rules, 2021 | Procedural complaint mechanisms, designated Grievance Officer placeholders, 24-hr acknowledgment, 15-day disposal, 24-hr expedited CSAM/nudity takedowns, Grievance Appellate Committee (GAC) escalation. | **DRAFT — NOT READY FOR PUBLICATION (Operator details pending)** |

---

## 3. Product Decisions Incorporated

1. **Age Eligibility (18+ Only for Public Beta):**
   - **Incorporated in:** `TERMS_OF_SERVICE_DRAFT.md` Section 2 and `PRIVACY_POLICY_DRAFT.md` Section 8.
   - **Wording Nuance:** Declares that users must be at least 18 years of age. Confirms data minimization (Discora does not collect date of birth or require identity documents). Reserves the right to terminate accounts discovered to belong to minors.
2. **Account Deletion & Epistemic Graph Retention:**
   - **Incorporated in:** `TERMS_OF_SERVICE_DRAFT.md` Section 9 and `PRIVACY_POLICY_DRAFT.md` Section 7.
   - **Wording Nuance:** Personal and identity data (credentials, profile, bio, avatar, preferences, saves, votes) are permanently erased. Published discourse (claims, evidence, inquiries, messages) **may be retained in anonymized form where permitted or required by applicable law**, with public attribution permanently set to `"Deleted User"` to prevent structural collapse of public discussions.
3. **Grievance Officer Placeholders:**
   - **Incorporated in:** `TERMS_OF_SERVICE_DRAFT.md` Section 14, `PRIVACY_POLICY_DRAFT.md` Section 11, and `GRIEVANCE_POLICY_DRAFT.md` Section 2.
   - **Constraint Respected:** No fictitious officer names, corporate entities, physical addresses, or email addresses were invented.

---

## 4. Current Authoritative Legal Sources Checked

1. **Information Technology Act, 2000 (India Code):** Sections 2(1)(w) (Intermediary definition), 43A (Data protection), and 79 (Intermediary liability safe harbor).
2. **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:**
   - Rule 3(1)(a): Mandatory publication of rules, regulations, privacy policy, and user agreement.
   - Rule 3(1)(b): Intermediary due diligence categories of prohibited user conduct.
   - Rule 3(2): Grievance redressal mechanism, 24-hour acknowledgment, 15-day resolution, and 24-hour expedited removal for intimate imagery.
   - Rule 3A: Grievance Appellate Committee (GAC) escalation.
3. **Digital Personal Data Protection Act, 2023:** Sections 2(t) (Personal data definition), 5 (Notice requirements), 6 (Consent parameters), 9 (Children's data rules), and 12(3) (Right to erasure).
4. **CERT-In Cyber Security Directions (April 28, 2022):** Direction 20(5) (6-hour mandatory reporting for material cybersecurity incidents) and Direction 20(6) (180-day log preservation).
5. **Directive 2002/58/EC (EU ePrivacy Directive, as amended) & EDPB Guidelines 3/2018:** Article 5(3) exemptions for strictly necessary and functional state cookies; Article 3(2) territorial scope parameters.

---

## 5. Operator Placeholders (To Be Provided Prior to Publication)

The following fields are explicitly marked with brackets in all draft documents and must be populated by the human operator:

- `[OPERATING ENTITY NAME / PROPRIETOR — OPERATOR TO PROVIDE]`
- `[PHYSICAL OPERATING ADDRESS IN INDIA — OPERATOR TO PROVIDE]`
- `[CITY / STATE, INDIA — OPERATOR TO PROVIDE]` (Governing jurisdiction)
- `[OFFICIAL CONTACT EMAIL — OPERATOR TO PROVIDE]`
- `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`
- `[GRIEVANCE OFFICER NAME — OPERATOR TO PROVIDE]`
- `[OFFICIAL GRIEVANCE CONTACT EMAIL (e.g. grievance@discora.com) — OPERATOR TO PROVIDE]`
- `[EFFECTIVE DATE UPON PUBLIC BETA LAUNCH]`

---

## 6. Architecture Assumptions & Validation

The draft documents assume the following validated architectural facts from the codebase:
- **Zero Third-Party Ad Trackers:** Verified in `package.json` and network requests.
- **Two First-Party Cookies:** `discora_visited` (routing state, 1 year, Lax, no PII) and `sb-<ref>-auth-token` (Supabase Auth session token, HttpOnly, Lax).
- **Four Browser Storage Keys:** `discora_onboarding_v1` (localStorage), `discora_sidebar_collapsed` (localStorage), `theme` (localStorage), and `discora_intelligence_collapsed` (sessionStorage).
- **Sentry Privacy Guard:** When enabled, Sentry strips `ip_address`, `email`, `username`, `authorization`, and `cookie` headers in `beforeSend`, and session replay is completely disabled (`replaysSessionSampleRate: 0`).
- **Database Cascades:** Foreign keys on `public.profiles`, `user_preferences`, and `user_saves` use `ON DELETE CASCADE`. Foreign keys on `messages`, `claims`, `evidence`, and `questions` use `ON DELETE SET NULL`.

---

## 7. Areas Where Implementation Must Match Documents (Phase 9C.2 & 9C.3)

When moving from documentation to implementation, the application must be updated to align with the drafted commitments:

1. **Registration Form Legal Links (Phase 9C.2):**  
   `src/features/auth/components/register-form.tsx` must display non-conflated legal text below the primary actions:
   *"By creating an account, you agree to our [Terms of Service] and acknowledge our [Privacy Policy]. You confirm you are at least 18 years old."*
2. **Legal Page Routes (Phase 9C.2):**  
   Implement `src/app/(legal)/terms/page.tsx`, `privacy/page.tsx`, `guidelines/page.tsx`, and `grievance/page.tsx` rendering the drafted content with standard clean typography.
3. **Legal Navigation Links (Phase 9C.2):**  
   Add links in `/about` footer and `src/components/layout/sidebar.tsx` pointing to the legal routes.
4. **Self-Service Account Deletion Engine (Phase 9C.3):**  
   Implement the `delete_user_account()` RPC in a new database migration, execute avatar storage pruning, and enable the currently disabled Delete Account button in `src/features/settings/components/settings-page-client.tsx`.

---

## 8. Areas Where Documents Must NOT Promise Premature Behavior

To avoid deceptive legal claims or regulatory liability:
- The Privacy Policy does **not** claim a self-service automated Data Export (SAR) portal exists (this is marked as a future enhancement; manual email requests are supported).
- The Privacy Policy does **not** claim third-party age verification or parental consent workflows exist.
- The Terms of Service do **not** claim absolute 100% uptime or enterprise SLAs during Public Beta.
- The Grievance Policy does **not** claim automatic 24/7 algorithmic grievance resolution; it commits to human review within statutory timelines.

---

## 9. Pre-Publication Checklist (Before Launching Public Beta)

- [ ] Operator purchases production domain (e.g. `discora.com`).
- [ ] Operator sets up production email routing (`no-reply@auth.discora.com`, `grievance@discora.com`).
- [ ] Operator fills in all bracketed placeholders across the 4 legal documents.
- [ ] Qualified legal counsel reviews the Terms of Service and Grievance Policy under Indian law.
- [ ] Phase 9C.2 routes (`/terms`, `/privacy`, `/guidelines`, `/grievance`) are built and deployed.
- [ ] Phase 9C.3 account deletion engine is implemented and verified.
- [ ] Playwright test suite passes against all legal routes and registration legal links.

---

## 10. Disclaimer

> [!WARNING]
> **LEGAL DISCLAIMER:**  
> The documents created in this phase (`TERMS_OF_SERVICE_DRAFT.md`, `PRIVACY_POLICY_DRAFT.md`, `COMMUNITY_GUIDELINES_DRAFT.md`, and `GRIEVANCE_POLICY_DRAFT.md`) are technical and statutory drafts generated by an AI coding assistant to reflect Discora’s actual system architecture and applicable regulatory standards. They do **not** constitute formal legal advice. The platform operator should have qualified Indian legal counsel review and approve these drafts prior to public commercial or public beta deployment.
