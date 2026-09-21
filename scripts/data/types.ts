import type { Difficulty, ItemKind, RarityDb, Zoning } from "@/lib/supabase/types";

/**
 * Seed data types.
 *
 * Every problem carries a `reference` — a working Python solution. It is not
 * shipped to the database; `scripts/verify-seed.ts` runs it against each test
 * case locally so a wrong `expected` can never reach the judge. A seeded
 * problem that nobody can solve is worse than no problem at all.
 */

export type SeedTestcase = {
  input: string;
  expected: string;
  isSample: boolean;
  weight?: number;
};

export type SeedProblem = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  statement: string;
  constraints: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  /** Python 3 reference solution, verified locally, never inserted. */
  reference: string;
  testcases: SeedTestcase[];
};

export type SeedTechNode = {
  slug: string;
  name: string;
  tier: number;
  branch: string;
  description: string;
  cost: { compute?: number; data?: number; alloy?: number };
  requires: string[];
  topics: string[];
  solvesRequired: number;
  posX: number;
  posY: number;
};

export type SeedBlueprint = {
  slug: string;
  name: string;
  kind: Zoning;
  description: string;
  baseCost: { compute?: number; data?: number; alloy?: number };
  requiresTech: string[];
  requiresRep: number;
  maxLevel: number;
  defaultAccent: string;
  upkeepCompute: number;
  buildMinutes: number;
};

export type SeedItemDefinition = {
  slug: string;
  name: string;
  kind: ItemKind;
  rarity: RarityDb;
  description: string;
  craftable: boolean;
  cost: { compute?: number; data?: number; alloy?: number };
  requiresRep: number;
  requiresTech: string[];
  baseParams: Record<string, unknown>;
};

export type SeedBadge = {
  slug: string;
  name: string;
  description: string;
  rarity: RarityDb;
  accent: string;
  rule: Record<string, unknown>;
};
