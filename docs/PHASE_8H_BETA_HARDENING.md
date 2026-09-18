# Discora — Phase 8H: Beta Hardening Report

**Date:** September 13, 2026  
**Target:** Discora Web Application & Supabase Infrastructure (`D:\Projects\Discora`)  
**Scope:** Application-level Beta Hardening (Realtime Reconnect UX & Production Telemetry Safeguards)  
**Governance Authority:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/COMPREHENSIVE_MVP_PUBLIC_BETA_AUDIT.md`

---

## 1. Scope

Following the Comprehensive MVP / Public Beta Audit, this pass resolved the final two application-level polish and hardening items:
1. **Realtime Reconnect UX (P1 Polish Item):** Implemented subtle, non-intrusive reconnection notifications and active room query synchronization when returning from meaningful network interruptions or extended background tab dormancy.
2. **Telemetry & Error Monitoring Readiness:** Audited existing Sentry infrastructure (`@sentry/nextjs`), hardened privacy protections by disabling DOM session replays, stripped personal data (emails, IPs, usernames), scrubbed authorization secrets/cookies, and documented operator DSN configuration in `.env.example`.
3. **Strict Non-Scope Adherence:** Zero changes to domain, DNS, Resend SMTP credentials, or Google OAuth production URIs (strictly deferred to operator action). Zero gamification or epistemic drift.

---

## 2. Realtime Reconnect Changes

### Architecture & Implementation Details:
- **Location:** `src/components/providers/network-status-provider.tsx`
- **Room Synchronization:**
  - Integrated `useQueryClient` from `@tanstack/react-query`.
  - When connection is restored after an interruption (> 500ms duration or `wasOffline` flag set), `queryClient.refetchQueries({ type: "active" })` is immediately triggered to synchronize all active room feeds (messages, claims, inquiries, evidence, and debates).
- **Background & Dormancy Recovery:**
  - Added a `document.addEventListener("visibilitychange")` listener.
  - When a browser tab or mobile device wakes from background dormancy (hidden for ≥ 45 seconds), active queries are automatically refreshed and the synchronized status notice is triggered.
- **Calm, Non-Intrusive UX:**
  - Uses the established accessible floating indicator (`role="status"`, `aria-live="polite"`, `data-testid="network-status-banner"`).
  - Fixed at `bottom-20 sm:bottom-6 right-4 sm:right-6`, completely avoiding the central conversation column and sticky composer.
  - Notification copy: `"Connection restored. Room activity is synchronized."`
  - Auto-dismisses cleanly after 3.2 seconds.
  - Throttled to at most once per 10 seconds to prevent alert spam during flaky network conditions.
  - Respects user accessibility settings via Tailwind `motion-reduce:transition-none` and `motion-reduce:animate-none`.
- **Test Automation Support:**
  - Listens to custom event `window.addEventListener("discora:reconnect", ...)` for deterministic synthetic testing.

---

## 3. Telemetry Status

### Audit Findings & Gaps:
- `@sentry/nextjs` (v10.73.0) is present in `package.json`, configured across `sentry.client.config.ts`, `sentry.server.config.ts`, `src/instrumentation.ts`, `src/app/error.tsx`, and `src/app/global-error.tsx`.
- *Gaps Identified:*
  1. Default session replays were enabled at sample rates (0.1 / 1.0), presenting an epistemic privacy risk of recording user message drafts or private discussions.
  2. `sendDefaultPii` was not explicitly false, risking collection of user IP addresses or emails.
  3. No `beforeSend` hook existed to scrub authorization headers, Supabase JWT tokens, or cookies.
  4. Environment variables (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`) were missing from `.env.example`.

### Hardening Applied:
1. **Disabled Session Replays:** Set `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0` in `sentry.client.config.ts`.
2. **Explicit PII Disablement:** Set `sendDefaultPii: false` across client, server, and runtime instrumentation configs.
3. **Sensitive Data & Authorization Scrubbing:**
   - Implemented `beforeSend(event)` across all three config files:
     - Deletes `event.user.ip_address`, `event.user.email`, and `event.user.username` to protect anonymous participation.
     - Deletes `event.request.headers["authorization"]` and `event.request.headers["cookie"]` to prevent token leakage.
4. **Operator Documentation:** Added clear configuration guidance in `.env.example`.

---

## 4. Files Changed

| File | Nature of Change |
|---|---|
| `src/components/providers/network-status-provider.tsx` | Added `useQueryClient` active query refetch on online recovery and dormancy; added synchronized notice; throttled alerts. |
| `sentry.client.config.ts` | Disabled DOM session replays; set `sendDefaultPii: false`; added PII and header scrubbing in `beforeSend`. |
| `sentry.server.config.ts` | Set `sendDefaultPii: false`; added PII and authorization/cookie header scrubbing in `beforeSend`. |
| `src/instrumentation.ts` | Added `sendDefaultPii: false` and `beforeSend` privacy filter for Node runtime error logging. |
| `.env.example` | Documented `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` for operator production setup. |

---

## 5. Tests Run

| Test Command / Script | Target / Focus | Exit Code | Result |
|---|---|---|---|
| `npx tsc --noEmit` | Project TypeScript Typecheck | 0 | **PASSED** (0 errors) |
| `npm run lint` | ESLint Project Rules | 0 | **PASSED** (0 errors) |
| `npm run build` | Next.js 15 App Router Production Build | 0 | **PASSED** (All 24 routes compiled) |
| `node scripts/verify-phase8d-data.mjs` | Starter Discourse & Anti-Fabrication | 0 | **PASSED** (12 authentic rooms, 0 scratch) |
| `node scripts/phase8f-blocker-resolution-qa.mjs` | Debate Inquiries, Offline UX & Reconnect | 0 | **PASSED** (Banner text & auto-dismiss verified) |
| `node scripts/phase8g-verification-qa.mjs` | Multi-Viewport Responsive Matrix (375-1440) | 0 | **PASSED** (All 12 checks passed) |
| `node scripts/phase8a-security-qa.mjs` | Security & Privilege Bypass (23 vectors) | 0 | **PASSED** (23/23 tests passed) |

---

## 6. Browser QA

Browser automation verified via Playwright against the production server:
1. **Offline → Online Recovery Flow:**
   - Dispatched `offline` event: Banner appeared with `"You’re offline. Some actions may be unavailable until your connection returns."`
   - Dispatched `online` event: Banner updated immediately to `"Connection restored. Room activity is synchronized."`
   - Auto-dismissed after 3.2 seconds.
2. **Viewport Coverage:**
   - 375 × 667 (iPhone SE): Bounding box bottom at 587px (clear of bottom mobile navigation; no overflow).
   - 390 × 844 (iPhone 13/14): Bounding box bottom at 764px (clear of composer; zero clipping).
   - 834 × 1194 (iPad Air): Bounding box bottom at 1170px (floating lower-right; clean layout).
   - 1440 × 900 (Desktop): Bounding box bottom at 876px (outside feed column; no reading obstruction).
3. **Room Navigation & Feed:**
   - Discussion room questions lens preserved (`questions` table).
   - Debate room inquiries lens preserved (`inquiry_items` table).

---

## 7. Security Verification

- **Admin Boundaries:**
  - 23/23 security tests passed in `scripts/phase8a-security-qa.mjs`.
  - Non-owner users navigating to `/admin` receive HTTP 404 (route hidden by `owner-guard.ts`).
  - Direct PostgREST RPC invocations (`admin_get_overview_stats`, `admin_get_rooms`, etc.) by anonymous and standard authenticated users are denied with SQL permission exceptions.
  - Direct inserts into `public.user_roles` and `public.admin_audit_logs` are strictly denied by RLS.
- **PII & Secrets Scrubbing:**
  - Verified that Sentry payload events strip all authorization headers, cookies, user emails, IP addresses, and usernames.

---

## 8. Remaining Operator Dependencies

The following infrastructure tasks remain external operator dependencies and are tracked for the public deployment phase:
1. **Domain Purchase:** Pending human operator acquisition of the official brand domain.
2. **DNS Configuration:** Pending A/CNAME record mapping to Vercel and CNAME records for Supabase custom domain.
3. **Resend Production SMTP:** Pending injection of verified SMTP credentials in Supabase Dashboard (`Settings -> Auth -> SMTP Settings`).
4. **Production Google OAuth:** Pending addition of the live domain URI to Google Cloud Console.
5. **Telemetry Sentry DSN:** Pending creation of the production Sentry project and adding `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` into production deployment environment variables.

---

## 9. Regressions

**Zero (0) regressions detected.**
All core user journeys (Guest, Registration, Discussions, Debates, Inquiries, Settings, Profiles, Admin) remain healthy and intact.

---

## 10. Final Assessment

### **`PASS WITH OPERATOR DEPENDENCIES`**

**Summary:**  
The Discora application has successfully passed the final beta hardening pass. The realtime reconnect experience is calm, accessible, and synchronized; production error monitoring is privacy-hardened with zero PII capture; and all automated, security, and multi-viewport regression suites have passed with zero failures. The application is ready for live public beta deployment as soon as the operator provisions the domain and transactional email credentials.
