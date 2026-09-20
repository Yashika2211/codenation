import { cn } from "@/lib/utils/cn";

export type SkillAxis = {
  label: string;
  /** 0–1. Clamped before it reaches the polygon. */
  value: number;
};

type SkillRadarProps = {
  /** Six axes render the canonical hexagon; other counts still work. */
  axes: SkillAxis[];
  size?: number;
  className?: string;
};

function pointOn(cx: number, cy: number, radius: number, index: number, count: number) {
  // Start at 12 o'clock so the first axis reads as the primary one.
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function SkillRadar({ axes, size = 220, className }: SkillRadarProps) {
  const count = Math.max(3, axes.length);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;

  const ring = (scale: number) =>
    Array.from({ length: count }, (_, i) => {
      const p = pointOn(cx, cy, radius * scale, i, count);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(" ");

  const filled = axes
    .map((axis, i) => {
      const value = Math.max(0.04, Math.min(1, axis.value));
      const p = pointOn(cx, cy, radius * value, i, count);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Skill radar: ${axes
          .map((a) => `${a.label} ${Math.round(a.value * 100)}%`)
          .join(", ")}`}
      >
        <polygon points={ring(1)} fill="none" stroke="rgb(124 140 180 / 0.18)" strokeWidth="1" />
        <polygon points={ring(0.62)} fill="none" stroke="rgb(124 140 180 / 0.13)" strokeWidth="1" />

        {axes.map((axis, i) => {
          const outer = pointOn(cx, cy, radius, i, count);
          return (
            <line
              key={axis.label}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgb(124 140 180 / 0.12)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={filled}
          fill="rgb(59 232 176 / 0.18)"
          stroke="#3BE8B0"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {axes.map((axis, i) => {
          const value = Math.max(0.04, Math.min(1, axis.value));
          const p = pointOn(cx, cy, radius * value, i, count);
          return <circle key={axis.label} cx={p.x} cy={p.y} r="3" fill="#3BE8B0" />;
        })}

        {axes.map((axis, i) => {
          const p = pointOn(cx, cy, radius * 1.32, i, count);
          return (
            <text
              key={axis.label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-faint)"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {axis.label.toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
