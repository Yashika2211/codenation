import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { PUBLIC_ENV, requireServiceRoleKey, hasServiceRoleKey } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS entirely, so it is the only thing that may
 * write to the ledger, read hidden test cases, or mint anything.
 *
 * Rules for using it:
 *   1. Never construct it in a Client Component or a shared module.
 *   2. Re-verify the caller's identity with the *session* client first, then do
 *      the privileged write here. Never trust an id that arrived from the body.
 *   3. Never return a row it fetched straight to the client without filtering.
 */
export function createServiceSupabase() {
  return createClient<Database>(PUBLIC_ENV.supabaseUrl, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-codenation-role": "service" } },
  });
}

export function canUseServiceRole(): boolean {
  return PUBLIC_ENV.supabaseUrl.length > 0 && hasServiceRoleKey();
}
