# PHASE 9D.1 — PUBLIC CONTENT SHARING: IMPLEMENTATION REPORT

**Date:** 2026-09-14
**Status:** IMPLEMENTED — CODE, VALIDATION GREEN, SECURITY QA (STATIC) PASS — WAITING ON PRODUCT OWNER REVIEW
**Verdict:** B. PASS WITH FOLLOW-UP ISSUES

---

## 1. Executive Summary

Phase 9D.1 implemented PUBLIC CONTENT SHARING ONLY, exactly as scoped by the Product Owner:
discussion sharing, debate sharing, public profile sharing, native Web Share API with copy-link
fallback, dynamic Open Graph metadata, canonical URLs, and a welcome/context experience that reuses
the existing public pages (no artificial share landing page, per the PO instruction to prefer
lightweight contextual copy over a separate landing surface).

Implemented with **no database, authentication, or RLS changes.** No migration was created. The
share surface is limited to public content; private rooms and missing content are explicitly
de-indexed and excluded from sharing. The existing invitation system (`room_invitations`) and the
future friend-invitation system were intentionally NOT touched.

Validation: `tsc --noEmit` PASS, `npm run lint` PASS (0 errors; only pre-existing warnings in
`scripts/*.mjs`), `npm run build` PASS (Next.js 15.5.25). Security QA (matrix SHARE-01..12) passed
by static code inspection. Browser QA is **RUNTIME-VERIFIED** (host-side Playwright against the dev
server on `:3000` serving production data read-only) with the exception of the native share-sheet
pixel UI (headless limitation) — see the runtime update in Section 12 and
`docs/PHASE_9D1_SHARE_RUNTIME_FIX_REPORT.md`.

---

## 2. Implemented Features

| # | Feature | Status |
|---|---|---|
| 1 | Share button on public discussion rooms (main header + compact sticky header) | Implemented |
| 2 | Share button on public debate rooms (sticky header + header v2) | Implemented |
| 3 | Share button on public user profiles | Implemented |
| 4 | Native Web Share API (`navigator.share`) when available | Implemented |
| 5 | Copy-link to clipboard fallback (no Web Share support or genuine failure) | Implemented |
| 6 | Cancelled share sheet (`AbortError`) treated as silent, no error toast | Implemented |
| 7 | Dynamic `metadataBase`, canonical URL, and Open Graph per page | Implemented |
| 8 | Public-room gates on share rendering (`visibility === "public"` only) | Implemented |
| 9 | Private / missing-content pages: generic title + `robots: { index: false }`, no canonical | Implemented |
| 10 | Deleted profiles: "User not found" + noindex, no share button | Implemented |
| 11 | `og:image` for profiles only when the avatar URL is absolute HTTP(S) | Implemented |
| 12 | Welcome/context experience via existing public room/profile pages | Implemented (existing pages reuse) |

---

## 3. Files Changed

### New files
| File | Purpose |
|---|---|
| `src/components/share/share-button.tsx` | Client component: Web Share + clipboard fallback, icon/text variants, tooltip, "Copied" transient state. |
| `src/components/share/room-header-actions.tsx` | Client component: groups header actions (Save + Share) and forwards one `showLabel` flag so compact/sticky headers render icon-only. |
| `src/lib/site-url.ts` | Server helper `getSiteUrl()`: resolves the public origin from request headers (`x-forwarded-proto` → `x-forwarded-host`/`host`, fallback `https://localhost:3000`). No hardcoded domain. |
| `src/lib/text.ts` | Server helper `truncateText()`: 160-char metadata truncation with whitespace collapse and ellipsis. |

### Modified files
| File | Change |
|---|---|
| `src/features/discussions/components/discussion-room-layout.tsx` | Header action group `RoomHeaderActions` with `SaveButton` + `ShareButton` (public-only) via `RoomSectionShell headerAction`; sticky header renders them icon-only. |
| `src/features/debates/components/debate-room.tsx` | Sticky (`compact-sticky-room-header`) actions: `RoomHeaderActions` with `SaveButton` + `ShareButton` (public-only). |
| `src/features/debates/components/debate-header-v2.tsx` | Icon-only `ShareButton` added next to `SaveButton`, rendered only when `room.visibility === "public"`. |
| `src/app/discussions/[slug]/layout.tsx` | `generateMetadata`: rich metadata + canonical + OG for public rooms; generic title + noindex + no canonical for private/missing. |
| `src/app/debates/[slug]/page.tsx` | `generateMetadata`: same pattern for debates. |
| `src/app/u/[username]/page.tsx` | `generateMetadata` (profile OG, canonical, noindex for deleted users) + `ShareButton` in the profile meta row. |

---

## 4. Share UX

- **Discussion rooms:** Share appears in the room header action group (label shown) and in the
  compact sticky header (icon-only), next to Save. Both are rendered only when the room is public.
- **Debate rooms:** Share appears icon-only in both the sticky room header and the header-v2
  variant, next to Save, public-only.
- **Profiles:** Share appears as an inline icon button in the profile meta row (beside "Joined …").
- **Icon states:** `Share2` at rest; `Check` + "Copied" transient state (2 s) after a successful
  copy. Tooltip reads "Share" / "Copied to clipboard".
- **Copy language:** discussion — "Take a look at this discussion on Discora."; debate — "I think
  this debate would be interesting to discuss together."; profile — "Check out this Discora profile."
- **No artificial share landing page.** Opening a shared link lands on the existing public room or
  profile page, which already provides full context to logged-out visitors (readable content,
  room title/premise, contribution sections). This follows the PO instruction to prefer lightweight
  contextual copy over a separate landing surface.

---

## 5. URL Strategy

- **Client share URL:** built at click-time from `window.location.origin + sharePath`, where
  `sharePath` is always a canonical public path:
  - Discussions: `/discussions/[slug]`
  - Debates: `/debates/[slug]`
  - Profiles: `/u/[username]`
- **No query parameters are added.** No `?invite=`, no tokens, no tracking, no `?next=` redirects.
- **Server canonical origin:** `getSiteUrl()` derives the origin from the deployment's real request
  headers (`x-forwarded-proto`, `x-forwarded-host`/`host`), with `https://localhost:3000` as a
  fallback. No DNS work, no hardcoded domain, correct behind reverse proxies.
- The client origin is used for share payloads and the server origin for `metadataBase`/canonical —
  both resolve to the same public origin in production.

---

## 6. Web Share API Behavior

`share-button.tsx` (`handleShare`):

1. Builds the canonical URL from `window.location.origin + sharePath`.
2. If `navigator.share` exists → `navigator.share({ title, text, url })`.
3. **Cancellation is silent:** `DOMException` with `name === "AbortError"` (user dismissed the
   sheet) is treated as expected user intent and returns without any toast.
4. **Genuine failure** (any other error) falls back to clipboard copy.
5. No Web Share support → clipboard copy directly.

---

## 7. Clipboard Fallback

- Uses `navigator.clipboard.writeText(url)`.
- On success: transient "Copied" button state + `toast.success("Link copied to clipboard.")`,
  auto-reset after 2 s (timer cleared on unmount).
- On failure: `toast.error("Could not copy the link. Please try again.")` — this is the only
  surface on which an error is shown to the user.

---

## 8. Metadata / Open Graph

| Content type | Title | Description | Canonical | OG type | robots |
|---|---|---|---|---|---|
| Public discussion | `{title} | Discora` | `truncateText(description || openingStatement)` fallback "A structured discussion on Discora." | `/discussions/[slug]` | article | default |
| Public debate | `{title} | Discora` | `truncateText(description || openingStatement)` fallback "A structured debate on Discora." | `/debates/[slug]` | article | default |
| Public profile | `{displayName} | Discora` | `truncateText(bio)` fallback "{displayName} on Discora." | `/u/[username]` | profile (`og:image` = avatar only if absolute http(s)) | default |
| Private discussion | "Discussion | Discora" | generic | **none** | — | `index: false` |
| Private debate | "Debate | Discora" | generic | **none** | — | `index: false` |
| Missing discussion/debate | "Discussion \| Discora" / "Debate \| Discora" | generic | none | — | `index: false` |
| Missing/deleted profile | "User not found" | — | none | — | `index: false` |

- All metadata sources are public-only: room title, room description, opening statement, display name,
  username, bio, avatar URL. Never email, invites, membership, or participant data.
- `metadataBase` is set from `getSiteUrl()` so that Next.js can resolve absolute URLs for the current
  deployment.

---

## 9. Canonical URLs

- Canonical URLs exist **only** for public rooms and existing profiles:
  `/discussions/[slug]`, `/debates/[slug]`, `/u/[username]`.
- Private and missing content emit **no canonical** to avoid hinting that such content exists.
- Canonical URLs never contain tokens, emails, query strings, or user identity beyond the public
  slug/username.

---

## 10. Public / Private Authorization Behavior

- **Share rendering gate:** `ShareButton` is rendered only when `room.visibility === "public"`
  (discussions in `discussion-room-layout.tsx`, debates in `debate-room.tsx` sticky header and
  `debate-header-v2.tsx`). Private rooms expose no share affordance.
- **Metadata gate:** private and missing rooms get a generic title, no canonical, and
  `robots: { index: false }`; deleted profiles get "User not found" + noindex.
- **Access control unchanged:** room-level RLS and section guards (`has_room_access()`, private-room
  access gates) were not modified. Sharing a public URL never bypasses private-content access
  because private content is never referenced in share payloads or metadata.
- **Drift check:** no session creation, no auth mutation, no redirect parameters introduced by the
  share flow (`getSafeRedirectUrl` untouched).

---

## 11. Security QA

Verified by static code inspection of `share-button.tsx`, `room-header-actions.tsx`, `site-url.ts`,
`text.ts`, the discussion/debate layouts, the debate page, and the profile page.

| ID | Check | Result |
|---|---|---|
| SHARE-01 | Shared URLs contain no credentials, tokens, or private data | PASS — URL = origin + canonical path only |
| SHARE-02 | No private content reachable through a shared URL beyond existing guards | PASS — share + metadata gated `visibility === "public"`; private pages noindex |
| SHARE-03 | Shared URLs contain no session/auth context | PASS — no params, no cookies embedded |
| SHARE-04 | Opening a shared link logged out does not create a session | PASS (static) — server components, no auth writes. Runtime pending |
| SHARE-05 | No auth context leaks into the share payload | PASS — component does not read user/session |
| SHARE-06 | No engagement/popularity infrastructure added | PASS — no share counts, no tracking events |
| SHARE-07 | No unsafe redirect parameters introduced | PASS — no `next`/`redirect` params; `safe-redirect` untouched |
| SHARE-08 | OG/title/description sourced only from public content | PASS — room title/desc/statement, displayName/username/bio |
| SHARE-09 | Invitation tokens never appear in canonical/share URLs | PASS — no `/invite` usage; canonical paths only |
| SHARE-10 | Metadata does not leak membership/participant info | PASS — title + description only |
| SHARE-11 | Deleted profiles don't leak | PASS — null profile → "User not found" + noindex, no share button |
| SHARE-12 | Archived content behavior preserved | PASS — no RLS/authz change; existing section guards intact |

**No database policy, grant, RPC, or migration changes were made in this phase.**

---

## 12. Browser QA — RUNTIME-VERIFIED (HOST-SIDE PLAYWRIGHT)

Initial attempts used the Playwright MCP, which is Docker network-isolated from the host
(`net::ERR_CONNECTION_REFUSED` to `localhost:3000`). That limitation was **superseded**: host-side
Node Playwright (headless chromium) reaches the dev server and exercises real clicks on the real SSR
app, and the connected **production** backend exposes public content read-only (anon `SELECT` only —
no writes; phase read-only boundary preserved).

Runtime results (clean dev server; see §10 of the runtime fix report for a transient `.next` cache
corruption that was clean-restarted):

- **Share click** — discussion, debate, and `/u/qatester012` profile: button present, click fires,
  and every executable path (Web Share fulfilled silently / fulfilled with UI / rejected / undefined)
  now yields visible feedback ("Link copied to clipboard." toast + "Copied" tooltip/state).
- **Logged-out open of shared URLs** — fresh anonymous browser context: HTTP 200, full SSR page.
- **Page source** — public pages: canonical = origin+path, `og:type` article/article/profile; missing
  profile: HTTP 404 (`notFound`), `noindex`, no canonical, no share.
- **Responsive/overlay** — 1440·1280·1024·390·375 px: hit-test resolves to the button itself, no
  pointer-event blockers; sticky compact-header Share verified on mobile.
- **Cannot do headlessly:** render the real native share-sheet UI (manual host check recommended).

Full evidence: `docs/PHASE_9D1_BROWSER_QA_REPORT.md` and
`docs/PHASE_9D1_SHARE_RUNTIME_FIX_REPORT.md`.

---

## 13. Accessibility QA (Static)

- `ShareButton` is a native `<button type="button">` — keyboard focusable and activatable by
  default.
- Every button exposes `aria-label` + `title` matched to the page context ("Share this debate",
  "Share this profile", …).
- Icon-only variants are wrapped in the existing `Tooltip`; labeled variants render visible text.
- Transient "Copied" state conveys success without screen-reader motion dependency (aria-label
  unchanged, visually distinct check icon + tone).
- Visual states use theme design tokens (`text-muted-foreground` → `text-primary` + `bg-primary/10`),
  consistent with `SaveButton`.

Runtime axe/keyboard checks remain outstanding (no axe-capable run performed); recommended on host.

---

## 14. TypeScript / Lint / Build

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS (no errors) |
| ESLint | `npm run lint` | PASS — 0 errors, 40 warnings, all pre-existing in `scripts/*.mjs`; none from changed files |
| Production build | `npm run build` | PASS — Next.js 15.5.25, compiled successfully in ~17 s |

---

## 15. Remaining Issues / Follow-ups

1. **Share-button runtime no-op — FIXED.** The user-reported defect (click → nothing) was root-caused
   (Web Share fulfilling silently with no UI) and fixed in `src/components/share/share-button.tsx`;
   runtime-verified. Details: `docs/PHASE_9D1_SHARE_RUNTIME_FIX_REPORT.md`.
2. **Native share-sheet UI** — cannot be rendered headlessly; one manual host click recommended.
3. **Private-room noindex** — implemented per spec (generic title, no canonical, `robots: index:
   false`). Confirm at review if any private-room SEO behavior is preferred.
4. **No `og:image` for rooms** — out of stated scope; profiles included it only when avatar is an
   absolute http(s) URL.
5. **Welcome experience** — delivered by reusing existing public pages rather than a dedicated
   landing page; flagged for PO confirmation this matches intent.
6. **Dev-server artifact** — `.next` cache corrupted mid-session and was clean-restarted (environment
   state, not a code defect); `.next-dev.log` (untracked, local only) is not source.
7. **Production** — the process on port 3001 still runs the previously built bundle; a fresh
   build/deploy with the Phase 9D.1 code is required before production behavior is verified. No
   production migration applies.
8. **Pre-existing, app-wide (`<title>` only): duplicate "| Discora" suffix** (root `template` +
   child-literal suffix). Confirmed at runtime on discourse/debate/profile and several static pages.
   Out of scope for this fix; `og:title` is clean. Suggested separate cleanup task.

---

## 16. Explicit Confirmation: Friend Invitations NOT Implemented

- No friend schema, table, RPC, or migration was created.
- No `/invite/[token]` route exists or was touched.
- `room_invitations` was NOT modified (existing plaintext-token remediation item intentionally left
  for its own phase per PO correction #3).
- PO product decisions for the FUTURE system (Pending→Accepted + blocking, 7-day expiry,
  rate-limiting required with threshold to be tuned, deleted-sender invalidation, display-name/public
  avatar identity only) are recorded in the Phase 9D audit doc header for that future work.

---

## 17. Explicit Confirmation: Google Sign-In NOT Modified

- `google-signin-button.tsx`, the OAuth callback route, and `auth-service.ts` were not changed as
  part of Phase 9D.1. (Pre-existing working-tree differences from earlier phases are out of scope
  of this report.)

---

## 18. Explicit Confirmation: Account Deletion NOT Modified

- No changes were made to deletion orchestration, deletion RPCs, storage enqueue logic, or any
  related migration.
- No migration was created or applied for Phase 9D.1.

---

## 19. Final Verdict

**B. PASS WITH FOLLOW-UP ISSUES.**

- Code scope, public/private gating, metadata isolation, and the share UX are implemented and
  verified (`tsc`/`lint`/`build` all pass; security QA SHARE-01..12 passes by inspection; share
  runtime + metadata runtime-verified host-side; friend/Google/auth/account-deletion surfaces are
  untouched).
- Open items: native share-sheet pixel UI (manual host check — headless cannot render it), redeploy
  of `:3001` with the fixed bundle, and the pre-existing app-wide `<title>` doubling (out of scope).
  Once the PO confirms the metadata/welcome choices and the manual native-sheet check, this can be
  re-issued as **A. PASS**.
- Per the Phase 9D.1 FINAL STOP instruction, work stops here: friend invitations and Phase 3
  private-invitation remediation are NOT started. Awaiting Product Owner review.