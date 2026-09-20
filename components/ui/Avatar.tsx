import { cn } from "@/lib/utils/cn";

const SIZES = {
  xs: { box: 24, text: 9, radius: 6 },
  sm: { box: 32, text: 11, radius: 8 },
  md: { box: 40, text: 13, radius: 9 },
  lg: { box: 56, text: 18, radius: 12 },
  xl: { box: 84, text: 27, radius: 16 },
} as const;

export type AvatarSize = keyof typeof SIZES;

type AvatarProps = {
  /** Stable identifier — user id or handle. Drives the gradient. */
  seed: string;
  name: string;
  size?: AvatarSize;
  className?: string;
  /** Ring colour, usually the owner's nation accent. */
  ring?: string;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Two hues 52° apart pulled deterministically from the seed, kept bright and
 * saturated so the display-800 initials in `--color-void` stay legible on top.
 */
export function avatarGradient(seed: string): { from: string; to: string } {
  const hash = hashSeed(seed);
  const hue = hash % 360;
  const second = (hue + 52) % 360;
  return {
    from: `hsl(${hue} 72% 62%)`,
    to: `hsl(${second} 76% 48%)`,
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function Avatar({ seed, name, size = "md", className, ring }: AvatarProps) {
  const { box, text, radius } = SIZES[size];
  const { from, to } = avatarGradient(seed);

  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center font-display font-extrabold", className)}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        backgroundImage: `linear-gradient(140deg, ${from}, ${to})`,
        color: "var(--color-void)",
        fontSize: text,
        letterSpacing: "-0.02em",
        boxShadow: ring ? `0 0 0 1.5px ${ring}, 0 0 18px -6px ${ring}` : undefined,
      }}
      title={name}
    >
      <span aria-hidden>{initialsOf(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
