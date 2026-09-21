import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { FlagState } from "@/lib/supabase/types";

export type FlagView = {
  id: string;
  kind: string;
  confidence: number;
  state: FlagState;
  verdict: string | null;
  reasoning: string | null;
  createdAt: string;
  resolvedAt: string | null;
  /** Only the signal names, never the raw evidence blob. */
  signalKeys: string[];
  isOwn: boolean;
};

export type FairplayView = {
  queue: FlagView[];
  verdicts: FlagView[];
  trustScore: number | null;
  ownFlags: number;
  totals: { watch: number; evidence: number; review: number; resolved: number };
};

/**
 * The integrity queue and the public verdict ledger.
 *
 * RLS already restricts `moderation_flags` to resolved rows plus the viewer's
 * own, so this reads as the caller. What is shown is deliberately thin: the
 * names of the signals that fired, never the evidence blob, which can contain
 * another player's submission id.
 */
export async function getFairplayView(): Promise<FairplayView> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return {
      queue: [],
      verdicts: [],
      trustScore: null,
      ownFlags: 0,
      totals: { watch: 0, evidence: 0, review: 0, resolved: 0 },
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  const [flagResult, profileResult] = await Promise.all([
    supabase
      .from("moderation_flags")
      .select("id,kind,confidence,state,verdict,reasoning,signals,created_at,resolved_at,subject_user")
      .order("created_at", { ascending: false })
      .limit(60),
    viewerId
      ? supabase.from("profiles").select("trust_score").eq("id", viewerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = flagResult.data ?? [];

  const mapped: FlagView[] = rows.map((row) => {
    const signals =
      typeof row.signals === "object" && row.signals !== null && !Array.isArray(row.signals)
        ? (row.signals as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      kind: row.kind,
      confidence: Number(row.confidence),
      state: row.state,
      verdict: row.verdict,
      reasoning: row.reasoning,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      // Names only. The values can reference another player's work.
      signalKeys: Object.keys(signals).filter((key) => key !== "note"),
      isOwn: row.subject_user === viewerId,
    };
  });

  const totals = {
    watch: mapped.filter((f) => f.state === "watch").length,
    evidence: mapped.filter((f) => f.state === "evidence").length,
    review: mapped.filter((f) => f.state === "review").length,
    resolved: mapped.filter((f) => f.state === "resolved").length,
  };

  return {
    queue: mapped.filter((f) => f.state !== "resolved"),
    verdicts: mapped.filter((f) => f.state === "resolved"),
    trustScore: profileResult.data?.trust_score ?? null,
    ownFlags: mapped.filter((f) => f.isOwn).length,
    totals,
  };
}
