/**
 * Seasons roll over quarterly. This is what the mythic one-per-season limit is
 * scoped to, and what prestige decay tracks.
 *
 * Kept out of `craft.ts` because a `"use server"` module may only export async
 * functions, and this is read synchronously in several places.
 */
export function currentSeason(now = new Date()): number {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  return (year - 2026) * 4 + quarter;
}

export function seasonLabel(season: number): string {
  const year = 2026 + Math.floor((season - 1) / 4);
  const quarter = ((season - 1) % 4) + 1;
  return `${year} Q${quarter}`;
}
