import Link from "next/link";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Wordmark } from "@/components/ui/Wordmark";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { Kicker } from "@/components/ui/Label";
import { IconArrowRight } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <Atmosphere>
      <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center px-4 py-16">
        <Wordmark className="self-start" />

        <Panel variant="solid" className="mt-8 p-7" sheen>
          <Kicker color="#E84FA8">404</Kicker>
          <h1 className="mt-4 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em]">
            Nothing stands here
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            That parcel is unclaimed. The handle, nation or problem you asked for does not exist —
            or it was never public.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/" icon={<IconArrowRight size={15} />}>
              Back to the portal
            </ButtonLink>
            <ButtonLink href="/arena" variant="ghost">
              Browse problems
            </ButtonLink>
          </div>
        </Panel>

        <Link
          href="/atlas"
          className="mt-6 self-center font-mono text-[10px] uppercase tracking-[0.18em] text-ghost transition-colors hover:text-flux"
        >
          Or look at the atlas
        </Link>
      </div>
    </Atmosphere>
  );
}
