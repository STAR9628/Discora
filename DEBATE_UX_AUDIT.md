# Debate UX Audit

**Date**: 2026-06-11
**Scope**: Compare Discussion Room vs Debate Room — identify shared UI, duplicated workflows, elements that make them feel identical.
**Status**: Current — pre-redesign baseline.

---

## 1. Architecture Summary

### Current State

```
/discussions/[slug]  →  DiscussionRoom (1540 lines)
                          ├── if roomType === "discussion" → all tabs + message thread
                          └── if roomType === "debate"     → same tabs + same message thread
                                                           + bolted-on debate components
```

**There is no dedicated debate room page.** Both discussion rooms and debate rooms render through the identical `DiscussionRoom` component. The only difference is conditional rendering of debate-specific components (`DebateHeader`, `DebateSidePicker`, `DebateScorecard`, `DebateResolution`, `DebateSideSelector`).

---

## 2. Shared UI Inventory

### 100% Identical (same component, same rendering, same behavior)

| Feature | Discussion Room | Debate Room |
|---------|----------------|-------------|
| URL path | `/discussions/{slug}` | `/discussions/{slug}` |
| Top-level component | `DiscussionRoom` | `DiscussionRoom` |
| Tab bar (6 tabs) | Discussion \| Questions \| Claims \| Evidence \| Sources \| Map | Same 6 tabs |
| Message thread (`CommentItem`) | Recursive thread with reply/edit/report | **Identical** — no side indicators on messages |
| Claim cards (`ClaimList`) | Colored left border by claim type, voting, evidence | **Identical** — side badge added, rest same |
| Evidence cards (`EvidenceSection`) | Thumbs up/down, source citation | **Identical** |
| Voting UI | Thumbs up/down + consensus ratio bar | **Identical** |
| Question list (`QuestionList`) | Q&A format | **Identical** |
| Argument map (`MapTab`) | Graph view with `GraphView` | **Identical** |
| `ExtractClaimModal` | Create claim from message | **Identical** — `debateSide` prop added |
| `ClaimRelationDialog` | Link claims (supports/contradicts/refines) | **Identical** |
| `ReportDialog` | Report inappropriate content | **Identical** |
| Room header card | Title, description, topic, date, message count | **Identical** — Badge shows "Debate" vs "Discussion" |
| Opening statement display | Shows opening statement | **Identical** |
| `AuthorTrustSignal` | Reputation badge on each author | **Identical** |
| `ClaimCredibilityBadge` | Credibility indicator on claims | **Identical** |

### Debate-Specific (5 components added on top)

| Component | Placement | Purpose |
|-----------|-----------|---------|
| `DebateHeader` | Top of room, after room header | Side-by-side proposition vs opposition cards with claim/participant counts |
| `DebateSidePicker` | Below header (before user joins) | "Choose Your Side" buttons — Support / Challenge / Neutral |
| `DebateSideSelector` | Inside Claims tab (after joining) | Filter claims by proposition/opposition side |
| `DebateScorecard` | Below side picker | Per-side agreement score (agree - disagree) |
| `DebateResolution` | Below scorecard (creator only) | Winner declaration + summary |

---

## 3. UX Problems

### Problem 1: Same URL, Same Shell, Same Tabs

When a user clicks a debate card and lands at `/discussions/{slug}`, the entire tab structure (Discussion, Questions, Claims, Evidence, Sources, Map) is inherited from the discussion system. A debate room has different needs — the tabs should reflect debate concepts, not discussion concepts.

**Severity: HIGH**

### Problem 2: Message Thread Has No Debate Identity

The core conversation area — `CommentItem` — shows a generic message thread identical to discussion rooms. Messages in a debate have no:
- Side indicator (was this user supporting or challenging when they wrote this?)
- Debate-specific actions ("I'm switching sides")
- Position visibility ("This comment is from the Support team")
- Turn-taking structure

**Severity: HIGH**

### Problem 3: Claims Are Drop-in, Not Native

Claims feel like a tab you visit, not the core debate mechanism. In a debate claims should be:
- The primary output, not a secondary tab
- Visually anchored to a side (support/challenge)
- The building blocks of the final conclusion

Instead, claims are buried behind a tab, with a `DebateSideSelector` filter that feels like a data-viewing tool, not a participation mechanic.

**Severity: HIGH**

### Problem 4: Side Switching Has No UI

The current `DebateSidePicker` only shows "Supporting this motion" or "Challenging this motion" with a "Leave" button. There is no:
- Side-switch button
- Warning about losing position
- Audit trail in the message thread
- System message when someone switches

Users must leave and re-join to switch sides, which is not discoverable.

**Severity: MEDIUM**

### Problem 5: Scorecard Is A Game Score, Not Understanding

`DebateScorecard` shows `agree - disagree` per side. This is a competitive score that incentivizes popularity-seeking. It does not communicate:
- Which side has stronger evidence
- Where consensus is forming
- What questions remain unanswered
- The quality of arguments vs vote counts

**Severity: MEDIUM**

### Problem 6: Resolution Is "Who Won", Not "What We Concluded"

`DebateResolution` labels the action "Declare Resolution" and the options are "Proposition Wins", "Opposition Wins", or "Draw". This frames debate as a contest, not a conclusion-building exercise.

The resolution stores `{ winner: "proposition", summary: "..." }` — the winner is primary, the conclusion is secondary.

**Severity: HIGH**

### Problem 7: Inquiry Is Absent

There is no inquiry concept. The closest features are:
- Questions tab (generic Q&A, no inquiry framing)
- Claim relations (supports/contradicts/refines — not inquiry)

There is no way to:
- Ask "what evidence supports this claim?"
- Challenge assumptions without taking a position
- Mark a claim as "under investigation"
- Distinguish between inquiry and position-taking

**Severity: HIGH**

### Problem 8: Mobile Layout Is Stacked

The debate-specific components (`DebateHeader`, `DebateSidePicker`, `DebateScorecard`, `DebateResolution`) stack vertically in a single column on mobile. The proposition/opposition side-by-side cards become stacked cards. The message thread, claims, and evidence each require full-screen tab switches.

There is no mobile-specific debate layout.

**Severity: MEDIUM**

---

## 4. Duplicated Workflows

| Workflow | Discussion | Debate | Verdict |
|----------|------------|--------|---------|
| Post a message | Comment thread → type → submit | Same | Identical — should show side indicator in debate |
| Create a claim | Claims tab → fill form → submit | Same + side filter | Same UX, different data |
| Vote on a claim | Thumbs up/down | Same | Identical — debate should show side-contextual voting |
| Add evidence | EvidenceSection → fill form | Same | Identical |
| Ask a question | Questions tab → type → submit | Same | Identical — debate should frame as "inquiry" |
| Link claims | ClaimRelationDialog → supports/contradicts/refines | Same | Identical |
| Browse feed | Topic filter → card list | Status filter → card list | Different filters, same card structure |

---

## 5. What Makes Them Feel Identical

Ranked by impact:

1. **Same page route (`/discussions/[slug]`)** — the most fundamental identity problem
2. **Same tab structure** — 6 identical tabs, with debate components hidden behind `isDebate` conditionals
3. **Same message thread** — the primary interaction area is identical
4. **Same claims/evidence/voting UI** — identical components, same visual treatment
5. **Same URL naming** — debate cards link to `/discussions/{slug}`
6. **Same feed structure** — discussion feed includes debates as a sub-type with a badge
7. **Same component ownership** — 90% of debate room UI is owned by `features/discussions`

---

## 6. Scoring

### Distinctiveness — 2/10

Debate and Discussion are visually and structurally nearly identical. The only distinguishing elements are a "Debate" badge, two colored side cards in the header, and a scorecard. Remove those and you cannot tell them apart.

### Clarity — 4/10

The purpose of a debate room is clear at the top (proposition vs opposition cards), but the interface below that communicates "generic discussion thread with extra features". The participant does not feel like they are in a structured debate.

### Engagement — 3/10

There is no debate-specific engagement loop. No turn-taking, no position anchoring, no inquiry mechanic, no conclusion-building narrative. The engagement loop is the same as discussions: read → post → vote.

### Mobile Usability — 3/10

Stacked vertical layout. Side-by-side proposition/opposition cards collapse to stacked cards. Tab switches require full page navigation. No mobile-specific debate layout exists.

### Debate Identity — 1/10

The debate room does not communicate: challenge, inquiry, convergence, or conclusion-building. It communicates: "discussion with side labels." The resolution system frames debate as a contest with a winner, not a conclusion-building process.

---

## 7. Summary

| Problem | Severity | Effort to Fix |
|---------|----------|---------------|
| Same URL + same shell | HIGH | High (new route, new component, restructuring) |
| Thread has no debate identity | HIGH | Medium (message component changes) |
| Claims not native to debate | HIGH | Medium (layout restructure) |
| No side-switching UI | MEDIUM | Low (new component) |
| Scorecard is a game score | MEDIUM | Medium (new scoring model) |
| Resolution is "who won" | HIGH | Medium (redesign resolution model) |
| No inquiry layer | HIGH | High (new feature) |
| Mobile layout lacking | MEDIUM | Medium (responsive design) |

**Overall assessment**: The debate experience needs a fundamental layout restructure, not component additions. The current approach of bolting debate-specific UI onto the discussion shell has reached its limit. A dedicated `/debates/[slug]` page with a debate-native layout is required.
