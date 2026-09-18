-- Migration: Phase 8D Data Hygiene, Curated Starter Discourse & Founding Participant
-- 1. Profiles: Add is_founding_member with self-update guard trigger (defaults to false).
-- 2. Metadata triggers: allow seeding by preserving new.created_by when auth.uid() is null.
-- 3. Data Hygiene: Exact deterministic purge of 14 scratch claims and 8 scratch rooms.
-- 4. Seed Discourse: 6 curated discussions & 3 curated debates with verified citations.

-- ============================================================================
-- 1. Profiles: is_founding_member
-- ============================================================================
alter table public.profiles
add column if not exists is_founding_member boolean not null default false;

create or replace function public.prevent_founding_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_founding_member is distinct from new.is_founding_member then
    if not public.has_role_or_higher(auth.uid(), 'admin'::public.user_role_type) then
      new.is_founding_member := old.is_founding_member;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_founding_member_self_update on public.profiles;
create trigger prevent_founding_member_self_update
before update on public.profiles
for each row
execute function public.prevent_founding_member_self_update();

-- ============================================================================
-- 2. Metadata Trigger Hygiene for Administrative Migrations & Seeding
-- ============================================================================
create or replace function public.handle_claim_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;

  if new.origin_message_id is not null then
    if not exists (
      select 1 from public.messages m
      where m.id = new.origin_message_id and m.room_id = new.room_id
    ) then
      raise exception 'origin_message_id must belong to the same room as the claim.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_argument_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_room_id uuid;
begin
  new.created_by := coalesce(auth.uid(), new.created_by);

  if new.created_by is null then
    raise exception 'created_by_required' using hint = 'Argument author required.';
  end if;

  select room_id into v_claim_room_id from public.claims where id = new.claim_id;
  if v_claim_room_id is null then
    raise exception 'claim_not_found' using hint = 'Claim not found.';
  end if;
  if v_claim_room_id <> new.room_id then
    raise exception 'room_mismatch' using hint = 'Argument must be in the same room as its claim.';
  end if;

  return new;
end;
$$;

create or replace function public.handle_evidence_insert_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

create or replace function public.handle_question_identity_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_claim_evidence_link_authorization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_room_id uuid;
  v_evidence_created_by uuid;
  v_user_id uuid;
begin
  v_user_id := coalesce(auth.uid(), new.created_by);
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select c.room_id
  into v_claim_room_id
  from public.claims c
  where c.id = new.claim_id;

  if v_claim_room_id is null then
    raise exception 'Claim not found.';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = v_claim_room_id
      and r.status <> 'archived'
      and (
        r.visibility = 'public'
        or r.created_by = v_user_id
      )
  ) then
    raise exception 'Room is not accessible.';
  end if;

  select e.created_by
  into v_evidence_created_by
  from public.evidence e
  where e.id = new.evidence_id;

  if v_evidence_created_by is null then
    raise exception 'Evidence not found.';
  end if;

  if v_evidence_created_by is distinct from v_user_id then
    raise exception 'Only the evidence author may link evidence to a claim.';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 3. DATA HYGIENE: Surgical Purge of Scratch Claims & Scratch Rooms
-- ============================================================================
-- Temporarily disable row delete triggers to allow administrative hard delete of test items
alter table public.claims disable trigger claim_delete_with_lock;
alter table public.claim_evidence disable trigger prevent_claim_evidence_deletion;
alter table public.evidence disable trigger prevent_evidence_deletion;
alter table public.sources disable trigger prevent_source_deletion;
alter table public.arguments disable trigger argument_delete_with_lock;
alter table public.questions disable trigger prevent_question_deletion;

-- 1. Delete scratch claim_evidence links attached to scratch claims
delete from public.claim_evidence
where claim_id in (
  '485ec625-9122-458c-8aa6-0ab23ee9dc75'::uuid,
  'cc8ce569-370c-4cd9-a79c-8b4e0f81b7dd'::uuid
);

-- 2. Delete the 4 scratch evidence items
delete from public.evidence
where id in (
  'c80e9dbb-f062-4bb6-a090-de0db6799bff'::uuid,
  '68a158bd-d89e-411b-ba47-9e1cc9517390'::uuid,
  'e424da80-14e1-45f6-838d-54473b471824'::uuid,
  '30effcfd-3cb4-4dad-9e7d-369bf1ea8452'::uuid
);

-- 3. Delete the 4 scratch sources
delete from public.sources
where id in (
  '8570ea19-f0ea-4e3e-9b49-c01feaa63ed3'::uuid,
  '01a176c7-025c-4a69-a505-39ada1f6ac8d'::uuid,
  '2b67fe17-f259-4912-94a5-d5b82e006b16'::uuid,
  '53dfc2b0-6a68-4e01-82c7-316073450abe'::uuid
);

-- 4. Delete exactly the 14 identified scratch claims inside the legitimate room
delete from public.claims
where id in (
  '485ec625-9122-458c-8aa6-0ab23ee9dc75'::uuid, -- yaaadsddsdsd
  'b2f69044-2a75-4e54-b773-99b32ff69432'::uuid, -- testing this feature
  'fcb80a76-1f63-408e-a03e-2c59aeb61057'::uuid, -- testingtesting
  'bc06dc0e-b885-4c3a-9cdc-c9fe79b9654a'::uuid, -- test ans2adm
  '3c6b2685-59a2-4c6b-b19b-48badb9e716d'::uuid, -- test claim 20
  '1da9f723-6013-4f32-8d64-4bd989c09988'::uuid, -- test claim not anonymouss
  'b4193adf-101f-47ed-9b22-e326f0abfe53'::uuid, -- sdaddadadda
  '542bc466-2288-4fe7-a4d2-dcaacdea6fc9'::uuid, -- testing claim keerti
  '446114b1-aba3-46f9-bd2c-4ce5b3f79f92'::uuid, -- test claim keerti 2
  'cc8ce569-370c-4cd9-a79c-8b4e0f81b7dd'::uuid, -- edit claim keerti
  '28ae4cde-040a-4e10-9aea-53e2fb6ff743'::uuid, -- test claim from keerti
  '9d694740-bfd9-47df-b736-c0fcc76c1d48'::uuid, -- aaaaaaaaaaaaaaaaaaaaaaaaa
  '60221319-7ba5-40b7-9882-d4472ead97f2'::uuid, -- test named claim
  'a436935a-9504-4b01-907a-2a80d4efc829'::uuid  -- i thing this app is great bro
);

-- 5. Delete exactly the 8 identified developer scratch rooms (cascading child test records)
delete from public.rooms
where id in (
  '4e8f8ff0-1bce-4d0f-bc13-5b2ab4da5260'::uuid, -- testtest
  '4120c703-a7e7-4613-9bab-9175c4ae7638'::uuid, -- ai-vs-human
  '107a0b62-1490-4b44-bc5f-4dad46057112'::uuid, -- qa-private-debate
  '68f90af9-0620-4b21-a4bc-ff80a1f3e698'::uuid, -- test-debate-title
  'a5340b87-007c-48c4-ae24-077b717739e5'::uuid, -- access-code-join-verification-946474
  '9ab2736a-c76a-4e40-972f-91a915c61e63'::uuid, -- invitation-flow-qa-946474
  '4262609f-8c15-421f-8b7f-ea0e63b71b65'::uuid, -- access-code-join-verification-826082
  'c5aa2f14-0976-4d8f-882b-5f6f6762ccd8'::uuid  -- invitation-flow-qa-826082
);

-- Re-enable all triggers immediately after administrative purge
alter table public.claims enable trigger claim_delete_with_lock;
alter table public.claim_evidence enable trigger prevent_claim_evidence_deletion;
alter table public.evidence enable trigger prevent_evidence_deletion;
alter table public.sources enable trigger prevent_source_deletion;
alter table public.arguments enable trigger argument_delete_with_lock;
alter table public.questions enable trigger prevent_question_deletion;

-- ============================================================================
-- 4. CURATED STARTER DISCOURSE SEEDING (guarded: runs only when owner user exists)
-- ============================================================================
do $$
begin
  if exists (select 1 from auth.users where id = '17265c80-a346-42dd-a86c-6795c500fd15'::uuid) then

-- ----------------------------------------------------------------------------
-- Discussion 1: Synthetic Provenance & Watermarking
-- Topic: Technology (eda196e8-2ed1-405f-b667-06ad9046557e)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'Should synthetic provenance and watermarking be legally required for online media?',
  'Examining technical feasibility, free expression implications, and epistemic security of mandatory digital media provenance standards.',
  'should-synthetic-provenance-be-required-for-ai-media',
  'discussion',
  'eda196e8-2ed1-405f-b667-06ad9046557e'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'As generative models produce photo-realistic imagery and audio at scale, distinguishing synthetic from recorded media becomes critical. Does cryptographic provenance provide an adequate epistemic safeguard, or does mandatory implementation risk anonymity and user privacy?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0010000-0000-4000-8000-000000000001'::uuid,
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'C2PA Technical Specification v1.3',
  'https://c2pa.org/specifications/specifications/1.3/index.html',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0010000-0000-4000-8000-000000000001'::uuid,
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'a0010000-0000-4000-8000-000000000001'::uuid,
  'The Coalition for Content Provenance and Authenticity (C2PA) defines an open standard enabling cryptographic signing of asset provenance and editing history from capture to distribution.',
  'documentary',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0010000-0000-4000-8000-000000000001'::uuid,
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'Cryptographic provenance standards like C2PA verify authenticity without requiring centralized identity disclosure by end users.',
  'fact',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0010000-0000-4000-8000-000000000001'::uuid,
  'e0010000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0010000-0000-4000-8000-000000000001'::uuid,
  'd0010000-0000-4000-8000-000000000001'::uuid,
  'How can provenance metadata survive adversarial image compression, screenshotting, or re-encoding across decentralized platforms?',
  'evidence',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Discussion 2: Science & Epistemics (Replication Crisis)
-- Topic: Science (7784bf9d-d4c3-479d-8a95-7b5fb7f155f8)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'How should scientific institutions address the replication crisis?',
  'Evaluating pre-registration, open research datasets, and academic career incentives to ensure systemic reliability of empirical findings.',
  'how-should-scientific-institutions-respond-to-replication-crisis',
  'discussion',
  '7784bf9d-d4c3-479d-8a95-7b5fb7f155f8'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'Large-scale replication efforts across psychology, medicine, and social science have demonstrated that many published findings fail independent replication. What structural institutional reforms best restore epistemic trust?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0020000-0000-4000-8000-000000000001'::uuid,
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'Open Science Collaboration: Estimating the reproducibility of psychological science (Science 2015)',
  'https://www.science.org/doi/10.1126/science.aac4716',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0020000-0000-4000-8000-000000000001'::uuid,
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'a0020000-0000-4000-8000-000000000001'::uuid,
  'In a collaborative study replicating 100 experimental and correlational studies, only 36 percent of replications yielded statistically significant findings compared to 97 percent of original studies.',
  'statistical',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0020000-0000-4000-8000-000000000001'::uuid,
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'Mandatory study pre-registration significantly reduces publication bias and p-hacking in empirical sciences.',
  'observation',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0020000-0000-4000-8000-000000000001'::uuid,
  'e0020000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0020000-0000-4000-8000-000000000001'::uuid,
  'd0020000-0000-4000-8000-000000000002'::uuid,
  'Does strict pre-registration discourage exploratory research or discovery of serendipitous scientific phenomena?',
  'perspective',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Discussion 3: Education in the Age of Generative AI
-- Topic: Education (a129c3b2-9ecb-4862-9149-4a141973f6a9)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'What should formal education prioritize in the age of generative intelligence?',
  'Rethinking curriculum design, evaluation criteria, and critical inquiry when automated synthesis tools are universally accessible.',
  'what-should-education-prioritize-in-the-age-of-generative-ai',
  'discussion',
  'a129c3b2-9ecb-4862-9149-4a141973f6a9'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'When machines generate essays, code, and mathematical explanations instantaneously, assessment models based on output production break down. How must pedagogical goals shift toward epistemic evaluation and primary thinking?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0030000-0000-4000-8000-000000000001'::uuid,
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'UNESCO Guidance for Generative AI in Education and Research (2023)',
  'https://unesdoc.unesco.org/ark:/48223/pf0000386693',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0030000-0000-4000-8000-000000000001'::uuid,
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'a0030000-0000-4000-8000-000000000001'::uuid,
  'UNESCO recommends establishing age and pedagogical boundaries for AI use, emphasizing human agency, critical scrutiny, and the preservation of foundational analytical skills.',
  'expert',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0030000-0000-4000-8000-000000000001'::uuid,
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'Assessment must evaluate a students ability to critique and falsify AI-generated reasoning rather than mere essay generation.',
  'proposal',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0030000-0000-4000-8000-000000000001'::uuid,
  'e0030000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0030000-0000-4000-8000-000000000001'::uuid,
  'd0030000-0000-4000-8000-000000000003'::uuid,
  'Can students develop deep domain intuition without engaging in the lower-level cognitive labor that AI tools now automate?',
  'clarification',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Discussion 4: Ethics of Algorithmic Influence & Autonomy
-- Topic: Philosophy (f07efba5-bfad-4016-a2b2-bfa64586e86b)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'When does algorithmic personalization become epistemic coercion?',
  'Analyzing the threshold between beneficial recommendation and manipulative behavioral steering under cognitive vulnerability.',
  'when-does-algorithmic-personalization-become-coercive',
  'discussion',
  'f07efba5-bfad-4016-a2b2-bfa64586e86b'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'Personalization feeds maximize engagement by presenting content aligned with existing cognitive biases and emotional vulnerabilities. At what point does optimization of attention cross into undermining individual moral autonomy?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0040000-0000-4000-8000-000000000001'::uuid,
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'EU Digital Services Act (Regulation 2022/2065, Article 34 Risk Assessments)',
  'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0040000-0000-4000-8000-000000000001'::uuid,
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'a0040000-0000-4000-8000-000000000001'::uuid,
  'The EU Digital Services Act mandates that very large online platforms assess systemic risks stemming from algorithmic design, including negative effects on fundamental rights, mental well-being, and civic discourse.',
  'documentary',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0040000-0000-4000-8000-000000000001'::uuid,
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'Continuous predictive feedback loops erode deliberative agency by pre-selecting belief environments without user consent.',
  'opinion',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0040000-0000-4000-8000-000000000001'::uuid,
  'e0040000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0040000-0000-4000-8000-000000000001'::uuid,
  'd0040000-0000-4000-8000-000000000004'::uuid,
  'Can an algorithm optimize for user value without inevitably developing an implicit model of user exploitability?',
  'clarification',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Discussion 5: Epistemic Disagreement & Structured Inquiry
-- Topic: Culture (4cc803c9-5ead-40fd-8beb-f5a291c40868)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'Can structured deliberation improve mutual understanding across polarized communities?',
  'Investigating whether separating claims from evidence and distinguishing facts from values mitigates affective polarization.',
  'can-structured-disagreement-improve-mutual-understanding',
  'discussion',
  '4cc803c9-5ead-40fd-8beb-f5a291c40868'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'Online discourse platforms typically reward outrage and rapid reactivity. Does imposing structural constraints—such as requiring source citations, explicit inquiries, and claim modularity—foster genuine convergence or merely entrench disagreement?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0050000-0000-4000-8000-000000000001'::uuid,
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'Fishkin et al.: Deliberative Polling and Policy Attitude Change (British Journal of Political Science)',
  'https://www.cambridge.org/core/journals/british-journal-of-political-science',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0050000-0000-4000-8000-000000000001'::uuid,
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'a0050000-0000-4000-8000-000000000001'::uuid,
  'Empirical research on deliberative polling indicates that when citizens engage with balanced briefing materials and structured small-group deliberation, substantive knowledge increases and polarization decreases significantly.',
  'scientific',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0050000-0000-4000-8000-000000000001'::uuid,
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'Separating empirical claims from moral value premises clarifies the true root of intractable public disputes.',
  'fact',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0050000-0000-4000-8000-000000000001'::uuid,
  'e0050000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0050000-0000-4000-8000-000000000001'::uuid,
  'd0050000-0000-4000-8000-000000000005'::uuid,
  'What friction mechanisms effectively slow down emotional reactivity without discouraging user participation?',
  'reflective',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Discussion 6: Privacy vs Public Health Data Governance
-- Topic: Ethics (fcab9d43-50c3-4dc2-a558-2b98d4dabfd5)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'Balancing individual digital privacy with population-level health surveillance',
  'Analyzing data governance models for epidemiology, synthetic datasets, and differential privacy during health crises.',
  'balancing-digital-privacy-with-public-health-data',
  'discussion',
  'fcab9d43-50c3-4dc2-a558-2b98d4dabfd5'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.discussions (id, opening_statement)
values (
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'Rapid identification of epidemiological trends requires access to aggregated health and mobility records. How can societies safeguard personal data integrity while enabling rapid scientific response to emerging health emergencies?'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0060000-0000-4000-8000-000000000001'::uuid,
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'WHO Global Strategy on Digital Health (2020-2025)',
  'https://www.who.int/publications/i/item/9789240020924',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0060000-0000-4000-8000-000000000001'::uuid,
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'a0060000-0000-4000-8000-000000000001'::uuid,
  'The World Health Organization framework stresses that digital health systems must ensure legal and ethical data governance, confidentiality, and citizen consent to sustain public trust.',
  'documentary',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0060000-0000-4000-8000-000000000001'::uuid,
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'Differential privacy enables epidemiologists to extract statistical insights without reconstructing individual patient trajectories.',
  'fact',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0060000-0000-4000-8000-000000000001'::uuid,
  'e0060000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.questions (id, room_id, content, question_type, created_by)
values (
  'f0060000-0000-4000-8000-000000000001'::uuid,
  'd0060000-0000-4000-8000-000000000006'::uuid,
  'At what sample size does differential privacy noise obscure critical early detection of rare infectious outbreaks?',
  'clarification',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Debate 1: Autonomous Weapons Systems
-- Topic: Ethics (fcab9d43-50c3-4dc2-a558-2b98d4dabfd5)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'Autonomous weapons systems should be banned under international humanitarian law',
  'Examining the legal, moral, and strategic implications of lethal autonomous systems operating without meaningful human control.',
  'autonomous-weapons-systems-should-be-banned',
  'debate',
  'fcab9d43-50c3-4dc2-a558-2b98d4dabfd5'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.debates (id, proposition_title, opposition_title, opening_statement, status)
values (
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'Lethal Autonomous Weapons Must Be Banned',
  'Defensive Autonomy Reduces Harm & Collateral Damage',
  'Should the international community establish a legally binding treaty prohibiting the development and deployment of autonomous weapon systems that select and apply force against targets without human intervention?',
  'active'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0070000-0000-4000-8000-000000000001'::uuid,
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'ICRC Position on Autonomous Weapon Systems (2021)',
  'https://www.icrc.org/en/document/icrc-position-autonomous-weapon-systems',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0070000-0000-4000-8000-000000000001'::uuid,
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'a0070000-0000-4000-8000-000000000001'::uuid,
  'The International Committee of the Red Cross recommends legally binding rules prohibiting autonomous weapon systems that target humans directly, citing incompatibility with ethical principles of human dignity and humanitarian protection.',
  'documentary',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0070000-0000-4000-8000-000000000001'::uuid,
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'Delegating lethal decisions to autonomous algorithms violates the fundamental legal requirements of distinction and proportionality.',
  'proposal',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
),
(
  'c0070000-0000-4000-8000-000000000002'::uuid,
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'Autonomous defensive intercept systems provide superior reaction times and can reduce civilian casualties during missile attacks.',
  'opinion',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0070000-0000-4000-8000-000000000001'::uuid,
  'e0070000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.arguments (id, room_id, claim_id, content, stance, created_by)
values (
  'a0070000-0000-4000-8000-000000000001'::uuid,
  'd0070000-0000-4000-8000-000000000007'::uuid,
  'c0070000-0000-4000-8000-000000000001'::uuid,
  'Because machine learning algorithms operate probabilistically based on training distributions, they cannot replicate the contextual moral judgment required under the Martens Clause of international law.',
  'supporting',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Debate 2: Algorithmic Transparency
-- Topic: Technology (eda196e8-2ed1-405f-b667-06ad9046557e)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'Large-scale recommendation algorithms must provide public access to their core ranking criteria',
  'Weighing user agency and democratic oversight against intellectual property protection and preventing adversarial gaming.',
  'recommendation-algorithms-must-provide-public-source-access',
  'debate',
  'eda196e8-2ed1-405f-b667-06ad9046557e'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.debates (id, proposition_title, opposition_title, opening_statement, status)
values (
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'Mandatory Public Auditing & Open Ranking Criteria',
  'Protecting Proprietary Innovation & Preventing Gaming',
  'Should dominant digital platforms be legally compelled to expose the optimization weights, ranking signals, and objective functions that govern the distribution of public news and information?',
  'active'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0080000-0000-4000-8000-000000000001'::uuid,
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'ACM Statement on Algorithmic Transparency and Accountability (2017)',
  'https://www.acm.org/binaries/content/assets/public-policy/2017_usacm_statement_algorithms.pdf',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0080000-0000-4000-8000-000000000001'::uuid,
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'a0080000-0000-4000-8000-000000000001'::uuid,
  'The Association for Computing Machinery states that algorithmic systems carrying significant societal impact must provide access to their design, data, and models for independent inspection to ensure accountability and detect bias.',
  'expert',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0080000-0000-4000-8000-000000000001'::uuid,
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'Without independent auditing of ranking weights, civil society cannot identify ideological distortion or anti-competitive self-preferencing.',
  'proposal',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
),
(
  'c0080000-0000-4000-8000-000000000002'::uuid,
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'Full public access to ranking criteria allows spammers and bad actors to systematically game recommendation systems.',
  'prediction',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0080000-0000-4000-8000-000000000001'::uuid,
  'e0080000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.arguments (id, room_id, claim_id, content, stance, created_by)
values (
  'a0080000-0000-4000-8000-000000000001'::uuid,
  'd0080000-0000-4000-8000-000000000008'::uuid,
  'c0080000-0000-4000-8000-000000000001'::uuid,
  'Public transparency can be structured through vetted third-party academic auditing frameworks without exposing trade secrets to commercial rivals.',
  'supporting',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Debate 3: Academic AI Disclosure
-- Topic: Education (a129c3b2-9ecb-4862-9149-4a141973f6a9)
-- ----------------------------------------------------------------------------
insert into public.rooms (id, title, description, slug, room_type, topic_id, created_by, status, visibility)
values (
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'Generative AI writing assistance should be permissible in academic publications with disclosure',
  'Debating epistemic leveling for non-native authors against accountability, intellectual attribution, and hallucinations in peer review.',
  'generative-ai-writing-should-be-permitted-in-academia',
  'debate',
  'a129c3b2-9ecb-4862-9149-4a141973f6a9'::uuid,
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid,
  'open',
  'public'
) on conflict (id) do nothing;

insert into public.debates (id, proposition_title, opposition_title, opening_statement, status)
values (
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'AI Writing Tools Level the Playing Field with Disclosure',
  'Author Accountability Requires Pure Human Authorship',
  'Should peer-reviewed scholarly journals explicitly permit authors to use generative large language models for drafting, editing, and literature synthesis provided the assistance is transparently declared?',
  'active'
) on conflict (id) do nothing;

insert into public.sources (id, room_id, title, url, created_by)
values (
  'a0090000-0000-4000-8000-000000000001'::uuid,
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'Nature Publishing Policy on Generative AI in Papers (2023)',
  'https://www.nature.com/nature/for-authors/initial-submission',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.evidence (id, room_id, source_id, content, evidence_type, created_by)
values (
  'e0090000-0000-4000-8000-000000000001'::uuid,
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'a0090000-0000-4000-8000-000000000001'::uuid,
  'Nature editorial guidelines prohibit large language models from being listed as authors, but permit their use as writing and research tools when documented transparently in the methods or acknowledgments sections.',
  'documentary',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claims (id, room_id, content, claim_type, created_by)
values (
  'c0090000-0000-4000-8000-000000000001'::uuid,
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'Permitting AI editing reduces systemic language barriers for non-native English scholars without compromising empirical validity.',
  'opinion',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
),
(
  'c0090000-0000-4000-8000-000000000002'::uuid,
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'LLM-generated prose frequently hallucinates subtle citations and introduces unverified synthesis errors into scientific literature.',
  'observation',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;

insert into public.claim_evidence (claim_id, evidence_id, direction, created_by)
values (
  'c0090000-0000-4000-8000-000000000001'::uuid,
  'e0090000-0000-4000-8000-000000000001'::uuid,
  'support',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (claim_id, evidence_id) do nothing;

insert into public.arguments (id, room_id, claim_id, content, stance, created_by)
values (
  'a0090000-0000-4000-8000-000000000001'::uuid,
  'd0090000-0000-4000-8000-000000000009'::uuid,
  'c0090000-0000-4000-8000-000000000001'::uuid,
  'Peer review should evaluate the novelty and methodological soundness of scientific ideas, not penalize scholars for imperfect linguistic fluency in English.',
  'supporting',
  '17265c80-a346-42dd-a86c-6795c500fd15'::uuid
) on conflict (id) do nothing;
  end if;
end $$;
