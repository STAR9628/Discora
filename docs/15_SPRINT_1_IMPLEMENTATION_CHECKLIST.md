# Discora - Sprint 1 Implementation Checklist

Version: 1.0

Status: Ready for Review

Scope: Foundation only

Related Documents:

* 09_IMPLEMENTATION_PLAN.md
* 10_CODEX_CONTEXT.md
* 05_SYSTEM_ARCHITECTURE.md
* 06_DESIGN_SYSTEM.md
* 11_SECURITY_AND_ACCESS.md
* 12_FRONTEND_SPEC.md
* 13_FEATURE_TICKETS.md

---

# Purpose

This checklist defines the exact Sprint 1 foundation work to complete before implementing any Discora product features.

Sprint 1 must establish the application shell, project conventions, environment configuration, shared domain types, Supabase client wiring, and dark-first theme foundation.

Do not implement discussions, debates, claims, evidence, sources, questions, notifications, search, or AI behavior in this sprint.

---

# Current Repository Verification

Checked on: 2026-06-03

Repository root:

```text
D:\Projects\Discora
```

Current structure:

```text
.github/
docs/
public/
src/
supabase/
.env.example
README.md
```

Current findings:

* `docs/` contains the architecture, product, design, security, and implementation documents.
* `src/` exists but is empty.
* `public/` exists but is empty.
* `supabase/` exists but is empty.
* `.env.example` exists but is empty.
* `README.md` exists but is empty.
* No `.git/` directory was detected.
* No `package.json` was detected.
* No `tsconfig.json` was detected.
* No Tailwind config was detected.
* No shadcn/ui `components.json` was detected.

Architecture alignment status:

* The high-level placeholder directories partially match the documented architecture.
* The required application folders under `src/` have not been created yet.
* Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, theme, and layout foundations are not configured yet.

---

# Documented Deviations To Resolve Before Implementation

## Deviation 1: Implementation Plan vs Current Sprint Scope

`docs/09_IMPLEMENTATION_PLAN.md` separates project foundation into Sprint 1 and Supabase setup into Sprint 2.

The current requested Sprint 1 deliverables include:

* Supabase client configuration
* Environment variable setup

Decision:

Implement Supabase client configuration and environment variables in Sprint 1 because the current user-scoped deliverables explicitly include them.

Limit:

Do not create Supabase database schema, RLS policies, authentication flows, storage buckets, realtime channels, or feature-specific backend logic during Sprint 1.

## Deviation 2: Folder Name Singular vs Plural

`docs/14_CODEX_KICKOFF_PROMPT.md` lists feature modules as singular:

```text
discussion/
debate/
claim/
evidence/
source/
question/
notification/
```

`docs/05_SYSTEM_ARCHITECTURE.md` lists feature modules as plural:

```text
discussions/
debates/
claims/
evidence/
sources/
questions/
notifications/
```

Decision:

Use plural feature folder names because `05_SYSTEM_ARCHITECTURE.md` is the primary system architecture reference and aligns with route/resource naming.

Exception:

Keep `evidence/` singular because it is both singular and plural in English and appears that way in the architecture document.

## Deviation 3: Environment Variable Names

`docs/08_DEVELOPMENT_ROADMAP.md` lists:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
GEMINI_API_KEY
```

`docs/09_IMPLEMENTATION_PLAN.md` lists:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```

Decision:

Use:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```

Reason:

Next.js requires browser-exposed Supabase project URL and anon key to use the `NEXT_PUBLIC_` prefix. `GEMINI_API_KEY` remains server-only and must not be exposed to the browser.

## Deviation 4: Basic Layout Shell vs Design System Sprint

`docs/09_IMPLEMENTATION_PLAN.md` places layout components in Sprint 5, but the current requested Sprint 1 deliverables include a basic layout shell.

Decision:

Create only structural placeholders for sidebar, header, and mobile navigation in Sprint 1.

Limit:

Do not build feature cards, forms, room tabs, feeds, search UI, notification behavior, or content workflows.

---

# Sprint 1 Deliverables

## FOUND-001: Next.js 15 Setup

Checklist:

* Initialize a Next.js 15 application in the existing repository root.
* Use App Router.
* Use TypeScript.
* Use Tailwind CSS.
* Use ESLint.
* Keep source code under `src/`.
* Ensure the app runs locally with `npm run dev`.
* Ensure the production build can compile.

Expected files created or modified:

* `package.json`
* `package-lock.json`
* `next.config.ts`
* `eslint.config.mjs`
* `postcss.config.mjs`
* `src/app/layout.tsx`
* `src/app/page.tsx`
* `src/app/globals.css`

Architectural reasoning:

Next.js App Router matches the required stack and supports route-based growth for the documented MVP pages without introducing feature behavior prematurely.

## FOUND-001: TypeScript Strict Mode

Checklist:

* Create `tsconfig.json`.
* Enable strict TypeScript behavior.
* Configure path aliasing for `@/*`.
* Avoid `any` in shared domain types and foundational utilities.

Expected files created or modified:

* `tsconfig.json`

Architectural reasoning:

Strict typing supports the documented requirement for production-ready code, structured entities, and maintainable feature modules.

## FOUND-001 / FOUND-005: Tailwind Configuration

Checklist:

* Configure Tailwind for Next.js.
* Add global CSS variables for the theme system.
* Set dark mode as the default visual mode.
* Include Discora semantic colors for claims, evidence, questions, sources, debate, moderation, and errors.
* Keep styling foundational only.

Expected files created or modified:

* `src/app/globals.css`
* `postcss.config.mjs`

Architectural reasoning:

The theme foundation should encode the design system's knowledge-focused dark experience while leaving feature-specific components for later sprints.

## FOUND-001 / FOUND-005: shadcn/ui Initialization

Checklist:

* Initialize shadcn/ui configuration.
* Use a dark-compatible style configuration.
* Configure aliases to match the project structure.
* Add only foundational utilities needed by shadcn/ui.
* Avoid adding product feature components during initialization.

Expected files created or modified:

* `components.json`
* `src/lib/utils.ts` or `src/utils/cn.ts`
* `src/components/ui/`

Architectural reasoning:

shadcn/ui provides accessible primitives while allowing Discora to preserve its own design language.

## FOUND-002 / FOUND-003: Supabase Client Configuration

Checklist:

* Install `@supabase/supabase-js`.
* Create a browser-safe Supabase client utility.
* Read Supabase URL and anon key from public environment variables.
* Fail clearly when required public Supabase variables are missing.
* Do not implement auth flows, database schema, storage, realtime subscriptions, or RLS policies in Sprint 1.

Expected files created or modified:

* `src/services/supabase/client.ts`
* `.env.example`

Architectural reasoning:

Supabase setup belongs in a service layer so future auth, database, realtime, and storage work can build on a single typed integration point.

## FOUND-003: Environment Variable Setup

Checklist:

* Populate `.env.example` with required public Supabase variables.
* Include `GEMINI_API_KEY` as a future server-only variable.
* Document that real secrets must not be committed.
* Avoid creating a real `.env.local` unless explicitly requested.

Expected files created or modified:

* `.env.example`
* `README.md`

Architectural reasoning:

Environment setup keeps deployment and local development predictable while preserving security boundaries between browser-safe and server-only values.

## FOUND-005: Theme Provider Setup

Checklist:

* Install and configure `next-themes` if needed for theme state.
* Create a theme provider component.
* Default the app to dark mode.
* Support future light mode without making it primary.
* Avoid building a feature-rich theme switcher unless requested.

Expected files created or modified:

* `src/components/providers/theme-provider.tsx`
* `src/components/providers/app-providers.tsx`
* `src/app/layout.tsx`

Architectural reasoning:

Providers stay centralized so future state, query, auth, and realtime providers can be added without cluttering route components.

## FOUND-004: Folder Structure Creation

Checklist:

* Create required top-level source folders:

```text
src/app/
src/components/
src/features/
src/services/
src/hooks/
src/types/
src/utils/
```

* Create feature module placeholders:

```text
src/features/discussions/
src/features/debates/
src/features/claims/
src/features/evidence/
src/features/sources/
src/features/questions/
src/features/notifications/
```

* Create supporting foundation folders:

```text
src/components/layout/
src/components/providers/
src/components/ui/
src/services/supabase/
src/lib/
```

Expected files created or modified:

* `.gitkeep` files or placeholder index files where directories would otherwise be empty.

Architectural reasoning:

Feature-based architecture keeps domain work modular and prevents future product logic from concentrating inside UI routes.

## FOUND-006: Shared Domain Type Definitions

Checklist:

* Define shared enum-like union types for documented domain concepts.
* Include room, identity, claim, evidence, source, question, vote, pin, report, notification, and role types.
* Keep types domain-only.
* Do not implement data fetching, database schema generation, validation schemas, or feature behavior.

Expected files created or modified:

* `src/types/domain.ts`
* `src/types/api.ts`
* `src/types/index.ts`

Architectural reasoning:

Shared types give later feature modules a consistent vocabulary and reduce drift from the product and database documents.

## FOUND-001 / FOUND-008: Core Package Installation

Checklist:

* Install required foundation packages:

```text
@supabase/supabase-js
@tanstack/react-query
zustand
zod
react-hook-form
lucide-react
next-themes
class-variance-authority
clsx
tailwind-merge
tailwindcss-animate
```

* Configure a TanStack Query provider only if it does not introduce feature behavior.
* Do not create application stores yet.

Expected files created or modified:

* `package.json`
* `package-lock.json`
* `src/components/providers/query-provider.tsx`
* `src/components/providers/app-providers.tsx`

Architectural reasoning:

Installing documented dependencies early creates a stable base for later vertical slices while keeping domain behavior out of Sprint 1.

## Basic Layout Shell

Checklist:

* Create a desktop sidebar placeholder.
* Create a top header placeholder.
* Create a mobile bottom navigation placeholder.
* Include only documented navigation labels:

```text
Home
Discussions
Debates
Notifications
Profile
```

* Mobile placeholder may include:

```text
Home
Search
Create
Notifications
Profile
```

* Do not link to feature pages unless placeholder routes exist.
* Do not implement create menus, notifications, search, discussion lists, debate lists, or profile behavior.

Expected files created or modified:

* `src/components/layout/app-shell.tsx`
* `src/components/layout/sidebar.tsx`
* `src/components/layout/header.tsx`
* `src/components/layout/mobile-nav.tsx`
* `src/app/layout.tsx`
* `src/app/page.tsx`

Architectural reasoning:

The shell establishes the documented desktop and mobile layout patterns while avoiding premature feature implementation.

---

# Validation Checklist

Run after implementation:

* `npm run lint`
* `npm run build`
* Confirm `npm run dev` starts the app.
* Confirm dark mode is the default.
* Confirm mobile and desktop layout placeholders render without overlap.
* Confirm TypeScript strict mode is active.
* Confirm environment variables are documented but no real secrets are committed.
* Confirm no prohibited feature behavior was implemented.

---

# Explicit Non-Goals For Sprint 1

Do not implement:

* Authentication screens or flows
* Discussions
* Debates
* Claims
* Evidence
* Sources
* Questions
* Notifications
* Search
* AI features
* Database schema
* RLS policies
* Realtime channels
* Storage buckets
* Moderation workflows
* Voting
* Pins
* Feature cards
* Feature forms
* Room pages
* API routes

---

# Completion Criteria

Sprint 1 is complete when:

1. The Next.js 15 application runs.
2. TypeScript strict mode is configured.
3. Tailwind and shadcn/ui are initialized.
4. Supabase client wiring exists without feature behavior.
5. Environment variables are documented.
6. Dark mode is the default theme.
7. Required folders and feature placeholders exist.
8. Shared domain types match the documented architecture.
9. Basic layout shell renders on desktop and mobile.
10. Lint and build checks pass.
