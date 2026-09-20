import { cn } from "@/lib/utils/cn";

const ACCENT_RGB = ["59 232 176", "124 107 255", "232 79 168", "95 200 255"] as const;

/**
 * Falling data lines behind the hero: 1px verticals that fade to transparent at
 * both ends, staggered so the column never pulses in unison. Driven by the
 * `cn-stream` keyframe, which is disabled under `prefers-reduced-motion`.
 */
export function DataStreams({
  count = 26,
  className,
}: {
  count?: number;
  className?: string;
}) {
  // Seeded so the server and client render identical delays.
  let state = 20260921;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };

  const lines = Array.from({ length: count }, (_, i) => {
    const rgb = ACCENT_RGB[i % ACCENT_RGB.length] ?? ACCENT_RGB[0];
    return {
      left: (i / count) * 100 + next() * 2.4,
      height: 90 + next() * 190,
      delay: next() * 7,
      duration: 5.5 + next() * 4.5,
      rgb,
      opacity: 0.3 + next() * 0.45,
    };
  });

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {lines.map((line, i) => (
        <span
          key={i}
          className="absolute top-0 block w-px cn-anim-stream"
          style={{
            left: `${line.left}%`,
            height: line.height,
            opacity: line.opacity,
            animationDelay: `${line.delay}s`,
            animationDuration: `${line.duration}s`,
            backgroundImage: `linear-gradient(180deg, transparent, rgb(${line.rgb} / 0.9) 42%, rgb(${line.rgb} / 0.9) 58%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}
