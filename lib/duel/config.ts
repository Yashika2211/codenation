/**
 * Duel constants.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export
 * async functions — a plain `const` there is a build error.
 */

/** Minutes on the clock once both seats are filled. */
export const DUEL_MINUTES = 20;

/** Reputation at which rated duels open (Artisan). */
export const DUEL_MIN_REP = 500;

/** Elo K-factor. */
export const DUEL_K = 32;
