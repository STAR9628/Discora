"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { useSideChangeHistory } from "@/features/debates/hooks/use-debates";
import { formatDate } from "@/lib/date";
import { ArrowRight, History, Swords, Shield } from "lucide-react";

interface PositionHistoryProps {
  roomId: string;
}

export function PositionHistory({ roomId }: PositionHistoryProps) {
  const { user } = useAuth();
  const { data: changes, isLoading } = useSideChangeHistory(roomId, user?.id);

  if (!user) return null;
  if (isLoading) return null;
  if (!changes || changes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-5 shadow-sm backdrop-blur-sm space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
          Position History
        </h3>
      </div>

      <div className="space-y-3">
        {changes.map((change) => (
          <div key={change.id} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/20 p-3.5">
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                {change.previousSide === "proposition" ? <Swords className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {change.previousSide === "proposition" ? "Support" : "Challenge"}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                {change.newSide === "proposition" ? <Swords className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {change.newSide === "proposition" ? "Support" : "Challenge"}
              </span>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {change.reason}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {formatDate(change.createdAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
