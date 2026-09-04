"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useClaims,
  useCreateClaim,
  useRetractClaim,
  useVoteClaim,
  useEvidenceMetadata,
  useClaimRelationCounts,
  useClaimRelations,
} from "@/features/discussions/hooks/use-discussions";
import { claimSchema, type ClaimFormValues } from "@/features/discussions/validation";
import {
  AlertCircle,
  Plus,
  Loader2,
  User,
  HelpCircle,
  Send,
  RotateCcw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Flag,
  FileText,
  GitBranch,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
} from "lucide-react";
import { EvidenceSection } from "./evidence-section";
import type {
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionClaimRelation,
  ClaimRelationType,
  ClaimContextType,
} from "../types";
import { ClaimRelationDialog } from "./claim-relation-dialog";
import { ClaimCredibilityBadge } from "@/features/reputation/components/claim-credibility-badge";
import { CredibilityTooltip } from "@/features/reputation/components/credibility-tooltip";
import { AuthorTrustSignal } from "@/features/reputation/components/author-trust-signal";
import { computeCredibility } from "@/features/reputation/reputation-utils";
import { useAuthorsReputation } from "@/features/reputation/hooks/use-batch-reputation";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/date";
import { InquiryButton } from "@/features/debates/components/inquiry-button";
import { InquiryCreateDialog } from "@/features/debates/components/inquiry-create-dialog";
import { InquiryList } from "@/features/debates/components/inquiry-list";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";

export const CLAIM_TYPE_DESCRIPTIONS: Record<string, string> = {
  fact: "Factual — an empirical statement that can be checked against evidence.",
  opinion: "Opinion — a value judgment, interpretation, or subjective perspective.",
  prediction: "Prediction — a forecast of a future outcome, trend, or scenario.",
  proposal: "Proposal — a recommended action, policy, or intervention.",
  observation: "Observation — a descriptive, experiential, or firsthand account.",
};

export const CLAIM_CONTEXT_DESCRIPTIONS: Record<string, string> = {
  supporting_idea: "Supporting Idea — reinforces or elaborates on an existing claim.",
  counterpoint: "Counterpoint — challenges, qualifies, or disputes a claim.",
  observation: "Observation — descriptive context or neutral background note.",
  open_question: "Open Question — identifies an unresolved issue or inquiry.",
};

interface ClaimListProps {
  roomId: string;
  questionId?: string;
  scrollToClaimId?: string | null;
  onScrollComplete?: () => void;
  claimQuestionMap?: Map<string, string>;
  onReportClaim?: (claim: DiscussionClaim) => void;
  onReportEvidence?: (evidence: DiscussionEvidence) => void;
  debateSide?: "proposition" | "opposition" | null;
  claims?: DiscussionClaim[] | undefined;
  isLoading?: boolean;
}

export function ClaimList({
  roomId,
  questionId,
  scrollToClaimId,
  onScrollComplete,
  claimQuestionMap,
  onReportClaim,
  onReportEvidence,
  debateSide,
  claims: externalClaims,
  isLoading: externalLoading,
}: ClaimListProps) {
  const { user } = useAuth();
  const internalClaims = useClaims(roomId, questionId, externalClaims === undefined);
  const claims = externalClaims !== undefined ? externalClaims : internalClaims.data;
  const isClaimsLoading = externalClaims !== undefined ? (externalLoading ?? false) : internalClaims.isLoading;
  const claimsError = externalClaims !== undefined ? null : (internalClaims.error as Error | null);
  const { data: roomEvidence } = useEvidenceMetadata(roomId);
  const createMutation = useCreateClaim(roomId);
  const retractMutation = useRetractClaim(roomId);

  const { data: relationCounts } = useClaimRelationCounts(roomId);
  const { data: inquiryCounts } = useInquiryCountsForRoom(roomId);

  const relationCountsByClaim: Record<
    string,
    { outgoingSupports: number; outgoingContradicts: number; outgoingRefines: number; incoming: number }
  > = {};
  if (relationCounts) {
    for (const rel of relationCounts) {
      if (!relationCountsByClaim[rel.sourceClaimId])
        relationCountsByClaim[rel.sourceClaimId] = {
          outgoingSupports: 0,
          outgoingContradicts: 0,
          outgoingRefines: 0,
          incoming: 0,
        };
      if (!relationCountsByClaim[rel.targetClaimId])
        relationCountsByClaim[rel.targetClaimId] = {
          outgoingSupports: 0,
          outgoingContradicts: 0,
          outgoingRefines: 0,
          incoming: 0,
        };
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

  const authorIds = claims?.filter((c) => c.createdBy && c.identityMode !== "anonymous").map((c) => c.createdBy!) || [];
  const { data: authorRepScores } = useAuthorsReputation(authorIds);

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
  const [inquiryDialogClaimId, setInquiryDialogClaimId] = useState<string | null>(null);
  const [pendingRetractId, setPendingRetractId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const anyRelationsOpen = Object.values(expandedRelations).some(Boolean);
  const { data: claimRelations } = useClaimRelations(roomId, anyRelationsOpen);

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      content: "",
      claimType: "opinion",
      contextType: "supporting_idea",
      identityMode: "public",
    },
  });

  const [anonymousClaim, setAnonymousClaim] = useState(false);
  const contentText = watch("content") || "";

  const onSubmit = async (data: ClaimFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        roomId,
        content: data.content,
        claimType: data.claimType || "opinion",
        contextType: data.contextType || "supporting_idea",
        identityMode: anonymousClaim ? "anonymous" : "public",
        questionId: questionId || null,
        debateSide: debateSide || null,
      });
      reset();
      setShowAdvanced(false);
      toast.success("Claim asserted successfully.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to assert claim.");
    }
  };

  const handleRetract = (claimId: string) => {
    setPendingRetractId(claimId);
  };

  const executeRetract = async () => {
    if (!pendingRetractId) return;
    try {
      await retractMutation.mutateAsync(pendingRetractId);
      toast.success("Claim retracted.");
    } catch (err) {
      toast.error("Failed to retract claim.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPendingRetractId(null);
    }
  };

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
    <div className="space-y-6">
      {/* 1. Assert Claim Form (Write-First Flow) */}
      {user ? (
        <div className="rounded-2xl border border-border bg-card/35 p-5 backdrop-blur-md shadow-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Assert a Structured Claim</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <div className="relative">
                <textarea
                  id="content"
                  rows={3}
                  placeholder="What claim or core thought do you want to contribute?"
                  className={`w-full rounded-xl border bg-background/50 px-3.5 py-2.5 text-xs md:text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 ${
                    errors.content ? "border-destructive" : "border-input"
                  }`}
                  disabled={createMutation.isPending}
                  {...register("content")}
                />
                <span
                  className={`absolute bottom-2.5 right-3 text-[10px] font-semibold ${
                    contentText.length > 500 || contentText.length < 10
                      ? "text-muted-foreground"
                      : "text-primary/75"
                  }`}
                >
                  {contentText.length} / 500
                </span>
              </div>
              {errors.content && (
                <p className="text-xs font-semibold text-destructive mt-0.5">{errors.content.message}</p>
              )}
            </div>

            {/* Collapsible Advanced Taxonomy & Identity Options */}
            {showAdvanced && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3.5 transition-all">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                      Claim Type
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["fact", "opinion", "prediction", "proposal", "observation"] as const).map((type) => (
                        <label
                          key={type}
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card/40 cursor-pointer select-none transition-all hover:bg-card/70 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.05]"
                        >
                          <input
                            type="radio"
                            value={type}
                            className="sr-only"
                            disabled={createMutation.isPending}
                            {...register("claimType")}
                          />
                          <span className="text-[10px] font-bold capitalize text-foreground">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                      Context Type
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["supporting_idea", "counterpoint", "observation", "open_question"] as const).map((type) => (
                        <label
                          key={type}
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-card/40 cursor-pointer select-none transition-all hover:bg-card/70 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.05]"
                        >
                          <input
                            type="radio"
                            value={type}
                            className="sr-only"
                            disabled={createMutation.isPending}
                            {...register("contextType")}
                          />
                          <span className="text-[10px] font-bold text-foreground text-center line-clamp-1">
                            {type === "supporting_idea"
                              ? "Support Idea"
                              : type === "counterpoint"
                              ? "Counterpoint"
                              : type === "observation"
                              ? "Observation"
                              : "Open Question"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={anonymousClaim}
                      onChange={(e) => {
                        setAnonymousClaim(e.target.checked);
                        setValue("identityMode", e.target.checked ? "anonymous" : "public");
                      }}
                      className="rounded border-input text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
                      disabled={createMutation.isPending}
                    />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground">Assert Anonymously</p>
                      <p className="text-[10px] text-muted-foreground leading-none">Redact author identity metadata</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end border-t border-border/40 pt-3">
              <button
                type="submit"
                disabled={createMutation.isPending || contentText.trim().length < 10}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Asserting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Assert Claim</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 2. Claims Stream */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>{questionId ? "Answering Claims" : "Room Claims"}</span>
          {claims && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {claims.length}
            </span>
          )}
        </h4>

        {isClaimsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-card/25 p-4 animate-pulse space-y-2" />
            ))}
          </div>
        ) : claimsError ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Failed to load claims: {(claimsError as Error).message}</span>
          </div>
        ) : claims?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-8 text-center max-w-md mx-auto space-y-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">No claims asserted yet</p>
            <p className="text-[11px] text-muted-foreground">
              Be the first to assert a structured claim in this discussion.
            </p>
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
              const isExpanded = !!expandedClaims[claim.id];
              const isRelationsExpanded = !!expandedRelations[claim.id];
              const evCount = evidenceCountByClaim[claim.id] || 0;
              const rc = relationCountsByClaim[claim.id];
              const totalRel = rc
                ? rc.outgoingSupports + rc.outgoingContradicts + rc.outgoingRefines + rc.incoming
                : 0;

              return (
                <article
                  id={`claim-${claim.id}`}
                  key={claim.id}
                  className={`rounded-2xl border border-border/60 bg-card/30 p-4 space-y-3 transition-all hover:bg-card/45 hover:border-border border-l-4 ${accentBorder} shadow-sm backdrop-blur-sm ${
                    isClaimRetracted ? "opacity-60 grayscale-[15%]" : ""
                  }`}
                >
                  {/* Top Bar: Badges + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary border border-primary/20">
                        Claim
                      </span>
                      <Tooltip content={CLAIM_TYPE_DESCRIPTIONS[claim.claimType] ?? claim.claimType}>
                        <span
                          className={`rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider cursor-help ${getBadgeStyles(
                            claim.claimType
                          )}`}
                          title={CLAIM_TYPE_DESCRIPTIONS[claim.claimType]}
                        >
                          {claim.claimType}
                        </span>
                      </Tooltip>
                      <ContextBadge contextType={claim.contextType} />

                      {(() => {
                        if (isClaimRetracted || !roomEvidence) return null;
                        const evidenceForClaim = roomEvidence.filter((e) => e.claimId === claim.id);
                        const claimCredibility = computeCredibility(claim, evidenceForClaim, relationCounts ?? [], 0);
                        return (
                          <Tooltip content={<CredibilityTooltip credibility={claimCredibility} />}>
                            <ClaimCredibilityBadge credibility={claimCredibility} />
                          </Tooltip>
                        );
                      })()}

                      {isClaimRetracted && (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                          Retracted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwnClaim && !isClaimRetracted && (
                        <button
                          onClick={() => handleRetract(claim.id)}
                          disabled={retractMutation.isPending}
                          className="text-[10px] font-bold text-destructive hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Retract
                        </button>
                      )}
                      {user && (
                        <button
                          onClick={() => onReportClaim?.(claim)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Report
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answering Question Context Banner */}
                  {claim.questionId && claimQuestionMap?.has(claim.id) && (
                    <div className="flex items-start gap-1.5 rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-1.5 text-[11px]">
                      <HelpCircle className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                      <span className="text-muted-foreground italic line-clamp-1">
                        Answering: &ldquo;{claimQuestionMap.get(claim.id)}&rdquo;
                      </span>
                    </div>
                  )}

                  {/* Claim Text */}
                  <p className="text-xs md:text-sm leading-relaxed text-foreground font-medium">
                    {claim.content}
                  </p>

                  {/* Voting Toolbar & Consensus Bar */}
                  {!claim.isRetracted && <ClaimVoting roomId={roomId} claim={claim} />}

                  {/* Footer Actions: Evidence, Relations, Relate triggers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(claim.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          isExpanded
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        <span>Evidence ({evCount})</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      <button
                        onClick={() => toggleExpandRelations(claim.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          isRelationsExpanded
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>Relations ({totalRel})</span>
                        {isRelationsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {user && (
                        <InquiryButton
                          count={inquiryCounts?.[claim.id] ?? 0}
                          onClick={() => setInquiryDialogClaimId(claim.id)}
                        />
                      )}
                    </div>

                    {/* Relate Quick Actions */}
                    {!claim.isRetracted && user && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-muted-foreground/70 font-semibold mr-0.5">Relate:</span>
                        {(["supports", "contradicts", "refines"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setRelationDialogState({ claim, relationType: type })}
                            className="rounded border border-border/40 bg-card/20 px-1.5 py-0.5 font-bold text-muted-foreground hover:text-foreground hover:border-border transition-colors capitalize cursor-pointer"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progressive Disclosure Drawers */}
                  {isRelationsExpanded && claimRelations && (
                    <RelationPreview
                      claimId={claim.id}
                      relations={claimRelations}
                      onNavigateToClaim={(targetClaimId) =>
                        setNavigatedFrom({ sourceClaimId: claim.id, targetClaimId })
                      }
                    />
                  )}

                  {isExpanded && (
                    <EvidenceSection
                      claimId={claim.id}
                      roomId={roomId}
                      isClaimRetracted={claim.isRetracted}
                      onReportEvidence={onReportEvidence || (() => {})}
                      defaultOpen={autoOpenEvidenceForm === claim.id}
                    />
                  )}

                  {user && <InquiryList roomId={roomId} targetClaimId={claim.id} />}
                </article>
              );
            })}

            {user && inquiryDialogClaimId && (
              <InquiryCreateDialog
                roomId={roomId}
                targetClaimId={inquiryDialogClaimId}
                isOpen={!!inquiryDialogClaimId}
                onClose={() => setInquiryDialogClaimId(null)}
              />
            )}
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
    <div className="flex items-center gap-3 pt-0.5 pb-0.5">
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-0.5">
        <button
          onClick={() => handleVote("agree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold transition-all cursor-pointer ${
            agreeActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Agree with claim"
        >
          <ThumbsUp className="h-3 w-3" />
          <span>{claim.agreeCount ?? 0}</span>
        </button>

        <div className="h-3 w-px bg-border/80" />

        <button
          onClick={() => handleVote("disagree")}
          disabled={voteMutation.isPending}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold transition-all cursor-pointer ${
            disagreeActive
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Disagree with claim"
        >
          <ThumbsDown className="h-3 w-3" />
          <span>{claim.disagreeCount ?? 0}</span>
        </button>
      </div>

      {claim.consensusRatio !== null && claim.consensusRatio !== undefined && (
        <div
          className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground cursor-help"
          title={`${Math.round(claim.consensusRatio)}% of voters agree with this claim (${claim.agreeCount ?? 0} agree, ${claim.disagreeCount ?? 0} disagree)`}
        >
          <div
            className="h-1.5 w-12 bg-rose-500/30 rounded-full overflow-hidden flex"
            role="progressbar"
            aria-valuenow={Math.round(claim.consensusRatio)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(claim.consensusRatio)}% voter agreement`}
          >
            <div className="bg-emerald-500 h-full" style={{ width: `${claim.consensusRatio}%` }} />
          </div>
          <span>{Math.round(claim.consensusRatio)}% Agree</span>
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
    case "supporting_idea":
      return "Supporting Idea";
    case "counterpoint":
      return "Counterpoint";
    case "observation":
      return "Observation";
    case "open_question":
      return "Open Question";
  }
}

function ContextBadge({ contextType }: { contextType: ClaimContextType }) {
  const desc = CLAIM_CONTEXT_DESCRIPTIONS[contextType] ?? getContextLabel(contextType);
  return (
    <Tooltip content={desc}>
      <span
        className={`rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider cursor-help ${getContextBadgeStyles(
          contextType
        )}`}
        title={desc}
      >
        {getContextLabel(contextType)}
      </span>
    </Tooltip>
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

const PREVIEW_LIMIT = 5;

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
      case "supports":
        return <ThumbsUp className="h-3 w-3 text-emerald-400" />;
      case "contradicts":
        return <ThumbsDown className="h-3 w-3 text-rose-400" />;
      case "refines":
        return <GitBranch className="h-3 w-3 text-violet-400" />;
      default:
        return null;
    }
  };

  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/10 p-3 space-y-2.5 text-xs">
      {visibleOutgoing.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Outgoing Relations ({outgoing.length})
          </span>
          <div className="space-y-1">
            {visibleOutgoing.map((rel) => (
              <button
                key={rel.id}
                onClick={() => {
                  onNavigateToClaim(rel.targetClaimId);
                  document
                    .getElementById(`claim-${rel.targetClaimId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="flex items-start gap-1.5 rounded-lg border border-border/30 bg-card/20 p-1.5 hover:bg-card/40 hover:border-border/60 transition-all group w-full text-left cursor-pointer text-[11px]"
              >
                <span className="shrink-0 mt-0.5">{relationIcon(rel.relationType)}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-foreground/80 group-hover:text-foreground">
                    {relationLabel[rel.relationType]}
                  </span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-muted-foreground/80">&ldquo;{truncate(rel.targetClaimContent, 70)}&rdquo;</span>
                </div>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5" />
              </button>
            ))}
          </div>
          {outgoingTruncated && !showAllOutgoing && (
            <button
              onClick={() => setShowAllOutgoing(true)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Show {outgoing.length - PREVIEW_LIMIT} more
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {visibleIncoming.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Incoming Relations ({incoming.length})
          </span>
          <div className="space-y-1">
            {visibleIncoming.map((rel) => (
              <button
                key={rel.id}
                onClick={() => {
                  onNavigateToClaim(rel.sourceClaimId);
                  document
                    .getElementById(`claim-${rel.sourceClaimId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="flex items-start gap-1.5 rounded-lg border border-border/30 bg-card/20 p-1.5 hover:bg-card/40 hover:border-border/60 transition-all group w-full text-left cursor-pointer text-[11px]"
              >
                <ArrowDown className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground/80">&ldquo;{truncate(rel.sourceClaimContent, 70)}&rdquo;</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="font-bold text-foreground/80 group-hover:text-foreground">
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
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
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
