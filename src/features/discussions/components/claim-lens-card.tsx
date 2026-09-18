"use client";

import React, { memo } from "react";
import Link from "next/link";
import { FileText, Scale, HelpCircle, MessageSquare, ArrowRight } from "lucide-react";
import { Linkify } from "@/lib/linkify";
import type { DiscussionClaim } from "../types";

interface ClaimLensCardProps {
  claim: DiscussionClaim;
  slug: string;
  evidenceCount?: number;
  argumentCount?: number;
  inquiryCount?: number;
  autoOpenEvidence?: boolean;
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  fact: "FACT",
  opinion: "OPINION",
  prediction: "PREDICTION",
  proposal: "PROPOSAL",
  observation: "OBSERVATION",
};

const CLAIM_TYPE_STYLES: Record<string, string> = {
  fact: "bg-blue-500/10 border-blue-500/25 text-blue-400",
  opinion: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  prediction: "bg-orange-500/10 border-orange-500/25 text-orange-400",
  proposal: "bg-slate-500/10 border-slate-500/25 text-slate-400",
  observation: "bg-amber-500/10 border-amber-500/25 text-amber-400",
};

export const ClaimLensCard = memo(function ClaimLensCard({
  claim,
  slug,
  evidenceCount = 0,
  argumentCount = 0,
  inquiryCount = 0,
  autoOpenEvidence = false,
}: ClaimLensCardProps) {
  const agreeCount = claim.agreeCount ?? 0;
  const disagreeCount = claim.disagreeCount ?? 0;
  const totalVotes = agreeCount + disagreeCount;
  const claimType = claim.claimType || "opinion";
  const typeStyle = CLAIM_TYPE_STYLES[claimType] || "bg-muted border-border text-muted-foreground";

  const conversationHref = `/discussions/${slug}?highlight=${claim.originMessageId || claim.id}`;

  return (
    <article
      id={`claim-${claim.id}`}
      className="group relative rounded-2xl border border-border/50 bg-card/30 p-4 space-y-3 transition-all hover:bg-card/45 hover:border-border/70"
    >
      {/* Top Row: Claim Badge + Type + Origin Link */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
            <FileText className="h-2.5 w-2.5" />
            Claim
          </span>
          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${typeStyle}`}>
            {CLAIM_TYPE_LABELS[claimType] || claimType.toUpperCase()}
          </span>
        </div>

        {/* Conversation Origin Link */}
        {claim.originMessageId && (
          <Link
            href={conversationHref}
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 hover:bg-card/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="View in conversation"
          >
            <MessageSquare className="h-3 w-3" />
            <span className="hidden sm:inline">In Conversation</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Claim Body with safe linkification */}
      <div className="text-sm md:text-base leading-relaxed text-foreground font-medium break-words whitespace-pre-wrap">
        <Linkify text={claim.content} />
      </div>

      {/* Examination Actions: links carry claim context; the evidence lens auto-opens when requested */}
      <div className="flex flex-wrap items-center gap-1.5 opacity-100 transition-opacity duration-150">
        <Link
          href={
            autoOpenEvidence
              ? `/discussions/${slug}/evidence?claim=${claim.id}&autoOpen=true`
              : `/discussions/${slug}/evidence?claim=${claim.id}`
          }
          className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 hover:bg-card/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Examine or submit evidence"
        >
          <FileText className="h-3 w-3" />
          <span>Evidence</span>
          {evidenceCount > 0 && (
            <span className="rounded-full bg-primary/15 text-primary/90 px-1.5 py-0 text-[9px] font-bold">
              {evidenceCount}
            </span>
          )}
        </Link>

        <Link
          href={`/discussions/${slug}/claims?highlight=${claim.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 hover:bg-card/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Examine arguments and relations"
        >
          <Scale className="h-3 w-3" />
          <span>Arguments</span>
          {argumentCount > 0 && (
            <span className="rounded-full bg-primary/15 text-primary/90 px-1.5 py-0 text-[9px] font-bold">
              {argumentCount}
            </span>
          )}
        </Link>

        {inquiryCount > 0 && (
          <Link
            href={`/discussions/${slug}/questions?claim=${claim.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 hover:bg-card/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            title="View targeted inquiries"
          >
            <HelpCircle className="h-3 w-3" />
            <span>Inquiries</span>
            <span className="rounded-full bg-primary/15 text-primary/90 px-1.5 py-0 text-[9px] font-bold">
              {inquiryCount}
            </span>
          </Link>
        )}
      </div>

      {/* Bottom Row: Descriptive Community Stance (Text Only, No Buttons) */}
      {totalVotes > 0 && (
        <div className="pt-2 border-t border-border/30">
          <p className="text-[10px] font-medium text-muted-foreground/70 select-none">
            {agreeCount} Support · {disagreeCount} Challenge · {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </p>
        </div>
      )}
    </article>
  );
});

ClaimLensCard.displayName = "ClaimLensCard";