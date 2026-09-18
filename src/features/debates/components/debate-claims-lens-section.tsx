"use client";

import { useMemo } from "react";
import { FileText, Loader2, Shield } from "lucide-react";
import { ClaimLensCard } from "@/features/discussions/components/claim-lens-card";
import { useDebateContext } from "./debate-data-provider";
import { usePaginatedClaims, useEvidenceMetadata,
useRoomArguments } from "@/features/discussions/hooks/use-discussions";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { DiscussionClaim } from "@/features/discussions/types";
import type { SectionPage } from "@/features/discussions/services/discussion-service";

const DEFAULT_PAGE_SIZE = 20;

interface SideClaimsLensProps {
  roomId: string;
  slug: string;
  side: "proposition" | "opposition";
  label: string;
  highlightId?: string | null;
  autoOpenEvidence?: boolean;
  /** Server-rendered first side-filtered page (public rooms only). */
  initialPage?: SectionPage<DiscussionClaim>;
}

function SideClaimsLens({ roomId, slug, side, label, highlightId, autoOpenEvidence, initialPage }: SideClaimsLensProps) {
  const {
    items: claims,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedClaims(roomId, { debateSide: side, pageSize: DEFAULT_PAGE_SIZE, initialPage });

  const { data: roomEvidence } = useEvidenceMetadata(roomId);
  const { data: roomArguments } = useRoomArguments(roomId);
  const { data: inquiryCounts } = useInquiryCountsForRoom(roomId);

  const evidenceCountByClaim = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roomEvidence) {
      for (const ev of roomEvidence) {
        counts[ev.claimId] = (counts[ev.claimId] || 0) + 1;
      }
    }
    return counts;
  }, [roomEvidence]);

  const argumentCountByClaim = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roomArguments) {
      for (const arg of roomArguments) {
        counts[arg.claimId] = (counts[arg.claimId] || 0) + 1;
      }
    }
    return counts;
  }, [roomArguments]);

  const inquiryCountByClaim = useMemo(() => inquiryCounts || {}, [inquiryCounts]);

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label={`Loading ${label} claims`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border/50 bg-card/20 p-4 animate-pulse space-y-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load {label} claims: {(error as Error).message}
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-8 text-center space-y-2">
        <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
        <p className="text-xs font-semibold text-foreground">No {label} claims yet</p>
        <p className="text-[11px] text-muted-foreground">
          Join the {label} side to assert structured claims.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          <span>{isLoadingMore ? "Loading…" : `Load more ${label} claims`}</span>
        </button>
      )}
    </div>
  );
}

export function DebateClaimsLensSection({
  highlightId,
  autoOpenEvidence,
  initialPropositionPage,
  initialOppositionPage,
}: {
  highlightId?: string | null;
  autoOpenEvidence?: boolean;
  /** Server-rendered first side-filtered pages (public rooms only). */
  initialPropositionPage?: SectionPage<DiscussionClaim>;
  initialOppositionPage?: SectionPage<DiscussionClaim>;
}) {
  const { room, slug, propositionClaims, oppositionClaims, userParticipation, setIsSideModalOpen, setTargetSideToJoin } = useDebateContext();
  const { user } = useAuth();

  const sideColor = {
    proposition: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    opposition: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400" },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Section Header & Side Join Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Structured Claims by Side</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare structured claims asserted for Proposition and Opposition.
          </p>
        </div>

        {/* Action CTAs per Side */}
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            userParticipation && userParticipation.side !== "neutral" ? (
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 bg-card/60 border border-border px-3 py-1.5 rounded-xl">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Asserting as {userParticipation.side === "proposition" ? "Proposition" : "Opposition"}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTargetSideToJoin("proposition");
                  setIsSideModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Join Side to Assert Claim</span>
              </button>
            )
          ) : (
            <span className="text-xs text-muted-foreground italic">Sign in to assert claims for a side</span>
          )}
        </div>
      </div>

      {/* Desktop View: 2 Parallel Columns */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        {/* Proposition Column */}
        <div className={`rounded-2xl ${sideColor.proposition.border} ${sideColor.proposition.bg} p-5 space-y-4 shadow-sm backdrop-blur-sm`}>
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${sideColor.proposition.dot}`} />
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-400">PROPOSITION</h3>
            </div>
            <span className="text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 px-2.5 py-0.5 border border-blue-500/20">
              {propositionClaims.length} Claims
            </span>
          </div>
          <SideClaimsLens roomId={room.id} slug={slug} side="proposition" label="proposition" highlightId={highlightId} autoOpenEvidence={autoOpenEvidence} initialPage={initialPropositionPage} />
        </div>

        {/* Opposition Column */}
        <div className={`rounded-2xl ${sideColor.opposition.border} ${sideColor.opposition.bg} p-5 space-y-4 shadow-sm backdrop-blur-sm`}>
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${sideColor.opposition.dot}`} />
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-400">OPPOSITION</h3>
            </div>
            <span className="text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 px-2.5 py-0.5 border border-rose-500/20">
              {oppositionClaims.length} Claims
            </span>
          </div>
          <SideClaimsLens roomId={room.id} slug={slug} side="opposition" label="opposition" highlightId={highlightId} autoOpenEvidence={autoOpenEvidence} initialPage={initialOppositionPage} />
        </div>
      </div>

      {/* Mobile & Small Tablet View: Responsive Side Comparison Segmented View */}
      <div className="md:hidden space-y-4">
        {/* This would need a side filter state - for now show all */}
        <div className="rounded-2xl border border-border/70 bg-card/30 p-4 space-y-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/40">
            Showing all claims ({propositionClaims.length + oppositionClaims.length})
          </div>
          <SideClaimsLens roomId={room.id} slug={slug} side="proposition" label="proposition" highlightId={highlightId} autoOpenEvidence={autoOpenEvidence} initialPage={initialPropositionPage} />
          <SideClaimsLens roomId={room.id} slug={slug} side="opposition" label="opposition" highlightId={highlightId} autoOpenEvidence={autoOpenEvidence} initialPage={initialOppositionPage} />
        </div>
      </div>
    </div>
  );
}