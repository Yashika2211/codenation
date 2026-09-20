import { cn } from "@/lib/utils/cn";

type AtmosphereProps = {
  children: React.ReactNode;
  className?: string;
  /** Adds a faint 48px measuring grid over the glow pools. */
  grid?: boolean;
};

/**
 * The ground every full page stands on: a near-black void with two radial glow
 * pools bleeding in from the top corners, plus an optional hairline grid.
 * Both overlays are `pointer-events-none` and sit behind page content.
 */
export function Atmosphere({ children, className, grid = true }: AtmosphereProps) {
  return (
    <div className={cn("relative min-h-dvh cn-atmosphere", className)}>
      {grid ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 cn-grid-overlay [mask-image:radial-gradient(1200px_700px_at_50%_0%,black,transparent_78%)]"
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
