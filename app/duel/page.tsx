import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/StatTile";
import { Tag } from "@/components/ui/Tag";
import { IconSwords, IconArrowRight } from "@/components/ui/Icon";
import { enterMatchmaking, DUEL_MINUTES } from "@/lib/duel/actions";
import { createServerSupabase, getCurrentProfile } from "@/lib/supabase/server";
import { hasRank } from "@/lib/progression/ranks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duels",
  description: "Rated head-to-head on one problem. Elo settles it at K=32.",
};

export default async function DuelLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getCurrentProfile();
  if (!viewer) redirect("/signin?next=/duel");

  const supabase = await createServerSupabase();

  const [openResult, historyResult] = await Promise.all([
    supabase
      ? supabase
          .from("duels")
          .select("id,created_at,problems(title,difficulty),profiles!duels_player_a_fkey(handle,display_name,avatar_seed,arena_rating)")
          .eq("state", "pending")
          .is("player_b", null)
          .order("created_at", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: null }),
    supabase
      ? supabase
          .from("duels")
          .select("id,state,winner_id,rating_delta_a,rating_delta_b,player_a,player_b,created_at,problems(title)")
          .or(`player_a.eq.${viewer.id},player_b.eq.${viewer.id}`)
          .eq("state", "finished")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
  ]);

  type OpenJoin = {
    id: string;
    created_at: string;
    problems: { title: string; difficulty: string } | null;
    profiles: { handle: string; display_name: string; avatar_seed: string; arena_rating: number } | null;
  };

  type HistoryJoin = {
    id: string;
    state: string;
    winner_id: string | null;
    rating_delta_a: number | null;
    rating_delta_b: number | null;
    player_a: string;
    player_b: string | null;
    created_at: string;
    problems: { title: string } | null;
  };

  const open = ((openResult.data ?? []) as unknown as OpenJoin[]).filter(
    (row) => row.profiles !== null,
  );
  const history = (historyResult.data ?? []) as unknown as HistoryJoin[];

  const wins = history.filter((d) => d.winner_id === viewer.id).length;
  const eligible = hasRank(viewer.reputation, "artisan");

  return (
    <Atmosphere>
      <TopNav
        user={{
          handle: viewer.handle,
          displayName: viewer.display_name,
          avatarSeed: viewer.avatar_seed,
        }}
        reputation={viewer.reputation}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker color="#E84FA8">Rated duels</Kicker>
        <PageTitle className="mt-3">Head to head, one problem</PageTitle>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          You and one opponent get the same problem and {DUEL_MINUTES} minutes. You can see their
          cases passed and when they last submitted — never their source. Elo settles it at K=32.
        </p>

        {params.error ? (
          <p
            role="alert"
            className="mt-6 rounded-chip border border-[rgb(255_107_129/0.3)] bg-[rgb(255_107_129/0.1)] px-4 py-3 text-[12.5px] text-[#FF8A9C]"
          >
            Could not enter matchmaking. Try again in a moment.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Your rating" value={viewer.arena_rating} sub="Elo, K=32" accent="signal" emphasis />
          <StatTile label="Duels won" value={wins} sub={`of ${history.length} settled`} accent="plasma" emphasis />
          <StatTile label="Open seats" value={open.length} sub="waiting for an opponent" />
          <StatTile label="Clock" value={`${DUEL_MINUTES}m`} sub="per duel" accent="amber" emphasis />
        </div>

        <Panel variant="solid" className="mt-6 p-6 sm:p-8" sheen>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SectionTitle>
                {eligible ? "Find a match" : "Rated duels open at Artisan"}
              </SectionTitle>
              <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-muted">
                {eligible
                  ? "Takes the oldest open seat, or opens one for you if nobody is waiting."
                  : `You need 500 reputation. You have ${viewer.reputation.toLocaleString("en-US")}.`}
              </p>
            </div>

            <form action={enterMatchmaking}>
              <Button
                type="submit"
                size="lg"
                accent="plasma"
                disabled={!eligible}
                icon={<IconSwords size={17} />}
              >
                Enter matchmaking
              </Button>
            </form>
          </div>
        </Panel>

        {/* open seats */}
        <section className="mt-10">
          <SectionTitle>Open seats</SectionTitle>
          {open.length === 0 ? (
            <Panel className="mt-4 p-6">
              <p className="text-[13px] text-dim">
                Nobody is waiting. Enter matchmaking to open a seat of your own.
              </p>
            </Panel>
          ) : (
            <ul className="mt-4 space-y-2">
              {open.map((duel) => (
                <li key={duel.id}>
                  <Panel className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[13px]">
                    <Avatar
                      seed={duel.profiles?.avatar_seed ?? "anon"}
                      name={duel.profiles?.display_name ?? "Player"}
                      size="xs"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-text">
                      {duel.profiles?.display_name}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-dim">
                      {duel.profiles?.arena_rating}
                    </span>
                    {duel.problems ? <Tag accent="plasma">{duel.problems.difficulty}</Tag> : null}
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
                      {duel.created_at.slice(11, 16)}
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* history */}
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>Your duels</SectionTitle>
            <Label>{history.length} settled</Label>
          </div>

          {history.length === 0 ? (
            <Panel className="mt-4 p-6">
              <p className="text-[13px] text-dim">You have not finished a duel yet.</p>
            </Panel>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map((duel) => {
                const won = duel.winner_id === viewer.id;
                const delta =
                  duel.player_a === viewer.id ? duel.rating_delta_a : duel.rating_delta_b;

                return (
                  <li key={duel.id}>
                    <Link href={`/duel/${duel.id}`} className="block">
                      <Panel className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[13px] transition-colors hover:bg-glass-hi">
                        <Tag accent={won ? "flux" : "signal"}>
                          {duel.winner_id === null ? "draw" : won ? "win" : "loss"}
                        </Tag>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-muted">
                          {duel.problems?.title ?? "Problem"}
                        </span>
                        {delta !== null ? (
                          <span
                            className={`font-mono text-[11.5px] tabular-nums ${
                              delta >= 0 ? "text-flux" : "text-[#FF8A9C]"
                            }`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta}
                          </span>
                        ) : null}
                        <span className="font-mono text-[10px] text-ghost">
                          {duel.created_at.slice(0, 10)}
                        </span>
                      </Panel>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Link
          href="/arena"
          className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ghost transition-colors hover:text-flux"
        >
          Back to the Arena
          <IconArrowRight size={12} />
        </Link>
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
