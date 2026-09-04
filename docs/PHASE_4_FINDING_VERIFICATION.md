# Discora — Phase 4 Finding Verification & Ground-Truth Audit

> **Status:** AUDIT ONLY — NO CODE CHANGES  
> **Date:** September 4, 2026  
> **Target:** Verification of Phase 4 Behavioral Validation Findings against current codebase & live browser runtime.  
> **Principle:** Verify all claims against live code and browser behavior before accepting redesign proposals. Never regress signed-off architecture.

---

## 1. Executive Verdict

A forensic code audit and live browser verification were conducted against the active Discora codebase and browser runtime (desktop 1440px and mobile 375px).

### Key Takeaways:
1. **P1-1 (Contribution Pre-Taxonomy Selection Barrier) is REJECTED / NOT VALID (STALE FINDING).**  
   The active codebase and runtime strictly uphold the signed-off Phase 2 **write-first** paradigm. At `/discussions/[slug]/contributions` and within the continuous room scroll, authenticated users are presented immediately with an unconstrained, freeform `<textarea placeholder="Share your structured insights or analysis...">` and a direct `"Submit Post"` CTA. No taxonomy picker (`Claim`, `Evidence`, `Question`) is presented before writing. Claim extraction only exists as an optional post-contribution enhancement via `ExtractClaimModal`.
2. **P1-2 ("Structured Inquiry" Terminology Confusion) is REJECTED / NOT VALID (STALE FINDING).**  
   The ominous phrase `"Raise Structured Inquiry"` does **not** exist anywhere on discussion claim cards. The discussion claim card CTA is concisely labeled `"Inquiry"` (or `"Inquiry (N)"`), is hidden from unauthenticated guests entirely (`{user && <InquiryButton />}`), and opens a modal titled `"Ask a Question"` with intuitive type choices (`Clarification`, `Evidence Request`, `Assumption Check`) and clear microcopy.
3. **P1-3 (Discussion Navigation Tab Overload) is PARTIALLY VALID (DESIGN POLISH / CATEGORY B & C).**  
   Having 5 simultaneous room navigation items (`Overview`, `Claims`, `Evidence`, `Discussion Questions`, `Contributions`) creates visual crowding and horizontal scroll on small mobile viewports (375px). However, this is not an architectural failure; it is a progressive disclosure and label density issue.
4. **The Evidence Bank AHA Moment is RE-CONFIRMED.**  
   The three-way epistemic filtering (`Supports`, `Contradicts`, `Context`) with citation linking directly to target claims remains the strongest, clearest differentiator from traditional threaded forums.
5. **The Narrative Synthesis Gap is CONFIRMED.**  
   While Discora clearly maps inputs (*Questions → Claims → Evidence*), it does not yet present a prominent synthesis view (e.g. state of consensus, resolved vs. unresolved questions) on the main room view.
6. **The Guest Return-Loop Finding is NOT ACTIONABLE YET.**  
   All 5 registered epistemic signals are fully functional. Because guest users have no authenticated state, session persistence, or voting rights, guest notifications cannot be built without violating anti-tracking and anti-gamification principles.

---

## 2. P1-1 Verification: Write-First Contribution Flow

### Forensic Code Inspection
* **Files Inspected:**
  * `src/features/discussions/components/discussion-contributions-section.tsx` (Lines 131–157)
  * `src/features/discussions/components/discussion-room.tsx` (Lines 504–570)
  * `src/features/debates/components/debate-room.tsx` (Lines 380–435)
  * `src/features/discussions/components/extract-claim-modal.tsx` (Lines 1–260)

### Code Reality:
In both `discussion-contributions-section.tsx` and `discussion-room.tsx`:
```tsx
{user ? (
  <form onSubmit={submit} className="space-y-3 border-t border-border pt-5">
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      rows={4}
      maxLength={2000}
      placeholder="Share your structured insights or analysis..."
      className="w-full rounded-xl border border-input bg-background/50 p-3 text-sm outline-none ..."
    />
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
      <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
      Contribute anonymously
    </label>
    <button disabled={post.isPending || !content.trim()} ...>
      Post contribution
    </button>
  </form>
) : (
  <div className="border-t border-border pt-5">
    <GuestContributionPrompt roomType="discussion" />
  </div>
)}
```

### Live Browser Test:
1. **Can a guest/new user begin writing before selecting Claim/Evidence/Question?**  
   Guests see the `GuestContributionPrompt`: *"Want to contribute to this discussion? Sign in to share your perspective, help answer questions, or contribute evidence."* Authenticated users immediately see a blank textarea.
2. **Is taxonomy selection required before typing?**  
   **No.** There is zero taxonomy selection UI prior to typing.
3. **What happens after clicking the contribution CTA?**  
   The message is committed directly to the database via `post.mutateAsync(...)`.
4. **What modal/drawer/form appears?**  
   No modal appears during writing. Post-contribution, an inline contextual banner appears:  
   *"Your contribution is now part of the discussion. Next step (optional): If your post introduces a distinct factual assertion or argument, you can click 'Extract Claim' below your comment to elevate it into the room's Claims registry."*
5. **Is there a textarea visible immediately?**  
   Yes, immediately visible for authenticated users; guests see the login prompt with `Create Account` and `Sign In` buttons preserving context.
6. **Is Claim/Evidence/Question selection shown before or after typing?**  
   Neither. `Claim`, `Evidence`, and `Question` are not selectable buttons on the contribution form. Only if a user chooses to click the optional `"Extract Claim"` button on an already posted message does `ExtractClaimModal` appear.
7. **Does the current UI match the Phase 2 write-first design?**  
   **Yes, 100%.**
8. **Was the audit possibly performed against stale browser state/build output?**  
   Yes. The Phase 4 auditor conceptually conflated the room's navigation tabs (`Claims`, `Evidence`, `Questions`, `Contributions`) with a pre-writing modal selector.
9. **Is there any alternate contribution entry point that still uses the old taxonomy-first flow?**  
   No. All contribution surfaces in discussions and debates use write-first textareas.
10. **Does mobile behave differently from desktop?**  
    No. On mobile (375px and 390px), the textarea renders cleanly with responsive width and full input access.

**Verdict: NOT VALID / STALE FINDING.**

---

## 3. P1-2 Verification: "Structured Inquiry" Terminology

### Forensic Code Inspection
* **Files Inspected:**
  * `src/features/discussions/components/claim-list.tsx` (Lines 55–58, 605–611, 656–663)
  * `src/features/debates/components/inquiry-button.tsx` (Lines 1–21)
  * `src/features/debates/components/inquiry-create-dialog.tsx` (Lines 16–20, 61–67, 91–101)
  * `src/features/debates/components/debate-inquiries-tab.tsx` (Lines 83–91, 175–180)

### Code & UI Reality:
1. **Does "Raise Structured Inquiry" appear on claim cards?**  
   **No.** In `claim-list.tsx`:
   ```tsx
   {user && (
     <InquiryButton
       count={inquiryCounts?.[claim.id] ?? 0}
       onClick={() => setInquiryDialogClaimId(claim.id)}
     />
   )}
   ```
   In `inquiry-button.tsx`, the button text is strictly:
   ```tsx
   <span>Inquiry{count > 0 ? ` (${count})` : ""}</span>
   ```
2. **Is the CTA visible to guests?**  
   **No.** The button is conditionally rendered with `{user && ...}`. Guests do not see any inquiry button on discussion claim cards.
3. **What is shown when clicked?**  
   `InquiryCreateDialog` opens with header:
   ```tsx
   <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
     Ask a Question
   </h3>
   ```
   With descriptive type options:
   * **Clarification:** *"What do you mean by this?"*
   * **Evidence Request:** *"Can you provide a source?"*
   * **Assumption Check:** *"Is this assumption valid?"*
   And placeholder:
   ```tsx
   placeholder="What would you like to know about this claim?"
   ```
4. **Where does "Structured Inquiry" actually appear?**  
   * Only in `debate-inquiries-tab.tsx` as a section title (`Ask a Structured Inquiry`) and in `RoomSectionShell` as the tab label for debates (`Structured Inquiries` vs `Discussion Questions`).
5. **Is the wording likely to cause confusion?**  
   On claim cards, the label is simply `"Inquiry"`, and the modal header is `"Ask a Question"`. The Phase 4 claim that users face a scary `"Raise Structured Inquiry"` ticket button on discussion claims is factually incorrect.

**Verdict: NOT VALID / STALE FINDING.**

---

## 4. P1-3 Verification: Discussion Navigation Tab Overload

### Forensic Code Inspection
* **Files Inspected:**
  * `src/features/rooms/components/room-section-shell.tsx` (Lines 77–84, 96–105)
  * `src/features/discussions/components/section-nav.tsx` (Lines 26–34)

### UI Reality:
* **Discussion Section Tabs in `RoomSectionShell`:**
  1. `Overview` (`/discussions/[slug]`)
  2. `Claims` (`/discussions/[slug]/claims`)
  3. `Evidence` (`/discussions/[slug]/evidence`)
  4. `Discussion Questions` (`/discussions/[slug]/questions`)
  5. `Contributions` (`/discussions/[slug]/contributions`)
* **Overview Scroll-Spy Tabs in `SectionNav`:**
  1. `Questions`
  2. `Claims`
  3. `Evidence Bank`
  4. `Contributions`
* **Explanatory Text & Guidance:**
  * The guest orientation banner (`RoomOrientationNote`) explicitly defines the reading sequence:
    * *"1. Read the premise above → 2. Explore questions → 3. Examine claims & evidence → 4. Contribute if you have something useful to add."*
* **Mobile Viewport (375px):**
  * The 5 tabs overflow horizontally, requiring swipe/scroll.
  * Having both `Discussion Questions` and `Contributions` can cause mild ambiguity for novices who don't yet understand that "Discussion Questions" are room-framing inquiries whereas "Contributions" is the threaded forum.
* **Diagnosis:**
  * Is it (A) Too many concepts, (B) Poor labeling, (C) Missing progressive disclosure, (D) Normal learning curve, or (E) Actual navigation failure?
  * **Answer:** **B & C (Poor Labeling / Minor Progressive Disclosure gap on mobile).** It is not a failure of architecture. The tabs function correctly and correspond to genuine data entities. Clarifying labels (e.g. `Framing Questions`, `Claims`, `Evidence Bank`, `Discussion`) solves any minor hesitation without structural change.

**Verdict: PARTIALLY VALID (Polish / Mobile Density).**

---

## 5. AHA Moment Verification: Evidence Bank

### Forensic Code & Runtime Inspection
* **Route:** `/discussions/[slug]/evidence`
* **Filters Tested:**
  * `All (4)`
  * `Supports (2)`
  * `Contradicts (1)`
  * `Context (1)`
* **Card Details:**
  * Each card clearly surfaces:
    * Stance badge (`[Supports]`, `[Contradicts]`, `[Context]`) with distinct colors (emerald, rose, slate).
    * Linked target claim (`Claim: "..."`).
    * Source title, URL, domain badge, and timestamp.
* **Findings:**  
  The Evidence Bank is indeed the most intellectually compelling moment in the user journey. It immediately differentiates Discora from Reddit or Twitter because disagreements are organized by citation and direction rather than rhetorical volume.

**Verdict: RE-CONFIRMED.**

---

## 6. Narrative Gap Verification: What Does a Successful Outcome Look Like?

### Forensic Code Inspection
* **Components Inspected:**
  * `src/features/discussions/components/opening-premise.tsx`
  * `src/features/discussions/components/discussion-summary.tsx`
  * `src/features/discussions/components/discussion-health.tsx`
  * `src/features/discussions/components/map-tab.tsx`
* **Findings:**
  * `DiscussionSummary` computes consensus, contested claims, and top-supported claims, but it is currently buried in `map-tab.tsx` which is not surfaced in the primary room navigation.
  * The room header displays the question, premise, and claim counts, but does not present a consolidated "State of Understanding" or "Consensus & Unresolved Issues" summary card on the Overview tab.
  * Novices understand how to browse claims and evidence, but have to manually tally what is resolved versus unresolved.

**Verdict: CONFIRMED.** (Surfacing a concise consensus summary from existing components would close this narrative gap).

---

## 7. Return-Loop Verification

### Forensic Code Inspection
* **Component:** `src/features/homepage/components/logged-in-homepage.tsx`
* **Active Verified Signals:**
  1. `useInquiriesOnMyClaims`: Surfaces when someone challenges the user's claim. (Phase 3C-B.1)
  2. `useNewEvidenceOnVotedClaims`: Surfaces when new evidence is attached to a claim the user voted on. (Phase 3C-B.2)
  3. `useMyInquiryResponses`: Surfaces answers to the user's inquiries.
  4. `useMyOpenInquiries`: Shows ongoing open inquiries.
  5. `useMyUnderstandingEvolved`: Shows shifts in claim consensus over time.
* **Guest Return-Loop Reality:**
  * Guests have no identity, no session persistence, and cannot vote or inquire.
  * Creating a guest return loop would require cookies/local storage tracking, synthetic IDs, or email capture, which contradicts the core privacy, neutrality, and non-gamification rules.

**Verdict: CONFIRMED FOR REGISTERED USERS; NOT ACTIONABLE YET FOR GUESTS.**

---

## 8. Detailed Finding Verification Matrix

| Finding | Phase 4 Claim | Current Reality | Verdict | Evidence | Action |
|---|---|---|---|---|---|
| **P1-1: Contribution Pre-Taxonomy Selection** | User must choose Claim/Evidence/Question before typing; blank-page paralysis. | Freeform `<textarea>` is immediately visible. No taxonomy picker exists before typing. Claims are extracted post-post. | **REJECTED / NOT VALID (STALE)** | `discussion-contributions-section.tsx:133-140`, `discussion-room.tsx:516-523` | **No action.** Protect Phase 2 write-first implementation. |
| **P1-2: "Structured Inquiry" Terminology** | "Raise Structured Inquiry" button intimidates users like an administrative complaint. | Button is simply `"Inquiry"`. Hidden from guests entirely. Dialog is titled `"Ask a Question"`. | **REJECTED / NOT VALID (STALE)** | `claim-list.tsx:606`, `inquiry-button.tsx:17`, `inquiry-create-dialog.tsx:62` | **No action.** Jargon does not exist on claim cards. |
| **P1-3: Discussion Navigation Tab Overload** | 4–5 simultaneous tabs create cognitive overload and navigation paralysis. | 5 tabs (`Overview`, `Claims`, `Evidence`, `Discussion Questions`, `Contributions`). Functions well on desktop; horizontal overflow on 375px mobile. | **PARTIALLY VALID** | `room-section-shell.tsx:78-83`, Browser 375px test | **Design Polish:** Optimize mobile sub-nav bar density; clarify `Discussion Questions` vs `Contributions` labels. |
| **AHA Moment: Evidence Bank** | Directional evidence (`Supports`, `Contradicts`, `Context`) is the core differentiator. | Fully implemented with filter pills, stance badges, and direct links to target claims. | **CONFIRMED** | `room-evidence-section.tsx:47-88`, `room-evidence-tab.tsx:69-75` | **Preserve.** Highlight this feature during guest onboarding. |
| **Narrative Gap: Outcome Visibility** | Users understand Discora is serious, but cannot see what a completed outcome looks like. | Rooms display claims and votes, but lack a prominent "State of Understanding / Unresolved" summary on the overview. | **CONFIRMED** | `discussion-summary.tsx` exists but is isolated in unlinked `map-tab.tsx`. | **Design Work:** Surface existing `DiscussionSummary` insights onto the Overview tab. |
| **Return Loop: Guest Retention** | Guests have no reason to return when inquiries or evidence evolve. | Registered signals are complete (Phase 3C-B.1 & 3C-B.2). Guests have no accounts or votes. | **NOT ACTIONABLE YET** | `logged-in-homepage.tsx:21-32` | **No action.** Do not add tracking, synthetic cookies, or spam mechanics for guests. |

---

## 9. Summary of Confirmed vs. Rejected Findings

### Rejected / Stale Findings (No Action Allowed):
* **P1-1 (Contribution Pre-Taxonomy Selection):** REJECTED. The system is already strictly write-first.
* **P1-2 ("Raise Structured Inquiry" Claim Card Jargon):** REJECTED. The claim card button is `"Inquiry"`, dialog is `"Ask a Question"`, and guests cannot see it.
* **Guest Return-Loop Notifications:** REJECTED / NOT ACTIONABLE. Tracking guests violates product neutrality and privacy rules.

### Confirmed Findings Requiring Focused Design/Polish:
1. **P1-3 Room Sub-Nav Mobile Labeling & Density (P2 Polish):**
   * Enhance mobile 375px horizontal tab display.
   * Clarify tab wording so `Discussion Questions` (room-framing) is distinct from `Contributions` (conversation).
2. **Narrative Outcome / State of Understanding (P2 Enhancement):**
   * Integrate the existing `DiscussionSummary` metrics (e.g. Most Supported Claims, Contested Claims, Open Questions) onto the `Overview` page so users can immediately see what the discussion has established.

---

## 10. Recommended Implementation Priority

1. **Priority 1 (Safe UI Polish):**  
   Refine `RoomSectionShell` navigation tab labels on mobile (e.g. `Framing Questions` instead of `Discussion Questions`) to prevent confusion with threaded contributions.
2. **Priority 2 (Epistemic Outcome Clarity):**  
   Expose the existing `DiscussionSummary` component on the Discussion Overview tab as an optional "Discussion Summary & Consensus" section.
3. **DO NOT MODIFY:**  
   * The contribution flow (must remain write-first as implemented).
   * The claim extraction architecture.
   * The inquiry data model and dialogs.
   * The Evidence Bank filtering.
