import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { Tag } from "@/components/ui/Tag";
import { IsoPlate } from "@/components/ui/IsoPlate";
import { Marker } from "@/components/ui/Marker";
import { Guestbook } from "@/components/world/Guestbook";
import { IconSpark, IconUsers } from "@/components/ui/Icon";
import { getNationView } from "@/lib/queries/world";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX, accentRgba } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const view = await getNationView(slug);
  if (!view) return { title: "Nation not found" };

  return {
    title: view.nation.name,
    description:
      view.nation.doctrine ??
      `Tier ${view.nation.tier} · ${view.nation.prestige.toLocaleString("en-US")} prestige on the CodeNation atlas.`,
  };
}

/** A flag rendered entirely in CSS, from the nation's accent and motif. */
function Flag({ accent, motif }: { accent: string; motif: string }) {
  return (
    <div
      className="relative h-[68px] w-[104px] shrink-0 overflow-hidden rounded-[10px] border"
      style={{
        borderColor: `${accent}55`,
        backgroundImage: `linear-gradient(140deg, ${accent}2e, rgb(6 7 13 / 0.9))`,
      }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 block size-[26px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px]"
        style={{
          border: `1.5px solid ${accent}`,
          boxShadow: `0 0 18px -3px ${accent}`,
          borderRadius: motif === "circuit" ? "2px" : "3px",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

export default async function NationPage({ params }: Params) {
  const { slug } = await params;
  const [view, viewer] = await Promise.all([getNationView(slug), getCurrentProfile()]);
  if (!view) notFound();

  const { nation, founder, tiles, citizens, buildingCount, guestbook, visitorCount } = view;
  const hex = ACCENT_HEX[nation.accent];

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

      <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        {nation.isSeed ? (
          <Panel variant="tinted" accent="amber" className="mb-6 flex items-center gap-3 px-5 py-4">
            <IconSpark size={17} className="shrink-0 text-amber" />
            <p className="text-[12.5px] text-muted">
              A seeded nation — synthetic sample data, excluded from every real count.
            </p>
          </Panel>
        ) : null}

        {/* ---- banner ---- */}
        <Panel
          variant="solid"
          className="relative overflow-hidden p-6 sm:p-8"
          sheen
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(620px 320px at 8% -30%, ${accentRgba(nation.accent, 0.22)}, transparent 62%)`,
            }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <Flag accent={hex} motif="diamond" />

            <div className="min-w-0 flex-1">
              <Kicker color={hex}>Sovereign nation</Kicker>
              <PageTitle className="mt-3">{nation.name}</PageTitle>

              {nation.doctrine ? (
                <p className="mt-3 max-w-[56ch] text-[14.5px] italic leading-relaxed text-muted">
                  &ldquo;{nation.doctrine}&rdquo;
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Tag accent={nation.accent}>tier {nation.tier}</Tag>
                {nation.countryCode ? (
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
                    {nation.countryCode}
                  </span>
                ) : null}
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ghost">
                  founded {new Date(nation.foundedAt).toISOString().slice(0, 10)}
                </span>
              </div>

              {founder ? (
                <Link
                  href={`/u/${founder.handle}`}
                  className="mt-5 inline-flex items-center gap-3 rounded-chip border border-line px-3 py-2 transition-colors hover:bg-glass"
                >
                  <Avatar seed={founder.avatarSeed} name={founder.displayName} size="xs" />
                  <span className="text-[13px] text-muted">
                    Founded by <span className="font-bold text-text">{founder.displayName}</span>
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </Panel>

        {/* ---- stats ---- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Prestige" value={nation.prestige} sub="decays 15% a season" accent={nation.accent} emphasis />
          <StatTile label="Tier" value={nation.tier} sub="of 5" />
          <StatTile label="Citizens" value={citizens.length} sub="registered here" />
          <StatTile label="Buildings" value={buildingCount} sub="standing" accent="flux" emphasis />
          <StatTile label="Visitors" value={visitorCount} sub="all time" accent="signal" emphasis />
        </div>

        {/* ---- plate + citizens ---- */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-start">
          <Panel variant="solid" className="relative overflow-hidden p-5 sm:p-8">
            {tiles.length === 0 ? (
              <div className="grid min-h-[380px] place-items-center text-center">
                <div className="max-w-[36ch]">
                  <SectionTitle>No skyline yet</SectionTitle>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
                    This nation holds land but has not raised anything on it.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Marker
                  kicker={`${buildingCount} standing`}
                  name={nation.name}
                  accent={nation.accent}
                  left="4%"
                  top="6%"
                />
                <div className="mx-auto max-w-[620px] py-4">
                  <IsoPlate size={6} tiles={tiles} />
                </div>
              </>
            )}
          </Panel>

          <aside className="space-y-4">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <Kicker>Citizens</Kicker>
                <IconUsers size={15} className="text-ghost" />
              </div>

              {citizens.length === 0 ? (
                <p className="mt-4 text-[12.5px] text-dim">No one has settled here yet.</p>
              ) : (
                <ul className="mt-4 space-y-[10px]">
                  {citizens.map((citizen) => (
                    <li key={citizen.handle}>
                      <Link
                        href={`/u/${citizen.handle}`}
                        className="flex items-center gap-3 rounded-chip px-1 py-1 transition-colors hover:bg-glass"
                      >
                        <Avatar seed={citizen.avatarSeed} name={citizen.displayName} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                          {citizen.displayName}
                        </span>
                        <span className="font-mono text-[10.5px] tabular-nums text-faint">
                          {citizen.reputation.toLocaleString("en-US")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Guestbook
              nationId={nation.id}
              nationSlug={nation.slug}
              entries={guestbook}
              canPost={Boolean(viewer)}
            />
          </aside>
        </div>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
