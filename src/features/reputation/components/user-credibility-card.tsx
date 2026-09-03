import type { LucideIcon } from "lucide-react";
import { Shield, Award, FileText, HelpCircle, ThumbsUp } from "lucide-react";
import type { UserContributions, ReputationScore, ExpertiseArea } from "../types";

interface UserCredibilityCardProps {
  contributions?: UserContributions;
  reputation?: ReputationScore;
  expertise?: ExpertiseArea[];
  compact?: boolean;
}

export function UserCredibilityCard({ contributions, reputation, expertise, compact }: UserCredibilityCardProps) {
  const activeClaims = contributions?.claims.filter((c) => !c.isRetracted).length || 0;
  const activeEvidence = contributions?.evidence.filter((e) => !e.isRetracted).length || 0;
  const activeQuestions = contributions?.questions.filter((q) => !q.isRetracted).length || 0;
  const totalAgree = contributions?.claims.filter((c) => !c.isRetracted).reduce((s, c) => s + (c.agreeCount || 0), 0) || 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Credibility</span>
      </div>
      {reputation && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{reputation.overall}</span>
          <span className="text-[10px] text-muted-foreground">reputation score</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <StatItem icon={Award} label="Claims" value={activeClaims} />
        <StatItem icon={FileText} label="Evidence" value={activeEvidence} />
        <StatItem icon={HelpCircle} label="Questions" value={activeQuestions} />
        <StatItem icon={ThumbsUp} label="Agrees" value={totalAgree} />
      </div>
      {expertise && expertise.length > 0 && !compact && (
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expertise</span>
          {expertise.slice(0, 4).map((area) => (
            <div key={area.name} className="flex items-center justify-between text-[11px]">
              <span className="text-foreground/70">{area.name}</span>
              <span className="text-muted-foreground font-mono">{area.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
      <span className="font-semibold text-foreground/80 ml-auto">{value}</span>
    </div>
  );
}
