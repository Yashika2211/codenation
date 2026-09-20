-- CodeNation · 0002 · identity and nations

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  handle            text not null,
  display_name      text not null,
  bio               text,
  avatar_seed       text not null,
  country_code      text,
  github_login      text,
  github_verified_at timestamptz,
  reputation        integer not null default 0 check (reputation >= 0),
  arena_rating      integer not null default 1200,
  trust_score       integer not null default 100 check (trust_score between 0 and 100),
  nation_id         uuid,
  -- Section 11: seeded citizens are visibly marked and excluded from real counts.
  is_seed           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint profiles_handle_format check (handle ~ '^[a-z0-9](?:[a-z0-9_-]{1,29})$'),
  constraint profiles_country_format check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 280)
);

-- Handles are compared case-insensitively but stored as typed.
create unique index if not exists profiles_handle_lower_key
  on public.profiles (lower(handle));

create index if not exists profiles_reputation_idx
  on public.profiles (reputation desc) where is_seed = false;

create index if not exists profiles_rating_idx
  on public.profiles (arena_rating desc);

create index if not exists profiles_nation_idx
  on public.profiles (nation_id) where nation_id is not null;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.nations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  founder_id  uuid not null references public.profiles (id) on delete cascade,
  -- { base, accent, motif, layout } — rendered as CSS, never as an uploaded file.
  flag        jsonb not null default '{}'::jsonb,
  doctrine    text,
  tier        integer not null default 1 check (tier between 1 and 5),
  prestige    integer not null default 0 check (prestige >= 0),
  accent      text not null default 'flux',
  country_code text,
  is_seed     boolean not null default false,
  founded_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint nations_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,39})$'),
  constraint nations_accent_allowed check (accent in ('flux','ion','plasma','signal','amber')),
  constraint nations_doctrine_length check (doctrine is null or char_length(doctrine) <= 240)
);

create index if not exists nations_prestige_idx on public.nations (prestige desc);
create index if not exists nations_founder_idx on public.nations (founder_id);

drop trigger if exists nations_touch on public.nations;
create trigger nations_touch before update on public.nations
  for each row execute function public.touch_updated_at();

-- Deferred so the two tables can reference each other.
alter table public.profiles
  drop constraint if exists profiles_nation_id_fkey;
alter table public.profiles
  add constraint profiles_nation_id_fkey
  foreign key (nation_id) references public.nations (id) on delete set null;
