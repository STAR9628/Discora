# Discora — Pre-Beta UI Remediation Batch 1 Report
## Implementation + Verification (user_preferences, reduced motion, sidebar, duplicates, touch, polish)

**Mode:** APPROVED IMPLEMENTATION (Product Owner authorized). Local Supabase + local app only. Two forward migrations (both local-only). No production contact beyond the pre-existing read-only ledger state. No commits. No pushes.
**Date (UTC):** 2026-09-16

---

# 1. What was found

- **UI-P1 (audit):** `user_preferences` had own-row RLS but zero client grants → Privacy load 403s, saves failed with "permission denied".
- **Discovered during verification:** the app's `upsert()` lacked `onConflict`, so even granted saves 409-conflicted against the signup-trigger-created row. Both fixed.
- **Reduced motion:** zero `prefers-reduced-motion` handling repo-wide (201 tsx files, globals.css).
- **Branding (STOPPED):** no designed new icon/logo exists anywhere (repo, git history, docs, Figma — none available). Multiple governance docs (8B/8C/8F/9A/9B1) explicitly defer brand identity to a future Figma milestone and prohibit inventing one. Creating any mark would violate those directives — item stopped, decision requested.
- **Collapsed sidebar:** brand + toggle shared one centered row (both off-axis); Tooltip `inline-flex` shrink-wrap pinned nav/bottom items 6px left of the rail axis (measured cx=26 vs axis 32).
- **Duplicate sections:** `discussions/[slug]/claims/page.tsx` re-mounted provider+`<main>`+`RoomSectionShell` already mounted by `discussions/[slug]/layout.tsx` → doubled header/guide, nested `<main>`, doubled fetches. All other discussion lens pages return section-only (correct); all debate lens pages self-compose exactly one shell (correct, no parent layout).
- **Touch targets:** lens links ~30px, Save/Share ~28px, guide links ~16px tall (measured).
- **P3 polish:** Privacy vs "Legal & Privacy" nav overlap; stale "posting not supported" note; Terms §9.1 + Privacy §7 pre-deployment wording.

# 2. Root cause of each issue

- UI-P1: grant omission (policies existed, grants never added) + app upsert missing `onConflict: 'user_id'` against the trigger-created row.
- Reduced motion: never implemented (Tailwind `motion-reduce:` unused; no media query).
- Sidebar: (a) collapsed top region used one centered row for two elements; (b) shared Tooltip trigger wrapper (`span.inline-flex`, shrink-wrapped) defeats `justify-center` inside left-pinned items.
- Duplicates: page-level shell composition duplicated the layout-level shell (claims page only).
- Touch: dense `py-1.5` rhythm with no hit-area compensation.
- P3s: copy drift as features shipped (posting, deletion UX).

# 3. Files changed

1. `supabase/migrations/202609200001_user_preferences_client_grants.sql` (new) — SELECT/INSERT/UPDATE TO authenticated; no anon, no DELETE, no RLS change.
2. `src/features/preferences/services/preference-service.ts` — upsert `onConflict: 'user_id'` (+ comment).
3. `src/app/globals.css` — global `@media (prefers-reduced-motion: reduce)` collapse rule (keeps state indication; spinners static-presence).
4. `src/components/layout/sidebar.tsx` — collapsed top region stacks brand above toggle (`flex-col items-center`); collapsed nav `<li>` + bottom items get shared `flex justify-center` wrappers (no per-icon hacks).
5. `src/app/discussions/[slug]/claims/page.tsx` — removed duplicated provider/main/shell; returns `ClaimsLensSection` only (layout owns the boundary; comment documents it).
6. `src/features/rooms/components/room-section-shell.tsx` — invisible `after:-inset-1.5` hit-area on lens links.
7. `src/features/saves/components/save-button.tsx`, `src/components/share/share-button.tsx` — invisible `after:-inset-2` hit-area (all enabled variants; disabled variant intentionally untouched).
8. `src/features/settings/components/settings-page-client.tsx` — "Legal & Privacy"→"Legal Documents" (+ cross-pointer copy); stale posting note rewritten to current behavior.
9. `src/app/(legal)/terms/page.tsx`, `src/app/(legal)/privacy/page.tsx` — deletion wording synced with shipped Danger Zone UX; draft/operator placeholders preserved; no legal guarantees invented.
10. `docs/PRE_BETA_UI_REMEDIATION_BATCH_1_REPORT.md` — this report (new).

Not changed: branding assets, Map/intelligence mounting, SoU, votes, friends, invitations, deletion, notifications, SEO, navigation architecture.

# 4. Migration created

`supabase/migrations/202609200001_user_preferences_client_grants.sql` — applied locally (`migration up`); ledger: remote still through `202609140003`, file local-only. Production untouched.

# 5. Branding asset used and where

**NONE — item stopped per governance.** Exhaustive search (all image extensions across repo excluding node_modules/.next/screenshots; git log for logo/brand commits: zero; docs review) confirms no approved new icon/logo exists. Current surfaces consistently use the restrained textual treatment ("Discora" wordmark + "D" lettermark + generated `icon.tsx`), which prior phases explicitly chose to avoid conflicting with the future Figma brand milestone. Inventory of current references: `src/app/icon.tsx`, sidebar expanded/collapsed, `header.tsx:32`, mobile-nav, auth pages, legal footers. **PRODUCT DECISION REQUIRED:** supply/approve the new mark via the Figma brand milestone before any replacement work.

# 6. Sidebar alignment root cause + fix

Causes (measured, not guessed): (1) collapsed brand+toggle shared one centered flex row → group centered, elements off-axis; (2) Tooltip's shrink-wrapped `inline-flex` trigger span pinned rail items 6px left (cx=26 vs axis 32, n=10 items). Fix: collapsed top region stacks vertically centered; collapsed nav `<li>` and bottom items get shared centering wrappers. Re-measured live: **all 12 collapsed elements at cx=32 = axis**. Expanded state verified unaffected. No per-icon margins.

# 7. Duplicate-section root cause + fix

`layout.tsx` (provider+main+shell for all children) × `claims/page.tsx` (own provider+main+shell) = double header/guide, nested `<main>`, double fetch. Fix removes the page-level duplication (single authoritative boundary: the layout). Verified live: one header ("QA Verify Room A · Claims"), one guide, both claim articles, 0 errors. All other discussion lenses already section-only; all debate lenses self-compose exactly one shell (no parent layout exists there). `RoomSectionShell` now has exactly one rendering site (`DiscussionRoomLayout`).

# 8. Reduced-motion implementation

Single global rule in `globals.css` (durations→0.01ms, single iteration, auto scroll). Normal mode untouched (150ms ease calm motion preserved). Loading feedback preserved as static presence. Verified present in served stylesheets via live CSSOM query. No component scattering. Emulated-behavior testing unavailable in this harness (cannot force the media query) — stated limitation.

# 9. Touch-target changes

Invisible `::after` hit-area expansion (lens links `-inset-1.5`, Save/Share `-inset-2`), visuals byte-identical. Verified live via computed `::after content` on both control types. Disabled variant excluded deliberately.

# 10. Privacy grant verification

- Live grants: SELECT/INSERT/UPDATE TO authenticated; no anon; no DELETE.
- Load: Privacy panel 0 console errors (was 2× 403).
- Save round-trip: toggle off → save → DB row updated (verified by query) → toggle on → save → DB restored (verified). Success message renders; no permission error.
- Ownership intact: RLS own-row policies unchanged; cross-user preference access still impossible by policy (unchanged from audit).

# 11. Tests

- TypeScript: exit 0, 0 errors. Lint: 0 errors, 44 warnings (pre-existing baseline). Build: exit 0, 29 routes. Vitest: 28 passed; 1 suite unimportable (`@playwright/test` absent — pre-existing environmental).
- No package installs performed.

# 12. Browser QA matrix

| Check | 1440 | 834 | 390 | Result |
|---|---|---|---|---|
| Privacy load/save round-trip | ✓ | — | — | PASS (grants + upsert fix, DB-verified both directions) |
| Collapsed rail axis (12 els) | ✓ measured | — | — | PASS (all cx=32) |
| Expanded sidebar regression | ✓ | — | — | PASS |
| Claims single header/guide | ✓ | — | — | PASS, 0 errors |
| Room/feeds/settings/friends/profile/search/legal | ✓ | ✓ room | ✓ room | PASS, 0 product errors |
| Reduced-motion rule ships | ✓ (CSSOM) | — | — | PASS (behavioral emulation unavailable — stated) |
| Touch hit-areas | ✓ (::after verified) | — | — | PASS |
| Register/login/logout/redirects | ✓ | — | — | PASS |
| upsert fix | ✓ live | — | — | PASS (409→200 in network log) |

# 13. Desktop/mobile results

Desktop: full fidelity, no overflow (measured 1440=1440). Intermediate 834: sidebar returns, no overflow (measured). Mobile 390: stacked layouts, bottom nav, usable forms/dialogs, no overflow (measured). Touch targets structurally improved (pseudo hit-areas verified).

# 14. Philosophy verification

No vote/truth/popularity/ranking/AI-authority changes: copy edits are stance-descriptive only; upsert fix changes no semantics; shell/sidebar/touch/env changes are structural. SoU, votes, debates, friends, sharing untouched. Reputation score remains user-controlled + informational (toggle now functionally saveable).

# 15. Security verification

- Grants: least-privilege (3 DML-adjacent grants on one own-row table; no anon; no DELETE). RLS untouched and still enforcing.
- Hook/config untouched by this batch. Admin boundary untouched (no admin files changed).
- No secrets in traffic/bundles (re-confirmed patterns in prior audit; this batch adds no network calls except the fixed upsert with `on_conflict=user_id` — no sensitive params).
- No service-role exposure; no SQL/stack leakage observed (generic messages throughout).

# 16. Remaining issues

1. **Branding replacement BLOCKED on product decision** (no approved asset exists; do not invent one).
2. Nested `<main>` (app-shell > room-layout) predates this batch on all room pages — P3 landmark nit for a future pass (claims page no longer adds a third).
3. Touch guidance: pseudo hit-areas are structural, not AnnPRESSED-measured on device — physical-device spot check recommended.
4. Reduced-motion behavioral emulation unavailable in harness — real-OS-setting verification recommended.
5. QA fixture rooms on local feeds (sandbox-only).
6. Operator track unchanged (domain/SMTP/OAuth/frontend/monitoring/counsel).

# 17. Production status

PRODUCTION NOT TOUCHED — no connection, queries, migration applies, deploys, DNS, Auth, Storage, SMTP, or OAuth changes. Ledger proves remote still through `202609140003`. No commits. No pushes. Migrations local-only unless separately authorized. No product direction invented.

---

**VERDICT: READY FOR PRODUCT OWNER REVIEW** (branding item explicitly stopped awaiting the Figma-milestone asset decision; all other batch items implemented + verified).
**COMMITS:** NONE — **PUSHES:** NONE
