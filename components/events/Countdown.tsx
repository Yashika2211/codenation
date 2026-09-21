"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/Label";

/**
 * A real countdown to a real timestamp.
 *
 * Renders the server-computed remainder first so there is no hydration
 * mismatch, then ticks on the client.
 */
export function Countdown({
  target,
  label,
  className,
}: {
  target: string;
  label: string;
  className?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const parts =
    remaining === null
      ? null
      : {
          days: Math.floor(remaining / 86_400_000),
          hours: Math.floor((remaining % 86_400_000) / 3_600_000),
          minutes: Math.floor((remaining % 3_600_000) / 60_000),
          seconds: Math.floor((remaining % 60_000) / 1000),
        };

  return (
    <div className={cn("", className)}>
      <Label as="div">{label}</Label>
      <div className="mt-2 flex items-baseline gap-4">
        {parts === null ? (
          <span className="font-mono text-[13px] text-ghost">—</span>
        ) : (
          (
            [
              ["days", parts.days],
              ["hrs", parts.hours],
              ["min", parts.minutes],
              ["sec", parts.seconds],
            ] as const
          ).map(([unit, value]) => (
            <span key={unit} className="flex flex-col items-center">
              <span className="font-display text-[26px] font-extrabold leading-none tabular-nums tracking-[-0.03em] text-text sm:text-[30px]">
                {String(value).padStart(2, "0")}
              </span>
              <span className="mt-[5px] font-mono text-[9px] uppercase tracking-[0.18em] text-ghost">
                {unit}
              </span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
