"use client";

import { useState } from "react";
import { useCreateInquiry } from "@/features/debates/hooks/use-inquiries";
import type { InquiryType } from "@/features/debates/types";
import { X, Loader2, Send } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface InquiryCreateDialogProps {
  roomId: string;
  targetClaimId: string;
  isOpen: boolean;
  onClose: () => void;
}

const INQUIRY_TYPES: { value: InquiryType; label: string; description: string }[] = [
  { value: "clarification", label: "Clarification", description: "What do you mean by this?" },
  { value: "evidence_request", label: "Evidence Request", description: "Can you provide a source?" },
  { value: "assumption_check", label: "Assumption Check", description: "Is this assumption valid?" },
];

export function InquiryCreateDialog({ roomId, targetClaimId, isOpen, onClose }: InquiryCreateDialogProps) {
  const [inquiryType, setInquiryType] = useState<InquiryType>("clarification");
  const [content, setContent] = useState("");
  const createMutation = useCreateInquiry(roomId);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      toast.warning("Inquiry must be at least 10 characters.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        roomId,
        targetClaimId,
        inquiryType,
        content: trimmed,
      });
      toast.success("Inquiry posted.");
      setContent("");
      setInquiryType("clarification");
      onClose();
    } catch (err) {
      toast.error("Failed to post inquiry.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border/50 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
            Ask a Question
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Type
            </label>
            <div className="flex gap-2">
              {INQUIRY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setInquiryType(t.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all cursor-pointer ${
                    inquiryType === t.value
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-border/50 bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Question
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to know about this claim?"
              className="w-full rounded-xl border border-border/50 bg-card/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              rows={3}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground/60">
                {content.length}/2000
              </span>
              {content.trim().length > 0 && content.trim().length < 10 && (
                <span className="text-[10px] text-destructive">
                  Min 10 characters
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border/50 px-4 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={content.trim().length < 10 || createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Post Inquiry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
