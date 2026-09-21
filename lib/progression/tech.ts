import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import type { TechState } from "@/lib/supabase/types";

/**
 * Research.
 *
 * A node advances by *solving problems in its topics*, not by waiting on a
 * timer. That is the link that makes the tech tree part of the game rather
 * than a menu: the only way to unlock a blueprint is to write code.
 *
 * Called from the judge after an accepted first solve.
 */

export type ResearchAdvance = {
  slug: string;
  name: string;
  solvesDone: number;
  solvesRequired: number;
  mastered: boolean;
};

/** A node is available once every node it requires is mastered. */
async function refreshAvailability(userId: string): Promise<void> {
  const supabase = createServiceSupabase();

  const [{ data: nodes }, { data: progress }] = await Promise.all([
    supabase.from("tech_nodes").select("id,requires"),
    supabase.from("tech_progress").select("node_id,state").eq("user_id", userId),
  ]);

  if (!nodes) return;

  const stateByNode = new Map((progress ?? []).map((row) => [row.node_id, row.state]));
  const mastered = new Set(
    (progress ?? []).filter((row) => row.state === "mastered").map((row) => row.node_id),
  );

  const toOpen: string[] = [];
  for (const node of nodes) {
    const current = stateByNode.get(node.id);
    if (current === "mastered" || current === "researching" || current === "available") continue;

    const ready = node.requires.every((id) => mastered.has(id));
    if (ready) toOpen.push(node.id);
  }

  if (toOpen.length === 0) return;

  await supabase.from("tech_progress").upsert(
    toOpen.map((nodeId) => ({
      user_id: userId,
      node_id: nodeId,
      state: "available" as TechState,
    })),
    { onConflict: "user_id,node_id" },
  );
}

/**
 * Credits a solve toward every available or researching node whose topics the
 * problem covers. Returns whatever moved, so the judge can report it.
 */
export async function creditSolveToResearch(
  userId: string,
  topics: string[],
): Promise<ResearchAdvance[]> {
  if (topics.length === 0) return [];

  const supabase = createServiceSupabase();

  await refreshAvailability(userId);

  const { data: nodes } = await supabase
    .from("tech_nodes")
    .select("id,slug,name,topics,solves_required")
    .overlaps("topics", topics);

  if (!nodes || nodes.length === 0) return [];

  const ids = nodes.map((node) => node.id);
  const { data: progress } = await supabase
    .from("tech_progress")
    .select("node_id,state,solves_done")
    .eq("user_id", userId)
    .in("node_id", ids);

  const byNode = new Map((progress ?? []).map((row) => [row.node_id, row]));
  const advances: ResearchAdvance[] = [];

  for (const node of nodes) {
    const current = byNode.get(node.id);

    // Locked nodes do not accumulate: research is deliberate, not incidental.
    if (!current || current.state === "locked") continue;
    if (current.state === "mastered") continue;

    const solvesDone = current.solves_done + 1;
    const required = node.solves_required;
    const mastered = solvesDone >= required;

    await supabase
      .from("tech_progress")
      .update({
        solves_done: solvesDone,
        progress: Math.min(1, solvesDone / required),
        state: mastered ? "mastered" : "researching",
        started_at: current.state === "available" ? new Date().toISOString() : undefined,
        mastered_at: mastered ? new Date().toISOString() : null,
      })
      .eq("user_id", userId)
      .eq("node_id", node.id);

    advances.push({
      slug: node.slug,
      name: node.name,
      solvesDone,
      solvesRequired: required,
      mastered,
    });

    if (mastered) {
      await supabase.from("activity_feed").insert({
        actor_id: userId,
        verb: "mastered",
        object_type: "tech",
        object_id: node.id,
        payload: { slug: node.slug, name: node.name },
      });
    }
  }

  // Mastering something may have opened the next tier.
  if (advances.some((a) => a.mastered)) await refreshAvailability(userId);

  return advances;
}

/**
 * Opens the tier-one nodes for a player who has none. Called on first read of
 * the tech tree, so a new account has somewhere to start.
 */
export async function ensureRootsAvailable(userId: string): Promise<void> {
  const supabase = createServiceSupabase();

  const { count } = await supabase
    .from("tech_progress")
    .select("node_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) {
    await refreshAvailability(userId);
    return;
  }

  const { data: roots } = await supabase.from("tech_nodes").select("id,solves_required").eq("tier", 1);
  if (!roots || roots.length === 0) return;

  await supabase.from("tech_progress").upsert(
    roots.map((node) => ({
      user_id: userId,
      node_id: node.id,
      state: "available" as TechState,
      solves_required: node.solves_required,
    })),
    { onConflict: "user_id,node_id" },
  );
}
