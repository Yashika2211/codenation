import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ACCENT_HEX, accentRgba, type Accent } from "@/lib/design/accents";

export type BuildingState = "queued" | "building" | "complete" | "dormant";

export type IsoBuilding = {
  id: string;
  name: string;
  /** Drives height: translateZ(level * 15px). */
  level: number;
  accent: Accent;
  state: BuildingState;
  /** Window band spacing in px. Lower = denser. Comes from the database. */
  windowDensity?: number;
  href?: string;
};

export type IsoTile = {
  x: number;
  y: number;
  building?: IsoBuilding;
  /** Replaces the default building body — used by the Forge to render a skin. */
  content?: React.ReactNode;
};

type IsoPlateProps = {
  /** Grid is size × size. 5 for the city, 6 for a nation. */
  size: number;
  tiles: IsoTile[];
  className?: string;
  gap?: number;
  /** Degrees of Z rotation. 45 is the canonical view. */
  rotate?: number;
};

const STATE_OPACITY: Record<BuildingState, number> = {
  complete: 1,
  building: 0.72,
  queued: 0.4,
  dormant: 0.34,
};

/**
 * The CSS-3D plate. A flat grid tipped back 57° and spun 45°, with each
 * building lifted along Z by its level. Nothing here is a hardcoded skyline —
 * height, accent and window density all arrive from the caller.
 */
export function IsoPlate({ size, tiles, className, gap = 9, rotate = 45 }: IsoPlateProps) {
  const byKey = new Map<string, IsoTile>();
  for (const tile of tiles) byKey.set(`${tile.x}:${tile.y}`, tile);

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = byKey.get(`${x}:${y}`);
      cells.push(<IsoCell key={`${x}:${y}`} x={x} y={y} tile={tile} />);
    }
  }

  return (
    <div
      className={cn(
        // A square rotated 45deg needs sqrt(2) times its width to avoid
        // clipping, so the plate is scaled down until the viewport can hold it.
        "relative w-full [--iso-scale:0.68] sm:[--iso-scale:0.82] lg:[--iso-scale:1]",
        className,
      )}
      style={{ perspective: "1400px" }}
    >
      <div
        className="grid aspect-square w-full"
        style={{
          transform: `perspective(1400px) rotateX(57deg) rotateZ(${rotate}deg) scale(var(--iso-scale))`,
          transformStyle: "preserve-3d",
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap,
        }}
      >
        {cells}
      </div>
    </div>
  );
}

function IsoCell({ x, y, tile }: { x: number; y: number; tile: IsoTile | undefined }) {
  const building = tile?.building;

  if (!building && !tile?.content) {
    return (
      <div
        className="relative aspect-square rounded-[4px] border border-[rgb(124_140_180/0.1)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgb(124 140 180 / 0.06) 0 1px, transparent 1px 6px)",
        }}
      />
    );
  }

  const body = tile?.content ?? (building ? <BuildingBody building={building} /> : null);

  return (
    <div
      className="relative aspect-square rounded-[4px] border border-[rgb(124_140_180/0.12)]"
      style={{ transformStyle: "preserve-3d" }}
      data-grid={`${x},${y}`}
    >
      {building?.href ? (
        <Link
          href={building.href}
          className="absolute inset-0 rounded-[5px]"
          style={{ transformStyle: "preserve-3d" }}
          aria-label={building.name}
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

function BuildingBody({ building }: { building: IsoBuilding }) {
  const height = Math.max(1, building.level) * 15;
  const hex = ACCENT_HEX[building.accent];
  const density = building.windowDensity ?? 7;

  return (
    <div
      className="absolute rounded-[5px]"
      style={{
        inset: "12%",
        border: `1px solid ${hex}`,
        opacity: STATE_OPACITY[building.state],
        backgroundImage: [
          `repeating-linear-gradient(180deg, rgb(255 255 255 / 0.14) 0 1px, transparent 1px ${density}px)`,
          "linear-gradient(155deg, rgb(255 255 255 / 0.12), rgb(6 7 13 / 0.8))",
        ].join(", "),
        boxShadow: `0 0 38px -6px ${hex}, 0 ${height}px 0 -2px rgb(6 7 13 / 0.88)`,
        transform: `translateZ(${height}px)`,
      }}
    >
      {building.state === "building" ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] cn-anim-scan"
          style={{ backgroundColor: accentRgba(building.accent, 0.8) }}
        />
      ) : null}
      <span className="sr-only">
        {building.name}, level {building.level}, {building.state}
      </span>
    </div>
  );
}
