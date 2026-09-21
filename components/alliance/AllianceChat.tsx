"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Kicker, Label } from "@/components/ui/Label";
import { Tag } from "@/components/ui/Tag";

/**
 * Alliance chat over Realtime broadcast.
 *
 * Messages are ephemeral by design — they live in the channel, not in a table.
 * That is a deliberate scope choice, and the UI says so rather than implying a
 * history that does not exist.
 */

export type ChatMessage = {
  id: string;
  handle: string;
  displayName: string;
  avatarSeed: string;
  body: string;
  at: string;
};

const MAX = 400;
const KEEP = 80;

export function AllianceChat({
  allianceId,
  me,
  canPost,
}: {
  allianceId: string;
  me: { handle: string; displayName: string; avatarSeed: string } | null;
  canPost: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [present, setPresent] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase.channel(`alliance:${allianceId}`, {
      config: { presence: { key: me?.handle ?? `guest-${Math.random().toString(36).slice(2)}` } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const message = payload as ChatMessage;
      if (typeof message?.body !== "string") return;
      setMessages((prev) => [...prev, message].slice(-KEEP));
    });

    channel.on("presence", { event: "sync" }, () => {
      setPresent(Object.keys(channel.presenceState()).length);
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      setConnected(true);
      if (me) void channel.track({ handle: me.handle });
    });

    return () => {
      setConnected(false);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [allianceId, me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  function send() {
    const channel = channelRef.current;
    const trimmed = body.trim();
    if (!channel || !me || trimmed.length === 0) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      handle: me.handle,
      displayName: me.displayName,
      avatarSeed: me.avatarSeed,
      body: trimmed.slice(0, MAX),
      at: new Date().toISOString(),
    };

    void channel.send({ type: "broadcast", event: "message", payload: message });
    // Broadcast does not echo to the sender, so add it locally.
    setMessages((prev) => [...prev, message].slice(-KEEP));
    setBody("");
  }

  return (
    <Panel className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <Kicker>Alliance chat</Kicker>
        <Tag accent={connected ? "flux" : "signal"} live={connected}>
          {connected ? `${present} here` : "connecting"}
        </Tag>
      </div>

      <div className="mt-4 max-h-[300px] min-h-[160px] flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed text-dim">
            Nothing said yet. Messages are live only — they are not stored, and they are gone when
            you leave.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar seed={message.avatarSeed} name={message.displayName} size="xs" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[12.5px] font-bold text-text">
                    {message.displayName}
                  </span>
                  <span className="font-mono text-[9.5px] text-ghost">
                    {message.at.slice(11, 16)}
                  </span>
                </div>
                <p className="mt-[2px] break-words text-[12.5px] leading-relaxed text-muted">
                  {message.body}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {canPost && me ? (
        <div className="mt-4 border-t border-line pt-4">
          <label htmlFor="chat-body" className="sr-only">
            Message
          </label>
          <div className="flex items-center gap-2">
            <input
              id="chat-body"
              value={body}
              maxLength={MAX}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Say something"
              className="min-h-[44px] flex-1 rounded-chip border border-line bg-[rgb(6_7_13/0.6)] px-[13px] text-[13px] text-text placeholder:text-ghost focus:border-[rgb(59_232_176/0.45)] focus:outline-none"
            />
            <Button size="sm" onClick={send} disabled={!connected || body.trim().length === 0}>
              Send
            </Button>
          </div>
        </div>
      ) : (
        <Label as="p" className="mt-4 border-t border-line pt-4">
          {me ? "Your nation is not in this alliance" : "Sign in to chat"}
        </Label>
      )}
    </Panel>
  );
}
