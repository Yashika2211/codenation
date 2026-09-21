-- Minimal Supabase shim for validating migrations against a plain Postgres.
--
-- Supabase provides the auth schema, the auth.uid()/auth.role() helpers and the
-- anon / authenticated / service_role roles. Recreating just enough of them
-- here means `supabase/migrations/*.sql` can be exercised in CI without a cloud
-- project. This file is NOT part of the migration set and never runs in prod.

create schema if not exists auth;
create schema if not exists extensions;

do $$ begin create role anon nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin noinherit bypassrls; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;
