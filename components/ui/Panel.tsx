import { cn } from "@/lib/utils/cn";
import { accentRgba, type Accent } from "@/lib/design/accents";

type PanelVariant = "glass" | "solid" | "tinted";

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  variant?: PanelVariant;
  /** Only read when `variant="tinted"`. */
  accent?: Accent;
  /** Renders a hairline inner highlight along the top edge. */
  sheen?: boolean;
  as?: "div" | "section" | "article" | "aside" | "li" | "form";
};

/**
 * The universal surface. Glass by default — a near-transparent white film over
 * the void with a 1px hairline border. `tinted` washes the surface in an accent
 * for panels that carry state (a live duel, a mastered tech node).
 *
 * Tinted colours are inline because Tailwind cannot statically extract a class
 * built from a runtime accent name.
 */
export function Panel({
  children,
  className,
  variant = "glass",
  accent = "flux",
  sheen = false,
  as: Tag = "div",
}: PanelProps) {
  const tinted = variant === "tinted";

  return (
    <Tag
      className={cn(
        "relative rounded-panel border",
        variant === "glass" && "border-line bg-glass",
        variant === "solid" && "border-line bg-panel/85",
        tinted && "border-transparent",
        className,
      )}
      style={
        tinted
          ? {
              backgroundColor: accentRgba(accent, 0.08),
              borderColor: accentRgba(accent, 0.28),
            }
          : undefined
      }
    >
      {sheen ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
        />
      ) : null}
      {children}
    </Tag>
  );
}
