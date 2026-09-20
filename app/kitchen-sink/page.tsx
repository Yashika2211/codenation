import type { Metadata } from "next";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Panel } from "@/components/ui/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Label, Kicker, SectionTitle, PageTitle } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { Meter } from "@/components/ui/Meter";
import { Tag, DifficultyTag, RarityTag } from "@/components/ui/Tag";
import { ResourceChip } from "@/components/ui/ResourceChip";
import { Avatar } from "@/components/ui/Avatar";
import { IsoPlate, type IsoTile } from "@/components/ui/IsoPlate";
import { Marker } from "@/components/ui/Marker";
import { Heatmap, type HeatDay } from "@/components/ui/Heatmap";
import { SkillRadar } from "@/components/ui/SkillRadar";
import { ACCENTS } from "@/lib/design/accents";
import { IconArrowRight, IconTerminal, IconGithub, IconShield } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Kitchen sink",
  description: "Every CodeNation primitive on one page.",
  robots: { index: false, follow: false },
};

/** Deterministic demo plate — no database yet, but no hardcoded skyline either. */
const DEMO_TILES: IsoTile[] = [
  { x: 0, y: 1, building: { id: "a", name: "Compute Spire", level: 4, accent: "flux", state: "complete" } },
  { x: 1, y: 1, building: { id: "b", name: "Data Vault", level: 2, accent: "signal", state: "complete", windowDensity: 5 } },
  { x: 2, y: 0, building: { id: "c", name: "Ion Lattice", level: 6, accent: "ion", state: "complete" } },
  { x: 3, y: 2, building: { id: "d", name: "Alloy Works", level: 3, accent: "amber", state: "building" } },
  { x: 1, y: 3, building: { id: "e", name: "Plasma Arch", level: 5, accent: "plasma", state: "complete", windowDensity: 9 } },
  { x: 4, y: 3, building: { id: "f", name: "Relay Post", level: 1, accent: "flux", state: "queued" } },
  { x: 2, y: 4, building: { id: "g", name: "Dormant Mill", level: 2, accent: "signal", state: "dormant" } },
];

function demoHeatDays(): HeatDay[] {
  const days: HeatDay[] = [];
  const today = new Date();
  for (let i = 0; i < 371; i += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    // Deterministic pseudo-noise so the page renders identically on every build.
    const n = (i * 2654435761) % 97;
    const count = n < 34 ? 0 : Math.floor((n - 34) / 7);
    days.push({ date: d.toISOString().slice(0, 10), count });
  }
  return days;
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <Kicker>{title}</Kicker>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function KitchenSinkPage() {
  return (
    <Atmosphere>
      <TopNav
        user={{ handle: "ada", displayName: "Ada Lovelace", avatarSeed: "ada-seed" }}
        wallet={{ compute: 48200, data: 7340, alloy: 912 }}
        reputation={3120}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-28 pt-12 sm:px-6 lg:pb-20">
        <Kicker>Design system</Kicker>
        <PageTitle className="mt-4">Kitchen sink</PageTitle>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          Every primitive in <code className="text-[13px] text-flux">components/ui/</code>, rendered
          once. If a screen needs something that is not on this page, it belongs here first.
        </p>

        <div className="mt-12 space-y-12">
          <Row title="Accents">
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((accent) => (
                <Panel key={accent} variant="tinted" accent={accent} className="px-4 py-3">
                  <Label as="div">{accent}</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Tag accent={accent}>outline</Tag>
                    <Tag accent={accent} solid>
                      solid
                    </Tag>
                  </div>
                </Panel>
              ))}
            </div>
          </Row>

          <Row title="Buttons">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<IconTerminal size={15} />}>
                Run samples
              </Button>
              <Button variant="outline" accent="ion">
                Research node
              </Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Withdraw</Button>
              <Button variant="primary" accent="amber" size="lg">
                Forge item
              </Button>
              <Button variant="primary" size="sm" disabled>
                Locked
              </Button>
              <ButtonLink href="/" variant="outline" icon={<IconArrowRight size={15} />}>
                Landing
              </ButtonLink>
              <ButtonLink
                href="https://github.com"
                external
                variant="ghost"
                icon={<IconGithub size={15} />}
              >
                GitHub
              </ButtonLink>
            </div>
          </Row>

          <Row title="Panels">
            <div className="grid gap-4 sm:grid-cols-3">
              <Panel className="p-5" sheen>
                <SectionTitle>Glass</SectionTitle>
                <p className="mt-2 text-[13.5px] text-muted">The default surface.</p>
              </Panel>
              <Panel variant="solid" className="p-5">
                <SectionTitle>Solid</SectionTitle>
                <p className="mt-2 text-[13.5px] text-muted">For dense data regions.</p>
              </Panel>
              <Panel variant="tinted" accent="plasma" className="p-5">
                <SectionTitle>Tinted</SectionTitle>
                <p className="mt-2 text-[13.5px] text-muted">Carries live state.</p>
              </Panel>
            </div>
          </Row>

          <Row title="Chips, tags and avatars">
            <div className="flex flex-wrap items-center gap-3">
              <ResourceChip resource="compute" value={48200} />
              <ResourceChip resource="data" value={7340} />
              <ResourceChip resource="alloy" value={912} />
              <ResourceChip resource="rep" value={3120} />
              <ResourceChip resource="compute" value={1240000} compact />
              <DifficultyTag difficulty="easy" />
              <DifficultyTag difficulty="medium" />
              <DifficultyTag difficulty="hard" />
              <DifficultyTag difficulty="expert" />
              <RarityTag rarity="common" />
              <RarityTag rarity="rare" />
              <RarityTag rarity="epic" />
              <RarityTag rarity="legendary" />
              <RarityTag rarity="mythic" />
              <Tag accent="signal" live>
                duel live
              </Tag>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-4">
              <Avatar seed="ada-seed" name="Ada Lovelace" size="xs" />
              <Avatar seed="grace-seed" name="Grace Hopper" size="sm" />
              <Avatar seed="alan-seed" name="Alan Turing" size="md" />
              <Avatar seed="katherine-seed" name="Katherine Johnson" size="lg" />
              <Avatar seed="margaret-seed" name="Margaret Hamilton" size="xl" ring="#3BE8B0" />
            </div>
          </Row>

          <Row title="Stats and meters">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Reputation" value={3120} sub="Sovereign — Forge unlocked" emphasis />
              <StatTile label="Arena rating" value={1684} sub="+32 last duel" accent="signal" emphasis />
              <StatTile label="Problems solved" value={214} sub="of 1,208 public" />
              <StatTile label="Prestige" value="14.2k" sub="rank 7 worldwide" accent="amber" emphasis />
            </div>
            <div className="mt-6 max-w-[420px] space-y-4">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <Label>To Magistrate</Label>
                  <span className="font-mono text-[11px] tabular-nums text-faint">3,120 / 4,000</span>
                </div>
                <Meter value={3120 / 4000} label="Progress to Magistrate" />
              </div>
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <Label>Research: Lattice Theory</Label>
                  <span className="font-mono text-[11px] tabular-nums text-faint">62%</span>
                </div>
                <Meter value={0.62} accent="ion" label="Research progress" />
              </div>
            </div>
          </Row>

          <Row title="IsoPlate">
            <Panel className="relative overflow-hidden p-6 sm:p-10">
              <Marker kicker="District 01" name="Compute Row" left="4%" top="10%" />
              <Marker kicker="District 02" name="Ion Quarter" accent="ion" left="62%" top="6%" delay={1.2} />
              <Marker
                kicker="Under construction"
                name="Alloy Works"
                accent="amber"
                left="55%"
                top="72%"
                delay={2.4}
              />
              <div className="mx-auto max-w-[520px] py-6">
                <IsoPlate size={5} tiles={DEMO_TILES} />
              </div>
            </Panel>
          </Row>

          <Row title="Heatmap and radar">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <Panel className="p-5">
                <Label as="div">Contribution activity</Label>
                <div className="mt-4">
                  <Heatmap days={demoHeatDays()} />
                </div>
              </Panel>
              <Panel className="grid place-items-center p-5">
                <SkillRadar
                  axes={[
                    { label: "graphs", value: 0.86 },
                    { label: "dp", value: 0.64 },
                    { label: "strings", value: 0.48 },
                    { label: "math", value: 0.72 },
                    { label: "greedy", value: 0.55 },
                    { label: "trees", value: 0.9 },
                  ]}
                />
              </Panel>
            </div>
          </Row>

          <Row title="Type scale">
            <Panel className="space-y-5 p-6">
              <div>
                <Label as="div">Hero — display 800</Label>
                <p className="mt-2 font-display text-[54px] font-extrabold leading-[0.92] tracking-[-0.035em] sm:text-[84px]">
                  Ship code.
                </p>
              </div>
              <div>
                <Label as="div">Page title</Label>
                <PageTitle className="mt-2">Found a nation</PageTitle>
              </div>
              <div>
                <Label as="div">Section title</Label>
                <SectionTitle className="mt-2">The reputation ladder</SectionTitle>
              </div>
              <div>
                <Label as="div">Body</Label>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
                  Real work mints in-world resources. Reputation is permanent and never spent — it
                  gates capability, and past three thousand points it opens the Forge.
                </p>
              </div>
              <div>
                <Label as="div">Numeric data</Label>
                <p className="mt-2 font-mono text-[11.5px] tabular-nums text-dim">
                  runtime 42ms · memory 18,204kb · verdict accepted · 12/12 cases
                </p>
              </div>
            </Panel>
          </Row>

          <Row title="Integrity note">
            <Panel variant="tinted" accent="signal" className="flex gap-4 p-5">
              <IconShield size={22} className="mt-[2px] shrink-0 text-signal" />
              <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-muted">
                Everything on this page is demo data for the design system. Nothing here is a
                platform metric. Seeded citizens are marked in the database and excluded from any
                real user count.
              </p>
            </Panel>
          </Row>
        </div>
      </main>

      <MobileTabs />
    </Atmosphere>
  );
}
