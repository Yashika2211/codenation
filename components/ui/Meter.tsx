import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, accentRgba, type Accent } from "@/lib/design/accents";

type MeterProps = {
  /** 0–1. Clamped, so a bad ratio can never overflow the track. */
  value: number;
  accent?: Accent;
  className?: string;
  height?: number;
  /** Exposed to assistive tech; omit only for purely decorative bars. */
  label?: string;
};

export function Meter({
  value,
  accent = "flux",
  className,
  height = 5,
  label,
}: MeterProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const hex = ACCENT_HEX[accent];

  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-[rgb(124_140_180/0.14)]", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct * 100}%`,
          backgroundImage: `linear-gradient(90deg, ${accentRgba(accent, 0.55)}, ${hex})`,
          boxShadow: `0 0 12px -2px ${hex}`,
        }}
      />
    </div>
  );
}
