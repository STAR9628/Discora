import { Award, FileText, HelpCircle, Target, BookOpen, BarChart3, Zap, Feather, Lock } from "lucide-react";
import type { TrustBadge } from "../types";

const badgeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "evidence-builder": FileText,
  "question-explorer": HelpCircle,
  "consensus-builder": Target,
  "research-contributor": BookOpen,
  "top-analyst": BarChart3,
  "prolific-contributor": Zap,
  "first-claim": Feather,
};

interface TrustBadgeViewProps {
  badges: TrustBadge[];
  showLocked?: boolean;
}

export function TrustBadgeView({ badges, showLocked = true }: TrustBadgeViewProps) {
  const visible = showLocked ? badges : badges.filter((b) => b.earned);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Trust Badges</span>
        </div>
        <p className="text-[11px] text-muted-foreground">No badges earned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Trust Badges</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {badges.filter((b) => b.earned).length}/{badges.length} earned
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((badge) => {
          const Icon = badgeIcons[badge.id] || Award;
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                badge.earned
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border/40 bg-muted/20 opacity-50"
              }`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                badge.earned ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"
              }`}>
                {badge.earned ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium leading-tight ${badge.earned ? "text-foreground/90" : "text-muted-foreground"}`}>
                  {badge.name}
                </p>
                <p className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5">
                  {badge.earned ? badge.description : `${badge.description} (locked)`}
                </p>
                {badge.earned && badge.earnedAt && (
                  <p className="text-[9px] text-emerald-400/60 mt-0.5">
                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
