# Discora - Supabase Auth Setup

Version: 1.0

Status: Draft

Scope: Sprint 2 authentication foundation

---

# Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-exposed Supabase values.

`GEMINI_API_KEY` remains server-only and is not used by Sprint 2 auth.

---

# Local Redirect URLs

Configure these URLs in the Supabase dashboard for local development:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

If running on a different local port, add the matching URLs for that port.

---

# Implemented Auth Flows

Sprint 2 auth foundation supports:

* Email registration
* Email verification callback
* Email/password login
* Logout
* Password reset request
* Password update from recovery session
* Session state through a typed provider and hook
* Protected-route foundation through middleware and `requireAuth`

---

# Non-Goals

Sprint 2 auth does not implement:

* Google Sign In
* Profiles
* Database schema
* Row Level Security policies
* Product authorization
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
