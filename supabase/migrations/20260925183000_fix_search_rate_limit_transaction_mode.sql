-- search_content() is read-only in its body, but the Data API pre-request
-- rate limiter records each request in private.data_api_rate_limits.
-- PostgREST uses a read-only transaction for STABLE RPCs, which caused the
-- pre-request INSERT to fail with SQLSTATE 25006. Marking the RPC VOLATILE
-- allows the pre-request hook to run in a read-write transaction. The function
-- itself still performs no data mutation.
alter function public.search_content(text, integer, integer) volatile;
notify pgrst, 'reload schema';
