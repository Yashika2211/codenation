import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Hero } from "@/components/landing/Hero";
import { TelemetryPanel } from "@/components/landing/TelemetryPanel";
import { PathSteps } from "@/components/landing/PathSteps";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { AtlasTeaser } from "@/components/landing/AtlasTeaser";
import { IntegritySection } from "@/components/landing/IntegritySection";
import { FinalCta } from "@/components/landing/FinalCta";
import { Panel } from "@/components/ui/Panel";
import { Kicker, SectionTitle } from "@/components/ui/Label";
import { Meter } from "@/components/ui/Meter";
import { RANKS } from "@/lib/progression/ranks";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getPlatformTelemetry } from "@/lib/queries/telemetry";
import { getTopNations } from "@/lib/queries/nations";
import { getCurrentProfile } from "@/lib/supabase/server";

/** Counts are read per request, so the portal never serves a stale metric. */
export const dynamic = "force-dynamic";

function LadderSection() {
  const top = RANKS[RANKS.length - 1]?.rep ?? 10000;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:py-28">
      <Kicker color={ACCENT_HEX.amber}>The ladder</Kicker>
      <SectionTitle className="mt-4 max-w-[24ch] !text-[26px] sm:!text-[32px]">
        Eleven ranks. Reputation is permanent and never spent.
      </SectionTitle>
      <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-muted">
        Resources are spent; reputation is not. It only ever gates what you are allowed to do, which
        is why it cannot be bought, traded or farmed away.
      </p>

      <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RANKS.map((rank) => (
          <li key={rank.slug}>
            <Panel
              className="h-full p-5"
              variant={rank.slug === "sovereign" ? "tinted" : "glass"}
              accent={rank.accent}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-text">
                  {rank.name}
                </h3>
                <span
                  className="font-mono text-[11px] font-bold tabular-nums"
                  style={{ color: ACCENT_HEX[rank.accent] }}
                >
                  {rank.rep.toLocaleString("en-US")}
                </span>
              </div>

              <Meter
                value={rank.rep / top}
                accent={rank.accent}
                height={3}
                className="mt-3"
                label={`${rank.name} threshold`}
              />

              <ul className="mt-4 space-y-[6px]">
                {rank.unlocks.map((unlock) => (
                  <li key={unlock} className="flex gap-[9px] text-[12.5px] leading-snug text-muted">
                    <span
                      aria-hidden
                      className="mt-[6px] block size-[4px] shrink-0 rotate-45 rounded-[1px]"
                      style={{ backgroundColor: ACCENT_HEX[rank.accent] }}
                    />
                    {unlock}
                  </li>
                ))}
              </ul>
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HomePage() {
  const [telemetry, nations, viewer] = await Promise.all([
    getPlatformTelemetry(),
    getTopNations(3),
    getCurrentProfile(),
  ]);

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

      <main className="pb-24 lg:pb-0">
        <Hero />

        <section className="mx-auto -mt-[220px] max-w-[1440px] px-4 sm:px-6 lg:-mt-[260px]">
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,34rem)] lg:items-end">
            <div className="hidden lg:block" />
            <TelemetryPanel telemetry={telemetry} />
          </div>
        </section>

        <PathSteps />
        <FeatureGrid />
        <LadderSection />
        <AtlasTeaser nations={nations} />
        <IntegritySection />
        <FinalCta />
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
