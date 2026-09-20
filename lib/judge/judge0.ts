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
import { JUDGE_ENV } from "@/lib/env";

/**
 * The second backend, written so the abstraction is real rather than notional.
 * Selected with `JUDGE_PROVIDER=judge0`. v1 runs Piston, but nothing outside
 * this file or piston.ts knows that.
 *
 * Judge0 status ids: 3 accepted, 5 time limit, 6 compile error, 7-12 runtime.
 */

type Judge0Response = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  exit_code: number | null;
  status: { id: number; description: string };
};

const STATUS_ACCEPTED = 3;
const STATUS_TIME_LIMIT = 5;
const STATUS_COMPILE_ERROR = 6;

function decode(value: string | null): string {
  if (!value) return "";
  // Judge0 returns base64 when base64_encoded=true, which is what we request.
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
}

export class Judge0Runner implements CodeRunner {
  readonly name = "judge0";

  constructor(
    private readonly baseUrl: string = JUDGE_ENV.judge0Url,
    private readonly token: string = JUDGE_ENV.judge0Token,
  ) {}

  async run(input: RunInput): Promise<RunOutput> {
    if (!this.baseUrl) throw new JudgeUnavailableError("JUDGE0_URL is not set");

    const spec = getLanguage(input.language);
    if (!spec) throw new JudgeUnavailableError(`Unsupported language: ${input.language}`);

    const startedAt = Date.now();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) headers["x-auth-token"] = this.token;

    const response = await fetch(
      `${this.baseUrl}/submissions?base64_encoded=true&wait=true&fields=*`,
      {
        method: "POST",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          language_id: spec.judge0Id,
          source_code: Buffer.from(input.source, "utf8").toString("base64"),
          stdin: Buffer.from(input.stdin, "utf8").toString("base64"),
          cpu_time_limit: Math.min(input.timeLimitMs / 1000, 15),
          wall_time_limit: Math.min((input.timeLimitMs / 1000) * 2, 20),
        }),
      },
    );

    if (!response.ok) {
      throw new JudgeUnavailableError(`Judge0 responded ${response.status}`);
    }

    const payload = (await response.json()) as Judge0Response;
    const wallMs = Date.now() - startedAt;
    const reportedMs = payload.time ? Math.round(Number(payload.time) * 1000) : wallMs;
    const statusId = payload.status.id;

    if (statusId === STATUS_COMPILE_ERROR) {
      return {
        stdout: "",
        stderr: truncate(decode(payload.compile_output) || "Compilation failed", STDERR_LIMIT),
        exitCode: payload.exit_code ?? 1,
        runtimeMs: reportedMs,
        verdict: "compile_error",
      };
    }

    const verdict =
      statusId === STATUS_TIME_LIMIT
        ? "timeout"
        : statusId === STATUS_ACCEPTED
          ? "ok"
          : "runtime_error";

    return {
      stdout: truncate(decode(payload.stdout), STDOUT_LIMIT),
      stderr: truncate(decode(payload.stderr) || decode(payload.message), STDERR_LIMIT),
      exitCode: payload.exit_code ?? (verdict === "ok" ? 0 : 1),
      runtimeMs: reportedMs,
      verdict,
    };
  }
}
