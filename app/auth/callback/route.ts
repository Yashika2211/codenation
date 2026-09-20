import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * OAuth and magic-link landing. Exchanges the code for a session, then decides
 * where the user actually belongs: onboarding if they have not claimed a
 * handle, otherwise wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/city";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/city";

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=callback`);
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/signin?error=unconfigured`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/signin?error=callback`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
