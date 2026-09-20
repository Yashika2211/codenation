import { ButtonLink } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { DataStreams } from "./DataStreams";
import { IconGithub, IconArrowRight } from "@/components/ui/Icon";

export function FinalCta() {
  return (
    <section className="relative mx-auto max-w-[1440px] px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-hero border border-line bg-panel/85 px-6 py-16 sm:px-12 sm:py-24">
        <DataStreams count={14} className="opacity-45" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(620px 320px at 50% 120%, rgb(59 232 176 / 0.20), transparent 68%)",
          }}
        />

        <div className="relative mx-auto max-w-[720px] text-center">
          <Label>Reputation is earned, never bought</Label>
          <h2 className="mt-5 font-display text-[clamp(32px,7vw,60px)] font-extrabold leading-[0.96] tracking-[-0.035em] text-text">
            Your first accepted verdict is
            <span className="text-flux"> one problem away.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
            Sign in with GitHub, claim a handle, and solve something. The ledger starts the moment
            the judge returns.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signin" size="lg" icon={<IconGithub size={17} />}>
              Sign in with GitHub
            </ButtonLink>
            <ButtonLink
              href="/arena"
              size="lg"
              variant="ghost"
              icon={<IconArrowRight size={17} />}
            >
              Browse problems first
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
