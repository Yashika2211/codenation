"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase, canUseServiceRole } from "@/lib/supabase/service";
import { spend, mint } from "@/lib/economy/mint";
import { REASONS } from "@/lib/economy/rules";
import { hasRank } from "@/lib/progression/ranks";
import { toAccent } from "@/lib/design/accents";
import { evaluateBadges } from "@/lib/progression/award";
import type { ResourceKindDb } from "@/lib/supabase/types";

/**
 * Alliances and trade.
 *
 * A trade settles by moving resources between the two founders' wallets through
 * the ledger — the same append-only path every other grant uses, so a trade is
 * as auditable as a solve. Nothing here trusts an amount from the client
 * without re-reading the row it came from.
 */

export type AllianceResult = { ok: boolean; message: string; slug?: string };

const TRADEABLE: ResourceKindDb[] = ["compute", "data", "alloy"];

async function callerNation() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,reputation,nation_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile?.nation_id) return { profile, nation: null };

  const service = createServiceSupabase();
  const { data: nation } = await service
    .from("nations")
    .select("id,slug,name,founder_id")
    .eq("id", profile.nation_id)
    .maybeSingle();

  return { profile, nation: nation ?? null };
}

/** Parses a resource amount form field, refusing anything that is not sane. */
function amountFrom(formData: FormData, key: string): number {
  const raw = Number(formData.get(key));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(1_000_000_000, Math.floor(raw));
}

function bundleFrom(formData: FormData, prefix: string): Partial<Record<ResourceKindDb, number>> {
  const bundle: Partial<Record<ResourceKindDb, number>> = {};
  for (const resource of TRADEABLE) {
    const amount = amountFrom(formData, `${prefix}_${resource}`);
    if (amount > 0) bundle[resource] = amount;
  }
  return bundle;
}

export async function foundAlliance(formData: FormData): Promise<AllianceResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Not configured here." };

  const caller = await callerNation();
  if (!caller) return { ok: false, message: "Sign in first." };
  if (!caller.nation) return { ok: false, message: "Found a nation before an alliance." };

  if (!hasRank(caller.profile.reputation, "luminary")) {
    return {
      ok: false,
      message: `Alliances open at 5,000 reputation. You have ${caller.profile.reputation.toLocaleString("en-US")}.`,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { ok: false, message: "An alliance name is 2 to 40 characters." };
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  if (slug.length < 2) return { ok: false, message: "That name has no usable slug." };

  const charter = String(formData.get("charter") ?? "").trim().slice(0, 4000);
  const accent = toAccent(String(formData.get("accent") ?? "ion"));

  const service = createServiceSupabase();

  const { data: already } = await service
    .from("alliance_members")
    .select("alliance_id")
    .eq("nation_id", caller.nation.id)
    .maybeSingle();

  if (already) return { ok: false, message: "Your nation already belongs to an alliance." };

  const { data: alliance, error } = await service
    .from("alliances")
    .insert({
      slug,
      name,
      charter_md: charter,
      accent,
      founder_id: caller.profile.id,
    })
    .select("id,slug")
    .single();

  if (error || !alliance) {
    if (error?.code === "23505") return { ok: false, message: "That name is taken." };
    return { ok: false, message: "Could not found the alliance." };
  }

  await service.from("alliance_members").insert({
    alliance_id: alliance.id,
    nation_id: caller.nation.id,
    role: "speaker",
  });

  await service.from("activity_feed").insert({
    actor_id: caller.profile.id,
    verb: "founded an alliance",
    object_type: "alliance",
    object_id: alliance.id,
    nation_id: caller.nation.id,
    payload: { slug: alliance.slug, name },
  });

  await evaluateBadges(caller.profile.id);

  revalidatePath("/guild");
  return { ok: true, message: `${name} founded.`, slug: alliance.slug };
}

export async function postTrade(formData: FormData): Promise<AllianceResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Not configured here." };

  const caller = await callerNation();
  if (!caller?.nation) return { ok: false, message: "You need a nation to trade." };

  const offer = bundleFrom(formData, "offer");
  const want = bundleFrom(formData, "want");

  if (Object.keys(offer).length === 0) return { ok: false, message: "Offer something." };
  if (Object.keys(want).length === 0) return { ok: false, message: "Ask for something." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 240);

  // The offer is escrowed now, so an accepted trade cannot fail on payment.
  const escrow = await spend({
    userId: caller.profile.id,
    reason: REASONS.trade,
    cost: offer,
    refTable: "trades",
  });

  if (!escrow.ok) {
    return { ok: false, message: `You do not hold enough ${escrow.missing.join(" and ")}.` };
  }

  const service = createServiceSupabase();
  const { error } = await service.from("trades").insert({
    from_nation: caller.nation.id,
    offer,
    want,
    note: note || null,
    state: "open",
  });

  if (error) {
    // Refund immediately rather than leaving the offer in limbo.
    await mint({
      userId: caller.profile.id,
      reason: REASONS.trade,
      grants: Object.entries(offer).map(([resource, amount]) => ({
        resource: resource as ResourceKindDb,
        amount: amount ?? 0,
      })),
      skipDiminishing: true,
    });
    return { ok: false, message: "Could not post that offer." };
  }

  const slug = formData.get("alliance_slug");
  if (typeof slug === "string" && slug) revalidatePath(`/guild/${slug}`);

  return { ok: true, message: "Offer posted. Your resources are held in escrow." };
}

export async function acceptTrade(formData: FormData): Promise<AllianceResult> {
  if (!canUseServiceRole()) return { ok: false, message: "Not configured here." };

  const caller = await callerNation();
  if (!caller?.nation) return { ok: false, message: "You need a nation to trade." };

  const tradeId = String(formData.get("trade_id") ?? "");
  if (!tradeId) return { ok: false, message: "No such offer." };

  const service = createServiceSupabase();

  // Everything about the deal is re-read here. The form carries only the id.
  const { data: trade } = await service
    .from("trades")
    .select("id,from_nation,to_nation,offer,want,state")
    .eq("id", tradeId)
    .maybeSingle();

  if (!trade || trade.state !== "open") return { ok: false, message: "That offer is closed." };
  if (trade.from_nation === caller.nation.id) {
    return { ok: false, message: "You cannot accept your own offer." };
  }

  const { data: seller } = await service
    .from("nations")
    .select("founder_id")
    .eq("id", trade.from_nation)
    .maybeSingle();

  if (!seller) return { ok: false, message: "The offering nation no longer exists." };

  const offer = trade.offer as Record<string, number>;
  const want = trade.want as Record<string, number>;

  // Claim the offer before moving anything, so two acceptances cannot both pay.
  const { data: claimed } = await service
    .from("trades")
    .update({
      state: "accepted",
      to_nation: caller.nation.id,
      settled_at: new Date().toISOString(),
    })
    .eq("id", trade.id)
    .eq("state", "open")
    .select("id")
    .maybeSingle();

  if (!claimed) return { ok: false, message: "Someone took that offer first." };

  const payment = await spend({
    userId: caller.profile.id,
    reason: REASONS.trade,
    cost: want,
    refTable: "trades",
    refId: trade.id,
  });

  if (!payment.ok) {
    // Roll the claim back so the offer stays live for someone who can pay.
    await service.from("trades").update({ state: "open", to_nation: null, settled_at: null }).eq("id", trade.id);
    return { ok: false, message: `You do not hold enough ${payment.missing.join(" and ")}.` };
  }

  // Buyer receives the escrowed offer; seller receives what they asked for.
  await mint({
    userId: caller.profile.id,
    reason: REASONS.trade,
    grants: Object.entries(offer).map(([resource, amount]) => ({
      resource: resource as ResourceKindDb,
      amount,
    })),
    refTable: "trades",
    refId: trade.id,
    skipDiminishing: true,
  });

  await mint({
    userId: seller.founder_id,
    reason: REASONS.trade,
    grants: Object.entries(want).map(([resource, amount]) => ({
      resource: resource as ResourceKindDb,
      amount,
    })),
    refTable: "trades",
    refId: trade.id,
    skipDiminishing: true,
  });

  const slug = formData.get("alliance_slug");
  if (typeof slug === "string" && slug) revalidatePath(`/guild/${slug}`);

  return { ok: true, message: "Trade settled." };
}
