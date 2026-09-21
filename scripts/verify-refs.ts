import { TECH_NODES } from "./data/tech";
import { BLUEPRINTS } from "./data/blueprints";
import { ITEM_DEFINITIONS } from "./data/items";
import { ALL_PROBLEMS } from "./data/problems";

/**
 * Cross-reference gate.
 *
 * A blueprint or item that requires a tech node which does not exist is a gate
 * nobody can ever pass — it would look like a bug in the player's account
 * rather than in the seed. Likewise a tech node whose topics no problem covers
 * can never be researched, because research advances by solving.
 */

function main(): void {
  let failed = false;
  const fail = (message: string) => {
    console.error(`✗ ${message}`);
    failed = true;
  };

  const techSlugs = new Set(TECH_NODES.map((n) => n.slug));
  const problemTopics = new Set(ALL_PROBLEMS.flatMap((p) => p.topics));

  for (const node of TECH_NODES) {
    for (const required of node.requires) {
      if (!techSlugs.has(required)) fail(`tech "${node.slug}" requires missing node "${required}"`);
    }
    if (!node.topics.some((topic) => problemTopics.has(topic))) {
      fail(`tech "${node.slug}" has no topic covered by any problem — unresearchable`);
    }
  }

  for (const blueprint of BLUEPRINTS) {
    for (const required of blueprint.requiresTech) {
      if (!techSlugs.has(required)) {
        fail(`blueprint "${blueprint.slug}" requires missing tech "${required}"`);
      }
    }
  }

  for (const item of ITEM_DEFINITIONS) {
    for (const required of item.requiresTech) {
      if (!techSlugs.has(required)) fail(`item "${item.slug}" requires missing tech "${required}"`);
    }
    // Mirrors the item_definitions_craftable_rep check constraint.
    if (item.craftable && item.requiresRep < 3000) {
      fail(`item "${item.slug}" is craftable below the Forge threshold`);
    }
    if (item.rarity === "mythic" && item.craftable && item.requiresRep < 10000) {
      fail(`item "${item.slug}" is mythic but craftable below 10,000 rep`);
    }
  }

  const counts = {
    problems: ALL_PROBLEMS.length,
    tech: TECH_NODES.length,
    blueprints: BLUEPRINTS.length,
    items: ITEM_DEFINITIONS.length,
  };
  console.log(
    `problems ${counts.problems} · tech ${counts.tech} · blueprints ${counts.blueprints} · items ${counts.items}`,
  );

  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log("All seed cross-references resolve.");
}

main();
