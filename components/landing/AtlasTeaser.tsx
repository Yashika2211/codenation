import { Panel } from "@/components/ui/Panel";
import { Kicker, SectionTitle, Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { IsoPlate, type IsoTile } from "@/components/ui/IsoPlate";
import { ACCENT_HEX } from "@/lib/design/accents";
import { IconArrowRight, IconGlobe } from "@/components/ui/Icon";
import type { TopNation } from "@/lib/queries/nations";

/** A small decorative plate for the teaser's left half. Not a real city. */
const TEASER_TILES: IsoTile[] = [
  { x: 1, y: 0, building: { id: "t1", name: "Spire", level: 5, accent: "ion", state: "complete" } },
  { x: 2, y: 1, building: { id: "t2", name: "Vault", level: 3, accent: "flux", state: "complete" } },
  { x: 0, y: 2, building: { id: "t3", name: "Works", level: 2, accent: "signal", state: "complete" } },
  { x: 3, y: 2, building: { id: "t4", name: "Arch", level: 4, accent: "plasma", state: "complete" } },
  { x: 2, y: 3, building: { id: "t5", name: "Relay", level: 1, accent: "amber", state: "complete" } },
];

export function AtlasTeaser({ nations }: { nations: TopNation[] }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <Panel variant="solid" className="relative overflow-hidden p-6 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 cn-grid-overlay opacity-60 [mask-image:radial-gradient(420px_320px_at_50%_40%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-[420px] py-4">
            <IsoPlate size={4} tiles={TEASER_TILES} />
          </div>
        </Panel>

        <div>
          <Kicker color={ACCENT_HEX.ion}>The world atlas</Kicker>
          <SectionTitle className="mt-4 max-w-[20ch] !text-[26px] sm:!text-[32px]">
            Every nation holds a real position on one shared map
          </SectionTitle>
          <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
            A nation is placed from its founder&apos;s country code, projected onto an orbital map.
            Allied nations are joined by animated trade arcs. Prestige decays fifteen percent at
            every season rollover, so the top of the table is always contestable.
          </p>

          <div className="mt-8">
            <Label as="div">Leading nations</Label>
            {nations.length === 0 ? (
              <Panel className="mt-3 flex items-start gap-3 p-5">
                <IconGlobe size={19} className="mt-[2px] shrink-0 text-ghost" />
                <p className="text-[13px] leading-relaxed text-dim">
                  No nations founded yet. The first player to reach 2,500 reputation takes the first
                  position on the atlas — and this panel will show them, not a placeholder.
                </p>
              </Panel>
            ) : (
              <ol className="mt-3 space-y-2">
                {nations.map((nation, i) => (
                  <li key={nation.slug}>
                    <Panel className="flex items-center gap-4 px-4 py-[13px]">
                      <span className="font-mono text-[11px] tabular-nums text-ghost">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        aria-hidden
                        className="block size-[9px] rotate-45 rounded-[1px]"
                        style={{
                          backgroundColor: ACCENT_HEX[nation.accent],
                          boxShadow: `0 0 12px -1px ${ACCENT_HEX[nation.accent]}`,
                        }}
                      />
                      <span className="flex-1 truncate text-[14px] font-bold text-text">
                        {nation.name}
                      </span>
                      <Tag accent={nation.accent}>tier {nation.tier}</Tag>
                      <span className="font-mono text-[11px] tabular-nums text-dim">
                        {nation.prestige.toLocaleString("en-US")}
                      </span>
                    </Panel>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ButtonLink
            href="/atlas"
            variant="outline"
            accent="ion"
            className="mt-7"
            icon={<IconArrowRight size={15} />}
          >
            Open the atlas
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
