"use client";

import { MessageSquare, Calendar, GitBranch, FileText, HelpCircle, Hash } from "lucide-react";
import { formatDate } from "@/lib/date";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";

interface DiscussionHeaderProps {
  initialData: DiscussionFeedItem;
  claimCount: number;
  evidenceCount: number;
  openQuestionCount: number;
  contributionCount: number;
}

export function DiscussionHeader({
  initialData,
  claimCount,
  evidenceCount,
  openQuestionCount,
  contributionCount,
}: DiscussionHeaderProps) {
  const { room, topic } = initialData;

  const formattedDate = formatDate(room.createdAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-5 md:p-7 backdrop-blur-md shadow-lg">
      <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/20">
            <MessageSquare className="h-3 w-3" />
            Discussion
          </span>
          {topic && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
              <Hash className="h-3 w-3 text-primary/70" />
              {topic.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
          {room.title}
        </h1>

        {room.description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {room.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-xs text-muted-foreground border-t border-border/40">
          <span className="flex items-center gap-1.5" title="Started Date">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Started {formattedDate}</span>
          </span>
          <span aria-hidden="true" className="text-border/80">•</span>
          <span className="flex items-center gap-1.5" title="Claims Asserted">
            <GitBranch className="h-3.5 w-3.5 text-primary/80" />
            <span className="font-bold text-foreground">{claimCount}</span>
            <span>claims</span>
          </span>
          <span aria-hidden="true" className="text-border/80">•</span>
          <span className="flex items-center gap-1.5" title="Evidence Items">
            <FileText className="h-3.5 w-3.5 text-primary/80" />
            <span className="font-bold text-foreground">{evidenceCount}</span>
            <span>evidence</span>
          </span>
          <span aria-hidden="true" className="text-border/80">•</span>
          <span className="flex items-center gap-1.5" title="Open Questions">
            <HelpCircle className="h-3.5 w-3.5 text-primary/80" />
            <span className="font-bold text-foreground">{openQuestionCount}</span>
            <span>questions</span>
          </span>
          <span aria-hidden="true" className="text-border/80">•</span>
          <span className="flex items-center gap-1.5" title="Total Contributions">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="font-bold text-foreground">{contributionCount}</span>
            <span>contributions</span>
          </span>
        </div>
      </div>
    </header>
  );
}
