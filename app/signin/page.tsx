import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Wordmark";
import { Label, Kicker } from "@/components/ui/Label";
import { IconGithub, IconShield } from "@/components/ui/Icon";
import { getSessionUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { signInWithGithub } from "./actions";
import { MagicLinkForm } from "./MagicLinkForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to CodeNation with GitHub or an email link.",
};

const ERRORS: Record<string, string> = {
  oauth: "GitHub did not complete the handshake. Try again.",
  unconfigured: "This deployment has no auth provider configured yet.",
  callback: "That sign-in link has expired or was already used.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(params.next ?? "/city");

  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/city";
  const error = params.error ? (ERRORS[params.error] ?? "Something went wrong.") : null;
  const configured = isSupabaseConfigured();

  return (
    <Atmosphere>
      <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col justify-center px-4 py-16">
        <Wordmark className="self-start" />

        <Panel variant="solid" className="mt-8 p-7" sheen>
          <Kicker>Enter the world</Kicker>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            Claim your handle
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            GitHub is the primary identity here — it is what lets merged contributions be verified
            later. An email link works too.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-chip border border-[rgb(255_107_129/0.3)] bg-[rgb(255_107_129/0.1)] px-4 py-3 text-[12.5px] text-[#FF8A9C]"
            >
              {error}
            </p>
          ) : null}

          {configured ? (
            <>
              <form action={signInWithGithub} className="mt-6">
                <input type="hidden" name="next" value={next} />
                <Button type="submit" size="lg" fullWidth icon={<IconGithub size={17} />}>
                  Continue with GitHub
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <Label>or</Label>
                <span className="h-px flex-1 bg-line" />
              </div>

              <MagicLinkForm next={next} />
            </>
          ) : (
            <Panel variant="tinted" accent="amber" className="mt-6 p-5">
              <Label as="div">Not configured</Label>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                This build has no Supabase project attached. Set{" "}
                <code className="text-[12px] text-amber">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="text-[12px] text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
                enable sign-in.
              </p>
            </Panel>
          )}
        </Panel>

        <Panel className="mt-4 flex gap-3 p-5">
          <IconShield size={18} className="mt-[2px] shrink-0 text-signal" />
          <p className="text-[12.5px] leading-relaxed text-dim">
            We read your public GitHub profile and verified email. Nothing is posted on your behalf,
            and your source code stays private to you unless you publish it.
          </p>
        </Panel>

        <Link
          href="/"
          className="mt-6 self-center font-mono text-[10px] uppercase tracking-[0.18em] text-ghost transition-colors hover:text-flux"
        >
          Back to the portal
        </Link>
      </div>
    </Atmosphere>
  );
}
