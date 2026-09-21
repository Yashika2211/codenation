import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { Meter } from "@/components/ui/Meter";
import { Tag } from "@/components/ui/Tag";
import { IsoPlate } from "@/components/ui/IsoPlate";
import { Marker } from "@/components/ui/Marker";
import { ButtonLink } from "@/components/ui/Button";
import { BuildPanel } from "@/components/world/BuildPanel";
import { IconArrowRight, IconClock, IconFlag } from "@/components/ui/Icon";
import { getCityView } from "@/lib/queries/world";
import { parcelAllowance } from "@/lib/world/allowance";
import { getSessionUser } from "@/lib/supabase/server";
import { rankFor, nextRankFor, rankProgress } from "@/lib/progression/ranks";
import { ACCENT_HEX } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City of Coders",
  description: "Your districts, your build queue, and the city feed.",
};

const GRID = 5;

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function etaLabel(eta: string | null): string {
  if (!eta) return "queued";
  const delta = new Date(eta).getTime() - Date.now();
  if (delta <= 0) return "finishing";
  const minutes = Math.ceil(delta / 60000);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.ceil(minutes / 60)}h left`;
}

export default async function CityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/city");

  const view = await getCityView(user.id);
  if (!view) redirect("/onboarding?next=/city");

  const { profile, wallet, tiles, parcels, queue, blueprints, nation, feed } = view;
  const rank = rankFor(profile.reputation);
  const next = nextRankFor(profile.reputation);
  const allowance = parcelAllowance(profile.reputation);

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

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-8 sm:px-6 lg:pb-12">
        <Kicker>City of Coders</Kicker>
        <PageTitle className="mt-3">
          {nation ? nation.name : `${profile.display_name}'s districts`}
        </PageTitle>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,17rem)_1fr_minmax(0,19rem)] lg:items-start">
          {/* ---- left rail ---- */}
          <aside className="space-y-4">
            <Panel variant="solid" className="p-5" sheen>
              <div className="flex items-center gap-3">
                <Avatar
                  seed={profile.avatar_seed}
                  name={profile.display_name}
                  size="lg"
                  ring={ACCENT_HEX[rank.accent]}
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-text">{profile.display_name}</p>
                  <p className="truncate font-mono text-[11.5px] text-dim">@{profile.handle}</p>
                  <Tag accent={rank.accent} className="mt-2">
                    {rank.name}
                  </Tag>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <Label>{next ? `To ${next.name}` : "Top rank"}</Label>
                  <span className="font-mono text-[11px] tabular-nums text-faint">
                    {profile.reputation.toLocaleString("en-US")}
                    {next ? ` / ${next.rep.toLocaleString("en-US")}` : ""}
                  </span>
                </div>
                <Meter
                  value={rankProgress(profile.reputation)}
                  accent={rank.accent}
                  label={next ? `Progress to ${next.name}` : "Maximum rank"}
                />
              </div>

              {nation ? (
                <Link
                  href={`/n/${nation.slug}`}
                  className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[13px] text-muted transition-colors hover:text-flux"
                >
                  <IconFlag size={14} />
                  {nation.name}
                  <IconArrowRight size={12} className="ml-auto" />
                </Link>
              ) : (
                <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-dim">
                  {profile.reputation >= 2500
                    ? "You can found a nation. Claim land first, then raise a flag."
                    : `Found a nation at 2,500 reputation — ${(2500 - profile.reputation).toLocaleString("en-US")} to go.`}
                </p>
              )}
            </Panel>

            <BuildPanel
              parcels={parcels}
              blueprints={blueprints}
              reputation={profile.reputation}
              allowance={allowance}
              gridSize={GRID}
            />

            <Panel className="p-5">
              <Label as="div">Daily contract</Label>
              <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
                Solve one problem you have not solved before. Resets 00:00 UTC.
              </p>
              <ButtonLink
                href="/arena"
                variant="outline"
                accent="signal"
                size="sm"
                className="mt-4"
                fullWidth
                icon={<IconArrowRight size={14} />}
              >
                Open the Arena
              </ButtonLink>
            </Panel>
          </aside>

          {/* ---- plate ---- */}
          <section>
            <Panel variant="solid" className="relative overflow-hidden p-5 sm:p-8">
              {tiles.length === 0 ? (
                <div className="grid min-h-[380px] place-items-center text-center">
                  <div className="max-w-[38ch]">
                    <SectionTitle>Nothing stands here yet</SectionTitle>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
                      Claim a parcel and raise your first structure. Every building draws upkeep in
                      compute every six hours — a city you do not maintain goes dormant.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Marker
                    kicker={`${tiles.length} structure${tiles.length === 1 ? "" : "s"}`}
                    name={nation ? nation.name : "Your districts"}
                    accent={nation?.accent ?? "flux"}
                    left="4%"
                    top="6%"
                  />
                  <div className="mx-auto max-w-[560px] py-4">
                    <IsoPlate size={GRID} tiles={tiles} />
                  </div>
                </>
              )}
            </Panel>

            {queue.length > 0 ? (
              <Panel className="mt-4 p-5">
                <div className="flex items-center justify-between">
                  <Kicker>Build queue</Kicker>
                  <Label>{queue.length} active</Label>
                </div>
                <ul className="mt-4 space-y-3">
                  {queue.map((item) => (
                    <li key={item.id}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] font-bold text-text">{item.name}</span>
                        <span className="inline-flex items-center gap-[6px] font-mono text-[10.5px] tabular-nums text-faint">
                          <IconClock size={11} />
                          {etaLabel(item.eta)}
                        </span>
                      </div>
                      <Meter value={item.progress} accent={item.accent} label={`${item.name} progress`} />
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </section>

          {/* ---- right rail ---- */}
          <aside className="space-y-4">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <Kicker>City feed</Kicker>
                <Tag accent="flux" live>
                  live
                </Tag>
              </div>

              {feed.length === 0 ? (
                <p className="mt-4 text-[12.5px] text-dim">
                  Nothing has happened yet. The feed fills as people solve, build and found.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {feed.map((event) => {
                    const title =
                      typeof event.payload.title === "string"
                        ? event.payload.title
                        : typeof event.payload.name === "string"
                          ? event.payload.name
                          : "";
                    return (
                      <li key={event.id} className="flex gap-[10px]">
                        <span
                          aria-hidden
                          className="mt-[7px] block size-[5px] shrink-0 rotate-45 rounded-[1px] bg-flux"
                        />
                        <p className="text-[12.5px] leading-relaxed text-muted">
                          <Link
                            href={`/u/${event.handle}`}
                            className="font-bold text-text hover:text-flux"
                          >
                            {event.handle}
                          </Link>{" "}
                          {event.verb} {title ? <span className="text-dim">{title}</span> : null}
                          <span className="ml-2 font-mono text-[10px] text-ghost">
                            {relativeTime(event.at)}
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel variant="tinted" accent="amber" className="p-5">
              <Kicker color="#F2B441">Upkeep</Kicker>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                Every standing building charges compute each six-hour cycle. If the wallet cannot
                cover it the building goes dormant — it is not destroyed, and it wakes as soon as
                you can pay.
              </p>
              <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                charged on read, not by a cron
              </p>
            </Panel>
          </aside>
        </div>
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
