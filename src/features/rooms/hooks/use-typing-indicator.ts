"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

export interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  lastActive: number;
}

export interface UseTypingIndicatorOptions {
  roomId: string;
  currentUser?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
}

export function useTypingIndicator({ roomId, currentUser }: UseTypingIndicatorOptions) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typersMapRef = useRef<Map<string, TypingUser>>(new Map());
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const lastSentRef = useRef<number>(0);

  // Sync ref to state
  const syncState = useCallback(() => {
    setTypingUsers(Array.from(typersMapRef.current.values()));
  }, []);

  const handleIncomingTyping = useCallback(
    (payload: { userId?: string; username?: string; avatarUrl?: string | null }) => {
      if (!payload?.userId || payload.userId === currentUser?.id) return;

      typersMapRef.current.set(payload.userId, {
        userId: payload.userId,
        username: payload.username || "Someone",
        avatarUrl: payload.avatarUrl || null,
        lastActive: Date.now(),
      });
      syncState();
    },
    [currentUser?.id, syncState]
  );

  useEffect(() => {
    if (!roomId) return;

    const channelName = `room-typing:${roomId}`;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        handleIncomingTyping(payload);
      })
      .subscribe();

    // BroadcastChannel support for same-origin tabs and test environments
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(channelName);
        bcRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.event === "typing") {
            handleIncomingTyping(event.data.payload);
          }
        };
      } catch {
        // BroadcastChannel unsupported or restricted
      }
    }

    // Custom DOM event listener for test automation & simulation
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        roomId?: string;
        userId?: string;
        username?: string;
        avatarUrl?: string | null;
      }>;
      if (!customEvent.detail?.roomId || customEvent.detail?.roomId === roomId) {
        handleIncomingTyping(customEvent.detail);
      }
    };
    window.addEventListener("discora:typing", handleCustomEvent);

    // Prune stale typing states every 400ms (disappears ~3s after last activity)
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, user] of typersMapRef.current.entries()) {
        if (now - user.lastActive > 3000) {
          typersMapRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) {
        syncState();
      }
    }, 400);

    const typersMap = typersMapRef.current;

    return () => {
      clearInterval(pruneInterval);
      window.removeEventListener("discora:typing", handleCustomEvent);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (bcRef.current) {
        bcRef.current.close();
      }
      typersMap.clear();
      setTypingUsers([]);
    };
  }, [roomId, handleIncomingTyping, syncState]);

  // Send typing broadcast (throttled to at most once per 1200ms)
  const sendTyping = useCallback(() => {
    if (!currentUser?.id) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1200) return;
    lastSentRef.current = now;

    const payload = {
      userId: currentUser.id,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
    };

    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload,
      });
    } catch {
      // Ignore transport errors
    }

    try {
      bcRef.current?.postMessage({
        event: "typing",
        payload,
      });
    } catch {
      // Ignore broadcast errors
    }
  }, [currentUser]);

  return {
    typingUsers,
    sendTyping,
  };
}
