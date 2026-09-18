# Discora — Pre-Beta SEO + AI Discoverability Audit
## AUDIT ONLY — no code, migrations, config, data, routes, metadata, or copy changed

**Mode:** READ-ONLY AUDIT. No application code, SQL, migrations, data, configuration, packages, metadata, routes, UI, or copy was created or modified. No production contact of any kind (no connection, queries, or deploys). No commits. No pushes. Local Supabase + local dev server only.
**Date (UTC):** 2026-09-17
**Engine:** real Chromium via Playwright-backed MCP browser tools + raw-HTML (no-JS) inspection via local HTTP + repository/database inspection.

---

# 1. Executive Summary

Discora's SEO foundation is **honest but thin**: correct per-page titles/descriptions/canonicals on major dynamic routes, proper `noindex` on private/missing/admin/authenticated surfaces, room-visibility enforcement inside the search RPC and DEFINER views, and zero structured-data misrepresentation (because there is **no structured data at all**). No private content was observed leaking to guests through pages, search, metadata, or feeds.

The central finding is architectural, not a bug: **essentially all room content (messages, claims, evidence, inquiries) renders client-side after hydration**. A crawler without full JS execution receives shells, navigation, metadata, and legal text — but not the discourse itself. AI systems reading raw HTML likewise get accurate framing (philosophy, definitions, boundaries) without the substance. Everything else follows from that: no robots.txt/sitemap to guide crawlers, generic fallbacks where authors left descriptions empty, duplicated title suffixes (`X | Discora | Discora`), no OG images, and lens sub-pages without their own metadata.

Philosophy risk is LOW: no surface observed would teach an AI or searcher that Discora votes on truth, ranks authority, or lets AI judge. The one real mischaracterization vector is the **absent semantics** — without structured data, external systems must infer the knowledge model from prose alone.

**Gate: no P0. One P1 (crawlable-content architecture decision), two P2s, five P3s. Nothing here blocks Beta on security grounds; the P1 is a product/SEO strategy decision.**

---

# 2. Audit Scope

Routes, metadata, canonicals, robots/sitemap (absent), structured data (absent), semantic HTML, internal linking, duplicates, thin content, deleted content, social previews, crawler (no-JS) behavior, AI/machine readability, SoU/vote semantics as seen by machines, security/SEO cross-checks, branding consistency, crawl efficiency. Prior phases' systems (deletion, invitations, friends, admin, grants) were re-checked only where they intersect discoverability.

# 3. Documents Reviewed

Governance, master context, PRD, feature registry, user flows, DB design, system architecture, design system, API design, roadmap, knowledge model, discussion-room UX spec, comprehensive MVP audit, how-it-works audit, plus Phase 9/9D.3/grant/SoU/browser/reputation/closure reports. Old SEO-relevant claims re-verified live (e.g. the "zero philosophy violations" and "public/private boundary" statements).

# 4. Route Inventory (44 pages + 1 callback route)

| # | Route | Category |
|---|---|---|
| 1 | `/` | PUBLIC + INDEXABLE |
| 2 | `/about` | PUBLIC + INDEXABLE |
| 3 | `/discussions`, `/debates` (feeds) | PUBLIC + INDEXABLE |
| 4 | `/discussions/[slug]`, `/debates/[slug]` | PUBLIC + INDEXABLE (visibility-dependent) |
| 5 | Lenses: `claims`, `evidence`, `sources`, `questions`, `understanding` (+debate `arguments`) | PUBLIC + SHOULD-PROBABLY-BE-INDEXABLE (decision §27) |
| 6 | `/inquiries/[id]` | PUBLIC + INDEXABLE (visibility-dependent) |
| 7 | `/u/[username]` | PUBLIC + INDEXABLE |
| 8 | `/search` | PUBLIC BUT SHOULD NOT BE INDEXED (utility page; has no noindex — P3) |
| 9 | `/terms`, `/privacy`, `/guidelines`, `/grievance` | PUBLIC + INDEXABLE |
| 10 | `/login`, `/register`, `/forgot-password`, `/reset-password` | PUBLIC BUT SHOULD NOT BE INDEXED (no robots meta observed — P3) |
| 11 | `/friends`, `/saved`, `/settings/*` | AUTHENTICATED ONLY (server redirect; friends has `noindex`) |
| 12 | `/discussions/create`, `/debates/create` | AUTHENTICATED ONLY |
| 13 | `/admin`, `/settings/moderation` | ADMIN (owner/role-gated; admin layout `noindex,nofollow`) |
| 14 | `/auth/callback` | SYSTEM (code exchange; allowlisted `next`) |
| 15 | `/icon`, `/favicon.ico` | SYSTEM (new mark serving 200) |
| 16 | `not-found`, `error`, `global-error` | ERROR/FALLBACK |
| 17 | No `/robots.txt`, no `/sitemap.xml`, no API routes, no invite-token URL routes (fragment transport only) | ABSENT (by design or gap — see §6–7) |

# 5. Public/Private Indexability Matrix

| Surface | Guest HTTP | Guest content | Index signal | Verdict |
|---|---|---|---|---|
| Homepage, About, legal | 200, full SSR text | full | indexable, no robots tag | CORRECT |
| Public discussion/debate | 200, shell + metadata | metadata only (content client-rendered) | indexable | PARTIAL (P1 §8) |
| Lens sub-pages | 200 | same shell pattern | indexable, no per-lens metadata | PARTIAL (P3) |
| Inquiry detail (public room) | 200 | shell only | indexable, content-derived title | PARTIAL (P1 §8) |
| Public profile | 200, SSR header | header + public contributions | indexable | CORRECT |
| Private debate (non-participant) | 200 generic gate | none (verified: no title/content/counts) | page-level `noindex` + generic metadata | CORRECT |
| Missing/deleted profile | 404 + generic page | none; retired handles unresolvable | `noindex`, "User not found" title | CORRECT |
| Friends/settings/saved | redirect → login (guest) | none | friends `noindex`; settings unauthenticated | CORRECT |
| Admin | generic 404 rewrite | none | `noindex,nofollow` | CORRECT |
| Search page | 200 utility UI | results client-rendered | indexable (should be noindex — P3) |
| Auth pages | 200 forms | forms only | indexable (should be noindex — P3) |

# 6. robots.txt findings

Does not exist (no `src/app/robots.ts`, no `public/robots.txt`). Crawler policy is therefore per-page `robots` metadata only. Nothing sensitive depends on robots.txt (all private/admin surfaces are auth-gated + `noindex`), so absence is a guidance gap, not a leak. Recommendation: add `robots.ts` allowing public routes, disallowing `/admin`, `/settings`, `/friends`, `/saved`, `/auth/*`, `/api/*`, and pointing at the future sitemap. No query-parameter rules needed (no parameter-driven public content except `?highlight=`/`?claim=`, which are same-content views — see §13).

# 7. sitemap findings

Does not exist. With no sitemap, discovery depends on internal linking (good: feeds → rooms → lenses → claims/evidence) and homepage surfacing. At Beta scale this is acceptable; at growth scale, dynamic room/claim URLs need a segmented sitemap (by type + `lastmod` from `updated_at`, excluding private/archived/deleted). Recommend designing (not yet implementing) a route-count strategy now: `sitemap.xml` index → `sitemaps/rooms.xml`, `sitemaps/profiles.xml`, `sitemaps/legal.xml`, capped at 50k URLs each. PRODUCT DECISION: include profiles (yes, recommended — public by design) and whether to include lens sub-pages vs canonical room only.

# 8. Metadata findings

- Root: title template `%s | Discora`, accurate description, OG `siteName`, icons → new mark + `/favicon.ico` (both 200 live). No `metadataBase` issues (derives from request origin — see §9).
- Dynamic routes generate unique titles/descriptions: debates, discussions (public), profiles (with OG `profile` type + avatar image when http), inquiries (content-derived). Missing/deleted/private fall back to generic + `noindex` — correct pattern, verified live.
- Gaps (P3): lens sub-pages have no `generateMetadata` (inherit room title; no per-lens description); feeds/search/saved/settings/legal/auth pages use generic or no metadata; **title duplication bug**: pages whose title already ends in `| Discora` render `X | Discora | Discora` (observed: debates, discussions, profiles, inquiries) — template double-suffix, cosmetic search-presentation defect.
- Empty-description fallback ("A structured discussion on Discora.") is generic but honest; authors leaving descriptions blank is a content, not code, issue.
- No `keywords`, no `author` overreach, `lang="en"` set, viewport standard.

# 9. Canonical URL findings

`getSiteUrl()` derives origin from `x-forwarded-proto/host` (no hardcoded domain — portable and correct for a pre-domain Beta). Canonicals + OG URLs therefore mirror the serving host. Consequence: any host that serves the app (staging, internal, LAN IP) self-canonicalizes — no cross-host canonical discipline exists. Once the production domain exists: set canonical host explicitly (env-driven, e.g. `NEXT_PUBLIC_SITE_URL` enforced in `getSiteUrl`), keep request-host fallback for dev. Trailing slashes: Next default (no redirect issues observed). `?highlight=`/`?claim=` deep links have no canonical self-reference on lens pages (P3 duplicate signal — crawlers may index highlight variants separately). `redirectedFrom`/`next` params are internal-only (safe-redirect validated).

# 10. Semantic HTML findings

Verified live: single landmark structure per page (`banner`/`complementary` nav with `aria-label`, `main`, headings h1→h2→h3→h4 in order, lists for nav/cards, real links/buttons with accessible names, `aria-current="page"` on active lenses, dialog `role`/`aria-modal`). Room pages expose the knowledge model structurally: room h1 → lens nav → claim `article` elements with type badges → evidence/argument links → SoU region with named state sections. Relationships are human-legible and link-traversable. No div-soup flattening. Minor: nested `<main>` (app-shell > room-layout) predates this work — P3 landmark nit already tracked in the UI batch.

# 11. Structured data findings

**None exists** — zero JSON-LD/`schema.org` references in `src` (verified by repo-wide grep; the only "website"/"profile" hits are OG types, not schema). No correctness/nesting/duplication/leak issues can therefore exist, and none was found. Whether to add it is a PRODUCT DECISION: conservative recommendation is `WebSite` + `Organization` (site identity) and `BreadcrumbList` (hierarchy) only; `DiscussionForumPosting`/`ProfilePage` would materially improve machine understanding of rooms/profiles but must be scoped to public content and must never encode votes/scores/SoU as ratings, endorsements, or truth claims. Do NOT implement until the P1 content-rendering decision (§8/§15) is made — structured data pointing at shells would be worse than none.

# 12. Internal-linking findings

Homepage → feeds → rooms → lenses → claims/evidence/inquiries; claims → evidence/arguments deep links; profiles → rooms; rooms → profiles (attribution); legal hub interlinked. No orphan public pages found; deepest path is 3 clicks (home → room → lens → claim highlight). Guest-visible CTAs preserve `redirectedFrom` safely. Zero dead ends observed (all empty states link onward). Strong.

# 13. Duplicate-content findings

- Conversation vs `/contributions`: redirect (single canonical behavior) — GOOD.
- Claims duplicate-render bug: FIXED and re-verified (one header/guide/articles set in live DOM).
- `?highlight=`/`?claim=` variants: same content, no canonical differentiation on lens pages (P3 — recommend canonical self-reference or param handling in future Search Console/robots strategy).
- Retired-handle profiles 404 (no duplicate/stale profile URLs).

# 14. Thin-content findings

Empty rooms/profiles render intentional empty states (not thin junk); fixture/QA rooms exist only in the local sandbox (INFO, not production). No index-quality crisis at Beta scale. Future consideration (PRODUCT DECISION, no thresholds invented): whether empty/new rooms should carry `noindex` until materially populated. Not recommended as a blocker.

# 15. Deleted-content findings

Retired handles unresolvable → generic 404 + `noindex` "User not found" (verified live with `deleted_user_deadbeef`). No stale attribution, no handle enumeration, no cached PII in metadata (deleted-user paths return before any data fetch). Matches the approved deletion model. CDN/propagation windows for avatars remain an operator note from prior reports.

# 16. Social-preview findings

Titles/descriptions/URLs/site-name verified on debates, discussions, profiles, inquiries; Twitter card tags present globally. **No `og:image`/`twitter:image` configured anywhere** (verified in raw HTML) — link shares render text-only. P3 polish: add a static brand OG image (the new mark on a dark card) + per-room fallback; never use user avatars beyond the existing profile case; private rooms already return generic metadata (no leak).

# 17. Traditional SEO findings

Crawlable IA, honest metadata, correct noindex boundaries, safe canonicals-in-waiting. Gaps: no robots/sitemap (P3+P2 respectively — sitemap matters more at scale), title double-suffix (P3), missing lens/feed metadata (P3), no OG image (P3), auth/search pages indexable (P3, one-line `noindex` each).

# 18. AI Discoverability findings

An LLM reading the served pages can correctly answer: what Discora is (About + homepage copy is explicit and unambiguous), what discussions/debates/claims/evidence/inquiries/SoU are (layered definitions with "not a popularity vote, not an AI verdict, not a consensus score" stated verbatim), how it differs from Reddit/debate platforms (About: no winners/losers/scorecards; side-switching as integrity), that it does not vote on truth or let AI judge (Terms §7 + About AI boundaries), and that SoU is not objective truth (stated in UI, docs, and legal text). **BUT the same crawler cannot see any actual discussion content** (P1 §8/§20) — it learns the system accurately and the substance not at all.

# 19. AI semantic/entity relationship findings

Explicit in prose and IA: Discussion→Claims→Evidence/Sources→Questions→SoU; Debate→Proposition/Opposition→Claims→Evidence→Inquiries→Positions→SoU; profile→contributions. Gaps: relationships are prose/navigational, not machine-typed (no schema, no `rel` semantics beyond links); claim↔evidence↔inquiry edges exist only as UI links; SoU-to-claim membership is presentational. An AI must infer edge semantics. This is acceptable for Beta provided the P1 rendering decision keeps humans-first ordering: machine typing without crawlable substance adds little.

# 20. SoU semantic safety findings

PASS with margin. UI copy ("Deterministic synthesis…", "Not a truth verdict" patterns), classifier (evidence-only inputs), unit tests (vote/position-blindness), Terms (§7.1–7.3), About, and the SoU lens all agree. No page observed implies SoU = truth/consensus/majority/popularity. The remediated Map-lens consensus wording is stance-descriptive (and that lens is currently unmounted). No crawler-visible signal contradicts the approved definition.

# 21. Vote/stance semantic findings

PASS. Labels are Support/Challenge with counts; tooltips describe stance distribution; SoU ignores votes by construction and test. The `agreementPercentage` internals never surface as correctness. Search excerpts and metadata contain no vote-derived claims. The one historical risk (consensus meter) was reframed before this audit.

# 22. Security/SEO cross-check

PASS. Improving SEO must not and (per recommendations below) will not expose: private rooms (RPC + view predicates + noindex verified), private profiles/data (owner-scoped RLS verified), friend graph (no endpoints), invitation tokens (fragment-only, none observed), access codes (bcrypt, owner-only RPCs), emails (PII-scrubbed errors + Sentry config), admin paths (404-rewrite + noindex + 403 RPCs), internal IDs beyond URL slugs (slugs are the public identifier by design), Supabase anon URL/key (public by design; service key absent from all client artifacts re-verified), debug internals (dev-only RSC payloads verbose by nature of dev mode; production builds strip them — noted, not a finding).

# 23. Performance/crawl-efficiency findings

Per-page `generateMetadata` performs 1–3 indexed reads (profile/room/inquiry by slug/id) — cheap; no N+1 in metadata paths. Sitemap-at-scale cost is unbuilt (recommendation §7 keeps it segmented). Images: mark served via optimizer variants; noindex pages still server-render fully (minor crawl-budget note, acceptable). No load testing performed (out of scope).

# 24. Branding/entity consistency

Title suffix `| Discora`, OG `siteName: Discora`, new mark as favicon/apple-touch + header/sidebar/hero (verified live this cycle), textual wordmark consistent. Entity risk: the `| Discora | Discora` duplication slightly dilutes title signals (P3, same fix as §8).

# 25. Prioritized findings

- **P1-SEO-01 — Room content is client-rendered; crawlers/AI see shells, not discourse.** Evidence: initial HTML of discussion room, claims lens, and debate room contains zero claim/message/evidence text (verified by string probes); SoU numbers render from client queries; search page likewise. Impact: search indexing + AI substance understanding fundamentally limited; all downstream discoverability work has reduced value until decided. PRODUCT DECISION REQUIRED (SSR/RSC content rendering vs. accepted JS-dependent indexing).
- **P2-SEO-01 — No sitemap architecture.** At Beta scale internal linking suffices, but growth makes this a known cliff. Recommendation designed (§7); implement post-decision on P1-SEO-01.
- **P2-SEO-02 — Title double-suffix (`X | Discora | Discora`)** on debates, discussions, profiles, inquiries. One-line template fix (strip `| Discora` from page titles, let the template append it).
- **P3:** no robots.txt; auth/search pages indexable (add `noindex`); lens sub-pages lack own metadata; no OG image; `?highlight=` canonical gap; anon `debate_participants` 401 console noise on guest debate loads (page degrades gracefully; either grant+policy decision or client-side auth-gating of the query).
- **INFO:** fixture rooms on local feeds; dev-mode RSC verbosity; staging-host self-canonicalization.

# 26. Recommended implementation sequence

1. Product decision on P1-SEO-01 (server-render room content vs. accept JS-dependent indexing) — everything else keys off this.
2. P2-SEO-02 title fix + auth/search `noindex` (trivial, safe, independent).
3. robots.txt + sitemap architecture (after #1; static legal/about first, dynamic segments second).
4. OG image (static brand card) + lens metadata + highlight-param canonicals.
5. Structured data, conservative slice only (WebSite/Organization/BreadcrumbList; forum/profile types only after #1 and with strict no-rating/no-endorsement constraints).
6. participants-query gating for guests (silence the 401 noise).

# 27. Product decisions required

1. **P1-SEO-01:** SSR/RSC-render public room content for crawlers/AI, or formally accept JS-dependent indexing (affects effort, crawl budget, and what AI systems can learn)?
2. **Sitemap scope:** include profiles (recommended yes), lens sub-pages vs canonical-room-only, empty-room indexability rule (no thresholds invented here).
3. **Guest participant-list visibility** (fixes the 401 noise either way: grant+policy if visible, client gate if not).

# 28. Items explicitly NOT requiring changes

SoU semantics/copy; vote model; RLS/grants beyond the listed items; invitation/deletion/friends architecture; AI posture; notification absence; discovery ordering; legal copy; branding; motion system; navigation architecture. No popularity/engagement mechanics to remove — none found.

# 29. Production-readiness dependencies

Production domain + canonical-host enforcement; Search Console/Bing Webmaster + sitemap submission post-deploy; social-preview validation (card validator) once OG image ships; AI-crawler policy (e.g. `llms.txt`/terms reiteration) as a later Owner decision — not proposed as scope now.

# 30. Final verdict

**No P0. P1: 1 (P1-SEO-01, architectural decision — not a security issue). P2: 2. P3: 5. INFO: 4. Nothing in this audit blocks Beta on security or privacy grounds.** The P1 and both P2s are product-strategy items that must be decided (not necessarily fully built) with eyes open before public launch, because they determine what the world — human and machine — can learn from Discora.

---

**REPORT:** `docs/PRE_BETA_SEO_AI_DISCOVERABILITY_AUDIT.md`
**PRODUCTION:** NOT TOUCHED (no connection, queries, deploys, migration activity of any kind)
**COMMITS:** NONE — **PUSHES:** NONE — **MIGRATIONS:** NONE — **DATA/CODE/CONFIG CHANGES:** NONE
