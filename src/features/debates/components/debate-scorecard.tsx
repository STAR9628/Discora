"use client";

import { useDebateClaimsBySide } from "@/features/debates/hooks/use-debates";
import { Swords, Shield, ThumbsUp, ThumbsDown, BarChart3 } from "lucide-react";

interface DebateScorecardProps {
  roomId: string;
  debateId: string;
}

export function DebateScorecard({ roomId }: DebateScorecardProps) {
  const { data: propositionClaims } = useDebateClaimsBySide(roomId, "proposition");
  const { data: oppositionClaims } = useDebateClaimsBySide(roomId, "opposition");

  const propAgree = propositionClaims?.reduce((sum, c) => sum + (c.agreeCount || 0), 0) || 0;
  const propDisagree = propositionClaims?.reduce((sum, c) => sum + (c.disagreeCount || 0), 0) || 0;
  const oppAgree = oppositionClaims?.reduce((sum, c) => sum + (c.agreeCount || 0), 0) || 0;
  const oppDisagree = oppositionClaims?.reduce((sum, c) => sum + (c.disagreeCount || 0), 0) || 0;

  const propScore = propAgree - propDisagree;
  const oppScore = oppAgree - oppDisagree;

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-6 shadow-sm backdrop-blur-sm space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Live Scorecard</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-extrabold text-blue-400 uppercase">Proposition</span>
            </div>
            <span className="text-lg font-extrabold text-blue-400">{propScore}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-emerald-400" />
              {propAgree}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-rose-400" />
              {propDisagree}
            </span>
            <span className="font-semibold">{propositionClaims?.length || 0} claims</span>
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-extrabold text-rose-400 uppercase">Opposition</span>
            </div>
            <span className="text-lg font-extrabold text-rose-400">{oppScore}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-emerald-400" />
              {oppAgree}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-rose-400" />
              {oppDisagree}
            </span>
            <span className="font-semibold">{oppositionClaims?.length || 0} claims</span>
          </div>
        </div>
      </div>
    </div>
  );
}
