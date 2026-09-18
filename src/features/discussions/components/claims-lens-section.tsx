"use client";

import { useMemo } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ClaimLensCard } from "./claim-lens-card";
import {
  usePaginatedClaims,
  useEvidenceMetadata,
  useRoomArguments,
} from "@/features/discussions/hooks/use-discussions";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";
import type { DiscussionClaim } from "@/features/discussions/types";
import type { SectionPage } from "@/features/discussions/services/discussion-service";

const DEFAULT_PAGE_SIZE = 20;

interface ClaimsLensSectionProps {
  roomId: string;
  slug: string;
  highlightId?: string | null;
  autoOpenEvidence?: boolean;
  /** Server-rendered first claims page (public rooms only); see usePaginatedClaims. */
  initialClaimsPage?: SectionPage<DiscussionClaim>;
}

export function ClaimsLensSection({
  roomId,
  slug,
  highlightId,
  autoOpenEvidence,
  initialClaimsPage,
}: ClaimsLensSectionProps) {
  const {
    items: claims,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedClaims(roomId, { pageSize: DEFAULT_PAGE_SIZE, initialPage: initialClaimsPage });

  const { data: roomEvidence } = useEvidenceMetadata(roomId);
  const { data: roomArguments } = useRoomArguments(roomId);
  const { data: inquiryCounts } = useInquiryCountsForRoom(roomId);

  const evidenceCountByClaim: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roomEvidence) {
      for (const ev of roomEvidence) {
        counts[ev.claimId] = (counts[ev.claimId] || 0) + 1;
      }
    }
    return counts;
  }, [roomEvidence]);

  const argumentCountByClaim: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roomArguments) {
      for (const arg of roomArguments) {
        counts[arg.claimId] = (counts[arg.claimId] || 0) + 1;
      }
    }
    return counts;
  }, [roomArguments]);

  const inquiryCountByClaim = useMemo(
    () => inquiryCounts || {},
    [inquiryCounts]
  );

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading claims">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-border/50 bg-card/20 p-4 animate-pulse space-y-2"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load claims: {(error as Error).message}
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-10 text-center max-w-2xl mx-auto space-y-2">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-bold text-foreground">No claims asserted yet</h3>
        <p className="text-[12px] text-muted-foreground">
          Claims are structured assertions that can be examined with evidence and arguments.
          Use the composer to assert a claim, or request that a message be formalized as a claim.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => {
        const isHighlighted = highlightId != null && highlightId === claim.id;
        return (
          <div
            key={claim.id}
            className={
              isHighlighted
                ? "rounded-2xl ring-2 ring-primary/60 ring-offset-2 ring-offset-background transition-all"
                : undefined
            }
          >
            <ClaimLensCard
              claim={claim}
              slug={slug}
              evidenceCount={evidenceCountByClaim[claim.id] || 0}
              argumentCount={argumentCountByClaim[claim.id] || 0}
              inquiryCount={inquiryCountByClaim[claim.id] || 0}
              autoOpenEvidence={autoOpenEvidence && isHighlighted}
            />
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{isLoadingMore ? "Loading…" : "Load more claims"}</span>
        </button>
      )}
    </div>
  );
}