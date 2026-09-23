"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/Panel";
import { Label, Kicker, SectionTitle } from "@/components/ui/Label";
import { Meter } from "@/components/ui/Meter";
import { Tag } from "@/components/ui/Tag";
import { ACCENT_HEX, accentRgba, type Accent } from "@/lib/design/accents";
import type { TechNodeView } from "@/lib/queries/tech";
import type { TechState } from "@/lib/supabase/types";

/**
 * The tech tree.
 *
 * Nodes sit at absolute positions from the database, joined by animated SVG
 * beziers. State colouring follows the spec: mastered flux, researching signal
 * with a glow, available ion, locked dim.
 */

const STATE_ACCENT: Record<TechState, Accent> = {
  mastered: "flux",
  researching: "signal",
  available: "ion",
  locked: "signal",
};

const STATE_LABEL: Record<TechState, string> = {
  mastered: "Mastered",
  researching: "Researching",
  available: "Available",
  locked: "Locked",
};

const VIEW_W = 100;
const TIER_ROWS = 4;

export function TechTree({ nodes, branches }: { nodes: TechNodeView[]; branches: string[] }) {
  const [branch, setBranch] = useState(branches[0] ?? "");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const visible = useMemo(
    () => nodes.filter((node) => node.branch === branch),
    [nodes, branch],
  );

  const bySlug = useMemo(
    () => new Map(visible.map((node) => [node.slug, node])),
    [visible],
  );

  const selected =
    (selectedSlug ? bySlug.get(selectedSlug) : undefined) ?? visible[0] ?? null;

  // Edges are drawn in the same normalised space as the node positions.
  const edges = visible.flatMap((node) =>
    node.requires
      .map((requiredSlug) => {
        const from = bySlug.get(requiredSlug);
        if (!from) return null;
        return { id: `${requiredSlug}->${node.slug}`, from, to: node };
      })
      .filter((edge): edge is { id: string; from: TechNodeView; to: TechNodeView } => edge !== null),
  );

  const mastered = visible.filter((n) => n.state === "mastered").length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
      <div>
        {/* branch tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {branches.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setBranch(name);
                setSelectedSlug(null);
              }}
              aria-current={branch === name ? "true" : undefined}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-chip border px-[14px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
                branch === name
                  ? "border-[rgb(59_232_176/0.38)] bg-[rgb(59_232_176/0.12)] text-flux"
                  : "border-line text-dim hover:bg-glass hover:text-text",
              )}
            >
              {name}
            </button>
          ))}

          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            {mastered}/{visible.length} mastered
          </span>
        </div>

        {/* the tree */}
        <Panel variant="solid" className="relative mt-4 overflow-hidden p-4 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 cn-grid-overlay opacity-40"
          />

          <div className="relative aspect-[4/3] min-h-[420px] w-full">
            {/* edges */}
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_W}`}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
              aria-hidden
            >
              {edges.map((edge) => {
                const x1 = edge.from.posX;
                const y1 = edge.from.posY + 6;
                const x2 = edge.to.posX;
                const y2 = edge.to.posY - 2;
                const mid = (y1 + y2) / 2;
                const live = edge.from.state === "mastered";

                return (
                  <path
                    key={edge.id}
                    d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
                    fill="none"
                    stroke={live ? accentRgba("flux", 0.5) : "rgb(124 140 180 / 0.16)"}
                    strokeWidth="0.4"
                    strokeDasharray={live ? "1.4 1.8" : undefined}
                    className={live ? "cn-anim-dash" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* nodes */}
            {visible.map((node) => {
              const accent = STATE_ACCENT[node.state];
              const locked = node.state === "locked";
              const active = selected?.slug === node.slug;

              return (
                <button
                  key={node.slug}
                  type="button"
                  onClick={() => setSelectedSlug(node.slug)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "absolute w-[26%] min-w-[104px] -translate-x-1/2 -translate-y-1/2 rounded-card border px-[11px] py-[9px] text-left transition-colors",
                    locked ? "opacity-45" : "",
                    active ? "ring-1" : "",
                  )}
                  style={{
                    left: `${node.posX}%`,
                    top: `${node.posY}%`,
                    borderColor: locked ? "var(--color-line)" : accentRgba(accent, 0.4),
                    backgroundColor: locked ? "rgb(9 11 18 / 0.85)" : accentRgba(accent, 0.1),
                    boxShadow:
                      node.state === "researching"
                        ? `0 0 26px -8px ${ACCENT_HEX[accent]}`
                        : undefined,
                  }}
                >
                  <span
                    className="block truncate text-[12.5px] font-bold"
                    style={{ color: locked ? "var(--color-dim)" : "var(--color-text)" }}
                  >
                    {node.name}
                  </span>
                  <span
                    className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: locked ? "var(--color-ghost)" : ACCENT_HEX[accent] }}
                  >
                    {STATE_LABEL[node.state]}
                  </span>

                  {node.state === "researching" ? (
                    <span className="mt-2 block">
                      <Meter value={node.progress} accent={accent} height={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}

            {/* tier rails */}
            {Array.from({ length: TIER_ROWS }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute left-0 font-mono text-[9px] uppercase tracking-[0.16em] text-ghost"
                style={{ top: `${12 + i * 26}%`, transform: "translateY(-50%)" }}
              >
                T{i + 1}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* detail rail */}
      <Panel className="p-5 lg:sticky lg:top-[80px]">
        {selected ? (
          <>
            <Kicker color={ACCENT_HEX[STATE_ACCENT[selected.state]]}>
              Tier {selected.tier} · {selected.branch}
            </Kicker>
            <SectionTitle className="mt-3">{selected.name}</SectionTitle>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{selected.description}</p>

            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <Label>Research</Label>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {selected.solvesDone}/{selected.solvesRequired} solves
                </span>
              </div>
              <Meter
                value={selected.progress}
                accent={STATE_ACCENT[selected.state]}
                label={`${selected.name} research progress`}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ghost">
                Advances when you solve a problem in its topics. There is no timer.
              </p>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <Label as="div">Topics</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.topics.map((topic) => (
                  <Tag key={topic} accent="signal">
                    {topic}
                  </Tag>
                ))}
              </div>
            </div>

            {selected.requires.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <Label as="div">Requires</Label>
                <ul className="mt-2 space-y-1">
                  {selected.requires.map((slug) => {
                    const required = bySlug.get(slug);
                    const done = required?.state === "mastered";
                    return (
                      <li
                        key={slug}
                        className={cn(
                          "text-[12.5px]",
                          done ? "text-flux" : "text-dim",
                        )}
                      >
                        {required?.name ?? slug}
                        {done ? " — mastered" : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-5 border-t border-line pt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ghost">
                root node — no prerequisites
              </p>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <Label as="div">Unlocks</Label>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                {selected.unlocksBlueprints.length + selected.unlocksItems.length > 0
                  ? `${selected.unlocksBlueprints.length} blueprint${selected.unlocksBlueprints.length === 1 ? "" : "s"} and ${selected.unlocksItems.length} item${selected.unlocksItems.length === 1 ? "" : "s"}.`
                  : "Mastering this opens the tier above it, and any blueprint or forge parameter that names it."}
              </p>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-dim">Select a node to see what it takes.</p>
        )}
      </Panel>
    </div>
  );
}
