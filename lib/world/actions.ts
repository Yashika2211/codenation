"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase, canUseServiceRole } from "@/lib/supabase/service";
import { spend } from "@/lib/economy/mint";
import { REASONS } from "@/lib/economy/rules";
import { hasRank, rankFor } from "@/lib/progression/ranks";
import { toAccent } from "@/lib/design/accents";
import { evaluateBadges } from "@/lib/progression/award";

/**
 * World mutations.
 *
 * Every one of these re-derives the caller from the session cookie and re-reads
 * cost and gating from the database. Nothing — not the parcel, not the
 * blueprint, not the price — is taken from the form body except the choice of
 * what to build and where.
 */

export type WorldActionResult = { ok: boolean; message: string };

type Caller = { id: string; reputation: number };

async function requireCaller(): Promise<Caller | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,reputation")
    .eq("id", userData.user.id)
    .maybeSingle();

  return profile ? { id: profile.id, reputation: profile.reputation } : null;
}

/** Parcels a player may hold, by rank. Engineer opens the first three. */
export function parcelAllowance(reputation: number): number {
  if (!hasRank(reputation, "engineer")) return 0;
  if (!hasRank(reputation, "architect")) return 3;
  if (!hasRank(reputation, "founder")) return 6;
  if (!hasRank(reputation, "sovereign")) return 10;
  if (!hasRank(reputation, "luminary")) return 16;
  return 24;
}

const PARCEL_BASE_COST = 320;

export async function claimParcel(formData: FormData): Promise<WorldActionResult> {
  if (!canUseServiceRole()) {
    return { ok: false, message: "The world is not configured on this deployment." };
  }

  const caller = await requireCaller();
  if (!caller) return { ok: false, message: "Sign in to claim land." };

  const allowance = parcelAllowance(caller.reputation);
  if (allowance === 0) {
    return {
      ok: false,
      message: `Land opens at Engineer, 1,000 reputation. You are ${rankFor(caller.reputation).name}.`,
    };
  }

  const x = Number(formData.get("grid_x"));
  const y = Number(formData.get("grid_y"));
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 15 || y < 0 || y > 15) {
    return { ok: false, message: "That is not a parcel." };
  }

  const service = createServiceSupabase();

  const { count: held } = await service
    .from("parcels")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", caller.id);

  if ((held ?? 0) >= allowance) {
    return {
      ok: false,
      message: `You hold ${held} of ${allowance} parcels. The next tier opens at the rank above.`,
    };
  }

  // Cost rises with holdings, so sprawl is a decision rather than a default.
  const cost = PARCEL_BASE_COST * Math.max(1, (held ?? 0) + 1);

  const { data: existing } = await service
    .from("parcels")
    .select("id")
    .eq("owner_id", caller.id)
    .eq("grid_x", x)
    .eq("grid_y", y)
    .is("nation_id", null)
    .maybeSingle();

  if (existing) return { ok: false, message: "You already hold that parcel." };

  const payment = await spend({
    userId: caller.id,
    reason: REASONS.parcel,
    cost: { compute: cost },
    refTable: "parcels",
  });

  if (!payment.ok) {
    return { ok: false, message: `Not enough compute. This parcel costs ${cost}.` };
  }

  const { error } = await service.from("parcels").insert({
    owner_id: caller.id,
    grid_x: x,
    grid_y: y,
    zoning: "compute",
  });

  if (error) return { ok: false, message: "Could not claim that parcel." };

  revalidatePath("/city");
  return { ok: true, message: `Parcel ${x},${y} claimed for ${cost} compute.` };
}

export async function startConstruction(formData: FormData): Promise<WorldActionResult> {
  if (!canUseServiceRole()) {
    return { ok: false, message: "The world is not configured on this deployment." };
  }

  const caller = await requireCaller();
  if (!caller) return { ok: false, message: "Sign in to build." };

  const parcelId = String(formData.get("parcel_id") ?? "");
  const blueprintSlug = String(formData.get("blueprint") ?? "");
  if (!parcelId || !blueprintSlug) return { ok: false, message: "Pick a parcel and a blueprint." };

  const service = createServiceSupabase();

  // Ownership is checked against the database, never against the form.
  const { data: parcel } = await service
    .from("parcels")
    .select("id,owner_id")
    .eq("id", parcelId)
    .maybeSingle();

  if (!parcel || parcel.owner_id !== caller.id) {
    return { ok: false, message: "That parcel is not yours." };
  }

  const { data: occupied } = await service
    .from("buildings")
    .select("id")
    .eq("parcel_id", parcelId)
    .maybeSingle();

  if (occupied) return { ok: false, message: "Something already stands there." };

  // Cost and gating come from the blueprint row, not from the client.
  const { data: blueprint } = await service
    .from("blueprints")
    .select("*")
    .eq("slug", blueprintSlug)
    .maybeSingle();

  if (!blueprint) return { ok: false, message: "No such blueprint." };

  if (caller.reputation < blueprint.requires_rep) {
    return {
      ok: false,
      message: `${blueprint.name} needs ${blueprint.requires_rep.toLocaleString("en-US")} reputation.`,
    };
  }

  if (blueprint.requires_tech.length > 0) {
    const { data: mastered } = await service
      .from("tech_progress")
      .select("node_id")
      .eq("user_id", caller.id)
      .eq("state", "mastered")
      .in("node_id", blueprint.requires_tech);

    if ((mastered?.length ?? 0) < blueprint.requires_tech.length) {
      return { ok: false, message: `${blueprint.name} needs more research first.` };
    }
  }

  const cost = blueprint.base_cost as Record<string, number> | null;
  const payment = await spend({
    userId: caller.id,
    reason: REASONS.build,
    cost: {
      compute: cost?.compute ?? 0,
      data: cost?.data ?? 0,
      alloy: cost?.alloy ?? 0,
    },
    refTable: "parcels",
    refId: parcelId,
  });

  if (!payment.ok) {
    return { ok: false, message: `Not enough ${payment.missing.join(" and ")}.` };
  }

  const eta = new Date(Date.now() + blueprint.build_minutes * 60_000).toISOString();

  const { error } = await service.from("buildings").insert({
    parcel_id: parcelId,
    blueprint_id: blueprint.id,
    owner_id: caller.id,
    level: 1,
    accent: toAccent(blueprint.default_accent),
    state: "building",
    progress: 0,
    eta,
  });

  if (error) return { ok: false, message: "Could not start construction." };

  await service.from("activity_feed").insert({
    actor_id: caller.id,
    verb: "started",
    object_type: "building",
    payload: { blueprint: blueprint.slug, name: blueprint.name },
  });

  await evaluateBadges(caller.id);

  revalidatePath("/city");
  return { ok: true, message: `${blueprint.name} under construction.` };
}

export async function foundNation(formData: FormData): Promise<WorldActionResult> {
  if (!canUseServiceRole()) {
    return { ok: false, message: "The world is not configured on this deployment." };
  }

  const caller = await requireCaller();
  if (!caller) return { ok: false, message: "Sign in first." };

  if (!hasRank(caller.reputation, "founder")) {
    return {
      ok: false,
      message: `Founding a nation opens at 2,500 reputation. You have ${caller.reputation.toLocaleString("en-US")}.`,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { ok: false, message: "A nation's name is 2 to 40 characters." };
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  if (slug.length < 2) return { ok: false, message: "That name has no usable slug." };

  const doctrine = String(formData.get("doctrine") ?? "").trim().slice(0, 240);
  const accent = toAccent(String(formData.get("accent") ?? "flux"));

  const service = createServiceSupabase();

  const { data: already } = await service
    .from("nations")
    .select("id")
    .eq("founder_id", caller.id)
    .maybeSingle();

  if (already) return { ok: false, message: "You have already founded a nation." };

  const { data: profile } = await service
    .from("profiles")
    .select("country_code")
    .eq("id", caller.id)
    .maybeSingle();

  const { data: nation, error } = await service
    .from("nations")
    .insert({
      slug,
      name,
      founder_id: caller.id,
      doctrine: doctrine || null,
      accent,
      country_code: profile?.country_code ?? null,
      flag: { base: accent, motif: "diamond", layout: "diagonal" },
    })
    .select("id,slug")
    .single();

  if (error || !nation) {
    if (error?.code === "23505") return { ok: false, message: "That name is taken." };
    return { ok: false, message: "Could not found the nation." };
  }

  await service.from("profiles").update({ nation_id: nation.id }).eq("id", caller.id);
  await service.from("parcels").update({ nation_id: nation.id }).eq("owner_id", caller.id);

  await service.from("activity_feed").insert({
    actor_id: caller.id,
    verb: "founded",
    object_type: "nation",
    object_id: nation.id,
    nation_id: nation.id,
    payload: { slug: nation.slug, name },
  });

  await evaluateBadges(caller.id);

  revalidatePath("/city");
  revalidatePath("/atlas");
  return { ok: true, message: `${name} founded.` };
}
