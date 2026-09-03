# Inquiry Reputation Analysis

**Question**: Should inquiry creation earn reputation?

---

## The Options

| Action | Option A | Option B | Option C |
|--------|----------|----------|----------|
| INQUIRY_CREATED | +2 | 0 | 0 |
| INQUIRY_RESPONDED | +5 | +5 | +3 |
| INQUIRY_SATISFIED | — | — | +2 |
| **Total (completed loop)** | +7 | +5 | +5 (+3 responder, +2 inquirer) |

---

## Evaluation

### 1. Spam Resistance

| Option | Rating | Reasoning |
|--------|--------|-----------|
| **A** | Weak | +2 per creation is enough to incentivize volume. 50 inquiries = 100 points — equivalent to 20 evidence submissions. Rate limits (5/hr, 50/debate) cap the damage but don't remove the motive. |
| **B** | Strong | Zero creation reward removes the volume incentive entirely. The only way to earn is to respond — and you can't respond to your own inquiry (it's attributed). |
| **C** | Strong | Same as B — zero for creation. The +2 satisfaction bonus is delayed and requires the inquirer to complete the loop, which is higher effort than just creating. |

**Winner**: B and C tie. A significantly underperforms.

### 2. Adoption

| Option | Rating | Reasoning |
|--------|--------|-----------|
| **A** | High | Immediate reward for trying the feature. "I get +2 for asking a question?" lowers the activation barrier. Good for getting the first cohort to engage. |
| **B** | Low | "Why would I ask if I get nothing?" — typical user psychology. Only intrinsically motivated users (those who actually want answers) will create inquiries. This may be a minority. |
| **C** | Medium | No immediate reward, but a delayed reward for completion. Users who discover the satisfaction bonus may create more inquiries to earn it. Adoption is slower but potentially higher quality. |

**Winner**: A. But high adoption through extrinsic reward is exactly the wrong kind of adoption.

### 3. Truth-Seeking Alignment

| Option | Rating | Reasoning |
|--------|--------|-----------|
| **A** | Poor | Rewards asking, not learning. The question is the transaction, not the answer. This contradicts "understanding over engagement" — it optimizes for inquiry volume, not inquiry quality. |
| **B** | Good | Rewards answering, which is the harder and more valuable action. The question is its own reward (you get the answer you wanted). This aligns with intrinsic motivation — people ask because they want to know, not because they want points. |
| **C** | Best | Rewards the complete knowledge loop. The inquirer earns only when they engage with the response and confirm it was valuable. The responder earns less per response (+3 vs +5) but the total loop value (+5) is preserved. This incentivizes both sides to participate in the full cycle. |

**Winner**: C. B is close behind. A is philosophically misaligned.

### 4. Gaming Potential

| Option | Rating | Reasoning |
|--------|--------|-----------|
| **A** | High | Self-inquiry (create + respond with alt account) yields +7 per loop. Even with rate limits, 5/hr × +7 = +35/hr. A dedicated gamer can accumulate meaningful rep. |
| **B** | Low | Self-inquiry yields +5 per response. Requires an alt account (since you can't respond as yourself — the RPC allows any user to respond, but the reputation event would be attributed to the responder ID). Friction is higher. |
| **C** | Lowest | Self-inquiry yields +3 (respond) + potential +2 (satisfy). But self-satisfaction is trivially detectable (same user_id on both sides). Requires alt account for response and another for satisfaction. At this point the friction exceeds the reward. |

**Winner**: C. The satisfaction gate adds a detection surface that makes gaming impractical.

### 5. Long-Term Culture

| Option | Rating | Reasoning |
|--------|--------|-----------|
| **A** | **Harmful** | Creates a quantity culture. "I have 500 inquiries" becomes a status signal. The platform fills with low-effort questions. Responders become overwhelmed. Inquiry quality collapses. The feature dies of its own success. |
| **B** | Neutral-Positive | Creates a service culture. Responders are rewarded for being helpful. Askers are intrinsically motivated. But without any reward for the asker, the feature may remain niche — used only by the genuinely curious. |
| **C** | **Positive** | Creates a completion culture. The desired behavior is: ask → get answer → confirm it was useful. Incomplete loops ("ghost inquiries") earn nothing for anyone. This naturally selects for productive inquiry and penalizes both spam and abandonment. |

**Winner**: C decisively. B is acceptable. A is dangerous.

---

## Overall Scores

| Dimension | A | B | C |
|-----------|---|---|---|
| Spam resistance | 2 | **5** | **5** |
| Adoption | **5** | 2 | 3 |
| Truth-seeking alignment | 1 | 4 | **5** |
| Gaming potential | 2 | 4 | **5** |
| Long-term culture | 1 | 3 | **5** |
| **Total** | **11** | **18** | **23** |

---

## Recommendation

### Option C: INQUIRY_CREATED +0, INQUIRY_RESPONDED +3, INQUIRY_SATISFIED +2

**Why C over B**:

Both B and C solve spam and gaming. The difference is cultural.

Option B says: "Answers are valuable. Questions speak for themselves." This is clean, simple, and philosophically pure. But it creates no incentive for the inquirer to complete the loop — to acknowledge that their question was answered, to confirm understanding, to close the cycle.

Option C says: "A complete inquiry loop — question, answer, acknowledgment — is valuable." The +2 satisfaction bonus is small enough to not incentivize gaming but large enough to motivate:

- **Inquirers to ask good questions** (that can be satisfied)
- **Inquirers to engage with responses** (not ghost after asking)
- **Responders to provide thorough answers** (that lead to satisfaction)

The total loop (+5) equals one evidence submission, split between two participants. This is proportional — a productive inquiry cycle is roughly as valuable to the debate as a piece of evidence.

**The risk with C**: Complexity. An additional event type, an additional trigger, an additional UI state. The inquirer must explicitly click "Satisfied" — if they forget, the responder earned +3 but the loop is incomplete. This is acceptable: the responder still gets their points, and the debate still has the inquiry record. The satisfaction is a bonus for completion, not a penalty for incompletion.

**The risk with B**: Ghost inquiries. Without any incentive to close the loop, inquirers abandon their questions after receiving answers. The inquiry list fills with "responded but never acknowledged" items. Over time, this erodes the signal value of the inquiry system. Option C's +2 satisfies both the inquirer's desire for completion and the platform's need for resolved states.

### Implementation Note

If Option C is chosen, INQUIRY_SATISFIED must be implemented as a creator-only RPC (`satisfy_inquiry`) that fires the reputation event on satisfaction. The respond RPC should NOT auto-satisfy — satisfaction must be an explicit, intentional act by the inquirer.

### Final Answer

**Option C.** No reward for asking. Modest reward (+3) for answering. Small completion bonus (+2) for acknowledging the answer was useful. Total loop: +5, equivalent to one evidence submission. This is the most spam-resistant, gaming-resistant, and culturally aligned option.
