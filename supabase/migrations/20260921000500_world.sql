-- CodeNation · 0005 · land, blueprints and buildings

create table if not exists public.blueprints (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  kind           public.zoning not null default 'compute',
  description    text not null default '',
  base_cost      jsonb not null default '{}'::jsonb,
  requires_tech  uuid[] not null default '{}',
  requires_rep   integer not null default 0,
  max_level      integer not null default 5 check (max_level between 1 and 10),
  default_accent text not null default 'flux',
  -- Compute drained per 6h cycle, per level. The economy's main sink.
  upkeep_compute integer not null default 8 check (upkeep_compute >= 0),
  build_minutes  integer not null default 30 check (build_minutes > 0),
  created_at     timestamptz not null default now(),

  constraint blueprints_accent_allowed
    check (default_accent in ('flux','ion','plasma','signal','amber'))
);

create index if not exists blueprints_kind_idx on public.blueprints (kind, requires_rep);

-- ---------------------------------------------------------------------------

create table if not exists public.parcels (
  id          uuid primary key default gen_random_uuid(),
  nation_id   uuid references public.nations (id) on delete set null,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  grid_x      integer not null check (grid_x between 0 and 15),
  grid_y      integer not null check (grid_y between 0 and 15),
  zoning      public.zoning not null default 'compute',
  acquired_at timestamptz not null default now()
);

-- A coordinate inside a nation is unique; unclaimed-nation parcels are unique
-- per owner instead, which is what the personal city grid needs.
create unique index if not exists parcels_nation_coord_key
  on public.parcels (nation_id, grid_x, grid_y) where nation_id is not null;
create unique index if not exists parcels_owner_coord_key
  on public.parcels (owner_id, grid_x, grid_y) where nation_id is null;

create index if not exists parcels_owner_idx on public.parcels (owner_id);
create index if not exists parcels_nation_idx on public.parcels (nation_id) where nation_id is not null;

-- ---------------------------------------------------------------------------

create table if not exists public.buildings (
  id             uuid primary key default gen_random_uuid(),
  parcel_id      uuid not null unique references public.parcels (id) on delete cascade,
  blueprint_id   uuid not null references public.blueprints (id) on delete restrict,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  level          integer not null default 1 check (level between 1 and 10),
  accent         text not null default 'flux',
  state          public.building_state not null default 'queued',
  progress       numeric not null default 0 check (progress between 0 and 1),
  eta            timestamptz,
  -- A forged skin applied to this building. Rendered by <ForgedBuilding>.
  custom_item_id uuid,
  window_density integer not null default 7 check (window_density between 3 and 14),
  last_upkeep_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint buildings_accent_allowed
    check (accent in ('flux','ion','plasma','signal','amber'))
);

create index if not exists buildings_owner_idx on public.buildings (owner_id);
create index if not exists buildings_state_idx on public.buildings (state);
-- Drives the upkeep sweep: the oldest unpaid buildings first.
create index if not exists buildings_upkeep_idx on public.buildings (last_upkeep_at)
  where state in ('complete', 'dormant');

drop trigger if exists buildings_touch on public.buildings;
create trigger buildings_touch before update on public.buildings
  for each row execute function public.touch_updated_at();
