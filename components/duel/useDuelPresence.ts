"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Opponent telemetry over Supabase Realtime presence.
 *
 * What travels on this channel is deliberately thin: cases passed, whether they
 * are typing, and when they last submitted. Never source, never the problem's
 * hidden cases, never anything that would give one player the other's answer.
 */

export type DuelPresence = {
  userId: string;
  handle: string;
  passed: number;
  total: number;
  typing: boolean;
  lastSubmitAt: string | null;
  online: boolean;
};

type Tracked = Omit<DuelPresence, "online">;

export function useDuelPresence(input: {
  duelId: string;
  userId: string;
  handle: string;
  opponentId: string | null;
}) {
  const { duelId, userId, handle, opponentId } = input;

  const [opponent, setOpponent] = useState<DuelPresence | null>(null);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selfRef = useRef<Tracked>({
    userId,
    handle,
    passed: 0,
    total: 0,
    typing: false,
    lastSubmitAt: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase.channel(`duel:${duelId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Tracked>();

      // Find the other seat. With presence keyed by user id, anything that is
      // not ours is the opponent.
      const entries = Object.entries(state).filter(([key]) => key !== userId);
      const match = opponentId
        ? entries.find(([key]) => key === opponentId)
        : entries[0];

      if (!match) {
        setOpponent((prev) => (prev ? { ...prev, online: false } : null));
        return;
      }

      const payload = match[1][0];
      if (!payload) return;

      setOpponent({
        userId: payload.userId,
        handle: payload.handle,
        passed: payload.passed,
        total: payload.total,
        typing: payload.typing,
        lastSubmitAt: payload.lastSubmitAt,
        online: true,
      });
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      setConnected(true);
      void channel.track(selfRef.current);
    });

    return () => {
      setConnected(false);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [duelId, userId, opponentId]);

  /** Publishes a partial update of our own telemetry. */
  const publish = useCallback((patch: Partial<Tracked>) => {
    selfRef.current = { ...selfRef.current, ...patch };
    const channel = channelRef.current;
    if (channel) void channel.track(selfRef.current);
  }, []);

  return { opponent, connected, publish };
}
