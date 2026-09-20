import "server-only";

import type { CodeRunner } from "./runner";
import { PistonRunner } from "./piston";
import { Judge0Runner } from "./judge0";
import { judgeProvider } from "@/lib/env";

let cached: CodeRunner | null = null;

/** The one place the backend is chosen. Everything else takes a `CodeRunner`. */
export function getRunner(): CodeRunner {
  if (cached) return cached;
  cached = judgeProvider() === "judge0" ? new Judge0Runner() : new PistonRunner();
  return cached;
}

export type { CodeRunner, RunInput, RunOutput } from "./runner";
export { JudgeUnavailableError } from "./runner";
