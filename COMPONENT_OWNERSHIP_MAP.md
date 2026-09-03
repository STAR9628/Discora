# Component Ownership Map — Debate vs Discussion

**Date**: 2026-06-11
**Status**: Post-extraction reference

---

## Component Extraction Summary

### Removed from DiscussionRoom
Components that were conditional on `isDebate` and are now owned by DebateRoom:

| Component | Previous Location | New Owner | Lines Removed |
|-----------|------------------|-----------|---------------|
| `DebateHeader` | discussion-room.tsx:340-342 | DebateRoom | 3 |
| `DebateSidePicker` | discussion-room.tsx:370 | DebateRoom | 1 |
| User side banner CTA | discussion-room.tsx:371-397 | DebateRoom | 27 |
| `DebateScorecard` | discussion-room.tsx:394 | DebateRoom | 1 |
| `DebateResolution` | discussion-room.tsx:395 | DebateRoom | 1 |
| `DebateSideSelector` in claims tab | discussion-room.tsx:674-682 | DebateRoom | 9 |
| Debate badge in header | discussion-room.tsx:297-302 | DebateRoom | 6 |
| Debate empty state text | discussion-room.tsx:460-462 | DebateRoom | 3 |
| `isDebate` conditional on opening statement | discussion-room.tsx:348 | DebateRoom | 1 |
| `isDebate` imports (5 debate components) | discussion-room.tsx:19-24 | DebateRoom | 6 |
| `isDebate` hooks (useDebate, useDebateParticipants) | discussion-room.tsx:64-65 | DebateRoom | 2 |

**Total lines removed from DiscussionRoom**: ~60 lines of conditional logic + imports.

### Extracted to Shared Files

Previously inline in discussion-room.tsx, now in their own files for both DiscussionRoom and DebateRoom to import:

| Component | New File | Lines | Used By |
|-----------|----------|-------|---------|
| `CommentItem` | `src/features/discussions/components/comment-item.tsx` | 283 | DiscussionRoom, DebateRoom |
| `RoomEvidenceTab` | `src/features/discussions/components/room-evidence-tab.tsx` | 205 | DiscussionRoom, DebateRoom |
| `RoomSourcesTab` | `src/features/discussions/components/room-sources-tab.tsx` | 119 | DiscussionRoom, DebateRoom |
| `buildCommentTree` | `src/features/discussions/utils/build-comment-tree.ts` | 22 | DiscussionRoom, DebateRoom |

### Shared Components (unchanged, same file)

These components remain shared — both DiscussionRoom and DebateRoom import them:

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `ClaimList` | `src/features/discussions/components/claim-list.tsx` | 1106 | Claim rendering + voting |
| `QuestionList` | `src/features/discussions/components/question-list.tsx` | 375 | Question display |
| `EvidenceSection` | `src/features/discussions/components/evidence-section.tsx` | 559 | Evidence per claim |
| `ExtractClaimModal` | `src/features/discussions/components/extract-claim-modal.tsx` | 259 | Extract claim from message |
| `ClaimRelationDialog` | `src/features/discussions/components/claim-relation-dialog.tsx` | - | Claim relations |
| `MapTab` | `src/features/discussions/components/map-tab.tsx` | 888 | Argument map |
| `DiscussionHealth` | `src/features/discussions/components/discussion-health.tsx` | 190 | Health metrics |
| `DiscussionSummary` | `src/features/discussions/components/discussion-summary.tsx` | 207 | Summary |
| `DiscussionIntelligence` | `src/features/discussions/components/discussion-intelligence.tsx` | 293 | Insights |
| `ReportDialog` | `src/features/discussions/components/report-dialog.tsx` | 259 | Report content |
| `ConfirmDialog` | `src/components/ui/confirm-dialog.tsx` | - | Confirmation UI |
| `AuthorTrustSignal` | `src/features/reputation/components/author-trust-signal.tsx` | - | Reputation badge |
| `useAuthorsReputation` | `src/features/reputation/hooks/use-batch-reputation.ts` | - | Batch reputation |

### Debate-Only Components (already separated)

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `DebateHeader` | `src/features/debates/components/debate-header.tsx` | 114 | Motion + side cards |
| `DebateSidePicker` | `src/features/debates/components/debate-side-picker.tsx` | 113 | Join/leave/switch sides |
| `DebateSideSelector` | `src/features/debates/components/debate-side-selector.tsx` | - | Filter claims by side |
| `DebateScorecard` | `src/features/debates/components/debate-scorecard.tsx` | 75 | Live vote score |
| `DebateResolution` | `src/features/debates/components/debate-resolution.tsx` | 174 | Declare resolution |

### NEW: DebateRoom Component

| File | Lines | Purpose |
|------|-------|---------|
| `src/features/debates/components/debate-room.tsx` | ~500 | Debate-native room layout |

---

## Import Dependencies

### DiscussionRoom imports

```
discussion-room.tsx
  └─ comment-item.tsx
  └─ room-evidence-tab.tsx
  └─ room-sources-tab.tsx
  └─ build-comment-tree.ts
  └─ claim-list.tsx
  └─ question-list.tsx
  └─ extract-claim-modal.tsx
  └─ report-dialog.tsx
  └─ map-tab.tsx
  └─ confirm-dialog.tsx
  └─ author-trust-signal.tsx
  └─ use-batch-reputation.ts
  └─ use-discussions.ts
  └─ use-auth.ts
```

### DebateRoom imports

```
debate-room.tsx
  └─ comment-item.tsx                  (shared)
  └─ room-evidence-tab.tsx             (shared)
  └─ room-sources-tab.tsx              (shared)
  └─ build-comment-tree.ts             (shared)
  └─ claim-list.tsx                    (shared)
  └─ question-list.tsx                 (shared)
  └─ extract-claim-modal.tsx           (shared)
  └─ report-dialog.tsx                 (shared)
  └─ map-tab.tsx                       (shared)
  └─ confirm-dialog.tsx                (shared)
  └─ author-trust-signal.tsx           (shared)
  └─ use-batch-reputation.ts           (shared)
  └─ use-discussions.ts                (shared — hooks)
  └─ use-auth.ts                       (shared)
  └─ debate-header.tsx                 (debate-only)
  └─ debate-side-picker.tsx            (debate-only)
  └─ debate-side-selector.tsx          (debate-only)
  └─ debate-scorecard.tsx              (debate-only)
  └─ debate-resolution.tsx             (debate-only)
  └─ use-debates.ts                    (debate-only hooks)
```

### Shared Imports (both DiscussionRoom + DebateRoom)

Both room components import from `@/features/discussions/hooks/use-discussions` for data fetching (messages, claims, evidence, questions) and from the shared component files listed above.

---

## Complexity Metrics Target

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| DiscussionRoom LOC | 1540 | ~800 | -48% |
| DebateRoom LOC | 0 (inline) | ~500 | +500 (new file) |
| Total room LOC | 1540 | ~1300 | -16% |
| `isDebate` conditionals | ~10 | 0 | -100% |
| Inline components extracted | 3 (CommentItem, RmEvidence, RmSources) | 0 inline | -100% |
| Tabs controlled by | Single `activeTab` state (room) | Dedicated state per room | Cleaner |

## Ownership Principles

1. **Discussion feature owns**: message thread, comment tree, questions, claims, evidence, sources, map, report dialog
2. **Debate feature owns**: side management, scorecard, resolution, debate header, side picker, debate CTA
3. **Both share**: claim rendering, evidence rendering, voting UI, author trust, questions, map
4. **Neither owns**: UI primitives (buttons, dialogs, toasts) — owned by `components/ui`
