# DISCORA — PHASE 7D / PHASE D IMPLEMENTATION REPORT
## Unified Message / Claim / Question Composer & Question Option 1 Architecture

**Date:** September 10, 2026  
**Status:** COMPLETE & VALIDATED (PASS)  
**Execution Phase:** Phase 7D / Phase D  
**Primary Architect & Implementation Agent:** Antigravity  

---

## 1. Executive Summary

Phase D implements the **Unified Message / Claim / Question Composer** across Discora's Conversation feed in both Discussion and Debate rooms, adhering strictly to the user-approved **Question Option 1 Architecture**:

- **Core Mantra:** *"Familiar at the interaction layer, different at the understanding layer."*
- **Unified Composer:** A single modern, low-friction input component featuring a segmented pill switcher between:
  1. `Message` (default conversational feed contribution)
  2. `Claim` (intentional structured assertion; defaults to type `opinion`, non-blocking, elevated in-place in the feed)
  3. `Question` (exploratory room/topic-level inquiry)
- **Draft Preservation Guarantee:** Switching between `Message`, `Claim`, and `Question` preserves the user's drafted text seamlessly without accidental loss.
- **Question Option 1 Architecture:**
  - Submitting a Question creates the canonical conversational record in `messages` with `message_type = 'question'`.
  - The Question is rendered in the Conversation feed with an exploratory amber card presentation, `[QUESTION]` header badge, and `ROOM QUESTION` subheader.
  - Normal reply and reaction mechanisms are preserved.
  - No independent `questions` row was created (avoiding disconnected dual records).
  - No database schema changes or ad-hoc application bridges were introduced; the formal bridge to the Questions lens is deliberately deferred to **Phase H**.
- **Constraint Handling (No Arbitrary Limits):**
  - Reused existing database check constraints:
    - Messages: 1–2000 chars
    - Claims: 25–500 chars (with inline hint `min 25` if text is under threshold)
    - Questions: 1–2000 chars (as a message row)
- **Zero Layout Regressions:** Validated across 4 viewports (375px, 390px, 834px, 1440px) with 0px horizontal overflow.

---

## 2. Architecture & Data Model Decisions

### 2.1 Question Architecture Decision (Option 1)
| Dimension | Specification | Implementation in Phase D |
|---|---|---|
| **Data Record** | Canonical conversational record | Stored in `messages` table with `message_type = 'question'` |
| **Questions Lens Sync** | Deferred to Phase H | **Zero** dual inserts into `questions` table; no detached rows |
| **Feed Presentation** | Elevated exploratory card | Amber card (`bg-amber-500/5 border-amber-500/30`), `[QUESTION]` badge, `ROOM QUESTION` header |
| **Interactive Affordances** | Familiar conversation actions | Reply, React (👍, 💡, 🤔), More (Edit within 5m, Report) |
| **Claim Actions Exclusion** | Distinct from assertions | Excludes "Make this a Claim" and "Request as Claim" |

> **Documented Phase D Intentional Limitation (Deferred to Phase H):**  
> Because Question Option 1 does not write dual rows into the legacy `questions` table, newly submitted conversational Questions appear in the Conversation feed rather than immediately appending to the separate `/questions` lens. This is intentional and avoids dual-record drift until the formal lens relationship is addressed in Phase H.

### 2.2 Claim Mode Architecture
| Step | Action | Outcome |
|---|---|---|
| **1. Message Record** | `postMessage` creates root row | Provides stable message ID and feed presence |
| **2. Structured Record** | `createClaim` creates claim row | Links `origin_message_id`, defaults `claim_type: "opinion"`, context `"observation"` |
| **3. Feed Elevation** | `DiscussionDataProvider` & `CommentItem` | `claimedMessageIds.has(message.id)` immediately mounts `<ClaimInConversation />` |
| **4. Debate Side Attribution** | Passes participant side | Attributes claim to `proposition` or `opposition` if user has joined a side |

### 2.3 Message Mode Architecture
- Default mode for any room visitor or reply action.
- Creates standard `messages` record (`message_type = 'message'`).
- Preserves author claim conversion (`Make this a Claim`) and peer claim requests (`Request as Claim`).

---

## 3. Code Modifications Summary

### 3.1 Service & Hook Layer
- [`src/features/discussions/services/discussion-service.ts`](file:///d:/Projects/Discora/src/features/discussions/services/discussion-service.ts):
  - Updated `postMessage` to accept `messageType?: "message" | "question"`.
  - Sets `message_type: data.messageType || "message"` on insert.
- [`src/features/discussions/hooks/use-discussions.ts`](file:///d:/Projects/Discora/src/features/discussions/hooks/use-discussions.ts):
  - Updated `usePostMessage` mutation function input to include `messageType?: "message" | "question"`.

### 3.2 UI Components
- **[NEW]** [`src/features/rooms/components/unified-composer.tsx`](file:///d:/Projects/Discora/src/features/rooms/components/unified-composer.tsx):
  - Unified segmented control: `[ Message ]` (MessageSquare), `[ Claim ]` (Scale), `[ Question ]` (HelpCircle).
  - Draft preservation across all mode switches.
  - Mode-specific hints and placeholders.
  - Claim type pills: `Opinion` (selected by default), `Fact`, `Prediction`, `Proposal`, `Observation`.
  - Character constraint indicators: `0 / 2000` for Message/Question; `0 / 500 (min 25)` for Claim.
  - Replying banner with cancel affordance.
  - Anonymous contribution toggle.
  - Keyboard shortcut: `Ctrl+Enter` / `Cmd+Enter` to submit.
  - Unauthenticated fallback: renders `GuestContributionPrompt`.
- [`src/features/discussions/components/comment-item.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/comment-item.tsx):
  - Added `const isQuestion = message.messageType === "question";`.
  - Rendered `[Question]` badge in header row.
  - Rendered elevated exploratory card when `isQuestion` is true.
  - Excluded "Make this a Claim" and "Request as Claim" for question messages.
- [`src/features/discussions/components/discussion-contributions-section.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/discussion-contributions-section.tsx):
  - Replaced ad-hoc form and guest prompt with `UnifiedComposer`.
  - Removed redundant state variables and submit handler.
- [`src/features/debates/components/debate-room.tsx`](file:///d:/Projects/Discora/src/features/debates/components/debate-room.tsx):
  - Replaced ad-hoc debate input form with `UnifiedComposer`.
  - Passed `participantSide={userParticipation?.side}`.
- [`src/features/discussions/components/discussion-room.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/discussion-room.tsx):
  - Added missing `roomId={room.id}` prop to `CommentItem`.

---

## 4. Verification & Validation Evidence

### 4.1 Automated Build, Typecheck, and Linting
- **Typecheck (`npx tsc --noEmit`):** PASSED (0 errors).
- **Lint (`npm run lint`):** PASSED (0 errors).
- **Production Build (`npm run build`):** PASSED (all 21 static/dynamic pages compiled successfully).

### 4.2 Automated Playwright QA (`scripts/phase7d-phase-d-qa.mjs`)
Executed against running production server on `http://localhost:3000`:

```
=== FINAL TEST RESULTS ===
{
  "guestDiscussionPrompt": true,
  "guestDebatePrompt": true,
  "composerModesExist": true,
  "draftPreservedAcrossModes": true,
  "claimConstraintEnforced": true,
  "postQuestionOption1Success": true,
  "questionStylingCorrect": true,
  "questionNoClaimConversion": true,
  "postClaimSuccess": true,
  "claimRenderedInConversation": true,
  "postMessageSuccess": true,
  "debateComposerWorks": true,
  "responsiveOverflowZero": true
}

>>> ALL PHASE D VALIDATION CHECKS PASSED! <<<
```

### 4.3 Responsive Viewport & Overflow Results
- **Mobile 375px (`mobile_375`):** 0px overflow (scrollWidth === clientWidth).
- **Mobile 390px (`mobile_390`):** 0px overflow.
- **Tablet 834px (`tablet_834`):** 0px overflow.
- **Desktop 1440px (`desktop_1440`):** 0px overflow.

---

## 5. Visual Artifacts Captured

1. **Mobile (375px) Composer Layout:**  
   [`docs/phase7d_phase_d_mobile_375.png`](file:///d:/Projects/Discora/docs/phase7d_phase_d_mobile_375.png)  
   *Demonstrates compact segmented pills, textarea, checkbox, counter, and send button on 375px screen.*

2. **Desktop (1440px) Conversation Feed with Claim & Normal Message:**  
   [`docs/phase7d_phase_d_desktop_1440.png`](file:///d:/Projects/Discora/docs/phase7d_phase_d_desktop_1440.png)  
   *Demonstrates in-place elevated Claim card with examination buttons (+ Evidence, + Argument, Inquiry), normal message card, and bottom composer.*

3. **Claim Mode with Type Pills:**  
   [`docs/phase7d_phase_d_claim_mode.png`](file:///d:/Projects/Discora/docs/phase7d_phase_d_claim_mode.png)  
   *Demonstrates blue Scale icon, mode guidance, Opinion/Fact/Prediction/Proposal/Observation pills, 500 char counter with min 25 indicator, and Post Claim button.*

4. **Question Mode:**  
   [`docs/phase7d_phase_d_question_mode.png`](file:///d:/Projects/Discora/docs/phase7d_phase_d_question_mode.png)  
   *Demonstrates amber HelpCircle icon, mode guidance ("Explores the topic with room-level inquiry"), 2000 char counter, and Post Question button.*

5. **Elevated Question Card in Conversation Feed:**  
   [`docs/phase7d_phase_d_question_card.png`](file:///d:/Projects/Discora/docs/phase7d_phase_d_question_card.png)  
   *Demonstrates `[QUESTION]` header badge, exploratory amber tint, `ROOM QUESTION` tag, and standard conversational actions (Reply, React).*

---

## 6. Scope Boundary & Next Phase Readiness

- **Phase D Scope:** Strictly completed.
- **Phase E or later:** NOT started.
- **Next Step:** Ready for User Review and authorization of Phase E.
