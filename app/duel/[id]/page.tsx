import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { DuelArena, type DuelPlayer } from "@/components/duel/DuelArena";
import { createServerSupabase, getCurrentProfile } from "@/lib/supabase/server";
import { canUseServiceRole } from "@/lib/supabase/service";
import { resolveExpiredDuel } from "@/lib/duel/actions";
import { DEFAULT_LANGUAGE } from "@/lib/judge/languages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duel",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ id: string }> };

export default async function DuelPage({ params }: Params) {
  const { id } = await params;

  const viewer = await getCurrentProfile();
  if (!viewer) redirect(`/signin?next=/duel/${id}`);

  const supabase = await createServerSupabase();
  if (!supabase) notFound();

  // Settle an expired duel before reading it, so the page never shows a live
  // clock that ran out minutes ago.
  if (canUseServiceRole()) {
    await resolveExpiredDuel(id);
  }

  const { data: duel } = await supabase
    .from("duels")
    .select("id,problem_id,player_a,player_b,state,started_at,ends_at,winner_id")
    .eq("id", id)
    .maybeSingle();

  if (!duel) notFound();

  const isParticipant = duel.player_a === viewer.id || duel.player_b === viewer.id;
  if (!isParticipant) redirect("/duel");

  const opponentId = duel.player_a === viewer.id ? duel.player_b : duel.player_a;

  const [profileResult, problemResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,handle,display_name,avatar_seed,arena_rating")
      .in("id", [duel.player_a, duel.player_b ?? duel.player_a]),
    supabase
      .from("problems")
      .select("id,slug,title,difficulty")
      .eq("id", duel.problem_id)
      .maybeSingle(),
  ]);

  const problem = problemResult.data;
  if (!problem) notFound();

  const byId = new Map((profileResult.data ?? []).map((row) => [row.id, row]));
  const toPlayer = (row: NonNullable<ReturnType<typeof byId.get>>): DuelPlayer => ({
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed,
    rating: row.arena_rating,
  });

  const meRow = byId.get(viewer.id);
  const opponentRow = opponentId ? byId.get(opponentId) : undefined;

  const [{ count: sampleCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from("testcases")
      .select("id", { count: "exact", head: true })
      .eq("problem_id", problem.id)
      .eq("is_sample", true),
    supabase.from("testcases").select("id", { count: "exact", head: true }).eq("problem_id", problem.id),
  ]);

  return (
    <Atmosphere grid={false}>
      <TopNav
        user={{
          handle: viewer.handle,
          displayName: viewer.display_name,
          avatarSeed: viewer.avatar_seed,
        }}
        reputation={viewer.reputation}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:pb-8">
        <DuelArena
          duelId={duel.id}
          state={duel.state}
          endsAt={duel.ends_at}
          winnerId={duel.winner_id}
          me={
            meRow
              ? toPlayer(meRow)
              : {
                  id: viewer.id,
                  handle: viewer.handle,
                  displayName: viewer.display_name,
                  avatarSeed: viewer.avatar_seed,
                  rating: viewer.arena_rating,
                }
          }
          opponent={opponentRow ? toPlayer(opponentRow) : null}
          problem={{ slug: problem.slug, title: problem.title, difficulty: problem.difficulty }}
          sampleCount={sampleCount ?? 0}
          totalCount={totalCount ?? 0}
          defaultLanguage={DEFAULT_LANGUAGE}
        />
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
