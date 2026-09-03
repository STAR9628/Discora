import { Award, Lock, Check } from "lucide-react";
import type { BadgeProgress } from "../types";

interface BadgeProgressViewProps {
  badgeProgress: BadgeProgress[];
}

export function BadgeProgressView({ badgeProgress }: BadgeProgressViewProps) {
  if (badgeProgress.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Badge Progress</span>
        </div>
        <p className="text-[11px] text-muted-foreground">No badges available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Badge Progress</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badgeProgress.map((badge) => {
          return (
            <div
              key={badge.badgeId}
              className={`rounded-lg border p-2.5 text-xs transition-colors ${
                badge.earned
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  badge.earned ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"
                }`}>
                  {badge.earned ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium leading-tight ${badge.earned ? "text-foreground/90" : "text-muted-foreground"}`}>
                    {badge.badgeName}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">{badge.description}</p>
                </div>
              </div>
              {!badge.earned && (
                <div className="space-y-0.5">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/60 rounded-full transition-all"
                      style={{ width: `${badge.progress * 100}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 text-right">
                    {badge.current}/{badge.required}
                  </p>
                </div>
              )}
              {badge.earned && (
                <p className="text-[9px] text-emerald-400/70 font-semibold">Earned</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
