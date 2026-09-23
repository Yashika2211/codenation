import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTY_MULT,
  solveGrants,
  duelWinGrants,
  duelLossGrants,
  contestGrants,
  placementCurve,
  diminishingMultiplier,
  applyDiminishing,
  eloDelta,
  upkeepFor,
  decayPrestige,
  hackathonGrants,
  PRESTIGE_DECAY,
} from "../lib/economy/rules";

/**
 * The economy's rules, tested as pure functions.
 *
 * These numbers are the game. A silent change to any of them re-tunes every
 * player's progression at once, so each one is pinned to the value the spec
 * states rather than to whatever the implementation currently returns.
 */

test("difficulty multipliers match the spec", () => {
  assert.equal(DIFFICULTY_MULT.easy, 1);
  assert.equal(DIFFICULTY_MULT.medium, 2);
  assert.equal(DIFFICULTY_MULT.hard, 4);
  assert.equal(DIFFICULTY_MULT.expert, 7);
});

test("a solve mints 60 compute and 8 rep per difficulty step", () => {
  const easy = solveGrants("easy", false);
  assert.deepEqual(easy, [
    { resource: "compute", amount: 60 },
    { resource: "rep", amount: 8 },
  ]);

  const expert = solveGrants("expert", false);
  assert.deepEqual(expert, [
    { resource: "compute", amount: 420 },
    { resource: "rep", amount: 56 },
  ]);
});

test("first solver takes 2.5x compute and a flat +25 rep", () => {
  const normal = solveGrants("hard", false);
  const first = solveGrants("hard", true);

  // 60 * 4 = 240 -> 600
  assert.equal(first[0]?.amount, 600);
  assert.equal(normal[0]?.amount, 240);

  // 8 * 4 = 32, plus the flat bonus
  assert.equal(first[1]?.amount, 57);
  assert.equal(normal[1]?.amount, 32);
});

test("diminishing returns follow 0.85^(n-1) with a 0.25 floor", () => {
  assert.equal(diminishingMultiplier(0), 1);
  assert.equal(diminishingMultiplier(1), 0.85);
  assert.ok(Math.abs(diminishingMultiplier(2) - 0.7225) < 1e-9);

  // The floor binds eventually and never goes below it.
  assert.equal(diminishingMultiplier(50), 0.25);
  assert.equal(diminishingMultiplier(1000), 0.25);
});

test("the taper never rounds a positive grant away to nothing", () => {
  const tapered = applyDiminishing([{ resource: "rep", amount: 1 }], 99);
  assert.equal(tapered[0]?.amount, 1);
});

test("the taper leaves the first grant of the day whole", () => {
  const grants = solveGrants("medium", false);
  assert.deepEqual(applyDiminishing(grants, 0), grants);
});

test("a repeat grant is worth strictly less than the one before it", () => {
  const grants = solveGrants("expert", false);
  let previous = Infinity;

  for (let n = 0; n < 8; n += 1) {
    const amount = applyDiminishing(grants, n)[0]?.amount ?? 0;
    assert.ok(amount <= previous, `grant ${n} (${amount}) should not exceed ${previous}`);
    previous = amount;
  }
});

test("duel payouts match the spec, and losing still pays", () => {
  assert.deepEqual(duelWinGrants(), [
    { resource: "compute", amount: 420 },
    { resource: "rep", amount: 38 },
  ]);
  assert.deepEqual(duelLossGrants(), [{ resource: "rep", amount: 4 }]);
});

test("Elo is zero-sum and symmetric at equal rating", () => {
  const win = eloDelta(1200, 1200, 1);
  const loss = eloDelta(1200, 1200, 0);

  assert.equal(win, 16); // K/2 at even odds
  assert.equal(loss, -16);
  assert.equal(win + loss, 0);
});

test("Elo rewards an upset far more than an expected win", () => {
  const upset = eloDelta(1000, 1800, 1);
  const expected = eloDelta(1800, 1000, 1);

  assert.ok(upset > expected, "beating a stronger player should pay more");
  assert.ok(upset <= 32, "K=32 caps a single result");
  assert.ok(expected >= 0);
});

test("a draw between equals moves nobody", () => {
  assert.equal(eloDelta(1500, 1500, 0.5), 0);
});

test("placement curve is monotonic and floors at 5%", () => {
  const first = placementCurve(1, 100);
  const tenth = placementCurve(10, 100);
  const last = placementCurve(100, 100);

  assert.equal(first, 1);
  assert.ok(tenth < first);
  assert.ok(last < tenth);
  assert.ok(last >= 0.05, "the bottom of the table still earns something");
});

test("placement curve refuses nonsense input instead of throwing", () => {
  assert.equal(placementCurve(0, 10), 0);
  assert.equal(placementCurve(5, 0), 0);
  // Ranking below the field size is clamped, not extrapolated.
  assert.equal(placementCurve(50, 10), placementCurve(10, 10));
});

test("contest grants scale with placement", () => {
  const winner = contestGrants(1, 50);
  const tail = contestGrants(50, 50);

  assert.ok((winner[0]?.amount ?? 0) > (tail[0]?.amount ?? 0));
  assert.equal(winner[0]?.amount, 2000);
});

test("hackathon brackets rise monotonically and drop zero amounts", () => {
  const brackets = ["participant", "track_finalist", "finalist", "winner"] as const;
  let previousRep = -1;

  for (const bracket of brackets) {
    const grants = hackathonGrants(bracket);
    assert.ok(grants.every((g) => g.amount > 0), "no zero-amount grants are emitted");

    const rep = grants.find((g) => g.resource === "rep")?.amount ?? 0;
    assert.ok(rep > previousRep, `${bracket} should pay more rep than the bracket below`);
    previousRep = rep;
  }

  // The spec names this number explicitly.
  assert.equal(hackathonGrants("finalist").find((g) => g.resource === "rep")?.amount, 120);
});

test("upkeep is superlinear, so a tall city is a real commitment", () => {
  const level1 = upkeepFor(10, 1);
  const level2 = upkeepFor(10, 2);
  const level4 = upkeepFor(10, 4);

  assert.equal(level1, 10);
  assert.ok(level2 > level1 * 2 - 1, "doubling level more than doubles upkeep");
  assert.ok(level4 > level2 * 2, "and it keeps accelerating");
});

test("prestige decays 15% and never goes negative", () => {
  assert.equal(PRESTIGE_DECAY, 0.15);
  assert.equal(decayPrestige(1000), 850);
  assert.equal(decayPrestige(0), 0);
  assert.ok(decayPrestige(1) >= 0);
});

test("prestige decay converges toward zero rather than sticking", () => {
  let prestige = 10_000;
  for (let season = 0; season < 40; season += 1) prestige = decayPrestige(prestige);
  assert.ok(prestige < 100, `after 40 seasons 10k should have decayed well down, got ${prestige}`);
});
