import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { Tag } from "@/components/ui/Tag";
import { Markdown } from "@/components/ui/Markdown";
import { AllianceChat } from "@/components/alliance/AllianceChat";
import { Exchange } from "@/components/alliance/Exchange";
import { IconUsers, IconArrowRight } from "@/components/ui/Icon";
import { getAlliance } from "@/lib/queries/alliance";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX, accentRgba } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const alliance = await getAlliance(slug);
  if (!alliance) return { title: "Alliance not found" };

  return {
    title: alliance.name,
    description: `Tier ${alliance.tier} alliance · ${alliance.members.length} nations · ${alliance.totalPrestige.toLocaleString("en-US")} combined prestige.`,
  };
}

export default async function AlliancePage({ params }: Params) {
  const { slug } = await params;
  const [alliance, viewer] = await Promise.all([getAlliance(slug), getCurrentProfile()]);
  if (!alliance) notFound();

  const hex = ACCENT_HEX[alliance.accent];
  const isMember = alliance.viewerNation !== null;

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
        {/* banner */}
        <Panel variant="solid" className="relative overflow-hidden p-6 sm:p-8" sheen>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(680px 340px at 12% -30%, ${accentRgba(alliance.accent, 0.24)}, transparent 62%)`,
            }}
          />
          <div className="relative">
            <Kicker color={hex}>Alliance</Kicker>
            <PageTitle className="mt-3">{alliance.name}</PageTitle>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Tag accent={alliance.accent}>tier {alliance.tier}</Tag>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ghost">
                founded {alliance.foundedAt.slice(0, 10)}
              </span>
              {isMember ? (
                <Tag accent="flux">your alliance — {alliance.viewerNation?.role}</Tag>
              ) : null}
            </div>
          </div>
        </Panel>

        {/* stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Member nations"
            value={alliance.members.length}
            sub="bound by charter"
            accent={alliance.accent}
            emphasis
          />
          <StatTile
            label="Combined prestige"
            value={alliance.totalPrestige}
            sub="across all members"
            accent="amber"
            emphasis
          />
          <StatTile
            label="Open offers"
            value={alliance.trades.filter((t) => t.state === "open").length}
            sub="on the exchange"
            accent="signal"
            emphasis
          />
          <StatTile
            label="Treasury"
            value={Object.values(alliance.treasury).reduce((a, b) => a + b, 0)}
            sub={
              Object.keys(alliance.treasury).length === 0
                ? "nothing pooled yet"
                : Object.keys(alliance.treasury).join(", ")
            }
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
          <div className="space-y-6">
            {/* charter */}
            {alliance.charter ? (
              <Panel className="p-6">
                <Kicker>Charter</Kicker>
                <div className="mt-4 max-w-[70ch]">
                  <Markdown content={alliance.charter} />
                </div>
              </Panel>
            ) : null}

            {/* members */}
            <section>
              <div className="flex items-center justify-between gap-4">
                <SectionTitle>Member nations</SectionTitle>
                <IconUsers size={16} className="text-ghost" />
              </div>

              {alliance.members.length === 0 ? (
                <Panel className="mt-4 p-6">
                  <p className="text-[13px] text-dim">No nations have joined yet.</p>
                </Panel>
              ) : (
                <ul className="mt-4 space-y-2">
                  {alliance.members.map((member) => (
                    <li key={member.nationSlug}>
                      <Link href={`/n/${member.nationSlug}`} className="block">
                        <Panel className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[13px] transition-colors hover:bg-glass-hi">
                          <span
                            aria-hidden
                            className="block size-[9px] rotate-45 rounded-[1px]"
                            style={{
                              backgroundColor: ACCENT_HEX[member.accent],
                              boxShadow: `0 0 12px -1px ${ACCENT_HEX[member.accent]}`,
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">
                            {member.nationName}
                          </span>
                          <Tag accent={member.role === "speaker" ? "amber" : member.accent}>
                            {member.role}
                          </Tag>
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                            tier {member.tier}
                          </span>
                          <span className="font-mono text-[11.5px] tabular-nums text-muted">
                            {member.prestige.toLocaleString("en-US")}
                          </span>
                        </Panel>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* exchange */}
            <section>
              <SectionTitle>Resource exchange</SectionTitle>
              <div className="mt-4">
                <Exchange
                  allianceSlug={alliance.slug}
                  trades={alliance.trades}
                  canTrade={isMember}
                  viewerNationSlug={alliance.viewerNation?.slug ?? null}
                />
              </div>
            </section>
          </div>

          {/* rail */}
          <aside className="space-y-4 lg:sticky lg:top-[80px]">
            <AllianceChat
              allianceId={alliance.id}
              me={
                viewer
                  ? {
                      handle: viewer.handle,
                      displayName: viewer.display_name,
                      avatarSeed: viewer.avatar_seed,
                    }
                  : null
              }
              canPost={isMember}
            />

            <Panel variant="tinted" accent={alliance.accent} className="p-5">
              <Label as="div">Diplomacy</Label>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Member nations are joined by animated trade arcs on the world atlas. Every settled
                trade moves resources through the same append-only ledger as a solve.
              </p>
              <Link
                href="/atlas"
                className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-flux transition-colors hover:text-text"
              >
                See it on the atlas
                <IconArrowRight size={12} />
              </Link>
            </Panel>
          </aside>
        </div>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
