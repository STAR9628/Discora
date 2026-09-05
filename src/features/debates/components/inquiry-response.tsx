"use client";

import { formatDate } from "@/lib/date";
import { User } from "lucide-react";

interface InquiryResponseProps {
  content: string;
  createdBy: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function InquiryResponse({ content, username, avatarUrl, createdAt }: InquiryResponseProps) {
  return (
    <div className="flex gap-2 pl-3 border-l-2 border-border/30 py-1.5">
      <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-3 w-3 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-foreground">{username || "Unknown User"}</span>
          <span className="text-[10px] text-muted-foreground/60">{formatDate(createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <p className="text-[12px] text-foreground/80 leading-relaxed mt-0.5">{content}</p>
      </div>
    </div>
  );
}
