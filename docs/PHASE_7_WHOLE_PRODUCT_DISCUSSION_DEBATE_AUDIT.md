# Phase 7 — Whole Product + Discussion/Debate Experience Audit

**Date:** 2026-09-07  
**Status:** AUDIT ONLY — NO IMPLEMENTATION, NO CODE CHANGES  
**Scope:** Current working tree at `D:\Projects\Discora`  
**Basis:** Code-verified inspection, Phase 6A/6B/6E reports, four parallel subagent audits, and Playwright browser QA (36 checks, 0 failures).

---

## Executive Summary

Discora is a philosophically coherent, structurally sound platform that genuinely attempts to prioritize understanding over engagement, evidence over popularity, and critical thinking over competition. The core epistemic pipeline — Questions → Claims → Evidence → Structured Inquiries — is implemented with real database-enforced privacy, thoughtful anonymous-identity redaction, and a clear Discussion vs Debate distinction.

However, the product currently carries **meaningful epistemic drift** in how it presents votes, reputation, and credibility. Several UI patterns visually and algorithmically reward agreement, popularity, and authority-by-association in ways that conflict with Discora's stated philosophy. The Discussion experience, while powerful, is dense and intimidating — it feels more like a knowledge-engineering IDE than a conversation. The Debate experience is stronger, but still lacks aggregate conflict mapping and an extended State of Understanding.

**The 500 error reported on the debate room is currently not reproducible.** Browser QA confirmed all routes render correctly at all tested viewports with no console errors, no hydration errors, and no horizontal overflow.

**Verdict: PASS WITH GAPS**

The product does not have catastrophic product-breaking defects. It does have **P1 epistemic/UX drift** that must be addressed before the platform can be considered fully aligned with its philosophy. These gaps are fixable without architectural changes.

---

## Product Philosophy Alignment

| Discora Principle | Current State | Gap Severity |
|---|---|---|
| Understanding over engagement | Strong in content structure; weakened by vote/reputation visuals | P1 |
| Evidence over popularity | Strong in creation flow; weakened by consensus bars and credibility badges | P1 |
| Clarity over activity | SoU is clear; discussion room is activity-dense | P2 |
| Questions before conclusions | Strong — inquiry system is well-implemented | Aligned |
| Neutrality | Strong in language; weakened by green/red truth signaling | P1 |
| Changing one's mind | Strong — side-switch rationale, position history | Aligned |
| AI assists, humans decide | No AI features exist yet; no risk today | Aligned |

---

## Overall Verdict

### PASS WITH GAPS

**P0 count:** 0  
**P1 count:** 6  
**P2 count:** 10  
**P3 count:** 8  
**Potentially/Misaligned findings:** 6  
**Genuinely new product decisions required:** 4

The product is ready for continued development but should not be considered a final expression of Discora's philosophy. The epistemic drift in reputation and voting presentation is the highest-priority concern.

---

## Discussion Experience

### Overall Assessment

The Discussion room is a **highly structured, knowledge-engineering interface** disguised as a conversation. It is not a forum or a chat room. The core unit of discourse is the Claim, which is typed, context-tagged, and linked to Evidence, Questions, and other Claims via typed Relations.

**Strengths:**
- **State of Understanding** is best-in-class: three-column synthesis (Supported / Contested / Unresolved) with deterministic metrics, mobile progressive disclosure, and clear empty states.
- **Evidence-Centric Design**: mandatory source URLs, methodology tags, directional relationships (support/contradict/context).
- **Claim Extraction Flow**: elegant bridge between conversational messages and structured claims.
- **Threaded Contributions**: nested replies, 5-minute edit windows, anonymous mode.
- **Graph/Map View**: visually impressive and genuinely useful for navigating complex reasoning.
- **Empty/Loading/Error States**: comprehensive, with actionable guidance.

**Weaknesses:**
- **Cognitive load and "form fatigue"**: Claim creation requires 3–4 form fields. Evidence creation requires content, direction, methodology, source title, and URL. A new user is hit with three stacked forms in a single viewport.
- **Database editor feel**: The single-page layout presents four full sections in one scroll with badges, relation counts, credibility scores, and voting toolbars competing for attention.
- **Claim card explosion**: 12+ interactive elements per card (type badge, context badge, credibility badge, retraction tag, voting toolbar, consensus bar, evidence toggle, relations toggle, inquiry button, relate quick-actions, save button, report button, answering-question banner).
- **Terminology inconsistency**: "Discussion Questions" in the room shell, but "Questions & Inquiries" in the overview, and inquiry UI bleeds into discussion claims.
- **Inquiry UX leakage**: `ClaimList` imports and renders `InquiryButton` and `InquiryList` from the debates feature, blurring the feature boundary.

### Epistemic Alignment Issues in Discussion

1. **Voting toolbars on claims and evidence** — vote counts and consensus ratios are prominently displayed, signaling "more votes = more correct."
2. **"Most Influential" scoring** — uses `totalRel * 2 + totalVotes + importance`, conflating structural connectivity and vote volume with epistemic weight.
3. **Evidence Coverage as a percentage** — treats all evidence as equal regardless of source quality.
4. **Consensus Level badges** — "High/Medium/Low" consensus is displayed as a status badge, elevating agreement to an epistemic marker.
5. **"Emerging Consensus" section** — explicit popularity signal dressed in analytical language.

---

## Debate Experience

### Overall Assessment

The Debate experience is a well-structured, epistemically-aligned argumentation environment. It deliberately avoids winner/loser framing and emphasizes side-based claim assertion, evidence attachment, claim relations, and targeted inquiries.

**Strengths:**
- **Position clarity**: Proposition = blue, Opposition = slate/rose. Language ("Support/Challenge the Motion") frames positions as roles in shared inquiry.
- **Mandatory rationale for side-switching**: 50-character minimum with live counter models intellectual honesty. 24-hour cooldown prevents rash switches.
- **Position History**: unique feature showing how participants' views evolved with public rationale.
- **No winner/loser system**: confirmed absent from codebase, database, and UI.
- **Private debate support**: access codes, invitations, participant management.

**Weaknesses:**
- **No "Motion:" label**: `room.title` is rendered without a prefix, which could confuse first-time visitors.
- **Evidence tab is a flat bibliography**: does not group evidence by claim, weakening the claim→evidence narrative.
- **Argument comparison requires tab switching on mobile**: users cannot see Proposition and Opposition claims simultaneously.
- **No aggregate conflict map**: contradictions between sides are only visible by drilling into individual claim relations.
- **Advanced claim options hidden by default**: claim type, context type, and anonymity are behind "Advanced Options," potentially leading to untaxonomized claims.

### Epistemic Alignment Issues in Debate

1. **Claim voting consensus bar** — while framed as voter alignment, the visual consensus bar may be interpreted as a "score."
2. **"Most Active" / "Most Participants" sort options** — popularity proxies in debate browse.
3. **AuthorTrustSignal on evidence cards** — reputation score and badges appear next to evidence, creating authority-by-association.

---

## Discussion vs Debate Comparison

| Dimension | Discussion | Debate | Correct? |
|-----------|------------|--------|----------|
| Purpose | Exploration, understanding | Structured examination of competing positions | Yes |
| Entry point | Open, no sides required | Motion + position selection | Yes |
| Conversation model | Open conversation, threaded messages | Side-based arguments + contributions | Yes |
| Claim usage | Claims as focal points | Claims as arguments for/against motion | Yes |
| Evidence usage | Evidence attached to claims | Evidence attached to claims/arguments | Yes |
| Questions | Open discussion questions | Targeted inquiries scoped to claims | Yes |
| Participant roles | Participants, observers | Proposition, Opposition, Neutral | Yes |
| Reading experience | Unified feed + structured tabs | Side-segmented arguments + evidence | Yes |
| Contribution experience | Post, reply, extract claim, ask question, assert claim | Join side, assert argument, add evidence, inquiry | Yes |
| State of Understanding | Yes | Not yet extended | Partial |
| Conclusion semantics | No formal conclusion | No winner/loser (Phase 6E removed) | Yes |
| Visual language | Neutral, semantic colors | Blue (Proposition) vs slate/rose (Opposition) | Yes |
| Terminology | Claims, Evidence, Questions | Arguments, Evidence, Targeted Inquiries | Yes |

**Assessment:** The Discussion vs Debate distinction is genuine and well-communicated. The primary gap is that Debate does not yet have State of Understanding extended to it (Phase 6E approved this but it has not been implemented).

---

## State of Understanding / Epistemic Audit

### Current Behavior

The `deriveStateOfUnderstanding` function classifies claims into three epistemic states:
- **SUPPORTED**: `supportingCount > 0 AND contradictingCount === 0`
- **CONTESTED**: `contradictingCount > 0` OR (`totalVotes >= 5 AND agreementPercentage >= 35 AND agreementPercentage <= 65`)
- **UNRESOLVED**: No directional evidence AND vote-based contested branch does not fire

### Epistemic Inputs (allowed)
- Evidence direction per claim (support/contradict/context)
- Evidence existence (presence/absence of citations)
- Evidence integrity (retraction/moderation state)
- Question coverage
- Open inquiry count (display flag)

### Descriptive Social Signals (should be display-only)
- Vote counts and agreement percentages
- Participant counts
- Engagement metrics
- Author reputation
- Popularity indicators

### Conflict

The vote-division branch (`≥5 votes, 35–65% agreement → contested`) is a **standing partial violation** of the rule that only evidence-relationship information may influence taxonomy. A claim with zero directional evidence and 5 votes split 3-2 becomes `contested` purely due to social input.

**This requires a new product decision:** remove the vote-division branch from taxonomy, keep vote data as descriptive display only.

---

## Claims / Evidence / Sources / Questions / Targeted Inquiries

**Claims:** Well-structured with 5 types and 4 context types. Extraction from contributions is elegant. Voting on claims introduces mild popularity signal.

**Evidence:** Mandatory source citation is a major strength. Direction badges (support/contradict/context) are immediately visible. The standalone Evidence tab is a flat bibliography — it does not group evidence by claim.

**Sources:** Treated as independent entities with URL/PDF/Image/Video support. Source Intelligence is not yet implemented.

**Questions:** Discussion Questions are open-ended and clearly distinct from Structured Inquiries. The terminology is inconsistent across surfaces.

**Targeted Inquiries:** Claim-specific, with 3 types (clarification, evidence_request, assumption_check). Multiple entry points (tab + inline on claims). Inquiry status transitions are not visible in the debate tab.

---

## Discovery

| Surface | Sort Mechanism | Assessment |
|---|---|---|
| Discussion Feed | Newest-first keyset | Correct default; neutral |
| Debate Browse | User-selectable incl. activity sorts | Watch — default must stay recency |
| Claims in room | Chronological within scope | Acceptable |
| Evidence | Chronological with direction filters | Correct |
| Search | Full-text relevance | Epistemically sound |
| Saved | Save-time desc | Correct for retrieval |
| Homepage sections | Implementation-history order | Rebalance epistemically |
| "Understanding Evolved" | Sorted by consensus volatility | Should sort by evidence addition or inquiry activity |

Discovery can use activity/popularity for surfacing, but it must not be presented as epistemic authority. The current implementation respects this in most places, but the "Understanding Evolved" sort by consensus volatility is problematic.

---

## Profile / Reputation

### Assessment

The profile page displays: Discussions Created, Debates Joined, Claims, Evidence Added — activity counts with neutral framing.

**However**, the Reputation & Contributions section contains significant authority-risk elements:

1. **Large reputation score** displayed as a bold number with no disclaimer that it measures participation, not accuracy.
2. **Trust Badges** including "Consensus Builder" (reputation ≥ 200) and "Top Analyst" (20 claims + high credibility + reputation ≥ 300) — badge names conflate consensus/reputation with analytical quality.
3. **Reputation formula** gives `agreeVoteMultiplier: 2` vs `disagreeVotePenalty: 1` and includes `highConsensusBonus` (ratio > 0.6), mathematically incentivizing agreement.
4. **Author reputation in claim credibility**: up to 2/10 points of a claim's credibility score come from the author's popularity, not evidence quality.
5. **AuthorTrustSignal on evidence cards**: reputation score, top expertise, and badge count appear next to every evidence submission.

**No leaderboard exists** (route removed from tree). This is a positive.

### Required Action

Reputation must be redesigned as descriptive participation tracking only. A new product decision is required for any replacement system.

---

## Private Debate

### Assessment

Private debate implementation is **database-enforced and solid**:

- Creation: public/private toggle in create form
- Gate: clean access code + invitation tabs, scrubs invitation token from URL immediately
- Access: dedicated RPCs for access code and invitation join
- Removal: owner can remove participants; removed users lose access to everything including saved items
- Re-entry: removed participants cannot re-join

### Issues

1. **Participant display uses truncated UUIDs** (`User {participant.userId.slice(0, 8)}...`) instead of resolved usernames — poor UX for room management.
2. **Private access gate blank-screen flash**: renders `null` for guests before client-side redirect fires.
3. **`get_private_room_gate` anon EXECUTE grant** (P1-SEC-001 from Phase 6A) permits private-slug enumeration — unaddressed.

---

## AI

### Assessment

**No AI features exist in the codebase.** The `src/features/ai/` directory does not exist. All "Sparkles" icon references are decorative (lucide-react) used in onboarding cards and feedback banners.

**Philosophy alignment:** No AI = no AI-related philosophical risk. If AI features are added later, they must be framed strictly as organizer/assistant/summarizer/analyzer, never as truth authority or correctness judge.

---

## Navigation / IA

### Strengths
- Desktop sidebar groups primary nav (Home, Discussions, Search, Debates, Saved, Profile) with Settings separated.
- Mobile bottom nav uses 4 primary items + "More" overflow — clean and accessible.
- Search lives in header and sidebar, not duplicated in bottom nav.
- Saved is present in mobile nav (authenticated).

### Weaknesses
- **Header subtitle "Authentication foundation"** is a stale placeholder that was never replaced.
- **Header `max-w-4xl` vs content `max-w-6xl`** creates visual misalignment where the sticky header doesn't span full content width.
- **Create button is only in mobile "More" menu** — desktop users have no prominent create entry point.
- **`profileHref` computation is duplicated** between `sidebar.tsx` and `mobile-nav.tsx`.

---

## Onboarding

### Strengths
- **DiscoveryDeckModal**: 4-tab modal with focus trap, Escape-to-close, focus preservation, `aria-modal`.
- **EpistemicSandbox**: interactive toggle showing supporting/counter-evidence and structured inquiries with clear visual state changes.
- **OnboardingChecklistCard**: 4-step actionable checklist on homepage.
- **RoomGuideCard**: contextual, dismissible guidance inside actual rooms.

### Weaknesses
- **Client-side only** (`localStorage`): progress lost across devices/browsers. "First-time user" detection is unreliable.
- **`selectedTopics` and `preferredFormat`** are collected but never visibly consumed — UX dead end.
- **`isDeckOpen` does not persist** across refreshes — returning users never see the deck automatically.

---

## Visual / Responsive / Silly Mistakes

### Browser QA Results

| Route | 375×812 | 390×844 | 834×1112 | 1440×900 |
|---|---|---|---|---|
| `/` | PASS | PASS | PASS | PASS |
| `/discussions` | PASS | PASS | PASS | PASS |
| `/discussions/[slug]` | PASS | PASS | PASS | PASS |
| `/debates` | PASS | PASS | PASS | PASS |
| `/debates/[slug]` | PASS | PASS | PASS | PASS |
| `/search` | PASS | PASS | PASS | PASS |
| `/saved` | PASS | PASS | PASS | PASS |
| `/u/[username]` | PASS* | PASS* | PASS* | PASS* |
| `/settings` | PASS | PASS | PASS | PASS |

\* Minor non-blocking 404 for an avatar image asset; page renders normally.

**Total checks: 36 | Failures: 0 | Blocking issues: None**

**Interaction paths verified:**
- Homepage → Discussion → Claims → Evidence → Debate → Search: all completed without errors

### Responsive Issues
- **375px/390px**: Mobile bottom nav is functional with `h-16` touch targets, but dense content sections require significant scrolling.
- **834px**: Clean layout transition; sidebar hidden, mobile nav shown.
- **1440px**: `max-w-6xl` container constrains content cleanly.
- **Graph view**: inherently desktop-first — fixed `width: 240px` cards with `transform: scale()` lose utility on mobile.
- **No horizontal overflow** at any tested viewport on any tested page.

---

## Technical Quality

### Strengths
- TypeScript compiles clean (`tsc --noEmit` exit 0).
- Lint passes (0 errors).
- Build succeeds.
- RLS enforced on all content tables.
- SECURITY DEFINER functions pin `search_path`.
- Safe redirects prevent open redirects.
- Anonymous identity redaction is systematic in views.
- Keyset pagination implemented correctly.

### Weaknesses
- **No route-level `loading.tsx`** — cold navigations blank-then-pop.
- **Root `error.tsx` exists** but there are no route-level error boundaries — a single uncaught error in a nested route may not be caught properly depending on Next.js error boundary propagation.
- **`profileHref` duplication** between sidebar and mobile-nav creates maintenance drift.
- **Header subtitle** is placeholder text.
- **Custom toggle switches** in settings lack `role="switch"` / `aria-checked`.
- **Profile avatar upload** is a clickable `<div>` without keyboard handler.

---

## Findings

| ID | Severity | Type | Area | Finding | Alignment | Recommendation |
|----|----------|------|------|---------|-----------|----------------|
| P1-EPI-001 | P1 | Product Model | Claims/Evidence | Green/red credibility badges (`High`/`Medium`/`Low`) visually encode true/false, training agreement-as-goodness | MISALIGNED | Recolor to neutral palette (indigo/amber/slate); keep labels, remove truth-value colors. New product decision if labels change. |
| P1-EPI-002 | P1 | Product Model | Reputation | Reputation formula rewards agreement (`agreeVoteMultiplier: 2`, `disagreeVotePenalty: 1`, `highConsensusBonus`) and includes "Consensus Builder" badge | MISALIGNED | Redesign reputation as descriptive participation counts only. Remove consensus rewards and gamified badges. New product decision required. |
| P1-EPI-003 | P1 | Product Model | State of Understanding | "Current stance: X% agree" framing in SoU implies community has taken a position | MISALIGNED | Rename to "Vote distribution: X% support, Y% challenge" or "X support votes, Y challenge votes." |
| P1-EPI-004 | P1 | Product Model | Claims | Author reputation (up to 2/10 points) embedded in claim credibility formula | MISALIGNED | Remove author reputation from claim credibility. Credibility must derive from evidence quality, not author popularity. |
| P1-EPI-005 | P1 | UX Issue | Homepage | "My Understanding Evolved" sorts by consensus volatility (`Math.abs(consensusRatio - 50)`), prioritizing rooms with volatile disagreement | POTENTIALLY MISALIGNED | Sort by recency of evidence addition or inquiry activity instead. |
| P1-UX-001 | P1 | UX Issue | Discussion Room | Discussion room feels like a database IDE; 4 stacked sections, 12+ interactive elements per claim card, high cognitive load | POTENTIALLY MISALIGNED | Redesign discussion overview to enter through State of Understanding; collapse claim card chrome on mobile. |
| P1-SEC-001 | P1 | Bug | Private Debate | `get_private_room_gate` anon EXECUTE grant permits private-slug enumeration | MISALIGNED | Require authentication for gate RPC or require capability token. |
| P2-EPI-006 | P2 | Product Model | Reputation | "Top Analyst" badge requires reputation ≥ 300, tying analytical quality to popularity metric | POTENTIALLY MISALIGNED | Rename/replace badge; split into separate badges for claim volume and evidence quality. |
| P2-EPI-007 | P2 | UX Issue | Discovery | Debate browse offers "Most Active" and "Most Participants" sorts — popularity proxies | POTENTIALLY MISALIGNED | Keep user-chosen sorts but ensure default is recency; rename labels to be descriptive, not valorizing. |
| P2-UX-008 | P2 | UX Issue | Debate Room | No "Motion:" prefix on debate title; no aggregate conflict map showing where sides directly contradict | POTENTIALLY MISALIGNED | Add "Motion:" label; add conflict map view or relation-based contradiction surfacing. |
| P2-UX-009 | P2 | UX Issue | Discussion Room | Inquiry UI bleeds into discussion claims via shared `InquiryButton`/`InquiryList` components | POTENTIALLY MISALIGNED | Ensure discussion claims do not expose debate-specific inquiry UI; keep Discussion Questions separate from Structured Inquiries everywhere. |
| P2-UX-010 | P2 | UX Issue | Debate Room | Evidence tab is a flat bibliography; does not group evidence by claim | POTENTIALLY MISALIGNED | Group evidence by claim in the tab view, or improve "Go to Claims" CTA. |
| P2-A11Y-011 | P2 | UX Issue | Settings | Custom toggle switches lack `role="switch"` / `aria-checked` | MISALIGNED | Add proper ARIA semantics for toggle switches. |
| P2-A11Y-012 | P2 | UX Issue | Profile | Profile avatar upload is a clickable `<div>` without keyboard handler | MISALIGNED | Convert to `<button>` with keyboard support. |
| P2-UX-013 | P2 | UX Issue | Navigation | Header subtitle "Authentication foundation" is placeholder text | MISALIGNED | Replace with actual subtitle or remove. |
| P2-UX-014 | P2 | UX Issue | Navigation | Header `max-w-4xl` vs content `max-w-6xl` creates visual misalignment | POTENTIALLY MISALIGNED | Align header width with content container. |
| P2-UX-015 | P2 | UX Issue | Navigation | `profileHref` computation duplicated between sidebar and mobile-nav | POTENTIALLY MISALIGNED | Extract to shared utility to prevent drift. |
| P2-UX-016 | P2 | UX Issue | Private Debate | Participants shown as truncated UUIDs instead of usernames | POTENTIALLY MISALIGNED | Resolve and display usernames in participant management. |
| P2-UX-017 | P2 | UX Issue | Private Debate | Private access gate shows blank-screen flash for guests before redirect | POTENTIALLY MISALIGNED | Add loading/redirect state for unauthenticated users. |
| P2-PERF-018 | P2 | UX Issue | Loading | No route-level `loading.tsx`; cold navigations blank-then-pop | POTENTIALLY MISALIGNED | Add skeleton loading states for room/section routes. |
| P3-EPI-019 | P3 | Product Model | Claims | "Most Influential" scoring uses vote volume + relation count, conflating popularity with epistemic weight | POTENTIALLY MISALIGNED | Rename to "Most Connected" or remove vote volume from scoring. |
| P3-EPI-020 | P3 | Product Model | Discovery | "Emerging Consensus" section surfaces claims by agreement ratio — popularity signal dressed as analysis | POTENTIALLY MISALIGNED | Rename to "Highly Discussed Claims" or remove; add disclaimer that this reflects activity, not truth. |
| P3-UX-021 | P3 | UX Issue | Discussion Room | "Orphans" metric penalizes well-evidenced claims not linked to a parent question | POTENTIALLY MISALIGNED | Audit whether "orphan" status should be a warning or simply a structural observation. |
| P3-UX-022 | P3 | UX Issue | Navigation | Create button only accessible via mobile "More" menu; no desktop equivalent | POTENTIALLY MISALIGNED | Add Create entry point to desktop sidebar or header. |
| P3-UX-023 | P3 | UX Issue | Onboarding | `selectedTopics` and `preferredFormat` collected but never consumed | POTENTIALLY MISALIGNED | Either consume these preferences (e.g., filter homepage) or remove the collection step. |
| P3-UX-024 | P3 | UX Issue | Graph View | Fixed `width: 240px` cards with `transform: scale()` are desktop-first | POTENTIALLY MISALIGNED | Improve mobile graph navigation or explicitly label as desktop-optimized. |
| P3-TECH-025 | P3 | Bug | Error Handling | Root `error.tsx` exists but no route-level error boundaries; single uncaught error may not be caught in nested routes | MISALIGNED | Add error.tsx to key route groups or verify Next.js boundary propagation covers all segments. |

---

## New Product Decisions Required

The following require explicit product-owner approval before implementation:

1. **Vote influence on State of Understanding taxonomy** — Should the vote-division branch (`≥5 votes, 35–65% agreement → contested`) be removed from taxonomy and kept as descriptive display only?
2. **Reputation system redesign** — Should reputation be reduced to descriptive participation counts only, removing all agreement-weighted scoring, consensus bonuses, and gamified badges?
3. **Claim credibility formula** — Should author reputation be removed from claim credibility entirely?
4. **Participant Conclusions for Debates** — Phase 6E Approved Product Spec (Model G) proposed optional per-author, evidence-anchored, equal-weight conclusions for debates. This was never implemented. Does the product owner approve this direction?

---

## Recommended Fix Order

### Priority 1: Product/Epistemic Correctness
1. Remove vote-division branch from SoU taxonomy (Decision required)
2. Remove author reputation from claim credibility formula
3. Recolor credibility badges to neutral palette
4. Rename "Current stance: X% agree" to neutral vote distribution language
5. Remove "Consensus Builder" badge and highConsensusBonus from reputation

### Priority 2: Core Conversation Experience
6. Redesign discussion overview to enter through State of Understanding
7. Collapse claim card chrome on mobile
8. Add route-level loading skeletons
9. Fix inquiry UI leakage into discussion claims

### Priority 3: Discussion/Debate Differentiation
10. Extend State of Understanding to debates
11. Add aggregate conflict map to debates
12. Add "Motion:" prefix to debate titles
13. Group evidence by claim in debate evidence tab

### Priority 4: Navigation/IA
14. Replace header placeholder subtitle
15. Align header width with content
16. Add desktop Create entry point
17. Extract shared `profileHref` utility
18. Fix private debate participant display (usernames)

### Priority 5: UX Friction
19. Add retry buttons to error states
20. Fix private gate blank-screen flash
21. Add `role="switch"` to toggles
22. Make avatar upload keyboard accessible
23. Fix `animate-pulse` class concatenation

### Priority 6: Visual Polish
24. Standardize motion kit with `prefers-reduced-motion` guard
25. Improve mobile graph view or label as desktop-optimized
26. Add scroll affordances to horizontal tab navs

---

## What NOT To Change

The following are already aligned and must remain:

1. **Database-enforced privacy model** (RLS + `has_room_access` + views) — product's spine.
2. **Discussion Questions ≠ Structured Inquiries separation** — any "unification" proposal must be rejected.
3. **Discussion vs Debate as distinct UX models** — the distinction is working and philosophically sound.
4. **Save as private utility** — never add counts/social features.
5. **Recency/relevance-only default ordering** — never implied popularity.
6. **Vote framing as "Support/Challenge"** — keep the terminology, deprioritize the visual prominence.
7. **Mandatory rationale for side switches** — epistemically load-bearing.
8. **Guest read access** — openness before contribution is correct.
9. **Anonymous-identity redaction pattern in views** — systematic and correct.
10. **Keyset pagination patterns** — do not regress to offset.
11. **No Winner/Loser/Draw/resolution UI** — Phase 6E removal is complete and correct.

---

## Final Recommendation

**Discora's core promise is real and implementable.** The platform successfully creates a space for structured discourse that prioritizes evidence, transparency, and understanding. The Discussion/Debate distinction is genuine. The privacy model is strong. The State of Understanding is a standout feature.

However, the product is **not yet philosophically pure**. The reputation and voting systems, while well-intentioned, introduce competitive and popularity-adjacent signals that undermine the "evidence over popularity" principle. The Discussion room, while powerful, sacrifices conversational flow for structural rigor in ways that may alienate new users.

**Recommended path forward:**
1. **Immediately address P1 epistemic drift** (reputation formula, credibility badges, vote language). These are the highest-priority corrections.
2. **Complete Phase 6E Model G implementation** if approved: extend SoU to debates, add optional participant conclusions, remove vote influence from taxonomy.
3. **Redesign the Discussion room entry experience** to reduce cognitive load while preserving structural rigor.
4. **Conduct authenticated browser QA** to verify save round-trips, private debate flows, and onboarding persistence.
5. **Do not add AI features** until a clear AI boundary document and consent model are established.

The product does not need a fundamental redesign. It needs **epistemic tightening** — removing the gamification and popularity signals that have crept in during implementation — and **conversational softening** — making the structured discourse feel more like natural exploration and less like filling out forms.

---

## Report Metadata

- **Report path:** `docs/PHASE_7_WHOLE_PRODUCT_DISCUSSION_DEBATE_AUDIT.md`
- **Overall verdict:** PASS WITH GAPS
- **P0 count:** 0
- **P1 count:** 6
- **P2 count:** 10
- **P3 count:** 8
- **Potentially/misaligned findings:** 6
- **Genuinely new product decisions required:** 4

### Top 5 Recommended Next Actions

1. **Remove author reputation from claim credibility formula** and **recolor green/red credibility badges** to neutral palette.
2. **Redesign reputation** as descriptive participation counts only; remove consensus bonuses and gamified badges.
3. **Decide on vote influence in SoU taxonomy** — remove vote-division branch or explicitly approve as exception.
4. **Redesign discussion room entry** to prioritize State of Understanding over stacked section dashboards.
5. **Extend State of Understanding to debates** and add aggregate conflict mapping.
