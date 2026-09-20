-- CodeNation · 0008 · Row Level Security
--
-- RLS is on for every table. Where a table has no policy for an operation, that
-- operation is denied to anon and authenticated outright — only the service role
-- (server code) can perform it. That is deliberate for the ledger, for hidden
-- test cases, and for anything that mints value.

alter table public.profiles               enable row level security;
alter table public.nations                enable row level security;
alter table public.problems               enable row level security;
alter table public.testcases              enable row level security;
alter table public.submissions            enable row level security;
alter table public.submission_runs        enable row level security;
alter table public.duels                  enable row level security;
alter table public.resource_ledger        enable row level security;
alter table public.wallets                enable row level security;
alter table public.tech_nodes             enable row level security;
alter table public.tech_progress          enable row level security;
alter table public.badges                 enable row level security;
alter table public.badge_awards           enable row level security;
alter table public.blueprints             enable row level security;
alter table public.parcels                enable row level security;
alter table public.buildings              enable row level security;
alter table public.item_definitions       enable row level security;
alter table public.item_instances         enable row level security;
alter table public.inventory              enable row level security;
alter table public.loadout                enable row level security;
alter table public.alliances              enable row level security;
alter table public.alliance_members       enable row level security;
alter table public.trades                 enable row level security;
alter table public.visits                 enable row level security;
alter table public.guestbook              enable row level security;
alter table public.activity_feed          enable row level security;
alter table public.moderation_flags       enable row level security;
alter table public.appeals                enable row level security;
alter table public.submission_fingerprints enable row level security;

-- ---------------------------------------------------------------------------
-- Identity: public read, owner-only write.
-- ---------------------------------------------------------------------------

drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
  for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Note: `reputation`, `arena_rating` and `trust_score` are writable by this
-- policy at the row level, which Postgres cannot narrow per column. Migration
-- 0009 adds a trigger that rejects any client-side change to those columns, so
-- the only path to reputation remains a service-role ledger insert.

drop policy if exists nations_read_all on public.nations;
create policy nations_read_all on public.nations
  for select using (true);

drop policy if exists nations_update_founder on public.nations;
create policy nations_update_founder on public.nations
  for update to authenticated
  using (founder_id = (select auth.uid()))
  with check (founder_id = (select auth.uid()));

-- Founding a nation is gated on reputation, so it only happens server-side.

-- ---------------------------------------------------------------------------
-- Problems and test cases.
-- ---------------------------------------------------------------------------

drop policy if exists problems_read_public on public.problems;
create policy problems_read_public on public.problems
  for select using (is_public = true or author_id = (select auth.uid()));

-- Only sample cases are ever visible. Hidden cases have no select policy at
-- all, so they are reachable exclusively with the service key.
drop policy if exists testcases_read_samples on public.testcases;
create policy testcases_read_samples on public.testcases
  for select using (
    is_sample = true
    and exists (
      select 1 from public.problems p
      where p.id = testcases.problem_id and p.is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- Submissions. A user reads their own rows in full; everyone else reads the
-- `submissions_public` view below, which omits source_code entirely.
-- ---------------------------------------------------------------------------

drop policy if exists submissions_read_own on public.submissions;
create policy submissions_read_own on public.submissions
  for select to authenticated using (user_id = (select auth.uid()));

-- Inserts go through a route handler with the service key so the judge, the
-- rate limit and the mint all happen in one place.

create or replace view public.submissions_public
with (security_invoker = false) as
  select
    s.id,
    s.user_id,
    s.problem_id,
    s.duel_id,
    s.language,
    s.status,
    s.passed,
    s.total,
    s.runtime_ms,
    s.memory_kb,
    s.created_at,
    s.judged_at
  from public.submissions s;

grant select on public.submissions_public to anon, authenticated;

drop policy if exists submission_runs_read_own on public.submission_runs;
create policy submission_runs_read_own on public.submission_runs
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_runs.submission_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists duels_read_participant on public.duels;
create policy duels_read_participant on public.duels
  for select using (
    state <> 'pending'
    or player_a = (select auth.uid())
    or player_b = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Economy. The ledger is readable by its owner and writable by nobody but the
-- service role — there is deliberately no insert, update or delete policy.
-- ---------------------------------------------------------------------------

drop policy if exists resource_ledger_read_own on public.resource_ledger;
create policy resource_ledger_read_own on public.resource_ledger
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists wallets_read_own on public.wallets;
create policy wallets_read_own on public.wallets
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists tech_nodes_read_all on public.tech_nodes;
create policy tech_nodes_read_all on public.tech_nodes for select using (true);

drop policy if exists tech_progress_read_own on public.tech_progress;
create policy tech_progress_read_own on public.tech_progress
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists badges_read_all on public.badges;
create policy badges_read_all on public.badges for select using (true);

drop policy if exists badge_awards_read_all on public.badge_awards;
create policy badge_awards_read_all on public.badge_awards for select using (true);

-- ---------------------------------------------------------------------------
-- World.
-- ---------------------------------------------------------------------------

drop policy if exists blueprints_read_all on public.blueprints;
create policy blueprints_read_all on public.blueprints for select using (true);

drop policy if exists parcels_read_all on public.parcels;
create policy parcels_read_all on public.parcels for select using (true);

drop policy if exists buildings_read_all on public.buildings;
create policy buildings_read_all on public.buildings for select using (true);

-- Claiming land and starting construction both spend resources, so both are
-- server-only. No insert or update policy is intentional.

-- ---------------------------------------------------------------------------
-- Items and the Forge. Crafting is server-only for the same reason.
-- ---------------------------------------------------------------------------

drop policy if exists item_definitions_read_all on public.item_definitions;
create policy item_definitions_read_all on public.item_definitions for select using (true);

drop policy if exists item_instances_read_all on public.item_instances;
create policy item_instances_read_all on public.item_instances for select using (true);

drop policy if exists inventory_read_own on public.inventory;
create policy inventory_read_own on public.inventory
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists loadout_read_all on public.loadout;
create policy loadout_read_all on public.loadout for select using (true);

drop policy if exists loadout_write_own on public.loadout;
create policy loadout_write_own on public.loadout
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Social.
-- ---------------------------------------------------------------------------

drop policy if exists alliances_read_all on public.alliances;
create policy alliances_read_all on public.alliances for select using (true);

drop policy if exists alliance_members_read_all on public.alliance_members;
create policy alliance_members_read_all on public.alliance_members for select using (true);

drop policy if exists trades_read_all on public.trades;
create policy trades_read_all on public.trades for select using (true);

drop policy if exists visits_read_all on public.visits;
create policy visits_read_all on public.visits for select using (true);

drop policy if exists guestbook_read_all on public.guestbook;
create policy guestbook_read_all on public.guestbook for select using (true);

-- A guestbook entry is the one social write a client may perform directly: it
-- costs nothing, and the author is pinned to the caller.
drop policy if exists guestbook_insert_self on public.guestbook;
create policy guestbook_insert_self on public.guestbook
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists guestbook_delete_own on public.guestbook;
create policy guestbook_delete_own on public.guestbook
  for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists activity_feed_read_all on public.activity_feed;
create policy activity_feed_read_all on public.activity_feed for select using (true);

-- ---------------------------------------------------------------------------
-- Moderation. Verdicts are public; raw signals are not.
-- ---------------------------------------------------------------------------

drop policy if exists moderation_flags_read_resolved on public.moderation_flags;
create policy moderation_flags_read_resolved on public.moderation_flags
  for select using (state = 'resolved' or subject_user = (select auth.uid()));

drop policy if exists appeals_read_own on public.appeals;
create policy appeals_read_own on public.appeals
  for select to authenticated using (author_id = (select auth.uid()));

drop policy if exists appeals_insert_own on public.appeals;
create policy appeals_insert_own on public.appeals
  for insert to authenticated with check (author_id = (select auth.uid()));

-- Fingerprints are an internal signal. No client policy at all.
