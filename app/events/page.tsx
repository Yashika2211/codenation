import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { StatTile } from "@/components/ui/StatTile";
import { Markdown } from "@/components/ui/Markdown";
import { Countdown } from "@/components/events/Countdown";
import { Bracket } from "@/components/events/Bracket";
import { IconSpark, IconArrowRight } from "@/components/ui/Icon";
import { getEventsView, type EventView } from "@/lib/queries/events";
import { getCurrentProfile } from "@/lib/supabase/server";
import { ACCENT_HEX, accentRgba } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "Hackathons, tracks, finals brackets and leaderboards.",
};

const STATE_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  judging: "In judging",
  finished: "Finished",
};

function EventCard({ event }: { event: EventView }) {
  return (
    <Link href={`/events#${event.slug}`} className="block">
      <Panel className="h-full p-5 transition-colors hover:bg-glass-hi">
        <div className="flex items-center justify-between gap-3">
          <Tag accent={event.accent}>{STATE_LABEL[event.state] ?? event.state}</Tag>
          <span className="font-mono text-[10px] tabular-nums text-ghost">
            {event.startsAt.slice(0, 10)}
          </span>
        </div>
        <h3 className="mt-4 font-display text-[18px] font-extrabold tracking-[-0.025em] text-text">
          {event.name}
        </h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{event.tagline}</p>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
          {event.entrants} entrant{event.entrants === 1 ? "" : "s"} · {event.tracks.length} track
          {event.tracks.length === 1 ? "" : "s"}
        </p>
      </Panel>
    </Link>
  );
}

export default async function EventsPage() {
  const viewer = await getCurrentProfile();
  const view = await getEventsView(viewer?.id ?? null);
  const { featured, upcoming, past, bracket, leaderboard } = view;

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
        <Kicker color={ACCENT_HEX.plasma}>Events</Kicker>
        <PageTitle className="mt-3">Hackathons and world events</PageTitle>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Placements mint compute, alloy and reputation by bracket — 120 reputation for reaching a
          final. Everything on this page is a direct read; an empty schedule shows an empty page.
        </p>

        {!featured ? (
          <Panel className="mt-10 p-10 text-center">
            <IconSpark size={26} className="mx-auto text-ghost" />
            <SectionTitle className="mt-5">No events scheduled</SectionTitle>
            <p className="mx-auto mt-3 max-w-[48ch] text-[13.5px] leading-relaxed text-dim">
              Nothing is running and nothing is scheduled. When an event is created it appears here
              with a real countdown — not a placeholder date.
            </p>
            <Link
              href="/arena"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-flux transition-colors hover:text-text"
            >
              Practise in the Arena
              <IconArrowRight size={12} />
            </Link>
          </Panel>
        ) : (
          <>
            {/* featured */}
            <Panel
              id={featured.slug}
              variant="solid"
              className="relative mt-8 overflow-hidden p-6 sm:p-8"
              sheen
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(680px 340px at 10% -30%, ${accentRgba(featured.accent, 0.22)}, transparent 62%)`,
                }}
              />

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <Tag accent={featured.accent} live={featured.state === "live"}>
                    {STATE_LABEL[featured.state] ?? featured.state}
                  </Tag>
                  {featured.isSeed ? (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ghost">
                      seeded sample
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[36px]">
                  {featured.name}
                </h2>
                <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-muted">
                  {featured.tagline}
                </p>

                <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-6">
                  <Countdown
                    target={featured.state === "live" ? featured.endsAt : featured.startsAt}
                    label={featured.state === "live" ? "Closes in" : "Opens in"}
                  />

                  <div>
                    <Label as="div">Entrants</Label>
                    <p className="mt-2 font-display text-[26px] font-extrabold leading-none tabular-nums tracking-[-0.03em] sm:text-[30px]">
                      {featured.entrants}
                    </p>
                  </div>

                  {Object.keys(featured.prize).length > 0 ? (
                    <div>
                      <Label as="div">Prize pool</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(featured.prize).map(([resource, amount]) => (
                          <Tag key={resource} accent={featured.accent}>
                            {amount.toLocaleString("en-US")} {resource}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {featured.description ? (
                  <div className="mt-8 max-w-[70ch] border-t border-line pt-6">
                    <Markdown content={featured.description} />
                  </div>
                ) : null}
              </div>
            </Panel>

            {/* tracks */}
            {featured.tracks.length > 0 ? (
              <section className="mt-10">
                <SectionTitle>Tracks</SectionTitle>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.tracks.map((track) => (
                    <Panel key={track.slug} variant="tinted" accent={track.accent} className="p-5">
                      <h3 className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-text">
                        {track.name}
                      </h3>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                        {track.description}
                      </p>
                    </Panel>
                  ))}
                </div>
              </section>
            ) : null}

            {/* bracket */}
            <section className="mt-10">
              <SectionTitle>Finals bracket</SectionTitle>
              <Panel className="mt-4 p-5">
                <Bracket matches={bracket} />
              </Panel>
            </section>

            {/* leaderboard */}
            <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-start">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <SectionTitle>Leaderboard</SectionTitle>
                  <Label>{leaderboard.length} ranked</Label>
                </div>

                {leaderboard.length === 0 ? (
                  <Panel className="mt-4 p-6">
                    <p className="text-[13px] text-dim">
                      No entries scored yet. The board fills as submissions are judged.
                    </p>
                  </Panel>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {leaderboard.map((row, index) => (
                      <li key={row.handle}>
                        <Link href={`/u/${row.handle}`} className="block">
                          <Panel className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-[13px] transition-colors hover:bg-glass-hi">
                            <span className="w-[22px] font-mono text-[11px] tabular-nums text-ghost">
                              {String(row.placement ?? index + 1).padStart(2, "0")}
                            </span>
                            <Avatar seed={row.avatarSeed} name={row.displayName} size="xs" />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-text">
                              {row.displayName}
                            </span>
                            {row.isSeed ? (
                              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ghost">
                                seed
                              </span>
                            ) : null}
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                              {row.track}
                            </span>
                            {row.bracket !== "participant" ? (
                              <Tag accent="amber">{row.bracket.replace(/_/g, " ")}</Tag>
                            ) : null}
                            <span className="font-mono text-[11.5px] tabular-nums text-muted">
                              {row.score.toLocaleString("en-US")}
                            </span>
                          </Panel>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <aside className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <StatTile
                    label="Reaching a final"
                    value="+120"
                    sub="reputation"
                    accent="plasma"
                    emphasis
                  />
                  <StatTile label="Winning" value="+220" sub="reputation and alloy" accent="amber" emphasis />
                </div>

                <Panel variant="tinted" accent="signal" className="p-5">
                  <Label as="div">Badge progress</Label>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    Event placements feed the same badge engine as everything else — the rules are
                    JSON predicates evaluated against your metrics when a grant lands.
                  </p>
                  <Link
                    href={viewer ? `/u/${viewer.handle}` : "/signin"}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-signal transition-colors hover:text-text"
                  >
                    See your badges
                    <IconArrowRight size={12} />
                  </Link>
                </Panel>
              </aside>
            </section>

            {upcoming.length > 0 ? (
              <section className="mt-12">
                <SectionTitle>Also scheduled</SectionTitle>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ) : null}

            {past.length > 0 ? (
              <section className="mt-12">
                <SectionTitle>Past events</SectionTitle>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
