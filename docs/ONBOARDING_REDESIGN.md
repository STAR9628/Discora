# Discora Phase 5C — Innovative Interactive Onboarding Redesign

## 1. Product Philosophy & North Star

Discora is dedicated to **understanding over engagement, evidence over popularity, clarity over activity, and questions before conclusions**.

The onboarding experience exists to dismantle standard social-media habits (such as arguing to win, chasing likes, or defending entrenched positions) and replace them with Discora's epistemic discipline:
- Reasoning is structured, not conversational clutter.
- Evidence can **strengthen, weaken, or complicate support for a claim** — it does not establish absolute "truth".
- State of Understanding reflects current evidentiary alignment: *Supported by current evidence*, *Mixed / Contested*, or *Unresolved*.
- Changing one's mind based on evidence is a cognitive triumph, not a defeat.

---

## 2. Core Architecture: The Epistemic Pipeline

The redesign teaches Discora through a 5-step epistemic sequence:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────────────┐
│  QUESTION    │ ──> │    CLAIM     │ ──> │   EVIDENCE   │ ──> │   INQUIRY    │ ──> │ UPDATED UNDERSTANDING │
│  "What are   │     │ "What is the │     │ "What data   │     │ "What needs  │     │ "How support and      │
│  we asking?" │     │  assertion?" │     │  informs it?"│     │  testing?"   │     │  clarity evolve"      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └───────────────────────┘
```

And for debates:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────────────┐
│    MOTION    │ ──> │   POSITION   │ ──> │   ARGUMENT   │ ──> │ SIDE SWITCH  │ ──> │ UPDATED UNDERSTANDING │
│ "The central │     │ "Prop vs Opp │     │ "Backed by   │     │ "Updating on │     │ "Transparent, non-    │
│  thesis"     │     │  stance"     │     │  evidence"   │     │  evidence"   │     │  zero-sum synthesis"  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └───────────────────────┘
```

---

## 3. Experience Architecture & Exposure Hierarchy

To ensure onboarding surfaces do not compete, a clear exposure hierarchy is enforced by a single centralized state model (`useOnboarding`):

```
                     ┌───────────────────────────┐
                     │ Centralized State Model   │
                     └─────────────┬─────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Guest / Visitor  │      │ New Auth User    │      │ In-Room Guides   │
│ Subtle Discovery │      │ Actionable Home  │      │ Contextual Card  │
│ Deck invitation  │      │ Checklist        │      │ (Dismissible)    │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                   │
                                   ▼
                      ┌───────────────────────────┐
                      │ Anytime Access            │
                      │ "How Discora Works" in    │
                      │ Sidebar & Mobile Nav      │
                      └───────────────────────────┘
```

### Layer 1: The Discovery Deck (`DiscoveryDeckModal`)
- An interactive, lightweight modal dialog accessible at any time.
- Features 4 distinct tabs:
  1. **The Epistemic Model**: Visualizes the Question → Claim → Evidence → Inquiry pipeline.
  2. **Try It ("What Moves the Needle?")**: The interactive epistemic sandbox where users test evidence impact.
  3. **Discussions vs. Debates**: Clarifies the distinction between collaborative inquiry and structured deliberation.
  4. **Your Exploration**: Lightweight topic preferences (Science, Tech, Philosophy, Governance) to personalize discovery.
- **Triggers**:
  - Subtle trigger card on `GuestHomepage`.
  - Action item inside `OnboardingChecklistCard` on `LoggedInHomepage`.
  - Always available via "How Discora Works" in the Desktop Sidebar and Mobile Navigation.

### Layer 2: Interactive Teaching Moment ("What Moves the Needle?")
- Located inside the Discovery Deck and embeddable anywhere.
- Clearly labeled banner:
  > **“Interactive example — not live Discora data”**
- Uses explicit epistemic states (never truth meters, popularity scores, voting counts, or winner meters):
  - **Limited Support**
  - **More Supported**
  - **Mixed / Contested**
  - **Unresolved**
- Presents an educational test assertion:
  > **Claim**: *"Grid-scale battery storage can stabilize regional power grids during extended seasonal renewable deficits."*
- **Interaction Flow**:
  1. **Initial State**: No evidence attached. State: *Limited Support / High Uncertainty*.
  2. **Step 1 — Attach Supporting Evidence**: User toggles an empirical dispatch analysis. State transitions to: *More Supported*.
  3. **Step 2 — Attach Counter-Evidence**: User toggles a mineral supply constraint report. State transitions to: *Mixed / Contested*.
  4. **Step 3 — Structured Inquiry**: Demonstrates how evidentiary tension reveals something worth testing and challenging, inviting a claim-targeted Structured Inquiry: *"What alternative battery chemistries avoid critical mineral bottlenecks?"*
- **Epistemic Lesson**: Evidence does not declare a "winner" or manufacture absolute certainty; it clarifies, challenges, and guides further targeted inquiry.

### Layer 3: Contextual In-Room Guides (`RoomGuideCard`)
- Rendered conditionally at the top of Discussion and Debate overview rooms.
- Compact, unobtrusive, dismissible with a single click (stores preference per room type).
- Only shown when genuinely useful, avoiding clutter.

---

## 4. User Journeys

### Journey A: First-Time Guest
1. Lands on `/`.
2. Sees the discreet invitation: *"See how evidence-based discussion works (2 min)"*.
3. If clicked: Opens Discovery Deck directly on the interactive sandbox.
4. If dismissed: Never auto-reopens. Can still be accessed anytime from Sidebar.

### Journey B: Newly Authenticated User
1. Registers and completes profile (`/settings/profile`).
2. Redirected to `/` (`LoggedInHomepage`).
3. If `useOnboardingStatus` reports `isFirstTime === true`:
   - An actionable `OnboardingChecklistCard` appears:
     - 1. Understand the Epistemic Model (opens Discovery Deck)
     - 2. Select topics of interest (Science, Tech, Philosophy, Governance)
     - 3. Explore a featured room
     - 4. Write your first contribution (reminding that write-first drafting is supported)
   - Dismissible with a single click ("Dismiss guide").

---

## 5. Personalization Rules

- **Principle**: "Personalize exploration, not belief."
- We allow users to select:
  - Topic interests (e.g. Technology & AI, Science & Climate, Philosophy & Ethics, Society & Governance).
  - Preferred format (Discussions, Debates, or Both).
- We **NEVER** ask for or infer:
  - Political stances
  - Religious or ideological affiliations
  - Worldview, stance, or personality
- Preferences are stored locally to tailor future exploration without fabricating fake recommendations or fake personalized activity.

---

## 6. Centralized State Model (`useOnboarding`)

Single centralized state schema:
```typescript
interface OnboardingState {
  status: "not_started" | "in_progress" | "completed" | "skipped";
  currentTab: "model" | "sandbox" | "modes" | "interests";
  dismissedGuides: Record<string, boolean>; // e.g. { discussion: true, debate: true }
  selectedTopics: string[];
  preferredFormat: "discussion" | "debate" | "both";
  hasInteractedSandbox: boolean;
  isDeckOpen: boolean;
  lastUpdated: string;
}
```

---

## 7. Responsive & Mobile Design

- **Mobile (375px & 390px)**:
  - Discovery Deck renders as a compact scrollable modal with sticky header/footer navigation (`Skip`, `Next`, `Finish`).
  - Zero horizontal overflow (`scrollWidth <= innerWidth`).
  - Touch targets min 44x44px.
  - Sandbox interactive toggles adapt to vertical stack.
- **Tablet (768px)** & **Desktop (1024px & 1440px)**:
  - Centered dialog with max-width `680px`, clear typography and breathing room.

---

## 8. Accessibility & Motion

- **Focus Management**: Focus trapped inside `DiscoveryDeckModal`, returns to trigger on close.
- **Keyboard Shortcuts**: `Escape` closes the modal; `Tab` cycles focusable elements; arrow keys navigate tabs.
- **Screen Reader Announcements**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`.
- **Motion**:
  - Respects `prefers-reduced-motion` strictly via Tailwind `motion-reduce:` classes.
