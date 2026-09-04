# Discora — Agent Navigation Map

## Project Overview

Discora is a structured discussion, debate, and knowledge-building platform built with Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase Auth, and TanStack Query. The codebase follows a feature-based architecture under `src/`.

Implemented areas include:
- authentication and onboarding
- profiles and user identity
- settings and preferences
- homepage with guest/logged-in journeys
- discussion rooms with claims, evidence, questions, and contributions
- debate rooms with arguments, evidence, inquiries, and contributions
- structured inquiries scoped to claims
- reputation and credibility signals
- search and discovery
- moderation and safety
- room section/deep-link architecture
- State of Understanding discussion overview
- guest/user contribution journeys
- epistemic retention signals
- security hardening (pending production verification)

## Top-Level Structure

```
D:\Projects\Discora\
  AGENTS.md
  package.json
  next.config.ts
  tsconfig.json
  src/
  supabase/
  docs/
  public/
```

## Important `src/` Structure

```
src/
  app/                  # Next.js App Router routes
  components/           # Shared UI/layout/providers
  features/             # Feature-based modules
  hooks/                # Empty placeholder
  lib/                  # Utilities and security helpers
  services/             # Supabase clients and config
  types/                # Shared domain types
  instrumentation.ts
  middleware.ts
```

## Route Map

### Home
- `src/app/page.tsx` — Client homepage; switches between `GuestHomepage` and `LoggedInHomepage` based on auth status.

### Authentication
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/auth/callback/route.ts` — Supabase OAuth callback; exchanges code for session and redirects with a safe allowlist.

### Discussions
- `src/app/discussions/page.tsx` — Discussion feed.
- `src/app/discussions/create/page.tsx` — Create discussion; redirects unauthenticated users to `/login?redirectedFrom=/discussions/create`.
- `src/app/discussions/[slug]/page.tsx` — Discussion room overview; loads `DiscussionOverviewUnderstanding` and section cards.
- `src/app/discussions/[slug]/claims/page.tsx` — Claims section.
- `src/app/discussions/[slug]/evidence/page.tsx` — Evidence section.
- `src/app/discussions/[slug]/questions/page.tsx` — Discussion Questions section.
- `src/app/discussions/[slug]/contributions/page.tsx` — Contributions/messages section.

### Debates
- `src/app/debates/page.tsx` — Debate feed.
- `src/app/debates/create/page.tsx` — Create debate form.
- `src/app/debates/[slug]/page.tsx` — Debate overview with `DebateRoom`.
- `src/app/debates/[slug]/arguments/page.tsx` — Debate arguments section.
- `src/app/debates/[slug]/evidence/page.tsx` — Debate evidence section.
- `src/app/debates/[slug]/questions/page.tsx` — Debate inquiries section (inquiry interface scoped to debate claims).
- `src/app/debates/[slug]/contributions/page.tsx` — Debate contributions section.

### Inquiries
- `src/app/inquiries/[id]/page.tsx` — Standalone inquiry detail page.

### Settings
- `src/app/settings/page.tsx` — Settings shell; redirects unauthenticated users to `/login?redirectedFrom=/settings`.
- `src/app/settings/account/page.tsx` — Redirects to `/settings`.
- `src/app/settings/privacy/page.tsx` — Redirects to `/settings`.
- `src/app/settings/safety/page.tsx` — Redirects to `/settings`.
- `src/app/settings/profile/page.tsx` — Profile settings; server-side auth guard.
- `src/app/settings/moderation/page.tsx` — Moderation settings; moderator-only dashboard.

### Profiles
- `src/app/u/[username]/page.tsx` — Public user profile by username; loads contributions, stats, and `ProfileReputationSection`.

### Search / Discovery
- `src/app/search/page.tsx` — Full-text search page.
- `src/app/leaderboard/page.tsx` — Leaderboard page.

## Important Architecture Distinction

Discussion Questions and Structured Inquiries are separate concepts.

- Discussion Questions (`questions`): Open exploratory questions attached to a discussion room. Created via `createQuestion`. Rendered in `question-list.tsx` and the `questions` section of a discussion.
- Structured Inquiries (`inquiry_items`): Targeted follow-ups attached to a specific claim. Created via `create_inquiry` RPC. Rendered in `inquiry-detail.tsx`, `inquiry-list.tsx`, and `inquiry-response.tsx`.

Debates also expose a `questions` section, but it is actually the inquiry interface scoped to debate claims, not a generic question list.

## Feature Ownership

| Feature | Primary Location |
|---|---|
| Discussions | `src/features/discussions/` |
| Debates | `src/features/debates/` |
| Inquiries | `src/features/inquiries/` |
| Reputation | `src/features/reputation/` |
| Profiles | `src/features/profiles/` |
| Authentication | `src/features/auth/` |
| Evidence | `src/features/discussions/` + `src/features/debates/` |
| Search/Discovery | `src/features/discussions/components/search/` |
| Homepage | `src/features/homepage/` |
| Settings UI | `src/features/settings/` |
| Preferences | `src/features/preferences/` |
| Safety/Moderation | `src/features/safety/` |
| Rooms shell | `src/features/rooms/` |

## Commonly Modified Files by Feature

- **Discussions:** `src/features/discussions/services/discussion-service.ts`, `src/features/discussions/components/discussion-room.tsx`, `src/features/discussions/components/section-nav.tsx`
- **Debates:** `src/features/debates/services/debate-service.ts`, `src/features/debates/components/debate-room.tsx`, `src/features/debates/components/debate-side-selector.tsx`
- **Inquiries:** `src/features/inquiries/services/inquiry-service.ts`, `src/features/inquiries/components/inquiry-detail.tsx`
- **Reputation:** `src/features/reputation/services/reputation-service.ts`, `src/features/reputation/hooks/use-reputation.ts`, `src/features/reputation/components/profile-reputation-section.tsx`
- **Profiles:** `src/features/profiles/services/profile-service.ts`, `src/features/profiles/components/profile-form.tsx`
- **Authentication:** `src/features/auth/services/auth-service.ts`, `src/features/auth/components/login-form.tsx`, `src/features/auth/hooks/use-auth.ts`
- **Evidence:** `src/features/discussions/components/room-evidence-tab.tsx`, `src/features/discussions/components/evidence-section.tsx`
- **Search:** `src/features/discussions/components/search/search-page-client.tsx`
- **Settings:** `src/features/settings/components/settings-page-client.tsx`

## Important Shared Components

- Layout: `src/components/layout/app-shell.tsx`, `header.tsx`, `sidebar.tsx`, `mobile-nav.tsx`
- Providers: `src/components/providers/app-providers.tsx`, `query-provider.tsx`, `theme-provider.tsx`, `toaster-provider.tsx`
- UI: `src/components/ui/confirm-dialog.tsx`, `tooltip.tsx`, `toast.tsx`
- Auth: `src/components/auth/google-signin-button.tsx`

## Important Services / Hooks / Providers

- Supabase browser client: `src/services/supabase/client.ts`
- Supabase server client: `src/services/supabase/server.ts`
- Supabase middleware session updater: `src/services/supabase/middleware.ts`
- Supabase config guard: `src/services/supabase/config.ts`
- Auth context/hook: `src/features/auth/hooks/use-auth.ts`
- Auth provider: `src/features/auth/providers/auth-provider.tsx`
- Auth service: `src/features/auth/services/auth-service.ts`
- Homepage hooks: `src/features/homepage/hooks/use-homepage.ts`
- Reputation hook: `src/features/reputation/hooks/use-reputation.ts`
- Preferences hook: `src/features/preferences/hooks/use-preferences.ts`
- Room shell: `src/features/rooms/components/room-section-shell.tsx`
- Guest contribution prompt: `src/features/rooms/components/guest-contribution-prompt.tsx`

## Supabase Structure

### Migrations
- `supabase/migrations/` — Sequential migration files.
- Important migrations:
  - `202606030001_create_profiles.sql`
  - `202606030003_create_discussions.sql`
  - `202606030004_create_claims.sql`
  - `202606030005_create_evidence.sql`
  - `202606030010_create_questions.sql`
  - `202606060001_create_claim_relations.sql`
  - `202606090002_create_user_reputation_snapshots.sql`
  - `202606100001_create_debates.sql`
  - `202606100004_create_reputation_events.sql`
  - `202606110001_create_side_switch.sql`
  - `202606120001_create_inquiry_tables.sql`
  - `202606130001_add_display_name_and_preferences.sql`
  - `202606170001_create_homepage_rpcs.sql`
  - `202606190001_security_hardening_p0_p1.sql` — **PENDING production verification.**

### Important RPCs / Functions
- `create_discussion_room`
- `create_debate_room`
- `switch_debate_side`
- `resolve_debate`
- `create_inquiry`
- `respond_to_inquiry`
- `satisfy_inquiry`
- `unsatisfy_inquiry`
- `close_inquiry`
- `get_or_create_source`
- `get_user_preferences`
- `recalculate_user_reputation`
- `submit_moderation_flag`
- `resolve_moderation_flag`
- `search_content`
- `get_my_moderation_flags`
- `has_current_user_role_or_higher`
- `get_homepage_metrics`
- `get_featured_inquiries`

### Important Views
- `discussion_messages`
- `discussion_claims`
- `discussion_evidence`
- `discussion_questions`
- `moderation_queue`

### RLS / Security-Related Files
- `src/services/supabase/middleware.ts`
- `src/lib/security/safe-redirect.ts`
- `src/app/auth/callback/route.ts`
- `supabase/migrations/202606190001_security_hardening_p0_p1.sql`

## Security-Sensitive Files and Functions

- `src/lib/security/safe-redirect.ts` — Client-side open-redirect prevention used by `LoginForm`.
- `src/services/supabase/middleware.ts` — Server-side auth guard and profile-onboarding redirect.
- `src/app/auth/callback/route.ts` — OAuth callback with allowlisted redirect paths.
- `src/features/auth/components/login-form.tsx` — Uses `getSafeRedirectUrl` before navigation.
- `supabase/migrations/202606190001_security_hardening_p0_p1.sql` — Revokes direct access to `post_system_message`, `reputation_events`, `create_reputation_event`, `user_reputation_snapshots`; restricts `recalculate_user_reputation` to self/admin; pins `search_path`; blocks inquiry creation in archived rooms.

## Documentation Map

- `docs/00_MASTER_CONTEXT.md` — Primary source of truth for product decisions and architecture.
- `docs/10_CODEX_CONTEXT.md` — Source of truth for current implementation context.
- `docs/16_ARCHITECTURE_DECISIONS.md` — Architecture decision records.
- `docs/04_DATABASE_DESIGN.md` — Database schema overview.
- `docs/07_API_DESIGN.md` — API design notes.
- `docs/11_SECURITY_AND_ACCESS.md` — Security and access documentation.
- `docs/26_RLS_SECURITY_AUDIT.md` — RLS security audit.
- `docs/PRE_DEPLOYMENT_AUDIT.md` — Pre-deployment audit.
- `supabase/deploy_pending_migrations.sql` — SQL for applying pending migrations in production.

Historical sprint documents (e.g., `docs/19_SPRINT_3_USER_IDENTITY_PLAN.md`, phase/audit reports) describe decisions and scope at the time they were written. They are historical references only. Current repository implementation and current task requirements take precedence over stale sprint scope. Never resurrect an old "out of scope" rule without verifying that it is still current.

## Development Commands

From `package.json`:
- `npm run dev` — Start Next.js dev server.
- `npm run build` — Production build.
- `npm run start` — Start production server.
- `npm run lint` — Run ESLint.
- `npx tsc --noEmit` — TypeScript type check.

## Product Philosophy

Discora is built on these principles:

- understanding over engagement
- evidence over popularity
- clarity over activity
- questions before conclusions
- neutrality
- changing one's mind based on evidence is a feature, not a weakness

Agents must avoid drifting Discora toward:
- popularity mechanics
- trending systems
- follower/social-media mechanics
- gamification
- engagement optimization

## Development Process

The preferred workflow is:

audit → design → implementation → typecheck/lint/build → browser QA → fix → retest → final diff review → sign-off

- Browser QA should use the real running Discora application.
- When browser automation is available, use Playwright.
- Never fabricate QA results.
- If browser QA cannot be performed, explicitly report it as not performed.

## Security Rules

- Database is a security boundary.
- Never weaken RLS merely to make frontend code work.
- Inspect USING and WITH CHECK policies.
- Inspect SECURITY DEFINER functions.
- Inspect function ownership, `search_path`, and grants.
- Search all callers before changing security-sensitive functions.
- Never expose secrets.
- Never test production vulnerabilities through destructive mutations.
- Never claim a production migration was applied unless verified.
- Never edit an already-applied migration.
- Create a new migration for production database changes.

## Production vs Local

Repository state and production state are different.

A migration existing in `supabase/migrations/` does NOT mean it has been applied to production.

Agents must explicitly distinguish:
- code implemented
- migration created
- migration applied
- production behavior verified

## Project Portability / Recovery

Discora must remain recoverable independently of the current development machine.

Prefer keeping in version control:
- source code
- migrations
- architecture documentation
- AGENTS.md
- setup instructions
- reproducible scripts
- package manifests/lockfiles

Never commit secrets.

Use `.env.example` for required environment variable names and keep real credentials outside Git.

Do not rely on undocumented laptop-only state.

## Documentation Hierarchy

- Historical sprint documents describe decisions and scope at the time they were written.
- Current repository implementation and current task requirements take precedence over stale sprint scope.
- Architecture decision documents remain important when they describe current architecture.
- Never resurrect an old "out of scope" rule without verifying that it is still current.

## Agent Navigation Rules

- ALWAYS search the repository before assuming a file exists.
- ALWAYS inspect the existing implementation before creating a new file.
- Prefer existing components/services/hooks/RPCs over creating duplicates.
- When searching for functionality, search by symbol/function/component name, not only by filename.
- For database behavior, inspect both the application caller and the relevant Supabase migration/function/policy.
- Never invent paths, RPCs, columns, tables, or components.
- If a referenced file cannot be found, explicitly report that instead of guessing.
- Treat `supabase/migrations` as the database change history.
- Never edit an already-applied migration.
- Security-sensitive changes require inspecting RLS, grants, triggers, and `SECURITY DEFINER` behavior.
