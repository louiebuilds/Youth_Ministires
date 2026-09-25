"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { markChatRoomReadThroughAction } from "@/features/communications/chat/actions/chat-message-actions";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 25_000;
const REFRESH_DEBOUNCE_MS = 350;
const REFRESH_COOLDOWN_MS = 1_500;

export function ChatRealtimeRefresh({
  roomId,
  archived,
  latestVisibleMessageId,
}: Readonly<{
  roomId: string;
  archived: boolean;
  latestVisibleMessageId: string | null;
}>) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshCooldown = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshBlocked = useRef(false);
  const lastMarkedMessageId = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshNow = useCallback(() => {
    if (refreshBlocked.current) return;

    refreshBlocked.current = true;
    setRefreshing(true);
    router.refresh();

    refreshCooldown.current = setTimeout(() => {
      refreshBlocked.current = false;
      setRefreshing(false);
    }, REFRESH_COOLDOWN_MS);
  }, [router]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshNow, REFRESH_DEBOUNCE_MS);
  }, [refreshNow]);

  useEffect(() => {
    if (archived) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-room:${roomId}`, { config: { private: true } })
      .on("broadcast", { event: "message_changed" }, scheduleRefresh)
      .subscribe();

    const poll = window.setInterval(() => {
      if (!document.hidden) scheduleRefresh();
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (!document.hidden) scheduleRefresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (refreshCooldown.current) clearTimeout(refreshCooldown.current);
      void supabase.removeChannel(channel);
    };
  }, [archived, roomId, scheduleRefresh]);

  useEffect(() => {
    if (
      archived ||
      !latestVisibleMessageId ||
      lastMarkedMessageId.current === latestVisibleMessageId
    ) {
      return;
    }

    lastMarkedMessageId.current = latestVisibleMessageId;
    void markChatRoomReadThroughAction({
      roomId,
      messageId: latestVisibleMessageId,
    }).then((success) => {
      if (!success && lastMarkedMessageId.current === latestVisibleMessageId) {
        lastMarkedMessageId.current = null;
      }
    });
  }, [archived, latestVisibleMessageId, roomId]);

  if (archived) return null;

  return (
    <button
      className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      disabled={refreshing}
      onClick={refreshNow}
      type="button"
    >
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}
