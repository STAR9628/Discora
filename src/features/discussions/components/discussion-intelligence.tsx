"use client";

import { useMemo, useState, useEffect } from "react";
import type { DiscussionClaim, DiscussionClaimRelation } from "@/features/discussions/types";
import { computeRelationCounts, computeImportance, computeTotalRelations } from "./graph-utils";
import type { GraphEdge } from "./graph-utils";
import { ThumbsUp, ThumbsDown, GitBranch, Zap, Scale, BarChart3, TrendingUp, Flame, Star, ChevronRight, ChevronDown } from "lucide-react";

const COLLAPSED_KEY = "discora:intelligence:collapsed";

interface DiscussionIntelligenceProps {
  claims: DiscussionClaim[];
  claimRelations: DiscussionClaimRelation[];
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

function computeAgreementRatio(claim: DiscussionClaim): number | null {
  const agree = claim.agreeCount ?? 0;
  const disagree = claim.disagreeCount ?? 0;
  const total = agree + disagree;
  if (total === 0) return null;
  return Math.min(Math.max(agree / total, 0), 1);
}

function loadCollapsed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(COLLAPSED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveCollapsed(set: Set<string>) {
  try {
    sessionStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
  } catch {}
}

function CollapsibleSection({ title, icon: Icon, color, children, collapsed, onToggle }: { title: string; icon: typeof BarChart3; color: string; children: React.ReactNode; collapsed: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mb-1 group"
      >
        {collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />}
        <Icon className={`h-3 w-3 ${color}`} />
        <span className={`${color}/80`}>{title}</span>
      </button>
      {!collapsed && children}
    </div>
  );
}

export function DiscussionIntelligence({ claims, claimRelations }: DiscussionIntelligenceProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const intelligence = useMemo(() => {
    const activeClaims = claims.filter((c) => !c.isRetracted);

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

    const supportsCount = edges.filter((e) => e.relationType === "supports").length;
    const contradictsCount = edges.filter((e) => e.relationType === "contradicts").length;
    const refinesCount = edges.filter((e) => e.relationType === "refines").length;

    const ratios = activeClaims
      .map((c) => computeAgreementRatio(c))
      .filter((r): r is number => r !== null);
    const avgConsensus = ratios.length > 0
      ? Math.min(Math.max(ratios.reduce((sum, r) => sum + r, 0) / ratios.length, 0), 1)
      : null;
    let consensusLevel: { label: string; color: string } = { label: "Insufficient data", color: "text-muted-foreground" };
    if (avgConsensus !== null) {
      if (avgConsensus >= 0.7) consensusLevel = { label: "High", color: "text-green-400" };
      else if (avgConsensus >= 0.4) consensusLevel = { label: "Medium", color: "text-amber-400" };
      else consensusLevel = { label: "Low", color: "text-rose-400" };
    }

    let keyTension: { claimA: { id: string; content: string }; claimB: { id: string; content: string }; count: number } | null = null;
    const contradictedMap = new Map<string, { sourceIds: string[]; count: number }>();
    for (const rel of claimRelations) {
      if (rel.relationType !== "contradicts") continue;
      if (!edgeMap.has(rel.targetClaimId)) continue;
      const entry = contradictedMap.get(rel.targetClaimId);
      if (entry) {
        entry.sourceIds.push(rel.sourceClaimId);
        entry.count++;
      } else {
        contradictedMap.set(rel.targetClaimId, { sourceIds: [rel.sourceClaimId], count: 1 });
      }
    }
    let bestTarget: string | null = null;
    let bestCount = 0;
    for (const [id, entry] of contradictedMap) {
      if (entry.count > bestCount) {
        bestCount = entry.count;
        bestTarget = id;
      }
    }
    if (bestTarget && bestCount > 0) {
      const entry = contradictedMap.get(bestTarget)!;
      let bestSource: string | null = null;
      let bestScore = -1;
      for (const sid of entry.sourceIds) {
        const score = importance.get(sid) || 0;
        if (score > bestScore) {
          bestScore = score;
          bestSource = sid;
        }
      }
      if (bestSource) {
        keyTension = {
          claimA: { id: bestSource, content: edgeMap.get(bestSource) || "" },
          claimB: { id: bestTarget, content: edgeMap.get(bestTarget) || "" },
          count: bestCount,
        };
      }
    }

    const emergingConsensus = [...activeClaims]
      .filter((c) => {
        const ratio = computeAgreementRatio(c);
        const totalRel = counts.has(c.id) ? computeTotalRelations(counts.get(c.id)!) : 0;
        return ratio !== null && ratio >= 0.7 && totalRel >= 2;
      })
      .sort((a, b) => (computeAgreementRatio(b) || 0) - (computeAgreementRatio(a) || 0))
      .slice(0, 5);

    const majorDisputes = [...activeClaims]
      .filter((c) => counts.has(c.id) && counts.get(c.id)!.incomingContradicts >= 2)
      .sort((a, b) => (counts.get(b.id)?.incomingContradicts || 0) - (counts.get(a.id)?.incomingContradicts || 0))
      .slice(0, 5);

    const mostInfluential = [...activeClaims]
      .map((c) => {
        const cCounts = counts.get(c.id);
        const totalRel = cCounts ? computeTotalRelations(cCounts) : 0;
        const totalVotes = (c.agreeCount ?? 0) + (c.disagreeCount ?? 0);
        return { claim: c, score: totalRel * 2 + totalVotes + (importance.get(c.id) || 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter((c) => c.score > 0);

    return {
      supportsCount, contradictsCount, refinesCount,
      consensusLevel, avgConsensus, keyTension,
      totalRelationCount: edges.length,
      emergingConsensus, majorDisputes, mostInfluential,
    };
  }, [claims, claimRelations]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-400" />
        <h4 className="text-sm font-bold text-foreground">Discussion Intelligence</h4>
      </div>

      {intelligence.keyTension && (
        <CollapsibleSection title="Key Tension" icon={Zap} color="text-rose-400" collapsed={collapsed.has("key-tension")} onToggle={() => toggle("key-tension")}>
          <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5 space-y-1.5">
            <div className="flex items-start gap-2 text-[11px]">
              <span className="inline-flex items-center justify-center rounded-full bg-rose-500/10 text-rose-400 px-1.5 py-0.5 text-[9px] font-bold mt-0.5 shrink-0">A</span>
              <span className="text-foreground/75 leading-relaxed">{truncate(intelligence.keyTension.claimA.content, 80)}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-rose-400/60 justify-center">
              <span className="h-px flex-1 bg-rose-500/20" />
              <span className="font-semibold">contradicts ({intelligence.keyTension.count})</span>
              <span className="h-px flex-1 bg-rose-500/20" />
            </div>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="inline-flex items-center justify-center rounded-full bg-rose-500/10 text-rose-400 px-1.5 py-0.5 text-[9px] font-bold mt-0.5 shrink-0">B</span>
              <span className="text-foreground/75 leading-relaxed">{truncate(intelligence.keyTension.claimB.content, 80)}</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {(intelligence.supportsCount > 0 || intelligence.contradictsCount > 0 || intelligence.refinesCount > 0) && (
        <CollapsibleSection title="Discussion Balance" icon={Scale} color="text-muted-foreground" collapsed={collapsed.has("balance")} onToggle={() => toggle("balance")}>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2 text-center">
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 mb-0.5">
                <ThumbsUp className="h-3 w-3" /> Supports
              </div>
              <div className="text-base font-bold text-foreground">{intelligence.supportsCount}</div>
            </div>
            <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2 text-center">
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 mb-0.5">
                <ThumbsDown className="h-3 w-3" /> Contradicts
              </div>
              <div className="text-base font-bold text-foreground">{intelligence.contradictsCount}</div>
            </div>
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-2 text-center">
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 mb-0.5">
                <GitBranch className="h-3 w-3" /> Refines
              </div>
              <div className="text-base font-bold text-foreground">{intelligence.refinesCount}</div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Consensus Level" icon={BarChart3} color="text-muted-foreground" collapsed={collapsed.has("consensus")} onToggle={() => toggle("consensus")}>
        <div className={`rounded-lg border p-2.5 text-center ${intelligence.consensusLevel.color === "text-green-400" ? "bg-green-500/5 border-green-500/20" : intelligence.consensusLevel.color === "text-amber-400" ? "bg-amber-500/5 border-amber-500/20" : intelligence.consensusLevel.color === "text-rose-400" ? "bg-rose-500/5 border-rose-500/20" : "bg-card/30 border-border/40"}`}>
          <span className={`text-lg font-bold ${intelligence.consensusLevel.color}`}>
            {intelligence.consensusLevel.label}
          </span>
          {intelligence.avgConsensus !== null && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round(intelligence.avgConsensus * 100)}% average agreement
            </div>
          )}
        </div>
      </CollapsibleSection>

      {intelligence.emergingConsensus.length > 0 && (
        <CollapsibleSection title="Emerging Consensus" icon={TrendingUp} color="text-emerald-400" collapsed={collapsed.has("emerging")} onToggle={() => toggle("emerging")}>
          <div className="space-y-1">
            {intelligence.emergingConsensus.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <span className="text-emerald-400/80 font-bold shrink-0">{Math.round(computeAgreementRatio(c)! * 100)}%</span>
                <span>{truncate(c.content, 80)}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {intelligence.majorDisputes.length > 0 && (
        <CollapsibleSection title="Major Disputes" icon={Flame} color="text-rose-400" collapsed={collapsed.has("disputes")} onToggle={() => toggle("disputes")}>
          <div className="space-y-1">
            {intelligence.majorDisputes.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <Flame className="h-3 w-3 text-rose-400 mt-0.5 shrink-0" />
                <span>{truncate(c.content, 80)}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {intelligence.mostInfluential.length > 0 && (
        <CollapsibleSection title="Most Influential" icon={Star} color="text-amber-400" collapsed={collapsed.has("influential")} onToggle={() => toggle("influential")}>
          <div className="space-y-1">
            {intelligence.mostInfluential.map((c) => (
              <div key={c.claim.id} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <span className="text-amber-400/80 font-bold shrink-0">{c.score}</span>
                <span>{truncate(c.claim.content, 80)}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
