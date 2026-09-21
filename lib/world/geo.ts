/**
 * Country code -> approximate centroid -> projected atlas coordinates.
 *
 * The atlas is an orbital map, not a Mercator one: nations sit on a projected
 * plane where x follows longitude and y follows latitude, compressed toward the
 * poles so the high-latitude countries do not fly off the panel.
 *
 * Coordinates are approximate national centroids, which is all a nation marker
 * needs. A country not in this table is placed deterministically from its code
 * rather than dropped, so the atlas never silently loses a nation.
 */

export type LatLong = { lat: number; lon: number };

export const COUNTRY_CENTROIDS: Record<string, LatLong> = {
  AE: { lat: 24.0, lon: 54.0 }, AR: { lat: -34.0, lon: -64.0 }, AT: { lat: 47.3, lon: 13.3 },
  AU: { lat: -25.3, lon: 133.8 }, BD: { lat: 23.7, lon: 90.4 }, BE: { lat: 50.5, lon: 4.5 },
  BR: { lat: -14.2, lon: -51.9 }, CA: { lat: 56.1, lon: -106.3 }, CH: { lat: 46.8, lon: 8.2 },
  CL: { lat: -35.7, lon: -71.5 }, CN: { lat: 35.9, lon: 104.2 }, CO: { lat: 4.6, lon: -74.3 },
  CZ: { lat: 49.8, lon: 15.5 }, DE: { lat: 51.2, lon: 10.5 }, DK: { lat: 56.3, lon: 9.5 },
  EG: { lat: 26.8, lon: 30.8 }, ES: { lat: 40.5, lon: -3.7 }, FI: { lat: 61.9, lon: 25.7 },
  FR: { lat: 46.2, lon: 2.2 }, GB: { lat: 55.4, lon: -3.4 }, GR: { lat: 39.1, lon: 21.8 },
  HK: { lat: 22.3, lon: 114.2 }, HU: { lat: 47.2, lon: 19.5 }, ID: { lat: -0.8, lon: 113.9 },
  IE: { lat: 53.4, lon: -8.2 }, IL: { lat: 31.0, lon: 34.9 }, IN: { lat: 20.6, lon: 79.0 },
  IR: { lat: 32.4, lon: 53.7 }, IT: { lat: 41.9, lon: 12.6 }, JP: { lat: 36.2, lon: 138.3 },
  KE: { lat: -0.0, lon: 37.9 }, KR: { lat: 35.9, lon: 127.8 }, MA: { lat: 31.8, lon: -7.1 },
  MX: { lat: 23.6, lon: -102.6 }, MY: { lat: 4.2, lon: 101.98 }, NG: { lat: 9.1, lon: 8.7 },
  NL: { lat: 52.1, lon: 5.3 }, NO: { lat: 60.5, lon: 8.5 }, NZ: { lat: -40.9, lon: 174.9 },
  PE: { lat: -9.2, lon: -75.0 }, PH: { lat: 12.9, lon: 121.8 }, PK: { lat: 30.4, lon: 69.3 },
  PL: { lat: 51.9, lon: 19.1 }, PT: { lat: 39.4, lon: -8.2 }, RO: { lat: 45.9, lon: 25.0 },
  RS: { lat: 44.0, lon: 21.0 }, RU: { lat: 61.5, lon: 105.3 }, SA: { lat: 23.9, lon: 45.1 },
  SE: { lat: 60.1, lon: 18.6 }, SG: { lat: 1.35, lon: 103.8 }, TH: { lat: 15.9, lon: 101.0 },
  TR: { lat: 39.0, lon: 35.2 }, TW: { lat: 23.7, lon: 121.0 }, UA: { lat: 48.4, lon: 31.2 },
  US: { lat: 37.1, lon: -95.7 }, VN: { lat: 14.06, lon: 108.3 }, ZA: { lat: -30.6, lon: 22.9 },
};

/** Deterministic fallback so an unmapped country still lands somewhere stable. */
function fallbackCentroid(code: string): LatLong {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  return {
    lat: ((hash % 120) - 60) * 0.9,
    lon: (((hash >> 8) % 340) - 170) * 0.95,
  };
}

export function centroidFor(code: string | null | undefined): LatLong {
  if (!code) return { lat: 12, lon: 0 };
  const upper = code.toUpperCase();
  return COUNTRY_CENTROIDS[upper] ?? fallbackCentroid(upper);
}

export type Projected = { x: number; y: number };

/**
 * Projects a centroid into the atlas viewBox.
 *
 * Longitude maps linearly across the width. Latitude is passed through a
 * sine-eased compression so the poles pull inward — the map reads as an orbital
 * band rather than a rectangle, and nothing clips at the top or bottom edge.
 */
export function project(
  { lat, lon }: LatLong,
  width: number,
  height: number,
  padding = 0.08,
): Projected {
  const padX = width * padding;
  const padY = height * padding;

  const x = padX + ((lon + 180) / 360) * (width - padX * 2);

  // Ease latitude toward the equator so high-latitude nations stay on-panel.
  const normalised = Math.max(-1, Math.min(1, lat / 90));
  const eased = Math.sin((normalised * Math.PI) / 2) * 0.82;
  const y = padY + ((1 - eased) / 2) * (height - padY * 2);

  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
}

/**
 * Nudges nations that land on the same pixel apart, so two countries with the
 * same centroid do not render as one marker.
 */
export function deconflict(points: Array<Projected & { id: string }>, minDistance = 26): void {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= minDistance || distance === 0) {
        if (distance === 0) {
          // Identical centroids: push apart along a stable axis.
          b.x += minDistance * 0.6;
          b.y += minDistance * 0.35;
        }
        continue;
      }

      const push = (minDistance - distance) / 2;
      const ux = dx / distance;
      const uy = dy / distance;
      a.x -= ux * push;
      a.y -= uy * push;
      b.x += ux * push;
      b.y += uy * push;
    }
  }
}

/** A quadratic arc between two points, bowed away from the map centre. */
export function arcPath(a: Projected, b: Projected, bow = 0.22): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;

  // Perpendicular offset, so parallel routes do not overlap.
  const cx = mx - (dy / length) * length * bow;
  const cy = my + (dx / length) * length * bow;

  return `M ${a.x} ${a.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${b.x} ${b.y}`;
}
