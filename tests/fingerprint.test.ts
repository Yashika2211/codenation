import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenize,
  fingerprint,
  jaccard,
  K_GRAM,
  WINDOW,
  SIMILARITY_THRESHOLD,
} from "../lib/integrity/fingerprint";

/**
 * Similarity fingerprints.
 *
 * The property that matters is asymmetric: cosmetic edits must NOT change the
 * fingerprint (or the signal is useless), while genuinely different programs
 * must NOT collide (or it accuses innocent people). Both are tested here,
 * because a false positive costs someone their standing.
 */

const ORIGINAL = `
def solve(numbers):
    total = 0
    for value in numbers:
        total += value
    return total
`;

test("the spec's parameters are what the code uses", () => {
  assert.equal(K_GRAM, 5);
  assert.equal(WINDOW, 4);
  assert.equal(SIMILARITY_THRESHOLD, 0.82);
});

test("identifiers collapse so renaming does not change the shape", () => {
  const renamed = ORIGINAL.replace(/total/g, "acc").replace(/numbers/g, "xs").replace(/value/g, "v");
  assert.deepEqual(tokenize(ORIGINAL), tokenize(renamed));
});

test("keywords survive tokenisation, identifiers do not", () => {
  const tokens = tokenize("def f(x): return x");
  assert.ok(tokens.includes("def"), "keywords are kept verbatim");
  assert.ok(tokens.includes("return"));
  assert.ok(tokens.includes("id"), "identifiers become a placeholder");
  assert.ok(!tokens.includes("f"));
});

test("literals collapse to placeholders", () => {
  assert.deepEqual(tokenize("x = 1"), tokenize("x = 999999"));
  assert.deepEqual(tokenize('s = "a"'), tokenize('s = "completely different"'));
});

test("comments are stripped in all three syntaxes", () => {
  const withComments = `
# a python comment
def solve(numbers):  # trailing
    /* a c-style block */
    total = 0  // and a line one
    return total
`;
  const without = `
def solve(numbers):
    total = 0
    return total
`;
  assert.deepEqual(tokenize(withComments), tokenize(without));
});

test("reformatting does not change the fingerprint", () => {
  const reformatted = ORIGINAL.replace(/\n/g, "\n\n").replace(/    /g, "\t");
  const a = fingerprint(ORIGINAL);
  const b = fingerprint(reformatted);
  assert.deepEqual(a.hashes, b.hashes);
});

test("a renamed copy is caught above the threshold", () => {
  const renamed = ORIGINAL.replace(/total/g, "running").replace(/value/g, "item");
  const score = jaccard(fingerprint(ORIGINAL).hashes, fingerprint(renamed).hashes);
  assert.ok(score >= SIMILARITY_THRESHOLD, `renamed copy scored ${score}, expected >= ${SIMILARITY_THRESHOLD}`);
});

test("a genuinely different program stays well below the threshold", () => {
  const different = `
import heapq

def shortest(graph, start):
    dist = {start: 0}
    queue = [(0, start)]
    while queue:
        d, node = heapq.heappop(queue)
        for neighbour, weight in graph[node]:
            if d + weight < dist.get(neighbour, 1 << 60):
                dist[neighbour] = d + weight
                heapq.heappush(queue, (dist[neighbour], neighbour))
    return dist
`;
  const score = jaccard(fingerprint(ORIGINAL).hashes, fingerprint(different).hashes);
  assert.ok(
    score < SIMILARITY_THRESHOLD,
    `unrelated programs scored ${score}, which would flag an innocent person`,
  );
});

test("jaccard is symmetric, bounded, and 1 only for itself", () => {
  const a = fingerprint(ORIGINAL).hashes;
  const b = fingerprint(ORIGINAL.replace(/total/g, "sum")).hashes;

  assert.equal(jaccard(a, b), jaccard(b, a));
  assert.equal(jaccard(a, a), 1);
  assert.ok(jaccard(a, b) >= 0 && jaccard(a, b) <= 1);
});

test("an empty side scores zero rather than dividing by zero", () => {
  assert.equal(jaccard([], [1, 2, 3]), 0);
  assert.equal(jaccard([1, 2, 3], []), 0);
  assert.equal(jaccard([], []), 0);
});

test("a source too short to k-gram yields no hashes instead of throwing", () => {
  const result = fingerprint("x");
  assert.deepEqual(result.hashes, []);
  assert.ok(result.tokenCount < K_GRAM);
});

test("hashes are sorted, deduplicated and safe integers", () => {
  const { hashes } = fingerprint(ORIGINAL);
  assert.ok(hashes.length > 0);
  assert.deepEqual(hashes, [...hashes].sort((a, b) => a - b));
  assert.equal(new Set(hashes).size, hashes.length);
  assert.ok(hashes.every((h) => Number.isSafeInteger(h) && h >= 0));
});

test("fingerprinting is deterministic across runs", () => {
  assert.deepEqual(fingerprint(ORIGINAL).hashes, fingerprint(ORIGINAL).hashes);
});
