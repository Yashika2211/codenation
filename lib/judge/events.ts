import type { RunVerdict, SubmissionStatus } from "@/lib/supabase/types";

/**
 * The wire format between the judge route and the workspace.
 *
 * Deliberately free of `server-only` imports: the client parses these same
 * types out of the NDJSON stream, so there is one definition rather than two
 * that drift.
 */

export type JudgeMode = "run" | "submit";

export type JudgeEvent =
  | { type: "meta"; submissionId: string | null; total: number; mode: JudgeMode }
  | {
      type: "case";
      ordinal: number;
      verdict: RunVerdict;
      runtimeMs: number;
      memoryKb: number | null;
      /** Present for sample cases only. Hidden cases reveal a verdict, nothing more. */
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

/**
 * Reads an NDJSON body and yields each event as it lands. A chunk boundary can
 * fall mid-line, so the tail is carried into the next read rather than parsed.
 */
export async function* readJudgeStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<JudgeEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);

        if (line.length > 0) {
          const parsed = parseEvent(line);
          if (parsed) yield parsed;
        }
        newline = buffer.indexOf("\n");
      }
    }

    const tail = buffer.trim();
    if (tail.length > 0) {
      const parsed = parseEvent(tail);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEvent(line: string): JudgeEvent | null {
  try {
    return JSON.parse(line) as JudgeEvent;
  } catch {
    return null;
  }
}
