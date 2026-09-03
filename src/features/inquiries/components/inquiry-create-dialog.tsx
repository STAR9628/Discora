"use client";

import React, { useState } from "react";
import { HelpCircle, FileText, AlertCircle, X, Loader2, Send } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCreateInquiry } from "../hooks/use-inquiries";
import { toast } from "@/components/ui/toast";
import type { InquiryType } from "../types";

interface InquiryCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  targetClaimId: string;
  claimContent?: string;
}

export function InquiryCreateDialog({
  isOpen,
  onClose,
  roomId,
  targetClaimId,
  claimContent,
}: InquiryCreateDialogProps) {
  const { user } = useAuth();
  const [inquiryType, setInquiryType] = useState<InquiryType>("clarification");
  const [content, setContent] = useState("");
  const createMutation = useCreateInquiry(roomId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();

    if (!user) {
      toast.error("You must be logged in to create an inquiry.");
      return;
    }
    if (trimmed.length < 10) {
      toast.error("Inquiry question must be at least 10 characters long.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Inquiry question cannot exceed 2000 characters.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        roomId,
        targetClaimId,
        inquiryType,
        content: trimmed,
      });
      toast.success("Structured Inquiry submitted!");
      setContent("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create inquiry");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-foreground">Ask Structured Inquiry</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Parent Claim Context Header */}
        {claimContent && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Target Claim</span>
            <p className="text-xs font-medium text-foreground/90 line-clamp-2">{claimContent}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inquiry Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Inquiry Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInquiryType("clarification")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  inquiryType === "clarification"
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border"
                }`}
              >
                <HelpCircle className="h-4 w-4 mb-1 text-amber-400" />
                <span className="text-xs font-bold">Clarification</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">What do you mean?</span>
              </button>

              <button
                type="button"
                onClick={() => setInquiryType("evidence_request")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  inquiryType === "evidence_request"
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border"
                }`}
              >
                <FileText className="h-4 w-4 mb-1 text-cyan-400" />
                <span className="text-xs font-bold">Evidence Request</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">Where is source?</span>
              </button>

              <button
                type="button"
                onClick={() => setInquiryType("assumption_check")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  inquiryType === "assumption_check"
                    ? "border-purple-500 bg-purple-500/10 text-purple-400"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border"
                }`}
              >
                <AlertCircle className="h-4 w-4 mb-1 text-purple-400" />
                <span className="text-xs font-bold">Assumption Check</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">What is assumed?</span>
              </button>
            </div>
          </div>

          {/* Question Content Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Question Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State what needs clarification or what evidence is requested..."
              rows={4}
              className="w-full rounded-xl border border-border/60 bg-card/40 p-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
              <span>{content.trim().length} / 2000 chars (min 10)</span>
              <span>Rate limit: max 5/hr</span>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/60 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createMutation.isPending || content.trim().length < 10}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-sm hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Submit Inquiry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
