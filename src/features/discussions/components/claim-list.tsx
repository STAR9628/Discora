"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useClaims, useCreateClaim, useRetractClaim, useVoteClaim, useRoomEvidence, useClaimRelations } from "@/features/discussions/hooks/use-discussions";
import { claimSchema, type ClaimFormValues } from "@/features/discussions/validation";
import { AlertCircle, Plus, Loader2, User, HelpCircle, Send, RotateCcw, MessageSquare, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Flag, FileText, GitBranch, ArrowRight, ArrowDown, ArrowLeft } from "lucide-react";
import { EvidenceSection } from "./evidence-section";
import type { DiscussionClaim, DiscussionEvidence, DiscussionClaimRelation, ClaimRelationType, ClaimContextType } from "../types";
import { ClaimRelationDialog } from "./claim-relation-dialog";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ClaimListProps {
  roomId: string;
  questionId?: string;
  scrollToClaimId?: string | null;
  onScrollComplete?: () => void;
  claimQuestionMap?: Map<string, string>;
  onReportClaim: (claim: DiscussionClaim) => void;
  onReportEvidence: (evidence: DiscussionEvidence) => void;
}

export function ClaimList({ roomId, questionId, scrollToClaimId, onScrollComplete, claimQuestionMap, onReportClaim, onReportEvidence }: ClaimListProps) {
  const { user } = useAuth();
  const { data: claims, isLoading: isClaimsLoading, error: claimsError } = useClaims(roomId, questionId);
  const { data: roomEvidence } = useRoomEvidence(roomId);
  const createMutation = useCreateClaim(roomId);
  const retractMutation = useRetractClaim(roomId);

  const { data: claimRelations } = useClaimRelations(roomId);

  const relationCountsByClaim: Record<string, { outgoingSupports: number; outgoingContradicts: number; outgoingRefines: number; incoming: number }> = {};
  if (claimRelations) {
    for (const rel of claimRelations) {
      if (!relationCountsByClaim[rel.sourceClaimId]) relationCountsByClaim[rel.sourceClaimId] = { outgoingSupports: 0, outgoingContradicts: 0, outgoingRefines: 0, incoming: 0 };
      if (!relationCountsByClaim[rel.targetClaimId]) relationCountsByClaim[rel.targetClaimId] = { outgoingSupports: 0, outgoingContradicts: 0, outgoingRefines: 0, incoming: 0 };
      if (rel.relationType === "supports") relationCountsByClaim[rel.sourceClaimId].outgoingSupports++;
      else if (rel.relationType === "contradicts") relationCountsByClaim[rel.sourceClaimId].outgoingContradicts++;
      else if (rel.relationType === "refines") relationCountsByClaim[rel.sourceClaimId].outgoingRefines++;
      relationCountsByClaim[rel.targetClaimId].incoming++;
    }
  }

  const evidenceCountByClaim: Record<string, number> = {};
  if (roomEvidence) {
    for (const ev of roomEvidence) {
      evidenceCountByClaim[ev.claimId] = (evidenceCountByClaim[ev.claimId] || 0) + 1;
    }
  }

  const [relationDialogState, setRelationDialogState] = useState<{
    claim: DiscussionClaim;
    relationType: ClaimRelationType;
  } | null>(null);

  const scrollHandled = useRef(false);

  useEffect(() => {
    if (!scrollToClaimId || scrollHandled.current) return;

    const tryHighlight = (retries: number) => {
      const el = document.getElementById(`claim-${scrollToClaimId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
        setTimeout(() => {
          el.classList.add("animate-pulse");
        }, 1500);
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "animate-pulse");
        }, 4000);
        scrollHandled.current = true;
        onScrollComplete?.();
      } else if (retries > 0) {
        setTimeout(() => tryHighlight(retries - 1), 300);
      }
    };

    tryHighlight(10);
  }, [scrollToClaimId, claims, onScrollComplete]);

  const [formError, setFormError] = useState<string | null>(null);
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});
  const [expandedRelations, setExpandedRelations] = useState<Record<string, boolean>>({});
  const [autoOpenEvidenceForm, setAutoOpenEvidenceForm] = useState<string | null>(null);
  const [navigatedFrom, setNavigatedFrom] = useState<{ sourceClaimId: string; targetClaimId: string } | null>(null);
  const [pendingRetractId, setPendingRetractId] = useState<string | null>(null);

  const toggleExpand = (claimId: string) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [claimId]: !prev[claimId],
    }));
  };

  const toggleExpandRelations = (claimId: string) => {
    setExpandedRelations((prev) => ({
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
      contextType: "observation",
      identityMode: "public",
    },
  });

  const contentText = watch("content") || "";

  const onSubmit = async (data: ClaimFormValues) => {
    setFormError(null);
    try {
      const result = await createMutation.mutateAsync({
        roomId,
        content: data.content,
        claimType: data.claimType,
        contextType: data.contextType || "observation",
        identityMode: data.identityMode,
        questionId: questionId || null,
      });
      reset();
      toast.success("Claim created successfully", {
        description: "Your claim has been added to the room.",
        action: {
          label: "View Claim",
          onClick: () => {
            const tryHighlight = (retries: number) => {
              const el = document.getElementById(`claim-${result.id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
                setTimeout(() => {
                  el.classList.add("animate-pulse");
                }, 1500);
                setTimeout(() => {
                  el.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "animate-pulse");
                }, 4000);
              } else if (retries > 0) {
                setTimeout(() => tryHighlight(retries - 1), 300);
              }
            };
            tryHighlight(10);
          },
        },
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to assert claim.");
    }
  };

  const handleRetract = async (claimId: string) => {
    setPendingRetractId(claimId);
  };

  const executeRetract = async () => {
    if (!pendingRetractId) return;
    try {
      await retractMutation.mutateAsync(pendingRetractId);
    } catch (err) {
      toast.error("Failed to retract claim.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPendingRetractId(null);
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
          <div>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Assert a Structured Claim</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Claims are assertable statements that can be supported or challenged with evidence.</p>
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
                  contentText.length > 500 || contentText.length < 10 ? "text-muted-foreground" : "text-primary/75"
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

            {/* Contribution Type selector */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Contribution Type
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(["supporting_idea", "counterpoint", "observation", "open_question"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card/40 cursor-pointer select-none transition-all hover:bg-card/70 hover:border-muted-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]"
                  >
                    <input
                      type="radio"
                      value={type}
                      className="sr-only"
                      disabled={createMutation.isPending}
                      {...register("contextType")}
                    />
                    <span className="text-[11px] font-bold capitalize text-foreground leading-tight text-center">
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
                disabled={createMutation.isPending || contentText.trim().length < 10}
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

              const accentBorderMap: Record<string, string> = {
                fact: "border-l-blue-500/60",
                opinion: "border-l-purple-500/60",
                prediction: "border-l-orange-500/60",
                proposal: "border-l-emerald-500/60",
                observation: "border-l-amber-500/60",
              };

              const accentBorder = accentBorderMap[claim.claimType] || "border-l-primary/40";
              const isClaimRetracted = claim.isRetracted;

              return (
                <div
                  id={`claim-${claim.id}`}
                  key={claim.id}
                  className={`rounded-2xl border border-border/50 bg-card/30 p-5 space-y-3 transition-all hover:bg-card/45 hover:shadow-md relative border-l-4 ${accentBorder} shadow-sm backdrop-blur-sm ${
                    isClaimRetracted ? "opacity-60 grayscale-[15%]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Top Row: Type Badge, CLAIM label & Retracted tag */}
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary border border-primary/20">
                        Claim
                      </span>
                      <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        getBadgeStyles(claim.claimType)
                      }`}>
                        {claim.claimType}
                      </span>
                      <ContextBadge contextType={claim.contextType} />
                      {isClaimRetracted && (
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
                      {isOwnClaim && !isClaimRetracted && (
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

                  {/* Question Answering Context */}
                  {claim.questionId && claimQuestionMap?.has(claim.id) && (
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                      <div>
                        <span className="font-extrabold text-primary/80 uppercase tracking-wider text-[10px]">Answering:</span>
                        <p className="text-foreground/70 mt-0.5 italic">&ldquo;{claimQuestionMap.get(claim.id)}&rdquo;</p>
                      </div>
                    </div>
                  )}

                  {/* Content Statement */}
                  <p className="text-sm leading-relaxed text-foreground font-semibold">
                    {claim.content}
                  </p>

                  {/* Voting Actions & Consensus Bar */}
                  {!claim.isRetracted && (
                    <ClaimVoting roomId={roomId} claim={claim} />
                  )}

                  {/* Claim Relations actions */}
                  {!claim.isRetracted && user && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                        Relate:
                      </span>
                      {(["supports", "contradicts", "refines"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setRelationDialogState({ claim, relationType: type })}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-card/30 transition-all cursor-pointer"
                        >
                          {type === "supports" && <ThumbsUp className="h-3 w-3" />}
                          {type === "contradicts" && <ThumbsDown className="h-3 w-3" />}
                          {type === "refines" && <GitBranch className="h-3 w-3" />}
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
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

                    {/* Badges row */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-2 py-0.5">
                        <FileText className="h-3 w-3" />
                        <span>Evidence: {evidenceCountByClaim[claim.id] || 0}</span>
                      </div>
                      {(() => {
                        const rc = relationCountsByClaim[claim.id];
                        if (!rc) return null;
                        const total = rc.outgoingSupports + rc.outgoingContradicts + rc.outgoingRefines + rc.incoming;
                        if (total === 0) return null;
                        return (
                          <>
                            {rc.outgoingSupports > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-2 py-0.5">
                                <ThumbsUp className="h-3 w-3" />Supports {rc.outgoingSupports}
                              </span>
                            )}
                            {rc.outgoingContradicts > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg px-2 py-0.5">
                                <ThumbsDown className="h-3 w-3" />Contradicts {rc.outgoingContradicts}
                              </span>
                            )}
                            {rc.outgoingRefines > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg px-2 py-0.5">
                                <GitBranch className="h-3 w-3" />Refines {rc.outgoingRefines}
                              </span>
                            )}
                            {rc.incoming > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg px-2 py-0.5">
                                Referenced by {rc.incoming}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Connectivity status & relation summary */}
                    {(() => {
                      if (!claimRelations) return null;
                      const rc = relationCountsByClaim[claim.id];
                      const outgoing = claimRelations.filter(r => r.sourceClaimId === claim.id);
                      const incoming = claimRelations.filter(r => r.targetClaimId === claim.id);
                      const hasRelations = outgoing.length + incoming.length > 0;
                      const hasEvidence = (evidenceCountByClaim[claim.id] || 0) > 0;

                      // State 1: No relations, no evidence
                      if (!hasRelations && !hasEvidence) {
                        return (
                          <div className="rounded-lg border border-dashed border-border/40 bg-card/20 p-3 space-y-2">
                            <p className="text-[12px] text-muted-foreground/80 font-medium">
                              This idea hasn&apos;t been connected yet.
                            </p>
                            <div className="flex items-center gap-2">
                              {user && (
                                <>
                                  <button
                                    onClick={() => setRelationDialogState({ claim, relationType: "supports" })}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                  >
                                    <GitBranch className="h-3.5 w-3.5" />
                                    <span>Relate It</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!expandedClaims[claim.id]) toggleExpand(claim.id);
                                      setAutoOpenEvidenceForm(claim.id);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Add Evidence</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // State 3: Has evidence, no relations
                      if (!hasRelations && hasEvidence) {
                        return (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-muted-foreground/60 italic">
                              This claim is not connected to other ideas yet.
                            </p>
                            {user && (
                              <button
                                onClick={() => setRelationDialogState({ claim, relationType: "supports" })}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                              >
                                <GitBranch className="h-3.5 w-3.5" />
                                <span>Relate It</span>
                              </button>
                            )}
                          </div>
                        );
                      }

                      if (!rc) return null;
                      const totalRel = rc.outgoingSupports + rc.outgoingContradicts + rc.outgoingRefines + rc.incoming;
                      const evCount = evidenceCountByClaim[claim.id] || 0;

                      // State 2: Has relations, no evidence
                      if (hasRelations && !hasEvidence) {
                        return (
                          <>
                            <p className="text-[11px] font-medium text-muted-foreground/90">
                              Connected to {totalRel} idea{totalRel !== 1 ? "s" : ""}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {(() => {
                                const firstOutSupport = outgoing.find(r => r.relationType === "supports");
                                const firstOutContra = outgoing.find(r => r.relationType === "contradicts");
                                const firstOutRefine = outgoing.find(r => r.relationType === "refines");
                                const firstIn = incoming[0];
                                const items: { icon: React.ReactNode; text: string }[] = [];
                                if (firstOutSupport) {
                                  const extra = rc.outgoingSupports - 1;
                                  items.push({ icon: <ThumbsUp className="h-3 w-3 text-emerald-400" />, text: `Supports &ldquo;${truncate(firstOutSupport.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                                }
                                if (firstOutContra) {
                                  const extra = rc.outgoingContradicts - 1;
                                  items.push({ icon: <ThumbsDown className="h-3 w-3 text-rose-400" />, text: `Contradicts &ldquo;${truncate(firstOutContra.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                                }
                                if (firstOutRefine) {
                                  const extra = rc.outgoingRefines - 1;
                                  items.push({ icon: <GitBranch className="h-3 w-3 text-violet-400" />, text: `Refines &ldquo;${truncate(firstOutRefine.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                                }
                                if (firstIn) {
                                  const extra = rc.incoming - 1;
                                  items.push({ icon: <ArrowDown className="h-3 w-3 text-blue-400" />, text: `Referenced by &ldquo;${truncate(firstIn.sourceClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                                }
                                return items.map((item, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1">
                                    {item.icon}
                                    <span>{item.text}</span>
                                  </span>
                                ));
                              })()}
                              <button
                                onClick={() => toggleExpandRelations(claim.id)}
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                              >
                                <span>{expandedRelations[claim.id] ? "Hide all" : `Show all ${totalRel}`}</span>
                                {expandedRelations[claim.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[11px] text-muted-foreground/60 italic">
                                This claim is not backed by evidence yet.
                              </p>
                              {user && (
                                <button
                                  onClick={() => {
                                    if (!expandedClaims[claim.id]) toggleExpand(claim.id);
                                    setAutoOpenEvidenceForm(claim.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Add Evidence</span>
                                </button>
                              )}
                            </div>
                          </>
                        );
                      }

                      // State 4: Has both evidence and relations — summary only
                      return (
                        <>
                          <p className="text-[11px] font-medium text-muted-foreground/90">
                            Connected to {totalRel} idea{totalRel !== 1 ? "s" : ""}
                            &middot; Backed by {evCount} evidence source{evCount !== 1 ? "s" : ""}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            {(() => {
                              const firstOutSupport = outgoing.find(r => r.relationType === "supports");
                              const firstOutContra = outgoing.find(r => r.relationType === "contradicts");
                              const firstOutRefine = outgoing.find(r => r.relationType === "refines");
                              const firstIn = incoming[0];
                              const items: { icon: React.ReactNode; text: string }[] = [];
                              if (firstOutSupport) {
                                const extra = rc.outgoingSupports - 1;
                                items.push({ icon: <ThumbsUp className="h-3 w-3 text-emerald-400" />, text: `Supports &ldquo;${truncate(firstOutSupport.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                              }
                              if (firstOutContra) {
                                const extra = rc.outgoingContradicts - 1;
                                items.push({ icon: <ThumbsDown className="h-3 w-3 text-rose-400" />, text: `Contradicts &ldquo;${truncate(firstOutContra.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                              }
                              if (firstOutRefine) {
                                const extra = rc.outgoingRefines - 1;
                                items.push({ icon: <GitBranch className="h-3 w-3 text-violet-400" />, text: `Refines &ldquo;${truncate(firstOutRefine.targetClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                              }
                              if (firstIn) {
                                const extra = rc.incoming - 1;
                                items.push({ icon: <ArrowDown className="h-3 w-3 text-blue-400" />, text: `Referenced by &ldquo;${truncate(firstIn.sourceClaimContent, 40)}&rdquo;${extra > 0 ? ` +${extra}` : ""}` });
                              }
                              return items.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1">
                                  {item.icon}
                                  <span>{item.text}</span>
                                </span>
                              ));
                            })()}
                            <button
                              onClick={() => toggleExpandRelations(claim.id)}
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <span>{expandedRelations[claim.id] ? "Hide all" : `Show all ${totalRel}`}</span>
                              {expandedRelations[claim.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {navigatedFrom?.targetClaimId === claim.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            document.getElementById(`claim-${navigatedFrom.sourceClaimId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            setNavigatedFrom(null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back to previous claim</span>
                        </button>
                      </div>
                    )}

                    {/* If extracted from comment, link to it */}
                    <div className="flex items-center gap-4">
                      {claim.originMessageId && (
                        <a
                          href={`#msg-${claim.originMessageId}`}
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

                  {expandedRelations[claim.id] && claimRelations && (
                    <RelationPreview
                      claimId={claim.id}
                      relations={claimRelations}
                      onNavigateToClaim={(targetClaimId) => setNavigatedFrom({ sourceClaimId: claim.id, targetClaimId })}
                    />
                  )}

                  {expandedClaims[claim.id] && (
                    <EvidenceSection claimId={claim.id} roomId={roomId} isClaimRetracted={claim.isRetracted} onReportEvidence={onReportEvidence} defaultOpen={autoOpenEvidenceForm === claim.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingRetractId}
        title="Retract claim?"
        description="This action is irreversible. The claim and all associated evidence will be permanently retracted."
        confirmLabel="Retract"
        variant="danger"
        onConfirm={executeRetract}
        onCancel={() => setPendingRetractId(null)}
      />

      {relationDialogState && (
        <ClaimRelationDialog
          roomId={roomId}
          sourceClaim={relationDialogState.claim}
          relationType={relationDialogState.relationType}
          isOpen={!!relationDialogState}
          onClose={() => setRelationDialogState(null)}
        />
      )}
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
      toast.warning("You must be logged in to vote.");
      return;
    }
    const nextVote = claim.userVote === type ? null : type;
    try {
      await voteMutation.mutateAsync(nextVote);
    } catch (err) {
      toast.error("Failed to cast vote.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
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

function getContextBadgeStyles(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea":
      return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
    case "counterpoint":
      return "bg-violet-500/10 border-violet-500/25 text-violet-400";
    case "observation":
      return "bg-sky-500/10 border-sky-500/25 text-sky-400";
    case "open_question":
      return "bg-amber-500/10 border-amber-500/25 text-amber-400";
  }
}

function getContextLabel(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea": return "Supporting Idea";
    case "counterpoint": return "Counterpoint";
    case "observation": return "Observation";
    case "open_question": return "Open Question";
  }
}

function ContextBadge({ contextType }: { contextType: ClaimContextType }) {
  return (
    <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getContextBadgeStyles(contextType)}`}>
      {getContextLabel(contextType)}
    </span>
  );
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + "…";
}

interface RelationPreviewProps {
  claimId: string;
  relations: DiscussionClaimRelation[];
  onNavigateToClaim: (targetClaimId: string) => void;
}

const PREVIEW_LIMIT = 8;

function RelationPreview({ claimId, relations, onNavigateToClaim }: RelationPreviewProps) {
  const [showAllOutgoing, setShowAllOutgoing] = useState(false);
  const [showAllIncoming, setShowAllIncoming] = useState(false);

  const outgoing = relations.filter((r) => r.sourceClaimId === claimId);
  const incoming = relations.filter((r) => r.targetClaimId === claimId);
  const outgoingTruncated = outgoing.length > PREVIEW_LIMIT;
  const incomingTruncated = incoming.length > PREVIEW_LIMIT;
  const visibleOutgoing = showAllOutgoing ? outgoing : outgoing.slice(0, PREVIEW_LIMIT);
  const visibleIncoming = showAllIncoming ? incoming : incoming.slice(0, PREVIEW_LIMIT);

  const relationLabel: Record<string, string> = {
    supports: "Supports",
    contradicts: "Contradicts",
    refines: "Refines",
  };

  const relationIcon = (type: string) => {
    switch (type) {
      case "supports": return <ThumbsUp className="h-3 w-3 text-emerald-400" />;
      case "contradicts": return <ThumbsDown className="h-3 w-3 text-rose-400" />;
      case "refines": return <GitBranch className="h-3 w-3 text-violet-400" />;
      default: return null;
    }
  };

  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/10 p-4 space-y-3 text-xs">
      {visibleOutgoing.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Outgoing Relations ({outgoing.length})
          </span>
          <div className="space-y-1.5">
            {visibleOutgoing.map((rel) => (
              <button
                key={rel.id}
                onClick={() => {
                  onNavigateToClaim(rel.targetClaimId);
                  document.getElementById(`claim-${rel.targetClaimId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="flex items-start gap-2 rounded-lg border border-border/30 bg-card/20 p-2 hover:bg-card/40 hover:border-border/60 transition-all group w-full text-left cursor-pointer"
              >
                <span className="shrink-0 mt-0.5">{relationIcon(rel.relationType)}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                    {relationLabel[rel.relationType]}
                  </span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-muted-foreground/80">&ldquo;{truncate(rel.targetClaimContent, 80)}&rdquo;</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-0.5" />
              </button>
            ))}
          </div>
          {outgoingTruncated && !showAllOutgoing && (
            <button
              onClick={() => setShowAllOutgoing(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Show {outgoing.length - PREVIEW_LIMIT} more
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {visibleIncoming.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Incoming Relations ({incoming.length})
          </span>
          <div className="space-y-1.5">
            {visibleIncoming.map((rel) => (
              <button
                key={rel.id}
                onClick={() => {
                  onNavigateToClaim(rel.sourceClaimId);
                  document.getElementById(`claim-${rel.sourceClaimId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="flex items-start gap-2 rounded-lg border border-border/30 bg-card/20 p-2 hover:bg-card/40 hover:border-border/60 transition-all group w-full text-left cursor-pointer"
              >
                <ArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground/80">&ldquo;{truncate(rel.sourceClaimContent, 80)}&rdquo;</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                    {relationLabel[rel.relationType]}
                  </span>
                </div>
                <span className="shrink-0 mt-0.5">{relationIcon(rel.relationType)}</span>
              </button>
            ))}
          </div>
          {incomingTruncated && !showAllIncoming && (
            <button
              onClick={() => setShowAllIncoming(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Show {incoming.length - PREVIEW_LIMIT} more
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
