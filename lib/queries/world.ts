import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { canUseServiceRole } from "@/lib/supabase/service";
import { runUpkeepFor, advanceBuildQueue } from "@/lib/world/upkeep";
import { toAccent, type Accent } from "@/lib/design/accents";
import type { IsoTile, BuildingState } from "@/components/ui/IsoPlate";

/** An IsoPlate tile that may also carry a forged skin blob. */
export type WorldTile = IsoTile & { forgedParams?: unknown };
import type { BlueprintRow, ProfileRow } from "@/lib/supabase/types";

export type CityView = {
  profile: ProfileRow;
  wallet: { compute: number; data: number; alloy: number };
  tiles: IsoTile[];
  parcels: Array<{ id: string; x: number; y: number; hasBuilding: boolean }>;
  queue: Array<{
    id: string;
    name: string;
    accent: Accent;
    progress: number;
    eta: string | null;
    state: BuildingState;
  }>;
  blueprints: BlueprintRow[];
  nation: { slug: string; name: string; accent: Accent } | null;
  feed: Array<{ id: string; verb: string; handle: string; payload: Record<string, unknown>; at: string }>;
};

type BuildingJoin = {
  id: string;
  level: number;
  accent: string;
  state: BuildingState;
  progress: number;
  eta: string | null;
  window_density: number;
  parcel_id: string;
  parcels: { grid_x: number; grid_y: number } | null;
  blueprints: { name: string; slug: string } | null;
};

/**
 * The city view. Charges upkeep and advances construction before reading, so
 * the numbers on screen are the numbers the economy actually believes — there
 * is no scheduled job on the free tier, and a stale city would lie.
 */
export async function getCityView(userId: string): Promise<CityView | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  if (canUseServiceRole()) {
    await advanceBuildQueue(userId);
    await runUpkeepFor(userId);
  }

  const [profileResult, walletResult, buildingResult, parcelResult, blueprintResult, feedResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("compute,data,alloy").eq("user_id", userId).maybeSingle(),
      supabase
        .from("buildings")
        .select(
          "id,level,accent,state,progress,eta,window_density,parcel_id,parcels(grid_x,grid_y),blueprints(name,slug)",
        )
        .eq("owner_id", userId),
      supabase.from("parcels").select("id,grid_x,grid_y").eq("owner_id", userId),
      supabase.from("blueprints").select("*").order("requires_rep", { ascending: true }),
      supabase
        .from("activity_feed")
        .select("id,verb,payload,at,profiles(handle)")
        .order("at", { ascending: false })
        .limit(14),
    ]);

  const profile = profileResult.data;
  if (!profile) return null;

  const buildings = (buildingResult.data ?? []) as unknown as BuildingJoin[];

  const tiles: IsoTile[] = buildings
    .filter((row) => row.parcels !== null)
    .map((row) => ({
      x: row.parcels?.grid_x ?? 0,
      y: row.parcels?.grid_y ?? 0,
      building: {
        id: row.id,
        name: row.blueprints?.name ?? "Structure",
        level: row.level,
        accent: toAccent(row.accent),
        state: row.state,
        windowDensity: row.window_density,
      },
    }));

  const occupied = new Set(buildings.map((row) => row.parcel_id));

  const queue = buildings
    .filter((row) => row.state === "queued" || row.state === "building")
    .map((row) => ({
      id: row.id,
      name: row.blueprints?.name ?? "Structure",
      accent: toAccent(row.accent),
      progress: row.progress,
      eta: row.eta,
      state: row.state,
    }));

  let nation: CityView["nation"] = null;
  if (profile.nation_id) {
    const { data } = await supabase
      .from("nations")
      .select("slug,name,accent")
      .eq("id", profile.nation_id)
      .maybeSingle();
    if (data) nation = { slug: data.slug, name: data.name, accent: toAccent(data.accent) };
  }

  type FeedJoin = {
    id: string;
    verb: string;
    payload: Record<string, unknown>;
    at: string;
    profiles: { handle: string } | null;
  };

  const feed = ((feedResult.data ?? []) as unknown as FeedJoin[]).map((row) => ({
    id: row.id,
    verb: row.verb,
    handle: row.profiles?.handle ?? "someone",
    payload: row.payload,
    at: row.at,
  }));

  return {
    profile,
    wallet: walletResult.data ?? { compute: 0, data: 0, alloy: 0 },
    tiles,
    parcels: (parcelResult.data ?? []).map((row) => ({
      id: row.id,
      x: row.grid_x,
      y: row.grid_y,
      hasBuilding: occupied.has(row.id),
    })),
    queue,
    blueprints: blueprintResult.data ?? [],
    nation,
    feed,
  };
}

export type NationView = {
  nation: {
    id: string;
    slug: string;
    name: string;
    doctrine: string | null;
    accent: Accent;
    tier: number;
    prestige: number;
    countryCode: string | null;
    isSeed: boolean;
    foundedAt: string;
  };
  founder: { handle: string; displayName: string; avatarSeed: string } | null;
  tiles: WorldTile[];
  citizens: Array<{ handle: string; displayName: string; avatarSeed: string; reputation: number }>;
  buildingCount: number;
  guestbook: Array<{ id: string; body: string; at: string; handle: string; avatarSeed: string }>;
  visitorCount: number;
};

export async function getNationView(slug: string): Promise<NationView | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: nation } = await supabase
    .from("nations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!nation) return null;

  const [founderResult, buildingResult, citizenResult, guestbookResult, visitResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("handle,display_name,avatar_seed")
        .eq("id", nation.founder_id)
        .maybeSingle(),
      supabase
        .from("buildings")
        .select(
          "id,level,accent,state,window_density,custom_item_id,parcels!inner(grid_x,grid_y,nation_id),blueprints(name),item_instances(params)",
        )
        .eq("parcels.nation_id", nation.id),
      supabase
        .from("profiles")
        .select("handle,display_name,avatar_seed,reputation")
        .eq("nation_id", nation.id)
        .order("reputation", { ascending: false })
        .limit(24),
      supabase
        .from("guestbook")
        .select("id,body,at,profiles(handle,avatar_seed)")
        .eq("nation_id", nation.id)
        .order("at", { ascending: false })
        .limit(20),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("nation_id", nation.id),
    ]);

  type NationBuildingJoin = {
    id: string;
    level: number;
    accent: string;
    state: BuildingState;
    window_density: number;
    custom_item_id: string | null;
    parcels: { grid_x: number; grid_y: number } | null;
    blueprints: { name: string } | null;
    /** The forged skin applied to this building, when one is. */
    item_instances: { params: unknown } | null;
  };

  const buildings = (buildingResult.data ?? []) as unknown as NationBuildingJoin[];

  const tiles: WorldTile[] = buildings
    .filter((row) => row.parcels !== null)
    .map((row) => ({
      x: (row.parcels?.grid_x ?? 0) % 6,
      y: (row.parcels?.grid_y ?? 0) % 6,
      building: {
        id: row.id,
        name: row.blueprints?.name ?? "Structure",
        level: row.level,
        accent: toAccent(row.accent),
        state: row.state,
        windowDensity: row.window_density,
      },
      // A forged skin replaces the default body with <ForgedBuilding>, rendered
      // by the page so this module stays free of JSX.
      forgedParams: row.item_instances?.params ?? null,
    }));

  type GuestJoin = {
    id: string;
    body: string;
    at: string;
    profiles: { handle: string; avatar_seed: string } | null;
  };

  return {
    nation: {
      id: nation.id,
      slug: nation.slug,
      name: nation.name,
      doctrine: nation.doctrine,
      accent: toAccent(nation.accent),
      tier: nation.tier,
      prestige: nation.prestige,
      countryCode: nation.country_code,
      isSeed: nation.is_seed,
      foundedAt: nation.founded_at,
    },
    founder: founderResult.data
      ? {
          handle: founderResult.data.handle,
          displayName: founderResult.data.display_name,
          avatarSeed: founderResult.data.avatar_seed,
        }
      : null,
    tiles,
    citizens: (citizenResult.data ?? []).map((row) => ({
      handle: row.handle,
      displayName: row.display_name,
      avatarSeed: row.avatar_seed,
      reputation: row.reputation,
    })),
    buildingCount: buildings.filter((b) => b.state === "complete").length,
    guestbook: ((guestbookResult.data ?? []) as unknown as GuestJoin[]).map((row) => ({
      id: row.id,
      body: row.body,
      at: row.at,
      handle: row.profiles?.handle ?? "visitor",
      avatarSeed: row.profiles?.avatar_seed ?? "anon",
    })),
    visitorCount: visitResult.count ?? 0,
  };
}
