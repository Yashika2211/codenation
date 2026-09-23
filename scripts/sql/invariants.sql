-- Security and economy invariants, asserted against a real Postgres.
--
-- Run by `pnpm verify:db`, which applies the shim, every migration and the seed
-- to a throwaway container first. These are the properties the whole game rests
-- on: if any of them regress, reputation can be minted from a browser.
--
-- Every check raises on failure, so a non-zero psql exit is the whole result.

\set ON_ERROR_STOP on

-- Supabase issues these grants itself; the shim must match for a fair test.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Start from a clean slate so the script is re-runnable against the same
-- database. This also exercises the account-deletion path from migration 0010.
begin;
  set local request.jwt.claim.role = 'service_role';
  delete from auth.users where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );
commit;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','owner@example.test'),
  ('22222222-2222-2222-2222-222222222222','victim@example.test'),
  ('33333333-3333-3333-3333-333333333333','newcomer@example.test')
on conflict do nothing;

begin;
  set local request.jwt.claim.role = 'service_role';
  insert into public.profiles (id, handle, display_name, avatar_seed, reputation)
  values ('11111111-1111-1111-1111-111111111111','owner','Owner','seed-owner',500)
  on conflict (id) do update set reputation = 500, arena_rating = 1200, trust_score = 100,
    handle = 'owner', display_name = 'Owner';

  insert into public.profiles (id, handle, display_name, avatar_seed, reputation)
  values ('22222222-2222-2222-2222-222222222222','victim','Victim','seed-victim',7000)
  on conflict (id) do update set display_name = 'Victim', reputation = 7000;
commit;

do $$
declare
  v_int bigint;
  v_text text;
  v_bool boolean;
  v_problem uuid;
begin
  select id into v_problem from public.problems where slug = 'sum-of-a-line';

  -- 1. A ledger insert folds into the wallet and into reputation.
  insert into public.resource_ledger (user_id, resource, delta, reason, ref_table, ref_id)
  values ('11111111-1111-1111-1111-111111111111','compute',600,'invariant-check','problems',v_problem);

  select compute into v_int from public.wallets where user_id = '11111111-1111-1111-1111-111111111111';
  if v_int is distinct from 600 then
    raise exception 'ledger did not fold into wallet: got %', v_int;
  end if;

  -- 2. The idempotency index blocks a repeated mint.
  begin
    insert into public.resource_ledger (user_id, resource, delta, reason, ref_table, ref_id)
    values ('11111111-1111-1111-1111-111111111111','compute',600,'invariant-check','problems',v_problem);
    raise exception 'duplicate mint was allowed';
  exception when unique_violation then null;
  end;

  -- 3. The ledger is append-only.
  begin
    update public.resource_ledger set delta = 1 where reason = 'invariant-check';
    raise exception 'ledger update was allowed';
  exception when others then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;

  -- Deletion is server-only: a client must not be able to erase their history,
  -- while account removal (migration 0010) still has to work.
  --
  -- RLS refuses this by matching zero rows rather than raising, so the property
  -- to assert is that the row survives -- not that an error was thrown.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  set local request.jwt.claim.role = 'authenticated';
  delete from public.resource_ledger where reason = 'invariant-check';
  reset role;

  select count(*) into v_int from public.resource_ledger where reason = 'invariant-check';
  if v_int <> 1 then
    raise exception 'client deleted their own ledger history (% rows left)', v_int;
  end if;

  -- 4. A new profile cannot arrive pre-loaded with standing.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  set local request.jwt.claim.role = 'authenticated';

  insert into public.profiles (id, handle, display_name, avatar_seed, reputation, arena_rating, is_seed)
  values ('33333333-3333-3333-3333-333333333333','newcomer','Newcomer','seed-new',50000,2800,true)
  on conflict (id) do nothing;

  select reputation into v_int from public.profiles where id = '33333333-3333-3333-3333-333333333333';
  if v_int is distinct from 0 then
    raise exception 'client inserted a profile with reputation %', v_int;
  end if;
  select is_seed into v_bool from public.profiles where id = '33333333-3333-3333-3333-333333333333';
  if v_bool then raise exception 'client marked itself as a seeded citizen'; end if;

  reset role;
end $$;

-- 5. A signed-in client cannot patch economy columns on their own row.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  set local request.jwt.claim.role = 'authenticated';
  update public.profiles
    set reputation = 999999, arena_rating = 3000, trust_score = 0, handle = 'stolen',
        display_name = 'Renamed By Client'
    where id = '11111111-1111-1111-1111-111111111111';
commit;

do $$
declare r int; a int; t int; h text; d text;
begin
  select reputation, arena_rating, trust_score, handle, display_name
    into r, a, t, h, d
  from public.profiles where id = '11111111-1111-1111-1111-111111111111';

  if r <> 500 then raise exception 'client patched reputation to %', r; end if;
  if a <> 1200 then raise exception 'client patched arena_rating to %', a; end if;
  if t <> 100 then raise exception 'client patched trust_score to %', t; end if;
  if h <> 'owner' then raise exception 'client patched handle to %', h; end if;
  -- Presentation columns are the client's to change, and must still work.
  if d <> 'Renamed By Client' then raise exception 'client could not change display_name'; end if;
end $$;

-- 6. A client cannot touch another user's row.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  set local request.jwt.claim.role = 'authenticated';
  update public.profiles set display_name = 'Hijacked'
    where id = '22222222-2222-2222-2222-222222222222';
commit;

do $$
declare d text;
begin
  select display_name into d from public.profiles where id = '22222222-2222-2222-2222-222222222222';
  if d <> 'Victim' then raise exception 'client hijacked another profile (now %)', d; end if;
end $$;

-- 7. A client cannot mint straight into the ledger.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  set local request.jwt.claim.role = 'authenticated';
  do $$
  begin
    insert into public.resource_ledger (user_id, resource, delta, reason)
    values ('11111111-1111-1111-1111-111111111111','rep',100000,'client-mint');
    raise exception 'client minted reputation directly';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like '%client minted%' then raise; end if;
  end $$;
commit;

-- 8. Hidden test cases never reach a client; samples do.
do $$
declare visible int; total int;
begin
  select count(*) into total from public.testcases;

  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  set local request.jwt.claim.role = 'authenticated';
  select count(*) into visible from public.testcases;
  reset role;

  if visible = total then
    raise exception 'every test case is visible to the client (% of %)', visible, total;
  end if;
end $$;

-- 9. An anonymous visitor sees no ledger at all.
do $$
declare n int;
begin
  set local role anon;
  set local request.jwt.claim.role = 'anon';
  select count(*) into n from public.resource_ledger;
  reset role;
  if n <> 0 then raise exception 'anon can read % ledger rows', n; end if;
end $$;

-- 10. Craftables sit at or above the Forge threshold.
do $$
declare n int;
begin
  select count(*) into n from public.item_definitions where craftable and requires_rep < 3000;
  if n > 0 then raise exception '% craftable items sit below 3000 rep', n; end if;
end $$;

-- 12. A craft is atomic: serials are unique under concurrency, and a craft
-- that cannot be paid for changes nothing. Before migration 0012 the serial was
-- allocated in its own transaction, so two concurrent crafts could be handed the
-- same one and the loser paid for an insert that then failed.
do $$
declare
  v_def       uuid;
  v_user      uuid := '11111111-1111-1111-1111-111111111111';
  v_serials   int;
  v_rows      int;
  v_before    bigint;
  v_after     bigint;
begin
  select id into v_def from public.item_definitions where craftable = true limit 1;
  if v_def is null then return; end if;

  insert into public.resource_ledger (user_id, resource, delta, reason)
  values (v_user, 'compute', 100000, 'invariant-fund'),
         (v_user, 'data', 100000, 'invariant-fund'),
         (v_user, 'alloy', 100000, 'invariant-fund');

  -- Sequential here; the concurrent case is exercised by scripts/verify-db.sh.
  -- What this asserts is that each craft takes the next serial and pays once.
  perform public.forge_item(v_user, v_def, '{"rarity":"rare"}'::jsonb, 'inv-a', 1, 10, 5, 1);
  perform public.forge_item(v_user, v_def, '{"rarity":"rare"}'::jsonb, 'inv-b', 1, 10, 5, 1);

  select count(*), count(distinct serial) into v_rows, v_serials
  from public.item_instances where definition_id = v_def and owner_id = v_user;

  if v_rows <> v_serials then
    raise exception 'forge issued a duplicate serial (% rows, % distinct)', v_rows, v_serials;
  end if;

  if not exists (
    select 1 from public.inventory i
    join public.item_instances ii on ii.id = i.item_instance_id
    where i.user_id = v_user and ii.definition_id = v_def
  ) then
    raise exception 'forge did not add the item to inventory';
  end if;

  -- A craft that cannot be paid for must leave nothing behind.
  select compute into v_before from public.wallets where user_id = v_user;
  begin
    perform public.forge_item(v_user, v_def, '{"rarity":"rare"}'::jsonb, 'inv-c', 1, 10, 5, 99999999);
    raise exception 'forge allowed an unaffordable craft';
  exception when others then
    if sqlerrm like '%allowed an unaffordable%' then raise; end if;
  end;

  select compute into v_after from public.wallets where user_id = v_user;
  if v_before is distinct from v_after then
    raise exception 'a failed craft moved the wallet (% -> %)', v_before, v_after;
  end if;
end $$;

-- 11. An account with ledger history can actually be deleted. Before
-- migration 0010 this raised "resource_ledger is append-only" and a user who
-- asked to be removed could not be.
begin;
  set local request.jwt.claim.role = 'service_role';
  delete from auth.users where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );
commit;

do $$
declare n int;
begin
  select count(*) into n from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'account deletion left the profile behind'; end if;

  select count(*) into n from public.resource_ledger
  where user_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'account deletion left % ledger rows behind', n; end if;
end $$;

select 'All database invariants hold.' as result;
