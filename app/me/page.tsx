import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";

/** Shortcut to your own profile. The middleware guarantees a session here. */
export default async function MePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding?next=/me");
  redirect(`/u/${profile.handle}`);
}
