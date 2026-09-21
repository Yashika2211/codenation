import type { SeedProblem } from "./types";
import { EASY_PROBLEMS } from "./problems-easy";
import { MEDIUM_PROBLEMS } from "./problems-medium";

/** The full catalogue. Every entry is verified by scripts/verify-seed.ts. */
export const ALL_PROBLEMS: SeedProblem[] = [...EASY_PROBLEMS, ...MEDIUM_PROBLEMS];
