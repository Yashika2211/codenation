import { cn } from "@/lib/utils/cn";

type Tower = {
  /** Percentage from the left edge. */
  left: number;
  width: number;
  height: number;
  /** Window band spacing in px. */
  density: number;
};

type Layer = {
  towers: Tower[];
  hex: string;
  rgb: string;
  opacity: number;
  blur: number;
  /** Parallax offset applied on scroll by the CSS below. */
  depth: number;
};

/**
 * Deterministic tower runs. Generated from a seeded LCG rather than a literal
 * array so each layer reads as a real skyline instead of a repeating motif, and
 * so the server and client always agree on the markup.
 */
function towers(seed: number, count: number, baseHeight: number, spread: number): Tower[] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const out: Tower[] = [];
  for (let i = 0; i < count; i += 1) {
    const slot = (i / count) * 100;
    out.push({
      left: slot + next() * (100 / count) * 0.5,
      width: 2.6 + next() * spread,
      height: baseHeight + next() * baseHeight * 0.85,
      density: 6 + Math.floor(next() * 5),
    });
  }
  return out;
}

const LAYERS: Layer[] = [
  {
    towers: towers(9173, 18, 120, 3.4),
    hex: "#7C6BFF",
    rgb: "124 107 255",
    opacity: 0.32,
    blur: 2.5,
    depth: 0,
  },
  {
    towers: towers(4421, 13, 170, 4.2),
    hex: "#3BE8B0",
    rgb: "59 232 176",
    opacity: 0.44,
    blur: 1,
    depth: 1,
  },
  {
    towers: towers(7733, 9, 230, 5.6),
    hex: "#E84FA8",
    rgb: "232 79 168",
    opacity: 0.55,
    blur: 0,
    depth: 2,
  },
];

/**
 * Three parallax layers of CSS towers: far violet, mid cyan, near magenta.
 * Windows are a `repeating-linear-gradient`; the glow is a per-tower box-shadow.
 * Entirely presentational, so it stays a Server Component.
 */
export function Skyline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden", className)}
    >
      {LAYERS.map((layer) => (
        <div
          key={layer.hex}
          className="absolute inset-x-0 bottom-0"
          style={{
            height: 340,
            opacity: layer.opacity,
            filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
            transform: `translateY(${layer.depth * 6}px)`,
          }}
        >
          {layer.towers.map((tower, i) => (
            <div
              key={`${layer.hex}-${i}`}
              className="absolute bottom-0 rounded-t-[3px]"
              style={{
                left: `${tower.left}%`,
                width: `${tower.width}%`,
                height: tower.height,
                border: `1px solid rgb(${layer.rgb} / 0.55)`,
                borderBottom: "none",
                backgroundImage: [
                  `repeating-linear-gradient(180deg, rgb(${layer.rgb} / 0.22) 0 1px, transparent 1px ${tower.density}px)`,
                  `linear-gradient(180deg, rgb(${layer.rgb} / 0.16), rgb(6 7 13 / 0.94))`,
                ].join(", "),
                boxShadow: `0 0 42px -10px ${layer.hex}`,
              }}
            />
          ))}
        </div>
      ))}

      {/* Fades the skyline into the void so it never ends on a hard line. */}
      <div className="absolute inset-x-0 bottom-0 h-[340px] bg-gradient-to-t from-void via-void/55 to-transparent" />
    </div>
  );
}
