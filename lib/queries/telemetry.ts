/**
 * Platform telemetry for the entry portal.
 *
 * Section 11 of the spec is absolute: never render a fabricated number as a
 * platform metric. Until Supabase is wired (M2) this returns `live: false` and
 * the UI renders a dash instead of inventing a count. When the database is
 * present the same shape carries real rows — the component never changes.
 */

export type Telemetry = {
  live: boolean;
  /** Excludes `profiles.is_seed = true`. */
  citizens: number;
  nations: number;
  problems: number;
  submissions: number;
  accepted: number;
  buildings: number;
};

export const EMPTY_TELEMETRY: Telemetry = {
  live: false,
  citizens: 0,
  nations: 0,
  problems: 0,
  submissions: 0,
  accepted: 0,
  buildings: 0,
};

/** Renders a real count, or an honest dash when there is nothing to report. */
export function renderMetric(value: number, live: boolean): string {
  if (!live) return "—";
  return value.toLocaleString("en-US");
}

export async function getPlatformTelemetry(): Promise<Telemetry> {
  // M2 replaces this with parallel `head: true` count queries against Supabase.
  return EMPTY_TELEMETRY;
}
