import { test } from "node:test";
import assert from "node:assert/strict";
import {
  centroidFor,
  project,
  deconflict,
  arcPath,
  COUNTRY_CENTROIDS,
  ATLAS_WIDTH,
  ATLAS_HEIGHT,
} from "../lib/world/geo";

/**
 * Atlas projection.
 *
 * The property that matters is that nothing ever leaves the panel and nothing
 * ever renders on top of something else — a nation that clips off the edge or
 * hides under another is a nation the player cannot click.
 */

test("known country codes resolve to plausible centroids", () => {
  const india = centroidFor("IN");
  assert.ok(india.lat > 5 && india.lat < 36, "India sits in the northern tropics");
  assert.ok(india.lon > 68 && india.lon < 98);

  assert.equal(centroidFor("in").lat, india.lat, "lookup is case-insensitive");
});

test("an unmapped country still lands somewhere stable", () => {
  const a = centroidFor("ZZ");
  const b = centroidFor("ZZ");
  assert.deepEqual(a, b, "the fallback must be deterministic");
  assert.ok(a.lat >= -90 && a.lat <= 90);
  assert.ok(a.lon >= -180 && a.lon <= 180);
});

test("a missing country code does not throw", () => {
  assert.ok(centroidFor(null));
  assert.ok(centroidFor(undefined));
  assert.ok(centroidFor(""));
});

test("every catalogued centroid is a real coordinate", () => {
  for (const [code, { lat, lon }] of Object.entries(COUNTRY_CENTROIDS)) {
    assert.ok(lat >= -90 && lat <= 90, `${code} latitude out of range`);
    assert.ok(lon >= -180 && lon <= 180, `${code} longitude out of range`);
  }
});

test("projection keeps every country inside the panel", () => {
  for (const code of Object.keys(COUNTRY_CENTROIDS)) {
    const point = project(centroidFor(code), ATLAS_WIDTH, ATLAS_HEIGHT);
    assert.ok(point.x >= 0 && point.x <= ATLAS_WIDTH, `${code} x=${point.x} is off-panel`);
    assert.ok(point.y >= 0 && point.y <= ATLAS_HEIGHT, `${code} y=${point.y} is off-panel`);
  }
});

test("the poles are pulled inward rather than clipped", () => {
  const north = project({ lat: 90, lon: 0 }, ATLAS_WIDTH, ATLAS_HEIGHT);
  const south = project({ lat: -90, lon: 0 }, ATLAS_WIDTH, ATLAS_HEIGHT);

  assert.ok(north.y > 0, "the north pole stays on the panel");
  assert.ok(south.y < ATLAS_HEIGHT, "and so does the south");
  assert.ok(north.y < south.y, "north renders above south");
});

test("longitude maps left to right", () => {
  const west = project({ lat: 0, lon: -179 }, ATLAS_WIDTH, ATLAS_HEIGHT);
  const east = project({ lat: 0, lon: 179 }, ATLAS_WIDTH, ATLAS_HEIGHT);
  assert.ok(west.x < east.x);
});

test("deconflict pushes overlapping nations apart", () => {
  const points = [
    { id: "a", x: 500, y: 300 },
    { id: "b", x: 500, y: 300 },
    { id: "c", x: 505, y: 302 },
  ];

  deconflict(points, 26);

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      assert.ok(distance > 0, `${a.id} and ${b.id} are still on the same pixel`);
    }
  }
});

test("deconflict leaves well-separated nations alone", () => {
  const points = [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 800, y: 400 },
  ];
  const before = points.map((p) => ({ ...p }));

  deconflict(points, 26);

  assert.deepEqual(points, before, "nothing should move when nothing overlaps");
});

test("two nations founded in the same country both stay clickable", () => {
  // Three nations all founded in India would otherwise stack exactly.
  const centroid = centroidFor("IN");
  const points = ["n1", "n2", "n3"].map((id) => ({
    id,
    ...project(centroid, ATLAS_WIDTH, ATLAS_HEIGHT),
  }));

  deconflict(points, 26);

  const distinct = new Set(points.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
  assert.equal(distinct.size, 3, "all three must occupy distinct positions");
});

test("arc paths are well-formed SVG with no NaN", () => {
  const path = arcPath({ x: 100, y: 200 }, { x: 800, y: 350 });
  assert.match(path, /^M [\d.]+ [\d.]+ Q [-\d.]+ [-\d.]+ [\d.]+ [\d.]+$/);
  assert.ok(!path.includes("NaN"));
});

test("an arc between identical points does not produce NaN", () => {
  const path = arcPath({ x: 400, y: 400 }, { x: 400, y: 400 });
  assert.ok(!path.includes("NaN"), `degenerate arc produced ${path}`);
});
