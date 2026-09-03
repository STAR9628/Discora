"use client";

import React from "react";
import { HelpCircle, FileText, AlertCircle } from "lucide-react";
import type { InquiryType } from "../types";

interface InquiryTypeBadgeProps {
  type: InquiryType;
  showPrompt?: boolean;
}

export function InquiryTypeBadge({ type, showPrompt = false }: InquiryTypeBadgeProps) {
  switch (type) {
    case "clarification":
      return (
        <div className="inline-flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/30">
            <HelpCircle className="h-3 w-3" />
            Clarification
          </span>
          {showPrompt && (
            <span className="text-[11px] text-muted-foreground italic">
              &quot;What do you mean by this statement?&quot;
            </span>
          )}
        </div>
      );
    case "evidence_request":
      return (
        <div className="inline-flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
            <FileText className="h-3 w-3" />
            Evidence Request
          </span>
          {showPrompt && (
            <span className="text-[11px] text-muted-foreground italic">
              &quot;What source or evidence supports this claim?&quot;
            </span>
          )}
        </div>
      );
    case "assumption_check":
      return (
        <div className="inline-flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-purple-400 border border-purple-500/30">
            <AlertCircle className="h-3 w-3" />
            Assumption Check
          </span>
          {showPrompt && (
            <span className="text-[11px] text-muted-foreground italic">
              &quot;What unstated assumption does this claim depend on?&quot;
            </span>
          )}
        </div>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-extrabold text-muted-foreground">
          Inquiry
        </span>
      );
  }
}
