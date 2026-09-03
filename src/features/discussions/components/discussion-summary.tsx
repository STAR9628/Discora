"use client";

import { useMemo } from "react";
import type { DiscussionClaim, DiscussionQuestion, DiscussionEvidence, DiscussionClaimRelation } from "@/features/discussions/types";
import { computeRelationCounts, computeImportance } from "./graph-utils";
import type { GraphEdge } from "./graph-utils";
import { FileText, HelpCircle, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

interface DiscussionSummaryProps {
  claims: DiscussionClaim[];
  questions: DiscussionQuestion[];
  evidence: DiscussionEvidence[];
  claimRelations: DiscussionClaimRelation[];
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

export function DiscussionSummary({ claims, questions, evidence, claimRelations }: DiscussionSummaryProps) {
  const summary = useMemo(() => {
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
    const importance = new Map<string, number>();
    for (const [id, c] of counts) {
      importance.set(id, computeImportance(c));
    }

    const topClaims = [...activeClaims]
      .map((c) => ({ id: c.id, content: c.content, score: importance.get(c.id) || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter((c) => c.score > 0);

    const supportedClaims = [...counts.entries()]
      .filter(([, c]) => c.incomingSupports > 0)
      .sort(([, a], [, b]) => b.incomingSupports - a.incomingSupports)
      .slice(0, 3)
      .map(([id, c]) => ({ id, count: c.incomingSupports }));

    const contestedClaims = [...counts.entries()]
      .filter(([, c]) => c.incomingContradicts > 0)
      .sort(([, a], [, b]) => b.incomingContradicts - a.incomingContradicts)
      .slice(0, 3)
      .map(([id, c]) => ({ id, count: c.incomingContradicts }));

    const claimIdsByQuestion = new Map<string, string[]>();
    for (const c of activeClaims) {
      if (c.questionId) {
        const list = claimIdsByQuestion.get(c.questionId);
        if (list) list.push(c.id);
        else claimIdsByQuestion.set(c.questionId, [c.id]);
      }
    }

    const answeredQuestionIds = new Set(claimIdsByQuestion.keys());
    const openQuestions = activeQuestions.filter((q) => !answeredQuestionIds.has(q.id)).slice(0, 5);

    const totalRelations = claimRelations.length;
    let status: { label: string; color: string; icon: typeof FileText } = {
      label: "Opening",
      color: "text-blue-400",
      icon: Clock,
    };
    if (totalRelations > 5 || activeClaims.length > 10) {
      status = { label: "Developing", color: "text-amber-400", icon: Activity };
    }
    if (totalRelations > 20 || activeClaims.length > 20) {
      status = { label: "Mature", color: "text-green-400", icon: CheckCircle };
    }

    const mainQuestion = activeQuestions.length > 0
      ? [...activeQuestions].sort((a, b) => {
          const aCount = claimIdsByQuestion.get(a.id)?.length || 0;
          const bCount = claimIdsByQuestion.get(b.id)?.length || 0;
          return bCount - aCount;
        })[0]
      : null;

    return {
      mainQuestion,
      topClaims,
      supportedClaims,
      contestedClaims,
      openQuestions,
      status,
      totalClaims: activeClaims.length,
      totalEvidence: evidence.length,
    };
  }, [claims, questions, evidence, claimRelations]);

  const claimContent = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of claims) map.set(c.id, c.content);
    return map;
  }, [claims]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-400" />
          <h4 className="text-sm font-bold text-foreground">Discussion Summary</h4>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${summary.status.color} border-current/20 bg-current/5`}>
          <summary.status.icon className="h-3 w-3" />
          {summary.status.label}
        </span>
      </div>

      {summary.mainQuestion && (
        <div className="rounded-lg bg-sky-500/5 border border-sky-500/20 p-2.5">
          <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Main Question
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">{summary.mainQuestion.content}</p>
        </div>
      )}

      {summary.topClaims.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Key Claims ({summary.totalClaims})
          </div>
          <div className="space-y-1">
            {summary.topClaims.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-[11px]">
                <span className="inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[9px] font-bold mt-0.5 shrink-0">
                  {c.score}
                </span>
                <span className="text-foreground/75 leading-relaxed">{truncate(c.content, 100)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(summary.supportedClaims.length > 0 || summary.contestedClaims.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {summary.supportedClaims.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-green-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> Most Supported
              </div>
              <div className="space-y-1">
                {summary.supportedClaims.map((c) => (
                  <div key={c.id} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-green-400/80 font-bold shrink-0">{c.count}</span>
                    <span className="text-foreground/70">{truncate(claimContent.get(c.id) || "", 80)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.contestedClaims.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ThumbsDown className="h-3 w-3" /> Most Contested
              </div>
              <div className="space-y-1">
                {summary.contestedClaims.map((c) => (
                  <div key={c.id} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-rose-400/80 font-bold shrink-0">{c.count}</span>
                    <span className="text-foreground/70">{truncate(claimContent.get(c.id) || "", 80)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {summary.openQuestions.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Open Questions ({summary.openQuestions.length})
          </div>
          <div className="space-y-1">
            {summary.openQuestions.map((q) => (
              <div key={q.id} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <AlertCircle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                <span>{q.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
