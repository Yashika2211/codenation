import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Kicker, PageTitle, SectionTitle, Label } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { IconUsers, IconArrowRight } from "@/components/ui/Icon";
import { listAlliances } from "@/lib/queries/alliance";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX } from "@/lib/design/accents";
import { hasRank } from "@/lib/progression/ranks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alliances",
  description: "Shared treasuries, trade routes and diplomacy between nations.",
};

export default async function GuildIndexPage() {
  const [alliances, viewer] = await Promise.all([listAlliances(), getCurrentProfile()]);
  const eligible = viewer ? hasRank(viewer.reputation, "luminary") : false;

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

      <main className="mx-auto max-w-[1100px] px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
        <Kicker color={ACCENT_HEX.ion}>Alliances</Kicker>
        <PageTitle className="mt-3">Nations that act together</PageTitle>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          An alliance pools a treasury, opens trade routes between its members, and draws the arcs
          you see on the world atlas. Founding one opens at Luminary — 5,000 reputation.
        </p>

        {viewer ? (
          <Panel
            variant="tinted"
            accent={eligible ? "flux" : "signal"}
            className="mt-8 px-5 py-4"
          >
            <Label as="p">
              {eligible
                ? "You can found an alliance. Your nation becomes its first speaker."
                : `Founding opens at 5,000 reputation — you have ${viewer.reputation.toLocaleString("en-US")}.`}
            </Label>
          </Panel>
        ) : null}

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>All alliances</SectionTitle>
            <Label>{alliances.length}</Label>
          </div>

          {alliances.length === 0 ? (
            <Panel className="mt-4 p-10 text-center">
              <IconUsers size={24} className="mx-auto text-ghost" />
              <p className="mx-auto mt-4 max-w-[48ch] text-[13.5px] leading-relaxed text-dim">
                No alliances exist yet. The first requires a founder at 5,000 reputation with a
                nation already standing.
              </p>
              <Link
                href="/atlas"
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-flux transition-colors hover:text-text"
              >
                See the nations that exist
                <IconArrowRight size={12} />
              </Link>
            </Panel>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alliances.map((alliance) => (
                <Link key={alliance.slug} href={`/guild/${alliance.slug}`} className="block">
                  <Panel className="h-full p-5 transition-colors hover:bg-glass-hi">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        aria-hidden
                        className="block size-[10px] rotate-45 rounded-[1px]"
                        style={{
                          backgroundColor: ACCENT_HEX[alliance.accent],
                          boxShadow: `0 0 14px -1px ${ACCENT_HEX[alliance.accent]}`,
                        }}
                      />
                      <Tag accent={alliance.accent}>tier {alliance.tier}</Tag>
                    </div>

                    <h3 className="mt-4 font-display text-[18px] font-extrabold tracking-[-0.025em] text-text">
                      {alliance.name}
                    </h3>

                    <p className="mt-3 border-t border-line pt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                      {alliance.members} nation{alliance.members === 1 ? "" : "s"} · founded{" "}
                      {alliance.foundedAt.slice(0, 10)}
                    </p>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
