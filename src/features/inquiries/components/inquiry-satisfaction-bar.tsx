"use client";

import React from "react";
import { CheckCircle2, XCircle, Lock, Loader2 } from "lucide-react";
import { useSatisfyInquiry, useUnsatisfyInquiry, useCloseInquiry } from "../hooks/use-inquiries";
import { toast } from "@/components/ui/toast";
import type { InquiryItem } from "../types";

interface InquirySatisfactionBarProps {
  inquiry: InquiryItem;
  currentUserId?: string | null;
}

export function InquirySatisfactionBar({ inquiry, currentUserId }: InquirySatisfactionBarProps) {
  const satisfyMutation = useSatisfyInquiry(inquiry.roomId);
  const unsatisfyMutation = useUnsatisfyInquiry(inquiry.roomId);
  const closeMutation = useCloseInquiry(inquiry.roomId);

  const isInquirer = currentUserId && currentUserId === inquiry.createdBy;
  if (!isInquirer) return null;

  const isPending = satisfyMutation.isPending || unsatisfyMutation.isPending || closeMutation.isPending;

  const handleSatisfy = async () => {
    try {
      await satisfyMutation.mutateAsync(inquiry.id);
      toast.success("Inquiry marked as Satisfied (+2 Reputation)");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to satisfy inquiry");
    }
  };

  const handleUnsatisfy = async () => {
    try {
      await unsatisfyMutation.mutateAsync(inquiry.id);
      toast.info("Inquiry marked as Unsatisfied");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unsatisfy inquiry");
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(inquiry.id);
      toast.info("Inquiry closed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to close inquiry");
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs font-semibold text-amber-200/90">
        As the question creator, did the response resolve your inquiry?
      </div>
      <div className="flex items-center gap-2">
        {inquiry.status === "responded" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSatisfy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {satisfyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Mark Satisfied</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleUnsatisfy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-bold hover:bg-rose-600/30 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {unsatisfyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>Needs Detail</span>
            </button>
          </>
        )}

        {inquiry.status !== "closed" && inquiry.status !== "satisfied" && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleClose}
            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {closeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            <span>Close</span>
          </button>
        )}
      </div>
    </div>
  );
}
