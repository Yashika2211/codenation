import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, type Accent } from "@/lib/design/accents";
import { Label } from "./Label";

type StatTileProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: Accent;
  className?: string;
  /** Renders the value in the accent colour instead of full-strength text. */
  emphasis?: boolean;
};

export function StatTile({
  label,
  value,
  sub,
  accent = "flux",
  className,
  emphasis = false,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-glass px-[15px] py-[13px]",
        className,
      )}
    >
      <Label as="div">{label}</Label>
      <div
        className="mt-[7px] font-display text-[25px] font-extrabold leading-none tracking-[-0.03em] tabular-nums sm:text-[28px]"
        style={emphasis ? { color: ACCENT_HEX[accent] } : undefined}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
      {sub ? <p className="mt-[7px] text-[11.5px] leading-snug text-faint">{sub}</p> : null}
    </div>
  );
}
