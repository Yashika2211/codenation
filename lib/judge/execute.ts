import "server-only";

import { createServiceSupabase } from "@/lib/supabase/service";
import { getRunner, JudgeUnavailableError } from "./index";
import { getLanguage } from "./languages";
import { statusFor, summarize, verdictFor, type CaseResult } from "./grade";
import type { ProblemRow, TestcaseRow, SubmissionStatus } from "@/lib/supabase/types";
import { solveGrants, REASONS } from "@/lib/economy/rules";
import { mint, hasMintedSolve } from "@/lib/economy/mint";
import { fingerprint } from "@/lib/integrity/fingerprint";
import { assessSubmission } from "@/lib/integrity/signals";

/**
 * One submission, judged end to end.
 *
 * Emitted as an async generator so the route handler can stream each case back
 * the moment it finishes — the Tests tab fills in live instead of waiting for
 * the whole set. Resources are minted only inside the step that writes the
 * final `accepted` status, keyed on the submission id.
 */

export type JudgeEvent =
  | { type: "meta"; submissionId: string | null; total: number; mode: JudgeMode }
  | {
      type: "case";
      ordinal: number;
      verdict: CaseResult["verdict"];
      runtimeMs: number;
      memoryKb: number | null;
      input?: string;
      expected?: string;
      stdout?: string;
      stderr?: string;
    }
  | {
      type: "done";
      status: SubmissionStatus;
      passed: number;
      total: number;
      runtimeMs: number;
      memoryKb: number | null;
      minted: { resource: string; amount: number }[];
      firstSolver: boolean;
    }
  | { type: "error"; message: string };

export type JudgeMode = "run" | "submit";

export type JudgeRequest = {
  userId: string | null;
  problem: ProblemRow;
  language: string;
  source: string;
  mode: JudgeMode;
  duelId?: string | null;
  telemetry?: Record<string, number>;
};

/** Seconds a user must wait between submissions. */
export const SUBMIT_COOLDOWN_MS = 5000;

export async function cooldownRemaining(userId: string): Promise<number> {
  const supabase = createServiceSupabase();
  const { data } = await supabase
    .from("submissions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return 0;
  const elapsed = Date.now() - new Date(data.created_at).getTime();
  return Math.max(0, SUBMIT_COOLDOWN_MS - elapsed);
}

async function loadCases(problemId: string, mode: JudgeMode): Promise<TestcaseRow[]> {
  const supabase = createServiceSupabase();

  // Hidden cases are readable only with the service key, which is why this
  // function lives on the server and its output is filtered before it is sent.
  let query = supabase
    .from("testcases")
    .select("*")
    .eq("problem_id", problemId)
    .order("ordinal", { ascending: true });

  if (mode === "run") query = query.eq("is_sample", true);

  const { data } = await query;
  return data ?? [];
}

export async function* judge(request: JudgeRequest): AsyncGenerator<JudgeEvent> {
  const { problem, mode, userId } = request;

  const spec = getLanguage(request.language);
  if (!spec) {
    yield { type: "error", message: `Unsupported language: ${request.language}` };
    return;
  }

  const cases = await loadCases(problem.id, mode);
  if (cases.length === 0) {
    yield {
      type: "error",
      message: mode === "run" ? "This problem has no sample cases." : "This problem has no tests.",
    };
    return;
  }

  const supabase = createServiceSupabase();

  // A submission row exists only for a real submit; Run is ephemeral.
  let submissionId: string | null = null;
  if (mode === "submit" && userId) {
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        user_id: userId,
        problem_id: problem.id,
        duel_id: request.duelId ?? null,
        language: spec.id,
        language_version: spec.version,
        source_code: request.source,
        status: "running",
        total: cases.length,
        telemetry: request.telemetry ?? {},
      })
      .select("id")
      .single();

    if (error || !data) {
      yield { type: "error", message: "Could not record the submission." };
      return;
    }
    submissionId = data.id;
  }

  yield { type: "meta", submissionId, total: cases.length, mode };

  const runner = getRunner();
  const results: CaseResult[] = [];

  for (const testcase of cases) {
    let result: CaseResult;

    try {
      const output = await runner.run({
        language: spec.id,
        version: spec.version,
        source: request.source,
        stdin: testcase.input,
        timeLimitMs: problem.time_limit_ms,
      });

      result = {
        testcaseId: testcase.id,
        ordinal: testcase.ordinal,
        verdict: verdictFor(output, testcase.expected),
        runtimeMs: output.runtimeMs,
        memoryKb: output.memoryKb,
        stdout: output.stdout,
        stderr: output.stderr,
      };
    } catch (error) {
      const message =
        error instanceof JudgeUnavailableError ? error.message : "The judge is unreachable.";
      yield { type: "error", message };

      if (submissionId) {
        await supabase
          .from("submissions")
          .update({ status: "error", judged_at: new Date().toISOString() })
          .eq("id", submissionId);
      }
      return;
    }

    results.push(result);

    if (submissionId) {
      await supabase.from("submission_runs").insert({
        submission_id: submissionId,
        testcase_id: testcase.id,
        ordinal: testcase.ordinal,
        verdict: result.verdict,
        runtime_ms: result.runtimeMs,
        memory_kb: result.memoryKb,
        stderr: result.stderr?.slice(0, 2000) ?? null,
      });
    }

    // Hidden cases reveal only a verdict. Their input, expected output and the
    // program's stdout never leave the server.
    yield {
      type: "case",
      ordinal: testcase.ordinal,
      verdict: result.verdict,
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb,
      ...(testcase.is_sample
        ? {
            input: testcase.input,
            expected: testcase.expected,
            stdout: result.stdout,
            stderr: result.stderr,
          }
        : {}),
    };
  }

  const status = statusFor(results);
  const totals = summarize(results);

  if (mode === "run" || !userId || !submissionId) {
    yield {
      type: "done",
      status,
      passed: totals.passed,
      total: totals.total,
      runtimeMs: totals.runtimeMs,
      memoryKb: totals.memoryKb,
      minted: [],
      firstSolver: false,
    };
    return;
  }

  await supabase
    .from("submissions")
    .update({
      status,
      passed: totals.passed,
      total: totals.total,
      runtime_ms: totals.runtimeMs,
      memory_kb: totals.memoryKb,
      judged_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  // Integrity signals run on every submission, accepted or not. Nothing here
  // punishes anyone — it only records what was observed.
  await recordIntegrity({
    submissionId,
    userId,
    problemId: problem.id,
    source: request.source,
    telemetry: request.telemetry ?? {},
  });

  let minted: { resource: string; amount: number }[] = [];
  let firstSolver = false;

  if (status === "accepted") {
    // Repeat solves mint nothing.
    const already = await hasMintedSolve(userId, problem.id);
    if (!already) {
      firstSolver = problem.first_solver_id === userId || problem.first_solver_id === null;

      const result = await mint({
        userId,
        reason: REASONS.solve,
        grants: solveGrants(problem.difficulty, firstSolver),
        refTable: "problems",
        refId: problem.id,
      });

      minted = result.applied.map((g) => ({ resource: g.resource, amount: g.amount }));

      await supabase.from("activity_feed").insert({
        actor_id: userId,
        verb: "solved",
        object_type: "problem",
        object_id: problem.id,
        payload: { slug: problem.slug, title: problem.title, difficulty: problem.difficulty },
      });
    }
  }

  yield {
    type: "done",
    status,
    passed: totals.passed,
    total: totals.total,
    runtimeMs: totals.runtimeMs,
    memoryKb: totals.memoryKb,
    minted,
    firstSolver,
  };
}

async function recordIntegrity(input: {
  submissionId: string;
  userId: string;
  problemId: string;
  source: string;
  telemetry: Record<string, number>;
}): Promise<void> {
  const supabase = createServiceSupabase();

  const prints = fingerprint(input.source);

  await supabase.from("submission_fingerprints").insert({
    submission_id: input.submissionId,
    problem_id: input.problemId,
    user_id: input.userId,
    fingerprints: prints.hashes,
    token_count: prints.tokenCount,
  });

  const flags = await assessSubmission({
    submissionId: input.submissionId,
    userId: input.userId,
    problemId: input.problemId,
    fingerprints: prints.hashes,
    telemetry: input.telemetry,
  });

  if (flags.length > 0) {
    await supabase.from("moderation_flags").insert(flags);
  }
}
