-- CodeNation · 0009 · column guards and derived counters
--
-- RLS is row-level: `profiles_update_self` lets a signed-in user update their
-- own row, and Postgres cannot narrow that to a subset of columns. These
-- triggers close the gap. Without them a client could PATCH their own
-- reputation straight past every gate in the game.

/** True for server code (service key) and for migrations/seed run as superuser. */
create or replace function public.is_service_role()
returns boolean
language plpgsql
stable
as $$
declare
  v_role text;
begin
  -- Supabase puts the JWT role here; a direct psql session has no JWT at all.
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );

  if v_role = 'service_role' then
    return true;
  end if;

  -- No JWT present: a migration, the seed script, or a scheduled job.
  if v_role is null and current_setting('role', true) in ('postgres', 'none', '') then
    return true;
  end if;

  return false;
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  -- Economy and trust columns move only through server code.
  new.reputation  := old.reputation;
  new.arena_rating := old.arena_rating;
  new.trust_score := old.trust_score;
  new.is_seed     := old.is_seed;
  new.nation_id   := old.nation_id;
  new.github_verified_at := old.github_verified_at;
  -- A handle is claimed once at onboarding, not swapped at will.
  new.handle      := old.handle;
  new.created_at  := old.created_at;

  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns before update on public.profiles
  for each row execute function public.guard_profile_columns();

/** A new profile may not arrive pre-loaded with reputation or a rating edge. */
create or replace function public.guard_profile_insert()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  new.reputation   := 0;
  new.arena_rating := 1200;
  new.trust_score  := 100;
  new.is_seed      := false;
  new.nation_id    := null;
  new.github_verified_at := null;

  return new;
end;
$$;

drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert before insert on public.profiles
  for each row execute function public.guard_profile_insert();

-- ---------------------------------------------------------------------------
-- Nations: the founder may edit presentation, never standing.
-- ---------------------------------------------------------------------------

create or replace function public.guard_nation_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role() then
    return new;
  end if;

  new.prestige   := old.prestige;
  new.tier       := old.tier;
  new.founder_id := old.founder_id;
  new.slug       := old.slug;
  new.is_seed    := old.is_seed;
  new.founded_at := old.founded_at;

  return new;
end;
$$;

drop trigger if exists nations_guard_columns on public.nations;
create trigger nations_guard_columns before update on public.nations
  for each row execute function public.guard_nation_columns();

-- ---------------------------------------------------------------------------
-- Derived counters on `problems`, so a list page never runs an aggregate.
-- ---------------------------------------------------------------------------

create or replace function public.sync_problem_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.problems
      set attempt_count = attempt_count + 1
      where id = new.problem_id;
    return new;
  end if;

  -- Only the transition into 'accepted' counts, and only the user's first one.
  if tg_op = 'UPDATE'
     and new.status = 'accepted'
     and old.status is distinct from 'accepted'
  then
    if not exists (
      select 1 from public.submissions s
      where s.user_id = new.user_id
        and s.problem_id = new.problem_id
        and s.status = 'accepted'
        and s.id <> new.id
    ) then
      update public.problems
        set solved_count = solved_count + 1,
            first_solver_id = coalesce(first_solver_id, new.user_id)
        where id = new.problem_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_count_attempt on public.submissions;
create trigger submissions_count_attempt after insert on public.submissions
  for each row execute function public.sync_problem_counters();

drop trigger if exists submissions_count_solve on public.submissions;
create trigger submissions_count_solve after update on public.submissions
  for each row execute function public.sync_problem_counters();

-- ---------------------------------------------------------------------------
-- Guestbook: pin the author and the timestamp regardless of what was posted.
-- ---------------------------------------------------------------------------

create or replace function public.guard_guestbook_insert()
returns trigger
language plpgsql
as $$
begin
  if not public.is_service_role() then
    new.author_id := coalesce(auth.uid(), new.author_id);
    new.at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists guestbook_guard_insert on public.guestbook;
create trigger guestbook_guard_insert before insert on public.guestbook
  for each row execute function public.guard_guestbook_insert();
