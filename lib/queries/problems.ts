import { createServerSupabase } from "@/lib/supabase/server";
import type { Difficulty, ProblemRow } from "@/lib/supabase/types";

export type ProblemListItem = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  solvedCount: number;
  attemptCount: number;
  /** Whether the viewer has an accepted submission. Null when signed out. */
  solvedByViewer: boolean | null;
};

export type ProblemDetail = {
  problem: ProblemRow;
  samples: Array<{ input: string; expected: string; ordinal: number }>;
  totalCases: number;
  solvedByViewer: boolean;
  viewerAttempts: number;
};

export async function listProblems(options?: {
  difficulty?: Difficulty | null;
  topic?: string | null;
  search?: string | null;
  limit?: number;
}): Promise<ProblemListItem[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("problems")
    .select("slug,title,difficulty,topics,solved_count,attempt_count")
    .eq("is_public", true)
    .order("difficulty", { ascending: true })
    .order("solved_count", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.difficulty) query = query.eq("difficulty", options.difficulty);
  if (options?.topic) query = query.contains("topics", [options.topic]);
  if (options?.search) query = query.ilike("title", `%${options.search}%`);

  const { data } = await query;
  if (!data) return [];

  // One extra round trip marks which of these the viewer has already solved.
  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  let solvedSlugs = new Set<string>();
  if (viewerId) {
    const { data: solved } = await supabase
      .from("submissions")
      .select("problems(slug)")
      .eq("user_id", viewerId)
      .eq("status", "accepted")
      .limit(1000);

    type SolvedJoin = { problems: { slug: string } | null };
    solvedSlugs = new Set(
      ((solved ?? []) as unknown as SolvedJoin[])
        .map((row) => row.problems?.slug)
        .filter((slug): slug is string => typeof slug === "string"),
    );
  }

  return data.map((row) => ({
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    topics: row.topics ?? [],
    solvedCount: row.solved_count,
    attemptCount: row.attempt_count,
    solvedByViewer: viewerId ? solvedSlugs.has(row.slug) : null,
  }));
}

export async function getProblem(slug: string): Promise<ProblemDetail | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: problem } = await supabase
    .from("problems")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!problem) return null;

  // RLS restricts this to sample rows, which is exactly what may be shown.
  const { data: samples } = await supabase
    .from("testcases")
    .select("input,expected,ordinal")
    .eq("problem_id", problem.id)
    .eq("is_sample", true)
    .order("ordinal", { ascending: true });

  // The total case count is public; the cases themselves are not.
  const { count: totalCases } = await supabase
    .from("testcases")
    .select("id", { count: "exact", head: true })
    .eq("problem_id", problem.id);

  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  let solvedByViewer = false;
  let viewerAttempts = 0;

  if (viewerId) {
    const [{ count: accepted }, { count: attempts }] = await Promise.all([
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", viewerId)
        .eq("problem_id", problem.id)
        .eq("status", "accepted"),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", viewerId)
        .eq("problem_id", problem.id),
    ]);

    solvedByViewer = (accepted ?? 0) > 0;
    viewerAttempts = attempts ?? 0;
  }

  return {
    problem,
    samples: samples ?? [],
    // Fall back to the sample count so the UI never claims zero tests exist.
    totalCases: totalCases ?? samples?.length ?? 0,
    solvedByViewer,
    viewerAttempts,
  };
}

export async function getLadder(limit = 25) {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("profiles")
    .select("handle,display_name,avatar_seed,arena_rating,reputation,is_seed")
    .order("arena_rating", { ascending: false })
    .limit(limit);

  return data ?? [];
}
