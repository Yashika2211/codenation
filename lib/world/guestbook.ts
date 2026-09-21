"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * The one social write a client performs directly.
 *
 * It costs nothing and mints nothing, so it can go through RLS rather than the
 * service key — `guestbook_insert_self` pins the author to the caller, and a
 * trigger overwrites `author_id` and `at` regardless of what was posted.
 */

export type GuestbookResult = { ok: boolean; message: string };

export async function signGuestbook(formData: FormData): Promise<GuestbookResult> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Not available on this deployment." };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, message: "Sign in to leave a note." };

  const nationId = String(formData.get("nation_id") ?? "");
  const slug = String(formData.get("nation_slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!nationId) return { ok: false, message: "Unknown nation." };
  if (body.length < 1) return { ok: false, message: "Write something first." };
  if (body.length > 400) return { ok: false, message: "Notes are capped at 400 characters." };

  const { error } = await supabase.from("guestbook").insert({
    nation_id: nationId,
    author_id: user.id,
    body,
  });

  if (error) return { ok: false, message: "Could not post that." };

  // Recorded once per visitor per UTC day; a repeat is a no-op, not an error.
  await supabase.from("visits").insert({ visitor_id: user.id, nation_id: nationId });

  if (slug) revalidatePath(`/n/${slug}`);
  return { ok: true, message: "Posted." };
}
