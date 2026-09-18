-- Owner-approved disposition (2026-09-11): retire the single legacy resolved debate.
--
-- Product decision (owner): "Retire the legacy `ai vs human` debate as `closed`
-- and remove its legacy `resolution` data. Do not preserve, replace,
-- reinterpret, or archive Winner/Loser semantics. Do not create any replacement
-- resolution/conclusion model."
-- Evidence: docs/PHASE_7D_PHASE_F_RESOLVED_DEBATE_INVESTIGATION.md
-- (genuine legacy competitive outcome: populated winner/summary/resolvedBy;
--  no approved status mapping existed, so none is invented here).
--
-- What this migration does (and only this):
--   1. Updates EXACTLY ONE row (id 4120c703-a7e7-4613-9bab-9175c4ae7638),
--      and only while it is still `resolved`:
--        status `resolved` -> `closed`
--        resolution -> NULL (legacy winner/summary/resolvedBy removed, not moved)
--        updated_at -> now() (audit honesty)
--   2. Fails loudly if ANY `resolved` debate remains afterwards, so that
--      202606270001 §6 (status CHECK rewrite) can never hit a cryptic
--      constraint violation at push time.
--
-- Semantics: `closed` means ONLY "this debate is no longer active"
-- (frontend maps closed -> inactive). It MUST NOT be read as "the historical
-- winner was correct". No UI, metadata, or audit representation of the old
-- outcome is created anywhere by this migration.
--
-- Safety properties:
--   - Idempotent and re-runnable: already-closed/missing row => no-op, guard passes.
--   - Scoped by primary key + status predicate: no other debate, discussion,
--     message, claim, room, participant, or private data is touched.
--   - Trigger-safe: the only debates UPDATE triggers in history are
--     trg_reputation_debate_insert (INSERT-only, not fired) and
--     trg_reputation_debate_resolve (fires only on transition TO `resolved`;
--     this transition goes to `closed`, so no reputation event is emitted).
--   - Ordered before 202606270001 by version (202606260006 < 202606270001),
--     which drops the `resolution` column and tightens the CHECK right after.
--   - Creates no replacement model: no tables, columns, RPCs, or events.

update public.debates
set status = 'closed',
    resolution = null,
    updated_at = now()
where id = '4120c703-a7e7-4613-9bab-9175c4ae7638'
  and status = 'resolved';

do $$
begin
  if exists (select 1 from public.debates where status = 'resolved') then
    raise exception 'legacy_resolved_debate_remaining'
      using hint = 'A debate with legacy status resolved remains. Owner disposition is required before 202606270001 tightens the status check.';
  end if;
end
$$;
