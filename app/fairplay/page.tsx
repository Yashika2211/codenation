import type { Metadata } from "next";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { TopNav } from "@/components/ui/TopNav";
import { MobileTabs } from "@/components/ui/MobileTabs";
import { Footer } from "@/components/ui/Footer";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker, PageTitle, SectionTitle } from "@/components/ui/Label";
import { StatTile } from "@/components/ui/StatTile";
import { Meter } from "@/components/ui/Meter";
import { Tag } from "@/components/ui/Tag";
import { IconShield, IconCheck } from "@/components/ui/Icon";
import { getFairplayView, type FlagView } from "@/lib/queries/fairplay";
import { getCurrentProfile } from "@/lib/supabase/server";
import { SIMILARITY_THRESHOLD, K_GRAM, WINDOW } from "@/lib/integrity/fingerprint";
import { ACCENT_HEX } from "@/lib/design/accents";
import type { Accent } from "@/lib/design/accents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integrity",
  description:
    "Assistance is allowed and should be declared. Plagiarism is the line. Every verdict is public.",
};

const STAGES = [
  { n: "01", name: "Signal", body: "Paste volume, cadence and fingerprint overlap are computed at submit time, on every submission — accepted or not." },
  { n: "02", name: "Flag", body: "A signal past threshold opens a row with its evidence attached. Nothing about your account changes." },
  { n: "03", name: "Evidence", body: "The matched pair, the overlap and the timing are assembled for a reviewer." },
  { n: "04", name: "Review", body: "A person reads it. Reviewers cannot see who reported, and cannot review their own nation." },
  { n: "05", name: "Verdict", body: "Written to a public, append-only ledger with the reasoning attached." },
  { n: "06", name: "Appeal", body: "A fixed window to respond. An overturned verdict stays in the ledger, marked as overturned." },
];

const STATE_ACCENT: Record<string, Accent> = {
  watch: "signal",
  evidence: "amber",
  review: "plasma",
  resolved: "flux",
};

function FlagCard({ flag }: { flag: FlagView }) {
  return (
    <Panel
      className="p-5"
      variant={flag.isOwn ? "tinted" : "glass"}
      accent={STATE_ACCENT[flag.state] ?? "signal"}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Tag accent={STATE_ACCENT[flag.state] ?? "signal"}>{flag.state}</Tag>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
          {flag.kind.replace(/_/g, " ")}
        </span>
        {flag.isOwn ? (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber">
            yours
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[10px] tabular-nums text-ghost">
          {flag.createdAt.slice(0, 10)}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <Label>Confidence</Label>
          <span className="font-mono text-[11px] tabular-nums text-faint">
            {(flag.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <Meter
          value={flag.confidence}
          accent={STATE_ACCENT[flag.state] ?? "signal"}
          label="Signal confidence"
        />
      </div>

      {flag.signalKeys.length > 0 ? (
        <div className="mt-4">
          <Label as="div">Signals that fired</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {flag.signalKeys.map((key) => (
              <span
                key={key}
                className="rounded-[6px] border border-line px-[8px] py-[3px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-dim"
              >
                {key.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {flag.verdict ? (
        <div className="mt-4 border-t border-line pt-4">
          <Label as="div">Verdict</Label>
          <p className="mt-2 text-[13px] font-bold text-text">{flag.verdict}</p>
          {flag.reasoning ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{flag.reasoning}</p>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

export default async function FairplayPage() {
  const [view, viewer] = await Promise.all([getFairplayView(), getCurrentProfile()]);

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
        <Kicker color={ACCENT_HEX.signal}>Integrity</Kicker>
        <PageTitle className="mt-3 max-w-[20ch]">
          Assistance is allowed. Plagiarism is the line.
        </PageTitle>
        <p className="mt-4 max-w-[66ch] text-[15px] leading-relaxed text-muted">
          Use whatever tools you want, and say so. What this pipeline looks for is copied work:
          k-gram fingerprints of the normalised source compared against other accepted submissions
          for the same problem, plus paste cadence.
        </p>

        {/* the honest limit, stated first */}
        <Panel variant="tinted" accent="amber" className="mt-6 flex gap-4 p-5">
          <IconShield size={20} className="mt-[2px] shrink-0 text-amber" />
          <div>
            <Label as="div">What this does not do</Label>
            <p className="mt-2 max-w-[78ch] text-[13px] leading-relaxed text-muted">
              It does not claim to detect AI-written code, and it never will. That cannot be done
              reliably, and a system that says otherwise is worse than one that does not try — it
              produces confident accusations that no one can check.
            </p>
          </div>
        </Panel>

        {/* method */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Similarity threshold"
            value={SIMILARITY_THRESHOLD.toFixed(2)}
            sub="Jaccard, winnowed k-grams"
            accent="signal"
            emphasis
          />
          <StatTile label="k-gram" value={K_GRAM} sub={`window ${WINDOW}`} />
          <StatTile
            label="Open cases"
            value={view.queue.length}
            sub="awaiting a human"
            accent="plasma"
            emphasis
          />
          <StatTile
            label="Published verdicts"
            value={view.verdicts.length}
            sub="append-only ledger"
            accent="flux"
            emphasis
          />
        </div>

        {/* pipeline */}
        <section className="mt-12">
          <SectionTitle>The six stages</SectionTitle>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{stage.body}</p>
                </Panel>
              </li>
            ))}
          </ol>
        </section>

        {/* your standing */}
        <section className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <Panel variant="solid" className="p-5" sheen>
            <Kicker>Your standing</Kicker>

            {viewer ? (
              <>
                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <Label>Trust score</Label>
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {view.trustScore ?? 100}/100
                    </span>
                  </div>
                  <Meter
                    value={(view.trustScore ?? 100) / 100}
                    accent={(view.trustScore ?? 100) >= 80 ? "flux" : "amber"}
                    label="Trust score"
                  />
                </div>

                <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
                  {view.ownFlags === 0 ? (
                    <>
                      <IconCheck size={15} className="text-flux" />
                      No flags on your account.
                    </>
                  ) : (
                    <>
                      {view.ownFlags} case{view.ownFlags === 1 ? "" : "s"} involving your work.
                    </>
                  )}
                </p>

                <p className="mt-4 border-t border-line pt-4 text-[12px] leading-relaxed text-ghost">
                  Trust starts at 100 and only a resolved verdict moves it. A flag on its own never
                  does.
                </p>
              </>
            ) : (
              <p className="mt-4 text-[13px] text-dim">Sign in to see your standing.</p>
            )}
          </Panel>

          <div>
            <SectionTitle>Review queue</SectionTitle>
            {view.queue.length === 0 ? (
              <Panel className="mt-4 p-6">
                <p className="text-[13px] leading-relaxed text-dim">
                  Nothing is open. Cases appear here when a signal passes threshold — and they wait
                  for a person, not a timer.
                </p>
              </Panel>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {view.queue.map((flag) => (
                  <FlagCard key={flag.id} flag={flag} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* verdict ledger */}
        <section id="verdicts" className="mt-12">
          <SectionTitle>Published verdicts</SectionTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-dim">
            Append-only. An overturned verdict is not deleted — it stays, marked, so the record of
            what was decided and later corrected is intact.
          </p>

          {view.verdicts.length === 0 ? (
            <Panel className="mt-4 p-6">
              <p className="text-[13px] text-dim">No verdicts have been published yet.</p>
            </Panel>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {view.verdicts.map((flag) => (
                <FlagCard key={flag.id} flag={flag} />
              ))}
            </div>
          )}
        </section>

        {/* charter */}
        <Panel variant="tinted" accent="signal" className="mt-12 p-6">
          <Kicker color={ACCENT_HEX.signal}>Community charter</Kicker>
          <ul className="mt-4 space-y-3">
            {[
              "Declare assistance. Using a tool is not cheating; hiding it erodes the only thing reputation measures.",
              "Do not submit another person's work as your own. That is the line, and it is the only one enforced here.",
              "A flag is not an accusation. Nothing about your account changes until a person has read the case.",
              "Every verdict is published with its reasoning, and every verdict can be appealed inside a fixed window.",
              "Reviewers cannot see who reported a case, and cannot review anyone in their own nation.",
            ].map((rule) => (
              <li key={rule} className="flex gap-[11px] text-[13.5px] leading-relaxed text-muted">
                <span
                  aria-hidden
                  className="mt-[8px] block size-[5px] shrink-0 rotate-45 rounded-[1px] bg-signal"
                />
                {rule}
              </li>
            ))}
          </ul>
        </Panel>
      </main>

      <Footer />
      <MobileTabs />
    </Atmosphere>
  );
}
