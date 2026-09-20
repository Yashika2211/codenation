import { cn } from "@/lib/utils/cn";

/** Mono uppercase micro-label. The spine of the whole interface. */
export function Label({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "p" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-dim",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A label with a leading 6px accent diamond, used above section titles. */
export function Kicker({
  children,
  className,
  color = "var(--color-flux)",
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[9px]", className)}>
      <span
        aria-hidden
        className="block size-[6px] rotate-45 rounded-[1px]"
        style={{ backgroundColor: color, boxShadow: `0 0 9px -1px ${color}` }}
      />
      <Label>{children}</Label>
    </span>
  );
}

export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-display text-[19px] font-extrabold tracking-[-0.025em] text-text sm:text-[20px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.025em] text-text sm:text-[32px]",
        className,
      )}
    >
      {children}
    </h1>
  );
}
