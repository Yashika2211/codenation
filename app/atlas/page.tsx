import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { StatTile } from "@/components/ui/StatTile";
import { AtlasMap } from "@/components/world/AtlasMap";
import { IconGlobe, IconArrowRight } from "@/components/ui/Icon";
import { getAtlasView } from "@/lib/queries/atlas";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX, ACCENTS } from "@/lib/design/accents";
import { PRESTIGE_DECAY } from "@/lib/economy/rules";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "World atlas",
  description: "Every nation, placed by its founder's country and ranked by prestige.",
};

export default async function AtlasPage() {
  const [view, viewer] = await Promise.all([getAtlasView(), getCurrentProfile()]);
  const { nations, routes } = view;

  const real = nations.filter((n) => !n.isSeed);
  const totalCitizens = nations.reduce((sum, n) => sum + n.citizens, 0);
  const totalBuildings = nations.reduce((sum, n) => sum + n.buildings, 0);

  return (
    <Atmosphere>
      <TopNav
        user={
          viewer
            ? {
                handle: viewer.handle,
                displayName: viewer.display_name,
                avatarSeed: viewer.avatar_seed,
              }
            : null
        }
        reputation={viewer?.reputation}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker color={ACCENT_HEX.ion}>World atlas</Kicker>
        <PageTitle className="mt-3">One map, every nation</PageTitle>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          A nation&apos;s position comes from its founder&apos;s country code, projected onto the
          orbital plane. Marker size follows prestige, which decays{" "}
          {Math.round(PRESTIGE_DECAY * 100)}% at every season rollover — so the top of the table is
          always contestable.
        </p>

        {nations.length === 0 ? (
          <Panel className="mt-10 p-10 text-center">
            <IconGlobe size={28} className="mx-auto text-ghost" />
            <SectionTitle className="mt-5">The map is empty</SectionTitle>
            <p className="mx-auto mt-3 max-w-[48ch] text-[13.5px] leading-relaxed text-dim">
              No nations have been founded. The first player to reach 2,500 reputation takes the
              first position here — and this page will show them, not a placeholder.
            </p>
            <Link
              href="/arena"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-flux transition-colors hover:text-text"
            >
              Start earning reputation
              <IconArrowRight size={12} />
            </Link>
          </Panel>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Nations"
                value={nations.length}
                sub={real.length === nations.length ? "all founded by players" : `${real.length} founded by players`}
                accent="ion"
                emphasis
              />
              <StatTile label="Citizens placed" value={totalCitizens} sub="across every nation" />
              <StatTile label="Parcels held" value={totalBuildings} sub="claimed land" accent="flux" emphasis />
              <StatTile
                label="Trade routes"
                value={routes.length}
                sub={routes.length === 0 ? "alliances open at 5,000 rep" : "between allied nations"}
                accent="signal"
                emphasis
              />
            </div>

            <Panel variant="solid" className="mt-6 overflow-hidden p-4 sm:p-6">
              <AtlasMap nations={nations} routes={routes} />
            </Panel>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-start">
              {/* ranked table */}
              <Panel className="p-5">
                <div className="flex items-center justify-between">
                  <Kicker>Ranked by prestige</Kicker>
                  <Label>{nations.length} total</Label>
                </div>

                <ol className="mt-4 space-y-2">
                  {nations.map((nation, index) => (
                    <li key={nation.id}>
                      <Link href={`/n/${nation.slug}`} className="block">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-glass px-4 py-[13px] transition-colors hover:bg-glass-hi">
                          <span className="w-[22px] font-mono text-[11px] tabular-nums text-ghost">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            aria-hidden
                            className="block size-[9px] rotate-45 rounded-[1px]"
                            style={{
                              backgroundColor: ACCENT_HEX[nation.accent],
                              boxShadow: `0 0 12px -1px ${ACCENT_HEX[nation.accent]}`,
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">
                            {nation.name}
                          </span>
                          {nation.isSeed ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ghost">
                              seed
                            </span>
                          ) : null}
                          {nation.countryCode ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                              {nation.countryCode}
                            </span>
                          ) : null}
                          <Tag accent={nation.accent}>tier {nation.tier}</Tag>
                          <span className="font-mono text-[11.5px] tabular-nums text-muted">
                            {nation.prestige.toLocaleString("en-US")}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Panel>

              {/* legend + diplomacy */}
              <aside className="space-y-4">
                <Panel className="p-5">
                  <Kicker>Legend</Kicker>
                  <ul className="mt-4 space-y-[10px]">
                    {ACCENTS.map((accent) => (
                      <li key={accent} className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="block size-[9px] rotate-45 rounded-[1px]"
                          style={{ backgroundColor: ACCENT_HEX[accent] }}
                        />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
                          {accent}
                        </span>
                        <span className="ml-auto font-mono text-[10.5px] tabular-nums text-ghost">
                          {nations.filter((n) => n.accent === accent).length}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 space-y-2 border-t border-line pt-4">
                    <p className="text-[12px] leading-relaxed text-dim">
                      Marker size follows prestige. Dashed arcs join nations in the same alliance.
                    </p>
                  </div>
                </Panel>

                <Panel variant="tinted" accent="ion" className="p-5">
                  <Kicker color={ACCENT_HEX.ion}>Diplomacy</Kicker>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                    Alliances open at Luminary, 5,000 reputation. They unlock a shared treasury and
                    the trade routes drawn on this map.
                  </p>
                  {routes.length === 0 ? (
                    <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                      no alliances formed yet
                    </p>
                  ) : null}
                </Panel>
              </aside>
            </div>
          </>
        )}
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
