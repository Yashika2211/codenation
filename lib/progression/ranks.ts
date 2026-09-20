import type { Accent } from "@/lib/design/accents";

/**
 * The reputation ladder, as data. A single edit here re-tunes the whole game —
 * no screen hardcodes a threshold, and no gate is written as a scattered `if`.
 */
export type Rank = {
  slug: string;
  name: string;
  /** Inclusive lower bound of the band. */
  rep: number;
  accent: Accent;
  /** Capabilities that open at this rank. */
  unlocks: string[];
};

export const RANKS: readonly Rank[] = [
  {
    slug: "citizen",
    name: "Citizen",
    rep: 0,
    accent: "signal",
    unlocks: ["Daily contracts", "City presence", "Starter workspace"],
  },
  {
    slug: "apprentice",
    name: "Apprentice",
    rep: 250,
    accent: "signal",
    unlocks: ["Avatar frames tier 1", "Squad membership"],
  },
  {
    slug: "artisan",
    name: "Artisan",
    rep: 500,
    accent: "flux",
    unlocks: ["Workspace skins", "Rated duels"],
  },
  {
    slug: "engineer",
    name: "Engineer",
    rep: 1000,
    accent: "flux",
    unlocks: ["Claim first 3 land parcels", "Tech tree tier II"],
  },
  {
    slug: "architect",
    name: "Architect",
    rep: 1750,
    accent: "ion",
    unlocks: ["District zoning", "Blueprint tier II", "Mentor queue"],
  },
  {
    slug: "founder",
    name: "Founder",
    rep: 2500,
    accent: "ion",
    unlocks: ["Found a nation", "Flag designer", "Doctrine"],
  },
  {
    slug: "sovereign",
    name: "Sovereign",
    rep: 3000,
    accent: "plasma",
    unlocks: [
      "THE FORGE — custom item crafting",
      "Custom building skins",
      "Emissive palettes",
      "Custom flag motifs",
      "Personal title",
    ],
  },
  {
    slug: "magistrate",
    name: "Magistrate",
    rep: 4000,
    accent: "plasma",
    unlocks: ["Host events inside your borders", "Guest permissions"],
  },
  {
    slug: "luminary",
    name: "Luminary",
    rep: 5000,
    accent: "amber",
    unlocks: ["Found an alliance", "Open trade routes", "Treasury"],
  },
  {
    slug: "archon",
    name: "Archon",
    rep: 7500,
    accent: "amber",
    unlocks: ["World-event hosting", "Moderator eligibility", "Rare forge palettes"],
  },
  {
    slug: "legend",
    name: "Legend",
    rep: 10000,
    accent: "amber",
    unlocks: ["One unique Landmark on the world atlas", "Mythic forge tier"],
  },
] as const;

/** Reputation at which the Forge opens. Referenced, never retyped. */
export const FORGE_REP = 3000;
/** Reputation required for a mythic craft. */
export const MYTHIC_REP = 10000;

export function rankFor(reputation: number): Rank {
  let current: Rank = RANKS[0] as Rank;
  for (const rank of RANKS) {
    if (reputation >= rank.rep) current = rank;
    else break;
  }
  return current;
}

export function nextRankFor(reputation: number): Rank | null {
  for (const rank of RANKS) {
    if (reputation < rank.rep) return rank;
  }
  return null;
}

/** 0–1 progress through the current band. Returns 1 at the top rank. */
export function rankProgress(reputation: number): number {
  const current = rankFor(reputation);
  const next = nextRankFor(reputation);
  if (!next) return 1;
  const span = next.rep - current.rep;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (reputation - current.rep) / span));
}

export function hasRank(reputation: number, slug: string): boolean {
  const target = RANKS.find((r) => r.slug === slug);
  return target ? reputation >= target.rep : false;
}
