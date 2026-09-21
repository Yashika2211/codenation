import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { toAccent, type Accent } from "@/lib/design/accents";
import type { EventState, EventBracket } from "@/lib/supabase/types";

export type EventTrack = {
  slug: string;
  name: string;
  description: string;
  accent: Accent;
};

export type EventView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  state: EventState;
  accent: Accent;
  featured: boolean;
  isSeed: boolean;
  startsAt: string;
  endsAt: string;
  tracks: EventTrack[];
  prize: Record<string, number>;
  entrants: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  slot: number;
  a: { handle: string; displayName: string; avatarSeed: string } | null;
  b: { handle: string; displayName: string; avatarSeed: string } | null;
  winnerId: string | null;
  scoreA: number | null;
  scoreB: number | null;
};

export type LeaderboardRow = {
  handle: string;
  displayName: string;
  avatarSeed: string;
  score: number;
  placement: number | null;
  bracket: EventBracket;
  track: string;
  isSeed: boolean;
};

export type EventsView = {
  featured: EventView | null;
  upcoming: EventView[];
  past: EventView[];
  bracket: BracketMatch[];
  leaderboard: LeaderboardRow[];
  viewerEntered: boolean;
};

function parseTracks(value: unknown): EventTrack[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const row = raw as Record<string, unknown>;
    if (typeof row.slug !== "string" || typeof row.name !== "string") return [];
    return [
      {
        slug: row.slug,
        name: row.name,
        description: typeof row.description === "string" ? row.description : "",
        accent: toAccent(typeof row.accent === "string" ? row.accent : null),
      },
    ];
  });
}

function parsePrize(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number") out[key] = raw;
  }
  return out;
}

/**
 * Events, their bracket and their leaderboard.
 *
 * Everything here is a direct read — an empty platform shows an empty events
 * page rather than a fabricated hackathon, which is the same rule the landing
 * telemetry follows.
 */
export async function getEventsView(viewerId: string | null): Promise<EventsView> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return {
      featured: null,
      upcoming: [],
      past: [],
      bracket: [],
      leaderboard: [],
      viewerEntered: false,
    };
  }

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .neq("state", "draft")
    .order("starts_at", { ascending: false })
    .limit(30);

  if (!events || events.length === 0) {
    return {
      featured: null,
      upcoming: [],
      past: [],
      bracket: [],
      leaderboard: [],
      viewerEntered: false,
    };
  }

  const ids = events.map((row) => row.id);
  const { data: entryCounts } = await supabase
    .from("event_entries")
    .select("event_id")
    .in("event_id", ids);

  const counts = new Map<string, number>();
  for (const row of entryCounts ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const mapped: EventView[] = events.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description_md,
    state: row.state,
    accent: toAccent(row.accent),
    featured: row.featured,
    isSeed: row.is_seed,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    tracks: parseTracks(row.tracks),
    prize: parsePrize(row.prize),
    entrants: counts.get(row.id) ?? 0,
  }));

  // The featured row wins; otherwise whatever is live, otherwise the next one.
  const featured =
    mapped.find((e) => e.featured) ??
    mapped.find((e) => e.state === "live") ??
    mapped.find((e) => e.state === "upcoming") ??
    mapped[0] ??
    null;

  let bracket: BracketMatch[] = [];
  let leaderboard: LeaderboardRow[] = [];
  let viewerEntered = false;

  if (featured) {
    const [matchResult, entryResult] = await Promise.all([
      supabase
        .from("event_matches")
        .select(
          "id,round,slot,winner_id,score_a,score_b,a:player_a(handle,display_name,avatar_seed),b:player_b(handle,display_name,avatar_seed)",
        )
        .eq("event_id", featured.id)
        .order("round", { ascending: false })
        .order("slot", { ascending: true }),
      supabase
        .from("event_entries")
        .select("score,placement,bracket,track,user_id,profiles(handle,display_name,avatar_seed,is_seed)")
        .eq("event_id", featured.id)
        .order("score", { ascending: false })
        .limit(40),
    ]);

    type MatchJoin = {
      id: string;
      round: number;
      slot: number;
      winner_id: string | null;
      score_a: number | null;
      score_b: number | null;
      a: { handle: string; display_name: string; avatar_seed: string } | null;
      b: { handle: string; display_name: string; avatar_seed: string } | null;
    };

    bracket = ((matchResult.data ?? []) as unknown as MatchJoin[]).map((row) => ({
      id: row.id,
      round: row.round,
      slot: row.slot,
      a: row.a
        ? { handle: row.a.handle, displayName: row.a.display_name, avatarSeed: row.a.avatar_seed }
        : null,
      b: row.b
        ? { handle: row.b.handle, displayName: row.b.display_name, avatarSeed: row.b.avatar_seed }
        : null,
      winnerId: row.winner_id,
      scoreA: row.score_a,
      scoreB: row.score_b,
    }));

    type EntryJoin = {
      score: number;
      placement: number | null;
      bracket: EventBracket;
      track: string;
      user_id: string;
      profiles: {
        handle: string;
        display_name: string;
        avatar_seed: string;
        is_seed: boolean;
      } | null;
    };

    const entries = (entryResult.data ?? []) as unknown as EntryJoin[];
    viewerEntered = viewerId !== null && entries.some((row) => row.user_id === viewerId);

    leaderboard = entries
      .filter((row) => row.profiles !== null)
      .map((row) => ({
        handle: row.profiles?.handle ?? "",
        displayName: row.profiles?.display_name ?? "",
        avatarSeed: row.profiles?.avatar_seed ?? "",
        score: row.score,
        placement: row.placement,
        bracket: row.bracket,
        track: row.track,
        isSeed: row.profiles?.is_seed ?? false,
      }));
  }

  const now = Date.now();

  return {
    featured,
    upcoming: mapped.filter(
      (e) => e.id !== featured?.id && new Date(e.endsAt).getTime() >= now,
    ),
    past: mapped.filter((e) => e.id !== featured?.id && new Date(e.endsAt).getTime() < now),
    bracket,
    leaderboard,
    viewerEntered,
  };
}
