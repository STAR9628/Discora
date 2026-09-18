"use client";

import React, { memo, useState } from "react";
import type { ReactionType, ReactionAggregate } from "@/features/discussions/types";
import { Plus } from "lucide-react";

interface MessageReactionsProps {
  targetId: string;
  targetType?: "message" | "claim" | "evidence" | "argument";
  reactions: ReactionAggregate[];
  onToggleReaction: (reactionType: ReactionType) => void;
  disabled?: boolean;
  className?: string;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  insightful: { emoji: "💡", label: "Insightful" },
  curious: { emoji: "🤔", label: "Curious" },
};

export const MessageReactions = memo(function MessageReactions({
  targetId,
  targetType: _targetType = "message",
  reactions,
  onToggleReaction,
  disabled = false,
  className = "",
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group aggregates by reactionType
  const aggregatesMap = React.useMemo(() => {
    const map = new Map<ReactionType, ReactionAggregate>();
    for (const r of reactions) {
      if (r.targetId === targetId) {
        map.set(r.reactionType, r);
      }
    }
    return map;
  }, [reactions, targetId]);

  const activeReactions = (["like", "insightful", "curious"] as ReactionType[]).filter(
    (type) => {
      const agg = aggregatesMap.get(type);
      return agg && agg.count > 0;
    }
  );

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-1 ${className}`}>
      {/* Existing Reactions */}
      {activeReactions.map((type) => {
        const agg = aggregatesMap.get(type)!;
        const config = REACTION_EMOJIS[type];
        const isUserReacted = agg.userHasReacted;

        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(type);
            }}
            title={`${config.label} (${agg.count})`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none ${
              isUserReacted
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/40 hover:bg-muted/70 border-border/40 text-muted-foreground"
            }`}
          >
            <span className="text-xs leading-none">{config.emoji}</span>
            <span className="text-[11px] font-semibold">{agg.count}</span>
          </button>
        );
      })}

      {/* Quick Add Button & Popover */}
      <div className="relative">
        {activeReactions.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker((prev) => !prev);
            }}
            title="Add reaction"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-border/40 bg-muted/20 hover:bg-muted/50 text-muted-foreground transition-colors cursor-pointer text-xs"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}

        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(false);
              }}
            />
            <div
              className="absolute left-0 bottom-full mb-1.5 z-30 flex items-center gap-1 p-1 rounded-full border border-border bg-popover shadow-md animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {(["like", "insightful", "curious"] as ReactionType[]).map((type) => {
                const config = REACTION_EMOJIS[type];
                const agg = aggregatesMap.get(type);
                const isUserReacted = agg?.userHasReacted;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onToggleReaction(type);
                      setShowPicker(false);
                    }}
                    title={config.label}
                    className={`h-7 w-7 flex items-center justify-center rounded-full hover:scale-125 transition-transform text-sm cursor-pointer ${
                      isUserReacted ? "bg-primary/15" : "hover:bg-muted"
                    }`}
                  >
                    {config.emoji}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
