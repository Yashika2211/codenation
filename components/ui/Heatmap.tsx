import { cn } from "@/lib/utils/cn";

/** Five contribution levels, matching the spec exactly. */
const LEVEL_COLOR = [
  "rgb(124 140 180 / 0.1)",
  "rgb(59 232 176 / 0.25)",
  "rgb(59 232 176 / 0.45)",
  "rgb(59 232 176 / 0.7)",
  "#3BE8B0",
] as const;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatDay = {
  /** ISO date, used for the tooltip and the accessible label. */
  date: string;
  count: number;
};

const WEEKS = 53;
const DAYS = 7;

/** Buckets a raw count into one of the five levels using the window's own max. */
export function heatLevel(count: number, max: number): HeatLevel {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

type HeatmapProps = {
  /** Sparse is fine — missing dates render as level 0. */
  days: HeatDay[];
  className?: string;
  /** Anchor for the 53-week window. Defaults to today. */
  endDate?: Date;
};

export function Heatmap({ days, className, endDate }: HeatmapProps) {
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const max = days.reduce((acc, d) => Math.max(acc, d.count), 0);

  const end = endDate ?? new Date();
  // Walk back to the Saturday that closes the final column.
  const anchor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  anchor.setUTCDate(anchor.getUTCDate() + (6 - anchor.getUTCDay()));

  const columns: React.ReactNode[] = [];
  for (let w = WEEKS - 1; w >= 0; w -= 1) {
    const cells: React.ReactNode[] = [];
    for (let d = DAYS - 1; d >= 0; d -= 1) {
      const offset = w * DAYS + d;
      const day = new Date(anchor);
      day.setUTCDate(day.getUTCDate() - offset);
      const iso = day.toISOString().slice(0, 10);
      const count = counts.get(iso) ?? 0;
      const level = heatLevel(count, max);

      cells.push(
        <span
          key={iso}
          className="block size-[9px] rounded-[2px]"
          style={{ backgroundColor: LEVEL_COLOR[level] }}
          title={`${count} on ${iso}`}
        />,
      );
    }
    columns.push(
      <div key={w} className="flex flex-col gap-[3px]">
        {cells.reverse()}
      </div>,
    );
  }

  const total = days.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex gap-[3px] overflow-x-auto pb-1"
        role="img"
        aria-label={`Contribution heatmap: ${total} contributions over the last 53 weeks`}
      >
        {columns.reverse()}
      </div>
      <div className="mt-[10px] flex items-center gap-[7px]">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-faint">less</span>
        {LEVEL_COLOR.map((color) => (
          <span
            key={color}
            aria-hidden
            className="block size-[9px] rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-faint">more</span>
      </div>
    </div>
  );
}
