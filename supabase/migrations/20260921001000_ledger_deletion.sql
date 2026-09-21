-- CodeNation · 0010 · make account deletion possible
--
-- Found by scripts/sql/invariants.sql running against a real Postgres.
--
-- `resource_ledger.user_id` is `on delete cascade`, but the append-only trigger
-- rejected every delete unconditionally — so the cascade could never fire and
-- deleting a profile raised "resource_ledger is append-only". A user who asked
-- to be removed could not be.
--
-- The fix keeps the guarantee that matters: the ledger is immutable to clients,
-- and no row's `delta` can ever be edited by anyone. Deletion is permitted only
-- to server code, which is the only thing that can reach a cascade anyway.

create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  -- An edited ledger row would silently desynchronise every derived balance.
  -- There is no caller, privileged or not, that should ever do this.
  if tg_op = 'UPDATE' then
    raise exception 'resource_ledger is append-only';
  end if;

  -- Deletion is only reachable by server code, and only as part of removing
  -- the account the rows belong to.
  if tg_op = 'DELETE' and not public.is_service_role() then
    raise exception 'resource_ledger is append-only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists resource_ledger_no_update on public.resource_ledger;

-- Split so each trigger returns the row Postgres expects for its operation.
create trigger resource_ledger_no_update before update on public.resource_ledger
  for each row execute function public.reject_ledger_mutation();

create trigger resource_ledger_guard_delete before delete on public.resource_ledger
  for each row execute function public.reject_ledger_mutation();

/**
 * Removes an account and everything derived from it.
 *
 * Deleting the auth user cascades to `profiles`, and from there to the ledger,
 * wallets, submissions and inventory. Exposed as a function so the deletion
 * path is one auditable statement rather than a script someone reinvents.
 */
create or replace function public.delete_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_service_role() then
    raise exception 'delete_account is server-only';
  end if;

  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
