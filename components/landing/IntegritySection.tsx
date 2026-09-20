import { Panel } from "@/components/ui/Panel";
import { Kicker, SectionTitle, Label } from "@/components/ui/Label";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icon";

const STAGES = [
  { n: "01", name: "Signal", body: "Paste volume, cadence and fingerprint overlap are computed at submit time." },
  { n: "02", name: "Flag", body: "A signal above threshold opens a moderation row with its evidence blob attached." },
  { n: "03", name: "Evidence", body: "The pair, the diff and the timing are assembled. Nothing is auto-punished." },
  { n: "04", name: "Review", body: "A human reads it. Reviewers cannot see the reporter, and cannot review their own nation." },
  { n: "05", name: "Verdict", body: "Written to a public append-only ledger, with the reasoning attached." },
  { n: "06", name: "Appeal", body: "A fixed window to respond. An overturned verdict stays in the ledger, marked." },
];

export function IntegritySection() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <div>
          <Kicker color="#5FC8FF">Integrity</Kicker>
          <SectionTitle className="mt-4 !text-[26px] sm:!text-[32px]">
            Assistance is allowed. Plagiarism is the line.
          </SectionTitle>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            Use whatever tools you want, and declare it. What the pipeline actually looks for is
            copied work: k-gram fingerprints compared against other accepted submissions for the same
            problem, plus paste cadence.
          </p>
          <Panel variant="tinted" accent="signal" className="mt-6 p-5">
            <Label as="div">What this does not do</Label>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              It does not claim to detect AI-written code. That cannot be done reliably, and a system
              that claims otherwise is worse than one that does not try.
            </p>
          </Panel>
          <ButtonLink
            href="/fairplay"
            variant="outline"
            accent="signal"
            className="mt-7"
            icon={<IconArrowRight size={15} />}
          >
            Read the charter
          </ButtonLink>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {STAGES.map((stage) => (
            <li key={stage.n}>
              <Panel className="h-full p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-signal">
                    {stage.n}
                  </span>
                  <h3 className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-text">
                    {stage.name}
                  </h3>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{stage.body}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
