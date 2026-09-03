# Inquiry Architecture Review

**Date**: 2026-06-12
**Status**: Analysis only — no implementation.
**Based on**: `INQUIRY_LAYER_DESIGN.md`, `SIDE_SWITCH_ARCHITECTURE.md`, `CONSENSUS_SYSTEM.md`

---

## 1. Foundational Problem

The current design treats Inquiry as a **participant role** (a third side alongside Support and Challenge). This is the wrong abstraction.

### The Conflation

The design conflates two orthogonal concerns:

| Concern | Meaning | Existing Mechanism |
|---------|---------|-------------------|
| **Undecided state** | "I haven't reached a conclusion yet" | `debate_participants.side = 'neutral'` |
| **Clarification action** | "I want to ask a question about this claim" | No mechanism (missing) |

A user can be in any combination:

| State | Wants to ask questions | Needs |
|-------|----------------------|-------|
| Undecided | Yes | Inquiry role + inquiry contribution ability |
| Decided (Support) | Yes | Inquiry contribution ability (on their own side) |
| Decided (Challenge) | Yes | Inquiry contribution ability (on opposition's claims) |
| Undecided | No | Passive observation (current neutral, no changes needed) |

**Making inquiry a role forces a false choice: "Do you want to be an inquirer or a participant?"** Users who have a position but want clarification cannot ask structured questions without switching out of their role.

### Core Principle

> **Inquiry is a contribution type, not a participant role.**

The participant role `'inquiry'` should only describe the *undecided state* — replacing `'neutral'` with `'inquiry'` as a semantic upgrade. The *action of asking questions* should be available to all participants.

---

## 2. Role vs Contribution — Detailed Analysis

| Dimension | As Role (current design) | As Contribution (proposed) |
|-----------|-------------------------|---------------------------|
| Who can ask | Only users in Inquiry role | All participants |
| Side picker | 3 options: Support/Challenge/Inquiry | 2 options: Support/Challenge + "Ask questions" on every claim |
| Switching cost | Must switch role to ask or to argue | No switching needed — orthogonal actions |
| Identity signal | "I am investigating" (declarative) | "I want clarification on this point" (specific) |
| Claim creation restriction | Inquirers cannot make claims | Everyone can make claims; inquiry is separate |
| Reply/response | Claim authors respond to inquiries | Same — but response is expected from anyone, not just claim author |
| Inquiry count | Per user per debate (50 max) | Same cap, but shared across all users |
| UI complexity | Simple side picker | More button states per claim/evidence |
| Moderation of bad actors | Easy — restrict role | Harder — bad actors can ask from any role |

**Recommendation**: Implement inquiry primarily as a contribution type. Keep `'inquiry'` as a participant role for the undecided-state signal, but make the inquiry action available to Support and Challenge participants too.

---

## 3. Inquiry Attachment Model

### What can an inquiry attach to?

| Target | Should be attachable? | Notes |
|--------|----------------------|-------|
| Claim | Yes (current design) | Most common — clarifying a specific argument |
| Evidence | Yes (current design) | Requesting source verification or methodology |
| Claim-to-claim relationship | **Missing** | "How does claim A relate to claim B?" — needed for argument map |
| Claim-to-evidence relationship | **Missing** | "Is this evidence supporting or undermining this claim?" |
| The motion itself | Debatable | "What do you mean by 'better'?" — belongs in the resolution metadata |
| A response/inquiry | **Edge case** | Meta-inquiry on an inquiry (should probably be a chat message, not structured) |

### Attachment Model (Revised)

Replace the current `claim_id`/`evidence_id` exclusive-or with a polymorphic target:

```sql
-- Option A: Polymorphic columns (extensible, but more columns)
target_type text not null check (target_type in ('claim', 'evidence', 'claim_relation')),
target_id uuid not null,
target_context jsonb  -- e.g., for claim_relation: {"source_claim_id": "...", "target_claim_id": "..."}

-- Option B: Single jsonb target (flexible but no FK enforcement)
target jsonb not null  -- {type: "claim", id: "..."} or {type: "evidence", id: "..."}
```

**Recommendation**: Option A with FK enforcement via `check` constraints and triggers. But for v1, limiting to claims and evidence (dropping relationships) is acceptable — relationships can be added later when argument maps are implemented.

### Cross-Side Inquiry

A Support-side user inquiring on a Challenge-side claim is the most valuable inquiry pattern — it signals intellectual honesty. The current design supports this (inquiry is public). But:

- Should the inquirer's current side be visible in the inquiry UI? **Yes** — "Asked by Alice (Support)" provides context for the claim author.
- Should Support-side inquiries on Support-side claims be distinguished? **Yes** — "Clarifying question from inside the position" is different from "Challenging question from the other side."

**Metadata on inquiry**:

```json
{
  "inquirer_side": "support" | "challenge" | "inquiry" | "neutral",
  "target_side": "proposition" | "opposition",
  "intent": "clarify" | "challenge" | "request_evidence" | "assumption_check"
}
```

---

## 4. Inquiry Lifecycle — Revised

### Current States

```
open → addressed → acknowledged → closed
```

### Problems

1. **Who transitions?** The current design doesn't clearly assign ownership of each transition.
2. **Stalemate** — If the inquirer never acknowledges, the inquiry stays in "addressed" forever.
3. **No re-open** — What if the response is unsatisfactory? Can the inquirer re-open?
4. **Expiry** — No mechanism for stale inquiries.
5. **Dead inquirer** — What if the inquirer leaves the platform?

### Proposed States

```
open → responded → satisfied → closed
                  ↘  unsatisfied  → re-opened → responded → ...

open → [timeout: 14d] → expired (auto-closed)
```

| State | Meaning | Set by |
|-------|---------|--------|
| `open` | Awaiting response | System (on create) |
| `responded` | Someone responded to the inquiry | Responder (on response) |
| `satisfied` | Inquirer confirms the response addressed their question | Inquirer |
| `unsatisfied` | Inquirer wants more detail | Inquirer (re-opens) |
| `closed` | Final — inquirer is done | Inquirer |
| `expired` | No response within 14 days | System (cron/trigger) |

### Who Can Respond?

- **Anyone** — not just the claim author. This prevents a single bottleneck.
- The claim author gets a "required" response indicator (expectation, not enforcement).

### Acknowledgment as a Trust Signal

Require acknowledgment for the inquiry to be counted as "resolved" in debate health metrics. But don't require it for the inquiry to be closed — the inquirer can close without acknowledging.

### Completion Obligations

**No strict obligations.** But:
- Unresolved inquiries count negatively in debate health metrics
- Inquirers who never acknowledge responses have a visible "ghost inquiry" pattern
- Moderators can close inquiries from users who have left the platform

---

## 5. Interaction Analysis

### With Side Switching

| Scenario | Behavior |
|----------|----------|
| Support user creates inquiry | Inquiry persists regardless of side changes |
| Inquiry user switches to Support | Inquiry remains, attributed to them with `inquirer_side: 'inquiry'` (historical) |
| User switches sides, then creates inquiry | New inquiry shows current side |
| User leaves debate | Inquiries remain visible; no new responses expected from them |

**Key rule**: Inquiries are *not* side-specific in the data model. The `inquirer_side` is metadata for context, not a binding constraint. Side switching doesn't affect inquiry ownership.

### With Consensus

| Aspect | Interaction |
|--------|-------------|
| Open inquiries on consensus | An accepted conclusion with open inquiries should show: "Accepted, but 3 inquiries unresolved" |
| Inquiry → consensus quality | More inquiries → more thorough debate → higher quality signal |
| Inquiry as consensus blocker | Blocking should not be automatic. Open inquiries raise a flag but don't prevent conclusion acceptance. |
| Conclusion addresses inquiry | If a conclusion revision directly addresses an inquiry, the inquiry can auto-transition to `satisfied` |
| Inquiry used to game consensus | Create 50 inquiries to delay conclusion → 50 max cap prevents this |

### With Reputation

| Event | Points | Notes |
|-------|--------|-------|
| INQUIRY_POSTED | +3 | Lower than +5 from current design — quantity risk is real |
| INQUIRY_RESPONDED | +5 | Higher than current +3 — responses are more valuable |
| INQUIRY_SATISFIED | +2 | Inquirer acknowledges quality response |
| INQUIRY_EVIDENCE_CREATED | +5 | Evidence submitted in direct response to an inquiry |
| INQUIRY_UNSATISFIED | 0 | No penalty for demanding more — prevents discouragement |

**No negative reputation for inquiries.** Even bad-faith inquiries should be handled via moderation, not reputation.

### With Argument Maps

Inquiries should appear as annotation nodes on map elements:

```
[Claim A] ─── supports ───→ [Claim B]
    │                            │
    └── [Inquiry: "What          └── [Inquiry: "How does
          evidence?"]  🔍               this follow?"]  🔍
```

- Each claim/evidence node can have a "has inquiries" indicator
- Map zoom level determines whether inquiry annotations are visible
- Filter: "Show only nodes with unresolved inquiries"

---

## 6. Third Side Analysis

### What Breaks If Inquiry Is a Third Side

| Component | Impact |
|-----------|--------|
| **Split-pane layout** | No natural place for a third column. Inquiry is neither Support nor Challenge. |
| **Binary debate framing** | "Proposition vs Opposition" becomes "Proposition vs Opposition vs Undecided" — undermines the motion structure |
| **Claim/evidence scoring** | Do inquirers vote on claims? If no, they're second-class participants. If yes, what does an inquirer's vote mean? |
| **Consensus quorum** | The current quorum model counts Support/Challenge separately. Inquiry-as-side doesn't fit. |
| **Debate-side-picker** | Three labeled buttons instead of two. Users feel pressure to "pick a side" or be an inquirer. |
| **Side filter** | "Support claims" / "Challenge claims" / "Inquiry items" — inquiry items aren't claims, don't belong here. |
| **Timeline** | "Joined as Inquiry" — is this a participation event? |
| **System messages** | "X joined as an inquirer" — is this useful information? |
| **Reputation leaderboard** | Inquirer rep is mixed with debater rep — apples and oranges |
| **Neutral → Inquiry rename** | Existing neutral participants need migration or coexist |

### What Preserves

- The `debate_participants` schema (adding `'inquiry'` to the check constraint)
- RLS policies (they check user_id, not side)
- Moderation pipeline (inquiries are subject to standard flagging)
- Room visibility rules (public/private unaffected)
- Core message flow (inquiries are a new table, not a new message type)

### Key Architectural Tension

> **Debates are fundamentally binary.** A motion is a proposition that you either support or challenge. Inquiry is not a position on the motion — it's a method of engaging with the arguments.

Making inquiry a third side undermines the motion-centric design. Making inquiry a contribution type (available to all) preserves the binary while adding depth.

**Recommendation**: Do not implement Inquiry as a third side. Use `'inquiry'` as a renamed `'neutral'` (undecided signal) paired with inquiry-as-contribution-type available to all participants.

---

## 7. Summary of Recommendations

| # | Decision | Current Design | Recommended |
|---|----------|---------------|-------------|
| 1 | Inquiry nature | Participant role | **Contribution type** (available to all) |
| 2 | Participant role | `'inquiry'` as third side | `'inquiry'` replaces `'neutral'` as undecided signal |
| 3 | Attachment targets | claim_id OR evidence_id | claim_id, evidence_id (v1); add claim_relations (v2) |
| 4 | Lifecycle states | open → addressed → acknowledged → closed | **open → responded → satisfied/unsatisfied → closed/expired** |
| 5 | Who can respond | Claim author only | **Anyone** |
| 6 | Completion obligations | None explicit | **No strict obligations**; ghost inquiry visibility pattern |
| 7 | Inquiry + side switching | Persists through switch | Same — no change needed |
| 8 | Inquiry + consensus | Not addressed | **Open inquiries flag but don't block** conclusion acceptance |
| 9 | Inquiry + reputation | INQUIRY_POSTED +5 → +3, INQUIRY_ANSWERED +3 → +5 | Lower create reward, higher response reward |
| 10 | Inquiry + argument maps | Not addressed | **Annotation nodes** on map elements; filter by unresolved |
