# Discora — Phase 7D / Phase D Final Conversation UX Correction Report

**Status:** Completed and Verified  
**Date:** September 10, 2026  
**Scope:** Phase D Conversation UX Correction (Chat-like conversational interaction layer, viewport-fixed unified composer, speaker alignment, highlighted claims/questions, Support/Not Agree semantic colors).  
**Constraint Adherence:** Phase E was not started. Product-authority markdown files were not altered. No unapproved features or character limits were invented.

---

## 1. Executive Summary

This targeted correction addresses the interaction layer of Discora's Conversation lens across both Discussion rooms and Debate rooms. While the data layer and unified composer functionality were established previously in Phase D, the conversation feed still visually resembled a list of database records.

This correction achieves the core UX goal: **The Conversation now genuinely feels like a calm, modern group chat (WhatsApp / Telegram / Instagram / iMessage) at the interaction layer, while housing Discora's structured understanding layer directly inside conversational bubbles.**

---

## 2. Files Changed

| File | Type | Changes Made |
|---|---|---|
| `src/features/rooms/components/unified-composer.tsx` | Component | Implemented viewport-fixed container (`fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 z-35`), minimal idle single-line bar (`Write a message... →`), focus-expand interaction revealing 3 modes (`Message`, `Claim`, `Question`), anonymous checkbox, claim type selector, and draft preservation across modes. |
| `src/features/discussions/components/comment-item.tsx` | Component | Replaced full-width cards with conversational chat bubbles: current user (author) aligned RIGHT (`items-end`, `bg-primary/10`), other participants aligned LEFT (`items-start`, `bg-card/65`). Implemented constrained bubble widths (`max-w-[70%]`–`[85%]` with `w-fit`), conversational reply threadlines, and aligned action bars. |
| `src/features/discussions/components/claim-in-conversation.tsx` | Component | Changed user-facing stance label from `Challenge` to `Not Agree`. Updated active stance styling to blue (`text-blue-500 bg-blue-500/15`) for Support and amber (`text-amber-500 bg-amber-500/15`) for Not Agree (strictly avoiding green/red). Whole claim bubble subtly highlighted with conversational width. |
| `src/features/discussions/components/claim-list.tsx` | Component | Synchronized stance terminology: updated challenge action to `Not Agree`. |
| `src/features/rooms/components/guest-contribution-prompt.tsx` | Component | Compacted padding and card geometry (`p-3.5 sm:p-4`) for fixed viewport footer presentation. |
| `src/features/discussions/components/discussion-contributions-section.tsx` | Component | Added `pb-36 sm:pb-44` scroll clearance so the last message scrolls completely clear of the fixed viewport composer. Removed static border wrapper. |
| `src/features/debates/components/debate-room.tsx` | Component | Added `pb-36 sm:pb-44` scroll clearance to the debate conversation tab and cleaned up composer wrapper. |
| `scripts/phase7d-ux-correction-qa.mjs` | Test script | Comprehensive Playwright test covering viewports (375px, 390px, 834px, 1440px), scroll positions, alignment, stance colors, and draft preservation. |
| `scripts/capture-conversation-bubbles.mjs` | Test script | Targeted screenshot capture script for visual QA inspection. |

---

## 3. Exact UX Corrections

### 3.1. Composer — Permanently Visible & Viewport Fixed
- **Before:** Composer was placed at the bottom of the document flow, requiring users to scroll through the entire conversation to type a message.
- **Correction:** The composer is now permanently fixed to the bottom of the viewport:
  - Mobile (`< md`): `bottom-16` to sit immediately above the mobile navigation bar (`h-16`).
  - Desktop (`md:`): `bottom-0 md:left-64` to seamlessly integrate alongside the 64-column fixed sidebar.
  - Layering: `z-35 pointer-events-none` on outer container with `pointer-events-auto` on the inner card (`max-w-3xl mx-auto`), allowing clicks to pass through background gradient while keeping the composer interactive.
  - Scroll Clearance: Added `pb-36 sm:pb-44` padding to discussion and debate feeds so the final message in any conversation scrolls completely above the composer with generous breathing room.

### 3.2. Composer — Minimal Idle State vs. Smooth Expansion on Focus
- **Idle State:** When unfocused and empty (`!isExpanded && content.length === 0`), the composer renders as a sleek, single-line input pill:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ Write a message...                                        → │
  └─────────────────────────────────────────────────────────────┘
  ```
  Zero mode pills, zero checkboxes, and zero character counters are shown when idle.
- **Focused State:** Clicking or tapping anywhere on the idle bar gently expands it, revealing:
  - Exactly three modes: `[ Message ]` (default), `[ Claim ]`, and `[ Question ]`.
  - `[ Contribute anonymously ]` toggle and collapse `X` icon.
  - If `Claim` is selected: claim type pills (`opinion`, `fact`, `prediction`, `proposal`, `observation`).
  - Auto-focused compact textarea (`rows={2}`, resize disabled, `Ctrl+Enter` shortcut).
  - Primary submit button (`Post Message` / `Post Claim` / `Post Question` / `Post Reply`).
- **Draft Preservation:** Drafted text persists intact when switching between `Message` → `Claim` → `Question` → `Message`.

### 3.3. Conversational Bubble Geometry & Speaker Alignment
- **Before:** All messages stretched across the entire room container (100% width) inside identical grey cards with avatars on the left, resembling database records or table rows.
- **Correction:**
  - **Other participants (LEFT aligned):**
    - Outer flex container: `items-start` (`mr-auto`).
    - Author metadata: Avatar + username + timestamp left-aligned.
    - Bubble: `rounded-2xl rounded-tl-xs bg-card/65 border border-border/60 text-foreground/90 px-4 py-2.5 shadow-xs max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words`.
    - Short messages stay visually short (`w-fit`).
  - **Logged-in user (RIGHT aligned):**
    - Outer flex container: `items-end` (`ml-auto`).
    - Author metadata: `You` (`font-semibold text-primary`) + timestamp right-aligned.
    - Bubble: `rounded-2xl rounded-tr-xs bg-primary/10 border border-primary/25 text-foreground px-4 py-2.5 shadow-xs max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words`.
  - **Replies & Threading:**
    - Connected via clean threadlines (`border-l-2 border-border/40 pl-3 sm:pl-4 mt-2`), maintaining conversational context without deep, cascading table indentation.

### 3.4. Claim Highlighting Inside Conversation
- Claims remain embedded chronologically in the conversation flow with speaker alignment and conversational width (`max-w-[95%] sm:max-w-[85%] md:max-w-[78%]`).
- The **whole claim bubble** receives elevated styling (`rounded-2xl border border-primary/35 bg-card/90 ring-1 ring-primary/10`).
- Examination affordances (`+ Evidence`, `+ Argument`, `Inquiry`) are kept compact and subordinate to the claim assertion.

### 3.5. Question Presentation Inside Conversation
- Questions are formatted as conversational bubbles with speaker alignment preserved.
- The entire bubble is subtly highlighted with amber styling (`border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit`).
- Displays a prominent `? QUESTION` badge, full linkification, and Reply/React affordances.
- Confirmed: No claim conversion buttons (`Make this a Claim`, `Request as Claim`) appear on Questions.

### 3.6. Stance Terminology & Epistemic Active Colors
- **Terminology:** Changed user-facing stance label from `Challenge` to `Not Agree`. Summary now displays `{agreeCount} Support · {disagreeCount} Not Agree · {totalVotes} votes`.
- **Active Interaction Colors:**
  - `Support` active: **Blue** (`bg-blue-500/15 border-blue-500/40 text-blue-500 font-semibold`).
  - `Not Agree` active: **Amber/Orange** (`bg-amber-500/15 border-amber-500/40 text-amber-500 font-semibold`).
  - Inactive controls: neutral muted (`border-border/40 hover:bg-muted/50 text-muted-foreground`).
  - **Epistemic Safety:** Green and Red are strictly avoided to prevent implying "true/false" or "winner/loser" correctness.

---

## 4. Verification Results

### 4.1. Automated Builds & Static Analysis
- `npx tsc --noEmit`: Exited 0 (zero TypeScript errors).
- `npm run lint`: Exited 0 (zero ESLint errors).
- `npm run build`: Exited 0 (all 21 static and dynamic pages generated cleanly).

### 4.2. Playwright Verification Results
Test script: `scripts/phase7d-ux-correction-qa.mjs` executed against running production server on port 3000:

```json
{
  "fixedComposerVisibleAtTop": true,
  "fixedComposerVisibleAtMiddle": true,
  "fixedComposerVisibleAtBottom": true,
  "composerIdleMinimal": true,
  "composerExpandsOnFocus": true,
  "draftPreservedAcrossModes": true,
  "messagesLeftRightAligned": true,
  "messagesNotFullWidth": true,
  "claimWholeBubbleHighlighted": true,
  "claimNotAgreeTerminology": true,
  "claimActiveColorsBlueAmber": true,
  "questionHighlightedAndConversational": true,
  "questionNoClaimAffordances": true,
  "mobileNavDoesNotObscureComposer": true,
  "zeroHorizontalOverflow": true
}
```
- **Console Errors:** Zero runtime application errors.
- **Network Errors:** Zero 5xx responses.

### 4.3. Viewport Verification

| Viewport | Device Class | Horizontal Overflow | Composer Position | Alignment Check | Result |
|---|---|---|---|---|---|
| **1440 × 900** | Desktop | 0px | Fixed bottom (`bottom-0 md:left-64`) | Left (other) / Right (author) | PASS |
| **834 × 1194** | Tablet | 0px | Fixed bottom (`bottom-0 md:left-64`) | Left (other) / Right (author) | PASS |
| **390 × 844** | Mobile (iPhone 14) | 0px | Fixed bottom (`bottom-16`), above nav | Left (other) / Right (author) | PASS |
| **375 × 667** | Mobile (iPhone SE) | 0px | Fixed bottom (`bottom-16`), above nav | Left (other) / Right (author) | PASS |

---

## 5. Visual QA Findings

Visual inspection of screenshots stored in the artifact directory confirmed:
1. **`conversation_desktop_1440_feed.png`:** The feed looks like real people talking. The other participant's claims and comments sit comfortably on the left with avatar and threadline; the author's question bubble sits on the right in amber. No messages stretch to 100% room width. The thin idle composer sits anchored at the bottom.
2. **`discussion_desktop_1440_focused.png`:** The expanded composer is compact, clear, and modern. Mode buttons (`Message`, `Claim`, `Question`) and anonymous toggle are intuitive.
3. **`conversation_mobile_375_feed_idle.png`:** At 375px, the idle composer sits directly above the mobile navigation bar with zero overlap, zero truncation, and zero horizontal scrolling.
4. **`conversation_mobile_375_feed_focused.png`:** The focused composer expands seamlessly on mobile, keeping all controls within touch-friendly reach above the bottom navigation.
5. **`debate_desktop_1440_feed.png`:** In debates, contributions render as conversational bubbles with side indicators and claim examination actions.

---

## 6. Known Limitations & Next Steps
- This phase deliberately addresses the conversational interaction layer only.
- In accordance with instructions:
  - Phase E (Lens synchronization / advanced exploration) was NOT started.
  - Sound/motion systems, full deletion flows, and founding member badges remain future work.
