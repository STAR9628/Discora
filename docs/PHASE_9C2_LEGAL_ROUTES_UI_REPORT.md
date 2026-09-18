# Phase 9C.2 — Legal Routes & UI Integration Report

**Platform:** Discora  
**Phase:** 9C.2 — Legal Routes + UI Integration  
**Governance State:** Product Owner Approved Implementation Phase  
**Date:** September 14, 2026  
**Status:** Complete & Fully Verified  

---

## 1. Executive Summary

Phase 9C.2 operationalizes Discora's legal, privacy, and community governance frameworks into the running web application without modifying product philosophy, introducing database mutations, or prematurely implementing an account deletion engine.

Based directly on the reconciled legal drafts established in Phase 9C.1-R, four dedicated legal routes were introduced within a native Discora layout:
1. `/terms` (Terms of Service)
2. `/privacy` (Privacy Policy)
3. `/guidelines` (Community Guidelines)
4. `/grievance` (Grievance Redressal Policy)

In addition to routing, the registration flow (`/register`) was updated to include distinct, non-conflated eligibility and legal acknowledgements confirming that Discora Public Beta is 18+ only, alongside accessible links to Terms and Privacy. The site's About page (`/about`) footer was augmented with persistent secondary navigation links to all four legal documents.

All implementations strictly adhere to Discora's design system tokens, typography, dark/light theme support, and responsive container constraints. The work was verified via comprehensive TypeScript compilation, ESLint audits, Next.js production builds, and end-to-end automated Playwright browser tests across five device viewports (desktop 1440, desktop 1280, tablet 1024, mobile 390, and mobile 375).

---

## 2. Routes Created

Four canonical legal routes were implemented under the App Router group `(legal)` to maintain clean, top-level public URLs:

| Public URL | Route File | Purpose | Key Content & Sections |
|---|---|---|---|
| `/terms` | `src/app/(legal)/terms/page.tsx` | Terms of Service | 14 sections including acceptance, 18+ eligibility, epistemic model & content licensing, prohibited conduct, disclaimer of truth/accuracy, limitation of liability, and jurisdiction. |
| `/privacy` | `src/app/(legal)/privacy/page.tsx` | Privacy Policy | 11 sections detailing data collection, cookies/local storage, subprocessors, CERT-In cybersecurity log retention, and epistemic retention distinctions. |
| `/guidelines` | `src/app/(legal)/guidelines/page.tsx` | Community Guidelines | Discourse standards, prohibited content, AI assistance boundaries, explanation of epistemic metrics, and discretionary moderation policies. |
| `/grievance` | `src/app/(legal)/grievance/page.tsx` | Grievance Redressal Policy | Statutory Indian IT Rules 2021 redressal framework, Grievance Officer details, 24h acknowledgement and 15-day resolution SLAs, and GAC appeals. |

### Layout & Navigation Shell
- **File:** `src/app/(legal)/layout.tsx`
- **Architecture:** Provides a dedicated, distraction-free reading container (`max-w-4xl`) with:
  - Top breadcrumb navigation back to `/about`.
  - Category badge: `"Legal & Epistemic Governance"`.
  - Responsive sub-tab navigation between `/terms`, `/privacy`, `/guidelines`, and `/grievance`.
  - Prominent, persistent Draft Review Banner at the top of every legal page.
  - Secondary legal navigation footer.

---

## 3. Registration UX Changes

- **File:** `src/features/auth/components/register-form.tsx`
- **Placement:** Positioned immediately below the primary "Create Account" submit button.
- **Design Philosophy:** Preserves registration conversion efficiency while maintaining legal precision and preventing concept conflation.

### Implementation Details:
1. **Explicit 18+ Confirmation:**
   - Clearly states: *"Discora Public Beta is 18+ only."*
   - Explicit user acknowledgement: *"By registering, you confirm that you are at least 18 years of age and agree to our [Terms of Service](/terms) and acknowledge our [Privacy Policy](/privacy)."*
2. **Zero Unnecessary Complexities:**
   - Does NOT collect Date of Birth (DOB).
   - Does NOT implement third-party identity/age verification.
   - Does NOT introduce parental consent workflows.
   - Does NOT force checkbox friction for passive policy acknowledgement.
3. **Concept Separation:**
   - Clearly separates 18+ eligibility status, contractual agreement (Terms), and informational notice (Privacy).
   - Community Guidelines and Grievance Policies remain accessible via links without artificial agreement burdens.
4. **Responsive Resilience:**
   - Styled with subdued text sizing (`text-xs`), balanced leading, and high-contrast accessible link states (`underline underline-offset-4 text-foreground hover:text-primary`).
   - Verified 0 horizontal overflow at 375px and 390px mobile viewports.

---

## 4. About / Footer Navigation Changes

- **File:** `src/features/about/components/about-page-client.tsx`
- **Location:** Footer section of the About page (`<footer className="border-t border-border/50 px-4 py-8 text-center sm:px-6 space-y-3">`).
- **Elements Added:**
  - Semantic `<nav aria-label="Legal and policy links">` containing:
    - `Terms of Service` (`/terms`)
    - `Privacy Policy` (`/privacy`)
    - `Community Guidelines` (`/guidelines`)
    - `Grievance Redressal` (`/grievance`)
  - Subdued, non-intrusive presentation aligned with Discora's minimalist footer conventions.
  - Avoids cluttering the primary sidebar or top application headers with low-frequency legal links.

---

## 5. Legal Content Rendering Approach

- **Component Primitives:** Created `src/components/legal/legal-components.tsx`
- **Rendering Architecture:**
  - Written in clean, typed TSX using semantic HTML (`<article>`, `<header>`, `<section>`, `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`).
  - Strict typography rules: headings, body copy, list items, and code tags use pre-existing Tailwind tokens (`text-foreground`, `text-muted-foreground`, `border-border/40`).
  - Reusable components:
    - `<LegalCallout variant="warning" | "caution" | "info">`: Formats warnings, important notices, and statutory disclaimers.
    - `<ResponsiveTable>`: Handles wide tabular data (such as cookies, subprocessors, and grievance officers) with touch-friendly horizontal scrolling (`overflow-x-auto`) to prevent viewport blowouts.
    - `<OperatorPlaceholder>`: Explicitly highlights operational gaps requiring entity/operator details.

---

## 6. Draft-Status Treatment

Because these documents are non-final drafts pending formal corporate formation and legal counsel review, the UI makes their draft status unmistakable:

1. **Persistent Header Notice:** Every legal route displays an amber callout banner:
   > **DRAFT STATUS: FOR INTERNAL & LEGAL REVIEW ONLY**  
   > *This document is an operational draft prepared for Discora Public Beta readiness. It has not been formally finalized by legal counsel and is subject to revision before official execution.*
2. **Metadata Title Tagging:** Page titles are formatted as:
   - `Terms of Service (Draft) — Discora | Discora`
   - `Privacy Policy (Draft) — Discora | Discora`
   - `Community Guidelines (Draft) — Discora | Discora`
   - `Grievance Redressal Policy (Draft) — Discora | Discora`
3. **Visible Operator Placeholders:** Operator variables remain explicitly visible as styled placeholders (e.g., `[DISCORA LEGAL ENTITY NAME]`, `[OFFICIAL GRIEVANCE CONTACT EMAIL — OPERATOR TO PROVIDE]`), preventing any false pretense of finalized legal entity status.

---

## 7. Responsive QA

Automated Playwright evaluation across 5 standardized viewports across all 4 legal routes (20 distinct combinations):

| Viewport | Dimensions | Routes Tested | Horizontal Overflow Result | Layout & Readability |
|---|---|---|---|---|
| Desktop 1440 | 1440 × 900 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | **0 px overflow** (`false`) | Clean centered container, generous padding |
| Desktop 1280 | 1280 × 800 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | **0 px overflow** (`false`) | Proportional typography, clear sub-tabs |
| Tablet 1024 | 1024 × 768 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | **0 px overflow** (`false`) | Sub-tabs and tables scale seamlessly |
| Mobile 390 | 390 × 844 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | **0 px overflow** (`false`) | Touch-friendly tabs, wrapped long links |
| Mobile 375 | 375 × 812 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | **0 px overflow** (`false`) | No clipping, legible body copy, wrapped URLs |

---

## 8. Accessibility QA

1. **Heading Hierarchy:** Each legal page exposes exactly one `<h1>` for document title. Section headings strictly use `<h2>` and subsections use `<h3>`.
2. **Contrast & Themes:** All text uses semantic high-contrast tokens verified in both Light and Dark modes.
3. **Keyboard Navigation & Focus:** Full focus rings (`focus-visible:ring-2 focus-visible:ring-primary`) are preserved on sub-tabs, breadcrumbs, external links, and footer navigation.
4. **Semantic Roles:** Tables are contained in labelled overflow wrappers with `role="region"` and accessible aria-labels.

---

## 9. Playwright QA Results

The automated Playwright test suite (`scripts/phase9c2-legal-qa.mjs`) executed against the running application and passed with **100% success rate**:

```json
{
  "legalRoutes": [
    {
      "route": "/terms",
      "status": 200,
      "title": "Terms of Service (Draft) — Discora | Discora",
      "heading": "Discora — Terms of Service",
      "draftBannerVisible": true,
      "hasPlaceholders": true,
      "isOverflowing": false
    },
    {
      "route": "/privacy",
      "status": 200,
      "title": "Privacy Policy (Draft) — Discora | Discora",
      "heading": "Discora — Privacy Policy",
      "draftBannerVisible": true,
      "hasPlaceholders": true,
      "isOverflowing": false
    },
    {
      "route": "/guidelines",
      "status": 200,
      "title": "Community Guidelines (Draft) — Discora | Discora",
      "heading": "Discora — Community Guidelines",
      "draftBannerVisible": true,
      "hasPlaceholders": true,
      "isOverflowing": false
    },
    {
      "route": "/grievance",
      "status": 200,
      "title": "Grievance Redressal Policy (Draft) — Discora | Discora",
      "heading": "Discora — Grievance Redressal Policy",
      "draftBannerVisible": true,
      "hasPlaceholders": true,
      "isOverflowing": false
    }
  ],
  "navigation": [
    { "from": "/terms", "to": "/privacy", "success": true },
    { "from": "/privacy", "to": "/guidelines", "success": true },
    { "from": "/guidelines", "to": "/grievance", "success": true },
    { "from": "/grievance", "to": "/terms", "success": true }
  ],
  "registration": {
    "ageNoticeVisible": true,
    "termsLinkVisible": true,
    "privacyLinkVisible": true,
    "landedOnTerms": true,
    "regMobileOverflow": false
  },
  "aboutFooter": {
    "footerTermsVisible": true,
    "footerPrivacyVisible": true,
    "footerGuidelinesVisible": true,
    "footerGrievanceVisible": true
  },
  "consoleErrors": []
}
```

### Visual Verification Screenshots Generated:
- `docs/legal_terms_desktop_1440.png`
- `docs/legal_privacy_desktop_1440.png`
- `docs/legal_guidelines_desktop_1440.png`
- `docs/legal_grievance_desktop_1440.png`
- `docs/legal_terms_mobile_375.png`
- `docs/register_legal_18plus_desktop.png`
- `docs/register_legal_18plus_mobile.png`
- `docs/about_legal_footer.png`

---

## 10. TypeScript Result

```bash
$ npx tsc --noEmit
# Completed with Exit Code 0 (0 errors)
```

---

## 11. Lint Result

```bash
$ npm run lint
# Completed with Exit Code 0 (0 errors, 40 pre-existing script warnings)
```

---

## 12. Build Result

```bash
$ npm run build
# Compiled successfully in 20.0s
# 28/28 Static Pages prerendered successfully
Route (app)                                 Size  First Load JS
├ ○ /terms                                 178 B         106 kB
├ ○ /privacy                               178 B         106 kB
├ ○ /guidelines                            178 B         106 kB
├ ○ /grievance                             178 B         106 kB
├ ○ /about                               7.89 kB         114 kB
├ ○ /register                               4 kB         196 kB
```

---

## 13. Files Changed

### Created Files:
- `src/app/(legal)/layout.tsx` — Legal route shell with tabs, draft banner, and footer.
- `src/app/(legal)/terms/page.tsx` — Terms of Service page.
- `src/app/(legal)/privacy/page.tsx` — Privacy Policy page.
- `src/app/(legal)/guidelines/page.tsx` — Community Guidelines page.
- `src/app/(legal)/grievance/page.tsx` — Grievance Redressal Policy page.
- `src/components/legal/legal-components.tsx` — Callout, placeholder, and responsive table primitives.
- `scripts/phase9c2-legal-qa.mjs` — Automated Playwright test script.

### Modified Files:
- `src/features/auth/components/register-form.tsx` — Added 18+ eligibility & legal notice.
- `src/features/about/components/about-page-client.tsx` — Added legal links to footer.

---

## 14. Deviations From Requested Scope

**None.** The implementation adhered strictly to Phase 9C.2 instructions without exceeding boundaries.

---

## 15. Remaining Operator Dependencies

Before public release, the human operator must provide:
1. Legal Entity Name and registration jurisdiction (e.g. state/country).
2. Official Operating Address for statutory notices.
3. Designated Grievance Officer Name, Email, and Physical Address (Rule 3(2) IT Rules).
4. Official Contact/Support Email (`hello@discora.com` or custom domain).
5. Official Privacy Contact Email.
6. Effective Date for finalized policies.

---

## 16. Remaining Legal / Counsel Dependencies

Before taking documents out of draft status:
1. Outside legal counsel review of epistemic IP licensing and discourse retention model.
2. Formal jurisdictional assessment regarding GDPR Article 3(2) extraterritorial scope.
3. Verification of statutory timelines and dispute resolution clauses under Indian Arbitration and Conciliation Act, 1996.

---

## 17. Explicit Negative Confirmations

1. **No account deletion engine was implemented.** (Reserved for subsequent engineering phases; manual privacy requests remain the current documented mechanism).
2. **No database changes were made.** (Zero SQL migrations created or modified; zero schema alterations).
3. **No production domain/infrastructure changes were made.** (No DNS, Vercel production domains, or cloud config altered).

---

## STOP CONDITION COMPLIANCE

Phase 9C.2 is complete. Halting execution and awaiting Product Owner review before proceeding to Phase 9C.3.
