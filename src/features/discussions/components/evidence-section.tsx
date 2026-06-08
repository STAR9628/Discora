"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useEvidence, useCreateEvidence, useRetractEvidence, useVoteEvidence } from "@/features/discussions/hooks/use-discussions";
import { evidenceSchema, type EvidenceFormValues } from "@/features/discussions/validation";
import { AlertCircle, Loader2, RotateCcw, User, Send, Plus, Link as LinkIcon, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import type { DiscussionEvidence } from "../types";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EvidenceSectionProps {
  claimId: string;
  roomId: string;
  isClaimRetracted: boolean;
  onReportEvidence: (evidence: DiscussionEvidence) => void;
  defaultOpen?: boolean;
}

export function EvidenceSection({ claimId, roomId, isClaimRetracted, onReportEvidence, defaultOpen }: EvidenceSectionProps) {
  const { user } = useAuth();
  const { data: evidenceList, isLoading, error } = useEvidence(claimId);
  const createMutation = useCreateEvidence(roomId, claimId);
  const retractMutation = useRetractEvidence(roomId, claimId);

  const [isFormOpen, setIsFormOpen] = useState(defaultOpen ?? false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRetractId, setPendingRetractId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EvidenceFormValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      content: "",
      evidenceType: "scientific",
      identityMode: "public",
      direction: "support",
      sourceTitle: "",
      sourceUrl: "",
    },
  });

  const contentText = watch("content") || "";
  const sourceUrlText = watch("sourceUrl") || "";

  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim().length === 0) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: EvidenceFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        content: data.content,
        evidenceType: data.evidenceType,
        identityMode: data.identityMode,
        direction: data.direction,
        sourceTitle: data.sourceTitle,
        sourceUrl: data.sourceUrl || "",
      });
      reset();
      setIsFormOpen(false);
      toast.success("Evidence added successfully", {
        description: "The evidence has been attached to this claim.",
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to assert evidence.");
    }
  };

  const getDirectionStyles = (direction: string) => {
    switch (direction) {
      case "support":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "contradict":
        return "bg-rose-500/10 border-rose-500/25 text-rose-400";
      case "context":
        return "bg-slate-500/10 border-slate-500/25 text-slate-400";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40 space-y-4 pl-4 sm:pl-6 border-l-2 border-primary/20">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/80">
            Evidence ({evidenceList?.length ?? 0})
          </h5>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Sources that support or challenge this claim</p>
        </div>
        
        {user && !isClaimRetracted && !isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add Evidence</span>
          </button>
        )}
      </div>

      {/* Evidence Creation Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card/40 border border-border/60 rounded-xl p-4 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-border/30 pb-2">
            <div>
              <span className="text-xs font-bold text-foreground">Add Supporting Evidence</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cite a source that supports, contradicts, or provides context for this claim.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setFormError(null);
                reset();
              }}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Content Field */}
          <div className="space-y-1">
            <label htmlFor="evidence-content" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
              Evidence Detail (Explanation of how it supports/contradicts)
            </label>
            <div className="relative">
              <textarea
                id="evidence-content"
                rows={3}
                placeholder="Detail what specific facts or findings are shown, and how they apply here (min 20 characters)..."
                className={`w-full rounded-lg border bg-background/40 px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 ${
                  errors.content ? "border-destructive" : "border-input"
                }`}
                disabled={createMutation.isPending}
                {...register("content")}
              />
              <span className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
                contentText.length > 1000 || contentText.length < 20 ? "text-muted-foreground" : "text-primary/75"
              }`}>
                {contentText.length} / 1000
              </span>
            </div>
            {errors.content && (
              <p className="text-[10px] font-semibold text-destructive mt-0.5">{errors.content.message}</p>
            )}
          </div>

          {/* Grid fields for direction, evidence type, and identity mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="direction" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                Relationship to Claim
              </label>
              <select
                id="direction"
                className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary"
                disabled={createMutation.isPending}
                {...register("direction")}
              >
                <option value="support">Supports the claim</option>
                <option value="contradict">Contradicts the claim</option>
                <option value="context">Provides context only</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="evidence-type" className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                Evidence Methodology
              </label>
              <select
                id="evidence-type"
                className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary"
                disabled={createMutation.isPending}
                {...register("evidenceType")}
              >
                <option value="scientific">Scientific Study</option>
                <option value="statistical">Statistical/Data analysis</option>
                <option value="documentary">Official Document/Record</option>
                <option value="visual">Visual/Media evidence</option>
                <option value="experiential">First-hand Experience</option>
                <option value="expert">Expert Testimony</option>
                <option value="historical">Historical Record</option>
                <option value="logical">Logical Proof</option>
                <option value="ethical">Ethical Analysis</option>
                <option value="cultural">Cultural Context</option>
              </select>
            </div>
          </div>

          {/* Source fields */}
          <div className="space-y-3 p-3 bg-background/20 rounded-lg border border-border/30">
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                Source Citation
              </span>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Evidence must cite a publicly accessible source.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Source Title (e.g. Journal of Medicine, Vol 3)"
                  className={`w-full rounded-lg border bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary ${
                    errors.sourceTitle ? "border-destructive" : "border-input"
                  }`}
                  disabled={createMutation.isPending}
                  {...register("sourceTitle")}
                />
                {errors.sourceTitle && (
                  <p className="text-[10px] font-semibold text-destructive mt-0.5">{errors.sourceTitle.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="https://example.com/article"
                  className={`w-full rounded-lg border bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary ${
                    errors.sourceUrl ? "border-destructive" : "border-input"
                  }`}
                  disabled={createMutation.isPending}
                  {...register("sourceUrl")}
                />
                {errors.sourceUrl && (
                  <p className="text-[10px] font-semibold text-destructive mt-0.5">{errors.sourceUrl.message}</p>
                )}
                {!errors.sourceUrl && sourceUrlText.trim().length > 0 && !isValidUrl(sourceUrlText.trim()) && (
                  <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Please enter a valid URL.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/20">
            {/* Identity Selector */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                value="anonymous"
                className="rounded border-input text-primary accent-primary h-3.5 w-3.5"
                disabled={createMutation.isPending}
                {...register("identityMode", {
                  setValueAs: (val) => (val ? "anonymous" : "public"),
                })}
              />
              <div className="text-left">
                <p className="text-[10px] font-bold text-foreground">Assert Anonymously</p>
                <p className="text-[9px] text-muted-foreground leading-none">Hide your creator profile from this card</p>
              </div>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending || contentText.trim().length < 20 || !isValidUrl(sourceUrlText.trim())}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Asserting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>Assert Evidence</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Evidence List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border/40 bg-card/15 p-4 animate-pulse space-y-2">
              <div className="h-3 w-1/4 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-destructive font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load evidence: {(error as Error).message}</span>
        </div>
      ) : evidenceList?.length === 0 ? (
        <div className="text-xs text-muted-foreground/70 pb-2 space-y-1">
          <p>No evidence attached to this claim yet.</p>
          <p>Click <span className="font-semibold text-foreground/80">Add Evidence</span> above to cite a source that supports or contradicts this claim.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {evidenceList?.map((ev) => {
            const isEvAnon = ev.identityMode === "anonymous";
            const isEvDeleted = ev.username === "Deleted User";

            return (
              <div
                id={`ev-${ev.id}`}
                key={ev.id}
                className={`bg-card/20 border border-border/40 rounded-xl p-4 space-y-2.5 transition-all hover:bg-card/30 hover:shadow-sm relative border-l-[3px] ${
                  ev.direction === "support" ? "border-l-emerald-500/50" : ev.direction === "contradict" ? "border-l-rose-500/50" : "border-l-slate-500/50"
                } ${
                  ev.isRetracted ? "opacity-60 grayscale-[15%]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Relationship direction badge */}
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${
                      getDirectionStyles(ev.direction)
                    }`}>
                      {ev.direction}s
                    </span>

                    {/* Evidence Type */}
                    <span className="rounded bg-muted border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground capitalize">
                      {ev.evidenceType}
                    </span>

                    {ev.isRetracted && (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                        Retracted
                      </span>
                    )}
                  </div>

                  {user && (
                    <>
                      {ev.createdBy === user.id && !ev.isRetracted && (
                        <button
                          onClick={() => setPendingRetractId(ev.id)}
                          disabled={retractMutation.isPending}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retract</span>
                        </button>
                      )}
                      <button
                        onClick={() => onReportEvidence(ev)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Flag className="h-3.5 w-3.5 text-destructive/75" />
                        <span>Report</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Evidence Content Statement */}
                <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {ev.content}
                </p>

                {/* Source Citation link */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg p-2 w-fit max-w-full">
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    Source:{" "}
                    {ev.sourceUrl ? (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary/80"
                      >
                        {ev.sourceTitle}
                      </a>
                    ) : (
                      <span>{ev.sourceTitle}</span>
                    )}
                  </span>
                </div>

                {/* Voting Actions */}
                {!ev.isRetracted && (
                  <EvidenceVoting roomId={roomId} claimId={claimId} evidence={ev} />
                )}

                {/* Creator Details */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
                  <div className="h-4.5 w-4.5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                    {ev.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.avatarUrl}
                        alt={`${ev.username}'s avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-2.5 w-2.5 text-muted-foreground/60" />
                    )}
                  </div>
                  <span className={`font-bold ${
                    isEvAnon
                      ? "text-muted-foreground"
                      : isEvDeleted
                      ? "text-destructive/75"
                      : "text-foreground/80"
                  }`}>
                    {isEvAnon ? "Anonymous" : ev.username || "Unknown User"}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(ev.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRetractId}
        title="Retract evidence?"
        description="This action is irreversible. The evidence card and its votes will be permanently retracted."
        confirmLabel="Retract"
        variant="danger"
        onConfirm={async () => {
          if (!pendingRetractId) return;
          try {
            await retractMutation.mutateAsync(pendingRetractId);
          } catch (err) {
            toast.error("Failed to retract evidence.", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          } finally {
            setPendingRetractId(null);
          }
        }}
        onCancel={() => setPendingRetractId(null)}
      />
    </div>
  );
}

interface EvidenceVotingProps {
  roomId: string;
  claimId: string;
  evidence: DiscussionEvidence;
}

function EvidenceVoting({ roomId, claimId, evidence }: EvidenceVotingProps) {
  const { user } = useAuth();
  const voteMutation = useVoteEvidence(roomId, claimId, evidence.id);

  const handleVote = async (type: "agree" | "disagree") => {
    if (!user) {
      toast.warning("You must be logged in to vote.");
      return;
    }
    const nextVote = evidence.userVote === type ? null : type;
    try {
      await voteMutation.mutateAsync(nextVote);
    } catch (err) {
      toast.error("Failed to cast vote.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const agreeActive = evidence.userVote === "agree";
  const disagreeActive = evidence.userVote === "disagree";

  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex items-center gap-1 rounded bg-muted/30 p-0.5 border border-border/40">
        <button
          onClick={() => handleVote("agree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
            agreeActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{evidence.agreeCount ?? 0}</span>
        </button>

        <div className="h-3 w-px bg-border/60" />

        <button
          onClick={() => handleVote("disagree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
            disagreeActive
              ? "bg-rose-500/20 text-rose-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ThumbsDown className="h-3 w-3" />
          <span>{evidence.disagreeCount ?? 0}</span>
        </button>
      </div>

      {evidence.consensusRatio !== null && evidence.consensusRatio !== undefined && (
        <span className="text-[9px] font-extrabold text-muted-foreground/80">
          {evidence.consensusRatio}% consensus
        </span>
      )}
    </div>
  );
}
