"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Swords, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactStickyRoomHeaderProps {
  roomType: "discussion" | "debate";
  title: string;
  headerAction?: React.ReactNode;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function CompactStickyRoomHeader({
  roomType,
  title,
  headerAction,
  sentinelRef,
}: CompactStickyRoomHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollContainer = sentinel.closest(".overflow-y-auto") as HTMLElement | null;

    const checkScroll = () => {
      const containerTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const winTop = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolled(containerTop > 80 || winTop > 80);
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScroll, { passive: true });
    }

    checkScroll();

    return () => {
      window.removeEventListener("scroll", checkScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", checkScroll);
      }
    };
  }, [sentinelRef]);

  const handleScrollToTop = () => {
    const container = sentinelRef.current?.closest(".overflow-y-auto") as HTMLElement | null;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {isScrolled && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="sticky z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2 border-b border-border/50 bg-background/90 backdrop-blur-md shadow-2xs"
          style={{ top: "var(--app-header-height, 61px)" }}
          role="region"
          aria-label={`Compact contextual header for ${title}`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            {/* Left: Room Type Badge + Room Title (clickable to return to top) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0",
                  roomType === "debate"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                {roomType === "debate" ? (
                  <Swords className="h-3 w-3" />
                ) : (
                  <MessageSquare className="h-3 w-3" />
                )}
                <span>{roomType}</span>
              </span>

              <button
                type="button"
                onClick={handleScrollToTop}
                className="group flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
                title="Click to return to top of room"
                aria-label={`Return to top of ${title}`}
              >
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {title}
                </span>
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:inline" />
              </button>
            </div>

            {/* Right: Save / Action if naturally fitted (icon-only in compact header) */}
            {headerAction && (
              <div className="flex items-center gap-2 shrink-0">
                {React.isValidElement(headerAction)
                  ? React.cloneElement(headerAction as React.ReactElement<{ showLabel?: boolean }>, {
                      showLabel: false,
                    })
                  : headerAction}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
