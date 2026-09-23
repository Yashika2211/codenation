import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { DifficultyTag, Tag } from "@/components/ui/Tag";
import { ButtonLink } from "@/components/ui/Button";
import { IconCheck, IconSwords, IconArrowRight } from "@/components/ui/Icon";
import { listProblems, getLadder } from "@/lib/queries/problems";
import { getCurrentProfile } from "@/lib/supabase/server";
import { rankFor } from "@/lib/progression/ranks";
import type { Difficulty } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena",
  description: "Solve real problems against a real judge. Rated duels settle with Elo.",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; topic?: string; q?: string }>;
}) {
  const params = await searchParams;
  const difficulty = DIFFICULTIES.includes(params.difficulty as Difficulty)
    ? (params.difficulty as Difficulty)
    : null;

  const [problems, ladder, viewer] = await Promise.all([
    listProblems({ difficulty, topic: params.topic ?? null, search: params.q ?? null }),
    getLadder(12),
    getCurrentProfile(),
  ]);

  const topics = Array.from(new Set(problems.flatMap((p) => p.topics))).sort().slice(0, 14);
  const solvedCount = problems.filter((p) => p.solvedByViewer).length;

  return (
    <Atmosphere>
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

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker>Arena</Kicker>
        <PageTitle className="mt-4">Solve something real</PageTitle>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Every problem runs against a live judge in seven languages. Sample cases on Run, the full
          hidden set on Submit, and resources mint inside the same transaction that records the
          verdict.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
          <div>
            {/* filters */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill href="/arena" active={!difficulty && !params.topic}>
                All
              </FilterPill>
              {DIFFICULTIES.map((level) => (
                <FilterPill
                  key={level}
                  href={`/arena?difficulty=${level}`}
                  active={difficulty === level}
                >
                  {level}
                </FilterPill>
              ))}

              {viewer ? (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
                  {solvedCount}/{problems.length} solved
                </span>
              ) : null}
            </div>

            {topics.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {topics.map((topic) => (
                  <FilterPill
                    key={topic}
                    href={`/arena?topic=${encodeURIComponent(topic)}`}
                    active={params.topic === topic}
                    subtle
                  >
                    {topic}
                  </FilterPill>
                ))}
              </div>
            ) : null}

            {/* list */}
            <div className="mt-6">
              {problems.length === 0 ? (
                <Panel className="p-8 text-center">
                  <SectionTitle>No problems yet</SectionTitle>
                  <p className="mx-auto mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-dim">
                    The problem set loads from the database. Once the migrations and seed have run
                    against a Supabase project, the full catalogue appears here.
                  </p>
                </Panel>
              ) : (
                <ul className="space-y-2">
                  {problems.map((problem) => (
                    <li key={problem.slug}>
                      <Link href={`/arena/${problem.slug}`} className="block">
                        <Panel className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[14px] transition-colors hover:bg-glass-hi">
                          {problem.solvedByViewer ? (
                            <span className="text-flux">
                              <IconCheck size={15} />
                            </span>
                          ) : (
                            <span
                              aria-hidden
                              className="block size-[15px] rounded-full border border-line"
                            />
                          )}

                          <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-text">
                            {problem.title}
                          </span>

                          <span className="hidden gap-2 sm:flex">
                            {problem.topics.slice(0, 2).map((topic) => (
                              <span
                                key={topic}
                                className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ghost"
                              >
                                {topic}
                              </span>
                            ))}
                          </span>

                          <span className="font-mono text-[10.5px] tabular-nums text-faint">
                            {problem.solvedCount}
                          </span>

                          <DifficultyTag difficulty={problem.difficulty} />
                        </Panel>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* rail */}
          <aside className="space-y-4">
            <Panel variant="tinted" accent="plasma" className="p-5">
              <Kicker color="#E84FA8">Rated duel</Kicker>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Head-to-head on one problem with a live countdown. You see your opponent&apos;s cases
                passed and last submit — never their source. Elo settles it, K=32.
              </p>
              <ButtonLink
                href="/duel"
                variant="outline"
                accent="plasma"
                className="mt-5"
                fullWidth
                icon={<IconSwords size={15} />}
              >
                Find a match
              </ButtonLink>
              {viewer ? (
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
                  your rating {viewer.arena_rating}
                </p>
              ) : null}
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <Kicker>Ladder</Kicker>
                <Label>Elo</Label>
              </div>

              {ladder.length === 0 ? (
                <p className="mt-4 text-[12.5px] text-dim">
                  No rated players yet. The ladder fills as duels are played.
                </p>
              ) : (
                <ol className="mt-4 space-y-[10px]">
                  {ladder.map((player, index) => {
                    const rank = rankFor(player.reputation);
                    return (
                      <li key={player.handle}>
                        <Link
                          href={`/u/${player.handle}`}
                          className="flex items-center gap-3 rounded-chip px-1 py-1 transition-colors hover:bg-glass"
                        >
                          <span className="w-[18px] font-mono text-[10.5px] tabular-nums text-ghost">
                            {index + 1}
                          </span>
                          <Avatar
                            seed={player.avatar_seed}
                            name={player.display_name}
                            size="xs"
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                            {player.display_name}
                          </span>
                          {player.is_seed ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ghost">
                              seed
                            </span>
                          ) : null}
                          <Tag accent={rank.accent}>{player.arena_rating}</Tag>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>

            <Panel className="p-5">
              <Kicker color="#5FC8FF">Integrity</Kicker>
              <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
                Assistance is allowed and should be declared. Similarity fingerprints and paste
                cadence raise flags for a human, never an automatic penalty.
              </p>
              <Link
                href="/fairplay"
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-signal transition-colors hover:text-text"
              >
                Read the charter
                <IconArrowRight size={12} />
              </Link>
            </Panel>
          </aside>
        </div>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}

function FilterPill({
  href,
  active,
  subtle = false,
  children,
}: {
  href: string;
  active: boolean;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-[44px] items-center rounded-chip border px-[13px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-[rgb(59_232_176/0.38)] bg-[rgb(59_232_176/0.12)] text-flux"
          : subtle
            ? "border-transparent text-ghost hover:text-dim"
            : "border-line text-dim hover:bg-glass hover:text-text",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
