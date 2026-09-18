# Discora — Phase 9B: Legal, Privacy & Cookie Readiness Audit
## Factual Audit of Actual Data Flows, Device Storage, and Legal Surfaces Before Public Beta

**Audit Date:** September 14, 2026  
**Auditor:** Antigravity AI Agent  
**Environment:** Next.js 15.5.25 App Router, React 19, Supabase Auth/PostgreSQL, Tailwind CSS, Playwright MCP  
**Audit Mode:** READ-ONLY / AUDIT ONLY (Zero source code modifications, zero schema changes, zero legal document drafting)

---

## 1. Executive Summary

A comprehensive, evidence-based audit of Discora's actual data collection, device storage, third-party flows, and legal surfaces was conducted. Rather than assuming compliance requirements or inferring data collection from installed dependencies, this audit examined the running codebase, live PostgreSQL migrations, Playwright browser execution, and authoritative legal frameworks (India DPDP Act 2023, IT Rules 2021, CERT-In Directions 2022, and EU GDPR).

### Key Audit Findings:
1. **Minimalist Data Footprint:** Discora processes an extraordinarily lean volume of personal data. It collects only `email` and `password` for authentication, and user-provided profile metadata (`username`, `display_name`, `bio`, `avatar_url`). It has **zero third-party advertising trackers**, **zero behavioral analytics packages**, **zero marketing pixels**, and **zero tracking cookies**.
2. **Device Storage & Cookies:** Discora operates with only **two cookies**:
   - `discora_visited` (First-party, Lax, 1-year maxAge): Functional routing cookie directing first-time guests to `/about`. Contains only the string `"true"`, zero PII.
   - Supabase session cookies (`sb-<ref>-auth-token` chunks): Strictly necessary, HttpOnly, encrypted authentication tokens.
   - **Cookie Consent Verdict:** Under Indian and European ePrivacy rules, strictly necessary and functional routing cookies do not require an intrusive cookie consent banner. A banner would contradict Discora’s core philosophy (*intellectual clarity over engagement/friction*). A transparent "Cookies & Device Storage" disclosure inside the Privacy Policy is the legally and architecturally appropriate solution.
3. **Telemetry & Sentry:** `@sentry/nextjs` is installed and configured with epistemic privacy safeguards (`sendDefaultPii: false`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, and `beforeSend` scrubbing of `ip_address`, `email`, `username`, `authorization`, and `cookie` headers). Sentry is **conditionally inactive** when DSN environment variables are absent.
4. **Legal Surface Gaps (P0 Launch Blocker):** Discora currently has **zero legal pages** deployed. There are no `/terms`, `/privacy`, or `/cookies` routes. The registration page (`/register`) contains no Terms link, no Privacy Policy link, and no legal acknowledgment. Under Indian IT Rules 2021 (Rule 3(1)(a)), operating an interactive intermediary without published Terms, Privacy Policy, and a named Grievance Officer is unlawful.
5. **Account Deletion Gap (P1):** While PostgreSQL foreign key cascades and `ON DELETE SET NULL` triggers are architecturally implemented at the database layer, the user-facing UI in `SettingsPageClient` explicitly disables account deletion (*"Account deletion is not yet available. This feature will be implemented in a future release."*). Users cannot self-serve deletion.

### Overall Legal/Privacy Readiness Score: **71 / 100**
- **Data Minimization & Epistemic Privacy Architecture:** 96/100
- **Database RLS & Anonymity Controls:** 94/100
- **Cookies & Device Storage Cleanliness:** 98/100
- **Legal Surfaces & User Agreements:** 15/100 (Critical gap: pages do not exist)
- **Statutory Grievance & Regulatory Readiness (India/DPDP):** 52/100 (Missing Grievance Officer & statutory notices)

---

## 2. Scope

The scope of this audit covers:
- Complete inventory of personal, content, moderation, and system data.
- Supabase Auth, session lifecycle, token exchange, and RLS security boundaries.
- Google OAuth data flow and storage.
- Email transmission mechanisms and Resend configuration.
- Sentry error monitoring, sampling, and PII scrubbing behavior.
- Browser cookies, `localStorage`, `sessionStorage`, and persistent state.
- Account deletion mechanisms, cascading foreign keys, and orphan data risks.
- Data retention behavior across PostgreSQL tables and audit logs.
- Public vs. private data exposure across discussions, debates, and user profiles.
- Founding Participant feature verification against historical governance.
- Existing legal surfaces and UI consent mechanics.
- Statutory compliance analysis under Indian law (DPDP Act 2023, IT Rules 2021, CERT-In Directions 2022).
- Statutory compliance analysis under EU GDPR (Territorial scope, Art. 3(2)).
- Children and age eligibility policy status.
- Classification of all findings into P0–P3 severities and operational categories.

---

## 3. Sources Reviewed

### Project Governance & Architecture
- `docs/DISCORA_AGENT_GOVERNANCE.md` (Authority hierarchy, agent constraints)
- `docs/00_MASTER_CONTEXT.md` (Product philosophy, non-negotiable principles)
- `docs/01_PRD.md` & `docs/02_FEATURE_REGISTRY.md` (Product capabilities)
- `docs/04_DATABASE_DESIGN.md` & `docs/05_SYSTEM_ARCHITECTURE.md` (Data schemas)
- `docs/11_SECURITY_AND_ACCESS.md` (Security model, access controls, moderation roles)
- `docs/23_KNOWLEDGE_MODEL.md` (Epistemic claims, evidence, inquiries)
- `docs/DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC.md` (Room lifecycle, contributions)
- `docs/COMPREHENSIVE_MVP_PUBLIC_BETA_AUDIT.md` (MVP audit findings)
- `docs/HOW_DISCORA_WORKS_AUDIT.md` (Epistemic sandbox & onboarding)
- `docs/PHASE_8H_BETA_HARDENING.md` (Accessibility & UI remediation)
- `docs/PHASE_9A_PRODUCTION_INTEGRATION_AUDIT.md` (Infrastructure readiness)

### Code & Configuration Sources
- `package.json` (Dependency manifest)
- `sentry.client.config.ts`, `sentry.server.config.ts`, `src/instrumentation.ts`
- `src/services/supabase/client.ts`, `src/services/supabase/server.ts`, `src/services/supabase/middleware.ts`
- `src/app/auth/callback/route.ts`
- `src/features/auth/components/register-form.tsx`, `src/features/auth/components/login-form.tsx`
- `src/features/settings/components/settings-page-client.tsx`, `src/features/settings/components/feedback-modal.tsx`
- `src/features/profiles/services/profile-service.ts`, `src/app/u/[username]/page.tsx`
- `src/features/admin/services/admin-service.ts`, `src/lib/security/owner-guard.ts`
- 73 Supabase SQL migrations in `supabase/migrations/`

### Authoritative Legal & Regulatory Sources
- Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023, Gazette of India)
- Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (MeitY)
- Information Technology Act, 2000 (Section 43A, Section 79)
- CERT-In Directions under Section 70B(6) of IT Act, 2000 (April 28, 2022)
- Regulation (EU) 2016/679 (General Data Protection Regulation — GDPR), Articles 3, 6, 12, 13, 17, 27
- EDPB Guidelines 3/2018 on the territorial scope of the GDPR (Article 3)

---

## 4. Tools / MCP Used

- **PLAYWRIGHT MCP:** Automated browser testing executed against local instance (`http://host.docker.internal:3001`). Inspected live cookies via `page.context().cookies()`, evaluated `localStorage` and `sessionStorage`, validated viewport responsiveness (1440px desktop down to 375px mobile), and verified snapshot DOM hierarchies.
- **POWERSHELL / PWSH:** Exact file inspections, Ripgrep pattern searches, directory listings, and process monitoring.
- **TYPESCRIPT / ESLINT / NEXT COMPILER:** Read-only compilation audits (`npx tsc --noEmit` and `npm run lint`).

---

## 5. Actual Personal Data Inventory

| Category | Specific Data Item | Source | Collection Trigger | Storage Location | Processing Purpose | Visibility | Third-Party Recipients | Current Deletion / Retention | Code Evidence |
|---|---|---|---|---|---|---|---|---|---|
| **Account** | Email Address | User Input / OAuth | Registration or Login | `auth.users` (Supabase Auth schema) | Authentication, password reset, account identification | Strictly Private (Not in `public.profiles`, not in client views) | Supabase, Resend (via SMTP) | Retained indefinitely until auth user deletion | `src/features/auth/services/auth-service.ts:38` |
| **Account** | Hashed Password | User Input | Registration / Password Change | `auth.users` (Bcrypt/Argon2 via Gotrue) | Credential verification | System internal only | Supabase | Retained until changed or user deleted | `src/features/auth/services/auth-service.ts:39` |
| **Account** | User UUID (`id`) | Supabase Auth | User Signup | `auth.users`, `public.profiles`, foreign keys | Primary key linking user to contributions | Publicly visible in raw API/views if identity_mode = 'public' | Supabase | Cascaded or set null on auth user delete | `supabase/migrations/202606030001_create_profiles.sql:5` |
| **Account** | Username | User Input | Profile Setup / Edit | `public.profiles.username` | Handle, attribution, routing (`/u/[username]`) | **Public** | Supabase | Deleted on profile cascade | `supabase/migrations/202606030001_create_profiles.sql:6` |
| **Account** | Display Name | User Input | Profile Edit | `public.profiles.display_name` | Human-readable user name | **Public** | Supabase | Deleted on profile cascade | `supabase/migrations/202606130001_add_display_name_and_preferences.sql:5` |
| **Account** | Bio | User Input | Profile Edit | `public.profiles.bio` | User self-description (max 500 chars) | **Public** | Supabase | Deleted on profile cascade | `supabase/migrations/202606030001_create_profiles.sql:7` |
| **Account** | Avatar URL | User Upload / OAuth | Avatar upload or Google OAuth | `public.profiles.avatar_url`, Supabase `avatars` bucket | Visual representation | **Public** | Supabase Storage | URL deleted on profile delete; image file in bucket orphaned | `src/features/profiles/services/profile-service.ts:212` |
| **Account** | Privacy Preferences | User Toggles | Settings > Privacy | `public.user_preferences` (`show_reputation`, `show_expertise`, etc.) | Gating public profile metrics | Private to user; queried via RPC for profile page | Supabase | Deleted on user cascade | `supabase/migrations/202606130001_add_display_name_and_preferences.sql:8` |
| **Account** | Founding Participant Flag | System/Admin Grant | Platform milestone recognition | `public.profiles.is_founding_member` | Badge display on profile header | **Public** | Supabase | Deleted on profile cascade | `supabase/migrations/202609130002_phase_8d_data_hygiene_and_seeding.sql:11` |
| **Content** | Discussions & Rooms | User Creation | Create Discussion / Debate | `public.rooms`, `public.discussions`, `public.debates` | Discourse topic hosting | **Public** (or Private if private room) | Supabase | Retained indefinitely; `created_by` SET NULL on user delete | `supabase/migrations/202606030003_create_discussions.sql:29` |
| **Content** | Messages | User Input | Room conversation posting | `public.messages` | Conversational discourse | **Public** in public rooms; Masked if `identity_mode='anonymous'` | Supabase | Retained indefinitely; `user_id` SET NULL on user delete | `supabase/migrations/202606040001_create_moderation.sql:140` |
| **Content** | Claims | User Input | Room structured posting | `public.claims` | Epistemic proposition tracking | **Public** | Supabase | Retained indefinitely; `created_by` SET NULL on user delete | `supabase/migrations/202606030004_create_claims.sql:47` |
| **Content** | Evidence & Sources | User Input | Evidence submission | `public.evidence`, `public.sources` | Epistemic grounding | **Public** | Supabase | Retained indefinitely; `created_by` SET NULL on user delete | `supabase/migrations/202606030005_create_evidence.sql:11` |
| **Content** | Questions & Inquiries | User Input | Inquiry / Question creation | `public.questions`, `public.inquiry_items`, `public.inquiry_responses` | Socratic inquiry | **Public** | Supabase | Retained indefinitely; cascades or sets null | `supabase/migrations/202606120001_create_inquiry_tables.sql:8` |
| **Content** | Votes & Reactions | User Action | Agree/Disagree, Evidence stance, Message reaction | `public.claim_votes`, `public.evidence_votes`, `public.reactions` | Epistemic consensus computation | Aggregated counts public; individual votes private to user | Supabase | Deleted on user cascade (`on delete cascade`) | `supabase/migrations/202609090005_reactions_foundation.sql:15` |
| **Content** | Saved Rooms | User Action | Bookmark / Save Room | `public.user_saves` | User personal library | Private to user | Supabase | Deleted on user cascade | `supabase/migrations/202606260001_create_user_saves.sql:12` |
| **Moderation** | Abuse Reports | User Submission | "Report" button on content | `public.moderation_flags` | Community moderation | Private to user & moderators; masked in queue | Supabase | Retained indefinitely; `reporter_id` SET NULL on user delete | `supabase/migrations/202606040001_create_moderation.sql:59` |
| **Moderation** | Feedback Submissions | User Submission | "Feedback" modal in UI | `public.user_feedback` | Product defect & UX reports | Admins/Moderators only | Supabase | Retained indefinitely; `user_id` SET NULL on user delete | `src/features/settings/components/feedback-modal.tsx:118` |
| **Moderation** | Admin Audit Logs | System Event | Admin console actions | `public.admin_audit_logs` | Accountability for privileged actions | Superuser / Admin only | Supabase | Retained indefinitely | `supabase/migrations/202609130001_admin_console_foundation.sql:7` |
| **System** | Session Cookies | System Auth | Login / Token Refresh | Client Browser (`sb-*-auth-token`) | Session persistence | Browser & Supabase SSR only | Supabase | Cleared on logout / browser session end | `src/services/supabase/middleware.ts:24` |
| **System** | First-Visit Routing Cookie | System Middleware | Visit to `/` or `/about` | Client Browser (`discora_visited`) | Direct new guests to `/about` guide | Browser & Next.js Server only | None (First-party only) | 1-year maxAge or until manual browser clear | `src/services/supabase/middleware.ts:81` |
| **System** | Error Logs / Telemetry | Runtime Exception | Uncaught runtime error | Sentry (if DSN configured) | Platform stability & crash diagnostics | Sentry Dashboard (operator only) | Functional Software Inc (Sentry) | Default 90-day retention in Sentry Cloud | `sentry.client.config.ts:12` |

---

## 6. Data-Flow Map

```mermaid
flowchart TD
    subgraph ClientBrowser [User Browser / Client]
        GuestUser[Guest Visitor]
        RegUser[Authenticated User]
        Cookies[Cookies: discora_visited, sb-auth-token]
        LocalStorage[LocalStorage: sidebar_collapsed, onboarding_v1]
    end

    subgraph EdgeMiddleware [Next.js Edge / SSR Layer]
        MW[middleware.ts: Session Refresh & /about Route Guard]
        Callback[/auth/callback: PKCE Code Exchange]
    end

    subgraph AuthServer [Supabase Auth / GoTrue]
        GoTrueAuth[Auth Service]
        UsersTable[auth.users: email, hashed_pw, provider_id]
    end

    subgraph DatabaseLayer [PostgreSQL Database]
        PublicProfiles[public.profiles]
        DiscourseData[Rooms, Messages, Claims, Evidence, Inquiries]
        VotesSaves[Votes, Reactions, Saves, Preferences]
        ModerationData[moderation_flags, user_feedback, admin_audit_logs]
    end

    subgraph ExternalProcessors [Third-Party Services]
        GoogleOAuth[Google Cloud: OAuth Identity Provider]
        ResendSMTP[Resend SMTP: Transactional Auth Emails]
        SentryMonitoring[Sentry: Scrubbed Crash Telemetry - Conditionally Enabled]
        SupabaseStorage[Supabase Storage: avatars bucket]
    end

    GuestUser -->|1. GET /| MW
    MW -->|Sets discora_visited=true| Cookies
    MW -->|Redirects first-visit guest| GuestUser

    RegUser -->|2. Register / Login with Email| GoTrueAuth
    GoTrueAuth -->|Sends verification email| ResendSMTP
    ResendSMTP -->|Delivers link| RegUser

    RegUser -->|3. Continue with Google| GoogleOAuth
    GoogleOAuth -->|Returns auth code| Callback
    Callback -->|exchangeCodeForSession| GoTrueAuth
    GoTrueAuth -->|Writes auth cookies| Cookies

    GoTrueAuth -->|One-to-One Link| PublicProfiles
    RegUser -->|Create content, vote, save| DiscourseData
    RegUser -->|Submit report or feedback| ModerationData
    RegUser -->|Save preferences| VotesSaves

    RegUser -.->|Upload avatar| SupabaseStorage
    ClientBrowser -.->|Uncaught JS Error - PII Scrubbed| SentryMonitoring
```

---

## 7. Supabase / Auth Findings

1. **Authentication Provider & Flow:**
   - Supabase Auth (`@supabase/supabase-js` v2.49.4 and `@supabase/ssr` v0.10.3) manages authentication.
   - Email/password flow uses standard PKCE flow with email confirmation redirecting to `${origin}/auth/callback?next=/about`.
   - Google OAuth redirects to `${origin}/auth/callback` with safe redirect parameter validation via `getSafeRedirectUrl()`.
2. **Session & Cookie Handling:**
   - Server-side cookie synchronization is handled in `src/services/supabase/middleware.ts` via `@supabase/ssr` `createServerClient`.
   - Cookies set: `sb-<project-ref>-auth-token` (split chunks if large), HttpOnly, SameSite=Lax, Secure (in production HTTPS).
   - Server components read cookies via `src/services/supabase/server.ts` `cookies()` from `next/headers`.
3. **Database Relationships & Foreign Key Integrity:**
   - Profile table: `public.profiles` (`id references auth.users(id) on delete cascade`).
   - Preferences: `public.user_preferences` (`user_id references auth.users(id) on delete cascade`).
   - Personal Saves: `public.user_saves` (`user_id references auth.users(id) on delete cascade`).
   - Discourse Claims/Evidence/Discussions/Messages: `created_by references auth.users(id) on delete set null`.
   - This ensures discourse integrity: if an author is removed, their published propositions remain in the epistemic graph to maintain conversational coherence, with the author set to `null` (rendered as `"Deleted User"` in SQL views).
4. **Orphaned Data Risks on Deletion:**
   - **Avatar Files:** When an `auth.users` row is deleted, the cascade removes `public.profiles`, but does NOT remove the image file stored in the Supabase Storage `avatars` bucket at `${userId}/avatar.${ext}`. A storage cleanup webhook or function is required.
   - **Feedback Submissions:** `public.user_feedback` sets `user_id` to NULL on delete, preserving the bug report anonymously.

---

## 8. Google OAuth Findings

1. **Information Received:**
   - When a user signs in with Google, Supabase Auth exchanges the authorization code with Google's OAuth 2.0 endpoints (`https://accounts.google.com/o/oauth2/v2/auth`).
   - Google returns standard OpenID Connect profile claims: `sub` (Google User ID), `email`, `email_verified`, `name`, `full_name`, `picture` (Google avatar URL).
2. **Information Stored by Discora:**
   - Supabase stores these claims in `auth.users.raw_user_meta_data`.
   - Discora application tables (`public.profiles`) do **not** automatically clone the Google name or Google picture unless the user explicitly sets them during profile setup.
   - Google OAuth access tokens and refresh tokens are managed entirely by Supabase Auth; they are **never exposed to client-side JavaScript or Discora application code**.
3. **Callback & Redirect Security:**
   - Route handler: `src/app/auth/callback/route.ts`.
   - Open redirect prevention: Validated through `getSafeRedirectUrl(target, "/about")`, which rejects external protocols (`http:`, `https:`, `//`, javascript:) and only permits verified relative internal application paths.
4. **Production Configuration Dependency:**
   - **Operator Dependency:** In production, Google Cloud Console Authorized JavaScript Origins must be updated to `https://discora.com` and Authorized Redirect URIs must point to `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.

---

## 9. Email / Resend Findings

1. **Integration Architecture:**
   - Discora does **not** install or import the Resend SDK into Next.js source code (`package.json` contains no `@resend/node` or `resend`).
   - Email delivery is configured entirely through **Supabase Auth SMTP Settings** (`.env.example:10-17`).
2. **Email Triggers & Data Sent:**
   - **Signup Confirmation:** Sent when a user registers with email/password (`auth-service.ts:38`).
   - **Password Reset:** Sent when a user requests a reset (`auth-service.ts:102`).
   - **Email Change Verification:** Sent when a user modifies their email in settings (`auth-service.ts:124`).
   - Data passed to SMTP processor (Resend): Recipient email address, verification URL token, sender display name (`Discora Authentication`), and sender address (`no-reply@auth.discora.com`).
3. **Third-Party Processor Implication:**
   - Resend acts as a **Subprocessor** for email transmission under GDPR / DPDP. Resend's Data Processing Addendum (DPA) and data retention policy (logs retained for 30 days) must be documented in the Privacy Policy.

---

## 10. Sentry / Telemetry Findings

1. **Initialization & Activation:**
   - Configured in `sentry.client.config.ts`, `sentry.server.config.ts`, and `src/instrumentation.ts`.
   - **Activation Condition:** Sentry is explicitly gated: `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`.
   - **Current Status:** In local development and testing, both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` are blank. Therefore, **Sentry is NOT ACTIVE and transmits zero data**.
2. **Epistemic Privacy Safeguards (When Enabled in Production):**
   - **DOM Session Replays:** Disabled completely (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`). This strictly prevents DOM recording of private debate drafts, unsubmitted compositions, or reading patterns.
   - **Default PII:** Disabled (`sendDefaultPii: false`).
   - **`beforeSend` Redaction Filter:**
     ```typescript
     beforeSend(event) {
       if (event.user) {
         delete event.user.ip_address;
         delete event.user.email;
         delete event.user.username;
       }
       if (event.request?.headers) {
         delete event.request.headers["authorization"];
         delete event.request.headers["cookie"];
       }
       return event;
     }
     ```
   - **Data Transmitted When Active:** Only stack traces, exception messages, browser user-agent, operating system, and runtime version. Zero IP addresses, zero emails, zero usernames, zero cookies, zero authorization tokens.

---

## 11. Cookie Inventory

The Playwright browser inspection against the running Discora application verified all active cookies across all major user routes (`/`, `/about`, `/login`, `/register`, `/discussions`, `/debates`, `/search`):

| Cookie Name | Provider | Domain | Path | Expiry / Max-Age | HttpOnly | Secure | SameSite | Category | Data / Content | Feature Dependency |
|---|---|---|---|---|---|---|---|---|---|---|
| `discora_visited` | First-party (Discora) | Current host | `/` | 365 days (1 year) | `false` | `false` (dev) / `true` (prod) | `Lax` | **Functional (Routing)** | Plain text `"true"` (no PII, no identifier) | Directs first-time guests to `/about` instead of raw feed |
| `sb-<ref>-auth-token` (and chunks) | First-party (Supabase Auth) | Current host | `/` | Session / 1 year refresh | `true` | `true` (prod HTTPS) | `Lax` | **Strictly Necessary** | Encrypted JWT access and refresh session tokens | Authentication, profile guard, RLS authorization |
| `__next_hmr_refresh_hash__` | First-party (Next.js Dev) | Current host | `/` | Session (`-1`) | `false` | `false` | `Lax` | **Development Only** | Hash string | Hot module reloading (does not exist in production) |

### Cookie Audit Conclusions:
- **Zero Third-Party Cookies:** No third-party domains set cookies.
- **Zero Analytics / Tracking Cookies:** No Google Analytics (`_ga`), PostHog, or Mixpanel cookies exist.
- **Zero Advertising / Marketing Pixels:** No Meta Pixel (`_fbp`), LinkedIn, or Twitter ad tracking exists.
- **Zero Sentry Cookies:** Sentry does not drop cookies.

---

## 12. LocalStorage, SessionStorage & IndexedDB Inventory

### LocalStorage:
1. `discora_onboarding_v1`
   - **Purpose:** Tracks user progress through the interactive "How Discora Works" discovery guide.
   - **Stored Data:** JSON object containing `status` (`not_started` | `in_progress` | `completed`), `currentTab`, `dismissedGuides`, `selectedTopics` (array of topic strings), `preferredFormat` (`both` | `claims` | `discussions`), `hasInteractedSandbox` (boolean).
   - **Personal Data:** NO personal data. Purely functional client UX state.
   - **Code Evidence:** `src/features/onboarding/hooks/use-onboarding.ts:11-23`
2. `discora_sidebar_collapsed`
   - **Purpose:** Remembers whether the user preferred the desktop navigation sidebar collapsed or expanded.
   - **Stored Data:** String `"true"` or `"false"`.
   - **Personal Data:** NO personal data. Purely UI preference.
   - **Code Evidence:** `src/components/layout/app-shell.tsx:21-34`
3. `theme` (via `next-themes`)
   - **Purpose:** Remembers user dark/light mode preference.
   - **Stored Data:** `"dark"`, `"light"`, or `"system"`.
   - **Personal Data:** NO personal data.
   - **Code Evidence:** `src/components/providers/theme-provider.tsx:6`

### SessionStorage:
1. `discora_intelligence_collapsed`
   - **Purpose:** Tracks which collapsible cards in the discussion intelligence overview panel the user has closed during their current browser session.
   - **Stored Data:** JSON array of section IDs (e.g. `["consensus", "tensions"]`).
   - **Personal Data:** NO personal data. Cleared automatically on browser tab closure.
   - **Code Evidence:** `src/features/discussions/components/discussion-intelligence.tsx:31-39`

### IndexedDB:
- **Status:** NOT IN USE. Zero IndexedDB stores are opened or accessed by Discora.

---

## 13. Account Deletion Findings

1. **Current UI Implementation:**
   - Location: `/settings` > Danger Zone (`src/features/settings/components/settings-page-client.tsx:427-462`).
   - **Finding:** The "Delete Account" button is hardcoded with `disabled` and displays an explicit alert:
     > *"Account deletion is not yet available. This feature will be implemented in a future release."*
   - **Classification:** **P1 Engineering Gap** (Required before public beta under DPDP Act 2023 Section 12(3) and GDPR Article 17).
2. **Database Cascade Architecture (Already Implemented):**
   - If an `auth.users` record is deleted by an operator directly in the Supabase Dashboard:
     - `public.profiles`: **DELETED** (`on delete cascade`).
     - `public.user_preferences`: **DELETED** (`on delete cascade`).
     - `public.user_saves`: **DELETED** (`on delete cascade`).
     - `public.user_roles`: **DELETED** (`on delete cascade`).
     - `public.reactions`: **DELETED** (`on delete cascade`).
     - `public.claim_votes` & `public.evidence_votes`: **DELETED** (`on delete cascade`).
     - `public.messages`, `public.claims`, `public.evidence`, `public.discussions`: Authorship `created_by` is **SET TO NULL** (`on delete set null`).
     - In database views (`discussion_messages`, `moderation_queue`), null authors automatically render as `"Deleted User"`, preserving epistemic structure while anonymizing identity.
3. **Gaps in Deletion Flow:**
   - No self-service user API or RPC exists to delete an account.
   - User avatars in Supabase Storage (`avatars` bucket) are not pruned on database deletion.

---

## 14. Data Retention Findings

1. **Current System Retention Behavior:**
   - PostgreSQL tables: Retained indefinitely. There are no automated TTLs, no `pg_cron` jobs, and no expiration policies.
   - `public.admin_audit_logs`: Retained indefinitely.
   - `public.moderation_flags`: Retained indefinitely.
   - `public.user_feedback`: Retained indefinitely.
   - Supabase Auth logs (Gotrue audit): Retained by Supabase for 7 days (Free tier) or 30 days (Pro tier).
   - Sentry error logs: Retained by Sentry Cloud for 90 days (standard retention).
2. **Required Formal Retention Policy for Public Beta:**
   - A documented schedule must be established:
     - *Active accounts:* Retained while account remains active.
     - *Moderation flags & audit logs:* Retained for 180 days (aligning with CERT-In 180-day log direction) or 1 year for abuse defense.
     - *Feedback submissions:* Retained for 180 days or until issue resolution.
     - *Deleted accounts:* Personal identifiers purged immediately; published public claims and evidence retained with anonymized attribution indefinitely to protect knowledge integrity.

---

## 15. Admin & Moderation Data Findings

1. **Access Boundaries & Cloaking:**
   - The Admin Console (`/admin`) is protected by `src/lib/security/owner-guard.ts` via `requireOwner()`.
   - If the authenticated user does not match the server-only `DISCORA_OWNER_USER_ID`, the route handler throws `notFound()`, returning a generic 404 to hide the existence of the admin surface.
2. **What Admins Can View:**
   - Room management: Room titles, slugs, public/private visibility, open/archived status (`admin-service.ts:23`).
   - Moderation flags: Entity type, reason, room title, content snippet (`admin-service.ts:74`).
   - Feedback: User feedback submissions, category, URL, description.
   - Operational audit logs: Actions taken by administrators (`admin_audit_logs`).
3. **What Admins CANNOT View:**
   - Admins **cannot** browse a user list, view user email addresses, or read user passwords.
   - No user management dashboard exists in the Discora codebase.
4. **Moderator Queue Redaction (`public.moderation_queue`):**
   - The `moderation_queue` SQL view (`202606240003_fix_moderation_queue_regression.sql:14-80`) enforces strict anonymity:
     - `reporter_id`: **OMITTED** entirely from the view. Moderators cannot see who submitted a flag.
     - Anonymous content: If a flagged message was posted in anonymous mode, `author_username` is coerced to `'Anonymous'` and `author_avatar_url` is coerced to `NULL`.
     - `action_taken_by`: Omitted from the general view.

---

## 16. User-Generated Content Exposure

| Entity | Publicly Visible? | Private Mode Support? | Author Attributable? | Search Indexable? |
|---|---|---|---|---|
| **User Profile** | YES (`/u/[username]`) | Preferences allow hiding reputation, expertise, and switches | Public handle & display name | YES (via search) |
| **Discussion Room** | YES (`/discussions/[slug]`) | No (all discussions are public) | Attributed to creator | YES (`search_content` RPC) |
| **Debate Room** | YES if public; NO if private | Private debates require invitation code | Attributed to creator | Public rooms only |
| **Message** | YES in public rooms | Anonymous posting mode supported | Masked as "Anonymous" if selected | YES |
| **Claim** | YES | No anonymous mode on claims | Attributed to author | YES |
| **Evidence** | YES | No anonymous mode on evidence | Attributed to submitter | YES |
| **Question** | YES | Anonymous posting mode supported | Masked as "Anonymous" if selected | YES |
| **Inquiry** | YES | No anonymous mode on inquiries | Attributed to author | YES |
| **SoU Synthesis** | YES | N/A (Algorithmic aggregation) | Aggregated across all room claims | YES |
| **Moderation Report** | NO (Strictly Private) | Reporter never revealed | Omitted from moderation queue | NO |
| **User Feedback** | NO (Admin only) | Visible only to platform owner | Attributed if authenticated | NO |

---

## 17. Founding Participant Verification

The current repository implementation was audited against approved governance decisions:
1. **Terminology Check:** Uses exactly `"Founding Participant"`. Confirmed in `src/app/u/[username]/page.tsx:101`.
2. **Visual Presentation:** A subtle, non-authoritative badge (`border-primary/20 bg-primary/5 text-primary` with a 12px `Sparkles` icon) displayed solely on the user's public profile page header.
3. **No Contribution Badges:** Founding Participant status is **not** appended to messages, claims, evidence, or inquiries. Epistemic neutrality is preserved.
4. **No Public Founder Directory:** Confirmed. There is no founder leaderboard, no founder directory, and no dedicated founding member page.
5. **Database Mechanism:** Stored as `is_founding_member boolean not null default false` on `public.profiles` (`202609130002_phase_8d_data_hygiene_and_seeding.sql:11`). A database trigger prevents self-updates; only system/admin operations can grant it.
6. **Verdict:** **FULL COMPLIANCE** with historical governance. No drift detected.

---

## 18. Existing Legal & Privacy Surface Inventory

| Document / Page | Route | Status in Repo | Status in UI | Notes |
|---|---|---|---|---|
| **Terms of Service** | `/terms` | **NOT IMPLEMENTED** | Absent | 0 files found. No links in header, footer, or register form. |
| **Privacy Policy** | `/privacy` | **NOT IMPLEMENTED** | Absent | 0 files found. Settings has `/settings/privacy`, but it is user preference toggles, not a policy. |
| **Cookie Notice / Policy** | `/cookies` | **NOT IMPLEMENTED** | Absent | No cookie policy or disclosure exists. |
| **Community Guidelines** | `/guidelines` | **NOT IMPLEMENTED** | Absent | No formal guidelines page. Epistemic principles are described in `/about`, but not structured rules. |
| **Acceptable Use Policy** | N/A | **NOT IMPLEMENTED** | Absent | Prohibited content rules not documented. |
| **Grievance Redressal** | N/A | **NOT IMPLEMENTED** | Absent | No Grievance Officer name, email, or escalation process published. |
| **Account Deletion** | `/settings` | **PARTIAL** | Disabled | UI exists in Danger Zone but button is disabled with placeholder warning. |
| **Data Export (SAR)** | `/settings` | **PARTIAL** | Placeholder | Card exists in Data & Safety: *"This feature will be implemented in a future release."* |
| **Copyright / DMCA / IP Reporting** | N/A | **NOT IMPLEMENTED** | Absent | No notice and takedown mechanism published. |
| **AI Disclosure** | `/about` | **IMPLEMENTED** | Present | Dedicated section on `/about` explaining Discora’s position on AI vs. human judgment. |

---

## 19. India Legal Readiness Assessment

As an Indian digital product, Discora must navigate three foundational Indian statutes:

### 1. Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021
- **Status:** **ALREADY IN FORCE**.
- **Classification:** Discora is an **Intermediary** under Section 2(1)(w) of the IT Act, 2000 (an entity that receives, stores, or transmits electronic records or provides service with respect to that record).
- **Mandatory Due Diligence Requirements (Rule 3(1)):**
  - **Rule 3(1)(a):** Must prominently publish Rules and Regulations, Privacy Policy, and User Agreement for access or usage of the intermediary’s computer resource. *(Current status: NON-COMPLIANT — P0 Launch Blocker)*.
  - **Rule 3(1)(b):** Must inform users not to host, display, upload, modify, publish, transmit, or share prohibited content (obscene, pedophilic, defamatory, invasive of bodily privacy, infringing IP, threatening unity/integrity of India). *(Current status: NON-COMPLIANT — Must be embedded in Terms & Registration)*.
  - **Rule 3(2): Grievance Redressal Mechanism:**
    - Must prominently publish on website the name and contact details of a **Grievance Officer**.
    - Must establish mechanism to acknowledge complaints within 24 hours and resolve them within 15 days.
    - Must provide mechanism to remove non-consensual sexually explicit or impersonated content within 24 hours of receipt of complaint.
    - *(Current status: NON-COMPLIANT — P0 Launch Blocker)*.

### 2. Digital Personal Data Protection Act, 2023 (DPDP Act 2023)
- **Status:** **PHASED TIMELINE / NOTIFICATIONS PENDING**.
- **Classification:** Discora is a **Data Fiduciary**; users are **Data Principals**.
- **Key Principles & Operational Preparedness:**
  - **Notice (Section 5):** An itemized notice in clear and plain language detailing the personal data collected and the purpose of processing.
  - **Consent (Section 6):** Consent must be free, specific, informed, unconditional, and unambiguous. It cannot be bundled into a generic "agree to everything" checkbox.
  - **Right to Correction and Erasure (Section 12(3)):** Data Principals have the right to request erasure of their personal data. *(Requires fixing the disabled account deletion button)*.
  - **Processing of Children's Data (Section 9):** Requires verifiable parental consent for users under 18. *(Requires product decision on age eligibility)*.
  - **Phased Implementation Context:** While the primary operative sections await commencement notifications following the finalization of the DPDP Rules 2025, building in compliance now avoids expensive architectural rework.

### 3. CERT-In Directions of April 28, 2022
- **Status:** **ALREADY IN FORCE**.
- **Requirement:** Mandatory reporting of specified cyber security incidents (data breaches, identity theft, unauthorized system access) to the Indian Computer Emergency Response Team (CERT-In) within **6 hours** of noticing or being brought to notice.
- **Log Retention:** Requirement to securely maintain system logs within Indian jurisdiction or readily accessible for 180 days.

---

## 20. GDPR / EU Applicability Analysis

1. **Territorial Scope (Article 3):**
   - **Article 3(1) (Establishment):** Discora has no establishment, office, or legal entity in the European Union.
   - **Article 3(2) (Extraterritorial Reach):** Applies to non-EU entities only if processing activities relate to:
     - *(a) The offering of goods or services to data subjects in the Union; OR*
     - *(b) The monitoring of their behaviour as far as their behaviour takes place within the Union.*
2. **Analysis of Current Discora Implementation:**
   - **No Offering of Services to the EU (Art. 3(2)(a)):**
     - As clarified in EDPB Guidelines 3/2018 and Recital 23, the mere accessibility of an internet website in the EU is **insufficient** to trigger GDPR.
     - Discora operates in standard English, transacts no currency (completely free service), accepts no EUR/GBP, displays no EU-specific testimonials, and conducts no targeted marketing in EU member states.
   - **No Monitoring of EU Behaviour (Art. 3(2)(b)):**
     - Discora employs no tracking pixels, no behavioral profiling, no advertising personalization, and no session replay. Sentry scrubs IP addresses and user identifiers.
   - **Verdict:** Under current operations, **GDPR Article 3(2) does not apply by default**.
3. **Future Preparedness & Good-Faith Privacy Standard:**
   - If Discora accepts EU traffic during public beta, following GDPR-aligned principles (data minimization, right to erasure, purpose limitation) is best practice.
   - If Discora later intentionally targets EU users, it will trigger:
     - Obligation to appoint an EU Representative under Article 27 (unless exempt under Art. 27(2)).
     - Documented Lawful Basis mapping (Article 6).
     - Formal Standard Contractual Clauses (SCCs) for transfers outside the EEA.

---

## 21. Children & Age Policy Status

1. **Current Codebase State:**
   - Discora does **not** collect date of birth or age.
   - Discora has **no** age statement in registration, login, or settings.
   - Discora has **no** parental consent flow.
2. **Regulatory Constraints:**
   - **India DPDP Act 2023 (Section 9):** A "child" is any individual under 18 years old. Fiduciaries must obtain verifiable parental consent and must not undertake behavioral monitoring or targeted advertising.
   - **US COPPA:** Strict rules for children under 13.
   - **GDPR Article 8:** Consent threshold between 13 and 16 years.
3. **Product Decision Required:**
   - **Decision:** Discora must explicitly select its minimum age threshold for Public Beta:
     - *Option A (Recommended for Beta):* **18+ Only**. Declared in Terms of Service and registration footer: *"You must be at least 18 years old to create an account on Discora."* This eliminates immediate DPDP Section 9 parental consent verification requirements during early beta.
     - *Option B:* **13+ with 18+ for India**. Complex dual-jurisdiction gating.
   - **Status:** **PRODUCT DECISION REQUIRED**.

---

## 22. Third-Party / Processor Inventory

| Provider / Processor | Corporate Entity | Purpose in Discora | Data Transmitted / Processed | Current Configuration Status | Location of Processing | Documentation Required |
|---|---|---|---|---|---|---|
| **Supabase** | Supabase, Inc. (Singapore / USA) | Database hosting, Auth, Realtime, Storage | User email, hashed password, user UUID, profile metadata, discourse content, avatars | **Active & Essential** | Configured cloud region (AWS) | Subprocessor listing, DPA |
| **Google Cloud** | Google LLC (USA) | Federated OAuth Sign-in (Optional) | Google User ID (`sub`), email address, display name, avatar URL | **Configured in Code** (Requires prod OAuth URIs) | USA / Global | Privacy Policy disclosure, Google API User Data Policy |
| **Resend** | Resend, Inc. (USA) | Transactional Auth Email Delivery (SMTP) | Recipient email address, verification URL token, sender display name | **Configured in Supabase** (Operator SMTP setup) | USA | Subprocessor listing, SMTP DPA |
| **Sentry** | Functional Software, Inc. (USA) | Error reporting & crash diagnostics | Redacted error traces, browser/OS version (Zero PII, Zero IPs, Zero cookies) | **Configured in Code; Inactive in practice** (DSN unset) | USA / EU | Privacy Policy disclosure, optional error telemetry note |
| **Vercel** | Vercel, Inc. (USA) | Web Application Hosting & Edge Routing | IP address, HTTP request headers, routing paths (standard CDN logs) | **Production Target** | Global Edge Network | Host processor listing |

---

## 23. Cookie & Consent Decision

### Analysis:
- Discora uses:
  1. `discora_visited`: Functional routing cookie (first-party, Lax, no PII).
  2. `sb-*-auth-token`: Strictly necessary session cookie (first-party, HttpOnly).
- Discora uses **NO** third-party trackers, **NO** analytics cookies, **NO** marketing cookies.

### Recommendation:
- **DO NOT IMPLEMENT A BLOCKING COOKIE BANNER.**
- Under both Indian IT rules and EU ePrivacy Directive (Article 5(3)), strictly necessary cookies and basic routing/state cookies do not require prior consent banners.
- Presenting a cookie modal when no optional cookies exist creates artificial friction, annoys users, and violates Discora's core product philosophy.
- **Target Implementation:** Include a dedicated **"Cookies & Browser Storage"** section in the published Privacy Policy explaining what `discora_visited` and auth session cookies do.

---

## 24. Registration Consent & Legal UX

### Current State (`src/features/auth/components/register-form.tsx`):
- Form contains Email, Password, Confirm Password, Register button, and "Continue with Google".
- Zero legal links.
- Zero acknowledgment text.

### Recommended Target Structure (To Be Implemented in Phase 9C):
Below the Register button and below the Google Sign-in button, render clear, non-coercive legal text:
> *"By registering for Discora, you agree to our [Terms of Service] and acknowledge that you have read our [Privacy Policy]. You confirm you are at least 18 years of age."*

### Key Legal Guidelines:
- **No Conflation:** Do not write "I consent to the Terms and Privacy Policy." Terms are contractual agreements (user agrees); Privacy Policies are informational notices (user acknowledges).
- **No Checkbox Friction:** A clickwrap acknowledgment below the primary action button is legally standard and enforceable for online services.

---

## 25. Security & Incident Response Readiness

1. **Strengths in Current Architecture:**
   - Comprehensive PostgreSQL RLS across all 73 migrations.
   - Redacted `moderation_queue` SQL view preserving reporter and anonymous author privacy.
   - `admin_audit_logs` logging sensitive administrative actions (e.g. `PRIVATE_ROOM_INSPECTED`).
   - Server-only environment variables (`GEMINI_API_KEY`, `DISCORA_OWNER_USER_ID`) guarded against client bundle leakage.
2. **Readiness Gaps:**
   - **CERT-In 6-Hour Reporting Window:** Discora lacks an automated security incident escalation runbook. In the event of a credential stuffing attack or database breach, the operator must have a defined protocol to notify CERT-In within 6 hours.
   - **Data Breach Notification Policy:** No documented procedure exists to notify affected users in compliance with DPDP Section 8(6).

---

## 26. P0 / P1 / P2 / P3 Findings Classification

| ID | Severity | Category | Description | Exact Location / Evidence |
|---|---|---|---|---|
| **F-01** | **P0** | **ENGINEERING GAP / LEGAL** | **Missing Terms of Service Route:** Discora has no Terms of Service page. Operating without terms violates IT Rules 2021 Rule 3(1)(a). | No `/terms` route in `src/app/` |
| **F-02** | **P0** | **ENGINEERING GAP / LEGAL** | **Missing Privacy Policy Route:** Discora has no Privacy Policy page explaining data processing, storage, and rights. | No `/privacy` route in `src/app/` |
| **F-03** | **P0** | **ENGINEERING GAP / LEGAL** | **Missing Grievance Redressal Mechanism:** No named Grievance Officer, email contact, or redressal timeline published as required by IT Rules 2021 Rule 3(2). | Absent from UI and docs |
| **F-04** | **P0** | **ENGINEERING GAP / UX** | **Registration Legal Acknowledgment Missing:** The `/register` page does not link to Terms or Privacy Policy. | `src/features/auth/components/register-form.tsx:57-130` |
| **F-05** | **P1** | **ENGINEERING GAP** | **Account Deletion Disabled in UI:** Account deletion is disabled in Settings > Danger Zone with a placeholder message. | `src/features/settings/components/settings-page-client.tsx:447` |
| **F-06** | **P1** | **PRODUCT DECISION REQUIRED** | **Age Eligibility Threshold Undefined:** Codebase contains no age limit statement or child protection policy. | All auth and onboarding components |
| **F-07** | **P1** | **OPERATOR DEPENDENCY** | **External Subprocessor Accounts & Legal Verification:** Operator must accept DPAs / terms for Supabase, Resend, and Sentry. | Supabase / Resend / Sentry dashboards |
| **F-08** | **P2** | **ENGINEERING GAP** | **Avatar Storage Pruning on Deletion:** Deleting an account leaves avatar image files orphaned in the Supabase Storage `avatars` bucket. | `src/features/profiles/services/profile-service.ts:212` |
| **F-09** | **P2** | **DOCUMENTATION GAP** | **CERT-In Incident Response Runbook:** Need written operational procedure for 6-hour security incident reporting. | `docs/` |
| **F-10** | **P3** | **ENGINEERING GAP** | **Self-Service Data Export (SAR):** Data export feature in Settings is currently a placeholder. | `src/features/settings/components/settings-page-client.tsx:415` |

---

## 27. Product Decisions Required

1. **Age Eligibility Threshold:**
   - *Recommendation:* Set minimum age to **18+** for Public Beta. Simplifies compliance with India DPDP Section 9 without requiring immediate third-party parental verification integrations.
2. **Account Deletion Epistemic Policy:**
   - *Current Database Design:* Cascades profile/reputation, but sets author to NULL on published claims and evidence (retaining them as `"Deleted User"` to prevent broken discussions).
   - *Decision:* Confirm that the product owner formally approves this epistemic retention model (anonymizing authorship rather than destroying public knowledge graph nodes).
3. **Designated Grievance Officer:**
   - *Requirement:* Provide official name, title, and contact email address (e.g., `grievance@discora.com`) for publication in Terms and Privacy Policy to satisfy IT Rules 2021.

---

## 28. Legal Review Required

1. **Terms of Service Drafting:** Verification that limitation of liability, user-generated content warranties, and epistemic discussion rules comply with Indian Contract Act 1872 and IT Act 2000.
2. **Indian Intermediary Safe Harbor:** Ensuring user conduct rules under IT Rules 2021 Rule 3(1)(b) are accurately reproduced in the Terms.
3. **Anonymized Knowledge Graph Retention:** Legal review of whether retaining anonymized user-submitted claims and evidence complies with DPDP Section 12(3) erasure rights (anonymization generally satisfies erasure where data ceases to identify an individual).

---

## 29. Operator Dependencies

1. **Grievance Email Address Setup:** Create and route `grievance@discora.com` or `legal@discora.com`.
2. **Resend SMTP Production Activation:** Configure verified sending domain in Resend and update Supabase SMTP settings.
3. **Google OAuth Production Redirect URIs:** Add production domain callbacks in Google Cloud Console.
4. **Sentry DSN (Optional):** If error monitoring is desired for beta, create Sentry project and supply `NEXT_PUBLIC_SENTRY_DSN` in Vercel environment.

---

## 30. Recommended Legal Page Architecture

For Public Beta, Discora should implement a clean, unified legal document suite under standard accessible routes:

```
src/app/
  (legal)/
    terms/
      page.tsx        # Terms of Service / User Agreement (IT Rules 3(1)(a))
    privacy/
      page.tsx        # Privacy Policy (DPDP Section 5 notice, cookies, subprocessors)
    guidelines/
      page.tsx        # Community Guidelines & Acceptable Use (Epistemic rules, IT Rules 3(1)(b))
    grievance/
      page.tsx        # Grievance Redressal & Contact Info (IT Rules 3(2))
```

### Shared Layout & Navigation:
- A minimalist, distraction-free legal shell (`(legal)/layout.tsx`) matching Discora's typography and dark/light themes.
- Footer navigation links on the marketing/about page (`/about`) and mobile navigation sidebar pointing to `/terms`, `/privacy`, `/guidelines`, and `/grievance`.

---

## 31. Recommended Next Implementation Sequence (Phase 9C)

1. **Step 1: Product Decisions Sign-off:**
   - Approve 18+ age threshold.
   - Designate Grievance Officer contact info.
   - Confirm anonymized claim retention on account deletion.
2. **Step 2: Legal Content Drafting (Phase 9C):**
   - Draft Terms of Service.
   - Draft Privacy Policy (including Cookie & Device Storage section).
   - Draft Community Guidelines.
   - Draft Grievance Redressal procedure.
3. **Step 3: UI Implementation:**
   - Create routes `/terms`, `/privacy`, `/guidelines`, `/grievance`.
   - Update `/register` with legal acknowledgment text and links.
   - Add legal links to `/about` footer and sidebar.
4. **Step 4: Account Deletion Implementation:**
   - Create secure account deletion RPC / endpoint.
   - Enable the Danger Zone Delete Account button in Settings.
5. **Step 5: Final Pre-Launch Verification:**
   - Playwright automated regression across all legal routes and registration flow.

---

## 32. Final Decision Table

| Area | Current Status | Public Beta Requirement | Decision Needed |
|---|---|---|---|
| **Founding Participant** | Verified compliant | No changes needed | None (Keep as descriptive profile badge) |
| **Privacy Policy** | Missing (0 files) | Mandatory before beta (P0) | Approve policy structure & subprocessor list |
| **Terms / User Agreement** | Missing (0 files) | Mandatory before beta (P0) | Approve terms & user conduct rules |
| **Grievance Redressal** | Missing (0 files) | Mandatory before beta (P0) | Designate Grievance Officer & contact email |
| **Cookies** | Clean (2 first-party cookies) | Disclose in Privacy Policy | None (No optional cookies exist) |
| **Cookie Banner** | Not present | **DO NOT IMPLEMENT** | Confirm banner omission (Transparent notice in policy) |
| **Sentry Telemetry** | Configured, inactive, scrubbed | Optional (Operator decision) | Decide whether to supply DSN for beta |
| **Account Deletion** | Database ready, UI disabled | Must enable self-service (P1) | Confirm "anonymize author, retain claims" policy |
| **Data Requests (SAR)** | Placeholder card | Manual process via email for beta | Confirm manual response workflow |
| **Data Retention** | Indefinite default | Documented in Privacy Policy | Approve 180-day audit log retention |
| **Age Policy** | Undefined | Explicitly declare in Terms | Approve **18+** threshold for Beta |
| **GDPR Applicability** | Non-targeted, no Art. 3(2) reach | Good-faith privacy alignment | Re-evaluate if active EU marketing begins |
| **Subprocessors** | 4 services (Supabase, Google, Resend, Sentry) | Disclose in Privacy Policy | Confirm external processor agreements |
| **Incident Response** | Admin audit logs present | Operational runbook for CERT-In | Operator to maintain 6-hr incident protocol |

---

## 33. Read-Only Verification Summary

- `npx tsc --noEmit`: **0 errors** (Clean TypeScript verification)
- `npm run lint`: **0 errors**, 40 warnings (unrelated test script variables)
- `git status --porcelain`: Clean (Zero application files modified, zero schema changes made)
- **Confirmation:** NO SOURCE CODE CHANGES MADE. NO DATABASE CHANGES MADE. NO PACKAGES INSTALLED. NO UX CHANGES MADE.
