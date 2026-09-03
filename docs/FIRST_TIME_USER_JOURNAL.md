# First-Time User Journey

**Method**: Simulated walkthrough of Discora as a brand new user, starting from signup. Each step traces UI text, navigation, feedback, empty states, and error paths to identify confusion, friction, missing guidance, terminology issues, and dead ends.

**Severity**:
- **P0** — Blocks the flow entirely or makes it impossible to complete intuitively
- **P1** — Significant friction or confusion; wastes time or causes wrong actions
- **P2** — Minor polish; nice-to-have

---

## Step 1: Create Account (`/register`)

### What I see
A card titled "Register" with subtitle "Create an account. Email verification is handled by Supabase Auth." Two fields: Email, Password. No confirm-password field. A "Continue with Google" button above the divider. Below the form: "Already have an account? Login".

### What I do
I type my email and password (8+ chars, uppercase, lowercase, number required). I click "Register". The button shows "Creating account..." then returns to "Register". A muted text message appears: **"Registration started. Check your email to verify your account."**

### What happens next
I stay on the same page. The form is still fully visible and the Register button is re-enabled. I'm not told to go check email — there's no icon, no "Go to Inbox" button, no email illustration. No auto-redirect.

After clicking the verification link in my email, the Supabase middleware processes the session. I land on `/auth/callback` (which has no page file — handled by Supabase URL params). Then I navigate to `/` and get redirected to `/settings/profile` because I don't have a profile yet.

### Issues

| Issue | Severity |
|---|---|
| **No password confirmation field** — If I mistype my password, I won't know until I try to log in. | **P1** |
| **No "Go to email" cue after registration** — I see only text. No icon, no illustration, no button. I might not realize I need to check email. | **P1** |
| **Register button re-enables after success** — I could accidentally click again and get a duplicate error. | **P2** |
| **No resend verification email button** — If the email doesn't arrive, I'm stuck. | **P1** |
| **No `/auth/callback` page exists** — The URL is the redirect target but there's no page component. Supabase handles it via URL params, but if I land there directly with no params, I'd see a 404. | **P2** |
| **No explicit "you'll receive a verification email" upfront guidance** — I discover the email step only after submission. | **P2** |

---

## Step 2: Create Profile (`/settings/profile`)

### What I see
Heading: **"Set up your public profile"**. Subtitle: "Create your Discora profile to start participating in structured discussions."

Fields: Avatar (circular, "No Image", "Choose Avatar Image"), Display Name (placeholder: "Your display name (optional)"), Username (required), Bio (placeholder: "Tell us about yourself..."), Default Identity Preference (radio: Public Mode / Anonymous Mode).

An info box below identity preference: **"Note: Storing this preference is preparation for future sprints. Discora does not support posting yet."**

### What I do
I fill in the username (required), optionally set a display name and bio. I notice the identity preference — I have no idea what "future sprints" means, but I pick "Public Mode" anyway. I click **"Complete Setup"**.

### Success
A green message: **"Your profile has been created successfully!"** Then after 1.5 seconds, I'm automatically redirected to `/u/{username}` — my public profile page.

### On my public profile
I see my @username, bio (or "No bio provided"), join date, and all-zero stats (Discussions: 0, Debates Joined: 0, Claims: 0, Evidence Added: 0). But **my display name is not shown anywhere** — I spent time setting it but it's invisible.

There's no **"Edit Profile"** button, no pencil icon, no "This is you" indicator. To edit, I must know to navigate to Settings → Profile in the sidebar.

### Issues

| Issue | Severity |
|---|---|
| **`displayName` saved but NOT rendered** on the public profile page (`/u/[username]/page.tsx`). I filled it in but see zero visible change. | **P1** |
| **No "Edit Profile" button on own public profile** — I must know to go through Sidebar → Settings → Profile. | **P0** (from QA list) |
| **Auto-redirect after 1.5 seconds** — I can't read the success message; it's yanked away. | **P0** (from QA list) |
| **"Future sprints" jargon** in identity preference info box — I don't know what a sprint is. | **P2** (already flagged) |
| **Identity preference does nothing** — the info box says "preparation for future sprints." I'm configuring a setting with no effect. | **P2** |
| **Profile page shows all zeros** — I understand why (new user) but there's no "Getting Started" guidance. | **P2** |

---

## Step 3: Join Discussion (`/discussions`)

### How I get there
On desktop, I see "Discussions" in the sidebar. On mobile, there is **no Discussions link** in the bottom nav — only Home, Search, Create, Profile. I'm on desktop, so I click Discussions.

### What I see
Heading: **"Explore Discussions"**. Subtitle: "Open-exploration conversations with many viewpoints and no winner. Share perspectives and evidence." Two buttons: "+ New Discussion" (primary) and a swords icon "New Debate" (amber). Topic filter pills below. Each discussion card shows a title, description, and **"Join Discussion"** button.

### I click a discussion
The discussion room loads. Six tabs: **Discussion | Questions | Claims | Evidence | Sources | Map**. I'm on the **Discussion** tab by default. Heading: "Contributions (0)". Empty state: compass icon + **"No contributions yet"** + "Start the conversation — share your perspective, ask a question, or offer a thoughtful reflection."

### Issues

| Issue | Severity |
|---|---|
| **Mobile has NO Discussions link** — mobile bottom nav only has Home, Search, Create, Profile. Mobile users cannot browse discussions. | **P0** (from readiness audit) |
| **Six tabs are overwhelming** for a first-time user — Discussion, Questions, Claims, Evidence, Sources, Map. No explanation of what each tab does or which one to start with. | **P1** |
| **"First-Class Question"** in Questions tab heading — what makes a question "first-class"? No explanation. | **P2** (already flagged) |
| **"Opening Premise" vs "Opening Statement"** inconsistency — discussion room says "Opening Premise", create form says "Opening Statement". | **P2** |
| **"Assert" jargon** in Claims tab — "Assert a Structured Claim." "Assert" is legal jargon; "Structured Claim" is undefined. | **P1** |

---

## Step 4: Create Claim (Claims tab)

### What I see
After clicking the **Claims** tab, I see a form at the top: **"Assert a Structured Claim"** with subtitle "Claims are assertable statements that can be supported or challenged with evidence."

### Fields
1. **CLAIM STATEMENT** — textarea, placeholder: "State a concise, falsifiable claim (e.g. 'Standard treatment protocols show a 15% lower efficacy rate...')", min 25 chars, max 500 chars
2. **CLAIM TYPE** — 5 radio buttons: fact, opinion, prediction, proposal, observation (no tooltips or explanations)
3. **CONTRIBUTION TYPE** — 4 radio buttons: Supporting Idea, counterpoint, observation, Open Question (mixed casing)
4. **"Assert Anonymously"** checkbox

I click **"Assert Claim"**. Success toast: "Claim created successfully" with "View Claim" button that scrolls to and highlights the new claim.

### Issues

| Issue | Severity |
|---|---|
| **"Assert" is jargon** — legal-sounding term. New users won't know it means "create" or "post." | **P1** |
| **No tooltips on claim types** — I can't tell the difference between "fact", "observation", "proposal", "prediction", "opinion". | **P1** |
| **No tooltips on contribution types** — "supporting_idea" vs "counterpoint" vs "observation" vs "open_question" — no explanation. | **P1** |
| **Mixed casing on contribution type labels** — "Supporting Idea" (title case) vs "counterpoint" (lowercase) vs "observation" (lowercase) vs "Open Question" (title case). | **P2** |
| **Button enables at 10 chars but server rejects < 25 chars** — I can click submit at 10 chars, but the server will reject. The disabled threshold (10) doesn't match validation threshold (25). | **P1** |
| **"Structured Claim" is never defined** — the subtitle says "Claims are assertable statements" but doesn't explain what makes one "structured." | **P2** |

---

## Step 5: Add Evidence (Claims tab, inside a claim)

### What I see
Below each claim card is a section with **"View Evidence"** toggle and **"Add Evidence"** button. I click "Add Evidence" and an inline form appears.

### Form heading
**"Add Supporting Evidence"** with subtitle "Cite a source that supports, contradicts, or provides context for this claim."

### Fields
1. **Evidence Detail** — textarea, placeholder about explaining how the source applies, min 20 chars (client), max 1000
2. **Relationship to Claim** — dropdown: Supports / Contradicts / Provides context only
3. **Evidence Methodology** — dropdown with 10 types: Scientific Study, Statistical/Data analysis, etc.
4. **Source Citation** — Title (input) + URL (input), with helper text "Evidence must cite a publicly accessible source."
5. **"Assert Anonymously"** checkbox

I fill it out and click **"Assert Evidence"**. Success toast: "Evidence added successfully."

### Issues

| Issue | Severity |
|---|---|
| **"Assert Evidence" vs "Add Evidence"** — the button says "Assert Evidence" but the form heading says "Add Supporting Evidence" and the empty-state button says "Add Evidence." Three different phrasings for the same action. | **P2** |
| **"Evidence Methodology" mislabel** — the options (Scientific Study, Expert Testimony, etc.) are evidence *categories*, not methodologies. | **P2** |
| **Client/Db min length mismatch** — Zod requires 20 chars minimum, but the DB requires 50 chars minimum. I could pass client validation with 30 chars and get a server error. | **P1** |
| **No guidance on evidence quality** — what counts as strong vs weak evidence? Is a personal blog acceptable? Must the source be peer-reviewed? No guidance. | **P1** |
| **Source URL is required** — I might not have a URL for personal knowledge or experience. No "I don't have a source" option. | **P2** |

---

## Step 6: Ask Inquiry (Claims tab, Inquiry button)

### What I see
On each claim card (for authenticated users), there's a small amber button: **"Inquiry"** (or "Inquiry (N)" if there are inquiries). No tooltip, no explanation.

### I click "Inquiry"
A dialog opens with the title **"Ask a Question"** — not "Inquiry". The button said "Inquiry", the dialog says "Ask a Question." I wonder if these are different features.

### Dialog contents
- **Type**: 3 selectable buttons — Clarification, Evidence Request, Assumption Check
- **Question**: textarea, placeholder "What would you like to know about this claim?", min 10 chars, max 2000
- **Cancel** and **"Post Inquiry"** button

I type my question and click "Post Inquiry." Success toast: "Inquiry posted."

### After posting
The inquiry appears below the claim in the **InquiryList** section. But if I navigate to a claim with **zero inquiries**, the entire InquiryList section renders **nothing** — no empty state, no heading, no "Be the first to ask" message. The inquiry feature is invisible.

### Issues

| Issue | Severity |
|---|---|
| **"Inquiry" button vs "Ask a Question" dialog** — terminology mismatch. I might think Inquiry and Question are different features. | **P2** (already flagged) |
| **No tooltip on Inquiry button** — first-time users have no idea what clicking it will do. | **P2** (already flagged) |
| **Empty state returns `null`** — when no inquiries exist, the entire section disappears. I won't know inquiries are possible unless I find a claim that already has them. | **P1** (already flagged) |
| **Only visible to authenticated users** — logged-out users can't even see the button. | **P1** |

---

## Step 7: Join Debate (`/debates`)

### How I get there
Desktop: "Debates" link in sidebar. Mobile: **No Debates link** in mobile nav — I must type `/debates` manually.

### What I see
Heading: **"Browse Debates"**. Subtitle: "Active structured debates with proposition and opposition sides." A "New Debate" button. Filter pills: Active / Closing Soon / Resolved. Sort controls: Most Active, Most Evidence, Most Participants, Newest.

Each debate card shows a title (linked to `/discussions/{slug}`), "Join Debate" link, and side summaries.

### I click "Join Debate"
This links to `/discussions/{slug}` which detects it's a debate and redirects to `/debates/{slug}`.

### In the debate room
I see the **DebateSidePicker** — but only if I'm logged in. If I'm logged out, the entire side picker returns `null` — I see nothing. No "Sign in to join" message, no "This debate has ended" text (if resolved). Just silence.

### I log in and return
I see: **"Choose Your Side"** with three buttons: "Support the Motion" (blue), "Challenge the Motion" (rose), "Observe as Neutral" (slate). I click one. There is **no confirmation dialog** — the join happens immediately.

### After joining
A banner appears: "You support this motion" (or challenge). Subtitle: "Create claims and evidence for your side." A "Create Claim" button.

### Issues

| Issue | Severity |
|---|---|
| **Mobile has NO Debates link** — I cannot browse debates on mobile without typing the URL. | **P0** (from readiness audit) |
| **Side picker returns `null` for unauthenticated users** — no "Sign in to join" message. I just see nothing. | **P0** (from QA list) |
| **Side picker returns `null` for resolved debates** — no "This debate has ended" message. | **P0** (from QA list) |
| **No confirmation before joining** — one click and I'm committed. No "Are you sure?" | **P1** (from QA list) |
| **No explanation of debate rules** — no code of conduct, no guidance on what makes a good debate contribution, no etiquette guidelines. | **P1** |
| **"Observe as Neutral" not explained** — I don't know what observation means (read-only? Can I still post?). | **P1** |

---

## Step 8: Switch Side (inside a debate, after joining)

### What I see
After joining a side, the side picker shows my current side and two buttons: **"Leave"** and **"Change Position"**. There's no visual indication of a cooldown — the button looks clickable.

### I click "Change Position"
A dialog opens: **"Change Position"** with description "Evidence changed your mind? Switch sides and explain why." It shows my current side → arrow → target side.

### Textarea
Label: **"WHAT CHANGED YOUR MIND?"** (uppercase). Placeholder: "New evidence, a compelling counter-argument, or a shift in your understanding..." Minimum 50 characters. Live counter: "{N} / 50 min" (green when met).

### I type 50+ characters and click "Switch to Support/Challenge"

**If successful**: The dialog closes silently. **No toast, no animation, no confirmation.** The only change is the side picker re-rendering — which I can't see if it's off-screen.

**If I hit the 24-hour cooldown**: I see **"Failed to switch sides"** — a generic error. No mention of 24 hours, no explanation, no "try again in X hours."

### Issues

| Issue | Severity |
|---|---|
| **No success feedback after switching** — dialog closes silently. I don't know if it worked. | **P0** (from QA list) |
| **Cooldown shows generic "Failed to switch sides"** — not the 24-hour message. I think the system is broken. | **P0** (from QA list) |
| **No cooldown indicator on the Change Position button** — I type 50+ characters before discovering I'm on cooldown. Wasted effort. | **P0** (from QA list) |
| **Neutral observers can't see why "Change Position" is hidden** — it's simply absent. No tooltip. | **P1** (from QA list) |

---

## Step 9: View Reputation (`/u/{username}`)

### What I see
My public profile page. The **Activity Statistics** section shows four cards: Discussions: 0, Debates Joined: 0, Claims: 0, Evidence Added: 0.

Below that is **"Reputation & Contributions"** with several sub-sections:

### UserCredibilityCard
Heading: **"Credibility"**. Big number: **0**. Label: "reputation score". Stats: Claims 0, Evidence 0, Questions 0, Agrees 0.

Wait — the heading says "Credibility" but the label says "reputation score." Are these the same thing?

### ReputationGrowthCard
Heading: **"Reputation Growth"**. Number: **0**. Below: **"What Improves Reputation"** with a list: "+10 per claim", "+15 per evidence", "+5 per question", consensus bonuses, penalties. **"Next Badge to Unlock"**: First Steps (🪶), 0/1, "Created your first claim". **"Suggested Next Action"**: "Assert your first claim to begin building reputation."

### Other sections
- **Trust Badges**: All 10 badges shown as locked (0/10 earned)
- **Badge Progress**: All 10 badges at 0%
- **Reputation Breakdown**: Positive: "+0", Negative: "-0"
- **Contribution Timeline**: "No contributions yet."
- **Reputation History Chart**: Hidden entirely (returns `null`)
- **Expertise Section**: Hidden entirely (returns `null`)

### Issues

| Issue | Severity |
|---|---|
| **"Credibility" heading vs "reputation score" label** — terminological inconsistency. I can't tell if these are the same metric or different. | **P1** (from QA list) |
| **Reputation History Chart returns `null`** — hidden entirely when empty. New users see empty space. | **P2** |
| **Expertise Section returns `null`** — hidden entirely when empty. New users don't know expertise exists. | **P2** |
| **Activity Statistics all zeros** — expected for new user, but no encouraging "start participating" callout (the Suggested Next Action is 2 sections deep). | **P2** |

---

## Step 10: Configure Settings

### How I get there
Desktop: The sidebar has a **"Settings"** section with links: Profile, Account, Privacy, Data & Safety. Mobile: **There is no Settings link** on the mobile nav — I must navigate directly to `/settings/profile` manually.

### Profile Settings
I've already been here (Step 2). Fields: Avatar, Display Name, Username, Bio, Default Identity Preference.

### Account Settings (`/settings/account`)
Two cards: **Email Address** (shows current email, field for new email, "Update Email" button) and **Password** (Current, New, Confirm fields, "Update Password" button). No upfront explanation that email change requires verification — I find this out only after submission.

### Privacy Settings (`/settings/privacy`)
Three toggle switches: Show reputation score, Show expertise areas, Show side-switch history. An info box: "Changes only affect future profile page views."

### Safety Settings (`/settings/safety`)
**Report History**: Empty state says "No Reports" with a flag icon. No explanation of how to submit a report. **Delete Account**: Disabled with note "Account deletion is not yet available."

### Issues

| Issue | Severity |
|---|---|
| **Mobile has NO Settings link** — I cannot access any settings page from mobile navigation. | **P0** (from readiness audit) |
| **No upfront explanation for email verification** — I discover this only after submitting. | **P1** (from QA list) |
| **"Data & Safety" label but no "Data" content** — sidebar says "Data & Safety" but the page only has Report History and Delete Account. | **P2** |
| **Empty report history has no guidance** — "No Reports" but no explanation of how to report content. | **P2** (from QA list) |
| **No unsaved-changes guard** on any settings form. I could navigate away and lose all input. | **P2** (from QA list) |

---

## Cross-Cutting Issues (Across Multiple Steps)

| Issue | Appears in | Severity |
|---|---|---|
| **Mobile nav missing Settings, Debates, Discussions links** | Steps 3, 7, 10 | **P0** |
| **`displayName` saved but never rendered** | Step 2 | **P1** |
| **"Assert" jargon used throughout** | Steps 4, 5 | **P1** |
| **No tooltips on claim/contribution types** | Step 4 | **P1** |
| **No guidance on what makes good evidence** | Step 5 | **P1** |
| **Client/DB validation mismatches** (evidence min 20 vs 50) | Step 5 | **P1** |
| **No success feedback on side switch** | Step 8 | **P0** |
| **Cooldown error swallowed** — shows "Failed to switch sides" | Step 8 | **P0** |
| **No onboarding tour or welcome flow** | Steps 1-10 | **P1** |
| **Inquiry empty state returns `null`** | Step 6 | **P1** |

---

## Summary

| Severity | Count | Key Themes |
|---|---|---|
| **P0** | 7 | Mobile navigation gaps (3), side switch feedback (2), side picker nulls (2) |
| **P1** | 12 | Jargon ("Assert"), missing guidance (evidence, claims), no onboarding, cooldown UX, password confirmation, validation mismatches, inquiry empty state |
| **P2** | 11 | Terminology inconsistencies (Credibility vs Reputation, Inquiry vs Ask a Question, Data & Safety), casing issues, missing not-found pages, unsaved-changes guards |

**Total**: 30 issues across 10 steps.

### Worst Step for a First-Time User

**Step 8 (Switch Side)** — three P0 issues pile up: no success feedback, a swallowed cooldown error that wastes 50+ characters of typing, and no cooldown indicator upfront. This is the most frustrating single step.

### Second Worst

**Step 7 (Join Debate)** — mobile users can't find debates at all (P0), side picker silently vanishes for logged-out/resolved users with no explanation (P0), and there's no confirmation before committing (P1).
