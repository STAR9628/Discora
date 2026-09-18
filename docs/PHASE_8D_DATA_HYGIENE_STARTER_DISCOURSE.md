# Discora — Phase 8D: Data Hygiene, Curated Starter Discourse & Founding Participant Implementation Report

**Status:** Complete  
**Date:** September 13, 2026  
**Environment:** Production Remote Database (`supabase db push`) & Next.js Local Dev (`http://localhost:3003`)  
**Authority Reference:** `docs/DISCORA_AGENT_GOVERNANCE.md`, `docs/00_MASTER_CONTEXT.md`, `docs/01_PRD.md`, `docs/02_FEATURE_REGISTRY.md`, `docs/04_DATABASE_DESIGN.md`, `docs/PHASE_8C_BETA_READINESS_RECONCILIATION_AUDIT.md`

---

## 1. Executive Summary

Phase 8D transitions Discora from an active development/testing workspace into a clean, trustworthy beta discourse environment. Prior to Phase 8D, the database contained developer scratch residue (casual room titles, nonsensical assertions, unverified dummy URLs, and broken test links) alongside legitimate discussion topics.

Under strict surgical safety gates and explicit product owner approvals, Phase 8D accomplished:
1. **Surgical Hard Purge of Scratch Residue:** Exactly 8 scratch rooms, 14 scratch claims, 4 scratch evidence items, and 4 scratch sources were purged using immutable UUID manifests. All 3 pre-existing legitimate rooms were preserved intact.
2. **Seeding a High-Credibility Starter Discourse Catalog:** Seeded 6 comprehensive open discussions and 3 structured debate rooms across 6 core domains (Technology, Science, Education, Philosophy, Culture, Ethics). Every single evidence item cites genuine institutional research (C2PA, NIST, OSF/Science, UNESCO, EU DSA, Cambridge/Fishkin, WHO, ICRC, ACM, Nature).
3. **Tasteful Founding Participant Recognition:** Implemented `is_founding_member` on `public.profiles` defaulting strictly to `false` (no arbitrary date triggers or bulk auto-grants). Client self-promotion is blocked at the database engine level via `prevent_founding_member_self_update`. The UI presents a quiet, refined badge on the user profile header without polluting conversational message feeds.
4. **Epistemic Neutrality Preserved:** Zero artificial engagement (no fake users, simulated comments, simulated votes, or manufactured consensus). Motions and premise descriptions are strictly balanced.
5. **Production Verification:** Validated via automated test suites, Playwright across 4 viewports (1440px, 834px, 390px, 375px), TypeScript compiler (`0 errors`), and ESLint (`0 errors`).

---

## 2. Scratch Deletion Safety & Execution Record

### Safety Gates Applied
- **Manifest-Driven Execution:** Deletion was strictly gated to exact primary-key UUIDs. Zero substring or text pattern queries (`like '%test%'`) were used.
- **Two-Stage Reconciliation:** Pre-deletion dry runs and discrepancy analysis resolved the claim count distinction in `should-ai-generated-content-be-clearly-labeled-online` (14 scratch claims purged, exactly 5 legitimate claims preserved).
- **Trigger Deactivation/Reactivation Wrapper:** During the deletion transaction, table-level deletion lock and soft-delete triggers (`claim_delete_with_lock`, `prevent_claim_evidence_deletion`, `prevent_evidence_deletion`, `prevent_source_deletion`, `argument_delete_with_lock`, `prevent_question_deletion`) were safely suspended and immediately restored upon completion.

### Purge Manifest
| Entity Type | Purged Count | Key Entities Purged |
|---|---|---|
| **Rooms** | 8 | `QA Private Debate - Non-Member Access Check` (`fafe75a8-...`), `test private debate` (`74fe3eb0-...`), `testtest` (`db98a69e-...`), `ai vs human` (`b65a507f-...`), `Testing Phase 7D Section Nav` (`e585f67b-...`), `Test Debate Title 1772619468087` (`e5352c80-...`), `Test Debate Title 1772619491689` (`7bba7112-...`), `Test Debate Title 1772619503417` (`26a79856-...`) |
| **Claims** | 14 | 14 test claims in room `a3c8aacd-...` (`2a36b334-...`, `41d4c2df-...`, `45089e50-...`, `52f01f01-...`, `6222b404-...`, `6d11f057-...`, `7ad31613-...`, `8638b97d-...`, `a6015694-...`, `a91f5e8f-...`, `bc551fa1-...`, `be2c1598-...`, `c92257d0-...`, `f58ee9e7-...`) |
| **Evidence** | 4 | Scratch evidence (`a03c2ff5-...`, `c62da7e5-...`, `d438cf18-...`, `f41249b6-...`) |
| **Sources** | 4 | Scratch sources (`406cce7d-...`, `7c02b28c-...`, `9f7a73a3-...`, `d8cefe00-...`) |

### Preserved Legitimate Discourse
1. `should-ai-generated-content-be-clearly-labeled-online` (`a3c8aacd-...`): 5 legitimate claims, 2 evidence items, 2 questions preserved.
2. `ai-is-superior-to-humans` (`a13dd940-...`): 1 claim, 0 scratch evidence preserved.
3. `autonomous-systems-and-human-oversight-in-deep-decision-making-1` (`43469cdd-...`): Active legitimate debate preserved.

---

## 3. Curated Starter Discourse Catalog

The platform catalog now features exactly 12 active public rooms (7 Discussions, 5 Debates) covering 6 distinct knowledge domains.

### 3.1 Curated Open Discussions (6 New + 1 Preserved)
1. **Technology — Synthetic Provenance & Watermarking:**
   - *Slug:* `should-synthetic-provenance-be-required-for-ai-media`
   - *Opening Statement:* Whether verifiable digital content provenance standards (such as C2PA) and cryptographic watermarking should be legally mandated for publicly distributed synthetic media.
   - *Structure:* 2 Claims, 1 Institutional Evidence, 1 Open Exploration Question.
2. **Science — Replication Crisis in Empirical Research:**
   - *Slug:* `how-should-scientific-institutions-respond-to-replication-crisis`
   - *Opening Statement:* Evaluating systemic reforms (registered reports, mandatory data and code sharing, replication grants, tenure evaluation restructuring) to restore empirical reproducibility across social and life sciences.
   - *Structure:* 2 Claims, 1 Peer-Reviewed Evidence (Center for Open Science / Science), 1 Open Question.
3. **Education — Formal Curricula in the Age of Generative AI:**
   - *Slug:* `what-should-education-prioritize-in-the-age-of-generative-ai`
   - *Opening Statement:* How primary and secondary curricula should reallocate instructional focus between foundational procedural skill acquisition, high-order critical verification, and prompt engineering.
   - *Structure:* 2 Claims, 1 Institutional Evidence (UNESCO Guidance on Generative AI in Education), 1 Open Question.
4. **Philosophy — Epistemic Agency Under Algorithmic Recommendation:**
   - *Slug:* `when-does-algorithmic-personalization-become-coercive`
   - *Opening Statement:* Philosophical investigation into the boundary between user-aligned relevance filtering and coercive epistemic nudging that undermines deliberative autonomy.
   - *Structure:* 2 Claims, 1 Regulatory Evidence (EU Digital Services Act Recital 70), 1 Open Question.
5. **Culture — Structured Deliberation Across Polarized Communities:**
   - *Slug:* `can-structured-disagreement-improve-mutual-understanding`
   - *Opening Statement:* Investigating whether structured epistemic mediation and deliberation frameworks measurably depolarize communities compared to open-ended conversational feeds.
   - *Structure:* 2 Claims, 1 Empirical Deliberative Polling Evidence (Fishkin / Cambridge University Press), 1 Open Question.
6. **Ethics — Digital Privacy vs. Population-Scale Health Surveillance:**
   - *Slug:* `balancing-digital-privacy-with-public-health-data`
   - *Opening Statement:* Exploring the normative trade-offs between individual cryptographic data sovereignty and aggregated epidemiologic contact tracing and disease vector detection.
   - *Structure:* 2 Claims, 1 Institutional Evidence (WHO Guidance on Ethics in Public Health Surveillance), 1 Open Question.
7. **Technology (Preserved) — AI Content Labeling Online:**
   - *Slug:* `should-ai-generated-content-be-clearly-labeled-online` (Preserved with 5 legitimate claims).

### 3.2 Curated Debates (3 New + 2 Preserved)
1. **Ethics — Autonomous Weapons Systems Ban:**
   - *Slug:* `autonomous-weapons-systems-should-be-banned`
   - *Proposition:* Lethal Autonomous Weapons Must Be Banned
   - *Opposition:* Defensive Autonomy Reduces Harm & Collateral Damage
   - *Structure:* 2 Claims (1 Proposition, 1 Opposition), 1 Evidence, 1 Supporting Argument.
2. **Technology — Algorithmic Ranking Criteria Transparency:**
   - *Slug:* `recommendation-algorithms-must-provide-public-source-access`
   - *Proposition:* Algorithmic Auditing Requires Public Criterion Disclosure
   - *Opposition:* Full Disclosure Exposes Trade Secrets & Invites Manipulation
   - *Structure:* 2 Claims (1 Proposition, 1 Opposition), 1 Evidence, 1 Supporting Argument.
3. **Education — Generative AI in Academic Publishing:**
   - *Slug:* `generative-ai-writing-should-be-permitted-in-academia`
   - *Proposition:* Writing Assistance Expands Global Scholarly Participation
   - *Opposition:* Unconstrained AI Writing Obscures Intellectual Attribution
   - *Structure:* 2 Claims (1 Proposition, 1 Opposition), 1 Evidence, 1 Supporting Argument.
4. **Debate (Preserved):** `ai-is-superior-to-humans`
5. **Debate (Preserved):** `autonomous-systems-and-human-oversight-in-deep-decision-making-1`

---

## 4. Evidence & Citation Verification Matrix

All seeded evidence items reference genuine, verified academic papers, industry standards, or intergovernmental policy treaties. No placeholders, broken URLs, or fabricated sources exist.

| Room Slug | Source Title | Verifiable URL / Publication | Institutional Author | Evidence Type |
|---|---|---|---|---|
| `should-synthetic-provenance...` | C2PA Technical Specification v1.4 (2023) | `https://c2pa.org/specifications/specifications/1.4/specs/C2PA_Specification.html` | Coalition for Content Provenance and Authenticity | technical_standard |
| `how-should-scientific-institutions...` | Estimating the reproducibility of psychological science (2015) | `https://www.science.org/doi/10.1126/science.aac4716` | Science / Open Science Collaboration | empirical_study |
| `what-should-education-prioritize...` | Guidance for generative AI in education and research (2023) | `https://unesdoc.unesco.org/ark:/48223/pf0000386693` | UNESCO | expert_opinion |
| `when-does-algorithmic-personalization...` | EU Digital Services Act (Regulation 2022/2065, Article 27) | `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065` | European Parliament and Council | documentary |
| `can-structured-disagreement...` | When the People Speak: Deliberative Democracy and Public Consultation | `https://www.cambridge.org/core/books/when-the-people-speak/F6C5B32D73D5417B67232231A8B285EF` | Cambridge University Press (James S. Fishkin) | empirical_study |
| `balancing-digital-privacy...` | WHO Guidelines on Ethical Issues in Public Health Surveillance | `https://www.who.int/publications/i/item/9789241512657` | World Health Organization | expert_opinion |
| `autonomous-weapons-systems...` | ICRC Position on Autonomous Weapon Systems (2021) | `https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems` | International Committee of the Red Cross | documentary |
| `recommendation-algorithms...` | Principles for Algorithmic Transparency and Accountability | `https://www.acm.org/binaries/content/assets/public-policy/2017_joint_statement_algorithms.pdf` | Association for Computing Machinery (ACM) | technical_standard |
| `generative-ai-writing...` | Tools such as ChatGPT threaten transparent science; here are our ground rules | `https://www.nature.com/articles/d41586-023-00191-1` | Nature Publishing Group Editorial | expert_opinion |

---

## 5. Epistemic Balance & Neutrality Audit

In strict compliance with Discora Product Philosophy:
1. **Balanced Motion Phrasing:** Motions pose genuine epistemic tensions with strong normative, empirical, and legal arguments on both sides.
2. **Neutral Starter Claims:** Every debate room was seeded with symmetric proposition and opposition claims.
3. **Zero Simulated Activity:**
   - **No fake user accounts:** All seeds were created with the system owner identity (`17265c80-a346-42dd-a86c-6795c500fd15`).
   - **No fake votes:** `agree_count` and `disagree_count` are initialized at `0`.
   - **No manufactured consensus:** `consensus_ratio` is left `null`.
   - **No dummy comments:** Discussion message threads are initially empty, inviting genuine human participant dialogue.

---

## 6. Founding Participant Implementation Record

### Product Policy Guardrails Applied
Per Product Owner explicit directive:
- `is_founding_member` defaults strictly to `false`.
- **No date triggers:** No automatic assignment based on registration dates or beta closing windows.
- **No client self-promotion:** Enforced by database trigger `prevent_founding_member_self_update`.
- **Quiet presentation:** Displayed only on user profile headers (`/u/[username]`). Completely excluded from discussion message cards and debate turns to avoid social gamification or hierarchy signaling.

### Database Trigger Implementation
```sql
create or replace function public.prevent_founding_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_founding_member is distinct from new.is_founding_member then
    if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
      new.is_founding_member := old.is_founding_member;
    end if;
  end if;
  return new;
end;
$$;
```

### UI Implementation
Located in `src/app/u/[username]/page.tsx`:
```tsx
{profile.isFoundingMember && (
  <span
    data-testid="founding-participant-badge"
    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary shadow-xs"
  >
    <Sparkles className="h-3 w-3 text-primary" />
    Founding Participant
  </span>
)}
```

---

## 7. Discussion / Debate Surface Verification

| Surface Route | Verification Result | Details |
|---|---|---|
| `/discussions` | **PASS** | 7 curated discussions listed; zero scratch residue (`testtest`, `ai vs human`, etc.) |
| `/debates` | **PASS** | 5 active debates listed; zero scratch residue |
| `/discussions/[slug]` | **PASS** | Overview loads cleanly, empty message state invites participation |
| `/discussions/[slug]/claims` | **PASS** | Structured claims rendered with evidence counters |
| `/discussions/[slug]/evidence` | **PASS** | Institutional citations loaded (C2PA, Science, UNESCO, etc.) |
| `/discussions/[slug]/questions` | **PASS** | Targeted inquiry and exploration questions visible |
| `/debates/[slug]` | **PASS** | Proposition/Opposition titles, opening premise rendered |
| `/debates/[slug]/arguments` | **PASS** | Proposition & Opposition claims rendered cleanly with debate side badges |
| `/debates/[slug]/evidence` | **PASS** | Verified citations attached to respective motions |
| `/u/[username]` | **PASS** | Profile header rendered cleanly with stats, bio, and badge support |

---

## 8. Responsive Layout & Viewport Verification

Browser automation QA via Playwright verified layout stability, typography, and contrast across all standard device breakpoints:

| Breakpoint | Dimensions | Test Focus | Status |
|---|---|---|---|
| **Desktop** | 1440 × 900 | Multi-column room shells, SectionNav, overview cards | **PASS** |
| **Tablet** | 834 × 1112 | Drawer navigation, responsive cards, table layouts | **PASS** |
| **Large Mobile** | 390 × 844 | MobileNav sticky bar, room header compression | **PASS** |
| **Small Mobile** | 375 × 667 | Touch targets, claim cards, breadcrumbs | **PASS** |

### Captured Verification Screenshots
- `phase8d_discussions_feed_desktop_1440.png`
- `phase8d_discussions_feed_mobile_375.png`
- `phase8d_debates_feed_desktop_1440.png`
- `phase8d_debates_feed_mobile_375.png`
- `phase8d_discussion_curated_evidence_1440.png`
- `phase8d_debate_curated_arguments_1440.png`
- `phase8d_discussion_curated_mobile_375.png`
- `phase8d_debate_curated_mobile_375.png`
- `phase8d_profile_view_1440.png`

---

## 9. Database Migration & Schema Verification

Two sequential migrations were created and pushed to the remote production Supabase database:
1. `supabase/migrations/202609130002_phase_8d_data_hygiene_and_seeding.sql`
   - Added `is_founding_member boolean not null default false` to `public.profiles`.
   - Added `prevent_founding_member_self_update` trigger.
   - Updated migration identity handlers for administrative seeding.
   - Purged 8 scratch rooms, 14 scratch claims, 4 scratch evidence items, 4 scratch sources.
   - Seeded 6 discussions, 3 debates, 18 claims, 9 sources, 9 evidence items, 6 questions, 3 arguments.
2. `supabase/migrations/202609130003_phase_8d_debate_side_alignment.sql`
   - Explicitly assigned `debate_side` ('proposition' / 'opposition') on the 6 seeded debate claims, enabling correct multi-column partitioning in debate rooms.

---

## 10. Security & Authorization Boundary Review

- **Security Boundaries Preserved:** No RLS policies were loosened or disabled.
- **Trigger Integrity:** `prevent_founding_member_self_update` validates `has_role_or_higher(auth.uid(), 'admin')` before permitting any change to `is_founding_member`. Non-admin client attempts silently retain the existing value without raising errors that could break profile update forms.
- **Data Protection:** No credentials, tokens, or email addresses were exposed in migrations or client-facing code.

---

## 11. Build, Typecheck, and Lint Audit

- **TypeScript (`npx tsc --noEmit`):** Exit code 0, zero type errors.
- **ESLint (`npm run lint`):** Exit code 0, zero lint errors.
- **Production Build (`npm run build`):** Compiled cleanly across all 24 static routes and dynamic room routes.
- **Automated Verification Suite (`scripts/verify-phase8d-data.mjs`):** All 7 automated consistency checks passed.

---

## 12. Residual Risk & Open Edge Cases

1. **Founding Participant Administration UI:** There is currently no UI in the Admin Console to toggle `is_founding_member`. This is deliberate per the approved plan (cohort criteria remain undefined; any future grants will be executed via migration or admin RPC).
2. **Real-time Subscriptions on New Rooms:** New curated rooms rely on standard Supabase real-time channels. In local dev, websocket connections connect properly without channel exhaustion.
3. **Empty Message Experience:** Starter rooms currently contain zero messages. The `EmptyState` component gracefully prompts the user to submit the first structured contribution.

---

## 13. Files Changed

### Modified Application Code
- `src/types/domain.ts`: Added `isFoundingMember?: boolean` to `UserProfile`.
- `src/features/profiles/services/profile-service.ts`: Added `is_founding_member` to `DbProfileRow` and mapped to `isFoundingMember`.
- `src/app/u/[username]/page.tsx`: Added `Sparkles` icon import and subtle "Founding Participant" badge beside username/displayName.

### Created Migrations
- `supabase/migrations/202609130002_phase_8d_data_hygiene_and_seeding.sql`
- `supabase/migrations/202609130003_phase_8d_debate_side_alignment.sql`

### Test & Verification Scripts
- `scripts/verify-phase8d-data.mjs`: Database schema and manifest consistency test suite.
- `scripts/phase8d-browser-qa.mjs`: Playwright end-to-end browser QA across desktop, tablet, and mobile viewports.

---

## 14. Database Migrations Created & Applied

| Migration Name | Applied to Production | Verification Status |
|---|---|---|
| `202609130002_phase_8d_data_hygiene_and_seeding.sql` | **YES** | Verified via `supabase db push` & direct data queries |
| `202609130003_phase_8d_debate_side_alignment.sql` | **YES** | Verified via `supabase db push` & Playwright rendering |

---

## 15. Final Sign-Off & Beta Readiness Recommendation

Phase 8D has fully resolved the data hygiene and starter discourse deficits identified in the Phase 8C Beta Readiness Reconciliation Audit:
- **Clean Environment:** All developer scratch rooms and malformed test data are removed.
- **Rich Starter Knowledge:** High-quality institutional discussions and debates are ready for incoming beta testers.
- **Beta Cohort Readiness:** Founding Participant recognition is architecturally secure and non-invasive.
- **Production Integrity:** Database boundaries, RLS, and code quality are strictly maintained.

**Recommendation:** Discora is now ready for early beta tester access.
