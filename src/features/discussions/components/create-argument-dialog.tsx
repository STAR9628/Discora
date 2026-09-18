"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateArgument } from "@/features/discussions/hooks/use-discussions";
import { X, Scale, Loader2, AlertTriangle } from "lucide-react";

interface CreateArgumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  claimId: string;
  claimPreview: string;
}

type ArgumentStance = "supporting" | "challenging";

const MIN_LENGTH = 50;
const MAX_LENGTH = 5000;

/**
 * Claim-contextual argument creation (initiated from a Claim's + Argument
 * action; never a top-level composer mode). Reasoning attached to one primary
 * Claim: supporting or challenging. No voting, scoring, or reputation.
 */
export function CreateArgumentDialog({
  isOpen,
  onClose,
  roomId,
  claimId,
  claimPreview,
}: CreateArgumentDialogProps) {
  const createMutation = useCreateArgument(roomId);
  const [stance, setStance] = useState<ArgumentStance>("supporting");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Reset transient state whenever a new claim target opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, claimId]);

  useEffect(() => {
    if (!isOpen) {
      previousActiveElementRef.current?.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !createMutation.isPending && !successMsg) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, createMutation.isPending, successMsg]);

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

  const trimmed = content.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (trimmed.length < MIN_LENGTH) {
      setErrorMsg(`Reasoning needs at least ${MIN_LENGTH} characters to be examinable (${trimmed.length} so far).`);
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setErrorMsg(`Please keep reasoning under ${MAX_LENGTH} characters.`);
      return;
    }

    try {
      await createMutation.mutateAsync({
        claimId,
        content: trimmed,
        stance,
        identityMode: anonymous ? "anonymous" : "public",
      });

      setSuccessMsg(
        stance === "supporting"
          ? "Supporting reasoning added to this claim."
          : "Challenging reasoning added to this claim."
      );
      setContent("");
      setAnonymous(false);

      // Auto close after 1.5 seconds on success
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit argument.");
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
        aria-labelledby="argument-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-10"
      >
        <button
          onClick={onClose}
          disabled={createMutation.isPending}
          aria-label="Close argument dialog"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 id="argument-dialog-title" className="text-lg font-bold text-foreground">Add reasoning</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect reasoning to this claim — not a vote, just examination.
            </p>
          </div>
        </div>

        {/* Claim Context Preview */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 mb-4 text-xs">
          <span className="font-bold text-muted-foreground block mb-1">
            Reasoning about
          </span>
          <p className="text-foreground/80 leading-relaxed italic line-clamp-3">
            &ldquo;{claimPreview}&rdquo;
          </p>
        </div>

        {/* Argument Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Stance selector: approved relationship language only */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 block mb-1.5">
              Relationship to the claim
            </span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Argument relationship">
              {(
                [
                  { value: "supporting", label: "Supporting", hint: "Reasoning in favor" },
                  { value: "challenging", label: "Challenging", hint: "Reasoning against" },
                ] as { value: ArgumentStance; label: string; hint: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={stance === option.value}
                  onClick={() => setStance(option.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                    stance === option.value
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-background/40 hover:bg-card/60"
                  }`}
                >
                  <span className="block text-xs font-bold text-foreground">{option.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning content */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                stance === "supporting"
                  ? "Explain how this supports the claim..."
                  : "Explain how this challenges the claim..."
              }
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
              disabled={createMutation.isPending}
            />
            <span
              className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
                trimmed.length > MAX_LENGTH || (trimmed.length > 0 && trimmed.length < MIN_LENGTH)
                  ? "text-amber-500"
                  : "text-muted-foreground"
              }`}
            >
              {trimmed.length} / {MIN_LENGTH} min
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded border-input text-primary accent-primary h-3.5 w-3.5"
              disabled={createMutation.isPending}
            />
            <span className="text-[11px] font-medium text-foreground/80">
              Contribute Anonymously
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || trimmed.length === 0}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Scale className="h-3 w-3" />
              )}
              <span>Add reasoning</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
