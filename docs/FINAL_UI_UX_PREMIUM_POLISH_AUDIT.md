# Discora — Final UI/UX + Premium Product Polish + Motion Audit

**Mode:** AUDIT ONLY. No application code, migrations, config, data, or history was created, modified, or deleted. No production contact of any kind. No commits. No pushes. Local Supabase + local dev server only. One transient friend request was created and withdrawn during live interaction testing (zero residue verified).
**Date (UTC):** 2026-09-16
**Engine:** real Chromium via Playwright-backed MCP browser tools (navigate/snapshot/fill/click/type/evaluate/resize/press-key/console/network). No scripted `@playwright/test` suite exists in the repo (package absent); flows were driven interactively with full evidence. No package installs performed.

---

# 1. Executive Summary

Discora presents as a coherent, intentionally-designed dark-first product: consistent card/dialog/badge language, conversation-first rooms with progressive lens disclosure, philosophy-aligned copy on every major surface, and calm default motion (150ms ease transitions, restrained scale, standard Radix enter/exit). No P0 and no release-blocking P1 UI issue was found. The product does not feel like a template or a prototype.

The audit produced **one P1-adjacent functional discovery already covered by the security track** (privacy-preference persistence is broken by missing table grants — reported here for UX completeness as UI-P1, owned by the grant-remediation track), **two P2s** (no `prefers-reduced-motion` support anywhere; vote-derived consensus meter + popularity spotlights in the Map lens — the latter already reframed by the approved copy batch, though the lens itself is currently unmounted), and a set of P3 polish items (sub-44px touch targets on room controls, duplicated room header on lens sub-pages, duplicated Privacy nav entries, stale "posting not supported" note, draft-legal placeholders). Motion has no defined language beyond Tailwind/Radix defaults, but what exists is restrained and consistent.

**Verdicts: UI/UX READY WITH CONDITIONS · Polish NEEDS REFINEMENT · Motion NEEDS REFINEMENT (system, not quality) · Accessibility READY WITH CONDITIONS (reduced-motion) · Responsive READY · Philosophy ALIGNED WITH CONDITIONS.**

---

# 2. Audit Scope

Surfaces exercised live (guest + User A + User B sessions, 1440/834/390px): homepage, About, Search (+anon private-content probe), discussions feed/room + Conversation/Claims/Evidence/SoU lenses, debates feed, private debate gate, inquiry detail, friends + live send/withdraw, settings (Profile/Privacy/Danger Zone view-only), profile + timeline, register/login/logout, terms, composer/save/share affordances. Admin: route + RPC boundary only (no owner session exists). Not live-tested: OAuth round-trip (no creds), destructive deletion, bursts/email/physical devices.

# 3. Environment Tested

Branch `main`; local Supabase (127.0.0.1:54321/54322); dev server `:3002` with inline local env (files untouched); pre-existing synthetic users A/B + QA fixtures (zero net rows added by this phase — one friend request created + withdrawn, verified 0 pending). `.env.local` targets local after the closure phase.

# 4. Documents Reviewed

`00_MASTER_CONTEXT`, `01_PRD` (skim), `02_FEATURE_REGISTRY` (skim), `03_USER_FLOWS` (skim), `06_DESIGN_SYSTEM` (full), `07_API_DESIGN` (skim), `DISCUSSION_ROOM_UX_ARCHITECTURE_SPEC` (skim), `DISCORA_AGENT_GOVERNANCE`, `COMPREHENSIVE_MVP_PUBLIC_BETA_AUDIT`, `HOW_DISCORA_WORKS_AUDIT` (skim), plus all Phase 9 / pre-Beta remediation reports (findings re-verified live, not assumed).

# 5. Surfaces Tested

Per §2 list above. Owner-console happy path NOT TESTED (no admin identity — will not manufacture one). Destructive paths (delete account, block flows leaving residue, invitation revoke races) cited from prior live evidence, not re-run.

# 6. Overall UI/UX Verdict

**READY WITH CONDITIONS** — conditions: UI-P1 (preference persistence — grant track), UI-P2 reduced-motion support, UI-P2 consensus-meter copy (already reframed in code; lens unmounted). Everything a Beta user touches in the primary flows works with clean consoles and coherent visuals.

# 7. Severity Summary

- **P0:** 0. **P1:** 1 (UI-P1 preference persistence). **P2:** 3 (UI-P2 reduced motion; UI-P3 consensus meter — rated P2 for philosophy weight; UI-P4 touch targets — P2 on mobile strictness, borderline P3). **P3:** 6. **INFO:** 7.

# 8. Premium Visual Quality Audit

Typography: single-family hierarchy (H1 page → H2 section → H3 card), consistent metadata sizing, truncation with ellipsis, dark-first contrast strong throughout; no font mixing observed. Spacing: consistent card padding (`p-4`/`p-5`/`p-6`), section rhythm (`space-y-4/5/6`), modal `p-6`; no arbitrary gaps found. Alignment: icon+text rows aligned; badges/chips uniform (rounded-full, 10–11px semibold). Component consistency: buttons share radius/weight/disabled-opacity language (`rounded-xl`, `disabled:opacity-50`, `cursor-pointer`); dialogs share overlay (`bg-black/60 backdrop-blur`) + `rounded-2xl border shadow-2xl`; inputs share border/focus language. Dark surfaces restrained (no neon excess beyond semantic accents). Assessment: **Strong, minor refinement notes only.**

# 9. Interaction / Micro-Interaction Audit

Every major action acknowledges input: Save toggles to pressed "Saved" state; Share flips to "Copied" + toast; friend Add→"Request sent"+Withdraw; toasts across posting/reacting/inviting/deleting flows (code-verified, ~40 call sites, consistent success/error distinction). Disabled states prevent empty submits (OTP/delete/post buttons). Loading states: skeletons on feeds, spinners on async buttons. No dead-feeling buttons found; no missing acknowledgement found. Assessment: **Strong.**

# 10. MOTION / ANIMATION AUDIT

- Buttons/links: global `0.15s cubic-bezier(0.4,0,0.2,1)` transitions (measured live) — calm and uniform.
- Hover: background/border/opacity shifts; `hover:scale` used sparingly (7 instances, e.g. reaction popover) — restrained, appropriate.
- Tabs/lenses: instant state swap, no indicator animation — acceptable, no jumps (content swaps cleanly).
- Modals/dialogs: Radix `data-[state=open/closed]:animate-in/out` (fade/zoom) via tailwindcss-animate; backdrop blur-xs. Standard shadcn pattern, fast, not slow.
- Dropdowns/popovers: reaction picker uses fade/zoom-in-95 + origin-aware absolute positioning; closes on outside click and Escape (Escape verified live).
- Toasts: sonner-style region; success/error distinguished; durations standard.
- Loading: skeletons + `animate-spin`/`animate-pulse` only; no layout-thrash observed; no heavy blur/shadow animation (backdrop-blur is static, 85 static uses — no perf complaint observed).
- Navigation: no page-transition animation (Next.js default); sidebar collapse instant; stable sense of place via persistent shell.
- **Gap: zero `prefers-reduced-motion` handling** — no media query in `globals.css`, zero `motion-reduce:` utilities in 201 tsx files (UI-P2). Users requesting reduced motion receive full transitions, dialog zoom, and spinners.
- No parallax, no springs, no custom easings (only 4 explicit `ease-*`; rest Tailwind defaults) — coherent by default rather than by system.

# 11. Motion System Consistency

There is no documented motion vocabulary; consistency comes from Tailwind/Radix defaults (150ms in-out, fade/zoom entrances, spin/pulse loading). Equivalent interactions do not conflict (no wild timing variance found). Recommendation: document the de-facto language (150–200ms ease-out micro-feedback; fade/zoom ≤200ms entrances; spinners/skeletons for waits) + add global reduced-motion rule, rather than inventing new animation. Do not add per-component flourishes.

# 12. Responsive Audit

- 1440px: full shell, room lenses inline, composers comfortable; `scrollWidth == innerWidth` (measured, no overflow).
- 834px: desktop sidebar returns, content reflows; no overflow (measured).
- 390px: bottom nav replaces sidebar actions; stacked cards; SoU/claims/profile/friends/settings all usable; no overflow (measured on room + SoU lens).
- Dialogs fit small viewports (delete dialog `max-h-[90vh] overflow-y-auto` pattern; share/settings verified).
- Touch targets: room lens buttons (~30px), Save/Share (~28px), guide links (~16px) below 44px guidance (UI-P4). Usable but small — enlarge hit areas via padding while keeping visual size.

# 13. Accessibility Audit

- Keyboard: Tab reaches all 40 focusables on room page in logical order; global `:focus-visible` 2px ring verified live (blue outline on focused lens link). Escape closes popovers (verified). Dialog focus trap via Radix primitives (code pattern; dedicated trap test not run — stated).
- Semantics: real `button`/`a`/`h1-h4`/`nav`/`main`/`list` landmarks throughout snapshots; form inputs labeled with `aria-invalid`/`aria-describedby` on errors (register/age checkbox verified in code + live).
- Contrast: dark-first palette (slate-100 on slate-950 class) strong; muted text meets AA by prior measurement (cited, not re-measured).
- Motion: **no reduced-motion support (UI-P2)**.
- Focus: always visible (global rule + measured outline).

# 14. Dark-First Visual Audit

Restrained and coherent: neutral surfaces, semantic accents (blue claims, amber warnings, rose destructive, emerald success), hierarchy carried by weight/spacing/borders rather than color alone. Destructive states clearly badged; disabled states dimmed; no glow/gradient excess. Matches "modern, elegant, restrained" bar.

# 15. Information Hierarchy / Cognitive Load

Each surface answers what/why/how: room header + lens nav + guide card ("You do not need to argue to win"); progressive disclosure (collapsed intelligence sections, expandable lenses, SoU item limits 2→50); contextual proximity actions (evidence/arguments links on claims, per-post composer modes). No hunting required in tested flows. Feature richness feels organized, not overwhelming. No removals recommended.

# 16. Loading / Empty / Error / Success States

- Loading: feed skeletons, button spinners, lens-level pending states. No abrupt content jumps observed.
- Empty: "No contributions yet", "No friends yet", "No open inquiries right now", "No active debates" — all intentional with guidance, never blank regions.
- Error: generic safe messages ("You do not have permission…", "Failed to load…", 404 resource page); no SQL/stack/IDs anywhere observed.
- Success: toasts + pressed-state toggles everywhere tested.
- Disabled: OTP-gated delete, cooldown-gated side switch, 50-char rationale gates — all enforced in UI with explanation.
- Private/permission-denied: generic gate shells (private debate, admin 404).

# 17. Interaction Feedback

Add Friend → Request sent + Withdraw (live); Withdraw → Add Friend restored (live, zero DB residue); Save → Saved pressed state (live, then unsaved, zero residue); Share → Copied state (code + button state); login/logout/register → redirects + toasts; settings saves → inline permission message on failure (live proof of UI-P1). Nothing tested left the user wondering.

# 18. Discora Philosophy / Behavioral Audit

- Votes: Support/Challenge stance language everywhere; SoU never consumes them (28/28 unit tests + code). ALIGNED.
- Consensus meter/spotlights: vote-derived "Consensus Level/High/Medium/Low", "Emerging Consensus", "Most Supported/Contradicted/Connected" — presentation implies correctness-by-agreement (UI-P3 per prior reframe batch; code already reframed, lens currently unmounted). ALIGNED WITH CONDITIONS.
- Reputation: profile shows participation areas/counts + timeline; numeric score behind a user-controlled toggle defaulting visible; trust-badge/score components dead code. Factual history presentation, no ranking/leaderboard route exists. ALIGNED with a watch note (score display should keep informational framing).
- Discovery: activity/evidence/participant sorts + descriptive metrics; no likes/followers/trending/rewards. ALIGNED (browsing affordance, not farming).
- Reactions (Like/Insightful/Curious + counts): conversational signals with no truth weight, no aggregation into authority. ALIGNED (noted).
- Debates/AI/friends/sharing: no winners/scores, virtue-framed side switching, assistive-only AI copy, private graph, count-free sharing. ALIGNED.

# 19. SoU / Epistemic UI Audit

Classifier: evidence-led presence lattice (Contested>Unresolved>Supported), retracted/deleted excluded, unevidenced challengers ignored, supports/refines contextual, votes/positions blind — code + 28 tests + live lens (Unresolved 2/2 with clean copy: "Deterministic synthesis…", "Not a truth verdict" patterns). UI never presents SoU as truth/consensus/popularity. ALIGNED, no conditions.

# 20. Design System Consistency

Implementation matches `06_DESIGN_SYSTEM.md` direction (dark-first, Inter/system, centered max-width layouts, sidebar→bottom-nav, badge+colored-border claim language, chat-like messages, lens tabs) with intentional evolutions (Discovery Deck lenses, SoU surfaces — approved in later specs). Drift found: none material; "Trending Discussions/Debates" homepage sections from the old doc no longer exist (replaced by Active/curated sections — approved evolution, not a violation).

# 21. Dormant / Dead UI

Cataloged, NOT mounted, NOT removed: `MapTab` (+`DiscussionHealth/Summary/Intelligence` — only rendered inside it), `PositionHistory`, `DebateSidePicker`, trust-badge/score/history-chart/growth-card components, `useAuthorsReputation`. Risk: the reframed consensus copy lives in unmounted code (harmless), and any future remount must re-audit visibility/wording. Keep as tracked debt; do not delete without a cleanup phase.

# 22. Browser QA Evidence

Real Chromium (MCP-driven; no `@playwright/test` in repo — interactive flows, nothing fabricated): 15+ page loads across 3 viewports and 3 auth states; ~10warf live interactions (login/logout/register-submit/add/withdraw friend, save/unsave, share, lens switches, settings tabs, Escape, Tab); console-error assertions per surface (all 0 product errors; only expected 404-resource on /admin rewrite + known grant-403s + one transient dev-navigation artifact cleared on reload); network scans (all local, no secrets/tokens in URLs, generic errors); overflow measurements (1440/834/390 all exact-fit); client-storage probe (auth cookies only, no secrets).

# 23. Desktop Findings

Full fidelity on all visited surfaces; lens nav, composers, dialogs, tables all comfortable; no overflow. Minor: lens buttons 26–30px tall (also a mobile concern).

# 24. Mobile Findings

Bottom nav, stacked cards, usable forms/dialogs verified; zero overflow measured twice; guide/composer/SoU fully usable at 390px. Minor: same small touch targets; long fixture titles truncate with ellipsis (acceptable).

# 25. Cross-Surface Inconsistencies

1. Duplicated room header + guide card on lens sub-pages (claims lens renders the room shell twice) — P3 polish.
2. Settings nav has both "Privacy" and "Legal & Privacy" — overlapping labels, distinct contents (identity/visibility vs legal docs); P3 navigation clarity.
3. Stale note in Privacy panel: "Discora does not support posting yet" — false (composer ships); P3 copy.
4. Terms §9.1 says self-service deletion is "intended/until deployed" while the Danger Zone ships it in-app — P3 legal-copy sync (operator launch task).

# 26. Recommended Remediation Sequence

1. Grant fix for `user_preferences` SELECT/INSERT/UPDATE (UI-P1; same least-privilege pattern as F-03; RLS already own-scoped) — unblocks privacy controls.
2. Global `prefers-reduced-motion` rule + audit spinners/dialog zooms (UI-P2).
3. Consensus-meter/spotlight copy already reframed in code (verify on remount; no further action until Map lens returns).
4. Touch-target hit-area pass on room controls (padding, not visual size).
5. Dedupe lens-subpage room header; disambiguate Privacy nav labels; fix stale posting note; sync Terms §9.1 at launch.
6. Dead-code cleanup phase (separate): Map/intelligence, PositionHistory, badges, batch hook — or remount deliberately with fresh audits.
7. SEO surface (robots/sitemap/discussion metadata) per prior reports.

# 27. Product Decisions Required

None new. (Guest inquiry visibility, consensus wording, and 18+ approach were decided in prior phases. The `user_preferences` grant follows the established F-03 pattern — engineering, not product.)

# 28. What Should NOT Be Changed

SoU semantics/classifier; vote-as-stance model; private friend graph; M3 invitation architecture; deletion Option C; RLS-first enforcement; no-AI-authority posture; feature set (no removals — Map/intelligence/dead components stay dormant, not deleted); search weighting; notification absence; discovery structure. Polish copy and hit-areas only.

# 29. Final Release Assessment

UI/UX: READY WITH CONDITIONS · Polish: NEEDS REFINEMENT · Motion: NEEDS REFINEMENT (system definition + reduced-motion; quality of existing motion is calm/consistent) · Accessibility: READY WITH CONDITIONS · Responsive: READY · Philosophy: ALIGNED WITH CONDITIONS. No P0; Beta proceeds once UI-P1 grant + UI-P2 motion/consensus conditions clear alongside the existing operator track.

---

# Appendix — Finding Registry

### UI-P1 — P1 — Privacy preference persistence broken (missing table grants)
Surface: Settings → Privacy. Expected: toggles load/save per user. Observed: SELECT 403 ×2 on load (console), save surfaces "You do not have permission to perform this action." Cause: `user_preferences` has own-row RLS policies but zero SELECT/INSERT/UPDATE grants to anon/authenticated (live grant query). Impact: privacy controls silently non-functional (fail-closed to defaults). Repro: login → /settings → Privacy → console 403s → toggle + Save → permission message. Recommendation: forward migration granting SELECT/INSERT/UPDATE TO authenticated (RLS already scopes); no policy change. Product Decision: NO. Status: OPEN.

### UI-P2 — P2 — No prefers-reduced-motion support
Surface: global. Expected: motion-sensitive users get reduced transitions/animation. Observed: zero `motion-reduce:` utilities in 201 tsx files; no media query in globals.css; dialogs zoom, spinners spin unconditionally. Impact: WCAG 2.3.3 gap. Recommendation: global reduced-motion rule + audit. Product Decision: NO. Status: OPEN.

### UI-P3 — P2 — Vote-derived consensus meter + popularity spotlights (Map lens)
Surface: Map lens (currently unmounted dead code). Already reframed in code by the approved batch (Stance Distribution / Most Agreed-Upon / participant-framed spotlights + not-truth note). Live impact nil today; must be re-verified if remounted. Status: REFRAMED IN CODE, UNMOUNTED.

### UI-P4 — P2/P3 — Sub-44px touch targets on room controls
Surface: room lenses (~30px), Save/Share (~28px), guide links (~16px) measured live. Usable with mouse/stylus; below mobile guidance. Recommendation: expand hit-area padding, keep visuals. Status: OPEN.

### UI-P5..UI-P8 — P3 — duplicated lens header; Privacy/Legal&Privacy nav overlap; stale "posting not supported" note; Terms §9.1 deletion wording sync
Surfaces as §25. Copy/layout only. Status: OPEN.

### UI-P9 — P3 — Reputation score display toggle
Surface: Settings → Privacy ("Show reputation score… on your public profile", default on). Factual-history framing, user-controlled, no ranking context — acceptable within design-system "informational only" rule, but keep the informational framing if the score display evolves. Status: NOTED.

### UI-P10 — P3 — QA fixture rooms on public feeds
Local-sandbox residue (deletion-qa-room, sou-hardening-qa, qa-verify-*) visible on guest homepage/feeds. Not a production issue (no prod frontend); local hygiene note. Status: NOTED.

---

**REPORT:** `docs/FINAL_UI_UX_PREMIUM_POLISH_AUDIT.md`
**PRODUCTION:** NOT TOUCHED — **COMMITS:** NONE — **PUSHES:** NONE — **MIGRATIONS:** NONE — **DATA CHANGES:** NONE (one friend request created + withdrawn with zero residue verified)
