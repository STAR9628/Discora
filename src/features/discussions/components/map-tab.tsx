"use client";

import { useMemo } from "react";
import { useQuestions, useClaims, useRoomEvidence, useClaimRelations } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionQuestion, DiscussionClaim, DiscussionEvidence, ClaimContextType } from "@/features/discussions/types";
import { HelpCircle, FileText, Link2, AlertCircle, ChevronRight, ArrowUpRight, ThumbsUp, ThumbsDown, Lightbulb, Eye, Target, Search, BarChart3, Plus, Minus, Sparkles, GitBranch } from "lucide-react";

interface MapTabProps {
  roomId: string;
}

interface ClaimNode {
  claim: DiscussionClaim;
  evidenceList: DiscussionEvidence[];
}

interface QuestionNode {
  question: DiscussionQuestion;
  claims: ClaimNode[];
}

function buildGraphData(
  questions: DiscussionQuestion[],
  claims: DiscussionClaim[],
  evidence: DiscussionEvidence[],
): {
  questionNodes: QuestionNode[];
  orphanClaims: ClaimNode[];
} {
  const evidenceByClaim = new Map<string, DiscussionEvidence[]>();
  for (const ev of evidence) {
    const list = evidenceByClaim.get(ev.claimId);
    if (list) {
      list.push(ev);
    } else {
      evidenceByClaim.set(ev.claimId, [ev]);
    }
  }

  const claimsByQuestion = new Map<string, DiscussionClaim[]>();
  const orphanClaimsList: DiscussionClaim[] = [];

  for (const c of claims) {
    if (c.questionId) {
      const list = claimsByQuestion.get(c.questionId);
      if (list) {
        list.push(c);
      } else {
        claimsByQuestion.set(c.questionId, [c]);
      }
    } else {
      orphanClaimsList.push(c);
    }
  }

  const questionNodes: QuestionNode[] = questions
    .filter((q) => !q.isRetracted)
    .map((q) => {
      const relatedClaims = claimsByQuestion.get(q.id) || [];
      return {
        question: q,
        claims: relatedClaims
          .filter((c) => !c.isRetracted)
          .map((c) => ({
            claim: c,
            evidenceList: evidenceByClaim.get(c.id) || [],
          })),
      };
    })
    .filter((qn) => qn.claims.length > 0);

  const orphanClaimsNodes: ClaimNode[] = orphanClaimsList
    .filter((c) => !c.isRetracted)
    .map((c) => ({
      claim: c,
      evidenceList: evidenceByClaim.get(c.id) || [],
    }));

  return { questionNodes, orphanClaims: orphanClaimsNodes };
}

function formatConsensus(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return "No votes";
  const pct = Math.round(ratio * 100);
  return `${pct}% agree`;
}

function getClaimTypeIcon(type: string) {
  switch (type) {
    case "fact": return <FileText className="h-3 w-3" />;
    case "opinion": return <Eye className="h-3 w-3" />;
    case "prediction": return <Search className="h-3 w-3" />;
    case "proposal": return <Lightbulb className="h-3 w-3" />;
    case "observation": return <BarChart3 className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
}

function getQuestionTypeIcon(type: string) {
  switch (type) {
    case "information": return <HelpCircle className="h-3 w-3" />;
    case "clarification": return <HelpCircle className="h-3 w-3" />;
    case "perspective": return <Eye className="h-3 w-3" />;
    case "evidence": return <FileText className="h-3 w-3" />;
    case "directional": return <Target className="h-3 w-3" />;
    case "reflective": return <Lightbulb className="h-3 w-3" />;
    default: return <HelpCircle className="h-3 w-3" />;
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

function SourceChip({ title, url }: { title: string; url: string | null }) {
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors max-w-full"
    >
      <Link2 className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{truncate(title, 40)}</span>
      <ArrowUpRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
    </a>
  );
}

function EvidenceCard({ evidence }: { evidence: DiscussionEvidence }) {
  const directionColors: Record<string, string> = {
    support: "border-l-green-500/60 bg-green-500/[0.03]",
    contradict: "border-l-red-500/60 bg-red-500/[0.03]",
    context: "border-l-blue-400/60 bg-blue-400/[0.03]",
  };
  const directionLabels: Record<string, string> = {
    support: "Supports",
    contradict: "Contradicts",
    context: "Context",
  };
  const directionBadgeColors: Record<string, string> = {
    support: "bg-green-500/10 text-green-400 border-green-500/20",
    contradict: "bg-red-500/10 text-red-400 border-red-500/20",
    context: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  };

  return (
    <div
      className={`rounded-xl border border-border/60 p-3 space-y-2 border-l-4 ${directionColors[evidence.direction] || "border-l-border"} bg-card/30`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${directionBadgeColors[evidence.direction] || ""}`}
        >
          {directionLabels[evidence.direction] || evidence.direction}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {evidence.evidenceType}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-foreground/85">
        {truncate(evidence.content, 120)}
      </p>
      {(evidence.sourceTitle || evidence.sourceUrl) && (
        <SourceChip title={evidence.sourceTitle} url={evidence.sourceUrl} />
      )}
    </div>
  );
}

function ClaimCard({ claim, evidenceList, relationCounts }: ClaimNode & { relationCounts?: { outgoingSupports: number; outgoingContradicts: number; outgoingRefines: number; incoming: number } }) {
  const ratio = claim.consensusRatio ?? null;
  const agreeBar = ratio !== null ? Math.round(ratio * 100) : 0;
  const disagreeBar = ratio !== null ? 100 - agreeBar : 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4 space-y-3 border-l-4 border-l-amber-500/60">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold">
              {getClaimTypeIcon(claim.claimType)}
              <span className="capitalize">{claim.claimType}</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {truncate(claim.content, 200)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="h-3 w-3 text-green-400" />
          <span>{claim.agreeCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsDown className="h-3 w-3 text-red-400" />
          <span>{claim.disagreeCount ?? 0}</span>
        </div>
        {ratio !== null && (
          <span className="text-muted-foreground/70">
            {formatConsensus(ratio)}
          </span>
        )}
      </div>

      {ratio !== null && (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
          <div
            className="bg-green-500/60 transition-all"
            style={{ width: `${agreeBar}%` }}
          />
          <div
            className="bg-red-500/60 transition-all"
            style={{ width: `${disagreeBar}%` }}
          />
        </div>
      )}

      {relationCounts && (() => {
        const total = relationCounts.outgoingSupports + relationCounts.outgoingContradicts + relationCounts.outgoingRefines + relationCounts.incoming;
        if (total === 0) return null;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {relationCounts.outgoingSupports > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                <ThumbsUp className="h-3 w-3" />Supports {relationCounts.outgoingSupports}
              </span>
            )}
            {relationCounts.outgoingContradicts > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                <ThumbsDown className="h-3 w-3" />Contradicts {relationCounts.outgoingContradicts}
              </span>
            )}
            {relationCounts.outgoingRefines > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
                <GitBranch className="h-3 w-3" />Refines {relationCounts.outgoingRefines}
              </span>
            )}
            {relationCounts.incoming > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                Referenced by {relationCounts.incoming}
              </span>
            )}
          </div>
        );
      })()}

      {evidenceList.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <FileText className="h-3 w-3" />
            <span>Evidence ({evidenceList.length})</span>
          </div>
          <div className="space-y-2">
            {evidenceList.map((ev) => (
              <EvidenceCard key={ev.id} evidence={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, claims, relationCountsByClaim }: QuestionNode & { relationCountsByClaim?: Record<string, { outgoingSupports: number; outgoingContradicts: number; outgoingRefines: number; incoming: number }> }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4 space-y-3 border-l-4 border-l-sky-500/60">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
          {getQuestionTypeIcon(question.questionType)}
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 text-[10px] font-semibold capitalize">
              {question.questionType}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90 font-medium">
            {question.content}
          </p>
        </div>
      </div>

      {claims.length > 0 && (
        <div className="space-y-2 pt-1">
          {(() => {
            const grouped = groupByContextType(claims);
            const order: ClaimContextType[] = ["supporting_idea", "counterpoint", "observation", "open_question"];
            return order.map((type) => {
              const claimsInGroup = grouped.get(type);
              if (!claimsInGroup || claimsInGroup.length === 0) return null;
              return (
                <div key={type} className="space-y-1">
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${getContextColor(type)}`}>
                    {getContextIcon(type)}
                    {getContextLabel(type)}
                    <span className="text-[10px] font-normal text-muted-foreground">({claimsInGroup.length})</span>
                  </div>
                  <div className="space-y-2">
                    {claimsInGroup.map((cn) => (
                      <ClaimCard key={cn.claim.id} claim={cn.claim} evidenceList={cn.evidenceList} relationCounts={relationCountsByClaim?.[cn.claim.id]} />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

function getContextLabel(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea": return "Supporting Ideas";
    case "counterpoint": return "Counterpoints";
    case "observation": return "Observations";
    case "open_question": return "Open Questions";
  }
}

function getContextColor(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea": return "text-emerald-400";
    case "counterpoint": return "text-violet-400";
    case "observation": return "text-sky-400";
    case "open_question": return "text-amber-400";
  }
}

function getContextIcon(type: ClaimContextType) {
  switch (type) {
    case "supporting_idea": return <Plus className="h-3.5 w-3.5" />;
    case "counterpoint": return <Minus className="h-3.5 w-3.5" />;
    case "observation": return <Sparkles className="h-3.5 w-3.5" />;
    case "open_question": return <HelpCircle className="h-3.5 w-3.5" />;
  }
}

function groupByContextType(claims: ClaimNode[]): Map<ClaimContextType, ClaimNode[]> {
  const grouped = new Map<ClaimContextType, ClaimNode[]>();
  for (const cn of claims) {
    const list = grouped.get(cn.claim.contextType);
    if (list) {
      list.push(cn);
    } else {
      grouped.set(cn.claim.contextType, [cn]);
    }
  }
  return grouped;
}

function LayerConnector() {
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-1 text-muted-foreground/40">
        <div className="h-px w-8 bg-border/40" />
        <ChevronRight className="h-3 w-3" />
        <div className="h-px w-8 bg-border/40" />
      </div>
    </div>
  );
}

export function MapTab({ roomId }: MapTabProps) {
  const { data: questions, isLoading: questionsLoading, error: questionsError } = useQuestions(roomId);
  const { data: claims, isLoading: claimsLoading, error: claimsError } = useClaims(roomId);
  const { data: evidence, isLoading: evidenceLoading, error: evidenceError } = useRoomEvidence(roomId);
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

  const { questionNodes, orphanClaims } = useMemo(() => {
    if (!questions || !claims || !evidence) {
      return { questionNodes: [], orphanClaims: [] };
    }
    return buildGraphData(questions, claims, evidence);
  }, [questions, claims, evidence]);

  if (questionsLoading || claimsLoading || evidenceLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/25 p-5 animate-pulse flex gap-4">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-8 w-full bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (questionsError || claimsError || evidenceError) {
    const errorMessage = (questionsError || claimsError || evidenceError) as Error;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mt-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">Failed to load map data: {errorMessage.message}</p>
      </div>
    );
  }

  const hasData = questionNodes.length > 0 || orphanClaims.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3 mt-4">
        <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No argument data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Claims, questions, and evidence will appear here as the discussion develops.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Argument Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reasoning flow from questions through claims and evidence
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500/60" />
            Question
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500/60" />
            Claim
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500/60" />
            Supports
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500/60" />
            Contradicts
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          Questions
        </div>
        <div className="space-y-3">
          {questionNodes.map((qn) => (
            <QuestionCard key={qn.question.id} question={qn.question} claims={qn.claims} relationCountsByClaim={relationCountsByClaim} />
          ))}
        </div>
      </div>

      {orphanClaims.length > 0 && (
        <>
          {questionNodes.length > 0 && <LayerConnector />}
          <div className="space-y-4">
            {(() => {
              const grouped = groupByContextType(orphanClaims);
              const order: ClaimContextType[] = ["supporting_idea", "counterpoint", "observation", "open_question"];
              return order.map((type) => {
                const claimsInGroup = grouped.get(type);
                if (!claimsInGroup || claimsInGroup.length === 0) return null;
                return (
                  <div key={type} className="space-y-1">
                    <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 ${getContextColor(type)}`}>
                      {getContextIcon(type)}
                      {getContextLabel(type)}
                      <span className="text-[10px] font-normal text-muted-foreground">({claimsInGroup.length})</span>
                    </div>
                    <div className="space-y-2">
                      {claimsInGroup.map((cn) => (
                        <ClaimCard key={cn.claim.id} claim={cn.claim} evidenceList={cn.evidenceList} relationCounts={relationCountsByClaim?.[cn.claim.id]} />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
