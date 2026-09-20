import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, accentRgba, type Accent } from "@/lib/design/accents";

type TagProps = {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
  /** Solid accent fill with the matching on-accent foreground. */
  solid?: boolean;
  /** Leading pulsing dot, for live states. */
  live?: boolean;
};

/** Small status pill. Mono, uppercase, always readable at 10px. */
export function Tag({ children, accent = "flux", className, solid = false, live = false }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] rounded-[7px] px-[9px] py-[4px]",
        "font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        className,
      )}
      style={
        solid
          ? { backgroundColor: ACCENT_HEX[accent], color: `var(--color-on-${accent})` }
          : {
              backgroundColor: accentRgba(accent, 0.12),
              border: `1px solid ${accentRgba(accent, 0.3)}`,
              color: ACCENT_HEX[accent],
            }
      }
    >
      {live ? (
        <span
          aria-hidden
          className="block size-[5px] rounded-full cn-anim-pulse"
          style={{ backgroundColor: solid ? `var(--color-on-${accent})` : ACCENT_HEX[accent] }}
        />
      ) : null}
      {children}
    </span>
  );
}

const DIFFICULTY_ACCENT = {
  easy: "flux",
  medium: "signal",
  hard: "amber",
  expert: "plasma",
} as const satisfies Record<string, Accent>;

export type Difficulty = keyof typeof DIFFICULTY_ACCENT;

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  return <Tag accent={DIFFICULTY_ACCENT[difficulty]}>{difficulty}</Tag>;
}

const RARITY_ACCENT = {
  common: "signal",
  rare: "flux",
  epic: "ion",
  legendary: "amber",
  mythic: "plasma",
} as const satisfies Record<string, Accent>;

export type Rarity = keyof typeof RARITY_ACCENT;

export function rarityAccent(rarity: Rarity): Accent {
  return RARITY_ACCENT[rarity];
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return (
    <Tag accent={RARITY_ACCENT[rarity]} solid={rarity === "mythic"}>
      {rarity}
    </Tag>
  );
}
