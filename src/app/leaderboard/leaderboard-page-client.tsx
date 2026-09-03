"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboardData, getLatestReputationSnapshots } from "@/features/reputation/services/reputation-service";
import { LeaderboardView } from "@/features/reputation/components/leaderboard-view";
import { Trophy, Award, FileText, User, Loader2 } from "lucide-react";

type SortMode = "reputation" | "evidence" | "claims" | "activity";

const SORT_OPTIONS: { key: SortMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "reputation", label: "Reputation", icon: Trophy },
  { key: "evidence", label: "Evidence", icon: FileText },
  { key: "claims", label: "Claims", icon: Award },
  { key: "activity", label: "Activity", icon: User },
];

export function LeaderboardPageClient() {
  const [sortBy, setSortBy] = useState<SortMode>("reputation");

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", sortBy],
    queryFn: async () => {
      const raw = await getLeaderboardData(100);

      // Fetch authoritative reputation scores from DB snapshots
      const userIds = raw.map((e) => e.userId);
      const snapshotMap = sortBy === "reputation" ? await getLatestReputationSnapshots(userIds) : new Map();

      const withReputation = raw.map((entry) => {
        let score = 0;
        const topExpertise = "General";

        if (sortBy === "reputation") {
          const snapshot = snapshotMap.get(entry.userId);
          score = snapshot?.score || 0;
        } else if (sortBy === "evidence") {
          score = entry.evidenceCount;
        } else if (sortBy === "claims") {
          score = entry.claimCount;
        } else if (sortBy === "activity") {
          score = entry.claimCount + entry.evidenceCount + entry.questionCount + entry.debateCount;
        }

        return { entry, score, topExpertise };
      });

      withReputation.sort((a, b) => b.score - a.score);

      return withReputation.map((item, idx) => ({
        userId: item.entry.userId,
        username: item.entry.username,
        avatarUrl: item.entry.avatarUrl,
        score: item.score,
        rank: idx + 1,
        claimsCount: item.entry.claimCount,
        evidenceCount: item.entry.evidenceCount,
        questionsCount: item.entry.questionCount,
        topExpertise: item.topExpertise,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-sm text-destructive">
        Failed to load leaderboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {SORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                sortBy === opt.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/30 text-muted-foreground border border-border/50 hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <LeaderboardView title={`Top Contributors by ${SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "Reputation"}`} entries={data || []} maxEntries={50} />

      {data && data.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-amber-400" />
            Top Expertise Areas
          </h3>
          <div className="space-y-1">
            {data.slice(0, 10).map((entry) => (
              <div key={entry.userId} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground w-6 text-right">#{entry.rank}</span>
                  <span className="font-medium text-foreground/80">@{entry.username}</span>
                </div>
                <span className="text-muted-foreground">{entry.topExpertise}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
