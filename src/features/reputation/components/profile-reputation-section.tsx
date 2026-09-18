"use client";

import { useReputation } from "../hooks/use-reputation";
import { ContributionTimeline } from "./contribution-timeline";
import { ContributionDistribution } from "./contribution-distribution";
import { Shield, AlertCircle } from "lucide-react";

interface ProfileReputationSectionProps {
  userId: string;
  showExpertise?: boolean;
  showSideSwitches?: boolean;
}

export function ProfileReputationSection({
  userId,
  showExpertise = true,
  showSideSwitches = true,
}: ProfileReputationSectionProps) {
  const { data, isLoading, error } = useReputation(userId);

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-6 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Contributions
        </h2>
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">Failed to load contribution data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Contributions
        </h2>
        <div className="rounded-xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="mx-auto rounded-full bg-muted/40 p-3.5 w-fit text-muted-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No contributions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start participating in discussions and debates to build your contribution history.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Contribution Timeline</span>
          </div>
          <ContributionTimeline items={[]} />
        </div>
      </div>
    );
  }

  const { contributions, expertise, timelineItems } = data;

  const timelineFiltered = showSideSwitches
    ? timelineItems
    : timelineItems.filter((item) => item.type !== "side_switch");

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        Contributions
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContributionDistribution contributions={contributions} />
        {showExpertise && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Participation Areas</span>
            </div>
            <div className="space-y-2">
              {expertise.slice(0, 5).map((area) => (
                <div key={area.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground/70">{area.name}</span>
                  <span className="text-muted-foreground font-mono">{area.score}</span>
                </div>
              ))}
              {expertise.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No participation areas yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">Contribution Timeline</span>
        </div>
        <ContributionTimeline items={timelineFiltered} />
      </div>
    </div>
  );
}
