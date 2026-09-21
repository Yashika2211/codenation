"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Label, Kicker } from "@/components/ui/Label";
import { Tag, RarityTag, type Rarity } from "@/components/ui/Tag";
import { ForgedBuilding } from "./ForgedBuilding";
import { craftItem } from "@/lib/forge/craft";
import {
  SILHOUETTES,
  FACADES,
  CROWNS,
  MOTIFS,
  PALETTES,
  EMISSIVE_CAP,
  CROWN_REQUIREMENT,
  SILHOUETTE_REQUIREMENT,
  MOTIF_REQUIREMENT,
  rarityAtLeast,
  validateForRarity,
  costFor,
  defaultParams,
  inscriptionIsAllowed,
  type ForgeParams,
} from "@/lib/forge/params";
import type { RarityDb } from "@/lib/supabase/types";

export type ForgeDefinition = {
  slug: string;
  name: string;
  kind: string;
  rarity: RarityDb;
  description: string;
  cost: { compute?: number; data?: number; alloy?: number };
  requiresRep: number;
  techMastered: boolean;
  techRequired: number;
};

type Props = {
  definitions: ForgeDefinition[];
  reputation: number;
  wallet: { compute: number; data: number; alloy: number };
};

/**
 * The Forge floor.
 *
 * Everything updates as you move a control: the building re-renders, the cost
 * recalculates, and any setting your rarity cannot carry says so immediately.
 * The same validation runs again on the server — this copy exists so the player
 * is never surprised, not to be trusted.
 */
export function ForgeStudio({ definitions, reputation, wallet }: Props) {
  const [slug, setSlug] = useState(definitions[0]?.slug ?? "");
  const [params, setParams] = useState<ForgeParams>(defaultParams);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const definition = definitions.find((d) => d.slug === slug) ?? definitions[0];

  const rarity: RarityDb = definition?.rarity ?? "common";
  const cap = EMISSIVE_CAP[rarity];

  const issues = useMemo(
    () => (definition ? validateForRarity(params, rarity, reputation) : []),
    [definition, params, rarity, reputation],
  );

  const cost = useMemo(
    () => costFor(definition?.cost ?? {}, rarity),
    [definition, rarity],
  );

  const affordable =
    wallet.compute >= cost.compute && wallet.data >= cost.data && wallet.alloy >= cost.alloy;

  const blocked =
    !definition ||
    issues.length > 0 ||
    !affordable ||
    !definition.techMastered ||
    reputation < definition.requiresRep;

  function update<K extends keyof ForgeParams>(key: K, value: ForgeParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  }

  function craft() {
    if (!definition) return;
    startTransition(async () => {
      const response = await craftItem({ definitionSlug: definition.slug, params });
      setResult({ ok: response.ok, text: response.message });
    });
  }

  if (!definition) {
    return (
      <Panel className="p-8 text-center">
        <p className="text-[13.5px] text-dim">
          No craftable definitions are loaded. Apply the seed first.
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr_minmax(0,20rem)] lg:items-start">
      {/* ---- definition picker ---- */}
      <Panel className="p-5">
        <Kicker color="#E84FA8">Base</Kicker>
        <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {definitions.map((item) => {
            const active = item.slug === slug;
            const locked = reputation < item.requiresRep || !item.techMastered;

            return (
              <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setSlug(item.slug);
                    setResult(null);
                  }}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-card border px-[13px] py-[11px] text-left transition-colors",
                    active
                      ? "border-[rgb(232_79_168/0.4)] bg-[rgb(232_79_168/0.1)]"
                      : "border-line bg-glass hover:bg-glass-hi",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-[13.5px] font-bold",
                        locked ? "text-dim" : "text-text",
                      )}
                    >
                      {item.name}
                    </span>
                    <RarityTag rarity={item.rarity as Rarity} />
                  </div>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ghost">
                    {item.kind.replace(/_/g, " ")}
                    {locked
                      ? ` · locked at ${item.requiresRep.toLocaleString("en-US")} rep`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* ---- live preview ---- */}
      <div className="space-y-4">
        <Panel variant="solid" className="relative overflow-hidden p-6 sm:p-8" sheen>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 cn-grid-overlay opacity-50 [mask-image:radial-gradient(360px_280px_at_50%_60%,black,transparent)]"
          />
          <div className="relative flex min-h-[320px] items-end justify-center pb-6">
            <ForgedBuilding params={params} height={190} showInscription />
          </div>

          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-5">
            <Tag accent="plasma">{params.silhouette}</Tag>
            <Tag accent="ion">{params.facade}</Tag>
            {params.crown !== "none" ? <Tag accent="amber">{params.crown}</Tag> : null}
            <Tag accent="signal">{params.motif}</Tag>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
              emissive {params.emissiveIntensity.toFixed(2)}
            </span>
          </div>
        </Panel>

        {/* ---- parameters ---- */}
        <Panel className="p-5">
          <Kicker>Parameters</Kicker>

          <div className="mt-5 space-y-5">
            <Choice
              label="Silhouette"
              options={SILHOUETTES}
              value={params.silhouette}
              onChange={(v) => update("silhouette", v)}
              lockedFor={(v) => !rarityAtLeast(rarity, SILHOUETTE_REQUIREMENT[v])}
              requirement={(v) => SILHOUETTE_REQUIREMENT[v]}
            />

            <Choice
              label="Facade"
              options={FACADES}
              value={params.facade}
              onChange={(v) => update("facade", v)}
            />

            <Choice
              label="Crown"
              options={CROWNS}
              value={params.crown}
              onChange={(v) => update("crown", v)}
              lockedFor={(v) => !rarityAtLeast(rarity, CROWN_REQUIREMENT[v])}
              requirement={(v) => CROWN_REQUIREMENT[v]}
            />

            <Choice
              label="Motif"
              options={MOTIFS}
              value={params.motif}
              onChange={(v) => update("motif", v)}
              lockedFor={(v) => !rarityAtLeast(rarity, MOTIF_REQUIREMENT[v] ?? "common")}
              requirement={(v) => MOTIF_REQUIREMENT[v] ?? "common"}
            />

            {/* palette */}
            <div>
              <Label as="div">Palette</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PALETTES.map((palette) => {
                  const locked = reputation < palette.requiresRep;
                  const active = params.palette.accent === palette.accent;

                  return (
                    <button
                      key={palette.slug}
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        update("palette", {
                          base: palette.base,
                          accent: palette.accent,
                          emissive: palette.emissive,
                        })
                      }
                      title={
                        locked
                          ? `${palette.name} unlocks at ${palette.requiresRep.toLocaleString("en-US")} reputation`
                          : palette.name
                      }
                      aria-label={palette.name}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-2 rounded-chip border px-[11px] transition-colors",
                        active ? "border-flux bg-[rgb(59_232_176/0.1)]" : "border-line",
                        locked && "opacity-35",
                      )}
                    >
                      <span
                        aria-hidden
                        className="block size-[12px] rotate-45 rounded-[2px]"
                        style={{
                          backgroundColor: palette.accent,
                          boxShadow: `0 0 10px -1px ${palette.emissive}`,
                        }}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                        {palette.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* emissive */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="emissive">
                  <Label>Emissive intensity</Label>
                </label>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {params.emissiveIntensity.toFixed(2)} / {cap.toFixed(2)} max
                </span>
              </div>
              <input
                id="emissive"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.emissiveIntensity}
                onChange={(e) => update("emissiveIntensity", Number(e.target.value))}
                className="mt-3 h-[26px] w-full cursor-pointer accent-[#3BE8B0]"
              />
              {params.emissiveIntensity > cap ? (
                <p className="mt-1 text-[11.5px] text-[#FF8A9C]">
                  {rarity} caps emissive at {cap.toFixed(2)}.
                </p>
              ) : null}
            </div>

            {/* inscription */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="inscription">
                  <Label>Inscription</Label>
                </label>
                <span className="font-mono text-[10px] tabular-nums text-ghost">
                  {params.inscription.length}/24
                </span>
              </div>
              <input
                id="inscription"
                type="text"
                maxLength={24}
                value={params.inscription}
                onChange={(e) => update("inscription", e.target.value)}
                placeholder="Shown on hover"
                className="mt-2 min-h-[44px] w-full rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[13px] text-[13px] text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none"
              />
              {params.inscription.length > 0 && !inscriptionIsAllowed(params.inscription) ? (
                <p className="mt-1 text-[11.5px] text-[#FF8A9C]">That inscription is not allowed.</p>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>

      {/* ---- cost and craft ---- */}
      <Panel className="p-5 lg:sticky lg:top-[80px]">
        <Kicker color="#F2B441">Cost</Kicker>

        <div className="mt-4 space-y-[10px]">
          <CostRow label="Compute" value={cost.compute} held={wallet.compute} accent="#3BE8B0" />
          <CostRow label="Data" value={cost.data} held={wallet.data} accent="#5FC8FF" />
          <CostRow label="Alloy" value={cost.alloy} held={wallet.alloy} accent="#F2B441" />
        </div>

        <p className="mt-4 border-t border-line pt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
          base x {rarity} multiplier
        </p>

        {issues.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`} className="text-[12px] text-[#FF8A9C]">
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        {!definition.techMastered ? (
          <p className="mt-4 border-t border-line pt-4 text-[12px] text-amber">
            Requires {definition.techRequired} mastered technolog
            {definition.techRequired === 1 ? "y" : "ies"}.
          </p>
        ) : null}

        <Button
          className="mt-5"
          fullWidth
          size="lg"
          accent="plasma"
          onClick={craft}
          disabled={blocked || pending}
        >
          {pending ? "Forging…" : `Forge ${definition.name}`}
        </Button>

        {!affordable ? (
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            insufficient resources
          </p>
        ) : null}

        {result ? (
          <p
            role="status"
            className={cn(
              "mt-4 text-[12.5px] leading-relaxed",
              result.ok ? "text-flux" : "text-[#FF8A9C]",
            )}
          >
            {result.text}
          </p>
        ) : null}

        <p className="mt-5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ghost">
          Crafted items are bound to you. Only common and rare can be unbound later, for alloy —
          which is what keeps the marketplace safe.
        </p>
      </Panel>
    </div>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  lockedFor,
  requirement,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  lockedFor?: (value: T) => boolean;
  requirement?: (value: T) => string;
}) {
  return (
    <div>
      <Label as="div">{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const locked = lockedFor?.(option) ?? false;
          const active = option === value;

          return (
            <button
              key={option}
              type="button"
              disabled={locked}
              onClick={() => onChange(option)}
              title={locked && requirement ? `Requires ${requirement(option)}` : option}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-chip border px-[13px] font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                active
                  ? "border-[rgb(59_232_176/0.4)] bg-[rgb(59_232_176/0.1)] text-flux"
                  : "border-line text-dim hover:text-text",
                locked && "cursor-not-allowed opacity-35",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CostRow({
  label,
  value,
  held,
  accent,
}: {
  label: string;
  value: number;
  held: number;
  accent: string;
}) {
  if (value === 0) return null;
  const enough = held >= value;

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="block size-[8px] rotate-45 rounded-[1px]"
        style={{ backgroundColor: accent }}
      />
      <span className="flex-1 text-[13px] text-muted">{label}</span>
      <span
        className={cn(
          "font-mono text-[12px] tabular-nums",
          enough ? "text-text" : "text-[#FF8A9C]",
        )}
      >
        {value.toLocaleString("en-US")}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-ghost">
        / {held.toLocaleString("en-US")}
      </span>
    </div>
  );
}
