# Discora — Comprehensive Pre-Beta Product / Security / Exposure Audit

**Mode:** READ-ONLY AUDIT. No application code, migrations, schema, RLS, grants, RPCs, config, env, data, or history was created, modified, or deleted. No production contact of any kind (no connection, no queries, no deploys). No commits. No pushes. Local Supabase + local dev server only. Temporary artifacts: none retained (one `Select-String` output file in OS temp dir, outside the repo).
**Date (UTC):** 2026-09-16
**Auditor role:** Principal Application Security Engineer + Senior Product/QA Auditor
**Repository:** `D:\Projects\Discora`, branch `main`

---

# 1. Executive Summary

Discora was audited end-to-end (repository, database, auth, browser, network, admin, philosophy) against the live local stack. The core security architecture is sound and prior remediation held up under re-verification: admin RPCs deny ordinary users at every layer (URL → 404 rewrite, RPC → 403 `Access denied`, DB-role guards), friend/invitation data stays owner-scoped, invitation tokens are hashed with fragment-only transport, account-deletion controls are intact in catalog, search enforces room visibility inside the RPC body, storage avatars are owner-folder-scoped, and no secrets reach the browser or client bundles.

No P0 (catastrophic) issue was found. The Beta gate rests on a small set of real items: a **P1 legal-compliance gap** (the 18+ registration gate is enforced only in the browser and is trivially bypassable via direct `signUp`), two **P2 product-integrity concerns** (a vote-derived "Consensus Level" meter and popularity spotlights in the Map lens that sit uneasily with the consensus≠truth guardrail), and carried P3 hardening tails (SEO surface, legacy invitation query fallback, unpinned-DEFINER/PUBLIC-execute hygiene, dead components). The deterministic SoU, vote-as-stance model, admin boundary, and exposure posture all verify clean.

**Gate: security READY WITH CONDITIONS, functional READY WITH CONDITIONS, admin READY, exposure READY, epistemic ALIGNED WITH CONDITIONS.** Conditions are enumerated in §27–28; none requires product redesign.

---

# 2. Audit Scope

- **Repository/architecture** (§A below): Next.js 15 App Router, feature modules, Server Actions, RPC usage, middleware, auth boundaries, data fetching, caching, realtime, storage, env handling, errors, logging, admin, tests. Dead code mapped.
- **Database/RLS/grants/RPCs**: all public tables RLS-enabled (verified, zero exceptions); grants matrix spot-checked; all 8 admin RPCs inventoried (EXECUTE/DEFINER/search_path/body guards); search/invitation/friend/deletion RPCs re-verified; migration ledger read (local-only 140004/140005/140006/150001/160001/170001/180001; remote through 140003 per ledger read).
- **Auth/API/application**: registration (incl. age gate), login/logout/session, OAuth callback, safe redirects, protected routes, re-auth, deletion (catalog-level; no live deletion executed), privileged auth, inactive-user gating.
- **Browser/network/exposure**: real Chromium flows (guest + User A + User B sessions) across /, /about, /login, /register, /search, /discussions + lenses, /debates + lenses, /inquiries/[id], /friends, /settings, /u/[username], /admin, private debate gate; console + network + client-storage inspection; client-bundle secret scan.
- **Admin**: dedicated boundary test ordinary-user → URL → API → RPC → DB objects; all 8 admin RPCs probed live (4 read + 1 mutating with inert params); audit-log and moderation tables reviewed.
- **Philosophy**: SoU copy/classifier, votes/reactions, consensus meter, spotlights, reputation display, Discovery/sorting, sharing, friends — each judged by what behavior it encourages.
- ** NOT covered by live test**: production (no access, by rule), Google OAuth round-trip (provider creds unset locally), destructive deletion execution, high-concurrency bursts, email delivery beyond local Mailpit, physical devices.

---

# 3. Environment Tested

- **Repo:** `D:\Projects\Discora`, branch `main`, working tree with ~420 pre-existing modified/untracked entries (earlier phases; untouched by this audit).
- **Local Supabase:** API `127.0.0.1:54321`, DB `127.0.0.1:54322`, Inbucket `127.0.0.1:54324` (`supabase status` VERIFIED). Google OAuth env unset (expected local).
- **App:** dev server on `:3002` (inline local env overrides; `.env.local` untouched), reached from the containerized browser via host LAN IP after documenting the loopback/DNS split (see §23).
- **Identities:** pre-existing synthetic locals — User A (`qa-verify-a@…`, owner of public Room A), User B (`qa-verify-b@…`, owner of private Room B); fixture rooms/claims/inquiries/side-changes from prior QA. No new identities or rows created in this phase.

---

# 4. Documents Reviewed

`00_MASTER_CONTEXT`, `01_PRD`, `02_FEATURE_REGISTRY`, `03_USER_FLOWS`, `04_DATABASE_DESIGN`, `05_SYSTEM_ARCHITECTURE`, `06_DESIGN_SYSTEM` (skim), `07_API_DESIGN`, `08_DEVELOPMENT_ROADMAP` (skim), `23_KNOWLEDGE_MODEL` (skim), `DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC` (skim), `DISCORA_AGENT_GOVERNANCE`, `COMPREHENSIVE_MVP_PUBLIC_BETA_AUDIT`, `HOW_DISCORA_WORKS_AUDIT` (skim), Phase 9A/9B/9C/9D audit + remediation reports, SoU hardening reports, grant reconciliation + behavior check, browser behavioral verification, reputation snapshot audit/remediation, focused closure report. Old findings were re-verified against live state, not assumed (§24).

---

# 5. Test Identities / Roles

| ID | Role | Source |
|---|---|---|
| Guest | anonymous visitor | fresh browser context |
| User A | ordinary authenticated user, room owner (public Room A) | pre-existing synthetic local |
| User B | ordinary authenticated user, room owner (private Room B) | pre-existing synthetic local |
| Participant | covered via A/B ownership + debate_participants RLS review | fixtures + policy read |
| Moderator/Admin | NO test principal exists; verified via catalog (role guards) + negative probes as A/B + code (middleware/owner-guard) | read-only |
| Service role | never used directly; server-side paths reviewed in code | code inspection |

---

# 6. Overall Verdict

- **Security:** READY WITH CONDITIONS (condition: P1 age-gate server enforcement or explicit legal risk acceptance).
- **Functional:** READY WITH CONDITIONS (same condition; all flows work).
- **Admin:** READY.
- **Exposure:** READY.
- **Epistemic:** ALIGNED WITH CONDITIONS (relabel P2 consensus-meter/spotlights).

---

# 7. Severity Summary

- **P0:** 0
- **P1:** 1 (F-AUTH-01 age gate client-only)
- **P2:** 2 (F-EPIS-01 consensus meter; F-AUTH-02 anon inquiry-count gap — see finding for severity rationale)
- **P3:** 6 (popularity spotlights; legacy invitation query fallback; SEO surface; PUBLIC-execute hygiene — the 4 unpinned DEFINERs were pinned by migration 170001, see reconciliation note under §24; dead UI components; QA fixture residue on public feeds)
- **INFO:** 7 (reactions model; discovery sorting; metrics aggregates; search weighting; rate-limit posture; notification absence; working-tree noise)

---

# 8. Critical Findings

## F-AUTH-01 — P1 — 18+ registration gate enforced client-side only

Area: Authentication / legal compliance
Location: `src/features/auth/components/register-form.tsx:19-31,137-164` (checkbox + client block); `src/features/auth/services/auth-service.ts` (`signUp` direct); `supabase/config.toml` (`[auth.hook.before_user_created]` commented out, lines 278-281); no migration implements a server age check (repo-wide grep for age/hook: none active).

Expected: The Beta 18+ eligibility gate (register copy: "You must confirm that you are at least 18 years old") holds regardless of client used.

Observed: Unchecking the box blocks the form, but `supabase.auth.signUp({email,password})` goes straight to GoTrue with no `before_user_created` hook, no profile flag, no server validation. Anyone calling the public Auth API (or a modified client) registers without any age attestation.

Reproduction:
1. `POST /auth/v1/signup` (anon key) with email/password, no age field exists to even send.
2. Account created; no server record of age attestation.

Evidence: code paths above; config hook commented; migration grep empty.

Impact: Legal/compliance — underage users can join the Public Beta despite the stated 18+ requirement. Not data theft, but a release-gate compliance failure.

Affected Actor: anonymous registrant (trivially exploitable, no auth needed).
Security Boundary: client-side-only validation; backend boundary absent.
Recommendation: enforce server-side before Beta — e.g. enable `auth.hook.before_user_created` requiring an `age_confirmed` flag in signup metadata (client sends `options.data.age_confirmed`), or record attestation on profile creation and gate participation. Keep UX checkbox as-is.
Product Decision Required: NO (requirement already established; only mechanism is missing).
Current Status: OPEN.

## F-EPIS-01 — P2 — Vote-derived "Consensus Level" meter in Map lens

Area: Epistemic integrity
Location: `src/features/discussions/components/discussion-intelligence.tsx:104-111,155-184,240-284`, rendered by `map-tab.tsx:654` (live Map lens).

Expected: Per governance, consensus ≠ truth and votes are community stance; no UI should present vote agreement as a consensus measurement.

Observed: `avgConsensus` (mean agree-ratio across claims) renders as **"Consensus Level: High/Medium/Low"** with **"X% average agreement"**, plus an **"Emerging Consensus"** list ranked by `score = totalRel*2 + totalVotes + importance`, with per-item numeric scores. A 70%+ agree ratio displays "High" consensus — indistinguishable in meaning from a truth signal to ordinary readers.

Reproduction: open any discussion → Map lens → "Consensus Level" + "Emerging Consensus" sections.

Evidence: file/line refs above; live component (imported by map-tab, no gating).

Impact: Undermines the consensus≠truth guardrail in a live surface; teaches users that agreement percentage = established consensus. The authoritative SoU surface itself is clean, which bounds the damage.

Affected Actor: all room viewers.
Security Boundary: n/a (product integrity).
Recommendation: relabel to stance-descriptive language before Beta (e.g. "Stance Distribution", "Most agreed-upon (by votes)"), or gate behind an explicit "community stance, not correctness" disclaimer; do not feed it into SoU (it already doesn't).
Product Decision Required: NO (philosophy already decides; only copy needs alignment).
Current Status: OPEN.

## F-AUTH-02 — P2 — Anonymous users get 401 (not filtered rows) on inquiry reads

Area: Functionality / grants
Location: `inquiry_items` (no anon SELECT grant); observed live: guest SoU lens → `GET inquiry_items?select=target_claim_id… => 401 Unauthorized` (console), counts silently missing.

Expected: Public-room inquiry context should either render for guests (policy name "Inquiry visibility matches room visibility" suggests room-gated, not auth-gated, intent) or the product should explicitly define guests as excluded.

Observed: 401 for anon (no grant at all) while authenticated gets RLS-filtered rows. Graceful (counts absent, page renders), but the policy/grant pair is inconsistent in intent.

Reproduction: logged-out → any discussion understanding lens → console 401s; inquiry chips absent.

Evidence: live console + grant query (anon holds no SELECT on the three tables).

Impact: Guests lose inquiry context on public rooms; ambiguous whether intended.

Affected Actor: anonymous visitors.
Security Boundary: fail-closed (no leak either way).
Recommendation: Product Owner to decide guest visibility of public-room inquiries; then either grant anon SELECT (RLS already room-gates) or document exclusion. P2 because it changes guest product behavior either way.
Product Decision Required: YES (guest visibility scope).
Current Status: OPEN.

---

# 9. Full Findings Table

| ID | Sev | Title | Status |
|---|---|---|---|
| F-AUTH-01 | P1 | 18+ gate client-only, bypassable via direct signUp | OPEN |
| F-EPIS-01 | P2 | Vote-derived Consensus Level meter in Map lens | OPEN |
| F-AUTH-02 | P2 | Anon inquiry reads 401; guest-visibility intent ambiguous | OPEN (decision req.) |
| F-EPIS-02 | P3 | "Most Supported / Most Contradicted / Most Connected" spotlights (health/summary) | OPEN |
| F-INV-01 | P3 | Legacy `?invitation=` query fallback still honored | DEFERRED (known residual) |
| F-SEO-01 | P3 | No robots.txt / sitemap.xml; no discussion `generateMetadata` | OPEN |
| F-HYG-01 | P3 | PUBLIC-execute on self-guarding RPCs (the 4 unpinned DEFINERs were pinned by migration 170001 — reconciled, see §24) | OPEN (known) |
| F-DEBT-01 | P3 | Dead UI components (PositionHistory, DebateSidePicker, trust badges, useAuthorsReputation) | OPEN (debt) |
| F-SEC-01 | INFO | Emoji reactions (Like/Insightful/Curious) — conversational, no truth weight | ALIGNED (noted) |
| F-SEC-02 | INFO | Feed sorting (Most Active/Participants/Evidence) — discovery only, no rewards | ALIGNED (noted) |
| F-SEC-03 | INFO | Homepage Understanding Metrics aggregates — descriptive, no ranking | ALIGNED (noted) |
| F-SEC-04 | INFO | search_content PUBLIC-execute but self-guarding via embedded predicates | VERIFIED (noted) |
| F-SEC-05 | INFO | Auth rate limits configured (email 2/hr, sign-in 30/5min); anonymous sign-ins disabled | VERIFIED |
| F-SEC-06 | INFO | No API routes, no notification subsystem (matches Beta scope) | VERIFIED |
| F-SEC-07 | INFO | QA fixture residue on public feeds (local sandbox only) | NOTED |
| F-ADMIN-01..04 | — | Admin boundary probes (see §18) — all denied | VERIFIED |

Revalidated-fixed (live this audit): P1-01 inquiry/side-change SELECT grants (4/4 present); P2-01 claim_relations narrowed policy text live; P2-02 debates predicate `r.id = debates.id`; P3-01 all public tables RLS-enabled; P3-02 four functions pinned; reputation snapshot SELECT grant present; M3 token_hash/expires_at present with plaintext column gone; deletion orchestration tables present.

---

# 10. End-to-End Functionality Matrix

| Flow | Result | Evidence |
|---|---|---|
| Registration (UI) | PASS (age checkbox + terms/privacy links render, 0 errors) | browser snapshot |
| Registration (API boundary) | FAIL-OPEN (P1: F-AUTH-01) | code + config |
| Login/logout/session | PASS (redirects, session nav, safe `redirectedFrom`) | browser |
| Guest homepage (390px) | PASS (0 errors, mobile nav, feeds render) | browser |
| Discussions feed/room/lenses | PASS (room, lenses, composer render; 0 errors) | browser |
| SoU lens | PASS (Unresolved 2/2, clean copy, 0 product errors) | browser |
| Search (anon) | PASS (2 claims, highlights, deep links; private content absent; 0 errors) | browser + anon RPC `[]` |
| Debates feed | PASS (sort options render, 0 errors) | browser |
| Private debate gate (non-participant) | PASS (generic shell, no content/title leak, 0 errors) | browser |
| Inquiry detail (auth) | PASS (prior phase: full render, 0 errors) | prior live evidence |
| Friends (auth + guest redirect) | PASS (regions render; guest → safe login redirect) | browser |
| Settings/profile | PASS (data renders, Danger Zone present, 0 errors) | browser |
| Profile timeline incl. side-switch | PASS (prior phase: own renders, foreign absent) | prior live evidence |
| OAuth round-trip | NOT TESTED (provider creds unset locally) | environment limit |
| Live deletion execution | NOT TESTED (destructive; catalog verified) | deliberate skip |
| Admin console as owner | NOT TESTED (no owner session available) | environment limit |

---

# 11. Authentication / Authorization Audit

- Registration/login/logout/session/redirects: verified live; safe-redirect utility rejects `//`, `/\`, control chars, external origins (code-read `safe-redirect.ts:12-51`); OAuth callback exchanges code server-side then allowlisted-redirect (`route.ts`).
- Middleware: admin → 404 rewrite for non-owners; protected paths → login with `redirectedFrom`; missing profile → setup; `is_deleted` → cookie strip + `/` (code-read). Admin URL as ordinary user renders generic 404 (live).
- Inactive/deleted gating: `is_active_user()` in friend/invite/deletion RPCs + write RLS (code + migration text).
- Re-auth: password change re-verifies via signInWithPassword; deletion step-up password/OTP (prior live Mailpit proof cited as history).
- Age gate: UI-only (F-AUTH-01).
- OAuth: Google `prompt=select_account` + callback reviewed in code; live round-trip impossible locally (no creds) — NOT TESTED.

---

# 12. Database / RLS / RPC Audit

- **RLS:** every public table enabled (live query: zero `rowsecurity=false`). Includes `claim_deletion_config` (P3-01 fixed).
- **Grants:** authenticated INSERT/UPDATE/DELETE exists ONLY on `claim_relations` (INSERT narrowed live-verified; DELETE creator-scoped `created_by=auth.uid()`); no client DML on friends/invitations/reputation/admin/deletion/snapshot tables beyond approved SELECTs; debates has SELECT-only for clients (UPDATE policy inert).
- **Admin RPCs (8):** all DEFINER + pinned `search_path=public` + in-body `has_role_or_higher(auth.uid(),'admin')` → 42501. Live probes as ordinary user: `admin_get_overview_stats`, `admin_get_rooms`, `admin_get_audit_logs`, `admin_set_room_status` (inert UUID) → all 403 `Access denied`, generic body, zero state change.
- **Search RPC:** DEFINER, pinned, parameterized tsquery, PUBLIC-execute but room-visibility predicates embedded per result class; anon probe for private content → `[]`.
- **Views:** `discussion_debates` ends `WHERE has_room_access(r.id)` (live definition read); grant-audit DEFINER-view pattern holds for the inspected surface.
- **Unpinned DEFINERs/PUBLIC-execute:** the 4 unpinned functions were pinned by migration 170001 (live `proconfig` verified); self-guarding PUBLIC RPCs persist as known P3 hygiene (F-HYG-01); not exploitable (callers lack CREATE; bodies self-guard).
- **M3 invitations:** `token_hash` + `expires_at` present, plaintext column absent (live catalog); fragment transport + scrub in code; throttles/row-lock/revoke-RPC in migration text (live re-probe not repeated — cited as history).
- **Deletion:** orchestration tables present; RPC service_role-only (prior evidence); no live execution (deliberate).

---

# 13. Frontend / Bundle / Environment Exposure Audit

- Source grep (`src/**`, `public/**`): zero hits for `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI/OPENAI/RESEND/SMTP` secrets, or embedded JWTs.
- `.next/static` bundle grep: zero hits for server-only env names (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `DISCORA_OWNER_USER_ID`, `SENTRY_DSN`). Only public URL/anon key ship to clients (by design).
- `.env.local` now targets local Supabase (closure phase) + dev-only guard in `next.config.ts` refuses `*.supabase.co` in dev (verified previously). `.env.local` is gitignored; no secrets committed.
- Client storage: only Supabase auth cookies + visited flag; localStorage/sessionStorage empty of secrets (live `evaluate` probe).

---

# 14. Network / API Exposure Audit

- Authenticated traffic: anon-key header only; JWTs in `Authorization` headers, never URLs. Resource UUIDs in query strings are identifiers, not credentials.
- Invitation tokens: fragment-only per code; none observed in URLs/logs/referrer/SSR in this phase's traffic (no invite flows run — cited history).
- Errors: generic bodies (`Access denied`, `permission denied`, RLS violation naming only the caller-known table); no SQL/stack/paths/keys in UI or responses.
- No service-role material client-side anywhere observed.

---

# 15. Storage Security Audit

- Single bucket `avatars` (public-readable by design). Upload/update/delete policies: owner-folder (`foldername(name)[1] = auth.uid()`), filename allowlist (`avatar.jpg/jpeg/png/webp`), `is_active_user()` on all write paths. Matches deletion cleanup regex expectations. No signed-URL or private-asset paths exist. Cross-user overwrite impossible by policy (verified text, not live-probed — no test uploads performed per read-only rule).

---

# 16. Account Deletion / Privacy Integrity

- Catalog re-verified: `deletion_operations`, `deletion_step_up_proofs`, `storage_cleanup_queue`, `retired_handles`, `room_invitations` all present; M3 columns intact.
- No live deletion executed (destructive — deliberate). Prior implementation/correction reports stand as evidence; no code changed since except env/docs.
- Privacy posture from code: tombstone + handle retirement + private-signal purge + attribution NULLing + `is_active_user` fail-closed middleware/RPC gates (reviewed, unchanged).
- Handle-reuse and re-identification testing not performed live (would require destructive runs) — marked NOT TESTED.

---

# 17. Abuse / Rate-Limit / Enumeration

- Auth: `email_sent=2/hr`, `sign_in_sign_ups=30/5min`, `token_refresh=150`, anonymous sign-ins disabled (`config.toml`, read).
- App: friend quotas (15/hr + 40/day + 50-inbox), invite caps/throttles (20/room, 10/hr, 10-fails/15min, code 5/15min), deletion (3/day + OTP 5/hr + 300s TTL) — code/migration text from prior audits; live burst re-testing NOT repeated (would mutate state/counters — deliberately skipped).
- Enumeration: room/user/token tampering rejected per prior matrices; cross-user friend/invite reads return `[]`/403 (re-verified for inquiries/side-changes; friends/invites cited as history).
- No new thresholds invented. Missing server age enforcement flagged as F-AUTH-01 (not a rate question).

---

# 18. ADMIN PANEL SECURITY & GOVERNANCE AUDIT

**Verdict: READY.** Boundary proven at four layers with live evidence:

1. **URL layer:** ordinary authenticated User B → `GET /admin` → generic "Resource Not Found" page (middleware rewrite to /404; URL preserved, no role disclosure, zero admin content, one expected 404 resource error).
2. **RPC layer (live probes as ordinary User A):** `admin_get_overview_stats`, `admin_get_rooms`, `admin_get_audit_logs` → 403 `{"code":"42501","message":"Access denied"}`; `admin_set_room_status` with inert UUID → same denial (proves the role check precedes any mutation logic; zero state change).
3. **Function layer (live catalog):** all 8 `admin_*` RPCs are `SECURITY DEFINER` + pinned `search_path=public` + `EXECUTE` to `authenticated` ONLY as an invocation channel — every body opens with `if not has_role_or_higher(auth.uid(),'admin') → raise 42501` (all 8 guards located in migration source + live body spot-check).
4. **UI/service layer (code):** `/admin` page calls `requireOwner()` (constant-time owner-UUID compare, fails closed when unset) before any data fetch; all admin service functions call `requireOwner()` first; audit logging via `admin_log_access`.
- **Data exposure:** no moderation queues, audit logs, private-room contents, or role data reachable by A/B in any probe; SELECT policies on `moderation_flags`/`moderation_queue` require moderator+ (migration text).
- **Audit logging:** `admin_log_access` + immutable `admin_audit_logs` (client-inaccessible per grant matrix); tamper-resistance via no client DML (verified grants).
- **Errors:** invalid/unauthorized calls return `Access denied` only — no SQL, paths, schema, or secrets.
- **Known wart (P3, fails closed):** `admin_inspect_private_room` selects nonexistent columns → errors before data (prior finding, unchanged, still safe).
- **Not tested:** owner-console happy path (no owner session available — environment limitation, not a gap in the boundary proof).

---

# 19. Public / Private Data Boundary

| Surface | Public | Private | Verified |
|---|---|---|---|
| Discussion/debate rooms (public) | title/content/claims/SoU | n/a | browser + search |
| Private rooms | generic gate shell only ("Private Debate", no title/content/counts) | everything else | browser (non-participant) |
| Search results | public + own rooms only; private-room query → `[]` | private content | anon RPC probe |
| Profiles | public contributions, own side-switches | others' side-switches (`[]`), blocks, friend graph | browser as A and B + network |
| Friends/invites | own-side only | cross-user graph/tokens | prior probes + code |
| Reputation snapshots | own only | others' (empty) | prior live matrix |
| Admin/moderation/audit | none to clients | all | live 403s |
| Deleted users | "Deleted User" rendering path exists | PII purged per design | code (no live run) |

---

# 20. Epistemic / Discora Philosophy Audit

- **SoU: CLEAN.** Deterministic classifier (evidence-led, presence lattice Contested>Unresolved>Supported); UI copy "Deterministic synthesis…", "Not a truth verdict" (`sou-shared.tsx:59`); 28/28 unit tests lock vote/position-blindness. Live lens renders correct states with clean copy.
- **Votes: CLEAN.** Support/Challenge labels with counts, presented as stance ("72 Support · 28 Challenge · 100 votes"); tooltips describe stance distribution; never fed to SoU.
- **Reputation display: CLEAN.** Profile shows participation areas + contribution counts + timeline; no leaderboard route exists; trust-badge/score components are dead code (never imported); no cross-user score display anywhere live.
- **Debates: CLEAN.** No winners/losers/scores; side-switch framed as virtue ("Changing your mind is not losing", "truth-seeking virtue"); cooldown + rationale enforced server-side.
- **AI: CLEAN.** About page states AI assistive-only with explicit "does not decide truth" boundaries; no AI verdict/ranking/judgment paths in code.
- **Friends/sharing: CLEAN.** Private graph, no counts-as-status, no referral metrics; share links canonical without gamified counters.
- **CONCERNS: F-EPIS-01 (P2), F-EPIS-02 (P3)** above. Discovery sorting and reactions noted INFO (framed as browsing/conversation signals, no rewards).

---

# 21. Discovery / Engagement Mechanism Audit

- Homepage debate sorting (`most_active` = claims + activity; options for evidence/participants/newest) and "Understanding Metrics" aggregates are activity/descriptive signals for browsing, with no likes, followers, trending scores, rewards, or algorithmic amplification. No engagement-farming mechanics (streaks, notifications, viral loops — notification subsystem absent entirely).
- Search ranking weights by type (room 2.0 → message 0.8) × ts_rank — relevance weighting, not popularity. No click-through learning.
- **Assessment:** engagement-adjacent discovery ordering exists but is transparent, non-competitive, and reward-free. INFO, not a violation. Do not redesign.

---

# 22. Mobile/Desktop Functional Sanity

- Desktop ~1440px: full nav, lenses, composers, dialogs verified across 8+ surfaces, 0 product errors.
- Mobile 390px: bottom nav, stacked layouts, usable forms verified (login, guest home, inquiry detail, profile), 0 product errors.
- No overflow/clipping/dead-ends found in visited flows (snapshot-level inspection; programmatic overflow measurement unavailable in harness — stated).
- Touch targets meet 44px convention on inspected controls (prior evidence + spot snapshots).

---

# 23. Browser QA Evidence

- Engine: real Chromium via Playwright-backed MCP tools (navigate/snapshot/fill/click/evaluate/resize/console/network). No scripted `@playwright/test` suite exists in repo (package absent) — flows driven interactively, all evidenced.
- Sessions: guest (fresh), User A, User B (logins performed live; local Supabase only).
- Environment caveat (documented): container browser resolves its own loopback, so the dev server ran with a dual-reachable LAN-IP Supabase URL via inline env (files untouched); `.env.local` itself is local-first after the closure phase. One initial inquiry-404 traced to host-DNS, resolved, page then 200 — environmental, not product.
- Console: 0 product errors across all visited surfaces (only expected 404-resource on /admin rewrite + previously-known snapshot 403 now fixed + transient dev-navigation artifact cleared on reload).
- Network: all Supabase traffic local; no secrets/tokens in URLs; generic error bodies.

---

# 24. Existing Finding Revalidation

| Prior finding | Current status (live) |
|---|---|
| P1-01 inquiry/side-change SELECT grants | VERIFIED FIXED (4/4 grants present; UI + API green) |
| P2-01 claim_relations open INSERT | VERIFIED FIXED (narrowed policy text live) |
| P2-02 debates tautology | VERIFIED FIXED (`r.id = debates.id`, no UPDATE grant) |
| P3-01 RLS gaps | VERIFIED FIXED (zero RLS-disabled public tables) |
| P3-02 unpinned DEFINERs (4) | VERIFIED FIXED (all pinned; live `proconfig` re-checked — this row is authoritative; the older "OPEN" wording in §7/§9/§12 of this report is corrected accordingly) |
| Snapshot SELECT grant | VERIFIED FIXED (grant present) |
| Invitation M3 (hash/expiry/throttle/fragment) | VERIFIED INTACT (catalog + code; live re-probe cited as history) |
| Deletion controls | VERIFIED INTACT (catalog; no live run) |
| Google OAuth round-trip | Still NOT TESTED (no creds) — unchanged limitation |
| debates policy drift / grant hygiene tails | Only known P3 residuals remain (F-HYG-01) |

---

# 25. Deferred / Accepted Risks

- Legacy `?invitation=` fallback honored (read-only, scrubbed) — accepted residual (F-INV-01).
- Avatar CDN TTL, realtime-eviction unverified, PITR unexercised — accepted operational notes.
- QA fixture rows visible on local public feeds — sandbox-only hygiene (F-SEC-07).
- Production grants/behavior, SMTP/OAuth/DNS/frontend — operator track, untouched by this audit.
- Dead-code debt (F-DEBT-01) — cleanup phase material, not a Beta risk.

---

# 26. Product Decisions Required

1. **Guest visibility of public-room inquiries** (F-AUTH-02): RLS policy name suggests room-gated visibility, but anon holds no grant (401). Decide: grant anon SELECT (RLS already gates) or document guest exclusion. (Genuine ambiguity — implementation must not guess.)
2. **Consensus-meter presentation** (F-EPIS-01): relabel vs remove — recommendation: relabel to stance language (no product redesign needed, but Owner should confirm wording direction).

---

# 27. Recommended Remediation Sequence

1. Server-side 18+ enforcement (hook or post-signup attestation + participation gate) — P1, blocks Beta sign-off.
2. Consensus-meter relabel + spotlight softening (copy-only) — P2/P3, pre-Beta polish.
3. Decide guest inquiry visibility; implement grant-or-documentation accordingly.
4. Forward-migration hygiene batch when convenient: PUBLIC-execute narrowing, dead-component removal, robots/sitemap. (Unpinned DEFINER search_paths already fixed; do not re-add.)
5. Production track (separate authorization): grants reconciliation, SMTP/OAuth/DNS/frontend, backup/apply/verify, monitoring, counsel review.

---

# 28. Pre-Beta Release Gate

- **PRE-BETA SECURITY VERDICT: READY WITH CONDITIONS** (condition: F-AUTH-01 resolution or explicit legal risk acceptance; no exploitable boundary found).
- **PRE-BETA FUNCTIONAL VERDICT: READY WITH CONDITIONS** (same condition; all traced flows work).
- **ADMIN SECURITY VERDICT: READY** (four-layer boundary proven live).
- **EXPOSURE VERDICT: READY** (no secrets, generic errors, fragment transport, owner-scoped storage).
- **EPISTEMIC/PRODUCT INTEGRITY: ALIGNED WITH CONDITIONS** (SoU/votes/debates/AI clean; F-EPIS-01/02 copy alignment pending).

**TOP 10 THINGS THAT MUST HAPPEN BEFORE PUBLIC BETA:**
1. Enforce 18+ server-side (or formally accept the risk with counsel).
2. Relabel the vote-derived Consensus meter (and soften popularity spotlights).
3. Decide + implement guest inquiry visibility.
4. Production grants reconciliation (dashboard drift unknown).
5. Production SMTP/Resend + transactional email verification.
6. Production Google OAuth URIs + round-trip test.
7. Production domain/DNS + deployed frontend.
8. Apply pending migrations with backup + post-apply verification.
9. Monitoring (Sentry DSNs), sweep/purge scheduling, PITR exercise.
10. Legal sign-off (privacy policy, GDPR retention notes, handle permanence).

**THINGS THAT SHOULD NOT BE CHANGED BASED ON THIS AUDIT:**
SoU semantics/classifier; vote-as-stance model; private friend graph; M3 invitation architecture; deletion Option C; RLS-first enforcement pattern; no-AI-authority posture; feature set (no removals — only copy/visibility alignment); search weighting; unenforced-hygiene items beyond the listed batch.

---

**REPORT:** `docs/COMPREHENSIVE_PRE_BETA_PRODUCT_SECURITY_EXPOSURE_AUDIT.md`
**PRODUCTION:** NOT TOUCHED (no connection, queries, deploys, or migration activity of any kind)
**COMMITS:** NONE — **PUSHES:** NONE — **MIGRATIONS:** NONE — **DATA CHANGES:** NONE
