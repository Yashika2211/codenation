import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";
import { CITIZENS, NATIONS, type SeedCitizen } from "./data/citizens";
import { ALL_PROBLEMS } from "./data/problems";
import { BLUEPRINTS } from "./data/blueprints";

/**
 * Seeds the generated parts of the world: synthetic citizens, their nations,
 * land, buildings and enough ledger history to make the heatmaps and the atlas
 * look like a place rather than a fixture.
 *
 * Static reference data (problems, tech, blueprints, items, badges) lives in
 * supabase/seed.sql and should be applied first.
 *
 * Two rules this script does not bend:
 *   1. Every citizen is inserted with `is_seed = true`, so §11 holds — they are
 *      excluded from every real count and marked on their own profile.
 *   2. Reputation is *minted through the ledger*, never patched onto the
 *      profile. The seeded world obeys the same economy as a real player, which
 *      is the only way the ledger stays a true record.
 *
 * Usage: pnpm seed        (needs SUPABASE_SERVICE_ROLE_KEY)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.\n" +
      "Apply supabase/seed.sql first — this script only adds the generated parts.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Deterministic RNG, so re-seeding produces the same world. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = makeRandom(20260921);

function pick<T>(items: readonly T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

async function ensureAuthUser(citizen: SeedCitizen): Promise<string | null> {
  const email = `${citizen.handle}@seed.codenation.invalid`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { seed: true, user_name: citizen.handle },
  });

  if (!error && data.user) return data.user.id;

  // Already present from an earlier run — find them rather than failing.
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((user) => user.email === email);
  return existing?.id ?? null;
}

/**
 * Spreads a target reputation across a year of ledger rows so the contribution
 * heatmap has real shape. Each row is a genuine grant, not a backfilled total.
 */
function ledgerRowsFor(userId: string, citizen: SeedCitizen) {
  const rows: Database["public"]["Tables"]["resource_ledger"]["Insert"][] = [];
  const rng = makeRandom(
    citizen.handle.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7),
  );

  let repRemaining = citizen.reputation;
  let day = 0;

  // Walk backwards through the year, paying out in solve-sized chunks.
  while (repRemaining > 0 && day < 360) {
    day += 1 + Math.floor(rng() * 3);
    if (day > 360) break;

    // Quiet days are what make a heatmap readable.
    if (rng() < 0.32) continue;

    const solvesToday = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < solvesToday && repRemaining > 0; i += 1) {
      const problem = pick(ALL_PROBLEMS, rng);
      const mult = { easy: 1, medium: 2, hard: 4, expert: 7 }[problem.difficulty];
      const rep = Math.min(repRemaining, 8 * mult);
      const compute = 60 * mult;

      const at = new Date(Date.now() - day * 86_400_000 + i * 3_600_000).toISOString();

      rows.push({
        user_id: userId,
        resource: "rep",
        delta: rep,
        reason: "solve",
        ref_table: "seed",
        created_at: at,
      });
      rows.push({
        user_id: userId,
        resource: "compute",
        delta: compute,
        reason: "solve",
        ref_table: "seed",
        created_at: at,
      });

      repRemaining -= rep;
    }
  }

  // Whatever is left lands as one older grant, so the target is exact.
  if (repRemaining > 0) {
    rows.push({
      user_id: userId,
      resource: "rep",
      delta: repRemaining,
      reason: "contest_placement",
      ref_table: "seed",
      created_at: new Date(Date.now() - 364 * 86_400_000).toISOString(),
    });
  }

  return rows;
}

async function main(): Promise<void> {
  console.log("Seeding the generated world ...\n");

  const idByHandle = new Map<string, string>();

  // --- citizens ------------------------------------------------------------
  for (const citizen of CITIZENS) {
    const userId = await ensureAuthUser(citizen);
    if (!userId) {
      console.error(`  ✗ ${citizen.handle}: could not create an auth user`);
      continue;
    }
    idByHandle.set(citizen.handle, userId);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        handle: citizen.handle,
        display_name: citizen.displayName,
        bio: citizen.bio,
        avatar_seed: `seed-${citizen.handle}`,
        country_code: citizen.countryCode,
        arena_rating: citizen.arenaRating,
        // Section 11: marked, and excluded from every real count.
        is_seed: true,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error(`  ✗ ${citizen.handle}: ${error.message}`);
      continue;
    }

    // Reputation arrives through the ledger, exactly as a real player's would.
    const { count: existing } = await supabase
      .from("resource_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((existing ?? 0) === 0) {
      const rows = ledgerRowsFor(userId, citizen);
      for (let i = 0; i < rows.length; i += 500) {
        const { error: ledgerError } = await supabase
          .from("resource_ledger")
          .insert(rows.slice(i, i + 500));
        if (ledgerError) console.error(`  ! ${citizen.handle} ledger: ${ledgerError.message}`);
      }
      console.log(`  + ${citizen.handle} (${rows.length} ledger rows)`);
    } else {
      console.log(`  = ${citizen.handle} (already has history)`);
    }
  }

  // --- nations -------------------------------------------------------------
  console.log("\nFounding nations ...");
  for (const nation of NATIONS) {
    const founderId = idByHandle.get(nation.founderHandle);
    if (!founderId) {
      console.error(`  ✗ ${nation.slug}: founder ${nation.founderHandle} is missing`);
      continue;
    }

    const { data, error } = await supabase
      .from("nations")
      .upsert(
        {
          slug: nation.slug,
          name: nation.name,
          founder_id: founderId,
          doctrine: nation.doctrine,
          accent: nation.accent,
          tier: nation.tier,
          prestige: nation.prestige,
          country_code: nation.countryCode,
          is_seed: true,
          flag: { base: nation.accent, motif: "diamond", layout: "diagonal" },
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error(`  ✗ ${nation.slug}: ${error?.message}`);
      continue;
    }

    await supabase.from("profiles").update({ nation_id: data.id }).eq("id", founderId);
    console.log(`  + ${nation.name}`);

    await seedCity(data.id, founderId, nation.slug);
  }

  // --- citizenship ---------------------------------------------------------
  // Spread the remaining citizens across the founded nations.
  const { data: nationRows } = await supabase.from("nations").select("id").eq("is_seed", true);
  if (nationRows && nationRows.length > 0) {
    for (const citizen of CITIZENS) {
      const userId = idByHandle.get(citizen.handle);
      if (!userId) continue;
      const isFounder = NATIONS.some((n) => n.founderHandle === citizen.handle);
      if (isFounder) continue;

      const nation = pick(nationRows, random);
      await supabase.from("profiles").update({ nation_id: nation.id }).eq("id", userId);
    }
  }

  console.log("\nDone. Seeded citizens are marked is_seed = true and excluded from real counts.");
}

/** Gives a nation a small starting skyline on its 6x6 plate. */
async function seedCity(nationId: string, ownerId: string, slug: string): Promise<void> {
  const rng = makeRandom(slug.split("").reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 11));

  const { data: blueprints } = await supabase.from("blueprints").select("id,slug,default_accent");
  if (!blueprints || blueprints.length === 0) return;

  const buildingCount = 4 + Math.floor(rng() * 5);
  const taken = new Set<string>();

  for (let i = 0; i < buildingCount; i += 1) {
    const x = Math.floor(rng() * 6);
    const y = Math.floor(rng() * 6);
    const key = `${x}:${y}`;
    if (taken.has(key)) continue;
    taken.add(key);

    const { data: parcel } = await supabase
      .from("parcels")
      .upsert(
        { nation_id: nationId, owner_id: ownerId, grid_x: x, grid_y: y, zoning: "compute" },
        { onConflict: "nation_id,grid_x,grid_y" },
      )
      .select("id")
      .single();

    if (!parcel) continue;

    const blueprint = pick(blueprints, rng);
    const spec = BLUEPRINTS.find((b) => b.slug === blueprint.slug);

    await supabase.from("buildings").upsert(
      {
        parcel_id: parcel.id,
        blueprint_id: blueprint.id,
        owner_id: ownerId,
        level: 1 + Math.floor(rng() * Math.min(5, spec?.maxLevel ?? 5)),
        accent: blueprint.default_accent,
        state: "complete",
        progress: 1,
        window_density: 5 + Math.floor(rng() * 6),
      },
      { onConflict: "parcel_id" },
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
