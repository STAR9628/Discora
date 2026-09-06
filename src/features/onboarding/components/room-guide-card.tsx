"use client";

import { MessageSquare, Swords, X } from "lucide-react";
import { useOnboarding } from "../hooks/use-onboarding";

interface RoomGuideCardProps {
  roomType: "discussion" | "debate";
}

export function RoomGuideCard({ roomType }: RoomGuideCardProps) {
  const { dismissedGuides, dismissGuide, openDeck } = useOnboarding();

  const isDismissed = !!dismissedGuides[roomType];
  if (isDismissed) return null;

  const isDebate = roomType === "debate";

  return (
    <div
      data-testid={`room-guide-${roomType}`}
      className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card/50 to-card/30 p-4 sm:p-5 backdrop-blur-sm space-y-2 relative animate-in fade-in duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
          {isDebate ? (
            <Swords className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          )}
          <span>
            {isDebate
              ? "Debate Room: Deliberate Around a Motion"
              : "Discussion Room: Collaborative Truth-Seeking"}
          </span>
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
        {isDebate
          ? "Positions here are organized by Proposition and Opposition around the motion. Arguments are backed by evidence, and participants can switch sides as evidence updates their understanding."
          : "Discussions decompose complex topics into Questions, Claims, and verifiable Evidence. You do not need to argue to win—participate to clarify and build a shared State of Understanding."}
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
  );
}
