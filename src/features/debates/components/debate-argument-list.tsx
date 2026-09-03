"use client";

import React, { useState } from "react";
import { FileText, Plus, Shield, Loader2 } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";
import { ClaimList } from "@/features/discussions/components/claim-list";
import { usePaginatedClaims, useClaimTarget } from "@/features/discussions/hooks/use-discussions";
import { SectionTargetCard, SectionTargetLoader, SectionTargetError, targetMetaForClaim } from "@/features/discussions/components/section-target-card";
import { useAuth } from "@/features/auth/hooks/use-auth";

const PAGE_SIZE = 10;

function SideClaims({ roomId, side, label, highlightId }: { roomId: string; side: "proposition" | "opposition"; label: string; highlightId?: string | null }) {
  const {
    items: claims,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedClaims(roomId, { debateSide: side, pageSize: PAGE_SIZE });

  const inLoadedPage = claims.some((c) => c.id === highlightId);
  const targetQuery = useClaimTarget(!inLoadedPage ? highlightId : null, roomId);

  return (
    <div>
      {highlightId && !inLoadedPage && (
        <>
          {targetQuery.isLoading ? (
            <SectionTargetLoader kind="claim" />
          ) : targetQuery.error ? (
            <SectionTargetError kind="claim" message={(targetQuery.error as Error).message} />
          ) : targetQuery.data && (targetQuery.data.debateSide ?? null) === side ? (
            <SectionTargetCard
              label="Claim"
              content={targetQuery.data.content}
              meta={targetMetaForClaim(targetQuery.data)}
              kind="claim"
            />
          ) : null}
        </>
      )}
      <div className="mt-3">
        <ClaimList roomId={roomId} debateSide={side} scrollToClaimId={inLoadedPage ? highlightId : null} claims={claims} isLoading={isLoading} />
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isLoadingMore ? "Loading…" : `Load more ${label} claims`}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function DebateArgumentList({ highlightId }: { highlightId?: string | null }) {
  const {
    room,
    propositionClaims,
    oppositionClaims,
    userParticipation,
    setIsSideModalOpen,
    setTargetSideToJoin,
  } = useDebateContext();
  const { user } = useAuth();

  const [mobileActiveSide, setMobileActiveSide] = useState<"proposition" | "opposition">("proposition");
  const mobileSide = mobileActiveSide;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Section Header & Side Claim Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Structured Arguments by Side</span>
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
                <Plus className="h-3.5 w-3.5" />
                <span>Join Side to Assert Claim</span>
              </button>
            )
          ) : (
            <span className="text-xs text-muted-foreground italic">Sign in to assert claims for a side</span>
          )}
        </div>
      </div>

      {/* Desktop View (768px+ inner / 1024px window): 2 Parallel Columns */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        {/* Proposition Column */}
        <div className="rounded-2xl border border-blue-500/30 bg-card/30 p-5 space-y-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-400">PROPOSITION</h3>
            </div>
            <span className="text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 px-2.5 py-0.5 border border-blue-500/20">
              {propositionClaims.length} Claims
            </span>
          </div>

          <SideClaims roomId={room.id} side="proposition" label="proposition" highlightId={highlightId} />
        </div>

        {/* Opposition Column */}
        <div className="rounded-2xl border border-rose-500/30 bg-card/30 p-5 space-y-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-400">OPPOSITION</h3>
            </div>
            <span className="text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 px-2.5 py-0.5 border border-rose-500/20">
              {oppositionClaims.length} Claims
            </span>
          </div>

          <SideClaims roomId={room.id} side="opposition" label="opposition" highlightId={highlightId} />
        </div>
      </div>

      {/* Mobile & Small Tablet View (<768px inner): Responsive Side Comparison Segmented View */}
      <div className="md:hidden space-y-4">
        {/* Segment Switcher Bar */}
        <div className="flex rounded-xl border border-border/80 bg-card/60 p-1">
          <button
            type="button"
            onClick={() => setMobileActiveSide("proposition")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-extrabold transition-all cursor-pointer ${
              mobileSide === "proposition"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span>Proposition ({propositionClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileActiveSide("opposition")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-extrabold transition-all cursor-pointer ${
              mobileSide === "opposition"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>Opposition ({oppositionClaims.length})</span>
          </button>
        </div>

        {/* Selected Side Claim List */}
        <div className="rounded-2xl border border-border/70 bg-card/30 p-4 space-y-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/40">
            Showing {mobileSide.toUpperCase()} claims
          </div>
          <SideClaims roomId={room.id} side={mobileSide} label={mobileSide} highlightId={highlightId} />
        </div>
      </div>
    </div>
  );
}
