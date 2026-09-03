import { Shield, TrendingUp, TrendingDown, Info } from "lucide-react";
import type { ReputationScore } from "../types";

interface ReputationBreakdownProps {
  reputation: ReputationScore;
}

export function ReputationBreakdown({ reputation }: ReputationBreakdownProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Reputation Breakdown</span>
      </div>

      <div className="flex items-baseline gap-2 pb-2 border-b border-border/20">
        <span className="text-2xl font-bold text-foreground">{reputation.overall}</span>
        <span className="text-[10px] text-muted-foreground">total reputation</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Positive Factors</span>
        </div>
        {reputation.factors.filter((f) => f.contribution >= 0).length > 0 ? (
          <div className="space-y-1">
            {reputation.factors.filter((f) => f.contribution >= 0).map((factor) => (
              <div key={factor.name} className="flex items-center justify-between text-[11px] rounded-lg bg-emerald-500/5 px-2.5 py-1.5">
                <span className="text-foreground/70">{factor.name}</span>
                <div className="flex items-center gap-2">
                  {factor.weight > 1 && (
                    <span className="text-[9px] text-muted-foreground/60">×{factor.weight}</span>
                  )}
                  <span className="font-mono font-semibold text-emerald-400">+{factor.value}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic px-2">No positive factors yet.</p>
        )}
        <div className="flex justify-end text-[10px] font-mono text-emerald-400/80">
          Total: +{reputation.positiveScore}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Negative Factors</span>
        </div>
        {reputation.factors.filter((f) => f.contribution < 0).length > 0 ? (
          <div className="space-y-1">
            {reputation.factors.filter((f) => f.contribution < 0).map((factor) => (
              <div key={factor.name} className="flex items-center justify-between text-[11px] rounded-lg bg-red-500/5 px-2.5 py-1.5">
                <span className="text-foreground/70">{factor.name}</span>
                <div className="flex items-center gap-2">
                  {factor.weight > 1 && (
                    <span className="text-[9px] text-muted-foreground/60">×{factor.weight}</span>
                  )}
                  <span className="font-mono font-semibold text-red-400">-{factor.value}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic px-2">No negative factors.</p>
        )}
        <div className="flex justify-end text-[10px] font-mono text-red-400/80">
          Total: -{reputation.negativeScore}
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-border/20">
        <Info className="h-3 w-3 text-muted-foreground" />
        <p className="text-[9px] text-muted-foreground/70 italic">
          Reputation is calculated from your contributions, consensus, and voting activity.
          Create quality claims, support them with evidence, and build consensus to increase your score.
        </p>
      </div>
    </div>
  );
}
