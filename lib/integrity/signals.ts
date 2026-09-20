import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import { jaccard, SIMILARITY_THRESHOLD } from "./fingerprint";

/**
 * Integrity signals, per section 8.
 *
 * What this does: measure paste cadence and structural similarity against other
 * accepted submissions for the same problem, and write a flag when something
 * looks worth a human's time.
 *
 * What this does not do: decide anything. Nothing here punishes, hides or
 * penalises. Every flag lands in the /fairplay queue at state 'watch' or
 * 'review' and waits for a person.
 *
 * What this explicitly refuses to do: claim it can detect AI-written code. It
 * cannot be done reliably, and a system that says otherwise is worse than one
 * that does not try.
 */

export type TelemetryAggregates = {
  /** Total characters the editor saw typed. */
  totalChars?: number;
  /** Characters that arrived via paste. */
  pastedChars?: number;
  pasteEvents?: number;
  keystrokes?: number;
  /** Milliseconds from opening the problem to the first submit. */
  timeToFirstSubmitMs?: number;
};

export type FlagInsert = {
  kind: string;
  subject_type: string;
  subject_id: string;
  subject_user: string;
  confidence: number;
  signals: Record<string, number | string | boolean>;
  state: "watch" | "evidence" | "review";
};

/** A submission this far below the problem's median is worth a second look. */
const FAST_SUBMIT_RATIO = 0.25;
const PASTE_RATIO_THRESHOLD = 0.9;

export async function assessSubmission(input: {
  submissionId: string;
  userId: string;
  problemId: string;
  fingerprints: number[];
  telemetry: TelemetryAggregates;
}): Promise<FlagInsert[]> {
  const flags: FlagInsert[] = [];

  const cadence = assessCadence(input.telemetry, await medianTimeToSolve(input.problemId));
  if (cadence) {
    flags.push({
      kind: "paste_cadence",
      subject_type: "submission",
      subject_id: input.submissionId,
      subject_user: input.userId,
      confidence: cadence.confidence,
      signals: cadence.signals,
      state: "watch",
    });
  }

  const similarity = await assessSimilarity(input);
  if (similarity) {
    flags.push({
      kind: "similarity",
      subject_type: "submission",
      subject_id: input.submissionId,
      subject_user: input.userId,
      confidence: similarity.confidence,
      signals: similarity.signals,
      // Similarity carries real evidence, so it skips straight to the queue.
      state: "review",
    });
  }

  return flags;
}

/**
 * Paste cadence. Only fires when a near-total paste is combined with a
 * time-to-first-submit far below the problem's median — either alone is a
 * perfectly normal way to work.
 */
export function assessCadence(
  telemetry: TelemetryAggregates,
  medianMs: number | null,
): { confidence: number; signals: Record<string, number | string | boolean> } | null {
  const total = telemetry.totalChars ?? 0;
  const pasted = telemetry.pastedChars ?? 0;
  if (total < 120) return null;

  const pasteRatio = pasted / total;
  if (pasteRatio <= PASTE_RATIO_THRESHOLD) return null;

  const elapsed = telemetry.timeToFirstSubmitMs ?? 0;
  const fast = medianMs !== null && elapsed > 0 && elapsed < medianMs * FAST_SUBMIT_RATIO;
  if (!fast) return null;

  // Confidence rises with how far past both thresholds the submission sits, and
  // is capped well below certainty because this signal is circumstantial.
  const pasteExcess = (pasteRatio - PASTE_RATIO_THRESHOLD) / (1 - PASTE_RATIO_THRESHOLD);
  const speedExcess = medianMs ? 1 - elapsed / (medianMs * FAST_SUBMIT_RATIO) : 0;
  const confidence = Math.min(0.65, 0.3 + pasteExcess * 0.2 + speedExcess * 0.2);

  return {
    confidence: Number(confidence.toFixed(3)),
    signals: {
      paste_ratio: Number(pasteRatio.toFixed(3)),
      pasted_chars: pasted,
      total_chars: total,
      paste_events: telemetry.pasteEvents ?? 0,
      time_to_first_submit_ms: elapsed,
      problem_median_ms: medianMs ?? 0,
      note: "Circumstantial. Pasting is normal; this pairs it with an unusually fast first submit.",
    },
  };
}

async function assessSimilarity(input: {
  submissionId: string;
  userId: string;
  problemId: string;
  fingerprints: number[];
}): Promise<{ confidence: number; signals: Record<string, number | string | boolean> } | null> {
  if (input.fingerprints.length < 8) return null;

  const supabase = createServiceSupabase();

  // Compare only against other people's accepted work on the same problem.
  const { data } = await supabase
    .from("submission_fingerprints")
    .select("submission_id,user_id,fingerprints")
    .eq("problem_id", input.problemId)
    .neq("user_id", input.userId)
    .limit(400);

  if (!data || data.length === 0) return null;

  let best: { submissionId: string; userId: string; score: number } | null = null;

  for (const row of data) {
    const score = jaccard(input.fingerprints, row.fingerprints);
    if (!best || score > best.score) {
      best = { submissionId: row.submission_id, userId: row.user_id, score };
    }
  }

  if (!best || best.score < SIMILARITY_THRESHOLD) return null;

  return {
    confidence: Number(Math.min(0.95, best.score).toFixed(3)),
    signals: {
      jaccard: Number(best.score.toFixed(3)),
      threshold: SIMILARITY_THRESHOLD,
      matched_submission: best.submissionId,
      k_gram: 5,
      window: 4,
      note: "Structural overlap with another accepted submission. Order of authorship is not implied.",
    },
  };
}

/** Median wall time from a problem's first view to its first accepted solve. */
async function medianTimeToSolve(problemId: string): Promise<number | null> {
  const supabase = createServiceSupabase();

  const { data } = await supabase
    .from("submissions")
    .select("telemetry")
    .eq("problem_id", problemId)
    .eq("status", "accepted")
    .limit(200);

  if (!data || data.length < 5) return null;

  const times = data
    .map((row) => {
      const telemetry = row.telemetry;
      if (typeof telemetry !== "object" || telemetry === null || Array.isArray(telemetry)) {
        return null;
      }
      const value = (telemetry as Record<string, unknown>).timeToFirstSubmitMs;
      return typeof value === "number" && value > 0 ? value : null;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (times.length < 5) return null;

  const mid = Math.floor(times.length / 2);
  if (times.length % 2 === 1) return times[mid] ?? null;
  const lower = times[mid - 1];
  const upper = times[mid];
  return lower !== undefined && upper !== undefined ? (lower + upper) / 2 : null;
}
