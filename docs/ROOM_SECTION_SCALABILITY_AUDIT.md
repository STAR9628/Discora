# Executive Summary

Discora should adopt a hybrid room architecture: a useful overview at the canonical room URL plus independently navigable, deep-linkable section routes. This is the smallest model that scales room navigation without turning participation into a feed or breaking the current relational content model.

The current discussion page mounts Questions & Inquiries, Claims, room-wide Evidence, and Contributions in one document. The debate page already conditionally renders Overview, Arguments, Evidence, Inquiries, and Contributions, but its section state is client-only. Neither model has route-level section state, and both eagerly request unbounded room collections. This is acceptable for small rooms; it is a future scalability risk, not evidence of a current production-performance incident.

Browser environment verification was confirmed at http://localhost:3000 (Next.js 15 dev server responding with HTTP 200, clean hydration, zero console errors, verified via automated browser inspection and visual capture). Findings synthesize direct source inspection and live runtime evaluation.

# Current Room Architecture

## Discussion

`/discussions/[slug]` is a server route that loads the room, topic, and discussion metadata, then mounts the client `DiscussionRoom`. `DiscussionDataProvider` immediately starts separate TanStack Query requests for messages, claims, room evidence, questions, and claim relations. The page renders all four main sections together in this order:

1. Header and opening premise
2. Questions & Inquiries
3. Claims
4. Evidence Bank
5. Contributions and contribution composer

`SectionNav` is sticky and scrolls to DOM IDs. Its active state comes from an `IntersectionObserver`; it is navigation within one document, not a tab system. A selected ordinary question is represented by `?question=<id>` and uses `window.history.pushState`, then scrolls to the Questions section. `?highlight=<id>` attempts to scroll to an already-mounted DOM element.

## Debate

`/debates/[slug]` server-loads room, topic, and debate metadata, then mounts `DebateRoom` inside `DebateDataProvider`. The provider eagerly queries debate data, participants, claims, questions, room evidence, and structured inquiries. `DebateRoom` separately queries messages and room evidence again (the latter shares the TanStack query key/cache).

`DebateSectionNav` behaves as a client-side tab chooser. Only the active section is rendered: Overview, Arguments, Evidence, Inquiries, or Contributions. The overview currently includes a scorecard, resolution, position history, and an argument summary that mounts the complete argument list. Section selection is React state initialized to `overview`; it is not reflected in the URL, so refresh, a new tab, and Back/Forward do not preserve it. `?highlight=<id>` only scrolls if its target is mounted when the effect runs.

## Data and relationship boundaries

Claims, questions, messages, evidence, and claim relations are all room-scoped. Evidence is additionally claim-scoped; the room evidence collection is used for the evidence bank and counts. Discussion claims can link to ordinary questions and source messages. Debate structured inquiries are claim-targeted, are independently retrievable by inquiry ID, and have a standalone `/inquiries/[id]` route; per-target inquiry lists can also be queried from a claim.

There is no pagination for room messages, claims, questions, room evidence, claim relations, or room inquiries. Existing infinite/cursor pagination is used for room discovery feeds, not room detail collections.

# Current Long-Scroll Problem

The discussion room's DOM and navigation burden rises linearly with every collection because all major sections are mounted and all items are requested. At mature-room scale, a person must either remember an approximate vertical position or repeatedly use in-document jumps. This impairs revisiting a claim, comparing evidence, mobile navigation, and sharing a specific analytical context.

The debate screen limits mounted UI to the selected section, which is a useful current mitigation. It does not solve direct section sharing or unnecessary eager requests; it also re-renders a full argument summary inside Overview. It should therefore be viewed as a partial client-state precursor, not as the final scalable IA.

# Scalability Analysis

| Dataset model | Current scrolling and cognition | Fetch/render burden | Revisiting and sharing | Room context |
| --- | --- | --- | --- | --- |
| Small: 5 claims, 3 evidence, 2 questions, 3 contributions | Long scroll is comfortable; current discussion layout is coherent. | Low; full fetch is reasonable. | Anchors and `highlight` are usually sufficient once mounted. | Strong, because all context is visible. |
| Medium: 25 claims, 20 evidence, 10 questions, 25 contributions | Section jumps work, but scanning and returning become increasingly costly. | All collections still load and discussion mounts all cards. | URLs identify the room, not the analytical section. | Strong but increasingly noisy. |
| Large: 75 claims, 100 evidence, 30 questions/inquiries, 100 contributions | A single document obscures the distinction between reasoning, support, uncertainty, and participation; mobile traversal is poor. | Large client requests, hydration, DOM, filters, and comment-tree work. | Highlighting depends on the target being loaded and mounted. | Preserved, but at the cost of focus. |
| Very large: 150+ claims, 200+ evidence, 50+ questions/inquiries, 250+ contributions | Long-scroll is no longer a usable primary architecture. | Unbounded room queries and rendering are a material scalability risk. | Copying the room URL does not restore the visitor to the intended analytical area. | Must be retained through a compact shared room shell. |

# Option Comparison

| Option | URL/share and browser behavior | Data/render scaling | Mobile and cognition | Complexity/risk | Assessment |
| --- | --- | --- | --- | --- | --- |
| A — Long Scroll | One canonical URL; anchors/query highlights are fragile at scale. | Worst: all discussion sections request and mount together. | High vertical burden. | Lowest immediate change, highest future cost. | Retain only for small-room compatibility during migration. |
| B — Client Tabs | Requires query/hash state to be shareable; otherwise refresh and history lose section state, as current debate tabs do. | Can defer mounting but often still eagerly fetches from a shared provider. | Better focus, but weaker URLs. | Moderate state synchronization risk. | Insufficient by itself. |
| C — Deep Routes | Native refresh, Back/Forward, new-tab, and copied-link behavior. | Routes can fetch only their section. | Strong, with consistent room context in a shared shell. | More routes and compatibility work. | Strong foundation, but needs a purposeful overview. |
| D — Hybrid | Canonical overview plus native detail URLs. | Overview stays compact; detail sections can own paginated queries. | Best explanation-to-inspection flow. | Moderate; shared shell and relational links need careful migration. | Recommended. |

## Option A — Long Scroll

It is simple and preserves immediate cross-section DOM navigation. It remains reasonable for small rooms, but it makes every collection compete for attention, mounts participation alongside knowledge objects, and cannot give section-level URLs meaningful semantics. It does not scale to the requested large and very-large models.

## Option B — Client Tabs

Tabs reduce visible cognitive load and the existing debate implementation demonstrates the interaction. However, client state alone cannot reliably preserve selection across refresh, browser history, opening a link in a new tab, or sharing. A query parameter could address that, but creates synchronization work while still keeping all section resources under one route. This is not the preferred long-term boundary.

## Option C — Deep Routes

Section routes produce stable, shareable, refresh-safe navigation and permit independent loading/pagination boundaries. A shared room container can preserve title, premise, room type, and local navigation. Route count is bounded to meaningful analytical sections, not components. The main risk is preserving existing claim/evidence/question highlight behavior and composing relational hops without duplicated fetching.

## Option D — Hybrid

Hybrid combines deep routes with a canonical overview that answers what the room is about and where to inspect next. It protects Discora's understanding-first philosophy: the room starts as an orientation surface, then sends users to reasoning, support, uncertainty, or participation deliberately. It avoids making contributions the default or dominant view.

# Recommended Architecture

Adopt a shared room container for each room type, with the canonical room URL as Overview and four independently navigable analytical section routes. The container should own only durable room context and navigation. Each section should own its own data loading, empty/loading/error state, filters, pagination, and section-local interactions.

No database, RLS, authorization, anonymous identity, or side-switching rule needs to change for this IA. This audit does not recommend implementation yet.

# Proposed Navigation Model

Discussion: Overview → Claims → Evidence → Questions & Inquiries → Contributions.

Debate: Overview → Arguments → Evidence → Questions & Inquiries → Contributions.

The active navigation item must be a link, not only a stateful button. On each detail page, retain a compact title/premise context and a visible Overview return link. Overview should use count-backed summaries and explicit “Inspect” links, not embed complete lists.

# Proposed URL Structure

```text
/discussions/[slug]
/discussions/[slug]/claims
/discussions/[slug]/evidence
/discussions/[slug]/questions
/discussions/[slug]/contributions

/debates/[slug]
/debates/[slug]/arguments
/debates/[slug]/evidence
/debates/[slug]/questions
/debates/[slug]/contributions
```

`questions` is preferable to `questions-and-inquiries`: it is concise, consistent across room types, and the page itself can explain the distinction progressively. `arguments` correctly signals debate's side-structured claims; discussion retains `claims`.

# Overview Design

Overview must be an orientation and synthesis entry point, not a directory or a second full long-scroll page. It should show room title, opening premise, and compact, count-backed previews of the important questions, claims/arguments, evidence, unresolved inquiries, and contributions. Each preview should state what the section is for and link to its full section.

For debate, scorecard, resolution, and position context belong in Overview. A complete argument list should not: that duplicates the Arguments page and defeats the compact overview boundary.

# Claims Navigation

The Claims page should be the discussion reasoning surface. It needs stable item links, filters/sorting/grouping appropriate to claims, and paged access rather than an unbounded card list. Claim-to-question, claim-to-evidence, claim-to-contribution, and claim-relation affordances should navigate to the relevant section plus an item target.

The Debate Arguments page should preserve proposition/opposition comparison. Desktop two-column comparison and the existing mobile side switcher are compatible with section routes. Pagination must remain intelligible by side; do not merge sides into an engagement-ranked stream.

# Evidence Navigation

Evidence should be independently navigable and filterable by direction, source, and associated claim. The current room-wide evidence bank already provides direction and keyword filtering, but it operates over the full client collection. A scalable version should page/filter at the section boundary and make the linked claim an explicit route-level hop.

# Questions & Inquiries Navigation

Keep ordinary Questions and structured Inquiries together only as an uncertainty-oriented information area with clear progressive disclosure: questions frame open exploration; inquiries are targeted checks on specific claims. Do not flatten their distinct data model or permissions. Discussion currently has ordinary question selection via `?question=<id>`; debate currently loads questions and structured inquiries separately. A section page can preserve both concepts while making their relationship clearer.

# Contributions Navigation

Contributions belong in their own section and should remain secondary to claims, evidence, and uncertainty. Preserve message-thread replies, extraction to claims, and message-to-claim/evidence links. For large rooms, paginate root threads and load replies deliberately or with bounded expansion; do not default to infinite social-feed consumption.

# Claim/Evidence/Inquiry Deep Linking

Current mechanisms are partial: `?highlight=<id>` scrolls only to an already-loaded mounted element; discussion question selection uses `?question=<id>`; evidence cards use DOM IDs such as `ev-<id>`; standalone structured inquiries already use `/inquiries/[id]`. These should be preserved during migration, not replaced gratuitously.

The future section route should carry the item target in the existing query language where possible, for example `/discussions/[slug]/claims?highlight=<claim-id>` and `/discussions/[slug]/questions?question=<question-id>`. Evidence should use `/discussions/[slug]/evidence?highlight=<evidence-id>` only after the target is guaranteed to be fetched into the page. If an item is not in the active page, the route implementation must resolve the item/page before attempting the highlight; a bare DOM retry is insufficient once pagination exists. Claim-to-inquiry links may retain the standalone inquiry route when the user needs the full inquiry record, while providing a clear return to the originating claim/room context.

# Browser Back/Forward

Route links give the expected sequence: Overview → Claims → a highlighted claim → Evidence → inquiry → Back. Browser Back/Forward, refresh, copied links, and opening a new tab retain both room and section without client-state reconstruction. Section-local filters should be URL-backed only when they materially change what a shared link means; transient UI state (open composer, side-modal visibility) should remain local.

# Mobile Architecture

At 375px and 390px, use a horizontally scrollable local section nav with short labels/counts, a persistent room title context, and an obvious Overview link. Do not force five equal-width tabs. Retain the debate mobile proposition/opposition segment control inside Arguments.

At 768px, preserve the same route model with room context and allow wider controls; at 1024px and 1440px, use the shared shell and section-specific layouts such as debate's two-side comparison. Breadcrumbs should remain short (room type → truncated room title → section) and must not compete with the title/premise.

# Performance Considerations

Current source evidence shows unbounded client queries for room collections, not a measured live failure. In discussions, five collections begin loading in `DiscussionDataProvider`, then every primary section is mounted. In debates, the provider eagerly queries claims, questions, evidence, inquiries, participants, and debate data even when another section is selected; messages are separately fetched by the room component. Evidence is also requested in both provider and component, although the matching TanStack Query key should deduplicate/cache it rather than necessarily duplicate the network request.

The current in-memory mappings also repeatedly inspect full collections, including evidence-by-origin-message filtering. These costs remain acceptable for small rooms but grow with dataset size and browser memory/DOM size. Section routes let the application defer most work until the section is visited, with no need to invent a performance problem before measurement.

# Large Dataset / Pagination Strategy

Use bounded, explicit pagination as the default for all large section lists, with stable chronological or analytical sort options and filters. Cursor pagination is appropriate where immutable ordering keys are available; page controls or “load more” can be used when they preserve orientation. Do not make infinite scroll the primary navigation model.

| Section | Recommended strategy |
| --- | --- |
| Claims / Arguments | Cursor or page pagination; filters for claim type/status and, for debate, side. Preserve stable sort order. |
| Evidence | Cursor/page pagination with server-applied direction, claim, and source/text filters where supported. |
| Questions / Inquiries | Separate bounded lists or clear subsections; filters by open/resolved/retracted and inquiry type/status. |
| Contributions | Paginate root threads by stable chronology; load replies in bounded groups/expansion. |
| Overview | Small summary/count queries and a deliberately capped preview, never full section lists. |

Virtualization is a later implementation choice only if profiling shows individual paginated pages still produce problematic DOM size. It does not replace pagination, shareable URLs, or information architecture.

# Discussion vs Debate

The proposed difference is appropriate. Discussions center open claims; debates center side-structured arguments and retain side-switch safeguards, stance context, resolution, and scorecard information. Both can share the container pattern, evidence, uncertainty, and contribution routes, but their section components and filters should not be forced into artificial uniformity.

# Future Understanding Layer Compatibility

Hybrid routing creates clean foundations for a future Understanding Layer: Overview can eventually summarize what is known, contested, supported, contradicted, and unresolved without consuming the full evidence or claim surfaces. Claims/Arguments, Evidence, and Questions/Inquiries remain separately inspectable source layers. This is an architectural compatibility observation only; no Understanding Layer is proposed for implementation now.

# Migration / Implementation Risk

The biggest technical risk is breaking relational navigation when an item no longer exists in the current DOM. The implementation must resolve an item and its page before applying current highlight behavior, and must retain query/cache invalidation correctness across section boundaries.

The biggest UX risk is making Overview too sparse or turning it into another full page. It must orient users while offering meaningful previews, not replicate every section.

Regression risk is concentrated in existing `highlight`, question selection, evidence-to-claim navigation, contribution extraction/navigation, inquiry detail returns, debate-side behavior, loading/error/empty states, and all authorization/anonymous identity safeguards. No schema or RLS change is indicated by this IA.

# Implementation Phases

1. Define the shared room container, canonical overview contract, exact URL compatibility rules, and item-link contract before code changes.
2. Introduce section routes and route-backed navigation while preserving the existing canonical room URLs as Overview.
3. Move each section behind an independent query/loading/error/empty boundary; do not alter RLS, RPCs, or identity behavior.
4. Add bounded pagination/filtering with stable item resolution for highlights and relational hops.
5. Run targeted browser QA for refresh, Back/Forward, new tabs, direct links, mobile widths, empty/error/loading states, and current signed-off flows; then profile representative large datasets.

# What We Should NOT Build

- A route for every card, modal, filter, or subcomponent.
- A duplicated full Claims/Arguments list inside Overview.
- An engagement-ranked or endless Contributions feed.
- Complex synchronized client state for section selection when a route expresses it.
- New linking mechanisms when existing query targets and the standalone inquiry route can be preserved.
- Database migrations, RLS/RPC changes, or changes to anonymous identity and side-switch protections for this IA.

# Final Recommendation

ADOPT HYBRID OVERVIEW + DEEP-LINKABLE SECTIONS

It wins because it combines an understanding-first room orientation with independently addressable inspection surfaces. Its biggest UX benefit is letting users return to, share, and compare reasoning, support, uncertainty, and participation without traversing a mature room as one document. Its biggest technical risk is reliable item resolution/highlighting across paginated section pages. Its biggest migration risk is regressing existing relationship-driven navigation and signed-off room behavior.

Implement the shared room container and route-backed section navigation first, while retaining the current canonical room URLs as Overview. Keep existing content models, permissions, identity behavior, side-switch safeguards, claim/evidence/inquiry relationships, and small-room semantics unchanged until each section has a verified replacement.
