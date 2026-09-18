# Discora — SoU Current-State + AI Technical Feasibility Audit

**Mode:** AUDIT ONLY. No code, migrations, data, RLS, RPC, UI, dependency, or behavior
changes made. No AI calls issued. No secrets printed. No commits/pushes. Production
untouched. Local environment: read-only inspection + one read-only browser session.

---

## 1. Executive Summary

SoU **already exists** as a deterministic, client-side, evidence-direction classifier
(`deriveStateOfUnderstanding` + `StateOfUnderstanding` UI + debate per-side reuse):
per-claim Supported/Contested/Unresolved buckets with counts, empty/framing states,
and explicit anti-truth/anti-winner copy. There is **no backend assessment, no
persistence, no history, and no AI anywhere** — zero AI SDKs, zero AI services, zero
AI routes, zero workers/cron/queues, no embeddings/pgvector (tsvector search only).
The room data model already contains every input an AI assessor needs (claims,
evidence with directions, claim relations, questions, inquiries, arguments, positions,
side changes, retractions). **Feasibility: YES WITH CONSTRAINTS** — one server-only
Gemini integration + one assessments table + lazy reassessment is sufficient; no new
infrastructure class is required. Two hard constraints shape the recommendation:
(1) prior approved docs (4A/7D/7E/7F) explicitly rejected LLM synthesis for SoU —
flagged as a decision-lineage item in §25, honored by keeping AI output structured
and extractive; (2) no scheduler exists (no pg_cron) — reassessment must be lazy/
on-read, not cron-driven. **Verdict: B.**

## 2. Product Definition Used

Task §2 (Product Owner-approved): room-level, dynamic, backend-driven, automatically
assessed, AI-assisted where feasible, explainable, non-authoritative; states
SUPPORTED/CONTESTED/UNRESOLVED with SUPPORTED≠TRUE etc.; participants never choose
SoU. No approved SoU specification document exists in the repo (searched) — §2 of the
task is the authority, read against Terms §"State of Understanding" ("Algorithmic
syntheses categorizing discussion nodes into areas of support, contestation, and
unresolved inquiry WITHOUT imposing definitive conclusions, scorecards, or truth
scores" — binding product language this audit treats as the wording contract).

## 3. Current SoU Implementation

- `src/features/discussions/components/understanding-utils.ts` — `deriveStateOfUnderstanding`
  (pure function): active claims (excludes retracted/deleted) bucketed per claim —
  contradicting>0 → contested; else supporting>0 → supported; else unresolved;
  open questions (zero answering claims) listed; evidence coverage %; inquiry/argument
  counts attached as context. Votes computed but **explicitly never decide state**
  (code comments say so). `claimRelations` accepted but **never used** in classification.
- `state-of-understanding.tsx` — three-pillar UI (Supported by Current Evidence /
  Contested / Unresolved Front) with per-claim reason strings, citation/domain chips,
  inquiry/argument badges, click-through Inspect navigation, mobile segmented control,
  progressive disclosure, loading + framing-stage empty states. Copy is careful
  ("Deterministic synthesis…", "backed by cited sources", never truth language).
- Debate reuses the same classifier per side (`argument-evidence-overview.tsx`).
- Gaps vs §2: client-side only (useMemo over fetched room data), no backend row, no
  history, no room-level rollup (only per-claim buckets + counts), positions/side
  changes and claim relations not consumed, no AI.

## 4. Current Claim/Evidence/Reasoning Model

- `claims`: content, claim_type, question_id (question linkage), debate_side,
  origin_message_id, identity_mode, is_retracted, deleted_at/deleted_by. No
  `epistemic_status` column exists anywhere in the schema — the admin modal
  (`admin-private-room-modal.tsx:214`) and the 130001 RPC select a phantom field
  (dead read; pre-existing, out of scope).
- `evidence`: content, evidence_type, source_id, room-scoped; `claim_evidence`
  carries direction (support/contradict/context); `sources` deduped via RPC.
- Reasoning has no dedicated structure (lives in claim/argument prose) — acceptable:
  the classifier keys off directions, not prose quality.
- `questions` (open exploratory) vs `inquiry_items` (claim-targeted, with status +
  responses) both exist; only counts feed SoU today.
- `arguments` (stance supporting/challenging) exist for debates; counted, not
  decisive. `claim_relations` (supports/contradicts/refines, CHECK-enforced) exist
  but are ignored by the classifier — the largest unused epistemic structure.
- `claim_votes`/`evidence_votes` exist; unused by SoU (correct). `formatCommunityStance`
  is dead code (defined, never rendered) — votes surface nowhere.

## 5. Current Room-Level Data Model

Room discourse is fully retrievable per room: views `discussion_claims/evidence/
questions/arguments/claim_relations/messages` + `inquiry_items` + `debate_participants`
(side/joined/removed) + `debate_side_changes` (previous/new/reason — position-change
history exists) + retraction/deletion flags. No room-level state field, no SoU field,
no SoU history, no AI analysis persistence, no event/change log (only admin +
reputation event tables, neither room-scoped). Reads are owner/member-scoped RLS
through React Query (30s–5min staleTime, mutation-driven invalidation — no event bus).
Any backend assessor must therefore bring its own dirty-tracking; service-role reads
must explicitly re-enforce room-visibility equivalence (private rooms).

## 6. Existing AI Infrastructure

Essentially absent: no provider SDK in `package.json` (supabase/ssr, react-query,
zod, sentry only — zod is the one reusable primitive for output validation), no AI
service/route/hook/component, no edge functions, no vercel.json, no cron workers or
queues (pg_cron NOT installed; pg_net + vault only), no embeddings/pgvector (tsvector
search only), realtime used solely for typing presence. Only traces: `GEMINI_API_KEY`
name in `.env.example`/docs (server-only by convention; value never present in repo),
and `05_SYSTEM_ARCHITECTURE.md` plans Gemini for source summaries/duplicate detection/
moderation/content analysis — none built. Sentry provides error observability only.
Supabase MCP unavailable for this audit (docker/CLI used instead — equivalent for
schema verification; no production access exists or was used).

## 7. AI Feasibility Verdict

**YES WITH CONSTRAINTS.** The data model is complete, the API surface (Next.js routes
+ Supabase) is sufficient, and one new integration (server-only Gemini JSON mode) plus
one table covers the approved model. Constraints: (a) no scheduler — lazy/on-read
reassessment with cooldown, not cron; (b) no vector store — unnecessary (structured
extracts fit in context; tsvector covers search); (c) prior-doc lineage (§25) bounds
AI to structured, extractive, non-authoritative output. Nothing else must be bought,
installed, or built as infrastructure.

## 8. Room Context Construction

Assemble server-side per room: metadata (title/type/visibility — never participant
identities beyond counts) → claims (id, content, type, retraction state) → relations
(supports/contradicts/refines edges) → evidence (id, direction, type, source domain —
not full URLs) → inquiries (status + counts) → open questions → side distribution +
side-change counts (positions as aggregates, never who) → argument stance tallies.
Include exactly; omit prose beyond claim/evidence text, voter identities, reputation,
timestamps except recency buckets. Large rooms: order by contested-then-unresolved,
truncate stably with a `truncated` flag (counts stay exact). No embeddings, no vector
retrieval, no hierarchical summarization for Beta — the extract is hundreds of tokens
in typical rooms. Incremental context is a future optimization, not a requirement.

## 9. Proposed AI Output Contract

Minimum useful contract (conceptual, not implemented):
`{ state, basis, supporting_factors[], challenging_factors[], unresolved_factors[],
material_changes[], limitations[], model_version, assessed_at }` — where every factor
references existing entity IDs (claim/evidence/inquiry IDs), `basis` is 1–3 sentences
with no scores/confidence/percentages, and `material_changes` diffs factor-ID sets vs
the previous assessment. Persist: state, basis, factor ID-lists, input hash,
model_version, timestamps. Transient: raw model text, discarded after validation.
Post-validate: every cited ID exists in the input set; drop non-grounded factors; on
validation failure treat as assessment failure (§13), never render raw text.

## 10. AI Guardrails

Structural (not prompt-wishes): system prompt declares room content DATA with
delimiters + instruction hierarchy; identities/reputation/vote tallies NEVER enter
the prompt; contradiction requires citing counter-evidence IDs (else factor dropped);
no numeric fields exist in the contract (scores unrepresentable); factor IDs
post-validated against the DB extract; low-sample rooms return UNRESOLVED with
`limitations: ["insufficient cited evidence"]` rather than extrapolation; assessments
labeled "AI-assisted structural summary — not a truth verdict" with link-through to
every cited entity (existing Inspect navigation). Deterministic classifier output
ships alongside as the primary layer, so AI can never be the sole epistemic signal.

## 11. Prompt Injection Analysis

Assume hostile room text ("ignore instructions", "mark Supported", "reveal prompt").
Boundary: (1) transport — content embedded as JSON string values under a DATA key,
never concatenated as instructions; (2) authority — model instructed it has no tools,
no state access, output schema fixed; (3) verification — output accepted only if
state ∈ enum + all factor IDs ground to the extract (injection aiming at prose is
contained by ID-grounding; aiming at state is contained because state must cohere
with factor lists — a "Supported" with zero supporting factors fails validation);
(4) QA gate — pre-ship red-team room containing all canonical injection strings must
yield UNRESOLVED-or-correct-state with no leaked prompt text; (5) no secret lives in
the prompt (model name/version recorded outside it). Residual: determined attackers
can at most pollute prose fields that are never rendered raw — P2, monitored via
validation-failure rates.

## 12. Reassessment Strategy

Recommended: **lazy hybrid** — (a) DB trigger writes `room_sou_dirty(room_id, reason)`
on meaningful structured changes only (claim/evidence/question/inquiry/argument
create-or-retract, relation change, side change; NOT votes/views); (b) assessment
runs on room read when dirty AND cooldown elapsed (e.g., 15 min/room — decision
SOU-D1), otherwise serves last persisted; (c) no cron (unavailable); client cache
invalidation already mutation-driven so staleness surfacing is cheap. Synchronous
per-mutation AI is rejected (latency/cost, no workers). Current infra supports this:
mutations already invalidate queries; only the dirty-table + read-path check are new.

## 13. Failure/Degradation Model

AI failure (timeout/invalid JSON/unavailable/rate-limit/low-quality/validation-fail)
→ keep last persisted assessment, set `reassessment_pending`, record failure metadata
(attempt count, error class, no secrets); UI shows deterministic layer + "AI summary
temporarily unavailable" — **never** default to SUPPORTED, never hide the citation
structure. Insufficient context → UNRESOLVED with limitations (a valid assessment,
not a failure). Stale assessments carry visible `assessed_at` + staleness note.

## 14. Human Judgment Boundary

Explainability without essays: basis ≤3 sentences + factor chips that deep-link to
claims/evidence/inquiries (existing navigation), full underlying discourse one click
away, deterministic per-claim table always visible. Participants keep forming
understanding from primary material; SoU is an index, not an oracle. No manual SoU
override (per §2), no appeal flow needed (nothing authoritative is asserted).

## 15. Low-Sample / Maturity Analysis

Current code already gates subtly (`hasSufficientData`, "framing stage" copy) with no
scores — keep exactly this pattern. Participant count must not feed assessment
(enforced structurally: counts never enter the prompt). Maturity stays a copy-level
concern (framing/developing/mature wording driven by data-presence gates), never a
number, never ranked. No new tables needed for Beta subtlety.

## 16. Privacy/Security Analysis

Minimum secure boundary: server-only Next.js route, service-role reads with explicit
per-room visibility equivalence (private-room content never leaves the server except
as the member-visible assessment via RLS-mirrored policies on new tables keyed to
`has_room_access()`); API key server-env only (existing convention); prompts never
logged (Sentry scrub); responses persisted only as validated contract; caches keyed
(room_id, input_hash) with no cross-room prompts; deleted/inactive users excluded
from assessment reads; no assessment content in OG/metadata (private pages already
generic+noindex — verified pattern).

## 17. Performance/Cost Analysis

Frequency: on-read-when-dirty with per-room cooldown → bounded by room read traffic,
not write traffic; no per-message triggers. Snapshots: the persisted assessment IS
the snapshot (input hash included for diffing). Incremental analysis unnecessary at
Beta scale. Context: structured extracts (small); truncation policy covers large
rooms. Caching: assessment row + HTTP/client query caching already in the stack.
Beta risk: concurrent first-reads stampeding one assessment — mitigated by cooldown
+ single-flight (in-progress marker row). No scale optimization beyond this is
warranted.

## 18. Current UI Analysis

Debate SoU lens verified live (empty state, per-side cards, "does not score sides or
declare winners" copy — exemplary). Discussion SoU code-verified (same component):
consistent Supported/Contested/Unresolved terminology, evidence-coverage badge (a
percentage OF CITATION COMPLETENESS, not truth — acceptable but watch wording),
inquiry/argument context chips, mobile segmented control, conversation remains the
default lens (conversation-first preserved). No AI signals exist (nothing to
misattribute). No overload: progressive disclosure + 2-item default. No truth/
consensus/AI-authority implications found; statusReason strings are citation-
descriptive. Populated-room rendering marked CODE-VERIFIED (no fixture data created
per audit constraints — no test rows written).

## 19. Discovery Deck Interaction

"Discovery Deck" is an educational onboarding modal (model/sandbox/formats/interests)
— no ranking, no signals, no SoU confusion. Home surfaces: recency-ordered featured
inquiries (public-or-owned, open/responded) + personal engagement/saves — verified no
popularity/engagement scoring in surfacing RPCs. Vote-display helper exists but is
dead code (never rendered). Risk: NONE FOUND. Note: if future discovery ever ranks by
"activity," re-audit against SoU confusion — not the case today.

## 20. SEO/AI Discoverability Implications

Public SoU lenses render state labels + counts that external crawlers/AI could
misread as truth verdicts. Requirements for the future dedicated audit: (1) keep and
extend the existing disclaimer copy ("backed by cited sources," "does not score…
declare winners") to every public SoU surface; (2) no ClaimReview/fact-check
structured data (none exists — keep it so); (3) verify noindex/canonical behavior on
understanding routes; (4) Terms wording (§83-85) already draws the correct line —
any AI-generated basis text must stay inside it; (5) consider `Unresolved`-default
framing for low-sample rooms so snapshots never imply settled truth.

## 21. Architecture Options (max 3)

**A. Server route + Gemini JSON + assessments table (RECOMMENDED).** Components: Next.js
route handler, Gemini structured output, zod validation, `room_sou_assessments` +
dirty-tracking, existing UI extended with assessment panel. Flow: read → dirty? →
assess → persist → render with basis + linked factors. Pros: smallest new surface,
uses existing stack, explainable, private-safe. Cons: needs API key + one integration;
lazy staleness (bounded by cooldown). Cost: pay-per-assessment, tiny contexts.
Epistemic risk: low (ID-grounded, deterministic layer primary).
**B. Deterministic-only hardening (no AI).** Consume claim_relations + side tallies in
the classifier, add room-level rollup RPC/view. Pros: zero AI risk, no decisions,
shippable now. Cons: doesn't deliver "AI-assisted" §2 wording; prose reasoning
unaddressed. **Recommend as Phase 1 regardless** (strict improvement, no new authority).
**C. Worker/queue/cron pipeline.** Rejected for Beta: no scheduler exists, operational
cost unjustified, same epistemic output as A.

## 22. Recommended Architecture

A, preceded by B. Phase 1 (no Product Owner decision needed): wire relations/positions
into the deterministic classifier + room-level counts view; fix the phantom
`epistemic_status` reads. Phase 2 (after §24 decisions): server route + Gemini
(`responseMimeType: application/json`, zod-validated, timeout+retry, model pinned +
logged), assessments table with input-hash idempotency + staleness flags, lazy
dirty-gated reassessment, UI assessment panel with linked factors + disclaimers.
Model role: **B (extract-then-classify over the deterministic structure)** — reliability
and explainability over complexity; raw-text summarization rejected (hallucination
surface), direct classification rejected (duplicates existing code).

## 23. Security Threat Model

1. Prompt injection → P1 (mandatory §12 design; contained by ID-grounding + validation).
2. Data exfiltration via AI (prompt/logs/cache) → P1 (server-only, scrubbed logging,
   keyed caches, no raw prose persistence).
3. Private-room leakage (assessment/RLS/key scope) → P1 (visibility-equivalent reads,
   member-only assessment RLS, generic public metadata).
4. Output manipulation (state/prose steering) → P2 (factor-coherence validation).
5. Repetitive-content stuffing → P2 (dedupe by entity ID; counts never enter prompt).
6. Coordinated manipulation (mass low-quality claims) → P2 (binding to cited evidence;
   no head-counting anywhere).
7. Hallucination → P2 (ID-grounding drops ungrounded factors; deterministic layer stays).
8. Truth-authority misread → P2 (contract has no scores; UI disclaimers; Terms-aligned).
9. API key exposure → P1 if mishandled (server-only convention exists; verify at build).
10. Cost/DoS abuse → P2 (cooldown + dirty-gating + single-flight; no user-triggered sync path).
11. Stale exploitation → P3 (assessed_at + pending flags visible).
12. Explanation leakage (basis reveals private content) → P2 (member-only RLS on
    assessments; basis references linked entities only).

## 24. Product Decisions Required

SOU-D1 assessment cadence/cooldown — WHY: bounds cost/staleness. RECOMMEND: 15-min
per-room lazy cooldown. IF DEFERRED: default 15 min ships; tunable later.
SOU-D2 history depth — WHY: storage/UX. RECOMMEND: keep last 10 assessments/room,
UI shows current + "what changed" only. IF DEFERRED: unbounded growth risk; decide
before build.
SOU-D3 explanation detail/length caps — WHY: overload vs usefulness. RECOMMEND:
basis ≤3 sentences, ≤6 factors per pillar. IF DEFERRED: model verbosity unbounded.
SOU-D4 model + fallback — WHY: availability/quality. RECOMMEND: pinned Gemini
flash-class model, deterministic-only fallback (already exists). IF DEFERRED:
cannot build the integration.
SOU-D5 large-room truncation policy — WHY: context bounds. RECOMMEND:
contested/unresolved-first stable truncation with flag. IF DEFERRED: unbounded cost.
SOU-D6 assessment visibility in private rooms — WHY: privacy. RECOMMEND:
members-only (technical default). IF DEFERRED: withholding the feature from private
rooms is the only safe default.
SOU-D7 Phase-1 deterministic scope (relations/positions wiring) — WHY: changes
visible classification. RECOMMEND approve (strict improvement, no new authority).
No numeric epistemic thresholds are requested or needed — refused by design.

## 25. Implementation Readiness

Ready: data model, API patterns, UI shell, RLS conventions, validation primitive
(zod), error observability. Missing: one AI integration, two tables
(`room_sou_assessments`, `room_sou_dirty`), one route, assessment panel copy.
Decision-lineage flag (no silent rewrite): 4A/7D/7E/7F docs rejected LLM synthesis
for SoU on determinism/authority grounds; this audit's §2 authority
(Product Owner: "AI-assisted where technically feasible") postdates them, and the
recommended architecture honors BOTH by restricting AI to structured, extractive,
ID-grounded analysis with the deterministic layer primary — natural-language verdict
generation remains rejected. Product Owner should explicitly confirm that reading.

## 26. Final Verdict

**B — READY WITH SPECIFIC PRODUCT DECISIONS REQUIRED.** Technically feasible now
(YES WITH CONSTRAINTS); implementation must wait on SOU-D1–D7 and confirmation of
the §25 lineage reading. No technical blocker (C) and no product/architecture
breakdown (D) found.
