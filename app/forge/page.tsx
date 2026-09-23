import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { Meter } from "@/components/ui/Meter";
import { RarityTag, type Rarity } from "@/components/ui/Tag";
import { ButtonLink } from "@/components/ui/Button";
import { ForgeStudio, type ForgeDefinition } from "@/components/forge/ForgeStudio";
import { ForgedBuilding } from "@/components/forge/ForgedBuilding";
import { IconLock, IconArrowRight, IconAnvil } from "@/components/ui/Icon";
import { createServerSupabase, getSessionUser } from "@/lib/supabase/server";
import { FORGE_REP, rankFor } from "@/lib/progression/ranks";
import { ForgeParamsSchema, defaultParams } from "@/lib/forge/params";
import type { ForgeParams } from "@/lib/forge/params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Forge",
  description: "Craft parametric items at 3,000 reputation. Preview renders live as you build.",
};

/** Falls back to the defaults if a stored blob predates a schema change. */
function paramsOrDefault(value: unknown): ForgeParams {
  const parsed = ForgeParamsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultParams();
}

export default async function ForgePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/forge");

  const supabase = await createServerSupabase();
  if (!supabase) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding?next=/forge");

  const rank = rankFor(profile.reputation);
  const unlocked = profile.reputation >= FORGE_REP;

  const [walletResult, definitionResult, masteredResult, ownedResult] = await Promise.all([
    supabase.from("wallets").select("compute,data,alloy").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("item_definitions")
      .select("slug,name,kind,rarity,description,cost,requires_rep,requires_tech")
      .eq("craftable", true)
      .order("requires_rep", { ascending: true }),
    supabase.from("tech_progress").select("node_id").eq("user_id", user.id).eq("state", "mastered"),
    supabase
      .from("item_instances")
      .select("id,serial,params,seed,bound,forged_at,item_definitions(name,kind,rarity)")
      .eq("owner_id", user.id)
      .order("forged_at", { ascending: false })
      .limit(24),
  ]);

  const wallet = walletResult.data ?? { compute: 0, data: 0, alloy: 0 };
  const mastered = new Set((masteredResult.data ?? []).map((row) => row.node_id));

  const definitions: ForgeDefinition[] = (definitionResult.data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    rarity: row.rarity,
    description: row.description,
    cost: (row.cost ?? {}) as { compute?: number; data?: number; alloy?: number },
    requiresRep: row.requires_rep,
    techRequired: row.requires_tech.length,
    techMastered: row.requires_tech.every((id) => mastered.has(id)),
  }));

  type OwnedJoin = {
    id: string;
    serial: number;
    params: unknown;
    seed: string;
    bound: boolean;
    forged_at: string;
    item_definitions: { name: string; kind: string; rarity: Rarity } | null;
  };

  const owned = ((ownedResult.data ?? []) as unknown as OwnedJoin[]).filter(
    (row) => row.item_definitions !== null,
  );

  return (
    <Atmosphere>
      <TopNav
        user={{
          handle: profile.handle,
          displayName: profile.display_name,
          avatarSeed: profile.avatar_seed,
        }}
        wallet={wallet}
        reputation={profile.reputation}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker color="#E84FA8">The Forge</Kicker>
        <PageTitle className="mt-3">Make something only you have</PageTitle>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-muted">
          Pick a base, set its silhouette, facade, crown and palette, and watch it render as you
          move each control. Every craft carries a real serial — &ldquo;Spire #007&rdquo; is a
          checkable claim, not a label.
        </p>

        {!unlocked ? (
          <Panel variant="solid" className="mt-10 p-8 sm:p-10" sheen>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 rounded-chip border border-line bg-glass-hi px-[13px] py-[7px]">
                  <IconLock size={14} className="text-amber" />
                  <Label>Locked</Label>
                </span>

                <SectionTitle className="mt-5 !text-[24px]">
                  The Forge opens at Sovereign
                </SectionTitle>
                <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-muted">
                  Three thousand reputation. You are {rank.name} with{" "}
                  {profile.reputation.toLocaleString("en-US")} — another{" "}
                  <span className="font-mono text-flux">
                    {(FORGE_REP - profile.reputation).toLocaleString("en-US")}
                  </span>{" "}
                  to go.
                </p>

                <div className="mt-7 max-w-[420px]">
                  <div className="mb-2 flex items-baseline justify-between">
                    <Label>Progress to the Forge</Label>
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {profile.reputation.toLocaleString("en-US")} /{" "}
                      {FORGE_REP.toLocaleString("en-US")}
                    </span>
                  </div>
                  <Meter
                    value={profile.reputation / FORGE_REP}
                    accent="plasma"
                    label="Progress to the Forge"
                  />
                </div>

                <ButtonLink
                  href="/arena"
                  accent="plasma"
                  className="mt-7"
                  icon={<IconArrowRight size={15} />}
                >
                  Earn reputation in the Arena
                </ButtonLink>
              </div>

              {/* A preview of what waits, rendered by the real component. */}
              <div className="relative grid min-h-[280px] flex-1 place-items-end justify-center pb-6 opacity-50">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 cn-grid-overlay opacity-40 [mask-image:radial-gradient(280px_220px_at_50%_60%,black,transparent)]"
                />
                <ForgedBuilding
                  params={{
                    ...defaultParams(),
                    silhouette: "helix",
                    facade: "faceted",
                    crown: "halo",
                    emissiveIntensity: 0.7,
                    palette: { base: "#1A0512", accent: "#E84FA8", emissive: "#FF7AC4" },
                  }}
                  height={180}
                />
              </div>
            </div>
          </Panel>
        ) : (
          <div className="mt-10">
            <ForgeStudio definitions={definitions} reputation={profile.reputation} wallet={wallet} />
          </div>
        )}

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>Your forge</SectionTitle>
            <Label>
              {owned.length} item{owned.length === 1 ? "" : "s"}
            </Label>
          </div>

          {owned.length === 0 ? (
            <Panel className="mt-4 flex items-center gap-4 p-6">
              <IconAnvil size={20} className="shrink-0 text-ghost" />
              <p className="text-[13px] leading-relaxed text-dim">
                Nothing forged yet. Everything you craft appears here, and in your nation and on
                your profile, rendered by the same component.
              </p>
            </Panel>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {owned.map((item) => (
                <Panel key={item.id} className="p-5">
                  <div className="grid min-h-[150px] place-items-end justify-center pb-3">
                    <ForgedBuilding params={paramsOrDefault(item.params)} height={110} />
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2 border-t border-line pt-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">
                        {item.item_definitions?.name}
                      </p>
                      <p className="mt-1 font-mono text-[11px] tabular-nums text-flux">
                        #{String(item.serial).padStart(3, "0")}
                      </p>
                    </div>
                    <RarityTag rarity={item.item_definitions?.rarity ?? "common"} />
                  </div>

                  <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                    {item.bound ? "bound" : "tradeable"} ·{" "}
                    {new Date(item.forged_at).toISOString().slice(0, 10)}
                  </p>
                </Panel>
              ))}
            </div>
          )}
        </section>

        <Panel variant="tinted" accent="signal" className="mt-8 p-5">
          <Label as="div">How rarity works</Label>
          <p className="mt-2 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
            Rarity gates which parameter ranges are available and multiplies the cost — 1, 2.5, 6,
            15 and 40 from common to mythic. A mythic craft additionally needs 10,000 reputation and
            is limited to one per player per season, enforced by a unique index rather than a check
            in code, so two simultaneous crafts cannot both slip through.
          </p>
          <Link
            href="/tech"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-signal transition-colors hover:text-text"
          >
            Research unlocks more parameters
            <IconArrowRight size={12} />
          </Link>
        </Panel>
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
