-- Sprint 11.6: Fix content length CHECK constraints to match frontend Zod validation
-- Claim min: 25 → 10 (matches claimSchema min(10))
-- Evidence min: 50 → 20 (matches evidenceSchema min(20))

alter table public.claims
  drop constraint if exists claims_content_length_check,
  add constraint claims_content_length_check check (char_length(content) between 10 and 500);

alter table public.evidence
  drop constraint if exists evidence_content_length,
  add constraint evidence_content_length check (char_length(content) between 20 and 1000);
