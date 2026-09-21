"use client";

import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/Label";
import { VERDICT_LABEL } from "@/lib/judge/grade";
import type { RunVerdict } from "@/lib/supabase/types";

export type CaseView = {
  ordinal: number;
  isSample: boolean;
  verdict: RunVerdict;
  runtimeMs: number | null;
  memoryKb: number | null;
  input?: string;
  expected?: string;
  stdout?: string;
  stderr?: string;
};

const VERDICT_COLOR: Record<RunVerdict, string> = {
  pending: "var(--color-ghost)",
  passed: "var(--color-flux)",
  failed: "#FF6B81",
  tle: "var(--color-amber)",
  mle: "var(--color-amber)",
  error: "#FF6B81",
  skipped: "var(--color-ghost)",
};

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label as="div">{label}</Label>
      <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-[9px] border border-line bg-[rgb(6_7_13/0.65)] px-[11px] py-[9px] font-mono text-[11.5px] leading-relaxed text-muted">
        {value.length > 0 ? value : <span className="text-ghost">(empty)</span>}
      </pre>
    </div>
  );
}

export function TestPanel({ cases, running }: { cases: CaseView[]; running: boolean }) {
  if (cases.length === 0) {
    return (
      <p className="px-1 py-6 text-[13px] text-dim">
        {running
          ? "Waiting for the judge…"
          : "Run the samples to see each case, or submit to run the full set."}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {cases.map((testcase) => (
        <li
          key={testcase.ordinal}
          className={cn(
            "rounded-card border px-[13px] py-[11px] transition-colors",
            testcase.verdict === "pending" ? "border-line bg-transparent" : "border-line bg-glass",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums text-ghost">
              #{String(testcase.ordinal + 1).padStart(2, "0")}
            </span>

            <span
              aria-hidden
              className={cn(
                "block size-[7px] rotate-45 rounded-[1px]",
                testcase.verdict === "pending" && "cn-anim-pulse",
              )}
              style={{ backgroundColor: VERDICT_COLOR[testcase.verdict] }}
            />

            <span
              className="font-mono text-[11px] font-medium uppercase tracking-[0.12em]"
              style={{ color: VERDICT_COLOR[testcase.verdict] }}
            >
              {VERDICT_LABEL[testcase.verdict]}
            </span>

            {testcase.isSample ? null : (
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                hidden
              </span>
            )}

            <span className="ml-auto flex items-center gap-3 font-mono text-[10.5px] tabular-nums text-faint">
              {testcase.runtimeMs !== null ? <span>{testcase.runtimeMs}ms</span> : null}
              {testcase.memoryKb !== null ? (
                <span>{Math.round(testcase.memoryKb / 1024)}mb</span>
              ) : null}
            </span>
          </div>

          {/* Only sample cases carry their data; hidden ones never leave the server. */}
          {testcase.isSample && testcase.verdict !== "pending" ? (
            <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
              <Block label="Input" value={testcase.input ?? ""} />
              <Block label="Expected" value={testcase.expected ?? ""} />
              <Block label="Your output" value={testcase.stdout ?? ""} />
            </div>
          ) : null}

          {testcase.stderr && testcase.stderr.length > 0 ? (
            <div className="mt-3">
              <Block label="stderr" value={testcase.stderr} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
