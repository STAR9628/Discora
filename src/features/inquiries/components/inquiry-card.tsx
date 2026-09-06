"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, MessageSquare, ChevronDown, ChevronUp, ExternalLink, Flag } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ReportDialog } from "@/features/discussions/components/report-dialog";
import { InquiryTypeBadge } from "./inquiry-type-badge";
import { InquiryStatusPill } from "./inquiry-status-pill";
import { InquirySatisfactionBar } from "./inquiry-satisfaction-bar";
import { InquiryResponseList } from "./inquiry-response-list";
import { InquiryResponseForm } from "./inquiry-response-form";
import { AuthorTrustSignal } from "@/features/reputation/components/author-trust-signal";
import { formatDate } from "@/lib/date";
import type { InquiryItem } from "../types";
import { Tooltip } from "@/components/ui/tooltip";

interface InquiryCardProps {
  inquiry: InquiryItem;
  defaultExpanded?: boolean;
  showLinkToStandalone?: boolean;
}

export function InquiryCard({ inquiry, defaultExpanded = false, showLinkToStandalone = true }: InquiryCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const contentPreview = inquiry.content.slice(0, 100);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/50 p-4 md:p-5 space-y-3.5 shadow-sm backdrop-blur-sm transition-all hover:border-border">
      {/* Header Line: Badges & Direct Route Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <InquiryTypeBadge type={inquiry.inquiryType} showPrompt />
          <InquiryStatusPill status={inquiry.status} />
        </div>

        <div className="flex items-center gap-1">
          {showLinkToStandalone && (
            <Link
              href={`/inquiries/${inquiry.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-amber-400 transition-colors"
              title="Open standalone inquiry page"
            >
              <span>Details</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          {user && (
            <Tooltip content="Report inquiry">
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Report inquiry"
              >
                <Flag className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main Question Content */}
      <div className="space-y-1.5">
        <h4 className="text-sm md:text-base font-bold text-foreground leading-snug">
          {inquiry.content}
        </h4>

        {/* User Author & Date Line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <div className="flex items-center gap-2">
            {inquiry.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inquiry.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-2.5 w-2.5" />
              </div>
            )}
            <span className="font-semibold text-foreground/80">{inquiry.username || "Anonymous"}</span>
            {inquiry.createdBy && <AuthorTrustSignal userId={inquiry.createdBy} username={inquiry.username} />}
            {inquiry.inquirerSide && (
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40">
                {inquiry.inquirerSide}
              </span>
            )}
          </div>
          <span>{formatDate(inquiry.createdAt)}</span>
        </div>
      </div>

      {/* Creator Satisfaction Bar */}
      <InquirySatisfactionBar inquiry={inquiry} currentUserId={user?.id} />

      {/* Expand / Collapse Response Thread Bar */}
      <div className="pt-1 flex items-center justify-between border-t border-border/30">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>
            {isExpanded ? "Hide Responses" : `Responses (${inquiry.responseCount})`}
          </span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Response Thread & Form when Expanded */}
      {isExpanded && (
        <div className="pt-2 space-y-4 border-t border-border/20">
          <InquiryResponseList inquiryItemId={inquiry.id} />
          <InquiryResponseForm inquiry={inquiry} />
        </div>
      )}

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        inquiryId={inquiry.id}
        contentPreview={contentPreview}
        entityTypeLabel="Inquiry"
        roomId={inquiry.roomId}
      />
    </div>
  );
}
