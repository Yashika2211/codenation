import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import { PUBLIC_ENV, isSupabaseConfigured } from "@/lib/env";

/**
 * Request-scoped client carrying the caller's session. Still subject to RLS —
 * this is what every Server Component read should use. Returns `null` when
 * Supabase is not configured so public pages can render an empty state instead
 * of a 500.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(PUBLIC_ENV.supabaseUrl, PUBLIC_ENV.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

/** The signed-in user, or `null`. Never throws. */
export async function getSessionUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** The caller's profile row, or `null` if they have not completed onboarding. */
export async function getCurrentProfile() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}
