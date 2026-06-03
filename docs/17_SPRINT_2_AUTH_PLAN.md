# Discora - Sprint 2 Authentication Plan

Version: 1.0

Status: Ready for Review

Scope: Authentication planning only

Related Documents:

* 09_IMPLEMENTATION_PLAN.md
* 10_CODEX_CONTEXT.md
* 11_SECURITY_AND_ACCESS.md
* 12_FRONTEND_SPEC.md
* 13_FEATURE_TICKETS.md
* 16_ARCHITECTURE_DECISIONS.md

---

# Purpose

This document defines the implementation checklist for the next authentication-focused sprint before any code is written.

The sprint should establish secure Supabase Auth integration, session handling, auth routes, and profile bootstrap behavior without implementing Discora product domains such as discussions, debates, claims, evidence, sources, questions, notifications, search, AI, or moderation.

---

# Scope Note

`docs/09_IMPLEMENTATION_PLAN.md` separates:

* Sprint 2: Supabase Setup
* Sprint 3: Authentication

Current approved request:

* Create a Sprint 2 authentication plan.

Decision:

Treat this document as the planning checklist for an auth-focused Sprint 2, while preserving the strict non-goals listed below. Any implementation must still avoid product features.

---

# Sprint 2 Goals

Primary goal:

Users can authenticate securely through Supabase Auth.

Supporting goals:

* Establish auth service boundaries.
* Add server-safe and browser-safe Supabase auth utilities.
* Add auth-aware provider/context state if needed.
* Add login, register, and password reset routes.
* Add session detection in the app shell.
* Prepare protected-route mechanics for future authenticated workflows.
* Keep authorization and role logic minimal until database/RLS implementation.

---

# Ticket Mapping

Sprint 2 maps to:

```text
AUTH-001 Register User
AUTH-002 Login User
AUTH-003 Logout User
AUTH-004 Email Verification
AUTH-006 Protected Routes
AUTH-007 Password Reset
AUTH-008 Session Management
FOUND-002 Supabase Setup
FOUND-008 API Client Setup
```

Deferred:

```text
AUTH-005 Google Sign In
USER-001 Profile Page
USER-002 Profile Editing
USER-003 Avatar Upload
```

Google Sign In may be planned later unless explicitly approved for this sprint.

---

# Implementation Checklist

## 1. Supabase Auth Client Boundaries

Checklist:

* Keep the existing browser client utility.
* Add server/client auth helpers only if required by Next.js App Router.
* Keep Supabase access inside `src/services/supabase/`.
* Do not call Supabase directly from route UI where a service/helper can own the concern.
* Validate required environment variables clearly.

Expected files:

```text
src/services/supabase/client.ts
src/services/supabase/server.ts
src/services/supabase/index.ts
```

Architectural reasoning:

Supabase integration belongs in the service layer so auth, database, storage, and realtime concerns can evolve without spreading SDK calls across feature UI.

## 2. Authentication Routes

Checklist:

* Create `/login`.
* Create `/register`.
* Create `/forgot-password`.
* Create `/reset-password` only if needed by Supabase reset flow.
* Keep pages focused on auth only.
* Do not add social feeds, content previews, discovery, or product feature forms.

Expected files:

```text
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
```

Architectural reasoning:

Auth routes should be grouped separately from future app/product routes to keep account access flows independent from room and content features.

## 3. Auth UI Components

Checklist:

* Build reusable auth form components.
* Use strict TypeScript.
* Use `react-hook-form` and `zod` for client-side validation.
* Use accessible labels, errors, and focus states.
* Keep visual styling aligned with the dark-first shell.
* Do not create broad design-system components beyond what auth needs.

Expected files:

```text
src/features/auth/components/login-form.tsx
src/features/auth/components/register-form.tsx
src/features/auth/components/forgot-password-form.tsx
src/features/auth/components/reset-password-form.tsx
src/features/auth/validation.ts
```

Architectural reasoning:

Auth is a feature module. Forms and validation should live with auth rather than in global UI or route files.

## 4. Auth Service Layer

Checklist:

* Add sign-up service.
* Add sign-in service.
* Add sign-out service.
* Add password reset request service.
* Add password update service if reset flow requires it.
* Normalize Supabase errors into user-readable messages.
* Do not add authorization rules for product entities.

Expected files:

```text
src/features/auth/services/auth-service.ts
src/features/auth/types.ts
```

Architectural reasoning:

Business logic should remain outside UI components and route files. Auth services provide a stable boundary for Supabase Auth behavior.

## 5. Session Management

Checklist:

* Add a lightweight auth/session provider if client session state is needed.
* Avoid storing sensitive tokens manually.
* Rely on Supabase Auth session management.
* Show guest vs authenticated shell state only at a placeholder level.
* Add logout behavior if session state is available.

Expected files:

```text
src/features/auth/providers/auth-provider.tsx
src/features/auth/hooks/use-auth.ts
```

Architectural reasoning:

Session state should be centralized so future protected routes and profile features can consume it without prop drilling.

## 6. Protected Route Foundation

Checklist:

* Add a protected-route helper or middleware only for auth checks.
* Redirect unauthenticated users from protected placeholder routes if any are added.
* Do not protect product routes that do not exist.
* Do not implement role-based admin or moderator access in this sprint.

Expected files:

```text
src/middleware.ts
src/features/auth/utils/require-auth.ts
```

Architectural reasoning:

Protected-route mechanics belong in auth foundation, but product authorization waits for database and RLS work.

## 7. Email Verification And Password Reset

Checklist:

* Support Supabase email verification flow.
* Support password reset request flow.
* Document required Supabase redirect URLs.
* Avoid custom email templates unless explicitly approved.

Expected files:

```text
docs/18_SUPABASE_AUTH_SETUP.md
```

Architectural reasoning:

Email verification and reset flows depend on Supabase project configuration. Documentation prevents hidden deployment assumptions.

## 8. Environment Documentation

Checklist:

* Confirm `.env.example` still includes required Supabase variables.
* Document local Supabase Auth redirect URL expectations.
* Do not add real secrets.

Expected files:

```text
.env.example
README.md
```

Architectural reasoning:

Auth setup must be reproducible without leaking secrets or relying on undocumented dashboard settings.

## 9. Validation

Checklist:

* Run `npm run lint`.
* Run `npm run build`.
* Validate register form client-side errors.
* Validate login form client-side errors.
* Validate auth pages render in dark mode.
* Validate missing Supabase env behavior is clear.
* If real Supabase credentials are available, smoke test sign-up, sign-in, sign-out, and password reset request.

Expected outcome:

The app builds and the authentication UI/service foundation is ready for real Supabase credentials.

---

# Explicit Non-Goals

Do not implement:

* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions
* Notifications
* Search
* AI
* Moderation
* Database schema
* Row Level Security policies
* Realtime channels
* Storage buckets
* Voting
* Pins
* Admin tools
* Moderator tools
* Anonymous posting behavior
* User profile pages beyond auth bootstrap requirements
* Google Sign In unless separately approved

---

# Security Requirements

Implementation must follow `docs/11_SECURITY_AND_ACCESS.md`.

Requirements:

* Supabase Auth is the authentication provider.
* JWT/session handling must rely on Supabase Auth.
* Passwords must never be stored or handled outside Supabase Auth flows.
* Sensitive tokens must not be manually persisted by application code.
* Environment secrets must not be committed.
* User-facing errors should be helpful without exposing sensitive internals.
* Authorization for product entities must wait for database/RLS implementation.

---

# Completion Criteria

Sprint 2 auth implementation is complete when:

1. Auth routes exist and render.
2. Register, login, logout, and password reset flows are wired to Supabase Auth.
3. Session state is available through a typed provider or hook.
4. Protected-route foundation exists for future authenticated pages.
5. Supabase Auth setup requirements are documented.
6. `npm run lint` passes.
7. `npm run build` passes.
8. No prohibited product features are implemented.
