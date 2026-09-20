import { Panel } from "@/components/ui/Panel";
import { Label, Kicker } from "@/components/ui/Label";
import { renderMetric, type Telemetry } from "@/lib/queries/telemetry";

const ROWS = [
  { key: "citizens", label: "Citizens", note: "seeded accounts excluded" },
  { key: "nations", label: "Nations founded", note: "2,500 rep to found" },
  { key: "problems", label: "Problems live", note: "public set" },
  { key: "submissions", label: "Submissions judged", note: "all time" },
  { key: "accepted", label: "Accepted", note: "verdict: accepted" },
  { key: "buildings", label: "Buildings standing", note: "complete state" },
] as const;

/**
 * Real counts or an honest dash. There is no third option — a placeholder
 * number here would be the exact dishonesty section 11 forbids.
 */
export function TelemetryPanel({ telemetry }: { telemetry: Telemetry }) {
  return (
    <Panel variant="solid" className="overflow-hidden p-6 sm:p-7" sheen>
      <div className="flex items-center justify-between gap-4">
        <Kicker>Live telemetry</Kicker>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ghost">
          {telemetry.live ? "reading from database" : "awaiting first deploy"}
        </span>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <div>
              <dt className="text-[13.5px] font-medium text-muted">{row.label}</dt>
              <p className="mt-[3px] font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                {row.note}
              </p>
            </div>
            <dd className="font-display text-[22px] font-extrabold tabular-nums tracking-[-0.03em] text-text">
              {renderMetric(telemetry[row.key], telemetry.live)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-[12px] leading-relaxed text-ghost">
        Every figure above is a direct count. Nothing on this page is a projection, a rounded
        marketing number, or a placeholder dressed up as a metric.
      </p>
      <Label as="p" className="mt-4">
        Updated on each request
      </Label>
    </Panel>
  );
}
