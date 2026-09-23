-- CodeNation · 0012 · make a craft atomic
--
-- `craftItem` used to do three separate round trips: allocate a serial, spend
-- the cost, insert the instance. Each is its own transaction, which leaves two
-- real races:
--
--   1. `next_item_serial` took `FOR UPDATE` on the definition row, but the lock
--      was released when that statement returned. Two concurrent crafts could
--      therefore be handed the same serial, and the second insert would fail on
--      `item_instances_definition_id_serial_key` -- *after* the caller had
--      already paid.
--   2. Even alone, a failure between the spend and the insert burned the
--      resources with nothing to show for it.
--
-- Both collapse into one function. The lock now spans the whole transaction, so
-- a serial cannot be issued twice, and if anything raises, the ledger rows roll
-- back with everything else. Nobody pays for a craft that did not happen.

create or replace function public.forge_item(
  p_user          uuid,
  p_definition    uuid,
  p_params        jsonb,
  p_seed          text,
  p_season        integer,
  p_cost_compute  bigint default 0,
  p_cost_data     bigint default 0,
  p_cost_alloy    bigint default 0
)
returns table (item_id uuid, item_serial integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial   integer;
  v_item     uuid;
  v_compute  bigint;
  v_data     bigint;
  v_alloy    bigint;
begin
  if not public.is_service_role() then
    raise exception 'forge_item is server-only';
  end if;

  -- Held until this transaction commits, which is the whole point.
  perform 1 from public.item_definitions where id = p_definition for update;

  if not found then
    raise exception 'no such item definition';
  end if;

  -- Lock the wallet too, so a concurrent spend cannot overdraw it between the
  -- check below and the debit.
  select compute, data, alloy into v_compute, v_data, v_alloy
  from public.wallets where user_id = p_user for update;

  if not found then
    v_compute := 0; v_data := 0; v_alloy := 0;
  end if;

  if v_compute < p_cost_compute then
    raise exception 'insufficient compute' using errcode = 'P0001';
  end if;
  if v_data < p_cost_data then
    raise exception 'insufficient data' using errcode = 'P0001';
  end if;
  if v_alloy < p_cost_alloy then
    raise exception 'insufficient alloy' using errcode = 'P0001';
  end if;

  select coalesce(max(serial), 0) + 1 into v_serial
  from public.item_instances
  where definition_id = p_definition;

  insert into public.item_instances (definition_id, owner_id, params, seed, serial, bound, season)
  values (p_definition, p_user, p_params, p_seed, v_serial, true, p_season)
  returning id into v_item;

  insert into public.inventory (user_id, item_instance_id, source)
  values (p_user, v_item, 'forge')
  on conflict do nothing;

  -- Debits land last, so a failed insert above never charges anyone.
  if p_cost_compute > 0 then
    insert into public.resource_ledger (user_id, resource, delta, reason, ref_table, ref_id)
    values (p_user, 'compute', -p_cost_compute, 'forge_cost', 'item_instances', v_item);
  end if;
  if p_cost_data > 0 then
    insert into public.resource_ledger (user_id, resource, delta, reason, ref_table, ref_id)
    values (p_user, 'data', -p_cost_data, 'forge_cost', 'item_instances', v_item);
  end if;
  if p_cost_alloy > 0 then
    insert into public.resource_ledger (user_id, resource, delta, reason, ref_table, ref_id)
    values (p_user, 'alloy', -p_cost_alloy, 'forge_cost', 'item_instances', v_item);
  end if;

  return query select v_item, v_serial;
end;
$$;

revoke all on function public.forge_item(uuid, uuid, jsonb, text, integer, bigint, bigint, bigint)
  from public, anon, authenticated;

-- `next_item_serial` is now misleading on its own: the lock it takes does not
-- outlive the call, so the serial it returns can be stale by the time it is
-- used. Kept only so an older deployment does not break on upgrade.
comment on function public.next_item_serial(uuid) is
  'Deprecated: use forge_item(), which allocates the serial inside the same transaction as the insert.';
