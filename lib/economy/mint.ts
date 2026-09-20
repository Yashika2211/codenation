import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import type { ResourceKindDb } from "@/lib/supabase/types";
import {
  type Grant,
  type MintReason,
  applyDiminishing,
  MENTORING_DAILY_CAP,
  REASONS,
} from "./rules";

/**
 * The only way value enters or leaves the world.
 *
 * Every call is server-side, writes to `resource_ledger`, and is idempotent on
 * (user_id, resource, reason, ref_id) — which is a partial unique index, so a
 * retried judge callback cannot pay twice even under a race.
 *
 * Balances are never patched. A trigger folds each ledger row into `wallets`
 * and `profiles.reputation`; those are caches of a sum, nothing more.
 */

export type MintInput = {
  userId: string;
  reason: MintReason;
  grants: Grant[];
  refTable?: string;
  /** Required for idempotency. Without it the same grant can land twice. */
  refId?: string;
  /** Skip the rolling-24h taper. Used for costs, never for rewards. */
  skipDiminishing?: boolean;
};

export type MintResult = {
  applied: Grant[];
  /** True when the unique index rejected the write, i.e. it already landed. */
  alreadyMinted: boolean;
};

const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How many grants of this reason already landed in the rolling window. */
async function priorCount(userId: string, reason: MintReason): Promise<number> {
  const supabase = createServiceSupabase();
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("resource_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", reason)
    .eq("resource", "rep")
    .gte("created_at", since);

  return count ?? 0;
}

export async function mint(input: MintInput): Promise<MintResult> {
  const supabase = createServiceSupabase();

  const positive = input.grants.filter((g) => g.amount !== 0);
  if (positive.length === 0) return { applied: [], alreadyMinted: false };

  const isReward = positive.some((g) => g.amount > 0);
  const grants =
    isReward && !input.skipDiminishing
      ? applyDiminishing(positive, await priorCount(input.userId, input.reason))
      : positive;

  const rows = grants
    .filter((g) => g.amount !== 0)
    .map((g) => ({
      user_id: input.userId,
      resource: g.resource,
      delta: g.amount,
      reason: input.reason,
      ref_table: input.refTable ?? null,
      ref_id: input.refId ?? null,
    }));

  if (rows.length === 0) return { applied: [], alreadyMinted: false };

  const { error } = await supabase.from("resource_ledger").insert(rows);

  if (error) {
    // 23505: the idempotency index rejected it. The grant already landed, which
    // is a success from the caller's point of view.
    if (error.code === "23505") return { applied: [], alreadyMinted: true };
    throw new Error(`Mint failed: ${error.message}`);
  }

  return { applied: grants, alreadyMinted: false };
}

/**
 * Spends resources, refusing to go negative. Reads the wallet, checks it covers
 * the cost, then writes the debit rows.
 *
 * This is a read-then-write, so two simultaneous spends could both pass the
 * check. Callers that must not overdraw — the Forge — take a row lock first.
 */
export async function spend(input: {
  userId: string;
  reason: MintReason;
  cost: Partial<Record<ResourceKindDb, number>>;
  refTable?: string;
  refId?: string;
}): Promise<{ ok: true } | { ok: false; reason: string; missing: ResourceKindDb[] }> {
  const supabase = createServiceSupabase();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("compute,data,alloy")
    .eq("user_id", input.userId)
    .maybeSingle();

  const balances = {
    compute: wallet?.compute ?? 0,
    data: wallet?.data ?? 0,
    alloy: wallet?.alloy ?? 0,
    rep: 0,
  } satisfies Record<ResourceKindDb, number>;

  const missing: ResourceKindDb[] = [];
  for (const [resource, amount] of Object.entries(input.cost)) {
    if (!amount || amount <= 0) continue;
    // Reputation is never spent — it only ever gates.
    if (resource === "rep") {
      return { ok: false, reason: "Reputation is never spent.", missing: ["rep"] };
    }
    if (balances[resource as ResourceKindDb] < amount) {
      missing.push(resource as ResourceKindDb);
    }
  }

  if (missing.length > 0) {
    return { ok: false, reason: "Insufficient resources.", missing };
  }

  const grants: Grant[] = Object.entries(input.cost)
    .filter(([, amount]) => typeof amount === "number" && amount > 0)
    .map(([resource, amount]) => ({
      resource: resource as ResourceKindDb,
      amount: -(amount as number),
    }));

  await mint({
    userId: input.userId,
    reason: input.reason,
    grants,
    refTable: input.refTable,
    refId: input.refId,
    skipDiminishing: true,
  });

  return { ok: true };
}

/** Mentoring pays for at most three sessions a day. */
export async function mentoringAllowanceLeft(userId: string): Promise<number> {
  const supabase = createServiceSupabase();
  const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("resource_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", REASONS.mentoring)
    .eq("resource", "rep")
    .gte("created_at", since);

  return Math.max(0, MENTORING_DAILY_CAP - (count ?? 0));
}

/** True when this user has already been paid for solving this problem. */
export async function hasMintedSolve(userId: string, problemId: string): Promise<boolean> {
  const supabase = createServiceSupabase();

  const { count } = await supabase
    .from("resource_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", REASONS.solve)
    .eq("ref_table", "problems")
    .eq("ref_id", problemId);

  return (count ?? 0) > 0;
}
