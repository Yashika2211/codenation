"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase, canUseServiceRole } from "@/lib/supabase/service";
import { spend } from "@/lib/economy/mint";
import { REASONS } from "@/lib/economy/rules";
import { FORGE_REP, MYTHIC_REP } from "@/lib/progression/ranks";
import { evaluateBadges } from "@/lib/progression/award";
import {
  ForgeParamsSchema,
  validateForRarity,
  costFor,
  noiseFromSeed,
  type ForgeParams,
} from "./params";
import { currentSeason } from "./season";
import type { RarityDb } from "@/lib/supabase/types";

/**
 * Crafting, per section 5.3. Every one of these rules is enforced here, on the
 * server, against rows read from the database:
 *
 *   1. rep >= definition.requires_rep (>= 3000 for every craftable)
 *   2. all requires_tech nodes mastered
 *   3. wallet covers cost, which scales base x rarity multiplier
 *   4. mythic needs 10,000 rep and is one-per-player-per-season, enforced by a
 *      partial unique index so two concurrent crafts cannot both slip through
 *   5. on success: deduct via the ledger, insert the instance with a real
 *      serial, add to inventory, emit activity, broadcast to the nation
 *   6. crafted items are bound; only rare and below unbind, for alloy
 *
 * Nothing about the cost or the gate comes from the request body.
 */

export type CraftResult =
  | { ok: true; message: string; serial: number; itemId: string }
  | { ok: false; message: string; issues?: Array<{ field: string; message: string }> };

export async function craftItem(input: {
  definitionSlug: string;
  params: ForgeParams;
}): Promise<CraftResult> {
  if (!canUseServiceRole()) {
    return { ok: false, message: "The Forge is not configured on this deployment." };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Not available." };

  // Identity comes from the session, never from the payload.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, message: "Sign in to use the Forge." };

  const parsed = ForgeParamsSchema.safeParse(input.params);
  if (!parsed.success) {
    return { ok: false, message: "Those parameters are not valid." };
  }
  const params = parsed.data;

  const service = createServiceSupabase();

  const { data: profile } = await service
    .from("profiles")
    .select("id,reputation,nation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { ok: false, message: "Complete onboarding first." };

  // --- rule 1: reputation ---------------------------------------------------
  if (profile.reputation < FORGE_REP) {
    return {
      ok: false,
      message: `The Forge opens at ${FORGE_REP.toLocaleString("en-US")} reputation. You have ${profile.reputation.toLocaleString("en-US")}.`,
    };
  }

  const { data: definition } = await service
    .from("item_definitions")
    .select("*")
    .eq("slug", input.definitionSlug)
    .maybeSingle();

  if (!definition) return { ok: false, message: "No such item." };
  if (!definition.craftable) return { ok: false, message: "That item cannot be forged." };

  if (profile.reputation < definition.requires_rep) {
    return {
      ok: false,
      message: `${definition.name} needs ${definition.requires_rep.toLocaleString("en-US")} reputation.`,
    };
  }

  const rarity = definition.rarity as RarityDb;

  // --- rule 4: mythic gate --------------------------------------------------
  const season = currentSeason();
  if (rarity === "mythic") {
    if (profile.reputation < MYTHIC_REP) {
      return {
        ok: false,
        message: `Mythic crafting needs ${MYTHIC_REP.toLocaleString("en-US")} reputation.`,
      };
    }

    const { data: existingMythic } = await service
      .from("item_instances")
      .select("id")
      .eq("owner_id", profile.id)
      .eq("season", season)
      .contains("params", { rarity: "mythic" })
      .maybeSingle();

    if (existingMythic) {
      return { ok: false, message: "You have already forged a mythic item this season." };
    }
  }

  // --- parameter legality for this rarity -----------------------------------
  const issues = validateForRarity(params, rarity, profile.reputation);
  if (issues.length > 0) {
    return { ok: false, message: "Those settings are not available at this rarity.", issues };
  }

  // --- rule 2: mastered tech ------------------------------------------------
  if (definition.requires_tech.length > 0) {
    const { data: mastered } = await service
      .from("tech_progress")
      .select("node_id")
      .eq("user_id", profile.id)
      .eq("state", "mastered")
      .in("node_id", definition.requires_tech);

    if ((mastered?.length ?? 0) < definition.requires_tech.length) {
      const missing = definition.requires_tech.length - (mastered?.length ?? 0);
      return {
        ok: false,
        message: `${missing} required technolog${missing === 1 ? "y" : "ies"} not yet mastered.`,
      };
    }
  }

  // --- rule 3: cost ---------------------------------------------------------
  const base = (definition.cost ?? {}) as { compute?: number; data?: number; alloy?: number };
  const cost = costFor(base, rarity);

  // Allocate the serial before spending, so a failed serial cannot burn resources.
  const { data: serial, error: serialError } = await service.rpc("next_item_serial", {
    p_definition: definition.id,
  });

  if (serialError || typeof serial !== "number") {
    return { ok: false, message: "Could not allocate a serial." };
  }

  const seed = randomBytes(8).toString("hex");
  const stored: ForgeParams & { rarity: RarityDb } = {
    ...params,
    // Noise is derived from the stored seed, so the render is reproducible.
    seedNoise: noiseFromSeed(seed),
    rarity,
  };

  const payment = await spend({
    userId: profile.id,
    reason: REASONS.forge,
    cost,
    refTable: "item_definitions",
  });

  if (!payment.ok) {
    return {
      ok: false,
      message: `Not enough ${payment.missing.join(" and ")}. This costs ${cost.compute} compute, ${cost.data} data, ${cost.alloy} alloy.`,
    };
  }

  // --- rule 5: mint the instance -------------------------------------------
  const { data: instance, error: insertError } = await service
    .from("item_instances")
    .insert({
      definition_id: definition.id,
      owner_id: profile.id,
      params: stored,
      seed,
      serial,
      // Rule 6: crafted items are bound.
      bound: true,
      season,
    })
    .select("id,serial")
    .single();

  if (insertError || !instance) {
    // The partial unique index is the real mythic guard; losing the race here
    // is correct behaviour, not a failure of the check above.
    if (insertError?.code === "23505") {
      return { ok: false, message: "You have already forged a mythic item this season." };
    }
    return { ok: false, message: "The forge failed. Your resources were spent on the attempt." };
  }

  await service.from("inventory").insert({
    user_id: profile.id,
    item_instance_id: instance.id,
    source: "forge",
  });

  await service.from("activity_feed").insert({
    actor_id: profile.id,
    verb: "forged",
    object_type: "item",
    object_id: instance.id,
    nation_id: profile.nation_id,
    payload: {
      name: definition.name,
      slug: definition.slug,
      rarity,
      serial: instance.serial,
    },
  });

  // Broadcast to the nation's realtime channel so a citizen watching the city
  // sees it appear without a refresh.
  if (profile.nation_id) {
    const channel = service.channel(`nation:${profile.nation_id}`);
    await channel.send({
      type: "broadcast",
      event: "forged",
      payload: { name: definition.name, rarity, serial: instance.serial },
    });
    await service.removeChannel(channel);
  }

  await evaluateBadges(profile.id);

  revalidatePath("/forge");
  revalidatePath(`/u/${profile.id}`);

  return {
    ok: true,
    message: `${definition.name} #${String(instance.serial).padStart(3, "0")} forged.`,
    serial: instance.serial,
    itemId: instance.id,
  };
}

/** Rule 6: only rare and below may be unbound, for an alloy cost. */
export async function unbindItem(itemId: string): Promise<CraftResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Not available." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Not available." };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, message: "Sign in first." };

  const service = createServiceSupabase();

  const { data: instance } = await service
    .from("item_instances")
    .select("id,owner_id,bound,serial,item_definitions(name,rarity)")
    .eq("id", itemId)
    .maybeSingle();

  type InstanceJoin = {
    id: string;
    owner_id: string;
    bound: boolean;
    serial: number;
    item_definitions: { name: string; rarity: RarityDb } | null;
  };

  const row = instance as unknown as InstanceJoin | null;
  if (!row || row.owner_id !== userData.user.id) {
    return { ok: false, message: "That item is not yours." };
  }
  if (!row.bound) return { ok: false, message: "That item is already unbound." };

  const rarity = row.item_definitions?.rarity ?? "common";
  if (rarity !== "common" && rarity !== "rare") {
    return {
      ok: false,
      message: "Only common and rare items can be unbound. This is what keeps the market safe.",
    };
  }

  const alloyCost = rarity === "rare" ? 120 : 45;
  const payment = await spend({
    userId: userData.user.id,
    reason: REASONS.unbind,
    cost: { alloy: alloyCost },
    refTable: "item_instances",
    refId: row.id,
  });

  if (!payment.ok) return { ok: false, message: `Unbinding costs ${alloyCost} alloy.` };

  await service.from("item_instances").update({ bound: false }).eq("id", row.id);

  revalidatePath("/forge");
  return {
    ok: true,
    message: `${row.item_definitions?.name ?? "Item"} unbound.`,
    serial: row.serial,
    itemId: row.id,
  };
}
