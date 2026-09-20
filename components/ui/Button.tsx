import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, ACCENT_ON_HEX, accentRgba, type Accent } from "@/lib/design/accents";

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  accent?: Accent;
  /** Leading inline SVG icon. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type AnchorProps = CommonProps & {
  href: string;
  /** Opens in a new tab with the right rel pair. */
  external?: boolean;
};

const SIZES: Record<ButtonSize, string> = {
  // 44px minimum touch target on every size, per the accessibility rules.
  sm: "min-h-[44px] px-[14px] text-[12.5px] gap-[7px]",
  md: "min-h-[44px] px-[18px] text-[13.5px] gap-2",
  lg: "min-h-[52px] px-[24px] text-[15px] gap-[10px]",
};

const BASE =
  "inline-flex items-center justify-center rounded-chip font-semibold tracking-[-0.01em] " +
  "transition-[background-color,border-color,box-shadow,transform] duration-150 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45 select-none";

function useStyles(
  variant: ButtonVariant,
  size: ButtonSize,
  accent: Accent,
  fullWidth: boolean,
  className: string | undefined,
) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  const classes = cn(
    BASE,
    SIZES[size],
    fullWidth && "w-full",
    variant === "ghost" &&
      "border border-transparent text-dim hover:text-text hover:border-line hover:bg-glass",
    isDanger && "border border-[rgb(255_107_129/0.34)] bg-[rgb(255_107_129/0.1)] text-[#FF8A9C] hover:bg-[rgb(255_107_129/0.16)]",
    className,
  );

  const style: React.CSSProperties | undefined = isPrimary
    ? {
        backgroundColor: ACCENT_HEX[accent],
        color: ACCENT_ON_HEX[accent],
        boxShadow: `0 0 26px -8px ${accentRgba(accent, 0.9)}`,
      }
    : isOutline
      ? {
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: accentRgba(accent, 0.38),
          backgroundColor: accentRgba(accent, 0.1),
          color: ACCENT_HEX[accent],
        }
      : undefined;

  return { classes, style };
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  accent = "flux",
  icon,
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const { classes, style } = useStyles(variant, size, accent, fullWidth, className);

  return (
    <button className={classes} style={style} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  variant = "primary",
  size = "md",
  accent = "flux",
  icon,
  fullWidth = false,
  href,
  external = false,
}: AnchorProps) {
  const { classes, style } = useStyles(variant, size, accent, fullWidth, className);

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
      >
        {icon}
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} style={style}>
      {icon}
      {children}
    </Link>
  );
}
