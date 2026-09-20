-- CodeNation · 0003 · problems, test cases, submissions and duels

create table if not exists public.problems (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  difficulty      public.difficulty not null,
  topics          text[] not null default '{}',
  statement_md    text not null,
  constraints_md  text,
  time_limit_ms   integer not null default 2000 check (time_limit_ms between 250 and 15000),
  memory_limit_mb integer not null default 256 check (memory_limit_mb between 16 and 1024),
  author_id       uuid references public.profiles (id) on delete set null,
  is_public       boolean not null default true,
  -- Denormalised counters, maintained by trigger. Cheap list rendering.
  solved_count    integer not null default 0,
  attempt_count   integer not null default 0,
  -- Set once, by the first accepted submission. Drives the first-solver bonus.
  first_solver_id uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint problems_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,79})$')
);

create index if not exists problems_public_idx on public.problems (difficulty, created_at desc)
  where is_public = true;
create index if not exists problems_topics_idx on public.problems using gin (topics);

-- ---------------------------------------------------------------------------
-- Test cases. Non-sample rows never leave the server (see the RLS migration).
-- ---------------------------------------------------------------------------

create table if not exists public.testcases (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  input      text not null default '',
  expected   text not null default '',
  is_sample  boolean not null default false,
  weight     integer not null default 1 check (weight > 0),
  ordinal    integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists testcases_problem_idx on public.testcases (problem_id, ordinal);
create index if not exists testcases_sample_idx on public.testcases (problem_id)
  where is_sample = true;

-- ---------------------------------------------------------------------------

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  problem_id   uuid not null references public.problems (id) on delete cascade,
  duel_id      uuid,
  language     text not null,
  language_version text,
  source_code  text not null,
  status       public.submission_status not null default 'queued',
  passed       integer not null default 0,
  total        integer not null default 0,
  runtime_ms   integer,
  memory_kb    integer,
  -- Aggregates only. The keystroke stream itself is never stored (section 8).
  telemetry    jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  judged_at    timestamptz,

  constraint submissions_source_size check (char_length(source_code) <= 64000)
);

create index if not exists submissions_user_idx on public.submissions (user_id, created_at desc);
create index if not exists submissions_problem_idx on public.submissions (problem_id, created_at desc);
create index if not exists submissions_duel_idx on public.submissions (duel_id) where duel_id is not null;

-- One accepted row per (user, problem) is all the economy ever needs to see:
-- repeat solves mint nothing, and this index is what makes that cheap to check.
create index if not exists submissions_accepted_idx
  on public.submissions (user_id, problem_id)
  where status = 'accepted';

-- ---------------------------------------------------------------------------

create table if not exists public.submission_runs (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  testcase_id   uuid not null references public.testcases (id) on delete cascade,
  ordinal       integer not null default 0,
  verdict       public.run_verdict not null default 'pending',
  runtime_ms    integer,
  memory_kb     integer,
  -- Truncated before insert. Never echo a full stderr back to the client.
  stderr        text,
  created_at    timestamptz not null default now(),

  unique (submission_id, testcase_id)
);

create index if not exists submission_runs_submission_idx
  on public.submission_runs (submission_id, ordinal);

-- ---------------------------------------------------------------------------

create table if not exists public.duels (
  id             uuid primary key default gen_random_uuid(),
  problem_id     uuid not null references public.problems (id) on delete cascade,
  player_a       uuid not null references public.profiles (id) on delete cascade,
  player_b       uuid references public.profiles (id) on delete cascade,
  state          public.duel_state not null default 'pending',
  started_at     timestamptz,
  ends_at        timestamptz,
  winner_id      uuid references public.profiles (id) on delete set null,
  rating_delta_a integer,
  rating_delta_b integer,
  created_at     timestamptz not null default now(),

  constraint duels_distinct_players check (player_b is null or player_a <> player_b)
);

create index if not exists duels_player_a_idx on public.duels (player_a, created_at desc);
create index if not exists duels_player_b_idx on public.duels (player_b, created_at desc);
create index if not exists duels_open_idx on public.duels (created_at desc) where state = 'pending';

alter table public.submissions
  drop constraint if exists submissions_duel_id_fkey;
alter table public.submissions
  add constraint submissions_duel_id_fkey
  foreign key (duel_id) references public.duels (id) on delete set null;
