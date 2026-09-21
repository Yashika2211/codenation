import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { canUseServiceRole } from "@/lib/supabase/service";
import { ensureRootsAvailable } from "@/lib/progression/tech";
import type { TechState } from "@/lib/supabase/types";

export type TechNodeView = {
  id: string;
  slug: string;
  name: string;
  tier: number;
  branch: string;
  description: string;
  topics: string[];
  cost: { compute?: number; data?: number; alloy?: number };
  requires: string[];
  solvesRequired: number;
  posX: number;
  posY: number;
  state: TechState;
  solvesDone: number;
  progress: number;
  unlocksBlueprints: string[];
  unlocksItems: string[];
};

export type TechTreeView = {
  branches: string[];
  nodes: TechNodeView[];
  mastered: number;
  total: number;
};

/**
 * The tech tree with the viewer's progress folded in.
 *
 * A node the player has never touched reads `locked`; roots are opened on first
 * read so a new account always has somewhere to begin.
 */
export async function getTechTree(userId: string | null): Promise<TechTreeView> {
  const supabase = await createServerSupabase();
  if (!supabase) return { branches: [], nodes: [], mastered: 0, total: 0 };

  if (userId && canUseServiceRole()) {
    await ensureRootsAvailable(userId);
  }

  const [{ data: nodes }, progressResult] = await Promise.all([
    supabase.from("tech_nodes").select("*").order("tier", { ascending: true }),
    userId
      ? supabase
          .from("tech_progress")
          .select("node_id,state,solves_done,progress")
          .eq("user_id", userId)
      : Promise.resolve({ data: null }),
  ]);

  if (!nodes) return { branches: [], nodes: [], mastered: 0, total: 0 };

  const progressByNode = new Map(
    (progressResult.data ?? []).map((row) => [row.node_id, row]),
  );

  // Slugs read better than uuids in the edge list the tree draws.
  const slugById = new Map(nodes.map((node) => [node.id, node.slug]));

  const view: TechNodeView[] = nodes.map((node) => {
    const progress = progressByNode.get(node.id);
    return {
      id: node.id,
      slug: node.slug,
      name: node.name,
      tier: node.tier,
      branch: node.branch,
      description: node.description,
      topics: node.topics ?? [],
      cost: (node.cost ?? {}) as { compute?: number; data?: number; alloy?: number },
      requires: node.requires
        .map((id) => slugById.get(id))
        .filter((slug): slug is string => typeof slug === "string"),
      solvesRequired: node.solves_required,
      posX: Number(node.pos_x),
      posY: Number(node.pos_y),
      state: (progress?.state ?? "locked") as TechState,
      solvesDone: progress?.solves_done ?? 0,
      progress: Number(progress?.progress ?? 0),
      unlocksBlueprints: node.unlocks_blueprints,
      unlocksItems: node.unlocks_items,
    };
  });

  const branches = Array.from(new Set(view.map((node) => node.branch)));

  return {
    branches,
    nodes: view,
    mastered: view.filter((node) => node.state === "mastered").length,
    total: view.length,
  };
}
