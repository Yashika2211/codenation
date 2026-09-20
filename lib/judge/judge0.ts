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
import { judgeQueue, sleep } from "./queue";
import { JUDGE_ENV } from "@/lib/env";

/**
 * Default backend. The public Piston endpoint went whitelist-only on
 * 2026-02-15, so `https://ce.judge0.com` — free, keyless, and reporting both
 * wall time and peak memory — carries v1. Point `JUDGE0_URL` at a self-hosted
 * instance to lift the public rate limit.
 *
 * Judge0 status ids: 3 accepted, 5 time limit, 6 compile error, 7–12 runtime,
 * 13 internal error, 14 exec format error.
 */

type Judge0Response = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  exit_code: number | null;
  status: { id: number; description: string };
};

const STATUS_ACCEPTED = 3;
const STATUS_WRONG_ANSWER = 4;
const STATUS_TIME_LIMIT = 5;
const STATUS_COMPILE_ERROR = 6;
const MAX_ATTEMPTS = 3;

function decode(value: string | null): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
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
    const body = JSON.stringify({
      language_id: spec.judge0Id,
      source_code: encode(input.source),
      stdin: encode(input.stdin),
      cpu_time_limit: Math.min(Math.max(input.timeLimitMs / 1000, 1), 15),
      wall_time_limit: Math.min(Math.max((input.timeLimitMs / 1000) * 3, 5), 20),
    });

    const payload = await judgeQueue.push(() => this.post(body));
    const wallMs = Date.now() - startedAt;
    const reportedMs = payload.time ? Math.round(Number(payload.time) * 1000) : wallMs;
    const statusId = payload.status.id;

    if (statusId === STATUS_COMPILE_ERROR) {
      return {
        stdout: "",
        stderr: truncate(decode(payload.compile_output) || "Compilation failed", STDERR_LIMIT),
        exitCode: payload.exit_code ?? 1,
        runtimeMs: reportedMs,
        memoryKb: payload.memory,
        verdict: "compile_error",
      };
    }

    // Judge0 compares against its own expected_output when given one; we never
    // send one, so 3 and 4 both mean "the program ran to completion".
    const ran = statusId === STATUS_ACCEPTED || statusId === STATUS_WRONG_ANSWER;
    const verdict = statusId === STATUS_TIME_LIMIT ? "timeout" : ran ? "ok" : "runtime_error";

    return {
      stdout: truncate(decode(payload.stdout), STDOUT_LIMIT),
      stderr: truncate(decode(payload.stderr) || decode(payload.message), STDERR_LIMIT),
      exitCode: payload.exit_code ?? (verdict === "ok" ? 0 : 1),
      runtimeMs: reportedMs,
      memoryKb: payload.memory,
      verdict,
    };
  }

  private async post(body: string): Promise<Judge0Response> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) headers["x-auth-token"] = this.token;

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(
          `${this.baseUrl}/submissions?base64_encoded=true&wait=true&fields=*`,
          {
            method: "POST",
            headers,
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(45_000),
          },
        );

        // The public instance answers a burst with 429; a self-hosted one with
        // 503 while its queue drains. Both are worth one more try.
        if (response.status === 429 || response.status === 503) {
          await sleep(600 * attempt);
          lastError = new JudgeUnavailableError(`Judge is busy (${response.status})`);
          continue;
        }

        if (!response.ok) {
          throw new JudgeUnavailableError(`Judge responded ${response.status}`);
        }

        return (await response.json()) as Judge0Response;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt);
      }
    }

    throw lastError instanceof Error
      ? new JudgeUnavailableError(lastError.message)
      : new JudgeUnavailableError("Judge is unreachable");
  }
}
