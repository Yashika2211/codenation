import { createServerSupabase } from "@/lib/supabase/server";
import { toAccent, type Accent } from "@/lib/design/accents";

/**
 * Shape the atlas and the landing teaser both read. Returns an empty list when
 * there is nothing to show — never a set of invented countries.
 */
export type TopNation = {
  slug: string;
  name: string;
  doctrine: string;
  tier: number;
  prestige: number;
  accent: Accent;
  citizens: number;
  countryCode: string | null;
  isSeed: boolean;
};

export async function getTopNations(limit = 3): Promise<TopNation[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("nations")
      .select("slug,name,doctrine,tier,prestige,accent,country_code,is_seed,profiles(count)")
      .order("prestige", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    type NationJoin = {
      slug: string;
      name: string;
      doctrine: string | null;
      tier: number;
      prestige: number;
      accent: string;
      country_code: string | null;
      is_seed: boolean;
      profiles: { count: number }[] | null;
    };

    return (data as unknown as NationJoin[]).map((row) => ({
      slug: row.slug,
      name: row.name,
      doctrine: row.doctrine ?? "",
      tier: row.tier,
      prestige: row.prestige,
      accent: toAccent(row.accent),
      citizens: row.profiles?.[0]?.count ?? 0,
      countryCode: row.country_code,
      isSeed: row.is_seed,
    }));
  } catch {
    return [];
  }
}
