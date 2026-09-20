"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { PUBLIC_ENV } from "@/lib/env";

export type AuthFormState = {
  status: "idle" | "sent" | "error";
  message: string;
};

/** Prefers the real request origin so previews and localhost both work. */
async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = headerList.get("host");
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }

  return PUBLIC_ENV.siteUrl;
}

/** Keeps an open redirect out of the `next` parameter. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//")) return "/city";
  return next;
}

export async function signInWithGithub(formData: FormData): Promise<void> {
  const supabase = await createServerSupabase();
  if (!supabase) redirect("/signin?error=unconfigured");

  const origin = await resolveOrigin();
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: "read:user user:email",
    },
  });

  if (error || !data.url) redirect("/signin?error=oauth");
  redirect(data.url);
}

export async function sendMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { status: "error", message: "Sign-in is not configured on this deployment yet." };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "That does not look like an email address." };
  }

  const origin = await resolveOrigin();
  const next = safeNext(formData.get("next"));

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    return { status: "error", message: "Could not send the link. Try again in a moment." };
  }

  return { status: "sent", message: `Link sent to ${email}. It expires in one hour.` };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
