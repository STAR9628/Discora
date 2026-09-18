"use client";

import React, { memo } from "react";
import type { DiscussionClaim } from "@/features/discussions/types";
import { Linkify } from "@/lib/linkify";
import { Award, Scale, FileText, HelpCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useVoteClaim } from "@/features/discussions/hooks/use-discussions";

interface ClaimInConversationProps {
  claim: DiscussionClaim;
  roomId: string;
  currentUserId?: string | null;
  onNavigateToEvidence?: () => void;
  onNavigateToClaim?: (claimId: string) => void;
  onNavigateToInquiries?: (claimId: string) => void;
  /** When provided, + Argument opens the claim-contextual creation flow instead of navigating. */
  onCreateArgument?: (claim: DiscussionClaim) => void;
  isAuthor?: boolean;
}

export const ClaimInConversation = memo(function ClaimInConversation({
  claim,
  roomId,
  currentUserId,
  onNavigateToEvidence,
  onNavigateToClaim,
  onNavigateToInquiries,
  onCreateArgument,
  isAuthor = false,
}: ClaimInConversationProps) {
  const voteMutation = useVoteClaim(roomId, claim.id);

  const agreeCount = claim.agreeCount ?? 0;
  const disagreeCount = claim.disagreeCount ?? 0;
  const totalVotes = agreeCount + disagreeCount;
  const userVote = claim.userVote;

  const handleVote = (type: "agree" | "disagree") => {
    if (!currentUserId) return;
    const nextVote = userVote === type ? null : type;
    voteMutation.mutate(nextVote);
  };

  return (
    <div
      data-testid={`claim-bubble-${claim.id}`}
      className={`rounded-2xl ${
        isAuthor ? "rounded-tr-xs" : "rounded-tl-xs"
      } border border-blue-500/35 bg-blue-500/8 ring-1 ring-blue-500/15 shadow-xs p-3 sm:p-3.5 space-y-2 group/claim relative transition-all duration-150`}
    >
      {/* Header: Subtle Badge + Optional Type & Lightweight Examination Actions on Hover/Focus */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-400">
            <Award className="h-2.5 w-2.5" />
            Claim
          </span>
          {claim.claimType && (
            <span className="rounded-md border border-blue-500/20 bg-blue-500/5 px-1.5 py-0.5 text-[9px] font-semibold text-blue-300/80 uppercase">
              {claim.claimType}
            </span>
          )}
        </div>

        {/* Primary examination affordances (compact, revealed on hover/focus on desktop, accessible on mobile) */}
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/claim:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          {onNavigateToEvidence && (
            <button
              type="button"
              onClick={onNavigateToEvidence}
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/70 hover:bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground/80 transition-colors cursor-pointer"
              title="Examine or submit evidence for this claim"
            >
              <FileText className="h-2.5 w-2.5 text-blue-400 shrink-0" />
              <span>+ Evidence</span>
            </button>
          )}
          {(onCreateArgument || onNavigateToClaim) && (
            <button
              type="button"
              onClick={() => {
                if (onCreateArgument) {
                  onCreateArgument(claim);
                } else {
                  onNavigateToClaim?.(claim.id);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/70 hover:bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground/80 transition-colors cursor-pointer"
              title="Add reasoning for this claim"
            >
              <Scale className="h-2.5 w-2.5 text-blue-400 shrink-0" />
              <span>+ Argument</span>
            </button>
          )}
          {onNavigateToInquiries && (
            <button
              type="button"
              onClick={() => onNavigateToInquiries(claim.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/70 hover:bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Open targeted inquiries for this claim"
            >
              <HelpCircle className="h-2.5 w-2.5 shrink-0" />
              <span>Inquiry</span>
            </button>
          )}
        </div>
      </div>

      {/* Claim Body with safe linkification */}
      <div className="text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words">
        <Linkify text={claim.content} />
      </div>

      {/* Bottom Row: Descriptive Community Stance (Subordinate, Support / Challenge) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
        <span className="text-[10px] text-muted-foreground/70 select-none">
          {agreeCount} Support · {disagreeCount} Challenge · {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>

        {currentUserId && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/claim:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={() => handleVote("agree")}
              disabled={voteMutation.isPending}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer select-none ${
                userVote === "agree"
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold"
                  : "border-blue-500/20 bg-background/50 hover:bg-card text-muted-foreground"
              }`}
            >
              <ThumbsUp className="h-2.5 w-2.5" />
              <span>Support</span>
            </button>
            <button
              type="button"
              onClick={() => handleVote("disagree")}
              disabled={voteMutation.isPending}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer select-none ${
                userVote === "disagree"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold"
                  : "border-border/40 bg-background/50 hover:bg-card text-muted-foreground"
              }`}
            >
              <ThumbsDown className="h-2.5 w-2.5" />
              <span>Challenge</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
