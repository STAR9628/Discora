"use client";

import { useState, useEffect, useRef } from "react";
import { useFlagEntity } from "@/features/discussions/hooks/use-discussions";
import { X, AlertTriangle, CheckCircle, Loader2, Flag } from "lucide-react";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId?: string | null;
  questionId?: string | null;
  claimId?: string | null;
  evidenceId?: string | null;
  inquiryId?: string | null;
  contentPreview: string;
  entityTypeLabel: string;
  roomId?: string;
}

export function ReportDialog({
  isOpen,
  onClose,
  messageId = null,
  questionId = null,
  claimId = null,
  evidenceId = null,
  inquiryId = null,
  contentPreview,
  entityTypeLabel,
  roomId,
}: ReportDialogProps) {
  const flagMutation = useFlagEntity();
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Autofocus the textarea when opened
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Recover focus when isOpen transitions to false or when unmounting
  useEffect(() => {
    return () => {
      previousActiveElementRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      previousActiveElementRef.current?.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !flagMutation.isPending && !successMsg) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, flagMutation.isPending, successMsg]);

  // Simple focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleFocusTrap);
    return () => window.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMsg("A reason is required.");
      return;
    }
    if (trimmedReason.length < 5) {
      setErrorMsg("Please provide a reason with at least 5 characters.");
      return;
    }

    try {
      await flagMutation.mutateAsync({
        messageId,
        questionId,
        claimId,
        evidenceId,
        inquiryId,
        reason: trimmedReason,
        roomId: roomId || undefined,
      });

      setSuccessMsg("Thank you. The content has been reported and is under review.");
      setReason("");
      
      // Auto close after 1.5 seconds on success
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit report.";
      if (msg.includes("already submitted a report") || msg.includes("already been reported")) {
        setErrorMsg("This item has already been reported by you and is currently under review.");
      } else {
        setErrorMsg(msg);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-10"
      >
        <button
          onClick={onClose}
          disabled={flagMutation.isPending}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h3 id="report-dialog-title" className="text-lg font-bold text-foreground">Report {entityTypeLabel}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit a flag if this content violates platform guidelines.
            </p>
          </div>
        </div>

        {/* Content Preview */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 mb-4 text-xs">
          <span className="font-bold text-muted-foreground block mb-1">
            Content Preview
          </span>
          <p className="text-foreground/80 leading-relaxed italic line-clamp-3">
            &ldquo;{contentPreview}&rdquo;
          </p>
        </div>

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-500">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <label htmlFor="report-reason" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason for Report
            </label>
            <textarea
              ref={textareaRef}
              id="report-reason"
              rows={3}
              placeholder="Describe why this content is inappropriate (e.g., harassment, spam, misinformation)..."
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={flagMutation.isPending || !!successMsg}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={flagMutation.isPending || !!successMsg}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={flagMutation.isPending || !!successMsg || !reason.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {flagMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Flag className="h-3.5 w-3.5" />
              )}
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
