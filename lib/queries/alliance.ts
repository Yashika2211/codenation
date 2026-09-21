import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { toAccent, type Accent } from "@/lib/design/accents";
import type { AllianceRole, TradeStateDb } from "@/lib/supabase/types";

export type AllianceMemberView = {
  nationSlug: string;
  nationName: string;
  accent: Accent;
  tier: number;
  prestige: number;
  role: AllianceRole;
  contribution: number;
};

export type TradeView = {
  id: string;
  fromSlug: string;
  fromName: string;
  toSlug: string | null;
  toName: string | null;
  offer: Record<string, number>;
  want: Record<string, number>;
  state: TradeStateDb;
  note: string | null;
  createdAt: string;
};

export type AllianceView = {
  id: string;
  slug: string;
  name: string;
  charter: string;
  accent: Accent;
  tier: number;
  treasury: Record<string, number>;
  foundedAt: string;
  members: AllianceMemberView[];
  trades: TradeView[];
  totalPrestige: number;
  /** The viewer's nation, when it belongs to this alliance. */
  viewerNation: { slug: string; name: string; role: AllianceRole } | null;
};

function numbers(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && raw > 0) out[key] = raw;
  }
  return out;
}

export async function listAlliances() {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("alliances")
    .select("slug,name,accent,tier,founded_at,alliance_members(count)")
    .order("tier", { ascending: false })
    .limit(40);

  type Join = {
    slug: string;
    name: string;
    accent: string;
    tier: number;
    founded_at: string;
    alliance_members: { count: number }[] | null;
  };

  return ((data ?? []) as unknown as Join[]).map((row) => ({
    slug: row.slug,
    name: row.name,
    accent: toAccent(row.accent),
    tier: row.tier,
    foundedAt: row.founded_at,
    members: row.alliance_members?.[0]?.count ?? 0,
  }));
}

export async function getAlliance(slug: string): Promise<AllianceView | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: alliance } = await supabase
    .from("alliances")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!alliance) return null;

  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  const [memberResult, viewerResult] = await Promise.all([
    supabase
      .from("alliance_members")
      .select("role,contribution,nations(slug,name,accent,tier,prestige)")
      .eq("alliance_id", alliance.id)
      .order("contribution", { ascending: false }),
    viewerId
      ? supabase.from("profiles").select("nation_id").eq("id", viewerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type MemberJoin = {
    role: AllianceRole;
    contribution: number;
    nations: {
      slug: string;
      name: string;
      accent: string;
      tier: number;
      prestige: number;
    } | null;
  };

  const members: AllianceMemberView[] = ((memberResult.data ?? []) as unknown as MemberJoin[])
    .filter((row) => row.nations !== null)
    .map((row) => ({
      nationSlug: row.nations?.slug ?? "",
      nationName: row.nations?.name ?? "",
      accent: toAccent(row.nations?.accent),
      tier: row.nations?.tier ?? 1,
      prestige: row.nations?.prestige ?? 0,
      role: row.role,
      contribution: row.contribution,
    }));

  // Trades are scoped to the member nations, so the exchange shows this
  // alliance's business rather than the whole world's.
  const memberSlugs = new Set(members.map((m) => m.nationSlug));

  const { data: tradeRows } = await supabase
    .from("trades")
    .select(
      "id,offer,want,state,note,created_at,from:from_nation(slug,name),to:to_nation(slug,name)",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  type TradeJoin = {
    id: string;
    offer: unknown;
    want: unknown;
    state: TradeStateDb;
    note: string | null;
    created_at: string;
    from: { slug: string; name: string } | null;
    to: { slug: string; name: string } | null;
  };

  const trades: TradeView[] = ((tradeRows ?? []) as unknown as TradeJoin[])
    .filter((row) => row.from !== null && memberSlugs.has(row.from.slug))
    .map((row) => ({
      id: row.id,
      fromSlug: row.from?.slug ?? "",
      fromName: row.from?.name ?? "",
      toSlug: row.to?.slug ?? null,
      toName: row.to?.name ?? null,
      offer: numbers(row.offer),
      want: numbers(row.want),
      state: row.state,
      note: row.note,
      createdAt: row.created_at,
    }));

  let viewerNation: AllianceView["viewerNation"] = null;
  const viewerNationId = viewerResult.data?.nation_id ?? null;

  if (viewerNationId) {
    const { data: nation } = await supabase
      .from("nations")
      .select("slug,name")
      .eq("id", viewerNationId)
      .maybeSingle();

    const membership = members.find((m) => m.nationSlug === nation?.slug);
    if (nation && membership) {
      viewerNation = { slug: nation.slug, name: nation.name, role: membership.role };
    }
  }

  return {
    id: alliance.id,
    slug: alliance.slug,
    name: alliance.name,
    charter: alliance.charter_md,
    accent: toAccent(alliance.accent),
    tier: alliance.tier,
    treasury: numbers(alliance.treasury),
    foundedAt: alliance.founded_at,
    members,
    trades,
    totalPrestige: members.reduce((sum, m) => sum + m.prestige, 0),
    viewerNation,
  };
}
