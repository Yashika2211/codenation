import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { toAccent, type Accent } from "@/lib/design/accents";
import { centroidFor, project, deconflict, type Projected } from "@/lib/world/geo";

export const ATLAS_WIDTH = 1000;
export const ATLAS_HEIGHT = 560;

export type AtlasNation = {
  id: string;
  slug: string;
  name: string;
  doctrine: string | null;
  accent: Accent;
  tier: number;
  prestige: number;
  countryCode: string | null;
  isSeed: boolean;
  citizens: number;
  buildings: number;
  x: number;
  y: number;
};

export type AtlasRoute = {
  id: string;
  fromSlug: string;
  toSlug: string;
  accent: Accent;
};

export type AtlasView = {
  nations: AtlasNation[];
  routes: AtlasRoute[];
  totalNations: number;
};

/**
 * The world atlas.
 *
 * Positions come from each nation's country code, projected onto the orbital
 * plane and then pushed apart so two nations founded in the same country do not
 * render as one marker. Trade arcs are drawn between nations in the same
 * alliance — real rows, not decoration.
 */
export async function getAtlasView(): Promise<AtlasView> {
  const supabase = await createServerSupabase();
  if (!supabase) return { nations: [], routes: [], totalNations: 0 };

  const { data, error } = await supabase
    .from("nations")
    .select("id,slug,name,doctrine,accent,tier,prestige,country_code,is_seed")
    .order("prestige", { ascending: false })
    .limit(120);

  if (error || !data || data.length === 0) {
    return { nations: [], routes: [], totalNations: 0 };
  }

  const ids = data.map((row) => row.id);

  const [citizenRows, buildingRows, allianceRows] = await Promise.all([
    supabase.from("profiles").select("nation_id").in("nation_id", ids),
    supabase.from("parcels").select("nation_id").in("nation_id", ids),
    supabase.from("alliance_members").select("alliance_id,nation_id").in("nation_id", ids),
  ]);

  const citizenCount = new Map<string, number>();
  for (const row of citizenRows.data ?? []) {
    if (!row.nation_id) continue;
    citizenCount.set(row.nation_id, (citizenCount.get(row.nation_id) ?? 0) + 1);
  }

  const buildingCount = new Map<string, number>();
  for (const row of buildingRows.data ?? []) {
    if (!row.nation_id) continue;
    buildingCount.set(row.nation_id, (buildingCount.get(row.nation_id) ?? 0) + 1);
  }

  const points: Array<Projected & { id: string }> = data.map((row) => {
    const projected = project(centroidFor(row.country_code), ATLAS_WIDTH, ATLAS_HEIGHT);
    return { id: row.id, x: projected.x, y: projected.y };
  });

  deconflict(points);
  const byId = new Map(points.map((point) => [point.id, point]));

  const nations: AtlasNation[] = data.map((row) => {
    const point = byId.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      doctrine: row.doctrine,
      accent: toAccent(row.accent),
      tier: row.tier,
      prestige: row.prestige,
      countryCode: row.country_code,
      isSeed: row.is_seed,
      citizens: citizenCount.get(row.id) ?? 0,
      buildings: buildingCount.get(row.id) ?? 0,
      x: point?.x ?? ATLAS_WIDTH / 2,
      y: point?.y ?? ATLAS_HEIGHT / 2,
    };
  });

  // Arcs join nations that actually share an alliance.
  const slugById = new Map(nations.map((n) => [n.id, n.slug]));
  const accentById = new Map(nations.map((n) => [n.id, n.accent]));
  const byAlliance = new Map<string, string[]>();

  for (const row of allianceRows.data ?? []) {
    const list = byAlliance.get(row.alliance_id) ?? [];
    list.push(row.nation_id);
    byAlliance.set(row.alliance_id, list);
  }

  const routes: AtlasRoute[] = [];
  for (const [allianceId, members] of byAlliance) {
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        if (!a || !b) continue;
        const fromSlug = slugById.get(a);
        const toSlug = slugById.get(b);
        if (!fromSlug || !toSlug) continue;

        routes.push({
          id: `${allianceId}:${a}:${b}`,
          fromSlug,
          toSlug,
          accent: accentById.get(a) ?? "ion",
        });
      }
    }
  }

  return { nations, routes, totalNations: nations.length };
}
