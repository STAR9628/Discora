"use client";

import { useState } from "react";
import { MessageSquare, Swords, X, Info, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useOnboarding } from "../hooks/use-onboarding";

interface RoomGuideCardProps {
  roomType: "discussion" | "debate";
}

export function RoomGuideCard({ roomType }: RoomGuideCardProps) {
  const { dismissedGuides, dismissGuide, openDeck } = useOnboarding();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const isDismissed = !!dismissedGuides[roomType];
  if (isDismissed) return null;

  const isDebate = roomType === "debate";

  const guideTitle = isDebate
    ? "Debate Room: Deliberate Around a Motion"
    : "Discussion Room: Collaborative Inquiry";

  const guideDescription = isDebate
    ? "Positions here are organized by Proposition and Opposition around the motion. Arguments are backed by evidence, and participants can switch sides as evidence updates their understanding."
    : "Discussions decompose complex topics into Questions, Claims, and verifiable Evidence. You do not need to argue to win—participate to clarify and build a shared State of Understanding.";

  return (
    <div data-testid={`room-guide-${roomType}`}>
      {/* 1. Mobile Experience (<640px): Compact Expandable Control */}
      <div className="sm:hidden">
        <AnimatePresence initial={false} mode="wait">
          {!isMobileExpanded ? (
            <motion.button
              key="collapsed-control"
              type="button"
              onClick={() => setIsMobileExpanded(true)}
              aria-expanded={false}
              aria-label="About this room, tap to expand guide"
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full flex items-center justify-between rounded-xl border border-primary/25 bg-card/60 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-card/90 transition-colors cursor-pointer shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground/90">About this room</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/70 shrink-0" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-guide"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card/70 to-card/50 p-4 backdrop-blur-sm space-y-2 relative shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  {isDebate ? (
                    <Swords className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span>About this room</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileExpanded(false)}
                  className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors cursor-pointer"
                  aria-label="Collapse about this room"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                {guideDescription}
              </p>

              <div className="flex items-center justify-between pt-1 text-xs font-semibold">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openDeck(isDebate ? "modes" : "model")}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Learn how this works
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={() => dismissGuide(roomType)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileExpanded(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Desktop Experience (>=640px): Full Educational Card */}
      <div className="hidden sm:block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card/50 to-card/30 p-4 sm:p-5 backdrop-blur-sm space-y-2 relative animate-in fade-in duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
            {isDebate ? (
              <Swords className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            )}
            <span>{guideTitle}</span>
          </div>

          <button
            type="button"
            onClick={() => dismissGuide(roomType)}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors cursor-pointer"
            aria-label="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pr-6">
          {guideDescription}
        </p>

        <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => openDeck(isDebate ? "modes" : "model")}
            className="text-primary hover:underline cursor-pointer"
          >
            Learn how this works
          </button>
          <span className="text-muted-foreground/40">•</span>
          <button
            type="button"
            onClick={() => dismissGuide(roomType)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
