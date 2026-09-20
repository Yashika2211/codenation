-- CodeNation · 0006 · item definitions, forged instances, inventory and loadout

create table if not exists public.item_definitions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  kind          public.item_kind not null,
  rarity        public.rarity not null default 'common',
  description   text not null default '',
  unlock_rule   jsonb not null default '{}'::jsonb,
  base_params   jsonb not null default '{}'::jsonb,
  craftable     boolean not null default false,
  cost          jsonb not null default '{}'::jsonb,
  requires_rep  integer not null default 0,
  requires_tech uuid[] not null default '{}',
  created_at    timestamptz not null default now(),

  -- Section 5.3 rule 1: every craftable sits at or above the Forge threshold.
  constraint item_definitions_craftable_rep
    check (not craftable or requires_rep >= 3000)
);

create index if not exists item_definitions_kind_idx
  on public.item_definitions (kind, rarity);
create index if not exists item_definitions_craftable_idx
  on public.item_definitions (requires_rep) where craftable = true;

-- ---------------------------------------------------------------------------

create table if not exists public.item_instances (
  id            uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.item_definitions (id) on delete restrict,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  -- A validated ForgeParams blob. Rendering is pure CSS driven by this.
  params        jsonb not null default '{}'::jsonb,
  seed          text not null,
  -- Monotonic per definition, so "Spire #007" is a real, checkable claim.
  serial        integer not null,
  bound         boolean not null default true,
  -- Season the item was forged in. Mythic uniqueness is scoped to this.
  season        integer not null default 1,
  forged_at     timestamptz not null default now(),

  unique (definition_id, serial)
);

create index if not exists item_instances_owner_idx
  on public.item_instances (owner_id, forged_at desc);

/**
 * Section 5.3 rule 4: one mythic per player per season. Enforced here rather
 * than in application code, because a race between two concurrent crafts would
 * otherwise slip both through.
 */
create unique index if not exists item_instances_mythic_per_season_key
  on public.item_instances (owner_id, season)
  where (params ->> 'rarity') = 'mythic';

/** Allocates the next serial for a definition under a row lock. */
create or replace function public.next_item_serial(p_definition uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  -- Lock the definition row so two concurrent crafts cannot claim one serial.
  perform 1 from public.item_definitions where id = p_definition for update;

  select coalesce(max(serial), 0) + 1 into v_next
  from public.item_instances
  where definition_id = p_definition;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------

create table if not exists public.inventory (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  item_instance_id uuid not null references public.item_instances (id) on delete cascade,
  acquired_at      timestamptz not null default now(),
  source           text not null default 'forge',

  primary key (user_id, item_instance_id)
);

create index if not exists inventory_user_idx on public.inventory (user_id, acquired_at desc);

-- ---------------------------------------------------------------------------

create table if not exists public.loadout (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  avatar_frame   uuid references public.item_instances (id) on delete set null,
  workspace_skin uuid references public.item_instances (id) on delete set null,
  banner         uuid references public.item_instances (id) on delete set null,
  title          uuid references public.item_instances (id) on delete set null,
  flag_motif     uuid references public.item_instances (id) on delete set null,
  landmark       uuid references public.item_instances (id) on delete set null,
  updated_at     timestamptz not null default now()
);

drop trigger if exists loadout_touch on public.loadout;
create trigger loadout_touch before update on public.loadout
  for each row execute function public.touch_updated_at();

alter table public.buildings
  drop constraint if exists buildings_custom_item_id_fkey;
alter table public.buildings
  add constraint buildings_custom_item_id_fkey
  foreign key (custom_item_id) references public.item_instances (id) on delete set null;
