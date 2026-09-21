import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import { evaluate, parseRule, type MetricSnapshot } from "./rules";

/**
 * Badge evaluation.
 *
 * Section 5.4 offered two designs: a Postgres trigger plus pg_notify plus a
 * route handler, or re-evaluating the affected user inside the mint. This is
 * the second, because it is simpler and cannot drift — a badge is awarded in
 * the same request that earned it, or not at all.
 */

/** Builds the metric snapshot a rule predicate is evaluated against. */
export async function snapshotFor(userId: string): Promise<MetricSnapshot> {
  const supabase = createServiceSupabase();

  const [profile, solves, buildings, items, nations, ledgerDays, duelWins] = await Promise.all([
    supabase.from("profiles").select("reputation,arena_rating").eq("id", userId).maybeSingle(),

    supabase
      .from("submissions")
      .select("problem_id, problems(difficulty,topics)")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .limit(2000),

    supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("state", "complete"),

    supabase
      .from("item_instances")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),

    supabase
      .from("nations")
      .select("id", { count: "exact", head: true })
      .eq("founder_id", userId),

    supabase
      .from("resource_ledger")
      .select("created_at")
      .eq("user_id", userId)
      .limit(5000),

    supabase
      .from("duels")
      .select("id", { count: "exact", head: true })
      .eq("winner_id", userId),
  ]);

  const snapshot: MetricSnapshot = {
    "rep.total": profile.data?.reputation ?? 0,
    "arena.rating": profile.data?.arena_rating ?? 1200,
    "arena.wins": duelWins.count ?? 0,
    "buildings.complete": buildings.count ?? 0,
    "items.forged": items.count ?? 0,
    "nations.founded": nations.count ?? 0,
  };

  // Distinct problems only — a repeat solve is worth nothing here either.
  type SolveJoin = {
    problem_id: string;
    problems: { difficulty: string; topics: string[] } | null;
  };
  const seen = new Set<string>();
  for (const raw of (solves.data ?? []) as unknown as SolveJoin[]) {
    if (!raw.problems || seen.has(raw.problem_id)) continue;
    seen.add(raw.problem_id);

    const difficultyKey = `solves.difficulty.${raw.problems.difficulty}`;
    snapshot[difficultyKey] = (snapshot[difficultyKey] ?? 0) + 1;

    for (const topic of raw.problems.topics ?? []) {
      const topicKey = `solves.topic.${topic}`;
      snapshot[topicKey] = (snapshot[topicKey] ?? 0) + 1;
    }
  }
  snapshot["solves.total"] = seen.size;

  const days = new Set((ledgerDays.data ?? []).map((row) => row.created_at.slice(0, 10)));
  snapshot["streak.days"] = days.size;

  return snapshot;
}

export type AwardedBadge = { slug: string; name: string; rarity: string };

/**
 * Evaluates every badge the user does not already hold and awards the ones that
 * now pass. Returns what was newly earned so the caller can surface it.
 */
export async function evaluateBadges(userId: string): Promise<AwardedBadge[]> {
  const supabase = createServiceSupabase();

  const [{ data: badges }, { data: held }] = await Promise.all([
    supabase.from("badges").select("id,slug,name,rarity,rule"),
    supabase.from("badge_awards").select("badge_id").eq("user_id", userId),
  ]);

  if (!badges || badges.length === 0) return [];

  const heldIds = new Set((held ?? []).map((row) => row.badge_id));
  const candidates = badges.filter((badge) => !heldIds.has(badge.id));
  if (candidates.length === 0) return [];

  const snapshot = await snapshotFor(userId);
  const earned: AwardedBadge[] = [];

  for (const badge of candidates) {
    const rule = parseRule(badge.rule);
    // A malformed rule is never treated as satisfied.
    if (!rule) continue;
    if (!evaluate(rule, snapshot)) continue;

    const { error } = await supabase.from("badge_awards").insert({
      user_id: userId,
      badge_id: badge.id,
      // Store the numbers that justified it, so an award is auditable later.
      evidence: { snapshot, rule: badge.rule },
    });

    // A concurrent request may have awarded it first; that is not an error.
    if (error && error.code !== "23505") continue;
    if (error) continue;

    earned.push({ slug: badge.slug, name: badge.name, rarity: badge.rarity });

    await supabase.from("activity_feed").insert({
      actor_id: userId,
      verb: "earned",
      object_type: "badge",
      object_id: badge.id,
      payload: { slug: badge.slug, name: badge.name, rarity: badge.rarity },
    });
  }

  return earned;
}
