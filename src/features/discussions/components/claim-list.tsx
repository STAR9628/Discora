"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useClaims, useCreateClaim, useRetractClaim, useVoteClaim } from "@/features/discussions/hooks/use-discussions";
import { claimSchema, type ClaimFormValues } from "@/features/discussions/validation";
import { AlertCircle, Plus, Loader2, User, HelpCircle, Send, RotateCcw, MessageSquare, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { EvidenceSection } from "./evidence-section";
import type { DiscussionClaim, DiscussionEvidence } from "../types";

interface ClaimListProps {
  roomId: string;
  questionId?: string;
  onReportClaim: (claim: DiscussionClaim) => void;
  onReportEvidence: (evidence: DiscussionEvidence) => void;
}

export function ClaimList({ roomId, questionId, onReportClaim, onReportEvidence }: ClaimListProps) {
  const { user } = useAuth();
  const { data: claims, isLoading: isClaimsLoading, error: claimsError } = useClaims(roomId, questionId);
  const createMutation = useCreateClaim(roomId);
  const retractMutation = useRetractClaim(roomId);

  const [formError, setFormError] = useState<string | null>(null);
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});

  const toggleExpand = (claimId: string) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [claimId]: !prev[claimId],
    }));
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      content: "",
      claimType: "fact",
      identityMode: "public",
    },
  });

  const contentText = watch("content") || "";

  const onSubmit = async (data: ClaimFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        roomId,
        content: data.content,
        claimType: data.claimType,
        identityMode: data.identityMode,
        questionId: questionId || null,
      });
      reset();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to assert claim.");
    }
  };

  const handleRetract = async (claimId: string) => {
    if (!confirm("Are you sure you want to retract this claim? This action is immutable and cannot be undone.")) {
      return;
    }
    try {
      await retractMutation.mutateAsync(claimId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to retract claim.");
    }
  };

  // Badge styles based on claim type
  const getBadgeStyles = (type: string) => {
    switch (type) {
      case "fact":
        return "bg-blue-500/10 border-blue-500/25 text-blue-400";
      case "opinion":
        return "bg-purple-500/10 border-purple-500/25 text-purple-400";
      case "prediction":
        return "bg-orange-500/10 border-orange-500/25 text-orange-400";
      case "proposal":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "observation":
        return "bg-amber-500/10 border-amber-500/25 text-amber-400";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Assert Claim Form (Only authenticated users) */}
      {user ? (
        <div className="rounded-2xl border border-border bg-card/35 p-6 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Assert a Structured Claim</h3>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Content Field */}
            <div className="space-y-1.5">
              <label htmlFor="content" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Claim Statement
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  rows={3}
                  placeholder="State a concise, falsifiable claim (e.g. 'Standard treatment protocols show a 15% lower efficacy rate on group B...')"
                  className={`w-full rounded-xl border bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 ${
                    errors.content ? "border-destructive" : "border-input"
                  }`}
                  disabled={createMutation.isPending}
                  {...register("content")}
                />
                <span className={`absolute bottom-3 right-3 text-[10px] font-semibold ${
                  contentText.length > 500 || contentText.length < 25 ? "text-muted-foreground" : "text-primary/75"
                }`}>
                  {contentText.length} / 500
                </span>
              </div>
              {errors.content && (
                <p className="text-xs font-semibold text-destructive mt-1">{errors.content.message}</p>
              )}
            </div>

            {/* Grid selectors for Claim Type */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Claim Type
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(["fact", "opinion", "prediction", "proposal", "observation"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card/40 cursor-pointer select-none transition-all hover:bg-card/70 hover:border-muted-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]"
                  >
                    <input
                      type="radio"
                      value={type}
                      className="sr-only"
                      disabled={createMutation.isPending}
                      {...register("claimType")}
                    />
                    <span className="text-xs font-bold capitalize text-foreground">{type}</span>
                  </label>
                ))}
              </div>
              {errors.claimType && (
                <p className="text-xs font-semibold text-destructive mt-1">{errors.claimType.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
              {/* Anonymous Mode Option */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  value="anonymous"
                  className="rounded border-input text-primary accent-primary h-4 w-4 cursor-pointer"
                  disabled={createMutation.isPending}
                  {...register("identityMode", {
                    setValueAs: (val) => (val ? "anonymous" : "public"),
                  })}
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Assert Anonymously</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Redact your identity from this claim card</p>
                </div>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createMutation.isPending || contentText.trim().length < 25}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Asserting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Assert Claim</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 2. Claim Listing */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>Active Room Claims</span>
          {claims && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {claims.length}
            </span>
          )}
        </h4>

        {isClaimsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : claimsError ? (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">Failed to load claims: {(claimsError as Error).message}</p>
          </div>
        ) : claims?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No claims asserted yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to introduce structured assertions to this discussion.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {claims?.map((claim) => {
              const isClaimAnon = claim.identityMode === "anonymous";
              const isClaimDeleted = claim.username === "Deleted User";
              const isOwnClaim = claim.createdBy === user?.id;

              return (
                <div
                  key={claim.id}
                  className={`rounded-2xl border border-border/50 bg-card/30 p-5 space-y-3 transition-colors hover:bg-card/40 relative ${
                    claim.isRetracted ? "opacity-60 grayscale-[15%]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Top Row: Type Badge & Retracted tag */}
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        getBadgeStyles(claim.claimType)
                      }`}>
                        {claim.claimType}
                      </span>
                      {claim.isRetracted && (
                        <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                          Retracted
                        </span>
                      )}
                      {claim.questionId && (
                        <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          <span>Question Answer</span>
                        </span>
                      )}
                    </div>

                    {/* Retraction & Report options */}
                    <div className="flex items-center gap-3">
                      {isOwnClaim && !claim.isRetracted && (
                        <button
                          onClick={() => handleRetract(claim.id)}
                          disabled={retractMutation.isPending}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retract</span>
                        </button>
                      )}
                      {user && (
                        <button
                          onClick={() => onReportClaim(claim)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Flag className="h-3.5 w-3.5 text-destructive/75" />
                          <span>Report</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content Statement */}
                  <p className="text-sm leading-relaxed text-foreground font-semibold">
                    {claim.content}
                  </p>

                  {/* Voting Actions & Consensus Bar */}
                  {!claim.isRetracted && (
                    <ClaimVoting roomId={roomId} claim={claim} />
                  )}

                  {/* Metadata Row: Profile, Date & Origin link */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                        {claim.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={claim.avatarUrl}
                            alt={`${claim.username}'s avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground/60" />
                        )}
                      </div>
                      <span className={`font-bold ${
                        isClaimAnon
                          ? "text-muted-foreground"
                          : isClaimDeleted
                          ? "text-destructive/75"
                          : "text-foreground"
                      }`}>
                        {isClaimAnon ? "Anonymous" : claim.username || "Unknown User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">•</span>
                      <span className="text-[10px] text-muted-foreground/80">
                        {new Date(claim.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* If extracted from comment, link to it */}
                    <div className="flex items-center gap-4">
                      {claim.originMessageId && (
                        <a
                          href={`#comment-${claim.originMessageId}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>View Comment Context</span>
                        </a>
                      )}

                      <button
                        onClick={() => toggleExpand(claim.id)}
                        className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <span>{expandedClaims[claim.id] ? "Hide Evidence" : "View Evidence"}</span>
                        {expandedClaims[claim.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {expandedClaims[claim.id] && (
                    <EvidenceSection claimId={claim.id} roomId={roomId} isClaimRetracted={claim.isRetracted} onReportEvidence={onReportEvidence} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ClaimVotingProps {
  roomId: string;
  claim: DiscussionClaim;
}

function ClaimVoting({ roomId, claim }: ClaimVotingProps) {
  const { user } = useAuth();
  const voteMutation = useVoteClaim(roomId, claim.id);

  const handleVote = async (type: "agree" | "disagree") => {
    if (!user) {
      alert("Please log in to vote.");
      return;
    }
    const nextVote = claim.userVote === type ? null : type;
    try {
      await voteMutation.mutateAsync(nextVote);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cast vote.");
    }
  };

  const agreeActive = claim.userVote === "agree";
  const disagreeActive = claim.userVote === "disagree";

  return (
    <div className="flex items-center gap-4 pt-1 pb-1">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-1">
        <button
          onClick={() => handleVote("agree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
            agreeActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>{claim.agreeCount ?? 0}</span>
        </button>

        <div className="h-4 w-px bg-border/80" />

        <button
          onClick={() => handleVote("disagree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
            disagreeActive
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          <span>{claim.disagreeCount ?? 0}</span>
        </button>
      </div>

      {claim.consensusRatio !== null && claim.consensusRatio !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-rose-500/30 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${claim.consensusRatio}%` }}
            />
          </div>
          <span className="text-[10px] font-extrabold text-muted-foreground">
            {claim.consensusRatio}% Consensus
          </span>
        </div>
      )}
    </div>
  );
}
