import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type {
  ProfileRow,
  NationRow,
  BadgeRow,
  ItemInstanceRow,
  ItemDefinitionRow,
} from "@/lib/supabase/types";
import type { HeatDay } from "@/components/ui/Heatmap";
import type { SkillAxis } from "@/components/ui/SkillRadar";

export type ProfileView = {
  profile: ProfileRow;
  nation: Pick<NationRow, "slug" | "name" | "accent" | "tier" | "flag"> | null;
  wallet: { compute: number; data: number; alloy: number };
  heatDays: HeatDay[];
  skills: SkillAxis[];
  badges: Array<BadgeRow & { awarded_at: string }>;
  items: Array<ItemInstanceRow & { definition: Pick<ItemDefinitionRow, "name" | "kind" | "rarity"> }>;
  solvedByDifficulty: Record<string, number>;
  recentSolves: Array<{ slug: string; title: string; difficulty: string; at: string }>;
  totalSolves: number;
};

/** The six radar axes. Kept here so the profile and the tech tree agree. */
export const SKILL_TOPICS = ["graphs", "dp", "strings", "math", "greedy", "trees"] as const;

function emptyWallet() {
  return { compute: 0, data: 0, alloy: 0 };
}

/**
 * One profile, fully assembled. Returns `null` when the handle does not exist
 * or Supabase is not configured, so the route can render a real 404.
 */
export async function getProfileByHandle(handle: string): Promise<ProfileView | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .ilike("handle", handle)
    .maybeSingle();

  if (!profile) return null;

  const [nationResult, walletResult, ledgerResult, badgeResult, itemResult, solveResult] =
    await Promise.all([
      profile.nation_id
        ? supabase
            .from("nations")
            .select("slug,name,accent,tier,flag")
            .eq("id", profile.nation_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      supabase
        .from("wallets")
        .select("compute,data,alloy")
        .eq("user_id", profile.id)
        .maybeSingle(),

      // 53 weeks plus a few days of slack, so the grid's first column is full.
      supabase
        .from("resource_ledger")
        .select("created_at,delta,resource")
        .eq("user_id", profile.id)
        .gte("created_at", new Date(Date.now() - 380 * 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),

      supabase
        .from("badge_awards")
        .select("awarded_at, badges(*)")
        .eq("user_id", profile.id)
        .order("awarded_at", { ascending: false }),

      supabase
        .from("item_instances")
        .select("*, item_definitions(name,kind,rarity)")
        .eq("owner_id", profile.id)
        .order("forged_at", { ascending: false })
        .limit(12),

      supabase
        .from("submissions")
        .select("created_at, problems(slug,title,difficulty,topics)")
        .eq("user_id", profile.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  // --- contribution heatmap -------------------------------------------------
  const byDay = new Map<string, number>();
  for (const row of ledgerResult.data ?? []) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const heatDays: HeatDay[] = Array.from(byDay, ([date, count]) => ({ date, count }));

  // --- skills and solve breakdown ------------------------------------------
  const topicCounts = new Map<string, number>();
  const solvedByDifficulty: Record<string, number> = {};
  const seenProblems = new Set<string>();
  const recentSolves: ProfileView["recentSolves"] = [];

  type SolveJoin = {
    created_at: string;
    problems: { slug: string; title: string; difficulty: string; topics: string[] } | null;
  };

  for (const raw of (solveResult.data ?? []) as unknown as SolveJoin[]) {
    const problem = raw.problems;
    if (!problem || seenProblems.has(problem.slug)) continue;
    seenProblems.add(problem.slug);

    solvedByDifficulty[problem.difficulty] = (solvedByDifficulty[problem.difficulty] ?? 0) + 1;
    for (const topic of problem.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
    if (recentSolves.length < 8) {
      recentSolves.push({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        at: raw.created_at,
      });
    }
  }

  // Normalise against the strongest topic so the shape reads as a profile, not
  // as an absolute score. A user with no solves gets a flat, honest floor.
  const peak = Math.max(1, ...SKILL_TOPICS.map((t) => topicCounts.get(t) ?? 0));
  const skills: SkillAxis[] = SKILL_TOPICS.map((topic) => ({
    label: topic,
    value: (topicCounts.get(topic) ?? 0) / peak,
  }));

  // --- badges ---------------------------------------------------------------
  type BadgeJoin = { awarded_at: string; badges: BadgeRow | null };
  const badges = ((badgeResult.data ?? []) as unknown as BadgeJoin[])
    .filter((row): row is { awarded_at: string; badges: BadgeRow } => row.badges !== null)
    .map((row) => ({ ...row.badges, awarded_at: row.awarded_at }));

  // --- forged items ---------------------------------------------------------
  type ItemJoin = ItemInstanceRow & {
    item_definitions: Pick<ItemDefinitionRow, "name" | "kind" | "rarity"> | null;
  };
  const items = ((itemResult.data ?? []) as unknown as ItemJoin[])
    .filter((row) => row.item_definitions !== null)
    .map((row) => ({
      ...row,
      definition: row.item_definitions as Pick<ItemDefinitionRow, "name" | "kind" | "rarity">,
    }));

  return {
    profile,
    nation: nationResult.data ?? null,
    wallet: walletResult.data ?? emptyWallet(),
    heatDays,
    skills,
    badges,
    items,
    solvedByDifficulty,
    recentSolves,
    totalSolves: seenProblems.size,
  };
}
