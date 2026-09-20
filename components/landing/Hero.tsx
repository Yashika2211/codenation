import { ButtonLink } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Skyline } from "./Skyline";
import { DataStreams } from "./DataStreams";
import { IconArrowRight, IconGithub } from "@/components/ui/Icon";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <DataStreams className="opacity-70" />
      <Skyline className="h-[340px]" />

      <div className="relative mx-auto max-w-[1440px] px-4 pb-[300px] pt-20 sm:px-6 sm:pt-28 lg:pb-[340px] lg:pt-36">
        <div className="max-w-[900px]">
          <span className="inline-flex items-center gap-[9px] rounded-chip border border-line bg-glass-hi px-[13px] py-[7px]">
            <span
              aria-hidden
              className="block size-[6px] rotate-45 rounded-[1px] bg-flux cn-anim-pulse"
              style={{ boxShadow: "0 0 10px -1px #3BE8B0" }}
            />
            <Label>A persistent world for developers</Label>
          </span>

          <h1 className="mt-7 font-display text-[clamp(44px,11vw,108px)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            <span className="block text-text">Ship code.</span>
            <span className="block text-flux">Found a nation.</span>
          </h1>

          <p className="mt-7 max-w-[60ch] text-[15px] leading-relaxed text-muted sm:text-[16.5px]">
            Solved challenges, rated duels, hackathon placements and merged contributions mint real
            in-world resources. Reputation is permanent, never spent, and it is the only thing that
            unlocks territory, buildings, technologies — and past three thousand points, the Forge.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/signin" size="lg" icon={<IconGithub size={17} />}>
              Sign in with GitHub
            </ButtonLink>
            <ButtonLink
              href="/arena"
              size="lg"
              variant="outline"
              accent="ion"
              icon={<IconArrowRight size={17} />}
            >
              Enter the Arena
            </ButtonLink>
          </div>

          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ghost">
            Free · no card · your work stays yours
          </p>
        </div>
      </div>
    </section>
  );
}
