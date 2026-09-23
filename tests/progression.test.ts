import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RANKS,
  FORGE_REP,
  MYTHIC_REP,
  rankFor,
  nextRankFor,
  rankProgress,
  hasRank,
} from "../lib/progression/ranks";
import { evaluate, parseRule, describeRule, type Rule } from "../lib/progression/rules";
import { parcelAllowance, parcelCost } from "../lib/world/allowance";

test("the ladder is ordered and starts at zero", () => {
  assert.equal(RANKS[0]?.rep, 0);
  for (let i = 1; i < RANKS.length; i += 1) {
    assert.ok(
      (RANKS[i]?.rep ?? 0) > (RANKS[i - 1]?.rep ?? 0),
      `rank ${i} must sit above the one before it`,
    );
  }
});

test("the spec's named thresholds are the ones in the data", () => {
  assert.equal(FORGE_REP, 3000);
  assert.equal(MYTHIC_REP, 10000);
  assert.equal(RANKS.find((r) => r.slug === "sovereign")?.rep, 3000);
  assert.equal(RANKS.find((r) => r.slug === "founder")?.rep, 2500);
  assert.equal(RANKS.find((r) => r.slug === "engineer")?.rep, 1000);
  assert.equal(RANKS.find((r) => r.slug === "legend")?.rep, 10000);
});

test("a rank boundary is inclusive on its lower edge", () => {
  assert.equal(rankFor(2999).slug, "founder");
  assert.equal(rankFor(3000).slug, "sovereign");
  assert.equal(rankFor(3001).slug, "sovereign");
});

test("zero and negative reputation both read as Citizen", () => {
  assert.equal(rankFor(0).slug, "citizen");
  assert.equal(rankFor(-500).slug, "citizen");
});

test("the top rank has no next, and reads as complete", () => {
  assert.equal(nextRankFor(10000), null);
  assert.equal(nextRankFor(999999), null);
  assert.equal(rankProgress(10000), 1);
});

test("progress through a band runs 0 to 1", () => {
  // Founder 2500 -> Sovereign 3000
  assert.equal(rankProgress(2500), 0);
  assert.equal(rankProgress(2750), 0.5);
  assert.ok(rankProgress(2999) < 1);
});

test("hasRank gates on the threshold, not the exact rank", () => {
  assert.ok(hasRank(3000, "sovereign"));
  assert.ok(hasRank(9999, "sovereign"), "a higher rank still satisfies a lower gate");
  assert.ok(!hasRank(2999, "sovereign"));
  assert.ok(!hasRank(5000, "nonexistent-rank"));
});

test("parcel allowance opens at Engineer and grows with rank", () => {
  assert.equal(parcelAllowance(999), 0, "land is closed below 1,000 rep");
  assert.equal(parcelAllowance(1000), 3, "Engineer opens the first three");
  assert.ok(parcelAllowance(2500) > parcelAllowance(1000));
  assert.ok(parcelAllowance(10000) >= parcelAllowance(5000));
});

test("parcel cost rises with holdings so sprawl is a decision", () => {
  assert.equal(parcelCost(0), 320);
  assert.equal(parcelCost(1), 640);
  assert.ok(parcelCost(5) > parcelCost(4));
});

test("a simple badge predicate evaluates against a snapshot", () => {
  const rule: Rule = { metric: "solves.total", op: ">=", value: 10 };
  assert.ok(evaluate(rule, { "solves.total": 10 }));
  assert.ok(evaluate(rule, { "solves.total": 99 }));
  assert.ok(!evaluate(rule, { "solves.total": 9 }));
});

test("a missing metric reads as zero rather than throwing", () => {
  const rule: Rule = { metric: "solves.topic.nothing", op: ">=", value: 1 };
  assert.ok(!evaluate(rule, {}));
});

test("all requires every branch, any requires one", () => {
  const all: Rule = {
    all: [
      { metric: "a", op: ">=", value: 1 },
      { metric: "b", op: ">=", value: 1 },
    ],
  };
  assert.ok(evaluate(all, { a: 1, b: 1 }));
  assert.ok(!evaluate(all, { a: 1 }));

  const any: Rule = {
    any: [
      { metric: "a", op: ">=", value: 1 },
      { metric: "b", op: ">=", value: 1 },
    ],
  };
  assert.ok(evaluate(any, { a: 1 }));
  assert.ok(!evaluate(any, {}));
});

test("not inverts, and nests", () => {
  const rule: Rule = { not: { metric: "a", op: ">=", value: 1 } };
  assert.ok(evaluate(rule, {}));
  assert.ok(!evaluate(rule, { a: 5 }));
});

test("every comparison operator behaves", () => {
  const snapshot = { a: 5 };
  assert.ok(evaluate({ metric: "a", op: "==", value: 5 }, snapshot));
  assert.ok(evaluate({ metric: "a", op: ">", value: 4 }, snapshot));
  assert.ok(evaluate({ metric: "a", op: "<", value: 6 }, snapshot));
  assert.ok(evaluate({ metric: "a", op: "<=", value: 5 }, snapshot));
  assert.ok(!evaluate({ metric: "a", op: ">", value: 5 }, snapshot));
});

test("a malformed rule parses to null and is never treated as satisfied", () => {
  assert.equal(parseRule(null), null);
  assert.equal(parseRule("nonsense"), null);
  assert.equal(parseRule({ metric: "a", op: "~=", value: 1 }), null);
  assert.equal(parseRule({ metric: "a", op: ">=", value: "ten" }), null);
  assert.equal(parseRule({ all: [{ bad: true }] }), null);
});

test("a well-formed rule round-trips through parseRule", () => {
  const raw = { all: [{ metric: "solves.total", op: ">=", value: 50 }] };
  const parsed = parseRule(raw);
  assert.ok(parsed);
  assert.ok(evaluate(parsed, { "solves.total": 50 }));
});

test("rules describe themselves in words a player can read", () => {
  const description = describeRule({
    all: [
      { metric: "solves.topic.graphs", op: ">=", value: 100 },
      { metric: "solves.difficulty.hard", op: ">=", value: 30 },
    ],
  });
  assert.match(description, /graphs solves/);
  assert.match(description, /and/);
});
