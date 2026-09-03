# Discora — First-Time UX Redesign Specification (`NEW_USER_JOURNEY_REDESIGN.md`)

---

## 1. Overview & Redesign Principles

This redesign specification outlines the minimal, targeted UX improvements required to eliminate first-time onboarding friction while **100% preserving Discora's underlying database schemas, RPC contracts, RLS security, and core product philosophy**.

### Core Constraints:
- **Zero Schema / Migration Changes**: All database tables (`rooms`, `claims`, `evidence`, `questions`, `inquiries`) remain unchanged.
- **Zero Popularity Mechanics**: NO likes, upvotes, view counts, follower feeds, or trending algorithms.
- **Zero Gamification**: NO streaks, badges, points, or leaderboards.
- **Write-First / Structure-Later**: Shift taxonomy selections from mandatory initial form steps to optional/smart defaults.

---

## 2. Categorized Redesign Proposals

### P0 — MUST FIX (Critical Onboarding & Contribution Friction)

#### Proposal P0-1: Write-First Claim & Contribution Flow
- **Problem**: Current `ClaimForm` modal forces users to choose a Claim Type (`Fact`, `Opinion`, `Prediction`, `Proposal`, `Observation`) and Context Type before typing text.
- **Current Behavior**: 4 required form inputs presented simultaneously in a heavy modal.
- **Proposed Behavior**:
  1. Primary step: Single, clean text area with placeholder: *"What claim or core thought do you want to contribute to this discussion?"*
  2. Smart Defaults: Default `claimType` to `"opinion"` (for Discussions) or `"opinion"` (for Debates). Default `contextType` to `"supporting_idea"`.
  3. Progressive Disclosure: An "Advanced Options" collapsible toggle allows power users to change Claim Type, Context Type, or Identity Mode (`Public` vs `Anonymous`) if desired.
- **Why**: Reduces first contribution time from ~45s to <10s and eliminates decision paralysis for new users.
- **Expected Outcome**: Higher first-contribution completion rate without sacrificing backend data typing.
- **Affected Files**: [`src/features/discussions/components/claim-list.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/claim-list.tsx), `src/features/discussions/components/claim-form.tsx`.
- **Risk**: Low (backend RPC still receives valid `claimType` and `contextType` default strings).
- **Architecture Changes Required**: NO.

---

### P1 — SHOULD FIX (High Impact Comprehension & Navigation)

#### Proposal P1-1: Streamlined Room Header Hierarchy (First Viewport Optimization)
- **Problem**: Discussion and Debate room headers display 12+ competing metadata badges, dates, trust scores, and counts in the first viewport, pushing claims below the fold.
- **Current Behavior**: Title, Topic pill, Created date, Author badge, Identity mode badge, Room status pill, total claims count, total evidence count, total participants count render simultaneously above room tabs.
- **Proposed Behavior**:
  1. Primary Zone: Bold Room Title + Opening Premise / Motion Statement.
  2. Secondary Toolbar: Topic pill + Compact metadata summary (`3 claims · 2 evidence · 4 participants`).
  3. Collapsible Metadata Drawer: Author rep scores, detailed trust signals, and created dates collapsed into an optional "Room Info" dropdown.
- **Why**: Gives the core question/premise maximum visual prominence on landing.
- **Expected Outcome**: Instant comprehension of room context within 3 seconds.
- **Affected Files**: [`src/features/discussions/components/discussion-room.tsx`](file:///d:/Projects/Discora/src/features/discussions/components/discussion-room.tsx), `src/features/debates/components/debate-header-v2.tsx`.
- **Risk**: Low.
- **Architecture Changes Required**: NO.

#### Proposal P1-2: Unified "Questions & Inquiries" Tab Presentation
- **Problem**: New users assume "Questions" tab and "Inquiries" tab are duplicate features.
- **Current Behavior**: 5 horizontal tabs: `Discussion`, `Claims`, `Evidence`, `Questions`, `Inquiries`.
- **Proposed Behavior**:
  1. Consolidate into 3 clean main tabs: `Overview & Claims`, `Evidence Wall`, `Questions & Inquiries`.
  2. Inside `Questions & Inquiries` tab, render two distinct sub-sections:
     - **General Room Questions** (*"Questions prompting open discussion"*)
     - **Claim Challenges & Evidence Requests** (*"Targeted inquiries seeking proof on specific claims"*)
- **Why**: Eliminates terminology confusion while preserving internal DB entity separation (`questions` vs `inquiries`).
- **Expected Outcome**: Clearer mental model of general queries vs. targeted claim challenges.
- **Affected Files**: `src/features/discussions/components/discussion-room.tsx`, `src/features/inquiries/components/inquiry-list.tsx`.
- **Risk**: Low.
- **Architecture Changes Required**: NO.

---

### P2 — NICE TO IMPROVE (Mobile & Cold-Start Refinement)

#### Proposal P2-1: Mobile Segmented Stance Toggle for Debates (375px / 390px)
- **Problem**: Proposition and Opposition columns stack vertically on mobile screens, requiring long scrolling to compare sides.
- **Current Behavior**: Single column vertical scroll on mobile.
- **Proposed Behavior**: Render a mobile-only segmented control bar at top of debate content: `[ Proposition | Opposition | Both ]`. Default to `Both` (stacked) with quick switching.
- **Why**: Allows instant side-by-side argument comparison on small mobile viewports.
- **Affected Files**: `src/features/debates/components/debate-room.tsx`.
- **Risk**: Low.
- **Architecture Changes Required**: NO.

#### Proposal P2-2: "Prompts for Understanding" Empty States
- **Problem**: Empty rooms display generic "No claims yet" text, feeling abandoned.
- **Current Behavior**: Static icon and short "No claims" label.
- **Proposed Behavior**: Render active prompt: *"Be the first to share a core claim or ask a clarifying question to begin building understanding for this topic."* with a quick "Share Claim" CTA button.
- **Affected Files**: `src/features/discussions/components/claim-list.tsx`.
- **Risk**: None.
- **Architecture Changes Required**: NO.

---

## 3. DO NOT BUILD YET (Explicit Non-Goals & Exclusions)

To protect Discora's core mission (**Understanding over engagement**), the following mechanics are **STRICTLY EXCLUDED**:

1. **DO NOT BUILD**: Upvote / Downvote buttons or Like counters on claims.
2. **DO NOT BUILD**: Follower systems, user popularity rankings, or author follower counts.
3. **DO NOT BUILD**: Trending algorithms or engagement-velocity recommendation feeds.
4. **DO NOT BUILD**: Gamification elements (streaks, badges, points, XP, leaderboards).
5. **DO NOT BUILD**: Automatic Discussion-to-Debate room conversion RPCs.
6. **DO NOT BUILD**: Social sharing popups, push notification prompts, or endless infinite scroll traps.

---

## 4. Expected User Outcomes & Verification Metrics

- **First-Time Comprehension**: New user understands room context within 3 seconds of landing.
- **First Contribution Speed**: Time-to-first-contribution reduced from ~45 seconds to <10 seconds.
- **Terminology Clarity**: 0 confusion between Questions vs. Inquiries.
- **Philosophy Adherence**: 100% adherence to neutrality, evidence-based dialogue, and zero-gamification standards.
