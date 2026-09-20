import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Panel } from "@/components/ui/Panel";
import { Wordmark } from "@/components/ui/Wordmark";
import { Kicker, Label } from "@/components/ui/Label";
import { createServerSupabase, getSessionUser } from "@/lib/supabase/server";
import { suggestHandle } from "@/lib/identity/handle";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Claim your handle",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/onboarding");

  const supabase = await createServerSupabase();
  const { data: existing } = supabase
    ? await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle()
    : { data: null };

  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/city";
  if (existing) redirect(next);

  const meta = user.user_metadata;
  const githubLogin = typeof meta.user_name === "string" ? meta.user_name : null;
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;

  const suggestedHandle = suggestHandle(githubLogin ?? user.email ?? "citizen");
  const suggestedName = fullName ?? githubLogin ?? suggestedHandle;

  return (
    <Atmosphere>
      <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center px-4 py-16">
        <Wordmark className="self-start" />

        <Panel variant="solid" className="mt-8 p-7" sheen>
          <Kicker>First and only setup step</Kicker>
          <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            Who are you here?
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            Your handle is permanent and is the address of your profile, your city and eventually
            your nation. Everything else can change later.
          </p>

          <div className="mt-7">
            <OnboardingForm
              next={next}
              suggestedHandle={suggestedHandle}
              suggestedName={suggestedName}
            />
          </div>
        </Panel>

        <Panel className="mt-4 p-5">
          <Label as="div">What happens next</Label>
          <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
            You start at Citizen with zero reputation and an empty ledger. Every grant from here is
            a row you can audit on your own profile.
          </p>
        </Panel>
      </div>
    </Atmosphere>
  );
}
