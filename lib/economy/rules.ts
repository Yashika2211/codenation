import type { Difficulty, ResourceKindDb } from "@/lib/supabase/types";

/**
 * The minting rules, as pure data and pure functions.
 *
 * Nothing here touches the database, so the whole economy can be reasoned
 * about — and re-tuned — in one file. `mint.ts` is the only thing that turns
 * these numbers into ledger rows.
 */

export const DIFFICULTY_MULT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
  expert: 7,
};

/** Every reason string that may appear in `resource_ledger.reason`. */
export const REASONS = {
  solve: "solve",
  firstSolve: "first_solve_bonus",
  duelWin: "duel_win",
  duelLoss: "duel_loss",
  contest: "contest_placement",
  mergedPr: "merged_pr",
  mentoring: "mentoring",
  hackathon: "hackathon_placement",
  dailyContract: "daily_contract",
  build: "build_cost",
  upkeep: "upkeep",
  forge: "forge_cost",
  unbind: "unbind_cost",
  research: "research_cost",
  parcel: "parcel_cost",
  trade: "trade_settlement",
} as const;

export type MintReason = (typeof REASONS)[keyof typeof REASONS];

export type Grant = { resource: ResourceKindDb; amount: number };

/** Base grants for solving a problem, before diminishing returns. */
export function solveGrants(difficulty: Difficulty, isFirstSolver: boolean): Grant[] {
  const mult = DIFFICULTY_MULT[difficulty];
  const compute = Math.round(60 * mult * (isFirstSolver ? 2.5 : 1));
  const rep = Math.round(8 * mult) + (isFirstSolver ? 25 : 0);

  return [
    { resource: "compute", amount: compute },
    { resource: "rep", amount: rep },
  ];
}

export function duelWinGrants(): Grant[] {
  return [
    { resource: "compute", amount: 420 },
    { resource: "rep", amount: 38 },
  ];
}

/** Losing still pays participation — showing up is not punished. */
export function duelLossGrants(): Grant[] {
  return [{ resource: "rep", amount: 4 }];
}

/**
 * Placement curve for a contest. First place takes the full pot; the tail
 * decays smoothly and never reaches zero for anyone who placed at all.
 */
export function placementCurve(rank: number, entrants: number): number {
  if (rank < 1 || entrants < 1) return 0;
  const safeRank = Math.min(rank, entrants);
  const percentile = 1 - (safeRank - 1) / Math.max(1, entrants);
  // Cubic falloff, floored so the bottom of the table still earns something.
  return Math.max(0.05, Math.pow(percentile, 3));
}

export function contestGrants(rank: number, entrants: number): Grant[] {
  const compute = Math.round(2000 * placementCurve(rank, entrants));
  const rep = Math.round(40 * placementCurve(rank, entrants)) + 10;
  return [
    { resource: "compute", amount: compute },
    { resource: "rep", amount: rep },
  ];
}

export function mergedPrGrants(): Grant[] {
  return [
    { resource: "data", amount: 300 },
    { resource: "rep", amount: 45 },
  ];
}

export function mentoringGrants(): Grant[] {
  return [
    { resource: "data", amount: 90 },
    { resource: "rep", amount: 40 },
  ];
}

export type HackathonBracket = "participant" | "track_finalist" | "finalist" | "winner";

const HACKATHON_TABLE: Record<HackathonBracket, { compute: number; alloy: number; rep: number }> = {
  participant: { compute: 300, alloy: 0, rep: 20 },
  track_finalist: { compute: 900, alloy: 15, rep: 60 },
  finalist: { compute: 2400, alloy: 45, rep: 120 },
  winner: { compute: 5000, alloy: 120, rep: 220 },
};

export function hackathonGrants(bracket: HackathonBracket): Grant[] {
  const row = HACKATHON_TABLE[bracket];
  const grants: Grant[] = [
    { resource: "compute", amount: row.compute },
    { resource: "alloy", amount: row.alloy },
    { resource: "rep", amount: row.rep },
  ];
  return grants.filter((g) => g.amount > 0);
}

export function dailyContractGrants(): Grant[] {
  return [
    { resource: "compute", amount: 120 },
    { resource: "data", amount: 30 },
  ];
}

/**
 * Diminishing returns. The n-th reward of the same kind inside a rolling 24h
 * window is multiplied by max(0.25, 0.85^(n-1)).
 *
 * `priorCount` is how many of that kind already landed in the window, so the
 * first reward of the day is priorCount = 0 and pays in full.
 */
export function diminishingMultiplier(priorCount: number): number {
  if (priorCount <= 0) return 1;
  return Math.max(0.25, Math.pow(0.85, priorCount));
}

export function applyDiminishing(grants: Grant[], priorCount: number): Grant[] {
  const mult = diminishingMultiplier(priorCount);
  return grants.map((grant) => ({
    resource: grant.resource,
    // Never round a positive grant down to nothing.
    amount: grant.amount > 0 ? Math.max(1, Math.round(grant.amount * mult)) : 0,
  }));
}

/** Mentoring is capped at three paid sessions a day. */
export const MENTORING_DAILY_CAP = 3;

/** Elo, K=32. Returns the delta for `ratingA`. */
export function eloDelta(ratingA: number, ratingB: number, scoreA: 0 | 0.5 | 1, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(k * (scoreA - expected));
}

/** Compute drained per 6h cycle by one building. */
export function upkeepFor(baseUpkeep: number, level: number): number {
  // Superlinear, so a tall city is a real commitment rather than free rent.
  return Math.round(baseUpkeep * Math.pow(level, 1.35));
}

export const UPKEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Seasonal prestige decay, applied at rollover. */
export const PRESTIGE_DECAY = 0.15;

export function decayPrestige(prestige: number): number {
  return Math.max(0, Math.round(prestige * (1 - PRESTIGE_DECAY)));
}
