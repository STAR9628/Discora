# PHASE 9D.2 — ARCHITECTURE CORRECTION REPORT

**Date:** 2026-09-14
**Applies to:** `docs/PHASE_9D2_FRIEND_INVITATION_ARCHITECTURE_SECURITY_AUDIT.md` (Revision 2)
**Mode:** READ-ONLY. No source code, no database, no migration, no RLS, no auth, no production, no commit, no push.
**Verdict:** B. READY WITH PRODUCT DECISIONS

---

## 1. Correction Register

Each correction below lists: **contradiction found in Rev 1** → **correction made in Rev 2** → **product implication** → **security implication** → **implementation sequencing change** → **remaining product decisions**.

### C-1 FRIENDSHIP VS BLOCKING
- **Contradiction found:** Rev 1 modeled blocking as a `blocked` state inside `friend_relationships` (Sections 5, 6, 17, 19, 27) and left the two-table-vs-one-table decision open (D-1, D-2 with option "mark relationship `blocked`").
- **Correction made:** Split into three independent tables — `friend_requests` (request lifecycle), `friend_relationships` (**accepted friendships only**, no status column, row exists iff currently friends), `user_blocks` (independent one-way safety boundary). `block_user` transactionally: (1) revokes pending requests both directions, (2) removes/ends the accepted friendship, (3) rejects future requests/invitations between them, (4) applies blocking visibility/security rules. `unblock_user`: removes the block only; **never restores** the friendship; a new friend request is required. All sections, RPCs, RLS, threat model, and tests updated consistently (Sections 5, 6, 16, 17, 19, 26, 27).
- **Product implication:** Blocking is now a pure safety boundary, not a relationship state. Users who unblock see a "re-request required" surface. No ambiguity between "friends" and "blocked".
- **Security implication:** Closes the ambiguity where a `relationship.status='blocked'` row could be misinterpreted by other RLS/RPC paths; eliminates the false-safety illusion of "blocked friendship" persistence. Atomic three-effect block removes race windows where a stale pending request could slip through after a block.
- **Implementation sequencing change:** Unified `block_user` transaction (M1 RPC set) replaces a distribution of "block = status flip" updates; `friend_relationships` gains a hard delete path (no status transitions).
- **Remaining product decisions:** none from this item (D-1, D-2 resolved by mandate).

### C-2 PUBLIC FRIEND GRAPH
- **Contradiction found:** Rev 1 recommended a **public** friends list by default (Section 7 option A; D-4), and Section 25 noted "friend counts may appear on the public profile."
- **Correction made:** Friend graph is **private during Beta**. Users see only their own Friends surface (Friends / Pending / Blocked). No public friend list, no public friend counts as popularity signals. Section 7, 16 (RLS SELECT scoped to `user_a_id = auth.uid() OR user_b_id = auth.uid()`), 25, 27 (FRIEND-15), 31 (D-4 resolved).
- **Product implication:** No social-graph exposure, no "friend count" social status. Any future public graph requires an explicit separate Product Decision.
- **Security implication:** Removes the largest privacy leak surface of the friend tables (anon/public reads of relationship data); shrinks RLS exposure to owner-only reads.
- **Implementation sequencing change:** Profile page gains no friends-related public rendering in 9D.2A/B; `friend_relationships` SELECT policy is per-user (nosier policy, smaller blast radius).
- **Remaining product decisions:** none from this item (D-4 resolved by mandate).

### C-3 ROOM INVITATION SECURITY ORDERING
- **Contradiction found:** Rev 1 scheduled "room-invite integration + remediation" together in one block (9D.2C) and described a friend-aware room invite "shortcut" (§9) without gating it behind remediation.
- **Correction made:** **HARD RULE** codified — no friend-aware room invitation functionality on top of the insecure `room_invitations`. Sequence is now: 9D.2A friend core → 9D.2B friend UI → **9D.2C remediate `room_invitations`** (hash-at-rest, expiry, rate limiting, atomic consumption, preserved authorization) → **9D.2D only after remediation** friend-aware room-invite integration. Sections 3, 9, 12, 28 (M3 gating M4), 29, 32, 33 updated.
- **Product implication:** Friend-aware private-room invitations are a later phase, not part of the initial friend Beta; guidance copy in the Friends UI must not promise room invites before 9D.2D.
- **Security implication:** Eliminates the risk of entrenching a known plaintext-token mechanism as the de-facto friend-driven room-entry path; guarantees remediation reviews (owner/grants) happen before the invite surface grows.
- **Implementation sequencing change:** Split 9D.2C into a gating remediation migration (M3); 9D.2D (M4) is re-sequenced strictly after M3 with an explicit dependency.
- **Remaining product decisions:** none from this item (ordering is mandated).

### C-4 ADD FRIEND UX (no composer)
- **Contradiction found:** Rev 1 proposed an optional 500-character friend-request composer/message on Add Friend (Section 8 composer step; Section 5 `message` field; Section 24 accessibility composer).
- **Correction made:** Removed the composer and the free-text message field from Beta. Target UX is: **[Add Friend]** → create secure pending friend request/invitation → copy secure invitation link → show **"Request sent" / "Friend request link copied"**. Add Friend is explicitly a convenient secure-link creation/copy action, not a social-media-style composer. Sections 5, 8, 11 (`message` future-only), 24, 25 updated.
- **Product implication:** Lower-friction, focused action; no risk of the feature drifting into social-media messaging; literal confirmation to the user that the link was created/copied.
- **Security implication:** Fewer content inputs (no message XSS/length/sanitization surface); simpler rate limiting on a single intent; link copy keeps the secret on the client clipboard rather than encouraging manual transport in message bodies.
- **Implementation sequencing change:** 9D.2B UI no longer includes a composer; the copy-link flow is the sole interaction.
- **Remaining product decisions:** a future optional message field requires its own Product Decision (recorded, not defaulted).

### C-5 FRIEND REQUEST VS FRIEND INVITATION
- **Contradiction found:** Rev 1 treated request creation and invitation as loosely interchangeable and did not crisply define the external-person path's acceptance semantics.
- **Correction made:** Semantics made explicit and mutually exclusive:
  - **KNOWN USER (A→B):** direct `create_friend_request` → `pending` → `accepted`.
  - **EXTERNAL / NOT-YET-REGISTERED (A → link):** `create_friend_invitation` returns opaque token → B opens `/invite/[token]` (preview, no auth/grant) → B authenticates/registers → server validates token **and binds it to `auth.uid()`** → a `friend_requests` row is created → B accepts → `accepted`.
  - The token is NEVER authentication and NEVER itself friendship. Sections 5, 15, 17, 27, 13.
- **Product implication:** Clear mental model for users: "Add Friend" to a known user sends a request; to someone not on Discora, the same button produces a secure shareable link.
- **Security implication:** Prevents the token-path from being read as "link = permission to befriend"; recipient binding + registration validation prevents link-souperging and cross-account acceptance.
- **Implementation sequencing change:** `resolve_friend_invitation` is an explicit M2 RPC (validate → bind → create pending request → consume); it is not folded into `create_friend_request`.
- **Remaining product decisions:** none from this item.

### C-6 EMAIL INVITATIONS OUT OF BETA
- **Contradiction found:** Rev 1 carried `recipient_email` as an equal recipient-identity path (Sections 11, 22, 31 D-7 open with "launch email invites now" option).
- **Correction made:** Email-based friend invitations are **OUT of Beta**. `recipient_email` stays out of the active Beta implementation; design compatibility only (noted in Section 11), with zero implementation dependency. Sections 22 and 31 D-7 updated; section 16 drops the `auth.email()` recipient policy from Beta.
- **Product implication:** No email deliverability dependency, no transactional email provider requirement, no "invite by email address" surface for Beta.
- **Security implication:** Removes authenticated-email-matching as a Beta authorization primitive (an inherently leakier identity check); shrinks the `friend_invitations` RLS surface to bound-`recipient_user_id` match only.
- **Implementation sequencing change:** M2 excludes email columns from the active path; no email RPC required.
- **Remaining product decisions:** none from this item (D-7 resolved by mandate).

### C-7 RATE LIMITING POSTURE
- **Contradiction found:** Rev 1 presented candidate numeric thresholds alongside wording that could read as authoritative (Section 18 table, D-8 with locked-value option).
- **Correction made:** Posture is now: rate limiting **mandatory and server/DB-enforced**; values are **conservative initial settings with documented abuse rationale**, tunable configuration, adjusted from actual abuse/usage evidence; explicitly **not** permanent product truth, **not** mathematically optimal inventions. Section 18, 31 D-8 updated.
- **Product implication:** Numbers are launch defaults to validate, not commitments; a config/tuning pass (9D.2E) is expected post-launch.
- **Security implication:** Guarantees enforcement exists at launch while allowing evidence-based tightening/loosening; avoids the anti-pattern of unenforced academia.
- **Implementation sequencing change:** 9D.2E (abuse hardening + tuning) is scheduled using real counters from 9D.2A.
- **Remaining product decisions:** D-8 (which conservative defaults to ship) — OPEN, non-blocking.

### C-8 INVITATION ROUTING
- **Contradiction found:** Rev 1 had a single `/invite/{token}` recommendation without a family-resolution contract, and no explicit statement about prefix-only authorization risk.
- **Correction made:** Routing contract added: PUBLIC category (`/discussions/[slug]`, `/debates/[slug]`, `/u/[username]`) vs SECURE INVITATION category (`/invite/[token]`). If one route serves multiple invitation types, the server **resolves the family securely from the token** (never URL shape/client input) and enforces the type's authorization path. Token families stay semantically distinct and non-interchangeable. **Token prefixes are dispatch hints only — they never establish authorization.** Sections 10, 13, 14, 27 (INVITE-07, INVITE-08).
- **Product implication:** A single `/invite/[token]` URL can later host room invitations without a URL migration; the preview UX is type-driven server-side.
- **Security implication:** Blocks prefix-spoofing as an authorization vector; cross-family tokens always fail closed with generic `invalid_invitation`.
- **Implementation sequencing change:** `/invite` route is defined with a family resolver from day one (M2), so adding room-family resolution in 9D.2D is additive.
- **Remaining product decisions:** none from this item.

### C-9 PRODUCT PHILOSOPHY
- **Contradiction found:** Rev 1 contained a "public friend counts may appear on the public profile" statement (Section 25), which risked social-status mechanics.
- **Correction made:** Added a dedicated product-philosophy check (Section 25): verified avoidance of followers/following, popularity metrics, public friend counts as social status, friend leaderboards, social ranking, gamified invitations, engagement rewards, viral mechanics. Stated purpose: **friend functionality exists only to facilitate meaningful participation in Discora conversations.**
- **Product implication:** Guarantees the feature stays a participation enabler, not a growth/social-status feature.
- **Security implication:** Indirect — fewer public aggregate surfaces = smaller attack/enumeration surface.
- **Implementation sequencing change:** none.
- **Remaining product decisions:** none.

### C-10 SECURITY CONSISTENCY AUDIT (post-correction)
- **Contradiction found:** Rev 1's threat model and test matrix referenced "blocked relationship state" semantics that no longer exist.
- **Correction made:** Full document consistency re-pass. Rechecked and aligned: IDOR (request ids owned-list only, recipient/sender binding), RLS (private graph, revoked client DML), SECURITY DEFINER (pinned search_path, no SET ROLE), recipient binding (bound user via auth.uid(), block both directions), blocking (revoke/remove/reject/unblock-no-restore), deletion (`is_deleted` gates + FK CASCADE), retired handles, token leakage (hash-at-rest, no query/log/OG, family resolution), token replay (atomic consumption), rate limiting (DB counters), race conditions (atomic three-effect block, atomic consumption), wrong-user acceptance, private-room authorization (unchanged semantics, gated by 9D.2C), public/private boundary (private friend graph), cache/realtime (none for friends; query-key isolation), auth/deep links (`getSafeRedirectUrl`, `redirectedFrom`), open redirects (internal-only). Test matrix extended (FRIEND-09, FRIEND-10, FRIEND-15, INVITE-07, INVITE-08).
- **Product implication:** none.
- **Security implication:** Test coverage now encodes the mandated blocking/invitation semantics; regression surface is explicit.
- **Implementation sequencing change:** Matrix is future verification scope; no code impact.
- **Remaining product decisions:** none.

---

## 2. Corrected Architecture Summary

- **Three-table model:** `friend_requests` (Pending → Accepted; plus Declined/Revoked/Expired terminals), `friend_relationships` (accepted friendships only — row exists iff friends), `user_blocks` (independent one-way boundary). Blocking ends friendships; unblock never restores; a new request is required.
- **Private friend graph in Beta:** own-data-only Friends surface; no public friend list/counts.
- **Add Friend = secure-link action:** click → create pending request/invitation → copy secure invitation link → "Request sent" / "Friend request link copied". No composer.
- **Two distinct paths:** known-user direct requests vs external-person secure `/invite/[token]` (preview → authenticate/register → token validated + bound → request created → accept → friendship). Token is never authentication and never itself friendship.
- **Email invitations out of Beta:** `recipient_email` design-compat only; no implementation dependency.
- **DB-enforced, tunable rate limiting:** conservative defaults, documented rationale, adjust on evidence.
- **Routing:** PUBLIC (`/discussions/[slug]`, `/debates/[slug]`, `/u/[username]`) separate from SECURE INVITATION (`/invite/[token]`); server-side family resolution; prefixes never authorize; families non-interchangeable.
- **Remediation gating:** friend core → friend UI → **remediate `room_invitations`** (hash-at-rest, expiry, rate limiting, atomic consumption, preserved authz) → only then friend-aware room invites.
- **Philosophy guard:** no followers, popularity metrics, public counts, leaderboards, ranking, gamified invites, engagement rewards, or viral mechanics.

---

## 3. Remaining Product Decisions (non-blocking)

| ID | Decision | Recommended (for Owner approval) |
|---|---|---|
| D-5 | Re-request after decline | Allow after 7-day cooldown (upsert window) |
| D-6 | Notification surface | In-app Friends badge only (no email) |
| D-8 | Which conservative rate-limit defaults to ship | Ship candidate values behind tunable configuration; tune with evidence |
| D-9 | Expiry sweep mechanics | Lazy rollover + daily sweep |

None of these gates the corrected architecture.

---

## 4. Final Verdict

**B. READY WITH PRODUCT DECISIONS.**

- The mandated corrections remove the block-in-relation and public-graph ambiguities and reorder room-invitation work behind remediation.
- Not **A** because D-5, D-6, D-8 (defaults), D-9 remain unapproved and `room_invitations` remediation is scheduled, not done.
- Not **C** because no open item blocks the architecture or the 9D.2A/B sequence.

---

## 5. Boundary Confirmation

No source code, database, migration, RLS policy, auth, production change, commit, or push was made during this correction pass. Updates were confined to the two documents: `docs/PHASE_9D2_FRIEND_INVITATION_ARCHITECTURE_SECURITY_AUDIT.md` (Rev 2) and this report.