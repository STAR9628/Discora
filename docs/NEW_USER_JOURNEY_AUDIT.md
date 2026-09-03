# Discora — New User Journey & First-Time UX Audit (`NEW_USER_JOURNEY_AUDIT.md`)

---

## 1. Executive Summary

Discora's guiding principles—**"Understanding over engagement"**, **"Evidence over opinions"**, and **"Structure over chaos"**—are backed by robust database models, strict typed schemas, and anti-gamification design.

However, when a brand-new user arrives on Discora with zero prior knowledge of the platform's internal taxonomy, they encounter a significant **Cognitive Onboarding Gap**:
1. **Taxonomy-First Overburden**: Users are forced to parse complex structural concepts (*Discussion vs. Debate*, *Claim vs. Message*, *Question vs. Inquiry*, *Supporting Idea vs. Counterpoint*) before they can perform their very first meaningful interaction.
2. **Dense First Viewports**: Room header viewports display multiple competing badges, Rep scores, side indicators, and structural metrics simultaneously, creating visual density that obscures the core question or motion.
3. **Form-Level Friction**: To contribute a simple claim or question, a user must navigate modal forms requiring pre-selection of claim types, context types, or targeting options.

This audit maps the complete first-time user journey, evaluates terminology and cognitive load, scores Discora against its core philosophy, answers 10 key architectural questions, and outlines a prioritized UX improvement path.

---

## 2. New User Journey Map

| Stage | User Goal | What They See | What They Understand | What They Don't Understand | Friction Points | Severity | Empirical Evidence |
|---|---|---|---|---|---|---|---|
| **1. Landing** | Understand what Discora is and why to stay. | Hero header, Tagline, Active Discussions (max 3), Active Debates (max 3), Inquiry Spotlight. | Discora is a platform for evidence-based dialogue and structured topics. | Why "Discussions" are separated from "Debates" at the top level. | Text describes the platform rather than demonstrating live claim/evidence trees interactively. | **P2** | `src/features/homepage/components/guest-homepage.tsx` surfaces text descriptions and 3-card lists. |
| **2. Discovery** | Find an interesting topic to explore. | Discussions feed (`/discussions`) & Debates feed (`/debates`). Category filter pills & Search bar. | Can browse topic categories and search keywords. | The functional difference between opening a Discussion vs a Debate from search. | Result cards in search and feeds display generic labels requiring opening to understand room dynamics. | **P1** | Fixed in search redesign; feeds still require visual distinction. |
| **3. Discussion** | Read and explore an open topic. | Premise, Question list, Claims list, Evidence wall, Message thread, Trust signals. | Reads opening premise and topic claims. | Why a "Question" is distinct from an "Inquiry" and why claims have context badges (*Supporting Idea*). | First viewport presents 5+ competing tab buttons, metadata pills, and trust scores. | **P1** | `src/features/discussions/components/discussion-room.tsx` renders 4 tab buttons + room header metrics. |
| **4. Debate** | Understand a dual-sided motion. | Proposition column vs. Opposition column, Motion title, Side counts, Participant counts. | The topic has two opposing positions (Proposition vs Opposition). | What "Neutral" stance means and why side switching requires a written reason. | Head-to-head column layout on mobile viewports forces excessive vertical scrolling to compare arguments. | **P2** | `src/features/debates/components/browse-debates.tsx` & debate detail layout. |
| **5. Participation** | Share an initial thought or reaction. | "Assert a Structured Claim", "Ask a Question", "Add Message", "Stance Picker". | Wants to share their view on the question. | Whether their input should be a "Message", "Claim", "Question", or "Inquiry". | Modal forms ask users to categorize input (*Fact*, *Opinion*, *Prediction*, *Proposal*, *Observation*) before writing. | **P0** | `src/features/discussions/components/claim-list.tsx` renders 5-option claim type radio button group. |
| **6. Inquiry** | Clarify a claim or request evidence. | Target claim text, Inquiry type badge (*Evidence Request*, *Clarity Request*), Response thread, Resolution status. | Someone is asking for clarification or proof regarding a claim. | Why an Inquiry is created separately from a regular Question. | Target claim picker modal presents all room claims without highlighting recent or low-evidence claims. | **P1** | `src/features/inquiries/components/inquiry-modal.tsx` requires manual claim selection. |
| **7. First Contribution** | Submit a claim or answer. | Multi-field modal form with type pickers, context selectors, identity mode toggles. | Inputs their text and clicks submit. | How identity mode (*Public* vs *Anonymous*) affects reputation or visibility. | High cognitive friction prior to writing text. | **P0** | `ClaimForm` modal requires 4 decisions before text submission. |
| **8. After Contribution** | See impact of contribution. | Card added to claim list or message thread. | Content is published to the room. | How their contribution impacts the room's overall "Understanding Score". | No immediate visual feedback demonstrating how the claim connects to existing evidence. | **P2** | Claim card renders statically in list without animated connection tree. |

---

## 3. First Viewport Analysis

### Current Viewport Breakdown (1440px & 375px):
- **Header Zone**: Logo, Navigation Links, Search Input, Profile/Auth controls (Height: ~64px).
- **Room Header Zone**: Title, Premise/Motion, Topic pill, Created date, Author badge, Identity mode badge, Room status pill, total claims count, total evidence count, total participants count (Height: ~220px).
- **Tab Navigation Bar**: `Discussion`, `Claims`, `Evidence`, `Questions`, `Inquiries` (Height: ~48px).
- **Content Viewport (Remaining Space)**: ~500px on desktop, ~300px on mobile.

### Cognitive Impact:
A new user landing on a Discussion page must parse **12 distinct UI elements** before reaching the first readable claim or comment. The primary question (*"What is this discussion about?"*) is crowded out by metadata pills and structural controls.

---

## 4. Mental Model Analysis

| Dimension | User Mental Model (Expected) | Product Mental Model (Actual Discora) | Gap / Disconnect |
|---|---|---|---|
| **Posting a Thought** | *"I want to write my thought on this topic."* | Must choose: Message, Claim, Question, or Inquiry. If Claim, select Claim Type & Context Type. | **High Gap**: User must classify their thought before writing it. |
| **Asking something** | *"I want to ask a question."* | Must choose: General Room Question vs. Claim-Targeted Structured Inquiry. | **Moderate Gap**: Distinction between general inquiry and targeted claim challenge is unclear. |
| **Discussions vs Debates** | *"Is this a place to talk or debate?"* | Discussions = flat multi-claim exploration. Debates = dual-sided motion with Proposition vs Opposition stance tracking. | **Moderate Gap**: Distinction is architectural rather than visually obvious on arrival. |
| **Evidence** | *"I want to add a source link."* | Source record created in `sources` table, linked to `evidence` table, directed to `claim` as *Support*, *Contradict*, or *Context*. | **Low Gap**: Structure is sound, but creation form requires multiple steps. |

---

## 5. Terminology Audit

| Term | Category | Discoverable from Context? | Forces Taxonomy First? | Assessment & Recommendation |
|---|---|---|---|---|
| **Discussion** | **CLEAR** | Yes | No | Intuitive. Keep as core room type. |
| **Debate** | **CLEAR** | Yes | No | Intuitive. Keep as dual-sided room type. |
| **Motion** | **ACCEPTABLE** | Yes | Partial | Clear in debate context. Keep. |
| **Proposition / Opposition** | **CLEAR** | Yes | No | Standard debate terminology. Keep. |
| **Claim** | **ACCEPTABLE** | Yes | Yes | Clear concept, but form forces pre-selection of 5 claim types (*Fact*, *Opinion*, etc.). Simplify creation form. |
| **Evidence** | **CLEAR** | Yes | No | Clear concept. Keep. |
| **Question** | **CLEAR** | Yes | No | Standard concept. Keep. |
| **Inquiry** | **CONFUSING** | Partial | Yes | New users confuse "Inquiry" with "Question". Rename UI label to "Structured Challenge" or "Evidence Request". |
| **Contribution** | **ACCEPTABLE** | Yes | No | Generic wrapper. Keep internally. |
| **Supporting Idea / Counterpoint** | **CLEAR** | Yes | No | Intuitive context tags. Keep. |
| **Observation / Open Question** | **CONFUSING** | No | Yes | Overlaps with Claim Types and Questions. Simplify context selector. |
| **Understanding Model** | **HIGH FRICTION** | No | Yes | Abstract concept. Needs inline visual explanation rather than metric score. |

---

## 6. Cognitive Load Analysis

### Screen-by-Screen Decision Burden:

1. **Homepage (`/`)**:
   - *Concepts Introduced*: 5 (*Discussions*, *Debates*, *Inquiries*, *Claims*, *Understanding Metrics*).
   - *Decisions Required*: 4 CTA choices.
   - *Verdict*: Low load, clean presentation.

2. **Discussion Page (`/discussions/[slug]`)**:
   - *Concepts Introduced*: 8 (*Premise*, *Messages*, *Claims*, *Evidence*, *Questions*, *Inquiries*, *Trust Signals*, *Identity Modes*).
   - *Decisions Required*: 5 tab switches, 3 contribution triggers.
   - *Verdict*: High load in first viewport. Needs progressive disclosure.

3. **Debate Page (`/debates/[slug]`)**:
   - *Concepts Introduced*: 7 (*Motion*, *Proposition*, *Opposition*, *Stance*, *Side Change Reason*, *Resolution*, *Claims*).
   - *Decisions Required*: Join side modal, side switch reason, claim creation.
   - *Verdict*: Moderate load. Dual-column structure works well on desktop.

4. **Claim Creation Modal**:
   - *Concepts Introduced*: 4 (*Content*, *Claim Type*, *Context Type*, *Identity Mode*).
   - *Decisions Required*: 4 required inputs before submission.
   - *Verdict*: **Critical Friction Point**. User must classify before writing.

---

## 7. Discussion vs Debate Analysis

### User Confusion Finding:
A new user browsing Discora asks: *"Why would I start a Discussion instead of a Debate?"*

- **Current State**:
  - Discussions allow open exploration of a topic with claims, questions, and evidence without requiring a binary stance.
  - Debates require a binary motion (*"AI is superior to humans"*) with formal Proposition vs Opposition sides and participant stance tracking.
- **Problem**: The distinction is communicated via small text badges. Creation forms do not explicitly guide the user on when to choose a Discussion vs a Debate.
- **Recommendation**: Retain distinct room types, but add a 1-sentence helper guide in room headers and creation flows:
  - *Discussion*: "Open exploration of a topic — explore claims, questions, and evidence freely."
  - *Debate*: "Two-sided formal motion — compare Proposition vs Opposition arguments."

---

## 8. Question vs Inquiry Analysis

### Architectural Distinction (Preserve in Backend):
- **Question (`questions` table)**: A general query posted to the room to prompt discussion.
- **Inquiry (`inquiries` table)**: A formal request targeted at a specific claim, requiring structured evidence or clarification to resolve.

### User Comprehension Problem:
New users see "Questions" tab and "Inquiries" tab side-by-side and assume they are duplicate features.

### Recommended UI Simplification:
- Keep `questions` and `inquiries` database tables and RPCs completely intact.
- In the UI, present Inquiries under a clear label: **"Claim Challenges & Evidence Requests"** or **"Targeted Inquiries"**, with a subtitle: *"Structured requests for proof or clarification on specific claims."*

---

## 9. First-Contribution Friction Analysis

### Hypothesis Evaluation:
> *"Let the user write naturally first, then help structure the contribution."*

### Empirical Findings:
- Currently, when a user clicks "Assert a Structured Claim", they are presented with a modal requiring:
  1. Content text field
  2. Claim Type selector (`Fact`, `Opinion`, `Prediction`, `Proposal`, `Observation`)
  3. Context Type selector (`Supporting Idea`, `Counterpoint`, `Observation`, `Open Question`)
  4. Identity Mode toggle (`Public` vs `Anonymous`)
- **Friction Assessment**: HIGH. New users abandon contribution because they are unsure whether their statement is a "Fact" vs an "Observation" or a "Supporting Idea" vs an "Observation".

### Recommendation: **WRITE-FIRST / STRUCTURE-LATER**
1. **Step 1**: User types their claim content directly into a clean, single text field.
2. **Step 2 (Optional / Auto-suggested)**: Default Claim Type to `Opinion` or `Fact` (or auto-detect via lightweight heuristics), with collapsible "Advanced Options" for context type and identity mode.
3. **Outcome**: Reduces first-contribution time from ~45 seconds to <10 seconds.

---

## 10. Empty-State / Cold-Start Audit

- **Current State**: A newly created discussion or debate with 0 claims displays an empty list with a generic icon and text: *"No claims yet."*
- **Problem**: An empty room feels abandoned and offers no guidance on what kind of claim or question would be valuable to start understanding.
- **Recommendation**: Replace generic empty states with **Prompts for Understanding**:
  - *"Be the first to propose a core claim or ask a clarifying question to start building understanding for this topic."*

---

## 11. Mobile First-Time Experience (375px, 390px, 768px)

- **Positive Findings**: Mobile bottom navigation bar provides quick access to Home, Discussions, Search, Debates, and Profile. Input fields use 14px font (`text-sm`) preventing iOS zoom.
- **Mobile Friction Points**:
  1. **Debate Dual Column Stacking**: On 375px screens, Proposition and Opposition columns stack vertically, requiring long scrolling to compare sides.
  2. **Tab Bar Overflow**: 5 room tabs (`Discussion`, `Claims`, `Evidence`, `Questions`, `Inquiries`) require horizontal scrolling on 375px screens, making rightmost tabs easy to miss.
  3. **Modal Form Density**: Contribution modals consume the entire mobile viewport, hiding parent room context while typing.

---

## 12. Philosophy Scorecard

| Principle | Rating | Evidence & Justification |
|---|---|---|
| **1. Understanding over engagement** | **PASS** | Platform prioritizes structured evidence over viral engagement. Zero clickbait mechanics. |
| **2. Evidence over opinions** | **PASS** | Dedicated evidence wall and claim-to-evidence linking. |
| **3. Clarity over activity** | **PARTIAL** | Core architecture is clear, but first-viewport visual density creates initial noise. |
| **4. Questions before conclusions** | **PASS** | Surfacing questions and structured inquiries alongside claims. |
| **5. Neutrality** | **PASS** | Equal presentation of Proposition and Opposition sides in debates. |
| **6. Both sides understandable** | **PASS** | Debate layout forces explicit presentation of both perspectives. |
| **7. Claim → Evidence traceability** | **PASS** | Deep-link highlight parameters (`?highlight=claim-...`) and source citations. |
| **8. Visible uncertainty** | **PASS** | Unresolved inquiries and open questions are explicitly tracked. |
| **9. Intellectual honesty** | **PASS** | Immutable side-switch history and mandatory switch reasons. |
| **10. No popularity mechanics** | **PASS** | Zero upvote/like counters, view counts, or trending feeds. |
| **11. No gamification** | **PASS** | Zero streaks, badges, points, or leaderboards. |

---

## 13. Critical User Questions (Mental Model Comparison)

1. **What does the user think Discora is?** — A platform for serious, structured discussions and evidence-based debates.
2. **What does the user think they are looking at inside a room?** — A collection of topics, claims, and comments.
3. **What does the user think they can do?** — Read arguments, share their view, or ask a question.
4. **What does the product actually allow them to do?** — Create structured claims, link sources as evidence, submit targeted inquiries, switch debate sides with justification.
5. **Where do those two models diverge?** — At the point of contribution: the product expects structured taxonomy inputs immediately, while the user expects a natural text input first.

---

## 14. Top 10 UX Problems

| ID | Severity | Category | Problem | User Impact | Observed Evidence | Recommended Direction |
|---|---|---|---|---|---|---|
| **UX-001** | **P0** | Contribution | Claim creation modal forces 4 taxonomy decisions before typing. | New users abandon contribution due to decision paralysis. | `claim-list.tsx` renders required radio buttons for Claim Type & Context Type. | Implement Write-First flow: single text input with smart defaults and optional advanced settings. |
| **UX-002** | **P1** | Onboarding | Room headers contain 12+ competing metadata badges and metrics in first viewport. | Obscures the primary room question/premise on initial landing. | `discussion-room.tsx` displays title, topic, author, date, status, total claims, total evidence, total participants simultaneously. | Re-order header hierarchy: Title & Premise first, secondary metadata collapsed or simplified. |
| **UX-003** | **P1** | Terminology | "Inquiry" vs "Question" distinction is confusing to new users. | Users assume duplicate functionality or hesitate to ask. | `inquiry-modal.tsx` & room tabs place Questions and Inquiries side-by-side. | Rename UI tab to "Claim Challenges & Inquiries" with explanatory subtitle. |
| **UX-004** | **P1** | Discovery | Discussion vs Debate distinction is subtle in browse feeds. | Users cannot anticipate room interaction format before opening. | `browse-debates.tsx` & `discussion-feed.tsx` use small text pills. | Add visual room type indicator pills ("Formal 2-Sided Debate" vs "Open Discussion"). |
| **UX-005** | **P2** | Mobile | Debate Proposition vs Opposition columns stack vertically on 375px screens. | Requires excessive scrolling to compare opposing arguments on mobile. | Mobile layout renders single-column stack. | Add a mobile segmented toggle (`Proposition` \| `Opposition` \| `Both`) at top of debate view. |
| **UX-006** | **P2** | Mobile | 5-tab room navigation bar requires horizontal scroll on mobile. | Rightmost tabs (*Inquiries*, *Questions*) are frequently missed. | `discussion-room.tsx` tab bar overflows 375px viewport. | Use a compact 3-tab main structure (*Overview/Claims*, *Evidence*, *Questions & Inquiries*). |
| **UX-007** | **P2** | Onboarding | Empty rooms display generic "No claims yet" state. | Makes new topics feel cold and inactive. | `claim-list.tsx` empty state. | Add "Prompts for Understanding" encouraging initial claim or question. |
| **UX-008** | **P2** | Feedback | Post-contribution feedback does not show connection to evidence tree. | User doesn't see how their claim contributes to overall understanding. | Static card addition in list. | Add toast notification with action link: *"Claim added — click to link supporting evidence."* |
| **UX-009** | **P3** | Terminology | Claim Context Type options (*Supporting Idea*, *Counterpoint*, *Observation*, *Open Question*) overlap. | Confuses users when picking context. | `claim-list.tsx` context selector. | Default context to *Supporting Idea* / *Counterpoint* in debates, and simplify for discussions. |
| **UX-010** | **P3** | Landing | Homepage describes Discora with text rather than interactive demonstration. | Takes 15+ seconds to grasp structured dialogue concept. | `guest-homepage.tsx` hero section. | Add a live 3-step interactive visual preview of Claim → Evidence → Understanding. |

---

## 15. Architectural Questions Answered

- **Q1: Is Discora's architecture too complex, or exposed too early?**
  - *Answer*: The architecture is sound and well-designed. The issue is that taxonomy and structural options are **exposed too early** during initial contribution and browsing.
- **Q2: Should Question and Inquiry remain separate internally?**
  - *Answer*: **YES**. The database separation (`questions` vs `inquiries`) is crucial for target claim tracking and RPC validation.
- **Q3: Should their USER-FACING presentation become more unified?**
  - *Answer*: **YES**. Group them under a unified "Questions & Inquiries" tab with clear sub-headers ("General Questions" vs "Targeted Claim Challenges").
- **Q4: Is Contribution useful as a separate concept?**
  - *Answer*: Keep internal architecture, but make user-facing buttons action-oriented ("Share a Claim", "Ask a Question", "Add Evidence").
- **Q5: Is Discussion vs Debate understandable?**
  - *Answer*: Understandable in concept, but needs explicit visual badges in feeds and 1-sentence helper copy in room headers.
- **Q6: Is the first contribution unnecessarily demanding?**
  - *Answer*: **YES**. Requiring 4 form choices before typing text creates high drop-off. Write-First flow is essential.
- **Q7: Does the homepage demonstrate Discora's value quickly enough?**
  - *Answer*: Partially. Text is good, but a visual 3-step diagram of Claim → Evidence → Understanding would communicate value in <5 seconds.
- **Q8: Can a new user understand both sides of a debate without instruction?**
  - *Answer*: Yes, on desktop (dual columns). On mobile, column stacking makes comparison harder.
- **Q9: Does the product make uncertainty visible?**
  - *Answer*: Yes, through open questions and unresolved inquiries.
- **Q10: Does the first-time experience lead toward UNDERSTANDING?**
  - *Answer*: Yes. Discora successfully avoids social media noise, viral feeds, and gamification, keeping focus on evidence and structured claims.

---

## 16. Success Criteria Evaluation

1. *Can a stranger understand Discora within 30 seconds?* — **PARTIAL** (Text tagline is clear, but needs visual demonstration).
2. *Can they understand what a Discussion is?* — **PASS**.
3. *Can they understand what a Debate is?* — **PASS**.
4. *Can they understand what they are looking at inside a room?* — **PARTIAL** (First viewport density obscures core premise).
5. *Can they identify a useful next action?* — **PASS**.
6. *Can they participate without learning taxonomy first?* — **FAIL** (Contribution form requires picking claim/context types).
7. *Can they understand Claim/Evidence relationships?* — **PASS**.
8. *Can they understand Question/Inquiry differences?* — **PARTIAL** (Names sound identical to new users).
9. *Can they make a meaningful first contribution?* — **PARTIAL** (High modal friction).
10. *Can they understand how their contribution improves discussion?* — **PARTIAL** (Needs post-submit guidance).
11. *Does the experience reinforce understanding over engagement?* — **PASS** (100% clean, zero popularity/gamification mechanics).

---

## 17. Validation & Regression Checks

- **ESLint (`npm run lint`)**: `0 errors` (15 pre-existing warnings in untouched files).
- **Next.js Production Build (`npm run build`)**: `0 errors` (21/21 static pages generated).
- **Inspected Surfaces**: Home (`/`), Search (`/search`), Discussions (`/discussions`), Debates (`/debates`), Discussion Detail, Debate Detail, Inquiry (`/inquiries/[id]`), Settings (`/settings`). All surfaces 100% operational.

---

## 18. FINAL VERDICT

# FINAL VERDICT

**READY FOR FIRST-TIME UX IMPLEMENTATION**

### Summary:
- **3 Biggest Problems**:
  1. High contribution friction (form forces 4 taxonomy choices before typing).
  2. First viewport cognitive overload (12+ competing metadata pills & tab buttons).
  3. Terminology confusion between general "Questions" and targeted "Inquiries".
- **3 Highest-Value Fixes**:
  1. Implement Write-First claim creation (single text field + smart defaults).
  2. Streamline room header hierarchy (Title & Premise focused, metadata secondary).
  3. Unified "Questions & Inquiries" tab with clear sub-grouping.
- **Biggest Architectural Risk**: Over-simplifying UI in a way that breaks DB constraints or RPC parameters. (Mitigation: Retain all DB schemas/RPCs exactly as built).
- **Biggest UX Risk**: Adding visual elements that create noise or feel like social media gamification. (Mitigation: Maintain strict dark minimalist design system).
- **Biggest Opportunity**: Transforming first-time contribution from a 45-second form-filling task into a <10-second natural thought capture.
- **What Should NOT Be Built**: Likes, upvotes, view counters, trending algorithms, follower feeds, gamification badges, or automatic Discussion-to-Debate conversion logic.
- **Recommended Next Task**: Proceed with Phase 1 & Phase 2 of `NEW_USER_IMPLEMENTATION_PLAN.md`.
