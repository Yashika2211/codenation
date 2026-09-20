import { Panel } from "@/components/ui/Panel";
import { Kicker, SectionTitle } from "@/components/ui/Label";
import { ACCENT_HEX, type Accent } from "@/lib/design/accents";
import {
  IconTerminal,
  IconSwords,
  IconCube,
  IconNodes,
  IconAnvil,
  IconShield,
} from "@/components/ui/Icon";

type Feature = {
  title: string;
  body: string;
  accent: Accent;
  Icon: (props: { size?: number; className?: string }) => React.ReactElement;
  detail: string;
};

const FEATURES: Feature[] = [
  {
    title: "A real judge",
    body: "Write Rust, Python, Go, C++, Java or JavaScript in the browser. Sample cases on Run, the full set on Submit, with each case streaming its verdict back as it finishes.",
    accent: "flux",
    Icon: IconTerminal,
    detail: "Piston execution · per-case verdicts · stored runs",
  },
  {
    title: "Rated duels",
    body: "Head-to-head on the same problem with a live countdown. You see your opponent's cases passed and last submit — never their source. Elo settles it, K=32.",
    accent: "plasma",
    Icon: IconSwords,
    detail: "Elo K=32 · realtime presence · staked",
  },
  {
    title: "An economy with a sink",
    body: "Every grant appends to a ledger; balances are always a sum, never a patched number. Diminishing returns cap grinding, and building upkeep is the drain that keeps it honest.",
    accent: "amber",
    Icon: IconCube,
    detail: "Append-only ledger · 6h upkeep cycle",
  },
  {
    title: "A tech tree that costs solves",
    body: "Sixty nodes across five branches. Research advances by solving in the node's topic, not by waiting on a timer, and mastering one unlocks blueprints and forge parameters.",
    accent: "ion",
    Icon: IconNodes,
    detail: "5 branches · 4 tiers · solve-gated",
  },
  {
    title: "The Forge",
    body: "At 3,000 reputation you craft parametric items — silhouette, facade, crown, palette, inscription. The preview renders live as you move a slider, and the result carries a serial.",
    accent: "plasma",
    Icon: IconAnvil,
    detail: "Deterministic params · bound on craft",
  },
  {
    title: "Integrity in the open",
    body: "Similarity fingerprints and paste-cadence signals raise flags, never punishments. A human resolves every one, and each verdict is published to an append-only ledger with an appeal window.",
    accent: "signal",
    Icon: IconShield,
    detail: "Human review · public verdicts · appeals",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:py-28">
      <Kicker>What is actually built</Kicker>
      <SectionTitle className="mt-4 max-w-[26ch] !text-[26px] sm:!text-[32px]">
        Six systems, each doing real work against a real database
      </SectionTitle>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ title, body, accent, Icon, detail }) => (
          <Panel key={title} className="group flex flex-col p-6 transition-colors hover:bg-glass-hi">
            <span
              aria-hidden
              className="grid size-[38px] place-items-center rounded-[10px]"
              style={{
                border: `1px solid ${ACCENT_HEX[accent]}44`,
                backgroundColor: `${ACCENT_HEX[accent]}14`,
                color: ACCENT_HEX[accent],
              }}
            >
              <Icon size={19} />
            </span>

            <h3 className="mt-5 font-display text-[19px] font-extrabold tracking-[-0.025em] text-text">
              {title}
            </h3>
            <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted">{body}</p>
            <p className="mt-6 border-t border-line pt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
              {detail}
            </p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
