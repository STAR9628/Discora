"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DiscussionMessage } from "@/features/discussions/types";
import { useCreateClaim } from "@/features/discussions/hooks/use-discussions";
import { claimSchema, type ClaimFormValues } from "@/features/discussions/validation";
import { toast } from "@/components/ui/toast";
import { X, AlertCircle, Loader2, Award, Send } from "lucide-react";

interface ExtractClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  comment: DiscussionMessage | null;
  questionId?: string | null; // added
}

export function ExtractClaimModal({ isOpen, onClose, roomId, comment, questionId = null }: ExtractClaimModalProps) {
  const createMutation = useCreateClaim(roomId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      content: "",
      claimType: "fact",
      contextType: "observation",
      identityMode: "public",
    },
  });

  const contentText = watch("content") || "";

  // Pre-fill form when modal opens with comment text (clipping to 500 chars limit)
  useEffect(() => {
    if (isOpen && comment) {
      const initialText = comment.content.slice(0, 500);
      setValue("content", initialText);
      setValue("claimType", "fact");
      setValue("contextType", "observation");
      setValue("identityMode", "public");
      setSubmitError(null);
    }
  }, [isOpen, comment, setValue]);

  if (!isOpen || !comment) return null;

  const onSubmit = async (data: ClaimFormValues) => {
    setSubmitError(null);
    try {
      await createMutation.mutateAsync({
        roomId,
        content: data.content,
        claimType: data.claimType,
        contextType: data.contextType || "observation",
        identityMode: data.identityMode,
        originMessageId: comment.id,
        questionId: questionId || null,
      });
      reset();
      onClose();
      toast.success("Claim created successfully", {
        description: "Switch to the Claims tab to view it.",
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create claim.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Create Claim from Comment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Turn this comment into a structured claim. Edit the text as needed.
            </p>
          </div>
        </div>

        {/* Original Comment Quote Box */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 mb-4 text-xs max-h-24 overflow-y-auto">
          <span className="font-bold text-muted-foreground block mb-1">
            Original Comment (posted by @{comment.username})
          </span>
          <p className="text-foreground/80 leading-relaxed italic">&ldquo;{comment.content}&rdquo;</p>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Statement Field */}
          <div className="space-y-1.5">
            <label htmlFor="extract-content" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Claim Statement
            </label>
            <div className="relative">
              <textarea
                id="extract-content"
                rows={3}
                className={`w-full rounded-xl border bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                  errors.content ? "border-destructive" : "border-input"
                }`}
                disabled={createMutation.isPending}
                {...register("content")}
              />
              <span className={`absolute bottom-3 right-3 text-[10px] font-semibold ${
                contentText.length > 500 || contentText.length < 10 ? "text-muted-foreground" : "text-primary/75"
              }`}>
                {contentText.length} / 500
              </span>
            </div>
            {errors.content && (
              <p className="text-xs font-semibold text-destructive mt-1">{errors.content.message}</p>
            )}
          </div>

          {/* Claim Type Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Claim Type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["fact", "opinion", "prediction", "proposal", "observation"] as const).map((type) => (
                <label
                  key={type}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-border bg-card/45 cursor-pointer select-none transition-all hover:bg-card/75 hover:border-muted-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]"
                >
                  <input
                    type="radio"
                    value={type}
                    className="sr-only"
                    disabled={createMutation.isPending}
                    {...register("claimType")}
                  />
                  <span className="text-[11px] font-bold capitalize text-foreground">{type}</span>
                </label>
              ))}
            </div>
            {errors.claimType && (
              <p className="text-xs font-semibold text-destructive mt-1">{errors.claimType.message}</p>
            )}
          </div>

          {/* Contribution Type Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Contribution Type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["supporting_idea", "counterpoint", "observation", "open_question"] as const).map((type) => (
                <label
                  key={type}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-border bg-card/45 cursor-pointer select-none transition-all hover:bg-card/75 hover:border-muted-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]"
                >
                  <input
                    type="radio"
                    value={type}
                    className="sr-only"
                    disabled={createMutation.isPending}
                    {...register("contextType")}
                  />
                  <span className="text-[10px] font-bold capitalize text-foreground leading-tight text-center">
                    {type === "supporting_idea" ? "Supporting Idea" :
                     type === "open_question" ? "Open Question" :
                     type}
                  </span>
                </label>
              ))}
            </div>
            {errors.contextType && (
              <p className="text-xs font-semibold text-destructive mt-1">{errors.contextType.message}</p>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4 mt-6">
            {/* Identity mode check */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-input text-primary accent-primary h-4 w-4 cursor-pointer"
                disabled={createMutation.isPending}
                {...register("identityMode", {
                  setValueAs: (val) => (val ? "anonymous" : "public"),
                })}
              />
              <div className="text-left">
                <span className="text-xs font-semibold text-foreground block">Assert Anonymously</span>
                <span className="text-[9px] text-muted-foreground leading-none">Hide profile associations</span>
              </div>
            </label>

            {/* Cancel & Submit buttons */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || contentText.trim().length < 10}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Create Claim</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
