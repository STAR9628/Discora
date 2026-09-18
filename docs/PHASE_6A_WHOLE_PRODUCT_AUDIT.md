# PHASE 6A — WHOLE-PRODUCT AUDIT

Independent read-only product + architecture audit.
Date: 2026-09-07. Reviewer: independent audit agent (Cline).
Scope: current working tree at `d:/Projects/Discora`. No files were modified by this audit.

Verification basis used throughout this report:

- **CODE-VERIFIED** — read directly from source/migrations in the current working tree.
- **RUNTIME-CHECKED** — verified against the running dev server via HTTP (`curl`) during this audit: homepage renders (HTTP 200), `/saved` correctly redirects unauthenticated users (HTTP 307). Full interactive browser QA (screenshots, click-through, responsive viewport rendering) was **not performed** — no browser tool was available in this environment.
- **PRIOR-AGENT BROWSER-VERIFIED** — reported by the Phase 5D implementation agent; not independently re-verified here.
- **UNVERIFIED** — not tested, explicitly flagged.

Static validation executed during this audit (read-only):

- `npx tsc --noEmit` → exit 0 (clean).
- `npm run lint` → exit 0; **0 errors, 6 warnings** (all in QA scripts under `scripts/`, none in product source).
- `git status --short` → 28 entries, all belonging to prior-phase implementation work; audit touched nothing.

---

## 1. Executive Summary

Discora is in a **structurally sound and philosophically well-aligned** state. The core epistemic model (Questions → Claims → Evidence → Structured Inquiries, with Discussion vs Debate as distinct experiences) is implemented coherently and consistently across surfaces. Security posture is strong: RLS is enabled on all content tables, private-debate authorization is enforced at the database boundary (not the UI), and the Phase 5D follow-ups (`save_target_secure` RPC, fixed `get_my_recent_engagement` dedup) close the integrity gaps identified in the Phase 5D independent review.

The most significant risks are **not security** but:

1. **A deployment/repo consistency gap**: `supabase/phase5d_production_deploy.sql` contains three migrations (`202606260003/4/5`) that do **not exist** under `supabase/migrations/`. The frontend now depends on `save_target_secure`, meaning the working tree cannot function against a database provisioned purely from `supabase/migrations/`. This is the audit's only P1-architecture blocker-class finding (P0 was not warranted: it is a consistency/deployment risk, not an exploitable defect, and a production-deploy bundle exists).
2. **Epistemic signal softness**: consensus percentages and color-coded coverage badges are framed carefully, but several surfaces present vote counts with green/red visual emphasis that drifts toward "agreement = correctness." Individually minor; collectively worth one deliberate pass (6B).
3. **Engagement-flavored sorting exists in one place**: the debate browse surface offers "Most Active / Most Evidence / Most Participants" sorts. These are transparency features (user-chosen), not implied-feed ranking, but they sit closest to popularity mechanics and should be watched — see epistemic note in §11.
4. **Onboarding state is client-side only** (localStorage): checklist progress is lost across devices/browsers, and "first-time user" detection is unreliable. LIKELY product gap, P2.
5. **Performance smells concentrated in the homepage query fan-out** (~10+ parallel queries/RPCs on mount) and per-SaveButton status queries. Architectural, not confirmed runtime defects.

**Final verdict: PASS WITH GAPS — ready for Phase 6B planning.** No P0 findings. 6 P1, 12 P2, 9 P3 findings at audit time. *Post-QA update (see §20A): the working tree was committed (`0223c70`) after the main audit; interactive browser QA then confirmed that P1-ARCH-001, P1-UX-002, and P2-UX-003 are resolved in the current tree. Four P1 findings remain open (P1-EPI-001, P1-SEC-001, P1-ONB-001, P1-EPI-002). The verdict stands.* The product does not resemble Reddit/X/Discord/Quora; the philosophical guardrails held through five phases of implementation.

---

## 2. Current Product State

Implemented and audited surfaces:

| Area | State | Basis |
|---|---|---|
| Auth (email, Google, one-tap, reset) | Working; safe redirects enforced | CODE-VERIFIED + prior browser |
| Onboarding (discovery deck, sandbox, room guides, checklist) | Implemented; client-persisted | CODE-VERIFIED |
| Homepage (guest + logged-in dashboards) | Implemented; heavy query fan-out | CODE-VERIFIED |
| Discussions (overview, claims, evidence, questions, contributions) | Implemented | CODE-VERIFIED + prior browser |
| Debates (arguments, evidence, inquiries, side switch, resolution) | Implemented | CODE-VERIFIED + prior browser |
| Private debates (invite, access code, removal, gate) | Implemented; DB-enforced | CODE-VERIFIED |
| Saved (user_saves, SaveButton, /saved, Recently Saved) | Implemented; secure RPC path | CODE-VERIFIED |
| Recently Engaged | Implemented; dedup fixed via migration 004 | CODE-VERIFIED |
| Structured Inquiries | Implemented; scoped to claims | CODE-VERIFIED |
| Moderation (report → queue → resolve) | Implemented | CODE-VERIFIED |
| Search (full-text, weighted RPC) | Implemented | CODE-VERIFIED |
| Leaderboard | Implemented (see §11 epistemic concern) | CODE-VERIFIED |
| Reputation system | DB-authoritative; displayed on profiles | CODE-VERIFIED |
| Settings (account/privacy/safety/profile/moderation) | Implemented with guards | CODE-VERIFIED |
| Mobile navigation | Working; Saved missing (known gap) | CODE-VERIFIED |

Known production-state caveat: whether `202606260001–260005` are applied to the production database is **UNVERIFIED**. Repository presence ≠ applied. `phase5d_production_deploy.sql` exists as the production bundle.

---

## 3. Architecture and Route Map

### Route map (verified in working tree)

```
/                                Guest or logged-in homepage (client switch)
/login /register /forgot-password /reset-password     (auth) group
/auth/callback                   OAuth/code exchange (safe allowlisted redirect)
/discussions                     Feed (keyset, newest-first)
/discussions/create              Guarded by middleware
/discussions/[slug]              Overview: RoomSectionShell + State of Understanding + SaveButton
/discussions/[slug]/{claims,evidence,questions,contributions}
/debates                         Browse (sorts: newest/most_active/most_evidence/most_participants)
/debates/create                  Guarded by middleware
/debates/[slug]                  DebateRoom (overview/arguments/evidence/inquiries/contributions)
/inquiries/[id]                  Standalone inquiry detail
/saved                           Server-guarded saved page
/search                          Full-text search
/leaderboard                     Reputation leaderboard
/u/[username]                    Public profile
/settings                        Settings shell (middleware-guarded)
/settings/{account,privacy,safety,profile,moderation}
```

### Layering (verified)

UI components → feature hooks (TanStack Query) → feature services (Supabase client) → PostgREST/RPC → RLS + SECURITY DEFINER functions. The database boundary is real: private-room confidentiality does not depend on frontend filtering (verified for saves in the Phase 5D review; the same view/RLS machinery governs claims/evidence/messages/questions everywhere).

### Architectural strengths

- Consistent feature-module structure (`features/<domain>/{components,hooks,services,types}`).
- Views (`discussion_claims`, `discussion_evidence`, `discussion_messages`, `discussion_questions`) centralize visibility + anonymity redaction in one place; every read path uses them.
- `has_room_access()` / `has_room_write_access()` are the single authorization primitives; writes, views, and RPCs all route through them.
- Server components guard routes (`/saved`, settings); middleware guards create-routes + onboarding.

### Architectural smells (not defects)

- `DiscussionRoom`/`discussion-header.tsx` are dead code (zero imports) retaining a SaveButton — divergence hazard.
- Duplicate SaveButtons on debate page (`DebateHeaderV2` + `DebatePremise`).
- Homepage composition (`logged-in-homepage.tsx`, ~960 lines) mixes orchestration and presentational code for 10+ sections in one file.
- Dead/legacy components accumulate without a deletion pass.

---

## 4. What Works Well

1. **Epistemic model is real, not decorative.** Questions → Claims → Evidence → Inquiries are distinct entities with distinct UIs; extracting a claim from a contribution is an explicit, guided action. Discussion Questions and Structured Inquiries remain separate concepts everywhere (room questions list vs claim-scoped inquiry tabs) — principle 15 held.
2. **Discussion vs Debate are genuinely different experiences** — section naming ("Claims" vs "Arguments", "Discussion Questions" vs "Structured Inquiries"), side-based argumentation, mandatory rationale for side switch, resolution flow. Principle 16 held.
3. **Database-first privacy.** Private debate content is invisible at the SQL layer to non-members; removed participants lose access to everything, including previously saved items, without frontend heroics. Principle 13 held (CODE-VERIFIED).
4. **Save is a private retrieval utility.** No save counts, no social proof, no recommendations from saves, no belief inference. Principle 14 held.
5. **Security layering.** RLS everywhere; SECURITY DEFINER functions pin `search_path`; anon grants are deliberately revoked; safe-redirect helper protects both login and OAuth callback; the `save_target_secure` RPC closes direct-API save forgery.
6. **Anonymous identity redaction** is systematic (views null out identity for `identity_mode = 'anonymous'`), not per-component guesswork.
7. **Empty states are purposeful.** Nearly every surface has a crafted empty state with a next action ("Save discussions, debates, claims, and evidence to find them here quickly", "Start the conversation — share your perspective…"), consistently pointing to understanding-oriented actions rather than engagement.
8. **Guest journey is respectful.** Guests can read everything public; contribution prompts explain *why* to sign in without nagging; save buttons degrade to "Sign in to save".
9. **Optimistic save toggle with rollback** (`useToggleSave` onMutate/onError) is correctly implemented.
10. **Keyset pagination** on discussion feeds is implemented correctly (composite `created_at, id` cursor) — avoids the classic offset-drift bug.

---

## 5. P0 Findings

**None.** No genuine critical blocker was found. The closest candidate — the migrations/repo divergence (P1-ARCH-001) — was assessed and downgraded: a deploy bundle exists, the feature degrades safely if the RPC is missing (user-facing error, no data corruption, no security exposure), and it is a deployment-consistency problem rather than an exploitable or data-destroying defect.

---

## 6. P1 Findings

### P1-ARCH-001 — Phase 5D migrations 003/004/005 exist only in the deploy bundle, not in `supabase/migrations/`
- **Severity:** P1
- **Status:** RESOLVED (post-audit) — commit `0223c70` ("feat: complete Phase 5D save and bookmark") added `202606260003_create_save_target_secure_rpc.sql`, `202606260004_fix_recent_engagement_rpc.sql`, and `202606260005_save_target_room_type_integrity.sql` to `supabase/migrations/` (verified by directory listing during the §20A browser QA pass). Historical finding retained for the record; no longer a blocker.
- **Surface:** `supabase/phase5d_production_deploy.sql` (sections 3–5: `202606260003_create_save_target_secure_rpc.sql`, `202606260004_fix_recent_engagement_rpc.sql`, `202606260005_save_target_room_type_integrity.sql`); `supabase/migrations/` (absent); `src/features/saves/services/save-service.ts`.
- **Problem:** The frontend calls `supabase.rpc("save_target_secure", …)` (CODE-VERIFIED in `save-service.ts`). The defining migrations exist only inside the production deploy bundle, not the canonical migration history. AGENTS.md states migrations are "the database change history"; `supabase/migrations` currently ends at `202606260002`.
- **Evidence:** `list_files(supabase/migrations)` ends at `202606260002_create_recent_engagement_rpc.sql`; `phase5d_production_deploy.sql` lines 163–417 define `save_target_secure` (twice — 003 then 005 replacing it) and the fixed engagement RPC.
- **User impact:** None immediately (deploy bundle covers production). But a fresh environment provisioned from `supabase/migrations/` yields a broken Save feature (`save_target_secure` undefined → every save fails with an RPC error).
- **Product impact:** Breaks reproducibility/recovery guarantees (AGENTS.md portability requirement).
- **Epistemic impact:** None.
- **Recommendation:** Add `202606260003`, `202606260004`, `202606260005` as proper files under `supabase/migrations/` (final-state versions: `save_target_secure` with room_type integrity, fixed engagement RPC). Do not edit applied migrations — these are new files. Reconcile `deploy_pending_migrations.sql` accordingly.
- **Recommended Phase:** 6B (first item).
- **Implementation Priority:** Now.

### P1-EPI-001 — Debate browse "Most Active / Most Evidence / Most Participants" sorts flirt with engagement ranking
- **Severity:** P1 (epistemic guardrail, low user harm today)
- **Status:** CONFIRMED
- **Surface:** `src/features/debates/services/debate-service.ts` (~lines 264–280), `src/app/debates/page.tsx` → `browse-debates.tsx`.
- **Problem:** User-selectable sorts order debates by `total_claims`, evidence count, and participant count. These are engagement/activity quantities. They are *chosen* by the user (not an implied default ranking), which keeps them on the right side of principle 9 — but the default sort and label framing determine whether Discora reads as "find the busy debate" or "find the substantive debate."
- **Evidence:** `.order("total_claims", { ascending: false }).order("last_activity_at", …)` for `most_active`.
- **User impact:** Minor — users may gravitate to high-volume rooms irrespective of reasoning quality.
- **Product impact:** The first popularity-adjacent mechanic in the product; a precedent that could spread (e.g., "trending claims").
- **Epistemic impact:** Activity ≠ epistemic value (principles 2, 9, 12).
- **Recommendation:** Keep user-chosen sorts (transparency, not manipulation) but (a) ensure the **default** sort is recency or an epistemic-neutral order, never activity; (b) rename toward descriptive rather than valorizing labels ("Most claims", "Most evidence") — no crowns/flames/"hot"; (c) add a note in ADRs that these sorts must never become default or implied. Verify current default sort before changing anything (see P2-UX-012).
- **Recommended Phase:** 6B (small) with ADR.
- **Implementation Priority:** Later.

### P1-SEC-001 — `get_private_room_gate` anon EXECUTE permits private-slug enumeration (PRE-EXISTING / DEFERRED)
- **Severity:** P1 (privacy leak, bounded)
- **Status:** CONFIRMED (code), pre-existing
- **Surface:** `supabase/migrations/202606230015_create_room_invitation_rpc.sql` (lines 108–128); called from `src/app/debates/[slug]/page.tsx` line 59.
- **Problem:** `grant execute on function public.get_private_room_gate(text) to anon, authenticated` lets anyone unauthenticated confirm that a slug corresponds to a private debate and retrieve its room UUID. An attacker with a slug list (slugs are sequential-ish, e.g. `my-title`, `my-title-2`) can enumerate private debate existence. Content (title/premise/participants) is not returned — the leak is existence + ID.
- **Evidence:** quoted grant in migration; gate function returns `id, slug, visibility, room_type` for any matching private debate slug regardless of caller identity.
- **User impact:** Privacy-conscious users may not want the *existence* of a private debate discoverable.
- **Product impact:** Weakens principle 13 at the margin.
- **Epistemic impact:** None.
- **Recommendation (deferred per prior review instruction, now actionable):** Either require authentication (gate page is only meaningful post-login anyway) or require a capability token. Register as security backlog with an owner.
- **Recommended Phase:** 6B.
- **Implementation Priority:** Now (cheap fix).

### P1-ONB-001 — Onboarding progress is 100% client-side; "first-time user" detection is unreliable
- **Severity:** P1 (product integrity of the onboarding journey)
- **Status:** CONFIRMED
- **Surface:** `src/features/onboarding/hooks/use-onboarding.ts` (localStorage `discora_onboarding_v1`); `src/features/homepage/components/logged-in-homepage.tsx` (`FirstUserBanner` rendered for **all** logged-in users); `src/services/supabase/middleware.ts` (the only server-side gate: no `profiles` row → `/settings/profile`).
- **Problem:** Checklist completion, dismissed guides, and sandbox completion live in localStorage. Consequences: (a) checklist reappears for all users across devices/clear-storage until manually dismissed; (b) "isFirstTime" semantics are per-browser, so returning users on a new device see first-time onboarding again; (c) the server-side middleware can only detect "never created profile", not "never onboarded".
- **Evidence:** quoted hook + homepage wiring from subagent inspection; middleware profile check quoted in §9 of this report.
- **User impact:** Repeated orientation content for returning users; lost progress.
- **Product impact:** The onboarding investment (discovery deck, epistemic sandbox) under-delivers because completion isn't durable.
- **Epistemic impact:** Orientation quality is the main lever for principle 3 ("clarity over activity") for new users; flaky onboarding undermines it.
- **Recommendation:** Persist minimal onboarding flags server-side (e.g., a `preferences`/`profiles` JSON field or `onboarding_state` table via RPC) while keeping localStorage as cache. Keep it a *progress* record, never a gamified streak.
- **Recommended Phase:** 6B/6C.
- **Implementation Priority:** Later (6B design, 6C implement).

### P1-UX-002 — Claim/evidence SavedCards link to `#` (dead "View")
- **Severity:** P1 (broken core loop of the Save journey)
- **Status:** RESOLVED (post-audit, CODE-VERIFIED) — `saved-card.tsx` now builds section deep links (`/discussions/[slug]/claims|evidence`, `/debates/[slug]/arguments|evidence`) and `listSavedTargets` now sets `slug` + true `roomType` on claim/evidence items (re-read during §20A). The *authenticated* save→view round-trip remains UNVERIFIED in browser (no QA credentials); the link-construction defect itself is gone.
- **Problem:** The Save journey's return step — "saved → filter → return to original content" — is broken for claims and evidence: the View button navigates to `#`. For debate claims the card also mislabels the room type.
- **Evidence:** quoted resolver code (no slug column selected for claims/evidence; `roomType: "discussion"` literal).
- **User impact:** User saves evidence, opens /saved, cannot get back to it.
- **Product impact:** The retrieval promise of Phase 5D fails for half its target types.
- **Epistemic impact:** Weakens evidence retrieval — evidence over opinions requires that evidence be findable.
- **Recommendation:** Select `room_id` for claims/evidence, resolve room slug/type in the batched room query (already fetched), and deep-link (`/discussions/[slug]/claims?highlight=<id>` etc. — the highlight plumbing already exists on those pages).
- **Recommended Phase:** 6B.
- **Implementation Priority:** Now.

### P1-EPI-002 — Saved filter-tab counts and "Recently Saved" shortfall are silent correctness bugs in a trust surface
- **Severity:** P1 (low), bundled with P1-UX-002 surface
- **Status:** CONFIRMED
- **Surface:** `saved-page.tsx` (counts computed from current 20-item page only); `use-saves.ts` `useRecentlySaved` (fetches 5 raw saves, filters, may return <5 with no refill).
- **Problem:** Filter counts understate totals on paginated lists; Recently Saved can show fewer items than available without explanation. In a product whose currency is trustworthiness, small silent inaccuracies are disproportionately costly.
- **Recommendation:** Compute counts from a lightweight `count` query or fetch counts per type; refill Recently Saved past the raw limit until 5 resolved items or exhaustion.
- **Recommended Phase:** 6B.
- **Implementation Priority:** Later.

---

## 7. P2 Findings

### P2-ARCH-001 — Homepage query fan-out: 10+ parallel queries/RPCs on mount
- **Status:** LIKELY (architectural; no runtime profiling performed)
- **Surface:** `logged-in-homepage.tsx` → hooks in `use-homepage.ts` (`useMyOpenInquiries`, `useInquiriesOnMyClaims`, `useNewEvidenceOnVotedClaims`, `useMyInquiryResponses`, `useMyDebatesAttention`, `useMyTopicEvidence`, `useMyUnderstandingEvolved`, `useRecentDiscussions`, `useRecentDebates`, `useOnboardingStatus`) + `useRecentlySaved` + `useRecentlyEngaged` + `useCurrentProfile` + role check.
- **Problem:** Many are multi-CTE SECURITY DEFINER RPCs with subselect-per-row (e.g., `get_my_debates_attention` computes claim counts and last-activity via correlated subqueries). Individually fine; together, a homepage cold-load executes a dozen+ DB round-trips with unbounded intermediate scans (engagement RPC scans full history — see P2-PERF-002).
- **Recommendation:** Consolidate into one `get_homepage_dashboard` RPC returning a single JSON payload; keep sections lazy (`enabled`/`IntersectionObserver`) for below-fold sections. Preserve epistemic ordering; do not introduce "recommended for you".
- **Phase:** 6C. **Priority:** Later.

### P2-PERF-002 — `get_my_recent_engagement` and per-SaveButton status queries
- **Status:** LIKELY (confirmed code pattern, unprofiled runtime)
- **Surface:** `202606260002/004` (full-history CTE scan; `claims.created_by` has no index — verified by index search); `save-button.tsx`/`use-saves.ts` (one `isTargetSaved` point query per mounted button, ~30–40 per busy room page; 30s staleTime mitigates).
- **Recommendation:** Add `claims (created_by)` index; batch saved-status per room (one `user_saves .in(target_id)` query per page, hydrated into context); clamp `p_limit` (`LEAST(p_limit, 50)`).
- **Phase:** 6B/6C. **Priority:** Later.

### P2-UX-003 — Duplicate SaveButton on debate page
- **Status:** RESOLVED (post-audit, BROWSER-VERIFIED in §20A) — `debate-premise.tsx` no longer renders a SaveButton; live QA counted exactly **1** Save control on a real debate page.
- **Surface:** `debate-room.tsx`, `debate-header-v2.tsx`, `debate-premise.tsx`.
- **Recommendation:** None further (historical record retained). **Phase:** —. **Priority:** —.

### P2-ARCH-004 — Dead code carrying live-looking features (`DiscussionRoom`, `discussion-header.tsx`)
- **Status:** CONFIRMED (zero imports found)
- **Problem:** ~590-line component with its own header/SaveButton/reporting that never renders. Future contributors may "fix" the wrong file (this exact failure mode already occurred once in Phase 5D).
- **Recommendation:** Delete or explicitly mark deprecated in 6B. **Priority:** Now (cheap).

### P2-EPI-005 — Vote-count visual emphasis implies correctness gradient
- **Status:** CONFIRMED
- **Surface:** `claim-list.tsx` ("{n}% Agree" + green/rose bar), `evidence-section.tsx` ("{n}% agree" chip), `map-tab.tsx` (green/red split bar), `state-of-understanding.tsx` (color-coded "% Evidence Coverage", "{n} Supported/Contested").
- **Problem:** Framing microcopy is careful ("of voters agree", not "proven"), and consensus ≠ truth is nowhere stated as equality — but the *visual language* (green = agree) trains agreement-as-goodness. Principle 7 says consensus does not equal truth; the UI should not accidentally whisper otherwise.
- **Recommendation:** One deliberate 6B pass: neutral hue options (blue/slate) for agreement visualization, or keep color but add a persistent explainer in the State of Understanding ("Vote distribution — a measure of where readers stand, not of what is true"). Do not remove vote data — distribution is legitimate epistemic information.
- **Phase:** 6B. **Priority:** Later.

### P2-EPI-006 — Reputation presentation risks reading as authority
- **Status:** PARTIALLY RESOLVED (post-audit) — the `/leaderboard` route was removed from the current tree (empty `src/app/leaderboard/` directory, zero `leaderboard` references in `src/`, live URL returns 404, and no navigation links to it). Profile reputation display remains (see new P3-UX-008 for the dead-URL cleanup). The profile-reputation half of this finding stays CONFIRMED/open; ADR recommendation unchanged.
- **Surface:** `profile-reputation-section.tsx`, `/leaderboard` (removed); DB events include `DEBATE_WON +25 / DEBATE_LOST −5 / CLAIM_AGREED +2` (migration 202606100004).
- **Problem:** A single scalar score + ranked list is the highest gamification-risk surface in the product. It is currently restrained (no site-wide score badges on content, no levels/badges verified), but "leaderboard" as a word itself frames users as competitors.
- **Recommendation:** (a) Never surface reputation on content cards or next to usernames in rooms (verify this stays true — CODE-VERIFIED absent today; keep it that way); (b) rename/rework leaderboard toward "Contribution overview" or per-dimension breakdowns (claims asserted, evidence added, inquiries resolved) rather than a ranked score; (c) ADR: reputation must never gate content visibility. The DB `DEBATE_WON/LOST` events are internal scoring inputs — ensure they are never rendered as "wins".
- **Phase:** 6B ADR, 6C rework. **Priority:** Later.

### P2-A11Y-007 — Touch targets below guidance; icon-only controls lack persistent labels
- **Status:** CONFIRMED
- **Surface:** SaveButton (~28px), evidence vote buttons (~24px), unsave X buttons, various icon-only action rows.
- **Recommendation:** Minimum 44×44 hit areas via padding/pseudo-element; keep visual size unchanged. **Phase:** 6B. **Priority:** Later.

### P2-A11Y-008 — Dialog accessibility unverified for focus trap; confirm-dialog/toast semantics need verification
- **Status:** LIKELY/UNVERIFIED (code was inspected by subagent; no keyboard walk-through performed)
- **Surface:** `confirm-dialog.tsx`, `report-dialog.tsx`, `extract-claim-modal.tsx`, toast provider.
- **Recommendation:** Audit + standardize: focus trap on open, focus restore on close, Escape close, `role="dialog"` + `aria-modal`, `aria-live="polite"` toasts. **Phase:** 6B. **Priority:** Later.

### P2-UX-009 — No route-level `loading.tsx`; cold navigations blank-then-pop
- **Status:** CONFIRMED (no `loading.tsx` anywhere in `src/app/**`)
- **Problem:** Server components with awaited Supabase queries block rendering; client skeletons only help after hydration. First navigation to a room can feel stalled.
- **Recommendation:** Add `loading.tsx` skeletons for room/section routes matching existing card skeletons. **Phase:** 6B. **Priority:** Later.

### P2-UX-010 — `/saved` cursor lacks id tie-breaker; filter counts per-page
- **Status:** CONFIRMED (consolidated from P1-EPI-002 where relevant; cursor issue stands alone)
- **Recommendation:** Composite cursor `(created_at, id)`. **Phase:** 6B. **Priority:** Later.

### P2-SEC-011 — Archived-room owner write semantics inconsistent
- **Status:** CONFIRMED (edge)
- **Surface:** `has_room_access` owner branch lacks `status <> 'archived'` (public branch has it); `has_room_write_access` does guard archived. Saves in own archived rooms possible via `save_target_secure`? — **No**: the RPC adds `r.status <> 'archived'` explicitly (verified in deploy bundle lines 373–375), so the practical surface is now closed for saves; residual inconsistency is in the helper function itself.
- **Recommendation:** Align `has_room_access` owner branch or document the intentional asymmetry. **Phase:** 6B. **Priority:** Later.

### P2-UX-012 — Homepage "PersonalizedUpdates" mixes understanding sections under an engagement-adjacent umbrella
- **Status:** LIKELY
- **Surface:** `logged-in-homepage.tsx` — "Your Inquiries & Understanding" groups InquiriesOnMyClaims, NewEvidenceOnVotedClaims, MyInquiryResponses, DebatesNeedingAttention, NewEvidenceTopics, UnderstandingEvolved.
- **Problem:** Section order is fixed (inquiries → evidence → responses → debates → topics → understanding). "Understanding Evolved" — the most philosophy-distinctive element — sits last and only appears when non-empty. Ordering follows implementation history, not epistemic priority.
- **Recommendation:** Consider promoting "Understanding Evolved" and "New Evidence on Claims You Evaluated" (both are mind-change/evidence signals) above inquiry bookkeeping. Do NOT order by engagement volume. **Phase:** 6B. **Priority:** Later.

---

## 8. P3 Findings

1. **P3-VIS-001 — Icon semantics reuse:** `Link2` icon for both claims and evidence in SavedCards; `FileText` for both Arguments and Evidence nav. Cheap distinction win. (CONFIRMED)
2. **P3-VIS-002 — Density variance:** Debate header is dense (badges + stance + title + two comparison cards) vs calm discussion overview; consider one consistent rhythm. (CONFIRMED)
3. **P3-MOT-001 — Motion inventory gaps:** present — card hover lift/translate, skeleton pulse, spinners, `animate-in fade-in` on section switches, toast transitions; missing — modal open/close transitions (dialogs pop), filter-change transitions, save-toggle micro-transition (color-only), mobile nav active indicator. No celebratory/dopamine motion exists (good). Add subtle modal fade/scale (respecting `prefers-reduced-motion`). (CONFIRMED inventory, LIKELY gaps)
4. **P3-MOT-002 — No `prefers-reduced-motion` guard** observed on `animate-in`/`hover:-translate` usage. Add global CSS guard. (LIKELY)
5. **P3-A11Y-003 — `/saved` filter tabs lack `aria-pressed`/tablist semantics.** (CONFIRMED)
6. **P3-A11Y-004 — Save state changes have no `aria-live` announcement** (aria-pressed conveys state on focus only). (CONFIRMED)
7. **P3-UX-005 — Error messages occasionally leak raw Supabase text** in room evidence section (`Failed to load evidence bank: {message}`). Map through `mapSupabaseError` consistently. (CONFIRMED pattern)
8. **P3-PERF-006 — Lint warnings (6) in `scripts/phase5d-*.mjs`** — unused vars; harmless, tidy when scripts are next touched. (CONFIRMED)
9. **P3-DOC-007 — Root-level *.md audit reports from prior phases clutter the repo root** (20+ files); consolidate into `docs/`. (CONFIRMED)
10. **P3-UX-008 — `/leaderboard` is a dead route returning 404.** Discovered in browser QA (§20A): the page file was removed (empty `src/app/leaderboard/` directory) but no redirect/notFound handling exists beyond the default 404, and AGENTS.md's route map still lists it. No in-app links point to it, so user impact is nil; cleanup is documentation + directory removal. (CONFIRMED, BROWSER-VERIFIED 404)

---

## 9. Security Audit

| Area | Status | Notes |
|---|---|---|
| RLS on content tables | CONFIRMED OK | Select/insert/delete scoped; messages raw table SELECT revoked entirely; views are the read path |
| Views (`security_invoker=false`) | CONFIRMED OK | All filter via `has_room_access` + anonymity redaction; latest definitions verified (202606250001, 202606210001) |
| Private-room authorization | CONFIRMED OK | Owner/active-participant model; removed participants denied everywhere incl. saved resolution |
| `save_target_secure` RPC | CONFIRMED OK (code) | SECURITY DEFINER, pinned search_path, revoked from anon, validates type/existence/retraction/room access/room_type; closes direct-API save forgery from Phase 5D review |
| `get_my_recent_engagement` | CONFIRMED OK (code) | SECURITY DEFINER, pinned search_path, anon revoked, auth.uid-scoped in all CTEs, public+non-archived rooms only, dedup now row-consistent (migration 004) |
| Other SECURITY DEFINER functions | CONFIRMED OK (spot) | Inquiry/invitation/debate RPCs: revoke-then-grant authenticated, auth.uid checks, search_path pinned |
| Middleware | CONFIRMED OK | Protects `/settings`, `/discussions/create`, `/debates/create`, `/protected`; profile-onboarding redirect for authenticated users without profiles; skipped paths correctly enumerated |
| Safe redirects | CONFIRMED OK | `getSafeRedirectUrl` used in LoginForm + OAuth callback; rejects absolute/protocol-relative/control-char targets |
| Session handling | CONFIRMED OK | `getUser()` (server-verified) everywhere inspected; no `getSession()`-only trust found in audited paths |
| Anonymous access | CONFIRMED OK | user_saves: no anon grants/policies; engagement RPC: anon revoked |
| `get_private_room_gate` anon grant | CONFIRMED ISSUE (pre-existing) | P1-SEC-001 |
| Polymorphic save integrity | CONFIRMED FIXED (code) | RPC path; note: migrations 003/005 must be added to repo history (P1-ARCH-001) |
| Production DB state | UNVERIFIED | Cannot verify from repo whether Phase 5D bundle applied to production |
| Rate limiting | PARTIAL | Present on inquiries (5/hr, 50/room, 20/claim), access-code attempts (5), join-by-code; none observed on `submit_moderation_flag` — see below |
| Moderation RPCs | UNVERIFIED (this audit) | The dedicated moderation subagent failed; report-dialog verified to route through a flag mutation; `submit_moderation_flag`/`resolve_moderation_flag` grants and reporter-visibility were **not independently re-verified** this pass — carried from prior reviews (26_RLS_SECURITY_AUDIT.md) as previously-fixed areas |

---

## 10. Information Architecture

Strengths:
- Two top-level content taxonomies (Discussions, Debates) with mirrored section structures; consistent slugs and section routes (`/claims` vs `/arguments` distinction is deliberate and good).
- Saved, Search, Settings, Profile occupy predictable places; desktop sidebar groups Settings/Moderation sensibly.

Weaknesses:
- **Mobile bottom nav omits Saved** (CONFIRMED; 7-item grid). Desktop users get Saved, mobile users don't — an IA inconsistency in a core retrieval feature. Recommended fix (not applied): add Saved for authenticated users, `grid-cols-8`.
- **Leaderboard's place in the IA** is philosophical, not structural: it sits at the same level as Search — a peer navigation target — which over-weights reputation as a product pillar (see P2-EPI-006).
- `/inquiries/[id]` is reachable standalone but inquiries are conceptually claim-scoped; back-navigation context is thin (LIKELY; not click-tested).
- Dead `DiscussionRoom` IA paths confuse maintainers, not users (P2-ARCH-004).

---

## 11. Epistemic Integrity

### Verdict: philosophy substantially intact; three watch areas.

**Held (verified):**
- No winner meter, no trending, no follower mechanics, no save counts, no engagement metrics framed as quality anywhere in audited surfaces.
- Vote framing is consistently "X% of voters agree" — distribution of readers, not proof (principle 7 respected in *copy*).
- Debate resolution is owner/participant-driven with summary; "winner" is a user decision record, not a truth verdict (resolution microcopy reviewed — framed as outcome of the debate, not verdict on reality).
- "State of Understanding" is neutral-by-design: it reports coverage, distribution, open questions; it does not declare truth.
- "Understanding Evolved" framing (your position vs current distribution) supports principle 6 — changing your mind is surfaced as a feature.
- Ordering defaults observed are recency-based (feeds, search relevance); no implied popularity feed.

**Watch areas:**
1. **Color-as-verdict drift** (P2-EPI-005): green/red agreement bars across 4 surfaces.
2. **Engagement sorts in debate browse** (P1-EPI-001): user-chosen, but the labels valorize volume.
3. **Reputation/leaderboard** (P2-EPI-006): scalar score + ranked list is the product's most gamification-adjacent construct; `DEBATE_WON +25` in the DB is fine as internal signal but must never render as "wins".

**Recommendation:** one consolidated "epistemic language pass" in 6B (microcopy + hue audit) rather than piecemeal changes. Every proposed change must be checked against: does it inform understanding (allowed) or rank/score people-and-content for its own sake (not allowed)?

---

## 12. Cross-Surface User Journeys

| Journey | Status | Notes |
|---|---|---|
| Guest: landing → discovery → discussion → claims → evidence → questions → return | **CONFIRMED** (code + prior browser) | Read access is fully public; section nav coherent; guest prompts non-intrusive |
| Authenticated: login → profile → homepage → discussion → contribution → claim → evidence → inquiry → return | **CONFIRMED** (code + prior browser) | Middleware profile gate; extraction and inquiry flows wired |
| Debate: discover → premise → side → argument → evidence → inquiry → side change | **CONFIRMED** (code; side change verified in prior phases) | Mandatory rationale preserved |
| Private debate: invite/access → gate → join → management → removal → re-entry denial | **CONFIRMED** (code: RPC state guards; prior agent browser) | Removed user loses access incl. saved items (CODE-VERIFIED at DB layer) |
| Save: discover → save → saved → filter → return | **PARTIALLY VERIFIED** (guest half BROWSER-VERIFIED in §20A: Save → login with `redirectedFrom` preserved; link fix CODE-VERIFIED post-audit) | Authenticated save→filter→view round-trip UNVERIFIED (no QA credentials); link-construction defect resolved |
| Search: query → results → room → return | **CONFIRMED** (code) | Weighted relevance; no save buttons/social metrics in results (verified) |
| Feedback/reporting: report → confirmation | **LIKELY** (dialog + mutation verified; reporter status visibility UNVERIFIED) | Moderator queue exists; reporter-side status surface not found — potential transparency gap (P3-level, not raised) |
| Onboarding: first visit → deck → sandbox → room guide → room usage | **LIKELY** (components verified; durability gap P1-ONB-001) | Sandbox concept exists (EpistemicSandbox in DiscoveryDeckModal) |
| Homepage dashboard comprehension | **LIKELY** | Content strong; fan-out and ordering (P2-ARCH-001, P2-UX-012) need attention |

No journey was marked BLOCKED.

---

## 13. Mobile / Responsive

- **CONFIRMED (code):** fixed bottom nav, 7 items, 64px height, `pb-16` shell clearance, horizontal-scroll section navs, responsive grids throughout, `sm:/md:/lg:` breakpoints used consistently.
- **GAP:** Saved absent from mobile nav (fix recommendation in §10; do not redesign the bar).
- **UNVERIFIED:** actual rendering at 375/390/768/1024/1440 (no browser this audit). Density risk at 375px: debate header (badges+stance+title+two cards) likely requires scroll — acceptable, but verify.

---

## 14. Accessibility

Verified in code: semantic landmarks (`nav` with aria-label, `aria-labelledby` section headings, `aria-current` on nav links, `aria-expanded` on premise toggle, `aria-pressed`/`aria-label` on SaveButton, `sr-only` h1 on search, `aria-busy` homepage skeleton, alt-free decorative icons via `aria-hidden`).

Gaps: touch targets (P2-A11Y-007), dialog focus management UNVERIFIED (P2-A11Y-008), filter-tab semantics (P3-A11Y-003), aria-live for save/toast (P3-A11Y-004), no `prefers-reduced-motion` guard (P3-MOT-002), contrast not measured (UNVERIFIED — Tailwind tokens suggest adequate, not measured).

---

## 15. Performance

Confirmed (code):
- Homepage fan-out: ~10+ parallel queries (P2-ARCH-001).
- Engagement RPC full-history scan; missing `claims (created_by)` index (P2-PERF-002).
- Per-SaveButton status query pattern (P2-PERF-002).
- Correct keyset pagination on feeds; genuine server-side cursor on /saved; batched (non-N+1) target resolution.

Likely/theoretical (not labeled defects): RPC consolidation, saved-status batching, section lazy-loading. Middleware adds one `profiles` query per authenticated navigation — acceptable at current scale; monitor.

No runtime profiling was performed; no finding above is claimed as a measured runtime defect.

---

## 16. Visual / Product Feel

Overall: **calm, deliberate, trustworthy.** Consistent card language (`rounded-xl/2xl`, subtle borders, `bg-card/40` translucency), restrained color (primary + semantic green/rose/amber), good typographic scale (10–24px range with bold weights for hierarchy).

Where it feels less than distinctive:
- Debate header density vs discussion calm (P3-VIS-002).
- Heavy use of translucent stacked cards in some sections approaches visual noise (State of Understanding + section nav + guide card stack on room overview).
- Generic empty-state illustrations (icon-in-dashed-box pattern everywhere) — consistent but forgettable; an opportunity for Discora's own visual voice.
- Not overly social, not gamified, not noisy — the common failure modes are avoided.

---

## 17. Animation / Motion

Inventory (from grep of `animate-*`, `transition*`, `duration-*`, `translate`, `pulse`, `spin` across `src/`):
- Present: card hover lift + shadow, skeleton pulse, loader spin, section/content `animate-in fade-in`, toast entrance, side-switch and dialog state feedback, report dialog transitions.
- Missing: dialog open/close transitions, filter/segment transitions, save-toggle motion (color-only), mobile nav active-state motion.
- Absent (correctly): confetti/celebration, count-up tickers, attention loops, parallax, autoplaying anything.

Assessment: motion currently communicates state and relationship where present; the gaps (P3-MOT-001/002) are polish, not defects. Recommendation: standardize a minimal motion kit (fade+4px scale for dialogs, 150–200ms, `motion-reduce` variants) in 6B. **Do not add** engagement-motion.

---

## 18. Smart Placement Opportunities

1. State of Understanding on room overview is correctly placed as the first reasoning surface after the premise — keep.
2. SaveButton placement is correct on rooms/claims/evidence; remove the duplicate (P2-UX-003).
3. "Understanding Evolved" deserves higher homepage placement (P2-UX-012).
4. Room guide (`RoomGuideCard`) appears on room pages and shells — correct contextual placement; verify it does not render twice where both shell and inner component mount guides (LIKELY single render; UNVERIFIED in browser).
5. Guest prompts appear exactly at contribution points, not as interstitials — correct.
6. /saved empty state cross-links to Browse Discussions/Debates — correct placement of discovery affordance.

---

## 19. Smart Ordering Opportunities

| Surface | Current ordering | Assessment |
|---|---|---|
| Discussion feed | Newest-first keyset | Correct default; neutral |
| Debate browse | User-selectable incl. activity sorts | Watch (P1-EPI-001); default must stay recency |
| Claims in room | Chronological within side/question scope | Acceptable; consensus ordering would violate neutrality — do not add |
| Evidence | Chronological with direction filters | Correct |
| Search | Weighted relevance (type-weighted ts_rank) then recency | Epistemically sound; type weights (room 2.0 > claim 1.5 > …) privilege rooms, reasonable |
| Saved | Save-time desc | Correct for retrieval |
| Homepage sections | Implementation-history order | Rebalance epistemically (P2-UX-012) |
| Recently Engaged | Last-engagement desc | Correct |
| Leaderboard | Score desc | See P2-EPI-006 |

No surface uses popularity as an *implied* default. Keep it that way; encode "recency or relevance only, unless user chooses otherwise" as an ADR.

---

## 20. Browser QA Matrix

**Full interactive browser QA: NOT PERFORMED (no browser tool available in this environment).** Do not treat the matrix below as test results.

| Check | Result |
|---|---|
| One dev server / correct port | CONFIRMED via HTTP (localhost:3000 responds; homepage 200 in ~0.43s) |
| Server responds on key routes | PARTIAL: `/` 200, `/saved` 307→login (correct guard). Other routes UNVERIFIED |
| CSS loaded / hydration | UNVERIFIED (static validation and prior-phase QA suggest healthy; unproven this audit) |
| 375/390/768/1024/1440 rendering | UNVERIFIED |
| Console/network errors | UNVERIFIED |
| Duplicate nav / stuck "Checking session" | UNVERIFIED (code shows single MobileNav mount and no blocking session gate; prior QA reported none) |

No fabricated results above.

---

## 20A. Interactive Browser QA Supplement

**Added post-audit.** The historical statement in §20 remains true for the main audit window: full interactive browser QA was **NOT PERFORMED** at that time. This supplement records the independent interactive browser validation performed afterward, per the Phase 6A supplement task. It does not overwrite §20.

### Tooling actually used
- **Playwright 1.63.0** (already installed in the project; no new framework installed) driving **Chromium 153.0.8010.12**, headless, via a QA script executed from the system temp directory with `NODE_PATH` pointed at the repo's existing `node_modules`. **No repository files were created, modified, or deleted by the QA harness.** Native browser tooling was checked first and unavailable; Playwright CLI was used per the priority order.
- Repo state during QA: commit `0223c70` ("feat: complete Phase 5D save and bookmark") — the tree was committed between the main audit and this QA pass, which is why several audit findings show as resolved.

### Preflight result — PASS
| Check | Result |
|---|---|
| One intended dev server on port 3000 | PASS (HTTP 200 on `/`) |
| CSS loaded | PASS (1 stylesheet, Inter font applied) |
| Hydration / JS working | PASS (React root interactive probe true; client-side guest-save redirect worked, which requires hydration) |
| Real Discora shell rendered | PASS (1 sidebar, 1 header, 1 mobile nav; title "Discora") |
| Duplicate navigation | PASS (none) |
| Stuck "Checking session" | PASS (not present) |
| Console errors | see below |

### Route/flow matrix (guest session; no QA credentials existed, so authenticated flows were not fabricated)
| Route/flow | Result | Evidence |
|---|---|---|
| `/` | PASS | 200; shell renders; interactive |
| `/discussions` | PASS | 200; feed renders |
| `/debates` | PASS | 200; feed renders |
| `/search` | PASS | 200; input + results UI render |
| `/saved` (guest) | PASS | redirects to `/login?redirectedFrom=/saved` — guard works |
| `/leaderboard` | **NEW DEFECT (P3-UX-008)** | HTTP 404; page removed from tree; no links point to it (dead route) |
| `/discussions/testtest` (real public discussion) | PASS | State of Understanding present; all 4 sections present (claims/evidence/questions/contributions); 9 content cards |
| Guest Save on discussion | PASS | Click "Sign in to save" → `/login?redirectedFrom=%2Fdiscussions%2Ftesttest` — **redirect target preserved** (P2-class 5D carry-over item now BROWSER-VERIFIED fixed) |
| `/debates/ai-is-superior-to-humans` (real public debate) | PASS | Premise present; arguments/evidence/inquiries/contributions sections present; exactly **1** SaveButton ("Sign in to save") — duplicate-SaveButton defect confirmed fixed in live UI |
| Private content leakage (guest) | PASS | No private content observed on any guest route; debate page rendered only public debate data |
| Epistemic signals on rendered pages | PASS (observed surfaces) | No "Most Active" sort labels rendered by default on the debate page visited; no winner/truth framing observed on the audited real debate (resolution not present on this debate); no popularity language observed |
| Authenticated: save 4 target types → /saved → filters → View | UNVERIFIED | No QA credentials/session available; not fabricated |
| Onboarding (deck, sandbox, checklist) | UNVERIFIED | Requires authenticated/first-time state |
| Private debate gate/join/removal | UNVERIFIED | No real private debate available; fabrication prohibited |

### Viewport matrix (horizontal overflow in px; 0 = none; measured on `/`, discussion, debate)
| Viewport | `/` | Discussion | Debate | Mobile nav visible |
|---|---|---|---|---|
| 375 | 0 | 0 | 0 | yes |
| 390 | 0 | 0 | 0 | yes |
| 768 | 0 | 0 | 0 | no (desktop layout) |
| 1024 | 0 | 0 | 0 | no |
| 1440 | 0 | 0 | 0 | no |

No horizontal overflow at any viewport on any tested page. Mobile nav correctly hidden ≥768px; desktop sidebar present.

### Console / network findings
- **1 error total across all pages:** `GET /leaderboard → 404` (matches P3-UX-008; environment-accurate, not a hydration/asset failure).
- No React errors, no hydration errors, no uncaught exceptions, no unexpected 4xx/5xx on `/`, `/discussions`, `/debates`, `/search`, `/saved` redirect, or room pages.

### Accessibility observations (quick pass; NOT a WCAG audit)
- **Tab order (12 stops from top of homepage):** Home → Discussions → Search → Debates → Profile → "How Discora Works" → Feedback → Open search → Login → Register → intro text → "Browse Discussions" — logical, matches visual order.
- **Focus visibility:** PASS (focused element has visible focus styling).
- SaveButton semantics confirmed live: guest variant exposes `aria-label="Sign in to save"` (found via a11y selector, not visual text).
- Not tested: Escape/modal focus trap (no modal opened in guest flow), screen reader behavior, contrast. See P2-A11Y-008.

### Confirmed defects / passes summary
- **Confirmed defect:** P3-UX-008 (dead `/leaderboard` 404 route).
- **Confirmed fixes (live-verified):** guest save redirect preservation; single SaveButton on debate page.
- **Confirmed passes:** preflight suite, 6/7 guest routes, guest-save flow, no-overflow at 5 viewports, no console/hydration errors (aside from the 404), no private-content leakage, sensible tab order.
- **Blocked/UNVERIFIED:** all authenticated flows (saved round-trip, onboarding persistence, recently saved/engaged), private-debate journeys, modal keyboard interactions, deep responsive inspection of dense debate header and State of Understanding (pages rendered without overflow at all widths, but fine-grained visual review of density requires screenshots beyond this pass).

### Impact on existing findings
- P1-ARCH-001 → RESOLVED (migrations 003/4/5 now in `supabase/migrations/`, verified via directory listing).
- P1-UX-002 → RESOLVED at code level (deep links + true roomType verified by re-reading `saved-card.tsx`/`save-service.ts`); authenticated round-trip remains UNVERIFIED.
- P2-UX-003 → RESOLVED (BROWSER-VERIFIED single Save button).
- P2-EPI-006 → PARTIALLY RESOLVED (`/leaderboard` removed from tree).
- The Phase 6B recommendation items 1–4 in §25 are now done or moot; remaining §25 items stand.

---

## 21. Static Validation

- `npx tsc --noEmit` → **exit 0** (executed this audit).
- `npm run lint` → **exit 0; 0 errors, 6 warnings** (all in `scripts/phase5d-*.mjs` QA scripts; executed this audit).
- Migration syntax: reviewed by reading; **not** executed against a database (read-only constraint). SQL correctness is CODE-VERIFIED only.
- `git status --short` → 28 pre-existing entries; **zero modifications by this audit**.

---

## 22. Cross-Surface Consistency / Regression

- Section naming: "Claims/Arguments", "Questions/Structured Inquiries" distinction consistent across overview pages, section pages, nav, and empty states (CONFIRMED).
- Save behavior consistent on rooms/claims/evidence surfaces except the RoomEvidenceSection gap noted in Phase 5D review (discussion evidence *section page* lacks SaveButton while debate evidence tab has it) — carried here as P3-level inconsistency (CONFIRMED code).
- Phase 5D follow-ups (`save_target_secure`, dedup fix) introduced no regressions in audited call sites; `isTargetSaved`/toggle paths unchanged (CONFIRMED).
- No regression risk identified in settings/profile/search from Phase 5D changes (CODE-VERIFIED: separate features, no shared code touched).

---

## 23. Things We Should NOT Change

1. **The DB-enforced privacy model** (RLS + `has_room_access` + views). It is the product's spine.
2. **Discussion Questions ≠ Structured Inquiries separation.** Any "unification" proposal must be rejected.
3. **Discussion vs Debate as distinct UX models.**
4. **Save as private utility** — never add counts/social features.
5. **Recency/relevance-only default ordering** — never implied popularity.
6. **Vote framing as reader distribution** — keep the "of voters" phrasing; never "proven/verified".
7. **Mandatory rationale for side switches** — epistemically load-bearing.
8. **Guest read access** — openness before contribution is right for understanding-first products.
9. **The anonymous-identity redaction pattern in views** — systematic and correct.
10. **Keyset pagination patterns** — do not regress to offset.

---

## 24. Deferred / Unverified Areas

- Production DB migration state for Phase 5D (UNVERIFIED; requires DB access).
- Interactive a11y (keyboard, screen reader, focus traps) — code-inspected only.
- Runtime performance measurements — none taken.
- Moderator queue internals and reporter-status transparency — subagent coverage failed this pass; prior reviews cover it; re-verify in 6B.
- Mobile rendering at all breakpoints.
- Contrast measurements.
- `phase5d_production_deploy.sql` against a live DB (syntax executed: NO).
- Invitation/access-code flows end-to-end as a *user* (code-verified state machine; prior browser coverage partial).

---

## 25. Phase 6B Recommendations

1. Restore migration-history integrity: add 202606260003/4/5 files to `supabase/migrations/` (P1-ARCH-001).
2. Fix SavedCard claim/evidence deep links (P1-UX-002).
3. Remove duplicate debate SaveButton; delete dead `DiscussionRoom`/`discussion-header` (P2-UX-003, P2-ARCH-004).
4. Fix guest SaveButton redirect to preserve `redirectedFrom` via `usePathname()` (carried from 5D review; P1-class UX).
5. Revoke anon EXECUTE on `get_private_room_gate` (P1-SEC-001).
6. Add Saved to mobile nav (authenticated) — grid-cols-8.
7. Route-level `loading.tsx` skeletons for rooms/sections (P2-UX-009).
8. Epistemic language pass: agreement-hue audit + "distribution, not truth" explainer in State of Understanding (P2-EPI-005).
9. ADR: ordering policy (recency/relevance defaults; user-chosen sorts only; never engagement defaults) + reputation-display policy (P1-EPI-001, P2-EPI-006).
10. `claims (created_by)` index; `p_limit` clamp; composite /saved cursor (P2-PERF-002, P2-UX-010).
11. Re-verify moderator RPC grants and reporter-status UX (completing the failed subagent scope).
12. Full interactive browser QA per §20 matrix (required before any release gate).

## 26. Phase 6C Recommendations

1. Server-side onboarding state (P1-ONB-001).
2. Homepage dashboard RPC consolidation + section lazy-loading (P2-ARCH-001).
3. Batch saved-status per page (P2-PERF-002).
4. Reputation surface rework toward contribution overview (post-ADR) (P2-EPI-006).
5. Dialog/a11y standardization kit (focus trap, aria-live toasts, reduced motion) (P2-A11Y-008, P3-MOT-*).
6. Recently Saved refill logic + true filter counts (P1-EPI-002).
7. Motion kit standardization (P3-MOT-001).
8. Repo hygiene: consolidate root-level reports into `docs/`, remove QA-script warnings (P3-DOC-007, P3-PERF-006).

## 27. Phase 7 Opportunities

- Epistemic "difference of evidence" views: what would change my mind (per-claim counter-evidence surfacing) — deepens principle 2/6 without ranking anyone.
- Inquiry health metrics (response latency, satisfaction) framed as *understanding progress*, never user scoring.
- Cross-room claim relations view (existing `claim_relations` data) as a knowledge graph — distinctive, philosophy-aligned.
- Accessibility maturity: full screen-reader pass, contrast systemization.
- Observability: runtime perf budgets for room pages and dashboard.

## 28. Prioritized Roadmap

| Priority | Item | Phase |
|---|---|---|
| 1 | Restore migrations 003/4/5 to repo history | 6B |
| 2 | SavedCard deep links for claims/evidence | 6B |
| 3 | Guest save redirect preservation | 6B |
| 4 | `get_private_room_gate` anon revoke | 6B |
| 5 | Duplicate SaveButton + dead code removal | 6B |
| 6 | Saved in mobile nav | 6B |
| 7 | Ordering & reputation ADRs | 6B |
| 8 | loading.tsx skeletons + touch targets + a11y kit | 6B/6C |
| 9 | Epistemic language pass | 6B |
| 10 | Onboarding persistence | 6B design / 6C |
| 11 | Dashboard consolidation + perf batch work | 6C |
| 12 | Reputation surface rework | 6C |
| 13 | Knowledge-graph / counter-evidence surfaces | 7 |

## 29. Final Phase 6A Verdict

**PASS WITH GAPS.** (unchanged by the §20A supplement)

Discora is a coherent, philosophy-faithful product with a genuinely database-enforced privacy and authorization model — rare and valuable. No P0 defects. After the interactive browser QA supplement (§20A): the migration-history item (P1-ARCH-001), the saved claim/evidence dead links (P1-UX-002), the duplicate debate SaveButton (P2-UX-003), and the guest-save redirect are **resolved in the current tree**, with the authenticated save round-trip still UNVERIFIED (no QA credentials). Remaining material gaps are the epistemic-softness watch items (engagement sorts, agreement-hue drift, reputation framing), client-only onboarding persistence, and polish debt (a11y, motion, density, dead code/leaderboard route).

Counts at audit time: **P0: 0 · P1: 6 · P2: 12 · P3: 9.** Post-QA: open items are **P1: 4 · P2: 10 · P3: 10** (P3-UX-008 added); the rest are RESOLVED with records retained.

Proceed to Phase 6B with the roadmap above; complete the remaining authenticated/private-debate rows of the §20A matrix before any release gate.
