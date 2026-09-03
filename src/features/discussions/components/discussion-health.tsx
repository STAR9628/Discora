"use client";

import { useMemo } from "react";
import type { DiscussionClaim, DiscussionQuestion, DiscussionEvidence, DiscussionClaimRelation } from "@/features/discussions/types";
import { computeRelationCounts, findAllConnectedComponents } from "./graph-utils";
import type { GraphEdge } from "./graph-utils";
import { Activity, FileText, HelpCircle, Link2, AlertTriangle, Target, ThumbsUp, ThumbsDown, GitBranch } from "lucide-react";

interface DiscussionHealthProps {
  claims: DiscussionClaim[];
  questions: DiscussionQuestion[];
  evidence: DiscussionEvidence[];
  claimRelations: DiscussionClaimRelation[];
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

export function DiscussionHealth({ claims, questions, evidence, claimRelations }: DiscussionHealthProps) {
  const stats = useMemo(() => {
    const activeClaims = claims.filter((c) => !c.isRetracted);
    const activeQuestions = questions.filter((q) => !q.isRetracted);

    const edgeMap = new Map<string, string>();
    for (const c of activeClaims) edgeMap.set(c.id, c.content);

    const edges: GraphEdge[] = claimRelations
      .filter((r) => edgeMap.has(r.sourceClaimId) && edgeMap.has(r.targetClaimId))
      .map((r) => ({
        sourceId: r.sourceClaimId,
        targetId: r.targetClaimId,
        relationType: r.relationType,
      }));

    const claimIdSet = new Set(activeClaims.map((c) => c.id));
    const counts = computeRelationCounts(claimIdSet, edges);
    const components = findAllConnectedComponents(claimIdSet, edges);

    const supportsCount = claimRelations.filter((r) => r.relationType === "supports").length;
    const contradictsCount = claimRelations.filter((r) => r.relationType === "contradicts").length;
    const refinesCount = claimRelations.filter((r) => r.relationType === "refines").length;

    const claimsWithEvidence = new Set(evidence.map((e) => e.claimId));
    const evidenceCoverage = activeClaims.length > 0
      ? (activeClaims.filter((c) => claimsWithEvidence.has(c.id)).length / activeClaims.length) * 100
      : 0;

    const orphanClaims = activeClaims.filter((c) => !c.questionId);

    let mostSupported: { id: string; count: number } | null = null;
    let mostContradicted: { id: string; count: number } | null = null;
    let mostConnected: { id: string; score: number } | null = null;

    for (const [id, c] of counts) {
      if (!mostSupported || c.incomingSupports > mostSupported.count) {
        mostSupported = { id, count: c.incomingSupports };
      }
      if (!mostContradicted || c.incomingContradicts > mostContradicted.count) {
        mostContradicted = { id, count: c.incomingContradicts };
      }
      const totalConnections = c.outgoingSupports + c.incomingSupports + c.outgoingContradicts + c.incomingContradicts + c.outgoingRefines + c.incomingRefines;
      if (!mostConnected || totalConnections > mostConnected.score) {
        mostConnected = { id, score: totalConnections };
      }
    }

    return {
      claimCount: activeClaims.length,
      questionCount: activeQuestions.length,
      evidenceCount: evidence.length,
      relationCount: claimRelations.length,
      supportsCount,
      contradictsCount,
      refinesCount,
      componentCount: components.length,
      orphanCount: orphanClaims.length,
      evidenceCoverage,
      mostSupported: mostSupported && mostSupported.count > 0 ? mostSupported : null,
      mostContradicted: mostContradicted && mostContradicted.count > 0 ? mostContradicted : null,
      mostConnected: mostConnected && mostConnected.score > 0 ? mostConnected : null,
    };
  }, [claims, questions, evidence, claimRelations]);

  const claimContent = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of claims) map.set(c.id, c.content);
    return map;
  }, [claims]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-400" />
        <h4 className="text-sm font-bold text-foreground">Discussion Health</h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="rounded-lg bg-card/30 border border-border/40 p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{stats.claimCount}</div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <FileText className="h-3 w-3" /> Claims
          </div>
        </div>
        <div className="rounded-lg bg-card/30 border border-border/40 p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{stats.questionCount}</div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <HelpCircle className="h-3 w-3" /> Questions
          </div>
        </div>
        <div className="rounded-lg bg-card/30 border border-border/40 p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{stats.evidenceCount}</div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Link2 className="h-3 w-3" /> Evidence
          </div>
        </div>
        <div className="rounded-lg bg-card/30 border border-border/40 p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{stats.relationCount}</div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <GitBranch className="h-3 w-3" /> Relations
          </div>
        </div>
        <div className="rounded-lg bg-card/30 border border-border/40 p-2.5 text-center">
          <div className="text-lg font-bold text-foreground">{stats.orphanCount}</div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Orphans
          </div>
        </div>
      </div>

      {(stats.supportsCount > 0 || stats.contradictsCount > 0 || stats.refinesCount > 0) && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3 text-green-400" />
            Supports: <span className="font-semibold text-foreground/80">{stats.supportsCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="h-3 w-3 text-rose-400" />
            Contradicts: <span className="font-semibold text-foreground/80">{stats.contradictsCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3 text-violet-400" />
            Refines: <span className="font-semibold text-foreground/80">{stats.refinesCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-blue-400" />
            Clusters: <span className="font-semibold text-foreground/80">{stats.componentCount}</span>
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3 text-amber-400" />
            Evidence Coverage: <span className="font-semibold text-foreground/80">{Math.round(stats.evidenceCoverage)}%</span>
          </span>
        </div>
      )}

      {(stats.mostSupported || stats.mostContradicted || stats.mostConnected) && (
        <div className="space-y-1 pt-1 border-t border-border/30">
          {stats.mostSupported && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-2">
              <ThumbsUp className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
              <span>
                Most Supported: <span className="text-foreground/80 font-medium">{truncate(claimContent.get(stats.mostSupported.id) || "", 80)}</span>
                <span className="text-green-400/80 ml-1">({stats.mostSupported.count})</span>
              </span>
            </div>
          )}
          {stats.mostContradicted && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-2">
              <ThumbsDown className="h-3 w-3 text-rose-400 mt-0.5 shrink-0" />
              <span>
                Most Contradicted: <span className="text-foreground/80 font-medium">{truncate(claimContent.get(stats.mostContradicted.id) || "", 80)}</span>
                <span className="text-rose-400/80 ml-1">({stats.mostContradicted.count})</span>
              </span>
            </div>
          )}
          {stats.mostConnected && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-2">
              <GitBranch className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />
              <span>
                Most Connected: <span className="text-foreground/80 font-medium">{truncate(claimContent.get(stats.mostConnected.id) || "", 80)}</span>
                <span className="text-violet-400/80 ml-1">({stats.mostConnected.score} relations)</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
