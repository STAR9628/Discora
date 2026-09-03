# Homepage Infrastructure Audit

## Current State

**File**: `src/app/page.tsx` — static Sprint 1 placeholder, no dynamic data.

## Existing Services — Reusable

| Service | File | Reuse? |
|---|---|---|
| `getDiscussions(limit, cursor?, topicId?)` | `discussion-service.ts` | ✅ Guest discussions feed |
| `getDebates(status, sort, cursor?, pageSize?)` | `debate-service.ts` | ✅ Guest debates feed |
| `getTopics()` | `discussion-service.ts` | ✅ Topic badges on cards |
| `getInquiryCountsByRoom(roomId)` | `inquiry-service.ts` | ❌ Room-scoped, not global |
| `getInquiriesForTarget(claimId)` | `inquiry-service.ts` | ❌ Claim-scoped, not global |
| `getSideChangeHistory(roomId, userId)` | `debate-service.ts` | ❌ Room+user scoped |
| `getDebateParticipants(roomId)` | `debate-service.ts` | ❌ Room scoped |

## Existing Hooks — Reusable

| Hook | File | Reuse? |
|---|---|---|
| `useInfiniteDiscussions(topicId?, limit)` | `use-discussions.ts` | ✅ Guest discussions |
| `useDebates(statusFilter?, sort?)` | `use-debates.ts` | ✅ Guest debates |
| `useTopics()` | `use-discussions.ts` | ✅ Topic badges |
| `useCurrentProfile()` | `use-profile.ts` | ✅ Logged-in greeting |

## Existing Types — Reusable

| Type | File | Purpose |
|---|---|---|
| `DiscussionFeedItem` | `discussion-service.ts` | Guest discussion/debate cards |
| `DebateFeedItem` | `debate-service.ts` | Guest debate cards |
| `Debate` | `discussion/types.ts` | Debate metadata |
| `Room` | `discussion/types.ts` | Room metadata |
| `Topic` | `types/domain.ts` | Topic display |
| `InquiryItem` | `debate/types.ts` | Inquiry spotlight |
| `InquiryResponse` | `debate/types.ts` | Inquiry response display |

## What Must Be Built

### New RPCs (database migrations)

| RPC | Purpose | For |
|---|---|---|
| `get_homepage_metrics()` | Aggregate counts: open inquiries, claims with evidence, debates with both sides, satisfied inquiries today | Guest metrics |
| `get_featured_inquiries(limit)` | Open inquiries with room context for spotlight | Guest spotlight |
| `get_my_open_inquiries()` | User's unresolved inquiries with room+claim context | Logged-in |
| `get_my_inquiry_responses()` | User's inquiries with pending responses | Logged-in |
| `get_my_debates_attention()` | User's debates sorted by opposing-side activity | Logged-in |
| `get_my_topic_evidence(days)` | New evidence in topics user participated in | Logged-in |
| `get_my_understanding_evolved()` | Claims user voted on with significant consensus shifts + linked evidence | Logged-in |

### New Service Functions

| Function | File | Purpose |
|---|---|---|
| `getHomepageMetrics()` | `homepage-service.ts` | Wrap `get_homepage_metrics` RPC |
| `getFeaturedInquiries(limit)` | `homepage-service.ts` | Wrap `get_featured_inquiries` RPC |
| `getMyOpenInquiries()` | `homepage-personal-service.ts` | Wrap `get_my_open_inquiries` RPC |
| `getMyInquiryResponses()` | `homepage-personal-service.ts` | Wrap `get_my_inquiry_responses` RPC |
| `getMyDebatesAttention()` | `homepage-personal-service.ts` | Wrap `get_my_debates_attention` RPC |
| `getMyTopicEvidence(days)` | `homepage-personal-service.ts` | Wrap `get_my_topic_evidence` RPC |
| `getMyUnderstandingEvolved()` | `homepage-personal-service.ts` | Wrap `get_my_understanding_evolved` RPC |

### New Hooks

| Hook | File | Purpose |
|---|---|---|
| `useHomepageMetrics()` | `use-homepage.ts` | Guest metrics |
| `useFeaturedInquiries(limit)` | `use-homepage.ts` | Guest spotlight |
| `useMyOpenInquiries()` | `use-homepage-personal.ts` | Logged-in |
| `useMyInquiryResponses()` | `use-homepage-personal.ts` | Logged-in |
| `useMyDebatesAttention()` | `use-homepage-personal.ts` | Logged-in |
| `useMyTopicEvidence(days)` | `use-homepage-personal.ts` | Logged-in |
| `useMyUnderstandingEvolved()` | `use-homepage-personal.ts` | Logged-in |

### New Components

| Component | Section | Auth |
|---|---|---|
| `hero-section` | Guest hero | No |
| `guest-homepage` | Guest orchestrator | No |
| `active-discussions` | Guest discussions list | No |
| `active-debates` | Guest debates list | No |
| `discussion-card` | Guest discussion item | No |
| `debate-card` | Guest debate item | No |
| `inquiry-spotlight` | Guest inquiry | Both |
| `understanding-metrics` | Guest metrics | No |
| `metric-card` | Reusable stat | Both |
| `logged-in-homepage` | Logged-in orchestrator | Yes |
| `my-open-inquiries` | Logged-in inquiries | Yes |
| `my-inquiry-responses` | Logged-in responses | Yes |
| `debates-needing-attention` | Logged-in debates | Yes |
| `new-evidence-topics` | Logged-in evidence | Yes |
| `understanding-evolved` | Logged-in consensus | Yes |

## Auth Pattern

- Guest: `createServerSupabaseClient()` → `getUser()` → if no user → render guest
- Logged-in: same check → if user → render logged-in
- Both paths in `src/app/page.tsx` server component
- All RPCs use `security definer` to bypass RLS for aggregate reads
