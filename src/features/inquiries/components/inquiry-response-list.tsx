"use client";

import React from "react";
import { MessageSquare, User, Loader2 } from "lucide-react";
import { useInquiryResponses } from "../hooks/use-inquiries";
import { AuthorTrustSignal } from "@/features/reputation/components/author-trust-signal";
import { formatDate } from "@/lib/date";

interface InquiryResponseListProps {
  inquiryItemId: string;
}

export function InquiryResponseList({ inquiryItemId }: InquiryResponseListProps) {
  const { data: responses, isLoading, error } = useInquiryResponses(inquiryItemId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading responses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
        Failed to load inquiry responses.
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        No responses yet. Be the first to address this inquiry.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Responses ({responses.length})</span>
      </div>

      <div className="space-y-2.5">
        {responses.map((resp) => (
          <div key={resp.id} className="rounded-xl border border-border/50 bg-card/40 p-3.5 space-y-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {resp.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resp.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-3 w-3" />
                  </div>
                )}
                <span className="font-semibold text-foreground">{resp.username || "Anonymous"}</span>
                {resp.createdBy && <AuthorTrustSignal userId={resp.createdBy} username={resp.username} />}
              </div>
              <span className="text-[11px] text-muted-foreground/60">{formatDate(resp.createdAt)}</span>
            </div>

            <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {resp.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
