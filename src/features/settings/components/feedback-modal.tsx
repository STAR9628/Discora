"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, CheckCircle, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

type FeedbackCategory = "bug" | "confusing_ux" | "suggestion" | "general";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; description: string }[] = [
  { value: "bug", label: "Bug", description: "Something is broken or behaves incorrectly." },
  { value: "confusing_ux", label: "Confusing / UX", description: "Hard to use or unclear." },
  { value: "suggestion", label: "Suggestion", description: "An idea to make Discora better." },
  { value: "general", label: "Other", description: "Anything else you want to share." },
];

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 3000;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setDescription("");
    setCategory("bug");
    setPageUrl(typeof window !== "undefined" ? window.location.href : "");
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !successMsg) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting, successMsg]);

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

  const descriptionLength = description.trim().length;
  const isDescriptionValid = descriptionLength >= MIN_DESCRIPTION && descriptionLength <= MAX_DESCRIPTION;
  const canSubmit = !isSubmitting && !successMsg && isDescriptionValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isDescriptionValid) {
      setErrorMsg(
        `Please describe your feedback in ${MIN_DESCRIPTION}-${MAX_DESCRIPTION} characters.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.rpc("submit_user_feedback", {
        p_category: category,
        p_description: description.trim(),
        p_page_url: pageUrl || null,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg("Thanks for your feedback. We appreciate it.");
      toast.success("Feedback submitted.");

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => {
          if (!isSubmitting && !successMsg) onClose();
        }}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-10"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
          aria-label="Close feedback dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 id="feedback-modal-title" className="text-lg font-bold text-foreground">
              Send Feedback
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Help us improve Discora. No personal info required.
            </p>
          </div>
        </div>

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

          <div className="space-y-1.5">
            <label
              htmlFor="feedback-category"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Category
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              disabled={isSubmitting || !!successMsg}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {CATEGORY_OPTIONS.find((o) => o.value === category)?.description}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="feedback-description"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Description
              </label>
              <span
                className={`text-[10px] ${
                  descriptionLength > MAX_DESCRIPTION
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {descriptionLength}/{MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              id="feedback-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting || !!successMsg}
              placeholder="Tell us what happened or what you'd like to see..."
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y min-h-[100px]"
            />
            {descriptionLength > 0 && descriptionLength < MIN_DESCRIPTION && (
              <p className="text-[11px] text-muted-foreground">
                At least {MIN_DESCRIPTION} characters required.
              </p>
            )}
          </div>

          {pageUrl && (
            <div className="text-[11px] text-muted-foreground/80 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 break-all">
              <span className="font-semibold">Page:</span> {pageUrl}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/40 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || !!successMsg}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isSubmitting ? "Sending..." : "Send Feedback"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
