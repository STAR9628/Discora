-- ============================================================================
-- Migration: 202609130003_phase_8d_debate_side_alignment.sql
-- Description: Align debate_side ('proposition' / 'opposition') on seeded debate claims
-- ============================================================================

-- Debate 1: Autonomous Weapons Systems
update public.claims
set debate_side = 'proposition'
where id = 'c0070000-0000-4000-8000-000000000001'::uuid;

update public.claims
set debate_side = 'opposition'
where id = 'c0070000-0000-4000-8000-000000000002'::uuid;

-- Debate 2: Large-scale recommendation algorithms
update public.claims
set debate_side = 'proposition'
where id = 'c0080000-0000-4000-8000-000000000001'::uuid;

update public.claims
set debate_side = 'opposition'
where id = 'c0080000-0000-4000-8000-000000000002'::uuid;

-- Debate 3: Generative AI writing in academic publications
update public.claims
set debate_side = 'proposition'
where id = 'c0090000-0000-4000-8000-000000000001'::uuid;

update public.claims
set debate_side = 'opposition'
where id = 'c0090000-0000-4000-8000-000000000002'::uuid;
