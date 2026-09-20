import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, RESOURCE_ACCENT } from "@/lib/design/accents";

export type ResourceKind = keyof typeof RESOURCE_ACCENT;

const RESOURCE_LABEL: Record<ResourceKind, string> = {
  compute: "CMP",
  data: "DAT",
  alloy: "ALY",
  rep: "REP",
};

type ResourceChipProps = {
  resource: ResourceKind;
  value: number;
  className?: string;
  /** Hides the three-letter label on very narrow rails. */
  compact?: boolean;
};

/** 1.2k / 3.4M formatting so a chip never reflows the nav. */
export function formatResource(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString("en-US");
}

export function ResourceChip({
  resource,
  value,
  className,
  compact = false,
}: ResourceChipProps) {
  const accent = RESOURCE_ACCENT[resource];
  const hex = ACCENT_HEX[accent];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] rounded-chip border border-line bg-glass-hi px-[11px] py-[7px]",
        className,
      )}
      title={`${value.toLocaleString("en-US")} ${resource}`}
    >
      <span
        aria-hidden
        className="block size-[9px] rotate-45 rounded-[1px]"
        style={{ backgroundColor: hex, boxShadow: `0 0 10px -1px ${hex}` }}
      />
      <span className="font-mono text-[11.5px] font-medium tabular-nums text-text">
        {formatResource(value)}
      </span>
      {compact ? null : (
        <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
          {RESOURCE_LABEL[resource]}
        </span>
      )}
    </span>
  );
}
