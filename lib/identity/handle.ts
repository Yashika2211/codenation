/** Mirrors the `profiles_handle_format` check constraint exactly. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/;

export const HANDLE_MIN = 2;
export const HANDLE_MAX = 30;

/** Handles that would collide with a route segment or read as official. */
const RESERVED = new Set([
  "admin", "api", "arena", "atlas", "auth", "city", "codenation", "duel", "events",
  "fairplay", "forge", "guild", "me", "moderator", "n", "official", "onboarding",
  "root", "settings", "signin", "signout", "staff", "support", "system", "tech", "u",
  "kitchen-sink", "null", "undefined", "anonymous", "deleted",
]);

export type HandleCheck = { ok: true; handle: string } | { ok: false; reason: string };

export function normalizeHandle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+/, "")
    .slice(0, HANDLE_MAX);
}

export function checkHandle(input: string): HandleCheck {
  const handle = normalizeHandle(input);

  if (handle.length < HANDLE_MIN) {
    return { ok: false, reason: `Handles are at least ${HANDLE_MIN} characters.` };
  }
  if (handle.length > HANDLE_MAX) {
    return { ok: false, reason: `Handles are at most ${HANDLE_MAX} characters.` };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return { ok: false, reason: "Use lowercase letters, numbers, hyphens and underscores." };
  }
  if (RESERVED.has(handle)) {
    return { ok: false, reason: "That handle is reserved." };
  }

  return { ok: true, handle };
}

/** A starting suggestion from a GitHub login or email local-part. */
export function suggestHandle(source: string): string {
  const base = normalizeHandle(source.split("@")[0] ?? "");
  if (base.length >= HANDLE_MIN && !RESERVED.has(base)) return base;
  return `${base || "citizen"}-${Math.floor(Math.random() * 9000 + 1000)}`.slice(0, HANDLE_MAX);
}

/**
 * Avatar seeds are stable and opaque. They never encode the handle, so changing
 * how avatars render later cannot leak or shuffle anyone's identity.
 */
export function generateAvatarSeed(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ISO 3166-1 alpha-2, or null. Used to place a nation on the atlas. */
export function normalizeCountryCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}
