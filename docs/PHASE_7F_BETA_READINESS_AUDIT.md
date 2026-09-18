# Phase 7F — Discora Beta Readiness Audit

## 1. Executive Verdict

**BETA READY WITH BLOCKERS**

Discora's core epistemic engine, discussion rooms, debate rooms, and State of Understanding (SoU) architecture are technically functional, philosophically aligned, and structurally sound following the completion of Phase 7E. A real user can join rooms, participate in structured conversation, create claims, cite evidence, submit targeted inquiries, trace arguments, and examine the deterministic state of understanding across both discussions and debates with zero gamification, zero winner/loser mechanics, and zero horizontal overflow across all tested viewports (375px to 1440px).

However, Discora is **NOT** yet ready to open its doors to an uncontrolled or public beta. Critical operational and product-wrapper infrastructure remains incomplete:
1. **No Admin/Owner Console:** The product owner has no UI surface to inspect private rooms, review submitted feedback, audit user accounts, or manage system-level health.
2. **No "About Discora" Experience:** There is no dedicated `/about` route or storytelling narrative explaining Discora's philosophy, epistemic model, and departure from conventional social media.
3. **Pervasive Developer Test Fixtures:** Discovery feeds and active rooms are currently populated with scratch developer testing artifacts (`testtest`, `yaaadsddsdsd`, `Invitation Flow QA *`).
4. **No Operator UI for Feedback & Suggestions:** Users can submit feedback via `submit_user_feedback`, but no screen in the app allows moderators or admins to view or triage it.
5. **Missing Auth Email Branding & Offline Error States:** Email delivery relies on unbranded Supabase defaults, and network disconnection yields unhandled mutation errors without an offline banner.

These blockers are classified with concrete evidence and actionable remediation steps below.

---

## 2. Audit Scope

This audit evaluates Discora across 28 distinct functional, architectural, responsive, and governance dimensions:
- **Philosophy & Epistemic Alignment:** Auditing against core principles (understanding over winning, evidence over popularity, no consensus-as-truth).
- **End-to-End Beta User Journey:** Testing landing, discovery, participation, claim creation, evidence attachment, inquiry follow-ups, and profile settings.
- **Room Mechanics:** Deep examination of Discussion and Debate rooms, lens transitions, and conversational integrity.
- **Understanding Layer:** Verification of the Phase 7E reconciliation results.
- **Administrative & Operational Readiness:** Admin console, moderation queues, feedback pipelines, and owner visibility.
- **System Robustness:** Authentication flows, offline handling, error boundaries, security/RLS boundaries, and responsive viewports (375px, 390px, 834px, 1440px).
- **Content & Design Readiness:** Test data hygiene, curated topics, visual hierarchy, micro-interactions, sound, and accessibility.

---

## 3. Authority / Sources

This audit was conducted strictly against the authoritative governance documents:
- [`docs/DISCORA_AGENT_GOVERNANCE.md`](file:///D:/Projects/Discora/docs/DISCORA_AGENT_GOVERNANCE.md)
- [`docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md`](file:///D:/Projects/Discora/docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md)
- [`docs/PHASE_7C_AUDIT_RECONCILIATION.md`](file:///D:/Projects/Discora/docs/PHASE_7C_AUDIT_RECONCILIATION.md)
- [`docs/PHASE_7D_NEXT_UNDERSTANDING_AUDIT.md`](file:///D:/Projects/Discora/docs/PHASE_7D_NEXT_UNDERSTANDING_AUDIT.md)
- [`docs/PHASE_7E_UNDERSTANDING_RECONCILIATION.md`](file:///D:/Projects/Discora/docs/PHASE_7E_UNDERSTANDING_RECONCILIATION.md)
- `00_MASTER_CONTEXT.md`, `01_PRD.md`, `02_FEATURE_REGISTRY.md`, `03_USER_FLOWS.md`, `04_DATABASE_DESIGN.md`, `05_SYSTEM_ARCHITECTURE.md`, `06_DESIGN_SYSTEM.md`, `08_DEVELOPMENT_ROADMAP.md`, `23_KNOWLEDGE_MODEL.md`.

*Authority hierarchy followed:* Discora Philosophy → Original MDs → Approved Product Decisions → Approved Specs → Current Implementation → UX Optimization → Agent Assumptions.

---

## 4. Product Philosophy Alignment

A codebase-wide forensic sweep was conducted to detect philosophical drift, gamification, and unauthorized epistemic claims:

| Target Term | Occurrences in Active UI | Classification | Finding Details |
|---|---|---|---|
| **winner / winning** | 3 occurrences | **ALIGNED** | All occurrences explicitly disclaim competition: e.g., *"Evidence does not manufacture absolute certainty or declare a winner"*, *"It does not score sides or declare winners"*. |
| **loser / losing** | 0 occurrences | **ALIGNED** | Completely eradicated from active UI and calculations. |
| **proven / true / correct** | 0 occurrences | **ALIGNED** | Claims are never labeled "proven" or "true". The approved term *"Supported by Current Evidence"* is maintained. |
| **consensus** | 15+ occurrences | **POTENTIALLY MISALIGNED (Dead Code)** | Active conversation and SoU do **not** use consensus to determine validity. However, dead components (`reputation-growth-card.tsx`, `reputation-breakdown.tsx`, `discussion-intelligence.tsx`, `map-tab.tsx`) still contain phrases like *"High consensus claims earn bonus points"*. |
| **reputation score / points** | Active Profile: 0 | **ALIGNED** | Profile displays contribution distribution (counts of messages, claims, evidence, inquiries) and participation topics. Numerical scores and gamified badges are hidden. |
| **AI verdict** | 0 occurrences | **ALIGNED** | No LLM-generated summaries or automated truth verdicts exist in SoU. |
| **Support / Challenge** | Consistent | **ALIGNED** | Phase 7E unified "Not Agree" to "Challenge", separating descriptive community stance from evidence-based status. |

---

## 5. New User Journey

The new user walk-through was audited using Playwright browser testing from guest entry to room participation:

1. **Landing & Guest Homepage (`/`):**
   - *Status:* **PASSABLE WITH COPY DEFECTS**
   - *Experience:* Clean, responsive layout. Explains the core premise (*"Structured Discussion & Debate"*). Provides an interactive *"See how evidence-based discussion works (2 min)"* onboarding deck.
   - *Defect:* The "Active Discussions" and "Active Debates" cards expose developer test fixtures (`testtest`, `Invitation Flow QA 826082`).
2. **Browsing Feeds (`/discussions`, `/debates`):**
   - *Status:* **COHERENT**
   - *Experience:* Clean card list with topic tags, participant counts, and clear room type badges.
3. **Entering a Room:**
   - *Status:* **EXCELLENT**
   - *Experience:* Conversation is dominant and primary. A dismissible `RoomGuideCard` explains the room's mechanics. Room header displays title and section navigation.
4. **Inspecting Structured Artifacts:**
   - *Status:* **EXCELLENT**
   - *Experience:* Clicking claims, evidence, or inquiries opens detail cards with source URLs, domain badges, and directional indicators.
5. **Contributing as a Guest:**
   - *Status:* **PROTECTED & GUIDED**
   - *Experience:* Attempting to send a message, create a claim, or vote prompts the guest to log in or register via safe redirect (`/login?redirectedFrom=...`).
6. **Understanding Lens:**
   - *Status:* **EXCELLENT**
   - *Experience:* Renders current epistemic state deterministically. Users can click any claim to jump back to its origin in the conversation.
7. **Settings & Profile:**
   - *Status:* **GUARDED**
   - *Experience:* Unauthenticated access to `/settings` redirects to `/login`. Profile URLs resolve dynamically.

---

## 6. Homepage / Discovery

- **Popularity Isolation:** Tested verified. Discussion and debate cards are sorted by recent activity (`updated_at`), not vote popularity or consensus metrics.
- **Topic Filtering:** Topics (`Technology`, `Science`, `Philosophy`, etc.) filter feeds cleanly without page reloads.
- **Search Integration:** Search input on header triggers Ctrl+K command bar or navigates to `/search`.
- **Gaps:** Discovery feeds expose uncurated scratch testing rooms that give a chaotic first impression.

---

## 7. Discussion Room

Audited in detail on `/discussions/should-ai-generated-content-be-clearly-labeled-online`:
- **Conversation Primacy:** Verified. The threaded conversation feed occupies the main viewport.
- **Unified Composer:** Default mode is Message. Expanding the composer provides Claim and Question modes with character counters and guideline tips.
- **Interleaved Structured Citizens:** Evidence, Arguments, and Inquiries render chronologically as first-class conversation nodes with distinct badges and icons.
- **Lenses:** Claims, Evidence, Sources, Questions, and State of Understanding lenses load smoothly and maintain room context.
- **Deep Linking:** URLs like `/discussions/[slug]/claims?highlight=[id]` scroll directly to the target node with a subtle highlight ring.

---

## 8. Debate Room

Audited in detail on `/debates/ai-is-superior-to-humans`:
- **Proposition / Opposition Structure:** Verified. Opening premise is clearly stated. Claims, evidence, and inquiries are associated with their respective debate sides.
- **Side Selector / Side Switching:** Users can join Proposition or Opposition and switch sides when evidence updates their understanding.
- **Zero Competition Mechanics:** No winner/loser banners, no point bars, and no consensus meters.
- **Debate SoU:** Parity with Discussion SoU achieved in Phase 7E. Proposition and Opposition claims are grouped separately, each evaluated into Supported, Contested, or Unresolved.

---

## 9. Understanding Layer

Audited in detail against Phase 7E requirements:
- **Epistemic States:** Strictly *Supported by Current Evidence*, *Contested / Mixed Evidence*, and *Unresolved Front*.
- **Inquiry Non-Demotion:** Open targeted inquiries appear as contextual badges (`X inquiry/inquiries`) on claim cards; they **never** demote a supported claim to contested.
- **Argument Traceability:** Attached arguments are surfaced as contextual indicators (`X arg(s)`) with supporting/challenging breakdown without arbitrary score weighting.
- **Soft-Deleted Claims:** Filtered out of active metrics (`!c.isRetracted && !c.deletedAt`).
- **Position History:** Verified absent from Debate SoU.
- **No AI Verdicts / Confidence Scores:** Purely deterministic evidence synthesis.

---

## 10. Claim / Evidence / Argument / Inquiry Model

The semantic distinction between objects is clear across the interface:
- **Claim:** Discrete assertion presented for empirical examination.
- **Evidence:** External source/citation with verified direction (`support`, `contradict`, `context`).
- **Argument:** Structured reasoning connecting premises to a claim (`supporting` vs `challenging`).
- **Question:** Broad exploratory room inquiry.
- **Targeted Inquiry:** Claim-scoped inquiry asking for specific clarification or empirical substantiation.

*Consistency Note:* In debate rooms, the "Questions" lens represents targeted inquiries scoped to debate claims, whereas discussion rooms have both general questions and targeted inquiries. This architectural distinction is documented in `AGENTS.md` and behaves consistently in UI.

---

## 11. Navigation / Sidebar

- **Desktop Sidebar:** Fixed left rail (64px collapsed / 256px expanded) with Home, Discussions, Search, Debates, Profile, and Settings.
- **Room-Local Lenses:** When inside a discussion or debate, the room title and its 6 lenses expand locally under the active parent item.
- **Saved Rooms:** Saved items live under `/saved` for authenticated users; not duplicated in room submenus.
- **Mobile Nav:** Fixed bottom bar with Home, Discussions, Debates, and More (Create, Search, Saved, Profile, Settings).
- **Defects:**
  - Sidebar Search is a static navigation link to `/search` rather than an expandable quick-search field.
  - Settings link in sidebar is hidden entirely for unauthenticated guests, preventing guests from discovering app preferences/theme controls.

---

## 12. Admin Console

**SEVERITY: P0 BLOCKER**

- **Current State:** There is **NO** Admin Console route or component.
- **Existing Surface:** Only `/settings/moderation` exists, which is a *Moderation Dashboard* restricted to users with `moderator` or `admin` role. It only displays flagged messages/claims (`pending` and `history` tabs) and permits hiding/restoring them.
- **Missing Owner Capabilities:**
  - Owner cannot view private rooms without an invitation or explicit membership.
  - Owner cannot browse system-wide users, activity logs, or registration metrics.
  - Owner cannot view submitted feedback or suggestions (stored in `user_feedback` table).
  - Owner cannot archive, lock, or unlist rooms from a centralized control panel.
  - No audit logging UI for moderation or administrative actions.
- **Governance Constraint:** Admin access must remain strictly operational; it must **never** confer epistemic authority (admin cannot declare a claim "true" or decide a debate).

---

## 13. Feedback / Reports / Suggestions

- **Submission:**
  - Moderation reports (`flag_entity` RPC) are submitted via message/claim dropdowns.
  - User feedback (`submit_user_feedback` RPC) is submitted via `FeedbackModal` from sidebar/settings.
  - Clear categories: `bug`, `confusing_ux`, `suggestion`, `general`.
- **Triage Defect:**
  - Flagged reports appear in `/settings/moderation`.
  - User feedback and suggestions inserted into `public.user_feedback` have **ZERO UI** in the application. Neither moderators nor admins can view, filter, or triage feedback in the product.

---

## 14. Authentication

- **Implementation:** Supabase Auth with email/password and Google OAuth button.
- **Route Guarding:** Server-side middleware guards `/settings/*`, `/discussions/create`, `/debates/create`.
- **Safe Redirects:** `safe-redirect.ts` enforces an internal route allowlist, preventing open-redirect vulnerabilities.
- **Profile Onboarding:** Users without a profile are automatically intercepted and routed to `/settings/profile`.
- **Defect:** If Google OAuth credentials or custom SMTP are not configured in environment variables, the auth UI fails with generic alerts.

---

## 15. Offline / Network Failure

**SEVERITY: P1 BLOCKER**

- **Current State:** Discora has no offline detection or network failure banner.
- **Browser Behavior:**
  - When connection is severed, navigating causes standard browser failure or Next.js fetch error.
  - Submitting a message, claim, or vote while offline results in an unhandled rejection or generic toast: *"Failed to post message. TypeError: Failed to fetch"*.
  - No `navigator.onLine` listener, no reconnecting indicator, and no queued offline mutations.
- **Error Page:** `src/app/error.tsx` exists as a generic React error boundary ("Something went wrong"), but it does not diagnose network unavailability.

---

## 16. About Discora

**SEVERITY: P0 BLOCKER**

- **Current State:** **MISSING.**
- **Details:** There is no `/about` page or About Discora modal anywhere in the repository.
- **Impact:** An uninitiated beta user who arrives via a shared link has no storytelling-driven page explaining why Discora exists, how it differs from Twitter/Reddit/Substack, what the epistemic model means, or why changing one's mind is celebrated.
- **Requirement:** A rich, elegant, storytelling-oriented `/about` page communicating Discora's philosophy, epistemic pillars, and human-first discussion model.

---

## 17. Early Beta Recognition

**SEVERITY: P2 (POST-LAUNCH)**

- **Current State:** **MISSING.**
- **Details:** No Founding Member badge, Early Beta Tester badge, or profile distinction exists.
- **Governance Guardrail:** When implemented, beta recognition must remain strictly descriptive (e.g. *"Beta Contributor"*) and must **never** confer elevated epistemic weight, vote multipliers, or authority over claims.

---

## 18. Auth Email / Contact

**SEVERITY: P1 BLOCKER**

- **Auth Email Sender:** Currently uses default Supabase mailing infrastructure (`noreply@mail.app.supabase.io`). The planned production sender `no-reply@auth.discora.com` (via custom SMTP / Resend) is not configured in `.env.example` or repository settings.
- **Contact Email:** `hello@discora.com` is not present in any footer, contact form, or support link.
- **Risk:** Supabase default SMTP has a hard limit of 3-4 emails per hour on free tiers and triggers spam filters, which will block new beta user registrations.

---

## 19. Demo / Test Data Inventory

The production/local database contains developer scratch data that must be cleaned prior to beta launch:

| Item | Type | Current Content | Recommendation |
|---|---|---|---|
| `testtest` | Discussion | Gibberish title and body | **CLEAN BEFORE BETA** |
| `yaaadsddsdsd` | Claim | Scratch test claim in AI discussion | **CLEAN BEFORE BETA** |
| `edit claim keerti` | Claim | Scratch edit test in AI discussion | **CLEAN BEFORE BETA** |
| `aaaaaaaaaaaaaaaa...` | Claim | Keyboard mash claim | **CLEAN BEFORE BETA** |
| `i thing this app is great bro` | Claim | Informal testing claim | **CLEAN BEFORE BETA** |
| `testngjdflkjsdklf...` | Premise | Keyboard mash opening premise in AI debate | **CLEAN BEFORE BETA** |
| `Invitation Flow QA 826082` | Debate | QA test debate | **CLEAN BEFORE BETA** |
| `Invitation Flow QA 946474` | Debate | QA test debate | **CLEAN BEFORE BETA** |
| `Test Debate Title` | Debate | QA test debate | **CLEAN BEFORE BETA** |
| `QA Private Debate` | Debate | QA test debate | **CLEAN BEFORE BETA** |
| `Should AI-generated content be clearly labeled online?` | Discussion | Realistic topic with cited sources | **KEEP (Curation base)** |
| `AI is superior to humans` | Debate | Realistic motion with claims & evidence | **KEEP (Curation base)** |
| `Autonomous Systems and Human Oversight...` | Debate | High-quality topic | **KEEP (Curation base)** |

---

## 20. Curated Beta Topics

**SEVERITY: P1 BLOCKER**

- **Current State:** **INSUFFICIENT.**
- **Details:** After cleaning test fixtures, only 1 discussion room and 2 debate rooms remain.
- **Requirement:** For a successful beta launch, Discora requires a curated initial set of 5–8 high-quality discussions and 3–5 well-structured debates across diverse platform topics (`Technology`, `Ethics`, `Science`, `Philosophy`, `Economics`). Each seed room should contain an articulate opening statement, 2–4 starter framing questions or motion claims, and initial cited evidence.

---

## 21. Visual / Design Readiness

- **Design System Adherence:** Matches `docs/06_DESIGN_SYSTEM.md`. Subtle borders (`border-border/60`), muted card backgrounds (`bg-card/40`), clear visual hierarchy.
- **Tailwind Tokens:** Standardized on slate, blue, amber, and sky accents for epistemic states.
- **Restraint:** High signal-to-noise ratio; avoids distracting badges, gamified streaks, or visual clutter.
- **Identified Polish Areas:**
  - Conversation bubbles have slight vertical rhythm inconsistencies when mixed with rich structured contribution cards.
  - Some tooltips overflow viewport edges on small tablet portrait widths.
  - Overall visual polish is solid (8.5/10), but can be elevated in a planned Figma-assisted polish phase.

---

## 22. Sound / Motion / Micro-interactions

**SEVERITY: P3 (POST-BETA POLISH)**

- **Sound:** **MISSING.** `public/` directory is empty. No audio assets or sound triggers exist.
- **Motion:** Micro-animations (fade-ins, tab transitions) are tasteful and subtle.
- **Guideline:** Sound should remain subtle, optional, and default-muted or globally toggled. No arcade-like reward sounds.

---

## 23. Accessibility

- **Semantic HTML:** Main landmark elements (`<main>`, `<nav>`, `<aside>`, `<header>`, `<article>`) are used correctly.
- **Focus States:** Most buttons and links have visible `focus-visible:ring-2` styling.
- **Defects:**
  - **Missing Reduced Motion Support:** `src/app/globals.css` does not include `@media (prefers-reduced-motion: reduce)` rules.
  - **Sub-standard Touch Targets:** Inline claim vote buttons (`px-2 py-0.5`, font size `10px`, icon size `10px`) in conversation nodes have a hit target of roughly ~24x20px, failing the WCAG 44x44px recommendation on mobile touchscreens.
  - **Contrast:** Status reasoning text (`text-[9px] italic text-slate-400/90`) on dark card backgrounds sits at ~4.2:1 contrast ratio, which is slightly below the 4.5:1 WCAG AA threshold for normal text.

---

## 24. Security / Data Access

- **Row Level Security (RLS):** Enabled and enforced on all core tables (`discussions`, `debates`, `claims`, `evidence`, `messages`, `questions`, `inquiry_items`, `user_feedback`, `moderation_flags`).
- **Service Role Protection:** Confirmed zero instances of `SERVICE_ROLE` key in client code or Next.js server components.
- **Private Room Protection:** Server-side and client-side access gates prevent unauthorized users from viewing private debate discussions without invitation tokens.
- **Pending Hardening Migration:** Migration `202606190001_security_hardening_p0_p1.sql` (revoking direct table access to system functions, restricting reputation recalculation, pinning `search_path`) exists in the repository but has **NOT** been verified as applied to production. This must be confirmed in production prior to public beta.

---

## 25. Performance

- **Bundle Size:** Next.js production build reports shared First Load JS of 102 kB. Discussion room bundle is 254 kB, Debate room bundle is 286 kB. Excellent for an App Router application with full TanStack Query hydration.
- **Query Efficiency:** TanStack Query caches room queries (`staleTime: 60_000` on room info, real-time cache invalidation on mutations).
- **SoU Computation:** `deriveStateOfUnderstanding` runs in-memory via `useMemo` in under 3ms for rooms with <100 claims.
- **Potential Bottleneck:** In very large rooms (>500 messages), rendering the entire conversation tree interleaved with structured nodes could cause main-thread jank. Virtualization may be needed post-beta.

---

## 26. Responsive QA

Audited via Playwright MCP across four standardized device viewports:

| Viewport | Device Class | Discussion SoU | Debate SoU | Conversation Feed | Claims Lens | Result |
|---|---|---|---|---|---|---|
| **1440 x 900** | Desktop Wide | 3 columns, 0 scroll | 2 columns side-by-side | Clean feed + composer | Clean grid | **PASS (0 overflow)** |
| **834 x 1194** | Tablet Portrait | Stacked cards | Stacked columns | Full width | Full width | **PASS (0 overflow)** |
| **390 x 844** | Mobile Standard | Epistemic tabs | Side toggle | Mobile feed | Stacked cards | **PASS (0 overflow)** |
| **375 x 667** | Mobile Small | Epistemic tabs | Side toggle | Mobile feed | Stacked cards | **PASS (0 overflow)** |

- **DOM Metrics:** Verified `scrollWidth === clientWidth` on all pages at 375px and 390px. Zero horizontal scrolling.
- **Touch Usability:** Side toggle in Debate SoU (`Proposition (1)` / `Opposition (0)`) works smoothly with instant state response.

---

## 27. Runtime QA

- **Browser Console Errors:**
  - Functional flows (switching lenses, filtering, navigating): **0 errors**.
  - Asset Request: **1 persistent 404 error** on `http://localhost:3000/favicon.ico` due to empty `public/` directory.
- **Hydration Errors:** Zero React 19 hydration mismatch errors observed.
- **Route Resolution:** Clean 404 page rendered on non-existent routes with working "Return to Home" link.

---

## 28. Database / Production Readiness

- **Schema State:** Current database schema supports all Phase 7E objects (Claims, Evidence, Inquiries, Arguments, Reactions, Saves).
- **Production Migration Gate:**
  - `supabase/deploy_pending_migrations.sql` consolidates all pending changes.
  - The security hardening script `202606190001_security_hardening_p0_p1.sql` requires production SQL Editor execution and verification before public beta release.

---

## 29. Findings Catalog

### [Finding 7F-01] Missing Admin/Owner Console
- **Severity:** **P0**
- **Area:** Administrative & Operations
- **Evidence:** `src/app/` contains no `/admin` route. `settings/moderation/moderation-dashboard.tsx` only handles flagged reports.
- **Current State:** The product owner has no administrative console to view private rooms, inspect system metrics, manage users, or review feedback.
- **Expected State:** An Owner/Admin console allowing operational oversight of all rooms, users, reports, and feedback without compromising epistemic neutrality.
- **Impact:** The owner cannot operate or support a beta deployment without direct database SQL access.
- **Recommendation:** Implement an `/admin` console with role guard (`admin`), private room inspection, user management, and feedback triage.

### [Finding 7F-02] Absence of "About Discora" Experience
- **Severity:** **P0**
- **Area:** Product Identity & Onboarding
- **Evidence:** No `/about` route exists in `src/app/`. No link to an about page exists in navigation or footer.
- **Current State:** A new user has no dedicated narrative page explaining Discora's purpose, epistemology, or rules.
- **Expected State:** An elegant, storytelling-oriented `/about` page articulating Discora's philosophy and mechanics.
- **Impact:** New beta users lack conceptual orientation, leading to confusion about why Discora is different from traditional forums.
- **Recommendation:** Create `src/app/about/page.tsx` with rich storytelling components communicating the core philosophy.

### [Finding 7F-03] Scratch Test Data Pollutes Public Discovery
- **Severity:** **P0**
- **Area:** Data Hygiene & First Impression
- **Evidence:** Discovery feeds display rooms titled `testtest`, `Invitation Flow QA 826082`, `Test Debate Title`, and claims titled `yaaadsddsdsd`.
- **Current State:** Developer test data is visible to all visitors.
- **Expected State:** Only clean, high-quality, curated discussion and debate topics should be visible at launch.
- **Impact:** Gives the platform an unfinished, broken appearance.
- **Recommendation:** Execute an authorized pre-beta database cleanup script removing scratch test rooms and claims.

### [Finding 7F-04] User Feedback Has No Operator Review Surface
- **Severity:** **P1**
- **Area:** Operations / Feedback Loop
- **Evidence:** `submit_user_feedback` inserts into `public.user_feedback`, but no page in `src/` queries or renders this table.
- **Current State:** Users submit feedback, but operators cannot view it in the app.
- **Expected State:** A "Feedback & Suggestions" tab inside the Admin/Moderation console allowing operators to review and archive user feedback.
- **Impact:** Beta feedback submitted by early testers will be lost in the database unread.
- **Recommendation:** Build a Feedback Review view inside the Admin Console.

### [Finding 7F-05] Missing Custom Auth Email & SMTP Configuration
- **Severity:** **P1**
- **Area:** Infrastructure / Authentication
- **Evidence:** `.env.example` contains only base Supabase URL/key. No Resend/SMTP settings configured.
- **Current State:** Verification and password reset emails use default Supabase mailer.
- **Expected State:** Emails delivered from `no-reply@auth.discora.com` with branded templates.
- **Impact:** Rate limits (3/hour on free tier) will block beta users from signing up; emails land in spam folders.
- **Recommendation:** Configure custom SMTP via Resend and verify the `auth.discora.com` sending domain.

### [Finding 7F-06] Missing Offline / Network Disconnection Handling
- **Severity:** **P1**
- **Area:** User Experience / Resilience
- **Evidence:** Grep for `navigator.onLine` or network status hooks yielded 0 results in `src/`.
- **Current State:** Network drops produce unhandled fetch exceptions and generic failure toasts.
- **Expected State:** A clear offline banner informing the user that connection is lost, disabling submission buttons gracefully until reconnection.
- **Impact:** Users typing long arguments or claims will lose work or experience confusing errors when offline.
- **Recommendation:** Implement an `OfflineBanner` and online status listener in `AppShell`.

### [Finding 7F-07] Insufficient Curated Starter Topics
- **Severity:** **P1**
- **Area:** Content & Community Seeding
- **Evidence:** Only 1 genuine discussion and 2 genuine debates exist in the database.
- **Current State:** Insufficient starter content for incoming beta testers to explore across varied interests.
- **Expected State:** 5–8 rich discussions and 3–5 debates covering diverse platform topics with pre-populated claims and evidence.
- **Impact:** Early beta testers will find an empty platform and bounce quickly.
- **Recommendation:** Seed curated starter rooms prior to inviting beta cohorts.

### [Finding 7F-08] Missing Favicon Asset Causing 404 Console Error
- **Severity:** **P1**
- **Area:** Polish / Web Standards
- **Evidence:** Playwright console captured `GET /favicon.ico 404 (Not Found)`. `public/` directory is completely empty.
- **Current State:** Browser displays generic blank icon; console throws 404 error on every initial load.
- **Expected State:** Discora brand favicon placed in `public/favicon.ico` and referenced in `layout.tsx`.
- **Impact:** Unprofessional browser tab appearance and unnecessary console errors.
- **Recommendation:** Add `favicon.ico`, `icon.png`, and `apple-touch-icon.png` to `public/`.

### [Finding 7F-09] Touch Target Sizes on Inline Claim Actions
- **Severity:** **P2**
- **Area:** Mobile Accessibility (WCAG 2.5.5)
- **Evidence:** In `claim-in-conversation.tsx:126`, vote buttons have `px-2 py-0.5 text-[10px]` (~24x20px hit target).
- **Current State:** Vote buttons are significantly smaller than the recommended 44x44px mobile touch target.
- **Expected State:** Adequate hit padding or a touch-friendly bottom sheet for mobile claim interactions.
- **Impact:** Mobile users experience mis-taps when voting or inspecting claims.
- **Recommendation:** Increase touch padding on mobile viewports.

### [Finding 7F-10] Missing Reduced Motion Support
- **Severity:** **P2**
- **Area:** Accessibility (WCAG 2.3.3)
- **Evidence:** `src/app/globals.css` lacks `@media (prefers-reduced-motion: reduce)` rules.
- **Current State:** Pulse and slide animations execute regardless of user system accessibility preferences.
- **Expected State:** Animations disabled or converted to instantaneous transitions when reduced motion is preferred.
- **Impact:** Discomfort for users with vestibular disorders.
- **Recommendation:** Add standard Tailwind/CSS reduced-motion overrides in `globals.css`.

### [Finding 7F-11] Dead Gamification Components in Reputation Feature
- **Severity:** **P2**
- **Area:** Technical Debt & Philosophy Hygiene
- **Evidence:** `reputation-growth-card.tsx` and `reputation-breakdown.tsx` contain unreferenced gamification copy (*"High consensus claims earn bonus points"*).
- **Current State:** Components exist as dead code in the repository without callers.
- **Expected State:** Dead gamification artifacts removed to prevent accidental re-introduction.
- **Impact:** Confuses agents and contributors regarding active reputation design.
- **Recommendation:** Remove or archive dead reputation components in a technical debt cleanup pass.

---

## 30. Beta Blockers

```
================================================================================
BETA BLOCKER MATRIX
================================================================================

[P0 — MUST FIX BEFORE ANY BETA (Private/Friends/Closed)]
  1. [Finding 7F-01] Build Owner/Admin Console (room controls, user overview, private room inspection).
  2. [Finding 7F-02] Implement About Discora experience (/about) communicating philosophy & mechanics.
  3. [Finding 7F-03] Clean database scratch/test fixtures (remove testtest, scratch claims, test debates).
  4. [Finding 24]    Verify & apply pending production security hardening migration (202606190001).

[P1 — MUST FIX BEFORE PUBLIC BETA]
  5. [Finding 7F-04] Build Operator Feedback Review view inside Admin Console.
  6. [Finding 7F-05] Configure branded Auth SMTP (no-reply@auth.discora.com via Resend).
  7. [Finding 7F-06] Implement Offline / Network Disconnection Banner & graceful mutation guards.
  8. [Finding 7F-07] Seed 5-8 curated discussions & 3-5 curated debates across diverse topics.
  9. [Finding 7F-08] Add favicon.ico and app icons to public/ directory.

[P2 — SHOULD FIX BEFORE WIDER BETA]
 10. [Finding 7F-09] Increase mobile touch target hit areas on claim actions.
 11. [Finding 7F-10] Add prefers-reduced-motion CSS support in globals.css.
 12. [Finding 7F-11] Decommission dead legacy components (MapTab, DiscussionIntelligence, dead reputation).
 13. [Finding 17]    Implement Early Beta Tester / Founding Member recognition badge on user profiles.

[P3 — POST-BETA / POLISH]
 14. [Section 21]    Subtle sound micro-interactions with global mute toggle.
 15. [Section 20]    Figma-assisted visual polish & micro-typography pass.
 16. [Section 10]    Expandable search input inline in sidebar.
================================================================================
```

---

## 31. Product Decisions Required

### DECISION REQUIRED 1: Owner Private Room Inspection Model
- **Question:** How should the product owner inspect private debate rooms for safety/moderation while respecting user privacy?
- **Option A (Silent Admin Bypass):** Admin role can view any private room read-only without being listed in the room's participant roster. An audit log entry is written whenever an admin accesses a private room.
- **Option B (Visible Super-Participant):** Admin must explicitly join the private room, appearing with an official "Staff / Admin" badge in the room header so participants know moderation is active.
- **Tradeoffs:** Option A preserves discreet safety investigations but risks perceived surveillance. Option B is transparent but may alert bad actors during active harassment investigations.
- **Recommendation:** **Option A with mandatory audit logging.** Operational safety requires the owner to inspect abusive private rooms without tipping off perpetrators, backed by strict internal audit logs.

### DECISION REQUIRED 2: Pre-Beta Data Cleanup Strategy
- **Question:** Should developer scratch fixtures in the production database be purged via hard deletion or tombstoned/archived?
- **Option A (Complete Purge):** Delete test rooms (`testtest`, `Invitation Flow QA *`) and scratch claims/evidence cleanly from the database via an admin migration.
- **Option B (Archive / Soft-Delete):** Mark test rooms as `archived` or `hidden` so they drop out of discovery feeds but preserve referential integrity.
- **Tradeoffs:** Option A provides a pristine zero-clutter database for launch. Option B avoids risk of foreign key constraint errors if scratch records are deeply linked.
- **Recommendation:** **Option A for test records** where created by internal developer UUIDs; **Option B** for any rooms with valid multi-user history.

---

## 32. Implementation Work Remaining

To achieve full beta readiness, the following work units remain:
1. **Admin Console (Phase 8A):**
   - Admin layout and authentication gate (`hasRole("admin")`).
   - Private room inspector with audit log.
   - User feedback and suggestion triage dashboard.
   - Room lifecycle management (lock, unlist, archive).
2. **About Discora & Brand Identity (Phase 8B):**
   - Rich `/about` page with interactive storytelling components.
   - Branded favicon and icon assets in `public/`.
   - Contact links (`hello@discora.com`) in footer and modals.
3. **Resilience & Production Hardening (Phase 8C):**
   - Offline detection banner and network status listener.
   - Resend / custom SMTP configuration for `no-reply@auth.discora.com`.
   - Production execution and verification of pending security migrations.
4. **Data Hygiene & Topic Seeding (Phase 8D):**
   - DB cleanup of scratch test fixtures.
   - Seeding of 6 curated discussions and 4 curated debates with starter evidence and claims.

---

## 33. Things That Should NOT Be Changed Yet

1. **Do NOT redesign Discussion or Debate room layouts:** Phase 7D/E established an excellent, validated layout. Do not alter room navigation, lens tabs, or conversation hierarchy.
2. **Do NOT invent SoU scoring or maturity thresholds:** The deterministic 3-pillar epistemic model (*Supported*, *Contested*, *Unresolved*) is approved and working. Keep maturity thresholds strictly OPEN.
3. **Do NOT re-introduce consensus or vote weighting:** Voting must remain strictly descriptive community stance.
4. **Do NOT add sound effects yet:** Audio assets and sound synthesis should wait until the visual design system is finalized.
5. **Do NOT attempt broad visual overhauls without Figma designs:** Avoid ad-hoc CSS tweaks; reserve visual polish for a dedicated design pass.

---

## 34. Recommended Next Phase

### Phase 8A — Admin / Owner Console & Operational Tooling
- **Primary Goal:** Provide the platform owner with operational visibility, private room oversight, and user feedback triage prior to admitting beta cohorts.
- **Scope:**
  1. Route `/admin` guarded by server-side `admin` role check.
  2. Tab 1: **Rooms Oversight** (Browse all public and private rooms, view participant counts, lock/archive rooms, inspect private rooms with audit trail).
  3. Tab 2: **User Feedback & Suggestions** (Read, filter by category `bug`/`suggestion`, mark `reviewed`/`archived`).
  4. Tab 3: **Moderation Queue** (Unified queue connecting to existing flag resolution).
  5. Tab 4: **Audit Logs** (Administrative actions log).

---

## 35. MCP Verification

| MCP Capability | Verified | Actually Used | Notes |
|---|---|---|---|
| **Playwright** | YES | **YES** | Used extensively to audit 1440px desktop, 834px tablet, 390px mobile, and 375px small mobile across Homepage, Discussions, Debates, Search, Claims, Evidence, Questions, SoU, and 404 error states. Evaluated live DOM, overflow metrics, and console logs. |
| **Fetch** | YES | **NO** | Intentionally unused: All testing was conducted directly against the running application dev server (`host.docker.internal:3000`) and local codebase files. No third-party HTTP fetching was needed. |
| **GitHub Official** | YES | **YES** | Used earlier to confirm git commit history, compare local repository state with remote origin, and verify branch integrity. |
| **Context7** | YES | **NO** | Intentionally unused: Project architecture, governance rules, and specifications were fully available within local markdown documentation (`docs/`, `AGENTS.md`). |
| **Sequential Thinking** | YES | **YES** | Used to structure audit reasoning, evaluate severity of blockers, synthesize findings, and formulate product recommendations. |

---

## 36. Final Product Judgment

### 1. Could a real new user understand Discora without being taught by the developer?
**Yes, within a room, but No at the platform level.**
Once a user enters a discussion or debate, the `RoomGuideCard`, clean conversation feed, and intuitive lens tabs make the mechanics approachable. However, arriving on the homepage without an `/about` page and seeing test rooms like `testtest` creates immediate conceptual confusion.

### 2. Could a user meaningfully discuss/debate a topic today?
**Yes.**
The conversation flow, threaded replies, claim creation, evidence citations, targeted inquiries, and side-switching operate reliably and responsively.

### 3. Does the understanding layer genuinely add value?
**Yes.**
The State of Understanding lens gives users a bird's-eye view of where empirical evidence exists versus where assertions remain ungrounded, without declaring artificial winners. It fulfills Discora's core value proposition.

### 4. Is the product philosophically aligned?
**Yes.**
The active interface is rigorously free of winner/loser scoring, popularity-based epistemic authority, and gamification. Dead code traces in legacy files are cataloged for cleanup.

### 5. Is there anything unsafe for beta?
**Yes.**
The absence of an Owner Console means the product owner cannot oversee private rooms or intervene if abusive behavior occurs in an unlisted room. Furthermore, pending database hardening migrations must be verified on production.

### 6. Is there anything fundamentally confusing?
**Yes.**
The presence of developer scratch data (`yaaadsddsdsd`, `testtest`) on discovery feeds makes the product feel broken to an uninitiated visitor.

### 7. What MUST be fixed before beta?
1. Owner/Admin Console (Finding 7F-01).
2. About Discora page (Finding 7F-02).
3. Purge developer scratch/test data (Finding 7F-03).
4. Verify production security hardening migration (Section 24).

### 8. What can wait until after beta?
1. Audio micro-interactions and sound effects.
2. Figma-assisted visual polish.
3. Founding member recognition badges.
4. Expandable sidebar search input.

### 9. What requires a product decision?
1. Owner Private Room Inspection Model (Silent audit-logged bypass vs visible super-participant).
2. Pre-Beta Data Cleanup Strategy (Hard deletion vs soft-delete archiving).

### 10. What should the next implementation phase be?
**Phase 8A — Admin / Owner Console & Operational Tooling.**
