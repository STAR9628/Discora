# Phase 4A: Discussion Understanding Layer — UX & Behavioral Redesign

> **Status:** DESIGN SPECIFICATION ONLY — NO CODE CHANGES  
> **Date:** September 4, 2026  
> **Subject:** Deterministic Overview Synthesis Architecture.  
> **Goal:** Close the Narrative Synthesis Gap on Discussion Overview routes without AI generation, database modifications, or gamification mechanics.

---

## 1. Product Goal

Discora's foundational promise is:  
**Questions → Claims → Evidence → Understanding**

Currently, the user interface delivers *Questions*, *Claims*, and *Evidence*, but abandons the user before reaching *Understanding*. Visitors must perform mental synthesis by manually inspecting claim cards, voting percentages, and evidence drawers.

**The Redesign Goal:**  
Introduce a clean, deterministic, card-based section on the Discussion Overview called:  
**"State of Understanding"**  
(Subtitle: *"Current empirical balance, contested areas, and unresolved lines of inquiry"*).

This section answers three immediate questions for any reader within 10 seconds:
1. **What has been substantiated by empirical evidence?**
2. **Where are the active tensions and disagreements?**
3. **What crucial questions remain unresolved?**

---

## 2. Proposed Information Hierarchy on Discussion Overview

The Discussion Overview route (`/discussions/[slug]`) will be organized into an intentional cognitive sequence:

```text
┌────────────────────────────────────────────────────────┐
│ 1. Room Header (Title, Topic Badge, Metric Badges)     │
├────────────────────────────────────────────────────────┤
│ 2. Opening Premise (Central Framing & Problem Context) │
├────────────────────────────────────────────────────────┤
│ 3. [NEW] State of Understanding (Deterministic Summary)│
│    • Key Empirical Findings (Substantiated Claims)     │
│    • Active Disagreements (Contested & Mixed Claims)   │
│    • Unresolved Front (Open Questions & Inquiries)     │
├────────────────────────────────────────────────────────┤
│ 4. Room Section Navigation (Sticky Anchor Navigation)  │
├────────────────────────────────────────────────────────┤
│ 5. Section 1: Discussion Questions                     │
├────────────────────────────────────────────────────────┤
│ 6. Section 2: Core Claims Registry                     │
├────────────────────────────────────────────────────────┤
│ 7. Section 3: Evidence Bank                            │
├────────────────────────────────────────────────────────┤
│ 8. Section 4: General Contributions (Write-First)      │
└────────────────────────────────────────────────────────┘
```

**Placement Rationale:**  
Placing the *State of Understanding* directly beneath the *Opening Premise* allows a reader to absorb the problem context, immediately grasp what has been established to date, and then dive into specific claims, evidence, or questions below.

---

## 3. Epistemic Category Definitions

The State of Understanding is organized into three distinct, non-overlapping epistemic columns/cards:

### Category 1: "Substantiated Claims" (Empirically Grounded)
* **Definition:** Active claims that have at least 1 verified supporting evidence citation and 0 contradicting citations.
* **Badging:** Emerald border / pill (`[Substantiated: N Sources]`).
* **Display Elements:**
  * Claim content statement.
  * Number of citations and source domain badges (e.g. `nature.com`, `ieee.org`).
  * Stance agreement percentage (with vote count suffix, e.g. `82% agreement (14 votes)`).
  * Direct deep-link to the claim card.

### Category 2: "Contested & Mixed" (Active Disagreement)
* **Definition:**
  * Sub-case A: Claims with both supporting and contradicting evidence citations (*Empirical Division*).
  * Sub-case B: Claims with significant community disagreement (30% to 70% agreement, with >= 5 votes) (*Community Division*).
  * Sub-case C: Claims with incoming contradicts graph relations from other claims.
* **Badging:** Amber/Rose border / pill (`[Contested: Mixed Evidence]` or `[Disputed Community View]`).
* **Display Elements:**
  * Claim statement.
  * Side-by-side indicator: `N Supporting vs. M Contradicting Citations`.
  * Highlight of the primary counter-argument or challenging evidence.
  * Direct deep-link to inspect the dispute.

### Category 3: "Unresolved Front" (Epistemic Debt)
* **Definition:**
  * Sub-case A: Discussion Questions that have **0 answering claims** in the registry.
  * Sub-case B: Claims that have **0 evidence citations** attached (*Unsubstantiated Assertions*).
  * Sub-case C: Claims with active **Open Structured Inquiries** awaiting responses.
* **Badging:** Slate/Sky border / pill (`[Unresolved: Needs Evidence]` or `[Open Question]`).
* **Display Elements:**
  * Unanswered question prompt or claim requiring sources.
  * Call to action: *"Cite Evidence"* or *"Answer Question"*.

---

## 4. Epistemically Honest Language Standards

The UI copy must rigorously avoid social media, judicial, or debate tournament tropes:

| Avoid (Disallowed Copy) | Use Instead (Approved Epistemic Copy) | Reason |
|---|---|---|
| *"Proven True"*, *"Verified Fact"* | *"Substantiated by Current Evidence"* | Preserves scientific fallibilism. |
| *"Winning Argument"*, *"Debate Winner"* | *"Predominant Evidence Alignment"* | Truth is not a competitive sport. |
| *"Consensus"* (on <5 votes) | *"Preliminary Stance (N votes)"* | Prevents small-sample distortion. |
| *"Debunked"*, *"Defeated"* | *"Contradicted by Cited Sources"* | Focuses on empirical citations, not personal attack. |
| *"Popular Opinion"* | *"Community Stance Distribution"* | Discora values evidence over popularity. |
| *"Settled Topic"* | *"Substantiated without Active Contradiction"* | Acknowledges ongoing openness to new evidence. |

---

## 5. Progressive Disclosure Architecture

To prevent the Overview from becoming an overwhelming dashboard wall, the State of Understanding operates on a 2-tier progressive disclosure model:

### Tier 1: Executive Overview Card (Always Visible)
* **Metric Bar:**
  * `Evidence Coverage`: e.g. `75% of claims cited`.
  * `Consensus Health`: e.g. `2 Substantiated • 1 Contested • 1 Unresolved`.
  * `Open Inquiries`: e.g. `1 Active Challenge`.
* **Top Findings:**
  * Top 2 Substantiated Claims (with citation snippets).
  * Top 1 Active Dispute (with counter-point snippet).
  * Top 1 Unanswered Framing Question.

### Tier 2: Expandable Deep Synthesis (Click to Expand / Modal)
* Clicking *"View Full Synthesis Breakdown"* expands the drawer:
  * Full listing of all categorized claims.
  * Evidence citation bibliography grouped by claim.
  * Comprehensive list of open framing questions with "Assert Answer" CTA.
  * Active claim inquiries with direct link to inquiry thread.

---

## 6. Responsive UX & Viewport Layouts

### Desktop (1440px & 1024px)
* Rendered as a structured 3-column grid:
  * Column 1: **Substantiated by Evidence** (Emerald theme).
  * Column 2: **Actively Contested** (Amber/Rose theme).
  * Column 3: **Unresolved Front** (Sky/Slate theme).
* High information density with clean line clamps (max 2 lines per claim), crisp typography, and inline source badges.

### Tablet (768px)
* Rendered as a 2-column or stacked layout:
  * Top Row: Summary Metric Bar (`Evidence Coverage`, `Claims Cited`, `Open Front`).
  * Bottom Row: 2-column cards (Left: Substantiated & Contested; Right: Unresolved Questions & Inquiries).

### Mobile (390px & 375px)
* Vertical stacked accordion or segmented carousel:
  * Executive Metric Bar at top.
  * Segmented control pills: `[Substantiated (2)]`, `[Contested (1)]`, `[Unresolved (2)]`.
  * Single active card visible at a time with smooth swipe or click-to-switch.
  * Zero horizontal scroll overflow on the outer document container.
  * Generous touch targets (min 44px) for deep-linking into specific claims or questions.

---

## 7. The AHA → Understanding Flow

This redesign directly strengthens the confirmed **Evidence Bank AHA moment**:

1. **Homepage:** User reads the mission: *"Evidence over popularity"*. Clicks *"Start Reading"*.
2. **Discussion Overview:** User lands on `/discussions/[slug]`. Reads the Opening Premise.
3. **State of Understanding:** Immediately sees:
   * *Claim 1 is supported by 2 studies (ieee.org, nature.com).*
   * *Claim 2 is contradicted by 1 empirical report.*
   * *Question 2 is completely open.*
4. **The AHA Connection:** The user realizes:  
   *"Discora isn't asking me to guess who is right in an endless comment war. It shows me the exact empirical status of every assertion."*
5. **Investigation:** User clicks on the *Contested* card, which scrolls smoothly down to the Evidence Bank filtered to *Contradicts*, allowing direct source auditing.

---

## 8. Invariance Rules: What Must NOT Change

1. **Do NOT add AI or LLM generation:** All synthesis must be computed deterministically from active relational database records.
2. **Do NOT modify database schema or RPCs:** The existing `claims`, `evidence`, `questions`, and `claim_relations` datasets fully support this feature.
3. **Do NOT alter write-first contributions:** The contribution textarea remains unconstrained and freeform.
4. **Do NOT delete or hide raw sections:** `#questions`, `#claims`, `#evidence`, and `#contributions` remain fully accessible below the synthesis card.
5. **Do NOT introduce gamification:** No badges, karma, popularity ribbons, or winner announcements.
