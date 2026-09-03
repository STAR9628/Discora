"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRespondToInquiry } from "../hooks/use-inquiries";
import { toast } from "@/components/ui/toast";
import type { InquiryItem } from "../types";

interface InquiryResponseFormProps {
  inquiry: InquiryItem;
}

export function InquiryResponseForm({ inquiry }: InquiryResponseFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const respondMutation = useRespondToInquiry(inquiry.roomId);

  const isClosed = inquiry.status === "closed" || inquiry.status === "satisfied";

  if (isClosed) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center text-xs text-muted-foreground italic">
        This inquiry is closed or satisfied. No further responses can be added.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
        Sign in to respond to this inquiry.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      toast.error("Response must be at least 10 characters.");
      return;
    }
    if (trimmed.length > 5000) {
      toast.error("Response cannot exceed 5000 characters.");
      return;
    }

    try {
      await respondMutation.mutateAsync({
        inquiryItemId: inquiry.id,
        content: trimmed,
      });
      setContent("");
      toast.success("Response added (+3 Reputation)");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post response");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a clear response addressing this inquiry..."
        rows={3}
        className="w-full rounded-xl border border-border/60 bg-card/40 p-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">
          {content.trim().length} / 5000 chars (min 10)
        </span>
        <button
          type="submit"
          disabled={respondMutation.isPending || content.trim().length < 10}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black shadow-sm hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {respondMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Post Response</span>
        </button>
      </div>
    </form>
  );
}
