-- CodeNation · 0004 · the ledger, wallets, tech tree and badges
--
-- The ledger is the single source of truth for every balance. `wallets` is a
-- cache maintained by trigger, never written to directly by application code.

create table if not exists public.resource_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  resource   public.resource not null,
  delta      bigint not null,
  reason     text not null,
  ref_table  text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

create index if not exists resource_ledger_user_idx
  on public.resource_ledger (user_id, created_at desc);

-- The heatmap reads this: one row per user per UTC day.
create index if not exists resource_ledger_user_day_idx
  on public.resource_ledger (user_id, (created_at at time zone 'utc'));

-- Idempotency. A mint keyed on (user, reason, ref) can only ever land once, so
-- a retried judge callback cannot double-pay.
create unique index if not exists resource_ledger_idempotency_key
  on public.resource_ledger (user_id, resource, reason, ref_id)
  where ref_id is not null;

-- Diminishing returns needs to count same-kind grants in a rolling 24h window.
create index if not exists resource_ledger_reason_window_idx
  on public.resource_ledger (user_id, reason, created_at desc);

-- ---------------------------------------------------------------------------

create table if not exists public.wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  compute    bigint not null default 0,
  data       bigint not null default 0,
  alloy      bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Balances are derived. This view is the definition; `wallets` is the cache.
create or replace view public.balances as
  select
    p.id as user_id,
    coalesce(sum(l.delta) filter (where l.resource = 'compute'), 0)::bigint as compute,
    coalesce(sum(l.delta) filter (where l.resource = 'data'), 0)::bigint    as data,
    coalesce(sum(l.delta) filter (where l.resource = 'alloy'), 0)::bigint   as alloy,
    coalesce(sum(l.delta) filter (where l.resource = 'rep'), 0)::bigint     as rep
  from public.profiles p
  left join public.resource_ledger l on l.user_id = p.id
  group by p.id;

/**
 * Applies one ledger row to the cached wallet and, for rep, to the profile.
 * Reputation lives on `profiles` because every gate reads it on every request;
 * it is still only ever moved by a ledger insert.
 */
create or replace function public.apply_ledger_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (user_id) values (new.user_id)
  on conflict (user_id) do nothing;

  if new.resource = 'compute' then
    update public.wallets set compute = compute + new.delta, updated_at = now()
      where user_id = new.user_id;
  elsif new.resource = 'data' then
    update public.wallets set data = data + new.delta, updated_at = now()
      where user_id = new.user_id;
  elsif new.resource = 'alloy' then
    update public.wallets set alloy = alloy + new.delta, updated_at = now()
      where user_id = new.user_id;
  elsif new.resource = 'rep' then
    update public.profiles
      set reputation = greatest(0, reputation + new.delta)
      where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists resource_ledger_apply on public.resource_ledger;
create trigger resource_ledger_apply after insert on public.resource_ledger
  for each row execute function public.apply_ledger_row();

-- The ledger is append-only. Not by convention — by trigger.
create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'resource_ledger is append-only';
end;
$$;

drop trigger if exists resource_ledger_no_update on public.resource_ledger;
create trigger resource_ledger_no_update before update or delete on public.resource_ledger
  for each row execute function public.reject_ledger_mutation();

-- ---------------------------------------------------------------------------

create table if not exists public.tech_nodes (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  tier               integer not null check (tier between 1 and 4),
  branch             text not null,
  description        text not null default '',
  cost               jsonb not null default '{}'::jsonb,
  requires           uuid[] not null default '{}',
  unlocks_blueprints uuid[] not null default '{}',
  unlocks_items      uuid[] not null default '{}',
  -- Research advances by solving in the node's topics, not by waiting.
  topics             text[] not null default '{}',
  solves_required    integer not null default 5 check (solves_required > 0),
  -- Absolute position inside its branch panel, so the tree is data-driven.
  pos_x              numeric not null default 0,
  pos_y              numeric not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists tech_nodes_branch_idx on public.tech_nodes (branch, tier);

create table if not exists public.tech_progress (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  node_id         uuid not null references public.tech_nodes (id) on delete cascade,
  state           public.tech_state not null default 'locked',
  progress        numeric not null default 0 check (progress between 0 and 1),
  solves_done     integer not null default 0,
  solves_required integer not null default 5,
  started_at      timestamptz,
  mastered_at     timestamptz,
  updated_at      timestamptz not null default now(),

  primary key (user_id, node_id)
);

create index if not exists tech_progress_mastered_idx
  on public.tech_progress (user_id) where state = 'mastered';

drop trigger if exists tech_progress_touch on public.tech_progress;
create trigger tech_progress_touch before update on public.tech_progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  rarity      public.rarity not null default 'common',
  accent      text not null default 'flux',
  -- A JSON predicate evaluated by lib/progression/rules.ts.
  rule        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint badges_accent_allowed check (accent in ('flux','ion','plasma','signal','amber'))
);

create table if not exists public.badge_awards (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_id   uuid not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  evidence   jsonb not null default '{}'::jsonb,

  primary key (user_id, badge_id)
);

create index if not exists badge_awards_user_idx on public.badge_awards (user_id, awarded_at desc);
