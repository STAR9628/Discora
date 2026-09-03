"use client";

import { MessageCircleQuestion } from "lucide-react";

interface InquiryButtonProps {
  count: number;
  onClick: () => void;
}

export function InquiryButton({ count, onClick }: InquiryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 transition-colors hover:bg-amber-500/20 cursor-pointer"
    >
      <MessageCircleQuestion className="h-3 w-3" />
      <span>Inquiry{count > 0 ? ` (${count})` : ""}</span>
    </button>
  );
}
