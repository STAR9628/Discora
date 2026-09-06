"use client";

import React, { useState } from "react";
import { Quote, ChevronDown, ChevronUp } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";

export function DebatePremise() {
  const { room, debate } = useDebateContext();
  const statement = debate.openingStatement || room.description || "";
  const [isExpanded, setIsExpanded] = useState(false);

  if (!statement) return null;

  const isLong = statement.length > 250;
  const displayText = isLong && !isExpanded ? `${statement.slice(0, 250)}...` : statement;

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4 md:p-5 backdrop-blur-sm space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Quote className="h-3.5 w-3.5 text-primary" />
          <span>Opening Premise & Context</span>
        </h2>
        <div className="flex items-center gap-2">
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? "Show Less" : "Read Full Premise"}</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs md:text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap pl-3 border-l-2 border-primary/50">
        {displayText}
      </p>
    </div>
  );
}
