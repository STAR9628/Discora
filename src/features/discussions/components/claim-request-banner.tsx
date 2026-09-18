"use client";

import React, { memo } from "react";
import type { AggregatedClaimRequestRow } from "@/features/discussions/services/discussion-service";
import { Award, Check, X, SkipForward, Plus } from "lucide-react";

interface ClaimRequestBannerProps {
  isAuthor: boolean;
  requestState: AggregatedClaimRequestRow;
  hasUserRequested: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onDecline: () => void;
  onConvert?: () => void;
  isPendingAction?: boolean;
}

export const ClaimRequestBanner = memo(function ClaimRequestBanner({
  isAuthor,
  requestState,
  hasUserRequested,
  onAccept,
  onSkip,
  onDecline,
  onConvert,
  isPendingAction = false,
}: ClaimRequestBannerProps) {
  const { pendingCount, skippedCount, declinedCount, acceptedCount } = requestState;

  // If already accepted, nothing to show (it is now a Claim)
  if (acceptedCount > 0) {
    return null;
  }

  // Author view
  if (isAuthor) {
    if (pendingCount > 0) {
      return (
        <div className="mt-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Award className="h-4 w-4 text-primary shrink-0" />
            <span>
              {pendingCount === 1
                ? "1 person requested to examine this as a Claim."
                : `${pendingCount} people requested to examine this as a Claim.`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onAccept}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              <span>Accept</span>
            </button>
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onSkip}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent/40 font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <SkipForward className="h-3 w-3" />
              <span>Skip</span>
            </button>
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onDecline}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      );
    }

    if (skippedCount > 0 && declinedCount === 0) {
      return (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
          <span>You skipped the request to make this a Claim.</span>
          {onConvert && (
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onConvert}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add as Claim</span>
            </button>
          )}
        </div>
      );
    }

    if (declinedCount > 0) {
      return (
        <div className="mt-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
          <span>You declined the request to make this a Claim.</span>
        </div>
      );
    }

    return null;
  }

  // Non-author view
  if (hasUserRequested) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground font-medium">
        <Award className="h-3 w-3 text-primary/70" />
        <span>You requested this message be examined as a Claim</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground font-medium">
        <Award className="h-3 w-3 text-muted-foreground/70" />
        <span>Claim requested by {pendingCount} {pendingCount === 1 ? "person" : "people"}</span>
      </div>
    );
  }

  return null;
});
