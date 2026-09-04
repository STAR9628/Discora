# DISCORA — PHASE 3 USER JOURNEY AUDIT
**Behavioral Audit: New User First-Session Experience**

Date: 2026-09-04
Auditor: Antigravity
Commit baseline: 5224f82 (Phase 2 complete)
Status: **AUDIT COMPLETE — NOT AN IMPLEMENTATION DOCUMENT**

---

## Audit Method

This audit simulates a completely new user who:
- Has never heard of Discora
- Has no familiarity with structured debate formats
- Arrives without a referral link or specific room URL
- Lands first on the guest homepage
- Spends approximately 3 minutes exploring

Code was reviewed statically. Browser QA was run unauthenticated at 1440px desktop. No application code was modified.

---

## SECTION 1 — HOMEPAGE FIRST IMPRESSION

### 1.1 What a New User Sees Above the Fold

**Hero headline:** "Structured Discussion & Debate"
**Hero subtext:** "A platform for evidence-based dialogue. Explore discussions, follow debates, and build understanding — one claim at a time."
**CTA buttons:** Browse Discussions | Explore Debates | Search | Sign In

**Below fold (in order):**
1. Active Discussions (up to 3 cards)
2. Active Debates (up to 3 cards with prop/opp indicators)
3. Inquiry Spotlight (single featured inquiry or empty state)
4. Understanding Metrics (4 stat tiles)

### 1.2 Friction Observations

**F1 — Tagline communicates structure but not WHY.**
"Structured Discussion & Debate" describes a format but does not explain user benefit. A new user cannot answer: "Why would I use this instead of Reddit or any forum?" No competitive differentiator is stated. "Evidence-based dialogue" is abstract. "One claim at a time" is internal Discora language that means nothing to a first-timer.

**F2 — Discussion vs. Debate distinction: partial above the fold, better below.**
Above the fold, both Discussion and Debate are named but not differentiated conceptually. Only debate cards below fold show Proposition/Opposition framing. A new user cannot tell whether a "Discussion" is just an open forum post and a "Debate" is just a heated discussion.

**F3 — "Understanding Metrics" section is opaque.**
Tiles: "Open Inquiries" (what is an Inquiry?), "Claims with Evidence" (partial), "Debates (Both Sides)" (partial), "Satisfied Today" (completely opaque). These assume users already understand Discora's data model. To a first-time visitor they are uninterpretable product metrics.

**F4 — "Inquiry Spotlight" is an unmotivated section title.**
"Inquiry" is a Discora-specific term undefined anywhere on the page. Frequently renders as empty state ("No open inquiries at the moment"), making the section feel like a dead placeholder.

**F5 — No narrative onboarding story on the homepage.**
There is no flow showing: "Someone poses a question → others contribute → claims extracted → evidence attached → consensus tracked." The platform's unique conceptual model is invisible until a user enters a room.

---

## SECTION 2 — DISCUSSIONS FEED

### 2.1 What a New User Sees

Page subtitle: "Open-exploration conversations with many viewpoints and no winner. Share perspectives and evidence."
Room cards: category badge, date, title, description, stats (claims/questions/evidence/contributions), author + timestamp, "Join Discussion →" CTA
Guest prompt at bottom: "Join Discora to start discussions, contribute evidence, and evaluate claims."

### 2.2 Observations

The discussions feed is the **clearest page for new users**. The subtitle explicitly states purpose. Room cards are reasonably informative.

**F6 — Card stats use undefined jargon before terms are explained.**
Stats showing "15 Claims, 2 Questions, 4 Evidence, 3 Contributions" on a card assume the user knows the distinction between these entity types. "15 Claims" alongside "3 Contributions" could mean the same thing to an uninitiated reader.

---

## SECTION 3 — DEBATES FEED

### 3.1 What a New User Sees

Subtitle: "Active structured debates with proposition and opposition sides."
Status filters: All / Active / Closing Soon / Resolved
Cards: DEBATE badge, status, title, description, side-by-side PROPOSITION/OPPOSITION boxes, stats, "Join Debate" CTA

### 3.2 Observations

Debates feed communicates its core concept clearly. Proposition/Opposition framing is surfaced before entering a room. Status filter adds temporal structure discussions lack.

**F8 — "Join Debate" CTA on feed card creates false expectation for guests.**
"Join Debate" implies joining as a participant (choosing a side). A more honest label for guests would be "View Debate" or "Explore Debate." "Join Debate" should be reserved for the authenticated in-room action.

---

## SECTION 4 — DISCUSSION ROOM

### 4.1 Structure Observed

**Sticky tab nav:** Questions | Claims | Evidence Bank | Contributions
(Single scrollable page, not routed tabs — sections detected via IntersectionObserver)

**Header:** Room title (h1), topic badge, date, 4 stats pills: `{N} claims • {N} evidence • {N} questions • {N} contributions`

**Section 1 — Discussion Questions:**
Subtitle: "Open questions that help explore what this discussion is really about."
No guest prompt — only authenticated users see the "Ask a Question" form.
"View & Assert Answers →" CTA on each question.

**Section 2 — Claims:**
No section subtitle or definition. Cards show: type badge (CLAIM/OPINION/FACT/SUPPORTING IDEA/OBSERVATION), content, Consensus %, Impact, up/down vote controls, expandable Evidence/Relations tabs.

**Section 3 — Evidence Bank:**
Filter pills: All / Supports / Contradicts / Context. Each item: stance badge, linked claim quote, source URL.

**Section 4 — Contributions:**
Threaded comment list. For guests: GuestContributionPrompt — "Want to contribute to this discussion? Sign in to share your perspective, help answer questions, or contribute evidence."

### 4.2 Friction Observations

**F9 — "Questions" is listed first with no signal that it is the intended starting point.**
Questions are Discora's mechanism for scoping a room's inquiry space, but nothing on the page explains: "Start here." A new user cannot tell why questions come before contributions or that questions are structurally distinct from comments.

**F10 — No start prompt / entry point for new visitors.**
There is no "If you are new here, start by…" moment. A new user does not know whether to read the premise, look at claims, post a contribution, or ask a question. The implicit hierarchy (Questions > Claims > Evidence > Contributions) is invisible.

**F11 — Claim types (FACT, CLAIM, OPINION, SUPPORTING IDEA, OBSERVATION) are unexplained.**
No tooltip, no legend, no definition on the page. A new user cannot tell what distinguishes a "CLAIM" from a "FACT" in Discora's model, or why the distinction matters.

**F12 — Consensus % is unexplained.**
Claim cards show "50%" with no label for what it represents. "50% of what?" is unanswerable from the UI.

**F13 — Two evidence surfaces create a split mental model.**
Individual claims have an expandable "Evidence" tab. The room also has a separate "Evidence Bank" section. A new user cannot tell whether these are the same evidence or different evidence, and why there are two evidence concepts.

**F14 — No guest prompt in the Questions section.**
A guest who reads the Questions section and wants to ask a question receives no call to action. The form is gated but there is no GuestContributionPrompt equivalent. A curious guest is silently blocked.

**F15 — "Extract Claim" guidance banner uses jargon.**
Post-contribution banner says: "If your post introduces a distinct factual assertion, you can click 'Extract Claim'..." This assumes the user knows what a Claim is in Discora's model. For a first-time contributor, "Extract Claim" is an unexplained action.

---

## SECTION 5 — DEBATE ROOM

### 5.1 Structure Observed

**Tab nav:** Overview | Arguments | Evidence | Inquiries | Contributions
**Header:** Motion title, DEBATE + ACTIVE badge, "Join Debate" button (visible to guests)
**Debate Side Picker Modal (on "Join Debate"):**
- Title: "Choose Your Stance"
- Subtitle: "Select a position to contribute from. You can update your stance as new arguments and evidence develop."
- Cards: PROPOSITION (blue) and OPPOSITION (red) with motion-specific titles
- Info note: "You can update your position at any time as new evidence is evaluated."
- On confirm as guest: Error "Must be authenticated to join a debate."

### 5.2 Friction Observations

**F16 — Guest "Join Debate" leads to inline error, not auth redirect. (High severity)**
Flow: Guest clicks "Join Debate" → modal opens (implies they can join) → guest selects a side → guest clicks "Join Debate Stance" → inline error appears: "Must be authenticated to join a debate."
The user selected a side, formed intent, and was rejected without being redirected to registration. This is a broken flow. The correct behavior: after modal confirmation as guest, redirect to `/register?redirectedFrom=...`.

**F17 — "Inquiries" vs "Questions": inconsistent labeling across room types.**
Debate rooms use "Inquiries"; discussion rooms use "Discussion Questions." Both are the same conceptual feature (structured open questions), but different labels. A user visiting both room types cannot tell whether these are the same feature.

**F18 — Overview tab directs users away immediately.**
The last visible element on Overview is: "Inspect the Arguments section to compare the current proposition and opposition claims." This makes Overview feel like a navigation meta-page rather than a section with its own value.

**F19 — Position History empty state is uncontextualized.**
Position History shows when participants changed sides. A new user sees an empty list with no explanation of what this section represents or why changing sides is valued in Discora's philosophy.

---

## SECTION 6 — MOBILE (375px)

**F20 — Tab nav overflow indicator is hidden.**
The sticky tab nav uses `overflow-x-auto no-scrollbar` CSS. At 375px, "Evidence Bank" is the longest label and the tab list likely requires horizontal scrolling. The hidden scrollbar (`no-scrollbar`) means there is no visual indicator that more tabs exist offscreen. Users may miss tabs.

---

## SECTION 7 — AUTHENTICATED HOMEPAGE (New User)

**The FirstUserBanner is the strongest educational moment in the product:**
"Structured discussion starts with a question. Build understanding one claim at a time: ask a question, support it with a claim, back it with evidence, and track how your understanding evolves."

**F21 — The conceptual model is taught only after registration.**
This explanation exists exclusively in `logged-in-homepage.tsx`, gated behind authentication. A guest browsing the product sees no equivalent explanation anywhere on the public surface.

**F22 — Personalized sections are all empty for new users.**
After first login, all personalized sections (My Open Inquiries, Responses to My Inquiries, Debates Needing Attention, etc.) render null when empty. A new user post-login sees only: Welcome banner + Quick Actions + Recent content. The homepage is designed for returning active users, not first-timers.

---

## SUMMARY: FRICTION MAP

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| F1 | Homepage Hero | No competitive differentiator communicated | High |
| F2 | Homepage Hero | Discussion vs. Debate distinction only partial above fold | High |
| F3 | Homepage | "Understanding Metrics" tiles are opaque | Medium |
| F4 | Homepage | "Inquiry Spotlight" section label unexplained | Medium |
| F5 | Homepage | No narrative onboarding flow visible to guests | High |
| F6 | Discussions Feed | Card stats use undefined jargon | Medium |
| F8 | Debates Feed | "Join Debate" on feed card misrepresents guest experience | Medium |
| F9 | Discussion Room | No "where to start" signal for new visitors | High |
| F10 | Discussion Room | No entry point guidance for first-time room visitors | High |
| F11 | Discussion Room | Claim types unexplained (no legend/tooltip) | Medium |
| F12 | Discussion Room | Consensus % metric unexplained | Medium |
| F13 | Discussion Room | Two evidence surfaces (claim-level + room-level) unclarified | Medium |
| F14 | Discussion Room | No guest prompt in Questions section | High |
| F15 | Discussion Room | "Extract Claim" post-contribution guidance uses jargon | Medium |
| F16 | Debate Room | Guest "Join Debate" leads to error, not auth redirect | High |
| F17 | Debate Room | "Inquiries" vs "Questions" inconsistent across room types | Low |
| F18 | Debate Room | Overview tab redirects users away immediately | Low |
| F19 | Debate Room | Position History empty state is uncontextualized | Low |
| F20 | Mobile (375px) | Tab nav overflow indicator hidden | Medium |
| F21 | Auth Homepage | Conceptual model explanation gated behind registration | High |
| F22 | Auth Homepage | Personalized sections empty for new users | Low |

---

## AHA MOMENT ASSESSMENT

**When does a new user understand what Discora is for?**

Current answer: At the earliest, when they enter a discussion room and read the Opening Premise + scroll through the Claims section. More likely 2–4 minutes into the first session.

**The AHA moment has no intentional design.** It is discovered, not taught.

---

## STRENGTHS — DO NOT CHANGE

- Guest read access is completely frictionless (no gates, no popups, no interstitials)
- Discussion room header stats are concise and scannable
- Sticky tab nav is technically solid and visually elegant
- Evidence Bank filter (Supports/Contradicts/Context) is clear and useful
- Search experience is strong: live, cross-entity, with match highlighting
- Debate side-by-side argument columns communicate binary structure clearly
- GuestContributionPrompt in Contributions section is well-written
- FirstUserBanner text explanation is the right message (wrong placement)
- Debate DebateSidePickerModal "Choose Your Stance" copy is welcoming (Phase 2 preserved)
- Post-contribution "Extract Claim" guidance banner is directionally correct

---

*This is an audit document. No application code was modified during this phase.*
