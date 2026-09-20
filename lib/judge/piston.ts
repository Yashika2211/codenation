import "server-only";

import {
  type CodeRunner,
  type RunInput,
  type RunOutput,
  JudgeUnavailableError,
  STDERR_LIMIT,
  STDOUT_LIMIT,
  truncate,
} from "./runner";
import { getLanguage } from "./languages";
import { pistonQueue, sleep } from "./queue";
import { JUDGE_ENV } from "@/lib/env";

/** Only the fields this file reads. Nothing outside here sees this shape. */
type PistonStage = {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: string | null;
  output?: string;
};

type PistonResponse = {
  run?: PistonStage;
  compile?: PistonStage;
  message?: string;
};

const MAX_ATTEMPTS = 3;

export class PistonRunner implements CodeRunner {
  readonly name = "piston";

  constructor(private readonly baseUrl: string = JUDGE_ENV.pistonUrl) {}

  async run(input: RunInput): Promise<RunOutput> {
    const spec = getLanguage(input.language);
    if (!spec) throw new JudgeUnavailableError(`Unsupported language: ${input.language}`);

    const startedAt = Date.now();
    const body = JSON.stringify({
      language: spec.runtime,
      version: input.version || spec.version,
      files: [{ name: spec.filename, content: input.source }],
      stdin: input.stdin,
      run_timeout: Math.min(input.timeLimitMs * spec.compileFactor, 15_000),
      compile_timeout: 10_000,
      run_memory_limit: -1,
    });

    const payload = await pistonQueue.push(() => this.post(body));
    const runtimeMs = Date.now() - startedAt;

    // A compile failure is a property of the source, not of the test case.
    const compile = payload.compile;
    if (compile && typeof compile.code === "number" && compile.code !== 0) {
      return {
        stdout: "",
        stderr: truncate(compile.stderr ?? compile.output ?? "Compilation failed", STDERR_LIMIT),
        exitCode: compile.code,
        runtimeMs,
        memoryKb: null,
        verdict: "compile_error",
      };
    }

    const stage = payload.run ?? {};
    const signal = stage.signal ?? null;
    const exitCode = typeof stage.code === "number" ? stage.code : signal ? 137 : 0;

    // Piston reports a killed run through the signal, not the exit code.
    const timedOut = signal === "SIGKILL" || signal === "SIGXCPU" || runtimeMs >= input.timeLimitMs * 4;

    return {
      stdout: truncate(stage.stdout ?? "", STDOUT_LIMIT),
      stderr: truncate(stage.stderr ?? "", STDERR_LIMIT),
      exitCode,
      runtimeMs,
      memoryKb: null,
      verdict: timedOut ? "timeout" : exitCode === 0 ? "ok" : "runtime_error",
    };
  }

  private async post(body: string): Promise<PistonResponse> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}/execute`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        });

        // The public endpoint answers a burst with 429. Back off and retry.
        if (response.status === 429) {
          await sleep(500 * attempt);
          lastError = new JudgeUnavailableError("Judge is rate limiting. Retrying.");
          continue;
        }

        if (!response.ok) {
          throw new JudgeUnavailableError(`Judge responded ${response.status}`);
        }

        return (await response.json()) as PistonResponse;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS) await sleep(400 * attempt);
      }
    }

    throw lastError instanceof Error
      ? new JudgeUnavailableError(lastError.message)
      : new JudgeUnavailableError("Judge is unreachable");
  }
}
