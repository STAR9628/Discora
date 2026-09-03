import { Award, FileText, HelpCircle } from "lucide-react";
import type { ExpertiseBreakdown } from "../types";

interface ExpertiseSectionProps {
  expertise: ExpertiseBreakdown[];
}

export function ExpertiseSection({ expertise }: ExpertiseSectionProps) {
  if (expertise.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Expertise Areas</span>
      </div>
      <div className="space-y-2.5">
        {expertise.map((area) => (
          <div key={area.area} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground/80">{area.area}</span>
              <span className="font-mono text-muted-foreground">{area.score} pts</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400/70 rounded-full transition-all"
                style={{ width: `${Math.min((area.score / Math.max(...expertise.map((e) => e.score), 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {area.contributions.claims > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" /> {area.contributions.claims} claim{area.contributions.claims !== 1 ? "s" : ""}
                </span>
              )}
              {area.contributions.evidence > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" /> {area.contributions.evidence} evidence
                </span>
              )}
              {area.contributions.questions > 0 && (
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-2.5 w-2.5" /> {area.contributions.questions} question{area.contributions.questions !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/60 italic">
        Expertise is inferred from claim types and evidence categories.
      </p>
    </div>
  );
}
