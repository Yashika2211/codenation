"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { requireSupabasePublic } from "@/lib/env";

/**
 * Browser client. Carries the anon key only, so every query it makes is subject
 * to RLS. Used for realtime subscriptions and for reads that are already public.
 */
export function createClient() {
  const { url, anonKey } = requireSupabasePublic();
  return createBrowserClient<Database>(url, anonKey);
}
