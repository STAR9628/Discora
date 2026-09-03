# Homepage Interaction Specification

## Guest Cards

### 1. Discussion Card (Active Discussions)
- **Purpose**: Show recent open-ended discussion with key stats
- **Data source**: `getDiscussions(3)` → `DiscussionFeedItem[]` filtered to `room.roomType === "discussion"`
- **Display**: Title, topic badge, claim count, evidence count, last activity relative time
- **Empty state**: "No active discussions yet. Start the first discussion."
- **Loading state**: Skeleton card (3 gray rectangles with shimmer)
- **Error state**: "Unable to load discussions" with retry button
- **Click behavior**: Navigate to `/discussions/[room.slug]`

### 2. Debate Card (Active Debates)
- **Purpose**: Show structured debate with side breakdown
- **Data source**: `getDiscussions(3)` → `DiscussionFeedItem[]` filtered to `room.roomType === "debate"`
- **Display**: Title, topic badge, proposition vs opposition labels, participant count, evidence count, inquiry count, status
- **Empty state**: "No active debates yet. Start the first debate."
- **Loading state**: Skeleton card
- **Error state**: "Unable to load debates" with retry
- **Click behavior**: Navigate to `/debates/[room.slug]`

### 3. Inquiry Spotlight
- **Purpose**: Showcase a real open inquiry to demonstrate the inquiry system
- **Data source**: `getFeaturedInquiries(1)` → picks responded-but-not-satisfied inquiry from any room
- **Display**: Inquiry text, target claim excerpt, room title, response count, "Join the discussion" link
- **Empty state**: "No open inquiries yet. Inquiries help build understanding." (hidden if no data across platform)
- **Loading state**: Skeleton text block
- **Error state**: Hidden (silent fail — non-critical section)
- **Click behavior**: Navigate to room, scroll to target claim, highlight inquiry thread

### 4. Understanding Metrics
- **Purpose**: Show aggregate platform health metrics tied to understanding
- **Data source**: `getHomepageMetrics()` → `{ openInquiries, claimsWithEvidence, debatesBothSides, satisfiedToday }`
- **Display**: 4 stat cards in 2×2 grid
- **Empty state**: "0" is valid (shows 0)
- **Loading state**: 4 skeleton stat cards
- **Error state**: "Metrics unavailable" with retry
- **Click behavior**: None (informational)

## Logged-In Cards

### 5. My Open Inquiry Card
- **Purpose**: Surface unresolved inquiries I created
- **Data source**: `getMyOpenInquiries()` → my inquiries where `status NOT IN ('satisfied', 'closed')`
- **Display**: Inquiry question text, room title, target claim excerpt, how long ago
- **Empty state**: Section not rendered
- **Loading state**: Skeleton list
- **Error state**: "Unable to load inquiries" with retry
- **Click behavior**: Navigate to room, scroll to inquiry thread

### 6. Inquiry Response Card
- **Purpose**: Show responses to my inquiries awaiting review
- **Data source**: `getMyInquiryResponses()` → my inquiries where `status = 'responded'`, with latest response
- **Display**: Inquiry text, responder username, response excerpt, "Mark Satisfied" / "Still Unsatisfied" inline actions
- **Empty state**: Section not rendered
- **Loading state**: Skeleton list
- **Error state**: Hidden (non-critical)
- **Click behavior**: Click card → navigate to room + scroll to inquiry. Click "Mark Satisfied" → call `satisfyInquiry` RPC inline, show success toast. Click "Still Unsatisfied" → open reply form inline.

### 7. Debate Attention Card
- **Purpose**: Alert when opposing side has been active in a debate I'm in
- **Data source**: `getMyDebatesAttention()` → my active debates where opposing side has newer claims than my side
- **Display**: Debate title, "Opposition posted N new claims since your last claim", proposition vs opposition claim counts, "View new activity" link
- **Empty state**: Section not rendered
- **Loading state**: Skeleton list
- **Error state**: "Unable to load debate updates" with retry
- **Click behavior**: Navigate to debate, scroll to newest opposing-side claim

### 8. New Evidence Card
- **Purpose**: Surface new evidence in topics I've participated in
- **Data source**: `getMyTopicEvidence(7)` → evidence created in last 7 days in rooms on topics I've engaged with, excluding rooms I'm in
- **Display**: Grouped by topic. Topic name, evidence count, room title for each
- **Empty state**: Section not rendered
- **Loading state**: Skeleton list
- **Error state**: Hidden
- **Click behavior**: Click room link → navigate to room, highlight evidence

### 9. Understanding Evolved Card
- **Purpose**: Show evidence-driven changes in consensus on claims I voted on
- **Data source**: `getMyUnderstandingEvolved()` → claims I voted on where consensus ratio changed significantly, with linked evidence that caused the change
- **Display**: Claim text, my vote, current consensus %, "What changed" explanation with linked evidence title
- **Empty state**: Section not rendered
- **Loading state**: Skeleton list
- **Error state**: Hidden
- **Click behavior**: Navigate to room, highlight both the changed evidence and the updated claim
