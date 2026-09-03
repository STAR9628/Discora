"use client";

import { useReputation } from "../hooks/use-reputation";
import { UserCredibilityCard } from "./user-credibility-card";
import { TrustBadgeView } from "./trust-badge-view";
import { BadgeProgressView } from "./badge-progress-view";
import { ReputationBreakdown } from "./reputation-breakdown";
import { ReputationHistoryChart } from "./reputation-history-chart";
import { ExpertiseSection } from "./expertise-section";
import { ContributionTimeline } from "./contribution-timeline";
import { ReputationGrowthCard } from "./reputation-growth-card";
import { Shield, AlertCircle } from "lucide-react";

interface ProfileReputationSectionProps {
  userId: string;
  showReputation?: boolean;
  showExpertise?: boolean;
  showSideSwitches?: boolean;
}

export function ProfileReputationSection({
  userId,
  showReputation = true,
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
          Reputation & Contributions
        </h2>
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">Failed to load reputation data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Reputation & Contributions
        </h2>
        <div className="rounded-xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="mx-auto rounded-full bg-muted/40 p-3.5 w-fit text-muted-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No reputation data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start participating in discussions and debates to build your reputation.
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

  const { reputation, expertise, expertiseBreakdown, badges, badgeProgress, timelineItems, history } = data;

  const timelineFiltered = showSideSwitches
    ? timelineItems
    : timelineItems.filter((item) => item.type !== "side_switch");

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        Reputation & Contributions
      </h2>

      {showReputation && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UserCredibilityCard
              contributions={data.contributions}
              reputation={reputation}
              expertise={expertise}
            />
            <div className="sm:col-span-2 lg:col-span-2">
              <TrustBadgeView badges={badges} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReputationHistoryChart snapshots={history?.snapshots || []} trend={history?.trend || null} />
            <ReputationGrowthCard
              reputation={reputation}
              trend={history?.trend || null}
              badgeProgress={badgeProgress}
            />
          </div>

          <BadgeProgressView badgeProgress={badgeProgress} />

          <ReputationBreakdown reputation={reputation} />
        </>
      )}

      {showExpertise && (
        <ExpertiseSection expertise={expertiseBreakdown} />
      )}

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
