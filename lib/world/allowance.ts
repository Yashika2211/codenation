import { hasRank } from "@/lib/progression/ranks";

/**
 * How many parcels a player may hold, by rank.
 *
 * Kept out of `actions.ts` because a `"use server"` module may only export
 * async functions, and this is read synchronously by the city page too.
 */
export function parcelAllowance(reputation: number): number {
  if (!hasRank(reputation, "engineer")) return 0;
  if (!hasRank(reputation, "architect")) return 3;
  if (!hasRank(reputation, "founder")) return 6;
  if (!hasRank(reputation, "sovereign")) return 10;
  if (!hasRank(reputation, "luminary")) return 16;
  return 24;
}

/** Cost of the next parcel, rising with holdings so sprawl is a decision. */
export const PARCEL_BASE_COST = 320;

export function parcelCost(held: number): number {
  return PARCEL_BASE_COST * Math.max(1, held + 1);
}
