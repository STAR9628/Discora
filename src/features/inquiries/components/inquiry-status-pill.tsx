"use client";

import React from "react";
import { CheckCircle2, XCircle, MessageSquare, Clock, Lock } from "lucide-react";
import type { InquiryStatus } from "../types";

interface InquiryStatusPillProps {
  status: InquiryStatus;
}

export function InquiryStatusPill({ status }: InquiryStatusPillProps) {
  switch (status) {
    case "open":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-400 border border-blue-500/20">
          <Clock className="h-3 w-3" />
          Open
        </span>
      );
    case "responded":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
          <MessageSquare className="h-3 w-3" />
          Responded
        </span>
      );
    case "satisfied":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/20" title="Inquirer confirmed response addressed their question">
          <CheckCircle2 className="h-3 w-3" />
          Satisfied
        </span>
      );
    case "unsatisfied":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400 border border-rose-500/20">
          <XCircle className="h-3 w-3" />
          Unsatisfied
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border border-border/50">
          <Lock className="h-3 w-3" />
          Closed
        </span>
      );
    default:
      return null;
  }
}
