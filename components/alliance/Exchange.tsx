"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Label, Kicker } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";
import { postTrade, acceptTrade } from "@/lib/alliance/actions";
import type { TradeView } from "@/lib/queries/alliance";

const RESOURCES = ["compute", "data", "alloy"] as const;

const RESOURCE_ACCENT = {
  compute: "flux",
  data: "signal",
  alloy: "amber",
} as const;

const FIELD =
  "min-h-[44px] w-full rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[11px] " +
  "text-[13px] tabular-nums text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none";

function Bundle({ bundle }: { bundle: Record<string, number> }) {
  const entries = Object.entries(bundle);
  if (entries.length === 0) return <span className="text-[12px] text-ghost">nothing</span>;

  return (
    <span className="flex flex-wrap gap-[6px]">
      {entries.map(([resource, amount]) => (
        <Tag
          key={resource}
          accent={RESOURCE_ACCENT[resource as keyof typeof RESOURCE_ACCENT] ?? "flux"}
        >
          {amount.toLocaleString("en-US")} {resource.slice(0, 3)}
        </Tag>
      ))}
    </span>
  );
}

export function Exchange({
  allianceSlug,
  trades,
  canTrade,
  viewerNationSlug,
}: {
  allianceSlug: string;
  trades: TradeView[];
  canTrade: boolean;
  viewerNationSlug: string | null;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const open = trades.filter((t) => t.state === "open");
  const settled = trades.filter((t) => t.state !== "open");

  function run(
    action: (data: FormData) => Promise<{ ok: boolean; message: string }>,
    data: FormData,
  ) {
    startTransition(async () => {
      const result = await action(data);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <div className="space-y-4">
      {canTrade ? (
        <Panel className="p-5">
          <Kicker>Post an offer</Kicker>
          <form action={(data) => run(postTrade, data)} className="mt-4 space-y-4">
            <input type="hidden" name="alliance_slug" value={allianceSlug} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label as="div">You give</Label>
                <div className="mt-2 space-y-2">
                  {RESOURCES.map((resource) => (
                    <div key={resource} className="flex items-center gap-2">
                      <label
                        htmlFor={`offer_${resource}`}
                        className="w-[54px] font-mono text-[10px] uppercase tracking-[0.12em] text-dim"
                      >
                        {resource.slice(0, 3)}
                      </label>
                      <input
                        id={`offer_${resource}`}
                        name={`offer_${resource}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        className={FIELD}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label as="div">You want</Label>
                <div className="mt-2 space-y-2">
                  {RESOURCES.map((resource) => (
                    <div key={resource} className="flex items-center gap-2">
                      <label
                        htmlFor={`want_${resource}`}
                        className="w-[54px] font-mono text-[10px] uppercase tracking-[0.12em] text-dim"
                      >
                        {resource.slice(0, 3)}
                      </label>
                      <input
                        id={`want_${resource}`}
                        name={`want_${resource}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        className={FIELD}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="note" className="mb-2 block">
                <Label>Note (optional)</Label>
              </label>
              <input id="note" name="note" maxLength={240} className={FIELD} />
            </div>

            <Button type="submit" fullWidth disabled={pending}>
              {pending ? "Posting…" : "Post offer"}
            </Button>

            <p className="text-[11.5px] leading-relaxed text-ghost">
              What you offer is held in escrow the moment you post, so an accepted trade can never
              fail on payment.
            </p>
          </form>
        </Panel>
      ) : null}

      {message ? (
        <p
          role="status"
          className={`text-[12.5px] ${message.ok ? "text-flux" : "text-[#FF8A9C]"}`}
        >
          {message.text}
        </p>
      ) : null}

      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <Kicker>Open offers</Kicker>
          <Label>{open.length}</Label>
        </div>

        {open.length === 0 ? (
          <p className="mt-4 text-[12.5px] text-dim">Nothing on the exchange right now.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((trade) => {
              const mine = trade.fromSlug === viewerNationSlug;

              return (
                <li
                  key={trade.id}
                  className="rounded-card border border-line bg-glass px-4 py-[13px]"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Link
                      href={`/n/${trade.fromSlug}`}
                      className="text-[13px] font-bold text-text hover:text-flux"
                    >
                      {trade.fromName}
                    </Link>
                    {mine ? (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ghost">
                        yours
                      </span>
                    ) : null}
                    <span className="ml-auto font-mono text-[10px] text-ghost">
                      {trade.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Bundle bundle={trade.offer} />
                    <span className="font-mono text-[11px] text-ghost">for</span>
                    <Bundle bundle={trade.want} />
                  </div>

                  {trade.note ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-dim">{trade.note}</p>
                  ) : null}

                  {canTrade && !mine ? (
                    <form action={(data) => run(acceptTrade, data)} className="mt-3">
                      <input type="hidden" name="trade_id" value={trade.id} />
                      <input type="hidden" name="alliance_slug" value={allianceSlug} />
                      <Button type="submit" size="sm" variant="outline" accent="signal" disabled={pending}>
                        Accept
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {settled.length > 0 ? (
        <Panel className="p-5">
          <Kicker>Settled</Kicker>
          <ul className="mt-4 space-y-2">
            {settled.slice(0, 8).map((trade) => (
              <li key={trade.id} className="flex flex-wrap items-center gap-3 text-[12.5px]">
                <Tag accent={trade.state === "accepted" ? "flux" : "signal"}>{trade.state}</Tag>
                <span className="text-muted">{trade.fromName}</span>
                {trade.toName ? (
                  <>
                    <span className="font-mono text-[10px] text-ghost">to</span>
                    <span className="text-muted">{trade.toName}</span>
                  </>
                ) : null}
                <span className="ml-auto font-mono text-[10px] text-ghost">
                  {trade.createdAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
