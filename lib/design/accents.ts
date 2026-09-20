/**
 * The accent vocabulary. Every coloured surface in CodeNation picks from this
 * list; nothing invents a hex code at the call site.
 */
export const ACCENTS = ["flux", "ion", "plasma", "signal", "amber"] as const;

export type Accent = (typeof ACCENTS)[number];

export const ACCENT_HEX: Record<Accent, string> = {
  flux: "#3BE8B0",
  ion: "#7C6BFF",
  plasma: "#E84FA8",
  signal: "#5FC8FF",
  amber: "#F2B441",
};

/** Foreground for text placed on a solid accent fill. Never white. */
export const ACCENT_ON_HEX: Record<Accent, string> = {
  flux: "#04120D",
  ion: "#0A0720",
  plasma: "#1A0512",
  signal: "#04141F",
  amber: "#1B1408",
};

/** `rgb(r g b)` triplets, for composing `rgb(... / <alpha>)` in inline styles. */
export const ACCENT_RGB: Record<Accent, string> = {
  flux: "59 232 176",
  ion: "124 107 255",
  plasma: "232 79 168",
  signal: "95 200 255",
  amber: "242 180 65",
};

export function accentRgba(accent: Accent, alpha: number): string {
  return `rgb(${ACCENT_RGB[accent]} / ${alpha})`;
}

export function isAccent(value: string): value is Accent {
  return (ACCENTS as readonly string[]).includes(value);
}

/** Falls back to flux so a bad database value can never break a render. */
export function toAccent(value: string | null | undefined): Accent {
  return value && isAccent(value) ? value : "flux";
}

/** Deterministic accent from any stable string (user id, slug, seed). */
export function accentFromSeed(seed: string): Accent {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length] ?? "flux";
}

/** Resource -> accent, used by chips, ledgers and cost breakdowns alike. */
export const RESOURCE_ACCENT = {
  compute: "flux",
  data: "signal",
  alloy: "amber",
  rep: "ion",
} as const satisfies Record<string, Accent>;
