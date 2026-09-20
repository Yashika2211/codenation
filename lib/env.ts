/**
 * Environment access, in one place.
 *
 * Reads are lazy and never throw at import time — the app must still build and
 * render its public pages when Supabase has not been provisioned yet. Code that
 * genuinely requires a key calls the `require*` helpers and handles the error.
 */

export const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** True when the browser/server clients have everything they need. */
export function isSupabaseConfigured(): boolean {
  return PUBLIC_ENV.supabaseUrl.length > 0 && PUBLIC_ENV.supabaseAnonKey.length > 0;
}

export function requireSupabasePublic(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url: PUBLIC_ENV.supabaseUrl, anonKey: PUBLIC_ENV.supabaseAnonKey };
}

/** Server only. Importing this from a Client Component is a build error. */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Server-side writes are unavailable.");
  }
  return key;
}

export function hasServiceRoleKey(): boolean {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

export type JudgeProvider = "piston" | "judge0";

export function judgeProvider(): JudgeProvider {
  return process.env.JUDGE_PROVIDER === "judge0" ? "judge0" : "piston";
}

export const JUDGE_ENV = {
  pistonUrl: process.env.PISTON_URL ?? "https://emkc.org/api/v2/piston",
  judge0Url: process.env.JUDGE0_URL ?? "",
  judge0Token: process.env.JUDGE0_TOKEN ?? "",
} as const;
