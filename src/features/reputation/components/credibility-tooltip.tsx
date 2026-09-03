import { Shield, FileText, ThumbsUp, ThumbsDown, User } from "lucide-react";
import type { ClaimCredibility } from "../types";

interface CredibilityTooltipProps {
  credibility: ClaimCredibility;
}

export function CredibilityTooltip({ credibility }: CredibilityTooltipProps) {
  const colorMap = {
    high: "text-emerald-400",
    medium: "text-amber-400",
    low: "text-red-400",
  };
  const colorClass = colorMap[credibility.level];

  return (
    <div className="w-56 space-y-2 p-1">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Shield className={`h-4 w-4 ${colorClass}`} />
        <span className={`text-xs font-bold ${colorClass}`}>
          {credibility.level === "high" ? "High Credibility" : credibility.level === "medium" ? "Medium Credibility" : "Low Credibility"}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{credibility.score}/100</span>
      </div>
      <div className="space-y-1">
        <FactorRow icon={FileText} label="Evidence Count" value={credibility.factors.evidenceCount} />
        <FactorRow icon={ThumbsUp} label="Evidence Quality" value={credibility.factors.evidenceQuality.toFixed(2)} />
        <FactorRow icon={ThumbsUp} label="Support Ratio" value={`${(credibility.factors.supportRatio * 100).toFixed(0)}%`} />
        <FactorRow icon={ThumbsDown} label="Contradiction Ratio" value={`${(credibility.factors.contradictionRatio * 100).toFixed(0)}%`} />
        <FactorRow icon={User} label="Author Reputation" value={credibility.factors.authorReputation} />
      </div>
    </div>
  );
}

function FactorRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="flex-1">{label}</span>
      <span className="font-mono font-semibold text-foreground/80">{value}</span>
    </div>
  );
}
