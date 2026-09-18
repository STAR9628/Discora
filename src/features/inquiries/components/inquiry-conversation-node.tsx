"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { User, MessageSquare, ChevronDown, ChevronUp, Flag, CornerDownRight, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/date";
import { Linkify } from "@/lib/linkify";
import { ReportDialog } from "@/features/discussions/components/report-dialog";
import { InquiryTypeBadge } from "./inquiry-type-badge";
import { InquiryStatusPill } from "./inquiry-status-pill";
import { InquirySatisfactionBar } from "./inquiry-satisfaction-bar";
import { InquiryResponseList } from "./inquiry-response-list";
import { InquiryResponseForm } from "./inquiry-response-form";
import type { InquiryItem } from "../types";

interface InquiryConversationNodeProps {
  inquiry: InquiryItem;
  currentUserId?: string | null;
  /** Short claim snippet rendered in the relationship line. */
  claimLabel: string;
  onJumpToClaim?: () => void;
}

/**
 * A Targeted Inquiry rendered as a chronological conversation citizen: compact
 * chat bubble, explicit claim relationship, expandable responses, author
 * satisfaction. Distinct from room-level Questions by badge, taxonomy, status,
 * and claim attachment. Response/satisfaction reuse the existing lifecycle —
 * no parallel response architecture, no votes, no scores.
 */
export const InquiryConversationNode = memo(function InquiryConversationNode({
  inquiry,
  currentUserId,
  claimLabel,
  onJumpToClaim,
}: InquiryConversationNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isAuthor = Boolean(currentUserId && inquiry.createdBy && inquiry.createdBy === currentUserId);
  const nodeDate = formatDate(inquiry.createdAt, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      id={`inquiry-${inquiry.id}`}
      className="group/inquiry space-y-1 mt-2.5"
    >
      <div className={`flex flex-col ${isAuthor ? "items-end" : "items-start"} w-full`}>
        {/* Header Row: Author + Timestamp */}
        <div className={`flex items-center gap-2 pb-1 text-[11px] text-muted-foreground/80 ${isAuthor ? "justify-end flex-row-reverse" : "justify-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
          {!isAuthor && (
            <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
              {inquiry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inquiry.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-3 w-3 text-muted-foreground/70" />
              )}
            </div>
          )}
          <span className={`font-semibold ${isAuthor ? "text-primary text-xs" : "text-foreground text-xs"}`}>
            {isAuthor ? "You" : inquiry.username || "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 select-none">
            {nodeDate}
          </span>
        </div>

        {/* Conversational Bubble with subtle inquiry treatment */}
        <div
          className={`rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 shadow-xs max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words space-y-1.5 ${
            isAuthor ? "rounded-tr-xs" : "rounded-tl-xs"
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
              <MessageSquare className="h-2.5 w-2.5 shrink-0" />
              Inquiry
            </span>
            <InquiryTypeBadge type={inquiry.inquiryType} />
            <InquiryStatusPill status={inquiry.status} />
          </div>

          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            <Linkify text={inquiry.content} />
          </p>

          {/* Subtle claim relationship (approved conversational pattern) */}
          <button
            type="button"
            onClick={onJumpToClaim}
            disabled={!onJumpToClaim}
            title={onJumpToClaim ? "Jump to the examined claim" : undefined}
            className={`flex w-full items-start gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-left transition-colors ${
              onJumpToClaim ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
            }`}
          >
            <CornerDownRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
            <span className="text-[11px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/80">Targeted inquiry for</span>
              {" "}
              <span className="break-words">“{claimLabel}”</span>
            </span>
          </button>

          {/* Author satisfaction controls (existing lifecycle, author-only internally) */}
          <InquirySatisfactionBar inquiry={inquiry} currentUserId={currentUserId} />

          {/* Expandable responses (existing lifecycle) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>
                {isExpanded ? "Hide Responses" : `Responses (${inquiry.responseCount})`}
              </span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {isExpanded && (
            <div className="pt-2 space-y-3 border-t border-border/20">
              <InquiryResponseList inquiryItemId={inquiry.id} />
              <InquiryResponseForm inquiry={inquiry} />
            </div>
          )}

          {/* Subordinate actions: standalone details + report */}
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <Link
              href={`/inquiries/${inquiry.id}`}
              className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
              title="Open standalone inquiry page"
            >
              <span>Details</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            {currentUserId && (
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors cursor-pointer"
                aria-label="Report inquiry"
              >
                <Flag className="h-3 w-3" />
                <span>Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        inquiryId={inquiry.id}
        contentPreview={inquiry.content.slice(0, 100)}
        entityTypeLabel="Inquiry"
        roomId={inquiry.roomId}
      />
    </div>
  );
});
