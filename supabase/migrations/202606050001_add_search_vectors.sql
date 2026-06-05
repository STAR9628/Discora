-- Sprint 9: Add tsvector columns and GIN indexes for full-text search (ADR-025)

-- 1. Rooms: search across title (weight A) and description (weight B)
alter table public.rooms
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(nullif(description, ''), '')), 'B')
  ) stored;

create index if not exists rooms_search_idx on public.rooms using gin (search_vector);

-- 2. Messages: search across content (weight A)
alter table public.messages
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) stored;

create index if not exists messages_search_idx on public.messages using gin (search_vector);

-- 3. Claims: search across content (weight A)
alter table public.claims
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) stored;

create index if not exists claims_search_idx on public.claims using gin (search_vector);

-- 4. Evidence: search across content (weight A)
alter table public.evidence
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) stored;

create index if not exists evidence_search_idx on public.evidence using gin (search_vector);

-- 5. Questions: search across content (weight A)
alter table public.questions
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) stored;

create index if not exists questions_search_idx on public.questions using gin (search_vector);
