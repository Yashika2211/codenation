import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, accentRgba, type Accent } from "@/lib/design/accents";

type MarkerProps = {
  kicker: string;
  name: string;
  accent?: Accent;
  className?: string;
  /** Percentages, positioned against the plate container. */
  left?: string;
  top?: string;
  /** Staggers the float so a cluster of markers never bobs in lockstep. */
  delay?: number;
};

/**
 * A floating label pinned over the IsoPlate. Sits outside the 3D transform so
 * the text stays flat and legible instead of skewing with the grid.
 */
export function Marker({
  kicker,
  name,
  accent = "flux",
  className,
  left,
  top,
  delay = 0,
}: MarkerProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[11px] px-3 py-[9px] backdrop-blur-sm cn-anim-float",
        className,
      )}
      style={{
        left,
        top,
        border: `1px solid ${accentRgba(accent, 0.45)}`,
        backgroundColor: "rgb(9 11 18 / 0.9)",
        animationDelay: `${delay}s`,
      }}
    >
      <div
        className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em]"
        style={{ color: ACCENT_HEX[accent] }}
      >
        {kicker}
      </div>
      <div className="mt-[3px] text-[13.5px] font-bold leading-none tracking-[-0.01em] text-text">
        {name}
      </div>
    </div>
  );
}
