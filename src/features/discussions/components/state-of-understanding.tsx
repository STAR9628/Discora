"use client";

import { useMemo, useState } from "react";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Scale,
  ShieldAlert,
} from "lucide-react";
import type {
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionQuestion,
  DiscussionClaimRelation,
} from "@/features/discussions/types";
import {
  deriveStateOfUnderstanding,
  formatCommunityStance,
} from "./understanding-utils";

interface StateOfUnderstandingProps {
  claims: DiscussionClaim[] | undefined;
  roomEvidence: DiscussionEvidence[] | undefined;
  questions: DiscussionQuestion[] | undefined;
  claimRelations?: DiscussionClaimRelation[] | undefined;
  inquiryCounts?: Record<string, number> | undefined;
  isLoading?: boolean;
  onNavigateToClaim?: (claimId: string, options?: { autoOpenEvidence?: boolean }) => void;
  onNavigateToEvidence?: (evidenceId?: string) => void;
  onNavigateToQuestions?: (questionId?: string) => void;
}

export function StateOfUnderstanding({
  claims,
  roomEvidence,
  questions,
  claimRelations,
  inquiryCounts,
  isLoading,
  onNavigateToClaim,
  onNavigateToEvidence,
  onNavigateToQuestions,
}: StateOfUnderstandingProps) {
  const [mobileTab, setMobileTab] = useState<"supported" | "contested" | "unresolved">("supported");
  const [isExpanded, setIsExpanded] = useState(false);

  const metrics = useMemo(() => {
    return deriveStateOfUnderstanding({
      claims,
      evidence: roomEvidence,
      questions,
      claimRelations,
      inquiryCounts,
    });
  }, [claims, roomEvidence, questions, claimRelations, inquiryCounts]);

  const handleClaimClick = (claimId: string, options?: { autoOpenEvidence?: boolean }) => {
    if (onNavigateToClaim) {
      onNavigateToClaim(claimId, options);
    } else {
      const el = document.getElementById(`claim-${claimId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "rounded-xl", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "rounded-xl");
        }, 3000);
      } else {
        const claimsSec = document.getElementById("claims");
        if (claimsSec) claimsSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleEvidenceClick = (evidenceId?: string) => {
    if (onNavigateToEvidence) {
      onNavigateToEvidence(evidenceId);
    } else {
      const el = document.getElementById("evidence");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleQuestionClick = (questionId?: string) => {
    if (onNavigateToQuestions) {
      onNavigateToQuestions(questionId);
    } else {
      const el = document.getElementById("questions");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Render loading skeleton during data fetch
  if (isLoading) {
    return (
      <section
        aria-labelledby="understanding-heading"
        className="rounded-2xl border border-border/80 bg-card/30 p-5 md:p-6 backdrop-blur-md space-y-3 animate-pulse"
      >
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary animate-spin" />
          <h2 id="understanding-heading" className="text-base font-bold text-foreground">
            State of Understanding
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Evaluating current empirical citations and structured lines of inquiry…
        </p>
      </section>
    );
  }

  // If no data exists at all, render an onboarding empty state
  if (!metrics.hasSufficientData) {
    return (
      <section
        aria-labelledby="understanding-heading"
        className="rounded-2xl border border-border/80 bg-card/30 p-5 md:p-6 backdrop-blur-md space-y-3"
      >
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          <h2 id="understanding-heading" className="text-base font-bold text-foreground">
            State of Understanding
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Discussion in framing stage. Explore the opening statement above, ask framing questions, or contribute the first observation below.
        </p>
      </section>
    );
  }

  // Display limit for initial progressive disclosure
  const itemLimit = isExpanded ? 50 : 2;

  const renderedSupported = metrics.supportedClaims.slice(0, itemLimit);
  const renderedContested = metrics.contestedClaims.slice(0, itemLimit);
  const renderedUnresolved = metrics.unresolvedClaims.slice(0, itemLimit);
  const renderedQuestions = metrics.unresolvedQuestions.slice(0, itemLimit);

  const unresolvedTotalCount =
    metrics.unresolvedClaims.length + metrics.unresolvedQuestions.length;

  return (
    <section
      aria-labelledby="understanding-heading"
      className="rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5 md:p-6 backdrop-blur-md shadow-md space-y-5 transition-all"
    >
      {/* 1. Header & Metric Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary shrink-0" />
            <h2 id="understanding-heading" className="text-base md:text-lg font-extrabold text-foreground tracking-tight">
              State of Understanding
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Deterministic synthesis of empirical citations, contested claims, and open inquiries.
          </p>
        </div>

        {/* Executive Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[11px] border ${
              metrics.evidenceCoveragePercentage >= 50
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : metrics.evidenceCoveragePercentage > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-muted/40 border-border text-muted-foreground"
            }`}
            title={`${metrics.evidenceCoveragePercentage}% of claims have attached sources (${metrics.claimsWithEvidenceCount} of ${metrics.totalClaims})`}
            aria-label={`Evidence coverage: ${metrics.evidenceCoveragePercentage}%, ${metrics.claimsWithEvidenceCount} of ${metrics.totalClaims} claims have attached sources`}
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span>{metrics.evidenceCoveragePercentage}% Evidence Coverage</span>
            <span className="text-[10px] font-normal opacity-85">
              ({metrics.claimsWithEvidenceCount} of {metrics.totalClaims} with sources)
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[11px] border border-border bg-card/60 text-foreground/85">
            <Scale className="h-3 w-3 text-primary" />
            <span>
              {metrics.supportedClaims.length} Supported • {metrics.contestedClaims.length} Contested
            </span>
          </span>

          {metrics.totalInquiriesCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[11px] border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-3 w-3" />
              <span>{metrics.totalInquiriesCount} Inquiries Active</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Mobile Segmented Control (< 1024px) */}
      <div className="lg:hidden grid grid-cols-3 rounded-xl border border-border/60 bg-muted/20 p-1 text-xs font-semibold gap-1">
        <button
          type="button"
          onClick={() => setMobileTab("supported")}
          className={`min-h-[44px] min-w-0 w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-lg px-1 py-1.5 text-center transition-all cursor-pointer ${
            mobileTab === "supported"
              ? "bg-card text-emerald-400 font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-[11px] sm:text-xs">Supported</span>
          <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-mono shrink-0">
            {metrics.supportedClaims.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("contested")}
          className={`min-h-[44px] min-w-0 w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-lg px-1 py-1.5 text-center transition-all cursor-pointer ${
            mobileTab === "contested"
              ? "bg-card text-rose-400 font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-[11px] sm:text-xs">Contested</span>
          <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-mono shrink-0">
            {metrics.contestedClaims.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("unresolved")}
          className={`min-h-[44px] min-w-0 w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-lg px-1 py-1.5 text-center transition-all cursor-pointer ${
            mobileTab === "unresolved"
              ? "bg-card text-sky-400 font-bold shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-[11px] sm:text-xs">Unresolved</span>
          <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-mono shrink-0">
            {unresolvedTotalCount}
          </span>
        </button>
      </div>

      {/* 3. Epistemic Pillars Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Supported by Current Evidence */}
        <div
          className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 ${
            mobileTab !== "supported" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Supported by Current Evidence
              </h3>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{metrics.supportedClaims.length} verified claim{metrics.supportedClaims.length === 1 ? "" : "s"}</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400/90">
                0 contradictions
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Claims supported by cited sources with no active contradictory citations.
          </p>

          {metrics.supportedClaims.length === 0 ? (
            <div className="rounded-lg border border-dashed border-emerald-500/20 p-4 text-center text-xs text-muted-foreground">
              No claims are currently supported by cited evidence.
            </div>
          ) : (
            <div className="space-y-3">
              {renderedSupported.map((item) => (
                <div
                  key={item.claim.id}
                  onClick={() => handleClaimClick(item.claim.id)}
                  className="group rounded-lg border border-border/60 bg-card/50 p-3 space-y-2 hover:border-emerald-500/40 hover:bg-card/75 transition-all cursor-pointer"
                >
                  <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
                    {item.claim.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">
                      {item.supportingEvidenceCount} citation{item.supportingEvidenceCount === 1 ? "" : "s"}
                    </span>

                    {item.sourceDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground text-[9px]"
                      >
                        {domain}
                      </span>
                    ))}

                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {formatCommunityStance(item.totalVotes, item.agreementPercentage)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="text-[9px] text-emerald-400/90 italic truncate max-w-[200px]">
                      {item.statusReason}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:underline text-[10px] font-semibold shrink-0">
                      Inspect claim <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Contested / Mixed Evidence */}
        <div
          className={`rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3 ${
            mobileTab !== "contested" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Contested / Mixed Evidence
              </h3>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{metrics.contestedClaims.length} active dispute{metrics.contestedClaims.length === 1 ? "" : "s"}</span>
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-400/90">
                Opposing citations
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Claims facing contradictory sources, mixed evidence, or divided stance.
          </p>

          {metrics.contestedClaims.length === 0 ? (
            <div className="rounded-lg border border-dashed border-rose-500/20 p-4 text-center text-xs text-muted-foreground">
              No claims currently face active contradictory citations.
            </div>
          ) : (
            <div className="space-y-3">
              {renderedContested.map((item) => (
                <div
                  key={item.claim.id}
                  onClick={() => handleClaimClick(item.claim.id)}
                  className="group rounded-lg border border-border/60 bg-card/50 p-3 space-y-2 hover:border-rose-500/40 hover:bg-card/75 transition-all cursor-pointer"
                >
                  <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
                    {item.claim.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 font-bold text-rose-400 border border-rose-500/20">
                      {item.contradictingEvidenceCount} counter-citation{item.contradictingEvidenceCount === 1 ? "" : "s"}
                    </span>
                    {item.supportingEvidenceCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">
                        {item.supportingEvidenceCount} supporting
                      </span>
                    )}

                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {formatCommunityStance(item.totalVotes, item.agreementPercentage)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="text-[9px] text-rose-400/90 italic truncate max-w-[200px]">
                      {item.statusReason}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:underline text-[10px] font-semibold shrink-0">
                      Inspect dispute <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Unresolved Front (Epistemic Debt) */}
        <div
          className={`rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3 ${
            mobileTab !== "unresolved" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <HelpCircle className="h-4 w-4 text-sky-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Unresolved Front
              </h3>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{unresolvedTotalCount} open item{unresolvedTotalCount === 1 ? "" : "s"}</span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-400/90">
                Awaiting evidence
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Open framing questions without claims, and assertions awaiting directional evidence.
          </p>

          {unresolvedTotalCount === 0 ? (
            <div className="rounded-lg border border-dashed border-sky-500/20 p-4 text-center text-xs text-muted-foreground">
              All framing questions have answering claims and all assertions cite directional evidence.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Unanswered Questions */}
              {renderedQuestions.map((q) => (
                <div
                  key={q.question.id}
                  onClick={() => handleQuestionClick(q.question.id)}
                  className="group rounded-lg border border-border/60 bg-card/50 p-3 space-y-1.5 hover:border-sky-500/40 hover:bg-card/75 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                    <HelpCircle className="h-3 w-3" />
                    <span>Unanswered Question</span>
                  </div>
                  <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
                    {q.question.content}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="text-[9px] text-muted-foreground">0 claims answering</span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:underline text-[10px] font-semibold shrink-0">
                      Answer question <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Claims Awaiting Directional Citations */}
              {renderedUnresolved.map((item) => (
                <div
                  key={item.claim.id}
                  onClick={() => handleClaimClick(item.claim.id, { autoOpenEvidence: true })}
                  className="group rounded-lg border border-border/60 bg-card/50 p-3 space-y-2 hover:border-sky-500/40 hover:bg-card/75 transition-all cursor-pointer"
                >
                  <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
                    {item.claim.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {item.contextEvidenceCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 font-bold text-sky-400 border border-sky-500/20">
                        {item.contextEvidenceCount} context source{item.contextEvidenceCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 font-bold text-muted-foreground border border-border">
                        0 citations
                      </span>
                    )}

                    {item.sourceDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground text-[9px]"
                      >
                        {domain}
                      </span>
                    ))}

                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {formatCommunityStance(item.totalVotes, item.agreementPercentage)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="text-[9px] text-sky-400/90 italic truncate max-w-[200px]">
                      {item.statusReason}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:underline text-[10px] font-semibold shrink-0">
                      Add evidence <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Progressive Disclosure Toggle */}
      {(metrics.totalClaims > 2 || metrics.unresolvedQuestions.length > 2) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/40 gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer py-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Collapse to Summary View</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>
                  Expand Full Synthesis Breakdown ({metrics.totalClaims} claims, {metrics.unresolvedQuestions.length} open questions)
                </span>
              </>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-3 text-muted-foreground text-[11px]">
            <button
              type="button"
              onClick={() => handleEvidenceClick()}
              className="hover:text-foreground cursor-pointer flex items-center gap-1"
            >
              <span>Evidence Bank</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
