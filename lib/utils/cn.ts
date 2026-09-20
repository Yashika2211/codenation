export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

/**
 * Minimal class-name joiner. Deliberately not `clsx` — one fewer dependency,
 * and the project never needs Tailwind conflict resolution because the design
 * system owns its own class vocabulary.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
      continue;
    }

    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
      continue;
    }

    for (const [key, value] of Object.entries(input)) {
      if (value) out.push(key);
    }
  }

  return out.join(" ");
}
