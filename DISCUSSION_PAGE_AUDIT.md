# Discussion Detail Page — Complete UX, Architecture, and Implementation Audit

> **Platform:** Discora — Structured Discussion, Debate, and Knowledge-Building Platform
> **Target Component:** Discussion Detail Page (`/discussions/[slug]`)
> **Status:** Completed Audit

---

## 1. Current Architecture Documentation

### 1.1 Component Tree & File Map

```
src/app/discussions/[slug]/page.tsx                   Server Component (fetches initialData, sets metadata)
└── src/features/discussions/components/
    ├── discussion-room.tsx         (843 lines)        Main Orchestrator — layout, data fetching, sidebar, forms
    │   ├── DiscussionInsights      (46 lines)         6-metric grid (Claims, Evidence, Inquiries, Contributors, etc.)
    │   ├── EvidenceExplorer        (92 lines)         Filterable sidebar evidence list with claim tooltip
    │   ├── OpenInquiriesSidebar    (42 lines)         Sidebar list of unretracted questions
    │   ├── Sidebar                 (68 lines)         Sidebar wrapper composing Insights, Explorer, Inquiries, Views
    │   │
    │   ├── ClaimList               (1,132 lines)      Claims section: form + claim cards + voting + relations + evidence
    │   │   ├── ClaimVoting         (70 lines)         Agree/disagree buttons + consensus bar
    │   │   ├── ContextBadge        (7 lines)          Badge for claim context type
    │   │   ├── RelationPreview     (113 lines)        Expandable list of claim relationships
    │   │   ├── EvidenceSection     (559 lines)        Per-claim evidence list + inline evidence submit form
    │   │   │   └── EvidenceVoting  (61 lines)         Agree/disagree buttons for evidence items
    │   │   └── ClaimRelationDialog (246 lines)        Modal dialog to select target claim and relation type
    │   │
    │   ├── QuestionList            (375 lines)        Questions section: ask form + list of questions
    │   ├── CommentItem             (405 lines)        Recursive message tree node for general contributions
    │   ├── ExtractClaimModal       (259 lines)        Modal: extract structured claim from comment text
    │   └── ReportDialog            (259 lines)        Modal: flag message/claim/evidence/question for moderation
```

### 1.2 Unused & Dead Components (Legacy Tab System Artifacts)

The following components remain in `src/features/discussions/components/` from a legacy tab implementation. They are imported nowhere in the active application routes:

| Component File | Lines | Intended Purpose | Active Status |
|---|---|---|---|
| `discussion-health.tsx` | 190 | Graph health metrics (connected components, orphan claims) | **Dead Code** |
| `discussion-intelligence.tsx` | 293 | Claim ranking & consensus ratio analytics | **Dead Code** |
| `discussion-summary.tsx` | 207 | AI summary & statistical overview | **Dead Code** |
| `map-tab.tsx` | 380 | Interactive argument map visualization | **Dead Code** |
| `graph-view.tsx` | 460 | D3/SVG graph rendering canvas | **Dead Code** |
| `graph-utils.ts` | 280 | Graph layout algorithms and node positioning | **Dead Code** |
| `room-evidence-tab.tsx` | 140 | Room-wide evidence table view | **Dead Code** |
| `room-sources-tab.tsx` | 90 | Room-wide source bibliography table | **Dead Code** |

**Summary of Technical Debt:** ~2,050+ lines of dead, unrendered code currently exist in the feature directory, increasing bundle cognitive overhead and maintenance costs.

---

### 1.3 Data Fetching & Hook Architecture

```
DiscussionRoom (page.tsx initialData)
├── useMessages(roomId)           → GET /discussion_messages        (staleTime: 30s)
├── useClaims(roomId)             → GET /discussion_claims          (staleTime: 30s)
├── useRoomEvidence(roomId)       → GET /discussion_evidence        (staleTime: 30s)
├── useQuestions(roomId)          → GET /discussion_questions       (staleTime: 30s)
│
ClaimList (rendered inside DiscussionRoom)
├── useClaims(roomId, questionId) → GET /discussion_claims          (DUPLICATE FETCH if questionId specified)
├── useRoomEvidence(roomId)       → GET /discussion_evidence        (DUPLICATE FETCH!)
├── useClaimRelations(roomId)     → GET /discussion_claim_relations (staleTime: 30s)
├── useInquiryCountsForRoom       → GET RPC get_inquiry_counts_for_room
├── useAuthorsReputation          → GET batch user reputation
│
EvidenceSection (rendered per claim inside ClaimList)
├── useEvidence(claimId)          → GET /discussion_evidence        (Per-claim network filter)
├── useAuthorsReputation          → GET batch author reputation
│
QuestionList (rendered inside DiscussionRoom)
└── useQuestions(roomId)          → GET /discussion_questions       (DUPLICATE FETCH!)
```

#### Key Fetching Architectural Flaws:
1. **Redundant Network Requests:** `useRoomEvidence(roomId)` is invoked independently by both `DiscussionRoom` and `ClaimList`.
2. **Duplicate Question Queries:** `useQuestions(roomId)` is invoked by both `DiscussionRoom` (for sidebar counts) and `QuestionList` (for rendering list).
3. **Waterfall Per-Claim Fetches:** `EvidenceSection` performs an individual query for `claimId` even though `useRoomEvidence` already loaded all room evidence into memory.
4. **Lack of Central Data Provider:** No React context or centralized state container passes down pre-fetched room entities.

---

### 1.4 Database Dependencies, Views, & RPCs

#### Database Views (`public` schema queryable via Supabase Client):
- `discussion_messages`: Redacted view hiding `user_id` when `identity_mode = 'anonymous'`.
- `discussion_claims`: Redacted claims view enriched with vote aggregates (`agree_count`, `disagree_count`, `consensus_ratio`).
- `discussion_evidence`: Redacted evidence view joined with source metadata.
- `discussion_questions`: Redacted question view with `is_retracted` status.
- `discussion_claim_relations`: Claim relationship pairs (`source_claim_id`, `target_claim_id`, `relation_type`).

#### Stored Procedures (RPCs):
- `create_discussion_room`: Atomic transaction creating room record + discussion metadata.
- `get_or_create_source`: URL-based source deduplication per room.
- `submit_moderation_flag`: Flag submission with duplicate prevention.
- `search_content`: Full-text vector search across room content.

#### Core Tables:
- `rooms`, `discussions`, `messages`, `claims`, `evidence`, `claim_evidence`, `sources`, `questions`, `claim_votes`, `evidence_votes`, `claim_relations`, `moderation_flags`.

---

## 2. Audit UX Against Discora Philosophy

| Philosophy Principle | Audit Findings & Evaluation | Compliance Rating |
|---|---|---|
| **Understanding over Engagement** | ❌ **Non-Compliant**<br>• Claims (conclusions) are rendered *above* Questions (inquiries).<br>• Contribution textarea is the largest interactive target, encouraging rapid commenting over inquiry.<br>• Metrics grid emphasizes raw volume ("24 claims", "15 contributions") rather than qualitative progress. | **FAIL** |
| **Evidence over Opinions** | ⚠️ **Partially Compliant**<br>• Per-claim evidence is hidden behind a manual collapse toggle by default.<br>• Sidebar Evidence Explorer is constrained to `max-h-80` (~4 items before scrolling).<br>• No distinction between evidence quality levels (e.g., peer-reviewed paper vs personal opinion). | **NEEDS IMPROVEMENT** |
| **Clarity over Activity** | ⚠️ **Partially Compliant**<br>• Severe badge clutter: individual claim cards display up to 7 distinct badges simultaneously.<br>• Identical icons (`FileText`) used for different concepts ("Evidence Items" vs "Claims with Evidence"). | **NEEDS IMPROVEMENT** |
| **Questions before Conclusions** | ❌ **Non-Compliant**<br>• Page hierarchy: Premise → Claims → Questions → Contributions.<br>• Questions are demoted to a lower section on the page.<br>• Selecting a question replaces the full claim list, but this core workflow is visually obscured. | **FAIL** |

---

## 3. Detailed Problem Identification

### 3.1 Information Hierarchy Failure (Critical)
The current page layout flows as follows:
$$\text{Header} \longrightarrow \text{Opening Premise} \longrightarrow \text{Claims} \longrightarrow \text{Questions} \longrightarrow \text{Contributions} \longrightarrow \text{Sidebar (below on mobile)}$$

**Discora Axiom Violation:** Knowledge building begins with **Questions**, advances to **Claims**, relies on **Evidence**, and yields **Understanding**. Displaying Claims before Questions forces users to consume answers before understanding what inquiry is being investigated.

---

### 3.2 Cognitive Overload & Card Clutter (High)
A single `ClaimCard` inside `claim-list.tsx` currently renders up to **17 distinct visual elements**:
1. "CLAIM" entity label badge
2. `claimType` badge (`fact`, `opinion`, `prediction`, `proposal`, `observation`)
3. `contextType` badge (`supporting_idea`, `counterpoint`, `observation`, `open_question`)
4. Credibility score badge (e.g., "78% Credibility")
5. Question Answer indicator badge
6. Debate side badge (`proposition` / `opposition`)
7. Retracted status banner
8. Raw content body text
9. Voting toolbar (Agree / Disagree + raw percentage consensus bar)
10. Relationship action triggers (`Supports`, `Contradicts`, `Refines`)
11. Author metadata row (Avatar, Username, Joined Date, Trust Signal)
12. Evidence item count badge
13. Relationship count badge
14. "Connectivity Status" helper card (4 state branches)
15. "View Comment Context" hyperlink
16. "View Evidence" expandable drawer trigger
17. Expandable relationship preview section

**Impact:** Users experience severe visual fatigue. Primary content is drowned out by decorative badges and state indicators.

---

### 3.3 Mobile Experience Breakdown (High)
- **Monolithic Scroll Depth:** `discussion-room.tsx` is an 843-line layout monolith. On mobile screens ($<768\text{px}$), the sidebar is rendered below the main column, requiring over $4,000\text{px}$ of vertical scrolling to access Evidence Explorer or Insights.
- **No Sticky Navigation:** Users scrolling deep into contributions lose all context of room title, active question, or claims.
- **Form Placement Friction:** The main contribution text area is at the absolute bottom of the page. Mobile users cannot quickly post or ask a question without scrolling past all comments.

---

### 3.4 Navigation & Interaction Friction (Medium)
- **Broken Sidebar Links:** "Related Views" in sidebar contains links (`?view=map` and `?view=sources`) that point to non-existent route handlers or unrendered legacy tabs.
- **Noop Callbacks:** In `comment-item.tsx`, `onNavigateToEvidence` is passed as a noop empty arrow function (`() => {}`), causing "View Evidence" clicks on comment nodes to fail silently.
- **Fragment Jump Disruption:** Clicking "View Comment Context" uses raw anchor scrolling (`#msg-{id}`), snapping the page un-smoothly and losing active scroll state.

---

### 3.5 Consensus Misunderstandings (Medium)
- **Percentage Misrepresentation:** `consensusRatio` is computed strictly as $\frac{\text{Agree Votes}}{\text{Total Votes}}$. Displaying "85% Consensus" misleads users into believing an assertion is objectively validated, even when it possesses 0 backing evidence items.
- **Lack of Evidence Weighting:** A claim with 100 agree votes and 0 evidence displays higher consensus than a claim with 5 agree votes backed by 3 peer-reviewed sources.

---

## 4. Summary of Identified Audit Issues

| Issue ID | Category | Description | Severity |
|---|---|---|---|
| **AUD-01** | Hierarchy | Claims rendered before Questions (Inquiry inversion) | **P0-Critical** |
| **AUD-02** | Interaction | `handleNavigateToEvidence` callback is a noop function | **P0-Critical** |
| **AUD-03** | Cognitive | 17 competing elements per Claim Card causing visual overload | **P1-High** |
| **AUD-04** | UX / Mobile | Evidence hidden behind manual expand toggle by default | **P1-High** |
| **AUD-05** | Performance | Duplicate network calls (`useRoomEvidence`, `useQuestions`) | **P1-High** |
| **AUD-06** | UX / Mobile | Pushed sidebar creates massive vertical scroll depth on mobile | **P1-High** |
| **AUD-07** | Tech Debt | 2,050+ lines of dead legacy tab code maintained in codebase | **P2-Medium** |
| **AUD-08** | UX | Broken query param links (`?view=map`, `?view=sources`) | **P2-Medium** |
| **AUD-09** | Philosophy | Vote percentage labeled as "Consensus" without evidence weighting | **P2-Medium** |
