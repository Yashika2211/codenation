import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker } from "@/components/ui/Label";
import { DifficultyTag, Tag } from "@/components/ui/Tag";
import { Markdown } from "@/components/ui/Markdown";
import { Workspace } from "@/components/arena/Workspace";
import { IconArrowRight, IconCheck, IconClock } from "@/components/ui/Icon";
import { getProblem } from "@/lib/queries/problems";
import { getCurrentProfile } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE } from "@/lib/judge/languages";
import { DIFFICULTY_MULT } from "@/lib/economy/rules";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProblem(slug);
  if (!detail) return { title: "Problem not found" };

  return {
    title: detail.problem.title,
    description: `${detail.problem.difficulty} · ${detail.problem.topics.join(", ")} · solved by ${detail.problem.solved_count}.`,
  };
}

export default async function ProblemPage({ params }: Params) {
  const { slug } = await params;
  const [detail, viewer] = await Promise.all([getProblem(slug), getCurrentProfile()]);
  if (!detail) notFound();

  const { problem, samples, totalCases, solvedByViewer, viewerAttempts } = detail;
  const mult = DIFFICULTY_MULT[problem.difficulty];

  return (
    <Atmosphere grid={false}>
      <TopNav
        user={
          viewer
            ? {
                handle: viewer.handle,
                displayName: viewer.display_name,
                avatarSeed: viewer.avatar_seed,
              }
            : null
        }
        reputation={viewer?.reputation}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:pb-8">
        <Link
          href="/arena"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ghost transition-colors hover:text-flux"
        >
          <IconArrowRight size={13} className="rotate-180" />
          Arena
        </Link>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,40rem)_1fr] lg:items-start">
          {/* ---- statement ---- */}
          <div className="space-y-4 lg:sticky lg:top-[80px]">
            <Panel variant="solid" className="p-6" sheen>
              <div className="flex flex-wrap items-center gap-3">
                <DifficultyTag difficulty={problem.difficulty} />
                {solvedByViewer ? (
                  <Tag accent="flux">
                    <IconCheck size={11} /> solved
                  </Tag>
                ) : null}
                {problem.topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[30px]">
                {problem.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10.5px] tabular-nums text-faint">
                <span className="inline-flex items-center gap-[6px]">
                  <IconClock size={12} />
                  {problem.time_limit_ms}ms
                </span>
                <span>{problem.memory_limit_mb}mb</span>
                <span>{totalCases} cases</span>
                <span>{problem.solved_count} solved</span>
                {viewerAttempts > 0 ? <span>{viewerAttempts} attempts by you</span> : null}
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <Markdown content={problem.statement_md} />
              </div>

              {problem.constraints_md ? (
                <div className="mt-6 border-t border-line pt-6">
                  <Kicker>Constraints</Kicker>
                  <div className="mt-3">
                    <Markdown content={problem.constraints_md} />
                  </div>
                </div>
              ) : null}
            </Panel>

            {samples.length > 0 ? (
              <Panel className="p-6">
                <Kicker>Samples</Kicker>
                <div className="mt-4 space-y-4">
                  {samples.map((sample) => (
                    <div key={sample.ordinal} className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label as="div">Input</Label>
                        <pre className="mt-2 overflow-auto rounded-[9px] border border-line bg-[rgb(6_7_13/0.65)] px-[11px] py-[9px] font-mono text-[11.5px] leading-relaxed text-muted">
                          {sample.input || "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <Label as="div">Expected</Label>
                        <pre className="mt-2 overflow-auto rounded-[9px] border border-line bg-[rgb(6_7_13/0.65)] px-[11px] py-[9px] font-mono text-[11.5px] leading-relaxed text-muted">
                          {sample.expected || "(empty)"}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <Panel variant="tinted" accent="signal" className="p-5">
              <Label as="div">Reward</Label>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                A first accepted solve mints{" "}
                <span className="font-mono text-flux">{60 * mult} compute</span> and{" "}
                <span className="font-mono text-flux">{8 * mult} reputation</span>. Solving it again
                mints nothing, and the n-th reward of a kind in a rolling day is tapered.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-ghost">
                AI assistance is allowed and should be declared. Plagiarism is the line.
              </p>
            </Panel>
          </div>

          {/* ---- workspace ---- */}
          <div className="lg:h-[calc(100dvh-124px)]">
            <Workspace
              problemSlug={problem.slug}
              sampleCount={samples.length}
              totalCount={totalCases}
              defaultLanguage={DEFAULT_LANGUAGE}
              signedIn={Boolean(viewer)}
            />
          </div>
        </div>
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
