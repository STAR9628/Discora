"use client";

import type { InquiryStatus } from "@/features/debates/types";

const STATUS_CONFIG: Record<InquiryStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
  responded: {
    label: "Responded",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  satisfied: {
    label: "Satisfied",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  unsatisfied: {
    label: "Unsatisfied",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  },
  closed: {
    label: "Closed",
    className: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
  },
};

interface InquiryStatusBadgeProps {
  status: InquiryStatus;
}

export function InquiryStatusBadge({ status }: InquiryStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}
