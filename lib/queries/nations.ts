import type { Accent } from "@/lib/design/accents";

/**
 * Shape the atlas and the landing teaser both read. Backed by the `nations`
 * table from M5 onward; until then the list is genuinely empty rather than
 * populated with invented countries.
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
};

export async function getTopNations(_limit = 3): Promise<TopNation[]> {
  // M5 replaces this with a prestige-ordered query against Supabase.
  return [];
}
