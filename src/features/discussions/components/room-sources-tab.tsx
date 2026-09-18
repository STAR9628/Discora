"use client";

import Link from "next/link";
import { useRoomEvidence } from "@/features/discussions/hooks/use-discussions";
import { AlertCircle, Link2, ArrowRight } from "lucide-react";

interface RoomSourcesTabProps {
  roomId: string;
  /** Base path of the room's evidence lens, e.g. `/discussions/[slug]`. Enables source → citing-evidence reverse links. */
  evidenceLensBasePath?: string | null;
}

export function RoomSourcesTab({ roomId, evidenceLensBasePath }: RoomSourcesTabProps) {
  const { data: evidence, isLoading, error } = useRoomEvidence(roomId);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mt-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">Failed to load sources: {(error as Error).message}</p>
      </div>
    );
  }

  const uniqueSources: {
    id: string;
    title: string;
    url: string | null;
    filePath: string | null;
    isRetracted: boolean;
    citationsCount: number;
    evidenceIds: string[];
  }[] = [];
  const seenSourceIds = new Set<string>();

  (evidence || []).forEach((ev) => {
    if (ev.sourceId) {
      if (!seenSourceIds.has(ev.sourceId)) {
        seenSourceIds.add(ev.sourceId);
        uniqueSources.push({
          id: ev.sourceId,
          title: ev.sourceTitle,
          url: ev.sourceUrl,
          filePath: ev.sourceFilePath,
          isRetracted: ev.sourceIsRetracted,
          citationsCount: 1,
          evidenceIds: [ev.id],
        });
      } else {
        const srcObj = uniqueSources.find((s) => s.id === ev.sourceId);
        if (srcObj) {
          srcObj.citationsCount += 1;
          srcObj.evidenceIds.push(ev.id);
        }
      }
    }
  });

  if (uniqueSources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3 mt-4">
        <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
          <Link2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No source citations yet</p>
          <p className="text-xs text-muted-foreground mt-1">Verified references cited in evidence will be indexed here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h4 className="text-base font-bold text-foreground">Room Bibliography Sources</h4>
      <div className="grid grid-cols-1 gap-3.5">
        {uniqueSources.map((src) => (
          <div
            key={src.id}
            className={`rounded-2xl border border-border/50 bg-card/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-card/40 relative ${src.isRetracted ? "opacity-60 grayscale-[15%]" : ""}`}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h5 className="text-sm font-extrabold text-foreground">{src.title}</h5>
                {src.isRetracted && (
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                    Retracted
                  </span>
                )}
              </div>
              {src.url && (
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold">
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[280px] sm:max-w-md">{src.url}</span>
                </a>
              )}
              {evidenceLensBasePath && src.evidenceIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground/70">
                    Cited by:
                  </span>
                  {src.evidenceIds.slice(0, 2).map((evidenceId) => (
                    <Link
                      key={evidenceId}
                      href={`${evidenceLensBasePath}/evidence?highlight=${evidenceId}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/40 hover:bg-card/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      title="View citing evidence"
                    >
                      <span>Evidence</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  ))}
                  {src.evidenceIds.length > 2 && (
                    <span className="text-[10px] text-muted-foreground/70">
                      +{src.evidenceIds.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground bg-muted border border-border/60 px-2.5 py-1 rounded-lg">
                {src.citationsCount} {src.citationsCount === 1 ? "Citation" : "Citations"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
