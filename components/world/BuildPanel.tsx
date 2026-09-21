"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { claimParcel, startConstruction } from "@/lib/world/actions";
import { ACCENT_HEX, toAccent } from "@/lib/design/accents";
import type { BlueprintRow } from "@/lib/supabase/types";

type Parcel = { id: string; x: number; y: number; hasBuilding: boolean };

type BuildPanelProps = {
  parcels: Parcel[];
  blueprints: BlueprintRow[];
  reputation: number;
  allowance: number;
  gridSize: number;
};

const SELECT =
  "min-h-[44px] w-full rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[12px] " +
  "text-[13px] text-text focus:border-[rgb(59_232_176/0.45)] focus:outline-none";

export function BuildPanel({
  parcels,
  blueprints,
  reputation,
  allowance,
  gridSize,
}: BuildPanelProps) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const free = parcels.filter((p) => !p.hasBuilding);
  const affordable = blueprints.filter((b) => reputation >= b.requires_rep);

  const [parcelId, setParcelId] = useState(free[0]?.id ?? "");
  const [blueprint, setBlueprint] = useState(affordable[0]?.slug ?? "");

  // The next free coordinate on the grid, so claiming is one click.
  const taken = new Set(parcels.map((p) => `${p.x}:${p.y}`));
  let nextX = 0;
  let nextY = 0;
  outer: for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!taken.has(`${x}:${y}`)) {
        nextX = x;
        nextY = y;
        break outer;
      }
    }
  }

  const atAllowance = parcels.length >= allowance;

  function run(action: (data: FormData) => Promise<{ ok: boolean; message: string }>, data: FormData) {
    startTransition(async () => {
      const result = await action(data);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <Panel className="p-5">
      <Label as="div">Construction</Label>

      {/* claim */}
      <div className="mt-4 border-b border-line pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-muted">Parcels held</span>
          <span className="font-mono text-[11.5px] tabular-nums text-faint">
            {parcels.length} / {allowance}
          </span>
        </div>

        {allowance === 0 ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
            Land opens at Engineer — 1,000 reputation.
          </p>
        ) : (
          <form
            action={(data) => run(claimParcel, data)}
            className="mt-3 flex items-center gap-2"
          >
            <input type="hidden" name="grid_x" value={nextX} />
            <input type="hidden" name="grid_y" value={nextY} />
            <Button
              type="submit"
              variant="outline"
              accent="signal"
              size="sm"
              disabled={pending || atAllowance}
            >
              {atAllowance ? "Allowance reached" : `Claim ${nextX},${nextY}`}
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
              {(320 * (parcels.length + 1)).toLocaleString("en-US")} cmp
            </span>
          </form>
        )}
      </div>

      {/* build */}
      <form action={(data) => run(startConstruction, data)} className="mt-4 space-y-3">
        <div>
          <label htmlFor="parcel_id" className="mb-2 block">
            <Label>Parcel</Label>
          </label>
          <select
            id="parcel_id"
            name="parcel_id"
            value={parcelId}
            onChange={(e) => setParcelId(e.target.value)}
            className={SELECT}
            disabled={free.length === 0}
          >
            {free.length === 0 ? (
              <option value="">No empty parcel</option>
            ) : (
              free.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.x}, {parcel.y}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="blueprint" className="mb-2 block">
            <Label>Blueprint</Label>
          </label>
          <select
            id="blueprint"
            name="blueprint"
            value={blueprint}
            onChange={(e) => setBlueprint(e.target.value)}
            className={SELECT}
            disabled={affordable.length === 0}
          >
            {affordable.length === 0 ? (
              <option value="">Nothing unlocked yet</option>
            ) : (
              affordable.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))
            )}
          </select>
        </div>

        {blueprint ? <BlueprintSummary blueprints={blueprints} slug={blueprint} /> : null}

        <Button
          type="submit"
          fullWidth
          disabled={pending || free.length === 0 || affordable.length === 0}
        >
          {pending ? "Working…" : "Begin construction"}
        </Button>
      </form>

      {message ? (
        <p
          role="status"
          className={`mt-3 text-[12.5px] leading-relaxed ${message.ok ? "text-flux" : "text-[#FF8A9C]"}`}
        >
          {message.text}
        </p>
      ) : null}

      {blueprints.length > affordable.length ? (
        <p className="mt-4 border-t border-line pt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
          {blueprints.length - affordable.length} blueprints locked by reputation
        </p>
      ) : null}
    </Panel>
  );
}

function BlueprintSummary({ blueprints, slug }: { blueprints: BlueprintRow[]; slug: string }) {
  const item = blueprints.find((b) => b.slug === slug);
  if (!item) return null;

  const cost = (item.base_cost ?? {}) as Record<string, number>;
  const accent = toAccent(item.default_accent);

  return (
    <div className="rounded-card border border-line bg-glass px-[13px] py-[11px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] leading-relaxed text-muted">{item.description}</p>
        <span
          aria-hidden
          className="mt-1 block size-[8px] shrink-0 rotate-45 rounded-[1px]"
          style={{ backgroundColor: ACCENT_HEX[accent] }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cost.compute ? <Tag accent="flux">{cost.compute} cmp</Tag> : null}
        {cost.data ? <Tag accent="signal">{cost.data} dat</Tag> : null}
        {cost.alloy ? <Tag accent="amber">{cost.alloy} aly</Tag> : null}
      </div>

      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
        {item.build_minutes}min build · {item.upkeep_compute} cmp upkeep per 6h cycle
      </p>
    </div>
  );
}
