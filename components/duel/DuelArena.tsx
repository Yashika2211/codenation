"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Label, Kicker } from "@/components/ui/Label";
import { Meter } from "@/components/ui/Meter";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Workspace } from "@/components/arena/Workspace";
import { useDuelPresence } from "./useDuelPresence";
import { withdrawFromDuel } from "@/lib/duel/actions";
import { IconClock, IconSwords } from "@/components/ui/Icon";
import type { LanguageId } from "@/lib/judge/languages";

export type DuelPlayer = {
  id: string;
  handle: string;
  displayName: string;
  avatarSeed: string;
  rating: number;
};

type Props = {
  duelId: string;
  state: string;
  endsAt: string | null;
  winnerId: string | null;
  me: DuelPlayer;
  opponent: DuelPlayer | null;
  problem: { slug: string; title: string; difficulty: string };
  sampleCount: number;
  totalCount: number;
  defaultLanguage: LanguageId;
};

function useCountdown(endsAt: string | null) {
  const target = useMemo(() => (endsAt ? new Date(endsAt).getTime() : null), [endsAt]);
  const [remaining, setRemaining] = useState<number | null>(
    target ? Math.max(0, target - Date.now()) : null,
  );

  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, target - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return remaining;
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DuelArena(props: Props) {
  const { duelId, me, opponent, problem, state, winnerId } = props;
  const router = useRouter();

  const remaining = useCountdown(props.endsAt);
  const { opponent: live, connected } = useDuelPresence({
    duelId,
    userId: me.id,
    handle: me.handle,
    opponentId: opponent?.id ?? null,
  });

  const finished = state === "finished" || state === "abandoned";
  const waiting = state === "pending" || !opponent;

  // A live duel whose clock has run out needs the server to settle it.
  useEffect(() => {
    if (finished || remaining === null || remaining > 0) return;
    const id = window.setTimeout(() => router.refresh(), 1500);
    return () => window.clearTimeout(id);
  }, [finished, remaining, router]);

  // While waiting for an opponent, poll gently for the seat to fill.
  useEffect(() => {
    if (!waiting || finished) return;
    const id = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(id);
  }, [waiting, finished, router]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
      {/* ---- opponent rail ---- */}
      <aside className="space-y-4 lg:sticky lg:top-[80px]">
        <Panel variant="solid" className="p-5" sheen>
          <div className="flex items-center justify-between">
            <Kicker color="#E84FA8">Rated duel</Kicker>
            {remaining !== null && !finished ? (
              <span
                className={cn(
                  "inline-flex items-center gap-[6px] font-mono text-[13px] font-bold tabular-nums",
                  remaining < 120_000 ? "text-[#FF6B81]" : "text-text",
                )}
              >
                <IconClock size={13} />
                {formatClock(remaining)}
              </span>
            ) : null}
          </div>

          {/* me */}
          <div className="mt-5 flex items-center gap-3">
            <Avatar seed={me.avatarSeed} name={me.displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-text">{me.displayName}</p>
              <p className="font-mono text-[11px] tabular-nums text-dim">{me.rating}</p>
            </div>
            {winnerId === me.id ? <Tag accent="flux">winner</Tag> : null}
          </div>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <IconSwords size={14} className="text-ghost" />
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* opponent */}
          {opponent ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar seed={opponent.avatarSeed} name={opponent.displayName} size="md" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${opponent.handle}`}
                    className="block truncate text-[14px] font-bold text-text hover:text-flux"
                  >
                    {opponent.displayName}
                  </Link>
                  <p className="font-mono text-[11px] tabular-nums text-dim">{opponent.rating}</p>
                </div>
                {winnerId === opponent.id ? <Tag accent="flux">winner</Tag> : null}
              </div>

              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <Label>Cases passed</Label>
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {live ? `${live.passed}/${live.total || "?"}` : "—"}
                    </span>
                  </div>
                  <Meter
                    value={live && live.total > 0 ? live.passed / live.total : 0}
                    accent="plasma"
                    label="Opponent cases passed"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "block size-[6px] rounded-full",
                      live?.online ? "bg-flux cn-anim-pulse" : "bg-[rgb(124_140_180/0.4)]",
                    )}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
                    {!connected
                      ? "connecting"
                      : live?.online
                        ? live.typing
                          ? "typing"
                          : "online"
                        : "away"}
                  </span>
                </div>

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
                  last submit{" "}
                  {live?.lastSubmitAt
                    ? new Date(live.lastSubmitAt).toISOString().slice(11, 19)
                    : "none"}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-card border border-line bg-glass px-4 py-5 text-center">
              <span
                aria-hidden
                className="mx-auto block size-[7px] rotate-45 rounded-[1px] bg-plasma cn-anim-pulse"
              />
              <p className="mt-3 text-[13px] text-dim">Waiting for an opponent…</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
                the seat is open
              </p>
            </div>
          )}

          <p className="mt-5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ghost">
            You see their cases passed and when they last submitted. You never see their source.
          </p>

          {!finished ? (
            <form
              action={async () => {
                await withdrawFromDuel(duelId);
                router.refresh();
              }}
              className="mt-4"
            >
              <Button type="submit" variant="danger" size="sm" fullWidth>
                {waiting ? "Withdraw" : "Concede"}
              </Button>
            </form>
          ) : (
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
              duel {state}
            </p>
          )}
        </Panel>

        <Panel className="p-5">
          <Label as="div">Stake</Label>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Elo at K=32. A win mints 420 compute and 38 reputation; a loss still pays 4 reputation
            for showing up.
          </p>
        </Panel>
      </aside>

      {/* ---- workspace ---- */}
      <div>
        <Panel className="mb-3 flex flex-wrap items-center gap-3 px-4 py-3">
          <Tag accent="plasma">{problem.difficulty}</Tag>
          <Link
            href={`/arena/${problem.slug}`}
            className="text-[14px] font-bold text-text hover:text-flux"
          >
            {problem.title}
          </Link>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ghost">
            full statement on the problem page
          </span>
        </Panel>

        {waiting ? (
          <Panel className="grid min-h-[320px] place-items-center p-8 text-center">
            <div className="max-w-[40ch]">
              <p className="text-[14px] leading-relaxed text-dim">
                The editor unlocks when someone takes the other seat. This page will update on its
                own.
              </p>
            </div>
          </Panel>
        ) : (
          <Workspace
            problemSlug={problem.slug}
            sampleCount={props.sampleCount}
            totalCount={props.totalCount}
            defaultLanguage={props.defaultLanguage}
            signedIn
            duelId={duelId}
          />
        )}
      </div>
    </div>
  );
}
