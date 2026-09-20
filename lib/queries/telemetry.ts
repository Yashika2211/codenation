import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Platform telemetry for the entry portal.
 *
 * Section 11 of the spec is absolute: never render a fabricated number as a
 * platform metric. When Supabase is absent this returns `live: false` and the
 * UI renders a dash rather than inventing a count. When it is present these are
 * direct `count` queries — if the real number is 3, the page says 3.
 */

export type Telemetry = {
  live: boolean;
  /** Excludes `profiles.is_seed = true`. */
  citizens: number;
  nations: number;
  problems: number;
  submissions: number;
  accepted: number;
  buildings: number;
};

export const EMPTY_TELEMETRY: Telemetry = {
  live: false,
  citizens: 0,
  nations: 0,
  problems: 0,
  submissions: 0,
  accepted: 0,
  buildings: 0,
};

/** Renders a real count, or an honest dash when there is nothing to report. */
export function renderMetric(value: number, live: boolean): string {
  if (!live) return "—";
  return value.toLocaleString("en-US");
}

export async function getPlatformTelemetry(): Promise<Telemetry> {
  const supabase = await createServerSupabase();
  if (!supabase) return EMPTY_TELEMETRY;

  try {
    const [citizens, nations, problems, submissions, accepted, buildings] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_seed", false),
      supabase.from("nations").select("id", { count: "exact", head: true }).eq("is_seed", false),
      supabase.from("problems").select("id", { count: "exact", head: true }).eq("is_public", true),
      supabase.from("submissions_public").select("id", { count: "exact", head: true }),
      supabase
        .from("submissions_public")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted"),
      supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("state", "complete"),
    ]);

    return {
      live: true,
      citizens: citizens.count ?? 0,
      nations: nations.count ?? 0,
      problems: problems.count ?? 0,
      submissions: submissions.count ?? 0,
      accepted: accepted.count ?? 0,
      buildings: buildings.count ?? 0,
    };
  } catch {
    // A configured-but-unreachable database still must not invent numbers.
    return EMPTY_TELEMETRY;
  }
}
