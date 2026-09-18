# Discora — Phase 7D / Phase D: Final Conversation Polish & Chat UX Correction Report

## Executive Summary

Phase D implementation was functionally complete, but visual and interaction inspection showed that rooms still felt partially dashboard-like rather than conversational. This final polish pass aligns the interaction layer with Discora's core product principle:

> **"Familiar at the interaction layer, different at the understanding layer."**

The Conversation now feels natural, human, and responsive (drawing interaction patterns from WhatsApp, Telegram, Instagram, and iMessage), while preserving Discora's epistemic integrity, structured claim exploration, and multi-lens architecture.

---

## 1. Key Architectural & UX Corrections

### A. Top Room Header & Lens Navigation
- **Problem Solved:** The six room lenses (`Conversation`, `Claims`, `Evidence`, `Sources`, `Questions`, `State of Understanding`) previously rendered as a permanent, bulky, sticky `<nav>` bar at the top of every room, dominating vertical screen space like a dashboard.
- **New Architecture:**
  - **Dominant Room Header:** Entering a room presents the Room/Topic Title as the primary visual identity along with the room type badge (`[DISCUSSION]` or `[DEBATE]`).
  - **Desktop Subtle Reveal:** On desktop, hovering or focusing the header smoothly reveals the six lenses without consuming permanent vertical space.
  - **Mobile Tap Reveal:** On mobile, a compact, accessible `Lenses ▾` pill allows toggling the six lenses on demand without pushing the conversation off-screen.
  - **Preserved Lenses:** All six lenses remain fully functional and navigable. In specialized lens views (e.g., `/claims`, `/evidence`), the lens switcher remains accessible for cross-lens navigation.
  - **Debate Rooms:** `DebateSectionNav` updated to follow the exact same subtle reveal pattern, keeping the motion and conversation dominant upon entering.

### B. Message Geometry & Speaker Alignment
- **Directional Alignment:**
  - Messages from other participants align to the **LEFT**.
  - Messages from the authenticated user align to the **RIGHT**.
- **Bubble Widths:**
  - Conversational dynamic widths: short messages remain short (`w-fit`), long messages cap at a comfortable reading width (`max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`).
  - Completely prevents full-width database record appearance.

### C. Current-User vs. Other-User Styling
- **Other Participants:** Neutral dark/gray bubble (`rounded-tl-xs bg-card/75 border border-border/60 text-foreground/90`).
- **Current User:** Subtle blue-tinted accent bubble (`rounded-tr-xs bg-blue-500/10 border border-blue-500/25 text-foreground`).
- **Zero Gamification:** Distinctions are purely conversational identity. No green/red truth semantics or "winning" indicators.

### D. Message Actions
- **Actions Provided:** `Reply`, `React` (with quick reaction popover), `Request as Claim` / `Make this a Claim`, `More` (`···` for Edit/Report).
- **Desktop:** The action row is quiet and positioned directly beneath the message bubble, revealing smoothly on hover/focus (`opacity-100 md:opacity-0 md:group-hover/comment:opacity-100 focus-within:opacity-100 transition-opacity`).
- **Mobile / Touch:** Action buttons remain permanently accessible through touch (`opacity-100`).

### E. Claim Card Redesign (De-Chunking)
- **Eliminated Bulk:** Removed heavy card borders, thick separators, and oversized headers.
- **Whole-Bubble Highlight:** The entire Claim bubble has a subtle blue accent border and elevation ring (`border-blue-500/35 ring-1 ring-blue-500/15`), communicating structured claim status across the entire bubble, not just in the badge.
- **Conversational Width & Alignment:** Respects speaker alignment (`rounded-tr-xs` for current user, `rounded-tl-xs` for other users; `w-fit max-w-[88%] sm:max-w-[78%] md:max-w-[72%]`).
- **Examination Actions:** Contextual actions (`+ Evidence`, `+ Argument`, `Inquiry`) reveal on desktop hover/focus, and remain compact on mobile.
- **Support / Not Agree Subordination:**
  - Stance tally is quiet and descriptive (`0 Support · 2 Not Agree · 2 votes`).
  - Support/Not Agree vote controls reveal on hover on desktop, accessible via touch on mobile.
  - **Active Colors:** `Support` active = subtle blue (`text-blue-400 bg-blue-500/15 border-blue-500/40`), `Not Agree` active = subtle amber (`text-amber-400 bg-amber-500/15 border-amber-500/40`).
  - **Zero Green / Red:** Strictly avoids true/false moralistic implications.

### F. Question Bubble
- **Highlighted Chat Bubble:** Whole-bubble amber highlight with ring (`border-amber-500/35 bg-amber-500/8 ring-1 ring-amber-500/15`).
- **Conversational Constraints:** Dynamic width (`w-fit`), respects speaker alignment, includes `Reply` and `React`, excludes Claim actions.
- **Epistemic Separation:** Room-level open questions remain strictly distinct from claim-scoped structured inquiries.

### G. Lightweight Realtime Typing Indicator
- **Architecture:**
  - Implemented `useTypingIndicator` hook using Supabase Realtime channel broadcast on `room-typing:${roomId}` and fallback `BroadcastChannel`.
  - Purely ephemeral client UI state: 0 database table writes, 0 reputation impact, 0 State of Understanding effect.
  - Throttled typing broadcast on keystrokes (`sendTyping()`).
  - Auto-prunes typers after 3 seconds of inactivity.
- **Visual Presentation (`TypingIndicator`):**
  - Displays participant avatar and username: `○ qatest012 ● ● ●` or `○ qatest012, techno_trix ● ● ●`.
  - Three subtle animated bouncing dots matching modern chat apps (WhatsApp / Telegram / iMessage).
  - Sits naturally in the layout directly above the fixed composer.

### H. Fixed Viewport Composer
- **Minimal Idle State:** Ultra-thin bar (`[ Message icon | Write a message... | Send button ]`).
- **Gently Expanded State:** Reveals `Message`, `Claim`, `Question` modes and `Anonymous` toggle upon click or focus.
- **Viewport-Fixed:** Glued to the viewport bottom across all scroll depths (top, middle, bottom), with appropriate bottom spacing (`pb-36 sm:pb-44`) ensuring conversation content is never obscured.
- **Safe-Area Insets:** Accounts for mobile bottom navigation on viewports `<768px`.

---

## 2. Files Changed

| File | Changes Made |
|---|---|
| `src/features/rooms/components/room-section-shell.tsx` | Redesigned header with dominant title/type badge, replaced permanent 6-lens sticky bar with subtle hover/focus reveal on desktop and accessible `Lenses ▾` tap toggle on mobile. |
| `src/features/debates/components/debate-section-nav.tsx` | Updated debate lens navigation with subtle reveal trigger in conversation view, desktop hover/focus reveal, and mobile tap toggle. |
| `src/features/discussions/components/claim-in-conversation.tsx` | De-chunked claim card into a refined, conversational chat bubble with whole-bubble highlight, hover-revealed examination actions, and subordinate Support/Not Agree controls with blue/amber interaction colors. |
| `src/features/discussions/components/comment-item.tsx` | Added left/right speaker alignment, blue-tinted current user bubble, de-chunked author prop on claims, whole-bubble question highlight, and desktop hover action reveal. |
| `src/features/discussions/components/discussion-contributions-section.tsx` | Replaced heavy section divider header with a quiet, subtle contribution count, maintaining conversation-first visual dominance. |
| `src/features/debates/components/debate-room.tsx` | Quieted debate conversation count header, ensuring room identity and motion are primary. |
| `src/features/rooms/hooks/use-typing-indicator.ts` | **[NEW]** Ephemeral typing presence hook via Supabase Realtime broadcast and BroadcastChannel with automatic 3s inactivity timeout. |
| `src/features/rooms/components/typing-indicator.tsx` | **[NEW]** Chat-like typing indicator component with avatars, participant names, and 3 subtle animated bouncing dots. |
| `src/features/rooms/components/unified-composer.tsx` | Integrated `useCurrentProfile`, `useTypingIndicator`, keystroke typing triggers, and rendered `TypingIndicator` just above the composer box. |
| `scripts/phase7d-final-polish-qa.mjs` | **[NEW]** Comprehensive automated Playwright test covering all 22 polish checkpoints across 4 viewports. |

---

## 3. Intentionally Deferred Issues (Sidebar Scope Boundary)

As mandated by Phase D scope rules, no broad sidebar redesign was undertaken during this pass. The following known sidebar issues remain documented for the dedicated sidebar sprint:
1. **Settings Navigation Position:** Currently located in the default sidebar flow rather than fixed persistent utility location.
2. **Search Collapsible Behavior:** Needs smooth expanding/collapsing integration.
3. **Room-Local Navigation Refinements:** Dedicated styling and expand/collapse transitions for room-local section links.

---

## 4. Verification & Validation Results

### A. TypeScript Type Check
```bash
npx tsc --noEmit
# Result: Exit code 0 (0 errors)
```

### B. ESLint
```bash
npm run lint
# Result: Exit code 0 (0 errors)
```

### C. Production Build
```bash
npm run build
# Result: Exit code 0 (Compiled successfully, all 21 pages and dynamic routes generated)
```

### D. Playwright Automated Test Results (`phase7d-final-polish-qa.mjs`)
- **Tested Viewports:**
  - Desktop: 1440x900
  - Tablet: 834x1194
  - Large Mobile: 390x844
  - Small Mobile: 375x667
- **Both Room Types Tested:**
  - Discussion: `/discussions/should-ai-generated-content-be-clearly-labeled-online`
  - Debate: `/debates/ai-vs-human`

```json
{
  "headerDominantTitle": true,
  "lensesHiddenInitiallyInConv": true,
  "lensesRevealOnHoverOrToggle": true,
  "messagesLeftRightAligned": true,
  "currentUserBlueTint": true,
  "otherUserNeutralDark": true,
  "actionsHoverDesktopTouchMobile": true,
  "claimCardCompactAndHighlighted": true,
  "claimActionsHoverDesktop": true,
  "claimNotAgreeTerminology": true,
  "claimActiveColorsBlueAmber": true,
  "questionHighlightedConversational": true,
  "questionNoClaimAffordances": true,
  "typingIndicatorSingleUser": true,
  "typingIndicatorMultiUser": true,
  "typingIndicatorAutoDisappears": true,
  "fixedComposerVisibleAtAllScrolls": true,
  "composerIdleMinimal": true,
  "composerExpandsOnFocus": true,
  "draftPreservedAcrossModes": true,
  "mobileNavDoesNotObscureComposer": true,
  "zeroHorizontalOverflow": true
}
```
- **Network Errors:** 0 5xx errors.
- **Horizontal Overflow:** 0px across all 4 viewports.

---

## 5. Visual Inspection of Captured Screenshots

Fresh screenshots captured in artifact directory and visually inspected:

1. **`final_desktop_1440_conv_idle.png`**
   - Dominant title: *"Should AI-generated content be clearly labeled online?"* with `[DISCUSSION]` badge.
   - Six permanent lens tabs are cleanly collapsed behind the subtle `Lenses ⌃` trigger.
   - Claims appear as compact, elevated conversation bubbles (`testingtesting` with subtle `0 Support · 2 Not Agree · 2 votes`).
   - Fixed composer sits quietly at the viewport bottom.

2. **`final_desktop_1440_typing.png`**
   - Active typing indicator pill (`○ qatest012 ● ● ●`) appears directly above the expanded composer (`Message | Claim | Question`).
   - Clean, lightweight, and modern.

3. **`final_mobile_375_conv_idle.png`**
   - Header is legible and dominant on 375px width.
   - `Lenses ⌃` provides quick access to lenses without consuming permanent vertical space.
   - Composer bar sits cleanly above the bottom navigation bar with zero overlap or horizontal overflow.

4. **`final_mobile_375_typing.png`**
   - Typing pill appears above the composer on mobile within the 375px viewport bounds.

5. **`final_debate_desktop_1440_idle.png`**
   - Debate motion header (*"ai vs human"*) is dominant.
   - Proposition and Opposition cards sit neatly above the conversation.
   - Debate lenses collapsed under `Debate Lenses ⌵`.
   - Fixed composer ready for contributions.

---

## 6. Conclusion & Sign-Off

The Conversation UX now fulfills the core vision:
- It looks and feels like real people talking.
- It is free of dashboard clutter, oversized cards, and database-like record styling.
- Discora's structured understanding layer (Claims, Evidence, Inquiries, Stances) remains effortlessly accessible when intentionally invoked.

**Phase D is fully complete and verified. Work on Phase E has NOT been started.**
