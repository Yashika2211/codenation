import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ForgeParamsSchema,
  validateForRarity,
  costFor,
  inscriptionIsAllowed,
  noiseFromSeed,
  defaultParams,
  rarityAtLeast,
  EMISSIVE_CAP,
  RARITY_MULT,
  PALETTES,
  CROWN_REQUIREMENT,
  SILHOUETTE_REQUIREMENT,
  type ForgeParams,
} from "../lib/forge/params";
import { currentSeason, seasonLabel } from "../lib/forge/season";

/**
 * The Forge's gates.
 *
 * These run again on the server during a craft, so what is really being pinned
 * here is that the client and the server agree — a player must never be shown a
 * setting that the server will then refuse.
 */

function params(overrides: Partial<ForgeParams> = {}): ForgeParams {
  return { ...defaultParams(), ...overrides };
}

test("the spec's rarity multipliers are the ones in the code", () => {
  assert.equal(RARITY_MULT.common, 1);
  assert.equal(RARITY_MULT.rare, 2.5);
  assert.equal(RARITY_MULT.epic, 6);
  assert.equal(RARITY_MULT.legendary, 15);
  assert.equal(RARITY_MULT.mythic, 40);
});

test("emissive caps run from .3 at common to 1.0 at mythic", () => {
  assert.equal(EMISSIVE_CAP.common, 0.3);
  assert.equal(EMISSIVE_CAP.mythic, 1);

  const order = ["common", "rare", "epic", "legendary", "mythic"] as const;
  for (let i = 1; i < order.length; i += 1) {
    const current = order[i];
    const previous = order[i - 1];
    if (!current || !previous) continue;
    assert.ok(EMISSIVE_CAP[current] > EMISSIVE_CAP[previous]);
  }
});

test("cost scales by the rarity multiplier", () => {
  const base = { compute: 1000, data: 200, alloy: 10 };
  assert.deepEqual(costFor(base, "common"), { compute: 1000, data: 200, alloy: 10 });
  assert.deepEqual(costFor(base, "rare"), { compute: 2500, data: 500, alloy: 25 });
  assert.deepEqual(costFor(base, "mythic"), { compute: 40000, data: 8000, alloy: 400 });
});

test("a missing cost component reads as zero, not NaN", () => {
  assert.deepEqual(costFor({}, "epic"), { compute: 0, data: 0, alloy: 0 });
});

test("the default parameters are valid at the lowest craftable rarity", () => {
  const issues = validateForRarity(defaultParams(), "rare", 3000);
  assert.deepEqual(issues, [], `defaults should be craftable, got ${JSON.stringify(issues)}`);
});

test("emissive above the rarity cap is rejected", () => {
  const issues = validateForRarity(params({ emissiveIntensity: 0.9 }), "common", 10000);
  assert.ok(issues.some((i) => i.field === "emissiveIntensity"));

  // And allowed once the rarity carries it.
  assert.ok(
    !validateForRarity(params({ emissiveIntensity: 0.9 }), "mythic", 10000).some(
      (i) => i.field === "emissiveIntensity",
    ),
  );
});

test("a beacon crown requires epic, as the spec states", () => {
  assert.equal(CROWN_REQUIREMENT.beacon, "epic");
  assert.ok(validateForRarity(params({ crown: "beacon" }), "rare", 10000).some((i) => i.field === "crown"));
  assert.ok(!validateForRarity(params({ crown: "beacon" }), "epic", 10000).some((i) => i.field === "crown"));
});

test("a halo requires legendary and a helix requires legendary", () => {
  assert.equal(CROWN_REQUIREMENT.halo, "legendary");
  assert.equal(SILHOUETTE_REQUIREMENT.helix, "legendary");
  assert.ok(validateForRarity(params({ silhouette: "helix" }), "epic", 10000).some((i) => i.field === "silhouette"));
});

test("rarityAtLeast orders correctly in both directions", () => {
  assert.ok(rarityAtLeast("mythic", "common"));
  assert.ok(rarityAtLeast("epic", "epic"));
  assert.ok(!rarityAtLeast("rare", "legendary"));
});

test("a palette the player has not earned is refused", () => {
  const locked = PALETTES.find((p) => p.requiresRep >= 10000);
  assert.ok(locked, "there should be a top-tier palette to test");

  const withLocked = params({
    palette: { base: locked.base, accent: locked.accent, emissive: locked.emissive },
  });

  assert.ok(validateForRarity(withLocked, "mythic", 3000).some((i) => i.field === "palette"));
  assert.ok(!validateForRarity(withLocked, "mythic", 10000).some((i) => i.field === "palette"));
});

test("an invented palette is refused outright", () => {
  const fake = params({
    palette: { base: "#000000", accent: "#ABCDEF", emissive: "#FFFFFF" },
  });
  assert.ok(validateForRarity(fake, "mythic", 10000).some((i) => i.field === "palette"));
});

test("validation reports every problem at once, not just the first", () => {
  const bad = params({
    emissiveIntensity: 1,
    crown: "halo",
    silhouette: "helix",
    inscription: "x".repeat(30),
  });
  const issues = validateForRarity(bad, "common", 3000);
  assert.ok(issues.length >= 3, `expected several issues, got ${issues.length}`);
});

test("the profanity filter catches letter-spacing and leetspeak evasion", () => {
  for (const blocked of ["fuck", "F U C K", "f.u.c.k", "fucking", "sh1t", "$hit", "kys", "kill yourself", "killyourself"]) {
    assert.ok(!inscriptionIsAllowed(blocked), `"${blocked}" should be refused`);
  }
});

test("the filter does not punish innocent words that contain a blocked substring", () => {
  // "Scunthorpe" is the canonical false positive. A filter that blocks it is
  // worse than one that misses the occasional insult, because it accuses
  // someone who did nothing.
  for (const allowed of ["ship code", "Invariant", "Scunthorpe", "task systems", "classic analysis", "assassin"]) {
    assert.ok(inscriptionIsAllowed(allowed), `"${allowed}" should be allowed`);
  }
});

test("an empty inscription is allowed", () => {
  assert.ok(inscriptionIsAllowed(""));
  assert.deepEqual(
    validateForRarity(params({ inscription: "" }), "rare", 3000).filter((i) => i.field === "inscription"),
    [],
  );
});

test("the schema rejects a malformed params blob", () => {
  assert.ok(!ForgeParamsSchema.safeParse(null).success);
  assert.ok(!ForgeParamsSchema.safeParse({}).success);
  assert.ok(!ForgeParamsSchema.safeParse(params({ emissiveIntensity: 5 })).success);
  assert.ok(
    !ForgeParamsSchema.safeParse({ ...params(), palette: { base: "red", accent: "#fff", emissive: "#fff" } })
      .success,
  );
  assert.ok(ForgeParamsSchema.safeParse(defaultParams()).success);
});

test("seed noise is deterministic and inside the unit interval", () => {
  const a = noiseFromSeed("abc123");
  assert.equal(a, noiseFromSeed("abc123"));
  assert.notEqual(a, noiseFromSeed("abc124"));
  assert.ok(a >= 0 && a < 1);
});

test("seasons advance quarterly and label readably", () => {
  const q1 = currentSeason(new Date("2026-01-15T00:00:00Z"));
  const q2 = currentSeason(new Date("2026-04-15T00:00:00Z"));
  const nextYear = currentSeason(new Date("2027-01-15T00:00:00Z"));

  assert.equal(q2, q1 + 1);
  assert.equal(nextYear, q1 + 4);
  assert.equal(seasonLabel(q1), "2026 Q1");
  assert.equal(seasonLabel(nextYear), "2027 Q1");
});
