"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, User, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { InquiryTypeBadge } from "./inquiry-type-badge";
import { InquiryStatusPill } from "./inquiry-status-pill";
import { InquirySatisfactionBar } from "./inquiry-satisfaction-bar";
import { InquiryResponseList } from "./inquiry-response-list";
import { InquiryResponseForm } from "./inquiry-response-form";
import { AuthorTrustSignal } from "@/features/reputation/components/author-trust-signal";
import { formatDate } from "@/lib/date";
import type { InquiryItem } from "../types";
import type { DiscussionClaim } from "@/features/discussions/types";

interface InquiryDetailProps {
  inquiry: InquiryItem;
  parentClaim?: DiscussionClaim | null;
  roomSlug?: string | null;
  roomTitle?: string | null;
  roomType?: "debate" | "discussion" | null;
}

export function InquiryDetail({
  inquiry,
  parentClaim,
  roomSlug,
  roomTitle,
  roomType = "discussion",
}: InquiryDetailProps) {
  const { user } = useAuth();

  const roomHref = roomSlug
    ? roomType === "debate"
      ? `/debates/${roomSlug}`
      : `/discussions/${roomSlug}`
    : "#";

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={roomHref}
            className="inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {roomTitle || "Room"}</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          <span className="font-extrabold text-foreground">Inquiry Detail</span>
        </div>

        <div className="flex items-center gap-2">
          <InquiryTypeBadge type={inquiry.inquiryType} showPrompt />
          <InquiryStatusPill status={inquiry.status} />
        </div>
      </div>

      {/* Target Parent Claim Context Card */}
      {parentClaim ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Targeted Claim
            </span>
            {parentClaim.debateSide && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50">
                {parentClaim.debateSide}
              </span>
            )}
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground leading-snug">
            {parentClaim.content}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span>Claim ID: {parentClaim.id.slice(0, 8)}...</span>
            <span>•</span>
            <span>Type: {parentClaim.claimType}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/30 p-3 text-xs text-muted-foreground">
          Target Claim ID: <code className="font-mono">{inquiry.targetClaimId}</code>
        </div>
      )}

      {/* Main Inquiry Card Box */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 md:p-6 space-y-4 shadow-lg backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <h1 className="text-lg md:text-xl font-extrabold text-foreground leading-snug">
              {inquiry.content}
            </h1>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-1">
            <div className="flex items-center gap-2">
              {inquiry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inquiry.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-3 w-3" />
                </div>
              )}
              <span className="font-semibold text-foreground">{inquiry.username || "Anonymous"}</span>
              {inquiry.createdBy && <AuthorTrustSignal userId={inquiry.createdBy} username={inquiry.username} />}
              {inquiry.inquirerSide && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {inquiry.inquirerSide}
                </span>
              )}
            </div>
            <span>Asked {formatDate(inquiry.createdAt)}</span>
          </div>
        </div>

        {/* Inquirer Satisfaction Bar */}
        <InquirySatisfactionBar inquiry={inquiry} currentUserId={user?.id} />

        {/* Response Thread Section */}
        <div className="pt-4 border-t border-border/30 space-y-4">
          <InquiryResponseList inquiryItemId={inquiry.id} />
          <InquiryResponseForm inquiry={inquiry} />
        </div>
      </div>
    </div>
  );
}
