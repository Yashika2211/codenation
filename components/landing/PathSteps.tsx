import { Panel } from "@/components/ui/Panel";
import { Kicker, SectionTitle } from "@/components/ui/Label";
import { ACCENT_HEX, type Accent } from "@/lib/design/accents";

type Step = {
  index: string;
  title: string;
  body: string;
  accent: Accent;
  gate: string;
};

const STEPS: Step[] = [
  {
    index: "01",
    title: "Solve",
    body: "Pick a problem, write real code in the browser, run it against a real judge. Every accepted verdict mints compute and reputation inside the same transaction that records it.",
    accent: "flux",
    gate: "Open to everyone",
  },
  {
    index: "02",
    title: "Claim",
    body: "At Engineer you claim your first parcels and spend compute on blueprints. Buildings charge upkeep every six hours, so a city you do not maintain goes dormant.",
    accent: "signal",
    gate: "1,000 reputation",
  },
  {
    index: "03",
    title: "Found",
    body: "At Founder you name a nation, design its flag and set its doctrine. It takes a position on the world atlas, and its prestige is contestable every season.",
    accent: "ion",
    gate: "2,500 reputation",
  },
  {
    index: "04",
    title: "Forge",
    body: "At Sovereign the Forge opens. Pick a silhouette, a facade, a crown and a palette; watch the item render live; pay the cost and it stands in your country with a real serial.",
    accent: "plasma",
    gate: "3,000 reputation",
  },
];

export function PathSteps() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:py-28">
      <Kicker>The path</Kicker>
      <SectionTitle className="mt-4 max-w-[24ch] !text-[26px] sm:!text-[32px]">
        Four steps from a first accepted verdict to a country of your own
      </SectionTitle>

      <ol className="mt-12 grid gap-4 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.index}>
            <Panel className="flex h-full flex-col p-6" sheen>
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[11px] font-bold tracking-[0.2em]"
                  style={{ color: ACCENT_HEX[step.accent] }}
                >
                  {step.index}
                </span>
                <span
                  aria-hidden
                  className="block size-[7px] rotate-45 rounded-[1px]"
                  style={{
                    backgroundColor: ACCENT_HEX[step.accent],
                    boxShadow: `0 0 12px -1px ${ACCENT_HEX[step.accent]}`,
                  }}
                />
              </div>

              <h3 className="mt-5 font-display text-[23px] font-extrabold tracking-[-0.025em] text-text">
                {step.title}
              </h3>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted">{step.body}</p>

              <p className="mt-6 border-t border-line pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ghost">
                {step.gate}
              </p>
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
}
