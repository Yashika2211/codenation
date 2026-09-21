import type { SeedProblem } from "./types";
import { EASY_PROBLEMS } from "./problems-easy";

/** The full catalogue. Every entry is verified by scripts/verify-seed.ts. */
export const ALL_PROBLEMS: SeedProblem[] = [...EASY_PROBLEMS];
