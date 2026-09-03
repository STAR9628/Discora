# Remediation Plan + Beta Readiness Score

---

## Beta Readiness Score: 4.7 / 10

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| **Debate System** | 7/10 | Core flow works (39/39 validation pass). Sorting, pagination, status sync implemented. Lacks reputation feedback on resolution. |
| **Reputation System** | 2/10 | Entirely client-side. No server-side triggers. Leaderboard incomplete. Evidence vote impact missing. Stale batch reads. |
| **Profile System** | 5/10 | Basic stats correct. 11 missing debate metrics. Badge progress not persisted. Timeline missing debate entries. |
| **Moderation Readiness** | 4/10 | Infrastructure exists (flags table, queue view, role hierarchy). Not end-to-end audited. Flag → action → appeal flow untested. |
| **Scalability** | 3/10 | Client fetches ALL contributions per profile visit. No server-side caching. No pagination on contribution queries. No DB-level reputation aggregation. |
| **UX Quality** | 7/10 | Clean UI, loading states, error handling, responsive. Missing debate-specific stats on profiles. No reputation feedback after actions. |

---

## Remediation Plan (Ranked by Impact)

### Phase 1 — CRITICAL (Blocking Beta)

| # | Issue | Files | Estimate |
|---|-------|-------|----------|
| 1 | **Server-side reputation RPC**: Create `recalculate_reputation(user_id)` database function matching `computeReputation` logic | New migration + `rpc/reputation_calculation.sql` | 4-6 hours |
| 2 | **Database triggers**: AFTER INSERT/UPDATE/DELETE on claims, evidence, questions, claim_votes, evidence_votes, debate_participants, debates → call reputation RPC | New migration | 3-4 hours |
| 3 | **Leaderboard debate data**: Add debate participation/win counts to `getLeaderboardData` and `leaderboard-page-client` compute | `reputation-service.ts`, `leaderboard-page-client.tsx` | 2 hours |
| 4 | **Action-time feedback**: Show toast/notification when reputation changes after user action | All mutation hooks | 3-4 hours |

**Total Phase 1**: 12-16 hours

### Phase 2 — HIGH (Pre-Beta Quality Bar)

| # | Issue | Files | Estimate |
|---|-------|-------|----------|
| 5 | **Profile debate stats**: Replace "Debates" card with "Debates Participated"; add Wins/Losses stat cards | `page.tsx` profile page | 2 hours |
| 6 | **Fix `discussionCount` → `debateCount` bug**: Line 47 condition uses wrong field | `reputation-utils.ts:47` | 15 minutes |
| 7 | **Add evidence vote reputation factor**: Include evidence agree/disagree in `computeReputation` | `reputation-utils.ts` | 1 hour |
| 8 | **Fix profile timeline to include debate actions**: Add debate join/create/resolve entries | `useReputation.ts` | 2 hours |

**Total Phase 2**: 5-6 hours

### Phase 3 — MEDIUM (Post-Beta Quality)

| # | Issue | Files | Estimate |
|---|-------|-------|----------|
| 9 | **Create `user_badges` table + persistence**: Persist earned badges with earnedAt | New migration + `reputation-service.ts` | 3-4 hours |
| 10 | **Profile debate breakdown section**: Show active/resolved debate counts, side-specific wins | `page.tsx` + new component | 3 hours |
| 11 | **Remove dead `refinementReceivedBonus` config or implement it** | `reputation-utils.ts` | 30 minutes |
| 12 | **Expand expertise mapping**: Cover all evidence types, add debate motion-based areas | `reputation-utils.ts` | 2 hours |

**Total Phase 3**: 8-10 hours

### Phase 4 — LOW (Nice-to-Have)

| # | Issue | Files | Estimate |
|---|-------|-------|----------|
| 13 | **Contribution query pagination**: Paginate `getUserContributions` for large users | `reputation-service.ts` | 2 hours |
| 14 | **Server-side caching layer**: Cache reputation scores with TTL | New cache service | 4 hours |

**Total Phase 4**: 6 hours

---

## Total Remediation Estimate: 31-38 hours

## Go/No-Go Criteria for Beta

### BLOCKERS (Must fix)
- [ ] Server-side reputation RPC + triggers
- [ ] Leaderboard includes debate data
- [ ] Profile shows honest debate participation stats
- [ ] `discussionCount` → `debateCount` bug fixed

### HIGH PRIORITY (Should fix)
- [ ] Debate win/loss record visible on profiles
- [ ] Evidence votes factored into reputation
- [ ] Timeline includes debate actions
- [ ] Action-time reputation feedback

### ACCEPTABLE DEFERRALS
- Badge persistence (usable without it)
- Expertise mapping expansion (informational only)
- Contribution query pagination (small user base at beta)
- Server-side caching (acceptable at beta scale)
