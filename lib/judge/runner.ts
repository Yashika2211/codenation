/**
 * The judge boundary.
 *
 * Nothing outside `lib/judge/*` may know which execution backend is in use.
 * Both implementations normalise into this shape, so swapping Piston for
 * Judge0 is an env-var change and nothing more.
 */

export type RunInput = {
  language: string;
  version: string;
  source: string;
  stdin: string;
  timeLimitMs: number;
};

export type RunVerdictKind = "ok" | "runtime_error" | "timeout" | "compile_error";

export type RunOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  verdict: RunVerdictKind;
};

export interface CodeRunner {
  run(input: RunInput): Promise<RunOutput>;
  /** Human-readable, used in the judge log panel. */
  readonly name: string;
}

/** Stderr is shown to the submitter; a runaway log must never reach them whole. */
export const STDERR_LIMIT = 4000;
export const STDOUT_LIMIT = 64_000;

export function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n… truncated (${value.length - limit} more characters)`;
}

export class JudgeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JudgeUnavailableError";
  }
}
