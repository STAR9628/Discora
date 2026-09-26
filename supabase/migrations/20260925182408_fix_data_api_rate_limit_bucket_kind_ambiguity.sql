-- Migration (RESTORED): 20260925182408_fix_data_api_rate_limit_bucket_kind_ambiguity
--
-- PROVENANCE: recovered byte-for-byte from production supabase_migrations.schema_migrations
-- statements (read-only inspection). These 9 migrations were applied to production
-- out-of-band on 2026-09-25 and never committed. Restored here verbatim so the
-- local migration chain matches legitimate production history.
-- DO NOT EDIT: any change would fork local history from production reality.
-- Production already has these applied; they are no-ops on push.

create or replace function public.check_request()
returns void
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  req_method text := upper(coalesce(nullif(current_setting('request.method', true), ''), ''));
  req_path text := coalesce(nullif(current_setting('request.path', true), ''), '');
  headers json := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  jwt_claims json := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json, '{}'::json);
  authenticated_subject text := nullif(jwt_claims->>'sub', '');
  raw_ip text := trim(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1));
  rate_key text;
  request_scope text;
  v_bucket_kind text;
  bucket_start timestamptz;
  request_limit integer;
  current_count integer;
  secret_value bytea;
begin
  if req_method in ('GET', 'HEAD') or req_method = '' then return; end if;
  if req_path not in ('rpc/search_content','/rpc/search_content','rpc/submit_user_feedback','/rpc/submit_user_feedback') then return; end if;

  if req_path like '%search_content' then
    request_scope := 'search_content';
    v_bucket_kind := 'minute';
    bucket_start := date_trunc('minute', now());
    request_limit := 60;
  else
    request_scope := 'submit_user_feedback';
    v_bucket_kind := '15min';
    bucket_start := date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 00:00:00+00');
    request_limit := 5;
  end if;

  select secret into secret_value
  from private.data_api_rate_limit_secret
  where id = true;

  if authenticated_subject is not null then
    rate_key := 'user:' || authenticated_subject;
  elsif raw_ip <> '' then
    rate_key := 'ip:' || raw_ip;
  else
    return;
  end if;

  rate_key := encode(
    digest(rate_key || ':' || encode(secret_value, 'hex'), 'sha256'),
    'hex'
  );

  insert into private.data_api_rate_limits (
    key_hash, scope, bucket_kind, bucket_start, request_count
  )
  values (rate_key, request_scope, v_bucket_kind, bucket_start, 1)
  on conflict (key_hash, scope, bucket_kind) do update
    set request_count = case
      when private.data_api_rate_limits.bucket_start = excluded.bucket_start
        then private.data_api_rate_limits.request_count + 1
      else 1
    end,
    bucket_start = excluded.bucket_start
  returning request_count into current_count;

  if current_count > request_limit then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'message',
        case
          when request_scope = 'search_content'
            then 'Search rate limit exceeded. Please try again in a minute.'
          else 'Feedback rate limit exceeded. Please try again later.'
        end
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests'
      )::text;
  end if;
end;
$$;

revoke all on function public.check_request() from public, anon, authenticated;
grant execute on function public.check_request() to authenticator;

alter role authenticator set pgrst.db_pre_request = 'public.check_request';

notify pgrst, 'reload config';
