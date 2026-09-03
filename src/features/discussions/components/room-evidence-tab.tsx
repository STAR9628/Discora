"use client";

import { useEffect, useRef } from "react";
import { useRoomEvidence } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionEvidence } from "@/features/discussions/types";
import { formatDate } from "@/lib/date";
import { AlertCircle, FileText, Link2, User } from "lucide-react";

interface RoomEvidenceTabProps {
  roomId: string;
  scrollToEvidenceId?: string | null;
  onScrollComplete?: () => void;
  onGoToClaims: () => void;
  pendingClaimId?: string | null;
  onPendingClaimComplete?: () => void;
  evidenceList?: DiscussionEvidence[] | null;
  isLoading?: boolean;
}

export function RoomEvidenceTab({ roomId, scrollToEvidenceId, onScrollComplete, onGoToClaims, pendingClaimId, onPendingClaimComplete, evidenceList, isLoading: externalLoading }: RoomEvidenceTabProps) {
  const hasExternal = evidenceList !== undefined;
  const { data: internalEvidence, isLoading: internalLoading, error } = useRoomEvidence(roomId, !hasExternal);
  const evidence = hasExternal ? evidenceList : internalEvidence;
  const isLoading = hasExternal ? (externalLoading ?? false) : internalLoading;
  const scrollHandled = useRef(false);
  const pendingClaimHandled = useRef(false);

  useEffect(() => {
    if (!scrollToEvidenceId || scrollHandled.current) return;

    const tryHighlight = (retries: number) => {
      const el = document.getElementById(`ev-${scrollToEvidenceId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
        setTimeout(() => { el.classList.add("animate-pulse"); }, 1500);
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "animate-pulse");
        }, 4000);
        scrollHandled.current = true;
        onScrollComplete?.();
      } else if (retries > 0) {
        setTimeout(() => tryHighlight(retries - 1), 300);
      }
    };

    tryHighlight(10);
  }, [scrollToEvidenceId, evidence, onScrollComplete]);

  useEffect(() => {
    if (!pendingClaimId || !evidence || pendingClaimHandled.current) return;

    const match = evidence.find((ev) => ev.claimId === pendingClaimId);
    if (!match) return;

    const el = document.getElementById(`ev-${match.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
      setTimeout(() => { el.classList.add("animate-pulse"); }, 1500);
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "animate-pulse");
      }, 4000);
      pendingClaimHandled.current = true;
      onPendingClaimComplete?.();
    }
  }, [pendingClaimId, evidence, onPendingClaimComplete]);

  const getDirectionStyles = (direction: string) => {
    switch (direction) {
      case "support": return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "contradict": return "bg-rose-500/10 border-rose-500/25 text-rose-400";
      case "context": return "bg-slate-500/10 border-slate-500/25 text-slate-400";
      default: return "bg-muted border-border text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mt-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">Failed to load evidence: {(error as Error).message}</p>
      </div>
    );
  }

  if (!evidence || evidence.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-4 mt-4">
        <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
          <FileText className="h-6 w-6" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">No evidence added yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Evidence supports specific claims. To add evidence:</p>
          <ol className="text-xs text-muted-foreground text-left list-decimal list-inside space-y-1">
            <li>Open the <span className="font-semibold text-foreground/80">Claims</span> tab</li>
            <li>Select or create a claim</li>
            <li>Add evidence to support that claim</li>
          </ol>
          <button
            type="button"
            onClick={onGoToClaims}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer"
          >
            Go to Claims
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h4 className="text-base font-bold text-foreground">Room Evidence Bibliography</h4>
      <div className="grid grid-cols-1 gap-4">
        {evidence.map((ev) => (
          <div
            id={`ev-${ev.id}`}
            key={ev.id}
            className={`rounded-2xl border border-border/50 bg-card/30 p-5 space-y-3 transition-colors hover:bg-card/40 relative ${ev.isRetracted ? "opacity-60 grayscale-[15%]" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${getDirectionStyles(ev.direction)}`}>
                  {ev.direction}s
                </span>
                <span className="rounded bg-muted border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground capitalize">
                  {ev.evidenceType}
                </span>
                {ev.isRetracted && (
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                    Retracted
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
              {ev.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/20 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4.5 w-4.5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                  {ev.avatarUrl ? (
                    <img src={ev.avatarUrl} alt={`${ev.username}'s avatar`} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-2.5 w-2.5 text-muted-foreground/60" />
                  )}
                </div>
                <span className={`font-bold ${
                  ev.identityMode === "anonymous" ? "text-muted-foreground" : ev.username === "Deleted User" ? "text-destructive/75" : "text-foreground"
                }`}>
                  {ev.identityMode === "anonymous" ? "Anonymous" : ev.username || "Unknown User"}
                </span>
                <span>•</span>
                <span>{formatDate(ev.createdAt, { month: "short", day: "numeric" })}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-primary bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1 text-[11px] font-bold">
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {ev.sourceUrl ? (
                      <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{ev.sourceTitle}</a>
                    ) : (
                      <span>{ev.sourceTitle}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
