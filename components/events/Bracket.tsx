import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils/cn";
import type { BracketMatch, BracketSeat } from "@/lib/queries/events";

/**
 * The finals bracket.
 *
 * Rounds count inward — 1 is the final — so grouping by round and rendering
 * highest-round-first puts the earliest matches on the left without any
 * bookkeeping about how many entrants there were.
 */

const ROUND_NAME: Record<number, string> = {
  1: "Final",
  2: "Semifinals",
  3: "Quarterfinals",
  4: "Round of 16",
  5: "Round of 32",
  6: "Round of 64",
};

function Seat({
  player,
  score,
  won,
}: {
  player: BracketSeat | null;
  score: number | null;
  won: boolean;
}) {
  if (!player) {
    return (
      <div className="flex items-center gap-2 px-[11px] py-[8px]">
        <span aria-hidden className="block size-[20px] rounded-[6px] border border-line" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ghost">
          to be decided
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/u/${player.handle}`}
      className={cn(
        "flex items-center gap-2 px-[11px] py-[8px] transition-colors hover:bg-glass",
        won && "bg-[rgb(59_232_176/0.08)]",
      )}
    >
      <Avatar seed={player.avatarSeed} name={player.displayName} size="xs" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12.5px]",
          won ? "font-bold text-flux" : "text-muted",
        )}
      >
        {player.displayName}
      </span>
      {score !== null ? (
        <span className="font-mono text-[11px] tabular-nums text-faint">{score}</span>
      ) : null}
    </Link>
  );
}

export function Bracket({ matches }: { matches: BracketMatch[] }) {
  if (matches.length === 0) {
    return (
      <p className="text-[13px] text-dim">
        The bracket is drawn when the track finals are set.
      </p>
    );
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => b - a);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map((round) => (
        <div key={round} className="min-w-[210px] flex-1">
          <Label as="div" className="mb-3">
            {ROUND_NAME[round] ?? `Round ${round}`}
          </Label>

          <ul className="flex h-full flex-col justify-around gap-3">
            {matches
              .filter((match) => match.round === round)
              .map((match) => {
                // winnerId is a profile id, so compare against the seat's id.
                const aWon =
                  match.winnerId !== null && match.a !== null && match.winnerId === match.a.id;
                const bWon =
                  match.winnerId !== null && match.b !== null && match.winnerId === match.b.id;
                return (
                  <li
                    key={match.id}
                    className="divide-y divide-[rgb(124_140_180/0.12)] overflow-hidden rounded-card border border-line bg-glass"
                  >
                    <Seat player={match.a} score={match.scoreA} won={aWon} />
                    <Seat player={match.b} score={match.scoreB} won={bWon} />
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
