import Link from "next/link";
import { ACCENT_HEX, accentRgba } from "@/lib/design/accents";
import { arcPath, ATLAS_WIDTH, ATLAS_HEIGHT } from "@/lib/world/geo";
import type { AtlasNation, AtlasRoute } from "@/lib/queries/atlas";

/**
 * The orbital map.
 *
 * Inline SVG, no projection library: `lib/world/geo.ts` has already turned each
 * nation's country code into a point. Marker size follows prestige, so the map
 * reads as a ranking as well as a geography. Purely presentational, so it stays
 * a Server Component.
 */
export function AtlasMap({
  nations,
  routes,
}: {
  nations: AtlasNation[];
  routes: AtlasRoute[];
}) {
  const bySlug = new Map(nations.map((nation) => [nation.slug, nation]));
  const peakPrestige = Math.max(1, ...nations.map((n) => n.prestige));

  return (
    <svg
      viewBox={`0 0 ${ATLAS_WIDTH} ${ATLAS_HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`World atlas with ${nations.length} nations`}
    >
      <defs>
        <radialGradient id="atlas-glow" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="rgb(124 107 255 / 0.18)" />
          <stop offset="100%" stopColor="rgb(124 107 255 / 0)" />
        </radialGradient>
      </defs>

      <rect width={ATLAS_WIDTH} height={ATLAS_HEIGHT} fill="url(#atlas-glow)" />

      {/* latitude bands and meridians — the orbital grid */}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((fraction) => (
        <ellipse
          key={fraction}
          cx={ATLAS_WIDTH / 2}
          cy={ATLAS_HEIGHT / 2}
          rx={ATLAS_WIDTH * 0.46 * (1 - Math.abs(fraction - 0.5) * 0.6)}
          ry={ATLAS_HEIGHT * 0.44 * (1 - Math.abs(fraction - 0.5) * 0.5)}
          fill="none"
          stroke="rgb(124 140 180 / 0.08)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 9 }, (_, i) => {
        const x = (ATLAS_WIDTH / 8) * i;
        return (
          <line
            key={i}
            x1={x}
            y1={ATLAS_HEIGHT * 0.06}
            x2={x}
            y2={ATLAS_HEIGHT * 0.94}
            stroke="rgb(124 140 180 / 0.05)"
            strokeWidth="1"
          />
        );
      })}

      {/* trade arcs */}
      {routes.map((route) => {
        const from = bySlug.get(route.fromSlug);
        const to = bySlug.get(route.toSlug);
        if (!from || !to) return null;

        return (
          <path
            key={route.id}
            d={arcPath({ x: from.x, y: from.y }, { x: to.x, y: to.y })}
            fill="none"
            stroke={accentRgba(route.accent, 0.5)}
            strokeWidth="1.4"
            strokeDasharray="5 7"
            className="cn-anim-dash"
          />
        );
      })}

      {/* nations */}
      {nations.map((nation) => {
        const hex = ACCENT_HEX[nation.accent];
        const weight = nation.prestige / peakPrestige;
        const radius = 5 + weight * 9;

        return (
          <Link key={nation.id} href={`/n/${nation.slug}`} aria-label={nation.name}>
            <g className="cursor-pointer">
              <circle
                cx={nation.x}
                cy={nation.y}
                r={radius + 12}
                fill={accentRgba(nation.accent, 0.1)}
              />
              <circle
                cx={nation.x}
                cy={nation.y}
                r={radius}
                fill={accentRgba(nation.accent, 0.35)}
                stroke={hex}
                strokeWidth="1.6"
              />
              <circle cx={nation.x} cy={nation.y} r={radius * 0.36} fill={hex} />

              <text
                x={nation.x}
                y={nation.y - radius - 11}
                textAnchor="middle"
                fill="var(--color-text)"
                style={{
                  fontFamily: "var(--font-manrope)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                {nation.name}
              </text>
              <text
                x={nation.x}
                y={nation.y + radius + 16}
                textAnchor="middle"
                fill="var(--color-ghost)"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                }}
              >
                {nation.prestige.toLocaleString("en-US")}
              </text>
            </g>
          </Link>
        );
      })}
    </svg>
  );
}
