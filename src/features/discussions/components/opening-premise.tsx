"use client";

import { useState } from "react";
import { Quote, ChevronDown, ChevronUp } from "lucide-react";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";

interface OpeningPremiseProps {
  discussion: DiscussionFeedItem["discussion"];
}

export function OpeningPremise({ discussion }: OpeningPremiseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const statement = discussion?.openingStatement || "";
  const isLongStatement = statement.length > 300;

  if (!statement && !discussion?.summary) return null;

  return (
    <section aria-labelledby="opening-premise-heading" className="rounded-2xl border border-border bg-card/30 p-5 space-y-3.5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2
          id="opening-premise-heading"
          className="text-base font-bold tracking-tight text-foreground flex items-center gap-2"
        >
          <Quote className="h-4 w-4 text-primary shrink-0" />
          <span>Opening Premise</span>
        </h2>
        {isLongStatement && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1.5 py-0.5 cursor-pointer"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {discussion?.summary && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 text-xs leading-relaxed italic text-foreground/90 relative">
          <span className="not-italic uppercase tracking-wider text-[9px] font-extrabold text-primary block mb-1">
            Summary Preview
          </span>
          <p>&ldquo;{discussion.summary}&rdquo;</p>
        </div>
      )}

      {statement && (
        <div className="relative">
          <div
            className={`text-xs md:text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap pl-3.5 border-l-2 border-primary/50 transition-all ${
              !isExpanded && isLongStatement ? "line-clamp-3" : ""
            }`}
          >
            {statement}
          </div>
        </div>
      )}
    </section>
  );
}
