# Discora - Architecture Decisions

Version: 1.0

Status: Active

Purpose:

This document records major implementation decisions made during Discora development.

---

# ADR-001: Existing Repository Root

Date: 2026-06-03

Decision:

Use the existing `D:\Projects\Discora` repository root for the Next.js application instead of creating a nested `discora-web` folder.

Reasoning:

The repository already contains the project documentation, `src`, `public`, and `supabase` directories. Keeping the app at the root avoids unnecessary nesting and keeps documentation, source, and deployment configuration together.

Scope:

Sprint 1 foundation.

---

# ADR-002: Supabase Client In Sprint 1

Date: 2026-06-03

Decision:

Add Supabase environment documentation and a browser-safe Supabase client utility during Sprint 1.

Reasoning:

`docs/09_IMPLEMENTATION_PLAN.md` places Supabase setup in Sprint 2, but the approved Sprint 1 checklist explicitly includes Supabase client configuration and environment variable setup. The implementation is limited to client wiring only.

Non-Goals:

No database schema, Row Level Security policies, authentication flows, storage buckets, realtime channels, or feature-specific Supabase behavior are implemented in Sprint 1.

---

# ADR-003: Plural Feature Module Folders

Date: 2026-06-03

Decision:

Use plural feature module folder names:

```text
discussions/
debates/
claims/
sources/
questions/
notifications/
```

Keep:

```text
evidence/
```

Reasoning:

`docs/05_SYSTEM_ARCHITECTURE.md` is the primary architecture reference and uses plural feature module names. This also aligns with route and resource naming. `evidence` remains unchanged because it is both singular and plural in English.

---

# ADR-004: Public And Server-Only Environment Variables

Date: 2026-06-03

Decision:

Use the following environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```

Reasoning:

The Supabase URL and anon key are used by browser-side Supabase clients and therefore require the `NEXT_PUBLIC_` prefix in Next.js. `GEMINI_API_KEY` remains server-only and must not be exposed to client bundles.

---

# ADR-005: Basic Layout Shell Only

Date: 2026-06-03

Decision:

Implement a structural desktop sidebar, top header, and mobile bottom navigation in Sprint 1.

Reasoning:

The approved Sprint 1 checklist includes a basic layout shell. The implementation establishes responsive layout foundations from `docs/12_FRONTEND_SPEC.md` without implementing product features.

Non-Goals:

No discussions, debates, claims, evidence, sources, questions, notifications, search behavior, create menu behavior, room pages, feeds, or feature cards are implemented.

---

# ADR-006: Centralized Provider Composition

Date: 2026-06-03

Decision:

Use a single `AppProviders` component to compose theme and query providers.

Reasoning:

Centralizing providers keeps `src/app/layout.tsx` small and creates a maintainable place to add future auth, realtime, and state providers without mixing business logic into route layouts.

---

# ADR-007: Shared Domain Types Before Feature Modules

Date: 2026-06-03

Decision:

Create shared domain and API response types in `src/types/` during Sprint 1.

Reasoning:

The platform revolves around structured entities. Shared types create a stable vocabulary for later feature work and reduce drift from the product, database, and API documents.

---

# ADR-008: Dark Mode Default Experience

Date: 2026-06-03

Decision:

Configure Discora's theme system to default to dark mode.

Reasoning:

`docs/06_DESIGN_SYSTEM.md`, `docs/10_CODEX_CONTEXT.md`, and `docs/14_CODEX_KICKOFF_PROMPT.md` define dark mode as the primary experience. Sprint 1 implements this through CSS theme tokens and `next-themes` with `defaultTheme="dark"` and `enableSystem={false}`.

Scope:

Sprint 1 establishes the default dark experience and preserves a path for future light mode support.

Non-Goals:

No full theme switcher, user theme preference persistence UI, or feature-specific theme behavior is implemented in Sprint 1.
