# Discora

Discora is a structured discussion, debate, and knowledge-building platform focused on understanding over engagement.

## Sprint 1 Foundation

This repository is currently implementing the approved Sprint 1 foundation scope:

- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui configuration
- Supabase client wiring
- Dark-first theme provider
- Shared domain types
- Basic responsive layout shell

Product features such as discussions, debates, claims, evidence, sources, questions, notifications, search, and AI are intentionally out of scope for Sprint 1.

## Architecture Notes

Architecture decisions are recorded in:

```text
docs/16_ARCHITECTURE_DECISIONS.md
```

Sprint 1 follows:

```text
docs/15_SPRINT_1_IMPLEMENTATION_CHECKLIST.md
```

Sprint 2 authentication setup follows:

```text
docs/17_SPRINT_2_AUTH_PLAN.md
docs/18_SUPABASE_AUTH_SETUP.md
```

## Environment

Create a local `.env.local` file for real values. Do not commit secrets.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-exposed Supabase values. `GEMINI_API_KEY` is server-only and must not use a `NEXT_PUBLIC_` prefix.

For local authentication redirects, configure Supabase with:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

## Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run lint
npm run build
```

The default local development URL is:

```text
http://localhost:3000
```
