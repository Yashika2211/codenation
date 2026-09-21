import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import { spend } from "@/lib/economy/mint";
import { REASONS, upkeepFor, UPKEEP_INTERVAL_MS } from "@/lib/economy/rules";

/**
 * The upkeep sweep — the economy's main sink.
 *
 * Every six hours a building charges compute. A nation that cannot pay does not
 * lose its buildings; they drop to `dormant` and stop counting, and they come
 * back the moment the wallet can cover them. That asymmetry matters: the sink
 * has to bite without being punitive, or people stop building.
 *
 * Runs lazily, on read: whoever looks at a city pays its bill. No cron needed
 * on the free tier, and the charge is still exactly one per interval because
 * `last_upkeep_at` advances by whole intervals.
 */

export type UpkeepResult = {
  charged: number;
  dormant: number;
  revived: number;
  computeSpent: number;
};

export async function runUpkeepFor(ownerId: string): Promise<UpkeepResult> {
  const supabase = createServiceSupabase();
  const now = Date.now();

  const { data: buildings } = await supabase
    .from("buildings")
    .select("id,level,state,last_upkeep_at,blueprints(upkeep_compute)")
    .eq("owner_id", ownerId)
    .in("state", ["complete", "dormant"]);

  if (!buildings || buildings.length === 0) {
    return { charged: 0, dormant: 0, revived: 0, computeSpent: 0 };
  }

  type BuildingJoin = {
    id: string;
    level: number;
    state: string;
    last_upkeep_at: string;
    blueprints: { upkeep_compute: number } | null;
  };

  let charged = 0;
  let dormant = 0;
  let revived = 0;
  let computeSpent = 0;

  for (const raw of buildings as unknown as BuildingJoin[]) {
    const last = new Date(raw.last_upkeep_at).getTime();
    const elapsed = now - last;
    const cycles = Math.floor(elapsed / UPKEEP_INTERVAL_MS);
    if (cycles <= 0) continue;

    const base = raw.blueprints?.upkeep_compute ?? 0;
    const due = upkeepFor(base, raw.level) * cycles;

    // Advance by whole intervals only, so a partial cycle is never lost or
    // double-charged on the next sweep.
    const nextStamp = new Date(last + cycles * UPKEEP_INTERVAL_MS).toISOString();

    if (due <= 0) {
      await supabase.from("buildings").update({ last_upkeep_at: nextStamp }).eq("id", raw.id);
      continue;
    }

    // Keying the charge to (building, cycle) lets the ledger's idempotency
    // index do the work: the same building cannot be billed twice for the same
    // six-hour window, even if two readers sweep concurrently.
    const cycleIndex = Math.floor((last + cycles * UPKEEP_INTERVAL_MS) / UPKEEP_INTERVAL_MS);

    const result = await spend({
      userId: ownerId,
      reason: `${REASONS.upkeep}:${cycleIndex}`,
      cost: { compute: due },
      refTable: "buildings",
      refId: raw.id,
    });

    if (result.ok) {
      charged += 1;
      computeSpent += due;
      if (raw.state === "dormant") revived += 1;

      await supabase
        .from("buildings")
        .update({ state: "complete", last_upkeep_at: nextStamp })
        .eq("id", raw.id);
    } else {
      // Cannot pay: the building sleeps rather than being destroyed, and the
      // clock still advances so the debt does not compound forever.
      if (raw.state !== "dormant") dormant += 1;
      await supabase
        .from("buildings")
        .update({ state: "dormant", last_upkeep_at: nextStamp })
        .eq("id", raw.id);
    }
  }

  return { charged, dormant, revived, computeSpent };
}

/** Advances any construction whose ETA has passed. Also lazy, also on read. */
export async function advanceBuildQueue(ownerId: string): Promise<number> {
  const supabase = createServiceSupabase();
  const now = new Date();

  const { data: building } = await supabase
    .from("buildings")
    .select("id,eta,created_at")
    .eq("owner_id", ownerId)
    .in("state", ["queued", "building"]);

  if (!building || building.length === 0) return 0;

  let completed = 0;

  for (const row of building) {
    if (!row.eta) continue;
    const eta = new Date(row.eta).getTime();

    if (eta <= now.getTime()) {
      await supabase
        .from("buildings")
        .update({ state: "complete", progress: 1, last_upkeep_at: now.toISOString() })
        .eq("id", row.id);
      completed += 1;
      continue;
    }

    // Still building: keep the progress bar honest.
    const start = new Date(row.created_at).getTime();
    const span = eta - start;
    const progress = span > 0 ? Math.min(0.99, (now.getTime() - start) / span) : 0;

    await supabase
      .from("buildings")
      .update({ state: "building", progress: Number(progress.toFixed(4)) })
      .eq("id", row.id);
  }

  return completed;
}
