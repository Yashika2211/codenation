import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HANDLE_PATTERN,
  normalizeHandle,
  checkHandle,
  suggestHandle,
  normalizeCountryCode,
} from "../lib/identity/handle";
import { avatarGradient, initialsOf } from "../components/ui/Avatar";
import { accentFromSeed, toAccent, isAccent, ACCENTS } from "../lib/design/accents";
import { heatLevel } from "../components/ui/Heatmap";
import { formatResource } from "../components/ui/ResourceChip";

/**
 * Identity and presentation helpers.
 *
 * A handle is permanent and is the address of a profile, a city and a nation,
 * so the rules here have to match the database's check constraint exactly —
 * anything the client accepts but Postgres rejects is a dead end for the user.
 */

test("the handle pattern matches the database check constraint", () => {
  // profiles_handle_format: '^[a-z0-9](?:[a-z0-9_-]{1,29})$'
  assert.ok(HANDLE_PATTERN.test("ada"));
  assert.ok(HANDLE_PATTERN.test("a1"));
  assert.ok(HANDLE_PATTERN.test("some-handle_9"));
  assert.ok(!HANDLE_PATTERN.test("a"), "a single character is too short");
  assert.ok(!HANDLE_PATTERN.test("-leading"), "must start alphanumeric");
  assert.ok(!HANDLE_PATTERN.test("Upper"));
  assert.ok(!HANDLE_PATTERN.test("has space"));
  assert.ok(!HANDLE_PATTERN.test("a".repeat(31)));
});

test("normalisation lowercases, replaces and trims to the max length", () => {
  assert.equal(normalizeHandle("  Ada Lovelace  "), "ada-lovelace");
  assert.equal(normalizeHandle("A..B"), "a-b");
  assert.equal(normalizeHandle("--leading"), "leading");
  assert.equal(normalizeHandle("x".repeat(60)).length, 30);
});

test("a normalised handle always satisfies the pattern or is rejected", () => {
  const inputs = ["Ada Lovelace", "grace!!hopper", "  x  ", "###", "a", "9lives", "_under"];
  for (const input of inputs) {
    const result = checkHandle(input);
    if (result.ok) {
      assert.ok(
        HANDLE_PATTERN.test(result.handle),
        `accepted "${input}" as "${result.handle}" which the database would reject`,
      );
    }
  }
});

test("reserved handles are refused so they cannot shadow a route", () => {
  for (const reserved of ["admin", "arena", "forge", "me", "u", "n", "signin"]) {
    const result = checkHandle(reserved);
    assert.ok(!result.ok, `"${reserved}" must be reserved`);
  }
});

test("too short and too long are both refused with a reason", () => {
  const short = checkHandle("a");
  assert.ok(!short.ok);
  assert.match(short.reason, /at least/);

  const empty = checkHandle("###");
  assert.ok(!empty.ok);
});

test("suggestions are usable handles", () => {
  const fromEmail = suggestHandle("ada.lovelace@example.com");
  assert.ok(checkHandle(fromEmail).ok, `suggested "${fromEmail}" is not valid`);

  // A reserved or too-short source still yields something usable.
  const fromReserved = suggestHandle("admin");
  assert.ok(checkHandle(fromReserved).ok, `suggested "${fromReserved}" is not valid`);
});

test("country codes are two uppercase letters or null", () => {
  assert.equal(normalizeCountryCode("in"), "IN");
  assert.equal(normalizeCountryCode(" gb "), "GB");
  assert.equal(normalizeCountryCode("USA"), null);
  assert.equal(normalizeCountryCode(""), null);
  assert.equal(normalizeCountryCode(null), null);
});

test("avatar gradients are deterministic and differ between seeds", () => {
  const a = avatarGradient("seed-one");
  assert.deepEqual(a, avatarGradient("seed-one"));
  assert.notDeepEqual(a, avatarGradient("seed-two"));
  assert.match(a.from, /^hsl\(/);
});

test("initials handle one name, two names and nothing at all", () => {
  assert.equal(initialsOf("Ada Lovelace"), "AL");
  assert.equal(initialsOf("ada"), "AD");
  assert.equal(initialsOf("  "), "??");
  assert.equal(initialsOf("Ada Byron Lovelace"), "AL", "first and last, not the middle");
});

test("accents resolve deterministically and fall back safely", () => {
  assert.ok(isAccent("flux"));
  assert.ok(!isAccent("chartreuse"));
  assert.equal(toAccent("chartreuse"), "flux", "a bad database value must not break a render");
  assert.equal(toAccent(null), "flux");

  const seeded = accentFromSeed("nation-invariant");
  assert.equal(seeded, accentFromSeed("nation-invariant"));
  assert.ok(ACCENTS.includes(seeded));
});

test("heatmap levels bucket against the window's own maximum", () => {
  assert.equal(heatLevel(0, 10), 0, "no activity is always level zero");
  assert.equal(heatLevel(10, 10), 4, "the busiest day is always the top level");
  assert.equal(heatLevel(1, 1), 4, "a single-contribution window still shows");
  assert.ok(heatLevel(3, 10) < heatLevel(8, 10));
});

test("resource formatting stays compact so a chip never reflows the nav", () => {
  assert.equal(formatResource(42), "42");
  assert.equal(formatResource(999), "999");
  assert.equal(formatResource(1500), "1.5k");
  assert.equal(formatResource(48200), "48k");
  assert.equal(formatResource(1_240_000), "1.2M");
  assert.ok(formatResource(999_999_999).length <= 5);
});
