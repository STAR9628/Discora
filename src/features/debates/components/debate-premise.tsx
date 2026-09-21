"use client";

import React, { useState } from "react";
import { Quote, ChevronDown, ChevronUp } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";

export function DebatePremise() {
  const { room, debate } = useDebateContext();
  const statement = debate.openingStatement?.trim() || "";
  const [isExpanded, setIsExpanded] = useState(false);

  // Avoid duplicating the room description if they are identical or empty
  if (!statement || statement === room.description?.trim()) return null;

  const previewThreshold = 110;
  const isLong = statement.length > previewThreshold;
  const displayText = isLong && !isExpanded ? `${statement.slice(0, previewThreshold).trim()}...` : statement;

  return (
    <div className="w-full min-w-0 max-w-full rounded-xl border border-border/40 bg-card/20 sm:bg-card/40 p-2.5 sm:p-4 md:p-5 space-y-1.5 sm:space-y-2 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] sm:text-xs font-bold sm:font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Quote className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
          <span>Premise & Context</span>
        </h2>
        <div className="flex items-center gap-2">
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary hover:underline cursor-pointer min-h-[36px] sm:min-h-0"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? "Show Less" : "Read Full Premise"}</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      <p className={`text-xs md:text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] pl-2.5 sm:pl-3 border-l-2 border-primary/40 min-w-0 max-w-full ${isExpanded ? "disclosure-content" : ""}`}>
        {displayText}
      </p>
    </div>
  );
}
