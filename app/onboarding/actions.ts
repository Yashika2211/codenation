"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkHandle, generateAvatarSeed, normalizeCountryCode } from "@/lib/identity/handle";

export type OnboardingState = {
  status: "idle" | "error";
  message: string;
  field?: "handle" | "display_name" | "country_code";
};

export async function claimHandle(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { status: "error", message: "Sign-in is not configured on this deployment." };
  }

  // Identity comes from the session, never from the form body.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/signin");

  const handleResult = checkHandle(String(formData.get("handle") ?? ""));
  if (!handleResult.ok) {
    return { status: "error", message: handleResult.reason, field: "handle" };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 1 || displayName.length > 48) {
    return {
      status: "error",
      message: "Pick a display name between 1 and 48 characters.",
      field: "display_name",
    };
  }

  const bioRaw = String(formData.get("bio") ?? "").trim();
  if (bioRaw.length > 280) {
    return { status: "error", message: "Bios are capped at 280 characters." };
  }

  const countryCode = normalizeCountryCode(String(formData.get("country_code") ?? ""));

  const githubLogin =
    typeof user.user_metadata.user_name === "string"
      ? user.user_metadata.user_name
      : typeof user.user_metadata.preferred_username === "string"
        ? user.user_metadata.preferred_username
        : null;

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    handle: handleResult.handle,
    display_name: displayName,
    bio: bioRaw.length > 0 ? bioRaw : null,
    avatar_seed: generateAvatarSeed(),
    country_code: countryCode,
    github_login: githubLogin,
  });

  if (error) {
    // 23505 is the unique violation on lower(handle).
    if (error.code === "23505") {
      return { status: "error", message: "That handle is already taken.", field: "handle" };
    }
    return { status: "error", message: "Could not create your profile. Try again." };
  }

  const rawNext = String(formData.get("next") ?? "/city");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/city";

  revalidatePath("/", "layout");
  redirect(next);
}
