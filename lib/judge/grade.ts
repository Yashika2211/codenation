import type { RunOutput } from "./runner";
import type { RunVerdict, SubmissionStatus } from "@/lib/supabase/types";

/**
 * Grading. Deliberately boring: compare trimmed stdout line by line, ignoring
 * trailing whitespace on each line and trailing blank lines at the end. That is
 * what every judge worth using does, and it stops a stray newline from failing
 * a correct solution.
 */

export function normalizeOutput(value: string): string[] {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .reduce<string[]>((acc, line, index, all) => {
      // Drop trailing blank lines, keep interior ones.
      if (line === "" && all.slice(index).every((rest) => rest.trim() === "")) return acc;
      acc.push(line);
      return acc;
    }, []);
}

export function outputMatches(actual: string, expected: string): boolean {
  const a = normalizeOutput(actual);
  const b = normalizeOutput(expected);
  if (a.length !== b.length) return false;
  return a.every((line, i) => line === b[i]);
}

/** One test case's verdict, from the runner result plus the expected output. */
export function verdictFor(run: RunOutput, expected: string): RunVerdict {
  if (run.verdict === "timeout") return "tle";
  if (run.verdict === "compile_error") return "error";
  if (run.verdict === "runtime_error") return "error";
  return outputMatches(run.stdout, expected) ? "passed" : "failed";
}

export type CaseResult = {
  testcaseId: string;
  ordinal: number;
  verdict: RunVerdict;
  runtimeMs: number;
  memoryKb: number | null;
  /** Only ever populated for sample cases — never for hidden ones. */
  stdout?: string;
  stderr?: string;
  expected?: string;
  input?: string;
};

/**
 * The submission-level status. First failure wins, because that is the verdict
 * a competitor cares about: the reason it did not pass.
 */
export function statusFor(results: CaseResult[]): SubmissionStatus {
  if (results.length === 0) return "error";

  for (const result of results) {
    if (result.verdict === "tle") return "tle";
    if (result.verdict === "mle") return "mle";
    if (result.verdict === "error") return "error";
  }

  return results.every((r) => r.verdict === "passed") ? "accepted" : "wrong_answer";
}

export function summarize(results: CaseResult[]): {
  passed: number;
  total: number;
  runtimeMs: number;
  memoryKb: number | null;
} {
  const passed = results.filter((r) => r.verdict === "passed").length;
  // Report the worst case, not the average — that is what a limit is about.
  const runtimeMs = results.reduce((acc, r) => Math.max(acc, r.runtimeMs), 0);
  const memories = results.map((r) => r.memoryKb).filter((m): m is number => m !== null);
  const memoryKb = memories.length > 0 ? Math.max(...memories) : null;

  return { passed, total: results.length, runtimeMs, memoryKb };
}

export const VERDICT_LABEL: Record<RunVerdict, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Wrong answer",
  tle: "Time limit",
  mle: "Memory limit",
  error: "Runtime error",
  skipped: "Skipped",
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  queued: "Queued",
  running: "Running",
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  tle: "Time limit exceeded",
  mle: "Memory limit exceeded",
  error: "Runtime error",
};
