-- Migration (RESTORED): 20260925183000_fix_search_rate_limit_transaction_mode
--
-- PROVENANCE: recovered byte-for-byte from production supabase_migrations.schema_migrations
-- statements (read-only inspection). These 9 migrations were applied to production
-- out-of-band on 2026-09-25 and never committed. Restored here verbatim so the
-- local migration chain matches legitimate production history.
-- DO NOT EDIT: any change would fork local history from production reality.
-- Production already has these applied; they are no-ops on push.

alter function public.search_content(text, integer, integer) volatile;
notify pgrst, 'reload schema';
