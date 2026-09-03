"use client";

import { useInquiriesForTarget } from "@/features/debates/hooks/use-inquiries";
import { InquiryItem } from "./inquiry-item";
import { Loader2, MessageCircleQuestion } from "lucide-react";

interface InquiryListProps {
  roomId: string;
  targetClaimId: string;
}

export function InquiryList({ roomId, targetClaimId }: InquiryListProps) {
  const { data: inquiries, isLoading } = useInquiriesForTarget(roomId, targetClaimId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inquiries || inquiries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/20">
      <div className="flex items-center gap-1.5">
        <MessageCircleQuestion className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-bold text-foreground">
          Inquiries ({inquiries.length})
        </span>
      </div>
      <div className="space-y-2">
        {inquiries.map((inquiry) => (
          <InquiryItem key={inquiry.id} inquiry={inquiry} roomId={roomId} />
        ))}
      </div>
    </div>
  );
}
