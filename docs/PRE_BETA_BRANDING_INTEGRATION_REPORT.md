# Discora — Pre-Beta Branding Integration Report
## Official `discora-mark.png` icon/mark

**Mode:** APPROVED BRANDING INTEGRATION (Product Owner supplied the asset file at `public/discora-mark.png`). Local only. No production contact. No commits. No pushes. No migrations. No product-behavior changes.
**Date (UTC):** 2026-09-16

---

# 1. Approved asset

Product Owner-supplied `public/discora-mark.png` — rounded "D" mark of overlapping blue/teal speech-bubble shapes. Verified, not regenerated: valid PNG signature, **1254×1254**, 8-bit **RGBA (color type 6, alpha present)**, 1,380,850 bytes, visually confirmed to match the approved artwork (transparent checkerboard surround, mark fills canvas with modest transparent margins).

# 2. Canonical asset path

**`public/discora-mark.png`** — the single canonical source. The only derived file is `src/app/favicon.ico` (multi-size 16/32/48 ICO mechanically downsampled from the exact file via PIL — standard favicon treatment, no artwork change; required because browsers request `/favicon.ico` directly and a renamed PNG would misdeclare its content-type).

# 3. All locations updated

1. `src/app/icon.tsx` — **deleted** (old generated serif-"D" `ImageResponse` artwork).
2. `src/app/layout.tsx` — metadata `icons: { icon: "/discora-mark.png", apple: "/discora-mark.png" }`.
3. `src/app/favicon.ico` — **new**, derived as above; serves `200 image/x-icon` (verified live).
4. `src/components/layout/sidebar.tsx` — collapsed "D" span → 22px mark image in the identical `h-8 w-8` centered box; expanded brand → 24px mark + existing "Discora" wordmark + tagline lockup (textual wordmark retained; no graphical wordmark invented).
5. `src/components/layout/header.tsx` — 20px mark prepended to the existing wordmark block (desktop + mobile header share this component).
6. `src/features/about/components/about-page-client.tsx` — hero "D" box content → 36px mark image (box/wordmark retained).

Auth pages, mobile nav, loading/empty/legal surfaces carry no graphical mark (verified by sweep) — nothing to replace there; textual "Discora" references retained throughout per instructions.

# 4. Old branding references found

- `src/app/icon.tsx` (generated "D" `ImageResponse`) — REMOVED (file deleted).
- `sidebar.tsx:192` collapsed "D" lettermark span — REPLACED.
- `about-page-client.tsx:464-468` hero "D" box — REPLACED (content only; box + wordmark kept).

# 5. Old active references removed

Post-integration repo sweep: **zero** remaining matches for the old lettermark (`>D<` graphical spans), `ImageResponse`, or `icon.tsx`. `discora-mark.png` is referenced in exactly 6 intentional places (layout metadata ×2, header, sidebar ×2, about). No duplicate/parallel logo assets exist.

# 6. Favicon/app-icon result

`/favicon.ico` → 200 `image/x-icon` (5,165 bytes, multi-size ICO). Metadata icon + apple-touch-icon point at the canonical PNG (served by Next optimizer as verified in live DOM: `/_next/image?url=%2Fdiscora-mark.png`). Old generated "D" artwork no longer exists anywhere in source or output.

# 7. Sidebar result

Expanded: icon + wordmark lockup aligned with tagline; collapse/expand toggle behavior unchanged. Collapsed: 22px mark centered in the unchanged 32px box; no per-icon hacks added (prior structural fix preserved verbatim).

# 8. Collapsed sidebar axis measurement

Live Chromium measurement, collapsed rail (64px wide, axis x=32):
- **1440px: all 12 elements at cx=32** (logo, toggle, 6 nav, Settings, About, How-Works, Feedback) — no regression from the previously verified state.
- **834px: all 12 elements at cx=32** (min=max=32) — intermediate width holds identically.
- Element-box centers measured; the artwork is geometrically symmetric within its box (screenshot-verified, no visible offset, no square artifact, no stretch — square source rendered square at 20–36px across surfaces).

# 9. Desktop QA (1440px)

Homepage, room, claims lens, settings, login, about: new mark renders in sidebar/header/hero; 0 console errors on all visited surfaces; no broken images (all mark requests 200 via optimizer); no layout shift from the swap (identical box metrics preserved).

# 10. Mobile QA (390px)

About + room surfaces: stacked layouts, bottom nav, mark renders in header/hero at correct sizes; zero measured overflow; 0 console errors.

# 11–14. TypeScript / Lint / Build / Vitest

- TypeScript: exit 0, 0 errors. Lint: 0 errors, 44 warnings (pre-existing baseline, unchanged). Build: exit 0, 29 routes (favicon.ico emitted; icon route gone). Vitest: 28 passed; 1 suite unimportable (`@playwright/test` absent — pre-existing environmental).

# 15. Console/network result

No branding-caused console errors; no broken image requests; no layout-shift reports; no secrets/tokens in traffic (unchanged posture); all Supabase traffic local during QA.

# 16. Any remaining issues

- None from this integration. Prior standing items unchanged (operator track: domain/SMTP/OAuth/frontend/monitoring/counsel; dead-code cleanup deferred; QA fixture residue local-only).
- Note: `src/app/favicon.ico` is a mechanically derived multi-size rendering of the canonical PNG (documented in §2), not an independent edit — future mark updates must regenerate it from the new source.

---

**PRODUCTION NOT TOUCHED — NO COMMIT — NO PUSH**
**MIGRATIONS:** NONE — **DATA CHANGES:** NONE
