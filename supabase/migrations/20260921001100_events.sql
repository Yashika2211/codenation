-- CodeNation · 0011 · hackathons, tracks and brackets
--
-- Section 6 calls for an events screen with a real countdown, track cards, a
-- finals bracket and a leaderboard. None of that can be honest without rows to
-- read, so this is the table set behind it.

do $$ begin
  create type public.event_state as enum ('draft', 'upcoming', 'live', 'judging', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_bracket as enum ('participant', 'track_finalist', 'finalist', 'winner');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  description_md text not null default '',
  state       public.event_state not null default 'upcoming',
  -- [{ slug, name, description, accent }]
  tracks      jsonb not null default '[]'::jsonb,
  prize       jsonb not null default '{}'::jsonb,
  accent      text not null default 'plasma',
  featured    boolean not null default false,
  is_seed     boolean not null default false,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now(),

  constraint events_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,59})$'),
  constraint events_window check (ends_at > starts_at),
  constraint events_accent_allowed check (accent in ('flux','ion','plasma','signal','amber'))
);

create index if not exists events_state_idx on public.events (state, starts_at desc);
create unique index if not exists events_one_featured_idx on public.events (featured)
  where featured = true;

-- ---------------------------------------------------------------------------

create table if not exists public.event_entries (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  track      text not null default 'open',
  score      integer not null default 0,
  placement  integer,
  bracket    public.event_bracket not null default 'participant',
  submission_url text,
  joined_at  timestamptz not null default now(),

  primary key (event_id, user_id)
);

create index if not exists event_entries_leaderboard_idx
  on public.event_entries (event_id, score desc);
create index if not exists event_entries_user_idx on public.event_entries (user_id);

-- ---------------------------------------------------------------------------

create table if not exists public.event_matches (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  -- 1 = final, 2 = semi, 3 = quarter. Counting inward reads better in the UI.
  round      integer not null check (round between 1 and 6),
  slot       integer not null check (slot >= 0),
  player_a   uuid references public.profiles (id) on delete set null,
  player_b   uuid references public.profiles (id) on delete set null,
  winner_id  uuid references public.profiles (id) on delete set null,
  score_a    integer,
  score_b    integer,
  created_at timestamptz not null default now(),

  unique (event_id, round, slot)
);

create index if not exists event_matches_bracket_idx on public.event_matches (event_id, round, slot);

-- ---------------------------------------------------------------------------
-- RLS: everything here is public to read. Joining is a server action, and
-- scores are written only by server code, so there is no client write policy.
-- ---------------------------------------------------------------------------

alter table public.events        enable row level security;
alter table public.event_entries enable row level security;
alter table public.event_matches enable row level security;

drop policy if exists events_read_all on public.events;
create policy events_read_all on public.events
  for select using (state <> 'draft');

drop policy if exists event_entries_read_all on public.event_entries;
create policy event_entries_read_all on public.event_entries for select using (true);

drop policy if exists event_matches_read_all on public.event_matches;
create policy event_matches_read_all on public.event_matches for select using (true);
