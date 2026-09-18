"use client";

import { useMemo, useState } from "react";
import {
  Swords,
  Shield,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Scale,
  ArrowRight,
} from "lucide-react";
import type {
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionArgument,
  DiscussionClaimRelation,
} from "@/features/discussions/types";
import type { InquiryItem } from "@/features/inquiries/types";
import {
  deriveStateOfUnderstanding,
  type StateOfUnderstandingMetrics,
  type EpistemicClaimSummary,
} from "@/features/discussions/components/understanding-utils";
import { RoomStateBanner, ClaimRelationChips } from "@/features/discussions/components/sou-shared";
import { useClaimRelations } from "@/features/discussions/hooks/use-discussions";

interface ArgumentEvidenceOverviewProps {
  roomId: string;
  claims: DiscussionClaim[];
  propositionClaims: DiscussionClaim[];
  oppositionClaims: DiscussionClaim[];
  roomEvidence: DiscussionEvidence[];
  inquiries: InquiryItem[];
  arguments?: DiscussionArgument[];
  onNavigateToClaim?: (claimId: string) => void;
}

export function ArgumentEvidenceOverview({
  roomId,
  claims,
  propositionClaims,
  oppositionClaims,
  roomEvidence,
  inquiries,
  arguments: roomArguments,
  onNavigateToClaim,
}: ArgumentEvidenceOverviewProps) {
  const [mobileSide, setMobileSide] = useState<"proposition" | "opposition">("proposition");

  // Map open inquiries by targetClaimId
  const inquiryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inq of inquiries || []) {
      if (inq.status === "open" && inq.targetClaimId) {
        counts[inq.targetClaimId] = (counts[inq.targetClaimId] || 0) + 1;
      }
    }
    return counts;
  }, [inquiries]);

  // Claim relations touching each side (either endpoint in the side set): a
  // challenge arriving from the other side still contests this side's claim.
  const { data: claimRelations } = useClaimRelations(roomId);
  const relationsForSide = useMemo(() => {
    const filterFor = (sideClaims: DiscussionClaim[]): DiscussionClaimRelation[] => {
      const ids = new Set(sideClaims.map((c) => c.id));
      return (claimRelations || []).filter((r) => ids.has(r.sourceClaimId) || ids.has(r.targetClaimId));
    };
    return {
      proposition: filterFor(propositionClaims || []),
      opposition: filterFor(oppositionClaims || []),
    };
  }, [claimRelations, propositionClaims, oppositionClaims]);

  // Derive State of Understanding metrics for each side independently using the shared epistemic model
  const propositionMetrics = useMemo(() => {
    return deriveStateOfUnderstanding({
      claims: propositionClaims,
      evidence: roomEvidence,
      inquiryCounts,
      arguments: roomArguments,
      claimRelations: relationsForSide.proposition,
    });
  }, [propositionClaims, roomEvidence, inquiryCounts, roomArguments, relationsForSide]);

  const oppositionMetrics = useMemo(() => {
    return deriveStateOfUnderstanding({
      claims: oppositionClaims,
      evidence: roomEvidence,
      inquiryCounts,
      arguments: roomArguments,
      claimRelations: relationsForSide.opposition,
    });
  }, [oppositionClaims, roomEvidence, inquiryCounts, roomArguments, relationsForSide]);

  // Whole-room SoU (both sides): the only scope presented as room state.
  const roomMetrics = useMemo(() => {
    return deriveStateOfUnderstanding({
      claims,
      evidence: roomEvidence,
      inquiryCounts,
      arguments: roomArguments,
      claimRelations,
    });
  }, [claims, roomEvidence, inquiryCounts, roomArguments, claimRelations]);

  const handleClaimClick = (claimId: string) => {
    if (onNavigateToClaim) {
      onNavigateToClaim(claimId);
    }
  };

  const renderEpistemicCard = (item: EpistemicClaimSummary, accent: "supported" | "contested" | "unresolved") => {
    return (
      <div
        key={item.claim.id}
        onClick={() => handleClaimClick(item.claim.id)}
        className="group rounded-lg border border-border/60 bg-card/60 p-3 space-y-2 hover:border-primary/40 hover:bg-card/85 transition-all cursor-pointer"
      >
        <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
          {item.claim.content}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {accent === "supported" && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-1.5 py-0.5 font-bold text-slate-300 border border-slate-500/20">
              {item.supportingEvidenceCount} citation{item.supportingEvidenceCount === 1 ? "" : "s"}
            </span>
          )}

          {accent === "contested" && (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-400 border border-amber-500/20">
                {item.contradictingEvidenceCount} counter-citation{item.contradictingEvidenceCount === 1 ? "" : "s"}
              </span>
              {item.supportingEvidenceCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-1.5 py-0.5 font-medium text-slate-300 border border-slate-500/20">
                  {item.supportingEvidenceCount} supporting
                </span>
              )}
            </>
          )}

          {accent === "unresolved" && (
            item.contextEvidenceCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 font-bold text-sky-400 border border-sky-500/20">
                {item.contextEvidenceCount} context source{item.contextEvidenceCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 font-bold text-muted-foreground border border-border">
                0 citations
              </span>
            )
          )}

          {/* Contextual open inquiries indicator */}
          {item.openInquiryCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-400 border border-amber-500/20 text-[9px]"
              title={`${item.openInquiryCount} targeted inquir${item.openInquiryCount === 1 ? "y" : "ies"} open for this claim`}
            >
              <HelpCircle className="h-2.5 w-2.5" />
              {item.openInquiryCount} inquir{item.openInquiryCount === 1 ? "y" : "ies"}
            </span>
          )}

          {/* Contextual argument count indicator */}
          {item.totalArgumentCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 font-medium text-muted-foreground border border-border text-[9px]"
              title={`${item.totalArgumentCount} argument${item.totalArgumentCount === 1 ? "" : "s"} attached (${item.supportingArgumentCount} supporting, ${item.challengingArgumentCount} challenging)`}
            >
              <Scale className="h-2.5 w-2.5" />
              {item.totalArgumentCount} arg{item.totalArgumentCount === 1 ? "" : "s"}
            </span>
          )}

          <ClaimRelationChips summary={item} />

          {item.sourceDomains.map((domain) => (
            <span
              key={domain}
              className="rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground text-[9px]"
            >
              {domain}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
          <span className="text-[9px] italic truncate max-w-[200px]">
            {item.statusReason}
          </span>
          <span className="inline-flex items-center gap-1 text-primary group-hover:underline text-[10px] font-semibold shrink-0">
            Inspect claim <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    );
  };

  const renderSideColumn = (
    label: string,
    icon: React.ElementType,
    accentBorder: string,
    accentBg: string,
    metrics: StateOfUnderstandingMetrics
  ) => {
    const Icon = icon;
    return (
      <div className={`rounded-2xl border ${accentBorder} ${accentBg} p-4 md:p-5 space-y-4`}>
        {/* Side Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-card/60 border border-border/60">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                {label}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {metrics.totalClaims} claim{metrics.totalClaims === 1 ? "" : "s"} · {metrics.evidenceCoveragePercentage}% evidence coverage
              </p>
            </div>
          </div>
        </div>

        {metrics.totalClaims === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No {label.toLowerCase()} claims recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Epistemic Pillar 1: Supported */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  Supported by Current Evidence
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {metrics.supportedClaims.length}
                </span>
              </div>
              {metrics.supportedClaims.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/70 italic pl-5">
                  No claims currently supported by cited evidence.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.supportedClaims.map((item) => renderEpistemicCard(item, "supported"))}
                </div>
              )}
            </div>

            {/* Epistemic Pillar 2: Contested */}
            <div className="space-y-2 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Contested / Mixed Evidence
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {metrics.contestedClaims.length}
                </span>
              </div>
              {metrics.contestedClaims.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/70 italic pl-5">
                  No claims currently have contradictory citations.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.contestedClaims.map((item) => renderEpistemicCard(item, "contested"))}
                </div>
              )}
            </div>

            {/* Epistemic Pillar 3: Unresolved */}
            <div className="space-y-2 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                  <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                  Unresolved Front
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {metrics.unresolvedClaims.length}
                </span>
              </div>
              {metrics.unresolvedClaims.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/70 italic pl-5">
                  All claims cite directional evidence.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.unresolvedClaims.map((item) => renderEpistemicCard(item, "unresolved"))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeClaimsCount = claims.filter((c) => !c.isRetracted && !c.deletedAt).length;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5 md:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
            State of Understanding
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Proposition and Opposition claims structured by current evidentiary status.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground">{activeClaimsCount}</span> active claims
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-foreground">{roomEvidence.length}</span> citations
          {inquiries.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-foreground">{inquiries.length}</span> inquiries
            </>
          )}
        </div>
      </div>

      {/* Whole-room SoU (both sides): the only scope presented as room state. */}
      {roomMetrics.hasSufficientData && <RoomStateBanner roomState={roomMetrics.roomState} />}

      {/* Mobile Side Selector (< lg screens) */}
      <div className="flex lg:hidden rounded-xl border border-border/60 bg-muted/30 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMobileSide("proposition")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobileSide === "proposition"
              ? "bg-card text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords className="h-3.5 w-3.5" />
          <span>Proposition ({propositionMetrics.totalClaims})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileSide("opposition")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mobileSide === "opposition"
              ? "bg-card text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Opposition ({oppositionMetrics.totalClaims})</span>
        </button>
      </div>

      {/* Mobile view: single selected side */}
      <div className="block lg:hidden">
        {mobileSide === "proposition" ? (
          renderSideColumn(
            "Proposition",
            Swords,
            "border-blue-500/20",
            "bg-blue-500/5",
            propositionMetrics
          )
        ) : (
          renderSideColumn(
            "Opposition",
            Shield,
            "border-slate-500/20",
            "bg-slate-500/5",
            oppositionMetrics
          )
        )}
      </div>

      {/* Desktop view: Proposition and Opposition side-by-side (>= lg screens) */}
      <div className="hidden lg:grid grid-cols-2 gap-6">
        {renderSideColumn(
          "Proposition",
          Swords,
          "border-blue-500/20",
          "bg-blue-500/5",
          propositionMetrics
        )}
        {renderSideColumn(
          "Opposition",
          Shield,
          "border-slate-500/20",
          "bg-slate-500/5",
          oppositionMetrics
        )}
      </div>

      {/* Descriptive epistemics notice */}
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border/30 pt-3">
        This structural overview maps claims by current evidentiary grounding on each side of the motion. It does not score sides or declare winners. Epistemic progress requires evaluating evidence, arguments, and open inquiries across both positions.
      </p>
    </div>
  );
}
