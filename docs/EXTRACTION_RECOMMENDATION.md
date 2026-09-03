# Extraction Recommendation

## Current State Summary

| Metric | Value |
|---|---|
| DebateRoom LOC | 723 (independent, no DiscussionRoom import) |
| DiscussionRoom LOC | 630 (independent, no isDebate conditionals) |
| Shared components extracted | 4 (CommentItem, RoomEvidenceTab, RoomSourcesTab, buildCommentTree) |
| Debate conditionals in discussions | 1 file (discussion-feed.tsx — appropriate feed-level routing) |
| Split-pane implementation | Prototype complete (claim filtering, 2-column grid, mobile tabs) |
| Remaining design docs | Side switching, inquiry, consensus, philosophy, roadmap — all done |

## Option Assessment

### A. Continue extraction
Effort: Medium (new hooks, new types, duplication of queries)
Impact: Low (shared hooks are genuinely shared domain — messages, claims, evidence, questions are the same data model)
Risk: Medium (fragmentation — two hook sets to maintain)
**Verdict: Reject.** Diminishing returns. The extraction boundary is clean. Duplicating hooks would introduce maintenance debt without architectural benefit.

### B. Build split-pane fully
Effort: Medium (evidence splitting, side-aware contributions, responsive polish)
Impact: High (immediate UX improvement — participants see "their side" vs "other side" across all tabs)
Risk: Low (no schema changes, extends existing pattern)
**Verdict: Viable.** Highest user-facing impact with lowest risk. Builds on current prototype.

### C. Implement side switching
Effort: Medium-High (new table `debate_side_changes`, trigger, migration, UI dialog, system messages)
Impact: High (solves #1 UX complaint: "I'm locked to one side forever")
Risk: Medium (migration touches DB, need to prevent abuse, cooldown logic)
**Verdict: Viable.** Required for debate identity. Design complete in `SIDE_SWITCH_ARCHITECTURE.md`.

### D. Implement inquiry layer
Effort: High (2 new tables, rework questions tab, new UI components, moderation rules)
Impact: Medium (replaces neutral/questions with richer interaction)
Risk: High (many unknowns — moderation, spam, orphaned items)
**Verdict: Reject.** Premature. Inquiry replaces questions/neutral but neutral is still the joining fallback. Breaking that chain without side switching first creates a UX gap.

---

## Recommendation: C — Implement side switching

**Justification:**

1. **Architecture gap.** The debate room now has a dedicated route, split-pane claims, scorecard, and resolution — but participants cannot switch sides. This is the single largest UX gap in the current debate identity. The `DEBATE_UX_AUDIT` scored debate identity at 1/10 originally; side switching alone would bring workflow identity from 7 → 9.

2. **Design is ready.** `SIDE_SWITCH_ARCHITECTURE.md` provides:
   - Complete DB schema (`debate_side_changes` table with cooldown enforcement)
   - Trigger for `handle_debate_side_change` (creates system message, enforces 7-day cooldown, fires reputation event)
   - UI spec (confirmation dialog, optional reason, previous side badge in timeline)
   - Reputation event type (+15 SIDE_SWITCH)
   - Migration SQL (rollback-safe)

3. **Unblocks other work.** Side switching is a prerequisite for:
   - Consensus system (voting per side needs accurate participant tracking)
   - Evidence per side (side assignments must be dynamic)
   - Inquiry layer (inquirers need to be able to change approach)

4. **No extraction debt.** Unlike options B/D which add to the debate room without addressing its core weakness, side switching fixes the fundamental identity problem. The split-pane prototype is functional enough to serve alongside.

### Recommended order after side switching:
1. **Side switching** (C) — fix identity lock
2. **Refine split-pane** (B) — evidence per side, side-specific contribution filtering
3. **Consensus v1** — conclusion JSONB replacing resolution
4. **Inquiry layer** (D) — replacing neutral/questions

### What is NOT recommended:
- Extracting shared hooks (duplication without benefit)
- Building inquiry layer now (premature without side switching)
- Full split-pane refinement first (improving UX of a fundamentally locked-in workflow is cosmetic)
