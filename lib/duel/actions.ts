"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase, canUseServiceRole } from "@/lib/supabase/service";
import { mint } from "@/lib/economy/mint";
import { duelWinGrants, duelLossGrants, eloDelta, REASONS } from "@/lib/economy/rules";
import { hasRank } from "@/lib/progression/ranks";
import { evaluateBadges } from "@/lib/progression/award";
import { DUEL_MINUTES } from "./config";

/**
 * Rated duels.
 *
 * Matchmaking is deliberately simple: an open duel is a row with one player and
 * no opponent. Joining one fills the second seat and starts the clock. Elo
 * settles it at K=32, and both ratings move inside the same server call that
 * writes the winner — so a disconnect cannot leave a duel half-scored.
 */

export type DuelActionResult = { ok: boolean; message: string; duelId?: string };

async function requireDuellist() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,handle,reputation,arena_rating")
    .eq("id", userData.user.id)
    .maybeSingle();

  return profile ?? null;
}

/** Opens a duel seat, or joins one already waiting. */
export async function findMatch(): Promise<DuelActionResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Duels are not configured here." };

  const me = await requireDuellist();
  if (!me) return { ok: false, message: "Sign in to duel." };

  // Rated duels open at Artisan, 500 reputation.
  if (!hasRank(me.reputation, "artisan")) {
    return {
      ok: false,
      message: `Rated duels open at 500 reputation. You have ${me.reputation.toLocaleString("en-US")}.`,
    };
  }

  const service = createServiceSupabase();

  // Already in something live? Go back to it rather than opening another.
  const { data: active } = await service
    .from("duels")
    .select("id")
    .or(`player_a.eq.${me.id},player_b.eq.${me.id}`)
    .in("state", ["pending", "live"])
    .limit(1)
    .maybeSingle();

  if (active) return { ok: true, message: "Rejoining your duel.", duelId: active.id };

  // Take the oldest open seat that is not our own.
  const { data: open } = await service
    .from("duels")
    .select("id,player_a,problem_id")
    .eq("state", "pending")
    .is("player_b", null)
    .neq("player_a", me.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (open) {
    const endsAt = new Date(Date.now() + DUEL_MINUTES * 60_000).toISOString();

    // The state filter is the lock: whoever's update matches first wins the
    // seat, and the loser falls through to opening their own.
    const { data: joined } = await service
      .from("duels")
      .update({
        player_b: me.id,
        state: "live",
        started_at: new Date().toISOString(),
        ends_at: endsAt,
      })
      .eq("id", open.id)
      .eq("state", "pending")
      .is("player_b", null)
      .select("id")
      .maybeSingle();

    if (joined) {
      await service.from("activity_feed").insert({
        actor_id: me.id,
        verb: "joined",
        object_type: "duel",
        object_id: joined.id,
        payload: { role: "challenger" },
      });

      revalidatePath("/duel");
      return { ok: true, message: "Match found.", duelId: joined.id };
    }
  }

  // Nothing open: post a seat on a problem at a fair difficulty.
  const { data: problems } = await service
    .from("problems")
    .select("id")
    .eq("is_public", true)
    .in("difficulty", me.arena_rating >= 1600 ? ["hard", "expert"] : ["easy", "medium"])
    .limit(40);

  if (!problems || problems.length === 0) {
    return { ok: false, message: "No problems are available to duel on." };
  }

  const choice = problems[Math.floor(Math.random() * problems.length)];
  if (!choice) return { ok: false, message: "No problems are available to duel on." };

  const { data: created, error } = await service
    .from("duels")
    .insert({ problem_id: choice.id, player_a: me.id, state: "pending" })
    .select("id")
    .single();

  if (error || !created) return { ok: false, message: "Could not open a duel." };

  revalidatePath("/duel");
  return { ok: true, message: "Waiting for an opponent.", duelId: created.id };
}

export async function withdrawFromDuel(duelId: string): Promise<DuelActionResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Not available." };

  const me = await requireDuellist();
  if (!me) return { ok: false, message: "Sign in first." };

  const service = createServiceSupabase();
  const { data: duel } = await service
    .from("duels")
    .select("id,player_a,player_b,state")
    .eq("id", duelId)
    .maybeSingle();

  if (!duel) return { ok: false, message: "No such duel." };
  if (duel.player_a !== me.id && duel.player_b !== me.id) {
    return { ok: false, message: "You are not in that duel." };
  }

  // Abandoning an unstarted seat costs nothing; abandoning a live duel concedes.
  if (duel.state === "pending") {
    await service.from("duels").update({ state: "abandoned" }).eq("id", duel.id);
    revalidatePath("/duel");
    return { ok: true, message: "Seat withdrawn." };
  }

  const opponent = duel.player_a === me.id ? duel.player_b : duel.player_a;
  if (opponent) await settleDuel(duel.id, opponent);

  revalidatePath("/duel");
  return { ok: true, message: "Conceded." };
}

/**
 * Settles a duel: writes the winner, moves both ratings by Elo, and mints.
 *
 * Idempotent — it refuses to run twice on the same duel, so a double submit or
 * a retried timeout cannot pay out twice.
 */
export async function settleDuel(duelId: string, winnerId: string): Promise<void> {
  const service = createServiceSupabase();

  const { data: duel } = await service
    .from("duels")
    .select("id,player_a,player_b,state,winner_id")
    .eq("id", duelId)
    .maybeSingle();

  if (!duel || !duel.player_b) return;
  if (duel.state === "finished" || duel.winner_id) return;

  const loserId = duel.player_a === winnerId ? duel.player_b : duel.player_a;

  const { data: players } = await service
    .from("profiles")
    .select("id,arena_rating")
    .in("id", [duel.player_a, duel.player_b]);

  const ratingOf = new Map((players ?? []).map((p) => [p.id, p.arena_rating]));
  const winnerRating = ratingOf.get(winnerId) ?? 1200;
  const loserRating = ratingOf.get(loserId) ?? 1200;

  const winnerDelta = eloDelta(winnerRating, loserRating, 1);
  const loserDelta = eloDelta(loserRating, winnerRating, 0);

  // Claim the duel first. If another call already did, stop here.
  const { data: claimed } = await service
    .from("duels")
    .update({
      state: "finished",
      winner_id: winnerId,
      rating_delta_a: duel.player_a === winnerId ? winnerDelta : loserDelta,
      rating_delta_b: duel.player_b === winnerId ? winnerDelta : loserDelta,
    })
    .eq("id", duel.id)
    .is("winner_id", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return;

  await service
    .from("profiles")
    .update({ arena_rating: Math.max(100, winnerRating + winnerDelta) })
    .eq("id", winnerId);

  await service
    .from("profiles")
    .update({ arena_rating: Math.max(100, loserRating + loserDelta) })
    .eq("id", loserId);

  await mint({
    userId: winnerId,
    reason: REASONS.duelWin,
    grants: duelWinGrants(),
    refTable: "duels",
    refId: duel.id,
  });

  await mint({
    userId: loserId,
    reason: REASONS.duelLoss,
    grants: duelLossGrants(),
    refTable: "duels",
    refId: duel.id,
  });

  await service.from("activity_feed").insert({
    actor_id: winnerId,
    verb: "won a duel",
    object_type: "duel",
    object_id: duel.id,
    payload: { delta: winnerDelta },
  });

  await evaluateBadges(winnerId);
  await evaluateBadges(loserId);
}

/** Called when the clock runs out: most cases passed wins, else a draw. */
export async function resolveExpiredDuel(duelId: string): Promise<void> {
  const service = createServiceSupabase();

  const { data: duel } = await service
    .from("duels")
    .select("id,player_a,player_b,state,ends_at,winner_id")
    .eq("id", duelId)
    .maybeSingle();

  if (!duel || !duel.player_b || duel.state !== "live" || duel.winner_id) return;
  if (!duel.ends_at || new Date(duel.ends_at).getTime() > Date.now()) return;

  const { data: submissions } = await service
    .from("submissions")
    .select("user_id,passed,total,status,created_at")
    .eq("duel_id", duel.id)
    .order("created_at", { ascending: true });

  const best = new Map<string, number>();
  for (const row of submissions ?? []) {
    const score = row.status === "accepted" ? 1000 + row.passed : row.passed;
    best.set(row.user_id, Math.max(best.get(row.user_id) ?? 0, score));
  }

  const scoreA = best.get(duel.player_a) ?? 0;
  const scoreB = best.get(duel.player_b) ?? 0;

  if (scoreA === scoreB) {
    // A genuine draw leaves ratings alone; both still get participation.
    await service.from("duels").update({ state: "finished" }).eq("id", duel.id);
    await mint({
      userId: duel.player_a,
      reason: REASONS.duelLoss,
      grants: duelLossGrants(),
      refTable: "duels",
      refId: duel.id,
    });
    await mint({
      userId: duel.player_b,
      reason: REASONS.duelLoss,
      grants: duelLossGrants(),
      refTable: "duels",
      refId: duel.id,
    });
    return;
  }

  await settleDuel(duel.id, scoreA > scoreB ? duel.player_a : duel.player_b);
}

export async function enterMatchmaking(): Promise<void> {
  const result = await findMatch();
  if (result.duelId) redirect(`/duel/${result.duelId}`);
  redirect("/duel?error=1");
}
