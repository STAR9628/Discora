"use client";

import type { ReputationScore, BadgeProgress, ReputationTrend } from "../types";
import { ArrowUp, ArrowDown, Minus, Target, Lightbulb, Award } from "lucide-react";

interface ReputationGrowthCardProps {
  reputation: ReputationScore;
  trend: ReputationTrend | null;
  badgeProgress: BadgeProgress[];
}

function getNextBadge(badgeProgress: BadgeProgress[]): BadgeProgress | null {
  const unearned = badgeProgress.filter((b) => !b.earned);
  if (unearned.length === 0) return null;
  return unearned.reduce((best, current) =>
    current.progress > best.progress ? current : best,
  );
}

function getSuggestedAction(badge: BadgeProgress | null, reputation: ReputationScore): string | null {
  if (!badge) return null;

  switch (badge.badgeId) {
    case "first-claim":
      return "Assert your first claim to begin building reputation.";
    case "evidence-builder": {
      const needed = badge.required - badge.current;
      return needed > 0
        ? `Add ${needed} more evidence source${needed > 1 ? "s" : ""} to unlock Evidence Builder.`
        : null;
    }
    case "question-explorer": {
      const needed = badge.required - badge.current;
      return needed > 0
        ? `Ask ${needed} more question${needed > 1 ? "s" : ""} to unlock Question Explorer.`
        : null;
    }
    case "consensus-builder": {
      const needed = Math.max(0, 200 - reputation.overall);
      return needed > 0
        ? `Earn ${needed} more reputation points to unlock Consensus Builder.`
        : null;
    }
    case "research-contributor": {
      const needed = badge.required - badge.current;
      return needed > 0
        ? `Submit ${needed} more evidence source${needed > 1 ? "s" : ""} to unlock Research Contributor.`
        : null;
    }
    case "top-analyst":
      return "Continue creating high-quality claims with evidence to unlock Top Analyst.";
    case "prolific-contributor": {
      const needed = badge.required - badge.current;
      return needed > 0
        ? `Make ${needed} more total contributions to unlock Prolific Contributor.`
        : null;
    }
    default:
      return null;
  }
}

function getBadgeIcon(icon: string) {
  switch (icon) {
    case "Feather": return "🪶";
    case "FileText": return "📄";
    case "HelpCircle": return "❓";
    case "Target": return "🎯";
    case "BookOpen": return "📚";
    case "BarChart3": return "📊";
    case "Zap": return "⚡";
    default: return "🏆";
  }
}

export function ReputationGrowthCard({ reputation, trend, badgeProgress }: ReputationGrowthCardProps) {
  const nextBadge = getNextBadge(badgeProgress);

  const suggestion = getSuggestedAction(nextBadge, reputation);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Reputation Growth */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">Reputation Growth</span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-foreground">{reputation.overall}</span>
          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.direction === "up" ? (
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                  <ArrowUp className="h-4 w-4" />
                  +{trend.change}
                </span>
              ) : trend.direction === "down" ? (
                <span className="flex items-center gap-1 text-sm font-bold text-rose-400">
                  <ArrowDown className="h-4 w-4" />
                  -{trend.change}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
                  <Minus className="h-4 w-4" />
                  0
                </span>
              )}
              {trend.sampleSize > 1 && (
                <span className="text-[10px] text-muted-foreground">
                  from {trend.previous}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How to improve */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">What Improves Reputation</span>
        </div>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
            Create claims (+10 each, +2 per agree vote)
          </li>
          <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
            Submit evidence (+15 each, higher quality = more points)
          </li>
          <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
            Ask questions (+5 each)
          </li>
          <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
            High consensus claims earn bonus points
          </li>
          <li className="flex items-center gap-2 text-[11px] text-rose-400/70">
            <span className="h-1 w-1 rounded-full bg-rose-500 shrink-0" />
            Retracting content and disagree votes reduce score
          </li>
        </ul>
      </div>

      {/* Next Badge & Suggested Action */}
      {nextBadge && (
        <div className="space-y-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Next Badge to Unlock</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <span className="text-xl">{getBadgeIcon(nextBadge.icon)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{nextBadge.badgeName}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {nextBadge.current}/{nextBadge.required}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(nextBadge.progress * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{nextBadge.description}</p>
            </div>
          </div>

          {suggestion && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 p-3">
              <Award className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">Suggested Next Action</span>
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {suggestion}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
