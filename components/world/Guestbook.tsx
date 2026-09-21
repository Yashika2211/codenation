"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Kicker, Label } from "@/components/ui/Label";
import { signGuestbook } from "@/lib/world/guestbook";

export type GuestbookEntry = {
  id: string;
  body: string;
  at: string;
  handle: string;
  avatarSeed: string;
};

const MAX = 400;

export function Guestbook({
  nationId,
  nationSlug,
  entries,
  canPost,
}: {
  nationId: string;
  nationSlug: string;
  entries: GuestbookEntry[];
  canPost: boolean;
}) {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Panel className="p-5">
      <Kicker>Guestbook</Kicker>

      {canPost ? (
        <form
          action={(data) => {
            startTransition(async () => {
              const result = await signGuestbook(data);
              setMessage({ ok: result.ok, text: result.message });
              if (result.ok) setBody("");
            });
          }}
          className="mt-4"
        >
          <input type="hidden" name="nation_id" value={nationId} />
          <input type="hidden" name="nation_slug" value={nationSlug} />

          <label htmlFor="guestbook-body" className="sr-only">
            Leave a note
          </label>
          <textarea
            id="guestbook-body"
            name="body"
            rows={3}
            maxLength={MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a note for this nation"
            className="w-full resize-y rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[13px] py-[10px] text-[13px] leading-relaxed text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none"
          />

          <div className="mt-2 flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
              {pending ? "Posting…" : "Sign"}
            </Button>
            <span className="font-mono text-[10px] tabular-nums text-ghost">
              {body.length}/{MAX}
            </span>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-[12.5px] text-dim">Sign in to leave a note.</p>
      )}

      {message ? (
        <p
          role="status"
          className={`mt-3 text-[12.5px] ${message.ok ? "text-flux" : "text-[#FF8A9C]"}`}
        >
          {message.text}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-dim">
          No one has signed yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-4 border-t border-line pt-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <Avatar seed={entry.avatarSeed} name={entry.handle} size="xs" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/u/${entry.handle}`}
                    className="truncate text-[12.5px] font-bold text-text hover:text-flux"
                  >
                    {entry.handle}
                  </Link>
                  <span className="font-mono text-[9.5px] text-ghost">
                    {entry.at.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 break-words text-[12.5px] leading-relaxed text-muted">
                  {entry.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Label as="p" className="mt-5 border-t border-line pt-4">
        Notes are public and attributed
      </Label>
    </Panel>
  );
}
