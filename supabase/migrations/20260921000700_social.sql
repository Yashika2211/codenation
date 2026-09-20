-- CodeNation · 0007 · alliances, trade, presence, feed and moderation

create table if not exists public.alliances (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  charter_md text not null default '',
  treasury   jsonb not null default '{}'::jsonb,
  tier       integer not null default 1 check (tier between 1 and 5),
  accent     text not null default 'ion',
  founder_id uuid not null references public.profiles (id) on delete cascade,
  founded_at timestamptz not null default now(),

  constraint alliances_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,39})$'),
  constraint alliances_accent_allowed check (accent in ('flux','ion','plasma','signal','amber'))
);

create table if not exists public.alliance_members (
  alliance_id  uuid not null references public.alliances (id) on delete cascade,
  nation_id    uuid not null references public.nations (id) on delete cascade,
  role         public.alliance_role not null default 'member',
  contribution bigint not null default 0,
  joined_at    timestamptz not null default now(),

  primary key (alliance_id, nation_id)
);

create index if not exists alliance_members_nation_idx on public.alliance_members (nation_id);

-- ---------------------------------------------------------------------------

create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  from_nation uuid not null references public.nations (id) on delete cascade,
  to_nation   uuid references public.nations (id) on delete cascade,
  offer       jsonb not null default '{}'::jsonb,
  want        jsonb not null default '{}'::jsonb,
  state       public.trade_state not null default 'open',
  note        text,
  created_at  timestamptz not null default now(),
  settled_at  timestamptz,

  constraint trades_distinct_nations check (to_nation is null or from_nation <> to_nation),
  constraint trades_note_length check (note is null or char_length(note) <= 240)
);

create index if not exists trades_open_idx on public.trades (created_at desc) where state = 'open';
create index if not exists trades_to_nation_idx on public.trades (to_nation, state);

-- ---------------------------------------------------------------------------

create table if not exists public.visits (
  id         uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.profiles (id) on delete cascade,
  nation_id  uuid not null references public.nations (id) on delete cascade,
  at         timestamptz not null default now()
);

create index if not exists visits_nation_idx on public.visits (nation_id, at desc);
-- One visit per visitor per nation per UTC day keeps the counter meaningful.
create unique index if not exists visits_daily_key
  on public.visits (visitor_id, nation_id, (date_trunc('day', at at time zone 'utc')));

create table if not exists public.guestbook (
  id        uuid primary key default gen_random_uuid(),
  nation_id uuid not null references public.nations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body      text not null,
  at        timestamptz not null default now(),

  constraint guestbook_body_length check (char_length(body) between 1 and 400)
);

create index if not exists guestbook_nation_idx on public.guestbook (nation_id, at desc);

-- ---------------------------------------------------------------------------

create table if not exists public.activity_feed (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references public.profiles (id) on delete cascade,
  verb        text not null,
  object_type text not null,
  object_id   uuid,
  nation_id   uuid references public.nations (id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);

create index if not exists activity_feed_recent_idx on public.activity_feed (at desc);
create index if not exists activity_feed_actor_idx on public.activity_feed (actor_id, at desc);
create index if not exists activity_feed_nation_idx on public.activity_feed (nation_id, at desc)
  where nation_id is not null;

-- ---------------------------------------------------------------------------
-- Moderation. Nothing here punishes anyone; it only records what was seen.
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_flags (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,
  subject_type text not null,
  subject_id   uuid not null,
  subject_user uuid references public.profiles (id) on delete cascade,
  confidence   numeric not null default 0 check (confidence between 0 and 1),
  signals      jsonb not null default '{}'::jsonb,
  state        public.flag_state not null default 'watch',
  verdict      text,
  reviewer_id  uuid references public.profiles (id) on delete set null,
  reasoning    text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index if not exists moderation_flags_queue_idx
  on public.moderation_flags (state, confidence desc, created_at);
create index if not exists moderation_flags_subject_idx
  on public.moderation_flags (subject_type, subject_id);

create table if not exists public.appeals (
  id         uuid primary key default gen_random_uuid(),
  flag_id    uuid not null references public.moderation_flags (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  state      public.appeal_state not null default 'open',
  created_at timestamptz not null default now(),
  decided_at timestamptz,

  constraint appeals_body_length check (char_length(body) between 1 and 2000)
);

create index if not exists appeals_flag_idx on public.appeals (flag_id);

-- ---------------------------------------------------------------------------
-- Similarity fingerprints (section 8). Winnowed k-gram hashes, never source.
-- ---------------------------------------------------------------------------

create table if not exists public.submission_fingerprints (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  problem_id    uuid not null references public.problems (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  -- Winnowed k-gram hashes (k=5, window=4) of the normalised source.
  fingerprints  bigint[] not null default '{}',
  token_count   integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists submission_fingerprints_problem_idx
  on public.submission_fingerprints (problem_id);
