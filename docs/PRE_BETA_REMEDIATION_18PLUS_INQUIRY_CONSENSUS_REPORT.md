# Discora — Pre-Beta Remediation Report
## 18+ Enforcement + Public Inquiry Guest Visibility + Consensus Language

**Mode:** APPROVED IMPLEMENTATION BATCH (3 Product Owner decisions). Local Supabase + local app only. One forward migration. No production contact beyond the pre-existing read-only ledger state. No commits. No pushes.
**Date (UTC):** 2026-09-16
**Authorizing audit:** `docs/COMPREHENSIVE_PRE_BETA_PRODUCT_SECURITY_EXPOSURE_AUDIT.md` (F-AUTH-01 P1, F-AUTH-02 P2, F-EPIS-01 P2, F-EPIS-02 P3)

---

# 1. Scope

- Phase 1: server-side 18+ signup enforcement (Auth before-user-created hook + client attestation metadata).
- Phase 2: anonymous SELECT for public-room inquiry context (grants + narrowly-scoped anon policies; `debate_side_changes` deliberately excluded).
- Phase 3/4: consensus/spotlight copy reframed to community-stance language (presentation only; no logic, model, or feature changes).
- Phase 5: P3-02 audit-text reconciliation (status correction only).
- Explicitly untouched: SoU, votes, debates, friends, invitations, deletion, legal, moderation, Discovery Deck, SEO, notifications, audio, infrastructure.

# 2. Product decisions applied

1. **Public-room inquiries visible to guests** — implemented via anon SELECT grants + new `TO anon` policies gated on public, non-archived rooms. Private isolation intact (verified with rows present).
2. **Consensus presentation reframed, functionality kept** — Map lens, intelligence sections, spotlights all preserved; only user-visible wording changed to stance-descriptive language with an explicit not-truth note.
3. **Beta is 18+, enforced at the backend trust boundary** — checkbox UX preserved; `age_confirmed=true` metadata now travels with email signup; Auth hook rejects email signups lacking strict boolean-true attestation. OAuth residual documented (no pre-creation channel exists).

# 3. Files changed

1. `src/features/auth/services/auth-service.ts` — `signUp` options add `data: { age_confirmed: true }` (+ comment).
2. `src/features/discussions/components/discussion-intelligence.tsx` — "Consensus Level"→"Stance Distribution" (labels High/Medium/Low→Aligned/Mixed/Divided); "% average agreement"→"% Support · % Challenge" + "Participant stance — not a measure of truth or correctness."; "Emerging Consensus"→"Most Agreed-Upon by Participants". Logic, thresholds, sorting untouched.
3. `src/features/discussions/components/discussion-health.tsx` — "Most Supported:"→"Most Supported by Participants:", "Most Contradicted:"→"Most Challenged by Participants:", "Most Connected:"→"Most Connected Claims:".
4. `src/features/discussions/components/discussion-summary.tsx` — "Most Supported"→"Most Supported by Participants", "Most Contested"→"Most Challenged by Participants".
5. `supabase/config.toml` — enabled `[auth.hook.before_user_created]` → `pg-functions://postgres/public/enforce_signup_age_attestation` (local-only wiring comment).
6. `docs/COMPREHENSIVE_PRE_BETA_PRODUCT_SECURITY_EXPOSURE_AUDIT.md` — 5-line P3-02 status reconciliation (no evidence altered).
7. `docs/PRE_BETA_REMEDIATION_18PLUS_INQUIRY_CONSENSUS_REPORT.md` — this report (new).

# 4. Migrations created

- `supabase/migrations/202609190001_pre_beta_18plus_inquiry_visibility.sql` (ONE; forward-only; applied locally via `migration up`; ledger: remote through `202609140003`, file local-only). Contents: (a) `enforce_signup_age_attestation(event jsonb)` hook function (DEFINER, pinned search_path, fail-closed) + revokes + narrow `GRANT EXECUTE TO supabase_auth_admin` (added same-day pre-verification with inline NOTE after live 42501 proved GoTrue's runtime role needs it); (b) anon SELECT grants on `inquiry_items`/`inquiry_responses` + two new `TO anon` public-room-gated SELECT policies. No RLS weakening (no existing policy touched); no anon DML; no `USING (true)`.

# 5. 18+ enforcement implementation

- **Mechanism:** GoTrue v2.189.0 `before_user_created` pg-function hook (verified supported by live test, not assumed). Hook extracts `user_metadata.age_confirmed`; requires strict text equality with `'true'` (missing/false/strings/numbers/objects all reject). OAuth-created accounts (provider ≠ email or non-empty identities) are allowed — GoTrue's OAuth authorize flow carries no user metadata, so no pre-creation attestation channel exists; blocking them would disable approved Google registration with no recovery path. Documented residual + follow-up recommendation (post-signup attestation checkpoint), NOT silently resolved.
- **Fail-closed proof:** malformed payload shapes raise instead of allowing (strict `is distinct from 'true'` comparison; no boolean casting).
- **Tests (all local, synthetic `@example.invalid` identities):**
  - A. UI signup with checkbox → 200, user created, `raw_user_meta_data.age_confirmed=true` verified in DB. PASS.
  - B. Direct signup, no flag → 500 `age_attestation_required`, **zero auth rows created** (count query). PASS.
  - C. Direct signup `age_confirmed:false` → rejected, same code. PASS.
  - D. Direct signup `age_confirmed:"yes"` → rejected, same code. PASS.
  - E. Existing login (pre-hook user) → 200. PASS.
  - F. Login/logout/session + G. Terms/Privacy UX → unchanged, verified in browser (login/logout/redirects green; register copy intact).
- **Cleanup:** all hook-test accounts deleted via Admin API; leftover count 0 (verified).

# 6. Anonymous inquiry implementation

- **Design:** grant (`SELECT TO anon` on the two tables) + new `TO anon` RLS policies gated on `rooms.visibility='public' AND status<>'archived'` (explicit predicate, mirrors `has_room_access` for the anonymous case). Existing `TO authenticated` policies untouched. `debate_side_changes` excluded (owner-only history; guests have none).
- **Authorization matrix (all live-verified):** guest public-room item read 200+row; guest private-room read 200 `[]` **with rows present**; guest responses 200 `[]`; authenticated reads unchanged (200); RLS still blocks cross-user/room access; no anon INSERT/UPDATE/DELETE (no grants, no policies).
- **UI proof:** guest SoU lens renders "1 Inquiries Active" + "1 targeted inquiry open for this claim" (desktop 1440 + mobile 390, 0 product errors). Fixture inquiries removed afterward (DELETE verified).

# 7. Consensus/stance wording changes

Per §3 (files 2–4). Thresholds, sorting, vote model, and SoU inputs byte-identical in behavior; only user-visible strings changed, plus one concise disclaimer line. Dead-code discovery: `MapTab` (and thus the intelligence/health/summary sections) currently has **zero active callers** — the reframed copy is unreachable in the live app today, so live impact is nil while future use is pre-aligned. Reported as-is (no remount attempted; that would be a product change).

# 8. Spotlight wording changes

Per §3 (files 3–4). Same dead-code note applies (rendered only inside unmounted `MapTab`). Counts/semantics unchanged.

# 9. Report inconsistency reconciliation

Comprehensive audit claimed both "P3-02 VERIFIED FIXED" (§24 table) and "4 unpinned DEFINERs remain" (§7/§9/§12/§27). Live re-query: all four show `search_path=public, pg_temp`. Resolution: the fixed statement is correct (migration 170001); the five stale lines were corrected to match, with an inline pointer to §24. No evidence altered; no other text touched.

# 10. Security verification

- Hook permission: GoTrue runtime role `supabase_auth_admin` holds the sole non-owner EXECUTE (clients revoked); hook failures fail closed (signup 500, no account).
- Anon surface: SELECT-only on 2 tables, room-gated policies; DML absent; private rows proven invisible with rows present.
- Grants audit re-run: no new client DML anywhere; debates UPDATE still grantless; all public tables RLS-enabled.
- Copy changes: presentation-only; no new data flows, no SoU/vote inputs touched (28/28 unit tests green).

# 11. Admin regression verification

No admin code, RPC, policy, or grant touched in this batch. Prior four-layer boundary proof (URL 404-rewrite, RPC 403s, DEFINER+role-guard catalog, owner-guard UI) stands unmodified. Admin RPC list unchanged (no new functions added except the Auth hook, which is not client-invocable: revoked from anon/authenticated/public).

# 12. Browser QA

Real Chromium (MCP-driven; no scripted suite in repo): register page (checkbox, Terms/Privacy, 0 errors) → UI signup success message → metadata verified in DB → account deleted; guest SoU lens with inquiry chips (desktop + mobile); discussion room, debates feed, search, friends, settings, profile timeline re-smoked with 0 product errors (one 403 from a deleted test user's stale logout call — environmental artifact of cleanup, not product). Private debate gate intact (generic shell, no leak).

# 13. Mobile QA

390×844: register form, SoU lens with inquiry context, profile timeline — stacked, labeled, working links, mobile nav; no overflow/clipping markers in snapshots (snapshot-level; no programmatic measurement in harness — stated).

# 14. Tests and results

- TypeScript: exit 0, 0 errors. Lint: 0 errors, 44 warnings (pre-existing baseline). Build: exit 0, 29 routes. Vitest: 28 passed; 1 suite unimportable (`@playwright/test` absent — pre-existing environmental).
- Hook matrix A–G: all PASS (B/C/D rejected with zero ghost rows; A accepted with flag persisted; E–G intact).
- Anon matrix (7 probes): all PASS. Authenticated regression probes: PASS.
- No Playwright package install performed (would modify package.json/lock); interactive real-browser flows used instead.

# 15. Philosophy regression

- SoU: unchanged code + semantics; unit tests green; UI copy untouched and clean.
- Votes: still stance-only labels/counts; intelligence percentages now explicitly "Support · Challenge" + not-truth note.
- Map: functionality preserved; presentation reframed per approval; dead-code status documented (no remount).
- Debates/reputation/friends/sharing/AI: untouched; prior alignment stands.
- Feature richness preserved: zero removals (only wording + one narrow grant + one hook).

# 16. Remaining limitations

1. **OAuth signup attestation residual:** Google/OAuth signups (UI OneTap/button included) carry no server-verifiable 18+ attestation — no pre-creation channel exists in GoTrue OAuth. Recommended follow-up: post-OAuth attestation checkpoint (new product UX — needs Owner approval) or accept UI-only gating for OAuth. No bypass added by this task; email path fully closed.
2. Dead-code Map/intelligence surfaces (wording pre-aligned, unreachable today).
3. QA residue unchanged (structurally undeletable rows; `qa-verify-*` labeled; this phase added zero net rows — hook-test and inquiry fixtures fully removed, verified counts 0).
4. Production behavior/grants, SMTP/OAuth/DNS/frontend, monitoring, counsel review — still with Product Owner (unchanged).

# 17. Production status

PRODUCTION NOT TOUCHED — no connection, queries, migration applies, deploys, DNS, Auth, Storage, SMTP, or OAuth changes of any kind. Ledger proves remote still through `202609140003`.

# 18. Final verdict

All three approved decisions implemented and verified live; philosophy intact; regressions green; limitations explicitly bounded. **READY FOR FINAL UI AUDIT** (the OAuth-attestation follow-up is recommended alongside, not ahead of, the scheduled polish phase).

---

**REPORT:** `docs/PRE_BETA_REMEDIATION_18PLUS_INQUIRY_CONSENSUS_REPORT.md`
**COMMITS:** NONE — **PUSHES:** NONE — **MIGRATIONS (local-only):** `202609190001_pre_beta_18plus_inquiry_visibility.sql`
