"use client";

import type { Debate } from "@/features/discussions/types";
import { Swords, Shield, Trophy, Users, FileText } from "lucide-react";

interface DebateHeaderProps {
  debate: Debate;
  motionTitle?: string;
}

export function DebateHeader({ debate, motionTitle }: DebateHeaderProps) {
  const totalClaims = debate.propositionClaimCount + debate.oppositionClaimCount;
  const totalParticipants = debate.propositionParticipantCount + debate.oppositionParticipantCount + debate.neutralParticipantCount;
  const title = motionTitle || debate.propositionTitle;

  const isPropositionWinner = debate.status === "resolved" && (debate.resolution as { winner: string })?.winner === "proposition";
  const isOppositionWinner = debate.status === "resolved" && (debate.resolution as { winner: string })?.winner === "opposition";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-6 md:p-8 backdrop-blur-md shadow-xl">
      <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />

      {debate.status === "resolved" && debate.resolution && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">
              Resolved: {(debate.resolution as { winner: string }).winner === "draw"
                ? "Draw"
                : `${(debate.resolution as { winner: string }).winner === "proposition" ? "Proposition" : "Opposition"} wins`}
            </span>
          </div>
          {(debate.resolution as { summary: string }).summary && (
            <p className="mt-2 text-xs text-emerald-400/80">
              {(debate.resolution as { summary: string }).summary}
            </p>
          )}
        </div>
      )}

      {debate.status === "closed" && (
        <div className="mb-6 rounded-xl border border-slate-500/30 bg-slate-500/10 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-400">Debate Closed</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-xl border p-5 space-y-3 transition-all ${
          isPropositionWinner
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-blue-500/30 bg-blue-500/5"
        }`}>
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-extrabold text-blue-400 uppercase tracking-wider">Proposition</h3>
          </div>
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
            &ldquo;{title}&rdquo;
          </p>
          <p className="text-sm font-bold text-foreground">Supports the motion</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {debate.propositionClaimCount} claims
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {debate.propositionParticipantCount} participants
            </span>
          </div>
        </div>

        <div className={`rounded-xl border p-5 space-y-3 transition-all ${
          isOppositionWinner
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-rose-500/30 bg-rose-500/5"
        }`}>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-400" />
            <h3 className="text-base font-extrabold text-rose-400 uppercase tracking-wider">Opposition</h3>
          </div>
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
            &ldquo;{title}&rdquo;
          </p>
          <p className="text-sm font-bold text-foreground">Challenges the motion</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {debate.oppositionClaimCount} claims
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {debate.oppositionParticipantCount} participants
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border/40 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          {totalClaims} total claims
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {totalParticipants} total participants
        </span>
      </div>
    </div>
  );
}
