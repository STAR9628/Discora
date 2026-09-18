"use client";

import type { UserContributions } from "../types";
import { FileText, HelpCircle, Award, Swords, Shield } from "lucide-react";

interface ContributionDistributionProps {
  contributions: UserContributions;
}

export function ContributionDistribution({ contributions }: ContributionDistributionProps) {
  const activeClaims = contributions.claims.filter((c) => !c.isRetracted).length;
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted).length;
  const activeQuestions = contributions.questions.filter((q) => !q.isRetracted).length;
  const totalDebates = contributions.debateCount + contributions.debateParticipations.length;
  const total = activeClaims + activeEvidence + activeQuestions + totalDebates;

  const items = [
    { label: "Claims", value: activeClaims, icon: Award, color: "text-sky-400" },
    { label: "Evidence", value: activeEvidence, icon: FileText, color: "text-slate-400" },
    { label: "Questions", value: activeQuestions, icon: HelpCircle, color: "text-amber-400" },
    { label: "Debates", value: totalDebates, icon: Swords, color: "text-rose-400" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Contribution Distribution</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-foreground/70">
                  <item.icon className={`h-3 w-3 ${item.color}`} />
                  {item.label}
                </span>
                <span className="font-mono text-muted-foreground">{item.value}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/30">
        {total} total contributions
      </p>
    </div>
  );
}
