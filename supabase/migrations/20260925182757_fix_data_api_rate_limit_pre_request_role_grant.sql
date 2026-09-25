-- PostgREST db_pre_request executes in the request role context.
-- Keep the function callable by Data API request roles while retaining SECURITY DEFINER.
-- This is required for guest search and authenticated feedback; the function body
-- remains protected and the function is not intended as a public application RPC.
grant execute on function public.check_request() to anon, authenticated;
