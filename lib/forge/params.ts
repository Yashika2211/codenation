import { z } from "zod";
import type { RarityDb } from "@/lib/supabase/types";

/**
 * The Forge parameter schema.
 *
 * Rendering is pure CSS driven by these values, which is what makes a "custom
 * building" cost no art budget. Every field is validated server-side against
 * the caller's rarity before anything is minted — the client's copy of these
 * rules is a convenience, never the authority.
 */

export const SILHOUETTES = [
  "spire",
  "ziggurat",
  "arcology",
  "lattice",
  "monolith",
  "helix",
] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

export const FACADES = ["banded", "ribbed", "grid", "faceted", "glass"] as const;
export type Facade = (typeof FACADES)[number];

export const CROWNS = ["none", "beacon", "ring", "antenna", "halo"] as const;
export type Crown = (typeof CROWNS)[number];

export const RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

export const ForgeParamsSchema = z.object({
  palette: z.object({
    base: z.string().regex(HEX),
    accent: z.string().regex(HEX),
    emissive: z.string().regex(HEX),
  }),
  emissiveIntensity: z.number().min(0).max(1),
  silhouette: z.enum(SILHOUETTES),
  facade: z.enum(FACADES),
  crown: z.enum(CROWNS),
  motif: z.string().min(1).max(40),
  inscription: z.string().max(24),
  seedNoise: z.number().min(0).max(1),
});

export type ForgeParams = z.infer<typeof ForgeParamsSchema>;

/** Emissive ceiling by rarity. Section 5.3: common .3 through mythic 1.0. */
export const EMISSIVE_CAP: Record<RarityDb, number> = {
  common: 0.3,
  rare: 0.5,
  epic: 0.72,
  legendary: 0.88,
  mythic: 1,
};

/** Cost multiplier by rarity. Section 5.3 rule 3. */
export const RARITY_MULT: Record<RarityDb, number> = {
  common: 1,
  rare: 2.5,
  epic: 6,
  legendary: 15,
  mythic: 40,
};

const RARITY_ORDER: RarityDb[] = ["common", "rare", "epic", "legendary", "mythic"];

export function rarityAtLeast(actual: RarityDb, required: RarityDb): boolean {
  return RARITY_ORDER.indexOf(actual) >= RARITY_ORDER.indexOf(required);
}

/** `beacon` and above require epic. */
export const CROWN_REQUIREMENT: Record<Crown, RarityDb> = {
  none: "common",
  ring: "rare",
  antenna: "rare",
  beacon: "epic",
  halo: "legendary",
};

/** Silhouettes open up as rarity rises, so a mythic looks like one. */
export const SILHOUETTE_REQUIREMENT: Record<Silhouette, RarityDb> = {
  spire: "common",
  ziggurat: "common",
  monolith: "rare",
  lattice: "epic",
  arcology: "epic",
  helix: "legendary",
};

/**
 * Unlockable palettes. A player may only use one they have earned; rare
 * palettes arrive with Archon, mythic ones only at the top of the ladder.
 */
export type Palette = {
  slug: string;
  name: string;
  base: string;
  accent: string;
  emissive: string;
  requiresRep: number;
};

export const PALETTES: readonly Palette[] = [
  { slug: "flux", name: "Flux", base: "#0D1018", accent: "#3BE8B0", emissive: "#3BE8B0", requiresRep: 3000 },
  { slug: "ion", name: "Ion", base: "#0A0720", accent: "#7C6BFF", emissive: "#9A8CFF", requiresRep: 3000 },
  { slug: "signal", name: "Signal", base: "#04141F", accent: "#5FC8FF", emissive: "#8ADBFF", requiresRep: 3000 },
  { slug: "plasma", name: "Plasma", base: "#1A0512", accent: "#E84FA8", emissive: "#FF7AC4", requiresRep: 4000 },
  { slug: "amber", name: "Amber", base: "#1B1408", accent: "#F2B441", emissive: "#FFD07A", requiresRep: 4000 },
  { slug: "verdigris", name: "Verdigris", base: "#08150F", accent: "#4FD8A4", emissive: "#9BFFD8", requiresRep: 5000 },
  { slug: "ultraviolet", name: "Ultraviolet", base: "#12061F", accent: "#B26BFF", emissive: "#DCB0FF", requiresRep: 7500 },
  { slug: "ember", name: "Ember", base: "#1C0A06", accent: "#FF7A4F", emissive: "#FFB08A", requiresRep: 7500 },
  { slug: "aurora", name: "Aurora", base: "#061018", accent: "#54F0D0", emissive: "#C8FFF4", requiresRep: 10000 },
  { slug: "obsidian", name: "Obsidian", base: "#05060A", accent: "#C9D4E6", emissive: "#FFFFFF", requiresRep: 10000 },
];

export const MOTIFS = [
  "diamond",
  "chevron",
  "lattice",
  "circuit",
  "eclipse",
  "constellation",
  "sigil",
] as const;

export const MOTIF_REQUIREMENT: Record<string, RarityDb> = {
  diamond: "common",
  chevron: "common",
  lattice: "rare",
  circuit: "rare",
  eclipse: "epic",
  constellation: "legendary",
  sigil: "mythic",
};

/**
 * A small, honest profanity filter for inscriptions.
 *
 * It is a blocklist, not a claim of completeness: inscriptions are public and
 * attributed, and anything that slips through is reportable like any other
 * content. Pretending a regex solves moderation would be the dishonest move.
 */
const BLOCKED = [
  "fuck", "shit", "cunt", "bitch", "bastard", "slut", "whore", "nigger", "faggot",
  "rape", "nazi", "kill yourself", "kys",
];

export function inscriptionIsAllowed(value: string): boolean {
  const normalised = value
    .toLowerCase()
    // Collapse common letter substitutions before matching.
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/[^a-z ]/g, "");

  return !BLOCKED.some((word) => normalised.includes(word));
}

export type ValidationIssue = { field: string; message: string };

/**
 * Validates a parameter set against a rarity. Returns every problem at once,
 * so the Forge can show all of them rather than one at a time.
 */
export function validateForRarity(
  params: ForgeParams,
  rarity: RarityDb,
  reputation: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const cap = EMISSIVE_CAP[rarity];
  if (params.emissiveIntensity > cap + 1e-6) {
    issues.push({
      field: "emissiveIntensity",
      message: `${rarity} caps emissive at ${cap.toFixed(2)}.`,
    });
  }

  const crownNeeds = CROWN_REQUIREMENT[params.crown];
  if (!rarityAtLeast(rarity, crownNeeds)) {
    issues.push({ field: "crown", message: `A ${params.crown} crown requires ${crownNeeds}.` });
  }

  const silhouetteNeeds = SILHOUETTE_REQUIREMENT[params.silhouette];
  if (!rarityAtLeast(rarity, silhouetteNeeds)) {
    issues.push({
      field: "silhouette",
      message: `The ${params.silhouette} silhouette requires ${silhouetteNeeds}.`,
    });
  }

  const motifNeeds = MOTIF_REQUIREMENT[params.motif];
  if (motifNeeds && !rarityAtLeast(rarity, motifNeeds)) {
    issues.push({ field: "motif", message: `The ${params.motif} motif requires ${motifNeeds}.` });
  }

  const palette = PALETTES.find(
    (p) => p.accent.toLowerCase() === params.palette.accent.toLowerCase(),
  );
  if (!palette) {
    issues.push({ field: "palette", message: "That palette is not one of the unlocked ones." });
  } else if (reputation < palette.requiresRep) {
    issues.push({
      field: "palette",
      message: `The ${palette.name} palette unlocks at ${palette.requiresRep.toLocaleString("en-US")} reputation.`,
    });
  }

  if (params.inscription.length > 24) {
    issues.push({ field: "inscription", message: "Inscriptions are capped at 24 characters." });
  }
  if (params.inscription.length > 0 && !inscriptionIsAllowed(params.inscription)) {
    issues.push({ field: "inscription", message: "That inscription is not allowed." });
  }

  return issues;
}

/** Scales a base cost by rarity. */
export function costFor(
  base: { compute?: number; data?: number; alloy?: number },
  rarity: RarityDb,
): { compute: number; data: number; alloy: number } {
  const mult = RARITY_MULT[rarity];
  return {
    compute: Math.round((base.compute ?? 0) * mult),
    data: Math.round((base.data ?? 0) * mult),
    alloy: Math.round((base.alloy ?? 0) * mult),
  };
}

/** Derives the 0–1 noise value from a stored seed, deterministically. */
export function noiseFromSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function defaultParams(): ForgeParams {
  const palette = PALETTES[0] as Palette;
  return {
    palette: { base: palette.base, accent: palette.accent, emissive: palette.emissive },
    emissiveIntensity: 0.3,
    silhouette: "spire",
    facade: "banded",
    crown: "none",
    motif: "diamond",
    inscription: "",
    seedNoise: 0.5,
  };
}
