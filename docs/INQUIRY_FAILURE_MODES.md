# Inquiry Failure Modes

**Date**: 2026-06-12
**Status**: Analysis only — no implementation.

---

## 1. Abuse Categories

### 1A. Sealioning (Good-Faith Frame, Bad-Faith Intent)

| Aspect | Detail |
|--------|--------|
| **Pattern** | User adopts Inquiry role, asks endless "just asking questions" on every claim. Each question is individually reasonable; the aggregate is harassment. |
| **Signal** | Inquiry count per debate approaching cap (50). No inquiries ever acknowledged as satisfied. No responses from inquirer to answers. All inquiries are on the same side's claims. |
| **Risk** | High. Hard to distinguish from genuine curiosity. Moderation burden is high. |
| **Mitigation** | Inquiry visibility includes "unresolved ratio" — percentage of inquirer's inquiries that are still open. High unresolved ratio flags potential sea-lioning. Cap of 50 per user per debate. |
| **Residual risk** | Moderate. A determined sea-lion stays under the cap and acknowledges sometimes to appear genuine. |

### 1B. Weaponized Evidence Requests

| Aspect | Detail |
|--------|--------|
| **Pattern** | "Request evidence" used to demand impossible standards. "Provide a peer-reviewed RCT for this historical claim" on a topic where RCTs are impossible. |
| **Signal** | All inquiries from this user are `evidence_request` type. Targets are disproportionately on claims from one side. |
| **Risk** | Medium. Targets feel harassed; debate stalls while users try to satisfy bad-faith demands. |
| **Mitigation** | Responders can mark an evidence request as "impossible to satisfy" (new status). Moderator can close weaponized requests. Reputation penalty for repeatedly impossible demands? (No — moderates, don't penalize.) |
| **Residual risk** | Low with moderation. Without moderation, high. |

### 1C. Inquiry Dumping (Spam)

| Aspect | Detail |
|--------|--------|
| **Pattern** | User posts 50 low-effort inquiries simultaneously. Each is 10 characters (minimum). No intent to engage with responses. |
| **Signal** | Bulk creation timestamp clustering. Short content. No follow-up responses. |
| **Risk** | Medium. Crowds the UI; legitimate inquiries get lost. |
| **Mitigation** | Rate limit: max 5 inquiries per hour. Min character count (10, already designed). Bulk create detection (10+ inquiries in 5 minutes triggers flag). |
| **Residual risk** | Low with rate limiting. Without, high. |

### 1D. Side Bypass (Avoiding Position-Taking)

| Aspect | Detail |
|--------|--------|
| **Pattern** | User who wants to argue against the motion uses "inquiry" to challenge claims without declaring opposition. Avoids the commitment of Challenge role. |
| **Signal** | 100% of inquiries are on the opposition's claims (or 100% on proposition's claims). Never creates claims or evidence. Never acknowledges satisfaction. |
| **Risk** | Medium. Undermines debate integrity — users can argue without accountability. |
| **Mitigation** | Track inquiry-side balance. If >80% of a user's inquiries target one side and the user has no side declared, flag for moderation. Require side declaration after N inquiries (e.g., 20). Ban inquiry role for debates where user has previously taken a side (prevents switching to inquiry to avoid rebuttal). |
| **Residual risk** | Moderate. Determined users can cycle through debates or create alt accounts. |

### 1E. Strategic Concern Trolling

| Aspect | Detail |
|--------|--------|
| **Pattern** | "As a neutral observer, I'm just asking questions, but have you considered that..." followed by a well-known bad-faith argument framed as a question. |
| **Signal** | Inquiry content closely mirrors known debate tactics. User has no history of accepting responses. Inquiries consistently align with one side's talking points. |
| **Risk** | High. Hard to distinguish from legitimate inquiry. The "just asking questions" frame is a defense against moderation. |
| **Mitigation** | Public "inquiry pattern" metric: "This user's inquiries lean [strongly/moderately/neutrally] toward [side]." Not punitive — informational. Responders can link to relevant evidence without engaging the bad faith. |
| **Residual risk** | High. This is the hardest abuse mode to address without chilling legitimate inquiry. |

### 1F. Ghost Inquiries (Abandonment)

| Aspect | Detail |
|--------|--------|
| **Pattern** | User asks question, receives thorough answer, never acknowledges or closes. Leaves inquiry in "open" or "responded" status indefinitely. |
| **Signal** | User is active elsewhere on the platform but does not engage with their own inquiries. Multiple ghost inquiries across debates. |
| **Risk** | Medium. Inflates unresolved inquiry counts; makes debate look less settled than it is. |
| **Mitigation** | Inquirer can close without acknowledging. System auto-closes inquiries after 30 days of no activity (expired). Public "ghost inquiry" count on user's profile (mild social pressure). No reputation penalty — neutral. |
| **Residual risk** | Low — mostly a data quality issue, not abuse. |

### 1G. Filibustering via Unanswerable Questions

| Aspect | Detail |
|--------|--------|
| **Pattern** | "Prove the universe is real" or "Define every term in your claim precisely" — questions that cannot be reasonably answered or would require infinite effort. |
| **Signal** | Inquiry is excessively broad. Targets fundamental assumptions rather than specific claims. |
| **Risk** | Low (rare) but high impact when it occurs. Stalls debate on the targeted claim. |
| **Mitigation** | Responders can mark as "unanswerable" (new status). Moderator can close. Inquirer can be temporarily banned from creating inquiries in that debate if pattern persists. |
| **Residual risk** | Low — moderation handles this. Without active moderation, medium. |

### 1H. Coordinated Inquiry Attacks

| Aspect | Detail |
|--------|--------|
| **Pattern** | Group of users coordinates to all post inquiries on the same claim simultaneously. Creates appearance of widespread concern. |
| **Signal** | Same target, same timestamp cluster. Diverse but templated inquiry text. |
| **Risk** | Medium. Social pressure tactic — "3 people are asking about this, so there must be a problem." |
| **Mitigation** | Cap of 20 inquiries per claim (already designed). Multiple inquiries on the same claim with similar content can be merged into a "crowd asks" indicator. IP-level pattern detection (beyond v1 scope). |
| **Residual risk** | Low with claim cap. Without, high. |

---

## 2. Systemic Failure Modes

### 2A. Inquiry → Debate Suppression

| Aspect | Detail |
|--------|--------|
| **Pattern** | In a debate with few participants, a single inquirer asking many questions can drown out actual claims/evidence. The debate becomes "answering questions" instead of "building arguments." |
| **Risk** | Medium. Especially in small debates (2-4 participants). |
| **Mitigation** | Inquiry tab separate from Claims tab. Claims tab shows inquiries as collapsible sections (default collapsed). Inquiries are not shown in the split-pane claim layout — they're secondary. |
| **Residual risk** | Low with separation. Without it (inquiry mixed into claims view), high. |

### 2B. Inquiry → Consensus Paralysis

| Aspect | Detail |
|--------|--------|
| **Pattern** | Open inquiries prevent or delay conclusion acceptance. "We can't accept the conclusion while questions are unanswered." |
| **Risk** | Medium. If open inquiries == blocked consensus, bad actors can prevent resolution indefinitely. |
| **Mitigation** | Open inquiries do NOT block consensus. They raise a flag ("X inquiries unresolved") but don't prevent acceptance. Consensus acceptance with open inquiries is logged as "accepted_over_inquiry_objection." |
| **Residual risk** | Low — mitigated by design. |

### 2C. Inquiry Quality Collapse

| Aspect | Detail |
|--------|--------|
| **Pattern** | As inquiry volume increases, quality decreases. Users stop reading existing inquiries before posting their own. Duplicate questions proliferate. |
| **Risk** | Medium. Scales with popularity. A high-traffic debate could have 200 inquiries, most of which are duplicates. |
| **Mitigation** | "Similar inquiries" suggestion on create. Merge duplicate inquiries into a "crowd asks" aggregation. Sort: Unanswered first, by vote. |
| **Residual risk** | Moderate — requires algorithmic investment to scale well. v1 may struggle. |

### 2D. Inquiry Silos (No Cross-Pollination)

| Aspect | Detail |
|--------|--------|
| **Pattern** | Support users inquire on Support claims, Challenge users inquire on Challenge claims. No cross-side inquiry. Inquiries reinforce echo chambers. |
| **Risk** | Low for abuse, but high for philosophy violation. The most valuable inquiry is cross-side. |
| **Mitigation** | UI treatment: "Cross-side inquiry" gets visual prominence (e.g., a bridge icon). "Same-side inquiry" is de-emphasized. Leaderboard: "Most cross-side inquiries" as a positive reputation signal. |
| **Residual risk** | Moderate — cultural, not architectural. Cannot design away human tendency to stay in comfort zones. |

---

## 3. Mitigation Strategy Summary

| Priority | Abuse Mode | Primary Mitigation | Secondary Mitigation |
|----------|-----------|-------------------|---------------------|
| P0 | Sealioning | Unresolved ratio visibility | Cap per debate (50) |
| P0 | Side bypass | Require side after N inquiries | Flag 80%+ single-side targeting |
| P1 | Weaponized evidence requests | "Impossible to satisfy" status | Moderation close |
| P1 | Dumping/spam | Rate limit (5/hr) | Bulk create detection |
| P1 | Ghost inquiries | Auto-expire after 30d | Profile ghost count |
| P2 | Coordinated attacks | Cap per claim (20) | Merge duplicates |
| P2 | Filibustering | "Unanswerable" status | Moderation close |
| P2 | Debate suppression | Separate inquiry tab (collapsible) | Default collapsed |
| P3 | Concern trolling | Side-leaning metric (informational) | Linked evidence |
| P3 | Echo chambers | Cross-side prominence | Leaderboard incentive |

---

## 4. Unmitigatable Risks

| Risk | Why | Accept? |
|------|-----|---------|
| **Determined sea-lion** | A sophisticated bad actor can vary inquiry style, acknowledge sometimes, stay under caps. | Yes — moderation is the backstop. No architectural solution exists. |
| **Alt account inquiry attacks** | User creates multiple accounts to bypass per-user caps. | Yes — requires platform-level anti-sockpuppet measures (beyond v1). |
| **AI-generated inquiries** | Automated inquiry posting at scale, content varied enough to evade pattern detection. | Partially mitigatable — rate limiting + captcha for inquiry creation. But AI arms race. |
| **Platform abandonment** | Users who leave the platform leave "open" inquiries forever. | Auto-expire after 30 days mitigates most impact. |

---

## 5. Design Constraints from Failure Modes

Every abuse mode imposes a constraint on the design:

1. **Inquiries must be separable from claims in the UI** — prevents drowning (2A)
2. **Inquiries must not block consensus** — prevents paralysis (2B)
3. **Rate limit + caps** — prevents spam/dumping (1C)
4. **Anyone can respond** — prevents single-point bottleneck weaponization (1B)
5. **Inquirer side must be metadata** — enables cross-side inquiry analysis (2D, 1D)
6. **Auto-expiry** — prevents ghost accumulation (1F, platform abandonment)
7. **"Unanswerable" status** — handles filibustering (1G)
8. **Side declaration after N inquiries** — prevents side bypass (1D)
9. **Duplicate merging** — prevents quality collapse (2C)
10. **Inquiry health metrics are public** — social pressure against abuse (1A, 1E)
