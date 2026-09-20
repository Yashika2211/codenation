-- CodeNation · 0001 · extensions and shared enums
-- Every later migration leans on these types. Nothing in the app ever stores a
-- free-text status where an enum exists.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- ---------------------------------------------------------------------------
-- Work and judging
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.difficulty as enum ('easy', 'medium', 'hard', 'expert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum (
    'queued', 'running', 'accepted', 'wrong_answer', 'tle', 'mle', 'error'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_verdict as enum (
    'pending', 'passed', 'failed', 'tle', 'mle', 'error', 'skipped'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.duel_state as enum ('pending', 'live', 'finished', 'abandoned');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- World
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.building_state as enum ('queued', 'building', 'complete', 'dormant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.zoning as enum ('compute', 'research', 'industry', 'civic', 'forge');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Economy and progression
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.resource as enum ('compute', 'data', 'alloy', 'rep');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tech_state as enum ('locked', 'available', 'researching', 'mastered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rarity as enum ('common', 'rare', 'epic', 'legendary', 'mythic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_kind as enum (
    'avatar_frame', 'workspace_skin', 'building_skin', 'district_prop',
    'flag_motif', 'banner', 'title', 'landmark'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Social and governance
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.alliance_role as enum ('speaker', 'member', 'probation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_state as enum ('open', 'accepted', 'declined', 'withdrawn', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.flag_state as enum ('watch', 'evidence', 'review', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appeal_state as enum ('open', 'upheld', 'overturned', 'withdrawn');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep `updated_at` honest without trusting the client
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
