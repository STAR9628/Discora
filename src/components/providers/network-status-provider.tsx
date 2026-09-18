"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface NetworkStatusContextType {
  isOnline: boolean;
  wasOffline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  wasOffline: false,
});

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  });
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  const offlineTimestampRef = useRef<number>(0);
  const hiddenTimestampRef = useRef<number>(0);
  const lastNoticeTimeRef = useRef<number>(0);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSynchronizedNotice = useCallback(() => {
    const now = Date.now();
    // Throttle reconnect notices to at most once per 10 seconds to prevent spam
    if (now - lastNoticeTimeRef.current < 10_000) return;
    lastNoticeTimeRef.current = now;

    // Synchronize active room queries (messages, claims, inquiries, evidence, etc.)
    try {
      queryClient.refetchQueries({ type: "active" });
    } catch {
      // QueryClient refetch graceful fallback
    }

    setShowRestoredNotice(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowRestoredNotice(false);
    }, 3200);
  }, [queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const offlineDuration = offlineTimestampRef.current > 0 ? Date.now() - offlineTimestampRef.current : 0;
      offlineTimestampRef.current = 0;

      // Only show reconnect message if there was an actual interruption (> 500ms or wasOffline flag set)
      if (wasOffline || offlineDuration > 500) {
        triggerSynchronizedNotice();
      }
    };

    const handleOffline = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      offlineTimestampRef.current = Date.now();
      setIsOnline(false);
      setWasOffline(true);
      setShowRestoredNotice(false);
    };

    // Background tab / device dormancy recovery listener
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        hiddenTimestampRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const dormantDuration = hiddenTimestampRef.current > 0 ? Date.now() - hiddenTimestampRef.current : 0;
        hiddenTimestampRef.current = 0;
        // If tab was dormant/backgrounded for 45+ seconds and device is currently online
        if (dormantDuration >= 45_000 && navigator.onLine) {
          triggerSynchronizedNotice();
        }
      }
    };

    // Manual/custom event for automated test suites
    const handleCustomReconnect = () => {
      triggerSynchronizedNotice();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("discora:reconnect", handleCustomReconnect);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("discora:reconnect", handleCustomReconnect);
    };
  }, [wasOffline, triggerSynchronizedNotice]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, wasOffline }}>
      {children}

      {/* Accessible, non-intrusive floating network status indicator */}
      {(!isOnline || showRestoredNotice) && (
        <div
          role="status"
          aria-live="polite"
          data-testid="network-status-banner"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm pointer-events-none transition-all duration-200 motion-reduce:transition-none"
        >
          {!isOnline ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-background/95 backdrop-blur-md px-4 py-3 shadow-xl text-xs text-foreground ring-1 ring-amber-500/20 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none pointer-events-auto">
              <WifiOff className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              <p className="leading-snug">
                You’re offline. Some actions may be unavailable until your connection returns.
              </p>
            </div>
          ) : showRestoredNotice ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-background/95 backdrop-blur-md px-4 py-3 shadow-xl text-xs text-foreground ring-1 ring-emerald-500/20 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none pointer-events-auto">
              <Wifi className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <p className="leading-snug font-medium">Connection restored. Room activity is synchronized.</p>
            </div>
          ) : null}
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}
