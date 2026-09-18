# Phase 7D / Phase F — Production Schema Verification + Migration Readiness Gate

**Date:** 2026-09-11
**Agent:** OpenCode (takeover/verification; read-only gate, no migrations applied, no code changed)
**Authority:** Philosophy → Original MDs → Approved Decisions → Approved Specs → Implementation → UX → Assumptions
**Final answer: BLOCKED** (see §1 and PHASE G GATE)

---

## 1. Executive verdict

**BLOCKED — Phase F cannot be promoted to PASS, and Phase G must not start.**

Three independent layers were verified:

1. **Code/build layer — PASS.** tsc 0 errors, lint 0 errors, build PASS, Playwright responsive QA 8/8 no-overflow, 0 5xx, epistemic re-check clean.
2. **Database layer — FAIL (missing).** None of the 8 Phase 7D migrations (`202609090001`–`202609090008`) is applied to the reachable Supabase database (all 5 probed objects → HTTP 404; `create_claim_request` absent from schema cache). Live Request-as-Claim lifecycle is not exercisable.
3. **Migration-safety layer — FAIL (would regress if applied as-is).** Draft migrations `202609090001` and `202609090002` rewrite the `discussion_messages` and `discussion_claims` views with stale predicates/columns, which would undo private-debate authorization hardening, drop moderation redaction (`is_moderated`, `[Hidden by moderator]`), drop `debate_side`/`question_id` from the claims view, and break the frontend contract. Additionally: `convert_message_to_claim` is blocked by the 5-minute message-edit trigger on any message older than 5 minutes (i.e. nearly every real Accept); the claim/argument tombstone updaters self-defeat against the rewritten immutability triggers; FK changes to `SET NULL` target `NOT NULL` columns; no DELETE RLS policy or delete RPC exists, so the deletion-lock machinery is uninvokable.

Net: even after the migrations are applied, Phase F would still need migration revisions first. Exact remediation is listed in §21.

---

## 2. Current repository state

- Branch `main`; HEAD `0223c70`; large **uncommitted** changeset preserved untouched: 65 modified files + untracked Phase 7D artifacts (8 foundation migrations, new components/routes/scripts). No git mutation performed this session (no reset/clean/checkout/stash; verified via `git status --short` / `git diff --stat` only).
- Working tree is identical in `src` to the Phase F `PASS WITH GAPS` state (my/pending/nested fixes intact). This session changed **zero** source, migration, or doc files except creating this report.
- Supabase CLI v2.106.0 present; local `supabase/config.toml` is local-only (`project_id = "Discora"`), no linked remote → CLI migration-history inspection against production is unavailable without owner-provided project ref/credentials. History therefore verified via REST probes + static file analysis (both documented below).
- `supabase/deploy_pending_migrations.sql` is a stale pre-Phase-7D bundle (debate-era fixes #23–#31); it does **not** include any `20260909*` migration. No consolidated Phase 7D deploy script exists.

---

## 3. Phase F implementation state

Unchanged from `PHASE_7D_PHASE_F_IMPLEMENTATION_REPORT.md` (PASS WITH GAPS): service hooks (`createClaimRequest`, `decideClaimRequest`, `convertMessageToClaim`, `getClaimRequestsForMessages`, `getMyClaimRequests`), React Query keys with `exact:false` prefix invalidation on both `aggregated` and `my` shapes, single aggregated banner UI with Accept/Skip/Decline + skipped/declined subtle states, per-message nested resolution, error/pending states, discussion + debate wiring. Frontend degrades gracefully when backend objects are absent (PGRST205-tolerant fetchers, empty maps, error toasts). Nothing in this gate contradicts that report; this gate adds the backend/safety findings below.

---

## 4. Repository migration inventory (202609090001–008)

| File | Purpose | Creates | Alters | RPCs | Destructive ops |
|---|---|---|---|---|---|
| `202609090001_claim_conversion_foundation.sql` | In-place message→claim promotion | `messages.converted_claim_id` + index | `messages_message_type_check` (+`claim`); **rewrites `discussion_messages` view** | `convert_message_to_claim(uuid,text,text)` | View rewrite (REGRESSES — §9); CHECK drop/add (safe, name verified) |
| `202609090002_claim_deletion_lock_foundation.sql` | 20-min configurable deletion lock, tombstone | `claim_deletion_config` (+seed 20), `claims.deleted_at/deleted_by` + index | drops `prevent_claim_deletion`; rewrites `enforce_claim_immutability`; **rewrites `discussion_claims` view**; rewrites 5 FK constraints | `enforce_claim_deletion_lock` (dead helper), `claim_delete_with_lock` | View rewrite (REGRESSES — §9); FK churn w/ exclusive locks; SET NULL onto NOT NULL cols (BROKEN — §9) |
| `202609090003_claim_requests_foundation.sql` | Aggregated Request-as-Claim | `claim_requests` + 4 indexes; view `claim_requests_aggregated` | — | `create_claim_request`, `decide_claim_request`, `get_claim_request_state` | None (purely additive). **SAFE** |
| `202609090004_discussion_arguments_foundation.sql` | Discussion arguments entity | `arguments` + 4 indexes + `deleted_at/deleted_by`; view `discussion_arguments` | — | `create_argument`, `retract_argument` (+2 dead helpers) | None structural, but tombstone self-defeats (BROKEN — §9); no delete RPC (gap) |
| `202609090005_reactions_foundation.sql` | Reactions (like/insightful/curious) | `reactions` + 4 indexes; view `reaction_aggregates` | — | `toggle_reaction`, `get_reaction_aggregates` (STUB returns `{}`) | None. **SAFE** (frontend uses the view, never the stub — verified, 0 callers of the stub in `src`) |
| `202609090006_saved_room_alias_foundation.sql` | Private per-user saved-room alias | `user_saves.alias` + partial index | — | `update_saved_room_alias`, `get_user_saves_with_aliases` | None. **SAFE** (refs `rooms.room_type` TEXT ✓, `has_room_access()` ✓, `discussions`/`debates` tables ✓ — all verified present) |
| `202609090007_epistemic_cleanup.sql` | Remove vote→reputation/penalty/bonus paths | — | rewrites `recalculate_user_reputation` (bonus removed) | drops 6 triggers + 6 functions (IF EXISTS) | Drops are the APPROVED cleanup; trigger/function names verified byte-identical to `202606100004`; `has_role_or_higher(admin)` reference resolves (§4 deps verified). **SAFE w/ backup** (behavior-changing by design; history preserved, no backfill) |
| `202609090008_homepage_vote_ordering_cleanup.sql` | Neutral homepage ordering | — | rewrites `get_my_understanding_evolved` (ORDER BY recency) | — | Low risk, but: omits `SET search_path` pin (hardening regression — must add); depends on `claims.deleted_at` (needs 002 first ✓ ordering ok); target function verified to exist (`202606170001:243`) |

Dependency map: `001` → base only. `002` → base (+`prevent_claim_deletion` names verified). `003` → `001` (uses `converted_claim_id`) + `debate_participants`. `004` → `002` (`claim_deletion_config`, `claims.deleted_at`) + base. `005` → base + `004` (argument target). `006` → `202606260001` (`user_saves`) + base. `007` → `202606100004/5` (names verified) + `202606040001` (role helper verified). `008` → `002` (`deleted_at`) + `202606170001` (function verified). Filename order = safe apply order **after** the §9 revisions.

Earlier relevant migrations inspected: `202606030003` (messages + edit-window trigger), `202606030004` (claims + immutability + `prevent_claim_deletion` + `created_by` trigger), `202606030006` (votes; `claim_votes.claim_id NOT NULL` verified), `202606040001/2` (role helpers verified), `202606100004` (reputation triggers verified), `202606110001` (message-type CHECK name verified), `202606120001` (`inquiry_items.target_claim_id NOT NULL` verified), `202606170001` (homepage RPC verified), `202606190001` (hardening), `202606210001` (claims/messages views + `has_room_access`), `202606220001` (`has_room_access` update), `202606240001` (messages view + moderation redaction), `202606260001` (`user_saves`), `202606270001` (winner/loser removal).

---

## 5. Database migration history

**NOT VERIFIABLE from this environment.** No linked remote project, no service-role key, no owner-provided DB credentials; `supabase_migrations` schema history is not exposed over the anon REST API. This is reported as a gap, not as evidence — per the gate rule, history was NOT relied upon. Actual-object inspection (§6) is the basis instead. Owner action: provide `supabase migration list` output (or dashboard migration history) to close this section before any apply.

---

## 6. Actual database schema state (read-only REST probes, anon key)

| Object | Expected from | Probe result |
|---|---|---|
| `claim_requests` (table) | 090003 | **HTTP 404 — absent** |
| `claim_requests_aggregated` (view) | 090003 | **HTTP 404 — absent** |
| `reaction_aggregates` (view) | 090005 | **HTTP 404 — absent** |
| `arguments` (table) | 090004 | **HTTP 404 — absent** |
| `claim_deletion_config` (table) | 090002 | **HTTP 404 — absent** |
| `create_claim_request` (RPC) | 090003 | **Missing from schema cache** (authenticated `dbcheck` probe, prior + current session) |
| `user_saves.alias` (column) | 090006 | **Absent** (`column user_saves.alias does not exist`, HTTP 400 on saves fetch) |
| Pre-7D objects (rooms, messages, claims, votes, inquiries, saves, homepage RPCs) | base history | Present and serving traffic (rooms/feeds/auth QA all functional) |

Conclusion: **zero of eight Phase 7D migrations is applied** to the reachable database. No drift *within* applied history is detectable from here (history itself unverified — §5); the drift is strictly repository-ahead-of-database.

---

## 7. Repository-vs-production drift

- Direction: repository ahead; production (reachable DB) behind by exactly the 8 Phase 7D foundation migrations. No evidence of partial application (all-or-nothing absent).
- Frontend already guards this state (PGRST205-tolerant fetchers → empty maps; error toasts on mutation failure) — verified live: request click fails gracefully, no crash, no 5xx.
- Second-order drift risk (future): if 090001/090002 are applied as drafted, they will *introduce* drift against the hardening-era views (detailed in §9). The revision must land before first apply.

---

## 8. Missing objects (complete list)

Tables: `claim_requests`, `arguments`, `reactions`, `claim_deletion_config`. Views: `claim_requests_aggregated`, `discussion_arguments`, `reaction_aggregates`. RPCs: `create_claim_request`, `decide_claim_request`, `get_claim_request_state`, `get_my_claim_requests` (note: `get_claim_requests_for_messages` / `get_my_claim_requests` exist only as *frontend* service functions over the view/table — there are no such DB RPCs, and none are needed), `convert_message_to_claim`, `create_argument`, `retract_argument`, `toggle_reaction`, `update_saved_room_alias`, `get_user_saves_with_aliases`. Columns: `messages.converted_claim_id`, `messages.message_type='claim'` CHECK value, `claims.deleted_at/deleted_by`, `arguments.deleted_at/deleted_by`, `user_saves.alias`. Triggers/policies/grants attached to the above: all missing with their objects.

---

## 9. Migration dependency / order analysis (BLOCKING findings)

Ordering by filename is correct **iff** the following revisions are made first. As drafted, three migrations are NOT safe to apply:

**F1 (CRITICAL — moderation/security regression). `090001` rewrites `discussion_messages` with a stale definition.** The latest pre-7D version (`202606240001`) selects through `has_room_access(m.room_id)` and carries moderation redaction (content CASE → `[Hidden by moderator]`, `is_moderated` boolean). The draft restores the old inline predicate (`public AND status<>archived OR created_by`) and drops both redaction and `is_moderated`. Effects if applied: moderator-hidden message content becomes visible again; `comment-item`'s `!message.isModerated` gate goes permanently true (actions reappear on hidden content); private-debate non-creator participants lose message reads; `moderation_queue` silently loses redaction. The rewrite must be merged: keep 240001's body + redaction + `has_room_access`, add only `converted_claim_id`.

**F2 (CRITICAL — debate + moderation regression). `090002` rewrites `discussion_claims` with a stale definition.** The latest pre-7D version (`202606210001:322`) includes `question_id`, `debate_side`, and excludes `resolved_hidden` claims via `has_room_access`. The draft drops all three. Effects if applied: debate claims lens loses side grouping, question linkage lost, moderator-hidden claims resurface. Same merge remedy as F1 (keep 210001's body + add `deleted_at/deleted_by`).

**F3 (HIGH — Accept path broken on real data). `convert_message_to_claim` vs 5-minute edit trigger.** `enforce_message_edit_rules` (BEFORE UPDATE on `messages`, `202606030003:158`) rejects *any* update when `created_at < now() - 5 min`. The conversion UPDATEs the message row → **Accept fails on every message older than 5 minutes** (i.e. virtually all real requests). Triggers fire under SECURITY DEFINER too — no bypass. The migration must exempt the conversion-marker update (e.g. early-return when only `converted_claim_id`/`message_type`/`updated_at` change) before the Accept path can work.

**F4 (HIGH — deletion lock unworkable). Tombstone vs immutability contradiction + missing invocation path.** `claim_delete_with_lock` (090002) and `argument_delete_with_lock` (090004) perform the tombstone via `UPDATE ... SET content='[deleted…]', is_retracted=true`, but the rewritten/new immutability triggers reject *any* `content` change → every soft-delete raises 'immutable'. Independently: no DELETE RLS policy exists on `claims`/`arguments`, and no delete RPC exists, so the BEFORE DELETE triggers are unreachable via PostgREST (deny precedes trigger) and only reachable via a future SECURITY DEFINER RPC that was never written. Deletion-lock is therefore not end-to-end in this migration set (correctly beyond Phase F, but must not be presented as shippable).

**F5 (MEDIUM — would error on real delete). FK `SET NULL` onto `NOT NULL` columns.** `claim_votes.claim_id` (`202606030006:156`) and `inquiry_items.target_claim_id` (`202606120001:16`) are `NOT NULL`; retargeting their FKs to `ON DELETE SET NULL`guarantees a runtime error on any real delete. Under the tombstone design real deletes never occur, making the change both unnecessary and hazardous (plus ACCESS EXCLUSIVE lock churn on hot tables). Recommendation: remove both FK alterations from 090002 (keep CASCADE; tombstone preserves rows by design). The `claim_evidence`/`claim_relations` revert already in the file is correct and must stay.

**F6 (LOW). `090008` omits `SET search_path`** on the recreated `get_my_understanding_evolved`, regressing the `202606190001` pinning discipline. One-line fix.

**F7 (LOW — functional inconsistency, fail-closed). Private-debate participant visibility.** `create_claim_request` correctly consults `debate_participants`, but `claim_requests_aggregated`, `reaction_aggregates`, `discussion_arguments` views (and the arguments select policy) use only `public OR created_by`. A participant in someone else's private debate can create a request/react/argument yet never see the aggregated state. No data leaks (fail-closed), but the feature is silently invisible there. Align the new views/policies with `has_room_access()` (which already encodes participant logic) during revision.

Non-findings (verified safe): CHECK-constraint rename path (name consistent since `202606110001`); `created_by` trigger interplay (RPC value equals `auth.uid()` — no-op); `has_role_or_higher('admin')`, `has_room_access()`, `get_my_understanding_evolved`, `rooms.room_type TEXT`, `discussions`/`debates` tables all resolve; 090007 drop-names byte-match `202606100004`; 090005 stub RPC has zero callers in `src`; 090006 references all resolve.

---

## 10. RLS / security analysis

Reviewed per object (static; live role-matrix testing impossible without backend objects):

- `claim_requests`: requester-own SELECT, author-of-message SELECT, authenticated INSERT with `requester_id=auth.uid()` (spoof-proof via trigger override), requester-own UPDATE. No anon access, no DELETE. Room isolation enforced in RPC (incl. private-debate participant check) and in the aggregated view's predicate. `requester_details` exposed to the message author only — no third-party identity leak. **Design PASS.**
- `arguments` / `reactions`: room-gated read, author-scoped write, anon excluded (views grant anon SELECT but predicates fail closed). **Design PASS** modulo F7.
- `user_saves.alias`: inherits per-user policies; RPCs `auth.uid()`-scoped. **Design PASS.**
- Views use `security_invoker=false` + explicit grants, consistent with the hardening era. New RPCs pin `search_path=public` (except F6) and revoke anon/public. **PASS.**
- Live negative testing (guest/member/author/non-author/private participant) could NOT be performed — no objects to test against. Marked NOT VERIFIED, blocked on apply.

---

## 11. Claim conversion safety

Design (090001 + frontend): promotion-RPC inserts a `claims` row copying content + `created_at`, sets `origin_message_id`, marks the message (`converted_claim_id`, `message_type='claim'`); message row stays (replies/threads preserved); author-only; type checks (`message` only, not question/system/claim); length 25–500 server-side; `already_converted` guard; same-room via trigger validation. No duplicate message; no evidence/argument destruction (nothing is deleted or moved). **Design PASS — except F3**, which makes the RPC throw on messages older than 5 minutes and must be fixed before the Accept path is real.

---

## 12. Claim request safety

Design (090003 + banner + hooks): authenticated-only; `requester_id` forced server-side; room + private-debate checks; self-request blocked; non-message/converted blocked; unique `(message_id, requester_id)` with upsert-to-pending (duplicate-safe, aggregation-preserving); author sees identities, others see counts; `decide_claim_request` is author-only, bulk-transitions pending rows, delegates Accept to the conversion RPC; UI renders exactly one card per message. **Design PASS.** No reputation/credibility/SoU/ranking/truth linkage anywhere in the request path (verified by code search). Live authorization testing NOT VERIFIED (blocked on apply).

---

## 13. Multi-requester aggregation status

**NOT VERIFIED live** (no rows can exist). Code-reviewed: unique constraint + `pending_count` aggregation + single-banner rendering + bulk decide-update are coherent for N requesters. Requires a two-identity browser test post-apply (§21).

---

## 14. Live lifecycle status

**BLOCKED (backend missing).** Re-ran `phase7d-phase-f-lifecycle.mjs` this session against a fresh production-server process: request button clicked, no state persists, Accept/Skip/Decline = 0, aggregation invisible — identical to baseline. Failure surfaces gracefully via error toast (no crash, no 5xx). No user content created, modified, or deleted by any probe this session (single RPC attempt failed at function lookup; all other probes were SELECTs).

---

## 15. Playwright results (direct Playwright, fresh `next start` process)

- Supplementary debate QA re-run: member login OK; debate (Reply=1, React=1, Request=2, Make=0, Accept/Skip/Decline=0, winnerLoserMentions=0, composer=1); discussion (Reply=12, React=12, Request=6, Make=0 with 7 pre-converted claim bubbles, Accept/Skip/Decline=0, winnerLoserMentions=0, composer=1). 8/8 room×viewport targets: **no horizontal overflow**. 0 5xx. Console errors = only the known backend 404/400 set (missing 7D objects + `user_saves.alias`), unchanged from baseline.
- Environment note (lesson recorded): an earlier QA attempt in this session failed with ChunkLoadError because the server process predated the fresh `next build`. Restarting `next start` resolved it; results above are from the clean process. No app code was implicated.

---

## 16. tsc result

`npx tsc --noEmit` → **PASS, exit 0, zero errors** (re-run this session; `src` unchanged since the Phase F PASS).

---

## 17. lint result

`npm run lint` → **PASS, 0 errors, 18 warnings**, all pre-existing (script + dead-code-adjacent unused vars). No new warnings introduced.

---

## 18. build result

`npm run build` → **PASS** (re-run this session; all routes generated, incl. debate `claims/sources/understanding` and discussion `sources/understanding`).

---

## 19. Epistemic safety result

Re-grepped `src` for `castEvidenceVote|computeCredibility|Winner|Loser|scorecard|consensus_bonus|CLAIM_AGREED` → **zero hits**. Prior session's wider sweep (votes/credibility/consensus/reputation paths, evidence-vote removal, stance-only display, SoU evidence-led state) stands uncontradicted — `src` is byte-identical since. Request-as-Claim adds no epistemic consumer. **PASS.** Residual legacy displays (unmounted intelligence/map consensus, SoU descriptive vote fields, evidence-section copy) remain Phase J/O scope, untouched.

---

## 20. Data / destructive-risk assessment

If the 8 migrations were applied **as drafted**, the destructive/dangerous surface is:

| Risk | Severity | Location |
|---|---|---|
| Moderation redaction loss on messages view (`is_moderated`, hidden-content CASE) | **CRITICAL** | 090001 view rewrite (F1) |
| Moderator-hidden claims resurface; `debate_side`/`question_id` dropped from claims view | **CRITICAL** | 090002 view rewrite (F2) |
| Private-debate participants lose message/claim reads (fail-closed breakage) | HIGH | 090001/090002 view predicates (F1/F2) |
| Accept/conversion throws on messages > 5 min old | HIGH | F3 (missing trigger exemption) |
| Claim/argument soft-delete always throws; no invocable path (no DELETE policy, no delete RPC) | HIGH | F4 |
| FK `SET NULL` onto `NOT NULL` (`claim_votes`, `inquiry_items`) → runtime error on real delete + exclusive-lock churn | MEDIUM | 090002 (F5) |
| `search_path` pin dropped on recreated homepage RPC | LOW | 090008 (F6) |
| Reaction/argument/request aggregates invisible to private-debate non-creator participants | LOW (fail-closed) | F7 |
| FK drop/add + CHECK rewrite lock contention on hot tables during apply | OPERATIONAL | 090001/090002 (needs window + `statement_timeout` plan) |

090003–090007(drop semantics by approved design; history preserved, no backfill) are otherwise safe. **No backup currently exists that this agent can verify; no rollback plan exists for the 7D set.** Both are required before apply (§23).

---

## 21. Exact recommended next action (in order, owner-gated)

1. **Owner decision:** acknowledge this gate (BLOCKED) and authorize a migration-revision pass — no apply yet.
2. **Revision pass (new superseding files `202609090009`–`...`, or in-place amendment of the untracked drafts only after confirming via `supabase migration list` that no environment has applied `20260909*`):**
   - R1: 090001 view = `202606240001` body + redaction + `has_room_access` + `converted_claim_id` column only.
   - R2: 090002 view = `202606210001` claims body + `deleted_at/deleted_by` columns only.
   - R3: exempt conversion-marker updates from `enforce_message_edit_rules` (or move the marker write out of the window-checked path) + regression test: convert a 1-hour-old message.
   - R4: fix tombstone-vs-immutability (exempt the `deleted_at`-transition update) AND add SECURITY DEFINER delete RPCs (claim + argument) with author + lock checks — or defer deletion UX explicitly and mark the triggers dormant.
   - R5: remove the `claim_votes`/`inquiry_items` FK alterations from 090002.
   - R6: add `SET search_path = public` to 090008's function.
   - R7: align new views/policies with `has_room_access()` for private-debate participants.
3. **Pre-apply verification:** `supabase migration list` vs repo; full logical backup; dry-run apply on a disposable preview branch (`supabase db push --dry-run` or branch); re-run this gate's §9 checklist post-revision.
4. **Apply** (owner-approved window): `090001`→`090008` (+ revisions) in filename order; capture `schema_migrations` afterwards.
5. **Post-apply verification:** re-probe §6 table (expect 200s), re-run `phase7d-phase-f-dbcheck`, then the full live lifecycle (§14 steps 1–24) + two-identity multi-requester test + 4-viewport responsive pass. Only then may Phase F be promoted to PASS.

---

## 22. Whether migration application is required

**YES** — for anything beyond the current frontend-only state. The Request-as-Claim lifecycle, reactions, arguments, saved aliases, deletion lock, and epistemic cleanup are all inert without their migrations. Frontend-only behavior (rendering, graceful degradation) is already verified and needs no migration.

---

## 23. Whether backup is required

**YES.** Full logical backup (supabase dashboard / `pg_dump`) immediately before any apply, plus a per-migration rollback note (all 8 are re-runnable-safe except the FK/CHECK rewrites, which need the §21 window). No backup was taken or verified by this agent.

---

## 24. Whether owner approval is required

**YES — explicitly, before both the revision pass (step 2) and any apply (step 4).** Behavior-changing drops in 090007 and the view/FK surgery in 090001/090002 additionally require the owner to accept the §20 risk table in writing.

---

## 25. Whether Phase F can be promoted to PASS

**NO — not on current evidence.** Promotion requires: (a) §21 revisions merged, (b) migrations applied + history recorded, (c) live request→Accept/Skip/Decline→in-place-conversion browser-verified incl. multi-requester aggregation and 4-viewport pass, (d) RLS negative tests (non-author decide rejected, self-request rejected, private-debate isolation). Current state satisfies none of (a)–(d). Phase F remains **PASS WITH GAPS** (code) / **BLOCKED** (backend + safety).

---

## 26. Whether Phase G is allowed to start

**NO.** Phase G (evidence + argument chronological nodes) builds directly on the unapplied/unrevised foundation (arguments table, reactions, claims-view integrity). Starting it now would stack new UI on a backend that does not exist and on views known to regress. See the formal gate below.

---

## PHASE G GATE

### BLOCKED — PHASE G MUST NOT START

Rationale: the Phase 7D foundation migrations remain unapplied (§6), and two of them as drafted would regress moderation redaction, private-debate authorization, and debate claims grouping if applied (§9, F1/F2), while the conversion path is blocked by the edit-window trigger (F3). There is no product-owner acceptance on record of shipping Phase F frontend-only. Default applies: BLOCKED.
