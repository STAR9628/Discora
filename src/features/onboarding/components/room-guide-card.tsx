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
  const [isExpanded, setIsExpanded] = useState(false);

  const isDismissed = !!dismissedGuides[roomType];
  if (isDismissed) return null;

  const isDebate = roomType === "debate";

  const guideTitle = isDebate
    ? "About this debate"
    : "About this discussion";

  const guideDescription = isDebate
    ? "Positions here are organized by Proposition and Opposition around the motion. Arguments are backed by evidence, and participants can switch sides as evidence updates their understanding."
    : "Discussions decompose complex topics into Questions, Claims, and verifiable Evidence. You do not need to argue to win—participate to clarify and build a shared State of Understanding.";

  return (
    <div data-testid={`room-guide-${roomType}`} className="w-full">
      <AnimatePresence initial={false} mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed-guide"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex items-center justify-between rounded-xl border border-border/40 bg-card/25 hover:bg-card/60 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs text-muted-foreground transition-colors shadow-2xs gap-2"
          >
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              aria-expanded={false}
              aria-label="Expand room guide"
              className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1 hover:text-foreground transition-colors"
            >
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground/90 truncate">
                {guideTitle}
                <span className="font-normal text-muted-foreground hidden sm:inline"> — {isDebate ? "Deliberate around a motion" : "Collaborative inquiry & understanding"}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 ml-auto" />
            </button>

            <div className="flex items-center gap-2 shrink-0 border-l border-border/40 pl-2">
              <button
                type="button"
                onClick={() => openDeck(isDebate ? "modes" : "model")}
                className="text-primary hover:underline font-semibold cursor-pointer hidden sm:inline text-[11px]"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => dismissGuide(roomType)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                aria-label="Dismiss guide"
                title="Dismiss guide"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded-guide"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card/70 to-card/50 p-3.5 sm:p-4 backdrop-blur-sm space-y-2 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                {isDebate ? (
                  <Swords className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                )}
                <span>{guideTitle}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Collapse
                </button>
                <button
                  type="button"
                  onClick={() => dismissGuide(roomType)}
                  className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors cursor-pointer"
                  aria-label="Dismiss guide"
                  title="Dismiss guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pr-2">
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
                Dismiss forever
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
