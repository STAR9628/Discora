# Discora — Premise / Context Content Quality Audit

**Status:** AUDIT + SAMPLES ONLY. No seed data modified. Mass rewrite BLOCKED pending Product Owner approval.
**Source of truth:** `scripts/data/discussions-data.cjs` (D01–D39), `scripts/data/debates-data.cjs` (B01–B50), loaded by `scripts/seed-beta-content.cjs` (idempotent upsert by title → `rooms.description`, `discussions.opening_statement`, `debates.opening_statement`).
**Samples audited:** D39 "When Feminism Becomes a Label", D38 "Does #MeToo Still Work?", D30 "When the Crowd Becomes the Court".

---

## 1. Recurring content-quality problems (VERIFIED across all 3 samples)

1. **Fake authority voice.** "Linguistic and psychological studies on framing demonstrate…", "Political scientists observe…", "Survey research shows…", "Historical feminist scholarship distinguishes…", "Collective human history demonstrates…". No citations, no data, no dates. Reads as briefing-document filler and violates the no-fake-authority rule.
2. **Template repetition.** Every CONTEXT opens with an interchangeable establishing shot ("In digital commentary and social media debates…", "In the digital public square…", "The viral resurgence… catalyzed a global reckoning…"). Rooms are distinguishable only by topic nouns.
3. **Exam-style discussion questions.** "Do ideological and moral labels in public discourse clarify fundamental philosophical disagreements, or do they primarily obstruct open, evidence-based inquiry?" Nobody talks like this. Questions should sound like something a person would actually ask.
4. **"What We Know" contains interpretation, not facts.** Examples: "Controversies arose over public allegations that circumvented formal investigations…" (commentary, not a fact); "Social platforms quantify popularity through metrics… that can create an illusion of consensus" (an argument wearing a fact costume — belongs in Commonly Heard Logic, hedged as a claim).
5. **Assigned-debate symmetry.** Argument A/B pairs are grammatically parallel but read as positions handed to two teams ("dismantled impunity", "weaponizing labels", "democratic moral clarity") rather than reasoning patterns real people recognizably use.
6. **Generic institutional-design filler in "What Remains Unclear".** "How institutions can design accessible, impartial investigation systems…" / "How institutions and platforms can maintain objective evidential standards…" — could be pasted into any room. Genuine room-specific uncertainty is missing.

**Counter-evidence (what already works):** the `description` fields are human and specific (e.g. D39: "Do these labels help people understand an argument, or do they shut down discussion before the actual claim is examined?"). The target voice already exists in the dataset — the opening statements need to be brought up to the descriptions' level, not the other way round.

## 2. Proposed writing rules

1. CONTEXT ≤ 3 sentences: one concrete scene or event, one sentence on why it is contested now. No "in the digital age" openers.
2. WHAT WE KNOW = checkable facts only (events, laws, numbers with rough dates). If it needs "studies show", either name the study or cut it. Max 3 bullets.
3. COMMONLY HEARD LOGIC = reasoning you would recognize from an actual person, quoted in plain words. No position should contain language its own holders would reject as a caricature.
4. WHAT REMAINS UNCLEAR = one genuine question *this room* cannot settle, not institutional homework.
5. DISCUSSION QUESTION = one sentence a curious person would ask out loud. Must pass the read-aloud test.
6. Never: "research shows", "scholars observe", "history demonstrates", "complex relationship", "fundamental philosophical disagreements", telling participants what to conclude.

## 3. Sample rewrites (require Product Owner review)

### Sample 1 — D39 "When Feminism Becomes a Label"

BEFORE (discussion question): "Do ideological and moral labels in public discourse clarify fundamental philosophical disagreements, or do they primarily obstruct open, evidence-based inquiry?"
AFTER: "What changes when a label meant to describe a pattern starts becoming the main thing people argue about?"

BEFORE (context opener): "In digital commentary and social media debates on relationships, culture, and policy, participants frequently deploy identity labels… as opening arguments or shorthand dismissals."
AFTER: "Somewhere along the way, words like feminist or misogynist stopped being descriptions people unpacked and started being verdicts people handed out — often in the first reply, before any claim was examined."

BEFORE (fake-authority bullet): "Linguistic and psychological studies on framing demonstrate that applying morally charged labels triggers cognitive heuristics…"
AFTER: "Polls in several countries keep finding the same split: most people agree with specific equality policies, while far fewer call themselves feminists. The label and the positions it supposedly names have come apart."

RATIONALE: replaces uncited authority with one checkable, room-central observation; question rewritten to human voice; verdict-framing names the actual phenomenon the room is about.

### Sample 2 — D38 "Does #MeToo Still Work?"

BEFORE (discussion question): "What lasting cultural and institutional transformations did the #MeToo movement achieve, and what fundamental challenges regarding due process and justice remain unresolved?"
AFTER: " #MeToo changed what people felt they could say out loud — but did it change what happens after they say it?"

BEFORE (context opener): "The viral resurgence of the #MeToo movement in 2017 catalyzed a global reckoning over workplace sexual misconduct…"
AFTER: "In 2017, a hashtag did what years of HR complaints often hadn't: it got powerful men fired within days. Years later, the firings are history — the question is what systems, if any, replaced the old silence."

BEFORE (interpretation-as-fact): "Controversies arose over public allegations that circumvented formal investigations, the permanence of digital reputational damage…"
AFTER (moved to Commonly Heard Logic, as a claim): "Some people argue the movement's real tool — public accusation — was also its flaw: fast, but with no way to correct a mistake."

RATIONALE: opens on a concrete, checkable memory instead of "global reckoning"; moves evaluative claims out of WHAT WE KNOW; question asks about the gap between voice and outcome, which is the room's actual tension.

### Sample 3 — D30 "When the Crowd Becomes the Court"

BEFORE (discussion question): "How can society protect the rigorous, impartial evaluation of evidence when public opinion has already rendered an overwhelming collective verdict?"
AFTER: "If everyone already agrees someone did it, is there any room left to ask whether they did?"

BEFORE (context opener): "In the digital public square, viral consensus against an individual can develop with such speed and intensity that any attempt to analyze primary evidence… is dismissed as defending the indefensible."
AFTER: "You've seen the pattern: a clip goes viral, the verdict trends within hours, and anyone asking 'wait, what actually happened?' gets treated as taking the accused's side."

BEFORE (fake-authority bullet): "Collective human history demonstrates numerous episodes of mass moral panics, witch trials, and wrongful convictions…"
AFTER: "Courts have rules for exactly this problem — sequestered juries, rules of evidence, presumption of innocence — built on the assumption that crowds get things wrong. The feed has none of those rules."

RATIONALE: second-person concrete pattern instead of "digital public square"; the jury-rules bullet keeps the substance (safeguards exist for a reason) but states it as institutional fact, not "history demonstrates".

## 4. Mass-rewrite gate

DO NOT apply these rules to all 89 rooms yet. Required before proceeding:
1. Product Owner approves/rejects the 3 samples and the 6 writing rules above.
2. Decide scope: discussions only, or debates too (debate opening statements were not sampled in this audit).
3. Decide mechanism: edit `scripts/data/*.cjs` + re-seed local via `seed-beta-content.cjs` (recommended — preserves the upsert-by-title pipeline; never hand-edit DB rows).
