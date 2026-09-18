# Grant Reconciliation — Production Behavior Check (F-03 Follow-up)

**Mode:** READ-ONLY. No migrations, objects, grants, RLS, RPCs, code, env, data, or
history touched. No accounts created. No destructive or state-changing tests. No
commits/pushes. No secrets/tokens printed.

---

## 1. Purpose

Resolve the Grant Reconciliation Audit's F-03 open question at the behavior level:
does the production application visibly suffer from the missing SELECT grants on
`inquiry_items`, `inquiry_responses`, `debate_side_changes` — without conflating it
with the unanswerable byte-level question (does production have the same grants).

## 2. Production access limitations

- Production SQL: unavailable (no tool, no bypass attempted).
- Production authenticated session: none exists; creating accounts forbidden; no
  credentials in repo. Prior phases never established one (one failed login attempt only).
- Production web app: exhaustive check found NONE — `discora.com` and `www` resolve
  to Atom.com domain-parking ("Just a moment…" challenge page); no `app` subdomain;
  no deployment config in repo; 9A/9B1 docs confirm the domain was unassigned/pending.
  Production currently = Supabase backend only (DB + Auth), no servable frontend.
- Anon PostgREST probes were considered and REJECTED as uninformative: all three
  tables' RLS policies target `authenticated` exclusively (verified locally), so anon
  returns empty regardless of grants — probing would prove nothing and was skipped
  to avoid pointless production traffic.

## 3. Exact browser flows tested

N/A — no production application exists to drive. Verified instead: (a) parking-page
identity of both resolvable hosts (read-only navigations, no interaction); (b) DNS
absence of an app subdomain; (c) repo-wide absence of deployment configuration.

## 4. Inquiry item result: C — NOT OBSERVABLE

Local behavior (known): direct SELECT 403s; no grant migration exists in intent.
Production behavior: unobservable (no app, no session). Question A (same grants?)
explicitly NOT claimed.

## 5. Inquiry response result: C — NOT OBSERVABLE

Same as §4 (same policy/grant shape, same app read path).

## 6. Debate side-change result: C — NOT OBSERVABLE

Same as §4 (policies authenticated-only, no grant migration, app reads directly).

## 7. SoU/context result

Local SoU degrades gracefully without inquiry counts (context chips absent; verified
in prior phases). Production SoU impact is NOT OBSERVABLE for the same reasons as
§4–§6. No evidence of production SoU breakage OR health either way.

## 8. Network observations

Parking hosts only (Cloudflare-challenge + Atom landing traffic). No Discora API
surface reachable over HTTP. No endpoint categories to record beyond: no app, no
PostgREST browser flows possible. No headers/cookies/tokens collected.

## 9. Security observations

No production security issue observed (no Discora attack surface is servable).
Nothing was probed destructively; the parked domain was not interacted with beyond
identity confirmation. Secrets posture unchanged.

## 10. Local-vs-production conclusion

Local F-03 behavior (403s) is VERIFIED and matches migration intent (no grant
migration exists — this is intent, not drift). Production behavior is NOT
OBSERVABLE. The two questions stay separated per instructions: intent suggests
production WOULD behave identically IF its grants match migrations, but dashboard-
applied grants (the known historical pattern per 202609090011) could equally mean
production works fine. Neither claim is made.

## 11. Recommendation for F-03

Do NOT write the grant-restoration migration yet. Instead, at the moment a production
frontend and/or legitimate authenticated access exists, re-run this exact check
(real login → room with inquiries → position history → network 200/403). If 403s
reproduce there, the forward migration (least-privilege SELECT grants, no RLS change)
is justified; if 200s, production carries dashboard grants and the migration must
first reconcile that state rather than blindly re-granting. Until then F-03 stays an
intent-level functional gap with zero security exposure (fail-closed 403s).

## 12. Status of F-01

Unchanged: `claim_relations` open INSERT is live intent (060001), needs the planned
forward-migration narrowing. No production interaction performed (creation UI only
exists in local app; no crafted production writes per instructions).

## 13. Status of F-02

Unchanged: debates UPDATE tautology remains a migration-level remediation item
(inert via absent UPDATE grant). No production UPDATE attempted (forbidden).

## 14. Whether a forward migration should now be prepared

NO — not for F-03 (verdict C blocks the justification), and F-01/F-02 were already
queued behind this check without new Revue. Prepare the combined forward migration
only after §11's trigger condition is met or Product Owner accepts intent-level risk.

## 15. Production status

NOT TOUCHED — READ ONLY (parking-page identity navigations + DNS lookups only).

## 16. Final verdict

**C — PRODUCTION BEHAVIOR NOT OBSERVABLE.** No production application is deployed
and no legitimate authenticated access exists; D is not warranted because no further
read-only step available to this task could answer it (only credentials or SQL access
could, both out of bounds).
