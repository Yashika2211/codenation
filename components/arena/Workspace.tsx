"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import dynamic from "next/dynamic";
import type { EditorTelemetry } from "./CodeEditor";
import { TestPanel, type CaseView } from "./TestPanel";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { IconPlay, IconCheck, IconTerminal } from "@/components/ui/Icon";
import { LANGUAGES, type LanguageId } from "@/lib/judge/languages";
import { readJudgeStream, type JudgeEvent } from "@/lib/judge/events";
import { STATUS_LABEL } from "@/lib/judge/grade";
import type { SubmissionStatus } from "@/lib/supabase/types";

/**
 * CodeMirror and its seven language parsers are ~260kB. Loading them after
 * hydration keeps the statement readable immediately instead of blocking on a
 * bundle the reader may never type into.
 */
const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[340px] place-items-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ghost">
        loading editor
      </span>
    </div>
  ),
});

type WorkspaceProps = {
  problemSlug: string;
  sampleCount: number;
  totalCount: number;
  defaultLanguage: LanguageId;
  signedIn: boolean;
  duelId?: string;
};

type Tab = "tests" | "console" | "log";

const STATUS_ACCENT: Record<SubmissionStatus, string> = {
  queued: "var(--color-ghost)",
  running: "var(--color-signal)",
  accepted: "var(--color-flux)",
  wrong_answer: "#FF6B81",
  tle: "var(--color-amber)",
  mle: "var(--color-amber)",
  error: "#FF6B81",
};

/** Per-problem drafts survive a reload. Scoped so two problems never collide. */
function draftKey(slug: string, language: LanguageId) {
  return `codenation:draft:${slug}:${language}`;
}

export function Workspace({
  problemSlug,
  sampleCount,
  totalCount,
  defaultLanguage,
  signedIn,
  duelId,
}: WorkspaceProps) {
  const router = useRouter();

  const [language, setLanguage] = useState<LanguageId>(defaultLanguage);
  const [source, setSource] = useState(() => starterFor(defaultLanguage));
  const [cases, setCases] = useState<CaseView[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("tests");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [minted, setMinted] = useState<{ resource: string; amount: number }[]>([]);
  const [badges, setBadges] = useState<{ slug: string; name: string; rarity: string }[]>([]);
  const [rankUp, setRankUp] = useState<string | null>(null);
  const [research, setResearch] = useState<
    { slug: string; name: string; solvesDone: number; solvesRequired: number; mastered: boolean }[]
  >([]);

  // Aggregates only. The keystroke stream itself is never recorded.
  const telemetry = useRef<EditorTelemetry>({
    keystrokes: 0,
    pasteEvents: 0,
    pastedChars: 0,
    totalChars: 0,
  });
  const openedAt = useRef<number>(Date.now());

  const onTelemetry = useCallback((delta: Partial<EditorTelemetry>) => {
    const current = telemetry.current;
    telemetry.current = {
      keystrokes: current.keystrokes + (delta.keystrokes ?? 0),
      pasteEvents: current.pasteEvents + (delta.pasteEvents ?? 0),
      pastedChars: current.pastedChars + (delta.pastedChars ?? 0),
      totalChars: delta.totalChars ?? current.totalChars,
    };
  }, []);

  const onChange = useCallback(
    (next: string) => {
      setSource(next);
      try {
        window.localStorage.setItem(draftKey(problemSlug, language), next);
      } catch {
        // Private mode, or storage is full. A lost draft is not worth an error.
      }
    },
    [problemSlug, language],
  );

  const switchLanguage = useCallback(
    (next: LanguageId) => {
      setLanguage(next);
      let restored: string | null = null;
      try {
        restored = window.localStorage.getItem(draftKey(problemSlug, next));
      } catch {
        restored = null;
      }
      setSource(restored ?? starterFor(next));
    },
    [problemSlug],
  );

  const appendLog = useCallback((entry: string) => {
    const stamp = new Date().toISOString().slice(11, 23);
    setLog((prev) => [...prev.slice(-200), `${stamp}  ${entry}`]);
  }, []);

  const execute = useCallback(
    async (mode: "run" | "submit") => {
      if (running) return;

      setRunning(true);
      setStatus(null);
      setNotice(null);
      setMinted([]);
      setBadges([]);
      setRankUp(null);
      setResearch([]);
      setTab("tests");

      const expected = mode === "run" ? sampleCount : totalCount;
      setCases(
        Array.from({ length: expected }, (_, i) => ({
          ordinal: i,
          isSample: mode === "run" ? true : i < sampleCount,
          verdict: "pending" as const,
          runtimeMs: null,
          memoryKb: null,
        })),
      );

      appendLog(`${mode} · ${language} · dispatching to judge`);

      try {
        const response = await fetch("/api/judge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            problemSlug,
            language,
            source,
            mode,
            duelId: duelId ?? null,
            telemetry: {
              ...telemetry.current,
              timeToFirstSubmitMs: Date.now() - openedAt.current,
            },
          }),
        });

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          const message = payload?.error ?? `Judge responded ${response.status}`;
          setNotice(message);
          appendLog(`error · ${message}`);
          setRunning(false);
          return;
        }

        for await (const event of readJudgeStream(response.body)) {
          applyEvent(event);
        }
      } catch {
        setNotice("Lost the connection to the judge.");
        appendLog("error · stream interrupted");
      } finally {
        setRunning(false);
      }

      function applyEvent(event: JudgeEvent) {
        switch (event.type) {
          case "meta":
            appendLog(`accepted · ${event.total} case${event.total === 1 ? "" : "s"} queued`);
            setCases((prev) =>
              prev.length === event.total
                ? prev
                : Array.from({ length: event.total }, (_, i) => ({
                    ordinal: i,
                    isSample: mode === "run" ? true : i < sampleCount,
                    verdict: "pending" as const,
                    runtimeMs: null,
                    memoryKb: null,
                  })),
            );
            break;

          case "case":
            setCases((prev) =>
              prev.map((item) =>
                item.ordinal === event.ordinal
                  ? {
                      ...item,
                      verdict: event.verdict,
                      runtimeMs: event.runtimeMs,
                      memoryKb: event.memoryKb,
                      input: event.input,
                      expected: event.expected,
                      stdout: event.stdout,
                      stderr: event.stderr,
                    }
                  : item,
              ),
            );
            appendLog(
              `case ${event.ordinal + 1} · ${event.verdict} · ${event.runtimeMs}ms`,
            );
            break;

          case "done":
            setStatus(event.status);
            setMinted(event.minted);
            setBadges(event.badges);
            setRankUp(event.rankUp);
            setResearch(event.research);
            appendLog(
              `verdict · ${event.status} · ${event.passed}/${event.total} · ${event.runtimeMs}ms`,
            );
            if (event.status === "accepted" && mode === "submit") {
              // Reputation moved, so the nav and profile are now stale.
              router.refresh();
            }
            break;

          case "error":
            setNotice(event.message);
            appendLog(`error · ${event.message}`);
            break;
        }
      }
    },
    [
      running,
      sampleCount,
      totalCount,
      appendLog,
      language,
      problemSlug,
      source,
      duelId,
      router,
    ],
  );

  const consoleText = useMemo(
    () =>
      cases
        .filter((c) => c.isSample && (c.stdout || c.stderr))
        .map(
          (c) =>
            `— case ${c.ordinal + 1} —\n${c.stdout ?? ""}${c.stderr ? `\n[stderr]\n${c.stderr}` : ""}`,
        )
        .join("\n\n"),
    [cases],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      {/* toolbar */}
      <Panel className="flex flex-wrap items-center gap-3 px-4 py-3">
        <label htmlFor="language" className="sr-only">
          Language
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => switchLanguage(e.target.value as LanguageId)}
          className="min-h-[44px] rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[12px] text-[13px] text-text focus:border-[rgb(59_232_176/0.45)] focus:outline-none"
        >
          {LANGUAGES.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          accent="signal"
          onClick={() => void execute("run")}
          disabled={running}
          icon={<IconPlay size={14} />}
        >
          Run samples
        </Button>

        <Button
          onClick={() => void execute("submit")}
          disabled={running || !signedIn}
          icon={<IconCheck size={15} />}
        >
          {running ? "Judging…" : "Submit"}
        </Button>

        {!signedIn ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            sign in to submit
          </span>
        ) : null}

        {status ? (
          <span
            className="ml-auto font-mono text-[11px] font-medium uppercase tracking-[0.12em]"
            style={{ color: STATUS_ACCENT[status] }}
          >
            {STATUS_LABEL[status]}
          </span>
        ) : null}
      </Panel>

      {notice ? (
        <p
          role="alert"
          className="rounded-chip border border-[rgb(255_107_129/0.3)] bg-[rgb(255_107_129/0.1)] px-4 py-3 text-[12.5px] text-[#FF8A9C]"
        >
          {notice}
        </p>
      ) : null}

      {minted.length > 0 ? (
        <Panel variant="tinted" accent="flux" className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Label>Minted</Label>
          {minted.map((grant) => (
            <Tag key={grant.resource} accent="flux">
              +{grant.amount} {grant.resource}
            </Tag>
          ))}
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            written to your ledger
          </span>
        </Panel>
      ) : null}

      {rankUp ? (
        <Panel variant="tinted" accent="amber" className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Label>Rank up</Label>
          <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-amber">
            {rankUp}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            new capabilities unlocked
          </span>
        </Panel>
      ) : null}

      {badges.length > 0 ? (
        <Panel variant="tinted" accent="ion" className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Label>Badge earned</Label>
          {badges.map((badge) => (
            <Tag key={badge.slug} accent="ion">
              {badge.name}
            </Tag>
          ))}
        </Panel>
      ) : null}

      {research.length > 0 ? (
        <Panel variant="tinted" accent="signal" className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Label>Research</Label>
          {research.map((node) => (
            <Tag key={node.slug} accent={node.mastered ? "flux" : "signal"}>
              {node.name} {node.mastered ? "mastered" : `${node.solvesDone}/${node.solvesRequired}`}
            </Tag>
          ))}
        </Panel>
      ) : null}

      {/* editor */}
      <Panel variant="solid" className="min-h-[340px] flex-1 overflow-hidden p-0">
        <CodeEditor
          value={source}
          language={language}
          onChange={onChange}
          onTelemetry={onTelemetry}
          className="h-full min-h-[340px] overflow-auto"
        />
      </Panel>

      {/* results */}
      <Panel className="flex max-h-[420px] min-h-[220px] flex-col overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2">
          {(["tests", "console", "log"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? "true" : undefined}
              className={cn(
                "min-h-[36px] rounded-chip px-[13px] font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                tab === key
                  ? "bg-[rgb(59_232_176/0.12)] text-flux"
                  : "text-ghost hover:text-dim",
              )}
            >
              {key === "log" ? "Judge log" : key}
            </button>
          ))}

          <span className="ml-auto flex items-center gap-2 pr-1 font-mono text-[10px] tabular-nums text-ghost">
            <IconTerminal size={13} />
            {cases.filter((c) => c.verdict === "passed").length}/{cases.length || "—"}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {tab === "tests" ? <TestPanel cases={cases} running={running} /> : null}

          {tab === "console" ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-muted">
              {consoleText || (
                <span className="text-ghost">
                  Sample output appears here after a run. Hidden cases never print.
                </span>
              )}
            </pre>
          ) : null}

          {tab === "log" ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-dim">
              {log.length > 0 ? log.join("\n") : <span className="text-ghost">No activity yet.</span>}
            </pre>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function starterFor(language: LanguageId): string {
  return LANGUAGES.find((spec) => spec.id === language)?.starter ?? "";
}
